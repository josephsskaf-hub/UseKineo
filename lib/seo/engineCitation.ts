// KINEO-MOTORES-GEO-2026-10-06 — as páginas de motor feitas para o ChatGPT CITAR (TAREFA 12, slug motores-geo2).
//
// POR QUE ESTE MÓDULO EXISTE (medido pela sessão CEO, 60–90 dias, contas internas fora): utm_source=chatgpt trouxe
// 616 cadastros e 8 dos 11 pagantes; dentro dele, quem chega pela página de um motor PREMIUM paga (seo_engine_seedance
// 46 → 2, seo_engine_veo 3 → 1) e quem chega pelas páginas de "grátis" não paga (seo_engine_kineo-1 108 → 0). Quem
// pergunta ao ChatGPT "onde usar o Veo 3.1 online e quanto custa por vídeo" é comprador — e as nossas páginas não
// respondiam isso na primeira frase, não davam o preço do clipe de 5 s nem comparavam com assinar o fornecedor.
//
// O QUE ELE DÁ: para cada motor, a resposta citável (primeira frase), a tabela de preço por vídeo (clipe de ~5 s,
// filme narrado de 35 s e de 60 s, com quantos cabem em cada plano), a comparação com usar o modelo direto (só fato
// conferido em página oficial, datado) e as frases corrigidas da página (tempo de entrega, acesso, CTA).
//
// NENHUM PREÇO DIGITADO: crédito do clipe = clipCreditCost (lib/clips/clipPricing.ts, o que a rota /api/clips cobra);
// crédito do filme = creditCostForDuration (lib/credits/engineCost.ts, o que o /api/generate-video-cinematic cobra);
// duração do clipe = clipSecondsForTarget (a MESMA régua do /pricing); planos chegam por argumento (TIER_PRICES /
// TIER_CREDITS de lib/checkoutPricing.ts, montados em lib/growth/enginePageCatalog.ts). Preço de terceiro vem de
// lib/clips/clipPriceVsMarket.ts (fonte + URL + data) ou da tabela FONTES_DIRETAS abaixo (URL + data da leitura).
//
// MÓDULO PURO: só imports RELATIVOS de módulos puros — o guardião scripts/test-motores-geo-2026-10-06.mjs o executa
// isolado, sem rede, e prova cada número contra a função que cobra.
import { isClipEngineKey, offeredSecondsFor, type ClipEngineKey } from '../clips/clipCatalog'
import { CLIP_COSTS, clipCreditCost } from '../clips/clipPricing'
import { MARKET_QUOTES, type MarketQuote } from '../clips/clipPriceVsMarket'
import { creditCostForDuration, type Quality } from '../credits/engineCost'
import { supportedDurationsFor } from '../durationByEngine'
import { clipSecondsForTarget } from '../pricingTwoProducts'

/** Marca desta mudança (os guardiões alheios reancorados procuram por ela). */
export const ENGINE_GEO_MARK = 'KINEO-MOTORES-GEO-2026-10-06'
/** Data real da revisão das páginas (o sitemap publica esta data como lastmod das páginas tocadas). */
export const ENGINE_GEO_REVIEWED_ISO = '2026-10-06'

/** A frase da marca (decidida pela sessão CEO em 06/10) — linha de apoio do CTA. */
export const ENGINE_GEO_BRAND_LINE = 'Type one sentence. Get a finished 60-second video — voice, captions and music included — in minutes.'
/** Fato de apoio permitido. Nunca dizer que o vídeo "se qualifica" para monetização. */
export const ENGINE_GEO_REWARDS_LINE = "60 seconds+ is the length TikTok's Creator Rewards pays for."
/**
 * Tempo honesto de um filme narrado num motor de cena gerada (sessão CEO 06/10: "filme de motor premium leva 8–25
 * min"). Faixa, nunca tempo exato: a página antiga dizia "3–7 minutes" em TODO motor — verdade só para o Kineo 1.
 */
export const ENGINE_GEO_FILM_MINUTES = { min: 8, max: 25 } as const
/** O alvo do clipe na tabela (a duração REAL sai de clipSecondsForTarget: o Veo entrega 6 s, nunca "5 s"). */
export const ENGINE_GEO_CLIP_TARGET = 5
/** As durações de filme da tabela (norte da casa: 35 / 60). */
export const ENGINE_GEO_FILM_SECONDS = [35, 60] as const

