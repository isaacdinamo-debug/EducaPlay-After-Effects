# EducaPlay After Effects — episodios de EducaPlay Secundaria (Corrientes)

Producción de los capítulos de EducaPlay Secundaria en **Adobe After Effects**. Un motor de
medición en Node mira el máster ya grabado y la escaleta `.docx`, y un constructor en ExtendScript
arma el proyecto `.aep` editable: capas, keyframes y una capa `CONTROL` con los ajustes globales.

**Para armar un capítulo, seguí el workflow `/episodio-ae`** (`.agents/workflows/episodio-ae.md`).
Los criterios y las trampas están en la skill `.agents/skills/educaplay-after-effects/SKILL.md`.

## Mapa

| Carpeta | Qué es |
|---|---|
| `motor/` | Medición: encuadre de la docente, transcripción con timing por palabra, palabras-gatillo, cajas libres (`resolveSlot`), verificadores y export del manifiesto. Node ≥ 22.6, sin Remotion ni React. |
| `motor/src/episodes/<CODE>/` | Datos de cada episodio. **El único archivo escrito a mano es `data.ts`**; el resto lo generan los scripts. |
| `motor/plantillas/data.molde.ts` | Molde de `data.ts` para un capítulo nuevo. |
| `ae/` | `build-episode.jsx` (constructor, estética de la plataforma EducaPlay) y `run.mjs` (driver que maneja AE desde la terminal). |
| `episodios/<CODE>/` | Salida: `manifest.json` y `revision/` (`contacto.jpg`, `log.txt`, `estado.json`) se versionan. El `.aep` y `assets/` no. |
| `docs/` | `SUBTITULOS.md` (estándar), `ESTETICA.md` (la estética de la plataforma), `MIGRACION.md` (qué se retiró de Remotion). |

**El capítulo de referencia es `AMB26-04`**, "Plan B: protocolo para una inundación" (179 s,
25 bloques, 27 subtítulos). Antes de escribir uno nuevo, leé su `data.ts`.

## Comandos (desde `motor/`)

```bash
npm install                                   # una vez
npm run medios -- <CODE> --desde "<ruta>"     # traer medios de un episodio ya medido (enlaces duros)
npm run nuevo -- <CODE>                       # episodio nuevo: medir, transcribir, gatillos, borrador
npm run check -- <CODE>                       # tipos + layout + contraste
npm run export:ae -- <CODE>                   # manifiesto para After Effects
npm run ae -- <CODE>                          # armar en AE + stills + hoja de contacto + chequeo
npm run publicar -- <CODE>                    # todo lo anterior y, sólo si pasa: commit, push y PR
```

## Reglas duras

- **La docente decide el encuadre.** Las cajas de los gráficos las resuelve el motor según dónde
  está parada. Nunca escribas coordenadas a mano en `data.ts` ni en el `.jsx`: si falta algo, falta
  un parámetro del slot.
- **Los nombres de las personas no salen nunca de la escaleta.** Se leen de la placa quemada en el
  máster y se confirman con Isaac.
- **No se editan archivos generados** (`track.ts`, `cues.ts`, `captions.ts`, `words.json`,
  `track.frames.json`, `manifest.json`). Las correcciones van en `data.ts` (`CAPTION_FIX`,
  `cues.def.json` + `npm run cues`).
- **Nada se publica sin chequeo.** `npm run publicar` corre los verificadores y el armado en AE, y
  no toca git si algo falla. No hagas commit o push a mano para esquivarlo.
- **Subtítulos:** sin resaltado por palabra, pastilla canónica, máximo dos líneas. Ver
  `docs/SUBTITULOS.md`.
- **Medios fuera del repo.** Másters, recursos, fuentes, `.aep` y el modelo de Whisper viven en
  disco local. Las entregas de episodios están en `EDUCAPLAY_EPISODES` (por defecto
  `~/Documents/EducaPlay/Secundaria /Ambiente`, **con un espacio antes de la barra**: entrecomillá
  siempre las rutas).
- **Antes de ejecutar AE, cerrá tu trabajo.** `npm run ae` cierra sin guardar sólo los proyectos
  que generó este flujo; si hay otro abierto, se detiene.

## Requisitos de la máquina

macOS con Adobe After Effects 2026, Node ≥ 22.6, ffmpeg/ffprobe, `whisper-cli` (whisper.cpp) y las
fuentes Museo y Museo Sans Rounded instaladas en el sistema (AE las busca por nombre PostScript).
