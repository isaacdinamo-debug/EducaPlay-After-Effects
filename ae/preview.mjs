/**
 * ae/preview.mjs — video de revisión de un capítulo ya armado.
 *
 *   npm run preview -- <CODE>              (desde motor/) → episodios/<CODE>/preview/<CODE>.mp4
 *   npm run preview -- <CODE> --clasico    el <CODE>-clasico.aep → <CODE>-clasico.mp4
 *   npm run preview -- <CODE> --comparar   además, <CODE>-comparativo.mp4: clásico | vivo
 *   --tramo 500  --timeout 240             cuadros por tramo y segundos máximos por tramo
 *
 * Renderiza con aerender (no hace falta tener AE abierto) POR TRAMOS y los une
 * con ffmpeg. Por qué tramos y no el capítulo de una:
 *   · aerender redirigido no informa avance: por tramo sí se sabe el %;
 *   · aerender se puede colgar sin error en UN cuadro (le pasó con un JPEG con
 *     credenciales C2PA): con tramos se sabe cuál, y qué recurso está ahí.
 *
 * Usa las plantillas de render por defecto a propósito: en AE en español los
 * nombres ("Configuración óptima"…) no coinciden y hasta el que devuelve AE
 * puede no aceptarse de vuelta.
 */
import fs from 'node:fs';
import path from 'node:path';
import {spawn, spawnSync, execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {aerenderPath, WIN} from './ae-app.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const args = (() => {
  const out = {flags: {}, code: null};
  const a = process.argv.slice(2);
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith('--')) {
      const [k, v] = a[i].slice(2).split('=');
      if (v !== undefined) out.flags[k] = v;
      else if (a[i + 1] && !a[i + 1].startsWith('--')) out.flags[k] = a[++i];
      else out.flags[k] = true;
    } else if (!out.code) out.code = a[i];
  }
  return out;
})();

/** Mata aerender y su aerendercore (el que de verdad renderiza). */
const killTree = (child) => {
  try {
    if (WIN) spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F']);
    else process.kill(-child.pid, 'SIGKILL');
  } catch { /* ya terminó */ }
};

/** Renderiza [s, e] a `out`. Resuelve {ok, secs}; si pasa el timeout, lo mata. */
const renderTramo = (aerender, aep, comp, s, e, out, timeoutS) => new Promise((resolve) => {
  const t0 = Date.now();
  const child = spawn(aerender, ['-project', aep, '-comp', comp, '-s', String(s), '-e', String(e), '-output', out], {
    stdio: ['ignore', 'pipe', 'pipe'], detached: !WIN,
  });
  let log = '';
  child.stdout.on('data', (d) => (log += d));
  child.stderr.on('data', (d) => (log += d));
  const timer = setTimeout(() => { killTree(child); resolve({ok: false, hung: true, secs: timeoutS, log}); }, timeoutS * 1000);
  child.on('close', () => {
    clearTimeout(timer);
    // aerender elige la extensión según la plantilla: se busca lo que escribió.
    const base = path.basename(out, path.extname(out));
    const got = fs.readdirSync(path.dirname(out)).find((f) => f.startsWith(base + '.') && !f.endsWith('.log'));
    resolve({ok: !!got && fs.statSync(path.join(path.dirname(out), got)).size > 0,
      file: got && path.join(path.dirname(out), got), secs: Math.round((Date.now() - t0) / 1000), log});
  });
});

/** Qué bloques con medio caen en [s, e]: los sospechosos si un tramo se cuelga. */
const recursosEn = (M, s, e) => M.blocks
  .filter((b) => b.from <= e && b.to >= s)
  .flatMap((b) => [b.src, ...(b.items ?? []).map((i) => i.src)].filter(Boolean).map((src) => `${b.key} (${src})`));

const preview = async (code, clasico, M, tramo, timeoutS) => {
  const dir = path.join(REPO, 'episodios', code);
  const name = `${code}${clasico ? '-clasico' : ''}`;
  const aep = path.join(dir, `${name}.aep`);
  if (!fs.existsSync(aep)) throw new Error(`No existe ${path.relative(REPO, aep)}: corré npm run ae -- ${code}${clasico ? ' --clasico' : ''}`);
  const outDir = path.join(dir, 'preview');
  const work = path.join(outDir, `${name}.tramos`);
  fs.rmSync(work, {recursive: true, force: true});
  fs.mkdirSync(work, {recursive: true});

  const aerender = aerenderPath();
  const n = Math.ceil(M.duration / tramo);
  const files = [];
  console.log(`\n▶ ${name}: ${M.duration} cuadros en ${n} tramos`);
  for (let i = 0; i < n; i++) {
    const s = i * tramo, e = Math.min(M.duration, s + tramo) - 1;
    const out = path.join(work, `t${String(i + 1).padStart(2, '0')}.mp4`);
    const r = await renderTramo(aerender, aep, code, s, e, out, timeoutS);
    if (!r.ok) {
      const sosp = recursosEn(M, s, e);
      throw new Error(`el tramo ${i + 1}/${n} (cuadros ${s}–${e}) ${r.hung ? `no terminó en ${timeoutS} s` : 'falló'}.\n` +
        (sosp.length ? `  Recursos en ese tramo: ${sosp.join(', ')}.\n  Si uno trae credenciales C2PA (imágenes hechas con IA), volvé a exportar con npm run export:ae.` : '') +
        (r.hung ? '' : `\n  aerender: ${r.log.split('\n').filter((l) => /error/i.test(l)).slice(0, 3).join(' | ')}`));
    }
    files.push(r.file);
    console.log(`  tramo ${i + 1}/${n} listo (${s}–${e}) en ${r.secs} s · ${Math.round(((i + 1) * 100) / n)} %`);
  }
  const list = path.join(work, 'lista.txt');
  fs.writeFileSync(list, files.map((f) => `file '${f.replace(/\\/g, '/').replace(/'/g, "'\\''")}'`).join('\n'));
  const final = path.join(outDir, `${name}.mp4`);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', final]);
  fs.rmSync(work, {recursive: true, force: true});
  console.log(`✓ ${path.relative(REPO, final)}`);
  return final;
};

const main = async () => {
  const {code, flags} = args;
  if (!code) throw new Error('Uso: npm run preview -- <CODE> [--clasico] [--comparar] [--tramo 500] [--timeout 240]');
  const M = JSON.parse(fs.readFileSync(path.join(REPO, 'episodios', code, 'manifest.json'), 'utf8'));
  const tramo = Number(flags.tramo ?? 500), timeoutS = Number(flags.timeout ?? 240);

  const hecho = await preview(code, !!flags.clasico, M, tramo, timeoutS);
  if (flags.comparar && !flags.clasico) {
    const otro = await preview(code, true, M, tramo, timeoutS);
    const cmp = path.join(REPO, 'episodios', code, 'preview', `${code}-comparativo.mp4`);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', otro, '-i', hecho, '-filter_complex',
      '[0:v]scale=960:540[a];[1:v]scale=960:540[b];[a][b]hstack[v]', '-map', '[v]', '-map', '1:a?',
      '-c:v', 'libx264', '-crf', '20', '-preset', 'fast', '-c:a', 'aac', cmp]);
    console.log(`✓ ${path.relative(REPO, cmp)} (izquierda: clásico · derecha: vivo)`);
  }
};

main().catch((e) => {
  console.error(`\n✗ ${e.message}`);
  process.exit(1);
});
