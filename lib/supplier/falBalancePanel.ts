// KINEO-FAL-SALDO-ALERTA-2026-09-28 — o card do topo de /admin/supplier-health: "a fal travou por saldo? quando,
// quanto, quem pagou?".
//
// POR QUÊ: 36 cenas recusadas por saldo em 30 dias (11/09, 16/09, 21/09) e nenhuma tela respondia isso — o único
// sinal era um e-mail sem rastro. O alarme novo (lib/falAlert.ts) grava `fal_balance_exhausted`; este módulo lê.
//
// CONTAR NO BANCO: tudo vem da RPC admin_fal_balance_panel (supabase/migrations/20260928090000_…), um jsonb já
// agregado. Nenhum .select de linha crua: o PostgREST corta em 1000 SEM ERRO. Se a migration ainda não foi aplicada,
// o card NÃO some nem inventa zero: cai para leituras exatas (último alarme e última recusa com limit 1, contagem de
// despachos com count exact/head, que o banco calcula sem devolver linha) e diz na tela que o detalhe espera a
// migration.
//
// (d) saldo AO VIVO da fal fica fora: o endpoint de billing exige chave ADMIN da fal, que a casa não tem.
//
// Nunca lança: o painel de fornecedor não pode cair porque a leitura do saldo caiu.
//
// REVISÃO DE 28/09 — dois jeitos de o card dizer "tudo bem" sem ter medido:
//  · LEITURA QUE FALHOU VIRAVA VERDE: sem a migration (o estado no lançamento) o card vive do fallback, e o fallback
//    ignorava o erro das leituras — um statement timeout (57014) nas duas devolvia {latest:null, dispatch:null} e o
//    card pintava "No balance alarm recorded yet" em verde. É o defeito de sempre da casa (tela que mostra erro de
//    leitura como vazio, 28/08). Agora QUALQUER leitura do fallback com erro = null = "Not measured", em âmbar.
//  · O VERMELHO SEGUIA A PRIMEIRA RECUSA DA JANELA: a reserva do alarme nasce na 1ª recusa da janela fixa de 6 h; as
//    seguintes viram linhas de contagem que o "fresco" não olhava. Reserva às 00:10 UTC, recusas até 05:50, card
//    aberto às 06:30 → verde "No balance alarm in the last 6 h" com a fal recusando 40 min antes. Agora o fresco é a
//    ÚLTIMA recusa registrada (last_refusal_at = max de fal_balance_exhausted e de cinematic_dispatch_result com
//    saldo); a reserva fica só para a linha "e-mail sent/failed".
//
// FIX-REVISAO-2 (2026-09-28) — LINHA FORJADA PELO NAVEGADOR: `fal_balance_exhausted` não estava em SERVER_ONLY_EVENTS e o
// sink público /api/events aceitava o nome — um POST anônimo com {alerted:true, state:'sent'} pintava o card de vermelho e
// mostrava um e-mail "sent" que nunca saiu. O nome agora é só-do-servidor lá; e, em defesa em profundidade, este leitor (e
// a RPC) ignoram toda linha com o carimbo daquele sink — ip_hash/is_bot são escritos pelo /api/events DEPOIS do metadata
// do cliente, em TODA linha dele, e o alarme (lib/falAlert, service role) nunca os escreve.
import type { SupabaseClient } from '@supabase/supabase-js'
import { INTERNAL_EXACT_EMAILS, INTERNAL_LIKE_PATTERNS } from '@/lib/internalAccounts'

export const FAL_PANEL_RPC = 'admin_fal_balance_panel'
export const FAL_PANEL_MIGRATION = 'supabase/migrations/20260928090000_admin_fal_balance_panel.sql'
export const FAL_PANEL_DAYS = 30
/** Mesma janela do alarme (lib/falAlert FAL_ALERT_WINDOW_MS): recusa mais nova que isto = vermelho. */
export const FAL_PANEL_FRESH_MS = 6 * 60 * 60 * 1000

