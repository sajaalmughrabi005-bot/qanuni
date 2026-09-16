"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Link } from "@/i18n/navigation";
import { useSession } from "@/lib/auth/use-session";
import { useAppStore } from "@/lib/store/app-store";
import { cn } from "@/lib/utils";

export function WriteReviewForm({ lawyerId }: { lawyerId: string }) {
  const t = useTranslations("marketplace.profile");
  const { session, profile } = useSession();
  const addReview = useAppStore((s) => s.addReview);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (!session || !profile) {
    return (
      <Card>
        <CardContent className="flex items-center justify-between gap-3 p-4 text-sm text-foreground-muted">
          {t("loginToReview")}
          <Button asChild size="sm" variant="outline">
            <Link href="/login">{t("requestConsultation")}</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (submitted) {
    return (
      <Card>
        <CardContent className="p-4 text-sm text-foreground-muted">{t("reviewSubmitted")}</CardContent>
      </Card>
    );
  }

  const submit = () => {
    if (!rating) return;
    addReview({ lawyerId, clientName: profile.fullName, rating, review: comment.trim() });
    toast.success(t("reviewSubmitted"));
    setSubmitted(true);
  };

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <p className="text-sm font-medium">{t("writeReview")}</p>
        <div className="space-y-1.5">
          <Label className="text-xs">{t("yourRating")}</Label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                onMouseEnter={() => setHoverRating(n)}
                onMouseLeave={() => setHoverRating(0)}
                aria-label={`${n}`}
              >
                <Star
                  className={cn(
                    "h-6 w-6 transition-colors",
                    n <= (hoverRating || rating) ? "fill-gold text-gold" : "text-foreground-muted"
                  )}
                />
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">{t("yourReview")}</Label>
          <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder={t("yourReviewPlaceholder")} />
        </div>
        <Button variant="gold" size="sm" onClick={submit} disabled={!rating}>
          {t("submitReview")}
        </Button>
      </CardContent>
    </Card>
  );
}
