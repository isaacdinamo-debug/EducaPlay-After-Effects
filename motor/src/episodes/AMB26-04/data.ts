/**
 * AMB26-04 — "Plan B: protocolo para una inundación"
 * Educación Ambiental Integral · EducaPlay Secundaria (Corrientes)
 *
 * Éste es el ÚNICO archivo del episodio escrito a mano. `track.ts`,
 * `captions.ts`, `cues.ts` y `words.json` los generan los scripts.
 *
 * Cada `from`/`to` de abajo es un frame RESUELTO contra cues.ts / words.json.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 1 · LA POSICIÓN DE LA DOCENTE DECIDE QUIÉN ES PROTAGONISTA
 *
 * El montajista movió la cámara para hacerle lugar al gráfico, y el motor lee
 * esa coreografía en vez de inventarla. El tracker la midió así:
 *
 *     c1  f392–1092   CENTRO      banda libre derecha    672 px
 *     x0  f1092–1126  traslado
 *     l2  f1126–2399  IZQUIERDA   banda libre derecha   1024 px
 *     x1  f2399–2427  traslado
 *     c3  f2427–4282  CENTRO      banda libre izquierda  632 px
 *
 * En los tramos centrados la docente es la protagonista y la tarjeta acompaña:
 * el techo de 560 px ni siquiera ata, porque la banda ya es el límite. En f1126
 * la cámara la corre a la izquierda y abre 1024 px: ahí el protagonista pasa a
 * ser el Motion Graphics y el techo sube a 900 px, con los Pasos 1, 2 y 3 del
 * protocolo desplegados a doble tamaño.
 *
 * La regla no se escribe bloque por bloque —así se desincroniza— sino una vez,
 * en `STAGE_MAX_W` de `episodes/blocks.ts`, que es el mismo helper que usa
 * `check-layout`. Y funciona porque `resolveSlot` ancla la tarjeta al borde
 * EXTERIOR del cuadro: ese borde no se mueve en los 179 s, y lo que cambia es
 * cuánto CRECE HACIA ADENTRO cuando la docente cede el cuadro.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 2 · DIDÁCTICO vs. REFUERZO — el `rank` de cada recurso
 *
 * Antes los catorce recursos llegaban con la misma tarjeta blanca de 560 px:
 * el video documental acreditado a Canal de la Ciudad y un GIF de un televisor
 * pesaban igual, y el espectador no tenía cómo saber qué había que leer.
 *
 *   'didactico' — es la instrucción, o es evidencia real. Tarjeta completa:
 *                 barra arcoíris, numeral, ancho pleno de la banda.
 *                 → recurso 1 y 14 (registro documental), las dos listas
 *                   recompuestas, y los seis titulares del protocolo.
 *
 *   'refuerzo'  — ilustra algo que la docente ya dijo. Papel tibio, sin barra
 *                 ni numeral, 70 % del ancho y entrada más corta.
 *                 → íconos de alerta, desespero, familia, TV, teléfono,
 *                   mochila y las tres recreaciones con IA.
 *
 * Que las tres imágenes generadas con IA queden en refuerzo no es un descarte:
 * es lo honesto. Son recreaciones, no evidencia, y conservan su crédito.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 3 · DOS RECURSOS RECOMPUESTOS COMO TEXTO (kind: 'checklist')
 *
 * `corta servicios.png` (1536×1024) y `vehiculos tachados.png` traen su
 * contenido como texto DENTRO de la imagen. A la escala de la tarjeta ese texto
 * quedaba en ~10 px efectivos — y son justo los dos recursos que el espectador
 * tiene que poder leer, porque son la instrucción. Se recompusieron con la
 * tipografía del sistema y pictogramas dibujados por código, y cada ítem entra
 * sobre SU palabra. Es el mismo criterio que la definición de Estocolmo en
 * AMB24-01: un recurso ilegible es peor que no ponerlo.
 *
 * Ojo con el orden: la infografía del cliente dice LUZ / GAS / AGUA, pero la
 * docente enumera "agua, gas y electricidad". Manda el audio.
 *
 * Los PNG originales quedan en RECURSOS/ por si coordinación los pide de vuelta.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 4 · LA APERTURA QUE PIDE LA ESCALETA
 *
 * El montajista dejó el plató VACÍO entre f265 y f390 (medido: masa de sujeto
 * < 120 en todo el rango) — el hueco para el recurso 1, que la escaleta ubica
 * en "min 0.11 a 0.16" y dura 5,12 s. Encaja exacto.
 *
 * La escaleta pide además que "los titulares y recursos 2 y 3 vayan apareciendo
 * sin superponerse, a modo de alerta". Se resuelve con UNA tira escalonada de
 * tres beats y no con tres titulares: tres bloques de 38 frames caerían por
 * debajo del piso de 60 y `check-layout` los rechazaría, con razón — nadie los
 * leería. Los íconos 1 y 3 venían sobre fondo negro; se les quitó el fondo con
 * `colorkey` y quedaron como alerta-1/2/3.png.
 *
 * `radio.gif` queda SIN MONTAR. Evaluado: la ventana "alertas"→"celular"
 * (f1220–f1311) no admite un segundo beat sin caer bajo el piso de duración, y
 * la escaleta no lo pide — el recurso 6 es el televisor.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 5 · RECURSO 4 — se cambió el archivo montado
 *
 * La cabecera anterior declaraba el recurso 4 como recreación con IA, pero el
 * bloque montaba `sticker1.gif`: una foto de stock de un hombre, sin licencia
 * acreditada y fuera de la estética del capítulo. Se monta `desespero.jpg`, que
 * es la recreación declarada y comparte familia visual con las otras piezas de
 * IA. `sticker1.gif` queda sin usar.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 6 · DECISIONES QUE SE APARTAN DE UNA NORMA, CON SU MOTIVO
 *
 * · TIPOGRAFÍA. El sistema compone en Museo / Museo Sans Rounded y no en
 *   Montserrat, que es lo que pide el §16 del Motion Design System. Decisión de
 *   Isaac: la redondez de Museo es la de la marca de agua "Educaplay" y la de
 *   la placa "Prof. Paola Suárez" que el máster ya trae QUEMADAS. Componer en
 *   Montserrat dejaría la capa gráfica hablando distinto que el plató.
 *
 * · SUBTÍTULOS SIN SILENCIAR. Los seis titulares de paso repiten casi literal
 *   la locución, y el sistema pide no hacer leer dos veces lo mismo — pero esa
 *   regla nació para un párrafo entero en pantalla (la definición de AMB24-01,
 *   y ahí la escaleta lo pedía por escrito). Silenciar seis tramos de subtítulo
 *   por un titular de cinco palabras degrada la accesibilidad sin ganar nada.
 *   No es un olvido: no se usa CAPTION_MUTE a propósito.
 *
 * · TITULAR DEL PASO 5. La escaleta lo dispara en "mochila de emergencia";
 *   acá entra en "Quinto", como los otros cinco. Con el numeral en pantalla, la
 *   serie de pasos tiene que arrancar donde la docente dice el número.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 7 · RECTS QUEMADOS
 *
 * Placa de nombre "Prof. Paola Suárez", f440–f615 en [140, 840, 720, 150].
 * El nombre coincide con el que acredita la escaleta ("En cámara: Paola
 * Suárez") — verificado sobre el frame f480, no dado por bueno.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 8 · CALIBRACIÓN DE AUDIO
 *
 * El máster mide -15.1 LUFS con pico verdadero +0.3 dBFS.
 *
 * `voiceGain` 0.67 (-3.5 dB). El número NO se estimó: se midió sobre el render
 * completo. Con 0.75 el programa salía a -17.6 LUFS — dentro de tolerancia
 * genérica, pero 1,8 dB más fuerte que AMB24-01 (-19.4), y dos capítulos de la
 * misma serie con esa diferencia se notan al pasar de uno al otro. 0.67 lo deja
 * en ~ -18.6 LUFS con pico ~ -3.3 dBFS.
 * ─────────────────────────────────────────────────────────────────────────
 */
