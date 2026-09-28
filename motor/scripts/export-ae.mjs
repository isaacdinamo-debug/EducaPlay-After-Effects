/**
 * export-ae — exporta un episodio del motor a un manifiesto para After Effects.
 *
 *   npm run export:ae -- AMB26-04
 *   node --experimental-strip-types scripts/export-ae.mjs AMB26-04 [--out <dir>]
 *
 * El motor ya resolvió todo lo difícil: los gatillos a frames, dónde está
 * parada la docente y en qué banda libre entra cada tarjeta. Este script no
 * decide nada nuevo: llama a la MISMA resolveSlot() de producción que usan el
 * render y check-layout, y vuelca el resultado a JSON. Del otro lado,
 * `ae/build-episode.jsx` lo lee y arma el .aep.
 *
 * Salida (por defecto `episodios/<CODE>/`):
 *   manifest.json   episodio, tokens de marca, bloques con su caja, subtítulos
 *   assets/         máster y recursos. Los GIF se transcodifican a .mov
 *                   (Animation, con alfa): AE importa un GIF como cuadro fijo.
 */
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {episodeDir, parseArgs, ROOT} from './lib/common.mjs';

const load = (rel) => import(pathToFileURL(path.join(ROOT, rel)).href);

/** Una caja cambia si alguno de sus lados se movió más de esto. */
const EPS = 1;

const round = (r) => ({
  x: Math.round(r.x), y: Math.round(r.y),
  width: Math.round(r.width), height: Math.round(r.height),
});
const moved = (a, b) =>
  Math.abs(a.x - b.x) > EPS || Math.abs(a.y - b.y) > EPS ||
  Math.abs(a.width - b.width) > EPS || Math.abs(a.height - b.height) > EPS;

