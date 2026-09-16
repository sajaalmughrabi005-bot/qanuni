"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { MapPin, Phone, Mail, Pencil, Check, X, Camera } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useSession } from "@/lib/auth/use-session";
import { useAppStore } from "@/lib/store/app-store";
import { initials } from "@/lib/utils";
import type { Profile } from "@/types";

export function ProfileCard() {
  const t = useTranslations("common.profile");
  const { profile } = useSession();
  const updateProfile = useAppStore((s) => s.updateProfile);
  const fileRef = useRef<HTMLInputElement>(null);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<Profile>>({});

  if (!profile) return null;

  const startEdit = () => {
    setForm({
      fullName: profile.fullName,
      phone: profile.phone,
      city: profile.city,
      avatarUrl: profile.avatarUrl,
    });
    setEditing(true);
  };

  const save = () => {
    updateProfile(profile.id, form);
    setEditing(false);
    toast.success(t("saved"));
  };

  const onPickPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm((f) => ({ ...f, avatarUrl: reader.result as string }));
    reader.readAsDataURL(file);
  };

  const displayedAvatar = editing ? form.avatarUrl : profile.avatarUrl;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
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
        <CardContent className="space-y-5 p-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="h-16 w-16 text-lg">
                {displayedAvatar && <AvatarImage src={displayedAvatar} alt={profile.fullName} />}
                <AvatarFallback>{initials(profile.fullName)}</AvatarFallback>
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
            <div className="min-w-0 flex-1">
              {editing ? (
                <Input
                  value={form.fullName ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                  className="h-9 max-w-xs font-semibold"
                />
              ) : (
                <p className="text-lg font-semibold">{profile.fullName}</p>
              )}
              <p className="mt-1 flex items-center gap-1 text-sm text-foreground-muted">
                <Mail className="h-3.5 w-3.5" />
                {profile.email}
              </p>
            </div>
          </div>

          <div className="grid gap-4 border-t border-border pt-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs">
                <Phone className="h-3.5 w-3.5" />
                {t("phone")}
              </Label>
              {editing ? (
                <Input
                  value={form.phone ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
              ) : (
                <p className="text-sm">{profile.phone || "—"}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs">
                <MapPin className="h-3.5 w-3.5" />
                {t("city")}
              </Label>
              {editing ? (
                <Input
                  value={form.city ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                />
              ) : (
                <p className="text-sm">{profile.city || "—"}</p>
              )}
            </div>
          </div>

          {editing && (
            <div className="flex gap-2 border-t border-border pt-5">
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
