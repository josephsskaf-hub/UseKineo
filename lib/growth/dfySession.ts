// KINEO-FLUXO-NOVO-2026-09-25 — o reconhecimento do pedido Empresas (Express/Pro) mora AQUI.
//
// POR QUÊ SAIU DO WEBHOOK. As três funções abaixo nasceram locais em app/api/stripe/webhook/route.ts
// (23-24/09). A página de briefing pós-pagamento (/business-video-ads/brief) precisa da MESMA regra
// para decidir "esta sessão da Stripe é um pedido Express/Pro pago?" — e o redirect da Stripe pode
// chegar ANTES do webhook, então a rota do briefing não pode perguntar ao banco, só à Stripe, com a
// regra do webhook. Duas cópias da regra divergem e a que ninguém audita passa a mentir (memória "a
// regra vive em vários arquivos"): o webhook e a rota do briefing importam daqui. Corpos movidos sem
// mudar uma linha; o comentário de POR QUÊ do reconhecimento continua no webhook, acima de recordDfyOrderPaid.
//
// Módulo puro: `import type` da Stripe (some na transpilação) e o módulo puro dfyOffer.
import type Stripe from 'stripe'
import { DFY_ACCEPTED_AMOUNTS_USD_MINOR, dfyPaymentLinkIds, dfyTierForLink, type DfyTier } from './dfyOffer'

// KINEO-EMPRESAS-DFY-PLINK-2026-09-24 — o id do Payment Link é a chave PRIMEIRA:
// a conta Stripe tem "Adaptive Pricing" ligado (relatório do Cowork, 23/09), então
// um comprador fora dos EUA pode pagar em moeda local (amount_total ≠ 10000,
// currency ≠ usd), e a metadata do link ainda não foi vista num evento real.
// `session.payment_link` chega sempre (string ou objeto expandido).
export function sessionPaymentLinkId(session: Pick<Stripe.Checkout.Session, 'payment_link'>): string | null {
  const link = session.payment_link
  if (typeof link === 'string') return link
  return link && typeof link === 'object' && typeof link.id === 'string' ? link.id : null
}

/** Degrau do pedido: metadata do link (Cowork) primeiro, id do link depois; null no legado de US$100. */
export function dfySessionTier(session: Pick<Stripe.Checkout.Session, 'metadata' | 'payment_link'>): DfyTier | null {
  const m = session.metadata?.tier
  if (m === 'express' || m === 'pro') return m
  return dfyTierForLink(sessionPaymentLinkId(session))
}

export function isDfyOrderSession(session: Stripe.Checkout.Session): boolean {
  // KINEO-EMPRESAS-DOIS-DEGRAUS-2026-09-24 — Express/Pro (e o link legado de US$100): o id do link é a chave primeira.
  if (dfyPaymentLinkIds().includes(sessionPaymentLinkId(session) ?? '')) return true
  if (session.metadata?.kind === 'dfy') return true
  // 3ª regra: valor exato, SÓ em sessão nascida de um Payment Link. Express 3500 e Pro 7500 são também os valores de
  // bulk20/bulk50 — mas toda sessão da casa carrega metadata.pack e NUNCA payment_link, então não há como confundir.
  return (
    sessionPaymentLinkId(session) !== null &&
    DFY_ACCEPTED_AMOUNTS_USD_MINOR.includes(session.amount_total ?? -1) &&
    (session.currency ?? '').toLowerCase() === 'usd' &&
    !(session.metadata?.pack ?? '').trim()
  )
}
