// KINEO-STUDIO-CLS-2026-10-13 — o layout do (dashboard) já lê o perfil no SERVIDOR. Com isso ele sabe, antes do primeiro
// pixel, se o TrialActiveBanner vai abrir: as MESMAS quatro guardas que o banner aplica à resposta de /api/credits
// (components/TrialActiveBanner.tsx), calculadas pela MESMA função (trialUiState) sobre a MESMA linha de profiles.
//   1. fase 'active' (flag do reverse trial ligada, status 'active', relógio e teto não vencidos);
//   2. não pagou e não tem plano Starter/Creator/Studio/Business (o mesmo mapa do /api/credits);
//   3. recebeu crédito de trial (trial_credits_granted > 0);
//   4. prazo legível e positivo.
// O resultado NÃO decide se o banner aparece (quem decide continua sendo o fetch do próprio banner); só reserva o LUGAR
// dele enquanto o fetch não volta, para a tela não pular. Errar aqui custa no máximo um salto — o de hoje.
import { trialUiState, type TrialUiRow } from '@/lib/reverseTrial'

const PLANOS_QUE_ESCONDEM = new Set(['starter', 'starter_trial', 'basic', 'basic_trial', 'pro', 'pro_trial', 'business'])

export function trialBannerReserveExpected(profile: (TrialUiRow & { has_paid?: unknown; plan?: unknown }) | null | undefined, now: number = Date.now()): boolean {
  if (!profile) return false
  const ui = trialUiState(profile, now)
  if (ui.phase !== 'active') return false
  if (profile.has_paid === true) return false
  const plan = typeof profile.plan === 'string' ? profile.plan : 'free'
  if (PLANOS_QUE_ESCONDEM.has(plan)) return false
  if (!(ui.creditsGranted > 0)) return false
  if (!(typeof ui.msLeft === 'number' && ui.msLeft > 0)) return false
  return true
}
