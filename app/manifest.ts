import type { MetadataRoute } from 'next'

type KineoManifest = Omit<MetadataRoute.Manifest, 'share_target'> & {
  share_target: {
    action: string
    method: 'POST'
    enctype: 'application/x-www-form-urlencoded'
    params: { title: string; text: string; url: string }
  }
}

// Push #422 — PWA manifest. Makes usekineo.com installable on
// iPhone/Android ("Add to Home Screen"): full-screen standalone window,
// branded icon and splash colors. Next.js serves this at
// /manifest.webmanifest and auto-injects the <link> tag site-wide.
export default function manifest(): KineoManifest {
  return {
    name: 'Kineo — AI YouTube Shorts Generator',
    short_name: 'Kineo',
    description:
      'Turn any topic into a finished YouTube Short, usually in 3–7 minutes. AI writes the script, finds footage, adds voiceover & captions.',
    id: '/',
    start_url: '/studio', // KINEO-SEM-PORTEIRO-2026-09-03 c — o app instalado abria no porteiro
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0d0d14',
    theme_color: '#0d0d14',
    categories: ['productivity', 'video'],
    // GROWTH 03/09/2026 — an installed Kineo becomes an Android/Chromium
    // share-sheet destination. POST keeps the shared text out of URLs,
    // referrers and request history; /share-to-kineo stores it for one
    // same-tab handoff and opens the existing free script tool.
    share_target: {
      action: '/share-to-kineo',
      method: 'POST',
      enctype: 'application/x-www-form-urlencoded',
      params: { title: 'title', text: 'text', url: 'url' },
    },
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      {
        src: '/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
