/**
 * nuevo — arranca un episodio desde el máster y la escaleta.
 *
 *   npm run nuevo -- <CODE> [--master <ruta>] [--docx <ruta>]
 *                           [--skip-transcribe] [--force]
 *
 * Hace TODO lo que una máquina puede hacer sola y se detiene exactamente donde
 * empieza el criterio. Es idempotente: volver a correrlo después de escribir el
 * data.ts completa el registro y no pisa nada.
 *
 * Lo que hace:
 *   1. copia el máster a public/videos/<CODE>.mp4 (con enlace duro si se puede)
 *   2. copia RECURSOS/ a public/<CODE>/ con nombres normalizados
 *   3. mide el encuadre           → track.ts, track.frames.json
 *   4. transcribe con timing      → words.json, captions.ts
 *   5. lee la escaleta            → escaleta.json, cues.def.json, data.draft.ts
 *   6. resuelve las palabras      → cues.ts
 *
 * Después, el armado en After Effects: npm run export:ae y npm run ae.
 *
 * Lo que NO hace, y no es un olvido: elegir qué se monta, con qué rango
 * (didáctico / refuerzo), cuánto dura cada bloque y qué hacer con lo que la
 * escaleta pide y el máster no trae. Eso es leer la escaleta, y es humano.
 */
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {episodesRoot, episodeDir, parseArgs, ROOT} from './lib/common.mjs';

const run = (args, opts = {}) => {
  console.log(`\n$ node ${args.join(' ')}`);
  execFileSync(process.execPath, args, {cwd: ROOT, stdio: 'inherit', ...opts});
};

/** Nombre de archivo predecible: sin espacios, sin acentos, sin paréntesis. */
const slugFile = (name) => {
  const ext = path.extname(name).toLowerCase();
  return (
    name
      .slice(0, name.length - ext.length)
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') + ext
  );
};

/** El máster: --master, o el .mp4 más nuevo de la carpeta del episodio. */
const findMaster = (code, override) => {
  if (override) return path.resolve(override);
  const dir = path.join(episodesRoot(), code);
  if (!fs.existsSync(dir)) throw new Error(`No existe la carpeta del episodio: ${dir}`);
  const found = [];
  // RENDER/ primero: es donde el montajista deja el corte.
  for (const sub of ['RENDER', '.']) {
    const d = path.join(dir, sub);
    if (!fs.existsSync(d)) continue;
    for (const f of fs.readdirSync(d)) {
      if (!/\.(mp4|mov|mxf)$/i.test(f)) continue;
      const p = path.join(d, f);
      found.push({p, t: fs.statSync(p).mtimeMs, size: fs.statSync(p).size});
    }
  }
  if (!found.length) throw new Error(`Sin video en ${dir} ni en ${dir}/RENDER`);
  // El más grande, no el más nuevo: una versión "ACORTADA" suele ser posterior
  // y no es el máster. Si hay duda, --master lo resuelve.
  found.sort((a, b) => b.size - a.size);
  return found[0].p;
};

