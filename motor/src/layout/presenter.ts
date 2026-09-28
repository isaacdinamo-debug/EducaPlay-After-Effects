/**
 * Contrato del track de presentador + resolución de slots.
 *
 * Puro: sin React, sin Remotion. Lo comparten <Slot> y check-layout.mjs.
 *
 * La idea central: el máster ya decide dónde se para el profesor. Nosotros lo
 * medimos una vez (scripts/track-presenter.mjs) y después los gráficos se
 * ubican solos en la banda libre opuesta. La regla del usuario —"cuando el
 * profesor se corre a la izquierda, la caja de texto va a la derecha"— deja de
 * ser una decisión manual por episodio y pasa a ser infraestructura.
 */

import type {FormatTokens} from '../brand/format.ts';
import {
  type Rect,
  clampSize,
  fromTuple,
  inset,
  intersect,
  lerpRect,
  rect,
  subtractAll,
} from './rects.ts';

/**
 * Ancho máximo plausible de una persona en cuadro; por encima es ruido.
 *
 * 1500, no los 1150 de la serie Leo: en AMB24-01 el profesor va notablemente
 * más cerca de cámara. Medido sobre 796 cuadros, ocupa el 52 % del ancho en la
 * mediana y el 70 % en el p90 — 1000 px y 1345 px llevados a 1920. Con 1150 se
 * descartarían como ruido justo los cuadros en que abre los brazos, que son los
 * que más achican la banda libre y por lo tanto los que más importan.
 */
export const MAX_PERSON_W = 1500;

export type Framing = 'center' | 'left' | 'right' | 'none' | 'transition';
/** Banda libre del cuadro. Sólo hay dos porque el docente ocupa la otra. */
export type Side = 'left' | 'right';
/**
 * Dónde se ancla la tarjeta. `center` no es una banda libre: es el caso del
 * episodio SIN docente, donde no hay silueta que esquivar y el gráfico usa el
 * cuadro entero. Ver `isGraphicsOnly`.
 */
export type Anchor = Side | 'center';

export type ReservedRect = {
  key: string;
  /** [x, y, w, h] en el espacio del formato principal (16:9). */
  rect: readonly number[];
  /**
   * El mismo rect en 9:16, si el episodio lo declara.
   *
   * No se deriva del horizontal: un rect quemado no se reescala, se vuelve a
   * medir sobre el plató vertical. Un rect sin `rectV` sencillamente no existe
   * en vertical y <Stage> lo descarta — es lo correcto para los que describen
   * algo del máster 16:9, que en vertical no está.
   */
  rectV?: readonly number[];
  from: number;
  to: number;
};

export type Segment = {
  key: string;
  from: number;
  /** Exclusivo. */
  to: number;
  framing: Framing;
  /** Silueta del profesor, [x,y,w,h]. Ausente si framing === 'none'. */
  subject?: readonly number[];
  /**
   * Envolvente horizontal por franja: [yA, yB, x0, x1], con x0/x1 = -1 si la
   * franja está vacía.
   *
   * La silueta NO es un rectángulo. A la altura de la cabeza el profesor mide
   * ~300px de ancho; a la altura de las manos abiertas se va a ~950px. Usar el
   * bbox completo desperdicia media pantalla: una tarjeta alta y angosta cabe
   * al costado de la cabeza aunque un gesto ocupe ese x 400px más abajo.
   */
  profile?: readonly (readonly number[])[];
  /**
   * Lo mismo que `profile`, pero por VENTANA DE TIEMPO: `x0[b][t]` / `x1[b][t]`
   * son la envolvente de la franja `b` durante los frames
   * `[(from+t)*step, (from+t+1)*step)`. -1 si la ventana está vacía.
   *
   * Existe porque `profile` unifica todo el segmento, y en un máster de una
   * sola toma larga eso equivale a "lo más ancho que gesticuló en 2,5 minutos".
   * Un gráfico sólo tiene que esquivar los gestos de SU ventana.
   */
  profileT?: {
    step: number;
    /** Índice de la primera muestra, en unidades de `step`. */
    from: number;
    x0: readonly (readonly number[])[];
    x1: readonly (readonly number[])[];
  };
  free?: {left?: readonly number[] | null; right?: readonly number[] | null};
  /** Sólo en framing === 'transition'. */
  kind?: 'move' | 'cut';
  /** Clave del segmento destino. */
  to_?: string;
};

