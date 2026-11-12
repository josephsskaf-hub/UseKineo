'use client'

// KINEO-ADS-PESSOA-FALANDO-TELA-1211 [SPEC-ADS-PESSOA-FALANDO-2026-11-11 §1; dono 12/11: "Não adianta a gente ter os vídeos e o cara não
// conseguir fazer"] — o anúncio em que a PESSOA FALA, dentro da moldura nova (/create/ads?formato=pessoa_falando), só para conta da casa
// enquanto KINEO_ADS_PESSOA_FALANDO = 'internal'. Os 6 passos da spec: 1 foto do produto · 2 uma frase · 3 quem fala · 4 onde e como ·
// 5 o roteiro (a fala palavra por palavra com os gestos, editável; `rascunho` abre a fala para ajustar) · 6 uma de 2 fotos-chave → botão
// com o preço → vídeo. Sem nome de motor; preço SÓ no botão final; nada começa sozinho (cada chamada nasce de um botão); letra ≥ 12 px;
// cabe em 375 px. As chamadas: lib/ads/pessoaFalando/telaContrato.ts (o servidor é da Div. 5).
import { useMemo, useRef, useState } from 'react'
import { APRESENTADORES, FORMATOS, type ApresentadorId, type FormatoId } from '@/lib/ads/pessoaFalando/formatos'
import type { Roteiro } from '@/lib/ads/pessoaFalando/roteiro'
import { ADS_PESSOA_FALANDO_CREDITS, FALA_MAX, FALA_MAX_PALAVRAS, FRASE_MAX, PESSOA_FALANDO_API, PRODUTO_MAX, faltaNaEntrada, palavrasDaFala, pedidoUnico, saldoCobre, type EntradaDaTela, type RespostaFotos, type RespostaPedido, type RespostaRoteiro } from '@/lib/ads/pessoaFalando/telaContrato'
import SubscriberUpgradeNudge from '@/components/billing/SubscriberUpgradeNudge' // KINEO-ADS-PESSOA-FALANDO-PRECO-1211 — sem saldo: a saída de sempre (troca de plano ou recarga), sem texto novo de preço

/** Os 3 clipes aprovados pelo dono (public/ads-exemplos), nos formatos em que foram feitos. */
export const EXEMPLO_DO_FORMATO: Partial<Record<FormatoId, string>> = { car_selfie: 'halo-car-selfie', get_ready: 'veil-grwm', street_interview: 'orra-street-interview' }
export const ORDEM_DOS_APRESENTADORES: readonly ApresentadorId[] = ['sofia', 'amara', 'rahul', 'kenji']
export const ORDEM_DOS_FORMATOS: readonly FormatoId[] = ['car_selfie', 'get_ready', 'street_interview', 'at_my_desk', 'kitchen_counter', 'unboxing_home']

/** O retrato servido pelo próprio site (o caminho da URL de produção). */
export function retratoLocal(url: string): string { try { return new URL(url).pathname } catch { return url } }
/** KINEO-PF-COBRA-NAS-FOTOS-1211 [CEO 12/11 15:15] — o preço mora no botão das 2 fotos (a 1ª chamada paga; cobre as fotos E o vídeo). Sem número decidido = sem número (e não pede). */
export function rotuloDasFotos(creditos: number | null): string { return creditos && creditos > 0 ? `Show me 2 photos · ${creditos} credits` : 'Show me 2 photos · price coming soon' }
export const INCLUI_O_VIDEO = 'Includes your video'
/** O passo final não cobra de novo: o vídeo já está no que as fotos cobraram. */
export const ROTULO_FINAL = 'Make my video · included'

