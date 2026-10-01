// MRR-20261001: presentation only. Never calculates or charges engine costs.
export const MRR_NEAR_IDEA_ENABLED = true
export const MRR_STUDIO_VERSION = 'mrr_studio_20261001_v1' as const

export function nearIdeaAction(f: { prompt: string; cost: number; balance: number | null; overLimit: boolean; bareStarter: boolean }) {
  if (!f.prompt.trim() || f.bareStarter) return { disabled: true, label: 'Add your idea to generate' }
  if (f.overLimit) return { disabled: true, label: 'Shorten your idea to continue' }
  if (f.balance === null || !Number.isFinite(f.balance) || !Number.isFinite(f.cost) || f.cost <= 0) {
    return { disabled: true, label: 'Review your credits below' }
  }
  if (f.cost > f.balance) return { disabled: true, label: `Need ${f.cost - f.balance} more credits` }
  return { disabled: false, label: `Generate · ${f.cost} cr →` }
}
