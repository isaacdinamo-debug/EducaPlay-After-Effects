import type {Caption} from './types.ts';

export type CaptionFix = {find: string; replace: string; why?: string};

/**
 * Aplica correcciones de transcripción sobre los subtítulos GENERADOS.
 *
 * Por qué acá y no editando `captions.ts` a mano: ese archivo lo reescribe
 * `npm run transcribe` cada vez que se vuelve a medir el máster. Una corrección
 * escrita ahí se pierde en silencio la próxima corrida, y el error vuelve al
 * video sin que nadie se entere. Declarándolas como datos del episodio,
 * sobreviven a cualquier regeneración.
 *
 * `applyCaptionFixes` FALLA si una corrección no encuentra su texto, en vez de
 * seguir de largo: si whisper cambia de opinión sobre una palabra, hay que
 * enterarse en el typecheck y no descubrirlo en el render.
 */
export const applyCaptionFixes = (
  captions: readonly Caption[],
  fixes: readonly CaptionFix[],
): Caption[] => {
  const used = new Set<number>();
  const out = captions.map((c) => {
    let text = c.text;
    fixes.forEach((f, i) => {
      if (text.includes(f.find)) {
        text = text.split(f.find).join(f.replace);
        used.add(i);
      }
    });
    return text === c.text ? c : {...c, text};
  });

  const missed = fixes
    .map((f, i) => (used.has(i) ? null : f))
    .filter((f): f is CaptionFix => f !== null);
  if (missed.length) {
    throw new Error(
      'Correcciones de subtítulo que ya no encuentran su texto (¿se regeneró la ' +
        'transcripción?):\n' +
        missed.map((f) => `  · "${f.find}"`).join('\n'),
    );
  }
  return out;
};
