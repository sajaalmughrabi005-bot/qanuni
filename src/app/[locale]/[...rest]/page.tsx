import { notFound } from "next/navigation";

// Catches any URL under a locale that doesn't match a real route, so the
// branded, translated [locale]/not-found.tsx renders instead of the plain
// root fallback (Next.js only shows a segment's not-found.tsx when
// notFound() is explicitly triggered within that segment).
export default function CatchAll() {
  notFound();
}
