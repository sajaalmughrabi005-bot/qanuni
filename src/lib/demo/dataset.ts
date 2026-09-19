import type {
  AppNotification,
  Appointment,
  CaseDocument,
  CaseEvent,
  CaseNote,
  CaseRecord,
  CaseStatus,
  LegalDraft,
  Lawyer,
  Message,
  Profile,
  Report,
  SystemEvent,
} from "@/types";
import { DEMO_USER_ID } from "@/lib/mock-data/contract";
import { DEMO_LAWYER_ID, DEMO_LAWYER_PROFILE_ID, demoLawyers } from "./lawyers";

/**
 * ALL SAMPLE DATA. Every name, case, message and number below is invented
 * for the interactive demo and never touches the database. Dates are
 * relative to "now" so the demo always looks current.
 */
export const DEMO_ADMIN_ID = "user-admin-demo";

const HOUR = 3600 * 1000;
const at = (hoursFromNow: number) => new Date(Date.now() + hoursFromNow * HOUR).toISOString();

export interface DemoData {
  profiles: Profile[];
  lawyers: Lawyer[];
  pendingLawyers: Lawyer[];
  cases: CaseRecord[];
  events: CaseEvent[];
  messages: Message[];
  caseDocuments: CaseDocument[];
  caseNotes: CaseNote[];
  appointments: Appointment[];
  drafts: LegalDraft[];
  notifications: AppNotification[];
  reports: Report[];
  systemEvents: SystemEvent[];
}

type CaseSeed = Partial<CaseRecord> &
  Pick<CaseRecord, "id" | "clientName" | "title" | "category" | "status" | "summaryAr" | "summaryEn">;

function makeCase(seed: CaseSeed, hoursAgo: number): CaseRecord {
  return {
    clientId: undefined,
    lawyerId: DEMO_LAWYER_ID,
    priority: "medium",
    urgency: "medium",
    clientStoryAr: seed.requestDescription || seed.summaryAr,
    clientStoryEn: seed.requestDescription || seed.summaryEn,
    relevantClauseIds: [],
    documentIds: [],
    keyDatesAr: [],
    keyDatesEn: [],
    questionsAr: [],
    questionsEn: [],
    suggestedSpecialty: seed.category,
    createdAt: at(-hoursAgo),
    updatedAt: at(-Math.max(1, hoursAgo - 3)),
    requestedAt: at(-hoursAgo),
    isManual: false,
    ...seed,
  };
}

function eventsFor(c: CaseRecord): CaseEvent[] {
  const out: CaseEvent[] = [];
  const base = new Date(c.requestedAt).getTime();
  let n = 0;
  const push = (
    actorRole: CaseEvent["actorRole"],
    eventType: CaseEvent["eventType"],
    offsetMin: number,
    metadata: Record<string, unknown> = {}
  ) =>
    out.push({
      id: `${c.id}-ev-${n++}`,
      caseId: c.id,
      actorRole,
      eventType,
      metadata,
      createdAt: new Date(base + offsetMin * 60000).toISOString(),
    });
  push("client", "request_submitted", 0, { urgency: c.urgency });
  if (c.status === "requested") return out;
  push("lawyer", "viewed", 45);
  if (c.status === "rejected") {
    push("lawyer", "rejected", 60, { reason_code: c.rejectionReason });
    return out;
  }
  push("lawyer", "accepted", 90);
  const flow: CaseStatus[] = ["active", "waiting_for_client", "waiting_for_lawyer", "resolved", "closed"];
  const reach: Record<string, CaseStatus[]> = {
    accepted: [],
    active: ["active"],
    waiting_for_client: ["active", "waiting_for_client"],
    waiting_for_lawyer: ["active", "waiting_for_client", "waiting_for_lawyer"],
    resolved: ["active", "resolved"],
    closed: ["active", "resolved", "closed"],
  };
  let prev: CaseStatus = "accepted";
  (reach[c.status] || flow).forEach((to, i) => {
    push(to === "waiting_for_lawyer" ? "client" : "lawyer", "status_changed", 120 + i * 90, { from: prev, to });
    prev = to;
  });
  return out;
}

