// KINEO-CARDS-TRAILER-0411 [fundador 04/11: "Perfeito, já pode colocar nos cards já"] — o card de Filmes e o de Cartoon mostram só o trailer aprovado.
// Arquivo próprio porque lib/ui/homeThreeCards.ts é travado byte a byte pelas camadas dos guardiões: as listas antigas continuam lá e seguem servindo Produto, UGC e as páginas de UGC.
// Prévias derivadas dos mestres docs/benchmark/cards-novos-0411/film-trailer-v2.mp4 e cartoon-trailer-v4.mp4: 600x800, sem áudio, faststart, dentro do limite de 1,5 MB das prévias de card.
// Guardião: scripts/test-cards-trailer-0411.mjs.
import type { HomeCardClip, HomeCardPlaylist, HomeCycleCardId } from '@/lib/ui/homeThreeCards'

const trailer = (name: string): HomeCardClip => ({ src: `/previews/${name}.mp4`, poster: `/posters/${name}.webp`, objectPosition: '50% 0%', mobileObjectPosition: '50% 0%' })

/** KINEO-CARDS-TRAILER-4-0411 — fundador 05/11: "gera os clipes novos agora... vai subir": os 4 cards com trailer. Um clipe só: o tocador liga o laço nativo (lib/ui/homeCardPlayback.ts). */
export const HOME_CARD_TRAILERS_0411: Partial<Record<HomeCycleCardId, HomeCardPlaylist>> = {
  films: [trailer('home-card-trailer-film')],
  kids_cartoon: [trailer('home-card-trailer-cartoon')],
  product_ads: [trailer('home-card-trailer-product')],
  ugc_ads: [trailer('home-card-trailer-ugc')],
}

/** KINEO-HOME-CARD-MENOR-0411 — fundador 05/11: os 4 cards 10% mais baixos no computador, para a fileira de baixo não ficar cortada. Fora de lib/ui/homeKidsCard.ts, que é travado. */
export const HOME_CARD_MENOR_CSS = `@media (min-width:761px){.k3c-grid[data-k3c-cols="4"] .k3c-card{aspect-ratio:5/6}}`
