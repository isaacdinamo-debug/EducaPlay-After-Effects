/**
 * ae/run.mjs — arma un episodio en After Effects, saca stills y lo verifica.
 *
 *   npm run ae -- <CODE> --estilo plataforma            (desde motor/)
 *   npm run ae -- <CODE> --estilo organico,vidrio,plataforma --frames 420,1620
 *   npm run ae -- <CODE> --estilo vidrio --forzar       (cierra aunque haya otro proyecto)
 *
 * Por estilo:
 *   1. abre After Effects si no está corriendo y espera a que acepte scripts;
 *   2. cierra el proyecto abierto SIN guardar sólo si lo generó este flujo
 *      (su archivo empieza con <CODE>-); si hay otro trabajo abierto, aborta;
 *   3. evalúa ae/build-<estilo>.jsx con el manifiesto de episodios/<CODE>/;
 *   4. vuelca el LOG del armado a episodios/<CODE>/revision/log-<estilo>.txt;
 *   5. pide los stills (saveFrameToPng es ASÍNCRONO: se espera a que existan)
 *      y arma la hoja de contacto revision/<estilo>.jpg;
 *   6. chequea: sin ⚠ ni ✗ en el LOG, .aep guardado, cantidad de tarjetas y de
 *      subtítulos igual a la del manifiesto, todos los stills presentes.
 *
 * Sale con código 1 si algún estilo no pasa. `npm run publicar` depende de eso.
 *
 * AE se maneja con AppleScript: `DoScript "$.evalFile(…)"`. `DoScript` siempre
 * devuelve "0", así que lo que hay que leer de vuelta se escribe a un archivo
 * temporal. Con `DoScriptFile` esas escrituras fallan en silencio (el archivo
 * queda en 0 bytes), por eso no se usa.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const AE_DIR = path.join(REPO, 'ae');
const ESTILOS = ['organico', 'vidrio', 'plataforma'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

/** La versión de After Effects más nueva instalada, o AE_APP. */
const aeApp = () => {
  if (process.env.AE_APP) return process.env.AE_APP;
  const apps = fs.readdirSync('/Applications').filter((f) => /^Adobe After Effects 20\d\d$/.test(f)).sort();
  if (!apps.length) throw new Error('No encontré After Effects en /Applications (definí AE_APP).');
  return apps[apps.length - 1];
};

const applescriptStr = (s) => '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';

/** Corre un .jsx en AE. El código se escribe a un archivo: sin escapar a mano. */
const runJsx = (app, code, tmpDir) => {
  const f = path.join(tmpDir, `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}.jsx`);
  fs.writeFileSync(f, code, 'utf8');
  try {
    // DoScript + $.evalFile, NO DoScriptFile: con DoScriptFile, AE no deja que
    // el script escriba archivos (quedan en 0 bytes); evaluado desde DoScript sí.
    const call = `$.evalFile(File(${JSON.stringify(f)}))`;
    execFileSync('osascript', ['-e', `tell application ${applescriptStr(app)} to DoScript ${applescriptStr(call)}`], {stdio: 'pipe'});
  } finally {
    fs.rmSync(f, {force: true});
  }
};

const js = (v) => JSON.stringify(v);

/** Espera a que AE acepte scripts; lo abre si hace falta. */
const ensureAE = async (app, tmpDir) => {
  const probe = path.join(tmpDir, 'ae-ok.txt');
  fs.rmSync(probe, {force: true});
  const ping = `var f=new File(${js(probe)});f.open('w');f.write(app.version);f.close();`;
  try {
    runJsx(app, ping, tmpDir);
  } catch {
    console.log(`· abriendo ${app}…`);
    execFileSync('open', ['-a', app]);
    for (let i = 0; i < 60; i++) {
      await sleep(3000);
      try {
        runJsx(app, ping, tmpDir);
        break;
      } catch { /* todavía arrancando */ }
    }
  }
  if (!fs.existsSync(probe)) throw new Error(`${app} no responde a scripts.`);
  console.log(`· ${app} ${fs.readFileSync(probe, 'utf8')} listo`);
  fs.rmSync(probe, {force: true});
};

