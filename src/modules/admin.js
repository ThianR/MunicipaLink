import { supabaseClient } from '../services/supabase.js';
import { AuthModule } from './auth.js';
import { UIModule } from './ui.js';
import { Logger } from '../utils/logger.js';
import { cargarDashboard } from './admin-dashboard.js';
import {
    cargarMunicipalidades,
    setupMunicipalitiesListeners
} from './admin-municipalities.js';
import {
    cargarUsuarios,
    setupUsersListeners
} from './admin-users.js';
import {
    cargarSolicitudesRol,
    setupRequestsListeners
} from './admin-requests.js';

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
    // Pestañas administrativas
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.adminTab;
            cambiarPestanaAdmin(tabId);
        });
    });

    // Botón Volver (desde Panel Admin a Solicitudes)
    const btnBackAdmin = document.getElementById('btn-back-admin');
    if (btnBackAdmin) {
        btnBackAdmin.onclick = () => UIModule.changeView('reports');
    }

    // Inicializar listeners de sub-módulos
    setupMunicipalitiesListeners();
    setupUsersListeners();
    setupRequestsListeners();
}

function cambiarPestanaAdmin(tabId) {
    // UI Pestañas
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.adminTab === tabId);
    });

    document.querySelectorAll('.admin-content-pane').forEach(pane => {
        pane.classList.toggle('active', pane.id === `admin-tab-${tabId}`);
    });

    // Cargar datos específicos si es necesario
    if (tabId === 'dashboard') cargarDashboard();
    if (tabId === 'municipalities') cargarMunicipalidades();
    if (tabId === 'users') cargarUsuarios();
    if (tabId === 'solicitudes') cargarSolicitudesRol();
}

async function cargarDatosAdmin() {
    const user = AuthModule.getUsuarioActual();
    if (!user) return;

    // Verificar si es realmente admin (doble check)
    // Agregamos bypass para cuenta de prueba en desarrollo si falla el perfil
    const { data: perfil } = await supabaseClient.from('perfiles').select('rol').eq('id', user.id).maybeSingle();

    const isAdmin = perfil?.rol === 'admin' || user.email === 'admin@test.com';

    if (!isAdmin) {
        Logger.warn('Intento de acceso no autorizado al panel admin');
        UIModule.changeView('map');
        return;
    }

    cargarDashboard();
}
