// KINEO-ATRIBUICAO-POUSO-2026-10-02 — o CAMINHO da página de entrada (primeiro toque), em uma função pura.
//
// Por que existe: o perfil sabia a origem (signup_utm_source / signup_referrer) e a tela do clique (signup_surface),
// mas não a página por onde a pessoa ENTROU. As páginas de SEO compensavam cravando `utm_source=seo` no link de
// cadastro — origem inventada. Agora a página de entrada vira dado próprio (profiles.signup_landing_path), e quem
// identifica "veio pelo artigo X" é o caminho, não um rótulo colado no botão.
//
// Usada nos DOIS lados: o navegador (lib/analytics.ts, captureSourceOnce) e a rota que grava
// (app/api/track-signup-source). Mesma régua dos dois lados → o servidor nunca grava o que o cliente não mandaria.
// Sem imports: o guardião executa este arquivo direto.

/** Teto do caminho guardado (a coluna é text; o teto é de higiene, não do banco). */
export const LANDING_PATH_MAX = 200
/** Chave do localStorage e nome do cookie de 90 dias (mesma janela do `kineo_src`: sobrevive ao OAuth). */
export const LANDING_PATH_KEY = 'kineo_landing'

// Só o alfabeto de caminho que nossas rotas usam: letras, dígitos, - . _ ~ / e escapes %XX (o navegador já entrega o
// pathname codificado). Nada de espaço, aspas, <, >, \, controle, nem `//` no começo (URL relativa a protocolo).
const SAFE_LANDING_PATH = /^\/(?!\/)[A-Za-z0-9\-._~/%]*$/

/**
 * Normaliza um caminho de entrada para gravar: só pathname (corta ?query e #hash), começa com '/', até
 * LANDING_PATH_MAX caracteres, e só caracteres seguros. Devolve null para qualquer coisa fora disso.
 *
 * O link de handoff `/go/<token>` vira `/go`: o token é uma credencial de posse do roteiro (quem tem o link lê) e
 * não pode morar no perfil.
 */
export function sanitizeLandingPath(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const pathOnly = raw.trim().split(/[?#]/, 1)[0] ?? ''
  if (!pathOnly.startsWith('/') || pathOnly.startsWith('//')) return null
  const redacted = /^\/go\/[^/]+/.test(pathOnly) ? '/go' : pathOnly
  const bounded = redacted.slice(0, LANDING_PATH_MAX)
  return SAFE_LANDING_PATH.test(bounded) ? bounded : null
}
