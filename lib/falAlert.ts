// KINEO-FAL-ALERT-LIB-2026-07-10 — shared fal-balance alarm.
// Extracted from generate-video-cinematic (KINEO-FAL-ALARM-2026-07-06) so the
// AVATAR-family engines (Presenter/VEED/OmniHuman/Animate/Gesture matte) also
// alert the founder when fal reports an exhausted balance. Incident 10/07:
// fal hit $0 and the Avatar Studio only showed a generic 502 — no e-mail, no
// signal, while every AI engine was down in prod.
//
// ═══ KINEO-FAL-SALDO-ALERTA-2026-09-28 — UM alarme, honesto, com rastro ═════
//
// O CASO (30 dias até 27/09, medido em `events`): 12 despachos cinematic e 36
// cenas recusadas por saldo da fal — 11/09 (Seedance, 16 cenas), 16/09
// (Seedance 9 + Veo 1 + Omni) e 21/09 (Seedance, 10 cenas, "403 User is
// locked. Reason: Exhausted balance"). 450 créditos estornados, todos da conta
// do fundador; o único despacho externo (11/09 05:11) cobrou 19 cr e entregou.
// E NADA DISSO ERA PROVÁVEL: o alarme antigo guardava o throttle numa variável
// da lambda (30 min por instância) e não escrevia uma linha — se o e-mail saiu
// ou não, o banco não sabe.
//
// OS QUATRO DEFEITOS QUE ESTE ARQUIVO FECHA:
//  1. DUAS CÓPIAS: a rota cinematic tinha a sua, com o e-mail do fundador
//     cravado em código. Agora o único alarme é este, e ele fala por
//     notifyFounder (lib/supplier/notify.ts): KINEO_ALERT_EMAIL + o webhook
//     (ntfy) em paralelo — a mesma via de todos os outros alarmes da casa.
//  2. QUALQUER 403 = SALDO: o looksExhausted daqui dizia "saldo" para todo 403
//     e para a palavra "locked" — "model is locked for your account" é ACESSO.
//     Agora a pergunta é a de lib/cinematic/sceneDisposition (isBalanceExhausted),
//     em ESPELHO byte-idêntico conferido pelo guardião (ver A FRONTEIRA abaixo).
//  3. A FRASE DA FAL NÃO CHEGAVA AO CLASSIFICADOR: o @fal-ai/client monta o
//     ApiError com `message: body.message || statusText` — num 403
//     {detail:"User is locked. Reason: Exhausted balance"} a mensagem é só
//     "Forbidden". Por isso o texto classificado inclui body.detail (e o
//     providerBody de lib/falQueue). Sem isso o Kineo 1 continuaria mudo.
//  4. NENHUM RASTRO: toda ocorrência vira linha `fal_balance_exhausted`. A
//     PRIMEIRA de cada janela fixa de 6 h reserva um id determinístico
//     (mesmo desenho de lib/founderAlert.ts) e só ela manda e-mail (salvo a
//     re-tentativa de um envio que não saiu, abaixo); as outras
//     batem no 23505 e viram linha de CONTAGEM (alerted:false), para o painel
//     /admin/supplier-health dizer quantas recusas houve. Quem chama a cada
//     poucos segundos (o poll de clipe) passa countRow:false e não escreve nada
//     depois da reserva.
//
// TRÊS REGRAS (as mesmas do founderAlert, pelo mesmo motivo — isto roda dentro
// de render pago e do primeiro filme do Kineo 1):
//  · NUNCA LANÇA. Toda saída é um FalAlertOutcome.
//  · TETO DE 3 s no envio. notifyFounder espera até 8 s por canal; o filme não
//    fica refém do Resend. Estourou = 'timeout' anotado na reserva.
//    KINEO-FAL-CANAL-A-CANAL-2026-09-28 — o teto vale POR CANAL: o primeiro canal que confirma dentro dos 3 s
//    resolve o envio como 'sent'. Antes a corrida era contra o Promise.all dos dois: Resend 200 em 50 ms + ntfy em
//    4 s = 'timeout', e o e-mail que já tinha chegado era re-enviado até 3 vezes na janela (medido pela revisão).
//  · O BANCO CAIU? O alerta sai mesmo assim (dois e-mails custam menos que um
//    apagão que ninguém viu), mas a lambda lembra da janela: entregue, não
//    repete; não saiu, segue a mesma regra de re-tentativa abaixo, contada nela.
//
// ═══ ENVIO QUE FALHOU NÃO CALA A JANELA (revisão de 28/09) ═══════════════════
// A 1ª versão tratava o 23505 como "já avisei" sem olhar COMO a reserva
// terminou. Um envio que falhou (Resend 429 no pico — notify.ts registra o teto
// de 100 e-mails/dia — ou o teto de 3 s estourado) ou uma lambda que morreu
// entre reservar e enviar deixavam o fundador SEM NADA até a virada da janela
// de 6 h, com a fal travada e todo render de IA caindo — pior que a cópia
// antiga da rota, que tentava de novo a cada 30 min. Agora o 23505 LÊ a vaga:
// 'sent' = a janela está avisada; qualquer outro estado com mais de
// FAL_ALERT_RETRY_GAP_MS (10 min) abre a vaga seguinte, também determinística
// (nome:janela:retry:N), até FAL_ALERT_MAX_ATTEMPTS (3) por janela. Duas
// lambdas disputando a mesma vaga: o 23505 decide quem envia.
//
// ═══ A FRONTEIRA SERVIDOR/CLIENTE (revisão de 28/09) ═════════════════════════
// Este arquivo É alcançado pelo grafo do NAVEGADOR:
//   app/(dashboard)/generate/GenerateClient.tsx ('use client')
//     → import('@/lib/hollywood/router')   (botão "Fix it for me")
//     → lib/avatar/veed (PRESENTER_MODEL) → lib/falAlert (este arquivo).
// O webpack segue import() dinâmico. A 1ª versão importava node:crypto (e
// sceneDisposition, que também importa node:crypto): o build de navegador do
// Next 14.2.5 quebrava com "UnhandledSchemeError: Reading from node:crypto",
// com o tsc VERDE — nada do push chegaria à produção (o mesmo 06/09 de
// lib/gptHandoff). Por isso, AQUI: nenhum import node:* e nenhum import de
// lib/cinematic/* — o id é FNV-1a (puro) e a classificação é espelho. O código
// nunca RODA no navegador (veed só submete do servidor; a service key não
// existe lá); ele só precisa COMPILAR lá. O guardião
// scripts/test-fal-saldo-alerta-2026-09-28.mjs varre o grafo de todo arquivo
// 'use client' (import estático e import()) e reprova qualquer node:* alcançável.
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { notifyFounder } from '@/lib/supplier/notify'

