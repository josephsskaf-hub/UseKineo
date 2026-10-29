// KINEO-QUALIDADE-TODOS-MOTORES-2910 — reuse approved visual identity as the scene's existing i2v frame; no image generation.
import type { FichaDePersonagem } from '@/lib/cinematic/folhaDePersonagem'
import type { FilmQualitySnapshot } from '@/lib/filmComplete/qualityInheritance'

const normalized = (value: string): string => value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
const roleName = (value: string): string => normalized(value).replace(/^(?:the|a|an)\s+/, '')
const https = (value: string): boolean => /^https:\/\/[^\s]+$/i.test(value)
const escaped = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const word = (text: string, value: string): boolean => !!value && new RegExp(`(?<![\\p{L}\\p{N}])${escaped(value)}(?![\\p{L}\\p{N}])`, 'iu').test(text)

// KINEO-QUALIDADE-TODOS-MOTORES-2910 — fallback only for historical frames whose claim did not persist characterNames.
function charactersInFrame(frame: FilmQualitySnapshot['approvedStills'][number], known: ReadonlyArray<FichaDePersonagem>): Set<string> {
  if (frame.characterNames.length) return new Set(frame.characterNames.map(roleName))
  const positive = frame.prompt.replace(/\b(?:no|without)\s+(?:(?:other|additional|extra|random|visible|human)\s+)*(?:people|humans?|persons?|men|women|boys?|girls?|children|faces?)(?:\s+(?:or|and)\s+(?:people|humans?|persons?|men|women|boys?|girls?|children|faces?))*/gi, '')
  const names = new Set(known.filter(f => (f.canonica.length > 12 && positive.includes(f.canonica)) ||
    word(positive, roleName(f.nome)) || word(positive, normalized(f.nucleo))).map(f => roleName(f.nome)))
  // A legacy claim can omit the girl's card entirely. Her explicit presence still makes that frame unsuitable for a robot-only shot.
  for (const role of ['girl', 'boy', 'man', 'woman', 'child', 'daughter', 'son', 'mother', 'father', 'grandmother', 'grandfather', 'robot']) {
    if (word(positive, role) && !known.some(f => word(f.nucleo, role) || word(f.nome, role) || (f.tipo === 'humano' && word(f.canonica, role)))) names.add(`unmapped-role:${role}`)
  }
  return names
}

/** Match the original action first, then identity. References of unrelated characters never seed a new shot. */
export function ancoraHerdadaDaCena(
  source: FilmQualitySnapshot | null, fala: string, prompt: string, fichas: ReadonlyArray<FichaDePersonagem>,
): string | null {
  if (!source) return null
  const known = [...source.characters, ...fichas].filter((f, i, all) => all.findIndex(other => roleName(other.nome) === roleName(f.nome)) === i)
  const desired = new Set(fichas.map(f => roleName(f.nome)))
  const speech = normalized(fala), visual = normalized(prompt)
  const candidates = source.approvedStills.filter(frame => https(frame.url)).map((frame, index) => {
    const names = charactersInFrame(frame, known)
    const matches = [...names].filter(name => desired.has(name)).length
    const extra = [...names].some(name => !desired.has(name))
    const action = (speech.length > 12 && normalized(frame.voiceover) === speech) || (visual.length > 30 && normalized(frame.prompt) === visual)
    return { frame, index, matches, extra, action }
  })
  const exact = candidates.filter(c => c.action && (desired.size === 0 || (!c.extra && c.matches > 0))).sort((a, b) => b.matches - a.matches || a.index - b.index)[0]
  if (exact) return exact.frame.url
  const identity = candidates.filter(c => !c.extra && c.matches > 0).sort((a, b) => b.matches - a.matches || a.index - b.index)[0]
  if (identity) return identity.frame.url
  // A single-person sheet is a fallback after a frame containing all requested people was sought.
  for (const ficha of fichas) {
    const reference = source.characterReferences.find(r => roleName(r.nome) === roleName(ficha.nome) && https(r.url))
    if (reference) return reference.url
  }
  return null
}
