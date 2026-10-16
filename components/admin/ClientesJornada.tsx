// KINEO-ADMIN-JORNADA-1510 — a aba "Clientes" do /admin: os últimos cadastros, 10 por página, cada pessoa com quem é,
// o que fez (filmes + anúncios, com a nota de coerência), até onde chegou (a régua do funil) e por onde navegou.
// Só apresentação: nenhum hook, nenhum fetch, nenhum segredo. Recebe a página pronta de lib/admin/clientesJornada.ts
// (que roda no servidor depois do portão isAdminEmail). Detalhes por pessoa ficam em <details> (celular legível).
import Link from 'next/link'
import type { CSSProperties } from 'react'
import type { AnuncioCliente, ClienteJornada, FilmeCliente, PaginaClientes } from '@/lib/admin/clientesJornada'
import {
  CLIENTES_POR_PAGINA,
  EVENTOS_POR_PESSOA,
  FILTROS,
  JANELA_DIAS,
  PASSOS_VISIVEIS,
  hrefClientes,
  quando,
  ultimoPasso,
  type PassoTrilha,
  type StatusEntrega,
} from '@/lib/admin/clientesJornadaRegras'

const card: CSSProperties = { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', minWidth: 0 }
const chip: CSSProperties = { display: 'inline-flex', alignItems: 'center', padding: '5px 11px', borderRadius: 999, fontSize: 12, fontWeight: 700, textDecoration: 'none', border: '1px solid var(--border2)', color: 'var(--text2)', whiteSpace: 'nowrap' }
const chipOn: CSSProperties = { ...chip, background: 'var(--accent-soft)', color: 'var(--accent)', borderColor: 'var(--accent)' }
const selo = (cor: string): CSSProperties => ({ display: 'inline-block', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 800, color: cor, border: `1px solid ${cor}`, lineHeight: 1.5, whiteSpace: 'nowrap' })
const muted: CSSProperties = { color: 'var(--muted)' }
const resumo: CSSProperties = { cursor: 'pointer', color: 'var(--accent)', fontSize: 12.5, fontWeight: 800 }

const COR_STATUS: Record<StatusEntrega, string> = { pronto: 'var(--success)', falhou: 'var(--danger)', fazendo: 'var(--warning)', rascunho: 'var(--muted)' }
const ROTULO_STATUS: Record<StatusEntrega, string> = { pronto: 'pronto', falhou: 'falhou', fazendo: 'fazendo', rascunho: 'parou no rascunho' }
const corDaNota = (n: number) => (n >= 75 ? 'var(--success)' : n >= 50 ? 'var(--warning)' : 'var(--danger)')

function Miniatura({ thumb, rotulo }: { thumb: string | null; rotulo: string }) {
  const base: CSSProperties = { width: '100%', aspectRatio: '9 / 16', maxHeight: 190, borderRadius: 8, background: 'var(--card2)', border: '1px solid var(--border)', objectFit: 'cover', display: 'block' }
  // eslint-disable-next-line @next/next/no-img-element
  if (thumb) return <img src={thumb} alt="" loading="lazy" style={base} />
  return <div aria-hidden="true" style={{ ...base, display: 'grid', placeItems: 'center', color: 'var(--muted)', fontSize: 11, fontWeight: 800, textAlign: 'center', padding: 6 }}>▶<br />{rotulo}</div>
}

function CartaoFilme({ f }: { f: FilmeCliente }) {
  return (
    <div data-kineo="filme" style={{ minWidth: 0, display: 'grid', gap: 5, alignContent: 'start' }}>
      <Miniatura thumb={f.thumb} rotulo={f.motor} />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
        <span style={selo(COR_STATUS[f.status])}>{ROTULO_STATUS[f.status]}</span>
        {f.nota ? (
          <span data-kineo="nota-coerencia" title={`nota de coerência (a mesma do /admin/coerencia): ${f.nota.verdict}`} style={selo(corDaNota(f.nota.score))}>nota {f.nota.score}</span>
        ) : (
          <span title="ainda sem nota — o juiz roda ao abrir /admin/coerencia" style={{ ...selo('var(--muted)'), fontWeight: 600 }}>sem nota</span>
        )}
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--text2)', fontWeight: 800 }}>{f.motor}{f.segundos ? ` · ${f.segundos}s` : ''}{f.creditos != null ? ` · ${f.creditos} cr` : ''}</div>
      <div style={{ fontSize: 11, ...muted }}>{quando(f.em)}</div>
      {f.tema && <div title={f.tema} style={{ fontSize: 11, color: 'var(--text2)', lineHeight: 1.35, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{f.tema}</div>}
      {f.url ? <a href={f.url} target="_blank" rel="noreferrer" data-kineo="assistir" style={{ color: 'var(--accent)', fontSize: 12, fontWeight: 800 }}>▶ assistir</a> : <span style={{ fontSize: 11, ...muted }}>sem arquivo</span>}
    </div>
  )
}

function CartaoAnuncio({ a }: { a: AnuncioCliente }) {
  return (
    <div data-kineo="anuncio" style={{ minWidth: 0, display: 'grid', gap: 5, alignContent: 'start' }}>
      <Miniatura thumb={a.thumb} rotulo="anúncio" />
      <div><span title={`ads_v2_orders.status = ${a.statusBruto}`} style={selo(COR_STATUS[a.status])}>{ROTULO_STATUS[a.status]}</span></div>
      <div style={{ fontSize: 11.5, color: 'var(--text2)', fontWeight: 800 }}>Studio Ads{a.degrau ? ` · ${a.degrau}` : ''}{a.segundos ? ` · ${a.segundos}s` : ''}</div>
      <div style={{ fontSize: 11, ...muted }}>{quando(a.em)}{a.setor ? ` · ${a.setor}` : ''}</div>
      {a.erro && <div style={{ fontSize: 11, color: 'var(--danger)', lineHeight: 1.35 }}>{a.erro}</div>}
      {a.url ? <a href={a.url} target="_blank" rel="noreferrer" data-kineo="assistir" style={{ color: 'var(--accent)', fontSize: 12, fontWeight: 800 }}>▶ assistir</a> : null}
    </div>
  )
}

const grade: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(118px, 1fr))', gap: 12 }

function LinhaTrilha({ t }: { t: PassoTrilha }) {
  return (
    <li style={{ display: 'flex', gap: 10, alignItems: 'baseline', padding: '3px 0', borderTop: '1px solid var(--border)', fontSize: 12, minWidth: 0 }}>
      <span style={{ ...muted, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{quando(t.em)}</span>
      <span style={{ color: 'var(--text2)', fontFamily: 'ui-monospace, Menlo, Consolas, monospace', minWidth: 0, overflowWrap: 'anywhere' }}>{t.path}</span>
      {t.vezes > 1 && <span style={{ ...muted, whiteSpace: 'nowrap' }}>{t.vezes}×</span>}
      {t.anonimo && <span title="antes do cadastro — mesma sessão do navegador" style={{ ...selo('var(--warning)'), fontSize: 10, marginLeft: 'auto' }}>anônimo</span>}
    </li>
  )
}

function Regua({ c }: { c: ClienteJornada }) {
  return (
    <ol data-kineo="regua" aria-label="Até onde chegou no funil" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      {c.regua.map((p) => (
        <li key={p.chave} data-ok={p.ok ? '1' : '0'} title={p.ok ? `${quando(p.em)}${p.fonte ? ` · ${p.fonte}` : ''}` : 'sem registro'} style={{ display: 'inline-flex', gap: 4, alignItems: 'center', padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: p.ok ? 'rgba(95,212,164,.10)' : 'transparent', border: `1px solid ${p.ok ? 'rgba(95,212,164,.45)' : 'var(--border)'}`, color: p.ok ? 'var(--success)' : 'var(--muted)' }}>
          <span aria-hidden="true">{p.ok ? '✓' : '✗'}</span>{p.rotulo}
        </li>
      ))}
    </ol>
  )
}

function Pessoa({ c, aberto }: { c: ClienteJornada; aberto: boolean }) {
  const ult = ultimoPasso(c.regua)
  const visiveis = c.trilha.slice(0, PASSOS_VISIVEIS)
  const resto = c.trilha.slice(PASSOS_VISIVEIS)
  const o = c.origem
  const detalhesOrigem = [o.utmMedium && `medium ${o.utmMedium}`, o.utmCampaign && `campanha ${o.utmCampaign}`, o.referrer && `ref ${o.referrer}`, o.superficie && `tela ${o.superficie}`, o.gclid && 'gclid'].filter((x): x is string => typeof x === 'string' && x.length > 0)
  return (
    <article data-kineo="cliente" style={{ ...card, display: 'grid', gap: 10 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 10px', alignItems: 'center' }}>
        <strong style={{ color: 'var(--text)', fontSize: 15, overflowWrap: 'anywhere' }}>{c.email || c.id.slice(0, 8)}</strong>
        {c.pais && <span style={selo('var(--text2)')} title={c.paisUltimo && c.paisUltimo !== c.pais ? `último acesso: ${c.paisUltimo}` : 'país do cadastro'}>{c.pais}{c.paisUltimo && c.paisUltimo !== c.pais ? ` → ${c.paisUltimo}` : ''}</span>}
        {c.pagou ? <span style={selo('var(--success)')}>pagou · {c.plano ?? '—'}</span> : <span style={selo('var(--muted)')}>{c.plano ?? 'free'}{c.trial ? ` · trial ${c.trial}` : ''}</span>}
        <span style={{ fontSize: 12, ...muted }}>{c.creditos ?? 0} créditos</span>
        {c.interna && <span style={selo('var(--warning)')}>interna</span>}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px', fontSize: 12.5, color: 'var(--text2)' }}>
        <span><span style={muted}>cadastro </span>{quando(c.criadoEm)}</span>
        <span data-kineo="origem">
          <span style={muted}>origem </span><b>{o.fonte}</b>
          {o.iaProvavel && <span style={{ ...selo('var(--accent)'), marginLeft: 6 }} title="estimativa (lib/acquisitionSource.ts): pouso sem referrer e sem utm numa página de conteúdo">assistente de IA provável</span>}
          {detalhesOrigem.length > 0 && <span style={muted}> · {detalhesOrigem.join(' · ')}</span>}
        </span>
        <span data-kineo="entrada"><span style={muted}>entrou por </span>{c.entrada ? <code style={{ color: 'var(--text2)' }}>{c.entrada.path}</code> : '—'}{c.entrada?.antesDoCadastro ? <span style={muted}> (antes do cadastro)</span> : null}</span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px', fontSize: 12.5, color: 'var(--text2)' }}>
        <span><b>{c.filmesTotal}</b> filme{c.filmesTotal === 1 ? '' : 's'}</span>
        <span><b>{c.anunciosTotal}</b> anúncio{c.anunciosTotal === 1 ? '' : 's'}</span>
        {c.contadores.clipes > 0 && <span><b>{c.contadores.clipes}</b> clipe{c.contadores.clipes === 1 ? '' : 's'}</span>}
        {c.contadores.imagens > 0 && <span><b>{c.contadores.imagens}</b> {c.contadores.imagens === 1 ? 'imagem' : 'imagens'}</span>}
        {c.contadores.audios > 0 && <span><b>{c.contadores.audios}</b> áudio{c.contadores.audios === 1 ? '' : 's'}</span>}
        {c.fazendo && <span style={{ color: 'var(--warning)', fontWeight: 800 }}>fazendo agora (desde {quando(c.fazendo.desde)})</span>}
        {c.falhas.length > 0 && <span style={{ color: 'var(--danger)' }}>{c.falhas.length} falha{c.falhas.length === 1 ? '' : 's'}</span>}
        <span style={{ marginLeft: 'auto', ...muted }}>chegou até: <b style={{ color: 'var(--text)' }}>{ult?.rotulo ?? '—'}</b></span>
      </div>
      <Regua c={c} />
      <details open={aberto} data-kineo="detalhes-cliente">
        <summary style={resumo}>Ver o que fez e por onde navegou ({c.trilha.length} passos)</summary>
        <div style={{ display: 'grid', gap: 16, marginTop: 12 }}>
          <section>
            <h3 style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--text)' }}>Filmes {c.filmesTotal > c.filmes.length ? <span style={{ ...muted, fontWeight: 400 }}>(mostrando {c.filmes.length} de {c.filmesTotal})</span> : null}</h3>
            {c.filmes.length ? <div style={grade}>{c.filmes.map((f) => <CartaoFilme key={f.id} f={f} />)}</div> : <p style={{ margin: 0, fontSize: 12, ...muted }}>Nenhum filme pronto.</p>}
          </section>
          <section>
            <h3 style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--text)' }}>Anúncios (Studio Ads) {c.anunciosTotal > c.anuncios.length ? <span style={{ ...muted, fontWeight: 400 }}>(mostrando {c.anuncios.length} de {c.anunciosTotal})</span> : null}</h3>
            {c.anuncios.length ? <div style={grade}>{c.anuncios.map((a) => <CartaoAnuncio key={a.id} a={a} />)}</div> : <p style={{ margin: 0, fontSize: 12, ...muted }}>Nenhum pedido de anúncio.</p>}
          </section>
          {c.falhas.length > 0 && (
            <section>
              <h3 style={{ margin: '0 0 6px', fontSize: 13, color: 'var(--text)' }}>Tentativas que falharam <span style={{ ...muted, fontWeight: 400 }}>(a frase que o servidor devolveu)</span></h3>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: 'var(--danger)', lineHeight: 1.5 }}>
                {c.falhas.map((f, i) => <li key={i}><span style={muted}>{quando(f.em)} · </span>{f.erro}</li>)}
              </ul>
            </section>
          )}
          <section>
            <h3 style={{ margin: '0 0 6px', fontSize: 13, color: 'var(--text)' }}>Régua do funil</h3>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', fontSize: 12, display: 'grid', gap: 2 }}>
              {c.regua.map((p) => (
                <li key={p.chave} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', color: p.ok ? 'var(--text2)' : 'var(--muted)' }}>
                  <span style={{ color: p.ok ? 'var(--success)' : 'var(--muted)', fontWeight: 900, width: 12 }}>{p.ok ? '✓' : '✗'}</span>
                  <span style={{ minWidth: 150 }}>{p.rotulo}</span>
                  <span style={muted}>{p.ok ? `${quando(p.em)}${p.fonte ? ` · ${p.fonte}` : ''}` : 'sem registro'}</span>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h3 style={{ margin: '0 0 6px', fontSize: 13, color: 'var(--text)' }}>Páginas que navegou</h3>
            <p style={{ margin: '0 0 6px', fontSize: 11.5, ...muted }}>
              {c.anonimosLigados > 0 ? `${c.anonimosLigados} eventos de antes do cadastro ligados pela mesma sessão do navegador.` : 'Sem navegação anônima ligada (outra aba/aparelho antes do cadastro não tem como ser ligada).'}
              {c.eventosTruncados ? ` Muitos eventos: a trilha usa só os primeiros ${EVENTOS_POR_PESSOA} da janela; a régua completou os passos que faltavam.` : ''}
            </p>
            {visiveis.length ? (
              <ol data-kineo="trilha" style={{ listStyle: 'none', margin: 0, padding: 0 }}>{visiveis.map((t, i) => <LinhaTrilha key={i} t={t} />)}</ol>
            ) : <p style={{ margin: 0, fontSize: 12, ...muted }}>Nenhuma página registrada na janela.</p>}
            {resto.length > 0 && (
              <details data-kineo="trilha-mais" style={{ marginTop: 6 }}>
                <summary style={resumo}>ver mais ({resto.length})</summary>
                <ol style={{ listStyle: 'none', margin: '6px 0 0', padding: 0 }}>{resto.map((t, i) => <LinhaTrilha key={i} t={t} />)}</ol>
              </details>
            )}
          </section>
          {c.erros.length > 0 && <p style={{ margin: 0, fontSize: 11.5, color: 'var(--warning)' }}>Leitura incompleta: {c.erros.join(' · ')}</p>}
        </div>
      </details>
    </article>
  )
}

export default function ClientesJornada({ pagina, abrirPrimeiro = false }: { pagina: PaginaClientes; abrirPrimeiro?: boolean }) {
  const { params, total, clientes } = pagina
  const paginas = total != null ? Math.max(1, Math.ceil(total / CLIENTES_POR_PAGINA)) : null
  const temProxima = paginas != null ? params.pagina < paginas : clientes.length === CLIENTES_POR_PAGINA
  return (
    <main data-kineo="admin-clientes" style={{ padding: '18px clamp(16px, 3vw, 28px) 48px', display: 'grid', gap: 14, minWidth: 0 }}>
      <header style={{ display: 'grid', gap: 6 }}>
        <h1 style={{ margin: 0 }}>Clientes</h1>
        <p style={{ margin: 0, fontSize: 13, ...muted }}>
          Os cadastros mais novos primeiro, {CLIENTES_POR_PAGINA} por página. Horários de Brasília. Eventos lidos do dia anterior ao cadastro até {JANELA_DIAS} dias depois.
          {params.internas ? ' Contas internas incluídas.' : ' Contas internas fora.'}
        </p>
      </header>
      <nav aria-label="Filtros" data-kineo="filtros-clientes" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
        {FILTROS.map(([k, rotulo]) => (
          <Link key={k} href={hrefClientes(params, { filtro: k, pagina: 1 })} prefetch={false} aria-current={params.filtro === k ? 'true' : undefined} style={params.filtro === k ? chipOn : chip}>{rotulo}</Link>
        ))}
        <Link href={hrefClientes(params, { internas: !params.internas, pagina: 1 })} prefetch={false} data-kineo="mostrar-internas" style={params.internas ? chipOn : chip}>{params.internas ? 'esconder internas' : 'mostrar internas'}</Link>
        <span style={{ marginLeft: 'auto', fontSize: 12, ...muted }}>{total != null ? `${total} pessoa${total === 1 ? '' : 's'}` : ''}{paginas ? ` · página ${params.pagina} de ${paginas}` : ''}</span>
      </nav>
      {pagina.erro && <p role="alert" style={{ ...card, color: 'var(--danger)', margin: 0 }}>Não deu para ler os cadastros: {pagina.erro}</p>}
      {!pagina.erro && clientes.length === 0 && <p style={{ ...card, margin: 0, ...muted }}>Ninguém com esse filtro nesta página.</p>}
      <div style={{ display: 'grid', gap: 12 }}>
        {clientes.map((c, i) => <Pessoa key={c.id} c={c} aberto={abrirPrimeiro && i === 0} />)}
      </div>
      <nav aria-label="Paginação" data-kineo="paginacao" style={{ display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center' }}>
        {params.pagina > 1 ? <Link href={hrefClientes(params, { pagina: params.pagina - 1 })} prefetch={false} rel="prev" style={chip}>← anterior</Link> : <span style={{ ...chip, opacity: 0.4 }}>← anterior</span>}
        <span style={{ fontSize: 12, ...muted }}>página {params.pagina}{paginas ? ` de ${paginas}` : ''}</span>
        {temProxima ? <Link href={hrefClientes(params, { pagina: params.pagina + 1 })} prefetch={false} rel="next" style={chip}>próxima →</Link> : <span style={{ ...chip, opacity: 0.4 }}>próxima →</span>}
      </nav>
    </main>
  )
}
