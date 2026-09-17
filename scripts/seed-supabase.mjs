// One-time seed script: creates the 3 "Try Demo" accounts (citizen/lawyer/
// admin, fixed password DEMO_PASSWORD below), 5 additional browse-only
// lawyer accounts for the marketplace, their reviews, and the reference
// legal-sources rows. Safe to re-run (skips anything that already exists).
//
// Usage: node scripts/seed-supabase.mjs
// Reads NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY from .env.local.

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

function loadEnvLocal() {
  try {
    const content = readFileSync(new URL("../.env.local", import.meta.url), "utf-8");
    for (const line of content.split("\n")) {
      const m = line.match(/^([A-Z_]+)=(.*)$/);
      if (m) process.env[m[1]] = m[2];
    }
  } catch {
    // ignore — env may already be set another way
  }
}
loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

const DEMO_PASSWORD = "Demo12345!";

async function createOrGetUser({ email, password, fullName, role, language = "ar", barNumber, specialty }) {
  const { data: created, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role, language, bar_number: barNumber, specialty },
  });
  if (created?.user) {
    console.log(`created ${role}: ${email}`);
    return created.user.id;
  }
  if (error && !String(error.message).toLowerCase().includes("already been registered")) {
    console.error(`failed to create ${email}:`, error.message);
    return null;
  }
  // Already exists — look it up.
  const { data: list } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const existing = list?.users.find((u) => u.email === email);
  if (existing) console.log(`exists ${role}: ${email}`);
  return existing?.id ?? null;
}

