/**
 * LEO26-04 — De leer a comprender: ¡explicalo con tus palabras!
 * Educación Ambiental Integral · EducaPlay Secundaria (Corrientes)
 *
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  ESQUELETO GENERADO POR `npm run escaleta -- LEO26-04`.                   ║
 * ║  Copialo a data.ts, completalo y BORRÁ este archivo. No se importa.      ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * La cabecera del data.ts es parte del entregable. Antes de dar el capítulo por
 * hecho, completá acá:
 *
 *   1 · LA COREOGRAFÍA DEL MÁSTER. Pegá la tabla de segmentos que imprime
 *       `npm run track -- LEO26-04 --report` y decí qué pasa en cada tramo.
 *       El ancho de las tarjetas sale de ahí solo (STAGE_MAX_W), pero el lector
 *       necesita saber por qué el capítulo respira como respira.
 *
 *   2 · EL RANGO DE CADA RECURSO. Didáctico (hay que poder leerlo, o es
 *       evidencia real) contra refuerzo (ilustra lo que el docente ya dijo).
 *
 *   3 · LO QUE LA ESCALETA PIDE Y EL MÁSTER NO DA. Con su frame.
 *
 *   4 · LOS ERRORES DE TRANSCRIPCIÓN resueltos a mano, con su frame.
 *
 *   5 · LOS RECTS QUEMADOS. Placa de nombre y marca de agua, medidos sobre un
 *       frame real de ESTE corte. Cambian de capítulo a capítulo.
 *
 *   6 · LA CALIBRACIÓN DE AUDIO. `voiceGain` se mide sobre el render completo,
 *       nunca sobre un fragmento ni estimado.
 *
 * Objetivo declarado en la escaleta:
 *   Reconocer estrategias para reformular información y producir respuestas con palabras propias, a partir de la comprensión, selección y organización de las ideas principales.
 *
 * Créditos que declara la escaleta (CONFIRMAR contra la placa quemada):
 *   equipo docente: —
 *   en cámara:      Jésica Yanina Romero
 */
import type {EpisodeData, Block, SlotSpec, ReservedRect} from '../types.ts';
import {applyCaptionFixes, type CaptionFix} from '../captionFix.ts';
import {TRACK} from './track.ts';
import {CAPTIONS as RAW_CAPTIONS} from './captions.ts';
import {CUES} from './cues.ts';

export const FPS = TRACK.fps; // medido del máster: no todos son de 25
export const DURATION = TRACK.durationInFrames;

export const EPISODE = {
  id: 'LEO26-04',
  title: "De leer a comprender: ¡explicalo con tus palabras!",
  series: 'Educación Ambiental Integral',
  objective: "Reconocer estrategias para reformular información y producir respuestas con palabras propias, a partir de la comprensión, selección y organización de las ideas principales.",
  master: 'videos/LEO26-04.mp4',
  /** Medir sobre el render COMPLETO con ffmpeg ebur128. Objetivo −18 a −19 LUFS. */
  voiceGain: 1,
};

/** Medidos sobre un frame real de ESTE corte, no heredados de otro capítulo. */
export const RESERVED: ReservedRect[] = [
  {key: 'watermark-safe', rect: [1300, 0, 620, 260] as const, from: 0, to: DURATION},
  // {key: 'placa-nombre', rect: [TODO] as const, from: TODO, to: TODO},
];

const cueFrame = (key: string): number => {
  const c = CUES[key];
  if (!c) throw new Error(`Falta cue ${key} en cues.ts`);
  return c.f;
};

export const M = {
  copiar: cueFrame('copiar'),
} as const;

export const MARKS = M;

/**
 * Reparto vertical. El ANCHO no se declara: lo pone STAGE_MAX_W según el
 * encuadre. Esto es sólo para que un titular y su recurso convivan sin taparse
 * (slots disjuntos: uno arriba, otro abajo).
 */
const L2_TITULAR: Partial<SlotSpec> = {align: 'top', maxHeight: 190};
const L2_RECURSO: Partial<SlotSpec> = {align: 'bottom', maxHeight: 370};
const C_TITULAR: Partial<SlotSpec> = {align: 'top', maxHeight: 230};
const C_RECURSO: Partial<SlotSpec> = {align: 'bottom', maxHeight: 400};

