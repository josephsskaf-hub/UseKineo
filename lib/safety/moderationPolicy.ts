// KINEO-MODERACAO-2026-09-25 — a REGRA de bloqueio (pura, sem import): recebe o resultado do omni-moderation e diz se barra.
//
// POR QUÊ: em 25/09 a sessão Research achou pedidos graves envolvendo menores gerados e guardados em /images por 2 contas
// (52749de6, 03/09; b9f49852, 17/09 — suspensas em 25/09 com o ok do fundador, arquivos preservados como prova). Só schnell
// e dev passavam enable_safety_checker ao fal, e um dos pedidos passou mesmo assim pelo dev: o filtro do fornecedor não
// basta. Este módulo é a régua única de /images, /animate, do upload do /footage (que também alimenta o Studio Ads) e do
// brief do /api/ads.
//
// A REGRA (estreita de propósito — a casa faz filme de história, guerra e mistério; violência NÃO entra aqui):
//  1. qualquer sinal de sexual/minors a partir de MINORS_SCORE barra (o limiar é baixo de propósito);
//  2. conteúdo sexual marcado pelo modelo, ou com nota a partir de SEXUAL_SCORE, barra (a Kineo não é plataforma adulta,
//     e schnell/dev já recusavam NSFW pelo checker do fal);
//  3. TEXTO que cita criança/adolescente/idade menor E tem qualquer nota sexual a partir de MINOR_TERM_SEXUAL_SCORE barra
//     e conta como menor — o reforço para o pedido que o modelo nota baixo por vir disfarçado.

export const MINORS_SCORE = 0.02
export const SEXUAL_SCORE = 0.5
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

// Termos de criança/adolescente/idade menor em inglês, português, espanhol, francês, alemão e italiano; e "N anos" de 1 a 17.
const MINOR_TERMS = new RegExp(
  [
    'child', 'children', 'kid', 'kids', 'minor', 'minors', 'underage', 'under-age', 'teen', 'teens', 'teenage', 'teenager',
    'teenagers', 'preteen', 'preteens', 'pre-teen', 'tween', 'tweens', 'toddler', 'toddlers', 'infant', 'infants', 'schoolgirl',
    'schoolgirls', 'schoolboy', 'schoolboys', 'school girl', 'school boy', 'loli',
    'lolita', 'shota', 'little girl', 'little boy', 'young girl', 'young boy', 'jailbait', 'crianca', 'criancas', 'menina',
    'meninas', 'menino', 'meninos', 'adolescente', 'adolescentes', 'infantil', 'novinha', 'novinhas', 'ninas', 'ninos',
    'menor de edad', 'menores', 'nenas', 'colegiala', 'enfant', 'enfants', 'fillette', 'gamine',
    'madchen', 'kinder', 'bambina', 'bambino', 'bambini', 'ragazzina',
  ].map((t) => t.replace(/ /g, '[\\s_-]+')).join('|'),
  'i',
)
const MINOR_AGE = /(?:^|[^0-9])(?:[1-9]|1[0-7])[\s-]*(?:yo|y[/.]?o|yrs?|years?[\s-]*old|anos|anitos|ans|jahre|anni)(?:[^a-z]|$)/i

/** Tira acento e passa para minúsculas, para "criança"/"niña"/"Mädchen" casarem com os termos sem acento. */
export function foldText(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

export function mentionsMinor(text: string | null | undefined): boolean {
  if (!text) return false
  const folded = foldText(text)
  // Palavra inteira ("kid" não casa dentro de "kidney"). O termo sozinho não barra nada: só junto de nota sexual.
  const words = new RegExp(`(?:^|[^a-z])(?:${MINOR_TERMS.source})(?:[^a-z]|$)`, 'i')
  return words.test(folded) || MINOR_AGE.test(folded)
}

export function decideModeration(result: ModerationResultLike | null | undefined, text?: string | null): ModerationDecision {
  const cats = result?.categories ?? {}
  const scores = result?.category_scores ?? {}
  const sexualMinorsScore = Number(scores['sexual/minors'] ?? 0) || 0
  const sexualScore = Number(scores['sexual'] ?? 0) || 0
  const reasons: string[] = []
  let minors = false
  if (cats['sexual/minors'] === true || sexualMinorsScore >= MINORS_SCORE) { reasons.push('sexual/minors'); minors = true }
  if (cats['sexual'] === true || sexualScore >= SEXUAL_SCORE) reasons.push('sexual')
  if (mentionsMinor(text) && sexualScore >= MINOR_TERM_SEXUAL_SCORE) {
    reasons.push('minor_term')
    minors = true
  }
  return { block: reasons.length > 0, minors, reasons, sexualMinorsScore, sexualScore }
}

/** Frase que a pessoa lê quando o pedido é barrado. Não explica a regra (não ensina a contornar). */
export const MODERATION_BLOCKED_MESSAGE = 'This request cannot be created on Kineo. Nothing was charged.'
export const MODERATION_UNAVAILABLE_MESSAGE = 'Our safety check is temporarily unavailable. Nothing was charged — please try again in a minute.'
export const MODERATION_UPLOAD_BLOCKED_MESSAGE = 'This file cannot be used on Kineo.'
export const MODERATION_UPLOAD_UNAVAILABLE_MESSAGE = 'We could not check this file right now. Try the upload again in a minute.'
