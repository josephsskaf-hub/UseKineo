// KINEO-SUPPLIER-ALARM-2026-08-11 — o olho que faltava.
//
// POR QUE ESTE ARQUIVO EXISTE (dois incidentes, 11 dias, zero avisos):
//
//   31/07 11:07Z — crédito da OpenAI zerou. 163 gerações, 116 falhas, 16% de
//   sucesso no dia de maior tráfego pago da história (65 cadastros do TAAFT).
//   09/08 17:00Z → 11/08 02:00Z — ~33 horas com o Creatomate recusando TODO
//   job ("Render service rejected the job"): a cota de 10.000 do plano acabou.
//   76 gerações num único dia, ZERO vídeos. 23 dos 92 trials queimaram prazo.
//
//   Nos dois casos o código estava certo e o alarme existente era cego:
//   `lib/openaiAlert.ts`, `lib/falAlert.ts` e `lib/creatomateAlert.ts` só
//   tocam quando um `catch` ESPECÍFICO de UM fornecedor roda dentro de uma
//   lambda. Se o modo de falha for outro — timeout de gateway, 402 tratado
//   noutro caminho, fornecedor novo, bug nosso — ninguém é avisado. O segundo
//   apagão foi descoberto porque o fundador perguntou.
//
// A INVERSÃO QUE ESTE MÓDULO FAZ: parar de perguntar "o fornecedor X está de
// pé?" e passar a perguntar "o produto está entregando vídeo?". Saldo de
// fornecedor nem sempre é legível por API — o sintoma SEMPRE é. Taxa de falha
// é um sinal que não depende de conhecer a causa, e por isso cobre a próxima
// causa, a que ainda não aconteceu.
//
// ⚠️ SOMENTE LEITURA. Este módulo nunca escreve, nunca envia e-mail e nunca
// lança: devolve `null` quando não conseguiu medir, e quem chama simplesmente
// não alerta. Um medidor com bug não pode virar um incidente — já perdemos
// 33 horas por falta de instrumento, não vamos perder mais por causa dele.

import type { SupabaseClient } from '@supabase/supabase-js'

type HealthDb = Pick<SupabaseClient, 'from'>

// Os nomes reais escritos pelo pipeline (conferidos em `events`, leitura de
// 11/08: 829 `video_generation_started`, 354 `..._completed`, 277 `..._failed`,
// 1.072 `generation_stage_error` em 20 dias). Constantes exportadas de
// propósito: o painel e a doc citam os mesmos nomes, não uma cópia.
export const ATTEMPT_EVENT = 'video_generation_started'
export const COMPLETED_EVENT = 'video_generation_completed'
export const FAILED_EVENT = 'video_generation_failed'
export const STAGE_ERROR_EVENT = 'generation_stage_error'

const WATCHED_EVENTS = [ATTEMPT_EVENT, COMPLETED_EVENT, FAILED_EVENT, STAGE_ERROR_EVENT]

/** Janela primária: a hora que acabou. É ela que dá detecção em ~1h. */
export const FAST_WINDOW_MINUTES = 60
/**
 * Janela lenta: 6h. EXISTE POR CAUSA DA NOITE, e isso não é teoria.
 *
 * No apagão do Creatomate, das 20:00Z de 09/08 às 02:00Z de 10/08 o produto
 * registrou 2, 0, 3, 2, 1 e 2 tentativas por hora — NENHUMA hora chega ao
 * mínimo de 5 da janela primária. Um alarme só de 1 hora fica MUDO a noite
 * inteira, exatamente quando ninguém está olhando. Somadas, essas 6 horas dão
 * 10 tentativas e 0 entregas: a janela lenta acende.
 */
export const SLOW_WINDOW_MINUTES = 360

/** (a) e (b) exigem volume mínimo — abaixo disso, ruído vira alarme. */
export const FAST_MIN_ATTEMPTS = 5
export const SLOW_MIN_ATTEMPTS = 8
/**
 * Duas pessoas, no mínimo. UMA pessoa tentando 6 vezes seguidas é um problema
 * DELA (prompt ruim, cota pessoal, conexão) e não justifica acordar ninguém.
 * Nos dois incidentes reais isto passa com folga: 31/07 11:00Z teve 3 pessoas
 * distintas, o apagão do Creatomate atingiu 26.
 */
export const MIN_DISTINCT_USERS = 2
/** (a) metade das tentativas falhando já é produto quebrado. */
export const FAILURE_RATE_PCT = 50
/** (c) o mesmo motivo repetindo — sinal de causa única, não de azar. */
export const REASON_REPEAT_MIN = 10

