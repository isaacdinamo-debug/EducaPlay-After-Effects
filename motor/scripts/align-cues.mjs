/**
 * align-cues — resuelve las palabras-gatillo de la escaleta a números de frame.
 *
 *   node scripts/align-cues.mjs AMB24-01 [--report] [--strict]
 *
 * Entrada:  src/episodes/<CODE>/words.json  +  src/episodes/<CODE>/cues.def.json
 * Salida:   src/episodes/<CODE>/cues.ts
 *
 * El matcher difuso vive en `lib/cues.mjs`, COMPARTIDO con `npm run escaleta`.
 * Si cada script tuviera el suyo, la propuesta de la escaleta diría un frame y
 * esto otro, y la propuesta dejaría de servir para decidir nada.
 *
 * El reporte se firma A MANO. En LEO016 la escaleta pedía un titular "desde
 * descubrir" y el profesor nunca dice esa palabra: el matcher la resolvió a
 * "relaciones" sin protestar. Ese tipo de error sólo lo caza un humano mirando
 * la tabla, y por eso `prep` se detiene acá en vez de seguir de largo.
 */
import fs from 'node:fs';
import path from 'node:path';
import {episodeDir, fmtFrame, masterFps, parseArgs, readJson} from './lib/common.mjs';
import {resolveCues, tokenize} from './lib/cues.mjs';

const main = () => {
  const {flags, code} = parseArgs();
  if (!code) throw new Error('Uso: node scripts/align-cues.mjs <CODE>');

  const dir = episodeDir(code);
  const words = readJson(path.join(dir, 'words.json'));
  const defPath = path.join(dir, 'cues.def.json');
  if (!fs.existsSync(defPath)) {
    throw new Error(`Falta ${defPath} — declará ahí las palabras-gatillo.`);
  }

  const FPS = masterFps(code, flags.master);
  const {cues, rows} = resolveCues(readJson(defPath), tokenize(words, FPS));

  fs.writeFileSync(
    path.join(dir, 'cues.ts'),
    `/* GENERADO por scripts/align-cues.mjs — no editar a mano. */\n` +
      `export type Cue = {f: number; matched: string; score: number};\n\n` +
      `export const CUES: Record<string, Cue | null> = ${JSON.stringify(cues, null, 2)};\n`,
  );

  if (flags.report || flags.strict) {
    const w = [18, 7, 9, 22, 6];
    const head = ['cue', 'frame', 'tc', 'coincidencia', 'score'];
    console.log(head.map((h, i) => h.padEnd(w[i])).join(''));
    console.log(w.map((n) => '─'.repeat(n - 1)).join(' '));
    for (const r of rows) {
      const cells = [
        r.key,
        r.f == null ? '—' : String(r.f),
        r.f == null ? '—' : fmtFrame(r.f, FPS),
        r.matched ?? 'SIN COINCIDENCIA',
        r.score.toFixed(2),
      ];
      console.log(cells.map((c, i) => String(c).padEnd(w[i])).join(''));
    }
  }

  const bad = rows.filter((r) => r.score < 0.8);
  console.log(`\n${rows.length} cues · ${bad.length} por debajo de 0.80`);
  console.log(`→ ${path.relative(process.cwd(), path.join(dir, 'cues.ts'))}`);

  if (flags.strict && bad.length) {
    console.error('✗ --strict: hay cues de baja confianza. Revisá la tabla.');
    process.exit(1);
  }
};

main();
