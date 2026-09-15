import { Analysis, DocumentClause, LegalDocument } from "@/types";

export const DEMO_DOCUMENT_ID = "doc-demo-rental";
export const DEMO_USER_ID = "user-citizen-demo";

export const demoDocument: LegalDocument = {
  id: DEMO_DOCUMENT_ID,
  userId: DEMO_USER_ID,
  fileName: "عقد-إيجار-شقة-عمّان.pdf",
  documentType: "rental",
  language: "ar",
  status: "analyzed",
  createdAt: "2026-09-01T09:00:00.000Z",
  parties: [
    { role: "landlord", name: "محمد علي الحوراني" },
    { role: "tenant", name: "أحمد محمد الزعبي" },
  ],
  effectiveDate: "2026-09-01",
  durationMonths: 12,
  keyAmounts: [
    { labelAr: "الأجرة الشهرية", labelEn: "Monthly rent", amount: 320 },
    { labelAr: "التأمين المسترد", labelEn: "Refundable deposit", amount: 320 },
    { labelAr: "غرامة الإنهاء المبكر", labelEn: "Early termination penalty", amount: 1000 },
  ],
};

export const demoClauses: DocumentClause[] = [
  {
    id: "cl-1",
    documentId: DEMO_DOCUMENT_ID,
    clauseNumber: "1",
    clauseTextAr:
      "يؤجر الطرف الأول (المؤجر) للطرف الثاني (المستأجر) الشقة الكائنة في عمّان - منطقة خلدا، طابق ثالث، لمدة اثني عشر (12) شهراً تبدأ من 2026/09/01 وتنتهي في 2027/08/31.",
    clauseTextEn:
      "The Landlord leases to the Tenant the apartment located in Amman - Khalda area, third floor, for a period of twelve (12) months starting 01/09/2026 and ending 31/08/2027.",
    riskLevel: "low",
    category: "contractual",
    explanationAr: "هذا البند يحدد مدة العقد والعقار المؤجر بشكل واضح ولا يحمل مخاطر غير اعتيادية.",
    explanationEn: "This clause clearly defines the lease term and property, and carries no unusual risk.",
    confidence: 92,
  },
  {
    id: "cl-2",
    documentId: DEMO_DOCUMENT_ID,
    clauseNumber: "3",
    clauseTextAr:
      "يلتزم المستأجر بدفع أجرة شهرية قدرها 320 ديناراً أردنياً، تُسدد مقدماً خلال الأيام الخمسة الأولى من كل شهر ميلادي، عن طريق تحويل بنكي إلى حساب المؤجر.",
    clauseTextEn:
      "The Tenant shall pay monthly rent of JOD 320, payable in advance within the first five days of each calendar month via bank transfer to the Landlord's account.",
    riskLevel: "low",
    category: "financial",
    explanationAr: "بند دفع اعتيادي يوضح المبلغ وموعد وطريقة السداد بشكل محدد وواضح.",
    explanationEn: "A standard payment clause that clearly specifies amount, due date, and payment method.",
    confidence: 90,
  },
  {
    id: "cl-3",
    documentId: DEMO_DOCUMENT_ID,
    clauseNumber: "7",
    clauseTextAr:
      "في حال رغب المستأجر بإنهاء العقد قبل نهاية مدته لأي سبب كان، يلتزم بدفع مبلغ وقدره 1000 دينار أردني كغرامة إنهاء مبكر، بالإضافة إلى فقدان كامل مبلغ التأمين المسترد.",
    clauseTextEn:
      "Should the Tenant wish to terminate the contract before its term for any reason, they must pay JOD 1,000 as an early termination penalty, in addition to forfeiting the entire refundable deposit.",
    riskLevel: "high",
    category: "termination",
    explanationAr:
      "يفرض هذا البند غرامة مرتفعة نسبياً (1000 دينار) بالإضافة إلى خسارة التأمين بالكامل في حال الإنهاء المبكر لأي سبب، دون تمييز بين الأسباب المبررة وغير المبررة.",
    explanationEn:
      "This clause imposes a relatively high penalty (JOD 1,000) plus full forfeiture of the deposit for early termination for any reason, without distinguishing justified from unjustified causes.",
    concernAr:
      "قد يعتبر هذا الشرط الجزائي مرتفعاً مقارنة بالضرر الفعلي المحتمل، وهو أمر قد يخضع لتقدير القضاء بحسب الظروف.",
    concernEn:
      "This penalty may be considered high relative to the likely actual harm, which is something a court may assess depending on circumstances.",
    confidence: 81,
    legalSourceId: "ls-2",
  },
  {
    id: "cl-4",
    documentId: DEMO_DOCUMENT_ID,
    clauseNumber: "9",
    clauseTextAr:
      "يتحمل المستأجر وحده مسؤولية أي أضرار تلحق بالعقار خلال مدة الإيجار، بما في ذلك الأضرار الناتجة عن عوامل خارجة عن إرادته كالكوارث الطبيعية أو القوة القاهرة.",
    clauseTextEn:
      "The Tenant alone shall bear responsibility for any damage to the property during the lease term, including damage arising from factors beyond their control such as natural disasters or force majeure.",
    riskLevel: "high",
    category: "liability",
    explanationAr:
      "هذا البند يحمّل المستأجر مسؤولية حتى عن الأضرار الناتجة عن قوة قاهرة، وهو أمر غير معتاد في العقود القياسية وقد يكون غير منصف.",
    explanationEn:
      "This clause holds the Tenant liable even for force-majeure damage, which is unusual for a standard lease and may be considered unfair.",
    concernAr: "استثناء المستأجر من الإعفاء المعتاد عند القوة القاهرة قد يشكل بنداً مجحفاً يستحق مراجعة قانونية.",
    concernEn: "Excluding the standard force-majeure exemption may constitute an unfair term warranting legal review.",
    confidence: 85,
    legalSourceId: "ls-5",
  },
  {
    id: "cl-5",
    documentId: DEMO_DOCUMENT_ID,
    clauseNumber: "11",
    clauseTextAr:
      "لا يجوز للمستأجر التنازل عن العقد أو تأجيره من الباطن لأي طرف ثالث دون موافقة خطية مسبقة من المؤجر.",
    clauseTextEn:
      "The Tenant may not assign the contract or sublet to any third party without the Landlord's prior written consent.",
    riskLevel: "medium",
    category: "contractual",
    explanationAr: "بند شائع في عقود الإيجار يقيّد التأجير من الباطن، ولكنه يستحق الانتباه إذا كنت تخطط لمشاركة السكن.",
    explanationEn: "A common lease restriction on subletting — worth noting if you plan to share the unit.",
    confidence: 88,
  },
  {
    id: "cl-6",
    documentId: DEMO_DOCUMENT_ID,
    clauseNumber: "13",
    clauseTextAr:
      "يحق للمؤجر إنهاء العقد فوراً ودون إشعار مسبق في حال تأخر المستأجر عن دفع الأجرة لمدة تتجاوز سبعة أيام من تاريخ الاستحقاق.",
    clauseTextEn:
      "The Landlord may terminate the contract immediately without prior notice if the Tenant is more than seven days late on rent payment.",
    riskLevel: "medium",
    category: "deadline",
    explanationAr: "مهلة سبعة أيام أقصر نسبياً من المعتاد في بعض العقود، وتستحق الانتباه لتفادي التأخر بالدفع.",
    explanationEn: "A seven-day grace period is shorter than some standard contracts — worth noting to avoid late payment.",
    confidence: 78,
    legalSourceId: "ls-1",
  },
  {
    id: "cl-7",
    documentId: DEMO_DOCUMENT_ID,
    clauseNumber: "15",
    clauseTextAr: "يتحمل المؤجر مسؤولية الصيانة الأساسية للمرافق العامة كالسباكة والكهرباء، ما لم ينتج العطل عن سوء استخدام المستأجر.",
    clauseTextEn:
      "The Landlord is responsible for basic maintenance of core utilities such as plumbing and electrical systems, unless the fault results from Tenant misuse.",
    riskLevel: "low",
    category: "contractual",
    explanationAr: "بند متوازن يوزع مسؤولية الصيانة بشكل معتاد بين الطرفين.",
    explanationEn: "A balanced clause that distributes maintenance responsibility in a standard way.",
    confidence: 90,
  },
];

