"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Scale, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { signUpAction } from "@/lib/auth/actions";
import type { LawyerSpecialty } from "@/types";

const specialties: LawyerSpecialty[] = [
  "rental",
  "employment",
  "commercial",
  "family",
  "criminal",
  "real_estate",
  "corporate",
  "civil",
];

export default function SignUpPage() {
  const t = useTranslations("auth.signup");
  const tc = useTranslations("common");
  const tSpec = useTranslations("marketplace.specialties");
  const locale = useLocale() as "ar" | "en";

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"citizen" | "lawyer">("citizen");
  const [barNumber, setBarNumber] = useState("");
  const [specialty, setSpecialty] = useState<LawyerSpecialty>("rental");
  const [submitting, setSubmitting] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || !fullName || !email || !password) return;
    if (password.length < 8) {
      toast.error(t("passwordTooShort"));
      return;
    }
    setSubmitting(true);
    const result = await signUpAction({
      fullName,
      email,
      password,
      role,
      barNumber: role === "lawyer" ? barNumber : undefined,
      specialty: role === "lawyer" ? specialty : undefined,
      language: locale,
    });
    setSubmitting(false);

    if (!result.ok) {
      toast.error(result.error.includes("already registered") ? t("emailTaken") : result.error);
      return;
    }

    if (!result.session) {
      setCheckEmail(true);
      return;
    }

    toast.success(t("success"));
    window.location.href = `/${locale}/${result.role}/dashboard`;
  };

  if (checkEmail) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-muted/40 px-4 py-16">
        <div className="w-full max-w-md text-center">
          <MailCheck className="mx-auto h-12 w-12 text-gold" />
          <h1 className="mt-4 text-xl font-semibold">{t("checkEmailTitle")}</h1>
          <p className="mt-2 text-sm text-foreground-muted">{t("checkEmailDesc", { email })}</p>
          <Link href="/login" className="mt-6 inline-block text-sm font-medium text-navy hover:underline dark:text-gold">
            {t("login")}
          </Link>
        </div>
      </div>
    );
  }

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

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="fullName">{t("fullName")}</Label>
                <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              </div>
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
              <div className="space-y-1.5">
                <Label htmlFor="password">{t("password")}</Label>
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
                <Label>{t("role")}</Label>
                <Select value={role} onValueChange={(v) => setRole(v as "citizen" | "lawyer")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="citizen">{t("roleCitizen")}</SelectItem>
                    <SelectItem value="lawyer">{t("roleLawyer")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {role === "lawyer" && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="barNumber">{t("barNumber")}</Label>
                    <Input id="barNumber" value={barNumber} onChange={(e) => setBarNumber(e.target.value)} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("specialty")}</Label>
                    <Select value={specialty} onValueChange={(v) => setSpecialty(v as LawyerSpecialty)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {specialties.map((s) => (
                          <SelectItem key={s} value={s}>
                            {tSpec(s)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-foreground-muted">{t("lawyerPendingNotice")}</p>
                </>
              )}

              <Button type="submit" className="w-full" disabled={submitting}>
                {t("submit")}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-foreground-muted">
              {t("haveAccount")}{" "}
              <Link href="/login" className="font-medium text-navy hover:underline dark:text-gold">
                {t("login")}
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
