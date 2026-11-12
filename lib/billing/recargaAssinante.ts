// KINEO-RECARGA-ASSINANTE-1111 [fundador 11/11: "Aprovado pode fazer" — 60 créditos por US$ 9, só para assinante que zerou]
//
// O QUE É: uma recarga de créditos, pagamento ÚNICO, oferecida SÓ ao assinante pago (Starter, Creator ou Studio) que ficou
// sem saldo para o filme mais barato — no próprio aviso de "sem crédito" (components/billing/SubscriberUpgradeNudge.tsx).
// A recarga vira o botão principal; subir de plano fica como secundário. Nada no /pricing, nada na home, nada para quem não
// assina.
//
// POR QUÊ (banco, 11/11): os dois Studio da história zeraram; o que tinha recarga comprou as DUAS únicas recargas vendidas
// na casa (13/09 e 23/09) e ficou mais um mês; a que não tinha saiu. A Creator nikolmishukov zerou em 30/10, viu só "suba
// para o Studio de US$ 59" e foi cancelar em 02/11. Desde 04/11 (KINEO-PRECO-MERCADO-0411) quem zera não tem recarga, e o
// Studio, no topo da escada, não vê NADA.
//
// ONDE MORA CADA COISA (fonte única):
//   · preço e créditos .... lib/credits/creditSlider.ts (RECARGA_ASSINANTE_1111 — o botão — e a escada da barra, que começa
//                           EXATAMENTE nele: 60 créditos = US$ 9 … 3.700 = US$ 500);
//   · quem pode ........... ESTE módulo (recargaAssinanteEligible), lido pela rota da oferta E pelo checkout;
//   · oferta e clique ..... app/api/billing/recarga-assinante/route.ts (eventos de servidor shown/clicked);
//   · cobrança ............ lib/stripe/recargaAssinanteCheckout.ts (?pack=recarga_assinante_1111);
//   · concessão ........... app/api/stripe/webhook/route.ts (Path A, guard por sessão; créditos da fonte única).
//
// MÓDULO PURO (sem import em tempo de execução): rota, checkout, aviso e guardião (scripts/test-recarga-assinante-1111.mjs)
// leem as MESMAS regras.

/** Interruptor próprio. 'off' = a main (nada muda, nenhuma leitura a mais) · 'internal' = SÓ a lista exata da casa vê, em
 *  modo conferência, e NINGUÉM compra · 'public' = assinante elegível vê e compra. Nasce 'internal'. */
export type RecargaAssinanteRelease = 'off' | 'internal' | 'public'
export const RECARGA_ASSINANTE_1111_RELEASE: RecargaAssinanteRelease = 'public' // KINEO-RECARGA-ASSINANTE-PUBLICA-1111 — a CEO, depois da prova em tela da casa (régua: 30 dias ou 10 assinantes vendo; 0 compras com 10 vistos = rever o valor)

/** O SKU: ?pack= do checkout, metadata.pack da sessão (→ payment_success.metadata.pack) e checkout_*.metadata.sku. */
export const RECARGA_ASSINANTE_SKU = 'recarga_assinante_1111' as const
/** A campanha que viaja do clique ao payment_success (intent_campaign). */
export const RECARGA_ASSINANTE_CAMPAIGN = 'recarga_assinante_1111' as const
export const RECARGA_ASSINANTE_VERSION = 'recarga_assinante_v1_1111' as const

/** Eventos de SERVIDOR (com user_id; estão em SERVER_ONLY_EVENTS de app/api/events/route.ts). */
export const RECARGA_ASSINANTE_EVENTS = {
  shown: 'recarga_assinante_shown',
  clicked: 'recarga_assinante_clicked',
  checkoutStarted: 'recarga_assinante_checkout_started',
  paid: 'recarga_assinante_paid',
} as const

/** A rota da oferta (GET = a oferta; ?go=1 = o clique, que re-decide no servidor e leva ao checkout). */
export const RECARGA_ASSINANTE_API = '/api/billing/recarga-assinante'

