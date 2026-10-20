'use client'

// KINEO-KIT-BF-1910 — a TELA do Kit Black Friday no Close real (o porquê e as regras: lib/ads/v2KitBf.ts).
//   · AdsKitBfPanel: o campo "Oferta" (até 24 caracteres, com 4 sugestões rápidas) e o seletor "Variações 1 · 3 · 5", logo abaixo da
//     escolha de formato, SÓ no Close real de quem tem o Studio Ads (a amostra grátis não vê nada disto).
//   · adsV2KitBfRun: o lote das N variações pelas rotas que JÁ existem — rascunhos (POST /api/ads/v2/orders, com research_from), a
//     pesquisa copiada (POST /api/ads/v2/research), os N roteiros (POST /api/ads/v2/batch action 'plan', um /plan por linha, nada cobrado)
//     e a fila (action 'start' com expected_credits = N × o preço do nível: o servidor recusa se o total mudou). Nenhum débito, saldo ou
//     fal aqui: cada linha é cobrada inteira pelo /start de sempre quando a fila chega nela. Os pedidos ficam juntos por batch_id e a
//     tela do lote (/ads/v2?mode=batch&batch=<id>) mostra todos e baixa todos.
import { adsV2KitBfAngles, adsV2KitBfCopy, adsV2KitBfTotal, ADS_V2_KIT_BF_COUNTS, ADS_V2_KIT_BF_OFFER_MAX, type AdsV2KitBfCount } from '@/lib/ads/v2KitBf'

type ApiResult<T> = { ok: true; status: number; data: T } | { ok: false; status: number; code: string; body: Record<string, unknown> }
type Api = <T>(url: string, init?: { method?: string; body?: unknown }) => Promise<ApiResult<T>>

const fill = (s: string, v: Record<string, string | number>): string => s.replace(/\{(\w+)\}/g, (m, k: string) => (k in v ? String(v[k]) : m))

const KIT_CSS = `
.adv2kit{margin:12px 0 0;padding:12px;border:1px solid var(--ads-line,rgba(255,255,255,.12));border-radius:14px;background:var(--ads-card,rgba(255,255,255,.03))}
.adv2kit h4{margin:0 0 8px;font-size:13px;letter-spacing:.02em;text-transform:uppercase;color:var(--ads-muted,#8a8f98)}
.adv2kit label.adv2kit-l{display:block;font-size:13px;font-weight:700;margin:0 0 6px}
.adv2kit input.adv2kit-in{width:100%;box-sizing:border-box;padding:10px 12px;border-radius:10px;border:1px solid var(--ads-line,rgba(255,255,255,.18));background:var(--ads-input,rgba(0,0,0,.25));color:inherit;font-size:15px}
.adv2kit .adv2kit-chips{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0 0}
.adv2kit .adv2kit-seg{display:inline-flex;gap:6px;margin:4px 0 0}
.adv2kit .adv2kit-seg button[aria-pressed=true],.adv2kit .adv2kit-chips button[aria-pressed=true]{background:#FFD400;color:#111;border-color:#FFD400}
.adv2kit .adv2kit-row{margin:12px 0 0}
.adv2kit .adv2kit-angles{margin:6px 0 0;font-size:12px;color:var(--ads-muted,#8a8f98)}
`

export function AdsKitBfPanel({ lang, offer, onOffer, count, onCount, cost, disabled }: { lang: string; offer: string; onOffer: (v: string) => void; count: AdsV2KitBfCount; onCount: (n: AdsV2KitBfCount) => void; cost: number | null; disabled: boolean }) {
  const k = adsV2KitBfCopy(lang)
  const clean = offer.replace(/\s+/g, ' ').trim()
  const angles = adsV2KitBfAngles(count, !!clean)
  const total = adsV2KitBfTotal(count, cost)
  return (
    <section className="adv2kit" data-kineo="ads-kit-bf" aria-label={k.title}>
      <style dangerouslySetInnerHTML={{ __html: KIT_CSS }} />
      <h4>{k.title}</h4>
      <label className="adv2kit-l" htmlFor="adv2kit-offer">{k.offerLabel}</label>
      <input id="adv2kit-offer" className="adv2kit-in" data-kineo="ads-kit-bf-offer" type="text" value={offer} maxLength={ADS_V2_KIT_BF_OFFER_MAX} placeholder={k.offerPlaceholder} disabled={disabled} onChange={(e) => onOffer(e.target.value.slice(0, ADS_V2_KIT_BF_OFFER_MAX))} />
      <div className="adv2kit-chips" role="group" aria-label={k.offerLabel}>
        {k.chips.map((c) => (
          <button key={c} type="button" className="pill" data-kineo="ads-kit-bf-chip" aria-pressed={clean === c} disabled={disabled} onClick={() => onOffer(clean === c ? '' : c)}>{c}</button>
        ))}
      </div>
      <p className="adsw-hint" style={{ margin: '6px 0 0' }}>{k.offerHint}</p>
      <div className="adv2kit-row">
        <span className="adv2kit-l" id="adv2kit-count-l">{k.countLabel}</span>
        <div className="adv2kit-seg" role="radiogroup" aria-labelledby="adv2kit-count-l" data-kineo="ads-kit-bf-count">
          {ADS_V2_KIT_BF_COUNTS.map((n) => (
            <button key={n} type="button" role="radio" className="pill" aria-checked={count === n} aria-pressed={count === n} disabled={disabled} onClick={() => onCount(n)}>{n}</button>
          ))}
        </div>
        <p className="adsw-hint" style={{ margin: '6px 0 0' }}>{fill(k.countHint, { c: cost ?? '—' })}</p>
        {count > 1 ? <p className="adv2kit-angles" data-kineo="ads-kit-bf-angles">{angles.map((a) => k.angles[a]).join(' · ')}{total !== null ? ` — ${fill(k.go, { n: count, c: total })}` : ''}</p> : null}
      </div>
    </section>
  )
}

