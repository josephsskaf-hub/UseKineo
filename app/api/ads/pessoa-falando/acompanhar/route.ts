import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdsInternalEmail } from '@/lib/ads/access'
import { pessoaFalandoAcesso } from '@/lib/ads/pessoaFalando/plataforma'
import { PEDIDO_ID } from '@/lib/ads/pessoaFalando/fotosChave'
import { acompanhar } from '@/lib/ads/pessoaFalando/video'
import { videoIoReal } from '@/lib/ads/pessoaFalando/videoServer'

// KINEO-ADS-PESSOA-FALANDO-VIDEO-1211 — a rota que a tela consulta (RespostaPedido.acompanhar): renderizando | pronto (com o vídeo no NOSSO bucket)
// | falhou (estorno integral feito, charged:false). Cada consulta avança o pedido: fila → transcrição → juiz → 1 nova tentativa → estorno.
// Só o dono do pedido vê (os eventos são lidos por user_id). Atrás do interruptor: conta de fora = 404.
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 180

const json = (body: Record<string, unknown>, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } })

export async function GET(req: NextRequest) {
  let user: { id: string; email?: string | null } | null = null
  try { user = (await createClient().auth.getUser()).data.user ?? null } catch { user = null }
  if (!user) return json({ error: 'Sign in to see your ad.', reason: 'sign_in_required' }, 401)
  if (!pessoaFalandoAcesso(isAdsInternalEmail(user.email))) return json({ error: 'Not found.' }, 404)
  const pedidoId = req.nextUrl.searchParams.get('pedido') ?? ''
  if (!PEDIDO_ID.test(pedidoId)) return json({ error: 'Not found.' }, 404)
  try {
    const r = await acompanhar(videoIoReal(user.id, '/api/ads/pessoa-falando/acompanhar'), { userId: user.id, pedidoId })
    return json(r.body, r.status)
  } catch {
    return json({ status: 'renderizando', retry_after_seconds: 15 }) // estado ilegível agora: a tela consulta de novo
  }
}
