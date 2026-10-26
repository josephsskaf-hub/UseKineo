// KINEO-FILME15-PERFEITO-2610 — remove positive requests to DRAW writing on props.
// These are visual prompts only. Actors, actions outside the prop description and
// narration are untouched; the caller must identify the signed Seedance15 scope.
export function sanitizarObjetos15(prompt: string, seedanceShortFilm: boolean): string {
  if (!seedanceShortFilm) return prompt
  let safe = prompt
  const paper = /\b(?:document|paperwork|invoice|receipt|manuscript)\b/i.test(safe)
  if (paper) {
    safe = safe
      .replace(/\bbank\s+fee\s+paperwork\b/gi, 'plain bank envelope with its unmarked reverse facing the camera')
      .replace(/\bpaperwork\b/gi, 'plain closed envelope with its unmarked reverse facing the camera')
      .replace(/\b(?:document|invoice|receipt|manuscript)\b/gi, 'sheet of paper turned so its blank reverse faces the camera')
      .replace(/\bwith\s+intricate\s+patterns\b/gi, 'with natural paper fibers and irregular stains')
      .replace(/\b(?:revealing|displaying|showing|bearing)\s+(?:(?:a|an|the|cryptic|written|printed|handwritten|legible|readable|mysterious)\s+)*(?:text|writing|letters|words|numbers|symbols)\b/gi, 'revealing only natural paper fibers and irregular stains')
  }
  safe = safe.replace(/\b((?:phone|smartphone|mobile\s+phone)\s+(?:screen|display))\b(?!\s+filled\s+with\s+abstract\s+defocused\s+color\s+shapes)(?:\s+(?:displaying|showing|revealing|with)\s+(?:(?:a|an|the|dramatic|urgent|cryptic|glowing|incoming|written)\s+)*(?:text(?:\s+message)?|messages?|notifications?)\b(?:\s*(?:["“][^"”\r\n]*["”]|'[^'\r\n]*'))?)?/gi,
    '$1 filled with abstract defocused color shapes')
  return safe
}