/** Cierra el proyecto abierto sólo si es de este flujo o está vacío. */
const closeOwnProject = (app, code, tmpDir, force) => {
  const st = path.join(tmpDir, 'ae-proyecto.txt');
  runJsx(app, `
    var r='VACIO';
    if (app.project) {
      var f=app.project.file;
      if (f && f.name.indexOf(${js(code + '-')})===0) r='PROPIO';
      else if (app.project.numItems>0) r='AJENO:'+(f?f.fsName:'(sin guardar)');
    }
    var o=new File(${js(st)});o.encoding='UTF-8';o.open('w');o.write(r);o.close();
    if (r==='PROPIO' || r==='VACIO' || ${force ? 'true' : 'false'}) {
      if (app.project) app.project.close(CloseOptions.DO_NOT_SAVE_CHANGES);
    }`, tmpDir);
  const r = fs.readFileSync(st, 'utf8');
  fs.rmSync(st, {force: true});
  if (r.startsWith('AJENO') && !force) {
    throw new Error(`Hay otro proyecto abierto en AE (${r.slice(6)}). Guardalo y cerralo, o usá --forzar.`);
  }
};

/**
 * Frames de revisión: uno por bloque, con todo ya en pantalla (30 frames
 * después de entrar, o 20 después de su último ítem); como mucho 12.
 */
const defaultFrames = (M) => {
  const all = M.blocks.map((b) => {
    const lastAt = Math.max(0, ...(b.items ?? []).map((it) => it.at ?? 0));
    return Math.min(Math.max(b.from + 30, lastAt + 20), b.to - 1);
  });
  if (all.length <= 12) return all;
  const out = [];
  for (let i = 0; i < 12; i++) out.push(all[Math.round((i * (all.length - 1)) / 11)]);
  return [...new Set(out)];
};

const waitFiles = async (files, timeoutMs) => {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    if (files.every((f) => fs.existsSync(f) && fs.statSync(f).size > 0)) {
      await sleep(1500); // que termine de escribir el último
      return true;
    }
    await sleep(1000);
  }
  return false;
};

const contactSheet = (pngs, out) => {
  const cols = 2, w = 640, h = 360;
  const n = pngs.length;
  const inputs = pngs.flatMap((p) => ['-i', p]);
  const scaled = pngs.map((_, i) => `[${i}]scale=${w}:${h}[v${i}]`).join(';');
  const layout = pngs.map((_, i) => `${(i % cols) * w}_${Math.floor(i / cols) * h}`).join('|');
  const filter = n === 1 ? `[0]scale=${w}:${h}` :
    `${scaled};${pngs.map((_, i) => `[v${i}]`).join('')}xstack=inputs=${n}:layout=${layout}:fill=black`;
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', filter, '-frames:v', '1', '-q:v', '4', out]);
};