export const FAL_BALANCE_EVENT = 'fal_balance_exhausted' as const
/** Linha de reserva do alarme de DEFEITO de despacho (EMPTY_PLAN / ZERO_POSTS) — não é saldo. */
export const DISPATCH_DEFECT_EVENT = 'cinematic_dispatch_defect_alerted' as const
/** Janela fixa: no máximo um e-mail de saldo ENTREGUE a cada 6 h (o painel conta o resto). */
export const FAL_ALERT_WINDOW_MS = 6 * 60 * 60 * 1000
export const FAL_ALERT_TIMEOUT_MS = 3000
/** Tentativas de envio por janela: a reserva + 2 re-tentativas, só quando a anterior NÃO saiu. */
export const FAL_ALERT_MAX_ATTEMPTS = 3
/** Intervalo mínimo entre uma tentativa que não saiu (ou uma lambda que morreu no meio) e a seguinte. */
export const FAL_ALERT_RETRY_GAP_MS = 10 * 60 * 1000
export const FAL_BILLING_URL = 'https://fal.ai/dashboard/billing'
/** O assunto de sempre (o fundador já reconhece este e-mail). */
export const FAL_ALERT_SUBJECT = '🚨 Kineo: fal.ai balance EXHAUSTED — AI videos are failing'

export type FalAlertSource =
  | 'cinematic'
  // FIX-REVISAO-2 (KINEO-PLANO-B-OPENAI-2026-09-28): os dois consumidores do plano B da OpenAI também gastam a carteira da
  // fal — o roteador compatível (lib/llmFallback) e a voz reserva MiniMax (lib/ttsFallback).
  | 'llm_fallback'
  | 'tts_fallback'
  | 'kineo1_hook'
  | 'kineo1_clip'
  | 'poll'
  | 'retry_scene'
  | 'avatar_animate'
  | 'avatar_submit'
  | 'avatar_matte'
  // KINEO-ADS-V2-2026-09-28 — anúncio v2 (Studio Ads): planos Kling O3/Seedance 2.0/H3 e cenas Nano Banana na fal.
  | 'ads'
