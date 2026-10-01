/**
 * escaleta — lee la escaleta .docx y deja el trabajo manual a la vista.
 *
 *   npm run escaleta -- <CODE> [--docx <ruta>] [--force]
 *
 * El pasaje escaleta → data.ts era el único tramo 100 % manual del pipeline, y
 * es donde aparecieron TODAS las fallas caras de los tres capítulos hechos
 * hasta ahora: un fragmento que nunca se grabó, un nombre de docente que no
 * coincidía con el máster, dos recursos ilegibles y una nota de tiempo que
 * podía leerse de dos maneras.
 *
 * Este script no reemplaza ese criterio: lo PREPARA. Extrae la tabla, cruza
 * cada palabra-gatillo contra la transcripción y cada recurso contra los
 * archivos entregados, y saca a la superficie lo que no cierra. Lo que decide
 * —qué se monta, con qué rango, cuánto dura— sigue siendo humano.
 *
 * Emite:
 *   src/episodes/<CODE>/escaleta.json    la tabla, estructurada (generado)
 *   src/episodes/<CODE>/cues.def.json    propuesta, sólo si no existe
 *   src/episodes/<CODE>/data.draft.ts    esqueleto para copiar a data.ts
 *
 * NUNCA pisa data.ts ni un cues.def.json ya revisado. Sin --force no borra nada.
 */
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {readDocx} from './lib/docx.mjs';
import {episodeDir, episodesRoot, fmtFrame, masterFps, parseArgs, ROOT} from './lib/common.mjs';
import {findWord, resolveCues, tokenize} from './lib/cues.mjs';

/** Palabras que no anclan nada: aparecen cien veces en cualquier locución. */
const STOP = new Set(
  ('el la los las un una unos unas de del al a en y o u que se lo le les su sus ' +
    'tu tus mi mis con por para sin sobre entre este esta esto ese esa eso te me ' +
    'nos ya no si sí es son era ser hay como cuando donde muy más ni pero').split(' '),
);

/** Normaliza CONSERVANDO espacios: acá se parten frases, no palabras sueltas. */
const norm = (s) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9ñ ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const camel = (s) => {
  const w = norm(s).split(' ').filter(Boolean);
  return w[0] + w.slice(1).map((x) => x[0].toUpperCase() + x.slice(1)).join('');
};

/** Busca el .docx de la escaleta en la carpeta del episodio. */
const findDocx = (code, override) => {
  if (override) return path.resolve(override);
  const dir = path.join(episodesRoot(), code);
  if (!fs.existsSync(dir)) throw new Error(`No existe la carpeta del episodio: ${dir}`);
  const cands = fs
    .readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith('.docx') && !f.startsWith('~$'))
    // La guía docente también es .docx y no sirve acá.
    .filter((f) => !/gu[ií]a/i.test(f))
    .sort((a, b) => Number(/escaleta/i.test(b)) - Number(/escaleta/i.test(a)));
  if (!cands.length) throw new Error(`No hay .docx de escaleta en ${dir}`);
  return path.join(dir, cands[0]);
};

/**
 * Frases entre comillas de una observación.
 *
 * La escaleta marca la palabra-gatillo entrecomillándola —«aparece cuando se
 * menciona "el agua empezó a entrar"»— y ésa es la única convención que las
 * tres escaletas respetaron sin fallar. Es de donde salen los cues.
 */
const quotes = (s) => [...s.matchAll(/[“"«']([^”"»']{2,60})[”"»']/g)].map((m) => m[1].trim());

/** Notas de tiempo que se pueden leer de dos maneras. Hay que preguntarlas. */
const timingFlags = (s) => {
  const out = [];
  for (const m of s.matchAll(/min\.?\s*\d+\s*[.,:]\s*\d+(\s*(a|hasta)\s*\d+\s*[.,:]\s*\d+)?/gi))
    out.push(`«${m[0]}» — ¿es tiempo de la LÍNEA DE TIEMPO o entrada/salida del CLIP fuente?`);
  if (/desde el inicio/i.test(s)) out.push('«desde el inicio» — ¿de qué? hace falta un frame');
  if (/hasta (el )?final/i.test(s)) out.push('«hasta el final» — ¿de la sección o del video?');
  return out;
};

