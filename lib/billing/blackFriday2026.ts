// KINEO-BLACK-FRIDAY-2026 — Black Friday 2026: 40% off o 1º ano de qualquer plano ANUAL (fundador 01/11, "vai black friday").
//
// A DECISÃO: só o anual ganha desconto (o mensal NÃO), 40% na 1ª fatura anual (cupom 'once' = o 1º ano), só na janela de
// 24/11/2026 00:00 a 01/12/2026 23:59 no horário de Nova York (America/New_York). Black Friday = 27/11, Cyber Monday = 30/11.
// Objetivo: caixa de uma vez + 12 meses sem risco de cancelamento, na caça da meta de MRR de US$ 1.000 até 30/11.
//
// COMO LIGA SOZINHO: tudo aqui é relógio do SERVIDOR. Publicar antes de 24/11 não muda nada para ninguém; às 05:00 UTC de
// 24/11 (00:00 EST — o horário de verão dos EUA acabou em 01/11, então Nova York está em UTC−5 a janela inteira) o checkout
// anual passa a aplicar o cupom, a faixa e o selo acordam e a página /black-friday troca "starts Nov 24" pela oferta. Às
// 05:00 UTC de 02/12 tudo desliga do mesmo jeito.
//
// ONDE O DESCONTO VALE (o portão é bf2026CheckoutEligible, e o checkout é o único lugar que aplica):
//   · SÓ anual; SÓ Starter/Creator/Studio (os três que têm anual); SÓ planos que aceitam promoção (planAcceptsPromotions —
//     o Business fica fora, e ele nem tem anual); nunca no teste com cartão.
//   · TODO checkout anual elegível dentro da janela recebe o cupom — venha do /black-friday (?promo=BF2026), do /pricing
//     na aba anual ou de um e-mail antigo. Assim a frase "40% off your first year of any annual plan" é verdade em
//     qualquer porta; o ?promo=BF2026 só serve de atribuição. Fora da janela (ou no mensal), o ?promo=BF2026 é ignorado
//     e a compra segue a preço cheio, que a própria página da Stripe mostra antes do pagamento.
//   · O cupom KINEO_BF2026 NÃO tem promotion code: ninguém consegue digitá-lo no campo "Add promotion code" da Stripe (que
//     não sabe restringir por intervalo de cobrança). Só o servidor o aplica, via `discounts: [{ coupon }]`.
//
// MÓDULO PURO: nem Stripe, nem Supabase, nem React. O checkout (app/api/stripe/checkout), a rota de estado
// (/api/offers/bf2026), a página /black-friday, a faixa, o selo do /pricing, a carta (admin/send-black-friday-2026) e o
// guardião scripts/test-black-friday-2026.mts leem DAQUI. Preço nenhum é digitado: os valores entram de lib/checkoutPricing.
import {
  ANNUAL_PRICES,
  ANNUAL_REFUND_DAYS,
  formatCheckoutMoney,
  TIER_PRICES,
  TIER_CREDITS,
  getAnnualPrice,
  planAcceptsPromotions,
  type CheckoutTier,
} from '@/lib/checkoutPricing'
import { isNonCommercialSurface } from '@/lib/nonCommercialSurface'

export const BF2026_MARKER = 'KINEO-BLACK-FRIDAY-2026' as const
export const BF2026_CAMPAIGN = 'bf2026' as const
/** O texto do ?promo= (atribuição); não existe como promotion code na Stripe. */
export const BF2026_PROMO_CODE = 'BF2026' as const
/** O cupom na Stripe, auto-provisionado no 1º uso (padrão do KINEO_FIRST50). */
export const BF2026_COUPON_ID = 'KINEO_BF2026' as const
export const BF2026_PERCENT_OFF = 40
/** O carimbo de origem do desconto no checkout_started e na sessão. */
export const BF2026_PROMO_SOURCE = 'black_friday_2026' as const
export const BF2026_TIME_ZONE = 'America/New_York' as const

/** Início: 24/11/2026 00:00 em Nova York (EST, UTC−5) = 05:00 UTC. */
export const BF2026_STARTS_AT = '2026-11-24T05:00:00.000Z'
/** Fim EXCLUSIVO: 02/12/2026 00:00 em Nova York — a janela cobre até 01/12 23:59:59. */
export const BF2026_ENDS_AT = '2026-12-02T05:00:00.000Z'
/** Dia da Black Friday e da Cyber Monday (data de Nova York). */
export const BF2026_BLACK_FRIDAY_DATE = '2026-11-27'
export const BF2026_CYBER_MONDAY_DATE = '2026-11-30'
/**
 * O cupom vale na Stripe até 48 h depois do fim da janela: uma sessão aberta às 23:50 de 01/12 (a sessão vive até 24 h)
 * não pode falhar no pagamento por um cupom vencido. Quem decide se o cupom ENTRA é o relógio do servidor (janela);
 * o redeem_by só evita a falha no meio de uma compra já aberta. Sem promotion code, ninguém o digita depois.
 */
