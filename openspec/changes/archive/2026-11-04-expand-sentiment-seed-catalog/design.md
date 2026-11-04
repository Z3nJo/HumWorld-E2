## Context

See `proposal.md` for motivation and `specs/news-sentiment-analysis/spec.md` for the updated contract. The current seed defines 30 translated concept pairs directly in `backend/app/seeds/sentiment.py`, expands them into 60 `Term` rows and inserts them with PostgreSQL `ON CONFLICT DO NOTHING`. Unit tests require exactly 30 pairs, while the PostgreSQL integration test requires exactly 60 rows and verifies idempotency and preservation of an administrator edit.

The change is constrained to the sentiment seed and its tests. The database model, recognizer, calculation formulas, application startup, API, frontend and historical snapshot semantics cannot change. The resulting catalog must therefore satisfy all current term restrictions before it is embedded.

## Goals / Non-Goals

**Goals:**

- Keep the original 30 bilingual pairs as explicit curated overrides.
- Embed at least 4,000 valid Spanish identities and 4,000 valid English identities in the existing seed module.
- Make the catalog reproducible, reviewable, license-attributed and independent of network access at runtime.
- Preserve the seed's atomic, insertion-only and administrator-safe behavior at the larger volume.
- Replace fixed-size test expectations with catalog-derived assertions plus explicit minimum coverage checks.

**Non-Goals:**

- Changing tokenization, inflection generation, recognition complexity or sentiment formulas.
- Adding a data file, migration, dependency, endpoint, background job or import interface.
- Recalculating already analyzed news or changing pending-news selection.
- Assigning sentiment to general-purpose word lists that do not provide a validated polarity value.

## Decisions

1. **Keep the original pairs and add independent language entries.** `SENTIMENT_LEXICON` remains the authoritative 30-pair curated baseline. A separate immutable collection in the same module stores extended `(word, language, value)` entries. The seed combines both collections before insertion, with the original identities taking precedence. Replacing the existing structure entirely was rejected because it would obscure the established paired values and make regressions harder to detect.

2. **Embed the generated result, not a runtime importer.** Source repositories are consulted during implementation, but the accepted and normalized rows are committed directly in `backend/app/seeds/sentiment.py`. The module records source URLs, pinned revisions, licenses, score transformations and filtering rules in comments. Runtime downloads were rejected because they would make startup depend on network availability and mutable upstream content; a separate catalog file was rejected by the agreed one-seed-file production scope.

3. **Use scored sentiment resources as primary sources.** English candidates come from VADER's scored lexicon; Spanish candidates come from ML-SentiCon, with its English data available only to fill a validated shortfall after filtering. FrequencyWords may be used offline to prioritize common candidates, but it never supplies sentiment values. The unscored `dwyl/english-words` list is not imported as active sentiment data.

4. **Normalize external scores to the existing scale before embedding.** VADER mean valence in `[-4, 4]` is multiplied by `2.5`; ML-SentiCon polarity in `[-1, 1]` is multiplied by `10`. Values are rounded once to one decimal using deterministic decimal arithmetic. Entries that become zero, exceed the existing range or cannot be represented with the current precision are excluded rather than changing the calculator.

5. **Filter for compatibility with the existing recognizer.** Candidate words are trimmed and lowercased, unsupported emoticons and punctuation-only features are discarded, underscores representing phrases are converted to spaces, and stored words must remain between 1 and 100 characters. The curated result excludes duplicate `(word, language)` identities and duplicate accent-insensitive match forms within a language, preventing multiple catalog rows from representing the same token sequence under current normalization.

6. **Insert in bounded batches within one transaction.** The seed executes multiple bounded `INSERT ... ON CONFLICT DO NOTHING` statements and commits only after every batch succeeds. Any failure rolls back the whole expanded seed. One unbounded statement was rejected because thousands of rows can exceed driver or PostgreSQL parameter limits; committing per batch was rejected because it could leave a partial catalog.

7. **Test invariants instead of only a historical magic count.** The existing unit assertion that the curated baseline contains exactly 30 pairs remains. New unit coverage validates minimum per-language counts, unique identities and normalized match forms, supported languages, non-empty normalized words, length, finite values, range and one-decimal precision. PostgreSQL expectations derive the exact inserted identity set from both collections, then verify a clean seed, a repeated seed and preservation of an edited term.

## Risks / Trade-offs

- [The larger active catalog increases recognition time] → Accept the existing recognizer unchanged as an explicit scope constraint, keep the catalog to curated sentiment-bearing entries and record test execution time as implementation evidence.
- [External lexicons contain slang, emoticons, rare words or ambiguous scores] → Apply deterministic compatibility and confidence filters before embedding; retain only entries that pass the documented invariants.
- [Two sources can assign different values to the same identity] → Preserve the original 30 values first, then use one declared primary source per language and reject later duplicates instead of averaging silently.
- [A very large Python literal is harder to review] → Keep entries in deterministic language-and-word order, separate the curated baseline from generated rows and document the exact generation rules and pinned inputs in the module.
- [Upstream license obligations can be lost when data is copied] → Include source attribution, pinned revisions and applicable license notices in the seed module and verify them during review.
- [Changing the catalog does not update historical dashboards] → Preserve the existing snapshot contract; only future or pending analyses use newly seeded terms.

## Migration Plan

Deploy the updated seed and run the existing application initialization path. On an empty database it inserts the complete catalog; on an existing database it inserts only missing identities and preserves administrator values and states. Validate catalog invariants with unit tests and seed behavior against PostgreSQL before release.

Rollback reverts the seed module but does not delete already inserted terms. Automatic deletion is unsafe because seeded terms may have been edited by an administrator or referenced by historical `NOTICIA_TERMINO` rows.