export interface AdsV2KitBfRunInput {
  api: Api
  lang: string
  /** Quantas variações (3 ou 5). */
  n: AdsV2KitBfCount
  /** A oferta limpa (null = sem oferta). */
  offer: string | null
  /** O preço de UM anúncio no nível escolhido (adsV2Credits) — o mesmo número da tela. */
  credits: number
  /** O pedido já planejado (a variação 1 reaproveita o rascunho dele). */
  firstOrderId: string
  /** O corpo do POST /api/ads/v2/orders do rascunho (o mesmo da tela), sem research_from. */
  draftBody: Record<string, unknown>
  /** O corpo do /plan do anúncio (o mesmo da tela), sem order_id. */
  planBody: Record<string, unknown>
  onNote: (s: string | null) => void
}

/** O lote das N variações. ok = a fila começou (url = a tela do lote). Nada aqui debita: quem cobra é o /start de cada linha. */
export async function adsV2KitBfRun(i: AdsV2KitBfRunInput): Promise<{ ok: true; batchId: string; url: string; total: number } | { ok: false; error: string }> {
  const k = adsV2KitBfCopy(i.lang)
  const angles = adsV2KitBfAngles(i.n, !!i.offer)
  const total = adsV2KitBfTotal(i.n, i.credits)
  if (angles.length !== i.n || total === null) return { ok: false, error: k.failed }
  // 1. um rascunho por variação (a 1ª é o pedido já planejado); a pesquisa é copiada do 1º (research_from), nunca refeita do zero
  const orderIds = [i.firstOrderId]
  for (let v = 1; v < i.n; v++) {
    const d = await i.api<{ order_id?: string }>('/api/ads/v2/orders', { method: 'POST', body: { ...i.draftBody, research_from: i.firstOrderId } })
    if (!d.ok || typeof d.data.order_id !== 'string') return { ok: false, error: k.failed }
    for (let attempt = 0; attempt < 6; attempt++) {
      const r = await i.api<{ status?: string }>('/api/ads/v2/research', { method: 'POST', body: { order_id: d.data.order_id } })
      if (!(r.ok && r.data.status === 'running')) break
      await new Promise((res) => window.setTimeout(res, 4000))
    }
    orderIds.push(d.data.order_id)
  }
  // 2. os N roteiros (um /plan por linha, pelo lote): mesmo produto, fotos e oferta; o ângulo e a ordem das fotos mudam
  i.onNote(fill(k.writing, { n: i.n }))
  const rows = orderIds.map((id, v) => ({ ...i.planBody, order_id: id, ...(i.offer ? { offer: i.offer } : {}), kit_angle: angles[v], kit_variant: v, scripts: false }))
  const planned = await i.api<{ rows?: { ok?: boolean; credits?: number; code?: string }[]; credits_total?: number }>('/api/ads/v2/batch', { method: 'POST', body: { action: 'plan', rows } })
  if (!planned.ok) return { ok: false, error: k.failed }
  const out = Array.isArray(planned.data.rows) ? planned.data.rows : []
  if (out.length !== i.n || out.some((r) => r.ok !== true)) return { ok: false, error: k.failed }
  if (planned.data.credits_total !== total) return { ok: false, error: k.failed }
  // 3. a fila: o servidor confere que o total é EXATAMENTE N × o preço (price_changed se não for) e começa a 1ª
  i.onNote(k.starting)
  const started = await i.api<{ batch_id?: string; credits_total?: number }>('/api/ads/v2/batch', { method: 'POST', body: { action: 'start', batch_id: null, order_ids: orderIds, expected_credits: total } })
  if (!started.ok || typeof started.data.batch_id !== 'string') return { ok: false, error: k.failed }
  return { ok: true, batchId: started.data.batch_id, url: `/ads/v2?mode=batch&batch=${encodeURIComponent(started.data.batch_id)}`, total }
}
