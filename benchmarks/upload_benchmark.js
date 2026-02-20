
const files = Array.from({ length: 5 }, (_, i) => ({ name: `file${i}.jpg` }));
const user = { id: 'user123' };
const reporte = { id: 'report123' };

// Cliente Supabase Mockeado
const mockSupabase = {
    storage: {
        from: (bucket) => ({
            upload: async (path, file) => {
                // Simular latencia de red para subida (ej: 100ms)
                await new Promise(resolve => setTimeout(resolve, 100));
                return { data: {}, error: null };
            },
            getPublicUrl: (path) => ({ data: { publicUrl: 'http://example.com/' + path } })
        })
    },
    from: (table) => ({
        insert: async (data) => {
            // Simular latencia de red para inserción en BD (ej: 50ms)
            await new Promise(resolve => setTimeout(resolve, 50));
            return { data: {}, error: null };
        }
    })
};

async function subidaSecuencial(archivos) {
    const start = Date.now();
    for (const archivo of archivos) {
        const nombre = `${Date.now()}_${Math.floor(Math.random() * 1000)}_${archivo.name}`;
        const ruta = `${user.id}/${nombre}`;

        await mockSupabase.storage.from('evidencias').upload(ruta, archivo);
        const { data: publicUrl } = mockSupabase.storage.from('evidencias').getPublicUrl(ruta);

        await mockSupabase.from('evidencias').insert([{
            reporte_id: reporte.id,
            imagen_url: publicUrl.publicUrl,
            tipo_evidencia: 'reporte'
        }]);
    }
    return Date.now() - start;
}

async function subidaParalela(archivos) {
    const start = Date.now();
    // Usar Promise.all para ejecutar las subidas en paralelo
    await Promise.all(Array.from(archivos).map(async (archivo, index) => {
        // Agregar índice para evitar colisiones de nombres
        const nombre = `${Date.now()}_${index}_${Math.floor(Math.random() * 1000)}_${archivo.name}`;
        const ruta = `${user.id}/${nombre}`;

        await mockSupabase.storage.from('evidencias').upload(ruta, archivo);
        const { data: publicUrl } = mockSupabase.storage.from('evidencias').getPublicUrl(ruta);

        await mockSupabase.from('evidencias').insert([{
            reporte_id: reporte.id,
            imagen_url: publicUrl.publicUrl,
            tipo_evidencia: 'reporte'
        }]);
    }));
    return Date.now() - start;
}

(async () => {
    console.log('Ejecutando Benchmark de Subida Secuencial (5 archivos)...');
    const tiempoSecuencial = await subidaSecuencial(files);
    console.log(`Tiempo Secuencial: ${tiempoSecuencial}ms`);

    console.log('Ejecutando Benchmark de Subida Paralela (5 archivos)...');
    const tiempoParalelo = await subidaParalela(files);
    console.log(`Tiempo Paralelo: ${tiempoParalelo}ms`);

    if (tiempoParalelo > 0) {
        console.log(`Mejora: ${(tiempoSecuencial / tiempoParalelo).toFixed(2)}x más rápido`);
    } else {
        console.log('La ejecución paralela fue instantánea (0ms medidos).');
    }
})();
