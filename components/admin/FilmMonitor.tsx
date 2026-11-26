'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { FilmMonitorSnapshot, MonitorFilm } from '@/lib/admin/filmMonitor'
import './film-monitor.css'

type Mode = 'recent' | 'reviews' | 'pending'
export interface BusinessSummary { mrr: number; paying: number; newUsers: number }
const formatScore = (n: number) => n.toLocaleString('pt-BR',{ maximumFractionDigits: 1 })
const time = (raw: string) => new Date(raw).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit',timeZone:'America/Sao_Paulo'})
const day = (raw: string) => new Date(raw).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',timeZone:'America/Sao_Paulo'})

export default function FilmMonitor({ business }: { business: BusinessSummary | null }) {
  const [snap,setSnap] = useState<FilmMonitorSnapshot | null>(null)
  const [mode,setMode] = useState<Mode>('recent')
  const [query,setQuery] = useState('')
  const [selected,setSelected] = useState<string | null>(null)
  const [paused,setPaused] = useState(false)
  const [loading,setLoading] = useState(false)
  const [error,setError] = useState('')
  const active = useRef<AbortController | null>(null)
  const refresh = useCallback(async () => {
    if (active.current) return
    const request = new AbortController()
    active.current = request
    setLoading(true)
    const timeout = window.setTimeout(() => request.abort(),12_000)
    try {
      const res = await fetch('/api/admin/film-monitor',{cache:'no-store',signal:request.signal})
      if (res.status === 403 || res.status === 401) { setSnap(null); setSelected(null); throw Error('Sua sessão perdeu o acesso. Entre novamente.') }
      if (!res.ok) throw Error('Falha na atualização.')
      const json = await res.json() as FilmMonitorSnapshot
      if (!Array.isArray(json.recent) || !Array.isArray(json.reviews) || !Number.isFinite(Date.parse(json.checked))) throw Error('Resposta indisponível.')
      if (active.current === request) { setSnap(json); setError('') }
    } catch (e) {
      if (active.current === request) setError(request.signal.aborted ? 'Tempo de resposta excedido.' : e instanceof Error ? e.message : 'Falha na leitura.')
    } finally {
      clearTimeout(timeout)
      if (active.current === request) { active.current = null; setLoading(false) }
    }
  },[])
  useEffect(() => () => { const old=active.current; active.current=null; old?.abort() },[])
  useEffect(() => {
    if (paused) return
    const tick = () => { if (document.visibilityState==='visible') void refresh() }
    tick()
    const timer = window.setInterval(tick,15_000)
    document.addEventListener('visibilitychange',tick)
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange',tick) }
  },[paused,refresh])

  const recent = snap?.recent ?? []
  const pending = recent.filter(f => f.score===null).length
  const list = (mode==='reviews' ? snap?.reviews ?? [] : recent).filter(f => (mode!=='pending' || f.score===null) && (f.title+' '+(f.engine||'')).toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
  const film = list.find(f => f.id===selected) ?? list[0]
  function tab(m: Mode) {setMode(m); setSelected(null)}
  return <section className="fm-desk" aria-labelledby="fm-title">
    <header className="fm-title"><div><p>Administração</p><h1 id="fm-title">Visão geral</h1></div><a href="#admin-full-report" onClick={()=>{const el=document.getElementById("admin-full-report");if(el instanceof HTMLDetailsElement)el.open=true}}>Relatório completo ↓</a></header>
    <div className="fm-kpis">
      <a href="/admin/paying"><span>Receita recorrente mensal</span><b>{business ? business.mrr.toLocaleString('en-US',{style:'currency',currency:'USD'}) : '—'}</b><small>Ver receita por plano ↗</small></a>
      <a href="/admin/paying"><span>Clientes pagantes</span><b>{business?.paying ?? '—'}</b><small>Ver assinaturas ↗</small></a>
      <a href="/admin/clientes"><span>Novas contas · 7 dias</span><b>{business?.newUsers ?? '—'}</b><small>Ver clientes ↗</small></a>
    </div>
    <div className="fm-monitor">
      <header className="fm-heading"><div><h2>Qualidade dos filmes</h2><p>Nota do revisor · escala de 0 a 10</p></div>
        <div className="fm-actions"><button type="button" aria-pressed={!paused} onClick={()=>setPaused(!paused)}>{paused?'Retomar':'Pausar'}</button><button type="button" disabled={loading} onClick={()=>void refresh()}>{loading?'Atualizando…':'Atualizar'}</button></div>
      </header>
      <p className={'fm-status'+(error?' fm-error':'')} role="status">{error ? error+' ' : paused ? 'Atualização pausada · ' : 'Atualiza a cada 15 s · '}{snap?'Última leitura '+day(snap.checked)+' às '+time(snap.checked)+' BRT':loading?'Carregando notas…':'Sem leitura confirmada'}</p>
      <div className="fm-controls"><div role="group" aria-label="Filtrar filmes">{([['recent','Filmes recentes'],['reviews','Últimas avaliações'],['pending','Pendentes'+(snap?' · '+pending:'')]] as const).map(([key,label])=><button type="button" key={key} aria-pressed={mode===key} onClick={()=>tab(key)}>{label}</button>)}</div><input type="search" aria-label="Buscar no recorte" placeholder="Buscar filme ou motor" value={query} onChange={e=>setQuery(e.target.value)} /></div>
      <div className="fm-grid"><div><p className="fm-range">{mode==='reviews'?'Até 30 avaliações mais recentes por data da revisão':'Até 30 filmes concluídos mais recentes por data de criação'}</p>
        <div className="fm-list" aria-label="Lista de filmes">{list.map(f=><button type="button" key={f.id} data-film-id={f.id} aria-pressed={film?.id===f.id} aria-controls="fm-detail" onClick={()=>{setSelected(f.id);if(window.matchMedia("(max-width: 850px)").matches)document.getElementById("fm-detail")?.focus()}}><span><b>{f.title}</b><small>{f.engine || 'Motor não registrado'}{f.created?' · '+day(f.created):''}</small></span><strong className={f.score===null?'fm-pending':'fm-score'}>{f.score===null?'Pendente':formatScore(f.score)}</strong></button>)}
        {!list.length && <p>{error && !snap?'Não foi possível carregar os filmes.':!snap?'Aguardando leitura.':query?'Nenhum filme corresponde à busca.':mode==='pending'?'Nenhuma nota pendente neste recorte.':'Nenhum registro neste recorte.'}</p>}</div>
      </div><FilmDetail film={film} /></div>
    </div>
  </section>
}
function FilmDetail({film}:{film?:MonitorFilm}) {
  return <aside id="fm-detail" tabIndex={-1} aria-label="Detalhes do filme" className="fm-detail">{film ? <>
    <p>Filme selecionado</p><h3>{film.title}</h3>
    <div className="fm-grade"><b>{film.score===null?'—':formatScore(film.score)}</b><span>/ 10 · revisor</span></div>
    <dl><dt>Motor</dt><dd>{film.engine||'Sem registro'}</dd><dt>Avaliação</dt><dd>{film.reviewed?day(film.reviewed)+' · '+time(film.reviewed)+' BRT':film.score===null?'Pendente':'Data não disponível'}</dd></dl>
    <h4>Defeitos registrados</h4>{film.defects?.length?<ul>{film.defects.map((d,i)=><li key={i}>{d}</li>)}</ul>:<p>{film.score===null?'Aguardando a avaliação.':film.defects===null?'Detalhes indisponíveis nesta leitura.':'Nenhum defeito registrado nesta avaliação.'}</p>}
    {film.url && <a href={film.url} target="_blank" rel="noreferrer">Abrir filme ↗</a>}
  </>:<p>Os detalhes aparecem quando há um filme no recorte.</p>}</aside>
}