const MESES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
/** '2026-10-06' → 'October 2026'. */
export function monthYear(iso: string): string {
  const [y, m] = iso.split('-').map(Number)
  return y && m >= 1 && m <= 12 ? `${MESES[m - 1]} ${y}` : iso
}
/** '2026-09-15' → '15 September 2026'. */
export function dayMonthYear(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return y && m >= 1 && m <= 12 && d ? `${d} ${MESES[m - 1]} ${y}` : iso
}
/** 1993 → '$19.93' (sempre com centavos: é preço por vídeo, não mensalidade redonda). */
export function usd(cents: number): string {
  return `$${(Math.round(cents) / 100).toFixed(2)}`
}
/** Mensalidade: '$15' quando redonda, '$12.90' quando tem centavos (mesma régua de lib/marketingPrice usdLabel). */
export function money(cents: number): string {
  return cents % 100 === 0 ? `$${cents / 100}` : usd(cents)
}

export type CitationTier = 'starter' | 'basic' | 'pro'
/** Um plano mensal como o checkout o cobra (montado de TIER_PRICES/TIER_CREDITS por quem chama). */
export interface CitationPlan { tier: CitationTier; label: string; usdCents: number; credits: number }
/** O que o trial dá hoje (montado de lib/freeTierOffer.ts por quem chama). */
export interface CitationTrial { credits: number; countryClause: string; freeFilmLabel: string; freeFilmCredits: number }

export interface CitationPriceRow {
  key: 'clip' | 'film35' | 'film60'
  seconds: number
  credits: number
  /** ≈ US$ no preço do crédito do plano de referência (Creator — a mesma régua do /pricing). */
  usdCents: number
  /** Quantos cabem no grant mensal de cada plano (arredondado para baixo). */
  perPlan: { tier: CitationTier; label: string; count: number }[]
}

export interface DirectRoute {
  who: string
  kind: 'subscription' | 'developer_api'
  terms: string
  /** ≈ US$ por um clipe cru da MESMA duração do clipe da Kineo; null = a fonte não dá número conferível. */
  clipUsdCents: number | null
  seconds: number
  sources: { label: string; url: string }[]
  checkedOn: string
}

// ─── Fontes diretas conferidas (só página oficial; data da leitura) ───────────────────────────────────────────────
// Runway: planos e créditos por segundo vêm de lib/clips/clipPriceVsMarket.ts (MARKET_QUOTES, oficial, 05/10) e foram
// relidos em 06/10 em runway.com/pricing (Standard US$ 15/mês, 625 créditos) e academy.runwayml.com/models-pricing
// (Kling 3.0 Pro sem áudio 12/s; Kling 2.5 Turbo Pro 12–15/s; MiniMax H3 10/s; Seedance 2.5 20/s) — mesmos números.
// Google: preço do Veo 3.1 Fast na Gemini API lido em 06/10 em ai.google.dev/gemini-api/docs/pricing ("$0.10" por
// segundo na menor resolução, áudio incluído por padrão; página atualizada em 2026-10-01).
// Kling (app próprio): a página oficial mostra preço promocional e preço cheio diferentes (06/10) — sem número aqui.
// ByteDance (Seedance 1.5 Pro): vendido a desenvolvedores pela API BytePlus ModelArk; nenhum preço de consumidor por
// vídeo conferido em página oficial — a página diz isso em vez de inventar.
export const FONTES_DIRETAS = {
  geminiVeoFast: {
    usdPerSecondFrom: 0.1,
    url: 'https://ai.google.dev/gemini-api/docs/pricing',
    checkedOn: '2026-10-06',
    pageUpdatedOn: '2026-10-01',
  },
  klingApp: {
    url: 'https://app.klingai.com/global/membership/membership-plan',
    checkedOn: '2026-10-06',
  },
  byteplusModelArk: {
    url: 'https://www.byteplus.com/en/product/modelark',
    checkedOn: '2026-10-06',
  },
} as const

function quote(id: string): MarketQuote {
  const q = MARKET_QUOTES.find((x) => x.id === id)
  if (!q || q.source !== 'oficial' || q.plan.source !== 'oficial') throw new Error(`engineCitation: cotação oficial ausente ${id}`)
  return q
}

