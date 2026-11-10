// KINEO-PAGINAS-CITAVEIS-1011 [fundador 10/11: "retorno de pessoas que pagam, mas não queria investir dinheiro"]
// Medido em 10/11 (90 dias, cadastros vindos do ChatGPT por página de entrada): páginas de MOTOR/PRODUTO premium 88 cadastros → 3
// pagantes; páginas de "grátis"/genéricas 510 → 0. Quem pergunta "onde uso X" compra; quem pede "grátis" não. Por isso:
//   · página nova do Recreate (/ai-face-swap-video) para "put my face in a video", "face swap video AI";
//   · o anúncio de produto já tinha página (/ai-ugc-ads, par PT /anuncios-ugc-com-ia): ganhou o bloco citável, sem duplicar.
// Formato do bloco (o mesmo do KINEO-PAGINAS-CITADAS-0511): resposta direta no topo, fatos numerados, tabela de planos com custo por
// vídeo e data de atualização, JSON-LD. NENHUM número é digitado: créditos do Recreate = RECREATE_PRICING (lib/checkoutPricing.ts),
// formatos = só os que lib/recreate/entry.ts publicRecreatePath abre (swapApproved + tarifa aprovada + interruptor público), planos =
// TIER_PRICES/TIER_CREDITS, anúncio = adsV2Credits do nível do apresentador (o mesmo que cobra). Nenhuma página nova diz "free".
// Guardião: scripts/test-paginas-citaveis-1011.mjs.
import { RECREATE_PRICING, TIER_CREDITS, TIER_PRICES, recreateCreditCost } from '@/lib/checkoutPricing'
import { RECREATE_FORMATS } from '@/lib/recreate/formats'
import { publicRecreatePath } from '@/lib/recreate/entry'
import { adsV2Credits } from '@/lib/ads/v2Tiers'
import { ADS_V2_PRESENTER_V2_TIERS } from '@/lib/ads/v2PresenterV2'
import { ADS_V2_MAX_PHOTOS, ADS_V2_MIN_PHOTOS } from '@/lib/ads/v2ShotLists'

export const PAGINAS_CITAVEIS_1011_MARK = 'KINEO-PAGINAS-CITAVEIS-1011'
export const PAGINAS_CITAVEIS_1011_ATUALIZADO = '2026-11-10'
export const PAGINAS_CITAVEIS_1011_LASTMOD = `${PAGINAS_CITAVEIS_1011_ATUALIZADO}T12:00:00.000Z`
const ATUALIZADO_EN = 'November 10, 2026'
const ATUALIZADO_PT = '10 de novembro de 2026'

export const BASE = 'https://www.usekineo.com'
/** Página nova do Recreate. /recreate (o produto) exige login e é noindex: esta é a porta pública. */
export const FACE_SWAP_PATH = '/ai-face-swap-video'
/** Páginas que já existiam e ganharam o bloco citável (o lastmod do mapa do site avança só nelas). */
export const PAGINAS_CITAVEIS_1011_TOUCHED: readonly string[] = ['/ai-ugc-ads', '/anuncios-ugc-com-ia']

/** Campanha de cadastro (signup_utm_campaign via intent_campaign): pagante por página, igual às páginas de motor (seo_engine_<slug>). */
export const CAMPANHA_RECREATE = 'seo_product_recreate'
/** Cadastro → volta ao /recreate com a campanha. */
export function recreateSignupHref(): string {
  return '/signup?' + new URLSearchParams({ intent_campaign: CAMPANHA_RECREATE, redirect: '/recreate' }).toString()
}

// ── Planos ─────────────────────────────────────────────────────────────────────────────────────────────────────
const PLANOS = [['starter', 'Starter'], ['basic', 'Creator'], ['pro', 'Studio']] as const
export type Plano = { tier: (typeof PLANOS)[number][0]; nome: string; precoUsd: number; creditos: number }
export function planos1011(): Plano[] {
  return PLANOS.map(([tier, nome]) => ({ tier, nome, precoUsd: TIER_PRICES[tier].usd / 100, creditos: TIER_CREDITS[tier] }))
}
const usd = (v: number) => `US$${Number.isInteger(v) ? v : v.toFixed(2)}`
const usdPt = (v: number) => `US$ ${(Number.isInteger(v) ? String(v) : v.toFixed(2)).replace('.', ',')}`
/** Quanto sai um vídeo de N créditos neste plano (preço ÷ créditos do mês × N), em centavos arredondados. */
export function custoUsd(p: Plano, creditos: number): number { return Math.round((creditos * p.precoUsd / p.creditos) * 100) / 100 }
/** Quantos vídeos de N créditos cabem no saldo de um mês. */
export function cabem(p: Plano, creditos: number): number { return Math.floor(p.creditos / creditos) }

