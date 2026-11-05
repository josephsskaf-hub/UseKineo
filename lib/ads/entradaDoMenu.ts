// KINEO-MENU-ADS-NOVA-TELA-0411 [fundador 05/11: "quando eu clico no Product Ads, ele pega a versão do layout antigo, tem que corrigir isso"]
// O menu (barra lateral, celular, topo, /ads, /library) leva a /ads/new, que redireciona a /ads/v2 só com os utm_*. A tela nova
// (lib/ads/v2Nota9.ts adsNota9Focus) só liga com ?entry=product|ugc, então quem chegava pelo menu ficava no cabeçalho antigo, "Studio Ads",
// e a conta da casa ainda via as abas One ad, Batch e Production.
// Regra: sem entrada e sem parâmetro que peça outra coisa, a tela abre no formato produto. "AI UGC Ads" continua em ?entry=ugc.
// Link antigo com parâmetro explícito segue exatamente como era: quem tem esses endereços salvos cai no mesmo lugar.
// Vale só para quem já tem conta: o visitante continua pela lista exata de lib/growth/visitanteEscreveAntes.ts, que recebe a entrada crua.
// Puro: sem env, sem rede. Guardião: scripts/test-cartoon-tela-0411.mjs.
import type { AdsSampleEntry } from '@/lib/ads/sampleEntry'

/** Parâmetros que pedem uma tela específica de /ads/v2: lote, construtor completo, pedido, grupo de variações, Black Friday, teste da amostra. */
export const PARAMETROS_DE_TELA_EXPLICITA = ['mode', 'order', 'group', 'upgrade', 'bf_template', 'bf_lang', 'sample_probe'] as const

/** A entrada que a tela usa: a pedida, se houver; 'product' quando o endereço não pede nada; null quando pede uma tela específica. */
export function entradaDaTela(pedida: AdsSampleEntry | null, parametros?: Record<string, string | string[] | undefined>): AdsSampleEntry | null {
  if (pedida) return pedida
  return PARAMETROS_DE_TELA_EXPLICITA.some((chave) => parametros?.[chave] !== undefined) ? null : 'product'
}
