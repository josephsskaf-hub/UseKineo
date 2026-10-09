// KINEO-CLIPES-CARTAO-MOTOR-2026-10-09 — o que o cartão de motor do /clips diz (fundador, 09/10, print do seletor: "um S, o
// nome do motor embaixo, a quantidade de segundos… precisa melhorar a comunicação visual"). Sai a letra ("S", "K3"), sai a
// lista "5 · 7 · 10 · 12 s"; entram o nome, uma frase do que o motor faz bem e a faixa de duração ("5–12 s").
// MÓDULO PURO: os guardiões executam isolado.

/** A faixa de duração a partir das durações REAIS do motor: "6 s", "6 or 8 s", "5–12 s". */
export function clipSecondsLabel(seconds: readonly number[]): string {
  const list = [...new Set(seconds.filter((s) => Number.isFinite(s) && s > 0))].sort((a, b) => a - b)
  if (list.length === 0) return ''
  if (list.length === 1) return `${list[0]} s`
  if (list.length === 2) return `${list[0]} or ${list[1]} s`
  return `${list[0]}–${list[list.length - 1]} s`
}

/** Uma frase por motor: o que ele faz bem, sem superlativo que a casa não prova (regra do selo honesto). */
export const CLIP_ENGINE_TAGLINE: Record<string, string> = {
  seedance: 'Quick everyday scenes',
  kling: 'Smooth, realistic motion',
  hollywood: 'Premium cinematic look',
  veo: "Google's video model",
  h3: 'Natural people and faces',
  omni: 'Fast cinematic motion',
  s25: "ByteDance's newest model",
}
