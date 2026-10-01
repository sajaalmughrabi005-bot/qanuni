// Tests for src/lib/documents/extract-text.ts (PDF/DOCX server-side text
// extraction for the citizen contract upload flow). Calls the real production
// function directly — nothing here is a reimplementation of the extraction
// logic, so this catches real regressions in it.
//
// Fixtures live in scripts/dev/fixtures/extract-text/ and are small
// (real, Word-generated PDFs/DOCX files, 400 bytes to ~70KB — no huge
// binaries are committed). The one "oversized file" case is built in
// memory at test time instead of shipping an 11MB fixture.
//
// Run: node --experimental-loader ./scripts/dev/alias-loader.mjs scripts/dev/extract-text-tests.mjs
// (extract-text.ts imports a relative sibling module, which plain Node's ESM
// resolver can't follow without an explicit extension; the loader handles it
// the same way it already does for @/ aliases.)
import { readFileSync } from "fs";
import { extractTextFromFileAction } from "../../src/lib/documents/extract-text.ts";

const dir = new URL("./fixtures/extract-text/", import.meta.url);
const read = (name) => readFileSync(new URL(name, dir));

let passed = 0;
const failures = [];
async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log("  ok   ", name);
  } catch (e) {
    failures.push(name);
    console.log("  FAIL ", name, "\n        ->", e.message);
  }
}
const assert = (cond, msg) => {
  if (!cond) throw new Error(msg || "assertion failed");
};

/** Builds the same FormData shape the browser sends, from fixture bytes. */
function formDataFor(bytes, name, type) {
  const fd = new FormData();
  fd.set("file", new File([bytes], name, { type }));
  return fd;
}

console.log("Extract-text (PDF/DOCX) — src/lib/documents/extract-text.ts");

await test("valid PDF: extracts real text", async () => {
  const fd = formDataFor(read("arabic-contract.pdf"), "arabic-contract.pdf", "application/pdf");
  const res = await extractTextFromFileAction(fd);
  assert(res.status === "ok", "expected ok, got " + res.status);
  assert(res.text.length > 50, "text looks too short: " + res.text.length);
});

await test("valid DOCX: extracts real text", async () => {
  const fd = formDataFor(
    read("arabic-contract.docx"),
    "arabic-contract.docx",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  );
  const res = await extractTextFromFileAction(fd);
  assert(res.status === "ok", "expected ok, got " + res.status);
  assert(res.text.length > 50, "text looks too short: " + res.text.length);
});

await test("Arabic text survives PDF extraction intact (not corrupted, not reordered, not empty)", async () => {
  const fd = formDataFor(read("arabic-contract.pdf"), "arabic-contract.pdf", "application/pdf");
  const res = await extractTextFromFileAction(fd);
  assert(res.status === "ok", "expected ok, got " + res.status);
  assert(res.text.includes("عقد إيجار سكني"), "title phrase missing/garbled: " + JSON.stringify(res.text.slice(0, 120)));
  assert(res.text.includes("المؤجر: خالد أحمد الزعبي"), "landlord clause missing/garbled");
  // pdf-parse sometimes separates a Latin-script number embedded in an RTL run
  // with a tab instead of a space (a PDF text-positioning artifact, not data
  // loss) — tolerate either whitespace character here.
  assert(/300\s+دينار/.test(res.text), "amount clause missing/garbled: " + JSON.stringify(res.text.slice(0, 200)));
  // Order check: the title must still come before the landlord clause, and that
  // before the rent clause — catches accidental reordering, not just presence.
  const iTitle = res.text.indexOf("عقد إيجار سكني");
  const iLandlord = res.text.indexOf("المؤجر");
  const iRent = res.text.search(/300\s+دينار/);
  assert(iTitle < iLandlord && iLandlord < iRent, "clause order looks scrambled");
});

