'use client'
// KINEO-ADS-MARCAS-1510 — MARCAS (clientes) no Studio Ads, a tela: o seletor "Marca: X ▾" no topo do formulário (a caixa do
// motor do "Make a film" do /studio), a janela "Nova marca"/"Editar marca" e a lista "Seus anúncios" filtrada por marca.
//
// Estado: useAdsBrands() lê GET /api/ads/brands UMA vez. { ready: false } (migration não aplicada), erro ou demora > 4 s =
// 'legacy' — o invólucro esconde o seletor e a sessão do modo simples volta ao kit único de sempre. A marca escolhida fica
// lembrada NESTE navegador (localStorage, só conveniência; falha = a 1ª marca quando só há uma, senão nenhuma).
// Nada aqui cobra crédito nem cria pedido: o pedido só leva brand_id (POST /api/ads/v2/orders, que confere a posse).
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ADS_UPLOAD_ACCEPT_LOGO, AdsUploadError, uploadFootage } from '@/lib/ads/uploadFootage'
import { NARRATION_LANGUAGES } from '@/lib/textLanguage'
import type { InterfaceLanguage } from '@/lib/ui/interfaceLanguage'
import {
  AD_BRANDS_AGENCY_LIMIT,
  AD_BRANDS_CSS,
  adBrandCopy,
  adBrandFill,
  adBrandFilterOrders,
  type AdBrandFields,
  type AdBrandFilter,
  type AdBrandView,
} from '@/lib/ads/brands'

type ApiResult<T> = { ok: true; status: number; data: T } | { ok: false; status: number; code: string; body: Record<string, unknown> }

