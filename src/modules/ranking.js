import { MuniGamificationService } from '../services/MuniGamificationService.js';
import { Logger } from '../utils/logger.js';
import { mostrarMensaje } from '../utils/ui.js';
import { escapeHtml } from '../utils/helpers.js';

// Estado local del módulo
let rankingData = [];
let selectedMuniId = null;
let selectedMuniNombre = '';
let miCalificacionActual = null;
let calificacionPendiente = null;

/**
 * Inicializa los listeners del módulo de ranking.
 */
export function setupRankingListeners() {
    // Escuchar cambio de vista
    document.addEventListener('ui:view-changed', async (e) => {
        if (e.detail?.view === 'ranking') {
            await renderRanking();
        }
    });

    // Delegación de eventos: clic en tarjeta del ranking → abrir perfil
    document.getElementById('ranking-list')?.addEventListener('click', (e) => {
        const card = e.target.closest('.ranking-card');
        if (!card) return;
        const muniId = card.dataset.muniId;
        const muniNombre = card.dataset.muniNombre;
        if (muniId) abrirPerfilMuni(muniId, muniNombre);
    });

    // Botón cerrar modal perfil
    document.getElementById('btn-close-muni-profile')?.addEventListener('click', () => {
        document.getElementById('modal-muni-profile').classList.remove('modal--active');
    });

    // Enviar comentario
    document.getElementById('btn-submit-muni-comment')?.addEventListener('click', async () => {
        const textarea = document.getElementById('muni-comment-text');
        const contenido = textarea?.value?.trim();
        if (!contenido || contenido.length < 10) {
            mostrarMensaje('El comentario debe tener al menos 10 caracteres.', 'warning');
            return;
        }
        const ok = await MuniGamificationService.comentarMuni(selectedMuniId, contenido);
        if (ok) {
            textarea.value = '';
            mostrarMensaje('Comentario publicado correctamente.', 'success');
            await cargarComentariosMuni(selectedMuniId);
        } else {
            mostrarMensaje('Error al publicar el comentario.', 'error');
        }
    });

    // Enviar calificación de estrellas
    document.getElementById('btn-submit-muni-rating')?.addEventListener('click', async () => {
        if (!calificacionPendiente) {
            mostrarMensaje('Selecciona una calificación (1-5 estrellas).', 'warning');
            return;
        }
        const ok = await MuniGamificationService.calificarMuni(selectedMuniId, calificacionPendiente);
        if (ok) {
            mostrarMensaje(`¡Calificaste con ${calificacionPendiente} estrellas!`, 'success');
            miCalificacionActual = calificacionPendiente;
            actualizarEstrellas(calificacionPendiente);
            // Recargar el ranking en segundo plano
            renderRanking();
        } else {
            mostrarMensaje('Error al guardar la calificación.', 'error');
        }
    });
}

/**
 * Renderiza el listado del ranking de municipalidades.
 */
export async function renderRanking() {
    const listEl = document.getElementById('ranking-list');
    if (!listEl) return;

    listEl.innerHTML = `<div class="ranking-empty"><i data-lucide="loader"></i><p>Cargando ranking...</p></div>`;
    if (window.lucide) window.lucide.createIcons();

    rankingData = await MuniGamificationService.getRanking();

    if (!rankingData.length) {
        listEl.innerHTML = `
            <div class="ranking-empty">
                <i data-lucide="building-2"></i>
                <p>No hay datos de municipalidades disponibles.</p>
            </div>`;
        if (window.lucide) window.lucide.createIcons();
        return;
    }

    listEl.innerHTML = rankingData.map((muni, idx) => renderRankingCard(muni, idx + 1)).join('');
    if (window.lucide) window.lucide.createIcons();
}

/**
 * Genera el HTML de una tarjeta de ranking.
 */
function renderRankingCard(muni, posicion) {
    const tasa = Number(muni.tasa_resolucion) || 0;
    const calificacion = Number(muni.calificacion_promedio) || 0;
    const totalCal = Number(muni.total_calificaciones) || 0;

    const posicionHTML = posicion === 1 ? '🥇'
        : posicion === 2 ? '🥈'
            : posicion === 3 ? '🥉'
                : `<span class="ranking-card__position--other">#${posicion}</span>`;

    const barraCss = tasa >= 60 ? 'resolution-bar__fill' :
        tasa >= 40 ? 'resolution-bar__fill resolution-bar__fill--mid' :
            'resolution-bar__fill resolution-bar__fill--low';

    const badgeInfo = getBadge(tasa, calificacion);

    const stars = renderEstrellas(calificacion, false);

    return `
        <div class="ranking-card" data-muni-id="${muni.id}" data-muni-nombre="${escapeHtml(muni.nombre)}">
            <div class="ranking-card__badge ${badgeInfo.css}">${badgeInfo.label}</div>
            <div class="ranking-card__position ranking-card__position--${posicion <= 3 ? posicion : 'other'}">${posicionHTML}</div>
            <div class="ranking-card__info">
                <p class="ranking-card__name">${escapeHtml(muni.nombre)}</p>
                <div class="ranking-card__resolution">
                    <div class="resolution-bar">
                        <div class="${barraCss}" style="width: ${tasa}%"></div>
                    </div>
                    <span class="resolution-percentage">${tasa}%</span>
                </div>
                <div class="ranking-card__stats">
                    <span class="stat-pill stat-pill--resolved">
                        <i data-lucide="check-circle"></i> ${muni.reportes_resueltos} resueltos
                    </span>
                    <span class="stat-pill stat-pill--pending">
                        <i data-lucide="clock"></i> ${muni.reportes_pendientes} pendientes
                    </span>
                    <span class="stat-pill">
                        <i data-lucide="file-text"></i> ${muni.total_reportes} total
                    </span>
                </div>
            </div>
            <div class="ranking-card__rating">
                <div class="stars-display">${stars}</div>
                <span class="rating-count">${calificacion > 0 ? calificacion.toFixed(1) : '—'} (${totalCal})</span>
            </div>
        </div>`;
}

