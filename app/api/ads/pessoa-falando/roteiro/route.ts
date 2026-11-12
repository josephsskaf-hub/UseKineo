import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdsInternalEmail } from '@/lib/ads/access'
import { writeServerEvent } from '@/lib/serverEvents'
import { escreverRoteiro } from '@/lib/ads/pessoaFalando/roteiro'
import { ADS_PF_EVENTOS, lerPedido, pessoaFalandoAcesso } from '@/lib/ads/pessoaFalando/plataforma'

// KINEO-ADS-PESSOA-FALANDO-PLATAFORMA-1211 — passo 1 do contrato da tela (PESSOA_FALANDO_API.roteiro): EntradaDaTela → { roteiro | null,
// rascunho | null, motivos }. O escritor da Div. 2 (escreverRoteiro: gpt-4o-mini, até 3 tentativas, régua 22–31 palavras em código) — nada
// de fornecedor de vídeo e NADA COBRADO aqui. Atrás do interruptor: conta de fora = 404 sem ler o corpo.
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

const json = (body: Record<string, unknown>, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } })

async function pedirAoEscritor(mensagem: string): Promise<string> {
  const key = process.env.OPENAI_API_KEY
  if (!key) throw new Error('writer_unavailable')
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'gpt-4o-mini', temperature: 0.7, response_format: { type: 'json_object' }, messages: [{ role: 'user', content: mensagem }] }),
    signal: AbortSignal.timeout(25_000),
  })
  if (!res.ok) throw new Error('writer_http_' + res.status)
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
  return String(data.choices?.[0]?.message?.content ?? '')
}

export async function POST(req: NextRequest) {
  let user: { id: string; email?: string | null } | null = null
  try { user = (await createClient().auth.getUser()).data.user ?? null } catch { user = null }
  if (!user) return json({ error: 'Sign in to make an ad.', reason: 'sign_in_required', charged: false }, 401)
  if (!pessoaFalandoAcesso(isAdsInternalEmail(user.email))) return json({ error: 'Not found.' }, 404)

  const lido = lerPedido(await req.json().catch(() => null))
  if (!lido.ok) return json({ error: lido.erro, reason: 'bad_request', charged: false }, 400)
  const { entrada } = lido.pedido
  try {
    const r = await escreverRoteiro({ produto: entrada.produto, frase: entrada.frase, apresentadorId: entrada.apresentadorId, formatoId: entrada.formatoId }, pedirAoEscritor)
    await writeServerEvent({
      name: ADS_PF_EVENTOS.plano, userId: user.id, path: '/api/ads/pessoa-falando/roteiro',
      metadata: { apresentador: entrada.apresentadorId, formato: entrada.formatoId, aprovado: Boolean(r.roteiro), tentativas: r.tentativas, motivos: r.motivos, charged: false },
    }).catch(() => false)
    return json({ roteiro: r.roteiro, rascunho: r.rascunho, motivos: r.motivos, charged: false })
  } catch {
    return json({ error: 'The script writer is busy. Nothing was charged — try again in a minute.', reason: 'writer_unavailable', charged: false }, 503)
  }
}
