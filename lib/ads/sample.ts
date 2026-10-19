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
export const ADS_SAMPLE_DAILY_CAP = 30 // KINEO-CLOSE-REAL-AJUSTE-1910 — fundador 19/10 aprovou 10 → 30: a amostra agora é o Close real (~US$ 0,26 cada, não os ~US$ 2,20 do Comercial com IA)
/** O único nível da amostra. */
// KINEO-CLIPE360-AMOSTRA-1410 — fundador (14/10, "tudo sim"): a amostra sai no nível COMMERCIAL (o melhor trabalho padrão
// KINEO-CLIPE360-AMOSTRA-1410   da casa), não mais no photo_motion. Caso real: o Pedro (agência, prospecção de 13/10) recebeu
// KINEO-CLIPE360-AMOSTRA-1410   a amostra no nível mais baixo. Custo fal estimado (estimateAdUsd) por amostra: photo_motion
// KINEO-CLIPE360-AMOSTRA-1410   ≈ US$ 2,13 → commercial ≈ US$ 2,58 (+3 cenas Nano Banana Pro a US$ 0,15 = +US$ 0,45).
// KINEO-CLIPE360-AMOSTRA-1410   Crédito do cliente: continua ZERO (chave adssample-, credits_charged 0); teto de 10/dia intocado.
export const ADS_SAMPLE_TIER: AdsV2Tier = 'commercial'
/** Teto de bytes de foto que a conta free sobe pela amostra (/api/footage, purpose 'ads'): sobra para 7 fotos e o logo. */
export const ADS_SAMPLE_FOOTAGE_MAX_BYTES = 60 * 1024 * 1024
/** Prefixo da chave da amostra — NÃO começa com 'adsv2' (não há débito; as redes de estorno não têm o que olhar). */
export const ADS_SAMPLE_PREFIX = 'adssample-'
// KINEO-CLOSE-REAL-1910 — o FORMATO da amostra (fundador 19/10, "close real grátis, pode fazer"): SEMPRE o Close do produto real (lib/ads/v2CloseReal.ts) —
// KINEO-CLOSE-REAL-1910 — zero IA de vídeo, rótulo 100% fiel, ~US$ 0,30 em vez dos ~US$ 2,58 do Comercial com cenas criadas — e COM marca-d'água. O /plan força
// KINEO-CLOSE-REAL-1910 — o formato na amostra (não confia no corpo) e o /start recusa amostra sem ele. O nível gravado no pedido continua ADS_SAMPLE_TIER.
export const ADS_SAMPLE_FORMAT = 'close_real' // KINEO-CLOSE-REAL-1910
/** KINEO-CLOSE-REAL-1910 — antifarm: trial_status que nunca ganha amostra ('blocked' = descartável/digital repetida marcada pelo trial; 'region_paid_only' = região sem filme grátis). */ // KINEO-CLOSE-REAL-1910
export const ADS_SAMPLE_BLOCKED_TRIAL_STATUS: readonly string[] = ['blocked', 'region_paid_only'] // KINEO-CLOSE-REAL-1910
/** KINEO-CLOSE-REAL-1910 — o trial_status da conta barra a amostra? (puro) */ // KINEO-CLOSE-REAL-1910
export function adsSampleTrialStatusBlocked(status: unknown): boolean { // KINEO-CLOSE-REAL-1910
  return typeof status === 'string' && ADS_SAMPLE_BLOCKED_TRIAL_STATUS.includes(status.trim().toLowerCase()) // KINEO-CLOSE-REAL-1910
} // KINEO-CLOSE-REAL-1910

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
  /** KINEO-CLOSE-REAL-1910 — a linha da amostra no formato Close do produto real (1 por conta, 15 s, com marca-d'água) */ // KINEO-CLOSE-REAL-1910
  closeReal: string // KINEO-CLOSE-REAL-1910
}

