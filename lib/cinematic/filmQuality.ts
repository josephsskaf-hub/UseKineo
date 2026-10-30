// KINEO-QUALIDADE-TODOS-MOTORES-2910 — one engine-independent film contract, no provider calls.
import { aplicarElencoEEpoca, type ModoVisualDoElenco } from '@/lib/cinematic/elencoEpoca'
import { elencoDoRoteiro, cenasDoElenco, CLAUSULA_FICHA } from '@/lib/cinematic/personagemAjuste'
import { elencoComFichaLiteral, canonicaComDesenhoFixo, semDescricaoConcorrente } from '@/lib/cinematic/juizFicha' // KINEO-CONSISTENCIA-SER-3010
import { aplicarContrato, montarContrato } from '@/lib/cinematic/sceneTruth'
import { aplicarEixoVisual } from '@/lib/hollywood/varietyAxis'
import { applyStyleAnchor, NO_READABLE_TEXT_SUFFIX, textSafetySuffix, type StyleAnchor } from '@/lib/cinematic/sceneStyle'
import type { FichaDePersonagem } from '@/lib/cinematic/folhaDePersonagem'
import type { FilmQualitySnapshot } from '@/lib/filmComplete/qualityInheritance'
import { kling25ShotAxis } from '@/lib/cinematic/klingShots'

export const FILM_QUALITY_VERSION = 'film_quality_2910_v1' as const

/** Text quality is universal. Paid reference generation retains its existing budget/eligibility. */
export function decidirQualidadeDoFilme(args: { tagFaceless: boolean; estrelaAtiva: boolean; folhaLegada: boolean }) {
  return { ficha: !args.tagFaceless && !args.estrelaAtiva, elenco: !args.tagFaceless,
    estilo: true, contrato: true, seresFieis: true, stillCritic: true, juizFicha: true,
    gerarFolha: args.folhaLegada && !args.tagFaceless && !args.estrelaAtiva }
}

/** Lock at the front as well as the tail: provider prompt truncation must not drop the medium. */
export function travarEstiloDoFilme(prompt: string, style: StyleAnchor): string {
  let p = prompt
  const lock = `Film visual medium: ${style.lookPhrase}. `
  if (p.startsWith(lock)) p = p.slice(lock.length)
  const negated = (offset: number) => /(?:not|no|never mix with|never|without)\s+(?:[\w-]+\s+or\s+)?$/i.test(p.slice(Math.max(0, offset - 45), offset))
  if (style.look !== 'photoreal' && style.look !== 'noir') {
    p = p.replace(/\b(?:photorealistic|photoreal|live[- ]action|documentary realism)\b/gi,
      (word, offset: number) => negated(offset) ? word : style.lookPhrase)
  } else {
    p = p.replace(/\b(?:(?:stylized\s+)?3[dD]\s+(?:animated|animation|cartoon)(?:\s+(?:film\s+)?(?:look|style))?|(?:hand[- ]drawn\s+)?anime(?:\s+style)?|(?:storybook\s+)?illustration(?:\s+style)?|cartoon(?:\s+style)?|cel shading)\b/gi,
      (word, offset: number) => negated(offset) ? word : style.lookPhrase)
  }
  const anchored = p.includes(style.suffix) ? p : applyStyleAnchor(p, style)
  return lock + anchored
}

// KINEO-QUALIDADE-TODOS-MOTORES-2910 — compact multi-shot adapters retain their existing provider character budget.
export function travarEstiloCompactoDoFilme(prompt: string, style: StyleAnchor): string {
  const medium = { photoreal: 'photoreal', animated3d: '3D animated', anime: 'anime', illustration: 'illustrated', noir: 'noir' }[style.look]
  if (prompt.startsWith(`Chosen ${medium} still:`)) return prompt
  if (/^Chosen still:/i.test(prompt)) return prompt.replace(/^Chosen still:/i, `Chosen ${medium} still:`)
  return prompt.startsWith(`Style: ${medium}. `) ? prompt : `Style: ${medium}. ${prompt}`
}

