"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Scale } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { DemoEntryButtons } from "@/components/shared/demo-entry-buttons";
import { toast } from "sonner";
import { useAppStore } from "@/lib/store/app-store";

export default function LoginPage() {
  const t = useTranslations("auth.login");
  const tc = useTranslations("common");
  const router = useRouter();
  const login = useAppStore((s) => s.login);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    const result = await login(email, password);
    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.error === "account_disabled" ? t("accountDisabled") : t("invalidCredentials"));
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
                <Label htmlFor="email">{t("email")}</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">{t("password")}</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {t("submit")}
              </Button>
            </form>

            <p className="mt-4 text-center text-sm text-foreground-muted">
              {t("noAccount")}{" "}
              <Link href="/signup" className="font-medium text-navy hover:underline dark:text-gold">
                {t("signup")}
              </Link>
            </p>

            <div className="my-6 flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="text-xs text-foreground-muted">{t("orDemo")}</span>
              <Separator className="flex-1" />
            </div>

            <DemoEntryButtons variant="login" />
            <p className="mt-3 text-center text-xs text-foreground-muted">{t("demoNote")}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
