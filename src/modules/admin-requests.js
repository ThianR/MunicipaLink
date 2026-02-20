import { supabaseClient } from '../services/supabase.js';
import { AuthModule } from './auth.js';
import { Logger } from '../utils/logger.js';
import { mostrarMensaje, confirmarAccion, TableRenderer } from '../utils/ui.js';
import { escapeHtml } from '../utils/helpers.js';
import { cargarDashboard } from './admin-dashboard.js';

let allSolicitudes = [];

export function setupRequestsListeners() {
    // Buscador de Solicitudes
    const searchSolicitudesInput = document.getElementById('admin-solicitudes-search-input');
    if (searchSolicitudesInput) {
        searchSolicitudesInput.oninput = (e) => filtrarSolicitudes(e.target.value);
    }

    // Cerrar modal
    const closeBtn = document.getElementById('btn-close-role-details');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            document.getElementById('modal-role-request-details').classList.remove('modal--active');
        });
    }
}

export async function cargarSolicitudesRol() {
    const listId = 'admin-solicitudes-list';
    if (!document.getElementById(listId)) return;

    TableRenderer.showLoading(listId, 4, 'Cargando solicitudes...');

    try {
        // Obtenemos solicitudes con datos del perfil
        const { data, error } = await supabaseClient
            .from('solicitudes_municipales')
            .select(`
                *,
                perfiles:usuario_id (alias, nombre_completo),
                municipalidades:municipalidad_id (nombre)
            `)
            .order('creado_en', { ascending: false });

        if (error) throw error;

        // Obtenemos los emails desde la vista admin (tiene acceso a auth.users)
        const userIds = [...new Set((data || []).map(s => s.usuario_id))];
        let emailMap = {};
        if (userIds.length > 0) {
            const { data: userViews } = await supabaseClient
                .from('v_admin_usuarios')
                .select('id, email')
                .in('id', userIds);
            if (userViews) userViews.forEach(u => { emailMap[u.id] = u.email; });
        }

        // Enriquecer datos con emails
        const enrichedData = (data || []).map(s => ({
            ...s,
            perfiles: { ...s.perfiles, email: emailMap[s.usuario_id] || null }
        }));

        allSolicitudes = enrichedData;
        renderSolicitudes(enrichedData);
    } catch (err) {
        Logger.error('Error al cargar solicitudes de rol:', err);
        TableRenderer.showError(listId, 4);
    }
}

export function filtrarSolicitudes(query) {
    const normalizar = (str) => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : "";
    const term = normalizar(query);

    const filtered = allSolicitudes.filter(s =>
        normalizar(s.perfiles?.alias).includes(term) ||
        normalizar(s.perfiles?.nombre_completo).includes(term) ||
        normalizar(s.municipalidades?.nombre).includes(term)
    );
    renderSolicitudes(filtered);
}

