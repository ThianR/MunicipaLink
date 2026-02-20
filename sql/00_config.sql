-- 00_config.sql
-- Configuración básica y extensiones

-- Habilitar extensión PostGIS para manejo de geolocalización
CREATE EXTENSION IF NOT EXISTS postgis;

-- Secuencia global para números de solicitud
CREATE SEQUENCE IF NOT EXISTS reportes_global_seq START 1;
