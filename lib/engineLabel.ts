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
  cinematic_h3max: 'MiniMax H3 Max', // KINEO-H3MAX-2026-10-13
  cinematic_omni: 'Omni Flash',
  cinematic_s25: 'Seedance 2.5',
  cinematic_sora: 'Sora',
  avatar: 'Avatar',
  presenter: 'Avatar',
  // KINEO-ADS-V2-2026-09-28 — anúncio v2: as fotos do cliente animadas (Kling O3 / Seedance 2.0 / H3) e montadas.
  ads_v2: 'Studio Ads',
  // Tiers legados pré-vitrine: rodavam no mesmo pipeline do Kineo 1 com
  // stock — rotular como o motor real, não como o nome de tier morto.
  basic: 'Kineo 1',
  basic_ai: 'Kineo 1',
  pro: 'Kineo 1',
}

// KINEO-H3-TURBO-ABRE-0511 — o filme padrão vende na chave 'seedance' e quality 'cinematic_ai', mas anima no H3 Max Turbo: o selo vem do modelo
// que o claim assinado guarda. Filme antigo, reserva de texto, filme grátis e Kling 4 não entram: seguem com o selo de sempre.
const H3_TURBO_FAL_MODEL = 'minimax/h3-max-turbo/image-to-video'
const H3_TURBO_T2V_FAL_MODEL = 'minimax/h3-max-turbo/text-to-video' // KINEO-SEEDANCE-SAI-1111 — selo honesto: cena que rodou no H3 Turbo t2v
export function engineUsedDoFilmePadrao(claim: { quality?: unknown; falModels?: unknown; response?: Record<string, unknown> | null } | null | undefined): 'h3_max_turbo' | null {
  if (!claim || claim.quality !== 'cinematic_ai' || !Array.isArray(claim.falModels)) return null
  if (claim.response?.kling4_paid || claim.response?.kling4_trial) return null
  return claim.falModels.includes(H3_TURBO_FAL_MODEL) || claim.falModels.includes(H3_TURBO_T2V_FAL_MODEL) /* KINEO-SEEDANCE-SAI-1111 */ ? 'h3_max_turbo' : null
}

/** Nome público do motor para um quality_mode; null = não inventar selo. */
export function engineLabelFor(qualityMode: string | null | undefined, engineUsed?: string | null): string | null {
  if (engineUsed) {
    const actual: Record<string, string> = {
      kling4: 'Kling 4.0', kling3: 'Kling 3',
      h3_max_turbo: 'MiniMax H3 Turbo', // KINEO-H3-TURBO-ABRE-0511
      seedance15_fallback: 'Seedance 1.5', seedance15_cap: 'Seedance 1.5',
      seedance: 'Seedance 1.5', seedance2: 'Seedance 2', veo31: 'Veo 3.1',
    }
    // A new or unknown supplier value must not inherit the catalogue's label.
    return actual[engineUsed.trim().toLowerCase()] ?? null
  }
  if (!qualityMode) return null
  return MAPA[qualityMode.toLowerCase().trim()] ?? null
}

// KINEO-RESERVA-H3-0611 — a reserva do filme grátis leva o selo do motor que rodou de verdade. Kling 4 entregue não entra.
export function engineDaReservaDoGratis(claim: { falModels?: unknown; response?: Record<string, unknown> | null } | null | undefined): 'h3_max_turbo' | null {
  const teste = claim?.response?.kling4_trial as { engine_used?: unknown } | undefined
  if (!teste || (teste.engine_used !== 'seedance15_fallback' && teste.engine_used !== 'seedance15_cap')) return null
  return Array.isArray(claim?.falModels) && (claim.falModels.includes('minimax/h3-max-turbo/image-to-video') || claim.falModels.includes(H3_TURBO_T2V_FAL_MODEL) /* KINEO-SEEDANCE-SAI-1111 */) ? 'h3_max_turbo' : null
}
