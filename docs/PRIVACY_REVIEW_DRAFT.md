# Privacy-policy change note — DRAFT, 2026-10-04

**LEGAL/HUMAN REVIEW REQUIRED. This is a proposed review artifact, not an approved or published policy.** No material policy text was changed in `src/lib/legal-content.ts` during this continuation.

## Factual mismatch

The English protection/storage section says “The demo runs on fake data inside your browser only and never connects to real accounts or data.” The Arabic section makes the same browser-only claim. Demo records/workflows are isolated in browser memory and do not access unrelated registered users' database/Storage data, but live demo AI processes the user's actual input through HAQ's server and OpenAI. Image/scanned-document OCR sends document imagery through that provider; analysis, chat, drafting and embeddings also involve provider processing. A signed HttpOnly demo cookie and server-side rate accounting are used. Thus browser-only processing is factually inaccurate even though demo workflow records are local.

## Suggested replacement for review

English draft:

> Demo case records and saved workflow changes are isolated in temporary browser memory. AI features process the text or document content you submit through HAQ's server and its AI provider, OpenAI; document extraction may send images or scanned pages for OCR. Demo actions do not contact real lawyers or access other users' private records. Refreshing or leaving the demo clears its temporary browser work, but does not imply deletion of data already processed by server infrastructure or the AI provider. Avoid submitting sensitive real information while trying the demo.

Arabic draft:

> تُحفظ سجلات القضايا والتغييرات المحفوظة في التجربة بصورة معزولة ومؤقتة في ذاكرة المتصفح. تعالج ميزات الذكاء الاصطناعي النص أو محتوى المستند الذي تقدّمه عبر خادم حق ومزوّد الذكاء الاصطناعي OpenAI، وقد تُرسل صور المستندات أو الصفحات الممسوحة لاستخراج النص. لا تتواصل إجراءات التجربة مع محامين حقيقيين ولا تصل إلى السجلات الخاصة بالمستخدمين الآخرين. تؤدي إعادة تحميل الصفحة أو مغادرة التجربة إلى فقدان العمل المؤقت في المتصفح، لكنها لا تعني حذف البيانات التي سبق أن عالجتها بنية الخادم أو مزوّد الذكاء الاصطناعي. يُرجى تجنّب تقديم معلومات حقيقية حساسة أثناء تجربة المنصة.

The owner and Jordanian counsel must approve wording, placement and effective date. Review the upload/AI entry disclosures alongside the policy; no unapproved legal copy is published by this document.

## Facts requiring confirmation before approval

- Actual provider account/data-processing terms, retention, training settings, processing regions, transfers, subprocessors and deletion procedures. Do not promise zero retention, a particular jurisdiction, or no training without account-specific evidence.
- Hosting logs, telemetry, backups, server request buffering, signed-cookie duration and operational metadata retention. Source-level log restrictions do not verify hosting behavior.
- Registered-user storage access, consented original-document handoff and signed-link behavior after migrations; legal statements about administrator visibility need deployed RLS verification.
- Account deletion versus Storage/backups/provider deletion. Database/Storage removal is not one transaction; the existing unconditional deletion promise needs review against staging failure/cascade/orphan evidence.
- The contact address, rights/complaint channel, legal basis, consent requirements, applicable Jordanian privacy obligations and approved publication date.

No legal-compliance conclusion, provider-retention guarantee, production deletion guarantee or comprehensive legal-source claim is established here.
