# Rediseño landing HumWorld
Objetivo: globo 3D de partículas + animaciones por scroll + preview con datos reales. Rama: feat/landing-globo-particulas. Entrega: ask-on-risk. Runner: `pnpm exec vitest run` (frontend/).
Fuente: Obsidian Vault `00 - Inbox/Backlog rediseño landing HumWorld.md`.

## Specs
- S1 (#1) Globo de partículas en el hero, coloreadas por la escala de humor con valores de ejemplo.
- S2 (#2) El globo gira a medida que se hace scroll. Requiere S1.
- S3 (#3) Al llegar a "Cómo funciona" las partículas se reordenan formando el mapa 2D. Requiere S1.
- S4 (#4) En "Cómo funciona", un titular cuyos términos del diccionario se resaltan con el scroll.
- S5 (#5) Los términos se suman en un puntaje de humor entre −1 y +1. Requiere S4.
- S6 (#6) El titular con su puntaje se convierte en una partícula que cae en el mapa. Requiere S3, S5.
- S7 (#7) "Tres lecturas del mismo día" muestra el humor real del día que entrega la API.
- Fuera de alcance: "Qué es" y "Transparencia y alcance" no cambian. Solo español. Sin autenticación.

## Tasks
- T1 S1 inline — 457a1ec
- T2 S2,S3 inline — 5035d3f (globeScene, GlobeCanvas fijo, tests de dominio)
- T3 S4,S5,S6 inline — 5035d3f (HowStory, story.ts)
- T4 S7 inline — 28c2bf2 (useTodayPreview, todayPreview.ts; fallback a ejemplos si la API falla o no hay datos)

## Log
- L1 (2026-10-25) "trabaja todo de una respecto a esto [Backlog rediseño landing HumWorld]"
- L2 Decisión: globo con d3-geo (ya instalado) sobre canvas 2D, sin librería 3D nueva. Un canvas fijo sigue el hero y el "slot" del mapa en la historia de "Cómo funciona".
- L3 Verificado: `pnpm test` 165/165, lint y tsc limpios, build OK. NO verificado: render visual en navegador (sin Chromium/Playwright en el entorno). Espejo Engram pendiente.
- L4 Perf: createGlobeParticles tardaba ~3,5 s; prefiltro por geoBounds lo baja a ~0,1 s.
