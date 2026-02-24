import { test } from 'node:test';
import assert from 'node:assert';
import { escapeHtml, truncateText } from '../../src/utils/helpers.js';

test('escapeHtml - Escapes special characters', () => {
    assert.strictEqual(escapeHtml('<script>alert("xss")</script>'), '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    assert.strictEqual(escapeHtml('Hello & Welcome'), 'Hello &amp; Welcome');
    assert.strictEqual(escapeHtml("John's Store"), 'John&#39;s Store');
});

test('escapeHtml - Handles empty or null input', () => {
    assert.strictEqual(escapeHtml(''), '');
    assert.strictEqual(escapeHtml(null), '');
    assert.strictEqual(escapeHtml(undefined), '');
});

test('escapeHtml - Handles non-string input', () => {
    assert.strictEqual(escapeHtml(123), '123');
    assert.strictEqual(escapeHtml(true), 'true');
});

test('truncateText - Truncates long text', () => {
    const text = 'This is a very long text that should be truncated';
    assert.strictEqual(truncateText(text, 10), 'This is a ...');
});

test('truncateText - Does not truncate short text', () => {
    const text = 'Short';
    assert.strictEqual(truncateText(text, 10), 'Short');
});

test('truncateText - Handles empty input', () => {
    assert.strictEqual(truncateText(''), '');
    assert.strictEqual(truncateText(null), '');
});
