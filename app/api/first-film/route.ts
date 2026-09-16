// KINEO-PRIMEIRO-FILME-2026-09-16 — estado do "primeiro filme premium" para o Studio.
// Só leitura. Diz se ESTA conta trava no Seedance 60 s (lib/primeiroFilme.ts) e se o teto
// diário do fundador (35 USD/dia ≈ 15 filmes) já foi atingido. Falha FECHADA: qualquer erro
// de leitura devolve capReached=true, e o Studio segue como hoje. Nunca grava nada.
import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import {
  PRIMEIRO_FILME_DESDE,
  PRIMEIRO_FILME_DURATION,
  PRIMEIRO_FILME_ENABLED,
  PRIMEIRO_FILME_ENGINE,
  PRIMEIRO_FILME_QUALITY,
  PRIMEIRO_FILME_VERSION,
  elegivelPrimeiroFilme,
  primeiroFilmeCapDia,
  type EstadoPrimeiroFilme,
} from '@/lib/primeiroFilme'

export const fetchCache = 'force-no-store'
export const dynamic = 'force-dynamic'

function fechado(reason: string, extra: Partial<EstadoPrimeiroFilme> = {}): EstadoPrimeiroFilme {
  return {
    version: PRIMEIRO_FILME_VERSION,
    enabled: PRIMEIRO_FILME_ENABLED,
    eligible: false,
    reason,
    capReached: true,
    usedToday: 0,
    capPerDay: primeiroFilmeCapDia(),
    engine: PRIMEIRO_FILME_ENGINE,
    duration: PRIMEIRO_FILME_DURATION,
    ...extra,
  }
}

// Filmes do "primeiro filme" nas últimas 24 h = filmes Seedance de contas nascidas dentro da
// janela e que ainda não pagaram. É a mesma coorte que o Studio trava, então o teto conta o
// que a mudança custa, não o uso do Seedance por quem já era cliente.
async function usadosHoje(): Promise<number | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  const admin = createAdminClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: contas, error: e1 } = await admin
    .from('profiles')
    .select('id')
    .gte('created_at', PRIMEIRO_FILME_DESDE)
    .eq('has_paid', false)
    .limit(5000)
  if (e1) return null
  const ids = (contas ?? []).map((c) => c.id as string)
  if (ids.length === 0) return 0
  const desde = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { count, error: e2 } = await admin
    .from('videos')
    .select('id', { count: 'exact', head: true })
    .eq('quality_mode', PRIMEIRO_FILME_QUALITY)
    .gte('created_at', desde)
    .in('user_id', ids)
  if (e2 || typeof count !== 'number') return null
  return count
}

export async function GET() {
  try {
    if (!PRIMEIRO_FILME_ENABLED) return NextResponse.json(fechado('desligado', { capReached: false }))
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: prof, error } = await supabase
      .from('profiles')
      .select('created_at, plan, has_paid, trial_status, video_credits')
      .eq('id', user.id)
      .maybeSingle()
    if (error || !prof) return NextResponse.json(fechado('perfil_indisponivel'))

    const { count: filmes, error: e3 } = await supabase
      .from('videos')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .neq('status', 'failed')
    if (e3) return NextResponse.json(fechado('filmes_indisponiveis'))

    const el = elegivelPrimeiroFilme({
      created_at: (prof.created_at as string | null) ?? null,
      plan: (prof.plan as string | null) ?? null,
      has_paid: (prof.has_paid as boolean | null) ?? null,
      trial_status: (prof.trial_status as string | null) ?? null,
      video_credits: (prof.video_credits as number | null) ?? null,
      filmes: filmes ?? 0,
    })
    if (!el.elegivel) return NextResponse.json(fechado(el.motivo, { capReached: false }))

    const usados = await usadosHoje()
    if (usados === null) return NextResponse.json(fechado('teto_indisponivel'))
    const cap = primeiroFilmeCapDia()
    const capReached = usados >= cap
    const estado: EstadoPrimeiroFilme = {
      version: PRIMEIRO_FILME_VERSION,
      enabled: true,
      eligible: !capReached,
      reason: capReached ? 'teto_do_dia' : el.motivo,
      capReached,
      usedToday: usados,
      capPerDay: cap,
      engine: PRIMEIRO_FILME_ENGINE,
      duration: PRIMEIRO_FILME_DURATION,
    }
    return NextResponse.json(estado)
  } catch {
    return NextResponse.json(fechado('erro'))
  }
}
