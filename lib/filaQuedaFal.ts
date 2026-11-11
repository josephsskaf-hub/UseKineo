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
// KINEO-RESFRIAMENTO-SALDO-1111 — era "paused for a few minutes": na queda de 08/11 foram 5h27. A frase não promete prazo de volta.
export const PARKED_MESSAGE =
  "Our video engine is paused right now. Your film is saved and will start automatically — you'll get an email when it's ready. Nothing was charged: your credits are back in your account and are only used when it starts. If it can't start within 24 hours, we'll email you and nothing is charged."
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

// ═══ KINEO-SERIE-AUTO-ETAPA1-0111 — um débito, um filme: quem o resume-parked-renders retoma, e quem conta como "pedido novo" ═══
// Revisão de 01/11 (ALTO): a retomada de um estacionado chama a rota em modo serviço com o pedido guardado; se a fal continua fora,
// a ROTA ESTACIONA DE NOVO aquele pedido — uma linha render_parked FILHA com session_id = o id 'parked-…' da tentativa. O cron lia as
// filhas como estacionados novos (24 h de vida própria cada) e, quando a fal voltava, retomava o original E cada filha: ~25 débitos e
// 25 filmes para uma queda de 2 h com o cron a cada 5 min. Regra: só o ORIGINAL é retomado; a filha é eco da tentativa N do original,
// que já segue na fila dele (aluguel N+1 na próxima passada).
/** Prefixo do generationId da retomada (idDaRetomada em lib/filaQuedaFalIds). */
export const PARKED_RESUME_PREFIX = 'parked-'
/** Prefixo do generationId da série automática semanal (lib/serieAuto serieGenerationId). */
export const SERIE_AUTO_GENERATION_PREFIX = 'serie-'
/** Este generationId é de uma retomada do resume-parked-renders? */
export function ehRetomadaDeEstacionado(genId: unknown): boolean {
  return typeof genId === 'string' && genId.startsWith(PARKED_RESUME_PREFIX)
}
/** Este generationId é de um episódio da série automática (despacho da agenda, não clique da pessoa)? */
export function ehDespachoDaSerie(genId: unknown): boolean {
  return typeof genId === 'string' && genId.startsWith(SERIE_AUTO_GENERATION_PREFIX)
}
/** Esta linha render_parked é retomável? Só o pedido ORIGINAL; a filha (re-estacionamento de uma retomada) nunca. */
export function estacionadoRetomavel(sessionId: unknown): boolean {
  return typeof sessionId === 'string' && sessionId.length > 0 && !ehRetomadaDeEstacionado(sessionId)
}
/**
 * Este estacionado pode ser fechado como 'superseded' ("a pessoa já fez outro filme")? O episódio da série NÃO: ele nasce da agenda,
 * não de um clique — um despacho do fundador ou de outra série da mesma conta o fechava e queimava as tentativas da semana.
 */
export function estacionadoSuperavel(sessionId: unknown): boolean {
  return !ehDespachoDaSerie(sessionId)
}
// ═══ KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111 — nenhuma tentativa N+1 sem LER a cobrança da tentativa N ═══
// Revisão de 01/11 (ALTO, já em produção): a retomada classificada 'retry_later' (abort do cron em 240 s com a rota viva até 300 s;
// 503 pending:true "Your AI scenes may already be processing"; 503 "automatic refund is still being confirmed") gravava o desfecho e,
// 5 min depois, a tentativa N+1 saía com outro generationId — outro claim, outro débito, dois filmes.
// Revisão 5 de 01/11 (ALTO): "débito vivo = adota" perdia o filme (claim 'pending'/'done' com débito vivo não é filme a caminho).
// Revisão 6 de 01/11 (ALTO) — a RECONEXÃO pelo mesmo id (revisão 5) SAIU: para pedido de ideia solta o roteiro é reescrito pelo GPT a
// temperature 0.7 a cada POST, a impressão digital do claim muda e a rota responde 409 "generation id belongs to a different cinematic
// request" antes de qualquer ramo útil — re-POST que só gastava o escritor e o teto da passada. Regra única, sem re-POST:
//   · 'settled' com débito não estornado = o filme está a caminho → adota (fecha 'resumed'; o finish-stranded-renders monta, a varredura
//     estorna se nunca entregar). Não é "esperar": o débito de um filme ENTREGUE fica vivo para sempre.
//   · qualquer outro claim (pending/done/released/nenhum) com débito VIVO → ESPERA. Nunca abre a N+1, nunca re-POSTa. O que já existe
//     resolve SÓ uma parte: a varredura (lib/credits/refund.ts:344-366) estorna o 'pending' sem fal_request_ids cujo débito nasceu a ±60 s
//     do claim (quase todo 'pending' da retomada: o débito sai segundos depois do claim). NINGUÉM resolve o 'done' com débito vivo, nem o
//     'pending' fora dos ±60 s, nem débito sem claim legível (refund.ts:379-381 e finish-stranded-renders :617-620 só olham 'settled'):
//     esses chegam ao teto e viram aviso ao fundador, que estorna à mão. Quando o débito ficar estornado, o cron segue.
//   · débito estornado ou ausente, depois do assentamento → nada cobrado: segue (N+1, ou fecha 'expired'/'failed' com o e-mail honesto).
//   · leitura que falha → espera.
// O e-mail "Nothing was charged" (vencido / 4xx terminal) só sai com TODA tentativa lida 'sem_cobranca'. Passado PARKED_HARD_STOP_MS ainda
// esperando, fecha 'expired_unverified' SEM e-mail ao cliente, grava FOUNDER_PARKED_ALERT_EVENT e AVISA o fundador por notifyFounder
// (e-mail KINEO_ALERT_EMAIL + webhook do celular, se houver) — antes o evento não tinha leitor e o cliente ficava cobrado sem filme calado.
// Revisão 7 (01/11): o verbatim também ficou sem reconexão (decisão de simplificar); o 'done' do verbatim cai no mesmo aviso.
/** A rota de filme roda até 300 s (maxDuration) a partir do POST do cron: antes disto, "sem débito" ainda não prova nada. */
export const PARKED_ROUTE_MAX_MS = 300 * 1000
/** Do aluguel até concluir qualquer coisa que não seja "o filme está a caminho": o teto da rota + folga (= o aluguel de 10 min). */
export const PARKED_DEBIT_SETTLE_MS = PARKED_LEASE_TTL_MS
/**
 * Até aqui (desde o estacionamento) o cron ainda espera uma tentativa com cobrança viva/ilegível. O último aluguel nasce antes das 24 h e a
 * varredura de estorno (refund-sweep, corte de 100 min) e o finish-stranded-renders (claims 'settled' de 12 min a 20 h) já passaram por ele
 * várias vezes até aqui. 29 h fica abaixo da janela de leitura do cron (30 h) e do SERIE_AUTO_PARKED_LOST_MS (30 h).
 */
