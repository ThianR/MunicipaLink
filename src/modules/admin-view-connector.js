
import { UIModule } from './ui.js';

export function setupAdminConnector() {
    const btnAdminPanel = document.getElementById('btn-admin-panel');
    if (btnAdminPanel) {
        // Remover listeners anteriores para evitar duplicados si se recarga
        const newBtn = btnAdminPanel.cloneNode(true);
        btnAdminPanel.parentNode.replaceChild(newBtn, btnAdminPanel);

        newBtn.onclick = () => {
            console.log('Switching to admin view');
            UIModule.changeView('admin');
        };
        console.log('Admin connector initialized');
    } else {
        console.warn('Admin button not found');
    }
}

// Auto-run when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupAdminConnector);
} else {
    setupAdminConnector();
}
