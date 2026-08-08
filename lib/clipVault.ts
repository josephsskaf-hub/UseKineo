// KINEO-FAST-V4-2026-07-10 — CLIP VAULT: self-building B-roll library + CDN proxy.
//
// Two jobs, one infra:
//   1. LIBRARY — every high-scoring clip the Fast pipeline picks is copied into
//      our own Supabase storage (bucket `broll`) and indexed in `clip_vault`.
//      Future generations search the vault FIRST: instant, on-brand, curated by
//      real usage, zero external API dependency. A compounding asset.
//   2. CDN PROXY — clips served from OUR storage are always fetchable by
//      Creatomate. This is what makes re-enabling Pexels possible later (their
//      CDN 403s Creatomate server-side), and shields us if Pixabay ever does
//      the same.
//
// Design constraints:
//   - vaultClipAsync is FIRE-AND-FORGET: it must NEVER add latency or failure
//     modes to video generation. All errors are logged and swallowed.
//   - searchVault is one indexed SQL query (~10ms) — cheap enough to run
//     before every Pixabay call.
//   - Max 40MB per clip (Pixabay 1080p clips are typically 5-25MB).

import { createClient as createServiceClient, type SupabaseClient } from '@supabase/supabase-js'

const VAULT_BUCKET = 'broll'
const MAX_CLIP_BYTES = 40 * 1024 * 1024

function serviceClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createServiceClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export interface VaultHit {
  storageUrl: string
  tags: string
  score: number
  durationSec: number | null
}

const VAULT_STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'into', 'that', 'this', 'over', 'under',
  'video', 'footage', 'clip', 'shot', 'scene', 'cinematic', 'aerial', 'view',
])

function vaultTokens(text: string): string[] {
  return Array.from(
    new Set(
      text
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((t) => t.length > 2 && !VAULT_STOPWORDS.has(t)),
    ),
  ).slice(0, 8)
}

/**
 * Search the vault for clips matching the scene query. Returns hits whose
 * tags/query share at least 2 meaningful tokens with the search (1 token is
 * too loose — "night" alone would match half the vault), best score first.
 * Never throws; returns [] on any failure or when the vault is cold.
 */
export async function searchVault(
  query: string,
  opts?: { exclude?: Set<string>; limit?: number },
): Promise<VaultHit[]> {
  try {
    if (process.env.ENABLE_CLIP_VAULT === 'false') return []
    const admin = serviceClient()
    if (!admin) return []
    const tokens = vaultTokens(query)
    if (tokens.length === 0) return []

    // One OR-of-ILIKE query over tags+query (GIN-indexed via tsvector would be
    // nicer, but ilike keeps this readable and the table stays small for months).
    const orExpr = tokens.map((t) => `tags.ilike.%${t}%,query.ilike.%${t}%`).join(',')
    const { data, error } = await admin
      .from('clip_vault')
      .select('storage_url, tags, query, score, duration_sec')
      .or(orExpr)
      .order('score', { ascending: false })
      .limit(24)
    if (error || !Array.isArray(data)) return []

    const hits: VaultHit[] = []
    for (const row of data as Array<{ storage_url: string; tags: string | null; query: string | null; score: number | null; duration_sec: number | null }>) {
      if (!row.storage_url) continue
      if (opts?.exclude?.has(row.storage_url)) continue
      const blob = `${row.tags ?? ''} ${row.query ?? ''}`.toLowerCase()
      const matched = tokens.filter((t) => blob.includes(t)).length
      if (matched < 2) continue // require real topical overlap, not one loose word
      hits.push({
        storageUrl: row.storage_url,
        tags: row.tags ?? '',
        score: (row.score ?? 0) + matched, // freshness of match nudges order
        durationSec: row.duration_sec,
      })
      if (hits.length >= (opts?.limit ?? 3)) break
    }
    return hits
  } catch (err) {
    console.warn('[clip-vault] search failed (non-blocking):', err instanceof Error ? err.message : String(err))
    return []
  }
}

/**
 * KINEO-BUGHUNT-2026-08-08 — o único adaptador entre o score FRACIONÁRIO do
 * ranker e a coluna INTEGER de `clip_vault`. Ver a nota longa no insert.
 * Ausente/NaN/Infinity viram 0 (o mesmo default de antes); o clamp mantém o
 * valor dentro do int4 mesmo que algum ranker futuro exploda de escala.
 */
const VAULT_SCORE_MAX = 2147483647
function safeVaultScore(raw: number | undefined): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return 0
  return Math.max(-VAULT_SCORE_MAX, Math.min(VAULT_SCORE_MAX, Math.round(raw)))
}

/**
 * Copy a stock clip into our storage + index it. FIRE-AND-FORGET: call without
 * await (`void vaultClipAsync(...)`). Dedup by source_url. Never throws.
 */
