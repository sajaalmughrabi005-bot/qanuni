"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { CheckCircle2, Scale } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { useAppStore } from "@/lib/store/app-store";

function ResetPasswordInner() {
  const t = useTranslations("auth.resetPassword");
  const tc = useTranslations("common");
  const params = useSearchParams();
  const token = params.get("token");
  const resetPassword = useAppStore((s) => s.resetPassword);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [tokenError, setTokenError] = useState<"invalid_token" | "expired_token" | "used_token" | null>(null);

  if (!token) {
    return (
      <EmptyState
        icon={Scale}
        title={t("missingToken")}
        className="mx-auto mt-16 max-w-lg"
        action={
          <Link href="/forgot-password" className="text-sm text-navy hover:underline dark:text-gold">
            {t("requestNewLink")}
          </Link>
        }
      />
    );
  }

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
    const result = await resetPassword(token, password);
    setSubmitting(false);
    if (!result.ok) {
      setTokenError(result.error);
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
            {success ? (
              <div className="flex flex-col items-center gap-3 text-center">
                <CheckCircle2 className="h-10 w-10 text-risk-low" />
                <p className="text-sm">{t("success")}</p>
                <Button asChild variant="gold" className="mt-2 w-full">
                  <Link href="/login">{t("goToLogin")}</Link>
                </Button>
              </div>
            ) : tokenError ? (
              <div className="flex flex-col items-center gap-3 text-center">
                <p className="text-sm text-risk-high">
                  {t(
                    tokenError === "invalid_token"
                      ? "invalidToken"
                      : tokenError === "expired_token"
                        ? "expiredToken"
                        : "usedToken"
                  )}
                </p>
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
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      minLength={8}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="confirmPassword">{t("confirmPassword")}</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
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

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordInner />
    </Suspense>
  );
}
