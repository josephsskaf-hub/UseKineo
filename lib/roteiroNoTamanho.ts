// [TRAVA 8.2 — aval permanente do fundador 01/11 (laço do revisor)] KINEO-ROTEIRO-NO-TAMANHO-0111 — o roteiro da ideia solta
// nasce no tamanho do filme; encurtar o filme vira último recurso, não o caminho comum.
//
// Caso real (revisor, 01/11 ~22:41 BRT): Rick (gapozweb, cliente anual) pediu 60 s com ideia solta ("Roland Pernicus Oznard …
// declares war on his new smart fridge — funny and absurd"). Log da Vercel do /api/generate-script, request 2xbn7-1793583660712:
//   01:41:01 "KINEO-REGUA-DO-ESCRITOR engine=fast family=classic voice=fable rate=2.81 target=60s → min 169 words"
//   01:41:04 "regenerating once — the script is only 82 spoken words — it needs at least 169 …"
//   01:41:07 "still imperfect after retry — using it anyway (degraded). words=89/169"
// Depois, na rota do cinematic, duration_followed_script {from 60, to 35, missing_words_before 63} e 14 cr de volta: o filme
// saiu com metade da duração pedida. Nos 14 dias até aqui, 16 de 17 roteiros de 60 s do escritor nasceram abaixo do piso
// (script_written fits=false; seedance 7/8, h3 5/5, veo 1/1, cinematic_ai 2/2, fast 1/1).
//
// CAUSA (o prompt, não o modelo nem os tokens): o SYSTEM_PROMPT do escritor dá a cada um dos 7 blocos um tamanho de UMA
// frase ("HOOK … 12 words max", "ESCALATION: One sentence", "RHYTHM … 1-3 words each", cada MICRO REWARD = "um fato"). Somado,
// isso dá ~80-90 palavras — exatamente o que saiu, duas vezes. O piso de palavras aparece só como um número total no meio de
// regras por bloco, e o modelo segue as regras por bloco. A 2ª tentativa repetia "precisa de 169" mas mandava reescrever com
// as MESMAS regras de bloco, e o resultado foi 82 → 89. max_tokens (700) não era o limite: 89 palavras ≈ 200 tokens.
//
// CONSERTO (puro, sem rede; a rota injeta):
//   1. planoDePalavras — o piso vira ORÇAMENTO POR BLOCO (HOOK e RHYTHM continuam curtos; os 3 MICRO REWARD, a ESCALATION e
//      o PAYOFF recebem o resto), mirando ~10 % acima do piso e nunca acima do teto ("passar do alvo é bom; ficar abaixo é
//      defeito"). instrucaoDoPlano entra no prompt do escritor no filme de 35/60 s (nunca no curto, nunca a 90 s, nunca no roteiro
//      colado: ali o piso é o texto da pessoa, e ela não ganha enchimento).
//   2. pedidoDeTamanho — a 2ª tentativa (a que JÁ existia, "regenerating once") passa a levar a contagem por bloco do que
//      saiu e o orçamento de cada um: "MICRO REWARD 1 tem 11 de 34 palavras — expanda com frases da MESMA história".
//   3. escolherVersao — se as duas versões ficaram curtas, fica a mais longa (antes a 2ª substituía sempre, mesmo menor),
//      sem trocar estrutura completa por estrutura quebrada.
//   4. Só se a 2ª também ficar curta, a rota do cinematic segue com o último recurso de sempre (duration_followed_script, que
//      encurta e estorna); o script_written registra length_retry e still_short_after_retry para medir quantas vezes isso
//      ainda acontece.
//
// REVISÃO (laço do revisor, 01/11):
//   a. SEM TETO POR MOTOR NO ESCRITOR (2ª revisão): a 1ª revisão limitou o plano do Kineo 1 a 90 s (214/226) lendo
//      engine:'fast' — mas o GenerateClient manda 'fast' também para filmes que vão ao cinematic/Seedance (o caso do Rick; 5 de
//      5 script_written com engine 'fast' em 30 dias foram para o cinematic). A 90 s isso devolvia o Seedance à amputação
//      90 → 60 s (storyteller exige 225, futuristic-ai 227, energetic-facts 241). Saiu: o plano vale para todos os motores
//      (169/186 a 60 s).
//   a2. (4ª revisão, substitui a 3ª) SÓ ATÉ 60 s (planoValeNoFilme). A 90 s o plano fazia o roteiro passar de 90 s de fala e a
//      montagem (lib/compose.ts, clamp a 90) cortava o final; na rota do Kineo 1 o alvo de 278 ainda passava do teto de
//      103,5 s em duas vozes. A 90 s o escritor volta EXATAMENTE à base: sem plano, sem pedido de tamanho, sem escolha entre
//      versões (a 2ª substitui, como sempre) e com o timeout de sempre na 2ª chamada. A mudança da 3ª revisão na rota fast
//      (roteiro da IA longo vira tema) saiu junto: só existia para o caso de 90 s. A 60 s o pior caso é 89 s de fala.
//   b. escolherVersao respeita o KINEO-NARRADOR-DESCRICAO-0111: a versão que NÃO lê a descrição de cena vence a que lê —
//      antes do critério de tamanho.
//   c. prazoDaNovaTentativa: a 2ª chamada só sai se couber no maxDuration de 60 s, com o timeout encolhido ao que sobrou.
//   d. o resgate da recusa (KINEO-MOTOR-15S-1510, 700 tokens) NÃO leva o plano (a rota injeta o plano só nas chamadas do
//      escritor normal); o script_written diz por que não houve nova tentativa por tamanho (length_retry_skipped).
import { narrationWordCount } from '@/lib/textLanguage'
import { PRAZO_DA_ROTA_DO_ESCRITOR_MS, FOLGA_DA_ROTA_DO_ESCRITOR_MS } from '@/lib/cinematic/finalResposta'

