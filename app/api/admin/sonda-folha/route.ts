// KINEO-SONDA-DA-FOLHA-2511 — a sonda da folha (lib/cinematic/sondaDaFolha2511.ts): só a lista exata da casa, uma por vez, sem repetir o mesmo pedido.
//   POST { nome, tipo, canonica, look_phrase, filme_fotorreal, sem_nome, seed } → { prompt, url, descricao, especie, leitura, veredito, custo_usd, erro }
// Não grava no banco, não cobra crédito, não gera filme. A folha vai ao nosso bucket (a URL da fal expira).
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateCinematicSceneStill } from '@/lib/hollywood/anchors'
import { persistFastStill } from '@/lib/fastAiScene'
import { formaNaSonda, lerAFolha } from '@/lib/cinematic/juizDaFolha2411'
import { admitirSonda, chaveDaSonda, lerPedidoDaSonda, liberarSonda, novoEstadoDaSonda, rodarSondaDaFolha } from '@/lib/cinematic/sondaDaFolha2511'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const maxDuration = 60

const estado = novoEstadoDaSonda()
const RECUSA: Record<string, number> = { nao_e_da_casa: 403, ocupada: 409, repetida: 409, teto: 429 }

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const pedido = lerPedidoDaSonda(await req.json().catch(() => null))
  if (!user) return NextResponse.json({ erro: 'nao_e_da_casa' }, { status: 403 })
  if (!pedido) return NextResponse.json({ erro: 'pedido_invalido' }, { status: 400 })
  const admissao = admitirSonda(estado, user.email, chaveDaSonda(pedido))
  if (admissao !== 'ok') return NextResponse.json({ erro: admissao }, { status: RECUSA[admissao] ?? 400 })
  try {
    const r = await rodarSondaDaFolha(pedido, {
      gerar: (prompt, seed) => generateCinematicSceneStill({ scenePrompt: prompt, styleSuffix: '', seed, pollWindowMs: 25_000, aspect: '9:16' }),
      guardar: (url) => persistFastStill(url, 10_000),
      ler: (descricao, url) => lerAFolha(descricao, url, { forma: formaNaSonda() }), // a sonda pergunta a forma; o filme não
    })
    return NextResponse.json(r, { status: r.erro ? 502 : 200 })
  } finally {
    liberarSonda(estado)
  }
}
