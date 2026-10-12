/** Exact JOD decimal input. Empty/NaN/exponents/extra precision are invalid,
 * not implicitly free. Existing product ceiling remains 10,000 JOD. */
export function parseConsultationPrice(value: unknown): number | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const text = String(value).trim();
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null;
  const price = Number(text);
  return Number.isFinite(price) && price >= 0 && price <= 10000 ? price : null;
}
