# EducaPlay After Effects

Capítulos de **EducaPlay Secundaria (Corrientes)** armados en Adobe After Effects a partir del
máster grabado y su escaleta. El motor de medición ubica cada gráfico en la banda libre que deja la
docente, y un constructor en ExtendScript arma un `.aep` editable en una de tres estéticas:
**orgánico**, **vidrio** o **plataforma**.

Capítulo de referencia: **AMB26-04 · Plan B: protocolo para una inundación**.

## Instalación (una vez por máquina)

Requisitos:
- macOS con **Adobe After Effects 2026**;
- **Node ≥ 22.6**, `ffmpeg`/`ffprobe` y `whisper-cli` (whisper.cpp);
- las fuentes **Museo** y **Museo Sans Rounded** instaladas.

```bash
cd motor
npm install
npm run medios -- --modelo --desde "<carpeta con models/ggml-large-v3-turbo.bin>"
```

Las entregas del montajista (`<CODE>/` con el máster, la escaleta `.docx` y `RECURSOS/`) se leen de
`EDUCAPLAY_EPISODES`. Por defecto es `~/Documents/EducaPlay/Secundaria /Ambiente`.

## Flujo de un capítulo

```bash
cd motor
npm run nuevo      -- AMB26-05                    # 1. medir, transcribir, gatillos, borrador
#                                                 # 2. escribir src/episodes/AMB26-05/data.ts
npm run check      -- AMB26-05                    # 3. tipos, layout, contraste
npm run export:ae  -- AMB26-05                    # 4. manifiesto para AE
npm run ae         -- AMB26-05 --estilo plataforma   # 5. armar en AE + stills + chequeo
#                                                 # 6. mirar episodios/AMB26-05/revision/*.jpg
npm run publicar   -- AMB26-05 --estilo plataforma   # 7. si todo pasa: commit, push y PR
```

En **Antigravity**, todo esto es el workflow **`/episodio-ae`**. Gemini lo sigue paso a paso con la
skill `educaplay-after-effects` y las reglas de `.agents/rules/`.

## Documentación

- [`AGENTS.md`](AGENTS.md): mapa del repo y reglas duras (lo lee cualquier agente).
- [`docs/ESTETICAS.md`](docs/ESTETICAS.md): las tres estéticas y los controles de la capa `CONTROL`.
- [`docs/SUBTITULOS.md`](docs/SUBTITULOS.md): estándar de subtitulado de EducaPlay (§1.4).
- [`docs/MIGRACION.md`](docs/MIGRACION.md): qué se trajo del flujo Remotion y qué se retiró.
