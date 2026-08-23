import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Push #104 — homepage social-proof counter. Counts videos completed
// since midnight UTC and adds a baseline so we never publish a zero
// during off-peak hours. Cached for 5 minutes to keep the homepage
// fast under load.
// Push #116 — also returns a cumulative `total` for the hero counter
// ("9,847 Shorts created — and counting"). The all-time baseline keeps
// the number meaningful even on a fresh staging DB.
// Push #231 — also returns a rolling 7-day `week` count for the homepage
// "X videos created this week" line, with its own baseline.
// #454 — honest baselines. Real DB counts (completed videos) carry the number;
// these are small cushions so off-peak hours never publish a 0. Previously the
// total baseline was 9847 (a ~40x inflation over the real ~253) and inconsistent
// with every other "creators" claim on the site — corrected to a truthful ~300+.
// ⚠️ #292 — KINEO-NUMERO-VERDADEIRO-2026-08-23. OS COLCHÕES MORRERAM.
// Medido hoje no banco: 1.319 vídeos no total, 291 nos últimos 7 dias. Ou
// seja, o colchão que existia para "nunca publicar zero" virou ruído: somar
// 50 a 1.319 não protege de nada e transforma um número REAL num número
// aproximado — exatamente o que a regra do selo honesto proíbe em toda
// superfície pública da marca.
// E há um argumento de venda além da ética: a verdade agora é MAIOR que a
// invenção. Quem chegou a inflar o total para 9.847 estava, sem saber,
// escrevendo o teto do próprio crescimento — o número real passou o colchão
// e o colchão passou a esconder o quanto a casa cresceu.
// Zero continua tratado: quem decide EXIBIR é o componente (LiveStatsBadge /
// LiveStatsBand só renderizam acima de limiares próprios). O papel desta
// rota é dizer a verdade; o papel da tela é decidir se a verdade cabe.
const TODAY_BASELINE = 0
const WEEK_BASELINE = 0
const TOTAL_BASELINE = 0

export async function GET() {
  try {
    const supabase = createClient()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const [todayRes, weekRes, totalRes] = await Promise.all([
      supabase
        .from('videos')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString())
        .eq('status', 'completed'),
      supabase
        .from('videos')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', weekAgo.toISOString())
        .eq('status', 'completed'),
      supabase
        .from('videos')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed'),
    ])

    const count = (todayRes.count ?? 0) + TODAY_BASELINE
    const week = (weekRes.count ?? 0) + WEEK_BASELINE
    const total = (totalRes.count ?? 0) + TOTAL_BASELINE
    return NextResponse.json(
      { count, week, total },
      { headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=600' } },
    )
  } catch {
    return NextResponse.json({ count: TODAY_BASELINE, week: WEEK_BASELINE, total: TOTAL_BASELINE })
  }
}
