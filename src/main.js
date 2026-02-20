import { APP_CONFIG } from './config.js';
import { AuthModule } from './modules/auth.js';
import { MapModule } from './modules/map.js';
import { MunicipalityModule } from './modules/municipalities.js';
import { ReportsModule } from './modules/reports.js';
import { ProfileModule } from './modules/profile.js';
import { UIModule } from './modules/ui.js';
import { Logger } from './utils/logger.js';
import { toggleLogsPanel, mostrarMensaje } from './utils/ui.js';

console.log(`MunicipaLink v${APP_CONFIG.VERSION} starting...`);

// Monitor de conexión
window.addEventListener('online', () => {
    Logger.info('Conexión a internet restaurada');
    mostrarMensaje('Conexión restaurada.', 'success');
});

window.addEventListener('offline', () => {
    Logger.warn('Se ha perdido la conexión a internet');
    mostrarMensaje('Sin conexión a internet. Algunas funciones no estarán disponibles.', 'error');
});

// Captura de errores globales
window.onerror = (msg, url, lineNo, columnNo, error) => {
    Logger.error('Error no manejado en ventana', {
        mensaje: msg,
        archivo: url,
        linea: lineNo,
        columna: columnNo,
        error: error
    });
    return false;
};

window.onunhandledrejection = (event) => {
    Logger.error('Promesa no manejada (rejection)', {
        reason: event.reason
    });
};

document.addEventListener('DOMContentLoaded', async () => {
    Logger.info(`Aplicación iniciando v${APP_CONFIG.VERSION}`);

    // Comprobar estado inicial de conexión
    if (!navigator.onLine) {
        mostrarMensaje('Estás trabajando sin conexión.', 'error');
    }

    try {
        // Trigger secreto para panel de logs
        const logo = document.querySelector('.header__logo');
        if (logo) {
            let clicks = 0;
            logo.addEventListener('click', () => {
                clicks++;
                if (clicks === 3) {
                    toggleLogsPanel();
                    clicks = 0;
                }
                setTimeout(() => clicks = 0, 1000);
            });
        }

        // Initialize UI first (Navigation, Icons)
        UIModule.init();

        // Initialize Core Services & Data
        await MunicipalityModule.init();

        // Initialize Auth (checks session)
        await AuthModule.init();

        // Initialize Features
        MapModule.init();
        ReportsModule.init();
        ProfileModule.init();

        // Inicializar módulo de administración (solo admin)
        import('./modules/admin.js').then(module => module.AdminModule.init());

        // Inicializar módulo municipal (solo para rol municipal)
        import('./modules/municipal.js').then(module => module.MunicipalModule.init());

        Logger.info('Todos los módulos inicializados correctamente.');

    } catch (e) {
        Logger.error('Error crítico al iniciar la aplicación', e);
        alert('Error al iniciar la aplicación. Por favor recarga.');
    }
});