export const ROTEIRO_NO_TAMANHO_VERSAO = 'roteiro_no_tamanho_0111' as const

/** O filme mais longo em que o plano de tamanho, a nova tentativa por tamanho e o piso valem (4ª revisão: 90 s fica na base). */
export const ROTEIRO_NO_TAMANHO_ATE_SEGUNDOS = 60

/** true = o escritor usa o plano de tamanho; false (acima de 60 s) = o escritor da base, intocado. */
export function planoValeNoFilme(alvoSegundos: number): boolean {
  return Number.isFinite(alvoSegundos) && alvoSegundos <= ROTEIRO_NO_TAMANHO_ATE_SEGUNDOS
}

export type SecaoDoRoteiro = 'HOOK' | 'MICRO REWARD 1' | 'MICRO REWARD 2' | 'MICRO REWARD 3' | 'ESCALATION' | 'RHYTHM' | 'PAYOFF'
export const SECOES_DO_ROTEIRO: readonly SecaoDoRoteiro[] = ['HOOK', 'MICRO REWARD 1', 'MICRO REWARD 2', 'MICRO REWARD 3', 'ESCALATION', 'RHYTHM', 'PAYOFF']

/** Os blocos curtos por natureza: o gancho (≤ 12 palavras) e o acelerador (2-3 socos de 1-3 palavras). */
const HOOK_PALAVRAS = 12
const RHYTHM_PALAVRAS = 5
/** O resto do orçamento, por peso: os 3 fatos e o payoff carregam a história; a escalada é a ponte. */
const PESOS: ReadonlyArray<[SecaoDoRoteiro, number]> = [['MICRO REWARD 1', 22], ['MICRO REWARD 2', 22], ['MICRO REWARD 3', 22], ['ESCALATION', 12], ['PAYOFF', 22]]
/** Quanto acima do piso o plano mira: o modelo erra para baixo; mirar no piso exato devolve roteiro abaixo dele. */
export const FOLGA_DO_PLANO = 1.1

export interface PlanoDePalavras {
  /** O total que o plano pede (≥ piso, ≤ teto quando o teto é maior que o piso). */
  alvo: number
  /** O piso do plano: o da régua do escritor. */
  piso: number
  secoes: Array<{ secao: SecaoDoRoteiro; palavras: number }>
}

