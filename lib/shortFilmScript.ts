// ═══ KINEO-ROTEIRO-CURTO-15S-2026-09-29 — o roteiro de 15 s nasce do tamanho que a guarda do cinematic aceita ═══
//
// O defeito (ensaio real em produção, 29/09): /api/generate-script com targetSeconds 15 e engine cinematic_ai devolveu
// 64 palavras em 7 blocos (HOOK, MR1, MR2, MR3, ESCALATION, RHYTHM, PAYOFF) — o prompt de ≤ 20 s PEDE só 4 seções,
// mas nada CONFERIA. A guarda do filme curto da rota do cinematic (lib/durationByEngine.ts checarFalaDoFilmeCurto)
// recusou com 422 'script_too_long_for_short_film': o filme grátis de 15 s morria no primeiro clique, sem culpa de
// ninguém além do escritor.
//
// O conserto é determinístico, depois da geração (o modelo não é confiável para contar):
//   1. keepShortFilmSections: fica HOOK, MICRO REWARD 1, MICRO REWARD 2 e PAYOFF, nesta ordem; MR3, ESCALATION e
//      RHYTHM saem inteiros (só quando HOOK e PAYOFF existem — sem eles não há como saber o que é a história);
//   2. a rota decide a nova tentativa (1 só) com o reforço "at most N spoken words, only these 4 sections";
//   3. fitShortFilmScript: se AINDA passar do teto, corta até caber — primeiro frases inteiras dos blocos do meio
//      (MR2, MR1, depois a 2ª frase do HOOK), só se o resultado não cair abaixo do piso; se nenhuma frase inteira
//      couber, apara palavras do fim do bloco do meio mais longo (nunca do PAYOFF, que entrega a resposta).
//
// Módulo PURO (sem import): a contagem de palavras é INJETADA pela rota — a mesma régua da guarda do cinematic
// (parseUserScript(...).narration, palavras por espaço). Executado por scripts/test-entrada-seedance15-2026-09-29.mjs.

/** Alvos até aqui são "filme curto": o prompt do escritor já pede só 4 seções (generate-script, KINEO1-ROTEIRO-DA-COTA). */
export const SHORT_FILM_MAX_TARGET_SECONDS = 20

/** As 4 seções do filme curto, na ordem. */
export const SHORT_FILM_SECTIONS = ['HOOK', 'MICRO REWARD 1', 'MICRO REWARD 2', 'PAYOFF'] as const

export function isShortFilmTarget(seconds: number): boolean {
  return Number.isFinite(seconds) && seconds > 0 && seconds <= SHORT_FILM_MAX_TARGET_SECONDS
}

type Kind = 'HOOK' | 'MR' | 'ESCALATION' | 'RHYTHM' | 'PAYOFF'
interface Block { kind: Kind; mrIndex: number; prefix: string; body: string }

