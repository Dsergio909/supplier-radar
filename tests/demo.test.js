// Guards for the web demo: what the page may load and run.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const DEMO = path.join(__dirname, '..', 'demo');
const html = fs.readFileSync(path.join(DEMO, 'index.html'), 'utf8');

test('the page talks only to itself: no other origin, no inline code, WebAssembly only for the reader', () => {
  const csp = /http-equiv="Content-Security-Policy" content="([^"]+)"/.exec(html)[1];
  assert.match(csp, /default-src 'none'/);
  assert.match(csp, /script-src 'self' 'wasm-unsafe-eval';/);
  assert.match(csp, /connect-src 'self';/);
  assert.match(csp, /worker-src 'self';/);
  assert.doesNotMatch(csp, /https?:|unsafe-inline|'unsafe-eval'|\*/, 'no external origin, no inline scripts or styles');
});

test('the document reader keeps files in the browser and loads its engine from this site', () => {
  const ocr = fs.readFileSync(path.join(DEMO, 'ocr.js'), 'utf8');
  assert.doesNotMatch(ocr, /https?:\/\//, 'no remote URL: engine and Spanish model are served from demo/vendor');
  assert.match(ocr, /workerBlobURL: false/, 'the worker is a file of this site, not a blob');
  for (const f of ['tesseract/tesseract.min.js', 'tesseract/worker.min.js', 'tesseract/core/tesseract-core-lstm.wasm.js',
    'tesseract/core/tesseract-core-simd-lstm.wasm.js', 'tesseract/lang/spa.traineddata.gz', 'pdfjs/pdf.min.mjs', 'pdfjs/pdf.worker.min.mjs']) {
    assert.ok(fs.existsSync(path.join(DEMO, 'vendor', f)), f);
  }
  const notice = fs.readFileSync(path.join(DEMO, 'vendor', 'README.md'), 'utf8');
  assert.equal((notice.match(/Apache-2\.0/g) || []).length >= 4, true, 'every third-party file is listed with its license');
});

test('the demo renders text with textContent only (no HTML built from document text)', () => {
  const app = fs.readFileSync(path.join(DEMO, 'app.js'), 'utf8') + fs.readFileSync(path.join(DEMO, 'ocr.js'), 'utf8');
  assert.doesNotMatch(app, /innerHTML|outerHTML|insertAdjacentHTML|document\.write/);
});
