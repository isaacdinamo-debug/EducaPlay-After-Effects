---
trigger: glob
globs: motor/src/episodes/**/*
description: Qué archivos de un episodio se escriben a mano y cuáles los pisan los scripts.
---

En `motor/src/episodes/<CODE>/` hay un solo archivo escrito a mano: **`data.ts`**.

Estos los **generan los scripts** y los reescriben en cada corrida de `npm run nuevo` / `npm run prep`:

    track.ts   track.frames.json   cues.ts   captions.ts   words.json   escaleta.json

Y `episodios/<CODE>/manifest.json` lo reescribe `npm run export:ae`.

Editarlos no da error: la corrección simplemente desaparece en la próxima corrida y el error vuelve
al video sin que nadie se entere. Si hay que corregir algo de ahí, se declara como **dato del
episodio** en `data.ts`:

- correcciones de transcripción → `CAPTION_FIX`, que se aplica sobre los subtítulos generados;
- frames de marcas → `cues.def.json` más `npm run cues`, nunca un número escrito a ojo.

Para un episodio nuevo, partí de `motor/plantillas/data.molde.ts` y mirá
`motor/src/episodes/AMB26-04/data.ts`, el capítulo de referencia.