/** Recursos declarados en la celda: "1_inundación", "12_Imagen de bici, auto y moto". */
const parseRecursos = (cell) => {
  const out = [];
  for (const raw of cell.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const m = line.match(/^(\d+)\s*[_.\-–]\s*(.*)$/);
    if (m) out.push({n: Number(m[1]), desc: m[2].trim(), raw: line});
    // Una línea sin número es continuación de la anterior (pasa cuando Word
    // parte "12_Imagen de bici, auto y / moto" en dos párrafos).
    else if (out.length) {
      const last = out[out.length - 1];
      last.desc += ' ' + line;
      last.raw += ' ' + line;
    } else out.push({n: null, desc: line, raw: line});
  }
  return out;
};

/** Archivos que entregó el cliente + los ya normalizados en public/. */
const inventory = (code) => {
  const dirs = [
    path.join(episodesRoot(), code, 'RECURSOS'),
    path.join(ROOT, 'public', code),
  ];
  const files = [];
  for (const d of dirs) {
    if (!fs.existsSync(d)) continue;
    for (const f of fs.readdirSync(d)) {
      if (f.startsWith('.')) continue;
      files.push({file: f, dir: d, key: norm(f.replace(/\.[a-z0-9]+$/i, ''))});
    }
  }
  return files;
};

/** ¿Qué archivo entregado corresponde a este recurso de la escaleta? */
const matchRecurso = (rec, files) => {
  const hits = new Set();
  // 1) por número: "RECURSO 1.mp4", "recurso-1.mp4", "icono1.png"
  if (rec.n != null) {
    const re = new RegExp(`(^|[^0-9])${rec.n}([^0-9]|$)`);
    for (const f of files) if (re.test(f.key)) hits.add(f.file);
  }
  // 2) por palabra de la descripción, que es como los nombró producción
  const words = norm(rec.desc).split(' ').filter((w) => w.length >= 5 && !STOP.has(w));
  for (const f of files) for (const w of words) if (f.key.includes(w)) hits.add(f.file);
  return [...hits];
};

/** Serie del capítulo: la de su materia (src/brand/estudios.ts) o la que diga la escaleta. */
const {materiaDe} = await import(pathToFileURL(path.join(ROOT, 'src/brand/estudios.ts')).href);
const serieDe = (code, meta) => materiaDe(code)?.series ?? meta.serie ?? 'TODO: serie (agregá la materia a src/brand/estudios.ts)';

