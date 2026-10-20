// KINEO-KIT-BF-VENDA-2010 — o KIT BLACK FRIDAY À VENDA (fundador 19/10, "3 decisões sim"; execução pedida em 20/10):
//   "Kit Black Friday US$ 49 avulso OU incluído no plano Business (US$ 84/mês)".
//
// O QUE O KIT ENTREGA (honesto e simples — a conta está no relatório da entrega):
//   · 340 créditos = 10 anúncios "Close do produto real" de 15 s no nível Photo motion (34 cr cada, adsV2Credits('photo_motion', 15)),
//     com o campo Oferta e o lote 1 · 3 · 5 variações que já estão no ar (KINEO-KIT-BF-1910). Ex.: 2 produtos × 5 variações.
//     Os créditos são os de sempre (video_credits): servem também para outro nível ou um filme — o número "10" é do Photo motion.
//   · Studio Ads aberto até 31/12/2026 (fim do dia em Brasília) para quem não assina — a MESMA coluna do passe (profiles.ads_access_until),
//     nunca encurta um acesso maior que a pessoa já tenha.
//   · Pagamento único, sem assinatura. À venda até 30/11/2026 (fim do dia em Brasília); depois o checkout recusa e o cartão some.
// INCLUÍDO NO BUSINESS: o assinante Business NÃO paga o kit — os 500 créditos do mês dele já cobrem os 10 anúncios (340) e ele já tem o
//   Studio Ads com oferta e variações. Nada é concedido à parte (nem precisa: a renovação dele recarrega 500 todo mês); o checkout do kit
//   recusa o Business com a frase "incluído no seu plano" e o cartão mostra "Incluído no seu plano Business" no lugar do botão.
// CUSTO (fornecedor): Close real ≈ US$ 0,26–0,30 por anúncio (voz + recorte + Creatomate + música + texto, adsV2CloseRealUsd) →
//   10 anúncios ≈ US$ 3. Pior caso (os 340 créditos gastos no motor mais caro): worstCaseCogsUsd(340) ≈ US$ 38,19 contra US$ 47,28 líquidos.
//
// MÓDULO PURO E SEM IMPORT: o checkout (lib/stripe/kitBfCheckout.ts), o webhook (Path A), a rota da oferta (/api/offers/black-friday), os
// cartões (components/ads/KitBfBuyCard.tsx) e o guardião scripts/test-kit-bf-venda-2010.mjs leem DAQUI — o preço existe em um lugar só.
// Preço, créditos e prazos são do SERVIDOR: nada que o navegador mande muda o valor cobrado nem o que o webhook concede.

export const KIT_BF_SALE_MARK = 'KINEO-KIT-BF-VENDA-2010'
/** metadata.pack da sessão da Stripe — é por ele (e só por ele) que o webhook reconhece o kit (4900 é também o bulk30). */
export const KIT_BF_PACK_ID = 'kit_bf' as const
/** Versão do contrato (cartão + checkout + webhook). Muda junto com qualquer promessa do cartão. */
export const KIT_BF_VERSION = 'kit_bf_v1_2026-10-20' as const

/** O preço — FONTE ÚNICA (centavos de dólar). Brasil paga em reais pela fórmula da casa (lib/settlementCurrency). */
export const KIT_BF_USD_MINOR = 4900
/** Quantos anúncios Close real o kit paga no nível Photo motion. */
export const KIT_BF_ADS = 10
/** ESPELHO de adsV2Credits('photo_motion', 15) (lib/ads/v2Tiers.ts) — o guardião prova que é igual ao derivado. */
export const KIT_BF_AD_CREDITS = 34
/** Créditos concedidos pelo webhook (metadata.pack_credits gravada ao abrir a sessão; este número só no fallback sem ela). */
export const KIT_BF_CREDITS = KIT_BF_ADS * KIT_BF_AD_CREDITS

/** Fim da venda: 30/11/2026 24:00 em Brasília (UTC−3) = 01/12 03:00 UTC. Depois disso o checkout recusa e o cartão some. */
export const KIT_BF_SALE_ENDS_AT = '2026-12-01T03:00:00.000Z'
/** Até quando o kit abre o Studio Ads para quem não assina: 31/12/2026 24:00 em Brasília. */
export const KIT_BF_ACCESS_UNTIL = '2027-01-01T03:00:00.000Z'