export const BF2026_COUPON_REDEEM_BY_SECONDS = Math.floor(Date.parse(BF2026_ENDS_AT) / 1000) + 48 * 3600

export type Bf2026State = 'before' | 'open' | 'after'

/** Em que lado da janela estamos. Relógio inválido = 'after' (nada liga com relógio quebrado). */
export function bf2026State(nowMs: number = Date.now()): Bf2026State {
  if (!Number.isFinite(nowMs)) return 'after'
  if (nowMs < Date.parse(BF2026_STARTS_AT)) return 'before'
  if (nowMs < Date.parse(BF2026_ENDS_AT)) return 'open'
  return 'after'
}

export function bf2026Open(nowMs: number = Date.now()): boolean {
  return bf2026State(nowMs) === 'open'
}

/** Os três planos com anual. Autopilot/Lite/Business não têm anual. */
export const BF2026_TIERS: readonly CheckoutTier[] = ['starter', 'basic', 'pro']
/** Espelho de VALOR_TIER_NAMES (lib/valorNoCheckout.ts); o guardião confere a igualdade. */
export const BF2026_TIER_NAMES: Record<CheckoutTier, string> = { starter: 'Starter', basic: 'Creator', pro: 'Studio' }

/** O portão do checkout: o cupom entra SÓ aqui. */
export function bf2026CheckoutEligible(input: {
  tier: string
  isAnnual: boolean
  nowMs?: number
  wantsTrial?: boolean
}): boolean {
  return input.isAnnual === true &&
    (BF2026_TIERS as readonly string[]).includes(input.tier) &&
    planAcceptsPromotions(input.tier) &&
    input.wantsTrial !== true &&
    bf2026Open(input.nowMs ?? Date.now())
}

/** O ?promo= pedido é o da Black Friday? (só atribuição; o portão acima é quem decide). */
export function isBf2026PromoCode(raw: unknown): boolean {
  return typeof raw === 'string' && raw.trim().toUpperCase() === BF2026_PROMO_CODE
}

/** Desconto em centavos, arredondado como a Stripe arredonda um percent_off (meio centavo para cima). */
export function bf2026DiscountMinor(amountMinor: number): number {
  if (!Number.isInteger(amountMinor) || amountMinor <= 0) return 0
  return Math.round((amountMinor * BF2026_PERCENT_OFF) / 100)
}

/** O que a 1ª fatura anual cobra com o cupom. */
export function bf2026PriceMinor(amountMinor: number): number {
  if (!Number.isInteger(amountMinor) || amountMinor <= 0) return 0
  return amountMinor - bf2026DiscountMinor(amountMinor)
}

export type Bf2026PriceRow = {
  tier: CheckoutTier
  name: string
  credits: number
  /** Preço anual de tabela (o que o ano 2 renova). */
  annualMinor: number
  /** O 1º ano com 40%. */
  bfMinor: number
  savedMinor: number
  /** 12 mensalidades de tabela (referência do "antes" mais honesta para quem paga mensal). */
  twelveMonthlyMinor: number
  /** bfMinor / 12, arredondado para baixo — o "≈ por mês" do 1º ano. */
  bfPerMonthMinor: number
}

/** A tabela da oferta, lida das fontes únicas (getAnnualPrice / TIER_PRICES / TIER_CREDITS) — USD de tabela. */
export function bf2026PriceRows(): Bf2026PriceRow[] {
  return BF2026_TIERS.map((tier) => {
    const annualMinor = getAnnualPrice(tier, 'usd')
    const bfMinor = bf2026PriceMinor(annualMinor)
    return {
      tier,
      name: BF2026_TIER_NAMES[tier],
      credits: TIER_CREDITS[tier],
      annualMinor,
      bfMinor,
      savedMinor: annualMinor - bfMinor,
      twelveMonthlyMinor: TIER_PRICES[tier].usd * 12,
      bfPerMonthMinor: Math.floor(bfMinor / 12),
    }
  })
}

