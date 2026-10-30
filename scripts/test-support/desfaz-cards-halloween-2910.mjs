// KINEO-CARDS-HALLOWEEN-2910 — DESFAZ, em memória, esta entrega (cards 1 e 2 da home: a porta de Marte volta e abre o card 1; o tênis
// flutuando sai do card 2) em lib/ui/homeThreeCards.ts, para os guardiões que conferem o arquivo contra uma camada anterior
// (ex.: scripts/test-cards-rosto-2810.mjs). Diff REVERSO exato: o bloco de AGORA aparece UMA vez e volta a ser o de ANTES.
// Camadas mais novas do mesmo arquivo saem ANTES desta.
export const MARCA = 'KINEO-CARDS-HALLOWEEN-2910'
const DESFAZ = {"lib/ui/homeThreeCards.ts":[{"before":"  films: { default: [\n    // Preserve the original top-anchored crop: the burned-in bottom caption stays outside the card.\n    { ...preview('home-card-film-flannan', '50% 0%'), scale: 1.1 },\n    preview('home-card-novo-film_pompeii', '50% 30%'), // KINEO-CARDS-NOVOS-2610 — os 2 filmes de antes tinham a marca \"usekineo.com/free\" gravada (fundador 26/10: \"tá com erro esse vídeo\")\n    preview('home-card-novo-film_shipwreck', '50% 45%'), // KINEO-CARDS-NOVOS-2610\n    preview('galeria/werewolf', '50% 40%'), // KINEO-CARDS-ROSTO-2810 — fundador 27/10: o lobisomem sob a lua cheia (clipe Kling 3 da galeria \"Made with Kineo\") no lugar da porta em Marte\n  ] },\n  product_ads: { default: [ // KINEO-CARDS-NOVOS-2610 — fundador 26/10: \"quero coisas novas… o que as pessoas estão postando\" (tendências: floating ads, gigante na cidade, splash, vista explodida, partículas da Higgsfield)\n    preview('home-card-novo-smartwatch', '50% 45%'), // KINEO-CARDS-ROSTO-2810 — fundador 27/10: o perfume gigante SAI; entra o relógio que se monta no ar (clipe Kling 3 50cd72c7, sem marca)\n    preview('home-card-novo-iced_coffee', '50% 45%'), // KINEO-CARDS-NOVOS-2610\n    preview('home-card-novo-headphones', '50% 45%'), // KINEO-CARDS-NOVOS-2610\n    preview('home-card-novo-floating_sneaker2', '50% 45%'), // KINEO-CARDS-NOVOS-2610 — tênis liso, sem listras nem marca (o 1º saiu com as 3 listras de outra marca)","now":"  films: { default: [\n    preview('home-card-novo-film_mars_door', '50% 45%'), // KINEO-CARDS-HALLOWEEN-2910 — fundador 29/10: \"eu gostava da porta de Marte, parecia ter bastante efeito no card 1, vamos voltar\" (abre o card)\n    // Preserve the original top-anchored crop: the burned-in bottom caption stays outside the card.\n    { ...preview('home-card-film-flannan', '50% 0%'), scale: 1.1 },\n    preview('home-card-novo-film_pompeii', '50% 30%'), // KINEO-CARDS-NOVOS-2610 — os 2 filmes de antes tinham a marca \"usekineo.com/free\" gravada (fundador 26/10: \"tá com erro esse vídeo\")\n    preview('galeria/werewolf', '50% 40%'), // KINEO-CARDS-ROSTO-2810 — fundador 27/10: o lobisomem sob a lua cheia (clipe Kling 3 da galeria \"Made with Kineo\") no lugar da porta em Marte\n  ] },\n  product_ads: { default: [ // KINEO-CARDS-NOVOS-2610 — fundador 26/10: \"quero coisas novas… o que as pessoas estão postando\" (tendências: floating ads, gigante na cidade, splash, vista explodida, partículas da Higgsfield)\n    preview('home-card-novo-smartwatch', '50% 45%'), // KINEO-CARDS-ROSTO-2810 — fundador 27/10: o perfume gigante SAI; entra o relógio que se monta no ar (clipe Kling 3 50cd72c7, sem marca)\n    preview('home-card-novo-iced_coffee', '50% 45%'), // KINEO-CARDS-NOVOS-2610\n    preview('home-card-novo-headphones', '50% 45%'), // KINEO-CARDS-NOVOS-2610\n    // KINEO-CARDS-HALLOWEEN-2910 — fundador 29/10: \"tira esse, não gosto desse ads\": o tênis flutuando saiu (o produto gigante NÃO entra: é o perfume gigante que ele tirou em 27/10)"}]}
export const ARQUIVOS = Object.keys(DESFAZ)
export function semCardsHalloween2910(text, rel) {
  if (typeof text !== 'string') return text
  const hunks = DESFAZ[String(rel ?? '').replace(/\\/g, '/').replace(/^\.\//, '')]
  if (!hunks || !text.includes(MARCA)) return text
  const crlf = text.includes('\r\n')
  let s = '\n' + text.replace(/\r\n/g, '\n') + '\n'
  for (const h of hunks) {
    const parts = s.split('\n' + h.now + '\n')
    if (parts.length !== 2) throw new Error('semCardsHalloween2910: ' + rel + ' mudou fora da camada (' + (parts.length - 1) + 'x)')
    s = parts.join('\n' + h.before + '\n')
  }
  s = s.slice(1, -1)
  if (s.includes(MARCA)) throw new Error('semCardsHalloween2910: sobrou linha marcada em ' + rel)
  return crlf ? s.replace(/\n/g, '\r\n') : s
}