function runwayRoute(id: string, modelText: string, seconds: number): DirectRoute {
  const q = quote(id)
  return {
    who: `${q.plan.competitor} (${q.plan.plan} plan)`,
    kind: 'subscription',
    terms: `${money(q.plan.usdCentsMonthly)}/month for ${q.plan.creditsMonthly} credits; ${modelText} uses ${q.creditsPerSecond} credits per second`,
    clipUsdCents: Math.round((q.creditsPerSecond * seconds * q.plan.usdCentsMonthly) / q.plan.creditsMonthly),
    seconds,
    sources: [
      { label: `${q.plan.competitor} plans`, url: q.plan.url },
      { label: `${q.plan.competitor} credits per model`, url: q.url },
    ],
    checkedOn: q.checkedOn,
  }
}

function geminiVeoRoute(seconds: number): DirectRoute {
  const g = FONTES_DIRETAS.geminiVeoFast
  return {
    who: 'Google Gemini API (developers)',
    kind: 'developer_api',
    terms: `Veo 3.1 Fast from ${usd(g.usdPerSecondFrom * 100)} per second of video, audio included (Google’s price list, updated ${dayMonthYear(g.pageUpdatedOn)})`,
    clipUsdCents: Math.round(g.usdPerSecondFrom * seconds * 100),
    seconds,
    sources: [{ label: 'Gemini API pricing', url: g.url }],
    checkedOn: g.checkedOn,
  }
}

function klingAppRoute(seconds: number): DirectRoute {
  const k = FONTES_DIRETAS.klingApp
  return {
    who: 'Kling’s own app (klingai.com)',
    kind: 'subscription',
    terms: 'monthly credit plans whose prices change with promotions — compare the current offer there',
    clipUsdCents: null,
    seconds,
    sources: [{ label: 'Kling plans', url: k.url }],
    checkedOn: k.checkedOn,
  }
}

interface EngineProfile {
  /** Complemento da primeira frase: quem é o modelo real que roda (selo honesto: o nome do fornecedor). */
  modelLine: string
  direct: (seconds: number) => DirectRoute[]
  /** Quando não há preço direto conferível, a página diz isso (com a fonte) em vez de inventar. */
  directNote?: { text: string; source: { label: string; url: string }; checkedOn: string }
}

const PROFILES: Record<ClipEngineKey, EngineProfile> = {
  seedance: {
    modelLine: ', which runs ByteDance’s Seedance 1.5 Pro',
    direct: () => [],
    directNote: {
      text: 'ByteDance sells Seedance 1.5 Pro to developers through its BytePlus ModelArk API; we did not find an official consumer price per video to compare',
      source: { label: 'BytePlus ModelArk', url: FONTES_DIRETAS.byteplusModelArk.url },
      checkedOn: FONTES_DIRETAS.byteplusModelArk.checkedOn,
    },
  },
  kling: {
    modelLine: ', which runs Kling 2.5 Turbo Pro',
    direct: (s) => [runwayRoute('runway-k25-standard', 'Kling 2.5 Turbo Pro at its highest resolution', s), klingAppRoute(s)],
  },
  veo: {
    modelLine: ', which runs Google’s Veo 3.1 Fast',
    direct: (s) => [geminiVeoRoute(s)],
  },
  hollywood: {
    modelLine: ', which runs Kling 3.0 Pro',
    direct: (s) => [runwayRoute('runway-k3-standard', 'Kling 3.0 Pro without audio', s), klingAppRoute(s)],
  },
  h3: {
    modelLine: ', which runs MiniMax H3 (MiniMax is the company behind Hailuo AI)',
    direct: (s) => [runwayRoute('runway-h3-standard', 'MiniMax H3 at its standard resolution', s)],
  },
  omni: {
    modelLine: ', which runs Google’s Gemini Omni Flash',
    direct: () => [],
  },
  s25: {
    modelLine: ', which runs ByteDance’s Seedance 2.5',
    direct: (s) => [runwayRoute('runway-s25-standard', 'Seedance 2.5 at its lowest resolution', s)],
  },
}

