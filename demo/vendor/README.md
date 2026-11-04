# Third-party files for the demo's document reader

Loaded only when someone uses «Leer un documento». Served from this site (no CDN), so the page's
Content-Security-Policy stays `'self'` (plus `'wasm-unsafe-eval'` for WebAssembly).

| File | Project | Version | License |
|---|---|---|---|
| `tesseract/tesseract.min.js`, `tesseract/worker.min.js` | [Tesseract.js](https://github.com/naptha/tesseract.js) | 5.1.1 | Apache-2.0 |
| `tesseract/core/*.wasm.js` | [tesseract.js-core](https://github.com/naptha/tesseract.js-core) (Tesseract OCR compiled to WebAssembly) | 5.1.1 | Apache-2.0 |
| `tesseract/lang/spa.traineddata.gz` | [tessdata_fast](https://github.com/tesseract-ocr/tessdata_fast), Spanish | main | Apache-2.0 |
| `pdfjs/pdf.min.mjs`, `pdfjs/pdf.worker.min.mjs` | [PDF.js](https://github.com/mozilla/pdf.js) | 4.10.38 | Apache-2.0 |

The fast Spanish model was chosen after measuring it: on the project's two test sets (64 clean,
scanned and photographed fictional documents) it read as well as the larger one (8 MB) and twice as fast.