export function buildDemoData(): DemoData {
  const citizen: Profile = {
    id: DEMO_USER_ID,
    fullName: "أحمد محمد الزعبي (تجريبي)",
    email: "demo.citizen@example.invalid",
    phone: "+962 79 000 0001",
    role: "citizen",
    language: "ar",
    city: "عمّان",
    createdAt: at(-24 * 60),
    accountStatus: "active",
  };
  const lawyerProfile: Profile = {
    id: DEMO_LAWYER_PROFILE_ID,
    fullName: "المحامية لينا القاسم (تجريبي)",
    email: "demo.lawyer@example.invalid",
    phone: "+962 79 000 0002",
    role: "lawyer",
    language: "ar",
    city: "عمّان",
    createdAt: at(-24 * 120),
    accountStatus: "active",
  };
  const adminProfile: Profile = {
    id: DEMO_ADMIN_ID,
    fullName: "مدير المنصة (تجريبي)",
    email: "demo.admin@example.invalid",
    role: "admin",
    language: "ar",
    createdAt: at(-24 * 200),
    accountStatus: "active",
  };
  const otherClients: Profile[] = [
    ["user-citizen-2", "سلمى عودة"],
    ["user-citizen-3", "فراس ملحس"],
    ["user-citizen-4", "دانا حجازين"],
    ["user-citizen-5", "معاذ الشوابكة"],
    ["user-citizen-6", "هبة النسور"],
  ].map(([id, fullName], i) => ({
    id,
    fullName: `${fullName} (تجريبي)`,
    email: `demo.client${i + 2}@example.invalid`,
    role: "citizen" as const,
    language: "ar" as const,
    createdAt: at(-24 * (30 + i)),
    accountStatus: "active" as const,
  }));

  const cases: CaseRecord[] = [
    makeCase(
      {
        id: "case-demo-1",
        clientId: DEMO_USER_ID,
        clientName: citizen.fullName,
        title: "مراجعة عقد إيجار شقة - خلدا، عمّان",
        category: "rental",
        status: "requested",
        urgency: "high",
        priority: "high",
        requestDescription:
          "وقعت عقد إيجار شقة بخلدا قبل أسبوعين وفيه بند غرامة إنهاء مبكر 1000 دينار. أريد أن أفهم إذا كان هذا منطقياً قانونياً.",
        requestMessage: "أرجو التواصل بأقرب وقت لأن مهلة الرد على المؤجر قريبة.",
        summaryAr: "المستأجر يطلب مراجعة عقد إيجار بسبب بند غرامة إنهاء مبكر مرتفع (1000 دينار).",
        summaryEn: "Tenant requests review of a lease with a high early-termination penalty (JOD 1,000).",
        keyDatesAr: ["تاريخ بدء العقد: بعد أسبوعين"],
        keyDatesEn: ["Lease start: two weeks ago"],
        questionsAr: ["هل غرامة الإنهاء المبكر (1000 دينار) متناسبة قانونياً؟"],
        questionsEn: ["Is the JOD 1,000 early-termination penalty legally proportionate?"],
        matchScore: 94,
      },
      5
    ),
    makeCase(
      {
        id: "case-demo-2",
        clientId: "user-citizen-2",
        clientName: otherClients[0].fullName,
        title: "نزاع إنهاء عقد عمل",
        category: "employment",
        status: "requested",
        urgency: "urgent",
        priority: "urgent",
        requestDescription: "تم فصلي من عملي بدون إشعار مسبق ولم أستلم مستحقاتي الأخيرة.",
        summaryAr: "موظفة تطلب المساعدة في نزاع إنهاء عقد عمل بدون إشعار.",
        summaryEn: "Employee seeks help with a termination-without-notice dispute.",
        matchScore: 88,
      },
      2
    ),
    makeCase(
      {
        id: "case-demo-3",
        clientId: DEMO_USER_ID,
        clientName: citizen.fullName,
        title: "استرداد مبلغ التأمين من المؤجر السابق",
        category: "rental",
        status: "active",
        priority: "medium",
        legalStage: "negotiation",
        totalFees: 300,
        paymentsReceived: 100,
        requestDescription: "المؤجر السابق يرفض إعادة مبلغ التأمين رغم تسليم الشقة بحالة جيدة.",
        summaryAr: "مطالبة باسترداد مبلغ تأمين إيجار (320 دينار).",
        summaryEn: "Claim to recover a rental deposit (JOD 320).",
        nextActionAr: "إرسال إنذار عدلي للمؤجر",
        nextActionEn: "Send a formal notice to the landlord",
        deadline: at(24 * 9).slice(0, 10),
        matchScore: 91,
      },
      96
    ),
    makeCase(
      {
        id: "case-demo-4",
        clientId: "user-citizen-3",
        clientName: otherClients[1].fullName,
        title: "مراجعة اتفاقية خدمات مستقل",
        category: "commercial",
        status: "waiting_for_client",
        legalStage: "initial_review",
        summaryAr: "مراجعة اتفاقية خدمات مع شركة وبند عدم المنافسة.",
        summaryEn: "Review of a freelance services agreement with a non-compete clause.",
        nextActionAr: "بانتظار تزويدنا بنسخة موقعة من الاتفاقية",
        nextActionEn: "Waiting for a signed copy of the agreement",
      },
      70
    ),
    makeCase(
      {
        id: "case-demo-5",
        clientId: "user-citizen-4",
        clientName: otherClients[2].fullName,
        title: "مطالبة تعويض ضرر ممتلكات",
        category: "civil",
        status: "waiting_for_lawyer",
        priority: "high",
        legalStage: "legal_notice",
        summaryAr: "مطالبة بتعويض عن أضرار لحقت بسيارة نتيجة حادث.",
        summaryEn: "Claim for compensation for vehicle damage after an accident.",
        nextActionAr: "مراجعة المستندات التي رفعها العميل",
        nextActionEn: "Review the documents the client uploaded",
      },
      120
    ),
    makeCase(
      {
        id: "case-demo-6",
        clientId: "user-citizen-5",
        clientName: otherClients[3].fullName,
        title: "قضية إخلاء عقاري",
        category: "real_estate",
        status: "accepted",
        summaryAr: "قضية إخلاء عقار تجاري لعدم سداد الأجرة.",
        summaryEn: "Eviction of a commercial property for unpaid rent.",
      },
      30
    ),
    makeCase(
      {
        id: "case-demo-7",
        clientId: DEMO_USER_ID,
        clientName: citizen.fullName,
        title: "استشارة تأسيس شركة ناشئة",
        category: "corporate",
        status: "resolved",
        legalStage: "closed",
        totalFees: 150,
        paymentsReceived: 150,
        summaryAr: "استشارة حول اختيار الشكل القانوني لشركة ناشئة.",
        summaryEn: "Advice on choosing the legal form for a startup.",
        resolvedAt: at(-48),
      },
      24 * 12
    ),
    makeCase(
      {
        id: "case-demo-8",
        clientId: "user-citizen-6",
        clientName: otherClients[4].fullName,
        title: "عقد شراكة تجارية",
        category: "commercial",
        status: "closed",
        legalStage: "closed",
        totalFees: 200,
        paymentsReceived: 200,
        summaryAr: "مراجعة عقد شراكة تجارية وإغلاق الملف.",
        summaryEn: "Reviewed a business partnership agreement; file closed.",
        closedAt: at(-24 * 5),
      },
      24 * 30
    ),
    makeCase(
      {
        id: "case-demo-9",
        clientId: DEMO_USER_ID,
        lawyerId: "lawyer-demo-2",
        clientName: citizen.fullName,
        title: "خلاف على بند في عقد عمل",
        category: "employment",
        status: "rejected",
        rejectionReason: "no_capacity",
        rejectionNote: "أعتذر، جدول قضاياي ممتلئ حالياً. أنصحك بمراجعة محامٍ آخر.",
        summaryAr: "طلب استشارة بخصوص بند في عقد عمل.",
        summaryEn: "Request for advice about a clause in an employment contract.",
      },
      24 * 3
    ),
  ];

  const events = cases.flatMap(eventsFor);

  const messages: Message[] = [
    {
      id: "msg-1",
      caseId: "case-demo-3",
      senderId: DEMO_LAWYER_PROFILE_ID,
      senderName: lawyerProfile.fullName,
      senderRole: "lawyer",
      receiverId: DEMO_USER_ID,
      kind: "text",
      message: "مرحباً أحمد، اطلعت على تفاصيل قضيتك. سأجهّز إنذاراً عدلياً للمؤجر اليوم.",
      createdAt: at(-30),
      readAt: at(-29),
    },
    {
      id: "msg-2",
      caseId: "case-demo-3",
      senderId: DEMO_USER_ID,
      senderName: citizen.fullName,
      senderRole: "citizen",
      receiverId: DEMO_LAWYER_PROFILE_ID,
      kind: "text",
      message: "شكراً لك. هل تحتاجين مني أي مستند إضافي؟",
      createdAt: at(-28),
      readAt: at(-27),
    },
    {
      id: "msg-3",
      caseId: "case-demo-4",
      senderId: DEMO_LAWYER_PROFILE_ID,
      senderName: lawyerProfile.fullName,
      senderRole: "lawyer",
      receiverId: "user-citizen-3",
      kind: "document_request",
      message: "الرجاء رفع نسخة موقعة من اتفاقية الخدمات.",
      createdAt: at(-20),
    },
  ];

  const caseDocuments: CaseDocument[] = [
    {
      id: "cdoc-1",
      caseId: "case-demo-3",
      uploadedBy: DEMO_USER_ID,
      uploadedByRole: "client",
      fileName: "عقد-الإيجار-السابق.pdf",
      storagePath: "demo/case-demo-3/lease.pdf",
      mimeType: "application/pdf",
      sizeBytes: 182_000,
      createdAt: at(-90),
    },
    {
      id: "cdoc-2",
      caseId: "case-demo-5",
      uploadedBy: "user-citizen-4",
      uploadedByRole: "client",
      fileName: "تقرير-الحادث.pdf",
      storagePath: "demo/case-demo-5/report.pdf",
      mimeType: "application/pdf",
      sizeBytes: 240_000,
      createdAt: at(-8),
    },
  ];

  const caseNotes: CaseNote[] = [
    {
      id: "note-1",
      caseId: "case-demo-3",
      lawyerId: DEMO_LAWYER_ID,
      note: "ملاحظة خاصة: العميل متعاون ولديه إثبات تسليم الشقة. الأولوية للتسوية الودية قبل الإنذار.",
      createdAt: at(-60),
    },
  ];

  const appointments: Appointment[] = [
    {
      id: "apt-1",
      clientId: DEMO_USER_ID,
      clientName: citizen.fullName,
      lawyerId: DEMO_LAWYER_ID,
      caseId: "case-demo-3",
      title: "متابعة استرداد مبلغ التأمين",
      startTime: at(26),
      endTime: at(26.5),
      type: "video",
      status: "confirmed",
    },
    {
      id: "apt-2",
      clientId: "user-citizen-3",
      clientName: otherClients[1].fullName,
      lawyerId: DEMO_LAWYER_ID,
      caseId: "case-demo-4",
      title: "مراجعة اتفاقية الخدمات",
      startTime: at(50),
      endTime: at(50.5),
      type: "phone",
      status: "pending",
    },
  ];

  const drafts: LegalDraft[] = [
    {
      id: "draft-1",
      caseId: "case-demo-3",
      lawyerId: DEMO_LAWYER_ID,
      title: "إنذار عدلي — استرداد مبلغ التأمين",
      instructions: "اكتبلي إنذار عدلي بخصوص عدم إرجاع مبلغ التأمين",
      content:
        "[مسودة تجريبية]\nالسيد المؤجر المحترم،\nنخاطبكم بصفتنا وكلاء عن موكلنا بخصوص مبلغ التأمين المستحق (320 دينار)...\n\nهذه مسودة نموذجية للعرض التوضيحي فقط.",
      status: "draft",
      createdAt: at(-40),
      updatedAt: at(-40),
    },
  ];

  const notifications: AppNotification[] = [
    {
      id: "n-c1",
      userId: DEMO_USER_ID,
      type: "case_accepted",
      titleAr: "تم قبول طلبك",
      titleEn: "Your request was accepted",
      bodyAr: "تم قبول طلبك من قبل المحامي.",
      bodyEn: "Your request was accepted by the lawyer.",
      read: false,
      createdAt: at(-90),
      href: "/citizen/cases/case-demo-3",
    },
    {
      id: "n-c2",
      userId: DEMO_USER_ID,
      type: "case_rejected",
      titleAr: "تم رفض طلبك",
      titleEn: "Your request was declined",
      bodyAr: "للأسف تم رفض طلبك من قبل المحامي.",
      bodyEn: "Unfortunately your request was declined by the lawyer.",
      read: true,
      createdAt: at(-72),
      href: "/citizen/cases/case-demo-9",
    },
    {
      id: "n-l1",
      userId: DEMO_LAWYER_PROFILE_ID,
      type: "case_request",
      titleAr: "طلب قضية جديد",
      titleEn: "New case request",
      bodyAr: "طلب جديد من أحمد: مراجعة عقد إيجار شقة - خلدا، عمّان",
      bodyEn: "New request from Ahmad: lease review - Khalda, Amman",
      read: false,
      createdAt: at(-5),
      href: "/lawyer/cases/case-demo-1",
    },
    {
      id: "n-l2",
      userId: DEMO_LAWYER_PROFILE_ID,
      type: "document",
      titleAr: "رفع العميل مستندًا جديدًا",
      titleEn: "Your client uploaded a document",
      bodyAr: "تقرير-الحادث.pdf",
      bodyEn: "تقرير-الحادث.pdf",
      read: false,
      createdAt: at(-8),
      href: "/lawyer/cases/case-demo-5",
    },
  ];

  const pendingLawyers: Lawyer[] = [
    {
      id: "lawyer-demo-pending-1",
      profileId: "profile-lawyer-pending-1",
      fullName: "المحامي طارق العمري (تجريبي)",
      specialties: ["criminal"],
      bio: "",
      city: "إربد",
      languages: ["ar"],
      consultationPrice: 0,
      availabilityStatus: "busy",
      consultationTypes: ["video"],
      verificationStatus: "pending",
      yearsExperience: 4,
      rating: 0,
      reviewCount: 0,
      completedCases: 0,
      responseTimeHours: 24,
      acceptingNewCases: true,
      preferredCategories: [],
      barNumber: "DEMO-4471",
      verificationInfo: "عضو نقابة المحامين الأردنيين منذ 2022 — مكتب في إربد.",
    },
    {
      id: "lawyer-demo-pending-2",
      profileId: "profile-lawyer-pending-2",
      fullName: "المحامية ريم الخطيب (تجريبي)",
      specialties: ["family"],
      bio: "",
      city: "الزرقاء",
      languages: ["ar", "en"],
      consultationPrice: 0,
      availabilityStatus: "busy",
      consultationTypes: ["phone"],
      verificationStatus: "more_info_requested",
      yearsExperience: 7,
      rating: 0,
      reviewCount: 0,
      completedCases: 0,
      responseTimeHours: 24,
      acceptingNewCases: true,
      preferredCategories: [],
      barNumber: "DEMO-3308",
      verificationInfo: "محامية أحوال شخصية.",
      verificationAdminNote: "الرجاء إرسال رقم القيد بالنقابة وسنة الانتساب.",
    },
  ];

  const reports: Report[] = [
    {
      id: "report-1",
      reporterId: DEMO_USER_ID,
      targetType: "lawyer",
      targetId: "lawyer-demo-3",
      reason: "تأخر في الرد",
      details: "لم يتم الرد على رسالتي منذ أسبوع (بلاغ تجريبي).",
      status: "open",
      createdAt: at(-30),
    },
  ];

  const systemEvents: SystemEvent[] = [
    { id: "se-1", kind: "ai_error", severity: "warning", message: "AI request timed out and was retried (sample).", createdAt: at(-6) },
  ];

  return {
    profiles: [citizen, lawyerProfile, adminProfile, ...otherClients],
    lawyers: demoLawyers.map((l) => ({ ...l })),
    pendingLawyers,
    cases,
    events,
    messages,
    caseDocuments,
    caseNotes,
    appointments,
    drafts,
    notifications,
    reports,
    systemEvents,
  };
}
