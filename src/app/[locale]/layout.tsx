import type { Metadata } from "next";
import { Manrope, IBM_Plex_Sans_Arabic } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { StoreHydration } from "@/components/providers/store-hydration";
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

export const metadata: Metadata = {
  title: "قانوني QANUNI",
  description: "افهم حقك قبل ما توقّع. Understand your rights before you sign.",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
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
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className={`${manrope.variable} ${plexArabic.variable} antialiased`}>
        <NextIntlClientProvider>
          <StoreHydration>
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