export type Track = {
  version: number;
  /** Nombre del máster del que se midió. */
  source?: string;
  fps: number;
  /** Ancho de COMPOSICIÓN, no del máster: el track ya viene escalado. */
  width: number;
  height: number;
  /** Tamaño real del máster. Sólo informativo. */
  master?: {width: number; height: number};
  durationInFrames: number;
  segments: Segment[];
  reserved: ReservedRect[];
  /** Datos crudos por frame; sólo los usa el verificador, no el render. */
  frames?: {
    x0: number[];
    x1: number[];
    y0: number[];
    cover: number[];
    bands?: {n: number; height: number; x0: number[][]; x1: number[][]};
  };
};

/**
 * Reexpresa el track en el tamaño de la composición.
 *
 * El tracker emite siempre en 1920×1080 (`LAYOUT_W/H` de track-presenter.mjs).
 * Para un episodio sin docente el track no contiene geometría —un solo
 * segmento `none`, sin `subject`, sin `profile`, sin `free`— así que su ancho y
 * alto son sólo el tamaño del lienzo y cambiarlos es exacto.
 *
 * Para un episodio CON docente no lo es: la silueta medida en 16:9 no dice nada
 * de dónde cae en 9:16. Eso pide re-medir con `LAYOUT_W/H` verticales y bandas
 * superior/inferior en vez de laterales, que es otro trabajo. Acá se falla
 * fuerte en vez de devolver una caja plausible y equivocada.
 */
const adapted = new WeakMap<Track, Map<string, Track>>();

export const adaptTrack = (track: Track, width: number, height: number): Track => {
  if (track.width === width && track.height === height) return track;

  if (!isGraphicsOnly(track)) {
    throw new Error(
      `El track de "${track.source ?? 'sin nombre'}" se midió en ${track.width}×${track.height} ` +
        `y la composición es ${width}×${height}. Un episodio CON docente no se ` +
        `reencuadra reescalando el track: hay que volver a medirlo en ese formato.`,
    );
  }

  // Memoizado para no romper la identidad referencial: <Stage> memoiza su
  // contexto por track, y devolver un objeto nuevo en cada frame lo anularía.
  let bySize = adapted.get(track);
  if (!bySize) adapted.set(track, (bySize = new Map()));
  const key = `${width}x${height}`;
  const hit = bySize.get(key);
  if (hit) return hit;

  const next: Track = {...track, width, height};
  bySize.set(key, next);
  return next;
};

/**
 * Los rects quemados que valen en un formato.
 *
 * En 16:9 son los que midió el tracker más los que declara el episodio, tal
 * cual. En 9:16 el plató lo generamos nosotros, así que sus elementos salen de
 * `fmt.plateReserved`; de los del episodio sobreviven sólo los que declararon
 * `rectV`, porque un rect medido sobre el máster horizontal no significa nada
 * en el vertical y reescalarlo sería inventar un dato.
 *
 * Vive acá y no en <Stage> para que `check-layout` verifique exactamente los
 * mismos agujeros que esquiva el render.
 */
export const reservedForFormat = (
  track: Track,
  extra: readonly ReservedRect[] | undefined,
  fmt: FormatTokens,
  duration: number,
): ReservedRect[] => {
  const declared = [...track.reserved, ...(extra ?? [])];
  if (!fmt.vertical) return declared;

  return [
    ...fmt.plateReserved.map((r) => ({...r, to: r.to || duration})),
    ...declared
      .filter((r) => r.rectV)
      .map((r) => ({...r, rect: r.rectV as readonly number[]})),
  ];
};

