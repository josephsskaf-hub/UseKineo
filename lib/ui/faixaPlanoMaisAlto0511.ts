// KINEO-PRIMEIRA-TELA-0511 — fundador 05/11: quem já está no plano mais alto não recebe "Upgrade" na faixa do topo da home.
// Studio (pro), Autopilot, Autopilot Lite (mesmo preço do Studio) e Business não têm degrau acima para esta faixa vender.
// Qualquer outro valor, inclusive leitura que falhou, mantém a faixa como sempre. Guardião: scripts/test-primeira-tela-0511.mjs.
const PLANOS_SEM_DEGRAU = new Set(['pro', 'studio', 'autopilot', 'autopilot_lite', 'business'])

export function faixaSomeParaPlano(plan: unknown): boolean {
  return typeof plan === 'string' && PLANOS_SEM_DEGRAU.has(plan.trim().toLowerCase())
}
