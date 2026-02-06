import { supabaseClient } from '../services/supabase.js';
import { AuthModule } from './auth.js';
import { UIModule } from './ui.js';
import { MunicipalityModule } from './municipalities.js'; // Assuming we might need this
import { mostrarMensaje, abrirLightbox } from '../utils/ui.js';
import { comprimirImagen } from '../utils/helpers.js';
import { Logger } from '../utils/logger.js';

let currentSort = 'recent';
let currentSearch = '';
let reporteActualId = null;
let mapaDetalle = null;

export const ReportsModule = {
    init: () => {

        // Mobile Toggle logic
        const btnToggleFilters = document.getElementById('btn-toggle-filters');
        if (btnToggleFilters) {
            btnToggleFilters.addEventListener('click', () => {
                const toolbar = document.getElementById('reports-toolbar');
                toolbar.classList.toggle('active');
            });
        }

        setupListeners();
        // Escuchar cambios en la UI
        document.addEventListener('ui:view-changed', async (e) => {
            if (e.detail.view === 'reports') {
                const user = AuthModule.getUsuarioActual();
                if (!user) {
                    // Invitado -> Ir a Todas
                    UIModule.changeTab('all-requests');
                } else {
                    // Verificar si tiene reportes propios
                    try {
                        const { count, error } = await supabaseClient
                            .from('reportes')
                            .select('id', { count: 'exact', head: true })
                            .eq('usuario_id', user.id);

                        if (!error && count === 0) {
                            UIModule.changeTab('all-requests');
                        }
                    } catch (err) {
                        Logger.warn('Error al verificar reportes propios', err);
                    }
                }
                reloadReports();
            }
        });
        document.addEventListener('ui:tab-changed', (e) => {
            reloadReports();
        });

        // Carga inicial si ya estamos en la vista
        const currentView = localStorage.getItem('currentView');
        if (currentView === 'reports') {
            setTimeout(() => {
                const activeTab = document.querySelector('.tabs__content--active');
                if (!activeTab) UIModule.changeTab('all-requests');
                else reloadReports();
            }, 200);
        }
    },
    abrirDetalle: abrirDetalleReporte
};

function setupListeners() {
    // Envío de formularios
    const formReporte = document.getElementById('form-report');
    if (formReporte) formReporte.addEventListener('submit', enviarReporte);

    // Filtros
    const sortSelector = document.getElementById('sort-selector');
    if (sortSelector) sortSelector.addEventListener('change', (e) => {
        currentSort = e.target.value;
        reloadReports();
    });

    const statusSelectors = [
        document.getElementById('status-selector-reports'),
        document.getElementById('status-selector-mobile')
    ];
    statusSelectors.forEach(s => {
        if (s) s.addEventListener('change', reloadReports);
    });

    // Search Input
    const searchInput = document.getElementById('search-input');
    let timeout = null;
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                currentSearch = e.target.value.trim();
                reloadReports();
            }, 300); // Debounce
        });
    }

    // Interacciones
    const btnVoteUp = document.getElementById('btn-vote-up');
    const btnVoteDown = document.getElementById('btn-vote-down');
    const btnFollow = document.getElementById('btn-follow');
    const formComment = document.getElementById('form-add-comment');

    if (btnVoteUp) btnVoteUp.addEventListener('click', () => interactuar('voto_positivo'));
    if (btnVoteDown) btnVoteDown.addEventListener('click', () => interactuar('voto_negativo'));
    if (btnFollow) btnFollow.addEventListener('click', () => interactuar('seguir'));
    if (formComment) formComment.addEventListener('submit', enviarComentario);

    // Cargar categorías y abrir modal
    const abrirModalReporte = () => {
        const user = AuthModule.getUsuarioActual();
        const muniId = MunicipalityModule.getSeleccionado();

        Logger.debug('Intentando abrir modal de reporte', { user, muniId });

        if (!user) {
            mostrarMensaje('Debes iniciar sesión para reportar', 'info');
            return;
        }

        if (!muniId) {
            mostrarMensaje('Por favor, selecciona una municipalidad primero para poder reportar.', 'warning');
            return;
        }

        const modal = document.getElementById('modal-report');
        if (modal) {
            modal.classList.add('modal--active');
            cargarCategorias();
            lucide.createIcons();
            Logger.info('Modal de reporte abierto exitosamente');
        } else {
            Logger.error('No se encontró el elemento modal-report');
        }
    };

    document.getElementById('btn-open-report')?.addEventListener('click', (e) => {
        Logger.debug('Click en btn-open-report');
        abrirModalReporte();
    });

    document.getElementById('btn-open-report-mobile')?.addEventListener('click', (e) => {
        const action = e.currentTarget.getAttribute('data-action');
        Logger.debug('Click en btn-open-report-mobile', { action });
        if (action === 'new-report') {
            abrirModalReporte();
        } else if (action === 'back-to-map') {
            UIModule.changeView('map');
        }
    });

    // Delegación para tarjetas de reporte (Click al detalle)
    document.addEventListener('click', (e) => {
        const card = e.target.closest('.report-card');
        if (card && card.dataset.id) {
            abrirDetalleReporte(card.dataset.id);
        }
    });

    // Botón volver en detalle
    document.getElementById('btn-back-detail')?.addEventListener('click', () => {
        UIModule.changeView('reports');
    });


    // Botón Limpiar Filtros
    document.getElementById('btn-clear-filters')?.addEventListener('click', () => {
        // Reset Variables
        currentSearch = '';
        currentSort = 'recent';

        // Reset Inputs
        const searchInput = document.getElementById('search-input');
        if (searchInput) searchInput.value = '';

        const sortSel = document.getElementById('sort-selector');
        if (sortSel) sortSel.value = 'recent';

        const muniSel = document.getElementById('muni-selector-reports');
        if (muniSel) muniSel.value = '';

        const statusSel = document.getElementById('status-selector-reports');
        if (statusSel) statusSel.value = '';

        reloadReports();
    });
}

