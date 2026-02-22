
import { UIModule } from './ui.js';
import { Logger } from '../utils/logger.js';

export function setupAdminConnector() {
    const btnAdminPanel = document.getElementById('btn-admin-panel');
    if (btnAdminPanel) {
        // Remover listeners anteriores para evitar duplicados si se recarga
        const newBtn = btnAdminPanel.cloneNode(true);
        btnAdminPanel.parentNode.replaceChild(newBtn, btnAdminPanel);

        newBtn.onclick = () => {
            Logger.debug('Switching to admin view');
            UIModule.changeView('admin');
        };
        Logger.debug('Admin connector initialized');
    } else {
        Logger.warn('Admin button not found');
    }
}

// Auto-run when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupAdminConnector);
} else {
    setupAdminConnector();
}
