// KINEO-ADS-ROTEIROS-2026-10-13 — DESFAZ os 2 a 3 roteiros no núcleo do /plan (lib/ads/v2PlanCore.ts), para os guardiões que
// conferem o /plan BYTE A BYTE contra uma base antiga (via desfazExtracao em shopify-extracao-v2-1310.mjs). Módulo auxiliar;
// não é teste (o nome não começa com test-).
//
// Os roteiros entraram no núcleo SÓ como linhas inteiras novas, cada uma com a marca KINEO-ADS-ROTEIROS-2026-10-13 (o import,
// o pedido das versões na extração, a contagem no evento, a montagem dos roteiros, a gravação no plano e os 2 campos da
// resposta). semRoteiros tira EXATAMENTE essas linhas; nenhuma linha antiga foi mudada. scripts/test-ads-roteiros-1310.mjs
// confere que as linhas marcadas são só as esperadas e que nenhuma mexe em crédito, preço ou débito.
export const MARCA_ROTEIROS = 'KINEO-ADS-ROTEIROS-2026-10-13'
export const semRoteiros = (s) => String(s).replace(/\r\n/g, '\n').split('\n').filter((l) => !l.includes(MARCA_ROTEIROS)).join('\n')
