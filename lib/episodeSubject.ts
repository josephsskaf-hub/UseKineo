// ═══ KINEO-EPISODIO-COM-ASSUNTO-2026-09-22 — quem foi o episódio anterior desta série? ═══
//
// Servidor. As duas rotas de render (generate-video-fast e generate-video-cinematic) chamam isto quando o pedido
// é um "próximo episódio" (lib/seriesContinuation.isSeriesContinuationPrompt). Busca os últimos filmes completos da
// pessoa e escolhe o que casa com a semente do pedido (o título/gancho do filme 1); sem casamento, o mais recente.
// Falha aberta: qualquer erro devolve null e o pedido segue como antes (o gancho sozinho).
import type { SupabaseClient } from '@supabase/supabase-js'

export interface PreviousEpisode {
  id: string
  topic: string | null
  narration: string | null
  matchedBy: 'seed' | 'latest'
}

const norm = (s: string | null | undefined) => (s ?? '').toLowerCase().replace(/["“”]+/g, '').replace(/\s+/g, ' ').trim()

/** A semente do pedido: o que está entre aspas depois de "Topic:" (ou a primeira frase). */
export function continuationSeed(prompt: string): string {
  const m = /^\s*(?:topic|tema)\s*:\s*"?([^"\n]+?)"?\s*(?:\.\s+this is the next episode|$)/i.exec(prompt)
  const seed = m ? m[1] : prompt.split('\n')[0]
  return norm(seed).slice(0, 60)
}

export async function findPreviousEpisode(
  db: SupabaseClient,
  userId: string,
  prompt: string,
): Promise<PreviousEpisode | null> {
  try {
    const { data, error } = await db
      .from('videos')
      .select('id, title, topic, script, status, created_at')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(8)
    if (error || !data || data.length === 0) return null
    const seed = continuationSeed(prompt)
    const head = seed.slice(0, 40)
    const bySeed = head.length >= 12
      ? data.find((v) => norm(v.title).includes(head) || norm(v.topic).includes(head) || norm(v.script).includes(head))
      : undefined
    const pick = bySeed ?? data[0]
    // Um episódio que já nasceu de continuação carrega o bloco do anterior no topic: o pedido original é a
    // primeira linha útil dele, não o bloco inteiro.
    const topic = typeof pick.topic === 'string' ? pick.topic.split('\n\nPREVIOUS EPISODE')[0] : null
    return { id: pick.id, topic, narration: typeof pick.script === 'string' ? pick.script : null, matchedBy: bySeed ? 'seed' : 'latest' }
  } catch {
    return null
  }
}
