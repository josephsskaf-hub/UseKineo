// KINEO-FEEDBACK-DO-FILME-2026-09-16 — o 👍/👎 da pessoa no e-mail de entrega.
//
// Fundador (16/09 noite): "sempre estar comunicando o cliente, mandando e-mail para ver se tem um feedback
// deles… à medida que a gente cresce." O e-mail "Your Short is ready" já vai para TODO render pronto — é o
// ponto de maior alegria e o único momento em que 100% das pessoas leem a casa. Uma pergunta de um clique
// ("o filme era o que você pediu?") vira a RÉGUA HUMANA que fica ao lado da nota do juiz (lib/fastCoherence):
// quando as duas discordam, é o juiz que aprende; quando concordam num 👎, é o produto que conserta.
//
// Mecânica: link assinado (o mesmo HMAC dos links de partilha, lib/videoShareLink) → GET /api/film-feedback
// grava `film_feedback` {verdict} com session_id = video_id e devolve uma página mínima que agradece e
// oferece uma caixa de texto opcional (POST → `film_feedback` {comment}). Sem segredo no ambiente, o link
// não existe e o e-mail sai como saía. Nunca dá crédito, nunca promete nada.

import { mintShareToken, verifyShareToken } from '@/lib/videoShareLink'

export const FILM_FEEDBACK_EVENT = 'film_feedback'
/** o fundador apertou "pedir feedback" no quadro: e-mail enviado para a pessoa (metadata.asked = true) */
export const FILM_FEEDBACK_ASKED_EVENT = 'film_feedback_asked'
export type FilmFeedbackVerdict = 'up' | 'down'

export function feedbackHref(videoId: string, verdict: FilmFeedbackVerdict, base: string, source: string): string | null {
  const id = (videoId ?? '').trim()
  if (!id) return null
  const token = mintShareToken(id)
  if (!token) return null
  const q = new URLSearchParams({ v: id, r: verdict, t: token, s: source.slice(0, 40) })
  return `${base.replace(/\/$/, '')}/api/film-feedback?${q.toString()}`
}

export function verifyFeedbackLink(videoId: string | null | undefined, token: string | null | undefined): boolean {
  if (!videoId) return false
  return verifyShareToken(videoId, token)
}

/** A linha da pergunta, nos dois temas dos e-mails de entrega. `null` => '' (sem segredo, e-mail intacto). */
export function feedbackRowHtml(videoId: string | null | undefined, base: string, source: string, theme: 'dark' | 'light'): string {
  if (!videoId) return ''
  const up = feedbackHref(videoId, 'up', base, source)
  const down = feedbackHref(videoId, 'down', base, source)
  if (!up || !down) return ''
  const text = theme === 'dark' ? '#94a3b8' : '#475569'
  const border = theme === 'dark' ? '#26262a' : '#e6e8ec'
  const btn = theme === 'dark' ? 'background:#26262a;color:#fff;' : 'background:#f1f5f9;color:#111;'
  return `<p style="color:${text};font-size:13px;margin:16px 0 0;border-top:1px solid ${border};padding-top:14px;">Did this film match what you asked for? &nbsp;<a href="${up}" style="display:inline-block;${btn}text-decoration:none;padding:6px 12px;border-radius:8px;font-weight:700;">👍 Yes</a>&nbsp; <a href="${down}" style="display:inline-block;${btn}text-decoration:none;padding:6px 12px;border-radius:8px;font-weight:700;">👎 Not really</a></p>`
}

export function feedbackRowText(videoId: string | null | undefined, base: string, source: string): string {
  if (!videoId) return ''
  const up = feedbackHref(videoId, 'up', base, source)
  const down = feedbackHref(videoId, 'down', base, source)
  if (!up || !down) return ''
  return `\nDid this film match what you asked for?\n  Yes: ${up}\n  Not really: ${down}\n`
}