const main = async () => {
  const {code, flags} = parseArgs();
  if (!code) throw new Error('Uso: npm run escaleta -- <CODE> [--docx <ruta>] [--force]');

  const docx = findDocx(code, flags.docx);
  const blocks = readDocx(docx);
  const dir = episodeDir(code);
  fs.mkdirSync(dir, {recursive: true});

  // ── Encabezado, tabla y pie ──────────────────────────────────────────────
  const paras = blocks.filter((b) => b.type === 'p').map((b) => b.text);
  const field = (label) => {
    const p = paras.find((t) => new RegExp(`^${label}`, 'i').test(t));
    return p ? p.replace(new RegExp(`^${label}\\s*:?\\s*`, 'i'), '').trim() : null;
  };
  const table = blocks.find((b) => b.type === 'table');
  if (!table) throw new Error('La escaleta no tiene tabla. ¿Es el .docx correcto?');

  const meta = {
    codigo: code,
    titulo: field('NOMBRE DEL VIDEO'),
    patente: field('PATENTE DE VIDEO'),
    objetivo: field('OBJETIVO DEL VIDEO'),
    creditos: field('Créditos \\(equipo docente\\)'),
    enCamara: field('En cámara'),
    correcciones: paras.slice(paras.findIndex((t) => /^CORRECCIONES/i.test(t)) + 1)
      .filter((t) => t && !/^Esta escaleta fue realizada/i.test(t)),
    // Sólo el nombre: una ruta dependería de la PC que corrió el script y el
    // escaleta.json versionado cambiaría en cada máquina.
    fuente: path.basename(docx),
  };

  // Las dos primeras filas son el encabezado de la tabla (GUION | EN PANTALLA |
  // OBSERVACIONES, y debajo TITULARES | RECURSOS GRÁFICOS).
  const dataRows = table.rows.filter((r) => r.length >= 4).slice(1);
  const files = inventory(code);

  const secciones = dataRows.map((cells, i) => {
    const [guion, titularesRaw, recursosRaw, obs] = cells.map((c) => (c ?? '').trim());
    return {
      fila: i + 1,
      guion,
      titulares: titularesRaw.split('\n').map((t) => t.trim()).filter(Boolean),
      recursos: parseRecursos(recursosRaw).map((r) => ({
        ...r,
        archivos: matchRecurso(r, files),
      })),
      observaciones: obs,
      gatillos: quotes(obs),
      ambiguedades: timingFlags(obs),
    };
  });

  // ── Cruce con la transcripción ───────────────────────────────────────────
  const wordsPath = path.join(dir, 'words.json');
  const hasWords = fs.existsSync(wordsPath);
  const toks = hasWords
    ? tokenize(JSON.parse(fs.readFileSync(wordsPath, 'utf8')), masterFps(code, flags.master))
    : [];

  /**
   * Candidatos de una frase-gatillo, ordenados por cuán buen ancla son.
   *
   * La búsqueda es DIFUSA (la de `lib/cues.mjs`) y no exacta, porque whisper
   * normaliza al peninsular y las escaletas están en voseo: la escaleta pide
   * "mantené" y la transcripción dice "mantén". Con comparación exacta ese cue
   * se reportaba como CONTENIDO AUSENTE — la alarma más grave del sistema,
   * disparada en falso, que es la forma más rápida de que nadie la mire.
   */
  const candidatesFor = (phrase) =>
    norm(phrase)
      .split(' ')
      .filter((w) => w.length >= 4 && !STOP.has(w))
      .map((w) => {
        const {hits, score} = findWord(toks, w);
        return {word: w, frames: hits.map((h) => h.f), score};
      })
      // Menos apariciones = ancla más segura. A igual cantidad, la coincidencia
      // más exacta; y a igual score, la palabra más larga, que es la que menos
      // se confunde con otra parecida.
      .sort((a, b) => {
        const av = a.frames.length === 0 ? 99 : a.frames.length;
        const bv = b.frames.length === 0 ? 99 : b.frames.length;
        return av - bv || b.score - a.score || b.word.length - a.word.length;
      });

  const cues = [];
  const usados = new Set();
  const problemas = [];
  for (const s of secciones) {
    for (const g of s.gatillos) {
      const cands = candidatesFor(g);
      const best = cands[0];
      if (!best) continue;
      if (hasWords && best.frames.length === 0) {
        problemas.push(
          `fila ${s.fila}: NINGUNA palabra de «${g}» aparece en la transcripción.\n` +
            '      Es el modo de falla peor: contenido que la escaleta pide y el máster no trae.\n' +
            '      Decisión editorial de Isaac, y se documenta en la cabecera del data.ts.',
        );
        continue;
      }
      let key = camel(best.word);
      let n = 2;
      while (usados.has(key)) key = camel(best.word) + n++;
      usados.add(key);
      const cue = {key, word: best.word};
      // Una palabra que aparece varias veces necesita anclarse a la anterior o
      // el alineador la resuelve en la primera aparición, que casi nunca es la
      // que la escaleta quiere.
      if (best.frames.length > 1 && cues.length) cue.after = cues[cues.length - 1].key;
      cues.push({...cue, _frase: g, _fila: s.fila, _cands: cands.slice(0, 3)});
    }
  }

  // Se resuelve la propuesta con el MISMO resolvedor que `npm run cues`, para
  // que el frame que imprime este reporte sea exactamente el que va a salir de
  // ahí. Sin esto el reporte mostraría la primera aparición de la palabra y no
  // la que el `after` termina eligiendo — y una tabla que miente es peor que
  // no tenerla.
  const defsProp = cues.map(({key, word, after}) => (after ? {key, word, after} : {key, word}));
  const resueltos = hasWords ? resolveCues(defsProp, toks).cues : {};

  // ── Salidas ──────────────────────────────────────────────────────────────
  const escaletaJson = path.join(dir, 'escaleta.json');
  fs.writeFileSync(
    escaletaJson,
    JSON.stringify({meta, secciones}, null, 2) + '\n',
  );

  const cuesPath = path.join(dir, 'cues.def.json');
  const cuesExists = fs.existsSync(cuesPath);
  const cuesOut = cues.map(({key, word, after}) => (after ? {key, word, after} : {key, word}));
  let cuesWritten = false;
  if (!cuesExists || flags.force) {
    fs.writeFileSync(cuesPath, JSON.stringify(cuesOut, null, 2) + '\n');
    cuesWritten = true;
  }

  const draftPath = path.join(dir, 'data.draft.ts');
  fs.writeFileSync(draftPath, draft(code, meta, secciones, cues));

  // ── Reporte ──────────────────────────────────────────────────────────────
  const rel = (p) => path.relative(ROOT, p);
  console.log(`escaleta · ${code} · ${rel(docx)}`);
  console.log(`  ${secciones.length} secciones · ${secciones.reduce((a, s) => a + s.titulares.length, 0)} titulares · ${secciones.reduce((a, s) => a + s.recursos.length, 0)} recursos\n`);

  console.log('PALABRAS-GATILLO');
  console.log('  cue                frase de la escaleta                    palabra      aparic.  frame');
  console.log('  ────────────────── ─────────────────────────────────────── ──────────── ───────  ─────');
  for (const c of cues) {
    const f = c._cands[0].frames;
    const r = resueltos[c.key];
    const fr = r ? `f${r.f} ${fmtFrame(r.f)}` : hasWords ? '—' : '(sin transcribir)';
    console.log(
      `  ${c.key.padEnd(18)} ${('«' + c._frase + '»').slice(0, 39).padEnd(39)} ${c.word.padEnd(12)} ${String(f.length).padStart(7)}  ${fr}`,
    );
    // Las alternativas se muestran siempre: un score alto significa que la
    // palabra EXISTE, no que sea la correcta. Elegirla es humano.
    for (const alt of c._cands.slice(1)) {
      if (!alt.frames.length) continue;
      console.log(`  ${''.padEnd(18)} ${''.padEnd(39)} ${('· ' + alt.word).padEnd(12)} ${String(alt.frames.length).padStart(7)}  f${alt.frames[0]}`);
    }
  }

  const sinArchivo = secciones.flatMap((s) =>
    s.recursos.filter((r) => !r.archivos.length).map((r) => `fila ${s.fila}: «${r.raw}» no coincide con ningún archivo entregado`),
  );
  const usadosArch = new Set(secciones.flatMap((s) => s.recursos.flatMap((r) => r.archivos)));
  const huerfanos = files
    .filter((f) => f.dir.endsWith('RECURSOS') && !usadosArch.has(f.file))
    .map((f) => f.file);

  const amb = secciones.flatMap((s) => s.ambiguedades.map((a) => `fila ${s.fila}: ${a}`));

  const seccion = (titulo, items) => {
    if (!items.length) return;
    console.log(`\n${titulo}`);
    for (const i of items) console.log('  · ' + i);
  };
  seccion('⚠ CONTENIDO QUE LA ESCALETA PIDE Y EL MÁSTER NO TRAE', problemas);
  seccion('⚠ RECURSOS SIN ARCHIVO', sinArchivo);
  seccion('⚠ ARCHIVOS ENTREGADOS QUE LA ESCALETA NO PIDE', huerfanos);
  seccion('⚠ NOTAS DE TIEMPO AMBIGUAS', amb);
  seccion('⚠ CONFIRMAR CONTRA EL MÁSTER, NUNCA CONTRA LA ESCALETA', [
    `En cámara: «${meta.enCamara ?? '—'}» — extraé el frame de la placa quemada y confirmalo con el responsable del capítulo.`,
    'Las escaletas se escriben antes de grabar: hay un caso verificado por materia en que erraron el nombre, y uno en que erraron cuántas personas hay.',
  ]);
  if (meta.correcciones.length)
    seccion('CORRECCIONES AL PIE (leerlas: son lo que ya se rechazó)', meta.correcciones);

  console.log(`\n→ ${rel(escaletaJson)}`);
  console.log(
    cuesWritten
      ? `→ ${rel(cuesPath)}   PROPUESTA — revisala antes de correr \`npm run cues\``
      : `· ${rel(cuesPath)} ya existe y no se tocó (--force para pisarlo)`,
  );
  console.log(`→ ${rel(draftPath)}   esqueleto: copialo a data.ts y completalo`);
  if (!hasWords)
    console.log('\n⚠ Todavía no hay words.json: corré `npm run transcribe` y volvé a correr esto para cruzar los gatillos.');
  console.log('\nLo que sigue NO lo puede hacer un script: elegir qué se monta, con qué');
  console.log('rango (didáctico / refuerzo) y cuánto dura. Eso es la escaleta leída por vos.');
};

