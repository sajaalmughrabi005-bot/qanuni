import {
  Analysis,
  DocumentClause,
  DocumentType,
  ExtractedCaseData,
  LegalSource,
  Locale,
  RiskCategory,
  RiskLevel,
} from "@/types";

/**
 * Local heuristic "AI" engine used when no OPENAI_API_KEY is configured.
 * Keyword-driven, deterministic, and transparent — never invents legal
 * citations. This keeps the demo fully functional offline while the
 * OpenAI-backed path in provider.ts can replace it when a key is present.
 */

const RISK_KEYWORDS: { pattern: RegExp; risk: RiskLevel; category: DocumentClause["category"] }[] = [
  { pattern: /غرامة|penalty|فسخ فوري|forfeit|يُصادر/i, risk: "high", category: "termination" },
  { pattern: /القوة القاهرة|force majeure/i, risk: "high", category: "liability" },
  { pattern: /دون إشعار|without notice|فوراً/i, risk: "medium", category: "deadline" },
  { pattern: /مسؤولية كاملة|sole liability|يتحمل وحده|full responsibility/i, risk: "high", category: "liability" },
  { pattern: /تعويض|indemnif/i, risk: "medium", category: "liability" },
  { pattern: /تأخر|late payment|تأخير السداد/i, risk: "medium", category: "financial" },
  { pattern: /دينار|jod|\$|USD|مبلغ/i, risk: "low", category: "financial" },
  { pattern: /مدة العقد|duration|تاريخ البدء|effective date/i, risk: "low", category: "contractual" },
];

const NO_OCR_MARKER = "No extracted text available";

function splitIntoClauses(text: string): string[] {
  return text
    .split(/\n+|(?<=[.؟!])\s+(?=[A-Zأ-ي])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 12)
    .slice(0, 20);
}

function classifyClause(text: string): { risk: RiskLevel; category: DocumentClause["category"] } {
  for (const rule of RISK_KEYWORDS) {
    if (rule.pattern.test(text)) return { risk: rule.risk, category: rule.category };
  }
  return { risk: "low", category: "contractual" };
}

