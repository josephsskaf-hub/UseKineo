// ═══ KINEO-CHECKOUT-ROBO-1510 — sessão da Stripe só nasce de clique de gente ═══════════════════════════════════════════
//
// O QUE ACONTECEU (banco, 15/10, só SELECT). O card "Pagamento 24h" do /admin mostrava 34 "chegaram ao pagamento" e 0
// pagaram. Das 36 aberturas de 30 h, 27 eram compra SEM conta com o mesmo retrato: session_id nulo (o navegador nunca
// rodou o nosso JS), ip_hash que NUNCA apareceu em outro evento além do próprio checkout_attempted/guest_started, ua_class
// "browser" (UA de Chrome), Creator mensal, e RAJADAS de 2–3 IPs diferentes para a MESMA campanha em 3–13 s
// (buy_creator_niche_luxury 19:16:42–47, niche_money 18:08:46–59, text_to_video_shorts 17:01:10–17…), varrendo um nicho
// depois do outro ao longo de horas. As 3 compras sem conta que eram gente tinham landing_session_started, clique no
// botão (buy_creator_cta_clicked / checkout_cta_clicked) e uma até viu a tela de "cancelou" da Stripe. Em 14 dias, 72
// aberturas sem conta sem rastro de navegador, 0 pagamentos — os 3 pagamentos do período foram de conta logada COM rastro.
//
// A CAUSA: o botão de compra é um <a href="/api/stripe/checkout?tier=basic&…"> e a rota cria a sessão da Stripe num GET.
// Robô que segue link (scanner de segurança, pré-visualizador, varredor de LLM com UA de Chrome) cria uma sessão a cada
// visita — e o rel="nofollow" que o botão já tinha não segura quem não respeita (o /api/ já é Disallow no robots.txt).
//
// O PORTÃO (middleware.ts, ANTES da rota — app/api/stripe/checkout/route.ts não muda uma linha; preço, cupom, webhook e
// cobrança ficam intocados). Só vale para GET/HEAD em /api/stripe/checkout EXATO e SEM cookie de login do Supabase:
//   · passa  — o pedido traz prova de clique: `Sec-Fetch-User: ?1` (o navegador só manda em navegação ativada por gesto
//              — clique, inclusive Ctrl/meio-clique e link vindo do ChatGPT/e-mail) OU `kc=1`, que o lançador único
//              (lib/checkoutTelemetry.ts → useCheckoutLaunch) põe na URL NO CLIQUE (nunca no href que o robô lê);
//   · passa  — pré-carregamento declarado (Sec-Purpose/Purpose): a rota já responde 204 e grava checkout_prefetch_blocked;
//   · portão — sem prova de clique: página leve "Continue to secure checkout" (200, noindex, no-store). O botão monta a
//              URL com kc=1 por JS no clique — não há link na página para o robô seguir. Gente com navegador antigo
//              (sem Sec-Fetch) paga um clique a mais; nenhuma sessão Stripe é criada sem clique;
//   · recusa — UA de robô CONHECIDO (affiliateBotReason de lib/affiliateDestinations.ts, o mesmo detector do /a/[code],
//              KINEO-AFILIADO-DESTINO-1610; UA vazio NÃO entra: proxy corporativo apaga UA) sem as DUAS provas: 403 com a
//              mesma página — quem se enganou de classe ainda passa clicando no botão.
// Conta logada (cookie sb-…-auth-token) não passa por nada disto: o caminho de hoje, byte a byte.
// O portão grava dois eventos pelo sink do navegador (só quando o JS roda): checkout_gate_viewed e
// checkout_gate_continued — a prova, depois do deploy, de quantas pessoas reais o portão segurou.
//
// Módulo PURO (sem Next, sem rede): roda no edge do middleware e no guardião scripts/test-checkout-robo-1510.mjs.

import { affiliateBotReason } from '../affiliateDestinations'

