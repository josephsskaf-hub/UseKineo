// KINEO-ATORES-IA-2026-10-13 — DESFAZ a biblioteca de apresentadores no núcleo do /plan (lib/ads/v2PlanCore.ts), para os
// guardiões que conferem o /plan BYTE A BYTE contra uma base antiga (test-shopify-app-1310 M, test-ads-ux-marca 6a). Módulo
// auxiliar; não é teste (o nome não começa com test-).
//
// O que a biblioteca mudou no /plan, e é EXATAMENTE isto que se desfaz:
//   · a chamada do ator ganhou o id escolhido: `planAdsV2Presenter({ sector, photos, seedKey: order.id, presenterId: … })`;
//   · 2 linhas novas, cada uma marcada com KINEO-ATORES-IA-2026-10-13: o evento ads_presenter_selected e o presenter_id na
//     resposta (só quando houve escolha).
// Qualquer outra diferença (preço, crédito, trava) continua mudando a impressão digital.
export const ATORES_IA_TAG = 'KINEO-ATORES-IA-2026-10-13'
export const ATORES_IA_CALL_NEW = 'planAdsV2Presenter({ sector, photos, seedKey: order.id, presenterId: input.presenter_id ?? null })'
export const ATORES_IA_CALL_OLD = 'planAdsV2Presenter({ sector, photos, seedKey: order.id })'

export function desfazAtoresIa(s) {
  const text = String(s).replace(/\r\n/g, '\n')
  if (!text.includes(ATORES_IA_CALL_NEW)) return text
  return text
    .split('\n')
    .filter((l) => !l.includes(ATORES_IA_TAG))
    .join('\n')
    .split(ATORES_IA_CALL_NEW)
    .join(ATORES_IA_CALL_OLD)
}
