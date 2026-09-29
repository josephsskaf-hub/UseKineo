// [TRAVA 8.2] KLING25-DESCRICOES — cobertura total das descrições de cena e fallback que NUNCA é a fala (28/09/2026).
//
// FATO (render real 28/09 02:35 UTC, conta do fundador, Kling 2.5 60 s, 18 planos, 18/18 aceitos, filme 72 s, nota 9,5):
// o prompt submetido da cena 18 (cinematic_dispatch_result.submitted_prompts[17]) foi a NARRAÇÃO crua — "That's the thing
// about a monster like this It doesn't need to hit you to stop everything Follow for the next one" — mais o sufixo
// faceless. As cenas 1-17 tinham descrição ("Wide shot of the stormy sea…"). O Kling desenhou um monstro literal
// (dinossauro) no fim de um filme sobre o furacão Polo.
//
// CAUSA: o descritor #441 (route.ts generateCinematicDescriptions) fazia UMA chamada para todas as cenas, com max_tokens
// FIXO em 1000 e "EXACTLY N items"; até 12 cenas cobria ("#441 cinematic descriptions: 12/12 scenes"). Com 14-18 planos
// (KLING25-60S-TETO, 860b8485) o modelo devolveu 17 itens e o chamador deixava a cena sem descrição cair em
// `stockSearchQuery` — que no verbatim do Kling é kling25VisualHint(fala) e, na prosa de Seedance/Veo, é
// verbatimBeats.pexelsQuery: as PALAVRAS FALADAS sem pontuação. Metáfora ("a monster like this") e CTA ("Follow for the
// next one") viravam pedido visual literal.
//
// Aqui (lib pura, sem import — espelhada na rota; o guardião scripts/test-kling25-descricoes-2026-09-28.mjs executa as
// duas e prova a igualdade):
//   · descriptionBatches: acima de 12 cenas o pedido vai em 2 lotes equilibrados (18 → 9+9), em paralelo;
//   · descriptionTokenBudget: teto de tokens proporcional ao lote (espelho do inline da rota);
//   · describeScenesCovered: junta os lotes e RE-PEDE só as faltantes (1 tentativa);
//   · completeSceneDescriptions: cena ainda sem descrição nasce do SUJEITO da cena vizinha válida, com outro
//     enquadramento — nunca da frase narrada. Sem NENHUMA descrição do modelo (descritor fora do ar), a pista própria só
//     entra depois de perder CTA e metáfora de criatura; fala que é só CTA repete o assunto do filme.
//   · hasSpeechArtifacts: o supervisor fala×imagem (compartilhado com o hollywood, por isso intocado) não pode devolver
//     uma cena de fallback à criatura/CTA literal — a rota confere antes de aplicar a reescrita.
// Hollywood intocado: nada aqui é chamado pelo hollywoodPath.

export const DESCRIPTION_BATCH_MAX = 12
export const DESCRIPTION_MIN_TOKENS = 1000
export const DESCRIPTION_TOKENS_PER_SCENE = 90
export const DESCRIPTION_TOKENS_OVERHEAD = 200

/** Teto de tokens de UMA chamada do descritor com `sceneCount` cenas (12-24 palavras ≈ 30-40 tokens cada + JSON). */
export function descriptionTokenBudget(sceneCount: number): number {
  const n = Math.max(1, Math.trunc(sceneCount) || 1)
  return Math.max(DESCRIPTION_MIN_TOKENS, DESCRIPTION_TOKENS_PER_SCENE * n + DESCRIPTION_TOKENS_OVERHEAD)
}

/** Índices (0-based) das cenas por lote: até 12 → um lote (idêntico ao de hoje); acima → dois lotes equilibrados. */
export function descriptionBatches(total: number): number[][] {
  const n = Math.max(0, Math.trunc(total) || 0)
  if (n === 0) return []
  const all = Array.from({ length: n }, (_, i) => i)
  if (n <= DESCRIPTION_BATCH_MAX) return [all]
  const first = Math.ceil(n / 2)
  return [all.slice(0, first), all.slice(first)]
}

export function isUsableDescription(d: unknown): d is string {
  return typeof d === 'string' && d.trim().length > 3
}

export type DescriptionCoverage = {
  descriptions: (string | null)[]
  lotes: number
  /** Índices (0-based) re-pedidos depois dos lotes. */
  repedidas: number[]
  /** Subconjunto de `repedidas` que o re-pedido preencheu. */
  recuperadas: number[]
  erros: string[]
}

const msgOf = (e: unknown) => (e instanceof Error ? e.message : String(e))

