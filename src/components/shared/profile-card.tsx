"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { MapPin, Phone, Mail, Pencil, Check, X, Camera, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useSession } from "@/lib/auth/use-session";
import { deleteAccountAction } from "@/lib/auth/actions";
import { updateMyProfile } from "@/lib/data/actions";
import { resizeImageToDataUrl } from "@/lib/image";
import { governorateKey } from "@/lib/governorates";
import { GovernorateSelect, useGovernorateLabel } from "@/components/shared/governorate-select";
import { initials } from "@/lib/utils";
import type { Profile } from "@/types";

export function ProfileCard({ embedded = false }: { embedded?: boolean }) {
  const t = useTranslations("common.profile");
  const { profile, refreshProfile, isDemo } = useSession();
  const fileRef = useRef<HTMLInputElement>(null);
  const cityLabel = useGovernorateLabel();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<Profile>>({});
  const [confirmEmail, setConfirmEmail] = useState("");
  const [deleting, setDeleting] = useState(false);

  if (!profile) return null;

  const startEdit = () => {
    setForm({
      fullName: profile.fullName,
      phone: profile.phone,
      city: governorateKey(profile.city) ?? "",
      avatarUrl: profile.avatarUrl,
    });
    setEditing(true);
  };

  const save = async () => {
    setSaving(true);
    const res = await updateMyProfile(profile.id, {
      fullName: form.fullName,
      phone: form.phone ?? "",
      city: form.city ?? "",
      avatarUrl: form.avatarUrl ?? "",
    });
    setSaving(false);
    if (!res.ok) return toast.error(t("saveFailed"));
    await refreshProfile();
    setEditing(false);
    toast.success(t("saved"));
  };

  const onPickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const url = await resizeImageToDataUrl(file);
    if (!url) return toast.error(t("photoInvalid"));
    setForm((f) => ({ ...f, avatarUrl: url }));
  };

  const deleteAccount = async () => {
    setDeleting(true);
    const res = await deleteAccountAction(confirmEmail);
    if (!res.ok) {
      setDeleting(false);
      return toast.error(res.error === "admin_cannot_delete" ? t("adminCannotDelete") : t("deleteFailed"));
    }
    // Hard navigation so every client-side cache/session is dropped.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/";
  };

  const displayedAvatar = editing ? form.avatarUrl : profile.avatarUrl;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        {embedded ? <h2 className="text-lg font-semibold">{t("accountTitle")}</h2> : <h1 className="text-2xl font-semibold">{t("title")}</h1>}
        {!editing && (
          <Button variant="outline" size="sm" onClick={startEdit}>
            <Pencil className="h-3.5 w-3.5" />
            {t("editProfile")}
          </Button>
        )}
      </div>
      {isDemo && <p className="rounded-lg bg-gold/10 p-3 text-xs text-foreground-muted">{t("demoNotice")}</p>}

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
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onPickPhoto} />
            </div>
            <div className="min-w-0 flex-1">
              {editing ? (
                <Input
                  value={form.fullName ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                  className="h-9 max-w-xs font-semibold"
                  maxLength={120}
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
                <Input value={form.phone ?? ""} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} maxLength={30} />
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
                <GovernorateSelect value={form.city} onChange={(c) => setForm((f) => ({ ...f, city: c }))} />
              ) : (
                <p className="text-sm">{cityLabel(profile.city) || "—"}</p>
              )}
            </div>
          </div>

          {editing && (
            <div className="flex gap-2 border-t border-border pt-5">
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

      {!isDemo && profile.role !== "admin" && (
        <Card className="border-risk-high/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-risk-high">
              <Trash2 className="h-4 w-4" />
              {t("deleteTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-foreground-muted">{t("deleteDesc")}</p>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("deleteConfirmLabel")}</Label>
              <Input type="email" dir="ltr" value={confirmEmail} onChange={(e) => setConfirmEmail(e.target.value)} placeholder={profile.email} />
            </div>
            <Button
              size="sm"
              variant="outline"
              className="border-risk-high/40 text-risk-high hover:bg-risk-high-bg"
              disabled={deleting || confirmEmail.trim().toLowerCase() !== profile.email.toLowerCase()}
              onClick={deleteAccount}
            >
              {deleting ? t("deleteWorking") : t("deleteButton")}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
