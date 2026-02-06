import { APP_CONFIG } from './config.js';
import { AuthModule } from './modules/auth.js';
import { MapModule } from './modules/map.js';
import { MunicipalityModule } from './modules/municipalities.js';
import { ReportsModule } from './modules/reports.js';
import { ProfileModule } from './modules/profile.js';
import { UIModule } from './modules/ui.js';
import { Logger } from './utils/logger.js';
import { toggleLogsPanel } from './utils/ui.js';

console.log(`MunicipaLink v${APP_CONFIG.VERSION} starting...`);

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

    try {
        // Trigger secreto para panel de logs
        const logo = document.querySelector('.logo');
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

        Logger.info('Todos los módulos inicializados correctamente.');

    } catch (e) {
        Logger.error('Error crítico al iniciar la aplicación', e);
        alert('Error al iniciar la aplicación. Por favor recarga.');
    }
});