// KINEO-QUALIDADE-TODOS-MOTORES-2910 — leave room for Kling's keyframe directive inside its 512-code-point limit.
export function promptCurtoDoFilmeKling4(prompt: string, style: StyleAnchor): string {
  const medium = { photoreal: 'Photoreal film', animated3d: '3D animated film', anime: 'Anime film', illustration: 'Illustrated film', noir: 'Black and white noir film' }[style.look]
  const take = (s: string, limit: number) => Array.from(s).slice(0, limit).join('')
  const cast = /(?:Named )?Characters? in this shot: (.+?) — clearly visible in frame/i.exec(prompt)
  const identity = /The same main character appears in this scene, consistent design: ([^\n]+)/i.exec(prompt)
  const period = /Period setting: [^.]+/i.exec(prompt)?.[0]
  const objectSafety = textSafetySuffix(prompt).replace(/^,\s*/, '')
  const noReadableText = NO_READABLE_TEXT_SUFFIX.replace(/^,\s*/, '')
  const originalTextDirections = [
    /\bNo readable text (?:anywhere in the scene:|or lettering anywhere in the frame;)[^.]+\.(?: If a phone appears,[^.]+\.)?/i.exec(prompt)?.[0],
    prompt.includes(noReadableText) ? noReadableText : '',
    objectSafety && prompt.includes(objectSafety) ? objectSafety : '',
  ].filter((s): s is string => !!s)
  let action = prompt.replace(/^Film visual medium: .+?\. /, '').replace(style.suffix, '')
  if (cast) action = action.replace(cast[0], '').replace(/^[,.\s]+/, '')
  action = action.replace(/The same main character appears in this scene, consistent design:[\s\S]*/i, '').trim()
  for (const direction of originalTextDirections) action = action.replace(direction, '').trim()
  // KINEO-QUALIDADE-TODOS-MOTORES-2910 — a long inherited costume must not displace the person/object action.
  const visible = (totalBudget: number) => cast?.[1].split('; ').map((person, _, people) => {
    const relation = /holding the (?:glowing )?teddy bear|beside the bicycle|with the hat/i.exec(person)?.[0]
    const budget = Math.max(0, Math.floor((totalBudget - 2 * (people.length - 1)) / people.length))
    if (!relation || person.length <= budget) return take(person, budget)
    const description = take(person.replace(relation, '').trim(), Math.max(0, budget - relation.length - 2)).replace(/\s+\S*$/, '').replace(/[,; ]+$/, '')
    return `${description}, ${relation}`
  }).join('; ')
  const who = (budget: number) => cast ? `Visible: ${visible(budget)}. ` : identity ? `Identity: ${take(identity[1], budget)}. ` : ''
  const identityBudget = cast ? 178 : 140
  // KINEO-QUALIDADE-REGRESSOES-2910 — identity compaction removes the old tail.
  // Reserve space for text protection already present, just as for closed mouths;
  // otherwise a previously protected ticket can lose its direction at the provider.
  const compactTextProtection = /no readable text|no legible words/i.test(prompt)
    ? NO_READABLE_TEXT_SUFFIX.replace(' anywhere in the frame', '')
      + (/\bno subtitles\b/i.test(prompt) ? ', no subtitles' : '')
      + (/\bno watermarks?\b/i.test(prompt) ? ', no watermarks' : '')
      + (/screen is off or blurred/i.test(prompt) ? ', phone screen off or blurred' : '')
      + (/out of focus and unreadable/i.test(prompt) ? ', writing out of focus and unreadable' : '') : ''
  // The era is already at the front. Repeating it before the action consumes
  // the room reserved for the original text guard, especially with long casts.
  if (compactTextProtection && period) action = action.replace(period, '').replace(/^[,.\s]+/, '')
  const prefix = `${medium}. ${period ? take(period, 60) + '. ' : ''}`
  let core = prefix + who(identityBudget) + action
  const fullTextProtection = originalTextDirections.length ? ' ' + originalTextDirections.join(' ') : ''
  const textProtection = fullTextProtection && Array.from(core + fullTextProtection).length <= 410
    ? fullTextProtection : compactTextProtection
  const coreBudget = 410 - Array.from(textProtection).length
  if (textProtection && Array.from(core).length > coreBudget) {
    // Restore safety without displacing the action that the old 410-char core
    // retained: trim verbose costume first, keeping the subject and relation.
    const firstAction = /^[\s\S]*?[.!?](?:\s|$)/.exec(action)?.[0] ?? action
    const actionBudget = Math.min(Array.from(firstAction).length, 150)
    const whoLabel = cast ? 'Visible: . ' : identity ? 'Identity: . ' : ''
    const reducedIdentity = Math.max(0, Math.min(identityBudget, coreBudget - Array.from(prefix + whoLabel).length - actionBudget))
    // Action comes before the shortened costume on overflow; even a relation
    // clause that exceeds its nominal share cannot cut away the action's object.
    core = prefix + firstAction + ' ' + who(reducedIdentity) + action.slice(firstAction.length)
  }
  return `${take(core, coreBudget)}${textProtection} Mouth closed, no speaking.`
}

