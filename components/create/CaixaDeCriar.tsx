'use client'

// KINEO-CAIXA-NOVA-1511 [dono 15/11: "o mais importante é o fluxo onde a pessoa faz a magia acontecer… deixar um lugar mais confortável, que mais
// pessoas olhem e confiem… olhar todos os líderes de mercado e repetir igual"] — a CAIXA DE CRIAR no padrão de Higgsfield, Kling, Hailuo e Dreamina
// (docs/DESENHO-CAIXA-DE-CRIAR-1511.md): uma caixa grande e calma; o "+" da foto DENTRO dela, à esquerda; ajustes em chips que abrem menus
// pequenos; o Generate à direita com o custo; linha de confiança embaixo; exemplos reais numa fileira ("Try one").
// É SÓ DESENHO: não tem estado de pedido, não chama rede, não cobra. Quem usa (ex.: CaixaNovaDoFilme) passa o texto, os handlers e o número do
// botão já calculados pelo código que cobra. Nada aqui gera sozinho: o clique num exemplo só PREENCHE a caixa.
import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import './caixa-nova.css'
import ContagemSocial from './ContagemSocial' // KINEO-FILMES-VIRAIS-1511

export interface ChipDaCaixa {
  id: string
  /** Nome do ajuste (leitor de tela e título do menu): "Length", "Format"… */
  nome: string
  icone: ReactNode
  /** O valor escolhido, curto: "35 s", "9:16". */
  valor: string
  /** O conteúdo do menu pequeno. Recebe `fechar` para quem fecha ao escolher. */
  menu: (fechar: () => void) => ReactNode
  aoAbrir?: () => void
}

export type FotoDaCaixa =
  | { tipo: 'link'; href: string; rotulo: string; dica: string }
  | { tipo: 'upload'; previa: string | null; enviando: boolean; rotulo: string; aceita: string; aoEscolher: (f: File) => void; aoRemover: () => void }

export interface ExemploDaCaixa { id: string; title: string; video: string; poster: string }

export interface CaixaDeCriarProps {
  titulo: string
  texto: string
  aoEscrever: (v: string) => void
  caixaRef: RefObject<HTMLTextAreaElement>
  placeholder: string
  aviso: string | null
  limiteMax: number
  foto: FotoDaCaixa | null
  chips: readonly ChipDaCaixa[]
  gerar: { aoClicar: () => void; custo: number | null; testId: string }
  confianca: readonly string[]
  /** Linha logo abaixo da caixa (ex.: o filme grátis) — só quando o servidor provou. */
  nota?: ReactNode
  exemplos: readonly ExemploDaCaixa[]
  exemplosTitulo: string
  exemplosDica: string
  exemploAtivo: string | null
  aoEscolherExemplo: (e: ExemploDaCaixa) => void
}

const ALTURA_MAX = 320

