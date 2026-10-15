import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import {
  INDEXNOW_HOST,
  INDEXNOW_KEY_LOCATION,
  INDEXNOW_ORIGIN,
  INDEXNOW_SNAPSHOT_EVENT,
  INDEXNOW_SUBMITTED_EVENT,
  changedSinceSnapshot,
  nextSnapshot,
  parseSitemapXml,
  remainingDailyBudget,
  submitToIndexNow,
  type IndexNowEntry,
  type IndexNowSnapshot,
} from '@/lib/indexnow'
import { listIndexablePublicVideos, PUBLIC_BASE_URL } from '@/lib/publicVideos'

// submit-indexnow — [KINEO-SEO-VIDEO-PAGES-2026-08-11]
//
// ── O BURACO QUE ESTE CRON FECHA ────────────────────────────────────────────
// Medido em produção em 11/08/2026:
//   /sitemap.xml ......... 164 URLs, ZERO `/v/…`
//   /video-sitemap.xml ... 650 URLs, 644 delas `/v/…`
//   scripts/submit-indexnow.mjs lê APENAS /sitemap.xml
// Conclusão: as 644 páginas públicas de vídeo nunca foram submetidas ao
// IndexNow — nem uma vez — e o único caminho que existia era um humano rodar
// `npm run seo:indexnow:submit` de memória.
//
// O produto gera ~170 vídeos novos por SEMANA sozinho. Um pipeline de
// indexação que depende de alguém lembrar não escala com uso; este cron sim.
//
// Por que IndexNow e não "esperar o Google": o Google ignora o protocolo, mas
// o Bing age em horas — e o Bing é o índice por trás da busca do ChatGPT, a
// fonte de aquisição que mais converte segundo as medições do próprio produto.
// Google mandou ZERO eventos em 7 dias contra 2.131 sessões; apostar tudo nele
// seria apostar na fonte que não entregou.
//
// ── O QUE ELE SUBMETE ───────────────────────────────────────────────────────
// Só páginas que JÁ passaram no portão de qualidade de lib/publicVideos.ts —
// as mesmas que entram no video-sitemap. Nunca uma página `noindex`: pedir ao
// Bing para rastrear algo que manda `noindex` é queimar orçamento de crawl e
// confiança. Somente as publicadas na janela recente (LOOKBACK_DAYS), porque
// re-submeter 644 URLs inalteradas todo dia é spam, e o protocolo pede que se
// submeta o que MUDOU.
//
// ── SEGURANÇA / RISCO ───────────────────────────────────────────────────────
// - Auth fail-closed com CRON_SECRET (padrão KINEO-CRON-FAILCLOSED-2026-07-27):
//   sem o segredo no ambiente, o endpoint responde 401 e não faz nada.
// - Não toca em preço, crédito, entitlement, e-mail nem em qualquer linha do
//   banco. É read-only no Supabase e um POST para uma API pública.
// - `?dry=1` (ou KINEO_INDEXNOW_DISABLED=true) monta e valida a carga sem
//   enviar, exercitando o MESMO caminho de código.
export const dynamic = 'force-dynamic'
// ═══ KINEO-DATA-CACHE-2026-09-02 (sprint-assinaturas #17) ═══════════════════
// Rota SO-GET no Next 14.2: sem POST no modulo, o store nasce com
// revalidate=false, e `dynamic='force-dynamic'` NAO muda isso (so pula o proxy
// que marcaria a rota como dinamica). Resultado: todo GET do supabase-js (e da
// fal/Creatomate) com URL estavel ia para o Data Cache da Vercel PARA SEMPRE —
// a rota lia o banco como ele estava na PRIMEIRA vez que aquela URL foi pedida.
// Provado em producao 02/09: cron de resgate contando 1 tentativa com 3 no
// banco, marcador stranded_composed invisivel 13 min depois de gravado,
// "claim row missing" logo apos 23505 no MESMO id, e-mail de video pronto
// repetido 15 min depois (be9c6314). Esta linha e o unico interruptor que
// zera o revalidate ANTES do primeiro fetch. Nao remover.
export const fetchCache = 'force-no-store'
export const maxDuration = 60

/**
 * Janela dos VÍDEOS. O cron rodava 1×/dia; hoje roda de hora em hora e o retrato evita reenvio, mas a janela continua:
 * só vídeo publicado nos últimos dias é candidato (o protocolo pede que se submeta o que MUDOU).
 */
const LOOKBACK_DAYS = 3

/** Teto de segurança por execução, bem abaixo do limite de 10.000 do protocolo. */
const MAX_URLS_PER_RUN = 500

