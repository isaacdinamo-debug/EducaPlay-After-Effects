---
trigger: glob
globs: ae/**/*.jsx
description: Cómo se escribe y se prueba el constructor de After Effects (ExtendScript).
---

`ae/build-episode.jsx` corre dentro de After Effects, en **ExtendScript (ES3)**:

- sin `let`/`const`, arrow functions, `Array.map`/`forEach`, `JSON` ni template strings;
- toda propiedad se pide por **matchName** (`'ADBE Vector Fill Color'`), nunca por el nombre
  visible: AE puede estar en español o en inglés;
- los parámetros de efectos se leen por **índice** en las expresiones (`effect("Papel")(1)`);
- `soft(label, fn)` es para lo **decorativo** (una sombra, un trim path): si falla, se anota con ⚠ y
  el capítulo sigue. La estructura (comps, capas, tiempos, guardado) NO va en `soft`;
- un cambio de estética va detrás de `VIDRIO` / `PLAT` / orgánico, sin romper las otras dos.

Las trampas que ya costaron iteraciones están en la skill `educaplay-after-effects`, sección
*Trampas de After Effects*. Leela antes de tocar shapes, texto o keyframes.

**Toda modificación se prueba con** `npm run ae -- AMB26-04 --estilo organico,vidrio,plataforma`
desde `motor/`, y se miran las hojas de contacto de `episodios/AMB26-04/revision/`. El chequeo falla
ante cualquier ⚠ o ✗ del LOG.
