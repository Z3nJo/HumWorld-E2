# Design

## Context

See `proposal.md` for motivation and `specs/news-sentiment-analysis/spec.md` for observable behavior. E2-H02 supplies each news item with its source language and persists contributions against dictionary terms. ADR-003 constrains text processing to a lightweight, framework-independent engine and standard-library facilities; no external NLP model or corpus is planned.

## Goals / Non-Goals

**Goals:**
- Resolve common Spanish and English inflections to the existing canonical dictionary entries while retaining occurrence counts and explainability.
- Make the initial bilingual lexicon useful on a clean installation and safe to initialize repeatedly.
- Keep analysis deterministic, testable, and compatible with the existing calculation and persistence contracts.

**Non-Goals:**
- Automatic language detection, additional languages or RSS sources, general-purpose lemmatization, model downloads, schema/API changes, or changes to the humor formula.
- Reanalyzing news that already has an analysis snapshot.

## Decisions

1. **Use the language already attached to each news item.** The recognizer receives `es` or `en` from the existing capture flow and applies only that language's matching rules. This follows the task's supported-language scope and avoids a detector whose output could conflict with source metadata. Adding automatic detection was considered but is outside the requirement.

2. **Normalize deterministically and conservatively.** Keep case/accent normalization and complete-token boundaries from E2-H02. Add bounded, language-specific rules for common regular inflections and explicit variants for irregular forms included in the starter lexicon. Resolve every recognized form to the canonical `TERMINO` entry before calculation and persistence. This avoids a heavyweight stemmer and preserves the existing contribution identity; broad substring matching was rejected because it increases false positives.

3. **Seed by insert-only identity, not by replacement.** Add the reviewed Spanish/English concept pairs through the existing database initialization path. Identify an existing entry by its current term-and-language identity and insert only missing entries; never update an existing value, language, or active state during a rerun. This makes initialization idempotent and preserves administrator edits without a schema migration. Pair values must use the ADR-approved range and precision and be semantically aligned across languages.

4. **Keep analysis snapshots unchanged.** New terms participate in future analyses and in pending-news processing already supported by E2-H02. Do not trigger a bulk recalculation: analyzed news remain historical snapshots, consistent with E2-H02.

5. **Test at the engine and persistence boundaries.** Unit tests cover both languages, regular and irregular representative forms, case/accent normalization, word boundaries, inactive and cross-language terms, and canonical-term occurrence counts. PostgreSQL integration tests cover initial seed content, repeated initialization, preservation of edited rows, and persisted contributions for each language. Existing E2-H02 calculation and persistence regressions remain in scope.

## Risks / Trade-offs

- [Inflection rules may overmatch unrelated words] → Keep transformations language-specific and bounded, require complete word boundaries, include negative fixtures, and explicitly test ambiguous forms.
- [The two languages may use superficially similar forms with different meanings] → Filter by the news item's language before matching and test cross-language isolation.
- [Starter values may not be equally interpretable across translated terms] → Review concept pairs and values together against ADR-001's scale and precision before seeding.
- [An idempotent seed can preserve an administrator's earlier value instead of the curated default] → This is intentional; test preservation and document that initialization does not reset administrator-managed entries.
- [Existing analyses will not reflect the new lexicon] → Preserve E2-H02 snapshot semantics; only new or still-pending analyses use the added terms.

## Migration Plan

No schema migration is expected. Deploy the deterministic recognition changes and insertion-only lexicon seed through the existing initialization path. On rollback, revert the code but do not automatically delete seeded or edited dictionary rows: they may have been changed by an administrator or used by persisted analysis snapshots.
