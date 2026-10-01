/**
 * Makes pdfjs-dist's Node "fake worker" setup avoid its dynamic
 * `import("./pdf.worker.mjs")` call, which Vercel's output-file tracer
 * cannot see (confirmed: zero matches in the route's .nft.json) and which
 * crashes production with "Setting up fake worker failed: Cannot find
 * module '.../pdf.worker.mjs'" — identical root cause to the @napi-rs/canvas
 * issue dom-matrix-polyfill.ts solves, for a different dynamically-imported
 * file.
 *
 * pdfjs-dist/legacy/build/pdf.mjs's PDFWorker class checks
 * `globalThis.pdfjsWorker?.WorkerMessageHandler` BEFORE attempting that
 * dynamic import; if present, the import is skipped entirely. Statically
 * importing the worker module here (a real import in our own source, which
 * Next's bundler/tracer can see, unlike pdfjs-dist's internal dynamic one)
 * and assigning it to globalThis.pdfjsWorker supplies that shortcut.
 */
// pdfjs-dist ships this file with no types of its own; see pdf-worker.d.ts.
import * as pdfjsWorker from "pdfjs-dist/legacy/build/pdf.worker.mjs";

declare global {
  var pdfjsWorker: { WorkerMessageHandler: unknown } | undefined;
}

if (typeof globalThis.pdfjsWorker === "undefined") {
  globalThis.pdfjsWorker = pdfjsWorker;
}

export {};
