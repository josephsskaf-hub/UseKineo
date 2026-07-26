import type { MetadataRoute } from 'next'
import { NICHE_SLUGS } from './free-ai-shorts/[niche]/page'
import { COMPETITOR_SLUGS } from './alternatives/[competitor]/page'
import { PUBLIC_EXAMPLES } from '@/lib/publicExamples'
import { CANONICAL_SLUGS } from '@/lib/comparisons'

// #458 — SEO: sitemap so Google can discover and index every public page.
// The site had none, so search engines were barely crawling it — free organic
// traffic left on the table. Canonical domain = the live www host.
const BASE = 'https://www.usekineo.com'
// Advance this only when the public acquisition cluster materially changes.
// Using the request time for every URL makes lastModified meaningless.
const LAST_MODIFIED = new Date('2026-07-25T12:00:00.000Z')

export default function sitemap(): MetadataRoute.Sitemap {
  const routes: { path: string; priority: number; freq: 'daily' | 'weekly' | 'monthly' }[] = [
    { path: '', priority: 1.0, freq: 'daily' },
    { path: '/pricing', priority: 0.9, freq: 'weekly' },
    { path: '/viral-now', priority: 0.9, freq: 'daily' },
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
    { path: '/faceless-channel-ideas', priority: 0.8, freq: 'weekly' },
    { path: '/free-ai-shorts-generator', priority: 0.9, freq: 'weekly' },
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
    { path: '/terms', priority: 0.2, freq: 'monthly' },
    { path: '/privacy', priority: 0.2, freq: 'monthly' },
  ]
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
  return [...staticEntries, ...nicheEntries, ...altEntries, ...exampleEntries, ...vsEntries]
}
