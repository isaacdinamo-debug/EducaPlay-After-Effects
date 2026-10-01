/**
 * Materias y platós.
 *
 * La estética es una sola (la de la plataforma, ver docs/ESTETICA.md). Lo que
 * cambia de una materia a otra es:
 *   · la SERIE, que va en la portada y en el borrador del data.ts;
 *   · el PLATÓ donde se grabó, porque el tracker encuentra a la docente
 *     separándola del fondo, y cada plató tiene su color y su marca de agua.
 *
 * Puro: sin fs ni React. Lo importan el tracker, el export, los verificadores,
 * `escaleta` y `doctor`.
 *
 * El plató de un capítulo sale, en este orden, de:
 *   1. `src/episodes/<CODE>/tracker.json` → `"studio"`: un nombre de ESTUDIOS
 *      ("verde", "lila") o un plató a medida `{fondo, tolerancia, watermark}`;
 *   2. la materia (prefijo del código) en MATERIAS;
 *   3. si ninguno lo dice: null, y `doctor`/`track` frenan mostrando el color
 *      de fondo medido. No se adivina: un plató mal elegido hace que el
 *      tracker lea el fondo como docente y los gráficos se corran de lugar.
 *
 * Plató nuevo con un color liso (no verde ni lila): alcanza con declararlo
 * a medida en el tracker.json del capítulo, p. ej.
 *   {"studio": {"fondo": [182, 150, 214], "tolerancia": 40}}
 * y, cuando se confirme para toda la materia, pasarlo a ESTUDIOS.
 */

export type Rect = readonly [number, number, number, number];
export type RGB = readonly [number, number, number];

/** Cómo se reconoce un píxel de fondo del plató (RGB 0–255). */
export type Fondo =
  | {tipo: 'verde'; margen: number}
  | {tipo: 'lila'; margen: number}
  | {tipo: 'color'; rgb: RGB; tolerancia: number};

export type Estudio = {
  nombre: string;
  fondo: Fondo;
  /**
   * Marca de agua quemada, en coordenadas de composición 1920×1080: el
   * tracker la anula antes de medir para que no cuente como docente.
   */
  watermark: Rect;
  /**
   * Zona que los gráficos no pueden pisar alrededor de la marca de agua
   * (`formatTokens().watermark`). Más grande que `watermark` a propósito.
   */
  reserva: Rect;
  /** Color del plató: fondo de la comp y referencia de contraste. */
  stage?: string;
};

/** La reserva que usaron todos los capítulos hasta el 30/9/2026 (THEME.layout.watermark). */
const RESERVA_HISTORICA: Rect = [1300, 0, 620, 260];

export const ESTUDIOS: Record<string, Estudio> = {
  verde: {
    nombre: 'plató verde (Ambiente)',
    // Medido sobre AMB24-01: con 18 segmentaron bien 796 de 856 cuadros.
    fondo: {tipo: 'verde', margen: 18},
    // "Educaplay / ED. AMBIENTAL" arriba a la derecha.
    watermark: [1400, 56, 470, 160],
    reserva: RESERVA_HISTORICA,
    stage: '#22BCA2',
  },
  lila: {
    nombre: 'plató lila (Leo)',
    fondo: {tipo: 'lila', margen: 30},
    watermark: [1400, 35, 420, 140],
    // LEO26-04 se armó con la reserva de Ambiente y sus propios RESERVED en
    // data.ts: se mantiene para no mover lo ya medido.
    reserva: RESERVA_HISTORICA,
  },
};

export type Materia = {
  nombre: string;
  /** Tal cual va en pantalla (portada) y en `EPISODE.series`. */
  series: string;
  /** Clave de ESTUDIOS. Sin declarar hasta que se confirme dónde se graba. */
  estudio?: keyof typeof ESTUDIOS;
};

/** Por prefijo del código de capítulo (AMB26-04 → AMB). */
export const MATERIAS: Record<string, Materia> = {
  AMB: {nombre: 'Educación Ambiental Integral', series: 'Educación Ambiental Integral', estudio: 'verde'},
  LEO: {nombre: 'Leo, Comprendo y Aprendo', series: 'Leo, Comprendo y Aprendo', estudio: 'lila'},
  HIS: {nombre: 'Historia', series: 'Historia'},
  EEF: {nombre: 'Economía y Finanzas', series: 'Economía y Finanzas'},
  // Matemática: sin prefijo todavía. Se agrega con su primer capítulo.
};

export const prefijo = (code: string): string => /^[A-Z]+/.exec(code)?.[0] ?? '';
export const materiaDe = (code: string): Materia | null => MATERIAS[prefijo(code)] ?? null;

/** Plató a medida declarado en tracker.json. */
type EstudioAMedida = {fondo: RGB; tolerancia?: number; watermark?: Rect; reserva?: Rect; stage?: string};

/**
 * El plató del capítulo, o null si nadie lo declaró. `studio` es el campo del
 * tracker.json del capítulo (si existe).
 */
export const estudioDe = (
  code: string,
  studio?: string | EstudioAMedida,
): (Estudio & {clave: string}) | null => {
  if (studio && typeof studio === 'object') {
    return {
      clave: 'a medida',
      nombre: `plató a medida rgb(${studio.fondo.join(',')})`,
      fondo: {tipo: 'color', rgb: studio.fondo, tolerancia: studio.tolerancia ?? 40},
      watermark: studio.watermark ?? [0, 0, 0, 0],
      reserva: studio.reserva ?? studio.watermark ?? RESERVA_HISTORICA,
      stage: studio.stage,
    };
  }
  const clave = studio ?? materiaDe(code)?.estudio;
  if (!clave) return null;
  const e = ESTUDIOS[clave];
  if (!e) throw new Error(`Plató "${clave}" desconocido: los que hay son ${Object.keys(ESTUDIOS).join(', ')}`);
  return {clave, ...e};
};

/** ¿Es fondo del plató? (el papel blanco lo resuelve el tracker aparte). */
export const esFondo = (f: Fondo, r: number, g: number, b: number): boolean => {
  if (f.tipo === 'verde') return g - (r > b ? r : b) > f.margen;
  if (f.tipo === 'lila') return Math.min(r, b) - g > f.margen;
  const dr = r - f.rgb[0], dg = g - f.rgb[1], db = b - f.rgb[2];
  return dr * dr + dg * dg + db * db < f.tolerancia * f.tolerancia;
};
