-- 04_funciones.sql
-- Funciones almacenadas y Triggers

-- 1.A. Generador de Número de Solicitud (REQ-AAAA-XXXX)
DO $$
BEGIN
    -- Crea una secuencia para el año actual si no existe
    EXECUTE format('CREATE SEQUENCE IF NOT EXISTS reportes_seq_%s START 1', to_char(now(), 'YYYY'));
END $$;

CREATE OR REPLACE FUNCTION generar_numero_solicitud()
RETURNS TRIGGER AS $$
DECLARE
    seq_name TEXT;
    next_val INTEGER;
    year_str TEXT;
BEGIN
    year_str := to_char(NEW.creado_en, 'YYYY');
    seq_name := 'reportes_seq_' || year_str;
    
    -- Intenta crear la secuencia si cambiamos de año y no existe (opcional, pero seguro)
    -- Nota: DDL dentro de trigger es delicado, mejor asumir que existe o crear dinamicamente con cuidado.
    -- Para simplificar, usaremos una secuencia única o lógica simple.
    -- Mejor enfoque robusto:
    
    -- Obtener siguiente valor de la secuencia (asumiendo que existe, sino fallará y avisará para crearla)
    -- O usar una tabla de secuencias.
    
    -- Simplificación para este MVP: Usar una secuencia global o construirla al vuelo.
    -- Vamos a usar una secuencia única para todo el sistema para evitar complejidad de "crear secuencia por año" dinámicamente.
    -- O simplemente REQ-[AÑO]-[SERIAL_GLOBAL]
    
    -- REVISIÓN: Mejor usar una secuencia global 'reportes_global_seq' y resetearla manulamente o dejarla correr.
    -- O 'REQ-2025-' || lpad(..., 5, '0')
    
    NEW.numero_solicitud := 'REQ-' || year_str || '-' || lpad(nextval('reportes_global_seq')::text, 5, '0');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear secuencia global si no existe
CREATE SEQUENCE IF NOT EXISTS reportes_global_seq START 1;

DROP TRIGGER IF EXISTS tr_generar_numero_solicitud ON reportes;
CREATE TRIGGER tr_generar_numero_solicitud
BEFORE INSERT ON reportes
FOR EACH ROW EXECUTE FUNCTION generar_numero_solicitud();


-- 1.B. Actualizar prioridad comunitaria al interactuar
CREATE OR REPLACE FUNCTION actualizar_prioridad_por_interaccion()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE reportes SET prioridad_comunitaria = prioridad_comunitaria + 1 
    WHERE id = NEW.reporte_id;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE reportes SET prioridad_comunitaria = prioridad_comunitaria - 1 
    WHERE id = OLD.reporte_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_actualizar_prioridad ON interacciones;
CREATE TRIGGER tr_actualizar_prioridad
AFTER INSERT OR DELETE ON interacciones
FOR EACH ROW EXECUTE FUNCTION actualizar_prioridad_por_interaccion();


-- 2. Encontrar municipalidad más cercana
CREATE OR REPLACE FUNCTION obtener_municipalidad_cercana(lat float, lng float)
RETURNS SETOF municipalidades AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM municipalidades
  ORDER BY centro <-> ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;


-- 3. Crear Perfil Automáticamente al registrar usuario en Auth
CREATE OR REPLACE FUNCTION public.manejar_nuevo_usuario()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.perfiles (id, nombre_completo, avatar_url, rol)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    'ciudadano'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS al_crear_usuario_auth ON auth.users;
CREATE TRIGGER al_crear_usuario_auth
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.manejar_nuevo_usuario();


-- 4. Obtener Estadísticas de Gamificación (incluyendo seguidores)
CREATE OR REPLACE FUNCTION obtener_datos_gamificacion(target_user_id UUID, observer_id UUID DEFAULT NULL)
RETURNS TABLE (
    total_reportes BIGINT,
    total_comentarios BIGINT,
    total_interacciones BIGINT,
    total_xp BIGINT,
    nivel INTEGER,
    rango TEXT,
    insignia TEXT,
    proximo_nivel_xp INTEGER,
    progreso_porcentaje FLOAT,
    seguidores_count BIGINT,
    siguiendo_count BIGINT,
    lo_sigo BOOLEAN
) AS $$
DECLARE
    rep_count BIGINT;
    com_count BIGINT;
    int_count BIGINT;
    xp_total BIGINT;
    lvl INTEGER;
    rng TEXT;
    ins TEXT;
    next_xp INTEGER;
    prog_pct FLOAT;
    f_count BIGINT;
    fing_count BIGINT;
    am_i_following BOOLEAN;
