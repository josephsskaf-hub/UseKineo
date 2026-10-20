'use client'

// KINEO-BEBE-QUE-FALA-2010 — a tela do template "AI Kids Cartoon Stories" (/kids-cartoon). Regras, listas e textos em
// lib/kidsCartoon/kidsCartoon.ts (puro); quem valida e escreve é o servidor (/api/kids-cartoon/story). A tela não mostra preço:
// o crédito aparece só no botão de gerar do Studio (o do Seedance 1.5 para a duração), para onde "Make my cartoon" leva.
import Link from 'next/link'
import { useState } from 'react'
import { useInterfaceLanguage } from '@/components/InterfaceLanguage'
import { trackEvent } from '@/lib/analytics'
import {
  KIDS_CARTOON_DEFAULT_DURATION,
  KIDS_CARTOON_DURATIONS,
  KIDS_CARTOON_ENGINE_LABEL,
  KIDS_CARTOON_LANGUAGES,
  KIDS_CHARACTERS,
  KIDS_IDEAS,
  KIDS_IDEA_MAX_CHARS,
  isKidsCartoonLanguage,
  kidsTemplateCopy,
  type KidsCartoonDuration,
  type KidsCartoonLanguage,
  type KidsCharacterId,
  type KidsIdeaId,
} from '@/lib/kidsCartoon/kidsCartoon'

const LANG_LABEL: Record<KidsCartoonLanguage, string> = { en: 'English', pt: 'Português', es: 'Español' }

export const KIDS_TEMPLATE_CSS = `
.kkc{--bg:#F7F7F5;--card:#fff;--line:#E4E4E0;--txt:#0E1116;--muted:#5A5F67;--blue:#0A5CFF;--soft:#E8EFFF;max-width:980px;margin:0 auto;padding:28px 20px 64px;color:var(--txt);font-family:var(--font-sans),Inter,system-ui,sans-serif}
html[data-theme=dark] .kkc{--bg:#07090D;--card:#10141B;--line:#1F2530;--txt:#F2F4F7;--muted:#9AA3B2;--blue:#4D8DFF;--soft:#12203A}
.kkc h1{font-size:clamp(1.6rem,3vw,2.3rem);letter-spacing:-.03em;margin:10px 0 6px;font-weight:820}
.kkc-badge{display:inline-flex;gap:7px;align-items:center;font-size:11px;font-weight:800;letter-spacing:.11em;padding:6px 10px;border-radius:999px;background:var(--soft);color:var(--blue)}
.kkc-lead{color:var(--muted);margin:0 0 22px;line-height:1.55;max-width:62ch}
.kkc-sec{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:18px;margin:0 0 14px}
.kkc-sec h2{font-size:14px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin:0 0 12px;font-weight:800}
.kkc-chars{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px}
.kkc-char{display:flex;flex-direction:column;align-items:center;gap:6px;padding:10px 6px;border-radius:14px;border:2px solid var(--line);background:transparent;color:inherit;cursor:pointer;font:inherit}
.kkc-char[aria-pressed=true]{border-color:var(--blue);background:var(--soft)}
.kkc-face{width:64px;height:64px;border-radius:50%;display:grid;place-items:center;font-weight:800;font-size:24px;color:#fff;background:linear-gradient(135deg,#FFB347,#FF6F91 55%,#7B6CFF);overflow:hidden}
.kkc-face img{width:100%;height:100%;object-fit:cover}
.kkc-char b{font-size:14px}.kkc-char span{font-size:12px;color:var(--muted)}
.kkc textarea{width:100%;min-height:72px;border-radius:12px;border:1px solid var(--line);padding:12px;font:inherit;background:transparent;color:inherit;resize:vertical}
.kkc-chips{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0 0}
.kkc-chip{border:1px solid var(--line);background:transparent;color:inherit;border-radius:999px;padding:7px 12px;font:inherit;font-size:13px;cursor:pointer}
.kkc-chip[aria-pressed=true]{border-color:var(--blue);background:var(--soft);color:var(--blue)}
.kkc-row{display:flex;flex-wrap:wrap;gap:24px}
.kkc-seg{display:inline-flex;border:1px solid var(--line);border-radius:999px;padding:3px}
.kkc-seg button{border:0;background:transparent;color:inherit;font:inherit;font-size:14px;padding:7px 14px;border-radius:999px;cursor:pointer}
.kkc-seg button[aria-pressed=true]{background:var(--blue);color:#fff}
.kkc-go{display:inline-flex;align-items:center;gap:8px;border:0;border-radius:999px;background:var(--blue);color:#fff!important;font:inherit;font-weight:750;font-size:15px;padding:13px 22px;cursor:pointer;text-decoration:none}
.kkc-go[disabled]{opacity:.55;cursor:default}
.kkc-ghost{border:1px solid var(--line);background:transparent;color:inherit;border-radius:999px;padding:11px 18px;font:inherit;cursor:pointer}
.kkc-err{color:#C62828;margin:10px 0 0;font-size:14px}
.kkc-note{color:var(--muted);font-size:13px;margin:8px 0 0;line-height:1.5}
.kkc-story{font-size:1.05rem;line-height:1.6;margin:0 0 14px;white-space:pre-wrap}
.kkc-cap{display:flex;gap:10px;align-items:flex-start;background:var(--soft);border-radius:12px;padding:12px;font-size:14px;line-height:1.5;margin:12px 0 0}
.kkc-cap p{margin:0;flex:1}
@media (max-width:760px){.kkc{padding:18px 16px 48px}.kkc-chars{grid-template-columns:repeat(3,minmax(0,1fr))}.kkc-go{width:100%;justify-content:center}}
`

