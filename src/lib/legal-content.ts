export interface LegalSection {
  heading: string;
  body: string[];
}
export interface LegalDoc {
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
}

const UPDATED = "2026-09-20";

export const privacy: Record<"ar" | "en", LegalDoc> = {
  ar: {
    title: "سياسة الخصوصية",
    updated: `آخر تحديث: ${UPDATED}`,
    intro: "نحترم خصوصيتك. توضّح هذه السياسة ما الذي نجمعه في «قانوني»، ولماذا، ومن يستطيع رؤيته، وكيف تتحكم به.",
    sections: [
      {
        heading: "ما الذي نجمعه",
        body: [
          "بيانات الحساب: الاسم والبريد الإلكتروني ورقم الهاتف والمدينة والصورة (اختياري)، وللمحامين رقم عضوية النقابة ومعلومات التوثيق.",
          "المحتوى الذي تقدّمه: نصوص العقود التي تحلّلها، أسئلتك وسيناريوهاتك، طلبات القضايا، الرسائل، والمستندات التي ترفعها ضمن قضية.",
          "بيانات تقنية محدودة: ملفات تعريف الارتباط اللازمة لتسجيل الدخول واللغة والمظهر، وسجلات أخطاء النظام دون محتوى مستنداتك.",
        ],
      },
      {
        heading: "كيف نستخدمها",
        body: [
          "لتشغيل حسابك وتحليل عقودك وعرض سجلّك، ولإيصال طلبك إلى المحامي الذي اخترته، وإرسال إشعارات عن قضاياك.",
          "قد تُرسل نصوص التحليل والأسئلة إلى مزوّد ذكاء اصطناعي (OpenAI) من جهة الخادم فقط لتوليد الإجابة، ولا نستخدم مستنداتك لأي غرض إعلاني.",
        ],
      },
      {
        heading: "من يستطيع رؤية بياناتك",
        body: [
          "أنت وحدك ترى عقودك وتحليلاتك وسجل أسئلتك.",
          "المحامي الذي ترسل له طلبًا يرى ما ترفقه بالطلب؛ ولا تظهر بيانات اتصالك له إلا بعد قبوله للقضية.",
          "المديرون يرون بيانات وصفية فقط (العنوان والحالة والأطراف) لأغراض الإشراف، ولا يرون رسائل القضايا أو مستنداتها أو ملاحظات المحامي الخاصة.",
          "لا يظهر رقم عضوية النقابة ولا معلومات التوثيق للعامة إطلاقًا.",
        ],
      },
      {
        heading: "الحماية والتخزين",
        body: [
          "تُخزَّن البيانات في قاعدة بيانات محمية بقواعد وصول على مستوى الصف، وتُحفظ مستندات القضايا في تخزين خاص ولا تُتاح إلا برابط مؤقت للأطراف المخوَّلين.",
          "النسخة التجريبية تعمل ببيانات وهمية داخل المتصفح فقط ولا تتصل بحسابات أو بيانات حقيقية.",
        ],
      },
      {
        heading: "حقوقك",
        body: [
          "يمكنك تعديل بياناتك من صفحة الملف الشخصي في أي وقت.",
          "يمكنك حذف حسابك نهائيًا من صفحة الملف الشخصي، وعندها تُحذف بياناتك الشخصية المرتبطة به (العقود والتحليلات والطلبات والإشعارات والرسائل التي أرسلتها).",
        ],
      },
      {
        heading: "التواصل",
        body: ["لأي استفسار عن الخصوصية، تواصل معنا عبر بريد المنصة المعلن على الموقع."],
      },
    ],
  },
  en: {
    title: "Privacy Policy",
    updated: `Last updated: ${UPDATED}`,
    intro: "We respect your privacy. This policy explains what QANUNI collects, why, who can see it, and how you stay in control.",
    sections: [
      {
        heading: "What we collect",
        body: [
          "Account details: name, email, phone, city and a photo (optional); for lawyers, a bar number and verification details.",
          "Content you provide: contract text you analyse, your questions and scenarios, case requests, messages, and documents you upload to a case.",
          "Limited technical data: cookies needed for sign-in, language and theme, and system error logs that never contain your document content.",
        ],
      },
      {
        heading: "How we use it",
        body: [
          "To run your account, analyse your contracts, show your history, deliver your request to the lawyer you chose, and notify you about your cases.",
          "Analysis text and questions may be sent, server-side only, to an AI provider (OpenAI) to generate the answer. We do not use your documents for advertising.",
        ],
      },
      {
        heading: "Who can see your data",
        body: [
          "Only you can see your contracts, analyses and question history.",
          "A lawyer you send a request to sees what you attach to it; your contact details are shown to them only after they accept the case.",
          "Admins see metadata only (title, status, parties) for oversight — never case messages, documents or a lawyer's private notes.",
          "Bar numbers and verification information are never shown publicly.",
        ],
      },
      {
        heading: "Protection and storage",
        body: [
          "Data lives in a database protected by row-level access rules; case documents are kept in private storage and only reachable through short-lived links for authorised parties.",
          "The demo runs on fake data inside your browser only and never connects to real accounts or data.",
        ],
      },
      {
        heading: "Your rights",
        body: [
          "You can edit your details from your profile page at any time.",
          "You can permanently delete your account from your profile page; your personal data tied to it (contracts, analyses, requests, notifications and the messages you sent) is deleted with it.",
        ],
      },
      {
        heading: "Contact",
        body: ["For any privacy question, contact us through the platform's published email."],
      },
    ],
  },
};

