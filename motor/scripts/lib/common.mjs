/**
 * Utilidades compartidas por los scripts de la serie Leo.
 *
 * Viene del motor de episodios de EducaPlay Secundaria, con la ruta de episodios
 * PARAMETRIZADA: el original tenía `path.join(ROOT, '..', 'Capitulos ')`
 * hardcodeado (con el espacio final real), lo que lo ataba a ese proyecto.
 */
import {execFile, execFileSync, spawn} from 'node:child_process';
import {promisify} from 'node:util';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const execFileP = promisify(execFile);

export const ROOT = path.resolve(fileURLToPath(import.meta.url), '../../..');

/**
 * Carpeta donde el montajista entrega cada episodio (<CODE>/ con el máster, la
 * escaleta .docx y RECURSOS/). No vive en este repo: son medios pesados.
 * Override con EDUCAPLAY_EPISODES.
 */
export const EPISODES_ROOT =
  process.env.EDUCAPLAY_EPISODES ??
  path.join(os.homedir(), 'Documents', 'EducaPlay', 'Secundaria ', 'Ambiente');

export const episodeDir = (code) => path.join(ROOT, 'src', 'episodes', code);

/** Parseo mínimo de flags: --clave valor | --flag | code posicional. */
export const parseArgs = (argv = process.argv.slice(2)) => {
  const flags = {};
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      // Se acepta tanto `--flag valor` como `--flag=valor`.
      const eq = a.indexOf('=');
      if (eq > 2) {
        flags[a.slice(2, eq)] = a.slice(eq + 1);
        continue;
      }
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        flags[key] = next;
        i++;
      } else flags[key] = true;
    } else positional.push(a);
  }
  return {flags, positional, code: positional[0]};
};

export const requireKey = () => {
  const envPath = path.join(ROOT, '.env');
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.+?)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  }
  const key = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
  if (!key) {
    throw new Error(
      'Falta GEMINI_API_KEY. Poné la clave en motor/.env o exportala.',
    );
  }
  return key;
};

/**
 * Busca el máster del episodio.
 *
 * Primero la copia de trabajo en `public/videos/<CODE>.mp4`, que es la misma
 * que export-ae copia para After Effects. Medir una y montar otra es la clase
 * de desfasaje que nadie nota hasta el render final, así que el tracker mide
 * exactamente el archivo que se usa.
 *
 * Si no está, cae a la carpeta del episodio, como en la serie Leo.
 */
export const masterFor = (code, override) => {
  if (override) return path.resolve(override);

  const working = path.join(ROOT, 'public', 'videos', `${code}.mp4`);
  if (fs.existsSync(working)) return working;

  const dir = path.join(EPISODES_ROOT, code);
  if (!fs.existsSync(dir)) {
    throw new Error(
      `No hay máster: ni ${path.relative(ROOT, working)} ni la carpeta ${dir}`,
    );
  }
  const vids = fs
    .readdirSync(dir)
    .filter((f) => /\.(mp4|mov|mxf)$/i.test(f))
    .map((f) => ({f, t: fs.statSync(path.join(dir, f)).mtimeMs}))
    .sort((a, b) => b.t - a.t);
  if (!vids.length) throw new Error(`Sin video en ${dir}`);
  return path.join(dir, vids[0].f);
};

export const ffprobeInfo = async (file) => {
  const {stdout} = await execFileP('ffprobe', [
    '-v', 'error',
    '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height,r_frame_rate,nb_frames,duration',
    '-of', 'json',
    file,
  ]);
  const s = JSON.parse(stdout).streams[0];
  const [n, d] = s.r_frame_rate.split('/').map(Number);
  const fps = n / d;
  return {
    width: Number(s.width),
    height: Number(s.height),
    fps,
    durationInFrames: Number(s.nb_frames) || Math.round(Number(s.duration) * fps),
    duration: Number(s.duration),
  };
};

/**
 * fps REAL del máster del episodio. Todo lo que convierte segundos a frames
 * —transcripción, palabras-gatillo, borrador del data.ts— tiene que usar ésta.
 *
 * El motor asumía 25 en tres lugares (`transcribe`, `lib/cues`, `escaleta`).
 * Todos los capítulos anteriores eran de 25 y nadie lo notó hasta AMB26-02,
 * que llegó a 23,976: los subtítulos y los cues se corrían 1 frame cada 25,
 * ~190 frames (7,6 s) al final del capítulo, y el último subtítulo caía
 * después del último frame del máster.
 */
export const masterFps = (code, override) => {
  const out = execFileSync('ffprobe', [
    '-v', 'error', '-select_streams', 'v:0',
    '-show_entries', 'stream=r_frame_rate', '-of', 'csv=p=0',
    masterFor(code, override),
  ]).toString().trim();
  const [n, d] = out.split('/').map(Number);
  return n / (d || 1);
};

/** ffmpeg que escribe a stdout, consumido como stream binario. */
export const ffmpegStream = (args) =>
  spawn('ffmpeg', args, {stdio: ['ignore', 'pipe', 'pipe']});

export const writeJson = (file, data) => {
  fs.mkdirSync(path.dirname(file), {recursive: true});
  fs.writeFileSync(file, JSON.stringify(data));
  return file;
};

export const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));

export const fmtFrame = (f, fps = 25) => {
  const t = f / fps;
  const m = Math.floor(t / 60);
  const s = (t % 60).toFixed(2).padStart(5, '0');
  return `${m}:${s}`;
};
