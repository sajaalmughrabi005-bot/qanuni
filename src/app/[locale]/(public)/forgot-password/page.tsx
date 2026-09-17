"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Scale, TriangleAlert } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useAppStore } from "@/lib/store/app-store";

export default function ForgotPasswordPage() {
  const t = useTranslations("auth.forgotPassword");
  const tc = useTranslations("common");
  const locale = useLocale();
  const requestPasswordReset = useAppStore((s) => s.requestPasswordReset);

  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resetLink, setResetLink] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || !email.trim()) return;
    setSubmitting(true);
    const { resetToken } = await requestPasswordReset(email);
    setSubmitting(false);
    setResetLink(`${window.location.origin}/${locale}/reset-password?token=${resetToken}`);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-muted/40 px-4 py-16">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2 font-semibold text-ink">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-navy text-gold">
            <Scale className="h-4 w-4" />
          </span>
          <span className="text-xl">{tc("brand.name")}</span>
        </Link>

        <Card>
          <CardContent className="p-8">
            <h1 className="text-xl font-semibold">{t("title")}</h1>
            <p className="mt-1 text-sm text-foreground-muted">{t("subtitle")}</p>

            {!resetLink ? (
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">{t("email")}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {t("submit")}
                </Button>
              </form>
            ) : (
              <div className="mt-6 space-y-4">
                <p className="text-sm text-foreground-muted">{t("genericNotice")}</p>
                <div className="rounded-xl border border-gold/40 bg-gold/5 p-4">
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-gold">
                    <TriangleAlert className="h-4 w-4 shrink-0" />
                    {t("devModeTitle")}
                  </p>
                  <p className="mt-2 text-xs text-foreground-muted">{t("devModeNotice")}</p>
                  <a href={resetLink} className="mt-2 block break-all text-sm text-navy underline dark:text-gold">
                    {resetLink}
                  </a>
                </div>
              </div>
            )}

            <p className="mt-6 text-center text-sm text-foreground-muted">
              <Link href="/login" className="font-medium text-navy hover:underline dark:text-gold">
                {t("backToLogin")}
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
