// KINEO-REGIAO-PAGA-1011 [fundador 10/11: "3 ações para a gente conseguir vender mais… ações sem dinheiro"]
// A faixa "seu filme + Starter" para quem chega da prévia grátis (regras e porquê em lib/growth/regiaoPaga1011.ts).
//   GET ?surface=pricing|preview_limit → { show, scenes, idea, script, language, price, films, qa } + evento de servidor
//                                       region_preview_pricing_shown (só quando show).
//   GET ?go=1&surface=…                → evento region_preview_pricing_clicked e 303 para o checkout de sempre do Starter mensal.
// Modos (regiaoPagaMode): 'real' = conta de região elegível · 'qa' = SÓ a allowlist exata da casa (conferência: a própria
// última prévia, ou a amostra marcada "QA sample") · 'hide' = o resto. SÓ LEITURA do banco. Nenhum fornecedor, nenhum
// débito, nenhum preço novo.
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
  REGIAO_PAGA_QA_SAMPLE,
  REGIAO_PAGA_STRIP_API,
  regiaoPagaFilms,
  regiaoPagaMode,
  regiaoPagaScenes,
  regiaoPagaShow,
  regiaoPagaSurface,
} from '@/lib/growth/regiaoPaga1011'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

const NO_STORE = { 'Cache-Control': 'no-store' }
const HIDE = () => NextResponse.json({ show: false }, { headers: NO_STORE })

export async function GET(req: NextRequest) {
  const go = req.nextUrl.searchParams.get('go') === '1'
  const surface = regiaoPagaSurface(req.nextUrl.searchParams.get('surface'))
  const back = () => NextResponse.redirect(new URL('/pricing', req.url), 303)
  const { data: { user } } = await createClient().auth.getUser()
  if (!user || REGIAO_PAGA_1011_RELEASE === 'off') return go ? back() : HIDE()

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return go ? back() : HIDE()
  const db = createAdminClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: profile } = await db.from('profiles').select('trial_status, has_paid, plan, video_credits').eq('id', user.id).maybeSingle()
  const eligible = previaEligible(profile as PreviaProfile | null)
  // A casa = a allowlist EXATA, sempre com 'internal' — nunca com o valor do interruptor.
  const house = releaseVisible(user.email, 'internal')
  const mode = regiaoPagaMode({ release: REGIAO_PAGA_1011_RELEASE, house, eligible, previaPublic: PREVIA_CENAS_PUBLIC })
  if (mode === 'hide') return go ? back() : HIDE()
  const qa = mode === 'qa'

  if (go) {
    await writeServerEvent({ name: REGIAO_PAGA_EVENTS.clicked, userId: user.id, path: REGIAO_PAGA_STRIP_API, metadata: { campaign: REGIAO_PAGA_CAMPAIGN, tier: 'starter', surface, qa } })
    return NextResponse.redirect(new URL(REGIAO_PAGA_CHECKOUT_HREF, req.url), 303)
  }

  const { data: rows } = await db.from('events').select('metadata').eq('user_id', user.id).eq('name', PREVIA_EVENTS.shown).order('created_at', { ascending: false }).limit(1)
  const meta = (rows?.[0] as { metadata?: { scenes?: unknown; idea?: unknown; script?: unknown; language?: unknown } } | undefined)?.metadata ?? null
  const own = regiaoPagaScenes(meta?.scenes, url)
  const sample = qa && own.length === 0
  const scenes = sample ? REGIAO_PAGA_QA_SAMPLE.scenes : own
  if (mode === 'real' && !regiaoPagaShow({ visible: true, eligible, scenes })) return HIDE()
  if (scenes.length === 0) return HIDE()

  const films = regiaoPagaFilms(STARTER_CREDITS, SEEDANCE_SHORT_FILM_CREDITS)
  await writeServerEvent({ name: REGIAO_PAGA_EVENTS.shown, userId: user.id, path: REGIAO_PAGA_STRIP_API, metadata: { campaign: REGIAO_PAGA_CAMPAIGN, scenes: scenes.length, films, surface, qa, sample } })
  return NextResponse.json({
    show: true,
    qa,
    scenes,
    idea: sample ? REGIAO_PAGA_QA_SAMPLE.idea : typeof meta?.idea === 'string' ? meta.idea.slice(0, 140) : '',
    // O roteiro volta para o navegador guardar a retomada (a mesma chave da prévia) — nunca na amostra.
    script: !sample && typeof meta?.script === 'string' ? meta.script.slice(0, 5000) : '',
    language: !sample && typeof meta?.language === 'string' ? meta.language.slice(0, 5) : 'en',
    price: STARTER_MO,
    films,
    go: `${REGIAO_PAGA_STRIP_API}?go=1&surface=${surface}`,
  }, { headers: NO_STORE })
}
