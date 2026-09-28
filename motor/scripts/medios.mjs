/**
 * medios — trae a este repo los medios pesados de un episodio que ya existe en
 * otra carpeta de trabajo, sin duplicarlos (enlace duro; copia si es otro disco).
 *
 *   npm run medios -- AMB26-04 --desde "<carpeta con public/>"
 *   npm run medios -- --modelo                     (sólo el modelo de Whisper)
 *
 * Por defecto `--desde` es el motor viejo de Ambiente en EducaPlay Secundaria.
 * Enlaza, dentro de motor/:
 *
 *   public/videos/<CODE>.mp4   el máster que miden los scripts y usa AE
 *   public/<CODE>/             los recursos normalizados del episodio
 *   public/fonts/              las fuentes que usa check-layout para medir
 *   models/ggml-large-v3-turbo.bin   el modelo de Whisper (si hace falta)
 *
 * Nada de esto se versiona (.gitignore): son medios, no código. Un episodio
 * NUEVO no pasa por acá: `npm run nuevo` lo toma de la carpeta de entrega.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {parseArgs, ROOT} from './lib/common.mjs';

const DEFAULT_FROM = path.join(os.homedir(), 'Documents', 'EducaPlay', 'Secundaria ', 'Ambiente', 'remotion');

const link = (src, dst) => {
  if (!fs.existsSync(src)) throw new Error(`No existe ${src}`);
  fs.mkdirSync(path.dirname(dst), {recursive: true});
  if (fs.existsSync(dst)) return 'ya estaba';
  try {
    fs.linkSync(src, dst);
    return 'enlace duro';
  } catch {
    fs.copyFileSync(src, dst);
    return 'copia';
  }
};

const linkDir = (src, dst) => {
  if (!fs.existsSync(src)) throw new Error(`No existe ${src}`);
  let n = 0;
  for (const f of fs.readdirSync(src)) {
    if (f.startsWith('.')) continue;
    const s = path.join(src, f);
    if (fs.statSync(s).isDirectory()) continue;
    link(s, path.join(dst, f));
    n++;
  }
  return n;
};

const main = () => {
  const {code, flags} = parseArgs();
  const from = path.resolve(String(flags.desde ?? DEFAULT_FROM));
  const rel = (p) => path.relative(ROOT, p);

  const modelDst = path.join(ROOT, 'models', 'ggml-large-v3-turbo.bin');
  if (flags.modelo || !fs.existsSync(modelDst)) {
    const candidates = [
      path.join(from, 'models', 'ggml-large-v3-turbo.bin'),
      path.join(from, '.cache', 'models', 'ggml-large-v3-turbo.bin'),
    ];
    const found = candidates.find((c) => fs.existsSync(c));
    if (found) console.log(`✓ ${rel(modelDst)} · ${link(found, modelDst)}`);
    else console.log(`⚠ No encontré el modelo de Whisper en ${from}. Ver motor/README o transcribe.mjs.`);
  }
  if (!code) {
    if (!flags.modelo) throw new Error('Uso: npm run medios -- <CODE> [--desde <ruta>]');
    return;
  }

  console.log(`✓ ${rel(path.join(ROOT, 'public', 'videos', `${code}.mp4`))} · ` +
    link(path.join(from, 'public', 'videos', `${code}.mp4`), path.join(ROOT, 'public', 'videos', `${code}.mp4`)));
  console.log(`✓ public/${code}/ · ${linkDir(path.join(from, 'public', code), path.join(ROOT, 'public', code))} archivos`);
  console.log(`✓ public/fonts/ · ${linkDir(path.join(from, 'public', 'fonts'), path.join(ROOT, 'public', 'fonts'))} archivos`);
};

try {
  main();
} catch (e) {
  console.error(`✗ ${e.message}`);
  process.exit(1);
}
