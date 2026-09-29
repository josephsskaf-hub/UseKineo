// KINEO-E4-SAIDA-B-2026-09-29 — [TRAVA 8.2] o PORTÃO DO KINEO 1 no servidor (fundador 29/09: "Kineo 1 fora do jogo";
// conta nova não recebe Kineo 1 grátis; ele fica para quem paga e já usa, para quem comprou pacote/passe e para os
// bastidores — Studio Ads clássico e Autopilot).
//
// POR QUE NO SERVIDOR E ANTES DE TUDO: a /api/generate-video-fast gasta ~US$ 0,39 de clipes de IA no "1º filme" de
// qualquer conta sem linha em `videos` (fal, antes do compose). Com a cota de Kineo 1 em 0 o compose recusa, a conta
// nunca ganha linha em `videos` e CADA clique volta a ser o "1º filme": vazamento sem teto. O portão roda logo depois
// da autenticação — antes do dry-run, do planejador (OpenAI), do Pixabay e do fal — e o compose repete a régua no ramo
// free-plan-fast (sem tocar compose/status nem compose/unlock).
//
// QUEM PASSA (qualquer um basta):
//   · has_paid === true — pagante, comprador de pacote avulso (bulk*) e do passe do Studio Ads: o webhook grava
//     has_paid:true no MESMO UPDATE dos créditos. Cobre o kineo1Visible (lib/engineLaunch.ts), cujo legado exige has_paid
//     ou pacote — os dois implicam has_paid;
//   · plano pago (mesma lista do compose/cinematic) ou plano Autopilot (AUTOPILOT_PAID_PLANS — o robô chama esta rota
//     com a sessão do dono);
//   · conta da casa pela LISTA EXATA (INTERNAL_EXACT_EMAILS). NÃO pelos padrões LIKE de isInternalEmail ('test%',
//     '%mailinator%'…): qualquer estranho registra "test123@…" e levaria o Kineo 1 com clipes de IA pagos pela casa —
//     a mesma lição do lib/ads/access.ts (revisão adversarial de 24/09).
// QUEM NÃO PASSA: trial ativo sem pagamento, conta grátis vencida, 'region_paid_only', 'blocked' — 403 kineo1_retired,
// nada cobrado, nenhum fornecedor chamado. O filme grátis delas é o Seedance 1.5 de 15 s (trial ou cota semanal de país
// rico, lib/freeWeeklyFilm.ts).
//
// Módulo PURO (sem env, sem banco): a rota lê o perfil e decide aqui; o guardião executa a MESMA função.
import { INTERNAL_EXACT_EMAILS } from '@/lib/internalAccounts'
import { AUTOPILOT_PAID_PLANS } from '@/lib/autopilot/config'

/** Espelho dos planos pagos do compose/cinematic (as duas rotas mantêm o Set local; este é o do portão). */
export const KINEO1_GATE_PAID_PLANS: ReadonlySet<string> = new Set([
  'starter', 'starter_trial', 'basic', 'basic_trial',
  'pro', 'pro_trial', 'creator', 'creator_trial', 'studio', 'studio_trial',
])

export const KINEO1_RETIRED_REASON = 'kineo1_retired'
export const KINEO1_RETIRED_EVENT = 'kineo1_retired_refused'
export const KINEO1_RETIRED_MESSAGE =
  'Kineo 1 is now available only on paid plans. Your free film is the 15-second Seedance 1.5 film — pick Seedance 1.5 in the Studio. Nothing was charged.'

export type Kineo1GateReason = 'internal' | 'has_paid' | 'paid_plan' | 'autopilot' | 'retired'

export interface Kineo1GateInput {
  /** E-mail VERIFICADO (auth.getUser ou profiles lido pelo id do serviço) — nunca vindo do corpo do pedido. */
  email?: string | null
  plan?: string | null
  hasPaid?: boolean | null
}

function isHouseExact(email: string | null | undefined): boolean {
  const e = (email ?? '').trim().toLowerCase()
  if (!e) return false
  return INTERNAL_EXACT_EMAILS.some((x) => x.toLowerCase() === e)
}

/** Por que esta conta pode (ou não) gerar Kineo 1. 'retired' = recusar antes de qualquer fornecedor. */
export function kineo1GateReason(input: Kineo1GateInput | null | undefined): Kineo1GateReason {
  const i = input ?? {}
  if (isHouseExact(i.email)) return 'internal'
  if (i.hasPaid === true) return 'has_paid'
  const plan = typeof i.plan === 'string' ? i.plan.trim().toLowerCase() : ''
  if (KINEO1_GATE_PAID_PLANS.has(plan)) return 'paid_plan'
  if (AUTOPILOT_PAID_PLANS.has(plan)) return 'autopilot'
  return 'retired'
}

export function kineo1DispatchAllowed(input: Kineo1GateInput | null | undefined): boolean {
  return kineo1GateReason(input) !== 'retired'
}
