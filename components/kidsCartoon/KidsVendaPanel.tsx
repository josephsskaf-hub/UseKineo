'use client'

// KINEO-KIDS-VENDA-2010 — o painel de VENDA e ENTREGA no /kids-cartoon (acima do template): "Meus episódios" (pedidos, contagem, lista
// dos entregues com vídeo, título, legenda, hashtags e "baixar todos") e "Planos" (personagem + tema + língua → episódio grátis, piloto
// US$ 29/mês, pack US$ 49). Quem decide tudo é o SERVIDOR (/api/kids-venda/status: interruptor, antifarm da amostra, pedidos); o
// checkout recebe só personagem/língua/tema (o preço nunca vai na URL). Fechado para a conta (open=false) = o painel não existe.
import { useEffect, useMemo, useState } from 'react'
import { useInterfaceLanguage } from '@/components/InterfaceLanguage'
import { trackEvent } from '@/lib/analytics'
import { KIDS_CHARACTERS, isKidsCartoonLanguage, type KidsCartoonLanguage, type KidsCharacterId } from '@/lib/kidsCartoon/kidsCartoon'
import { KIDS_THEME_MAX_CHARS, kidsCheckoutHref, kidsVendaCardText } from '@/lib/kidsVenda/kidsVenda'
import type { KidsStatusOrder } from '@/lib/kidsVenda/server'

interface StatusPayload {
  ready: boolean
  open: boolean
  sample: { eligible: boolean; reason?: string }
  orders: KidsStatusOrder[]
}

const UI = {
  en: { mine: 'My episodes', plans: 'Plans', theme: 'Series theme (optional)', themePh: 'e.g. bedtime adventures in the garden', language: 'Narration language', character: 'Character', downloadAll: 'Download all', download: 'Download', copy: 'Copy caption', copied: 'Copied', status: { active: 'Active', paused: 'Paused', completed: 'Completed', cancelled: 'Cancelled' }, kind: { autopilot: 'Channel on autopilot', pack: 'Pack of 30', sample: 'Free episode' }, progress: (d: number, t: number) => `${d} of ${t} delivered`, inFlight: (n: number) => `${n} being made now`, next: 'Next episode', sampleQueued: 'Your free episode is in the queue — it arrives by e-mail and here within about an hour.', sampleUsed: 'Your free episode was already used.', bought: 'Payment received — the first episode starts within the hour.', err: 'Something went wrong. Please try again.' },
  pt: { mine: 'Meus episódios', plans: 'Planos', theme: 'Tema da série (opcional)', themePh: 'ex.: aventuras na hora de dormir no jardim', language: 'Língua da narração', character: 'Personagem', downloadAll: 'Baixar todos', download: 'Baixar', copy: 'Copiar legenda', copied: 'Copiado', status: { active: 'Ativo', paused: 'Pausado', completed: 'Concluído', cancelled: 'Cancelado' }, kind: { autopilot: 'Canal no piloto automático', pack: 'Pack de 30', sample: 'Episódio grátis' }, progress: (d: number, t: number) => `${d} de ${t} entregues`, inFlight: (n: number) => `${n} sendo feito(s) agora`, next: 'Próximo episódio', sampleQueued: 'Seu episódio grátis entrou na fila — chega por e-mail e aqui em cerca de uma hora.', sampleUsed: 'Seu episódio grátis já foi usado.', bought: 'Pagamento recebido — o primeiro episódio começa dentro de uma hora.', err: 'Algo deu errado. Tente de novo.' },
  es: { mine: 'Mis episodios', plans: 'Planes', theme: 'Tema de la serie (opcional)', themePh: 'ej.: aventuras a la hora de dormir en el jardín', language: 'Idioma de la narración', character: 'Personaje', downloadAll: 'Descargar todos', download: 'Descargar', copy: 'Copiar descripción', copied: 'Copiado', status: { active: 'Activo', paused: 'Pausado', completed: 'Completado', cancelled: 'Cancelado' }, kind: { autopilot: 'Canal en piloto automático', pack: 'Pack de 30', sample: 'Episodio gratis' }, progress: (d: number, t: number) => `${d} de ${t} entregados`, inFlight: (n: number) => `${n} en producción ahora`, next: 'Próximo episodio', sampleQueued: 'Tu episodio gratis está en la cola — llega por e-mail y aquí en una hora aproximadamente.', sampleUsed: 'Tu episodio gratis ya fue usado.', bought: 'Pago recibido — el primer episodio empieza dentro de una hora.', err: 'Algo salió mal. Inténtalo de nuevo.' },
} as const
const LANG_LABEL: Record<KidsCartoonLanguage, string> = { en: 'English', pt: 'Português', es: 'Español' }

