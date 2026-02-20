import { supabaseClient } from '../services/supabase.js';
import { Logger } from '../utils/logger.js';
import { mostrarMensaje, confirmarAccion, TableRenderer } from '../utils/ui.js';
import { escapeHtml } from '../utils/helpers.js';

let allUsers = [];
let currentEditingUserId = null;
let currentResetUserId = null;
let currentResetUserEmail = null;

export function setupUsersListeners() {
    // Buscador de Usuarios
    const searchUsersInput = document.getElementById('admin-users-search-input');
    if (searchUsersInput) {
        searchUsersInput.oninput = (e) => filtrarUsuarios(e.target.value);
    }

    // Modal User form submission
    const formEditUser = document.getElementById('form-edit-user');
    if (formEditUser) {
        formEditUser.onsubmit = (e) => {
            e.preventDefault();
            guardarUsuario();
        };
    }

    // Close Modal User
    const btnCloseUser = document.getElementById('btn-close-modal-user');
    if (btnCloseUser) {
        btnCloseUser.onclick = () => document.getElementById('modal-admin-user').classList.remove('modal--active');
    }

    // Reset Password Modal
    const btnCloseReset = document.getElementById('btn-close-modal-reset');
    if (btnCloseReset) {
        btnCloseReset.onclick = () => document.getElementById('modal-reset-password').classList.remove('modal--active');
    }

    const btnCancelReset = document.getElementById('btn-cancel-reset');
    if (btnCancelReset) {
        btnCancelReset.onclick = () => document.getElementById('modal-reset-password').classList.remove('modal--active');
    }

    const btnConfirmReset = document.getElementById('btn-confirm-reset');
    if (btnConfirmReset) {
        btnConfirmReset.onclick = () => enviarResetPassword();
    }
}

export async function cargarUsuarios() {
    const listId = 'admin-users-list';
    if (!document.getElementById(listId)) return;

    TableRenderer.showLoading(listId, 6);

    try {
        const { data, error } = await supabaseClient
            .from('v_admin_usuarios')
            .select('*')
            .order('creado_en', { ascending: false });

        if (error) throw error;
        allUsers = data;

        // Actualizar estadísticas
        const stats = {
            total: data.length,
            admin: data.filter(u => u.rol === 'admin').length,
            municipal: data.filter(u => u.rol === 'municipal').length,
            ciudadano: data.filter(u => u.rol === 'ciudadano').length
        };

        const statTotal = document.getElementById('stat-total-users');
        if (statTotal) statTotal.textContent = stats.total;

        const statAdmin = document.getElementById('stat-admin-users');
        if (statAdmin) statAdmin.textContent = stats.admin;

        const statMuni = document.getElementById('stat-municipal-users');
        if (statMuni) statMuni.textContent = stats.municipal;

        const statCit = document.getElementById('stat-citizen-users');
        if (statCit) statCit.textContent = stats.ciudadano;

        renderUsuarios(data);
    } catch (err) {
        Logger.error('Error al cargar usuarios:', err);
        TableRenderer.showError(listId, 6);
    }
}

export function filtrarUsuarios(query) {
    const normalizar = (str) => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : "";
    const term = normalizar(query);

    const filtered = allUsers.filter(u =>
        normalizar(u.nombre_completo).includes(term) ||
        normalizar(u.alias).includes(term) ||
        normalizar(u.id).includes(term)
    );
    renderUsuarios(filtered);
}

