/**
 * publicar — chequeo completo de un episodio y, SÓLO si pasa, subida a GitHub.
 *
 *   npm run publicar -- <CODE> [--estilo organico,vidrio,plataforma] [--sin-pr] [--trailer "…"]
 *
 * 1. npm run check        tipos, layout (docente, rects, 2 líneas), contraste
 * 2. npm run export:ae    manifiesto para After Effects
 * 3. npm run ae           arma cada estilo, stills, hoja de contacto, chequeo
 * 4. git                  rama episodio/<CODE>, commit, push
 * 5. gh                   PR hacia main con las hojas de contacto (si no existe)
 *
 * Si cualquier paso de 1–3 falla, NO toca git y dice qué no cumplió. Los medios
 * (máster, recursos, .aep, stills sueltos) quedan afuera por .gitignore: se
 * suben el código, los datos, el manifiesto y revision/ (hojas y logs).
 */
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync, spawnSync} from 'node:child_process';
import {parseArgs, ROOT} from './lib/common.mjs';

const REPO = path.resolve(ROOT, '..');

const step = (titulo, cmd, args, cwd = ROOT) => {
  console.log(`\n━━ ${titulo}\n$ ${cmd} ${args.join(' ')}`);
  const r = spawnSync(cmd, args, {cwd, stdio: 'inherit'});
  if (r.status !== 0) throw new Error(`${titulo}: falló (código ${r.status}). No se subió nada.`);
};

const git = (...a) => execFileSync('git', a, {cwd: REPO, encoding: 'utf8'}).trim();
const gitOk = (...a) => spawnSync('git', a, {cwd: REPO}).status === 0;

/** owner/repo a partir del remote, para armar links a las imágenes. */
const repoSlug = () => {
  const url = git('remote', 'get-url', 'origin');
  const m = /github\.com[:/](.+?)(\.git)?$/.exec(url);
  if (!m) throw new Error(`El remote origin no es de GitHub: ${url}`);
  return m[1];
};

const main = () => {
  const {code, flags} = parseArgs();
  if (!code) throw new Error('Uso: npm run publicar -- <CODE> [--estilo a,b] [--sin-pr]');
  const estilos = String(flags.estilo ?? 'organico,vidrio,plataforma');
  if (!gitOk('rev-parse', '--git-dir')) throw new Error(`${REPO} no es un repo git.`);
  const slug = repoSlug();

  step('1/3 · verificadores del motor', process.execPath, ['scripts/check.mjs', code]);
  step('2/3 · manifiesto para After Effects', process.execPath, ['--experimental-strip-types', 'scripts/export-ae.mjs', code]);
  step('3/3 · armado y chequeo en After Effects', process.execPath, [path.join(REPO, 'ae', 'run.mjs'), code, '--estilo', estilos]);

  const estadoPath = path.join(REPO, 'episodios', code, 'revision', 'estado.json');
  const estado = JSON.parse(fs.readFileSync(estadoPath, 'utf8'));
  const M = JSON.parse(fs.readFileSync(path.join(REPO, 'episodios', code, 'manifest.json'), 'utf8'));

  // ── git ─────────────────────────────────────────────────────────────────
  const branch = `episodio/${code}`;
  const current = git('branch', '--show-current');
  if (current !== branch) {
    if (gitOk('show-ref', '--verify', '--quiet', `refs/heads/${branch}`)) git('checkout', branch);
    else git('checkout', '-b', branch);
  }
  git('add', '-A');
  const nothing = gitOk('diff', '--cached', '--quiet');
  if (nothing) {
    console.log('\n· No hay cambios nuevos para commitear.');
  } else {
    const lista = Object.keys(estado.estilos).join(', ');
    const msg = [
      `${code} · ${M.episode.title}: armado en After Effects (${lista})`,
      '',
      `${M.blocks.length} bloques, ${M.captions.length} subtítulos, ${estado.frames.length} stills por estilo.`,
      'Chequeo completo en verde: tipos, layout (docente, rects quemados, ≤2 líneas),',
      'contraste y armado en AE sin advertencias.',
      // --trailer "Co-Authored-By: …" para dejar constancia de quién asistió.
      ...(flags.trailer ? ['', String(flags.trailer)] : []),
    ].join('\n');
    execFileSync('git', ['commit', '-m', msg], {cwd: REPO, stdio: 'inherit'});
  }
  execFileSync('git', ['push', '-u', 'origin', branch], {cwd: REPO, stdio: 'inherit'});

  // ── pull request ─────────────────────────────────────────────────────────
  if (flags['sin-pr']) return;
  const existing = spawnSync('gh', ['pr', 'view', branch, '--repo', slug, '--json', 'url', '-q', '.url'], {cwd: REPO, encoding: 'utf8'});
  if (existing.status === 0 && existing.stdout.trim()) {
    console.log(`\n✓ Push hecho. El PR ya existía: ${existing.stdout.trim()}`);
    return;
  }
  const img = (e) => `https://github.com/${slug}/blob/${branch}/episodios/${code}/revision/${e}.jpg?raw=1`;
  const body = [
    `**${code} · ${M.episode.title}** — ${M.episode.series}`,
    '',
    `${M.blocks.length} bloques · ${M.captions.length} subtítulos · ${M.fps} fps · ${M.width}×${M.height}`,
    '',
    '### Chequeo',
    '- `npm run check`: tipos, layout y contraste en verde',
    '- `npm run ae`: armado sin ⚠ ni ✗, tarjetas y subtítulos coinciden con el manifiesto',
    '',
    ...Object.keys(estado.estilos).flatMap((e) => [`### ${e}`, `![${e}](${img(e)})`, '']),
    'Los .aep y los medios no se suben: se regeneran con `npm run export:ae` + `npm run ae`.',
  ].join('\n');
  execFileSync('gh', ['pr', 'create', '--repo', slug, '--base', 'main', '--head', branch,
    '--title', `${code} · ${M.episode.title}`, '--body', body], {cwd: REPO, stdio: 'inherit'});
};

try {
  main();
} catch (e) {
  console.error(`\n✗ ${e.message}`);
  process.exit(1);
}
