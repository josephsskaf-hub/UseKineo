// KINEO-NUVEM-A1-2026-10-02 — moldura das portas públicas de produto (/ai-virtual-staging-video, /ai-video-clip-generator,
// /ai-actor-ads), no molde de app/ads/page.tsx: mora FORA de (dashboard) porque aquele layout força noindex, usa o Studio
// Kit e o Footer de sempre, e é só servidor (nenhum estado no navegador). Cada página passa o conteúdo; aqui só a casca,
// o CSS e as peças repetidas (passos, preço, perguntas).
import type { ReactNode } from 'react'
import Footer from '@/components/Footer'
import { KineoBrandIcon } from '@/components/KineoBolt'
import { AppearanceSettingsButton } from '@/components/AppearanceSettings'
import { InterfaceLanguageSelect } from '@/components/InterfaceLanguage'
import { STUDIO_KIT_CSS } from '@/components/studioKit'

export function ProductDoor({ product, children }: { product: string; children: ReactNode }) {
  return (
    <div className="stu pd-door">
      <style dangerouslySetInnerHTML={{ __html: STUDIO_KIT_CSS }} />
      <style dangerouslySetInnerHTML={{ __html: PRODUCT_DOOR_CSS }} />
      <div className="pd-wrap">
        <nav className="pd-nav" aria-label={`${product} navigation`}>
          <a href="/" className="pd-brand"><KineoBrandIcon size={26} />Kineo<span> / {product}</span></a>
          <div className="pd-nav-actions">
            <a href="/pricing" className="pd-navlink">Pricing</a>
            <InterfaceLanguageSelect />
            <AppearanceSettingsButton />
          </div>
        </nav>
        {children}
      </div>
      <Footer />
    </div>
  )
}

export function DoorSteps({ steps }: { steps: readonly { title: string; body: string }[] }) {
  return (
    <ol className="pd-how">
      {steps.map((s, i) => (
        <li className="step" key={s.title}>
          <b>{String(i + 1).padStart(2, '0')} · {s.title.toUpperCase()}</b>
          <p>{s.body}</p>
        </li>
      ))}
    </ol>
  )
}

export function DoorFaq({ items }: { items: readonly { q: string; a: ReactNode }[] }) {
  return (
    <div className="pd-faq">
      {items.map((it, i) => (
        <details key={it.q} open={i === 0}>
          <summary>{it.q}</summary>
          <p>{it.a}</p>
        </details>
      ))}
    </div>
  )
}

