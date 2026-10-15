// KINEO-CHECKOUT-CLAREZA-1610 — o relógio de 48 h dos 20% do 1º mês (WELCOME20), por conta, gravado no servidor.
// GET  → só lê (nunca começa nada). Sem conta = { state: 'no_account' } (a tela não mostra prazo).
// POST → { surface } — lê; se o relógio ainda não começou, começa AGORA (uma linha em `events`, id determinístico por conta,
//        a 2ª escrita cai na chave primária). Já ativo ou vencido = devolve como está: nunca reinicia.
// Quem assina hoje (assinatura Stripe + plano pago) não tem relógio começado por aqui: a oferta não é para ele.
// A régua, a forma da linha e a frase vivem em lib/growth/welcome20Deadline.ts (puro); o checkout lê a MESMA linha.
import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { WELCOME20_SITE_OFFER_LIVE } from '@/lib/growth/publicPromoTruth'
import {
  WELCOME20_DEADLINE_UNKNOWN,
  readWelcome20Deadline,
  startWelcome20Deadline,
  welcome20DeadlineIdSeed,
  welcome20DeadlineSurface,
  welcome20DeadlineUuid,
  type Welcome20Deadline,
  type Welcome20DeadlineDb,
} from '@/lib/growth/welcome20Deadline'

export const dynamic = 'force-dynamic'

function adminDb(): Welcome20DeadlineDb | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createAdminClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) as unknown as Welcome20DeadlineDb
}

function reply(deadline: Welcome20Deadline | { state: 'no_account' | 'off'; startedAt: null; endsAt: null }) {
  return NextResponse.json({ ...deadline, now: new Date().toISOString() }, { headers: { 'Cache-Control': 'no-store' } })
}

async function signedInUserId(): Promise<string | null> {
  try {
    const { data: { user } } = await createClient().auth.getUser()
    return user?.id ?? null
  } catch {
    return null
  }
}

export async function GET() {
  if (!WELCOME20_SITE_OFFER_LIVE) return reply({ state: 'off', startedAt: null, endsAt: null })
  const userId = await signedInUserId()
  if (!userId) return reply({ state: 'no_account', startedAt: null, endsAt: null })
  const db = adminDb()
  if (!db) return reply(WELCOME20_DEADLINE_UNKNOWN)
  return reply(await readWelcome20Deadline(db, userId, Date.now()))
}

export async function POST(req: NextRequest) {
  if (!WELCOME20_SITE_OFFER_LIVE) return reply({ state: 'off', startedAt: null, endsAt: null })
  const userId = await signedInUserId()
  if (!userId) return reply({ state: 'no_account', startedAt: null, endsAt: null })
  const db = adminDb()
  if (!db) return reply(WELCOME20_DEADLINE_UNKNOWN)
  const body = (await req.json().catch(() => null)) as { surface?: unknown } | null
  const surface = welcome20DeadlineSurface(body?.surface)
  const now = Date.now()
  if (!surface) return reply(await readWelcome20Deadline(db, userId, now))
  // Assinante de hoje: só lê (a oferta não é para ele; o relógio dele não começa por uma faixa que piscou antes de a tela
  // saber que ele assina).
  try {
    const { data } = await (db as unknown as { from: (t: string) => { select: (c: string) => { eq: (c: string, v: string) => { maybeSingle: () => PromiseLike<{ data: { plan?: string | null; stripe_subscription_id?: string | null } | null }> } } } })
      .from('profiles').select('plan, stripe_subscription_id').eq('id', userId).maybeSingle()
    const plan = (data?.plan ?? '').toString().toLowerCase().trim()
    if (data?.stripe_subscription_id && plan !== '' && plan !== 'free') return reply(await readWelcome20Deadline(db, userId, now))
  } catch {
    // Sem o perfil, segue: começar o relógio de quem vê a oferta é o comportamento pedido.
  }
  const eventId = welcome20DeadlineUuid(createHash('sha256').update(welcome20DeadlineIdSeed(userId)).digest('hex'))
  return reply(await startWelcome20Deadline(db, { userId, eventId, surface, nowMs: now }))
}
