// KINEO-OFERTA-3H-0411 [fundador 04/11, "1A/5A": anual normal 30%; primeiras 3 h da conta nova 50%; quem pega mantém o preço na renovação; Black Friday: os mesmos 50% para todos] — a regra pura.
//
// A JANELA NASCE DA CONTA, NO SERVIDOR: auth.users.created_at (o getUser() da rota, verificado no Supabase) + 3 h. Nada vem do navegador, então
// o relógio não reinicia, não renasce em outra aba e é uma vez por conta. Conta que já pagou (has_paid) não entra. Convidado não entra.
// Só Starter/Creator/Studio ANUAL: mensal não tem desconto. Na Black Friday (o relógio dela mora em lib/billing/blackFriday2026.ts e entra por
// argumento) o mesmo preço vale para todos, convidado inclusive.
// O PREÇO NÃO MORA AQUI: ANNUAL_WELCOME_PRICES em lib/checkoutPricing.ts e BRL_ANNUAL_WELCOME_MINOR em lib/settlementCurrency.ts.
// É price_data inline, não cupom: a Stripe renova pelo mesmo valor, e um cupom nunca empilha porque a rota bloqueia o ?promo= com oferta ativa.
//
// MÓDULO PURO E SEM IMPORT (como lib/billing/annualEarlyOffer.ts): o checkout, /api/offers/annual-welcome, o /pricing e o guardião
// scripts/test-oferta-3h-0411.mjs leem daqui.

export const ANNUAL_WELCOME_WINDOW_MS = 3 * 60 * 60 * 1000
/** Evento SERVER-ONLY (app/api/events): só o checkout grava, depois que a sessão da Stripe com o preço existe. */
export const ANNUAL_WELCOME_APPLIED_EVENT = 'annual_welcome_offer_applied' as const
export const ANNUAL_WELCOME_API = '/api/offers/annual-welcome'

export type AnnualOfferKind = 'welcome_3h' | 'black_friday_2026'
export type AnnualOfferDecision = { kind: AnnualOfferKind; endsAtMs: number }

const TIERS_COM_ANUAL: readonly string[] = ['starter', 'basic', 'pro']
/** Relógio do Supabase um pouco à frente do nosso não fecha a janela; created_at bem no futuro é dado errado e fecha. */
const FOLGA_DE_RELOGIO_MS = 60_000

/** Quando a janela desta conta acaba. created_at inválido = null. */
export function annualWelcomeEndsAtMs(accountCreatedAt: unknown): number | null {
  if (typeof accountCreatedAt !== 'string' || accountCreatedAt.length === 0) return null
  const criada = Date.parse(accountCreatedAt)
  return Number.isFinite(criada) ? criada + ANNUAL_WELCOME_WINDOW_MS : null
}

/** A conta tem menos de 3 h e nunca pagou? 2:59:59 abre, 3:00:00 fecha. */
export function annualWelcomeOpen(input: { accountCreatedAt: unknown; hasPaid: boolean | null | undefined; nowMs: number }): boolean {
  if (input.hasPaid === true || !Number.isFinite(input.nowMs)) return false
  const fim = annualWelcomeEndsAtMs(input.accountCreatedAt)
  if (fim === null || input.nowMs >= fim) return false
  return fim - input.nowMs <= ANNUAL_WELCOME_WINDOW_MS + FOLGA_DE_RELOGIO_MS
}

/** A oferta do anual para ESTA compra, ou null (preço normal). A Black Friday vence: o preço é o mesmo e vale para todos. */
export function resolveAnnualOffer(input: {
  tier: string
  isAnnual: boolean
  signedIn: boolean
  accountCreatedAt?: unknown
  hasPaid?: boolean | null
  bfOpen: boolean
  bfEndsAtMs: number
  nowMs: number
  privatePromo?: boolean
}): AnnualOfferDecision | null {
  if (input.isAnnual !== true || !TIERS_COM_ANUAL.includes(input.tier) || input.privatePromo === true) return null
  if (input.bfOpen === true) return { kind: 'black_friday_2026', endsAtMs: input.bfEndsAtMs }
  if (input.signedIn !== true) return null
  if (!annualWelcomeOpen({ accountCreatedAt: input.accountCreatedAt, hasPaid: input.hasPaid, nowMs: input.nowMs })) return null
  return { kind: 'welcome_3h', endsAtMs: annualWelcomeEndsAtMs(input.accountCreatedAt) as number }
}

// ─── A BARRA DO TOPO [fundador 04/11, via coordenação: "barra fina" das 3 h] ───────────────────────────────────────────────────
export const ANNUAL_WELCOME_BAR_SHOWN_EVENT = 'annual_welcome_bar_shown' as const
export const ANNUAL_WELCOME_BAR_CLICKED_EVENT = 'annual_welcome_bar_clicked' as const
/** Cookie DE SESSÃO (sem validade): é o único jeito de o SERVIDOR saber da dispensa antes de desenhar, então quem dispensou não vê a barra piscar. */
export const ANNUAL_WELCOME_BAR_DISMISS_COOKIE = 'kineo_annual_bar_dismissed'
export const ANNUAL_WELCOME_BAR_HREF = '/pricing?billing=annual&from=welcome_bar'

export type AnnualWelcomeBarInitial = { endsAtMs: number; serverNowMs: number }

/**
 * A barra existe no 1º desenho (o servidor decide), ou não existe. Só conta logada, que nunca pagou, dentro da própria janela. Sem leitura confirmada
 * da conta (profileRead false), dispensada, ou com a Black Friday aberta (os 50% não acabam quando as 3 h acabam: um relógio de 3 h ali seria falso) = null.
 */
export function annualWelcomeBarState(input: {
  signedIn: boolean
  accountCreatedAt: unknown
  hasPaid: boolean | null | undefined
  profileRead: boolean
  bfOpen: boolean
  dismissed: boolean
  nowMs: number
}): AnnualWelcomeBarInitial | null {
  if (input.signedIn !== true || input.profileRead !== true || input.bfOpen === true || input.dismissed === true) return null
  if (!annualWelcomeOpen({ accountCreatedAt: input.accountCreatedAt, hasPaid: input.hasPaid, nowMs: input.nowMs })) return null
  return { endsAtMs: annualWelcomeEndsAtMs(input.accountCreatedAt) as number, serverNowMs: input.nowMs }
}

/** A barra se cala no /pricing: lá já existe a linha discreta, e dois relógios na mesma tela é o que o fundador não quer. */
export function annualWelcomeBarHidden(pathname: string): boolean {
  return pathname === '/pricing' || pathname.startsWith('/pricing/')
}

/**
 * A recuperação da Stripe é uma cópia exata da sessão e o link vive 30 dias: com o preço da oferta, ela levaria os 50% para muito depois da janela.
 * Sessão com oferta = sem recuperação (null = o checkout mantém a de sempre).
 */
export function annualOfferSessionRecovery(applied: boolean): { recovery: { enabled: false } } | null {
  return applied ? { recovery: { enabled: false } } : null
}

/** "2:41:07" — o tempo que falta, nunca negativo. */
export function annualOfferClock(msLeft: number): string {
  const s = Number.isFinite(msLeft) ? Math.max(0, Math.floor(msLeft / 1000)) : 0
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0')
  const ss = String(s % 60).padStart(2, '0')
  return `${Math.floor(s / 3600)}:${mm}:${ss}`
}
