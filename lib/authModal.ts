// KINEO-LOGIN-MODAL-1410 — régua pura do modal de entrar/criar conta da home (fundador 14/10, "vai").
//
// O modal abre por cima da home com `/?auth=login` ou `/?auth=signup`. Todo o resto da query (redirect, reason,
// utm_*, prompt, intent_campaign…) passa INTACTO, porque as telas de login/cadastro dentro do modal são as mesmas de
// app/(auth)/* e leem window.location.search exatamente como na página. Sem módulo de rede, sem env: o guardião
// scripts/test-login-modal-1410.mjs executa este arquivo.

export type AuthModalMode = 'login' | 'signup'

/** Parâmetro da URL que abre o modal: `/?auth=login` ou `/?auth=signup`. */
export const AUTH_MODAL_PARAM = 'auth'

/** Atributo que marca, na home, os links /login e /signup que abrem o modal em vez de trocar de página. */
export const AUTH_MODAL_LINK_ATTR = 'data-auth-modal'

/** Evento de telemetria da abertura (o resto do funil continua com os eventos de sempre das telas). */
export const AUTH_MODAL_OPENED_EVENT = 'auth_modal_opened'

/**
 * Parâmetros que só existem para a entrada: saem da URL quando a pessoa FECHA um modal que veio pela URL
 * (ex.: o middleware mandou para `/?auth=login&redirect=/history`). utm_* e o resto ficam.
 */
export const AUTH_MODAL_ENTRY_PARAMS = [AUTH_MODAL_PARAM, 'redirect', 'reason', 'noauto'] as const

export function authModeFromParam(value: string | null | undefined): AuthModalMode | null {
  return value === 'login' || value === 'signup' ? value : null
}

/** `/login` → login, `/signup` → signup (com ou sem barra final); qualquer outro caminho → null. */
export function authModeFromPath(pathname: string): AuthModalMode | null {
  const clean = pathname.replace(/\/+$/, '') || '/'
  if (clean === '/login') return 'login'
  if (clean === '/signup') return 'signup'
  return null
}

/**
 * A query do modal a partir da query de um link /login?… ou /signup?…: `auth=<modo>` primeiro e TODOS os outros
 * parâmetros do link na mesma ordem e com o mesmo valor (o `redirect` atravessa byte a byte).
 */
export function authModalSearch(mode: AuthModalMode, linkSearch: string): string {
  const from = new URLSearchParams(linkSearch)
  const next = new URLSearchParams()
  next.set(AUTH_MODAL_PARAM, mode)
  from.forEach((value, key) => {
    if (key !== AUTH_MODAL_PARAM) next.append(key, value)
  })
  return `?${next.toString()}`
}

/** A query da home depois de fechar um modal aberto pela URL: sem os parâmetros de entrada, o resto intacto. */
export function searchWithoutAuthModal(search: string): string {
  const params = new URLSearchParams(search)
  for (const key of AUTH_MODAL_ENTRY_PARAMS) params.delete(key)
  const rest = params.toString()
  return rest ? `?${rest}` : ''
}
