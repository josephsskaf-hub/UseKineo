// KINEO-FLUXO2-F-0411 [fundador 04/11: "recomendações"] — a frase do card UGC. "tells why to buy" dizia que a pessoa de IA fala; o cliente recebe narração por cima (AdsV2Escolha força 'narrated').
// Arquivo próprio porque lib/ui/homeThreeCards.ts é travado byte a byte pelas camadas dos guardiões. Traduções em lib/ui/refinementCopy.json. Guardião: scripts/test-fluxo2-0411.mjs.
import { HOME_CARD_COPY, type HomeCardId } from '@/lib/ui/homeThreeCards'

export const HOME_CARD_LINHA_UGC = 'An AI person shows your product while a voiceover tells why to buy.'

/** A frase de cada card, em inglês (a chave da tradução). */
export function homeCardLinha(card: HomeCardId): string {
  return card === 'ugc_ads' ? HOME_CARD_LINHA_UGC : HOME_CARD_COPY[card].line
}
