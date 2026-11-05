// KINEO-CARDS-TRAILER-0411 [fundador 04/11: "Perfeito, já pode colocar nos cards já"] — o card de Filmes e o de Cartoon mostram só o trailer aprovado.
// Arquivo próprio porque lib/ui/homeThreeCards.ts é travado byte a byte pelas camadas dos guardiões: as listas antigas continuam lá e seguem servindo Produto, UGC e as páginas de UGC.
// Prévias derivadas dos mestres docs/benchmark/cards-novos-0411/film-trailer-v2.mp4 e cartoon-trailer-v4.mp4: 600x800, sem áudio, faststart, dentro do limite de 1,5 MB das prévias de card.
// Guardião: scripts/test-cards-trailer-0411.mjs.
import type { HomeCardClip, HomeCardPlaylist, HomeCycleCardId } from '@/lib/ui/homeThreeCards'

const trailer = (name: string): HomeCardClip => ({ src: `/previews/${name}.mp4`, poster: `/posters/${name}.webp`, objectPosition: '50% 0%', mobileObjectPosition: '50% 0%' })

/** Só os dois cards aprovados. Um clipe só: o tocador liga o laço nativo (lib/ui/homeCardPlayback.ts). */
export const HOME_CARD_TRAILERS_0411: Partial<Record<HomeCycleCardId, HomeCardPlaylist>> = {
  films: [trailer('home-card-trailer-film')],
  kids_cartoon: [trailer('home-card-trailer-cartoon')],
}
