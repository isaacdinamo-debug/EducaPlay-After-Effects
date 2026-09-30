/**
 * PLANTILLA de data.ts — el molde de un episodio nuevo, de cualquier materia.
 *
 * Se copia a src/episodes/<CODE>/data.ts (los imports relativos ya apuntan
 * desde ahí) junto con lo que genera `npm run nuevo`. El capítulo de
 * referencia completo es src/episodes/AMB26-04/data.ts.
 * Exporta un `EpisodeData` por default y describe los gráficos como un array
 * heterogéneo `BLOCKS`, en vez de los bloques con nombre fijo de la v1.
 *
 * Es el ÚNICO archivo del episodio escrito a mano: track.ts, captions.ts y
 * words.json los generan los scripts y los pisan en cada corrida.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ESTA CABECERA ES PARTE DEL ENTREGABLE. Antes de escribir un solo bloque,
 * dejar acá:
 *
 *   1. LO QUE LA ESCALETA PIDE Y EL MÁSTER NO DA. Se descubre buscando cada
 *      palabra-gatillo en words.json, una por una. Puede faltar una palabra
 *      (el docente parafraseó) o un fragmento entero (no se grabó). Si se
 *      monta igual, decir que es una decisión editorial y de quién, y dejarlo
 *      marcado para que coordinación evalúe regrabar.
 *   2. LOS ERRORES DE TRANSCRIPCIÓN resueltos a mano, con su frame. Whisper
 *      inventa palabras que existen: "negros" por "métodos", "Aquí" por
 *      "¿A qué" (que convierte una pregunta en afirmación). Se queman en el
 *      video si nadie los lee.
 *   3. LAS EXCEPCIONES a las reglas del sistema y por qué: una placa a cuadro
 *      completo, un recurso recompuesto, un slot fuera de la banda segura.
 *
 * Es lo que permite que otra persona entienda por qué un gráfico está donde
 * está, tres meses después.
 * ─────────────────────────────────────────────────────────────────────────
 */
import type {EpisodeData, Block, SlotSpec, ReservedRect} from '../types.ts';
import {applyCaptionFixes, type CaptionFix} from '../captionFix.ts';
import {TRACK} from './track.ts';
import {CAPTIONS as CAPTIONS_RAW} from './captions.ts';

const FPS = 25;
/**
 * De `ffprobe -v error -select_streams v:0 -show_entries stream=nb_frames`.
 * Tiene que coincidir con TRACK.durationInFrames.
 */
const DURATION = 0;

/**
 * Marcas del episodio: frames RESUELTOS contra words.json, no marcas a ojo.
 * El nombre de cada una es la palabra que dispara el gráfico, y el comentario
 * al lado es lo que se oye ahí. Un número sin comentario es un número que
 * nadie va a poder verificar.
 *
 * Se pueden resolver con cues.def.json + `npm run cues` (recomendado: deja el
 * vínculo palabra→frame explícito y regenerable) o a mano contra words.json.
 */
const MARKS = {
  bumper: 0,
  contenido: 0,      // primer frame del segmento del docente (del track)
  // bienvenida: 288,   // "en este video exploraremos…"
  credits: 0,
  end: DURATION,
} as const;

/**
 * Rects quemados del máster. La marca de agua la agrega el tracker; acá van
 * los específicos del corte, que NO se infieren y cambian por episodio.
 *
 * El nombre que dice la placa es el que va al video: NUNCA el de la escaleta.
 * Extraer el frame, mirarlo, y confirmarlo con Isaac.
 *   ffmpeg -ss <t> -i <máster> -frames:v 1 placa.png
 */
const RESERVED: ReservedRect[] = [
  // {key: 'lowerThird', rect: [140, 860, 720, 150], from: 289, to: 407},
];

/**
 * Slot por defecto de los bloques. El de Ambiente es 560×620 y no los 1010 de
 * Leo: la banda libre real de un máster de una sola toma centrada, medida
 * sobre la ventana de cada cue, ronda los 450–520 px.
 *
 * Medir las bandas del episodio con el probe de resolveSlot() y tomar la
 * MENOR: así todos los bloques caen en la misma columna en todos los
 * encuadres. Un bloque puede pedir otro con `slot`.
 */
const BLOCK_SLOT: Partial<SlotSpec> = {maxWidth: 560, maxHeight: 620};

/**
 * Los gráficos del capítulo. Cada `from`/`to` sale de una marca, y cada bloque
 * dura al menos lo que exige `legibility` (60 frames un titular, 50 un término
 * encendido, 75 de texto quieto antes del primer resaltado).
 *
 * check-layout verifica que ninguno pise al docente, ni un rect quemado, ni
 * baje de paperBandY sin declararlo, ni TAPE A OTRO BLOQUE. Un gráfico tapado
 * es un gráfico que no existe: pasó con 395 frames de dos titulares detrás del
 * panel de lectura, y todo lo demás daba verde.
 */
