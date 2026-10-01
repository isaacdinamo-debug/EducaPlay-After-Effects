/**
 * doctor — auditoría del entorno: qué le falta a ESTA máquina para que un
 * episodio salga igual que en la máquina donde se aprobó.
 *
 *   npm run doctor                 (la máquina)
 *   npm run doctor -- AMB26-04     (la máquina + ese episodio)
 *
 * Lo que no viaja con el repo y rompe el resultado sin dar error:
 *   · las FUENTES: si falta una, AE la sustituye; el texto mide distinto, las
 *     tarjetas cambian de alto y el cuadro pierde el equilibrio;
 *   · el MÁSTER: otro corte u otra resolución mueve a la docente y desarma
 *     todas las cajas;
 *   · los ARCHIVOS GENERADOS: si `npm run nuevo` vuelve a medir en otra
 *     máquina (otro ffmpeg, otro Whisper), el encuadre y los subtítulos
 *     cambian respecto de lo aprobado;
 *   · las HERRAMIENTAS (ffmpeg, whisper-cli, After Effects) y las rutas de
 *     motor/.env;
 *   · el PLATÓ: sin él, el tracker no sabe qué es fondo y qué es docente.
 *
 * Sale con código 1 si hay algún ✗.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {ENV_FILE, EPISODES_ROOT, parseArgs, ROOT, trackerOpts} from './lib/common.mjs';

const REPO = path.resolve(ROOT, '..');
const WIN = process.platform === 'win32';
const MAC = process.platform === 'darwin';
const results = [];
const ok = (area, msg) => results.push({s: '✓', area, msg});
const warn = (area, msg) => results.push({s: '⚠', area, msg});
const fail = (area, msg) => results.push({s: '✗', area, msg});

const has = (cmd, args = ['-version']) => {
  const r = spawnSync(cmd, args, {encoding: 'utf8', shell: WIN});
  return r.status === 0 ? (r.stdout || r.stderr).split('\n')[0].trim() : null;
};

// ── fuentes: nombre PostScript leído de la tabla `name` de cada archivo ──────
const readAt = (fd, pos, len) => {
  const b = Buffer.alloc(len);
  fs.readSync(fd, b, 0, len, pos);
  return b;
};
const utf16be = (b) => {
  const s = Buffer.from(b);
  for (let i = 0; i + 1 < s.length; i += 2) [s[i], s[i + 1]] = [s[i + 1], s[i]];
  return s.toString('utf16le');
};
const postScriptNames = (file) => {
  const out = new Set();
  let fd;
  try {
    fd = fs.openSync(file, 'r');
    const head = readAt(fd, 0, 12);
    const tag = head.toString('ascii', 0, 4);
    const offsets = tag === 'ttcf'
      ? Array.from({length: head.readUInt32BE(8)}, (_, i) => readAt(fd, 12 + 4 * i, 4).readUInt32BE(0))
      : [0];
    for (const off of offsets) {
      const numTables = readAt(fd, off + 4, 2).readUInt16BE(0);
      const dir = readAt(fd, off + 12, 16 * numTables);
      for (let i = 0; i < numTables; i++) {
        if (dir.toString('ascii', 16 * i, 16 * i + 4) !== 'name') continue;
        const tOff = dir.readUInt32BE(16 * i + 8);
        const tLen = dir.readUInt32BE(16 * i + 12);
        const t = readAt(fd, tOff, tLen);
        const count = t.readUInt16BE(2), strOff = t.readUInt16BE(4);
        for (let j = 0; j < count; j++) {
          const r = 6 + 12 * j;
          if (t.readUInt16BE(r + 6) !== 6) continue; // nameID 6 = PostScript
          const platform = t.readUInt16BE(r);
          const bytes = t.subarray(strOff + t.readUInt16BE(r + 10), strOff + t.readUInt16BE(r + 10) + t.readUInt16BE(r + 8));
          out.add(platform === 1 ? bytes.toString('latin1') : utf16be(bytes));
        }
      }
    }
  } catch { /* archivo no legible: se ignora */ } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
  return out;
};
const fontDirs = () => {
  if (MAC) return [
    {dir: path.join(os.homedir(), 'Library', 'Fonts'), scope: 'usuario'},
    {dir: '/Library/Fonts', scope: 'sistema'},
  ];
  if (WIN) return [
    {dir: path.join(process.env.WINDIR ?? 'C:\\Windows', 'Fonts'), scope: 'sistema'},
    {dir: path.join(process.env.LOCALAPPDATA ?? '', 'Microsoft', 'Windows', 'Fonts'), scope: 'usuario'},
  ];
  return [{dir: '/usr/share/fonts', scope: 'sistema'}, {dir: path.join(os.homedir(), '.fonts'), scope: 'usuario'}];
};
const installedFonts = () => {
  const map = new Map(); // postscript → {file, scope}
  for (const {dir, scope} of fontDirs()) {
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      if (!/\.(otf|ttf|ttc)$/i.test(f)) continue;
      for (const n of postScriptNames(path.join(dir, f))) if (!map.has(n)) map.set(n, {file: f, scope});
    }
  }
  return map;
};

