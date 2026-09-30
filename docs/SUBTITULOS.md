# Subtítulos de los capítulos de Educaplay

Estándar de subtitulado que aplica `ae/build-episode.jsx` y verifica `motor/scripts/check-layout.mjs`.
Sale del §1.4 del estándar general (`Secundaria /subtitulos/EDUCAPLAY_MOTION_GRAPHICS_ACTUALIZADO.md`,
escrito para Remotion). Lo que ese documento dice de componentes, comandos o render de Remotion no
rige acá: ver `docs/MIGRACION.md`.

## La pastilla

Un scrim **plano y uniforme**: sin degradados, brillos ni biseles.

| Propiedad | Valor | Nota |
|---|---|---|
| Relleno | negro al 55 % | No la tinta `#07202C` del estándar: sobre el papel del plató da 3,84:1 y el piso es 4,5:1. |
| Desenfoque detrás | 10 px | Capa de ajuste recortada a la pastilla; alcanza al máster porque la precomp va con «contraer transformaciones». |
| Radio | 20 px | |
| Borde | 1 px blanco al 16 % | |
| Filete interior superior | 1 px blanco al 15 % | El `inset 0 1px 0` del estándar. |
| Sombra | negra al 35 %, 32 px de difusión, 8 px abajo | |
| Relleno interno | 34 px a los lados, 14 px arriba y abajo | |

## El texto

- **Museo Sans Rounded 700** (`MuseoSansRounded-700`), blanco, con sombra suave (negro al 50 %,
  2 px abajo, 4 px de difusión).
- Interlineado 1,32.
- **Máximo dos líneas.** `export:ae` pagina con `paginateCaptions` (los mismos parámetros que
  `check-layout`) y AE corta cada página de forma balanceada, midiendo con la fuente real.
- **Sin resaltado por palabra** en los capítulos. El karaoke queda para los reels de redes.
- Una capa de texto por subtítulo: se corrige con doble clic y el timing con los bordes de la capa.
- La marca se escribe **«Educaplay»**. Whisper la transcribe «EducaPlay»: se corrige con
  `CAPTION_FIX` en `data.ts`, igual que cualquier otro error de transcripción.

## Evasión de la placa de nombre

Si un subtítulo se cruza con la placa de la docente (un `RESERVED` de `data.ts`), va **elevado toda
su duración**, no sólo mientras está la placa. La placa del máster empieza a animarse ~25 cuadros
antes de su rango reservado, y un texto no se mueve mientras se lee.

## Contraste

- Nunca texto blanco suelto sobre el plató: los platós son claros (blanco sobre el verde da 2,39:1).
- Todo texto va sobre la pastilla o sobre una tarjeta.
- `npm run check -- <CODE>` verifica los pares de color del tema contra el piso de 4,5:1.
