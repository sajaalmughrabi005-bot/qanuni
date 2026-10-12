/** Public failure categories only. Never serialize provider/SQL messages, detail,
 * hints, tokens or legal text. Schema absence is separate from authorization.
 * An unknown network outcome must not trigger destructive compensation. */
export function operationFailure(error: { code?: string; message?: string; status?: number } | null | undefined, fallback = "unknown"): string {
  if (!error) return fallback;
  if (["PGRST202", "PGRST204", "42883", "42703", "42P01"].includes(error.code || "")) return "schema_unavailable";
  if (["42501", "PGRST301", "PGRST302"].includes(error.code || "")) return "forbidden";
  if (["submission_changed", "not_authenticated", "not_allowed", "lawyer_unavailable", "lawyer_not_accepting"].includes(error.message || "")) return error.message!;
  return fallback;
}

/** Stage-specific recovery copy deliberately contains no technical object names. */
export function uploadFailureMessage(stage: "draft" | "source" | "analysis" | "save", code: string, ar: boolean): string {
  const stages = { draft: ["حفظ المستند", "saving the document"], source: ["حفظ الملف الأصلي", "storing the original file"], analysis: ["تحليل المستند", "analyzing the document"], save: ["حفظ نتيجة التحليل", "saving the analysis result"] };
  const step = stages[stage][ar ? 0 : 1];
  if (code === "schema_unavailable" || code === "not_configured") return ar ? `تعذر ${step}: الخدمة غير متاحة حالياً. احتفظ بالنص والملف وحاول بعد استعادة الخدمة.` : `The service is currently unavailable for ${step}. Keep your text and file and retry once service is restored.`;
  if (["forbidden", "not_allowed", "not_authenticated"].includes(code)) return ar ? `تعذر ${step}. تحقق من تسجيل الدخول وصلاحية حسابك. النص باقٍ في النموذج.` : `Unable to continue ${step}. Check your sign-in and account access. Your text remains in the form.`;
  return ar ? `تعذر ${step}. النص والملف باقيان في النموذج؛ لم نؤكد اكتمال العملية. حاول مجدداً.` : `Unable to finish ${step}. Your text and file remain in the form; completion was not confirmed. Please retry.`;
}