export const BLOCKS: readonly Block[] = [
  // ── Fila 1 de la escaleta ───────────────────────────────────────────────────────
  // GUION: La comprensión lectora es un proceso mediante el cual el lector construye el significado del texto a partir de la interacción entre sus conocimientos previos y la información que proporciona el texto. La comprensión lectora es… un proceso donde… el lector… construye… eh… el significado del texto… a 
  // OBS:   Aparece el recurso cuando el profesor comienza a formular la pregunta ¿Cómo era? y se mantiene hasta el final de esta fila.
  {
    // 1.ESTUDIANTE PENSATIVO.gif
    kind: 'photo' /* photo | video | gif | evidence | checklist */,
    key: 'TODO-recurso-1',
    rank: 'refuerzo' /* 'didactico' si hay que LEERLO o es evidencia real */,
    from: TODO_FRAME,
    to: TODO_FRAME,
    src: 'LEO26-04/1-estudiante-pensativo.gif',
    caption: 'TODO',
  },

  // ── Fila 2 de la escaleta ───────────────────────────────────────────────────────
  // GUION: Explicar con tus propias palabras no es copiar. Tampoco es cambiar algunas palabras por sinónimos.
  // OBS:   Aparece los titulares Explicar No es copiar No es usar sinónimos al inicio de esta fila y luego Aparece el recurso 2.No cuando dice “no es copiar”. y se mantienen hasta el final de esta fila.
  {
    kind: 'titular',
    key: 'TODO-2',
    from: M.copiar,
    to: TODO_FRAME,
    // slot: L2_TITULAR | C_TITULAR según el encuadre de esos frames
    kicker: 'TODO',
    title: "Explicar",
  },
  {
    kind: 'titular',
    key: 'TODO-2',
    from: M.copiar,
    to: TODO_FRAME,
    // slot: L2_TITULAR | C_TITULAR según el encuadre de esos frames
    kicker: 'TODO',
    title: "No es copiar",
  },
  {
    kind: 'titular',
    key: 'TODO-2',
    from: M.copiar,
    to: TODO_FRAME,
    // slot: L2_TITULAR | C_TITULAR según el encuadre de esos frames
    kicker: 'TODO',
    title: "No es usar sinónimos",
  },
  {
    // 2.NO.gif,
    kind: 'photo' /* photo | video | gif | evidence | checklist */,
    key: 'TODO-recurso-2',
    rank: 'refuerzo' /* 'didactico' si hay que LEERLO o es evidencia real */,
    from: M.copiar,
    to: TODO_FRAME,
    src: 'LEO26-04/2-no.gif',
    caption: 'TODO',
  },

  // ── Fila 3 de la escaleta ───────────────────────────────────────────────────────
  // GUION: Explicar es demostrar que comprendiste una idea y que la  podés comunicar de manera clara.
  // OBS:   El titular y recurso 3.COMPRENDER.gif aparecen cuando el profesor dice explicar y permanecen hasta finalizar esta fila.
  {
    kind: 'titular',
    key: 'TODO-3',
    from: TODO_FRAME,
    to: TODO_FRAME,
    // slot: L2_TITULAR | C_TITULAR según el encuadre de esos frames
    kicker: 'TODO',
    title: "Explicar es comprender",
  },
  {
    // 3.COMPRENDER.gif
    kind: 'photo' /* photo | video | gif | evidence | checklist */,
    key: 'TODO-recurso-3',
    rank: 'refuerzo' /* 'didactico' si hay que LEERLO o es evidencia real */,
    from: TODO_FRAME,
    to: TODO_FRAME,
    src: 'LEO26-04/3-comprender.gif',
    caption: 'TODO',
  },

  // ── Fila 4 de la escaleta ───────────────────────────────────────────────────────
  // GUION: ¿Cómo hacerlo? Primero, comprendé,  leé o escuchá con atención y preguntate: ¿de qué trata?, ¿cuál es la idea principal. Ahora vamos a leer una definición para entender mejor.
  // OBS:   Aparecen los recursos 4 y 5 cuando el profesor dice comprendé y permanecen hasta finalizar esta fila. Debajo de los recursos aparece el siguiente epígrafe: Imagen generada con Gemini
  {
    // 4.TEXTO Y LUPA GEMINIS.jpg
    kind: 'photo' /* photo | video | gif | evidence | checklist */,
    key: 'TODO-recurso-4',
    rank: 'refuerzo' /* 'didactico' si hay que LEERLO o es evidencia real */,
    from: TODO_FRAME,
    to: TODO_FRAME,
    src: 'LEO26-04/4-texto-y-lupa-geminis.jpg',
    caption: 'TODO',
  },
  {
    // 5.REFORMULÁ.webp
    kind: 'photo' /* photo | video | gif | evidence | checklist */,
    key: 'TODO-recurso-5',
    rank: 'refuerzo' /* 'didactico' si hay que LEERLO o es evidencia real */,
    from: TODO_FRAME,
    to: TODO_FRAME,
    src: 'LEO26-04/5-reformula.webp',
    caption: 'TODO',
  },

  // ── Fila 5 de la escaleta ───────────────────────────────────────────────────────
  // GUION: Por ejemplo, en Biología tenemos esta definición: La fotosíntesis es el proceso mediante el cual las plantas producen su propio alimento. Para realizarla, utilizan agua, dióxido de carbono y energía de la luz solar. ¿De qué trata? De cómo las plantas producen su alimento.
  // OBS:   Voz en off Aparece el primer titular cuando el orador dice Por ejemplo, en Biología y también aparece el recurso 6.geminis en pantalla completa y se queda hasta el final de esta fila. Debajo del recurso aparece el epígrafe: Imagen generada con Gemini. Luego aparece el segundo titular en una parte in
  {
    kind: 'titular',
    key: 'TODO-5',
    from: TODO_FRAME,
    to: TODO_FRAME,
    // slot: L2_TITULAR | C_TITULAR según el encuadre de esos frames
    kicker: 'TODO',
    title: "En Biología",
  },
  {
    kind: 'titular',
    key: 'TODO-5',
    from: TODO_FRAME,
    to: TODO_FRAME,
    // slot: L2_TITULAR | C_TITULAR según el encuadre de esos frames
    kicker: 'TODO',
    title: "¿De qué trata?",
  },
  {
    // 6.GEMINIS FRAG..jpg
    kind: 'photo' /* photo | video | gif | evidence | checklist */,
    key: 'TODO-recurso-6',
    rank: 'refuerzo' /* 'didactico' si hay que LEERLO o es evidencia real */,
    from: TODO_FRAME,
    to: TODO_FRAME,
    src: 'LEO26-04/6-geminis-frag.jpg',
    caption: 'TODO',
  },

  // ── Fila 6 de la escaleta ───────────────────────────────────────────────────────
  // GUION: Después, seleccioná. No necesitás recordar todo: identificá las ideas principales, conceptos y datos que son importantes para responder, así:
  // OBS:   Voz en off Aparece la imagen 7 con su epígrafe debajo: Imagen generada con Gemini. Los titulares aparecen progresivamente cuando el profesor menciona cada uno de los titulares y permanecen hasta finalizar esta fila.
  {
    kind: 'titular',
    key: 'TODO-6',
    from: TODO_FRAME,
    to: TODO_FRAME,
    // slot: L2_TITULAR | C_TITULAR según el encuadre de esos frames
    kicker: 'TODO',
    title: "Ideas principalesConceptosDatos",
  },
  {
    // 7.GEMINIS RESALTADO
    kind: 'photo' /* photo | video | gif | evidence | checklist */,
    key: 'TODO-recurso-7',
    rank: 'refuerzo' /* 'didactico' si hay que LEERLO o es evidencia real */,
    from: TODO_FRAME,
    to: TODO_FRAME,
    src: 'LEO26-04/7-geminis-resaltado.jpg',
    caption: 'TODO',
  },

  // ── Fila 7 de la escaleta ───────────────────────────────────────────────────────
  // GUION: Ahora viene la clave: reformulá. Alejate un momento del texto y pensá: ¿cómo se lo explicarías a un compañero?
  // OBS:   Aparece el primer titular acompañado del recurso 8 cuando el profe dice   reformulá se mantienen hasta el final de esta fila. Luego aparece el segundo titular cuando el profesor dice pensá acompañado del recurso 9. cuando el profe dice  explicá y se mantienen hasta el final de esta fila. Por último 
  {
    kind: 'titular',
    key: 'TODO-7',
    from: TODO_FRAME,
    to: TODO_FRAME,
    // slot: L2_TITULAR | C_TITULAR según el encuadre de esos frames
    kicker: 'TODO',
    title: "ReformuláPensáExplicá",
  },
  {
    // 8REFORMULÁ.webp,
    kind: 'photo' /* photo | video | gif | evidence | checklist */,
    key: 'TODO-recurso-7',
    rank: 'refuerzo' /* 'didactico' si hay que LEERLO o es evidencia real */,
    from: TODO_FRAME,
    to: TODO_FRAME,
    src: 'LEO26-04/8reformula.webp',
    caption: 'TODO',
  },
  {
    // 9.PENSÁ.webp 10EXPLICÁ.webp
    kind: 'photo' /* photo | video | gif | evidence | checklist */,
    key: 'TODO-recurso-9',
    rank: 'refuerzo' /* 'didactico' si hay que LEERLO o es evidencia real */,
    from: TODO_FRAME,
    to: TODO_FRAME,
    src: 'LEO26-04/9-pensa.webp',
    caption: 'TODO',
  },

  // ── Fila 8 de la escaleta ───────────────────────────────────────────────────────
  // GUION: No copies la definición. Identificá la idea y explicá con tus propias palabras.
  // OBS:   El primer titular aparece junto a su recurso 11 cuando el profe dice No copies  y se mantiene en pantalla hasta el final de esta fila. Luego aparece el segundo titular cuando el profe dice Explicá junto con su recurso 12. Los dos recursos y los dos titulares se van cuando el profe dice propias palab
  {
    kind: 'titular',
    key: 'TODO-8',
    from: TODO_FRAME,
    to: TODO_FRAME,
    // slot: L2_TITULAR | C_TITULAR según el encuadre de esos frames
    kicker: 'TODO',
    title: "No copies",
  },
  {
    kind: 'titular',
    key: 'TODO-8',
    from: TODO_FRAME,
    to: TODO_FRAME,
    // slot: L2_TITULAR | C_TITULAR según el encuadre de esos frames
    kicker: 'TODO',
    title: "Explicá",
  },
  {
    // ,11.NO X.webp
    kind: 'photo' /* photo | video | gif | evidence | checklist */,
    key: 'TODO-recurso-8',
    rank: 'refuerzo' /* 'didactico' si hay que LEERLO o es evidencia real */,
    from: TODO_FRAME,
    to: TODO_FRAME,
    src: 'TODO' /* ,11.NO X.webp */,
    caption: 'TODO',
  },
  {
    // 12.TILDE VRDE.gif
    kind: 'photo' /* photo | video | gif | evidence | checklist */,
    key: 'TODO-recurso-12',
    rank: 'refuerzo' /* 'didactico' si hay que LEERLO o es evidencia real */,
    from: TODO_FRAME,
    to: TODO_FRAME,
    src: 'LEO26-04/12-tilde-vrde.gif',
    caption: 'TODO',
  },

  // ── Fila 9 de la escaleta ───────────────────────────────────────────────────────
  // GUION: Por ejemplo,  así: “La fotosíntesis es el procedimiento con que las plantas fabrican su alimento mediante el agua, el dióxido de carbono y la luz solar.”
  // OBS:   Voz en off Desde el comienzo de el discurso de esta fila parece la imagen 13 con su epígrafe debajo: Imagen generada con Gemini y se mantiene en pantalla completa hasta finalizar esta fila.
  {
    // 13.Gemini.explic.
    kind: 'photo' /* photo | video | gif | evidence | checklist */,
    key: 'TODO-recurso-13',
    rank: 'refuerzo' /* 'didactico' si hay que LEERLO o es evidencia real */,
    from: TODO_FRAME,
    to: TODO_FRAME,
    src: 'LEO26-04/13-gemini-explic.jpg',
    caption: 'TODO',
  },

  // ── Fila 10 de la escaleta ──────────────────────────────────────────────────────
  // GUION: Finalmente, Pensá qué vas a decir, ordená tus ideas y revisá que tu respuesta responda a la consigna, revisá que se entienda y esté expresada con tus propias palabras.
  // OBS:   Aparecen los titulares uno a uno paulatinamente cuando se mencionan junto al recurso 12. TILDE VRDE.gif y se mantienen hasta  finalizar esta fila..
  {
    kind: 'titular',
    key: 'TODO-10',
    from: TODO_FRAME,
    to: TODO_FRAME,
    // slot: L2_TITULAR | C_TITULAR según el encuadre de esos frames
    kicker: 'TODO',
    title: "Pensá que decir",
  },
  {
    kind: 'titular',
    key: 'TODO-10',
    from: TODO_FRAME,
    to: TODO_FRAME,
    // slot: L2_TITULAR | C_TITULAR según el encuadre de esos frames
    kicker: 'TODO',
    title: "Ordená tus ideas",
  },
  {
    kind: 'titular',
    key: 'TODO-10',
    from: TODO_FRAME,
    to: TODO_FRAME,
    // slot: L2_TITULAR | C_TITULAR según el encuadre de esos frames
    kicker: 'TODO',
    title: "Revisá que se entienda",
  },
  {
    kind: 'titular',
    key: 'TODO-10',
    from: TODO_FRAME,
    to: TODO_FRAME,
    // slot: L2_TITULAR | C_TITULAR según el encuadre de esos frames
    kicker: 'TODO',
    title: "Usá tus palabras",
  },
  {
    // 12.TILDE VRDE.gif
    kind: 'photo' /* photo | video | gif | evidence | checklist */,
    key: 'TODO-recurso-12',
    rank: 'refuerzo' /* 'didactico' si hay que LEERLO o es evidencia real */,
    from: TODO_FRAME,
    to: TODO_FRAME,
    src: 'LEO26-04/12-tilde-vrde.gif',
    caption: 'TODO',
  },

  // ── Fila 11 de la escaleta ──────────────────────────────────────────────────────
  // GUION: Entonces, cuando tengas que responder una consigna, recordá: comprendé, seleccioná, reformulá y organizá para demostrar que comprendiste.
  // OBS:   Cada uno de los titulares aparecen a  medida que el profesor menciona cada uno acompañados con el recurso 12. TILDE VRDE.gif . Los cuatro permanecen juntos en pantalla y desaparecen al terminar esta fila.
  {
    kind: 'titular',
    key: 'TODO-11',
    from: TODO_FRAME,
    to: TODO_FRAME,
    // slot: L2_TITULAR | C_TITULAR según el encuadre de esos frames
    kicker: 'TODO',
    title: "Comprendé Seleccioná Reformulá Organizá",
  },
  {
    // 12.TILDE VRDE.gif
    kind: 'photo' /* photo | video | gif | evidence | checklist */,
    key: 'TODO-recurso-12',
    rank: 'refuerzo' /* 'didactico' si hay que LEERLO o es evidencia real */,
    from: TODO_FRAME,
    to: TODO_FRAME,
    src: 'LEO26-04/12-tilde-vrde.gif',
    caption: 'TODO',
  },

  // ── Fila 12 de la escaleta ──────────────────────────────────────────────────────
  // GUION: Y ahora que ya lo sabés, la próxima vez que tengas una consigna, ¿vas a copiar o vas a explicar lo que realmente comprendiste? ¡Nos vemos en el próximo video!
  // OBS:   Aparece el titular cuando el profe dice  ¿vas a copiar o vas a explicar? junto al recurso 9. y desaparece cuando dice comprendiste? Por último aparece el recurso 14.chau!.webp cuando el profesor dice Nos vemos en el próximo video! y se queda hasta el final de esta fila.
  {
    kind: 'titular',
    key: 'TODO-12',
    from: TODO_FRAME,
    to: TODO_FRAME,
    // slot: L2_TITULAR | C_TITULAR según el encuadre de esos frames
    kicker: 'TODO',
    title: "¿Copiar o  explicar?",
  },
  {
    // 9.PENSÁ.webp
    kind: 'photo' /* photo | video | gif | evidence | checklist */,
    key: 'TODO-recurso-9',
    rank: 'refuerzo' /* 'didactico' si hay que LEERLO o es evidencia real */,
    from: TODO_FRAME,
    to: TODO_FRAME,
    src: 'LEO26-04/9-pensa.webp',
    caption: 'TODO',
  },
  {
    // 14.chau!.webp
    kind: 'photo' /* photo | video | gif | evidence | checklist */,
    key: 'TODO-recurso-14',
    rank: 'refuerzo' /* 'didactico' si hay que LEERLO o es evidencia real */,
    from: TODO_FRAME,
    to: TODO_FRAME,
    src: 'LEO26-04/14-chau.webp',
    caption: 'TODO',
  },

];

