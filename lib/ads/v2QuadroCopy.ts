// KINEO-ADS-QUADRO-STUDIO-1510 — as 3 frases novas do quadro curto do Studio Ads (modo simples, aba "Um anúncio"), no formato
// do quadro do Studio de filmes: o rótulo "2 Seu anúncio", o "Ver todos os N" da fileira de estilos e o "· opcional" dos
// cartões recolhidos. Todo o resto do quadro reusa as frases que já existiam (16 línguas; nenhuma cai no inglês).
// LIB PURA (só `import type`). Só texto: nada de preço, plano, rota ou débito.
import type { InterfaceLanguage } from '@/lib/ui/interfaceLanguage'

export interface AdsV2QuadroCopy {
  /** rótulo do passo 2 do quadro (a frase + o tipo de anúncio + a cena) */
  yourAd: string
  /** "Ver todos os {n}" — abre a escolha completa de estilos */
  seeAll: string
  /** sufixo dos cartões recolhidos ("Mais opções · opcional") */
  optional: string
}

export const ADS_V2_QUADRO_COPY: Record<InterfaceLanguage, AdsV2QuadroCopy> = {
  en: { yourAd: 'Your ad', seeAll: 'See all {n}', optional: 'optional' },
  pt: { yourAd: 'Seu anúncio', seeAll: 'Ver todos os {n}', optional: 'opcional' },
  es: { yourAd: 'Tu anuncio', seeAll: 'Ver los {n}', optional: 'opcional' },
  fr: { yourAd: 'Votre pub', seeAll: 'Voir les {n}', optional: 'facultatif' },
  de: { yourAd: 'Deine Anzeige', seeAll: 'Alle {n} ansehen', optional: 'optional' },
  it: { yourAd: 'Il tuo annuncio', seeAll: 'Vedi tutti i {n}', optional: 'facoltativo' },
  nl: { yourAd: 'Je advertentie', seeAll: 'Alle {n} bekijken', optional: 'optioneel' },
  pl: { yourAd: 'Twoja reklama', seeAll: 'Zobacz wszystkie {n}', optional: 'opcjonalnie' },
  tr: { yourAd: 'Reklamın', seeAll: '{n} stilin hepsini gör', optional: 'isteğe bağlı' },
  ru: { yourAd: 'Ваша реклама', seeAll: 'Все {n}', optional: 'необязательно' },
  uk: { yourAd: 'Ваша реклама', seeAll: 'Усі {n}', optional: 'необовʼязково' },
  ar: { yourAd: 'إعلانك', seeAll: 'عرض الكل ({n})', optional: 'اختياري' },
  ur: { yourAd: 'آپ کا اشتہار', seeAll: 'تمام {n} دیکھیں', optional: 'اختیاری' },
  hi: { yourAd: 'आपका विज्ञापन', seeAll: 'सभी {n} देखें', optional: 'वैकल्पिक' },
  id: { yourAd: 'Iklan Anda', seeAll: 'Lihat semua {n}', optional: 'opsional' },
  vi: { yourAd: 'Quảng cáo của bạn', seeAll: 'Xem tất cả {n}', optional: 'không bắt buộc' },
}

/** As frases na língua da interface (língua desconhecida = inglês). */
export function adsV2QuadroCopy(language: InterfaceLanguage | string | null | undefined): AdsV2QuadroCopy {
  return (typeof language === 'string' && (ADS_V2_QUADRO_COPY as Record<string, AdsV2QuadroCopy>)[language]) || ADS_V2_QUADRO_COPY.en
}