async function api<T>(url: string, init: { method?: string; body?: unknown } = {}): Promise<ApiResult<T>> {
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

export type AdsBrandsState =
  | { status: 'loading' }
  | { status: 'legacy' }
  | { status: 'ready'; brands: AdBrandView[]; limit: number; role: 'owner' | 'member'; canCreate: boolean }

const PICK_KEY = 'kineo.ads.brand'
const readPick = (): string | null => {
  try { return window.localStorage.getItem(PICK_KEY) } catch { return null }
}
const writePick = (id: string | null) => {
  try {
    if (id) window.localStorage.setItem(PICK_KEY, id)
    else window.localStorage.setItem(PICK_KEY, 'none')
  } catch {
    /* sem armazenamento: só não lembra */
  }
}

/** A marca que abre selecionada: a lembrada (se ainda existe), 'none' lembrado = nenhuma, senão a única. Pura. */
export function initialBrandPick(brands: readonly { id: string }[], remembered: string | null): string | null {
  if (remembered === 'none') return null
  if (remembered && brands.some((b) => b.id === remembered)) return remembered
  return brands.length === 1 ? brands[0].id : null
}

export function useAdsBrands() {
  const [state, setState] = useState<AdsBrandsState>({ status: 'loading' })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const firstRef = useRef(true)

  const reload = useCallback(async (pick?: string | null) => {
    const r = await api<{ ready?: boolean; brands?: AdBrandView[]; limit?: number; role?: string; can_create?: boolean }>('/api/ads/brands')
    if (!r.ok || r.data.ready !== true) {
      setState((s) => (s.status === 'ready' ? s : { status: 'legacy' }))
      return
    }
    const brands = Array.isArray(r.data.brands) ? r.data.brands : []
    setState({ status: 'ready', brands, limit: Number(r.data.limit) || 1, role: r.data.role === 'member' ? 'member' : 'owner', canCreate: r.data.can_create === true })
    if (pick !== undefined) {
      setSelectedId(pick && brands.some((b) => b.id === pick) ? pick : null)
    } else if (firstRef.current) {
      setSelectedId(initialBrandPick(brands, readPick()))
    } else {
      setSelectedId((cur) => (cur && brands.some((b) => b.id === cur) ? cur : null))
    }
    firstRef.current = false
  }, [])

  useEffect(() => {
    let done = false
    const t = window.setTimeout(() => { if (!done) setState((s) => (s.status === 'loading' ? { status: 'legacy' } : s)) }, 4000)
    void reload().finally(() => { done = true; window.clearTimeout(t) })
    return () => window.clearTimeout(t)
  }, [reload])

  const select = useCallback((id: string | null) => {
    setSelectedId(id)
    writePick(id)
  }, [])

  /** Cria (sem id) ou edita (com id). Devolve o id ou o código do erro. */
  const save = useCallback(async (fields: Partial<AdBrandFields>, id?: string | null): Promise<{ ok: true; id: string } | { ok: false; code: string }> => {
    const r = id
      ? await api<{ id: string }>('/api/ads/brands', { method: 'PATCH', body: { id, ...fields } })
      : await api<{ id: string }>('/api/ads/brands', { method: 'POST', body: fields })
    if (!r.ok) return { ok: false, code: r.code }
    const newId = String(r.data.id)
    writePick(newId)
    await reload(newId)
    return { ok: true, id: newId }
  }, [reload])

  const archive = useCallback(async (id: string): Promise<boolean> => {
    const r = await api(`/api/ads/brands?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
    if (!r.ok) return false
    writePick(null)
    await reload(null)
    return true
  }, [reload])

  const brands = state.status === 'ready' ? state.brands : []
  const selected = brands.find((b) => b.id === selectedId) ?? null
  return { state, brands, selected, selectedId, select, save, archive, reload }
}

const swatch = (b: Pick<AdBrandView, 'color' | 'logo_url'> | null) =>
  b?.logo_url ? { backgroundImage: `url(${JSON.stringify(b.logo_url)})`, backgroundColor: '#fff' } : { background: b?.color ?? 'var(--ads-soft, #eef3f9)' }

// ─── o seletor "Marca: X ▾" ─────────────────────────────────────────────────────────────────────────────────────────

export function AdsBrandSwitcher({
  lang,
  state,
  selected,
  onSelect,
  onNew,
  onEdit,
  disabled = false,
}: {
  lang: InterfaceLanguage
  state: Extract<AdsBrandsState, { status: 'ready' }>
  selected: AdBrandView | null
  onSelect: (id: string | null) => void
  onNew: () => void
  onEdit: (b: AdBrandView) => void
  disabled?: boolean
}) {
  const c = adBrandCopy(lang)
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement | null>(null)
  const btnRef = useRef<HTMLButtonElement | null>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); btnRef.current?.focus() } }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])
  const pick = (id: string | null) => { onSelect(id); setOpen(false); btnRef.current?.focus() }
  return (
    <div className="adbr" ref={boxRef} data-kineo="ads-brand-switcher">
      <style dangerouslySetInnerHTML={{ __html: AD_BRANDS_CSS }} />
      <button ref={btnRef} type="button" className="mdlbtn" aria-haspopup="menu" aria-expanded={open} disabled={disabled} onClick={() => setOpen((o) => !o)} data-kineo="ads-brand-button">
        <span className="lab" style={{ marginBottom: 0 }}>{c.brand}</span>
        <span className="mdlname">
          <span className="adbr-sw" aria-hidden="true" style={swatch(selected)} />
          <b>{selected ? selected.name : c.none}</b>
          <i style={{ marginLeft: 'auto' }}>▾</i>
        </span>
      </button>
      {state.role === 'member' ? <p className="adbr-team">{c.team}</p> : null}
      {open ? (
        <div className="adbr-menu" role="menu" aria-label={c.brand} data-kineo="ads-brand-menu">
          {state.brands.map((b) => (
            <button key={b.id} type="button" role="menuitemradio" aria-checked={selected?.id === b.id} aria-selected={selected?.id === b.id} onClick={() => pick(b.id)}>
              <span className="adbr-sw" aria-hidden="true" style={swatch(b)} />
              <span>{b.name}</span>
            </button>
          ))}
          <button type="button" role="menuitemradio" aria-checked={!selected} aria-selected={!selected} onClick={() => pick(null)}>
            <span className="adbr-sw" aria-hidden="true" style={swatch(null)} />
            <span>{c.none}</span>
          </button>
          <hr />
          {selected ? (
            <button type="button" role="menuitem" className="adbr-act" data-kineo="ads-brand-edit" onClick={() => { setOpen(false); onEdit(selected) }}>{c.edit}</button>
          ) : null}
          {state.canCreate ? (
            <button type="button" role="menuitem" className="adbr-act" data-kineo="ads-brand-new" onClick={() => { setOpen(false); onNew() }}>{c.add}</button>
          ) : (
            <p className="adbr-limit" data-kineo="ads-brand-limit">
              {adBrandFill(c.errLimit, { n: state.limit, max: AD_BRANDS_AGENCY_LIMIT })} <a href="/pricing" target="_blank" rel="noopener">Business →</a>
            </p>
          )}
        </div>
      ) : null}
    </div>
  )
}

// ─── a janela "Nova marca" / "Editar marca" ───────────────────────────────────────────────────────────────────────────

const ERR_KEYS: Readonly<Record<string, keyof ReturnType<typeof adBrandCopy>>> = {
  name_required: 'errName',
  brand_name_taken: 'errDup',
  brand_limit: 'errLimit',
  bad_pronounce: 'errPronounce',
}

export function AdsBrandDialog({
  lang,
  brand,
  canArchive,
  limit,
  onSave,
  onArchive,
  onClose,
}: {
  lang: InterfaceLanguage
  /** null = nova marca */
  brand: AdBrandView | null
  canArchive: boolean
  limit: number
  onSave: (fields: Partial<AdBrandFields>, id: string | null) => Promise<{ ok: true; id: string } | { ok: false; code: string }>
  onArchive: (id: string) => Promise<boolean>
  onClose: () => void
}) {
  const c = adBrandCopy(lang)
  const [name, setName] = useState(brand?.name ?? '')
  const [website, setWebsite] = useState(brand?.website ?? '')
  const [contact, setContact] = useState(brand?.contact ?? '')
  const [price, setPrice] = useState(brand?.price ?? '')
  const [color, setColor] = useState(brand?.color ?? '#2997ff')
  const [color2, setColor2] = useState(brand?.color2 ?? '#111827')
  const [voice, setVoice] = useState(brand?.voice_language ?? '')
  const [say, setSay] = useState(brand?.pronounce_say ?? '')
  const [notes, setNotes] = useState(brand?.notes ?? '')
  const [logo, setLogo] = useState<{ id: string | null; url: string | null; busy: boolean }>({ id: brand?.logo_footage_id ?? null, url: brand?.logo_url ?? null, busy: false })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const firstRef = useRef<HTMLInputElement | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)
  useEffect(() => { firstRef.current?.focus() }, [])
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape' && !busy) onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [busy, onClose])

  async function chooseLogo(file: File | undefined) {
    if (!file) return
    setLogo((l) => ({ ...l, busy: true }))
    try {
      const up = await uploadFootage(file, { isLogo: true })
      setLogo({ id: up.footageId, url: up.localUrl ?? up.url, busy: false })
    } catch (e) {
      setLogo((l) => ({ ...l, busy: false }))
      setErr(e instanceof AdsUploadError ? e.message : c.errFailed)
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setErr(c.errName); return }
    setBusy(true)
    setErr(null)
    const fields: Partial<AdBrandFields> = {
      name: name.trim(),
      website: website.trim() || null,
      contact: contact.trim() || null,
      price: price.trim() || null,
      color,
      color2,
      voice_language: voice || null,
      pronounce_say: say.trim() || null,
      notes: notes.trim() || null,
      logo_footage_id: logo.id,
    }
    const r = await onSave(fields, brand?.id ?? null)
    setBusy(false)
    if (r.ok) { onClose(); return }
    const k = ERR_KEYS[r.code]
    setErr(k ? adBrandFill(String(c[k]), { n: limit, max: AD_BRANDS_AGENCY_LIMIT }) : c.errFailed)
  }

  // por portal no <body>: a barra do topo e a do celular ficam POR BAIXO da janela (o conteúdo da página cria outro empilhamento)
  return createPortal(
    <div className="adbr-portal">
    <div className="adbr-dlg" role="dialog" aria-modal="true" aria-labelledby="adbr-dlg-t" data-kineo="ads-brand-dialog" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose() }}>
      <style dangerouslySetInnerHTML={{ __html: AD_BRANDS_CSS }} />
      <form onSubmit={submit} noValidate>
        <h2 id="adbr-dlg-t">{brand ? c.editTitle : c.newTitle}</h2>
        <div className="adbr-grid">
          <label className="full">{c.name}<input ref={firstRef} type="text" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder="Gabi Perfumes" data-kineo="ads-brand-name" /></label>
          <div className="full">
            <span className="adbr-lab" style={{ marginBottom: 6 }}>{c.logo}</span>
            <div className="adbr-logo">
              {logo.url ? <img src={logo.url} alt="" /> : null}
              <button type="button" className="adbr-btn" disabled={logo.busy} onClick={() => fileRef.current?.click()}>{logo.busy ? '…' : c.logoUpload}</button>
              {logo.id ? <button type="button" className="adbr-btn" onClick={() => setLogo({ id: null, url: null, busy: false })}>{c.logoRemove}</button> : null}
              <input ref={fileRef} type="file" accept={ADS_UPLOAD_ACCEPT_LOGO} hidden onChange={(e) => { void chooseLogo(e.target.files?.[0]); e.target.value = '' }} />
            </div>
          </div>
          <label>{c.color}<input type="color" value={color} onChange={(e) => setColor(e.target.value)} /></label>
          <label>{c.color2}<input type="color" value={color2} onChange={(e) => setColor2(e.target.value)} /></label>
          <label>{c.contact}<input type="text" value={contact} maxLength={80} onChange={(e) => setContact(e.target.value)} placeholder="@gabiperfumes" /></label>
          <label>{c.website}<input type="url" value={website} maxLength={200} onChange={(e) => setWebsite(e.target.value)} placeholder="gabiperfumes.com.br" /></label>
          <label>{c.price}<input type="text" value={price} maxLength={60} onChange={(e) => setPrice(e.target.value)} /></label>
          <label>{c.voice}
            <select value={voice} onChange={(e) => setVoice(e.target.value)}>
              <option value="">{c.voiceAuto}</option>
              {NARRATION_LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.native}</option>)}
            </select>
          </label>
          <label className="full">{c.pronounce}<input type="text" value={say} maxLength={40} onChange={(e) => setSay(e.target.value)} /></label>
          <label className="full">{c.notes}<textarea value={notes} maxLength={1000} onChange={(e) => setNotes(e.target.value)} /></label>
        </div>
        {err ? <p className="adbr-err" role="alert">{err}</p> : null}
        <div className="adbr-btns">
          {brand && canArchive ? (
            <button type="button" className="adbr-btn adbr-arch" disabled={busy} onClick={async () => { setBusy(true); const ok = await onArchive(brand.id); setBusy(false); if (ok) onClose(); else setErr(c.errFailed) }}>{c.archive}</button>
          ) : null}
          <button type="button" className="adbr-btn" disabled={busy} onClick={onClose}>{c.cancel}</button>
          <button type="submit" className="adbr-btn on" disabled={busy || logo.busy} data-kineo="ads-brand-save">{busy ? '…' : c.save}</button>
        </div>
      </form>
    </div>
    </div>,
    document.body,
  )
}

// ─── "Seus anúncios", filtrável por marca ─────────────────────────────────────────────────────────────────────────────

type ListedOrder = { id: string; status: string; tier: string; seconds: number; video_id: string | null; created_at: string; brand_id?: string | null; sentence?: string | null; link?: string | null }

export function AdsBrandOrders({ lang, brands, brandsOn, refreshKey = 0 }: { lang: InterfaceLanguage; brands: readonly AdBrandView[]; brandsOn: boolean; refreshKey?: number }) {
  const c = adBrandCopy(lang)
  const [filter, setFilter] = useState<AdBrandFilter>({ kind: 'all' })
  const [orders, setOrders] = useState<ListedOrder[] | null>(null)
  const fkey = filter.kind === 'one' ? filter.id : filter.kind
  useEffect(() => {
    let stop = false
    const q = brandsOn && filter.kind !== 'all' ? `&brand=${encodeURIComponent(filter.kind === 'one' ? filter.id : 'none')}` : ''
    void api<{ orders?: ListedOrder[] }>(`/api/ads/v2/orders?list=brands${q}`).then((r) => {
      if (stop) return
      // o servidor já filtrou; a mesma regra local garante a lista certa mesmo com resposta atrasada de outro filtro
      setOrders(r.ok && Array.isArray(r.data.orders) ? (brandsOn ? adBrandFilterOrders(r.data.orders, filter) : r.data.orders) : [])
    })
    return () => { stop = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fkey, brandsOn, refreshKey])
  const nameOf = (id: string | null | undefined) => (id ? brands.find((b) => b.id === id)?.name ?? null : null)
  const titleOf = (o: ListedOrder) => {
    if (o.sentence && o.sentence.trim()) return o.sentence.trim()
    try { return o.link ? new URL(o.link).hostname.replace(/^www\./, '') : '—' } catch { return '—' }
  }
  const date = (iso: string) => { try { return new Date(iso).toLocaleDateString(lang, { day: '2-digit', month: 'short' }) } catch { return '' } }
  const statusOf = (s: string) => (c.status as Record<string, string>)[s] ?? s
  if (orders !== null && orders.length === 0 && filter.kind === 'all') return null
  return (
    <section className="adbr-list" aria-labelledby="adbr-list-t" data-kineo="ads-brand-orders">
      <style dangerouslySetInnerHTML={{ __html: AD_BRANDS_CSS }} />
      <h2 id="adbr-list-t">{c.yourAds}</h2>
      {brandsOn && brands.length ? (
        <div className="adbr-chips" role="group" aria-label={c.brand} data-kineo="ads-brand-filter">
          <button type="button" className={`pill${filter.kind === 'all' ? ' on' : ''}`} aria-pressed={filter.kind === 'all'} onClick={() => setFilter({ kind: 'all' })}>{c.allBrands}</button>
          {brands.map((b) => (
            <button key={b.id} type="button" className={`pill${filter.kind === 'one' && filter.id === b.id ? ' on' : ''}`} aria-pressed={filter.kind === 'one' && filter.id === b.id} onClick={() => setFilter({ kind: 'one', id: b.id })}>{b.name}</button>
          ))}
          <button type="button" className={`pill${filter.kind === 'none' ? ' on' : ''}`} aria-pressed={filter.kind === 'none'} onClick={() => setFilter({ kind: 'none' })}>{c.none}</button>
        </div>
      ) : null}
      {orders === null ? <p className="adbr-empty">…</p> : orders.length === 0 ? (
        <p className="adbr-empty">{c.emptyList}</p>
      ) : (
        <ul>
          {orders.map((o) => (
            <li key={o.id} data-brand={o.brand_id ?? ''}>
              <span className="t">{titleOf(o)}</span>
              {nameOf(o.brand_id) ? <span className="b">{nameOf(o.brand_id)}</span> : null}
              <span className="m">{statusOf(o.status)} · {o.seconds}s · {date(o.created_at)}</span>
              <a href={`/ads/v2?order=${encodeURIComponent(o.id)}`}>{c.open}</a>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