export const KIDS_VENDA_PANEL_CSS = `
.kvp{max-width:980px;margin:0 auto;padding:22px 20px 0;font-family:var(--font-sans),Inter,system-ui,sans-serif;color:var(--txt,#0E1116)}
.kvp-sec{border:1px solid #E4E4E0;border-radius:18px;padding:18px;margin:0 0 14px;background:#fff}
html[data-theme=dark] .kvp-sec{background:#10141B;border-color:#1F2530;color:#F2F4F7}
.kvp-sec h2{font-size:14px;letter-spacing:.06em;text-transform:uppercase;opacity:.7;margin:0 0 12px;font-weight:800}
.kvp-order{display:flex;flex-wrap:wrap;gap:8px 16px;align-items:center;font-size:14px;margin:0 0 10px}
.kvp-order b{font-weight:800}
.kvp-pill{font-size:11px;font-weight:800;letter-spacing:.08em;padding:4px 9px;border-radius:999px;background:#E8EFFF;color:#0A5CFF}
.kvp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px;margin:10px 0 0}
.kvp-ep{border:1px solid #E4E4E0;border-radius:12px;padding:8px;font-size:12px}
html[data-theme=dark] .kvp-ep{border-color:#1F2530}
.kvp-ep video{width:100%;aspect-ratio:9/16;border-radius:8px;background:#000}
.kvp-ep b{display:block;margin:6px 0 4px;font-size:13px}
.kvp-btn{border:1px solid #E4E4E0;background:transparent;color:inherit;border-radius:999px;padding:7px 12px;font:inherit;font-size:13px;cursor:pointer;text-decoration:none;display:inline-block}
.kvp-go{border:0;border-radius:999px;background:#7B6CFF;color:#fff!important;font:inherit;font-weight:750;font-size:14px;padding:11px 18px;cursor:pointer;text-decoration:none;display:inline-block}
.kvp-go[disabled]{opacity:.55;cursor:default}
.kvp-row{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin:10px 0 0}
.kvp-chars{display:flex;flex-wrap:wrap;gap:8px}
.kvp-char{border:2px solid #E4E4E0;background:transparent;color:inherit;border-radius:999px;padding:6px 12px;font:inherit;font-size:13px;cursor:pointer}
.kvp-char[aria-pressed=true]{border-color:#7B6CFF;background:rgba(123,108,255,.12)}
.kvp input{width:100%;border-radius:12px;border:1px solid #E4E4E0;padding:10px 12px;font:inherit;background:transparent;color:inherit}
.kvp-note{font-size:13px;opacity:.75;margin:8px 0 0;line-height:1.5}
.kvp-ok{color:#1B7F3B;font-size:14px;margin:8px 0 0}
.kvp-err{color:#C62828;font-size:14px;margin:8px 0 0}
`

async function downloadBlob(url: string, filename: string): Promise<void> {
  const res = await fetch(url)
  const blob = await res.blob()
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 10_000)
}

