/**
 * check — los verificadores de un episodio, en orden de costo creciente.
 *
 *   node scripts/check.mjs AMB26-04
 *
 *   1. tsc          los datos del episodio respetan los tipos del motor
 *   2. check-layout ningún bloque pisa a la docente ni los rects quemados, y
 *                   ningún subtítulo pasa de dos líneas (mide con la fuente real)
 *   3. check-contrast los tokens de color cumplen los pisos de contraste
 *   4. marca        «Educaplay» bien escrita en subtítulos y textos en pantalla
 *
 * El control visual del armado en After Effects lo hace `npm run ae`.
 */
import {spawn} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {parseArgs, ROOT} from './lib/common.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));

const run = (cmd, args, opts = {}) =>
  new Promise((resolve, reject) => {
    const p = spawn(cmd, args, {stdio: 'inherit', cwd: ROOT, ...opts});
    p.on('close', (c) => (c === 0 ? resolve() : reject(new Error(`${path.basename(args[args.length - 2] ?? cmd)} salió con ${c}`))));
  });

const tscBin = path.join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc');

/**
 * La marca se escribe «Educaplay». Whisper la transcribe «EducaPlay» y en un
 * kicker puede quedar en mayúsculas: se corrige en data.ts (CAPTION_FIX, o el
 * texto del bloque), nunca en el archivo generado.
 */
const MAL = /\b(EducaPlay|EDUCAPLAY|Educa\s+Play|educaplay)\b/;
const checkMarca = async (code) => {
  const data = await import(pathToFileURL(path.join(ROOT, 'src', 'episodes', code, 'data.ts')).href);
  const malos = [];
  for (const c of data.CAPTIONS ?? []) if (MAL.test(c.text)) malos.push(`subtítulo f${c.from}: «${c.text}»`);
  for (const b of data.BLOCKS ?? []) {
    const textos = [b.title, b.kicker, b.caption, b.label, b.note,
      ...(b.items ?? []).flatMap((i) => [i.term, i.detail, i.label]), ...(b.chips ?? []).map((c) => c.text)];
    for (const t of textos) if (t && MAL.test(t)) malos.push(`${b.key}: «${t}»`);
    // Un kicker se muestra en mayúsculas: la marca no puede ir ahí ni bien escrita.
    if (b.kicker && /educa\s*play/i.test(b.kicker) && !MAL.test(b.kicker)) malos.push(`${b.key}: kicker «${b.kicker}» (va en mayúsculas)`);
  }
  if (malos.length) {
    throw new Error('la marca se escribe «Educaplay» (corregilo en data.ts; en subtítulos, con CAPTION_FIX):\n  ' + malos.join('\n  '));
  }
  console.log('✓ marca «Educaplay» bien escrita en pantalla');
};

const main = async () => {
  const {code} = parseArgs();
  if (!code) throw new Error('Uso: npm run check -- <CODE>');

  await run(process.execPath, [tscBin, '--noEmit']);
  await run(process.execPath, ['--experimental-strip-types', path.join(here, 'check-layout.mjs'), code]);
  await run(process.execPath, [path.join(here, 'check-contrast.mjs'), code]);
  await checkMarca(code);
  console.log('\n✓ todos los verificadores en verde.');
};

main().catch((e) => { console.error('\n✗ ' + e.message); process.exit(1); });