export function heuristicAnalyzeText(params: {
  text: string;
  fileName: string;
  documentId: string;
  userId: string;
  documentType: DocumentType;
}): { clauses: DocumentClause[]; analysis: Analysis } {
  if (params.text.includes(NO_OCR_MARKER)) {
    const clause: DocumentClause = {
      id: `${params.documentId}-cl-1`,
      documentId: params.documentId,
      clauseNumber: "1",
      clauseTextAr: `لم نتمكن من استخراج نص من "${params.fileName}" (لا يوجد OCR في وضع الديمو). الصق نص العقد أو استخدم العقد التجريبي الجاهز للحصول على تحليل حقيقي مبني على المحتوى.`,
      clauseTextEn: `We couldn't extract text from "${params.fileName}" (no OCR in demo mode). Paste the contract text or use the ready-made demo contract to get a real, content-grounded analysis.`,
      riskLevel: "low",
      category: "contractual",
      explanationAr: "هذا ليس تحليلاً قانونياً — هو إشعار بأن المستند يحتاج نصاً قابلاً للقراءة ليُحلَّل فعلياً.",
      explanationEn: "This is not a legal analysis — it's a notice that the document needs readable text to be actually analyzed.",
      confidence: 0,
    };
    const analysis: Analysis = {
      id: `an-${params.documentId}`,
      documentId: params.documentId,
      userId: params.userId,
      overallRisk: "low",
      riskCategories: (["contractual", "financial", "deadline", "termination", "liability"] as const).map(
        (category) => ({
          category,
          level: "low" as RiskLevel,
          reasonAr: "لا يوجد نص مستخرج بعد لتحليل هذه الفئة.",
          reasonEn: "No extracted text yet to analyze this category.",
        })
      ),
      summaryAr: `لم نستخرج نصاً من "${params.fileName}" لأن الرفع تم بدون OCR في وضع الديمو. الصق نص العقد أو جرّب العقد التجريبي للحصول على تحليل كامل.`,
      summaryEn: `No text was extracted from "${params.fileName}" because upload works without OCR in demo mode. Paste the contract text or try the demo contract for a full analysis.`,
      yourObligationsAr: [],
      yourObligationsEn: [],
      otherPartyObligationsAr: [],
      otherPartyObligationsEn: [],
      deadlinesAr: [],
      deadlinesEn: [],
      paymentTermsAr: [],
      paymentTermsEn: [],
      cancellationTermsAr: [],
      cancellationTermsEn: [],
      concernsAr: [],
      concernsEn: [],
      questionsForLawyerAr: [],
      questionsForLawyerEn: [],
      createdAt: new Date().toISOString(),
    };
    return { clauses: [clause], analysis };
  }

  const rawClauses = splitIntoClauses(params.text);
  const clauses: DocumentClause[] = (rawClauses.length ? rawClauses : [params.text]).map(
    (text, i) => {
      const { risk, category } = classifyClause(text);
      return {
        id: `${params.documentId}-cl-${i + 1}`,
        documentId: params.documentId,
        clauseNumber: String(i + 1),
        clauseTextAr: text,
        clauseTextEn: text,
        riskLevel: risk,
        category,
        explanationAr:
          risk === "high"
            ? "تم رصد كلمات مفتاحية قد تشير إلى شرط يستحق مراجعة قانونية دقيقة (مثل الغرامات أو المسؤولية الكاملة)."
            : risk === "medium"
            ? "هذا البند يحتوي على تفاصيل مالية أو زمنية يُفضّل الانتباه لها."
            : "لم يتم رصد مؤشرات خطر غير اعتيادية في هذا البند وفق محرك التحليل المحلي.",
        explanationEn:
          risk === "high"
            ? "Keywords were detected suggesting a clause that may need careful legal review (e.g. penalties or full liability)."
            : risk === "medium"
            ? "This clause contains financial or time-sensitive details worth noting."
            : "No unusual risk indicators were detected in this clause by the local analysis engine.",
        confidence: risk === "high" ? 68 : risk === "medium" ? 60 : 55,
      } satisfies DocumentClause;
    }
  );

  const riskCategories: RiskCategory[] = (
    ["contractual", "financial", "deadline", "termination", "liability"] as const
  ).map((category) => {
    const relevant = clauses.filter((c) => c.category === category);
    const level: RiskLevel = relevant.some((c) => c.riskLevel === "high")
      ? "high"
      : relevant.some((c) => c.riskLevel === "medium")
      ? "medium"
      : "low";
    return {
      category,
      level,
      reasonAr:
        relevant.length === 0
          ? "لم يتم رصد بنود متعلقة بهذه الفئة في المستند."
          : `تم رصد ${relevant.length} بند(بنود) متعلقة بهذه الفئة، بأعلى مستوى خطر: ${level}.`,
      reasonEn:
        relevant.length === 0
          ? "No clauses related to this category were detected in the document."
          : `${relevant.length} clause(s) related to this category were detected, highest risk: ${level}.`,
    };
  });

  const overallRisk: RiskLevel = clauses.some((c) => c.riskLevel === "high")
    ? "high"
    : clauses.some((c) => c.riskLevel === "medium")
    ? "medium"
    : "low";

  const analysis: Analysis = {
    id: `an-${params.documentId}`,
    documentId: params.documentId,
    userId: params.userId,
    overallRisk,
    riskCategories,
    summaryAr: `تم تحليل المستند "${params.fileName}" محلياً (وضع تجريبي دون مزود ذكاء اصطناعي خارجي). تم رصد ${clauses.length} بند تقريبي، منها ${clauses.filter((c) => c.riskLevel !== "low").length} يستحق انتباهاً إضافياً.`,
    summaryEn: `The document "${params.fileName}" was analyzed locally (demo mode, no external AI provider). Approximately ${clauses.length} clauses were detected, of which ${clauses.filter((c) => c.riskLevel !== "low").length} deserve extra attention.`,
    yourObligationsAr: ["مراجعة كل بند تم تمييزه باللون الأصفر أو الأحمر بعناية."],
    yourObligationsEn: ["Review every clause flagged yellow or red carefully."],
    otherPartyObligationsAr: ["يعتمد على نص المستند — راجع البنود المقابلة."],
    otherPartyObligationsEn: ["Depends on the document text — review the corresponding clauses."],
    deadlinesAr: clauses.filter((c) => c.category === "deadline").map((c) => c.clauseTextAr.slice(0, 80)),
    deadlinesEn: clauses.filter((c) => c.category === "deadline").map((c) => c.clauseTextEn.slice(0, 80)),
    paymentTermsAr: clauses.filter((c) => c.category === "financial").map((c) => c.clauseTextAr.slice(0, 80)),
    paymentTermsEn: clauses.filter((c) => c.category === "financial").map((c) => c.clauseTextEn.slice(0, 80)),
    cancellationTermsAr: clauses.filter((c) => c.category === "termination").map((c) => c.clauseTextAr.slice(0, 80)),
    cancellationTermsEn: clauses.filter((c) => c.category === "termination").map((c) => c.clauseTextEn.slice(0, 80)),
    concernsAr: clauses.filter((c) => c.riskLevel !== "low").map((c) => c.clauseTextAr.slice(0, 90)),
    concernsEn: clauses.filter((c) => c.riskLevel !== "low").map((c) => c.clauseTextEn.slice(0, 90)),
    questionsForLawyerAr: [
      "هل البنود المميزة باللون الأحمر متوافقة مع الممارسات القانونية الشائعة؟",
      "ما هي حقوقي إذا رغبت بالتراجع عن أحد الالتزامات؟",
    ],
    questionsForLawyerEn: [
      "Are the red-flagged clauses consistent with common legal practice?",
      "What are my rights if I want to withdraw from an obligation?",
    ],
    createdAt: new Date().toISOString(),
  };

  return { clauses, analysis };
}

