# Proposal

## Why

E2-H02 already passes a source's declared language to the sentiment recognizer, but the current matcher only recognizes exact dictionary forms and no sentiment terms are loaded by default. As a result, a new installation has no useful bilingual coverage, and common Spanish and English inflections can go unrecognized.

## What Changes

- Extend dictionary-based recognition for the supported languages `es` and `en`, using the language already declared on the RSS source and inherited by each news item.
- Recognize a curated, bounded set of common inflectional forms through deterministic language-specific normalization compatible with ADR-003.
- Add an initial curated lexicon of approximately 30 semantically paired concepts in Spanish and English, with reviewed, comparable sentiment values.
- Load the starter lexicon idempotently without replacing terms that administrators have already edited.
- Verify language isolation, representative inflections, matching boundaries, and persisted contributions for both languages.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `news-sentiment-analysis`: recognize supported Spanish and English forms against the corresponding language-specific dictionary, with a usable starter lexicon.

## Impact

- Backend sentiment recognition, seed data, and unit and PostgreSQL integration tests.
- Reuses the E2-H02 sentiment calculation, persistence, and `TERMINO` storage/API. No formula, endpoint, or database schema change is planned.
- Depends on E2-H02's technical implementation. ADR-001's external C-V9 validation remains a closure condition for E2-H02, not a prerequisite for completing E2-H03.
- Seeded values are available to new analyses; E2-H02's snapshot behavior means existing analyzed news are not recalculated automatically.
