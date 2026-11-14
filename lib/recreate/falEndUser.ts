// KINEO-SEEDANCE-END-USER-1311 [dono 13/11: "não é mais fácil fazer com que funciona?"; CEO 13/11] — o end_user_id que os termos de acesso do
// Seedance 2.5 na fal EXIGEM em todo pedido ("You will pass an end_user_id in your API payload that uniquely identifies each end customer…
// It is fine for this value to be an anonymous identifier", fal.ai/models/bytedance/seedance-2.5). Os pedidos recusados de 13/11 (nossa
// chave de API, sem o campo) vieram com partner_validation_failed + model_moderated; os do playground (login) passaram.
// Valor: anônimo e estável por conta — sha256 de um prefixo fixo + user.id, 32 hex. Nunca o e-mail, nunca o UUID cru.
// Entra SÓ no envio (o embrulho de deps.submit), FORA da impressão do pedido: a trava "não trocou" (swapRowContext), o som original
// (somOriginalDaLinha) e a idempotência leem a impressão, que fica igual. Guardião: scripts/test-recreate-seu-video-1311.mjs (seção U).
import { createHash } from 'node:crypto'
import { SEEDANCE25_MODEL } from './seuVideo'

export const FAL_END_USER_PREFIXO = 'kineo-fal-end-user-v1:'

/** O identificador anônimo e estável da conta para a fal (32 hex). Vazio = null (nunca manda um id inventado). */
export function falEndUserId(userId: string | null | undefined): string | null {
  const id = typeof userId === 'string' ? userId.trim() : ''
  return id ? createHash('sha256').update(FAL_END_USER_PREFIXO + id).digest('hex').slice(0, 32) : null
}

type Submit<R> = (model: string, input: Record<string, unknown>) => Promise<R>
/** Embrulha o envio: todo pedido ao Seedance 2.5 sai com end_user_id; outros modelos, byte a byte como antes. */
export function comEndUserDaFal<R>(submit: Submit<R>, userId: string | null | undefined): Submit<R> {
  const endUser = falEndUserId(userId)
  return (model, input) => submit(model, model === SEEDANCE25_MODEL && endUser ? { ...input, end_user_id: endUser } : input)
}
