/**
 * track-presenter — mide dónde está el profesor, cuadro a cuadro.
 *
 *   node scripts/track-presenter.mjs AMB24-01 [--master ruta] [--probe 600,1800]
 *                                           [--report] [--assert]
 *
 * Salida: src/episodes/<CODE>/track.json
 *
 * Cómo funciona: el plató de esta materia es verde menta plano, con textura de
 * hojas y line-art del mismo tono, y esquinas de papel blanco rasgado. Igual
 * que el lila de la serie Leo, eso hace que segmentar por color sea trivial y
 * mucho más barato que un modelo de visión:
 *
 *   fondo verde →  G - max(R,B) > 18
 *   casi blanco →  min(R,G,B) > 200  ∧  max-min < 26
 *   profesor    →  ninguno de los dos
 *
 * Los umbrales son constantes nombradas, no magia: si cambia el plató de la
 * materia, se tocan acá y en ningún otro lado.
 *
 * ESPACIO DE COORDENADAS — a diferencia de Leo, acá el máster (1024×576) NO
 * mide lo mismo que la composición (1920×1080). El track se emite directamente
 * en coordenadas de COMPOSICIÓN: `sx`/`sy` mapean la grilla de análisis a
 * LAYOUT_W/LAYOUT_H y no al tamaño del máster. Así `resolveSlot()`, los rects
 * del tema y check-layout viven todos en el mismo espacio, y el día que
 * aparezca un máster en HD sólo cambia la nitidez, no un solo número.
 */
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {
  episodeDir, ffmpegStream, ffprobeInfo, fmtFrame, masterFor, parseArgs, ROOT, trackerOpts, writeJson,
} from './lib/common.mjs';

// Materias y platós: qué es fondo y dónde está la marca de agua (src/brand/estudios.ts).
const {estudioDe, esFondo} = await import(pathToFileURL(path.join(ROOT, 'src/brand/estudios.ts')).href);

// --- Umbrales de segmentación ---
// Qué es fondo lo decide el plató (src/brand/estudios.ts: el verde usa
// G - max(R,B) > 18, medido sobre AMB24-01). Acá queda el papel.
// Más flojos que en Leo a propósito: este máster es un proxy muy comprimido
// (17,7 MB para 171 s), y con 215/22 los bordes del papel rasgado se colaban
// como sujeto.
const WHITE_MIN = 200;       // canal mínimo para considerar "papel"
const WHITE_SPREAD = 26;     // max-min por debajo de esto es acromático
const COL_MIN_RATIO = 0.06;  // fracción de alto de columna para contarla ocupada
const OPEN_WIDTH = 3;        // apertura morfológica, en columnas
const MEDIAN_WIN = 5;        // ventana de mediana temporal
const MIN_COVER = 0.02;      // por debajo: cuadro vacío
const MAX_COVER = 0.45;      // por encima: gráfica a cuadro completo (bumper/créditos),
                             // no un plano del profesor

// --- Segmentación por VELOCIDAD, no por bandas estáticas de cx ---
// El máster hace un traslado animado de 21 frames. Clasificar por umbrales de
// cx lo colapsa a 1-2 frames (cx cruza la banda intermedia demasiado rápido),
// y el movimiento se pierde. Lo que distingue "quieto" de "moviéndose" es la
// derivada, así que segmentamos por ahí.
const STABLE_VEL = 3.5;      // px/frame de deriva del centroide para seguir "quieto"
const CLUSTER_TOL = 0.06;    // cambio de cx (fracción de ancho) que abre segmento nuevo
const MIN_SEG_LEN = 8;       // frames mínimos para que una corrida cuente
const MERGE_GAP = 20;        // hueco máx. entre corridas del mismo cx para fusionarlas
const MIN_STABLE_LEN = 40;   // un encuadre real dura al menos 1,6 s
const LEFT_MAX = 0.40;       // etiqueta final del segmento, ya estabilizado
const CENTER_MAX = 0.60;

// --- Escala de análisis ---
const AW = 480, AH = 270;

