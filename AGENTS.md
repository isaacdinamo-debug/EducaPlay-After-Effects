# Educaplay After Effects — episodios de Educaplay Secundaria (Corrientes)

Producción de los capítulos de Educaplay Secundaria en **Adobe After Effects**. Un motor de
medición en Node mira el máster ya grabado y la escaleta `.docx`, y un constructor en ExtendScript
arma el proyecto `.aep` editable: capas, keyframes y una capa `CONTROL` con los ajustes globales.

**Para armar un capítulo, seguí el workflow `/episodio-ae`** (`.agents/workflows/episodio-ae.md`).
Los criterios y las trampas están en la skill `.agents/skills/educaplay-after-effects/SKILL.md`.

## Mapa

| Carpeta | Qué es |
|---|---|
| `motor/` | Medición: encuadre de la docente, transcripción con timing por palabra, palabras-gatillo, cajas libres (`resolveSlot`), verificadores y export del manifiesto. Node 24 LTS (≥ 23.6), sin Remotion ni React. |
| `motor/src/episodes/<CODE>/` | Datos de cada episodio. **El único archivo escrito a mano es `data.ts`**; el resto lo generan los scripts. |
| `motor/plantillas/data.molde.ts` | Molde de `data.ts` para un capítulo nuevo. |
| `motor/src/brand/estudios.ts` | Materias (prefijo → serie y plató) y platós (cómo se separa el fondo, marca de agua). |
| `ae/` | `build-episode.jsx` (constructor, estética de la plataforma), `run.mjs` (driver que maneja AE desde la terminal) y `preview.mjs` (video de revisión con aerender). |
| `episodios/<CODE>/` | Salida: `manifest.json` y `revision/` (`contacto.jpg`, `log.txt`, `estado.json`) se versionan. El `.aep`, `assets/` y `preview/` no. |
| `docs/` | `SUBTITULOS.md` (estándar), `ESTETICA.md` (la estética de la plataforma), `MIGRACION.md` (qué se retiró de Remotion). |

**El capítulo de referencia es `AMB26-04`**, "Plan B: protocolo para una inundación" (179 s,
25 bloques, 27 subtítulos). Antes de escribir uno nuevo, leé su `data.ts`.

## Comandos (desde `motor/`)

```bash
npm ci && cp .env.example .env                # una vez por máquina; completar las rutas de .env
npm run doctor -- <CODE>                      # auditoría: máquina, fuentes, plató, medios y medición aprobada
npm run medios -- <CODE>                      # traer medios de un episodio ya medido (desde EDUCAPLAY_MEDIOS)
npm run nuevo -- <CODE>                       # episodio nuevo: medir, transcribir, gatillos, borrador
npm run check -- <CODE>                       # tipos + layout + contraste
npm run export:ae -- <CODE>                   # manifiesto para After Effects
npm run ae -- <CODE>                          # armar en AE (modo vivo) + stills + hoja de contacto + chequeo
npm run preview -- <CODE>                     # video de revisión (aerender por tramos) en episodios/<CODE>/preview/
npm run publicar -- <CODE>                    # todo lo anterior y, sólo si pasa: commit, push y PR
```

Banderas de `npm run ae`:
- `--clasico` arma sin modo vivo (`<CODE>-clasico.aep`, `revision-clasico/`);
- `--recursos grandes` arma la variante en prueba con los recursos de refuerzo más grandes
  (`<CODE>-grandes.aep`, `revision-grandes/`; ver `docs/ESTETICA.md`);
- `--frames 420,1620` elige los stills de la hoja de contacto;
- `--forzar` cierra sin guardar un proyecto abierto que no es de este flujo (sólo si sabés que no
  es trabajo de nadie).

`npm run preview -- <CODE> --comparar` suma un lado a lado con la versión `--clasico`; con
`--recursos grandes --comparar`, el lado a lado es filas actuales | recursos grandes.

`npm run check` también verifica que la marca esté bien escrita en subtítulos y tarjetas.
```

## Reglas duras

- **La docente decide el encuadre.** Las cajas de los gráficos las resuelve el motor según dónde
  está parada. Nunca escribas coordenadas a mano en `data.ts` ni en el `.jsx`: si falta algo, falta
  un parámetro del slot.
- **La marca se escribe «Educaplay»:** E mayúscula y el resto en minúscula, en pantalla, subtítulos,
  commits y docs. Nunca «EducaPlay», «EDUCAPLAY» ni «Educa Play» (Whisper la transcribe mal: se
  corrige con `CAPTION_FIX`). Sola en pantalla va en `Museo-700`, sin mayúsculas forzadas, así que
  no entra en un kicker. Las rutas y el nombre del repo (`EducaPlay-After-Effects`) no se tocan.
- **Los nombres de las personas no salen nunca de la escaleta.** Se leen de la placa quemada en el
  máster y se confirman con el responsable del capítulo (hoy, Isaac).
- **Cada capítulo sabe en qué plató se grabó.** Materia nueva o plató sin declarar: `doctor` frena y
  muestra el color medido. Se declara en `motor/src/episodes/<CODE>/tracker.json`
  (`{"studio": "verde"}`) o para toda la materia en `motor/src/brand/estudios.ts`. No adivines: si
  el color no es ni verde ni lila, preguntá.
- **No se editan archivos generados** (`track.ts`, `cues.ts`, `captions.ts`, `words.json`,
  `track.frames.json`, `manifest.json`). Las correcciones van en `data.ts` (`CAPTION_FIX`,
  `cues.def.json` + `npm run cues`).
- **Nada se publica sin chequeo.** `npm run publicar` corre los verificadores y el armado en AE, y
  no toca git si algo falla. No hagas commit o push a mano para esquivarlo.
- **Subtítulos:** sin resaltado por palabra, pastilla canónica, máximo dos líneas. Ver
  `docs/SUBTITULOS.md`.
- **Medios fuera del repo.** Másters, recursos, fuentes, `.aep` y el modelo de Whisper viven en
  disco local. Cada máquina dice dónde en `motor/.env` (`EDUCAPLAY_EPISODES`, `EDUCAPLAY_MEDIOS`;
  ver `motor/.env.example`). Entrecomillá siempre las rutas: pueden tener espacios.
- **Antes de ejecutar AE, cerrá tu trabajo.** `npm run ae` cierra sin guardar sólo los proyectos
  que generó este flujo; si hay otro abierto, se detiene.

## Requisitos de la máquina

After Effects 2026 en **macOS o Windows**, Node 24 LTS (≥ 23.6, ver `.nvmrc`), ffmpeg/ffprobe, `whisper-cli` (sólo para medir)
y las 7 fuentes Museo / Museo Sans Rounded instaladas en el sistema. AE las busca por nombre
PostScript. En Windows van con "Instalar para todos los usuarios". En AE tiene que estar tildado
*Preferencias › Scripting y expresiones › «Permitir que los scripts escriban archivos y tengan
acceso a la red»*.

**En una máquina nueva, lo primero es `npm run doctor -- <CODE>`.** Tiene que dar 0 problemas. Revisa:
- fuentes, herramientas y After Effects;
- que el máster sea el aprobado;
- que nadie haya vuelto a medir el episodio (`nuevo`/`prep` regeneran encuadre y subtítulos con el
  ffmpeg y el Whisper de esa máquina, y el resultado cambia).
