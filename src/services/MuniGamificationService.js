import { supabaseClient } from './supabase.js';
import { Logger } from '../utils/logger.js';

/**
 * Servicio de gamificación municipal.
 * Provee datos del ranking, perfiles y calificaciones de municipalidades.
 */
export const MuniGamificationService = {

    /**
     * Obtiene el ranking completo de municipalidades con estadísticas de reportes.
     * @returns {Promise<Array>} Lista ordenada por tasa de resolución
     */
    async getRanking() {
        try {
            const { data, error } = await supabaseClient
                .from('v_ranking_municipalidades')
                .select('*');
            if (error) throw error;
            return data || [];
        } catch (err) {
            Logger.error('Error al obtener ranking de municipalidades', err);
            return [];
        }
    },

    /**
     * Obtiene los comentarios públicos de una municipalidad.
     * @param {string} muniId - UUID de la municipalidad
     * @returns {Promise<Array>}
     */
    async getComentarios(muniId) {
        try {
            const { data, error } = await supabaseClient
                .from('muni_comentarios')
                .select(`
                    id,
                    contenido,
                    creado_en,
                    perfiles ( alias, avatar_url, nivel )
                `)
                .eq('municipalidad_id', muniId)
                .order('creado_en', { ascending: false });
            if (error) throw error;
            return data || [];
        } catch (err) {
            Logger.error('Error al obtener comentarios de municipalidad', err);
            return [];
        }
    },

    /**
     * Obtiene la calificación actual del usuario autenticado para una municipalidad.
     * @param {string} muniId - UUID de la municipalidad
     * @returns {Promise<number|null>} Estrellas (1-5) o null si no calificó
     */
    async getMiCalificacion(muniId) {
        try {
            const { data: { user } } = await supabaseClient.auth.getUser();
            if (!user) return null;
            const { data } = await supabaseClient
                .from('muni_calificaciones')
                .select('estrellas')
                .eq('municipalidad_id', muniId)
                .eq('usuario_id', user.id)
                .maybeSingle();
            return data?.estrellas ?? null;
        } catch (err) {
            Logger.error('Error al obtener calificación propia', err);
            return null;
        }
    },

    /**
     * Guarda o actualiza la calificación del usuario para una municipalidad.
     * @param {string} muniId - UUID de la municipalidad
     * @param {number} estrellas - Valor entre 1 y 5
     * @returns {Promise<boolean>} true si exitoso
     */
    async calificarMuni(muniId, estrellas) {
        try {
            const { data: { user } } = await supabaseClient.auth.getUser();
            if (!user) throw new Error('Usuario no autenticado');
            const { error } = await supabaseClient
                .from('muni_calificaciones')
                .upsert({ municipalidad_id: muniId, usuario_id: user.id, estrellas }, {
                    onConflict: 'municipalidad_id,usuario_id'
                });
            if (error) throw error;
            return true;
        } catch (err) {
            Logger.error('Error al calificar municipalidad', err);
            return false;
        }
    },

    /**
     * Envía un comentario público al perfil de una municipalidad.
     * @param {string} muniId - UUID de la municipalidad
     * @param {string} contenido - Texto del comentario (mín 10 chars)
     * @returns {Promise<boolean>} true si exitoso
     */
    async comentarMuni(muniId, contenido) {
        try {
            const { data: { user } } = await supabaseClient.auth.getUser();
            if (!user) throw new Error('Usuario no autenticado');
            const { error } = await supabaseClient
                .from('muni_comentarios')
                .insert({ municipalidad_id: muniId, usuario_id: user.id, contenido });
            if (error) throw error;
            return true;
        } catch (err) {
            Logger.error('Error al comentar municipalidad', err);
            return false;
        }
    }
};
