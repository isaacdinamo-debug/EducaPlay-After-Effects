/**
 * AMB26-02 — Mitos y verdades sobre las inundaciones
 * Educación Ambiental Integral · Educaplay Secundaria (Corrientes)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. COREOGRAFÍA DEL MÁSTER (medido con track-presenter @ 23.976 fps, 4461 frames)
 *    · 0–259:        none (bumper EducaPlay de inicio)
 *    · 259–484:      center (docente centrada)
 *    · 484–499:      transition [move]
 *    · 499–720:      left (docente a la izquierda, banda derecha libre ~1000px)
 *    · 720–736:      transition [move]
 *    · 736–1081:     center (docente centrada)
 *    · 1081–1089:    transition [move]
 *    · 1089–1397:    left (docente a la izquierda, banda derecha libre ~1000px)
 *    · 1397–1520:    left / transition
 *    · 1520–2074:    center (docente centrada)
 *    · 2074–2090:    transition [move]
 *    · 2090–2223:    left (docente a la izquierda, banda derecha libre ~1000px)
 *    · 2223–2237:    transition [move]
 *    · 2237–2668:    center (docente centrada)
 *    · 2668–2708:    transition [move]
 *    · 2708–2815:    left (docente a la izquierda, banda derecha libre ~1000px)
 *    · 2815–3420:    center (docente centrada)
 *    · 3420–3566:    left (docente a la izquierda, banda derecha libre ~1000px)
 *    · 3566–4280:    center (docente centrada)
 *    · 4280–4461:    none (placa institucional de cierre)
 *
 * 2. RANGO DE LOS RECURSOS
 *    · didactico: video-lluvia.mp4, humedales.png, inundaciones-repentinas.png, impacto.mp4
 *    · refuerzo:  chaque-el-agua.png, mitos.gif, ciudad.png, basura.png,
 *                 plasticos.png, peligro.gif, calle-inundada.png, amenazas.png,
 *                 ficcion-pura.gif, calentamiento-global.png
 *
 * 3. RECTS QUEMADOS
 *    · Marca de agua EducaPlay: [1400, 35, 420, 140], vigente en todo el video (f0 a f4461).
 *    · Placa de nombre: [154, 909, 445, 95], 'Prof. Amparo P. Rueda', f312 a f460.
 *
 * 4. CORRECCIONES DE TRANSCRIPCIÓN (CAPTION_FIX)
 *    · f258: modismo 'chaque' y mayúscula 'Corrientes'.
 *    · f1074: 'humedales'.
 *    · f2818: 'postlluvia'.
 *    · f3877: 'de El Niño'.
 *    · f4163: 'video'.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import type {EpisodeData, Block, SlotSpec, ReservedRect} from '../types.ts';
import {applyCaptionFixes, type CaptionFix} from '../captionFix.ts';
import {TRACK} from './track.ts';
import {CAPTIONS as RAW_CAPTIONS} from './captions.ts';
import {CUES} from './cues.ts';

export {TRACK};

export const FPS = TRACK.fps;
export const DURATION = TRACK.durationInFrames;

export const EPISODE = {
  id: 'AMB26-02',
  title: 'Mitos y verdades sobre las inundaciones',
  series: 'Educación Ambiental Integral',
  objective:
    'Derribar mitos populares sobre las inundaciones en Corrientes y comprender sus verdaderas causas, riesgos y medidas preventivas.',
  master: 'videos/AMB26-02.mp4',
  voiceGain: 1,
  intervention: 2 as const,
};

export const RESERVED: ReservedRect[] = [
  {key: 'watermark', rect: [1400, 35, 420, 140] as const, from: 0, to: DURATION},
  {key: 'placa-nombre', rect: [154, 909, 445, 95] as const, from: 312, to: 460},
];

const cueFrame = (key: string, fallback: number): number => {
  const c = CUES[key];
  return c ? c.f : fallback;
};

export const CAPTION_FIX: CaptionFix[] = [
  {find: 'Ya que el agua, ¿qué hacemos si corriente se inunda?', replace: '¡Chaque el agua! ¿Qué hacemos si Corrientes se inunda?', why: 'f258 — modismo chaque y mayúscula Corrientes'},
  {find: 'húmedales', replace: 'humedales', why: 'f1074 — ortografía'},
  {find: 'pos lluvia', replace: 'postlluvia', why: 'f2818 — ortografía RAE'},
  {find: 'del niño', replace: 'de El Niño', why: 'f3877 — mayúscula canónica del evento climático'},
  {find: 'vídeo', replace: 'video', why: 'f4163 — estándar rioplatense'},
];

export const CAPTION_AVOID = [
  {from: 300, to: 470, bottom: 230, why: 'placa de nombre Prof. Amparo P. Rueda'},
];

const L_TOP: Partial<SlotSpec> = {side: 'right', align: 'top', maxWidth: 620, maxHeight: 360};
const L_MID_RIGHT: Partial<SlotSpec> = {side: 'right', align: 'center', maxWidth: 480, maxHeight: 460};
const L_WIDE_RIGHT: Partial<SlotSpec> = {side: 'right', align: 'center', maxWidth: 560, maxHeight: 520};

export const BLOCKS: readonly Block[] = [
  // ── Bloque 01: Introducción & ¡Chaque el agua!
  {
    kind: 'photo',
    key: 'rec_chaque',
    from: 260,
    to: 360,
    rank: 'refuerzo',
    src: 'AMB26-02/chaque-el-agua.png',
    caption: '¡Chaque el agua!',
    slot: L_TOP,
  },
  // ── Bloque 02: Mitos
  {
    kind: 'gif',
    key: 'rec_mitos',
    from: 415,
    to: 484,
    rank: 'refuerzo',
    src: 'AMB26-02/mitos.gif',
    label: 'Mitos y verdades',
    slot: L_TOP,
  },
  // ── Bloque 03: Mito 1 (Titular)
  {
    kind: 'titular',
    key: 'tit_mito1',
    from: 500,
    to: 620,
    kicker: 'Mito 1',
    title: '«Nos inundamos porque está lloviendo mucho»',
    slot: L_TOP,
  },
  // ── Bloque 04: Lluvias locales
  {
    kind: 'video',
    key: 'rec_lluvia',
    from: cueFrame('lluvias_locales', 656) - 10,
    to: 980,
    rank: 'didactico',
    src: 'AMB26-02/video-lluvia.mp4',
    caption: 'Lluvias locales intensas',
    slot: L_MID_RIGHT,
  },
  // ── Bloque 05: Ciudad
  {
    kind: 'photo',
    key: 'rec_ciudad',
    from: cueFrame('ciudad', 996) - 10,
    to: 1200,
    rank: 'refuerzo',
    src: 'AMB26-02/ciudad.jpg',
    caption: 'Escurrimiento en la ciudad',
    slot: L_MID_RIGHT,
  },
  // ── Bloque 06: Humedales
  {
    kind: 'video',
    key: 'rec_humedales',
    from: cueFrame('humedales', 1221) - 10,
    to: 1395,
    rank: 'didactico',
    src: 'AMB26-02/humedales.mp4',
    caption: 'Humedales: esponjas naturales',
    slot: L_WIDE_RIGHT,
  },
  // ── Bloque 07: Mito 2 (Titular)
  {
    kind: 'titular',
    key: 'tit_mito2',
    from: 1400,
    to: 1515,
    kicker: 'Mito 2',
    title: '«Si vivo lejos del río, el agua no me llega»',
    slot: L_TOP,
  },
  // ── Bloque 08: Inundaciones repentinas
  {
    kind: 'photo',
    key: 'rec_inundaciones',
    from: cueFrame('inundaciones_repentinas', 1575) - 10,
    to: 1815,
    rank: 'didactico',
    src: 'AMB26-02/inundaciones-repentinas.jpg',
    caption: 'Inundaciones repentinas por colapso pluvial',
    slot: L_MID_RIGHT,
  },
  // ── Bloque 09: Basura y Desagües
  {
    kind: 'photo',
    key: 'rec_basura',
    from: 1860,
    to: 1945,
    rank: 'refuerzo',
    src: 'AMB26-02/basura.png',
    caption: 'Sacar la basura a horario',
    slot: L_MID_RIGHT,
  },
  // ── Bloque 10: Plásticos
  {
    kind: 'photo',
    key: 'rec_plasticos',
    from: 1948,
    to: 2070,
    rank: 'refuerzo',
    src: 'AMB26-02/plasticos.png',
    caption: 'No tirar plásticos en la vía pública',
    slot: L_MID_RIGHT,
  },
  // ── Bloque 11: Mito 3 (Titular)
  {
    kind: 'titular',
    key: 'tit_mito3',
    from: 2090,
    to: 2220,
    kicker: 'Mito 3',
    title: '«Si la calle está inundada pero el agua bajita, cruzo igual»',
    slot: L_TOP,
  },
  // ── Bloque 12: Peligro
  {
    kind: 'gif',
    key: 'rec_peligro',
    from: 2238,
    to: 2335,
    rank: 'refuerzo',
    src: 'AMB26-02/peligro.gif',
    label: '¡Peligro! No cruces',
    slot: L_MID_RIGHT,
  },
  // ── Bloque 13: Calle inundada
  {
    kind: 'photo',
    key: 'rec_calle',
    from: cueFrame('trampas', 2418) - 10,
    to: 2668,
    rank: 'refuerzo',
    src: 'AMB26-02/calle-inundada.png',
    caption: 'Trampas ocultas bajo el agua',
    slot: L_MID_RIGHT,
  },
  // ── Bloque 14: Mito 4 (Titular)
  {
    kind: 'titular',
    key: 'tit_mito4',
    from: 2684,
    to: 2785,
    kicker: 'Mito 4',
    title: '«Si ya dejó de llover, ya pasó el peligro»',
    slot: L_TOP,
  },
  // ── Bloque 15: Amenazas postlluvia (Riesgo eléctrico y dengue)
  {
    kind: 'photo',
    key: 'rec_amenazas',
    from: cueFrame('amenazas', 2877) - 10,
    to: 3400,
    rank: 'refuerzo',
    src: 'AMB26-02/amenazas.png',
    caption: 'Amenazas postlluvia: electrocución y dengue',
    slot: L_MID_RIGHT,
  },
  // ── Bloque 16: Mito 5 (Titular)
  {
    kind: 'titular',
    key: 'tit_mito5',
    from: 3419,
    to: 3566,
    kicker: 'Mito 5',
    title: '«El clima está controlado por antenas gigantes»',
    slot: L_TOP,
  },
  // ── Bloque 17: Ficción pura
  {
    kind: 'gif',
    key: 'rec_ficcion',
    from: cueFrame('ficcion_pura', 3597) - 10,
    to: 3715,
    rank: 'refuerzo',
    src: 'AMB26-02/ficcion-pura.gif',
    label: '¡Ficción pura!',
    slot: L_MID_RIGHT,
  },
  // ── Bloque 18: Calentamiento global
  {
    kind: 'photo',
    key: 'rec_calentamiento',
    from: 3800,
    to: 3920,
    rank: 'refuerzo',
    src: 'AMB26-02/calentamiento-global.png',
    caption: 'Calentamiento global comprobado',
    slot: L_MID_RIGHT,
  },
  // ── Bloque 19: Impacto y El Niño
  {
    kind: 'video',
    key: 'rec_impacto',
    from: cueFrame('impacto', 3925) - 5,
    to: 4155,
    rank: 'didactico',
    src: 'AMB26-02/impacto.mp4',
    caption: 'Fenómeno de El Niño y tormentas extremas',
    slot: L_MID_RIGHT,
  },
  // ── Bloque 20: Cierre / CTA
  {
    kind: 'titular',
    key: 'tit_cierre',
    from: cueFrame('comparti', 4163) - 4,
    to: 4270,
    // La marca no va en un kicker (se muestra en mayúsculas): ver AGENTS.md.
    kicker: 'Nivel Secundario',
    title: '¡Compartí este video para ganarle a la desinformación!',
    slot: L_TOP,
  },
];

export const TITULARES: any[] = [];
export const TITULAR_SLOT = {side: 'opposite', align: 'top', maxWidth: 600, maxHeight: 300} as const;
export const READING_SLOT = {side: 'opposite', align: 'center', maxWidth: 560, maxHeight: 620} as const;
export const READING = {from: 0, to: 0, title: '', paragraphs: [], terms: []};
export const TERMS: any[] = [];
export const CARDS = null;
export const CARDS_SLOT = null;
export const CAPTION_MUTE: any[] = [];
export const CAPTIONS = applyCaptionFixes(RAW_CAPTIONS, CAPTION_FIX);
export const STILLS: any[] = [];

const data: EpisodeData = {
  FPS,
  DURATION,
  EPISODE,
  TRACK,
  RESERVED,
  MARKS: {},
  BLOCKS,
  CAPTION_MUTE,
  CAPTION_AVOID,
  CAPTIONS,
  STILLS,
  TITULARES,
  TITULAR_SLOT,
  READING_SLOT,
  READING,
  TERMS,
};

export default data;