const PRODUCT_DOOR_CSS = `
.stu.pd-door{position:relative;z-index:1;padding:0 0 12px;background:var(--bg);color:var(--text)}
.stu.pd-door h1{background:none;color:var(--text);-webkit-text-fill-color:currentColor;font-size:clamp(31px,5vw,52px);line-height:1.08;letter-spacing:-.03em;margin:0 0 14px}
.stu.pd-door h2{font-size:clamp(22px,3vw,30px);font-weight:700;letter-spacing:-.02em;margin:0 0 6px;color:var(--text)}
.stu.pd-door .card,.stu.pd-door .step{background:var(--card);border-color:var(--border)}
.stu.pd-door .step{border-top-color:var(--accent)}
.stu.pd-door .step b{color:var(--accent)}
.stu.pd-door .step p,.stu.pd-door .hint{color:var(--muted)}
.stu.pd-door .go.ok{background:var(--indigo);color:var(--on-accent);box-shadow:var(--sh-cta)}
.pd-door .kineo-interface-language{color:var(--text)!important;background:var(--card)!important;border-color:var(--border)!important;color-scheme:inherit!important}
.pd-door .pd-wrap{max-width:1120px;margin:0 auto;padding:0 34px}
.pd-door p,.pd-door li,.pd-door summary,.pd-door td,.pd-door th{overflow-wrap:break-word}
.pd-door a:focus-visible,.pd-door summary:focus-visible{outline:3px solid var(--accent);outline-offset:3px;border-radius:8px}
.pd-nav{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px 18px;padding:18px 0;border-bottom:1px solid var(--border)}
.pd-nav-actions{display:flex;align-items:center;flex-wrap:wrap;gap:10px 16px}
.pd-brand{display:flex;align-items:center;gap:9px;color:var(--text);text-decoration:none;font-size:21px;font-weight:750;letter-spacing:-.02em}
.pd-brand span{font-size:12px;font-weight:500;color:var(--muted);letter-spacing:0}
.pd-navlink{font-size:13px;color:var(--accent);text-decoration:none;font-weight:600}
.pd-hero{padding:46px 0 10px;max-width:800px}
.pd-eyebrow{font-size:11px;font-weight:800;letter-spacing:.16em;color:var(--accent);margin:0 0 14px}
.pd-intro{font-size:16px;line-height:1.6;max-width:660px;margin:0 0 22px;color:var(--muted)}
.pd-cta{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
.pd-go{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:15px 22px;text-decoration:none;text-align:center;border-radius:12px;font-weight:700}
.pd-ghost{font-size:14px;color:var(--accent);text-decoration:none;font-weight:600;padding:8px 0}
.pd-ghost:hover{text-decoration:underline}
.pd-note{font-size:13px;color:var(--muted);margin:12px 0 0;line-height:1.5}
.pd-sec{margin:52px 0}
.pd-lede{font-size:14px;color:var(--muted);margin:0 0 18px;max-width:700px;line-height:1.55}
.pd-how{list-style:none;padding:0;margin:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px}
.pd-pairs{list-style:none;padding:0;margin:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px}
.pd-pair{display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:10px;border:1px solid var(--border);border-radius:16px;background:var(--card)}
.pd-pair figure{margin:0;position:relative}
.pd-pair img{width:100%;aspect-ratio:9/16;object-fit:cover;border-radius:10px;display:block;background:#000}
.pd-pair figcaption{position:absolute;top:8px;left:8px;font-size:11px;font-weight:800;color:#fff;background:#0009;padding:3px 8px;border-radius:6px}
.pd-pair p{grid-column:1 / -1;margin:4px 2px 0;font-size:13px;color:var(--text2)}
.pd-videos{list-style:none;padding:0;margin:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px}
.pd-videos video{width:100%;aspect-ratio:9/16;object-fit:cover;border-radius:14px;background:#000;display:block}
.pd-videos p{margin:6px 2px 0;font-size:13px;color:var(--text2)}
.pd-table-wrap{overflow-x:auto;border:1px solid var(--border);border-radius:14px;background:var(--card)}
.pd-table{width:100%;border-collapse:collapse;font-size:14px;min-width:520px}
.pd-table th,.pd-table td{padding:11px 14px;text-align:left;border-bottom:1px solid var(--border);vertical-align:top}
.pd-table th{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);font-weight:700}
.pd-table tr:last-child td{border-bottom:0}
.pd-table td b{color:var(--text)}
.pd-chips{display:flex;flex-wrap:wrap;gap:6px}
.pd-chips span{font-size:12px;background:var(--accent-soft);border:1px solid var(--border2);border-radius:999px;padding:2px 9px;color:var(--text2)}
.pd-price{list-style:none;padding:0;margin:0;display:grid;gap:8px;max-width:680px}
.pd-price li{display:flex;justify-content:space-between;gap:14px;padding:10px 14px;border:1px solid var(--border);border-radius:12px;background:var(--card);font-size:14px;color:var(--text2)}
.pd-price li b{color:var(--text);white-space:nowrap}
.pd-honest{font-size:13px;color:var(--muted);border-left:3px solid var(--accent);padding:4px 0 4px 12px;margin:18px 0 0;max-width:720px;line-height:1.55}
.pd-faq{max-width:820px}
.pd-faq details{border-bottom:1px solid var(--border);padding:14px 0}
.pd-faq summary{cursor:pointer;font-size:15px;font-weight:700;color:var(--text);min-height:28px}
.pd-faq details p{margin:10px 0 0;font-size:14px;line-height:1.65;color:var(--muted)}
.pd-faq a{color:var(--accent)}
@media(max-width:900px){
  .pd-door .pd-wrap{padding:0 16px}
  .pd-hero{padding-top:30px}
  .pd-sec{margin:38px 0}
  .pd-pairs{grid-template-columns:1fr}
}
`
