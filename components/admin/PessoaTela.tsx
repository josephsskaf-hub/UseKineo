// KINEO-ADMIN-PESSOA-1910 — a TELA DA PESSOA do /admin (fundador 19/10: "clicar no nome da pessoa e abrir uma tela somente da
// pessoa"). Só apresentação: nenhum hook, nenhum fetch, nenhum segredo. Recebe a tela pronta de lib/admin/pessoaTela.ts, que
// roda no servidor DEPOIS do portão isAdminEmail. Feita para o iPhone: uma coluna, seções compactas, listas em vez de tabelas,
// e vídeo que só baixa quando o fundador toca (preload="none").
import Link from 'next/link'
import type { CSSProperties, ReactNode } from 'react'
import type { AnuncioPessoa, ClipePessoa, FilmePessoa, TelaPessoa } from '@/lib/admin/pessoaTela'
import { quando } from '@/lib/admin/clientesJornadaRegras'
import { PessoaLink } from '@/components/admin/PessoaLink'
import { NOTA_PERFEITA, ROTULO_PRODUTO, ROTULO_STATUS, bandeira, corDaNota, type StatusItem, type TomItem } from '@/lib/admin/pessoaTelaRegras'

const card: CSSProperties = { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', minWidth: 0 }
const muted: CSSProperties = { color: 'var(--muted)' }
const h2: CSSProperties = { margin: '0 0 10px', fontSize: 14, fontWeight: 900, color: 'var(--text)', letterSpacing: '.02em' }
const h3: CSSProperties = { margin: '12px 0 6px', fontSize: 12.5, fontWeight: 800, color: 'var(--text2)' }
const linha: CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: '4px 10px', alignItems: 'baseline', padding: '5px 0', borderTop: '1px solid var(--border)', fontSize: 12.5, minWidth: 0 }
const resumo: CSSProperties = { cursor: 'pointer', color: 'var(--accent)', fontSize: 12.5, fontWeight: 800 }
const selo = (cor: string): CSSProperties => ({ display: 'inline-block', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 800, color: cor, border: `1px solid ${cor}`, lineHeight: 1.5, whiteSpace: 'nowrap' })
const COR_STATUS: Record<StatusItem, string> = { entregue: 'var(--success)', falhou: 'var(--danger)', estornado: 'var(--warning)', fazendo: 'var(--warning)', rascunho: 'var(--muted)', cobrado_sem_entrega: 'var(--danger)' }
const COR_NOTA = { perfeita: 'var(--success)', boa: 'var(--success)', media: 'var(--warning)', ruim: 'var(--danger)' } as const
const COR_TOM: Record<TomItem, string> = { marco: 'var(--text)', erro: 'var(--danger)', dinheiro: 'var(--success)', normal: 'var(--text2)' }
const grade: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }

