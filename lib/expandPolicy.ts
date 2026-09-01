// ═══ KINEO-P0A-350-POLITICA-DE-EXPANSAO-2026-08-26 ═════════════════════════
//
// POR QUE ESTE ARQUIVO EXISTE
//
// O #349 matou o loop das duas réguas, mas o canário em produção achou três
// becos sem saída que sobraram — e um cliente real em cada um deles:
//
//   D1  19joschaschuetz96 (Alemanha, 25/08 20:41 e 20:44) escreveu uma IDEIA
//       de 7s e depois de 2s pedindo 60s de vídeo. O teto de 2,5× tornava a
//       expansão matematicamente impossível: 2s × 2,5 = 5s, e o mínimo é 57s.
//       Ele levava 422 sempre, tentasse quantas vezes tentasse.
//   D2  Qualquer 422 virava texto vermelho sem UM botão. Beco sem saída.
//   D3  A checagem "o autor foi preservado?" comparava frases do texto CRU —
//       bullets e `Voice:`/`Music:`/`Format:` inclusos. O GPT reformata linha
//       de produção, e a expansão inteira era descartada por engano. É o MESMO
//       bug de duas réguas do #349, na checagem irmã.
//
// A DECISÃO DE PRODUTO QUE GOVERNA TUDO AQUI (fundador, 26/08):
// o teto de 2,5× NÃO sobe e NÃO some. Ideia de 2s virando 60s não é
// "expansão" — é a IA escrevendo o roteiro inteiro no lugar da pessoa, sem ela
// pedir. Isso continua proibido em silêncio. O que muda é que agora a gente
// DESCOBRE ISSO ANTES de gastar a chamada, e oferece o caminho certo: escrever
// o roteiro completo COM consentimento explícito e preview.
//
// Tudo aqui é função pura, sem rede, sem banco, sem relógio — para os testes
// de scripts/test-expand-policy.mjs exercitarem o contrato REAL, não regex
// procurando string em arquivo.

import { MIN_COVERAGE, WORDS_PER_SECOND, speechSeconds } from './narrationFit'

/**
 * Teto de crescimento. NÃO MEXER PARA "FAZER PASSAR".
 * Acima disso não é completar um roteiro, é escrever outro — e escrever outro
 * exige clique explícito da pessoa (ver `needsAuthoring`).
 */
export const MAX_GROWTH_FACTOR = 2.5

/**
 * As durações que o seletor do Studio realmente oferece.
 * FONTE ÚNICA: o cliente derivava de `[90, 60, 45, 35]` e podia sugerir 45s —
 * uma duração que NÃO existe no seletor desde o #333. Botão que não funciona é
 * pior que botão ausente, então as duas pontas leem daqui.
 */
export const SUPPORTED_DURATIONS = [35, 60, 90] as const

/** Estados de domínio. A UI decide o que mostrar a partir DESTE campo. */
export type ExpandOutcome =
  | 'already_fits'            // a fala já enche: nada a fazer
  | 'expanded_ready'          // expandiu e enche: pode aprovar
  | 'needs_authoring'         // é uma IDEIA, não um roteiro expansível
  | 'still_short'             // expandiu, ajudou, ainda não enche
  | 'author_rewrite_rejected' // o modelo mexeu na fala do autor
  | 'structure_lost'          // o modelo perdeu HOOK/PAYOFF: formato quebrado
  | 'growth_limit'            // o modelo devolveu texto grande demais
  | 'transient_failure'       // rede/limite/indisponibilidade: dá para tentar de novo

/** Fala mínima (em segundos) que um vídeo de `target` segundos exige. */
export function minimumSpeech(targetSeconds: number): number {
  return targetSeconds * MIN_COVERAGE
}

/**
 * Quantas vezes a fala atual precisa crescer para encher o alvo.
 * Fala zero ⇒ Infinity (nenhum múltiplo de zero chega a lugar nenhum).
 */
export function requiredGrowth(currentSpeech: number, targetSeconds: number): number {
  if (!(currentSpeech > 0)) return Number.POSITIVE_INFINITY
  return minimumSpeech(targetSeconds) / currentSpeech
}

/**
 * É uma IDEIA (precisa ser ESCRITA) em vez de um roteiro a completar?
 * Este é o preflight: quando dá true, NÃO se chama a OpenAI e NÃO se gasta
 * rodada — o custo e a espera não teriam como dar certo.
 */
export function needsAuthoring(currentSpeech: number, targetSeconds: number): boolean {
  return requiredGrowth(currentSpeech, targetSeconds) > MAX_GROWTH_FACTOR
}

