import { notFound } from 'next/navigation'
import { recreateSession } from '@/lib/recreate/server'
import { RECREATE_FORMATS, recreateCreditsFor } from '@/lib/recreate/formats' // KINEO-RECREATE-MOVIMENTO-1411 — era: recreateEffectCredits + recreateCreditCost
import { publicRecreateCatalog } from '@/lib/recreate/catalogPublic'
import { publicRecreatePath } from '@/lib/recreate/entry'
import { recreateFormatVisible, releaseVisible } from '@/lib/recreate/access'
import { formatosParaOCliente, recreateFormatServidor as recreateFormat } from '@/lib/recreate/catalogoServidor' // KINEO-RECEITA-FORA-DO-JS-1411
import { publicRecreateCatalog as catalogoPublico } from '@/lib/recreate/catalogPublic' // KINEO-RECEITA-FORA-DO-JS-1411
import { createShellVisible } from '@/lib/create/access'
import { SEU_VIDEO_RELEASE } from '@/lib/recreate/seuVideoRelease'
import { seuVideoPresentation } from '@/lib/recreate/seuVideoPresentation'
import type { RecreateFlowBasePath } from '@/lib/recreate/flowRelease'
import RecreateClient from './RecreateClient'
import SeuVideoRecreateClient from '../recreate-preview/SeuVideoRecreateClient'
import ClipRecreateJuntos, { type RecreateProps } from '@/components/create/ClipRecreateJuntos' // KINEO-CLIP-RECREATE-JUNTOS-1511
import { clipRecreateJuntosVisivel, clipWorkspaceVisible } from '@/lib/create/clipRecreateJuntos' // KINEO-CLIP-RECREATE-JUNTOS-1511

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
      abaJuntos={!!user && basePath === '/recreate' && clipRecreateJuntosVisivel(user.email)} /* KINEO-CLIP-RECREATE-JUNTOS-1511 */
      signedIn={!!user} accountKey={user?.id ?? null}
      generationAllowed={!!user && releaseVisible(user.email, SEU_VIDEO_RELEASE) && generationAllowed}
      presentation={seuVideoPresentation()} draftRef={draftRef}
      initialExample={typeof searchParams.example === 'string' ? searchParams.example : undefined} />
  }
  if (id) {
    const format = recreateFormat(id)
    if (!format || (user ? !recreateFormatVisible(format, user.email) : !publicRecreatePath(id))) notFound()
  }
  const formatos = user ? formatosParaOCliente(user.email) : formatosParaOCliente(null).filter(f => catalogoPublico().some(p => p.id === f.id)) // KINEO-RECEITA-FORA-DO-JS-1411 — só a vitrine, só o que esta pessoa vê
  const formatIds = user ? formatos.map(format => format.id) : publicRecreateCatalog().map(format => format.id)
  if (!formatIds.length) notFound()
  // Public tariff only, no invented account balance or engine availability.
  // The authenticated GET is still required before submitting a paid request.
  const guestQuotes = user ? undefined : RECREATE_FORMATS.filter(format => formatIds.includes(format.id)).map(format => {
    const credits = recreateCreditsFor(format) // KINEO-RECREATE-MOVIMENTO-1411 — era: format.type === 'swap' ? recreateCreditCost(format.seconds) : recreateEffectCredits(format)
    return { id: format.id, credits, available: credits !== null, shortfall: 0 }
  })
  // KINEO-CLIP-RECREATE-JUNTOS-1511 [dono 15/11: "juntar a aba de Clips com a aba de Recreate"] — quem está no interruptor (hoje só a casa) vê a tela
  // única: o MESMO RecreateClient, com as MESMAS props da linha de baixo (o guardião compara uma a uma), dentro da tela que junta o Clips.
  // Visitante e conta fora do interruptor: a linha de baixo, como sempre. Só nas rotas do Recreate (a prévia /recreate-flow-preview fica como está).
  if (user && basePath === '/recreate' && clipRecreateJuntosVisivel(user.email)) {
    const recreate: RecreateProps = { currentFlow: true, flowBasePath: basePath, initialId: id, guestQuotes, signedIn: !!user, accountKey: user?.id ?? null, draftRef, ownVideoVisible, generationAllowed, internalTools: !!user && releaseVisible(user.email, 'internal'), formatos, formatIds, createTabs: !!user && createShellVisible(user.email) }
    if (clipWorkspaceVisible(user.email)) {
      const { default: ClipTemplateWorkspace } = await import('@/components/create/ClipTemplateWorkspace')
      const { clipTemplateSpecs, clipOwnVideoModelLabel } = await import('@/lib/create/clipWorkspaceServer')
      const presentation = ownVideoVisible ? seuVideoPresentation() : null
      const ownVideo = presentation ? {
        signedIn: true, generationAllowed, accountKey: user.id, currentFlow: true, flowBasePath: basePath,
        presentation, clipModelLabel: clipOwnVideoModelLabel(),
      } : undefined
      return <ClipTemplateWorkspace measurementActor={user.id} recreate={recreate} specs={clipTemplateSpecs(formatos)} ownVideo={ownVideo} />
    }
    return <ClipRecreateJuntos measurementActor={user.id} recreate={recreate} />
  }
  return <RecreateClient currentFlow flowBasePath={basePath} initialId={id}
    guestQuotes={guestQuotes}
    signedIn={!!user} accountKey={user?.id ?? null} draftRef={draftRef}
    ownVideoVisible={ownVideoVisible} generationAllowed={generationAllowed}
    internalTools={!!user && releaseVisible(user.email, 'internal')}
    formatos={formatos} formatIds={formatIds} createTabs={!!user && createShellVisible(user.email)} />
}
