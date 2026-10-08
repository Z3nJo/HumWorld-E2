# Migration Inventory

Inventario realizado antes de la migración de `frontend/openspec/`.

## Frontend specifications

| Source | Destination | Collision |
|---|---|---|
| `frontend/openspec/specs/app-shell/` | `openspec/specs/frontend/app-shell/` | No |
| `frontend/openspec/specs/dictionary-ui/` | `openspec/specs/frontend/dictionary-ui/` | No |
| `frontend/openspec/specs/dictionary-ui-pagination/` | `openspec/specs/frontend/dictionary-ui-pagination/` | No |
| `frontend/openspec/specs/frontend-runtime/` | `openspec/specs/frontend/frontend-runtime/` | No |

## Archived changes

The five frontend archive directories have no name collision with the existing root archive:

- `2026-10-07-e2-h01-dictionary-pagination`
- `2026-10-07-e2-h01-dictionary-ui`
- `2026-10-08-dictionary-filters-layout`
- `2026-10-08-frontend-merge-readiness`
- `2026-10-08-unify-dictionary-column-spacing`

## Other files

- `frontend/openspec/config.yaml` is a local configuration duplicate; the root `openspec/config.yaml` is canonical and will be retained.
- The source root contains 36 tracked files.
- Root capability names and archive names were compared before migration; no collisions were found.
