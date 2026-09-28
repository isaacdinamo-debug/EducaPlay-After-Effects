/**
 * Pictogramas que un bloque puede pedir por nombre.
 *
 * En Remotion esta union vivía en `components/Pictogram.tsx`, junto al dibujo.
 * En After Effects los dibuja `ae/build-episode.jsx` (tabla `ICONS`): un nombre
 * nuevo acá necesita su trazo allá, o el ítem sale con el tilde genérico.
 */
export type PictoName =
  | 'hartan' | 'narrador' | 'descubrir' | 'biologia'
  | 'tarjeta' | 'definicion' | 'voz' | 'tiempo'
  // AMB26-04 · protocolo ante inundación.
  | 'luz' | 'gas' | 'agua'
  | 'auto' | 'moto' | 'bici'
  | 'alerta';
