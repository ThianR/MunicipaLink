// --- Configuración Global ---
export const APP_CONFIG = {
    VERSION: '2.0 - Modular Refactor',
    DEFAULT_LOCATION: [-25.2867, -57.6470], // Asunción, Paraguay
    SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    SUPABASE_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY
};

export const REPORT_STATUS = {
    PENDIENTE: { label: 'Pendiente', class: 'pending', color: '#f59e0b' },
    EN_PROCESO: { label: 'En proceso', class: 'en_proceso', color: '#3b82f6' },
    RESUELTO: { label: 'Resuelto', class: 'resuelto', color: '#10b981' },
    RECHAZADO: { label: 'Rechazado', class: 'rechazado', color: '#ef4444' }
};

export const REPORT_PRIORITY = {
    BAJA: { label: 'Baja', color: '#10b981', stars: 1 },
    MEDIA: { label: 'Media', color: '#f59e0b', stars: 3 },
    ALTA: { label: 'Alta', color: '#f97316', stars: 4 },
    URGENTE: { label: 'Urgente', color: '#ef4444', stars: 5 }
};
