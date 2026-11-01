// KINEO-BLACK-FRIDAY-2026 — o estado da Black Friday no RELÓGIO DO SERVIDOR, para a faixa do topo e o selo do /pricing.
// O navegador nunca decide sozinho se a oferta está no ar: ele só pergunta aqui (e só quando o próprio relógio diz que a
// janela está perto — ver components/BlackFridayBanner.tsx). Só lê; nada cobra, concede nem grava. Igual para todo
// visitante, então o CDN pode guardar por 30 s (a virada de 00:00 chega com no máximo 30 s de atraso na faixa; o
// checkout decide pelo relógio dele, na hora).
import { NextResponse } from 'next/server'
import { BF2026_ENDS_AT, BF2026_PERCENT_OFF, BF2026_STARTS_AT, bf2026PriceRows, bf2026State } from '@/lib/billing/blackFriday2026'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export async function GET() {
  const nowMs = Date.now()
  const state = bf2026State(nowMs)
  return NextResponse.json({
    nowMs,
    state,
    startsAt: BF2026_STARTS_AT,
    endsAt: BF2026_ENDS_AT,
    percentOff: BF2026_PERCENT_OFF,
    tiers: bf2026PriceRows().map((r) => ({ tier: r.tier, name: r.name, annualMinor: r.annualMinor, bfMinor: r.bfMinor })),
  }, { headers: { 'Cache-Control': 'public, max-age=0, s-maxage=30, stale-while-revalidate=30' } })
}
