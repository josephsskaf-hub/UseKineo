// KINEO-CORTESIA-2026-10-03 — as escritas da cortesia (conceder, somar créditos, vencer), num lugar só, recebendo o
// cliente service-role de quem chama. A regra mora em lib/courtesy.ts (pura); aqui só a ordem das escritas:
//   conceder = 1) linha em courtesy_grants (índice único "uma ativa por pessoa" segura o clique duplo)
//              2) perfil com CAS (plano e saldo ainda são os que lemos) → plano = nível, saldo += créditos
//              3) evento admin_courtesy_granted (quem/quanto/por quê/até quando)
//   Se o passo 2 perder a corrida, a linha do passo 1 vira 'revoked' e nada foi dado.
// Sem import de runtime além da regra pura: o guardião executa este arquivo com um banco em memória.
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  courtesyEndsAt,
  planCourtesyExpiry,
  validateCourtesyRequest,
  COURTESY_LEFTOVER_RULE,
  COURTESY_MAX_CREDITS,
  type CourtesyGrantRow,
  type CourtesyLeftoverRule,
  type CourtesyProfile,
  type CourtesySource,
} from '@/lib/courtesy'

const GRANT_COLUMNS = 'id, user_id, level, previous_plan, credits_granted, credits_before, had_paid_before, ends_at, status'

export type GrantCourtesyResult =
  | { ok: true; grantId: string; userId: string; level: string; endsAt: string; before: number; after: number }
  | { ok: false; status: number; error: string }

export async function grantCourtesy(
  admin: SupabaseClient,
  input: { userId: string; level: unknown; credits: unknown; days: unknown; reason: unknown; grantedBy: string; source: CourtesySource; nowMs?: number },
): Promise<GrantCourtesyResult> {
  const nowMs = input.nowMs ?? Date.now()
  const { data: profile, error: pErr } = await admin
    .from('profiles')
    .select('id, plan, video_credits, has_paid')
    .eq('id', input.userId)
    .maybeSingle()
  if (pErr) return { ok: false, status: 500, error: 'Falhou ao ler a conta.' }
  const { data: active, error: aErr } = await admin
    .from('courtesy_grants')
    .select('id')
    .eq('user_id', input.userId)
    .eq('status', 'active')
    .maybeSingle()
  if (aErr) return { ok: false, status: 503, error: 'Tabela courtesy_grants indisponível (migration 20261003120000 aplicada?).' }

  const v = validateCourtesyRequest(input, (profile as CourtesyProfile | null) ?? null, Boolean(active?.id))
  if (!v.ok) return { ok: false, status: 400, error: v.error }
  const prof = profile as CourtesyProfile & { has_paid?: boolean | null }
  const before = typeof prof.video_credits === 'number' ? prof.video_credits : 0
  const endsAt = courtesyEndsAt(nowMs, v.value.days)

  const { data: grant, error: gErr } = await admin
    .from('courtesy_grants')
    .insert({
      user_id: prof.id,
      level: v.value.level,
      previous_plan: prof.plan ?? null,
      credits_granted: v.value.credits,
      credits_before: before,
      had_paid_before: prof.has_paid === true,
      starts_at: new Date(nowMs).toISOString(),
      ends_at: endsAt,
      reason: v.value.reason,
      granted_by: input.grantedBy,
      source: input.source,
      status: 'active',
    })
    .select('id')
    .maybeSingle()
  if (gErr || !grant?.id) {
    return gErr?.code === '23505'
      ? { ok: false, status: 409, error: 'Esta conta já tem uma cortesia ativa.' }
      : { ok: false, status: 500, error: 'Falhou ao registrar a cortesia.' }
  }

  const after = before + v.value.credits
  let upd = admin.from('profiles').update({ plan: v.value.level, video_credits: after }).eq('id', prof.id)
  upd = prof.plan == null ? upd.is('plan', null) : upd.eq('plan', prof.plan)
  upd = prof.video_credits == null ? upd.is('video_credits', null) : upd.eq('video_credits', prof.video_credits)
  const { data: changed, error: uErr } = await upd.select('id').maybeSingle()
  if (uErr || !changed?.id) {
    await admin.from('courtesy_grants').update({ status: 'revoked', ended_at: new Date(nowMs).toISOString() }).eq('id', grant.id)
    return { ok: false, status: 409, error: 'A conta mudou enquanto a cortesia era concedida. Nada foi dado — tente de novo.' }
  }

  await admin.from('events').insert({
    user_id: prof.id,
    name: 'admin_courtesy_granted',
    metadata: {
      grant_id: grant.id,
      level: v.value.level,
      credits: v.value.credits,
      days: v.value.days,
      ends_at: endsAt,
      previous_plan: prof.plan ?? null,
      before,
      after,
      reason: v.value.reason,
      granted_by: input.grantedBy,
      source: input.source,
    },
  }).then(() => undefined, () => undefined)

  return { ok: true, grantId: grant.id as string, userId: prof.id, level: v.value.level, endsAt, before, after }
}