export const PARKED_HARD_STOP_MS = PARKED_TTL_MS + 5 * 60 * 60 * 1000
/** Alerta do fundador: estacionado fechado 'expired_unverified' (cobrança viva ou ilegível no teto). Rastro no banco; o aviso sai por notifyFounder. */
export const FOUNDER_PARKED_ALERT_EVENT = 'founder_alert_parked_unverified'
/** Desfechos de aluguel que PROVAM que nada ficou cobrado: 503 queued/parked (a rota só estaciona com o estorno confirmado) e o já lido. */
const DESFECHOS_SEM_COBRANCA: ReadonlySet<string> = new Set(['provider_down', 'lost_no_charge'])
/**
 * Este aluguel precisa ter a cobrança lida antes da tentativa seguinte? Sem desfecho (o cron morreu no POST), 'started' (2xx cujo
 * fechamento falhou), 'retry_later' (abort/503 pending/5xx — a rota pode ter cobrado) e qualquer outro: sim. Só não os que provam estorno.
 */
export function aluguelPodeTerCobrado(outcome: unknown): boolean {
  return !(typeof outcome === 'string' && DESFECHOS_SEM_COBRANCA.has(outcome))
}
export type ClaimDaRetomada = 'pending' | 'done' | 'settled' | 'released'
/** O que o banco diz da tentativa N: o débito (credit_debits, render_id cinematic-<claim>) e o claim de nascimento do mesmo id. */
export type LeituraDaCobranca = { erro: boolean; debito: 'nenhum' | 'vivo' | 'estornado'; claim: ClaimDaRetomada | null }
/** As duas leituras cruas → uma leitura. Qualquer erro = erro (nada se decide às cegas). Status de claim fora da lista = sem claim. */
export function leituraDaCobranca(input: {
  debito: { erro: boolean; existe: boolean; estornado: boolean }
  claim: { erro: boolean; status: string | null }
}): LeituraDaCobranca {
  const s = input.claim.status
  const claim: ClaimDaRetomada | null = s === 'pending' || s === 'done' || s === 'settled' || s === 'released' ? s : null
  return {
    erro: input.debito.erro || input.claim.erro,
    debito: !input.debito.existe ? 'nenhum' : input.debito.estornado ? 'estornado' : 'vivo',
    claim,
  }
}
export type SituacaoDaTentativa = 'filme' | 'sem_cobranca' | 'ilegivel' | 'assentando' | 'cobranca_viva'
/**
 * A situação de UMA tentativa N (ver o cabeçalho deste bloco). `rotaRespondeu` = a resposta da rota para este id acabou de chegar (a
 * rota terminou: o assentamento não se aplica).
 */
