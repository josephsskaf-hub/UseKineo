// KINEO-AUTOPILOT-FORA-2026-10-09 — o Autopilot sai da vitrine (fundador, 09/10: "o autopilot a gente pode tirar por
// enquanto… deixar só esse plano business"). Hoje há 0 perfis com plan autopilot.
//
// UM interruptor para a família inteira que se VENDE como Autopilot: o mensal de US$ 299 ('autopilot'), o semanal de
// US$ 59 ('autopilot_lite') e o piloto avulso de US$ 99 ('autopilot_pilot'). Com false:
//   · nenhuma superfície pública oferece Autopilot (/pricing, cartões do /generate, paywall pós-vídeo, banner de
//     retomada do piloto, estudo de caso, fatos para o ChatGPT/llms.txt/MCP, recuperação de checkout);
//   · o checkout RECUSA compra NOVA (?tier=autopilot | autopilot_lite, ?pack=autopilot_pilot) com 'plan_unavailable',
//     exceto conta interna (lista exata da casa);
//   · NADA do backend muda: webhook (mapeamento de tier, renovação), MRR, crons do robô, rota de agenda e a tela
//     /autopilot de quem já tem direito continuam funcionando — um assinante existente segue atendido.
// Voltar = trocar para true (as superfícies reaparecem como estavam).
//
// Módulo PURO (sem import): entra em componente 'use client', página de servidor e rota.
export const AUTOPILOT_PUBLIC = false

/** Tiers/SKUs de checkout que este interruptor fecha para compra nova. */
export const AUTOPILOT_FAMILY_SKUS: readonly string[] = ['autopilot', 'autopilot_lite', 'autopilot_pilot']

export function isAutopilotFamilySku(sku: string | null | undefined): boolean {
  return typeof sku === 'string' && AUTOPILOT_FAMILY_SKUS.includes(sku.trim().toLowerCase())
}

/** Pode abrir um checkout NOVO deste SKU? Com o interruptor desligado, só a casa (canário/operação). */
export function autopilotCheckoutOpen(sku: string | null | undefined, isInternal: boolean): boolean {
  if (!isAutopilotFamilySku(sku)) return true
  return AUTOPILOT_PUBLIC || isInternal
}

/** A frase da recusa (mesma em todo caminho do checkout). */
export const AUTOPILOT_UNAVAILABLE_MESSAGE =
  'Autopilot is not open to new customers right now. See the current plans — nothing was charged.'
export const AUTOPILOT_UNAVAILABLE_REASON = 'plan_unavailable'
