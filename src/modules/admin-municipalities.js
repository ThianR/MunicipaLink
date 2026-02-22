import { supabaseClient } from '../services/supabase.js';
import { Logger } from '../utils/logger.js';
import { mostrarMensaje, confirmarAccion, TableRenderer } from '../utils/ui.js';
import { escapeHtml } from '../utils/helpers.js';

let allMunicipalities = [];
let currentEditingMuniId = null;
let muniMap = null;
let muniMarker = null;

let currentMuniIdForDepts = null;
let editingDeptId = null;
let allDepartments = [];

export function setupMunicipalitiesListeners() {
    // Buscador de Municipalidades
    const searchMuniInput = document.getElementById('admin-muni-search-input');
    if (searchMuniInput) {
        searchMuniInput.oninput = (e) => filtrarMunicipalidades(e.target.value);
    }

    // Botón Nueva Muni
    const btnNewMuni = document.getElementById('btn-new-muni');
    if (btnNewMuni) {
        btnNewMuni.onclick = () => abrirModalMuni();
    }

    // Modal Muni form submission
    const formMuni = document.getElementById('form-muni');
    if (formMuni) {
        formMuni.onsubmit = (e) => {
            e.preventDefault();
            guardarMuni();
        };
    }

    // Close Modal Muni
    const btnCloseMuni = document.getElementById('btn-close-modal-muni');
    if (btnCloseMuni) {
        btnCloseMuni.onclick = () => document.getElementById('modal-admin-municipality').classList.remove('modal--active');
    }

    // Modal Departments listeners
    const closeBtn = document.getElementById('btn-close-modal-dept');
    if (closeBtn) {
        closeBtn.onclick = () => document.getElementById('modal-admin-departments').classList.remove('modal--active');
    }

    const formDept = document.getElementById('form-add-dept');
    if (formDept) {
        formDept.onsubmit = (e) => {
            e.preventDefault();
            guardarDepartamento();
        };
    }

    // Setup search listener for departments
    const searchInput = document.getElementById('admin-dept-search-input');
    if (searchInput) {
        searchInput.oninput = (e) => {
            filtrarDepartamentos(e.target.value);
        };
    }

    // Botón cancelar edición de departamento
    const btnCancelDept = document.getElementById('btn-cancel-dept-edit');
    if (btnCancelDept) {
        btnCancelDept.onclick = () => resetDeptForm();
    }
}

export async function cargarMunicipalidades() {
    const listId = 'admin-munis-list';
    if (!document.getElementById(listId)) return;

    TableRenderer.showLoading(listId, 3);

    try {
        const { data, error } = await supabaseClient
            .from('municipalidades')
            .select('*')
            .order('nombre', { ascending: true });

        if (error) throw error;
        allMunicipalities = data;
        renderMunicipalidades(data);

    } catch (err) {
        Logger.error('Error al cargar munis admin:', err);
        TableRenderer.showError(listId, 3);
    }
}

export function filtrarMunicipalidades(query) {
    const normalizar = (str) => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : "";
    const term = normalizar(query);

    const filtered = allMunicipalities.filter(m =>
        normalizar(m.nombre).includes(term) ||
        (m.centro && normalizar(JSON.stringify(m.centro)).includes(term))
    );
    renderMunicipalidades(filtered);
}

