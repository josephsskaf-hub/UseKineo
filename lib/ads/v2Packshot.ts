// KINEO-ADS-MELHORIAS-1410 — as frases do PACKSHOT (a foto real do produto, sem IA) nas 16 línguas da interface.
// O plano mora em lib/ads/v2ShotLists.ts (adsV2PackshotShots) e a montagem em lib/ads/adV2Montage.ts (adsV2PackshotElements).
// LIB PURA: só import type.
import type { InterfaceLanguage } from '@/lib/ui/interfaceLanguage'

export interface AdsV2PackshotCopy {
  /** Rótulo do plano na grade (progresso e entrega). */
  label: string
  /** Frase curta embaixo da grade: por que esse plano não tem "Refazer". */
  note: string
}

export const ADS_V2_PACKSHOT_COPY: Record<InterfaceLanguage, AdsV2PackshotCopy> = {
  en: { label: 'Your real photo', note: 'One shot is your real product photo, untouched by AI.' },
  pt: { label: 'Sua foto real', note: 'Uma cena é a foto real do seu produto, sem retoque da IA.' },
  es: { label: 'Tu foto real', note: 'Una escena es la foto real de tu producto, sin retoque de la IA.' },
  fr: { label: 'Votre vraie photo', note: 'Un plan est la vraie photo de votre produit, sans retouche de l’IA.' },
  de: { label: 'Ihr echtes Foto', note: 'Eine Szene ist das echte Foto Ihres Produkts, ohne KI-Bearbeitung.' },
  it: { label: 'La tua foto reale', note: 'Una scena è la foto reale del tuo prodotto, senza ritocchi dell’IA.' },
  nl: { label: 'Je echte foto', note: 'Eén shot is de echte foto van je product, zonder AI-bewerking.' },
  pl: { label: 'Twoje prawdziwe zdjęcie', note: 'Jedno ujęcie to prawdziwe zdjęcie Twojego produktu, bez obróbki AI.' },
  tr: { label: 'Gerçek fotoğrafınız', note: 'Bir sahne, ürününüzün yapay zekâ dokunmamış gerçek fotoğrafıdır.' },
  ru: { label: 'Ваше настоящее фото', note: 'Одна сцена — настоящее фото вашего товара, без обработки ИИ.' },
  uk: { label: 'Ваше справжнє фото', note: 'Одна сцена — справжнє фото вашого товару, без обробки ШІ.' },
  ar: { label: 'صورتك الحقيقية', note: 'أحد المشاهد هو الصورة الحقيقية لمنتجك، دون تعديل بالذكاء الاصطناعي.' },
  ur: { label: 'آپ کی اصل تصویر', note: 'ایک منظر آپ کے پروڈکٹ کی اصل تصویر ہے، AI کی تبدیلی کے بغیر۔' },
  hi: { label: 'आपकी असली फ़ोटो', note: 'एक सीन आपके प्रोडक्ट की असली फ़ोटो है, बिना AI बदलाव के।' },
  id: { label: 'Foto asli Anda', note: 'Satu adegan adalah foto asli produk Anda, tanpa sentuhan AI.' },
  vi: { label: 'Ảnh thật của bạn', note: 'Một cảnh là ảnh thật sản phẩm của bạn, không qua chỉnh sửa AI.' },
}

export function adsV2PackshotCopy(lang: InterfaceLanguage | string | null | undefined): AdsV2PackshotCopy {
  const k = typeof lang === 'string' ? (lang as InterfaceLanguage) : 'en'
  return ADS_V2_PACKSHOT_COPY[k] ?? ADS_V2_PACKSHOT_COPY.en
}
