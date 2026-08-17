import type { MetadataRoute } from 'next'
import { NICHE_SLUGS } from './free-ai-shorts/[niche]/page'
import { COMPETITOR_SLUGS } from './alternatives/[competitor]/page'
import { PUBLIC_EXAMPLES } from '@/lib/publicExamples'
import { CANONICAL_SLUGS } from '@/lib/comparisons'
import { SCRIPT_VERTICAL_SLUGS } from '@/lib/scriptLibrary'
// KINEO-ENGINE-SEO-2026-08-15 — cluster por MOTOR (hub + 5 páginas).
import { ENGINE_SLUGS } from './ai-video-generator/[engine]/page'

// #458 — SEO: sitemap so Google can discover and index every public page.
// The site had none, so search engines were barely crawling it — free organic
// traffic left on the table. Canonical domain = the live www host.
const BASE = 'https://www.usekineo.com'
// Advance this only when the public acquisition cluster materially changes.
// Using the request time for every URL makes lastModified meaningless.
//
// KINEO-ACQ-SPRINT-2026-07-29 — advanced from 2026-07-25. This is not a
// cosmetic bump; the cluster materially changed and the old date is now a lie
// that costs traffic.
//
// What changed: `site:usekineo.com` on 29/07 returns pages whose titles Google
// cached BEFORE the usekineo rename — "AI Avatar Studio — ShortsForgeAI",
// "From $11.90/mo". Neither string exists in this repo any more. The pages were
// fixed; Google simply has not re-crawled them. A frozen `lastModified` tells
// Google there is nothing new here, which is precisely the wrong signal when
// the whole problem is a stale cache. Search Console for the same day: 55
// indexed, 43 not, and 8 web-search clicks in the entire history of the site.
//
// `lastModified` is a hint, not a command — Google is free to ignore it. It is
// paired with an IndexNow submission (scripts/submit-indexnow.mjs), which Bing
// and Yandex DO act on quickly, and Bing is what backs ChatGPT search: the
// single best-converting acquisition source Kineo has measured (docs/growth,
// 23/07 — ChatGPT sent 4 signups and BOTH of the week's checkouts, Google sent
// 1 session and zero).
// KINEO-G1-2026-08-03 — advanced from 2026-07-29: new money-intent page
// (/make-money-clipping-with-ai) added to the cluster; paired with IndexNow.
// KINEO-ENGINE-SEO-2026-08-15 — advanced from 2026-08-03: the cluster gained
// six pages (/ai-video-generator hub + 5 engine pages). Same test the comment
// above sets — the cluster materially changed, so the old date is now a lie.
const LAST_MODIFIED = new Date('2026-08-15T13:00:00.000Z')