export function heuristicExtractCaseData(text: string): ExtractedCaseData {
  const amounts = Array.from(text.matchAll(/(\d{2,6})\s*(دينار|jod|JD)/gi)).map((m) => `${m[1]} ${m[2]}`);
  const dates = Array.from(
    text.matchAll(/(\d{4}[/-]\d{1,2}[/-]\d{1,2}|\d{1,2}[/-]\d{1,2}[/-]\d{4})/g)
  ).map((m) => m[1]);
  const nameMatch = text.match(/(?:المدعي|client|المستأجر)[:\s]+([^\n,،]{3,30})/i);
  const opposingMatch = text.match(/(?:المدعى عليه|opposing party|المؤجر)[:\s]+([^\n,،]{3,30})/i);
  const caseNumberMatch = text.match(/(?:رقم الدعوى|case no\.?|case number)[:\s]+([\w\/-]{2,20})/i);
  const courtMatch = text.match(/(?:محكمة|court)[:\s]+([^\n,،]{3,40})/i);

  return {
    clientName: nameMatch?.[1]?.trim(),
    opposingParty: opposingMatch?.[1]?.trim(),
    caseNumber: caseNumberMatch?.[1]?.trim(),
    court: courtMatch?.[1]?.trim(),
    importantDates: dates,
    amounts,
    claims: [],
    deadline: dates[dates.length - 1],
    confidence: dates.length || amounts.length ? 62 : 40,
  };
}

const DRAFT_TEMPLATES: Record<string, { ar: string; en: string }> = {
  notice: {
    ar: "بسم الله الرحمن الرحيم\n\nإنذار عدلي\n\nالمرسل إليه: [اسم الطرف الآخر]\nالموضوع: [موضوع الإنذار]\n\nنحيطكم علماً بموجب هذا الإنذار بضرورة [الإجراء المطلوب] خلال مدة أقصاها [المدة] من تاريخه، وإلا سنضطر آسفين لاتخاذ الإجراءات القانونية اللازمة لحفظ حقوق موكلنا.\n\nوتفضلوا بقبول فائق الاحترام.",
    en: "Formal Notice\n\nTo: [Other Party's Name]\nSubject: [Notice Subject]\n\nYou are hereby notified of the need to [required action] within [timeframe] from this date, failing which we will regretfully be compelled to take the necessary legal action to protect our client's rights.\n\nSincerely,",
  },
  reminder: {
    ar: "تذكير ودّي بخصوص [الموضوع]\n\nنأمل منكم [الإجراء المطلوب] في أقرب وقت ممكن. نقدر تعاونكم السريع.",
    en: "Friendly reminder regarding [subject]\n\nWe kindly ask you to [required action] as soon as possible. We appreciate your prompt cooperation.",
  },
  general: {
    ar: "مسودة قانونية\n\n[محتوى يتم توليده بناءً على التعليمات المُدخلة]",
    en: "Legal Draft\n\n[Content generated based on the provided instructions]",
  },
};

