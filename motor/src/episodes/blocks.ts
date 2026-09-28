import type {Block, SlotSpec, Track} from './types.ts';
import type {Grammar} from '../brand/motion.ts';
import {isGraphicsOnly} from '../layout/presenter.ts';
import {FORMAT_169, type FormatTokens} from '../brand/format.ts';

/**
 * Slot por defecto de un bloque del capítulo.
 *
 * `maxWidth` 560 y no los 1010 de la serie Leo: la banda libre real de un
 * máster de una sola toma centrada, medida sobre la ventana de cada cue, ronda
 * los 450–520 px. Un bloque puede pedir otro con `slot`.
 */
export const DEFAULT_BLOCK_SLOT: SlotSpec = {
  side: 'opposite',
  align: 'center',
  maxWidth: 560,
  maxHeight: 620,
};

/**
 * Techo de ancho y alto según DÓNDE ESTÁ PARADA LA DOCENTE.
 *
 * No es una preferencia estética: es el criterio editorial del capítulo —"si la
 * docente está en el centro la protagonista es ella; si se corre a un costado,
 * el protagonista es el Motion Graphics"— traducido a la única variable que lo
 * produce.
 *
 * Funciona porque `resolveSlot` ancla la tarjeta al borde EXTERIOR del cuadro,
 * no al centro de la banda: el borde exterior no se mueve en los 179 s, y lo que
 * cambia es hasta dónde CRECE HACIA ADENTRO cuando la docente cede el cuadro.
 * Si se anclara al centro de la banda, subir el techo movería la tarjeta entera.
 *
 * Los números salen de las bandas que midió el tracker en AMB26-04, menos
 * `safe` (56) y `slotPad` (48):
 *
 *     c1  f392–1092   centro     banda derecha    672 →  568 útiles
 *     l2  f1126–2399  izquierda  banda derecha   1024 →  920 útiles
 *     c3  f2427–4282  centro     banda izquierda  632 →  528 útiles
 *
 * O sea: en los tramos centrados la banda YA es el límite y el techo no ata
 * nada; el que cambia de verdad es el de `left`. `maxWidth` es un techo, no un
 * objetivo — `resolveSlot` recorta siempre contra la banda real.
 *
 * Desde que la serie emite también en 9:16, la tabla vive en
 * `brand/format.ts`: hay una por formato. Estas dos constantes son la vista
 * 16:9 de esa tabla y siguen exportadas porque las lee `check-layout.mjs` y
 * están citadas en la documentación del motor.
 */
export const STAGE_MAX_W = Object.fromEntries(
  Object.entries(FORMAT_169.stageMax).map(([k, v]) => [k, v.w]),
) as Record<keyof FormatTokens['stageMax'], number>;

export const STAGE_MAX_H = Object.fromEntries(
  Object.entries(FORMAT_169.stageMax).map(([k, v]) => [k, v.h]),
) as Record<keyof FormatTokens['stageMax'], number>;

/**
 * Encuadres que atraviesa un bloque durante toda su vida.
 *
 * Se mira la ventana entera y no sólo el frame de entrada porque el techo tiene
 * que ser CONSTANTE mientras el gráfico está en pantalla: si un bloque empieza
 * con la docente a un lado y termina con ella en el centro, tomar el techo del
 * arranque lo haría encogerse a mitad de camino, que es justo lo que un paneo
 * no debe provocar. Se toma el más chico de los encuadres que toca.
 */
const ceilingFor = (
  track: Track,
  from: number,
  to: number,
  fmt: FormatTokens,
) => {
  // Episodio sin docente: no hay encuadre que ceder el cuadro, el techo es uno
  // solo para toda la pieza. Ver `isGraphicsOnly`.
  if (isGraphicsOnly(track)) {
    const {w, h} = fmt.stageMax.full;
    return {maxWidth: w, maxHeight: h};
  }

  let w = Infinity;
  let h = Infinity;
  for (const s of track.segments) {
    if (s.to <= from || s.from >= to) continue;
    const box = fmt.stageMax[s.framing] ?? fmt.stageMax.center;
    w = Math.min(w, box.w);
    h = Math.min(h, box.h);
  }
  return {
    maxWidth: Number.isFinite(w) ? w : DEFAULT_BLOCK_SLOT.maxWidth,
    maxHeight: Number.isFinite(h) ? h : DEFAULT_BLOCK_SLOT.maxHeight,
  };
};


