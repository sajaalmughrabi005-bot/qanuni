import { getTranslations } from "next-intl/server";
import {
  FileSearch,
  Brain,
  MessagesSquare,
  Users,
  ArrowRight,
  ArrowLeft,
  Upload,
  Sparkles,
  MessageCircleQuestion,
  ShieldCheck,
  Languages,
  Lock,
  ClipboardList,
  Gavel,
  Calendar,
  FileEdit,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Reveal } from "@/components/shared/reveal";
import { DemoEntryButtons } from "@/components/shared/demo-entry-buttons";

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("landing");
  const ArrowIcon = locale === "ar" ? ArrowLeft : ArrowRight;

  const loopSteps = [
    { key: "understand", icon: FileSearch },
    { key: "identify", icon: Brain },
    { key: "ask", icon: MessageCircleQuestion },
    { key: "connect", icon: Users },
    { key: "act", icon: Gavel },
  ] as const;

  const howSteps = [
    { key: "step1", icon: Upload },
    { key: "step2", icon: Sparkles },
    { key: "step3", icon: MessagesSquare },
    { key: "step4", icon: Users },
  ] as const;

  const citizenFeatures = ["f1", "f2", "f3", "f4"] as const;
  const lawyerFeatures = [
    { key: "f1", icon: ClipboardList },
    { key: "f2", icon: Brain },
    { key: "f3", icon: FileEdit },
    { key: "f4", icon: Calendar },
  ] as const;

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-navy text-white">
        <div className="absolute inset-0 opacity-[0.07] [background-image:radial-gradient(circle_at_20%_20%,white,transparent_35%),radial-gradient(circle_at_80%_60%,white,transparent_35%)]" />
        <div className="relative mx-auto max-w-5xl px-4 py-24 text-center sm:px-6 sm:py-32">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs text-gold-light">
              <Sparkles className="h-3.5 w-3.5" />
              {t("hero.trustBadge")}
            </span>
          </Reveal>
          <Reveal delay={0.08}>
            <h1 className="mt-6 text-4xl font-bold leading-tight sm:text-5xl md:text-6xl">
              {t("hero.title")}
            </h1>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-white/75">{t("hero.subtitle")}</p>
          </Reveal>
          <Reveal delay={0.24}>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg" variant="gold">
                <Link href="/analyze/new">
                  {t("hero.ctaPrimary")}
                  <ArrowIcon className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/25 bg-transparent text-white hover:bg-white/10">
                <Link href="/lawyers">{t("hero.ctaSecondary")}</Link>
              </Button>
              <Button asChild size="lg" variant="ghost" className="text-white hover:bg-white/10">
                <Link href="/login">{t("hero.ctaTertiary")}</Link>
              </Button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Core loop */}
      <section className="border-b border-border bg-surface-muted/40 py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal>
            <h2 className="text-center text-xl font-semibold text-foreground-muted">{t("loop.title")}</h2>
          </Reveal>
          <div className="mt-10 grid gap-4 sm:grid-cols-5">
            {loopSteps.map(({ key, icon: Icon }, i) => (
              <Reveal key={key} delay={i * 0.06}>
                <div className="flex flex-col items-center gap-3 text-center">
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-navy text-gold shadow-sm">
                    <Icon className="h-6 w-6" />
                  </span>
                  <p className="font-semibold">{t(`loop.${key}`)}</p>
                  <p className="text-sm text-foreground-muted">{t(`loop.${key}Desc`)}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal className="mx-auto max-w-xl text-center">
            <h2 className="text-3xl font-bold">{t("howItWorks.title")}</h2>
            <p className="mt-3 text-foreground-muted">{t("howItWorks.subtitle")}</p>
          </Reveal>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {howSteps.map(({ key, icon: Icon }, i) => (
              <Reveal key={key} delay={i * 0.08}>
                <Card className="h-full">
                  <CardContent className="p-6">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold/10 text-gold">
                      <Icon className="h-5 w-5" />
                    </span>
                    <p className="mt-4 font-semibold">{t(`howItWorks.${key}Title`)}</p>
                    <p className="mt-2 text-sm text-foreground-muted">{t(`howItWorks.${key}Desc`)}</p>
                  </CardContent>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Citizen features */}
      <section className="bg-navy py-20 text-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal className="mx-auto max-w-xl text-center">
            <h2 className="text-3xl font-bold">{t("citizenFeatures.title")}</h2>
            <p className="mt-3 text-white/70">{t("citizenFeatures.subtitle")}</p>
          </Reveal>
          <div className="mt-14 grid gap-6 sm:grid-cols-2">
            {citizenFeatures.map((key, i) => (
              <Reveal key={key} delay={i * 0.08}>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                  <p className="font-semibold text-gold-light">{t(`citizenFeatures.${key}Title`)}</p>
                  <p className="mt-2 text-sm text-white/70">{t(`citizenFeatures.${key}Desc`)}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Lawyer features */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal className="mx-auto max-w-xl text-center">
            <h2 className="text-3xl font-bold">{t("lawyerFeatures.title")}</h2>
            <p className="mt-3 text-foreground-muted">{t("lawyerFeatures.subtitle")}</p>
          </Reveal>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {lawyerFeatures.map(({ key, icon: Icon }, i) => (
              <Reveal key={key} delay={i * 0.08}>
                <Card className="h-full">
                  <CardContent className="p-6">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy/5 text-navy">
                      <Icon className="h-5 w-5" />
                    </span>
                    <p className="mt-4 font-semibold">{t(`lawyerFeatures.${key}Title`)}</p>
                    <p className="mt-2 text-sm text-foreground-muted">{t(`lawyerFeatures.${key}Desc`)}</p>
                  </CardContent>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Security + bilingual + AI capabilities */}
      <section className="border-y border-border bg-surface-muted/40 py-20">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:px-6 md:grid-cols-3">
          <Reveal>
            <div className="rounded-2xl bg-surface p-7 shadow-sm">
              <ShieldCheck className="h-7 w-7 text-gold" />
              <p className="mt-4 font-semibold">{t("security.title")}</p>
              <p className="mt-2 text-sm text-foreground-muted">{t("security.subtitle")}</p>
              <ul className="mt-4 space-y-1.5 text-sm text-foreground-muted">
                <li>• {t("security.p1")}</li>
                <li>• {t("security.p2")}</li>
                <li>• {t("security.p3")}</li>
              </ul>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="rounded-2xl bg-surface p-7 shadow-sm">
              <Languages className="h-7 w-7 text-gold" />
              <p className="mt-4 font-semibold">{t("bilingual.title")}</p>
              <p className="mt-2 text-sm text-foreground-muted">{t("bilingual.subtitle")}</p>
            </div>
          </Reveal>
          <Reveal delay={0.16}>
            <div className="rounded-2xl bg-surface p-7 shadow-sm">
              <Lock className="h-7 w-7 text-gold" />
              <p className="mt-4 font-semibold">{t("aiCapabilities.title")}</p>
              <p className="mt-2 text-sm text-foreground-muted">{t("aiCapabilities.subtitle")}</p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Demo entry */}
      <section className="py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <Reveal className="mx-auto max-w-xl text-center">
            <h2 className="text-3xl font-bold">{t("demoEntry.title")}</h2>
            <p className="mt-3 text-foreground-muted">{t("demoEntry.subtitle")}</p>
          </Reveal>
          <div className="mt-10">
            <DemoEntryButtons />
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-gold/10 py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-bold text-navy">{t("finalCta.title")}</h2>
          <p className="mt-3 text-foreground-muted">{t("finalCta.subtitle")}</p>
          <Button asChild size="lg" className="mt-8" variant="gold">
            <Link href="/analyze/new">
              {t("finalCta.cta")}
              <ArrowIcon className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
