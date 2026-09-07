// ═══ KINEO-GPT-HANDOFF-2026-09-06 — a parte que toca o banco ═══════════════
//
// Tudo aqui roda com a chave de SERVIÇO (mesmo padrão de lib/serverEvents.ts):
// `gpt_handoffs` tem RLS ligado e NENHUMA policy pública — anon/authenticated
// não leem nem escrevem uma linha. Quem escreve é a ação do GPT (sem conta,
// sem sessão) e quem lê é a página /go e a rota do clique, todas servidor.
//
// Toda função devolve `null`/`false` em vez de lançar: os chamadores são um
// contador pendurado no caminho de volta do cliente (a rota do clique) e uma
// página pública. Um erro de banco aqui deve virar "link expirado" ou um
// redirecionamento — nunca um 500.
import { createClient as createServiceClient, type SupabaseClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'
import { RATE_LIMIT_WINDOW_MS, type HandoffFit } from '@/lib/gptHandoff'

export const GPT_HANDOFFS_TABLE = 'gpt_handoffs'

export type GptHandoffRow = {
  /** Dona do handoff: a PRIMEIRA pessoa que clicou com sessao. Null enquanto
   *  so houve clique anonimo. E a chave da juncao por pessoa do funil. */
  user_id?: string | null
  id: string
  token: string
  script: string
  duration_sec: number
  aspect: string
  engine_hint: string
  language: string
  topic: string | null
  words: number
  seconds: number
  fit: HandoffFit
  created_at: string
  expires_at: string
  viewed_at: string | null
  clicked_at: string | null
  click_count: number
  /** KINEO-ASSISTANT-LINK-2026-09-06: 'gpt_store' (Action/POST) ou
   *  'assistant_link' (GET /make). Linhas anteriores à coluna vêm com o
   *  default do banco, 'gpt_store'. */
  channel?: string | null
  /** sha256 do payload+canal (lib/gptHandoff.ts handoffPayloadHash) — chave
   *  de idempotência: mesmo link/roteiro = mesma linha. */
  payload_hash?: string | null
}

const ROW_COLUMNS =
  'id, token, script, duration_sec, aspect, engine_hint, language, topic, words, seconds, fit, created_at, expires_at, viewed_at, clicked_at, click_count, channel, payload_hash'

export function serviceClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createServiceClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

/** Primeiro IP de x-forwarded-for (o do cliente), fallback x-real-ip — o mesmo
 *  critério de lib/trialFingerprint.ts. Loopback/unknown = sem sinal. */
export function clientIp(headers: Headers): string | null {
  const fwd = headers.get('x-forwarded-for')
  const first = fwd ? fwd.split(',')[0]?.trim() : ''
  const ip = first || (headers.get('x-real-ip') ?? '').trim()
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip === 'unknown') return null
  return ip.slice(0, 64)
}

/** SHA-256(salt|ip). Nunca gravamos IP cru. Sem KINEO_TRIAL_FINGERPRINT_SALT
 *  no ambiente cai num pepper fixo — o hash continua não reversível na
 *  prática, só deixa de ser rotacionável; o rate limit precisa de ALGUM
 *  identificador para existir, então aqui, ao contrário do trial, não se
 *  desliga sem salt. */
export function hashIp(ip: string | null): string | null {
  if (!ip) return null
  const salt = process.env.KINEO_TRIAL_FINGERPRINT_SALT?.trim() || 'kineo-gpt-handoff-v1'
  try {
    return createHash('sha256').update(`${salt}|${ip}`).digest('hex')
  } catch {
    return null
  }
}

/** Varredor, pré-visualização de link e robô de segurança batem em URL sem
 *  humano por perto. Não bloqueamos — só etiquetamos (padrão episode-link). */
const ROBO = /(bot|crawler|spider|slurp|preview|scanner|monitor|curl|wget|python-requests|headless|proxy|fetcher|validator)/i
export function isLikelyBot(ua: string | null): boolean {
  if (!ua) return true
  return ROBO.test(ua)
}

export type RecentCounts = { ip: number; global: number }

/** Quantas linhas nasceram na última hora — deste IP e no total. Devolve null
 *  quando o banco não responde: contador quebrado NÃO pode barrar o funil
 *  (falha aberta), e a inserção logo em seguida falharia de qualquer jeito
 *  se o banco estivesse mesmo fora. */
export async function countRecentHandoffs(ipHash: string | null): Promise<RecentCounts | null> {
  const db = serviceClient()
  if (!db) return null
  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString()
  try {
    const globalQ = db.from(GPT_HANDOFFS_TABLE).select('id', { count: 'exact', head: true }).gte('created_at', since)
    const ipQ = ipHash
      ? db.from(GPT_HANDOFFS_TABLE).select('id', { count: 'exact', head: true }).gte('created_at', since).eq('ip_hash', ipHash)
      : null
    const [g, i] = await Promise.all([globalQ, ipQ])
    if (g.error) return null
    if (i && i.error) return null
    return { ip: i?.count ?? 0, global: g.count ?? 0 }
  } catch {
    return null
  }
}

export type NewHandoff = {
  token: string
  script: string
  duration_sec: number
  aspect: string
  engine_hint: string
  language: string
  topic: string | null
  words: number
  seconds: number
  fit: HandoffFit
  expires_at: string
  ip_hash: string | null
  user_agent: string | null
  channel: string
  payload_hash: string | null
}

/** Postgres 23505 = unique_violation. Com o índice único parcial em
 *  payload_hash, dois inserts do MESMO payload correndo juntos fazem o segundo
 *  perder aqui — e o chamador reaproveita a linha do primeiro em vez de 503. */
