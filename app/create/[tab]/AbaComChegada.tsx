'use client'

// KINEO-ENTRADAS-CARTOES-1011 [fundador 10/11, vídeo logado: "Make my ad", "Make my UGC ad" e "Make my cartoon" abriram a tela ANTIGA]
// As abas Ads e Cartoon quando a chegada traz dado (o cartão da home: ?entry=product|ugc&utm_source=home_card · ?utm_source=home_card).
// A moldura é a MESMA (CreateShell, sem mexer nela: o painel entra pela prop `painel`, como no Film); os passos são os de hoje, com as mesmas
// classes, textos, travas e eventos (create_continue_clicked {tab, has_text}; Cartoon grava o rascunho que o template relê). A única diferença:
// o botão leva ao gerador de hoje COM a chegada (destinoDaChegada em lib/create/entry.ts: /ads/v2?entry=…&utm_source=… — o /ads/v2 lê `entry`
// como sempre e abre no formato do cartão; /kids-cartoon?utm_source=…). Sem chegada, a página usa a CreateShell de sempre (este arquivo não entra).
// Nada aqui gera, cobra ou mostra preço.
import { useState } from 'react'
import CreateShell from '@/components/create/CreateShell' // fora de components/create (diretório em obra do GPT, 11/11)
import { trackClosedEvent } from '@/lib/analytics'
import { guardarRascunhoDoDesenho } from '@/lib/ads/rascunhoDoVisitante'
import { CARTOON_IDEA_MAX_CHARS, CREATE_COPY, CREATE_EVENTS, cartoonDraft, continueBlocker } from '@/lib/create/tabs'

export default function AbaComChegada({ tab, showRecreate, destino }: { tab: 'ads' | 'cartoon'; showRecreate: boolean; destino: string }) {
  const [idea, setIdea] = useState('')
  const copy = CREATE_COPY[tab]
  const hasInput = copy.placeholder !== null
  const blocker = continueBlocker(tab, idea)
  const ready = blocker === null
  const states = [hasInput ? (ready ? 'done' : 'active') : 'todo', 'todo', ready ? 'active' : 'todo'] as const
  const stateLabel = (s: (typeof states)[number]) => ({ todo: 'To do', active: 'Active', done: 'Done' })[s]
  const marker = (n: number) => <span className="rc-step-number" aria-hidden="true">{states[n - 1] === 'done' ? '✓' : n}</span>
  function go() {
    if (!ready) return
    void trackClosedEvent(CREATE_EVENTS.continueClicked, { tab, has_text: idea.trim().length > 0 })
    if (tab === 'cartoon') guardarRascunhoDoDesenho(cartoonDraft(idea))
    window.location.assign(destino)
  }
  const painel = <>
    <div className="rc-progress"><span>{ready ? 'Ready to continue' : 'Start with your idea'}</span><div role="progressbar" aria-label="Steps completed" aria-valuemin={0} aria-valuemax={3} aria-valuenow={states.filter(s => s === 'done').length}>{states.map((s, i) => <i key={i} className={`rc-progress-${s}`} />)}</div></div>
    <section className={`rc-step rc-step-${states[0]}`} data-step-state={states[0]} aria-labelledby="ct-step1">
      <div className="rc-step-heading">{marker(1)}<h2 id="ct-step1">{copy.step1}</h2><span className="rc-step-status">{hasInput ? stateLabel(states[0]) : 'Next screen'}</span></div>
      {hasInput ? <>
        <p className="rc-muted"><label htmlFor="ct-idea">{copy.step1Hint}</label></p>
        <textarea id="ct-idea" className="ct-idea" maxLength={CARTOON_IDEA_MAX_CHARS} value={idea} placeholder={copy.placeholder ?? undefined} onChange={e => setIdea(e.target.value)} />
        <span className="ct-count" aria-live="off">{idea.length} / {CARTOON_IDEA_MAX_CHARS}</span>
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
        <button type="button" className="rc-generate" data-create-continue={destino} aria-describedby="ct-continue-reason" disabled={!ready} onClick={go}>{copy.button} <span aria-hidden="true">→</span></button>
        <p className="rc-next-note" id="ct-continue-reason" role="status">{blocker ?? copy.note}</p>
      </div>
    </section>
  </>
  return <CreateShell tab={tab} showRecreate={showRecreate} painel={painel} aoEscolher={hasInput ? (ideia: string) => setIdea(ideia.slice(0, CARTOON_IDEA_MAX_CHARS)) : undefined} />
}
