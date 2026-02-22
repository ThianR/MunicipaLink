-- 11_gamificacion_municipal.sql
-- Tablas y vistas para el sistema de gamificación entre municipalidades

-- 1. Calificaciones de Municipalidades por Ciudadanos (1-5 estrellas)
CREATE TABLE IF NOT EXISTS muni_calificaciones (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    municipalidad_id UUID REFERENCES municipalidades(id) ON DELETE CASCADE NOT NULL,
    usuario_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    estrellas        INTEGER NOT NULL CHECK (estrellas BETWEEN 1 AND 5),
    creado_en        TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(municipalidad_id, usuario_id) -- Un voto por usuario por municipalidad
);

-- 2. Comentarios Públicos en Perfiles de Municipalidades
CREATE TABLE IF NOT EXISTS muni_comentarios (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    municipalidad_id UUID REFERENCES municipalidades(id) ON DELETE CASCADE NOT NULL,
    usuario_id       UUID REFERENCES perfiles(id) ON DELETE CASCADE NOT NULL,
    contenido        TEXT NOT NULL CHECK (char_length(contenido) >= 10),
    creado_en        TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_muni_calificaciones_muni_id ON muni_calificaciones(municipalidad_id);
CREATE INDEX IF NOT EXISTS idx_muni_comentarios_muni_id    ON muni_comentarios(municipalidad_id);

-- 3. Vista del Ranking de Municipalidades
-- Agrega estadísticas de reportes y calificaciones en una sola consulta
CREATE OR REPLACE VIEW v_ranking_municipalidades AS
SELECT
    m.id,
    m.nombre,
    -- Conteos de reportes
    COUNT(r.id)                                                          AS total_reportes,
    COUNT(r.id) FILTER (WHERE r.estado = 'Pendiente')                    AS reportes_pendientes,
    COUNT(r.id) FILTER (WHERE r.estado = 'En proceso')                   AS reportes_en_proceso,
    COUNT(r.id) FILTER (WHERE r.estado = 'Resuelto')                     AS reportes_resueltos,
    COUNT(r.id) FILTER (WHERE r.estado = 'Rechazado')                    AS reportes_rechazados,
    -- Tasa de resolución (%) - resueltoss sobre total excluyendo rechazados
    CASE
        WHEN COUNT(r.id) FILTER (WHERE r.estado != 'Rechazado') > 0
        THEN ROUND(
            (COUNT(r.id) FILTER (WHERE r.estado = 'Resuelto')::DECIMAL
             / COUNT(r.id) FILTER (WHERE r.estado != 'Rechazado')) * 100, 1
        )
        ELSE 0
    END                                                                  AS tasa_resolucion,
    -- Calificación promedio ciudadana
    ROUND(AVG(mc.estrellas)::DECIMAL, 1)                                 AS calificacion_promedio,
    COUNT(DISTINCT mc.id)                                                AS total_calificaciones
FROM municipalidades m
LEFT JOIN reportes r         ON r.municipalidad_id = m.id
LEFT JOIN muni_calificaciones mc ON mc.municipalidad_id = m.id
GROUP BY m.id, m.nombre
ORDER BY tasa_resolucion DESC, calificacion_promedio DESC NULLS LAST;

-- 4. RLS (Row Level Security)
ALTER TABLE muni_calificaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE muni_comentarios    ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso (usando bloques condicionales para idempotencia)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'muni_calificaciones' AND policyname = 'Lectura publica calificaciones') THEN
    CREATE POLICY "Lectura publica calificaciones"
        ON muni_calificaciones FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'muni_comentarios' AND policyname = 'Lectura publica comentarios muni') THEN
    CREATE POLICY "Lectura publica comentarios muni"
        ON muni_comentarios FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'muni_calificaciones' AND policyname = 'Insertar propia calificacion') THEN
    CREATE POLICY "Insertar propia calificacion"
        ON muni_calificaciones FOR INSERT
        WITH CHECK (auth.uid() = usuario_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'muni_calificaciones' AND policyname = 'Actualizar propia calificacion') THEN
    CREATE POLICY "Actualizar propia calificacion"
        ON muni_calificaciones FOR UPDATE
        USING (auth.uid() = usuario_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'muni_comentarios' AND policyname = 'Insertar propio comentario muni') THEN
    CREATE POLICY "Insertar propio comentario muni"
        ON muni_comentarios FOR INSERT
        WITH CHECK (auth.uid() = usuario_id);
  END IF;
END $$;
