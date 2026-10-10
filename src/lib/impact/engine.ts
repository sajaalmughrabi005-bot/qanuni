/** Dependency reassessment, not a legal compliance classifier. No IO or provider calls. */
export interface Instrument { id: string; labelAr: string; labelEn: string; jurisdiction: string; domain: string }
export interface Article { id: string; instrumentId: string; labelAr: string; labelEn: string }
export interface Provenance { state: "hypothetical" | "source_text_checked"; description: string; checkedAt?: string; sourceUrl?: string }
export interface ArticleVersion {
  id: string; articleId: string; effectiveFrom: string; effectiveTo?: string;
  status: "candidate" | "superseded" | "withdrawn"; provenance?: Provenance;
}
export interface PortfolioContract { id: string; titleAr: string; titleEn: string; category: string }
export interface PortfolioClause { id: string; contractId: string; textAr: string; textEn: string; consequence: "high" | "normal" }
export interface ClauseRelationship { id: string; clauseId: string; versionId: string; provenance?: Provenance }
export interface ImpactEvent { id: string; articleId: string; priorVersionId: string; newVersionId: string; hypothetical: boolean }
export type ImpactLimit = "missing_provenance" | "hypothetical" | "unsupported_domain" | "unsupported_jurisdiction" | "not_yet_effective" | "expired_version" | "superseded_version";
export interface ReviewAction { status: "unassigned"; kind: "professional_reassessment"; priority: "high" | "normal" }
export interface PotentialFinding {
  id: string; contractId: string; clauseId: string; articleId: string;
  priorVersionId: string; newVersionId: string; relationshipIds: string[]; eventIds: string[];
  classification: "potential_reassessment"; humanReview: "not_reviewed";
  reason: "mapped_article_version_changed"; limitations: ImpactLimit[];
  evidenceLinks: string[]; action: ReviewAction;
}
export interface ImpactInput {
  asOf: string; supportedDomains: readonly string[];
  instruments: readonly Instrument[]; articles: readonly Article[]; versions: readonly ArticleVersion[];
  contracts: readonly PortfolioContract[]; clauses: readonly PortfolioClause[];
  relationships: readonly ClauseRelationship[]; events: readonly ImpactEvent[];
}
export interface ImpactResult {
  status: "ok" | "invalid_input"; errors: string[];
  findings: PotentialFinding[]; affectedContractIds: string[]; affectedClauseIds: string[];
  eventCount: number;
}
const date = (v: string) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v;
const safeLink = (v?: string) => {
  if (!v) return undefined;
  try { const u = new URL(v); return u.protocol === "https:" && !u.username && !u.password ? u.href : undefined; } catch { return undefined; }
};
const provenancePresent = (p?: Provenance) => !!p && ["hypothetical", "source_text_checked"].includes(p.state) && typeof p.description === "string" && !!p.description.trim() && (p.state !== "source_text_checked" || !!p.checkedAt && date(p.checkedAt) && !!safeLink(p.sourceUrl));

