// ═══ KINEO-FILA-QUEDA-FAL-2810 — quando a fal recusa por SALDO ou CAPACIDADE, o filme é ESTACIONADO, não perdido ═══
//
// O CASO (28/10/2026, 06:40 → ~16:30 UTC, a fal sem saldo; igual em 08/10): 37 recusas, 12 contas novas perderam o
// PRIMEIRO filme. Cada uma leu "We're experiencing high demand right now. Nothing started and your credits were refunded
// automatically." e foi embora. O pedido (roteiro, motor, duração, língua, formato) morria com a resposta; quando o saldo
// voltou, não havia o que retomar. E o alarme de saldo (lib/falAlert, 1 e-mail por janela de 6 h) avisou às 06:40 com o
// e-mail "pending" (teto de 3 s) e só repetiu às 12:57.
//
// O QUE ESTE MÓDULO DECIDE (puro: sem rede, sem banco, sem relógio — testado por scripts/test-fila-queda-fal-2810.mjs):
//   1. ESTACIONAR: só quando NENHUMA cena pode ter gerado gasto no fornecedor (nenhuma aceita, nenhuma ambígua), houve
//      POST de verdade, TODA recusa explícita é saldo (balance_quota, 402/403 de saldo) ou capacidade (rate_limit, 429 —
//      a única recusa em que a fal garante que nada entrou na fila) e o claim de nascimento JÁ FOI liberado com estorno.
//      503/5xx são AMBÍGUOS (o job pode existir do outro lado): nunca estacionam — re-POSTar duplicaria cobrança.
//   2. O PEDIDO guardado é o que a pessoa mandou (lista fechada de campos, antes de qualquer mutação da rota), sem
//      generationId e sem dry_run: a retomada nasce com id próprio e o claim/débito de sempre.
//   3. RETOMAR mais velho primeiro; se a fal recusar de novo pelo mesmo motivo, a passada PARA (uma recusa já prova que
//      o fornecedor continua fora); teto por passada; aluguel por tentativa (id determinístico → duas rodadas
//      simultâneas colidem no 23505 e só uma segue).
//   4. EXPIRAR em 24 h com e-mail honesto. Pedido mais novo da MESMA conta depois do estacionamento = a pessoa já fez
//      outro filme → o estacionado é descartado em silêncio (nunca dois filmes pelo mesmo clique).
//
// DINHEIRO (lido antes de desenhar, em lib/cinematic/claim.ts, lib/credits/refund.ts e na rota):
//   · O crédito NÃO fica retido. O claim de nascimento vira 'released' só depois do estorno confirmado
//     (releaseBirthClaim); um claim 'pending' com débito vira "stale" para a própria rota (TTL) e a varredura
//     sweepAbandonedCinematicDebits estorna qualquer débito cinematic sem entrega em algumas horas. Segurar o crédito
//     por 24 h brigaria com os três. Então: estorno no estacionamento (o caminho de sempre, provado), e a retomada
//     debita de novo pelo caminho normal (claim novo, débito atômico, mesma régua de custo). A pessoa vê o crédito
//     voltar na hora e sair quando o filme começa — e a mensagem diz exatamente isso.
//   · A retomada reusa a rota /api/generate-video-cinematic em modo serviço (Bearer CRON_SECRET + x-kineo-service-user,
//     o mesmo contrato do finish-orphan-jobs → generate-video-fast). Entregue o despacho, o finish-stranded-renders
//     monta e manda o "Your film is ready" como já faz para quem fechou a aba.
export const PARKED_EVENT = 'render_parked'
export const PARKED_LEASE_EVENT = 'render_parked_taken'
export const PARKED_CLOSED_EVENT = 'render_parked_closed'
export const FOUNDER_FAL_ALERT_EVENT = 'founder_alert_fal_balance'
export const PARKED_VERSION = 'fila_queda_fal_v1'
/** Sem retomada até aqui = e-mail honesto e fim. */
export const PARKED_TTL_MS = 24 * 60 * 60 * 1000
/** Filmes retomados por passada do cron (cada um custa um despacho inteiro: planner + stills + POSTs). */
export const PARKED_MAX_RESUMES_PER_RUN = 2
/** Aluguel de uma tentativa: outra rodada só pega o mesmo filme depois disto. */
export const PARKED_LEASE_TTL_MS = 10 * 60 * 1000
/** Pedido guardado: mesmo teto do Studio (lib/analyzeLimits ANALYZE_PROMPT_MAX_CHARS_SOURCE). Literal de propósito: módulo puro. */
export const PARKED_PROMPT_MAX = 20000
/** Alarme do fundador: no máximo um e-mail por hora enquanto a fal recusar por saldo. */
export const FOUNDER_ALERT_GAP_MS = 60 * 60 * 1000
export const FOUNDER_ALERT_SUBJECT = '⛔ fal sem saldo — filmes de clientes parados'
export const FOUNDER_ALERT_RECHARGE = 'recarregue em fal.ai → Usage & billing → Credits'
/** Classes de recusa que estacionam. Nada de 5xx aqui: ambíguo nunca estaciona. */
export const PARKABLE_REASONS: ReadonlySet<string> = new Set(['balance_quota', 'rate_limit'])

