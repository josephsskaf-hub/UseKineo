// KINEO-QUEM-APARECE-2511 — a sonda da leitura de quem aparece (lib/cinematic/quemAparece2511.ts): só a lista exata da casa, 403 sem login, uma por vez,
// a mesma leitura não repete, teto por instância. Só texto (gpt-4o-mini, ≈ US$ 0,0004 por leitura). Não gera imagem nem filme, não grava no banco, não
// cobra crédito. Devolve a leitura conferida, a decisão do código, o tempo da chamada e o p95 desta instância (contra o prazo de 6 s).
//   POST { elenco: [{ nome, tipo?, genero? }], planos: [{ fala?, marcador?, visual? }] } → { presenca, unclear, ms, p95_ms, prazo_ms, custo_usd, erro }
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { QUEM_APARECE_PRAZO_MS, admitirSondaDePresenca, chaveDaPresenca, lerPedidoDePresenca, lerQuemAparece, liberarSondaDePresenca, novoEstadoDaSondaDePresenca, p95 } from '@/lib/cinematic/quemAparece2511'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const maxDuration = 30

const estado = novoEstadoDaSondaDePresenca()
const RECUSA: Record<string, number> = { nao_e_da_casa: 403, ocupada: 409, repetida: 409, teto: 429 }

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const corpo = await req.json().catch(() => null)
  if (!user) return NextResponse.json({ erro: 'nao_e_da_casa' }, { status: 403 })
  const pedido = lerPedidoDePresenca(corpo)
  if (!pedido) return NextResponse.json({ erro: 'pedido_invalido' }, { status: 400 })
  const admissao = admitirSondaDePresenca(estado, user.email, chaveDaPresenca(pedido))
  if (admissao !== 'ok') return NextResponse.json({ erro: admissao }, { status: RECUSA[admissao] ?? 400 })
  let ms: number | null = null
  try {
    const r = await lerQuemAparece(pedido.elenco, pedido.planos)
    ms = r.ms
    return NextResponse.json({ presenca: r.presenca, unclear: r.unclear, ms: r.ms, p95_ms: p95([...estado.tempos, r.ms]), prazo_ms: QUEM_APARECE_PRAZO_MS, custo_usd: r.custoUsd, erro: r.erro }, { status: r.erro ? 502 : 200 })
  } finally {
    liberarSondaDePresenca(estado, ms)
  }
}
