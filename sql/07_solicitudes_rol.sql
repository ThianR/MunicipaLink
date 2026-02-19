-- 07_solicitudes_rol.sql
-- Sistema de solicitudes para obtener el rol de usuario municipal

-- 1. Tabla de Solicitudes
CREATE TABLE IF NOT EXISTS solicitudes_municipales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    municipalidad_id UUID REFERENCES municipalidades(id) ON DELETE CASCADE NOT NULL,
    documento_url TEXT NOT NULL,
    comentarios_ciudadano TEXT,
    comentarios_admin TEXT,
    estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en_revision', 'aprobado', 'rechazado')),
    revisado_por UUID REFERENCES auth.users(id),
    creado_en TIMESTAMPTZ DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(usuario_id, municipalidad_id, estado) -- Evita duplicados pendientes del mismo usuario para la misma muni
);

-- 2. Habilitar RLS
ALTER TABLE solicitudes_municipales ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de Seguridad

-- Lectura: Ciudadanos ven sus propias solicitudes. Admins ven todas.
CREATE POLICY "Usuarios ven sus propias solicitudes" ON solicitudes_municipales
    FOR SELECT USING (auth.uid() = usuario_id OR (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin')));

-- Inserción: Solo ciudadanos autenticados pueden crear solicitudes para sí mismos.
CREATE POLICY "Usuarios pueden crear sus propias solicitudes" ON solicitudes_municipales
    FOR INSERT WITH CHECK (auth.uid() = usuario_id AND auth.role() = 'authenticated');

-- Actualización: Solo admins pueden actualizar el estado y comentarios.
CREATE POLICY "Admins pueden gestionar solicitudes" ON solicitudes_municipales
    FOR UPDATE USING (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin'));

-- 4. Triggers para actualizar 'actualizado_en'
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.actualizado_en = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_timestamp_solicitudes
BEFORE UPDATE ON solicitudes_municipales
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- 5. Trigger para actualizar el rol automáticamente al aprobar
CREATE OR REPLACE FUNCTION manejar_aprobacion_rol_municipal()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.estado = 'aprobado' AND OLD.estado <> 'aprobado' THEN
        UPDATE perfiles 
        SET rol = 'municipal' 
        WHERE id = NEW.usuario_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_aprobacion_rol_municipal
AFTER UPDATE ON solicitudes_municipales
FOR EACH ROW EXECUTE FUNCTION manejar_aprobacion_rol_municipal();

-- 6. Permisos
GRANT SELECT, INSERT ON solicitudes_municipales TO authenticated;
GRANT UPDATE ON solicitudes_municipales TO authenticated; -- Controlado por RLS para ser solo Admin
