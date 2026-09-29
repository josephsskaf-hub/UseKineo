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
//   2. stripSocialCta: o filme de 15 s não tem "Follow for more" (ver abaixo);
//   3. fitShortFilmScript: se passar do teto, tira FRASES INTEIRAS (e, se preciso, um bloco MICRO REWARD inteiro) até
//      caber — nunca uma palavra do meio de uma frase;
//   4. a rota decide a nova tentativa (1 só) quando o resultado fica abaixo do piso, com a contagem explícita.
//
// ═══ KINEO-ROTEIRO-15S-FRASE-INTEIRA-2026-09-29 [TRAVA 8.2 — "vai" do 15 s] — nunca cortar dentro de uma frase ═══
// Defeito no ar (produção c55bab53, 29/09 ~06:55 UTC): o filme grátis de 15 s ("Let AI structure it", português) saiu
// com "Localizado a poucos passos do metrô em São." e "Espaço surpreendente e bem distribuído, perfeito para." — e um
// "Seguir para mais!" no PAYOFF. A causa: a faixa do escritor era 41–41 (piso = teto, lib/scriptWriterRate) e cada bloco
// do meio era UMA frase; nenhuma frase inteira podia sair sem cair abaixo do piso, e o último recurso aparava PALAVRAS do
// fim do bloco mais longo até caber. O "corte por palavra" morreu: agora o corte escolhe, entre as combinações de frases
// removíveis, a que cabe na faixa com o PAYOFF inteiro, mais blocos e mais palavras (a 1ª frase do HOOK e a do PAYOFF
// ficam; um bloco MICRO REWARD pode sair inteiro). Sem combinação dentro da faixa, passar do teto até o que a guarda do
// cinematic aceita (hardMaxWords: 56 palavras = 22,5 s, 3 × 8 s) vence ficar abaixo do piso; acima disso, o texto sai
// com frases inteiras e a guarda recusa com mensagem honesta, sem cobrar. Abaixo do piso ou acima do teto, a rota pede
// 1 nova tentativa ao GPT com a contagem explícita e fica com a melhor das duas versões.
//
// Módulo PURO (sem import): a contagem de palavras é INJETADA pela rota — a mesma régua da guarda do cinematic
// (parseUserScript(...).narration, palavras por espaço). Executado por scripts/test-entrada-seedance15-2026-09-29.mjs e
// scripts/test-roteiro-15s-frase-inteira-2026-09-29.mjs.

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

function labelOf(b: Block): string {
  return b.kind === 'MR' ? `MICRO REWARD ${b.mrIndex}` : b.kind
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
  const dropped = blocks.filter((b) => !kept.includes(b)).map(labelOf)
  return { script: render(kept), dropped }
}

