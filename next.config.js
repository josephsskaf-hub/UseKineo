// KINEO-CHECKOUT-TRIAGE-2026-07-25 — /vs/ reverse-order aliases.
//
// The canonical comparison slug puts the two tool slugs in alphabetical order,
// so there is exactly one indexable URL per pair. The reverse order is a real
// URL people type and link, and it used to resolve to a static pointer stub
// (app/vs/[pair]/page.tsx) carrying a zero-delay meta refresh + rel=canonical +
// noindex. That stub exists because redirect() is provably broken inside a
// prerendered App Router page on Next 14.2.5 (the export writes status 307 with
// no Location header). next.config.js has no such limitation: these are real
// 308s emitted at the edge, before any page is served.
//
// Kept in sync by hand with CANONICAL_SLUGS in lib/comparisons.ts. This file is
// CommonJS and cannot import that TypeScript module, so the list is duplicated
// here deliberately; reverseSlug below is the same transform as the exported
// one. If a pair is added to lib/comparisons.ts, add its slug here too — the
// page stub still catches anything missed, so a stale list degrades to the old
// behaviour rather than to a 404.
const VS_CANONICAL_SLUGS = [
  'heygen-vs-synthesia',
  'opus-clip-vs-submagic',
  'captions-vs-submagic',
  'descript-vs-opus-clip',
  'klap-vs-opus-clip',
  'opus-clip-vs-quso',
  'creatify-vs-heygen',
  'pictory-vs-submagic',
  'heygen-vs-kineo',
  'kineo-vs-opus-clip',
  'kineo-vs-pictory',
  'kineo-vs-submagic',
]

function reverseSlug(slug) {
  const i = slug.indexOf('-vs-')
  if (i === -1) return slug
  return slug.slice(i + 4) + '-vs-' + slug.slice(0, i)
}

// alias -> canonical, skipping any palindrome and any alias that is itself a
// canonical slug (a redirect there would shadow a real article).
const VS_ALIAS_REDIRECTS = VS_CANONICAL_SLUGS.map((canonical) => ({
  alias: reverseSlug(canonical),
  canonical,
}))
  .filter(({ alias, canonical }) => alias !== canonical && !VS_CANONICAL_SLUGS.includes(alias))
  .map(({ alias, canonical }) => ({
    source: `/vs/${alias}`,
    destination: `/vs/${canonical}`,
    permanent: true,
  }))

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Push #92 — Core Web Vitals: remotePatterns was an empty array, which
  // disables remote image optimization entirely (every remote <Image> falls
  // back to unoptimized). Added the external hosts actually referenced by
  // <img>/<Image> in the app: the TAAFT "Featured on" badge on the homepage
  // (app/KineoLanding.tsx) and Supabase Storage public URLs used for avatar
  // photos and render assets (lib/videoCache.ts, lib/renderAssets.ts,
  // app/api/generate-avatar, app/api/gesture-clip, app/api/avatar/scene).
  // formats adds AVIF/WebP negotiation for anything that does go through
  // next/image.
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'media.theresanaiforthat.com',
      },
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  async redirects() {
    return [
      // PUSH #34 — the strongest stale branded-search result still points to
      // /auth.html?mode=signup. The old catch-all sent that signup intent to
      // /login, adding a needless dead end for traffic we already earned.
      // Query values not consumed by the rule (prompt, plan, redirect, etc.)
      // are preserved by Next.js, so old campaign/bookmark links keep working.
      {
        source: '/auth.html',
        has: [{ type: 'query', key: 'mode', value: '(?<legacySignup>signup|register)' }],
        destination: '/signup?intent_campaign=push34_legacy_auth',
        permanent: true,
      },
      { source: '/auth.html', destination: '/login', permanent: true },
      // Retire the remaining paths from the pre-Next static site. These are
      // exact compatibility redirects, not indexable duplicate pages.
      { source: '/signup.html', destination: '/signup?intent_campaign=push34_legacy_auth', permanent: true },
      { source: '/login.html', destination: '/login', permanent: true },
      { source: '/dashboard.html', destination: '/dashboard', permanent: true },
      { source: '/generate.html', destination: '/generate', permanent: true },
      { source: '/pricing.html', destination: '/pricing', permanent: true },
      { source: '/history.html', destination: '/history', permanent: true },
      { source: '/index.html', destination: '/', permanent: true },
      // KINEO-RECOVERY-2026-07-15 — retire the stale campaign page at the
      // edge. A config redirect produces a real HTTP Location header even
      // when /start was previously statically generated.
      { source: '/start', destination: '/signup?utm_source=start', permanent: true },
      // Retire the stale public founding offer without touching legacy buyer
      // entitlements or private checkout handling.
      { source: '/founding', destination: '/pricing', permanent: true },
      // Push #116 — legacy short alias for the thumbnail tool. The
      // sidebar + footer + every internal link uses /thumbnail-generator,
      // but a few external pings still hit /thumbnail.
      { source: '/thumbnail', destination: '/thumbnail-generator', permanent: true },
      // Compatibility for the plural path observed in production. This was a
      // real 404, not an entitlement or credit failure.
      { source: '/thumbnails', destination: '/thumbnail-generator', permanent: true },
      // Vidyo.ai became Quso.ai. Keep the established Quso comparison as the
      // single canonical instead of creating duplicate legacy-name pages.
      { source: '/alternatives/vidyo', destination: '/alternatives/quso', permanent: true },
      { source: '/alternatives/vidyo-ai', destination: '/alternatives/quso', permanent: true },
      // 02/08 ordem C (AEO): a rota exact-match do spec aponta para a
      // ferramenta que JÁ existe e já está no sitemap (Regra Zero — não criar
      // página duplicada). 308 real captura a busca sem diluir crawl budget.
      { source: '/youtube-shorts-script-generator', destination: '/free-script-generator', permanent: true },
      { source: '/youtube-short-script-generator', destination: '/free-script-generator', permanent: true },
      // Reverse-order /vs/ aliases → the single canonical comparison URL, as
      // real 308s. See VS_ALIAS_REDIRECTS at the top of this file. Appended
      // last so nothing above changes behaviour.
      ...VS_ALIAS_REDIRECTS,
    ]
  },
}

module.exports = nextConfig
