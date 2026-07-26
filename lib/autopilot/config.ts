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
// KINEO-PILOT-99-2026-07-26 — 'autopilot_pilot' é o piloto pago de $99 / 7
// dias. Ele NÃO reusa 'autopilot_trial' de propósito (ver PLANOS COM PRAZO
// abaixo): 'autopilot_trial' é escrito pelo Path B do webhook quando o Stripe
// devolve payment_status='no_payment_required', e app/admin/page.tsx já
// precifica 'autopilot_trial' como $299 de MRR recorrente. Um comprador de
// piloto de $99 marcado como 'autopilot_trial' apareceria como +$299/mês no
// único painel que o fundador usa para decidir o que fazer a seguir.
export const AUTOPILOT_PILOT_PLAN = 'autopilot_pilot'

export const AUTOPILOT_PAID_PLANS = new Set([
  'autopilot', 'autopilot_trial', AUTOPILOT_PILOT_PLAN,
])

// ═══════════════════════════════════════════════════════════════════════════
// PLANOS COM PRAZO — o piloto TEM que morrer sozinho.
// ═══════════════════════════════════════════════════════════════════════════
// Um plano com prazo que não expira é um produto de $299/mês vendido UMA vez
// por $99 para sempre. Por isso:
//   1. o prazo mora em profiles.plan_expires_at (timestamptz), criado pela
//      migration migrations_pending/2026-07-26_autopilot_pilot_plan_expiry.sql;
//   2. a checagem é FAIL-CLOSED: se o campo vier `undefined` (select que não
//      pediu a coluna) ou NULL, o plano com prazo NÃO tem direito. Errar para
//      o lado de parar de gerar custa 7 vídeos; errar para o outro lado custa
//      o produto inteiro.
//   3. a checagem vive AQUI, não na UI, porque quem gasta dinheiro é o CRON
//      (app/api/cron/autopilot-generate) e ele chama isAutopilotEntitled().
export const AUTOPILOT_TIME_BOXED_PLANS = new Set([AUTOPILOT_PILOT_PLAN])

/** Quantos dias o piloto de $99 dura, e portanto quantos Shorts ele promete. */
export const AUTOPILOT_PILOT_DAYS = 7
export const AUTOPILOT_PILOT_POSTS_PER_DAY = 1

/**
 * Folga em cima dos 7 dias. NÃO é generosidade — é o que impede a promessa de
 * quebrar por aritmética.
 *
 * Não existe contador de runs em lugar nenhum (nem em autopilot_schedules, nem
 * em autopilot_runs, nem no cron): quem limita o piloto é SÓ a data. E o
 * primeiro slot cai na próxima ocorrência de post_hour DEPOIS da compra, ou
 * seja em (T, T+24h]. Os 7 slots então terminam em (T+6d, T+7d] — encostado
 * exatamente no prazo de 7×24h. Somando o cron ser horário e a run levar
 * minutos para render, o 7º Short cairia fora da janela e o cliente receberia
 * 6 do que pagou 7.
 *
 * Com 36h de folga o 7º slot está sempre dentro, e o pior caso vira entregar
 * um 8º Short (~$0.40 no engine mais caro que o Autopilot permite). Além
 * disso os 60 créditos concedidos já limitam a 7 renders em basic_ai (8 cr
 * cada), então a sobre-entrega é barata e limitada dos dois lados.
 */
export const AUTOPILOT_PILOT_GRACE_HOURS = 36

/** Instante em que um piloto comprado em `from` deixa de ter direito. */
export function autopilotPilotExpiresAt(from: Date = new Date()): Date {
  const days = AUTOPILOT_PILOT_DAYS * 24 * 60 * 60 * 1000
  const grace = AUTOPILOT_PILOT_GRACE_HOURS * 60 * 60 * 1000
  return new Date(from.getTime() + days + grace)
}

/**
 * Colunas mínimas que QUALQUER caminho que chama isAutopilotEntitled() precisa
 * ler de profiles. Exportado como string única para que um `select` não possa
 * esquecer plan_expires_at e derrubar silenciosamente todo piloto pago.
 */
export const AUTOPILOT_ENTITLEMENT_COLUMNS = 'has_paid, plan, is_pro, video_credits, plan_expires_at'

export function isAutopilotEntitled(profile: {
  has_paid?: boolean | null
  plan?: string | null
  is_pro?: boolean | null
  /** KINEO-PILOT-99-2026-07-26 — profiles.plan_expires_at. */
  plan_expires_at?: string | Date | null
} | null): boolean {
  if (!profile) return false
  // ⚠️ De propósito NÃO olhamos has_paid nem is_pro. Ambos são true para
  // qualquer pagante de qualquer valor, inclusive quem comprou um pack de
  // $2.90 uma vez. Só o plano corrente decide.
  const plan = (profile.plan ?? '').toString().toLowerCase().trim()
  if (!AUTOPILOT_PAID_PLANS.has(plan)) return false
  if (!AUTOPILOT_TIME_BOXED_PLANS.has(plan)) return true

  // A partir daqui: plano com prazo. Sem uma data futura e legível, não passa.
  const raw = profile.plan_expires_at
  if (raw === undefined || raw === null) return false
  const expiresAt = raw instanceof Date ? raw : new Date(String(raw))
  if (Number.isNaN(expiresAt.getTime())) return false
  return expiresAt.getTime() > Date.now()
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

// KINEO-PILOT-99-2026-07-26 — o piloto vende "7 Shorts em 7 dias", uma frase
// com um número dentro. Não existe contador de runs em lugar nenhum deste
// código (nem em autopilot_schedules, nem em autopilot_runs, nem no cron):
// quem limita o piloto é EXCLUSIVAMENTE plan_expires_at. Isso dá 7 runs
// exatas em posts_per_day = 1 — e 21 em posts_per_day = 3, que o usuário pode
// escolher no formulário. Daí este clamp: em plano com prazo, a cadência é 1.
// Custo de 21 renders é irrelevante (~$1); quebrar a promessa impressa na
// oferta não é.
export function clampPostsPerDayForPlan(raw: unknown, plan: string | null | undefined): number {
  const normalizedPlan = (plan ?? '').toString().toLowerCase().trim()
  if (AUTOPILOT_TIME_BOXED_PLANS.has(normalizedPlan)) return AUTOPILOT_PILOT_POSTS_PER_DAY
  return normalizePostsPerDay(raw)
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
