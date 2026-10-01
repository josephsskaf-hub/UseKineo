// KINEO-ESPACOS-2026-09-30 — /spaces: fotos de um espaço vazio + o que vai dentro → o espaço pronto, em foto e em vídeo
// antes → depois (lib/spaces/spaces.ts tem o porquê). Interruptor SPACES_PUBLIC: aberto desde o lançamento (30/09).
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isAdsInternalEmail } from '@/lib/ads/access'
import { SPACES_PUBLIC, spacesVisibleFor } from '@/lib/spaces/spaces'
import SpacesClient from './SpacesClient'

export const metadata = { title: 'Spaces — Kineo' }
export const dynamic = 'force-dynamic'

export default async function SpacesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !spacesVisibleFor(SPACES_PUBLIC, isAdsInternalEmail(user.email))) notFound()
  return <SpacesClient />
}
