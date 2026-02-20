import { escapeHtml } from '../utils/helpers.js';

export function createReportCard(data) {
    const tpl = document.getElementById('tpl-report-card');
    if (!tpl) return null;

    const clone = tpl.content.cloneNode(true);
    const card = clone.querySelector('.report-card');
    card.dataset.id = data.id;

    // Header
    card.querySelector('.report-card__id').textContent = data.numero_solicitud || 'S/N';
    card.querySelector('.report-card__category').textContent = data.categoria_nombre || 'General';

    const badge = card.querySelector('.status-badge');
    badge.textContent = data.estado || 'Pendiente';
    badge.className = `status-badge status-badge--${(data.estado || 'pending').toLowerCase().replace(' ', '_')}`;

    // Description
    card.querySelector('.report-card__description').textContent = data.descripcion || '';

    // Stats - Author
    const authorBtn = card.querySelector('.js-view-profile');
    if (authorBtn) authorBtn.dataset.userId = data.usuario_id;

    // Stats - Priority Stars
    const starsContainer = card.querySelector('.priority-stars');
    if (starsContainer) {
        starsContainer.innerHTML = renderStars(data.relevancia_relativa, data.score_impacto);
    }

    // Stats - Votes & Comments
    const votesSpan = card.querySelector('.stat-votes span');
    if (votesSpan) votesSpan.textContent = data.total_votos || data.total_interacciones || 0;

    const commentsSpan = card.querySelector('.stat-comments span');
    if (commentsSpan) commentsSpan.textContent = data.total_comentarios || 0;

    // Meta - Location & Date
    const locSpan = card.querySelector('.report-card__location span');
    if (locSpan) locSpan.textContent = ` ${data.municipio_nombre || ''}`;

    const dateSpan = card.querySelector('.report-card__date');
    if (dateSpan) dateSpan.textContent = new Date(data.creado_en).toLocaleDateString();

    return clone;
}

function renderStars(relevance, score) {
    let stars = 1;
    if (relevance !== null && relevance !== undefined) {
        stars = Math.min(5, Math.floor(relevance * 5) + 1);
    } else {
        if (score > 10) stars = 2;
        if (score > 30) stars = 3;
        if (score > 60) stars = 4;
        if (score >= 100) stars = 5;
    }

    let html = '';
    for (let i = 1; i <= 5; i++) {
        const activeClass = i <= stars ? 'active' : 'inactive';
        html += `<i data-lucide="star" class="${activeClass}"></i>`;
    }
    return html;
}
