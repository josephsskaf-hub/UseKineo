// KINEO-TELA-NOVA-1011 — quem vê a tela nova. Mesma regra do Recreate: allowlist EXATA da casa no modo 'internal'.
import { releaseVisible, recreateVisible } from '@/lib/recreate/access'
import { CREATE_SHELL_RELEASE } from './release'
import type { InternalRelease } from '@/lib/recreate/release'
import { createTabHref, isCreateTab, type CreateTab } from './tabs'

export { CREATE_SHELL_RELEASE }

/** A conta (logada) vê /create/*? Visitante (sem e-mail) nunca "vê": ou vai ao cadastro (public) ou recebe 404. */
export function createShellVisible(email: string | null | undefined, release: InternalRelease = CREATE_SHELL_RELEASE): boolean {
  return !!email && releaseVisible(email, release)
}

export type CreateShellDecision = { kind: 'show'; showRecreate: boolean } | { kind: 'signup'; href: string } | { kind: 'not_found' }

/** A porta de /create/<aba>, pura: o servidor só lê o usuário e aplica isto. */
export function createShellDecision(tab: string, user: { email?: string | null } | null, release: InternalRelease = CREATE_SHELL_RELEASE): CreateShellDecision {
  if (!isCreateTab(tab) || release === 'off') return { kind: 'not_found' }
  if (!user) return release === 'public' ? { kind: 'signup', href: '/signup?' + new URLSearchParams({ redirect: createTabHref(tab as CreateTab) }).toString() } : { kind: 'not_found' }
  if (!createShellVisible(user.email, release)) return { kind: 'not_found' }
  // A aba Recreate só aparece para quem abre o /recreate (senão ela levaria a um 404).
  return { kind: 'show', showRecreate: recreateVisible(user.email) }
}