const BLOCKS: readonly Block[] = [
  // {kind: 'titular', key: 'x', from: MARKS.a, to: MARKS.b,
  //  kicker: 'Contexto', title: 'Título'},
  //
  // Modo vivo, opcional: `chips` son pastillas con lo que la docente ENUMERA
  // mientras está el titular y no aparece en pantalla. Cada una con su cue en
  // cues.def.json. Es contenido: sólo con el OK del responsable. El slot del
  // titular tiene que tener el alto FINAL (el armado avisa con ⚠ si no entra).
  //  chips: [{text: 'Pozos', at: MARKS.pozos}, {text: 'Cables eléctricos', at: MARKS.cables}],
  //
  // {kind: 'photo', key: 'y', from: …, to: …,
  //  src: 'AMB24-01/foto.png', caption: '', credit: ''},
  //
  // {kind: 'evidence', key: 'z', from: …, to: …,
  //  items: [{src: '…', label: '…', at: MARKS.c}]},
  //
  // {kind: 'definition', key: 'w', from: …, to: …, text: '…',
  //  revealFrames: 0, emphasis: ['…'], source: '…'},
  //
  // Placa a cuadro completo: SÓLO cuando no hay banda libre — el docente abre
  // los dos brazos y quedan menos de los 380 px que check-layout exige.
  // Va fuera de <Stage> y el verificador la reporta aparte en cada corrida,
  // para que la excepción siga siendo visible. Justificarla en la cabecera.
  // {kind: 'plate', key: 'v', from: …, to: …, title: '…'},
];

/**
 * Correcciones de transcripción, como DATOS del episodio.
 *
 * Nunca editar captions.ts: lo reescribe `npm run transcribe` y la corrección
 * se pierde en silencio, con el error volviendo al video sin que nadie se
 * entere. applyCaptionFixes FALLA si un fix no encuentra su texto, así que si
 * whisper cambia de opinión te enterás en el typecheck y no en el render.
 *
 * Se corrige ortografía de lo que SE DICE, nunca el contenido: si la escaleta
 * y el audio difieren, manda el audio. Whisper además normaliza al español
 * peninsular ("quédate", "léelo") y el público es correntino.
 */
const CAPTION_FIX: readonly CaptionFix[] = [
  // {find: 'a los negros de', replace: 'a los métodos de',
  //  why: 'f2641 — el docente dice "métodos de crecimiento"'},
  // {find: 'Aquí nos referimos', replace: '¿A qué nos referimos',
  //  why: 'f2499 — es una pregunta, whisper la volvió afirmación'},
];

const data: EpisodeData = {
  FPS,
  DURATION,
  EPISODE: {
    id: '<CODE>',
    title: '',
    /** Tal cual la materia en src/brand/estudios.ts (MATERIAS[prefijo].series). */
    series: '',
    objective: '',
    master: 'videos/<CODE>.mp4',
    /**
     * Ganancia lineal sobre el audio del máster. Calibrarla contra el
     * PROGRAMA COMPLETO, no escuchando un fragmento: AMB24-01 quedó en 1.45
     * (+3,23 dB) medido sobre sus 171 s a −22,6 LUFS.
     */
    // voiceGain: 1,
    /**
     * Cuánta pantalla puede tomar el capítulo (0–4). SIN default a propósito:
     * el identificador de abajo no existe, así que `npm run check` falla
     * hasta que alguien lo decida. Ver `intervention` en src/episodes/types.ts.
     */
    intervention: TODO_INTERVENCION,
  },
  TRACK,
  RESERVED,
  MARKS,
  BLOCKS,

  /** Rangos donde el subtítulo NO se dibuja, con su motivo. */
  CAPTION_MUTE: [
    // {from: …, to: …, why: 'la escaleta pide que este texto no figure'},
  ],

  CAPTIONS: applyCaptionFixes(CAPTIONS_RAW, CAPTION_FIX),

  /** Bordes de encuadre (del track) + un pico por bloque. */
  STILLS: [],

  // ── Contrato heredado de la serie Leo. Si el episodio no usa el panel de
  // lectura ni los titulares con nombre fijo, van como stubs vacíos.
  TITULARES: [],
  TITULAR_SLOT: {side: 'opposite', align: 'top', maxWidth: 600, maxHeight: 300},
  READING_SLOT: {
    side: 'opposite',
    align: 'center',
    maxWidth: BLOCK_SLOT.maxWidth ?? 560,
    maxHeight: BLOCK_SLOT.maxHeight ?? 620,
  },
  READING: {from: 0, to: 0, title: '', paragraphs: [], terms: []},
  TERMS: [],
};

export default data;
