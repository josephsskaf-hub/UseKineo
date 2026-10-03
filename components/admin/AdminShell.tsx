'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

export const ADMIN_GROUPS = [
  { label: 'Negócio', pages: [['/admin', 'Visão geral'], ['/admin/paying', 'Pagantes'], ['/admin/overview', 'Indicadores']] },
  { label: 'Aquisição', pages: [['/admin/leads', 'Oportunidades'], ['/admin/funnel', 'Funil'], ['/admin/affiliates', 'Afiliados'], ['/admin/partners', 'Parceiros']] },
  { label: 'Pessoas', pages: [['/admin/people', 'Pessoas'], ['/admin/users', 'Contas']] },
  { label: 'Operação', pages: [['/admin/ads', 'Pedidos Ads'], ['/admin/supplier-health', 'Fornecedores'], ['/admin/coerencia', 'Qualidade'], ['/admin/metrics', 'Métricas']] },
  { label: 'Trial', pages: [['/admin/trial-roi', 'Retorno do trial'], ['/admin/trial-cohort', 'Coortes'], ['/admin/trial-abuse', 'Risco do trial']] },
] as const

/** Presentation only. The existing server/page/API authorization remains authoritative. */
export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const currentPath = pathname === '/admin/ceo' ? '/admin' : pathname
  const current = ADMIN_GROUPS.flatMap(group => [...group.pages]).find(([href]) => href === currentPath)
  return (
    <div className="kineo-admin-theme admin-porcelain">
      <a className="adm-skip" href="#adm-content">Ir para o conteúdo</a>
      <aside className="adm-sidebar">
        <Link href="/admin" prefetch={false} className="adm-brand"><span aria-hidden="true">ϟ</span> Kineo <small>ADM</small></Link>
        <nav aria-label="Administração" className="adm-navigation">
          {ADMIN_GROUPS.map(group => (
            <div className="adm-group" key={group.label}>
              <p>{group.label}</p>
              {group.pages.map(([href, label]) => (
                <Link href={href} prefetch={false} key={href} aria-current={currentPath === href ? 'page' : undefined}>
                  <span aria-hidden="true">○</span>{label}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <Link href="/studio" prefetch={false} className="adm-exit">← Voltar ao Studio</Link>
      </aside>
      <div className="adm-workspace">
        <header className="adm-topbar"><span>Administração <span aria-hidden="true">/</span> <strong>{current?.[1] ?? 'Admin'}</strong></span><small>Acesso restrito</small></header>
        <div id="adm-content" tabIndex={-1} className="adm-content">{children}</div>
      </div>
    </div>
  )
}