export default function CaixaDeCriar(p: CaixaDeCriarProps) {
  const caixaDeFora = useRef<HTMLDivElement>(null)
  const [aberto, setAberto] = useState<string | null>(null)
  const [posicao, setPosicao] = useState(0)
  const temTexto = p.texto.trim().length > 0
  const { caixaRef, texto } = p

  // O texto cresce com o que se escreve (e com o exemplo escolhido), até ALTURA_MAX; depois rola por dentro.
  useEffect(() => {
    const t = caixaRef.current
    if (!t) return
    const medir = () => { t.style.height = 'auto'; t.style.height = `${Math.min(t.scrollHeight, ALTURA_MAX)}px` }
    medir()
    // A largura muda (CSS chegando, janela girando): mede de novo, senão a caixa fica alta e vazia.
    if (typeof ResizeObserver === 'undefined') return
    let largura = t.clientWidth
    const ro = new ResizeObserver(() => { if (t.clientWidth !== largura) { largura = t.clientWidth; medir() } })
    ro.observe(t)
    return () => ro.disconnect()
  }, [texto, caixaRef])

  const fechar = useCallback(() => setAberto(null), [])
  useEffect(() => {
    if (!aberto) return
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') { setAberto(null); document.querySelector<HTMLButtonElement>(`[data-cx-chip="${aberto}"]`)?.focus() } }
    const fora = (e: PointerEvent) => { const alvo = e.target as Node; if (!caixaDeFora.current?.contains(alvo)) setAberto(null) }
    window.addEventListener('keydown', tecla)
    window.addEventListener('pointerdown', fora)
    return () => { window.removeEventListener('keydown', tecla); window.removeEventListener('pointerdown', fora) }
  }, [aberto])

  function abrir(chip: ChipDaCaixa, botao: HTMLButtonElement) {
    if (aberto === chip.id) { setAberto(null); return }
    // O menu mora fora da fileira (que rola no celular) para não ser cortado: ancorado na caixa, debaixo do chip.
    const caixa = caixaDeFora.current?.getBoundingClientRect(), b = botao.getBoundingClientRect?.()
    if (caixa && b) setPosicao(Math.max(0, Math.min(b.left - caixa.left, caixa.width - 280)))
    setAberto(chip.id)
    chip.aoAbrir?.()
  }

  const chipAberto = p.chips.find(c => c.id === aberto) ?? null
  const perto = p.texto.length > p.limiteMax * 0.8

  return <section className="cx" aria-labelledby="cx-titulo">
    <h1 id="cx-titulo" className="cx-titulo">{p.titulo}</h1>
    <div className="cx-caixa" ref={caixaDeFora} data-caixa-nova="">
      <div className="cx-corpo">
        {p.foto ? <Foto foto={p.foto} /> : null}
        <textarea id="cx-ideia" ref={p.caixaRef} className="cx-texto" data-testid="caixa-nova-idea" rows={3} value={p.texto} aria-label="Your idea" placeholder={p.placeholder}
          onChange={e => p.aoEscrever(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && temTexto) { e.preventDefault(); p.gerar.aoClicar() } }} />
      </div>
      {p.aviso ? <p className="cx-aviso" role="alert">{p.aviso}</p> : null}
      <div className="cx-base">
        <div className="cx-chips" role="toolbar" aria-label="Settings">
          {p.chips.map(c => <button key={c.id} type="button" className="cx-chip" data-cx-chip={c.id} aria-haspopup="dialog" aria-expanded={aberto === c.id}
            aria-label={`${c.nome}: ${c.valor}`} onClick={e => abrir(c, e.currentTarget)}>
            <span className="cx-chip-icone" aria-hidden="true">{c.icone}</span><span>{c.valor}</span><span className="cx-chip-seta" aria-hidden="true">▾</span>
          </button>)}
        </div>
        {perto ? <span className="cx-conta" aria-live="polite">{p.texto.trim().length} / {p.limiteMax}</span> : null}
        <button type="button" className="cx-gerar" data-testid={p.gerar.testId} disabled={!temTexto} onClick={p.gerar.aoClicar} aria-describedby="cx-confianca">
          <span>Generate</span>{p.gerar.custo !== null ? <span className="cx-custo" aria-label={`${p.gerar.custo} credits`}>✦ {p.gerar.custo}</span> : null}
        </button>
      </div>
      {chipAberto ? <div className="cx-menu" role="dialog" aria-label={chipAberto.nome} style={{ left: posicao }} data-cx-menu={chipAberto.id}>
        <p className="cx-menu-nome">{chipAberto.nome}</p>
        {chipAberto.menu(fechar)}
      </div> : null}
    </div>
    {p.nota}
    <ul className="cx-confianca" id="cx-confianca" aria-label="Before you generate">
      {p.confianca.map(f => <li key={f}><svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>{f}</li>)}
    </ul>
    {p.exemplos.length > 0 ? <div className="cx-exemplos" aria-labelledby="cx-exemplos-titulo">
      <div className="cx-exemplos-topo"><h2 id="cx-exemplos-titulo">{p.exemplosTitulo}</h2><p>{p.exemplosDica}</p></div>
      <div className="cx-fileira">
        {p.exemplos.map(e => <Exemplo key={e.id} e={e} ativo={p.exemploAtivo === e.id} aoEscolher={() => p.aoEscolherExemplo(e)} />)}
      </div>
    </div> : null}
  </section>
}

function Foto({ foto }: { foto: FotoDaCaixa }) {
  const arquivo = useRef<HTMLInputElement>(null)
  const mais = <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
  if (foto.tipo === 'link') return <a className="cx-foto" href={foto.href} title={`${foto.rotulo} · ${foto.dica}`} aria-label={`${foto.rotulo}. ${foto.dica}`} data-kineo="caixa-nova-foto">{mais}</a>
  if (foto.previa) return <div className="cx-foto cx-foto-cheia">
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={foto.previa} alt="Your photo" />
    <button type="button" className="cx-foto-tirar" aria-label="Remove photo" onClick={foto.aoRemover}>×</button>
  </div>
  return <>
    <button type="button" className="cx-foto" aria-label={foto.rotulo} title={foto.rotulo} disabled={foto.enviando} onClick={() => arquivo.current?.click()}>{foto.enviando ? <span className="cx-giro" aria-hidden="true" /> : mais}</button>
    <input ref={arquivo} type="file" accept={foto.aceita} hidden onChange={e => { const f = e.target.files?.[0]; if (f) foto.aoEscolher(f); e.target.value = '' }} />
  </>
}

function Exemplo({ e, ativo, aoEscolher }: { e: ExemploDaCaixa; ativo: boolean; aoEscolher: () => void }) {
  const video = useRef<HTMLVideoElement>(null)
  return <button type="button" className={ativo ? 'cx-exemplo cx-exemplo-ativo' : 'cx-exemplo'} data-cx-exemplo={e.id} aria-pressed={ativo} aria-label={`Use the idea: ${e.title}`} onClick={aoEscolher}
    onPointerEnter={() => { const v = video.current; if (v) { v.muted = true; void v.play().catch(() => {}) } }}
    onPointerLeave={() => { const v = video.current; if (v) { v.pause(); v.currentTime = 0 } }}>
    <video ref={video} src={e.video} poster={e.poster} muted loop playsInline preload="none" aria-hidden="true" />
    <span className="cx-exemplo-nome"><ContagemSocial video={e.video} /></span>
    <span className="sr-only">{e.title}</span>
    <span className="cx-exemplo-usar" aria-hidden="true">{ativo ? 'Selected ✓' : 'Use idea'}</span>
  </button>
}