// KINEO-QUALIDADE-TODOS-MOTORES-2910 — retain complete tail sentences, including "Mouth closed, no speaking".
function compactarTextoDoFilme(prompt: string, max: number, tailChars: number): string {
  if (prompt.length <= max) return prompt
  const text = prompt.replace(/\s+/g, ' ').trim()
  if (text.length <= max) return text
  const tailOffset = Math.max(0, text.length - tailChars)
  const nextSentence = /[.!?] /.exec(text.slice(tailOffset))
  const tailStart = nextSentence ? tailOffset + nextSentence.index + 2 : tailOffset
  const tail = text.slice(tailStart)
  const prefix = text.slice(0, Math.max(0, max - tail.length - 1))
  const end = Math.max(prefix.lastIndexOf('. '), prefix.lastIndexOf('! '), prefix.lastIndexOf('? '))
  return `${end >= 0 ? prefix.slice(0, end + 1) + ' ' : ''}${tail}`
}

// KINEO-QUALIDADE-TODOS-MOTORES-2910 — quality runs after the old 2.5 limit; enforce it once more on the final vector.
export function limitarPromptDoFilmeKling25(prompt: string, index: number): string {
  if (prompt.length <= 2500) return prompt
  const axis = kling25ShotAxis(index)
  let body = prompt.replace(`${axis}. `, '')
  const period = /Period setting: [^.]+\./i.exec(body)?.[0]
  if (period) body = `${period} ${body.replace(period, '')}`
  return `${axis}. ${compactarTextoDoFilme(body, 2500 - axis.length - 2, 900)}`
}

