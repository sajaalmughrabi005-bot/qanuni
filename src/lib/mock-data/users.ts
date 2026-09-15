import { Profile } from "@/types";
import { DEMO_USER_ID } from "./contract";
import { DEMO_LAWYER_ID } from "./lawyers";

export const ADMIN_USER_ID = "user-admin-demo";

export const demoProfiles: Record<string, Profile> = {
  [DEMO_USER_ID]: {
    id: DEMO_USER_ID,
    fullName: "أحمد محمد الزعبي",
    email: "citizen.demo@qanuni.jo",
    phone: "+962 79 000 0001",
    role: "citizen",
    language: "ar",
    city: "عمّان",
    createdAt: "2026-08-01T00:00:00.000Z",
  },
  [DEMO_LAWYER_ID]: {
    id: DEMO_LAWYER_ID,
    fullName: "المحامية لينا القاسم",
    email: "lawyer.demo@qanuni.jo",
    phone: "+962 79 000 0002",
    role: "lawyer",
    language: "ar",
    city: "عمّان",
    createdAt: "2026-05-01T00:00:00.000Z",
  },
  [ADMIN_USER_ID]: {
    id: ADMIN_USER_ID,
    fullName: "مدير المنصة",
    email: "admin.demo@qanuni.jo",
    role: "admin",
    language: "ar",
    createdAt: "2026-01-01T00:00:00.000Z",
  },
};
