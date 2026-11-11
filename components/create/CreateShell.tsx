'use client'

// KINEO-TELA-NOVA-1011 [fundador 10/11: "Eu quero no ar os fluxos novos que a gente desenhou para o Recreate, para todos os outros fluxos"]
// A moldura aprovada do Recreate (mesmas classes rc-*, mesmo CSS, mesmo player) servindo Film, Cartoon e Ads. É CASCA: o passo 1 recebe a
// ideia e o "Continue" ENTREGA ao gerador que já existe. Aqui não há preço, crédito, débito, moderação nem geração.
// Dívida anotada: o RecreateClient ainda não usa estes componentes (repetimos a estrutura de classes e importamos o MESMO CSS).
import Link from 'next/link'
import { useEffect, useState, type ReactNode } from 'react'
import { KineoBrandIcon } from '@/components/KineoBolt'
import RecreatePlayer, { ExampleCover } from '@/app/recreate/RecreatePlayer'
import CreateTabs from './CreateTabs'
import CreateNavConta from './CreateNavConta' // KINEO-TELA-NOVA-CABECALHO-1011
import { trackClosedEvent } from '@/lib/analytics'
import { guardarRascunhoDoDesenho } from '@/lib/ads/rascunhoDoVisitante'
import { CARTOON_IDEA_MAX_CHARS, CREATE_COPY, CREATE_EVENTS, CREATE_EXAMPLES, FILM_IDEA_MAX_CHARS, adsContinueHref, cartoonContinueHref, cartoonDraft, continueBlocker, filmContinueHref, type CreateExample, type CreateTab } from '@/lib/create/tabs'
import '@/app/recreate/recreate.css'
import './create.css'

export function continueHref(tab: CreateTab, idea: string, signedIn: boolean): string {
  return tab === 'film' ? filmContinueHref(idea, signedIn) : tab === 'cartoon' ? cartoonContinueHref(signedIn) : adsContinueHref(signedIn)
}

