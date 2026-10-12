// KINEO-BUSINESS-POS-AMOSTRA-2026-10-12 — DEPOIS do anúncio grátis (lib/ads/sample.ts): a oferta do Business.
//
// Fundador (12/10): "conserta tudo, precisamos faturar essa semana". Quem já usou a amostra e tenta outro anúncio recebia
// 403 'no_access' e a tela dizia "Studio Ads is not available on your account" — o momento de MAIOR intenção de compra
// virava erro genérico. Agora a tela troca o erro pela oferta do Business (lib/businessPlan.ts businessAdsOffer), mostrando o
// anúncio que a pessoa já fez; e o teto do dia ('sample_cap') diz a verdade: "amostras cheias hoje, volte amanhã ou assine o
// Business". Módulo PURO (só import type), irmão de lib/ads/sample.ts — que fica intocado (o dinheiro da amostra não mudou).
// Os NÚMEROS nunca são digitados aqui: {price} {credits} {ads} {seconds} entram por fillAfterSample.
import type { InterfaceLanguage } from '@/lib/ui/interfaceLanguage'

/** A oferta do Business que a tela recebe pronta do servidor (lib/businessPlan.ts businessAdsOffer). */
export interface AdsBusinessOffer {
  /** "$84" */
  price: string
  /** créditos por mês (TIER_CREDITS.business) */
  credits: number
  /** anúncios de produto de `seconds` s que cabem no mês (BUSINESS_ADS_PER_MONTH) */
  ads: number
  /** duração do anúncio da promessa */
  seconds: number
  /** checkout do plano (mensal, USD), com a campanha de atribuição */
  checkoutHref: string
  /** página do plano */
  pageHref: string
}

export interface AdsAfterSampleCopy {
  /** título da oferta depois da amostra usada */
  title: string
  /** rótulo do anúncio que a pessoa já fez */
  yourAd: string
  /** a promessa, com {ads} {seconds} {credits} {price} */
  body: string
  /** o botão do checkout, com {price} */
  cta: string
  /** o link da página do plano */
  more: string
  /** teto do dia ('sample_cap'): amostras cheias hoje */
  cap: string
}

