/**
 * LEO26-04 — De leer a comprender: ¡explicalo con tus palabras!
 * Serie: Leo, Comprendo y Aprendo · EducaPlay Secundaria (Corrientes)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. COREOGRAFÍA DEL MÁSTER (medido con track-presenter @ 29.97 fps, 5028 frames)
 *    · 0–254:        none (bumper EducaPlay de inicio)
 *    · 254–1391:     center (docente centrada: x 472–1352)
 *    · 1391–1394:    transition [move]
 *    · 1394–1506:    left (docente a la izquierda: x 64–912, banda derecha libre ~1000px)
 *    · 1506–1514:    transition [move]
 *    · 1514–2082:    center (docente centrada: x 480–1336)
 *    · 2082–3000:    transition / lectura en off (docente fuera de cuadro)
 *    · 3000–3041:    center (docente centrada: x 472–1344)
 *    · 3041–3044:    transition [move]
 *    · 3044–3434:    left (docente a la izquierda: x 56–920, banda derecha libre)
 *    · 3434–3442:    transition [move]
 *    · 3442–3788:    center (docente centrada: x 480–1344)
 *    · 3788–3791:    transition [move]
 *    · 3791–4476:    left (docente a la izquierda: x 56–928, banda derecha libre)
 *    · 4476–4484:    transition [move]
 *    · 4484–4804:    center (docente centrada: x 416–1344)
 *    · 4804–4942:    transition [move]
 *    · 4942–5028:    none (placa de cierre institucional)
 *
 * 2. RANGO DE LOS RECURSOS
 *    · didactico: 6-geminis-frag.jpg, 7-geminis-resaltado.jpg, 13-gemini-explic.jpg (lectura/análisis)
 *    · refuerzo: 1-estudiante-pensativo.gif, 2-no.gif, 3-comprender.gif, 4-texto-y-lupa-geminis.jpg,
 *                5-reformula.webp, 8reformula.webp, 9-pensa.webp, 10explica.webp, 11-no-x.webp,
 *                12-tilde-vrde.gif, 14-chau.webp
 *
 * 3. RECTS QUEMADOS
 *    · Marca de agua EducaPlay: [1400, 35, 420, 140], vigente en todo el video (f0 a f5028).
 *    · Placa de nombre: [100, 870, 600, 160], 'Prof. Jési' (Jésica Yanina Romero), f416 a f590.
 *
 * 4. CORRECCIONES DE TRANSCRIPCIÓN (CAPTION_FIX)
 *    · Voseo correntino en verbos imperativos normalizados por Whisper al peninsular.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import type {EpisodeData, Block, SlotSpec, ReservedRect} from '../types.ts';
import {applyCaptionFixes, type CaptionFix} from '../captionFix.ts';
import {TRACK} from './track.ts';
import {CAPTIONS as RAW_CAPTIONS} from './captions.ts';

export {TRACK};

export const FPS = TRACK.fps;
export const DURATION = TRACK.durationInFrames;

export const EPISODE = {
  id: 'LEO26-04',
  title: 'De leer a comprender: ¡explicalo con tus palabras!',
  series: 'Leo, Comprendo y Aprendo',
  objective:
    'Reconocer estrategias para reformular información y producir respuestas con palabras propias, a partir de la comprensión, selección y organización de las ideas principales.',
  master: 'videos/LEO26-04.mp4',
  voiceGain: 1,
  intervention: 2 as const,
};

export const RESERVED: ReservedRect[] = [
  {key: 'watermark', rect: [1400, 35, 420, 140] as const, from: 0, to: DURATION},
  {key: 'placa-nombre', rect: [100, 870, 600, 160] as const, from: 416, to: 590},
];

const BLOCK_SLOT: Partial<SlotSpec> = {maxWidth: 580, maxHeight: 620};

const L_TOP: Partial<SlotSpec> = {align: 'top', maxHeight: 220};
const L_BOTTOM: Partial<SlotSpec> = {align: 'bottom', maxHeight: 380};

export const BLOCKS: readonly Block[] = [
  // ── 1. Apertura: pregunta disparadora (f1117–1325) ──────────────────────────
  {
    kind: 'photo',
    key: 'estudiante-pensativo',
    rank: 'refuerzo',
    from: 1117,
    to: 1325,
    src: 'LEO26-04/1-estudiante-pensativo.gif',
    caption: '¿Te pasó alguna vez?',
    slot: {align: 'center', maxHeight: 420},
  },

  // ── 2. No es copiar ni usar sinónimos (f1333–1510) ─────────────────────────
  {
    kind: 'titular',
    key: 'explicar-no-copiar',
    kicker: 'Estrategia',
    title: 'Explicar con tus palabras',
    from: 1333,
    to: 1510,
    slot: L_TOP,
  },
  {
    kind: 'checklist',
    key: 'no-copiar-checklist',
    rank: 'didactico',
    kicker: 'Aclaración',
    title: 'No es:',
    from: 1394,
    to: 1510,
    slot: L_BOTTOM,
    items: [
      {term: 'Copiar el texto', detail: 'No memorizar frases ajenas', at: 1404},
      {term: 'Usar sinónimos', detail: 'No sustituir palabras sueltas', at: 1460},
    ],
  },

  // ── 3. Explicar es comprender (f1524–1680) ──────────────────────────────────
  {
    kind: 'titular',
    key: 'explicar-comprender',
    kicker: 'Objetivo',
    title: 'Explicar es comprender',
    from: 1524,
    to: 1680,
    slot: L_TOP,
  },
  {
    kind: 'photo',
    key: 'comprender-gif',
    rank: 'refuerzo',
    from: 1540,
    to: 1680,
    src: 'LEO26-04/3-comprender.gif',
    caption: 'Demostrar que comprendiste',
    slot: L_BOTTOM,
  },

  // ── 4. 1° Paso: Comprendé (f1728–2082) ─────────────────────────────────────
  {
    kind: 'titular',
    key: 'paso-1-comprender',
    step: 1,
    kicker: '1° Paso',
    title: 'Comprendé con atención',
    from: 1728,
    to: 2082,
    slot: L_TOP,
  },
  {
    kind: 'checklist',
    key: 'preguntas-clave',
    rank: 'didactico',
    kicker: 'Lectura activa',
    title: 'Preguntate:',
    from: 1840,
    to: 2082,
    slot: L_BOTTOM,
    items: [
      {term: '¿De qué trata?', detail: 'El tema general', at: 1880},
      {term: '¿Cuál es la idea principal?', detail: 'El mensaje central', at: 1930},
    ],
  },

  // ── 5. Definición en Biología (f2090–2695) ──────────────────────────────────
  {
    kind: 'photo',
    key: 'definicion-biologia',
    rank: 'didactico',
    from: 2090,
    to: 2695,
    src: 'LEO26-04/6-geminis-frag.jpg',
    caption: 'Imagen generada con Gemini',
    slot: {align: 'top', maxHeight: 300},
  },
  {
    kind: 'titular',
    key: 'de-que-trata',
    kicker: 'Pregunta clave',
    title: '¿De qué trata? Producción de alimento',
    from: 2550,
    to: 2695,
    slot: {align: 'bottom', maxHeight: 220},
  },

  // ── 6. 2° Paso: Seleccioná (f2709–3000) ─────────────────────────────────────
  {
    kind: 'titular',
    key: 'paso-2-seleccionar',
    step: 2,
    kicker: '2° Paso',
    title: 'Seleccioná la información',
    from: 2709,
    to: 3000,
    slot: L_TOP,
  },
  {
    kind: 'checklist',
    key: 'seleccion-items',
    rank: 'didactico',
    kicker: 'Identificá',
    title: 'Elementos clave:',
    from: 2820,
    to: 3000,
    slot: L_BOTTOM,
    items: [
      {term: 'Ideas principales', detail: 'El núcleo del texto', at: 2840},
      {term: 'Conceptos', detail: 'Términos clave', at: 2884},
      {term: 'Datos', detail: 'Información relevante', at: 2903},
    ],
  },

  // ── 7. 3° Paso: Reformulá (f3041–3245) ─────────────────────────────────────
  {
    kind: 'titular',
    key: 'paso-3-reformular',
    step: 3,
    kicker: '3° Paso',
    title: 'La clave: reformulá',
    from: 3041,
    to: 3245,
    slot: L_TOP,
  },
  {
    kind: 'checklist',
    key: 'reformula-pasos',
    rank: 'didactico',
    kicker: 'Estrategia',
    title: 'Cómo reformular:',
    from: 3041,
    to: 3245,
    slot: L_BOTTOM,
    items: [
      {term: '1. Reformulá', detail: 'Alejate del texto', at: 3041},
      {term: '2. Pensá', detail: 'Buscá tus propias palabras', at: 3146},
      {term: '3. Explicá', detail: 'Como a un compañero', at: 3188},
    ],
  },

  // ── 8. No copies: ¡explicá! (f3260–3430) ───────────────────────────────────
  {
    kind: 'titular',
    key: 'no-copies-explica',
    kicker: 'Regla de oro',
    title: 'No copies: ¡explicá!',
    from: 3260,
    to: 3430,
    slot: L_TOP,
  },
  {
    kind: 'photo',
    key: 'no-x',
    rank: 'refuerzo',
    from: 3260,
    to: 3365,
    src: 'LEO26-04/11-no-x.webp',
    caption: 'No copies la definición',
    slot: L_BOTTOM,
  },
  {
    kind: 'photo',
    key: 'tilde-verde',
    rank: 'refuerzo',
    from: 3370,
    to: 3430,
    src: 'LEO26-04/12-tilde-vrde.gif',
    caption: 'Explicá con tus palabras',
    slot: L_BOTTOM,
  },

  // ── 9. Ejemplo resuelto: fotosíntesis explicada (f3463–3755) ───────────────
  {
    kind: 'titular',
    key: 'ejemplo-reformulado',
    kicker: 'Ejemplo resuelto',
    title: 'La definición explicada',
    from: 3463,
    to: 3755,
    slot: L_TOP,
  },
  {
    kind: 'photo',
    key: 'gemini-explic',
    rank: 'didactico',
    from: 3480,
    to: 3755,
    src: 'LEO26-04/13-gemini-explic.jpg',
    caption: 'Imagen generada con Gemini',
    slot: L_BOTTOM,
  },

  // ── 10. 4° Paso: Organizá y revisá (f3760–4155) ────────────────────────────
  {
    kind: 'titular',
    key: 'paso-4-organizar',
    step: 4,
    kicker: '4° Paso',
    title: 'Organizá y revisá',
    from: 3760,
    to: 4155,
    slot: L_TOP,
  },
  {
    kind: 'checklist',
    key: 'checklist-revision',
    rank: 'didactico',
    kicker: 'Checklist',
    title: 'Antes de responder:',
    from: 3781,
    to: 4155,
    slot: L_BOTTOM,
    items: [
      {term: 'Pensá qué vas a decir', detail: 'Tener clara la idea', at: 3781},
      {term: 'Ordená tus ideas', detail: 'Estructurar la respuesta', at: 3842},
      {term: 'Revisá que se entienda', detail: 'Claridad en la expresión', at: 3892},
      {term: 'Usá tus propias palabras', detail: 'Sin copiar de memoria', at: 4072},
    ],
  },

  // ── 11. Resumen: Los 4 pasos (f4264–4476) ──────────────────────────────────
  {
    kind: 'titular',
    key: 'resumen-4-pasos',
    kicker: 'En resumen',
    title: 'Los 4 pasos estratégicos',
    from: 4264,
    to: 4476,
    slot: L_TOP,
  },
  {
    kind: 'checklist',
    key: 'cuatro-pasos',
    rank: 'didactico',
    kicker: 'Estrategia',
    title: 'Secuencia completa:',
    from: 4280,
    to: 4476,
    slot: L_BOTTOM,
    items: [
      {term: '1. Comprendé', detail: 'Leé con atención', at: 4298},
      {term: '2. Seleccioná', detail: 'Ideas y conceptos clave', at: 4337},
      {term: '3. Reformulá', detail: 'Explicá a un compañero', at: 4373},
      {term: '4. Organizá', detail: 'Revisá tu respuesta', at: 4405},
    ],
  },

  // ── 12. Cierre y despedida (f4610–4830) ────────────────────────────────────
  {
    kind: 'titular',
    key: 'pregunta-cierre',
    kicker: 'Desafío',
    title: '¿Copiar o explicar?',
    from: 4610,
    to: 4725,
    slot: L_TOP,
  },
  {
    kind: 'photo',
    key: 'pensa-cierre',
    rank: 'refuerzo',
    from: 4615,
    to: 4725,
    src: 'LEO26-04/9-pensa.webp',
    caption: 'Demostrá lo que comprendiste',
    slot: L_BOTTOM,
  },
  {
    kind: 'photo',
    key: 'chau',
    rank: 'refuerzo',
    from: 4735,
    to: 4830,
    src: 'LEO26-04/14-chau.webp',
    caption: '¡Nos vemos en el próximo video!',
    slot: {align: 'center', maxHeight: 420},
  },
];

export const CAPTION_FIX: readonly CaptionFix[] = [
  {
    find: 'Primero comprende, lee o escucha con atención y pregúntate',
    replace: 'Primero comprendé, leé o escuchá con atención y preguntate',
    why: 'f1686 — voseo correntino en imperativos',
  },
  {
    find: 'Después selecciona. No necesitas',
    replace: 'Después seleccioná. No necesitás',
    why: 'f2709 — voseo correntino',
  },
  {
    find: 'Reformula. Alejate un momento del texto y pensá',
    replace: 'Reformulá. Alejate un momento del texto y pensá',
    why: 'f3001 — voseo correntino',
  },
  {
    find: 'Identifica la idea y explica con tus propias palabras',
    replace: 'Identificá la idea y explicá con tus propias palabras',
    why: 'f3318 — voseo correntino',
  },
  {
    find: 'Comprende. Selecciona. Reformula y organizá',
    replace: 'Comprendé. Seleccioná. Reformulá y organizá',
    why: 'f4298 — voseo correntino',
  },
  {
    find: 'Y ahora que ya lo sabes',
    replace: 'Y ahora que ya lo sabés',
    why: 'f4486 — voseo correntino',
  },
];

export const CAPTION_AVOID = [
  {from: 416, to: 590, bottom: 220, why: 'placa de nombre Prof. Jési'},
];

export const TITULARES: any[] = [];
export const TITULAR_SLOT = {side: 'opposite', align: 'top', maxWidth: 600, maxHeight: 300} as const;
export const READING_SLOT = {side: 'opposite', align: 'center', maxWidth: BLOCK_SLOT.maxWidth ?? 580, maxHeight: BLOCK_SLOT.maxHeight ?? 620} as const;
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