/**
 * Abre el modal de perfil de la municipalidad.
 */
async function abrirPerfilMuni(muniId, nombre) {
    selectedMuniId = muniId;
    selectedMuniNombre = nombre;
    calificacionPendiente = null;

    const modal = document.getElementById('modal-muni-profile');
    if (!modal) return;

    // Datos del ranking
    const muniData = rankingData.find(m => m.id === muniId);

    // Título
    modal.querySelector('#modal-muni-nombre').textContent = nombre;

    // Stats
    if (muniData) {
        modal.querySelector('#muni-stat-resueltos').textContent = muniData.reportes_resueltos;
        modal.querySelector('#muni-stat-pendientes').textContent = muniData.reportes_pendientes;
        modal.querySelector('#muni-stat-tasa').textContent = `${muniData.tasa_resolucion}%`;
    }

    modal.classList.add('modal--active');
    if (window.lucide) window.lucide.createIcons();

    // Calificación propia
    miCalificacionActual = await MuniGamificationService.getMiCalificacion(muniId);
    actualizarEstrellas(miCalificacionActual || 0);

    // Comentarios
    await cargarComentariosMuni(muniId);
}

/**
 * Carga y renderiza comentarios del perfil de una municipalidad.
 */
async function cargarComentariosMuni(muniId) {
    const contenedor = document.getElementById('muni-comments-list');
    if (!contenedor) return;

    contenedor.innerHTML = '<p style="color:#94a3b8;font-size:0.85rem;">Cargando comentarios...</p>';

    const comentarios = await MuniGamificationService.getComentarios(muniId);

    if (!comentarios.length) {
        contenedor.innerHTML = '<p style="color:#94a3b8;font-size:0.85rem;margin:0;">Aún no hay comentarios. ¡Sé el primero!</p>';
        return;
    }

    contenedor.innerHTML = comentarios.map(c => {
        const alias = c.perfiles?.alias || 'Usuario';
        const inicial = alias.charAt(0).toUpperCase();
        const fecha = new Date(c.creado_en).toLocaleDateString('es-PY', { day: '2-digit', month: 'short', year: 'numeric' });
        return `
            <div class="comment-item">
                <div class="comment-avatar">${inicial}</div>
                <div class="comment-body">
                    <span class="comment-body__author">${escapeHtml(alias)}</span>
                    <span class="comment-body__date">${fecha}</span>
                    <p class="comment-body__text">${escapeHtml(c.contenido)}</p>
                </div>
            </div>`;
    }).join('');
}

/**
 * Actualiza la visualización de estrellas en el modal.
 */
function actualizarEstrellas(valor) {
    const btns = document.querySelectorAll('#muni-stars-input .star-btn');
    btns.forEach((btn, i) => {
        btn.classList.toggle('active', i < valor);
    });
}

/**
 * Inicializa los botones de estrellas interactivos en el modal.
 */
export function initStarButtons() {
    const starsContainer = document.getElementById('muni-stars-input');
    if (!starsContainer) return;

    starsContainer.innerHTML = [1, 2, 3, 4, 5].map(n =>
        `<button class="star-btn" data-value="${n}" title="${n} estrella${n > 1 ? 's' : ''}">★</button>`
    ).join('');

    starsContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.star-btn');
        if (!btn) return;
        calificacionPendiente = parseInt(btn.dataset.value);
        actualizarEstrellas(calificacionPendiente);
    });
}

/**
 * Genera HTML de estrellas para mostrar (no interactivo).
 */
function renderEstrellas(valor, interactivo = false) {
    return [1, 2, 3, 4, 5].map(n =>
        `<span class="star ${n <= Math.round(valor) ? 'star--filled' : ''}">★</span>`
    ).join('');
}

/**
 * Determina el badge de clasificación según tasa y calificación.
 */
function getBadge(tasa, calificacion) {
    if (tasa >= 80 && calificacion >= 4) return { label: 'Élite', css: 'badge--elite' };
    if (tasa >= 60 && calificacion >= 3) return { label: 'Destacada', css: 'badge--destacada' };
    if (tasa >= 40) return { label: 'En crecimiento', css: 'badge--crecimiento' };
    return { label: 'Atención', css: 'badge--atencion' };
}