export type SlotRequest = {
  side?: 'opposite' | 'widest' | 'center' | Anchor;
  fallback?: Side;
  align?: 'top' | 'center' | 'bottom';
  maxWidth?: number;
  maxHeight?: number;
  pad?: number;
  avoid?: string[];
  overPaper?: boolean;
  /** Permite bajar del techo de los subtítulos. Ver ResolveOpts.captionBandY. */
  overCaptions?: boolean;
  /**
   * Ventana de vida del gráfico, en frames absolutos. Si está, la envolvente
   * del profesor se mide SÓLO en esos frames, no en todo el segmento.
   *
   * Es lo que hace utilizable un máster de una sola toma: sin ventana, un
   * titular de 12 s tiene que esquivar cada gesto de los 2,5 minutos.
   *
   * La caja resultante es CONSTANTE durante toda la ventana, así que el
   * gráfico no tiembla: se ubica una vez, contra el peor gesto de su tramo.
   */
  window?: {from: number; to: number};
};

/**
 * Arma el pedido de slot de un bloque que vive entre `from` y `to`.
 *
 * Existe para que el RENDER y el VERIFICADOR no puedan divergir. La ventana
 * cambia la caja que devuelve `resolveSlot` (ver `SlotRequest.window`), así que
 * si `<Episode>` la pasara y `check-layout` no, el verificador estaría
 * aprobando una caja que nadie dibuja — el peor tipo de verde.
 */
export const blockRequest = <T extends SlotRequest>(
  slot: T,
  block: {from: number; to: number},
): T & {window: {from: number; to: number}} => ({
  ...slot,
  window: {from: block.from, to: block.to},
});

export type SlotBox = Rect & {
  side: Anchor;
  framing: Framing;
  /** 0 en estado estable, 0..1 durante un cambio de encuadre. */
  moving: number;
};

export type ResolveOpts = {
  safe: {top: number; right: number; bottom: number; left: number};
  paperBandY: number;
  /**
   * Y donde empieza la banda de subtítulos. Ningún gráfico baja de acá.
   *
   * En la serie Leo los subtítulos se esquivaban corriendo la BANDA
   * (`CAPTION_AVOID`), porque el panel de lectura ocupaba media pantalla y
   * había que negociar. Acá es al revés: los gráficos viven en una columna
   * lateral angosta y sobra alto, así que es más simple —y más estable— que el
   * techo de los subtítulos sea un piso duro para los slots.
   *
   * Un bloque que legítimamente tenga que bajar ahí lo pide con `overCaptions`.
   */
  captionBandY?: number;
  slotPad: number;
  defaultFraming: Framing;
};

/**
 * ¿El episodio no tiene docente a cámara en NINGÚN momento?
 *
 * Es la diferencia entre "el plató está vacío en la apertura, antes de que
 * entre la docente" y "esta pieza es sólo motion graphics". En el primer caso
 * la tarjeta sigue viviendo en una banda lateral, porque en dos segundos hay
 * alguien ahí y una tarjeta que se encoge para hacerle sitio se lee como un
 * error de montaje. En el segundo no hay banda: el cuadro es del gráfico.
 *
 * Se memoiza porque `resolveSlot` corre una vez por slot y por frame, y el
 * track es el mismo objeto durante toda la composición.
 */
const graphicsOnly = new WeakMap<Track, boolean>();

export const isGraphicsOnly = (track: Track): boolean => {
  const hit = graphicsOnly.get(track);
  if (hit !== undefined) return hit;
  const v =
    track.segments.length > 0 && track.segments.every((s) => s.framing === 'none');
  graphicsOnly.set(track, v);
  return v;
};

/** Segmento activo en un frame. Los segmentos están ordenados y no se solapan. */
export const segmentAt = (track: Track, frame: number): Segment | undefined => {
  for (const s of track.segments) {
    // Un 'cut' tiene from === to; lo tratamos como longitud cero y lo saltamos.
    if (s.from <= frame && frame < s.to) return s;
  }
  return track.segments[track.segments.length - 1];
};