/** O candidato cresceu dentro do teto EM RELAÇÃO À BASE ORIGINAL do autor? */
export function withinGrowthLimit(baseSpeech: number, candidateSpeech: number): boolean {
  if (!(baseSpeech > 0)) return false
  return candidateSpeech <= baseSpeech * MAX_GROWTH_FACTOR
}

/**
 * KINEO-BASE-DE-CRESCIMENTO-2026-08-31 (sprint v1-v4 #9)
 *
 * A BASE do teto de 2,5x tem de ser um ANCESTRAL do roteiro que esta sendo
 * completado. Em producao ela nao era: no caminho PADRAO (scriptMode 'ai') o
 * cliente guardava como base a IDEIA CRUA digitada (~3s de fala) e mandava
 * expandir o ROTEIRO ESTRUTURADO que o /api/generate-script escreveu em cima
 * dela (~38s de fala). Teto = 3 x 2,5 = 7,5s contra um candidato de ~47s:
 * growth_limit GARANTIDO, sempre na 1a rodada, para quem so precisava de 12
 * palavras. 4 das 5 falhas de expansao medidas em 29-31/08 sao exatamente
 * isto, e todas vieram de /studio/create.
 *
 * O sinal que denuncia a base errada e ARITMETICO e nao precisa comparar
 * textos: se o PROPRIO roteiro de entrada ja estoura o teto da base, a base
 * nao pode ser ancestral dele -- nenhuma expansao teria como passar, e a
 * recusa estaria decidida antes de qualquer chamada ao modelo.
 *
 * Nesse caso a base honesta e o roteiro de entrada: e o texto que a pessoa
 * leu, aceitou na tela e mandou completar. O Contrato C1 continua de pe -- o
 * teto segue existindo, medido contra o texto certo.
 */
export function resolveGrowthBase(
  baseSpeech: number,
  originalSpeech: number,
): { speech: number; repaired: boolean } {
  if (!(baseSpeech > 0)) return { speech: originalSpeech, repaired: true }
  if (!(originalSpeech > 0)) return { speech: baseSpeech, repaired: false }
  if (!withinGrowthLimit(baseSpeech, originalSpeech)) {
    return { speech: originalSpeech, repaired: true }
  }
  return { speech: baseSpeech, repaired: false }
}

// ═══ KINEO-TETO-NO-PROMPT-2026-09-01 (sprint v1-v4 #37) ═══════════════════
//
// MEDIDO: 5 das 6 expansoes que nao entregaram texto em 29/08-01/09 sairam por
// `growth_limit`, e uma delas (30/08 21:01) faltavam DOZE palavras para encher
// 45s. O teto de 2,5x nao era o problema -- o modelo escreveu texto muito alem
// dele. E escreveu porque NINGUEM CONTOU A ELE QUE O TETO EXISTE: o pedido diz
// "roughly N words" e "add about M words", linguagem frouxa, e as 6 regras
// absolutas do system prompt nao mencionam limite superior nenhum. O servidor
// entao mede um teto secreto e joga fora a resposta inteira.
//
// Esta funcao traduz o MESMO teto que o veredito usa (`withinGrowthLimit`)
// para a unica unidade que um redator entende: palavras. Assim o pedido passa
// a carregar o limite que a recusa vai cobrar. O teto NAO muda, o Contrato C1
// NAO afrouxa -- o que muda e que ele para de ser secreto.
export function maxCandidateWords(baseSpeech: number): number {
  if (!(baseSpeech > 0)) return 0
  return Math.floor(baseSpeech * MAX_GROWTH_FACTOR * WORDS_PER_SECOND)
}

/** A maior duração que esta fala consegue encher pela régua canônica. */
export function maximumFittingDuration(currentSpeech: number): number {
  return currentSpeech / MIN_COVERAGE
}

/**
 * A maior duração DO SELETOR que esta fala enche — ou null.
 * `null` significa "não existe botão honesto": nenhuma duração oferecida cabe.
 */
export function largestFittingDuration(
  currentSpeech: number,
  supported: readonly number[] = SUPPORTED_DURATIONS,
): number | null {
  const teto = maximumFittingDuration(currentSpeech)
  const cabem = supported.filter((d) => d <= teto + 1e-9).sort((a, b) => b - a)
  return cabem.length > 0 ? cabem[0] : null
}

/** Palavras que faltam para atingir o mínimo (nunca negativo). */
export function missingWords(currentSpeech: number, targetSeconds: number): number {
  return Math.max(0, Math.ceil((minimumSpeech(targetSeconds) - currentSpeech) * WORDS_PER_SECOND))
}

