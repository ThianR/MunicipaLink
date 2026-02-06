-- FIX_MIGRATION_REQUEST_ID.sql
-- Ejecutar este script para añadir la columna faltante si la tabla ya existía

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reportes' AND column_name = 'numero_solicitud') THEN
        ALTER TABLE reportes ADD COLUMN numero_solicitud TEXT UNIQUE;
    END IF;
END $$;

-- Asegurar permisos en la secuencia (vital para evitar 'permission denied')
GRANT USAGE, SELECT ON SEQUENCE reportes_global_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE reportes_global_seq TO anon;
GRANT USAGE, SELECT ON SEQUENCE reportes_global_seq TO service_role;

-- ACTUALIZAR VISTA (Fundamental para que el buscador funcione)
-- Primero eliminamos la vista antigua para evitar errores de tipo "cannot change name of view column"
DROP VIEW IF EXISTS reportes_final_v1;

CREATE OR REPLACE VIEW reportes_final_v1 AS
SELECT 
    r.id,
    r.numero_solicitud,
    r.usuario_id,
    r.municipalidad_id,
    r.categoria_id,
    r.descripcion,
    r.ubicacion,
    r.estado,
    r.creado_en,
    r.prioridad_comunitaria + r.prioridad_base + (
      CASE 
        WHEN r.estado = 'Pendiente' THEN 5 
        WHEN r.estado = 'En proceso' THEN 2 
        ELSE 0 
      END
    ) AS score_impacto,
    m.nombre as municipio_nombre,
    c.nombre as categoria_nombre,
    c.icono as categoria_icono,
    p.nombre_completo as autor_nombre,
    p.alias as autor_alias,
    p.avatar_url as autor_avatar,
    (SELECT COUNT(*) FROM interacciones i WHERE i.reporte_id = r.id AND i.tipo = 'voto_positivo') as votos_positivos,
    (SELECT COUNT(*) FROM comentarios com WHERE com.reporte_id = r.id) as total_comentarios
FROM reportes r
JOIN municipalidades m ON r.municipalidad_id = m.id
JOIN categorias c ON r.categoria_id = c.id
LEFT JOIN perfiles p ON r.usuario_id = p.id;

GRANT SELECT ON reportes_final_v1 TO anon, authenticated, service_role;