/** Planos que já têm o kit incluído (não compram): o Business. */
export const KIT_BF_INCLUDED_PLANS: readonly string[] = ['business']
/** Créditos do mês do Business — ESPELHO de TIER_CREDITS.business (lib/checkoutPricing.ts); o guardião prova o espelho e que cobre o kit. */
export const KIT_BF_BUSINESS_MONTHLY_CREDITS = 500

/** A venda está aberta AGORA (relógio do servidor no checkout e na rota da oferta)? */
export function kitBfSaleOpen(nowMs: number = Date.now()): boolean {
  return Number.isFinite(nowMs) && nowMs < Date.parse(KIT_BF_SALE_ENDS_AT)
}

/** O plano já inclui o kit? (Business.) Plano desconhecido/ausente = não. */
export function kitBfIncludedInPlan(plan: unknown): boolean {
  return typeof plan === 'string' && KIT_BF_INCLUDED_PLANS.includes(plan.trim().toLowerCase())
}

/** O acesso que o webhook grava: o MAIOR entre o que a pessoa já tem e o fim do kit (nunca encurta). Data inválida = o fim do kit. */
export function kitBfAccessUntilIso(current: unknown): string {
  const kit = Date.parse(KIT_BF_ACCESS_UNTIL)
  const cur = typeof current === 'string' || current instanceof Date ? new Date(current as string | Date).getTime() : NaN
  return new Date(Number.isFinite(cur) && cur > kit ? cur : kit).toISOString()
}

/** Sessão da Stripe do kit: SÓ pela metadata.pack exata — nunca pelo valor. */
export function isKitBfSession(session: { mode?: string | null; metadata?: Record<string, string> | null }): boolean {
  return session.mode === 'payment' && (session.metadata?.pack ?? '').trim() === KIT_BF_PACK_ID
}

/** "US$49" — sem ".00" fantasma. */
export function kitBfPriceLabel(minor: number = KIT_BF_USD_MINOR): string {
  const v = minor / 100
  return `US$${Number.isInteger(v) ? v : v.toFixed(2)}`
}

/** Dias inteiros que faltam até `endsAtIso` a partir de `nowMs` (arredonda para cima; 0 depois do fim). */
export function daysLeft(endsAtIso: string, nowMs: number): number {
  const ms = Date.parse(endsAtIso) - nowMs
  return Number.isFinite(ms) && ms > 0 ? Math.ceil(ms / 86_400_000) : 0
}

/** A URL do checkout do kit (GET; sem sessão leva ao login e retoma). Nenhum preço vai na URL. */
export const KIT_BF_CHECKOUT_HREF = `/api/stripe/checkout?pack=${KIT_BF_PACK_ID}`

/** Eventos: o webhook grava o de compra DEPOIS da concessão confirmada; o checkout grava os de sempre (checkout_started com sku kit_bf). */
export const KIT_BF_EVENTS = {
  checkoutStarted: 'kit_bf_checkout_started',
  purchased: 'kit_bf_purchased',
} as const

// ── o cartão (16 línguas) ─────────────────────────────────────────────────────────────────────────────────────────────
export interface KitBfCopy {
  title: string
  /** {price} */
  priceLine: string
  /** {credits} {ads} {per} {format} */
  credits: string
  access: string
  oneTime: string
  /** {d} */
  ends: string
  /** {price} */
  cta: string
  included: string
  /** {plan} {ads} {credits} */
  includedNote: string
}

