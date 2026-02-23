import { APP_CONFIG } from '../config.js';
import { supabaseClient } from '../services/supabase.js';
import { hexToDouble } from '../utils/helpers.js';
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

        // Corregir renderizado parcial del mapa al cambiar de vista
        document.addEventListener('ui:view-changed', (e) => {
            if (e.detail.view === 'map' && mapa) {
                setTimeout(() => {
                    mapa.invalidateSize();
                }, 150);
            }
        });

        // Al entrar a la app (login o invitado), la vista del mapa aparece por primera vez.
        // Leaflet debe recalcular su tamaño porque el contenedor no tenía dimensiones durante la pantalla de login.
        const forzarInvalidate = () => {
            setTimeout(() => {
                if (mapa) {
                    mapa.invalidateSize();
                } else {
                    // Si el mapa aún no se inicializó, volver a intentar
                    inicializarMapa();
                    setTimeout(() => { if (mapa) mapa.invalidateSize(); }, 300);
                }
            }, 300);
        };
        document.addEventListener('auth:login', forzarInvalidate);
        document.addEventListener('auth:guest', forzarInvalidate);

        // Corregir renderizado al redimensionar ventana
        window.addEventListener('resize', () => {
            if (mapa) mapa.invalidateSize();
        });
    },
    getUbicacion: () => ubicacionUsuario,
    recenter: centrarEnMunicipalidad,
    invalidate: () => mapa ? mapa.invalidateSize() : null
};

function inicializarMapa() {
    if (mapa) return;
    const mapElement = document.getElementById('map');
    if (!mapElement) return;

    // Verificar si Leaflet está cargado
    if (typeof L === 'undefined') {
        setTimeout(inicializarMapa, 100);
        return;
    }

    mapa = L.map('map').setView(ubicacionUsuario, 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapa);
    marcadorActual = L.marker(ubicacionUsuario, { draggable: true }).addTo(mapa);

    marcadorActual.on('dragend', function (evento) {
        const posicion = evento.target.getLatLng();
        ubicacionUsuario = [posicion.lat, posicion.lng];
        sessionStorage.setItem('ubicacion_usuario', JSON.stringify({ lat: posicion.lat, lng: posicion.lng }));
        actualizarVisualizacionCoords();
    });

    // Forzar recálculo de dimensiones después del render inicial.
    // Es necesario porque el mapa se crea mientras el contenedor puede aún no tener
    // sus dimensiones finales calculadas por el flujo de layout del navegador.
    setTimeout(() => mapa.invalidateSize(), 200);
    setTimeout(() => mapa.invalidateSize(), 600);
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

    // Usar 'centro' (columna real en la BD)
    const datosCentro = muni.centro;
    if (!datosCentro) return;

    try {
        let lat, lng;
        // Check if string like "POINT" or JSON object
        if (typeof datosCentro === 'object' && datosCentro.coordinates) {
            lng = datosCentro.coordinates[0];
            lat = datosCentro.coordinates[1];
        } else if (typeof datosCentro === 'string') {
            // Soporte para Formato Hex (WKB/EWKB de PostGIS)
            if (datosCentro.startsWith('0101')) {
                try {
                    const hasSRID = datosCentro.substring(8, 10) === '20';
                    const offset = hasSRID ? 18 : 10;
                    lng = hexToDouble(datosCentro.substring(offset, offset + 16));
                    lat = hexToDouble(datosCentro.substring(offset + 16, offset + 32));
                } catch (err) {
                    console.error('Error parseando Hex de ubicación', err);
                }
            } else {
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
        }

        if (!isNaN(lat) && !isNaN(lng)) {
            ubicacionUsuario = [lat, lng];
            if (mapa) {
                mapa.flyTo(ubicacionUsuario, 14);
                if (marcadorActual) marcadorActual.setLatLng(ubicacionUsuario);
                sessionStorage.setItem('ubicacion_usuario', JSON.stringify({ lat: lat, lng: lng }));
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
        const muniId = MunicipalityModule.getSeleccionado();
        if (muniId) centrarEnMunicipalidad(muniId);
    });

    if (btnLocate) btnLocate.addEventListener('click', () => detectarUbicacion(true));

    if (btnRecenterMap) btnRecenterMap.addEventListener('click', () => {
        const muniId = MunicipalityModule.getSeleccionado();
        if (muniId) centrarEnMunicipalidad(muniId);
    });

    if (btnLocateMap) btnLocateMap.addEventListener('click', () => detectarUbicacion(true));
}
