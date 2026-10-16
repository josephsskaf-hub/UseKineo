// KINEO-CONSENTIMENTO-1610 — região do visitante (GET) e registro da escolha de cookies (POST).
// A regra mora em lib/consent.ts; esta rota só lê o país da Vercel (x-vercel-ip-country — o mesmo cabeçalho que
// /api/geo e o checkout usam), grava o cookie de 12 meses pelo SERVIDOR (o Safari corta cookie escrito por
// JavaScript para 7 dias) e registra o evento `cookie_consent_set` pelo writeServerEvent (path /api/consent, região lida
// aqui). O SERVER_ONLY_EVENTS do sink genérico não foi tocado (lista fechada vigiada byte a byte por guardiões alheios):
// uma linha forjada por /api/events se distingue porque o sink sempre carimba ip_hash/is_bot e não grava este path.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { writeServerEvent } from '@/lib/serverEvents'
import {
  CONSENT_API_PATH,
  CONSENT_COOKIE,
  CONSENT_EVENT,
  CONSENT_MAX_AGE_SECONDS,
  consentCookieValue,
  consentRegionFor,
  parseConsentChoice,
} from '@/lib/consent'

export const dynamic = 'force-dynamic'

const NO_STORE = { 'Cache-Control': 'private, no-store, max-age=0' }

function countryOf(req: NextRequest): string | null {
  const raw = typeof req.headers?.get === 'function' ? req.headers.get('x-vercel-ip-country') : null
  const code = (raw ?? '').trim().toUpperCase()
  return /^[A-Z]{2}$/.test(code) ? code : null
}

export async function GET(req: NextRequest) {
  const country = countryOf(req)
  return NextResponse.json({ region: consentRegionFor(country), country }, { headers: NO_STORE })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const choice = parseConsentChoice(body?.choice)
  if (!choice) return NextResponse.json({ ok: false, error: 'invalid_choice' }, { status: 400, headers: NO_STORE })
  const source = body?.source === 'panel' ? 'panel' : 'banner'
  const country = countryOf(req)
  const region = consentRegionFor(country)
  const gpc = req.headers.get('sec-gpc') === '1'

  let userId: string | null = null
  try {
    const { data: { user } } = await createClient().auth.getUser()
    userId = user?.id ?? null
  } catch {
    /* visitante anônimo: a escolha vale do mesmo jeito */
  }

  // Registro nunca impede o cookie: a escolha do visitante vale mesmo com o banco fora.
  const recorded = await writeServerEvent({
    name: CONSENT_EVENT,
    userId,
    metadata: { choice, region, country, source, gpc },
    path: CONSENT_API_PATH,
  })

  const res = NextResponse.json({ ok: true, choice, region, recorded }, { headers: NO_STORE })
  res.cookies.set(CONSENT_COOKIE, consentCookieValue(choice), {
    path: '/',
    maxAge: CONSENT_MAX_AGE_SECONDS,
    sameSite: 'lax',
    secure: req.nextUrl.protocol === 'https:',
    httpOnly: false, // o ConsentManager lê a escolha no navegador
  })
  return res
}