/** Os planos que compram: os três pagos da escada, pela régua isPayingPlan do admin (o `_trial` — cortesia e teste — fica
 *  fora). 'creator'/'studio' são os nomes antigos de 'basic'/'pro' que o perfil ainda pode guardar. */
export const RECARGA_ASSINANTE_PLANS: readonly string[] = ['starter', 'basic', 'creator', 'pro', 'studio']

export interface RecargaAssinanteProfile {
  plan?: string | null
  stripe_subscription_id?: string | null
  video_credits?: number | null
}

/**
 * O assinante pode comprar? TODAS as condições, decididas no servidor com o perfil lido pela chave de serviço:
 *   · plano pago da escada, sem `_trial` (cortesia e teste não compram);
 *   · assinatura da Stripe ligada ao perfil (o checkout é da Stripe; o perfil só pode APAGAR esse vínculo, nunca forjá-lo —
 *     gatilho enforce_profile_client_guard);
 *   · saldo numérico ABAIXO do custo do filme mais barato (`minFilmCredits`, hoje o Seedance 1.5 de 15 s): não consegue
 *     gerar nada. Leitura nula ou estranha = não elegível.
 */
export function recargaAssinanteEligible(row: RecargaAssinanteProfile | null | undefined, minFilmCredits: number): boolean {
  if (!recargaAssinanteSubscriber(row)) return false
  const balance = row!.video_credits
  if (typeof balance !== 'number' || !Number.isFinite(balance)) return false
  if (!Number.isFinite(minFilmCredits) || minFilmCredits <= 0) return false
  return balance < minFilmCredits
}

/**
 * KINEO-RECARGA-ASSINANTE-1111 (barra, fundador 11/11 "só para assinantes") — quem pode comprar uma QUANTIDADE da barra:
 * o mesmo assinante pago (plano da escada sem _trial + assinatura da Stripe), sem exigir saldo zerado. Nesta primeira versão
 * a barra só é alcançável a partir do aviso de sem crédito.
 */
export function recargaAssinanteSubscriber(row: RecargaAssinanteProfile | null | undefined): boolean {
  if (!row) return false
  const plan = typeof row.plan === 'string' ? row.plan.trim().toLowerCase() : ''
  if (!RECARGA_ASSINANTE_PLANS.includes(plan)) return false
  if (typeof row.stripe_subscription_id !== 'string' || !row.stripe_subscription_id.trim()) return false
  return true
}


/**
 * Quem vê a oferta: 'real' = assinante elegível com o interruptor em 'public' · 'qa' = SÓ a lista exata da casa (house =
 * releaseVisible(email, 'internal'), nunca com o valor do interruptor), marcada como conferência e sem cobrança · 'hide' =
 * o resto. 'off' = 'hide' para todos, a casa incluída. Conta de fora NUNCA cai em 'qa'.
 */
export type RecargaAssinanteMode = 'real' | 'qa' | 'hide'
export function recargaAssinanteMode(a: { release: RecargaAssinanteRelease; house: boolean; eligible: boolean }): RecargaAssinanteMode {
  if (a.release === 'off') return 'hide'
  if (a.release === 'public' && a.eligible === true) return 'real'
  if (a.house === true) return 'qa'
  return 'hide'
}

/** O checkout pode abrir uma sessão? SÓ com 'public' e assinante elegível. Em 'internal' ninguém compra (nem a casa). */
export function recargaAssinanteCheckoutAllowed(release: RecargaAssinanteRelease, eligible: boolean): boolean {
  return release === 'public' && eligible === true
}

/**
 * A volta depois de pagar (ou desistir): o MESMO endereço em que a pessoa estava, com a ideia (?prompt=) preservada e SEM os
 * parâmetros que disparariam um render sozinho (autoanalyze/studio/create_intent/resume) nem restos de checkout. Só caminhos
 * do próprio site, das telas que geram; qualquer outra coisa vira '/studio'. Teto de tamanho para a URL da Stripe.
 * A tela nova entra como '/create/' (com a barra): só as abas /create/<aba>; o /create puro é a tela antiga, que ninguém
 * linka (guardião scripts/test-tela-nova-1011.mjs) — quem vier dali volta ao /studio.
 */
