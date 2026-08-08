// KINEO-USER-FOOTAGE-2026-07-10 — "My footage" API (Prioridade 2).
// GET    → the user's footage library
// POST   → { action:'upload-url', contentType, sizeBytes } → signed upload URL
//          (plan-gated + 500MB total quota, enforced SERVER-side — never
//          localStorage, the thumbnail-limit lesson)
//        → { action:'confirm', path, kind, sizeBytes } → row insert after the
//          browser PUTs the file straight to storage
// DELETE → ?id= removes row + storage object
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  ensureFootageBucket,
  footageAdminClient,
  FOOTAGE_PUBLIC_PREFIX,
  FOOTAGE_QUOTA_PAID,
  listUserFootage,
  totalFootageBytes,
  USER_FOOTAGE_BUCKET,
} from '@/lib/userFootage'
// KINEO-TRIAL-FEATURE-GATES-2026-08-07 — ver o bloco do gate no POST.
import { getEffectiveEntitlement, TRIAL_ENTITLEMENT_COLUMNS, type EffectiveEntitlement } from '@/lib/reverseTrial'
// KINEO-BUGHUNT-FILA-2026-08-08 — telemetria da RECUSA (ver logFootageRefusal).
import { writeServerEvent } from '@/lib/serverEvents'

export const dynamic = 'force-dynamic'

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
  // KINEO-OWN-VOICE — user voiceover uploads (P3 Level A).
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
}

const PAID_PLANS = new Set(['starter', 'starter_trial', 'basic', 'basic_trial', 'pro', 'pro_trial'])

// ═══ KINEO-BUGHUNT-FILA-2026-08-08 — A RECUSA PASSA A SER MEDIDA ═══════════
//
// Item #4 de docs/BUGHUNT-2026-08-08.md: esta rota devolveu 402 vinte e seis
// vezes na janela de 7 dias ("Uploading your own footage is a paid feature") e
// escreveu ZERO eventos. O irmão dela, /api/compose, já emite `compose_refused`
// desde 05/08 (24 eventos / 12 pessoas) — e foi exatamente esse evento que
// virou a fonte primária de duas coortes de e-mail (send-cap-hit,
// send-post-nudge). A diferença entre as duas rotas nunca foi de importância:
// foi só de instrumento.
//
// Sem isto não se sabe QUEM levou "não" aqui, nem se levou por não ter plano,
// por estourar a cota de 500MB ou por mandar um formato que a rota não aceita —
// e quem tenta subir o próprio material é, por definição, um usuário engajado.
//
// `tier` responde "o que esta conta PODE usar", NÃO "o que ela comprou": sem
// ele, um trial (que TEM direito a footage — ver o bloco do gate) e um free
// ficariam indistinguíveis no evento, e a próxima pessoa a ler estes números
// concluiria a coisa errada sobre a mesma linha do funil.
//
// Best-effort, igual ao precedente: `writeServerEvent` nunca lança e nunca
// muda o corpo nem o status da resposta. Uma falha de telemetria não pode
// virar uma falha de produto.
function footageTier(
  profile: { plan?: unknown; has_paid?: unknown } | null,
  ent: EffectiveEntitlement,
): string {
  const plan = (profile?.plan ?? '').toString()
  if (plan === 'pro' || plan === 'pro_trial') return 'studio'
  if (plan === 'basic' || plan === 'basic_trial') return 'creator'
  if (plan === 'starter' || plan === 'starter_trial') return 'starter'
  if (ent.isTrial) return 'trial'
  if (profile?.has_paid === true) return 'paid_credits'
  return 'free'
}

async function logFootageRefusal(
  reason: string,
  userId: string | null,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  if (!userId) return
  await writeServerEvent({
    name: 'footage_refused',
    userId,
    path: '/api/footage',
    metadata: { reason, ...metadata },
  })
}

