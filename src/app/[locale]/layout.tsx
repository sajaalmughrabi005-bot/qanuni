import type { Metadata } from "next";
import { Inter, Tajawal } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { StoreHydration } from "@/components/providers/store-hydration";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import "../globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-latin", display: "swap" });
const tajawal = Tajawal({
  subsets: ["arabic"],
  weight: ["300", "400", "500", "700", "800"],
  variable: "--font-arabic",
  display: "swap",
});

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
      <body className={`${inter.variable} ${tajawal.variable} antialiased`}>
        <NextIntlClientProvider>
          <StoreHydration>
            <TooltipProvider delayDuration={200}>
              {children}
              <Toaster position={dir === "rtl" ? "bottom-left" : "bottom-right"} dir={dir} />
            </TooltipProvider>
          </StoreHydration>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
