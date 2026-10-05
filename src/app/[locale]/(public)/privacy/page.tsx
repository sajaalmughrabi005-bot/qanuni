import { getLocale } from "next-intl/server";
import { LegalPage } from "@/components/shared/legal-page";
import { privacy } from "@/lib/legal-content";

export default async function PrivacyPage() {
  const locale = (await getLocale()) === "ar" ? "ar" : "en";
  return <LegalPage doc={privacy[locale]} />;
}