const HEADER_LINE = /^\s*(?:\*\*)?\s*(HOOK|MICRO\s+REWARD(?:\s*#?\s*(\d+))?|ESCALATION|RHYTHM|PAYOFF)\b/i

function kindOf(label: string): Kind {
  const u = label.toUpperCase()
  if (u.startsWith('HOOK')) return 'HOOK'
  if (u.startsWith('MICRO')) return 'MR'
  if (u.startsWith('ESCALATION')) return 'ESCALATION'
  if (u.startsWith('RHYTHM')) return 'RHYTHM'
  return 'PAYOFF'
}

// "HOOK (0-2s): [Pexels: foggy lake surface] Lake Nyos…" → prefixo = cabeçalho + rótulo de tempo + dois-pontos + pistas.
const PREFIX = /^\s*(?:\*\*)?\s*(?:HOOK|MICRO\s+REWARD(?:\s*#?\s*\d+)?|ESCALATION|RHYTHM|PAYOFF)\b\s*(?:\([^)\n]*\))?\s*(?:\*\*)?\s*[:.\-–—]?\s*(?:\*\*)?\s*(?:\[[^\]\n]*\]\s*)*/i

function parseBlocks(script: string): { preamble: string; blocks: Block[] } {
  const lines = String(script ?? '').split(/\r?\n/)
  const blocks: Block[] = []
  const preamble: string[] = []
  let mrSeen = 0
  for (const line of lines) {
    const m = line.match(HEADER_LINE)
    if (m) {
      const kind = kindOf(m[1])
      let mrIndex = 0
      if (kind === 'MR') {
        mrSeen += 1
        mrIndex = m[2] ? Number(m[2]) : mrSeen
      }
      const p = line.match(PREFIX)
      const prefix = p ? p[0] : ''
      blocks.push({ kind, mrIndex, prefix: prefix.replace(/\s+$/, ''), body: line.slice(prefix.length).trim() })
      continue
    }
    if (blocks.length === 0) { preamble.push(line); continue }
    const last = blocks[blocks.length - 1]
    last.body = [last.body, line.trim()].filter(Boolean).join(' ')
  }
  return { preamble: preamble.join('\n').trim(), blocks }
}

function render(blocks: Block[]): string {
  return blocks.map((b) => [b.prefix, b.body].filter(Boolean).join(' ')).join('\n\n')
}

/**
 * Filme curto: fica só HOOK, MICRO REWARD 1, MICRO REWARD 2 e PAYOFF (nesta ordem). Sem HOOK ou sem PAYOFF, devolve
 * o texto intacto (não há como saber o que é a história). O preâmbulo antes do 1º cabeçalho sai (não é fala do filme).
 */
export function keepShortFilmSections(script: string): { script: string; dropped: string[] } {
  const { blocks } = parseBlocks(script)
  const hook = blocks.find((b) => b.kind === 'HOOK')
  const payoff = blocks.find((b) => b.kind === 'PAYOFF')
  if (!hook || !payoff) return { script, dropped: [] }
  const mrs = blocks.filter((b) => b.kind === 'MR').sort((a, b) => a.mrIndex - b.mrIndex)
  const kept: Block[] = [hook, ...mrs.slice(0, 2), payoff]
  const dropped = blocks.filter((b) => !kept.includes(b)).map((b) => (b.kind === 'MR' ? `MICRO REWARD ${b.mrIndex}` : b.kind))
  return { script: render(kept), dropped }
}

// Frase termina em . ! ? (não em reticências "..."), e a próxima começa em maiúscula/número/aspas.
const SENTENCE_SPLIT = /(?<=[^.][.!?])\s+(?=[\p{Lu}\p{N}"'“¿¡])/u

function sentencesOf(body: string): string[] {
  return body.split(SENTENCE_SPLIT).map((s) => s.trim()).filter(Boolean)
}

export interface FitShortFilmArgs {
  maxWords: number
  minWords: number
  /** A régua da guarda do cinematic (a rota injeta parseUserScript(...).narration contada por espaço). */
  countWords: (script: string) => number
}

export interface FitShortFilmResult {
  script: string
  words: number
  cut: 'none' | 'sentences' | 'words'
}

/**
 * Corta o roteiro curto até caber em maxWords, nunca abaixo de minWords. Ordem: frases inteiras (MR2, MR1, 2ª+ frase
 * do HOOK) enquanto o resultado ficar ≥ piso; depois, palavras do fim do bloco do meio mais longo. O PAYOFF nunca é
 * aparado (é a resposta que o HOOK prometeu). Determinístico: o mesmo texto sempre sai igual.
 */
export function fitShortFilmScript(script: string, args: FitShortFilmArgs): FitShortFilmResult {
  const { maxWords, minWords, countWords } = args
  let current = String(script ?? '')
  if (countWords(current) <= maxWords) return { script: current, words: countWords(current), cut: 'none' }
  const { blocks } = parseBlocks(current)
  let cut: FitShortFilmResult['cut'] = 'none'
  const order = (): Block[] => {
    const mrs = blocks.filter((b) => b.kind === 'MR').sort((a, b) => b.mrIndex - a.mrIndex)
    const rest = blocks.filter((b) => b.kind !== 'MR' && b.kind !== 'HOOK' && b.kind !== 'PAYOFF')
    const hook = blocks.filter((b) => b.kind === 'HOOK')
    return [...rest, ...mrs, ...hook]
  }
  // 1) Frases inteiras.
  for (let guard = 0; guard < 50 && countWords(current) > maxWords; guard++) {
    let applied = false
    for (const b of order()) {
      const ss = sentencesOf(b.body)
      if (ss.length < 2) continue
      const before = b.body
      b.body = ss.slice(0, -1).join(' ')
      const candidate = render(blocks)
      if (countWords(candidate) >= minWords) { current = candidate; cut = 'sentences'; applied = true; break }
      b.body = before
    }
    if (!applied) break
  }
  // 2) Palavras do fim do bloco do meio mais longo (nunca o PAYOFF; o HOOK por último).
  for (let guard = 0; guard < 400 && countWords(current) > maxWords; guard++) {
    const candidatos = order()
      .map((b) => ({ b, words: b.body.split(/\s+/).filter(Boolean) }))
      .filter((c) => c.words.length > 3)
      .sort((a, z) => (a.b.kind === 'HOOK' ? 1 : 0) - (z.b.kind === 'HOOK' ? 1 : 0) || z.words.length - a.words.length)
    if (candidatos.length === 0) break
    const alvo = candidatos[0]
    const semUltima = alvo.words.slice(0, -1).join(' ').replace(/[,;:\-–—]+$/, '')
    alvo.b.body = /[.!?]$/.test(semUltima) ? semUltima : `${semUltima}.`
    const candidate = render(blocks)
    if (countWords(candidate) < minWords) break
    current = candidate
    cut = 'words'
  }
  // 3) Trava final: o TETO vence o piso. Acima do teto a guarda do cinematic recusa o filme inteiro (422); abaixo do
  //    piso ele ainda sai. Só chega aqui texto sem blocos aparáveis (patológico): corta palavras do fim do texto.
  for (let guard = 0; guard < 2000 && countWords(current) > maxWords; guard++) {
    const antes = current
    current = current.replace(/\s*\S+\s*$/, '')
    if (current === antes || !current) break
    cut = 'words'
  }
  return { script: current, words: countWords(current), cut }
}

/** O reforço da nova tentativa do filme curto (a rota junta aos problemas medidos). */
export function shortFilmRetryInstruction(maxWords: number, minWords: number, seconds: number): string {
  return `This is a ${seconds}-second film. Rewrite the FULL script with ONLY these 4 sections, each on its own line, in this order: ${SHORT_FILM_SECTIONS.join(', ')}. Do NOT write MICRO REWARD 3, ESCALATION or RHYTHM. Use at least ${minWords} and at most ${maxWords} spoken words in total (the [Pexels: ...] cues and the headers do not count) — the film ends when the narration ends, so the PAYOFF must still deliver the concrete answer the HOOK promised, with no teasing. Respond with ONLY the script.`
}
