/**
 * build-episode.jsx — arma un capítulo de Ambiente en After Effects.
 *
 *   npm run export:ae -- <CODE>          (en motor/)
 *   npm run ae -- <CODE>
 *
 * `npm run ae` (ae/run.mjs) lo evalúa y le pasa el manifiesto en
 * $.global.EDUCAPLAY_MANIFEST. A mano: AE → File → Scripts → Run Script File…
 * → este archivo; si hay un solo episodio en episodios/ lo toma, y si hay
 * varios pregunta cuál.
 *
 * Con `episodios/<CODE>/manifest.json` construye un proyecto nuevo:
 *
 *   00_CONTROL     la capa CONTROL de la comp principal: colores de la web,
 *                  entrada/salida, deslizamiento, rebote, sombra y subtítulos
 *   01_MASTER      el máster con la docente
 *   02_GRAFICOS    una precomp por bloque, <kind>_<key>
 *   03_ASSETS      fotos, videos y GIF (llegan como .mov con alfa)
 *   04_SUBTITULOS  la precomp SUBTITULOS
 *
 * Las cajas NO se deciden acá. Vienen resueltas por la resolveSlot() del motor
 * (la banda libre al costado de la docente), así que un gráfico no la pisa.
 * Lo que este script agrega es la puesta en escena, con la estética de la
 * plataforma EducaPlay (ver docs/ESTETICA.md).
 *
 * Todo lo que se agrega por scripting usa matchNames, no nombres visibles:
 * funciona igual con AE en español o en inglés.
 *
 * ExtendScript es ES3: sin let/const, sin arrow functions, sin Array.map.
 */
var LOG = [];
function log(m) { LOG.push(m); $.writeln(m); }

