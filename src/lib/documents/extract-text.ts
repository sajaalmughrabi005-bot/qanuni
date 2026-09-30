"use server";

import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

/**
 * Server-side text extraction for citizen contract uploads. This is the only
 * new piece in the pipeline: file -> plain text. Everything downstream
 * (pastedText -> createDraftDocument -> analyzeDocumentAction -> AI) is
 * untouched and unaware this ever ran.
 *
 * Deliberately does not touch Storage or the database: the file bytes exist
 * only in memory for the duration of this call and are discarded when it
 * returns. Nothing here calls OpenAI or reads an API key.
 */

const MAX_EXTRACT_FILE_BYTES = 10 * 1024 * 1024; // 10MB — matches the limit already advertised in the upload UI
const PDF_EXT = ".pdf";
const DOCX_EXT = ".docx";

export type ExtractTextResult =
  | { status: "ok"; text: string }
  | { status: "empty"; reasonAr: string; reasonEn: string }
  | { status: "no_text_layer"; reasonAr: string; reasonEn: string }
  | { status: "unsupported_type"; reasonAr: string; reasonEn: string }
  | { status: "too_large"; reasonAr: string; reasonEn: string }
  | { status: "extraction_failed"; reasonAr: string; reasonEn: string };

const REASONS = {
  unsupported: {
    reasonAr: "نوع الملف غير مدعوم. المدعوم حالياً: TXT وPDF وWord (DOCX).",
    reasonEn: "This file type isn't supported. Currently supported: TXT, PDF, and Word (DOCX).",
  },
  tooLarge: {
    reasonAr: "الملف أكبر من الحد المسموح (10 ميغابايت).",
    reasonEn: "The file is larger than the allowed limit (10MB).",
  },
  emptyPdf: {
    reasonAr: "لم يتم العثور على أي نص في هذا الملف. تأكد أنه ليس فارغاً أو تالفاً.",
    reasonEn: "No text was found in this file. Make sure it isn't empty or corrupted.",
  },
  noTextLayerPdf: {
    reasonAr:
      "يبدو أن هذا الملف عبارة عن صورة ممسوحة ضوئياً (سكانر) ولا يحتوي على نص قابل للقراءة. دعم قراءة النصوص من الصور الممسوحة (OCR) قادم لاحقاً — يمكنك حالياً لصق نص العقد يدوياً.",
    reasonEn:
      "This looks like a scanned (image-based) PDF with no readable text layer. OCR support for scanned documents is coming later — for now, please paste the contract text manually.",
  },
  emptyDocx: {
    reasonAr: "المستند فارغ ولا يحتوي على أي نص.",
    reasonEn: "This document is empty and contains no text.",
  },
  extractionFailed: {
    reasonAr: "تعذّرت قراءة هذا الملف. قد يكون تالفاً. جرّب ملفاً آخر أو الصق النص يدوياً.",
    reasonEn: "Couldn't read this file — it may be corrupted. Try a different file, or paste the text manually.",
  },
} as const;

function extOf(fileName: string): string {
  const i = fileName.lastIndexOf(".");
  return i === -1 ? "" : fileName.slice(i).toLowerCase();
}

// pdf-parse inserts a "-- N of M --" placeholder line for pages it found no
// real text on. A scanned/image-only PDF then still has "text" (just these
// markers), so the emptiness check has to strip them first or it would treat
// a scanned document as if it had genuine, analyzable content.
const PAGE_MARKER_RE = /^--\s*\d+\s*of\s*\d+\s*--$/gm;

async function extractPdf(buffer: Buffer): Promise<ExtractTextResult> {
  let parser: PDFParse | undefined;
  try {
    parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    const text = result.text.trim();
    const meaningful = text.replace(PAGE_MARKER_RE, "").trim();
    if (result.total === 0) return { status: "empty", ...REASONS.emptyPdf };
    if (!meaningful) return { status: "no_text_layer", ...REASONS.noTextLayerPdf };
    return { status: "ok", text };
  } catch {
    return { status: "extraction_failed", ...REASONS.extractionFailed };
  } finally {
    await parser?.destroy().catch(() => {});
  }
}

async function extractDocx(buffer: Buffer): Promise<ExtractTextResult> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value.trim();
    if (!text) return { status: "empty", ...REASONS.emptyDocx };
    return { status: "ok", text };
  } catch {
    return { status: "extraction_failed", ...REASONS.extractionFailed };
  }
}

/**
 * Accepts a PDF or DOCX file via FormData (field name "file"), validates
 * type and size, extracts its text server-side, and returns plain text.
 * The caller drops the result into the exact same `pastedText` state the
 * .txt path already fills — analyzeDocumentAction never changes.
 */
export async function extractTextFromFileAction(formData: FormData): Promise<ExtractTextResult> {
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { status: "unsupported_type", ...REASONS.unsupported };
  }

  const ext = extOf(file.name);
  if (ext !== PDF_EXT && ext !== DOCX_EXT) {
    return { status: "unsupported_type", ...REASONS.unsupported };
  }
  if (file.size > MAX_EXTRACT_FILE_BYTES) {
    return { status: "too_large", ...REASONS.tooLarge };
  }
  if (file.size === 0) {
    return { status: "empty", ...(ext === PDF_EXT ? REASONS.emptyPdf : REASONS.emptyDocx) };
  }

  let buffer: Buffer;
  try {
    buffer = Buffer.from(await file.arrayBuffer());
  } catch {
    return { status: "extraction_failed", ...REASONS.extractionFailed };
  }

  return ext === PDF_EXT ? extractPdf(buffer) : extractDocx(buffer);
}
