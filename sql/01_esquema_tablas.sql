-- 01_esquema_tablas.sql
-- Definición de estructura de tablas

-- 1. Tabla de Perfiles (Extiende auth.users)
CREATE TABLE IF NOT EXISTS perfiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  nombre_completo TEXT,
  alias TEXT UNIQUE,
  puntos INTEGER DEFAULT 0,
  nivel TEXT DEFAULT 'Vecino Novato',
  rol TEXT DEFAULT 'ciudadano' CHECK (rol IN ('ciudadano', 'municipal', 'admin')),
  avatar_url TEXT,
  contacto TEXT,
  direccion TEXT,
  genero TEXT,
  fecha_nacimiento DATE,
  creado_en TIMESTAMPTZ DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabla de Municipalidades
CREATE TABLE IF NOT EXISTS municipalidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,
  limites GEOMETRY(Polygon, 4326), 
  centro GEOGRAPHY(POINT, 4326),
  creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabla de Categorías
CREATE TABLE IF NOT EXISTS categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,
  descripcion TEXT,
  icono TEXT, -- Nombre del icono de Lucide
  creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabla de Reportes
CREATE TABLE IF NOT EXISTS reportes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_solicitud TEXT UNIQUE, -- Formato: REQ-2025-0001
  usuario_id UUID REFERENCES auth.users, -- Nullable para reportes anónimos
  municipalidad_id UUID REFERENCES municipalidades,
  categoria_id UUID REFERENCES categorias,
  descripcion TEXT NOT NULL,
  ubicacion GEOGRAPHY(POINT, 4326) NOT NULL,
  estado TEXT DEFAULT 'Pendiente' CHECK (estado IN ('Pendiente', 'En proceso', 'Resuelto', 'Rechazado')),
  prioridad_base INTEGER DEFAULT 1,
  prioridad_comunitaria INTEGER DEFAULT 1,
  creado_en TIMESTAMPTZ DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabla de Evidencias
CREATE TABLE IF NOT EXISTS evidencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporte_id UUID REFERENCES reportes ON DELETE CASCADE,
  imagen_url TEXT NOT NULL,
  tipo_evidencia TEXT CHECK (tipo_evidencia IN ('reporte', 'solucion')),
  creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Tabla de Interacciones
CREATE TABLE IF NOT EXISTS interacciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES auth.users, -- Nullable para interacciones anónimas
  reporte_id UUID REFERENCES reportes ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('voto_positivo', 'voto_negativo', 'seguir')),
  creado_en TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(usuario_id, reporte_id, tipo)
);

-- 7. Tabla de Comentarios
CREATE TABLE IF NOT EXISTS comentarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporte_id UUID REFERENCES reportes ON DELETE CASCADE NOT NULL,
  usuario_id UUID REFERENCES perfiles(id) NOT NULL,
  contenido TEXT NOT NULL,
  creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Tabla de Seguidores (Sistema Social)
CREATE TABLE IF NOT EXISTS seguidores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seguidor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    siguiendo_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    creado_en TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(seguidor_id, siguiendo_id)
);