/**
 * Orquestra o descritor: lotes em paralelo, junção por índice REAL da cena e um re-pedido só das faltantes.
 * `ask(indexes)` recebe os índices 0-based das cenas do pedido e devolve as descrições NA MESMA ORDEM. Nunca lança:
 * lote que falha vira faltante; a rota decide o que fazer com o que sobrou (completeSceneDescriptions).
 */
export async function describeScenesCovered(
  total: number,
  ask: (indexes: number[]) => Promise<string[]>,
): Promise<DescriptionCoverage> {
  const n = Math.max(0, Math.trunc(total) || 0)
  const out: (string | null)[] = Array.from({ length: n }, () => null)
  const erros: string[] = []
  const lotes = descriptionBatches(n)
  const respostas = await Promise.all(lotes.map(async (idx) => {
    try { return await ask(idx) } catch (e) { erros.push(`lote ${idx[0] + 1}-${idx[idx.length - 1] + 1}: ${msgOf(e)}`); return [] as string[] }
  }))
  lotes.forEach((idx, l) => idx.forEach((sceneIndex, k) => {
    const d = respostas[l]?.[k]
    if (isUsableDescription(d)) out[sceneIndex] = d.trim()
  }))
  const repedidas = out.map((d, i) => (d ? -1 : i)).filter((i) => i >= 0)
  const recuperadas: number[] = []
  if (repedidas.length > 0) {
    try {
      const again = await ask(repedidas)
      repedidas.forEach((sceneIndex, k) => {
        const d = again?.[k]
        if (isUsableDescription(d)) { out[sceneIndex] = d.trim(); recuperadas.push(sceneIndex) }
      })
    } catch (e) { erros.push(`re-pedido ${repedidas.map((i) => i + 1).join(',')}: ${msgOf(e)}`) }
  }
  return { descriptions: out, lotes: lotes.length, repedidas, recuperadas, erros }
}

