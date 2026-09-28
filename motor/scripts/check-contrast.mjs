/**
 * check-contrast — la nota de la correctora, convertida en compuerta.
 *
 *   node scripts/check-contrast.mjs AMB24-01
 *
 * Marta, 26/3: "Sugiero subrayar las palabras señaladas o colocarlas en otro
 * color en lugar de usar negrita. No se notan ya que las letras son blancas y
 * el fondo claro, deben contrastar para que se lean sin inconvenientes."
 *
 * Tenía razón, y se puede medir: blanco sobre el verde del plató (#22BCA2) da
 * 2,39:1, muy por debajo del 4,5:1 mínimo de WCAG AA. Este script comprueba
 * que las combinaciones que el tema declara realmente cumplen.
 */
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {parseArgs, ROOT} from './lib/common.mjs';

const lin = (c) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};
const ratio = (a, b) => {
  const [la, lb] = [lum(a), lum(b)];
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
};

/** Distancia RGB sumada. Alcanza para "¿se distinguen estos dos tramos?". */
const rgbDist = (a, b) =>
  [1, 3, 5]
    .map((i) => Math.abs(parseInt(a.slice(i, i + 2), 16) - parseInt(b.slice(i, i + 2), 16)))
    .reduce((x, y) => x + y, 0);

/**
 * Pisos de la barra arcoíris institucional.
 *
 * No son de contraste de TEXTO —la barra no se lee, se reconoce— sino de que
 * exista como objeto: cada tramo tiene que despegarse del papel blanco de la
 * tarjeta, y los tramos vecinos tienen que distinguirse entre sí o la barra
 * deja de leerse como cuatro colores.
 *
 * Los valores salen de la paleta medida del máster, que da 1,76:1 en su tramo
 * más flojo (el ámbar) y 184 de distancia en su par más parecido (azul|verde).
 * Los pisos quedan por debajo de eso a propósito: cazan un tramo invisible o
 * dos tramos confundibles, no obligan a esta paleta en particular.
 */
const RAINBOW_MIN_VS_PAPER = 1.5;
const RAINBOW_MIN_NEIGHBOUR = 120;

