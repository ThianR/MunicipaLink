-- 09_gestion_municipal.sql
-- Extensiones para gestión de reportes por usuarios con rol municipal y soporte multi-departamento
-- Idempotente: seguro de ejecutar múltiples veces

-- ============================================================
-- 1. Estructura de Tablas: Extensiones
-- ============================================================

-- Columna municipalidad_id en perfiles
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS municipalidad_id UUID REFERENCES municipalidades;

-- Extensiones en la tabla reportes
ALTER TABLE reportes ADD COLUMN IF NOT EXISTS departamento_id UUID REFERENCES departamentos;
ALTER TABLE reportes ADD COLUMN IF NOT EXISTS prioridad_gestion TEXT DEFAULT 'media'
    CHECK (prioridad_gestion IN ('baja', 'media', 'alta', 'urgente'));
ALTER TABLE reportes ADD COLUMN IF NOT EXISTS fecha_asignacion TIMESTAMPTZ;
ALTER TABLE reportes ADD COLUMN IF NOT EXISTS ultimo_modificado_por UUID REFERENCES auth.users;
ALTER TABLE reportes ADD COLUMN IF NOT EXISTS observacion_municipal TEXT;

-- Columna estado en departamentos
ALTER TABLE departamentos ADD COLUMN IF NOT EXISTS estado TEXT DEFAULT 'activo' 
    CHECK (estado IN ('activo', 'inactivo'));

-- ============================================================
-- 2. Nuevas Tablas
-- ============================================================

-- Tabla de evidencias de cierre (Resolución / Rechazo)
CREATE TABLE IF NOT EXISTS evidencias_cierre (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporte_id    UUID REFERENCES reportes ON DELETE CASCADE NOT NULL,
    imagen_url    TEXT NOT NULL,
    tipo          TEXT NOT NULL CHECK (tipo IN ('resolucion', 'rechazo')),
    subido_por    UUID REFERENCES auth.users,
    creado_en     TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de junction: reporte_departamentos (Multi-departamento)
CREATE TABLE IF NOT EXISTS reporte_departamentos (
    reporte_id      UUID REFERENCES reportes ON DELETE CASCADE NOT NULL,
    departamento_id UUID REFERENCES departamentos ON DELETE CASCADE NOT NULL,
    asignado_en     TIMESTAMPTZ DEFAULT NOW(),
    asignado_por    UUID REFERENCES auth.users,
    PRIMARY KEY (reporte_id, departamento_id)
);

-- Habilitar RLS
ALTER TABLE evidencias_cierre ENABLE ROW LEVEL SECURITY;
ALTER TABLE reporte_departamentos ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 3. Políticas RLS
-- ============================================================

-- Evidencias de cierre visibles por todos
DROP POLICY IF EXISTS "Evidencias cierre visibles por todos" ON evidencias_cierre;
CREATE POLICY "Evidencias cierre visibles por todos" ON evidencias_cierre
    FOR SELECT USING (true);

-- Municipales y admins suben evidencias
DROP POLICY IF EXISTS "Municipales suben evidencias de cierre" ON evidencias_cierre;
CREATE POLICY "Municipales suben evidencias de cierre" ON evidencias_cierre
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM perfiles
            WHERE id = auth.uid()
            AND rol IN ('municipal', 'admin')
        )
    );

-- Reporte departamentos visibles por todos
DROP POLICY IF EXISTS "reporte_departamentos visible por todos" ON reporte_departamentos;
CREATE POLICY "reporte_departamentos visible por todos" ON reporte_departamentos
    FOR SELECT USING (true);

-- Municipales y admins asignan departamentos
DROP POLICY IF EXISTS "municipales asignan departamentos" ON reporte_departamentos;
CREATE POLICY "municipales asignan departamentos" ON reporte_departamentos
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM perfiles
            WHERE id = auth.uid()
            AND rol IN ('municipal', 'admin')
        )
    );

-- Municipales actualizan reportes de su muni
DROP POLICY IF EXISTS "Municipales actualizan reportes de su muni" ON reportes;
CREATE POLICY "Municipales actualizan reportes de su muni" ON reportes
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM perfiles p
            WHERE p.id = auth.uid()
            AND p.rol = 'municipal'
            AND p.municipalidad_id = reportes.municipalidad_id
        )
    );

-- ============================================================
-- 4. Funciones RPC y Triggers
-- ============================================================

-- RPC: obtener municipalidad del usuario autenticado
CREATE OR REPLACE FUNCTION obtener_municipalidad_usuario()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT municipalidad_id
        FROM perfiles
        WHERE id = auth.uid()
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Trigger logic: registrar fecha_asignacion y trazabilidad
CREATE OR REPLACE FUNCTION tr_gestionar_modificacion_reporte()
RETURNS TRIGGER AS $$
BEGIN
    NEW.ultimo_modificado_por := auth.uid();
    NEW.actualizado_en := NOW();

    -- Si se acaba de asignar un departamento (antes era NULL)
    IF NEW.departamento_id IS NOT NULL AND OLD.departamento_id IS NULL THEN
        NEW.fecha_asignacion := NOW();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_gestion_reporte ON reportes;
CREATE TRIGGER tr_gestion_reporte
BEFORE UPDATE ON reportes
FOR EACH ROW EXECUTE FUNCTION tr_gestionar_modificacion_reporte();

-- Trigger logic: actualizar perfil al aprobar rol municipal
CREATE OR REPLACE FUNCTION manejar_aprobacion_rol_municipal()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.estado = 'aprobado' AND OLD.estado <> 'aprobado' THEN
        UPDATE perfiles
        SET rol = 'municipal',
            municipalidad_id = NEW.municipalidad_id
        WHERE id = NEW.usuario_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 5. Permisos
-- ============================================================
GRANT EXECUTE ON FUNCTION obtener_municipalidad_usuario() TO authenticated;
GRANT SELECT, INSERT ON evidencias_cierre TO authenticated;
GRANT SELECT, INSERT ON reporte_departamentos TO authenticated;
GRANT UPDATE ON reportes TO authenticated; -- Controlado por RLS
