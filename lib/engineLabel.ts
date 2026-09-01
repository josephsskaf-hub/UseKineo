// KINEO-SELO-MOTOR-2026-08-28 — pedido do fundador, na hora em que um
// Seedance de 25 caracteres saiu perfeito: "cada vídeo no My Videos tem que
// dizer qual motor foi usado — hoje a pessoa tem que adivinhar".
//
// Princípio da casa (Log de sacadas): SELO HONESTO É ATIVO DE MARCA — badge
// do motor = motor real, sempre. Este arquivo é a ÚNICA tradução de
// `videos.quality_mode` para nome público de motor; duplicar esse mapa numa
// tela seria plantar o dia em que um card mente o motor.
//
// Nomes públicos conforme o padrão de 15/08 (Veo 3.1, Kling 2.5, Kling 3
// ex-Hollywood, Seedance 1.5, Kineo 1 ex-Fast, MiniMax H3, Omni Flash,
// Avatar ex-AI Presenter).
const MAPA: Record<string, string> = {
  fast: 'Kineo 1',
  cinematic_ai: 'Seedance 1.5',
  cinematic_kling: 'Kling 2.5',
  cinematic_veo: 'Veo 3.1',
  cinematic_hollywood: 'Kling 3',
  cinematic_h3: 'MiniMax H3',
  cinematic_omni: 'Omni Flash',
  cinematic_s25: 'Seedance 2.5',
  cinematic_sora: 'Sora',
  avatar: 'Avatar',
  presenter: 'Avatar',
  // Tiers legados pré-vitrine: rodavam no mesmo pipeline do Kineo 1 com
  // stock — rotular como o motor real, não como o nome de tier morto.
  basic: 'Kineo 1',
  basic_ai: 'Kineo 1',
  pro: 'Kineo 1',
}

/** Nome público do motor para um quality_mode; null = não inventar selo. */
export function engineLabelFor(qualityMode: string | null | undefined): string | null {
  if (!qualityMode) return null
  return MAPA[qualityMode.toLowerCase().trim()] ?? null
}
