// KINEO-ESPACOS-2026-09-30 — /spaces: fotos de um espaço vazio + o que vai dentro → o espaço pronto, em foto e em vídeo
// antes → depois (lib/spaces/spaces.ts tem o porquê). Interruptor SPACES_PUBLIC: aberto desde o lançamento (30/09).
// KINEO-SPACES-VISITANTE-2026-10-08 — visitante sem login vai para o cadastro e volta ao /spaces, com as UTMs da visita
// (lib/spaces/visitorRedirect.ts tem o porquê). Antes ele recebia 404. Logado sem permissão continua no 404.
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isAdsInternalEmail } from '@/lib/ads/access'
import { SPACES_PUBLIC, spacesVisibleFor } from '@/lib/spaces/spaces'
import { spacesSignupHref } from '@/lib/spaces/visitorRedirect'
import SpacesClient from './SpacesClient'

export const metadata = { title: 'Spaces — Kineo' }
export const dynamic = 'force-dynamic'

export default async function SpacesPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(spacesSignupHref(searchParams))
  if (!spacesVisibleFor(SPACES_PUBLIC, isAdsInternalEmail(user.email))) notFound()
  return <SpacesClient />
}
