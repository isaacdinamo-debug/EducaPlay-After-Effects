import type {ReservedRect, Track} from '../layout/presenter.ts';
export type {ReservedRect, Track};
import type {PictoName} from './pictos.ts';

export type Caption = {from: number; to: number; text: string};

/** Zona donde la banda de subtítulos tiene que correrse para no pisar nada. */
export type CaptionAvoid = {
  from: number;
  to: number;
  bottom?: number;
  left?: number;
  right?: number;
};

export type Titular = {
  key: string;
  from: number;
  to: number;
  kicker?: string;
  title: string;
  step?: 1 | 2 | 3 | 4 | 5;
  /** Pictograma de la serie (SVG por código, se anima solo). */
  resource?: PictoName;
  /**
   * Ilustración hero dentro de public/, p. ej. "AMB24-01/planta.jpg".
   * Si está, reemplaza al pictograma y ocupa más lugar en la tarjeta.
   */
  hero?: string;
  side?: 'opposite' | 'widest' | 'left' | 'right';
};

/**
 * Rango pedagógico de un recurso. Es una decisión EDITORIAL, no un estilo:
 * de qué lado de la línea cae decide cuánta pantalla y cuánta jerarquía
 * tipográfica recibe, y eso lo elige quien monta el capítulo, no el motor.
 *
 *   'didactico' — el espectador TIENE que poder leerlo, o es evidencia real
 *                 (registro documental, la instrucción que hay que seguir).
 *                 Tarjeta completa: filete arcoíris, numeral, epígrafe, crédito.
 *   'refuerzo'  — ilustra algo que la docente ya enunció. No aporta un dato
 *                 nuevo; acompaña. Tarjeta al 70 %, sin filete ni numeral.
 *
 * Se declara por bloque. `check-layout` imprime los bloques con recurso que lo
 * omiten: un rango sin declarar es una decisión que nadie tomó.
 */
export type Rank = 'didactico' | 'refuerzo';

export type SlotSpec = {
  /**
   * 'center' es el episodio sin docente: no hay banda libre que elegir porque
   * el cuadro entero es del gráfico. Ver `isGraphicsOnly` en layout/presenter.
   */
  side: 'opposite' | 'widest' | 'center' | 'left' | 'right';
  align: 'top' | 'center' | 'bottom';
  maxWidth: number;
  maxHeight: number;
  fallback?: 'left' | 'right';
  /**
   * Permite bajar de `paperBandY`, la altura donde arrancan las olas de papel
   * blanco del plató. Sólo puede pedirlo un bloque cuyo contenido siga siendo
   * legible sobre blanco — es decir, oscuro. Una tarjeta blanca ahí desaparece.
   */
  overPaper?: boolean;
};

/** Titular de la escaleta que ocurre mientras el panel de lectura está arriba. */
export type ReadingStep = {
  step: 1 | 2 | 3 | 4 | 5;
  title: string;
  from: number;
  to: number;
};

/**
 * Bloque gráfico del capítulo.
 *
 * Unión discriminada, y no un componente por escena, para que `<Episode>` siga
 * siendo UNA fábrica para toda la materia: un capítulo nuevo declara sus
 * bloques y no escribe JSX.
 *
 * Los tipos salen de lo que la escaleta de AMB24-01 pide de verdad — titular,
 * foto documental, tira de evidencias, GIF, hoja del concepto y placa — no de
 * un catálogo inventado por adelantado.
 */
