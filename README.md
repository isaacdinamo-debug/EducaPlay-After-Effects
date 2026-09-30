# Educaplay After Effects

Capítulos de **Educaplay Secundaria (Corrientes)** armados en Adobe After Effects a partir del
máster grabado y su escaleta. El motor de medición ubica cada gráfico en la banda libre que deja la
docente, y un constructor en ExtendScript arma un `.aep` editable con la estética de la plataforma
Educaplay. Sirve para cualquier materia: la materia define la serie y el plató (ver
[Materias y platós](#materias-y-platós)).

Repositorio: <https://github.com/isaacdinamo-debug/EducaPlay-After-Effects>

**Agentes (Claude Code, Antigravity/Gemini): empiecen por [`AGENTS.md`](AGENTS.md).**

## Requisitos

- **macOS o Windows 10/11**, con **Adobe After Effects 2026** (se busca el más nuevo instalado; otra
  versión: variable `AE_APP`).
  - En AE: *Preferencias › Scripting y expresiones* → tildar **«Permitir que los scripts escriban
    archivos y tengan acceso a la red»**. Sin eso, `npm run ae` dice que AE «no responde a scripts».
- **Node ≥ 22.6** (`.nvmrc`), **ffmpeg/ffprobe** en el PATH y **`whisper-cli`** (whisper.cpp; sólo
  para medir capítulos nuevos).
- Las **7 fuentes** `Museo-300`, `Museo-700` y `MuseoSansRounded-300/500/700/900/1000`. No vienen en
  el repo (tienen licencia). En Windows: clic derecho → «Instalar para todos los usuarios» y
  reiniciar AE. Sin ellas el armado no corre: AE las sustituiría en silencio y el cuadro se desarma.

## Instalación (una vez por máquina)

```bash
git clone https://github.com/isaacdinamo-debug/EducaPlay-After-Effects.git
cd EducaPlay-After-Effects/motor
npm ci
cp .env.example .env        # y completá las dos rutas (ver abajo)
npm run doctor -- AMB26-04  # tiene que terminar en 0 problemas
```

`motor/.env` dice dónde están los medios **en esta PC** (cada una los copia a mano):

| Variable | Qué es |
|---|---|
| `EDUCAPLAY_EPISODES` | Carpeta con una subcarpeta por capítulo: `<CODE>/` con el máster, la escaleta `.docx` y `RECURSOS/`. |
| `EDUCAPLAY_MEDIOS` | Carpeta con `public/` de donde `npm run medios` trae másters y recursos de capítulos ya medidos. |

Usá rutas sin espacios al final (Windows no puede crearlas).

## Flujo por capítulo

El paso a paso completo, con lo que no hace ningún script, está en
[`.agents/workflows/episodio-ae.md`](.agents/workflows/episodio-ae.md). Resumido, desde `motor/`:

```bash
npm run doctor -- <CODE>        # máquina, fuentes, plató, medios
npm run nuevo -- <CODE>         # SÓLO capítulos nuevos: medir, transcribir, gatillos, borrador
npm run check -- <CODE>         # tipos + layout + contraste
npm run export:ae -- <CODE>     # manifiesto para After Effects
npm run ae -- <CODE>            # armar el .aep + stills + hoja de contacto (modo vivo)
npm run preview -- <CODE>       # video de revisión en episodios/<CODE>/preview/
npm run publicar -- <CODE>      # chequeo completo y, si pasa: commit, push y PR
```

`npm run ae -- <CODE> --clasico` arma la versión sin modo vivo (ver `docs/ESTETICA.md`).

## Materias y platós

El tracker encuentra a la docente separándola del fondo del plató, así que cada capítulo tiene que
saber en qué plató se grabó. Lo dice `motor/src/brand/estudios.ts`:

| Prefijo | Materia | Plató |
|---|---|---|
| `AMB` | Educación Ambiental Integral | verde |
| `LEO` | Leo, Comprendo y Aprendo | lila |
| `HIS` | Historia | sin declarar |
| `EEF` | Economía y Finanzas | sin declarar |

Si el plató no está declarado, `doctor` y `nuevo` frenan y muestran el color de fondo medido en el
máster. Se declara por capítulo en `motor/src/episodes/<CODE>/tracker.json` (`{"studio": "verde"}`)
o, cuando se confirme, para toda la materia en `estudios.ts`.

## Documentación

- [`AGENTS.md`](AGENTS.md): reglas para agentes y mapa del repo.
- [`.agents/skills/educaplay-after-effects/SKILL.md`](.agents/skills/educaplay-after-effects/SKILL.md):
  criterios y trampas de After Effects.
- [`docs/ESTETICA.md`](docs/ESTETICA.md): la estética de la plataforma y el modo vivo.
- [`docs/SUBTITULOS.md`](docs/SUBTITULOS.md): estándar de subtitulado.

## Pendientes

- Cotejo Whisper ↔ escaleta asistido (la idea del tablero de pre-edición): hoy se hace leyendo la
  tabla de gatillos que imprime `npm run nuevo`.
- Platós de Historia, Matemática y Economía, y el prefijo de Matemática.
