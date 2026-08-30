import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MyVideosClient from './HistoryClient'

export default async function MyVideosPage() {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // PUSH #92 — the status filter used to hide every non-completed render.
  // The render flow's recovery snapshot lives in sessionStorage-keyed
  // localStorage, so closing the tab (mobile Safari does this on its own)
  // orphans the render with no other way back to it. /history is the
  // backstop — it must show every status, not just 'completed', or a user
  // whose tab died mid-render sees "No videos yet" and assumes the product
  // ate their credit. HistoryClient renders each status distinctly.
  // KINEO-SPRINT-UI4-2026-08-29 — licao do incidente JWT-skew (28/08): esta
  // page IGNORAVA o `error` do select, entao falha de leitura virava lista
  // vazia e o cliente via "No videos yet" com o acervo intacto (o fundador
  // viu isso com 327 videos). O erro agora chega na tela como erro.
  const { data: videos, error: loadError } = await supabase
    .from('videos')
    .select('id, video_url, thumbnail_url, topic, youtube_description, hashtags, status, quality_mode, credits_used, created_at, enhanced_url, enhance_request_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    // KINEO-HISTORICO-300-2026-08-21 — 100 → 300 (pedido do fundador: "estou
    // com limitação de cem vídeos, eu sei que na minha conta eu tenho mais").
    // O teto de 100 cortava o acervo antigo justamente de quem mais produz, e
    // acervo antigo é matéria-prima de vitrine e de curadoria.
    //
    // ⚠️ POR QUE 300 É SEGURO E 100 NÃO ERA UM CAPRICHO: o custo desta tela
    // nunca foi a QUERY (300 linhas de metadados é trivial para o Postgres) —
    // era o DOM. O comentário de 14/08 em HistoryClient mediu 100 elementos
    // <video preload="metadata"> montados de uma vez, 91 deles abaixo da
    // dobra, todos disputando conexão. Aquilo já foi corrigido lá (poster +
    // montagem sob demanda), então subir o teto aqui não recria o problema.
    // ⚠️ PAR: se alguém reverter a virtualização/poster do HistoryClient, este
    // 300 volta a doer três vezes mais que o 100 doía. Mexeu num, olha o outro.
    .limit(300)

  if (loadError) {
    console.warn('[history] videos read failed; rendering safety notice instead of empty:', loadError.message)
  }

  return <MyVideosClient videos={videos ?? []} loadError={Boolean(loadError)} />
}
