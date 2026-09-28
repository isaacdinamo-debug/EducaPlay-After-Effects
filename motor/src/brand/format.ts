/**
 * Tokens de layout por FORMATO.
 *
 * Puro: sin React, sin Remotion. Lo importan `<Stage>`, `<Captions>`,
 * `blocks.ts` y `scripts/check-layout.mjs` — el verificador corre con
 * `--experimental-strip-types`, así que acá no puede haber JSX ni hooks. Es el
 * mismo criterio por el que `rects.ts` y `blocks.ts` ya viven sin JSX: el
 * verificador tiene que resolver EXACTAMENTE la misma caja que el render.
 *
 * Hasta 2026-09-07 estos números vivían sueltos en `THEME.layout`,
 * `THEME.captions`, `blocks.ts` y el `width = 1920` por defecto de
 * `<Captions>`. Mientras la serie fue 16:9 eso no molestaba. El capítulo sin
 * docente obliga a emitir 9:16 del mismo árbol, y entonces cada `1080` suelto
 * es un bug esperando.
 *
 * Los valores 16:9 son los de `THEME` y se LEEN de ahí, no se copian: el tema
 * sigue siendo la fuente de verdad del formato de emisión principal, y así no
 * pueden divergir.
 *
 * Reemplaza a `brand/layout.ts` (`useFmt`), que era una copia muerta del hook
 * de Historia que nadie importaba.
 */

import {THEME} from './ambienteTheme.ts';
import type {Framing, ReservedRect} from '../layout/presenter.ts';

export type Safe = {top: number; right: number; bottom: number; left: number};
export type Box = {w: number; h: number};

export type FormatTokens = {
  width: number;
  height: number;
  /** 9:16. El único predicado de formato; nadie compara anchos a mano. */
  vertical: boolean;
  safe: Safe;
  /** Y donde empieza la esquina de papel rasgado del plató. */
  paperBandY: number;
  /** Techo de la banda de subtítulos. Derivado de `captions`, nunca suelto. */
  captionBandY: number;
  slotPad: number;
  defaultFraming: Framing;
  /** Marca de agua quemada en el plató, [x, y, w, h]. */
  watermark: readonly [number, number, number, number];
  captions: {
    scrim: string;
    scrimAlpha: number;
    fontSize: number;
    bottom: number;
    maxWidth: number;
    maxHeight: number;
  };
  /**
   * Techo de tarjeta según dónde esté parado el docente.
   *
   * `full` no es un `Framing`: es el caso del episodio SIN docente en todo el
   * máster, donde el gráfico es el protagonista y usa el cuadro entero. Ver
   * `slotOf` en `episodes/blocks.ts`.
   */
  stageMax: Record<Framing | 'full', Box>;
  /**
   * Elementos quemados en el plató de ESTE formato.
   *
   * En 16:9 va vacío: el plató es material filmado, así que los rects los mide
   * el tracker (`track.reserved`) y los completa el episodio (`RESERVED`), que
   * es donde tienen que estar porque cambian de máster a máster.
   *
   * En 9:16 el plató lo generamos nosotros con `scripts/plate-vertical.mjs`, y
   * entonces la mosca y las dos esquinas de papel están donde nosotros las
   * pusimos, iguales para toda la serie. Estos números y los del script son la
   * misma decisión escrita dos veces: si se mueve uno hay que mover el otro.
   */
  plateReserved: readonly ReservedRect[];
};

/**
 * Techos de tarjeta en 16:9. Son los que estaban en `blocks.ts` y no se tocan:
 * salen de las bandas que midió el tracker en AMB26-04 menos `safe` y `slotPad`.
 */
const STAGE_MAX_H169: Record<Framing | 'full', Box> = {
  center: {w: 560, h: 380},
  left: {w: 900, h: 560},
  right: {w: 900, h: 560},
  // Plató vacío DENTRO de un capítulo con docente: la apertura, antes de que
  // entre. Sigue en 760 a propósito — una tarjeta a cuadro completo que después
  // tiene que encogerse para dejarle sitio se lee como un error de montaje.
  none: {w: 760, h: 560},
  transition: {w: 560, h: 380},
  // Episodio sin docente de punta a punta. 1400 y no 1808 (el ancho seguro
  // completo): a 1808 px una línea de texto pasa de los 90 caracteres y deja de
  // leerse. 1400 es el ancho de tarjeta más grande que respeta la medida.
  full: {w: 1400, h: 760},
};

/**
 * Techos en 9:16. El vertical se lee en el celular a un brazo de distancia:
 * prioriza altura y ancho casi completo, porque no hay banda lateral que ceder.
 */
const STAGE_MAX_V: Record<Framing | 'full', Box> = {
  center: {w: 920, h: 620},
  left: {w: 920, h: 720},
  right: {w: 920, h: 720},
  none: {w: 920, h: 720},
  transition: {w: 920, h: 620},
  full: {w: 920, h: 1180},
};

