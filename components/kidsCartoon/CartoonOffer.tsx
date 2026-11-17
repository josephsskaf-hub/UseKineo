'use client'

import Link from 'next/link'
import { useState } from 'react'
import { CREATE_EXAMPLES } from '@/lib/create/tabs'
import { KIDS_PLANS_PATH } from '@/lib/kidsCartoon/kidsCartoon'

// D2-DESENHO-1711: presentation only. Existing house media, no generation or price.
const COPY = {
  en: { heading: 'Your story, as a cartoon', examples: 'Made with Kineo', receive: 'What you get', facts: ['15 or 35 seconds · vertical video', 'Narration and optional captions', 'Read and edit the story before generating'], note: 'Cartoons are included in paid plans and use your plan credits.', proof: 'Real Kineo examples. In this generator, choose one of the characters below. Small details can vary between scenes.', review: 'Your idea → review the story → create and download', plans: 'See plans' },
  pt: { heading: 'Sua história em desenho', examples: 'Feitos com a Kineo', receive: 'O que você recebe', facts: ['15 ou 35 segundos · vídeo vertical', 'Narração e legenda opcional', 'Leia e edite a história antes de gerar'], note: 'Os desenhos fazem parte dos planos pagos e usam os créditos do plano.', proof: 'Exemplos reais da Kineo. Neste gerador, escolha um dos personagens abaixo. Pequenos detalhes podem variar entre cenas.', review: 'Sua ideia → revise a história → crie e baixe', plans: 'Ver planos' },
  es: { heading: 'Tu historia en dibujos', examples: 'Hechos con Kineo', receive: 'Qué recibes', facts: ['15 o 35 segundos · vídeo vertical', 'Narración y subtítulos opcionales', 'Lee y edita el cuento antes de generar'], note: 'Los dibujos forman parte de los planes de pago y usan los créditos del plan.', proof: 'Ejemplos reales de Kineo. En este generador, elige uno de los personajes de abajo. Algunos detalles pueden variar entre escenas.', review: 'Tu idea → revisa el cuento → crea y descarga', plans: 'Ver planes' },
} as const
const copyFor = (language: string) => language === 'pt' ? COPY.pt : language === 'es' ? COPY.es : COPY.en

export const CARTOON_OFFER_CSS = `
.kcd-offer{color:var(--text);border:1px solid var(--border);background:var(--card);border-radius:18px;padding:20px;margin:0 0 20px;display:grid;grid-template-columns:minmax(220px,1fr) auto;gap:24px;align-items:center;min-width:0}
.kcd-offer *{box-sizing:border-box}.kcd-offer h2{font-size:22px;letter-spacing:-.025em;margin:5px 0 12px}.kcd-kicker{color:var(--accent);font-size:12px;font-weight:700;margin:0}.kcd-facts{list-style:none;padding:0;margin:0;display:grid;gap:8px;font-size:14px;line-height:1.5}.kcd-facts li:before{content:'✓';color:var(--accent);margin-inline-end:8px}.kcd-note{font-size:13px;line-height:1.5;color:var(--muted);margin:12px 0 0}
.kcd-examples{min-width:0}.kcd-examples>h3{font-size:13px;margin:0 0 9px}.kcd-strip{display:grid;grid-template-columns:repeat(3,minmax(0,135px));justify-content:center;gap:12px}.kcd-strip figure{margin:0;min-width:0}.kcd-strip video,.kcd-play{display:block;width:100%;aspect-ratio:9 / 16;height:auto;object-fit:contain;background:#101113;border-radius:12px}.kcd-play{position:relative;padding:0;border:0;cursor:pointer;overflow:hidden}.kcd-play img{width:100%;height:100%;object-fit:contain}.kcd-play span{position:absolute;inset:0;display:grid;place-items:center;color:#fff;text-shadow:0 1px 7px #000;font-size:30px;background:#0001}.kcd-play:focus-visible{outline:3px solid var(--accent);outline-offset:3px}.kcd-strip figcaption{font-size:12px;line-height:1.4;margin-top:7px}.kcd-proof{font-size:12px;line-height:1.5;color:var(--muted);margin:10px 0 0}
.kcd-compact{display:block;padding:16px;border-radius:12px;margin:16px 0}.kcd-compact h2{font-size:16px}.kcd-compact .kcd-facts{font-size:13px}
.kcd-dock{position:relative;width:100%;margin:20px auto 0;max-width:640px;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:12px 16px;border:1px solid var(--border);border-radius:15px;background:var(--card);color:var(--text);box-shadow:0 8px 35px #0002;font-size:13px;line-height:1.4}.kcd-dock p{margin:0;max-width:380px}.kcd-dock a{display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;min-height:44px;padding:10px 20px;background:var(--indigo,var(--accent));color:var(--on-accent,#fff);border-radius:10px;text-decoration:none;font-weight:700}.kcd-dock a:focus-visible{outline:3px solid var(--text);outline-offset:3px}
@media(max-width:700px){.kcd-offer{grid-template-columns:1fr;gap:16px;padding:16px}.kcd-offer h2{font-size:20px}.kcd-strip{grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.kcd-strip figcaption{font-size:11px}.kcd-dock{gap:10px;padding:10px 12px}.kcd-dock p{font-size:11px;max-width:190px}.kcd-dock a{padding:10px 14px;font-size:13px}.kcd-compact{padding:14px}.kcd-compact h2{font-size:16px}}
`

export function CartoonExample({ example, label }: { example: (typeof CREATE_EXAMPLES.cartoon)[number]; label: string }) {
  const [playing, setPlaying] = useState(false)
  return <figure>{playing
    ? <video controls autoPlay playsInline preload="none" src={example.video} poster={example.poster} aria-label={`${label}: ${example.title}`} />
    : <button type="button" className="kcd-play" aria-label={`${label}: ${example.title}`} onClick={() => setPlaying(true)}><img src={example.poster} alt="" /><span aria-hidden="true">▶</span></button>}
    <figcaption>{example.title}</figcaption>
  </figure>
}

export default function CartoonOffer({ language = 'en', compact = false }: { language?: string; compact?: boolean }) {
  const c = copyFor(language)
  return <section className={`kcd-offer${compact ? ' kcd-compact' : ''}`} aria-label={c.receive}>
    <div><p className="kcd-kicker">{c.receive}</p><h2>{compact ? c.heading : c.examples}</h2>
      <ul className="kcd-facts">{c.facts.map(f => <li key={f}>{f}</li>)}</ul>
      <p className="kcd-note">{c.note}</p>
    </div>
    {compact ? null : <div className="kcd-examples"><h3>{c.heading}</h3><div className="kcd-strip">
      {CREATE_EXAMPLES.cartoon.map(e => <CartoonExample key={e.id} example={e} label={c.examples} />)}
    </div><p className="kcd-proof">{c.proof}</p></div>}
  </section>
}

export function CartoonPurchaseDock({ language = 'en', onPlans }: { language?: string; onPlans?: () => void }) {
  const c = copyFor(language)
  return <nav className="kcd-dock" aria-label={c.plans} data-cartoon-purchase="">
    <p>{c.note}</p><Link href={KIDS_PLANS_PATH} onClick={onPlans}>{c.plans} <span aria-hidden="true">→</span></Link>
  </nav>
}