/**
 * Paso de muestreo del perfil temporal (`profileT`), en frames.
 *
 * Por qué existe `profileT` y no alcanza con `profile`: el `profile` de un
 * segmento es la UNIÓN de la silueta sobre todo el segmento. En la serie Leo
 * eso funcionaba porque el máster reencuadra seguido y los segmentos son
 * cortos. AMB24-01 es UNA SOLA toma centrada de 2,5 minutos, así que la unión
 * termina siendo "lo más ancho que gesticuló en todo el capítulo" y deja una
 * columna de 240-280 px, inservible.
 *
 * Con el perfil por ventana, un gráfico que vive 12 s sólo esquiva los gestos
 * de esos 12 s. A 5 frames de paso son ~856 muestras × 6 franjas: entra en el
 * bundle sin problema y la resolución temporal (0,2 s) sobra para una silueta
 * suavizada por mediana de 5 cuadros.
 */
const PROFILE_STEP = 5;

// Perfil vertical: la silueta no es un rectángulo. A la altura de la cabeza el
// profesor es angosto; a la altura de las manos se abre ~500px más. Medimos la
// envolvente por franja horizontal para que una tarjeta alta pueda meterse al
// costado de la cabeza sin chocar con un gesto que ocurre 400px más abajo.
const BANDS = 6;
// Las olas de papel blanco del fondo tienen bordes suavizados que no son ni
// lila ni blanco puro, así que en las franjas superior e inferior se cuelan
// como "sujeto". Una franja más ancha que esto no puede ser una persona: se
// marca como desconocida y la envolvente la ignora.
// 1500 y no 1150: en AMB24-01 el profesor va más cerca de cámara (52 % del
// ancho en la mediana, 70 % en el p90). Ver la nota en src/layout/presenter.ts.
const MAX_PERSON_W = 1500;

// La marca de agua quemada (se anula antes de medir) también la da el plató.

// --- Espacio de composición ---
// El track se emite acá, no en píxeles del máster. Ver la nota de la cabecera.
const LAYOUT_W = 1920, LAYOUT_H = 1080;

const decodeFrames = async (master, onFrame) => {
  const ff = ffmpegStream([
    '-v', 'error', '-i', master,
    '-vf', `scale=${AW}:${AH}`, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-',
  ]);
  const FRAME_BYTES = AW * AH * 3;
  let buf = Buffer.alloc(0);
  let idx = 0;
  let err = '';
  ff.stderr.on('data', (d) => (err += d));
  for await (const chunk of ff.stdout) {
    buf = buf.length ? Buffer.concat([buf, chunk]) : chunk;
    while (buf.length >= FRAME_BYTES) {
      onFrame(buf.subarray(0, FRAME_BYTES), idx++);
      buf = buf.subarray(FRAME_BYTES);
    }
  }
  const code = await new Promise((r) => ff.on('close', r));
  if (code !== 0) throw new Error(`ffmpeg falló (${code}): ${err.slice(0, 400)}`);
  return idx;
};

const isBgPixel = (r, g, b, fondo) => {
  if (esFondo(fondo, r, g, b)) return true;                     // fondo del plató
  const lo = Math.min(r, g, b), hi = Math.max(r, g, b);
  if (lo > WHITE_MIN && hi - lo < WHITE_SPREAD) return true;    // papel
  return false;
};

/** Histograma de columnas de píxeles "sujeto" en un frame RGB crudo. */
const columnHistogram = (px, wmRect, fondo) => {
  const cols = new Int32Array(AW);
  for (let y = 0; y < AH; y++) {
    const rowOff = y * AW * 3;
    const inWmRows = y >= wmRect[1] && y < wmRect[1] + wmRect[3];
    for (let x = 0; x < AW; x++) {
      if (inWmRows && x >= wmRect[0] && x < wmRect[0] + wmRect[2]) continue;
      const i = rowOff + x * 3;
      if (isBgPixel(px[i], px[i + 1], px[i + 2], fondo)) continue;
      cols[x]++;
    }
  }
  return cols;
};

