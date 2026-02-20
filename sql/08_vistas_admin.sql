-- 08_vistas_admin.sql
-- Vista para el panel de administración con datos calculados de gamificación

DROP VIEW IF EXISTS v_admin_usuarios CASCADE;

CREATE OR REPLACE VIEW v_admin_usuarios AS
WITH counts AS (
    SELECT 
        p.id,
        (SELECT COUNT(*) FROM reportes WHERE usuario_id = p.id) as rep_count,
        (SELECT COUNT(*) FROM comentarios WHERE usuario_id = p.id) as com_count,
        (SELECT COUNT(*) FROM interacciones WHERE usuario_id = p.id) as int_count,
        (SELECT COUNT(*) FROM seguidores WHERE siguiendo_id = p.id) as f_count,
        (
            (CASE WHEN p.nombre_completo IS NOT NULL AND p.nombre_completo != '' THEN 20 ELSE 0 END) +
            (CASE WHEN p.alias IS NOT NULL AND p.alias != '' THEN 20 ELSE 0 END) +
            (CASE WHEN p.avatar_url IS NOT NULL AND p.avatar_url != '' THEN 20 ELSE 0 END) +
            (CASE WHEN p.contacto IS NOT NULL AND p.contacto != '' THEN 20 ELSE 0 END) +
            (CASE WHEN p.direccion IS NOT NULL AND p.direccion != '' THEN 20 ELSE 0 END) +
            (CASE WHEN p.genero IS NOT NULL AND p.genero != '' THEN 20 ELSE 0 END) +
            (CASE WHEN p.fecha_nacimiento IS NOT NULL THEN 20 ELSE 0 END)
        ) as bonus
    FROM perfiles p
),
xp_calc AS (
    SELECT 
        id,
        (rep_count * 50) + (com_count * 10) + (int_count * 5) + (f_count * 20) + COALESCE(bonus, 0) as total_xp
    FROM counts
)
SELECT 
    p.id,
    p.nombre_completo,
    p.alias,
    p.email,
    p.rol,
    p.avatar_url,
    p.contacto,
    p.direccion,
    p.genero,
    p.fecha_nacimiento,
    p.activo,
    p.creado_en,
    p.actualizado_en,
    x.total_xp as puntos,
    CASE 
        WHEN x.total_xp < 500 THEN 'Vecino Novato'
        WHEN x.total_xp < 1500 THEN 'Observador Activo'
        WHEN x.total_xp < 3000 THEN 'Colaborador Destacado'
        WHEN x.total_xp < 6000 THEN 'Líder Comunitario'
        ELSE 'Héroe Municipal'
    END as nivel
FROM perfiles p
JOIN xp_calc x ON p.id = x.id;

-- Permisos
GRANT SELECT ON v_admin_usuarios TO authenticated;
GRANT SELECT ON v_admin_usuarios TO service_role;
