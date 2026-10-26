// PEDIDO-FIEL-2610 — pure preflight, before any writer, claim or provider work.
import { looksLikeBrief } from './scriptParser'
import { readPastedDirectives } from './pastedDirectives'

export const REQUEST_FIDELITY_VERSION = 'pedido_fiel_20261026_v1'
export function isInstructionBrief(prompt: string): boolean {
  return looksLikeBrief(prompt.replace(/\[faceless\]|\[camera:[^\]]*\]/gi, ' ').trim())
}

/** Called only after the existing refund function has reported its real outcome. */
export function sceneDescriptionReviewMessage(language: unknown, refunded: boolean): string {
  const locale = typeof language === 'string' ? language.toLowerCase().split(/[-_]/)[0] : 'en'
  if (locale === 'pt') return `Não conseguimos confirmar uma imagem fiel para todas as cenas. Nenhuma cena de vídeo foi enviada. ${refunded ? 'Os créditos foram devolvidos. Revise as descrições das cenas antes de continuar.' : 'A devolução automática dos créditos ainda está sendo confirmada.'}`
  if (locale === 'es') return `No pudimos confirmar una imagen fiel para todas las escenas. No se ha enviado ninguna escena de vídeo. ${refunded ? 'Los créditos fueron devueltos. Revisa las descripciones de las escenas antes de continuar.' : 'La devolución automática de créditos aún se está confirmando.'}`
  return `We could not confirm a faithful image for every scene. No video scenes were submitted. ${refunded ? 'Your credits were returned. Review the scene descriptions before continuing.' : 'Your automatic credit refund is still being confirmed.'}`
}

type ReviewReason = 'brief_requires_review' | 'request_duration_mismatch'
export type RequestFidelityReview = {
  error: string
  reason: ReviewReason
  code: ReviewReason
  charged: false
  retryable: false
  review_required: true
  requested_seconds?: number
  selected_seconds?: number
}

function copy(reason: ReviewReason, language: unknown, asked?: number, selected?: number): string {
  const locale = typeof language === 'string' ? language.toLowerCase().split(/[-_]/)[0] : 'en'
  if (reason === 'brief_requires_review') {
    if (locale === 'pt') return 'Este texto parece um pedido de vídeo, não a fala pronta. Para manter suas palavras, cole apenas a narração; para desenvolver a ideia, escolha o modo de estruturação por IA. Revise antes de continuar. Nada foi cobrado.'
    if (locale === 'es') return 'Este texto parece una solicitud de vídeo, no una narración lista. Para conservar tus palabras, pega solo la narración; para desarrollar la idea, elige el modo de estructuración con IA. Revisa antes de continuar. No se ha cobrado nada.'
    return 'This looks like a video request, not a finished narration. To keep your words, paste only the narration; to develop the idea, choose the AI structuring mode. Review before continuing. Nothing was charged.'
  }
  if (locale === 'pt') return `Seu pedido menciona ${asked} segundos, mas a duração selecionada é ${selected} segundos. Revise a duração ou ajuste o pedido para o filme mais curto antes de continuar. Nada foi cobrado.`
  if (locale === 'es') return `Tu solicitud menciona ${asked} segundos, pero la duración seleccionada es de ${selected} segundos. Revisa la duración o ajusta la solicitud para el vídeo más corto antes de continuar. No se ha cobrado nada.`
  return `Your request asks for ${asked} seconds, but the selected duration is ${selected} seconds. Review the duration or change the request to match the shorter film before continuing. Nothing was charged.`
}

export function briefRequiresReview(language?: unknown): RequestFidelityReview {
  const reason = 'brief_requires_review'
  return { error: copy(reason, language), reason, code: reason, charged: false, retryable: false, review_required: true }
}

/** Never rewrites text or changes the selected mode/duration. Explicit speech is untouched. */
export function reviewRequestFidelity(input: { prompt: string; scriptMode?: unknown; duration?: unknown; language?: unknown }): RequestFidelityReview | null {
  if (!isInstructionBrief(input.prompt)) return null
  const mode = typeof input.scriptMode === 'string' ? input.scriptMode.toLowerCase() : ''
  if (mode !== 'ai') {
    return briefRequiresReview(input.language)
  }
  const requested = readPastedDirectives(input.prompt).directives.find(d => d.kind === 'duration')?.askedSeconds
  const selected = Number(input.duration)
  if (requested && Number.isFinite(selected) && selected > 0 && selected < requested) {
    const reason = 'request_duration_mismatch'
    return { error: copy(reason, input.language, requested, selected), reason, code: reason, charged: false, retryable: false, review_required: true, requested_seconds: requested, selected_seconds: selected }
  }
  return null
}