/** A frase que a pessoa lê. Dinheiro dito com exatidão: estornado agora, cobrado só quando começar. */
export const PARKED_MESSAGE =
  "Our video engine is paused for a few minutes. Your film is saved and will start automatically — you'll get an email when it's ready. Nothing was charged: your credits are back in your account and are only used when it starts. If it can't start within 24 hours, we'll email you and nothing is charged."
/** Fragmentos desta frase que o cron de resgate reconhece como "não é defeito" (NAO_E_BUG). */
export const PARKED_MESSAGE_FRAGMENTS = ['Your film is saved', 'engine is paused'] as const

export type ParkReason = 'balance_quota' | 'capacity'
export type ParkOutcomeLike = { disposition: string; reason_class: string }

/**
 * Estacionar ou não. `released` = releaseBirthClaim devolveu true (estorno confirmado): sem isso NADA é prometido.
 * Devolve o motivo dominante: saldo vence capacidade quando os dois aparecem (o alarme do fundador é de saldo).
 */
export function decidirEstacionamento(input: {
  outcomes: ReadonlyArray<ParkOutcomeLike | undefined | null>
  totalPosts: number
  released: boolean
}): { park: boolean; reason: ParkReason | null; why: string } {
  if (!input.released) return { park: false, reason: null, why: 'refund_not_confirmed' }
  if (!(input.totalPosts > 0)) return { park: false, reason: null, why: 'no_provider_post' }
  const vistos = input.outcomes.filter((o): o is ParkOutcomeLike => !!o && typeof o.disposition === 'string')
  if (vistos.length === 0) return { park: false, reason: null, why: 'no_outcomes' }
  // Espelho de providerSpendPossible (lib/cinematic/sceneDisposition): aceita ou ambígua = pode haver job pago.
  if (vistos.some((o) => o.disposition === 'accepted' || o.disposition === 'ambiguous')) return { park: false, reason: null, why: 'provider_spend_possible' }
  const recusas = vistos.filter((o) => o.disposition === 'explicit_reject')
  if (recusas.length === 0) return { park: false, reason: null, why: 'no_explicit_reject' }
  if (!recusas.every((o) => PARKABLE_REASONS.has(o.reason_class))) return { park: false, reason: null, why: 'other_reason_class' }
  const saldo = recusas.some((o) => o.reason_class === 'balance_quota')
  return { park: true, reason: saldo ? 'balance_quota' : 'capacity', why: saldo ? 'all_balance_quota' : 'all_rate_limit' }
}