export function prepararQualidadeDoFilme(args: {
  prompts: ReadonlyArray<string>; falas: ReadonlyArray<string>; contextoOriginal: string
  contextoFiltro: string | null | undefined; modo: ModoVisualDoElenco; tagFaceless: boolean
  style: StyleAnchor; elenco?: ReadonlyArray<FichaDePersonagem>; preservarElenco?: boolean
  kidsCartoon?: boolean; aplicarContrato?: boolean
}) {
  const elenco = args.tagFaceless ? [] : args.preservarElenco
    ? [...(args.elenco ?? [])]
    : elencoComFichaLiteral(args.contextoOriginal, args.elenco ?? elencoDoRoteiro(args.contextoOriginal)).elenco
  const contracted = args.prompts.map((prompt, indice) => args.aplicarContrato === false ? prompt
    : aplicarContrato(montarContrato({ indice, falaFinal: args.falas[indice] ?? '', promptFinal: prompt, palavraInteira: true })).promptCorrigido)
  // Only genuinely identical adjacent shots get a new axis; never change speech or scene duration.
  const varied = contracted.map((p, i) => i > 0 && p === contracted[i - 1] && args.falas[i] !== args.falas[i - 1]
    ? aplicarEixoVisual(p, '', 'medium detail shot of the action described in this scene') : p)
  // KINEO-QUALIDADE-TODOS-MOTORES-2910 — reserve room before elencoEpoca's 2500-char insertion gate.
  const withRoom = args.modo === 'presenter' || args.tagFaceless ? varied : varied.map(p => compactarTextoDoFilme(p, 1800, 650))
  const cast = aplicarElencoEEpoca({ ...args, prompts: withRoom })
  const cenas = cenasDoElenco(cast.prompts, args.falas, elenco)
  const prompts = cast.prompts.map((prompt, i) => {
    let p = prompt
    // KINEO-QUALIDADE-TODOS-MOTORES-2910 — an incomplete old snapshot authorizes a role/name, never a newly invented design.
    if (args.preservarElenco) for (const detected of cast.relato.elenco) {
      const frozen = elenco.find(f => f.nome.toLowerCase() === detected.nome.toLowerCase())
      if (detected.nomeado || frozen) p = p.split(detected.descricao).join(frozen?.canonica ?? detected.nome)
    }
    // Reuse the canonical source description, never cast the continuation again.
    for (const ficha of elenco.filter(f => cenas[i]?.nomes.includes(f.nome))) {
      const detected = cast.relato.elenco.find(e => e.nome.toLowerCase() === ficha.nome.toLowerCase())
      if (detected && detected.descricao !== ficha.canonica) p = p.split(detected.descricao).join(ficha.canonica)
      // KINEO-CONSISTENCIA-SER-3010 — ser não humano: a cena perde a descrição concorrente (fora do texto da ficha) e a ficha literal ganha o desenho fixo
      if (ficha.tipo !== 'humano') p = p.split(ficha.canonica).map((trecho) => semDescricaoConcorrente(trecho, ficha.nucleo)).join(ficha.canonica)
      if (!p.includes(ficha.canonica)) p += CLAUSULA_FICHA(canonicaComDesenhoFixo(ficha))
    }
    // KINEO-SUJEITO-DA-FALA-3010 — o assunto que a fala nomeia (Vênus) entra na cena que não o mostra; gente do elenco fica com a ficha
    if (args.modo !== 'presenter') p = comSujeitoDaFala(p, args.falas[i] ?? '', [...elenco.map(f => f.nome), ...cast.relato.elenco.map(e => e.nome)])
    // KINEO-DESFECHO-3010 — a ÚLTIMA cena mostra o último acontecimento da fala (a festa do pijama), nunca volta ao começo
    if (args.modo !== 'presenter' && i === cast.prompts.length - 1) p = comDesfechoDaFala(p, args.falas[i] ?? '')
    return travarEstiloDoFilme(p, args.style)
  })
  return { prompts, elenco, style: args.style, cenas, relato: cast.relato }
}