export const segmentByKey = (track: Track, key: string) =>
  track.segments.find((s) => s.key === key);

export const reservedAt = (
  track: Track,
  frame: number,
  avoid?: string[],
): Rect[] =>
  track.reserved
    .filter((r) => frame >= r.from && frame < r.to)
    .filter((r) => !avoid || avoid.includes(r.key))
    .map((r) => fromTuple(r.rect));

/**
 * Envolvente horizontal del profesor en un rango vertical concreto.
 * Devuelve null si no hay perfil o si ninguna franja del rango está ocupada.
 */
const envelopeIn = (
  seg: Segment,
  yTop: number,
  yBottom: number,
  window?: {from: number; to: number},
): {x0: number; x1: number} | null => {
  if (!seg.profile?.length) return null;

  const pt = seg.profileT;
  if (window && pt) {
    // Muestras de `profileT` que caen dentro de la ventana pedida, acotadas al
    // segmento. Se redondea hacia afuera para no perder el frame de los bordes.
    const a = Math.floor(Math.max(window.from, seg.from) / pt.step) - pt.from;
    const b = Math.ceil(Math.min(window.to, seg.to) / pt.step) - pt.from;
    const nT = pt.x0[0]?.length ?? 0;
    const lo = Math.max(0, a);
    const hi = Math.min(nT, b);

    if (hi > lo) {
      let x0 = Infinity;
      let x1 = -Infinity;
      for (let bi = 0; bi < seg.profile.length; bi++) {
        const [yA, yB] = seg.profile[bi];
        if (yB <= yTop || yA >= yBottom) continue;
        const rowLo = pt.x0[bi];
        const rowHi = pt.x1[bi];
        if (!rowLo || !rowHi) continue;
        for (let t = lo; t < hi; t++) {
          const p = rowLo[t];
          const q = rowHi[t];
          if (p < 0 || q <= p) continue;
          if (p < x0) x0 = p;
          if (q > x1) x1 = q;
        }
      }
      // Si en toda la ventana no hubo una sola muestra plausible en esas
      // franjas, se cae al perfil del segmento: prudente antes que optimista.
      if (x1 > x0) return {x0, x1};
    }
  }

  let x0 = Infinity;
  let x1 = -Infinity;
  for (const band of seg.profile) {
    const [yA, yB, bx0, bx1] = band;
    if (bx0 < 0 || yB <= yTop || yA >= yBottom) continue;
    if (bx0 < x0) x0 = bx0;
    if (bx1 > x1) x1 = bx1;
  }
  return x1 > x0 ? {x0, x1} : null;
};

/**
 * Elige la banda libre. `opposite` = el lado contrario al que ocupa el
 * profesor, que es la regla que pidió el usuario.
 */
const pickSide = (seg: Segment, req: SlotRequest, solo: boolean): Anchor => {
  const wants = req.side ?? 'opposite';
  const free = seg.free ?? {};
  const has = (s: Side) => Boolean(free[s]);

  // Pedido explícito: manda siempre.
  if (wants === 'center') return 'center';
  // Episodio sin docente y sin preferencia declarada: centrado. Es la doctrina
  // de `educaplay-motion-graphics` §1.1 —con framing 'none' el gráfico va
  // centrado, fijo y protagonista— que hasta ahora no tenía cómo expresarse.
  if (solo && (wants === 'opposite' || wants === 'widest')) return 'center';

  if (wants === 'left' || wants === 'right') {
    if (seg.framing === 'none') return wants;
    return has(wants) ? wants : (req.fallback ?? (has('left') ? 'left' : 'right'));
  }
  if (wants === 'widest') {
    const lw = free.left ? free.left[2] : 0;
    const rw = free.right ? free.right[2] : 0;
    return rw >= lw ? 'right' : 'left';
  }
  // 'opposite': el profesor a la izquierda → tarjeta a la derecha, y viceversa.
  if (seg.framing === 'left') return has('right') ? 'right' : 'left';
  if (seg.framing === 'right') return has('left') ? 'left' : 'right';
  // Centrado: ambas bandas sirven; por defecto la más ancha.
  const lw = free.left ? free.left[2] : 0;
  const rw = free.right ? free.right[2] : 0;
  return rw >= lw ? 'right' : 'left';
};

