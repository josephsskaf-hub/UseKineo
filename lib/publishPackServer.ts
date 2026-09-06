// ═══ KINEO-PACOTE-DE-PUBLICACAO-2026-09-06 (sprint-assinaturas #20) ════════
//
// O escritor do pacote. Ver lib/publishPack.ts para a aritmetica que mandou
// construir isto (a meta do fundador exige gente nova, e cada filme publicado
// por um cliente e o unico canal de aquisicao que a casa puxa sozinha).
//
// ⚠️ ESTE CODIGO RODA DENTRO DE UM CRON DE E-MAIL QUE JA FUNCIONA. Duas regras
// que nao se negociam:
//
//   1. FALHA SEMPRE ABERTA. Qualquer problema — sem chave, modelo fora do ar,
//      JSON torto, tempo esgotado — devolve null, e o e-mail sai BYTE A BYTE
//      como sai hoje. Um pacote de publicacao nunca pode impedir a pessoa de
//      saber que o filme dela ficou pronto.
//   2. TEMPO CURTO. O timeout aqui e menor que o dos outros escritores da casa
//      (12s contra 25s) porque este roda em LOTE: 30 filmes x 25s estouraria o
//      `maxDuration` do cron e derrubaria os e-mails que viriam depois.

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  PACOTE_EVENT,
  lerPacote,
  pacoteAindaVale,
  prepararPacote,
  type PacoteDePublicacao,
} from '@/lib/publishPack'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Admin = SupabaseClient<any, any, any>

export type FilmeDoPacote = {
  id?: unknown
  title?: unknown
  topic?: unknown
}

export async function pacoteGravado(
  admin: Admin,
  userId: string,
  videoId: string,
): Promise<PacoteDePublicacao | null> {
  try {
    const { data, error } = await admin
      .from('events')
      .select('metadata, created_at')
      .eq('user_id', userId)
      .eq('name', PACOTE_EVENT)
      .eq('session_id', videoId)
      .order('created_at', { ascending: false })
      .limit(1)
    if (error) return null
    const linha = Array.isArray(data) && data[0] ? data[0] : null
    if (!linha) return null
    if (!pacoteAindaVale(linha.created_at as string | null, Date.now())) return null
    return lerPacote(linha.metadata)
  } catch {
    return null
  }
}

async function guardar(admin: Admin, userId: string, videoId: string, p: PacoteDePublicacao): Promise<void> {
  try {
    await admin.from('events').insert({
      user_id: userId,
      name: PACOTE_EVENT,
      session_id: videoId.slice(0, 64),
      path: '/lib/publishPackServer',
      metadata: { ...p },
    })
  } catch {
    /* a memoria e bonus; o pacote no e-mail nao e. */
  }
}

// O formato e o do fundador (modelo "Lago Natron", CLAUDE.md). O modelo NAO
// escolhe a estrutura — ele preenche a que ja foi aprovada.
const SISTEMA = [
  'You write the publishing pack for a finished short-form video (YouTube Shorts / TikTok, vertical, 35-90s, AI-generated).',
  'Return STRICT JSON only, no prose, no markdown fence:',
  '{"ytTitle":"...","ytDescription":"...","tiktokCaption":"...","pinnedComment":"..."}',
  '',
  '- ytTitle: a clickable Shorts title. Max 90 characters. No quotes around it, no "Episode N", no clickbait that the video cannot pay off.',
  '- ytDescription: 2-3 sentences that hook, then a blank line, then 4-6 hashtags on the last line. Do NOT write a credit line — the system appends its own.',
  '- tiktokCaption: one hook line with one emoji, then hashtags including #fyp and #ai. Max 300 characters.',
  '- pinnedComment: one short line in the creator\'s voice about a surprising fact from the video, or about it being AI-made. Max 200 characters.',
  '',
  'Write in the language of the topic you are given. Never invent facts that the topic does not support: if the topic is thin, stay general rather than specific.',
].join('\n')

/**
 * O pacote deste filme: o gravado, ou um novo escrito e guardado.
 *
 * `escrever: false` = so leitura, custo ZERO garantido.
 */
export async function garantirPacote(
  admin: Admin,
  userId: string,
  filme: FilmeDoPacote,
  opts?: { escrever?: boolean },
): Promise<PacoteDePublicacao | null> {
  const videoId = typeof filme.id === 'string' ? filme.id : null
  if (!videoId) return null

  const jaTem = await pacoteGravado(admin, userId, videoId)
  if (jaTem) return jaTem
  if (opts?.escrever === false) return null

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null

  // `videos.script` esta vazio em 774 de 774 filmes de 30 dias (achado do #14):
  // o conteudo real mora em `topic`.
  const tema = [
    typeof filme.title === 'string' ? filme.title.trim() : '',
    typeof filme.topic === 'string' ? filme.topic.trim() : '',
  ]
    .filter(Boolean)
    .join('\n')
    .slice(0, 1500)
  if (!tema) return null

  let bruto = ''
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.8,
        max_tokens: 600,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SISTEMA },
          { role: 'user', content: `THE VIDEO:\n${tema}` },
        ],
      }),
      // Curto DE PROPOSITO: este escritor roda em lote dentro de um cron.
      signal: AbortSignal.timeout(12_000),
    })
    if (!res.ok) {
      console.error('[publish-pack] openai', res.status)
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

  const p = prepararPacote(parsed)
  if (!p) return null

  await guardar(admin, userId, videoId, p)
  return p
}
