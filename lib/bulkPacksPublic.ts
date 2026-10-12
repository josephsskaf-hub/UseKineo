// KINEO-PAGINAS-QUE-VENDEM-2026-10-12 — os pacotes avulsos de agência (BULK_PACKS: 10/20/30/50 filmes Kineo 1, US$ 19–75
// uma vez) saem da vitrine (fundador 12/10, "tudo sim"). Motivo: o pacote é vendido em filmes Kineo 1, motor que saiu da
// entrada em 29/09, e a faixa "Buy 10–50 Fast Shorts once" aparecia nas páginas que o ChatGPT cita — vendendo um motor que a
// conta nova não vê. O lugar dela passa a ser o Business (US$ 84/mês, ~12 anúncios de produto de 15 s, /business).
//
// UM interruptor, mesmo desenho do Autopilot (lib/autopilotPublic.ts). Com false:
//   · nenhuma vitrine oferece o pacote (AgencyVolumeBridge vira a faixa do Business; /ai-shorts-for-agencies redireciona
//     para /business; /llms.txt e /api/facts deixam de listar os pacotes);
//   · o checkout RECUSA compra NOVA (?pack=bulk10|bulk20|bulk30|bulk50) com 410 'pack_unavailable', antes de qualquer
//     sessão Stripe — exceto conta interna (lista exata da casa);
//   · NADA do backend muda: webhook (Path A, metadata.pack bulk*), o crédito já concedido e o acesso legado ao Kineo 1 de
//     quem comprou (lib/kineo1Access.ts boughtPack) seguem intactos — quem já pagou continua atendido.
// Voltar = trocar para true (as superfícies reaparecem como estavam).
//
// Módulo PURO (sem import): entra em componente 'use client', página de servidor e rota.
export const BULK_PACKS_PUBLIC = false

/** SKUs do checkout que este interruptor fecha para compra nova (espelho de BULK_PACK_IDS em lib/checkoutPricing.ts). */
export const BULK_PACK_SKUS: readonly string[] = ['bulk10', 'bulk20', 'bulk30', 'bulk50']

export function isBulkPackSku(sku: string | null | undefined): boolean {
  return typeof sku === 'string' && BULK_PACK_SKUS.includes(sku.trim().toLowerCase())
}

/** Pode abrir um checkout NOVO deste SKU? Com o interruptor desligado, só a casa. */
export function bulkPackCheckoutOpen(sku: string | null | undefined, isInternal: boolean): boolean {
  if (!isBulkPackSku(sku)) return true
  return BULK_PACKS_PUBLIC || isInternal
}

/** A frase da recusa (mesma em todo caminho do checkout). */
export const BULK_PACK_UNAVAILABLE_MESSAGE =
  'One-time agency packs are no longer sold. For business video, see the Business plan — nothing was charged.'
export const BULK_PACK_UNAVAILABLE_REASON = 'pack_unavailable'
/** Para onde a recusa e a vitrine mandam quem procurava volume de empresa. */
export const BULK_PACK_REPLACEMENT_PATH = '/business'
