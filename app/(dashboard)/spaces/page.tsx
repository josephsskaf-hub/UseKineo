// KINEO-ESPACOS-2026-09-30 — /spaces: fotos de um espaço vazio + o que vai dentro → o espaço pronto, em foto e em vídeo
// antes → depois (lib/spaces/spaces.ts tem o porquê). Interruptor SPACES_PUBLIC: aberto desde o lançamento (30/09).
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isAdsInternalEmail } from '@/lib/ads/access'
import { SPACES_MULTI_PUBLIC, SPACES_PUBLIC, spacesVisibleFor } from '@/lib/spaces/spaces'
import SpacesClient from './SpacesClient'
import SpacesMultiClient from './SpacesMultiClient' // KINEO-NUVEM-A5-2026-10-02

export const metadata = { title: 'Spaces — Kineo' }
export const dynamic = 'force-dynamic'

export default async function SpacesPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !spacesVisibleFor(SPACES_PUBLIC, isAdsInternalEmail(user.email))) notFound()
  // KINEO-NUVEM-A5-2026-10-02 — "vários destinos" (?mode=multi) só com SPACES_MULTI_PUBLIC ou conta da casa; fora disso, o
  // Espaços de sempre (o link nem aparece).
  const multiAllowed = spacesVisibleFor(SPACES_MULTI_PUBLIC, isAdsInternalEmail(user.email))
  if (multiAllowed && searchParams?.mode === 'multi') return <SpacesMultiClient />
  return <SpacesClient multiAllowed={multiAllowed} />
}