export const demoAnalysis: Analysis = {
  id: "an-demo-1",
  documentId: DEMO_DOCUMENT_ID,
  userId: DEMO_USER_ID,
  overallRisk: "medium",
  riskCategories: [
    {
      category: "contractual",
      level: "low",
      reasonAr: "بنود العقد الأساسية (المدة، الأطراف، العقار) محددة وواضحة.",
      reasonEn: "Core contract terms (duration, parties, property) are clear and well-defined.",
    },
    {
      category: "financial",
      level: "medium",
      reasonAr: "الأجرة وطريقة الدفع واضحتان، لكن الشرط الجزائي للإنهاء المبكر مرتفع نسبياً.",
      reasonEn: "Rent and payment terms are clear, but the early-termination penalty is relatively high.",
    },
    {
      category: "deadline",
      level: "medium",
      reasonAr: "مهلة السداد قبل الإنهاء (7 أيام) أقصر من الشائع في بعض العقود المماثلة.",
      reasonEn: "The payment grace period (7 days) is shorter than common in comparable contracts.",
    },
    {
      category: "termination",
      level: "high",
      reasonAr: "غرامة الإنهاء المبكر مرتفعة ولا تميز بين أسباب الإنهاء المبررة وغير المبررة.",
      reasonEn: "The early-termination penalty is high and does not distinguish justified from unjustified causes.",
    },
    {
      category: "liability",
      level: "high",
      reasonAr: "تحميل المستأجر مسؤولية أضرار القوة القاهرة غير معتاد ويستحق مراجعة قانونية.",
      reasonEn: "Holding the Tenant liable for force-majeure damage is unusual and warrants legal review.",
    },
  ],
  summaryAr:
    "هذا عقد إيجار سكني لمدة سنة واحدة في عمّان، بأجرة شهرية 320 ديناراً. العقد واضح في بنوده الأساسية، لكنه يتضمن بندين يستحقان انتباهاً خاصاً: غرامة إنهاء مبكر مرتفعة نسبياً، وبند مسؤولية عن الأضرار يشمل حتى حالات القوة القاهرة.",
  summaryEn:
    "This is a one-year residential lease in Amman with monthly rent of JOD 320. The core terms are clear, but two clauses deserve special attention: a relatively high early-termination penalty, and a liability clause that includes even force-majeure damage.",
  yourObligationsAr: [
    "دفع 320 ديناراً شهرياً خلال أول 5 أيام من كل شهر",
    "عدم التأجير من الباطن دون موافقة خطية",
    "تحمل مسؤولية أي ضرر يلحق بالعقار، بما في ذلك حالات القوة القاهرة",
  ],
  yourObligationsEn: [
    "Pay JOD 320 monthly within the first 5 days of each month",
    "No subletting without written consent",
    "Bear responsibility for any property damage, including force-majeure cases",
  ],
  otherPartyObligationsAr: [
    "تسليم الشقة بحالة صالحة للسكن",
    "صيانة المرافق الأساسية (سباكة وكهرباء) ما لم ينتج العطل عن سوء استخدام",
  ],
  otherPartyObligationsEn: [
    "Deliver the apartment in habitable condition",
    "Maintain core utilities (plumbing, electrical) unless the fault is due to tenant misuse",
  ],
  deadlinesAr: [
    "السداد الشهري: خلال أول 5 أيام من كل شهر",
    "مهلة التأخر المسموح بها قبل إنهاء المؤجر للعقد: 7 أيام",
  ],
  deadlinesEn: [
    "Monthly payment: within the first 5 days of each month",
    "Grace period before Landlord may terminate: 7 days",
  ],
  paymentTermsAr: ["أجرة شهرية 320 ديناراً عبر تحويل بنكي", "تأمين مسترد بقيمة 320 ديناراً"],
  paymentTermsEn: ["Monthly rent JOD 320 via bank transfer", "Refundable deposit of JOD 320"],
  cancellationTermsAr: ["غرامة إنهاء مبكر 1000 دينار بالإضافة لفقدان التأمين، لأي سبب كان"],
  cancellationTermsEn: ["Early termination penalty of JOD 1,000 plus forfeiture of deposit, for any reason"],
  concernsAr: [
    "غرامة الإنهاء المبكر قد تكون مرتفعة مقارنة بالممارسات الشائعة",
    "بند مسؤولية الأضرار يشمل حالات القوة القاهرة وهو غير معتاد",
    "مهلة السداد قبل الإنهاء (7 أيام) قصيرة نسبياً",
  ],
  concernsEn: [
    "The early-termination penalty may be high relative to common practice",
    "The damage-liability clause unusually includes force-majeure events",
    "The payment grace period (7 days) is relatively short",
  ],
  questionsForLawyerAr: [
    "هل يعتبر مبلغ 1000 دينار كغرامة إنهاء متناسباً قانونياً مع الضرر المحتمل؟",
    "هل يمكن الطعن ببند تحميل المستأجر مسؤولية القوة القاهرة؟",
    "ما هي خياراتي إذا اضطررت لمغادرة الشقة قبل نهاية المدة لسبب طارئ؟",
  ],
  questionsForLawyerEn: [
    "Is the JOD 1,000 termination penalty legally proportionate to likely harm?",
    "Can the force-majeure liability clause be challenged?",
    "What are my options if I need to leave the apartment early due to an emergency?",
  ],
  createdAt: "2026-09-01T09:04:00.000Z",
};
