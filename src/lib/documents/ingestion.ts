import "server-only";
import { validateFileBytes, validateFileMetadata } from "./validation";
import { extractPdf, extractDocx } from "./direct-extraction";
import { extractWithOCR } from "./ocr";
const reasons={
 unsupported_type:["نوع الملف أو نوعه المعلن غير مدعوم. استخدم PDF أو DOCX أو TXT أو JPG أو PNG أو WEBP.","Unsupported file extension or MIME type. Use PDF, DOCX, TXT, JPG, PNG or WEBP."],
 too_large:["الملف يتجاوز حدود المعالجة (10 ميغابايت للملف). قسّمه وأعد المحاولة.","The file exceeds processing limits (10 MB per file). Split it and retry."],
 empty:["الملف فارغ.","The file is empty."],
 extraction_failed:["تعذرت قراءة الملف. قد يكون تالفاً؛ جرّب نسخة أوضح أو الصق النص.","Unable to read this file. It may be corrupt; upload a clearer copy or paste text."],
 unreadable:["النص غير واضح أو غير مكتمل. ارفع نسخة أوضح أو الصق النص؛ لم يتم تخمين الكلمات.","The text is unreadable or incomplete. Upload a clearer copy or paste text; no words were guessed."],
 not_legal:["لا يبدو أن الملف يتعلق بمستند أو موضوع قانوني.","This file does not appear to concern a legal document or matter."],
 ai_unavailable:["تعذرت قراءة الصور بالذكاء الاصطناعي. حاول مجدداً أو الصق النص.","AI OCR is unavailable. Please retry or paste the text."],
} as const;
export type IngestResult={status:"ok";text:string;method:"embedded"|"ocr";metadata:{name:string;mime:string;size:number};warningAr?:string;warningEn?:string}|{status:keyof typeof reasons;reasonAr:string;reasonEn:string};
export function ingestionFailure(code:keyof typeof reasons):IngestResult {return {status:code,reasonAr:reasons[code][0],reasonEn:reasons[code][1]};}
export async function ingestFile(file:File):Promise<IngestResult> {
 try {
  const meta=validateFileMetadata(file);const bytes=Buffer.from(await file.arrayBuffer());validateFileBytes(bytes,meta.ext);
  const metadata={name:meta.name,mime:meta.mime,size:meta.size};
  if(meta.ext==="txt") {const text=new TextDecoder("utf-8",{fatal:true}).decode(bytes).trim();return text?{status:"ok",text,method:"embedded",metadata}:ingestionFailure("empty");}
  if(meta.ext==="docx"||meta.ext==="pdf") {
   const direct=meta.ext==="pdf"?await extractPdf(bytes):await extractDocx(bytes);
   if(direct.status==="ok") return {
    status:"ok",text:direct.text,method:"embedded",metadata,
    ...(meta.ext==="pdf"&&/[\u0600-\u06ff]/.test(direct.text)?{
     warningAr:"قد يغيّر استخراج PDF ترتيب بعض الحروف العربية. قارن النص بالمستند الأصلي، وصحّحه أو الصق نسخة دقيقة قبل التحليل.",
     warningEn:"PDF extraction can reorder some Arabic letters. Compare the extracted text with the original and correct it or paste an accurate copy before analysis."
    }:{})
   };
   if(direct.status!=="no_text_layer") return ingestionFailure(direct.status==="empty"?"empty":"extraction_failed");
  }
  try {
   const result=await extractWithOCR(bytes,meta.mime);
   if(result.isLegalRelevant===false) return ingestionFailure("not_legal");
   if(!result.readable||!result.complete||!result.text.trim()) return ingestionFailure("unreadable");
   return {status:"ok",text:result.text,method:"ocr",metadata,warningAr:result.warningAr,warningEn:result.warningEn};
  } catch { return ingestionFailure("ai_unavailable"); }
 } catch(cause) {const code=cause instanceof Error?cause.message:"extraction_failed";return ingestionFailure(code in reasons?code as keyof typeof reasons:"extraction_failed");}
}