// ─── PRESERVAÇÃO DO AUTOR (D3) ─────────────────────────────────────────────
//
// A regra do Contrato C1 protege A FALA. Bullet de produção, `Voice:` e
// `9:16` não são fala — são recado para o editor. Tratá-los como frase do
// autor foi o que reprovou 3 de 3 roteiros vindos do ChatGPT.

/**
 * Normalização à prova de Unicode: NFC, minúsculas, remove cues em colchetes,
 * descarta pontuação/símbolos de QUALQUER alfabeto e colapsa espaço.
 * `\p{L}\p{N}\p{M}` mantém acento, cirílico, grego, hebraico, CJK, devanágari.
 */
export function normalizeForCompare(texto: string): string {
  return texto
    .normalize('NFC')
    .toLowerCase()
    .replace(/\[[^\]]*\]/gu, ' ')
    .replace(/[^\p{L}\p{N}\p{M}\s]/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim()
}

/**
 * Frases da fala do autor, na ordem.
 * ⚠️ SEM filtro de tamanho mínimo. O filtro `>= 5 palavras` que existia deixava
 * "Ninguém acreditou." passar sem verificação — o modelo podia reescrever a
 * frase mais curta e mais importante do roteiro e ninguém via.
 * Corta em fim de frase ocidental e também em 。！？ (CJK).
 */
export function authorSentences(narracao: string): string[] {
  return narracao
    .split(/(?<=[.!?…。！？])\s+|\n+/u)
    .map((f) => normalizeForCompare(f))
    .filter((f) => f.length > 0)
}

/**
 * Toda frase da fala original sobreviveu, na ORDEM, dentro da fala expandida?
 *
 * ⚠️ KINEO-351 — ESTA FUNÇÃO ESTAVA ERRADA E EU NÃO TINHA TESTADO O CASO ÓBVIO.
 *
 * A versão do #350 procurava a frase normalizada com `indexOf` dentro do corpo
 * inteiro, sem fronteira nenhuma. Resultado, reproduzido com o código que
 * estava em produção:
 *
 *     "He ran."      →  "She ran."                  ACEITAVA  ("she ran" contém "he ran")
 *     "He ran."      →  "He ran fast."              ACEITAVA
 *     "The cat sat." →  "The cat sat down quietly." ACEITAVA
 *
 * Ou seja: a promessa de preservar a fala do autor — que é o Contrato C1
 * inteiro — não valia para frase curta nem para troca de sujeito. Os 54 testes
 * do #350 passaram porque eu testei alfabeto, acento e ordem, e não testei
 * colisão de substring. Teste escrito para confirmar o que eu queria ver.
 *
 * A correção: comparar FRASE COM FRASE. Cada frase do autor precisa aparecer
 * como uma frase INTEIRA da expansão (igualdade após normalizar), e na ordem —
 * o cursor só anda para frente, porque reordenar narração muda a história.
 * Pontuação não conta (a normalização a remove), então "He ran." → "He ran!"
 * continua sendo a mesma frase; mas mudar, cortar ou emendar palavra, não.
 */
export function authorPreserved(
  narracaoOriginal: string,
  narracaoExpandida: string,
): { ok: boolean; missing: string[] } {
  const frases = authorSentences(narracaoOriginal)
  const candidatas = authorSentences(narracaoExpandida)
  const perdidas: string[] = []
  let cursor = 0
  for (const frase of frases) {
    const em = candidatas.indexOf(frase, cursor)
    if (em < 0) {
      perdidas.push(frase)
      continue
    }
    cursor = em + 1
  }
  return { ok: perdidas.length === 0, missing: perdidas }
}

/** Prefixos de linha que são recado de produção, nunca fala. */
const DIRETIVA = /^\s*(voice|music|format|speed|duration|aspect|resolution|platform|style|tone|language)\s*:/iu

/** Marcadores estruturais do roteiro da casa. */
const MARCADOR = /^\s*(HOOK|MICRO REWARD|ESCALATION|RHYTHM|PAYOFF|TITLE|DESCRIPTION|HASHTAGS)\b/u

/**
 * Linhas de DIRETIVA DE PRODUÇÃO do texto cru (`Voice:`, `Music:`, `Format:`…),
 * preservadas separadamente da fala.
 *
 * ⚠️ KINEO-351 — o #350 metia os MARCADORES (HOOK, PAYOFF…) na mesma lista, e
 * como esta lista alimenta a restauração, um HOOK perdido voltaria colado em
 * qualquer lugar. Marcador tem POSIÇÃO na história: ver `structuralMarkers` e
 * `lostMarkers`, que o chamador trata como falha, não como remendo.
 */
export function directiveLines(bruto: string): string[] {
  return bruto
    .split(/\n/u)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && DIRETIVA.test(l) && !MARCADOR.test(l))
}

