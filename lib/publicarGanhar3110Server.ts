// ═══ KINEO-PUBLICAR-GANHAR-3110 — o pagador do "Publish & earn" (server-only, service role) ═══
//
// Roda dentro do cron /api/cron/remix-reward. Não existe gancho único de "primeiro filme pronto" (o filme termina por 4
// caminhos: compose, cinematic, fast e o resgate de presos), e encostar nesses caminhos para pagar indicação seria
// misturar dinheiro com render. O cron lê os fatos já gravados pelo servidor:
//   1. remix_signup (só /api/remix/signup grava: conta nova ≤ 60 min + filme de origem publicado) → quem indicou quem;
//   2. videos.status = 'completed' da conta indicada → terminou o primeiro filme;
//   3. remix_reward_granted (path do cron) → já pago / quanto o dono já ganhou no mês.
// Idempotência sem tabela nova: o evento de pagamento nasce com id DETERMINÍSTICO (hash da conta indicada) e é inserido
// ANTES do crédito — events.id é chave primária, então a segunda tentativa (cron sobreposto, clique duplo no dry-run →
// SEND) recebe 23505 e não credita. Crédito falhou → o evento é apagado (a conta volta a poder pagar). O teto do mês é
// reconferido DEPOIS do insert (os mais antigos ficam; quem estoura sai), como em lib/postToEarnGrant.ts.
// Toda leitura de eventos é paginada e ordenada (readAll) — nada de corte silencioso em 1000 linhas.
import { createHash } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { readAll } from '@/lib/supabase/readAll'
import { isInternalEmail } from '@/lib/internalAccounts'
import {
  decideRemixReward,
  monthStartUtcIso,
  PUBLICAR_GANHAR_3110_VERSION,
  REMIX_REWARD_EVENT,
  REMIX_REWARD_MONTHLY_CAP,
  REMIX_REWARD_PATH,
} from './publicarGanhar3110'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
/** Janela de remix_signup considerada (dias). Quem chegou antes e nunca terminou um filme não paga mais. */
export const REMIX_REWARD_LOOKBACK_DAYS = 60
const CHUNK = 100

