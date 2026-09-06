// ═══ KINEO-TEMPORADA-2026-09-06 (sprint-assinaturas #19) ═══════════════════
//
// O ESCRITOR DA TEMPORADA, fora da rota — e a razão é concreta, não estética.
//
// A `/api/season` nasceu no #18 sabendo escrever a temporada para quem está
// LOGADO. Só que a coorte que esta peça existe para alcançar (64 pessoas que
// fizeram UM filme, ainda têm saldo e foram embora satisfeitas) não está
// logada: ela está numa lista de e-mail, e o filme dela é ANTERIOR ao deploy
// de hoje — nenhuma delas tem temporada escrita.
//
// Se a carta reimplementasse a escrita, nasceriam duas réguas de "o que é uma
// temporada" e elas divergiriam no primeiro ajuste (é exatamente o erro que a
// memória `predicado-do-cobrador-nao-se-redigita` registra). Então o escritor
// mora aqui e tem UM dono, e quem chama só decide de que lado da autenticação
// está: a rota passa o admin depois de conferir o usuário; a campanha passa o
// admin depois de escolher a coorte.
//
// ⚠️ CUSTO: uma chamada de `gpt-4o-mini` por filme, UMA VEZ. `garantirTemporada`
// lê a memória antes de gastar e devolve a gravada quando existe. Quem quiser
// leitura sem risco nenhum de gasto chama com `escrever: false`.

import type { SupabaseClient } from '@supabase/supabase-js'
import { normalizeSeriesSeed } from '@/lib/seriesContinuation'
import {
  TEMPORADA_EVENT,
  TOTAL_EPISODIOS,
  lerTemporada,
  prepararTemporada,
  temporadaAindaVale,
  type TemporadaEscrita,
} from '@/lib/temporada'

export type FilmeDaTemporada = {
  id?: unknown
  title?: unknown
  topic?: unknown
  quality_mode?: unknown
  duration_seconds?: unknown
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type Admin = SupabaseClient<any, any, any>

/** A temporada que a casa JÁ escreveu para este filme, ou null. Falha SEMPRE
 *  aberta: qualquer erro devolve null e quem chama decide. */
export async function temporadaGravada(
  admin: Admin,
  userId: string,
  videoId: string,
): Promise<TemporadaEscrita | null> {
  try {
    const { data, error } = await admin
      .from('events')
      .select('metadata, created_at')
      .eq('user_id', userId)
      .eq('name', TEMPORADA_EVENT)
      .eq('session_id', videoId)
      .order('created_at', { ascending: false })
      .limit(1)
    if (error) return null
    const linha = Array.isArray(data) && data[0] ? data[0] : null
    if (!linha) return null
    if (!temporadaAindaVale(linha.created_at as string | null, Date.now())) return null
    return lerTemporada(linha.metadata)
  } catch {
    return null
  }
}

/** Fire-and-forget de propósito: um erro de gravação nunca pode transformar
 *  uma temporada pronta em resposta de erro nem derrubar um lote de e-mail. */
async function guardar(admin: Admin, userId: string, videoId: string, t: TemporadaEscrita): Promise<void> {
  try {
    await admin.from('events').insert({
      user_id: userId,
      name: TEMPORADA_EVENT,
      session_id: videoId.slice(0, 64),
      path: '/lib/temporadaServer',
      metadata: { episodes: t.episodes, fromTitle: t.fromTitle },
    })
  } catch {
    /* a memória é bônus; a temporada devolvida não é. */
  }
}

const SISTEMA = [
  'You name episodes for a short-form video series (YouTube Shorts / TikTok, 35-90s, one narrator, no host on camera).',
  `Given EPISODE 1, invent the next ${TOTAL_EPISODIOS} episodes of the SAME series: same subject area, same format, same tone.`,
  'Each episode must be a genuinely different story with its own hook and its own payoff — never a rephrasing of episode 1 and never of each other.',
  'Return STRICT JSON only, no prose, no markdown fence:',
  '{"episodes":[{"title":"...","seed":"..."}]}',
  '- "title": the episode title a viewer would click. Max 70 characters. No numbering, no "Episode N".',
  '- "seed": one sentence naming the concrete subject of that episode, written so it can be handed to a video generator as the topic. Max 160 characters.',
  `Exactly ${TOTAL_EPISODIOS} items.`,
].join('\n')

/**
 * A temporada deste filme: a gravada, ou uma nova escrita e guardada.
 *
 * `escrever: false` = só leitura, custo ZERO garantido. É o modo do GET da
 * rota e de qualquer varredura: uma peça de leitura que pudesse gastar é como
 * uma campanha nasce cara sem ninguém perceber.
 *
 * Devolve null em TODO caminho de falha (sem chave, sem semente utilizável,
 * modelo fora do ar, JSON quebrado, temporada incompleta). Null nunca é erro:
 * significa "esta pessoa não tem temporada", e quem chama segue exatamente
 * como seguia antes desta peça existir.
 */
export async function garantirTemporada(
  admin: Admin,
  userId: string,
  filme: FilmeDaTemporada,
  opts?: { escrever?: boolean },
): Promise<TemporadaEscrita | null> {
  const videoId = typeof filme.id === 'string' ? filme.id : null
  if (!videoId) return null

  // A LEMBRANÇA VEM ANTES DE TUDO (lição do #14): quem volta encontra a MESMA
  // temporada, e a casa não paga duas vezes pelo mesmo texto.
  const jaTem = await temporadaGravada(admin, userId, videoId)
  if (jaTem) return jaTem
  if (opts?.escrever === false) return null

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null

  // O conteúdo real do filme 1 mora em `topic` — `videos.script` está vazio em
  // 774 de 774 filmes de 30 dias (achado do #14, não re-investigar).
  const semente = normalizeSeriesSeed(
    (typeof filme.topic === 'string' && filme.topic) || (typeof filme.title === 'string' && filme.title) || '',
  )
  if (!semente) return null

  let bruto = ''
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.9,
        max_tokens: 700,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SISTEMA },
          { role: 'user', content: `EPISODE 1:\n${semente}\n\nWrite the next ${TOTAL_EPISODIOS} episodes.` },
        ],
      }),
      signal: AbortSignal.timeout(25_000),
    })
    if (!res.ok) {
      console.error('[temporada] openai', res.status)
      return null
    }
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] }
    bruto = (json.choices?.[0]?.message?.content ?? '').trim()
  } catch {
    return null
  }

  let parsed: unknown = null
  try {
    parsed = JSON.parse(bruto)
  } catch {
    return null
  }

  const t = prepararTemporada(parsed, typeof filme.title === 'string' ? filme.title : semente)
  // Temporada incompleta NÃO é gravada nem devolvida (ou os cinco, ou nenhum —
  // ver lib/temporada.ts).
  if (!t) return null

  await guardar(admin, userId, videoId, t)
  return t
}