export async function GET() {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 })
    const items = await listUserFootage(user.id)
    const used = items.reduce((s, i) => s + (i.size_bytes || 0), 0)
    return NextResponse.json({ items, used_bytes: used, quota_bytes: FOOTAGE_QUOTA_PAID })
  } catch (err) {
    console.error('[footage] GET failed:', err instanceof Error ? err.message : String(err))
    return NextResponse.json({ error: 'Could not load your footage.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 })

    let body: { action?: string; contentType?: string; sizeBytes?: number; path?: string; kind?: string }
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
    }

    // Plan gate — footage próprio é feature paga (free vê o cadeado).
    //
    // [KINEO-TRIAL-FEATURE-GATES-2026-08-07] Duas coisas mudam aqui, e nenhuma
    // delas altera o comportamento com a flag OFF:
    //
    //   1. O predicado de pagante continua sendo o LOCAL (`PAID_PLANS` abaixo),
    //      passado explicitamente a `getEffectiveEntitlement` — invariante 1 de
    //      lib/reverseTrial.ts. Com KINEO_REVERSE_TRIAL_ENABLED OFF,
    //      `isTrialActive()` é sempre false, logo `treatAsPaid === isPaid` e o
    //      diff de runtime é ZERO, por construção.
    //   2. Com a flag ON, quem está em trial passa. A promessa vendida no
    //      signup é "direitos de Creator, exceto os motores Studio" — e upload
    //      de footage é feature de Starter pra cima (ver `PAID_PLANS` acima),
    //      logo está dentro do trial. Sem esta linha o trial cobra 40 créditos
    //      e devolve 402 numa feature prometida, que é o mesmo defeito que o QA
    //      de 07/08 já pegou duas vezes (compose e cinematic): o entitlement do
    //      trial existia em UM arquivo só.
    //
    // `TRIAL_ENTITLEMENT_COLUMNS` é constante justamente porque esquecer uma
    // coluna falha em SILÊNCIO e do lado caro (sem `trial_ends_at` o relógio
    // conta como vencido).
    //
    // ⚠️ O `error` do SELECT é lido, e não descartado como antes. O motivo é
    // que a invariante "diff zero com a flag OFF" passou a depender de uma
    // MIGRAÇÃO de schema que a flag não controla: num ambiente sem as colunas
    // de trial o PostgREST devolve 42703, `data` vem null, e o gate negaria
    // 402 para TODO usuário, pagante inclusive. Falhar em silêncio do lado caro
    // é exatamente o modo de falha que esta rota não pode ter. Mesmo 503 do
    // precedente em app/api/compose/route.ts.
    //
    // `PGRST116` (0 linhas) é EXCLUÍDO do 503 de propósito: perfil inexistente
    // sempre caiu no 402 aqui, e transformá-lo em 503 seria mudança de
    // comportamento com a flag OFF — justamente o que este diff promete não
    // fazer. O 503 cobre só a falha de LEITURA (coluna/permissão/rede).
    const { data: profile, error: profileAccessError } = await supabase
      .from('profiles')
      .select(`has_paid, plan, ${TRIAL_ENTITLEMENT_COLUMNS}`)
      .eq('id', user.id)
      .single()
    if (profileAccessError && profileAccessError.code !== 'PGRST116') {
      console.error('[footage] entitlement lookup failed:', profileAccessError.message)
      await logFootageRefusal('entitlement_unverified', user.id, {
        action: (body.action ?? '').toString(),
        tier: 'unknown',
        code: profileAccessError.code ?? null,
      })
      return NextResponse.json(
        { error: 'Your plan could not be verified. Nothing was uploaded. Please retry.' },
        { status: 503 },
      )
    }
    const isPaid = profile?.has_paid === true || PAID_PLANS.has((profile?.plan ?? '').toString())
    const entitlement = getEffectiveEntitlement(profile, { isPaidAccount: isPaid })
    const tier = footageTier(profile, entitlement)
    if (!entitlement.treatAsPaid) {
      // A recusa que o item #4 mediu 26 vezes sem uma única linha de telemetria.
      await logFootageRefusal('paid_feature', user.id, {
        action: (body.action ?? '').toString(),
        tier,
        size_bytes: Math.max(0, Number(body.sizeBytes) || 0),
        content_type: (body.contentType ?? '').toString().slice(0, 40),
      })
      return NextResponse.json(
        {
          error: 'Uploading your own footage is a paid feature — use YOUR clips and photos in every video. Upgrade to unlock it.',
          upsell: 'credits',
          upgrade: '/pricing',
        },
        { status: 402 },
      )
    }

    if (body.action === 'upload-url') {
      const contentType = (body.contentType ?? '').toString()
      const ext = EXT_BY_MIME[contentType]
      if (!ext) {
        await logFootageRefusal('unsupported_type', user.id, { tier, content_type: contentType.slice(0, 40) })
        return NextResponse.json({ error: 'Use JPG, PNG, MP4, MOV or WebM files.' }, { status: 400 })
      }
      const sizeBytes = Math.max(0, Number(body.sizeBytes) || 0)
      if (sizeBytes > 50 * 1024 * 1024) {
        await logFootageRefusal('file_too_large', user.id, { tier, size_bytes: sizeBytes })
        return NextResponse.json({ error: 'Each file must be under 50 MB.' }, { status: 400 })
      }
      const used = await totalFootageBytes(user.id)
      if (used + sizeBytes > FOOTAGE_QUOTA_PAID) {
        const leftMb = Math.max(0, Math.floor((FOOTAGE_QUOTA_PAID - used) / (1024 * 1024)))
        // Recusa de quem JÁ PAGA e encheu os 500MB — a única desta rota que é
        // pedido de mais produto, não de upgrade. Sem separá-la por `reason`,
        // ela se somaria à do paywall e inflaria o número que mede o funil.
        await logFootageRefusal('quota_exceeded', user.id, {
          tier,
          size_bytes: sizeBytes,
          used_bytes: used,
          quota_bytes: FOOTAGE_QUOTA_PAID,
        })
        return NextResponse.json(
          { error: `You have ${leftMb} MB left of your 500 MB footage storage — delete something to upload more.` },
          { status: 409 },
        )
      }

      const admin = footageAdminClient()
      await ensureFootageBucket(admin)
      const path = `${user.id}/clip-${Date.now()}.${ext}`
      const { data, error } = await admin.storage.from(USER_FOOTAGE_BUCKET).createSignedUploadUrl(path)
      if (error || !data) {
        console.error('[footage] signed url failed:', error?.message)
        await logFootageRefusal('signed_url_failed', user.id, { tier, size_bytes: sizeBytes })
        return NextResponse.json({ error: 'Could not start the upload. Please try again.' }, { status: 502 })
      }
      return NextResponse.json({
        path,
        token: data.token,
        signedUrl: data.signedUrl,
        publicUrl: `${FOOTAGE_PUBLIC_PREFIX()}${path}`,
        kind: contentType.startsWith('video/') ? 'video' : contentType.startsWith('audio/') ? 'audio' : 'image',
      })
    }

    if (body.action === 'confirm') {
      const path = (body.path ?? '').toString()
      // Path must be inside THIS user's folder (no cross-user confirms).
      if (!path.startsWith(`${user.id}/`)) {
        return NextResponse.json({ error: 'Invalid upload path.' }, { status: 400 })
      }
      const kind = body.kind === 'image' ? 'image' : body.kind === 'audio' ? 'audio' : 'video'
      const sizeBytes = Math.max(0, Number(body.sizeBytes) || 0)
      const url = `${FOOTAGE_PUBLIC_PREFIX()}${path}`
      const admin = footageAdminClient()
      const { data, error } = await admin
        .from('user_footage')
        .insert({ user_id: user.id, url, kind, size_bytes: sizeBytes })
        .select('id, url, kind, size_bytes, created_at')
        .single()
      if (error || !data) {
        console.error('[footage] confirm insert failed:', error?.message)
        // Mesma classe do defeito #1 desta caçada (objeto no Storage sem linha
        // no índice), com uma diferença: aqui o arquivo já é do usuário e apagá-lo
        // seria destruir o upload dele. Fica medido, não apagado.
        await logFootageRefusal('confirm_insert_failed', user.id, { tier, kind, size_bytes: sizeBytes })
        return NextResponse.json({ error: 'Could not register the upload.' }, { status: 500 })
      }
      console.log(`[footage] confirmed user=${user.id.slice(0, 8)} kind=${kind} bytes=${sizeBytes}`)
      return NextResponse.json({ item: data })
    }

    return NextResponse.json({ error: 'Unknown action.' }, { status: 400 })
  } catch (err) {
    console.error('[footage] POST failed:', err instanceof Error ? err.message : String(err))
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 })
    const id = (req.nextUrl.searchParams.get('id') ?? '').trim()
    if (!id) return NextResponse.json({ error: 'id is required.' }, { status: 400 })

    const admin = footageAdminClient()
    const { data: row } = await admin
      .from('user_footage')
      .select('url')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()
    if (row?.url) {
      const prefix = FOOTAGE_PUBLIC_PREFIX()
      const objectPath = (row.url as string).startsWith(prefix) ? (row.url as string).slice(prefix.length) : null
      if (objectPath) {
        const { error: rmErr } = await admin.storage.from(USER_FOOTAGE_BUCKET).remove([objectPath])
        if (rmErr) console.warn('[footage] storage remove failed (row still deleted):', rmErr.message)
      }
    }
    const { error } = await admin.from('user_footage').delete().eq('id', id).eq('user_id', user.id)
    if (error) return NextResponse.json({ error: 'Could not delete.' }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[footage] DELETE failed:', err instanceof Error ? err.message : String(err))
    return NextResponse.json({ error: 'Could not delete.' }, { status: 500 })
  }
}