export interface FalPanelLatest {
  createdAt: string
  source: string | null
  engine: string | null
  state: string | null
  scenesRefused: number | null
}
export interface FalPanelDay {
  day: string
  source: string
  events: number
  alerts: number
  scenesRefused: number
  people: number
  externalPeople: number
}
export interface FalPanelDispatch {
  dispatches: number
  scenesRefused: number | null
  people: number | null
  externalPeople: number | null
  refundedCredits: number | null
  deliveredChargedCredits: number | null
  unrefundedUndeliveredCredits: number | null
  unrefundedUndeliveredDebits: number | null
  unrefundedUndeliveredExternal: number | null
}
export interface FalBalancePanel {
  /** 'rpc' = números completos; 'fallback' = migration pendente, só o que dá para contar exato sem ela. */
  mode: 'rpc' | 'fallback'
  days: number
  /** O último alarme (a vaga reservada, alerted=true) — é dele a linha "e-mail sent/failed". */
  latest: FalPanelLatest | null
  /** A ÚLTIMA recusa registrada (qualquer linha fal_balance_exhausted ou despacho com saldo) — é ela que pinta o vermelho. */
  lastRefusalAt: string | null
  byDay: FalPanelDay[]
  dispatch: FalPanelDispatch | null
}

function num(v: unknown): number {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN
  return Number.isFinite(n) ? n : 0
}
function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : null
}
function strOrNull(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null
}

function parseLatest(raw: unknown): FalPanelLatest | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const createdAt = strOrNull(r.created_at)
  if (!createdAt) return null
  return {
    createdAt,
    source: strOrNull(r.source),
    engine: strOrNull(r.engine),
    state: strOrNull(r.state),
    scenesRefused: numOrNull(r.scenes_refused),
  }
}

/** Traduz o jsonb da RPC. Puro: o guardião roda com o formato real. Campo ausente vira null/0, nunca lança. */
export function parseFalBalancePanel(raw: unknown): FalBalancePanel | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const r = raw as Record<string, unknown>
  const d = (r.dispatch && typeof r.dispatch === 'object' ? r.dispatch : null) as Record<string, unknown> | null
  const byDay = Array.isArray(r.by_day) ? r.by_day : []
  return {
    mode: 'rpc',
    days: num(r.days) || FAL_PANEL_DAYS,
    latest: parseLatest(r.latest),
    lastRefusalAt: strOrNull(r.last_refusal_at),
    byDay: byDay
      .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')
      .map((x) => ({
        day: String(x.day ?? ''),
        source: String(x.source ?? 'unknown'),
        events: num(x.events),
        alerts: num(x.alerts),
        scenesRefused: num(x.scenes_refused),
        people: num(x.people),
        externalPeople: num(x.external_people),
      })),
    dispatch: d
      ? {
          dispatches: num(d.dispatches),
          scenesRefused: numOrNull(d.scenes_refused),
          people: numOrNull(d.people),
          externalPeople: numOrNull(d.external_people),
          refundedCredits: numOrNull(d.refunded_credits),
          deliveredChargedCredits: numOrNull(d.delivered_charged_credits),
          unrefundedUndeliveredCredits: numOrNull(d.unrefunded_undelivered_credits),
          unrefundedUndeliveredDebits: numOrNull(d.unrefunded_undelivered_debits),
          unrefundedUndeliveredExternal: numOrNull(d.unrefunded_undelivered_external),
        }
      : null,
  }
}

/** A última recusa conhecida: a mais nova entre last_refusal_at e o último alarme (a reserva também é uma recusa). */
export function falLastRefusalAt(panel: FalBalancePanel | null): string | null {
  if (!panel) return null
  const cands = [panel.lastRefusalAt, panel.latest?.createdAt ?? null]
    .filter((v): v is string => typeof v === 'string' && Number.isFinite(Date.parse(v)))
  if (cands.length === 0) return null
  return cands.reduce((a, b) => (Date.parse(b) > Date.parse(a) ? b : a))
}

/** A fal recusou por saldo nas últimas 6 h? (vermelho no card) — pela ÚLTIMA recusa, nunca pela 1ª da janela. */
export function falRefusalIsFresh(panel: FalBalancePanel | null, nowMs: number): boolean {
  const at = falLastRefusalAt(panel)
  if (!at) return false
  const t = Date.parse(at)
  return nowMs - t >= 0 && nowMs - t < FAL_PANEL_FRESH_MS
}

type Leitura = { data?: unknown; error?: { code?: string; message?: string } | null; count?: number | null }

function firstCreatedAt(res: Leitura): string | null {
  const row = Array.isArray(res.data) ? (res.data[0] as { created_at?: unknown } | undefined) : undefined
  return row ? strOrNull(row.created_at) : null
}

/**
 * FIX-REVISAO-2 — só linhas do SERVIDOR: sem as chaves que o sink público carimba em toda linha (`metadata->ip_hash` e
 * `metadata->is_bot` ausentes = SQL NULL no operador `->`; a chave com valor null no JSON não é NULL e fica de fora).
 * Espelho do filtro da RPC (EVENTO_DO_SERVIDOR na migration).
 */