function scoreClauseRelevance(clause: DocumentClause, question: string): number {
  const q = question.toLowerCase();
  const tokens = q.split(/\s+/).filter((t) => t.length > 2);
  const haystack = (clause.clauseTextAr + " " + clause.clauseTextEn + " " + clause.explanationAr).toLowerCase();
  let score = tokens.reduce((acc, t) => acc + (haystack.includes(t) ? 1 : 0), 0);

  const topicMap: { pattern: RegExp; category: DocumentClause["category"] }[] = [
    { pattern: /طلعت|leave|غادرت|terminate|إنهاء|early/i, category: "termination" },
    { pattern: /دفع|payment|أدفع|pay|أجرة|rent/i, category: "financial" },
    { pattern: /ضرر|damage|مسؤولية|liable|liability/i, category: "liability" },
    { pattern: /موعد|deadline|تأخر|late/i, category: "deadline" },
  ];
  for (const t of topicMap) {
    if (t.pattern.test(question) && clause.category === t.category) score += 3;
  }
  return score;
}

export function findRelevantClauses(
  clauses: DocumentClause[],
  question: string,
  limit = 2
): DocumentClause[] {
  return [...clauses]
    .map((c) => ({ c, score: scoreClauseRelevance(c, question) }))
    .sort((a, b) => b.score - a.score)
    .filter((x) => x.score > 0)
    .slice(0, limit)
    .map((x) => x.c);
}

export function heuristicAnswerQuestion(params: {
  question: string;
  clauses: DocumentClause[];
  sources: LegalSource[];
  locale: Locale;
}): { answer: string; sourceIds: string[]; matchedClauseIds: string[] } {
  const relevant = findRelevantClauses(params.clauses, params.question);
  const { locale } = params;

  if (params.clauses.length === 0) {
    return {
      answer:
        locale === "ar"
          ? "هذا سؤال عام دون مستند مرفق، فالإجابة هنا عامة وغير مبنية على عقد محدد. لإجابة أدق ومبنية على حالتك الفعلية، حلّل مستندك القانوني أولاً — أو تحدّث مباشرة مع محامٍ إذا كانت المسألة عاجلة."
          : "This is a general question without an attached document, so the answer here is general and not based on a specific contract. For a more precise, grounded answer, analyze your legal document first — or speak directly with a lawyer if the matter is urgent.",
      sourceIds: [],
      matchedClauseIds: [],
    };
  }

  if (relevant.length === 0) {
    return {
      answer:
        locale === "ar"
          ? "لم أجد بنداً مرتبطاً بشكل مباشر بسؤالك ضمن المستند. يمكنك إعادة صياغة السؤال، أو التحدث مباشرة مع محامٍ لمزيد من الدقة."
          : "I couldn't find a clause directly related to your question in this document. Try rephrasing, or speak with a lawyer for more precision.",
      sourceIds: [],
      matchedClauseIds: [],
    };
  }

  const lead = relevant[0];
  const sourceIds = relevant.map((c) => c.legalSourceId).filter((x): x is string => !!x);

  const riskPhraseAr =
    lead.riskLevel === "high"
      ? "هذا البند قد يشكل خطراً يستحق مراجعة قانونية دقيقة."
      : lead.riskLevel === "medium"
      ? "هذا البند يستحق انتباهاً إضافياً."
      : "لا يبدو أن هذا البند يحمل مخاطر غير اعتيادية.";
  const riskPhraseEn =
    lead.riskLevel === "high"
      ? "This clause may present a risk that warrants careful legal review."
      : lead.riskLevel === "medium"
      ? "This clause deserves extra attention."
      : "This clause does not appear to carry unusual risk.";

  const answer =
    locale === "ar"
      ? `بناءً على البند رقم ${lead.clauseNumber} في مستندك:\n\n"${lead.clauseTextAr}"\n\n${lead.explanationAr} ${riskPhraseAr}\n\nهذا شرح آلي وليس استشارة قانونية ملزمة — ننصح بمراجعة محامٍ مرخّص قبل اتخاذ أي قرار.`
      : `Based on clause ${lead.clauseNumber} in your document:\n\n"${lead.clauseTextEn}"\n\n${lead.explanationEn} ${riskPhraseEn}\n\nThis is an automated explanation, not binding legal advice — a licensed lawyer should review this before you rely on it.`;

  return { answer, sourceIds, matchedClauseIds: relevant.map((c) => c.id) };
}