import type {EpisodeData, Block, SlotSpec, ReservedRect} from '../types.ts';
import {applyCaptionFixes, type CaptionFix} from '../captionFix.ts';
import {TRACK} from './track.ts';
import {CAPTIONS as RAW_CAPTIONS} from './captions.ts';
import {CUES} from './cues.ts';

export const FPS = 25;
export const DURATION = TRACK.durationInFrames; // 4477 frames (~179 s)

export const EPISODE = {
  id: 'AMB26-04',
  title: 'Plan B: protocolo para una inundación',
  series: 'Educación Ambiental Integral',
  objective:
    'Fomentar una cultura de prevención y cuidado ante situaciones de emergencia hídrica.',
  master: 'videos/AMB26-04.mp4',
  /**
   * Medido sobre el PROGRAMA COMPLETO, nunca sobre un fragmento.
   * Máster: -15.1 LUFS / +0.3 dBFS pico.  Con 0.75 el render daba -17.6 LUFS.
   * 0.67 (-3.5 dB) lo ancla en ~ -18.6 LUFS con pico ~ -3.3 dBFS.
   */
  voiceGain: 0.67,
  /**
   * Nivel 3: composición alrededor de la docente. El capítulo no monta ni una
   * placa ni un recurso a sangre en sus 179 s; todo convive con ella en la
   * banda libre. Declarar 4 sería pedir un permiso que no usa.
   */
  intervention: 3 as const,
};