// ⚠️ 1000 NÃO É UM NÚMERO ESCOLHIDO — é `db.max_rows` deste projeto, documentado
// em app/api/admin/_shared/db.ts. Pedir mais que isso não traz mais: o PostgREST
// corta em 1000 de qualquer jeito. A primeira versão deste arquivo pedia 5.000,
// e o efeito era pior que inútil: a checagem `rows.length >= ROW_LIMIT` NUNCA
// seria verdadeira, ou seja, o aviso de truncamento era código morto e a janela
// de 6h subcontaria em silêncio — num pico, que é quando ela precisa contar.
// (31/07 15:00Z sozinha gerou 128 linhas observadas; 6h de pico chegam perto
// de 800.) Com o valor certo, o aviso volta a funcionar.
const ROW_LIMIT = 1_000

/**
 * Carência antes de cobrar entrega de uma tentativa.
 *
 * DEFEITO QUE ISTO FECHA (revisão adversarial): a regra (b) é "zero entregas com
 * ≥5 tentativas". Sem carência, uma RAJADA SAUDÁVEL de 5 pessoas apertando
 * gerar nos últimos 3 minutos da janela conta como 5 tentativas e 0 entregas —
 * porque o vídeo ainda está renderizando. Alarme falso, em cima de tráfego bom.
 *
 * Só tentativas com mais de 10 minutos contam para o mínimo de volume. Isso é
 * folgado em relação ao render Fast (~2 min) e não atrapalha nenhum dos dois
 * incidentes reais, onde as tentativas estavam espalhadas por horas.
 */
const MATURITY_GRACE_MS = 10 * 60_000

/**
 * Motivos que são RECUSA NOSSA, de propósito — não sintoma de fornecedor.
 *
 * Sem esta lista a regra (c) seria um gerador de falso positivo por desenho:
 * `analyze_blocked_active_render_gate` sozinho tem 170 ocorrências em 40 dias e
 * já apareceu 8 vezes num único dia SAUDÁVEL (linha de base de 08/08, em
 * docs/CAPACIDADE-TAAFT-2026-08-08.md). Alarme que toca em dia bom é alarme que
 * o fundador aprende a ignorar — e aí o dia ruim passa batido.
 */
export const OUR_OWN_REFUSAL_REASONS = new Set([
  'analyze_blocked_active_render_gate',
  'generate_blocked_server_active_render',
  'compose_daily_free_limit',
  'compose_resume_daily_free_limit',
  'cinematic_gate_credits',
  'cinematic_gate_trial_ended',
  'generate_empty_prompt',
  'fast_unauthenticated',
  'analyze_unauthenticated',
])

// Rede de segurança para motivos que ainda não existem. Deliberadamente NÃO
// inclui 'limit' solto: `rate_limited` é sintoma de fornecedor e precisa passar.
const OUR_OWN_REFUSAL_RE = /(^|_)gate(_|$)|blocked|unauthenticated|free_limit|empty_prompt/

export function isOurOwnRefusal(reason: string): boolean {
  const r = reason.trim().toLowerCase()
  if (!r) return false
  return OUR_OWN_REFUSAL_REASONS.has(r) || OUR_OWN_REFUSAL_RE.test(r)
}

export type HealthRule = 'failure_rate' | 'zero_delivery' | 'repeated_reason'

export interface HealthWindow {
  key: 'fast' | 'slow'
  label: string
  minutes: number
  sinceIso: string
  attempts: number
  /** Tentativas com idade suficiente para já deverem ter virado vídeo. */
  matureAttempts: number
  completed: number
  failed: number
  stageErrors: number
  /** Pessoas distintas, contando visitantes anônimos (ver buildWindow). */
  distinctUsers: number
  /** null quando não houve tentativa — divisão por zero não vira 0% nem NaN. */
  failureRatePct: number | null
  topReason: string | null
  topReasonCount: number
  triggered: HealthRule[]
}