export const CHECKOUT_ROBOT_GATE_VERSION = 'checkout_robot_gate_v1' as const
export const CHECKOUT_GATE_PATH = '/api/stripe/checkout'
/** Marca de clique: o lançador põe na URL no momento do clique. */
export const CHECKOUT_CLICK_PARAM = 'kc'
export const CHECKOUT_CLICK_VALUE = '1'
export const CHECKOUT_GATE_VIEWED_EVENT = 'checkout_gate_viewed'
export const CHECKOUT_GATE_CONTINUED_EVENT = 'checkout_gate_continued'

export type CheckoutGateDecision =
  | { action: 'pass'; reason: 'other_path' | 'other_method' | 'signed_in' | 'prefetch' | 'click_mark' | 'user_activation' | 'bot_clicked' }
  | { action: 'gate'; reason: 'no_click_proof' }
  | { action: 'refuse_bot'; reason: string }

type HeaderReader = { get(name: string): string | null }

/** Cookie de sessão do Supabase SSR (inteiro ou em pedaços .0/.1). O code-verifier do OAuth NÃO é sessão. */
export function hasSupabaseAuthCookie(cookieNames: readonly string[]): boolean {
  return cookieNames.some((n) => /^sb-[A-Za-z0-9]+-auth-token(?:\.\d+)?$/.test(n))
}

function isDeclaredPrefetch(h: HeaderReader): boolean {
  const secPurpose = (h.get('sec-purpose') ?? '').toLowerCase()
  if (secPurpose.includes('prefetch') || secPurpose.includes('prerender')) return true
  const purpose = (h.get('purpose') ?? h.get('x-purpose') ?? '').toLowerCase()
  if (purpose === 'prefetch' || purpose === 'preview') return true
  if ((h.get('x-moz') ?? '').toLowerCase() === 'prefetch') return true
  if (h.get('next-router-prefetch') === '1') return true
  return false
}

export function decideCheckoutGate(input: {
  method: string
  pathname: string
  searchParams: URLSearchParams
  headers: HeaderReader
  cookieNames: readonly string[]
}): CheckoutGateDecision {
  if (input.pathname !== CHECKOUT_GATE_PATH) return { action: 'pass', reason: 'other_path' }
  const method = input.method.toUpperCase()
  if (method !== 'GET' && method !== 'HEAD') return { action: 'pass', reason: 'other_method' }
  if (hasSupabaseAuthCookie(input.cookieNames)) return { action: 'pass', reason: 'signed_in' }
  if (isDeclaredPrefetch(input.headers)) return { action: 'pass', reason: 'prefetch' }

  const clickMark = input.searchParams.get(CHECKOUT_CLICK_PARAM) === CHECKOUT_CLICK_VALUE
  const userActivation = (input.headers.get('sec-fetch-user') ?? '').trim() === '?1'
  const ua = (input.headers.get('user-agent') ?? '').trim()
  const botReason = ua ? affiliateBotReason(ua) : null
  if (botReason) {
    return clickMark && userActivation ? { action: 'pass', reason: 'bot_clicked' } : { action: 'refuse_bot', reason: botReason }
  }
  if (clickMark) return { action: 'pass', reason: 'click_mark' }
  if (userActivation) return { action: 'pass', reason: 'user_activation' }
  return { action: 'gate', reason: 'no_click_proof' }
}

/**
 * Põe a marca de clique numa URL do checkout (relativa ou do mesmo site). Qualquer outra URL volta igual — a Stripe
 * direta, o /resume e o resto nunca ganham parâmetro novo. Idempotente.
 */
