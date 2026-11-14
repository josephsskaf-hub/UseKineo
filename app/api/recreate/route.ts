import { NextRequest, NextResponse } from 'next/server'
import { clipsAdmin, engineAccessFor, loadClipAccount } from '@/lib/clips/clipServer'
import { submitClip } from '@/lib/clips/clipFlow'
import { clipEffectByKey, resolveClipEffectRequest } from '@/lib/clips/clipEffects'
import { isPayingPlan } from '@/app/api/admin/_shared/mrr'
import { recreateFormat, recreateCreditsFor, recreateSwapPriced, RECREATE_UNPRICED_ERROR } from '@/lib/recreate/formats' // KINEO-RECREATE-MOVIMENTO-1411 — era: recreateEffectCredits
import { MOVIMENTO_CENA_MODEL, MOVIMENTO_EVENTOS, MOVIMENTO_VIDEO_MODEL, movimentoEntradaDaCena, movimentoEntradaDoVideo, movimentoFalUsd, planMovimento } from '@/lib/recreate/movimento' // KINEO-RECREATE-MOVIMENTO-1411
import { lerDescricaoDaPessoa } from '@/lib/recreate/descricaoDaPessoa' // KINEO-RECREATE-MOVIMENTO-1411
import { planRecreate } from '@/lib/recreate/generation'
import { recreateEngineAccess, recreateSession, recreateSubmitDeps, RECREATE_HEADERS } from '@/lib/recreate/server'
import { writeServerEvent } from '@/lib/serverEvents'
import { recreateFormatVisible, releaseVisible, visibleRecreateFormats } from '@/lib/recreate/access'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const maxDuration = 60
export const runtime = 'nodejs'
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: RECREATE_HEADERS })

export async function GET() {
  const { supabase, user } = await recreateSession()
  if (!user) return json({ error: 'Not found.' }, 404)
  const admin = clipsAdmin()
  const account = await loadClipAccount(supabase, user)
  if (!admin || !account) return json({ error: 'Could not load your account. Please retry.' }, 503)
  const access = engineAccessFor(account)
  // KINEO-RECREATE-TRAVA-1011 — only formats this account may request (unapproved swaps: house allowlist only).
  return json({ catalog: visibleRecreateFormats(user.email).map(f => {
    const credits = recreateCreditsFor(f) // KINEO-RECREATE-MOVIMENTO-1411 — era: f.type === 'swap' ? recreateCreditCost(f.seconds) : recreateEffectCredits(f)
    // KINEO-RECREATE-MOVIMENTO-1411 — o movimento não depende do motor do clipe comum (tarifa própria do Recreate): disponível com tarifa.
    return { id: f.id, credits, shortfall: credits === null ? 0 : Math.max(0, credits - account.balance), available: credits !== null && (f.type === 'swap' ? recreateEngineAccess().ok : f.type === 'motion' ? true : access(clipEffectByKey(f.effectKey)!.engine).ok) }
  }) })
}