/** Zona segura vertical: BRANDBOOK §9 — 80 lateral, 110 superior. */
const SAFE_V: Safe = {top: 110, right: 80, bottom: 110, left: 80};

/**
 * Subtítulos en 9:16. Cuerpo más grande y banda mucho más alta que en 16:9.
 *
 * `bottom: 360` es el 18,75 % del alto, y sale de dos medidas concretas, no del
 * gusto:
 *
 *   · TikTok, Reels y Shorts tapan con su propia interfaz —texto del posteo,
 *     botones— aproximadamente el 18 % inferior del cuadro. A los 210 px que
 *     tenía antes (11 %) la cápsula quedaba adentro;
 *   · la esquina de papel rasgado del plató arranca en y=1768, y a 210 px la
 *     cápsula terminaba 58 px por encima. Un subtítulo oscuro pegado al papel
 *     blanco es el peor sitio del cuadro para ponerlo. Ahora le quedan 208.
 *
 * `maxHeight` NO se toca para subir la cápsula. Es la reserva contra la que
 * `check-layout` verifica la banda, y el subtítulo más alto de la serie mide
 * 186 px (3 líneas × 42 × 1,32 + padding). Achicarla para mover la cápsula sin
 * mover el piso de los gráficos dejaría al verificador comprobando una caja que
 * no existe.
 *
 * El aire entre el piso de los gráficos y la cápsula es `maxHeight` menos el
 * alto real —114 px— y no depende de `bottom`: subir la banda sube el piso con
 * ella, así que el subtítulo nunca se acerca a un gráfico. Ver `captionBandY`.
 */
const CAPTIONS_V = {
  scrim: THEME.captions.scrim,
  scrimAlpha: THEME.captions.scrimAlpha,
  fontSize: 42,
  bottom: 360,
  maxWidth: 920,
  maxHeight: 300,
};

/**
 * Esquinas de papel rasgado del plató vertical, [x, y, w, h].
 *
 * En 16:9 estos rects se miden sobre el máster filmado. En 9:16 el plató lo
 * genera `scripts/plate-vertical.mjs`, así que estos números son la POSICIÓN
 * QUE LE PEDIMOS al script y no una medición: son la misma decisión escrita en
 * dos archivos y tienen que moverse juntos. El script los imprime al terminar
 * para poder compararlos.
 *
 * El tamaño es el del papel en el máster, sin escalar: la trama del plató
 * vertical también va a escala nativa, y un papel reescalado al lado de una
 * trama que no lo está se lee como otro plató.
 */
const PAPER_TL_V = [0, 0, 448, 148] as const;
const PAPER_BR_V = [1080 - 508, 1920 - 152, 508, 152] as const;

/**
 * En 9:16 no hay marca de agua.
 *
 * Tampoco la hay en el máster 16:9 de este corte: el plató sale del tramo
 * vacío del capítulo largo, anterior a que entre la mosca institucional. Si
 * algún día la pieza se entrega con mosca, el rect va acá y en el script.
 */
const WATERMARK_V = [0, 0, 0, 0] as const;

export const formatTokens = (width: number, height: number): FormatTokens => {
  const vertical = height > width;

  const safe = vertical ? SAFE_V : THEME.layout.safe;
  const captions = vertical ? CAPTIONS_V : THEME.captions;
  // En vertical el piso es donde EMPIEZA el papel que pega el script, no una
  // proporción elegida: los dos tienen que ser el mismo número.
  const paperBandY = vertical ? PAPER_BR_V[1] : THEME.layout.paperBandY;

  // Ver `plateReserved`. `from`/`to` los completa <Stage>: acá no sabemos
  // cuánto dura el episodio, y el plató está quemado de punta a punta.
  const plateReserved: ReservedRect[] = vertical
    ? [
        {key: 'papel-sup-izq', rect: PAPER_TL_V, from: 0, to: 0},
        {key: 'papel-inf-der', rect: PAPER_BR_V, from: 0, to: 0},
      ]
    : [];

  return {
    width,
    height,
    vertical,
    safe,
    // La esquina de papel arranca al 86,5 % del alto en 16:9 (934/1080). El
    // plató vertical se genera con la esquina en la misma proporción.
    paperBandY,
    captionBandY: height - captions.bottom - captions.maxHeight,
    slotPad: THEME.layout.slotPad,
    defaultFraming: THEME.layout.defaultFraming,
    watermark: vertical
      ? (WATERMARK_V as readonly [number, number, number, number])
      : (THEME.layout.watermark as readonly [number, number, number, number]),
    captions,
    stageMax: vertical ? STAGE_MAX_V : STAGE_MAX_H169,
    plateReserved,
  };
};

/** Tokens del formato de emisión principal. Atajo para código que no es de render. */
export const FORMAT_169 = formatTokens(1920, 1080);
export const FORMAT_916 = formatTokens(1080, 1920);
