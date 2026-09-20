"use client";

import { useParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Mail, Phone, MapPin, FileText, Briefcase } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { useCases } from "@/lib/data/hooks";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { mapDocument, mapProfile } from "@/lib/supabase/mappers";
import { initials, formatDate } from "@/lib/utils";
import { useEffect, useState } from "react";
import { useDemoStore } from "@/lib/demo/store";
import { useGovernorateLabel } from "@/components/shared/governorate-select";
import type { LegalDocument, Profile } from "@/types";

export default function ClientFilePage() {
  const params = useParams<{ id: string }>();
  const t = useTranslations("lawyer.clients");
  const tCol = useTranslations("cases.status");
  const tDocStatus = useTranslations("citizen.documents.status");
  const locale = useLocale();

  const { data: allCases } = useCases();
  const [realProfile, setClientProfile] = useState<Profile | undefined>(undefined);
  const demoProfiles = useDemoStore((s) => s.profiles);
  const cityLabel = useGovernorateLabel();
  const [clientDocuments, setClientDocuments] = useState<LegalDocument[]>([]);

  const clientProfile = realProfile ?? demoProfiles.find((p) => p.id === params.id);
  // Contact details and history open up only once the lawyer has accepted a case for this client.
  const clientCases = allCases.filter((c) => c.clientId === params.id && c.status !== "requested" && c.status !== "rejected");
  const clientName = clientProfile?.fullName || clientCases[0]?.clientName;
  const documentIds = Array.from(new Set(clientCases.flatMap((c) => c.documentIds)));

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase || !params.id) return;
    supabase
      .from("profiles")
      .select("*")
      .eq("id", params.id)
      .single()
      .then(({ data }) => setClientProfile(data ? mapProfile(data) : undefined));
  }, [params.id]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase || documentIds.length === 0) return;
    supabase
      .from("documents")
      .select("*")
      .in("id", documentIds)
      .then(({ data }) => setClientDocuments((data || []).map(mapDocument)));
    // documentIds is derived fresh each render from clientCases; join it into a stable key instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentIds.join(",")]);

  if (!clientName) {
    return <EmptyState icon={Briefcase} title="Not found" className="mx-auto mt-16 max-w-lg" />;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/lawyer/clients" className="text-sm text-gold hover:underline">
        ← {t("backToClients")}
      </Link>

      <div className="flex items-center gap-3">
        <Avatar className="h-14 w-14 text-lg">
          <AvatarFallback>{initials(clientName)}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-semibold">{clientName}</h1>
          <p className="text-sm text-foreground-muted">
            {t("activeCases")}: {clientCases.filter((c) => c.status !== "closed").length} · {t("totalCases")}: {clientCases.length}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("contactInfo")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {clientProfile?.email && (
            <p className="flex items-center gap-2 text-foreground-muted">
              <Mail className="h-3.5 w-3.5" /> {clientProfile.email}
            </p>
          )}
          {clientProfile?.phone && (
            <p className="flex items-center gap-2 text-foreground-muted">
              <Phone className="h-3.5 w-3.5" /> {clientProfile.phone}
            </p>
          )}
          {clientProfile?.city && (
            <p className="flex items-center gap-2 text-foreground-muted">
              <MapPin className="h-3.5 w-3.5" /> {cityLabel(clientProfile.city)}
            </p>
          )}
          {!clientProfile?.email && !clientProfile?.phone && !clientProfile?.city && (
            <p className="text-foreground-muted">—</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("caseHistory")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {clientCases.map((c) => (
            <Link
              key={c.id}
              href={`/lawyer/cases/${c.id}`}
              className="flex items-center justify-between rounded-xl border border-border p-3 text-sm hover:bg-surface-muted"
            >
              <div>
                <p className="font-medium">{c.title}</p>
                <p className="text-xs text-foreground-muted">{formatDate(c.createdAt, locale)}</p>
              </div>
              <Badge variant="outline">{tCol(c.status)}</Badge>
            </Link>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("documentArchive")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {clientDocuments.length === 0 ? (
            <p className="text-sm text-foreground-muted">{t("noDocuments")}</p>
          ) : (
            clientDocuments.map((d) => (
              <div key={d.id} className="flex items-center gap-2 rounded-xl border border-border p-3 text-sm">
                <FileText className="h-4 w-4 shrink-0 text-gold" />
                <span className="flex-1 truncate">{d.fileName}</span>
                <Badge variant="subtle">{tDocStatus(d.status)}</Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
