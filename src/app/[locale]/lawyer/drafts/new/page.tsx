"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import { Sparkles, RefreshCcw, Scissors, Landmark, Languages, Copy, Save, Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AiDisclaimer } from "@/components/shared/ai-disclaimer";
import { DataLoadError } from "@/components/shared/data-load-error";
import { useSession } from "@/lib/auth/use-session";
import { useMyLawyer } from "@/lib/auth/use-lawyer";
import { addDraft, updateDraft } from "@/lib/data/actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { mapDraft } from "@/lib/supabase/mappers";
import { generateDraftAction } from "@/lib/ai/actions";
import { useDemoStore } from "@/lib/demo/store";
import { isDemoActive } from "@/lib/demo/mode";

function DrafterInner() {
  const params = useSearchParams();
  return <DrafterEditor key={params.get("draftId") || "new"}/>;
}

function DrafterEditor() {
  const t = useTranslations("lawyer.drafter");
  const locale = useLocale();
  const { session } = useSession();
  const { lawyer } = useMyLawyer();
  const params = useSearchParams();
  const caseId = params.get("caseId") || undefined;

  const [draftId, setDraftId] = useState(params.get("draftId") || undefined);
  const [instructions, setInstructions] = useState("");
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadedDraftId,setLoadedDraftId]=useState<string>();
  const [loadError,setLoadError]=useState(false);

  useEffect(() => {
    if (!draftId) return;
    let cancelled=false;
    if (isDemoActive()) {
      const d = useDemoStore.getState().drafts.find((x) => x.id === draftId);
      Promise.resolve().then(() => {
        if(cancelled)return;
        if(!d){setLoadError(true);return;}
        setInstructions(d.instructions);setDraft(d.content);setLoadedDraftId(draftId);
      });
      return ()=>{cancelled=true;};
    }
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {Promise.resolve().then(()=>{if(!cancelled)setLoadError(true);});return ()=>{cancelled=true;};}
    Promise.resolve(supabase
      .from("drafts")
      .select("*")
      .eq("id", draftId)
      .single())
      .then(({ data,error }) => {
        if(cancelled)return;
        if (error || !data) {setLoadError(true);return;}
        const existing = mapDraft(data);
        setInstructions(existing.instructions);
        setDraft(existing.content);
        setLoadedDraftId(draftId);
      }).catch(()=>{if(!cancelled)setLoadError(true);});
    return ()=>{cancelled=true;};
  }, [draftId]);

  const generate = async (mode: "generate" | "shorten" | "formal" | "translate" = "generate") => {
    if (loading) return;
    if (mode === "generate" && !instructions.trim()) return;
    setLoading(true);
    try {
    const res = await generateDraftAction({
      instructions: instructions || draft,
      locale: locale as "ar" | "en",
      mode,
      existingContent: draft || undefined,
    });
    setDraft(res.content);
    } catch { toast.error(locale === "ar" ? "تعذر الحصول على نتيجة. لم تُنشأ نتيجة بديلة. حاول مجدداً." : "Unable to obtain an AI result. No substitute was generated. Please retry."); } finally { setLoading(false); }
  };

  const save = async () => {
    if (!session || !lawyer || !draft.trim() || saving) return;
    setSaving(true);
    try {
    if (draftId) {
      const res = await updateDraft(draftId, { instructions, content: draft });
      if (!res.ok) return toast.error(t("saveFailed"));
    } else {
      const created = await addDraft({
        caseId,
        lawyerId: lawyer.id,
        title: instructions.slice(0, 60) || (locale === "ar" ? "مسودة بدون عنوان" : "Untitled draft"),
        instructions,
        content: draft,
        status: "draft",
      });
      if (!created.ok) return toast.error(t("saveFailed"));
      setDraftId(created.data);
    }
    toast.success(t("savedSuccess"));
    } catch { toast.error(t("saveFailed")); } finally { setSaving(false); }
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(draft); toast.success(t("copy")); }
    catch { toast.error(locale === "ar" ? "تعذر النسخ. يمكنك تحديد النص ونسخه يدوياً." : "Copy failed. Select the text and copy it manually."); }
  };

  const exportDraft = () => {
    const blob = new Blob([draft], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const safeName = (instructions.slice(0, 40) || "draft").trim().replace(/[\\/:*?"<>|]/g, "-");
    a.download = `${safeName}.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  };

  if(loadError)return <DataLoadError/>;
  if(draftId && loadedDraftId!==draftId)return <p role="status">{t("loadingDraft")}</p>;
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="mt-1 text-foreground-muted">{t("subtitle")}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="space-y-3 p-5">
            <Label htmlFor="draft-instructions">{t("instructionsLabel")}</Label>
            <Textarea
              id="draft-instructions"
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
              <Label htmlFor="draft-content">{t("draftLabel")}</Label>
              {loading && <Sparkles className="h-4 w-4 animate-pulse text-gold" />}
            </div>
            <Textarea id="draft-content" value={draft} onChange={(e) => setDraft(e.target.value)} className="min-h-40 whitespace-pre-line" />
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
              <Button size="sm" variant="gold" onClick={save} disabled={!draft || saving}>
                <Save className="h-3.5 w-3.5" />
                {t("saveDraft")}
              </Button>
              <Button size="sm" variant="ghost" disabled={!draft} onClick={exportDraft}>
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
