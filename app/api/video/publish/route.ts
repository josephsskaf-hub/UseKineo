import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { writeServerEvent } from '@/lib/serverEvents'
import { verifyShareToken } from '@/lib/videoShareLink'

// ═══ KINEO-CONSENTIMENTO-DE-PARTILHA-2026-09-06 — sprint-assinaturas #27 ════
//
// A porta que faltava: o DONO do filme publica UM filme, o dele, em um clique
// vindo do e-mail — e despublica pelo mesmo caminho com `&undo=1`.
//
// O contrato inteiro, e cada linha dele é uma trava:
//   1. Só publica com token HMAC válido para AQUELE id (lib/videoShareLink).
//   2. Só publica filme `completed` COM url de reprodução — uma página pública
//      que abre num <video> quebrado é pior que nenhuma página.
//   3. Nunca lista, nunca varre, nunca publica em lote: um id por chamada.
//   4. Idempotente: clicar duas vezes leva à mesma página, sem segundo carimbo
//      e sem segundo evento.
//   5. `published_via` guarda POR ONDE veio o consentimento — é o "auditável"
//      que faltava ao esquema em 27/08.
//
// FALHA FECHADA: qualquer erro (token, id, banco, filme não entregue) termina
// em redirecionamento para a biblioteca com um motivo na query. Nada publica
// por acidente. Ao contrário do `/api/episode-link`, que é um contador e falha
// ABERTO de propósito, esta rota ESCREVE — e escrita duvidosa não acontece.
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

const SITE = 'https://www.usekineo.com'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createAdminClient(url, key, { auth: { persistSession: false } })
}

function voltarParaBiblioteca(motivo: string) {
  return NextResponse.redirect(`${SITE}/history?share=${encodeURIComponent(motivo)}`, { status: 302 })
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const videoId = (url.searchParams.get('v') ?? '').trim()
  const token = url.searchParams.get('t')
  const undo = url.searchParams.get('undo') === '1'
  const source = (url.searchParams.get('src') ?? 'unknown').slice(0, 40)

  if (!UUID.test(videoId)) return voltarParaBiblioteca('invalid')
  if (!verifyShareToken(videoId, token)) return voltarParaBiblioteca('invalid')

  const admin = adminClient()
  if (!admin) return voltarParaBiblioteca('unavailable')

  try {
    const { data, error } = await admin
      .from('videos')
      .select('id, user_id, status, video_url, final_video_url, published_at')
      .eq('id', videoId)
      .single()
    if (error || !data) return voltarParaBiblioteca('missing')

    const row = data as {
      id: string
      user_id: string | null
      status: string | null
      video_url: string | null
      final_video_url: string | null
      published_at: string | null
    }

    if (undo) {
      // Despublicar é sempre permitido, mesmo para filme que já não toca:
      // tirar do ar nunca pode depender de o filme estar saudável.
      if (row.published_at) {
        await admin.from('videos').update({ published_at: null, published_via: null }).eq('id', videoId)
        await writeServerEvent({
          name: 'video_unpublished_v1',
          userId: row.user_id,
          metadata: { video_id: videoId, source },
        })
      }
      return voltarParaBiblioteca('unpublished')
    }

    // Uma página pública precisa de um filme que toque. Sem isso, o link vira
    // um <video> quebrado com o nome da casa em cima.
    const playable = (row.final_video_url || row.video_url || '').trim()
    if (row.status !== 'completed' || !playable) return voltarParaBiblioteca('not_ready')

    // Idempotente: o segundo clique leva à mesma página, sem recarimbar.
    if (!row.published_at) {
      const { error: upErr } = await admin
        .from('videos')
        .update({ published_at: new Date().toISOString(), published_via: source })
        .eq('id', videoId)
      if (upErr) return voltarParaBiblioteca('unavailable')
      await writeServerEvent({
        name: 'video_published_v1',
        userId: row.user_id,
        metadata: { video_id: videoId, source },
      })
    }

    return NextResponse.redirect(`${SITE}/v/${videoId}?utm_source=owner_share`, { status: 302 })
  } catch {
    return voltarParaBiblioteca('unavailable')
  }
}
