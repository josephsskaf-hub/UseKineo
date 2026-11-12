// KINEO-ADS-EXEMPLOS-1111 — [CEO 11/11, pedido do dono: "coloca na nossa página de ads"] a lista da seção "Ads made with Kineo"
// da /ads. O anúncio PRONTO vem primeiro (é o que os líderes mostram); os estilos soltos vêm depois.
//
// Um anúncio novo = UMA linha em ADS_EXEMPLOS, com os 3 arquivos em public/ads-exemplos/:
//   <key>.webp          capa ≤ 30 KB, 432×768 (9:16) — a única coisa que baixa na abertura
//   <key>.mp4           prévia muda de 6–8 s, 432×768 (ou 360×640), ≤ 400 KB, +faststart — monta só perto da tela, sem som
//   <key>-completo.mp4  o anúncio inteiro COM som, 540×960 — só baixa no clique, no player
// O guardião (scripts/test-ads-exemplos-1111.mjs) confere os 3 arquivos, os tamanhos e as regras do cartão de cada linha.
//
// Regras do cartão (fundador/CEO): sem nome de motor, sem preço; o formato nas palavras do cliente ("UGC review",
// "Unboxing", "Product showcase"…), nunca o nome interno. Nada toca com som sozinho.
//
// Os 6 de Natal (aprovados pelo dono em 10/11; mesmos de lib/clipesNos2Lugares.ts) foram feitos À MÃO pela casa, fora da
// ferramenta de Ads (foto do Nano Banana Pro + Kling 4.0): a seção não diz que o Studio Ads os fez — só mostra e convida.

export interface AdsExemplo {
  /** Nome dos arquivos em public/ads-exemplos/ (sem extensão). Único. */
  key: string
  /** Título curto do anúncio, em inglês (a página é em inglês). */
  title: string
  /** O formato em palavras do cliente. Nunca motor, preço ou nome interno. */
  format: string
  /** Duração do anúncio inteiro, em segundos. */
  seconds: number
  preview: string
  poster: string
  full: string
}

const exemplo = (key: string, title: string, format: string, seconds: number): AdsExemplo => ({
  key,
  title,
  format,
  seconds,
  preview: `/ads-exemplos/${key}.mp4`,
  poster: `/ads-exemplos/${key}.webp`,
  full: `/ads-exemplos/${key}-completo.mp4`,
})

/** Os anúncios da vitrine, na ordem da página. Um anúncio novo = uma linha. */
export const ADS_EXEMPLOS: readonly AdsExemplo[] = [
  exemplo('skincare-ugc', 'Skincare gift review', 'UGC review', 15),
  exemplo('relogio', 'The gift watch', 'Product showcase', 12),
  exemplo('sueter-pet', 'Christmas dog sweater', 'UGC selfie', 15),
  exemplo('manta', 'The warmest gift', 'Unboxing', 15),
  exemplo('colar', 'Gold necklace gift', 'Product showcase', 12),
  exemplo('caneca', 'Hot chocolate mug', 'Lifestyle', 12),
]

/** Interruptor da seção (false = a /ads de antes, sem a seção). */
export const ADS_EXEMPLOS_LIVE = true as boolean
export const ADS_EXEMPLO_OPENED_EVENT = 'ads_example_opened'
