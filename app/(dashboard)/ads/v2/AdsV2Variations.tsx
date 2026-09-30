'use client'

// KINEO-ADS-3-VARIACOES-2026-09-30 — as "3 variações" na tela do /ads/v2 (modo simples e completo).
//
//   · VariationToggle: a opção, com o preço do GRUPO calculado por adsV2VariationCredits (a MESMA função que a rota
//     /api/ads/v2/variations cobra) antes do clique. Nenhum número digitado aqui.
//   · VariationsBoard: as 3 lado a lado (no celular, carrossel com rolagem lateral), rótulo "A · <look>", e em cada uma
//     baixar, refazer uma cena (o construtor completo daquela variação, onde mora a refação) e "Escolher esta".
//     Cada variação é um pedido v2 normal: a tela consulta /api/ads/v2/status de cada uma (o mesmo avanço do anúncio
//     comum; o cron entrega com a aba fechada).
// Eventos do v2 são só-servidor: nada de trackEvent aqui (o download usa o downloadVideoFile de sempre).

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { downloadVideoFile } from '@/lib/videoDownload'
import { isActiveOrderStatus } from '@/lib/ads/v2Screen'
import { ADS_V2_VARIATIONS_COPY, adsV2VariationCredits, variationLabel, type AdsV2VariationSlot, type AdsV2VariationsCopy } from '@/lib/ads/v2Variations'
import { pickInterfaceCopy, type InterfaceLanguage } from '@/lib/ui/interfaceLanguage'

const POLL_MS = 8000
const POLL_RETRY_MS = 20_000

type ApiResult<T> = { ok: true; status: number; data: T } | { ok: false; status: number; code: string; body: Record<string, unknown> }

async function vapi<T>(url: string, init: { method?: string; body?: unknown } = {}): Promise<ApiResult<T>> {
  let res: Response
  try {
    res = await fetch(url, {
      method: init.method ?? 'GET',
      headers: init.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      cache: 'no-store',
    })
  } catch {
    return { ok: false, status: 0, code: 'network', body: {} }
  }
  let body: Record<string, unknown> = {}
  try {
    const j = await res.json()
    if (j && typeof j === 'object' && !Array.isArray(j)) body = j as Record<string, unknown>
  } catch {
    /* corpo vazio */
  }
  if (!res.ok) return { ok: false, status: res.status, code: typeof body.error === 'string' ? body.error : `http_${res.status}`, body }
  return { ok: true, status: res.status, data: body as T }
}

export function variationsCopy(lang: InterfaceLanguage | 'en'): AdsV2VariationsCopy {
  return pickInterfaceCopy(ADS_V2_VARIATIONS_COPY, lang as InterfaceLanguage)
}

const fillV = (t: string, vars: Record<string, string | number>) => t.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ''))

/** Preço do grupo mostrado ANTES do clique (null = nível ainda não escolhido). */
export function variationsPrice(single: number | null): number | null {
  return single === null ? null : adsV2VariationCredits(single)
}

// ─── a opção ──────────────────────────────────────────────────────────────────────────────────

export function VariationToggle({
  on,
  onChange,
  single,
  copy,
  disabled,
}: {
  on: boolean
  onChange: (on: boolean) => void
  single: number | null
  copy: AdsV2VariationsCopy
  disabled?: boolean
}) {
  const group = variationsPrice(single)
  return (
    <div className="adv2v-toggle">
      <label>
        <input type="checkbox" checked={on} disabled={disabled || group === null} onChange={(e) => onChange(e.target.checked)} />
        <span>
          <b>{copy.toggle}</b>
          <small>{copy.toggleHint}</small>
          {group !== null ? <small className="price">{fillV(copy.price, { c: group, one: single ?? '' })}</small> : null}
        </span>
      </label>
    </div>
  )
}

// ─── o painel das 3 ───────────────────────────────────────────────────────────────────────────

interface GroupMember {
  slot: AdsV2VariationSlot
  order_id: string
  status: string
  credits: number
  video_id: string | null
  error: string | null
}
interface GroupView {
  group_id: string
  credits: number
  chosen_order_id: string | null
  refunded: number
  members: GroupMember[]
}
interface MemberStatus {
  order_id: string
  status: string
  credits: number
  video_id: string | null
  shots: { state: string }[]
  video?: { id: string; video_url: string | null } | null
}