const CSS = `
.pf{display:grid;gap:14px}
.pf-step{border:1px solid var(--rc-border);border-radius:14px;padding:14px;background:var(--rc-card)}
.pf-step h2{margin:0 0 8px;font-size:14px;font-weight:750;display:flex;gap:8px;align-items:center}
.pf-n{display:inline-grid;place-items:center;width:22px;height:22px;border-radius:50%;background:var(--rc-soft);color:var(--rc-accent);font-size:12px;font-weight:800}
.pf-hint{margin:0 0 8px;font-size:12px;color:var(--rc-muted)}
.pf input,.pf textarea{width:100%;border:1px solid var(--rc-line);border-radius:10px;background:var(--rc-input);color:var(--rc-text);padding:10px 12px;font-size:14px}
.pf textarea{min-height:96px;resize:vertical;line-height:1.5}
.pf-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
.pf-grid6{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.pf-opt{display:flex;flex-direction:column;align-items:center;gap:6px;border:2px solid var(--rc-border);border-radius:12px;padding:8px;background:transparent;color:var(--rc-text);font-size:12px;font-weight:700;text-align:center;min-width:0}
.pf-opt[aria-pressed=true]{border-color:var(--rc-primary);background:var(--rc-soft)}
.pf-opt img{width:100%;aspect-ratio:1;object-fit:cover;object-position:50% 20%;border-radius:9px;display:block}
.pf-opt svg{width:44px;height:44px;color:var(--rc-accent)}
.pf-opt small{font-size:12px;font-weight:500;color:var(--rc-muted)}
.pf-ex{font-size:12px;font-weight:700;color:var(--rc-accent);text-decoration:underline;background:none;border:0;padding:2px 0}
.pf-video{width:100%;max-height:360px;border-radius:12px;background:#000;margin-top:8px}
.pf-btn{width:100%;min-height:46px;border:0;border-radius:12px;background:var(--rc-primary);color:var(--rc-on-primary);font-size:14px;font-weight:800}
.pf-btn2{width:100%;min-height:42px;border:1px solid var(--rc-line);border-radius:12px;background:transparent;color:var(--rc-text);font-size:13px;font-weight:700}
.pf-btn:disabled,.pf-btn2:disabled{opacity:.5;cursor:default}
.pf-why{margin:8px 0 0;font-size:12px;color:var(--rc-muted)}
.pf-note{margin:0 0 8px;padding:8px 10px;border-radius:10px;background:var(--rc-soft);font-size:12px;color:var(--rc-text)}
.pf-fala{font-size:14px;line-height:1.7}
.pf-gesto{display:inline-block;margin:0 4px;padding:1px 8px;border-radius:999px;background:var(--rc-soft);color:var(--rc-accent);font-size:12px;font-weight:700}
.pf-fotos{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.pf-fotos img{width:100%;aspect-ratio:9/16;object-fit:cover;border-radius:10px;display:block}
.pf-err{margin:8px 0 0;font-size:12px;color:#ff8a8a}
.pf-ok{font-size:13px;line-height:1.5}
@media(max-width:480px){.pf-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.pf-grid6{grid-template-columns:repeat(2,minmax(0,1fr))}}
`

/** Ilustração de cada formato (traço simples, sem marca e sem pessoa real). */
function Ilustracao({ id }: { id: FormatoId }) {
  const p = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  const d: Record<FormatoId, JSX.Element> = {
    car_selfie: <><path {...p} d="M8 30l4-10h24l4 10" /><rect {...p} x="6" y="30" width="36" height="8" rx="2" /><circle {...p} cx="14" cy="38" r="3" /><circle {...p} cx="34" cy="38" r="3" /><rect {...p} x="30" y="8" width="8" height="12" rx="2" /></>,
    get_ready: <><rect {...p} x="12" y="6" width="24" height="26" rx="12" /><path {...p} d="M8 42h32M24 32v10" /><path {...p} d="M30 16l3-3" /></>,
    street_interview: <><path {...p} d="M18 10a6 6 0 0 1 12 0v8a6 6 0 0 1-12 0z" /><path {...p} d="M24 24v10M16 42l8-8 8 8" /><path {...p} d="M6 42h4M38 42h4" /></>,
    at_my_desk: <><rect {...p} x="10" y="10" width="28" height="18" rx="2" /><path {...p} d="M6 34h36M14 34v8M34 34v8M22 28h4" /></>,
    kitchen_counter: <><path {...p} d="M6 30h36v12H6z" /><path {...p} d="M14 30v-8h12v8M18 22v-4M30 22c0-4 6-4 6 0v8" /></>,
    unboxing_home: <><path {...p} d="M8 18l16-8 16 8v18l-16 8-16-8z" /><path {...p} d="M8 18l16 8 16-8M24 26v18" /></>,
  }
  return <svg viewBox="0 0 48 48" aria-hidden="true">{d[id]}</svg>
}