/** Apertura morfológica 1D: borra corridas ocupadas más cortas que OPEN_WIDTH. */
const openColumns = (occ) => {
  const out = new Uint8Array(occ.length);
  let run = 0;
  for (let i = 0; i <= occ.length; i++) {
    if (i < occ.length && occ[i]) run++;
    else {
      if (run >= OPEN_WIDTH) out.fill(1, i - run, i);
      run = 0;
    }
  }
  return out;
};

const median = (arr) => {
  const s = [...arr].sort((a, b) => a - b);
  return s[s.length >> 1];
};

/** Percentil. p05/p95 dan la envolvente sin comerse los frames de ruido. */
const pct = (arr, p) => {
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.max(0, Math.round((s.length - 1) * p)))];
};

const smooth = (series) => {
  const out = new Float64Array(series.length);
  const h = MEDIAN_WIN >> 1;
  for (let i = 0; i < series.length; i++) {
    const lo = Math.max(0, i - h), hi = Math.min(series.length, i + h + 1);
    out[i] = median(series.slice(lo, hi));
  }
  return out;
};

const framingOf = (cx) =>
  cx < LEFT_MAX ? 'left' : cx > CENTER_MAX ? 'right' : 'center';

/**
 * Color de fondo del plató, para declarar uno que no se conoce: mediana de las
 * franjas laterales (un 8 % de cada borde) de cuatro cuadros repartidos en el
 * capítulo, sin el papel blanco ni el negro. Un solo cuadro al principio mentía:
 * suele ser la intro o una placa.
 */
const medirFondo = (master, durationS) => {
  const W = 192, H = 108, edge = Math.round(W * 0.08);
  const ch = [[], [], []];
  for (const f of [0.2, 0.4, 0.6, 0.8]) {
    const px = execFileSync('ffmpeg', ['-v', 'error', '-ss', String((durationS * f).toFixed(2)), '-i', master,
      '-frames:v', '1', '-vf', `scale=${W}:${H}`, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], {maxBuffer: W * H * 3 + 1024});
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (x >= edge && x < W - edge) continue;
        const i = (y * W + x) * 3, r = px[i], g = px[i + 1], b = px[i + 2];
        const lo = Math.min(r, g, b), hi = Math.max(r, g, b);
        if ((lo > WHITE_MIN && hi - lo < WHITE_SPREAD) || hi < 30) continue; // papel o negro
        ch[0].push(r); ch[1].push(g); ch[2].push(b);
      }
    }
  }
  return ch[0].length ? ch.map((v) => median(v)) : [0, 0, 0];
};

