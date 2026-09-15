"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import { Sparkles, RefreshCcw, Scissors, Landmark, Languages, Copy, Save, Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AiDisclaimer } from "@/components/shared/ai-disclaimer";
import { useSession } from "@/lib/auth/use-session";
import { useAppStore } from "@/lib/store/app-store";
import { generateDraftAction } from "@/lib/ai/actions";

function DrafterInner() {
  const t = useTranslations("lawyer.drafter");
  const locale = useLocale();
  const { session } = useSession();
  const params = useSearchParams();
  const caseId = params.get("caseId") || undefined;
  const addDraft = useAppStore((s) => s.addDraft);

  const [instructions, setInstructions] = useState("");
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);

  const generate = async (mode: "generate" | "shorten" | "formal" | "translate" = "generate") => {
    if (mode === "generate" && !instructions.trim()) return;
    setLoading(true);
    const res = await generateDraftAction({
      instructions: instructions || draft,
      locale: locale as "ar" | "en",
      mode,
      existingContent: draft || undefined,
    });
    setDraft(res.content);
    setLoading(false);
  };

  const save = () => {
    if (!session || !draft.trim()) return;
    addDraft({
      caseId,
      lawyerId: session.userId,
      title: instructions.slice(0, 60) || "مسودة بدون عنوان",
      instructions,
      content: draft,
      status: "draft",
    });
    toast.success(t("savedSuccess"));
  };

  const copy = () => {
    navigator.clipboard.writeText(draft);
    toast.success(t("copy"));
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="mt-1 text-foreground-muted">{t("subtitle")}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="space-y-3 p-5">
            <Label>{t("instructionsLabel")}</Label>
            <Textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder={t("instructionsPlaceholder")}
              className="min-h-40"
            />
            <Button className="w-full" onClick={() => generate("generate")} disabled={loading || !instructions.trim()}>
              <Sparkles className="h-4 w-4" />
              {t("generate")}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 p-5">
            <div className="flex items-center justify-between">
              <Label>{t("draftLabel")}</Label>
              {loading && <Sparkles className="h-4 w-4 animate-pulse text-gold" />}
            </div>
            <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} className="min-h-40 whitespace-pre-line" />
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => generate("generate")} disabled={loading}>
                <RefreshCcw className="h-3.5 w-3.5" />
                {t("regenerate")}
              </Button>
              <Button size="sm" variant="outline" onClick={() => generate("formal")} disabled={loading || !draft}>
                <Landmark className="h-3.5 w-3.5" />
                {t("makeFormal")}
              </Button>
              <Button size="sm" variant="outline" onClick={() => generate("shorten")} disabled={loading || !draft}>
                <Scissors className="h-3.5 w-3.5" />
                {t("shorten")}
              </Button>
              <Button size="sm" variant="outline" onClick={() => generate("translate")} disabled={loading || !draft}>
                <Languages className="h-3.5 w-3.5" />
                {t("translate")}
              </Button>
              <Button size="sm" variant="outline" onClick={copy} disabled={!draft}>
                <Copy className="h-3.5 w-3.5" />
                {t("copy")}
              </Button>
              <Button size="sm" variant="gold" onClick={save} disabled={!draft}>
                <Save className="h-3.5 w-3.5" />
                {t("saveDraft")}
              </Button>
              <Button size="sm" variant="ghost" disabled={!draft} onClick={() => toast.info(t("export"))}>
                <Download className="h-3.5 w-3.5" />
                {t("export")}
              </Button>
            </div>
            <AiDisclaimer text={t("aiDisclosure")} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function AiDrafterPage() {
  return (
    <Suspense>
      <DrafterInner />
    </Suspense>
  );
}