await test("KNOWN LIMITATION: pdf-parse can swap glyph order inside a Lam-Alef ligature (PDF only, not DOCX)", async () => {
  // Documented, not silently fixed: the source PDF (Word's own PDF export)
  // spells the word "الأجرة" (ا-ل-أ) correctly, but this specific PDF/library
  // combination extracts it as "األجرة" (ا-أ-ل — the Lam and Alef-with-hamza
  // swapped) inside one otherwise-correct sentence. It is isolated to this one
  // ligature, not a general text-garbling problem: confirmed by the previous
  // test that everything else in the same sentence/document is intact and in
  // order, and by the DOCX test below extracting the identical sentence
  // perfectly via mammoth. This is a real, narrow accuracy gap worth knowing
  // about before relying on PDF-extracted Arabic verbatim — flagging it here
  // rather than silently passing keeps it visible instead of hidden.
  const pdfFd = formDataFor(read("arabic-contract.pdf"), "arabic-contract.pdf", "application/pdf");
  const pdfRes = await extractTextFromFileAction(pdfFd);
  assert(pdfRes.status === "ok", "expected ok, got " + pdfRes.status);
  const pdfHasCorrectSpelling = pdfRes.text.includes("الأجرة");
  console.log(
    "        note: PDF spelling of الأجرة is currently",
    pdfHasCorrectSpelling ? "correct" : "scrambled (known limitation, see comment above)"
  );

  const docxFd = formDataFor(
    read("arabic-contract.docx"),
    "arabic-contract.docx",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  );
  const docxRes = await extractTextFromFileAction(docxFd);
  assert(docxRes.status === "ok", "expected ok, got " + docxRes.status);
  assert(docxRes.text.includes("الأجرة"), "DOCX (mammoth) should extract this word correctly — if this now fails, DOCX extraction has regressed");
});

await test("Arabic text survives DOCX extraction intact", async () => {
  const fd = formDataFor(
    read("arabic-contract.docx"),
    "arabic-contract.docx",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  );
  const res = await extractTextFromFileAction(fd);
  assert(res.status === "ok", "expected ok, got " + res.status);
  assert(res.text.includes("عقد إيجار سكني"), "title phrase missing/garbled");
  assert(res.text.includes("المؤجر: خالد أحمد الزعبي"), "landlord clause missing/garbled");
});

await test("empty DOCX is reported as empty, not as a false success", async () => {
  const fd = formDataFor(
    read("empty.docx"),
    "empty.docx",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  );
  const res = await extractTextFromFileAction(fd);
  assert(res.status === "empty", "expected empty, got " + res.status);
  assert(res.reasonAr && res.reasonEn, "missing bilingual reason");
});

await test("image-only PDF (no text layer) is reported as such, not as extracted content", async () => {
  const fd = formDataFor(read("image-only.pdf"), "image-only.pdf", "application/pdf");
  const res = await extractTextFromFileAction(fd);
  // Regression check: pdf-parse inserts its own "-- 1 of 1 --" placeholder text
  // for pages with nothing readable; a naive emptiness check would call this "ok".
  assert(res.status === "no_text_layer", "expected no_text_layer, got " + res.status + (res.text ? ` (text: ${JSON.stringify(res.text)})` : ""));
  assert(/ocr|سكانر|scanned/i.test(res.reasonAr + res.reasonEn), "message should mention scanned/OCR");
});

await test("corrupted PDF fails gracefully (no throw reaches the caller)", async () => {
  const fd = formDataFor(read("corrupted.pdf"), "corrupted.pdf", "application/pdf");
  const res = await extractTextFromFileAction(fd);
  assert(res.status === "extraction_failed", "expected extraction_failed, got " + res.status);
});

await test("corrupted DOCX fails gracefully (no throw reaches the caller)", async () => {
  const fd = formDataFor(
    read("corrupted.docx"),
    "corrupted.docx",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  );
  const res = await extractTextFromFileAction(fd);
  assert(res.status === "extraction_failed", "expected extraction_failed, got " + res.status);
});

await test("unsupported file type is rejected", async () => {
  const fd = formDataFor(read("unsupported.png"), "unsupported.png", "image/png");
  const res = await extractTextFromFileAction(fd);
  assert(res.status === "unsupported_type", "expected unsupported_type, got " + res.status);
});

await test("unsupported extension is rejected even with a PDF-like MIME type", async () => {
  // Extension is what the app gates on (matches the client-side check) — a
  // relabeled MIME type on the wrong extension must not slip through.
  const fd = formDataFor(read("unsupported.png"), "not-really-a.exe", "application/pdf");
  const res = await extractTextFromFileAction(fd);
  assert(res.status === "unsupported_type", "expected unsupported_type, got " + res.status);
});

await test("oversized file is rejected before any parsing is attempted", async () => {
  // Built in memory — no 11MB fixture is committed to the repo.
  const big = new Uint8Array(11 * 1024 * 1024);
  const fd = formDataFor(big, "huge.pdf", "application/pdf");
  const res = await extractTextFromFileAction(fd);
  assert(res.status === "too_large", "expected too_large, got " + res.status);
});

await test("missing file field is rejected, not thrown", async () => {
  const fd = new FormData();
  const res = await extractTextFromFileAction(fd);
  assert(res.status === "unsupported_type", "expected unsupported_type, got " + res.status);
});

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  console.log("Failures:\n - " + failures.join("\n - "));
  process.exit(1);
}
process.exit(0);
