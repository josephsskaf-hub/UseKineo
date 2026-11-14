// KINEO-TELA-NOVA-1011 — a barra de abas Film · Cartoon · Ads · Recreate (topo do painel). Navegação normal (Link), sem estado global.
// Sem hooks: entra no RecreateClient sem mexer na ordem dos useState dele.
import Link from 'next/link'
import './create.css' // KINEO-ABAS-ESTILO-1011 — a barra também entra na tela do Recreate, que não carrega o CreateShell: sem este import as abas saíam sem estilo ("FilmCartoonAdsRecreate" colado)
import { CREATE_TAB_LINKS, type CreateTab } from '@/lib/create/tabs'

export default function CreateTabs({ active, showRecreate = true, showClip = false, recreateHref = '/recreate' }: { active: CreateTab | 'recreate' | 'clip' | null /* KINEO-LIBRARY-MOLDURA-NOVA-1211 — null = nenhuma aba marcada (a Library) */; showRecreate?: boolean; /** KINEO-CLIP-NA-MOLDURA-1011 — a aba Clip (interruptor CREATE_CLIP_INPLACE); sem ela, a barra de antes */ showClip?: boolean; recreateHref?: '/recreate' | '/recreate-flow-preview' }) {
  const links = CREATE_TAB_LINKS.filter(t => (showRecreate || t.id !== 'recreate') && (showClip || t.id !== 'clip'))
  return <nav className="ct-tabs" aria-label="Create">
    {links.map(t => <Link key={t.id} href={t.id === 'recreate' ? recreateHref : t.href} className={t.id === active ? 'ct-tab ct-tab-active' : 'ct-tab'} aria-current={t.id === active ? 'page' : undefined} data-create-tab={t.id}>{t.label}</Link>)}
  </nav>
}
