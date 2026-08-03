// app/api/wall/refresh/route.ts — KINEO-WALL-2026-08-03
//
// Coleta os metadados públicos dos Shorts que os usuários declararam ter
// publicado (`posted_shorts`), para o Wall of Proof (/wall).
//
// ── O QUE DÁ PARA COLETAR, DE VERDADE ───────────────────────────────────────
// Foi feito grep no repo inteiro por YOUTUBE_API_KEY / GOOGLE_API_KEY /
// youtube.googleapis / oembed em app/, lib/ e .env.local.example: NÃO EXISTE
// chave da YouTube Data API neste projeto. O OAuth de canal
// (app/api/youtube/*) usa tokens POR USUÁRIO para UPLOAD — não serve para ler
// estatísticas de vídeos de terceiros e não vai ser sequestrado para isso.
//
// Então esta rota tem dois modos, e escolhe sozinha:
//
//   modo 'youtube_api'  (só se process.env.YOUTUBE_API_KEY existir)
//     → videos?part=snippet,statistics: título, canal, thumbnail E VIEWS.
//     Nenhuma chave nova é pedida ao usuário; se um dia alguém adicionar a
//     variável no Vercel, este caminho liga sozinho e o wall passa a ranquear
//     por views sem uma linha de código a mais.
//
//   modo 'oembed'  (padrão HOJE — sem chave nenhuma)
//     → https://www.youtube.com/oembed?url=…&format=json: devolve `title` e
//     `author_name` (o canal), e NÃO devolve views. Então `views` fica NULL, e
//     /wall ordena por data exibindo "View counts are coming soon". Escrever 0
//     seria pior que não saber: 0 parece um número real.
//
// Proteção: mesmo padrão dos crons existentes (app/api/cron/*) —
// `Authorization: Bearer ${CRON_SECRET}`. O Vercel Cron envia esse header
// automaticamente quando CRON_SECRET está no ambiente. Entrada agendada em
// vercel.json.
//
// Escrita: service role. `posted_shorts` só tem policies de INSERT/SELECT da
// própria linha — nenhum UPDATE é possível com a chave anon, de propósito.

import { NextRequest, NextResponse } from 'next/server'
import { isYouTubeId, wallAdminClient } from '@/lib/wallOfProof'

export const dynamic = 'force-dynamic'
// A rota fala com a rede (oEmbed é 1 request por vídeo); o default de 10s do
// runtime serverless é apertado para um lote.
export const maxDuration = 60

/** Quantos vídeos por execução. Um lote pequeno mantém a rota barata e, rodando
 *  diariamente, cobre folgadamente o volume atual (1 linha em 03/08/2026). */
const BATCH_SIZE = 60

/** Não re-checar um vídeo lido há menos que isto. */
const STALE_AFTER_MS = 12 * 60 * 60 * 1000

/** Teto do lote da Data API (a v3 aceita até 50 ids por chamada). */
const API_CHUNK = 50

type Collected = {
  title?: string | null
  channelTitle?: string | null
  thumbnailUrl?: string | null
  views?: number | null
}

function clean(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null
  const s = value.trim().slice(0, max)
  return s || null
}

// ── Modo 1: YouTube Data API (só quando houver chave) ───────────────────────

async function collectViaDataApi(ids: string[], apiKey: string): Promise<Map<string, Collected>> {
  const out = new Map<string, Collected>()
  for (let i = 0; i < ids.length; i += API_CHUNK) {
    const chunk = ids.slice(i, i + API_CHUNK)
    const url =
      'https://www.googleapis.com/youtube/v3/videos' +
      `?part=snippet,statistics&maxResults=${API_CHUNK}` +
      `&id=${encodeURIComponent(chunk.join(','))}&key=${encodeURIComponent(apiKey)}`
    try {
      const res = await fetch(url, { cache: 'no-store' })
      if (!res.ok) {
        console.error('[wall/refresh] data api HTTP', res.status)
        continue
      }
      const json = (await res.json()) as {
        items?: {
          id?: string
          snippet?: {
            title?: string
            channelTitle?: string
            thumbnails?: Record<string, { url?: string; width?: number }>
          }
          statistics?: { viewCount?: string }
        }[]
      }
      for (const item of json.items ?? []) {
        const id = item.id
        if (!isYouTubeId(id)) continue
        const thumbs = item.snippet?.thumbnails ?? {}
        // A melhor thumbnail que a API declarar; a pública hqdefault continua
        // sendo o fallback do lado da página.
        const best = ['maxres', 'standard', 'high']
          .map((k) => thumbs[k]?.url)
          .find((u) => typeof u === 'string' && u)
        const rawViews = item.statistics?.viewCount
        const views = rawViews != null && /^\d+$/.test(rawViews) ? Number(rawViews) : null
        out.set(id, {
          title: clean(item.snippet?.title, 200),
          channelTitle: clean(item.snippet?.channelTitle, 80),
          thumbnailUrl: clean(best, 400),
          views: Number.isFinite(views) ? views : null,
        })
      }
    } catch (err) {
      console.error('[wall/refresh] data api failed:', err instanceof Error ? err.message : String(err))
    }
  }
  return out
}

