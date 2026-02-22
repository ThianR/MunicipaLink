import { APP_CONFIG } from '../config.js';

// Inicializar cliente de Supabase
// Asumimos que la librería global 'supabase' ya está cargada vía CDN en index.html
export const supabaseClient = supabase.createClient(APP_CONFIG.SUPABASE_URL, APP_CONFIG.SUPABASE_KEY);

// Exponer solo vía export para mantener la seguridad y modularidad
export default supabaseClient;
