// KINEO-QUARENTENA-2026-09-25 — tira do ar, SEM APAGAR, os arquivos de um incidente (só admin).
//
// O CASO: as 9 imagens do incidente de 25/09 (2 contas suspensas, pedidos graves envolvendo menores) seguiam no bucket
// PÚBLICO `renders`. O fundador aprovou tirá-las do ar sem apagar (são prova). Esta rota move cada uma para o bucket
// privado `quarantine` (lib/safety/quarantine.ts) e grava admin_media_quarantined com o que moveu e o que falhou.
//
// Régua da casa: GET e POST sem ?confirm=MOVE são ENSAIO (dizem o que fariam); só POST com ?confirm=MOVE move.
// Sem corpo, usa a lista do incidente de 25/09. Com corpo { bucket, paths[], label }, move outra lista (até 50).
// Idempotente: arquivo que já saiu do bucket de origem é reportado, não é erro.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail, serviceClient } from '../_shared/db'
import { writeServerEvent } from '@/lib/serverEvents'
import { quarantineObject, quarantinePath, QUARANTINE_BUCKET } from '@/lib/safety/quarantine'

export const dynamic = 'force-dynamic'

const INCIDENTE_20260925 = {
  label: 'incidente-20260925',
  bucket: 'renders',
  paths: [
    'images/52749de6-4394-4f1d-9e3f-16fb32c424a1/da4cb407-b910-4723-90df-588b10d13fa1.jpg',
    'images/52749de6-4394-4f1d-9e3f-16fb32c424a1/968c3712-07e9-4333-a260-d68898e3e5a1.jpg',
    'images/52749de6-4394-4f1d-9e3f-16fb32c424a1/298912ea-ddac-4e87-b242-35d0a3373e59.webp',
    'images/52749de6-4394-4f1d-9e3f-16fb32c424a1/d82648bc-cdc6-478d-8f2b-3142b2503847.jpg',
    'images/52749de6-4394-4f1d-9e3f-16fb32c424a1/93812f15-046a-49fb-9531-d5ee8f554cc8.jpg',
    'images/52749de6-4394-4f1d-9e3f-16fb32c424a1/1256c7bc-0950-4c1e-ba41-7a3836530975.jpg',
    'images/52749de6-4394-4f1d-9e3f-16fb32c424a1/aef70527-d1aa-4a87-a2a9-d7941e2413ef.jpg',
    'images/52749de6-4394-4f1d-9e3f-16fb32c424a1/68f323c7-16db-451c-bc7f-17f1fce1afe2.jpg',
    'images/b9f49852-60b4-47c6-a7d3-ed50634aa1a7/085dfb0d-6f93-47df-ad45-9c3e249dae65.jpg',
  ],
}
const BUCKETS = new Set(['renders', 'avatars', 'user-footage'])
const SAFE_PATH = /^[A-Za-z0-9][A-Za-z0-9._\/-]{0,300}$/

async function handle(req: NextRequest, method: 'GET' | 'POST') {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 })
  if (!isAdminEmail(user.email)) return NextResponse.json({ error: 'Admin access required.' }, { status: 403 })

  let job = INCIDENTE_20260925
  if (method === 'POST') {
    const body = (await req.json().catch(() => null)) as { bucket?: unknown; paths?: unknown; label?: unknown } | null
    if (body && (body.paths !== undefined || body.bucket !== undefined)) {
      const bucket = typeof body.bucket === 'string' ? body.bucket : ''
      const paths = Array.isArray(body.paths) ? body.paths.filter((p): p is string => typeof p === 'string') : []
      const label = typeof body.label === 'string' ? body.label : ''
      if (!BUCKETS.has(bucket) || paths.length === 0 || paths.length > 50 || !paths.every((p) => SAFE_PATH.test(p) && !p.includes('..')) || !label) {
        return NextResponse.json({ error: 'Send { bucket: renders|avatars|user-footage, paths: [1..50 safe paths], label }.' }, { status: 400 })
      }
      job = { bucket, paths, label }
    }
  }
  const plan = job.paths.map((p) => ({ from: `${job.bucket}/${p}`, to: `${QUARANTINE_BUCKET}/${quarantinePath(job.label, job.bucket, p)}` }))
  const confirm = method === 'POST' && req.nextUrl.searchParams.get('confirm') === 'MOVE'
  if (!confirm) return NextResponse.json({ dry_run: true, would_move: plan, how: 'POST ?confirm=MOVE (nada é apagado)' }, { headers: { 'Cache-Control': 'no-store' } })

  const admin = serviceClient()
  if (!admin) return NextResponse.json({ error: 'Service role not configured.' }, { status: 503 })
  const results: Array<Record<string, unknown>> = []
  for (const p of job.paths) {
    const r = await quarantineObject(admin, { bucket: job.bucket, path: p, label: job.label })
    // Já movido antes (origem sumiu): conferir que está na quarentena e reportar sem erro.
    let already = false
    if (!r.ok && /not.?found|does not exist/i.test(r.error ?? '')) {
      const dir = r.to.split('/').slice(0, -1).join('/')
      const name = r.to.split('/').pop() ?? ''
      const { data } = await admin.storage.from(QUARANTINE_BUCKET).list(dir, { search: name, limit: 5 })
      already = Boolean(data?.some((o) => o.name === name))
    }
    results.push({ from: `${job.bucket}/${p}`, to: `${QUARANTINE_BUCKET}/${r.to}`, moved: r.ok, already_in_quarantine: already, error: r.ok || already ? null : r.error ?? null })
  }
  const moved = results.filter((r) => r.moved).length
  const already = results.filter((r) => r.already_in_quarantine).length
  await writeServerEvent({
    name: 'admin_media_quarantined',
    userId: user.id,
    path: '/api/admin/quarantine-media',
    metadata: { label: job.label, bucket: job.bucket, requested: job.paths.length, moved, already_in_quarantine: already, results },
  }).catch(() => false)
  return NextResponse.json({ label: job.label, requested: job.paths.length, moved, already_in_quarantine: already, failed: job.paths.length - moved - already, results }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function GET(req: NextRequest) { return handle(req, 'GET') }
export async function POST(req: NextRequest) { return handle(req, 'POST') }
