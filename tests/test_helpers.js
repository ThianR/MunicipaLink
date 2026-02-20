import assert from 'assert';
import { normalizeString } from '../src/utils/helpers.js';

console.log('Testing normalizeString...');

try {
    // Test 1: Basic string
    assert.strictEqual(normalizeString('Hello'), 'hello');
    console.log('✓ Basic string passed');

    // Test 2: Uppercase
    assert.strictEqual(normalizeString('WORLD'), 'world');
    console.log('✓ Uppercase passed');

    // Test 3: Accents
    assert.strictEqual(normalizeString('Áéíóúñ'), 'aeioun');
    console.log('✓ Accents passed');

    // Test 4: Mixed case and accents
    assert.strictEqual(normalizeString('Müñicipálidád'), 'municipalidad');
    console.log('✓ Mixed case and accents passed');

    // Test 5: Empty string
    assert.strictEqual(normalizeString(''), '');
    console.log('✓ Empty string passed');

    // Test 6: Null
    assert.strictEqual(normalizeString(null), '');
    console.log('✓ Null passed');

    // Test 7: Undefined
    assert.strictEqual(normalizeString(undefined), '');
    console.log('✓ Undefined passed');

    console.log('All tests passed!');
} catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
}