/** Garantia de leitura: getAnnualPrice e ANNUAL_PRICES contam a mesma história (o guardião usa). */
export function bf2026PricesMatchTable(): boolean {
  return BF2026_TIERS.every((t) => getAnnualPrice(t, 'usd') === ANNUAL_PRICES[t].usd)
}

/** O link do checkout anual com a atribuição da campanha (o cupom entra pelo portão, não pelo link). */
export function bf2026CheckoutHref(tier: CheckoutTier, surface: 'page' | 'pricing' | 'email' = 'page'): string {
  return `/api/stripe/checkout?tier=${tier}&billing=annual&promo=${BF2026_PROMO_CODE}&intent_campaign=${BF2026_CAMPAIGN}_${surface}`
}

export const BF2026_PAGE_PATH = '/black-friday' as const

// ─── Faixa do topo (components/BlackFridayBanner.tsx) ────────────────────────────────────────────────────────────────
/** As rotas de app/(dashboard): lá a faixa mora dentro do DashboardShell (placement="app"); o guardião confere o disco. */
// Escritas sem a barra e montadas com ela: nenhuma vira um link (o guardião test-sem-porteiro procura caminhos literais).
export const BF2026_APP_ROUTE_PREFIXES: readonly string[] = [
  'account', 'admin', 'ads', 'affiliate', 'animate', 'audio', 'autopilot', 'avatar', 'baby-podcast', 'channel',
  'clips', 'create', 'dashboard', 'generate', 'history', 'images', 'kids-cartoon', 'library', 'my-videos',
  'referral', 'spaces', 'studio', 'templates', 'thumbnail-generator', 'v2', 'video', 'viral-now',
].map((segment) => `/${segment}`)

/** Onde a faixa nunca aparece: a própria página da oferta, autenticação, volta do checkout, admin e o player público. */
const BF2026_BANNER_HIDDEN_PATHS = [BF2026_PAGE_PATH, '/login', '/signup', '/forgot-password', '/reset-password', '/auth', '/checkout', '/admin', '/v'] as const

const startsWithPath = (pathname: string, prefix: string) => pathname === prefix || pathname.startsWith(`${prefix}/`)

export function bf2026BannerHidden(pathname: string, placement: 'site' | 'app'): boolean {
  if (isNonCommercialSurface(pathname) || BF2026_BANNER_HIDDEN_PATHS.some((p) => startsWithPath(pathname, p))) return true
  if (placement === 'site') return BF2026_APP_ROUTE_PREFIXES.some((p) => startsWithPath(pathname, p))
  return false
}

/** O relógio do navegador só serve para NÃO perguntar ao servidor fora de época (±2 dias de folga para relógio torto). */
export function bf2026WorthAsking(nowMs: number): boolean {
  const slack = 2 * 86_400_000
  return Number.isFinite(nowMs) && nowMs >= Date.parse(BF2026_STARTS_AT) - slack && nowMs < Date.parse(BF2026_ENDS_AT) + slack
}

// ─── Eventos ────────────────────────────────────────────────────────────────────────────────────────────────────────
export const BF2026_EVENTS = {
  bannerShown: 'bf2026_banner_shown',
  bannerClicked: 'bf2026_banner_clicked',
  pageView: 'bf2026_page_view',
  /** SERVER-ONLY (app/api/events/route.ts): só o checkout grava, depois que a sessão da Stripe com o cupom existe. */
  checkoutStarted: 'bf2026_checkout_started',
} as const