/** O piso de palavras vira um orçamento por bloco que soma exatamente o alvo. null quando não há piso utilizável. */
export function planoDePalavras(pisoDaRegua: number, teto: number): PlanoDePalavras | null {
  if (!Number.isFinite(pisoDaRegua) || pisoDaRegua < HOOK_PALAVRAS + RHYTHM_PALAVRAS + 20) return null
  const piso = Math.ceil(pisoDaRegua)
  const tetoUtil = Number.isFinite(teto) && teto > piso ? teto : Number.POSITIVE_INFINITY
  const alvo = Math.max(piso, Math.min(Math.round(pisoDaRegua * FOLGA_DO_PLANO), Math.floor(tetoUtil)))
  const resto = alvo - HOOK_PALAVRAS - RHYTHM_PALAVRAS
  const somaPesos = PESOS.reduce((s, [, p]) => s + p, 0)
  const meio = PESOS.map(([secao, p]) => ({ secao, palavras: Math.round((resto * p) / somaPesos) }))
  const ajuste = resto - meio.reduce((s, x) => s + x.palavras, 0)
  meio[meio.length - 1].palavras += ajuste // o PAYOFF absorve o arredondamento
  const porSecao = new Map<SecaoDoRoteiro, number>([['HOOK', HOOK_PALAVRAS], ['RHYTHM', RHYTHM_PALAVRAS], ...meio.map((x) => [x.secao, x.palavras] as [SecaoDoRoteiro, number])])
  return { alvo, piso, secoes: SECOES_DO_ROTEIRO.map((secao) => ({ secao, palavras: porSecao.get(secao) ?? 0 })) }
}

const frasesPara = (palavras: number): string => (palavras >= 30 ? '3-4 full sentences' : palavras >= 18 ? '2-3 full sentences' : '1-2 sentences')

/** O bloco do prompt do escritor: o orçamento por bloco, que vence o "uma frase" das regras gerais num filme longo. */
export function instrucaoDoPlano(plano: PlanoDePalavras, alvoSegundos: number): string {
  const linhas = plano.secoes.map(({ secao, palavras }) =>
    secao === 'HOOK' ? `- HOOK: about ${palavras} words (one punchy line — stays short)`
      : secao === 'RHYTHM' ? `- RHYTHM: about ${palavras} words (2-3 ultra-short punches — stays short)`
        : `- ${secao}: about ${palavras} words (${frasesPara(palavras)} that tell this beat of the story with concrete detail: who, where, what happened, what it looked like, what it meant)`)
  return [
    `LENGTH PLAN — THIS ${alvoSegundos}-SECOND FILM NEEDS ABOUT ${plano.alvo} SPOKEN WORDS, NEVER FEWER THAN ${plano.piso} (${ROTEIRO_NO_TAMANHO_VERSAO}):`,
    'The film ends when the narration ends: a short script does not make a shorter film, it makes an interrupted story. Word budget per section (spoken words only — headers and [Pexels: ...] cues do not count):',
    ...linhas,
    'These budgets OVERRIDE any "one sentence" / "one fact" wording above for a film this long: only the HOOK and the RHYTHM stay short. Develop each MICRO REWARD, the ESCALATION and the PAYOFF with more sentences from the SAME story or subject — never filler, never repeated sentences, never invented facts about real people. Before answering, count the words of each section against its budget.',
  ].join('\n')
}

const CABECALHO = /^\s*(HOOK|MICRO REWARD ?(\d)?|ESCALATION|RHYTHM|PAYOFF)\b\s*(\([^)]*\))?\s*:?/i

/** Palavras faladas por bloco do roteiro marcado (cabeçalhos e [pistas] fora), na mesma contagem do escritor. */
export function palavrasPorSecao(roteiro: string, language?: unknown): Array<{ secao: string; palavras: number }> {
  const blocos: Array<{ secao: string; texto: string[] }> = []
  let mrSemNumero = 0
  for (const linha of String(roteiro ?? '').split(/\r?\n/)) {
    const m = linha.match(CABECALHO)
    if (m) {
      const nome = m[1].toUpperCase().replace(/\s+/g, ' ')
      const secao = nome.startsWith('MICRO REWARD') ? `MICRO REWARD ${m[2] ?? String(++mrSemNumero)}` : nome
      blocos.push({ secao, texto: [linha.slice(m[0].length)] })
    } else if (blocos.length > 0) {
      blocos[blocos.length - 1].texto.push(linha)
    }
  }
  return blocos.map(({ secao, texto }) => ({ secao, palavras: narrationWordCount(texto.join(' ').replace(/\[[^\]]*\]/g, ' ').trim(), language) }))
}

