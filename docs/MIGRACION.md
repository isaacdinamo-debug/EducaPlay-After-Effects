# De Remotion a After Effects

Hasta septiembre de 2026 los capítulos se armaban en **Remotion**, dentro del repo
`educaplay2047-cmyk-Motion-Graphics` (carpeta `Ambiente/remotion`). El flujo pasó a **After
Effects**, y este repo arranca limpio con lo necesario para producir en AE. **El repo viejo no se
tocó**: sigue siendo el archivo del flujo Remotion y de los capítulos ya renderizados ahí.

## Qué se trajo y dónde quedó

| En Remotion (`Ambiente/remotion/`) | Acá | Cambios |
|---|---|---|
| `src/layout/presenter.ts`, `rects.ts` | `motor/src/layout/` | Ninguno. Sin `Slot.tsx` ni `Stage.tsx`. |
| `src/brand/{ambienteTheme,format,motion,scale}.ts` | `motor/src/brand/` | Ninguno. Sin `fonts.ts` (usaba `staticFile`). |
| `src/episodes/{types,blocks,captionFix}.ts` | `motor/src/episodes/` | `PictoName` pasó de `components/Pictogram.tsx` a `pictos.ts`. |
| `src/components/captionPages.ts` | `motor/src/captions/` | Ninguno. |
| `src/episodes/AMB26-04/*` | `motor/src/episodes/AMB26-04/` | Ninguno. |
| `scripts/{prep,track-presenter,transcribe,escaleta,align-cues,check-layout,check-contrast,export-ae}.mjs`, `lib/*` | `motor/scripts/` | `export-ae` escribe en `episodios/<CODE>/`. `EDUCAPLAY_EPISODES` apunta por defecto a `~/Documents/EducaPlay/Secundaria /Ambiente`. |
| `scripts/nuevo.mjs` | `motor/scripts/nuevo.mjs` | Ya no registra el episodio en `Root.tsx` ni agrega `build:*`. |
| `scripts/check.mjs` | `motor/scripts/check.mjs` | `tsc` + `check-layout` + `check-contrast`. Sin `check-overlay` ni `check-social` (renderizaban con Remotion). |
| `Ambiente/AE/*.jsx` | `ae/` | El manifiesto llega por `$.global.EDUCAPLAY_MANIFEST`. |
| `.agents/skills/educaplay-episodios/reference/blocks-template.ts` | `motor/plantillas/data.molde.ts` | `intervention` sin default, a propósito. |

**Nuevo:**
- `motor/scripts/medios.mjs`: enlaza medios ya medidos.
- `motor/scripts/publicar.mjs`: chequeo completo y, si pasa, git + PR.
- `ae/run.mjs`: maneja AE desde la terminal.
- `.agents/`: workflow `/episodio-ae`, skill `educaplay-after-effects` y reglas para Antigravity.

## Qué se retiró

- **Componentes y composiciones React:** `*.tsx`, `Root.tsx`, `Episode.tsx`, `renderBlock.tsx` y
  `remotion.config.ts`.
- **Dependencias:** `remotion`, `@remotion/*`, `react`, `react-dom`, `zod` y `@types/react`. El
  motor sólo necesita `canvas` y `typescript`.
- **Scripts de render:**
  - `stills.mjs`: lo reemplaza `ae/run.mjs`;
  - `check-overlay.mjs`: lo reemplaza el chequeo del LOG de AE más la hoja de contacto;
  - `check-social.mjs`, `align-social.mjs`, `plate-vertical.mjs`, `template.mjs` y `docs-sync.mjs`.
- **Reels 9:16 y el capítulo sin docente (AMB26-04-SHORT).** Quedan en el repo viejo hasta
  portarlos a AE. El motor conserva los tokens verticales en `format.ts`.

## Lo que sigue igual

- La medición: tracker, Whisper, gatillos y `resolveSlot`.
- Los verificadores de layout y contraste.
- El formato del `data.ts`.

Un capítulo medido en el repo viejo se trae con `npm run medios`.

En los comentarios del código hay menciones a Remotion, `<Slot>` o `.tsx`. Explican por qué una
decisión se tomó así; no son dependencias.
