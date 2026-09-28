/**
 * Arma el capítulo con el estilo «vidrio». Ver build-episode.jsx y docs/ESTETICAS.md.
 * Lo corre `npm run ae -- <CODE> --estilo vidrio`; también sirve a mano desde
 * AE → File → Scripts → Run Script File… (toma el único episodio de episodios/).
 */
$.global.EDUCAPLAY_STYLE = 'vidrio';
$.evalFile(File(File($.fileName).parent.fsName + '/build-episode.jsx'));