function reloadReports() {
    const activeTab = document.querySelector('.tabs__content--active') || document.querySelector('.tab-content.active');
    if (!activeTab) {
        // Forza selección de tab si no hay ninguno
        UIModule.changeTab('all-requests');
        return;
    }

    const tabId = activeTab.id;

    const muniId = document.getElementById('muni-selector-reports')?.value ||
        document.getElementById('muni-selector-mobile')?.value;

    const estado = document.getElementById('status-selector-reports')?.value ||
        document.getElementById('status-selector-mobile')?.value;

    if (tabId === 'tab-my-requests') {
        cargarMisReportes(muniId, estado);
    } else {
        cargarTodasLasSolicitudes(muniId, estado);
    }
}

async function cargarCategorias() {
    const selectorCat = document.getElementById('report-category');
    if (!selectorCat || selectorCat.children.length > 1) return; // Already loaded

    try {
        const { data, error } = await supabaseClient.from('categorias').select('*');
        if (error) throw error;
        selectorCat.innerHTML = '<option value="">Seleccionar Categoría</option>';
        data.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat.id;
            opt.textContent = cat.nombre;
            selectorCat.appendChild(opt);
        });
    } catch (e) {
        Logger.error('Error al cargar categorías', e);
    }
}

async function enviarReporte(e) {
    e.preventDefault();
    const user = AuthModule.getUsuarioActual();
    if (!user) return mostrarMensaje('Debes iniciar sesión.', 'error');

    const botonEnvio = document.getElementById('btn-submit-report');
    const selectorMuni = document.getElementById('muni-selector');

    if (!selectorMuni.value) return mostrarMensaje('Selecciona municipalidad.', 'error');

    botonEnvio.disabled = true;
    botonEnvio.textContent = 'Enviando...';

    const datosForm = new FormData(e.target);
    const inputFotos = document.getElementById('report-photos');
    const archivos = inputFotos ? inputFotos.files : [];

    // Usando MapModule para obtener ubicación (¿pero necesitamos importar MapModule? ¿Disparar evento?)
    // Asumamos que MapModule actualiza un estado global o compartido, O lo importamos.
    // Riesgo de dependencia circular. MapModule no depende de nada. ReportsModule depende de MapModule?
    // Importemos MapModule dinámicamente o confiemos en sessionStorage/global
    // Por ahora, asumamos que 'ubicacion_usuario' en sessionStorage es actual

    let ubicacion = [-25.2867, -57.6470];
    const cached = sessionStorage.getItem('ubicacion_usuario');
    if (cached) {
        const p = JSON.parse(cached);
        ubicacion = [p.lat, p.lng];
    }

    const ubicacionPoint = `POINT(${ubicacion[1]} ${ubicacion[0]})`;

    try {
        const { data: reporte, error } = await supabaseClient
            .from('reportes')
            .insert([{
                categoria_id: datosForm.get('category_id'),
                descripcion: datosForm.get('description'),
                ubicacion: ubicacionPoint,
                municipalidad_id: selectorMuni.value,
                estado: 'Pendiente',
                usuario_id: user.id
            }])
            .select()
            .single();

        if (error) throw error;

        // Subir Imágenes
        if (archivos && archivos.length > 0) {
            for (const archivo of archivos) {
                const nombre = `${Date.now()}_${Math.floor(Math.random() * 1000)}_${archivo.name}`;
                const ruta = `${user.id}/${nombre}`;

                await supabaseClient.storage.from('evidencias').upload(ruta, archivo);
                const { data: publicUrl } = supabaseClient.storage.from('evidencias').getPublicUrl(ruta);

                await supabaseClient.from('evidencias').insert([{
                    reporte_id: reporte.id,
                    imagen_url: publicUrl.publicUrl,
                    tipo_evidencia: 'reporte'
                }]);
            }
        }

        mostrarMensaje('¡Reporte enviado!', 'success');
        e.target.reset();
        document.getElementById('modal-report').classList.remove('modal--active');
        reloadReports();

    } catch (err) {
        mostrarMensaje('Error: ' + err.message, 'error');
    } finally {
        botonEnvio.disabled = false;
        botonEnvio.textContent = 'Enviar Reporte';
    }
}