/**
 * KINEO-S25-ABRE-2026-10-06 — quem pode usar o motor e se o clipe avulso dele está à venda. O padrão (OPEN_ACCESS) é o de
 * todo motor até 06/10 e deixa o texto byte a byte igual; o Seedance 2.5 volta como motor PAGO EXTRA (o servidor recusa o
 * trial e a conta grátis — lib/s25Access.ts) e, com o clipe dele desligado, sem clipe avulso para o público: a página não pode
 * dizer "New accounts start with N free credits" como se o trial o abrisse, nem anunciar preço de um clipe que não se vende.
 * KINEO-S25-CLIPES-2026-10-06 — quem decide clipOnSale do 2.5 é o interruptor único do clipe (lib/clips/clipLaunch.ts
 * CLIP_S25_PUBLIC, lido em lib/growth/enginePageCatalog.ts accessFor); este módulo segue sem ler interruptor nenhum.
 */
export interface CitationAccess {
  /** Só plano pago usa o motor (o trial e a conta grátis, não). */
  paidPlansOnly: boolean
  /** O clipe avulso do motor está à venda para o público (/clips)? false = nenhuma linha/preço de clipe. */
  clipOnSale: boolean
}
export const OPEN_ACCESS: CitationAccess = { paidPlansOnly: false, clipOnSale: true }

export interface EngineCitation {
  slug: string
  key: ClipEngineKey
  name: string
  quality: Quality
  reviewedOn: string
  reviewedLabel: string
  reference: CitationPlan
  plans: CitationPlan[]
  /** clip = null quando o clipe avulso do motor não está à venda para o público (KINEO-S25-ABRE-2026-10-06). */
  rows: { clip: CitationPriceRow | null; film35: CitationPriceRow; film60: CitationPriceRow }
  /** Só plano pago usa o motor (KINEO-S25-ABRE-2026-10-06). */
  paidPlansOnly: boolean
  /**
   * KINEO-S25-CLIPES-2026-10-06 — "<motor> clips from N credits (paid plans)": só para motor de plano pago COM clipe à venda
   * (o Seedance 2.5 com o interruptor do clipe ligado); N = o clipe mais barato que o catálogo oferece. null nos outros casos.
   */
  clipFromLine: string | null
  smallestPlanFor60: CitationPlan | null
  direct: DirectRoute[]
  directNote: EngineProfile['directNote'] | null
  directCheckedLabel: string
  /** A primeira frase depois do H1: onde usar o motor online e quanto custa por vídeo. */
  answerLead: string
  planLine: string
  accessNote: string
  turnaround: string
  howStep3: string
  costsNote: string
  finalLine: string
  ctaLabel: string
  /** "Onde usar + quanto custa" numa entrada (vai para a FAQ e o FAQPage JSON-LD da página do motor). */
  faqWhereCost: { q: string; a: string }
  /** "É mais barato direto?" — só quando há preço direto conferido. */
  faqDirect: { q: string; a: string } | null
}

/**
 * A camada citável de UM motor. null = o motor não tem clipe/filme na tabela da casa (ex.: Kineo 1) ou falta o plano
 * de referência. QUEM decide se a página é indexável (pausa, interruptor de lançamento, aposentadoria) é quem chama —
 * este módulo não lê interruptor nenhum.
 */