export const FAL_PANEL_CLIENT_STAMP_KEYS = ['metadata->ip_hash', 'metadata->is_bot'] as const
function soDoServidor<Q extends { is: (column: string, value: null) => Q }>(q: Q): Q {
  return FAL_PANEL_CLIENT_STAMP_KEYS.reduce((acc, chave) => acc.is(chave, null), q)
}

/** null = alguma leitura falhou: o card diz "não medido", nunca "sem alarme". */
async function readFallback(admin: SupabaseClient, nowMs: number): Promise<FalBalancePanel | null> {
  const since = new Date(nowMs - FAL_PANEL_DAYS * 24 * 60 * 60 * 1000).toISOString()
  const [latestRes, dispatchRes, lastRowRes, lastDispatchRes] = (await Promise.all([
    soDoServidor(
      admin
        .from('events')
        .select('created_at, metadata')
        .eq('name', 'fal_balance_exhausted')
        .eq('metadata->>alerted', 'true'),
    )
      .order('created_at', { ascending: false })
      .limit(1),
    // count exact + head: o banco conta e não devolve linha — imune ao corte de 1000.
    admin
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('name', 'cinematic_dispatch_result')
      .eq('metadata->>balance_exhausted', 'true')
      .gte('created_at', since),
    // a ÚLTIMA recusa (reserva OU contagem), só a data — e só linha do servidor (FIX-REVISAO-2)
    soDoServidor(
      admin
        .from('events')
        .select('created_at')
        .eq('name', 'fal_balance_exhausted')
        .gte('created_at', since),
    )
      .order('created_at', { ascending: false })
      .limit(1),
    admin
      .from('events')
      .select('created_at')
      .eq('name', 'cinematic_dispatch_result')
      .eq('metadata->>balance_exhausted', 'true')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(1),
  ])) as Leitura[]
  const falhou = [latestRes, dispatchRes, lastRowRes, lastDispatchRes].find((r) => r.error)
  if (falhou) {
    console.warn(`[fal-panel] fallback sem leitura (${falhou.error?.code ?? '?'}): ${falhou.error?.message ?? ''} — card "não medido"`)
    return null
  }
  // count exact sem número não é zero: é leitura que não mediu.
  if (typeof dispatchRes.count !== 'number') return null
  const row = Array.isArray(latestRes.data) ? (latestRes.data[0] as { created_at?: unknown; metadata?: Record<string, unknown> } | undefined) : undefined
  const latest = row ? parseLatest({ created_at: row.created_at, ...(row.metadata ?? {}) }) : null
  const recusas = [firstCreatedAt(lastRowRes), firstCreatedAt(lastDispatchRes)].filter((v): v is string => v !== null)
  const lastRefusalAt = recusas.length ? recusas.reduce((a, b) => (Date.parse(b) > Date.parse(a) ? b : a)) : null
  const dispatch: FalPanelDispatch = {
    dispatches: dispatchRes.count,
    scenesRefused: null,
    people: null,
    externalPeople: null,
    refundedCredits: null,
    deliveredChargedCredits: null,
    unrefundedUndeliveredCredits: null,
    unrefundedUndeliveredDebits: null,
    unrefundedUndeliveredExternal: null,
  }
  return { mode: 'fallback', days: FAL_PANEL_DAYS, latest, lastRefusalAt, byDay: [], dispatch }
}

/** Lê o card. null = nem a RPC nem as leituras exatas responderam (o card diz "não medido", nunca "tudo bem"). */
export async function readFalBalancePanel(admin: SupabaseClient, now: Date = new Date()): Promise<FalBalancePanel | null> {
  try {
    const { data, error } = await admin.rpc(FAL_PANEL_RPC, {
      p_exact_emails: INTERNAL_EXACT_EMAILS,
      p_like_patterns: INTERNAL_LIKE_PATTERNS,
      p_days: FAL_PANEL_DAYS,
    })
    if (!error) {
      const parsed = parseFalBalancePanel(data)
      if (parsed) return parsed
    } else {
      console.warn(`[fal-panel] ${FAL_PANEL_RPC} indisponível (${error.code ?? '?'}): ${error.message}`)
    }
    return await readFallback(admin, now.getTime())
  } catch (e) {
    console.warn('[fal-panel] leitura falhou:', e instanceof Error ? e.message : String(e))
    return null
  }
}
