// KINEO-MODERACAO-2026-09-25 — a REGRA de bloqueio (pura, sem import): recebe o resultado do omni-moderation e diz se barra.
//
// POR QUÊ: em 25/09 a sessão Research achou pedidos graves envolvendo menores gerados e guardados em /images por 2 contas
// (52749de6, 03/09; b9f49852, 17/09 — suspensas em 25/09 com o ok do fundador, arquivos preservados como prova). Só schnell
// e dev passavam enable_safety_checker ao fal, e um dos pedidos passou mesmo assim pelo dev: o filtro do fornecedor não
// basta. Este módulo é a régua única de toda porta de geração e de upload da casa.
//
// A REGRA (estreita de propósito — a casa faz filme de história, guerra e mistério; violência NÃO entra aqui):
//  1. qualquer sinal de sexual/minors a partir de MINORS_SCORE barra (o limiar é baixo de propósito). ATENÇÃO: no
//     omni-moderation essa categoria é SÓ DE TEXTO — foto não produz esse sinal;
//  2. conteúdo sexual marcado pelo modelo, ou com nota a partir de SEXUAL_SCORE (texto) / IMAGE_SEXUAL_SCORE (quando há
//     imagem no pedido), barra — a Kineo não é plataforma adulta. O limiar de imagem é mais baixo justamente porque a foto
//     não tem o sinal de menor (revisão adversarial de 25/09);
//  3. TEXTO que cita criança/adolescente/idade menor E tem nota sexual a partir de MINOR_TERM_SEXUAL_SCORE barra e conta
//     como menor — o reforço para o pedido que o modelo nota baixo por vir disfarçado.

export const MINORS_SCORE = 0.02
export const SEXUAL_SCORE = 0.5
// Calibrado em 25/09: 36 fotos legítimas (crianças em escola, praia, balé; fotos de padaria) deram nota sexual ≤ 0,001.
export const IMAGE_SEXUAL_SCORE = 0.3
// Calibrado em 25/09 com 14 textos legítimos (escola infantil, pediatria, praia em família, aniversário de 12 anos, time
// juvenil…): todos com nota sexual ≤ 0,001. "Mãe amamentando" e "modelo de biquíni" (adultos) dão ~0,065 — por isso o
// reforço por termo só dispara a partir de 0,1, e o limiar de sexual/minors (a categoria própria) fica em 0,02.
export const MINOR_TERM_SEXUAL_SCORE = 0.1

export interface ModerationResultLike {
  flagged?: boolean
  categories?: Record<string, boolean | undefined> | null
  category_scores?: Record<string, number | undefined> | null
}

export interface ModerationDecision {
  block: boolean
  /** Algum dos motivos envolve menor de idade (é o que decide o alerta ao fundador). */
  minors: boolean
  /** Categorias que decidiram, em ordem: sexual/minors, sexual, minor_term. */
  reasons: string[]
  sexualMinorsScore: number
  sexualScore: number
}

// Termos de criança/adolescente/menor em inglês, português, espanhol, francês, alemão, italiano e hindi em letras latinas,
// já sem acento (o texto é dobrado antes). Cada termo aceita sufixo de plural/flexão (s, es, e, en, n): "little girls",
// "colegialas", "Kindern". "baby" fica de fora de propósito (é apelido de adulto); "garota" também ("garota de programa").
const MINOR_TERM_LIST = [
  // en
  'child', 'kid', 'kiddie', 'minor', 'underage', 'under age', 'under-age', 'teen', 'teenage', 'teenaged', 'teenager', 'preteen',
  'pre-teen', 'tween', 'toddler', 'infant', 'schoolgirl', 'schoolboy', 'school girl', 'school boy', 'little girl', 'little boy',
  'young girl', 'young boy', 'adolescent', 'prepubescent', 'pubescent', 'stepdaughter', 'jailbait', 'loli', 'lolita', 'lolicon',
  'shota', 'shotacon',
  // pt
  'crianca', 'menina', 'menino', 'menininha', 'menininho', 'garotinha', 'garotinho', 'adolescente', 'infantil', 'novinha',
  'novinho', 'ninfeta', 'colegial', 'colegiais', 'enteada', 'menor de idade',
  // es
  'nina', 'nino', 'ninita', 'ninito', 'nena', 'colegiala', 'menor de edad', 'hijastra', 'chiquilla',
  // fr
  'enfant', 'fillette', 'petite fille', 'jeune fille', 'petit garcon', 'ado', 'mineur', 'mineure', 'gamin', 'gamine', 'ecoliere',
  'collegienne',
  // de
  'kind', 'kinder', 'kleinkind', 'madchen', 'maedchen', 'schulmadchen', 'minderjahrig', 'minderjaehrig',
  // it
  'bambina', 'bambino', 'bambini', 'bambine', 'bimba', 'bimbo', 'ragazzina', 'ragazzino', 'minorenne',
  // hi (latino)
  'bachcha', 'bachchi', 'bacchi', 'bachi', 'nabalig', 'chhoti ladki', 'choti ladki',
]
const MINOR_TERMS_SOURCE = MINOR_TERM_LIST.map((t) => `${t.replace(/[ -]/g, '[\\s_-]*')}(?:s|es|e|en|n)?`).join('|')