export const ADS_V2_VARIATIONS_CSS = `
.adv2 .adv2v-toggle{margin:14px 0 4px;padding:12px 14px;border:1px solid var(--ads-line);border-radius:14px;background:var(--ads-bg)}
.adv2 .adv2v-toggle label{display:flex;gap:10px;align-items:flex-start;cursor:pointer}
.adv2 .adv2v-toggle input{margin-top:4px;accent-color:var(--ads-action);flex-shrink:0}
.adv2 .adv2v-toggle span{display:grid;gap:3px;min-width:0}
.adv2 .adv2v-toggle small{font-size:12.5px;line-height:1.45;color:var(--ads-muted)}
.adv2 .adv2v-toggle small.price{color:var(--ads-text);font-weight:650}
.adv2 .adv2v-board{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-top:14px}
.adv2 .adv2v-card{display:grid;gap:10px;align-content:start;min-width:0;padding:14px;border:1px solid var(--ads-line);border-radius:16px;background:var(--ads-card)}
.adv2 .adv2v-card[data-chosen=true]{border-color:var(--ads-action);box-shadow:0 0 0 2px var(--ads-action) inset}
.adv2 .adv2v-card h3{margin:0;font-size:15px}
.adv2 .adv2v-card .adv2-player{width:100%}
.adv2 .adv2v-ph{display:grid;place-items:center;aspect-ratio:9/16;border-radius:14px;border:1px dashed var(--ads-line);background:var(--ads-bg);color:var(--ads-muted);font-size:13px;text-align:center;padding:12px}
.adv2 .adv2v-card .row{display:flex;flex-wrap:wrap;gap:8px}
.adv2 .adv2v-swipe{display:none;font-size:12.5px;color:var(--ads-muted);margin:8px 0 0}
@media(max-width:760px){
.adv2 .adv2v-board{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;gap:12px;padding-bottom:8px;-webkit-overflow-scrolling:touch}
.adv2 .adv2v-card{flex:0 0 82%;scroll-snap-align:center}
.adv2 .adv2v-swipe{display:block}
}
`

