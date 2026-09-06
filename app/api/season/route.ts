// ═══ KINEO-TEMPORADA-2026-09-06 (sprint-assinaturas #18) ═══════════════════
//
// A porta de servidor da TEMPORADA. Ver lib/temporada.ts para o número que
// mandou construir isto (65 pessoas que fizeram UM filme, ainda têm saldo e
// foram embora satisfeitas em ~30 min).
//
// CONTRATO, e ele é deliberado:
//
//   GET  — só LÊ. Nunca chama modelo, nunca gasta um centavo. Existe para que
//          qualquer tela, carta ou varredura possa perguntar "esta pessoa tem
//          temporada?" sem risco de custo surpresa. Sem temporada = 200 com
//          `season: null`, nunca 404: ausência de temporada não é erro.
//   POST — escreve UMA vez por filme e guarda. Chamar de novo devolve a MESMA
//          temporada (a lição do #14: quem volta tem de encontrar o mesmo
//          texto, não um diferente).
//
// NÃO COBRA CRÉDITO. NÃO CHAMA A FAL. NÃO RENDERIZA. Escreve cinco títulos.
// O episódio só vira filme pelo fluxo normal, cobrado normalmente.
//
// NÃO ESCREVE OFERTA. A rota devolve o CUSTO de cada episódio vindo de
// `creditCostForDuration` (fonte única) e o SALDO da pessoa. Quem monta a
// frase ("cabe no seu saldo" / "o resto da temporada") é a carta ou a tela —
// preço público é decisão do fundador e este arquivo não o toca.

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { normalizeSeriesSeed } from '@/lib/seriesContinuation'
import { creditCostForDuration, type Quality } from '@/lib/credits/engineCost'
import { getEffectiveEntitlement, TRIAL_ENTITLEMENT_COLUMNS } from '@/lib/reverseTrial'
import {
  TEMPORADA_EVENT,
  TOTAL_EPISODIOS,
  lerTemporada,
  prepararTemporada,
  temporadaAindaVale,
  type TemporadaEscrita,
} from '@/lib/temporada'

export const dynamic = 'force-dynamic'

function adminOuNulo() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createServiceClient(url, key, { auth: { persistSession: false } })
}

type FilmeAlvo = {
  id?: unknown
  title?: unknown
  topic?: unknown
  quality_mode?: unknown
  duration_seconds?: unknown
}

/** O filme mais recente ENTREGUE. É dele que a temporada nasce. */
async function ultimoFilme(userId: string): Promise<FilmeAlvo | null> {
  const admin = adminOuNulo()
  if (!admin) return null
  const { data } = await admin
    .from('videos')
    .select('id, title, topic, quality_mode, duration_seconds, created_at')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(1)
  return Array.isArray(data) && data[0] ? (data[0] as FilmeAlvo) : null
}

async function temporadaGravada(userId: string, videoId: string): Promise<TemporadaEscrita | null> {
  const admin = adminOuNulo()
  if (!admin) return null
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
 *  uma temporada pronta em resposta de erro. */
async function guardarTemporada(userId: string, videoId: string, t: TemporadaEscrita): Promise<void> {
  const admin = adminOuNulo()
  if (!admin) return
  try {
    await admin.from('events').insert({
      user_id: userId,
      name: TEMPORADA_EVENT,
      session_id: videoId.slice(0, 64),
      path: '/api/season',
      metadata: { episodes: t.episodes, fromTitle: t.fromTitle },
    })
  } catch {
    /* a memória é bônus; a temporada na resposta não é. */
  }
}

/** O custo de repetir o MESMO motor e a MESMA duração do filme 1. É esse o
 *  número honesto: a pessoa vai querer o episódio 3 com a cara do episódio 1,
 *  não com a cara do motor mais barato da casa. */
function custoDoEpisodio(filme: FilmeAlvo, pago: boolean): number | null {
  const q = typeof filme.quality_mode === 'string' ? (filme.quality_mode as Quality) : null
  if (!q) return null
  const seg =
    typeof filme.duration_seconds === 'number' && filme.duration_seconds > 0 ? filme.duration_seconds : 60
  try {
    return creditCostForDuration(q, pago, seg)
  } catch {
    return null
  }
}

function resposta(
  t: TemporadaEscrita | null,
  alvo: FilmeAlvo | null,
  balance: number,
  custo: number | null,
) {
  return NextResponse.json({
    season: t
      ? {
          fromVideoId: typeof alvo?.id === 'string' ? alvo.id : null,
          fromTitle: t.fromTitle,
          // `affordable` é derivado, não digitado: é a MESMA conta que o
          // cobrador faz. A carta e a tela leem daqui em vez de refazerem.
          episodes: t.episodes.map((e) => ({ ...e, cost: custo, affordable: custo !== null && custo <= balance })),
        }
      : null,
    balance,
    episodeCost: custo,
    // Quantos episódios da temporada o saldo de hoje paga. É este número que
    // transforma "60 créditos" em "o resto da sua temporada" sem inventar preço.
    affordableEpisodes: custo && custo > 0 ? Math.min(TOTAL_EPISODIOS, Math.floor(balance / custo)) : null,
  })
}

type Contexto =
  | { erro: NextResponse }
  | { erro?: undefined; userId: string; alvo: FilmeAlvo | null; balance: number; pago: boolean }

async function contexto(req: NextRequest): Promise<Contexto> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { erro: NextResponse.json({ error: 'You must be signed in.' }, { status: 401 }) }

  const admin = adminOuNulo()
  const perfil = admin
    ? (
        await admin
          .from('profiles')
          .select(`video_credits, ${TRIAL_ENTITLEMENT_COLUMNS}`)
          .eq('id', user.id)
          .maybeSingle()
      ).data
    : null

  const cru = (perfil ?? {}) as { video_credits?: unknown }
  const balance = typeof cru.video_credits === 'number' ? Math.max(0, Math.floor(cru.video_credits)) : 0
  // O predicado do cobrador, nunca redigitado (memória
  // `predicado-do-cobrador-nao-se-redigita`).
  const ent = getEffectiveEntitlement(perfil ?? {})

  const pedido = req.nextUrl.searchParams.get('videoId')
  let alvo: FilmeAlvo | null = null
  if (pedido && admin) {
    const { data } = await admin
      .from('videos')
      .select('id, title, topic, quality_mode, duration_seconds, created_at')
      .eq('user_id', user.id)
      .eq('id', pedido)
      .maybeSingle()
    alvo = (data as FilmeAlvo | null) ?? null
  } else {
    alvo = await ultimoFilme(user.id)
  }
  return { userId: user.id, alvo, balance, pago: ent.treatAsPaid }
}

