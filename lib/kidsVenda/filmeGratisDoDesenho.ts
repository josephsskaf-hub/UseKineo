// KINEO-CELULAR-FLUXO-0611 — quem cai em /kids-cartoon sem plano e ainda tem o filme grátis precisa de uma saída até ele. Desenho
// continua só com plano (KINEO-CARTOON-SO-PLANO-0411); aqui só se diz a verdade sobre o filme. Falha fechada: na dúvida, nada aparece.
export function filmeGratisAberto(p: { trial_status?: string | null; has_paid?: boolean | null; video_credits?: number | null } | null | undefined, filmesProntos: number | null): boolean {
  if (!p || p.has_paid === true || filmesProntos !== 0) return false
  if (p.trial_status === 'on_request') return true
  return p.trial_status === 'active' && typeof p.video_credits === 'number' && p.video_credits > 0
}
