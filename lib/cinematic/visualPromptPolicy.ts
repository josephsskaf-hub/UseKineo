// One visual contract for the classic clip, its still and its safe fallback.
// Pure/deterministic: no provider calls, narration rewriting or new model cost.
import { aspectSpec } from '../aspect'
import { applyStyleAnchor, buildStoryScenePrompt, textSafetySuffix, type StyleAnchor } from './sceneStyle'
import type { VisualMode } from './visualMode'

export interface VisualPromptPolicy {
  mode: VisualMode
  style: StyleAnchor
  character?: string | null
  aspect?: string | null
  eraSuffix?: string
  opening?: boolean
}

// Preserve the classic faceless identity guard. Story/presenter requests do not
// run through it: deleting the requested protagonist contradicted those modes.
const PERSON_NOUN_RE = /\b(?:(?:a|an|the)\s+)?(?:(?:random|generic|young|old|asian|white|black|european|american|middle[-\s]?aged)\s+)*(?:businessman|businesswoman|man|woman|men|women|person|persons|people|guy|guys|boy|boys|girl|girls|lady|ladies|gentleman|ceo|entrepreneur|trader|crowd|family|child|children|kid|kids|student|students)s?\b/gi
const NAMED_TITLE_RE = /\b(?:[Ee]mperor|[Gg]eneral|[Mm]arshal|[Kk]ing|[Qq]ueen|[Tt]sar|[Cc]zar|[Pp]resident|[Cc]ommander|[Cc]olonel|[Aa]dmiral|[Cc]aptain|[Dd]uke|[Ll]ord|[Ss]ir|[Kk]aiser|[Pp]haraoh)\s+[A-Z][\w'-]+/g
const NAMED_FIGURE_RE = /\b(?:napoleon(?:\s+bonaparte)?|bonaparte|wellington|hitler|stalin|churchill|caesar|cleopatra|genghis\s+khan|alexander\s+the\s+great|abraham\s+lincoln|george\s+washington|joan\s+of\s+arc)\b/gi

export function isStylizedLook(style: StyleAnchor): boolean {
  return style.look === 'animated3d' || style.look === 'anime' || style.look === 'illustration'
}

/** No blanket people ban: faceless means no foreground face or presenter. */
export function classicVisualNegativePrompt(mode: VisualMode, stylized: boolean): string {
  const format = mode === 'presenter' ? ''
    : mode === 'character_story' ? 'talking head, looking directly into the camera, '
      : 'foreground human face, close-up portrait, talking head, presenter, '
  const look = stylized ? '' : 'cartoon, anime, illustration, 3d render, '
  return format + look + 'blur, distort, low quality, watermark, text, logo, caption'
}

/** Remove stale hard-coded orientation instructions, not the scene content. */
export function applyVisualFraming(prompt: string, aspect?: string | null): string {
  const frame = aspectSpec(aspect)
  return prompt
    .replace(/(?:\b(?:vertical|widescreen|square|portrait|landscape)\s+)*\b(?:9:16|16:9|1:1|4:5)(?:\s+(?:vertical|widescreen|square|portrait|landscape|cinematic|framing|composition))*/gi, frame.promptFraming)
}

/** Shared direction for the existing description call; no additional LLM call. */
export function visualDescriptionDirection(policy: VisualPromptPolicy): string {
  const mode = policy.mode === 'documentary_faceless'
    ? 'Faceless visual storytelling: environments, objects, hands or distant silhouettes; no foreground face or unrelated presenter.'
    : policy.mode === 'character_story'
      ? 'Show the described characters and actions. Preserve their identity and design; they do not address the camera.'
      : 'Preserve the explicitly requested on-screen presenter and setting; do not replace the subject with an empty landscape.'
  return `${mode} ${policy.style.lookPhrase}. ${policy.style.suffix}. ${aspectSpec(policy.aspect).promptFraming}.`
}

// KINEO-VIGIA-CENARIO-2026-09-11 — a metade determinística do VISUAL-DRIFT-11.
// Dois filmes reais de conta externa na mesma tarde (597f8237 e c636e7a0,
// Seedance): a camada visual escrita pelo GPT inventou lugar e época que a
// história não diz — "Amityville House", "Winchester Mystery House in San
// Jose, California", "1910 New England farmhouse", "vintage Nokia 3310",
// "1970s Bakelite rotary phone", "abandoned Victorian home" — para um conto
// de hoje, com telefone que recebe MENSAGEM. A regra no prompt do descritor
// (16:30) é pedido; isto é garantia: nome próprio, ano/década e adjetivo de
// época que NÃO estão nas palavras da história (tema + fala) não sobem para a
// fal. Nome que a história cita (Luffy, Daniel, Napoleon, Paris) fica.
// Puro: nenhuma chamada de modelo, nunca toca a narração.
const SETTING_ALLOW = new Set(['earth', 'moon', 'sun', 'god', 'internet', 'christmas', 'halloween', 'wifi', 'tv', 'led', 'gps', 'dna'])
// Sequência de palavras Capitalizadas (com 's / -era colados), com número
// opcional colado no fim ("Nokia 3310", "Model 500").
const SETTING_PROPER_RUN_RE = /\b[A-Z][a-z]{2,}(?:['’]s)?(?:-[a-z]+)?(?: [A-Z][a-z]{2,}(?:['’]s)?(?:-[a-z]+)?)*(?: \d{2,4}\b)?/g
const SETTING_YEAR_RE = /(?:\b(?:1[0-9]{3}|20[0-9]{2})s?\b|(?:^|\s)['’]?[1-9]0s\b)/g
const SETTING_ERA_ADJ_RE = /\b(victorian|edwardian|georgian|medieval|ancient|renaissance|colonial|napoleonic|vintage|retro|antique|old[- ]fashioned)(?:-era)?\b/gi

function settingWords(context: string): Set<string> {
  return new Set((context || '').toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [])
}

export interface SettingScrub { text: string; removed: string[] }

/**
 * Remove from a GPT-written shot description every proper noun, year/decade
 * and era adjective absent from the story words. A sentence-initial single
 * capitalised word stays (it is just capitalised). A number glued to a
 * removed name ("Nokia 3310", "Model 500") goes with it.
 */
export function scrubInventedSetting(visual: string, context: string): SettingScrub {
  const src = visual || ''
  if (!src.trim()) return { text: src, removed: [] }
  const ctx = settingWords(context)
  const base = (w: string) => w.toLowerCase().replace(/['’]s$/, '').replace(/-[a-z]+$/, '')
  const known = (w: string) => ctx.has(base(w)) || SETTING_ALLOW.has(base(w))
  const removed: string[] = []
  let out = src.replace(SETTING_PROPER_RUN_RE, (run: string, offset: number, whole: string) => {
    const words = run.split(' ')
    const before = whole.slice(0, offset)
    const sentenceStart = /(?:^|[.!?;:]\s*|\(\s*|["“]\s*)$/.test(before)
    const nomes = words.filter((w) => !/^\d+$/.test(w))
    if (nomes.length === 1 && words.length === nomes.length && sentenceStart) return run
    const nomeRemovido = nomes.some((w) => !known(w))
    const kept = words.filter((w) => (/^\d+$/.test(w) ? (ctx.has(w) || !nomeRemovido) : known(w)))
    if (kept.length === words.length) return run
    for (const w of words) if (!kept.includes(w)) removed.push(w)
    return kept.join(' ')
  })
  out = out.replace(SETTING_YEAR_RE, (m: string) => {
    const digits = m.replace(/[^0-9]/g, '')
    if (ctx.has(digits) || ctx.has(digits + 's')) return m
    removed.push(m.trim())
    return m.startsWith(' ') ? ' ' : ''
  })
  out = out.replace(SETTING_ERA_ADJ_RE, (m: string, adj: string) => {
    const a = adj.toLowerCase()
    if (ctx.has(a) || ctx.has(a.replace(/[- ]/g, ''))) return m
    removed.push(m)
    return ''
  })
  if (!removed.length) return { text: src, removed }
  // limpeza do que sobrou: preposição/artigo pendurados, vírgulas dobradas, espaços
  for (let i = 0; i < 4; i++) {
    out = out
      .replace(/\s*\b(?:in|at|of|near|from|on|inside|outside|across|through|toward|towards|into|onto|over|under|behind|beside|along|past|the|a|an)\s*(?=[,.;)]|$)/gi, '')
      .replace(/\b(?:in|at|of|near|from|on|across|through|toward|towards|into|onto|over|under|behind|beside|along|past)\s+(?=(?:in|at|of|near|from|on|across|through|toward|towards|into|onto|over|under|behind|beside|along|past)\b)/gi, '')
      .replace(/(?:\s*,){2,}/g, ',')
      .replace(/\(\s*\)/g, '')
      .replace(/\s+([,.;)])/g, '$1')
      .replace(/,\s*\./g, '.')
      .replace(/\s{2,}/g, ' ')
      .replace(/^[\s,.;]+/, '')
      .trim()
  }
  return { text: out, removed }
}

export function buildClassicVisualPrompt(visual: string, policy: VisualPromptPolicy): string {
  let prompt: string
  if (policy.mode !== 'documentary_faceless') {
    prompt = buildStoryScenePrompt(visual, policy.style, policy.character ?? null)
  } else {
    const subject = (visual || '')
      .replace(NAMED_FIGURE_RE, 'a distant silhouetted figure seen from behind')
      .replace(NAMED_TITLE_RE, 'a distant silhouetted figure seen from behind')
      .replace(PERSON_NOUN_RE, ' ')
      .replace(/\s+/g, ' ').replace(/^[\s,.;:–-]+/, '').trim()
    prompt = applyStyleAnchor(
      `${subject || 'the described story setting'}, faceless cinematic b-roll, ` +
      'focus on the described subject and its environment, no foreground human faces, ' +
      'photorealistic, ultra-detailed, dramatic cinematic lighting, smooth camera motion, ' +
      'subject clearly framed with the lower third clear for captions, no text, no watermark, no logo',
      policy.style,
    )
  }
  const opening = policy.opening
    ? 'Opening shot: show the described subject and action immediately in the first frame, clearly readable; no unrelated establishing landscape or slow fade-in. '
    : ''
  // Non-speaking illustration is not an avatar/lip-sync claim.
  const performance = policy.mode === 'character_story' ? ', characters act naturally within the scene without addressing the viewer' : ''
  return opening + applyVisualFraming(prompt, policy.aspect) + performance +
    (policy.eraSuffix || '') + textSafetySuffix(visual) + `, ${aspectSpec(policy.aspect).promptFraming}`
}