// KINEO-SUJEITO-DA-FALA-3010 — revisão de 30/10 (Kling 4, 1º filme, BR): "On Venus, the year ends before a single day does!" saiu
// sobre a etiqueta do cliente "[Pexels: stars and galaxy view]" — galáxia genérica, e Vênus some justo no fecho (FINAL_FRACO).
// Palavra comum que abre frase, pronome e quem já tem ficha não entram; fala com pronome de gente (he/she…) fica de fora
// (pessoa real não ganha "clearly visible" aqui — essa é a regra do elenco).
const NAO_SUJEITO = new Set(['The', 'And', 'But', 'This', 'That', 'These', 'Those', 'Its', 'You', 'Did', 'Does', 'What', 'Why', 'How', 'Who', 'Where', 'When', 'Then', 'Yes', 'Now', 'Here', 'There', 'Just', 'Even', 'Every', 'One', 'Our', 'Your', 'His', 'Her', 'Their', 'Today', 'Tomorrow', 'Yesterday', 'Wow', 'Imagine', 'Meet', 'Look', 'Watch', 'Follow', 'Subscribe', 'Fun', 'Fact', 'Day', 'Year'])
/** Até 2 nomes próprios que a fala cita no meio da frase ("On Venus", "is Venus!"). */
export function sujeitosDaFala(fala: string): string[] {
  const t = String(fala ?? '')
  if (/\b(?:he|she|his|her|him|hers)\b/i.test(t)) return []
  const out = new Set<string>()
  for (const m of t.matchAll(/(?<![\p{L}\p{N}'’])(\p{Lu}[\p{Ll}]{2,})(?![\p{L}'’])/gu)) {
    const antes = t.slice(0, m.index ?? 0).trimEnd()
    if (NAO_SUJEITO.has(m[1]) || !antes || /[.!?…:"“]$/.test(antes)) continue
    out.add(m[1])
  }
  return [...out].slice(0, 2)
}
// KINEO-DESFECHO-3010 — revisão de 30/10 (Kling 4, 1º filme, US, nota 7): "At the mall, she buys a puppy and more... then a slumber
// party!" — a última cena seguiu a etiqueta "[Pexels: shopping mall puppy store]" e o filme acabou de volta na cozinha; a festa nunca
// apareceu. Regra do revisor: a última cena mostra o desfecho do pedido, não repete a anterior nem cai em paisagem genérica.
const PALAVRA_VAZIA = new Set(['then', 'that', 'this', 'with', 'from', 'into', 'more', 'some', 'they', 'them', 'their', 'there', 'what', 'when', 'where', 'which', 'while', 'very', 'really', 'just', 'even', 'only', 'also', 'before', 'after', 'does', 'have', 'been', 'will', 'your', 'ends', 'single', 'depois', 'quando', 'muito', 'mais', 'para', 'pela', 'pelo', 'como', 'entonces', 'luego', 'despues', 'después'])
/** O último acontecimento da fala: o trecho depois do último "then / finally / and then / … / depois / então / luego". */
export function desfechoDaFala(fala: string): string | null {
  const frases = String(fala ?? '').split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean)
  const ultima = frases[frases.length - 1] ?? ''
  const partes = ultima.split(/\.{3}|…|\b(?:and then|then|finally|at last|in the end|e então|então|depois|por fim|no fim|y luego|luego|al final|finalmente)\b/i)
  if (partes.length < 2) return null
  const trecho = partes[partes.length - 1].replace(/^[\s,;:—-]+|[\s.!?…]+$/g, '').trim()
  const palavras = trecho.split(/\s+/).filter(Boolean)
  return palavras.length >= 1 && palavras.length <= 10 ? trecho : null
}
/** A última cena que não mostra o desfecho ganha "Final moment of the story, clearly shown: <desfecho>." na frente. */
export function comDesfechoDaFala(prompt: string, fala: string): string {
  const desfecho = desfechoDaFala(fala)
  if (!desfecho) return prompt
  const chave = desfecho.toLowerCase().split(/[^\p{L}]+/u).filter((w) => w.length >= 4 && !PALAVRA_VAZIA.has(w))
  if (chave.length === 0 || chave.some((w) => new RegExp(`\\b${w}`, 'i').test(prompt))) return prompt
  return `Final moment of the story, clearly shown: ${desfecho}. ${prompt}`
}
/** A cena que não mostra o assunto nomeado pela fala ganha "<assunto> clearly visible as the subject of this shot." na frente. */
export function comSujeitoDaFala(prompt: string, fala: string, ignorar: ReadonlyArray<string>): string {
  const ign = new Set(ignorar.flatMap((n) => String(n).split(/\s+/)).map((w) => w.toLowerCase()))
  const sujeitos = sujeitosDaFala(fala).filter((s) => !ign.has(s.toLowerCase()))
  const faltando = sujeitos.filter((s) => !new RegExp(`\\b${s}\\b`, 'i').test(prompt))
  // a cena já mostra um dos assuntos ("A close-up of Venus" com fala "…orbit the Sun"): fica como está
  return faltando.length && faltando.length === sujeitos.length ?`${faltando.join(' and ')} clearly visible as the subject of this shot. ${prompt}` : prompt
}

/** Reuse a source still only for matching speech/action, not merely because the same person appears. */
export function stillHerdadoDaCena(source: FilmQualitySnapshot | null, fala: string, prompt: string): string | null {
  const normalized = (v: string) => v.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
  const speech = normalized(fala), visual = normalized(prompt)
  return source?.approvedStills.find(s => (speech.length > 12 && normalized(s.voiceover) === speech)
    || (visual.length > 30 && normalized(s.prompt) === visual))?.url ?? null
}

/** A reference is selected by character identity; a girl's sheet cannot judge a robot scene. */
export function referenciaDaCena(source: FilmQualitySnapshot | null, fichas: ReadonlyArray<FichaDePersonagem>) {
  for (const ficha of fichas) {
    const url = source?.characterReferences.find(r => r.nome === ficha.nome)?.url
      ?? source?.approvedStills.find(s => s.characterNames.includes(ficha.nome))?.url
    if (url) return { url, descricao: ficha.canonica }
  }
  return undefined
}