const cr = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toLocaleString('pt-BR')} cr`
const plural = (n: number, um: string, varios: string) => `${n.toLocaleString('pt-BR')} ${n === 1 ? um : varios}`

function Secao({ id, titulo, children, extra }: { id: string; titulo: string; children: ReactNode; extra?: ReactNode }) {
  return (
    <section id={id} data-kineo={`pessoa-${id}`} style={card}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'baseline', justifyContent: 'space-between' }}>
        <h2 style={h2}>{titulo}</h2>
        {extra ? <span style={{ fontSize: 12, ...muted }}>{extra}</span> : null}
      </div>
      {children}
    </section>
  )
}

function Nota({ nota }: { nota: { score: number; verdict: string } | null }) {
  if (!nota) return <span title="ainda sem nota — o juiz roda ao abrir /admin/coerencia" style={{ ...selo('var(--muted)'), fontWeight: 600 }}>sem nota</span>
  const c = corDaNota(nota.score)
  return <span data-kineo="nota-coerencia" title={`nota de coerência (a mesma do /admin/coerencia; ${NOTA_PERFEITA} = perfeito): ${nota.verdict}`} style={selo(COR_NOTA[c])}>nota {nota.score}{c === 'perfeita' ? ' ★' : ''}</span>
}

// KINEO-META95-REGUA-1910 — a nota NOVA da régua 95 (coerência v2 + pixel; 95 = perfeito), ao lado da nota antiga.
function NotaRegua95({ r }: { r: { coerencia: number | null; pixel: number | null; nota: number | null; motivo: string | null } | null | undefined }) {
  if (!r || r.nota == null) return null
  const c = corDaNota(r.nota)
  return <span data-kineo="nota-regua95" title={`régua 95 (a menor das duas): coerência v2 ${r.coerencia ?? '—'} · pixel ${r.pixel ?? '—'}${r.motivo ? ` — ${r.motivo}` : ''}`} style={selo(COR_NOTA[c])}>95: {r.nota}{c === 'perfeita' ? ' ★' : ''}</span>
}

/** Player leve: nada baixa até o toque (preload="none"); sem arquivo, a miniatura ou um quadro vazio. */
function Player({ url, thumb, rotulo }: { url: string | null; thumb: string | null; rotulo: string }) {
  const base: CSSProperties = { width: '100%', aspectRatio: '9 / 16', maxHeight: 250, borderRadius: 8, background: 'var(--card2)', border: '1px solid var(--border)', objectFit: 'cover', display: 'block' }
  if (url) return <video data-kineo="player" src={url} poster={thumb ?? undefined} preload="none" controls playsInline style={base} />
  // eslint-disable-next-line @next/next/no-img-element
  if (thumb) return <img src={thumb} alt="" loading="lazy" style={base} />
  return <div aria-hidden="true" style={{ ...base, display: 'grid', placeItems: 'center', color: 'var(--muted)', fontSize: 11, fontWeight: 800, textAlign: 'center', padding: 6 }}>{rotulo}</div>
}

function CartaoFilme({ f }: { f: FilmePessoa }) {
  return (
    <div data-kineo="filme" style={{ minWidth: 0, display: 'grid', gap: 5, alignContent: 'start' }}>
      <Player url={f.url} thumb={f.thumb} rotulo={f.motor} />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        <span style={selo(COR_STATUS[f.status])}>{ROTULO_STATUS[f.status]}</span>
        <Nota nota={f.nota} />
        <NotaRegua95 r={f.regua95} />
        {f.opiniao && <span title="o que a própria pessoa disse do filme" style={selo('var(--text2)')}>{f.opiniao === 'up' ? '👍' : '👎'}</span>}
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--text2)', fontWeight: 800 }}>{f.motor}{f.segundos ? ` · ${f.segundos}s` : ''}{f.creditos != null ? ` · ${f.creditos} cr` : ''}</div>
      <div style={{ fontSize: 11, ...muted }}>{quando(f.em)}</div>
      {f.tema && <div title={f.tema} style={{ fontSize: 11, color: 'var(--text2)', lineHeight: 1.35, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>{f.tema}</div>}
    </div>
  )
}

function CartaoAnuncio({ a }: { a: AnuncioPessoa }) {
  return (
    <div data-kineo="anuncio" style={{ minWidth: 0, display: 'grid', gap: 5, alignContent: 'start' }}>
      <Player url={a.url} thumb={a.thumb} rotulo="anúncio" />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        <span title={`ads_v2_orders.status = ${a.statusBruto}`} style={selo(COR_STATUS[a.status])}>{ROTULO_STATUS[a.status]}</span>
        {a.juiz && a.juiz.julgados > 0 ? (
          <span data-kineo="nota-anuncio" title="juiz do produto (ads_v2_product_locked): planos aprovados / julgados" style={selo(a.juiz.recusados === 0 ? 'var(--success)' : 'var(--warning)')}>juiz {a.juiz.aprovados}/{a.juiz.julgados}</span>
        ) : (
          <span title="este anúncio não passou pelo juiz do produto" style={{ ...selo('var(--muted)'), fontWeight: 600 }}>sem nota</span>
        )}
        <NotaRegua95 r={a.regua95} />
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--text2)', fontWeight: 800 }}>Studio Ads{a.degrau ? ` · ${a.degrau}` : ''}{a.segundos ? ` · ${a.segundos}s` : ''}{a.creditos != null ? ` · ${a.creditos} cr` : ''}</div>
      <div style={{ fontSize: 11, ...muted }}>{quando(a.em)}{a.setor ? ` · ${a.setor}` : ''}</div>
      {a.erro && <div style={{ fontSize: 11, color: 'var(--danger)', lineHeight: 1.35 }}>{a.erro}</div>}
    </div>
  )
}

function CartaoClipe({ c }: { c: ClipePessoa }) {
  return (
    <div data-kineo="clipe" style={{ minWidth: 0, display: 'grid', gap: 5, alignContent: 'start' }}>
      <Player url={c.url} thumb={null} rotulo={c.motor} />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        <span style={selo(COR_STATUS[c.status])}>{ROTULO_STATUS[c.status]}</span>
        {c.regua95?.nota != null ? <NotaRegua95 r={c.regua95} /> : <span style={{ ...selo('var(--muted)'), fontWeight: 600 }}>sem nota</span>}
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--text2)', fontWeight: 800 }}>{c.motor}{c.segundos ? ` · ${c.segundos}s` : ''}{c.creditos != null ? ` · ${c.creditos} cr` : ''}</div>
      <div style={{ fontSize: 11, ...muted }}>{quando(c.em)}</div>
      {c.prompt && <div style={{ fontSize: 11, color: 'var(--text2)', lineHeight: 1.35, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{c.prompt}</div>}
      {c.erro && <div style={{ fontSize: 11, color: 'var(--danger)' }}>{c.erro}</div>}
    </div>
  )
}

function Campo({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return <div style={{ minWidth: 0 }}><div style={{ fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em', ...muted }}>{rotulo}</div><div style={{ fontSize: 13, color: 'var(--text)', overflowWrap: 'anywhere' }}>{children}</div></div>
}

export default function PessoaTela({ t }: { t: TelaPessoa }) {
  const o = t.origem
  const r = t.creditos.resumo
  const c = t.compras
  const detalhesOrigem = [o.utmMedium && `medium ${o.utmMedium}`, o.utmCampaign && `campanha ${o.utmCampaign}`, o.referrer && `ref ${o.referrer}`, o.superficie && `tela ${o.superficie}`, o.gclid && 'gclid (Google Ads)'].filter((x): x is string => typeof x === 'string' && x.length > 0)
  const ehAfiliado = t.afiliado.length > 0
  return (
    <main data-kineo="admin-pessoa" style={{ padding: '14px clamp(12px, 3vw, 28px) 48px', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 12, minWidth: 0, maxWidth: 1100, boxSizing: 'border-box' }}>
      <nav style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 12.5 }}>
        <Link href="/admin/people" prefetch={false} style={{ color: 'var(--accent)', fontWeight: 800, textDecoration: 'none' }}>← Pessoas</Link>
        <Link href="/admin/clientes" prefetch={false} style={{ color: 'var(--muted)', textDecoration: 'none' }}>Clientes</Link>
        <Link href="/admin" prefetch={false} style={{ color: 'var(--muted)', textDecoration: 'none' }}>Visão geral</Link>
      </nav>

      {/* ── 1. Cabeçalho ── */}
      <header data-kineo="pessoa-cabecalho" style={{ ...card, display: 'grid', gap: 10 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 10px', alignItems: 'center' }}>
          <h1 style={{ margin: 0, fontSize: 18, overflowWrap: 'anywhere' }}>{t.email || t.id}</h1>
          <a href={`mailto:${t.email}`} data-kineo="escrever-email" title="Escrever e-mail" style={{ ...selo('var(--accent)'), textDecoration: 'none' }}>✉ e-mail</a>
        </div>
        {t.nome && <div style={{ fontSize: 13, color: 'var(--text2)' }}>{t.nome}</div>}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          <span style={selo(t.pagante ? 'var(--success)' : 'var(--muted)')}>{t.planoRotulo}{t.cobranca ? ` · ${t.cobranca === 'annual' ? 'ANUAL' : 'mensal'}` : ''}</span>
          <span style={selo(t.pagante ? 'var(--success)' : t.jaPagou ? 'var(--warning)' : 'var(--muted)')}>{t.pagante ? 'pagante' : t.jaPagou ? 'já pagou (não paga hoje)' : 'nunca pagou'}</span>
          {t.interna && <span style={selo('var(--warning)')}>conta interna</span>}
          {ehAfiliado && <span style={selo('var(--accent)')}>afiliado</span>}
          {t.veioDeAfiliado.length > 0 && <span style={selo('var(--accent)')}>veio de afiliado</span>}
          {t.cortesias.some((x) => x.status === 'active') && <span style={selo('var(--text2)')}>cortesia ativa</span>}
          {o.iaProvavel && <span style={selo('var(--accent)')}>assistente de IA provável</span>}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
          <Campo rotulo="cadastro">{quando(t.cadastroEm)}</Campo>
          <Campo rotulo="país">{t.pais ? `${bandeira(t.pais)} ${t.pais}` : '—'}{t.paisUltimo && t.paisUltimo !== t.pais ? ` → último acesso ${bandeira(t.paisUltimo)} ${t.paisUltimo}` : ''}</Campo>
          <Campo rotulo="origem"><b>{o.fonte}</b>{detalhesOrigem.length ? <span style={muted}> · {detalhesOrigem.join(' · ')}</span> : null}</Campo>
          <Campo rotulo="saldo agora">{r.saldo != null ? `${r.saldo.toLocaleString('pt-BR')} cr` : '—'}</Campo>
          <Campo rotulo="dispositivo">{t.dispositivo ?? '—'}</Campo>
          <Campo rotulo="idioma dos vídeos">{t.idioma ?? '—'}</Campo>
          {t.trial.status && <Campo rotulo="trial">{t.trial.status}{t.trial.ganhou ? ` · usou ${t.trial.usou ?? 0} de ${t.trial.ganhou}` : ''}{t.trial.fim ? ` · fim ${quando(t.trial.fim)}` : ''}</Campo>}
          {t.planoVence && <Campo rotulo="plano vence">{quando(t.planoVence)}</Campo>}
        </div>
      </header>

      {/* ── 2. Afiliado ── */}
      <Secao id="afiliado" titulo="Afiliado" extra={ehAfiliado ? 'é afiliado' : 'não é afiliado'}>
        {t.afiliado.map((a) => (
          <div key={a.id} style={{ display: 'grid', gap: 6, marginBottom: 8 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
              <b style={{ fontSize: 13 }}>código {a.codigo ?? '—'}</b>
              {a.status && <span style={selo(a.status === 'active' || a.status === 'approved' ? 'var(--success)' : 'var(--muted)')}>{a.status}</span>}
              {a.tipo && <span style={selo('var(--text2)')}>{a.tipo}</span>}
              {a.comissao != null && <span style={{ fontSize: 12, ...muted }}>comissão {a.comissao <= 1 ? Math.round(a.comissao * 100) : a.comissao}%</span>}
              {a.cupom && <span style={{ fontSize: 12, ...muted }}>cupom {a.cupom}</span>}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px', fontSize: 12.5 }}>
              <span><b>{a.cliques ?? '—'}</b> cliques{a.ultimoClique ? <span style={muted}> (último {quando(a.ultimoClique)})</span> : null}</span>
              <span><b>{a.cadastrosTotal ?? 0}</b> cadastros atribuídos</span>
              <span><b>{a.comissoes.n}</b> comissões{a.comissoes.n ? ` · ${(a.comissoes.total / 100).toFixed(2)} ${(a.comissoes.moeda ?? 'usd').toUpperCase()} (pagas ${(a.comissoes.pagas / 100).toFixed(2)})` : ''}</span>
              {a.desde && <span style={muted}>afiliado desde {quando(a.desde)}</span>}
            </div>
            {a.cadastros.length > 0 && (
              <details><summary style={resumo}>quem ele trouxe ({a.cadastros.length})</summary>
                <ul style={{ listStyle: 'none', margin: '6px 0 0', padding: 0 }}>
                  {a.cadastros.map((x, i) => <li key={i} style={linha}><span style={muted}>{quando(x.em)}</span><span style={{ overflowWrap: 'anywhere' }}>{x.email ?? '—'}</span><span style={muted}>{x.status ?? ''}{x.converteu ? ' · converteu' : ''}</span></li>)}
                </ul>
              </details>
            )}
          </div>
        ))}
        <h3 style={h3}>Veio de link de afiliado?</h3>
        {t.veioDeAfiliado.length === 0 && !t.indicadoPor ? <p style={{ margin: 0, fontSize: 12.5, ...muted }}>Não — nenhuma atribuição registrada (affiliate_referrals, profiles.affiliate_id e evento de atribuição vazios).</p> : null}
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {t.veioDeAfiliado.map((v, i) => (
            <li key={i} style={linha}>
              <b>{v.afiliado ? (v.afiliado.nome ?? v.afiliado.email ?? v.afiliado.id.slice(0, 8)) : 'afiliado desconhecido'}</b>
              {v.afiliado?.codigo && <span style={muted}>código {v.afiliado.codigo}</span>}
              <span style={muted}>{v.registro}</span>
              {v.em && <span style={muted}>{quando(v.em)}</span>}
            </li>
          ))}
          {t.indicadoPor && <li style={linha}><b>indicado por</b> <PessoaLink id={t.indicadoPor.id} style={{ color: 'var(--accent)' }}>{t.indicadoPor.email ?? t.indicadoPor.id.slice(0, 8)}</PessoaLink><span style={muted}>profiles.referred_by</span></li>}
        </ul>
      </Secao>

      {/* ── 3. Créditos ── */}
      <Secao id="creditos" titulo="Créditos" extra={`ganhou ${r.ganhou.toLocaleString('pt-BR')} · usou ${r.usou.toLocaleString('pt-BR')} · saldo ${r.saldo ?? '—'}`}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10 }}>
          <Campo rotulo="ganhou">{r.ganhou.toLocaleString('pt-BR')} cr</Campo>
          <Campo rotulo="usou">{r.usou.toLocaleString('pt-BR')} cr</Campo>
          <Campo rotulo="estornado">{r.estornado.toLocaleString('pt-BR')} cr</Campo>
          <Campo rotulo="saldo agora">{r.saldo != null ? `${r.saldo.toLocaleString('pt-BR')} cr` : '—'}</Campo>
        </div>
        {r.diferenca !== null && r.diferenca !== 0 && (
          <p data-kineo="conta-nao-fecha" style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--warning)' }}>
            A conta não fecha por {cr(r.diferenca)} (saldo − ganhou + usou){r.comprasSemRegistro ? ` — ${plural(r.comprasSemRegistro, 'compra antiga', 'compras antigas')} sem registro de crédito no evento` : ''}{t.creditos.debitosTruncados ? ' — débitos além dos últimos 500 não foram lidos' : ''}.
          </p>
        )}
        {r.usouPorProduto.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
            {r.usouPorProduto.map((u) => <span key={u.produto} style={selo('var(--text2)')}>{ROTULO_PRODUTO[u.produto]}: {u.creditos} cr · {u.vezes}×</span>)}
          </div>
        )}
        <h3 style={h3}>Cada concessão ({t.creditos.concessoes.length})</h3>
        {t.creditos.concessoes.length === 0 ? <p style={{ margin: 0, fontSize: 12, ...muted }}>Nenhuma concessão registrada.</p> : (
          <ul data-kineo="concessoes" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {t.creditos.concessoes.map((g, i) => (
              <li key={i} style={linha}>
                <span style={{ ...muted, whiteSpace: 'nowrap' }}>{quando(g.em)}</span>
                <b style={{ color: g.creditos < 0 ? 'var(--danger)' : 'var(--success)', whiteSpace: 'nowrap' }}>{cr(g.creditos)}</b>
                <span>{g.rotulo}</span>
                {g.quem && <span style={muted}>por {g.quem}</span>}
                {g.motivo && <span style={{ ...muted, flexBasis: '100%', fontSize: 11.5 }}>{g.motivo}</span>}
              </li>
            ))}
          </ul>
        )}
        <details style={{ marginTop: 8 }}>
          <summary style={resumo}>Cada débito ({t.creditos.debitos.length})</summary>
          <ul data-kineo="debitos" style={{ listStyle: 'none', margin: '6px 0 0', padding: 0 }}>
            {t.creditos.debitos.map((d) => (
              <li key={d.renderId} style={linha}>
                <span style={{ ...muted, whiteSpace: 'nowrap' }}>{quando(d.em)}</span>
                <b style={{ whiteSpace: 'nowrap', textDecoration: d.estornado ? 'line-through' : undefined }}>−{d.creditos} cr</b>
                <span>{ROTULO_PRODUTO[d.produto]}</span>
                {d.estornado && <span style={selo('var(--warning)')}>estornado {quando(d.estornadoEm)}</span>}
                <code style={{ ...muted, fontSize: 10.5, overflowWrap: 'anywhere' }}>{d.renderId}</code>
              </li>
            ))}
          </ul>
        </details>
        {t.cortesias.length > 0 && (
          <>
            <h3 style={h3}>Cortesias</h3>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {t.cortesias.map((x, i) => <li key={i} style={linha}><b>{x.nivel ?? '—'}</b><span style={selo(x.status === 'active' ? 'var(--success)' : 'var(--muted)')}>{x.status ?? '—'}</span><span style={muted}>{quando(x.inicio)} → {quando(x.fim)}</span>{x.creditos ? <span>+{x.creditos} cr</span> : null}{x.quem && <span style={muted}>por {x.quem}</span>}{x.motivo && <span style={{ ...muted, flexBasis: '100%', fontSize: 11.5 }}>{x.motivo}</span>}</li>)}
            </ul>
          </>
        )}
      </Secao>

      {/* ── 4. Compras ── */}
      <Secao id="compras" titulo="Compras" extra={`${plural(c.pagamentos, 'pagamento', 'pagamentos')} · ${plural(c.checkoutsSemPagar, 'checkout sem pagar', 'checkouts sem pagar')} · ${plural(c.falhasCartao, 'recusa', 'recusas')} · ${plural(c.cancelamentos, 'cancelamento', 'cancelamentos')}`}>
        {c.itens.length === 0 ? <p style={{ margin: 0, fontSize: 12.5, ...muted }}>Nunca abriu checkout nem pagou.</p> : (
          <ul data-kineo="compras" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {c.itens.map((x, i) => (
              <li key={i} style={linha}>
                <span style={{ ...muted, whiteSpace: 'nowrap' }}>{quando(x.em)}</span>
                <b style={{ color: x.tipo === 'falha_cartao' || x.tipo === 'cancelou' ? 'var(--danger)' : x.tipo === 'checkout_aberto' || x.tipo === 'checkout_desistiu' ? 'var(--warning)' : 'var(--success)' }}>{x.rotulo}</b>
                {x.valor && <span>{x.valor}</span>}
                {x.detalhe && <span style={muted}>{x.detalhe}</span>}
              </li>
            ))}
          </ul>
        )}
        <p style={{ margin: '8px 0 0', fontSize: 11, ...muted }}>Checkout sem pagar = sessão distinta do navegador (ou da Stripe) desta conta que não virou pagamento; checkout de convidado sem sessão nunca entra aqui.</p>
      </Secao>

      {/* ── 5. Tudo que fez ── */}
      <Secao id="linha" titulo="Tudo que fez" extra={`${plural(t.linha.length, 'dia', 'dias')} com atividade (horário de Brasília)`}>
        {t.linha.length === 0 ? <p style={{ margin: 0, fontSize: 12.5, ...muted }}>Nenhum evento registrado.</p> : (
          <ol data-kineo="linha-do-tempo" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>
            {t.linha.map((d, i) => (
              <li key={d.dia}>
                <details open={i < 3}>
                  <summary style={{ cursor: 'pointer', fontSize: 12.5, fontWeight: 800, color: 'var(--text)' }}>
                    {d.dia.split('-').reverse().join('/')} <span style={{ ...muted, fontWeight: 600 }}>· {d.itens.length} marcos{d.outras ? ` · ${d.outras} outras ações` : ''}{d.itens.some((x) => x.tom === 'erro') ? ' · ⚠ erro' : ''}{d.itens.some((x) => x.rotulo.startsWith('PAGOU')) ? ' · 💰' : ''}</span>
                  </summary>
                  <ul style={{ listStyle: 'none', margin: '4px 0 0', padding: 0 }}>
                    {d.itens.map((x, j) => (
                      <li key={j} style={{ ...linha, borderTop: j ? linha.borderTop : 'none' }}>
                        <span style={{ ...muted, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{quando(x.em).slice(-5)}</span>
                        <span style={{ color: COR_TOM[x.tom], fontWeight: x.tom === 'normal' ? 500 : 800 }}>{x.rotulo}</span>
                        {x.detalhe && <span style={{ ...muted, fontSize: 11.5, overflowWrap: 'anywhere' }}>{x.detalhe}</span>}
                      </li>
                    ))}
                  </ul>
                </details>
              </li>
            ))}
          </ol>
        )}
      </Secao>

      {/* ── 6. Vídeos ── */}
      <Secao id="videos" titulo="Vídeos" extra={`${plural(t.filmesTotal, 'filme', 'filmes')} · ${plural(t.anunciosTotal, 'anúncio', 'anúncios')} · ${plural(t.clipesTotal, 'clipe', 'clipes')} · ${plural(t.imagensTotal, 'imagem', 'imagens')} · ${plural(t.audiosTotal, 'áudio', 'áudios')}`}>
        <h3 style={h3}>Filmes — Make my videos / Studio {t.filmesTotal > t.filmes.length ? <span style={{ ...muted, fontWeight: 400 }}>(mostrando {t.filmes.length} de {t.filmesTotal})</span> : null}</h3>
        {t.filmes.length ? <div style={grade}>{t.filmes.map((f) => <CartaoFilme key={f.id} f={f} />)}</div> : <p style={{ margin: 0, fontSize: 12, ...muted }}>Nenhum filme entregue.</p>}
        {t.filmesEstornados.length > 0 && (
          <details style={{ marginTop: 8 }}><summary style={resumo}>Filmes que falharam e foram estornados ({t.filmesEstornados.length})</summary>
            <ul style={{ listStyle: 'none', margin: '6px 0 0', padding: 0 }}>{t.filmesEstornados.map((d) => <li key={d.renderId} style={linha}><span style={muted}>{quando(d.em)}</span><span style={selo('var(--warning)')}>falhou · estornado</span><span>{d.creditos} cr</span><code style={{ ...muted, fontSize: 10.5, overflowWrap: 'anywhere' }}>{d.renderId}</code></li>)}</ul>
          </details>
        )}
        <h3 style={h3}>Anúncios — Studio Ads {t.anunciosTotal > t.anuncios.length ? <span style={{ ...muted, fontWeight: 400 }}>(mostrando {t.anuncios.length} de {t.anunciosTotal})</span> : null}</h3>
        {t.anuncios.length ? <div style={grade}>{t.anuncios.map((a) => <CartaoAnuncio key={a.id} a={a} />)}</div> : <p style={{ margin: 0, fontSize: 12, ...muted }}>Nenhum pedido de anúncio.</p>}
        <h3 style={h3}>Clipes / efeitos {t.clipesTotal > t.clipes.length ? <span style={{ ...muted, fontWeight: 400 }}>(mostrando {t.clipes.length} de {t.clipesTotal})</span> : null}</h3>
        {t.clipes.length ? <div style={grade}>{t.clipes.map((x) => <CartaoClipe key={x.id} c={x} />)}</div> : <p style={{ margin: 0, fontSize: 12, ...muted }}>Nenhum clipe.</p>}
        {t.imagens.length > 0 && (
          <>
            <h3 style={h3}>Imagens {t.imagensTotal > t.imagens.length ? <span style={{ ...muted, fontWeight: 400 }}>(mostrando {t.imagens.length} de {t.imagensTotal})</span> : null}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(84px, 1fr))', gap: 8 }}>
              {t.imagens.map((im) => (
                <a key={im.id} href={im.url ?? undefined} target="_blank" rel="noreferrer" title={`${im.modelo ?? ''} · ${quando(im.em)}`} style={{ display: 'block' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {im.url ? <img src={im.url} alt="" loading="lazy" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border)' }} /> : <span style={muted}>—</span>}
                </a>
              ))}
            </div>
          </>
        )}
        {t.audios.length > 0 && (
          <>
            <h3 style={h3}>Áudio {t.audiosTotal > t.audios.length ? <span style={{ ...muted, fontWeight: 400 }}>(mostrando {t.audios.length} de {t.audiosTotal})</span> : null}</h3>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {t.audios.map((a) => <li key={a.id} style={linha}><span style={muted}>{quando(a.em)}</span><span>{a.modelo ?? '—'}{a.segundos ? ` · ${a.segundos}s` : ''}</span>{a.url && <audio src={a.url} preload="none" controls style={{ height: 30, maxWidth: '100%' }} />}</li>)}
            </ul>
          </>
        )}
      </Secao>

      {t.erros.length > 0 && <p role="alert" style={{ margin: 0, fontSize: 11.5, color: 'var(--warning)' }}>Leitura incompleta: {t.erros.join(' · ')}</p>}
      <p style={{ margin: 0, fontSize: 11, ...muted }}>Só leitura · montado no servidor em {quando(t.geradoEm)} · id {t.id}</p>
    </main>
  )
}