const DEFAULT_FONTS = ['Museo-300', 'Museo-700', 'MuseoSansRounded-300', 'MuseoSansRounded-500',
  'MuseoSansRounded-700', 'MuseoSansRounded-900', 'MuseoSansRounded-1000'];

const git = (...a) => spawnSync('git', a, {cwd: REPO, encoding: 'utf8'});

const main = async () => {
  const {code} = parseArgs();
  const manifestPath = code ? path.join(REPO, 'episodios', code, 'manifest.json') : null;
  const M = manifestPath && fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : null;

  // ── máquina ──
  ok('sistema', `${os.type()} ${os.release()} (${process.platform}/${process.arch})`);
  const [maj, min] = process.versions.node.split('.').map(Number);
  // ≥ 23.6: importa .ts sin bandera, que es lo que hacen los scripts (.nvmrc: 24 LTS).
  if (maj > 23 || (maj === 23 && min >= 6)) ok('node', process.versions.node);
  else fail('node', `${process.versions.node}: hace falta Node 24 LTS (≥ 23.6; ver .nvmrc)`);

  for (const [cmd, need, flag] of [['ffmpeg', 'export y medición', '-version'], ['ffprobe', 'export y medición', '-version'], ['git', 'publicar', '--version']]) {
    const v = has(cmd, [flag]);
    if (v) ok(cmd, v.slice(0, 70));
    else fail(cmd, `no está en el PATH (lo usa ${need})`);
  }
  if (has('whisper-cli', ['--help'])) ok('whisper-cli', 'disponible');
  else warn('whisper-cli', 'no está en el PATH: sólo hace falta para medir un episodio NUEVO (npm run nuevo)');
  if (has('gh', ['--version'])) ok('gh', 'disponible');
  else warn('gh', 'no está: publicar hace el push pero no puede abrir el PR');

  try {
    createRequire(import.meta.url)('canvas');
    ok('canvas', 'el módulo nativo carga (check-layout mide con la fuente real)');
  } catch (e) {
    fail('canvas', `no carga: ${e.message.split('\n')[0]} — npm install en motor/`);
  }

  // After Effects
  let ae = null;
  if (MAC) {
    const apps = fs.existsSync('/Applications') ? fs.readdirSync('/Applications').filter((f) => /^Adobe After Effects 20\d\d$/.test(f)).sort() : [];
    ae = apps.pop() ?? null;
  } else if (WIN) {
    const base = path.join(process.env.ProgramFiles ?? 'C:\\Program Files', 'Adobe');
    const dirs = fs.existsSync(base) ? fs.readdirSync(base).filter((f) => /^Adobe After Effects( CC)? 20\d\d$/.test(f)).sort() : [];
    ae = dirs.reverse().find((d) => fs.existsSync(path.join(base, d, 'Support Files', 'AfterFX.exe'))) ?? null;
  }
  if (process.env.AE_APP) ok('After Effects', `AE_APP=${process.env.AE_APP}`);
  else if (ae) {
    if (/2026/.test(ae)) ok('After Effects', ae);
    else warn('After Effects', `${ae}: se aprobó con 2026; otra versión puede medir el texto distinto`);
  } else fail('After Effects', 'no lo encontré instalado (o definí AE_APP)');

  // Fuentes
  const need = M?.fontsRequired ?? DEFAULT_FONTS;
  const fonts = installedFonts();
  const missing = need.filter((n) => !fonts.has(n));
  if (!missing.length) ok('fuentes', `las ${need.length} están instaladas (${[...new Set(need.map((n) => fonts.get(n).scope))].join(' + ')})`);
  for (const n of missing) {
    const similar = [...fonts.keys()].filter((k) => k.toLowerCase().replace(/[^a-z0-9]/g, '').includes(n.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10)));
    fail('fuentes', `falta ${n}` + (similar.length ? ` (hay parecidas: ${similar.slice(0, 4).join(', ')}: otra versión o otro nombre PostScript)` : ''));
  }
  if (WIN) {
    const perUser = need.filter((n) => fonts.get(n)?.scope === 'usuario');
    if (perUser.length) warn('fuentes', `${perUser.length} instaladas sólo para tu usuario. Si AE no las ve, reinstalalas con clic derecho → "Instalar para todos los usuarios" y reiniciá AE`);
  }

  // Rutas
  if (!fs.existsSync(ENV_FILE)) warn('.env', 'no existe motor/.env: copiá motor/.env.example y completá las rutas de esta PC');
  for (const [v, para] of [['EDUCAPLAY_EPISODES', 'npm run nuevo'], ['EDUCAPLAY_MEDIOS', 'npm run medios']]) {
    const val = process.env[v];
    if (!val) warn('rutas', `falta ${v} en motor/.env (sólo hace falta para ${para})`);
    else if (!fs.existsSync(val)) fail('rutas', `${v} = ${val}: no existe`);
    else if (WIN && /\s[\\/]|\s$/.test(val)) fail('rutas', `${v}: una carpeta termina en espacio y Windows no la admite; renombrala`);
    else ok('rutas', `${v} = ${val}`);
  }
  const model = path.join(ROOT, 'models', 'ggml-large-v3-turbo.bin');
  if (fs.existsSync(model)) ok('modelo Whisper', path.relative(REPO, model));
  else warn('modelo Whisper', 'no está en motor/models: sólo hace falta para npm run nuevo');

  const eol = git('config', '--get', 'core.autocrlf').stdout.trim();
  if (fs.existsSync(path.join(REPO, '.gitattributes'))) ok('fin de línea', '.gitattributes fija LF en los archivos del repo');
  else if (eol === 'true') warn('fin de línea', 'core.autocrlf=true sin .gitattributes: los archivos generados pueden aparecer como modificados');

  // ── episodio ──
  if (code) {
    const epDir = path.join(ROOT, 'src', 'episodes', code);
    if (!fs.existsSync(path.join(epDir, 'data.ts'))) {
      fail(code, `no existe motor/src/episodes/${code}/data.ts en esta rama (${git('branch', '--show-current').stdout.trim()}). ¿Está mezclado el PR del episodio?`);
    } else ok(code, 'data.ts presente');

    // Archivos generados: tienen que ser los aprobados (los del commit).
    const gen = ['track.ts', 'track.frames.json', 'cues.ts', 'captions.ts', 'words.json', 'escaleta.json'];
    const st = git('status', '--porcelain', '--', ...gen.map((g) => path.join('motor', 'src', 'episodes', code, g))).stdout.trim();
    if (st) {
      fail(code, 'los archivos MEDIDOS cambiaron respecto de lo aprobado (se volvió a correr nuevo/prep en esta máquina):\n' +
        st.split('\n').map((l) => '      ' + l).join('\n') +
        `\n    Volvé a lo aprobado con: git checkout -- motor/src/episodes/${code}/ (y npm run export:ae)`);
    } else if (fs.existsSync(epDir)) ok(code, 'encuadre, gatillos y subtítulos son los aprobados (sin cambios contra git)');

    // Plató
    const {estudioDe} = await import(pathToFileURL(path.join(ROOT, 'src/brand/estudios.ts')).href);
    try {
      const est = estudioDe(code, trackerOpts(code).studio);
      if (est) ok(code, `plató: ${est.nombre}`);
      else fail(code, `plató sin declarar: ni la materia (src/brand/estudios.ts) ni src/episodes/${code}/tracker.json ` +
        `dicen dónde se grabó. npm run track -- ${code} lo frena y muestra el color de fondo medido.`);
    } catch (e) {
      fail(code, e.message);
    }

    // Recursos que usa check-layout (public/<CODE>/) y sus fuentes (public/fonts/)
    try {
      const data = await import(pathToFileURL(path.join(epDir, 'data.ts')).href);
      const srcs = [...new Set((data.BLOCKS ?? []).flatMap((b) => [b.src, ...(b.items ?? []).map((i) => i.src)]).filter(Boolean))];
      const faltan = srcs.filter((s) => !fs.existsSync(path.join(ROOT, 'public', s)));
      if (faltan.length) fail(code, `faltan ${faltan.length} recursos en motor/public/: ${faltan.slice(0, 4).join(', ')}` +
        `${faltan.length > 4 ? '…' : ''} (npm run medios -- ${code}, o nuevo si es un capítulo nuevo)`);
      else ok(code, `los ${srcs.length} recursos del data.ts están en motor/public/`);
    } catch (e) {
      warn(code, `no pude leer el data.ts para revisar los recursos: ${e.message.split('\n')[0]}`);
    }
    const fontsDir = path.join(ROOT, 'public', 'fonts');
    if (!fs.existsSync(fontsDir) || !fs.readdirSync(fontsDir).length) {
      fail(code, `falta motor/public/fonts/ (check-layout mide con esas fuentes): npm run medios -- ${code}`);
    }

    // Máster
    const master = path.join(ROOT, 'public', 'videos', `${code}.mp4`);
    if (!fs.existsSync(master)) {
      fail(code, `falta el máster motor/public/videos/${code}.mp4 (npm run medios -- ${code})`);
    } else {
      const r = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries',
        'stream=width,height,r_frame_rate,nb_frames', '-of', 'json', master], {encoding: 'utf8'});
      let info = null;
      try {
        const s = JSON.parse(r.stdout).streams[0];
        const [n, d] = s.r_frame_rate.split('/').map(Number);
        info = {bytes: fs.statSync(master).size, width: s.width, height: s.height,
          fps: Math.round((n / d) * 1000) / 1000, frames: Number(s.nb_frames)};
      } catch { /* sin ffprobe */ }
      const ref = git('show', `HEAD:episodios/${code}/manifest.json`).stdout;
      const approved = ref ? JSON.parse(ref).masterInfo : null;
      if (!info) warn(code, 'no pude leer el máster con ffprobe');
      else if (!approved) warn(code, `máster ${info.width}×${info.height} ${info.fps} fps, ${info.frames} cuadros (el manifiesto aprobado no tiene huella para comparar)`);
      else {
        const diffs = ['bytes', 'width', 'height', 'fps', 'frames'].filter((k) => approved[k] !== info[k]);
        if (diffs.length) fail(code, `el máster NO es el aprobado: ${diffs.map((k) => `${k} ${info[k]} ≠ ${approved[k]}`).join(', ')}`);
        else ok(code, `máster idéntico al aprobado (${info.width}×${info.height}, ${info.fps} fps, ${info.frames} cuadros)`);
      }
    }
    if (M) {
      const assets = path.join(REPO, 'episodios', code, 'assets');
      const faltan = [M.master, ...M.blocks.flatMap((b) => [b.src, ...(b.items ?? []).map((i) => i.src)])]
        .filter(Boolean).filter((a, i, all) => all.indexOf(a) === i)
        .filter((a) => !fs.existsSync(path.join(REPO, 'episodios', code, a)));
      if (!fs.existsSync(assets) || faltan.length) warn(code, `faltan ${faltan.length} assets en episodios/${code}/ — corré npm run export:ae -- ${code}`);
      else ok(code, 'assets del manifiesto presentes');
      const md = git('diff', '--stat', '--', `episodios/${code}/manifest.json`).stdout.trim();
      if (md) warn(code, 'el manifiesto de esta máquina difiere del aprobado (git diff episodios/' + code + '/manifest.json): revisá cajas y subtítulos antes de armar');
    }
  }

  // ── informe ──
  const w = Math.max(...results.map((r) => r.area.length));
  console.log(`\nAuditoría del entorno${code ? ` · ${code}` : ''}\n`);
  for (const r of results) console.log(`${r.s} ${r.area.padEnd(w)}  ${r.msg}`);
  const bad = results.filter((r) => r.s === '✗').length;
  const soso = results.filter((r) => r.s === '⚠').length;
  console.log(`\n${bad ? '✗' : '✓'} ${bad} problema(s), ${soso} advertencia(s).`);
  if (bad) process.exit(1);
};

main().catch((e) => { console.error(`✗ ${e.message}`); process.exit(1); });
