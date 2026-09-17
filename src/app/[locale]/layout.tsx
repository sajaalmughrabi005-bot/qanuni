import type { Metadata } from "next";
import Script from "next/script";
import { Manrope, IBM_Plex_Sans_Arabic } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { StoreHydration } from "@/components/providers/store-hydration";
import { ThemeSync } from "@/components/providers/theme-sync";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { AiAssistantWidget } from "@/components/shared/ai-assistant-widget";
import "../globals.css";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-latin", display: "swap" });
const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-arabic",
  display: "swap",
});

const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("qanuni-theme");
    var theme = stored || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", theme);
  } catch (e) {}
})();
`;

const SITE_URL = "https://qanuni.site";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isAr = locale === "ar";
  const title = "قانوني QANUNI";
  const description = isAr
    ? "افهم حقك قبل ما توقّع. حلّل عقدك، افهم البنود، واكتشف البنود التي تحتاج تنتبه لها — بالذكاء الاصطناعي وبسياق القانون الأردني."
    : "Understand your rights before you sign. Analyze your contract, understand its clauses, and spot the ones worth your attention — with AI grounded in Jordanian law.";

  return {
    metadataBase: new URL(SITE_URL),
    title: { default: title, template: `%s | ${title}` },
    description,
    alternates: {
      canonical: `/${locale}`,
      languages: { ar: "/ar", en: "/en" },
    },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/${locale}`,
      siteName: title,
      locale: isAr ? "ar_JO" : "en_US",
      type: "website",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <head>
        <Script id="theme-init" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className={`${manrope.variable} ${plexArabic.variable} antialiased`}>
        <NextIntlClientProvider>
          <StoreHydration>
            <ThemeSync />
            <TooltipProvider delayDuration={200}>
              {children}
              <AiAssistantWidget />
              <Toaster position={dir === "rtl" ? "bottom-left" : "bottom-right"} dir={dir} />
            </TooltipProvider>
          </StoreHydration>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