export default function KidsVendaPanel() {
  const ui = useInterfaceLanguage()
  const t = ui === 'pt' ? UI.pt : ui === 'es' ? UI.es : UI.en
  const card = kidsVendaCardText(ui)
  const [st, setSt] = useState<StatusPayload | null>(null)
  const [character, setCharacter] = useState<KidsCharacterId>('leo')
  const [language, setLanguage] = useState<KidsCartoonLanguage>(isKidsCartoonLanguage(ui) ? ui : 'en')
  const [theme, setTheme] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const refresh = () => fetch('/api/kids-venda/status', { cache: 'no-store', credentials: 'same-origin' }).then((r) => (r.ok ? (r.json() as Promise<StatusPayload>) : null)).then((v) => { if (v) setSt(v) }).catch(() => undefined)
  useEffect(() => { void refresh() }, [])
  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search)
      if (q.get('bought')) setMsg({ ok: true, text: t.bought })
      else if (q.get('checkout_error')) setMsg({ ok: false, text: q.get('checkout_error') ?? t.err })
    } catch { /* sem URL legível */ }
  }, [t.bought, t.err])

  const series = useMemo(() => ({ character, language, theme: theme.trim().slice(0, KIDS_THEME_MAX_CHARS) }), [character, language, theme])
  if (!st || !st.open || !st.ready) return null
  const liveOrders = st.orders.filter((o) => o.status !== 'cancelled')
  const hasPaid = liveOrders.some((o) => o.kind !== 'sample')
  const activeAutopilot = liveOrders.some((o) => o.kind === 'autopilot' && (o.status === 'active' || o.status === 'paused'))

  async function requestSample() {
    setBusy(true); setMsg(null)
    try {
      const res = await fetch('/api/kids-venda/sample', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(series) })
      const data = await res.json().catch(() => ({})) as { error?: string }
      if (!res.ok) { setMsg({ ok: false, text: data.error ?? t.err }); return }
      setMsg({ ok: true, text: t.sampleQueued })
      void trackEvent('kids_sample_requested_click', { character, language })
      await refresh()
    } catch { setMsg({ ok: false, text: t.err }) } finally { setBusy(false) }
  }
  async function downloadAll(o: KidsStatusOrder) {
    for (const v of o.videos) if (v.videoUrl) { try { await downloadBlob(v.videoUrl, `kineo-kids-${o.character}-ep${v.seq}.mp4`) } catch { /* segue para o próximo */ } }
  }

  return (
    <div className="kvp" data-kids-venda="panel">
      <style dangerouslySetInnerHTML={{ __html: KIDS_VENDA_PANEL_CSS }} />
      {msg ? <p className={msg.ok ? 'kvp-ok' : 'kvp-err'} role="status">{msg.text}</p> : null}
      {liveOrders.length > 0 ? (
        <section className="kvp-sec" id="my-episodes" aria-label={t.mine}>
          <h2>{t.mine}</h2>
          {liveOrders.map((o) => (
            <div key={o.id} data-kids-order={o.kind} style={{ marginBottom: 18 }}>
              <div className="kvp-order">
                <b>{t.kind[o.kind]}</b>
                <span className="kvp-pill">{t.status[o.status]}</span>
                <span>{KIDS_CHARACTERS.find((c) => c.id === o.character)?.name ?? o.character}{o.theme ? ` · ${o.theme}` : ''}</span>
                <span>{t.progress(o.delivered, o.total)}</span>
                {o.inFlight > 0 ? <span>{t.inFlight(o.inFlight)}</span> : null}
                {o.kind === 'autopilot' && o.status === 'active' && o.nextRunAt ? <span>{t.next}: {new Date(o.nextRunAt).toLocaleString()}</span> : null}
                {o.videos.length > 1 ? <button type="button" className="kvp-btn" onClick={() => { void downloadAll(o) }} data-kids-download-all={o.id}>{t.downloadAll} ({o.videos.length})</button> : null}
              </div>
              {o.videos.length > 0 ? (
                <div className="kvp-grid">
                  {o.videos.map((v) => (
                    <article className="kvp-ep" key={v.runId} data-kids-episode={v.seq}>
                      {v.videoUrl ? <video src={v.videoUrl} poster={v.posterUrl ?? undefined} controls preload="none" playsInline /> : null}
                      <b>{v.title ?? `Ep. ${v.seq}`}</b>
                      <div className="kvp-row" style={{ margin: 0 }}>
                        {v.videoUrl ? <button type="button" className="kvp-btn" onClick={() => { void downloadBlob(v.videoUrl!, `kineo-kids-${o.character}-ep${v.seq}.mp4`) }}>{t.download}</button> : null}
                        {v.caption ? <button type="button" className="kvp-btn" onClick={() => { try { void navigator.clipboard.writeText(`${v.title ?? ''}\n${v.caption}\n${v.hashtags.join(' ')}`); setCopied(v.runId) } catch { /* sem área de transferência */ } }}>{copied === v.runId ? t.copied : t.copy}</button> : null}
                      </div>
                    </article>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </section>
      ) : null}

      <section className="kvp-sec" id="plans" aria-label={t.plans} data-kids-venda="plans">
        <h2>{t.plans} · {card.title}</h2>
        <p className="kvp-note" style={{ margin: '0 0 10px' }}>{t.character}</p>
        <div className="kvp-chars">{KIDS_CHARACTERS.map((c) => <button key={c.id} type="button" className="kvp-char" aria-pressed={character === c.id} onClick={() => setCharacter(c.id)}>{c.name}</button>)}</div>
        <div className="kvp-row">
          <label style={{ flex: '1 1 260px' }}><span className="kvp-note" style={{ display: 'block', margin: '0 0 4px' }}>{t.theme}</span><input value={theme} maxLength={KIDS_THEME_MAX_CHARS} placeholder={t.themePh} onChange={(e) => setTheme(e.target.value)} /></label>
          <label><span className="kvp-note" style={{ display: 'block', margin: '0 0 4px' }}>{t.language}</span>
            <select value={language} onChange={(e) => { if (isKidsCartoonLanguage(e.target.value)) setLanguage(e.target.value) }} style={{ padding: 10, borderRadius: 12, font: 'inherit' }}>
              {(['en', 'pt', 'es'] as const).map((l) => <option key={l} value={l}>{LANG_LABEL[l]}</option>)}
            </select>
          </label>
        </div>
        <ul style={{ margin: '12px 0 0', padding: '0 0 0 18px', fontSize: 13, lineHeight: 1.5 }}>
          <li><b>{card.autopilot}</b> — {card.autopilotNote}</li>
          <li><b>{card.pack}</b> — {card.packNote}</li>
          {!hasPaid ? <li>{card.sample}</li> : null}
        </ul>
        <div className="kvp-row">
          {!activeAutopilot ? <a className="kvp-go" data-kineo="kids-cta-autopilot" href={kidsCheckoutHref('autopilot', series)} onClick={() => { void trackEvent('kids_checkout_click', { kind: 'autopilot', character, language }) }}>{card.ctaAutopilot}</a> : null}
          <a className="kvp-go" data-kineo="kids-cta-pack" href={kidsCheckoutHref('pack', series)} style={{ background: '#0A5CFF' }} onClick={() => { void trackEvent('kids_checkout_click', { kind: 'pack', character, language }) }}>{card.ctaPack}</a>
          {st.sample.eligible ? <button type="button" className="kvp-btn" data-kineo="kids-cta-sample" onClick={() => { void requestSample() }} disabled={busy}>{card.ctaSample}</button> : (!hasPaid && st.sample.reason === 'already_used' ? <span className="kvp-note">{t.sampleUsed}</span> : null)}
        </div>
        <p className="kvp-note">{card.honest}</p>
      </section>
    </div>
  )
}
