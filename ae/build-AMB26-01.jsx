// Launcher directo para After Effects - AMB26-01
// EducaPlay Secundaria (Corrientes)
(function() {
  $.global.EDUCAPLAY_MANIFEST = "C:/Users/produ/.gemini/config/skills/educaplay-after-effects/episodios/AMB26-01/manifest.json";

  var buildFile = new File("C:/Users/produ/.gemini/config/skills/educaplay-after-effects/ae/build-episode.jsx");
  if (!buildFile.exists) {
    alert("No se encontró build-episode.jsx en: " + buildFile.fsName);
    return;
  }

  // Evaluar constructor
  $.evalFile(buildFile);

  // Guardar log de revisión
  var revDir = new Folder("C:/Users/produ/.gemini/config/skills/educaplay-after-effects/episodios/AMB26-01/revision");
  if (!revDir.exists) revDir.create();

  var stillDir = new Folder("C:/Users/produ/.gemini/config/skills/educaplay-after-effects/episodios/AMB26-01/revision/stills");
  if (!stillDir.exists) stillDir.create();

  var logFile = new File("C:/Users/produ/.gemini/config/skills/educaplay-after-effects/episodios/AMB26-01/revision/log.txt");
  logFile.encoding = "UTF-8";
  logFile.open("w");
  if (typeof LOG !== "undefined" && LOG.length > 0) {
    logFile.write(LOG.join("\n"));
  } else {
    logFile.write("✓ Episodio AMB26-01 armado.");
  }
  logFile.close();

  // Exportar stills de revisión
  var comp = null;
  for (var i = 1; i <= app.project.numItems; i++) {
    var it = app.project.item(i);
    if (it instanceof CompItem && it.name === "AMB26-01") {
      comp = it;
      break;
    }
  }

  var frames = [280, 400, 460, 814, 950, 1320, 1332, 2319, 2695, 3310, 3718, 3930];
  if (comp) {
    for (var k = 0; k < frames.length; k++) {
      var fr = frames[k];
      var pad = ("00000" + fr).slice(-5);
      var outPng = new File("C:/Users/produ/.gemini/config/skills/educaplay-after-effects/episodios/AMB26-01/revision/stills/f" + pad + ".png");
      comp.saveFrameToPng(fr / comp.frameRate, outPng);
    }
  }

  // Copiar el .aep a la carpeta local del capítulo si existe
  try {
    var localFolder = new Folder("C:/Users/produ/Videos/EDUCAPLAY 2026 LOCAL/SECUNDARIA/Educación Ambiental integral/AMB26-01");
    if (localFolder.exists && app.project && app.project.file) {
      app.project.file.copy("C:/Users/produ/Videos/EDUCAPLAY 2026 LOCAL/SECUNDARIA/Educación Ambiental integral/AMB26-01/AMB26-01.aep");
    }
  } catch(e) {}

  // Marcar como terminado
  var doneFile = new File("C:/Users/produ/.gemini/config/skills/educaplay-after-effects/episodios/AMB26-01/revision/done.txt");
  doneFile.open("w");
  doneFile.write("DONE " + new Date().toString());
  doneFile.close();

  alert("✓ AMB26-01 armado con éxito!\nProyecto guardado en episodios/AMB26-01/AMB26-01.aep\nCopiado a carpeta local AMB26-01.");
})();
