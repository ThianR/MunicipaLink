-- 02_vistas.sql
-- Vistas consolidadas

-- 1. Vista de Perfiles Públicos (Security Barrier View)
DROP VIEW IF EXISTS perfiles_publicos CASCADE;

CREATE OR REPLACE VIEW perfiles_publicos AS
SELECT
    id,
    nombre_completo,
    alias,
    puntos,
    nivel,
    rol,
    avatar_url,
    creado_en
FROM perfiles;

ALTER VIEW perfiles_publicos OWNER TO postgres;

-- 2. Vista de Reportes Finales
DROP VIEW IF EXISTS reportes_final_v1 CASCADE;

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
    COALESCE(r.prioridad_comunitaria, 0) + COALESCE(r.prioridad_base, 0) + (
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
    COUNT(DISTINCT CASE WHEN i.tipo = 'voto_positivo' THEN i.id END) as votos_positivos,
    COUNT(DISTINCT com.id) as total_comentarios
FROM reportes r
JOIN municipalidades m ON r.municipalidad_id = m.id
JOIN categorias c ON r.categoria_id = c.id
LEFT JOIN perfiles p ON r.usuario_id = p.id
LEFT JOIN interacciones i ON r.id = i.reporte_id
LEFT JOIN comentarios com ON r.id = com.reporte_id
GROUP BY
    r.id,
    m.id,
    c.id,
    p.id;

ALTER VIEW reportes_final_v1 OWNER TO postgres;