/**
 * Rects quemados en el máster.
 */
export const RESERVED: ReservedRect[] = [
  /**
   * Marca de agua institucional EducaPlay / Ed. Ambiental.
   *
   * NO es redundante con la que trae TRACK.reserved: el tracker la detecta en
   * [1400, 56, 470, 160] y eso deja afuera el borde izquierdo del isotipo de
   * reciclaje y la línea "ED. AMBIENTAL" de abajo. Medida a mano sobre f480, la
   * marca ocupa x 1323–1792 · y 85–224; este rect la cubre con resguardo.
   */
  {key: 'watermark-safe', rect: [1300, 0, 620, 260] as const, from: 0, to: DURATION},
  // Esquina de papel rasgado superior izquierda: una tarjeta blanca ahí se funde.
  {key: 'papel-sup-izq', rect: [0, 0, 443, 139] as const, from: 0, to: DURATION},
  // Placa quemada: "Prof. Paola Suárez"
  {key: 'placa-nombre', rect: [140, 840, 720, 150] as const, from: 440, to: 615},
];

const cueFrame = (key: string): number => {
  const c = CUES[key];
  if (!c) throw new Error(`Falta cue ${key} en cues.ts`);
  return c.f;
};

export const M = {
  calle: cueFrame('calle'),
  aguaEntrando: cueFrame('aguaEntrando'),
  esperando: cueFrame('esperando'),
  hogar: cueFrame('hogar'),
  protocolo: cueFrame('protocolo'),
  primero: cueFrame('primero'),
  alertas: cueFrame('alertas'),
  celular: cueFrame('celular'),
  segundo: cueFrame('segundo'),
  corta: cueFrame('corta'),
  svcAgua: cueFrame('svcAgua'),
  svcGas: cueFrame('svcGas'),
  svcLuz: cueFrame('svcLuz'),
  levanta: cueFrame('levanta'),
  tercero: cueFrame('tercero'),
  reunir: cueFrame('reunir'),
  plantaSuperior: cueFrame('plantaSuperior'),
  cuarto: cueFrame('cuarto'),
  noVehiculos: cueFrame('noVehiculos'),
  vehAuto: cueFrame('vehAuto'),
  vehMoto: cueFrame('vehMoto'),
  vehBici: cueFrame('vehBici'),
  propiosMedios: cueFrame('propiosMedios'),
  comunicate: cueFrame('comunicate'),
  quinto: cueFrame('quinto'),
  mochila: cueFrame('mochila'),
  sexto: cueFrame('sexto'),
  noCamines: cueFrame('noCamines'),
  centroEvacuacion: cueFrame('centroEvacuacion'),
  cierre: cueFrame('cierre'),
  recapAntes: cueFrame('recapAntes'),
  recapDurante: cueFrame('recapDurante'),
  recapDespues: cueFrame('recapDespues'),

  /**
   * Los tres únicos frames que NO salen de una palabra-gatillo, porque no los
   * marca la locución sino el CORTE: son bordes de segmento del track.
   */
  platoVacioIn: 265,   // primer frame sin docente en cuadro (masa < 120)
  platoVacioOut: 390,  // vuelve a entrar en f390
  finBandaIzq: 2398,   // l2 termina en f2399: el gráfico sale antes del paneo
  finCentro1: 1090,    // c1 termina en f1092, ídem
  finDocente: 4270,    // c3 termina en f4282; después entra la placa de cierre
} as const;

