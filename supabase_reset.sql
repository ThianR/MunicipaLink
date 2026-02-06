-- SCRIPT DE REINICIO TOTAL DE BASE DE DATOS - MUNICIPALINK
-- ¡ADVERTENCIA! Este script eliminará TODOS los datos, incluyendo CUENTAS DE USUARIO.
-- Las tablas de configuración (municipios, categorias) NO se verán afectadas.

BEGIN;

-- 1. Limpiar tablas de actividad de la aplicación (public schema)
TRUNCATE TABLE 
    seguidores, 
    interacciones, 
    comentarios, 
    evidencias, 
    reportes, 
    perfiles 
RESTART IDENTITY CASCADE;

-- 2. Limpiar cuentas de autenticación (auth schema)
-- IMPORTANTE: Esto borra las cuentas de acceso de Supabase.
DELETE FROM auth.users;

COMMIT;

-- INSTRUCCIONES:
-- 1. Copia todo este código.
-- 2. Ve a tu proyecto en Supabase -> SQL Editor.
-- 3. Haz clic en "New query".
-- 4. Pega el código y dale a "Run".
-- 5. Una vez ejecutado, todos los usuarios deberán registrarse de nuevo.
