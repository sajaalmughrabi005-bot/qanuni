export interface GlossaryTerm {
  termAr: string;
  termEn: string;
  explanationAr: string;
  explanationEn: string;
  exampleAr: string;
  exampleEn: string;
}

export const glossary: GlossaryTerm[] = [
  {
    termAr: "الشرط الجزائي",
    termEn: "Penalty Clause",
    explanationAr: "مبلغ متفق عليه مسبقاً يدفعه الطرف المخالف عند الإخلال بالعقد، بدلاً من إثبات الضرر الفعلي في المحكمة.",
    explanationEn: "A pre-agreed amount paid by the breaching party upon default, instead of proving actual damages in court.",
    exampleAr: "مثال: غرامة 1000 دينار عند إنهاء عقد الإيجار قبل موعده.",
    exampleEn: "Example: a JOD 1,000 penalty for ending a lease early.",
  },
  {
    termAr: "القوة القاهرة",
    termEn: "Force Majeure",
    explanationAr: "ظروف استثنائية خارجة عن إرادة الطرفين (كالكوارث الطبيعية) قد تُعفي من المسؤولية عن عدم تنفيذ الالتزام.",
    explanationEn: "Extraordinary events beyond either party's control (like natural disasters) that may excuse non-performance.",
    exampleAr: "مثال: زلزال يمنع تسليم العقار في الموعد المتفق عليه.",
    exampleEn: "Example: an earthquake preventing timely delivery of a property.",
  },
  {
    termAr: "التعويض عن الضرر (Indemnification)",
    termEn: "Indemnification",
    explanationAr: "يعني إن طرفاً معيناً ممكن يتحمل تكاليف أو أضراراً معينة حسب الشروط المذكورة في العقد.",
    explanationEn: "Means one party agrees to cover certain costs or damages according to the contract's terms.",
    exampleAr: "مثال: التزام المستأجر بتعويض المؤجر عن أضرار ناتجة عن سوء الاستخدام.",
    exampleEn: "Example: a tenant agreeing to cover damages caused by their own misuse.",
  },
  {
    termAr: "الإنهاء المبكر",
    termEn: "Early Termination",
    explanationAr: "إنهاء العقد قبل انتهاء مدته المتفق عليها، وعادة ما يترتب عليه التزامات مالية محددة في العقد.",
    explanationEn: "Ending a contract before its agreed term, usually triggering specific financial obligations.",
    exampleAr: "مثال: مغادرة الشقة المستأجرة بعد 6 أشهر من عقد مدته سنة.",
    exampleEn: "Example: leaving a rented apartment after 6 months of a one-year lease.",
  },
  {
    termAr: "فترة الإشعار",
    termEn: "Notice Period",
    explanationAr: "المدة الزمنية التي يجب على أحد الطرفين إعلام الطرف الآخر بها قبل اتخاذ إجراء معين كالإنهاء.",
    explanationEn: "The period one party must notify the other before taking an action such as termination.",
    exampleAr: "مثال: إشعار المؤجر بشهر قبل إخلاء الشقة.",
    exampleEn: "Example: notifying the landlord one month before vacating.",
  },
  {
    termAr: "التأمين المسترد",
    termEn: "Refundable Deposit",
    explanationAr: "مبلغ يدفعه المستأجر كضمان، ويُعاد له عند انتهاء العقد إذا لم يكن هناك أضرار أو مخالفات.",
    explanationEn: "An amount paid by the tenant as security, refunded at the end of the lease absent damage or breach.",
    exampleAr: "مثال: تأمين 320 ديناراً يُسترد عند تسليم الشقة بحالة جيدة.",
    exampleEn: "Example: a JOD 320 deposit refunded upon returning the apartment in good condition.",
  },
];

export function findGlossaryTerm(query: string): GlossaryTerm | undefined {
  const q = query.trim().toLowerCase();
  return glossary.find(
    (g) => g.termAr.includes(query.trim()) || g.termEn.toLowerCase().includes(q)
  );
}
