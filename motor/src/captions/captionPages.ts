/**
 * Paginación de subtítulos: ninguno pasa de `maxLines` renglones.
 *
 * El documento de subtítulos (§1.4) es inflexible: nunca más de dos líneas. Los
 * cues salen de los segmentos de whisper, que no saben nada del ancho de la
 * pastilla, y el mismo cue que entra en dos líneas en 16:9 (34 px, 1292 útiles)
 * ocupa tres en 9:16 (42 px, 852 útiles). Así que el corte no puede vivir en
 * `captions.ts` —que además es generado—: se decide acá, por formato.
 *
 * Un cue que no entra se parte en páginas de palabras enteras, parejas en
 * caracteres, y su tiempo se reparte en proporción a lo que dice cada página.
 * Un cue que entra NO se toca: la paginación es la excepción, no el ritmo.
 *
 * El ancho de cada palabra se ESTIMA con `CHAR_EM` —el render no puede medir
 * texto de forma determinista antes de pintarlo—. Es conservador a propósito:
 * medido con Museo Sans Rounded 700 sobre los 60 subtítulos de Ambiente, el
 * promedio es 0,465 em por carácter y el peor cue 0,502. `check-layout` mide
 * cada página con el archivo de fuente real, así que si la estimación se queda
 * corta alguna vez, el verificador lo canta.
 *
 * Módulo sin JSX: lo importa `check-layout.mjs` con --experimental-strip-types.
 */

export const CHAR_EM = 0.52;

type Cue = {from: number; to: number; text: string};

/**
 * Palabras en las que una página NO debería terminar: artículos, preposiciones,
 * conjunciones y relativos. Dejan la idea colgada hasta la página siguiente.
 */
const WEAK = new Set([
  'a', 'al', 'ante', 'con', 'como', 'cuando', 'de', 'del', 'desde', 'donde', 'e',
  'el', 'en', 'entre', 'hacia', 'hasta', 'la', 'las', 'lo', 'los', 'mientras',
  'ni', 'o', 'para', 'pero', 'por', 'porque', 'que', 'se', 'si', 'sin', 'sobre',
  'su', 'sus', 'tu', 'tus', 'u', 'un', 'una', 'unos', 'unas', 'y', 'ya',
]);

const cumChars = (words: readonly string[], n: number) =>
  words.slice(0, n).reduce((s, w) => s + w.length + 1, 0);

/** Renglones que ocuparía `words` con un corte greedy a `perLine` caracteres. */
const linesFor = (words: readonly string[], perLine: number): number => {
  let n = 1;
  let cur = 0;
  for (const w of words) {
    const next = cur === 0 ? w.length : cur + 1 + w.length;
    if (cur > 0 && next > perLine) {
      n++;
      cur = w.length;
    } else cur = next;
  }
  return n;
};

export const paginateCaptions = <C extends Cue>(
  track: readonly C[],
  opts: {fontSize: number; usableWidth: number; maxLines: number},
): C[] => {
  const perLine = Math.max(8, Math.floor(opts.usableWidth / (opts.fontSize * CHAR_EM)));
  const out: C[] = [];
  for (const c of track) {
    const words = c.text.split(/\s+/).filter(Boolean);
    const lines = linesFor(words, perLine);
    if (lines <= opts.maxLines) {
      out.push(c);
      continue;
    }
    // Páginas parejas en caracteres, cortando entre palabras y en un lugar
    // SINTÁCTICO: el documento pide "oraciones equilibradas", y una página que
    // termina en "como" o "llegar a" obliga a leer la siguiente para entender
    // la primera. Cada corte busca, cerca de su objetivo, el mejor borde.
    const pages = Math.ceil(lines / opts.maxLines);
    const total = words.reduce((s, w) => s + w.length + 1, 0);
    const cuts: number[] = [];
    let start = 0;
    for (let k = 1; k < pages; k++) {
      const target = (total * k) / pages;
      let best = -1;
      let bestScore = Infinity;
      let pos = 0;
      for (let i = 0; i < words.length - 1; i++) {
        pos += words[i].length + 1;
        if (i < start) continue;
        // Una página no puede pasarse de lo que entra en `maxLines`.
        const pageChars = pos - (start === 0 ? 0 : cumChars(words, start));
        if (linesFor(words.slice(start, i + 1), perLine) > opts.maxLines) break;
        const score =
          Math.abs(pos - target) / perLine -
          (/[.,;:?!…»”)]$/.test(words[i]) ? 0.6 : 0) +
          (WEAK.has(words[i].toLowerCase()) ? 0.8 : 0) +
          (pageChars < perLine * 0.5 ? 0.5 : 0);
        if (score < bestScore) {
          bestScore = score;
          best = i;
        }
      }
      if (best < 0) best = Math.min(words.length - 2, start);
      cuts.push(best + 1);
      start = best + 1;
    }
    const bounds = [0, ...cuts, words.length];
    const groups = bounds.slice(0, -1).map((b, i) => words.slice(b, bounds[i + 1]));
    const len = c.to - c.from;
    let before = 0;
    for (const g of groups.filter((g) => g.length)) {
      const chars = g.reduce((s, w) => s + w.length + 1, 0);
      const from = c.from + Math.round((len * before) / total);
      before += chars;
      const to = c.from + Math.round((len * before) / total);
      out.push({...c, from, to, text: g.join(' ')});
    }
  }
  return out;
};
