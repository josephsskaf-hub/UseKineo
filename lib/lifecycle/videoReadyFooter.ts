/**
 * sprint-assinaturas #24 (02/09/2026) — o rodape do e-mail "Your Short is
 * ready" (app/api/compose/status/[renderId]/route.ts).
 *
 * O QUE ESTAVA ERRADO. O e-mail de video pronto e o unico que chega no minuto
 * de maior boa vontade do cliente, e sai para TODO render — e o rodape era UM
 * so, para todo mundo: "Want a clean export and N more Fast Shorts this
 * month? Starter is $7/month →". Medido 02/09 (externos, 7d, 105 e-mails):
 *   · 8 foram para ASSINANTES (Studio e Starter) — quem ja paga $29 leu
 *     "compre o Starter por $7" e "clean export" (o export dele ja e limpo);
 *   · 51 foram para trial ATIVO com credito (47 ainda com >= 5cr hoje) — a
 *     unica coisa que move essa pessoa e o 2o video (0,9% → 11,8% no 4o), e
 *     o rodape pedia dinheiro em vez de pedir o episodio 2;
 *   · 45 foram para quem QUEIMOU o trial naquele filme (custo medio 15,8cr)
 *     — o unico pedido de dinheiro certo, mas medido em "Fast Shorts" que a
 *     pessoa nao fez, nao em filmes COMO AQUELE.
 *
 * O QUE MUDA. Tres rodapes, decididos por dados que a rota JA tem (zero
 * consulta nova): assinante → episodio 2 + saldo, sem preco; nao-assinante
 * com saldo para o proximo video → episodio 2 primeiro, plano em filmes
 * depois; nao-assinante sem saldo → plano medido em filmes como o que acabou
 * de chegar (filmsPerPlan/TIER_CREDITS). Falha aberta: custo desconhecido ou
 * saldo desconhecido = a copy de hoje, com o numero certo.
 *
 * Regras: nenhum numero digitado (preco vem de TIER_PRICES, creditos de
 * TIER_CREDITS, custo do claim assinado); nao promete cupom, credito nem
 * desconto; nao inventa segundos (filmNoun); o `intent_campaign` do Codex
 * continua no link de preco para a medicao dele nao quebrar.
 */
import { TIER_CREDITS, TIER_PRICES, formatCheckoutMoney } from '@/lib/checkoutPricing'
import { filmsPerPlan, filmNoun, sanitizeFilmCost } from '@/lib/lifecycle/trialFilmPlans'
import { buildSeriesContinuationEmailUrl, normalizeSeriesSeed } from '@/lib/seriesContinuation'
import { videosForCredits } from '@/lib/marketingPrice'

export type VideoReadyFooterKind =
  | 'subscriber_next' // ja paga: episodio 2 + saldo, sem preco
  | 'trial_episode2' // nao paga, tem saldo para o proximo: episodio 2 primeiro
  | 'plan_films' // nao paga, sem saldo: plano medido em filmes como este
  | 'plan_generic' // custo/saldo desconhecido: copy de hoje (numero certo)

export interface VideoReadyFooterInput {
  /** has_paid OU plano pago — trial ativo NAO conta (ainda nao pagou). */
  isSubscriber: boolean
  /** Saldo depois do debito (retorno do RPC). null = desconhecido. */
  creditsRemaining: number | null
  /** Custo assinado do render (claim). */
  cost: number
  /** Tema do video (para o episodio 2). Vazio = sem bloco de episodio. */
  topic: string
  /** Duracao real em segundos (para "62-second film"). */
  durationSeconds: number | null
  appUrl: string
}

export interface VideoReadyFooter {
  kind: VideoReadyFooterKind
  html: string
}

/** Menor custo de um video na casa (Kineo 1 = 5cr). Abaixo disso o saldo nao
 *  compra o proximo video e o pedido certo e o plano, nao o episodio 2. */
export const NEXT_VIDEO_MIN_CREDITS = 5

const PRICING_INTENT = 'intent_campaign=video_ready_email_plan_truth_v1'

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function episodeTwoHtml(appUrl: string, topic: string, campaign: string): string {
  const tema = normalizeSeriesSeed(topic)
  if (!tema) return ''
  const url = buildSeriesContinuationEmailUrl(appUrl, tema, 'video_ready_email', {
    utm_source: 'lifecycle',
    utm_medium: 'email',
    utm_campaign: campaign,
  })
  return `<p style="margin:18px 0 0"><a href="${esc(url)}" style="display:block;background:#1f1f23;border:1px solid #2a2a30;border-left:4px solid #2997ff;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 16px;border-radius:8px;">Episode 2: ${esc(tema)} &rarr;</a></p>`
}

