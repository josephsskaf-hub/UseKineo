// KINEO-BF-CAMPAIGN-2810 — editable starting points, never an offer, entitlement or render instruction from the URL.
export const BF_TEMPLATE_IDS = ['flash-sale', 'countdown', 'product-discount'] as const
export type BfTemplateId = (typeof BF_TEMPLATE_IDS)[number]
export type BfLanguage = 'en' | 'pt' | 'es'
export type BfCampaign = { id: BfTemplateId; lang: BfLanguage }
type BfTemplate = { title: string; description: string; frase: string; cta: string; hint: string }

const COPY: Record<BfLanguage, Record<BfTemplateId, BfTemplate>> = {
  en: {
    'flash-sale': { title: 'Flash sale', description: 'Introduce your product; show the real offer and deadline in the final visual text.', frase: '[PRODUCT]. Lead with one real product benefit, introduce the product, and finish with a direct call to action. Keep the offer and dates in the final visual text only, not the voiceover.', cta: 'Shop the product', hint: 'Replace [PRODUCT] and describe a real benefit. Enter your real offer and end date for the final visual text; the voiceover introduces the product and CTA. Use only for a genuine limited-time promotion.' },
    countdown: { title: 'Countdown', description: 'Show the confirmed promotion date in the final visual text, without an animated timer.', frase: '[PRODUCT]. Introduce the product, explain one real benefit, and invite viewers to discover it. Keep the offer and dates in the final visual text only, not the voiceover.', cta: 'Discover the product', hint: 'Replace [PRODUCT] and describe your product. Enter your real offer and start or end date in the offer field for the final visual text. The voiceover covers the product and CTA; no spoken deadline or animated timer.' },
    'product-discount': { title: 'Product + discount', description: 'Lead with the product benefit; show your confirmed discount in the final visual text.', frase: '[PRODUCT]. Show what the product is and explain its main real benefit, then invite viewers to shop. Keep the discount in the final visual text only, not the voiceover.', cta: 'Shop the product', hint: 'Replace [PRODUCT] and describe its real benefit. Enter your actual discount for the final visual text. The voiceover covers the product and CTA; no discount is preselected or spoken.' },
  },
  pt: {
    'flash-sale': { title: 'Oferta relâmpago', description: 'Apresente o produto; mostre oferta e prazo reais no texto visual final.', frase: '[PRODUTO]. Comece por um benefício real, apresente o produto e termine com uma chamada direta. Oferta e datas apenas no texto visual final, nunca na narração.', cta: 'Conheça o produto', hint: 'Substitua [PRODUTO] e descreva um benefício real. Informe oferta e prazo reais para o texto visual final; a voz apresenta produto e chamada. Use apenas para uma promoção com duração limitada de verdade.' },
    countdown: { title: 'Contagem regressiva', description: 'Mostre a data confirmada da promoção no texto visual final, sem relógio animado.', frase: '[PRODUTO]. Apresente o produto, explique um benefício real e convide o público a conhecê-lo. Oferta e datas apenas no texto visual final, nunca na narração.', cta: 'Conheça o produto', hint: 'Substitua [PRODUTO] e descreva-o. Informe oferta real e data de início ou fim no campo Oferta para o texto visual final. A voz apresenta produto e chamada; sem prazo falado ou relógio animado.' },
    'product-discount': { title: 'Produto + desconto', description: 'Destaque o benefício; mostre o desconto confirmado no texto visual final.', frase: '[PRODUTO]. Mostre o que é o produto e explique seu principal benefício real, depois convide o público a comprar. Desconto apenas no texto visual final, nunca na narração.', cta: 'Conheça o produto', hint: 'Substitua [PRODUTO] e descreva o benefício real. Informe seu desconto real para o texto visual final. A voz apresenta produto e chamada; nenhum desconto vem selecionado ou é falado.' },
  },
  es: {
    'flash-sale': { title: 'Oferta relámpago', description: 'Presenta el producto; muestra tu oferta y fecha reales en el texto visual final.', frase: '[PRODUCTO]. Empieza con un beneficio real, presenta el producto y termina con una llamada directa. Oferta y fechas solo en el texto visual final, nunca en la voz.', cta: 'Descubre el producto', hint: 'Sustituye [PRODUCTO] y describe un beneficio real. Introduce la oferta y fecha reales para el texto visual final; la voz presenta el producto y la llamada. Úsala solo para una promoción de duración limitada real.' },
    countdown: { title: 'Cuenta atrás', description: 'Muestra la fecha confirmada de la promoción en el texto visual final, sin reloj animado.', frase: '[PRODUCTO]. Presenta el producto, explica un beneficio real e invita a descubrirlo. Oferta y fechas solo en el texto visual final, nunca en la voz.', cta: 'Descubre el producto', hint: 'Sustituye [PRODUCTO] y descríbelo. Introduce la oferta real y fecha de inicio o fin en el campo Oferta para el texto visual final. La voz presenta producto y llamada; sin fecha hablada ni reloj animado.' },
    'product-discount': { title: 'Producto + descuento', description: 'Destaca el beneficio; muestra tu descuento confirmado en el texto visual final.', frase: '[PRODUCTO]. Presenta el producto y explica su principal beneficio real, luego invita a comprar. Descuento solo en el texto visual final, nunca en la voz.', cta: 'Descubre el producto', hint: 'Sustituye [PRODUCTO] y describe su beneficio real. Introduce tu descuento real para el texto visual final. La voz presenta producto y llamada; ningún descuento viene seleccionado ni se pronuncia.' },
  },
}

export function bfTemplate(lang: BfLanguage, id: BfTemplateId): BfTemplate { return COPY[lang][id] }

export function bfCampaignFromQuery(query: URLSearchParams): BfCampaign | null {
  const id = query.get('bf_template'), lang = query.get('bf_lang') ?? 'en'
  if (!(BF_TEMPLATE_IDS as readonly string[]).includes(id ?? '') || !['en', 'pt', 'es'].includes(lang)) return null
  return { id: id as BfTemplateId, lang: lang as BfLanguage }
}

export function bfTemplateHref(lang: BfLanguage, id: BfTemplateId): string {
  return `/ads/v2?${new URLSearchParams({ entry: 'product', bf_template: id, bf_lang: lang, utm_source: 'seo', utm_medium: 'black_friday', utm_campaign: `black_friday_kit_${lang}` })}`
}

/** A template starts its own draft without deleting or replacing the visitor's previous order. Explicit order always wins. */
export function bfDraftStorageKey(ownerKey: string, query: URLSearchParams): string {
  const base = `kineo:ads-escolha:v1:${ownerKey}`
  const campaign = bfCampaignFromQuery(query)
  return campaign && !/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(query.get('order') ?? '') ? `${base}:bf:${campaign.id}:${campaign.lang}` : base
}

/** No automatic API call, fabricated discount or usable placeholder can leave the editor. */
export function bfTemplateReady(campaign: BfCampaign | null, form: { frase: string; oferta: string; beneficios: string; cta: string }): boolean {
  return !campaign || (!!form.oferta.trim() && !/\[(?:PRODUCT|PRODUTO|PRODUCTO)\]/i.test([form.frase, form.oferta, form.beneficios, form.cta].join(' ')))
}
