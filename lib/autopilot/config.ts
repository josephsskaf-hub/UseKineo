// KINEO-AUTOPILOT-2026-07-26 — teto de custo e matemática de cadência.
//
// Este arquivo é a única fonte de verdade sobre "o que o Autopilot tem
// permissão de gastar" e "quando a próxima run acontece".

import type { Quality } from '@/lib/credits/engineCost'

// ═══════════════════════════════════════════════════════════════════════════
// TETO DE MOTOR — restrição de NEGÓCIO, não preferência.
// ═══════════════════════════════════════════════════════════════════════════
// Custo real por render declarado no repo:
//   Fast              ≈ $0.02 – 0.05
//   AI Gen (Seedance) ≈ $1.56 – 2.34
//   Hollywood         ≈ $8.90 – 10.20
//
// Um plano de $299/mês entregando 90 renders/mês:
//   Fast      → ~$4.50 de COGS   (1.5% da receita)
//   Seedance  → ~$180 de COGS    (60% da receita — margem some)
//   Hollywood → ~$800+ de COGS   (falência imediata)
//
// Por isso o Autopilot roda no motor BARATO por padrão e o teto é aplicado
// SERVER-SIDE: mesmo que alguém faça UPDATE direto em
// autopilot_schedules.engine = 'cinematic_hollywood', clampAutopilotEngine()
// derruba de volta para o default antes de qualquer chamada a provider.
export const AUTOPILOT_DEFAULT_ENGINE: Quality = 'fast'

// Só motores servidos pelo pipeline de stock (/api/generate-video-fast →
// /api/compose). 'cinematic_ai' (Seedance), 'cinematic_kling', 'cinematic_veo',
// 'cinematic_sora', 'cinematic_hollywood', 'avatar' e 'presenter' estão FORA
// de propósito: além do custo, eles nascem em rotas de geração de clipe
// diferentes e assíncronas — cobrar 20-150 créditos por um vídeo montado com
// clipes de stock seria cobrar caro entregando barato.
export const AUTOPILOT_ALLOWED_ENGINES: readonly Quality[] = ['fast', 'basic_ai'] as const

export function clampAutopilotEngine(raw: string | null | undefined): Quality {
  const value = (raw ?? '').toString().trim().toLowerCase()
  const match = AUTOPILOT_ALLOWED_ENGINES.find((e) => e === value)
  return match ?? AUTOPILOT_DEFAULT_ENGINE
}

// Shorts. 45s é o mínimo suportado por /api/generate-video-fast.
export const AUTOPILOT_DURATION_SECONDS = 45

// Quantos temas anteriores o seletor evita repetir.
export const AUTOPILOT_TOPIC_MEMORY = 12

// Um render que passou disso claramente morreu (42% dos renders deste app
// morrem invisíveis). A run é marcada failed e a agenda segue para amanhã em
// vez de ficar presa para sempre num render fantasma.
export const AUTOPILOT_RENDER_TIMEOUT_MS = 6 * 60 * 60 * 1000

// Teto de trabalho por invocação, para caber no wall-clock da função.
export const AUTOPILOT_MAX_STARTS_PER_RUN = 12
export const AUTOPILOT_MAX_PUBLISHES_PER_RUN = 12

// Paginação: PostgREST corta silenciosamente em 1000 linhas. Todo select de
// lista aqui usa .range() com este tamanho de página.
export const AUTOPILOT_PAGE_SIZE = 500
export const AUTOPILOT_MAX_PAGES = 20

// ═══════════════════════════════════════════════════════════════════════════
// ENTITLEMENT — só plano pago dirige o Autopilot.
// ═══════════════════════════════════════════════════════════════════════════
// KINEO-AUTOPILOT-299-2026-07-26 — GATE EXCLUSIVO DO TIER DE $299.
//
// A primeira versão desta lista copiava PAID_PLANS de /api/youtube/upload
// (starter, basic, pro, creator, studio...). Isso ANULAVA o produto: o
// Autopilot sairia de graça junto com o plano de $19, e o tier de $299 —
// a única coisa nesta empresa com margem de 96% e a razão inteira de o
// Autopilot existir — nasceria canibalizado no dia do lançamento.
//
// Autopilot é DONE-FOR-YOU: a gente roda o canal do cliente. Isso não é uma
// feature de um plano de créditos, é um serviço. Só o tier que paga por ele
// tem direito a ele.
//
// Todo mundo continua ENXERGANDO a página /autopilot — ela é o argumento de
// venda. Quem não tem direito vê a oferta, não um formulário quebrado.
export const AUTOPILOT_PAID_PLANS = new Set([
  'autopilot', 'autopilot_trial',
])

