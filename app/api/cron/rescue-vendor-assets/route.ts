// KINEO-RESGATE-FILME-DO-FORNECEDOR-2026-09-08 (madrugada-produto #7, M3)
//
// O DEFEITO, MEDIDO NO BANCO E SONDADO NA REDE EM 08/09 ~04:50 BRT:
//   1.681 filmes entregues. 1.549 moram no NOSSO bucket. **126 nunca saíram
//   do disco do fornecedor** (`f002.backblazeb2.com/file/creatomate-*`), que
//   é a área de retenção do Creatomate — e ela EXPIRA.
//   Sonda com Range 0-99 e controle no mesmo bucket (um nome que não existe
//   também devolve 404, então 404 aqui significa "sumiu", não "bloqueado"):
//     12/05 · 27/05 · 06/07 · 08/07 · 02/08 · 05/08 · 06/08 → 404
//     17/08 · 18 · 19 · 20 · 21 · 24 · 25 · 26 · 28 · 01/09 … 08/09 → 206
//   A fronteira está entre 06/08 e 17/08: retenção de ~30 dias.
//   Portanto, HOJE: **91 filmes de 30 pessoas já estão mortos** (o player
//   abre e não toca) e **35 filmes de 28 pessoas ainda vivem, com prazo** —
//   o mais antigo é de 17/08 02:04 e morre por volta de 17/09.
//
// POR QUE VAZOU, E POR QUE JUSTO ESSES: `persistRenderAssets` (lib/
// renderAssets.ts) baixa o MP4 do Creatomate com `downloadTimeoutMs: 25_000`
// e, em QUALQUER falha, devolve a URL do fornecedor sem reclamar — só um
// `console.warn` que expira junto com o log da Vercel. Um filme de 60s pesa
// 35-65 MB; 25s de orçamento pede ~20 Mbit/s sustentados. Quem estoura o
// prazo é o arquivo GRANDE. Medido desde 01/08, e o número é a assinatura da
// causa:
//     copiados para nós ... 1.035 filmes · média 48,3s · 24% têm ≥60s
//     ficaram no fornecedor .. 43 filmes · média 67,0s · **88% têm ≥60s**
//   Ou seja: o vazamento cai exatamente sobre o filme que a casa MANDA todo
//   mundo fazer (regra fixa dos 60s+ do TikTok Creator Rewards).
//
// O QUE ESTA ROTA FAZ: passa nos filmes que ainda estão no fornecedor, do
// MAIS ANTIGO para o mais novo (a fila é por prazo de morte, não por
// tamanho), confere se o arquivo ainda existe, copia para o nosso bucket e
// repõe o `video_url`. Sem pessoa esperando do outro lado, o orçamento de
// download pode ser grande — é a diferença que faz este caminho funcionar
// onde o do `/api/compose/status` (maxDuration 60, com o cliente em espera)
// não podia.
//
// O QUE ELA NÃO FAZ, DE PROPÓSITO:
//   · não apaga nada, em lugar nenhum (a URL antiga vai inteira para o
//     evento, então o passo é reversível à mão);
//   · não troca o `video_url` sem antes CONFERIR que o arquivo novo existe no
//     nosso bucket e tem o mesmo tamanho do que foi baixado — repontar para
//     um objeto quebrado seria trocar um filme que morre em setembro por um
//     filme que morreu agora;
//   · não gera, não recompõe e não cobra nada: nenhum crédito é tocado.
//
// O filme já morto não tem resgate (a fonte não existe mais). O que esta rota
// faz por ele é PARAR DE FINGIR: carimba `vendor_asset_expired` uma vez, com
// o dono e a data, para que a próxima rotação saiba exatamente de quem é o
// prejuízo e possa avisar a pessoa — hoje ninguém sabe.
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const RENDER_BUCKET = 'renders'

/** Quantos filmes no máximo por rodada. O teto real é o relógio (abaixo);
 *  este é o cinto de segurança contra uma fila inesperadamente longa. */
const MAX_PER_RUN = 6
/** Orçamento de parede da rodada. `maxDuration` é 300s; paramos bem antes
 *  para que o resumo sempre chegue a ser escrito. */
const WALL_BUDGET_MS = 240_000
/** Sem ninguém esperando, um filme de 65 MB cabe com folga. */
const DOWNLOAD_TIMEOUT_MS = 120_000
const HEAD_TIMEOUT_MS = 15_000

const RESCUED_EVENT = 'vendor_asset_rescued'
const EXPIRED_EVENT = 'vendor_asset_expired'
const FAILED_EVENT = 'vendor_asset_rescue_failed'

// Fail-closed cron auth (KINEO-CRON-FAILCLOSED-2026-07-27 pattern).
function isAuthorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  const auth = req.headers.get('authorization')
  return auth === `Bearer ${cronSecret}`
}

