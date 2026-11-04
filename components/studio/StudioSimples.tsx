'use client'
// KINEO-CAIXA-UNICA-0411 [fundador 04/11: "1a"] — a porta do Studio: produto, texto e Generate na mesma tela; ajustes numa folha; login só ao gerar.
//
// Olhando a Higgsfield: "a gente não deixa ele chegar na parte onde pode escrever a história dele"; "tem muito conteúdo a página"; "o motor está muito em
// evidência". O Generate monta o MESMO pedido do Studio completo e cai no /studio/create, que confere saldo e motor e, sem conta, manda ao cadastro e devolve
// ao mesmo pedido. Nada é cobrado aqui. O Studio completo segue vivo em "More options" (motor, estrela, logo, referências, clipe).
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { trackEvent } from '@/lib/analytics'
import { useMrrStudioFunnel } from '@/lib/growth/useMrrStudioFunnel'
import { analyzePromptMaxChars } from '@/lib/analyzeLimits'
import { promptLimitState } from '@/lib/studioPromptLimit'
import { decideSexualContentRefusal, sexualContentRefusalMessage } from '@/lib/contentPolicy/sexualContent'
import { CHATGPT_LINK_MESSAGE, isStandaloneHttpUrl } from '@/lib/scriptInput'
import { NARRATION_LANGUAGES } from '@/lib/textLanguage'
import { MIN_DURATION_ALL_ENGINES } from '@/lib/durationByEngine'
import { nomeDoMotorEscolhido, pedidoDoStudioSimples, type FilmeDaCaixa } from '@/lib/growth/studioSimples'

const CSS = `
.ksx{max-width:760px;margin:0 auto;padding:clamp(20px,6vh,64px) 16px 48px;color:var(--text)}
.ksx-chips{display:flex;gap:6px;overflow-x:auto;padding:2px;margin:0 0 18px;scrollbar-width:none}
.ksx-chip{flex:none;height:44px;display:inline-flex;align-items:center;padding:0 15px;border-radius:12px;border:1px solid var(--border);background:var(--card);color:var(--text2,var(--text));font-size:14px;font-weight:700;text-decoration:none}
.ksx-chip:hover{border-color:var(--text)}
.ksx-chip[aria-current="page"]{background:var(--text);border-color:var(--text);color:var(--bg,#fff)}
.ksx h1{margin:0 0 16px;font-size:clamp(26px,5vw,38px);line-height:1.12;font-weight:800;letter-spacing:-.02em;color:var(--text)}
.ksx-box{border:1.5px solid var(--border2,var(--border));border-radius:20px;background:var(--card);padding:14px;display:flex;flex-direction:column;gap:12px}
.ksx-box:focus-within{border-color:var(--text)}
.ksx-box textarea{width:100%;box-sizing:border-box;border:0;outline:0;resize:vertical;min-height:108px;background:transparent;color:var(--text);font-size:16px;font-weight:600;line-height:1.45;font-family:inherit;padding:2px}
.ksx-box textarea::placeholder{color:var(--muted2,var(--muted))}
.ksx-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.ksx-set{height:44px;padding:0 14px;border-radius:12px;border:1px solid var(--border);background:transparent;color:var(--text);font-size:14px;font-weight:700;font-family:inherit;cursor:pointer}
.ksx-set:hover{border-color:var(--text)}
.ksx-set{display:inline-flex;align-items:center;justify-content:center;gap:7px;white-space:nowrap}
.ksx-set-v{font-weight:600;color:var(--muted2,var(--muted))}
.ksx-go{height:44px;margin-left:auto;padding:0 22px;border-radius:12px;border:0;background:#2997ff;color:#000;font-size:15px;font-weight:800;font-family:inherit;cursor:pointer}
.ksx-go:focus-visible,.ksx-set:focus-visible,.ksx-chip:focus-visible,.ksx-film:focus-visible{outline:2px solid #2997ff;outline-offset:2px}
.ksx-msg{margin:0;font-size:13px;font-weight:600;line-height:1.45;color:#d7263d}
.ksx-films{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:26px}
.ksx-film{position:relative;display:block;width:100%;aspect-ratio:9/14;border:0;padding:0;border-radius:14px;overflow:hidden;background:var(--card2,var(--card));cursor:pointer;text-align:left}
.ksx-film img{width:100%;height:100%;object-fit:cover;display:block}
.ksx-film span{position:absolute;left:0;right:0;bottom:0;padding:26px 9px 9px;background:linear-gradient(transparent,rgba(0,0,0,.78));color:#fff;font-size:12px;font-weight:700;line-height:1.3}
.ksx-hint{margin:10px 0 0;font-size:13px;font-weight:600;color:var(--muted2,var(--muted))}
.ksx-dim{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:80;display:flex;align-items:flex-end;justify-content:center}
.ksx-sheet{width:100%;max-width:520px;max-height:90vh;overflow:auto;box-sizing:border-box;background:var(--card);color:var(--text);border-radius:22px 22px 0 0;padding:20px 18px calc(20px + env(safe-area-inset-bottom,0px));display:flex;flex-direction:column;gap:16px}
.ksx-sheet h2{margin:0;font-size:19px;font-weight:800;color:var(--text)}
.ksx-lab{display:block;margin:0 0 8px;font-size:12px;font-weight:700;color:var(--muted2,var(--muted))}
.ksx-opts{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(0,1fr);gap:6px}
.ksx-opt{height:44px;border-radius:11px;border:1px solid var(--border);background:transparent;color:var(--text);font-size:14px;font-weight:700;font-family:inherit;cursor:pointer}
.ksx-opt[aria-pressed="true"]{background:var(--text);border-color:var(--text);color:var(--bg,#fff)}
.ksx-sel{width:100%;height:44px;border-radius:11px;border:1px solid var(--border);background:var(--card);color:var(--text);font-size:14px;font-weight:600;font-family:inherit;padding:0 10px}
.ksx-check{display:flex;gap:10px;align-items:center;min-height:44px;font-size:14px;font-weight:600;color:var(--text)}
.ksx-check input{width:20px;height:20px;flex:none}
.ksx-motor{display:flex;justify-content:space-between;align-items:center;gap:12px;min-height:44px;font-size:14px;font-weight:700;color:var(--text)}
.ksx-motor a{color:#1f7fe0;font-weight:700;text-decoration:none;white-space:nowrap}
.ksx-done{height:48px;border:0;border-radius:13px;background:#2997ff;color:#000;font-size:15px;font-weight:800;font-family:inherit;cursor:pointer}
@media (min-width:640px){.ksx-dim{align-items:center}.ksx-sheet{border-radius:22px}}
@media (max-width:560px){.ksx-films{grid-template-columns:repeat(2,minmax(0,1fr))}.ksx-go{flex:1 1 110px;margin-left:0;padding:0 12px}.ksx-set{flex:1 1 auto;padding:0 10px}}
@media (prefers-reduced-motion:no-preference){.ksx-sheet{animation:ksx-up .18s ease-out}@keyframes ksx-up{from{transform:translateY(16px);opacity:.6}to{transform:none;opacity:1}}}
`

