// ═══ KINEO-EP2-PAINEL-3110 — cartão compacto do /admin: as mudanças de 31/10 (7 dias × 7 anteriores) ════════════════
// Server component. SÓ é renderizado pelo app/admin/page.tsx DEPOIS do portão de admin (cookie + ADMIN_EMAILS).
// Leitura 100% paginada e ordenada (readAll) — nenhuma contagem confia numa página única de 1000 do PostgREST — e
// `.in()` em lotes de 150. Contas internas fora pela régua da casa (lib/internalAccounts). A conta é toda de
// lib/admin/funilDoDia3110.ts (pura, com guardião). Qualquer erro vira uma linha de aviso: o cartão NUNCA derruba o /admin.
import type { CSSProperties } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { serviceClient } from '@/app/api/admin/_shared/db'
import { readAll } from '@/lib/supabase/readAll'
import { isInternalEmail, INTERNAL_ACCOUNTS_LABEL } from '@/lib/internalAccounts'
import {
  DIA_MS, JANELA_DIAS, NOMES_DO_PAINEL, contarFunisDeEvento, contarPrimeiroFilme, janelas, taxa, variacao,
  type Cadastro, type Filme, type FunilContado, type LinhaDeEvento, type PrimeiroFilme,
} from '@/lib/admin/funilDoDia3110'

const ROUTE = '/admin#funil-do-dia'

export type FunilDoDia = { funis: FunilContado[]; primeiro: { atual: PrimeiroFilme; anterior: PrimeiroFilme } }

export async function carregarFunilDoDia(admin: SupabaseClient, agora: number = Date.now()): Promise<FunilDoDia> {
  const desde = new Date(agora - 2 * JANELA_DIAS * DIA_MS).toISOString()
  const [ev, cad, fil] = await Promise.all([
    readAll<LinhaDeEvento>(() => admin.from('events').select('id, name, user_id, session_id, created_at')
      .in('name', NOMES_DO_PAINEL).gte('created_at', desde), { route: ROUTE, table: 'events' }),
    readAll<Cadastro & { email: string | null }>(() => admin.from('profiles').select('id, email, created_at')
      .gte('created_at', desde), { route: ROUTE, table: 'profiles' }),
    readAll<Filme & { id: string }>(() => admin.from('videos').select('id, user_id, created_at, quality_mode')
      .eq('status', 'completed').gte('created_at', desde), { route: ROUTE, table: 'videos' }),
  ])
  const linhas = ev.data ?? []
  const cadastros = (cad.data ?? []).filter((p) => !isInternalEmail(p.email))
  // Donos de evento que não são cadastros da janela: o e-mail deles decide se são internos.
  const conhecidos = new Map<string, boolean>((cad.data ?? []).map((p) => [p.id, !isInternalEmail(p.email)]))
  const faltam = [...new Set(linhas.map((e) => e.user_id).filter((u): u is string => !!u && !conhecidos.has(u)))]
  for (let i = 0; i < faltam.length; i += 150) {
    const part = faltam.slice(i, i + 150)
    const { data } = await readAll<{ id: string; email: string | null }>(() => admin.from('profiles').select('id, email').in('id', part), { route: ROUTE, table: 'profiles' })
    for (const p of data ?? []) conhecidos.set(p.id, !isInternalEmail(p.email))
  }
  const externos = new Set([...conhecidos].filter(([, ext]) => ext).map(([id]) => id))
  const { atual, anterior } = janelas(agora)
  return {
    funis: contarFunisDeEvento(linhas, externos, agora),
    primeiro: {
      atual: contarPrimeiroFilme(cadastros, linhas, fil.data ?? [], atual),
      anterior: contarPrimeiroFilme(cadastros, linhas, fil.data ?? [], anterior),
    },
  }
}

const cel: CSSProperties = { padding: '3px 8px', textAlign: 'right', whiteSpace: 'nowrap' }
const rot: CSSProperties = { padding: '3px 8px 3px 0', color: 'var(--muted2)', whiteSpace: 'nowrap' }

function Tabela({ titulo, linhas }: { titulo: string; linhas: Array<{ nome: string; atual: number; anterior: number }> }) {
  const base = linhas[0]?.atual ?? 0
  return (
    <div className="rounded-xl p-3" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
      <p className="text-xs font-black mb-2" style={{ color: 'var(--text)' }}>{titulo}</p>
      <table className="text-xs w-full" style={{ borderCollapse: 'collapse', color: 'var(--text)' }}>
        <thead>
          <tr style={{ color: 'var(--muted2)' }}>
            <th style={{ ...rot, textAlign: 'left' }}>degrau</th>
            <th style={cel}>7 d</th>
            <th style={cel}>% do 1º</th>
            <th style={cel}>7 d antes</th>
            <th style={cel}>Δ</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => (
            <tr key={l.nome} data-kineo="funil-degrau">
              <td style={rot}><code>{l.nome}</code></td>
              <td style={{ ...cel, fontWeight: 800 }}>{l.atual}</td>
              <td style={cel}>{taxa(l.atual, base)}</td>
              <td style={cel}>{l.anterior}</td>
              <td style={cel}>{variacao(l.atual, l.anterior)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default async function FunilDoDia3110() {
  let dados: FunilDoDia | null = null
  let erro: string | null = null
  try {
    const admin = serviceClient()
    if (!admin) throw new Error('Supabase env missing')
    dados = await carregarFunilDoDia(admin)
  } catch (e) {
    erro = e instanceof Error ? e.message : String(e)
  }
  return (
    <section id="funil-do-dia" data-kineo="funil-do-dia-3110" className="px-4 sm:px-6 pb-16 w-full">
      <h2 className="font-black tracking-tight mb-1" style={{ fontSize: '0.88rem', color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        Mudanças de 31/10 — últimos 7 dias × 7 anteriores
      </h2>
      <p className="text-xs mb-3" style={{ color: 'var(--muted2)' }}>
        Pessoas distintas por degrau · {INTERNAL_ACCOUNTS_LABEL} · eventos anônimos (ex.: /pricing deslogado) contam pela sessão · leitura paginada, sem teto de 1000.
      </p>
      {erro || !dados ? (
        <p className="text-xs" style={{ color: '#f87171' }}>Painel indisponível agora: {erro ?? 'sem dados'}</p>
      ) : (
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
          <Tabela
            titulo="Primeiro filme (coorte de cadastros da janela)"
            linhas={[
              { nome: 'cadastros', atual: dados.primeiro.atual.cadastros, anterior: dados.primeiro.anterior.cadastros },
              { nome: 'apertou gerar', atual: dados.primeiro.atual.gerou, anterior: dados.primeiro.anterior.gerou },
              { nome: 'recebeu o 1º filme', atual: dados.primeiro.atual.primeiroFilme, anterior: dados.primeiro.anterior.primeiroFilme },
              { nome: 'checkout_started', atual: dados.primeiro.atual.checkout, anterior: dados.primeiro.anterior.checkout },
              { nome: 'pagou', atual: dados.primeiro.atual.pagou, anterior: dados.primeiro.anterior.pagou },
            ]}
          />
          {dados.funis.map((f) => <Tabela key={f.chave} titulo={f.titulo} linhas={f.degraus} />)}
        </div>
      )}
    </section>
  )
}
