'use client'

// KINEO-ADMIN-NUMEROS-0311 — fundador 03/11: "coloca todos esses dados também no admin na 1ª página, lado esquerdo as pessoas que entram, lado direito os números da empresa".
import { useEffect, useState } from 'react'
import { startVisiblePolling } from '@/lib/admin/visiblePolling'
import { COLUNAS, LINHAS, diaCurto, entrouEm, formataValor, type NumerosEmpresa as Dados } from '@/lib/admin/numerosEmpresa'
import { engineLabelFor } from '@/lib/engineLabel'
import { PessoaLink } from '@/components/admin/PessoaLink'

const REFRESH_MS = 5 * 60_000
const CARD: React.CSSProperties = { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14 }
const TITULO: React.CSSProperties = { fontSize: '0.62rem', color: 'var(--muted2)' }

export function useNumerosEmpresa() {
  const [dados, setDados] = useState<Dados | null>(null)
  const [erro, setErro] = useState(false)
  useEffect(() => {
    let cancelado = false
    const carregar = () => fetch('/api/admin/numeros-empresa', { cache: 'no-store' })
      .then(async (r) => (r.ok ? (r.json() as Promise<Dados>) : Promise.reject()))
      .then((d) => { if (!cancelado) { setDados(d); setErro(false) } })
      .catch(() => { if (!cancelado) setErro(true) })
    const parar = startVisiblePolling(carregar, REFRESH_MS)
    return () => { cancelado = true; parar() }
  }, [])
  return { dados, erro }
}

function nomeDoMotor(motor: string | null): string {
  if (!motor) return 'Filme'
  return engineLabelFor(null, motor) ?? engineLabelFor(motor) ?? 'Filme'
}

