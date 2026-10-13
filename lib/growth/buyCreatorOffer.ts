// KINEO-PAGINAS-QUE-VENDEM-2026-10-12 — o botão de COMPRA DIRETA das páginas que o ChatGPT cita.
//
// POR QUÊ (fundador 12/10, "tudo sim"): 7 de 9 compradores novos chegaram pela busca do ChatGPT citando estas páginas e
// pagaram em menos de 1 h, sem testar. As páginas citadas (/ai-video-generator/seedance, /state-of-ai-shorts-2026,
// /text-to-video-shorts, /free-ai-shorts-generator, /free-ai-shorts/<nicho>, /gerador-de-shorts-gratis) não tinham um
// botão que levasse direto ao checkout: o melhor caso era "See plans" → /pricing → cartão → checkout. Agora a primeira dobra
// tem "Get Creator" apontando para /api/stripe/checkout?tier=basic&billing=monthly — o MESMO link que o /pricing usa, que:
//   · aplica o WELCOME20 sozinho no Creator mensal sem outro desconto (KINEO-CLARITY-WELCOME20-2026-10-12, 'auto_banner');
//   · aceita convidado sem login (KINEO-COMPRA-SEM-LOGIN-2026-10-06 + KINEO-CUPOM-CONVIDADO-2026-10-07).
// Cada página leva `intent_campaign` próprio (buy_creator_<página>), para o payment_success dizer de onde veio a venda.
//
// REGRA DA CASA: nada digitado. Preço de TIER_PRICES, créditos de TIER_CREDITS, custo do filme de
// creditCostForDuration('cinematic_ai', pago, 60) e o desconto de WELCOME20_PERCENT_OFF — e os 20% só aparecem com o
// MESMO interruptor que liga o automático no servidor (WELCOME20_SITE_OFFER_LIVE). Desligou lá, some aqui no mesmo deploy.
// Módulo puro (sem servidor): entra no componente 'use client' e no guardião.
import { TIER_CREDITS, TIER_PRICES, formatCheckoutMoney } from '@/lib/checkoutPricing'
import { creditCostForDuration } from '@/lib/credits/engineCost'
import { WELCOME20_PERCENT_OFF, WELCOME20_SITE_OFFER_LIVE } from '@/lib/growth/publicPromoTruth'

export const BUY_CREATOR_VERSION = 'buy_creator_cta_v1' as const

/** Duração do filme da promessa ("4 films of 60 s"). */
export const BUY_CREATOR_FILM_SECONDS = 60

/** Filmes de 60 s do Seedance 1.5 que o grant mensal do Creator compra. Piso 1: nunca "0 films". */
export function creatorSeedanceFilms(): number {
  const cost = creditCostForDuration('cinematic_ai', true, BUY_CREATOR_FILM_SECONDS)
  if (!Number.isFinite(cost) || cost < 1) return 1
  return Math.max(1, Math.floor(TIER_CREDITS.basic / cost))
}

/** A campanha vira `intent_campaign` (o checkout aceita só [A-Za-z0-9._~-]{1,100}; fora disso, descarta). */
export function buyCreatorCampaign(page: string): string {
  const clean = page.toLowerCase().replace(/[^a-z0-9._~-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 80)
  return `buy_creator_${clean || 'page'}`
}

/** O link do checkout: Creator mensal, SEM ?promo= (o servidor aplica o WELCOME20 automático quando a oferta está viva). */
export function buyCreatorHref(page: string): string {
  return `/api/stripe/checkout?tier=basic&billing=monthly&intent_campaign=${encodeURIComponent(buyCreatorCampaign(page))}`
}

export interface BuyCreatorPrice {
  /** "$19.90" — o preço cheio do mês. */
  full: string
  /** "$15.92" com a oferta viva; null com o interruptor desligado (só o preço cheio aparece). */
  firstMonth: string | null
  percentOff: number | null
}

export function buyCreatorPrice(live: boolean = WELCOME20_SITE_OFFER_LIVE): BuyCreatorPrice {
  const fullMinor = TIER_PRICES.basic.usd
  if (!live) return { full: formatCheckoutMoney('usd', fullMinor), firstMonth: null, percentOff: null }
  const firstMinor = Math.round((fullMinor * (100 - WELCOME20_PERCENT_OFF)) / 100)
  return {
    full: formatCheckoutMoney('usd', fullMinor),
    firstMonth: formatCheckoutMoney('usd', firstMinor),
    percentOff: WELCOME20_PERCENT_OFF,
  }
}

// KINEO-PAGINAS-LOTE1-2026-10-12 — 'es' para a porta /generador-de-videos-de-terror (mesmos números, só a língua muda).
export type BuyCreatorLang = 'en' | 'pt' | 'es'

export interface BuyCreatorCopy {
  button: string
  priceLine: string
  note: string
}

/** As frases do botão (en/pt), montadas dos números acima. */
export function buyCreatorCopy(lang: BuyCreatorLang = 'en', live: boolean = WELCOME20_SITE_OFFER_LIVE): BuyCreatorCopy {
  const films = creatorSeedanceFilms()
  const price = buyCreatorPrice(live)
  const s = BUY_CREATOR_FILM_SECONDS
  if (lang === 'pt') {
    return {
      button: price.firstMonth
        ? `Assinar Creator — ${price.percentOff}% off no 1º mês · ${films} filmes de ${s} s`
        : `Assinar Creator · ${films} filmes de ${s} s`,
      priceLine: price.firstMonth
        ? `${price.firstMonth} no 1º mês, depois ${price.full}/mês`
        : `${price.full}/mês`,
      note: `${TIER_CREDITS.basic} créditos por mês = ${films} filmes de ${s} s no Seedance 1.5, sem marca d’água. Cancele quando quiser. Preço de referência em USD; no Brasil a cobrança normalmente é em reais.`,
    }
  }
  if (lang === 'es') {
    return {
      button: price.firstMonth
        ? `Suscribirme a Creator — ${price.percentOff}% de descuento el 1er mes · ${films} videos de ${s} s`
        : `Suscribirme a Creator · ${films} videos de ${s} s`,
      priceLine: price.firstMonth
        ? `${price.firstMonth} el primer mes, después ${price.full}/mes`
        : `${price.full}/mes`,
      note: `${TIER_CREDITS.basic} créditos al mes = ${films} videos de ${s} s en Seedance 1.5, sin marca de agua. Cancela cuando quieras. Precio de referencia en USD.`,
    }
  }
  return {
    button: price.firstMonth
      ? `Get Creator — ${price.percentOff}% off your 1st month · ${films} films of ${s} s`
      : `Get Creator · ${films} films of ${s} s`,
    priceLine: price.firstMonth
      ? `${price.firstMonth} for the first month, then ${price.full}/month`
      : `${price.full}/month`,
    note: `${TIER_CREDITS.basic} credits a month = ${films} watermark-free ${s}-second films on Seedance 1.5. Cancel anytime.`,
  }
}
