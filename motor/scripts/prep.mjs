/**
 * prep — medir, transcribir y alinear un episodio de una sola pasada.
 *
 *   node scripts/prep.mjs AMB24-02 [--master ruta] [--skip-transcribe]
 *
 * Corre track-presenter → transcribe → align-cues y deja la tabla de cues en
 * pantalla, que es lo único de este flujo que necesita ojo humano.
 */
import {spawn} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseArgs} from './lib/common.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));

const run = (script, args) =>
  new Promise((resolve, reject) => {
    const p = spawn(process.execPath, [path.join(here, script), ...args], {
      stdio: 'inherit',
    });
    p.on('close', (c) => (c === 0 ? resolve() : reject(new Error(`${script} salió con ${c}`))));
  });

const main = async () => {
  const {flags, code} = parseArgs();
  if (!code) throw new Error('Uso: node scripts/prep.mjs <CODE> [--master ruta]');
  const master = flags.master ? ['--master', flags.master] : [];

  console.log(`\n━━ 1/3 midiendo el encuadre ━━`);
  await run('track-presenter.mjs', [code, ...master, '--assert']);

  if (!flags['skip-transcribe']) {
    console.log(`\n━━ 2/3 transcribiendo ━━`);
    await run('transcribe.mjs', [code, ...master]);
  }

  console.log(`\n━━ 3/3 alineando palabras-gatillo ━━`);
  await run('align-cues.mjs', [code, '--report']);

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  LEER LA TABLA DE ARRIBA ANTES DE SEGUIR.

  Un score de 1.00 significa que la palabra existe, NO que sea la
  correcta. La escaleta a veces pide un titular "desde <palabra>" y
  esa palabra no se dice nunca en el video.

  Después: escribir src/episodes/${code}/data.ts y correr
    npm run check -- ${code}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
};

main().catch((e) => { console.error('\n✗ ' + e.message); process.exit(1); });