const main = () => {
  const {code, flags} = parseArgs();
  if (!code) throw new Error('Uso: npm run nuevo -- <CODE> [--master <ruta>] [--docx <ruta>]');
  if (!/^[A-Z0-9-]+$/i.test(code)) throw new Error(`Código raro: ${code}`);

  const dir = episodeDir(code);
  const rel = (p) => path.relative(ROOT, p);
  fs.mkdirSync(dir, {recursive: true});

  // ── 1 · el máster va en public/videos, que es lo que miden los scripts ────
  const master = findMaster(code, flags.master);
  const dest = path.join(ROOT, 'public', 'videos', `${code}.mp4`);
  fs.mkdirSync(path.dirname(dest), {recursive: true});
  if (fs.existsSync(dest) && !flags.force) {
    console.log(`· ${rel(dest)} ya existe`);
  } else {
    fs.rmSync(dest, {force: true});
    // Enlace duro si están en el mismo volumen: el máster pesa 70–140 MB y no
    // tiene sentido duplicarlo. Si falla (otro disco), se copia.
    try {
      fs.linkSync(master, dest);
      console.log(`✓ ${rel(dest)} ← enlace duro a ${master}`);
    } catch {
      fs.copyFileSync(master, dest);
      console.log(`✓ ${rel(dest)} ← copia de ${master}`);
    }
  }

  // ── 2 · recursos del cliente, con nombres predecibles ─────────────────────
  const src = path.join(episodesRoot(), code, 'RECURSOS');
  const pub = path.join(ROOT, 'public', code);
  const renombres = [];
  if (fs.existsSync(src)) {
    fs.mkdirSync(pub, {recursive: true});
    for (const f of fs.readdirSync(src)) {
      if (f.startsWith('.')) continue;
      const to = slugFile(f);
      const dst = path.join(pub, to);
      if (!fs.existsSync(dst) || flags.force) fs.copyFileSync(path.join(src, f), dst);
      if (to !== f) renombres.push([f, to]);
    }
    console.log(`✓ ${rel(pub)} · ${fs.readdirSync(pub).length} recursos`);
    if (renombres.length) {
      console.log('  renombrados (los originales quedan intactos en RECURSOS/):');
      for (const [a, b] of renombres) console.log(`    ${a}  →  ${b}`);
    }
  } else {
    console.log(`⚠ No hay ${rel(src)} — el capítulo va sin recursos del cliente`);
  }

  // ── 3 a 6 · medir, transcribir, leer la escaleta, resolver ───────────────
  run(['scripts/track-presenter.mjs', code, '--assert', '--report']);
  if (!flags['skip-transcribe']) run(['scripts/transcribe.mjs', code]);
  else console.log('\n· transcribe salteado (--skip-transcribe)');

  const escArgs = ['scripts/escaleta.mjs', code];
  if (flags.docx) escArgs.push('--docx', String(flags.docx));
  run(escArgs);

  if (fs.existsSync(path.join(dir, 'cues.def.json')))
    run(['scripts/align-cues.mjs', code, '--report']);

  // ── Lo que sigue es humano ───────────────────────────────────────────────
  console.log('\n' + '─'.repeat(74));
  console.log('LO QUE FALTA, Y NO LO PUEDE HACER UN SCRIPT');
  console.log('─'.repeat(74));
  console.log(`
  1. Leé la tabla de PALABRAS-GATILLO de arriba entera. Un score de 1.00
     significa que la palabra EXISTE, no que el cue sea el correcto.

  2. Buscá en la lista las alarmas de la escaleta: contenido que pide y el
     máster no trae, recursos sin archivo, notas de tiempo ambiguas.

  3. Extraé un frame donde se vea la placa de nombre quemada y CONFIRMÁ el
     nombre con Isaac. Las escaletas se escriben antes de grabar y hay un caso
     verificado por materia en que erraron el nombre — y uno en que erraron
     cuántas personas hay en cámara.

  4. Leé los subtítulos generados (captions.ts). Whisper inventa palabras que
     existen: "a los negros de crecimiento" por "a los métodos de crecimiento".
     Se corrigen con CAPTION_FIX en el data.ts, NUNCA editando captions.ts.

  5. Mirá la tabla de segmentos del tracker: dónde está parado el docente
     decide qué gráfico es protagonista. Escribilo en la cabecera del data.ts.

  6. Copiá ${rel(path.join(dir, 'data.draft.ts'))}
     a data.ts, completalo, y borrá el draft.

  7. npm run check -- ${code}              (los verificadores, antes de aprobar)
     npm run export:ae -- ${code}          (manifiesto para After Effects)
     npm run ae -- ${code}                 (arma el .aep, stills y chequeo)
     npm run publicar -- ${code}           (sólo si todo pasó: commit, push y PR)
`);
};

try {
  await main();
} catch (e) {
  console.error(`\n✗ ${e.message}`);
  process.exit(1);
}
