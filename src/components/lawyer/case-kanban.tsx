"use client";

import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import {
  DndContext,
  useDraggable,
  useDroppable,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { Clock, AlertTriangle } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CaseRecord, CaseStatus } from "@/types";
import { transitionCase } from "@/lib/data/actions";
import { errorKey } from "@/lib/data/error-key";
import { allowedTransitions, LAWYER_BOARD_STATUSES } from "@/lib/cases/lifecycle";
import { formatDate, cn } from "@/lib/utils";

const columns: CaseStatus[] = LAWYER_BOARD_STATUSES;

const priorityColor: Record<CaseRecord["priority"], string> = {
  low: "text-foreground-muted",
  medium: "text-risk-medium",
  high: "text-risk-high",
  urgent: "text-risk-high",
};

function CaseCard({ item }: { item: CaseRecord }) {
  const t = useTranslations("lawyer.cases");
  const locale = useLocale();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: item.id });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 20 }
    : undefined;

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} className={cn(isDragging && "opacity-60")}>
      <Link href={`/lawyer/cases/${item.id}`}>
        <Card className="cursor-grab transition hover:shadow-md active:cursor-grabbing">
          <CardContent className="space-y-2 p-3.5">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium">{item.title}</p>
              {(item.priority === "high" || item.priority === "urgent") && (
                <AlertTriangle className={cn("h-3.5 w-3.5 shrink-0", priorityColor[item.priority])} />
              )}
            </div>
            <p className="text-xs text-foreground-muted">{item.clientName}</p>
            {item.matchScore !== undefined && (
              <Badge variant="gold" className="text-[10px]">
                {t("matchScore")} {item.matchScore}%
              </Badge>
            )}
            <div className="flex items-center justify-between text-[11px] text-foreground-muted">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDate(item.updatedAt, locale)}
              </span>
              {item.deadline && <span>{formatDate(item.deadline, locale)}</span>}
            </div>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}

function Column({ status, items }: { status: CaseStatus; items: CaseRecord[] }) {
  const t = useTranslations("cases.status");
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-32 flex-col rounded-2xl bg-surface-muted/60 p-3 transition-colors",
        isOver && "bg-gold/10 ring-2 ring-gold/40"
      )}
    >
      <div className="mb-3 flex items-center justify-between px-1">
        <p className="text-sm font-semibold">{t(status)}</p>
        <Badge variant="subtle">{items.length}</Badge>
      </div>
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <CaseCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

export function CaseKanban({ cases, onChanged }: { cases: CaseRecord[]; onChanged?: () => void }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const tCase = useTranslations("cases");

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const newStatus = over.id as CaseStatus;
    const current = cases.find((c) => c.id === active.id);
    if (!current || current.status === newStatus) return;
    // The database enforces the lifecycle; this only avoids a pointless round-trip.
    if (!allowedTransitions("lawyer", current.status).includes(newStatus)) {
      toast.error(tCase("errors.invalid_transition"));
      return;
    }
    const res = await transitionCase(current.id, newStatus, "lawyer");
    if (!res.ok) toast.error(tCase(`errors.${errorKey(res.error)}` as "errors.unknown"));
    onChanged?.();
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex flex-col gap-4">
        {columns.map((status) => (
          <Column key={status} status={status} items={cases.filter((c) => c.status === status)} />
        ))}
      </div>
    </DndContext>
  );
}
