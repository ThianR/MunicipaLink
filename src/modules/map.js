import { APP_CONFIG } from '../config.js';
import { supabaseClient } from '../services/supabase.js';
import { mostrarMensaje } from '../utils/ui.js';
import { MunicipalityModule } from './municipalities.js';

let mapa = null;
let marcadorActual = null;
let ubicacionUsuario = APP_CONFIG.DEFAULT_LOCATION;

export const MapModule = {
    init: () => {
        inicializarMapa();
        detectarUbicacion(false);
        setupListeners();

        // Escuchar cambios de municipalidad para recentrar
        document.addEventListener('muni:changed', (e) => {
            if (e.detail && e.detail.id) {
                centrarEnMunicipalidad(e.detail.id);
            }
        });
    },
    getUbicacion: () => ubicacionUsuario,
    recenter: centrarEnMunicipalidad
};

function inicializarMapa() {
    if (mapa) return;
    const mapElement = document.getElementById('map');
    if (!mapElement) return;

    mapa = L.map('map').setView(ubicacionUsuario, 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapa);
    marcadorActual = L.marker(ubicacionUsuario, { draggable: true }).addTo(mapa);

    marcadorActual.on('dragend', function (evento) {
        const posicion = evento.target.getLatLng();
        ubicacionUsuario = [posicion.lat, posicion.lng];
        actualizarVisualizacionCoords();
    });
}

function actualizarVisualizacionCoords() {
    const visualizacionCoords = document.getElementById('report-coords');
    if (visualizacionCoords) {
        visualizacionCoords.textContent = `Lat: ${ubicacionUsuario[0].toFixed(5)}, Lng: ${ubicacionUsuario[1].toFixed(5)}`;
    }
}

function centrarEnMunicipalidad(muniId) {
    if (!muniId) return;
    const municipalidades = MunicipalityModule.getAll();
    const muni = municipalidades.find(m => m.id == muniId);

    if (!muni) return;

    const datosCentro = muni.centro; // Already an object if coming from Supabase JSON or string if legacy
    if (!datosCentro) return;

    try {
        let lat, lng;
        // Check if string like "POINT" or JSON object
        if (typeof datosCentro === 'object' && datosCentro.coordinates) {
            lng = datosCentro.coordinates[0];
            lat = datosCentro.coordinates[1];
        } else if (typeof datosCentro === 'string') {
            // Try parsing JSON first
            try {
                const geo = JSON.parse(datosCentro);
                lng = geo.coordinates[0];
                lat = geo.coordinates[1];
            } catch {
                // Regex fallback
                const coincidencia = datosCentro.match(/\(([^)]+)\)/);
                if (coincidencia) {
                    const partes = coincidencia[1].trim().split(/[\s,]+/);
                    lng = parseFloat(partes[0]);
                    lat = parseFloat(partes[1]);
                }
            }
        }

        if (!isNaN(lat) && !isNaN(lng)) {
            ubicacionUsuario = [lat, lng];
            if (mapa) {
                mapa.flyTo(ubicacionUsuario, 14);
                if (marcadorActual) marcadorActual.setLatLng(ubicacionUsuario);
                actualizarVisualizacionCoords();
            }
        }
    } catch (e) {
        console.error('Error al centrar:', e);
    }
}

function detectarUbicacion(forzar = false) {
    const cacheada = sessionStorage.getItem('ubicacion_usuario');
    if (cacheada && !forzar) {
        const { lat, lng } = JSON.parse(cacheada);
        ubicacionUsuario = [lat, lng];
        aplicarActualizacionUbicacion(true);
        return;
    }

    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(async (posicion) => {
            const { latitude, longitude } = posicion.coords;
            ubicacionUsuario = [latitude, longitude];
            sessionStorage.setItem('ubicacion_usuario', JSON.stringify({ lat: latitude, lng: longitude }));
            aplicarActualizacionUbicacion(false);

            try {
                // Try to find nearest municipality
                const { data, error } = await supabaseClient.rpc('obtener_municipalidad_cercana', {
                    lat: latitude, lng: longitude
                });
                if (!error && data && data.length > 0) {
                    const muniId = data[0].id;
                    MunicipalityModule.syncSelectors(muniId);
                    mostrarMensaje(`Ubicado en ${data[0].nombre}`, 'success');
                }
            } catch (err) { }
        }, () => {
            mostrarMensaje('Ubicación no disponible.', 'info');
        });
    }
}

function aplicarActualizacionUbicacion(esCacheada) {
    if (mapa) {
        mapa.flyTo(ubicacionUsuario, esCacheada ? 14 : 16);
        if (marcadorActual) marcadorActual.setLatLng(ubicacionUsuario);
        actualizarVisualizacionCoords();
    }
}

function setupListeners() {
    const btnRecenter = document.getElementById('btn-recenter');
    const btnLocate = document.getElementById('btn-locate');
    const btnRecenterMap = document.getElementById('btn-recenter-map');
    const btnLocateMap = document.getElementById('btn-locate-map');

    if (btnRecenter) btnRecenter.addEventListener('click', () => {
        // Recentrar en la municipalidad seleccionada actual
        const sel = document.getElementById('muni-selector');
        if (sel && sel.value) centrarEnMunicipalidad(sel.value);
    });

    if (btnLocate) btnLocate.addEventListener('click', () => detectarUbicacion(true));

    if (btnRecenterMap) btnRecenterMap.addEventListener('click', () => {
        const sel = document.getElementById('muni-selector');
        if (sel && sel.value) centrarEnMunicipalidad(sel.value);
    });

    if (btnLocateMap) btnLocateMap.addEventListener('click', () => detectarUbicacion(true));
}
