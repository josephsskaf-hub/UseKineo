// KINEO-ADS-AMOSTRA-2026-10-09 — o PRIMEIRO anúncio grátis do Studio Ads (decisão do fundador, 09/10: "tudo sim").
//
// POR QUÊ: a pesquisa de mercado de 09/10 mostrou o anúncio por IA como ISCA de aquisição nos concorrentes (Hailuo
// "Ads (Free)", Creatify "first ad free"). Aqui o Studio Ads v2 era fechado para free/trial (lib/ads/access.ts → 'none'):
// em 30 dias, 9 contas free/trial bateram na porta 43 vezes. Agora TODA conta free/trial ganha UMA amostra:
//   · nível ADS_SAMPLE_TIER (photo_motion, o mais barato: ~US$ 2,20 de fal), ADS_V2_SCREEN_SECONDS (15 s);
//   · uma só (sem 3 variações, sem refação), sem cobrar crédito;
//   · teto GLOBAL de ADS_SAMPLE_DAILY_CAP amostras por dia UTC (o custo é nosso);
//   · assinante, passe e conta interna NÃO mudam (nunca entram pela amostra — já entram pela porta deles).
// A chave da amostra (ads_v2_orders.billing_ref = videos.render_id da entrega) tem prefixo PRÓPRIO, 'adssample-': não
// existe linha em credit_debits para ela, então nenhuma varredura de estorno a encontra, e failAdsV2Order nunca estorna.
// Quem decide no servidor: lib/ads/serverAccess.ts adsSampleOpen / adsSampleCapReached. Módulo PURO (sem import de valor).
import type { AdsV2Tier } from '@/lib/ads/v2Tiers'
import type { InterfaceLanguage } from '@/lib/ui/interfaceLanguage'

/** KINEO-ADS-AMOSTRA-2026-10-09 — interruptor ÚNICO. false = ninguém ganha amostra; o resto do Ads fica como estava. */
export const ADS_SAMPLE_LIVE = true
/** Teto global de amostras INICIADAS por dia UTC (cada uma custa ~US$ 2,20 na fal). */
export const ADS_SAMPLE_DAILY_CAP = 10
/** O único nível da amostra. */
export const ADS_SAMPLE_TIER: AdsV2Tier = 'photo_motion'
/** Teto de bytes de foto que a conta free sobe pela amostra (/api/footage, purpose 'ads'): sobra para 7 fotos e o logo. */
export const ADS_SAMPLE_FOOTAGE_MAX_BYTES = 60 * 1024 * 1024
/** Prefixo da chave da amostra — NÃO começa com 'adsv2' (não há débito; as redes de estorno não têm o que olhar). */
export const ADS_SAMPLE_PREFIX = 'adssample-'

// A MESMA validação de lib/ads/v2Billing.ts adsV2BillingRef (copiada: este módulo é puro).
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Chave da amostra = videos.render_id da entrega. */
export function adsSampleRef(orderId: string, generationId: string): string {
  if (!UUID_RE.test(orderId) || !UUID_RE.test(generationId)) throw new Error('ads_sample_bad_billing_ids')
  return `${ADS_SAMPLE_PREFIX}${orderId.toLowerCase()}-${generationId.toLowerCase()}`
}

/** A chave é de uma amostra grátis (nunca cobrada, nunca estornada)? */
export function isAdsSampleRef(ref: string | null | undefined): boolean {
  return typeof ref === 'string' && ref.startsWith(ADS_SAMPLE_PREFIX)
}

// ─── as frases da tela (KINEO-ADS-AMOSTRA-2026-10-09) ────────────────────────────────────────────────────────────────
// As 16 línguas da interface (lib/ui/interfaceLanguage.ts INTERFACE_LANGUAGE_OPTIONS), todas escritas — nenhuma cai no inglês.
export interface AdsSampleCopy {
  /** selo no cartão do nível da amostra, no lugar do preço */
  badge: string
  /** o botão de fazer */
  make: string
  /** a linha que explica a amostra */
  note: string
  /** selo dos níveis que a amostra não abre */
  paidOnly: string
  /** teto do dia atingido (429 'sample_cap') */
  cap: string
}