/** O pedido de tamanho da 2ª tentativa: quanto saiu, quanto falta, bloco a bloco. */
export function pedidoDeTamanho(args: { roteiro: string; palavras: number; plano: PlanoDePalavras; alvoSegundos: number; language?: unknown }): string {
  const { roteiro, palavras, plano, alvoSegundos, language } = args
  const feitas = new Map(palavrasPorSecao(roteiro, language).map((x) => [x.secao, x.palavras]))
  const contas = plano.secoes.map(({ secao, palavras: meta }) => `${secao} ${feitas.get(secao) ?? 0}/${meta}`).join(', ')
  return [
    `LENGTH IS THE MAIN PROBLEM: your script has ${palavras} spoken words and this ${alvoSegundos}-second film needs at least ${plano.piso} (aim for about ${plano.alvo}).`,
    `Words you wrote per section vs. the budget: ${contas}.`,
    'Rewrite the FULL script: the SAME story, the SAME facts and characters, the SAME headers in the same order — and expand every section that is under its budget with additional concrete sentences that continue that beat (setting, action, detail, consequence). Do not add new sections, do not pad with filler or repeat sentences, do not invent facts about real people. Count the words of each section before answering.',
  ].join(' ')
}

export interface VersaoDoRoteiro {
  palavras: number
  /** blocos obrigatórios faltando + payoff vazio + fim fraco (contados pela rota) */
  problemas: number
  /** KINEO-NARRADOR-DESCRICAO-0111 — a versão lê em voz alta a descrição de cena que a pessoa escreveu */
  leDescricao?: boolean
}

/**
 * Qual versão fica depois da 2ª tentativa. Regra da casa até aqui: a 2ª sempre substituía a 1ª. Muda em dois casos, nesta
 * ordem: (1) só uma das duas lê a descrição de cena em voz alta → fica a que NÃO lê (KINEO-NARRADOR-DESCRICAO-0111, o mesmo
 * critério do filme curto); (2) as duas abaixo do piso, a 2ª mais curta e sem estrutura melhor → fica a 1ª ("ficar abaixo é
 * defeito"; menos ainda é pior).
 */
export function escolherVersao(args: { piso: number; primeira: VersaoDoRoteiro; segunda: VersaoDoRoteiro }): 'primeira' | 'segunda' {
  const { piso, primeira, segunda } = args
  if (!!primeira.leDescricao !== !!segunda.leDescricao) return primeira.leDescricao ? 'segunda' : 'primeira'
  const duasCurtas = primeira.palavras < piso && segunda.palavras < piso
  if (duasCurtas && segunda.palavras < primeira.palavras && segunda.problemas >= primeira.problemas) return 'primeira'
  return 'segunda'
}

/** Tokens de saída para o roteiro longo: o alvo com folga para cabeçalhos, pistas e línguas de muitos tokens por palavra. */
export function tetoDeTokens(plano: PlanoDePalavras | null, base: number): number {
  if (!plano) return base
  return Math.max(base, Math.min(2000, Math.round(plano.alvo * 4)))
}

/** Menor prazo que ainda vale gastar numa 2ª chamada de roteiro inteiro (gpt-4o, centenas de tokens). */
export const MENOR_PRAZO_DA_NOVA_TENTATIVA_MS = 10_000

/**
 * O timeout da 2ª chamada do escritor para o tempo já gasto na rota: o menor entre o de sempre e o que ainda cabe no
 * maxDuration de 60 s (com a folga de gravar e responder). null = não cabe uma chamada útil — fica a 1ª versão.
 */
export function prazoDaNovaTentativa(decorridoMs: number, timeoutMs: number): number | null {
  const sobra = PRAZO_DA_ROTA_DO_ESCRITOR_MS - FOLGA_DA_ROTA_DO_ESCRITOR_MS - Math.max(0, decorridoMs)
  const prazo = Math.min(timeoutMs, sobra)
  if (!Number.isFinite(prazo) || prazo < MENOR_PRAZO_DA_NOVA_TENTATIVA_MS) return null
  return Math.floor(prazo)
}
