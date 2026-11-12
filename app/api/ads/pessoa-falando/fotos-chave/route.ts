import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { createClient } from '@/lib/supabase/server'
import { isAdsInternalEmail } from '@/lib/ads/access'
import { footageAdminClient } from '@/lib/userFootage'
import { writeServerEvent } from '@/lib/serverEvents'
import { lerPedido, pessoaFalandoAcesso, ADS_PF_EVENTOS } from '@/lib/ads/pessoaFalando/plataforma'
import { gerarFotosChave, PEDIDO_ID, type FotosIo } from '@/lib/ads/pessoaFalando/fotosChave'

// KINEO-ADS-PESSOA-FALANDO-FOTOS-1211 — passo 2 do contrato da tela (PESSOA_FALANDO_API.fotos): as 2 fotos-chave PAGAS (55 créditos, decisão da
// CEO 12/11). Atrás do interruptor: conta de fora = 404 sem ler o corpo. A lógica (reserva → fal → cópia → estorno em qualquer falha) mora em
// lib/ads/pessoaFalando/fotosChave.ts; aqui só o io real. `pedidoId` (uuid) vem da tela — o mesmo em toda tentativa do MESMO pedido; sem ele,
// o servidor cria um. Resposta = RespostaFotos do contrato + pedidoId (a tela manda de volta no passo do vídeo).
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 180

const json = (body: Record<string, unknown>, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } })
const BUCKET = 'renders'
const IMAGEM_MAX = 15 * 1024 * 1024

function ioReal(userId: string): FotosIo {
  const admin = footageAdminClient()
  return {
    debitar: async ({ chave, creditos }) => {
      // O RPC de débito NÃO recusa saldo baixo (zera em 0, medido pela CEO 12/11): sem esta leitura, quem tem 20 créditos levaria as
      // fotos pagando 20. Saldo abaixo do preço = 'insufficient' ANTES de debitar (a rota responde 402, nada cobrado).
      const { data: perfil, error: pe } = await admin.from('profiles').select('video_credits').eq('id', userId).maybeSingle()
      const saldo = Number((perfil as { video_credits?: unknown } | null)?.video_credits)
      if (pe || !Number.isFinite(saldo)) return 'unavailable'
      if (saldo < creditos) return 'insufficient'
      const { debitVideoCredits } = await import('@/lib/credits/debit')
      const { data, error } = await debitVideoCredits(admin, { userId, renderId: chave, cost: creditos, service: true })
      if (!error && typeof data === 'number') return 'reserved'
      return /balance|credit|insufficient/i.test(error?.message ?? '') ? 'insufficient' : 'unavailable'
    },
    estornar: async (chave) => { const { refundRenderCredits } = await import('@/lib/credits/refund'); return refundRenderCredits(chave) },
    gerar: async (endpoint, input) => {
      const key = process.env.FAL_KEY || process.env.FAL_API_KEY
      if (!key) return []
      const res = await fetch(`https://fal.run/${endpoint}`, {
        method: 'POST', headers: { Authorization: `Key ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(input), signal: AbortSignal.timeout(150_000),
      })
      if (!res.ok) return []
      const out = (await res.json().catch(() => ({}))) as { images?: Array<{ url?: string }> }
      return (out.images ?? []).map((im) => String(im?.url ?? '')).filter((u) => u.startsWith('https://'))
    },
    guardar: async ({ pedidoId, idx, url }) => {
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(30_000), cache: 'no-store' })
        if (!res.ok) return null
        const tipo = (res.headers.get('content-type') ?? '').split(';')[0].trim()
        const ext = tipo === 'image/png' ? 'png' : tipo === 'image/webp' ? 'webp' : tipo === 'image/jpeg' ? 'jpg' : null
        if (!ext) return null
        const buf = new Uint8Array(await res.arrayBuffer())
        if (buf.byteLength === 0 || buf.byteLength > IMAGEM_MAX) return null
        const caminho = `${userId}/adspf-${pedidoId}-foto${idx + 1}.${ext}`
        const up = await admin.storage.from(BUCKET).upload(caminho, buf, { contentType: tipo, upsert: true })
        if (up.error) return null
        return admin.storage.from(BUCKET).getPublicUrl(caminho).data?.publicUrl ?? null
      } catch { return null }
    },
    evento: async (name, metadata) => { await writeServerEvent({ name, userId, path: '/api/ads/pessoa-falando/fotos-chave', metadata }) },
    fotos: async ({ pedidoId }) => {
      const { data } = await admin.from('events').select('metadata').eq('user_id', userId).eq('name', ADS_PF_EVENTOS.fotos)
        .eq('metadata->>pedido_id', pedidoId).order('created_at', { ascending: false }).limit(1).maybeSingle()
      const lista = (data?.metadata as { fotos?: unknown } | undefined)?.fotos
      if (Array.isArray(lista) && lista.length >= 2) return lista.map(String)
      // pedidos de antes deste campo: o caminho é fixo (renders/<user>/adspf-<pedido>-fotoN.jpg)
      return [1, 2].map((n) => admin.storage.from(BUCKET).getPublicUrl(`${userId}/adspf-${pedidoId}-foto${n}.jpg`).data?.publicUrl ?? '').filter(Boolean)
    },
    estado: async ({ pedidoId }) => {
      const { data, error } = await admin.from('events').select('name').eq('user_id', userId)
        .in('name', [ADS_PF_EVENTOS.reservado, ADS_PF_EVENTOS.fotos, ADS_PF_EVENTOS.estornado]).eq('metadata->>pedido_id', pedidoId).limit(10)
      if (error) throw new Error('state_unavailable')
      const nomes = new Set((data ?? []).map((r) => String(r.name)))
      if (nomes.has(ADS_PF_EVENTOS.estornado)) return 'estornado'
      if (nomes.has(ADS_PF_EVENTOS.fotos)) return 'entregue'
      if (nomes.has(ADS_PF_EVENTOS.reservado)) return 'em_andamento'
      return 'novo'
    },
  }
}

export async function POST(req: NextRequest) {
  let user: { id: string; email?: string | null } | null = null
  try { user = (await createClient().auth.getUser()).data.user ?? null } catch { user = null }
  if (!user) return json({ error: 'Sign in to make an ad.', reason: 'sign_in_required', charged: false }, 401)
  if (!pessoaFalandoAcesso(isAdsInternalEmail(user.email))) return json({ error: 'Not found.' }, 404)

  const corpo = await req.json().catch(() => null)
  const lido = lerPedido(corpo)
  if (!lido.ok) return json({ error: lido.erro, reason: 'bad_request', charged: false }, 400)
  const pedidoBruto = corpo && typeof (corpo as Record<string, unknown>).pedidoId === 'string' ? String((corpo as Record<string, unknown>).pedidoId) : ''
  const pedidoId = PEDIDO_ID.test(pedidoBruto) ? pedidoBruto : randomUUID()
  const r = await gerarFotosChave(ioReal(user.id), { userId: user.id, pedidoId, entrada: lido.pedido.entrada })
  return json(r.body as Record<string, unknown>, r.status)
}