// Frase termina em . ! ? (não em reticências "..."), e a próxima começa em maiúscula/número/aspas — ou em emoji/traço
// seguido de maiúscula ("👉 Follow for more!", "— Siga…"), senão o CTA com emoji grudava na frase anterior.
// KINEO-ROTEIRO-15S-REVISAO-2026-09-29 (achado 1): abreviação NÃO fecha frase. "Fica na Av. Ibirapuera" virava a frase
// "Fica na Av." e o corte por frases a entregava sozinha; "In 1952, Dr. Jonas Salk" virava "In 1952, Dr.". Também não
// fecha frase uma letra solta com ponto ("U.S.", "R. Augusta", iniciais). Errar para o lado de NÃO dividir só junta duas
// frases numa unidade maior — nunca produz frase amputada.
export const ABREVIACOES = [
  'Av', 'av', 'Avs', 'Al', 'Pça', 'Trav', 'Rod', 'Estr', 'Dr', 'dr', 'Dra', 'dra', 'Drs', 'Dras', 'Sr', 'sr', 'Sra', 'sra', 'Srs', 'Sras', 'Srta',
  'Prof', 'prof', 'Profa', 'profa', 'Eng', 'Arq', 'Ilmo', 'Exmo', 'Sto', 'Nº', 'N°', 'nº', 'Mr', 'Mrs', 'Ms', 'Jr', 'St', 'Ave', 'Blvd', 'Rd',
  'Mt', 'Ft', 'Gen', 'Col', 'Capt', 'Lt', 'Sgt', 'Gov', 'Sen', 'Rep', 'Pres', 'Rev', 'Fr', 'Vol', 'Fig', 'vs', 'Ud', 'Uds', 'Dña', 'Lic', 'Ing',
  'aprox', 'approx', 'tel', 'pág', 'Pág',
]
const ABREV_ALT = ABREVIACOES.join('|')
const SENTENCE_SPLIT = new RegExp(String.raw`(?<=[^.][.!?])(?<!(?:^|[^\p{L}\p{N}])(?:${ABREV_ALT}|\p{L})\.)\s+(?=[\p{Extended_Pictographic}\p{So}\uFE0F\u200D—–-]*\s*[\p{Lu}\p{N}"'“¿¡])`, 'u')
// O detector de frase truncada: a frase termina numa abreviação ("Fica na Av.") ou em iniciais ("the U.S.").
const FIM_EM_ABREVIACAO = new RegExp(String.raw`(?:^|[^\p{L}\p{N}])(?:${ABREV_ALT}|R|(?:\p{L}\.)+\p{L})\.["'”’)\]]*$`, 'u')

function sentencesOf(body: string): string[] {
  return body.split(SENTENCE_SPLIT).map((s) => s.trim()).filter(Boolean)
}

const wordsOf = (t: string): number => t.split(/\s+/).filter(Boolean).length

// ─── CTA de rede social ─────────────────────────────────────────────────────────────────────────────────────────────
// O filme de 15 s acaba quando a narração acaba: "Seguir para mais!" gasta 1,2 s de um filme de 15 e não é história.
// O prompt de ≤ 20 s já não pede CTA; se vier, sai aqui. Só é CTA a frase IMPERATIVA de seguir/inscrever (o verbo abre
// a frase, depois de emoji/traço/rótulo "CTA:" e de um conectivo opcionais) com objeto de CTA ("para mais"/"for more"/
// "para más" sem "than/de/que" depois, "mais dicas", canal, parte, dicas…) ou de no máximo 2 palavras ("Follow now!",
// "Inscreva-se já!"). "Siga pela Avenida Ibirapuera", "Follow the money." ficam.
// KINEO-ROTEIRO-15S-REVISAO-2026-09-29 (achados 3 e 4): "me/us/nos/more" SOZINHOS não fazem CTA — "Siga-me até a
// cobertura…", "Follow me inside the penthouse.", "Follow more than 300 steps…" são frases de tour, e a 1ª apagava o
// HOOK inteiro. E "👉 Follow for more!", "🔔 Inscreva-se para mais!", "CTA: Follow for more!" passavam.
const semAcento = (t: string): string => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const CTA_LEAD = String.raw`(?:(?:and|e|y|so|entao|entonces|now|agora|ahora|please|por favor|don'?t forget to|dont forget to|nao esqueca de|no olvides|like and|curta e|dale like y|deixe seu like e)\s+)*`
const CTA_VERB = String.raw`(?:follow|subscribe|siga|sigam|segue|seguir|sigue|siguenos|sigueme|siganos|seguinos|inscreva|inscrevam|inscrevase|suscribete|suscribanse|suscribase)`
const CTA_START = new RegExp(String.raw`^[^\p{L}\p{N}]*(?:cta\s*[:\-–—]\s*[^\p{L}\p{N}]*)?${CTA_LEAD}${CTA_VERB}\b`, 'u')
const CTA_OBJECT = /\b(?:(?:for|para|pra|por)\s+(?:more|mais|mas)\b(?!\s+(?:than|de|do|da|que|of|del|um|uma|uns|umas|one|an?|uno|una))|(?:more|mais|mas)\s+(?:facts|videos|content|stories|fatos|conteudos?|historias|curiosidades|datos|dicas|tips|consejos)|channel|canal|page|pagina|perfil|profile|part|parte|daily|diario|diaria|tips|dicas|consejos|like|likes|curtir|sininho|notifications|notificacoes|notificaciones|kineo)\b/

