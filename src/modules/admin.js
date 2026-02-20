import { supabaseClient } from '../services/supabase.js';
import { AuthModule } from './auth.js';
import { UIModule } from './ui.js';
import { mostrarMensaje } from '../utils/ui.js';
import { normalizeString } from '../utils/helpers.js';
import { Logger } from '../utils/logger.js';

let allMunicipalities = [];
let allUsers = [];
let currentEditingUserId = null;
let currentResetUserId = null;
let currentResetUserEmail = null;

export const AdminModule = {
    init: () => {
        Logger.info('Inicializando Admin Module...');
        setupListeners();

        // Cargar datos si ya estamos en la vista admin (ej: reload)
        if (UIModule.getCurrentView() === 'admin') {
            cargarDatosAdmin();
        }

        // Escuchar cambios de vista
        document.addEventListener('ui:view-changed', (e) => {
            if (e.detail.view === 'admin') {
                cargarDatosAdmin();
            }
        });
    }
};

function setupListeners() {
    // Pestanas administrativas
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.adminTab;
            cambiarPestanaAdmin(tabId);
        });
    });

    // Botnn Volver (desde Panel Admin a Solicitudes)
    const btnBackAdmin = document.getElementById('btn-back-admin');
    if (btnBackAdmin) {
        btnBackAdmin.onclick = () => UIModule.changeView('reports');
    }

    // Buscador de Municipalidades
    const searchMuniInput = document.getElementById('admin-muni-search-input');
    if (searchMuniInput) {
        searchMuniInput.oninput = (e) => filtrarMunicipalidades(e.target.value);
    }

    // Botnn Nueva Muni
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

    // Buscador de Solicitudes
    const searchSolicitudesInput = document.getElementById('admin-solicitudes-search-input');
    if (searchSolicitudesInput) {
        searchSolicitudesInput.oninput = (e) => filtrarSolicitudes(e.target.value);
    }
}

function cambiarPestanaAdmin(tabId) {
    // UI Pestanas
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.adminTab === tabId);
    });

    document.querySelectorAll('.admin-content-pane').forEach(pane => {
        pane.classList.toggle('active', pane.id === `admin-tab-${tabId}`);
    });

    // Cargar datos especnficos si es necesario
    if (tabId === 'dashboard') cargarDashboard();
    if (tabId === 'municipalities') cargarMunicipalidades();
    if (tabId === 'users') cargarUsuarios();
    if (tabId === 'solicitudes') cargarSolicitudesRol();
}

async function cargarDatosAdmin() {
    const user = AuthModule.getUsuarioActual();
    if (!user) return;

    // Verificar si es realmente admin (doble check)
    const { data: perfil } = await supabaseClient.from('perfiles').select('rol').eq('id', user.id).single();
    if (!perfil || perfil.rol !== 'admin') {
        Logger.warn('Intento de acceso no autorizado al panel admin');
        UIModule.changeView('map');
        return;
    }

    cargarDashboard();
}

async function cargarDashboard() {
    try {
        // Obtenemos conteos globales
        // Usamos queries simples para el dashboard
        const [usersCount, reportsCount, munisCount] = await Promise.all([
            supabaseClient.from('perfiles').select('*', { count: 'exact', head: true }),
            supabaseClient.from('reportes').select('*', { count: 'exact', head: true }).neq('estado', 'Resuelto'),
            supabaseClient.from('municipalidades').select('*', { count: 'exact', head: true })
        ]);

        document.getElementById('admin-total-users').textContent = usersCount.count || 0;
        document.getElementById('admin-active-reports').textContent = reportsCount.count || 0;
        document.getElementById('admin-total-munis').textContent = munisCount.count || 0;

        // Actualizar contador en la pestana de solicitudes
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
            if (btn) btn.innerHTML += ` <span class="tab-badge" style="background: var(--danger); color: white; border-radius: 50%; width: 18px; height: 18px; font-size: 10px; display: inline-flex; align-items: center; justify-content: center; margin-left: 5px;">${pendingCount}</span>`;
        }

    } catch (err) {
        Logger.error('Error al cargar dashboard admin:', err);
    }
}