/** Só os marcadores estruturais (HOOK, PAYOFF…), que têm POSIÇÃO na história. */
export function structuralMarkers(bruto: string): string[] {
  return bruto
    .split(/\n/u)
    .map((l) => l.trim())
    .filter((l) => MARCADOR.test(l))
}

/**
 * Diretivas do original que sumiram do candidato.
 * Não reprova a expansão (não é fala): serve para o chamador devolver as
 * linhas do próprio autor ao texto, em vez de inventar substitutas.
 */
export function lostDirectives(bruto: string, candidato: string): string[] {
  const alvo = normalizeForCompare(candidato)
  return directiveLines(bruto).filter((l) => {
    const n = normalizeForCompare(l)
    return n.length > 0 && !alvo.includes(n)
  })
}

/** Marcadores estruturais do original que sumiram do candidato. */
export function lostMarkers(bruto: string, candidato: string): string[] {
  const alvo = normalizeForCompare(candidato)
  return structuralMarkers(bruto).filter((l) => {
    const n = normalizeForCompare(l)
    return n.length > 0 && !alvo.includes(n)
  })
}

/**
 * Devolve ao candidato as DIRETIVAS DE PRODUÇÃO perdidas — na posição em que
 * o autor as escreveu, não empilhadas no fim do arquivo.
 *
 * ⚠️ KINEO-351 — o #350 fazia `candidato + '\n\n' + perdidas.join('\n')`. Para
 * `Voice:`/`Music:` isso é quase inofensivo; para um HOOK ou um PAYOFF seria
 * destruir a estrutura do roteiro fingindo consertá-la. Por isso MARCADOR
 * ESTRUTURAL NÃO É RESTAURADO AQUI: perder um HOOK significa que o modelo
 * quebrou o formato, e isso o chamador trata como falha, não como remendo.
 *
 * A âncora é a linha do autor imediatamente ANTERIOR à diretiva que ainda
 * exista no candidato; a diretiva volta logo depois dela. Sem âncora (a
 * diretiva abria o texto), volta ao topo.
 */
export function restoreDirectives(bruto: string, candidato: string): string {
  const perdidas = lostDirectives(bruto, candidato)
  if (perdidas.length === 0) return candidato

  const linhasOriginais = bruto.split(/\n/u).map((l) => l.trim())
  const linhasCandidato = candidato.split(/\n/u)
  const indiceNormalizado = linhasCandidato.map((l) => normalizeForCompare(l))

  for (const diretiva of perdidas) {
    const posOriginal = linhasOriginais.findIndex((l) => l === diretiva)
    // Procura, subindo a partir da diretiva, a última linha do autor que
    // sobreviveu no candidato: é ela que dá o lugar de volta.
    let destino = -1
    for (let i = posOriginal - 1; i >= 0 && destino < 0; i--) {
      const ancora = normalizeForCompare(linhasOriginais[i])
      if (!ancora) continue
      const em = indiceNormalizado.findIndex((l) => l === ancora)
      if (em >= 0) destino = em
    }
    const em = destino >= 0 ? destino + 1 : 0
    linhasCandidato.splice(em, 0, diretiva)
    indiceNormalizado.splice(em, 0, normalizeForCompare(diretiva))
  }
  return linhasCandidato.join('\n')
}

// ─── CONTABILIDADE DE RODADAS ──────────────────────────────────────────────

/**
 * Identidade da tentativa: base imutável + duração.
 * Trocar a duração ou a base é OUTRA tentativa e merece rodadas novas; insistir
 * no mesmo par não. FNV-1a, determinístico e sem dependência.
 */
export function attemptKey(baseScript: string, targetSeconds: number): string {
  const s = `${baseScript.trim()}::${targetSeconds}`
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h.toString(16).padStart(8, '0')
}

/** Teto de chamadas por (base, duração). */
export const MAX_ROUNDS = 2

/** Falhas que NÃO devem consumir rodada: não foi a pessoa nem o texto que erraram. */
export function isTransientStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500
}

/** Uma segunda rodada só se vale a pena: preservou o autor, cresceu e chegou perto. */
export function deservesSecondRound(args: {
  outcome: ExpandOutcome
  round: number
  grew: boolean
  coverageAfter: number
}): boolean {
  if (args.round >= MAX_ROUNDS) return false
  if (args.outcome !== 'still_short') return false
  if (!args.grew) return false
  return args.coverageAfter >= 0.75 && args.coverageAfter < MIN_COVERAGE
}

/** Reexporta a régua canônica para quem só importa esta política. */
export { MIN_COVERAGE, WORDS_PER_SECOND, speechSeconds }