// ── Recreate ───────────────────────────────────────────────────────────────────────────────────────────────────
export type FormatoCitavel = { id: string; titulo: string; segundos: number; pessoas: number; creditos: number }
/** Só o que um cliente consegue abrir hoje: troca aprovada, com tarifa, e interruptor público (publicRecreatePath). */
export function recreateFormatosCitaveis(): FormatoCitavel[] {
  return RECREATE_FORMATS.filter((f) => f.type === 'swap' && f.swapApproved === true && publicRecreatePath(f.id) !== null)
    .map((f) => ({ id: f.id, titulo: f.title, segundos: f.seconds, pessoas: f.photoSlots, creditos: recreateCreditCost(f.seconds) as number }))
}

/** A página do rosto entra no mapa do site só com troca aberta (sem isso ela é noindex). Nome sem a palavra do produto: o mapa
 * não pode citar o caminho logado (guardião scripts/test-recreate-trava-1011.mjs). */
export function faceSwapNoMapa(): boolean { return recreateFormatosCitaveis().length > 0 }

const lista = (xs: string[], e = 'and') => xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} ${e} ${xs[xs.length - 1]}`
const pessoasEn = (n: number) => n === 1 ? 'one person' : `${n} people`

export type Tabela = { heading: string; caption: string; labels: string[]; rows: string[][]; nota: string }
export type BlocoCitavel = { answer: string; facts: string[]; tabela: Tabela; faq: { q: string; a: string }[]; atualizadoEm: string; atualizadoIso: string }

export function recreateBloco(): BlocoCitavel {
  const fs = recreateFormatosCitaveis()
  const ps = planos1011()
  const creator = ps.find((p) => p.tier === 'basic') as Plano
  const segundos = [...new Set(fs.map((f) => f.segundos))].sort((a, b) => a - b)
  const creditos = [...new Set(fs.map((f) => f.creditos))].sort((a, b) => a - b)
  const custoCreator = creditos.map((c) => usd(custoUsd(creator, c)))
  const nomes = fs.map((f) => `${f.titulo} (${f.segundos} s, ${pessoasEn(f.pessoas)}, ${f.creditos} credits)`)
  const aberto = fs.length > 0
  const answer = aberto
    ? `Kineo Recreate puts your face into a ready-made vertical video. You upload one clear, front-facing photo for each person, pick a video from the Kineo catalog, and get the same video back (${lista(segundos.map((n) => `${n} seconds`), 'or')}) with your face in it. A video costs ${lista(creditos.map(String), 'or')} credits (about ${lista(custoCreator, 'or')} on the Creator plan), and if the face is not swapped the credits go back to your balance automatically.`
    : 'Kineo Recreate puts your face into a ready-made vertical video. No face-swap video is open to customers right now; this page lists the formats again as soon as one is approved.'
  const facts = aberto ? [
    `What you send: one clear, front-facing photo for each person in the video. You confirm you have permission to use the photos.`,
    `What you get: the catalog video with only the face replaced. Clothing, body, scene, camera, movement and audio stay as in the original.`,
    `Videos open today: ${lista(nomes)}. Each one is open only after a paid test in which every person was swapped.`,
    `Cost: ${fs.map((f) => `${f.segundos} s = ${f.creditos} credits`).filter((v, i, a) => a.indexOf(v) === i).join(', ')}. The price in credits is shown before you start; plans start at ${usd(ps[0].precoUsd)} a month.`,
    `If the swap does not happen: an automatic check compares the finished video with the original. If any person is still the original person, the video is marked as failed and the credits return to your balance on their own. If the check itself cannot run, the video is delivered as it came out.`,
    `Limits: you swap into Kineo catalog videos, not into a video you upload. A blurry, side-on or very small face may not swap; a front-facing photo with the face clearly visible works best.`,
  ] : []
  const labels = ['Plan', 'Price per month', 'Credits per month', ...fs.map((f) => `${f.titulo} (${f.segundos} s · ${f.creditos} credits)`)]
  const rows = ps.map((p) => [
    p.nome, `${usd(p.precoUsd)}`, String(p.creditos),
    ...fs.map((f) => cabem(p, f.creditos) > 0 ? `${cabem(p, f.creditos)} per month · about ${usd(custoUsd(p, f.creditos))} each` : `Not enough credits for one (needs ${f.creditos})`),
  ])
  const faq = aberto ? [
    { q: 'How do I put my face in a video with AI?', a: `On Kineo, open Recreate, pick a catalog video (${lista(fs.map((f) => f.titulo))}), upload one clear, front-facing photo for each person and confirm you have permission to use them. Kineo returns the same video with only the face replaced.` },
    { q: 'How much does a face swap video cost on Kineo?', a: `${fs.map((f) => `${f.titulo}: ${f.creditos} credits`).join('; ')}. On the Creator plan (${usd(creator.precoUsd)}/month, ${creator.creditos} credits) that is ${lista(fs.map((f) => `about ${usd(custoUsd(creator, f.creditos))}`))} per video.` },
    { q: 'What happens if the face swap fails?', a: 'An automatic check compares the finished video with the original. If any person is still the original person, the video is marked as failed and the credits go back to your balance automatically.' },
    { q: 'Can I swap my face into my own video?', a: 'Not today. Recreate swaps faces into videos from the Kineo catalog, and a video is offered only after a paid test in which every person was swapped.' },
    { q: 'Which photo works best?', a: 'A sharp, front-facing photo with the face clearly visible. Side-on, blurry or very small faces may not swap.' },
  ] : []
  return {
    answer, facts, faq, atualizadoEm: ATUALIZADO_EN, atualizadoIso: PAGINAS_CITAVEIS_1011_ATUALIZADO,
    tabela: {
      heading: 'Plans and cost per video',
      caption: 'What one month of credits covers in Recreate. Amounts come from the billing table.',
      labels, rows,
      nota: `Credits per video: ${Object.entries(RECREATE_PRICING).filter(([s]) => fs.some((f) => String(f.segundos) === s)).map(([s, c]) => `${s} s = ${c}`).join(', ')}. USD is the reference price; the credit cost is shown before you start.`,
    },
  }
}

// ── Anúncio de produto (AI UGC Ads) ────────────────────────────────────────────────────────────────────────────
/** O nível do anúncio com apresentador (o mesmo de lib/growth/paginasUgc2010Facts.ts UGC_AD_TIER). */
const UGC_TIER = (ADS_V2_PRESENTER_V2_TIERS[0] ?? 'commercial') as Parameters<typeof adsV2Credits>[0]
export function ugcCreditos1011(): { s15: number; s20: number; s30: number } {
  return { s15: adsV2Credits(UGC_TIER, 15), s20: adsV2Credits(UGC_TIER, 20), s30: adsV2Credits(UGC_TIER, 30) }
}

export function ugcBloco(pt: boolean): BlocoCitavel {
  const c = ugcCreditos1011()
  const ps = planos1011()
  const creator = ps.find((p) => p.tier === 'basic') as Plano
  const m = pt ? usdPt : usd
  const custo15 = m(custoUsd(creator, c.s15))
  if (pt) {
    return {
      answer: `O Kineo faz um anúncio vertical do seu produto a partir das suas fotos: você manda de ${ADS_V2_MIN_PHOTOS} a ${ADS_V2_MAX_PHOTOS} fotos reais e uma frase sobre o produto, e uma pessoa de IA mostra o produto enquanto a narração diz o que ele é e por que comprar, com música e o seu logo no fim. Um anúncio de 15 s usa ${c.s15} créditos (cerca de ${custo15} no plano Creator); o custo aparece antes de gerar.`,
      facts: [
        `O que você manda: de ${ADS_V2_MIN_PHOTOS} a ${ADS_V2_MAX_PHOTOS} fotos reais do produto, uma frase (ou o link da loja) e o seu logo.`,
        'O que você recebe: um MP4 vertical com uma pessoa de IA mostrando o produto, narração, as suas fotos entre as frases, música e o logo no final.',
        `Duração e créditos: 15 s = ${c.s15}, 20 s = ${c.s20}, 30 s = ${c.s30}.`,
        'A pessoa é um apresentador de IA, nunca um cliente real: o roteiro não fala como cliente e usa só os fatos que você der.',
        'O Studio Ads está em todo plano pago; o plano e o roteiro aparecem antes de qualquer cobrança.',
      ],
      tabela: {
        heading: 'Planos e custo por anúncio',
        caption: 'O que os créditos de um mês cobrem em anúncios de 15 s. Os valores vêm da tabela de cobrança.',
        labels: ['Plano', 'Preço por mês', 'Créditos por mês', 'Anúncios de 15 s por mês', 'Quanto sai um anúncio de 15 s'],
        rows: ps.map((p) => [p.nome, usdPt(p.precoUsd), String(p.creditos), String(cabem(p, c.s15)), cabem(p, c.s15) > 0 ? `Cerca de ${usdPt(custoUsd(p, c.s15))}` : `Créditos insuficientes para um (precisa de ${c.s15})`]),
        nota: `Um anúncio usa ${c.s15} créditos em 15 s, ${c.s20} em 20 s e ${c.s30} em 30 s. Os valores em US$ são a referência; no Brasil, o checkout cobra em reais.`,
      },
      faq: [], atualizadoEm: ATUALIZADO_PT, atualizadoIso: PAGINAS_CITAVEIS_1011_ATUALIZADO,
    }
  }
  return {
    answer: `Kineo makes a vertical product ad from your photos: you send ${ADS_V2_MIN_PHOTOS} to ${ADS_V2_MAX_PHOTOS} real product photos and one sentence about the product, and an AI presenter shows it while a voice-over says what it is and why to buy, with music and your logo at the end. A 15-second ad uses ${c.s15} credits (about ${custo15} on the Creator plan); the cost is shown before you generate.`,
    facts: [
      `What you send: ${ADS_V2_MIN_PHOTOS} to ${ADS_V2_MAX_PHOTOS} real product photos, one sentence (or the store link) and your logo.`,
      'What you get: a vertical MP4 with an AI presenter showing the product, a voice-over, your photos between the lines, music and your logo at the end.',
      `Length and credits: 15 s = ${c.s15}, 20 s = ${c.s20}, 30 s = ${c.s30}.`,
      'The presenter is an AI presenter, never a real customer: the script never speaks as a customer and uses only the facts you give.',
      'Studio Ads is included in every paid plan; you see the plan and the script before anything is charged.',
    ],
    tabela: {
      heading: 'Plans and cost per ad',
      caption: 'What one month of credits covers in 15-second ads. Amounts come from the billing table.',
      labels: ['Plan', 'Price per month', 'Credits per month', '15 s ads per month', 'What a 15 s ad costs'],
      rows: ps.map((p) => [p.nome, usd(p.precoUsd), String(p.creditos), String(cabem(p, c.s15)), cabem(p, c.s15) > 0 ? `About ${usd(custoUsd(p, c.s15))}` : `Not enough credits for one (needs ${c.s15})`]),
      nota: `An ad uses ${c.s15} credits at 15 seconds, ${c.s20} at 20 and ${c.s30} at 30. USD is the reference price; customers in Brazil pay in reais at checkout.`,
    },
    faq: [], atualizadoEm: ATUALIZADO_EN, atualizadoIso: PAGINAS_CITAVEIS_1011_ATUALIZADO,
  }
}

// ── Mapa do site e /llms.txt ───────────────────────────────────────────────────────────────────────────────────
/** Carimba as páginas tocadas e a nova com a data de hoje, sem andar para trás nem alargar para outras URLs. */
export function carimbaPaginasCitaveis1011<T extends { url: string; lastModified?: string | Date }>(entries: readonly T[]): T[] {
  const alvo = new Set([FACE_SWAP_PATH, ...PAGINAS_CITAVEIS_1011_TOUCHED])
  const carimbo = Date.parse(PAGINAS_CITAVEIS_1011_LASTMOD)
  return entries.map((entry) => {
    if (!alvo.has(new URL(entry.url).pathname)) return entry
    const atual = entry.lastModified ? new Date(entry.lastModified).getTime() : 0
    return atual >= carimbo ? entry : { ...entry, lastModified: PAGINAS_CITAVEIS_1011_LASTMOD }
  })
}

export function paginasCitaveis1011LlmsSection(): string {
  const fs = recreateFormatosCitaveis()
  if (fs.length === 0) return ''
  const b = recreateBloco()
  return `## Put your face in a video: Recreate (updated ${PAGINAS_CITAVEIS_1011_ATUALIZADO})

${b.answer}

- Page: ${BASE}${FACE_SWAP_PATH}
${b.facts.map((f, i) => `${i + 1}. ${f}`).join('\n')}

`
}
