import { NextRequest, NextResponse } from 'next/server'
import {
  INDEXNOW_HOST,
  INDEXNOW_KEY_LOCATION,
  submitToIndexNow,
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
export const maxDuration = 60

/**
 * Janela de submissão. O cron roda 1×/dia; 3 dias de folga garantem que uma
 * execução perdida (deploy, incidente da Vercel) não deixe um dia de vídeos
 * fora do fluxo para sempre. O custo de re-submeter uma URL já enviada é zero.
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

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  const dryRun =
    req.nextUrl.searchParams.get('dry') === '1' ||
    process.env.KINEO_INDEXNOW_DISABLED === 'true'

  const cutoff = Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000

  // `listIndexablePublicVideos()` é a MESMA função que alimenta o
  // video-sitemap: portão de qualidade, deduplicação por transcrição e por
  // título, tudo já aplicado. Ela nunca lança — sem Supabase devolve [].
  let recent: string[] = []
  let scanned = 0
  try {
    const videos = await listIndexablePublicVideos(MAX_URLS_PER_RUN * 4)
    scanned = videos.length
    recent = videos
      .filter((v) => {
        const t = Date.parse(v.publishedAt)
        return Number.isFinite(t) && t >= cutoff
      })
      .map((v) => v.pageUrl)
      .slice(0, MAX_URLS_PER_RUN)
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[submit-indexnow] could not list public videos:', err)
    recent = []
  }

  // Sem vídeo novo na janela não há o que anunciar. Submeter só os hubs todo
  // dia seria ruído, então a execução termina em no-op explícito.
  if (recent.length === 0) {
    return NextResponse.json({
      ok: true,
      skipped: 'no new indexable videos in window',
      lookbackDays: LOOKBACK_DAYS,
      scanned,
      host: INDEXNOW_HOST,
    })
  }

  const urls = [...recent, ...HUB_PATHS.map((p) => `${PUBLIC_BASE_URL}${p}`)]
  const result = await submitToIndexNow(urls, { dryRun })

  if (!result.ok) {
    // eslint-disable-next-line no-console
    console.error('[submit-indexnow] submission failed:', result.reason)
    // 200 de propósito: a Vercel marca o cron como falho em não-2xx e passa a
    // alertar, e uma indisponibilidade momentânea da API do IndexNow não é um
    // incidente — a próxima execução re-submete (a janela é de 3 dias).
    return NextResponse.json({
      ok: false,
      error: result.reason,
      attempted: urls.length,
      dryRun,
    })
  }

  return NextResponse.json({
    ok: true,
    dryRun,
    submitted: result.submitted,
    videoPages: recent.length,
    hubs: HUB_PATHS.length,
    refused: result.skipped.length,
    lookbackDays: LOOKBACK_DAYS,
    scanned,
    host: INDEXNOW_HOST,
    keyLocation: INDEXNOW_KEY_LOCATION,
    ranAt: new Date().toISOString(),
  })
}
