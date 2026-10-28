// KINEO-BF-CAMPAIGN-2810 — editable starting points, never an offer, entitlement or render instruction from the URL.
export const BF_TEMPLATE_IDS = ['flash-sale', 'countdown', 'product-discount'] as const
export type BfTemplateId = (typeof BF_TEMPLATE_IDS)[number]
export type BfLanguage = 'en' | 'pt' | 'es'
export type BfCampaign = { id: BfTemplateId; lang: BfLanguage }
type BfTemplate = { title: string; description: string; frase: string; cta: string; hint: string }

const COPY: Record<BfLanguage, Record<BfTemplateId, BfTemplate>> = {
  en: {
    'flash-sale': { title: 'Flash sale', description: 'Lead with your real offer and its confirmed end date.', frase: '[PRODUCT] — Black Friday flash sale. Lead with my confirmed offer, then introduce the product.', cta: 'Shop the offer', hint: 'Replace [PRODUCT] with your product and describe it. Enter your real offer and end date. Use only for a genuine limited-time promotion.' },
    countdown: { title: 'Countdown', description: 'Build anticipation with your promotion’s confirmed dates.', frase: '[PRODUCT] — Black Friday countdown. Build anticipation around my confirmed promotion date, then introduce the product.', cta: 'Explore the offer', hint: 'Replace [PRODUCT] with your product and describe it. Enter your real offer and start or end date. The date goes in the script; this is not an animated timer.' },
    'product-discount': { title: 'Product + discount', description: 'Introduce the product, then the discount you actually offer.', frase: '[PRODUCT] — Black Friday. Introduce the product and its main benefit, then my confirmed discount.', cta: 'Shop the product', hint: 'Replace [PRODUCT] with your product and describe its real benefit. Enter the discount you actually offer. No discount is selected for you.' },
  },
  pt: {
    'flash-sale': { title: 'Oferta relâmpago', description: 'Comece pela oferta real e pelo prazo confirmado.', frase: '[PRODUTO] — oferta relâmpago de Black Friday. Comece pela minha oferta confirmada e apresente o produto.', cta: 'Confira a oferta', hint: 'Substitua [PRODUTO] pelo seu produto e descreva-o. Informe a oferta real e o prazo. Use apenas para uma promoção com duração limitada de verdade.' },
    countdown: { title: 'Contagem regressiva', description: 'Prepare o público com as datas confirmadas da promoção.', frase: '[PRODUTO] — contagem regressiva para a Black Friday. Prepare o público para a data confirmada da minha promoção e apresente o produto.', cta: 'Conheça a oferta', hint: 'Substitua [PRODUTO] pelo seu produto e descreva-o. Informe a oferta real e a data de início ou fim. A data vai no roteiro; não é um relógio animado.' },
    'product-discount': { title: 'Produto + desconto', description: 'Apresente o produto e o desconto que você realmente oferece.', frase: '[PRODUTO] — Black Friday. Apresente o produto e seu principal benefício, depois o meu desconto confirmado.', cta: 'Conheça o produto', hint: 'Substitua [PRODUTO] pelo seu produto e descreva o benefício real. Informe o desconto que você realmente oferece. Nenhum desconto vem selecionado.' },
  },
  es: {
    'flash-sale': { title: 'Oferta relámpago', description: 'Empieza con tu oferta real y su fecha de finalización confirmada.', frase: '[PRODUCTO] — oferta relámpago de Black Friday. Empieza con mi oferta confirmada y presenta el producto.', cta: 'Descubre la oferta', hint: 'Sustituye [PRODUCTO] por tu producto y descríbelo. Introduce la oferta real y su fecha de finalización. Úsala solo para una promoción de duración limitada real.' },
    countdown: { title: 'Cuenta atrás', description: 'Genera expectación con las fechas confirmadas de tu promoción.', frase: '[PRODUCTO] — cuenta atrás para el Black Friday. Genera expectación en torno a la fecha confirmada de mi promoción y presenta el producto.', cta: 'Explora la oferta', hint: 'Sustituye [PRODUCTO] por tu producto y descríbelo. Introduce la oferta real y la fecha de inicio o fin. La fecha va en el guion; no es un reloj animado.' },
    'product-discount': { title: 'Producto + descuento', description: 'Presenta el producto y el descuento que realmente ofreces.', frase: '[PRODUCTO] — Black Friday. Presenta el producto y su principal beneficio, luego mi descuento confirmado.', cta: 'Descubre el producto', hint: 'Sustituye [PRODUCTO] por tu producto y describe su beneficio real. Introduce el descuento que realmente ofreces. No hay un descuento preseleccionado.' },
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

/** No automatic API call, fabricated discount or usable placeholder can leave the editor. */
export function bfTemplateReady(campaign: BfCampaign | null, form: { frase: string; oferta: string; beneficios: string; cta: string }): boolean {
  return !campaign || (!!form.oferta.trim() && !/\[(?:PRODUCT|PRODUTO|PRODUCTO)\]/i.test([form.frase, form.oferta, form.beneficios, form.cta].join(' ')))
}