export default function PessoaFalandoPainel({ creditosPadrao = ADS_PESSOA_FALANDO_CREDITS }: { creditosPadrao?: number | null }) {
  const [fotoDoProduto, setFoto] = useState('')
  const [produto, setProduto] = useState('')
  const [frase, setFrase] = useState('')
  const [apresentadorId, setApresentador] = useState<ApresentadorId | null>(null)
  const [formatoId, setFormato] = useState<FormatoId | null>(null)
  const [exemplo, setExemplo] = useState<string | null>(null)
  const [roteiro, setRoteiro] = useState<Roteiro | null>(null)
  const [foiRascunho, setFoiRascunho] = useState(false)
  const [fotos, setFotos] = useState<[string, string] | null>(null)
  const [escolhida, setEscolhida] = useState<string | null>(null)
  const [creditos, setCreditos] = useState<number | null>(creditosPadrao)
  const [ocupado, setOcupado] = useState<'roteiro' | 'fotos' | 'video' | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [pedido, setPedido] = useState<RespostaPedido | null>(null)
  const [saldo, setSaldo] = useState<number | null>(null) // lido no clique das fotos (nada carrega sozinho)
  // KINEO-PF-PEDIDO-UNICO-1211 [CEO 12/11 15:30: evita cobrança dupla] — o id do pedido (ref: síncrono, dois cliques = um pedido) e o pedido JÁ PAGO que a resposta das fotos devolveu.
  const pedidoRef = useRef<string | null>(null)
  const [pedidoPago, setPedidoPago] = useState<string | null>(null)
  const [avisoDoAssinante, setAvisoDoAssinante] = useState(false) // o aviso de sempre pintou? (troca de plano ou recarga, só para assinante)

  const entrada: Partial<EntradaDaTela> = { fotoDoProduto: fotoDoProduto.trim(), produto: produto.trim(), frase: frase.trim(), apresentadorId: apresentadorId ?? undefined, formatoId: formatoId ?? undefined }
  const falta = faltaNaEntrada(entrada)
  // Mudou o pedido depois do roteiro? O roteiro e as fotos antigas deixam de valer (nada fica pendurado).
  const chave = useMemo(() => JSON.stringify(entrada), [fotoDoProduto, produto, frase, apresentadorId, formatoId]) // eslint-disable-line react-hooks/exhaustive-deps
  const [chaveDoRoteiro, setChaveDoRoteiro] = useState<string | null>(null)
  const roteiroVale = roteiro && chaveDoRoteiro === chave
  const palavras = roteiro ? palavrasDaFala(roteiro.fala) : 0
  const falaCabe = palavras > 0 && palavras <= FALA_MAX_PALAVRAS // só o anúncio de 10 s (dono 12/11)
  const cobre = saldoCobre(saldo, creditos)

  async function chamar<T>(url: string, corpo: unknown): Promise<T> {
    const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(corpo) })
    if (!r.ok) throw new Error(String(r.status))
    return r.json() as Promise<T>
  }
  async function escrever() {
    if (falta) return
    setOcupado('roteiro'); setErro(null); setFotos(null); setEscolhida(null)
    try {
      const r = await chamar<RespostaRoteiro>(PESSOA_FALANDO_API.roteiro, entrada)
      const vindo = r.roteiro ?? r.rascunho
      if (!vindo) throw new Error('vazio')
      setRoteiro(vindo); setFoiRascunho(!r.roteiro && Boolean(r.rascunho)); setChaveDoRoteiro(chave)
    } catch { setErro('The script could not be written right now. Nothing was charged. Try again.') } finally { setOcupado(null) }
  }
  async function verFotos() {
    if (!roteiroVale || !falaCabe || !creditos || ocupado !== null) return
    const pedidoId = pedidoUnico(pedidoRef) // KINEO-PF-PEDIDO-UNICO-1211 — o MESMO id em toda tentativa deste pedido
    setOcupado('fotos'); setErro(null); setEscolhida(null)
    // KINEO-PF-COBRA-NAS-FOTOS-1211 [CEO 12/11 15:15] — o saldo é lido NESTE clique (o que cobra), antes de pedir: não cobre → não pede e mostra a saída de sempre.
    const lido = await fetch('/api/credits', { cache: 'no-store' }).then(r => (r.ok ? r.json() : null)).then(d => (typeof d?.credits === 'number' ? d.credits as number : null)).catch(() => null)
    setSaldo(lido)
    if (!pedidoPago && saldoCobre(lido, creditos) === false) { setOcupado(null); return } // já pago: não depende de saldo
    try {
      const r = await chamar<RespostaFotos>(PESSOA_FALANDO_API.fotos, { ...entrada, pedidoId })
      setFotos(r.fotos)
      setPedidoPago(r.pedidoId ?? pedidoId)
      if (typeof r.creditos === 'number') setCreditos(r.creditos)
    } catch { setErro('The two photos could not be made right now. Nothing was charged. Try again.') } finally { setOcupado(null) }
  }
  async function fazerVideo() {
    if (!roteiroVale || !roteiro || !escolhida || !falaCabe || !pedidoPago) return
    setOcupado('video'); setErro(null)
    try { setPedido(await chamar<RespostaPedido>(PESSOA_FALANDO_API.video, { ...entrada, fotoChave: escolhida, roteiro, pedidoId: pedidoPago })) }
    catch { setErro('Your video could not start. It is already paid for with your photos: try again, you will not be charged twice.') } finally { setOcupado(null) }
  }

  if (pedido) return <div className="pf"><style dangerouslySetInnerHTML={{ __html: CSS }} />
    <section className="pf-step" data-pf-passo="pronto"><h2>Your video is being made</h2>
      <p className="pf-ok">{apresentadorId ? APRESENTADORES[apresentadorId].nome : 'Your presenter'} is filming it now. It takes a few minutes; it will appear in My videos.</p>
      <a className="pf-btn2" style={{ display: 'grid', placeItems: 'center', marginTop: 10 }} href={pedido.acompanhar ?? '/library'}>Open My videos</a>
    </section></div>

  return <div className="pf" data-pessoa-falando="">
    <style dangerouslySetInnerHTML={{ __html: CSS }} />
    <section className="pf-step" data-pf-passo="1"><h2><span className="pf-n">1</span>Your product</h2>
      <p className="pf-hint">A link to a clear photo of the product, and its name.</p>
      <input aria-label="Product photo link" placeholder="https://… photo of your product" value={fotoDoProduto} onChange={e => setFoto(e.target.value)} />
      <input aria-label="Product name" style={{ marginTop: 8 }} maxLength={PRODUTO_MAX} placeholder="Product name" value={produto} onChange={e => setProduto(e.target.value)} />
    </section>
    <section className="pf-step" data-pf-passo="2"><h2><span className="pf-n">2</span>What it sells, in one line</h2>
      <textarea aria-label="What it sells" style={{ minHeight: 64 }} maxLength={FRASE_MAX} placeholder="e.g. Keeps coffee hot for 12 hours, even in the car." value={frase} onChange={e => setFrase(e.target.value)} />
    </section>
    <section className="pf-step" data-pf-passo="3"><h2><span className="pf-n">3</span>Who talks</h2>
      <div className="pf-grid">{ORDEM_DOS_APRESENTADORES.map(id => <button key={id} type="button" className="pf-opt" aria-pressed={apresentadorId === id} onClick={() => setApresentador(id)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={retratoLocal(APRESENTADORES[id].retrato)} alt="" loading="lazy" />{APRESENTADORES[id].nome}
      </button>)}</div>
    </section>
    <section className="pf-step" data-pf-passo="4"><h2><span className="pf-n">4</span>Where they film it</h2>
      <div className="pf-grid6">{ORDEM_DOS_FORMATOS.map(id => <button key={id} type="button" className="pf-opt" aria-pressed={formatoId === id} onClick={() => setFormato(id)}>
        <Ilustracao id={id} />{FORMATOS[id].nome}
      </button>)}</div>
      {formatoId && EXEMPLO_DO_FORMATO[formatoId] ? <button type="button" className="pf-ex" onClick={() => setExemplo(EXEMPLO_DO_FORMATO[formatoId] ?? null)}>▶ See a real example</button> : null}
      {exemplo ? <video className="pf-video" src={`/ads-exemplos/${exemplo}.mp4`} poster={`/ads-exemplos/${exemplo}.webp`} controls playsInline /> : null}
    </section>
    <section className="pf-step" data-pf-passo="5"><h2><span className="pf-n">5</span>The script</h2>
      {!roteiroVale ? <>
        <p className="pf-hint">We write what {apresentadorId ? APRESENTADORES[apresentadorId].nome : 'they'} will say, word by word, with the gestures. You can edit it.</p>
        <button type="button" className="pf-btn2" disabled={Boolean(falta) || ocupado !== null} onClick={escrever}>{ocupado === 'roteiro' ? 'Writing…' : 'Write the script'}</button>
        {falta ? <p className="pf-why">{falta}</p> : null}
      </> : <>
        {foiRascunho ? <p className="pf-note" data-pf-rascunho="">This is a draft: read it and adjust the line before the photos.</p> : null}
        <p className="pf-fala" aria-label="Script with gestures">{marcarGestos(roteiro!)}</p>
        <textarea aria-label="Edit the line" maxLength={FALA_MAX} value={roteiro!.fala} onChange={e => setRoteiro({ ...roteiro!, fala: e.target.value })} />
        {pedidoPago ? <p className="pf-note" data-pf-ja-pago="">Already paid for this ad. If you change the script now, it is the same order: no new charge.</p> : null}
        <p className={falaCabe ? 'pf-why' : 'pf-err'} data-pf-palavras={palavras}>{palavras} / {FALA_MAX_PALAVRAS} words · {falaCabe ? 'fits the 10-second ad' : 'shorten the line to fit 10 seconds'}</p>
        <button type="button" className="pf-ex" onClick={escrever} disabled={ocupado !== null}>Write it again</button>
      </>}
    </section>
    <section className="pf-step" data-pf-passo="6"><h2><span className="pf-n">6</span>Pick the shot</h2>
      {!fotos ? <>
        <p className="pf-hint">Two photos of {apresentadorId ? APRESENTADORES[apresentadorId].nome : 'the presenter'} with your product. Pick one; the video starts from it.</p>
        <button type="button" className="pf-btn" disabled={!roteiroVale || !falaCabe || !creditos || ocupado !== null} onClick={verFotos} data-pf-botao-fotos="">{ocupado === 'fotos' ? 'Making the photos…' : <>{pedidoPago ? 'Show me 2 photos · already paid' : rotuloDasFotos(creditos)}<small style={{ display: 'block', fontSize: 12, fontWeight: 600, opacity: .85 }}>{INCLUI_O_VIDEO}</small></>}</button>
        {cobre === false ? <div style={{ marginTop: 10 }} data-pf-sem-saldo=""><SubscriberUpgradeNudge surface="ads_pessoa_falando_sem_saldo" topup onShown={() => setAvisoDoAssinante(true)} />
          {/* Quem não assina (o aviso acima não pinta): a mesma saída do Cartoon, "See plans" — sem texto novo de preço. */}
          {!avisoDoAssinante ? <><p className="pf-why">Not enough credits for this video yet.</p><a className="pf-btn2" style={{ display: 'grid', placeItems: 'center', marginTop: 6 }} href="/pricing" data-pf-ver-planos="">See plans</a></> : null}
        </div> : null}
      </> : <>
        <div className="pf-fotos">{fotos.map((u, i) => <button key={u} type="button" className="pf-opt" aria-pressed={escolhida === u} onClick={() => setEscolhida(u)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={u} alt={`Photo ${i + 1}`} />Photo {i + 1}
        </button>)}</div>
        <button type="button" className="pf-btn" style={{ marginTop: 12 }} disabled={!escolhida || !falaCabe || !pedidoPago || ocupado !== null} onClick={fazerVideo} data-pf-botao="">{ocupado === 'video' ? 'Starting…' : ROTULO_FINAL}</button>
        {!escolhida ? <p className="pf-why">Pick one of the two photos.</p> : null}
      </>}
      {erro ? <p className="pf-err" role="alert">{erro}</p> : null}
    </section>
  </div>
}

/** A fala com os gestos marcados logo depois da palavra em que acontecem. */
export function marcarGestos(r: Roteiro): (string | JSX.Element)[] {
  const out: (string | JSX.Element)[] = []
  const usados = new Set<number>()
  for (const [i, palavra] of r.fala.split(/(\s+)/u).entries()) {
    out.push(palavra)
    const limpa = palavra.toLowerCase().replace(/[^\p{L}\p{N}'-]/gu, '')
    const g = r.gestos.findIndex((x, j) => !usados.has(j) && limpa && x.palavra.toLowerCase().replace(/[^\p{L}\p{N}'-]/gu, '') === limpa)
    if (g >= 0) { usados.add(g); out.push(<span key={`g${i}`} className="pf-gesto">{r.gestos[g].gesto}</span>) }
  }
  return out
}
