import { Suspense } from 'react'
import CreateClient from './CreateClient'

// sprint-ui #11 (2026-08-30) — titulo de aba proprio. Sem isto, a aba
// mostrava o title SEO da landing ('Kineo — AI YouTube Shorts Generator
// (Official Site)') em toda tela do produto sem metadata — cliente com 3
// abas abertas nao achava a certa. Padrao das telas irmas (Library/Studio).
export const metadata = { title: 'Create — Kineo' }

export default function CreatePage() {
  return (
    <Suspense fallback={null}>
      <CreateClient />
    </Suspense>
  )
}
