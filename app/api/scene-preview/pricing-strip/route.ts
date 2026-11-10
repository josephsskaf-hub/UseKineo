// KINEO-REGIAO-PAGA-1011 [fundador 10/11: "3 ações para a gente conseguir vender mais… ações sem dinheiro"]
// A faixa do /pricing para quem chega da prévia grátis (regras e porquê em lib/growth/regiaoPaga1011.ts).
//   GET        → { show, scenes, idea, price, films } + evento de servidor region_preview_pricing_shown (só quando show).
//   GET ?go=1  → evento region_preview_pricing_clicked e 303 para o checkout de sempre do Starter mensal.
// SÓ LEITURA do banco (perfil + o último scene_preview_shown). Nenhum fornecedor, nenhum débito, nenhum preço novo.
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { writeServerEvent } from '@/lib/serverEvents'
import { releaseVisible } from '@/lib/recreate/access'
import { PREVIA_CENAS_PUBLIC, PREVIA_EVENTS, previaEligible, type PreviaProfile } from '@/lib/scenePreview'
import { STARTER_CREDITS, STARTER_MO, SEEDANCE_SHORT_FILM_CREDITS } from '@/lib/marketingPrice'
import {
  REGIAO_PAGA_1011_RELEASE,
  REGIAO_PAGA_CAMPAIGN,
  REGIAO_PAGA_CHECKOUT_HREF,
  REGIAO_PAGA_EVENTS,
  REGIAO_PAGA_STRIP_API,
  regiaoPagaFilms,
  regiaoPagaScenes,
  regiaoPagaShow,
} from '@/lib/growth/regiaoPaga1011'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

const NO_STORE = { 'Cache-Control': 'no-store' }
const HIDE = () => NextResponse.json({ show: false }, { headers: NO_STORE })

export async function GET(req: NextRequest) {
  const go = req.nextUrl.searchParams.get('go') === '1'
  const { data: { user } } = await createClient().auth.getUser()
  if (!user) return go ? NextResponse.redirect(new URL('/pricing', req.url), 303) : HIDE()
  const visible = PREVIA_CENAS_PUBLIC && releaseVisible(user.email, REGIAO_PAGA_1011_RELEASE)
  if (!visible) return go ? NextResponse.redirect(new URL('/pricing', req.url), 303) : HIDE()

  if (go) {
    await writeServerEvent({ name: REGIAO_PAGA_EVENTS.clicked, userId: user.id, path: REGIAO_PAGA_STRIP_API, metadata: { campaign: REGIAO_PAGA_CAMPAIGN, tier: 'starter' } })
    return NextResponse.redirect(new URL(REGIAO_PAGA_CHECKOUT_HREF, req.url), 303)
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return HIDE()
  const db = createAdminClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: profile } = await db.from('profiles').select('trial_status, has_paid, plan, video_credits').eq('id', user.id).maybeSingle()
  const eligible = previaEligible(profile as PreviaProfile | null)
  if (!eligible) return HIDE()
  const { data: rows } = await db.from('events').select('metadata').eq('user_id', user.id).eq('name', PREVIA_EVENTS.shown).order('created_at', { ascending: false }).limit(1)
  const meta = (rows?.[0] as { metadata?: { scenes?: unknown; idea?: unknown } } | undefined)?.metadata ?? null
  const scenes = regiaoPagaScenes(meta?.scenes, url)
  if (!regiaoPagaShow({ visible, eligible, scenes })) return HIDE()

  const films = regiaoPagaFilms(STARTER_CREDITS, SEEDANCE_SHORT_FILM_CREDITS)
  await writeServerEvent({ name: REGIAO_PAGA_EVENTS.shown, userId: user.id, path: REGIAO_PAGA_STRIP_API, metadata: { campaign: REGIAO_PAGA_CAMPAIGN, scenes: scenes.length, films } })
  return NextResponse.json({
    show: true,
    scenes,
    idea: typeof meta?.idea === 'string' ? meta.idea.slice(0, 140) : '',
    price: STARTER_MO,
    films,
    go: `${REGIAO_PAGA_STRIP_API}?go=1`,
  }, { headers: NO_STORE })
}
