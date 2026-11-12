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
// REGRA DO DONO (11/11): "só com coisas muito top" — só entra anúncio que o dono APROVOU COM O OLHO, com a data em
// `aprovadoPeloDono` (obrigatório; o guardião reprova item sem ela). Pilotos reprovados (Dewly, Keel) e a apresentadora
// Jade não entram em vitrine nenhuma.
// TODOS foram feitos À MÃO pela casa, fora da ferramenta de Ads: os 6 de Natal (10/11, foto do Nano Banana Pro + Kling 4.0)
// e os 3 falados (11/11, foto-chave do Nano Banana Pro + Seedance 2.0 com fala nativa, no playground do fornecedor). A seção
// não diz que o Studio Ads os fez nem "em um clique" — só mostra e convida. Produtos e marcas são fictícios (Halo, Veil, Orra).
//
// Home e /made-with-kineo (desenho, não feito aqui): lib/clipesNos2Lugares.ts pode ler ESTA lista em vez de repetir — cada
// cartão de lá aponta para os MESMOS arquivos de public/ads-exemplos/ (preview/poster), e o filtro "na home" é um campo a mais
// aqui (ex.: `vitrines: ['ads', 'home', 'made-with-kineo']`). Nenhum arquivo duplicado.

export interface AdsExemplo {
  /** Nome dos arquivos em public/ads-exemplos/ (sem extensão). Único. */
  key: string
  /** Título curto do anúncio, em inglês (a página é em inglês). */
  title: string
  /** O formato em palavras do cliente. Nunca motor, preço ou nome interno. */
  format: string
  /** Duração do anúncio inteiro, em segundos. */
  seconds: number
  /** Dia em que o DONO aprovou este anúncio com o olho (AAAA-MM-DD). Sem esta data, o anúncio não entra. */
  aprovadoPeloDono: string
  preview: string
  poster: string
  full: string
}

const exemplo = (key: string, title: string, format: string, seconds: number, aprovadoPeloDono: string): AdsExemplo => ({
  key,
  title,
  format,
  seconds,
  aprovadoPeloDono,
  preview: `/ads-exemplos/${key}.mp4`,
  poster: `/ads-exemplos/${key}.webp`,
  full: `/ads-exemplos/${key}-completo.mp4`,
})

/** Os anúncios da vitrine, na ordem da página. Um anúncio novo = uma linha (com a data da aprovação do dono). */
export const ADS_EXEMPLOS: readonly AdsExemplo[] = [
  // 11/11 — os 3 falados ("Gostei muito do vídeo Halo… esse tipo de ads é o que vão mais usar"; Amara e Rahul: "Os 2 entram")
  exemplo('halo-car-selfie', 'Halo cup, filmed in the car', 'UGC · car selfie', 12, '2026-11-11'),
  exemplo('veil-grwm', 'Veil sunscreen, get ready with me', 'UGC · get ready with me', 10, '2026-11-11'),
  exemplo('orra-street-interview', 'Orra earbuds, asked on the street', 'UGC · street interview', 10, '2026-11-11'),
  // 10/11 — os 6 de Natal ("Pode colocar todos na página inicial como anúncios")
  exemplo('skincare-ugc', 'Skincare gift review', 'UGC review', 15, '2026-11-10'),
  exemplo('relogio', 'The gift watch', 'Product showcase', 12, '2026-11-10'),
  exemplo('sueter-pet', 'Christmas dog sweater', 'UGC selfie', 15, '2026-11-10'),
  exemplo('manta', 'The warmest gift', 'Unboxing', 15, '2026-11-10'),
  exemplo('colar', 'Gold necklace gift', 'Product showcase', 12, '2026-11-10'),
  exemplo('caneca', 'Hot chocolate mug', 'Lifestyle', 12, '2026-11-10'),
]

/** Interruptor da seção (false = a /ads de antes, sem a seção). */
export const ADS_EXEMPLOS_LIVE = true as boolean
export const ADS_EXEMPLO_OPENED_EVENT = 'ads_example_opened'
