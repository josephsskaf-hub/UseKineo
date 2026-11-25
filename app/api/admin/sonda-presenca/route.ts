// KINEO-QUEM-APARECE-2511 — a sonda da leitura de quem aparece (lib/cinematic/quemAparece2511.ts): só a lista exata da casa, 403 sem login, uma por vez,
// a mesma leitura não repete, teto por instância. Só texto (gpt-4o-mini, ≈ US$ 0,0004 por leitura). Não gera imagem nem filme, não grava no banco, não
// cobra crédito. Devolve a leitura conferida, a decisão do código, o tempo da chamada e o p95 desta instância (contra o prazo de 6 s).
//   POST { elenco: [{ nome, tipo?, genero?, descricao?, protagonista? }], planos: [{ fala?, marcador?, visual? }] } → { presenca, leitura, tokens, unclear, ms, p95_ms, prazo_ms, custo_usd, erro }
//   [volta 2, CEO 25/11 11:55] a leitura conferida e os tokens voltam para o diagnóstico do ensaio.
//   [volta 3, CEO 25/11 13:15] a leitura é o ASSUNTO de cada plano (subject) e os ids nomeados (named); por_pessoa = a decisão do código por plano e por
//   pessoa (true, false, null = a regra de hoje); quando o esquema recusa, a resposta BRUTA (só números e enum sob o esquema estrito) e o motivo da recusa.
//   [A/B, CEO 25/11] POST aceita versao ('v2' | 'v3') e modelo (lista fechada MODELOS_DA_SONDA), ambos opcionais (sem eles: v2 com o modelo de hoje); fora
//   da lista = 400 sem chamada. A resposta diz a versão e o modelo usados, os tokens, o tempo e o custo pela tarifa do modelo.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { QUEM_APARECE_PRAZO_MS, admitirSondaDePresenca, chaveDaPresenca, lerPedidoDePresenca, lerQuemAparece, liberarSondaDePresenca, novoEstadoDaSondaDePresenca, p95, presencaPorPessoa, leituraParaASonda } from '@/lib/cinematic/quemAparece2511'

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
    const r = await lerQuemAparece(pedido.elenco, pedido.planos, { versao: pedido.versao, modelo: pedido.modelo })
    ms = r.ms
    return NextResponse.json({ versao: r.versao, modelo: r.modelo, presenca: r.presenca, por_pessoa: r.presenca ? presencaPorPessoa(r.presenca) : null, leitura: leituraParaASonda(r), bruta: r.bruta ?? null, motivo_do_esquema: r.motivoDoEsquema ?? null, fim: r.fim ?? null, recusa: r.recusa ?? false, tokens: r.tokens ?? null, unclear: r.unclear, ms: r.ms, p95_ms: p95([...estado.tempos, r.ms]), prazo_ms: QUEM_APARECE_PRAZO_MS, custo_usd: r.custoUsd, erro: r.erro }, { status: r.erro ? 502 : 200 })
  } finally {
    liberarSondaDePresenca(estado, ms)
  }
}
