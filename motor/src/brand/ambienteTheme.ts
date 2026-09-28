/**
 * Tema de Educación Ambiental Integral — EducaPlay Secundaria.
 *
 * Portado de `Leo Comprendo y Aprendo/remotion/src/brand/leoTheme.ts`. Mismas
 * claves, mismo contrato: el motor de layout no sabe de qué materia se trata.
 *
 * Los colores del plató NO son inventados: salen de muestrear AMB24-01.mp4
 * (24 cuadros repartidos, histograma en 5 bits por canal). El plató de esta
 * materia es verde menta con textura de hojas, y ocupa el 46 % del cuadro:
 *
 *     23,07 %  #22BCA2   plató, tono dominante
 *     23,23 %  #1EB499   plató, variación de la textura
 *      1,22 %  #159C82   line-art y sombreado
 *      2,27 %  #FEFFFF   papel blanco de las esquinas rasgadas
 *
 * No hay Verde Estuario ni símbolo "Entorno": eran propuestas sin aprobar del
 * ciclo de agosto. El acento `#10BA1B` sí viene aprobado, de
 * `ARQUITECTURA_MARCA_EDUCAPLAY.md` §2.
 */

import type {MotionContract} from './motion.ts';

export type Rect = readonly [x: number, y: number, w: number, h: number];

/**
 * Cinética de Educación Ambiental Integral.
 *
 * §9.3 le pide a esta materia un movimiento "orgánico, continuo y conectado".
 * Eso no es una metáfora suelta: se traduce en dos decisiones que la separan de
 * las demás materias. Los elementos CRECEN (`path: 'grow'`) en vez de entrar
 * deslizándose, y cada bloque se ENCADENA con el siguiente (`link:
 * 'encadenado'`) en vez de cortar. Economía, con su "preciso, estructurado y
 * limpio" de §9.2, llenaría esta misma tabla con `path: 'mask'` y `link:
 * 'corte'`.
 *
 * Los valores de `roles` caen todos dentro de las ventanas de §19 —lo verifica
 * `check-contrast`— y están elegidos para coincidir con lo que los componentes
 * ya montados hacen hoy: el filete de `Titular` crece en 20 frames, el
 * encadenado entre bloques es de 14.
 *
 * Todavía NO los consume nadie. Se introducen sin consumirse para que el
 * baseline de stills quede idéntico POR CONSTRUCCIÓN y no por revisión; cada
 * componente migra después, y sólo si su literal ya coincide con el token.
 */
const MOTION = {
  roles: {
    marca: {frames: 14, travel: 0},
    filete: {frames: 20, travel: 0},
    titulo: {frames: 26, travel: 24},
    bajada: {frames: 20, travel: 14},
    recurso: {frames: 28, travel: 44},
    item: {frames: 8, travel: 28},
    barrido: {frames: 26, travel: 0},
    salida: {frames: 14, travel: 0},
  },

  /**
   * Resortes nombrados por el ROL que cumplen, no por la sensación que dan.
   *
   * `cardEntry`, `headerEntry` y `reframe` son los valores exactos de
   * `springs.smooth`, `.slow` y `.reframe`: migrar un componente a ellos no
   * mueve un píxel.
   *
   * `itemPop` es la única divergencia, y es deliberada. El equivalente por
   * forma sería `springs.bouncy` {10, 0.5, 140}, que con esos números está
   * subamortiguado y rebota — justo lo que §19 prohíbe ("amortiguamiento alto,
   * sin sobrepaso visible"). Se puede corregir sin riesgo porque los dos únicos
   * consumidores de `bouncy` son `Chips` y `TermCard`, y ningún `data.ts` de
   * esta materia declara `CHIPS` ni `CARDS`: no se montan nunca. `bouncy` queda
   * intacto en `springs` para no romper el contrato con el que Leo va a portar.
   */
  springs: {
    cardEntry: {damping: 14, mass: 0.7, stiffness: 110},
    itemPop: {damping: 18, mass: 0.6, stiffness: 130},
    headerEntry: {damping: 20, mass: 1, stiffness: 80},
    reframe: {damping: 200, mass: 1, stiffness: 120},
  },

  grammar: {
    concepto: {verb: 'simultaneo', step: 8, path: 'rise', link: 'encadenado'},
    definicion: {verb: 'progresivo', step: 8, path: 'mask', link: 'encadenado'},
    enumeracion: {verb: 'cascada', step: 8, path: 'grow', link: 'encadenado'},
    comparacion: {verb: 'simultaneo', step: 8, path: 'rise', link: 'encadenado'},
    causa: {verb: 'progresivo', step: 8, path: 'grow', link: 'encadenado'},
    cronologia: {verb: 'progresivo', step: 8, path: 'trace', link: 'encadenado'},
    dato: {verb: 'conteo', step: 8, path: 'grow', link: 'encadenado'},
    sintesis: {verb: 'reduccion', step: 8, path: 'rise', link: 'encadenado'},
  },

  /** §19: escala máxima 1,02→1,08, desplazamiento menor al 1 %. */
  kenBurns: {from: 1.02, to: 1.08, pan: 0.01},

  /** Castellano rioplatense. Nunca `Intl`: ver el comentario en motion.ts. */
  number: {group: '.', decimal: ','},

  ease: {
    out: [0.25, 1, 0.5, 1],
    inOut: [0.65, 0, 0.35, 1],
  },
} as const satisfies MotionContract;

