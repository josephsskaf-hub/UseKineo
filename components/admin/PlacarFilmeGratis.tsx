'use client'

// KINEO-PLACAR-FILME-GRATIS-1611 — CEO 16/11 (Semana 1 do plano de 30 dias): o placar do 1º filme grátis todo dia no /admin,
// sem ninguém rodar consulta. Fonte: a nota do REVISOR (o rótulo diz) e quantos ainda estão sem nota; ao lado, a nota automática
// "em prova", que só substitui a do revisor com ≥ 85% de acerto nos ruins e ≤ 10% de alarme falso (dono 13/11).
import { useEffect, useState } from 'react'
import { startVisiblePolling } from '@/lib/admin/visiblePolling'
import { engineLabelFor } from '@/lib/engineLabel'
import { BOM_DESDE, REGRA_ACERTO_PCT, REGRA_ALARME_PCT, RUIM_ABAIXO, fracao, nomeDefeito, type LinhaPlacar, type PlacarFilmeGratis as Dados } from '@/lib/admin/placarFilmeGratis'

const REFRESH_MS = 5 * 60_000
const CARD: React.CSSProperties = { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14 }
const TH: React.CSSProperties = { fontSize: '0.56rem', letterSpacing: '0.05em', color: 'var(--muted2)', padding: '8px 8px', whiteSpace: 'nowrap' }
const TD: React.CSSProperties = { padding: '7px 8px', fontSize: '0.74rem', color: 'var(--text)', whiteSpace: 'nowrap' }
const num = (n: number | null) => (n === null ? '—' : n.toLocaleString('pt-BR', { maximumFractionDigits: 1 }))
const motorCurto = (m: string) => (m === 'sem motor' ? m : engineLabelFor(null, m) ?? engineLabelFor(m) ?? m)

function corDaPct(pct: number | null, meta: number) {
  if (pct === null) return 'var(--muted2)'
  return pct >= meta ? '#5FD4A4' : pct >= meta / 2 ? '#FFD43B' : '#FF8787'
}

function Linha({ l, meta, forte }: { l: LinhaPlacar; meta: number; forte?: boolean }) {
  const peso = forte ? 800 : 500
  return (
    <tr style={{ borderTop: '1px solid var(--border)', background: forte ? 'rgba(255,255,255,0.03)' : undefined }}>
      <td style={{ ...TD, fontWeight: peso }}>{l.rotulo}</td>
      <td style={{ ...TD, textAlign: 'right', fontWeight: 800, color: corDaPct(l.pct, meta) }}>{l.pct === null ? '—' : `${l.pct}%`}</td>
      <td style={{ ...TD, textAlign: 'right', fontWeight: peso }}>{l.comNota ? `${l.oitoOuMais} de ${l.comNota}` : '—'}</td>
      <td style={{ ...TD, textAlign: 'right', fontWeight: peso }}>{l.filmes}</td>
      <td style={{ ...TD, textAlign: 'right', color: l.semNota ? '#FFD43B' : 'var(--muted2)' }}>{l.semNota}</td>
      <td style={{ ...TD, textAlign: 'right', fontWeight: peso }}>{num(l.media)}</td>
      <td style={{ ...TD, textAlign: 'right', color: 'var(--muted2)', borderLeft: '1px dashed var(--border)' }} title="Nota automática em prova: filmes julgados, quantos com 8 ou mais e a média">
        {l.auto.julgados ? `${l.auto.oitoOuMais} de ${l.auto.julgados} · ${num(l.auto.media)}` : '—'}
      </td>
      <td style={{ ...TD, color: 'var(--muted2)', fontSize: '0.68rem' }}>
        {l.defeitos.length ? l.defeitos.map((d) => <span key={d.codigo} title={d.codigo} style={{ marginRight: 8 }}>{nomeDefeito(d.codigo)} {d.n}</span>) : '—'}
      </td>
      <td style={{ ...TD, color: 'var(--muted2)', fontSize: '0.68rem' }}>
        {l.motores.length ? l.motores.map((m) => <span key={m.motor} title={`${m.filmes} filmes, ${m.comNota} com nota`} style={{ marginRight: 8 }}>{motorCurto(m.motor)} {m.oitoOuMais}/{m.comNota}</span>) : '—'}
      </td>
    </tr>
  )
}

