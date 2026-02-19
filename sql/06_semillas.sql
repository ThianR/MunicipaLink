-- 06_semillas.sql
-- Datos iniciales obligatorios para el funcionamiento del sistema

-- 1. Categorías Iniciales
INSERT INTO categorias (nombre, descripcion, icono)
VALUES 
    ('Alumbrado Público', 'Reportes relacionados con focos quemados, postes dañados o falta de iluminación.', 'sun'),
    ('Bacheo y Vialidad', 'Problemas de baches, señalización deficiente o hundimientos en calles.', 'road'),
    ('Limpieza y Aseo', 'Acumulación de basura, microbasurales o necesidad de limpieza en áreas públicas.', 'trash-2'),
    ('Seguridad Ciudadana', 'Situaciones de riesgo, pedido de patrullaje o alarmas vecinales.', 'shield-alert'),
    ('Parques y Plazas', 'Mantenimiento de juegos, poda de árboles o cuidado de áreas verdes.', 'trees'),
    ('Agua y Alcantarillado', 'Pérdidas de agua, cloacas obstruidas o tapas de registro faltantes.', 'droplets'),
    ('Edificios y Terrenos', 'Ocupaciones, construcciones irregulares o terrenos baldíos descuidados.', 'home'),
    ('Otros', 'Cualquier otro reporte que no encaje en las categorías anteriores.', 'more-horizontal')
ON CONFLICT (nombre) DO UPDATE SET 
    descripcion = EXCLUDED.descripcion,
    icono = EXCLUDED.icono;

-- 2. Municipalidad Semilla (Ejemplo para testing inicial)
-- INSERT INTO municipalidades (nombre, centro)
-- VALUES ('Municipalidad de Asunción', ST_GeographyFromText('POINT(-57.63591 -25.28219)'))
-- ON CONFLICT (nombre) DO NOTHING;
