/**
 * transcribe — transcripción con timing POR PALABRA.
 *
 *   node scripts/transcribe.mjs AMB24-01 [--master ruta] [--model ruta]
 *
 * Salidas: src/episodes/<CODE>/words.json     [[desde, hasta, palabra], ...] en segundos
 *          src/episodes/<CODE>/captions.json  bloques de subtítulo listos para <Captions>
 *
 * Usa whisper.cpp con `-ml 1` (máximo una palabra por segmento): ése es el
 * truco que le saca timing por palabra. Gemini transcribe muy bien pero sólo
 * devuelve segmentos de 4-7 s, y con eso no se puede disparar un titular sobre
 * una palabra concreta — por eso acá whisper no es opcional.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFile, execFileSync} from 'node:child_process';
import {promisify} from 'node:util';
import {episodeDir, masterFor, masterFps, parseArgs, ROOT, writeJson} from './lib/common.mjs';

const execFileP = promisify(execFile);

/** Corte de bloques de subtítulo: fin de oración con piso, o techo duro. */
const MIN_BLOCK_SEC = 3.0;
const MAX_BLOCK_SEC = 6.5;
/** Antes de este frame el timing de whisper no es confiable (música del bumper). */
const UNRELIABLE_BEFORE_SEC = 7.2;

const main = async () => {
  const {flags, code} = parseArgs();
  if (!code) throw new Error('Uso: node scripts/transcribe.mjs <CODE>');

  const master = masterFor(code, flags.master);
  const model = flags.model ?? path.join(ROOT, 'models', 'ggml-large-v3-turbo.bin');
  if (!fs.existsSync(model)) {
    throw new Error(
      `Falta el modelo: ${model}\n` +
        'Bajalo con:\n  curl -L -o models/ggml-large-v3-turbo.bin \\\n' +
        '    https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo.bin',
    );
  }

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'leo-tr-'));
  const wav = path.join(tmp, 'audio.wav');
  console.log('extrayendo audio…');
  await execFileP('ffmpeg', ['-y', '-v', 'error', '-i', master,
    '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le', wav]);

  console.log('transcribiendo (whisper large-v3-turbo, es)…');
  const outBase = path.join(tmp, 'w');
  /**
   * Prompt inicial, opcional: `src/episodes/<CODE>/whisper.prompt.txt`.
   *
   * Whisper se condiciona con lo que ya escribió. En AMB26-02 arrancó sobre la
   * música del bumper sin puntuación y siguió así los tres minutos: todo en
   * minúsculas, sin un punto, con cortes a mitad de frase. Un prompt corto CON
   * puntuación y los nombres propios del capítulo lo saca de ese modo.
   * NO va el guion: el prompt sesga, y si la docente dijo otra cosa manda el
   * audio. Es un archivo y no un flag para que re-correr `nuevo` dé lo mismo.
   */
  const promptFile = path.join(episodeDir(code), 'whisper.prompt.txt');
  const prompt =
    flags.prompt ?? (fs.existsSync(promptFile) ? fs.readFileSync(promptFile, 'utf8').trim() : '');
  if (prompt) console.log(`prompt: «${prompt.slice(0, 80)}${prompt.length > 80 ? '…' : ''}»`);
  await execFileP('whisper-cli', [
    '-m', model, '-f', wav, '-l', 'es',
    '-ml', '1', '-sow', '--output-json-full', '-of', outBase,
    ...(prompt ? ['--prompt', prompt] : []),
  ], {maxBuffer: 64 * 1024 * 1024});

  const raw = JSON.parse(fs.readFileSync(`${outBase}.json`, 'utf8'));
  const words = [];
  for (const seg of raw.transcription) {
    const t = (seg.text ?? '').trim();
    if (!t) continue;
    let from = seg.offsets.from / 1000;
    const to = seg.offsets.to / 1000;
    // Si una palabra tiene duración desmedida (> 2s), es un artefacto de atención
    // sobre música instrumental/bumper. Clampeamos el inicio al momento previo al final.
    if (to - from > 2.0) {
      from = Math.max(from, to - 0.5);
    }
    words.push([from, to, t]);
  }
  fs.rmSync(tmp, {recursive: true, force: true});

  // Lo que whisper "oye" después del último frame del máster es alucinación:
  // en AMB26-02 escribió "Gracias por ver el video." sobre la cola del audio.
  // Se descarta y se avisa.
  const masterDur = Number(
    execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', master])
      .toString()
      .trim(),
  );
  const tail = words.filter((w) => w[0] >= masterDur - 0.05);
  if (tail.length) {
    console.log(
      `⚠ ${tail.length} palabra(s) después del final del máster, descartadas: «${tail.map((w) => w[2]).join(' ')}»`,
    );
    words.splice(words.length - tail.length, tail.length);
  }

  const dir = episodeDir(code);
  writeJson(path.join(dir, 'words.json'), words);

  // Bloques de subtítulo.
  const blocks = [];
  let cur = [];
  for (const w of words) {
    cur.push(w);
    const dur = cur[cur.length - 1][1] - cur[0][0];
    const endsSentence = /[.?!…]$/.test(w[2]);
    if ((endsSentence && dur >= MIN_BLOCK_SEC) || dur >= MAX_BLOCK_SEC) {
      blocks.push(cur);
      cur = [];
    }
  }
  if (cur.length) blocks.push(cur);

  // fps del máster, no 25: ver masterFps en lib/common.mjs (AMB26-02 es 23,976).
  const fps = masterFps(code, flags.master);
  const captions = blocks.map((b) => ({
    from: Math.round(b[0][0] * fps),
    to: Math.round(b[b.length - 1][1] * fps),
    text: b.map((w) => w[2]).join(' '),
  }));
  fs.writeFileSync(
    path.join(dir, 'captions.ts'),
    `/* GENERADO por scripts/transcribe.mjs — no editar a mano. */\n` +
      `export type Caption = {from: number; to: number; text: string};\n\n` +
      `export const CAPTIONS: Caption[] = ${JSON.stringify(captions, null, 2)};\n`,
  );

  const unreliable = words.filter((w) => w[0] < UNRELIABLE_BEFORE_SEC).length;
  console.log(`\n${words.length} palabras · ${captions.length} bloques de subtítulo`);
  console.log(`última palabra: ${words[words.length - 1][1].toFixed(2)}s`);
  if (unreliable) {
    console.log(
      `⚠ ${unreliable} palabras antes de ${UNRELIABLE_BEFORE_SEC}s: whisper las reparte ` +
        'hacia atrás sobre la música del bumper. align-cues las descarta.',
    );
  }
  console.log(`→ ${path.relative(process.cwd(), path.join(dir, 'words.json'))}`);
  console.log(`→ ${path.relative(process.cwd(), path.join(dir, 'captions.ts'))}`);
};

main().catch((e) => { console.error(e.message); process.exit(1); });