export const MARKS = M;

/**
 * Slots del capítulo.
 *
 * El ANCHO no se declara acá: lo pone `STAGE_MAX_W` según el encuadre (ver la
 * nota 1 de la cabecera). Lo que sí se declara es el reparto VERTICAL, porque
 * la escaleta pide que el titular del paso conviva con su recurso —"queda hasta
 * el final"— y dos bloques simultáneos tienen que pedir cajas disjuntas o uno
 * queda detrás del otro. Un gráfico tapado es un gráfico que no existe.
 *
 * Con `align: 'bottom'` el `maxHeight` clava el TOPE de la tarjeta
 * (captionBandY − maxHeight), así que todos los recursos de un tramo entran
 * exactamente en la misma línea.
 */

/**
 * Tramo con la docente a la izquierda: banda útil y 260–838 (la corta la marca
 * de agua), 578 px para un titular arriba y su recurso abajo.
 *
 * El reparto es POR PAR y no uno solo para todo el tramo. Hasta el 25/9/2026
 * era 190 / 370 para los tres pasos, y check-overlay —que desde entonces
 * renderiza cada bloque solo contra su caja— midió que el titular del paso 1
 * ya se salía 39 px de sus 190 y el checklist de servicios 24 px de sus 370,
 * sobre la banda de subtítulos. Con la escala más aireada de
 * `feat/embellecer-tarjetas` pasaron a 79 y 55. Ninguno se veía porque caía
 * sobre padding, hasta que en f1260 el televisor le tapó "informate" al paso 1.
 *
 *   paso 1 · título en DOS líneas → 270 arriba / 296 abajo (TV y teléfono son
 *            GIF: el recurso es lo que cede, nunca el texto)
 *   pasos 2 y 3 · UNA línea       → 210 arriba / 356 abajo (entra el checklist
 *            de servicios con el pictograma de columna a 52)
 *
 * Entre los dos quedan 12 px de aire: con las cajas pegadas el canto rasgado
 * del titular tocaba la barra del recurso y se leían como una sola tarjeta.
 */
const L2_TITULAR: Partial<SlotSpec> = {align: 'top', maxHeight: 210};
const L2_RECURSO: Partial<SlotSpec> = {align: 'bottom', maxHeight: 356};
const L2_TITULAR_2L: Partial<SlotSpec> = {align: 'top', maxHeight: 270};
const L2_RECURSO_BAJO: Partial<SlotSpec> = {align: 'bottom', maxHeight: 296};

/**
 * Tramo c1: la banda derecha empieza en y=260 (la corta la marca de agua) y el
 * bloque va arriba, no centrado. Entre f440 y f615 la placa quemada
 * "Prof. Paola Suárez" hace SUBIR la banda de subtítulos hasta y=662
 * (CAPTION_AVOID), y una tarjeta centrada caía justo encima: 380 px de alto
 * desde 260 la dejan terminando en 640, con 22 px de aire.
 */
const C1_BLOQUE: Partial<SlotSpec> = {align: 'top'};

/** Tramos centrados: banda útil y 139–838 (la corta la esquina de papel). */
const C_TITULAR: Partial<SlotSpec> = {align: 'top', maxHeight: 230};
const C_RECURSO: Partial<SlotSpec> = {align: 'bottom', maxHeight: 400};

export const BLOCK_SLOT: Partial<SlotSpec> = {side: 'opposite', align: 'center'};

