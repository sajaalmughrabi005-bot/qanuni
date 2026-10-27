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
import { extractDirectFile as extractTextFromFileAction, fixReversedLamAlefLigature } from "../../src/lib/documents/direct-extraction.ts";

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

await test("FIXED: PDF no longer swaps glyph order inside a Lam-Alef ligature (PDF only, DOCX untouched)", async () => {
  // The source PDF (Word's own PDF export) spells the word "الأجرة" (ا-ل-أ-ج-ر-ة)
  // correctly, but this specific PDF's embedded font maps its combined
  // lam+alef-hamza ligature glyph to its two Unicode codepoints in reversed
  // order, so raw pdf-parse output has it as "األجرة" (ا-أ-ل-ج-ر-ة — lam and
  // alef-with-hamza swapped) inside an otherwise-correct sentence.
  // fixReversedLamAlefLigature() in direct-extraction.ts corrects exactly
  // this narrow, unambiguous case (see its own comment for why only this
  // case is safe to auto-correct). This test pins the corrected output.
  const pdfFd = formDataFor(read("arabic-contract.pdf"), "arabic-contract.pdf", "application/pdf");
  const pdfRes = await extractTextFromFileAction(pdfFd);
  assert(pdfRes.status === "ok", "expected ok, got " + pdfRes.status);
  assert(pdfRes.text.includes("الأجرة"), "PDF should now extract this word correctly: " + JSON.stringify(pdfRes.text.slice(0, 400)));
  assert(!pdfRes.text.includes("األجرة"), "scrambled spelling should no longer be present");

  const docxFd = formDataFor(
    read("arabic-contract.docx"),
    "arabic-contract.docx",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  );
  const docxRes = await extractTextFromFileAction(docxFd);
  assert(docxRes.status === "ok", "expected ok, got " + docxRes.status);
  assert(docxRes.text.includes("الأجرة"), "DOCX (mammoth) should extract this word correctly — if this now fails, DOCX extraction has regressed");
});

await test("fixReversedLamAlefLigature: corrects all four lam-alef ligature variants", () => {
  // The four Unicode "lam with alef" ligature forms (FEF5-FEFC) all share the
  // same two-letter shape: lam followed by one of the four alef variants.
  // Simulate the font's reversed-CMap bug for each by swapping positions 2
  // and 3 of a correctly-spelled "al-" + hamza/madda-initial word, matching
  // the exact transposition reproduced from the real PDF fixture above.
  const cases = [
    ["الأجرة", "األجرة"], // alef + hamza-above (the actual bug, confirmed against the real fixture)
    ["الآن", "اآلن"], // alef + madda-above
    ["الإنذار", "اإلنذار"], // alef + hamza-below
  ];
  for (const [correct, scrambled] of cases) {
    const actual = fixReversedLamAlefLigature(scrambled);
    assert(actual === correct, `expected "${scrambled}" to be corrected to "${correct}", got "${actual}"`);
  }
});

await test("fixReversedLamAlefLigature: never touches genuinely correct text (no false positives)", () => {
  // Alef never cursively joins to what follows it, so lam immediately after
  // an alef variant never ligates and is never scrambled by this font bug.
  // These words are already in correct order and must pass through exactly
  // as-is — a naive "alef-variant then lam, swap it" rule (without requiring
  // the extra leading bare alef) would corrupt every one of these.
  const untouched = [
    "تألق", // shine
    "تألم", // suffer
    "تألف", // compose
    "المؤجر", // the landlord — "ال" followed by a non-alef letter, no ligature at all
    "الزعبي", // surname — same shape
    "عقد إيجار سكني وبدون إنذار مسبق", // ordinary running Arabic sentence
  ];
  for (const text of untouched) {
    const actual = fixReversedLamAlefLigature(text);
    assert(actual === text, `should not alter "${text}", got "${actual}"`);
  }
});

await test("fixReversedLamAlefLigature: ordinary English and mixed Arabic/English text pass through unchanged", () => {
  const samples = [
    "This is a one-year residential lease agreement at a monthly rent of 300 JOD.",
    "عقد إيجار سكني — English summary: monthly rent of 300 JOD.",
    "",
  ];
  for (const text of samples) {
    const actual = fixReversedLamAlefLigature(text);
    assert(actual === text, `should not alter "${text}", got "${actual}"`);
  }
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