export type Block =
  | {
      kind: 'titular';
      key: string;
      from: number;
      to: number;
      slot?: Partial<SlotSpec>;
      /**
       * Default `'didactico'`: un titular ES la instrucción. Se declara igual
       * que en los bloques con recurso para que la barra arcoíris derive del
       * rango en TODAS las tarjetas y no de qué componente le tocó.
       */
      rank?: Rank;
      kicker?: string;
      title: string;
      /**
       * Número del paso dentro de un protocolo enumerado. Se dibuja como
       * numeral display detrás del antetítulo — es textura, no un dato para
       * leer: lo que hay que leer lo dice el kicker, que sí cumple contraste.
       */
      step?: number;
      /**
       * Pastillas (modo vivo de AE): lo que la docente ENUMERA mientras está
       * el titular y no aparece en pantalla. Cada una entra en su `at` (frame
       * absoluto, resuelto contra cues.ts) y la tarjeta crece para hacerles
       * lugar, así que el slot del titular tiene que declarar el alto final.
       * Texto corto: es un recordatorio, no un subtítulo.
       */
      chips?: readonly {text: string; at: number}[];
    }
  | {
      kind: 'photo';
      key: string;
      from: number;
      to: number;
      slot?: Partial<SlotSpec>;
      rank?: Rank;
      src: string;
      caption?: string;
      credit?: string;
      imageHeight?: number;
      /**
       * 'cover' (default) recorta para llenar la caja: es lo correcto para una
       * foto o una escena. 'contain' entra completa: es lo correcto para una
       * ilustración plana, donde el recorte le come la cabeza a las figuras.
       */
      fit?: 'cover' | 'contain';
      /**
       * A sangre: el recurso ocupa el cuadro entero, sin tarjeta ni slot.
       *
       * Un capítulo sin docente necesita al menos un plano así o se lee como
       * una tarjeta flotando sobre un fondo vacío. No pasa por <Slot> —igual
       * que `plate`— porque no ocupa una banda libre: ocupa todo. El epígrafe
       * y el crédito sí respetan la zona segura, y un degradado del verde del
       * plató les da el contraste que el recurso no garantiza.
       */
      bleed?: boolean;
      /**
       * Frame ABSOLUTO en que entra el epígrafe de un bloque a sangre.
       *
       * Se declara aparte de `from` porque el plano y su rótulo no entran
       * juntos: el plano abre la escena y el epígrafe llega sobre la palabra
       * que lo nombra. Por omisión, con el plano.
       */
      captionAt?: number;
    }
  | {
      kind: 'video';
      key: string;
      from: number;
      to: number;
      slot?: Partial<SlotSpec>;
      rank?: Rank;
      src: string;
      caption?: string;
      credit?: string;
      videoHeight?: number;
      /**
       * A sangre: el recurso ocupa el cuadro entero, sin tarjeta ni slot.
       *
       * Un capítulo sin docente necesita al menos un plano así o se lee como
       * una tarjeta flotando sobre un fondo vacío. No pasa por <Slot> —igual
       * que `plate`— porque no ocupa una banda libre: ocupa todo. El epígrafe
       * y el crédito sí respetan la zona segura, y un degradado del verde del
       * plató les da el contraste que el recurso no garantiza.
       */
      bleed?: boolean;
      /**
       * Frame ABSOLUTO en que entra el epígrafe de un bloque a sangre.
       *
       * Se declara aparte de `from` porque el plano y su rótulo no entran
       * juntos: el plano abre la escena y el epígrafe llega sobre la palabra
       * que lo nombra. Por omisión, con el plano.
       */
      captionAt?: number;
    }
  | {
      kind: 'evidence';
      key: string;
      from: number;
      to: number;
      slot?: Partial<SlotSpec>;
      rank?: Rank;
      items: readonly {src: string; label: string; at: number}[];
    }
  | {
      kind: 'gif';
      key: string;
      from: number;
      to: number;
      slot?: Partial<SlotSpec>;
      rank?: Rank;
      src: string;
      label?: string;
    }
  | {
      kind: 'definition';
      key: string;
      from: number;
      to: number;
      slot?: Partial<SlotSpec>;
      /** Default `'didactico'`: es el mismo rango editorial que `checklist`. */
      rank?: Rank;
      kicker?: string;
      text: string;
      source?: string;
      /** Frames que dura la locución completa. */
      revealFrames: number;
      emphasis?: readonly string[];
    }
  | {
      /**
       * Lista de instrucciones recompuesta como TEXTO NATIVO.
       *
       * Existe porque dos recursos de AMB26-04 llegaron como texto dentro de
       * una imagen —la tríada LUZ/GAS/AGUA y los tres vehículos prohibidos— y
       * a la escala de la tarjeta su tipografía quedaba en ~10 px efectivos.
       * Un recurso ilegible es peor que no ponerlo, así que el contenido se
       * vuelve a componer con la tipografía del sistema y cada ítem entra
       * sobre SU palabra, como la tira de evidencias.
       */
      kind: 'checklist';
      key: string;
      from: number;
      to: number;
      slot?: Partial<SlotSpec>;
      rank?: Rank;
      kicker?: string;
      title?: string;
      /** Cada ítem entra sobre su palabra. check-layout valida cada `at`. */
      items: readonly {
        /** Opcional: una recapitulación es sólo texto y no necesita pictograma. */
        icon?: PictoName;
        term: string;
        detail?: string;
        at: number;
        /** Anillo de prohibición sobre el pictograma. */
        forbidden?: boolean;
      }[];
      /** Salvedad al pie: la condición que la instrucción no puede perder. */
      note?: string;
    }
  | {
      kind: 'sheet';
      key: string;
      from: number;
      to: number;
      slot?: Partial<SlotSpec>;
      src: string;
      /** Frames que dura la revelación. Debe cubrir lo que dura la locución. */
      revealFrames: number;
    }
  | {
      /**
       * Cierre de serie: el recap y la consigna con que termina el capítulo.
       *
       * Es el patrón más frecuente del catálogo —las 24 piezas inventariadas
       * terminan así— y el único que no tenía componente. Nombra `items` a sus
       * ejes, como toda tira del motor, para heredar la comprobación de
       * `check-layout`: cada eje encendido el mínimo y su `at` dentro del
       * bloque.
       */
      kind: 'outro';
      key: string;
      from: number;
      to: number;
      slot?: Partial<SlotSpec>;
      kicker?: string;
      title: string;
      /** Consigna o llamada a la acción, al pie. */
      cta?: string;
      items?: readonly {label: string; at: number}[];
    }
  | {
      /**
       * Concepto clave: un término que el capítulo quiere que quede, con su
       * glosa. Viene de la `ConceptCard` del corte AMB26-02 ("Protección de
       * humedales → esponja natural"), rehecha sobre `<Slot>` y la escalera
       * tipográfica: allá era una tarjeta de ancho fijo con antetítulo a 18 px.
       *
       * No es un `definition`: aquélla revela un párrafo al ritmo de la
       * locución; ésta nombra UNA idea y la subraya.
       */
      kind: 'concepto';
      key: string;
      from: number;
      to: number;
      slot?: Partial<SlotSpec>;
      rank?: Rank;
      /** Default "Concepto clave". */
      kicker?: string;
      title: string;
      /** El término que se resalta (fondo amarillo + tinta + subrayado). */
      term: string;
      gloss?: string;
    }
  | {
      /**
       * Advertencia corta: una sola frase que no se puede perder ("Nunca
       * cruces una calle anegada"). Viene de `AlertPill`; allá el ícono era un
       * emoji, que depende de la fuente de la máquina que renderiza. Acá es un
       * pictograma dibujado por código.
       */
      kind: 'alerta';
      key: string;
      from: number;
      to: number;
      slot?: Partial<SlotSpec>;
      rank?: Rank;
      text: string;
      /** Default `'alerta'`. */
      icon?: PictoName;
    }
  | {
      /**
       * Relación en dos tiempos: la parte A queda y la B llega sobre su
       * palabra ("Impacto humano + El Niño → tormentas extremas"). Viene de la
       * `FormulaTitularCard` de EEF002, que la dibujaba con un borde de un solo
       * color —el que prohíbe la guía de marca— y la parte B en cian sobre
       * blanco (2,6:1).
       */
      kind: 'formula';
      key: string;
      from: number;
      to: number;
      slot?: Partial<SlotSpec>;
      rank?: Rank;
      kicker?: string;
      partA: string;
      partB: string;
      /** Frame ABSOLUTO en que entra la parte B. check-layout lo valida. */
      at: number;
    }
  | {
      /**
       * Frases que se acumulan una debajo de otra, cada una sobre su palabra.
       * Viene de la `MultiTitularCard` de EEF002. Nombra `items`/`label`/`at`
       * como toda tira del motor para heredar la comprobación de
       * `check-layout`: cada ítem encendido el mínimo y su `at` dentro del
       * bloque.
       */
      kind: 'secuencia';
      key: string;
      from: number;
      to: number;
      slot?: Partial<SlotSpec>;
      rank?: Rank;
      kicker?: string;
      items: readonly {label: string; at: number}[];
    }
  | {
      /**
       * Placa a cuadro completo. NO pide slot: es la excepción declarada del
       * sistema, para un momento en que no hay banda libre. Ver TermPlate.tsx.
       */
      kind: 'plate';
      key: string;
      from: number;
      to: number;
      kicker?: string;
      term: string;
      gloss: string;
    };

