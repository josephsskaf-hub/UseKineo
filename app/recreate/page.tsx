import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { recreateSession } from '@/lib/recreate/server'
import { RECREATE_RELEASE } from '@/lib/recreate/release'
import RecreateClient from './RecreateClient'
import RecreateCatalogPublic from './RecreateCatalogPublic' // KINEO-MENU-RECREATE-1211
import { publicRecreateCatalog } from '@/lib/recreate/catalogPublic' // KINEO-MENU-RECREATE-1211
import { createShellVisible } from '@/lib/create/access' // KINEO-TELA-NOVA-1011 — as abas Film · Cartoon · Ads só para quem vê o /create
import { releaseVisible, visibleRecreateFormats } from '@/lib/recreate/access'

export const dynamic = 'force-dynamic'
// KINEO-MENU-RECREATE-1211 — título e descrição da grade. Segue fora do índice (noindex): a porta indexável do Recreate é /ai-face-swap-video,
// e o guardião scripts/test-recreate-trava-1011.mjs mantém /recreate fora do sitemap.
export const metadata: Metadata = {
  title: { absolute: 'Recreate: put yourself in the clip | Kineo' },
  description: 'Every Kineo video template you can recreate: pick a clip, add your photo and get your own version.',
  robots: { index: false, follow: true },
}
export default async function Page() {
  const { user } = await recreateSession()
  if (!user) {
    // KINEO-MENU-RECREATE-1211 [fundador 12/11: "Se você quiser entrar no Recreate e olhar tudo que você pode recriar, não tem."] — o visitante
    // VÊ a grade de todos os modelos liberados; o cadastro vem no clique do cartão (volta direto em /recreate/<id>). Antes: cadastro sem ver nada.
    if (RECREATE_RELEASE === 'public') return <RecreateCatalogPublic items={publicRecreateCatalog()} />
    notFound()
  }
  return <RecreateClient internalTools={releaseVisible(user.email, 'internal')} formatIds={visibleRecreateFormats(user.email).map(f => f.id)} createTabs={createShellVisible(user.email)} />
}
