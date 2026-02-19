-- 03_seguridad.sql
-- Políticas de Seguridad (RLS) Consolidadas

-- 1. Habilitar RLS
ALTER TABLE municipalidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE reportes ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE interacciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE comentarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE seguidores ENABLE ROW LEVEL SECURITY;
ALTER TABLE departamentos ENABLE ROW LEVEL SECURITY;

-- 2. Limpieza de políticas existentes para evitar duplicados
DO $$ 
DECLARE 
    pol record;
BEGIN 
    FOR pol IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- 3. Definición de Políticas

-- Municipalidades
CREATE POLICY "Municipalidades visibles por todos" ON municipalidades FOR SELECT USING (true);
CREATE POLICY "Admins pueden gestionar municipalidades" ON municipalidades FOR ALL 
  USING (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin'));

-- Categorías
CREATE POLICY "Categorías visibles por todos" ON categorias FOR SELECT USING (true);

-- Perfiles
CREATE POLICY "Perfiles visibles por todos" ON perfiles FOR SELECT USING (true);
CREATE POLICY "Usuarios pueden actualizar su propio perfil" ON perfiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins pueden actualizar cualquier perfil" ON perfiles FOR UPDATE 
  USING (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin'));

-- Reportes
CREATE POLICY "Reportes visibles por todos" ON reportes FOR SELECT USING (true);
CREATE POLICY "Crear reportes" ON reportes FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Admins pueden actualizar reportes" ON reportes FOR UPDATE 
  USING (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin'));

-- Evidencias
CREATE POLICY "Evidencias visibles por todos" ON evidencias FOR SELECT USING (true);
CREATE POLICY "Subir evidencias" ON evidencias FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Borrar evidencias propias" ON evidencias FOR DELETE USING (
  EXISTS (SELECT 1 FROM reportes r WHERE r.id = evidencias.reporte_id AND r.usuario_id = auth.uid())
);

-- Interacciones
CREATE POLICY "Interacciones visibles por todos" ON interacciones FOR SELECT USING (true);
CREATE POLICY "Interactuar" ON interacciones FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Modificar interaccion propia" ON interacciones FOR UPDATE USING (auth.uid() = usuario_id);
CREATE POLICY "Borrar interaccion propia" ON interacciones FOR DELETE USING (auth.uid() = usuario_id);

-- Comentarios
CREATE POLICY "Comentarios visibles por todos" ON comentarios FOR SELECT USING (true);
CREATE POLICY "Comentar" ON comentarios FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Borrar comentario propio" ON comentarios FOR DELETE USING (auth.uid() = usuario_id);

-- Seguidores
CREATE POLICY "Seguidores visibles por todos" ON seguidores FOR SELECT USING (true);
CREATE POLICY "Seguir usuarios" ON seguidores FOR INSERT WITH CHECK (auth.uid() = seguidor_id AND seguidor_id <> siguiendo_id);
CREATE POLICY "Dejar de seguir" ON seguidores FOR DELETE USING (auth.uid() = seguidor_id);

-- Departamentos
CREATE POLICY "Departamentos visibles por todos" ON departamentos FOR SELECT USING (true);
CREATE POLICY "Admins gestionan departamentos" ON departamentos FOR ALL 
  USING (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin'));