async function main() {
  // 1) Core demo accounts (fixed password, used by the "Try Demo" buttons).
  const citizenId = await createOrGetUser({
    email: "citizen.demo@qanuni.jo",
    password: DEMO_PASSWORD,
    fullName: "أحمد محمد الزعبي",
    role: "citizen",
  });
  const lawyerId = await createOrGetUser({
    email: "lawyer.demo@qanuni.jo",
    password: DEMO_PASSWORD,
    fullName: "المحامية لينا القاسم",
    role: "lawyer",
    barNumber: "DEMO-0001",
    specialty: "rental",
  });
  const adminId = await createOrGetUser({
    email: "admin.demo@qanuni.jo",
    password: DEMO_PASSWORD,
    fullName: "مدير المنصة",
    role: "citizen", // created as citizen; promoted to admin below.
  });

  if (citizenId) {
    await supabase.from("profiles").update({ phone: "+962 79 000 0001", city: "عمّان" }).eq("id", citizenId);
  }
  if (adminId) {
    await supabase.from("profiles").update({ role: "admin" }).eq("id", adminId);
  }

  // 2) Enrich the login-able demo lawyer with a full marketplace profile.
  if (lawyerId) {
    const { data: lawyerRow } = await supabase.from("lawyers").select("id").eq("profile_id", lawyerId).single();
    if (lawyerRow) {
      await supabase
        .from("lawyers")
        .update({
          specialties: ["rental", "civil", "real_estate"],
          bio: "محامية مختصة بالعقود العقارية وقضايا الإيجارات مع خبرة 9 سنوات في تمثيل المستأجرين والملاك أمام المحاكم الأردنية.",
          city: "عمّان",
          languages: ["ar", "en"],
          consultation_price: 25,
          availability_status: "available_today",
          consultation_types: ["video", "in_person", "phone"],
          verification_status: "demo_verified",
          years_experience: 9,
          rating: 4.8,
          review_count: 63,
          completed_cases: 214,
          response_time_hours: 2,
        })
        .eq("id", lawyerRow.id);

      await supabase.from("reviews").insert([
        { lawyer_id: lawyerRow.id, client_name: "أحمد م.", rating: 5, review: "ساعدتني بفهم عقد الإيجار خلال يوم واحد وكانت واضحة جداً بالشرح.", is_demo: true },
        { lawyer_id: lawyerRow.id, client_name: "منى س.", rating: 5, review: "تعاملت باحترافية عالية وتابعت قضيتي حتى النهاية.", is_demo: true },
        { lawyer_id: lawyerRow.id, client_name: "Yousef K.", rating: 4, review: "Clear, professional, and responded quickly to my questions.", is_demo: true },
      ]);
    }
  }

  // 3) Five additional browse-only lawyers for the marketplace (random
  // passwords — never used to log in via the demo flow).
  const extraLawyers = [
    { fullName: "المحامي خالد أبو نمر", specialties: ["employment", "commercial", "corporate"], bio: "متخصص في قانون العمل والشركات، يساعد الموظفين وأصحاب الأعمال في مراجعة العقود وحل النزاعات العمالية.", city: "عمّان", languages: ["ar", "en"], price: 30, availability: "available_this_week", types: ["video", "in_person"], years: 12, rating: 4.9, reviewCount: 88, completed: 301, responseHours: 4, email: "khaled.abunimr.demo@qanuni.jo" },
    { fullName: "المحامية رنا الطراونة", specialties: ["family", "civil"], bio: "تقدّم استشارات قانونية في قضايا الأسرة والأحوال المدنية بأسلوب متفهم وداعم للعملاء.", city: "إربد", languages: ["ar"], price: 20, availability: "available_today", types: ["phone", "video"], years: 6, rating: 4.6, reviewCount: 41, completed: 132, responseHours: 3, email: "rana.tarawneh.demo@qanuni.jo" },
    { fullName: "المحامي عمر السعودي", specialties: ["criminal", "civil"], bio: "خبرة واسعة في القضايا الجزائية والمدنية أمام محاكم الدرجة الأولى والاستئناف.", city: "الزرقاء", languages: ["ar", "en"], price: 35, availability: "busy", types: ["in_person"], years: 15, rating: 4.7, reviewCount: 97, completed: 410, responseHours: 8, email: "omar.saudi.demo@qanuni.jo" },
    { fullName: "المحامية سارة النابلسي", specialties: ["rental", "commercial", "real_estate"], bio: "متخصصة في العقود التجارية والعقارية، تساعد الأفراد والشركات الصغيرة في صياغة عقود متوازنة.", city: "عمّان", languages: ["ar", "en"], price: 28, availability: "available_this_week", types: ["video", "phone"], years: 7, rating: 4.5, reviewCount: 29, completed: 96, responseHours: 5, email: "sara.nabulsi.demo@qanuni.jo" },
    { fullName: "المحامي يزن الحديد", specialties: ["corporate", "commercial"], bio: "يقدم استشارات قانونية للشركات الناشئة في التأسيس والعقود والامتثال التنظيمي.", city: "عمّان", languages: ["en", "ar"], price: 40, availability: "available_today", types: ["video"], years: 10, rating: 4.9, reviewCount: 54, completed: 178, responseHours: 1, email: "yazan.hadid.demo@qanuni.jo" },
  ];

  for (const lw of extraLawyers) {
    const randomPassword = `Seed-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
    const profileId = await createOrGetUser({
      email: lw.email,
      password: randomPassword,
      fullName: lw.fullName,
      role: "lawyer",
      specialty: lw.specialties[0],
    });
    if (!profileId) continue;
    const { data: lawyerRow } = await supabase.from("lawyers").select("id").eq("profile_id", profileId).single();
    if (!lawyerRow) continue;
    await supabase
      .from("lawyers")
      .update({
        specialties: lw.specialties,
        bio: lw.bio,
        city: lw.city,
        languages: lw.languages,
        consultation_price: lw.price,
        availability_status: lw.availability,
        consultation_types: lw.types,
        verification_status: "demo_verified",
        years_experience: lw.years,
        rating: lw.rating,
        review_count: lw.reviewCount,
        completed_cases: lw.completed,
        response_time_hours: lw.responseHours,
      })
      .eq("id", lawyerRow.id);
  }

  // 4) Reference legal sources (unverified demo placeholders, honestly labeled).
  const { data: existingSources } = await supabase.from("legal_sources").select("id").limit(1);
  if (!existingSources?.length) {
    await supabase.from("legal_sources").insert([
      {
        title_ar: "قانون المالكين والمستأجرين الأردني",
        title_en: "Jordanian Landlord and Tenant Law",
        article: "المادة 8 (نموذج توضيحي)",
        excerpt_ar: "تنظم هذه المادة أحكام إنهاء عقد الإيجار قبل موعده وما يترتب على ذلك من التزامات مالية على المستأجر، وفق الشروط المتفق عليها في العقد.",
        excerpt_en: "This article addresses early termination of a lease and the financial obligations that may result, subject to the terms agreed in the contract.",
        source_type: "demo_dataset",
        verified: false,
        is_demo_placeholder: true,
      },
      {
        title_ar: "القانون المدني الأردني",
        title_en: "Jordanian Civil Code",
        article: "المادة 202 (نموذج توضيحي)",
        excerpt_ar: "يجوز للطرفين الاتفاق على شرط جزائي يستحق عند الإخلال بالتزام تعاقدي، على أن يكون متناسباً مع الضرر الفعلي.",
        excerpt_en: "Parties may agree on a penalty clause payable upon breach of a contractual obligation, provided it is proportionate to actual harm.",
        source_type: "demo_dataset",
        verified: false,
        is_demo_placeholder: true,
      },
      {
        title_ar: "قانون العمل الأردني رقم 8 لسنة 1996",
        title_en: "Jordanian Labour Law No. 8 of 1996",
        article: "المادة 23 (نموذج توضيحي)",
        excerpt_ar: "تحدد هذه المادة شروط إنهاء عقد العمل وفترات الإشعار الواجب اتباعها من قبل الطرفين.",
        excerpt_en: "This article sets out the conditions for terminating an employment contract and the notice periods each party must follow.",
        source_type: "demo_dataset",
        verified: false,
        is_demo_placeholder: true,
      },
      {
        title_ar: "قانون العمل الأردني رقم 8 لسنة 1996",
        title_en: "Jordanian Labour Law No. 8 of 1996",
        article: "المادة 31 (نموذج توضيحي)",
        excerpt_ar: "تتناول هذه المادة استحقاقات نهاية الخدمة ومكافأة العامل عند إنهاء العقد.",
        excerpt_en: "This article addresses end-of-service entitlements and severance pay upon contract termination.",
        source_type: "demo_dataset",
        verified: false,
        is_demo_placeholder: true,
      },
      {
        title_ar: "القانون المدني الأردني",
        title_en: "Jordanian Civil Code",
        article: "المادة 360 (نموذج توضيحي)",
        excerpt_ar: "يُلزم كل من أحدث ضرراً للغير بالتعويض، ما لم يثبت أن الضرر نشأ عن سبب لا يد له فيه.",
        excerpt_en: "A party who causes harm to another is generally liable for compensation, unless the harm arose from a cause beyond their control.",
        source_type: "demo_dataset",
        verified: false,
        is_demo_placeholder: true,
      },
      {
        title_ar: "قانون التجارة الأردني",
        title_en: "Jordanian Commercial Code",
        article: "المادة 12 (نموذج توضيحي)",
        excerpt_ar: "تُعنى هذه المادة بشروط صحة العقود التجارية وآثار الإخلال بالالتزامات المتبادلة.",
        excerpt_en: "This article concerns the validity conditions of commercial contracts and the effects of breaching mutual obligations.",
        source_type: "demo_dataset",
        verified: false,
        is_demo_placeholder: true,
      },
    ]);
    console.log("inserted legal_sources");
  } else {
    console.log("legal_sources already seeded");
  }

  console.log("\nDone. Demo login password for citizen.demo@qanuni.jo / lawyer.demo@qanuni.jo / admin.demo@qanuni.jo:");
  console.log(DEMO_PASSWORD);
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
