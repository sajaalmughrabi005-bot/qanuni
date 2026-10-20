# Unapproved compatibility reference candidates

These files are source for private team review, not an installation bundle.
No SQL execution is authorized by the team handoff, including local databases.

- C1: case_request_wrapper.sql, unchanged; retained pre/postcheck and local test source.
- C2: document_analysis_c2_candidate.sql, unexecuted/unapproved.
- C3: private_originals_c3_candidate.sql, unexecuted/unapproved.

Keep OWNER_REVIEW_REQUIRED and every fail-closed guard. Do not add these files to
an automatic migration runner. Do not replay numbered migrations 007-009.

Future separate approval requires recovery proof, isolated staging/regression and
real API tests, exact reviewed execution-copy hashes and the documented order:
C1 -> renewed preflight/review/pin C2 -> renewed preflight/review/pin C3.
See docs/PRODUCTION_COMPATIBILITY_CANDIDATES.md and docs/TEAM_BACKLOG.md.