export function VariationsBoard({
  groupId,
  lang,
  onBalance,
  onAnother,
}: {
  groupId: string
  lang: InterfaceLanguage | 'en'
  onBalance: () => Promise<void>
  onAnother: () => void
}) {
  const copy = variationsCopy(lang)
  const [group, setGroup] = useState<GroupView | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [status, setStatus] = useState<Record<string, MemberStatus>>({})
  const [note, setNote] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const aliveRef = useRef(true)
  const timers = useRef<Record<string, number>>({})

  useEffect(() => {
    aliveRef.current = true
    const t = timers.current
    return () => {
      aliveRef.current = false
      for (const k of Object.keys(t)) window.clearTimeout(t[k])
    }
  }, [])

  async function loadGroup(): Promise<GroupView | null> {
    const r = await vapi<{ group?: GroupView | null }>(`/api/ads/v2/variations?group=${encodeURIComponent(groupId)}`)
    if (!aliveRef.current) return null
    if (!r.ok || !r.data.group) {
      setLoadError(r.ok ? 'group_not_found' : r.code)
      return null
    }
    setLoadError(null)
    setGroup(r.data.group)
    return r.data.group
  }

  function schedule(orderId: string, ms: number) {
    if (!aliveRef.current) return
    if (timers.current[orderId]) window.clearTimeout(timers.current[orderId])
    timers.current[orderId] = window.setTimeout(() => void poll(orderId), ms)
  }

  async function poll(orderId: string) {
    if (!aliveRef.current) return
    const r = await vapi<MemberStatus>(`/api/ads/v2/status?order_id=${encodeURIComponent(orderId)}`)
    if (!aliveRef.current) return
    if (!r.ok) {
      if (r.code === 'order_not_found' || r.code === 'unauthenticated') return
      setNote(copy.lost)
      schedule(orderId, POLL_RETRY_MS)
      return
    }
    setNote(null)
    setStatus((cur) => ({ ...cur, [orderId]: r.data }))
    if (isActiveOrderStatus(r.data.status)) schedule(orderId, POLL_MS)
    else {
      // Terminou (entregue ou falhou): relê o grupo (estorno e escolha) e o saldo.
      void loadGroup()
      void onBalance()
    }
  }

  useEffect(() => {
    void (async () => {
      const g = await loadGroup()
      if (!g) return
      for (const m of g.members) void poll(m.order_id)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId])

  async function choose(orderId: string) {
    if (busy) return
    setBusy(orderId)
    const r = await vapi<{ chosen_order_id: string }>('/api/ads/v2/variations', { method: 'POST', body: { action: 'choose', order_id: orderId } })
    if (!aliveRef.current) return
    setBusy(null)
    if (r.ok) setGroup((g) => (g ? { ...g, chosen_order_id: r.data.chosen_order_id } : g))
  }

  async function download(m: GroupMember, url: string, videoId: string | null) {
    if (busy) return
    setBusy(`dl-${m.order_id}`)
    try {
      await downloadVideoFile({
        url,
        filename: `ad-variation-${m.slot.toLowerCase()}.mp4`,
        exportType: 'clean',
        surface: 'ads',
        videoId,
        extra: { order_id: m.order_id, v2: true, variation: m.slot, group_id: groupId },
      })
    } finally {
      if (aliveRef.current) setBusy(null)
    }
  }

  if (loadError && !group) {
    return (
      <section className="adv2-card">
        <p className="adsw-err" role="alert">{copy.loadFailed} <Link className="adsw-link" href="/history">{copy.myVideos}</Link></p>
        <button type="button" className="adsw-btn ghost" onClick={onAnother}>{copy.back}</button>
      </section>
    )
  }
  if (!group) return <section className="adv2-card"><p className="adsw-hint" role="status">…</p></section>

  return (
    <section className="adv2-card" aria-labelledby="adv2v-title">
      <h2 id="adv2v-title">{copy.title}</h2>
      <p className="adsw-lead">
        {copy.lead} <Link className="adsw-link" href="/history">{copy.myVideos}</Link>.
      </p>
      <p className="adv2v-swipe">{copy.swipe}</p>
      <div className="adv2v-board">
        {group.members.map((m) => {
          const st = status[m.order_id]
          const state = st?.status ?? m.status
          const shots = st?.shots ?? []
          const ready = shots.filter((s) => s.state === 'ready').length
          const url = st?.video?.video_url ?? null
          const chosen = group.chosen_order_id === m.order_id
          return (
            <article key={m.order_id} className="adv2v-card" data-chosen={chosen}>
              <h3>{variationLabel(m.slot, lang)}{chosen ? ` · ${copy.chosen}` : ''}</h3>
              {state === 'delivered' && url ? (
                <video className="adv2-player" src={url} controls playsInline preload="metadata" />
              ) : state === 'failed' || state === 'cancelled' ? (
                <div className="adv2v-ph" role="status">{fillV(copy.failed, { c: m.credits })}</div>
              ) : (
                <div className="adv2v-ph" role="status">
                  {state === 'assembling' ? copy.assembling : fillV(copy.working, { r: ready, t: shots.length || '…' })}
                </div>
              )}
              {state === 'delivered' ? (
                <div className="row">
                  {url ? (
                    <button type="button" className="adsw-btn small" disabled={busy !== null} onClick={() => void download(m, url, st?.video?.id ?? m.video_id)}>
                      {busy === `dl-${m.order_id}` ? copy.downloading : copy.download}
                    </button>
                  ) : null}
                  <a className="adsw-btn ghost small" href={`/ads/v2?mode=full&order=${encodeURIComponent(m.order_id)}`}>{copy.redo}</a>
                  <button type="button" className="adsw-btn ghost small" disabled={busy !== null || chosen} aria-pressed={chosen} onClick={() => void choose(m.order_id)}>
                    {chosen ? copy.chosen : copy.choose}
                  </button>
                </div>
              ) : null}
            </article>
          )
        })}
      </div>
      {group.refunded > 0 ? <p className="adsw-hint" role="status">{fillV(copy.refunded, { c: group.refunded })}</p> : null}
      {note ? <p className="adsw-warn" role="status">{note}</p> : null}
      <div className="adv2-actions">
        <button type="button" className="adsw-btn ghost" onClick={onAnother}>{copy.back}</button>
      </div>
    </section>
  )
}