// Idade 1-17 em algarismo ou por extenso (en/pt/es), seguida de anos/years/ans/Jahre/anni/saal...: "12 year old", "15yo",
// "12 aninhos", "doze anos", "aged 12".
const AGE_NUMBER = [
  '[1-9]', '1[0-7]',
  'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen',
  'fifteen', 'sixteen', 'seventeen',
  'um', 'dois', 'tres', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze', 'treze', 'quatorze', 'catorze',
  'quinze', 'dezesseis', 'dezessete',
  'uno', 'dos', 'cuatro', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce', 'trece', 'catorce', 'dieciseis', 'diecisiete',
].join('|')
const AGE_UNIT = 'yo|y[/.]?o|yrs?|years?(?:[\\s-]*old)?|anos?|aninhos?|anitos?|ans?|jahre?|jahrig\\w*|anni|anno|saal|sal|varsh|baras'
const MINOR_AGE = new RegExp(`(?:^|[^0-9a-z])(?:${AGE_NUMBER})[\\s-]*(?:${AGE_UNIT})(?:[^a-z]|$)|aged[\\s-]*(?:[1-9]|1[0-7])(?:[^0-9]|$)`, 'i')
const MINOR_WORDS = new RegExp(`(?:^|[^a-z])(?:${MINOR_TERMS_SOURCE})(?:[^a-z]|$)`, 'i')

/** Tira caractere invisível e acento e passa para minúsculas, para "criança"/"niña"/"Mädchen" casarem com os termos. */
export function foldText(text: string): string {
  return text
    .replace(/[\u200B-\u200D\u2060\uFEFF\u00AD]/g, '')
    .normalize('NFKC')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

export function mentionsMinor(text: string | null | undefined): boolean {
  if (!text) return false
  const folded = foldText(text)
  // Palavra inteira ("kid" não casa dentro de "kidney"). O termo sozinho não barra nada: só junto de nota sexual.
  return MINOR_WORDS.test(folded) || MINOR_AGE.test(folded)
}

export function decideModeration(
  result: ModerationResultLike | null | undefined,
  text?: string | null,
  opts: { hasImage?: boolean } = {},
): ModerationDecision {
  const cats = result?.categories ?? {}
  const scores = result?.category_scores ?? {}
  const sexualMinorsScore = Number(scores['sexual/minors'] ?? 0) || 0
  const sexualScore = Number(scores['sexual'] ?? 0) || 0
  const sexualThreshold = opts.hasImage ? IMAGE_SEXUAL_SCORE : SEXUAL_SCORE
  const reasons: string[] = []
  let minors = false
  if (cats['sexual/minors'] === true || sexualMinorsScore >= MINORS_SCORE) { reasons.push('sexual/minors'); minors = true }
  if (cats['sexual'] === true || sexualScore >= sexualThreshold) reasons.push('sexual')
  if (mentionsMinor(text) && sexualScore >= MINOR_TERM_SEXUAL_SCORE) {
    reasons.push('minor_term')
    minors = true
  }
  return { block: reasons.length > 0, minors, reasons, sexualMinorsScore, sexualScore }
}

/** Frase que a pessoa lê quando o pedido é barrado. Não explica a regra (não ensina a contornar). */
export const MODERATION_BLOCKED_MESSAGE = 'This request cannot be created on Kineo. Nothing was charged.'
export const MODERATION_UNAVAILABLE_MESSAGE = 'Our safety check is temporarily unavailable. Nothing was charged — please try again in a minute.'
export const MODERATION_UNPROCESSABLE_MESSAGE = 'This image could not be checked. Use a JPG or PNG under 20 MB. Nothing was charged.'
export const MODERATION_UPLOAD_BLOCKED_MESSAGE = 'This file cannot be used on Kineo.'
export const MODERATION_UPLOAD_UNAVAILABLE_MESSAGE = 'We could not check this file right now. Try the upload again in a minute.'
export const MODERATION_UPLOAD_UNPROCESSABLE_MESSAGE = 'This file could not be checked. Use a JPG or PNG under 20 MB.'

/** A frase certa para cada desfecho que não passou — as rotas não escolhem texto à mão. */
export function moderationRefusalMessage(reason: 'blocked' | 'unavailable' | 'unprocessable', kind: 'request' | 'upload' = 'request'): string {
  if (kind === 'upload') {
    return reason === 'blocked' ? MODERATION_UPLOAD_BLOCKED_MESSAGE : reason === 'unprocessable' ? MODERATION_UPLOAD_UNPROCESSABLE_MESSAGE : MODERATION_UPLOAD_UNAVAILABLE_MESSAGE
  }
  return reason === 'blocked' ? MODERATION_BLOCKED_MESSAGE : reason === 'unprocessable' ? MODERATION_UNPROCESSABLE_MESSAGE : MODERATION_UNAVAILABLE_MESSAGE
}

/** HTTP de cada desfecho: 422 barrado ou sem como conferir (tentar de novo não ajuda); 503 fora do ar (ajuda). */
export function moderationRefusalStatus(reason: 'blocked' | 'unavailable' | 'unprocessable'): number {
  return reason === 'unavailable' ? 503 : 422
}