const main = async () => {
  const {flags, code} = parseArgs();
  if (!code) throw new Error('Uso: node scripts/track-presenter.mjs <CODE> [--master ruta]');

  const master = masterFor(code, flags.master);
  const info = await ffprobeInfo(master);
  const sx = LAYOUT_W / AW, sy = LAYOUT_H / AH;
  /**
   * Rect de la marca de agua POR EPISODIO: `src/episodes/<CODE>/tracker.json`
   * con `{"watermark": [x, y, w, h]}` en coordenadas de composición.
   *
   * La marca ANIMA (trampa 18) y cada corte la monta un poco distinta. En
   * AMB26-02 el anillo del isotipo se sale del rect de arriba hacia la
   * izquierda, se cuela como "sujeto" y el perfil de la docente llegaba a
   * x=1304 en la franja de la cabeza: el titular del Mito 4 quedaba en 512 px
   * con techo de 900. Es un archivo y no un flag para que re-correr `nuevo`
   * mida igual.
   */
  const epOpts = trackerOpts(code);
  const est = estudioDe(code, flags.lila ? 'lila' : epOpts.studio);
  if (!est) {
    const rgb = medirFondo(master, info.duration);
    throw new Error(`No sé en qué plató se grabó ${code}: su materia no lo declara en src/brand/estudios.ts ` +
      `ni hay "studio" en src/episodes/${code}/tracker.json.\n` +
      `  Color de fondo medido en el máster: rgb(${rgb.join(', ')}).\n` +
      `  Si es el plató verde o el lila: {"studio": "verde"} o {"studio": "lila"}.\n` +
      `  Si es otro: {"studio": {"fondo": [${rgb.join(', ')}], "tolerancia": 40}}.`);
  }
  const WM = epOpts.watermark ?? est.watermark;
  if (epOpts.watermark) console.log(`marca de agua del episodio: [${WM.join(', ')}]`);
  console.log(`plató: ${est.nombre}`);
  const wmRect = [
    Math.floor(WM[0] / sx), Math.floor(WM[1] / sy),
    Math.ceil(WM[2] / sx), Math.ceil(WM[3] / sy),
  ];

  console.log(`máster: ${path.basename(master)}`);
  console.log(`${info.width}x${info.height} · ${info.fps}fps · ${info.durationInFrames} frames`);

  const raw = {x0: [], x1: [], y0: [], cover: [], cmed: []};
  // bandX0[b][frame] / bandX1[b][frame]
  const bandX0 = Array.from({length: BANDS}, () => []);
  const bandX1 = Array.from({length: BANDS}, () => []);
  const probes = flags.probe ? String(flags.probe).split(',').map(Number) : [];
  const probeOut = [];

  await decodeFrames(master, (px, i) => {
    const cols = columnHistogram(px, wmRect, est.fondo);
    const thr = AH * COL_MIN_RATIO;
    const occ = openColumns(cols.map ? Array.from(cols, (c) => (c >= thr ? 1 : 0)) : []);

    let total = 0, wsum = 0, first = -1, last = -1;
    for (let x = 0; x < AW; x++) {
      if (!occ[x]) continue;
      total += cols[x];
      wsum += cols[x] * x;
      if (first < 0) first = x;
      last = x;
    }
    const cover = total / (AW * AH);
    if (total === 0 || first < 0) {
      raw.x0.push(0); raw.x1.push(0); raw.y0.push(LAYOUT_H);
      raw.cover.push(0); raw.cmed.push(0.5);
      for (let b = 0; b < BANDS; b++) { bandX0[b].push(-1); bandX1[b].push(-1); }
      return;
    }
    // Columna mediana por masa: robusta a una mano que se estira fuera del torso,
    // que es justo lo que rompía las corridas cuando usábamos el centro del bbox.
    let acc = 0, cmed = first;
    for (let x = first; x <= last; x++) {
      if (!occ[x]) continue;
      acc += cols[x];
      if (acc >= total / 2) { cmed = x; break; }
    }
    // Primera fila ocupada, restringida al bbox horizontal.
    let y0 = AH - 1;
    for (let y = 0; y < AH; y++) {
      let n = 0;
      for (let x = first; x <= last; x++) {
        const idx = y * AW * 3 + x * 3;
        if (isBgPixel(px[idx], px[idx + 1], px[idx + 2], est.fondo)) continue;
        n++;
      }
      if (n > (last - first) * 0.10) { y0 = y; break; }
    }
    // Envolvente por franja.
    const bh = AH / BANDS;
    for (let b = 0; b < BANDS; b++) {
      const yA = Math.floor(b * bh), yB = Math.floor((b + 1) * bh);
      let bf = -1, bl = -1;
      const wmX = x => x >= wmRect[0] && x < wmRect[0] + wmRect[2];
      for (let x = first; x <= last; x++) {
        if (!occ[x]) continue;
        let n = 0;
        for (let y = yA; y < yB; y++) {
          // La marca de agua se excluye acá también, igual que en el histograma
          // de columnas. Sin esto el perfil de la franja superior sale a 1764px
          // y la banda libre derecha se vuelve negativa.
          if (wmX(x) && y >= wmRect[1] && y < wmRect[1] + wmRect[3]) continue;
          const idx = y * AW * 3 + x * 3;
          if (isBgPixel(px[idx], px[idx + 1], px[idx + 2], est.fondo)) continue;
          n++;
        }
        if (n > (yB - yA) * 0.12) { if (bf < 0) bf = x; bl = x; }
      }
      bandX0[b].push(bf < 0 ? -1 : Math.round(bf * sx));
      bandX1[b].push(bl < 0 ? -1 : Math.round((bl + 1) * sx));
    }

    raw.x0.push(Math.round(first * sx));
    raw.x1.push(Math.round((last + 1) * sx));
    raw.y0.push(Math.round(y0 * sy));
    raw.cmed.push(cmed / AW);
    raw.cover.push(cover);

    if (probes.includes(i)) {
      probeOut.push(`  f${i}: x ${Math.round(first * sx)}–${Math.round((last + 1) * sx)}  cover ${cover.toFixed(3)}`);
    }
  });

  const n = raw.cover.length;
  console.log(`decodificados ${n} frames`);
  if (probeOut.length) { console.log('probe:'); probeOut.forEach((l) => console.log(l)); }

  // Suavizado temporal contra el temblor de manos y los falsos de ancho completo.
  const sx0 = smooth(raw.x0), sx1 = smooth(raw.x1), sy0 = smooth(raw.y0);

  // Centroide por frame + validez.
  const scm = smooth(raw.cmed);
  const cxs = new Float64Array(n);
  const valid = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const cov = raw.cover[i];
    valid[i] = cov >= MIN_COVER && cov <= MAX_COVER ? 1 : 0;
    cxs[i] = valid[i] ? scm[i] : 0.5;
  }

  // Velocidad del centroide: separa "quieto" de "reencuadrando".
  const vel = new Float64Array(n);
  for (let i = 1; i < n; i++) {
    vel[i] = valid[i] && valid[i - 1] ? Math.abs(cxs[i] - cxs[i - 1]) * LAYOUT_W : 0;
  }
  vel[0] = vel[1] ?? 0;

  // Corridas estables: frames válidos, lentos y agrupados alrededor de un cx.
  const runs = [];
  let cur = null;
  for (let i = 0; i < n; i++) {
    const stable = valid[i] && vel[i] < STABLE_VEL;
    if (!stable) { if (cur) { runs.push(cur); cur = null; } continue; }
    if (cur && Math.abs(cxs[i] - cur.cx) > CLUSTER_TOL) { runs.push(cur); cur = null; }
    if (!cur) cur = {from: i, to: i + 1, cx: cxs[i], nCx: 1, sumCx: cxs[i]};
    else {
      cur.to = i + 1;
      cur.sumCx += cxs[i];
      cur.nCx++;
      cur.cx = cur.sumCx / cur.nCx;
    }
  }
  if (cur) runs.push(cur);

  // Fusionar corridas contiguas con el mismo cx: un pico momentáneo de
  // velocidad (un gesto) no es un cambio de encuadre.
  const merged = [];
  for (const r of runs) {
    const prev = merged[merged.length - 1];
    if (
      prev &&
      Math.abs(r.cx - prev.cx) < CLUSTER_TOL &&
      r.from - prev.to <= MERGE_GAP
    ) {
      prev.to = r.to;
      prev.sumCx += r.sumCx;
      prev.nCx += r.nCx;
      prev.cx = prev.sumCx / prev.nCx;
    } else merged.push({...r});
  }
  const stableRuns = merged.filter((r) => r.to - r.from >= MIN_STABLE_LEN);

  const segments = [];
  let ci = 0;
  for (let k = 0; k < stableRuns.length; k++) {
    const r = stableRuns[k];
    const framing = framingOf(r.cx);
    // ENVOLVENTE, no promedio: el profesor gesticula y una mano estirada llega
    // ~50px más lejos que su bbox mediano. Si la banda libre se calcula sobre
    // la mediana, la tarjeta le pisa la mano. p05/p95 toman el alcance real
    // sin dejarse arrastrar por los frames de ruido de segmentación.
    const x0 = Math.round(pct(Array.from(sx0.slice(r.from, r.to)), 0.05));
    const x1 = Math.round(pct(Array.from(sx1.slice(r.from, r.to)), 0.95));
    const y0 = Math.round(pct(Array.from(sy0.slice(r.from, r.to)), 0.05));

    // Un "sujeto" más ancho que MAX_PERSON_W no es una persona: es una PLACA a
    // cuadro completo. Todos los cortes de la serie abren con el bumper de
    // Educaplay y cierran con la del Gobierno de Corrientes, y ahí el cuadro
    // entero deja de ser plató, así que el umbral de color marca todo.
    //
    // Se declara como encuadre 'none' —sin sujeto, sin perfil y sin banda
    // libre—, que es lo que realmente es: no hay nadie a quien esquivar. Sin
    // esto, `--assert` frena por la placa final en TODOS los episodios, y una
    // alarma que salta siempre es una alarma que nadie mira.
    if (x1 - x0 > MAX_PERSON_W) {
      segments.push({key: `n${++ci}`, from: r.from, to: r.to, framing: 'none'});
      continue;
    }

    const bandH = LAYOUT_H / BANDS;
    const profile = [];
    for (let b = 0; b < BANDS; b++) {
      // Filtrar primero los frames implausibles, después tomar la envolvente
      // REAL (min/max) de los que quedan. Percentilar sobre datos ya limpios
      // sólo sirve para dejar afuera gestos legítimos: con p99 quedaban 5
      // frames donde una mano pasaba la banda y la tarjeta se le acercaba a
      // 22px. El filtro de ancho ya se ocupa del ruido.
      const pairs = [];
      for (let f = r.from; f < r.to; f++) {
        const a = bandX0[b][f], z = bandX1[b][f];
        if (a >= 0 && z > a && z - a <= MAX_PERSON_W) pairs.push([a, z]);
      }
      const bx0 = pairs.length ? Math.min(...pairs.map((q) => q[0])) : -1;
      const bx1 = pairs.length ? Math.max(...pairs.map((q) => q[1])) : -1;
      const plausible = bx0 >= 0;
      profile.push([
        Math.round(b * bandH), Math.round((b + 1) * bandH),
        plausible ? bx0 : -1, plausible ? bx1 : -1,
      ]);
    }
    // Perfil TEMPORAL: la misma envolvente por franja, pero muestreada cada
    // PROFILE_STEP frames en vez de unificada sobre todo el segmento. Permite
    // que un gráfico esquive sólo los gestos de SU ventana. Ver la nota de
    // PROFILE_STEP arriba.
    const tFrom = Math.floor(r.from / PROFILE_STEP);
    const tTo = Math.ceil(r.to / PROFILE_STEP);
    const profileT = {step: PROFILE_STEP, from: tFrom, x0: [], x1: []};
    for (let b = 0; b < BANDS; b++) {
      const bx0 = [], bx1 = [];
      for (let t = tFrom; t < tTo; t++) {
        let lo = Infinity, hi = -Infinity;
        const fA = Math.max(r.from, t * PROFILE_STEP);
        const fB = Math.min(r.to, (t + 1) * PROFILE_STEP);
        for (let f = fA; f < fB; f++) {
          const a = bandX0[b][f], z = bandX1[b][f];
          if (a >= 0 && z > a && z - a <= MAX_PERSON_W) {
            if (a < lo) lo = a;
            if (z > hi) hi = z;
          }
        }
        bx0.push(hi > lo ? lo : -1);
        bx1.push(hi > lo ? hi : -1);
      }
      profileT.x0.push(bx0);
      profileT.x1.push(bx1);
    }

    segments.push({
      key: `${framing[0]}${++ci}`,
      from: r.from, to: r.to, framing,
      subject: [x0, y0, x1 - x0, LAYOUT_H - y0],
      /** [yA, yB, x0, x1] por franja; x0/x1 = -1 si la franja está vacía. */
      profile,
      /** Igual que `profile` pero por ventana de tiempo. */
      profileT,
      free: {
        left: x0 > 120 ? [0, 0, x0, LAYOUT_H] : null,
        right: x1 < LAYOUT_W - 120 ? [x1, 0, LAYOUT_W - x1, LAYOUT_H] : null,
      },
    });
    const next = stableRuns[k + 1];
    if (next) {
      const gap = next.from - r.to;
      segments.push({
        key: `x${k}`, from: r.to, to: next.from,
        framing: 'transition', kind: gap <= 2 ? 'cut' : 'move', to_: null,
      });
    }
  }

  // Tramos sin profesor (bumper, créditos) al principio y al final.
  if (segments.length) {
    if (segments[0].from > 0) segments.unshift({key: 'pre', from: 0, to: segments[0].from, framing: 'none'});
    const last = segments[segments.length - 1];
    if (last.to < n) segments.push({key: 'post', from: last.to, to: n, framing: 'none'});
  } else {
    segments.push({key: 'full', from: 0, to: n, framing: 'none'});
  }

  for (let i = 0; i < segments.length; i++) {
    if (segments[i].framing !== 'transition') continue;
    const nxt = segments.slice(i + 1).find((s2) => s2.framing !== 'transition');
    segments[i].to_ = nxt ? nxt.key : null;
  }

  const track = {
    version: 1,
    source: path.basename(master),
    fps: info.fps,
    width: LAYOUT_W,
    height: LAYOUT_H,
    /** Tamaño real del máster, sólo informativo: el track ya está escalado. */
    master: {width: info.width, height: info.height},
    durationInFrames: n,
    reserved: [{key: 'watermark', rect: WM, from: 0, to: n}],
    segments,
    frames: {
      x0: Array.from(sx0, Math.round),
      x1: Array.from(sx1, Math.round),
      y0: Array.from(sy0, Math.round),
      cover: raw.cover.map((c) => Number(c.toFixed(4))),
      /** Envolvente CRUDA por franja y por frame. Sólo la usa el verificador,
       *  que así comprueba la silueta a la altura exacta donde está la tarjeta. */
      bands: {
        n: BANDS,
        height: LAYOUT_H / BANDS,
        x0: bandX0,
        x1: bandX1,
      },
    },
  };

  // El track se parte en dos a propósito:
  //   track.ts          — meta + segmentos + reservados. Chico, tipado, lo
  //                       importa la composición.
  //   track.frames.json — bbox crudo por frame. ~75 kB, SÓLO lo lee el
  //                       verificador; nunca entra al bundle.
  const dir = episodeDir(code);
  fs.mkdirSync(dir, {recursive: true});

  const {frames, ...meta} = track;
  const out = path.join(dir, 'track.ts');
  fs.writeFileSync(
    out,
    `/* GENERADO por scripts/track-presenter.mjs — no editar a mano.\n` +
      ` * Fuente: ${track.source}\n */\n` +
      `import type {Track} from '../../layout/presenter.ts';\n\n` +
      `export const TRACK: Track = ${JSON.stringify(meta, null, 2)};\n`,
  );
  const framesOut = path.join(dir, 'track.frames.json');
  writeJson(framesOut, frames);

  console.log(`\nsegmentos (${segments.length}):`);
  for (const s of segments) {
    const sub = s.subject ? `  x ${s.subject[0]}–${s.subject[0] + s.subject[2]}` : '';
    const kind = s.kind ? ` [${s.kind}]` : '';
    console.log(`  ${String(s.from).padStart(5)}–${String(s.to).padStart(5)}  ${s.framing.padEnd(11)}${kind}${sub}   ${fmtFrame(s.from, info.fps)}`);
  }
  console.log(`\n→ ${path.relative(process.cwd(), out)}  (${(fs.statSync(out).size / 1024).toFixed(1)} kB)`);
  console.log(`→ ${path.relative(process.cwd(), framesOut)}  (${(fs.statSync(framesOut).size / 1024).toFixed(0)} kB, sólo verificador)`);

  if (flags.assert) {
    const problems = [];
    for (const s of segments) {
      if (s.framing === 'transition') continue;
      if (s.to - s.from < 12) problems.push(`segmento ${s.key} dura ${s.to - s.from} frames (<12)`);
      if (s.subject) {
        const w = s.subject[2];
        if (w > 1400) problems.push(`segmento ${s.key}: bbox de ${w}px (>1400) — ruido de segmentación`);
        if (w < 400) problems.push(`segmento ${s.key}: bbox de ${w}px (<400) — sujeto perdido`);
      }
    }
    if (problems.length) {
      console.error('\n✗ ASSERT falló:');
      problems.forEach((p) => console.error('  ' + p));
      process.exit(1);
    }
    console.log('\n✓ assert ok');
  }
};

main().catch((e) => { console.error(e.message); process.exit(1); });
