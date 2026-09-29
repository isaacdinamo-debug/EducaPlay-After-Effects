// Launcher directo para After Effects - AMB26-02
// EducaPlay Secundaria (Corrientes)
(function() {
  $.global.EDUCAPLAY_MANIFEST = "C:/Users/produ/.gemini/config/skills/educaplay-after-effects/episodios/AMB26-02/manifest.json";

  var buildFile = new File("C:/Users/produ/.gemini/config/skills/educaplay-after-effects/ae/build-episode.jsx");
  if (!buildFile.exists) {
    alert("No se encontró build-episode.jsx en: " + buildFile.fsName);
    return;
  }

  // Evaluar constructor
  $.evalFile(buildFile);

  // Guardar log de revisión
  var revDir = new Folder("C:/Users/produ/.gemini/config/skills/educaplay-after-effects/episodios/AMB26-02/revision");
  if (!revDir.exists) revDir.create();

  var stillDir = new Folder("C:/Users/produ/.gemini/config/skills/educaplay-after-effects/episodios/AMB26-02/revision/stills");
  if (!stillDir.exists) stillDir.create();

  var logFile = new File("C:/Users/produ/.gemini/config/skills/educaplay-after-effects/episodios/AMB26-02/revision/log.txt");
  logFile.encoding = "UTF-8";
  logFile.open("w");
  if (typeof LOG !== "undefined" && LOG.length > 0) {
    logFile.write(LOG.join("\n"));
  } else {
    logFile.write("✓ Episodio AMB26-02 armado.");
  }
  logFile.close();

  // Exportar stills de revisión
  var comp = null;
  for (var i = 1; i <= app.project.numItems; i++) {
    var it = app.project.item(i);
    if (it instanceof CompItem && it.name === "AMB26-02") {
      comp = it;
      break;
    }
  }

  var frames = [300, 450, 560, 800, 1100, 1300, 1450, 1700, 2000, 2150, 2300, 2500, 2750, 3100, 3500, 3650, 3860, 4000, 4200];
  if (comp) {
    for (var k = 0; k < frames.length; k++) {
      var fr = frames[k];
      var pad = ("00000" + fr).slice(-5);
      var outPng = new File("C:/Users/produ/.gemini/config/skills/educaplay-after-effects/episodios/AMB26-02/revision/stills/f" + pad + ".png");
      comp.saveFrameToPng(fr / comp.frameRate, outPng);
    }
  }

  // Copiar el .aep a la carpeta local del capítulo si existe
  try {
    var localFolder = new Folder("C:/Users/produ/Videos/EDUCAPLAY 2026 LOCAL/SECUNDARIA/Educación Ambiental integral/AMB26-02");
    if (localFolder.exists && app.project && app.project.file) {
      app.project.file.copy("C:/Users/produ/Videos/EDUCAPLAY 2026 LOCAL/SECUNDARIA/Educación Ambiental integral/AMB26-02/AMB26-02.aep");
    }
  } catch(e) {}

  // Marcar como terminado
  var doneFile = new File("C:/Users/produ/.gemini/config/skills/educaplay-after-effects/episodios/AMB26-02/revision/done.txt");
  doneFile.open("w");
  doneFile.write("DONE " + new Date().toString());
  doneFile.close();
})();