// ── Modo 2: oEmbed, sem chave nenhuma ───────────────────────────────────────

async function collectViaOembed(ids: string[]): Promise<Map<string, Collected>> {
  const out = new Map<string, Collected>()
  // Concorrência limitada: o endpoint é público e não documenta rate limit, e
  // 60 requests simultâneos de um IP de datacenter é como se pede para levar um
  // 429. 5 de cada vez atravessa o lote em poucos segundos.
  const CONCURRENCY = 5
  let cursor = 0

  async function worker() {
    while (cursor < ids.length) {
      const id = ids[cursor++]
      const target = `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`
      const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(target)}&format=json`
      try {
        const res = await fetch(url, { cache: 'no-store' })
        // 401/404 aqui significa vídeo privado, removido ou id inválido. Ainda
        // assim marcamos como checado (o caller grava checked_at) para o lote
        // seguinte não ficar preso no mesmo id morto para sempre.
        if (!res.ok) continue
        const json = (await res.json()) as {
          title?: string
          author_name?: string
          thumbnail_url?: string
        }
        out.set(id, {
          title: clean(json.title, 200),
          channelTitle: clean(json.author_name, 80),
          thumbnailUrl: clean(json.thumbnail_url, 400),
          // views: deliberadamente ausente. oEmbed não tem essa informação e
          // um `0` aqui viraria "0 views" na página, o que é falso.
          views: null,
        })
      } catch {
        // rede instável: silencioso, o vídeo volta no próximo lote.
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, ids.length) }, () => worker()))
  return out
}

// ── Handler ─────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  // Sem CRON_SECRET configurado a rota fica FECHADA. O contrário (abrir quando
  // a variável some) transformaria um erro de configuração numa rota pública
  // que dispara centenas de requests para o YouTube.
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = wallAdminClient()
  if (!admin) {
    return NextResponse.json({ error: 'Supabase service role not configured' }, { status: 500 })
  }

  const apiKey = (process.env.YOUTUBE_API_KEY ?? '').trim()
  const mode: 'youtube_api' | 'oembed' = apiKey ? 'youtube_api' : 'oembed'

  try {
    const staleBefore = new Date(Date.now() - STALE_AFTER_MS).toISOString()
    const { data, error } = await admin
      .from('posted_shorts')
      .select('id, youtube_video_id, checked_at')
      .eq('hidden', false)
      // Valor entre aspas: o timestamp ISO carrega ':' e '.', que são
      // separadores na gramática do `or=` do PostgREST. `toISOString()` termina
      // em 'Z' (nunca '+00:00'), então também não há '+' para virar espaço.
      .or(`checked_at.is.null,checked_at.lt."${staleBefore}"`)
      // NULLs primeiro: quem nunca foi checado é quem a página mais precisa.
      .order('checked_at', { ascending: true, nullsFirst: true })
      .limit(BATCH_SIZE)
    if (error) {
      console.error('[wall/refresh] select failed:', error.message)
      return NextResponse.json({ error: 'Could not read posted_shorts' }, { status: 500 })
    }

    const rows = (data ?? []) as { id: string; youtube_video_id: string | null }[]
    const ids = Array.from(
      new Set(rows.map((r) => r.youtube_video_id).filter((v): v is string => isYouTubeId(v))),
    )
    if (ids.length === 0) {
      return NextResponse.json({ ok: true, mode, checked: 0, updated: 0, viewsAvailable: mode === 'youtube_api' })
    }

    const collected = mode === 'youtube_api' ? await collectViaDataApi(ids, apiKey) : await collectViaOembed(ids)

    const checkedAt = new Date().toISOString()
    let updated = 0
    let resolved = 0

    for (const row of rows) {
      const id = row.youtube_video_id
      if (!isYouTubeId(id)) continue
      const info = collected.get(id)
      // `checked_at` é escrito mesmo quando a busca falhou: é o carimbo de
      // "tentamos", e é o que impede o mesmo vídeo indisponível de monopolizar
      // todos os lotes seguintes.
      const patch: Record<string, unknown> = { checked_at: checkedAt }
      if (info) {
        resolved++
        if (info.title) patch.title = info.title
        if (info.channelTitle) patch.channel_title = info.channelTitle
        if (info.thumbnailUrl) patch.thumbnail_url = info.thumbnailUrl
        // Só grava views quando existe um número. NULL continua significando
        // "ainda não sabemos" e a página trata isso explicitamente.
        if (typeof info.views === 'number') patch.views = info.views
      }
      const { error: upErr } = await admin.from('posted_shorts').update(patch).eq('id', row.id)
      if (upErr) {
        console.error('[wall/refresh] update failed:', upErr.message)
        continue
      }
      updated++
    }

    return NextResponse.json({
      ok: true,
      mode,
      // Documenta na própria resposta o que este ambiente consegue coletar —
      // false = título/canal sim, views não (falta YOUTUBE_API_KEY).
      viewsAvailable: mode === 'youtube_api',
      checked: ids.length,
      resolved,
      updated,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[wall/refresh] error:', msg)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}