export function isAutopilotEntitled(profile: {
  has_paid?: boolean | null
  plan?: string | null
  is_pro?: boolean | null
} | null): boolean {
  if (!profile) return false
  // ⚠️ De propósito NÃO olhamos has_paid nem is_pro. Ambos são true para
  // qualquer pagante de qualquer valor, inclusive quem comprou um pack de
  // $2.90 uma vez. Só o plano corrente decide.
  const plan = (profile.plan ?? '').toString().toLowerCase().trim()
  return AUTOPILOT_PAID_PLANS.has(plan)
}

// ═══════════════════════════════════════════════════════════════════════════
// CADÊNCIA — tudo derivado do horário AGENDADO, nunca de now().
// ═══════════════════════════════════════════════════════════════════════════
// Isso é o que torna a trava anti-duplo-post confiável: duas invocações
// concorrentes do cron leem o mesmo next_run_at e calculam o MESMO
// (scheduled_for_date, slot), então a segunda colide na unique e vira no-op.

export function normalizePostsPerDay(raw: unknown): number {
  const n = Number(raw)
  if (!Number.isFinite(n)) return 1
  return Math.max(1, Math.min(3, Math.round(n)))
}

export function normalizePostHour(raw: unknown): number {
  const n = Number(raw)
  if (!Number.isFinite(n)) return 14
  return Math.max(0, Math.min(23, Math.round(n)))
}

/** YYYY-MM-DD em UTC — o dia que esta run representa. */
export function scheduledDateUtc(scheduledAt: Date): string {
  return scheduledAt.toISOString().slice(0, 10)
}

/**
 * Slot do dia (0..postsPerDay-1), derivado da HORA agendada.
 * 1x/dia → sempre 0. 2x/dia → 0 antes das 12h UTC, 1 depois. 3x/dia → 0/1/2.
 */
export function scheduledSlot(scheduledAt: Date, postsPerDay: number): number {
  const per = normalizePostsPerDay(postsPerDay)
  if (per <= 1) return 0
  const windowHours = 24 / per
  const slot = Math.floor(scheduledAt.getUTCHours() / windowHours)
  return Math.max(0, Math.min(per - 1, slot))
}

/**
 * Próximo horário de publicação DEPOIS de `from`.
 * Sempre avança — inclusive quando a run falhou. Uma agenda travada tentando
 * para sempre é pior que um dia pulado: ela queima crédito e API quota em
 * loop e nunca se recupera sozinha.
 */
export function computeNextRunAt(args: {
  from: Date
  postHourUtc: number
  postsPerDay: number
}): Date {
  const hour = normalizePostHour(args.postHourUtc)
  const per = normalizePostsPerDay(args.postsPerDay)
  const windowHours = 24 / per

  // Horários-alvo do dia: hora base + k janelas.
  const from = args.from.getTime()
  const candidates: number[] = []
  // -1..+1 dia cobre o wrap: com hora base 22h e 3 posts/dia, o terceiro
  // horário cai às 14h do dia SEGUINTE. Gerar como offset absoluto a partir
  // da meia-noite do dia e deixar o Date rolar evita o bug do "% 24", que
  // produzia candidatos fora de ordem (14h, 22h, 06h-do-mesmo-dia).
  for (let dayOffset = -1; dayOffset <= 1; dayOffset++) {
    const base = Date.UTC(
      args.from.getUTCFullYear(),
      args.from.getUTCMonth(),
      args.from.getUTCDate() + dayOffset,
      hour, 0, 0, 0,
    )
    for (let k = 0; k < per; k++) {
      candidates.push(base + Math.round(k * windowHours * 3600_000))
    }
  }
  candidates.sort((a, b) => a - b)
  const next = candidates.find((t) => t > from)
  // Fallback impossível na prática: +24h.
  return new Date(next ?? from + 24 * 60 * 60 * 1000)
}
