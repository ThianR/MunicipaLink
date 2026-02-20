-- benchmarks/00_count_queries_benchmark.sql
-- Benchmark para la Optimización de Consultas de Conteo
-- Ejecuta este script en un cliente PostgreSQL (e.g., psql, pgAdmin) conectado a la base de datos.
-- Se ejecuta dentro de una transacción y se deshacen los cambios al final (ROLLBACK), sin dejar datos residuales.

BEGIN;

DO $$
DECLARE
    target_uid UUID;
    follower_uid UUID;
    muni_id UUID;
    cat_id UUID;
    i INT;
    start_ts TIMESTAMP;
    end_ts TIMESTAMP;
BEGIN
    RAISE NOTICE 'Preparando Entorno de Benchmark...';

    -- Asegurar que existe una municipalidad y categoría
    INSERT INTO municipalidades (nombre, centro) VALUES ('Ciudad Prueba', ST_SetSRID(ST_MakePoint(0,0), 4326))
    ON CONFLICT (nombre) DO UPDATE SET nombre = EXCLUDED.nombre RETURNING id INTO muni_id;

    INSERT INTO categorias (nombre, descripcion, icono) VALUES ('Categoría Prueba', 'Prueba', 'box')
    ON CONFLICT (nombre) DO UPDATE SET nombre = EXCLUDED.nombre RETURNING id INTO cat_id;

    -- Crear un usuario objetivo para las consultas
    INSERT INTO auth.users (id, email, raw_user_meta_data)
    VALUES (gen_random_uuid(), 'target@prueba.com', '{"full_name": "Usuario Objetivo"}')
    RETURNING id INTO target_uid;

    -- Generar 10,000 reportes para este usuario
    INSERT INTO reportes (usuario_id, municipalidad_id, categoria_id, descripcion, ubicacion)
    SELECT target_uid, muni_id, cat_id, 'Reporte ' || g, ST_SetSRID(ST_MakePoint(0,0), 4326)
    FROM generate_series(1, 10000) g;

    -- Generar 10,000 comentarios para este usuario
    INSERT INTO comentarios (reporte_id, usuario_id, contenido)
    SELECT id, target_uid, 'Comentario'
    FROM reportes WHERE usuario_id = target_uid;

    -- Generar 10,000 interacciones (votos) para este usuario
    -- Asumiendo que los reportes existen. Interactuamos con nuestros propios reportes por simplicidad.
    INSERT INTO interacciones (usuario_id, reporte_id, tipo)
    SELECT target_uid, id, 'voto_positivo'
    FROM reportes WHERE usuario_id = target_uid;

    -- Generar 100 seguidores (usuarios que siguen al usuario objetivo)
    FOR i IN 1..100 LOOP
        INSERT INTO auth.users (id, email) VALUES (gen_random_uuid(), 'seguidor_' || i || '@prueba.com')
        RETURNING id INTO follower_uid;

        INSERT INTO seguidores (seguidor_id, siguiendo_id) VALUES (follower_uid, target_uid);
    END LOOP;

    RAISE NOTICE 'Generación de Datos Completa. Ejecutando Benchmark...';

    -- Medir tiempo de consulta ANTES de los índices
    start_ts := clock_timestamp();
    -- Ejecutar 5 veces para promediar
    FOR i IN 1..5 LOOP
        PERFORM * FROM obtener_datos_gamificacion(target_uid);
    END LOOP;
    end_ts := clock_timestamp();

    RAISE NOTICE 'Duración (Sin Índices) para 5 llamadas: %', end_ts - start_ts;

    -- Crear Índices (simulando la migración)
    RAISE NOTICE 'Creando Índices...';
    CREATE INDEX IF NOT EXISTS idx_bench_reportes_uid ON reportes(usuario_id);
    CREATE INDEX IF NOT EXISTS idx_bench_comentarios_uid ON comentarios(usuario_id);
    -- Indexamos explícitamente interacciones(usuario_id) aunque la restricción UNIQUE lo cubra usualmente
    CREATE INDEX IF NOT EXISTS idx_bench_interacciones_uid ON interacciones(usuario_id);
    CREATE INDEX IF NOT EXISTS idx_bench_seguidores_sid ON seguidores(siguiendo_id);

    -- Medir tiempo de consulta DESPUÉS de los índices
    start_ts := clock_timestamp();
    FOR i IN 1..5 LOOP
        PERFORM * FROM obtener_datos_gamificacion(target_uid);
    END LOOP;
    end_ts := clock_timestamp();

    RAISE NOTICE 'Duración (Con Índices) para 5 llamadas: %', end_ts - start_ts;

    RAISE NOTICE 'Benchmark Completado. Deshaciendo cambios...';
END $$;

ROLLBACK;
