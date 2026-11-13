// KINEO-NOTA-AUTO-1MIN-1311 — rede de segurança da NOTA AUTOMÁTICA (vercel.json, de 1 em 1 minuto). Ver lib/regua95/notaAutoFilme.ts.
// O caminho normal é o disparo na hora (compose/status, depois da resposta). Este cron pega o que ficou sem nota nas últimas
// 3 h e sai em milissegundos quando não há nada. Interruptor NOTA_AUTO_MODE: 'off' sai na hora; 'sombra' (padrão) só grava
// o evento nota_auto; 'on' também grava no painel. Só medição: nunca muda o que o cliente recebe.
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { readAll } from '@/lib/supabase/readAll'
import { freshFetch } from '@/lib/lifecycle/freshFetch'
import { NOTA_AUTO_CRON_MAX, filmesSemNotaAuto, notaAutoDoFilme } from '@/lib/regua95/notaAutoFilme'
import { lerModoNotaAuto } from '@/lib/regua95/notaRevisor'
import { lerProvedorNotaAuto, tokenDoGateway } from '@/lib/regua95/visaoProvedor'

export const dynamic = 'force-dynamic'
// rota só-GET: sem isto o Data Cache da Vercel serviria a 1ª leitura de "quem falta" para sempre (KINEO-DATA-CACHE-2026-09-02)
export const fetchCache = 'force-no-store'
export const runtime = 'nodejs'
export const maxDuration = 300
const ROTA = '/api/cron/nota-auto'
/** Depois disto o giro não começa outro filme (o próximo minuto continua). */
const ORCAMENTO_MS = 150_000

function autorizado(req: NextRequest): boolean {
  const s = process.env.CRON_SECRET
  return !!s && req.headers.get('authorization') === `Bearer ${s}`
}

export async function GET(req: NextRequest) {
  if (!autorizado(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const modo = lerModoNotaAuto()
  if (modo === 'off') return NextResponse.json({ ok: true, modo })
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return NextResponse.json({ error: 'service unavailable' }, { status: 503 })
  const admin = createAdminClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: freshFetch } })
  const t0 = Date.now()
  try {
    const faltam = await filmesSemNotaAuto(admin, readAll, { route: ROTA })
    if (!faltam.length) return NextResponse.json({ ok: true, modo, faltam: 0, ms: Date.now() - t0 })
    const { provedor, modelo } = lerProvedorNotaAuto()
    const token = provedor === 'gateway' ? tokenDoGateway(req)?.token ?? null : null
    const feitos = []
    for (const videoId of faltam.slice(0, NOTA_AUTO_CRON_MAX)) {
      if (Date.now() - t0 > ORCAMENTO_MS) break
      feitos.push(await notaAutoDoFilme(admin, { videoId, route: ROTA, readAll, tokenGateway: token, modo }))
    }
    console.log('[cron/nota-auto]', JSON.stringify({ modo, provedor, modelo, faltam: faltam.length, feitos: feitos.map((f) => ({ v: f.videoId.slice(0, 8), n: f.nota ?? null, m: f.motivo ?? null, e: f.erro ?? null })), ms: Date.now() - t0 }))
    return NextResponse.json({ ok: true, modo, provedor, modelo, faltam: faltam.length, feitos, ms: Date.now() - t0 })
  } catch (e) {
    console.warn('[cron/nota-auto] falhou:', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ ok: false, error: 'failed' }, { status: 502 })
  }
}