export function evaluateImpact(input: ImpactInput): ImpactResult {
  const errors: string[] = [];
  const empty = (): ImpactResult => ({ status: "invalid_input", errors, findings: [], affectedContractIds: [], affectedClauseIds: [], eventCount: 0 });
  if (!input || !date(input.asOf) || !Array.isArray(input.supportedDomains)) { errors.push("invalid_context"); return empty(); }
  const groups = ["instruments", "articles", "versions", "contracts", "clauses", "relationships", "events"] as const;
  for (const name of groups) {
    const rows = input[name];
    if (!Array.isArray(rows) || rows.length > 10_000) { errors.push(`invalid_${name}`); continue; }
    const ids = new Set<string>();
    for (const row of rows) {
      if (!row || typeof row.id !== "string" || !row.id.trim() || ids.has(row.id)) errors.push(`invalid_or_duplicate_${name}_id`);
      else ids.add(row.id);
    }
  }
  if (errors.length) return empty();
  const instruments = new Map(input.instruments.map(i => [i.id, i]));
  const articles = new Map(input.articles.map(a => [a.id, a]));
  const versions = new Map(input.versions.map(v => [v.id, v]));
  const contracts = new Map(input.contracts.map(c => [c.id, c]));
  const clauses = new Map(input.clauses.map(c => [c.id, c]));
  for (const a of input.articles) if (!instruments.has(a.instrumentId)) errors.push("article_instrument_missing");
  for (const v of input.versions) if (!articles.has(v.articleId) || !date(v.effectiveFrom) || (v.effectiveTo !== undefined && (!date(v.effectiveTo) || v.effectiveTo <= v.effectiveFrom)) || !["candidate", "superseded", "withdrawn"].includes(v.status)) errors.push("invalid_version");
  for (const c of input.clauses) if (!contracts.has(c.contractId) || !["high", "normal"].includes(c.consequence)) errors.push("invalid_clause");
  for (const r of input.relationships) if (!clauses.has(r.clauseId) || !versions.has(r.versionId)) errors.push("relationship_dependency_missing");
  for (const e of input.events) {
    const prior = versions.get(e.priorVersionId), next = versions.get(e.newVersionId);
    if (!articles.has(e.articleId) || !prior || !next || prior.articleId !== e.articleId || next.articleId !== e.articleId || typeof e.hypothetical !== "boolean") errors.push("event_dependency_mismatch");
    else if (e.priorVersionId !== e.newVersionId && next.effectiveFrom < prior.effectiveFrom) errors.push("backwards_version_event");
  }
  if (errors.length) return empty();
  const findings = new Map<string, PotentialFinding>();
  const relationsByVersion = new Map<string, ClauseRelationship[]>();
  for (const relation of input.relationships) {
    if (!relationsByVersion.has(relation.versionId)) relationsByVersion.set(relation.versionId, []);
    relationsByVersion.get(relation.versionId)!.push(relation);
  }
  let eventCount = 0;
  const distinctEvents = new Set<string>();
  for (const event of input.events) {
    if (event.priorVersionId === event.newVersionId) continue;
    const prior = versions.get(event.priorVersionId)!, next = versions.get(event.newVersionId)!;
    const article = articles.get(event.articleId)!, instrument = instruments.get(article.instrumentId)!;
    const eventKey = JSON.stringify([event.articleId, prior.id, next.id]);
    if (!distinctEvents.has(eventKey)) { eventCount++; distinctEvents.add(eventKey); }
    for (const relation of relationsByVersion.get(prior.id) || []) {
      const clause = clauses.get(relation.clauseId)!;
      const key = JSON.stringify([clause.id, prior.id, next.id]);
      const limitations = new Set<ImpactLimit>();
      if (!provenancePresent(prior.provenance) || !provenancePresent(next.provenance) || !provenancePresent(relation.provenance)) limitations.add("missing_provenance");
      if (event.hypothetical || [prior.provenance, next.provenance, relation.provenance].some(p => p?.state === "hypothetical")) limitations.add("hypothetical");
      if (!input.supportedDomains.includes(instrument.domain)) limitations.add("unsupported_domain");
      if (instrument.jurisdiction !== "JO") limitations.add("unsupported_jurisdiction");
      if (next.effectiveFrom > input.asOf) limitations.add("not_yet_effective");
      if (next.effectiveTo && next.effectiveTo <= input.asOf) limitations.add("expired_version");
      if (next.status !== "candidate") limitations.add("superseded_version");
      const priorFinding = findings.get(key);
      const links = limitations.has("hypothetical") || limitations.has("missing_provenance") ? [] : [prior.provenance, next.provenance, relation.provenance].flatMap(p => safeLink(p?.sourceUrl) ? [safeLink(p?.sourceUrl)!] : []);
      if (priorFinding) {
        priorFinding.relationshipIds = [...new Set([...priorFinding.relationshipIds, relation.id])];
        priorFinding.eventIds = [...new Set([...priorFinding.eventIds, event.id])];
        priorFinding.limitations = [...new Set([...priorFinding.limitations, ...limitations])];
        priorFinding.evidenceLinks = priorFinding.limitations.includes("missing_provenance") || priorFinding.limitations.includes("hypothetical") ? [] : [...new Set([...priorFinding.evidenceLinks, ...links])];
      } else {
        if (findings.size >= 50_000) { errors.push("impact_output_limit"); return empty(); }
        findings.set(key, { id: key, contractId: clause.contractId, clauseId: clause.id, articleId: article.id, priorVersionId: prior.id, newVersionId: next.id,
        relationshipIds: [relation.id], eventIds: [event.id], classification: "potential_reassessment", humanReview: "not_reviewed", reason: "mapped_article_version_changed", limitations: [...limitations], evidenceLinks: [...new Set(links)],
        action: { kind: "professional_reassessment", status: "unassigned", priority: clause.consequence } });
      }
    }
  }
  const rows = [...findings.values()].sort((a, b) => a.id.localeCompare(b.id));
  return { status: "ok", errors: [], findings: rows, affectedContractIds: [...new Set(rows.map(f => f.contractId))], affectedClauseIds: [...new Set(rows.map(f => f.clauseId))], eventCount };
}