const main = async () => {
  const {code} = parseArgs();
  const {THEME} = await import(pathToFileURL(path.join(ROOT, 'src/brand/ambienteTheme.ts')).href);
  const {ROLE_WINDOW, roleInWindow} = await import(
    pathToFileURL(path.join(ROOT, 'src/brand/motion.ts')).href
  );
  const c = THEME.colors;
  const min = THEME.legibility.minContrast;

  /** [tinta, fondo, para qué, mínimo] */
  const pairs = [
    [c.ink, c.paper, 'cuerpo sobre tarjeta', min],
    [c.ink, '#FFF6C4', 'término sobre resaltador amarillo', min],
    [c.accentDeep, c.paper, 'acento sobre tarjeta', 4.5],
    [c.cyanDeep, c.paper, 'kicker cian sobre tarjeta', 4.5],
    [c.inkMuted, c.paper, 'fuente bibliográfica sobre tarjeta', 4.5],
  ];

  // El scrim de subtítulos es translúcido, así que su contraste depende de lo
  // que tenga detrás. Se mide contra los DOS peores fondos del plató: el papel
  // blanco de las olas y la remera clara del profesor. Si pasa ahí, pasa en
  // todo el video.
  const over = (bg, alpha) =>
    '#' + [1, 3, 5]
      .map((i) => Math.round(parseInt(bg.slice(i, i + 2), 16) * (1 - alpha)))
      .map((v) => v.toString(16).padStart(2, '0'))
      .join('');
  const a = THEME.captions.scrimAlpha;
  const capMin = THEME.legibility.captionMinContrast;
  pairs.push(
    ['#FFFFFF', over('#FFFFFF', a), 'subtítulo sobre scrim / papel blanco', capMin],
    ['#FFFFFF', over('#D8D5CE', a), 'subtítulo sobre scrim / camisa clara', capMin],
    ['#FFFFFF', over(c.stage, a), 'subtítulo sobre scrim / plató verde', capMin],
  );

  const rows = pairs.map(([fg, bg, what, need]) => {
    const r = ratio(fg, bg);
    return {what, fg, bg, r, need, ok: r >= need};
  });

  console.log(`check-contrast · ${code ?? 'tema'}\n`);
  for (const x of rows) {
    console.log(
      `  ${x.ok ? '✓' : '✗'} ${x.what.padEnd(38)} ${x.fg} sobre ${x.bg}  ${x.r.toFixed(2)}:1 (mín ${x.need})`,
    );
  }

  // ── Barra arcoíris institucional ────────────────────────────────────────
  // Los cuatro hexes están MEDIDOS de la placa que el máster trae quemada (ver
  // THEME.rainbow). Sin esto nada impedía meter un tramo invisible sobre el
  // papel, que es justo lo que pasaba: la paleta anterior —los acentos de la
  // materia— nunca se había medido contra nada.
  const rb = THEME.rainbow;
  const rbRows = [];
  if (rb.length !== 4) {
    rbRows.push({what: `la barra tiene ${rb.length} tramos y no 4`, ok: false, detail: ''});
  }
  for (const hex of rb) {
    const r = ratio(hex, c.paper);
    rbRows.push({
      what: `tramo ${hex} sobre la tarjeta`,
      ok: r >= RAINBOW_MIN_VS_PAPER,
      detail: `${r.toFixed(2)}:1 (mín ${RAINBOW_MIN_VS_PAPER})`,
    });
  }
  // Se cierra el ciclo (último contra primero) porque la barra del máster es un
  // marquee que repite la secuencia: ahí el verde queda pegado al magenta.
  for (let i = 0; i < rb.length; i++) {
    const a = rb[i];
    const b = rb[(i + 1) % rb.length];
    const d = rgbDist(a, b);
    rbRows.push({
      what: `tramos vecinos ${a} | ${b}`,
      ok: d >= RAINBOW_MIN_NEIGHBOUR,
      detail: `distancia ${d} (mín ${RAINBOW_MIN_NEIGHBOUR})`,
    });
  }

  console.log('\n  barra arcoíris institucional');
  for (const x of rbRows) {
    console.log(`  ${x.ok ? '✓' : '✗'} ${x.what.padEnd(38)} ${x.detail}`);
  }

  // ── Cinética del tema contra §19 ────────────────────────────────────────
  // §19 da las duraciones en SEGUNDOS y el motor trabaja en frames. Tener la
  // conversión en `ROLE_WINDOW` y auditarla acá es lo que convierte al
  // documento en un test: sin esto, cada componente tiene que acordarse del
  // rango, y "acordarse" es como se llegó a tener tres distancias de entrada
  // distintas antes de `side.ts`.
  const m = THEME.motion;
  const motionRows = [
    ...Object.entries(m.roles).map(([role, v]) => ({
      what: `rol ${role}`,
      detail: `${v.frames} f (§19: ${ROLE_WINDOW[role][0]}–${ROLE_WINDOW[role][1]})`,
      ok: roleInWindow(role, v.frames),
    })),
    ...Object.entries(m.grammar).map(([g, v]) => ({
      what: `paso de ${g}`,
      detail: `${v.step} f (§19 ítems de lista: 7–10)`,
      ok: v.step >= 7 && v.step <= 10,
    })),
    {
      what: 'ken burns',
      detail: `${m.kenBurns.from}→${m.kenBurns.to} (§19: recorrido ≤ 0.06)`,
      ok: m.kenBurns.to - m.kenBurns.from <= 0.06 + 1e-9,
    },
  ];

  console.log('\n  cinética del tema contra §19');
  for (const x of motionRows) {
    console.log(`  ${x.ok ? '✓' : '✗'} ${x.what.padEnd(38)} ${x.detail}`);
  }

  // ── Acento de capítulo ──────────────────────────────────────────────────
  // El único eje propio que un capítulo puede declarar (§17). Se verifica acá y
  // no en check-layout porque check-layout ya comprueba la CONSECUENCIA
  // geométrica —que el bloque entre en su caja—; lo que falta comprobar es la
  // COHERENCIA entre lo que el capítulo dijo que iba a hacer y lo que hace.
  const accentRows = [];
  if (code) {
    const data = await import(
      pathToFileURL(path.join(ROOT, `src/episodes/${code}/data.ts`)).href
    );
    const {isFullFrame} = await import(
      pathToFileURL(path.join(ROOT, 'src/episodes/blocks.ts')).href
    );
    const techo = data.EPISODE?.intervention;
    const full = (data.BLOCKS ?? []).filter((b) => isFullFrame(b));

    accentRows.push({
      what: 'intervention declarado',
      detail: techo === undefined ? 'ausente' : `nivel ${techo}`,
      ok: [0, 1, 2, 3, 4].includes(techo),
    });

    // Hacia arriba: monta más pantalla de la que pidió.
    accentRows.push({
      what: 'coherencia hacia arriba',
      detail: full.length
        ? `${full.length} bloque(s) a cuadro completo con techo ${techo}`
        : 'sin bloques a cuadro completo',
      ok: !full.length || techo === 4,
    });

    // Hacia abajo: un techo que nadie toca es un permiso pedido de más. No es
    // cosmético: el techo es lo que le dice al motor cuánto puede crecer una
    // tarjeta, y declarar 4 sin usarlo afloja el verificador para todo el
    // capítulo.
    accentRows.push({
      what: 'coherencia hacia abajo',
      detail: techo === 4 && !full.length
        ? 'declara 4 y no monta ninguno'
        : 'el techo declarado se usa',
      ok: !(techo === 4 && !full.length),
    });

    // La compuerta del eje único. TypeScript ya impide campos extra dentro de
    // los literales de Block y EpisodeData, pero no impide que un data.ts
    // exporte un objeto de estilo suelto y que un componente hecho a mano lo
    // consuma. Esta es la única comprobación que caza eso, y existe para hacer
    // COSTOSO desviarse: §17 acota la variación de capítulo a dos ejes y uno de
    // los dos ya está derivado del máster.
    const PROHIBIDAS = [
      'MOTION', 'THEME', 'PALETTE', 'SPRINGS', 'EASE', 'RADIUS', 'STYLE', 'visualStyle',
    ];
    const coladas = PROHIBIDAS.filter((k) => k in data);
    accentRows.push({
      what: 'un solo eje de acento',
      detail: coladas.length ? `exporta ${coladas.join(', ')}` : 'sin estilo suelto exportado',
      ok: !coladas.length,
    });

    console.log(`\n  acento de capítulo · ${code}`);
    for (const x of accentRows) {
      console.log(`  ${x.ok ? '✓' : '✗'} ${x.what.padEnd(38)} ${x.detail}`);
    }
  }

  // Prueba de regresión: lo que hacía la versión anterior debe seguir fallando.
  const bad = ratio('#FFFFFF', c.stage);
  console.log(
    `\n  (referencia: blanco sobre el plató = ${bad.toFixed(2)}:1 — por eso el texto nunca va suelto sobre el fondo)`,
  );

  const failed = [...rows, ...rbRows, ...motionRows, ...accentRows].filter((x) => !x.ok);
  if (failed.length) {
    console.error(`\n✗ ${failed.length} comprobación(es) por debajo del mínimo.`);
    process.exit(1);
  }
  console.log('\n✓ todas las combinaciones del tema cumplen.');
};

main().catch((e) => { console.error(e.message); process.exit(1); });
