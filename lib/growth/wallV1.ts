// KINEO-PAREDE-V1-2026-09-23 — a parede dos 10 créditos vira uma porta com o
// filme da pessoa na frente.
//
// O DADO QUE MOTIVOU (medido 23/09). Quem chega do ChatGPT com roteiro pronto
// escolhe Seedance (15-25 cr), bate na parede dos 10 créditos do trial ANTES
// do primeiro filme e, quando paga, paga ali, em minutos: 5 dos 7 últimos
// pagantes pagaram com 0 filmes, entre 0 e 6 min depois de bater. A parede
// (`upgrade_modal_opened reason=trial_spent`, 57 de 83 em 30 d) mostrava três
// planos com o Creator marcado "recommended" — e o Creator fechou 1/21 desde
// 09/09; o Starter, 3/13. Fundador 23/09: "vai" na parede v1 — Starter
// primeiro, mostrar o filme, roteiro guardado, render só no clique.
//
// O QUE ESTE MÓDULO É: puro. Sem React, sem servidor. Ele dá ao GenerateClient
// as peças de texto e de URL da parede, para que nenhuma delas seja redigitada
// dentro de um arquivo de 22 mil linhas. Preço NUNCA nasce aqui: o botão do
// Starter usa formatCheckoutMoney/getTierPrice na tela (moeda do /api/geo).
//
// O MOTOR NÃO É TROCADO por conta própria — a parede fala do filme que a
// pessoa pediu, no motor que ela escolheu.
import { engineLabelFor } from '@/lib/engineLabel'

export const WALL_V1_VERSION = 'wall_v1' as const
/** Campanha que TODO href de checkout da parede carrega — vence qualquer outra. */
export const WALL_V1_INTENT_CAMPAIGN = 'wall_v1' as const
/** Campanha do pacote comprado de dentro do Studio (handleBuyCreditsOnly). */
export const BUY_CREDITS_STUDIO_INTENT_CAMPAIGN = 'buy_credits_studio_v1' as const
/** Campanha do "Back to your script" do /checkout/success. */
export const CHECKOUT_SUCCESS_RESUME_INTENT_CAMPAIGN = 'checkout_success_resume_v1' as const
/** Para onde a volta pós-pagamento cai quando há rascunho fresco (nada dispara sozinho). */
export const WALL_V1_RESUME_PATH = '/studio/create?resume=wall_v1' as const

export type WallV1Reason = 'trial_spent' | 'credits' | 'trial_ended' | 'trial_stalled'
const WALL_V1_REASONS: readonly string[] = ['trial_spent', 'credits', 'trial_ended', 'trial_stalled']

/** As razões de FALTA DE CRÉDITO. Gate de plano (studio/creator/footage) fica fora. */
export function isWallV1Reason(reason: string | null | undefined): reason is WallV1Reason {
  return typeof reason === 'string' && WALL_V1_REASONS.includes(reason)
}

/**
 * Título da parede: as 6 primeiras palavras do prompt entre aspas, ou
 * 'your script' quando não há texto. Nunca lança com entrada estranha.
 */
export function wallV1Title(prompt: string | null | undefined): string {
  const words = (prompt ?? '').trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return 'your script'
  const head = words.slice(0, 6).join(' ')
  return `“${head}${words.length > 6 ? '…' : ''}”`
}

/**
 * O quality_mode que o cobrador entende para o par (mode, aiEngine) da tela —
 * a MESMA tabela que `selectedCost` consulta em GenerateClient. 'fast' e
 * 'creator' despacham no Kineo 1; 'cinematic_ai' + seedance é 'cinematic_ai'.
 */
export function wallV1QualityMode(mode: string, aiEngine: string): string {
  if (mode === 'fast' || mode === 'creator') return 'fast'
  if (mode === 'cinematic_ai') {
    return aiEngine === 'seedance' || !aiEngine ? 'cinematic_ai' : `cinematic_${aiEngine}`
  }
  return mode
}

/** Rótulo público do motor (Kineo 1, Seedance 1.5, Kling 3…). Fallback: nunca vazio. */
export function wallV1EngineLabel(mode: string, aiEngine: string): string {
  return engineLabelFor(wallV1QualityMode(mode, aiEngine)) ?? (mode === 'fast' || mode === 'creator' ? 'Kineo 1' : 'this engine')
}

