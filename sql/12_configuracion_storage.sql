-- ==========================================================
-- 12. CONFIGURACIÓN DE STORAGE (ALMACENAMIENTO)
-- ==========================================================

-- 1. CREACIÓN DE BUCKETS
-- Creamos el bucket 'evidencias' como público para permitir ver imágenes de reportes y avatars.
INSERT INTO storage.buckets (id, name, public) 
VALUES ('evidencias', 'evidencias', true)
ON CONFLICT (id) DO NOTHING;

-- 2. POLÍTICAS DE SEGURIDAD (RLS) PARA EL BUCKET 'evidencias'

-- 2.1 Permitir lectura pública de todos los objetos en el bucket 'evidencias'
CREATE POLICY "Acceso Público de Lectura"
ON storage.objects FOR SELECT
USING (bucket_id = 'evidencias');

-- 2.2 Permitir a usuarios autenticados subir archivos a sus propias carpetas
-- La carpeta se identifica por el UID del usuario (auth.uid())
CREATE POLICY "Usuarios Autenticados pueden Subir Archivos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'evidencias' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);

-- 2.3 Permitir a los usuarios actualizar sus propios archivos
CREATE POLICY "Usuarios pueden Actualizar sus Archivos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'evidencias' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);

-- 2.4 Permitir a los usuarios eliminar sus propios archivos
CREATE POLICY "Usuarios pueden Eliminar sus Archivos"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'evidencias' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);

-- 2.5 Permitir a los Administradores gestionar todo (Opcional pero recomendado)
CREATE POLICY "Admins tienen Control Total de Storage"
ON storage.objects FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.perfiles 
        WHERE id = auth.uid() AND rol = 'admin'
    )
);