export interface GenerationHealth {
  measuredAtIso: string
  windows: HealthWindow[]
  unhealthy: boolean
  /** Qual janela acendeu. `null` quando saudável. */
  firedWindow: HealthWindow | null
  firedRules: HealthRule[]
  /**
   * PROVA POSITIVA de que o produto voltou: pelo menos um vídeo entregue na
   * última hora.
   *
   * ⚠️ EXISTE POR CAUSA DE UM DEFEITO GRAVE DA 1ª VERSÃO. O aviso de "voltou ao
   * normal" era disparado por `!unhealthy` — e `!unhealthy` inclui o caso de
   * NINGUÉM TER TENTADO. Durante o apagão de 09/08 houve pelo menos sete horas
   * com ZERO tentativas (21:00Z de 09/08, 06:00Z, 12:00Z, 17:00Z, 19:00Z,
   * 20:00Z e 23:00Z de 10/08). O alarme teria mandado "voltou ao normal" em
   * cada uma delas e reaberto o incidente na hora seguinte — ou seja, teria
   * produzido justamente a enxurrada de e-mails que a trava por incidente
   * existe para impedir, e ainda por cima mentindo.
   *
   * Ausência de falha NÃO é evidência de entrega. Só um vídeo pronto é.
   */
  hasFreshDelivery: boolean
  /** Frase de uma linha, pronta para assunto de e-mail. */
  headline: string
  truncated: boolean
}

interface EventRow {
  name: string
  created_at: string
  user_id: string | null
  metadata: { reason?: unknown } | null
}

function ruleLabel(rule: HealthRule): string {
  if (rule === 'failure_rate') return `taxa de falha >= ${FAILURE_RATE_PCT}%`
  if (rule === 'zero_delivery') return 'ZERO vídeos entregues'
  return `mesmo motivo repetido >= ${REASON_REPEAT_MIN}x`
}

function buildWindow(
  key: 'fast' | 'slow',
  minutes: number,
  minAttempts: number,
  rows: EventRow[],
  now: Date,
): HealthWindow {
  const since = new Date(now.getTime() - minutes * 60_000)
  const sinceMs = since.getTime()

  let completed = 0
  let failed = 0
  let stageErrors = 0
  let started = 0
  let startedMature = 0
  let anonAttempts = 0
  const matureCutoff = now.getTime() - MATURITY_GRACE_MS
  const users = new Set<string>()
  const reasons = new Map<string, number>()

  for (const row of rows) {
    const t = Date.parse(row.created_at)
    if (!Number.isFinite(t) || t < sinceMs) continue
    if (row.name === ATTEMPT_EVENT) {
      started++
      if (t <= matureCutoff) startedMature++
      if (row.user_id) users.add(row.user_id)
      else anonAttempts++
    } else if (row.name === COMPLETED_EVENT) {
      completed++
    } else if (row.name === FAILED_EVENT) {
      failed++
      if (row.user_id) users.add(row.user_id)
      else anonAttempts++
    } else if (row.name === STAGE_ERROR_EVENT) {
      stageErrors++
      const raw = row.metadata?.reason
      const reason = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
      if (reason && !isOurOwnRefusal(reason)) {
        reasons.set(reason, (reasons.get(reason) ?? 0) + 1)
      }
    }
  }

  // `started` pode faltar em caminhos que não instrumentam o começo (autopilot,
  // retomada de checkpoint). Usar o MAIOR entre o contador de início e o
  // desfecho observado impede dois erros opostos: subcontar tentativas (alarme
  // que não toca) e produzir taxa > 100% (alarme que parece bug).
  const attempts = Math.max(started, completed + failed)
  // Tudo que já teve desfecho é, por definição, maduro.
  const matureAttempts = Math.max(startedMature, completed + failed)

  // ⚠️ ANÔNIMO CONTA — DEFEITO PEGO NA REVISÃO ADVERSARIAL.
  //
  // 239 de 2.247 `video_generation_started` da base (10,6%) têm `user_id` NULO:
  // é a demo pública da landing, uma das superfícies que quebrou em 31/07. Com
  // a contagem original (só `Set` de user_id), uma janela 100% anônima daria
  // `distinctUsers = 0` e o alarme ficaria PERMANENTEMENTE mudo justo no
  // caminho que todo visitante do TAAFT usa antes de criar conta.
  //
  // Anônimo não dá para deduplicar, então a contribuição é LIMITADA a 2: o
  // suficiente para o mínimo de pessoas nunca cegar o alarme, e pouco o
  // bastante para não fabricar uma multidão a partir de um visitante só.
  const distinctUsers = users.size + Math.min(anonAttempts, 2)

  let topReason: string | null = null
  let topReasonCount = 0
  for (const [reason, n] of reasons) {
    if (n > topReasonCount) {
      topReason = reason
      topReasonCount = n
    }
  }

  // ⚠️ DIVISÃO POR ZERO: `attempts === 0` devolve null, não 0. Zero tentativas
  // é "ninguém tentou" — silêncio de tráfego, não falha. Um 0% aqui seria lido
  // como saúde perfeita, e um NaN atravessaria os `>=` abaixo como false.
  const failureRatePct = attempts > 0 ? Math.min((failed / attempts) * 100, 100) : null

  // O mínimo de volume roda sobre tentativas MADURAS: uma rajada de gente
  // apertando gerar agora não é evidência de nada ainda.
  const enoughVolume = matureAttempts >= minAttempts && distinctUsers >= MIN_DISTINCT_USERS
  const triggered: HealthRule[] = []
  if (enoughVolume && failureRatePct !== null && failureRatePct >= FAILURE_RATE_PCT) {
    triggered.push('failure_rate')
  }
  if (enoughVolume && completed === 0) {
    triggered.push('zero_delivery')
  }
  // (c) NÃO exige `enoughVolume`: dez ocorrências do mesmo motivo de fornecedor
  // já são a evidência de causa única que as outras duas regras procuram por
  // volume. Exige, sim, mais de uma pessoa — pelo mesmo motivo de sempre.
  if (topReasonCount >= REASON_REPEAT_MIN && distinctUsers >= MIN_DISTINCT_USERS) {
    triggered.push('repeated_reason')
  }

  return {
    key,
    label: key === 'fast' ? 'última hora' : 'últimas 6 horas',
    minutes,
    sinceIso: since.toISOString(),
    attempts,
    matureAttempts,
    completed,
    failed,
    stageErrors,
    distinctUsers,
    failureRatePct,
    topReason,
    topReasonCount,
    triggered,
  }
}