export const BLOCKS: readonly Block[] = [
  // ══ APERTURA · plató vacío, f265–f390 ═══════════════════════════════════
  // No hay nadie a quien esquivar: los dos bloques se reparten el cuadro.
  {
    kind: 'evidence',
    key: 'apertura-alerta',
    rank: 'refuerzo',
    from: M.platoVacioIn,
    to: M.platoVacioOut,
    slot: {side: 'left', fallback: 'left', align: 'center'},
    // Escalonados 35 frames (1,4 s): el "van apareciendo sin superponerse, a
    // modo de alerta" de la escaleta. El último queda encendido 55 frames, por
    // encima del piso de 50.
    items: [
      {src: 'AMB26-04/alerta-1.png', label: '¿Qué hacés?', at: M.platoVacioIn},
      {src: 'AMB26-04/alerta-2.png', label: '¿A dónde vas?', at: M.platoVacioIn + 35},
      {src: 'AMB26-04/alerta-3.png', label: 'Cada decisión cuenta', at: M.platoVacioIn + 70},
    ],
  },
  {
    kind: 'video',
    key: 'recurso-1-inundacion',
    rank: 'didactico',
    from: M.platoVacioIn,
    to: M.platoVacioOut,
    slot: {side: 'right', fallback: 'right', align: 'center'},
    src: 'AMB26-04/recurso-1.mp4',
    caption: 'Emergencia por inundación',
    credit: 'Registro documental · Corrientes',
  },

  // ══ c1 · DOCENTE EN EL CENTRO (f392–1092) ═══════════════════════════════
  // Ella es la protagonista. Un solo bloque por vez, en la banda derecha, con
  // el mismo eje: acompaña la explicación, no la disputa.
  {
    kind: 'titular',
    key: 'pregunta-inicial',
    from: M.calle,
    to: M.aguaEntrando - 6,
    slot: C1_BLOQUE,
    kicker: 'EMERGENCIA HÍDRICA',
    title: '¿Qué hacés? ¿A dónde vas?',
  },
  {
    kind: 'photo',
    key: 'recurso-4-desespero',
    rank: 'refuerzo',
    from: M.aguaEntrando,
    to: M.esperando - 10,
    slot: C1_BLOQUE,
    src: 'AMB26-04/desespero.jpg',
    caption: 'El agua comenzó a entrar',
    credit: 'Recreado con Inteligencia Artificial',
  },
  {
    kind: 'titular',
    key: 'decisiones-clave',
    from: M.esperando,
    to: M.hogar - 10,
    slot: C1_BLOQUE,
    kicker: 'DECISIONES CLAVE',
    title: '¿Esperar, salir o buscar un lugar seguro?',
  },
  {
    kind: 'photo',
    key: 'recurso-5-familia',
    rank: 'refuerzo',
    from: M.hogar,
    to: M.protocolo - 10,
    slot: C1_BLOQUE,
    src: 'AMB26-04/familia.png',
    // Ilustración plana y cuadrada: recortada al 0,58 del ancho les corta la
    // cabeza a las figuras. Entra completa.
    fit: 'contain',
    caption: 'Protegerte y proteger a los demás',
  },
  {
    // Sale en f1090, justo antes del paneo: durante un traslado de cámara el
    // cuadro va limpio. La sección termina donde el montajista la terminó.
    kind: 'titular',
    key: 'protocolo-accion',
    from: M.protocolo,
    to: M.finCentro1,
    slot: C1_BLOQUE,
    kicker: 'GUÍA DE ACCIÓN',
    title: 'Protocolo de acción ante inundaciones',
  },

  // ══ l2 · DOCENTE A LA IZQUIERDA (f1126–2399) ════════════════════════════
  // Cede el cuadro y el Motion Graphics toma el protagonismo: 900 px de banda,
  // titular arriba y recurso abajo conviviendo, como pide la escaleta.

  // ── PASO 1 ──────────────────────────────────────────────────────────────
  {
    kind: 'titular',
    key: 'paso-1-titular',
    from: M.primero,
    to: M.segundo - 10,
    slot: L2_TITULAR_2L,
    step: 1,
    kicker: 'PASO',
    title: 'Mantené la calma e informate',
  },
  {
    kind: 'gif',
    key: 'recurso-6-tv',
    rank: 'refuerzo',
    from: M.alertas,
    to: M.celular - 10,
    slot: L2_RECURSO_BAJO,
    src: 'AMB26-04/tv.gif',
    label: 'Alertas y comunicados oficiales',
  },
  {
    kind: 'gif',
    key: 'recurso-7-telefono',
    rank: 'refuerzo',
    from: M.celular,
    to: M.segundo - 10,
    slot: L2_RECURSO_BAJO,
    src: 'AMB26-04/telefono.gif',
    label: 'Celular cargado y mochila lista',
  },

  // ── PASO 2 ──────────────────────────────────────────────────────────────
  {
    kind: 'titular',
    key: 'paso-2-titular',
    from: M.segundo,
    to: M.tercero - 10,
    slot: L2_TITULAR,
    step: 2,
    kicker: 'PASO',
    title: 'Cortá los servicios',
  },
  {
    // Recompuesto: el PNG del cliente traía esto como texto de ~10 px.
    // El orden es el de la locución ("agua, gas y electricidad"), no el de la
    // infografía (LUZ/GAS/AGUA). La separación real entre las tres palabras es
    // de 13 y 8 frames: la cascada que pide el sistema, medida en el audio.
    kind: 'checklist',
    key: 'recurso-8-servicios',
    rank: 'didactico',
    from: M.corta,
    to: M.levanta - 10,
    slot: L2_RECURSO,
    items: [
      {icon: 'agua', term: 'AGUA', detail: 'Cerrá la llave de paso', at: M.svcAgua},
      {icon: 'gas', term: 'GAS', detail: 'Cerrá la llave de paso', at: M.svcGas},
      {icon: 'luz', term: 'ELECTRICIDAD', detail: 'Bajá el interruptor principal', at: M.svcLuz},
    ],
    note: 'Solo si podés hacerlo sin entrar en contacto con el agua.',
  },
  {
    kind: 'photo',
    key: 'recurso-9-levantar-cosas',
    rank: 'refuerzo',
    from: M.levanta,
    to: M.tercero - 10,
    slot: L2_RECURSO,
    src: 'AMB26-04/levantar-cosas.jpg',
    caption: 'Levantá objetos a lugares altos',
    credit: 'Recreado con Inteligencia Artificial',
  },

  // ── PASO 3 ──────────────────────────────────────────────────────────────
  {
    kind: 'titular',
    key: 'paso-3-titular',
    from: M.tercero,
    to: M.finBandaIzq,
    slot: L2_TITULAR,
    step: 3,
    kicker: 'PASO',
    title: 'Protegé a tu familia',
  },
  {
    kind: 'photo',
    key: 'recurso-10-reunir-familia',
    rank: 'refuerzo',
    from: M.reunir,
    to: M.plantaSuperior - 10,
    slot: L2_RECURSO,
    src: 'AMB26-04/reunir-familia.png',
    caption: 'Atención a niños y adultos mayores',
    credit: 'Recreado con Inteligencia Artificial',
  },
  {
    kind: 'photo',
    key: 'recurso-11-planta-superior',
    rank: 'refuerzo',
    from: M.plantaSuperior,
    to: M.finBandaIzq,
    slot: L2_RECURSO,
    src: 'AMB26-04/subir-planta-superior.jpg',
    caption: 'Trasladate a la planta superior',
    credit: 'Recreado con Inteligencia Artificial',
  },

  // ══ c3 · DOCENTE DE VUELTA AL CENTRO (f2427–4282) ═══════════════════════
  // Vuelve a ser la protagonista: la banda cae a 632 px y las tarjetas
  // acompañan otra vez, en la columna izquierda.

  // ── PASO 4 ──────────────────────────────────────────────────────────────
  {
    kind: 'titular',
    key: 'paso-4-titular',
    from: M.cuarto,
    to: M.propiosMedios + 8,
    slot: C_TITULAR,
    step: 4,
    kicker: 'PASO',
    title: 'Evacuá si te lo indican',
  },
  {
    // Recompuesto, igual que los servicios. La escaleta los quiere fuera en
    // "Y si no podés…" (f2674), pero la bicicleta entra en f2638 y saliendo ahí
    // quedaría 36 frames en pantalla, bajo el piso de 50. Salen en "medios,"
    // (f2724), que cierra la misma idea y todavía es antes de la siguiente.
    kind: 'checklist',
    key: 'recurso-12-vehiculos',
    rank: 'didactico',
    from: M.noVehiculos,
    to: M.propiosMedios,
    slot: C_RECURSO,
    kicker: 'NO USES',
    items: [
      {icon: 'auto', term: 'Auto', at: M.vehAuto, forbidden: true},
      {icon: 'moto', term: 'Moto', at: M.vehMoto, forbidden: true},
      {icon: 'bici', term: 'Bicicleta', at: M.vehBici, forbidden: true},
    ],
  },
  {
    kind: 'titular',
    key: 'servicios-emergencia',
    from: M.comunicate,
    to: M.quinto - 10,
    slot: C_TITULAR,
    kicker: 'COMUNICACIÓN',
    title: 'Llamá a emergencias e informá tu ubicación',
  },

  // ── PASO 5 ──────────────────────────────────────────────────────────────
  {
    kind: 'titular',
    key: 'paso-5-titular',
    from: M.quinto,
    to: M.sexto - 10,
    slot: C_TITULAR,
    step: 5,
    kicker: 'PASO',
    title: 'Llevá solo lo esencial',
  },
  {
    kind: 'gif',
    key: 'recurso-13-mochila',
    rank: 'refuerzo',
    from: M.mochila,
    to: M.sexto - 10,
    slot: C_RECURSO,
    src: 'AMB26-04/mochila.gif',
    label: 'Mochila de emergencia',
  },

  // ── PASO 6 ──────────────────────────────────────────────────────────────
  {
    kind: 'titular',
    key: 'paso-6-titular',
    from: M.sexto,
    to: M.centroEvacuacion - 10,
    slot: C_TITULAR,
    step: 6,
    kicker: 'PASO',
    title: 'No atravieses el agua',
  },
  {
    // El único registro real de la inundación además del recurso 1, y con
    // fuente acreditada: es evidencia, no ilustración.
    kind: 'video',
    key: 'recurso-14-video-evacuacion',
    rank: 'didactico',
    from: M.noCamines,
    to: M.centroEvacuacion - 10,
    slot: C_RECURSO,
    src: 'AMB26-04/recurso-14.mp4',
    caption: 'Peligros ocultos bajo el agua',
    credit: 'Canal de la Ciudad · Temporal en Corrientes',
  },

  // ── CIERRE ──────────────────────────────────────────────────────────────
  {
    kind: 'titular',
    key: 'centro-evacuacion-titular',
    from: M.centroEvacuacion,
    to: M.cierre - 10,
    slot: C_TITULAR,
    kicker: 'ZONA SEGURA',
    title: 'Dirigite al centro de evacuación oficial',
  },
  {
    // El cierre nombra TRES videos de la serie —antes, durante y después— y
    // antes era un solo titular quieto 16 s. Cada línea entra sobre la
    // referencia que la docente enuncia, así el recap se construye con ella.
    kind: 'checklist',
    key: 'recap-cierre',
    rank: 'didactico',
    from: M.cierre,
    to: M.finDocente,
    slot: C_RECURSO,
    kicker: 'EDUCAPLAY AMBIENTAL',
    items: [
      {term: 'Antes', detail: 'Cómo prepararte', at: M.recapAntes},
      {term: 'Durante', detail: 'Este protocolo de acción', at: M.recapDurante},
      {term: 'Después', detail: 'Qué hacer luego de la inundación', at: M.recapDespues},
    ],
  },
];

