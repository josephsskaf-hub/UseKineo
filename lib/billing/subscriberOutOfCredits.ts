// KINEO-RECARGA-PAGANTE-0111 — PAGANTE SEM CRÉDITO RECEBE A OFERTA NA HORA, NO /studio (fundador 01/11: "vai tudo, avulso 2,90").
//
// O CASO: nikolmishukov (Creator, plano 'basic', assinatura Stripe ativa) fez 7 filmes em 3 dias e ficou com 1 crédito. Medido no
// banco em 01/11: depois do último filme (30/10 14:32 UTC) ela abriu o /studio QUATRO vezes (31/10 09:35, 09:42; 01/11 06:27,
// 06:29) e saiu sem apertar Gerar. Nenhum `subscriber_upgrade_shown` na conta dela, nunca.
//
// POR QUE O QUE JÁ EXISTE NÃO A ALCANÇOU: a troca de plano (POST /api/stripe/change-plan, KINEO-ASSINANTE-SOBE-2026-10-06) e a
// recarga (CreditsTopupModal) já moram na parede do /studio/create — mas essa parede só abre DEPOIS do clique em Gerar (que leva
// ao /studio/create). No /studio a pessoa via só o botão "Need N more credits" e o rótulo "not enough credits — you have 1" nos
// cards, sem nenhuma saída. Quem lê isso e não clica (o caso dela, 4 vezes) nunca vê a oferta.
//
// O CONSERTO: o mesmo SubscriberUpgradeNudge (troca pagando só a diferença + recarga) aparece NO /studio, logo acima do Gerar,
// quando o saldo não paga o filme escolhido. O componente já se cala para quem não é assinante Stripe (o servidor decide em
// GET /api/stripe/change-plan); esta regra só evita pedir esse estado para quem tem saldo ou não pagou.
//
// O E-MAIL "CRÉDITO ACABOU" (cap_hit) NÃO É PARA ASSINANTE: /api/cron/send-cap-hit está agendado (vercel.json, 15,45 * * * *) e
// vivo, mas fala do muro GRÁTIS (free users) e pula planos pagos de propósito. Não existe e-mail de recarga para assinante; este
// conserto é na tela, que é onde ela voltou sozinha.
export const SUBSCRIBER_OUT_OF_CREDITS_VERSION = 'subscriber_out_of_credits_v1_0111'
export const SUBSCRIBER_OUT_OF_CREDITS_SHOWN_EVENT = 'subscriber_out_of_credits_offer_shown'
export const SUBSCRIBER_OUT_OF_CREDITS_CLICKED_EVENT = 'subscriber_out_of_credits_offer_clicked'
/** A superfície nova (o cockpit do /studio, antes do clique). */
export const SUBSCRIBER_OUT_OF_CREDITS_STUDIO_SURFACE = 'studio_cockpit_short'

/**
 * Decisão PURA: o /studio pinta o empurrão do assinante? Só quando a conta comprovadamente pagou (has_paid lido do servidor),
 * o saldo já chegou, o pedido é um filme (o clipe tem a parede própria, studio_clip_402) com custo real e o saldo não o paga.
 * `null` em qualquer leitura = não decide (não pinta) — nunca oferecer recarga a quem ainda não sabemos se tem saldo.
 */
export function subscriberOutOfCreditsVisible(input: {
  paid: boolean | null | undefined
  balance: number | null | undefined
  cost: number | null | undefined
  mode: string | null | undefined
}): boolean {
  if (input.paid !== true) return false
  if (input.mode === 'clip') return false
  const balance = typeof input.balance === 'number' && Number.isFinite(input.balance) ? input.balance : null
  const cost = typeof input.cost === 'number' && Number.isFinite(input.cost) ? input.cost : null
  if (balance === null || cost === null || cost <= 0) return false
  return balance < cost
}
