import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdsInternalEmail } from '@/lib/ads/access'
import { writeServerEvent } from '@/lib/serverEvents'
import { pessoaFalandoDryRun } from '@/lib/ads/pessoaFalando/dryRun'
import { ADS_PESSOA_FALANDO_CREDITS, ADS_PF_EVENTOS, lerPedido, pessoaFalandoAcesso } from '@/lib/ads/pessoaFalando/plataforma'

// KINEO-ADS-PESSOA-FALANDO-PLATAFORMA-1211 — o anúncio "pessoa falando" (spec §3), em rota PRÓPRIA (o /api/ads/v2 é grande e está no ar:
// um formato novo dentro dele arriscaria os pedidos de hoje). Atrás de KINEO_ADS_PESSOA_FALANDO ('internal'): conta de fora recebe 404 —
// a rota não diz que o formato existe. A casa (isAdsInternalEmail) passa.
//
// Hoje esta rota faz:
//   · dry_run: true  → os 3 JSON (roteiro, foto-chave, vídeo) e o custo pela tarifa, SEM chamar a fal nem a OpenAI (o roteiro vem no pedido);
//   · pedido pago    → recusa honesta ANTES de qualquer débito: 409 price_pending enquanto o dono não decide ADS_PESSOA_FALANDO_CREDITS, e
//                      501 pipeline_not_wired depois disso, até a execução (foto-chave → escolha → vídeo → juiz → montagem) ser ligada.
//                      Em nenhum dos dois casos algo é cobrado (charged:false).
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const json = (body: Record<string, unknown>, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } })

export async function POST(req: NextRequest) {
  let user: { id: string; email?: string | null } | null = null
  try {
    const { data } = await createClient().auth.getUser()
    user = data.user ?? null
  } catch {
    user = null
  }
  if (!user) return json({ error: 'Sign in to make an ad.', reason: 'sign_in_required' }, 401)
  // Fora do interruptor: 404, igual a uma rota que não existe (nada é lido do corpo antes disto).
  if (!pessoaFalandoAcesso(isAdsInternalEmail(user.email))) return json({ error: 'Not found.' }, 404)

  const lido = lerPedido(await req.json().catch(() => null))
  if (!lido.ok) return json({ error: lido.erro, reason: 'bad_request', charged: false }, 400)
  const { pedido } = lido

  if (pedido.dryRun && pedido.roteiro) {
    const plano = pessoaFalandoDryRun({ ...pedido.entrada }, pedido.roteiro)
    await writeServerEvent({
      name: ADS_PF_EVENTOS.dryRun, userId: user.id, path: '/api/ads/pessoa-falando',
      metadata: { apresentador: pedido.entrada.apresentadorId, formato: pedido.entrada.formatoId, roteiro_aprovado: plano.roteiro.aprovado, motivos: plano.roteiro.motivos, charged: false },
    }).catch(() => false)
    return json({ ...plano, credits: ADS_PESSOA_FALANDO_CREDITS, credits_status: ADS_PESSOA_FALANDO_CREDITS === null ? 'PENDENTE_DECISAO_DO_DONO' : 'decided' })
  }

  // Pedido pago: nada é debitado e nada vai à fal antes de o preço existir e de a execução estar ligada.
  if (ADS_PESSOA_FALANDO_CREDITS === null) {
    return json({ error: 'The price of this ad format is not decided yet. Nothing was charged.', reason: 'price_pending', charged: false }, 409)
  }
  return json({ error: 'This ad format is being finished. Nothing was charged.', reason: 'pipeline_not_wired', charged: false }, 501)
}