export type PedidoEstacionado = {
  prompt: string
  duration: number
  engine?: string
  language?: string
  aspect?: string
  script_mode?: string
  vertical?: string
  characterId?: string
  kids_cartoon?: string
  allow_shorter_duration?: boolean
  formatFlags?: unknown
  format_flags?: unknown
  estrela?: unknown
  brollScenes?: unknown
  globalStyle?: unknown
}
const PEDIDO_TEXTO = ['engine', 'language', 'aspect', 'script_mode', 'vertical', 'characterId', 'kids_cartoon'] as const
const PEDIDO_LIVRE = ['formatFlags', 'format_flags', 'estrela', 'brollScenes', 'globalStyle'] as const
/** Teto do JSON guardado em `events.metadata` (o pedido inteiro com cenas de b-roll cabe folgado). */
export const PARKED_REQUEST_MAX_JSON = 64 * 1024

/**
 * A cópia fiel e FECHADA do corpo que o navegador mandou (chamar logo depois do req.json(), antes de a rota mexer no
 * body). Fora da lista ou acima do teto = null = não estaciona (sem pedido reproduzível não há promessa).
 */
export function pedidoEstacionavel(body: unknown): PedidoEstacionado | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null
  const b = body as Record<string, unknown>
  const prompt = typeof b.prompt === 'string' ? b.prompt.trim() : ''
  if (!prompt || prompt.length > PARKED_PROMPT_MAX) return null
  const duration = Number(b.duration)
  if (!Number.isFinite(duration) || duration <= 0) return null
  const out: PedidoEstacionado = { prompt, duration }
  for (const k of PEDIDO_TEXTO) if (typeof b[k] === 'string' && (b[k] as string).length <= 200) out[k] = b[k] as string
  if (b.allow_shorter_duration === true) out.allow_shorter_duration = true
  for (const k of PEDIDO_LIVRE) if (b[k] !== undefined && b[k] !== null) out[k] = b[k]
  try {
    const json = JSON.stringify(out)
    if (json.length > PARKED_REQUEST_MAX_JSON) return null
    return JSON.parse(json) as PedidoEstacionado
  } catch { return null }
}

/** O corpo da retomada: o pedido guardado + o id novo (nunca o antigo: o claim antigo está 'released'). */
export function corpoDaRetomada(pedido: PedidoEstacionado, generationId: string): Record<string, unknown> {
  return { ...pedido, generationId }
}

export type ResumeDecision = 'closed' | 'expired' | 'superseded' | 'leased' | 'resume'
/** O que fazer com um filme estacionado nesta passada. Ordem: fechado > vencido > substituído > alugado > retomar. */
export function decidirRetomada(input: {
  parkedAtMs: number
  nowMs: number
  closed: boolean
  /** generation_dispatch_received da MESMA conta depois do estacionamento (a pessoa fez outro pedido). */
  newerDispatch: boolean
  /** created_at do aluguel mais novo sem desfecho (null = nenhum). */
  openLeaseAtMs: number | null
}): ResumeDecision {
  if (input.closed) return 'closed'
  if (input.nowMs - input.parkedAtMs >= PARKED_TTL_MS) return 'expired'
  if (input.newerDispatch) return 'superseded'
  if (input.openLeaseAtMs !== null && input.nowMs - input.openLeaseAtMs < PARKED_LEASE_TTL_MS) return 'leased'
  return 'resume'
}

export type ResumeResult = 'started' | 'provider_down' | 'retry_later' | 'failed'
/**
 * Lê a resposta da rota na retomada. `provider_down` = a fal recusou de novo (503 + queued/parked): a passada para.
 * `retry_later` = corrida/pendência/resfriamento/5xx nosso: fica estacionado para a próxima passada. Qualquer outro 4xx é
 * terminal: o pedido não serve mais (saldo da conta mudou, regra do produto) → fecha com e-mail honesto.
 */
export function classificarRespostaDaRetomada(status: number, json: unknown): ResumeResult {
  const j = (json && typeof json === 'object' ? json : {}) as Record<string, unknown>
  if (status >= 200 && status < 300) return 'started'
  if (status === 503 && (j.queued === true || j.parked === true)) return 'provider_down'
  if (j.pending === true || status === 429 || status === 0 || status >= 500) return 'retry_later'
  return 'failed'
}