export function heuristicSimulateScenario(params: {
  question: string;
  clauses: DocumentClause[];
  sources: LegalSource[];
  locale: Locale;
}) {
  const relevant = findRelevantClauses(params.clauses, params.question, 1);
  const lead = relevant[0];

  if (!lead) {
    return {
      consequenceAr: "لم يتم العثور على بند مرتبط مباشرة بهذا السيناريو في المستند. يُنصح بمناقشة هذا السيناريو مع محامٍ.",
      consequenceEn: "No directly related clause was found for this scenario in the document. Discussing this scenario with a lawyer is recommended.",
      affectedClauseId: undefined as string | undefined,
      legalSourceId: undefined as string | undefined,
      questionsAr: ["ما هي خياراتي القانونية في هذا السيناريو تحديداً؟"],
      questionsEn: ["What are my specific legal options in this scenario?"],
    };
  }

  return {
    consequenceAr: `استناداً إلى البند رقم ${lead.clauseNumber}: "${lead.clauseTextAr}" — ${lead.explanationAr}${
      lead.concernAr ? ` ${lead.concernAr}` : ""
    }`,
    consequenceEn: `Based on clause ${lead.clauseNumber}: "${lead.clauseTextEn}" — ${lead.explanationEn}${
      lead.concernEn ? ` ${lead.concernEn}` : ""
    }`,
    affectedClauseId: lead.id,
    legalSourceId: lead.legalSourceId,
    questionsAr: [
      "هل هناك استثناءات على هذا البند تنطبق على حالتي؟",
      "ما هي الخطوة التالية المناسبة قبل اتخاذ أي إجراء؟",
    ],
    questionsEn: [
      "Are there exceptions to this clause that apply to my situation?",
      "What's the right next step before taking any action?",
    ],
  };
}

export function matchLawyersToCase<
  T extends {
    id: string;
    specialties: string[];
    city: string;
    languages: string[];
    availabilityStatus: string;
  }
>(lawyersList: T[], caseCategory: string, preferredCity?: string, preferredLanguage?: string) {
  return lawyersList
    .map((lw) => {
      let score = 0;
      const reasons: string[] = [];
      if (lw.specialties.includes(caseCategory)) {
        score += 50;
        reasons.push("specialty");
      }
      if (preferredCity && lw.city === preferredCity) {
        score += 20;
        reasons.push("city");
      }
      if (preferredLanguage && lw.languages.includes(preferredLanguage)) {
        score += 15;
        reasons.push("language");
      }
      if (lw.availabilityStatus === "available_today") {
        score += 15;
        reasons.push("availability");
      } else if (lw.availabilityStatus === "available_this_week") {
        score += 8;
      }
      return { lawyer: lw, score: Math.min(score, 99), reasons };
    })
    .sort((a, b) => b.score - a.score);
}

export interface VoiceCommandResult {
  action: "reminder" | "unknown";
  clientName?: string;
  date?: string;
  time?: string;
  raw: string;
}

