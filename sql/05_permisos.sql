-- 05_permisos.sql
-- Grant de permisos explícitos para roles de Supabase

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Permisos para secuencias
GRANT USAGE ON SEQUENCE reportes_global_seq TO authenticated, anon;

-- Lectura General
GRANT SELECT ON municipalidades TO anon, authenticated, service_role;
GRANT SELECT ON categorias TO anon, authenticated, service_role;
GRANT SELECT ON perfiles TO anon, authenticated, service_role;
GRANT SELECT ON reportes TO anon, authenticated, service_role;
GRANT SELECT ON evidencias TO anon, authenticated, service_role;
GRANT SELECT ON interacciones TO anon, authenticated, service_role;
GRANT SELECT ON comentarios TO anon, authenticated, service_role;
GRANT SELECT ON seguidores TO anon, authenticated, service_role;
GRANT SELECT ON reportes_final_v1 TO anon, authenticated, service_role;

-- Escritura (Controlado por RLS pero necesitamos el GRANT base)
GRANT INSERT, UPDATE ON perfiles TO authenticated, service_role, anon; -- Anon a veces necesario para logica incial
GRANT INSERT ON reportes TO authenticated, service_role;
GRANT UPDATE, DELETE ON reportes TO authenticated, service_role;
GRANT INSERT, DELETE ON evidencias TO authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON interacciones TO authenticated, service_role;
GRANT INSERT, DELETE ON comentarios TO authenticated, service_role;
GRANT INSERT, DELETE ON seguidores TO authenticated, service_role;

-- Ejecución de Funciones
GRANT EXECUTE ON FUNCTION obtener_datos_gamificacion(UUID, UUID) TO anon, authenticated, service_role;
