"use client";

import { useTranslations } from "next-intl";
import { Star, MapPin, Clock, ShieldCheck, Heart } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Lawyer } from "@/types";
import { initials, cn } from "@/lib/utils";
import { useSession } from "@/lib/auth/use-session";
import { useSavedLawyerIds } from "@/lib/data/hooks";
import { setLawyerSaved } from "@/lib/data/actions";
import { useRouter } from "@/i18n/navigation";

export function LawyerCard({ lawyer, matchScore }: { lawyer: Lawyer; matchScore?: number }) {
  const t = useTranslations("marketplace");
  const tSpec = useTranslations("marketplace.specialties");
  const tAvail = useTranslations("marketplace.availability");
  const router = useRouter();
  const { session } = useSession();
  const { ids: savedIds, refetch } = useSavedLawyerIds();
  const saved = savedIds.includes(lawyer.id);

  const toggle = async () => {
    // Saving is a personal, account-bound feature: send guests to sign in first.
    if (!session) return router.push("/login?next=/lawyers");
    await setLawyerSaved(session.userId, lawyer.id, !saved);
    await refetch();
  };

  return (
    <Card className="relative h-full transition hover:-translate-y-0.5 hover:shadow-md">
      <button
        onClick={(e) => {
          e.preventDefault();
          void toggle();
        }}
        className="absolute end-4 top-4 z-10 rounded-full bg-surface p-1.5 shadow-sm"
        aria-label={t("card.save")}
        aria-pressed={saved}
      >
        <Heart className={cn("h-4 w-4", saved ? "fill-risk-high text-risk-high" : "text-foreground-muted")} />
      </button>
      <Link href={`/lawyers/${lawyer.id}`}>
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <Avatar className="h-12 w-12">
              {lawyer.avatarUrl && <AvatarImage src={lawyer.avatarUrl} alt={lawyer.fullName} />}
              <AvatarFallback>{initials(lawyer.fullName)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1 truncate font-semibold">
                {lawyer.fullName}
                {lawyer.verificationStatus === "approved" && <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-gold" aria-label={t("card.verifiedDemo")} />}
              </p>
              <p className="flex items-center gap-1 text-xs text-foreground-muted">
                <MapPin className="h-3 w-3" />
                {lawyer.city}
              </p>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {lawyer.specialties.slice(0, 2).map((s) => (
              <Badge key={s} variant="subtle">
                {tSpec(s)}
              </Badge>
            ))}
          </div>

          <p className="mt-3 line-clamp-2 text-sm text-foreground-muted">{lawyer.bio}</p>

          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="flex items-center gap-1 font-medium">
              <Star className="h-3.5 w-3.5 fill-gold text-gold" />
              {lawyer.rating} · {t("card.reviewsCount", { count: lawyer.reviewCount })}
            </span>
            <span className="font-semibold text-ink">
              {lawyer.consultationPrice} {t("card.perConsultation")}
            </span>
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-foreground-muted">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {t("card.responseTime", { hours: lawyer.responseTimeHours })}
            </span>
            <Badge variant={lawyer.acceptingNewCases && lawyer.availabilityStatus === "available_today" ? "low" : "subtle"}>
              {lawyer.acceptingNewCases ? tAvail(lawyer.availabilityStatus) : t("card.notAccepting")}
            </Badge>
          </div>

          {matchScore !== undefined && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-gold/10 px-2.5 py-1.5 text-xs font-medium text-gold">
              <ShieldCheck className="h-3.5 w-3.5" />
              {t("card.matchPercent", { percent: matchScore })}
            </div>
          )}

          <Button size="sm" variant="outline" className="mt-4 w-full">
            {t("card.viewProfile")}
          </Button>
        </CardContent>
      </Link>
    </Card>
  );
}