export default function sitemap(): MetadataRoute.Sitemap {
  const routes: { path: string; priority: number; freq: 'daily' | 'weekly' | 'monthly' }[] = [
    { path: '', priority: 1.0, freq: 'daily' },
    { path: '/pricing', priority: 0.9, freq: 'weekly' },
    { path: '/viral-now', priority: 0.9, freq: 'daily' },
    // KINEO-WALL-2026-08-03 — public proof board (Shorts users actually
    // published). Daily/0.9 like /viral-now: same profile — a page whose whole
    // value is that it changed since yesterday.
    { path: '/wall', priority: 0.9, freq: 'daily' },
    // KINEO-SCRIPT-LIBRARY-2026-08-03 — hub for the ~572 public /v/[id] script
    // pages that were orphaned (no hub, no internal links, 8 search clicks in
    // site history). The per-vertical shelves are appended below.
    { path: '/scripts', priority: 0.9, freq: 'daily' },
    // PUSH #92 — removed leftover `{ path: '/pt', priority: 0.9, freq:
    // 'weekly' }` entry: it contradicted the English-only decision recorded
    // in the comments below (KINEO-2026-07-25) — every other PT/ES sitemap
    // entry had already been pulled, this one was missed.
    { path: '/free-script-generator', priority: 0.8, freq: 'weekly' },
    { path: '/free-hook-generator', priority: 0.8, freq: 'weekly' },
    { path: '/viral-score', priority: 0.8, freq: 'weekly' },
    { path: '/ai-avatar', priority: 0.8, freq: 'weekly' },
    { path: '/partners', priority: 0.8, freq: 'weekly' },
    { path: '/youtube-shorts-from-topic', priority: 0.9, freq: 'weekly' },
    { path: '/text-to-video-shorts', priority: 0.9, freq: 'weekly' },
    { path: '/cheapest-ai-shorts-maker', priority: 0.8, freq: 'weekly' },
    { path: '/ai-shorts-without-filming', priority: 0.8, freq: 'weekly' },
    // KINEO-CEO-HOUR-2026-08-17 (#1) — captura de 'ai video upscaler/enhancer'
    { path: '/ai-video-upscaler', priority: 0.8, freq: 'weekly' },
    { path: '/faceless-channel-ideas', priority: 0.8, freq: 'weekly' },
    { path: '/free-ai-shorts-generator', priority: 0.9, freq: 'weekly' },
    // AQUISICAO 5 (14/08) — portas PT/ES da mesma ferramenta [KINEO-PORTAS-INTL-2026-08-14]
    { path: '/gerador-de-shorts-gratis', priority: 0.9, freq: 'weekly' },
    { path: '/generador-de-shorts-gratis', priority: 0.9, freq: 'weekly' },
    { path: '/faceless-video-generator', priority: 0.9, freq: 'weekly' },
    { path: '/free-ai-shorts', priority: 0.8, freq: 'weekly' },
    { path: '/alternatives', priority: 0.8, freq: 'weekly' },
    { path: '/examples', priority: 0.8, freq: 'weekly' },
    // AEO/GEO — citable fact sheet for AI answer engines (linked in public/llms.txt).
    { path: '/facts', priority: 0.7, freq: 'weekly' },
    // KINEO-ACQ5-2026-07-24 (PUSH #87) — English acquisition surfaces:
    // interactive tool, data study, embeddable widget.
    // KINEO-2026-07-25 — PT/ES clusters pulled from the sitemap: audience is
    // entirely outside Brazil, site is English-only (the /es + /pt page files
    // stay on disk but are no longer surfaced or indexed).
    { path: '/niche-picker', priority: 0.9, freq: 'weekly' },
    { path: '/state-of-ai-shorts-2026', priority: 0.8, freq: 'weekly' },
    { path: '/widget', priority: 0.7, freq: 'weekly' },
    // KINEO-SEO-SPRINT-2026-07-25 — high-demand money/monetization + roundup cluster.
    { path: '/best-ai-shorts-generators', priority: 0.9, freq: 'weekly' },
    { path: '/how-much-do-youtube-shorts-pay', priority: 0.9, freq: 'weekly' },
    { path: '/youtube-shorts-rpm-by-niche', priority: 0.9, freq: 'weekly' },
    { path: '/shorts-money-calculator', priority: 0.8, freq: 'weekly' },
    { path: '/can-you-monetize-ai-videos', priority: 0.8, freq: 'weekly' },
    { path: '/tiktok-vs-youtube-shorts-monetization', priority: 0.8, freq: 'weekly' },
    // PUSH #96 — keyword-gap cluster: two format pages, a broad pipeline hub and
    // the top-of-funnel entry point that feeds them. Priorities mirror comparable
    // existing entries: generator/hub pages at 0.9 (like /faceless-video-generator
    // and /how-much-do-youtube-shorts-pay), the informational guides at 0.8 (like
    // /faceless-channel-ideas and /can-you-monetize-ai-videos).
    { path: '/reddit-story-video-generator', priority: 0.9, freq: 'weekly' },
    { path: '/brainrot-video-generator', priority: 0.8, freq: 'weekly' },
    { path: '/youtube-automation', priority: 0.9, freq: 'weekly' },
    { path: '/how-to-start-a-faceless-youtube-channel', priority: 0.8, freq: 'weekly' },
    // KINEO-CASE-STUDY-2026-07-31 — pagina de PROVA (nao keyword fina): canal real no
    // Autopilot com numeros semanais, linkada do rodape da home. daily porque o conteudo
    // muda toda semana e queremos recrawl rapido.
    { path: '/youtube-automation-case-study', priority: 0.9, freq: 'daily' },
    // KINEO-G1-2026-08-03 (docs/PESQUISA-CONCORRENTES-2026-08-03.md) — EARN-angle
    // money-intent page: "make money clipping with AI" connects the pay-per-view
    // clipping economy to the pipeline. 0.9 like the other money pages.
    { path: '/make-money-clipping-with-ai', priority: 0.9, freq: 'weekly' },
    // KINEO-CHATGPT-INTENT-2026-08-10 (docs/SPRINT-2026-08-10.md, seção 3) —
    // `chatgpt` passou o `taaft` como maior canal EXTERNO de entrada (09/08:
    // 13 x 4), medido nas colunas de primeiro toque de `profiles`. Todo o
    // cluster existente fala com quem BUSCA um gerador; ninguém falava com
    // quem chega de dentro do ChatGPT já com um roteiro na mão. 0.9 como as
    // outras cabeças de cluster de intenção (/youtube-shorts-from-topic,
    // /text-to-video-shorts), não 0.8, porque é entrada de canal nº1.
    { path: '/chatgpt-to-youtube-shorts', priority: 0.9, freq: 'weekly' },
    // KINEO-ENGINE-SEO-2026-08-15 (docs/SPRINT-2026-08-15-10H.md, seção 5) —
    // desde 15/08 a home vende pelos NOMES dos motores e o site não tinha uma
    // única página mirando esses nomes, que são o cluster mais disputado da
    // categoria ("free AI video generator — Veo / Kling / Seedance"). O hub em
    // 0.9 como as outras cabeças de cluster de intenção; as 5 páginas de motor
    // são acrescentadas logo abaixo em 0.9 (são elas que casam com a busca).
    { path: '/ai-video-generator', priority: 0.9, freq: 'weekly' },
    { path: '/terms', priority: 0.2, freq: 'monthly' },
    { path: '/privacy', priority: 0.2, freq: 'monthly' },
  ]
  for (const slug of ENGINE_SLUGS) {
    routes.push({ path: `/ai-video-generator/${slug}`, priority: 0.9, freq: 'weekly' })
  }
  const staticEntries = routes.map((r) => ({
    url: `${BASE}${r.path}`,
    lastModified: LAST_MODIFIED,
    changeFrequency: r.freq,
    priority: r.priority,
  }))
  // #478 — programmatic SEO niche landing pages (/free-ai-shorts/[niche]).
  const nicheEntries = NICHE_SLUGS.map((slug) => ({
    url: `${BASE}/free-ai-shorts/${slug}`,
    lastModified: LAST_MODIFIED,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))
  // #482 — comparison / "X alternative" SEO pages (/alternatives/[competitor]).
  const altEntries = COMPETITOR_SLUGS.map((slug) => ({
    url: `${BASE}/alternatives/${slug}`,
    lastModified: slug === 'quso' ? '2026-07-21' : LAST_MODIFIED,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))
  // KINEO-2026-07-25 — Portuguese /pt/[slug] pages removed from the sitemap:
  // audience is entirely outside Brazil, site is English-only.
  const exampleEntries = PUBLIC_EXAMPLES.map((example) => ({
    url: `${BASE}/examples/${example.slug}`,
    lastModified: LAST_MODIFIED,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))
  // KINEO-VS-2026-07-26 — the /vs comparison cluster. Appended after every
  // existing block so nothing above is reordered. Only the CANONICAL slugs are
  // listed: the reverse-order aliases (/vs/submagic-vs-opus-clip) resolve and
  // forward to their canonical URL, but they are noindexed by design and must
  // never appear here.
  // Priority 0.8 matches /alternatives/[competitor], the closest existing
  // commercial-intent cluster; the hub gets 0.7, matching /facts and the
  // example pages rather than the 0.9 reserved for money-page heads.
  const vsEntries = [
    {
      url: `${BASE}/vs`,
      lastModified: LAST_MODIFIED,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    },
    ...CANONICAL_SLUGS.map((slug) => ({
      url: `${BASE}/vs/${slug}`,
      lastModified: LAST_MODIFIED,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ]
  // KINEO-SCRIPT-LIBRARY-2026-08-03 — one shelf per vertical. Kept synchronous
  // on purpose: making sitemap() async to count scripts per shelf would put a
  // Supabase round-trip on the sitemap's critical path. A shelf that is still
  // thin renders with robots:noindex of its own accord (the page decides), and
  // self-corrects the moment it clears the threshold — the sitemap listing it
  // early costs nothing, while a DB outage that empties the sitemap would.
  const scriptShelfEntries = SCRIPT_VERTICAL_SLUGS.map((slug) => ({
    url: `${BASE}/scripts/${slug}`,
    lastModified: LAST_MODIFIED,
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }))
  return [
    ...staticEntries,
    ...nicheEntries,
    ...altEntries,
    ...exampleEntries,
    ...vsEntries,
    ...scriptShelfEntries,
  ]
}
