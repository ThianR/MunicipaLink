import { test } from 'node:test';
import assert from 'node:assert';
import { parseUbicacion } from '../../src/utils/location.js';

test('parseUbicacion - Null/Undefined/Empty input', () => {
    assert.strictEqual(parseUbicacion(null), null);
    assert.strictEqual(parseUbicacion(undefined), null);
    assert.strictEqual(parseUbicacion(''), null);
});

test('parseUbicacion - GeoJSON format', () => {
    const geojson = { coordinates: [-57.63591, 25.26374] };
    const result = parseUbicacion(geojson);
    assert.deepStrictEqual(result, { lng: -57.63591, lat: 25.26374 });
});

test('parseUbicacion - WKT Point format', () => {
    const wkt = 'POINT(-57.63591 25.26374)';
    const result = parseUbicacion(wkt);
    assert.deepStrictEqual(result, { lng: -57.63591, lat: 25.26374 });
});

test('parseUbicacion - WKT Simple format', () => {
    const wkt = '(-57.63591 25.26374)';
    const result = parseUbicacion(wkt);
    assert.deepStrictEqual(result, { lng: -57.63591, lat: 25.26374 });
});

test('parseUbicacion - Hex WKB (No SRID)', () => {
    // Little Endian Hex for 1.0: 000000000000F03F
    // Little Endian Hex for 2.0: 0000000000000040
    // 0101000000 (Header No SRID) + X + Y
    const hex = '0101000000000000000000F03F0000000000000040';
    const result = parseUbicacion(hex);
    assert.deepStrictEqual(result, { lng: 1.0, lat: 2.0 });
});

test('parseUbicacion - Hex WKB (With SRID)', () => {
    // 0101000020 (Header With SRID flag) + E6100000 (SRID 4326) + X + Y
    const hex = '0101000020E6100000000000000000F03F0000000000000040';
    const result = parseUbicacion(hex);
    assert.deepStrictEqual(result, { lng: 1.0, lat: 2.0 });
});

test('parseUbicacion - Malformed inputs', () => {
    // Malformed Hex
    assert.strictEqual(parseUbicacion('0101000000ZZZZ'), null); // Invalid hex chars

    // Malformed WKT
    assert.strictEqual(parseUbicacion('POINT(INVALID)'), null);

    // Malformed GeoJSON
    assert.strictEqual(parseUbicacion({ coordinates: 'invalid' }), null);
    assert.strictEqual(parseUbicacion({ coordinates: [NaN, NaN] }), null);

    // Random string
    assert.strictEqual(parseUbicacion('Just a string'), null);
});
