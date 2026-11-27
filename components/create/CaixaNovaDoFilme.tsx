'use client'

// The Film box uses the same Studio draft and generation handoff. More edits optional settings in place.
import { useFilmAdvanced } from './FilmAdvancedSettings'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { CaixaNaMoldura } from '@/components/studio/StudioSimples'
import { KineoBrandIcon } from '@/components/KineoBolt'
import CreateTabs from './CreateTabs'
import CreateNavConta from './CreateNavConta'
import CaixaDeCriar, { type ChipDaCaixa, type ExemploDaCaixa } from './CaixaDeCriar'
import { trackClosedEvent } from '@/lib/analytics'
import { CREATE_EVENTS, CREATE_EXAMPLES, FILM_IDEA_MAX_CHARS } from '@/lib/create/tabs'
import { NARRATION_LANGUAGES } from '@/lib/textLanguage'
import { LINHA_DO_FILME_GRATIS } from '@/lib/growth/filmeGratisNaCaixa'
import { MOTOR_PADRAO, ROTULO_PADRAO, kling4AoVivo } from '@/lib/create/motorOpcional'
import { KLING4_PAID_COPY } from '@/lib/kling4PaidPresentation'
import { engineDisplayName } from '@/lib/enginePlanGate'
import { CAIXA_NOVA_CONFIANCA, CAIXA_NOVA_EXEMPLOS_DICA, CAIXA_NOVA_EXEMPLOS_TITULO, CAIXA_NOVA_FOTO_FILME, CAIXA_NOVA_PLACEHOLDER, CAIXA_NOVA_TITULO } from '@/lib/create/caixaNovaTexto'
import '@/app/recreate/recreate.css'
import './create.css'

const ICONE = {
  tempo: <svg viewBox="0 0 16 16" width="15" height="15"><circle cx="8" cy="8.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.6" /><path d="M8 5.5v3l2 1.4M6.5 1.5h3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>,
  formato: <svg viewBox="0 0 16 16" width="15" height="15"><rect x="4" y="1.5" width="8" height="13" rx="1.8" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>,
  voz: <svg viewBox="0 0 16 16" width="15" height="15"><rect x="5.5" y="1.5" width="5" height="8.5" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.6" /><path d="M3 8a5 5 0 0 0 10 0M8 13v2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>,
  motor: <svg viewBox="0 0 16 16" width="15" height="15"><path d="M8 1.5l1.6 4.2 4.4.3-3.4 2.8 1.1 4.3L8 10.7l-3.7 2.4 1.1-4.3L2 6l4.4-.3z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></svg>,
  mais: <svg viewBox="0 0 16 16" width="15" height="15"><path d="M2 4h7M13 4h1M2 12h1M7 12h7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /><circle cx="11" cy="4" r="2" fill="none" stroke="currentColor" strokeWidth="1.6" /><circle cx="5" cy="12" r="2" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>,
}

const linguaCurta = (l: string) => l === 'auto' ? 'Auto voice' : NARRATION_LANGUAGES.find(x => x.code === l)?.native ?? l

export function chipsDoFilme(c: CaixaNaMoldura, advanced: ReturnType<typeof useFilmAdvanced>): ChipDaCaixa[] {
  const opcao = (pressed: boolean, rotulo: string, aoClicar: () => void, dado: Record<string, string>) =>
    <button key={rotulo} type="button" className="cx-opcao" aria-pressed={pressed} onClick={aoClicar} {...dado}>{rotulo}</button>
  return [
    { id: 'duracao', nome: 'Length', icone: ICONE.tempo, valor: `${c.duracao} s`,
      menu: f => <div className="cx-opcoes">{c.opcoesDuracao.map(d => opcao(c.duracao === d, `${d} s`, () => { c.setDuracao(d); f() }, { 'data-studio-duration': String(d) }))}</div> },
    { id: 'formato', nome: 'Format', icone: ICONE.formato, valor: c.formato,
      menu: f => <div className="cx-opcoes">{c.formatos.map(x => opcao(c.formato === x, x, () => { c.setFormato(x); f() }, { 'data-studio-format': x }))}</div> },
    { id: 'narracao', nome: 'Narration', icone: ICONE.voz, valor: linguaCurta(c.lingua) + (c.palavraPorPalavra ? ' · word for word' : ''),
      menu: () => <div className="cx-pilha">
        <label className="cx-rotulo" htmlFor="cx-lingua">Language of the voice</label>
        <select id="cx-lingua" className="cx-sel" value={c.lingua} onChange={e => c.setLingua(e.target.value)}><option value="auto">Same as my text</option>{NARRATION_LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.native}</option>)}</select>
        <label className="cx-marcar"><input type="checkbox" checked={c.palavraPorPalavra} onChange={e => c.setPalavraPorPalavra(e.target.checked)} />Narrate my text word for word</label>
      </div> },
    // KINEO-MOTOR-OPCIONAL-1011 — OPCIONAL: sem abrir, o filme sai no padrão ("Standard"). Abrir lê as flags (c.abrirMotores) e lista só o que
    // a conta pode usar; trancado leva aos planos e nunca vira o motor do pedido. Selo honesto: o nome é o do motor real (engineDisplayName).
    { id: 'motor', nome: 'Engine', icone: ICONE.motor, valor: c.motor === MOTOR_PADRAO ? ROTULO_PADRAO : engineDisplayName(c.motor), aoAbrir: c.abrirMotores,
      menu: f => <div className="cx-pilha" data-create-engine="">
        {c.motoresEstado === 'lendo' ? <p className="cx-nota-menu" role="status">Checking which engines your account can use…</p> : null}
        {c.motores ? <div className="cx-lista" role="group" aria-label="Engine">
          <button type="button" className="cx-opcao cx-opcao-larga" aria-pressed={c.motor === MOTOR_PADRAO} data-studio-engine={MOTOR_PADRAO} onClick={() => { c.escolherMotor(MOTOR_PADRAO); f() }}>{ROTULO_PADRAO}<small>Recommended</small></button>
          {c.motores.map(o => o.estado === 'livre'
            ? <button key={o.key} type="button" className="cx-opcao cx-opcao-larga" aria-pressed={c.motor === o.key} data-studio-engine={o.key} onClick={() => { c.escolherMotor(o.key); f() }}>{o.nome}</button>
            : o.estado === 'trancado'
              ? <a key={o.key} className="cx-opcao cx-opcao-larga cx-trancado" href={o.href} data-studio-engine-locked={o.key}>{o.nome}<small>{o.aviso}</small></a>
              : <button key={o.key} type="button" className="cx-opcao cx-opcao-larga" disabled aria-disabled="true" data-studio-engine-paused={o.key}>{o.nome}<small>{o.aviso}</small></button>)}
        </div> : null}
        {c.motoresEstado === 'falhou' ? <p className="cx-nota-menu" role="status">Could not check the other engines right now. Standard is ready.</p> : null}
        {c.motor === 'hollywood' && kling4AoVivo(c.kling4) ? <p className="cx-nota-menu" data-kling4-film-limits="">{KLING4_PAID_COPY.limits}</p> : null}
        {c.motores ? <p className="cx-nota-menu">The cost of your choice shows on the Generate button.</p> : null}
      </div> },
    { id: 'mais', nome: 'Advanced setup', icone: ICONE.mais, valor: 'More', inline: true, aoAbrir: advanced.open, menu: () => advanced.panel },
  ]
}