export function situacaoDaTentativa(input: {
  leitura: LeituraDaCobranca
  iniciado: boolean
  atMs?: number
  nowMs: number
  rotaRespondeu?: boolean
}): SituacaoDaTentativa {
  const { leitura: l } = input
  if (l.erro) return 'ilegivel'
  // o despacho está liquidado e cobrado: o finish-stranded-renders monta (ou a varredura estorna se nunca entregar)
  if (l.claim === 'settled' && l.debito !== 'estornado') return 'filme'
  // 2xx sem rastro nenhum (nem claim, nem débito): não dá para provar o contrário — adota, como sempre
  if (input.iniciado && l.claim === null && l.debito === 'nenhum') return 'filme'
  const assentado = input.rotaRespondeu === true || (Number.isFinite(input.atMs) && input.nowMs - Number(input.atMs) >= PARKED_DEBIT_SETTLE_MS)
  if (!assentado) return 'assentando'
  // débito vivo sem 'settled' (claim pending/done/released/nenhum): só espera — as varreduras entregam ou estornam
  return l.debito === 'vivo' ? 'cobranca_viva' : 'sem_cobranca'
}
export type DecisaoDoAluguel =
  | { acao: 'adotar'; attempt: number }
  | { acao: 'esperar'; motivo: 'debito_ilegivel' | 'debito_pode_chegar' | 'cobranca_viva' }
  | { acao: 'retomar' }
/**
 * Aluguéis que podem já ter cobrado, sem fechamento 'resumed' gravado. Filme a caminho → adota (o mais novo). Senão: ilegível, assentando
 * ou cobrança viva → espera; tudo 'sem_cobranca' → pode abrir a tentativa N+1 (ou fechar 'expired'/'failed' com o e-mail honesto).
 */
export function decidirAluguelSemFechamento(candidatos: ReadonlyArray<{ attempt: number; situacao: SituacaoDaTentativa }>): DecisaoDoAluguel {
  if (candidatos.some((c) => c.situacao === 'filme')) return { acao: 'adotar', attempt: Math.max(...candidatos.filter((c) => c.situacao === 'filme').map((c) => c.attempt)) }
  if (candidatos.some((c) => c.situacao === 'ilegivel')) return { acao: 'esperar', motivo: 'debito_ilegivel' }
  if (candidatos.some((c) => c.situacao === 'assentando')) return { acao: 'esperar', motivo: 'debito_pode_chegar' }
  if (candidatos.some((c) => c.situacao === 'cobranca_viva')) return { acao: 'esperar', motivo: 'cobranca_viva' }
  return { acao: 'retomar' }
}
/**
 * Um 4xx ('failed') só é TERMINAL (fecha 'failed' + e-mail "nothing was charged") com a tentativa lida 'sem_cobranca'. Qualquer outra
 * situação = 'retry_later': a próxima passada lê de novo (filme → adota; cobrança viva → espera). Os outros desfechos passam iguais.
 */
export function desfechoComCobranca(outcome: ResumeResult, situacao: SituacaoDaTentativa | null): ResumeResult {
  if (outcome !== 'failed') return outcome
  return situacao === 'sem_cobranca' ? 'failed' : 'retry_later'
}
/** O e-mail "Nothing was charged" só pode sair quando TODA retomada tentada foi lida 'sem_cobranca' (nenhum débito vivo, nada a caminho). */
export function podeDizerNadaCobrado(leituras: ReadonlyArray<{ situacao: SituacaoDaTentativa }>): boolean {
  return leituras.every((l) => l.situacao === 'sem_cobranca')
}
/** O aviso ao fundador quando um estacionado fecha 'expired_unverified'. Puro: o cron só manda. Diz o que fazer à mão, dos dois lados. */
export function textoDoAlertaEstacionadoSemConfirmacao(input: { generationId: string; userId: string; hours: number; situacoes: string[]; resumeIds: string[] }): { subject: string; text: string } {
  return {
    subject: '⚠ filme estacionado sem cobrança confirmada — conferir à mão',
    text: [
      `Um filme estacionado (fal fora) ficou ${input.hours} h sem a cobrança confirmada e foi fechado 'expired_unverified'.`,
      `Pode haver cliente cobrado sem filme: claim 'done'/'pending' com débito vivo que nenhuma varredura estorna.`,
      ``,
      `Pedido: ${input.generationId}`,
      `Conta: ${input.userId}`,
      `Tentativas: ${input.situacoes.join(' ') || '-'}`,
      `Ids da retomada (débito = credit_debits.render_id cinematic-<claim> destes ids): ${input.resumeIds.join(' ') || '-'}`,
      ``,
      `O que fazer: 1) se o filme não saiu, devolver o crédito pelo /admin/people ("+ créditos", motivo "estacionado sem filme");`,
      `2) o cliente NÃO recebeu e-mail nenhum e a tela prometeu e-mail em 24 h: responder à mão.`,
    ].join('\n'),
  }
}
/** Passou do limite de espera? Então fecha 'expired_unverified' sem e-mail ao cliente + alerta ao fundador — nunca estacionado para sempre. */
export function passouDoLimiteDeEspera(parkedAtMs: number, nowMs: number): boolean {
  return Number.isFinite(parkedAtMs) && nowMs - parkedAtMs >= PARKED_HARD_STOP_MS
}
/** Páginas de aluguéis lidas por passada (1000 por página). Passou disto = leitura incompleta = a passada não decide nada. */
export const PARKED_LEASE_MAX_PAGES = 20
export const PARKED_LEASE_PAGE = 1000
