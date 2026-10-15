'use client'
// KINEO-ADS-POS-ENTREGA-1510 — a tela do cliente da agência: lê o token do fragmento, pede a vista pública (só vídeo + marca + estado)
// e manda a decisão. Nenhum dado da agência além do nome da marca que ela mesma escreveu; nenhum link para o resto do site.
import { useEffect, useState } from 'react'
import { adsV2PosEntregaCopy, fillPosEntrega } from '@/lib/ads/v2PostDeliveryCopy'
import { interfaceLanguageIsRtl, parseInterfaceLanguage } from '@/lib/ui/interfaceLanguage'
import { demoPageCopy, fillDemo } from '@/lib/ads/demoSobMedida' // KINEO-DEMO-SOB-MEDIDA-1510 — "Sample made by Kineo for <Brand>", a nota de honestidade e o aviso do apresentador de IA
import { adsV2AiLabelNotice } from '@/lib/ads/v2AiLabel' // KINEO-DEMO-SOB-MEDIDA-1510 — feito com IA: a página SEMPRE diz

type View = { brand: string; video_url: string; status: 'pending' | 'approved' | 'changes_requested' | 'revoked'; lang: string; decided: boolean; formats?: { format: '9:16' | '4:5' | '1:1'; video_url: string }[]; sample?: boolean; ai_presenter?: boolean } // KINEO-DEMO-SOB-MEDIDA-1510 — + formats/sample/ai_presenter

const CSS = `
:root{--ap-bg:#f6f7f9;--ap-card:#ffffff;--ap-text:#0f1720;--ap-muted:#5b6673;--ap-line:#dfe3e8;--ap-accent:#1f7ae0;--ap-ok:#0f8a4b;--ap-warn:#b4530a}
@media (prefers-color-scheme: dark){:root{--ap-bg:#0b0f14;--ap-card:#141a21;--ap-text:#eef2f6;--ap-muted:#9aa6b2;--ap-line:#26303a;--ap-accent:#4da3ff;--ap-ok:#3ccf86;--ap-warn:#f0a35a}}
.ap{min-height:100vh;background:var(--ap-bg);color:var(--ap-text);font:16px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,"Noto Sans",sans-serif;display:flex;justify-content:center;align-items:flex-start;padding:24px 16px 48px;box-sizing:border-box}
.ap *{box-sizing:border-box}
.ap-wrap{width:100%;max-width:880px;display:grid;grid-template-columns:minmax(0,360px) minmax(0,1fr);gap:28px;align-items:start;align-content:start}
@media (max-width:760px){.ap-wrap{grid-template-columns:1fr;gap:18px}}
.ap-video{width:100%;aspect-ratio:9/16;max-height:80vh;background:#000;border-radius:14px;display:block;object-fit:contain}
.ap-card{background:var(--ap-card);border:1px solid var(--ap-line);border-radius:14px;padding:22px}
.ap-from{margin:0 0 4px;color:var(--ap-muted);font-size:14px;font-weight:600}
.ap h1{margin:0 0 18px;font-size:24px;line-height:1.25}
.ap-actions{display:flex;flex-wrap:wrap;gap:10px}
.ap-btn{min-height:44px;padding:10px 18px;border-radius:10px;border:1px solid transparent;font:inherit;font-weight:700;cursor:pointer}
.ap-btn.ok{background:var(--ap-ok);color:#fff}
.ap-btn.ghost{background:transparent;border-color:var(--ap-line);color:var(--ap-text)}
.ap-btn:disabled{opacity:.6;cursor:default}
.ap label{display:block;margin:16px 0 6px;font-weight:650;font-size:14px}
.ap textarea{width:100%;min-height:110px;padding:10px 12px;border-radius:10px;border:1px solid var(--ap-line);background:var(--ap-bg);color:var(--ap-text);font:inherit;resize:vertical}
.ap-msg{margin:14px 0 0;font-weight:650}
.ap-msg.ok{color:var(--ap-ok)}
.ap-msg.warn{color:var(--ap-warn)}
.ap-foot{margin-top:18px;color:var(--ap-muted);font-size:12.5px}
.ap-solo{max-width:460px;text-align:center;margin-top:12vh}
.ap-tabs{display:flex;gap:8px;margin:0 0 10px;flex-wrap:wrap}.ap-tab{min-height:36px;padding:6px 14px;border-radius:999px;border:1px solid var(--ap-line);background:var(--ap-card);color:var(--ap-text);font:inherit;font-weight:650;cursor:pointer}.ap-tab[aria-pressed=true]{background:var(--ap-accent);border-color:var(--ap-accent);color:#fff}.ap-video.f45{aspect-ratio:4/5}.ap-video.f11{aspect-ratio:1/1}.ap-ai{margin:14px 0 0;padding:10px 12px;border-radius:10px;border:1px solid var(--ap-line);color:var(--ap-muted);font-size:13px}.ap-ai strong{color:var(--ap-text)}
`

