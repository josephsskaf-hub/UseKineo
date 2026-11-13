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
import { JUIZ19_VERSION, alvoDeDuracao, julgar19 } from '@/lib/regua95/juizRegua19'
import { lerProvedorNotaAuto } from '@/lib/regua95/visaoProvedor'
import { AI_TEXT_MODELS } from '@/lib/aiModels'
import {
  NOTA_AUTO_EVENT, julgarEGravarNotaAuto, lerModoNotaAuto, notaAutoPendente, notasAutoFeitas, type EntregaNotaAuto, type JuizNotaAuto, type NotaAutoMode,
} from '@/lib/regua95/notaRevisor'

/**
 * O juiz da produção desde 13/11 noite: a RÉGUA INTEIRA do revisor (juizRegua19.ts), com os consertos da marca da casa, da
 * época e da comparação entre cenas. No ensaio (prova de 56 filmes) foi o melhor: 77% dos ruins, 36% de alarme com gpt-6.1-sol
 * — ainda abaixo da régua do dono (≥ 85% / ≤ 10%), por isso só na sombra. Modelo e provedor: NOTA_AUTO_PROVEDOR / NOTA_AUTO_MODEL
 * (+ NOTA_AUTO_TARIFA "entrada/saída" em US$ por milhão, para o custo do evento sair certo em modelo fora da tabela).
 */
export const NOTA_AUTO_VERSAO_FILME = JUIZ19_VERSION
/** O modelo do juiz do filme: NOTA_AUTO_MODEL se existir; senão, na OpenAI, o MEDIDO no ensaio (AI_TEXT_MODELS.filmJudge); no gateway, o padrão dele. */
export function modeloDoJuizDoFilme(env: Record<string, string | undefined> = process.env): string | undefined {
  const explicito = String(env.NOTA_AUTO_MODEL ?? '').trim()
  if (explicito) return explicito
  return lerProvedorNotaAuto(env).provedor === 'openai' ? AI_TEXT_MODELS.filmJudge : undefined
}
export const juizV3ReguaInteira: JuizNotaAuto = async (a) => {
  // KINEO-NOTA-AUTO-CUSTO-1311 — quadros no TAMANHO DO VÍDEO (como a fal entrega). Decisão da CEO 13/11 noite: o quadro grande
  // custa ~5× o de 432 px do ensaio, mas viu no Milo a troca de desenho e o resgate que faltava (432 px não viu). O custo fica
  // contido pelo teto diário (NOTA_AUTO_TETO_DIA_USD, US$ 2).
  return julgar19(
    { plano: a.plano, quadros: a.quadros, pedido: a.alvo.pedido, roteiro: a.alvo.roteiro, produto: a.entrega.product, motor: a.alvo.motor, segundos: a.entrega.seconds ?? a.plano.segundos, segundosPedidos: a.alvo.segundosPedidos ?? null, linguaEscolhida: a.alvo.lingua ?? null },
    { fetchImpl: a.fetchImpl, tokenGateway: a.tokenGateway, usdQuadros: a.usdQuadros, tarifa: lerProvedorNotaAuto().tarifa, model: modeloDoJuizDoFilme() },
  )
}

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
      segundosPedidos: alvoDeDuracao(response),
      lingua: typeof response?.language === 'string' ? response.language : null,
    },
  }
}

// ── Teto diário de gasto do juiz (ordem da CEO, 13/11 noite) ──
/** US$ por dia (horário de Brasília). Estourou: não julga mais até o dia seguinte e grava UM evento nota_auto_teto no dia. */
export const NOTA_AUTO_TETO_DIA_USD = 2
export const NOTA_AUTO_TETO_EVENT = 'nota_auto_teto'
export function tetoDoDiaUsd(env: Record<string, string | undefined> = process.env): number {
  const n = Number(env.NOTA_AUTO_TETO_DIA_USD)
  return Number.isFinite(n) && n > 0 ? n : NOTA_AUTO_TETO_DIA_USD
}
/** 00:00 de hoje em Brasília (UTC−3, sem horário de verão desde 2019), em ISO UTC. */
export function inicioDoDiaBrasilia(agora: number = Date.now()): string {
  const d = new Date(agora - 3 * 3600_000)
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 3, 0, 0)).toISOString()
}
/** Quanto o juiz já gastou hoje: soma do `usd` dos eventos nota_auto desde 00:00 de Brasília. */
export async function gastoDoDia(admin: SupabaseClient, readAll: typeof ReadAllRows, route: string, agora: number = Date.now()): Promise<number> {
  const r = await readAll(() => admin.from('events').select('metadata').eq('name', NOTA_AUTO_EVENT).gte('created_at', inicioDoDiaBrasilia(agora)), { route, table: 'events' })
  return ((r.data ?? []) as Array<{ metadata: Record<string, unknown> | null }>).reduce((s, e) => s + (Number(e.metadata?.usd) || 0), 0)
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
    const feitas = await notasAutoFeitas(admin, [e.key], x.readAll, x.route, x.agora, NOTA_AUTO_VERSAO_FILME)
    if (!notaAutoPendente(modo, e, feitas, x.agora)) return { videoId: x.videoId, feito: false, motivo: 'ja_feito_ou_fora_da_janela' }
    // teto diário: estourou, não julga mais hoje e deixa UM evento de teto no dia
    const teto = tetoDoDiaUsd()
    const gasto = await gastoDoDia(admin, x.readAll, x.route, x.agora)
    if (gasto >= teto) {
      const ja = await admin.from('events').select('id').eq('name', NOTA_AUTO_TETO_EVENT).gte('created_at', inicioDoDiaBrasilia(x.agora)).limit(1)
      if (!((ja.data ?? []) as unknown[]).length) {
        await admin.from('events').insert({ name: NOTA_AUTO_TETO_EVENT, user_id: e.user_id, session_id: e.key, path: x.route, metadata: { version: NOTA_AUTO_VERSAO_FILME, gasto_usd: Math.round(gasto * 1e4) / 1e4, teto_usd: teto, dia_desde: inicioDoDiaBrasilia(x.agora), video_id: e.key } })
      }
      return { videoId: x.videoId, feito: false, motivo: 'teto_diario' }
    }
    const r = await julgarEGravarNotaAuto(admin, { modo, entrega: e, base: { product: 'filme', video_id: e.key, engine: e.notaAuto?.motor ?? null }, route: x.route, fetchImpl: x.fetchImpl, tokenGateway: x.tokenGateway, juiz: juizV3ReguaInteira, versao: NOTA_AUTO_VERSAO_FILME })
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
  const feitas = await notasAutoFeitas(admin, filmes, readAll, x.route, agora, NOTA_AUTO_VERSAO_FILME)
  return filmes.filter((id) => !feitas.has(id))
}