BEGIN
    -- Conteos base
    SELECT COUNT(*) INTO rep_count FROM reportes WHERE usuario_id = target_user_id;
    SELECT COUNT(*) INTO com_count FROM comentarios WHERE usuario_id = target_user_id;
    SELECT COUNT(*) INTO int_count FROM interacciones WHERE usuario_id = target_user_id;
    
    -- Conteos sociales
    SELECT COUNT(*) INTO f_count FROM seguidores WHERE siguiendo_id = target_user_id;
    SELECT COUNT(*) INTO fing_count FROM seguidores WHERE seguidor_id = target_user_id;
    
    -- Verificar si el observador lo sigue
    IF observer_id IS NOT NULL THEN
        SELECT EXISTS(SELECT 1 FROM seguidores WHERE seguidor_id = observer_id AND siguiendo_id = target_user_id) INTO am_i_following;
    ELSE
        am_i_following := false;
    END IF;

    -- Cálculo de XP (Reporte=50, Comentario=10, Interacción=5, Seguidor=20, Bono Perfil=10 por campo)
    DECLARE
        profile_bonus INTEGER := 0;
    BEGIN
        SELECT 
            (CASE WHEN nombre_completo IS NOT NULL AND nombre_completo != '' THEN 20 ELSE 0 END) +
            (CASE WHEN alias IS NOT NULL AND alias != '' THEN 20 ELSE 0 END) +
            (CASE WHEN avatar_url IS NOT NULL AND avatar_url != '' THEN 20 ELSE 0 END) +
            (CASE WHEN contacto IS NOT NULL AND contacto != '' THEN 20 ELSE 0 END) +
            (CASE WHEN direccion IS NOT NULL AND direccion != '' THEN 20 ELSE 0 END) +
            (CASE WHEN genero IS NOT NULL AND genero != '' THEN 20 ELSE 0 END) +
            (CASE WHEN fecha_nacimiento IS NOT NULL THEN 20 ELSE 0 END)
        INTO profile_bonus
        FROM perfiles 
        WHERE id = target_user_id;

        xp_total := (rep_count * 50) + (com_count * 10) + (int_count * 5) + (f_count * 20) + COALESCE(profile_bonus, 0);
    END;

    -- Lógica de Niveles
    IF xp_total < 500 THEN
        lvl := 1; rng := 'Vecino Novato'; ins := '🧊'; next_xp := 500;
    ELSIF xp_total < 1500 THEN
        lvl := 2; rng := 'Observador Activo'; ins := '👁️'; next_xp := 1500;
    ELSIF xp_total < 3000 THEN
        lvl := 3; rng := 'Colaborador Destacado'; ins := '🌟'; next_xp := 3000;
    ELSIF xp_total < 6000 THEN
        lvl := 4; rng := 'Líder Comunitario'; ins := '🛡️'; next_xp := 6000;
    ELSE
        lvl := 5; rng := 'Héroe Municipal'; ins := '🏆'; next_xp := 6000;
    END IF;

    -- Porcentaje de Progreso
    IF lvl = 5 THEN
        prog_pct := 100;
    ELSE
        DECLARE 
            base_xp INTEGER := CASE 
                WHEN lvl = 1 THEN 0 
                WHEN lvl = 2 THEN 500 
                WHEN lvl = 3 THEN 1500 
                WHEN lvl = 4 THEN 3000 
                ELSE 0 END;
        BEGIN
            prog_pct := ((xp_total - base_xp)::FLOAT / (next_xp - base_xp)::FLOAT) * 100;
        END;
    END IF;

    RETURN QUERY SELECT 
        rep_count, com_count, int_count, xp_total, lvl, rng, ins, next_xp, prog_pct, f_count, fing_count, am_i_following;
END;
$$ LANGUAGE plpgsql STABLE;
