// KINEO-MODERACAO-2026-09-25 — varredura retroativa dos pedidos de /images com a régua nova (só admin, SÓ LEITURA).
//
// POR QUÊ: o incidente de 25/09 foi achado lendo o banco à mão. Com a régua em código (lib/safety/moderationPolicy.ts),
// a pergunta "há outras contas?" vira um GET: os pedidos guardados em `images` passam pelo omni-moderation em lotes e a
// resposta traz SÓ ids, contas, modelo, data, motivos e notas — NUNCA o texto do pedido nem a imagem (nada é enviado a
// terceiro além do texto, que o próprio produto já mandou ao fornecedor na hora de gerar). Não grava, não apaga, não
// suspende: o que fazer com cada conta é decisão do fundador.
//
// Uso (logado com conta admin): /api/admin/moderation-scan?limit=400  → mais antigos: &before=<oldest da resposta anterior>
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail, serviceClient } from '../_shared/db'
import { openai } from '@/lib/openai'
import { decideModeration, mentionsMinor } from '@/lib/safety/moderationPolicy'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const BATCH = 32
const MAX_LIMIT = 600

interface ImageRow { id: string; user_id: string | null; model: string | null; prompt: string | null; created_at: string }

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 })
  if (!isAdminEmail(user.email)) return NextResponse.json({ error: 'Admin access required.' }, { status: 403 })
  const admin = serviceClient()
  if (!admin) return NextResponse.json({ error: 'Service role not configured.' }, { status: 503 })

  const q = req.nextUrl.searchParams
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(q.get('limit')) || 300))
  const before = q.get('before')
  let query = admin.from('images').select('id, user_id, model, prompt, created_at').order('created_at', { ascending: false }).limit(limit)
  if (before && !Number.isNaN(Date.parse(before))) query = query.lt('created_at', new Date(before).toISOString())
  const { data, error } = await query
  if (error) return NextResponse.json({ error: 'Could not read images.', detail: error.message }, { status: 500 })
  const rows = ((data ?? []) as ImageRow[]).filter((r) => typeof r.prompt === 'string' && r.prompt.trim().length > 0)

  const flagged: Array<Record<string, unknown>> = []
  const perUser = new Map<string, { blocked: number; minors: number }>()
  const started = Date.now()
  let scanned = 0
  try {
    for (let i = 0; i < rows.length; i += BATCH) {
      if (Date.now() - started > 45_000) break
      const batch = rows.slice(i, i + BATCH)
      const res = await openai.moderations.create(
        { model: 'omni-moderation-latest', input: batch.map((r) => (r.prompt as string).slice(0, 4000)) },
        { timeout: 20_000, maxRetries: 1 },
      )
      batch.forEach((row, j) => {
        scanned++
        const d = decideModeration(res.results?.[j] as never, row.prompt)
        if (!d.block) return
        const key = row.user_id ?? 'sem-dono'
        const u = perUser.get(key) ?? { blocked: 0, minors: 0 }
        u.blocked++
        if (d.minors) u.minors++
        perUser.set(key, u)
        flagged.push({
          image_id: row.id,
          user_id: row.user_id,
          model: row.model,
          created_at: row.created_at,
          reasons: d.reasons,
          minors: d.minors,
          mentions_minor: mentionsMinor(row.prompt),
          sexual_minors_score: Number(d.sexualMinorsScore.toFixed(4)),
          sexual_score: Number(d.sexualScore.toFixed(4)),
        })
      })
    }
  } catch (e) {
    return NextResponse.json({ error: 'Moderation unavailable.', detail: e instanceof Error ? e.message.slice(0, 200) : String(e), scanned }, { status: 503 })
  }
  const oldest = rows.slice(0, scanned).at(-1)?.created_at ?? null
  return NextResponse.json({
    scanned,
    read: rows.length,
    oldest_scanned: oldest,
    next: oldest ? `/api/admin/moderation-scan?limit=${limit}&before=${encodeURIComponent(oldest)}` : null,
    blocked: flagged.length,
    minors: flagged.filter((f) => f.minors).length,
    by_user: [...perUser.entries()].map(([user_id, v]) => ({ user_id, ...v })).sort((a, b) => b.minors - a.minors || b.blocked - a.blocked),
    flagged,
    note: 'Read-only. No prompt text or image is returned. Suspension, quarantine and reporting are decisions for the founder.',
  }, { headers: { 'Cache-Control': 'no-store' } })
}
