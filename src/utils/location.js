/**
 * Parsea la ubicación (Hex PostGIS o GeoJSON) para obtener Lat/Lng.
 * @param {string|object} ubicacion
 * @returns {{lat: number, lng: number} | null}
 */
export function parseUbicacion(ubicacion) {
    if (!ubicacion) return null;
    let lat, lng;

    try {
        if (typeof ubicacion === 'string') {
            // Hex WKB format de Supabase/PostGIS
            if (ubicacion.startsWith('0101')) {
                const hasSRID = ubicacion.substring(8, 10) === '20';
                const offset = hasSRID ? 18 : 10;
                const hexToDouble = (hex) => {
                    const match = hex.match(/.{1,2}/g);
                    if (!match) return NaN;
                    const bytes = new Uint8Array(match.map(byte => parseInt(byte, 16)));
                    const view = new DataView(bytes.buffer);
                    return view.getFloat64(0, true); // Little endian
                };
                lng = hexToDouble(ubicacion.substring(offset, offset + 16));
                lat = hexToDouble(ubicacion.substring(offset + 16, offset + 32));
            } else {
                // WKT format "POINT(lng lat)"
                const match = ubicacion.match(/POINT\(([^ ]+) ([^ ]+)\)/) || ubicacion.match(/\(([^ ]+) ([^ ]+)\)/);
                if (match) {
                    lng = parseFloat(match[1]);
                    lat = parseFloat(match[2]);
                }
            }
        } else if (ubicacion.coordinates && Array.isArray(ubicacion.coordinates)) {
            // GeoJSON format
            lng = ubicacion.coordinates[0];
            lat = ubicacion.coordinates[1];
        }

        if (lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng)) {
            return { lat, lng };
        }
    } catch (e) {
        console.error('Error parseando ubicación:', e);
    }
    return null;
}
