/**
 * Resolución de palabras-gatillo → frames. Compartida por `align-cues` y
 * `escaleta`.
 *
 * Vive en un solo lugar a propósito. `escaleta` PROPONE los cues y `align-cues`
 * los RESUELVE; si cada uno tuviera su matcher, el reporte de la escaleta diría
 * un frame y el alineador otro, y la propuesta dejaría de servir para decidir.
 * Con esto, lo que imprime `escaleta` es literalmente lo que va a salir de
 * `npm run cues`.
 *
 * Por qué el matcher es difuso y no un indexOf:
 *   · el ASR en español confunde palabras técnicas y nombres propios
 *     (Leo: omnisciente→"obniciente", Canva→"canba");
 *   · whisper normaliza al español peninsular y las escaletas están en voseo
 *     correntino: la escaleta dice "mantené" y la transcripción "mantén". Con
 *     una comparación exacta ese cue se reporta como CONTENIDO AUSENTE, que es
 *     la alarma más grave del sistema — dispararla en falso la vuelve ruido.
 */

/** Default histórico. Los llamadores pasan `masterFps(code)`: ver lib/common.mjs. */
export const FPS = 25;

/** Antes de este frame whisper estira las palabras sobre la música del bumper. */
export const MIN_RELIABLE_FRAME = 180;

export const norm = (s) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9ñ ]/g, '')
    .trim();

/** Distancia de Levenshtein acotada: si se pasa de `max`, corta y devuelve max+1. */
export const lev = (a, b, max = 2) => {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({length: b.length + 1}, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      if (cur[j] < best) best = cur[j];
    }
    if (best > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
};

/** words.json ([desde, hasta, texto] en segundos) → tokens con frame. */
export const tokenize = (words, fps = FPS) =>
  words.map(([from, to, text], i) => ({
    i,
    from,
    to,
    text,
    n: norm(text),
    f: Math.round(from * fps),
  }));

/**
 * Todas las apariciones de una palabra en el pool, exactas o a distancia ≤2.
 * Devuelve `{hits, score}`; `score` es 1 cuando la coincidencia fue exacta.
 */
export const findWord = (pool, word) => {
  const target = norm(word);
  const exact = pool.filter((t) => t.n === target);
  if (exact.length) return {hits: exact, score: 1};

  const fuzzy = pool
    .map((t) => ({t, d: lev(t.n, target)}))
    .filter((x) => x.d <= 2)
    .sort((a, b) => a.d - b.d || a.t.f - b.t.f);
  if (!fuzzy.length) return {hits: [], score: 0};

  const best = fuzzy[0].d;
  return {
    hits: fuzzy.filter((x) => x.d === best).map((x) => x.t),
    score: 1 - best / (target.length + 1),
  };
};

/**
 * Resuelve una lista de definiciones `{key, word, nth?, after?}` a frames.
 *
 * `after` es ESTRICTO (`f > anchor`): si no lo fuera, un cue anclado a otro se
 * resolvería a sí mismo — pasaba con `biologia2 → after: biologia1`, que caían
 * los dos en el mismo token.
 */
export const resolveCues = (defs, toks) => {
  const cues = {};
  const rows = [];

  for (const d of defs) {
    const anchored = Boolean(d.after && cues[d.after]);
    const afterFrame = anchored
      ? cues[d.after].f
      : (d.minFrame ?? MIN_RELIABLE_FRAME);
    const pool = toks.filter((t) => (anchored ? t.f > afterFrame : t.f >= afterFrame));

    const {hits, score} = findWord(pool, d.word);
    if (!hits.length) {
      cues[d.key] = null;
      rows.push({key: d.key, f: null, matched: null, score: 0});
      continue;
    }
    const pick = hits[Math.min((d.nth ?? 1) - 1, hits.length - 1)];
    cues[d.key] = {f: pick.f, matched: pick.text, score: Number(score.toFixed(2))};
    rows.push({key: d.key, f: pick.f, matched: pick.text, score: Number(score.toFixed(2))});
  }

  return {cues, rows};
};
