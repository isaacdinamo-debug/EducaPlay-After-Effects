/**
 * ae/ae-app.mjs — dónde está After Effects en esta máquina. Lo usan run.mjs
 * (armado) y preview.mjs (render con aerender).
 *
 * Importa el common del motor sólo para que se lea motor/.env: ahí se puede
 * fijar AE_APP.
 */
import fs from 'node:fs';
import path from 'node:path';
import '../motor/scripts/lib/common.mjs';

export const WIN = process.platform === 'win32';

/**
 * After Effects más nuevo instalado, o AE_APP.
 * macOS: el nombre de la app ("Adobe After Effects 2026"), para AppleScript.
 * Windows: la ruta a AfterFX.exe.
 */
export const aeApp = () => {
  if (process.env.AE_APP) return process.env.AE_APP;
  if (WIN) {
    const base = path.join(process.env.ProgramFiles ?? 'C:\\Program Files', 'Adobe');
    const dirs = fs.existsSync(base)
      ? fs.readdirSync(base).filter((f) => /^Adobe After Effects( CC)? 20\d\d$/.test(f)).sort() : [];
    for (const d of dirs.reverse()) {
      const exe = path.join(base, d, 'Support Files', 'AfterFX.exe');
      if (fs.existsSync(exe)) return exe;
    }
    throw new Error(`No encontré AfterFX.exe en ${base} (definí AE_APP en motor/.env con la ruta a AfterFX.exe).`);
  }
  const apps = fs.readdirSync('/Applications').filter((f) => /^Adobe After Effects 20\d\d$/.test(f)).sort();
  if (!apps.length) throw new Error('No encontré After Effects en /Applications (definí AE_APP en motor/.env).');
  return apps[apps.length - 1];
};

/** aerender de esa misma instalación: al lado de AfterFX.exe, o en la carpeta de la app en macOS. */
export const aerenderPath = () => {
  if (process.env.AERENDER) return process.env.AERENDER;
  const app = aeApp();
  const p = WIN ? path.join(path.dirname(app), 'aerender.exe') : path.join('/Applications', app, 'aerender');
  if (!fs.existsSync(p)) throw new Error(`No encontré aerender en ${p} (definí AERENDER en motor/.env).`);
  return p;
};

/**
 * Sufijo de una variante de armado, el mismo que usa build-episode.jsx para el
 * .aep: <CODE><sufijo>.aep y revision<sufijo>/. Así una variante nunca pisa el
 * armado por defecto ni su evidencia.
 */
export const sufijo = ({clasico = false, grandes = false} = {}) =>
  (clasico ? '-clasico' : '') + (grandes ? '-grandes' : '');
