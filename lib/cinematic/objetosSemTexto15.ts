// KINEO-FILME15-PERFEITO-2610 — remove positive requests to DRAW writing on props.
// These are visual prompts only. Actors, actions outside the prop description and
// narration are untouched; the caller must identify the signed Seedance15 scope.
function trocarObjetoPresente(source: string, pattern: RegExp, replacement: string): string {
  return source.replace(pattern, (...args: unknown[]) => {
    const match = args[0] as string, offset = args[args.length - 2] as number
    const prefix = source.slice(0, offset)
    // Preserve existing negative contracts verbatim; they do not request a prop.
    if (/\b(?:no|without|avoid|exclude|excluding|never\s+show|do\s+not\s+show)\s+(?:(?:any|a|an|the|visible|readable|printed|bright|colored|glowing|large|small|digital|paper)\s+)*$/i.test(prefix)) return match
    if (/\b(?:no|without|avoid|exclude|excluding)\s+(?:any\s+)?(?:(?:canned\s+goods|bottled\s+water|phone\s+screens?|documents?|neon\s+signs?|pizza\s+box)\s*(?:,|and|or)\s*)+(?:any\s+)?$/i.test(prefix)) return match
    return replacement.replace(/\$(\d+)/g, (_token, index: string) => String(args[Number(index)] ?? ''))
  })
}
export function sanitizarObjetos15(prompt: string, seedanceShortFilm: boolean): string {
  if (!seedanceShortFilm) return prompt
  let safe = prompt
  const paper = /\b(?:document|paperwork|invoice|receipt|manuscript)\b/i.test(safe)
  if (paper) {
    safe = trocarObjetoPresente(safe, /\bbank\s+fee\s+paperwork\b/gi, 'plain bank envelope with its unmarked reverse facing the camera')
    safe = trocarObjetoPresente(safe, /\bpaperwork\b/gi, 'plain closed envelope with its unmarked reverse facing the camera')
    safe = trocarObjetoPresente(safe, /\b(?:document|invoice|receipt|manuscript)\b(?!\s+(?:editor|writer|specialist|examiner)\b)(?:\s+with\s+intricate\s+patterns\b)?/gi, 'sheet of paper turned so its blank reverse faces the camera')
    if (safe !== prompt) safe = trocarObjetoPresente(safe, /\b(?:revealing|displaying|showing|bearing)\s+(?:(?:a|an|the|cryptic|written|printed|handwritten|legible|readable|mysterious)\s+)*(?:text|writing|letters|words|numbers|symbols)\b/gi, 'revealing only natural paper fibers and irregular stains')
  }
  safe = trocarObjetoPresente(safe, /\b((?:phone|smartphone|mobile\s+phone)\s+(?:screen|display))\b(?!\s+filled\s+with\s+abstract\s+defocused\s+color\s+shapes)(?:\s+(?:displaying|showing|revealing|with)\s+(?:(?:a|an|the|dramatic|urgent|cryptic|glowing|incoming|written)\s+)*(?:text(?:\s+message)?|messages?|notifications?)\b(?:\s*(?:["“][^"”\r\n]*["”]|'[^'\r\n]*'))?)?/gi,
    '$1 filled with abstract defocused color shapes')
  safe = trocarObjetoPresente(safe, /\bpizza\s+box\b/gi, 'plain pizza carton with a solid-color lid and blank sides')
  safe = trocarObjetoPresente(safe, /\bcanned\s+goods\b/gi, 'plain unlabeled food cans')
  safe = trocarObjetoPresente(safe, /\bbottled\s+water\b/gi, 'water in plain transparent bottles without labels')
  safe = trocarObjetoPresente(safe, /\bneon\s+(?:signs?|signage)\b/gi, 'abstract glowing geometric shapes without lettering')
  return safe
}
