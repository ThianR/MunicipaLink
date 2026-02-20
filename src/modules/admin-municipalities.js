import { supabaseClient } from '../services/supabase.js';
import { Logger } from '../utils/logger.js';
import { mostrarMensaje } from '../utils/ui.js';

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
}

export async function cargarMunicipalidades() {
    const listEl = document.getElementById('admin-munis-list');
    if (!listEl) return;

    listEl.innerHTML = '<tr><td colspan="3">Cargando...</td></tr>';

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
        listEl.innerHTML = '<tr><td colspan="3">Error al cargar datos.</td></tr>';
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
    const listEl = document.getElementById('admin-munis-list');
    if (!listEl) return;

    if (data.length === 0) {
        listEl.innerHTML = '<tr><td colspan="3" class="text-muted">No hay municipalidades que coincidan.</td></tr>';
        return;
    }

    listEl.innerHTML = data.map(m => {
        const statusClass = m.centro ? 'status-active' : 'status-pending';
        const statusText = m.centro ? 'Activa' : 'Pendiente';
        const statusIcon = m.centro ? 'check-circle' : 'clock';

        return `
            <tr>
                <td style="font-weight: 700;">${m.nombre}</td>
                <td>
                    <span class="admin-status-badge ${statusClass}">
                        <i data-lucide="${statusIcon}" style="width: 14px; height: 14px;"></i>
                        <span class="desktop-only">${statusText}</span>
                    </span>
                </td>
                <td>
                    <div style="display: flex; gap: 0.5rem;">
                        <button class="button button--secondary btn-sm btn-edit-muni" data-id="${m.id}" data-obj='${JSON.stringify(m)}' title="Editar Muni" style="width: auto;">
                            <i data-lucide="settings" style="width: 16px; height: 16px;"></i>
                        </button>
                        <button class="button button--primary btn-sm btn-manage-depts" data-id="${m.id}" data-name="${m.nombre}" title="Gestionar Departamentos" style="width: auto; display: flex; align-items: center; gap: 4px;">
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
            const muni = JSON.parse(btn.dataset.obj);
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
                // PostGIS Hex (WKB) format
                if (muni.centro.startsWith('0101')) {
                    try {
                        const hasSRID = muni.centro.substring(8, 10) === '20';
                        const offset = hasSRID ? 18 : 10;
                        const hexToDouble = (hex) => {
                            const bytes = new Uint8Array(hex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
                            const view = new DataView(bytes.buffer);
                            return view.getFloat64(0, true);
                        };
                        lng = hexToDouble(muni.centro.substring(offset, offset + 16));
                        lat = hexToDouble(muni.centro.substring(offset + 16, offset + 32));
                    } catch (err) {
                        Logger.error('Error parseando Hex de centro:', err);
                    }
                } else {
                    // POINT(lng lat) format
                    const match = muni.centro.match(/POINT\(([^ ]+) ([^ ]+)\)/) || muni.centro.match(/\(([^ ]+) ([^ ]+)\)/);
                    if (match) {
                        lng = parseFloat(match[1]);
                        lat = parseFloat(match[2]);
                    }
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
        let lat, lng;

        if (typeof muni.centro === 'object' && muni.centro.coordinates) {
            lng = muni.centro.coordinates[0];
            lat = muni.centro.coordinates[1];
        } else if (typeof muni.centro === 'string') {
            if (muni.centro.startsWith('0101')) {
                try {
                    const hasSRID = muni.centro.substring(8, 10) === '20';
                    const offset = hasSRID ? 18 : 10;
                    const hexToDouble = (hex) => {
                        const bytes = new Uint8Array(hex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
                        const view = new DataView(bytes.buffer);
                        return view.getFloat64(0, true);
                    };
                    lng = hexToDouble(muni.centro.substring(offset, offset + 16));
                    lat = hexToDouble(muni.centro.substring(offset + 16, offset + 32));
                } catch (err) {
                    Logger.error('Error parseando Hex:', err);
                }
            } else {
                const match = muni.centro.match(/POINT\(([^ ]+) ([^ ]+)\)/) || muni.centro.match(/\(([^ ]+) ([^ ]+)\)/);
                if (match) {
                    lng = parseFloat(match[1]);
                    lat = parseFloat(match[2]);
                }
            }
        }

        if (lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng)) {
            initialLat = lat;
            initialLng = lng;
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
    document.getElementById('btn-submit-dept-text').innerHTML = '<i data-lucide="plus"></i> Agregar';
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
    const listEl = document.getElementById('admin-dept-list');
    listEl.innerHTML = '<tr><td colspan="3">Cargando departamentos...</td></tr>';

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
        listEl.innerHTML = '<tr><td colspan="3">Error al cargar datos.</td></tr>';
    }
}

function renderDepartamentos(data) {
    const listEl = document.getElementById('admin-dept-list');

    if (data.length === 0) {
        listEl.innerHTML = '<tr><td colspan="3" class="text-muted">No hay departamentos que coincidan.</td></tr>';
        return;
    }

    listEl.innerHTML = data.map(d => `
        <tr>
            <td style="padding: 1rem;">
                <div style="display: flex; flex-direction: column;">
                    <strong style="font-size: 0.9375rem; color: var(--text-main);">${d.nombre}</strong>
                </div>
            </td>
            <td style="padding: 1rem;">
                <div style="display: flex; align-items: center; gap: 0.5rem; color: var(--text-muted); font-size: 0.875rem;">
                    <i data-lucide="phone" style="width: 14px; height: 14px;"></i>
                    ${d.contacto || 'Sin contacto'}
                </div>
            </td>
            <td style="padding: 1rem;">
                <div style="display: flex; gap: 0.5rem;">
                    <button class="button button--secondary btn-sm btn-edit-dept" data-id="${d.id}" data-obj='${JSON.stringify(d)}' title="Editar" style="padding: 0.5rem;">
                        <i data-lucide="edit-2" style="width: 16px; height: 16px;"></i>
                    </button>
                    <button class="button button--danger btn-sm btn-delete-dept" data-id="${d.id}" title="Eliminar" style="padding: 0.5rem;">
                        <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');

    // Listeners
    document.querySelectorAll('.btn-edit-dept').forEach(btn => {
        btn.addEventListener('click', () => {
            const dept = JSON.parse(btn.dataset.obj);
            cargarDatosEdicion(dept);
        });
    });

    document.querySelectorAll('.btn-delete-dept').forEach(btn => {
        btn.addEventListener('click', () => {
            if (confirm('¿Seguro que deseas eliminar este departamento?')) {
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
    document.getElementById('btn-submit-dept-text').innerHTML = '<i data-lucide="save"></i> Guardar Cambios';
    document.getElementById('new-dept-name').focus();
}

export async function guardarDepartamento() {
    if (!currentMuniIdForDepts) return;

    const nombre = document.getElementById('new-dept-name').value;
    const contacto = document.getElementById('new-dept-contact').value;

    if (!nombre) return mostrarMensaje('El nombre es obligatorio', 'error');

    const payload = {
        municipalidad_id: currentMuniIdForDepts,
        nombre: nombre,
        contacto: contacto
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

        // Reset form state matches "New"
        editingDeptId = null;
        document.getElementById('btn-submit-dept-text').innerHTML = '<i data-lucide="plus"></i> Agregar';
        document.getElementById('form-add-dept').reset();

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
