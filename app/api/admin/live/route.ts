// KINEO-ADMIN-LIVE-2026-08-19 — pedido do fundador: "quero ver quantas pessoas
// passaram no site em 7 dias, nas últimas 24h, e QUEM está online AGORA, com
// e-mail e nome do lado e se testou algo — pra eu mandar e-mail e fechar a
// compra".
//
// Nasceu de um caso real de hoje: wongzeehern (SG, veio do ChatGPT) cadastrou,
// foi ao checkout em 2 minutos, hesitou e ficou testando — e só descobrimos
// consultando o banco na mão. Com esta tela, esse cara aparece piscando em
// verde no /admin no minuto em que acontece.
//
// FONTE DA VERDADE: a tabela `events`. Todo evento carrega user_id (quando
// logado) e session_id (sempre) — então:
//   · VISITANTES  = sessões distintas com evento na janela (inclui anônimo)
//   · ONLINE AGORA = user_id distinto com evento nos últimos 5 minutos
// A janela de 5 min é o padrão de "usuários ativos" do GA e evita o falso
// positivo de quem só deixou a aba aberta.
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail, serviceClient } from '../_shared/db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const ONLINE_WINDOW_MIN = 5

export interface LiveVisitor {
  user_id: string
  email: string
  name: string | null
  country: string | null
  minutes_ago: number
  last_page: string | null
  credits: number | null
  plan: string | null
  is_paid: boolean
  videos: number
  /** Sinais do que a pessoa fez NESTA sessão de hoje — o "testou algo". */
  did: string[]
  /** Quão perto de comprar: 3 = abriu checkout · 2 = gerou vídeo · 1 = só olhou */
  heat: number
  source: string | null
}

export interface LiveData {
  visitors_7d: number
  visitors_24h: number
  signups_7d: number
  signups_24h: number
  videos_24h: number
  checkouts_24h: number
  online_now: number
  online: LiveVisitor[]
  generated_at: string
}

export async function GET() {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const admin = serviceClient()
    if (!admin) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })

    const now = Date.now()
    const iso = (msAgo: number) => new Date(now - msAgo).toISOString()
    const H24 = 24 * 60 * 60 * 1000
    const D7 = 7 * H24
    const ONLINE = ONLINE_WINDOW_MIN * 60 * 1000

    // ── Contagens (RPC-free: uma leitura por janela, colunas mínimas) ───────
    const [ev7d, ev24h, evOnline, sign7d, sign24h, vids24h, ck24h] = await Promise.all([
      admin.from('events').select('session_id').gte('created_at', iso(D7)).limit(60000),
      admin.from('events').select('session_id').gte('created_at', iso(H24)).limit(60000),
      admin.from('events').select('user_id, session_id, name, path, created_at').gte('created_at', iso(ONLINE)).order('created_at', { ascending: false }).limit(3000),
      admin.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', iso(D7)),
      admin.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', iso(H24)),
      admin.from('videos').select('id', { count: 'exact', head: true }).gte('created_at', iso(H24)),
      admin.from('events').select('id', { count: 'exact', head: true }).eq('name', 'checkout_started').gte('created_at', iso(H24)),
    ])

    const uniq = (rows: Array<{ session_id?: string | null }> | null) =>
      new Set((rows ?? []).map((r) => r.session_id).filter(Boolean)).size

    // ── Quem está online: último evento por usuário logado ─────────────────
    type OnlineRow = { user_id: string | null; name: string; path: string | null; created_at: string }
    const onlineRows = ((evOnline.data ?? []) as OnlineRow[]).filter((r) => !!r.user_id)
    const byUser = new Map<string, { last: OnlineRow; events: string[] }>()
    for (const row of onlineRows) {
      const uid = row.user_id as string
      const cur = byUser.get(uid)
      if (!cur) byUser.set(uid, { last: row, events: [row.name] })
      else cur.events.push(row.name)
    }
    const ids = [...byUser.keys()]

    let online: LiveVisitor[] = []
    if (ids.length > 0) {
      const [profRes, vidRes] = await Promise.all([
        admin.from('profiles')
          .select('id, email, name, plan, has_paid, video_credits, signup_country, last_country, signup_utm_source')
          .in('id', ids),
        admin.from('videos').select('user_id').in('user_id', ids).limit(2000),
      ])
      const vidCount = new Map<string, number>()
      for (const v of vidRes.data ?? []) {
        const uid = (v as { user_id: string }).user_id
        vidCount.set(uid, (vidCount.get(uid) ?? 0) + 1)
      }
      const PAID_PLANS = new Set(['starter', 'basic', 'pro', 'autopilot'])
      const internal = (e: string) => {
        const s = e.toLowerCase()
        return s.startsWith('josephsskaf') || s.startsWith('josephskaf') || s.endsWith('@shortsforgeai.com')
      }

      online = (profRes.data ?? [])
        .map((p) => {
          const row = byUser.get(p.id as string)!
          const names = new Set(row.events)
          // "Testou algo": traduz eventos crus em sinais que o fundador lê de
          // relance — e ordena por proximidade da compra.
          const did: string[] = []
          let heat = 1
          if ([...names].some((n) => n.startsWith('checkout'))) { did.push('🚨 no checkout'); heat = 3 }
          if (names.has('video_generation_started') || names.has('generate_started')) { did.push('🎬 gerando vídeo'); heat = Math.max(heat, 2) }
          if (names.has('video_generation_completed')) { did.push('✅ vídeo pronto'); heat = Math.max(heat, 2) }
          if (names.has('video_downloaded')) { did.push('⬇ baixou'); heat = Math.max(heat, 2) }
          if (names.has('pricing_view') || names.has('inline_pricing_currency_resolved')) did.push('💰 viu preço')
          if (names.has('upgrade_modal_opened') || [...names].some((n) => n.includes('topup'))) did.push('⚡ modal de crédito')
          if ([...names].some((n) => n.startsWith('images_') || n === 'image_generated')) did.push('🖼 imagens')
          if (did.length === 0) did.push('👀 navegando')

          return {
            user_id: p.id as string,
            email: (p.email as string) ?? '',
            name: (p.name as string | null) ?? null,
            country: ((p.signup_country ?? p.last_country) as string | null) ?? null,
            minutes_ago: Math.max(0, Math.round((now - Date.parse(row.last.created_at)) / 60000)),
            last_page: row.last.path ?? null,
            credits: typeof p.video_credits === 'number' ? p.video_credits : null,
            plan: (p.plan as string | null) ?? null,
            is_paid: PAID_PLANS.has(((p.plan as string) ?? '').toLowerCase()),
            videos: vidCount.get(p.id as string) ?? 0,
            did,
            heat,
            source: (p.signup_utm_source as string | null) ?? null,
          }
        })
        .filter((v) => v.email && !internal(v.email))
        .sort((a, b) => b.heat - a.heat || a.minutes_ago - b.minutes_ago)
    }

    const data: LiveData = {
      visitors_7d: uniq(ev7d.data as Array<{ session_id?: string | null }> | null),
      visitors_24h: uniq(ev24h.data as Array<{ session_id?: string | null }> | null),
      signups_7d: sign7d.count ?? 0,
      signups_24h: sign24h.count ?? 0,
      videos_24h: vids24h.count ?? 0,
      checkouts_24h: ck24h.count ?? 0,
      online_now: online.length,
      online,
      generated_at: new Date().toISOString(),
    }
    return NextResponse.json(data)
  } catch (e) {
    console.error('[admin/live] failed:', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ error: 'Failed to load live data.' }, { status: 500 })
  }
}