/**
 * Correcciones ortográficas y de normalización sobre el texto de Whisper.
 *
 * Se corrige la ortografía de lo que se DICE, nunca el contenido. Whisper
 * normaliza al español peninsular ("mantén", "protege") y el público es
 * correntino. `applyCaptionFixes` lanza si un fix deja de encontrar su texto,
 * así que una transcripción regenerada se avisa en el typecheck y no en el
 * render.
 */
export const CAPTION_FIX: CaptionFix[] = [
  {find: 'haces?', replace: 'hacés?', why: 'Voseo auténtico del docente en cámara.'},
  {
    find: '¿Te quedas esperando que baje, salís caminando o buscas',
    replace: '¿Te quedás esperando que baje, salís caminando o buscás',
    why: 'Normalización peninsular de Whisper a voseo correntino.',
  },
  {
    find: 'Primero, mantén la calma e informate.',
    replace: 'Primero, mantené la calma e informate.',
    why: 'Voseo docente.',
  },
  {find: 'Escucha las alertas', replace: 'Escuchá las alertas', why: 'Voseo docente.'},
  {find: 'Mantén cerradas puertas', replace: 'Mantené cerradas puertas', why: 'Voseo docente.'},
  {
    find: 'Tercero, protege a tu familia.',
    replace: 'Tercero, protegé a tu familia.',
    why: 'Voseo docente.',
  },
  {find: 'trasládate allí mientras', replace: 'trasladate allí mientras', why: 'Voseo docente.'},
  {find: 'esperas indicaciones.', replace: 'esperás indicaciones.', why: 'Voseo docente.'},
  {find: 'evacua.', replace: 'evacuá.', why: 'Acentuación correcta de la orden.'},
  {find: 'comunícate', replace: 'comunicate', why: 'Voseo docente.'},
  {find: 'llevas solo lo esencial', replace: 'llevá solo lo esencial', why: 'Voseo docente.'},
  {find: 'Dirígite al centro', replace: 'Dirigite al centro', why: 'Voseo docente.'},
];