function renderUsuarios(data) {
    const listId = 'admin-users-list';
    const listEl = document.getElementById(listId);
    if (!listEl) return;

    if (data.length === 0) {
        TableRenderer.showEmpty(listId, 6, 'No hay usuarios que coincidan.');
        return;
    }

    listEl.innerHTML = data.map(u => {
        const roleColor = u.rol === 'admin' ? '#dc2626' : u.rol === 'municipal' ? '#f59e0b' : '#3b82f6';
        const fecha = new Date(u.creado_en).toLocaleDateString('es-PY');
        const initial = (u.alias || u.nombre_completo || 'U')[0].toUpperCase();
        const estatusClase = u.activo === false ? 'status-danger' : 'status-active';
        const estatusTexto = u.activo === false ? 'Baneado' : 'Activo';

        const alias = escapeHtml(u.alias || 'Sin alias');
        const nombre = escapeHtml(u.nombre_completo || 'Sin nombre');
        const userId = escapeHtml(u.id.substring(0, 8));
        const userRol = escapeHtml(u.rol);
        const userNivel = escapeHtml(u.nivel || 'Vecino Novato');
        // JSON stringify es seguro para el data-obj si se hace correctamente, pero reemplazamos comillas simples para evitar romper el atributo HTML
        const safeUserObj = JSON.stringify(u).replace(/'/g, "&#39;").replace(/"/g, "&quot;");

        return `
            <tr>
                <td>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <div style="width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 0.8125rem; flex-shrink: 0;">
                            ${escapeHtml(initial)}
                        </div>
                        <div style="min-width: 0;">
                            <strong style="display: block; font-size: 0.875rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${alias}</strong>
                            <small class="text-muted desktop-only" style="font-size: 0.75rem;">${nombre}</small>
                        </div>
                    </div>
                </td>
                <td class="desktop-only"><small style="font-family: monospace; font-size: 0.75rem; color: var(--text-muted);">${userId}...</small></td>
                <td>
                    <span style="display: inline-block; padding: 0.25rem 0.625rem; border-radius: 10px; font-size: 0.6875rem; font-weight: 600; background: ${roleColor}15; color: ${roleColor};">${userRol}</span>
                    <br>
                    <span class="status-badge-premium ${estatusClase}" style="margin-top: 4px; font-size: 10px;">${estatusTexto}</span>
                </td>
                <td>
                    <span class="desktop-only">${userNivel} </span>
                    <small style="color: var(--text-muted);">${u.puntos || 0} XP</small>
                </td>
                <td class="desktop-only" style="font-size: 0.8125rem; color: var(--text-muted);">${fecha}</td>
                <td>
                    <div style="display: flex; gap: 0.5rem;">
                        <button class="button button--secondary btn-sm btn-edit-user" data-id="${u.id}" data-obj='${safeUserObj}' title="Editar" style="width: auto;">
                            <i data-lucide="edit-2" style="width: 14px; height: 14px;"></i>
                        </button>
                        <button class="button btn-sm btn-reset-password" data-id="${u.id}" data-email="${escapeHtml(u.email || '')}" data-alias="${escapeHtml(u.alias || u.nombre_completo || '')}" title="Resetear Contraseña" style="background: #fbbf24; color: white; width: auto;">
                            <i data-lucide="key" style="width: 14px; height: 14px;"></i>
                        </button>
                        <button class="button button--danger btn-sm btn-ban-user" data-id="${u.id}" data-activo="${u.activo !== false}" title="${u.activo === false ? 'Desbanear' : 'Banear'}" style="width: auto;">
                            <i data-lucide="${u.activo === false ? 'user-check' : 'user-x'}" style="width: 14px; height: 14px;"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    // Listeners dinámicos
    document.querySelectorAll('.btn-edit-user').forEach(btn => {
        btn.onclick = () => {
            const user = JSON.parse(btn.dataset.obj.replace(/&#39;/g, "'").replace(/&quot;/g, '"'));
            abrirModalEditarUsuario(user);
        };
    });

    document.querySelectorAll('.btn-reset-password').forEach(btn => {
        btn.onclick = () => {
            abrirModalResetPassword({
                id: btn.dataset.id,
                email: btn.dataset.email,
                alias: btn.dataset.alias
            });
        };
    });

    document.querySelectorAll('.btn-ban-user').forEach(btn => {
        btn.onclick = () => {
            const id = btn.dataset.id;
            const nuevoEstado = btn.dataset.activo === 'false';
            cambiarEstadoUsuario(id, nuevoEstado);
        };
    });

    if (window.lucide) window.lucide.createIcons();
}

function abrirModalEditarUsuario(user) {
    const modal = document.getElementById('modal-admin-user');
    currentEditingUserId = user.id;

    // Sincronizar con los IDs de index.html
    document.getElementById('edit-user-alias').value = user.alias || '';
    document.getElementById('edit-user-fullname').value = user.nombre_completo || '';
    document.getElementById('edit-user-role').value = user.rol || 'ciudadano';
    document.getElementById('edit-user-level').value = user.nivel || 'Vecino Novato';
    document.getElementById('edit-user-status').value = user.activo !== false ? "true" : "false";

    modal.classList.add('modal--active');
    if (window.lucide) window.lucide.createIcons();
}

export async function guardarUsuario() {
    const alias = document.getElementById('edit-user-alias').value;
    const nombre = document.getElementById('edit-user-fullname').value;
    const rol = document.getElementById('edit-user-role').value;
    const nivel = document.getElementById('edit-user-level').value;
    const activo = document.getElementById('edit-user-status').value === "true";

    const payload = {
        alias: alias,
        nombre_completo: nombre,
        rol: rol,
        nivel: nivel,
        activo: activo,
        actualizado_en: new Date()
    };

    try {
        const { error } = await supabaseClient
            .from('perfiles')
            .update(payload)
            .eq('id', currentEditingUserId);

        if (error) throw error;

        mostrarMensaje('Usuario actualizado correctamente', 'success');
        document.getElementById('modal-admin-user').classList.remove('modal--active');
        cargarUsuarios();
    } catch (err) {
        Logger.error('Error al guardar usuario:', err);
        mostrarMensaje('Error al guardar: ' + err.message, 'error');
    }
}

async function cambiarEstadoUsuario(id, activo) {
    const confirmacion = activo ? '¿Deseas reactivar a este usuario?' : '¿Estás seguro de que deseas banear a este usuario?';
    if (!await confirmarAccion(confirmacion)) return;

    try {
        const { error } = await supabaseClient
            .from('perfiles')
            .update({ activo })
            .eq('id', id);

        if (error) throw error;

        mostrarMensaje(activo ? 'Usuario reactivado' : 'Usuario baneado correctamente', 'success');
        cargarUsuarios();
    } catch (err) {
        Logger.error('Error al cambiar estado de usuario:', err);
        mostrarMensaje('Error al cambiar estado.', 'error');
    }
}

function abrirModalResetPassword(user) {
    currentResetUserId = user.id;
    currentResetUserEmail = user.email;

    const displayEmail = document.getElementById('reset-user-email-display');
    if (displayEmail) displayEmail.textContent = user.email || '(Email no disponible)';

    document.getElementById('modal-reset-password').classList.add('modal--active');
}

export async function enviarResetPassword() {
    if (!currentResetUserEmail || currentResetUserEmail === 'null' || currentResetUserEmail === 'undefined' || currentResetUserEmail.trim() === '') {
        mostrarMensaje('El usuario no tiene un email registrado. Debes editar su perfil y asignar uno primero.', 'error');
        return;
    }

    try {
        const { error } = await supabaseClient.auth.resetPasswordForEmail(currentResetUserEmail, {
            redirectTo: window.location.origin
        });

        mostrarMensaje('Email de recuperación enviado correctamente', 'success');
        document.getElementById('modal-reset-password').classList.remove('modal--active');
    } catch (err) {
        Logger.error('Error al enviar reset:', err);
        mostrarMensaje('Error: ' + err.message, 'error');
    }
}
