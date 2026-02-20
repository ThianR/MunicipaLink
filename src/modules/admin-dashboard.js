import { supabaseClient } from '../services/supabase.js';
import { Logger } from '../utils/logger.js';

export async function cargarDashboard() {
    try {
        // Obtenemos conteos globales
        // Usamos queries simples para el dashboard
        const [usersCount, reportsCount, munisCount] = await Promise.all([
            supabaseClient.from('perfiles').select('*', { count: 'exact', head: true }),
            supabaseClient.from('reportes').select('*', { count: 'exact', head: true }).neq('estado', 'Resuelto'),
            supabaseClient.from('municipalidades').select('*', { count: 'exact', head: true })
        ]);

        const totalUsersEl = document.getElementById('admin-total-users');
        if (totalUsersEl) totalUsersEl.textContent = usersCount.count || 0;

        const activeReportsEl = document.getElementById('admin-active-reports');
        if (activeReportsEl) activeReportsEl.textContent = reportsCount.count || 0;

        const totalMunisEl = document.getElementById('admin-total-munis');
        if (totalMunisEl) totalMunisEl.textContent = munisCount.count || 0;

        // Actualizar contador en la pestaña de solicitudes
        const { count: pendingCount } = await supabaseClient
            .from('solicitudes_municipales')
            .select('*', { count: 'exact', head: true })
            .eq('estado', 'pendiente');

        const badge = document.querySelector('.admin-tab-btn[data-admin-tab="solicitudes"] .tab-badge');
        if (badge) {
            badge.textContent = pendingCount || 0;
            badge.style.display = pendingCount > 0 ? 'inline-flex' : 'none';
        } else if (pendingCount > 0) {
            const btn = document.querySelector('.admin-tab-btn[data-admin-tab="solicitudes"]');
            // Usamos textContent para evitar inyección en pendingCount aunque sea numérico por seguridad
            if (btn) {
                const badge = document.createElement('span');
                badge.className = 'tab-badge';
                badge.style.cssText = 'background: var(--danger); color: white; border-radius: 50%; width: 18px; height: 18px; font-size: 10px; display: inline-flex; align-items: center; justify-content: center; margin-left: 5px;';
                badge.textContent = pendingCount;
                btn.appendChild(badge);
            }
        }

    } catch (err) {
        Logger.error('Error al cargar dashboard admin:', err);
    }
}