export const KIT_BF_COPY: Record<string, KitBfCopy> = {
  en: { title: 'Black Friday Kit', priceLine: '{price} · one-time', credits: '{credits} credits = {ads} “{format}” ads with your offer (e.g. 2 products × 5 variations; {per} credits each at Photo motion)', access: 'Studio Ads open until Dec 31: offer badge, end card and 1 · 3 · 5 variations', oneTime: 'One-time payment, no subscription', ends: 'On sale until Nov 30 · {d} days left', cta: 'Buy the kit — {price}', included: 'Included in your Business plan', includedNote: 'Your {plan} monthly credits cover the kit’s {ads} ads ({credits} credits). Nothing to buy.' },
  pt: { title: 'Kit Black Friday', priceLine: '{price} · pagamento único', credits: '{credits} créditos = {ads} anúncios “{format}” com a sua oferta (ex.: 2 produtos × 5 variações; {per} créditos cada no Photo motion)', access: 'Studio Ads aberto até 31/12: selo da oferta, cartão final e 1 · 3 · 5 variações', oneTime: 'Pagamento único, sem assinatura', ends: 'À venda até 30/11 · faltam {d} dias', cta: 'Comprar o kit — {price}', included: 'Incluído no seu plano Business', includedNote: 'Os {plan} créditos do seu mês cobrem os {ads} anúncios do kit ({credits} créditos). Nada a comprar.' },
  es: { title: 'Kit Black Friday', priceLine: '{price} · pago único', credits: '{credits} créditos = {ads} anuncios “{format}” con tu oferta (ej.: 2 productos × 5 variaciones; {per} créditos cada uno en Photo motion)', access: 'Studio Ads abierto hasta el 31/12: sello de oferta, tarjeta final y 1 · 3 · 5 variaciones', oneTime: 'Pago único, sin suscripción', ends: 'A la venta hasta el 30/11 · quedan {d} días', cta: 'Comprar el kit — {price}', included: 'Incluido en tu plan Business', includedNote: 'Los {plan} créditos de tu mes cubren los {ads} anuncios del kit ({credits} créditos). Nada que comprar.' },
  fr: { title: 'Kit Black Friday', priceLine: '{price} · paiement unique', credits: '{credits} crédits = {ads} pubs « {format} » avec votre offre (ex. : 2 produits × 5 variantes ; {per} crédits chacune en Photo motion)', access: 'Studio Ads ouvert jusqu’au 31/12 : badge d’offre, carte finale et 1 · 3 · 5 variantes', oneTime: 'Paiement unique, sans abonnement', ends: 'En vente jusqu’au 30/11 · encore {d} jours', cta: 'Acheter le kit — {price}', included: 'Inclus dans votre plan Business', includedNote: 'Les {plan} crédits de votre mois couvrent les {ads} pubs du kit ({credits} crédits). Rien à acheter.' },
  de: { title: 'Black-Friday-Kit', priceLine: '{price} · einmalig', credits: '{credits} Credits = {ads} Anzeigen „{format}“ mit Ihrem Angebot (z. B. 2 Produkte × 5 Varianten; je {per} Credits in Photo motion)', access: 'Studio Ads offen bis 31.12.: Angebots-Badge, Endkarte und 1 · 3 · 5 Varianten', oneTime: 'Einmalzahlung, kein Abo', ends: 'Erhältlich bis 30.11. · noch {d} Tage', cta: 'Kit kaufen — {price}', included: 'In Ihrem Business-Plan enthalten', includedNote: 'Ihre {plan} Monats-Credits decken die {ads} Anzeigen des Kits ({credits} Credits). Nichts zu kaufen.' },
  it: { title: 'Kit Black Friday', priceLine: '{price} · pagamento unico', credits: '{credits} crediti = {ads} annunci “{format}” con la tua offerta (es.: 2 prodotti × 5 varianti; {per} crediti ciascuno in Photo motion)', access: 'Studio Ads aperto fino al 31/12: badge dell’offerta, scheda finale e 1 · 3 · 5 varianti', oneTime: 'Pagamento unico, nessun abbonamento', ends: 'In vendita fino al 30/11 · mancano {d} giorni', cta: 'Compra il kit — {price}', included: 'Incluso nel tuo piano Business', includedNote: 'I {plan} crediti del tuo mese coprono i {ads} annunci del kit ({credits} crediti). Niente da comprare.' },
  nl: { title: 'Black Friday-kit', priceLine: '{price} · eenmalig', credits: '{credits} credits = {ads} advertenties “{format}” met je aanbieding (bv. 2 producten × 5 varianten; {per} credits per stuk in Photo motion)', access: 'Studio Ads open tot 31/12: aanbiedingsbadge, eindkaart en 1 · 3 · 5 varianten', oneTime: 'Eenmalige betaling, geen abonnement', ends: 'Te koop tot 30/11 · nog {d} dagen', cta: 'Koop de kit — {price}', included: 'Inbegrepen in je Business-plan', includedNote: 'Je {plan} maandcredits dekken de {ads} advertenties van de kit ({credits} credits). Niets te kopen.' },
  pl: { title: 'Zestaw Black Friday', priceLine: '{price} · płatność jednorazowa', credits: '{credits} kredytów = {ads} reklam „{format}” z Twoją ofertą (np. 2 produkty × 5 wariantów; {per} kredytów każda w Photo motion)', access: 'Studio Ads otwarte do 31.12: plakietka oferty, karta końcowa i 1 · 3 · 5 wariantów', oneTime: 'Płatność jednorazowa, bez subskrypcji', ends: 'W sprzedaży do 30.11 · zostało {d} dni', cta: 'Kup zestaw — {price}', included: 'W cenie Twojego planu Business', includedNote: 'Twoje {plan} kredytów miesięcznie pokrywa {ads} reklam zestawu ({credits} kredytów). Nic do kupienia.' },
  tr: { title: 'Black Friday kiti', priceLine: '{price} · tek seferlik', credits: '{credits} kredi = teklifinizle {ads} “{format}” reklamı (örn. 2 ürün × 5 varyasyon; Photo motion’da her biri {per} kredi)', access: 'Studio Ads 31/12’ye kadar açık: teklif rozeti, son kart ve 1 · 3 · 5 varyasyon', oneTime: 'Tek seferlik ödeme, abonelik yok', ends: '30/11’e kadar satışta · {d} gün kaldı', cta: 'Kiti satın al — {price}', included: 'Business planınıza dahil', includedNote: 'Aylık {plan} krediniz kitin {ads} reklamını karşılar ({credits} kredi). Satın alacak bir şey yok.' },
  ru: { title: 'Набор Black Friday', priceLine: '{price} · разовый платёж', credits: '{credits} кредитов = {ads} реклам «{format}» с вашим предложением (напр. 2 товара × 5 вариантов; по {per} кредитов в Photo motion)', access: 'Studio Ads открыт до 31.12: значок предложения, финальная карточка и 1 · 3 · 5 вариантов', oneTime: 'Разовый платёж, без подписки', ends: 'В продаже до 30.11 · осталось {d} дн.', cta: 'Купить набор — {price}', included: 'Входит в ваш план Business', includedNote: 'Ваши {plan} кредитов в месяц покрывают {ads} реклам набора ({credits} кредитов). Покупать ничего не нужно.' },
  uk: { title: 'Набір Black Friday', priceLine: '{price} · разовий платіж', credits: '{credits} кредитів = {ads} реклам «{format}» з вашою пропозицією (напр. 2 товари × 5 варіантів; по {per} кредитів у Photo motion)', access: 'Studio Ads відкритий до 31.12: значок пропозиції, фінальна картка і 1 · 3 · 5 варіантів', oneTime: 'Разовий платіж, без підписки', ends: 'У продажу до 30.11 · залишилось {d} дн.', cta: 'Купити набір — {price}', included: 'Входить у ваш план Business', includedNote: 'Ваші {plan} кредитів на місяць покривають {ads} реклам набору ({credits} кредитів). Купувати нічого не треба.' },
  ar: { title: 'مجموعة الجمعة البيضاء', priceLine: '{price} · دفعة واحدة', credits: '{credits} رصيد = {ads} إعلانات «{format}» مع عرضك (مثال: منتجان × 5 نسخ؛ {per} رصيد لكل إعلان في Photo motion)', access: 'Studio Ads مفتوح حتى 31/12: شارة العرض والبطاقة الأخيرة و1 · 3 · 5 نسخ', oneTime: 'دفعة واحدة، بلا اشتراك', ends: 'متاح حتى 30/11 · بقي {d} يومًا', cta: 'اشترِ المجموعة — {price}', included: 'مشمولة في خطة Business', includedNote: 'رصيدك الشهري ({plan}) يغطي إعلانات المجموعة الـ{ads} ({credits} رصيد). لا حاجة للشراء.' },
  ur: { title: 'بلیک فرائیڈے کٹ', priceLine: '{price} · ایک بار ادائیگی', credits: '{credits} کریڈٹ = آپ کی آفر کے ساتھ {ads} “{format}” اشتہار (مثلاً 2 پروڈکٹس × 5 ورژن؛ Photo motion میں ہر ایک {per} کریڈٹ)', access: 'Studio Ads 31/12 تک کھلا: آفر کا بیج، آخری کارڈ اور 1 · 3 · 5 ورژن', oneTime: 'ایک بار ادائیگی، کوئی سبسکرپشن نہیں', ends: '30/11 تک دستیاب · {d} دن باقی', cta: 'کٹ خریدیں — {price}', included: 'آپ کے Business پلان میں شامل', includedNote: 'آپ کے ماہانہ {plan} کریڈٹ کٹ کے {ads} اشتہار پورے کرتے ہیں ({credits} کریڈٹ)۔ کچھ خریدنے کی ضرورت نہیں۔' },
  hi: { title: 'ब्लैक फ़्राइडे किट', priceLine: '{price} · एक बार भुगतान', credits: '{credits} क्रेडिट = आपके ऑफ़र के साथ {ads} “{format}” विज्ञापन (जैसे 2 प्रोडक्ट × 5 वैरिएशन; Photo motion में हर एक {per} क्रेडिट)', access: 'Studio Ads 31/12 तक खुला: ऑफ़र बैज, आख़िरी कार्ड और 1 · 3 · 5 वैरिएशन', oneTime: 'एक बार भुगतान, कोई सब्सक्रिप्शन नहीं', ends: '30/11 तक बिक्री · {d} दिन बाक़ी', cta: 'किट ख़रीदें — {price}', included: 'आपके Business प्लान में शामिल', includedNote: 'आपके महीने के {plan} क्रेडिट किट के {ads} विज्ञापनों को कवर करते हैं ({credits} क्रेडिट)। कुछ ख़रीदने की ज़रूरत नहीं।' },
  id: { title: 'Kit Black Friday', priceLine: '{price} · sekali bayar', credits: '{credits} kredit = {ads} iklan “{format}” dengan penawaran Anda (mis. 2 produk × 5 variasi; {per} kredit per iklan di Photo motion)', access: 'Studio Ads terbuka hingga 31/12: lencana penawaran, kartu akhir, dan 1 · 3 · 5 variasi', oneTime: 'Sekali bayar, tanpa langganan', ends: 'Dijual hingga 30/11 · sisa {d} hari', cta: 'Beli kit — {price}', included: 'Termasuk dalam paket Business Anda', includedNote: '{plan} kredit bulanan Anda menutup {ads} iklan kit ({credits} kredit). Tidak perlu membeli.' },
  vi: { title: 'Bộ Black Friday', priceLine: '{price} · trả một lần', credits: '{credits} tín dụng = {ads} quảng cáo “{format}” có ưu đãi của bạn (vd: 2 sản phẩm × 5 biến thể; mỗi cái {per} tín dụng ở Photo motion)', access: 'Studio Ads mở đến 31/12: huy hiệu ưu đãi, thẻ cuối và 1 · 3 · 5 biến thể', oneTime: 'Trả một lần, không đăng ký', ends: 'Mở bán đến 30/11 · còn {d} ngày', cta: 'Mua bộ — {price}', included: 'Đã gồm trong gói Business', includedNote: '{plan} tín dụng mỗi tháng của bạn đủ cho {ads} quảng cáo của bộ ({credits} tín dụng). Không cần mua.' },
}