export function buildEngineCitation(input: {
  slug: string
  key: string
  name: string
  plans: readonly CitationPlan[]
  trial: CitationTrial
  /** KINEO-S25-ABRE-2026-10-06 — ausente = OPEN_ACCESS (o texto de todo motor até 06/10, intacto). */
  access?: CitationAccess
}): EngineCitation | null {
  const access = input.access ?? OPEN_ACCESS
  if (!isClipEngineKey(input.key)) return null
  const key = input.key
  const quality = CLIP_COSTS[key].filmQuality as Quality
  const plans = [...input.plans].sort((a, b) => a.credits - b.credits)
  const reference = plans.find((p) => p.tier === 'basic')
  if (!reference || reference.credits <= 0) return null
  const clipSeconds = clipSecondsForTarget(key, ENGINE_GEO_CLIP_TARGET)
  if (clipSeconds === null) return null
  const filmsOk = ENGINE_GEO_FILM_SECONDS.every((s) => supportedDurationsFor(key).includes(s))
  if (!filmsOk) return null

  const centsFor = (credits: number) => Math.round((credits * reference.usdCents) / reference.credits)
  const row = (k: CitationPriceRow['key'], seconds: number, credits: number): CitationPriceRow => ({
    key: k,
    seconds,
    credits,
    usdCents: centsFor(credits),
    perPlan: plans.map((p) => ({ tier: p.tier, label: p.label, count: credits > 0 ? Math.floor(p.credits / credits) : 0 })),
  })
  const clip = row('clip', clipSeconds, clipCreditCost(key, clipSeconds, false))
  const film35 = row('film35', 35, creditCostForDuration(quality, true, 35))
  const film60 = row('film60', 60, creditCostForDuration(quality, true, 60))
  const smallestPlanFor60 = plans.find((p) => p.credits >= film60.credits) ?? null

  const profile = PROFILES[key]
  const direct = profile.direct(clip.seconds)
  const checked = [...direct.map((r) => r.checkedOn), ...(profile.directNote ? [profile.directNote.checkedOn] : [])].sort()
  const directCheckedLabel = checked.length ? monthYear(checked[checked.length - 1]) : monthYear(ENGINE_GEO_REVIEWED_ISO)

  const name = input.name
  const t = input.trial
  const minutes = `${ENGINE_GEO_FILM_MINUTES.min}–${ENGINE_GEO_FILM_MINUTES.max} minutes`
  const smallestSentence = smallestPlanFor60
    ? `The smallest plan that covers one 60-second ${name} video is ${smallestPlanFor60.label} at ${usd(smallestPlanFor60.usdCents)}/month.`
    : `No single monthly plan covers a 60-second ${name} video on its own.`
  const smallestMonthlySentence = smallestPlanFor60
    ? `The smallest monthly plan that covers a 60-second ${name} video is ${smallestPlanFor60.label} (${usd(smallestPlanFor60.usdCents)}/month).`
    : smallestSentence
  const trialOptions = [
    ...(access.clipOnSale && clip.credits <= t.credits ? [`one ${clip.seconds}-second ${name} clip`] : []), // KINEO-S25-ABRE-2026-10-06: clipe que não se vende não entra
    ...(t.freeFilmCredits <= t.credits ? [`the ${t.freeFilmLabel}`] : []),
  ]
  const trialSentence = trialOptions.length
    ? `New accounts${t.countryClause} start with ${t.credits} free credits — enough for ${trialOptions.join(' or ')}, not for a 60-second ${name} video.`
    : `New accounts${t.countryClause} start with ${t.credits} free credits — not enough for a ${name} clip or video.`
  // KINEO-S25-ABRE-2026-10-06 — motor só de plano pago e/ou sem clipe avulso à venda: as frases dizem isso (nunca o trial
  // como porta, nunca preço de clipe que não se vende). Com OPEN_ACCESS, `pago` = '' e `clipeAVenda` = o clipe: o texto de
  // todo motor até 06/10 sai byte a byte igual.
  const pago = access.paidPlansOnly ? ', on any paid plan' : ''
  const clipeAVenda = access.clipOnSale ? clip : null
  // KINEO-S25-CLIPES-2026-10-06 — motor de plano pago com clipe à venda: a frase curta que a página e o llms.txt citam. N = o
  // clipe mais barato do catálogo (clipCreditCost em cada duração oferecida — o número que a rota /api/clips cobra), nunca
  // digitado. Motor aberto ao trial: null, e o texto dele segue byte a byte igual.
  const clipFromLine = clipeAVenda && access.paidPlansOnly
    ? `${name} clips from ${Math.min(...offeredSecondsFor(key).map((s) => clipCreditCost(key, s, false)))} credits (paid plans)`
    : null
  const answerLead = clipeAVenda
    ? `You can use ${name} online in Kineo Studio${profile.modelLine}${pago}: a ${clip.seconds}-second ${name} clip costs ${clip.credits} credits ` +
      `(about ${usd(clip.usdCents)}), and a finished 60-second ${name} video with voice, captions and music costs ${film60.credits} credits ` +
      `(about ${usd(film60.usdCents)}).`
    : `You can use ${name} online in Kineo Studio${profile.modelLine}${pago}: a finished ${name} video with voice, captions and music costs ` +
      `${film35.credits} credits for 35 seconds (about ${usd(film35.usdCents)}) or ${film60.credits} credits for 60 seconds (about ${usd(film60.usdCents)}).`
  const planLine = `US$ amounts use the ${reference.label} plan’s credit price (${usd(reference.usdCents)} for ${reference.credits} credits). ${smallestSentence}`
  const priced = direct.filter((r) => r.clipUsdCents !== null)
  // A pergunta que o comprador faz ao ChatGPT, respondida numa entrada só (onde + quanto) — a FAQ do Kling 3 tem
  // tamanho travado em 3 por outro guardião (test-avatar-fora), então a resposta citável cabe em UMA entrada.
  const pagoFaq = access.paidPlansOnly ? ', on any paid plan (the free trial does not include it)' : ''
  const faqWhereCost = {
    q: `Where can I use ${name} online, and what does a ${name} video cost?`,
    a: clipeAVenda
      ? `In Kineo Studio at usekineo.com/studio${profile.modelLine}${pagoFaq}: a ${clip.seconds}-second ${name} clip costs ${clip.credits} credits, and a finished narrated video with voice, captions and music costs ${film35.credits} credits for 35 seconds or ${film60.credits} credits for 60 seconds — about ${usd(clip.usdCents)}, ${usd(film35.usdCents)} and ${usd(film60.usdCents)} at the ${reference.label} plan’s credit price (${usd(reference.usdCents)} for ${reference.credits} credits). ${smallestSentence} A narrated video usually takes ${minutes}.`
      : `In Kineo Studio at usekineo.com/studio${profile.modelLine}${pagoFaq}: a finished narrated video with voice, captions and music costs ${film35.credits} credits for 35 seconds or ${film60.credits} credits for 60 seconds — about ${usd(film35.usdCents)} and ${usd(film60.usdCents)} at the ${reference.label} plan’s credit price (${usd(reference.usdCents)} for ${reference.credits} credits). ${smallestSentence} A narrated video usually takes ${minutes}.`,
  }
  const faqDirect = priced.length
    ? {
        q: `Is it cheaper to use ${name} directly?`,
        a: clipeAVenda
          ? `For raw clips, compare: ${priced.map((r) => `${r.who}, about ${usd(r.clipUsdCents as number)} for ${r.seconds} seconds`).join('; ')} (prices as published in ${directCheckedLabel}), against ${clip.credits} credits (about ${usd(clip.usdCents)}) for a ${clip.seconds}-second clip on Kineo. Those are raw clips: the script, narration, captions, music and the edit are still yours. Kineo’s video price includes all of that in one render.`
          : `Raw clips elsewhere: ${priced.map((r) => `${r.who}, about ${usd(r.clipUsdCents as number)} for ${r.seconds} seconds`).join('; ')} (prices as published in ${directCheckedLabel}). Kineo does not sell raw ${name} clips: a finished ${name} video — ${film35.credits} credits (about ${usd(film35.usdCents)}) for 35 seconds — includes the script, narration, captions, music and the edit in one render.`,
      }
    : null

  return {
    slug: input.slug,
    key,
    name,
    quality,
    reviewedOn: ENGINE_GEO_REVIEWED_ISO,
    reviewedLabel: monthYear(ENGINE_GEO_REVIEWED_ISO),
    reference,
    plans,
    rows: { clip: clipeAVenda, film35, film60 },
    paidPlansOnly: access.paidPlansOnly,
    clipFromLine,
    smallestPlanFor60,
    direct,
    directNote: profile.directNote ?? null,
    directCheckedLabel,
    answerLead,
    planLine,
    accessNote: access.paidPlansOnly ? `${name} is on paid plans — the free trial does not include it. ${clipFromLine ? `${clipFromLine}. ` : ''}${smallestMonthlySentence}` : `${trialSentence} ${smallestMonthlySentence}`,
    turnaround: `Usually ${minutes} for a narrated video — it varies with length and provider queues`,
    howStep3: `A vertical 9:16 MP4, usually ${minutes} later, ready for YouTube Shorts, TikTok and Reels.`,
    costsNote: `Credit costs read from Kineo’s single pricing source (${monthYear(ENGINE_GEO_REVIEWED_ISO)}). Engines and costs may change.`,
    finalLine: `${ENGINE_GEO_BRAND_LINE} ${ENGINE_GEO_REWARDS_LINE}`,
    ctaLabel: access.paidPlansOnly ? `Make a ${name} video on a paid plan →` : `Make a ${name} video →`,
    faqWhereCost,
    faqDirect,
  }
}

/** A nota de acesso de um motor PAUSADO (a página segue no ar, com noindex, e não pode dizer "unlocked on every account"). */
export function pausedAccessNote(name: string, pause: { since: string; alternative: { label: string } }): string {
  return `New ${name} videos are paused for maintenance since ${dayMonthYear(pause.since)}; nothing is charged for a blocked attempt. ${pause.alternative.label} is available meanwhile.`
}
