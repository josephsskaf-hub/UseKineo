import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdsInternalEmail } from '@/lib/ads/access'
import { pessoaFalandoAcesso } from '@/lib/ads/pessoaFalando/plataforma'

// KINEO-ADS-PESSOA-FALANDO-PLATAFORMA-1211 — passo 2 do contrato da tela (PESSOA_FALANDO_API.fotos). AINDA NÃO LIGADO: as 2 fotos-chave
// (fal-ai/nano-banana-pro/edit, num_images 2) são a 1ª chamada paga, e pela decisão da CEO (12/11) entram nos 55 créditos — então este passo
// é o que RESERVA os 55 (reservarPessoaFalando, chave adspf-<pedido>) e as fotos têm de ser copiadas para o nosso bucket (URL da fal expira).
// Até isso estar pronto, recusa honesta: nada é reservado, nada vai à fal (a tela diz "nada foi cobrado").
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const json = (body: Record<string, unknown>, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } })

export async function POST(_req: NextRequest) {
  let user: { id: string; email?: string | null } | null = null
  try { user = (await createClient().auth.getUser()).data.user ?? null } catch { user = null }
  if (!user) return json({ error: 'Sign in to make an ad.', reason: 'sign_in_required', charged: false }, 401)
  if (!pessoaFalandoAcesso(isAdsInternalEmail(user.email))) return json({ error: 'Not found.' }, 404)
  return json({ error: 'This step is being finished. Nothing was charged.', reason: 'keyframes_not_wired', charged: false }, 501)
}
