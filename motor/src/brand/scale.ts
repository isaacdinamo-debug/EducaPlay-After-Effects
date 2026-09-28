import type {Rank} from '../episodes/types.ts';

/**
 * Escalera tipográfica de las tarjetas, en dos registros.
 *
 * Es UN sistema con dos tamaños, no dos maquetas: las proporciones entre los
 * cinco niveles se conservan y sólo cambia el cuerpo. El registro lo elige el
 * ancho de la tarjeta, que a su vez lo decidió dónde está parada la docente
 * (ver STAGE_MAX_W en episodes/blocks.ts).
 *
 *   'amplio'  — la docente cedió el cuadro; el gráfico es el protagonista
 *   'compacto'— la docente está en el centro; el gráfico acompaña
 *
 * Los cuerpos caen dentro de la escala del Motion Design System §16 (título
 * junto al docente 48–56, antetítulo 26–32, bajada 34–40, epígrafe 22–28) y
 * ninguno baja del piso `legibility.bodyMinPx` = 26 del tema.
 *
 * El numeral es la excepción declarada: no es texto para leer sino TEXTURA —
 * lo que dice está duplicado en el antetítulo, que sí cumple contraste. Por eso
 * puede vivir al 14 % de opacidad sin ser un problema de accesibilidad.
 */
export type TypeScale = {
  key: 'amplio' | 'compacto';
  numeral: number;
  kicker: number;
  title: number;
  body: number;
  caption: number;
  credit: number;
  pad: number;
  gap: number;
  /** Alto de la barra arcoíris. La placa quemada mide ~24 px; ver RainbowRail. */
  rail: number;
  /**
   * Cuánto del ancho disponible ocupa una tarjeta de REFUERZO.
   *
   * No es una constante: 0,70 abre una segunda columna clarísima en la banda de
   * 900 px, pero aplicado a los 560 px de un tramo centrado deja 392 px y ahí el
   * epígrafe empieza a partirse en dos líneas por cualquier cosa. En compacto
   * alcanza con 0,82 para que el rango se lea y el texto respire.
   */
  refuerzo: number;
};

/*
 * `feat/embellecer-tarjetas`: la placa quemada del máster es la referencia de
 * aire y de jerarquía. Lleva el texto grande con mucho blanco alrededor, y
 * nuestras tarjetas se leían apretadas a su lado. Subieron dos cosas: el `pad`
 * (34→40 / 26→30) y el `title` (52→56 / 42→46), para que el salto entre el
 * título y el resto se lea de un vistazo. Cuerpo, bajada y epígrafe NO
 * cambian: están en el piso que pidió la correctora o apenas arriba.
 */
const AMPLIO: TypeScale = {
  key: 'amplio',
  numeral: 116,
  kicker: 26,
  title: 56,
  body: 34,
  caption: 34,
  credit: 22,
  pad: 40,
  gap: 16,
  rail: 22,
  refuerzo: 0.7,
};

const COMPACTO: TypeScale = {
  key: 'compacto',
  numeral: 72,
  kicker: 24,
  title: 46,
  body: 30,
  caption: 30,
  credit: 20,
  pad: 30,
  gap: 12,
  rail: 18,
  refuerzo: 0.82,
};

/** Umbral entre registros: por encima de esto sólo se llega en la banda de 900. */
export const WIDE_FROM = 700;

export const scaleFor = (width: number): TypeScale =>
  width >= WIDE_FROM ? AMPLIO : COMPACTO;

/*
 * Barra arcoíris institucional.
 *
 * Los cuatro hexes salen MEDIDOS de la barra que el máster trae quemada sobre
 * la placa de nombre ("Prof. Paola Suárez") — ver `THEME.rainbow`. Desde
 * `feat/embellecer-tarjetas` también se copia la FORMA: tramos de ancho fijo con
 * corte diagonal y la contracción de entrada de la placa. Vive en
 * `components/RainbowRail.tsx`, con las medidas; el alto sale de `rail` en la
 * escala de arriba. Hasta entonces esto era una cabecera recta de cuatro
 * cuartos y 10 px, documentada acá como "divergencia declarada".
 *
 * Se usa sólo en las tarjetas didácticas — es el distintivo del rango, y por
 * eso la presencia se decide en `showsRainbow()` y no tarjeta por tarjeta.
 */

/**
 * ¿Esta tarjeta lleva barra? Es la ÚNICA respuesta a esa pregunta.
 *
 * La barra es el distintivo visible del rango: didáctico la lleva, refuerzo no.
 * Vivía repetida como un `rank === 'didactico'` suelto en cada tarjeta, y
 * `Titular` directamente la dibujaba sin mirar el rango —era el único
 * componente cuya barra no derivaba del contrato— mientras `DefinitionCard`, que
 * es del mismo rango editorial que `Checklist`, no podía llevarla nunca.
 *
 * Centralizarlo es el mismo criterio que `STAGE_MAX_W` en `episodes/blocks.ts`:
 * una regla que vale para todo el sistema se escribe una sola vez, o las
 * tarjetas se desincronizan sin que nada lo note.
 *
 * El DEFAULT no vive acá: cada tarjeta declara el suyo y lo justifica —
 * `ResourceCard` asume refuerzo (un recurso sin declarar no se promueve solo),
 * `VideoCard`, `Checklist`, `Titular` y `DefinitionCard` asumen didáctico
 * (olvidarse de declararlo no puede degradar una evidencia a decoración).
 */
export const showsRainbow = (rank: Rank): boolean => rank === 'didactico';
