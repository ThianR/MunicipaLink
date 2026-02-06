import { supabaseClient } from '../services/supabase.js';
import { DOM } from '../utils/ui.js';
import { Logger } from '../utils/logger.js';

let municipalidades = [];

export const MunicipalityModule = {
    init: async () => {
        await cargarMunicipalidades();
        setupListeners();
    },
    getAll: () => municipalidades,
    syncSelectors: syncMuniSelectors,
    getSeleccionado: () => {
        const sel = document.getElementById('muni-selector') ||
            document.getElementById('muni-selector-mobile') ||
            document.getElementById('muni-selector-map') ||
            document.getElementById('muni-selector-reports');
        return sel ? sel.value : '';
    }
};

async function cargarMunicipalidades() {
    try {
        const { data, error } = await supabaseClient.from('municipalidades').select('*').order('nombre');
        if (error) throw error;
        municipalidades = data;
        poblarSelectorMunicipalidad();
    } catch (err) {
        Logger.error('Error al cargar municipalidades', err);
    }
}

function poblarSelectorMunicipalidad() {
    const selectors = [
        document.getElementById('muni-selector'),
        document.getElementById('muni-selector-mobile'),
        document.getElementById('muni-selector-map'),
        document.getElementById('muni-selector-reports')
    ];

    selectors.forEach(sel => {
        if (!sel) return;
        const currentVal = sel.value; // Preserve value if exists?
        sel.innerHTML = '<option value="">Seleccionar Municipalidad</option>';
        municipalidades.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m.id;
            opt.textContent = m.nombre;
            if (m.centro) {
                const valorCentro = typeof m.centro === 'string' ? m.centro : JSON.stringify(m.centro);
                opt.setAttribute('data-centro', valorCentro);
            }
            sel.appendChild(opt);
        });
        if (currentVal) sel.value = currentVal;
    });
}

function syncMuniSelectors(val) {
    const selDesktop = document.getElementById('muni-selector');
    const selMobile = document.getElementById('muni-selector-mobile');
    const selMap = document.getElementById('muni-selector-map');
    const selReports = document.getElementById('muni-selector-reports');

    if (selDesktop) selDesktop.value = val;
    if (selMobile) selMobile.value = val;
    if (selMap) selMap.value = val;
    if (selReports) selReports.value = val;

    localStorage.removeItem('usuario_filtrado_id');

    // Trigger Update event for Reports module to listen
    document.dispatchEvent(new CustomEvent('muni:changed', { detail: { id: val } }));
}

function setupListeners() {
    const selectors = [
        document.getElementById('muni-selector'),
        document.getElementById('muni-selector-mobile'),
        document.getElementById('muni-selector-map'),
        document.getElementById('muni-selector-reports')
    ];

    selectors.forEach(sel => {
        if (sel) {
            sel.addEventListener('change', (e) => {
                syncMuniSelectors(e.target.value);
            });
        }
    });

    // We removed 'centrarEnMunicipalidad' logic from here because it belongs to Map module.
    // Map module will listen to 'muni:changed'.
}