function renderMunicipalidades(data) {
    const listId = 'admin-munis-list';
    const listEl = document.getElementById(listId);
    if (!listEl) return;

    if (data.length === 0) {
        TableRenderer.showEmpty(listId, 3, 'No hay municipalidades que coincidan.');
        return;
    }

    listEl.innerHTML = data.map(m => {
        const statusClass = m.centro ? 'status-active' : 'status-pending';
        const statusText = m.centro ? 'Activa' : 'Pendiente';
        const statusIcon = m.centro ? 'check-circle' : 'clock';

        const nombre = escapeHtml(m.nombre);
        // JSON seguro para atributo HTML
        const safeMuniObj = JSON.stringify(m).replace(/'/g, "&#39;").replace(/"/g, "&quot;");

        return `
            <tr>
                <td style="font-weight: 700;">${nombre}</td>
                <td>
                    <span class="admin-status-badge ${statusClass}">
                        <i data-lucide="${statusIcon}" style="width: 14px; height: 14px;"></i>
                        <span class="desktop-only">${statusText}</span>
                    </span>
                </td>
                <td>
                    <div style="display: flex; gap: 0.5rem;">
                        <button class="button button--secondary btn-sm btn-edit-muni" data-id="${m.id}" data-obj='${safeMuniObj}' title="Editar Muni" style="width: auto;">
                            <i data-lucide="settings" style="width: 16px; height: 16px;"></i>
                        </button>
                        <button class="button button--primary btn-sm btn-manage-depts" data-id="${m.id}" data-name="${nombre}" title="Gestionar Departamentos" style="width: auto; display: flex; align-items: center; gap: 4px;">
                            <i data-lucide="building" style="width: 16px; height: 16px;"></i> <span class="desktop-only">Deptos</span>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    // Listeners para botones dinámicos
    document.querySelectorAll('.btn-manage-depts').forEach(btn => {
        btn.onclick = () => abrirModalDepartamentos(btn.dataset.id, btn.dataset.name);
    });

    document.querySelectorAll('.btn-edit-muni').forEach(btn => {
        btn.onclick = () => {
            const muni = JSON.parse(btn.dataset.obj.replace(/&quot;/g, '"').replace(/&#39;/g, "'"));
            abrirModalMuni(muni);
        };
    });

    if (window.lucide) window.lucide.createIcons();
}

export function abrirModalMuni(muni = null) {
    const modal = document.getElementById('modal-admin-municipality');
    const title = document.getElementById('modal-muni-title');
    const form = document.getElementById('form-muni');

    currentEditingMuniId = muni ? muni.id : null;
    title.innerHTML = muni ? `<i data-lucide="edit"></i> Editar: ${muni.nombre}` : `<i data-lucide="plus"></i> Nueva Municipalidad`;

    form.reset();
    document.getElementById('muni-lat').value = '';
    document.getElementById('muni-lng').value = '';

    if (muni) {
        document.getElementById('muni-name').value = muni.nombre;

        // Decodificar coordenadas de 'centro' (puede ser Hex, GeoJSON o string POINT)
        if (muni.centro) {
            let lat, lng;

            if (typeof muni.centro === 'object' && muni.centro.coordinates) {
                // GeoJSON format
                lng = muni.centro.coordinates[0];
                lat = muni.centro.coordinates[1];
            } else if (typeof muni.centro === 'string') {
                // Formatos PostGIS Hex (WKB) o WKT
                const coords = parseUbicacion(muni.centro);
                if (coords) {
                    lat = coords.lat;
                    lng = coords.lng;
                }
            }

            if (lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng)) {
                document.getElementById('muni-lat').value = lat;
                document.getElementById('muni-lng').value = lng;
                Logger.info('Coordenadas cargadas desde BD:', { lat, lng });
            }
        }
    }

    modal.classList.add('modal--active');
    if (window.lucide) window.lucide.createIcons();

    // Mostrar loader hasta que el mapa esté listo
    const loader = document.getElementById('muni-map-loader');
    if (loader) loader.style.display = 'block';

    // Inicializar Mapa con mayor rapidez
    // Usamos un pequeño delay para asegurar que el DOM del modal esté estable,
    // pero optimizamos la carga interna de Leaflet.
    setTimeout(() => {
        initMuniMap(muni);
    }, 150); // Reducido a la mitad para mayor agilidad perciba
}

function initMuniMap(muni) {
    const container = document.getElementById('muni-map-container');
    if (!container) return;

    const defaultLat = -25.2637;
    const defaultLng = -57.5759;

    let initialLat = defaultLat;
    let initialLng = defaultLng;

    if (muni && muni.centro) {
        const coords = parseUbicacion(muni.centro);
        if (coords) {
            initialLat = coords.lat;
            initialLng = coords.lng;
        }
    }

    if (!muniMap) {
        muniMap = L.map('muni-map-container', {
            fadeAnimation: false, // Optimización de rendimiento
            markerZoomAnimation: false
        }).setView([initialLat, initialLng], 13);

        // Usar CartoDB Voyager (Más rápido y limpio)
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CartoDB</a>',
            subdomains: 'abcd',
            maxZoom: 20
        }).addTo(muniMap);

        muniMap.whenReady(() => {
            const loader = document.getElementById('muni-map-loader');
            if (loader) loader.style.display = 'none';
        });
    } else {
        muniMap.setView([initialLat, initialLng], 13);
        // Quitar loader si el mapa ya existía
        const loader = document.getElementById('muni-map-loader');
        if (loader) loader.style.display = 'none';

        // Asegurar que el tamaño sea correcto
        setTimeout(() => muniMap.invalidateSize(), 50);
    }

    // IMPORTANTE: Limpiar eventos anteriores y registrar el evento click
    // Esto asegura que funcione en cada apertura del modal
    muniMap.off('click'); // Remover listeners anteriores
    muniMap.on('click', (e) => {
        Logger.info('Clic en mapa detectado:', e.latlng);
        setMuniMarker(e.latlng.lat, e.latlng.lng);
    });

    // Limpiar marcador previo
    if (muniMarker) {
        muniMap.removeLayer(muniMarker);
        muniMarker = null;
    }

    // Si tiene ubicación, poner marcador
    if (muni && muni.centro) {
        setMuniMarker(initialLat, initialLng);
    }
}

function setMuniMarker(lat, lng) {
    Logger.info('setMuniMarker llamado con:', { lat, lng });

    if (muniMarker) {
        muniMarker.setLatLng([lat, lng]);
    } else {
        muniMarker = L.marker([lat, lng], { draggable: true }).addTo(muniMap);
        muniMarker.on('dragend', () => {
            const pos = muniMarker.getLatLng();
            Logger.info('Marcador arrastrado a:', pos);
            document.getElementById('muni-lat').value = pos.lat;
            document.getElementById('muni-lng').value = pos.lng;
        });
    }

    const latInput = document.getElementById('muni-lat');
    const lngInput = document.getElementById('muni-lng');

    if (latInput && lngInput) {
        latInput.value = lat;
        lngInput.value = lng;
        Logger.info('Campos actualizados:', { lat: latInput.value, lng: lngInput.value });
    } else {
        Logger.error('No se encontraron los campos muni-lat o muni-lng');
    }
}

export async function guardarMuni() {
    const nombre = document.getElementById('muni-name').value;
    const lat = document.getElementById('muni-lat').value;
    const lng = document.getElementById('muni-lng').value;

    Logger.info('guardarMuni llamado:', { nombre, lat, lng });

    if (!nombre) return mostrarMensaje('El nombre es obligatorio', 'error');

    const payload = {
        nombre: nombre,
        centro: (lat && lng) ? `POINT(${parseFloat(lng)} ${parseFloat(lat)})` : null
    };

    Logger.info('Payload a guardar:', payload);

    try {
        let result;
        if (currentEditingMuniId) {
            Logger.info('Actualizando municipalidad con ID:', currentEditingMuniId);
            result = await supabaseClient
                .from('municipalidades')
                .update(payload)
                .eq('id', currentEditingMuniId)
                .select(); // Agregar select() para obtener la respuesta

            Logger.info('Respuesta de Supabase (UPDATE):', result);
        } else {
            Logger.info('Insertando nueva municipalidad');
            result = await supabaseClient
                .from('municipalidades')
                .insert([payload])
                .select(); // Agregar select() para obtener la respuesta

            Logger.info('Respuesta de Supabase (INSERT):', result);
        }

        if (result.error) {
            Logger.error('Error de Supabase:', result.error);
            throw result.error;
        }

        Logger.info('Operación exitosa. Datos guardados:', result.data);
        mostrarMensaje(currentEditingMuniId ? 'Municipalidad actualizada' : 'Municipalidad creada', 'success');
        document.getElementById('modal-admin-municipality').classList.remove('modal--active');
        cargarMunicipalidades();

    } catch (err) {
        Logger.error('Error al guardar muni:', err);
        mostrarMensaje('Error al guardar: ' + err.message, 'error');
    }
}

// --- Gestión de Departamentos ---

export function abrirModalDepartamentos(muniId, muniNombre) {
    currentMuniIdForDepts = muniId;
    editingDeptId = null;
    document.getElementById('modal-dept-muni-name').textContent = muniNombre;
    resetDeptForm();
    document.getElementById('modal-admin-departments').classList.add('modal--active');

    // Limpiar form
    document.getElementById('form-add-dept').reset();

    cargarDepartamentos(muniId);

    // Configurar listener de búsqueda
    const searchInput = document.getElementById('admin-dept-search-input');
    if (searchInput) {
        searchInput.value = '';
    }
}

function filtrarDepartamentos(query) {
    const normalizar = (str) => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : "";
    const term = normalizar(query);

    const filtered = allDepartments.filter(d =>
        normalizar(d.nombre).includes(term) ||
        (d.contacto && normalizar(d.contacto).includes(term))
    );
    renderDepartamentos(filtered);
}

export async function cargarDepartamentos(muniId) {
    const listId = 'admin-dept-list';
    TableRenderer.showLoading(listId, 3, 'Cargando departamentos...');

    try {
        const { data, error } = await supabaseClient
            .from('departamentos')
            .select('*')
            .eq('municipalidad_id', muniId)
            .order('nombre', { ascending: true });

        if (error) throw error;
        allDepartments = data;
        renderDepartamentos(allDepartments);

    } catch (err) {
        Logger.error('Error al cargar departamentos:', err);
        TableRenderer.showError(listId, 3);
    }
}

function renderDepartamentos(data) {
    const listEl = document.getElementById('admin-dept-list');
    const countEl = document.getElementById('dept-count');

    if (countEl) countEl.textContent = data.length;

    if (data.length === 0) {
        listEl.innerHTML = '<tr><td colspan="3" class="text-muted" style="text-align:center; padding: 2rem;">No hay departamentos registrados.</td></tr>';
        return;
    }

    listEl.innerHTML = data.map(d => {
        const statusClass = d.estado === 'inactivo' ? 'status-pending' : 'status-active';
        const statusText = d.estado === 'inactivo' ? 'Inactivo' : 'Activo';
        const nombre = escapeHtml(d.nombre);
        const contacto = escapeHtml(d.contacto || 'Sin contacto');
        const safeDeptObj = JSON.stringify(d).replace(/'/g, "&#39;").replace(/"/g, "&quot;");

        return `
        <tr>
            <td>
                <div style="display: flex; flex-direction: column;">
                    <span style="font-weight: 700; color: var(--text-main); font-size: 0.9375rem;">${d.nombre}</span>
                </div>
            </td>
            <td>
                <div style="display: flex; flex-direction: column; gap: 0.25rem;">
                    <div style="display: flex; align-items: center; gap: 0.5rem; color: var(--text-muted); font-size: 0.8125rem;">
                        <i data-lucide="phone" style="width: 12px; height: 12px;"></i>
                        ${d.contacto || 'Sin contacto'}
                    </div>
                    <span class="admin-status-badge ${statusClass}" style="font-size: 0.65rem; padding: 0.1rem 0.4rem; width: fit-content;">
                        ${statusText}
                    </span>
                </div>
            </td>
            <td>
                <div style="display: flex; gap: 0.375rem; justify-content: flex-end;">
                    <button class="button button--secondary btn-sm btn-edit-dept" data-id="${d.id}" data-obj='${JSON.stringify(d)}' title="Editar">
                        <i data-lucide="edit-3" style="width: 14px; height: 14px;"></i>
                    </button>
                    <button class="button button--danger btn-sm btn-delete-dept" data-id="${d.id}" title="Eliminar">
                        <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
                    </button>
                </div>
            </td>
        </tr>
    `;
    }).join('');

    // Listeners
    document.querySelectorAll('.btn-edit-dept').forEach(btn => {
        btn.addEventListener('click', () => {
            const dept = JSON.parse(btn.dataset.obj.replace(/&quot;/g, '"').replace(/&#39;/g, "'"));
            cargarDatosEdicion(dept);
        });
    });

    document.querySelectorAll('.btn-delete-dept').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (await confirmarAccion('¿Seguro que deseas eliminar este departamento?', 'Eliminar Departamento')) {
                eliminarDepartamento(btn.dataset.id);
            }
        });
    });

    if (window.lucide) window.lucide.createIcons();
}

function cargarDatosEdicion(dept) {
    editingDeptId = dept.id;
    document.getElementById('new-dept-name').value = dept.nombre;
    document.getElementById('new-dept-contact').value = dept.contacto || '';
    if (document.getElementById('new-dept-status')) {
        document.getElementById('new-dept-status').value = dept.estado || 'activo';
    }
    document.getElementById('btn-submit-dept-text').innerHTML = '<i data-lucide="save"></i> Actualizar';

    const btnCancel = document.getElementById('btn-cancel-dept-edit');
    if (btnCancel) btnCancel.style.display = 'block';

    document.getElementById('new-dept-name').focus();
    if (window.lucide) window.lucide.createIcons();
}

function resetDeptForm() {
    editingDeptId = null;
    const form = document.getElementById('form-add-dept');
    if (form) form.reset();

    const statusEl = document.getElementById('new-dept-status');
    if (statusEl) statusEl.value = 'activo';

    const btnSubmit = document.getElementById('btn-submit-dept-text');
    if (btnSubmit) btnSubmit.innerHTML = '<i data-lucide="plus"></i> Agregar';

    const btnCancel = document.getElementById('btn-cancel-dept-edit');
    if (btnCancel) btnCancel.style.display = 'none';

    if (window.lucide) window.lucide.createIcons();
}

export async function guardarDepartamento() {
    if (!currentMuniIdForDepts) return;

    const nombre = document.getElementById('new-dept-name').value;
    const contacto = document.getElementById('new-dept-contact').value;
    const estado = document.getElementById('new-dept-status')?.value || 'activo';

    if (!nombre) return mostrarMensaje('El nombre es obligatorio', 'error');

    const payload = {
        municipalidad_id: currentMuniIdForDepts,
        nombre: nombre,
        contacto: contacto,
        estado: estado
    };

    try {
        let error;

        if (editingDeptId) {
            // Update
            const res = await supabaseClient
                .from('departamentos')
                .update(payload)
                .eq('id', editingDeptId);
            error = res.error;
        } else {
            // Create
            const res = await supabaseClient
                .from('departamentos')
                .insert(payload);
            error = res.error;
        }

        if (error) throw error;

        mostrarMensaje(editingDeptId ? 'Departamento actualizado' : 'Departamento creado', 'success');

        resetDeptForm();
        cargarDepartamentos(currentMuniIdForDepts);

    } catch (err) {
        Logger.error('Error al guardar departamento:', err);
        mostrarMensaje(err.message, 'error');
    }
}

async function eliminarDepartamento(id) {
    try {
        const { error } = await supabaseClient
            .from('departamentos')
            .delete()
            .eq('id', id);

        if (error) throw error;

        mostrarMensaje('Departamento eliminado', 'success');
        cargarDepartamentos(currentMuniIdForDepts);

    } catch (err) {
        Logger.error('Error al eliminar departamento:', err);
        mostrarMensaje('No se pudo eliminar', 'error');
    }
}
