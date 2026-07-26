// KINEO-REVIVE-2026-07-26 — a porta de entrada do batch de outbound.
//
// O QUE ESTA ROTA É: o único jeito de criar/atualizar uma linha em
// `revive_prospects`. O scanner semanal (200 canais/semana) chama POST aqui uma
// vez por canal, depois que os 3 Shorts já foram renderizados e existem em
// `videos`. A resposta devolve a URL final da página.
//
// IDEMPOTÊNCIA É REQUISITO, NÃO CONFORTO: o batch vai ser re-rodado — por erro
// de rede, por retry, por operador. `handle` é UNIQUE (migration 022 §1) e este
// upsert usa onConflict:'handle', então o mesmo canal duas vezes é UPDATE.
// Além disso o UPDATE NUNCA escreve as colunas de outcome
// (page_*/cta_*/converted_*): um re-run do batch não pode zerar a prova de que
// o prospect abriu a página — é a única métrica que a campanha tem.
//
// AUTH: mesmo padrão dual de app/api/admin/send-stalled-rescue/route.ts —
// `Authorization: Bearer ${CRON_SECRET}` para chamada server-to-server, OU
// cookie de admin (ADMIN_EMAILS) para inspeção manual. Sem CRON_SECRET
// configurado o bearer NÃO é honrado, para que um deploy sem env var não vire
// endpoint aberto de escrita.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import {
  REVIVE_BASE_URL,
  daysSinceDate,
  normalizeReviveHandle,
} from '@/app/revive/_lib/reviveProspect'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const ADMIN_EMAILS = new Set([
  'josephsskaf@gmail.com',
  'josephskaf@gmail.com',
  'joseph-test@shortsforgeai.com',
])

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createAdminClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function isAuthorized(req: NextRequest): Promise<boolean> {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && req.headers.get('authorization') === `Bearer ${cronSecret}`) return true
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const email = (user?.email ?? '').toLowerCase()
    return !!user && ADMIN_EMAILS.has(email)
  } catch {
    return false
  }
}

// ── Validação de campo ──────────────────────────────────────────────────────
// Deliberadamente estrita e com mensagem específica: quem chama isto é um
// script rodando 200 vezes por semana sem ninguém olhando. "Bad request" sem
// dizer QUAL campo transforma um typo num prospect silenciosamente perdido.

function asTrimmedString(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null
  const s = v.trim()
  return s ? s.slice(0, max) : null
}

function asNonNegativeInt(v: unknown): number | null | 'invalid' {
  if (v === null || v === undefined || v === '') return null
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n) || n < 0) return 'invalid'
  return Math.round(n)
}

/** Aceita "YYYY-MM-DD" ou qualquer ISO; devolve sempre a DATE em UTC. */
function asDateOnly(v: unknown): string | null | 'invalid' {
  if (v === null || v === undefined || v === '') return null
  if (typeof v !== 'string') return 'invalid'
  const t = Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(v.trim()) ? `${v.trim()}T00:00:00Z` : v.trim())
  if (!Number.isFinite(t)) return 'invalid'
  if (t > Date.now() + 86_400_000) return 'invalid' // upload no futuro = dado sujo
  return new Date(t).toISOString().slice(0, 10)
}

