// KINEO-TELA-NOVA-1011 — a barra de abas Film · Cartoon · Ads · Recreate (topo do painel). Navegação normal (Link), sem estado global.
// Sem hooks: entra no RecreateClient sem mexer na ordem dos useState dele.
import Link from 'next/link'
import { CREATE_TAB_LINKS, type CreateTab } from '@/lib/create/tabs'

export default function CreateTabs({ active, showRecreate = true }: { active: CreateTab | 'recreate'; showRecreate?: boolean }) {
  const links = CREATE_TAB_LINKS.filter(t => showRecreate || t.id !== 'recreate')
  return <nav className="ct-tabs" aria-label="Create">
    {links.map(t => <Link key={t.id} href={t.href} className={t.id === active ? 'ct-tab ct-tab-active' : 'ct-tab'} aria-current={t.id === active ? 'page' : undefined} data-create-tab={t.id}>{t.label}</Link>)}
  </nav>
}