export const THEME = {
  motion: MOTION,

  colors: {
    // --- Plató (medidos del máster; no se pintan, se usan para armonizar) ---
    stage: '#22BCA2',
    stageAlt: '#1EB499',
    stageDeep: '#159C82',
    stageLine: '#14A48A',

    // --- Superficies ---
    paper: '#FFFFFF',
    paperWarm: '#F7FFFC',

    // --- Tinta. Verde-negra, no neutra: sobre un plató verde una tinta fría
    //     se ve sucia, igual que a Leo le pasaba con el negro sobre lila.
    //     15,1:1 sobre papel blanco. ---
    ink: '#0C2B24',
    inkSoft: '#2F5B4F',
    inkMuted: '#5A7D72',

    // --- Acentos ---
    // #10BA1B es el verde aprobado de la materia, pero sobre blanco da 2,60:1:
    // sirve como rail, subrayado y chip, NUNCA como color de texto. Para texto
    // está accentDeep, que llega a 8,6:1.
    accent: '#10BA1B',
    accentDeep: '#06590D',
    cyan: '#24CCF0',
    cyanDeep: '#0E7F9B',
    yellow: '#F0CC24',
    yellowWash: 'rgba(240, 204, 36, 0.55)',
    magenta: '#E40054',
    magentaDeep: '#A8003E',
  },

  /**
   * Banda de subtítulos. Scrim negro translúcido, no pastilla opaca.
   *
   * El peor fondo de AMB24-01 es la esquina de papel blanco abajo a la
   * derecha, que la banda de subtítulos sí toca. check-contrast compone el
   * scrim sobre ese blanco y falla si no llega a 4,5:1.
   */
  captions: {
    scrim: 'rgba(0, 0, 0, 0.55)',
    scrimAlpha: 0.55,
    fontSize: 34,
    bottom: 64,
    maxWidth: 1360,
    maxHeight: 178,
    /**
     * Forma de la pastilla — `subtitulos/EDUCAPLAY_MOTION_GRAPHICS_ACTUALIZADO.md`
     * §1.4, adoptada el 25/9/2026 salvo el COLOR: el documento pide la tinta
     * #07202C al 55 %, que sobre el papel blanco del plató da 3,84:1 y no pasa
     * el piso de 4,5. El scrim sigue siendo el negro de arriba (4,76:1).
     *
     * Plano y uniforme: sin degradados ni brillos especulares (el documento lo
     * prohíbe expresamente). El único "brillo" es el filete interior de 1 px.
     *
     * Viven acá y no en el componente porque check-layout mide cada subtítulo
     * con `padX`, `lineHeight` y `maxLines`: render y verificador leen el mismo
     * número o comprueban cajas distintas.
     */
    pill: {
      radius: 20,
      padY: 14,
      padX: 34,
      blur: 10,
      border: '1px solid rgba(255, 255, 255, 0.16)',
      shadow: '0 8px 32px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
      /** Museo Sans 700: en este proyecto, la Rounded 700 (`fonts.bodyBold`). */
      fontFile: 'MuseoSansRounded700.otf',
      textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)',
      lineHeight: 1.32,
      /** Regla inflexible del documento: nunca más de dos líneas. */
      maxLines: 2,
    },
  },

  /**
   * Arcoíris institucional EducaPlay — MUESTREADO de la placa quemada.
   *
   * Hasta 2026-09-07 esto eran los cuatro acentos de la materia (`magenta`,
   * `yellow`, `cyan`, `accent`) y el comentario de `scale.ts` afirmaba que
   * reproducían la barra del máster. No era cierto: nadie la había medido, y en
   * los planos de la placa de nombre (f440–f615) convivían DOS arcoíris.
   *
   * Estos valores salen de promediar los tramos de la barra quemada sobre la
   * placa "Prof. Paola Suárez" en cuatro stills —f460, f500, f520, f580—, banda
   * `y 895–901`, descartando 18 px de cada borde. La dispersión entre frames es
   * de 4 puntos por canal como mucho.
   *
   *     #E41653  magenta   4,63:1 sobre papel blanco
   *     #FAB817  ámbar     1,76:1   ← el tramo más flojo del juego
   *     #35BAD5  azul      2,30:1
   *     #3CAA34  verde     3,00:1
   *
   * Se muestrea de un STILL DE REMOTION y no con `ffmpeg -pix_fmt rgb24`: los
   * dos decodifican este máster distinto —el plató da #1EB79B en el still y
   * #2DC99D por ffmpeg, sobre el MISMO frame— y el still es el espacio donde
   * nuestro CSS se compone con el video. Muestrear con ffmpeg mete unos 20
   * puntos por canal de desvío y la barra no matchea.
   *
   * OJO: la barra del máster es un MARQUEE que se desplaza en horizontal, con
   * tramos separados por huecos de ~10 px que repiten la secuencia más allá de
   * cuatro. Copiamos la PALETA y el orden, no la estructura: la nuestra es una
   * cabecera continua y quieta de cuatro cuartos, que es el idioma de tarjeta
   * del sistema. Es una divergencia declarada, no un olvido.
   *
   * El orden es el del máster leído de izquierda a derecha. `check-contrast`
   * verifica que los cuatro tramos se vean sobre el papel y entre sí.
   */
  rainbow: ['#E41653', '#FAB817', '#35BAD5', '#3CAA34'] as const,

  fonts: {
    heading: '"Museo-700", "Museo", Georgia, serif',
    body: '"MuseoSansRounded-500", "MuseoSans-500", "Helvetica Neue", Arial, sans-serif',
    bodyBold: '"MuseoSansRounded-700", "MuseoSans-700", "Helvetica Neue", Arial, sans-serif',
    display: '"MuseoSansRounded-900", "MuseoSans-700", Arial, sans-serif',
  },

  springs: {
    smooth: {damping: 14, mass: 0.7, stiffness: 110},
    bouncy: {damping: 10, mass: 0.5, stiffness: 140},
    slow: {damping: 20, mass: 1, stiffness: 80},
    snap: {damping: 200, mass: 0.6, stiffness: 200},
    reframe: {damping: 200, mass: 1, stiffness: 120},
  },

  radius: {pill: 999, card: 24, chip: 12},

  /** Sombras verdes, no negras: el plató es verde y una sombra neutra ensucia. */
  shadow: {
    soft: '0 8px 22px rgba(8, 48, 40, 0.10)',
    card: '0 18px 44px rgba(8, 48, 40, 0.16), 0 4px 12px rgba(8, 48, 40, 0.08)',
    lift: '0 32px 72px rgba(8, 48, 40, 0.22)',
  },

  stroke: {thin: 3, regular: 5, bold: 8},

  layout: {
    safe: {top: 56, right: 56, bottom: 72, left: 56},

    /**
     * Marca de agua "Educaplay / ED. AMBIENTAL" quemada arriba a la derecha.
     * Incluye el ícono de reciclaje (desde x=1320) hasta el texto y bajotítulo (hasta y=236),
     * con margen generoso de protección [1300, 0, 620, 260].
     */
    watermark: [1300, 0, 620, 260] as Rect,

    /**
     * Abajo a la derecha empieza la esquina de papel blanco rasgado, medida en
     * [1414, 934, 503, 146]. Una tarjeta blanca ahí desaparece.
     *
     * OJO — en Leo esto era una banda que cruzaba todo el ancho. Acá el papel
     * son DOS esquinas, y la de arriba a la izquierda cae dentro de la columna
     * de gráficos: se declara como rect reservado en el data.ts del episodio,
     * igual que Leo declaraba su placa de nombre.
     */
    paperBandY: 934,

    /**
     * Techo de la banda de subtítulos: 1080 − bottom(64) − maxHeight(178).
     * Ningún gráfico baja de acá. Se escribe derivado y no como número suelto
     * para que mover los subtítulos no deje los slots desincronizados.
     */
    captionBandY: 1080 - 64 - 178,

    defaultFraming: 'center' as const,
    slotPad: 48,
  },

  /**
   * Reglas de legibilidad. Heredadas de la corrección de la correctora en la
   * serie Leo (Marta, 26/3) y verificadas contra ESTE plató:
   * blanco sobre el verde menta da 2,39:1, todavía peor que el 4,5:1 mínimo.
   * Por eso no hay texto suelto sobre el fondo en ningún lado.
   */
  legibility: {
    surfaceMinOpacity: 0.94,
    emphasis: 'underline+color' as const,
    minTermFrames: 50,
    panelHoldFrames: 75,
    minTitularFrames: 60,
    captionMinContrast: 4.5,
    bodyMinPx: 26,
    minContrast: 7,
  },
} as const;

export type AmbienteTheme = typeof THEME;