/** Soma créditos a uma cortesia ATIVA (etapa 2 do pacote do parceiro). Mesmo CAS no saldo. */
export async function addCourtesyCredits(
  admin: SupabaseClient,
  input: { grantId: string; credits: number; reason: string; grantedBy: string },
): Promise<{ ok: true; before: number; after: number } | { ok: false; status: number; error: string }> {
  if (!Number.isInteger(input.credits) || input.credits < 1 || input.credits > COURTESY_MAX_CREDITS) {
    return { ok: false, status: 400, error: 'Quantidade inválida.' }
  }
  const { data: g, error: gErr } = await admin.from('courtesy_grants').select(GRANT_COLUMNS).eq('id', input.grantId).maybeSingle()
  if (gErr || !g) return { ok: false, status: 404, error: 'Cortesia não encontrada.' }
  const grant = g as CourtesyGrantRow
  // 410 = cortesia encerrada pelo cron (expired/superseded/revoked): quem chama decide se abre outra. Cortesia ainda
  // 'active' com o prazo passado (cron não rodou) recebe o crédito — o vencimento dela continua com o cron.
  if (grant.status !== 'active') return { ok: false, status: 410, error: 'A cortesia não está mais ativa.' }
  const { data: p } = await admin.from('profiles').select('id, plan, video_credits').eq('id', grant.user_id).maybeSingle()
  const prof = p as CourtesyProfile | null
  if (!prof) return { ok: false, status: 404, error: 'Conta não encontrada.' }
  const before = typeof prof.video_credits === 'number' ? prof.video_credits : 0
  const after = before + input.credits
  let upd = admin.from('profiles').update({ video_credits: after }).eq('id', prof.id)
  upd = prof.video_credits == null ? upd.is('video_credits', null) : upd.eq('video_credits', prof.video_credits)
  const { data: changed, error: uErr } = await upd.select('id').maybeSingle()
  if (uErr || !changed?.id) return { ok: false, status: 409, error: 'O saldo mudou agora. Tente de novo.' }
  await admin.from('courtesy_grants').update({ credits_granted: (grant.credits_granted ?? 0) + input.credits }).eq('id', grant.id)
  await admin.from('events').insert({
    user_id: prof.id,
    name: 'admin_courtesy_granted',
    metadata: { grant_id: grant.id, level: grant.level, credits: input.credits, before, after, reason: input.reason, granted_by: input.grantedBy, top_up: true },
  }).then(() => undefined, () => undefined)
  return { ok: true, before, after }
}

export type CourtesyExpiryRow = { grant_id: string; user_id: string; action: string; plan?: string; credits_removed?: number; applied: boolean; error?: string }