const buildOne = async (app, code, estilo, M, frames, revDir, tmpDir, force) => {
  const problems = [];
  const aep = path.join(REPO, 'episodios', code, `${code}-${estilo}.aep`);
  const logFile = path.join(tmpDir, `log-${estilo}.txt`);
  const stillDir = path.join(revDir, estilo);
  fs.rmSync(aep, {force: true});
  fs.rmSync(stillDir, {recursive: true, force: true});
  fs.mkdirSync(stillDir, {recursive: true});

  closeOwnProject(app, code, tmpDir, force);

  console.log(`\n▶ ${code} · ${estilo}`);
  runJsx(app, `
    $.global.EDUCAPLAY_MANIFEST = ${js(path.join(REPO, 'episodios', code, 'manifest.json'))};
    $.evalFile(File(${js(path.join(AE_DIR, `build-${estilo}.jsx`))}));
    var o=new File(${js(logFile)});o.encoding='UTF-8';o.lineFeed='Unix';o.open('w');
    o.write((typeof LOG!=='undefined'?LOG:['✗ el constructor no dejó LOG']).join('\\n'));o.close();`, tmpDir);

  // ExtendScript en Mac escribe \r como fin de línea si no se le pide Unix.
  const log = fs.existsSync(logFile) ? fs.readFileSync(logFile, 'utf8').replace(/\r\n?/g, '\n') : '';
  fs.writeFileSync(path.join(revDir, `log-${estilo}.txt`), log);
  if (!log) problems.push('no hay LOG del armado');
  // build.log lo intenta escribir el propio .jsx; que la preferencia de AE lo
  // impida no es un problema del capítulo.
  for (const line of log.split('\n')) {
    if (/[⚠✗]/.test(line) && !/build\.log/.test(line)) problems.push(line.trim());
  }
  const cards = Number((/· (\d+) tarjetas armadas/.exec(log) ?? [])[1]);
  const subs = Number((/· (\d+) subtítulos/.exec(log) ?? [])[1]);
  if (cards !== M.blocks.length) problems.push(`tarjetas armadas ${cards} ≠ bloques del manifiesto ${M.blocks.length}`);
  if (subs !== M.captions.length) problems.push(`subtítulos ${subs} ≠ manifiesto ${M.captions.length}`);
  if (!fs.existsSync(aep)) problems.push(`no se guardó ${path.relative(REPO, aep)}`);

  // Stills desde la comp principal. saveFrameToPng vuelve antes de escribir.
  const pngs = frames.map((f) => path.join(stillDir, `f${String(f).padStart(5, '0')}.png`));
  if (fs.existsSync(aep)) {
    runJsx(app, `
      var c=null;
      for (var i=1;i<=app.project.numItems;i++){var it=app.project.item(i);
        if (it instanceof CompItem && it.name===${js(code)}) c=it;}
      var fr=${js(frames)}, out=${js(pngs)};
      for (var k=0;k<fr.length;k++) c.saveFrameToPng(fr[k]/c.frameRate, new File(out[k]));`, tmpDir);
    const ok = await waitFiles(pngs, 30000 + frames.length * 8000);
    const got = pngs.filter((p) => fs.existsSync(p));
    if (!ok) problems.push(`faltan stills: ${pngs.length - got.length} de ${pngs.length}`);
    if (got.length) contactSheet(got, path.join(revDir, `${estilo}.jpg`));
  }

  if (problems.length) {
    console.log(`✗ ${estilo}: NO pasa`);
    for (const p of problems) console.log(`   · ${p}`);
  } else {
    console.log(`✓ ${estilo}: ${cards} tarjetas, ${subs} subtítulos, ${pngs.length} stills → ` +
      path.relative(REPO, path.join(revDir, `${estilo}.jpg`)));
  }
  return problems;
};

const main = async () => {
  const {code, flags} = args;
  if (!code) throw new Error('Uso: npm run ae -- <CODE> --estilo <organico|vidrio|plataforma>[,…] [--frames 420,1620] [--forzar]');
  const estilos = String(flags.estilo ?? ESTILOS.join(',')).split(',').map((s) => s.trim()).filter(Boolean);
  for (const e of estilos) if (!ESTILOS.includes(e)) throw new Error(`Estilo desconocido: ${e} (${ESTILOS.join(', ')})`);

  const manifestPath = path.join(REPO, 'episodios', code, 'manifest.json');
  if (!fs.existsSync(manifestPath)) throw new Error(`Falta ${path.relative(REPO, manifestPath)}: corré npm run export:ae -- ${code}`);
  const M = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const frames = flags.frames ? String(flags.frames).split(',').map(Number) : defaultFrames(M);
  const revDir = path.join(REPO, 'episodios', code, 'revision');
  fs.mkdirSync(revDir, {recursive: true});

  const app = aeApp();
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'educaplay-ae-'));
  await ensureAE(app, tmpDir);

  const results = {};
  try {
    for (const e of estilos) results[e] = await buildOne(app, code, e, M, frames, revDir, tmpDir, !!flags.forzar);
  } finally {
    fs.rmSync(tmpDir, {recursive: true, force: true});
  }

  const failed = Object.entries(results).filter(([, p]) => p.length);
  fs.writeFileSync(path.join(revDir, 'estado.json'), JSON.stringify({
    code, fecha: new Date().toISOString(), frames,
    estilos: Object.fromEntries(Object.entries(results).map(([e, p]) => [e, p.length ? {ok: false, problemas: p} : {ok: true}])),
  }, null, 1));
  if (failed.length) {
    console.log(`\n✗ ${failed.length} de ${estilos.length} estilo(s) no pasan. Mirá revision/log-<estilo>.txt.`);
    process.exit(1);
  }
  console.log(`\n✓ ${code}: ${estilos.join(', ')} armados y verificados. Revisá las hojas de contacto en episodios/${code}/revision/.`);
};

main().catch((e) => {
  console.error(`\n✗ ${e.message}`);
  process.exit(1);
});