export const UNIQUE_VIOLATION = '23505'

export async function insertHandoff(
  row: NewHandoff,
): Promise<{ ok: true } | { ok: false; error: string; duplicate: boolean }> {
  const db = serviceClient()
  if (!db) return { ok: false, error: 'service role not configured', duplicate: false }
  try {
    const { error } = await db.from(GPT_HANDOFFS_TABLE).insert(row)
    if (error) return { ok: false, error: error.message, duplicate: error.code === UNIQUE_VIOLATION }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e), duplicate: false }
  }
}

/** KINEO-ASSISTANT-LINK-2026-09-06 — a linha VIVA (expires_at > agora) com
 *  este hash, se houver. É o que faz o mesmo link clicado 3× ser UMA linha.
 *  Linha vencida não conta: quem clica num link de 8 dias ganha linha nova,
 *  com prazo novo. Erro ou sem service client → null, nunca lança — a rota
 *  segue e insere (no pior caso o índice único recusa e ela relê). */
export async function findHandoffByPayloadHash(hash: string): Promise<{ token: string; expires_at: string } | null> {
  const db = serviceClient()
  if (!db) return null
  try {
    const { data, error } = await db
      .from(GPT_HANDOFFS_TABLE)
      .select('token, expires_at')
      .eq('payload_hash', hash)
      .gt('expires_at', new Date().toISOString())
      .limit(1)
      .maybeSingle()
    if (error || !data) return null
    const row = data as { token?: unknown; expires_at?: unknown }
    if (typeof row.token !== 'string' || typeof row.expires_at !== 'string') return null
    return { token: row.token, expires_at: row.expires_at }
  } catch {
    return null
  }
}

export type HandoffLookup =
  | { status: 'ok'; row: GptHandoffRow; expired: boolean }
  | { status: 'missing' }
  | { status: 'unavailable' }

export async function findHandoff(token: string): Promise<HandoffLookup> {
  const db = serviceClient()
  if (!db) return { status: 'unavailable' }
  try {
    const { data, error } = await db.from(GPT_HANDOFFS_TABLE).select(ROW_COLUMNS).eq('token', token).maybeSingle()
    if (error) return { status: 'unavailable' }
    if (!data) return { status: 'missing' }
    const row = data as unknown as GptHandoffRow
    const expiresAt = Date.parse(row.expires_at)
    const expired = !Number.isFinite(expiresAt) || expiresAt <= Date.now()
    return { status: 'ok', row, expired }
  } catch {
    return { status: 'unavailable' }
  }
}

/** Primeira visualização humana. Só grava se ainda estava vazio. */
export async function markHandoffViewed(token: string): Promise<boolean> {
  const db = serviceClient()
  if (!db) return false
  try {
    const { error } = await db
      .from(GPT_HANDOFFS_TABLE)
      .update({ viewed_at: new Date().toISOString() })
      .eq('token', token)
      .is('viewed_at', null)
    return !error
  } catch {
    return false
  }
}

/** Clique no botão. `click_count` vem da linha já lida pelo chamador — dois
 *  cliques simultâneos podem contar um; é um contador de funil, não um livro
 *  caixa, e o evento `gpt_landing_clicked` conta cada um separado. */
/** Carimba o clique e, se houver sessão, PRENDE A PESSOA na linha — é o que
 *  transforma o funil de "por dia" em "por pessoa".
 *
 *  O handoff nasce anônimo (o GPT não tem a conta do cliente), então sem isto
 *  os degraus cadastro/filme/pagamento só se juntariam por data, que é junção
 *  fraca e já custou caro nesta casa. Quem chega deslogado volta ao
 *  /go/<token> depois do cadastro e clica de novo — dessa vez COM sessão —,
 *  e o middleware devolve quem já tem conta ao destino sem nem mostrar o
 *  formulário (lib/supabase/middleware.ts:57-69). O laço fecha sozinho.
 *
 *  `.is('user_id', null)` é deliberado: A PRIMEIRA PESSOA GANHA. O GPT
 *  devolve um link dentro de uma conversa que a pessoa pode colar num grupo;
 *  sobrescrever faria a atribuição trocar de dono a cada clique de terceiro.
 *  Quem clica depois não some — o evento `gpt_landing_clicked` carrega o
 *  user_id de TODOS. A coluna é 1:1 (a dona), o evento é N:1 (o tráfego). */
export async function markHandoffClicked(
  row: Pick<GptHandoffRow, 'token' | 'click_count'>,
  userId?: string | null,
): Promise<boolean> {
  const db = serviceClient()
  if (!db) return false
  try {
    const { error } = await db
      .from(GPT_HANDOFFS_TABLE)
      .update({ clicked_at: new Date().toISOString(), click_count: (row.click_count ?? 0) + 1 })
      .eq('token', row.token)
    if (userId) {
      // Atualização SEPARADA e condicional: se esta falhar, o clique já foi
      // contado. Medição de dono nunca pode custar o degrau do funil.
      await db
        .from(GPT_HANDOFFS_TABLE)
        .update({ user_id: userId })
        .eq('token', row.token)
        .is('user_id', null)
    }
    return !error
  } catch {
    return false
  }
}

/** URL pública que vai no JSON para o GPT. Em produção é o domínio canônico
 *  (o host visto pela lambda pode ser o alias da Vercel); fora dela, a origem
 *  do próprio pedido, para o link funcionar em dev e preview. */
export const HANDOFF_CANONICAL_ORIGIN = 'https://www.usekineo.com'
export function handoffPublicOrigin(requestOrigin: string): string {
  return process.env.VERCEL_ENV === 'production' ? HANDOFF_CANONICAL_ORIGIN : requestOrigin
}
