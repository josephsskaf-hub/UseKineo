// KINEO-NUVEM-A4-2026-10-02 — o limite de personagens salvos por plano, num módulo PURO (sem import): lib/characters.ts
// reexporta daqui (a rota /api/characters segue igual) e as páginas públicas (/pricing, /ads, /business-video-ads) leem o
// número sem carregar o cliente do Supabase.

/** KINEO-CHARLOCK-V2-2026-07-10 — per-plan limits (briefing validated with
 *  paid jobs): FREE = 0 (locked UI is the upgrade bait), Starter/Creator = 3,
 *  Studio = 10. Server-side gate — never localStorage (thumbnail-limit lesson). */
export function characterLimitFor(plan: string, hasPaid: boolean): number {
  const p = (plan ?? '').toLowerCase()
  if (p === 'pro' || p === 'pro_trial') return 10
  if (p === 'basic' || p === 'basic_trial' || p === 'starter' || p === 'starter_trial') return 3
  return hasPaid ? 3 : 0
}