/** A frase é um CTA de rede social ("Follow for more", "Seguir para mais!", "Sígueme para más")? */
export function isSocialCta(sentence: string): boolean {
  const n = semAcento(String(sentence ?? '')).trim()
  if (!n) return false
  const palavras = wordsOf(n)
  if (palavras > 14 || !CTA_START.test(n)) return false
  return CTA_OBJECT.test(n) || palavras <= 2
}

/**
 * Tira do roteiro as frases de CTA de rede social (qualquer bloco). Sem nada a tirar, devolve o texto intacto.
 * Nunca esvazia o HOOK nem o PAYOFF (se a única frase dele "parece" CTA, fica — sem gancho ou sem revelação não há
 * filme); um bloco do meio que só tinha CTA sai inteiro, em vez de virar cabeçalho sem fala.
 */
export function stripSocialCta(script: string): { script: string; removed: string[] } {
  const original = String(script ?? '')
  const { blocks } = parseBlocks(original)
  const removed: string[] = []
  if (blocks.length === 0) {
    const ss = sentencesOf(original.replace(/\s*\r?\n\s*/g, ' ').trim())
    const kept = ss.filter((s) => { if (isSocialCta(s)) { removed.push(s); return false } return true })
    return removed.length ? { script: kept.join(' '), removed } : { script: original, removed }
  }
  const vazios = new Set<Block>()
  for (const b of blocks) {
    const ss = sentencesOf(b.body)
    const ctas = ss.filter((s) => isSocialCta(s))
    if (ctas.length === 0) continue
    if (ctas.length === ss.length && (b.kind === 'HOOK' || b.kind === 'PAYOFF')) continue
    removed.push(...ctas)
    b.body = ss.filter((s) => !isSocialCta(s)).join(' ')
    if (!b.body) vazios.add(b)
  }
  return removed.length ? { script: render(blocks.filter((b) => !vazios.has(b))), removed } : { script: original, removed }
}

