// KINEO-RENDER-CONDUZIDO-PELO-SERVIDOR-2026-09-18 — o navegador grava o pedido do Kineo 1 no clique em Generate.
// Ver lib/renderJobs.ts (o desenho inteiro). Sem custo, sem GPT: uma linha em `events` que sobrevive à aba fechada.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { writeServerEvent } from '@/lib/serverEvents'
import { RENDER_JOB_OPENED_EVENT, RENDER_JOB_VERSION, sanitizeRenderJobPayload } from '@/lib/renderJobs'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  let body: unknown = null
  try { body = await req.json() } catch { body = null }
  const job = sanitizeRenderJobPayload(body)
  if (!job) return NextResponse.json({ error: 'invalid_job' }, { status: 400 })

  // session_id = attempt_id: um pedido por tentativa; a mesma tentativa reenviada não duplica.
  const ok = await writeServerEvent({
    name: RENDER_JOB_OPENED_EVENT,
    userId: user.id,
    path: '/api/render-jobs',
    sessionId: job.attempt_id,
    dedupeMinutes: 10,
    metadata: { ...job, version: RENDER_JOB_VERSION },
  })
  return NextResponse.json({ ok, attempt_id: job.attempt_id })
}