function asHttpUrl(v: unknown): string | null | 'invalid' {
  if (v === null || v === undefined || v === '') return null
  if (typeof v !== 'string') return 'invalid'
  try {
    const u = new URL(v.trim())
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return 'invalid'
    return u.toString()
  } catch {
    return 'invalid'
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = adminClient()
  if (!admin) {
    return NextResponse.json(
      { error: 'Service credentials not configured (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)' },
      { status: 500 },
    )
  }

  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('not an object')
  } catch {
    return NextResponse.json({ error: 'Body must be a JSON object' }, { status: 400 })
  }

  // ── handle ────────────────────────────────────────────────────────────────
  const handle = normalizeReviveHandle(body.handle)
  if (!handle) {
    return NextResponse.json(
      {
        error: 'Invalid `handle`',
        detail:
          'Give the YouTube handle with or without @ (or the full channel URL). After normalising it must match ^[a-z0-9][a-z0-9._-]{1,59}$ — same CHECK the table enforces.',
        received: typeof body.handle === 'string' ? body.handle : null,
      },
      { status: 400 },
    )
  }

  const channelTitle = asTrimmedString(body.channel_title, 200)
  if (!channelTitle) {
    return NextResponse.json(
      { error: 'Missing `channel_title`', detail: 'NOT NULL in the table — the page prints it in the headline.' },
      { status: 400 },
    )
  }

  const channelUrl = asHttpUrl(body.channel_url)
  if (channelUrl === 'invalid') {
    return NextResponse.json({ error: 'Invalid `channel_url` (must be http/https)' }, { status: 400 })
  }
  const subscriberCount = asNonNegativeInt(body.subscriber_count)
  if (subscriberCount === 'invalid') {
    return NextResponse.json({ error: 'Invalid `subscriber_count` (integer >= 0)' }, { status: 400 })
  }
  const lastUploadAt = asDateOnly(body.last_upload_at)
  if (lastUploadAt === 'invalid') {
    return NextResponse.json(
      { error: 'Invalid `last_upload_at` (YYYY-MM-DD, not in the future)' },
      { status: 400 },
    )
  }
  const contactEmail = asTrimmedString(body.contact_email, 200)
  if (contactEmail && !/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(contactEmail)) {
    return NextResponse.json({ error: 'Invalid `contact_email`' }, { status: 400 })
  }

  // days_dormant: se o batch não mandar, derivamos de last_upload_at. É snapshot
  // de auditoria — a PÁGINA recalcula ao vivo, então um valor velho aqui nunca
  // aparece errado para o prospect.
  let daysDormant = asNonNegativeInt(body.days_dormant)
  if (daysDormant === 'invalid') {
    return NextResponse.json({ error: 'Invalid `days_dormant` (integer >= 0)' }, { status: 400 })
  }
  if (daysDormant === null && lastUploadAt) daysDormant = daysSinceDate(lastUploadAt)

  // ── os 3 vídeos ───────────────────────────────────────────────────────────
  // Aceita `video_ids: [...]` (o formato natural do batch) ou os três campos
  // separados. Ordem = ordem de exibição na página.
  const videosSupplied =
    Array.isArray(body.video_ids) ||
    'video_1_id' in body ||
    'video_2_id' in body ||
    'video_3_id' in body
  const rawIds: unknown[] = Array.isArray(body.video_ids)
    ? body.video_ids
    : [body.video_1_id, body.video_2_id, body.video_3_id]

  const videoIds: (string | null)[] = []
  for (const raw of rawIds.slice(0, 3)) {
    if (raw === null || raw === undefined || raw === '') {
      videoIds.push(null)
      continue
    }
    if (typeof raw !== 'string' || !UUID_RE.test(raw.trim())) {
      return NextResponse.json(
        { error: 'Invalid video id', detail: 'Each entry must be a `videos.id` UUID or null.', received: raw },
        { status: 400 },
      )
    }
    videoIds.push(raw.trim().toLowerCase())
  }
  while (videoIds.length < 3) videoIds.push(null)

  const present = videoIds.filter((v): v is string => !!v)
  if (new Set(present).size !== present.length) {
    return NextResponse.json(
      { error: 'Duplicate video id', detail: 'The three slots must be distinct — the table enforces this too.' },
      { status: 400 },
    )
  }

  // PREFLIGHT DOS VÍDEOS. A FK só garante que a linha existe; ela não garante
  // que existe um MP4 tocável. A página filtra slots sem URL, então sem esta
  // checagem o modo de falha é silencioso e caro: a gente manda o email e o
  // prospect abre uma página com um vídeo em vez de três. Falhar aqui é de
  // graça; falhar lá custa o lead.
  if (present.length > 0) {
    const { data: rows, error: vErr } = await admin
      .from('videos')
      .select('id, video_url, final_video_url, status')
      .in('id', present)
    if (vErr) {
      console.error('[revive] video preflight failed:', vErr.message)
      return NextResponse.json({ error: 'Could not verify videos', detail: vErr.message }, { status: 500 })
    }
    const byId = new Map(
      ((rows ?? []) as Array<{ id: string; video_url: string | null; final_video_url: string | null; status: string | null }>).map(
        (r) => [r.id.toLowerCase(), r],
      ),
    )
    const notFound = present.filter((id) => !byId.has(id))
    if (notFound.length > 0) {
      return NextResponse.json(
        { error: 'Unknown video id(s)', detail: 'No row in public.videos with this id.', ids: notFound },
        { status: 400 },
      )
    }
    const notPlayable = present.filter((id) => {
      const r = byId.get(id)!
      return !(r.final_video_url || r.video_url)
    })
    if (notPlayable.length > 0) {
      return NextResponse.json(
        {
          error: 'Video(s) have no playable URL',
          detail: 'Both final_video_url and video_url are null — the render is not finished. Wait and retry.',
          ids: notPlayable,
        },
        { status: 409 },
      )
    }
  }

  // ── upsert ────────────────────────────────────────────────────────────────
  // Nenhuma coluna de outcome no payload — ver o comentário do topo.
  //
  // MONTAGEM PARCIAL, DE PROPÓSITO. O PostgREST deriva o `ON CONFLICT DO UPDATE
  // SET` das CHAVES presentes no JSON: coluna que não está no payload não é
  // tocada no UPDATE. Se a gente sempre mandasse o objeto completo, um re-run
  // que só quisesse corrigir o subscriber_count mandaria video_1..3 = null e
  // APAGARIA os 3 vídeos da página que já está em produção. Então só entra no
  // payload o que o chamador realmente mandou.
  const row: Record<string, unknown> = {
    handle,
    channel_title: channelTitle,
  }
  if ('channel_url' in body || channelUrl) {
    row.channel_url = channelUrl ?? `https://www.youtube.com/@${handle}`
  }
  if ('subscriber_count' in body) row.subscriber_count = subscriberCount
  if ('last_upload_at' in body) row.last_upload_at = lastUploadAt
  if ('days_dormant' in body || daysDormant !== null) row.days_dormant = daysDormant
  if ('niche' in body) {
    row.niche = asTrimmedString(body.niche, 60)?.toLowerCase().replace(/\s+/g, '_') ?? null
  }
  if (videosSupplied) {
    row.video_1_id = videoIds[0]
    row.video_2_id = videoIds[1]
    row.video_3_id = videoIds[2]
  }
  // contact_email e notes são preenchidos à mão com frequência; um re-run do
  // scanner não pode zerá-los por omissão.
  if ('contact_email' in body) row.contact_email = contactEmail
  if ('notes' in body) row.notes = asTrimmedString(body.notes, 2000)

  const { data, error } = await admin
    .from('revive_prospects')
    .upsert(row, { onConflict: 'handle' })
    .select(
      'id, handle, video_1_id, video_2_id, video_3_id, page_view_count, cta_click_count, outreach_sent_at, created_at, updated_at',
    )
    .single()

  if (error) {
    console.error('[revive] upsert failed:', error.message)
    const missingTable = /relation .*revive_prospects.* does not exist/i.test(error.message)
    return NextResponse.json(
      {
        error: 'Upsert failed',
        detail: error.message,
        ...(missingTable
          ? { fix: 'migrations_pending/022_revive.sql has not been applied to Supabase yet.' }
          : {}),
      },
      { status: missingTable ? 503 : 500 },
    )
  }

  const created = !!data && data.created_at === data.updated_at
  // Contado a partir da LINHA GRAVADA, não do payload: num re-run que não mandou
  // vídeos, o payload tem zero e a página tem três. Reportar o payload faria o
  // log do batch mentir.
  const attached = [data?.video_1_id, data?.video_2_id, data?.video_3_id].filter(Boolean).length
  return NextResponse.json({
    ok: true,
    created,
    handle,
    url: `${REVIVE_BASE_URL}/revive/${handle}`,
    videos_attached: attached,
    // Aviso alto: uma página com menos de 3 vídeos ainda renderiza, mas a
    // oferta perde força. Melhor o batch ver isto no log do que o prospect.
    ...(attached < 3 ? { warning: `Only ${attached} of 3 video slots are filled.` } : {}),
    // Ecoado para que o batch possa logar o funil sem uma segunda chamada.
    page_view_count: data?.page_view_count ?? 0,
    cta_click_count: data?.cta_click_count ?? 0,
    outreach_sent_at: data?.outreach_sent_at ?? null,
  })
}

