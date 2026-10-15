// ═══ KINEO-SAIR-DA-CONTA-1510 — um único caminho de saída, que funciona no 1º clique ═══
//
// BUG (fundador, 15/10): "não consigo dar sign out; às vezes tenho que clicar 2 ou 3 vezes; agora tentei 3 ou 4
// vezes e não saí da conta de testes". Nos logs do Supabase, NENHUM POST /auth/v1/logout chegou depois de
// 14/10 14:08 UTC — os cliques morriam no navegador antes de qualquer rede.
//
// CAUSA (provada com a própria @supabase/auth-js em scripts/test-sair-da-conta-1510.mjs):
//   1. components/Sidebar.tsx tinha um ouvinte de mudança de sessão ASSÍNCRONO que, no SIGNED_IN, dava `await supabase.from(...)`.
//      O auth-js emite SIGNED_IN DENTRO da trava de sessão toda vez que a aba volta a ficar visível
//      (_onVisibilityChanged → _recoverAndRefresh → _notifyAllSubscribers, que espera o callback). O `from()` pede
//      getSession(), que entra na fila da MESMA trava → a trava nunca solta (deadlock documentado pela Supabase).
//   2. Com a trava presa, o signOut do auth-js fica na fila para sempre: não apaga cookie e nem chega a chamar
//      /logout. O botão tinha `Promise.race(..., 3000)` e depois `window.location.href = '/'` — navegava COM os
//      cookies sb-* intactos, e o servidor desenhava a pessoa ainda logada (o middleware ainda manda /login → /dashboard).
//   3. Mesmo sem deadlock, o signOut do cliente só apaga o cookie DEPOIS de esperar a trava (até 5 s), a renovação do
//      token e o POST /logout; se isso passa de 3 s, a mesma navegação leva a sessão junto. Daí o "às vezes 2-3 cliques".
//
// CONSERTO: todos os botões chamam `sairDaConta()` (lib/auth/sairDaContaCliente.ts), que (a) pede ao SERVIDOR
// POST /auth/signout (app/auth/signout/route.ts) — revoga a sessão no Supabase e apaga TODOS os cookies sb-* com
// Set-Cookie, Cache-Control: no-store —, (b) apaga os mesmos cookies no navegador sem depender da trava, e (c) faz
// navegação dura com window.location.replace para a home. Este arquivo é puro (sem imports): roda no servidor, no
// navegador e no guardião.

/** Rota de servidor da saída. O middleware NÃO renova sessão nela (middleware.ts usa o mesmo texto, sem import). */
export const SAIR_DA_CONTA_ROTA = '/auth/signout'
/**
 * Para onde a pessoa vai depois de sair (navegação dura, nunca router.push). É a HOME, decisão do fundador de 14/10
 * (KINEO-LOGIN-MODAL-1410, R6 de scripts/test-login-modal-1410.mjs): "sair pousa na home"; o "Log in" do topo abre
 * o modal por cima dela para entrar com outra conta.
 */
export const SAIR_DA_CONTA_DESTINO = '/'
/** Teto da ida ao servidor. Estourou → apaga no navegador e navega do mesmo jeito. */
export const SAIR_DA_CONTA_TIMEOUT_MS = 4000
/** Teto do signOut local do auth-js (só serve para avisar as outras abas; a saída não depende dele). */
export const SAIR_DA_CONTA_LOCAL_TIMEOUT_MS = 1500
/** Teto da revogação no servidor (POST /logout no Supabase). */
export const SAIR_DA_CONTA_REVOGA_TIMEOUT_MS = 2500

/** Todo cookie de sessão do @supabase/ssr começa com `sb-` (token, pedaços .0/.1…, code-verifier). */
export function ehCookieDeSessao(nome: string): boolean {
  return typeof nome === 'string' && nome.startsWith('sb-')
}

/** Nomes que o @supabase/ssr usa para este projeto, mesmo que o pedido não os traga (apagar a mais não custa). */
export function nomesDeSessaoConhecidos(supabaseUrl: string | undefined | null): string[] {
  let ref = ''
  try {
    ref = new URL(supabaseUrl || '').hostname.split('.')[0] || ''
  } catch {
    ref = ''
  }
  if (!ref) return []
  const base = `sb-${ref}-auth-token`
  const nomes = [base, `${base}-code-verifier`]
  for (let i = 0; i < 5; i++) nomes.push(`${base}.${i}`)
  return nomes
}

/**
 * Variações de domínio em que o cookie pode ter nascido. `null` = cookie só do host (o padrão do @supabase/ssr).
 * Para www.usekineo.com também tenta usekineo.com: um cookie com Domain só some com o MESMO Domain.
 * localhost e IP não aceitam Domain — só a versão do host.
 */
export function dominiosParaApagar(host: string | undefined | null): (string | null)[] {
  const h = String(host || '').split(',')[0].trim().split(':')[0].toLowerCase().replace(/^\.+/, '')
  const out: (string | null)[] = [null]
  if (!h || !h.includes('.') || /^\d+(\.\d+){3}$/.test(h) || h.endsWith('.localhost')) return out
  out.push(h)
  const partes = h.split('.')
  if (partes.length > 2) {
    const raiz = partes.slice(-2).join('.')
    if (!out.includes(raiz)) out.push(raiz)
  }
  return out
}

/** Uma linha Set-Cookie (ou document.cookie) que expira o cookie agora. */
export function linhaParaApagarCookie(nome: string, dominio: string | null, seguro: boolean): string {
  return (
    `${nome}=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax` +
    (seguro ? '; Secure' : '') +
    (dominio ? `; Domain=${dominio}` : '')
  )
}

/** Todas as linhas para apagar todos os nomes em todas as variações de domínio (sem repetição). */
export function linhasParaApagarCookies(nomes: string[], host: string | undefined | null, seguro: boolean): string[] {
  const unicos = Array.from(new Set(nomes.filter(ehCookieDeSessao)))
  const linhas: string[] = []
  for (const nome of unicos) {
    for (const dominio of dominiosParaApagar(host)) linhas.push(linhaParaApagarCookie(nome, dominio, seguro))
  }
  return linhas
}

/** Nomes dos cookies sb-* presentes num cabeçalho/`document.cookie` ("a=1; sb-x=2"). */
export function nomesDeSessaoNoTextoDeCookie(texto: string | undefined | null): string[] {
  return String(texto || '')
    .split(';')
    .map((par) => par.split('=')[0].trim())
    .filter(ehCookieDeSessao)
}