export function usePlacarFilmeGratis() {
  const [dados, setDados] = useState<Dados | null>(null)
  const [erro, setErro] = useState(false)
  useEffect(() => {
    let cancelado = false
    const carregar = () => fetch('/api/admin/placar-filme-gratis', { cache: 'no-store' })
      .then(async (r) => (r.ok ? (r.json() as Promise<Dados>) : Promise.reject()))
      .then((d) => { if (!cancelado) { setDados(d); setErro(false) } })
      .catch(() => { if (!cancelado) setErro(true) })
    const parar = startVisiblePolling(carregar, REFRESH_MS)
    return () => { cancelado = true; parar() }
  }, [])
  return { dados, erro }
}

export function PlacarFilmeGratis() {
  const { dados, erro } = usePlacarFilmeGratis()
  return <PlacarFilmeGratisTabela dados={dados} erro={erro} />
}

/** A tabela, sem leitura (a foto e o guardião usam esta). */
export function PlacarFilmeGratisTabela({ dados, erro }: { dados: Dados | null; erro: boolean }) {
  const a = dados?.semana.auto
  return (
    <div className="mb-3 overflow-x-auto" style={{ ...CARD, padding: 0 }} data-testid="placar-filme-gratis">
      <div style={{ padding: '12px 12px 4px' }}>
        <div className="font-black uppercase tracking-widest" style={{ fontSize: '0.62rem', color: 'var(--muted2)' }}>
          Placar do 1º filme grátis · meta: {dados?.meta ?? 70}% com nota 8 ou mais
        </div>
        <div className="text-[11px] mt-1" style={{ color: 'var(--muted2)' }}>
          Fonte: <b style={{ color: 'var(--text)' }}>nota do revisor</b>. % = filmes com nota 8 ou mais entre os que já têm nota. Sem nota = o revisor ainda não viu.
        </div>
      </div>
      {erro && !dados && <div className="px-3 pb-3 text-xs" style={{ color: '#FF8787' }}>Não consegui ler o placar.</div>}
      {!erro && !dados && <div className="px-3 pb-3 text-xs" style={{ color: 'var(--muted2)' }}>Carregando…</div>}
      {dados && (
        <table className="w-full" style={{ borderCollapse: 'collapse', fontVariantNumeric: 'tabular-nums' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
              {['Dia', '% com ≥ 8', 'Nota ≥ 8', '1ºs filmes', 'Sem nota', 'Média', 'Nota auto · em prova', '3 defeitos mais comuns', 'Por motor (≥ 8 / com nota)'].map((h, i) => (
                <th key={h} className="font-black uppercase" style={{ ...TH, textAlign: i === 0 || i >= 7 ? 'left' : 'right', borderLeft: i === 6 ? '1px dashed var(--border)' : undefined }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <Linha l={dados.semana} meta={dados.meta} forte />
            {dados.dias.map((d) => <Linha key={d.chave} l={d} meta={dados.meta} />)}
          </tbody>
        </table>
      )}
      {a && (
        <p className="text-[10px]" style={{ color: 'var(--muted2)', padding: '8px 12px 12px', lineHeight: 1.5 }}>
          <b>Nota automática em prova</b> (juiz em sombra, não aparece para o cliente nem substitui a do revisor). Nos 7 dias:
          pegou {fracao(a.ruinsPegos, a.ruins)} dos ruins (revisor abaixo de {RUIM_ABAIXO}) e deu alarme falso em {fracao(a.alarmes, a.bons)} dos bons (revisor {num(BOM_DESDE)} ou mais).
          Só substitui o revisor com {REGRA_ACERTO_PCT}% ou mais nos ruins e até {REGRA_ALARME_PCT}% de alarme falso (regra do dono, 13/11).
          {' '}7 dias = últimas 168 h; cada dia = dia de Brasília; hoje está incompleto. Grátis = conta no plano grátis hoje, sem contas internas.
        </p>
      )}
    </div>
  )
}
