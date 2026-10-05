/**
 * Jordan's 12 governorates. The database stores the stable key (e.g. "amman");
 * the UI translates it, so an Arabic session shows "عمّان" and an English one "Amman".
 * Keep this list in sync with handle_new_user() in supabase/migrations/006.
 */
export const GOVERNORATES = [
  "amman",
  "irbid",
  "zarqa",
  "balqa",
  "madaba",
  "karak",
  "tafilah",
  "maan",
  "aqaba",
  "mafraq",
  "jerash",
  "ajloun",
] as const;

export type Governorate = (typeof GOVERNORATES)[number];

export const isGovernorate = (v: unknown): v is Governorate => typeof v === "string" && (GOVERNORATES as readonly string[]).includes(v);

// Free-text values saved before the list existed (Arabic or English spellings).
const LEGACY: Record<string, Governorate> = {
  "عمان": "amman", "عمّان": "amman", amman: "amman",
  "اربد": "irbid", "إربد": "irbid", irbid: "irbid",
  "الزرقاء": "zarqa", "زرقاء": "zarqa", zarqa: "zarqa",
  "البلقاء": "balqa", "السلط": "balqa", balqa: "balqa", "al balqa": "balqa",
  "مادبا": "madaba", madaba: "madaba",
  "الكرك": "karak", karak: "karak",
  "الطفيلة": "tafilah", tafilah: "tafilah", tafila: "tafilah",
  "معان": "maan", "معَان": "maan", maan: "maan", "ma'an": "maan",
  "العقبة": "aqaba", aqaba: "aqaba",
  "المفرق": "mafraq", mafraq: "mafraq",
  "جرش": "jerash", jerash: "jerash",
  "عجلون": "ajloun", ajloun: "ajloun",
};

/** Maps a stored city value (key or legacy free text) to a governorate key, or null when unknown. */
export function governorateKey(value: string | undefined | null): Governorate | null {
  if (!value) return null;
  if (isGovernorate(value)) return value;
  return LEGACY[value.trim().toLowerCase()] ?? null;
}