// ─── artefatos de FALA que não podem virar pedido visual ───────────────────────────────────────────────────────────────
// CTA: a frase inteira a partir do gatilho (até o fim da sentença) sai — "Follow for the next one", "subscribe for more".
const CTA_RE = /\b(?:(?:please\s+|so\s+|and\s+)?(?:don'?t\s+forget\s+to\s+|make\s+sure\s+to\s+|remember\s+to\s+)?(?:follow(?:\s+(?:me|us))?\s+for\s+(?:the\s+)?(?:next\s+(?:one|part|video)|more|part\s+\w+)|follow\s+(?:me|us)\b|subscribe\b|hit\s+(?:the\s+)?(?:like|bell|follow|subscribe)(?:\s+button)?|like\s+(?:and|&)\s+(?:share|subscribe|follow)|share\s+this(?:\s+video)?|comment\s+below|drop\s+a\s+comment|let\s+me\s+know\s+in\s+the\s+comments|see\s+you\s+in\s+the\s+next\s+(?:one|video)|stay\s+tuned|link\s+in\s+(?:the\s+)?bio|turn\s+on\s+(?:the\s+)?notifications|smash\s+that\s+\w+(?:\s+button)?|part\s+(?:two|2|\d+)\s+(?:is\s+)?(?:coming|drops|next)(?:\s+soon)?|save\s+this(?:\s+video)?(?:\s+for\s+later)?))\b[^.!?\n]*/gi
// Criatura como metáfora de fenômeno/objeto: "a monster like this", "the beast", "this creature", "such a titan".
const CREATURE_NOUN = '(?:monster|beast|creature|behemoth|titan|demon|leviathan|dragon)'
const CREATURE_PHRASE_RE = new RegExp(`\\b(?:a|an|the|this|that|such\\s+a|like\\s+a|what\\s+a|one)\\s+(?:\\w+\\s+){0,2}?${CREATURE_NOUN}s?\\b(?:\\s+(?:like|of)\\s+(?:this|that|these|those))?`, 'gi')
// "giant" só como SUBSTANTIVO ("a giant like this", "the giant is") — "giant wave" é adjetivo legítimo e fica.
const GIANT_NOUN_RE = /\b(?:a|the|this|that|such\s+a|like\s+a)\s+giant\b(?=\s*(?:$|[,.;:!?]|like\b|of\b|that\b|which\b|who\b|it\b|is\b|was\b|has\b|had\b|does\b|doesn'?t\b|can\b|will\b))/gi
const CREATURE_BARE_RE = /\b(?:monsters?|beasts?|behemoths?|leviathans?)\b/gi

/** Tira CTA e metáfora de criatura de um texto que veio da FALA. Só para texto de fala; descrição do modelo não passa aqui. */
export function scrubSpeechArtifacts(text: string): string {
  let t = String(text ?? '').normalize('NFKC')
  t = t.replace(CTA_RE, ' ')
  t = t.replace(CREATURE_PHRASE_RE, ' ')
  t = t.replace(GIANT_NOUN_RE, ' ')
  t = t.replace(CREATURE_BARE_RE, ' ')
  t = t.replace(/\s+/g, ' ').replace(/\s+([,.;:!?])/g, '$1').replace(/^[\s,.;:!?-]+/, '').replace(/[\s,;:-]+$/, '').trim()
  return t
}

export const wordCount = (t: string): number => String(t ?? '').trim().split(/\s+/).filter(Boolean).length

/** Verdadeiro quando o texto carrega CTA ou criatura-metáfora (o scrub tiraria algo). */
export function hasSpeechArtifacts(text: string): boolean {
  const original = String(text ?? '').normalize('NFKC').replace(/\s+/g, ' ').trim()
  return wordCount(scrubSpeechArtifacts(original)) < wordCount(original)
}

/** Fala que, sem CTA/criatura, não deixa 3 palavras: só CTA — a imagem repete o assunto do filme. */
export function isSpeechOnlyCta(text: string): boolean {
  return wordCount(scrubSpeechArtifacts(text)) < 3
}

// ─── sujeito e cauda (luz/clima) de uma descrição válida ────────────────────────────────────────────────────────────────
const OPENER_RE = /^(?:(?:a|an|the)\s+)?(?:(?:slow|fast|smooth|gentle|dramatic|sweeping|steady|handheld|cinematic|extreme|tight|wide|long|high|low|slow-motion|slow\s+motion)\s+)*(?:(?:aerial|drone|wide|establishing|tracking|macro|close-up|closeup|close\s+up|low-angle|low\s+angle|high-angle|high\s+angle|overhead|top-down|bird'?s-eye|bird'?s\s+eye|push-in|push\s+in|pull-back|pull\s+back|dolly|pan|panning|tilt|crane|orbit|orbiting|static|medium|pov|point-of-view|zoom|reveal|opening)\s*(?:shot|view|angle|detail|details|study|glimpse|perspective|push-in|pull-back|pan|move|movement|tracking|reveal)?|(?:shot|view|angle|detail|details|study|glimpse|perspective))\s*(?:of|on|over|across|through|along|toward|towards|into|down|up|onto|at|around|past|from)?\s+/i
const CAMERA_OPENER_RE = /^(?:the\s+)?camera\s+(?:\w+\s+){0,3}?(?:of|on|over|across|through|along|toward|towards|into|down|up|onto|at|around|past)\s+/i
const CAMERA_CLAUSE_RE = /\b(?:push-in|push\s+in|pull-back|pull\s+back|tracking|dolly|crane|pan|pans|panning|tilt|tilts|orbit|orbits|orbiting|zoom|zooms|handheld|camera|aerial|drone|macro|close-up|closeup|wide\s+shot|low-angle|high-angle|overhead|top-down|bird'?s-eye|slow\s+motion|slow-motion)\b/i

function clausesOf(description: string): string[] {
  return String(description ?? '').replace(/\s+/g, ' ').trim()
    .split(/\s*[,;:—–]\s*|\s+(?:as|while)\s+/i)
    .map((c) => c.trim())
    .filter(Boolean)
}

/** "Wide shot of the stormy sea under black clouds, slow aerial push-in, cold blue light" → "the stormy sea under black clouds". */
export function sceneSubjectOf(description: string): string {
  const clauses = clausesOf(description)
  if (clauses.length === 0) return ''
  for (const c of clauses) {
    const s = c.replace(OPENER_RE, '').replace(CAMERA_OPENER_RE, '').trim()
    if (wordCount(s) >= 2 && !CAMERA_CLAUSE_RE.test(s)) return s.replace(/[.!?]+$/, '')
  }
  const s = clauses[0].replace(OPENER_RE, '').replace(CAMERA_OPENER_RE, '').trim()
  return (s || clauses[0]).replace(/[.!?]+$/, '')
}

/** Cauda de luz/clima da descrição (cláusulas que não são movimento de câmera nem o sujeito), até 3. */
export function shotTailOf(description: string): string {
  const clauses = clausesOf(description)
  const subject = sceneSubjectOf(description)
  const tail: string[] = []
  for (const c of clauses) {
    const s = c.replace(OPENER_RE, '').replace(CAMERA_OPENER_RE, '').trim().replace(/[.!?]+$/, '')
    if (!s || s === subject || CAMERA_CLAUSE_RE.test(s)) continue
    tail.push(s)
    if (tail.length === 3) break
  }
  return tail.join(', ')
}

export const FALLBACK_FRAMINGS = [
  'Wide shot of',
  'Slow aerial pull-back over',
  'Low-angle tracking shot of',
  'Macro detail of',
  'Slow push-in on',
  'High-angle overhead view of',
] as const

/** Enquadramento rotativo por índice de cena; nunca o mesmo com que `avoid` (a descrição-fonte) abre. */
export function describeFromSubject(index: number, subject: string, tail: string, avoid?: string): string {
  const len = FALLBACK_FRAMINGS.length
  let k = ((Math.trunc(index) % len) + len) % len
  const opener = String(avoid ?? '').toLowerCase().trim()
  const sameOpener = (f: string) => opener.startsWith(f.toLowerCase().split(' ').slice(0, 2).join(' '))
  if (sameOpener(FALLBACK_FRAMINGS[k])) k = (k + 1) % len
  const subj = String(subject ?? '').trim() || 'the described story setting'
  const t = String(tail ?? '').trim() || 'dramatic cinematic lighting, moody atmosphere'
  return `${FALLBACK_FRAMINGS[k]} ${subj}, ${t}`
}

/** Assunto do filme a partir do pedido/roteiro: a primeira sentença, sem colchetes, sem CTA/criatura, sem abertura retórica, ≤ 12 palavras. */
export function subjectFromTopic(topic: string): string {
  const t = String(topic ?? '').replace(/\[[^\]]*\]/g, ' ').replace(/\s+/g, ' ').trim()
  const first = (t.match(/^[^.!?\n]+/) ?? [''])[0]
  const scrubbed = scrubSpeechArtifacts(first)
    .replace(/^(?:did\s+you\s+know(?:\s+that)?|here'?s\s+why|here\s+is\s+why|imagine|what\s+if|have\s+you\s+ever\s+wondered(?:\s+why)?|this\s+is|meet|let'?s\s+talk\s+about|the\s+story\s+of|today\s+we\s+(?:look\s+at|explore))\s+/i, '')
  const ws = scrubbed.split(' ').filter(Boolean).slice(0, 12)
  return ws.join(' ').replace(/[.!?,;:]+$/, '') || 'the described story setting'
}

export type SceneForCoverage = { voiceover?: string | null; hint?: string | null }
export type CoverageFallback = { index: number; source: 'previous' | 'next' | 'own_hint_scrubbed' | 'film_subject' }

/**
 * Toda cena sai com descrição. Válida do modelo → fica. Faltante → sujeito + cauda da vizinha válida mais próxima
 * (antes; senão depois), com outro enquadramento. Sem nenhuma válida → pista própria sem CTA/criatura (≥ 3 palavras);
 * senão o assunto do filme. A frase narrada NUNCA entra como está.
 */
export function completeSceneDescriptions(input: {
  descriptions: ReadonlyArray<string | null | undefined>
  scenes: ReadonlyArray<SceneForCoverage>
  topic: string
}): { descriptions: string[]; fallbacks: CoverageFallback[] } {
  const n = input.scenes.length
  const model: (string | null)[] = Array.from({ length: n }, (_, i) => (isUsableDescription(input.descriptions[i]) ? String(input.descriptions[i]).trim() : null))
  const out: string[] = []
  const fallbacks: CoverageFallback[] = []
  const firstModel = model.find((d): d is string => Boolean(d))
  const filmSubject = firstModel ? sceneSubjectOf(firstModel) : subjectFromTopic(input.topic)
  for (let i = 0; i < n; i++) {
    const own = model[i]
    if (own) { out.push(own); continue }
    let src: string | null = null
    let source: CoverageFallback['source'] = 'film_subject'
    for (let j = i - 1; j >= 0; j--) if (model[j]) { src = model[j]; source = 'previous'; break }
    if (!src) for (let j = i + 1; j < n; j++) if (model[j]) { src = model[j]; source = 'next'; break }
    if (src) {
      out.push(describeFromSubject(i, sceneSubjectOf(src), shotTailOf(src), src))
    } else {
      const pista = scrubSpeechArtifacts(String(input.scenes[i]?.hint ?? ''))
      if (wordCount(pista) >= 3) { out.push(pista); source = 'own_hint_scrubbed' }
      else out.push(describeFromSubject(i, filmSubject, ''))
    }
    fallbacks.push({ index: i, source })
  }
  return { descriptions: out, fallbacks }
}
