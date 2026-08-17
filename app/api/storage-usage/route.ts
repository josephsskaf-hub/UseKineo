// KINEO-STORAGE-METER-2026-08-17 — o medidor de storage do popup da conta
// (fundador: "no menu de configurações a pessoa vê tudo que ela tem").
// Conta os projetos do usuario nas 3 tabelas + devolve o direito do plano
// (numeros do Pricing V5). Ainda NAO deleta nada — o limite e entitlement
// exibido; o cron de expiracao do Free e a fase 2.
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