/**
 * GET ?handle=... — inspeção admin. Devolve a linha INTEIRA, colunas internas
 * incluídas (contact_email, notes, funil). Por isso está atrás do mesmo auth do
 * POST: a leitura PÚBLICA da página passa pela função
 * revive_prospect_public(), que tem projeção fixa e nunca mostra nada disto.
 * Sem `handle` devolve as 50 mais recentes — a visão de campanha.
 */
export async function GET(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const admin = adminClient()
  if (!admin) return NextResponse.json({ error: 'Service credentials not configured' }, { status: 500 })

  const raw = req.nextUrl.searchParams.get('handle')
  if (raw) {
    const handle = normalizeReviveHandle(raw)
    if (!handle) return NextResponse.json({ error: 'Invalid `handle`' }, { status: 400 })
    const { data, error } = await admin
      .from('revive_prospects')
      .select('*')
      .eq('handle', handle)
      .maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ error: 'Not found', handle }, { status: 404 })
    return NextResponse.json({ ok: true, prospect: data, url: `${REVIVE_BASE_URL}/revive/${handle}` })
  }

  const { data, error } = await admin
    .from('revive_prospects')
    .select('handle, channel_title, subscriber_count, days_dormant, niche, outreach_sent_at, page_view_count, cta_click_count, converted_at, created_at')
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = data ?? []
  const viewed = rows.filter((r: { page_view_count: number | null }) => (r.page_view_count ?? 0) > 0).length
  const clicked = rows.filter((r: { cta_click_count: number | null }) => (r.cta_click_count ?? 0) > 0).length
  return NextResponse.json({
    ok: true,
    // Funil da amostra devolvida (50 mais recentes), não da campanha inteira.
    funnel: { prospects: rows.length, viewed, clicked },
    prospects: rows,
  })
}