/**
 * Contrato que tiene que cumplir el data.ts de un episodio.
 *
 * Todo lo que varía entre episodios vive acá; el componente <Episode> es el
 * mismo para todos. Un episodio nuevo NO duplica JSX.
 */
export type EpisodeData = {
  FPS: number;
  DURATION: number;
  EPISODE: {
    id: string;
    title: string;
    series: string;
    objective?: string;
    master: string;
    /**
     * Máster del formato 9:16, si el episodio se emite también en vertical.
     *
     * No es un recorte en tiempo de render: es un archivo aparte, generado con
     * `scripts/plate-vertical.mjs`, con el MISMO audio sin recodificar. Así los
     * dos formatos no pueden desincronizarse ni diferir en loudness.
     *
     * Su presencia es lo que hace que `Root.tsx` registre las composiciones
     * verticales del episodio. Sólo tiene sentido en episodios sin docente:
     * ver `adaptTrack` en `layout/presenter.ts`.
     */
    masterVertical?: string;
    /**
     * Ganancia LINEAL sobre el audio del máster. 1 = sin tocar.
     *
     * Se usa ganancia y no compresión mientras haya margen de pico: es
     * transparente y reversible. Si hiciera falta comprimir, ecualizar o
     * relocutar, eso es una decisión editorial, no un número en un archivo.
     */
    voiceGain?: number;
    /**
     * Techo de nivel de intervención del capítulo (§10.F). Es el ÚNICO acento
     * propio que un capítulo puede declarar.
     *
     *   0  no intervenir          3  composición alrededor de la docente
     *   1  énfasis tipográfico    4  recurso a pantalla completa
     *   2  componente al lado
     *
     * Por qué éste y no otro. §17 acota la variación por capítulo a dos ejes, y
     * el otro —modo A/B— YA está derivado: `isGraphicsOnly(track)` lo decide
     * midiendo el máster, así que declararlo sería poder contradecir al máster,
     * que es justo lo que el motor existe para impedir. El nivel de
     * intervención, en cambio, hoy no lo gobierna nada: `check-layout` imprime
     * "⚠ n placa(s) a cuadro completo" y no hay regla detrás.
     *
     * No puede producir una violación de §3.6 ("consistencia antes que
     * novedad") ni de §6 ("transiciones distintas en cada escena") porque no
     * toca color, tipografía, resortes, curvas ni gramática: sólo dice CUÁNTA
     * PANTALLA puede tomar el capítulo. Es un potenciómetro sobre el mismo
     * vocabulario, no vocabulario nuevo.
     *
     * No tiene default a propósito. Un techo sin declarar es una decisión que
     * no tomó nadie — el mismo criterio con el que `check-layout` reporta los
     * bloques con recurso que omiten `rank`. `check-contrast` lo exige, y
     * verifica que el capítulo no monte un bloque a cuadro completo con un
     * techo menor a 4, ni declare 4 sin usar ninguno.
     */
    intervention: 0 | 1 | 2 | 3 | 4;
  };
  TRACK: Track;
  RESERVED: ReservedRect[];
  MARKS: Record<string, number>;
  /**
   * Bloques del capítulo. Es la vía principal para una materia nueva; los
   * campos TITULARES/READING/CARDS/MAPPING/CHIPS de abajo son el contrato
   * heredado de la serie Leo y siguen funcionando.
   */
  BLOCKS?: readonly Block[];
  /**
   * Rangos donde el subtítulo NO se dibuja. La escaleta de AMB24-01 lo pide
   * dos veces y por escrito: el concepto de ambiente "no debe figurar en los
   * subtítulos" (ya se lee en la hoja) y tampoco la pregunta socio-histórica
   * (ya ocupa el titular). Duplicar en subtítulo un texto que está en pantalla
   * obliga a leer dos veces lo mismo.
   */
  CAPTION_MUTE?: readonly {from: number; to: number; why: string}[];
  TITULARES: readonly Titular[];
  TITULAR_SLOT: SlotSpec;
  READING_SLOT: SlotSpec;
  CARDS_SLOT?: SlotSpec;
  MAPPING_SLOT?: SlotSpec;
  CHIPS_SLOT?: SlotSpec;
  READING: {
    from: number;
    to: number;
    kicker?: string;
    title: string;
    paragraphs: readonly string[];
    source?: string;
    /** Frame de la palabra "pausá" en el audio; la pastilla entra ahí. */
    pauseAt?: number;
    /** 26 px entra en el slot estándar. Bajar si el texto es más largo. */
    fontSize?: number;
    /** Recurso gráfico que acompaña al texto. */
    icon?: PictoName;
    /** Titulares que caen dentro de la vida del panel; van en su banda de pie. */
    steps?: readonly ReadingStep[];
    terms: readonly {token: string; at: number}[];
  };
  TERMS: readonly {word: string; definition: string}[];
  CAPTIONS: Caption[];
  /** Dónde NO puede quedarse la banda de subtítulos. La verifica check-layout. */
  CAPTION_AVOID?: readonly CaptionAvoid[];
  /**
   * Hasta dónde llega de verdad el panel de lectura, contando su banda de pie,
   * que cuelga por debajo de la caja del slot. Medido sobre la capa alpha.
   */
  READING_FOOT_Y?: number;
  STILLS: number[];
  /** Bloque de fichas: cuándo entran y cuándo se dan vuelta. */
  CARDS?: {from: number; to: number; flipAt: number};
  /**
   * Bloque "como se dice" → "cómo se llama". La escaleta lo pide como par de
   * filas, no como titular suelto.
   */
  MAPPING?: {
    from: number;
    to: number;
    kicker?: string;
    resource?: PictoName;
    hero?: string;
    rows: readonly {plain: string; term: string; at: number}[];
  };
  /** Pastillas que entran sobre la palabra dicha. */
  CHIPS?: {
    from: number;
    to: number;
    chips: readonly {label: string; at: number}[];
  };
};
