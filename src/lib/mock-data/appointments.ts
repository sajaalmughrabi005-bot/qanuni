import { Appointment } from "@/types";
import { DEMO_USER_ID } from "./contract";
import { DEMO_LAWYER_ID } from "./lawyers";
import { DEMO_CASE_ID } from "./cases";

export const appointments: Appointment[] = [
  {
    id: "apt-1",
    clientId: DEMO_USER_ID,
    clientName: "أحمد محمد الزعبي",
    lawyerId: DEMO_LAWYER_ID,
    caseId: DEMO_CASE_ID,
    title: "استشارة أولية - عقد الإيجار",
    startTime: "2026-09-18T11:00:00.000Z",
    endTime: "2026-09-18T11:30:00.000Z",
    type: "video",
    status: "confirmed",
    location: "مكالمة فيديو",
  },
  {
    id: "apt-2",
    clientId: "user-citizen-2",
    clientName: "سلمى عودة",
    lawyerId: DEMO_LAWYER_ID,
    caseId: "case-demo-2",
    title: "متابعة قضية إنهاء العقد",
    startTime: "2026-09-17T09:00:00.000Z",
    endTime: "2026-09-17T09:30:00.000Z",
    type: "phone",
    status: "pending",
  },
  {
    id: "apt-3",
    clientId: "user-citizen-5",
    clientName: "معاذ الشوابكة",
    lawyerId: DEMO_LAWYER_ID,
    caseId: "case-demo-5",
    title: "جلسة محكمة - قضية إخلاء",
    startTime: "2026-09-28T08:30:00.000Z",
    endTime: "2026-09-28T10:00:00.000Z",
    type: "court",
    status: "confirmed",
    location: "محكمة صلح عمّان",
  },
  {
    id: "apt-4",
    clientId: "user-citizen-4",
    clientName: "دانا حجازين",
    lawyerId: DEMO_LAWYER_ID,
    caseId: "case-demo-4",
    title: "موعد نهائي: إرسال الإنذار العدلي",
    startTime: "2026-09-22T07:00:00.000Z",
    endTime: "2026-09-22T07:30:00.000Z",
    type: "deadline",
    status: "pending",
  },
];
