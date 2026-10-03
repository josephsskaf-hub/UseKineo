// KINEO-PARTNERS-PACOTE-2026-10-03 — escritas do pacote de demonstração do parceiro. Regra em lib/partnerPack.ts;
// os créditos e o plano chegam SEMPRE pela cortesia (lib/courtesyStore.ts), nunca por um caminho próprio — assim o
// pacote herda as travas (só *_trial, só conta sem plano, fim do prazo, fora do MRR).
// Sem import de runtime além das libs da casa: o guardião executa este arquivo com um banco em memória.
import type { SupabaseClient } from '@supabase/supabase-js'
import { addCourtesyCredits, grantCourtesy } from '@/lib/courtesyStore'
import {
  canApprovePartnerPost,
  canSubmitPartnerPost,
  normalizePartnerPostUrl,
  partnerPackEligibility,
  PARTNER_PACK_DAYS,
  PARTNER_PACK_LEVEL,
  PARTNER_PACK_STAGE1_CREDITS,
  PARTNER_PACK_STAGE1_REASON,
  PARTNER_PACK_STAGE2_CREDITS,
  PARTNER_PACK_STAGE2_REASON,
  type PartnerPackRow,
} from '@/lib/partnerPack'

const PACK_COLUMNS = 'id, affiliate_id, user_id, courtesy_grant_id, stage1_at, post_url, post_status, post_submitted_at, post_reviewed_at, stage2_at'

type Fail = { ok: false; status: number; error: string }

async function event(admin: SupabaseClient, userId: string, name: string, metadata: Record<string, unknown>) {
  await admin.from('events').insert({ user_id: userId, name, metadata }).then(() => undefined, () => undefined)
}

/** Etapa 1: 25 créditos em creator_trial por 30 dias, via cortesia. 1 por afiliado. */
export async function grantPartnerPackStage1(
  admin: SupabaseClient,
  input: { affiliateId: string; grantedBy: string; nowMs?: number },
): Promise<{ ok: true; packId: string; grantId: string } | Fail> {
  const nowMs = input.nowMs ?? Date.now()
  const { data: aff } = await admin.from('affiliates').select('id, user_id, status').eq('id', input.affiliateId).maybeSingle()
  if (!aff?.id || !aff.user_id) return { ok: false, status: 404, error: 'Afiliado não encontrado.' }
  const { data: existing, error: exErr } = await admin.from('partner_packs').select('id').eq('affiliate_id', aff.id).maybeSingle()
  if (exErr) return { ok: false, status: 503, error: 'Tabela partner_packs indisponível (migration 20261003121000 aplicada?).' }
  const { data: prof } = await admin.from('profiles').select('id, plan').eq('id', aff.user_id).maybeSingle()
  const elig = partnerPackEligibility({ affiliateStatus: aff.status as string, plan: (prof?.plan as string | null) ?? null, existingPack: Boolean(existing?.id) })
  if (!elig.ok) return { ok: false, status: 409, error: elig.reason }

  const { data: pack, error: pErr } = await admin
    .from('partner_packs')
    .insert({ affiliate_id: aff.id, user_id: aff.user_id, post_status: 'none', granted_by: input.grantedBy })
    .select('id')
    .maybeSingle()
  if (pErr || !pack?.id) return pErr?.code === '23505' ? { ok: false, status: 409, error: 'already_has_pack' } : { ok: false, status: 500, error: 'Falhou ao registrar o pacote.' }

  const g = await grantCourtesy(admin, {
    userId: aff.user_id as string,
    level: PARTNER_PACK_LEVEL,
    credits: PARTNER_PACK_STAGE1_CREDITS,
    days: PARTNER_PACK_DAYS,
    reason: PARTNER_PACK_STAGE1_REASON,
    grantedBy: input.grantedBy,
    source: 'partner_pack',
    nowMs,
  })
  if (!g.ok) {
    // Nada foi dado: o pacote não pode ficar "gasto" sem crédito — some a linha para poder tentar de novo.
    await admin.from('partner_packs').delete().eq('id', pack.id)
    return { ok: false, status: g.status, error: g.error }
  }
  await admin.from('partner_packs').update({ courtesy_grant_id: g.grantId, stage1_at: new Date(nowMs).toISOString() }).eq('id', pack.id)
  await event(admin, aff.user_id as string, 'partner_pack_stage1_granted', { pack_id: pack.id, grant_id: g.grantId, credits: PARTNER_PACK_STAGE1_CREDITS, days: PARTNER_PACK_DAYS, granted_by: input.grantedBy })
  return { ok: true, packId: pack.id as string, grantId: g.grantId }
}

