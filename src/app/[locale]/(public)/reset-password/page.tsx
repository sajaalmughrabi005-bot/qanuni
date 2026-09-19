"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { CheckCircle2, Scale } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useSession } from "@/lib/auth/use-session";
import { updatePasswordAction } from "@/lib/auth/actions";
import { Skeleton } from "@/components/ui/skeleton";

export default function ResetPasswordPage() {
  const t = useTranslations("auth.resetPassword");
  const tc = useTranslations("common");
  const { session, loading } = useSession();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (password.length < 8) {
      toast.error(t("passwordTooShort"));
      return;
    }
    if (password !== confirmPassword) {
      toast.error(t("passwordMismatch"));
      return;
    }
    setSubmitting(true);
    const result = await updatePasswordAction(password);
    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setSuccess(true);
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
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : success ? (
              <div className="flex flex-col items-center gap-3 text-center">
                <CheckCircle2 className="h-10 w-10 text-risk-low" />
                <p className="text-sm">{t("success")}</p>
                <Button asChild variant="gold" className="mt-2 w-full">
                  <Link href="/login">{t("goToLogin")}</Link>
                </Button>
              </div>
            ) : !session ? (
              <div className="flex flex-col items-center gap-3 text-center">
                <p className="text-sm text-risk-high">{t("invalidToken")}</p>
                <Button asChild variant="outline" className="mt-2 w-full">
                  <Link href="/forgot-password">{t("requestNewLink")}</Link>
                </Button>
              </div>
            ) : (
              <>
                <h1 className="text-xl font-semibold">{t("title")}</h1>
                <p className="mt-1 text-sm text-foreground-muted">{t("subtitle")}</p>
                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="password">{t("newPassword")}</Label>
                    <PasswordInput
                      id="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      minLength={8}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="confirmPassword">{t("confirmPassword")}</Label>
                    <PasswordInput
                      id="confirmPassword"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      minLength={8}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={submitting}>
                    {t("submit")}
                  </Button>
                </form>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
