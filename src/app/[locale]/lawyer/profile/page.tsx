"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ShieldCheck, Star, Briefcase, MapPin, Pencil, Check, X, Camera } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProfileCard } from "@/components/shared/profile-card";
import { useMyLawyer } from "@/lib/auth/use-lawyer";
import { updateMyLawyerProfile, updateMyProfile } from "@/lib/data/actions";
import { resizeImageToDataUrl } from "@/lib/image";
import { initials, cn } from "@/lib/utils";
import type { Lawyer, LawyerSpecialty } from "@/types";

const ALL_SPECIALTIES: LawyerSpecialty[] = [
  "rental",
  "employment",
  "commercial",
  "family",
  "criminal",
  "real_estate",
  "corporate",
  "civil",
];

export default function LawyerProfileSettingsPage() {
  const t = useTranslations("lawyer.profile");
  const tVerify = useTranslations("lawyer.verification");
  const tCommon = useTranslations("common.profile");
  const tSpec = useTranslations("marketplace.specialties");
  const tAvail = useTranslations("marketplace.availability");
  const { lawyer, refresh } = useMyLawyer();
  const fileRef = useRef<HTMLInputElement>(null);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<Lawyer>>({});

  if (!lawyer) return null;

  const startEdit = () => {
    setForm({
      bio: lawyer.bio,
      city: lawyer.city,
      consultationPrice: lawyer.consultationPrice,
      yearsExperience: lawyer.yearsExperience,
      availabilityStatus: lawyer.availabilityStatus,
      acceptingNewCases: lawyer.acceptingNewCases,
      specialties: [...lawyer.specialties],
      avatarUrl: lawyer.avatarUrl,
    });
    setEditing(true);
  };

  const save = async () => {
    const price = Number(form.consultationPrice ?? 0);
    const years = Number(form.yearsExperience ?? 0);
    if (!Number.isFinite(price) || price < 0 || price > 10000 || !Number.isFinite(years) || years < 0 || years > 70) {
      return toast.error(t("invalidNumbers"));
    }
    if (!form.specialties || form.specialties.length === 0) return toast.error(t("specialtiesRequired"));
    setSaving(true);
    const res = await updateMyLawyerProfile(lawyer.id, {
      bio: (form.bio ?? "").slice(0, 2000),
      city: (form.city ?? "").trim().slice(0, 80),
      consultationPrice: price,
      yearsExperience: Math.round(years),
      availabilityStatus: form.availabilityStatus,
      acceptingNewCases: form.acceptingNewCases,
      specialties: form.specialties,
      avatarUrl: form.avatarUrl ?? "",
    });
    if (res.ok) {
      await updateMyProfile(lawyer.profileId, { avatarUrl: form.avatarUrl ?? "", city: (form.city ?? "").trim() });
      await refresh();
    }
    setSaving(false);
    if (!res.ok) return toast.error(tCommon("saveFailed"));
    setEditing(false);
    toast.success(t("saved"));
  };

  const toggleSpecialty = (s: LawyerSpecialty) => {
    setForm((f) => {
      const current = f.specialties || [];
      return {
        ...f,
        specialties: current.includes(s) ? current.filter((x) => x !== s) : [...current, s],
      };
    });
  };

  const onPickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const url = await resizeImageToDataUrl(file);
    if (!url) return toast.error(tCommon("photoInvalid"));
    setForm((f) => ({ ...f, avatarUrl: url }));
  };

  const displayedAvatar = editing ? form.avatarUrl : lawyer.avatarUrl;
  const displayedSpecialties = editing ? form.specialties || [] : lawyer.specialties;
  const statusVariant = lawyer.verificationStatus === "approved" ? "gold" : lawyer.verificationStatus === "rejected" ? "high" : "subtle";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        {!editing && (
          <Button variant="outline" size="sm" onClick={startEdit}>
            <Pencil className="h-3.5 w-3.5" />
            {t("editProfile")}
          </Button>
        )}
      </div>
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="h-16 w-16 text-lg">
                {displayedAvatar && <AvatarImage src={displayedAvatar} alt={lawyer.fullName} />}
                <AvatarFallback>{initials(lawyer.fullName)}</AvatarFallback>
              </Avatar>
              {editing && (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="absolute -end-1 -bottom-1 flex h-6 w-6 items-center justify-center rounded-full bg-gold text-navy shadow-sm hover:bg-gold-light"
                  aria-label={t("changePhoto")}
                  type="button"
                >
                  <Camera className="h-3.5 w-3.5" />
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onPickPhoto} />
            </div>
            <div>
              <p className="text-lg font-semibold">{lawyer.fullName}</p>
              {editing ? (
                <Input
                  value={form.city ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                  className="mt-1 h-8 w-40"
                  maxLength={80}
                />
              ) : (
                <p className="flex items-center gap-1 text-sm text-foreground-muted">
                  <MapPin className="h-3.5 w-3.5" />
                  {lawyer.city || "—"}
                </p>
              )}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {editing
              ? ALL_SPECIALTIES.map((s) => {
                  const active = displayedSpecialties.includes(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleSpecialty(s)}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                        active
                          ? "border-gold bg-gold/15 text-gold"
                          : "border-border bg-transparent text-foreground-muted hover:bg-surface-muted"
                      )}
                    >
                      {tSpec(s)}
                    </button>
                  );
                })
              : displayedSpecialties.map((s) => (
                  <Badge key={s} variant="subtle">
                    {tSpec(s)}
                  </Badge>
                ))}
          </div>

          {editing ? (
            <div className="mt-4 space-y-1.5">
              <Label>{t("bio")}</Label>
              <Textarea
                value={form.bio ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                className="min-h-24"
                maxLength={2000}
              />
            </div>
          ) : (
            <p className="mt-4 text-sm text-foreground-muted">{lawyer.bio || "—"}</p>
          )}

          {editing ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-4">
              <div className="space-y-1.5">
                <Label>{t("availability")}</Label>
                <Select
                  value={form.availabilityStatus}
                  onValueChange={(v) => setForm((f) => ({ ...f, availabilityStatus: v as Lawyer["availabilityStatus"] }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(["available_today", "available_this_week", "busy"] as const).map((v) => (
                      <SelectItem key={v} value={v}>
                        {tAvail(v)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t("acceptingNewCases")}</Label>
                <Select
                  value={form.acceptingNewCases ? "yes" : "no"}
                  onValueChange={(v) => setForm((f) => ({ ...f, acceptingNewCases: v === "yes" }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">{t("acceptingYes")}</SelectItem>
                    <SelectItem value="no">{t("acceptingNo")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t("price")}</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.consultationPrice ?? 0}
                  onChange={(e) => setForm((f) => ({ ...f, consultationPrice: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("experience")}</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.yearsExperience ?? 0}
                  onChange={(e) => setForm((f) => ({ ...f, yearsExperience: Number(e.target.value) }))}
                />
              </div>
            </div>
          ) : (
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <Badge variant="outline">{tAvail(lawyer.availabilityStatus)}</Badge>
              <Badge variant={lawyer.acceptingNewCases ? "low" : "subtle"}>
                {lawyer.acceptingNewCases ? t("acceptingYes") : t("acceptingNo")}
              </Badge>
              <Badge variant="outline">
                {lawyer.consultationPrice} JOD · {lawyer.yearsExperience} {t("yearsShort")}
              </Badge>
            </div>
          )}

          <div className="mt-5 grid grid-cols-3 gap-4 border-t border-border pt-5 text-sm">
            <div className="flex items-center gap-1.5">
              <Star className="h-4 w-4 fill-gold text-gold" />
              {lawyer.rating}
            </div>
            <div className="flex items-center gap-1.5">
              <Briefcase className="h-4 w-4 text-foreground-muted" />
              {lawyer.completedCases}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-gold" />
              <Badge variant={statusVariant}>{tVerify(`status.${lawyer.verificationStatus}`)}</Badge>
              {lawyer.verificationStatus !== "approved" && (
                <Link href="/lawyer/verification" className="text-xs text-gold hover:underline">
                  {tVerify("openPage")}
                </Link>
              )}
            </div>
          </div>

          {editing && (
            <div className="mt-5 flex gap-2 border-t border-border pt-5">
              <Button size="sm" variant="gold" onClick={save} disabled={saving}>
                <Check className="h-3.5 w-3.5" />
                {t("save")}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditing(false)} disabled={saving}>
                <X className="h-3.5 w-3.5" />
                {t("cancel")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Personal account details (name, phone, photo) + account deletion */}
      <ProfileCard embedded />
    </div>
  );
}
