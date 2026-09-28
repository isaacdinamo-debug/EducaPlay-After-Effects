/**
 * Contrato de cinética del sistema.
 *
 * Este archivo NO contiene valores de ninguna materia: contiene los invariantes
 * de marca —los roles de §19 y las gramáticas de §5— y la ventana admisible de
 * cada rol. Los valores concretos viven en `THEME.motion` de cada materia.
 *
 * Existe por un problema medido, no por prolijidad: el Motion Design System
 * §9 prescribe una cinética DISTINTA por materia —Ambiental "orgánico, continuo
 * y conectado", Economía "preciso, estructurado y limpio"— y hoy los cinco
 * resortes, los tres radios, los tres trazos y los ocho umbrales de legibilidad
 * son BYTE-IDÉNTICOS entre Leo, Ambiente y Matemática. La variación por materia
 * se colapsó a color. Un contrato tipado es lo que hace que la próxima materia
 * tenga que decidir su movimiento en vez de heredarlo por descuido.
 *
 * Sin JSX a propósito, igual que `episodes/blocks.ts`: lo importa el tema, lo
 * importan los componentes, y lo importa `check-contrast.mjs`, que corre con
 * `--experimental-strip-types` y no sabe leer `.tsx`.
 */

/**
 * Las ocho acciones que §19 cronometra. Son roles EDITORIALES, no nombres de
 * componente: un `titulo` es un título lo dibuje quien lo dibuje.
 */
export type Role =
  | 'marca'
  | 'filete'
  | 'titulo'
  | 'bajada'
  | 'recurso'
  | 'item'
  | 'barrido'
  | 'salida';

/**
 * Ventanas de §19 traducidas a frames a 25 fps, redondeando hacia adentro.
 *
 * El documento las da en segundos y el motor trabaja en frames; tener la
 * conversión escrita UNA vez es lo que permite que `check-contrast` audite el
 * tema en vez de que cada componente se acuerde del rango. Los extremos son
 * inclusivos.
 *
 *   marca    0,45–0,65 s      filete   0,6–1,2 s
 *   titulo   0,8–1,35 s       bajada   0,6–1,0 s
 *   recurso  0,9–1,45 s       item     0,28–0,4 s
 *   barrido  0,9–1,2 s        salida   0,5–0,75 s
 */
export const ROLE_WINDOW: Record<Role, readonly [number, number]> = {
  marca: [11, 16],
  filete: [15, 30],
  titulo: [20, 34],
  bajada: [15, 25],
  recurso: [22, 36],
  item: [7, 10],
  barrido: [22, 30],
  salida: [12, 18],
} as const;

/**
 * Las operaciones cognitivas que §5 distingue.
 *
 * Es la bisagra del sistema: el `data.ts` declara QUÉ ES un bloque (su `kind`)
 * y el motor deriva CÓMO SE MUEVE pasando por acá. Nadie elige la cinética,
 * igual que nadie elige el registro tipográfico —`scaleFor(width)` en
 * `brand/scale.ts` lo deriva del ancho— y por la misma razón: una decisión que
 * se puede tomar dos veces se toma distinto las dos veces.
 */
export type Grammar =
  | 'concepto'
  | 'definicion'
  | 'enumeracion'
  | 'comparacion'
  | 'causa'
  | 'cronologia'
  | 'dato'
  | 'sintesis';

/** Cómo aparecen los sub-elementos de un grupo. */
export type Verb =
  | 'cascada'
  | 'simultaneo'
  | 'progresivo'
  | 'trazo'
  | 'conteo'
  | 'reduccion';

/** Por dónde entra un elemento. Es la firma cinética de la materia. */
export type Path = 'slide' | 'rise' | 'mask' | 'grow' | 'trace';

/** Cómo se encadena un bloque con el siguiente. */
export type Link = 'encadenado' | 'corte';

/** Duración y recorrido de un rol. `travel` en px sobre el lienzo lógico. */
export type RoleMotion = {frames: number; travel: number};

export type GrammarMotion = {
  verb: Verb;
  /** Desfase entre sub-elementos, en frames. §19 lo acota a 7–10. */
  step: number;
  path: Path;
  link: Link;
};

export type SpringConfig = {damping: number; mass: number; stiffness: number};

/**
 * Lo que cada materia tiene que llenar.
 *
 * Los resortes se nombran por el ROL que cumplen y no por la sensación que dan
 * —`cardEntry`, no `bouncy`—. El aporte viene de `Historia/src/brand/
 * themeEconomia.ts`, el único tema del repositorio con ejes más allá del color,
 * y la razón es práctica: `bouncy` describe un rebote, y §19 pide
 * "amortiguamiento alto, sin sobrepaso visible". Un nombre que describe la
 * forma invita a elegirlo por la forma.
 */
export type MotionContract = {
  roles: Record<Role, RoleMotion>;
  springs: {
    cardEntry: SpringConfig;
    itemPop: SpringConfig;
    headerEntry: SpringConfig;
    reframe: SpringConfig;
  };
  grammar: Record<Grammar, GrammarMotion>;
  /** §19: escala máxima 1,02→1,08 y desplazamiento menor al 1 %. */
  kenBurns: {from: number; to: number; pan: number};
  /**
   * Separadores de número. Existe porque `toLocaleString` e `Intl.NumberFormat`
   * dependen de los datos ICU compilados en el binario del renderer: dos
   * máquinas rinden el mismo frame distinto y nadie se entera hasta comparar.
   */
  number: {group: string; decimal: string};
  /** Coeficientes bézier de §19: entrada y simétrica. */
  ease: {
    out: readonly [number, number, number, number];
    inOut: readonly [number, number, number, number];
  };
};

/** ¿El valor de un rol cae dentro de su ventana de §19? */
export const roleInWindow = (role: Role, frames: number): boolean => {
  const [min, max] = ROLE_WINDOW[role];
  return frames >= min && frames <= max;
};

/**
 * Formateo de números determinista.
 *
 * Entero o con los decimales que se pidan; sin `Intl`, sin `toLocaleString` y
 * sin depender del locale del proceso.
 */
export const formatNumber = (
  value: number,
  {group, decimal}: {group: string; decimal: string},
  decimals = 0,
): string => {
  const fixed = Math.abs(value).toFixed(decimals);
  const [int, frac] = fixed.split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, group);
  const sign = value < 0 ? '-' : '';
  return frac ? `${sign}${grouped}${decimal}${frac}` : `${sign}${grouped}`;
};