export const ADS_SAMPLE_COPY: Record<InterfaceLanguage, AdsSampleCopy> = {
  en: {
    badge: 'Your first ad is free',
    make: 'Make my free ad',
    note: 'Free sample: 1 per account, Photo motion level, 15 s. More levels and ads on paid plans.',
    paidOnly: 'Paid plans',
    cap: "Today's free samples are taken. Come back tomorrow or pick a plan.",
  },
  pt: {
    badge: 'Seu primeiro anúncio é grátis',
    make: 'Fazer meu anúncio grátis',
    note: 'Amostra grátis: 1 por conta, nível Photo motion, 15 s. Mais níveis e anúncios nos planos pagos.',
    paidOnly: 'Planos pagos',
    cap: 'As amostras grátis de hoje acabaram. Volte amanhã ou escolha um plano.',
  },
  es: {
    badge: 'Tu primer anuncio es gratis',
    make: 'Hacer mi anuncio gratis',
    note: 'Muestra gratis: 1 por cuenta, nivel Photo motion, 15 s. Más niveles y anuncios en los planes de pago.',
    paidOnly: 'Planes de pago',
    cap: 'Las muestras gratis de hoy ya se agotaron. Vuelve mañana o elige un plan.',
  },
  fr: {
    badge: 'Votre première pub est offerte',
    make: 'Créer ma pub gratuite',
    note: 'Essai gratuit : 1 par compte, niveau Photo motion, 15 s. Plus de niveaux et de pubs avec les offres payantes.',
    paidOnly: 'Offres payantes',
    cap: "Les essais gratuits du jour sont épuisés. Revenez demain ou choisissez une offre.",
  },
  de: {
    badge: 'Deine erste Anzeige ist kostenlos',
    make: 'Meine kostenlose Anzeige erstellen',
    note: 'Gratis-Probe: 1 pro Konto, Stufe Photo motion, 15 s. Mehr Stufen und Anzeigen in den bezahlten Plänen.',
    paidOnly: 'Bezahlte Pläne',
    cap: 'Die Gratis-Proben für heute sind vergeben. Komm morgen wieder oder wähle einen Plan.',
  },
  it: {
    badge: 'Il tuo primo annuncio è gratis',
    make: 'Crea il mio annuncio gratis',
    note: 'Prova gratuita: 1 per account, livello Photo motion, 15 s. Più livelli e annunci con i piani a pagamento.',
    paidOnly: 'Piani a pagamento',
    cap: 'Le prove gratuite di oggi sono esaurite. Torna domani o scegli un piano.',
  },
  nl: {
    badge: 'Je eerste advertentie is gratis',
    make: 'Maak mijn gratis advertentie',
    note: 'Gratis proef: 1 per account, niveau Photo motion, 15 s. Meer niveaus en advertenties met een betaald abonnement.',
    paidOnly: 'Betaalde abonnementen',
    cap: 'De gratis proeven van vandaag zijn op. Kom morgen terug of kies een abonnement.',
  },
  pl: {
    badge: 'Twoja pierwsza reklama jest za darmo',
    make: 'Zrób moją darmową reklamę',
    note: 'Darmowa próbka: 1 na konto, poziom Photo motion, 15 s. Więcej poziomów i reklam w płatnych planach.',
    paidOnly: 'Płatne plany',
    cap: 'Dzisiejsze darmowe próbki już się skończyły. Wróć jutro albo wybierz plan.',
  },
  tr: {
    badge: 'İlk reklamın ücretsiz',
    make: 'Ücretsiz reklamımı yap',
    note: 'Ücretsiz deneme: hesap başına 1, Photo motion seviyesi, 15 sn. Daha fazla seviye ve reklam ücretli planlarda.',
    paidOnly: 'Ücretli planlar',
    cap: 'Bugünün ücretsiz denemeleri bitti. Yarın tekrar gel ya da bir plan seç.',
  },
  ru: {
    badge: 'Первая реклама — бесплатно',
    make: 'Сделать бесплатную рекламу',
    note: 'Бесплатный пример: 1 на аккаунт, уровень Photo motion, 15 с. Больше уровней и роликов — в платных тарифах.',
    paidOnly: 'Платные тарифы',
    cap: 'Бесплатные примеры на сегодня закончились. Возвращайтесь завтра или выберите тариф.',
  },
  uk: {
    badge: 'Перша реклама — безкоштовно',
    make: 'Зробити безкоштовну рекламу',
    note: 'Безкоштовний приклад: 1 на акаунт, рівень Photo motion, 15 с. Більше рівнів і роликів — у платних тарифах.',
    paidOnly: 'Платні тарифи',
    cap: 'Безкоштовні приклади на сьогодні закінчилися. Поверніться завтра або оберіть тариф.',
  },
  ar: {
    badge: 'إعلانك الأول مجاني',
    make: 'اصنع إعلاني المجاني',
    note: 'عينة مجانية: واحدة لكل حساب، مستوى Photo motion، مدة 15 ثانية. مستويات وإعلانات أكثر في الخطط المدفوعة.',
    paidOnly: 'الخطط المدفوعة',
    cap: 'نفدت العينات المجانية لليوم. عد غدًا أو اختر خطة.',
  },
  ur: {
    badge: 'آپ کا پہلا اشتہار مفت ہے',
    make: 'میرا مفت اشتہار بنائیں',
    note: 'مفت نمونہ: ہر اکاؤنٹ کے لیے 1، Photo motion لیول، 15 سیکنڈ۔ مزید لیولز اور اشتہارات ادا شدہ پلانز میں۔',
    paidOnly: 'ادا شدہ پلانز',
    cap: 'آج کے مفت نمونے ختم ہو گئے۔ کل دوبارہ آئیں یا کوئی پلان چنیں۔',
  },
  hi: {
    badge: 'आपका पहला विज्ञापन मुफ़्त है',
    make: 'मेरा मुफ़्त विज्ञापन बनाएँ',
    note: 'मुफ़्त नमूना: हर अकाउंट के लिए 1, Photo motion लेवल, 15 सेकंड। ज़्यादा लेवल और विज्ञापन पेड प्लान में।',
    paidOnly: 'पेड प्लान',
    cap: 'आज के मुफ़्त नमूने खत्म हो गए। कल फिर आएँ या कोई प्लान चुनें।',
  },
  id: {
    badge: 'Iklan pertamamu gratis',
    make: 'Buat iklan gratisku',
    note: 'Contoh gratis: 1 per akun, level Photo motion, 15 dtk. Lebih banyak level dan iklan di paket berbayar.',
    paidOnly: 'Paket berbayar',
    cap: 'Contoh gratis hari ini sudah habis. Kembali besok atau pilih paket.',
  },
  vi: {
    badge: 'Quảng cáo đầu tiên của bạn miễn phí',
    make: 'Tạo quảng cáo miễn phí của tôi',
    note: 'Bản mẫu miễn phí: 1 cho mỗi tài khoản, mức Photo motion, 15 giây. Thêm mức và quảng cáo ở các gói trả phí.',
    paidOnly: 'Gói trả phí',
    cap: 'Bản mẫu miễn phí hôm nay đã hết. Hãy quay lại vào ngày mai hoặc chọn một gói.',
  },
}

/** Frases da amostra na língua da interface (língua desconhecida = inglês). */
export function adsSampleCopy(language: InterfaceLanguage | string | null | undefined): AdsSampleCopy {
  return (typeof language === 'string' && (ADS_SAMPLE_COPY as Record<string, AdsSampleCopy>)[language]) || ADS_SAMPLE_COPY.en
}