export const ADS_AFTER_SAMPLE_COPY: Record<InterfaceLanguage, AdsAfterSampleCopy> = {
  en: {
    title: 'Your free ad is done. Make the next ones with Business.',
    yourAd: 'The ad you made',
    body: 'Business: {ads} product ads of {seconds} s per month ({credits} credits) for {price}/month. Cancel anytime.',
    cta: 'Start Business · {price}/month',
    more: "See what's included",
    cap: 'Free samples are full today. Try again tomorrow, or start Business and make your ad now.',
  },
  pt: {
    title: 'Seu anúncio grátis está pronto. Faça os próximos com o Business.',
    yourAd: 'O anúncio que você fez',
    body: 'Business: {ads} anúncios de produto de {seconds} s por mês ({credits} créditos) por {price}/mês. Cancele quando quiser.',
    cta: 'Assinar o Business · {price}/mês',
    more: 'Ver o que está incluído',
    cap: 'As amostras grátis de hoje acabaram. Tente amanhã ou assine o Business e faça seu anúncio agora.',
  },
  es: {
    title: 'Tu anuncio gratis está listo. Haz los siguientes con Business.',
    yourAd: 'El anuncio que hiciste',
    body: 'Business: {ads} anuncios de producto de {seconds} s al mes ({credits} créditos) por {price}/mes. Cancela cuando quieras.',
    cta: 'Empezar Business · {price}/mes',
    more: 'Ver qué incluye',
    cap: 'Las muestras gratis de hoy se agotaron. Vuelve mañana o empieza Business y haz tu anuncio ahora.',
  },
  fr: {
    title: 'Votre pub gratuite est prête. Faites les suivantes avec Business.',
    yourAd: 'La pub que vous avez créée',
    body: 'Business : {ads} pubs produit de {seconds} s par mois ({credits} crédits) pour {price}/mois. Résiliable à tout moment.',
    cta: 'Passer à Business · {price}/mois',
    more: 'Voir ce qui est inclus',
    cap: 'Les essais gratuits du jour sont complets. Réessayez demain, ou passez à Business et créez votre pub maintenant.',
  },
  de: {
    title: 'Deine kostenlose Anzeige ist fertig. Mach die nächsten mit Business.',
    yourAd: 'Deine Anzeige',
    body: 'Business: {ads} Produktanzeigen à {seconds} s pro Monat ({credits} Credits) für {price}/Monat. Jederzeit kündbar.',
    cta: 'Business starten · {price}/Monat',
    more: 'Was enthalten ist',
    cap: 'Die Gratis-Proben für heute sind voll. Versuch es morgen wieder oder starte Business und erstelle deine Anzeige jetzt.',
  },
  it: {
    title: 'Il tuo annuncio gratis è pronto. Crea i prossimi con Business.',
    yourAd: "L'annuncio che hai creato",
    body: 'Business: {ads} annunci prodotto da {seconds} s al mese ({credits} crediti) a {price}/mese. Disdici quando vuoi.',
    cta: 'Attiva Business · {price}/mese',
    more: 'Vedi cosa include',
    cap: 'Le prove gratuite di oggi sono finite. Riprova domani oppure attiva Business e crea il tuo annuncio adesso.',
  },
  nl: {
    title: 'Je gratis advertentie is klaar. Maak de volgende met Business.',
    yourAd: 'Jouw advertentie',
    body: 'Business: {ads} productadvertenties van {seconds} s per maand ({credits} credits) voor {price}/maand. Altijd opzegbaar.',
    cta: 'Business starten · {price}/maand',
    more: 'Bekijk wat erin zit',
    cap: 'De gratis proeven van vandaag zijn vol. Probeer het morgen opnieuw, of start Business en maak je advertentie nu.',
  },
  pl: {
    title: 'Twoja darmowa reklama jest gotowa. Kolejne zrób z Business.',
    yourAd: 'Twoja reklama',
    body: 'Business: {ads} reklam produktu po {seconds} s miesięcznie ({credits} kredytów) za {price}/mies. Rezygnujesz, kiedy chcesz.',
    cta: 'Wybierz Business · {price}/mies.',
    more: 'Zobacz, co zawiera',
    cap: 'Dzisiejsze darmowe próbki się skończyły. Spróbuj jutro albo wybierz Business i zrób reklamę teraz.',
  },
  tr: {
    title: 'Ücretsiz reklamın hazır. Sonrakileri Business ile yap.',
    yourAd: 'Yaptığın reklam',
    body: "Business: ayda {seconds} sn'lik {ads} ürün reklamı ({credits} kredi), aylık {price}. İstediğin zaman iptal et.",
    cta: "Business'a geç · aylık {price}",
    more: 'Neler dahil, gör',
    cap: "Bugünün ücretsiz denemeleri doldu. Yarın tekrar dene ya da Business'a geçip reklamını şimdi yap.",
  },
  ru: {
    title: 'Ваша бесплатная реклама готова. Следующие — с тарифом Business.',
    yourAd: 'Ваша реклама',
    body: 'Business: {ads} рекламных роликов товара по {seconds} с в месяц ({credits} кредитов) за {price}/мес. Отменить можно в любой момент.',
    cta: 'Подключить Business · {price}/мес',
    more: 'Что входит в тариф',
    cap: 'Бесплатные примеры на сегодня закончились. Попробуйте завтра или подключите Business и сделайте рекламу сейчас.',
  },
  uk: {
    title: 'Ваша безкоштовна реклама готова. Наступні — з тарифом Business.',
    yourAd: 'Ваша реклама',
    body: 'Business: {ads} рекламних роликів товару по {seconds} с на місяць ({credits} кредитів) за {price}/міс. Скасувати можна будь-коли.',
    cta: 'Підключити Business · {price}/міс',
    more: 'Що входить у тариф',
    cap: 'Безкоштовні приклади на сьогодні закінчилися. Спробуйте завтра або підключіть Business і зробіть рекламу зараз.',
  },
  ar: {
    title: 'إعلانك المجاني جاهز. اصنع الإعلانات التالية مع Business.',
    yourAd: 'الإعلان الذي صنعته',
    body: 'Business: {ads} إعلانات منتجات مدة كل منها {seconds} ثانية شهريًا ({credits} رصيد) مقابل {price} شهريًا. ألغِ في أي وقت.',
    cta: 'ابدأ Business · {price} شهريًا',
    more: 'اعرف ما يشمله',
    cap: 'نفدت العينات المجانية لليوم. حاول غدًا، أو ابدأ Business واصنع إعلانك الآن.',
  },
  ur: {
    title: 'آپ کا مفت اشتہار تیار ہے۔ اگلے اشتہار Business کے ساتھ بنائیں۔',
    yourAd: 'آپ کا بنایا ہوا اشتہار',
    body: 'Business: ہر ماہ {seconds} سیکنڈ کے {ads} پروڈکٹ اشتہارات ({credits} کریڈٹس)، {price} ماہانہ۔ جب چاہیں منسوخ کریں۔',
    cta: 'Business شروع کریں · {price} ماہانہ',
    more: 'دیکھیں کیا شامل ہے',
    cap: 'آج کے مفت نمونے ختم ہو گئے۔ کل دوبارہ کوشش کریں، یا Business شروع کر کے ابھی اپنا اشتہار بنائیں۔',
  },
  hi: {
    title: 'आपका मुफ़्त विज्ञापन तैयार है। अगले विज्ञापन Business के साथ बनाएँ।',
    yourAd: 'आपका बनाया विज्ञापन',
    body: 'Business: हर महीने {seconds} सेकंड के {ads} प्रोडक्ट विज्ञापन ({credits} क्रेडिट), {price}/महीना। कभी भी रद्द करें।',
    cta: 'Business शुरू करें · {price}/महीना',
    more: 'देखें क्या शामिल है',
    cap: 'आज के मुफ़्त नमूने भर गए। कल फिर कोशिश करें, या Business शुरू करके अभी अपना विज्ञापन बनाएँ।',
  },
  id: {
    title: 'Iklan gratismu sudah jadi. Buat iklan berikutnya dengan Business.',
    yourAd: 'Iklan yang kamu buat',
    body: 'Business: {ads} iklan produk {seconds} dtk per bulan ({credits} kredit) seharga {price}/bulan. Bisa berhenti kapan saja.',
    cta: 'Mulai Business · {price}/bulan',
    more: 'Lihat isinya',
    cap: 'Contoh gratis hari ini sudah penuh. Coba lagi besok, atau mulai Business dan buat iklanmu sekarang.',
  },
  vi: {
    title: 'Quảng cáo miễn phí của bạn đã xong. Làm các quảng cáo tiếp theo với Business.',
    yourAd: 'Quảng cáo bạn đã làm',
    body: 'Business: {ads} quảng cáo sản phẩm {seconds} giây mỗi tháng ({credits} tín dụng) với giá {price}/tháng. Hủy bất cứ lúc nào.',
    cta: 'Bắt đầu Business · {price}/tháng',
    more: 'Xem gói gồm những gì',
    cap: 'Bản mẫu miễn phí hôm nay đã hết chỗ. Hãy thử lại vào ngày mai, hoặc bắt đầu Business và làm quảng cáo ngay.',
  },
}

/** Frases do pós-amostra na língua da interface (língua desconhecida = inglês; frase vazia numa língua = a do inglês). */
export function adsAfterSampleCopy(language: InterfaceLanguage | string | null | undefined): AdsAfterSampleCopy {
  const en = ADS_AFTER_SAMPLE_COPY.en
  const c = typeof language === 'string' ? (ADS_AFTER_SAMPLE_COPY as Record<string, AdsAfterSampleCopy | undefined>)[language] : undefined
  if (!c) return en
  const out: AdsAfterSampleCopy = { ...en }
  for (const k of Object.keys(en) as (keyof AdsAfterSampleCopy)[]) if (typeof c[k] === 'string' && c[k].trim()) out[k] = c[k]
  return out
}

/** Troca {price} {credits} {ads} {seconds} pelos números da oferta (nunca digitados na frase). */
export function fillAfterSample(template: string, offer: Pick<AdsBusinessOffer, 'price' | 'credits' | 'ads' | 'seconds'>): string {
  return template
    .split('{price}').join(offer.price)
    .split('{credits}').join(String(offer.credits))
    .split('{ads}').join(String(offer.ads))
    .split('{seconds}').join(String(offer.seconds))
}