export async function vaultClipAsync(input: {
  sourceUrl: string
  provider?: 'pixabay' | 'pexels'
  query?: string
  tags?: string
  score?: number
  durationSec?: number
}): Promise<void> {
  try {
    if (process.env.ENABLE_CLIP_VAULT === 'false') return
    const admin = serviceClient()
    if (!admin) return

    // Dedup: already vaulted? Just bump the usage counter.
    const { data: existing } = await admin
      .from('clip_vault')
      .select('id, uses')
      .eq('source_url', input.sourceUrl)
      .maybeSingle()
    if (existing) {
      void admin
        .from('clip_vault')
        .update({ uses: ((existing as { uses?: number }).uses ?? 1) + 1 })
        .eq('id', (existing as { id: string }).id)
        .then(() => {})
      return
    }

    const res = await fetch(input.sourceUrl)
    if (!res.ok) {
      console.warn(`[clip-vault] download failed status=${res.status} url=${input.sourceUrl.slice(0, 60)}`)
      return
    }
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.byteLength > MAX_CLIP_BYTES) {
      console.log(`[clip-vault] skip oversize clip (${Math.round(buf.byteLength / 1e6)}MB)`)
      return
    }

    const path = `vault/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.mp4`
    const { error: upErr } = await admin.storage
      .from(VAULT_BUCKET)
      .upload(path, buf, { contentType: 'video/mp4', upsert: false })
    if (upErr) {
      console.warn('[clip-vault] upload failed:', upErr.message)
      return
    }

    const { data: pub } = admin.storage.from(VAULT_BUCKET).getPublicUrl(path)
    const storageUrl = pub?.publicUrl
    if (!storageUrl) return

    const { error: insErr } = await admin.from('clip_vault').insert({
      source_url: input.sourceUrl,
      provider: input.provider ?? 'pixabay',
      storage_url: storageUrl,
      query: (input.query ?? '').slice(0, 200),
      tags: (input.tags ?? '').toLowerCase().slice(0, 500),
      // ⚠️ KINEO-BUGHUNT-2026-08-08 — `clip_vault.score` é INTEGER e o ranker
      // manda FLOAT. Era `input.score ?? 0`, e o Postgres recusava a linha
      // inteira com `invalid input syntax for type integer: "17.484130859375"`.
      //
      // PROVA POR GRUPO DE CONTROLE, medida na tabela (não deduzida):
      //   · 346 clips de stock, o ÚLTIMO em 24/07 — e param exatamente ali;
      //   · os 346 têm 15 scores distintos, todos INTEIROS de 8 a 24, escritos
      //     antes de o re-ranker estético (PUSH #96) tornar o score fracionário;
      //   · os 6 clips escritos DEPOIS (01/08 a 07/08) são todos ai-hook, o
      //     único chamador que passa um literal inteiro (`score: 30`,
      //     lib/fastAiHook.ts). Mesmo código, mesma tabela, mesmo cliente: o que
      //     muda entre quem entra e quem não entra é só a casa decimal.
      //
      // O caminho do stock — o principal — está 100% morto há 15 dias, em
      // silêncio, num `console.warn` de um fire-and-forget. O custo não é o
      // registro perdido: é o COFRE QUE PAROU DE CRESCER. Sem vault quente,
      // `searchVault` erra, toda cena volta para a Pixabay, e a Pixabay em
      // 500/503 dentro de um orçamento de 120s é a origem medida dos 60 timeouts
      // de /api/generate-video-fast (17,8% das chamadas da rota) e das 41
      // pessoas que apertaram gerar e não receberam vídeo NEM aviso.
      //
      // Arredondar é seguro por construção: `score` só é usado para ORDENAR
      // (`.order('score')` e `score + matched` em searchVault) — nunca é
      // exibido, comparado por igualdade nem somado a dinheiro. As 346 linhas
      // vivas já são inteiras, então isto não cria uma escala nova.
      // `Number.isFinite` cobre NaN/Infinity (que voltariam a quebrar o insert)
      // e o clamp evita estourar o int4. NÃO é migração: mudar a coluna para
      // numeric exigiria autorização separada e não é necessário para ordenar.
      score: safeVaultScore(input.score),
      duration_sec: input.durationSec ?? null,
    })
    if (insErr) {
      console.warn('[clip-vault] index insert failed:', insErr.message)
      // O upload acontece ANTES do insert, então toda falha de índice deixava um
      // arquivo ÓRFÃO no bucket: ninguém o encontra (a busca só lê a tabela) e
      // ninguém o apaga. São 15 dias de clips de até 40MB pagos e inalcançáveis.
      // O `path` é único por chamada (timestamp + aleatório), então este delete
      // nunca alcança o arquivo de outra invocação — inclusive no caso legítimo
      // de corrida em que `source_url` (UNIQUE) rejeita a segunda gravação.
      await admin.storage.from(VAULT_BUCKET).remove([path]).catch(() => {})
      return
    }
    console.log(`[clip-vault] VAULTED ${Math.round(buf.byteLength / 1e6)}MB "${(input.query ?? '').slice(0, 40)}" → ${path}`)
  } catch (err) {
    console.warn('[clip-vault] vaulting threw (non-blocking):', err instanceof Error ? err.message : String(err))
  }
}