/** Esqueleto de data.ts, con una sección comentada por fila de la escaleta. */
const draft = (code, meta, secciones, cues) => {
  const cueOf = (fila) => cues.filter((c) => c._fila === fila);
  const bloques = [];
  for (const s of secciones) {
    const cs = cueOf(s.fila);
    const from = cs[0] ? `M.${cs[0].key}` : 'TODO_FRAME';
    bloques.push(`  // ── Fila ${s.fila} de la escaleta ${'─'.repeat(Math.max(0, 56 - String(s.fila).length))}`);
    if (s.guion) bloques.push(`  // GUION: ${s.guion.replace(/\n/g, ' ').slice(0, 300)}`);
    if (s.observaciones) bloques.push(`  // OBS:   ${s.observaciones.replace(/\n/g, ' ').slice(0, 300)}`);
    for (const t of s.titulares) {
      bloques.push(
        `  {\n    kind: 'titular',\n    key: 'TODO-${s.fila}',\n    from: ${from},\n    to: TODO_FRAME,\n    // slot: L2_TITULAR | C_TITULAR según el encuadre de esos frames\n    kicker: 'TODO',\n    title: ${JSON.stringify(t)},\n  },`,
      );
    }
    for (const r of s.recursos) {
      const src = r.archivos[0] ? `'${code}/${r.archivos[0]}'` : `'TODO' /* ${r.raw} */`;
      bloques.push(
        `  {\n    // ${r.raw}\n    kind: 'photo' /* photo | video | gif | evidence | checklist */,\n    key: 'TODO-recurso-${r.n ?? s.fila}',\n    rank: 'refuerzo' /* 'didactico' si hay que LEERLO o es evidencia real */,\n    from: ${from},\n    to: TODO_FRAME,\n    src: ${src},\n    caption: 'TODO',\n  },`,
      );
    }
    bloques.push('');
  }

  return `/**
 * ${code} — ${meta.titulo ?? 'TODO'}
 * ${serieDe(code, meta)} · Educaplay Secundaria (Corrientes)
 *
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  ESQUELETO GENERADO POR \`npm run escaleta -- ${code}\`.                   ║
 * ║  Copialo a data.ts, completalo y BORRÁ este archivo. No se importa.      ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * La cabecera del data.ts es parte del entregable. Antes de dar el capítulo por
 * hecho, completá acá:
 *
 *   1 · LA COREOGRAFÍA DEL MÁSTER. Pegá la tabla de segmentos que imprime
 *       \`npm run track -- ${code} --report\` y decí qué pasa en cada tramo.
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
 *   6 · LA CALIBRACIÓN DE AUDIO. \`voiceGain\` se mide sobre el render completo,
 *       nunca sobre un fragmento ni estimado.
 *
 * Objetivo declarado en la escaleta:
 *   ${(meta.objetivo ?? 'TODO').replace(/\n/g, ' ')}
 *
 * Créditos que declara la escaleta (CONFIRMAR contra la placa quemada):
 *   equipo docente: ${meta.creditos ?? '—'}
 *   en cámara:      ${meta.enCamara ?? '—'}
 */
import type {EpisodeData, Block, SlotSpec, ReservedRect} from '../types.ts';
import {applyCaptionFixes, type CaptionFix} from '../captionFix.ts';
import {TRACK} from './track.ts';
import {CAPTIONS as RAW_CAPTIONS} from './captions.ts';
import {CUES} from './cues.ts';

export const FPS = TRACK.fps; // medido del máster: no todos son de 25
export const DURATION = TRACK.durationInFrames;

export const EPISODE = {
  id: '${code}',
  title: ${JSON.stringify(meta.titulo ?? 'TODO')},
  series: ${JSON.stringify(serieDe(code, meta))},
  objective: ${JSON.stringify((meta.objetivo ?? 'TODO').replace(/\n/g, ' '))},
  master: 'videos/${code}.mp4',
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
  if (!c) throw new Error(\`Falta cue \${key} en cues.ts\`);
  return c.f;
};

export const M = {
${cues.map((c) => `  ${c.key}: cueFrame('${c.key}'),`).join('\n')}
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
${bloques.join('\n')}
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
`;
};

main().catch((e) => {
  console.error(e.stack ?? e.message);
  process.exit(1);
});