/** Vence as cortesias com prazo passado. `apply=false` (padrão do cron) só lista o que faria. */
export async function expireCourtesies(
  admin: SupabaseClient,
  opts: { apply: boolean; limit: number; nowMs?: number; rule?: CourtesyLeftoverRule },
): Promise<{ due: number; rows: CourtesyExpiryRow[] }> {
  const nowMs = opts.nowMs ?? Date.now()
  const rule = opts.rule ?? COURTESY_LEFTOVER_RULE
  const { data, error } = await admin
    .from('courtesy_grants')
    .select(GRANT_COLUMNS)
    .eq('status', 'active')
    .lte('ends_at', new Date(nowMs).toISOString())
    .order('ends_at', { ascending: true })
    .limit(opts.limit)
  if (error) throw new Error('courtesy_grants indisponível')
  const rows: CourtesyExpiryRow[] = []
  for (const grant of (data ?? []) as CourtesyGrantRow[]) {
    const { data: p } = await admin.from('profiles').select('id, plan, video_credits, has_paid').eq('id', grant.user_id).maybeSingle()
    if (!p) { rows.push({ grant_id: grant.id, user_id: grant.user_id, action: 'missing_profile', applied: false }); continue }
    const prof = p as CourtesyProfile
    const plan = planCourtesyExpiry(grant, prof, nowMs, rule)
    if (plan.action === 'wait') continue
    const endedAt = new Date(nowMs).toISOString()
    if (plan.action === 'supersede') {
      if (opts.apply) await admin.from('courtesy_grants').update({ status: 'superseded', ended_at: endedAt }).eq('id', grant.id).eq('status', 'active')
      rows.push({ grant_id: grant.id, user_id: grant.user_id, action: 'supersede', applied: opts.apply })
      continue
    }
    if (!opts.apply) {
      rows.push({ grant_id: grant.id, user_id: grant.user_id, action: 'revert', plan: plan.plan, credits_removed: plan.creditsRemoved, applied: false })
      continue
    }
    let upd = admin.from('profiles').update({ plan: plan.plan, video_credits: plan.balanceAfter }).eq('id', prof.id).eq('plan', grant.level)
    upd = prof.video_credits == null ? upd.is('video_credits', null) : upd.eq('video_credits', prof.video_credits)
    const { data: changed, error: uErr } = await upd.select('id').maybeSingle()
    if (uErr || !changed?.id) {
      rows.push({ grant_id: grant.id, user_id: grant.user_id, action: 'revert', applied: false, error: 'cas_lost_retry_next_run' })
      continue
    }
    await admin.from('courtesy_grants').update({ status: 'expired', ended_at: endedAt, credits_removed: plan.creditsRemoved }).eq('id', grant.id)
    await admin.from('events').insert({
      user_id: prof.id,
      name: 'admin_courtesy_expired',
      metadata: { grant_id: grant.id, level: grant.level, plan_after: plan.plan, credits_removed: plan.creditsRemoved, rule, became_paying: plan.becamePaying },
    }).then(() => undefined, () => undefined)
    rows.push({ grant_id: grant.id, user_id: grant.user_id, action: 'revert', plan: plan.plan, credits_removed: plan.creditsRemoved, applied: true })
  }
  return { due: rows.length, rows }
}

/** Cortesias ativas (para o placar do admin mascarar o plano). Falha = lista vazia: o painel nunca cai por isto. */
export async function loadActiveCourtesyGrants(admin: SupabaseClient): Promise<Array<Pick<CourtesyGrantRow, 'user_id' | 'level' | 'previous_plan' | 'ends_at'>>> {
  try {
    const { data, error } = await admin.from('courtesy_grants').select('user_id, level, previous_plan, ends_at').eq('status', 'active').limit(1000)
    if (error || !Array.isArray(data)) return []
    return data as Array<Pick<CourtesyGrantRow, 'user_id' | 'level' | 'previous_plan' | 'ends_at'>>
  } catch {
    return []
  }
}
