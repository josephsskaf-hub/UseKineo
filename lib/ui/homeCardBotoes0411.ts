// KINEO-BOTOES-SEM-FREE-0411 [fundador 04/11: "Get started" no geral; cards "Make my ad", "Make my UGC ad", "Make my cartoon"] — o nome dos botões dos cards de anúncio.
// Só o nome muda: o link, o evento e a amostra grátis seguem iguais. KINEO-PRIMEIRA-TELA-0511: o rótulo curto vale com ou sem a amostra aberta, o mesmo que os trailers dos cards mostram.
// Arquivo próprio porque lib/ui/homeThreeCards.ts é travado byte a byte pelas camadas dos guardiões. Guardião: scripts/test-frente-0411.mjs.
import type { HomeCardId } from '@/lib/ui/homeThreeCards'

/** [produto, UGC] nas 16 línguas da interface. */
export const HOME_CARD_BOTOES_0411: Record<string, readonly [string, string]> = {
  en: ['Make my ad', 'Make my UGC ad'],
  pt: ['Fazer meu anúncio', 'Fazer meu anúncio UGC'],
  es: ['Hacer mi anuncio', 'Hacer mi anuncio UGC'],
  fr: ['Créer ma pub', 'Créer ma pub UGC'],
  de: ['Meine Anzeige erstellen', 'Meine UGC-Anzeige erstellen'],
  it: ['Crea il mio annuncio', 'Crea il mio annuncio UGC'],
  nl: ['Maak mijn advertentie', 'Maak mijn UGC-advertentie'],
  pl: ['Zrób moją reklamę', 'Zrób moją reklamę UGC'],
  tr: ['Reklamımı yap', 'UGC reklamımı yap'],
  ru: ['Сделать мою рекламу', 'Сделать мою UGC-рекламу'],
  uk: ['Зробити мою рекламу', 'Зробити мою UGC-рекламу'],
  ar: ['اصنع إعلاني', 'اصنع إعلان UGC الخاص بي'],
  ur: ['میرا اشتہار بنائیں', 'میرا UGC اشتہار بنائیں'],
  hi: ['मेरा विज्ञापन बनाएँ', 'मेरा UGC विज्ञापन बनाएँ'],
  id: ['Buat iklanku', 'Buat iklan UGC-ku'],
  vi: ['Tạo quảng cáo của tôi', 'Tạo quảng cáo UGC của tôi'],
}

/** O rótulo do botão do card de anúncio, sem a palavra "grátis". */
export function homeCardBotao(card: HomeCardId, language: string, _sampleLive?: boolean): string {
  const t = HOME_CARD_BOTOES_0411[language] ?? HOME_CARD_BOTOES_0411.en
  return card === 'ugc_ads' ? t[1] : t[0]
}