async function cargarMunicipalidades() {
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

function filtrarMunicipalidades(query) {
    const term = normalizeString(query);

    const filtered = allMunicipalities.filter(m =>
        normalizeString(m.nombre).includes(term) ||
        (m.centro && normalizeString(JSON.stringify(m.centro)).includes(term))
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

    // Listeners para botones dinnmicos
    document.querySelectorAll('.btn-manage-depts').forEach(btn => {
        btn.onclick = () => abrirModalDepartamentos(btn.dataset.id, btn.dataset.name);
    });

    document.querySelectorAll('.btn-edit-muni').forEach(btn => {
        btn.onclick = () => {
            const muni = JSON.parse(btn.dataset.obj);
            abrirModalMuni(muni);
        };
    });

    if (window.lucide) lucide.createIcons();
}

let currentEditingMuniId = null;
let muniMap = null;
let muniMarker = null;

function abrirModalMuni(muni = null) {
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
    if (window.lucide) lucide.createIcons();

    // Mostrar loader hasta que el mapa estn listo
    const loader = document.getElementById('muni-map-loader');
    if (loader) loader.style.display = 'block';

    // Inicializar Mapa con mayor rapidez
    // Usamos un pequeno delay para asegurar que el DOM del modal estn estable, 
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
            fadeAnimation: false, // Optimizacinn de rendimiento
            markerZoomAnimation: false
        }).setView([initialLat, initialLng], 13);

        // Usar CartoDB Voyager (Mns rnpido y limpio)
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: 'n OpenStreetMap n CartoDB',
            subdomains: 'abcd',
            maxZoom: 20
        }).addTo(muniMap);

        muniMap.whenReady(() => {
            const loader = document.getElementById('muni-map-loader');
            if (loader) loader.style.display = 'none';
        });
    } else {
        muniMap.setView([initialLat, initialLng], 13);
        // Quitar loader si el mapa ya existna
        const loader = document.getElementById('muni-map-loader');
        if (loader) loader.style.display = 'none';

        // Asegurar que el tamano sea correcto
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

    // Si tiene ubicacinn, poner marcador
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

async function guardarMuni() {
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

        Logger.info('Operacinn exitosa. Datos guardados:', result.data);
        mostrarMensaje(currentEditingMuniId ? 'Municipalidad actualizada' : 'Municipalidad creada', 'success');
        document.getElementById('modal-admin-municipality').classList.remove('modal--active');
        cargarMunicipalidades();

    } catch (err) {
        Logger.error('Error al guardar muni:', err);
        mostrarMensaje('Error al guardar: ' + err.message, 'error');
    }
}

// --- Gestinn de Departamentos ---

let currentMuniIdForDepts = null;
let editingDeptId = null;
let allDepartments = [];

function abrirModalDepartamentos(muniId, muniNombre) {
    currentMuniIdForDepts = muniId;
    editingDeptId = null;
    document.getElementById('modal-dept-muni-name').textContent = muniNombre;
    document.getElementById('btn-submit-dept-text').innerHTML = '<i data-lucide="plus"></i> Agregar';
    document.getElementById('modal-admin-departments').classList.add('modal--active');

    // Limpiar form
    document.getElementById('form-add-dept').reset();

    cargarDepartamentos(muniId);

    // Setup close listener
    const closeBtn = document.getElementById('btn-close-modal-dept');
    if (closeBtn) {
        closeBtn.onclick = () => document.getElementById('modal-admin-departments').classList.remove('modal--active');
    }

    const form = document.getElementById('form-add-dept');
    if (form) {
        form.onsubmit = (e) => {
            e.preventDefault();
            guardarDepartamento();
        };
    }

    // Setup search listener
    const searchInput = document.getElementById('admin-dept-search-input');
    if (searchInput) {
        searchInput.value = '';
        searchInput.oninput = (e) => {
            filtrarDepartamentos(e.target.value);
        };
    }
}

function filtrarDepartamentos(query) {
    const term = normalizeString(query);

    const filtered = allDepartments.filter(d =>
        normalizeString(d.nombre).includes(term) ||
        (d.contacto && normalizeString(d.contacto).includes(term))
    );
    renderDepartamentos(filtered);
}

async function cargarDepartamentos(muniId) {
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
            if (confirm('nSeguro que deseas eliminar este departamento?')) {
                eliminarDepartamento(btn.dataset.id);
            }
        });
    });

    if (window.lucide) lucide.createIcons();
}

function cargarDatosEdicion(dept) {
    editingDeptId = dept.id;
    document.getElementById('new-dept-name').value = dept.nombre;
    document.getElementById('new-dept-contact').value = dept.contacto || '';
    document.getElementById('btn-submit-dept-text').innerHTML = '<i data-lucide="save"></i> Guardar Cambios';
    document.getElementById('new-dept-name').focus();
}

