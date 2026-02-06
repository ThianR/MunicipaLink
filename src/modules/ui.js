import { AuthModule } from './auth.js';
import { MunicipalityModule } from './municipalities.js';
import { ReportsModule } from './reports.js';
import { ProfileModule } from './profile.js';
// Debemos tener cuidado con las importaciones circulares.
// Si ReportsModule necesita UIModule, y UIModule importa ReportsModule (para cargar datos al cambiar de vista), tenemos un ciclo.
// Solución: UIModule exporta funciones de 'navegación'. La inicialización de listeners se hace en 'init' que delega a otros módulos.
// O: Usamos un Bus de Eventos.

let currentView = 'map';

export const UIModule = {
    init: () => {
        setupNavigation();
        lucide.createIcons();
    },
    changeView: cambiarVista,
    changeTab: cambiarPestana,
    changeScreen: cambiarPantalla,
    getCurrentView: () => currentView
};

function cambiarPantalla(pantallaId) {
    const screens = document.querySelectorAll('.screen');
    screens.forEach(s => {
        s.classList.remove('active'); // Legacy
        s.classList.remove('screen--active');
    });

    const targetScreen = document.getElementById(pantallaId);
    if (targetScreen) {
        targetScreen.classList.add('screen--active');
        document.dispatchEvent(new CustomEvent('ui:screen-changed', { detail: { screen: pantallaId } }));
    }
}

function cambiarVista(viewName) {
    const views = document.querySelectorAll('.view');
    views.forEach(v => {
        v.classList.remove('active'); // Legacy
        v.classList.remove('view--active');
    });

    const targetView = document.getElementById(`view-${viewName}`);
    if (targetView) {
        currentView = viewName;
        targetView.classList.add('view--active');
        targetView.classList.add('active'); // Legacy support
        targetView.scrollTop = 0;
        window.scrollTo(0, 0);

        // Notificar cambios de vista vía Evento
        document.dispatchEvent(new CustomEvent('ui:view-changed', { detail: { view: viewName } }));

        localStorage.setItem('currentView', viewName);

        // Lógica FAB Móvil
        updateFab(viewName);

        // Estado de navegación activo
        // Estado de navegación activo (Móvil y Escritorio)
        const allNavItems = document.querySelectorAll('.nav__item');
        allNavItems.forEach(item => {
            if (item.dataset.view) {
                item.classList.toggle('nav__item--active', item.dataset.view === viewName);
            }
        });

        lucide.createIcons();
    }
}

function cambiarPestana(tabName) {
    const tabs = document.querySelectorAll('.tabs__content');
    tabs.forEach(t => {
        t.classList.remove('tabs__content--active');
    });

    const targetTab = document.getElementById(`tab-${tabName}`);
    if (targetTab) {
        targetTab.classList.add('tabs__content--active');

        // Notificar módulos
        document.dispatchEvent(new CustomEvent('ui:tab-changed', { detail: { tab: tabName } }));
    }

    // Actualizar botones
    document.querySelectorAll('.tabs__button').forEach(btn => {
        btn.classList.toggle('tabs__button--active', btn.dataset.tab === tabName);
    });
}

function updateFab(viewName) {
    const fabMobile = document.getElementById('btn-open-report-mobile');
    if (fabMobile) {
        fabMobile.style.display = 'flex';
        if (viewName === 'reports') {
            fabMobile.setAttribute('data-action', 'back-to-map');
            fabMobile.innerHTML = '<i data-lucide="map"></i>';
        } else {
            fabMobile.setAttribute('data-action', 'new-report');
            fabMobile.innerHTML = '<i data-lucide="plus"></i>';
        }
    }
}

function setupNavigation() {
    // Barra lateral escritorio
    document.querySelectorAll('.sidebar .nav__item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const view = item.dataset.view;
            if (view) cambiarVista(view);
        });
    });

    // Navegación móvil
    document.querySelectorAll('.nav--mobile .nav__item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const view = item.dataset.view;
            if (view) cambiarVista(view);
        });
    });

    // Botones de pestañas
    document.querySelectorAll('.tabs__button').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            if (tab) cambiarPestana(tab);
        });
    });

    // Listener global para navegación programática
    document.addEventListener('ui:request-view', (e) => {
        const { view, userId } = e.detail;
        if (view) {
            cambiarVista(view);
            if (view === 'profile' && userId) {
                // Notificamos al ProfileModule si es necesario cargar un usuario específico
                document.dispatchEvent(new CustomEvent('profile:load-user', { detail: { userId } }));
            }
        }
    });
}
