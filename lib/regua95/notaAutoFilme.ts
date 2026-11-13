// KINEO-NOTA-AUTO-1MIN-1311 — a NOTA AUTOMÁTICA UM MINUTO DEPOIS DO FILME (ordem do dono, 13/11 16:42, prioridade nº 1).
//
// Dois caminhos chamam a MESMA função (notaAutoDoFilme), idempotente pelo marcador nota_auto_inicio + evento nota_auto:
//   1. disparo na hora: app/api/compose/status/[renderId] agenda, depois da resposta ao cliente (waitUntil), o julgamento do
//      filme cujo insert em `videos` acabou de dar certo. Não atrasa nada para o cliente; se o runtime não oferece waitUntil,
//      não agenda (o cron pega);
//   2. rede de segurança: /api/cron/nota-auto, de 1 em 1 minuto, pega os filmes das últimas 3 h sem nota (ou com falha
//      vencida) e sai em milissegundos quando não há nada (uma leitura de `videos` + uma de `events`).
// Lê o filme pelo id: linha de videos → claim do compose (render_id) → nascimento (generation_id) → plano de cenas.
// Só medição: nada muda o que o cliente recebe.
import type { SupabaseClient } from '@supabase/supabase-js'
import type { readAll as ReadAllRows } from '../supabase/readAll'
import { evidenceFromBirth } from '@/lib/regua95/coherenceV2'
import { produtoDoVideo } from '@/lib/regua95/contexto'
import { planoDoNascimento } from '@/lib/regua95/notaPorCena'
import {
  julgarEGravarNotaAuto, lerModoNotaAuto, notaAutoPendente, notasAutoFeitas, type EntregaNotaAuto, type NotaAutoMode,
} from '@/lib/regua95/notaRevisor'

/** Janela da rede de segurança (o disparo na hora cobre o caso normal; isto cobre função morta, deploy, fal fora). */
export const NOTA_AUTO_CRON_HORAS = 3
/** Por giro do cron: no máximo 2 filmes (cada um leva ~20–40 s); o resto fica para o minuto seguinte. */
export const NOTA_AUTO_CRON_MAX = 2

type VideoLinha = { id: string; user_id: string; created_at: string; quality_mode: string | null; video_url: string | null; duration: number | null; render_id: string | null; topic: string | null; engine_used: string | null; script: string | null; prompt: string | null; status: string | null }
const str = (x: unknown) => (typeof x === 'string' ? x : '')

/** A entrega de UM filme pronto, com o plano de cenas do nascimento. null = não é filme pronto (ou o vídeo sumiu). */
export async function entregaDoFilme(admin: SupabaseClient, videoId: string): Promise<EntregaNotaAuto | null> {
  const { data } = await admin.from('videos').select('id, user_id, created_at, quality_mode, video_url, duration, render_id, topic, engine_used, script, prompt, status').eq('id', videoId).maybeSingle()
  const v = data as VideoLinha | null
  if (!v || v.status !== 'completed' || !v.video_url || produtoDoVideo(v.quality_mode) !== 'filme') return null
  let response: Record<string, unknown> | null = null
  if (v.render_id) {
    const c = await admin.from('events').select('metadata').eq('name', 'compose_submission_claim').eq('metadata->>render_id', v.render_id).order('created_at', { ascending: true }).limit(1)
    const gen = str(((c.data ?? [])[0] as { metadata?: Record<string, unknown> } | undefined)?.metadata?.generation_id)
    if (gen) {
      const b = await admin.from('events').select('metadata').eq('name', 'cinematic_submission_claim').eq('session_id', gen).order('created_at', { ascending: true }).limit(1)
      const meta = ((b.data ?? [])[0] as { metadata?: Record<string, unknown> } | undefined)?.metadata
      response = meta?.response && typeof meta.response === 'object' ? (meta.response as Record<string, unknown>) : null
    }
  }
  const evd = evidenceFromBirth(response)
  return {
    key: v.id,
    user_id: v.user_id,
    delivered_at: v.created_at,
    video_url: v.video_url,
    seconds: v.duration,
    product: 'filme',
    notaAuto: {
      pedido: v.topic || v.prompt || evd?.prompt || '',
      roteiro: (v.script || evd?.narration || '').trim() || null,
      motor: v.engine_used ?? v.quality_mode,
      plano: planoDoNascimento(response, v.duration),
    },
  }
}

/** Julga um filme se ele ainda precisa de nota. Nunca lança. */
export async function notaAutoDoFilme(
  admin: SupabaseClient,
  x: { videoId: string; route: string; readAll: typeof ReadAllRows; tokenGateway?: string | null; fetchImpl?: typeof fetch; modo?: NotaAutoMode; agora?: number },
): Promise<{ videoId: string; feito: boolean; motivo?: string; nota?: number | null; usd?: number; painel?: string; erro?: string }> {
  try {
    const modo = x.modo ?? lerModoNotaAuto()
    if (modo === 'off') return { videoId: x.videoId, feito: false, motivo: 'off' }
    const e = await entregaDoFilme(admin, x.videoId)
    if (!e) return { videoId: x.videoId, feito: false, motivo: 'nao_e_filme_pronto' }
    const feitas = await notasAutoFeitas(admin, [e.key], x.readAll, x.route, x.agora)
    if (!notaAutoPendente(modo, e, feitas, x.agora)) return { videoId: x.videoId, feito: false, motivo: 'ja_feito_ou_fora_da_janela' }
    const r = await julgarEGravarNotaAuto(admin, { modo, entrega: e, base: { product: 'filme', video_id: e.key, engine: e.notaAuto?.motor ?? null }, route: x.route, fetchImpl: x.fetchImpl, tokenGateway: x.tokenGateway })
    return { videoId: x.videoId, feito: true, ...r }
  } catch (err) {
    return { videoId: x.videoId, feito: false, motivo: 'erro', erro: err instanceof Error ? err.message.slice(0, 160) : 'erro' }
  }
}

/** Os filmes prontos das últimas 3 h que ainda não têm nota (nem julgamento em curso), do mais antigo ao mais novo. */
export async function filmesSemNotaAuto(admin: SupabaseClient, readAll: typeof ReadAllRows, x: { route: string; agora?: number; horas?: number }): Promise<string[]> {
  const agora = x.agora ?? Date.now()
  const desde = new Date(agora - (x.horas ?? NOTA_AUTO_CRON_HORAS) * 3600_000).toISOString()
  const { data } = await admin.from('videos').select('id, quality_mode, created_at').eq('status', 'completed').gte('created_at', desde).order('created_at', { ascending: true }).limit(200)
  const filmes = ((data ?? []) as Array<{ id: string; quality_mode: string | null }>).filter((v) => produtoDoVideo(v.quality_mode) === 'filme').map((v) => v.id)
  if (!filmes.length) return []
  const feitas = await notasAutoFeitas(admin, filmes, readAll, x.route, agora)
  return filmes.filter((id) => !feitas.has(id))
}