/** O nome do formato Close real em cada língua — ESPELHO de ADS_V2_FORMAT_COPY[lang].close_real.name (lib/ads/v2CloseReal.ts); o guardião confere. */
export const KIT_BF_FORMAT_NAME: Record<string, string> = {
  en: 'Real product close-up', pt: 'Close do produto real', es: 'Primer plano del producto real', fr: 'Gros plan du vrai produit',
  de: 'Nahaufnahme des echten Produkts', it: 'Primo piano del prodotto reale', nl: 'Close-up van het echte product', pl: 'Zbliżenie prawdziwego produktu',
  tr: 'Gerçek ürün yakın çekimi', ru: 'Крупный план реального товара', uk: 'Великий план справжнього товару', ar: 'لقطة قريبة للمنتج الحقيقي',
  ur: 'اصل پروڈکٹ کا کلوز اپ', hi: 'असली प्रोडक्ट का क्लोज़-अप', id: 'Close-up produk asli', vi: 'Cận cảnh sản phẩm thật',
}

const fill = (s: string, v: Record<string, string | number>): string => s.replace(/\{(\w+)\}/g, (m, k: string) => (k in v ? String(v[k]) : m))

/** As frases do cartão, já preenchidas com os números DAQUI (língua desconhecida = inglês). */
export function kitBfCardText(lang: string | null | undefined, d: number): { title: string; priceLine: string; bullets: [string, string, string]; ends: string; cta: string; included: string; includedNote: string } {
  const code = typeof lang === 'string' && KIT_BF_COPY[lang] ? lang : 'en'
  const c = KIT_BF_COPY[code]
  const price = kitBfPriceLabel()
  const v = { price, credits: KIT_BF_CREDITS, ads: KIT_BF_ADS, per: KIT_BF_AD_CREDITS, format: KIT_BF_FORMAT_NAME[code], d, plan: KIT_BF_BUSINESS_MONTHLY_CREDITS }
  return {
    title: c.title,
    priceLine: fill(c.priceLine, v),
    bullets: [fill(c.credits, v), fill(c.access, v), fill(c.oneTime, v)],
    ends: fill(c.ends, v),
    cta: fill(c.cta, v),
    included: c.included,
    includedNote: fill(c.includedNote, v),
  }
}