async function cargarTodasLasSolicitudes(muniId, estado) {
    const list = document.getElementById('all-reports-list');
    list.innerHTML = '<div class="loading-spinner">Cargando...</div>';

    try {
        let query = supabaseClient.from('reportes_final_v1').select('*');
        if (muniId) query = query.eq('municipalidad_id', muniId);
        if (estado) query = query.eq('estado', estado);

        if (currentSearch) {
            // Busqueda por ID, Descripción, Autor o Alias
            query = query.or(`numero_solicitud.ilike.%${currentSearch}%,descripcion.ilike.%${currentSearch}%,autor_nombre.ilike.%${currentSearch}%,autor_alias.ilike.%${currentSearch}%`);
        }

        query = aplicarOrdenamiento(query);
        const { data, error } = await query;
        if (error) throw error;

        renderizarReportes(data, 'all-reports-list');
    } catch (err) {
        console.error(err);
        list.innerHTML = '<p class="error">Error al cargar.</p>';
    }
}

async function cargarMisReportes(muniId, estado) {
    const user = AuthModule.getUsuarioActual();
    if (!user) return;

    const list = document.getElementById('my-reports-list');
    list.innerHTML = '<div class="loading-spinner">Cargando...</div>';

    try {
        let query = supabaseClient.from('reportes_final_v1').select('*').eq('usuario_id', user.id);
        if (muniId) query = query.eq('municipalidad_id', muniId);
        if (estado) query = query.eq('estado', estado);

        if (currentSearch) {
            query = query.or(`numero_solicitud.ilike.%${currentSearch}%,descripcion.ilike.%${currentSearch}%`);
        }

        query = aplicarOrdenamiento(query);
        const { data, error } = await query;
        if (error) throw error;

        renderizarReportes(data, 'my-reports-list');
    } catch (err) {
        console.error(err);
        list.innerHTML = '<p class="error">Error al cargar.</p>';
    }
}

function aplicarOrdenamiento(query) {
    if (currentSort === 'recent') return query.order('creado_en', { ascending: false });
    if (currentSort === 'oldest') return query.order('creado_en', { ascending: true });
    if (currentSort === 'impact') {
        // Ordenamos por la relevancia relativa que define las estrellas, 
        // y usamos el score absoluto como segundo criterio
        return query
            .order('relevancia_relativa', { ascending: false })
            .order('score_impacto', { ascending: false });
    }
    return query;
}

