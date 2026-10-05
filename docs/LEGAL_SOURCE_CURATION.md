# Legal source curation

The initial corpus in `src/lib/legal/corpus.ts` contains two annual-leave articles, not a general Jordanian legal database. Both Arabic quotations were read visually on PDF page 20. The Ministry of Labour hosts a Qistas republication dated 2025-07-24. The displayed article effective date is 1996-06-14. Gazette publication date, subsequent amendment/repeal status, and application to a particular historical matter are **unknown**, requiring lawyer review. English explanations are AI interpretations; the authoritative excerpt remains Arabic.

Official sources inspected on 2026-10-04: [Legislation and Opinion Bureau](https://lob.gov.jo/) (JavaScript shell), [Prime Ministry](https://www.pm.gov.jo/Default/Ar) (Gazette navigation), [Ministry of Justice](https://www.moj.gov.jo/Default/Ar), [Constitutional Court](https://www.cco.gov.jo/Default/Ar), and [Ministry of Labour laws](https://www.mol.gov.jo/AR/List/القوانين). No access restrictions were bypassed; no undocumented API assumed. No judicial decision or commentary is presented as legislation.

Before adding or updating a passage:

1. Obtain the permitted official publication, record its URL, retrieval time and SHA-256. Run `node --experimental-loader ./scripts/dev/alias-loader.mjs scripts/dev/verify-legal-source.mjs --network` to detect changes to the current PDF. A changed hash is a review requirement, not automatic approval.
2. Inspect the rendered pages. This PDF's machine-extracted text is corrupted; never copy it into the corpus without visual comparison. Check exact Arabic wording, article, law number/year, dates and authority. Never generate the source text with AI.
3. Have a Jordanian lawyer check the official Gazette provenance, amendments/repeal, temporal applicability and coverage before extending authoritative use. Store unknown dates/status as unknown. A publication snapshot date is not an enactment date.
4. Add a new immutable versioned source ID and metadata; retain prior versions when historical use is needed. Update the allowlist in the pending finalization migration when expanding persisted source IDs. Do not overwrite an existing source with a different article/version under the same ID.
5. Run citation/context, relevance, analysis, storage and authorization regressions. Verify retrieval with both relevant and unrelated Arabic/English questions. Test changed quotations, invented IDs, missing and dated sources. Similarity measures retrieval relevance, never legal confidence.
6. Publish only after review. Corpus source existence/text checks do not verify an AI claim's entailment or applicability; every interpretation remains labeled unverified and requires lawyer review.

The existing database has a `legal_sources` embedding column (1536 dimensions). No replacement database/vector service was introduced. For the two-entry seed, lexical ranking plus real embeddings uses a bounded public-vector cache in the existing server. User documents/query embeddings are not cached. Larger, curated corpora should use the existing Supabase/pgvector infrastructure after verifying its deployed extension/policies; no live schema or source-table write was performed here.

Full rental/civil/commercial coverage, formal human legal review and automated amendment monitoring remain incomplete. The product must show insufficient evidence for uncovered subjects, and must not describe this seed as comprehensive or current law for all matters.
