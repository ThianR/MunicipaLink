import { supabaseClient } from './supabase.js';
import { Logger } from '../utils/logger.js';

export const ReportsService = {
    /**
     * Obtiene reportes filtrados y ordenados.
     * Soporta paginación.
     * @param {Object} params
     * @param {string} [params.muniId] - ID de la municipalidad
     * @param {string} [params.estado] - Estado del reporte
     * @param {string} [params.search] - Término de búsqueda
     * @param {string} [params.sort] - Criterio de ordenamiento ('recent', 'oldest', 'impact')
     * @param {number} [params.page=0] - Número de página (base 0)
     * @param {number} [params.pageSize=10] - Tamaño de página
     * @param {string} [params.userId] - ID del usuario para filtrar propios
     * @returns {Promise<{data: Array, count: number}>}
     */
    async getReportes({ muniId, estado, search, sort, page = 0, pageSize = 10, userId = null }) {
        let query = supabaseClient.from('reportes_final_v1').select('*', { count: 'exact' });

        if (userId) {
            query = query.eq('usuario_id', userId);
        }

        if (muniId) {
            query = query.eq('municipalidad_id', muniId);
        }

        if (estado && estado !== 'todos') {
            query = query.eq('estado', estado);
        }

        if (search) {
            query = query.or(`numero_solicitud.ilike.%${search}%,descripcion.ilike.%${search}%,autor_nombre.ilike.%${search}%,autor_alias.ilike.%${search}%`);
        }

        // Ordenamiento
        if (sort === 'oldest') {
            query = query.order('creado_en', { ascending: true });
        } else if (sort === 'impact') {
            query = query.order('relevancia_relativa', { ascending: false })
                         .order('score_impacto', { ascending: false });
        } else {
            // Default: recent
            query = query.order('creado_en', { ascending: false });
        }

        // Paginación
        const from = page * pageSize;
        const to = from + pageSize - 1;
        query = query.range(from, to);

        const { data, count, error } = await query;
        if (error) throw error;

        return { data, count };
    },

    /**
     * Obtiene el detalle de un reporte específico.
     */
    async getReporteById(id) {
        const { data, error } = await supabaseClient
            .from('reportes_final_v1')
            .select('*')
            .eq('id', id)
            .single();
        if (error) throw error;
        return data;
    },

    /**
     * Obtiene datos extendidos (tiempos, observaciones internas) que no están en la vista v1.
     */
    async getReporteMetadata(id) {
        const { data, error } = await supabaseClient
            .from('reportes')
            .select('fecha_asignacion, actualizado_en, observacion_municipal')
            .eq('id', id)
            .maybeSingle();
        if (error) throw error;
        return data;
    },

    /**
     * Crea un nuevo reporte.
     */
    async createReporte(payload) {
        const { data, error } = await supabaseClient
            .from('reportes')
            .insert([payload])
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    /**
     * Sube evidencias asociadas a un reporte.
     */
    async uploadEvidencias(reporteId, userId, archivos) {
        const promises = Array.from(archivos).map(async (archivo, index) => {
            const timestamp = Date.now();
            const randomPart = Math.floor(Math.random() * 1000);
            const nombre = `${timestamp}_${index}_${randomPart}_${archivo.name}`;
            const ruta = `${userId}/${nombre}`;

            const { error: uploadError } = await supabaseClient.storage.from('evidencias').upload(ruta, archivo);
            if (uploadError) {
                Logger.error(`Error al subir imagen ${archivo.name}`, uploadError);
                return; // Continuar con otros
            }

            const { data: publicUrl } = supabaseClient.storage.from('evidencias').getPublicUrl(ruta);

            const { error: dbError } = await supabaseClient.from('evidencias').insert([{
                reporte_id: reporteId,
                imagen_url: publicUrl.publicUrl,
                tipo_evidencia: 'reporte'
            }]);

            if (dbError) {
                Logger.error(`Error al registrar evidencia en BD: ${archivo.name}`, dbError);
            }
        });

        await Promise.all(promises);
    },

    async getComentarios(reporteId) {
        const { data, error } = await supabaseClient
            .from('comentarios')
            .select('*')
            .eq('reporte_id', reporteId)
            .order('creado_en', { ascending: true });
        if (error) throw error;
        return data;
    },

    async addComentario(comentario) {
        const { error } = await supabaseClient.from('comentarios').insert(comentario);
        if (error) throw error;
    }
};