/**
 * ¿Este bloque ocupa el cuadro entero, fuera del motor de bandas?
 *
 * La pregunta estaba escrita TRES veces —dos filtros en `Episode.tsx` y uno en
 * `check-layout.mjs`— con la misma expresión copiada. Es exactamente el modo de
 * falla contra el que advierte el comentario de `slotOf`: el render y el
 * verificador resolviendo lo mismo por separado. Cada `kind` nuevo a cuadro
 * completo multiplicaba la deuda, así que la pregunta pasa a tener un solo
 * dueño.
 */
export const isFullFrame = (b: Block): boolean =>
  b.kind === 'plate' || ('bleed' in b && b.bleed === true);

/**
 * Qué operación cognitiva realiza cada tipo de bloque.
 *
 * Es la tabla que hace que el estilo se DERIVE del contenido: el `data.ts`
 * declara `kind` y el constructor de After Effects deriva de ahí la cinética.
 * Un capítulo nuevo hereda el repertorio sin decidir nada estético.
 */
export const GRAMMAR_OF: Record<Block['kind'], Grammar> = {
  titular: 'concepto',
  photo: 'causa',
  video: 'causa',
  gif: 'causa',
  evidence: 'enumeracion',
  checklist: 'enumeracion',
  definition: 'definicion',
  sheet: 'definicion',
  plate: 'definicion',
  outro: 'sintesis',
  concepto: 'concepto',
  alerta: 'dato',
  formula: 'sintesis',
  secuencia: 'enumeracion',
};

/**
 * Preferencia de slot según el TIPO de bloque.
 *
 * Nace vacía para todos los `kind` existentes, y eso no es provisorio: es la
 * única forma de que el baseline de stills quede idéntico POR CONSTRUCCIÓN y no
 * porque alguien lo revisó. Los `kind` nuevos la llenan; los viejos no cambian.
 *
 * Es una PREFERENCIA, no un techo: ver cómo la pliega `slotOf`.
 */
export const KIND_SLOT: Partial<Record<Block['kind'], Partial<SlotSpec>>> = {
  // El cierre es la firma de la pieza: va abajo, donde queda el ojo al final.
  // No pide medidas — el techo del encuadre ya las da, y pedirlas sería
  // competir con la docente en los capítulos que la tienen en cuadro.
  outro: {align: 'bottom'},
};

/**
 * Slot efectivo de un bloque: el default, el techo del encuadre, la preferencia
 * de su tipo, y encima lo que el bloque pida explícitamente.
 *
 * Vive en un módulo SIN JSX a propósito: lo importan tanto `<Episode>` como
 * `check-layout.mjs`, y el verificador corre con `--experimental-strip-types`,
 * que no sabe leer `.tsx`. Si esto viviera en Episode.tsx, el verificador no
 * podría resolver el mismo slot que el render — y verificaría otra cosa.
 */
export const slotOf = (
  b: Block,
  track: Track,
  fmt: FormatTokens = FORMAT_169,
): SlotSpec => {
  const ceiling = ceilingFor(track, b.from, b.to, fmt);
  const pref = KIND_SLOT[b.kind] ?? {};

  // `ceilingFor` es una restricción FÍSICA —ahí está parada la docente— y
  // `KIND_SLOT` es una preferencia del tipo de bloque. Si la preferencia se
  // aplicara con spread, una cronología que pidiera 900 px se le sentaría
  // encima, y `check-layout` no lo vería: el verificador llama a esta misma
  // función, así que heredaría el error en vez de cazarlo. Las medidas se
  // pliegan con `Math.min`; el resto de los ejes sí son override directo.
  const folded: Partial<SlotSpec> = {...pref};
  if (pref.maxWidth !== undefined) {
    folded.maxWidth = Math.min(ceiling.maxWidth, pref.maxWidth);
  }
  if (pref.maxHeight !== undefined) {
    folded.maxHeight = Math.min(ceiling.maxHeight, pref.maxHeight);
  }

  return {
    ...DEFAULT_BLOCK_SLOT,
    ...ceiling,
    ...folded,
    // Lo que el bloque pide a mano sigue ganando, incluido sobre el techo: es
    // el contrato con el que están montados los capítulos aprobados.
    ...('slot' in b ? b.slot : undefined),
  };
};
