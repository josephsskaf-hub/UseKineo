// ═══ KINEO-REMIX-PAGINAS-3110 — o 3º degrau do placar do laço viral: a conta NOVA nasceu de um filme compartilhado ═══
//
// O "Make your own version" da /v/<id> leva a campanha do remix + o filme de origem (utm_content) através do cadastro
// até o Studio. Quando a pessoa pousa lá, components/StudioIdeaArrival.tsx chama esta rota UMA vez; quem decide se
// conta é o SERVIDOR, nunca o navegador:
//   · sessão obrigatória (o id vem do cookie, não do corpo);
//   · conta criada há no máximo REMIX_SIGNUP_WINDOW_MIN minutos (quem já tinha conta e clicou no remix não é cadastro);
//   · o filme de origem existe e está PUBLICADO pelo dono (published_at) — id inventado não entra;
//   · uma vez por conta (procura um remix_signup anterior antes de gravar).
// Fica de fora de propósito do /auth/callback (que concede o trial e é conferido byte a byte por guardião antigo):
// esta prova é placar, não pode encostar no login. Nunca gasta crédito, nunca muda perfil.
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { writeServerEvent } from '@/lib/serverEvents'
import { remixSourceVideoId, REMIX_PAGINAS_3110_VERSION, REMIX_SIGNUP_WINDOW_MIN } from '@/lib/remixPaginas3110'

export const dynamic = 'force-dynamic'

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store, private' } })
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin')
  if (origin && origin !== new URL(req.url).origin) return json({ ok: false, error: 'bad_origin' }, 403)
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return json({ ok: false, error: 'unauthorized' }, 401)

    const body = (await req.json().catch(() => ({}))) as { sourceVideoId?: unknown }
    const sourceVideoId = remixSourceVideoId(typeof body.sourceVideoId === 'string' ? body.sourceVideoId : null)
    if (!sourceVideoId) return json({ ok: false, error: 'invalid' }, 400)

    const createdAt = Date.parse(user.created_at ?? '')
    const minutes = Number.isFinite(createdAt) ? (Date.now() - createdAt) / 60_000 : Infinity
    if (!(minutes >= 0 && minutes <= REMIX_SIGNUP_WINDOW_MIN)) return json({ ok: true, counted: false, reason: 'existing_account' })

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) return json({ ok: true, counted: false, reason: 'unavailable' })
    const admin = createAdminClient(url, key, { auth: { persistSession: false } })

    const { data: video } = await admin.from('videos').select('id').eq('id', sourceVideoId).not('published_at', 'is', null).maybeSingle()
    if (!video) return json({ ok: true, counted: false, reason: 'not_public' })

    const { data: previous } = await admin.from('events').select('id').eq('name', 'remix_signup').eq('user_id', user.id).limit(1)
    if (Array.isArray(previous) && previous.length > 0) return json({ ok: true, counted: false, reason: 'already_counted' })

    // AWAIT: escrita no fim da rota é await, nunca void (a Vercel congela a função depois da resposta).
    const stored = await writeServerEvent({
      name: 'remix_signup',
      userId: user.id,
      path: '/api/remix/signup',
      metadata: { source_video_id: sourceVideoId, minutes_since_signup: Math.round(minutes), version: REMIX_PAGINAS_3110_VERSION },
    })
    return json({ ok: true, counted: stored })
  } catch {
    return json({ ok: true, counted: false, reason: 'error' })
  }
}