async function renderizarReportes(reportes, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!reportes || reportes.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No hay reportes.</p></div>';
        return;
    }

    container.innerHTML = reportes.map(r => {
        // Usamos los datos ya presentes en la vista reportes_final_v1
        const authorName = r.autor_nombre || r.autor_alias || 'Vecino';
        const authorAvatar = r.autor_avatar || null;
        const author = { nombre: authorName, avatar_url: authorAvatar };

        const relevance = r.relevancia_relativa !== undefined ? r.relevancia_relativa : null;
        const starsHtml = renderStars(relevance, r.score_impacto);

        return `
            <div class="report-card" data-id="${r.id}">
                <div class="report-card__header">
                     <span class="report-card__id">${r.numero_solicitud || 'S/N'}</span>
                     <span class="report-card__category">${r.categoria_nombre || 'General'}</span>
                     <span class="status-badge status-badge--${(r.estado || 'pending').toLowerCase().replace(' ', '_')}">${r.estado}</span>
                </div>
                <p class="report-card__description">${r.descripcion}</p>
                
                <div class="report-card__stats">
                     <div class="report-card__author" title="Ver perfil del ciudadano" onclick="window.verPerfilCiudadano(event, '${r.usuario_id}', '${author.nombre.replace(/'/g, "\\'")}', '${author.avatar_url || ''}')">
                        <i data-lucide="user"></i> Ver Ciudadano
                    </div>
                    
                    <div class="report-card__priority" title="Prioridad">
                         <div class="priority-stars">${starsHtml}</div>
                    </div>

                    <div class="report-card__stat" title="Apoyos">
                        <i data-lucide="thumbs-up"></i> ${r.total_votos || r.total_interacciones || 0}
                    </div>

                    <div class="report-card__stat" title="Comentarios">
                        <i data-lucide="message-square"></i> ${r.total_comentarios || 0}
                    </div>
                </div>

                <div class="report-card__meta">
                    <span class="report-card__location"><i data-lucide="map-pin"></i> ${r.municipio_nombre}</span>
                    <span class="report-card__date">${new Date(r.creado_en).toLocaleDateString()}</span>
                </div>
            </div>
        `;
    }).join('');
    if (window.lucide) lucide.createIcons();
}

function renderStars(relevance, score) {
    // Si tenemos relevancia relativa (0 a 1), la usamos para las estrellas (1 a 5)
    let stars = 1;

    if (relevance !== null) {
        // Mapeo simple: 0.0-0.2=1, 0.2-0.4=2, 0.4-0.6=3, 0.6-0.8=4, 0.8-1.0=5
        stars = Math.min(5, Math.floor(relevance * 5) + 1);
    } else {
        // Fallback a score absoluto si no hay relativa
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

async function abrirDetalleReporte(id) {
    reporteActualId = id;
    UIModule.changeView('report-detail');

    // Lógica de carga de detalles (Fetch único, comentarios, evidencias)
    // Misma implementación que app.js (omitido por brevedad, asumir actualizado)
    // Básicamente: Traer reporte, renderizar info, traer comentarios, traer interacciones
    const title = document.getElementById('detail-title');
    if (title) title.textContent = 'Cargando...';

    try {
        const { data, error } = await supabaseClient
            .from('reportes_final_v1')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        if (title) title.textContent = `${data.numero_solicitud ? data.numero_solicitud + ' - ' : ''}${data.categoria_nombre || 'Solicitud'}`;
        document.getElementById('detail-description').textContent = data.descripcion;

        // Llenar nuevos campos
        document.getElementById('detail-category').textContent = data.categoria_nombre || 'Sin categoría';
        document.getElementById('detail-status').textContent = data.estado || 'Pendiente';
        document.getElementById('detail-date').textContent = new Date(data.creado_en).toLocaleDateString();

        // Renderizar estrellas de prioridad en detalle
        const detailPriorityEl = document.getElementById('detail-priority');
        if (detailPriorityEl) {
            const relevance = data.relevancia_relativa !== undefined ? data.relevancia_relativa : null;
            detailPriorityEl.innerHTML = renderStars(relevance, data.score_impacto || 0);
        }

        // Actualizar color de badge de estado
        const statusBadge = document.getElementById('detail-status');
        statusBadge.className = 'status-badge'; // reiniciar
        statusBadge.classList.add(`status-badge--${(data.estado || 'pending').toLowerCase().replace(' ', '_')}`);

        // Cargar evidencias
        cargarEvidencias(id);

        // Cargar comentarios e interacciones
        cargarComentarios(id);
        cargarInteracciones(id);

        // Iniciar Mini Mapa
        if (!mapaDetalle) {
            mapaDetalle = L.map('detail-map').setView([0, 0], 15);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapaDetalle);
        }

        // Parsear ubicación
        if (data.ubicacion) {
            // Análisis rápido
            const match = data.ubicacion.match(/\(([^)]+)\)/);
            if (match) {
                const [lng, lat] = match[1].split(' ').map(parseFloat);
                mapaDetalle.setView([lat, lng], 15);
                L.marker([lat, lng]).addTo(mapaDetalle);
                setTimeout(() => { mapaDetalle.invalidateSize(); }, 300); // Arreglar renderizado de mapa
            }
        }

    } catch (e) {
        Logger.error(`Error al abrir detalle del reporte ${id}`, e);
        mostrarMensaje('Error cargando detalle', 'error');
    }
}

