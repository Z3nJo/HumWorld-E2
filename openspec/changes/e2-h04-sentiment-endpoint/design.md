# Design

## Context

See `proposal.md` for motivation and `specs/news-sentiment-analysis/spec.md` for the observable contract. E2-H02 supplies a pure `calculate_sentiment` function, a bilingual term recognizer, and a service for resolving persisted parameters. Existing FastAPI routes receive a SQLAlchemy session through `get_db`, construct application services around repositories, and are registered beneath `/api/v1`. The application publishes generated OpenAPI at `/api/openapi.json` and Swagger UI at `/api/docs`.

## Goals / Non-Goals

**Goals:**

- Expose text analysis through the existing API and application-layer conventions.
- Keep matching and calculation behavior identical to news analysis.
- Return enough canonical-term detail to explain the calculated result.
- Keep the operation read-only and publish both runtime OpenAPI and the generated OpenSpec deliverable contract.

**Non-Goals:**

- Detect the language automatically; the caller supplies `es` or `en`, consistent with E2-H03.
- Change the sentiment formula, lexicon, persisted news analysis, configuration endpoint, or database schema.
- Add authentication, rate limiting, or support for languages beyond `es` and `en`.

## Decisions

### 1. Require the language in the request

Accept a JSON body containing `texto` and `idioma`. Validate the language against the existing `Language` domain enum. The text endpoint has no RSS source from which to inherit a language, while E2-H03 deliberately excludes automatic language detection. Requiring the value keeps language selection deterministic and lets callers compare against stored news. Automatic detection is rejected as out of scope and could select a different language-specific lexicon.

### 2. Reuse the existing recognizer and calculation path

Create an application service that loads active terms for the requested language through a repository and resolves `SentimentParameters` through `SentimentConfigurationService`. Pass the complete request text as the recognizer's title with no description, and pass the caller's language. Invoke the existing recognizer and `calculate_sentiment`; do not reproduce tokenization, inflection handling, formulas, or rounding in the route. Filtering and repository access remain outside the pure engine, preserving ADR-000's layer boundaries and ADR-001 H-9.

### 3. Validate a bounded, non-empty input without changing it

Reject whitespace-only text and text longer than 10,000 characters with the API's standard `400` validation response. Do not trim, rewrite, or truncate valid text before recognition; the existing recognizer already normalizes tokens for matching. The 10,000-character ceiling is endpoint-specific and is a request-safety bound, not a limit on stored RSS descriptions.

### 4. Return a canonical and read-only breakdown

Respond with `valor_humor` and a `terminos` array. For each engine contribution, map its `id_termino` to the loaded active dictionary entry and return `id_termino`, canonical `palabra`, `valor`, `ocurrencias`, and the unnormalized `aporte_humor`. Keep the engine's `null` result when there are no recognized terms and its numeric zero when recognized contributions cancel. The service performs only reads; no News or NewsTerm write method is called.

### 5. Publish generated contracts through the existing sources of truth

Declare the route and request/response models in FastAPI so `/api/docs` and `/api/openapi.json` expose the operation. First sync the E2-H04 delta into the main OpenSpec specification without archiving the change. Then extend `opsx/sync_contracts.py` to include `news-sentiment-analysis` from that main specification and run its synchronization and check modes; generated files under `opsx/contracts/` remain generated and are not edited manually. Add an OpenAPI test for the route, schemas, and `200`, `400`, and `500` responses.

### 6. Verify parity against persisted news

Add an integration test that sends the same title-plus-description text and language as a previously analyzed news item, then asserts that the API value equals the persisted value. This directly verifies reuse of the same parameters and algorithm and covers ADR-001 C-V5.

## Risks / Trade-offs

- **A caller can provide a language that does not match the text** → Keep the language explicit, document it in OpenAPI, and avoid claiming automatic detection.
- **The 10,000-character maximum is a new endpoint contract bound** → Reject rather than truncate, document the bound, and keep it independent of RSS storage limits.
- **Dictionary or configuration reads fail** → Use the normal API error handling; do not return a partial or default fabricated result beyond the existing configuration resolver's behavior.
- **The generated `opsx` copy can drift** → Extend the source-to-copy mapping and verify it with `python opsx/sync_contracts.py --check` in tests or CI.

## Migration Plan

No database migration is required. Deploy the API route and service, then verify runtime OpenAPI and synchronize the OpenSpec deliverable contract. Rollback consists of removing the endpoint and its contract mapping; no analysis data needs cleanup because the endpoint does not persist results.
