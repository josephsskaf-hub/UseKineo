// app/api/posted-shorts/route.ts — KINEO-POSTED-SHORTS-2026-07-31
//
// A ponte pós-download. SPRINT-2026-07-30 §5 nomeou o problema: "Fazer o vídeo
// não é o produto. Postar é." — e até hoje a empresa media downloads (proxy) e
// não enxergava UM Short publicado. Esta rota recebe o link que o usuário cola
// na tela de sucesso ("Posted it? Drop the link") e o grava em posted_shorts,
// o primeiro estoque de prova social verificável da Kineo:
//   · métrica real de ativação (vídeos NO YOUTUBE, não no disco de alguém)
//   · matéria-prima do futuro wall of proof na landing
//   · cada linha é um vídeo vivo carregando o credit link do plano free
//
// O caminho de upload direto (app/api/youtube/upload) grava na mesma tabela
// com source='direct_upload'; aqui é só o caminho manual (source='pasted').
// RLS: insert/select apenas da própria linha; dedupe por (user, youtube_id).

import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

// Aceita youtube.com/shorts/ID, youtu.be/ID, youtube.com/watch?v=ID (e m./www.).
// O ID volta normalizado para deduplicar o mesmo vídeo colado de formas diferentes.
function extractYouTubeId(raw: string): string | null {
  let u: URL
  try {
    u = new URL(raw.trim())
  } catch {
    return null
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null
  const host = u.hostname.toLowerCase().replace(/^(www\.|m\.)/, '')
  const ID = /^[A-Za-z0-9_-]{6,20}$/
  if (host === 'youtu.be') {
    const id = u.pathname.split('/').filter(Boolean)[0] ?? ''
    return ID.test(id) ? id : null
  }
  if (host === 'youtube.com' || host.endsWith('.youtube.com')) {
    const parts = u.pathname.split('/').filter(Boolean)
    if (parts[0] === 'shorts' || parts[0] === 'embed' || parts[0] === 'live') {
      const id = parts[1] ?? ''
      return ID.test(id) ? id : null
    }
    if (parts[0] === 'watch') {
      const id = u.searchParams.get('v') ?? ''
      return ID.test(id) ? id : null
    }
  }
  return null
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = (await req.json().catch(() => null)) as { url?: unknown } | null
    const rawUrl = typeof body?.url === 'string' ? body.url.trim().slice(0, 300) : ''
    if (!rawUrl) {
      return NextResponse.json({ error: 'Missing url' }, { status: 400 })
    }

    const youtubeId = extractYouTubeId(rawUrl)
    if (!youtubeId) {
      return NextResponse.json(
        { error: "That doesn't look like a YouTube video link." },
        { status: 422 },
      )
    }

    // Dedupe silencioso: o mesmo vídeo colado duas vezes é sucesso, não erro —
    // a pessoa está confirmando que postou, não abrindo um ticket.
    const { error } = await supabase.from('posted_shorts').upsert(
      {
        user_id: user.id,
        url: `https://www.youtube.com/shorts/${youtubeId}`,
        youtube_video_id: youtubeId,
        source: 'pasted',
      },
      { onConflict: 'user_id,youtube_video_id', ignoreDuplicates: true },
    )
    if (error) {
      console.error('[posted-shorts] insert failed:', error.message)
      return NextResponse.json({ error: 'Could not save your link. Please try again.' }, { status: 500 })
    }

    // KINEO-WALL-2026-08-03 — /wall lê `posted_shorts` através de um
    // unstable_cache de 10 min (app/wall/page.tsx). Sem invalidar aqui, quem
    // acabou de colar o link olharia para uma parede que ainda não o contém —
    // e a promessa "cole e apareça" é justamente o gancho de retenção. Falha
    // desta chamada não pode derrubar o insert, que já foi confirmado.
    try {
      revalidateTag('wall-of-proof')
    } catch {
      // non-blocking
    }

    return NextResponse.json({ ok: true, youtubeId })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[posted-shorts] error:', msg)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}
