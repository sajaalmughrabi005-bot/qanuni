import { getLocale } from "next-intl/server";
import { LegalPage } from "@/components/shared/legal-page";
import { terms } from "@/lib/legal-content";

export default async function TermsPage() {
  const locale = (await getLocale()) === "ar" ? "ar" : "en";
  return <LegalPage doc={terms[locale]} />;
}