export const CAPTIONS = applyCaptionFixes(RAW_CAPTIONS, CAPTION_FIX);

/** Contrato heredado de la serie Leo: este capítulo se monta 100 % con BLOCKS. */
export const TITULARES = [] as const;
export const TITULAR_SLOT = {
  side: 'opposite',
  align: 'center',
  maxWidth: 560,
  maxHeight: 620,
} as const;

export const READING = {
  from: 0,
  to: 0,
  title: '',
  paragraphs: [] as const,
  terms: [] as const,
};
export const READING_SLOT = TITULAR_SLOT;
export const TERMS = [] as const;

export const CAPTION_AVOID = [
  // La placa quemada "Prof. Paola Suárez" vive abajo a la izquierda en f440–f615
  {from: 440, to: 615, bottom: 240},
] as const;

export {TRACK};

/** Un still por cada momento conceptual y cada cambio de encuadre. */
export const STILLS = [
  300,  // apertura · plató vacío · alerta 1 + video documental
  370,  // apertura · las tres alertas puestas
  500,  // docente CENTRO · placa quemada + recurso 4
  850,  // docente CENTRO · familia
  1050, // docente CENTRO · protocolo de acción
  1180, // docente IZQUIERDA · Paso 1  ← acá tiene que crecer la tarjeta
  1260, // docente IZQUIERDA · TV alertas (refuerzo, 70 %)
  1460, // docente IZQUIERDA · Paso 2
  1600, // docente IZQUIERDA · lista AGUA/GAS/ELECTRICIDAD recompuesta
  1900, // docente IZQUIERDA · levantar cosas (IA)
  2010, // docente IZQUIERDA · Paso 3
  2100, // docente IZQUIERDA · reunir familia (IA)
  2340, // docente IZQUIERDA · planta superior (IA)
  2500, // docente CENTRO · Paso 4  ← acá tiene que volver a achicarse
  2660, // docente CENTRO · vehículos recompuestos
  2800, // docente CENTRO · comunicación con emergencias
  3120, // docente CENTRO · mochila
  3300, // docente CENTRO · Paso 6
  3500, // docente CENTRO · video documental (didáctico)
  3760, // docente CENTRO · centro de evacuación
  4230, // docente CENTRO · recap de cierre completo
];

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
