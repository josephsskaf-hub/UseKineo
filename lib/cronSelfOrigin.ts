// KINEO-CRON-ORIGEM-2610 — origem para as chamadas INTERNAS que um cron faz ao próprio site (sessão minted → rotas do app).
//
// Por quê: o projeto na Vercel tem a Proteção de Deploy (SSO) em "all_except_custom_domains". O cron chega pelo endereço
// *.vercel.app do deploy; chamar a própria rota por esse endereço volta 401 da VERCEL (corpo JSON com objeto de erro), antes
// do nosso código. Foi o que derrubou as 15 tentativas de amostra de desenho infantil (kids_runs "story_401: [object Object]",
// 23–26/10). Em produção, troca para o domínio público; em preview/local mantém a origem da própria request.

export const CRON_PUBLIC_ORIGIN = 'https://www.usekineo.com'

export function cronSelfOrigin(requestOrigin: string, vercelEnv: string | undefined): string {
  if (vercelEnv !== 'production') return requestOrigin
  try {
    const host = new URL(requestOrigin).hostname
    if (host.endsWith('.vercel.app')) return CRON_PUBLIC_ORIGIN
  } catch {
    return CRON_PUBLIC_ORIGIN
  }
  return requestOrigin
}
