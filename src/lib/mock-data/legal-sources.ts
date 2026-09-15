import { LegalSource } from "@/types";

export const legalSources: LegalSource[] = [
  {
    id: "ls-1",
    titleAr: "قانون المالكين والمستأجرين الأردني",
    titleEn: "Jordanian Landlord and Tenant Law",
    article: "المادة 8 (نموذج توضيحي)",
    excerptAr:
      "تنظم هذه المادة أحكام إنهاء عقد الإيجار قبل موعده وما يترتب على ذلك من التزامات مالية على المستأجر، وفق الشروط المتفق عليها في العقد.",
    excerptEn:
      "This article addresses early termination of a lease and the financial obligations that may result, subject to the terms agreed in the contract.",
    sourceType: "demo_dataset",
    verified: false,
    isDemoPlaceholder: true,
  },
  {
    id: "ls-2",
    titleAr: "القانون المدني الأردني",
    titleEn: "Jordanian Civil Code",
    article: "المادة 202 (نموذج توضيحي)",
    excerptAr:
      "يجوز للطرفين الاتفاق على شرط جزائي يستحق عند الإخلال بالتزام تعاقدي، على أن يكون متناسباً مع الضرر الفعلي.",
    excerptEn:
      "Parties may agree on a penalty clause payable upon breach of a contractual obligation, provided it is proportionate to actual harm.",
    sourceType: "demo_dataset",
    verified: false,
    isDemoPlaceholder: true,
  },
  {
    id: "ls-3",
    titleAr: "قانون العمل الأردني رقم 8 لسنة 1996",
    titleEn: "Jordanian Labour Law No. 8 of 1996",
    article: "المادة 23 (نموذج توضيحي)",
    excerptAr: "تحدد هذه المادة شروط إنهاء عقد العمل وفترات الإشعار الواجب اتباعها من قبل الطرفين.",
    excerptEn:
      "This article sets out the conditions for terminating an employment contract and the notice periods each party must follow.",
    sourceType: "demo_dataset",
    verified: false,
    isDemoPlaceholder: true,
  },
  {
    id: "ls-4",
    titleAr: "قانون العمل الأردني رقم 8 لسنة 1996",
    titleEn: "Jordanian Labour Law No. 8 of 1996",
    article: "المادة 31 (نموذج توضيحي)",
    excerptAr: "تتناول هذه المادة استحقاقات نهاية الخدمة ومكافأة العامل عند إنهاء العقد.",
    excerptEn: "This article addresses end-of-service entitlements and severance pay upon contract termination.",
    sourceType: "demo_dataset",
    verified: false,
    isDemoPlaceholder: true,
  },
  {
    id: "ls-5",
    titleAr: "القانون المدني الأردني",
    titleEn: "Jordanian Civil Code",
    article: "المادة 360 (نموذج توضيحي)",
    excerptAr: "يُلزم كل من أحدث ضرراً للغير بالتعويض، ما لم يثبت أن الضرر نشأ عن سبب لا يد له فيه.",
    excerptEn:
      "A party who causes harm to another is generally liable for compensation, unless the harm arose from a cause beyond their control.",
    sourceType: "demo_dataset",
    verified: false,
    isDemoPlaceholder: true,
  },
  {
    id: "ls-6",
    titleAr: "قانون التجارة الأردني",
    titleEn: "Jordanian Commercial Code",
    article: "المادة 12 (نموذج توضيحي)",
    excerptAr: "تُعنى هذه المادة بشروط صحة العقود التجارية وآثار الإخلال بالالتزامات المتبادلة.",
    excerptEn:
      "This article concerns the validity conditions of commercial contracts and the effects of breaching mutual obligations.",
    sourceType: "demo_dataset",
    verified: false,
    isDemoPlaceholder: true,
  },
];

export const getLegalSource = (id?: string) =>
  id ? legalSources.find((s) => s.id === id) : undefined;