function creditsLeftLine(n: number | null): string {
  if (typeof n !== 'number' || !Number.isFinite(n) || n < 0) return ''
  const k = Math.floor(n)
  return `You have <strong style="color:#fff">${k} credit${k === 1 ? '' : 's'}</strong> left`
}

function pricingUrl(appUrl: string, campaign: string): string {
  return `${appUrl.replace(/\/+$/, '')}/pricing?${PRICING_INTENT}&utm_source=lifecycle&utm_medium=email&utm_campaign=${campaign}`
}

function starterPrice(): string {
  return formatCheckoutMoney('usd', TIER_PRICES.starter.usd)
}

/** Copy de hoje, com o numero certo (videosForCredits) — o controle. */
function genericPlanHtml(appUrl: string): string {
  return `<p style="color:#64748b;font-size:12px;margin:24px 0 0">Want a clean export and ${videosForCredits(TIER_CREDITS.starter, 'fast')} more Fast Shorts this month? <a href="${esc(pricingUrl(appUrl, 'video_ready_plan_generic'))}" style="color:#2997ff;">Starter is ${starterPrice()}/month &rarr;</a></p>`
}

/** Plano medido em filmes COMO ESTE. null quando nenhum plano compra >= 1. */
function filmsPlanHtml(appUrl: string, cost: number, durationSeconds: number | null, campaign: string): string | null {
  const rows = filmsPerPlan(cost)
  if (!rows) return null
  const c = sanitizeFilmCost(cost)
  if (c === null) return null
  const noun = filmNoun(durationSeconds)
  const lines = rows
    .filter((r) => r.films >= 1)
    .map((r) => `${r.name} &mdash; ${r.films} ${r.films === 1 ? 'film' : 'films'} like this a month`)
    .join(' &middot; ')
  return `<p style="color:#94a3b8;font-size:12px;margin:24px 0 0">This ${noun} cost <strong style="color:#fff">${c} credit${c === 1 ? '' : 's'}</strong>. ${lines}. <a href="${esc(pricingUrl(appUrl, campaign))}" style="color:#2997ff;">Plans from ${starterPrice()}/month &rarr;</a></p>`
}

export function videoReadyFooter(input: VideoReadyFooterInput): VideoReadyFooter {
  const { appUrl } = input
  const credits = typeof input.creditsRemaining === 'number' && Number.isFinite(input.creditsRemaining)
    ? Math.floor(input.creditsRemaining)
    : null

  // 1) Assinante: nunca pede dinheiro no e-mail de entrega; pede o proximo filme.
  if (input.isSubscriber) {
    const ep2 = episodeTwoHtml(appUrl, input.topic, 'video_ready_subscriber_episode2')
    const left = creditsLeftLine(credits)
    const lead = left
      ? `${left} this cycle &mdash; the next episode is one click away.`
      : 'The next episode is one click away.'
    return {
      kind: 'subscriber_next',
      html: `<p style="color:#94a3b8;font-size:13px;margin:24px 0 0">${lead}</p>${ep2}`,
    }
  }

  // 2) Nao paga, mas tem saldo para o proximo video: o 2o video vem antes do preco.
  if (credits !== null && credits >= NEXT_VIDEO_MIN_CREDITS) {
    const ep2 = episodeTwoHtml(appUrl, input.topic, 'video_ready_trial_episode2')
    const left = creditsLeftLine(credits)
    const plan = filmsPlanHtml(appUrl, input.cost, input.durationSeconds, 'video_ready_trial_plan_films') ?? genericPlanHtml(appUrl)
    return {
      kind: 'trial_episode2',
      html: `<p style="color:#94a3b8;font-size:13px;margin:24px 0 0">${left} &mdash; enough for the next episode. People who make a second video are the ones who keep going.</p>${ep2}${plan}`,
    }
  }

  // 3) Nao paga e o saldo nao compra o proximo: o plano, medido em filmes como este.
  const films = filmsPlanHtml(appUrl, input.cost, input.durationSeconds, 'video_ready_plan_films')
  if (films) return { kind: 'plan_films', html: films }

  // 4) Custo desconhecido: a copy de hoje.
  return { kind: 'plan_generic', html: genericPlanHtml(appUrl) }
}
