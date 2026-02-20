// --- UI Utilities ---
import { Logger } from './logger.js';

export const DOM = {
    toastContainer: document.getElementById('toast-container'),
    screens: {
        login: document.getElementById('screen-login'),
        app: document.getElementById('screen-app')
    },
    userDisplay: document.getElementById('user-display'),
    body: document.body,
    logo: document.querySelector('.logo')
};

let logsPanel = null;

export function mostrarMensaje(mensaje, tipo = 'info') {
    if (!DOM.toastContainer) return;
    const toast = document.createElement('div');
    toast.className = `toast toast--${tipo}`;

    let icono = 'info';
    if (tipo === 'success') icono = 'check-circle';
    if (tipo === 'error') icono = 'alert-circle';

    toast.innerHTML = `
        <i data-lucide="${icono}" style="width: 20px; height: 20px;"></i>
        <span>${mensaje}</span>
    `;

    DOM.toastContainer.appendChild(toast);
    if (window.lucide) window.lucide.createIcons();

    setTimeout(() => {
        toast.classList.add('toast--fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

export function cambiarPantalla(pantallaId) {
    if (!DOM.screens.login || !DOM.screens.app) return;

    // Reducir impacto de errores silenciados
    try {
        // Remove active from all screens (BEM)
        Object.values(DOM.screens).forEach(s => {
            if (s) {
                s.classList.remove('active'); // Legacy support
                s.classList.remove('screen--active');
            }
        });

        if (pantallaId === 'login') {
            DOM.screens.login.classList.add('screen--active');
        } else if (pantallaId === 'app') {
            DOM.screens.app.classList.add('screen--active');
        }
    } catch (e) {
        console.error('Error al cambiar pantalla:', e);
    }
}

export function aplicarRol(rol) {
    DOM.body.classList.remove('role-admin', 'role-municipal', 'role-citizen', 'role-guest');
    if (rol === 'ciudadano') DOM.body.classList.add('role-citizen');
    else if (rol === 'admin') DOM.body.classList.add('role-admin');
    else if (rol === 'municipal') DOM.body.classList.add('role-municipal');
    else if (rol === 'guest') DOM.body.classList.add('role-guest');
}

export function actualizarVisualizacionUsuario(texto) {
    if (DOM.userDisplay) DOM.userDisplay.textContent = texto;
}

export function toggleLogsPanel() {
    if (logsPanel) {
        logsPanel.remove();
        logsPanel = null;
        return;
    }

    const logs = Logger?.getLogs() || [];

    logsPanel = document.createElement('div');
    logsPanel.id = 'debug-logs-panel';
    logsPanel.innerHTML = `
        <div class="logs-header">
            <h3>Centro de Diagnóstico</h3>
            <div class="logs-actions">
                <button id="btn-copy-logs" title="Copiar logs">Copiar</button>
                <button id="btn-clear-logs" title="Limpiar">Limpiar</button>
                <button id="btn-close-logs" title="Cerrar">&times;</button>
            </div>
        </div>
        <div class="logs-content" id="logs-container">
            ${renderLogsContent(logs)}
        </div>
    `;

    DOM.body.appendChild(logsPanel);

    // Listeners
    document.getElementById('btn-close-logs').onclick = toggleLogsPanel;
    document.getElementById('btn-clear-logs').onclick = () => {
        Logger?.clear();
    };
    document.getElementById('btn-copy-logs').onclick = () => {
        const text = Logger?.exportLogs();
        navigator.clipboard.writeText(text);
        mostrarMensaje('Logs copiados al portapapeles', 'success');
    };

    // Auto-scroll
    const container = document.getElementById('logs-container');
    container.scrollTop = 0;

    // Escuchar nuevos logs mientras está abierto
    const onNewLog = (e) => {
        container.innerHTML = renderLogsContent(Logger.getLogs());
    };
    document.addEventListener('logger:new-entry', onNewLog);
    document.addEventListener('logger:cleared', onNewLog);
}

export function abrirLightbox(url) {
    const modal = document.getElementById('modal-lightbox');
    const img = document.getElementById('lightbox-img');
    const downloadBtn = document.getElementById('btn-download-img');

    if (!modal || !img) return;

    const isImage = url.match(/\.(jpeg|jpg|gif|png|webp)/i);

    if (isImage) {
        img.src = url;
        img.style.display = 'block';
    } else {
        img.src = '';
        img.style.display = 'none';
        // Podríamos mostrar un icono grande de archivo aquí si quisiéramos
    }

    if (downloadBtn) {
        // Nueva lógica de descarga para evitar navegación y permitir renombramiento
        downloadBtn.onclick = async (e) => {
            e.preventDefault();
            const originalText = downloadBtn.innerHTML;
            downloadBtn.innerHTML = 'Preparando...';
            downloadBtn.style.pointerEvents = 'none';

            try {
                const response = await fetch(url);
                const blob = await response.blob();
                const blobUrl = window.URL.createObjectURL(blob);

                const link = document.createElement('a');
                link.href = blobUrl;

                // Generar nombre ofuscado (ej: evidencia-ML-8s2f1.jpg)
                const ext = url.split('.').pop().split('?')[0] || (isImage ? 'jpg' : 'file');
                const randomId = Math.random().toString(36).substring(2, 7);
                link.download = `evidencia-municipallink-${randomId}.${ext}`;

                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(blobUrl);

                Logger.info('Descarga de evidencia completada con éxito');
            } catch (err) {
                Logger.error('Error al descargar archivo:', err);
                mostrarMensaje('No se pudo descargar el archivo', 'error');
            } finally {
                downloadBtn.innerHTML = originalText;
                downloadBtn.style.pointerEvents = 'auto';
            }
        };
    }

    modal.classList.add('lightbox--active');

    const closeBtn = document.getElementById('btn-close-lightbox');
    if (closeBtn) {
        closeBtn.onclick = () => modal.classList.remove('lightbox--active');
    }

    modal.onclick = (e) => {
        if (e.target === modal) modal.classList.remove('lightbox--active');
    };
}

/**
 * Muestra un modal de confirmación personalizado.
 * @param {string} mensaje - El mensaje principal de la confirmación.
 * @param {string} titulo - (Opcional) El título del modal.
 * @returns {Promise<boolean>} - Promesa que se resuelve a true si el usuario confirma, false si cancela.
 */
export function confirmarAccion(mensaje, titulo = '¿Estás seguro?') {
    return new Promise((resolve) => {
        const modal = document.getElementById('modal-confirm');
        const titleEl = document.getElementById('modal-confirm-title');
        const msgEl = document.getElementById('modal-confirm-message');
        const btnOk = document.getElementById('btn-confirm-ok');
        const btnCancel = document.getElementById('btn-confirm-cancel');

        if (!modal || !btnOk || !btnCancel) {
            // Fallback si no existe el modal en el DOM
            const result = window.confirm(`${titulo}\n\n${mensaje}`);
            resolve(result);
            return;
        }

        if (titleEl) titleEl.textContent = titulo;
        if (msgEl) msgEl.textContent = mensaje;

        // Limpiar listeners anteriores clonando los botones
        const newBtnOk = btnOk.cloneNode(true);
        const newBtnCancel = btnCancel.cloneNode(true);
        btnOk.parentNode.replaceChild(newBtnOk, btnOk);
        btnCancel.parentNode.replaceChild(newBtnCancel, btnCancel);

        const cerrar = (valor) => {
            modal.classList.remove('modal--active');
            resolve(valor);
        };

        newBtnOk.onclick = () => cerrar(true);
        newBtnCancel.onclick = () => cerrar(false);

        // Cerrar al hacer click fuera
        modal.onclick = (e) => {
             if (e.target === modal) cerrar(false);
        };

        modal.classList.add('modal--active');
    });
}

/**
 * Utilidad centralizada para renderizar estados de tablas (Cargando, Error, Vacío)
 */
export const TableRenderer = {
    /**
     * Muestra fila de carga
     * @param {string} tbodyId - ID del tbody
     * @param {number} colspan - Número de columnas
     * @param {string} [message] - Mensaje opcional
     */
    showLoading(tbodyId, colspan = 1, message = 'Cargando...') {
        const el = document.getElementById(tbodyId);
        if (!el) return;
        el.innerHTML = `<tr><td colspan="${colspan}" style="text-align: center; padding: 2rem; color: var(--text-muted);"><i data-lucide="loader-2" style="animation: spin 1s linear infinite; margin-right: 0.5rem; vertical-align: middle;"></i>${message}</td></tr>`;
        if (window.lucide) window.lucide.createIcons();
    },

    showError(tbodyId, colspan = 1, message = 'Error al cargar datos.') {
        const el = document.getElementById(tbodyId);
        if (!el) return;
        el.innerHTML = `<tr><td colspan="${colspan}" style="text-align: center; padding: 2rem; color: var(--danger);"><i data-lucide="alert-circle" style="margin-right: 0.5rem; vertical-align: middle;"></i>${message}</td></tr>`;
        if (window.lucide) window.lucide.createIcons();
    },

    showEmpty(tbodyId, colspan = 1, message = 'No hay resultados.') {
        const el = document.getElementById(tbodyId);
        if (!el) return;
        el.innerHTML = `<tr><td colspan="${colspan}" style="text-align: center; padding: 2rem; color: var(--text-muted);">${message}</td></tr>`;
    }
};

function renderLogsContent(logs) {
    if (logs.length === 0) return '<div class="no-logs">No hay logs registrados.</div>';

    return logs.map(l => `
        <div class="log-item log-${l.level.toLowerCase()}">
            <span class="log-time">${new Date(l.timestamp).toLocaleTimeString()}</span>
            <span class="log-level">${l.level}</span>
            <span class="log-msg">${l.message}</span>
            ${l.data ? `<pre class="log-data">${JSON.stringify(l.data, null, 2)}</pre>` : ''}
        </div>
    `).join('');
}