// ─── Relógio de Nova York ───────────────────────────────────────────────────────────────────────────────────────────
/** 'YYYY-MM-DD' no fuso de Nova York. */
export function bf2026NyDate(nowMs: number = Date.now()): string {
  if (!Number.isFinite(nowMs)) return ''
  return new Intl.DateTimeFormat('en-CA', { timeZone: BF2026_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(nowMs))
}

/** Contagem até um instante (para a página; o servidor manda o seu `nowMs` e o navegador só soma o tempo que passou). */
export function bf2026Countdown(targetIso: string, nowMs: number): { days: number; hours: number; minutes: number; seconds: number; totalMs: number } {
  const totalMs = Math.max(0, Date.parse(targetIso) - nowMs)
  const s = Math.floor(totalMs / 1000)
  return { days: Math.floor(s / 86_400), hours: Math.floor((s % 86_400) / 3600), minutes: Math.floor((s % 3600) / 60), seconds: s % 60, totalMs }
}

// ─── E-mail para a base ─────────────────────────────────────────────────────────────────────────────────────────────
export type Bf2026Wave = 'bf' | 'cyber'
export const BF2026_WAVE_DATES: Record<Bf2026Wave, string> = { bf: BF2026_BLACK_FRIDAY_DATE, cyber: BF2026_CYBER_MONDAY_DATE }
/**
 * Carimbo de ENVIO e RESERVA (os dois server-only em app/api/events). A trava de 24 h da casa enxerga a carta pelo ledger
 * email_send_log (recordResendResponse, lib/email/quota), não por LIFECYCLE_EMAIL_EVENT_NAMES: lib/lifecycle/emailEvents.ts
 * é conferido por hash na camada KINEO-LEVA-2410. Quando a faxina das camadas acontecer, 'bf2026_emailed' pode entrar lá.
 */
export const BF2026_EMAIL_SENT = 'bf2026_emailed' as const
export const BF2026_EMAIL_CLAIM = 'bf2026_email_claimed' as const
export const BF2026_EMAIL_FROM = 'Joseph at Kineo <joseph@usekineo.com>'
export const BF2026_EMAIL_REPLY_TO = 'joseph@usekineo.com'
export const BF2026_EMAIL_BATCH_DEFAULT = 150
/** Teto por execução (o cron e o link do fundador). A cota diária da casa (lib/email/quota) ainda limita por baixo. */
export const BF2026_EMAIL_BATCH_MAX = 250

/** A onda do dia (data de Nova York). Fora de 27/11 e 30/11 = null (o cron não faz nada). */
export function bf2026WaveForDate(nowMs: number = Date.now()): Bf2026Wave | null {
  const d = bf2026NyDate(nowMs)
  return d === BF2026_WAVE_DATES.bf ? 'bf' : d === BF2026_WAVE_DATES.cyber ? 'cyber' : null
}

export function parseBf2026Wave(raw: unknown): Bf2026Wave | null {
  return raw === 'bf' || raw === 'cyber' ? raw : null
}

export type Bf2026SendDecision =
  | { ok: true; wave: Bf2026Wave }
  | { ok: false; reason: 'outside_window' | 'not_a_send_day' | 'invalid_wave' }

/**
 * Pode enviar AGORA? Fora da janela = nunca (nem com ?confirm=SEND, nem com ?wave=). Dentro dela:
 *   · sem ?wave= (o cron) → só nos dias 27/11 e 30/11 de Nova York; nos outros dias, nada (200 sem envio);
 *   · com ?wave=bf|cyber (o link do fundador) → vale em qualquer dia da janela, para repor um lote perdido.
 */
export function bf2026SendDecision(input: { nowMs: number; requestedWave?: string | null }): Bf2026SendDecision {
  if (!bf2026Open(input.nowMs)) return { ok: false, reason: 'outside_window' }
  if (input.requestedWave !== undefined && input.requestedWave !== null && input.requestedWave !== '') {
    const w = parseBf2026Wave(input.requestedWave)
    return w ? { ok: true, wave: w } : { ok: false, reason: 'invalid_wave' }
  }
  const w = bf2026WaveForDate(input.nowMs)
  return w ? { ok: true, wave: w } : { ok: false, reason: 'not_a_send_day' }
}

/** Semente da reserva: 1 e-mail por pessoa por onda, para sempre (a 2ª corrida bate em 23505). */
export function bf2026ClaimSeed(userId: string, wave: Bf2026Wave): string {
  return `${BF2026_EMAIL_CLAIM}:${wave}:${userId}`
}

/** uuid determinístico a partir de um sha256 em hex (o chamador passa o hash; o módulo segue sem crypto). */
export function bf2026UuidFromHex(hex: string): string {
  const h = hex.slice(0, 32)
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`
}

const INTERNAL_RE = /(josephsskaf|josephskaf|josepghsskaf|@usekineo\.com|@shortsforgeai\.com)/i
const DISPOSABLE = ['mailinator', 'yopmail', 'tempmail', 'guerrillamail', 'sharklasers', 'getnada', 'maildrop', 'trashmail', '10minutemail', 'dispostable', 'fakeinbox', 'temp-mail']
/** Planos que já pagam hoje (o checkout recusa uma 2ª assinatura de quem já assina — mandar a carta seria um beco). */
const PAYING_PLAN_RE = /^(starter|basic|pro|creator|studio|business|autopilot)/i

export type Bf2026Profile = { id?: unknown; email?: unknown; plan?: unknown; email_opted_out?: unknown }

export type Bf2026SkipReason = 'bad_email' | 'opted_out' | 'internal' | 'blocked' | 'paying_plan' | 'annual_buyer' | 'already_got_wave'

/**
 * Quem recebe. `blocked` = a lista de nunca-escrever da casa (WINBACK_NEVER, passada pela rota) + e-mail descartável.
 * Quem já assina (qualquer plano pago, inclusive anual) fica fora; quem cancelou (plano free, has_paid verdadeiro) ENTRA —
 * ex-cliente é o melhor público de Black Friday. `annualBuyer` = pagou um anual desde o início da janela (a Cyber Monday
 * é só para quem não comprou).
 */
export function bf2026EmailSkipReason(p: Bf2026Profile, ctx: { isInternal: (email: string) => boolean; neverEmail: readonly string[]; annualBuyer: boolean; alreadyGotWave: boolean }): Bf2026SkipReason | null {
  const email = typeof p.email === 'string' ? p.email.trim().toLowerCase() : ''
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'bad_email'
  if (p.email_opted_out === true) return 'opted_out'
  if (INTERNAL_RE.test(email) || ctx.isInternal(email)) return 'internal'
  if (ctx.neverEmail.some((x) => email.includes(x)) || DISPOSABLE.some((d) => email.includes(d))) return 'blocked'
  const plan = typeof p.plan === 'string' ? p.plan.trim().toLowerCase() : ''
  if (plan && plan !== 'free' && PAYING_PLAN_RE.test(plan)) return 'paying_plan'
  if (ctx.annualBuyer) return 'annual_buyer'
  if (ctx.alreadyGotWave) return 'already_got_wave'
  return null
}

/** Dinheiro sempre pelo formatador da casa (lib/checkoutPricing), nunca um cifrão digitado. */
export const bf2026Usd = (cents: number): string => formatCheckoutMoney('usd', cents)
const usd = bf2026Usd
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))

export function bf2026EmailUrl(wave: Bf2026Wave, app = 'https://www.usekineo.com'): string {
  return `${app}${BF2026_PAGE_PATH}?utm_source=email&utm_medium=email&utm_campaign=${BF2026_CAMPAIGN}&utm_content=${wave}`
}

export function bf2026Subject(wave: Bf2026Wave): string {
  return wave === 'bf'
    ? `Black Friday: ${BF2026_PERCENT_OFF}% off a full year of Kineo`
    : `Cyber Monday: ${BF2026_PERCENT_OFF}% off a year of Kineo ends Dec 1`
}

/** Corpo curto, em inglês. Preço nenhum digitado: as linhas vêm de bf2026PriceRows(). */
export function bf2026EmailBody(wave: Bf2026Wave, rows: Bf2026PriceRow[], footer: { text: string; html: string }, app = 'https://www.usekineo.com'): { text: string; html: string } {
  const url = bf2026EmailUrl(wave, app)
  const opener = wave === 'bf'
    ? `For Black Friday, every Kineo annual plan is ${BF2026_PERCENT_OFF}% off for the first year.`
    : `Last call: the Black Friday deal on Kineo annual plans ends Tuesday, Dec 1 at 11:59 PM (New York time).`
  const lines = rows.map((r) => `- ${r.name}: ${usd(r.bfMinor)} for the first year (regular ${usd(r.annualMinor)}), ${r.credits} credits every month`)
  const htmlLines = rows.map((r) => `<li><strong>${esc(r.name)}: ${usd(r.bfMinor)}</strong> for the first year <span style="color:#6b7280">(regular <s>${usd(r.annualMinor)}</s>)</span> · ${r.credits} credits every month</li>`).join('')
  const fine = `One payment for the year, credits refill every month, and the annual plan is fully refundable within ${ANNUAL_REFUND_DAYS} days. The second year renews at the regular annual price unless you cancel.`
  const text = `Hey,

${opener}

${lines.join('\n')}

Get the deal: ${url}

${fine}

Joseph
usekineo.com`
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;color:#111;line-height:1.6;max-width:480px;">
  <p>Hey,</p>
  <p>${esc(opener)}</p>
  <ul style="padding-left:18px;margin:0 0 16px">${htmlLines}</ul>
  <p style="margin:24px 0"><a href="${url}" style="display:inline-block;background:#0A5CFF;color:#fff;text-decoration:none;font-weight:bold;font-size:15px;padding:12px 26px;border-radius:10px;">Get ${BF2026_PERCENT_OFF}% off →</a></p>
  <p style="color:#4b5563;font-size:13px">${esc(fine)}</p>
  <p style="margin:0 0 2px">Joseph</p>
  <p style="margin:0"><a href="${app}" style="color:#0A5CFF">usekineo.com</a></p>
</div>`
  return { text: `${text}${footer.text}`, html: `${html}${footer.html}` }
}