/** Resuelve la caja de un slot dentro de un segmento estable. */
const resolveInSegment = (
  track: Track,
  seg: Segment,
  frame: number,
  req: SlotRequest,
  o: ResolveOpts,
): SlotBox => {
  const side = pickSide(seg, req, isGraphicsOnly(track));
  const pad = req.pad ?? o.slotPad;
  const holes = reservedAt(track, frame, req.avoid);

  /** Construye la caja para un rango vertical dado. */
  const build = (yTop: number, yBottom: number) => {
    // Centrado: no hay banda ni envolvente que consultar — el ancho útil es el
    // área segura entera y el eje lo fija el cuadro, que no se mueve nunca.
    if (side === 'center') {
      const x = o.safe.left;
      return rect(x, yTop, track.width - o.safe.right - x, yBottom - yTop);
    }

    const env = envelopeIn(seg, yTop, yBottom, req.window);
    const band = seg.free?.[side];

    let x: number;
    let w: number;
    if (env) {
      // Envolvente real a esta altura: mucho mejor que el bbox completo.
      if (side === 'right') {
        x = env.x1 + pad;
        w = track.width - o.safe.right - x;
      } else {
        x = o.safe.left;
        w = env.x0 - pad - x;
      }
    } else if (band) {
      const b = fromTuple(band);
      x = side === 'right' ? b.x + pad : o.safe.left;
      w = side === 'right' ? track.width - o.safe.right - x : b.width - pad - o.safe.left;
    } else {
      x = side === 'right' ? track.width / 2 : o.safe.left;
      w = track.width / 2 - o.safe.right;
    }

    return rect(x, yTop, w, yBottom - yTop);
  };

  /** Los rects quemados se restan SIEMPRE al final, sobre la caja ya recortada. */
  const carve = (b: Rect) => {
    const hit = holes.filter((h) => intersect(b, h));
    return hit.length ? subtractAll(b, hit) : b;
  };

  // Rango vertical inicial: área segura, recortada por la banda de papel.
  const yTop0 = o.safe.top;
  const limits = [track.height - o.safe.bottom];
  if (!req.overPaper) limits.push(o.paperBandY);
  if (!req.overCaptions && o.captionBandY != null) limits.push(o.captionBandY);
  const yBottom0 = Math.min(...limits);

  // La tarjeta se pega al borde EXTERIOR del cuadro, el que está lejos del
  // profesor: a la derecha si vive a la derecha, a la izquierda si vive a la
  // izquierda. Así su eje lo fija el cuadro y no la persona, que se mueve.
  //
  // Centrado es la excepción que confirma la regla: el eje lo sigue fijando el
  // cuadro, sólo que ahí el cuadro entero es la banda.
  const anchorX = side === 'center' ? 'center' : side === 'right' ? 'right' : 'left';

  // Pase 1 — caja provisional, para saber qué altura va a ocupar de verdad.
  const pass1 = clampSize(carve(build(yTop0, yBottom0)), req.maxWidth, req.maxHeight, req.align ?? 'top', anchorX);
  // Pase 2 — recalcular el ancho con la envolvente de ESE rango vertical.
  const pass2 = carve(build(pass1.y, pass1.y + pass1.height));
  const box = clampSize(
    carve(rect(pass2.x, pass2.y, pass2.width, pass2.height)),
    req.maxWidth,
    req.maxHeight,
    req.align ?? 'top',
    anchorX,
  );

  return {...box, side, framing: seg.framing, moving: 0};
};

/**
 * Resuelve la caja de un slot en un frame absoluto.
 *
 * Durante una transición `move` interpolamos entre la caja de origen y la de
 * destino. Durante un `cut` NO interpolamos: saltamos. Un spring cruzando el
 * corte duro de f2510 arrastraría la tarjeta por encima de la cara del
 * profesor.
 */