export default function ApproveClient() {
  const [token, setToken] = useState<string | null>(null)
  const [view, setView] = useState<View | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'invalid'>('loading')
  const [asking, setAsking] = useState(false)
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<{ kind: 'ok' | 'warn'; text: string } | null>(null)
  const [browserLang, setBrowserLang] = useState('en')
  const [fmt, setFmt] = useState(0) // KINEO-DEMO-SOB-MEDIDA-1510 — o formato à vista (0 = o vídeo da aprovação)

  useEffect(() => {
    setBrowserLang(parseInterfaceLanguage((navigator.language || 'en').slice(0, 2).toLowerCase()))
    const t = decodeURIComponent(window.location.hash.replace(/^#/, '')).trim()
    if (!t) { setState('invalid'); return }
    setToken(t)
    let stop = false
    void (async () => {
      try {
        const r = await fetch('/api/ads/v2/approval/view', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token: t }), cache: 'no-store' })
        const d = r.ok ? ((await r.json()) as View) : null
        if (stop) return
        if (!d || typeof d.video_url !== 'string') { setState('invalid'); return }
        setView(d)
        setState('ready')
      } catch {
        if (!stop) setState('invalid')
      }
    })()
    return () => { stop = true }
  }, [])

  const lang = parseInterfaceLanguage(view?.lang ?? browserLang)
  const c = adsV2PosEntregaCopy(lang)
  const dir = interfaceLanguageIsRtl(lang) ? 'rtl' : 'ltr'
  const dc = demoPageCopy(lang) // KINEO-DEMO-SOB-MEDIDA-1510
  const formats = view?.formats && view.formats.length > 1 ? view.formats : null // KINEO-DEMO-SOB-MEDIDA-1510 — os 3 formatos da mesma versão
  const shown = formats ? formats[Math.min(fmt, formats.length - 1)] : null // KINEO-DEMO-SOB-MEDIDA-1510

  async function decide(decision: 'approve' | 'changes') {
    if (!token || busy) return
    if (decision === 'changes' && !comment.trim()) { setNote({ kind: 'warn', text: c.pCommentRequired }); return }
    setBusy(true)
    setNote(null)
    try {
      const r = await fetch('/api/ads/v2/approval/decide', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token, decision, comment: decision === 'changes' ? comment.trim() : null }), cache: 'no-store' })
      const d = (await r.json().catch(() => ({}))) as { status?: View['status']; error?: string }
      if (r.ok && d.status) {
        setView((v) => (v ? { ...v, status: d.status as View['status'], decided: true } : v))
        setNote({ kind: 'ok', text: d.status === 'approved' ? c.pApproved : c.pSent })
      } else if (r.status === 409) {
        setView((v) => (v ? { ...v, decided: true } : v))
        setNote({ kind: 'warn', text: c.pAlready })
      } else {
        setNote({ kind: 'warn', text: r.status === 404 ? c.pInvalid : c.errGeneric })
      }
    } catch {
      setNote({ kind: 'warn', text: c.errGeneric })
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="ap" dir={dir} data-kineo="ads-approval-page">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      {state === 'loading' ? <div className="ap-solo" aria-busy="true" /> : null}
      {state === 'invalid' ? (
        <div className="ap-card ap-solo" role="alert"><p style={{ margin: 0 }}>{c.pInvalid}</p></div>
      ) : null}
      {state === 'ready' && view ? (
        <div className="ap-wrap">
          <div>{/* KINEO-DEMO-SOB-MEDIDA-1510 — 9:16 · 4:5 · 1:1 da mesma versão */}
            {formats ? (
              <div className="ap-tabs" role="group" aria-label={dc.formats}>
                {formats.map((f, i) => <button type="button" key={f.format} className="ap-tab" aria-pressed={(shown?.format ?? '') === f.format} onClick={() => setFmt(i)}>{f.format}</button>)}
              </div>
            ) : null}
            <video key={shown?.video_url ?? view.video_url} className={`ap-video${shown?.format === '4:5' ? ' f45' : shown?.format === '1:1' ? ' f11' : ''}`} src={shown?.video_url ?? view.video_url} controls playsInline preload="metadata" />
          </div>
          <section className="ap-card" aria-labelledby="ap-title">
            <p className="ap-from">{view.sample ? fillDemo(dc.sample, { brand: view.brand }) : fillPosEntrega(c.pFrom, { brand: view.brand })}</p>{/* KINEO-DEMO-SOB-MEDIDA-1510 — a amostra diz quem fez e para quem */}
            <h1 id="ap-title">{c.pTitle}</h1>
            {view.decided ? (
              <p className={`ap-msg ${view.status === 'approved' ? 'ok' : 'warn'}`} role="status">{note?.text ?? (view.status === 'approved' ? c.pApproved : view.status === 'changes_requested' ? c.pSent : c.pAlready)}</p>
            ) : (
              <>
                <div className="ap-actions">
                  <button type="button" className="ap-btn ok" disabled={busy} onClick={() => void decide('approve')}>{c.pApprove}</button>
                  <button type="button" className="ap-btn ghost" disabled={busy} aria-expanded={asking} onClick={() => setAsking((a) => !a)}>{c.pChanges}</button>
                </div>
                {asking ? (
                  <div>
                    <label htmlFor="ap-comment">{c.pComment}</label>
                    <textarea id="ap-comment" value={comment} maxLength={1000} onChange={(e) => setComment(e.target.value)} />
                    <div className="ap-actions" style={{ marginTop: 10 }}>
                      <button type="button" className="ap-btn ok" disabled={busy} onClick={() => void decide('changes')}>{c.pSend}</button>
                    </div>
                  </div>
                ) : null}
                {note ? <p className={`ap-msg ${note.kind}`} role="status">{note.text}</p> : null}
              </>
            )}
            <p className="ap-ai" data-kineo="ads-approval-ai-label">{view.ai_presenter ? <><strong>{dc.aiPresenter}</strong> </> : null}{adsV2AiLabelNotice(lang)}</p>{/* KINEO-DEMO-SOB-MEDIDA-1510 — feito com IA, e o apresentador de IA sempre rotulado */}
            {view.sample ? <p className="ap-foot">{dc.note}</p> : null}{/* KINEO-DEMO-SOB-MEDIDA-1510 — honestidade: material público, só para a marca ver */}
            <p className="ap-foot">{c.pPowered}</p>
          </section>
        </div>
      ) : null}
    </main>
  )
}