export function withCheckoutClickMark(url: string): string {
  const hashAt = url.indexOf('#')
  const base = hashAt >= 0 ? url.slice(0, hashAt) : url
  const hash = hashAt >= 0 ? url.slice(hashAt) : ''
  const queryAt = base.indexOf('?')
  const path = queryAt >= 0 ? base.slice(0, queryAt) : base
  const relative = path === CHECKOUT_GATE_PATH
  const sameSiteAbsolute = /^https:\/\/(?:www\.)?usekineo\.com\/api\/stripe\/checkout$/i.test(path)
  if (!relative && !sameSiteAbsolute) return url
  const query = queryAt >= 0 ? base.slice(queryAt + 1) : ''
  const params = new URLSearchParams(query)
  if (params.get(CHECKOUT_CLICK_PARAM) === CHECKOUT_CLICK_VALUE) return url
  const mark = `${CHECKOUT_CLICK_PARAM}=${CHECKOUT_CLICK_VALUE}`
  return `${path}?${query ? `${query}&` : ''}${mark}${hash}`
}

/**
 * A página do portão. Não reflete NADA do pedido (sem XSS) e não tem link para o checkout: o botão monta a URL a partir
 * de location no clique. Sem JS não há como seguir — o próprio site exige JS para comprar.
 */
export function checkoutGateHtml(reason: string): string {
  const safeReason = reason.replace(/[^a-z0-9_.-]/gi, '').slice(0, 40)
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>Continue to secure checkout · Kineo</title>
<style>
:root{color-scheme:dark}body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#000;color:#f5f5f7;font:16px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;padding:16px;box-sizing:border-box}
main{max-width:420px;text-align:center}h1{font-size:1.35rem;margin:0 0 8px}p{color:#a1a1a6;margin:0 0 20px}
button{background:#2997ff;color:#001b33;font-weight:900;font-size:1.02rem;border:0;border-radius:980px;padding:15px 28px;cursor:pointer}
button[disabled]{opacity:.7;cursor:progress}a{color:#2997ff}
</style></head><body><main>
<h1>Continue to secure checkout</h1>
<p>You’ll finish on Stripe — no account needed. Your account is created after payment.</p>
<button id="kineo-checkout-continue" type="button">Continue to secure checkout</button>
<p style="margin-top:18px;font-size:.85rem">or <a href="/pricing">see all plans</a></p>
</main>
<script>
(function(){
  var reason=${JSON.stringify(safeReason)};
  function sid(){var m=document.cookie.match(/(?:^|; )kineo_event_session_id=([A-Za-z0-9_-]{8,64})/);return m?m[1]:null}
  function send(name){try{var p=new URLSearchParams(location.search);fetch('/api/events',{method:'POST',keepalive:true,headers:{'content-type':'application/json'},body:JSON.stringify({name:name,session_id:sid(),path:location.pathname,metadata:{version:${JSON.stringify(CHECKOUT_ROBOT_GATE_VERSION)},gate_reason:reason,tier:p.get('tier'),pack:p.get('pack'),billing:p.get('billing'),intent_campaign:p.get('intent_campaign')}})}).catch(function(){})}catch(e){}}
  send(${JSON.stringify(CHECKOUT_GATE_VIEWED_EVENT)});
  var b=document.getElementById('kineo-checkout-continue');
  b.addEventListener('click',function(){
    b.disabled=true;b.textContent='Opening secure checkout…';
    send(${JSON.stringify(CHECKOUT_GATE_CONTINUED_EVENT)});
    var q=location.search?location.search+'&':'?';
    location.href=location.pathname+q+${JSON.stringify(`${CHECKOUT_CLICK_PARAM}=${CHECKOUT_CLICK_VALUE}`)};
  });
})();
</script></body></html>`
}

/** Cabeçalhos da resposta do portão: nunca indexar, nunca guardar em cache (cada visita decide de novo). */
export const CHECKOUT_GATE_HEADERS: Readonly<Record<string, string>> = {
  'content-type': 'text/html; charset=utf-8',
  'cache-control': 'no-store, max-age=0',
  'x-robots-tag': 'noindex, nofollow',
  'x-kineo-checkout-gate': CHECKOUT_ROBOT_GATE_VERSION,
}

export function checkoutGateStatus(decision: CheckoutGateDecision): number {
  return decision.action === 'refuse_bot' ? 403 : 200
}