export function heuristicParseVoiceCommand(transcript: string): VoiceCommandResult {
  const nameMatch = transcript.match(/(?:مع|أتواصل مع|with)\s+([أ-يa-zA-Z]{2,15})/i);
  const timeMatch = transcript.match(/(\d{1,2})(?::(\d{2}))?\s*(صباحاً|مساءً|am|pm)?/i);
  const dayMatch = transcript.match(/بكرة|غداً|tomorrow|اليوم|today/i);

  if (!nameMatch && !timeMatch) {
    return { action: "unknown", raw: transcript };
  }

  const day = dayMatch
    ? /بكرة|غداً|tomorrow/i.test(dayMatch[0])
      ? "tomorrow"
      : "today"
    : "tomorrow";

  return {
    action: "reminder",
    clientName: nameMatch?.[1],
    date: day,
    time: timeMatch ? `${timeMatch[1]}:${timeMatch[2] || "00"} ${timeMatch[3] || ""}`.trim() : undefined,
    raw: transcript,
  };
}

const ASSISTANT_TOPICS: { pattern: RegExp; ar: string; en: string }[] = [
  {
    pattern: /عقد|مستند|رفع|analyz|document|upload|contract/i,
    ar: "لتحليل عقد: من داشبورد المواطن اضغط \"حلّل مستنداً\"، ارفع ملفك أو الصق نصه، ثم اضغط \"ابدأ التحليل\". بدون OCR، الصق النص مباشرة أو جرّب العقد التجريبي الجاهز للحصول على تحليل كامل.",
    en: "To analyze a contract: from the citizen dashboard, click \"Analyze a Document\", upload your file or paste its text, then click \"Start Analysis\". Without OCR, paste the text directly or try the ready-made demo contract for a full analysis.",
  },
  {
    pattern: /محامٍ|محامي|lawyer|find/i,
    ar: "للبحث عن محامٍ: اضغط \"ابحث عن محامٍ\" من القائمة، صفّي حسب المدينة أو التخصص، وادخل على بروفايل أي محامٍ لطلب استشارة.",
    en: "To find a lawyer: click \"Find a Lawyer\" from the menu, filter by city or specialty, and open a lawyer's profile to request a consultation.",
  },
  {
    pattern: /قضية|case|create/i,
    ar: "لإنشاء قضية: بعد تحليل مستند، اضغط \"أنشئ قضية\" في صفحة النتائج — سيتم تحويل تحليلك لقضية منظمة تصل لمحامٍ مناسب.",
    en: "To create a case: after analyzing a document, click \"Create a Case\" on the results page — your analysis becomes a structured case sent to a matching lawyer.",
  },
  {
    pattern: /مسودة|صياغة|draft/i,
    ar: "لصياغة مستند قانوني: من داشبورد المحامي افتح \"صائغ المسودات\"، اكتب تعليماتك، ثم استخدم أزرار التقصير/الصياغة الرسمية/الترجمة لتعديل المسودة.",
    en: "To draft a legal document: from the lawyer dashboard open the \"AI Legal Drafter\", write your instructions, then use the shorten/formal/translate buttons to refine the draft.",
  },
  {
    pattern: /خطأ|error|مشكلة|bug|لا يعمل|مايشتغل|not working/i,
    ar: "إذا واجهت مشكلة تقنية: جرّب تحديث الصفحة أولاً. المنصة تعمل بوضع تجريبي محلي بدون خادم خارجي، فبعض الميزات (مثل التحقق من المحامين أو واتساب) محاكاة مقصودة وليست أعطالاً. إذا استمرت المشكلة، صف الخطوة بالتحديد وسنساعدك.",
    en: "If you're hitting a technical issue: try refreshing the page first. The platform runs in local demo mode with no external backend, so some features (like lawyer verification or WhatsApp) are intentionally simulated, not broken. If it persists, describe the exact step and we'll help.",
  },
];

export function heuristicAssistantReply(message: string, locale: Locale): string {
  for (const topic of ASSISTANT_TOPICS) {
    if (topic.pattern.test(message)) return locale === "ar" ? topic.ar : topic.en;
  }
  return locale === "ar"
    ? "أنا مساعد قانوني مبني على محرك محلي بدون اتصال خارجي بوضع الديمو الحالي. اسألني عن كيفية استخدام أي ميزة بالمنصة (تحليل عقد، البحث عن محامٍ، إنشاء قضية، صياغة مسودة)، أو صف مشكلة تقنية تواجهها."
    : "I'm a legal assistant running on a local engine with no external connection in the current demo mode. Ask me how to use any platform feature (analyzing a contract, finding a lawyer, creating a case, drafting a document), or describe a technical issue you're facing.";
}