/** uuid v4-shaped a partir de 32 hex (o hash vem de quem tem node:crypto; este módulo fica puro). */
export function uuidDeHex(hex: string): string {
  const h = String(hex ?? '').toLowerCase().replace(/[^0-9a-f]/g, '').padEnd(32, '0').slice(0, 32)
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`
}

// ═══ Alarme do fundador: a cada hora, com o placar, em português ═══
export function deveAlertarFundador(input: { lastAlertAtMs: number | null; nowMs: number }): boolean {
  return input.lastAlertAtMs === null || !Number.isFinite(input.lastAlertAtMs) || input.nowMs - input.lastAlertAtMs >= FOUNDER_ALERT_GAP_MS
}
/** Janela de 1 h do relógio: a reserva da MESMA hora cai sempre no mesmo id (duas lambdas → 23505 → uma só manda). */
export function janelaDoAlertaDoFundador(nowMs: number): number {
  return Math.floor(nowMs / FOUNDER_ALERT_GAP_MS)
}
export function horaBrt(nowMs: number): string {
  const d = new Date(nowMs - 3 * 60 * 60 * 1000)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)}/${d.getUTCFullYear()} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())} BRT`
}
export function textoDoAlertaDoFundador(input: { nowMs: number; refusals: number; parked: number; engine?: string | null }): { subject: string; text: string } {
  const text = [
    `A fal recusou por SALDO (403/402 balance_quota) e os filmes de clientes estão parados.`,
    ``,
    `Hora: ${horaBrt(input.nowMs)}`,
    `Recusas por saldo até agora (24 h): ${input.refusals}`,
    `Filmes estacionados aguardando (24 h): ${input.parked}`,
    input.engine ? `Último motor recusado: ${input.engine}` : null,
    ``,
    `O que fazer: ${FOUNDER_ALERT_RECHARGE}.`,
    `Assim que o saldo voltar, o cron resume-parked-renders retoma os filmes estacionados sozinho (mais velho primeiro) e o cliente recebe o e-mail de filme pronto. Sem recarga em 24 h, cada pessoa recebe um e-mail honesto e nada é cobrado.`,
    ``,
    `Este aviso repete no máximo uma vez por hora enquanto houver recusa.`,
  ].filter((l): l is string => l !== null).join('\n')
  return { subject: FOUNDER_ALERT_SUBJECT, text }
}

// ═══ Resgate honesto (send-failure-recovery): a fal fora não é "bug consertado" ═══
/** Janela em que uma recusa de fornecedor cala o e-mail "it is fixed now". */
export const RECOVERY_PROVIDER_WINDOW_MS = 2 * 60 * 60 * 1000
/** O despacho teve recusa de saldo/capacidade? Lê o histograma do cinematic_dispatch_result. */
export function recusaDeFornecedor(metadata: unknown): boolean {
  const m = (metadata && typeof metadata === 'object' ? metadata : {}) as { reason_histogram?: unknown; balance_exhausted?: unknown }
  if (m.balance_exhausted === true) return true
  const h = (m.reason_histogram && typeof m.reason_histogram === 'object' ? m.reason_histogram : {}) as Record<string, unknown>
  return [...PARKABLE_REASONS].some((k) => Number(h[k]) > 0)
}
/**
 * A pessoa sai da lista do e-mail de defeito quando a ÚLTIMA coisa que aconteceu com ela foi recusa de fornecedor:
 * o despacho recusado é gravado ~1 s antes do erro da aba, por isso a folga de 5 min (o estacionado cobre essa pessoa).
 */
export function ultimaFalhaFoiFornecedor(input: { lastFailureMs: number; lastProviderRefusalMs: number | null }): boolean {
  return input.lastProviderRefusalMs !== null && Number.isFinite(input.lastProviderRefusalMs) && input.lastProviderRefusalMs >= input.lastFailureMs - 5 * 60 * 1000
}