/** id do evento de pagamento: o mesmo para a mesma conta indicada, sempre (formato UUID v5-like). */
export function remixRewardClaimId(referredUserId: string): string {
  const h = createHash('sha256').update(`kineo:remix_reward:${referredUserId}`).digest('hex').slice(0, 32).split('')
  h[12] = '5'
  h[16] = ((parseInt(h[16], 16) & 0x3) | 0x8).toString(16)
  const s = h.join('')
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20, 32)}`
}

type Md = Record<string, unknown> | null
type EventRow = { id: string; user_id: string | null; created_at: string; metadata: Md; path?: string | null }

export type RemixRewardRun = {
  dry_run: boolean
  month_start: string
  signups: number
  granted: number
  would_grant: number
  credits: number
  skipped: Record<string, number>
  grants: { owner_user_id: string; referred_user_id: string; source_video_id: string; credits: number }[]
}

const chunks = <T,>(xs: T[]): T[][] => {
  const out: T[][] = []
  for (let i = 0; i < xs.length; i += CHUNK) out.push(xs.slice(i, i + CHUNK))
  return out
}
const md = (r: { metadata: Md }) => (r.metadata && typeof r.metadata === 'object' ? r.metadata : {}) as Record<string, unknown>
const isPaid = (r: EventRow) => r.path === REMIX_REWARD_PATH && md(r).granted === true

export async function runRemixRewards(
  admin: SupabaseClient,
  opts: { dryRun: boolean; now?: Date },
): Promise<RemixRewardRun> {
  const now = opts.now ?? new Date()
  const monthStart = monthStartUtcIso(now)
  const since = new Date(now.getTime() - REMIX_REWARD_LOOKBACK_DAYS * 86_400_000).toISOString()
  const route = REMIX_REWARD_PATH
  const out: RemixRewardRun = { dry_run: opts.dryRun, month_start: monthStart, signups: 0, granted: 0, would_grant: 0, credits: 0, skipped: {}, grants: [] }
  const skip = (reason: string) => { out.skipped[reason] = (out.skipped[reason] ?? 0) + 1 }

  // 1) quem chegou por um filme publicado — a 1ª chegada de cada conta, em ordem de data.
  const { data: signupRows } = await readAll<EventRow>(() => admin.from('events')
    .select('id,user_id,created_at,metadata').eq('name', 'remix_signup').gte('created_at', since)
    .order('created_at', { ascending: true }) as never, { route, table: 'events', key: 'id' })
  const signups = new Map<string, string>() // referred → source_video_id
  for (const r of signupRows ?? []) {
    const src = String(md(r).source_video_id ?? '')
    if (!r.user_id || !UUID.test(src) || signups.has(r.user_id)) continue
    signups.set(r.user_id, src)
  }
  out.signups = signups.size
  if (signups.size === 0) return out

  // 2) o que já foi pago (de todos os tempos: uma vez por conta indicada) e quanto cada dono já ganhou no mês.
  const { data: paidRows } = await readAll<EventRow>(() => admin.from('events')
    .select('id,user_id,created_at,metadata,path').eq('name', REMIX_REWARD_EVENT)
    .order('created_at', { ascending: true }) as never, { route, table: 'events', key: 'id' })
  const rewarded = new Set<string>()
  const ownerMonth = new Map<string, number>()
  for (const r of paidRows ?? []) {
    if (!isPaid(r)) continue
    const referred = String(md(r).referred_user_id ?? '')
    if (referred) rewarded.add(referred)
    if (r.user_id && r.created_at >= monthStart) ownerMonth.set(r.user_id, (ownerMonth.get(r.user_id) ?? 0) + (Number(md(r).credits) || 0))
  }

  // 3) dono de cada filme de origem, filmes prontos de cada indicado, e-mails dos dois lados.
  const referredIds = [...signups.keys()]
  const sourceIds = [...new Set(signups.values())]
  const owners = new Map<string, string>()
  for (const ids of chunks(sourceIds)) {
    const { data } = await readAll<{ id: string; user_id: string | null }>(() => admin.from('videos').select('id,user_id').in('id', ids) as never, { route, table: 'videos' })
    for (const v of data ?? []) if (v.user_id) owners.set(v.id, v.user_id)
  }
  const completed = new Map<string, number>()
  for (const ids of chunks(referredIds)) {
    const { data } = await readAll<{ id: string; user_id: string | null }>(() => admin.from('videos').select('id,user_id').in('user_id', ids).eq('status', 'completed') as never, { route, table: 'videos' })
    for (const v of data ?? []) if (v.user_id) completed.set(v.user_id, (completed.get(v.user_id) ?? 0) + 1)
  }
  const emails = new Map<string, string | null>()
  const people = [...new Set([...referredIds, ...owners.values()])]
  for (const ids of chunks(people)) {
    const { data } = await readAll<{ id: string; email: string | null }>(() => admin.from('profiles').select('id,email').in('id', ids) as never, { route, table: 'profiles' })
    for (const p of data ?? []) emails.set(p.id, p.email ?? null)
  }

  // 4) decide e paga, um por um.
  for (const [referred, sourceVideoId] of signups) {
    const owner = owners.get(sourceVideoId)
    if (!owner) { skip('source_missing'); continue }
    const ownerEmail = emails.get(owner) ?? null, referredEmail = emails.get(referred) ?? null
    const decision = decideRemixReward({
      referredUserId: referred, ownerUserId: owner, ownerEmail, referredEmail,
      referredCompletedFilms: completed.get(referred) ?? 0,
      alreadyRewarded: rewarded.has(referred),
      ownerCreditsThisMonth: ownerMonth.get(owner) ?? 0,
      ownerInternal: isInternalEmail(ownerEmail), referredInternal: isInternalEmail(referredEmail),
    })
    if (!decision.grant) { skip(decision.reason); continue }
    const grant = { owner_user_id: owner, referred_user_id: referred, source_video_id: sourceVideoId, credits: decision.credits }
    if (opts.dryRun) {
      out.would_grant += 1
      out.grants.push(grant)
      ownerMonth.set(owner, (ownerMonth.get(owner) ?? 0) + decision.credits)
      rewarded.add(referred)
      continue
    }

    // a) a autorização: o evento com id determinístico, ANTES do crédito.
    const claimId = remixRewardClaimId(referred)
    const { error: claimErr } = await admin.from('events').insert({
      id: claimId,
      user_id: owner,
      name: REMIX_REWARD_EVENT,
      path: REMIX_REWARD_PATH,
      metadata: { source_video_id: sourceVideoId, referred_user_id: referred, credits: decision.credits, granted: true, month_start: monthStart, version: PUBLICAR_GANHAR_3110_VERSION },
    })
    if (claimErr) { skip(claimErr.code === '23505' ? 'already_rewarded' : 'claim_failed'); rewarded.add(referred); continue }

    // b) o teto do mês reconferido com a linha já no banco: os mais antigos ficam, quem estoura sai.
    const { data: monthRows } = await readAll<EventRow>(() => admin.from('events')
      .select('id,user_id,created_at,metadata,path').eq('name', REMIX_REWARD_EVENT).eq('user_id', owner).gte('created_at', monthStart)
      .order('created_at', { ascending: true }) as never, { route, table: 'events', key: 'id' })
    let running = 0, over = false
    for (const r of monthRows ?? []) {
      if (!isPaid(r)) continue
      running += Number(md(r).credits) || 0
      if (r.id === claimId) { over = running > REMIX_REWARD_MONTHLY_CAP; break }
    }
    if (over) { await admin.from('events').delete().eq('id', claimId); skip('monthly_cap'); continue }

    // c) o crédito, pelo mesmo RPC atômico dos pagamentos. Falhou → desfaz a autorização.
    const { error: creditErr } = await admin.rpc('add_video_credits', { p_user: owner, p_amount: decision.credits })
    if (creditErr) { await admin.from('events').delete().eq('id', claimId); skip('credit_failed'); continue }

    out.granted += 1
    out.credits += decision.credits
    out.grants.push(grant)
    ownerMonth.set(owner, (ownerMonth.get(owner) ?? 0) + decision.credits)
    rewarded.add(referred)
  }
  return out
}
