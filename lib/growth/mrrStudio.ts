// MRR-20261001: presentation only. Never calculates or charges engine costs.
// 01/10 (fundador, ao ver dois Generate no /studio: "vamos deixar só embaixo"): desligado. O botão perto da ideia deixava
// gerar ANTES de escolher modo do roteiro, língua da narração e duração; o Generate do resumo do quadro fica sozinho.
// O funil segue medindo (variant='control'). Não religar sem o ok do fundador.
export const MRR_NEAR_IDEA_ENABLED = false
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
