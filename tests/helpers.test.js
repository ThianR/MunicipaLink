import { test } from 'node:test';
import assert from 'node:assert';
import { comprimirImagen } from '../src/utils/helpers.js';

// --- Mocks Setup ---

// Mock Blob
class MockBlob {
    constructor(content, options = {}) {
        this.content = content;
        this.type = options.type || '';
        this.size = content.length;
    }
}
global.Blob = MockBlob;

// Mock File
class MockFile extends MockBlob {
    constructor(content, name, options = {}) {
        super(content, options);
        this.name = name;
        this.lastModified = options.lastModified || Date.now();
    }
}
global.File = MockFile;

// Mock FileReader
class MockFileReader {
    constructor() {
        this.onload = null;
        this.onerror = null;
    }
    readAsDataURL(file) {
        setTimeout(() => {
            if (file.name === 'error_read.jpg') {
                if (this.onerror) this.onerror(new Error('FileReader error'));
            } else {
                if (this.onload) this.onload({ target: { result: 'data:image/jpeg;base64,mockdata' } });
            }
        }, 10);
    }
}
global.FileReader = MockFileReader;

// Mock Image
class MockImage {
    constructor() {
        this.onload = null;
        this.onerror = null;
        this.width = 2000; // Large width to trigger scaling
        this.height = 2000;
        this._src = '';
    }
    set src(val) {
        this._src = val;
        setTimeout(() => {
            if (val.includes('error_load')) {
                if (this.onerror) this.onerror(new Error('Image load error'));
            } else {
                if (this.onload) this.onload();
            }
        }, 10);
    }
    get src() { return this._src; }
}
global.Image = MockImage;

// Mock document and canvas
global.document = {
    createElement: (tag) => {
        if (tag === 'canvas') {
            return {
                width: 0,
                height: 0,
                getContext: (type) => {
                    if (type === '2d') {
                        return {
                            drawImage: (img, x, y, w, h) => {
                                // Mock drawing
                            }
                        };
                    }
                    return null;
                },
                toBlob: (callback, type, quality) => {
                    setTimeout(() => {
                        // Simulate failure for specific type/condition
                        // In the actual code, toBlob uses 'image/jpeg'.
                        // We can use a global flag or property to trigger failure if needed,
                        // but since the function hardcodes 'image/jpeg', we might need another way
                        // to trigger the failure inside toBlob.
                        // Let's use a special property on the Image mock or FileReader result if possible,
                        // but `toBlob` is on the canvas.

                        // Wait, the canvas is created inside the function. We can't easily access the instance
                        // to set a flag *before* it's used, unless we control what createElement returns based on some global state.

                        if (global.forceCanvasError) {
                            callback(null);
                        } else {
                            callback(new Blob(['compressed-content'], { type }));
                        }
                    }, 10);
                }
            };
        }
        return {};
    }
};

// --- Tests ---

test('comprimirImagen - Success path', async () => {
    global.forceCanvasError = false;
    const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });

    const compressedFile = await comprimirImagen(file);

    assert.ok(compressedFile instanceof File);
    assert.strictEqual(compressedFile.name, 'test.jpg');
    assert.strictEqual(compressedFile.type, 'image/jpeg');
    // We expect the mock to have processed it
});

test('comprimirImagen - FileReader error', async () => {
    const file = new File(['content'], 'error_read.jpg', { type: 'image/jpeg' });

    await assert.rejects(
        async () => await comprimirImagen(file),
        (err) => {
            assert.strictEqual(err.message, 'FileReader error');
            return true;
        }
    );
});

test('comprimirImagen - Image load error', async () => {
    // We need to trigger Image.onerror.
    // Our mock Image triggers onerror if src contains 'error_load'.
    // The src comes from reader.result.
    // We can't easily change reader.result from here unless we modify FileReader mock
    // to return a specific result based on input file.

    // Let's modify MockFileReader to return a special result for a specific file name.

    // Hack: Override the global FileReader mock locally or use a condition in the main mock.
    // I added logic in MockFileReader to check file.name, but for Image load error I need
    // the reader to succeed but return a result that makes Image fail.

    // Let's modify the MockFileReader above to handle a specific file for this case.
    // I'll update the MockFileReader class in a followup edit if needed, but for now
    // I will use a different file name strategy.

    // Update MockFileReader logic locally for this test context if possible?
    // No, global replacement is easier.

    const originalFileReader = global.FileReader;
    global.FileReader = class extends originalFileReader {
        readAsDataURL(file) {
             setTimeout(() => {
                if (this.onload) this.onload({ target: { result: 'error_load' } });
            }, 10);
        }
    };

    const file = new File(['content'], 'image_error.jpg', { type: 'image/jpeg' });

    await assert.rejects(
        async () => await comprimirImagen(file),
        (err) => {
            assert.strictEqual(err.message, 'Image load error');
            return true;
        }
    );

    global.FileReader = originalFileReader;
});

test('comprimirImagen - Canvas compression error (blob is null)', async () => {
    global.forceCanvasError = true;
    const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });

    await assert.rejects(
        async () => await comprimirImagen(file),
        (err) => {
            assert.strictEqual(err.message, 'Error compressing image');
            return true;
        }
    );

    global.forceCanvasError = false;
});