/**
 * Hubs que mudam TODA vez que um vídeo novo entra na biblioteca: a listagem
 * deles é outra. São 2 URLs, não movem a agulha do limite, e sem elas o Bing
 * revisita a lista pelo caminho lento.
 */
const HUB_PATHS = ['/scripts', '/wall'] as const

// Fail-closed cron auth (KINEO-CRON-FAILCLOSED-2026-07-27).
function isAuthorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  return req.headers.get('authorization') === `Bearer ${cronSecret}`
}

// ═══ KINEO-BING-SEO-1510 ═══════════════════════════════════════════════════
// O Bing mostrou o último envio em 13/10 e nada depois (causa em lib/indexnow.ts, bloco KINEO-BING-SEO-1510): este cron
// só enviava páginas de VÍDEO publicadas nos últimos 3 dias — e não há nenhuma desde 30/09 — enquanto as páginas de SEO
// só iam ao Bing por ping manual. Agora:
//   · ENSAIO POR PADRÃO: sem `?confirm=SEND` nada é enviado nem gravado (o vercel.json agenda COM o token; o guardião
//     scripts/test-cron-dryrun-eterno.mjs confere). `?dry=1` e KINEO_INDEXNOW_DISABLED=true continuam forçando o ensaio;
//   · roda de hora em hora e envia o que MUDOU desde o último envio real: <lastmod> do /sitemap.xml publicado + vídeos
//     consentidos, comparados com o retrato gravado em `events` (INDEXNOW_SNAPSHOT_EVENT). Um deploy de produção que muda o
//     lastmod de uma página chega ao Bing na primeira execução depois dele;
//   · teto de 24 h (INDEXNOW_DAILY_URL_CAP) somando os envios reais registrados (INDEXNOW_SUBMITTED_EVENT); o que não coube
//     fica fora do retrato e sai na execução seguinte;
//   · banco ou sitemap fora do ar ⇒ a execução segue com o que tem e nunca derruba nada (200 com o motivo).

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createAdminClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}
type Admin = NonNullable<ReturnType<typeof adminClient>>

async function readSnapshot(admin: Admin | null): Promise<IndexNowSnapshot | null> {
  if (!admin) return null
  try {
    const { data, error } = await admin
      .from('events')
      .select('metadata, created_at')
      .eq('name', INDEXNOW_SNAPSHOT_EVENT)
      .order('created_at', { ascending: false })
      .limit(1)
    if (error || !data || data.length === 0) return null
    const snap = (data[0] as { metadata?: { snapshot?: unknown } }).metadata?.snapshot
    return snap && typeof snap === 'object' ? (snap as IndexNowSnapshot) : null
  } catch {
    return null
  }
}

async function readSentLast24h(admin: Admin | null): Promise<number> {
  if (!admin) return 0
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data, error } = await admin
      .from('events')
      .select('metadata, created_at')
      .eq('name', INDEXNOW_SUBMITTED_EVENT)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(200)
    if (error || !data) return 0
    return (data as { metadata?: { submitted?: unknown } }[]).reduce((n, r) => n + (Number(r.metadata?.submitted) || 0), 0)
  } catch {
    return 0
  }
}