function buildEpisode() {
  // ───────────────────────────────────────────────────────────── utilidades

  function readJSON(file) {
    file.encoding = 'UTF-8';
    if (!file.open('r')) throw new Error('No pude abrir ' + file.fsName);
    var txt = file.read();
    file.close();
    // ES3 no trae JSON. El manifiesto lo genera nuestro propio exportador.
    return eval('(' + txt + ')');
  }

  function hex(h, a) {
    h = h.replace('#', '');
    return [
      parseInt(h.substr(0, 2), 16) / 255,
      parseInt(h.substr(2, 2), 16) / 255,
      parseInt(h.substr(4, 2), 16) / 255,
    ].concat(a === undefined ? [] : [a]);
  }

  function sec(frames) { return frames / FPS; }

  /** Ejecuta un paso "de lujo": si falla, se anota y el capítulo sigue. */
  function soft(label, fn) {
    try { return fn(); } catch (e) { log('⚠ ' + label + ': ' + e.toString() + ' (línea ' + e.line + ')'); }
    return null;
  }

  var EASE_IN = 25, EASE_OUT = 75;

  /** Keyframes con ease (influencias EASE_OUT de salida y EASE_IN de llegada). */
  function keys(prop, times, values, holdAll) {
    for (var i = 0; i < times.length; i++) prop.setValueAtTime(times[i], values[i]);
    // Cuántos KeyframeEase pide cada propiedad no se deduce bien de su tipo
    // (Scale de una capa 2D es ThreeD pero pide 2; lo espacial pide 1): se
    // prueba con 1, 2 y 3 y se queda el que AE acepta.
    for (var k = 1; k <= prop.numKeys; k++) {
      if (holdAll) {
        prop.setInterpolationTypeAtKey(k, KeyframeInterpolationType.HOLD);
        continue;
      }
      for (var n = 1; n <= 3; n++) {
        var easeOut = [], easeIn = [];
        for (var d = 0; d < n; d++) {
          easeIn.push(new KeyframeEase(0, EASE_IN));
          easeOut.push(new KeyframeEase(0, EASE_OUT));
        }
        try { prop.setTemporalEaseAtKey(k, easeIn, easeOut); break; } catch (e) { /* siguiente n */ }
      }
    }
  }

  // ─────────────────────────────────────────────────────────── el manifiesto
  // 1) ae/run.mjs lo pasa explícito; 2) a mano, se busca en ../episodios/*/.
  var manifestFile = null;
  if ($.global.EDUCAPLAY_MANIFEST) {
    manifestFile = File($.global.EDUCAPLAY_MANIFEST);
    $.global.EDUCAPLAY_MANIFEST = undefined;
    if (!manifestFile.exists) throw new Error('No existe el manifiesto ' + manifestFile.fsName);
  } else {
    var found = [];
    var epis = Folder(File($.fileName).parent.parent.fsName + '/episodios');
    var dirs = epis.exists ? epis.getFiles(function (f) { return f instanceof Folder; }) : [];
    for (var di = 0; di < dirs.length; di++) {
      var mf = File(dirs[di].fsName + '/manifest.json');
      if (mf.exists) found.push(mf);
    }
    if (found.length === 1) manifestFile = found[0];
    else manifestFile = File.openDialog('Elegí el manifest.json del capítulo', 'JSON:*.json');
  }
  if (!manifestFile) return;

  var M = readJSON(manifestFile);
  var ROOTDIR = manifestFile.parent;
  var FPS = M.fps, W = M.width, H = M.height;
  var MAIN = M.code;
  var PAL = M.theme.palette;
  var FONTS = M.theme.fonts;

  // Estética de la plataforma EducaPlay (Corrientes Play): los colores se
  // midieron sobre la web y reemplazan a los tokens de la materia.
  var WEB = {
    cian: '#5DCBE1', rojo: '#EA3355', amarillo: '#F5C042', verde: '#54B835',
    oscuro: '#3B3B3E', gris: '#F0F0F0', tinta: '#201D2F', menta: '#6CEACB', meta: '#7A7985',
  };
  var P3 = {};
  for (var pk3 in PAL) P3[pk3] = PAL[pk3];
  P3.paper = WEB.gris; P3.paperWarm = WEB.gris;
  P3.ink = WEB.tinta; P3.inkSoft = WEB.meta; P3.inkMuted = WEB.meta;
  P3.accent = WEB.menta; P3.accentDeep = WEB.oscuro;
  P3.magenta = WEB.rojo; P3.magentaDeep = WEB.rojo;
  PAL = P3;
  M.theme.rainbow = [WEB.cian, WEB.rojo, WEB.amarillo, WEB.verde];
  var F3 = {};
  for (var fk in FONTS) F3[fk] = FONTS[fk];
  F3.heading = 'MuseoSans-900';
  F3.headingLight = 'MuseoSans-300';
  F3.body = 'MuseoSans-700';
  F3.bodyBold = 'MuseoSans-900';
  F3.bodyLight = 'MuseoSans-300';
  FONTS = F3;
  log('▶ ' + MAIN + ' · ' + M.blocks.length + ' bloques · ' + M.captions.length + ' subtítulos');

  app.beginUndoGroup('EducaPlay · ' + MAIN);
  if (app.project && app.project.numItems > 0) {
    if (!app.newProject()) return; // el usuario canceló el "¿guardar cambios?"
  }
  var proj = app.project;
  proj.bitsPerChannel = 8;

  var F = {
    control: proj.items.addFolder('00_CONTROL'),
    master: proj.items.addFolder('01_MASTER'),
    graficos: proj.items.addFolder('02_GRAFICOS'),
    assets: proj.items.addFolder('03_ASSETS'),
    subs: proj.items.addFolder('04_SUBTITULOS'),
  };

  var footageCache = {};
  function footage(rel) {
    if (footageCache[rel]) return footageCache[rel];
    var f = File(ROOTDIR.fsName + '/' + rel);
    if (!f.exists) throw new Error('Falta ' + f.fsName);
    var it = proj.importFile(new ImportOptions(f));
    it.parentFolder = F.assets;
    footageCache[rel] = it;
    return it;
  }

  // ─────────────────────────────────────────────────────── comp principal
  var main = proj.items.addComp(MAIN, W, H, 1, sec(M.duration), FPS);
  main.motionBlur = true;
  main.shutterAngle = 180;
  main.bgColor = hex(PAL.stage);

  var masterItem = footage(M.master);
  masterItem.parentFolder = F.master;
  var masterLayer = main.layers.add(masterItem);
  masterLayer.name = 'MASTER · docente';

  // Las expresiones de las precomps apuntan acá. Se leen por ÍNDICE de
  // parámetro —(1)— y no por nombre, para no depender del idioma de AE.
  var CTRL_REF = 'comp("' + MAIN + '").layer("CONTROL")';
  var ctrl = main.layers.addNull(sec(M.duration));
  ctrl.name = 'CONTROL';
  ctrl.label = 9;
  ctrl.source.parentFolder = F.control;
  var fx = ctrl.property('ADBE Effect Parade');
  // Los controles se llaman como en la web; el código usa los nombres internos
  // y CTL_NAME los traduce.
  var CTL_NAME = {
    'Papel': 'Gris', 'Papel tibio': 'Gris tibio', 'Tinta': 'Tinta', 'Acento': 'Menta',
    'Acento oscuro': 'Oscuro', 'Alerta': 'Rojo', 'Arcoiris 1': 'Banda cian',
    'Arcoiris 2': 'Banda roja', 'Arcoiris 3': 'Banda amarilla', 'Arcoiris 4': 'Banda verde',
  };
  function ctlName(n) { return CTL_NAME[n] || n; }
  function colorCtl(name, hx) {
    var e = fx.addProperty('ADBE Color Control');
    e.name = ctlName(name);
    e.property(1).setValue(hex(hx, 1));
  }
  function sliderCtl(name, v) {
    var e = fx.addProperty('ADBE Slider Control');
    e.name = name;
    e.property(1).setValue(v);
  }
  colorCtl('Papel', PAL.paper);
  colorCtl('Papel tibio', PAL.paperWarm);
  colorCtl('Tinta', PAL.ink);
  colorCtl('Acento', PAL.accent);
  colorCtl('Acento oscuro', PAL.accentDeep);
  colorCtl('Alerta', PAL.magenta);
  colorCtl('Arcoiris 1', M.theme.rainbow[0]);
  colorCtl('Arcoiris 2', M.theme.rainbow[1]);
  colorCtl('Arcoiris 3', M.theme.rainbow[2]);
  colorCtl('Arcoiris 4', M.theme.rainbow[3]);
  sliderCtl('Entrada (frames)', 18);
  sliderCtl('Salida (frames)', 12);
  sliderCtl('Deslizamiento (px)', 60);
  sliderCtl('Rebote (%)', 8);
  sliderCtl('Sombra (%)', 14);
  var cb = fx.addProperty('ADBE Checkbox Control');
  cb.name = 'Subtítulos';
  cb.property(1).setValue(1);

  function colorExpr(name) { return CTRL_REF + '.effect("' + ctlName(name) + '")(1)'; }

  // Guía (no se renderiza): los rects quemados en el máster.
  soft('guía de zonas', function () {
    var g = main.layers.addShape();
    g.name = 'GUIA · zonas reservadas';
    g.guideLayer = true;
    g.label = 1;
    g.property('ADBE Transform Group').property('ADBE Position').setValue([0, 0]);
    g.property('ADBE Transform Group').property('ADBE Anchor Point').setValue([0, 0]);
    var seen = {};
    for (var i = 0; i < M.reserved.length; i++) {
      var r = M.reserved[i];
      var rc = r.rect || [r.x, r.y, r.width, r.height];
      var id = rc.join(',');
      if (seen[id]) continue;
      seen[id] = true;
      var grp = addRect(g, rc[0], rc[1], rc[2], rc[3], 0, null);
      addStroke(grp, [1, 0.2, 0.2], 3);
    }
    g.moveToBeginning();
  });

  // ─────────────────────────────────────────────────── primitivas de forma
  function addRect(layer, x, y, w, h, radius, fillRGB, name) {
    var grp = layer.property('ADBE Root Vectors Group').addProperty('ADBE Vector Group');
    if (name) grp.name = name;
    var v = grp.property('ADBE Vectors Group');
    var rect = v.addProperty('ADBE Vector Shape - Rect');
    rect.property('ADBE Vector Rect Size').setValue([w, h]);
    rect.property('ADBE Vector Rect Position').setValue([x + w / 2, y + h / 2]);
    rect.property('ADBE Vector Rect Roundness').setValue(radius || 0);
    if (fillRGB) {
      var fill = v.addProperty('ADBE Vector Graphic - Fill');
      fill.property('ADBE Vector Fill Color').setValue(fillRGB);
    }
    return grp;
  }
  function addEllipse(layer, cx, cy, d, fillRGB, name) {
    var grp = layer.property('ADBE Root Vectors Group').addProperty('ADBE Vector Group');
    if (name) grp.name = name;
    var v = grp.property('ADBE Vectors Group');
    var el = v.addProperty('ADBE Vector Shape - Ellipse');
    el.property('ADBE Vector Ellipse Size').setValue([d, d]);
    el.property('ADBE Vector Ellipse Position').setValue([cx, cy]);
    if (fillRGB) {
      var fill = v.addProperty('ADBE Vector Graphic - Fill');
      fill.property('ADBE Vector Fill Color').setValue(fillRGB);
    }
    return grp;
  }
  function addPath(layer, pts, closed, name) {
    var grp = layer.property('ADBE Root Vectors Group').addProperty('ADBE Vector Group');
    if (name) grp.name = name;
    var sh = grp.property('ADBE Vectors Group').addProperty('ADBE Vector Shape - Group');
    var s = new Shape();
    s.vertices = pts;
    s.closed = !!closed;
    sh.property('ADBE Vector Shape').setValue(s);
    return grp;
  }
  function addStroke(grp, rgb, width) {
    var st = grp.property('ADBE Vectors Group').addProperty('ADBE Vector Graphic - Stroke');
    st.property('ADBE Vector Stroke Color').setValue(rgb);
    st.property('ADBE Vector Stroke Width').setValue(width);
    soft('stroke cap', function () { st.property('ADBE Vector Stroke Line Cap').setValue(2); });
    return st;
  }
  function fillOf(grp) {
    var v = grp.property('ADBE Vectors Group');
    for (var i = 1; i <= v.numProperties; i++) {
      if (v.property(i).matchName === 'ADBE Vector Graphic - Fill') return v.property(i);
    }
    return null;
  }
  function linkFill(grp, ctlName) {
    var f = fillOf(grp);
    if (f) soft('color vinculado', function () {
      f.property('ADBE Vector Fill Color').expression = colorExpr(ctlName);
    });
  }
  /** Trazo que se dibuja: trim paths de 0 a 100 entre t0 y t1. */
  function drawOn(grp, t0, t1) {
    soft('trim paths', function () {
      var tr = grp.property('ADBE Vectors Group').addProperty('ADBE Vector Filter - Trim');
      keys(tr.property('ADBE Vector Trim End'), [t0, t1], [0, 100]);
    });
  }
  function newShapeLayer(comp, name) {
    var l = comp.layers.addShape();
    l.name = name;
    l.property('ADBE Transform Group').property('ADBE Position').setValue([0, 0]);
    l.property('ADBE Transform Group').property('ADBE Anchor Point').setValue([0, 0]);
    return l;
  }

  // ───────────────────────────────────────────────────────────────── texto
  function resolvePostScriptFont(fontName) {
    if (!fontName) return 'MuseoSans-700';
    var map = {
      'MuseoSansRounded-1000': 'MuseoSans-900',
      'MuseoSansRounded-900': 'MuseoSans-900',
      'MuseoSansRounded-700': 'MuseoSans-700',
      'MuseoSansRounded-500': 'MuseoSans-500',
      'MuseoSansRounded-300': 'MuseoSans-300',
      'MuseoSansRounded-100': 'MuseoSans-100',
      'MuseoSansRounded700': 'MuseoSans-700',
      'Museo Sans Rounded': 'MuseoSans-700',
      'Museo Sans 900': 'MuseoSans-900',
      'Museo Sans 700': 'MuseoSans-700',
      'Museo Sans 500': 'MuseoSans-500',
      'Museo Sans 300': 'MuseoSans-300',
      'Museo Sans 100': 'MuseoSans-100'
    };
    return map[fontName] || fontName;
  }

  function styleText(layer, o) {
    var p = layer.property('ADBE Text Properties').property('ADBE Text Document');
    var td = p.value;
    td.resetCharStyle();
    td.resetParagraphStyle();
    td.font = resolvePostScriptFont(o.font);
    td.fontSize = o.size;
    td.applyFill = true;
    td.fillColor = o.color;
    td.applyStroke = false;
    td.tracking = o.tracking || 0;
    if (o.leading) { td.autoLeading = false; td.leading = o.leading; }
    td.justification = o.center ? ParagraphJustification.CENTER_JUSTIFY : ParagraphJustification.LEFT_JUSTIFY;
    p.setValue(td);
  }
  function setText(layer, str) {
    var p = layer.property('ADBE Text Properties').property('ADBE Text Document');
    var td = p.value;
    td.text = str;
    p.setValue(td);
  }
  function rectOf(layer) { return layer.sourceRectAtTime(0, false); }

  /** Corte greedy por palabras, midiendo con la fuente real dentro de AE. */
  function wrap(layer, str, maxW) {
    var words = str.split(/\s+/);
    var lines = [], cur = '';
    for (var i = 0; i < words.length; i++) {
      var next = cur ? cur + ' ' + words[i] : words[i];
      setText(layer, next);
      if (cur && rectOf(layer).width > maxW) {
        lines.push(cur);
        cur = words[i];
      } else cur = next;
    }
    if (cur) lines.push(cur);
    setText(layer, lines.join('\r'));
    return lines.length;
  }

  /**
   * Capa de texto con su esquina superior izquierda VISIBLE en (x, y).
   * Devuelve {layer, h}. `maxW` activa el corte de líneas.
   */
  function text(comp, str, x, y, o) {
    var l = comp.layers.addText(str);
    l.name = o.name || str.substr(0, 28);
    styleText(l, o);
    if (o.maxW) wrap(l, str, o.maxW);
    var r = rectOf(l);
    var t = l.property('ADBE Transform Group');
    t.property('ADBE Anchor Point').setValue([r.left, r.top]);
    t.property('ADBE Position').setValue([x, y]);
    return {layer: l, h: r.height, w: r.width};
  }

  /** Revelado por carácter: opacidad, subida y desenfoque, de izquierda a derecha. */
  function revealChars(layer, t0, dur, basedOnWords) {
    soft('animador de texto', function () {
      var anims = layer.property('ADBE Text Properties').property('ADBE Text Animators');
      var an = anims.addProperty('ADBE Text Animator');
      an.name = 'Revelado';
      var props = an.property('ADBE Text Animator Properties');
      props.addProperty('ADBE Text Opacity').setValue(0);
      props.addProperty('ADBE Text Position 3D').setValue([0, 22, 0]);
      var sel = an.property('ADBE Text Selectors').addProperty('ADBE Text Selector');
      var adv = sel.property('ADBE Text Range Advanced');
      soft('basado en palabras', function () {
        if (basedOnWords) adv.property('ADBE Text Range Type2').setValue(3);
      });
      keys(sel.property('ADBE Text Percent Start'), [t0, t0 + dur], [0, 100]);
    });
  }

  function fadeIn(layer, t0, dur, rise) {
    var t = layer.property('ADBE Transform Group');
    keys(t.property('ADBE Opacity'), [t0, t0 + dur], [0, 100]);
    if (rise) {
      var p = t.property('ADBE Position');
      var v = p.value;
      keys(p, [t0, t0 + dur], [[v[0], v[1] + rise], v]);
    }
  }

  // ────────────────────────────────────────────────────── tarjetas y medios
  var PAD = 30;
  var RADIUS = 16;

  /** Sube un grupo de shape al frente: AE agrega los grupos nuevos DEBAJO. */
  function toFront(layer, grp) {
    grp.moveTo(1);
    return layer.property('ADBE Root Vectors Group').property(1);
  }

  /** Tarjeta clara: la baldosa gris plana de los botones "1° AÑO" de la web. */
  function card(comp, x, y, w, h) {
    var pl = newShapeLayer(comp, 'TARJETA · gris');
    linkFill(addRect(pl, x, y, w, h, RADIUS, hex(PAL.paper), 'gris'), 'Papel');
    pl.moveToEnd();
    return pl;
  }

  // Íconos en una caja de 100×100. `f` relleno, `s` trazo, `c` círculo.
  var ICONS = {
    agua: [{t: 'f', v: [[50, 8], [76, 58], [50, 90], [24, 58]], i: [[0, 0], [0, -18], [16, 0], [0, 16]], o: [[0, 0], [0, 16], [-16, 0], [0, -18]]}],
    gas: [
      {t: 'f', v: [[50, 6], [78, 56], [50, 92], [22, 58], [36, 36], [42, 50]], i: [[0, 0], [-4, -22], [18, 0], [0, 18], [-6, 8], [-4, 6]], o: [[0, 0], [0, 18], [-18, 0], [2, -10], [2, 8], [6, -18]]},
      {t: 'h', v: [[52, 48], [64, 72], [50, 86], [38, 72]], i: [[0, 0], [0, -10], [8, 0], [0, 8]], o: [[0, 0], [0, 8], [-8, 0], [2, -12]]},
    ],
    luz: [{t: 'f', v: [[58, 6], [24, 54], [46, 54], [38, 94], [76, 40], [54, 40], [64, 6]]}],
    auto: [
      {t: 'f', v: [[12, 64], [14, 46], [30, 42], [40, 26], [66, 26], [76, 42], [88, 46], [90, 64]]},
      {t: 'c', c: [30, 66], r: 11}, {t: 'c', c: [72, 66], r: 11},
    ],
    moto: [
      {t: 'r', c: [24, 66], r: 14}, {t: 'r', c: [78, 66], r: 14},
      {t: 's', v: [[24, 66], [44, 46], [64, 46], [78, 66]]},
      {t: 's', v: [[64, 46], [58, 30], [70, 30]]},
    ],
    bici: [
      {t: 'r', c: [24, 64], r: 16}, {t: 'r', c: [78, 64], r: 16},
      {t: 's', v: [[24, 64], [44, 40], [68, 40], [78, 64]]},
      {t: 's', v: [[44, 40], [52, 64], [24, 64]]},
      {t: 's', v: [[38, 30], [52, 30]]},
      {t: 's', v: [[68, 40], [64, 26], [74, 26]]},
    ],
  };

  /** Dibuja un ícono de ICONS centrado en (cx, cy) dentro de un disco de diámetro d. */
  function drawIcon(l, parts, cx, cy, d, fg, hole, t0) {
    var k = d / 100 * 0.6;
    function mp(p) { return [cx + (p[0] - 50) * k, cy + (p[1] - 50) * k]; }
    function mt(p) { return [p[0] * k, p[1] * k]; }
    var sw = Math.max(3, d * 0.07);
    for (var i = 0; i < parts.length; i++) {
      var pt = parts[i], g;
      if (pt.t === 'c' || pt.t === 'r') {
        var c = mp(pt.c);
        g = addEllipse(l, c[0], c[1], pt.r * 2 * k, pt.t === 'c' ? fg : null, 'ícono ' + i);
        if (pt.t === 'r') addStroke(g, fg, sw);
      } else {
        var vs = [], ins = [], outs = [];
        for (var j = 0; j < pt.v.length; j++) {
          vs.push(mp(pt.v[j]));
          ins.push(pt.i ? mt(pt.i[j]) : [0, 0]);
          outs.push(pt.o ? mt(pt.o[j]) : [0, 0]);
        }
        g = l.property('ADBE Root Vectors Group').addProperty('ADBE Vector Group');
        g.name = 'ícono ' + i;
        var sh = g.property('ADBE Vectors Group').addProperty('ADBE Vector Shape - Group');
        var s = new Shape();
        s.vertices = vs; s.inTangents = ins; s.outTangents = outs;
        s.closed = pt.t !== 's';
        sh.property('ADBE Vector Shape').setValue(s);
        if (pt.t === 's') {
          var st = addStroke(g, fg, sw);
          soft('unión redonda', function () { st.property('ADBE Vector Stroke Line Join').setValue(2); });
          drawOn(g, t0 + sec(6), t0 + sec(18));
        } else {
          var f = g.property('ADBE Vectors Group').addProperty('ADBE Vector Graphic - Fill');
          f.property('ADBE Vector Fill Color').setValue(pt.t === 'h' ? hole : fg);
        }
      }
      g = toFront(l, g);
      if (pt.t !== 's') {
        keys(g.property('ADBE Vector Transform Group').property('ADBE Vector Group Opacity'),
          [t0 + sec(5), t0 + sec(12)], [0, 100]);
      }
    }
  }

  /** Medio (foto/video/gif) recortado en un rect redondeado con track matte. */
  function mediaInCard(comp, rel, x, y, w, h, fit, t0, kenBurns) {
    var item = footage(rel);
    var l = comp.layers.add(item);
    l.name = 'MEDIO · ' + rel.replace('assets/', '');
    if (l.hasAudio) l.audioEnabled = false;
    // Un .mov de GIF dura lo que duraba el GIF: se loopea hasta cubrir el bloque.
    if (item.mainSource && item.duration && item.duration < comp.duration) {
      soft('loop', function () { item.mainSource.loop = Math.ceil(comp.duration / item.duration) + 1; });
      l.outPoint = comp.duration;
    }
    var cover = Math.max(w / item.width, h / item.height) * 100;
    var contain = Math.min(w / item.width, h / item.height) * 100;
    var s = fit === 'contain' ? contain : cover;
    var t = l.property('ADBE Transform Group');
    t.property('ADBE Position').setValue([x + w / 2, y + h / 2]);
    var kb0 = 1.02, kb1 = 1.08;
    if (kenBurns) keys(t.property('ADBE Scale'), [t0, comp.duration], [[s * kb0, s * kb0], [s * kb1, s * kb1]]);
    else t.property('ADBE Scale').setValue([s, s]);

    var matte = newShapeLayer(comp, 'MATTE · ' + l.name);
    addRect(matte, x, y, w, h, RADIUS - 6, [1, 1, 1]);
    matte.moveBefore(l);
    var ok = soft('track matte', function () {
      l.setTrackMatte(matte, TrackMatteType.ALPHA);
      return true;
    });
    if (!ok) { l.trackMatteType = TrackMatteType.ALPHA; }
    return {layer: l, matte: matte};
  }

  /** Pastilla de crédito ("Recreado con IA") sobre la esquina del medio. */
  function creditPill(comp, str, right, bottom, t0) {
    var tx = text(comp, str, 0, 0, {name: 'CRÉDITO', font: FONTS.body, size: 15, color: [1, 1, 1]});
    var px = 12, py = 7;
    var x = right - tx.w - px * 2 - 10, y = bottom - tx.h - py * 2 - 10;
    tx.layer.property('ADBE Transform Group').property('ADBE Position').setValue([x + px, y + py]);
    var pill = newShapeLayer(comp, 'CRÉDITO · pastilla');
    addRect(pill, x, y, tx.w + px * 2, tx.h + py * 2, 999, hex(PAL.ink));
    pill.property('ADBE Transform Group').property('ADBE Opacity').setValue(70);
    pill.moveAfter(tx.layer);
    fadeIn(tx.layer, t0, sec(10));
    fadeIn(pill, t0, sec(10));
  }

  // ─────────────────────────────────────────────────── constructores por tipo
  var BUILD = {};

  // ─────────────────────────────────────────── primitivas de la plataforma
  var STRIP = [0.14, 0.42, 0.33, 0.11]; // proporciones de la franja de la web

  /** Franja de 4 colores que se dibuja de izquierda a derecha. */
  function bandStrip(comp, x, y, w, h, t0) {
    var l = newShapeLayer(comp, 'FRANJA · bandas');
    var xx = x;
    for (var i = 0; i < 4; i++) {
      var sw = Math.round(w * STRIP[i]) + (i < 3 ? 1 : 0);
      linkFill(addRect(l, xx, y, sw, h, 0, hex(M.theme.rainbow[i]), 'banda ' + (i + 1)), 'Arcoiris ' + (i + 1));
      xx += Math.round(w * STRIP[i]);
    }
    var t = l.property('ADBE Transform Group');
    t.property('ADBE Anchor Point').setValue([x, y]);
    t.property('ADBE Position').setValue([x, y]);
    keys(t.property('ADBE Scale'), [t0, t0 + sec(14)], [[0, 100], [100, 100]]);
    return l;
  }

  /** Tarjeta oscura de los listados, con la franja arriba recortada a sus esquinas. */
  function darkCard(comp, x, y, w, h) {
    var l = newShapeLayer(comp, 'TARJETA · oscura');
    linkFill(addRect(l, x, y, w, h, RADIUS, hex(WEB.oscuro), 'oscuro'), 'Acento oscuro');
    var strip = bandStrip(comp, x, y, w, 8, sec(2));
    l.moveToEnd();
    strip.moveBefore(l);
    soft('recorte de franja', function () {
      var m = l.duplicate();
      m.name = 'MATTE · franja';
      m.moveBefore(strip);
      strip.setTrackMatte(m, TrackMatteType.ALPHA);
      m.enabled = false;
    });
    return l;
  }

  function mintStroke(grp, w) {
    var st = addStroke(grp, hex(WEB.menta), w);
    soft('color menta', function () { st.property('ADBE Vector Stroke Color').expression = colorExpr('Acento'); });
    soft('unión redonda', function () { st.property('ADBE Vector Stroke Line Join').setValue(2); });
    return st;
  }

  /** Subrayado menta con la flecha ↓ al final, como las cabeceras de la web. */
  function mintUnderline(comp, x0, x1, y, t0, withArrow) {
    var l = newShapeLayer(comp, 'SUBRAYADO · menta');
    var g = addPath(l, [[x0, y], [x1, y]], false, 'línea');
    mintStroke(g, 2);
    drawOn(g, t0, t0 + sec(16));
    if (withArrow) {
      var s = 26, ax = x1 + 22, ay = y - 12;
      var a1 = addPath(l, [[ax, ay - s / 2], [ax, ay + s / 2]], false, 'flecha');
      mintStroke(a1, 3);
      drawOn(a1, t0 + sec(10), t0 + sec(18));
      var a2 = addPath(l, [[ax - s * 0.36, ay + s * 0.12], [ax, ay + s / 2], [ax + s * 0.36, ay + s * 0.12]], false, 'punta');
      mintStroke(a2, 3);
      drawOn(a2, t0 + sec(14), t0 + sec(22));
    }
    return l;
  }

  /**
   * Barrido de bandas diagonales, como el encabezado de la web: cuatro capas
   * (cian, roja, amarilla, verde) inclinadas, desfasadas 2 cuadros. A mitad de
   * camino la verde cubre todo el rect.
   */
  function diagonalBands(comp, name, t0, t1, rx, ry, rw, rh) {
    var dx = rh * 0.7; // ~35°
    var bodyW = rw + dx + 240;
    var made = [];
    for (var i = 0; i < 4; i++) {
      var l = newShapeLayer(comp, name + ' · banda ' + (i + 1));
      var g = addPath(l, [[0, ry + rh], [dx, ry], [dx + bodyW, ry], [bodyW, ry + rh]], true, 'banda');
      var f = g.property('ADBE Vectors Group').addProperty('ADBE Vector Graphic - Fill');
      f.property('ADBE Vector Fill Color').setValue(hex(M.theme.rainbow[i]));
      soft('color banda', function () { f.property('ADBE Vector Fill Color').expression = colorExpr('Arcoiris ' + (i + 1)); });
      var lag = sec(2 * i);
      var mid = rx + (rw - bodyW - dx) / 2;
      keys(l.property('ADBE Transform Group').property('ADBE Position'),
        [t0 + lag, (t0 + t1) / 2 + lag, t1 + lag], [[rx - bodyW - dx - 40, 0], [mid, 0], [rx + rw + 40, 0]]);
      l.motionBlur = true;
      made.push(l);
    }
    return made;
  }

  /** Número gigante con "°" y la palabra chica al lado: la baldosa "2° AÑO". */
  function numberTile(comp, n, word, x, y, S, t0) {
    var tile = newShapeLayer(comp, 'BALDOSA · ' + word + ' ' + n);
    linkFill(addRect(tile, x, y, S, S, 12, hex(WEB.gris), 'gris'), 'Papel');
    var num = text(comp, String(n), 0, 0, {name: 'NÚMERO', font: 'MuseoSans-900', size: S * 0.66, color: hex(WEB.tinta)});
    var nx = x + S * 0.12, ny = y + (S - num.h) / 2 + S * 0.02;
    num.layer.property('ADBE Transform Group').property('ADBE Position').setValue([nx, ny]);
    var ringD = S * 0.2, rx = nx + num.w + S * 0.04 + ringD / 2, ry = ny + ringD / 2 + S * 0.02;
    var deg = newShapeLayer(comp, 'GRADO');
    addStroke(addEllipse(deg, rx, ry, ringD * 0.72, null, 'grado'), hex(WEB.tinta), S * 0.065);
    var wd = text(comp, word, rx - ringD * 0.62, ny + num.h * 0.52, {name: 'PALABRA', font: FONTS.bodyBold, size: S * 0.13, color: hex(WEB.tinta)});
    var all = [tile, num.layer, deg, wd.layer];
    // Pop con un leve sobrepaso, como pidió la dirección de esta versión.
    for (var i = 0; i < all.length; i++) {
      var t = all[i].property('ADBE Transform Group');
      var c = [x + S / 2, y + S / 2];
      var a = t.property('ADBE Anchor Point').value, p = t.property('ADBE Position').value;
      // Se escala alrededor del centro de la baldosa sin mover nada de lugar.
      t.property('ADBE Anchor Point').setValue([a[0] + (c[0] - p[0]), a[1] + (c[1] - p[1])]);
      t.property('ADBE Position').setValue(c);
      keys(t.property('ADBE Scale'), [t0, t0 + sec(10), t0 + sec(15)], [[0, 0], [106, 106], [100, 100]]);
    }
    return tile;
  }

  /** Titular oscuro con franja; los pasos llevan la baldosa del número. */
  BUILD.titular = function (comp, b, box) {
    var wide = box.width >= 800;
    var P = wide ? 30 : 24;
    var top = 8 + P;
    var x0 = P;
    var hasStep = b.step !== undefined;
    var S = wide ? 150 : 116;
    if (hasStep) {
      numberTile(comp, b.step, 'PASO', P, top, S, sec(4));
      x0 += S + (wide ? 30 : 22);
    }
    var innerW = box.width - x0 - P - 50;
    var y = top + (hasStep ? 4 : 0);
    if (!hasStep) {
      var k = text(comp, b.kicker.toUpperCase(), x0, y, {name: 'KICKER', font: FONTS.body, size: wide ? 22 : 18, color: hex(WEB.menta), tracking: 120});
      revealChars(k.layer, sec(4), sec(12), false);
      y += k.h + 12;
    }
    var title = text(comp, b.title, x0, y, {
      name: 'TÍTULO', font: FONTS.heading, size: wide ? 50 : 38, leading: wide ? 58 : 45,
      color: [1, 1, 1], maxW: innerW,
    });
    revealChars(title.layer, sec(8), sec(18), true);
    y += title.h + 18;
    mintUnderline(comp, x0, box.width - P - 50, y, sec(14), true);
    y += 14 + P;
    var h = Math.max(y, hasStep ? top + S + P : 0);
    darkCard(comp, 0, 0, box.width, h);
    if (hasStep) soft('bandas de paso', function () {
      var bs = diagonalBands(comp, 'BANDAS PASO', 0, sec(14), 0, 0, box.width, h);
      for (var q = bs.length - 1; q >= 0; q--) bs[q].moveToBeginning();
    });
    return h;
  };

  /** Ícono de línea chico para los metadatos de las filas. */
  function metaIcon(comp, kind, x, y, s) {
    var l = newShapeLayer(comp, 'META · ' + kind);
    var c = hex(WEB.meta);
    if (kind === 'recurso') {
      addStroke(addRect(l, x, y, s * 0.8, s, 2, null, 'hoja'), c, 2);
      addStroke(addPath(l, [[x + s * 0.2, y + s * 0.4], [x + s * 0.6, y + s * 0.4]], false, 'l1'), c, 2);
      addStroke(addPath(l, [[x + s * 0.2, y + s * 0.65], [x + s * 0.6, y + s * 0.65]], false, 'l2'), c, 2);
    } else if (kind === 'animacion') {
      addStroke(addPath(l, [[x, y], [x + s * 0.85, y + s / 2], [x, y + s]], true, 'play'), c, 2);
    } else {
      // Destello de 4 puntas: "recreado con IA".
      var m = s / 2, cx = x + m, cy = y + m;
      addStroke(addPath(l, [[cx, y], [cx + m * 0.25, cy - m * 0.25], [x + s, cy], [cx + m * 0.25, cy + m * 0.25],
        [cx, y + s], [cx - m * 0.25, cy + m * 0.25], [x, cy], [cx - m * 0.25, cy - m * 0.25]], true, 'destello'), c, 2);
    }
    return l;
  }

  /** Recurso de refuerzo como fila de la web: miniatura, título y metadatos. */
  function resourceRow(comp, b, box, kind) {
    var wide = box.width >= 800;
    var P = 18;
    var T = wide ? 200 : 150;
    var w = box.width;
    var h = T + P * 2;
    card(comp, 0, 0, w, h);
    mediaInCard(comp, b.src, P, P, T, T, kind === 'gif' ? 'contain' : 'cover', 0, kind === 'photo');
    var tx = P + T + 24, tw = w - tx - P;
    var ty = P + 6;
    var ttl = text(comp, b.caption || b.label || '', tx, ty, {name: 'TÍTULO', font: FONTS.heading, size: wide ? 32 : 26, leading: wide ? 38 : 31, color: hex(WEB.tinta), maxW: tw});
    revealChars(ttl.layer, sec(6), sec(14), true);
    ty += ttl.h + 16;
    var m = /recurso-(\d+)/.exec(b.key);
    var metas = [[kind === 'gif' ? 'animacion' : 'recurso', (kind === 'gif' ? 'ANIMACIÓN' : 'RECURSO') + (m ? ' ' + m[1] : '')]];
    if (b.credit) metas.push(['ia', b.credit.replace('Recreado con Inteligencia Artificial', 'Recreado con IA')]);
    for (var i = 0; i < metas.length; i++) {
      var ic = metaIcon(comp, metas[i][0], tx, ty + 2, 20);
      var mt = text(comp, metas[i][1], tx + 32, ty, {name: 'META ' + (i + 1), font: FONTS.body, size: 21, color: hex(WEB.meta), tracking: i === 0 ? 80 : 0});
      fadeIn(ic, sec(12 + 4 * i), sec(10), 10);
      fadeIn(mt.layer, sec(12 + 4 * i), sec(10), 10);
      ty += mt.h + 10;
    }
    return Math.max(h, ty + P);
  }

  BUILD.photo = function (comp, b, box) { return b.rank === 'refuerzo' ? resourceRow(comp, b, box, 'photo') : mediaCard(comp, b, box, 'photo').h; };
  BUILD.gif = function (comp, b, box) { return b.rank === 'refuerzo' ? resourceRow(comp, b, box, 'gif') : mediaCard(comp, b, box, 'gif').h; };

  var DISC_I = 0; // cada ítem de una lista toma el siguiente color de banda

  function mediaCard(comp, b, box, kind) {
    var didactico = b.rank === 'didactico';
    var w = didactico ? box.width : Math.round(box.width * 0.82);
    // El refuerzo es más angosto y se pega al borde exterior del cuadro.
    var x = didactico ? 0 : (box.x + box.width / 2 > W / 2 ? box.width - w : 0);
    var capText = b.caption || b.label || '';
    var capH = capText ? 64 : 0;
    var inner = 14;
    var mw = w - inner * 2;
    var mx = x + inner;
    var mh = Math.min(box.height - inner * 2 - capH, Math.round(mw * 0.62));
    var h = inner + mh + (capText ? capH : inner);

    card(comp, x, 0, w, h);
    mediaInCard(comp, b.src, mx, inner, mw, mh, b.fit, 0, kind === 'photo');
    if (capText) {
      var cap = text(comp, capText, mx, inner + mh + 16, {
        name: 'PIE', font: FONTS.body, size: 26, color: hex(PAL.ink), maxW: mw,
      });
      revealChars(cap.layer, sec(10), sec(14), true);
    }
    if (b.credit) creditPill(comp, b.credit, mx + mw, inner + mh, sec(14));
    return {h: h, x: x, w: w};
  }

  BUILD.video = function (comp, b, box) { return mediaCard(comp, b, box, 'video').h; };

  /**
   * Ícono del ítem en un disco de color de banda, con el pictograma en blanco.
   * Prohibido: pictograma en tinta con aro y tachado rojos. Sin ícono
   * declarado, un tilde que se dibuja.
   */
  function itemIcon(comp, it, cx, cy, d, t0) {
    var l = newShapeLayer(comp, 'ÍCONO · ' + it.term);
    var bad = !!it.forbidden;
    if (!bad) {
      // Cian, amarillo, verde y recién después rojo: un tilde sobre rojo se lee como error.
      var di = [0, 2, 3, 1][(DISC_I++) % 4];
      linkFill(addEllipse(l, cx, cy, d, hex(M.theme.rainbow[di]), 'disco'), 'Arcoiris ' + (di + 1));
    }
    var tr = l.property('ADBE Transform Group');
    tr.property('ADBE Anchor Point').setValue([cx, cy]);
    tr.property('ADBE Position').setValue([cx, cy]);
    keys(tr.property('ADBE Scale'), [t0, t0 + sec(8), t0 + sec(13)], [[0, 0], [110, 110], [100, 100]]);

    var parts = it.icon && ICONS[it.icon];
    if (parts) {
      soft('ícono ' + it.icon, function () {
        drawIcon(l, parts, cx, cy, d, bad ? hex(PAL.ink) : [1, 1, 1], bad ? hex(PAL.paper) : hex(PAL.accentDeep), t0);
      });
    } else if (!bad) {
      var k = d * 0.22;
      var tick = addPath(l, [[cx - k * 1.1, cy + k * 0.05], [cx - k * 0.25, cy + k * 0.9], [cx + k * 1.2, cy - k * 0.8]], false, 'tilde');
      addStroke(tick, [1, 1, 1], 6);
      drawOn(toFront(l, tick), t0 + sec(6), t0 + sec(16));
    }
    if (bad) {
      var ring = addEllipse(l, cx, cy, d - 6, null, 'aro');
      var st = addStroke(ring, hex(PAL.magenta), 6);
      soft('color alerta', function () { st.property('ADBE Vector Stroke Color').expression = colorExpr('Alerta'); });
      toFront(l, ring);
      var r = (d - 6) / 2 * 0.72;
      var slash = addPath(l, [[cx - r, cy - r], [cx + r, cy + r]], false, 'tachado');
      var st2 = addStroke(slash, hex(PAL.magenta), 7);
      soft('color alerta', function () { st2.property('ADBE Vector Stroke Color').expression = colorExpr('Alerta'); });
      drawOn(toFront(l, slash), t0 + sec(10), t0 + sec(18));
    }
  }

  BUILD.checklist = function (comp, b, box) {
    var wide = box.width >= 800;
    var x0 = PAD;
    var innerW = box.width - x0 - PAD;
    var y = PAD;
    if (b.kicker) {
      var k = text(comp, b.kicker, x0, y, {name: 'KICKER', font: FONTS.bodyBold, size: 20, color: hex(b.items[0].forbidden ? PAL.magentaDeep : PAL.accentDeep), tracking: 160});
      revealChars(k.layer, sec(2), sec(12), false);
      y += k.h + 18;
    }
    var n = b.items.length;
    var horizontal = wide && n <= 3;
    var d = wide ? 72 : 56;

    if (horizontal) {
      // Tres columnas: ícono arriba, término y detalle abajo.
      var colW = innerW / n;
      var maxH = 0;
      for (var i = 0; i < n; i++) {
        var it = b.items[i];
        var t0 = Math.max(0, sec(it.at - b.from));
        var cx = x0 + colW * i;
        itemIcon(comp, it, cx + d / 2, y + d / 2, d, t0);
        var term = text(comp, it.term, cx, y + d + 14, {name: 'TÉRMINO · ' + it.term, font: FONTS.heading, size: 36, color: hex(PAL.ink), maxW: colW - 16});
        fadeIn(term.layer, t0 + sec(4), sec(10), 18);
        var hh = d + 14 + term.h;
        if (it.detail) {
          var det = text(comp, it.detail, cx, y + d + 14 + term.h + 6, {name: 'DETALLE · ' + it.term, font: FONTS.bodyLight, size: 26, color: hex(PAL.inkSoft), maxW: colW - 16});
          fadeIn(det.layer, t0 + sec(8), sec(10), 12);
          hh += 6 + det.h;
        }
        maxH = Math.max(maxH, hh);
      }
      y += maxH + 18;
    } else {
      var centers = [], times = [];
      for (var j = 0; j < n; j++) {
        var it2 = b.items[j];
        var s0 = Math.max(0, sec(it2.at - b.from));
        centers.push(y + d / 2);
        times.push(s0);
        itemIcon(comp, it2, x0 + d / 2, y + d / 2, d, s0);
        var tx = x0 + d + 18;
        var term2 = text(comp, it2.term, tx, y + (it2.detail ? 0 : d / 2 - 18), {name: 'TÉRMINO · ' + it2.term, font: FONTS.heading, size: wide ? 36 : 31, color: hex(PAL.ink)});
        fadeIn(term2.layer, s0 + sec(4), sec(10), 18);
        var rowH = d;
        if (it2.detail) {
          var det2 = text(comp, it2.detail, tx, y + term2.h + 4, {name: 'DETALLE · ' + it2.term, font: FONTS.bodyLight, size: wide ? 27 : 24, color: hex(PAL.inkSoft), maxW: innerW - d - 18});
          fadeIn(det2.layer, s0 + sec(8), sec(10), 12);
          rowH = Math.max(d, term2.h + 4 + det2.h);
        }
        y += rowH + 16;
      }
      // Una secuencia (Antes → Durante → Después) se une con un hilo que
      // avanza de ítem en ítem. Una lista de prohibiciones no: no es un camino.
      if (n > 1 && !b.items[0].forbidden) soft('hilo de la secuencia', function () {
        var hl = newShapeLayer(comp, 'HILO');
        var hg = addPath(hl, [[x0 + d / 2, centers[0]], [x0 + d / 2, centers[n - 1]]], false, 'hilo');
        var hs = addStroke(hg, hex(PAL.accent), 4);
        soft('color hilo', function () { hs.property('ADBE Vector Stroke Color').expression = colorExpr('Acento'); });
        var trim = hg.property('ADBE Vectors Group').addProperty('ADBE Vector Filter - Trim');
        var tv = [];
        for (var q = 0; q < n; q++) tv.push(100 * q / (n - 1));
        keys(trim.property('ADBE Vector Trim End'), times, tv);
        hl.moveToEnd();
      });
    }
    if (b.note) {
      var note = text(comp, b.note, x0, y, {name: 'NOTA', font: FONTS.body, size: 21, color: hex(PAL.magentaDeep), maxW: innerW});
      var lastAt = b.items[n - 1].at;
      fadeIn(note.layer, sec(lastAt - b.from + 20), sec(12), 10);
      y += note.h + 8;
    }
    var h = y + PAD - 16;
    card(comp, 0, 0, box.width, h);
    return h;
  };

  BUILD.evidence = function (comp, b, box) {
    // Tira de tres imágenes que se abren desde el centro con una máscara.
    var n = b.items.length;
    var gap = 18;
    var tileW = Math.floor((box.width - gap * (n - 1)) / n);
    var tileH = tileW;
    var labelH = 90;
    var h = tileH + labelH;
    for (var i = 0; i < n; i++) {
      var it = b.items[i];
      var t0 = Math.max(0, sec(it.at - b.from));
      var x = i * (tileW + gap);
      var bgL = newShapeLayer(comp, 'TESELA · ' + (i + 1));
      var g = addRect(bgL, x, 0, tileW, tileH, RADIUS, hex(PAL.paper));
      linkFill(g, 'Papel');
      var img = mediaInCard(comp, it.src, x + 12, 12, tileW - 24, tileH - 24, 'contain', t0, false);
      soft('máscara de revelado', function () {
        // La tesela entera (fondo + imagen) se abre desde el centro.
        var tiles = [bgL, img.matte];
        for (var q = 0; q < tiles.length; q++) {
          var mk = tiles[q].property('ADBE Mask Parade').addProperty('ADBE Mask Atom');
          var ms = new Shape();
          ms.vertices = [[x, 0], [x + tileW, 0], [x + tileW, tileH], [x, tileH]];
          ms.closed = true;
          mk.property('ADBE Mask Shape').setValue(ms);
          mk.property('ADBE Mask Feather').setValue([24, 24]);
          keys(mk.property('ADBE Mask Offset'), [t0, t0 + sec(12)], [-tileW / 2, 0]);
        }
      });
      var lb = text(comp, it.label, x, tileH + 14, {name: 'ETIQUETA · ' + (i + 1), font: FONTS.heading, size: 32, color: [1, 1, 1], maxW: tileW});
      revealChars(lb.layer, t0 + sec(6), sec(12), true);
      soft('sombra etiqueta', function () {
        var ds = lb.layer.property('ADBE Effect Parade').addProperty('ADBE Drop Shadow');
        ds.property('ADBE Drop Shadow-0001').setValue(hex(PAL.ink, 1));
        ds.property('ADBE Drop Shadow-0002').setValue(150);
        ds.property('ADBE Drop Shadow-0004').setValue(3);
        ds.property('ADBE Drop Shadow-0005').setValue(10);
      });
    }
    return h;
  };

  // ─────────────────────────────────────────────────── bloques en la comp
  // La apertura ocupa el plató vacío: del primer bloque hasta el primer
  // titular. Los bloques que arrancan ahí entran OPEN_HOLD cuadros más tarde,
  // cuando el título ya subió a su banda.
  var OPEN_FROM = M.blocks[0].from, OPEN_TO = OPEN_FROM, OPEN_HOLD = 26;
  for (var ob = 0; ob < M.blocks.length; ob++) {
    if (M.blocks[ob].kind === 'titular') { OPEN_TO = M.blocks[ob].from - 4; break; }
  }
  var built = 0;
  for (var bi = 0; bi < M.blocks.length; bi++) {
    var b = M.blocks[bi];
    var box = b.boxes[0];
    var builder = BUILD[b.kind];
    DISC_I = 0;
    if (!builder) { log('· sin constructor para ' + b.kind + ' (' + b.key + '), se omite'); continue; }
    var dur = sec(b.to - b.from);
    var pre = proj.items.addComp(b.kind + '_' + b.key, box.width, box.height, 1, dur, FPS);
    pre.parentFolder = F.graficos;
    pre.bgColor = hex(PAL.stage);
    pre.motionBlur = true;

    var contentH = soft(b.kind + ':' + b.key, function () { return builder(pre, b, box); });
    if (!contentH) { log('✗ ' + b.kind + ':' + b.key + ' quedó incompleto'); contentH = box.height; }
    contentH = Math.min(Math.ceil(contentH), box.height);

    // `align` ubica la tarjeta dentro de la caja libre, como lo pide el motor.
    var offY = b.align === 'bottom' ? box.height - contentH
      : b.align === 'center' ? (box.height - contentH) / 2 : 0;

    var L = main.layers.add(pre);
    L.name = b.kind.toUpperCase() + ' · ' + b.key;
    L.startTime = sec(b.from);
    if (b.from < OPEN_TO) {
      L.startTime = sec(b.from + OPEN_HOLD);
      L.outPoint = sec(b.to);
    }
    L.motionBlur = true;
    L.label = b.kind === 'titular' ? 11 : b.kind === 'checklist' ? 14 : 13;
    var tr = L.property('ADBE Transform Group');
    // Anclada en el borde EXTERIOR de la tarjeta: crece hacia adentro, que es
    // de donde viene el lugar libre.
    var toRight = box.x + box.width / 2 > W / 2;
    var ax = toRight ? box.width : 0;
    var ay = offY + contentH / 2;
    tr.property('ADBE Anchor Point').setValue([ax, ay]);
    tr.property('ADBE Position').setValue([box.x + ax, box.y + ay]);

    if (b.boxes.length > 1) {
      var ts = [], vs = [];
      for (var kb = 0; kb < b.boxes.length; kb++) {
        var bx = b.boxes[kb];
        ts.push(sec(bx.f - b.from) + L.startTime);
        vs.push([bx.x + ax, bx.y + ay]);
      }
      keys(tr.property('ADBE Position'), ts, vs);
    }

    // Entrada y salida gobernadas por CONTROL. easeOutBack: la tarjeta se
    // desliza desde el borde exterior y se pasa apenas; `Rebote (%)` en 0 lo
    // vuelve un ease out cúbico sin sobrepaso (el sistema de Ambiente lo
    // desaconseja, por eso es un control y no una constante).
    var common = 'var c=thisComp.layer("CONTROL");' +
      'var fi=Math.max(1,c.effect("Entrada (frames)")(1))*thisComp.frameDuration;' +
      'var fo=Math.max(1,c.effect("Salida (frames)")(1))*thisComp.frameDuration;' +
      'var t=Math.min(1,Math.max(0,(time-inPoint)/fi));' +
      'var s=1.70158*c.effect("Rebote (%)")(1)/8;' +
      'var e=1+(s+1)*Math.pow(t-1,3)+s*Math.pow(t-1,2);' +
      'var x=ease(outPoint-time,0,fo,0,1);';
    var dir = toRight ? 1 : -1;
    soft('expresiones de tarjeta', function () {
      tr.property('ADBE Opacity').expression = common + 'Math.min(Math.min(1,t*2.5),x)*100;';
      tr.property('ADBE Position').expression = common +
        'var d=c.effect("Deslizamiento (px)")(1);value+[' + dir + '*((1-e)*d+(1-x)*d*0.35),0];';
    });
    soft('sombra', function () {
      var ds = L.property('ADBE Effect Parade').addProperty('ADBE Drop Shadow');
      ds.property('ADBE Drop Shadow-0001').setValue(hex(PAL.ink, 1));
      ds.property('ADBE Drop Shadow-0003').setValue(180);
      ds.property('ADBE Drop Shadow-0004').setValue(8);
      ds.property('ADBE Drop Shadow-0005').setValue(24);
      ds.property('ADBE Drop Shadow-0002').expression = 'thisComp.layer("CONTROL").effect("Sombra (%)")(1)*2.55;';
    });
    built++;
  }
  log('· ' + built + ' tarjetas armadas');

  // ───────────────────────────────────────────────────────────── subtítulos
  // Estándar de subtitulado EducaPlay (subtitulos/EDUCAPLAY_MOTION_GRAPHICS_
  // ACTUALIZADO.md §1.4):
  //   · pastilla esmerilada: scrim plano al 55 % (negro: la tinta #07202C del
  //     documento no llega a 4,5:1, ver THEME.captions), 10 px de desenfoque
  //     detrás, radio 20, borde de 1 px al 16 %, filete interior y sombra suave;
  //     sin degradados ni brillos;
  //   · Museo Sans (Rounded) 700 blanco, con sombra de texto;
  //   · nunca más de dos líneas, cortadas de forma balanceada;
  //   · se eleva sobre la placa de la docente (todo el subtítulo, sin moverse).
  // Sin resaltado por palabra. Una capa por subtítulo: doble clic para
  // corregir, arrastrar los bordes para el timing.
  function pad2(n) { return n < 10 ? '0' + n : String(n); }

  /**
   * Corte balanceado (el `textWrap: balance` del documento): si no entra en
   * una línea, prueba cada corte entre palabras y se queda con el que deja la
   * línea más larga lo más corta posible. Mide con la fuente real.
   */
  function wrapBalanced(layer, str, maxW, maxLines) {
    setText(layer, str);
    if (rectOf(layer).width <= maxW) return 1;
    var words = str.split(/\s+/);
    var best = null, bestW = Infinity;
    for (var k = 1; k < words.length; k++) {
      var a = words.slice(0, k).join(' '), b = words.slice(k).join(' ');
      setText(layer, a);
      var wa = rectOf(layer).width;
      setText(layer, b);
      var m = Math.max(wa, rectOf(layer).width);
      if (m < bestW) { bestW = m; best = a + '\r' + b; }
    }
    if (bestW <= maxW) { setText(layer, best); return 2; }
    // No entra ni en dos: el export ya pagina, así que esto no debería pasar.
    return wrap(layer, str, maxW);
  }

  soft('subtítulos', function () {
    var subs = proj.items.addComp('SUBTITULOS', W, H, 1, sec(M.duration), FPS);
    subs.parentFolder = F.subs;
    var CP = M.theme.captions;
    var PILL = CP.pill || {radius: 20, padX: 34, padY: 14, blur: 10, lineHeight: 1.32, maxLines: 2};
    var fs = CP.fontSize, padX = PILL.padX, padY = PILL.padY;
    var FADE = 4; // frames de fundido de entrada y salida
    var over = 0;

    for (var i = 0; i < M.captions.length; i++) {
      var c = M.captions[i];
      var tl = subs.layers.addText(c.text);
      tl.name = 'SUB ' + pad2(i + 1) + ' · ' + c.text.substr(0, 32);
      styleText(tl, {font: FONTS.body, size: fs, color: [1, 1, 1], center: true, leading: Math.round(fs * PILL.lineHeight)});
      var lines = wrapBalanced(tl, c.text, c.box.width - padX * 2, PILL.maxLines);
      if (lines > PILL.maxLines) { over++; log('⚠ subtítulo ' + pad2(i + 1) + ' en ' + lines + ' líneas'); }
      tl.inPoint = sec(c.from);
      tl.outPoint = sec(c.to);

      var tt = tl.property('ADBE Transform Group');
      // Si la placa de la docente se cruza con el subtítulo, el subtítulo va
      // elevado TODA su duración: un texto no se mueve mientras se lee, y la
      // placa del máster empieza a animarse ~1 s antes de su rango reservado.
      var cbx = c.boxes || [c.box];
      var hi = cbx[0];
      for (var q = 1; q < cbx.length; q++) if (cbx[q].y < hi.y) hi = cbx[q];
      tt.property('ADBE Position').setValue([hi.x + hi.width / 2, hi.y + hi.height]);
      tt.property('ADBE Anchor Point').expression = 'var r=sourceRectAtTime(time,false);[r.left+r.width/2,r.top+r.height];';
      tt.property('ADBE Position').expression = 'value-[0,' + padY + ']';
      tt.property('ADBE Opacity').expression =
        'var d=' + FADE + '*thisComp.frameDuration;Math.min(ease(time-inPoint,0,d,0,100),ease(outPoint-time,0,d,0,100));';
      soft('sombra de texto', function () {
        var ds = tl.property('ADBE Effect Parade').addProperty('ADBE Drop Shadow');
        ds.property('ADBE Drop Shadow-0001').setValue([0, 0, 0, 1]);
        ds.property('ADBE Drop Shadow-0002').setValue(128);
        ds.property('ADBE Drop Shadow-0003').setValue(180);
        ds.property('ADBE Drop Shadow-0004').setValue(2);
        ds.property('ADBE Drop Shadow-0005').setValue(4);
      });
    }

    // Una sola pastilla: busca el subtítulo activo y se ajusta a él.
    var FIND = 'var L=null;for(var i=1;i<=thisComp.numLayers;i++){var l=thisComp.layer(i);' +
      'if(l.name.indexOf("SUB ")==0&&l.active){L=l;break;}}';
    var SIZE = FIND + 'var sz=[0,0];if(L){var r=L.sourceRectAtTime(time,false);sz=[r.width+' + padX * 2 + ',r.height+' + padY * 2 + '];}';
    var pill = subs.layers.addShape();
    pill.name = 'PASTILLA';
    var g = pill.property('ADBE Root Vectors Group').addProperty('ADBE Vector Group');
    g.name = 'scrim';
    var gv = g.property('ADBE Vectors Group');
    gv.addProperty('ADBE Vector Shape - Rect');
    gv.addProperty('ADBE Vector Graphic - Fill');
    gv.addProperty('ADBE Vector Graphic - Stroke');
    // Se leen DESPUÉS de agregar todo: cada addProperty invalida las anteriores.
    var rect = gv.property('ADBE Vector Shape - Rect');
    var fill = gv.property('ADBE Vector Graphic - Fill');
    var st = gv.property('ADBE Vector Graphic - Stroke');
    fill.property('ADBE Vector Fill Color').setValue([0, 0, 0]);
    fill.property('ADBE Vector Fill Opacity').setValue(CP.scrimAlpha * 100);
    st.property('ADBE Vector Stroke Color').setValue([1, 1, 1]);
    st.property('ADBE Vector Stroke Width').setValue(1);
    st.property('ADBE Vector Stroke Opacity').setValue(16);
    rect.property('ADBE Vector Rect Roundness').setValue(PILL.radius);
    rect.property('ADBE Vector Rect Size').expression = SIZE + 'sz;';
    // Filete interior superior (el `inset 0 1px 0` del documento).
    soft('filete interior', function () {
      var hg = pill.property('ADBE Root Vectors Group').addProperty('ADBE Vector Group');
      hg.name = 'filete interior';
      hg.property('ADBE Vectors Group').addProperty('ADBE Vector Shape - Group');
      hg.property('ADBE Vectors Group').addProperty('ADBE Vector Graphic - Stroke');
      var hs = hg.property('ADBE Vectors Group').property('ADBE Vector Graphic - Stroke');
      hs.property('ADBE Vector Stroke Color').setValue([1, 1, 1]);
      hs.property('ADBE Vector Stroke Width').setValue(1);
      hs.property('ADBE Vector Stroke Opacity').setValue(15);
      hg.property('ADBE Vectors Group').property('ADBE Vector Shape - Group').property('ADBE Vector Shape').expression =
        SIZE + 'var w=sz[0]/2-' + PILL.radius + ',y=-sz[1]/2+1.5;' +
        'createPath([[-Math.max(w,0),y],[Math.max(w,0),y]],[],[],false);';
    });
    pill.property('ADBE Transform Group').property('ADBE Anchor Point').setValue([0, 0]);
    pill.property('ADBE Transform Group').property('ADBE Position').expression = FIND +
      'if(L){var r=L.sourceRectAtTime(time,false);L.toComp([r.left+r.width/2,r.top+r.height/2]);}else[-1000,-1000];';
    // La pastilla hereda el fundido del subtítulo activo.
    pill.property('ADBE Transform Group').property('ADBE Opacity').expression = FIND + 'L?L.transform.opacity:0;';
    soft('sombra de pastilla', function () {
      var ds = pill.property('ADBE Effect Parade').addProperty('ADBE Drop Shadow');
      ds.property('ADBE Drop Shadow-0001').setValue([0, 0, 0, 1]);
      ds.property('ADBE Drop Shadow-0002').setValue(89);
      ds.property('ADBE Drop Shadow-0003').setValue(180);
      ds.property('ADBE Drop Shadow-0004').setValue(8);
      ds.property('ADBE Drop Shadow-0005').setValue(32);
    });
    pill.moveToEnd();

    // Esmerilado: 10 px de desenfoque del cuadro, recortado a la pastilla. La
    // capa de ajuste vive en la precomp y alcanza al máster porque SUBTÍTULOS
    // va con «contraer transformaciones».
    soft('esmerilado', function () {
      var pm = pill.duplicate();
      pm.name = 'MATTE · pastilla';
      pm.property('ADBE Effect Parade').property(1).remove();
      pm.property('ADBE Root Vectors Group').property(1).property('ADBE Vectors Group')
        .property('ADBE Vector Graphic - Fill').property('ADBE Vector Fill Opacity').setValue(100);
      var adj = subs.layers.addSolid([1, 1, 1], 'PASTILLA · esmerilado', W, H, 1);
      adj.adjustmentLayer = true;
      var bl = adj.property('ADBE Effect Parade').addProperty('ADBE Gaussian Blur 2');
      bl.property(1).setValue(PILL.blur);
      soft('repetir bordes', function () { bl.property(3).setValue(1); });
      adj.moveToEnd();
      pm.moveToEnd();
      adj.setTrackMatte(pm, TrackMatteType.ALPHA);
      pm.enabled = false;
    });

    var SL = main.layers.add(subs);
    SL.name = 'SUBTÍTULOS';
    SL.label = 2;
    SL.collapseTransformation = true;
    SL.property('ADBE Transform Group').property('ADBE Opacity').expression =
      'thisComp.layer("CONTROL").effect("Subtítulos")(1)*100;';
    SL.moveToBeginning();
    log('· ' + M.captions.length + ' subtítulos, una capa cada uno' + (over ? '' : ', todos en ≤' + PILL.maxLines + ' líneas'));
  });

  // Plataforma: portada como la web. Bandas diagonales, el lockup
  // "Educaplay | Nivel Secundario" y una baldosa gris con el título; todo sube
  // a una banda superior cuando entran las alertas y el recurso 1.
  soft('apertura', function () {
    var dur = OPEN_TO - OPEN_FROM;
    var ap = proj.items.addComp('APERTURA', W, H, 1, sec(dur), FPS);
    ap.parentFolder = F.graficos;
    var ep = M.episode;
    var cy0 = H / 2, cyBand = 128, sBand = 44;
    var ctl = ap.layers.addNull(sec(dur));
    ctl.name = 'PORTADA · control';
    var ct = ctl.property('ADBE Transform Group');
    ct.property('ADBE Anchor Point').setValue([W / 2, cy0]);
    ct.property('ADBE Position').setValue([W / 2, cy0]);

    var educa = text(ap, 'Educa', 0, 0, {name: 'EDUCA', font: 'Museo-700', size: 104, color: [1, 1, 1]});
    var play = text(ap, 'play', 0, 0, {name: 'PLAY', font: 'Museo-300', size: 104, color: [1, 1, 1]});
    var nivel = text(ap, 'Nivel Secundario', 0, 0, {name: 'NIVEL', font: 'MuseoSans-500', size: 46, color: [1, 1, 1]});
    var gapBar = 34;
    var lockW = educa.w + play.w + gapBar * 2 + nivel.w;
    var lx = W / 2 - lockW / 2, ly = cy0 - 150;
    educa.layer.property('ADBE Transform Group').property('ADBE Position').setValue([lx, ly]);
    play.layer.property('ADBE Transform Group').property('ADBE Position').setValue([lx + educa.w + 2, ly + (educa.h - play.h)]);
    var barX = lx + educa.w + play.w + gapBar;
    var bar = newShapeLayer(ap, 'BARRA');
    addStroke(addPath(bar, [[barX, ly + 18], [barX, ly + educa.h - 4]], false, 'barra'), [1, 1, 1], 3);
    nivel.layer.property('ADBE Transform Group').property('ADBE Position').setValue([barX + gapBar, ly + (educa.h - nivel.h) / 2 + 6]);

    var tileW = 1100, tx = W / 2 - tileW / 2, ty = cy0 - 10;
    var serie = text(ap, ep.series.toUpperCase(), tx + 44, ty + 38, {name: 'SERIE', font: FONTS.bodyBold, size: 24, color: hex(WEB.oscuro), tracking: 200});
    var ttl = text(ap, ep.title, tx + 44, ty + 38 + serie.h + 14, {name: 'TÍTULO', font: FONTS.heading, size: 62, leading: 70, color: hex(WEB.tinta), maxW: tileW - 88});
    var tileH = 38 + serie.h + 14 + ttl.h + 40;
    var tile = newShapeLayer(ap, 'BALDOSA · título');
    linkFill(addRect(tile, tx, ty, tileW, tileH, 16, hex(WEB.gris), 'gris'), 'Papel');
    tile.moveToEnd();
    var strip = bandStrip(ap, tx, ty, tileW, 8, sec(16));
    strip.moveBefore(tile);
    soft('recorte de franja', function () {
      var m = tile.duplicate();
      m.name = 'MATTE · franja';
      m.moveBefore(strip);
      strip.setTrackMatte(m, TrackMatteType.ALPHA);
      m.enabled = false;
    });

    var kids = [educa.layer, play.layer, bar, nivel.layer, serie.layer, ttl.layer, tile, strip];
    for (var i = 0; i < kids.length; i++) kids[i].parent = ctl;
    fadeIn(educa.layer, sec(8), sec(12), 24);
    fadeIn(play.layer, sec(10), sec(12), 24);
    fadeIn(bar, sec(12), sec(10), 0);
    fadeIn(nivel.layer, sec(13), sec(12), 24);
    fadeIn(tile, sec(12), sec(10), 30);
    revealChars(serie.layer, sec(16), sec(10), false);
    revealChars(ttl.layer, sec(18), sec(14), true);
    keys(ct.property('ADBE Position'), [sec(OPEN_HOLD - 6), sec(OPEN_HOLD + 8)], [[W / 2, cy0], [W / 2, cyBand]]);
    keys(ct.property('ADBE Scale'), [sec(OPEN_HOLD - 6), sec(OPEN_HOLD + 8)], [[100, 100], [sBand, sBand]]);

    var bands = diagonalBands(ap, 'BANDAS apertura', 0, sec(16), 0, 0, W, H);
    for (var q = bands.length - 1; q >= 0; q--) bands[q].moveToBeginning();

    var AL = main.layers.add(ap);
    AL.name = 'APERTURA · portada';
    AL.startTime = sec(OPEN_FROM);
    AL.label = 11;
    AL.motionBlur = true;
    AL.property('ADBE Transform Group').property('ADBE Opacity').expression =
      'var fo=thisComp.layer("CONTROL").effect("Salida (frames)")(1)*thisComp.frameDuration;' +
      'ease(outPoint-time,0,fo,0,100);';
    log('· portada f' + OPEN_FROM + '–' + OPEN_TO);
  });

  // ─────────────────────────────────────────────────────────────── cortinas
  // En cada traslado de cámara del montajista, un barrido de bandas diagonales
  // (como el encabezado de la web) disimula el salto. Sólo los traslados con la docente en cuadro: el último
  // lleva a la placa institucional y ahí manda el máster.
  soft('bandas de traslado', function () {
    var lastTo = 0;
    for (var i = 0; i < M.blocks.length; i++) lastTo = Math.max(lastTo, M.blocks[i].to);
    var n = 0;
    for (var j = 0; j < (M.moves || []).length; j++) {
      var mv = M.moves[j];
      if (mv.from >= lastTo) continue;
      var bs = diagonalBands(main, 'BANDAS ' + mv.key, sec(mv.from - 4), sec(mv.to + 2), 0, 0, W, H);
      for (var q = 0; q < bs.length; q++) {
        bs[q].label = 8;
        bs[q].moveToBeginning();
      }
      n++;
    }
    log('· ' + n + ' barridos de bandas');
  });

  ctrl.moveToBeginning();
  masterLayer.moveToEnd();
  masterLayer.locked = true;

  // ─────────────────────────────────────────────────────────────── guardar
  var out = File(ROOTDIR.fsName + '/' + MAIN + '.aep');
  proj.save(out);
  main.openInViewer();
  app.endUndoGroup();

  log('✓ guardado en ' + out.fsName);
  // El LOG lo lee y lo guarda ae/run.mjs (revision/log.txt).
}

try {
  buildEpisode();
} catch (err) {
  // ae/run.mjs lee LOG y falla el chequeo ante cualquier ✗.
  log('✗ ERROR: ' + err.toString() + ' (línea ' + err.line + ')');
}
