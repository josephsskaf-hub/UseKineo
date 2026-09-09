// KINEO-PLANOS-9-19-29-2026-09-08 — motores caros só do Studio para cima.
//
// Decisão do fundador (08/09 03:20 BRT, planos $9/$19/$29): Starter e Creator
// incluem Kineo 1 + Seedance — os dois motores que fazem 99% dos filmes da
// casa (435 + 278 em 30 dias; Kling 2.5: 2; H3: 3; Veo/Kling 3/Omni/Avatar: 0).
// Kling 2.5, Veo 3.1, Kling 3, MiniMax H3, Omni Flash, Seedance 2.5 e Avatar
// passam a ser do Studio ($29). É isso que fecha a margem de Starter/Creator no
// piso da casa (24% no pior caso): sem o gate, 150 créditos de Creator podiam
// virar $17,40 de H3 contra $18,15 líquidos.
//
// GRANDFATHER: quem criou a conta ANTES de ENGINE_GATE_SINCE não perde nada —
// os 12 pagantes e os 146 trials ativos continuam com todo motor. O gate só
// existe para conta nova. Puro (sem env, sem banco) para o guardião executar.

export const ENGINE_GATE_SINCE = '2026-09-08T07:00:00.000Z'

/** Qualities que exigem Studio (pro) em conta nova. */
export const STUDIO_ONLY_QUALITIES: ReadonlySet<string> = new Set([
  'cinematic_kling',
  'cinematic_veo',
  'cinematic_sora',
  'cinematic_hollywood',
  'cinematic_h3',
  'cinematic_omni',
  'cinematic_s25',
  'avatar',
  'presenter',
])

/** `body.engine` da rota cinemática que cai no gate (o resto é Seedance). */
export const STUDIO_ONLY_ENGINE_KEYS: ReadonlySet<string> = new Set([
  'kling', 'veo', 'hollywood', 'h3', 'omni', 's25',
])

const STUDIO_PLANS: ReadonlySet<string> = new Set(['pro', 'pro_trial', 'studio', 'studio_trial', 'autopilot'])

export type EngineGateInput = {
  /** quality (compose) ou engine key (rota cinemática). */
  engine: string
  plan: string | null | undefined
  /** profiles.created_at (ISO). Ausente = trata como conta nova (falha fechada). */
  profileCreatedAt: string | null | undefined
}

export type EngineGateDecision =
  | { allowed: true; reason: 'not_premium' | 'studio_plan' | 'grandfathered' }
  | { allowed: false; reason: 'studio_required'; requiredTier: 'pro' }

export function isStudioOnlyEngine(engine: string): boolean {
  return STUDIO_ONLY_QUALITIES.has(engine) || STUDIO_ONLY_ENGINE_KEYS.has(engine)
}

export function decideEngineGate(input: EngineGateInput): EngineGateDecision {
  if (!isStudioOnlyEngine(input.engine)) return { allowed: true, reason: 'not_premium' }
  const plan = String(input.plan ?? 'free').toLowerCase()
  if (STUDIO_PLANS.has(plan)) return { allowed: true, reason: 'studio_plan' }
  const created = typeof input.profileCreatedAt === 'string' ? Date.parse(input.profileCreatedAt) : NaN
  if (Number.isFinite(created) && created < Date.parse(ENGINE_GATE_SINCE)) {
    return { allowed: true, reason: 'grandfathered' }
  }
  return { allowed: false, reason: 'studio_required', requiredTier: 'pro' }
}

/** Nome que a pessoa lê na recusa. */
export function engineDisplayName(engine: string): string {
  switch (engine) {
    case 'kling':
    case 'cinematic_kling':
      return 'Kling 2.5'
    case 'veo':
    case 'cinematic_veo':
      return 'Veo 3.1'
    case 'hollywood':
    case 'cinematic_hollywood':
      return 'Kling 3'
    case 'h3':
    case 'cinematic_h3':
      return 'MiniMax H3'
    case 'omni':
    case 'cinematic_omni':
      return 'Omni Flash'
    case 's25':
    case 'cinematic_s25':
      return 'Seedance 2.5'
    case 'avatar':
    case 'presenter':
      return 'Avatar'
    default:
      return engine
  }
}

export function engineGateMessage(engine: string): string {
  return `${engineDisplayName(engine)} is a Studio engine ($59/mo, every engine). Starter and Creator include Kineo 1 and Seedance 1.5.`
}