/**
 * Mede a saúde da geração nas duas janelas. Nunca lança; `null` = não mediu.
 */
export async function readGenerationHealth(
  db: HealthDb,
  now: Date = new Date(),
): Promise<GenerationHealth | null> {
  try {
    const since = new Date(now.getTime() - SLOW_WINDOW_MINUTES * 60_000)
    const { data, error } = await db
      .from('events')
      .select('name, created_at, user_id, metadata')
      .in('name', WATCHED_EVENTS)
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false })
      .limit(ROW_LIMIT)

    if (error || !Array.isArray(data)) {
      console.warn('[supplier-watch] leitura de saúde falhou:', error?.message ?? 'sem dados')
      return null
    }

    const rows = data as unknown as EventRow[]
    const truncated = rows.length >= ROW_LIMIT
    if (truncated) {
      // Truncar corta as linhas MAIS ANTIGAS (order desc), então a janela de 1h
      // continua íntegra e a de 6h vira um piso. Dito em log para ninguém ler o
      // número da janela lenta como completo.
      console.warn(`[supplier-watch] leitura truncada em ${ROW_LIMIT} linhas — janela de 6h subconta`)
    }

    const fast = buildWindow('fast', FAST_WINDOW_MINUTES, FAST_MIN_ATTEMPTS, rows, now)
    const slow = buildWindow('slow', SLOW_WINDOW_MINUTES, SLOW_MIN_ATTEMPTS, rows, now)

    // A janela rápida tem prioridade: quando as duas acendem, a mensagem deve
    // descrever o AGORA, não a média das últimas 6 horas.
    const fired = fast.triggered.length > 0 ? fast : slow.triggered.length > 0 ? slow : null

    let headline: string
    if (!fired) {
      headline = `geração saudável — ${fast.completed} vídeo(s) na última hora, ${slow.completed} em 6h`
    } else {
      const rate = fired.failureRatePct === null ? 'n/d' : `${fired.failureRatePct.toFixed(0)}%`
      headline =
        `${fired.attempts} tentativa(s) de ${fired.distinctUsers} pessoa(s) na ${fired.label}, ` +
        `${fired.completed} vídeo(s) entregue(s), ${rate} de falha`
    }

    return {
      measuredAtIso: now.toISOString(),
      windows: [fast, slow],
      unhealthy: fired !== null,
      firedWindow: fired,
      firedRules: fired ? fired.triggered : [],
      hasFreshDelivery: fast.completed > 0,
      headline,
      truncated,
    }
  } catch (e) {
    console.warn('[supplier-watch] readGenerationHealth lançou:', e instanceof Error ? e.message : String(e))
    return null
  }
}

/** Texto legível das regras que dispararam — usado no e-mail e no painel. */
export function describeRules(rules: HealthRule[]): string {
  return rules.map(ruleLabel).join(' + ')
}
