import { z } from "zod";
import { curatedSources, validateCitation } from "../legal/corpus";

const schema = z.object({
  consequence: z.string().trim().min(1).max(64_000),
  affectedClauseId: z.string().nullable().optional(),
  questions: z.array(z.string().max(4000)).max(20).default([]),
  sourceIds: z.array(z.string()).max(8).default([]),
  citations: z.array(z.object({ sourceId: z.string(), quote: z.string() })).max(8).default([]),
});
/** Historical results remain unreviewed interpretations; never trust arbitrary stored JSON. */
export function readScenarioHistory(value: unknown, clauseIds: string[]) {
  const parsed = schema.safeParse(value);
  if (!parsed.success) return undefined;
  return { ...parsed.data,
    affectedClauseId: parsed.data.affectedClauseId && clauseIds.includes(parsed.data.affectedClauseId) ? parsed.data.affectedClauseId : undefined,
    sourceIds: [...new Set(parsed.data.citations.flatMap(c => validateCitation(c.sourceId, c.quote, curatedSources) ? [c.sourceId] : []))],
  };
}