export default function KidsCartoonTemplate() {
  const ui = useInterfaceLanguage()
  const t = kidsTemplateCopy(ui)
  const ideaLang: KidsCartoonLanguage = isKidsCartoonLanguage(ui) ? ui : 'en'
  const [character, setCharacter] = useState<KidsCharacterId>('leo')
  const [idea, setIdea] = useState('')
  const [ideaId, setIdeaId] = useState<KidsIdeaId | null>(null)
  const [language, setLanguage] = useState<KidsCartoonLanguage>(ideaLang)
  const [duration, setDuration] = useState<KidsCartoonDuration>(KIDS_CARTOON_DEFAULT_DURATION)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ script: string; href: string; caption: string } | null>(null)
  const [copied, setCopied] = useState(false)

  async function write() {
    setBusy(true); setError(null); setResult(null); setCopied(false)
    try {
      const res = await fetch('/api/kids-cartoon/story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ character, language, duration, idea: idea.trim(), ideaId }),
      })
      const data = await res.json().catch(() => ({})) as { script?: string; href?: string; caption?: string; error?: string }
      if (!res.ok || !data.script || !data.href) { setError(data.error ?? 'Something went wrong. Nothing was charged — please try again.'); return }
      setResult({ script: data.script, href: data.href, caption: data.caption ?? '' })
      void trackEvent('kids_cartoon_story_ready', { character, language, duration, idea_id: ideaId })
    } catch {
      setError('Network error. Nothing was charged — please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="kkc" data-kids-cartoon="template">
      <style dangerouslySetInnerHTML={{ __html: KIDS_TEMPLATE_CSS }} />
      <span className="kkc-badge">{KIDS_CARTOON_ENGINE_LABEL} · 3D</span>
      <h1>{t.title}</h1>
      <p className="kkc-lead">{t.lead}</p>

      <section className="kkc-sec" aria-label={t.character}>
        <h2>{t.character}</h2>
        <div className="kkc-chars">
          {KIDS_CHARACTERS.map((c) => (
            <button key={c.id} type="button" className="kkc-char" aria-pressed={character === c.id} onClick={() => setCharacter(c.id)} data-kids-character={c.id}>
              <span className="kkc-face" aria-hidden="true">{c.portrait ? <img src={c.portrait} alt="" /> : c.name.slice(0, 1)}</span>
              <b>{c.name}</b>
              <span>{c.kind[ideaLang]}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="kkc-sec" aria-label={t.idea}>
        <h2>{t.idea}</h2>
        <textarea value={idea} maxLength={KIDS_IDEA_MAX_CHARS} placeholder={t.ideaPlaceholder} onChange={(e) => { setIdea(e.target.value); setIdeaId(null) }} />
        <p className="kkc-note">{t.ready}</p>
        <div className="kkc-chips">
          {KIDS_IDEAS.map((i) => (
            <button key={i.id} type="button" className="kkc-chip" aria-pressed={ideaId === i.id} onClick={() => { setIdeaId(i.id); setIdea('') }} data-kids-idea={i.id}>{i[ideaLang]}</button>
          ))}
        </div>
      </section>

      <section className="kkc-sec">
        <div className="kkc-row">
          <div>
            <h2>{t.language}</h2>
            <div className="kkc-seg">{KIDS_CARTOON_LANGUAGES.map((l) => <button key={l} type="button" aria-pressed={language === l} onClick={() => setLanguage(l)}>{LANG_LABEL[l]}</button>)}</div>
          </div>
          <div>
            <h2>{t.duration}</h2>
            <div className="kkc-seg">{KIDS_CARTOON_DURATIONS.map((d) => <button key={d} type="button" aria-pressed={duration === d} onClick={() => setDuration(d)}>{d} s</button>)}</div>
          </div>
        </div>
        <p className="kkc-note">{t.rules}</p>
      </section>

      {!result ? (
        <div>
          <button type="button" className="kkc-go" onClick={write} disabled={busy || (!idea.trim() && !ideaId)}>{busy ? t.writing : t.write} <span aria-hidden="true">→</span></button>
          {error ? <p className="kkc-err" role="alert">{error}</p> : null}
        </div>
      ) : (
        <section className="kkc-sec" aria-label={t.story} data-kids-story="1">
          <h2>{t.story}</h2>
          <p className="kkc-story">{result.script}</p>
          <div className="kkc-row" style={{ gap: 12, alignItems: 'center' }}>
            <Link className="kkc-go" href={result.href} onClick={() => { void trackEvent('kids_cartoon_make_clicked', { character, language, duration }) }}>{t.make} <span aria-hidden="true">→</span></Link>
            <button type="button" className="kkc-ghost" onClick={write} disabled={busy}>{busy ? t.writing : t.again}</button>
          </div>
          <p className="kkc-note">{t.makeNote}</p>
          <div className="kkc-cap">
            <p><b>{t.caption}</b><br />{result.caption}<br /><small>{t.label}</small></p>
            <button type="button" className="kkc-ghost" onClick={() => { try { void navigator.clipboard.writeText(result.caption); setCopied(true) } catch { /* sem área de transferência */ } }}>{copied ? t.copied : t.copy}</button>
          </div>
        </section>
      )}
    </main>
  )
}