const DURACOES = [15, 35, 60, 90] as const
const FORMATOS = ['9:16', '16:9', '1:1', '4:5'] as const
const PRODUTOS: ReadonlyArray<{ rotulo: string; href: string | null }> = [
  { rotulo: 'Film', href: null },
  { rotulo: 'Ad', href: '/ads/new?utm_source=studio_door' },
  { rotulo: 'Cartoon', href: '/kids-cartoon' },
  { rotulo: 'Clip', href: '/clips' },
]

export default function StudioSimples({ filmes, motor, campanha }: { filmes: ReadonlyArray<FilmeDaCaixa>; motor: string; campanha: string }) {
  const router = useRouter()
  const registrar = useMrrStudioFunnel()
  const caixa = useRef<HTMLTextAreaElement>(null)
  const [texto, setTexto] = useState('')
  const [duracao, setDuracao] = useState<number>(60)
  const [formato, setFormato] = useState<string>('9:16')
  const [lingua, setLingua] = useState<string>('auto') /* KINEO-ROTEIRO-NA-LINGUA-0411 — sem escolha, o filme fala a língua do texto */
  const [palavraPorPalavra, setPalavraPorPalavra] = useState(false)
  const [folha, setFolha] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const nomeMotor = nomeDoMotorEscolhido(motor)
  const opcoesDuracao = motor === 'seedance' ? DURACOES : DURACOES.filter((d) => d >= MIN_DURATION_ALL_ENGINES)
  const limite = useMemo(() => promptLimitState(texto, analyzePromptMaxChars(palavraPorPalavra ? 'verbatim' : 'ai')), [texto, palavraPorPalavra])

  useEffect(() => { void trackEvent('studio_simple_viewed', { engine: motor, campaign: campanha }) }, [motor, campanha])

  useEffect(() => {
    if (!folha) return
    const fechar = (e: KeyboardEvent) => { if (e.key === 'Escape') setFolha(false) }
    window.addEventListener('keydown', fechar)
    return () => window.removeEventListener('keydown', fechar)
  }, [folha])

  const maisOpcoes = useMemo(() => {
    const q = new URLSearchParams({ avancado: '1', engine: motor, intent_campaign: campanha })
    if (texto.trim() && texto.length < 1500) q.set('prompt', texto)
    return `/studio?${q.toString()}`
  }, [motor, campanha, texto])

  function gerar() {
    const t = texto.trim()
    const recusar = (m: string) => { setAviso(m); caixa.current?.focus() }
    if (!t) { caixa.current?.focus(); return }
    if (isStandaloneHttpUrl(t)) return recusar(CHATGPT_LINK_MESSAGE)
    if (limite.over) return recusar('This text is too long. Shorten it a little and try again.')
    const sexual = decideSexualContentRefusal(t)
    if (sexual.refuse) {
      void trackEvent('sexual_content_refused_client', { version: sexual.version, named_person: sexual.namedPerson, surface: 'studio_simple' })
      return recusar(sexualContentRefusalMessage(sexual.namedPerson))
    }
    setAviso(null)
    registrar('mrr_generate_clicked')
    void trackEvent('studio_simple_generate_clicked', { engine: motor, duration: duracao, aspect: formato, language: lingua, verbatim: palavraPorPalavra, chars: t.length })
    try { sessionStorage.setItem('kineo:studio:go:v1', JSON.stringify({ t: Date.now(), engine: motor, prompt: t, language: lingua === 'auto' ? 'en' : lingua })) } catch {}
    router.push(pedidoDoStudioSimples({ motor, texto: t, duracao, formato, lingua, palavraPorPalavra, campanha }))
  }

  return (
    <div className="ksx" data-testid="studio-simples">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <nav className="ksx-chips" aria-label="What to make">
        {PRODUTOS.map((p) => p.href
          ? <a key={p.rotulo} className="ksx-chip" href={p.href} data-kineo={`studio-simple-${p.rotulo.toLowerCase()}`}>{p.rotulo}</a>
          : <span key={p.rotulo} className="ksx-chip" aria-current="page">{p.rotulo}</span>)}
      </nav>
      <h1>What&apos;s your film about?</h1>
      <div className="ksx-box">
        <textarea
          ref={caixa}
          value={texto}
          rows={4}
          aria-label="Your idea"
          placeholder="One idea is enough. A finished film comes out: voiced, scored and captioned."
          onChange={(e) => { setTexto(e.target.value); setAviso(null); if (e.target.value.trim()) registrar('mrr_idea_entered') }}
        />
        {aviso ? <p className="ksx-msg" role="alert">{aviso}</p> : null}
        <div className="ksx-row">
          <button type="button" className="ksx-set" data-testid="studio-simple-settings" aria-haspopup="dialog" onClick={() => setFolha(true)}><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" strokeLinecap="round" aria-hidden="true"><path d="M2 4h7M13 4h1M2 12h1M7 12h7"></path><circle cx="11" cy="4" r="2"></circle><circle cx="5" cy="12" r="2"></circle></svg>Settings<span className="ksx-set-v">{duracao} s · {formato}</span></button>
          <button type="button" className="ksx-go" data-testid="studio-simple-generate" onClick={gerar}>Generate</button>
        </div>
      </div>
      {filmes.length > 0 ? (
        <>
          <div className="ksx-films">
            {filmes.map((f, i) => (
              <button key={f.id} type="button" className="ksx-film" data-kineo="studio-simple-film" onClick={() => { setTexto(f.title); setAviso(null); registrar('mrr_idea_entered'); void trackEvent('studio_best_film_clicked', { film_id: f.id, engine: f.engine, position: i + 1, surface: 'studio_simple' }); caixa.current?.focus() }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.poster} alt="" loading={i < 4 ? 'eager' : 'lazy'} />
                <span>{f.title}</span>
              </button>
            ))}
          </div>
          <p className="ksx-hint">Tap a film to start from its idea.</p>
        </>
      ) : null}
      {folha ? (
        <div className="ksx-dim" onClick={(e) => { if (e.target === e.currentTarget) setFolha(false) }}>
          <div className="ksx-sheet" role="dialog" aria-modal="true" aria-label="Settings">
            <h2>Settings</h2>
            <div><span className="ksx-lab">Length</span><div className="ksx-opts">{opcoesDuracao.map((d) => <button key={d} type="button" className="ksx-opt" aria-pressed={duracao === d} onClick={() => setDuracao(d)}>{d} s</button>)}</div></div>
            <div><span className="ksx-lab">Format</span><div className="ksx-opts">{FORMATOS.map((f) => <button key={f} type="button" className="ksx-opt" aria-pressed={formato === f} onClick={() => setFormato(f)}>{f}</button>)}</div></div>
            <div><label className="ksx-lab" htmlFor="ksx-lingua">Narration</label><select id="ksx-lingua" className="ksx-sel" value={lingua} onChange={(e) => setLingua(e.target.value)}><option value="auto">Same as my text</option>{NARRATION_LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.native}</option>)}</select></div>
            <label className="ksx-check"><input type="checkbox" checked={palavraPorPalavra} onChange={(e) => setPalavraPorPalavra(e.target.checked)} />Narrate my text word for word</label>
            <div className="ksx-motor"><span>{nomeMotor ? `Engine: ${nomeMotor}` : 'Engine: Auto'}</span><a href={maisOpcoes} data-kineo="studio-simple-more">More options</a></div>
            <button type="button" className="ksx-done" onClick={() => setFolha(false)}>Done</button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
