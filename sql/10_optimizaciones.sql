-- 10_optimizaciones.sql
-- Índices para mejorar el rendimiento de conteos y filtrado por usuario

-- 1. Índice para reportes por usuario (usado en obtener_datos_gamificacion y v_admin_usuarios)
CREATE INDEX IF NOT EXISTS idx_reportes_usuario_id ON reportes(usuario_id);

-- 2. Índice para comentarios por usuario (usado en obtener_datos_gamificacion y v_admin_usuarios)
CREATE INDEX IF NOT EXISTS idx_comentarios_usuario_id ON comentarios(usuario_id);

-- 3. Índice para interacciones por usuario (usado en obtener_datos_gamificacion y v_admin_usuarios)
-- Aunque existe una restricción UNIQUE(usuario_id, reporte_id, tipo) que podría ser usada,
-- añadimos un índice explícito para garantizar el rendimiento óptimo en búsquedas por usuario_id.
CREATE INDEX IF NOT EXISTS idx_interacciones_usuario_id ON interacciones(usuario_id);

-- 4. Índice para seguidores por usuario seguido (usado en obtener_datos_gamificacion y v_admin_usuarios)
-- Nota: El índice único (seguidor_id, siguiendo_id) ya optimiza la búsqueda por seguidor_id,
-- pero no por siguiendo_id.
CREATE INDEX IF NOT EXISTS idx_seguidores_siguiendo_id ON seguidores(siguiendo_id);
