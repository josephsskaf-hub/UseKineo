import { notFound } from 'next/navigation'
import { recreateSession } from '@/lib/recreate/server'
import { RECREATE_FORMATS, recreateFormat, recreateCreditsFor } from '@/lib/recreate/formats' // KINEO-RECREATE-MOVIMENTO-1411 — era: recreateEffectCredits + recreateCreditCost
import { publicRecreateCatalog } from '@/lib/recreate/catalogPublic'
import { publicRecreatePath } from '@/lib/recreate/entry'
import { recreateFormatVisible, releaseVisible, visibleRecreateFormats } from '@/lib/recreate/access'
import { createShellVisible } from '@/lib/create/access'
import { SEU_VIDEO_RELEASE } from '@/lib/recreate/seuVideoRelease'
import { seuVideoPresentation } from '@/lib/recreate/seuVideoPresentation'
import type { RecreateFlowBasePath } from '@/lib/recreate/flowRelease'
import RecreateClient from './RecreateClient'
import SeuVideoRecreateClient from '../recreate-preview/SeuVideoRecreateClient'

type Query = Record<string, string | string[] | undefined>

/** Preview and regular routes share the flow only after owner approval.
 * Generation, private assets and approved templates retain their gates. */
export default async function RecreateFlowPage({ id, searchParams = {}, basePath }: {
  id?: string; searchParams?: Query; basePath: RecreateFlowBasePath
}) {
  const { user } = await recreateSession()
  const draftRef = typeof searchParams.draft === 'string' ? searchParams.draft : undefined
  // M12 revisão (1): "Use your video" só aparece para quem pode gerar com ele. Ao cliente vai só o booleano, nunca a regra.
  const ownVideoVisible = user ? releaseVisible(user.email, SEU_VIDEO_RELEASE) : SEU_VIDEO_RELEASE === 'public'
  // M12 revisão (8): a prévia abre para qualquer um; o Generate de quem está logado nela é só das contas da casa (crédito real).
  const generationAllowed = basePath === '/recreate' || !user || releaseVisible(user.email, 'internal')
  if (id === 'your-video') {
    if (basePath === '/recreate' && !ownVideoVisible) notFound()
    return <SeuVideoRecreateClient currentFlow flowBasePath={basePath}
      createTabs={!!user && createShellVisible(user.email)}
      signedIn={!!user} accountKey={user?.id ?? null}
      generationAllowed={!!user && releaseVisible(user.email, SEU_VIDEO_RELEASE) && generationAllowed}
      presentation={seuVideoPresentation()} draftRef={draftRef}
      initialExample={typeof searchParams.example === 'string' ? searchParams.example : undefined} />
  }
  if (id) {
    const format = recreateFormat(id)
    if (!format || (user ? !recreateFormatVisible(format, user.email) : !publicRecreatePath(id))) notFound()
  }
  const formatIds = user ? visibleRecreateFormats(user.email).map(format => format.id) : publicRecreateCatalog().map(format => format.id)
  if (!formatIds.length) notFound()
  // Public tariff only, no invented account balance or engine availability.
  // The authenticated GET is still required before submitting a paid request.
  const guestQuotes = user ? undefined : RECREATE_FORMATS.filter(format => formatIds.includes(format.id)).map(format => {
    const credits = recreateCreditsFor(format) // KINEO-RECREATE-MOVIMENTO-1411 — era: format.type === 'swap' ? recreateCreditCost(format.seconds) : recreateEffectCredits(format)
    return { id: format.id, credits, available: credits !== null, shortfall: 0 }
  })
  return <RecreateClient currentFlow flowBasePath={basePath} initialId={id}
    guestQuotes={guestQuotes}
    signedIn={!!user} accountKey={user?.id ?? null} draftRef={draftRef}
    ownVideoVisible={ownVideoVisible} generationAllowed={generationAllowed}
    internalTools={!!user && releaseVisible(user.email, 'internal')}
    formatIds={formatIds} createTabs={!!user && createShellVisible(user.email)} />
}
