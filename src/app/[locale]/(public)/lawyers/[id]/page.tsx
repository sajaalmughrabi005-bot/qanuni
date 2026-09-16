"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Star, MapPin, Clock, Briefcase, Languages as LanguagesIcon, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { RequestConsultationDialog } from "@/components/citizen/request-consultation-dialog";
import { reviews as allReviews } from "@/lib/mock-data";
import { useLawyer } from "@/lib/auth/use-lawyer";
import { initials, formatDate } from "@/lib/utils";

export default function LawyerProfilePage() {
  const params = useParams<{ id: string }>();
  const t = useTranslations("marketplace.profile");
  const tSpec = useTranslations("marketplace.specialties");
  const tAvail = useTranslations("marketplace.availability");
  const tCard = useTranslations("marketplace.card");
  const tTypes = useTranslations("lawyer.calendar.types");
  const locale = useLocale();
  const [dialogOpen, setDialogOpen] = useState(false);

  const lawyer = useLawyer(params.id);
  const reviews = allReviews.filter((r) => r.lawyerId === params.id);

  if (!lawyer) {
    return <EmptyState icon={Briefcase} title="Not found" className="mx-auto mt-16 max-w-lg" />;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <Card>
        <CardContent className="p-8">
          <div className="flex flex-col items-start gap-5 sm:flex-row">
            <Avatar className="h-20 w-20 text-xl">
              <AvatarFallback>{initials(lawyer.fullName)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold">{lawyer.fullName}</h1>
                {lawyer.verificationStatus === "demo_verified" && (
                  <Badge variant="gold" className="gap-1">
                    <ShieldCheck className="h-3 w-3" />
                    {tCard("verifiedDemo")}
                  </Badge>
                )}
              </div>
              <p className="mt-1 flex items-center gap-1 text-sm text-foreground-muted">
                <MapPin className="h-3.5 w-3.5" />
                {lawyer.city}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {lawyer.specialties.map((s) => (
                  <Badge key={s} variant="subtle">
                    {tSpec(s)}
                  </Badge>
                ))}
              </div>
              <p className="mt-4 text-sm text-foreground-muted">{lawyer.bio}</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 border-t border-border pt-6 sm:grid-cols-4">
            <div>
              <p className="text-xs text-foreground-muted">{t("experience")}</p>
              <p className="mt-1 font-semibold">{tCard("yearsExperience", { years: lawyer.yearsExperience })}</p>
            </div>
            <div>
              <p className="text-xs text-foreground-muted">{t("languages")}</p>
              <p className="mt-1 flex items-center gap-1 font-semibold">
                <LanguagesIcon className="h-3.5 w-3.5" />
                {lawyer.languages.join(" / ")}
              </p>
            </div>
            <div>
              <p className="text-xs text-foreground-muted">{t("pricing")}</p>
              <p className="mt-1 font-semibold">
                {lawyer.consultationPrice} {tCard("perConsultation")}
              </p>
            </div>
            <div>
              <p className="text-xs text-foreground-muted">{t("availability")}</p>
              <Badge variant={lawyer.availabilityStatus === "available_today" ? "low" : "subtle"} className="mt-1">
                {tAvail(lawyer.availabilityStatus)}
              </Badge>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-4 border-t border-border pt-6 text-sm">
            <span className="flex items-center gap-1 font-medium">
              <Star className="h-4 w-4 fill-gold text-gold" />
              {lawyer.rating} ({tCard("reviewsCount", { count: lawyer.reviewCount })})
            </span>
            <span className="flex items-center gap-1 text-foreground-muted">
              <Clock className="h-3.5 w-3.5" />
              {tCard("responseTime", { hours: lawyer.responseTimeHours })}
            </span>
            <span className="text-foreground-muted">{t("completedCases")}: {lawyer.completedCases}</span>
          </div>

          <div className="mt-6">
            <p className="mb-2 text-sm font-medium">{t("consultationTypes")}</p>
            <div className="flex flex-wrap gap-2">
              {lawyer.consultationTypes.map((ct) => (
                <Badge key={ct} variant="outline">
                  {tTypes(ct)}
                </Badge>
              ))}
            </div>
          </div>

          <Button variant="gold" size="lg" className="mt-8 w-full sm:w-auto" onClick={() => setDialogOpen(true)}>
            {t("requestConsultation")}
          </Button>
        </CardContent>
      </Card>

      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t("reviews")}</h2>
          <span className="text-xs text-foreground-muted">{t("demoReviewNotice")}</span>
        </div>
        <div className="space-y-3">
          {reviews.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{r.clientName}</p>
                  <span className="flex items-center gap-1 text-sm">
                    <Star className="h-3.5 w-3.5 fill-gold text-gold" />
                    {r.rating}
                  </span>
                </div>
                <p className="mt-1.5 text-sm text-foreground-muted">{r.review}</p>
                <p className="mt-1.5 text-xs text-foreground-muted">{formatDate(r.createdAt, locale)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <RequestConsultationDialog lawyer={lawyer} open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
