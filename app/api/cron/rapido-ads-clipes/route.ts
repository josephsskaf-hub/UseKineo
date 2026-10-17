// KINEO-FILME-RAPIDO-1710 [TRAVA 8.2 — vai do fundador 17/10 "vai pra tudo"] — o cron de 1 MIN dos anúncios e dos clipes.
//
// Auditoria 17/10 (G7/G8/V7): o anúncio de aba fechada só andava no cron de 5 em 5 min (/api/cron/ads-v2-advance, que
// também cuida dos lotes e do robô das demos — esse fica como está, na mesma frequência), e o clipe de aba fechada só na
// varredura horária (4 de 5 clipes grátis de texto esperaram de 33 a 126 min). Este cron roda a cada minuto e faz SÓ:
//   · Studio Ads: avança os pedidos em andamento pelo MESMO motor da tela (advanceAdsV2Order: transições condicionais,
//     tela + cron de 5 min + este juntos nunca enviam nem cobram duas vezes) e adianta trilha e voz dos pedidos novos
//     (lib/ads/v2AudioCedo — 1 vez por pedido);
//   · Clipes: a MESMA settleClip da tela para todo clipe em andamento com 20 s+ (lib/clips/clipServer advanceActiveClipJobs).
// Uma rodada por vez (lib/cronLease). Não envia e-mail, não decide campanha, não lê ?confirm.
import { NextRequest, NextResponse } from 'next/server'
import { footageAdminClient } from '@/lib/userFootage'
import { isMissingAdsTable } from '@/lib/ads/serverAccess'
import { advanceAdsV2Order, loadAdsV2Order } from '@/lib/ads/v2Advance'
import { adsV2AudioCedo } from '@/lib/ads/v2AudioCedo'
import { advanceActiveClipJobs } from '@/lib/clips/clipServer'
import { tomarVezDoCron } from '@/lib/cronLease'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// Rota só-GET: sem isto, o supabase-js lê o banco do Data Cache da Vercel (KINEO-DATA-CACHE-2026-09-02).
export const fetchCache = 'force-no-store'
export const maxDuration = 300

const ADS_BATCH = 6
const TOTAL_BUDGET_MS = 240_000
const PER_ORDER_BUDGET_MS = 60_000

function isAuthorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  return req.headers.get('authorization') === `Bearer ${cronSecret}`
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const started = Date.now()
  const admin = footageAdminClient()
  const vez = await tomarVezDoCron(admin, 'rapido-ads-clipes', (maxDuration + 15) * 1000)
  if (!vez.ok) return NextResponse.json({ ok: true, skipped: vez.motivo })
  try {
    // Clipes e anúncios em paralelo: um não espera o outro.
    const clipes = advanceActiveClipJobs({ deadlineMs: started + TOTAL_BUDGET_MS }).catch((e) => {
      console.warn('[cron/rapido-ads-clipes] clipes falharam:', e instanceof Error ? e.message : String(e))
      return null
    })
    const anuncios = (async () => {
      const { data, error } = await admin
        .from('ads_v2_orders')
        .select('id, status, updated_at')
        .in('status', ['generating', 'assembling'])
        .order('updated_at', { ascending: true })
        .limit(ADS_BATCH)
      if (error) {
        if (!isMissingAdsTable(error.code)) console.error('[cron/rapido-ads-clipes] leitura dos anúncios falhou:', error.message)
        return [] as { order_id: string; before: string; after: string | null }[]
      }
      const out: { order_id: string; before: string; after: string | null }[] = []
      const audios: Promise<unknown>[] = []
      for (const o of (data ?? []) as { id: string; status: string }[]) {
        if (Date.now() - started > TOTAL_BUDGET_MS) break
        if (o.status === 'generating') {
          const { order } = await loadAdsV2Order(admin, o.id)
          if (order) audios.push(adsV2AudioCedo(admin, order)) // corre junto com o avanço; trava por pedido
        }
        const view = await advanceAdsV2Order(admin, o.id, { deadlineMs: Math.min(started + TOTAL_BUDGET_MS, Date.now() + PER_ORDER_BUDGET_MS) })
        out.push({ order_id: o.id, before: o.status, after: view?.status ?? null })
      }
      await Promise.all(audios)
      return out
    })()
    const [c, a] = await Promise.all([clipes, anuncios])
    console.log('[cron/rapido-ads-clipes]', JSON.stringify({ clips: c, ads: a, ms: Date.now() - started }))
    return NextResponse.json({ ok: true, clips: c, ads: a })
  } finally {
    await vez.liberar()
  }
}