async function cargarEvidencias(id) {
    const list = document.getElementById('evidences-carousel');
    if (!list) return;
    list.innerHTML = 'Cargando...';

    try {
        const { data, error } = await supabaseClient
            .from('evidencias')
            .select('*')
            .eq('reporte_id', id);

        if (error) throw error;

        if (!data || data.length === 0) {
            list.innerHTML = '<p class="empty-state">No hay evidencias adjuntas.</p>';
            return;
        }

        list.innerHTML = data.map(ev => {
            const isImage = ev.imagen_url.match(/\.(jpeg|jpg|gif|png|webp)/i);
            return `
                <div class="evidence-thumbnail-container" data-url="${ev.imagen_url}">
                    ${isImage
                    ? `<img src="${ev.imagen_url}" class="evidence-thumbnail" alt="Evidencia">`
                    : `<div class="evidence-thumbnail-file">
                             <i data-lucide="file-text"></i>
                             <span>Documento</span>
                           </div>`
                }
                </div>
            `;
        }).join('');

        // Agregar listeners
        list.querySelectorAll('.evidence-thumbnail-container').forEach(el => {
            el.onclick = () => abrirLightbox(el.dataset.url);
        });

        // Reiniciar iconos lucide si se insertaron nuevos
        if (window.lucide) window.lucide.createIcons();

    } catch (err) {
        Logger.error(`Error al cargar evidencias del reporte ${id}`, err);
        list.innerHTML = '<p class="error">Error al cargar evidencias.</p>';
    }
}