async function fetchPublishedSitemap(): Promise<{ entries: IndexNowEntry[]; error: string | null }> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15_000)
  try {
    const res = await fetch(`${INDEXNOW_ORIGIN}/sitemap.xml`, { cache: 'no-store', signal: controller.signal, headers: { 'user-agent': 'Kineo-IndexNow/1.0' } })
    if (!res.ok) return { entries: [], error: `sitemap HTTP ${res.status}` }
    return { entries: parseSitemapXml(await res.text()), error: null }
  } catch (err) {
    return { entries: [], error: err instanceof Error ? err.message : 'sitemap fetch failed' }
  } finally {
    clearTimeout(timer)
  }
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  // KINEO-BING-SEO-1510 — escrita só com o token; sem ele, ensaio (nada enviado, nada gravado).
  const confirmed = req.nextUrl.searchParams.get('confirm') === 'SEND'
  const dryRun =
    !confirmed ||
    req.nextUrl.searchParams.get('dry') === '1' ||
    process.env.KINEO_INDEXNOW_DISABLED === 'true'

  const now = Date.now()
  const cutoff = now - LOOKBACK_DAYS * 24 * 60 * 60 * 1000

  // `listIndexablePublicVideos()` é a MESMA função que alimenta o
  // video-sitemap: portão de qualidade, deduplicação por transcrição e por
  // título, tudo já aplicado. Ela nunca lança — sem Supabase devolve [].
  let videoEntries: IndexNowEntry[] = []
  let scanned = 0
  try {
    const videos = await listIndexablePublicVideos(MAX_URLS_PER_RUN * 4)
    scanned = videos.length
    videoEntries = videos
      .filter((v) => {
        const t = Date.parse(v.publishedAt)
        return Number.isFinite(t) && t >= cutoff
      })
      .slice(0, MAX_URLS_PER_RUN)
      .map((v) => ({ loc: v.pageUrl, lastmod: v.publishedAt }))
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[submit-indexnow] could not list public videos:', err)
    videoEntries = []
  }

  const sitemap = await fetchPublishedSitemap()
  if (sitemap.error) {
    // eslint-disable-next-line no-console
    console.error('[submit-indexnow] could not read the published sitemap:', sitemap.error)
  }

  const admin = adminClient()
  const [previous, sentLast24h] = await Promise.all([readSnapshot(admin), readSentLast24h(admin)])
  // Sitemap ANTES dos vídeos: com o teto mordendo, a página de SEO alterada no deploy tem a vez.
  const current: IndexNowEntry[] = [...sitemap.entries, ...videoEntries]
  const changed = changedSinceSnapshot(current, previous, now)
  const budget = Math.min(MAX_URLS_PER_RUN, remainingDailyBudget(sentLast24h))
  const videoSet = new Set(videoEntries.map((v) => v.loc))
  const changedVideos = changed.filter((u) => videoSet.has(u))
  const hubs = changedVideos.length > 0 ? HUB_PATHS.map((p) => `${PUBLIC_BASE_URL}${p}`) : []
  const toSend = [...changed, ...hubs].slice(0, budget)

  // Sem vídeo novo e sem lastmod alterado não há o que anunciar: no-op explícito.
  if (toSend.length === 0) {
    return NextResponse.json({
      ok: true,
      skipped: 'no new indexable videos in window',
      sitemap: sitemap.error ? `unreadable: ${sitemap.error}` : 'no lastmod changed since the last submission',
      changed: changed.length,
      budgetLeft24h: budget,
      firstRun: previous === null,
      dryRun,
      lookbackDays: LOOKBACK_DAYS,
      scanned,
      host: INDEXNOW_HOST,
    })
  }

  const result = await submitToIndexNow(toSend, { dryRun })

  if (!result.ok) {
    // eslint-disable-next-line no-console
    console.error('[submit-indexnow] submission failed:', result.reason)
    // 200 de propósito: a Vercel marca o cron como falho em não-2xx e passa a
    // alertar, e uma indisponibilidade momentânea da API do IndexNow não é um
    // incidente — o retrato não avança, então a próxima execução reenvia.
    return NextResponse.json({
      ok: false,
      error: result.reason,
      attempted: toSend.length,
      dryRun,
    })
  }

  // Só um envio REAL avança o retrato e conta no teto de 24 h.
  let recorded = false
  if (!dryRun && admin) {
    const sent = new Set(toSend)
    const snapshot = nextSnapshot(current, previous, changed, sent)
    try {
      const { error } = await admin.from('events').insert([
        {
          name: INDEXNOW_SUBMITTED_EVENT,
          path: '/api/cron/submit-indexnow',
          metadata: {
            submitted: result.submitted,
            http: result.httpStatus,
            sitemap_urls: toSend.filter((u) => !videoSet.has(u) && !hubs.includes(u)).length,
            video_urls: changedVideos.filter((u) => sent.has(u)).length,
            hubs: hubs.filter((u) => sent.has(u)).length,
            first_run: previous === null,
            urls: toSend.slice(0, 50),
          },
        },
        { name: INDEXNOW_SNAPSHOT_EVENT, path: '/api/cron/submit-indexnow', metadata: { snapshot, urls: Object.keys(snapshot).length } },
      ])
      recorded = !error
      // eslint-disable-next-line no-console
      if (error) console.error('[submit-indexnow] could not record the submission:', error.message)
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[submit-indexnow] could not record the submission:', err)
    }
  }

  return NextResponse.json({
    ok: true,
    dryRun,
    submitted: result.submitted,
    sitemapPages: toSend.filter((u) => !videoSet.has(u) && !hubs.includes(u)).length,
    videoPages: changedVideos.length,
    hubs: hubs.length,
    pendingOverCap: Math.max(0, changed.length + hubs.length - toSend.length),
    recorded,
    firstRun: previous === null,
    refused: result.skipped.length,
    lookbackDays: LOOKBACK_DAYS,
    scanned,
    host: INDEXNOW_HOST,
    keyLocation: INDEXNOW_KEY_LOCATION,
    urls: dryRun ? toSend.slice(0, 50) : undefined,
    ranAt: new Date().toISOString(),
  })
}