export const ADS_SAMPLE_COPY: Record<InterfaceLanguage, AdsSampleCopy> = {
  en: {
    badge: 'Your first ad is free',
    make: 'Make my free ad',
    note: 'Free sample: 1 per account, Commercial level, 15 s. More levels and ads on paid plans.',
    paidOnly: 'Paid plans',
    cap: "Today's free samples are taken. Come back tomorrow or pick a plan.",
    closeReal: "Free sample: 1 per account, in the Real product close-up format, 15 s, with a small watermark. More formats and ads on paid plans.", // KINEO-CLOSE-REAL-1910
  },
  pt: {
    badge: 'Seu primeiro anúncio é grátis',
    make: 'Fazer meu anúncio grátis',
    note: 'Amostra grátis: 1 por conta, nível Comercial, 15 s. Mais níveis e anúncios nos planos pagos.',
    paidOnly: 'Planos pagos',
    cap: 'As amostras grátis de hoje acabaram. Volte amanhã ou escolha um plano.',
    closeReal: "Amostra grátis: 1 por conta, no formato Close do produto real, 15 s, com marca-d'água discreta. Mais formatos e anúncios nos planos pagos.", // KINEO-CLOSE-REAL-1910
  },
  es: {
    badge: 'Tu primer anuncio es gratis',
    make: 'Hacer mi anuncio gratis',
    note: 'Muestra gratis: 1 por cuenta, nivel Comercial, 15 s. Más niveles y anuncios en los planes de pago.',
    paidOnly: 'Planes de pago',
    cap: 'Las muestras gratis de hoy ya se agotaron. Vuelve mañana o elige un plan.',
    closeReal: "Muestra gratis: 1 por cuenta, en el formato Primer plano del producto real, 15 s, con una marca de agua discreta. Más formatos y anuncios en los planes de pago.", // KINEO-CLOSE-REAL-1910
  },
  fr: {
    badge: 'Votre première pub est offerte',
    make: 'Créer ma pub gratuite',
    note: 'Essai gratuit : 1 par compte, niveau Commercial, 15 s. Plus de niveaux et de pubs avec les offres payantes.',
    paidOnly: 'Offres payantes',
    cap: "Les essais gratuits du jour sont épuisés. Revenez demain ou choisissez une offre.",
    closeReal: "Essai gratuit : 1 par compte, au format Gros plan du vrai produit, 15 s, avec un petit filigrane. Plus de formats et de pubs avec les offres payantes.", // KINEO-CLOSE-REAL-1910
  },
  de: {
    badge: 'Deine erste Anzeige ist kostenlos',
    make: 'Meine kostenlose Anzeige erstellen',
    note: 'Gratis-Probe: 1 pro Konto, Stufe Commercial, 15 s. Mehr Stufen und Anzeigen in den bezahlten Plänen.',
    paidOnly: 'Bezahlte Pläne',
    cap: 'Die Gratis-Proben für heute sind vergeben. Komm morgen wieder oder wähle einen Plan.',
    closeReal: "Gratis-Probe: 1 pro Konto, im Format Nahaufnahme des echten Produkts, 15 s, mit kleinem Wasserzeichen. Mehr Formate und Anzeigen in den bezahlten Plänen.", // KINEO-CLOSE-REAL-1910
  },
  it: {
    badge: 'Il tuo primo annuncio è gratis',
    make: 'Crea il mio annuncio gratis',
    note: 'Prova gratuita: 1 per account, livello Commercial, 15 s. Più livelli e annunci con i piani a pagamento.',
    paidOnly: 'Piani a pagamento',
    cap: 'Le prove gratuite di oggi sono esaurite. Torna domani o scegli un piano.',
    closeReal: "Prova gratuita: 1 per account, nel formato Primo piano del prodotto reale, 15 s, con una piccola filigrana. Più formati e annunci con i piani a pagamento.", // KINEO-CLOSE-REAL-1910
  },
  nl: {
    badge: 'Je eerste advertentie is gratis',
    make: 'Maak mijn gratis advertentie',
    note: 'Gratis proef: 1 per account, niveau Commercial, 15 s. Meer niveaus en advertenties met een betaald abonnement.',
    paidOnly: 'Betaalde abonnementen',
    cap: 'De gratis proeven van vandaag zijn op. Kom morgen terug of kies een abonnement.',
    closeReal: "Gratis proef: 1 per account, in het formaat Close-up van het echte product, 15 s, met een klein watermerk. Meer formaten en advertenties met een betaald abonnement.", // KINEO-CLOSE-REAL-1910
  },
  pl: {
    badge: 'Twoja pierwsza reklama jest za darmo',
    make: 'Zrób moją darmową reklamę',
    note: 'Darmowa próbka: 1 na konto, poziom Commercial, 15 s. Więcej poziomów i reklam w płatnych planach.',
    paidOnly: 'Płatne plany',
    cap: 'Dzisiejsze darmowe próbki już się skończyły. Wróć jutro albo wybierz plan.',
    closeReal: "Darmowa próbka: 1 na konto, w formacie Zbliżenie prawdziwego produktu, 15 s, z małym znakiem wodnym. Więcej formatów i reklam w płatnych planach.", // KINEO-CLOSE-REAL-1910
  },
  tr: {
    badge: 'İlk reklamın ücretsiz',
    make: 'Ücretsiz reklamımı yap',
    note: 'Ücretsiz deneme: hesap başına 1, Commercial seviyesi, 15 sn. Daha fazla seviye ve reklam ücretli planlarda.',
    paidOnly: 'Ücretli planlar',
    cap: 'Bugünün ücretsiz denemeleri bitti. Yarın tekrar gel ya da bir plan seç.',
    closeReal: "Ücretsiz deneme: hesap başına 1, Gerçek ürün yakın çekimi formatında, 15 sn, küçük bir filigranla. Daha fazla format ve reklam ücretli planlarda.", // KINEO-CLOSE-REAL-1910
  },
  ru: {
    badge: 'Первая реклама — бесплатно',
    make: 'Сделать бесплатную рекламу',
    note: 'Бесплатный пример: 1 на аккаунт, уровень Commercial, 15 с. Больше уровней и роликов — в платных тарифах.',
    paidOnly: 'Платные тарифы',
    cap: 'Бесплатные примеры на сегодня закончились. Возвращайтесь завтра или выберите тариф.',
    closeReal: "Бесплатный пример: 1 на аккаунт, в формате «Крупный план реального товара», 15 с, с небольшим водяным знаком. Больше форматов и роликов — в платных тарифах.", // KINEO-CLOSE-REAL-1910
  },
  uk: {
    badge: 'Перша реклама — безкоштовно',
    make: 'Зробити безкоштовну рекламу',
    note: 'Безкоштовний приклад: 1 на акаунт, рівень Commercial, 15 с. Більше рівнів і роликів — у платних тарифах.',
    paidOnly: 'Платні тарифи',
    cap: 'Безкоштовні приклади на сьогодні закінчилися. Поверніться завтра або оберіть тариф.',
    closeReal: "Безкоштовний приклад: 1 на акаунт, у форматі «Великий план справжнього товару», 15 с, з невеликим водяним знаком. Більше форматів і роликів — у платних тарифах.", // KINEO-CLOSE-REAL-1910
  },
  ar: {
    badge: 'إعلانك الأول مجاني',
    make: 'اصنع إعلاني المجاني',
    note: 'عينة مجانية: واحدة لكل حساب، مستوى Commercial، مدة 15 ثانية. مستويات وإعلانات أكثر في الخطط المدفوعة.',
    paidOnly: 'الخطط المدفوعة',
    cap: 'نفدت العينات المجانية لليوم. عد غدًا أو اختر خطة.',
    closeReal: "عينة مجانية: واحدة لكل حساب، بشكل «لقطة قريبة للمنتج الحقيقي»، مدة 15 ثانية، مع علامة مائية صغيرة. أشكال وإعلانات أكثر في الخطط المدفوعة.", // KINEO-CLOSE-REAL-1910
  },
  ur: {
    badge: 'آپ کا پہلا اشتہار مفت ہے',
    make: 'میرا مفت اشتہار بنائیں',
    note: 'مفت نمونہ: ہر اکاؤنٹ کے لیے 1، Commercial لیول، 15 سیکنڈ۔ مزید لیولز اور اشتہارات ادا شدہ پلانز میں۔',
    paidOnly: 'ادا شدہ پلانز',
    cap: 'آج کے مفت نمونے ختم ہو گئے۔ کل دوبارہ آئیں یا کوئی پلان چنیں۔',
    closeReal: "مفت نمونہ: ہر اکاؤنٹ کے لیے 1، «اصل پروڈکٹ کا کلوز اپ» فارمیٹ میں، 15 سیکنڈ، چھوٹے واٹر مارک کے ساتھ۔ مزید فارمیٹس اور اشتہارات ادا شدہ پلانز میں۔", // KINEO-CLOSE-REAL-1910
  },
  hi: {
    badge: 'आपका पहला विज्ञापन मुफ़्त है',
    make: 'मेरा मुफ़्त विज्ञापन बनाएँ',
    note: 'मुफ़्त नमूना: हर अकाउंट के लिए 1, Commercial लेवल, 15 सेकंड। ज़्यादा लेवल और विज्ञापन पेड प्लान में।',
    paidOnly: 'पेड प्लान',
    cap: 'आज के मुफ़्त नमूने खत्म हो गए। कल फिर आएँ या कोई प्लान चुनें।',
    closeReal: "मुफ़्त नमूना: हर अकाउंट के लिए 1, «असली प्रोडक्ट का क्लोज़-अप» फ़ॉर्मैट में, 15 सेकंड, छोटे वॉटरमार्क के साथ। ज़्यादा फ़ॉर्मैट और विज्ञापन पेड प्लान में।", // KINEO-CLOSE-REAL-1910
  },
  id: {
    badge: 'Iklan pertamamu gratis',
    make: 'Buat iklan gratisku',
    note: 'Contoh gratis: 1 per akun, level Commercial, 15 dtk. Lebih banyak level dan iklan di paket berbayar.',
    paidOnly: 'Paket berbayar',
    cap: 'Contoh gratis hari ini sudah habis. Kembali besok atau pilih paket.',
    closeReal: "Contoh gratis: 1 per akun, format Close-up produk asli, 15 dtk, dengan watermark kecil. Lebih banyak format dan iklan di paket berbayar.", // KINEO-CLOSE-REAL-1910
  },
  vi: {
    badge: 'Quảng cáo đầu tiên của bạn miễn phí',
    make: 'Tạo quảng cáo miễn phí của tôi',
    note: 'Bản mẫu miễn phí: 1 cho mỗi tài khoản, mức Commercial, 15 giây. Thêm mức và quảng cáo ở các gói trả phí.',
    paidOnly: 'Gói trả phí',
    cap: 'Bản mẫu miễn phí hôm nay đã hết. Hãy quay lại vào ngày mai hoặc chọn một gói.',
    closeReal: "Bản mẫu miễn phí: 1 cho mỗi tài khoản, định dạng Cận cảnh sản phẩm thật, 15 giây, có hình mờ nhỏ. Thêm định dạng và quảng cáo ở các gói trả phí.", // KINEO-CLOSE-REAL-1910
  },
}

/** Frases da amostra na língua da interface (língua desconhecida = inglês). */
export function adsSampleCopy(language: InterfaceLanguage | string | null | undefined): AdsSampleCopy {
  return (typeof language === 'string' && (ADS_SAMPLE_COPY as Record<string, AdsSampleCopy>)[language]) || ADS_SAMPLE_COPY.en
}