export type FalAlertOutcome = 'sent' | 'failed' | 'timeout' | 'duplicate' | 'error'
export type DispatchDefectKind = 'EMPTY_PLAN' | 'ZERO_POSTS'

type FalLikeError = {
  status?: number | null
  message?: string
  body?: unknown
  providerBody?: unknown
} | null | undefined

// ═══ MIRROR: lib/cinematic/sceneDisposition.ts — SALDO, ACESSO e a regra de isBalanceExhausted ═══
// Espelho, não import: sceneDisposition importa node:crypto (ver A FRONTEIRA) e mora na trava 8.2. As duas regex
// são cópia BYTE-IDÊNTICA das de lá; o guardião compara as linhas e executa as duas funções no mesmo corpus
// (status × frases). Mudou lá, o guardião fica vermelho até este bloco acompanhar.
const SALDO = /(exhaust|insufficient|balance|quota|billing|payment|top[- ]?up|out of credit|no credits|credits? remaining|prepay)/i
const ACESSO = /(model .{0,20}(locked|not available|no access|unauthorized)|locked for your account|not authorized|forbidden for this key|access denied|no access to)/i
/** = sceneDisposition.isBalanceExhausted: 402 é saldo; 403 só com evidência financeira e sem sinal de ACESSO; o resto não. */
export function isBalanceRefusal(status: number | null, message?: string): boolean {
  const msg = message ?? ''
  if (status === 402) return true
  if (status === 403) return !ACESSO.test(msg) && SALDO.test(msg)
  return false
}
// ═══ END MIRROR ═══

/**
 * O texto que a fal DISSE, não só o que o SDK pôs na mensagem: `detail` (formato da fal) primeiro; sem ele, o corpo
 * serializado, cortado. Só para o classificador — nunca vai para log nem para evento (corpo de fornecedor pode ecoar
 * prompt e URL assinada).
 */
export function falErrorText(e: FalLikeError): string {
  const message = typeof e?.message === 'string' ? e.message : ''
  const body = (e?.body ?? e?.providerBody) as { detail?: unknown } | string | null | undefined
  let detail = ''
  if (typeof body === 'string') detail = body
  else if (body && typeof body === 'object') {
    if (typeof body.detail === 'string') detail = body.detail
    else {
      try { detail = JSON.stringify(body) } catch { detail = '' }
    }
  }
  return `${message} ${detail.slice(0, 300)}`.trim()
}

/** Saldo de verdade? A CLASSE decide (espelho de sceneDisposition), não o status: um 403 de acesso não é saldo. */
export function looksExhausted(e: FalLikeError): boolean {
  const status = typeof e?.status === 'number' ? e.status : null
  return isBalanceRefusal(status, falErrorText(e))
}

/** Número da janela de 6 h que contém `nowMs`. */
export function falAlertWindow(nowMs: number): number {
  return Math.floor(nowMs / FAL_ALERT_WINDOW_MS)
}