export const CAPTION_FIX: CaptionFix[] = [
  // Whisper normaliza al español peninsular y el público es correntino.
  // {find: 'mantén', replace: 'mantené', why: 'Voseo docente.'},
];

export const CAPTIONS = applyCaptionFixes(RAW_CAPTIONS, CAPTION_FIX);

/** Contrato heredado de la serie Leo: un capítulo nuevo se monta con BLOCKS. */
export const TITULARES = [] as const;
export const TITULAR_SLOT = {
  side: 'opposite',
  align: 'center',
  maxWidth: 560,
  maxHeight: 620,
} as const;
export const READING = {from: 0, to: 0, title: '', paragraphs: [] as const, terms: [] as const};
export const READING_SLOT = TITULAR_SLOT;
export const TERMS = [] as const;
export const CAPTION_AVOID = [] as const;

export {TRACK};

/** Un still por momento conceptual y por cambio de encuadre. */
export const STILLS = [];

const data: EpisodeData = {
  FPS,
  DURATION,
  EPISODE,
  TRACK,
  RESERVED,
  MARKS,
  BLOCKS,
  CAPTION_AVOID,
  TITULARES,
  TITULAR_SLOT,
  READING_SLOT,
  READING,
  TERMS,
  CAPTIONS,
  STILLS,
};

export default data;