// KINEO-STUDIO-NA-MOLDURA-1011 — `painel` (opcional) troca SÓ os passos do painel pelos do Studio real (StudioSimples); `aoEscolher` recebe a
// ideia do exemplo. Sem eles, o HTML é byte a byte o de antes (scripts/test-studio-na-moldura-1011.mjs).
export default function CreateShell({ tab, signedIn = true, showRecreate = true, painel, aoEscolher }: { tab: CreateTab; signedIn?: boolean; showRecreate?: boolean; painel?: ReactNode; aoEscolher?: (ideia: string) => void }) {
  const copy = CREATE_COPY[tab]
  const examples = CREATE_EXAMPLES[tab]
  const [example, setExample] = useState<CreateExample>(examples[0])
  const [idea, setIdea] = useState('')
  const maxChars = tab === 'film' ? FILM_IDEA_MAX_CHARS : CARTOON_IDEA_MAX_CHARS
  const blocker = continueBlocker(tab, idea)
  const ready = blocker === null
  const hasInput = copy.placeholder !== null

  useEffect(() => { void trackClosedEvent(CREATE_EVENTS.tabViewed, { tab }) }, [tab])

  function choose(e: CreateExample) {
    setExample(e)
    if (hasInput && e.idea) { if (aoEscolher) aoEscolher(e.idea.slice(0, maxChars)); else setIdea(e.idea.slice(0, maxChars)) }
    void trackClosedEvent(CREATE_EVENTS.exampleClicked, { tab, example: e.id })
    if (window.matchMedia('(max-width: 640px)').matches) window.requestAnimationFrame(() => document.querySelector('.rc-reference')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }
  function go() {
    if (!ready) return
    void trackClosedEvent(CREATE_EVENTS.continueClicked, { tab, has_text: idea.trim().length > 0 })
    if (tab === 'cartoon') guardarRascunhoDoDesenho(cartoonDraft(idea))
    window.location.assign(continueHref(tab, idea, signedIn))
  }

  const states = [hasInput ? (ready ? 'done' : 'active') : 'todo', 'todo', ready ? 'active' : 'todo'] as const
  const stateLabel = (s: (typeof states)[number]) => ({ todo: 'To do', active: 'Active', done: 'Done' })[s]
  const marker = (n: number) => <span className="rc-step-number" aria-hidden="true">{states[n - 1] === 'done' ? '✓' : n}</span>

  return <main className="recreate create-shell" data-create-shell={tab}>
    <header className="rc-nav ct-nav"><Link href="/" className="rc-brand"><KineoBrandIcon size={28} /><span>Kineo</span></Link><CreateTabs active={tab} showRecreate={showRecreate} /><CreateNavConta /></header>{/* KINEO-TELA-NOVA-CABECALHO-1011 — saldo · Pricing · My videos */}
    <div className="rc-workspace">
      <aside className="rc-panel" aria-label={copy.title}>
        <div className="rc-panel-intro"><span className="rc-eyebrow">{copy.eyebrow}</span><h1>{copy.title}</h1></div>
        {painel ?? <>
        <div className="rc-progress"><span>{ready ? 'Ready to continue' : 'Start with your idea'}</span><div role="progressbar" aria-label="Steps completed" aria-valuemin={0} aria-valuemax={3} aria-valuenow={states.filter(s => s === 'done').length}>{states.map((s, i) => <i key={i} className={`rc-progress-${s}`} />)}</div></div>
        <section className={`rc-step rc-step-${states[0]}`} data-step-state={states[0]} aria-labelledby="ct-step1">
          <div className="rc-step-heading">{marker(1)}<h2 id="ct-step1">{copy.step1}</h2><span className="rc-step-status">{hasInput ? stateLabel(states[0]) : 'Next screen'}</span></div>
          {hasInput ? <>
            <p className="rc-muted"><label htmlFor="ct-idea">{copy.step1Hint}</label></p>
            <textarea id="ct-idea" className="ct-idea" maxLength={maxChars} value={idea} placeholder={copy.placeholder ?? undefined} onChange={e => setIdea(e.target.value)} />
            <span className="ct-count" aria-live="off">{idea.length} / {maxChars}</span>
            <p className="ct-step-text">Or choose an example, then make it yours.</p>
          </> : <p className="ct-step-text">{copy.step1Hint}</p>}
        </section>
        <section className={`rc-step rc-step-${states[1]}`} data-step-state={states[1]} aria-label={copy.step2}><details className="rc-adjustments">
          <summary>{marker(2)}<span>{copy.step2}</span><small>Next screen <span aria-hidden="true">＋</span></small></summary>
          <div className="rc-detail-body"><p className="ct-step-text">{copy.step2Text}</p></div>
        </details></section>
        <section className={`rc-step rc-generate-area rc-step-${states[2]}`} data-step-state={states[2]} aria-labelledby="ct-step3">
          <div className="rc-step-heading">{marker(3)}<h2 id="ct-step3">{copy.step3}</h2><span className="rc-step-status">{stateLabel(states[2])}</span></div>
          <div className="ct-action-dock">
            <button type="button" className="rc-generate" data-create-continue={continueHref(tab, idea, signedIn)} aria-describedby="ct-continue-reason" disabled={!ready} onClick={go}>{copy.button} <span aria-hidden="true">→</span></button>
            <p className="rc-next-note" id="ct-continue-reason" role="status">{blocker ?? copy.note}</p>
          </div>
        </section>
        </>}
      </aside>
      <section className="rc-reference" aria-label={copy.stageTag.toLowerCase()}>
        <div className="rc-stage"><RecreatePlayer key={example.id} src={example.video} poster={example.poster} preview label={example.title}
          stage={{ kind: tab === 'film' ? 'Film example' : tab === 'cartoon' ? 'Cartoon example' : 'Ad example', title: example.title }} /></div>
      </section>
      <section className="rc-gallery" aria-label={copy.galleryTitle}>
        <div className="rc-gallery-heading"><h2>{copy.galleryTitle}</h2><p>{copy.galleryHint}</p></div>
        <div className="rc-grid">{examples.map((e, index) => <article key={e.id} className={`rc-card ${index % 4 === 1 ? 'rc-card-short' : ''} ${example.id === e.id ? 'rc-card-selected' : ''}`} data-create-example={e.id}>
          <ExampleCover src={e.video} poster={e.poster} label={`${hasInput ? 'Choose idea' : 'Preview'}: ${e.title}`} onSelect={() => choose(e)} />
          <div className="rc-card-bottom"><h3>{e.title}</h3><div><button type="button" onClick={() => choose(e)} aria-label={`${hasInput ? 'Use the idea' : 'View'}: ${e.title}`}>{example.id === e.id ? 'Selected ✓' : copy.useLabel}</button></div></div>
        </article>)}</div>
      </section>
    </div>
  </main>
}
