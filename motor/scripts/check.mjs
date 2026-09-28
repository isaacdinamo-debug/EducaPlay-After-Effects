/**
 * check — los verificadores de un episodio, en orden de costo creciente.
 *
 *   node scripts/check.mjs AMB26-04
 *
 *   1. tsc          los datos del episodio respetan los tipos del motor
 *   2. check-layout ningún bloque pisa a la docente ni los rects quemados, y
 *                   ningún subtítulo pasa de dos líneas (mide con la fuente real)
 *   3. check-contrast los tokens de color cumplen los pisos de contraste
 *
 * El control visual del armado en After Effects lo hace `npm run ae`.
 */
import {spawn} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseArgs, ROOT} from './lib/common.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));

const run = (cmd, args, opts = {}) =>
  new Promise((resolve, reject) => {
    const p = spawn(cmd, args, {stdio: 'inherit', cwd: ROOT, ...opts});
    p.on('close', (c) => (c === 0 ? resolve() : reject(new Error(`${path.basename(args[args.length - 2] ?? cmd)} salió con ${c}`))));
  });

const tscBin = path.join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc');

const main = async () => {
  const {code} = parseArgs();
  if (!code) throw new Error('Uso: npm run check -- <CODE>');

  await run(process.execPath, [tscBin, '--noEmit']);
  await run(process.execPath, ['--experimental-strip-types', path.join(here, 'check-layout.mjs'), code]);
  await run(process.execPath, [path.join(here, 'check-contrast.mjs'), code]);
  console.log('\n✓ todos los verificadores en verde.');
};

main().catch((e) => { console.error('\n✗ ' + e.message); process.exit(1); });