export const resolveSlot = (
  track: Track,
  frame: number,
  req: SlotRequest,
  o: ResolveOpts,
): SlotBox => {
  const seg = segmentAt(track, frame);
  if (!seg) {
    return {
      ...rect(0, 0, 0, 0),
      side: 'right',
      framing: o.defaultFraming,
      moving: 0,
    };
  }

  if (seg.framing !== 'transition') return resolveInSegment(track, seg, frame, req, o);

  const prevIdx = track.segments.indexOf(seg) - 1;
  const prev = track.segments[prevIdx];
  const next = seg.to_ ? segmentByKey(track, seg.to_) : track.segments[prevIdx + 2];
  if (!prev || !next) return resolveInSegment(track, seg, frame, req, o);

  const a = resolveInSegment(track, prev, frame, req, o);
  const b = resolveInSegment(track, next, frame, req, o);

  if (seg.kind === 'cut') return {...b, moving: 0};

  const span = Math.max(1, seg.to - seg.from);
  const t = Math.min(1, Math.max(0, (frame - seg.from) / span));
  // Suavizado; el traslado del máster es casi lineal, así que apenas lo ablandamos.
  const e = t * t * (3 - 2 * t);

  // Interpolar entre dos cajas válidas NO garantiza una caja válida: el camino
  // intermedio puede cruzar un rect quemado. Hay que volver a restarlos.
  const holes = reservedAt(track, frame, req.avoid);
  let mid: Rect = lerpRect(a, b, e);
  const hit = holes.filter((h) => intersect(mid, h));
  if (hit.length) mid = subtractAll(mid, hit);

  return {...mid, side: b.side, framing: 'transition', moving: t};
};

/**
 * Silueta CRUDA del profesor en un frame, restringida a un rango vertical.
 *
 * Para el verificador. Comparar una tarjeta a la altura de la cabeza contra el
 * bbox de cuerpo entero da falsos positivos: el profesor mide 300px de ancho a
 * la altura de la cara y 950px con los brazos abiertos 400px más abajo. Lo que
 * importa es si se tocan A LA MISMA ALTURA.
 */
export const subjectInRange = (
  track: Track,
  frame: number,
  yTop: number,
  yBottom: number,
): Rect | null => {
  const b = track.frames?.bands;
  if (!b) return subjectAt(track, frame);
  let x0 = Infinity;
  let x1 = -Infinity;
  for (let i = 0; i < b.n; i++) {
    const yA = i * b.height;
    const yB = (i + 1) * b.height;
    if (yB <= yTop || yA >= yBottom) continue;
    const bx0 = b.x0[i]?.[frame];
    const bx1 = b.x1[i]?.[frame];
    if (bx0 === undefined || bx0 < 0) continue;
    // Mismo filtro de plausibilidad que usa el tracker: una franja más ancha
    // que una persona es ruido (bordes suavizados de las olas de papel), no
    // silueta. Sin esto un puñado de frames sucios invalidan un bloque entero.
    if (bx1 - bx0 > MAX_PERSON_W) continue;
    if (bx0 < x0) x0 = bx0;
    if (bx1 > x1) x1 = bx1;
  }
  if (x1 <= x0) return null;
  return rect(x0, Math.max(yTop, 0), x1 - x0, Math.max(1, yBottom - yTop));
};

/**
 * Bbox del profesor en un frame, para el verificador. Prefiere el dato crudo
 * por frame (más estricto que los segmentos suavizados que consume el render).
 */
export const subjectAt = (track: Track, frame: number): Rect | null => {
  const f = track.frames;
  if (f && f.x0[frame] !== undefined && f.cover[frame] > 0.02) {
    return rect(f.x0[frame], f.y0[frame], f.x1[frame] - f.x0[frame], track.height - f.y0[frame]);
  }
  const seg = segmentAt(track, frame);
  if (!seg?.subject) return null;
  return fromTuple(seg.subject);
};