async function guardarDepartamento() {
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
// ============================================
// GESTInN DE USUARIOS
// ============================================

async function cargarUsuarios() {
    const listEl = document.getElementById('admin-users-list');
    if (!listEl) return;

    listEl.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-muted);">Cargando...</td></tr>';

    try {
        const { data, error } = await supabaseClient
            .from('v_admin_usuarios')
            .select('*')
            .order('creado_en', { ascending: false });

        if (error) throw error;
        allUsers = data;

        // Actualizar estadnsticas
        const stats = {
            total: data.length,
            admin: data.filter(u => u.rol === 'admin').length,
            municipal: data.filter(u => u.rol === 'municipal').length,
            ciudadano: data.filter(u => u.rol === 'ciudadano').length
        };

        document.getElementById('stat-total-users').textContent = stats.total;
        document.getElementById('stat-admin-users').textContent = stats.admin;
        document.getElementById('stat-municipal-users').textContent = stats.municipal;
        document.getElementById('stat-citizen-users').textContent = stats.ciudadano;

        renderUsuarios(data);
    } catch (err) {
        Logger.error('Error al cargar usuarios:', err);
        listEl.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-muted);">Error al cargar datos.</td></tr>';
    }
}

function filtrarUsuarios(query) {
    const term = normalizeString(query);

    const filtered = allUsers.filter(u =>
        normalizeString(u.nombre_completo).includes(term) ||
        normalizeString(u.alias).includes(term) ||
        normalizeString(u.id).includes(term)
    );
    renderUsuarios(filtered);
}

