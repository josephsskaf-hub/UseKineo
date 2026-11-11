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
import { MOTOR_PADRAO, ROTULO_PADRAO, kling4AoVivo } from '@/lib/create/motorOpcional' // KINEO-MOTOR-OPCIONAL-1011
import { KLING4_PAID_COPY } from '@/lib/kling4PaidPresentation' // KINEO-MOTOR-OPCIONAL-1011 — o mesmo aviso de limites do Studio antigo
import { engineDisplayName } from '@/lib/enginePlanGate' // KINEO-MOTOR-OPCIONAL-1011 — o nome que a recusa do servidor usa

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
        {/* KINEO-MOTOR-OPCIONAL-1011 [fundador 10/11: "se a pessoa quiser escolher, ela tem que ter essa opção… se ela quiser um motor melhor"] —
            linha OPCIONAL e FECHADA: sem abrir, o filme sai no padrão, sem nome de motor. Abrir lê as flags da conta (o mesmo /api/me/credits do
            Studio antigo) e lista SÓ os motores que a conta pode usar hoje (lib/create/motorOpcional.ts, a régua do picker do Studio). Trancado
            leva aos planos e nunca vira o motor do pedido. Preço: nenhum aqui; o número segue SÓ no botão Generate (precoDoGenerate). */}
        <details className="ct-engine" data-create-engine="" onToggle={e => { if (e.currentTarget.open) c.abrirMotores() }}>
          <summary><span className="ct-lab">Engine</span><b data-engine-chosen={c.motor}>{c.motor === MOTOR_PADRAO ? ROTULO_PADRAO : engineDisplayName(c.motor)}</b><small>Optional <span aria-hidden="true">▾</span></small></summary>
          {c.motoresEstado === 'lendo' ? <p className="ct-engine-note" role="status">Checking which engines your account can use…</p> : null}
          {c.motores ? <div className="ct-engine-list" role="group" aria-label="Engine">
            <button type="button" className="ct-engine-opt" aria-pressed={c.motor === MOTOR_PADRAO} data-studio-engine={MOTOR_PADRAO} onClick={() => c.escolherMotor(MOTOR_PADRAO)}>{ROTULO_PADRAO}<small>Recommended</small></button>
            {c.motores.map(o => o.estado === 'livre'
              ? <button key={o.key} type="button" className="ct-engine-opt" aria-pressed={c.motor === o.key} data-studio-engine={o.key} onClick={() => c.escolherMotor(o.key)}>{o.nome}</button>
              : o.estado === 'trancado'
                ? <a key={o.key} className="ct-engine-opt ct-engine-locked" href={o.href} data-studio-engine-locked={o.key}>{o.nome}<small>{o.aviso}</small></a>
                : <button key={o.key} type="button" className="ct-engine-opt" disabled aria-disabled="true" data-studio-engine-paused={o.key}>{o.nome}<small>{o.aviso}</small></button>)}
          </div> : null}
          {c.motoresEstado === 'falhou' ? <p className="ct-engine-note" role="status">Could not check the other engines right now. Standard is ready.</p> : null}
          {c.motor === 'hollywood' && kling4AoVivo(c.kling4) ? <p className="ct-engine-note" data-kling4-film-limits="">{KLING4_PAID_COPY.limits}</p> : null}
          {c.motores ? <p className="ct-engine-note">The cost of your choice shows on the Generate button.</p> : null}
        </details>
        <div><label className="ct-lab" htmlFor="sm-lingua">Narration</label><select id="sm-lingua" className="ct-sel" value={c.lingua} onChange={e => c.setLingua(e.target.value)}><option value="auto">Same as my text</option>{NARRATION_LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.native}</option>)}</select></div>
        <label className="ct-check"><input type="checkbox" checked={c.palavraPorPalavra} onChange={e => c.setPalavraPorPalavra(e.target.checked)} />Narrate my text word for word</label>
        {/* KINEO-TELA-NOVA-ACABAMENTO-1011 [fundador 10/11: "em More Options você vai para a tela antiga… acho que está errado"] — os ajustes
            ficam AQUI (duração, formato, narração, palavra por palavra e, desde KINEO-MOTOR-OPCIONAL-1011, o motor). O que só o Studio antigo
            tem (logo, foto de quem estrela, câmera, modo clipe, Avatar) não some: link discreto no rodapé do passo. */}
        <p className="ct-advanced"><a href={c.maisOpcoes} data-kineo="studio-advanced">Advanced studio ↗</a><span> · logo, camera, star of the film</span></p>
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
  return <StudioSimples filmes={[]} motor={motor} campanha={campanha} ideiaInicial={ideiaInicial} moldura={c => <CreateShell tab="film" showRecreate={showRecreate} aoEscolher={c.escrever} painel={<PassosDoStudio c={c} preco={precoDoGenerate({ motor: c.motor, duracao: c.duracao, contaPaga: c.contaPaga, palavraPorPalavra: c.palavraPorPalavra, texto: c.texto, opcoesDuracao: c.opcoesDuracao, kling4: c.kling4 })} />} />} />
}
