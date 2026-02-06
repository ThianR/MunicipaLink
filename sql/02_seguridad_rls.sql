-- 02_seguridad_rls.sql
-- Políticas de Seguridad a Nivel de Fila (RLS)

-- 1. Habilitar RLS en todas las tablas
ALTER TABLE municipalidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE reportes ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE interacciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE comentarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE seguidores ENABLE ROW LEVEL SECURITY;

-- 2. Políticas de LECTURA (Select) - Generalmente públicas
CREATE POLICY "Municipalidades visibles por todos" ON municipalidades FOR SELECT USING (true);
CREATE POLICY "Categorías visibles por todos" ON categorias FOR SELECT USING (true);
CREATE POLICY "Perfiles visibles por todos" ON perfiles FOR SELECT USING (true);
CREATE POLICY "Reportes visibles por todos" ON reportes FOR SELECT USING (true);
CREATE POLICY "Evidencias visibles por todos" ON evidencias FOR SELECT USING (true);
CREATE POLICY "Interacciones visibles por todos" ON interacciones FOR SELECT USING (true);
CREATE POLICY "Comentarios visibles por todos" ON comentarios FOR SELECT USING (true);
CREATE POLICY "Seguidores visibles por todos" ON seguidores FOR SELECT USING (true);

-- 3. Políticas de ESCRITURA (Insert/Update/Delete)

-- Perfiles: Solo el usuario puede editar su propio perfil
CREATE POLICY "Usuarios pueden actualizar su propio perfil" ON perfiles FOR UPDATE USING (auth.uid() = id);

-- Reportes: Solo usuarios autenticados pueden crear (o anónimos si se permite, aquí restringimos a auth)
CREATE POLICY "Crear reportes" ON reportes FOR INSERT WITH CHECK (auth.role() = 'authenticated');
-- Reportes: Modificar? (A definir, por ahora solo admins o sistema)

-- Evidencias: Subir (Autenticados), Borrar (Dueños del reporte asociado)
CREATE POLICY "Subir evidencias" ON evidencias FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Borrar evidencias propias" ON evidencias FOR DELETE USING (
  EXISTS (SELECT 1 FROM reportes r WHERE r.id = evidencias.reporte_id AND r.usuario_id = auth.uid())
);

-- Interacciones
CREATE POLICY "Interactuar" ON interacciones FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Modificar interaccion propia" ON interacciones FOR UPDATE USING (auth.uid() = usuario_id);
CREATE POLICY "Borrar interaccion propia" ON interacciones FOR DELETE USING (auth.uid() = usuario_id);

-- Comentarios
CREATE POLICY "Comentar" ON comentarios FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Borrar comentario propio" ON comentarios FOR DELETE USING (auth.uid() = usuario_id);

-- Seguidores
CREATE POLICY "Seguir usuarios" ON seguidores FOR INSERT WITH CHECK (auth.uid() = seguidor_id AND seguidor_id <> siguiendo_id);
CREATE POLICY "Dejar de seguir" ON seguidores FOR DELETE USING (auth.uid() = seguidor_id);
