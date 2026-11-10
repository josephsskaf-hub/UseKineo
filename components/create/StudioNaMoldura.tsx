'use client'

// KINEO-STUDIO-NA-MOLDURA-1011 [fundador 10/11: "Quero todas as telas com o design que fizemos no codex"]
// A aba Film É o Studio: a caixa única REAL (components/studio/StudioSimples.tsx — mesmo estado, mesmas recusas, mesmo gerar(), mesmo pedido
// para o /studio/create, mesmos eventos) desenhada na moldura do Recreate (CreateShell: abas, exemplo grande, galeria).
// Este arquivo só DESENHA: não tem estado de pedido, não chama rede, não cobra. O número do botão vem de precoDoGenerate (a função que cobra).
// Interruptor: CREATE_FILM_INPLACE (lib/create/release.ts). Guardião: scripts/test-studio-na-moldura-1011.mjs.
import StudioSimples, { type CaixaNaMoldura } from '@/components/studio/StudioSimples'
import CreateShell from './CreateShell'
import { NARRATION_LANGUAGES } from '@/lib/textLanguage'
import { LINHA_DO_FILME_GRATIS } from '@/lib/growth/filmeGratisNaCaixa'
import { precoDoGenerate } from '@/lib/create/filmNaMoldura'

export function PassosDoStudio({ c, preco }: { c: CaixaNaMoldura; preco: number | null }) {
  const temTexto = c.texto.trim().length > 0
  const states = [c.aviso ? 'error' : temTexto ? 'done' : 'active', 'todo', temTexto ? 'active' : 'todo'] as const // recusa do Studio = passo 1 em erro (rc-step-error do Recreate)
  const stateLabel = (s: (typeof states)[number]) => ({ todo: 'To do', active: 'Active', done: 'Done', error: 'Check' })[s]
  const marker = (n: number) => <span className="rc-step-number" aria-hidden="true">{states[n - 1] === 'done' ? '✓' : n}</span>
  return <>
    <div className="rc-progress"><span>{temTexto ? 'Ready to generate' : 'Start with your idea'}</span><div role="progressbar" aria-label="Steps completed" aria-valuemin={0} aria-valuemax={3} aria-valuenow={states.filter(s => s === 'done').length}>{states.map((s, i) => <i key={i} className={`rc-progress-${s}`} />)}</div></div>
    <section className={`rc-step rc-step-${states[0]}`} data-step-state={states[0]} aria-labelledby="sm-step1">
      <div className="rc-step-heading">{marker(1)}<h2 id="sm-step1">Your idea</h2><span className="rc-step-status">{stateLabel(states[0])}</span></div>
      <p className="rc-muted"><label htmlFor="sm-idea">What story would you like to tell?</label></p>
      <textarea id="sm-idea" ref={c.caixa} className="ct-idea" data-testid="studio-moldura-idea" value={c.texto} placeholder="One idea is enough. A finished film comes out: voiced, scored and captioned." onChange={e => c.escrever(e.target.value)} />
      {c.aviso ? <p className="ct-alert" role="alert">{c.aviso}</p> : null}
      <span className="ct-count" aria-live="off">{c.texto.trim().length} / {c.limiteMax}</span>
      <p className="ct-step-text">Or choose an example, then make it yours.</p>
    </section>
    <section className={`rc-step rc-step-${states[1]}`} data-step-state={states[1]} aria-label="Details"><details className="rc-adjustments">
      <summary>{marker(2)}<span>Details</span><small>{c.duracao} s · {c.formato} <span aria-hidden="true">＋</span></small></summary>
      <div className="rc-detail-body ct-details">
        <div><span className="ct-lab">Length</span><div className="ct-opts">{c.opcoesDuracao.map(d => <button key={d} type="button" className="ct-opt" aria-pressed={c.duracao === d} data-studio-duration={d} onClick={() => c.setDuracao(d)}>{d} s</button>)}</div></div>
        <div><span className="ct-lab">Format</span><div className="ct-opts">{c.formatos.map(f => <button key={f} type="button" className="ct-opt" aria-pressed={c.formato === f} data-studio-format={f} onClick={() => c.setFormato(f)}>{f}</button>)}</div></div>
        <div><label className="ct-lab" htmlFor="sm-lingua">Narration</label><select id="sm-lingua" className="ct-sel" value={c.lingua} onChange={e => c.setLingua(e.target.value)}><option value="auto">Same as my text</option>{NARRATION_LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.native}</option>)}</select></div>
        <label className="ct-check"><input type="checkbox" checked={c.palavraPorPalavra} onChange={e => c.setPalavraPorPalavra(e.target.checked)} />Narrate my text word for word</label>
        <a className="ct-more" href={c.maisOpcoes} data-kineo="studio-simple-more">More options ↗</a>
      </div>
    </details></section>
    <section className={`rc-step rc-generate-area rc-step-${states[2]}`} data-step-state={states[2]} aria-labelledby="sm-step3">
      <div className="rc-step-heading">{marker(3)}<h2 id="sm-step3">Create</h2><span className="rc-step-status">{stateLabel(states[2])}</span></div>
      <button type="button" className="rc-generate" data-testid="studio-simple-generate" aria-describedby="sm-generate-reason" disabled={!temTexto} onClick={c.gerar}>Generate{preco !== null && <span>✦ {preco}</span>}</button>
      <p className="rc-next-note" id="sm-generate-reason" role="status">{temTexto ? 'Nothing starts until you press Generate.' : 'Write your idea to continue.'}</p>
      {c.temFilmeGratis ? <p className="rc-next-note" data-testid="studio-free-film-line">{LINHA_DO_FILME_GRATIS}</p> : null}
    </section>
  </>
}

// KINEO-ENTRADAS-TELA-NOVA-1011 — ideiaInicial: a ideia do link (?ideia=), o MESMO prop que o /studio passa à caixa (só preenche; nada começa sozinho).
export default function StudioNaMoldura({ showRecreate, motor, campanha, ideiaInicial = '' }: { showRecreate: boolean; motor: string; campanha: string; ideiaInicial?: string }) {
  return <StudioSimples filmes={[]} motor={motor} campanha={campanha} ideiaInicial={ideiaInicial} moldura={c => <CreateShell tab="film" showRecreate={showRecreate} aoEscolher={c.escrever} painel={<PassosDoStudio c={c} preco={precoDoGenerate({ motor: c.motor, duracao: c.duracao, contaPaga: c.contaPaga, palavraPorPalavra: c.palavraPorPalavra, texto: c.texto, opcoesDuracao: c.opcoesDuracao })} />} />} />
}
