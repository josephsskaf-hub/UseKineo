// KINEO-STORAGE-METER-2026-08-17 — o medidor de storage do popup da conta
// (fundador: "no menu de configurações a pessoa vê tudo que ela tem").
// Conta os projetos do usuario nas 3 tabelas + devolve o direito do plano
// (numeros do Pricing V5). Ainda NAO deleta nada — o limite e entitlement
// exibido; o cron de expiracao do Free e a fase 2.
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
// ═══ KINEO-DATA-CACHE-2026-09-02 (sprint-assinaturas #17) ═══════════════════
// Rota SO-GET no Next 14.2: sem POST no modulo, o store nasce com
// revalidate=false, e `dynamic='force-dynamic'` NAO muda isso (so pula o proxy
// que marcaria a rota como dinamica). Resultado: todo GET do supabase-js (e da
// fal/Creatomate) com URL estavel ia para o Data Cache da Vercel PARA SEMPRE —
// a rota lia o banco como ele estava na PRIMEIRA vez que aquela URL foi pedida.
// Provado em producao 02/09: cron de resgate contando 1 tentativa com 3 no
// banco, marcador stranded_composed invisivel 13 min depois de gravado,
// "claim row missing" logo apos 23505 no MESMO id, e-mail de video pronto
// repetido 15 min depois (be9c6314). Esta linha e o unico interruptor que
// zera o revalidate ANTES do primeiro fetch. Nao remover.
export const fetchCache = 'force-no-store'

const PLAN_LIMITS: Record<string, { projects: number | null; retention: string }> = {
  free: { projects: 10, retention: '14-day storage' },
  starter: { projects: 100, retention: '90-day storage' },
  basic: { projects: 500, retention: 'forever storage' },
  pro: { projects: null, retention: 'forever storage' }, // null = unlimited
  autopilot: { projects: null, retention: 'forever storage' },
}

export async function GET() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const [videos, images, audios, profile] = await Promise.all([
    supabase.from('videos').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('images').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('audios').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('profiles').select('plan').eq('id', user.id).maybeSingle(),
  ])

  const plan = String((profile.data as { plan?: string | null } | null)?.plan ?? 'free').toLowerCase()
  const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free
  const v = videos.count ?? 0
  const i = images.count ?? 0
  const a = audios.count ?? 0

  return NextResponse.json({
    videos: v,
    images: i,
    audios: a,
    total: v + i + a,
    limit: limits.projects,
    retention: limits.retention,
    plan,
  })
}
