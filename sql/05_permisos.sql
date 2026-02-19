-- 05_permisos.sql
-- Permisos Consolidados

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Secuencias
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- Tablas y Vistas
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;

-- Escritura controlada por RLS
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
GRANT INSERT, UPDATE ON perfiles TO anon; -- Necesario para perfiles iniciales

-- Funciones
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;