// ─── Frase truncada ─────────────────────────────────────────────────────────────────────────────────────────────────
// Detector (o guardião e o rastro da rota usam): frase sem pontuação final, ou que termina em preposição/artigo/
// conjunção pendurada ("perfeito para.", "and the."). Pergunta não entra no 2º teste ("What are you waiting for?").
const PENDURADAS = new Set([
  // pt
  'em', 'na', 'nas', 'nos', 'num', 'numa', 'para', 'pra', 'pro', 'de', 'do', 'da', 'dos', 'das', 'a', 'o', 'as', 'os', 'e', 'ou', 'com', 'que', 'por', 'pelo', 'pela', 'um', 'uma', 'ao', 'aos',
  // en
  'the', 'to', 'of', 'and', 'in', 'for', 'with', 'an', 'or', 'at', 'from',
  // es
  'el', 'la', 'los', 'las', 'un', 'una', 'y', 'en', 'con', 'del', 'al', 'por', 'que',
])
const FIM_DE_FRASE = /[.!?…]["'”’)\]]*$/

/** Frases do roteiro (fala, sem cabeçalhos nem pistas) que parecem cortadas no meio. */
export function truncatedSentences(script: string): string[] {
  const { preamble, blocks } = parseBlocks(String(script ?? ''))
  const corpos = blocks.length ? blocks.map((b) => b.body) : [preamble]
  const ruins: string[] = []
  for (const corpo of corpos) {
    for (const s of sentencesOf(corpo)) {
      if (!FIM_DE_FRASE.test(s)) { ruins.push(s); continue }
      if (FIM_EM_ABREVIACAO.test(s)) { ruins.push(s); continue } // "Fica na Av.", "In 1952, Dr."
      if (/\?["'”’)\]]*$/.test(s)) continue
      const ultima = semAcento(s.replace(/[.!?…"'”’)\]]+$/, '')).split(/\s+/).filter(Boolean).pop() ?? ''
      if (PENDURADAS.has(ultima.replace(/[,;:\-–—]+$/, ''))) ruins.push(s)
    }
  }
  return ruins
}

export interface FitShortFilmArgs {
  maxWords: number
  minWords: number
  /** A régua da guarda do cinematic (a rota injeta parseUserScript(...).narration contada por espaço). */
  countWords: (script: string) => number
  /**
   * Teto DURO (opcional): o que a guarda do filme curto ainda aceita (Seedance 15 s: maxWordsForShortFilm = 56, 3 × 8 s).
   * Sem combinação dentro de [minWords, maxWords], passar do teto até aqui VENCE ficar abaixo do piso — "passar do alvo é
   * bom; ficar abaixo é defeito" (fundador 02/09), e abaixo do piso o portão de narração do cinematic pode recusar.
   * Ausente = maxWords (sem folga).
   */
  hardMaxWords?: number
}

export interface FitShortFilmResult {
  script: string
  words: number
  /** 'sentences' = saíram frases inteiras (e talvez um bloco inteiro). Não existe mais corte por palavra. */
  cut: 'none' | 'sentences'
  /** Blocos que saíram inteiros (ex.: 'MICRO REWARD 2'). */
  droppedBlocks: string[]
  /** Ficou abaixo do piso (a rota pede 1 nova tentativa; se ainda faltar, aceita — frases inteiras). */
  belowFloor: boolean
  /** Ficou acima de maxWords (até hardMaxWords, ou além quando nem o mínimo de frases coube). */
  overCeiling: boolean
}

interface Unit { key: string; block: number; words: number; order: number; payoffTail: boolean }

/**
 * Corta o roteiro curto até caber em maxWords, SEM NUNCA CORTAR DENTRO DE UMA FRASE. Fixas: a 1ª frase do HOOK e a 1ª do
 * PAYOFF; todo o resto pode sair em frases inteiras (um bloco MICRO REWARD pode sair inteiro). Entre as combinações:
 *   1º não ficar abaixo do piso; 2º PAYOFF inteiro (a revelação vale mais que caber no teto: passar até hardMaxWords é
 *   aceito); 3º dentro da faixa [minWords, maxWords] > acima do teto até hardMaxWords > abaixo do piso; depois, dentro
 *   da faixa: mais blocos > mais palavras; acima do teto: MENOS palavras (o mais perto do teto) > mais blocos; por fim
 *   menos frases tiradas > tirar as do fim. (KINEO-ROTEIRO-15S-REVISAO-2026-09-29, achados 2 e 5.)
 * Se nada couber nem em hardMaxWords, sai o mínimo de frases inteiras (1ª do HOOK + 1ª do PAYOFF + blocos sem frase
 * removível) com overCeiling — a guarda do cinematic decide, com mensagem honesta. Determinístico.
 */
export function fitShortFilmScript(script: string, args: FitShortFilmArgs): FitShortFilmResult {
  const { maxWords, minWords, countWords } = args
  const hardMax = Math.max(maxWords, Number.isFinite(args.hardMaxWords) ? (args.hardMaxWords as number) : maxWords)
  const original = String(script ?? '')
  const n0 = countWords(original)
  if (n0 <= maxWords) return { script: original, words: n0, cut: 'none', droppedBlocks: [], belowFloor: n0 < minWords, overCeiling: false }

  const parsed = parseBlocks(original)
  const blocks: Block[] = parsed.blocks.length
    ? parsed.blocks
    : [{ kind: 'HOOK', mrIndex: 0, prefix: '', body: parsed.preamble.replace(/\s*\n\s*/g, ' ') }]
  const frases = blocks.map((b) => sentencesOf(b.body))
  const hookAt = blocks.findIndex((b) => b.kind === 'HOOK')
  const payoffAt = blocks.findIndex((b) => b.kind === 'PAYOFF')
  const inicio = hookAt >= 0 ? hookAt : 0
  const fim = payoffAt >= 0 ? payoffAt : blocks.length - 1

  // KINEO-ROTEIRO-15S-REVISAO-2026-09-29 (achado 2): a frase fixa do PAYOFF é a 1ª que NÃO é pergunta — em "Qual é o
  // detalhe? Da varanda de cada suíte…" a fixa é a revelação; fixar a pergunta deixava o filme terminar em "Qual é o
  // detalhe?".
  const pergunta = (f: string) => /\?["'”’)\]]*$/.test(f)
  const fixaDoFim = fim === inicio ? 0 : Math.max(0, frases[fim]?.findIndex((f) => !pergunta(f)) ?? 0)
  const units: Unit[] = []
  let ordem = 0
  frases.forEach((ss, i) => ss.forEach((s, j) => {
    ordem += 1
    if ((i === inicio && j === 0) || (i === fim && j === fixaDoFim)) return
    units.push({ key: `${i}:${j}`, block: i, words: wordsOf(s), order: ordem, payoffTail: i === fim })
  }))
  const renderMask = (removed: Set<string>): string => render(
    blocks
      .map((b, i) => ({ ...b, body: frases[i].filter((_, j) => !removed.has(`${i}:${j}`)).join(' ') }))
      .filter((b, i) => frases[i].length === 0 || b.body.length > 0),
  )
  const resultado = (removed: Set<string>, overCeiling: boolean): FitShortFilmResult => {
    const texto = renderMask(removed)
    const words = countWords(texto)
    const droppedBlocks = blocks.filter((_, i) => frases[i].length > 0 && frases[i].every((__, j) => removed.has(`${i}:${j}`))).map(labelOf)
    return { script: texto, words, cut: removed.size > 0 ? 'sentences' : 'none', droppedBlocks, belowFloor: words < minWords, overCeiling: overCeiling || words > maxWords }
  }
  if (units.length === 0) return { script: original, words: n0, cut: 'none', droppedBlocks: [], belowFloor: n0 < minWords, overCeiling: true }

  // A régua injetada pode contar diferente da soma por espaço (pistas, números): a diferença entra como deslocamento, e
  // o resultado é SEMPRE conferido na régua real; se ela passar do limite, o limite da estimativa desce e escolhe de novo.
  const total = frases.reduce((a, ss) => a + ss.reduce((x, s) => x + wordsOf(s), 0), 0)
  const desloc = n0 - total
  let teto = maxWords
  let duro = hardMax
  for (let volta = 0; volta < 12; volta++) {
    const escolha = melhorMascara(units, frases.map((ss) => ss.length), total + desloc, { piso: minWords, teto, duro })
    if (!escolha) break
    const r = resultado(escolha.removidas, false)
    const limite = escolha.faixa === 'acima' ? hardMax : maxWords
    if (r.words <= limite) return r
    if (escolha.faixa === 'acima') duro -= r.words - hardMax
    else teto -= r.words - maxWords
  }
  // Nada cabe nem no teto duro: o mínimo possível de frases inteiras.
  return resultado(new Set(units.map((u) => u.key)), true)
}

type Faixa = 'dentro' | 'acima' | 'abaixo'

/**
 * A melhor combinação de frases a tirar, por estimativa aditiva de palavras (base = total estimado com deslocamento).
 * null = nenhuma combinação fica ≤ duro.
 */
function melhorMascara(units: Unit[], frasesPorBloco: number[], base: number, lim: { piso: number; teto: number; duro: number }): { removidas: Set<string>; faixa: Faixa } | null {
  const n = units.length
  const RANK: Record<Faixa, number> = { dentro: 3, acima: 2, abaixo: 1 }
  type Cand = { tirar: boolean[]; faixa: Faixa; chave: number[] }
  const avalia = (tirar: boolean[]): Cand | null => {
    let palavras = base
    let quantas = 0
    let tarde = 0
    let payoffInteiro = 1
    const tiradas = frasesPorBloco.map(() => 0)
    units.forEach((u, i) => {
      if (!tirar[i]) return
      palavras -= u.words; quantas += 1; tarde += u.order; tiradas[u.block] += 1
      if (u.payoffTail) payoffInteiro = 0
    })
    if (palavras > lim.duro) return null
    const faixa: Faixa = palavras > lim.teto ? 'acima' : palavras >= lim.piso ? 'dentro' : 'abaixo'
    const vivos = frasesPorBloco.reduce((a, k, i) => a + (k > 0 && tiradas[i] < k ? 1 : 0), 0)
    const porTamanho = faixa === 'acima' ? [-palavras, vivos] : [vivos, palavras]
    return { tirar, faixa, chave: [faixa === 'abaixo' ? 0 : 1, payoffInteiro, RANK[faixa], ...porTamanho, -quantas, tarde] }
  }
  let best: Cand | null = null
  const considera = (c: Cand | null) => {
    if (!c) return
    if (!best) { best = c; return }
    for (let i = 0; i < c.chave.length; i++) if (c.chave[i] !== best.chave[i]) { if (c.chave[i] > best.chave[i]) best = c; return }
  }
  if (n <= 16) {
    for (let mask = 0; mask < 1 << n; mask++) considera(avalia(units.map((_, i) => (mask & (1 << i)) !== 0)))
  } else {
    // Muitas frases (> 16 removíveis): guloso — tira do fim da história para o começo (a cauda do PAYOFF por último).
    const ordemDeTirar = units.map((u, i) => ({ u, i })).sort((a, z) => Number(a.u.payoffTail) - Number(z.u.payoffTail) || z.u.order - a.u.order)
    const tirar = units.map(() => false)
    considera(avalia([...tirar]))
    for (const { i } of ordemDeTirar) { tirar[i] = true; considera(avalia([...tirar])) }
  }
  if (!best) return null
  const escolhido = best as Cand
  return { removidas: new Set(units.filter((_, i) => escolhido.tirar[i]).map((u) => u.key)), faixa: escolhido.faixa }
}

/** O pós-processamento inteiro do filme curto, na ordem da rota: 4 seções → sem CTA de rede social → corte por frases. */
export function finishShortFilmScript(script: string, args: FitShortFilmArgs): FitShortFilmResult & { droppedSections: string[]; ctaRemoved: string[] } {
  const so4 = keepShortFilmSections(script)
  const semCta = stripSocialCta(so4.script)
  const ajuste = fitShortFilmScript(semCta.script, args)
  return { ...ajuste, droppedSections: so4.dropped, ctaRemoved: semCta.removed }
}

/** O reforço da nova tentativa do filme curto (a rota junta aos problemas medidos). */
export function shortFilmRetryInstruction(maxWords: number, minWords: number, seconds: number): string {
  return `This is a ${seconds}-second film. Rewrite the FULL script with ONLY these 4 sections, each on its own line, in this order: ${SHORT_FILM_SECTIONS.join(', ')}. Do NOT write MICRO REWARD 3, ESCALATION or RHYTHM. Use at least ${minWords} and at most ${maxWords} spoken words in total — count them, and aim for about ${maxWords} (the [Pexels: ...] cues and the headers do not count). Every sentence must be complete. Do NOT add any follow/subscribe/like call to action. The film ends when the narration ends, so the PAYOFF must still deliver the concrete answer the HOOK promised, with no teasing. Respond with ONLY the script.`
}