/** Lado esquerdo: os últimos cadastros, com o desfecho do 1º filme. */
export function UltimosCadastros({ dados, erro }: { dados: Dados | null; erro: boolean }) {
  return (
    <div className="mt-3 overflow-x-auto" style={{ ...CARD, padding: 0 }}>
      <div className="font-black uppercase tracking-widest" style={{ ...TITULO, padding: '12px 12px 6px' }}>Últimos cadastros</div>
      {erro && !dados && <div className="px-3 pb-3 text-xs" style={{ color: '#FF8787' }}>Não consegui ler os cadastros.</div>}
      {!erro && !dados && <div className="px-3 pb-3 text-xs" style={{ color: 'var(--muted2)' }}>Carregando…</div>}
      {dados && (
        <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
              {['Quem', 'Entrou', 'País · origem', '1º filme', 'Nota', 'Baixou'].map((h) => (
                <th key={h} className="font-black uppercase tracking-widest" style={{ fontSize: '0.58rem', color: 'var(--muted2)', textAlign: 'left', padding: '8px 12px', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dados.cadastros.map((c) => (
              <tr key={c.id} style={{ borderTop: '1px solid var(--border)' }}>
                <td style={{ padding: '8px 12px', whiteSpace: 'nowrap', fontSize: '0.78rem' }}>
                  <PessoaLink id={c.id} email={c.email} style={{ color: '#8DB4FF', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{c.email}</PessoaLink>
                  {c.pagou && <span className="ml-2" style={{ color: '#5FD4A4', fontWeight: 800 }}>pagou</span>}
                </td>
                <td style={{ padding: '8px 12px', whiteSpace: 'nowrap', color: 'var(--muted2)', fontSize: '0.75rem' }}>{entrouEm(c.entrou)}</td>
                <td style={{ padding: '8px 12px', whiteSpace: 'nowrap', color: 'var(--muted2)', fontSize: '0.75rem' }}>{c.pais ?? '—'}{c.origem ? ` · ${c.origem}` : ''}</td>
                <td style={{ padding: '8px 12px', whiteSpace: 'nowrap', fontSize: '0.75rem' }}>
                  {c.filme
                    ? <a href={c.filme} target="_blank" rel="noreferrer" style={{ color: '#C4B5FD', textDecoration: 'underline' }}>{nomeDoMotor(c.motor)}</a>
                    : <span style={{ color: 'var(--muted2)' }}>{c.sem_gratis ? 'país sem grátis' : 'sem filme'}</span>}
                </td>
                <td style={{ padding: '8px 12px', color: 'var(--text)', fontSize: '0.78rem', fontWeight: 700 }}>{formataValor(c.nota)}</td>
                <td style={{ padding: '8px 12px', color: c.baixou ? '#5FD4A4' : 'var(--muted2)', fontSize: '0.75rem' }}>{c.filme ? (c.baixou ? 'sim' : 'não') : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

/** Lado direito: os números da empresa em vários tempos e a nota dia a dia. */
export function NumerosDaEmpresa({ dados, erro }: { dados: Dados | null; erro: boolean }) {
  return (
    <div>
      <div className="overflow-x-auto" style={{ ...CARD, padding: 0 }}>
        <div className="font-black uppercase tracking-widest" style={{ ...TITULO, padding: '12px 12px 6px' }}>Números da empresa</div>
        {erro && !dados && <div className="px-3 pb-3 text-xs" style={{ color: '#FF8787' }}>Não consegui ler os números.</div>}
        {!erro && !dados && <div className="px-3 pb-3 text-xs" style={{ color: 'var(--muted2)' }}>Carregando…</div>}
        {dados && (
          <table className="w-full" style={{ borderCollapse: 'collapse', fontVariantNumeric: 'tabular-nums' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
                {['Medida', ...COLUNAS.map((c) => c.rotulo), 'Meta/dia'].map((h) => (
                  <th key={h} className="font-black uppercase" style={{ fontSize: '0.56rem', letterSpacing: '0.05em', color: 'var(--muted2)', textAlign: h === 'Medida' ? 'left' : 'right', padding: '8px 8px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {LINHAS.map((l) => (
                <tr key={l.campo} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: '7px 8px', color: 'var(--text)', fontSize: '0.74rem', fontWeight: l.forte ? 800 : 500 }}>{l.rotulo}</td>
                  {COLUNAS.map((c) => {
                    const p = dados.periodos.find((x) => x.chave === c.chave)
                    return <td key={c.chave} style={{ padding: '7px 8px', textAlign: 'right', color: 'var(--text)', fontSize: '0.76rem', fontWeight: c.chave === 'hoje' ? 800 : 500 }}>{formataValor(p?.[l.campo], l.sufixo)}</td>
                  })}
                  <td style={{ padding: '7px 8px', textAlign: 'right', color: 'var(--muted2)', fontSize: '0.7rem' }}>{l.meta ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {dados && dados.nota_dias.length > 0 && (
        <div className="mt-3 overflow-x-auto" style={{ ...CARD, padding: 0 }}>
          <div className="font-black uppercase tracking-widest" style={{ ...TITULO, padding: '12px 12px 6px' }}>Nota dia a dia (filmes)</div>
          <table className="w-full" style={{ borderCollapse: 'collapse', fontVariantNumeric: 'tabular-nums' }}>
            <tbody>
              {[
                { rotulo: 'Dia', valor: (d: Dados['nota_dias'][number]) => diaCurto(d.dia), cor: 'var(--muted2)', peso: 500 },
                { rotulo: 'Nota', valor: (d: Dados['nota_dias'][number]) => formataValor(d.nota), cor: 'var(--text)', peso: 800 },
                { rotulo: 'Filmes', valor: (d: Dados['nota_dias'][number]) => String(d.filmes), cor: 'var(--muted2)', peso: 500 },
              ].map((l) => (
                <tr key={l.rotulo} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: '6px 8px', color: 'var(--muted2)', fontSize: '0.7rem' }}>{l.rotulo}</td>
                  {dados.nota_dias.map((d) => <td key={d.dia} style={{ padding: '6px 8px', textAlign: 'right', color: l.cor, fontSize: '0.74rem', fontWeight: l.peso }}>{l.valor(d)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-[10px] mt-2" style={{ color: 'var(--muted2)' }}>
        Hoje está incompleto. Médias não incluem hoje. Pagantes: total do período. Visitas = início de sessão, por isso difere do card acima. — = sem dado. Baixou e pagou dos dias recentes ainda podem subir.
      </p>
    </div>
  )
}