/** O parceiro registra o link do post público (o admin confere depois). */
export async function submitPartnerPost(
  admin: SupabaseClient,
  input: { userId: string; url: unknown; nowMs?: number },
): Promise<{ ok: true; url: string } | Fail> {
  const url = normalizePartnerPostUrl(input.url)
  if (!url) return { ok: false, status: 400, error: 'Paste the https link of one public post that shows your Kineo link or coupon.' }
  const { data: aff } = await admin.from('affiliates').select('id').eq('user_id', input.userId).maybeSingle()
  if (!aff?.id) return { ok: false, status: 404, error: 'Not an affiliate.' }
  const { data: pack, error } = await admin.from('partner_packs').select(PACK_COLUMNS).eq('affiliate_id', aff.id).maybeSingle()
  if (error) return { ok: false, status: 503, error: 'Demo pack unavailable right now.' }
  if (!canSubmitPartnerPost((pack as PartnerPackRow | null) ?? null)) return { ok: false, status: 409, error: 'There is no demo pack waiting for a post on this account.' }
  const nowIso = new Date((input.nowMs ?? Date.now())).toISOString()
  await admin.from('partner_packs').update({ post_url: url, post_status: 'pending', post_submitted_at: nowIso, post_reviewed_at: null }).eq('id', (pack as PartnerPackRow).id)
  await event(admin, input.userId, 'partner_post_submitted', { pack_id: (pack as PartnerPackRow).id })
  return { ok: true, url }
}

/** Admin aprova (etapa 2: +25 créditos) ou recusa o post. Um clique, nada automático. */
export async function reviewPartnerPost(
  admin: SupabaseClient,
  input: { packId: string; approve: boolean; reviewer: string; nowMs?: number },
): Promise<{ ok: true; stage2: boolean } | Fail> {
  const nowMs = input.nowMs ?? Date.now()
  const nowIso = new Date(nowMs).toISOString()
  const { data: p } = await admin.from('partner_packs').select(PACK_COLUMNS).eq('id', input.packId).maybeSingle()
  const pack = (p as PartnerPackRow | null) ?? null
  if (!canApprovePartnerPost(pack)) return { ok: false, status: 409, error: 'Nada pendente para revisar neste pacote.' }
  if (!input.approve) {
    await admin.from('partner_packs').update({ post_status: 'rejected', post_reviewed_at: nowIso, post_reviewed_by: input.reviewer }).eq('id', pack!.id)
    await event(admin, pack!.user_id, 'partner_post_rejected', { pack_id: pack!.id, reviewer: input.reviewer })
    return { ok: true, stage2: false }
  }
  // Trava do clique duplo: só UM aprovador vira o estado pending → approved.
  const { data: won } = await admin
    .from('partner_packs')
    .update({ post_status: 'approved', post_reviewed_at: nowIso, post_reviewed_by: input.reviewer, stage2_at: nowIso })
    .eq('id', pack!.id)
    .eq('post_status', 'pending')
    .is('stage2_at', null)
    .select('id')
    .maybeSingle()
  if (!won?.id) return { ok: false, status: 409, error: 'Já revisado.' }

  let grantId = pack!.courtesy_grant_id
  let added = grantId
    ? await addCourtesyCredits(admin, { grantId, credits: PARTNER_PACK_STAGE2_CREDITS, reason: PARTNER_PACK_STAGE2_REASON, grantedBy: input.reviewer })
    : ({ ok: false, status: 410, error: 'sem cortesia' } as Fail)
  if (!added.ok && (added.status === 410 || added.status === 404)) {
    // A cortesia da etapa 1 já venceu (ou sumiu): a etapa 2 abre uma cortesia nova com o mesmo prazo.
    const g = await grantCourtesy(admin, {
      userId: pack!.user_id, level: PARTNER_PACK_LEVEL, credits: PARTNER_PACK_STAGE2_CREDITS, days: PARTNER_PACK_DAYS,
      reason: PARTNER_PACK_STAGE2_REASON, grantedBy: input.reviewer, source: 'partner_pack', nowMs,
    })
    if (g.ok) { grantId = g.grantId; added = { ok: true, before: g.before, after: g.after } }
    else added = g
  }
  if (!added.ok) {
    await admin.from('partner_packs').update({ post_status: 'pending', post_reviewed_at: null, post_reviewed_by: null, stage2_at: null }).eq('id', pack!.id)
    return { ok: false, status: added.status, error: added.error }
  }
  if (grantId !== pack!.courtesy_grant_id) await admin.from('partner_packs').update({ courtesy_grant_id: grantId }).eq('id', pack!.id)
  await event(admin, pack!.user_id, 'partner_pack_stage2_granted', { pack_id: pack!.id, grant_id: grantId, credits: PARTNER_PACK_STAGE2_CREDITS, reviewer: input.reviewer })
  return { ok: true, stage2: true }
}
