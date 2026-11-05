'use client'

// KINEO-KIDS-VENDA-2010 — o painel de VENDA e ENTREGA no /kids-cartoon (acima do template): "Meus episódios" (pedidos, contagem, lista
// dos entregues com vídeo, título, legenda, hashtags e "baixar todos"). Quem decide tudo é o SERVIDOR (/api/kids-venda/status: interruptor,
// pedidos). Fechado para a conta (open=false) = o painel não existe.
// KINEO-CARTOON-TELA-0411 [fundador 05/11: "Não tem esses packs mais, a pessoa escolhe e vamos embora"] — o quadro "Planos" (piloto, pack, preços e botões de compra)
// saiu desta tela. Sem pedido e sem aviso de volta do checkout, este painel não mostra nada; quem já comprou continua vendo aqui o canal e os episódios. Rotas de compra, webhook e entrega não mudaram.
// O 1º episódio grátis mudou para components/kidsCartoon/KidsEpisodioGratis.tsx.
import { useEffect, useState } from 'react'
import { useInterfaceLanguage } from '@/components/InterfaceLanguage'
import { KIDS_CHARACTERS } from '@/lib/kidsCartoon/kidsCartoon'
import { KIDS_VENDA_MUDOU } from '@/components/kidsCartoon/KidsEpisodioGratis'
import type { KidsStatusOrder } from '@/lib/kidsVenda/server'

interface StatusPayload {
  ready: boolean
  open: boolean
  sample: { eligible: boolean; reason?: string }
  orders: KidsStatusOrder[]
}

const UI = {
  en: { mine: 'My episodes', downloadAll: 'Download all', download: 'Download', copy: 'Copy caption', copied: 'Copied', status: { active: 'Active', paused: 'Paused', completed: 'Completed', cancelled: 'Cancelled' }, kind: { autopilot: 'Channel on autopilot', pack: 'Pack of 30', sample: 'Free episode' }, progress: (d: number, t: number) => `${d} of ${t} delivered`, inFlight: (n: number) => `${n} being made now`, next: 'Next episode', bought: 'Payment received — the first episode starts within the hour.', err: 'Something went wrong. Please try again.' },
  pt: { mine: 'Meus episódios', downloadAll: 'Baixar todos', download: 'Baixar', copy: 'Copiar legenda', copied: 'Copiado', status: { active: 'Ativo', paused: 'Pausado', completed: 'Concluído', cancelled: 'Cancelado' }, kind: { autopilot: 'Canal no piloto automático', pack: 'Pack de 30', sample: 'Episódio grátis' }, progress: (d: number, t: number) => `${d} de ${t} entregues`, inFlight: (n: number) => `${n} sendo feito(s) agora`, next: 'Próximo episódio', bought: 'Pagamento recebido — o primeiro episódio começa dentro de uma hora.', err: 'Algo deu errado. Tente de novo.' },
  es: { mine: 'Mis episodios', downloadAll: 'Descargar todos', download: 'Descargar', copy: 'Copiar descripción', copied: 'Copiado', status: { active: 'Activo', paused: 'Pausado', completed: 'Completado', cancelled: 'Cancelado' }, kind: { autopilot: 'Canal en piloto automático', pack: 'Pack de 30', sample: 'Episodio gratis' }, progress: (d: number, t: number) => `${d} de ${t} entregados`, inFlight: (n: number) => `${n} en producción ahora`, next: 'Próximo episodio', bought: 'Pago recibido — el primer episodio empieza dentro de una hora.', err: 'Algo salió mal. Inténtalo de nuevo.' },
} as const

export const KIDS_VENDA_PANEL_CSS = `
/* KINEO-CARTOON-TELA-0411 — os tokens da tela de anúncios; a largura vem da página. */
.kvp{--line:var(--border,#E4E4E0);--txt:var(--text,#0E1116);--blue:var(--accent,#0A5CFF);--soft:var(--accent-soft,#E8EFFF);margin:0 0 18px;color:var(--txt)}
.kvp *,.kvp *::before,.kvp *::after{box-sizing:border-box}
.kvp-sec{border:1px solid var(--line);border-radius:20px;padding:22px;margin:0 0 14px;background:var(--card);scroll-margin-top:24px}
.kvp-sec h2{font-size:14px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin:0 0 12px;font-weight:800}
.kvp-order{display:flex;flex-wrap:wrap;gap:8px 16px;align-items:center;font-size:14px;margin:0 0 10px;overflow-wrap:anywhere}
.kvp-order b{font-weight:800}
.kvp-pill{font-size:11px;font-weight:800;letter-spacing:.08em;padding:4px 9px;border-radius:999px;background:var(--soft);color:var(--blue)}
.kvp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px;margin:10px 0 0}
.kvp-ep{border:1px solid var(--line);border-radius:12px;padding:8px;font-size:12px;min-width:0;overflow-wrap:anywhere}
.kvp-ep video{width:100%;aspect-ratio:9/16;border-radius:8px;background:#000}
.kvp-ep b{display:block;margin:6px 0 4px;font-size:13px}
.kvp-btn{border:1px solid var(--line);background:transparent;color:inherit;border-radius:999px;min-height:44px;padding:10px 16px;font:inherit;font-size:13px;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;justify-content:center}
.kvp-btn[disabled]{opacity:.55;cursor:default}
.kvp-row{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin:10px 0 0}
.kvp :is(a,button):focus-visible{outline:3px solid var(--blue);outline-offset:3px}
.kvp-ok{color:#1B7F3B;font-size:14px;margin:8px 0 12px}
.kvp-err{color:#C62828;font-size:14px;margin:8px 0 12px}
@media(max-width:760px){.kvp-row>.kvp-btn{width:100%}}
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
  const [st, setSt] = useState<StatusPayload | null>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const refresh = () => fetch('/api/kids-venda/status', { cache: 'no-store', credentials: 'same-origin' }).then((r) => (r.ok ? (r.json() as Promise<StatusPayload>) : null)).then((v) => { if (v) setSt(v) }).catch(() => undefined)
  useEffect(() => {
    void refresh()
    const mudou = () => { void refresh() }
    window.addEventListener(KIDS_VENDA_MUDOU, mudou)
    return () => window.removeEventListener(KIDS_VENDA_MUDOU, mudou)
  }, [])
  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search)
      if (q.get('bought')) setMsg({ ok: true, text: t.bought })
      else if (q.get('checkout_error')) setMsg({ ok: false, text: q.get('checkout_error') ?? t.err })
    } catch { /* sem URL legível */ }
  }, [t.bought, t.err])

  if (!st || !st.open || !st.ready) return null
  const liveOrders = st.orders.filter((o) => o.status !== 'cancelled')

  async function downloadAll(o: KidsStatusOrder) {
    for (const v of o.videos) if (v.videoUrl) { try { await downloadBlob(v.videoUrl, `kineo-kids-${o.character}-ep${v.seq}.mp4`) } catch { /* segue para o próximo */ } }
  }

  if (liveOrders.length === 0 && !msg) return null // KINEO-CARTOON-TELA-0411 — sem pedido, esta tela não tem nada de venda
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
    </div>
  )
}
