/**
 * check-layout — invariantes geométricas del layout engine.
 *
 *   node --experimental-strip-types scripts/check-layout.mjs AMB24-01
 *   node --experimental-strip-types scripts/check-layout.mjs AMB26-04-SHORT --format=v
 *
 * Llama a la resolveSlot() DE PRODUCCIÓN, no a una copia, y usa el bbox CRUDO
 * por frame (más estricto que los segmentos suavizados que consume el render).
 *
 * Lo que afirma, para cada bloque y cada frame de su vida:
 *   · no toca al profesor (con margen)
 *   · no toca la marca de agua ni la placa de nombre quemadas
 *   · no baja de la banda de olas de papel blanco
 *   · no queda más angosto que un mínimo legible
 * y, sobre los datos del episodio:
 *   · cada titular dura lo suficiente para leerse
 *   · cada término resaltado queda encendido ≥2 s
 *   · el panel de lectura está quieto ≥3 s antes del primer resaltado
 */
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {episodeDir, fmtFrame, parseArgs, ROOT, trackerOpts} from './lib/common.mjs';

const MARGIN = 24;      // aire mínimo exigido contra la silueta
const MIN_WIDTH = 380;  // por debajo de esto una tarjeta no es legible

/**
 * Solape máximo que se acepta como ENCADENADO entre dos bloques consecutivos.
 *
 * Los componentes se desvanecen en los últimos 12-14 frames de su Sequence
 * (`useInOut`). Si dos bloques se tocan justo, el que sale ya está en 0 cuando
 * el que entra todavía no arrancó, y el cuadro parpadea. Solapar el tiempo de
 * ese desvanecido es la coreografía correcta, no un error.
 *
 * Sólo cuenta como encadenado si el solape ES la cola de uno y la cabeza del
 * otro. Un bloque contenido dentro de otro sigue siendo el modo de falla que
 * este chequeo existe para cazar, dure lo que dure.
 */
const CROSSFADE = 16;

const load = (rel) => import(pathToFileURL(path.join(ROOT, rel)).href);

