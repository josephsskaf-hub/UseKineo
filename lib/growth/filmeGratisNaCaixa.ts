// KINEO-CAIXA-GRATIS-VISIVEL-0411 [fundador 04/11: "1 free film left · 15 s" na caixa] — uma linha discreta perto da caixa do Studio, só com prova do servidor.
//
// A régua é a do TrialActiveBanner (as 4 guardas dele sobre /api/credits) + decideTrialFirstDelivery no filme curto: trial ativo, nunca pagou, recebeu crédito,
// não gastou nada, o saldo cobre os 15 s e nenhum filme entregue. Qualquer campo ausente, nulo ou de outro tipo = não mostra.
// Conta do lado "a pedido" do teste (trial_status on_request) chega com trial.phase 'none': não tem o crédito ainda, a faixa TrialPedidoBanner é quem oferece; depois de pedir, vira trial ativo e a linha aparece.
// Módulo puro: sem env, sem rede. Guardião: scripts/test-frente-0411.mjs.
import { decideTrialFirstDelivery } from '@/lib/growth/trialBalanceBridge'

export const LINHA_DO_FILME_GRATIS = '1 free film left · 15 s'
export const EVENTO_DA_LINHA = 'studio_free_film_line_shown'

function numero(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

/** O corpo de GET /api/credits diz, com todas as letras, que esta conta ainda tem o filme grátis? */
export function filmeGratisNaCaixa(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object') return false
  const d = payload as Record<string, unknown>
  const trial = d.trial as Record<string, unknown> | null | undefined
  if (!trial || trial.phase !== 'active') return false
  if (d.entitlementsResolved !== true || d.hasPaid !== false) return false
  if (d.isStarter === true || d.isCreator === true || d.isStudio === true) return false
  if ((numero(trial.creditsGranted) ?? 0) <= 0) return false
  if ((numero(trial.msLeft) ?? 0) <= 0) return false
  if (d.filmsDelivered !== 0) return false
  return decideTrialFirstDelivery({ trialPhase: 'active', credits: numero(d.credits), creditsUsed: numero(trial.creditsUsedForDisplay), shortFilm: true }).eligible
}
