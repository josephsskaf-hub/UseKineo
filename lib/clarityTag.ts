// ═══ KINEO-CLARITY-WELCOME20-2026-10-12 — MICROSOFT CLARITY: VER POR QUE QUEM CHEGA AO PAGAMENTO NÃO COMPRA ═══════
// POR QUÊ (fundador 12/10, "tudo sim"): o funil diz QUANTOS chegam ao preço e desistem; não diz O QUE eles fazem na
// tela antes de desistir (onde rolam, onde param, em que clicam sem resposta). O Clarity grava a sessão de graça.
// AS TRAVAS (puras aqui; o guardião scripts/test-clarity-so-com-id.mjs executa cada uma):
//   1. Sem NEXT_PUBLIC_CLARITY_ID válido = nada carrega (o layout nem monta o componente). O ID é público por natureza
//      (vai no HTML de qualquer site que usa Clarity); ainda assim só passa se for alfanumérico curto — nada de texto
//      arbitrário entrando num <script> inline.
//   2. Nunca em /admin, nas telas de conta e senha (/login, /signup, /forgot-password, /reset-password, /auth/*, o login
//      de uso único do convidado /checkout/guest) nem em /account/billing. Chegou por uma delas = o script nem baixa;
//      navegou de uma página gravada para uma delas = clarity('stop'), e 'start' só ao voltar para uma permitida.
//   3. Nada de clarity('identify'): nenhum e-mail ou id de usuário vai para a Microsoft. A única etiqueta é
//      page_kind (pricing/business/ads/studio/home) — categoria de PÁGINA, nunca de pessoa.
//   4. Campos de e-mail/senha levam data-clarity-mask="true" (cartão não existe no nosso HTML: é a página da Stripe).

/** O ID de projeto do Clarity é curto e alfanumérico (ex.: "abc12de3fg"). Qualquer outra coisa = sem Clarity. */
export const CLARITY_ID_PATTERN = /^[a-z0-9]{6,32}$/i

export function clarityProjectId(raw: string | null | undefined): string | null {
  const id = (raw ?? '').trim()
  return CLARITY_ID_PATTERN.test(id) ? id : null
}

/** Prefixos onde o Clarity nunca grava (o próprio caminho e tudo abaixo dele). */
export const CLARITY_BLOCKED_PREFIXES = [
  '/admin',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/auth',
  '/account/billing',
  '/checkout/guest',
] as const

export function clarityAllowedPath(pathname: string | null | undefined): boolean {
  const path = (pathname ?? '/').split('?')[0].split('#')[0].toLowerCase() || '/'
  return !CLARITY_BLOCKED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))
}

export type ClarityPageKind = 'pricing' | 'business' | 'ads' | 'studio' | 'home'

/** A etiqueta não pessoal da página (só o 1º segmento do caminho). null = página sem etiqueta. */
export function clarityPageKind(pathname: string | null | undefined): ClarityPageKind | null {
  const path = (pathname ?? '/').split('?')[0].split('#')[0].toLowerCase()
  if (path === '' || path === '/') return 'home'
  const first = path.split('/')[1] ?? ''
  if (first === 'pricing') return 'pricing'
  if (first === 'business') return 'business'
  if (first === 'ads') return 'ads'
  if (first === 'studio') return 'studio'
  return null
}

/** O snippet oficial do Clarity (fila window.clarity + https://www.clarity.ms/tag/<ID>), com o ID já validado. */
export function claritySnippet(projectId: string): string {
  const id = clarityProjectId(projectId)
  if (!id) return ''
  return `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script",${JSON.stringify(id)});`
}