const main = async () => {
  const {flags, code} = parseArgs();
  if (!code) throw new Error('Uso: node --experimental-strip-types scripts/check-layout.mjs <CODE> [--format=h|v]');

  const {resolveSlot, subjectInRange, reservedAt, blockRequest, adaptTrack, reservedForFormat} =
    await load('src/layout/presenter.ts');
  const {intersect} = await load('src/layout/rects.ts');
  const {THEME} = await load('src/brand/ambienteTheme.ts');
  const {formatTokens} = await load('src/brand/format.ts');
  const data = await load(`src/episodes/${code}/data.ts`);

  const vertical = String(flags.format ?? 'h').toLowerCase().startsWith('v');
  const {estudioDe} = await load('src/brand/estudios.ts');
  const est = estudioDe(code, trackerOpts(code).studio);
  if (!est) throw new Error(`Falta declarar el plató de ${code} (npm run doctor -- ${code} dice cómo).`);
  const fmt = vertical ? formatTokens(1080, 1920) : formatTokens(1920, 1080, est);

  // El bbox crudo por frame vive fuera del bundle; lo levantamos sólo acá,
  // porque el verificador debe ser MÁS estricto que lo que ve el render.
  const framesPath = path.join(episodeDir(code), 'track.frames.json');
  const frames = JSON.parse(fs.readFileSync(framesPath, 'utf8'));
  const sized = adaptTrack({...data.TRACK, frames}, fmt.width, fmt.height);
  const track = {
    ...sized,
    reserved: reservedForFormat(sized, data.RESERVED, fmt, sized.durationInFrames),
  };
  const opts = {
    safe: fmt.safe,
    paperBandY: fmt.paperBandY,
    captionBandY: fmt.captionBandY,
    slotPad: fmt.slotPad,
    defaultFraming: fmt.defaultFraming,
  };

  const {slotOf, isFullFrame} = await load('src/episodes/blocks.ts');

  // TODO bloque que dibuje algo tiene que estar acá. Si un componente pide un
  // slot que no figura en esta lista, nadie comprueba su geometría.
  const blocks = [
    // Bloques del capítulo (contrato BLOCKS). Las placas a cuadro completo se
    // excluyen A PROPÓSITO: no ocupan una banda libre, tapan el cuadro entero
    // por decisión editorial. Se listan aparte al final para que la excepción
    // quede a la vista en vez de desaparecer del reporte.
    // Los bloques a sangre se excluyen por la misma razón que las placas: no
    // ocupan una banda libre, ocupan el cuadro entero por decisión editorial.
    // Se listan al final del reporte para que la excepción no desaparezca.
    ...(data.BLOCKS ?? [])
      .filter((b) => !isFullFrame(b))
      .map((b) => ({
        key: `${b.kind}:${b.key}`, from: b.from, to: b.to,
        req: blockRequest(slotOf(b, track, fmt), b),
      })),
    ...data.TITULARES.map((t) => ({
      key: `titular:${t.key}`, from: t.from, to: t.to,
      req: {...blockRequest(data.TITULAR_SLOT, t), side: t.side ?? data.TITULAR_SLOT.side},
    })),
  ];
  if (data.READING && data.READING.to > data.READING.from) {
    blocks.push({
      key: 'panel:lectura', from: data.READING.from, to: data.READING.to,
      req: blockRequest(data.READING_SLOT, data.READING),
      // La banda de pie cuelga por debajo de la caja del slot. Sin esto el
      // verificador cree que el panel termina 46px más arriba de lo que
      // termina, y deja pasar un subtítulo encima de las pastillas.
      bottomY: data.READING_FOOT_Y,
    });
  }
  if (data.CARDS && data.TERMS?.length) {
    blocks.push({
      key: 'fichas', from: data.CARDS.from, to: data.CARDS.to,
      req: blockRequest(
        data.CARDS_SLOT ?? {side: 'opposite', align: 'bottom', maxWidth: 560, maxHeight: 400},
        data.CARDS,
      ),
    });
  }
  if (data.MAPPING) {
    blocks.push({
      key: 'mapeo', from: data.MAPPING.from, to: data.MAPPING.to,
      req: blockRequest(data.MAPPING_SLOT ?? data.TITULAR_SLOT, data.MAPPING),
    });
  }
  if (data.CHIPS) {
    blocks.push({
      key: 'pastillas', from: data.CHIPS.from, to: data.CHIPS.to,
      req: blockRequest(data.CHIPS_SLOT ?? data.TITULAR_SLOT, data.CHIPS),
    });
  }

  // La banda de subtítulos no se resuelve con un slot: es geometría fija abajo
  // del cuadro que se corre donde el episodio lo declara. Se verifica igual —
  // contra los rects quemados y contra los demás gráficos— pero NO contra el
  // profesor: un subtítulo va sobre la persona, para eso está.
  const cb = fmt.captions;
  const captionRect = (f) => {
    let bottom = cb.bottom;
    let left = 0;
    let right = track.width;
    for (const z of data.CAPTION_AVOID ?? []) {
      if (f < z.from || f >= z.to) continue;
      bottom = z.bottom ?? bottom;
      left = z.left ?? left;
      right = z.right ?? right;
    }
    const w = Math.min(cb.maxWidth, right - left);
    return {
      x: left + (right - left - w) / 2,
      y: track.height - bottom - cb.maxHeight,
      width: w,
      height: cb.maxHeight,
    };
  };
  if (data.CAPTIONS?.length) {
    blocks.push({
      key: 'subtítulos', from: 0, to: track.durationInFrames,
      fixed: captionRect, overSubject: true, overPaperOk: true,
    });
  }

  const problems = [];
  const push = (m) => { if (problems.length < 60) problems.push(m); };

  // Máximo dos líneas por subtítulo (documento de subtítulos §1.4). Se mide con
  // el MISMO archivo de fuente que usa el render y con el ancho útil real de la
  // pastilla —el de la banda en el peor frame del subtítulo, que puede estar
  // angostada por un CAPTION_AVOID, menos el padding—. El corte es greedy: un
  // `textWrap: balance` reparte distinto pero nunca usa más renglones.
  if (data.CAPTIONS?.length) {
    const {registerFont, createCanvas} = createRequire(import.meta.url)('canvas');
    const pill = THEME.captions.pill;
    registerFont(path.join(ROOT, 'public/fonts', pill.fontFile), {family: 'CaptionCheck'});
    const ctx = createCanvas(8, 8).getContext('2d');
    ctx.font = `${cb.fontSize}px CaptionCheck`;
    const linesOf = (text, w) => {
      let n = 1;
      let cur = '';
      for (const word of text.split(/\s+/)) {
        const next = cur ? `${cur} ${word}` : word;
        if (cur && ctx.measureText(next).width > w) {
          n++;
          cur = word;
        } else cur = next;
      }
      return n;
    };
    const {paginateCaptions} = await load('src/captions/captionPages.ts');
    const pages = paginateCaptions(data.CAPTIONS, {
      fontSize: cb.fontSize,
      usableWidth: cb.maxWidth - 2 * pill.padX,
      maxLines: pill.maxLines,
    });
    const partidos = pages.length - data.CAPTIONS.length;
    if (partidos > 0) {
      console.log(`\n⚠ ${partidos} página(s) extra de subtítulo: cues que no entraban en ${pill.maxLines} líneas en este formato.`);
    }
    for (const c of pages) {
      let w = Infinity;
      for (let f = c.from; f < c.to; f += 3) w = Math.min(w, captionRect(f).width);
      const n = linesOf(c.text, w - 2 * pill.padX);
      if (n > pill.maxLines) {
        push(`subtítulo ${fmtFrame(c.from)} · ${n} líneas (máx ${pill.maxLines}): "${c.text.slice(0, 60)}…"`);
      }
    }
  }

  /** Caja de un bloque en un frame: fija, o resuelta por el slot engine. */
  const boxAt = (b, f) => {
    if (b.fixed) return b.fixed(f);
    const r = resolveSlot(track, f, b.req, opts);
    return b.bottomY && b.bottomY > r.y + r.height
      ? {...r, height: b.bottomY - r.y}
      : r;
  };

  for (const b of blocks) {
    let firstBad = null, badCount = 0, minW = Infinity;
    for (let f = b.from; f < b.to; f++) {
      const box = boxAt(b, f);
      minW = Math.min(minW, box.width);
      if (b.overSubject) {
        // Sólo se le exige no pisar los rects quemados; del profesor se
        // encarga a propósito.
        for (const r of reservedAt(track, f)) {
          if (intersect(box, r)) {
            badCount++; firstBad ??= {f, why: 'pisa un rect reservado', box, subj: r};
            break;
          }
        }
        continue;
      }

      // El margen se aplica en HORIZONTAL. Crecer también en vertical haría que
      // el test consulte franjas que la tarjeta no ocupa: 4px de desborde hacia
      // abajo arrastran toda la franja de las manos y da un falso positivo.
      // La garantía que importa es: a las alturas que la tarjeta realmente
      // ocupa, se mantiene a ≥MARGIN px de la silueta.
      const grown = {
        x: box.x - MARGIN, y: box.y,
        width: box.width + MARGIN * 2, height: box.height,
      };
      const subj = subjectInRange(track, f, box.y, box.y + box.height);
      if (subj && intersect(grown, subj)) {
        badCount++; firstBad ??= {f, why: 'pisa al profesor', box, subj};
        continue;
      }
      for (const r of reservedAt(track, f)) {
        if (intersect(box, r)) {
          badCount++; firstBad ??= {f, why: 'pisa un rect reservado', box, subj: r};
          break;
        }
      }
      // Un bloque puede bajar de la banda de papel SÓLO si lo declara, y
      // entonces se hace cargo: su contenido tiene que leerse sobre blanco.
      if (!b.req.overPaper && !b.overPaperOk && box.y + box.height > opts.paperBandY + 1) {
        badCount++; firstBad ??= {f, why: `baja de y=${opts.paperBandY} (olas de papel)`, box};
      }
    }
    if (firstBad) {
      const {f, why, box, subj} = firstBad;
      push(
        `${b.key}: ${why} en f${f} (${fmtFrame(f)}), ${badCount} frames afectados\n` +
        `    slot   x ${Math.round(box.x)}–${Math.round(box.x + box.width)}  y ${Math.round(box.y)}–${Math.round(box.y + box.height)}` +
        (subj ? `\n    choque x ${Math.round(subj.x)}–${Math.round(subj.x + subj.width)}  y ${Math.round(subj.y)}–${Math.round(subj.y + subj.height)}` : ''),
      );
    }
    if (!b.fixed && minW < MIN_WIDTH) {
      push(`${b.key}: ancho mínimo ${Math.round(minW)}px (<${MIN_WIDTH})`);
    }
  }

  // --- Ningún gráfico puede tapar a otro ---
  //
  // Este chequeo nace de un modo de falla real: los titulares "Reconocer el
  // vocabulario técnico" y "Buscar el significado" pedían el mismo lado que el
  // panel de lectura y quedaron 395 frames ENTEROS detrás de él. Todo lo demás
  // estaba en verde —no pisaban al profesor, duraban lo suficiente, contrastaban—
  // y aun así el espectador no los veía nunca. Un gráfico tapado es un gráfico
  // que no existe, y hasta ahora nadie lo comprobaba.
  //
  // Se comparan las CAJAS de slot, no los píxeles: una caja contenida en otra es
  // un error de coreografía aunque el componente no la llene. Si dos bloques
  // tienen que convivir, sus slots se declaran disjuntos (align top/bottom).
  const encadenados = [];
  for (let i = 0; i < blocks.length; i++) {
    for (let j = i + 1; j < blocks.length; j++) {
      const a = blocks[i];
      const b = blocks[j];
      const from = Math.max(a.from, b.from);
      const to = Math.min(a.to, b.to);
      if (to <= from) continue;
      let hit = 0;
      let first = null;
      for (let f = from; f < to; f++) {
        const ba = boxAt(a, f);
        const bb = boxAt(b, f);
        if (intersect(ba, bb)) {
          hit++;
          first ??= {f, ba, bb};
        }
      }
      if (!hit) continue;

      // ¿Es un encadenado declarado? El solape tiene que ser exactamente la
      // cola de uno y la cabeza del otro, y durar menos que un desvanecido.
      const cola =
        (a.to === to && b.from === from && b.to > a.to) ||
        (b.to === to && a.from === from && a.to > b.to);
      if (cola && to - from <= CROSSFADE) {
        encadenados.push(`${a.key} → ${b.key}  ${to - from} frames en f${from} (${fmtFrame(from)})`);
        continue;
      }

      {
        push(
          `${a.key} y ${b.key} se tapan entre sí: ${hit}/${to - from} frames, desde f${first.f} (${fmtFrame(first.f)})\n` +
          `    ${a.key.padEnd(16)} x ${Math.round(first.ba.x)}–${Math.round(first.ba.x + first.ba.width)}  y ${Math.round(first.ba.y)}–${Math.round(first.ba.y + first.ba.height)}\n` +
          `    ${b.key.padEnd(16)} x ${Math.round(first.bb.x)}–${Math.round(first.bb.x + first.bb.width)}  y ${Math.round(first.bb.y)}–${Math.round(first.bb.y + first.bb.height)}`,
        );
      }
    }
  }

  // --- Invariantes temporales (la nota de la correctora, como test) ---
  const L = THEME.legibility;
  for (const t of data.TITULARES) {
    const d = t.to - t.from;
    if (d < L.minTitularFrames) {
      push(`titular:${t.key} dura ${d} frames (<${L.minTitularFrames} = ${(L.minTitularFrames / 25).toFixed(1)}s)`);
    }
  }
  // Un episodio puede no traer texto en pantalla; entonces no hay nada que medir.
  for (const st of data.READING?.steps ?? []) {
    const d2 = st.to - st.from;
    if (d2 < L.minTitularFrames) {
      push(`paso ${st.step} "${st.title}" dura ${d2} frames (<${L.minTitularFrames} = ${(L.minTitularFrames / 25).toFixed(1)}s)`);
    }
  }
  const terms = data.READING?.terms ?? [];
  for (const tm of terms) {
    const on = data.READING.to - tm.at;
    if (on < L.minTermFrames) {
      push(`término "${tm.token}" encendido ${on} frames (<${L.minTermFrames})`);
    }
  }
  if (terms.length) {
    const hold = terms[0].at - data.READING.from;
    if (hold < L.panelHoldFrames) {
      push(`panel de lectura quieto ${hold} frames antes del primer resaltado (<${L.panelHoldFrames} = ${(L.panelHoldFrames / 25).toFixed(1)}s)`);
    }
  }

  // Duraciones mínimas de los bloques del capítulo. Un gráfico que entra y sale
  // antes de que alguien lo lea es peor que no ponerlo: distrae y no informa.
  for (const b of data.BLOCKS ?? []) {
    const dur = b.to - b.from;
    if (dur < L.minTitularFrames) {
      push(`${b.kind}:${b.key} dura ${dur} frames (<${L.minTitularFrames} = ${(L.minTitularFrames / 25).toFixed(1)}s)`);
    }
    // Cada ítem de una tira tiene que quedar encendido lo suficiente después de
    // entrar sobre su palabra.
    for (const it of b.items ?? []) {
      // Cada familia de bloque llama distinto a lo mismo: `evidence` dice
      // `label`, `checklist` dice `term`, y los kind que enseñan una estructura
      // —cronología, comparación, mapa, protocolo— dicen `title`. Todos entran
      // sobre su palabra y todos se verifican igual. Este renglón es lo que
      // hace que un kind nuevo herede la comprobación sin escribir verificador.
      const name = it.label ?? it.term ?? it.title ?? it.word;
      const on = b.to - it.at;
      if (on < L.minTermFrames) {
        push(`${b.key} · "${name}" encendido ${on} frames (<${L.minTermFrames})`);
      }
      if (it.at < b.from || it.at >= b.to) {
        push(`${b.key} · "${name}" entra en f${it.at}, fuera de su bloque (f${b.from}–f${b.to})`);
      }
    }
  }

  console.log(
    `check-layout · ${code} · ${fmt.width}×${fmt.height} · ${blocks.length} bloques · ${track.durationInFrames} frames`,
  );

  if (encadenados.length) {
    console.log(`\n· ${encadenados.length} encadenado(s) entre bloques consecutivos:`);
    for (const e of encadenados) console.log(`    ${e}`);
  }

  // El RANGO de un recurso es una decisión editorial: didáctico —hay que poder
  // leerlo— o refuerzo —acompaña—. No se puede deducir del archivo, así que un
  // bloque que no lo declara se queda con el default 'refuerzo' y esa es una
  // decisión que no tomó nadie. Se lista, igual que las placas: una omisión
  // silenciosa es la forma en que un recurso didáctico termina de decorado.
  const RANKED = ['photo', 'video', 'gif', 'evidence', 'checklist', 'map'];
  const sinRango = (data.BLOCKS ?? []).filter(
    (b) => RANKED.includes(b.kind) && !b.rank,
  );
  if (sinRango.length) {
    console.log(`\n⚠ ${sinRango.length} bloque(s) con recurso sin \`rank\` declarado (asumen 'refuerzo'):`);
    for (const b of sinRango) console.log(`    ${b.kind}:${b.key}`);
  }

  // Las excepciones se IMPRIMEN, no se ocultan: un bloque a cuadro completo
  // tapa al docente, que es justo lo que el resto del sistema impide. Placas y
  // recursos a sangre son la misma excepción —no ocupan una banda libre, ocupan
  // todo— así que se reportan juntos, con el mismo predicado que usa el render.
  //
  // Y desde que el capítulo declara su techo de intervención, la excepción deja
  // de ser sólo informativa: un bloque a cuadro completo en un capítulo que
  // declaró menos de 4 es una contradicción entre lo que el capítulo dijo que
  // iba a hacer y lo que hace.
  const full = (data.BLOCKS ?? []).filter((b) => isFullFrame(b));
  const techo = data.EPISODE?.intervention;
  if (full.length) {
    const grave = techo !== undefined && techo < 4;
    const marca = grave ? '✗' : '⚠';
    console.log(`\n${marca} ${full.length} bloque(s) a cuadro completo, fuera del motor de bandas:`);
    for (const b of full) {
      const seg = ((b.to - b.from) / 25).toFixed(1);
      console.log(`    ${b.kind}:${b.key}  f${b.from}–f${b.to}  (${seg}s a cuadro completo)`);
    }
    if (grave) {
      push(
        `el capítulo declara intervention: ${techo} pero monta ${full.length} bloque(s) a cuadro completo, que es nivel 4`,
      );
    }
  }

  // La parte B de una fórmula entra sobre su palabra. Si `at` cae antes de que
  // la A se haya leído, las dos llegan juntas y la relación se pierde; si cae
  // pegado al final, B se apaga antes de poder leerse. Los dos lados usan los
  // mismos pisos que el resto: el titular y el término.
  for (const b of (data.BLOCKS ?? []).filter((b) => b.kind === 'formula')) {
    if (!(b.at > b.from && b.at < b.to)) {
      push(`formula:${b.key} · la parte B entra en f${b.at}, fuera del bloque f${b.from}–f${b.to}`);
      continue;
    }
    if (b.at - b.from < L.minTitularFrames) {
      push(`formula:${b.key} · la parte A queda sola ${b.at - b.from} frames (<${L.minTitularFrames})`);
    }
    if (b.to - b.at < L.minTermFrames) {
      push(`formula:${b.key} · la parte B queda encendida ${b.to - b.at} frames (<${L.minTermFrames})`);
    }
  }

  // Una cronología cuyos hitos no avanzan es un error de datos que ningún otro
  // chequeo ve: la geometría está bien, los tiempos de lectura están bien, y el
  // capítulo cuenta la historia al revés.
  for (const b of (data.BLOCKS ?? []).filter((b) => b.kind === 'timeline')) {
    const ats = (b.items ?? []).map((it) => it.at);
    for (let i = 1; i < ats.length; i++) {
      if (ats[i] <= ats[i - 1]) {
        push(`timeline:${b.key} · el hito ${i + 1} entra en f${ats[i]}, no después del anterior (f${ats[i - 1]})`);
      }
    }
  }

  // Los pines de un mapa son coordenadas NORMALIZADAS sobre la caja del media:
  // es lo que hace que el mismo data.ts sirva en 16:9 y en 9:16. Un valor en
  // píxeles se cuela sin error de tipos y aterriza fuera del cuadro.
  for (const b of (data.BLOCKS ?? []).filter((b) => b.kind === 'map')) {
    for (const it of b.items ?? []) {
      if (!(it.x >= 0 && it.x <= 1 && it.y >= 0 && it.y <= 1)) {
        push(`map:${b.key} · "${it.title}" en (${it.x}, ${it.y}): fuera de 0..1 — ¿son píxeles?`);
      }
    }
    if (b.route && b.route.length < 2) {
      push(`map:${b.key} · \`route\` con ${b.route.length} punto(s): hace falta al menos 2`);
    }
  }
  if (problems.length) {
    console.error(`\n✗ ${problems.length} problema(s):\n`);
    problems.forEach((p) => console.error('  ' + p));
    process.exit(1);
  }
  console.log('\n✓ todo limpio: ningún gráfico pisa al profesor, los rects quemados');
  console.log('  ni a otro gráfico, y todos los tiempos de lectura cumplen el mínimo.');
};

main().catch((e) => { console.error(e.stack ?? e.message); process.exit(1); });
