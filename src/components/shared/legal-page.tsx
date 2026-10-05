import type { LegalDoc } from "@/lib/legal-content";

export function LegalPage({ doc }: { doc: LegalDoc }) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold">{doc.title}</h1>
      <p className="mt-2 text-xs text-foreground-muted">{doc.updated}</p>
      <p className="mt-6 text-foreground-muted">{doc.intro}</p>
      {doc.sections.map((s) => (
        <section key={s.heading} className="mt-8">
          <h2 className="text-lg font-semibold">{s.heading}</h2>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-foreground-muted">
            {s.body.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </section>
      ))}
    </article>
  );
}
