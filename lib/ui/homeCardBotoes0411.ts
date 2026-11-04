// KINEO-BOTOES-SEM-FREE-0411 [fundador 04/11: "Get started" no geral; cards "Make my ad", "Make my UGC ad", "Make my cartoon"] — o nome dos botões dos cards de anúncio.
// Só o nome muda: o link, o evento e a amostra grátis seguem iguais. Com a amostra aberta para a pessoa, o rótulo curto novo; sem ela, os rótulos de plano de sempre (HOME_CARD_ADS_CTA).
// Arquivo próprio porque lib/ui/homeThreeCards.ts é travado byte a byte pelas camadas dos guardiões. Guardião: scripts/test-frente-0411.mjs.
import { HOME_CARD_ADS_CTA, type HomeCardId } from '@/lib/ui/homeThreeCards'

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
export function homeCardBotao(card: HomeCardId, language: string, sampleLive: boolean): string {
  const ugc = card === 'ugc_ads'
  if (sampleLive) { const t = HOME_CARD_BOTOES_0411[language] ?? HOME_CARD_BOTOES_0411.en; return ugc ? t[1] : t[0] }
  const t = HOME_CARD_ADS_CTA[language] ?? HOME_CARD_ADS_CTA.en
  return ugc ? t[3] : t[2]
}