async function cargarComentarios(id) {
    const container = document.getElementById('comments-list');
    const countEl = document.getElementById('comments-count');
    if (!container) return;

    container.innerHTML = '<p class="loading">Cargando comentarios...</p>';

    try {
        // 1. Obtener comentarios
        const { data: comments, error: commError } = await supabaseClient
            .from('comentarios')
            .select('*')
            .eq('reporte_id', id)
            .order('creado_en', { ascending: true });

        if (commError) throw commError;

        if (countEl) countEl.textContent = comments ? comments.length : 0;

        if (!comments || comments.length === 0) {
            container.innerHTML = '<p class="empty-state">No hay comentarios aún. ¡Sé el primero en comentar!</p>';
            return;
        }

        // 2. Obtener perfiles de los autores
        const userIds = [...new Set(comments.map(c => c.usuario_id))].filter(Boolean);
        let profilesMap = {};

        if (userIds.length > 0) {
            const { data: profiles } = await supabaseClient
                .from('perfiles')
                .select('id, nombre_completo, alias, avatar_url')
                .in('id', userIds);

            if (profiles) {
                profiles.forEach(p => profilesMap[p.id] = p);
            }
        }

        // 3. Renderizar
        container.innerHTML = comments.map(c => {
            const p = profilesMap[c.usuario_id] || {};
            const authorName = p.nombre_completo || p.alias || 'Vecino';
            const authorAvatar = p.avatar_url || null;
            const author = { nombre: authorName, avatar_url: authorAvatar };

            const avatar = author.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(author.nombre)}&background=random`;

            return `
                <div class="comment-item">
                    <img src="${avatar}" class="comment-avatar" alt="${author.nombre}">
                    <div class="comment-content">
                        <div class="comment-header">
                            <span class="comment-author">${author.nombre}</span>
                            <span class="comment-date">${new Date(c.creado_en).toLocaleDateString()}</span>
                        </div>
                        <p class="comment-text">${c.contenido}</p>
                    </div>
                </div>
            `;
        }).join('');

        if (window.lucide) window.lucide.createIcons();

    } catch (err) {
        Logger.error(`Error al cargar comentarios del reporte ${id}`, err);
        container.innerHTML = '<p class="error">Error al cargar comentarios.</p>';
    }
}

async function enviarComentario(e) {
    e.preventDefault();
    const content = document.getElementById('comment-content').value;
    const user = AuthModule.getUsuarioActual();
    if (!user || !content) return;

    await supabaseClient.from('comentarios').insert({
        reporte_id: reporteActualId,
        usuario_id: user.id,
        contenido: content
    });
    document.getElementById('comment-content').value = '';
    cargarComentarios(reporteActualId);
}

async function cargarInteracciones(id) {
    const user = AuthModule.getUsuarioActual();
    try {
        const { data, error } = await supabaseClient
            .from('interacciones')
            .select('tipo, usuario_id')
            .eq('reporte_id', id);

        if (error) throw error;

        const up = data ? data.filter(i => i.tipo === 'voto_positivo').length : 0;
        const down = data ? data.filter(i => i.tipo === 'voto_negativo').length : 0;
        const following = data ? data.some(i => i.tipo === 'seguir' && user && i.usuario_id === user.id) : false;
        const myVoteUp = data ? data.some(i => i.tipo === 'voto_positivo' && user && i.usuario_id === user.id) : false;
        const myVoteDown = data ? data.some(i => i.tipo === 'voto_negativo' && user && i.usuario_id === user.id) : false;

        const elUp = document.getElementById('vote-up-count');
        const elDown = document.getElementById('vote-down-count');
        const btnUp = document.getElementById('btn-vote-up');
        const btnDown = document.getElementById('btn-vote-down');
        const btnFollow = document.getElementById('btn-follow');

        if (elUp) elUp.textContent = up;
        if (elDown) elDown.textContent = down;

        // Resaltar en verde si el usuario actual interactuó
        if (btnUp) btnUp.classList.toggle('active', myVoteUp);
        if (btnDown) btnDown.classList.toggle('active', myVoteDown);

        if (btnFollow) {
            btnFollow.classList.toggle('active', following);
            btnFollow.innerHTML = following
                ? '<i data-lucide="eye"></i> Siguiendo'
                : '<i data-lucide="eye"></i> Seguir';
            if (window.lucide) lucide.createIcons();
        }

    } catch (err) {
        Logger.warn(`Error al cargar interacciones del reporte ${id}`, err);
    }
}

async function interactuar(tipo) {
    const user = AuthModule.getUsuarioActual();
    if (!user) return mostrarMensaje('Debes iniciar sesión para interactuar', 'error');
    if (!reporteActualId) return;

    try {
        const { data: existing } = await supabaseClient
            .from('interacciones')
            .select('*')
            .eq('reporte_id', reporteActualId)
            .eq('usuario_id', user.id);

        const currentInt = existing && existing.length > 0 ? existing[0] : null;

        if (currentInt) {
            await supabaseClient.from('interacciones').delete().eq('id', currentInt.id);
            if (currentInt.tipo === tipo) {
                mostrarMensaje('Interacción eliminada', 'info');
                cargarInteracciones(reporteActualId);
                return;
            }
        }

        const { error } = await supabaseClient.from('interacciones').insert({
            reporte_id: reporteActualId,
            usuario_id: user.id,
            tipo: tipo
        });

        if (error) throw error;
        mostrarMensaje('¡Interacción registrada!', 'success');
        cargarInteracciones(reporteActualId);
    } catch (err) {
        Logger.error('Error al procesar interacción', err);
        mostrarMensaje('No se pudo registrar tu voto', 'error');
    }
}

function updateStat(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val !== undefined && val !== null ? val : 0;
}

// Función para navegar al perfil de un ciudadano
async function verPerfilCiudadano(e, userId, userName, userAvatar) {
    if (e) e.stopPropagation();

    // Navegar a la vista de perfil
    UIModule.changeView('profile');

    // Cargar los datos del usuario en esa vista
    document.dispatchEvent(new CustomEvent('profile:load-user', {
        detail: { userId: userId }
    }));
}

// Hacerlo global para que funcione el onclick inline
// O adjuntar listeners de eventos en renderizarReportes.
window.verPerfilCiudadano = verPerfilCiudadano;
