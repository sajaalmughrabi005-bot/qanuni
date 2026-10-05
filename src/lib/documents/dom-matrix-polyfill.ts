/**
 * Minimal, dependency-free `DOMMatrix` polyfill for pdfjs-dist's text
 * extraction path (pdfjs-dist@5.4.296, via pdf-parse@2.4.5).
 *
 * pdfjs-dist's Node entry (pdfjs-dist/legacy/build/pdf.mjs) constructs a
 * module-level `new DOMMatrix()` at import time (`const SCALE_MATRIX = new
 * DOMMatrix();`) and normally obtains the global from @napi-rs/canvas, a
 * native addon. That addon is unnecessary for text extraction: inspecting
 * pdf-parse's PDFParse.js shows `canvasFactory`/`canvas` is only referenced
 * by getImage()/getScreenshot(), never by getText()/getInfo(). Every other
 * `new DOMMatrix(...)` call site in pdfjs-dist (pattern fills, Path2D glyph
 * paths, clip paths) likewise lives in canvas-rendering code getText() never
 * reaches. PageViewport itself (used by getText()) does its own transform
 * math with plain arrays, not DOMMatrix.
 *
 * Confirmed empirically: with @napi-rs/canvas's require() made to fail
 * (replicating Vercel's "Cannot find module '@napi-rs/canvas'" production
 * failure) and only this polyfill in place, the full extract-text test
 * suite passes and the real Arabic PDF fixture extracts byte-identical
 * output to the native-canvas-backed path — no DOMMatrix method is ever
 * invoked. This is intentionally just a constructor and settable a–f
 * properties, not a general DOMMatrix implementation.
 */
class DOMMatrixPolyfill {
  a = 1;
  b = 0;
  c = 0;
  d = 1;
  e = 0;
  f = 0;

  constructor(init?: number[]) {
    if (Array.isArray(init) && init.length >= 6) {
      [this.a, this.b, this.c, this.d, this.e, this.f] = init;
    }
  }
}

// lib.dom already declares the real, full DOMMatrix type globally; this
// polyfill intentionally implements only the subset pdfjs-dist's text
// extraction path actually touches (see module doc comment above), so the
// assignment needs an explicit cast rather than a conflicting redeclaration.
if (typeof globalThis.DOMMatrix === "undefined") {
  globalThis.DOMMatrix = DOMMatrixPolyfill as unknown as typeof DOMMatrix;
}

export {};
