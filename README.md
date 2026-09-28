# EducaPlay After Effects

Capítulos de **EducaPlay Secundaria (Corrientes)** armados en Adobe After Effects a partir del
máster grabado y su escaleta. El motor de medición ubica cada gráfico en la banda libre que deja la
docente, y un constructor en ExtendScript arma un `.aep` editable con la estética de la
plataforma EducaPlay.

Capítulo de referencia: **AMB26-04 · Plan B: protocolo para una inundación**.

## Instalación (una vez por máquina)

Requisitos:
- **Adobe After Effects 2026**, en macOS o Windows;
- **Node ≥ 22.6**, `ffmpeg`/`ffprobe` en el PATH;
- `whisper-cli` (whisper.cpp), sólo para medir episodios nuevos;
- las 7 fuentes **Museo** y **Museo Sans Rounded**: `Museo-300`, `Museo-700` y
  `MuseoSansRounded-300/500/700/900/1000`.

  **No vienen en el repo, porque tienen licencia.** Sin ellas, After Effects las reemplaza, el texto
  mide distinto y el cuadro pierde el equilibrio. Por eso el armado se niega a correr si falta
  alguna. En **Windows**, instalalas con clic derecho → **"Instalar para todos los usuarios"** y
  reiniciá After Effects.

```bash
cd motor
npm install
npm run doctor                                   # auditoría de la máquina: tiene que dar 0 problemas
```

Para armar un episodio que ya fue medido en otra máquina, traé sus medios (máster, recursos y
fuentes para el verificador) **sin volver a medirlo**:

```bash
npm run medios -- AMB26-04 --desde "<carpeta con public/videos/AMB26-04.mp4>"
npm run doctor -- AMB26-04                       # máster idéntico al aprobado, medición sin cambios
```

⚠ **No corras `npm run nuevo` sobre un episodio ya aprobado.** Vuelve a medir el encuadre y a
transcribir con el ffmpeg y el Whisper de esa máquina, y el resultado cambia. Si pasó,
`npm run doctor` lo detecta, y se vuelve atrás con `git checkout -- motor/src/episodes/<CODE>/`.

Las entregas del montajista (`<CODE>/` con el máster, la escaleta `.docx` y `RECURSOS/`) se leen de
`EDUCAPLAY_EPISODES`. Por defecto es `~/Documents/EducaPlay/Secundaria /Ambiente`. En Windows,
definila con una ruta sin carpetas que terminen en espacio.

## Flujo de un capítulo

```bash
cd motor
npm run nuevo      -- AMB26-05                    # 1. medir, transcribir, gatillos, borrador
#                                                 # 2. escribir src/episodes/AMB26-05/data.ts
npm run check      -- AMB26-05                    # 3. tipos, layout, contraste
npm run export:ae  -- AMB26-05                    # 4. manifiesto para AE
npm run ae         -- AMB26-05                    # 5. armar en AE + stills + chequeo
#                                                 # 6. mirar episodios/AMB26-05/revision/contacto.jpg
npm run publicar   -- AMB26-05                    # 7. si todo pasa: commit, push y PR
```

En **Antigravity**, todo esto es el workflow **`/episodio-ae`**. Gemini lo sigue paso a paso con la
skill `educaplay-after-effects` y las reglas de `.agents/rules/`.

## Documentación

- [`AGENTS.md`](AGENTS.md): mapa del repo y reglas duras (lo lee cualquier agente).
- [`docs/ESTETICA.md`](docs/ESTETICA.md): la estética de la plataforma y los controles de la capa `CONTROL`.
- [`docs/SUBTITULOS.md`](docs/SUBTITULOS.md): estándar de subtitulado de EducaPlay (§1.4).
- [`docs/MIGRACION.md`](docs/MIGRACION.md): qué se trajo del flujo Remotion y qué se retiró.
