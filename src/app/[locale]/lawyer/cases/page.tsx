"use client";

import { useTranslations } from "next-intl";
import { Inbox, LayoutGrid, List } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CaseKanban } from "@/components/lawyer/case-kanban";
import { CaseList } from "@/components/lawyer/case-list";
import { useCases } from "@/lib/data/hooks";

export default function LawyerCasesPage() {
  const t = useTranslations("lawyer.cases");
  const tCases = useTranslations("cases");
  const { data: allCases, refetch } = useCases();
  // Incoming requests live on their own page; declined ones are not part of the working board.
  const myCases = allCases.filter((c) => c.status !== "requested" && c.status !== "rejected");
  const pending = allCases.filter((c) => c.status === "requested").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        {pending > 0 && (
          <Button asChild size="sm" variant="gold">
            <Link href="/lawyer/requests">
              <Inbox className="h-3.5 w-3.5" />
              {tCases("requests.title")} ({pending})
            </Link>
          </Button>
        )}
      </div>

      <Tabs defaultValue="kanban">
        <TabsList>
          <TabsTrigger value="kanban">
            <LayoutGrid className="h-3.5 w-3.5" />
            {t("kanban")}
          </TabsTrigger>
          <TabsTrigger value="list">
            <List className="h-3.5 w-3.5" />
            {t("list")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="kanban">
          <CaseKanban cases={myCases} onChanged={refetch} />
        </TabsContent>
        <TabsContent value="list">
          <CaseList cases={myCases} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