/**
 * "Mora no disco de outra pessoa" — a definição é por EXCLUSÃO do nosso
 * próprio storage, não por lista de fornecedores conhecidos. Um fornecedor
 * novo amanhã cai nesta rede sem que ninguém precise lembrar de somá-lo.
 */
export function isVendorHostedUrl(url: string | null | undefined, ownStorageOrigin: string): boolean {
  if (typeof url !== 'string') return false
  const trimmed = url.trim()
  if (!trimmed.startsWith('http')) return false
  if (!ownStorageOrigin) return false
  return !trimmed.startsWith(ownStorageOrigin)
}

interface VendorRow {
  id: string
  user_id: string | null
  render_id: string | null
  video_url: string | null
  created_at: string
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'supabase env missing' }, { status: 500 })
  }

  // `?dry=1` olha e não escreve. O padrão é AGIR: cron que nasce em dry-run
  // é cron que dorme para sempre (foi o que aconteceu com send-failure-
  // recovery e send-momentum-nudge, 30 dias parados por falta de
  // `?confirm=SEND` no vercel.json — CLAUDE.md, 01/09).
  const dryRun = req.nextUrl.searchParams.get('dry') === '1'

  const admin = createAdminClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const ownStorageOrigin = `${supabaseUrl.replace(/\/+$/, '')}/storage/v1/object/public/`

  const { data: rows, error } = await admin
    .from('videos')
    .select('id, user_id, render_id, video_url, created_at')
    .eq('status', 'completed')
    .not('video_url', 'is', null)
    .order('created_at', { ascending: true })
    .limit(1000)

  if (error) {
    console.error('[rescue-vendor-assets] query error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const all = (rows ?? []) as VendorRow[]
  const pending = all.filter((r) => isVendorHostedUrl(r.video_url, ownStorageOrigin))

  // Quem já foi carimbado como expirado não volta para a fila: a fonte não
  // ressuscita, e recontar o mesmo prejuízo todo dia é ruído.
  const { data: stamped } = await admin
    .from('events')
    .select('metadata')
    .in('name', [EXPIRED_EVENT, RESCUED_EVENT])
    .limit(1000)
  const alreadySeen = new Set<string>()
  for (const row of (stamped ?? []) as { metadata: unknown }[]) {
    const md = row.metadata as { video_id?: unknown } | null
    if (md && typeof md.video_id === 'string') alreadySeen.add(md.video_id)
  }

  const queue = pending.filter((r) => !alreadySeen.has(r.id))

  const startedAt = Date.now()
  let rescued = 0
  let expired = 0
  let failed = 0
  const detail: { video_id: string; outcome: string; bytes?: number; http?: number }[] = []

  for (const row of queue) {
    if (rescued + expired + failed >= MAX_PER_RUN) break
    if (Date.now() - startedAt > WALL_BUDGET_MS) break

    const sourceUrl = (row.video_url ?? '').trim()
    const owner = row.user_id
    const key = row.render_id && row.render_id.trim() ? row.render_id.trim() : row.id

    // 1) A fonte ainda existe? Range de 100 bytes é mais barato e mais
    //    honesto que HEAD: alguns CDNs respondem HEAD de um arquivo que já
    //    não serve GET.
    let sourceAlive = false
    let sourceStatus = 0
    try {
      const probe = await fetch(sourceUrl, {
        headers: { Range: 'bytes=0-99' },
        signal: AbortSignal.timeout(HEAD_TIMEOUT_MS),
      })
      sourceStatus = probe.status
      sourceAlive = probe.ok
      try { await probe.arrayBuffer() } catch { /* corpo descartado */ }
    } catch (e) {
      console.warn('[rescue-vendor-assets] probe threw:', e instanceof Error ? e.message : String(e))
    }

    if (!sourceAlive) {
      expired += 1
      detail.push({ video_id: row.id, outcome: 'expired', http: sourceStatus })
      if (!dryRun) {
        try {
          await admin.from('events').insert({
            user_id: owner,
            name: EXPIRED_EVENT,
            path: '/api/cron/rescue-vendor-assets',
            metadata: {
              video_id: row.id,
              vendor_url: sourceUrl,
              http: sourceStatus,
              created_at: row.created_at,
            },
          })
        } catch { /* carimbo é best-effort */ }
      }
      continue
    }

    // 2) Baixar. Aqui está a diferença de orçamento: sem ninguém esperando,
    //    o filme grande cabe.
    let buffer: ArrayBuffer | null = null
    try {
      const res = await fetch(sourceUrl, { signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS) })
      if (res.ok) buffer = await res.arrayBuffer()
      else sourceStatus = res.status
    } catch (e) {
      console.warn('[rescue-vendor-assets] download threw:', e instanceof Error ? e.message : String(e))
    }

    if (!buffer || buffer.byteLength === 0) {
      failed += 1
      detail.push({ video_id: row.id, outcome: 'download_failed', http: sourceStatus })
      if (!dryRun) {
        try {
          await admin.from('events').insert({
            user_id: owner,
            name: FAILED_EVENT,
            path: '/api/cron/rescue-vendor-assets',
            metadata: { video_id: row.id, vendor_url: sourceUrl, stage: 'download', http: sourceStatus },
          })
        } catch { /* best-effort */ }
      }
      continue
    }

    const downloadedBytes = buffer.byteLength

    if (dryRun) {
      rescued += 1
      detail.push({ video_id: row.id, outcome: 'would_rescue', bytes: downloadedBytes })
      continue
    }

    // 3) Subir para o nosso bucket, no MESMO esquema de caminho que o
    //    caminho vivo usa (`userId/renderId.mp4`), para que os dois nunca
    //    briguem pelo mesmo objeto com nomes diferentes.
    const path = `${owner ?? 'sem-dono'}/${key}.mp4`
    const { error: upErr } = await admin.storage
      .from(RENDER_BUCKET)
      .upload(path, buffer, { contentType: 'video/mp4', upsert: true })
    if (upErr) {
      failed += 1
      detail.push({ video_id: row.id, outcome: 'upload_failed' })
      try {
        await admin.from('events').insert({
          user_id: owner,
          name: FAILED_EVENT,
          path: '/api/cron/rescue-vendor-assets',
          metadata: { video_id: row.id, vendor_url: sourceUrl, stage: 'upload', error: upErr.message },
        })
      } catch { /* best-effort */ }
      continue
    }

    const { data: pub } = admin.storage.from(RENDER_BUCKET).getPublicUrl(path)
    const newUrl = pub.publicUrl

    // 4) A TRAVA QUE IMPORTA: só reponta depois de PROVAR que o arquivo novo
    //    existe e tem o tamanho certo. Trocar a URL às cegas transformaria um
    //    filme com prazo num filme quebrado agora.
    let verifiedBytes = -1
    try {
      const check = await fetch(newUrl, { method: 'HEAD', signal: AbortSignal.timeout(HEAD_TIMEOUT_MS) })
      if (check.ok) verifiedBytes = Number(check.headers.get('content-length') ?? '-1')
    } catch (e) {
      console.warn('[rescue-vendor-assets] verify threw:', e instanceof Error ? e.message : String(e))
    }

    if (verifiedBytes !== downloadedBytes) {
      failed += 1
      detail.push({ video_id: row.id, outcome: 'verify_failed', bytes: downloadedBytes })
      try {
        await admin.from('events').insert({
          user_id: owner,
          name: FAILED_EVENT,
          path: '/api/cron/rescue-vendor-assets',
          metadata: {
            video_id: row.id,
            vendor_url: sourceUrl,
            stage: 'verify',
            downloaded_bytes: downloadedBytes,
            verified_bytes: verifiedBytes,
          },
        })
      } catch { /* best-effort */ }
      continue
    }

    const { error: updErr } = await admin
      .from('videos')
      .update({ video_url: newUrl })
      .eq('id', row.id)

    if (updErr) {
      failed += 1
      detail.push({ video_id: row.id, outcome: 'update_failed' })
      try {
        await admin.from('events').insert({
          user_id: owner,
          name: FAILED_EVENT,
          path: '/api/cron/rescue-vendor-assets',
          metadata: { video_id: row.id, vendor_url: sourceUrl, stage: 'update', error: updErr.message },
        })
      } catch { /* best-effort */ }
      continue
    }

    rescued += 1
    detail.push({ video_id: row.id, outcome: 'rescued', bytes: downloadedBytes })
    try {
      await admin.from('events').insert({
        user_id: owner,
        name: RESCUED_EVENT,
        path: '/api/cron/rescue-vendor-assets',
        metadata: {
          video_id: row.id,
          // A URL antiga fica inteira aqui: o passo é desfazível à mão.
          vendor_url: sourceUrl,
          new_url: newUrl,
          bytes: downloadedBytes,
          created_at: row.created_at,
        },
      })
    } catch { /* best-effort */ }
  }

  const body = {
    ok: true,
    dry_run: dryRun,
    // Denominador junto do resultado: "resgatei 3" sem "de 35" não diz nada.
    vendor_hosted_total: pending.length,
    queue_length: queue.length,
    rescued,
    expired,
    failed,
    elapsed_ms: Date.now() - startedAt,
    detail,
  }
  console.log('[rescue-vendor-assets]', JSON.stringify(body))
  return NextResponse.json(body)
}
