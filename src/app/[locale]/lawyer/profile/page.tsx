"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ShieldCheck, Star, Briefcase, MapPin, Pencil, Check, X, Camera } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSession } from "@/lib/auth/use-session";
import { useLawyer } from "@/lib/auth/use-lawyer";
import { useAppStore } from "@/lib/store/app-store";
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
  const tSpec = useTranslations("marketplace.specialties");
  const tAvail = useTranslations("marketplace.availability");
  const { session } = useSession();
  const lawyer = useLawyer(session?.userId);
  const updateLawyerProfile = useAppStore((s) => s.updateLawyerProfile);
  const updateProfile = useAppStore((s) => s.updateProfile);
  const fileRef = useRef<HTMLInputElement>(null);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<Lawyer>>({});

  if (!lawyer) return null;

  const startEdit = () => {
    setForm({
      bio: lawyer.bio,
      city: lawyer.city,
      consultationPrice: lawyer.consultationPrice,
      yearsExperience: lawyer.yearsExperience,
      availabilityStatus: lawyer.availabilityStatus,
      specialties: [...lawyer.specialties],
      avatarUrl: lawyer.avatarUrl,
    });
    setEditing(true);
  };

  const save = () => {
    updateLawyerProfile(lawyer.id, form);
    if (session) updateProfile(session.userId, { avatarUrl: form.avatarUrl, city: form.city });
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

  const onPickPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm((f) => ({ ...f, avatarUrl: reader.result as string }));
    reader.readAsDataURL(file);
  };

  const displayedAvatar = editing ? form.avatarUrl : lawyer.avatarUrl;
  const displayedSpecialties = editing ? form.specialties || [] : lawyer.specialties;

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
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickPhoto} />
            </div>
            <div>
              <p className="text-lg font-semibold">{lawyer.fullName}</p>
              {editing ? (
                <Input
                  value={form.city ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                  className="mt-1 h-8 w-40"
                />
              ) : (
                <p className="flex items-center gap-1 text-sm text-foreground-muted">
                  <MapPin className="h-3.5 w-3.5" />
                  {lawyer.city}
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
              />
            </div>
          ) : (
            <p className="mt-4 text-sm text-foreground-muted">{lawyer.bio}</p>
          )}

          {editing && (
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
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
                <Label>{t("price")}</Label>
                <Input
                  type="number"
                  value={form.consultationPrice ?? 0}
                  onChange={(e) => setForm((f) => ({ ...f, consultationPrice: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("experience")}</Label>
                <Input
                  type="number"
                  value={form.yearsExperience ?? 0}
                  onChange={(e) => setForm((f) => ({ ...f, yearsExperience: Number(e.target.value) }))}
                />
              </div>
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
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-gold" />
              {t("verificationStatus")}: {lawyer.verificationStatus === "demo_verified" ? "✓" : "—"}
            </div>
          </div>

          {editing && (
            <div className="mt-5 flex gap-2 border-t border-border pt-5">
              <Button size="sm" variant="gold" onClick={save}>
                <Check className="h-3.5 w-3.5" />
                {t("save")}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditing(false)}>
                <X className="h-3.5 w-3.5" />
                {t("cancel")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
