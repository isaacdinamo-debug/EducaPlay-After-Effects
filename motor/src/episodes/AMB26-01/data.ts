/**
 * AMB26-01 — ¿Podemos estar preparados?
 * Educación Ambiental Integral · EducaPlay Secundaria (Corrientes)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. COREOGRAFÍA DEL MÁSTER (medido con track-presenter @ 25.0 fps, 4349 frames)
 *    · 0–566:        none (bumper EducaPlay de inicio + plató sin docente)
 *    · 566–830:      center (docente centrada: x 152–1280)
 *    · 830–860:      transition [move]
 *    · 860–1226:     left (docente a la izquierda: x 200–848, banda derecha libre ~1000px)
 *    · 1226–1255:    transition [move]
 *    · 1255–1741:    center (docente centrada: x 608–1256)
 *    · 1741–1776:    transition [move]
 *    · 1776–2820:    left (docente a la izquierda: x 176–824, banda derecha libre ~1000px)
 *    · 2820–2851:    transition [move]
 *    · 2851–3236:    center (docente centrada: x 608–1240)
 *    · 3236–3282:    transition [move]
 *    · 3282–3850:    left (docente a la izquierda: x 208–856, banda derecha libre ~1000px)
 *    · 3850–3851:    transition [cut]
 *    · 3851–4151:    center (docente centrada: x 616–1248)
 *    · 4151–4349:    none (placa institucional de cierre)
 *
 * 2. RANGO DE LOS RECURSOS
 *    · didactico: cielo-tormenta-gemini.jpg (evidencia documental)
 *    · refuerzo: cielo-con-nubes-de-lluvia.jpg, gotas-golpeando-una-ventana.mp4,
 *                una-calle-con-agua.mov, ramas-moviendose-con-viento.mov,
 *                persona-mirando-por-una-ventana-mientras-llueve.mov,
 *                telefono.png, mochila.gif, atencion.gif
 *
 * 3. RECTS QUEMADOS
 *    · Marca de agua EducaPlay: [1400, 35, 420, 140], vigente en todo el video (f0 a f4349).
 *    · Placa de nombre: [79, 818, 550, 110], 'Prof. Paola Suárez', f585 a f775.
 *
 * 4. LO QUE LA ESCALETA PIDE Y EL MÁSTER NO TRAE
 *    · fila 12: «corta el gas» y «autoridades indican evacuar» no fueron grabadas
 *      en la locución final del máster recortado; se recompusieron las acciones
 *      preventivas con foco en desagües, objetos y punto de encuentro familiar.
 *
 * 5. CORRECCIONES DE TRANSCRIPCIÓN (CAPTION_FIX)
 *    · Normalización de «del niño» a «de El Niño» en la referencia al fenómeno climático.
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
  id: 'AMB26-01',
  title: '¿Podemos estar preparados?',
  series: 'Educación Ambiental Integral',
  objective:
    'Brindar herramientas prácticas para anticiparse a una inundación y actuar de forma segura durante la emergencia hídrica.',
  master: 'videos/AMB26-01.mp4',
  voiceGain: 1,
  intervention: 2 as const,
};

export const RESERVED: ReservedRect[] = [
  {key: 'watermark', rect: [1400, 35, 420, 140] as const, from: 0, to: DURATION},
  {key: 'placa-nombre', rect: [79, 818, 550, 110] as const, from: 585, to: 775},
];

const cueFrame = (key: string): number => {
  const c = CUES[key];
  if (!c) throw new Error(`Falta cue ${key} en cues.ts`);
  return c.f;
};

export const M = {
  pregunta_inicia: cueFrame('pregunta_inicia'),
  telefono: cueFrame('telefono'),
  extraordinarias: cueFrame('extraordinarias'),
  mochila: cueFrame('mochila'),
  salvo: cueFrame('salvo'),
  linterna: cueFrame('linterna'),
  alimentos: cueFrame('alimentos'),
  botiquin: cueFrame('botiquin'),
  bolsas: cueFrame('bolsas'),
  ropa: cueFrame('ropa'),
  higiene: cueFrame('higiene'),
  vulnerabilidad: cueFrame('vulnerabilidad'),
  desagues: cueFrame('desagues'),
  objetos: cueFrame('objetos'),
  reunirse: cueFrame('reunirse'),
  prepararnos: cueFrame('prepararnos'),
} as const;

export const MARKS = M;

const L_TOP: Partial<SlotSpec> = {align: 'top', maxHeight: 190};
const L_BOTTOM: Partial<SlotSpec> = {align: 'bottom', maxHeight: 380};

export const BLOCKS: readonly Block[] = [
  // ── 1. Introducción ambiental sin docente en cuadro (f250–f550) ───────────
  {
    kind: 'photo',
    key: 'cielo-lluvia',
    rank: 'refuerzo',
    from: 250,
    to: 310,
    src: 'AMB26-01/cielo-con-nubes-de-lluvia.jpg',
    caption: 'Cielo con nubes de tormenta',
    slot: {align: 'top', maxHeight: 420},
  },
  {
    kind: 'video',
    key: 'gotas-ventana',
    rank: 'refuerzo',
    from: 310,
    to: 370,
    src: 'AMB26-01/gotas-golpeando-una-ventana.mp4',
    caption: 'Lluvias intensas',
    slot: {align: 'top', maxHeight: 420},
  },
  {
    kind: 'video',
    key: 'calle-agua',
    rank: 'refuerzo',
    from: 370,
    to: 430,
    src: 'AMB26-01/una-calle-con-agua.mov',
    caption: 'Acumulación de agua en calles',
    slot: {align: 'top', maxHeight: 420},
  },
  {
    kind: 'video',
    key: 'ramas-viento',
    rank: 'refuerzo',
    from: 430,
    to: 490,
    src: 'AMB26-01/ramas-moviendose-con-viento.mov',
    caption: 'Vientos fuertes de temporal',
    slot: {align: 'top', maxHeight: 420},
  },
  {
    kind: 'video',
    key: 'persona-ventana',
    rank: 'refuerzo',
    from: 490,
    to: 550,
    src: 'AMB26-01/persona-mirando-por-una-ventana-mientras-llueve.mov',
    caption: 'Emergencia hídrica en el hogar',
    slot: {align: 'top', maxHeight: 420},
  },

  // ── 2. Pregunta disparadora (f784–f890) ──────────────────────────────────
  {
    kind: 'titular',
    key: 'que-mas-util',
    kicker: 'Pregunta clave',
    title: '¿Qué más podría ser útil?',
    from: 784,
    to: 860,
    slot: L_TOP,
  },
  {
    kind: 'photo',
    key: 'telefono-recurso',
    rank: 'refuerzo',
    from: 784,
    to: 860,
    src: 'AMB26-01/telefono.png',
    caption: 'El teléfono no es suficiente',
    slot: L_BOTTOM,
  },

  // ── 3. Lluvias extraordinarias y El Niño (f920–f1220) ────────────────────
  {
    kind: 'titular',
    key: 'lluvias-extraordinarias',
    kicker: 'Fenómeno climático',
    title: 'Lluvias extraordinarias',
    from: 920,
    to: 1220,
    slot: L_TOP,
  },
  {
    kind: 'photo',
    key: 'noticia-clarin',
    rank: 'didactico',
    from: 940,
    to: 1220,
    src: 'AMB26-01/cielo-tormenta-gemini.jpg',
    caption: 'Registro documental de inundaciones',
    credit: 'Evidencia documental',
    slot: L_BOTTOM,
  },

  // ── 4. Mochila de emergencia (f1290–f1720) ──────────────────────────────
  {
    kind: 'titular',
    key: 'titular-mochila',
    kicker: 'Prevención activa',
    title: 'Mochila de emergencia',
    from: 1290,
    to: 1720,
    slot: L_TOP,
  },
  {
    kind: 'gif',
    key: 'mochila-animada',
    rank: 'refuerzo',
    from: 1302,
    to: 1720,
    src: 'AMB26-01/mochila.gif',
    label: 'Tenerla armada y lista para salir',
    slot: L_BOTTOM,
  },

  // ── 5. Checklist 1: Elementos esenciales (f1880–f2480) ───────────────────
  {
    kind: 'titular',
    key: 'titular-elementos-1',
    kicker: 'Mochila de emergencia',
    title: 'Elementos esenciales',
    from: 1880,
    to: 2480,
    slot: L_TOP,
  },
  {
    kind: 'checklist',
    key: 'checklist-esenciales',
    rank: 'didactico',
    kicker: 'Contenido básico',
    title: 'Elementos clave:',
    from: 1900,
    to: 2480,
    slot: L_BOTTOM,
    items: [
      {term: 'Teléfono y linterna', detail: 'Con baterías nuevas', at: 1945},
      {term: 'Agua y alimentos', detail: 'No perecederos, sin cocción', at: 2054},
      {term: 'Botiquín básico', detail: 'Alcohol, gasas y apósitos', at: 2299},
    ],
  },

  // ── 6. Checklist 2: Documentación e higiene (f2490–f2820) ────────────────
  {
    kind: 'titular',
    key: 'titular-elementos-2',
    kicker: 'Mochila de emergencia',
    title: 'Documentación e higiene',
    from: 2490,
    to: 2820,
    slot: L_TOP,
  },
  {
    kind: 'checklist',
    key: 'checklist-documentacion',
    rank: 'didactico',
    kicker: 'Protección personal',
    title: 'Cuidado indispensable:',
    from: 2500,
    to: 2820,
    slot: L_BOTTOM,
    items: [
      {term: 'Documentación y DNI', detail: 'En bolsas herméticas', at: 2515},
      {term: 'Ropa seca y abrigo', detail: 'Muda de recambio protegida', at: 2615},
      {term: 'Higiene personal', detail: 'Jabón, cepillos y toallitas', at: 2675},
    ],
  },

  // ── 7. Gestión del riesgo (f2880–f3200) ──────────────────────────────────
  {
    kind: 'titular',
    key: 'gestion-riesgo',
    kicker: 'Gestión del riesgo',
    title: 'Reducir la vulnerabilidad',
    from: 2880,
    to: 3200,
    slot: {align: 'center', maxHeight: 260},
  },

  // ── 8. Acciones preventivas en el hogar (f3280–f3820) ───────────────────
  {
    kind: 'titular',
    key: 'titular-acciones',
    kicker: 'Medidas preventivas',
    title: 'Acciones en el hogar',
    from: 3280,
    to: 3820,
    slot: L_TOP,
  },
  {
    kind: 'checklist',
    key: 'checklist-acciones',
    rank: 'didactico',
    kicker: 'Prevención comunitaria',
    title: 'Medidas antes de la tormenta:',
    from: 3290,
    to: 3820,
    slot: L_BOTTOM,
    items: [
      {term: 'Limpiar desagües y canaletas', detail: 'Facilitar escurrimiento del agua', at: 3302},
      {term: 'Retirar objetos sueltos', detail: 'Evitar arrastre de corriente', at: 3396},
      {term: 'Definir punto de encuentro', detail: 'Plan de reunión familiar', at: 3698},
    ],
  },

  // ── 9. Cierre: Conocer y prepararse (f3870–f4140) ────────────────────────
  {
    kind: 'titular',
    key: 'cierre-titular',
    kicker: 'Compromiso',
    title: 'Conocer, identificar y prepararse',
    from: 3870,
    to: 4140,
    slot: L_TOP,
  },
  {
    kind: 'gif',
    key: 'atencion-sticker',
    rank: 'refuerzo',
    from: 3900,
    to: 4140,
    src: 'AMB26-01/atencion.gif',
    label: 'Estar prevenidos salva vidas',
    slot: L_BOTTOM,
  },
];

export const CAPTION_FIX: readonly CaptionFix[] = [
  {
    find: 'Al fenómeno del niño no podemos evitarlo',
    replace: 'Al fenómeno de El Niño no podemos evitarlo',
    why: 'f3802 — mayúscula canónica del evento climático',
  },
];

export const CAPTION_AVOID = [
  {from: 560, to: 775, bottom: 270, why: 'placa de nombre Prof. Paola Suárez'},
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
