-- Materialized-style view for easier querying
DROP VIEW IF EXISTS reportes_final_v1 CASCADE;

CREATE OR REPLACE VIEW reportes_final_v1 AS
WITH base_scores AS (
    SELECT 
        r.id,
        r.numero_solicitud,
        r.usuario_id,
        r.municipalidad_id,
        r.categoria_id,
        r.ubicacion,
        r.descripcion,
        r.estado,
        r.creado_en,
        p.nombre_completo as autor_nombre,
        p.alias as autor_alias,
        p.avatar_url as autor_avatar,
        m.nombre as municipio_nombre,
        c.nombre as categoria_nombre,
        COALESCE((SELECT COUNT(*) FROM comentarios com WHERE com.reporte_id = r.id), 0) as total_comentarios,
        COALESCE((SELECT COUNT(*) FROM interacciones i WHERE i.reporte_id = r.id), 0) as total_interacciones
    FROM 
        reportes r
    LEFT JOIN 
        categorias c ON r.categoria_id = c.id
    LEFT JOIN 
        municipalidades m ON r.municipalidad_id = m.id
    LEFT JOIN
        perfiles p ON r.usuario_id = p.id
),
calculated_impact AS (
    SELECT 
        *,
        (total_interacciones + total_comentarios * 2) as score_impacto
    FROM base_scores
)
SELECT 
    *,
    -- Calculamos la relevancia relativa (0 a 1) dentro de su propia municipalidad
    CASE 
        WHEN (SELECT COUNT(*) FROM reportes r2 WHERE r2.municipalidad_id = calculated_impact.municipalidad_id) > 1 
        THEN PERCENT_RANK() OVER (PARTITION BY municipalidad_id ORDER BY score_impacto ASC)
        ELSE 0.5 -- Si es el único, le damos una relevancia media por defecto o base
    END as relevancia_relativa
FROM calculated_impact;

ALTER VIEW reportes_final_v1 OWNER TO postgres;