/** 'This film on Seedance 1.5 = 15 credits. Your trial has 10.' */
export function wallV1GapLine(input: {
  engineLabel: string
  requiredCredits: number
  balance: number
  reason: string
}): string {
  const req = Math.max(0, Math.ceil(Number.isFinite(input.requiredCredits) ? input.requiredCredits : 0))
  const bal = Math.max(0, Math.floor(Number.isFinite(input.balance) ? input.balance : 0))
  const where = input.reason === 'trial_spent' || input.reason === 'trial_stalled' || input.reason === 'trial_ended'
    ? 'Your trial has'
    : 'You have'
  return `This film on ${input.engineLabel} = ${req} credit${req === 1 ? '' : 's'}. ${where} ${bal}.`
}

/** '= this film + N more like it this month' (N = filmes cobertos − 1, piso 0). */
export function wallV1FilmsLine(filmsCovered: number): string {
  const more = Math.max(0, Math.floor(Number.isFinite(filmsCovered) ? filmsCovered : 1) - 1)
  return more === 0
    ? '= this film, this month'
    : `= this film + ${more} more like it this month`
}

export const WALL_V1_SAVED_LINE = 'Your script is saved for 45 minutes; after paying, 1 click.'

/**
 * Href de checkout de assinatura da parede. `intent_campaign=wall_v1` SEMPRE —
 * é a única forma de separar, no Stripe e no placar, quem pagou pela parede.
 * Se a tela já tinha outra campanha, ela vai no evento como
 * `previous_intent_campaign`, nunca na URL: duas campanhas na mesma Session é
 * uma atribuição que ninguém consegue ler.
 */
export function wallV1CheckoutHref(tier: 'starter' | 'basic' | 'pro'): string {
  const intro = tier === 'starter' || tier === 'basic' ? '&intro=1' : ''
  return `/api/stripe/checkout?tier=${tier}${intro}&intent_campaign=${WALL_V1_INTENT_CAMPAIGN}`
}

/**
 * Pacote comprado de dentro do Studio: volta para o Studio (o servidor cria o
 * ramo `return=studio` → /studio/create?resume=wall_v1&pack=…), e ganha a
 * campanha própria SÓ se a URL ainda não carrega uma.
 */
export function withStudioReturn(href: string): string {
  const withReturn = /[?&]return=/.test(href) ? href : `${href}${href.includes('?') ? '&' : '?'}return=studio`
  return /[?&]intent_campaign=/.test(withReturn)
    ? withReturn
    : `${withReturn}&intent_campaign=${BUY_CREDITS_STUDIO_INTENT_CAMPAIGN}`
}

/** Destino do "Back to your script →" no /checkout/success. */
export function checkoutSuccessResumeHref(): string {
  return `${WALL_V1_RESUME_PATH}&intent_campaign=${CHECKOUT_SUCCESS_RESUME_INTENT_CAMPAIGN}`
}

// KINEO-PAREDE-V1-CREDITO-2026-09-23 — a volta do PACOTE (?return=studio →
// /studio/create?resume=wall_v1&pack=starter&session_id=…) não passa pelo
// /checkout/success, que espera o entitlement. O Studio fazia UM fetch de saldo
// na montagem; se o webhook da Stripe atrasar alguns segundos (normal), a
// promessa "after paying, 1 click" terminava em NOVA parede com o saldo velho —
// o pior desfecho, logo depois de pagar. Régua da volta: o saldo gravado no
// instante do clique do pacote (sessionStorage). O Studio repolla /api/credits
// a cada WALL_V1_PACK_POLL_MS por até WALL_V1_PACK_POLL_MAX_MS até o saldo
// PASSAR da régua, e só então libera o Generate. Sem régua (outro navegador),
// mede sem travar: a primeira leitura vira régua e ninguém fica preso.
export const WALL_V1_PACK_BALANCE_KEY = 'kineo_wall_v1_pack_balance' as const
export const WALL_V1_PACK_POLL_MS = 2_000
export const WALL_V1_PACK_POLL_MAX_MS = 30_000

/** Régua gravada no clique: inteiro ≥ 0 ou null (ausente, lixo, negativo). */
export function readWallV1PackBaseline(raw: string | null | undefined): number | null {
  if (typeof raw !== 'string' || !raw.trim()) return null
  const n = Number(raw)
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null
}

/** O pacote CAIU quando o saldo lido passa da régua. Régua ou leitura nula = ainda não. */
export function wallV1PackCredited(baseline: number | null, current: number | null): boolean {
  return typeof baseline === 'number' && typeof current === 'number' && current > baseline
}