function renderUsuarios(data) {
    const listEl = document.getElementById('admin-users-list');
    if (!listEl) return;

    if (data.length === 0) {
        listEl.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-muted);">No hay usuarios que coincidan.</td></tr>';
        return;
    }

    listEl.innerHTML = data.map(u => {
        const roleColor = u.rol === 'admin' ? '#dc2626' : u.rol === 'municipal' ? '#f59e0b' : '#3b82f6';
        const fecha = new Date(u.creado_en).toLocaleDateString('es-PY');
        const initial = (u.alias || u.nombre_completo || 'U')[0].toUpperCase();
        const estatusClase = u.activo === false ? 'status-danger' : 'status-active';
        const estatusTexto = u.activo === false ? 'Baneado' : 'Activo';

        return `
            <tr>
                <td>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <div style="width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 0.8125rem; flex-shrink: 0;">
                            ${initial}
                        </div>
                        <div style="min-width: 0;">
                            <strong style="display: block; font-size: 0.875rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${u.alias || 'Sin alias'}</strong>
                            <small class="text-muted desktop-only" style="font-size: 0.75rem;">${u.nombre_completo || 'Sin nombre'}</small>
                        </div>
                    </div>
                </td>
                <td class="desktop-only"><small style="font-family: monospace; font-size: 0.75rem; color: var(--text-muted);">${u.id.substring(0, 8)}...</small></td>
                <td>
                    <span style="display: inline-block; padding: 0.25rem 0.625rem; border-radius: 10px; font-size: 0.6875rem; font-weight: 600; background: ${roleColor}15; color: ${roleColor};">${u.rol}</span>
                    <br>
                    <span class="status-badge-premium ${estatusClase}" style="margin-top: 4px; font-size: 10px;">${estatusTexto}</span>
                </td>
                <td>
                    <span class="desktop-only">${u.nivel || 'Vecino Novato'} </span>
                    <small style="color: var(--text-muted);">${u.puntos || 0} XP</small>
                </td>
                <td class="desktop-only" style="font-size: 0.8125rem; color: var(--text-muted);">${fecha}</td>
                <td>
                    <div style="display: flex; gap: 0.5rem;">
                        <button class="button button--secondary btn-sm btn-edit-user" data-id="${u.id}" data-obj='${JSON.stringify(u).replace(/'/g, "&#39;")}' title="Editar" style="width: auto;">
                            <i data-lucide="edit-2" style="width: 14px; height: 14px;"></i>
                        </button>
                        <button class="button btn-sm btn-reset-password" data-id="${u.id}" data-email="${u.email}" data-alias="${u.alias || u.nombre_completo}" title="Resetear Contrasena" style="background: #fbbf24; color: white; width: auto;">
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

    // Listeners dinnmicos
    document.querySelectorAll('.btn-edit-user').forEach(btn => {
        btn.onclick = () => {
            const user = JSON.parse(btn.dataset.obj.replace(/&#39;/g, "'"));
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

    if (window.lucide) lucide.createIcons();
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
    if (window.lucide) lucide.createIcons();
}

async function guardarUsuario() {
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
    const confirmacion = activo ? 'nDeseas reactivar a este usuario?' : 'nEstns seguro de que deseas banear a este usuario?';
    if (!confirm(confirmacion)) return;

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

async function enviarResetPassword() {
    if (!currentResetUserEmail || currentResetUserEmail === 'null' || currentResetUserEmail === 'undefined' || currentResetUserEmail.trim() === '') {
        mostrarMensaje('El usuario no tiene un email registrado. Debes editar su perfil y asignar uno primero.', 'error');
        return;
    }

    try {
        const { error } = await supabaseClient.auth.resetPasswordForEmail(currentResetUserEmail, {
            redirectTo: window.location.origin
        });

        mostrarMensaje('Email de recuperacinn enviado correctamente', 'success');
        document.getElementById('modal-reset-password').classList.remove('modal--active');
    } catch (err) {
        Logger.error('Error al enviar reset:', err);
        mostrarMensaje('Error: ' + err.message, 'error');
    }
}

// --- Gestión de Solicitudes de Rol ---
let allSolicitudes = [];

async function cargarSolicitudesRol() {
    const listEl = document.getElementById('admin-solicitudes-list');
    if (!listEl) return;

    listEl.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 2rem; color: var(--text-muted);">Cargando solicitudes...</td></tr>';

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
        listEl.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 2rem; color: var(--text-muted);">Error al cargar datos.</td></tr>';
    }
}

function filtrarSolicitudes(query) {
    const term = normalizeString(query);

    const filtered = allSolicitudes.filter(s =>
        normalizeString(s.perfiles?.alias).includes(term) ||
        normalizeString(s.perfiles?.nombre_completo).includes(term) ||
        normalizeString(s.municipalidades?.nombre).includes(term)
    );
    renderSolicitudes(filtered);
}

function renderSolicitudes(data) {
    const listEl = document.getElementById('admin-solicitudes-list');
    if (!listEl) return;

    if (data.length === 0) {
        listEl.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 2rem; color: var(--text-muted);">No hay solicitudes registradas.</td></tr>';
        return;
    }

    const estadoLabel = { aprobado: 'Aprobado', rechazado: 'Rechazado', pendiente: 'Pendiente', en_revision: 'En Revisión' };
    const estadoIcon = { aprobado: 'check-circle', rechazado: 'x-circle', pendiente: 'clock', en_revision: 'search' };

    listEl.innerHTML = data.map(s => {
        const estadoKey = s.estado || 'pendiente';
        const badgeClass = estadoKey === 'aprobado' ? 'status-active' : estadoKey === 'rechazado' ? 'status-danger' : 'status-pending';
        return `
            <tr>
                <td>
                    <div style="display:flex; align-items:center; gap:0.5rem;">
                        <div style="width:32px; height:32px; border-radius:50%; background:var(--primary-light,#ecfdf5); display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                            <i data-lucide="user" style="width:16px;height:16px;color:var(--primary);"></i>
                        </div>
                        <div>
                            <strong>${s.perfiles?.alias || 'S/A'}</strong><br>
                            <small class="text-muted">${s.perfiles?.nombre_completo || ''}</small>
                        </div>
                    </div>
                </td>
                <td>
                    <div style="display:flex; align-items:center; gap:0.4rem;">
                        <i data-lucide="building-2" style="width:14px;height:14px;color:var(--text-muted);"></i>
                        ${s.municipalidades?.nombre || '-'}
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

    if (window.lucide) lucide.createIcons();

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
        ? `<span>${comentario}</span>`
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
        document.getElementById('btn-modal-approve').onclick = () => {
            if (confirm('¿Aprobar esta solicitud?')) {
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
                alert('Debes ingresar un motivo para rechazar la solicitud.');
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

// Cerrar modal
document.getElementById('btn-close-role-details')?.addEventListener('click', () => {
    document.getElementById('modal-role-request-details').classList.remove('modal--active');
});

// Función para gestionar la aprobación/rechazo de solicitudes
async function gestionarSolicitudRol(id, estado, comentarios = '') {
    console.log('Ejecutando gestionarSolicitudRol:', { id, estado });

    try {
        const user = AuthModule.getUsuarioActual();
        if (!user) {
            mostrarMensaje('Sesión no válida.', 'error');
            return;
        }

        const confirmacion = estado === 'aprobado' ?
            '¿Estás seguro de aprobar esta solicitud de rol municipal?' :
            '¿Estás seguro de rechazar esta solicitud?';

        if (!confirm(confirmacion)) return;

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
        if (typeof cargarDashboard === 'function') cargarDashboard();

    } catch (err) {
        Logger.error('Error en gestionarSolicitudRol:', err);
        mostrarMensaje('Error: ' + err.message, 'error');
    }
}

// Exponer globalmente como respaldo para los onclick del HTML generado
window.gestionarSolicitudRol = gestionarSolicitudRol;