export const RECARGA_ASSINANTE_BACK_PREFIXES: readonly string[] = ['/studio', '/create/', '/generate', '/kids-cartoon'] // KINEO-ASSINANTE-COMPRA-SEMPRE-1211 — o desenho volta para o desenho
const BACK_DROP = ['autoanalyze', 'studio', 'create_intent', 'resume', 'session_id', 'success', 'checkout_error', 'recarga', 'pack', 'topup']
export function recargaAssinanteBack(raw: unknown, idea?: unknown): string {
  const fallback = '/studio'
  if (typeof raw !== 'string' || raw.length > 2000 || !raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\')) return withIdea(fallback, idea)
  let u: URL
  try { u = new URL(raw, 'https://kineo.invalid') } catch { return withIdea(fallback, idea) }
  if (u.origin !== 'https://kineo.invalid') return withIdea(fallback, idea)
  const okPath = RECARGA_ASSINANTE_BACK_PREFIXES.some((p) => (p.endsWith('/') ? u.pathname.startsWith(p) && u.pathname.length > p.length : u.pathname === p || u.pathname.startsWith(p + '/')))
  if (!okPath) return withIdea(fallback, idea)
  for (const k of BACK_DROP) u.searchParams.delete(k)
  return withIdea(`${u.pathname}${u.searchParams.toString() ? `?${u.searchParams.toString()}` : ''}`, idea)
}
function withIdea(path: string, idea: unknown): string {
  if (typeof idea !== 'string' || !idea.trim()) return path
  const u = new URL(path, 'https://kineo.invalid')
  if (!u.searchParams.get('prompt')) u.searchParams.set('prompt', idea.trim().slice(0, 1200))
  return `${u.pathname}?${u.searchParams.toString()}`
}
/** Junta um parâmetro ao fim de um caminho já limpo por recargaAssinanteBack. */
export function recargaAssinanteWithParam(path: string, key: string, value: string): string {
  return `${path}${path.includes('?') ? '&' : '?'}${key}=${value}`
}

/** O que a rota da oferta manda ao navegador (só exibição; o checkout re-decide tudo no servidor). */
/** `button` = o botão de 60 (só quem não paga o filme mais barato); a barra ("Need more?") vale para todo assinante que
 *  chegou ao aviso. */
export interface RecargaAssinanteOffer { show: true; qa: boolean; price: string; credits: number; go: string; button: boolean }

// ── textos (inglês, como o resto do aviso; o useUiCopy traduz o que tiver chave). {price}/{credits} da fonte única. ──
// A VERDADE, sem prometer o que o produto não cumpre: NÃO dizemos "os créditos não expiram". Pela regra de renovação
// (lib/credits/renewalBalance.ts) o saldo novo é cota + o que passa de UMA cota; 60 créditos comprados por quem zerou e não
// usados ANTES da renovação ficam abaixo da cota e somem nela. Até a renovação guardar o comprado à parte, o texto diz só
// o que é verdade: pagamento único, o plano não muda.
export const RECARGA_ASSINANTE_COPY = {
  cta: 'Add {credits} credits — {price}',
  terms: 'One-time payment. Your plan stays the same.',
  qa: 'House check — this button never charges',
  more: 'Need more? Choose your amount',
  paidWaiting: 'Payment received — adding your {credits} credits…',
  paidDone: 'Done — {credits} credits added. Your idea is still here.',
  paidLate: 'Payment received. Your credits can take a minute to appear — refresh in a moment.',
  // KINEO-BARRA-SEM-MOTOR-1111 — a barra conta em filmes curtos (o filme mais barato, recargaAssinanteMinFilmCredits), sem motor.
  films: '≈ {films} short films of 15 seconds',
} as const

export function recargaAssinanteFill(text: string, v: { price?: string; credits?: number }): string {
  return text.split('{price}').join(v.price ?? '').split('{credits}').join(String(v.credits ?? ''))
}
