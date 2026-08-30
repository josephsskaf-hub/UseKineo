import { Suspense } from 'react'
import VideoClient from './VideoClient'

// sprint-ui #11 (2026-08-30) — titulo de aba proprio. Sem isto, a aba
// mostrava o title SEO da landing ('Kineo — AI YouTube Shorts Generator
// (Official Site)') em toda tela do produto sem metadata — cliente com 3
// abas abertas nao achava a certa. Padrao das telas irmas (Library/Studio).
export const metadata = { title: 'Video Studio — Kineo' }

export default function VideoPage() {
  return (
    <Suspense fallback={null}>
      <VideoClient />
    </Suspense>
  )
}
