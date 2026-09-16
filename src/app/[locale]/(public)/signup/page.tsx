"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Scale } from "lucide-react";
import { toast } from "sonner";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppStore } from "@/lib/store/app-store";
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
  const router = useRouter();
  const signUp = useAppStore((s) => s.signUp);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"citizen" | "lawyer">("citizen");
  const [barNumber, setBarNumber] = useState("");
  const [specialty, setSpecialty] = useState<LawyerSpecialty>("rental");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password) return;
    setSubmitting(true);
    const result = signUp({
      fullName,
      email,
      password,
      role,
      barNumber: role === "lawyer" ? barNumber : undefined,
      specialty: role === "lawyer" ? specialty : undefined,
    });
    setSubmitting(false);

    if (!result.ok) {
      toast.error(t("emailTaken"));
      return;
    }

    toast.success(t("success"));
    router.push(`/${result.session.role}/dashboard`);
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
