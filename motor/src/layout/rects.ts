/**
 * Álgebra de rectángulos para el layout engine.
 *
 * Puro y sin dependencias de React o Remotion a propósito: lo importan tanto
 * <Slot> como scripts/check-layout.mjs, así el verificador prueba EXACTAMENTE
 * el mismo código que corre en el render.
 */

export type Rect = {x: number; y: number; width: number; height: number};

export const rect = (x: number, y: number, width: number, height: number): Rect => ({
  x,
  y,
  width,
  height,
});

/** Convierte la tupla [x,y,w,h] que usan los datos JSON. */
export const fromTuple = (t: readonly number[]): Rect =>
  rect(t[0], t[1], t[2], t[3]);

export const right = (r: Rect) => r.x + r.width;
export const bottom = (r: Rect) => r.y + r.height;
export const area = (r: Rect) => Math.max(0, r.width) * Math.max(0, r.height);
export const isEmpty = (r: Rect) => r.width <= 0 || r.height <= 0;

/** Intersección, o null si no se tocan. */
export const intersect = (a: Rect, b: Rect): Rect | null => {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const w = Math.min(right(a), right(b)) - x;
  const h = Math.min(bottom(a), bottom(b)) - y;
  return w > 0 && h > 0 ? rect(x, y, w, h) : null;
};

/** Encoge un rect por cada lado. */
export const inset = (
  r: Rect,
  by: number | {top?: number; right?: number; bottom?: number; left?: number},
): Rect => {
  const i =
    typeof by === 'number'
      ? {top: by, right: by, bottom: by, left: by}
      : {top: 0, right: 0, bottom: 0, left: 0, ...by};
  return rect(
    r.x + i.left,
    r.y + i.top,
    r.width - i.left - i.right,
    r.height - i.top - i.bottom,
  );
};

/**
 * Resta `hole` de `r` y devuelve los 4 rectángulos candidatos que quedan
 * (arriba / abajo / izquierda / derecha del agujero). No es una resta booleana
 * exacta — es la lista de rectángulos maximales, que es lo que necesitamos
 * para después elegir el más grande.
 */
export const subtractCandidates = (r: Rect, hole: Rect): Rect[] => {
  const hit = intersect(r, hole);
  if (!hit) return [r];
  return [
    rect(r.x, r.y, r.width, hit.y - r.y), // arriba
    rect(r.x, bottom(hit), r.width, bottom(r) - bottom(hit)), // abajo
    rect(r.x, r.y, hit.x - r.x, r.height), // izquierda
    rect(right(hit), r.y, right(r) - right(hit), r.height), // derecha
  ].filter((c) => !isEmpty(c));
};

/**
 * Resta varios agujeros quedándose siempre con el resto más grande.
 * Greedy a propósito: con 1-2 agujeros por frame da el resultado óptimo y es
 * trivial de razonar. Si algún día hay muchos agujeros, esto habría que
 * cambiarlo por una descomposición real.
 */
export const subtractAll = (r: Rect, holes: Rect[]): Rect => {
  let out = r;
  for (const h of holes) {
    const cands = subtractCandidates(out, h);
    if (cands.length === 0) return rect(out.x, out.y, 0, 0);
    out = cands.reduce((best, c) => (area(c) > area(best) ? c : best));
  }
  return out;
};

/** Interpola entre dos rects (para la transición de encuadre). */
export const lerpRect = (a: Rect, b: Rect, t: number): Rect =>
  rect(
    a.x + (b.x - a.x) * t,
    a.y + (b.y - a.y) * t,
    a.width + (b.width - a.width) * t,
    a.height + (b.height - a.height) * t,
  );

/**
 * Recorta el rect a un tamaño máximo, respetando la alineación pedida.
 *
 * `anchorX` decide qué pasa con el sobrante horizontal, y no es un detalle:
 * centrar la tarjeta dentro de la banda libre la ata al profesor, que se mueve,
 * en vez de al cuadro, que no. Medido en la serie Leo, centrar producía 6 bordes
 * izquierdos distintos y márgenes derechos de 56, 264 y 294px a lo largo del
 * mismo video. Anclando al borde exterior hay un solo eje para toda la serie.
 */
export const clampSize = (
  r: Rect,
  maxWidth?: number,
  maxHeight?: number,
  align: 'top' | 'center' | 'bottom' = 'top',
  anchorX: 'center' | 'left' | 'right' = 'center',
): Rect => {
  const w = maxWidth ? Math.min(r.width, maxWidth) : r.width;
  const h = maxHeight ? Math.min(r.height, maxHeight) : r.height;
  const x =
    anchorX === 'left'
      ? r.x
      : anchorX === 'right'
        ? right(r) - w
        : r.x + (r.width - w) / 2;
  const y =
    align === 'top'
      ? r.y
      : align === 'bottom'
        ? bottom(r) - h
        : r.y + (r.height - h) / 2;
  return rect(x, y, w, h);
};