// FNV-1a de 32 bits (com mistura final do murmur3) em 4 faixas — o índice da faixa entra no texto — dá 128 bits em
// forma de uuid. Não é criptografia: só precisa ser ESTÁVEL por (nome, janela, vaga) e não colidir entre elas (o
// guardião confere 20 mil janelas × tipos × vagas). Puro de propósito: node:crypto quebraria o build do navegador.
function fnv1a32(text: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  h ^= h >>> 16
  h = Math.imul(h, 0x85ebca6b)
  h ^= h >>> 13
  h = Math.imul(h, 0xc2b2ae35)
  h ^= h >>> 16
  return h >>> 0
}

function uuidFrom(seed: string): string {
  const hex = [0, 1, 2, 3].map((faixa) => fnv1a32(`${faixa}:${seed}`).toString(16).padStart(8, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

/** A vaga N da janela: 0 = a reserva de sempre; 1..MAX-1 = re-tentativas quando a anterior não saiu. */
function slotSeed(seed: string, attempt: number): string {
  return attempt === 0 ? seed : `${seed}:retry:${attempt}`
}

/** Id da reserva do alarme de saldo: a MESMA janela de 6 h (e a mesma vaga) cai sempre na mesma linha. */
export function falAlertEventId(nowMs: number = Date.now(), attempt = 0): string {
  return uuidFrom(slotSeed(`${FAL_BALANCE_EVENT}:${falAlertWindow(nowMs)}`, attempt))
}

/** Id da reserva do alarme de defeito: um por TIPO por janela de 6 h (e por vaga). */
export function dispatchDefectEventId(kind: DispatchDefectKind, nowMs: number = Date.now(), attempt = 0): string {
  return uuidFrom(slotSeed(`${DISPATCH_DEFECT_EVENT}:${kind}:${falAlertWindow(nowMs)}`, attempt))
}

function panelUrl(): string {
  const origin = (process.env.NEXT_PUBLIC_APP_URL ?? '').trim().replace(/\/+$/, '')
  return `${/^https:\/\//i.test(origin) ? origin : 'https://www.usekineo.com'}/admin/supplier-health`
}

function adminDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createServiceClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}
type AdminDb = NonNullable<ReturnType<typeof adminDb>>

// Memória da LAMBDA, não do sistema: só evita (a) a ida inútil ao banco do poll quando a lambda já sabe que não há o
// que fazer e (b) o e-mail repetido quando o banco cai. A verdade de "a janela foi avisada" é a vaga no banco.
interface JanelaLocal {
  window: number
  /** A janela está resolvida para esta lambda: o e-mail saiu, ou as tentativas acabaram. */
  settled: boolean
  /** Antes deste instante, nenhuma re-tentativa (a última tentativa conhecida não saiu, ou ainda pode estar no ar). */
  retryAt: number
  /** Envios feitos por ESTA lambda sem vaga no banco (banco fora). */
  semVaga: number
}
const LOCAL = new Map<string, JanelaLocal>()

function lembra(key: string, window: number, patch: Partial<JanelaLocal>): JanelaLocal {
  const atual = LOCAL.get(key)
  const base: JanelaLocal = atual && atual.window === window ? atual : { window, settled: false, retryAt: 0, semVaga: 0 }
  const novo = { ...base, ...patch }
  LOCAL.set(key, novo)
  return novo
}

/** Como a vaga terminou. null = não deu para ler (tratada como envio ainda no ar: espera o intervalo, não repete). */
async function leVaga(db: AdminDb, id: string): Promise<{ state: string | null; createdAtMs: number } | null> {
  try {
    const { data, error } = await db.from('events').select('created_at, metadata').eq('id', id).limit(1)
    const row = !error && Array.isArray(data) ? (data[0] as { created_at?: unknown; metadata?: { state?: unknown } | null } | undefined) : undefined
    if (!row) return null
    const t = Date.parse(String(row.created_at ?? ''))
    if (!Number.isFinite(t)) return null
    return { state: typeof row.metadata?.state === 'string' ? row.metadata.state : null, createdAtMs: t }
  } catch {
    return null
  }
}

// KINEO-FAL-CANAL-A-CANAL-2026-09-28 — a corrida é contra o PRIMEIRO canal que confirma, não contra os dois juntos.
// 'sent' = algum canal confirmou dentro do teto (o outro fica anotado como 'pending' se ainda estava no ar);
// 'timeout' = nenhum canal confirmou em 3 s; 'failed' = os dois terminaram e nenhum entregou.
async function sendWithCeiling(subject: string, text: string): Promise<{ outcome: FalAlertOutcome; channels: { email: string; webhook: string } | null }> {
  let timer: ReturnType<typeof setTimeout> | null = null
  const timeout = new Promise<'timeout'>((resolve) => { timer = setTimeout(() => resolve('timeout'), FAL_ALERT_TIMEOUT_MS) })
  const canais: { email: string; webhook: string } = { email: 'pending', webhook: 'pending' }
  let primeiroEntregue: ((v: 'first_sent') => void) | null = null
  const entregue = new Promise<'first_sent'>((resolve) => { primeiroEntregue = resolve })
  const algumSaiu = () => canais.email === 'sent' || canais.webhook === 'sent'
  const soubeAlgo = () => canais.email !== 'pending' || canais.webhook !== 'pending'
  try {
    const envio = notifyFounder(subject, text, {
      onChannel: (canal, resultado) => {
        canais[canal] = resultado
        if (resultado === 'sent') primeiroEntregue?.('first_sent')
      },
    })
    // O canal lento segue no ar depois que a corrida acabou: a rejeição dele (notifyFounder não lança, mas um
    // carteiro de teste pode) não pode virar unhandledRejection na lambda.
    envio.catch(() => undefined)
    const res = await Promise.race([envio, entregue, timeout])
    if (res === 'first_sent') return { outcome: 'sent', channels: { ...canais } }
    if (res === 'timeout') {
      if (algumSaiu()) return { outcome: 'sent', channels: { ...canais } }
      return { outcome: 'timeout', channels: soubeAlgo() ? { ...canais } : null }
    }
    return { outcome: res.delivered ? 'sent' : 'failed', channels: { email: res.email, webhook: res.webhook } }
  } catch (e) {
    console.error('[fal-alert] envio lançou:', e instanceof Error ? e.message : String(e))
    return { outcome: 'failed', channels: null }
  } finally {
    if (timer) clearTimeout(timer)
  }
}

interface ReserveInput {
  key: string
  /** nome:janela — a vaga N deriva daqui (slotSeed). */
  seed: string
  eventName: string
  path: string
  window: number
  nowMs: number
  userId: string | null
  meta: Record<string, unknown>
  /** Linha de contagem quando a janela já estava avisada (alerted:false). */
  countRow: boolean
  subject: string
  text: string
}

/** Reserva uma vaga → envia (≤ 3 s) → anota o desfecho. Nunca lança (o chamador ainda embrulha em try). */
async function reserveAndNotify(input: ReserveInput): Promise<FalAlertOutcome> {
  const { key, window, nowMs } = input
  const antes = LOCAL.get(key)
  const local = antes && antes.window === window ? antes : null
  // Chamador de alta frequência (poll): a lambda já sabe que não há o que fazer agora — nem toca no banco.
  if (!input.countRow && local && (local.settled || nowMs < local.retryAt)) return 'duplicate'
  const db = adminDb()
  const contar = async (): Promise<'duplicate'> => {
    if (db && input.countRow) {
      try {
        await db.from('events').insert({
          name: input.eventName,
          user_id: input.userId,
          path: input.path,
          metadata: { ...input.meta, user_id: input.userId, alerted: false },
        })
      } catch { /* contagem é anotação; o alarme da janela já está resolvido */ }
    }
    return 'duplicate'
  }

  let vaga: { id: string; attempt: number } | null = null
  if (db) {
    if (local?.settled) return await contar()
    try {
      for (let attempt = 0; attempt < FAL_ALERT_MAX_ATTEMPTS; attempt++) {
        const id = uuidFrom(slotSeed(input.seed, attempt))
        // A reserva nasce SEM user_id: o alarme é do sistema, e uma FK recusada não pode virar "envia sem dedupe".
        const { error } = await db.from('events').insert({
          id,
          name: input.eventName,
          user_id: null,
          path: input.path,
          metadata: { ...input.meta, user_id: input.userId, alerted: true, state: 'reserved', attempt },
        })
        if (!error) { vaga = { id, attempt }; break }
        if (error.code !== '23505') {
          console.error('[fal-alert] reserva falhou, envio segue sem dedupe:', error.code, error.message)
          break
        }
        // A vaga já tem dono. Como terminou?
        const dona = await leVaga(db, id)
        if (dona?.state === 'sent') { lembra(key, window, { settled: true }); return await contar() }
        const retryAt = (dona ? dona.createdAtMs : nowMs) + FAL_ALERT_RETRY_GAP_MS
        if (nowMs < retryAt) { lembra(key, window, { retryAt }); return await contar() }
        // Não saiu (failed/timeout/error) ou ficou 'reserved' além do intervalo (lambda morreu): tenta a vaga seguinte.
        if (attempt === FAL_ALERT_MAX_ATTEMPTS - 1) {
          console.error(`[fal-alert] ${input.eventName}: ${FAL_ALERT_MAX_ATTEMPTS} tentativas na janela, nenhuma saiu — o painel segue contando`)
          lembra(key, window, { settled: true })
          return await contar()
        }
      }
    } catch (e) {
      console.error('[fal-alert] reserva lançou, envio segue sem dedupe:', e instanceof Error ? e.message : String(e))
    }
  } else {
    console.error('[fal-alert] Supabase service role ausente — envio segue sem dedupe')
  }
  // Sem vaga (banco fora): a memória desta lambda segura o spam — mesma regra, contada aqui.
  if (!vaga && local && (local.settled || nowMs < local.retryAt)) return 'duplicate'

  const { outcome, channels } = await sendWithCeiling(input.subject, input.text)
  const semVaga = (local?.semVaga ?? 0) + (vaga ? 0 : 1)
  lembra(key, window, outcome === 'sent' || semVaga >= FAL_ALERT_MAX_ATTEMPTS
    ? { settled: true, semVaga }
    : { retryAt: nowMs + FAL_ALERT_RETRY_GAP_MS, semVaga })
  if (db && vaga) {
    try {
      await db.from('events').update({
        metadata: { ...input.meta, user_id: input.userId, alerted: true, state: outcome, attempt: vaga.attempt, ...(channels ?? {}) },
      }).eq('id', vaga.id)
    } catch { /* o desfecho é anotação; o alerta já saiu (ou não) */ }
  }
  if (outcome !== 'sent') console.error(`[fal-alert] ${input.eventName}: ${outcome}`)
  return outcome
}

export interface FalAlertInput {
  source: FalAlertSource
  engine?: string | null
  userId?: string | null
  generationId?: string | null
  scenesRefused?: number | null
  context?: string | null
  /** false = chamador de alta frequência (poll): nenhuma linha de contagem, e nem banco quando a lambda já sabe o estado. */
  countRow?: boolean
  path?: string
}

/**
 * O alarme de saldo da fal. Uma linha `fal_balance_exhausted` por ocorrência (salvo countRow:false), um e-mail
 * entregue por janela de 6 h (até 3 tentativas se o envio falhar). Nunca lança; 'duplicate' = a janela já estava
 * avisada ou a tentativa anterior ainda está dentro do intervalo (nada foi enviado de novo).
 */
export async function alertFalExhausted(input: FalAlertInput): Promise<FalAlertOutcome> {
  try {
    const now = Date.now()
    const window = falAlertWindow(now)
    const scenes = typeof input.scenesRefused === 'number' && Number.isFinite(input.scenesRefused) ? input.scenesRefused : null
    const context = input.context ? String(input.context).slice(0, 300) : null
    const meta = {
      source: input.source,
      engine: input.engine ?? null,
      generation_id: input.generationId ?? null,
      scenes_refused: scenes,
      context,
      window_start: new Date(window * FAL_ALERT_WINDOW_MS).toISOString(),
    }
    const text = [
      'The fal.ai balance is exhausted — AI renders are failing RIGHT NOW (Seedance/Kling/Veo/Kling 3/H3/Omni, the Kineo 1 first-film clips and the Avatar engines).',
      '',
      `Source: ${input.source}${input.engine ? ` · engine: ${input.engine}` : ''}`,
      scenes !== null ? `Scenes refused in this attempt: ${scenes}` : null,
      context ? `Context: ${context}` : null,
      `Time: ${new Date(now).toISOString()}`,
      '',
      `Recharge fal.ai to restore AI generation: ${FAL_BILLING_URL}`,
      `Every refusal is counted here: ${panelUrl()}`,
      'At most one delivered e-mail per 6 h window — the panel keeps counting after this one.',
    ].filter((l): l is string => l !== null).join('\n')
    return await reserveAndNotify({
      key: FAL_BALANCE_EVENT,
      seed: `${FAL_BALANCE_EVENT}:${window}`,
      eventName: FAL_BALANCE_EVENT,
      path: input.path ?? `/fal/${input.source}`,
      window,
      nowMs: now,
      userId: input.userId ?? null,
      meta,
      countRow: input.countRow !== false,
      subject: FAL_ALERT_SUBJECT,
      text,
    })
  } catch (e) {
    console.error('[fal-alert] falha inesperada:', e instanceof Error ? e.message : String(e))
    return 'error'
  }
}

export interface DispatchDefectInput {
  kind: DispatchDefectKind
  engine?: string | null
  userId?: string | null
  generationId?: string | null
  context?: string | null
}

/**
 * EMPTY_PLAN / ZERO_POSTS: defeito do NOSSO lado do balcão (nenhum POST saiu), não saldo. Até 28/09 iam pelo alarme
 * de saldo e o fundador leria "balance EXHAUSTED" sobre um fornecedor que nunca foi chamado. Assunto verdadeiro, um
 * e-mail entregue por tipo por janela de 6 h, sem linha de contagem (cinematic_dispatch_result e
 * cinematic_zero_scenes_planned já contam). Nunca lança.
 */
export async function alertDispatchDefect(input: DispatchDefectInput): Promise<FalAlertOutcome> {
  try {
    const now = Date.now()
    const window = falAlertWindow(now)
    const context = input.context ? String(input.context).slice(0, 300) : null
    const meta = {
      kind: input.kind,
      engine: input.engine ?? null,
      generation_id: input.generationId ?? null,
      context,
      window_start: new Date(window * FAL_ALERT_WINDOW_MS).toISOString(),
    }
    const what = input.kind === 'EMPTY_PLAN'
      ? 'The scene planner produced ZERO scenes, so nothing was sent to the video provider.'
      : 'Scenes were planned but ZERO requests reached the video provider (key, lambda network or the fal client failing before HTTP).'
    const text = [
      what,
      'This is on our side: the fal balance was NOT the cause. The person was refunded automatically.',
      '',
      `Engine: ${input.engine ?? 'unknown'}`,
      context ? `Context: ${context}` : null,
      `Time: ${new Date(now).toISOString()}`,
      '',
      'At most one delivered e-mail per kind per 6 h window. Count them in events: cinematic_dispatch_result (total_posts = 0) and cinematic_zero_scenes_planned.',
    ].filter((l): l is string => l !== null).join('\n')
    return await reserveAndNotify({
      key: `${DISPATCH_DEFECT_EVENT}:${input.kind}`,
      seed: `${DISPATCH_DEFECT_EVENT}:${input.kind}:${window}`,
      eventName: DISPATCH_DEFECT_EVENT,
      path: '/api/generate-video-cinematic',
      window,
      nowMs: now,
      userId: input.userId ?? null,
      meta,
      countRow: false,
      subject: `⚠️ Kineo: render dispatch defect (${input.kind}) — not a fal balance problem`,
      text,
    })
  } catch (e) {
    console.error('[fal-alert] alarme de defeito falhou:', e instanceof Error ? e.message : String(e))
    return 'error'
  }
}