function renderSolicitudes(data) {
    const listId = 'admin-solicitudes-list';
    const listEl = document.getElementById(listId);
    if (!listEl) return;

    if (data.length === 0) {
        TableRenderer.showEmpty(listId, 4, 'No hay solicitudes registradas.');
        return;
    }

    const estadoLabel = { aprobado: 'Aprobado', rechazado: 'Rechazado', pendiente: 'Pendiente', en_revision: 'En Revisión' };
    const estadoIcon = { aprobado: 'check-circle', rechazado: 'x-circle', pendiente: 'clock', en_revision: 'search' };

    listEl.innerHTML = data.map(s => {
        const estadoKey = s.estado || 'pendiente';
        const badgeClass = estadoKey === 'aprobado' ? 'status-active' : estadoKey === 'rechazado' ? 'status-danger' : 'status-pending';

        const alias = escapeHtml(s.perfiles?.alias || 'S/A');
        const nombreCompleto = escapeHtml(s.perfiles?.nombre_completo || '');
        const nombreMuni = escapeHtml(s.municipalidades?.nombre || '-');

        return `
            <tr>
                <td>
                    <div style="display:flex; align-items:center; gap:0.5rem;">
                        <div style="width:32px; height:32px; border-radius:50%; background:var(--primary-light,#ecfdf5); display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                            <i data-lucide="user" style="width:16px;height:16px;color:var(--primary);"></i>
                        </div>
                        <div>
                            <strong>${alias}</strong><br>
                            <small class="text-muted">${nombreCompleto}</small>
                        </div>
                    </div>
                </td>
                <td>
                    <div style="display:flex; align-items:center; gap:0.4rem;">
                        <i data-lucide="building-2" style="width:14px;height:14px;color:var(--text-muted);"></i>
                        ${nombreMuni}
                    </div>
                </td>
                <td>
                    <span class="admin-status-badge ${badgeClass}" style="display:inline-flex; align-items:center; gap:0.3rem;">
                        <i data-lucide="${estadoIcon[estadoKey]}" style="width:12px;height:12px;"></i>
                        ${estadoLabel[estadoKey] || estadoKey.toUpperCase()}
                    </span>
                </td>
                <td>
                    <button class="button button--secondary btn-sm btn-view-request-details" data-id="${s.id}" style="display:inline-flex; align-items:center; gap:0.3rem; width:auto;">
                        <i data-lucide="eye" style="width:14px;height:14px;"></i>
                        <span class="desktop-only">Ver Detalles</span>
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    if (window.lucide) window.lucide.createIcons();

    // Asignar listeners
    const container = document.getElementById('admin-solicitudes-list');
    if (container) {
        container.querySelectorAll('.btn-view-request-details').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const requestId = btn.getAttribute('data-id');
                abrirModalDetallesSolicitud(requestId);
            });
        });
    }
}

function abrirModalDetallesSolicitud(id) {
    const solicitud = allSolicitudes.find(s => s.id === id);
    if (!solicitud) return;

    // Poblar modal con diseño premium
    document.getElementById('detail-user-name').textContent = solicitud.perfiles?.nombre_completo || solicitud.perfiles?.alias || 'Usuario Desconocido';
    document.getElementById('detail-user-email').textContent = solicitud.perfiles?.email || '—';
    document.getElementById('detail-muni-name').textContent = solicitud.municipalidades?.nombre || 'Desconocida';

    const commentEl = document.getElementById('detail-user-comment');
    const comentario = solicitud.comentarios_ciudadano;
    commentEl.innerHTML = comentario
        ? `<span>${escapeHtml(comentario)}</span>`
        : '<em style="color:var(--text-muted);">Sin comentarios adicionales.</em>';

    const docLink = document.getElementById('detail-doc-link');
    docLink.href = solicitud.documento_url || '#';

    // Configurar áreas
    const actionArea = document.getElementById('action-area-pending');
    const rejectArea = document.getElementById('rejection-reason-area');
    const rejectInput = document.getElementById('input-rejection-reason');

    rejectArea.classList.add('hidden');
    rejectInput.value = '';

    if (solicitud.estado === 'pendiente' || solicitud.estado === 'en_revision') {
        actionArea.style.display = 'block';

        // Setup botones
        document.getElementById('btn-modal-approve').onclick = async () => {
            const confirmado = await confirmarAccion('¿Estás seguro de aprobar esta solicitud de rol municipal?', 'Aprobar Solicitud');
            if (confirmado) {
                gestionarSolicitudRol(id, 'aprobado');
                document.getElementById('modal-role-request-details').classList.remove('modal--active');
            }
        };

        const btnReject = document.getElementById('btn-modal-reject');
        const btnConfirmReject = document.getElementById('btn-confirm-reject');
        const btnCancelReject = document.getElementById('btn-cancel-reject');

        btnReject.onclick = () => {
            actionArea.style.display = 'none';
            rejectArea.classList.remove('hidden');
        };

        btnCancelReject.onclick = () => {
            rejectArea.classList.add('hidden');
            actionArea.style.display = 'block';
            rejectInput.value = '';
        };

        btnConfirmReject.onclick = () => {
            const motivo = rejectInput.value.trim();
            if (!motivo) {
                mostrarMensaje('Debes ingresar un motivo para rechazar la solicitud.', 'error');
                return;
            }
            gestionarSolicitudRol(id, 'rechazado', motivo);
            document.getElementById('modal-role-request-details').classList.remove('modal--active');
        };

    } else {
        actionArea.style.display = 'none';
    }

    // Mostrar modal
    document.getElementById('modal-role-request-details').classList.add('modal--active');
}

// Función para gestionar la aprobación/rechazo de solicitudes
// Nota: Cuando se llama desde los botones del modal, la confirmación ya se hizo.
// Si se llama directamente (e.g. consola), se salta la confirmación visual pero se ejecuta la acción.
// Se recomienda usar la UI para flujos normales.
export async function gestionarSolicitudRol(id, estado, comentarios = '', skipConfirmation = true) {
    Logger.debug('Ejecutando gestionarSolicitudRol:', { id, estado });

    try {
        const user = AuthModule.getUsuarioActual();
        if (!user) {
            mostrarMensaje('Sesión no válida.', 'error');
            return;
        }

        if (!skipConfirmation) {
             const confirmed = await confirmarAccion(`¿Estás seguro de marcar como ${estado}?`, 'Confirmar Acción');
             if (!confirmed) return;
        }

        // Si el comentario viene vacío y es rechazo, validar (aunque ya se valida en UI)
        if (estado === 'rechazado' && !comentarios) {
             mostrarMensaje('Se requiere un motivo para rechazar.', 'error');
             return;
        }

        Logger.info(`Procesando ${estado} para solicitud ${id}...`);

        const { error } = await supabaseClient
            .from('solicitudes_municipales')
            .update({
                estado,
                comentarios_admin: comentarios,
                revisado_por: user.id
            })
            .eq('id', id);

        if (error) throw error;

        const msg = estado === 'aprobado' ?
            'Solicitud aprobada con éxito.' :
            'Solicitud rechazada.';

        mostrarMensaje(msg, 'success');

        // Recargar datos para reflejar cambios en la UI
        await cargarSolicitudesRol();
        // Llamar a dashboard para actualizar conteos
        cargarDashboard();

    } catch (err) {
        Logger.error('Error en gestionarSolicitudRol:', err);
        mostrarMensaje('Error: ' + err.message, 'error');
    }
}

// Exponer globalmente como respaldo para los onclick del HTML generado
window.gestionarSolicitudRol = gestionarSolicitudRol;