export const terms: Record<"ar" | "en", LegalDoc> = {
  ar: {
    title: "شروط الاستخدام",
    updated: `آخر تحديث: ${UPDATED}`,
    intro: "باستخدامك «قانوني» فإنك توافق على هذه الشروط. يُرجى قراءتها بعناية.",
    sections: [
      {
        heading: "طبيعة الخدمة",
        body: [
          "«قانوني» منصة تقنية تساعدك على فهم مستنداتك القانونية وتصلك بمحامين مستقلين. المنصة ليست مكتب محاماة ولا تقدّم استشارات قانونية بنفسها.",
          "تحليلات الذكاء الاصطناعي إرشادية فقط وقد تحتوي أخطاء، ولا تُغني عن استشارة محامٍ مرخّص قبل اتخاذ أي قرار.",
        ],
      },
      {
        heading: "الحسابات",
        body: [
          "يمكن التسجيل كمواطن أو كمحامٍ فقط. أنت مسؤول عن صحة بياناتك وعن سرّية كلمة مرورك.",
          "يظهر المحامي في الدليل كموثّق فقط بعد مراجعة الإدارة لبياناته واعتمادها، ويمكن للإدارة رفض التوثيق أو طلب معلومات إضافية أو إيقاف أي حساب يخالف الشروط.",
        ],
      },
      {
        heading: "العلاقة مع المحامين",
        body: [
          "إرسال طلب قضية لا يُنشئ علاقة وكالة إلا بعد قبول المحامي للطلب، ويتم الاتفاق على الأتعاب بينك وبين المحامي مباشرة.",
          "المحامون مستقلون ومسؤولون وحدهم عن خدماتهم المهنية. المنصة لا تضمن نتيجة أي قضية.",
        ],
      },
      {
        heading: "الاستخدام المقبول",
        body: [
          "يُمنع رفع محتوى غير قانوني أو مضلل، أو انتحال شخصية، أو محاولة الوصول إلى بيانات الآخرين، أو التحايل على أنظمة الحماية.",
          "يجوز لنا إيقاف أو حذف الحسابات التي تخالف ذلك.",
        ],
      },
      {
        heading: "المسؤولية",
        body: ["تُقدَّم الخدمة كما هي دون ضمانات، وفي الحدود التي يسمح بها القانون لا تتحمل المنصة مسؤولية الأضرار غير المباشرة الناتجة عن استخدامها."],
      },
      {
        heading: "التعديل والقانون الواجب التطبيق",
        body: ["قد نحدّث هذه الشروط وننشر النسخة الجديدة هنا. تخضع هذه الشروط لقوانين المملكة الأردنية الهاشمية."],
      },
    ],
  },
  en: {
    title: "Terms of Use",
    updated: `Last updated: ${UPDATED}`,
    intro: "By using QANUNI you agree to these terms. Please read them carefully.",
    sections: [
      {
        heading: "What the service is",
        body: [
          "QANUNI is a technology platform that helps you understand your legal documents and connects you with independent lawyers. It is not a law firm and does not give legal advice itself.",
          "AI analyses are informational only and may contain mistakes; they are no substitute for a licensed lawyer before you make any decision.",
        ],
      },
      {
        heading: "Accounts",
        body: [
          "You can sign up only as a citizen or a lawyer. You are responsible for the accuracy of your details and for keeping your password secret.",
          "A lawyer appears as verified in the directory only after an admin reviews and approves their details. Admins may reject verification, ask for more information, or suspend any account that breaks these terms.",
        ],
      },
      {
        heading: "Relationship with lawyers",
        body: [
          "Sending a case request does not create a client relationship until the lawyer accepts it; fees are agreed directly between you and the lawyer.",
          "Lawyers are independent and solely responsible for their professional services. The platform does not guarantee the outcome of any case.",
        ],
      },
      {
        heading: "Acceptable use",
        body: [
          "You must not upload unlawful or misleading content, impersonate anyone, try to reach other people's data, or bypass security controls.",
          "We may suspend or delete accounts that do.",
        ],
      },
      {
        heading: "Liability",
        body: ["The service is provided as is, without warranties. To the extent the law allows, the platform is not liable for indirect damages arising from its use."],
      },
      {
        heading: "Changes and governing law",
        body: ["We may update these terms and will publish the new version here. These terms are governed by the laws of the Hashemite Kingdom of Jordan."],
      },
    ],
  },
};
