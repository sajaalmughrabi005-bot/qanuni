"use client";

import { useTranslations } from "next-intl";
import { LayoutGrid, List } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CaseKanban } from "@/components/lawyer/case-kanban";
import { CaseList } from "@/components/lawyer/case-list";
import { useCases } from "@/lib/data/hooks";

export default function LawyerCasesPage() {
  const t = useTranslations("lawyer.cases");
  const { data: myCases, refetch } = useCases();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
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