export function heuristicGenerateDraft(instructions: string, locale: Locale): string {
  const isNotice = /إنذار|notice|formal/i.test(instructions);
  const isReminder = /تذكير|reminder|follow.?up/i.test(instructions);
  const key = isNotice ? "notice" : isReminder ? "reminder" : "general";
  const template = DRAFT_TEMPLATES[key][locale];
  const disclaimer =
    locale === "ar"
      ? "\n\n⚠️ مسودة تم إنشاؤها بواسطة الذكاء الاصطناعي — تتطلب مراجعة المحامي قبل الاستخدام."
      : "\n\n⚠️ AI-generated draft — lawyer review required before use.";
  return `${template}\n\n(${locale === "ar" ? "بخصوص" : "Regarding"}: ${instructions})${disclaimer}`;
}

const DISCLAIMER_AR = "⚠️ مسودة تم إنشاؤها بواسطة الذكاء الاصطناعي — تتطلب مراجعة المحامي قبل الاستخدام.";
const DISCLAIMER_EN = "⚠️ AI-generated draft — lawyer review required before use.";

function stripDisclaimer(content: string): string {
  return content.replace(DISCLAIMER_AR, "").replace(DISCLAIMER_EN, "").trim();
}

const FORMAL_SWAPS_AR: [RegExp, string][] = [
  [/بدي|بدنا/g, "أرغب"],
  [/احكيلك|بحكيلك/g, "أفيدكم"],
  [/شكراً/g, "وتفضلوا بقبول فائق الاحترام والتقدير"],
];
const FORMAL_SWAPS_EN: [RegExp, string][] = [
  [/\bwanna\b/gi, "would like to"],
  [/\bgonna\b/gi, "going to"],
  [/\bthanks\b/gi, "sincerely"],
];

export function heuristicTransformDraft(params: {
  existingContent: string;
  mode: "shorten" | "formal" | "translate";
  locale: Locale;
}): string {
  const body = stripDisclaimer(params.existingContent);
  const disclaimer = params.locale === "ar" ? DISCLAIMER_AR : DISCLAIMER_EN;

  if (params.mode === "shorten") {
    const sentences = body.split(/(?<=[.؟!\n])\s+/).filter((s) => s.trim().length > 0);
    const kept = sentences.slice(0, Math.max(2, Math.ceil(sentences.length / 2)));
    const label = params.locale === "ar" ? "(نسخة مختصرة)" : "(Shortened version)";
    return `${label}\n\n${kept.join(" ").trim()}\n\n${disclaimer}`;
  }

  if (params.mode === "formal") {
    let text = body;
    const swaps = params.locale === "ar" ? FORMAL_SWAPS_AR : FORMAL_SWAPS_EN;
    for (const [pattern, replacement] of swaps) text = text.replace(pattern, replacement);
    const opening = params.locale === "ar" ? "تحية طيبة وبعد،\n\n" : "Dear Sir/Madam,\n\n";
    const closing = params.locale === "ar" ? "\n\nوتفضلوا بقبول فائق الاحترام." : "\n\nSincerely,";
    return `${opening}${text}${closing}\n\n${disclaimer}`;
  }

  // translate: no real offline translation engine — the body stays in its
  // original language, so the notice explaining that must stay in the
  // CURRENT UI locale too (not the untranslated target locale), otherwise
  // the result reads as broken, mismatched text.
  const note =
    params.locale === "ar"
      ? "(وضع الديمو: لا يوجد محرك ترجمة محلي متاح بدون مزود ذكاء اصطناعي خارجي. النص أدناه هو النص الأصلي — يحتاج ترجمة يدوية من المحامي.)"
      : "(Demo mode: no offline translation engine is available without an external AI provider. The text below is the original — it needs manual translation by the lawyer.)";
  return `${note}\n\n${body}\n\n${disclaimer}`;
}
