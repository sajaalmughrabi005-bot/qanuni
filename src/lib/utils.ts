import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, locale: string) {
  return new Intl.NumberFormat(locale === "ar" ? "ar-JO" : "en-JO", {
    style: "currency",
    currency: "JOD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string | Date, locale: string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-JO" : "en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(d);
}

export function formatDateTime(date: string | Date, locale: string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-JO" : "en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function formatMonthYear(date: Date, locale: string) {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-JO" : "en-GB", {
    month: "long",
    year: "numeric",
  }).format(date);
}

export function formatDayNumber(date: Date, locale: string) {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-JO" : "en-GB", { day: "numeric" }).format(date);
}

export function formatWeekdayShort(date: Date, locale: string) {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-JO" : "en-GB", { weekday: "short" }).format(date);
}

export function formatWeekdayLong(date: Date, locale: string) {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-JO" : "en-GB", { weekday: "long", month: "long", day: "numeric" }).format(date);
}

export function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("");
}

const PRAVATAR_COUNT = 70;

function hashToInt(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function lawyerAvatarUrl(lawyer: { id: string; avatarUrl?: string }) {
  if (lawyer.avatarUrl) return lawyer.avatarUrl;
  const index = (hashToInt(lawyer.id) % PRAVATAR_COUNT) + 1;
  return `https://i.pravatar.cc/150?img=${index}`;
}
