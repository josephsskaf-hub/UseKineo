// KINEO-FLUXO-NOVO-2026-09-25 — Peça A do fluxo novo (ordem do fundador, 25/09): "Vídeo → /studio direto na caixa da
// ideia → filme pronto com 3 saídas: próximo filme · mais créditos (barra 50-2.000) · assinar".
// Esta é a parte PURA (testável sem rede) da decisão; a tela é components/FilmReadyExits.tsx.
//
// POR QUE CADA REGRA:
// · Próximo filme NAVEGA para /studio. Nunca reseta a tela no lugar: numa URL com ?studio=1 a fase 'idle' casa com a
//   cortina "Directing your film…" e a pessoa fica presa (mesmo defeito que o KINEO-EDITAR-VOLTA-AO-STUDIO-2026-09-23
//   consertou no botão de editar). Leva só as ESCOLHAS (motor, duração, modo, língua, formato), nunca o texto nem os
//   gatilhos de disparo (prompt/studio/autoanalyze/create_intent): o próximo filme começa na caixa vazia, sem gastar nada.
// · Mais créditos abre a barra (CreditsTopupModal) SÓ para quem o checkout aceita (canPurchaseCreditTopup — a MESMA
//   regra que a rota da Stripe aplica). Free/trial/Autopilot/plano desconhecido vão aos planos: mostrar a barra a quem o
//   cobrador recusa repete o beco do 403 (topup_requires_creator_plus). Abrir a barra para free/trial é oferta nova e
//   fica com o fundador.
// · Nenhum preço aqui: preço congelado até 09/10 e sempre das fontes únicas (a barra já lê lib/credits/creditSlider).
import { canPurchaseCreditTopup } from '@/lib/growth/topupEligibility'

export const FILM_READY_EXITS_VERSION = 'film_ready_exits_v1' as const
/** Vira intent_campaign no /pricing (pricing_view.source) e segue até o checkout do plano. */
export const FILM_READY_EXITS_CAMPAIGN = 'film_ready_v1' as const
/** A barra grava checkout_cta_clicked com surface `credits_topup_modal_film_ready`. */
export const FILM_READY_TOPUP_SURFACE = 'film_ready' as const

export type FilmReadyExit = 'next_film' | 'more_credits' | 'subscribe'
export type FilmReadyCreditsExit = 'topup' | 'plans'
export type FilmReadyPlanState = 'subscriber' | 'not_subscriber' | 'unknown'
export type FilmReadyDestination = 'studio' | 'topup_modal' | 'pricing'

// Só decide o RÓTULO do 3º botão ("Change plan" x "Subscribe"); o destino é o mesmo /pricing#plans, onde a troca de
// plano (lib/growth/planSwitch) decide pela assinatura real na Stripe. Mesma lista de lib/growth/lowBalancePricingBridge.
const SUBSCRIPTION_PLANS = new Set([
  'starter',
  'starter_trial',
  'basic',
  'basic_trial',
  'creator',
  'creator_trial',
  'pro',
  'pro_trial',
  'studio',
  'studio_trial',
  'autopilot',
  'autopilot_trial',
  'autopilot_pilot',
])

// As escolhas que o /studio lê da URL (StudioClient valida cada uma). Mesma lista do botão de editar.
const NEXT_FILM_CARRY_KEYS = ['engine', 'duration', 'script_mode', 'language', 'aspect'] as const
const SAFE_CHOICE = /^[A-Za-z0-9:_-]{1,24}$/

function normalizedPlan(plan: unknown): string {
  return typeof plan === 'string' ? plan.trim().toLowerCase() : ''
}

/** 'topup' abre a barra de créditos; 'plans' manda aos planos. Plano nulo (leitura falhou) cai em 'plans': nunca um 403. */
export function filmReadyCreditsExit(plan: unknown): FilmReadyCreditsExit {
  return canPurchaseCreditTopup(plan) ? 'topup' : 'plans'
}

export function filmReadyPlanState(plan: unknown): FilmReadyPlanState {
  const p = normalizedPlan(plan)
  if (!p) return 'unknown'
  return SUBSCRIPTION_PLANS.has(p) ? 'subscriber' : 'not_subscriber'
}

/** Rótulo honesto: quem assina troca de plano; quem não assina assina; leitura falhou → "See plans" (nem um nem outro). */
export function filmReadyPlanLabel(plan: unknown): string {
  const state = filmReadyPlanState(plan)
  if (state === 'subscriber') return 'Change plan'
  if (state === 'not_subscriber') return 'Subscribe'
  return 'See plans'
}

/** /studio com as escolhas do filme que acabou de sair + focus=idea. Nunca o texto, nunca gatilho de disparo. */
export function filmReadyNextFilmHref(currentSearch: unknown): string {
  const out = new URLSearchParams()
  let atual: URLSearchParams | null = null
  try {
    atual = new URLSearchParams(typeof currentSearch === 'string' ? currentSearch : '')
  } catch {
    atual = null
  }
  for (const key of NEXT_FILM_CARRY_KEYS) {
    const value = atual?.get(key)
    if (value && SAFE_CHOICE.test(value)) out.set(key, value)
  }
  out.set('focus', 'idea')
  return `/studio?${out.toString()}`
}

export function filmReadyPlansHref(): string {
  return `/pricing?intent_campaign=${FILM_READY_EXITS_CAMPAIGN}#plans`
}

export function filmReadyExitDestination(exit: FilmReadyExit, plan: unknown): FilmReadyDestination {
  if (exit === 'next_film') return 'studio'
  if (exit === 'more_credits') return filmReadyCreditsExit(plan) === 'topup' ? 'topup_modal' : 'pricing'
  return 'pricing'
}

function videoIdOf(videoId: unknown): string | null {
  return typeof videoId === 'string' && videoId.length > 0 ? videoId.slice(0, 64) : null
}

export function filmReadyExitsShownMetadata(input: { videoId: unknown; plan: unknown }) {
  return {
    version: FILM_READY_EXITS_VERSION,
    video_id: videoIdOf(input.videoId),
    credits_exit: filmReadyCreditsExit(input.plan),
    plan_state: filmReadyPlanState(input.plan),
  }
}

export function filmReadyExitClickedMetadata(input: { exit: FilmReadyExit; videoId: unknown; plan: unknown }) {
  return {
    version: FILM_READY_EXITS_VERSION,
    exit: input.exit,
    destination: filmReadyExitDestination(input.exit, input.plan),
    video_id: videoIdOf(input.videoId),
    credits_exit: filmReadyCreditsExit(input.plan),
    plan_state: filmReadyPlanState(input.plan),
  }
}