const main = async () => {
  const {flags, code} = parseArgs();
  if (!code) throw new Error('Uso: npm run export:ae -- <CODE> [--out <dir>]');

  const {resolveSlot, blockRequest, adaptTrack, reservedForFormat} =
    await load('src/layout/presenter.ts');
  const {THEME} = await load('src/brand/ambienteTheme.ts');
  const {formatTokens} = await load('src/brand/format.ts');
  const {slotOf, isFullFrame} = await load('src/episodes/blocks.ts');
  const data = await load(`src/episodes/${code}/data.ts`);

  const fmt = formatTokens(1920, 1080);
  const sized = adaptTrack(data.TRACK, fmt.width, fmt.height);
  const track = {
    ...sized,
    reserved: reservedForFormat(sized, data.RESERVED, fmt, sized.durationInFrames),
  };
  const opts = {
    safe: fmt.safe,
    paperBandY: fmt.paperBandY,
    captionBandY: fmt.captionBandY,
    slotPad: fmt.slotPad,
    defaultFraming: fmt.defaultFraming,
  };

  const outDir = path.resolve(flags.out ?? path.join(ROOT, '..', 'episodios', code));
  const assetsDir = path.join(outDir, 'assets');
  fs.mkdirSync(assetsDir, {recursive: true});

  /** Copia (o transcodifica) un recurso de public/ y devuelve su ruta relativa. */
  const copied = new Map();
  const asset = (rel) => {
    if (copied.has(rel)) return copied.get(rel);
    const src = path.join(ROOT, 'public', rel);
    if (!fs.existsSync(src)) throw new Error(`Falta el recurso ${src}`);
    const base = path.basename(rel);
    let name = base;
    if (/\.gif$/i.test(base)) {
      name = base.replace(/\.gif$/i, '.mov');
      const dst = path.join(assetsDir, name);
      if (!fs.existsSync(dst) || fs.statSync(dst).mtimeMs < fs.statSync(src).mtimeMs) {
        execFileSync('ffmpeg', [
          '-y', '-loglevel', 'error', '-i', src,
          '-r', String(data.FPS), '-c:v', 'qtrle', '-pix_fmt', 'argb', dst,
        ]);
      }
    } else {
      const dst = path.join(assetsDir, name);
      if (!fs.existsSync(dst) || fs.statSync(dst).size !== fs.statSync(src).size) {
        fs.copyFileSync(src, dst);
      }
    }
    const out = `assets/${name}`;
    copied.set(rel, out);
    return out;
  };

  const blocks = [];
  const skipped = [];
  for (const b of data.BLOCKS ?? []) {
    if (isFullFrame(b)) {
      skipped.push(`${b.kind}:${b.key}`);
      continue;
    }
    const req = blockRequest(slotOf(b, track, fmt), b);

    // Caja por frame, comprimida a los frames donde cambia. Casi todas las
    // tarjetas quedan quietas y exportan un único keyframe.
    const boxes = [];
    let prev = null;
    for (let f = b.from; f < b.to; f++) {
      const r = round(resolveSlot(track, f, req, opts));
      if (!prev || moved(prev, r)) boxes.push({f, ...r});
      prev = r;
    }

    const {slot, ...rest} = b;
    const out = {...rest, side: req.side, align: req.align, boxes};
    if (b.src) out.src = asset(b.src);
    if (b.items) out.items = b.items.map((it) => (it.src ? {...it, src: asset(it.src)} : it));
    blocks.push(out);
  }

  // Subtítulos: la banda fija de abajo, corrida donde el episodio lo declara.
  const cb = fmt.captions;
  const captionRect = (f) => {
    let bottom = cb.bottom;
    let left = 0;
    let right = track.width;
    for (const z of data.CAPTION_AVOID ?? []) {
      if (f < z.from || f >= z.to) continue;
      bottom = z.bottom ?? bottom;
      left = z.left ?? left;
      right = z.right ?? right;
    }
    const w = Math.min(cb.maxWidth, right - left);
    return round({
      x: left + (right - left - w) / 2,
      y: track.height - bottom - cb.maxHeight,
      width: w,
      height: cb.maxHeight,
    });
  };
  // Subtítulos según el documento de subtitulado §1.4: nunca más de dos
  // líneas. Se pagina con la MISMA función y los MISMOS parámetros que
  // check-layout, así AE recibe páginas que el verificador ya aprobó.
  const pill = THEME.captions.pill;
  const {paginateCaptions} = await load('src/captions/captionPages.ts');
  const pages = paginateCaptions(data.CAPTIONS ?? [], {
    fontSize: cb.fontSize,
    usableWidth: cb.maxWidth - 2 * pill.padX,
    maxLines: pill.maxLines,
  });

  // Un CAPTION_AVOID puede empezar a mitad de un subtítulo (la placa de nombre
  // entra mientras la docente habla): se exporta cada cambio de caja.
  const captions = pages.map((c) => {
    const boxes = [];
    for (let f = c.from; f < c.to; f++) {
      const r = captionRect(f);
      if (!boxes.length || moved(boxes[boxes.length - 1], r)) boxes.push({f, ...r});
    }
    return {from: c.from, to: c.to, text: c.text, box: boxes[0], boxes};
  });

  const P = THEME.colors;
  const manifest = {
    code,
    generatedBy: 'motor/scripts/export-ae.mjs',
    episode: data.EPISODE,
    fps: data.FPS,
    width: track.width,
    height: track.height,
    duration: track.durationInFrames,
    master: asset(data.EPISODE.master),
    reserved: track.reserved,
    theme: {
      palette: P,
      captions: {
        scrimAlpha: cb.scrimAlpha, fontSize: cb.fontSize, maxWidth: cb.maxWidth,
        pill: {
          radius: pill.radius, padX: pill.padX, padY: pill.padY, blur: pill.blur,
          lineHeight: pill.lineHeight, maxLines: pill.maxLines,
        },
      },
      rainbow: THEME.rainbow ?? ['#E41653', '#FAB817', '#35BAD5', '#3CAA34'],
      fonts: {
        heading: 'Museo-700',
        headingLight: 'Museo-300',
        body: 'MuseoSansRounded-700',
        bodyBold: 'MuseoSansRounded-900',
        bodyLight: 'MuseoSansRounded-300',
      },
    },
    blocks,
    captions,
    // Traslados de cámara del montajista: ahí va la cortina de agua.
    moves: (data.TRACK.segments ?? [])
      .filter((sg) => sg.framing === 'transition')
      .map((sg) => ({key: sg.key, from: sg.from, to: sg.to})),
  };
  fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 1));

  const moving = blocks.filter((b) => b.boxes.length > 1).length;
  console.log(`✓ ${code} → ${path.relative(process.cwd(), outDir) || outDir}`);
  const extra = captions.length - (data.CAPTIONS ?? []).length;
  console.log(`  ${blocks.length} bloques (${moving} con caja que se mueve), ${captions.length} subtítulos` +
    (extra > 0 ? ` (${extra} partidos para no pasar de ${pill.maxLines} líneas)` : '') + `, ${copied.size} assets`);
  if (skipped.length) console.log(`  a cuadro completo, no exportados: ${skipped.join(', ')}`);
};

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
