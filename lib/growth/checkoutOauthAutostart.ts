// ═══ KINEO-COMPRADOR-SEQUESTRADO-2026-09-18 — o auto-início do Google no cadastro de quem clicou num plano ═══
//
// MEDIDO (events, 60 dias até 18/09, por sessão de navegador):
//   · Cadastro comum, pessoa CLICA no botão do Google:      275 sessões → 258 voltam logadas (94%).
//   · Cadastro vindo de um clique em PLANO, Google auto-iniciado
//     na carga da página (selection_kind 'automatic'):        44 sessões →  10 voltam logadas (23%).
//   Dos 26 compradores perdidos em 30 dias, 23 nunca chegaram ao /auth/callback: sumiram dentro do
//   Google. Mesmo botão, mesmo callback, mesmo `next=` — a única diferença é o sequestro: a página
//   redireciona para o Google antes de a pessoa tocar em qualquer coisa. Quem acabou de clicar
//   "Creator — $19.90" vê um seletor de contas do Google que não pediu e fecha.
//
// DECISÃO: o auto-início fica DESLIGADO. A tela de escolha que já existia embaixo do overlay
// (plano salvo + botão do Google + e-mail) passa a ser o que a pessoa vê. O caminho do clique
// explícito é o de 94%. O código do auto-início continua no lugar, atrás desta constante, para o
// dia em que alguém quiser medir de novo — nunca religar sem comparar `selection_kind` outra vez.
//
// O que isso pode render: ~22 compradores/mês a mais chegando logados ao checkout (hoje 13/mês).
// Não mexe em preço, cobrador nem oferta; só devolve o clique à pessoa.

export const CHECKOUT_OAUTH_AUTOSTART_ENABLED = false
export const CHECKOUT_OAUTH_AUTOSTART_VERSION = 'checkout_oauth_autostart_off_v1'

export interface CheckoutOauthAutostartInput {
  /** `?reason=checkout` na URL: a pessoa veio de um clique em plano. */
  checkoutReason: boolean
  /** `?noauto=1`: fallback antigo que sempre pediu a tela de escolha. */
  noauto: boolean
  /** Navegador embutido (Instagram/TikTok…): o Google recusa OAuth ali. */
  embedded: boolean
  /** Já auto-iniciou nesta sessão do navegador (trava anti-loop antiga). */
  alreadyStarted: boolean
}

export type CheckoutOauthAutostartReason =
  | 'not_checkout'
  | 'noauto_param'
  | 'embedded_webview'
  | 'already_started'
  | 'disabled_by_measurement'
  | 'start'

export function decideCheckoutOauthAutostart(input: CheckoutOauthAutostartInput): { start: boolean; reason: CheckoutOauthAutostartReason; version: typeof CHECKOUT_OAUTH_AUTOSTART_VERSION } {
  const version = CHECKOUT_OAUTH_AUTOSTART_VERSION
  if (!input.checkoutReason) return { start: false, reason: 'not_checkout', version }
  if (input.noauto) return { start: false, reason: 'noauto_param', version }
  if (input.embedded) return { start: false, reason: 'embedded_webview', version }
  if (input.alreadyStarted) return { start: false, reason: 'already_started', version }
  if (!CHECKOUT_OAUTH_AUTOSTART_ENABLED) return { start: false, reason: 'disabled_by_measurement', version }
  return { start: true, reason: 'start', version }
}