export default function CaixaNovaDoFilme({ c, preco, showRecreate, showClip }: { c: CaixaNaMoldura; preco: number | null; showRecreate: boolean; showClip: boolean }) {
  const advanced = useFilmAdvanced(c)
  const exemplos = CREATE_EXAMPLES.film
  const [ativo, setAtivo] = useState<ExemploDaCaixa | null>(null)
  const palco = ativo ?? exemplos[0] ?? null

  useEffect(() => { void trackClosedEvent(CREATE_EVENTS.tabViewed, { tab: 'film', box: 'caixa_nova' }) }, [])

  function escolher(e: ExemploDaCaixa) {
    const ideia = exemplos.find(x => x.id === e.id)?.idea
    setAtivo(e)
    if (ideia) c.escrever(ideia.slice(0, FILM_IDEA_MAX_CHARS)) // só PREENCHE: o filme nunca começa sozinho
    void trackClosedEvent(CREATE_EVENTS.exampleClicked, { tab: 'film', example: e.id, box: 'caixa_nova' })
    window.requestAnimationFrame(() => c.caixa.current?.focus())
  }

  return <main className="recreate create-shell cx-tela" data-create-shell="film" data-caixa-nova-tela="">
    <header className="rc-nav ct-nav"><Link href="/" className="rc-brand"><KineoBrandIcon size={28} /><span>Kineo</span></Link><CreateTabs active="film" showRecreate={showRecreate} showClip={showClip} />{!c.visitor && <CreateNavConta />}</header>
    <div className="cx-area">
      <div className="cx-coluna">
        <CaixaDeCriar
          titulo={CAIXA_NOVA_TITULO}
          filmStylePicker={c.filmStylePicker}
          filmVoicePicker={c.filmVoicePicker}
          texto={c.texto} aoEscrever={c.escrever} caixaRef={c.caixa} placeholder={CAIXA_NOVA_PLACEHOLDER} aviso={c.aviso} limiteMax={c.limiteMax}
          foto={{ tipo: 'settings', rotulo: CAIXA_NOVA_FOTO_FILME.rotulo, dica: CAIXA_NOVA_FOTO_FILME.dica }}
          chips={chipsDoFilme(c, advanced)}
          gerar={{ aoClicar: advanced.generate, disabled: advanced.blocked, custo: c.checkingAccount || (c.firstFilmFree && !advanced.surcharge) || preco === null ? null : preco + advanced.surcharge, label: c.firstFilmFree && !advanced.surcharge ? 'First film free' : c.checkingAccount ? 'Checking credits…' : undefined, checking: c.checkingAccount, testId: 'studio-simple-generate' }}
          confianca={CAIXA_NOVA_CONFIANCA}
          nota={c.temFilmeGratis ? <p className="cx-gratis" data-testid="studio-free-film-line">{LINHA_DO_FILME_GRATIS}</p> : null}
          exemplos={exemplos} exemplosTitulo={CAIXA_NOVA_EXEMPLOS_TITULO} exemplosDica={CAIXA_NOVA_EXEMPLOS_DICA}
          exemploAtivo={ativo?.id ?? null} aoEscolherExemplo={escolher}
        />
      </div>
      {palco ? <aside className="cx-palco" aria-label="Film example">
        <header className="cx-palco-caption">
          <span className="cx-palco-tag">Film example</span>
          <h2 className="cx-palco-nome">{palco.title}</h2>
        </header>
        <div className="cx-palco-video">
          <video key={palco.id} src={palco.video} poster={palco.poster} muted loop playsInline autoPlay preload="metadata" aria-label={palco.title} />
        </div>
        <p className="cx-palco-legenda">Made with Kineo. Tap an example to use its idea.</p>
      </aside> : null}
    </div>
  </main>
}