export async function POST(req: NextRequest) {
  const { supabase, user } = await recreateSession()
  if (!user) return json({ error: 'Not found.' }, 404)
  if (req.headers.get('origin') && req.headers.get('origin') !== req.nextUrl.origin) return json({ error: 'Invalid origin.' }, 403)
  let raw: Record<string, unknown>
  try { raw = await req.json() } catch { return json({ error: 'Invalid request.' }, 400) }
  const format = recreateFormat(raw.format)
  if (!format) return json({ error: 'Choose a format from the catalog.' }, 400)
  // KINEO-RECREATE-TRAVA-1011 — an unapproved swap does not exist for this account: refused before photos, moderation, debit or provider.
  if (!recreateFormatVisible(format, user.email)) return json({ error: 'Not found.' }, 404)
  if (!recreateSwapPriced(format)) return json({ error: RECREATE_UNPRICED_ERROR, code: 'unpriced' }, 409)
  if (raw.mode && raw.mode !== 'swap') return json({ error: 'This mode is unavailable.' }, 400)
  // Simulation exits before profile reads, moderation, writes, debits, uploads or provider calls.
  if (raw.simulate === true) {
    if (!releaseVisible(user.email, 'internal')) return json({ error: 'Not found.' }, 404)
    // KINEO-RECREATE-MOVIMENTO-1411 — no movimento, a simulação (só a casa) devolve também as DUAS entradas que iriam à fal e o custo, sem chamar ninguém.
    const passos = format.type === 'motion' ? [
      { model: MOVIMENTO_CENA_MODEL, input: movimentoEntradaDaCena(format, '<your photo>', '<hair, beard and glasses read from your photo>') },
      { model: MOVIMENTO_VIDEO_MODEL, input: movimentoEntradaDoVideo(format, '<the scene from step 1>', '<the template guide in our bucket>') },
    ] : undefined
    return json({ simulation: true, format: format.title, seconds: format.seconds, photos: format.photoSlots, credits: recreateCreditsFor(format), mode: format.type === 'swap' ? 'Face swap' : format.type === 'motion' ? 'Motion' : 'Photo effect', charged: false, ...(passos ? { steps: passos, fal_usd: movimentoFalUsd(format.seconds) } : {}) }) // KINEO-RECREATE-MOVIMENTO-1411 — era: credits por bifurcação e mode sem 'Motion'
  }
  if (raw.consent !== true) return json({ error: 'Confirm you have permission to use these photos.' }, 400)
  const admin = clipsAdmin()
  const account = await loadClipAccount(supabase, user)
  if (!admin || !account) return json({ error: 'Could not start your clip. Nothing was charged.' }, 503)
  const key = req.headers.get('idempotency-key')?.trim() ?? ''
  const deps = recreateSubmitDeps(admin, supabase, account, format)
  try {
    let body
    let recreatePlan
    if (format.type === 'motion') {
      // KINEO-RECREATE-MOVIMENTO-1411 — o plano é conferido ANTES de qualquer custo (molde, consentimento, duração, posse da foto); a foto só é lida
      // (cabelo, barba, óculos; ~US$ 0,005) por quem tem saldo para o pedido. Leitura que falha segue sem a descrição e fica no evento.
      const ctx = { userId: user.id, supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '', paying: isPayingPlan(account.plan) }
      const conferido = planMovimento(raw, ctx, null)
      if (!conferido.ok) return json({ error: conferido.error }, conferido.status)
      let descricao: string | null = null
      if (account.balance >= conferido.plan.credits) {
        const lida = await lerDescricaoDaPessoa(conferido.plan.photos[0])
        descricao = lida.ok ? lida.texto : null
        await writeServerEvent({ name: MOVIMENTO_EVENTOS.descricao, userId: user.id, path: '/api/recreate', metadata: { format: format.id, ok: lida.ok, ...(lida.ok ? { usd: lida.usd } : { why: lida.why }) } }).catch(() => false)
      }
      const resolved = planMovimento(raw, ctx, descricao)
      if (!resolved.ok) return json({ error: resolved.error }, resolved.status)
      body = resolved.plan.body
      recreatePlan = resolved.plan
    } else if (format.type === 'swap') {
      const resolved = planRecreate(raw, { userId: user.id, supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '', paying: isPayingPlan(account.plan) })
      if (!resolved.ok) return json({ error: resolved.error }, resolved.status)
      body = resolved.plan.body
      recreatePlan = resolved.plan
    } else {
      // Existing effect engine, fixed prompt, duration and tariff; pair composition uses the existing browser recipe.
      const resolved = resolveClipEffectRequest(format.effectKey, { visible: true, imageUrl: raw.image_url })
      if (!resolved.ok) return json({ error: resolved.error }, resolved.status)
      body = resolved.body
    }
    const result = await submitClip(deps, { userId: user.id, idempotencyKey: key, body, recreatePlan })
    if (!result.ok) {
      if (result.code === 'credits' || result.code === 'debit_failed') {
        const credits = recreatePlan?.credits ?? recreateCreditsFor(format) // KINEO-RECREATE-MOVIMENTO-1411 — era: recreateEffectCredits(format)
        const balance = result.balance ?? (await loadClipAccount(supabase, user))?.balance
        if (credits !== null && balance !== undefined && credits > balance) {
          const shortfall = credits - balance
          return json({ error: `You need ${shortfall} more credits.`, code: 'credits', shortfall, plans: '/pricing' }, result.status)
        }
      }
      return json({ error: result.code === 'idempotency_conflict' ? 'This request is already reserved. Check your clips before trying again.' : 'Could not start this clip. Check your photos, plan and balance, then retry.', code: result.code }, result.status)
    }
    if (!result.replay) await writeServerEvent({ name: 'recreate_started', userId: user.id, path: '/api/recreate', metadata: { format: format.id, clip_id: result.clip.id, seconds: result.clip.seconds, credits: result.clip.credits } }).catch(() => false)
    return json({ clip: { id: result.clip.id, status: result.clip.status }, replay: result.replay }, result.status)
  } catch {
    return json({ error: 'Could not confirm this request. Keep this page open and retry with the same request key.' }, 503)
  }
}