export async function GET(req: NextRequest) {
  const ctx = await contexto(req)
  if (ctx.erro) return ctx.erro
  const { userId, alvo, balance, pago } = ctx
  if (!alvo || typeof alvo.id !== 'string') return resposta(null, null, balance, null)
  const t = await temporadaGravada(userId, alvo.id)
  return resposta(t, alvo, balance, custoDoEpisodio(alvo, pago))
}

export async function POST(req: NextRequest) {
  const ctx = await contexto(req)
  if (ctx.erro) return ctx.erro
  const { userId, alvo, balance, pago } = ctx
  if (!alvo || typeof alvo.id !== 'string') return resposta(null, null, balance, null)

  const custo = custoDoEpisodio(alvo, pago)

  // A LEMBRANÇA VEM ANTES DE TUDO (lição do #14): quem volta encontra a MESMA
  // temporada, e a casa não paga duas vezes pelo mesmo texto.
  const jaTem = await temporadaGravada(userId, alvo.id)
  if (jaTem) return resposta(jaTem, alvo, balance, custo)

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return resposta(null, alvo, balance, custo)

  // O conteúdo real do filme 1 mora em `topic` — `videos.script` está vazio em
  // 774 de 774 filmes de 30 dias (achado do #14, não re-investigar).
  const semente = normalizeSeriesSeed(
    (typeof alvo.topic === 'string' && alvo.topic) || (typeof alvo.title === 'string' && alvo.title) || '',
  )
  if (!semente) return resposta(null, alvo, balance, custo)

  const sistema = [
    'You name episodes for a short-form video series (YouTube Shorts / TikTok, 35-90s, one narrator, no host on camera).',
    `Given EPISODE 1, invent the next ${TOTAL_EPISODIOS} episodes of the SAME series: same subject area, same format, same tone.`,
    'Each episode must be a genuinely different story with its own hook and its own payoff — never a rephrasing of episode 1 and never of each other.',
    'Return STRICT JSON only, no prose, no markdown fence:',
    '{"episodes":[{"title":"...","seed":"..."}]}',
    '- "title": the episode title a viewer would click. Max 70 characters. No numbering, no "Episode N".',
    '- "seed": one sentence naming the concrete subject of that episode, written so it can be handed to a video generator as the topic. Max 160 characters.',
    `Exactly ${TOTAL_EPISODIOS} items.`,
  ].join('\n')

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
          { role: 'system', content: sistema },
          { role: 'user', content: `EPISODE 1:\n${semente}\n\nWrite the next ${TOTAL_EPISODIOS} episodes.` },
        ],
      }),
      signal: AbortSignal.timeout(25_000),
    })
    if (!res.ok) {
      console.error('[season] openai', res.status)
      return resposta(null, alvo, balance, custo)
    }
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] }
    bruto = (json.choices?.[0]?.message?.content ?? '').trim()
  } catch {
    return resposta(null, alvo, balance, custo)
  }

  let parsed: unknown = null
  try {
    parsed = JSON.parse(bruto)
  } catch {
    return resposta(null, alvo, balance, custo)
  }

  const t = prepararTemporada(parsed, typeof alvo.title === 'string' ? alvo.title : semente)
  // Temporada incompleta NÃO é gravada nem devolvida (ou os cinco, ou nenhum —
  // ver lib/temporada.ts). Sem temporada a tela e a carta seguem exatamente
  // como hoje; nada quebra por ausência.
  if (!t) return resposta(null, alvo, balance, custo)

  await guardarTemporada(userId, alvo.id, t)
  return resposta(t, alvo, balance, custo)
}
