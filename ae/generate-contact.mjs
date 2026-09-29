import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const code = process.argv[2] || 'AMB26-01';

const revDir = path.join(REPO, 'episodios', code, 'revision');
const stillDir = path.join(revDir, 'stills');
const sheet = path.join(revDir, 'contacto.jpg');

if (!fs.existsSync(stillDir)) {
  console.error(`No existe el directorio de stills: ${stillDir}`);
  process.exit(1);
}

const files = fs.readdirSync(stillDir).filter(f => f.endsWith('.png')).sort().map(f => path.join(stillDir, f));

if (files.length === 0) {
  console.log('Esperando a que After Effects termine de escribir los stills...');
  let attempts = 0;
  while (attempts < 60) {
    await new Promise(r => setTimeout(r, 1000));
    const current = fs.readdirSync(stillDir).filter(f => f.endsWith('.png')).sort().map(f => path.join(stillDir, f));
    if (current.length > 0 && current.every(f => fs.existsSync(f) && fs.statSync(f).size > 0)) {
      await new Promise(r => setTimeout(r, 1500));
      break;
    }
    attempts++;
  }
}

const pngs = fs.readdirSync(stillDir).filter(f => f.endsWith('.png')).sort().map(f => path.join(stillDir, f));
if (pngs.length === 0) {
  console.error('No se encontraron PNGs en ' + stillDir);
  process.exit(1);
}

console.log(`Generando hoja de contacto con ${pngs.length} stills...`);
const cols = 2, w = 640, h = 360;
const n = pngs.length;
const inputs = pngs.flatMap((p) => ['-i', p]);
const scaled = pngs.map((_, i) => `[${i}]scale=${w}:${h}[v${i}]`).join(';');
const layout = pngs.map((_, i) => `${(i % cols) * w}_${Math.floor(i / cols) * h}`).join('|');
const filter = n === 1 ? `[0]scale=${w}:${h}` :
  `${scaled};${pngs.map((_, i) => `[v${i}]`).join('')}xstack=inputs=${n}:layout=${layout}:fill=black`;

execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', filter, '-frames:v', '1', '-q:v', '4', sheet]);
console.log(`✓ Hoja de contacto generada en: ${sheet}`);
