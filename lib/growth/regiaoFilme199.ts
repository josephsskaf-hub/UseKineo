// KINEO-REGIAO-FILME-199-1011 [fundador 10/11: "1.99 1 filme!"]
//
// O QUE É: para conta de Índia, Paquistão e Nigéria que nasceu sem filme grátis ('region_paid_only') e nunca pagou, a
// faixa do /pricing vindo da prévia (components/PreviewPricingStrip.tsx) troca o botão principal por "um filme de 15 s por
// US$ 1,99, pagamento único" — o Starter desce para secundário. Uma vez por conta. USD para todos.
//
// POR QUÊ: 903 contas desses 3 países, 2 compras na história; o passe de US$ 4,99 (lib/regionPass.ts, 08/10–04/11) vendeu
// 0. O sinal forte é a prévia: 77% de quem vê a prévia do próprio tema clica "Turn into a film" e cai no /pricing. Pagamento
// único evita a renovação de cartão indiano em dólar.
//
// ONDE MORA CADA COISA (fonte única):
//   · preço e créditos .... lib/checkoutPricing.ts (REGIAO_FILME_199_PRICE_MINOR, regiaoFilme199Credits — derivado de
//                           creditCostForDuration, nunca digitado; regiaoFilme199PriceLabel para texto);
//   · quem pode ........... ESTE módulo (regiaoFilme199Eligible), lido pela faixa (rota) E pelo checkout;
//   · cobrança ............ lib/stripe/regiaoFilme199Checkout.ts (?pack=region_film_199);
//   · concessão ........... app/api/stripe/webhook/route.ts (Path A, guard por sessão; créditos da fonte única).
//
// MÓDULO PURO (sem import em tempo de execução): a rota, o checkout, a faixa e o guardião
// (scripts/test-regiao-filme-199-1011.mjs) leem as MESMAS regras.

/** Interruptor próprio. 'off' = a main (nada muda) · 'internal' = SÓ a allowlist exata da casa vê a oferta, marcada como
 *  conferência, e NINGUÉM compra · 'public' = conta elegível vê e compra. Nasce 'internal'. */
export type RegiaoFilme199Release = 'off' | 'internal' | 'public'
export const REGIAO_FILME_199_RELEASE: RegiaoFilme199Release = 'internal'

/** Os 3 países da decisão (ISO-3166 alfa-2, maiúsculas). */
export const REGIAO_FILME_199_COUNTRIES: readonly string[] = ['IN', 'PK', 'NG']

/** O carimbo de conta de quem nasceu sem filme grátis (o MESMO de lib/freeFilmPolicy.ts REGION_PAID_ONLY_TRIAL_STATUS —
 *  repetido aqui para o módulo seguir puro; o guardião confere a igualdade). */
export const REGIAO_FILME_199_TRIAL_STATUS = 'region_paid_only'

/** O SKU: ?pack= do checkout, metadata.pack da sessão (→ payment_success.metadata.pack) e checkout_*.metadata.sku. */
export const REGIAO_FILME_199_SKU = 'region_film_199' as const

/** A campanha que viaja do clique ao payment_success (intent_campaign). */
export const REGIAO_FILME_199_CAMPAIGN = 'region_film_199' as const
export const REGIAO_FILME_199_VERSION = 'regiao_filme_199_1011' as const

/** Eventos de SERVIDOR (com user_id; estão em SERVER_ONLY_EVENTS de app/api/events/route.ts). */
export const REGIAO_FILME_199_EVENTS = {
  shown: 'region_film_199_shown',
  clicked: 'region_film_199_clicked',
  checkoutStarted: 'region_film_199_checkout_started',
  paid: 'region_film_199_paid',
} as const

/** O checkout (só o SERVIDOR decide preço e quem compra; a URL não carrega valor nenhum). */
export const REGIAO_FILME_199_CHECKOUT_HREF = `/api/stripe/checkout?pack=${REGIAO_FILME_199_SKU}&intent_campaign=${REGIAO_FILME_199_CAMPAIGN}`

/** A volta depois de pagar: o Studio com a volta do pacote (resume=wall_v1&pack=…&session_id= espera o crédito cair) no
 *  motor e na duração do filme comprado, "Use my script as is". O roteiro volta pelo navegador (a faixa grava o rascunho
 *  na mesma aba antes de sair para a Stripe) e, em qualquer outra visita, pelo aviso da prévia do painel. */
export const REGIAO_FILME_199_SUCCESS_PATH = `/studio/create?resume=wall_v1&pack=${REGIAO_FILME_199_SKU}&engine=seedance&duration=15&script_mode=verbatim`
/** Desistiu na Stripe: volta à mesma faixa. */
export const REGIAO_FILME_199_CANCEL_PATH = '/pricing?from=scene_preview'
/** Quem não é elegível e chega ao checkout com a URL na mão: o /pricing normal, nunca uma cobrança. */
export const REGIAO_FILME_199_REFUSED_PATH = '/pricing'

/** País do perfil — a MESMA regra de lib/lifecycle/regionFirstFilmEmail.ts paisDoPerfil: signup_country, senão
 *  last_country; alfa-2 válido, sem os marcadores XX/T1. NUNCA do navegador nem do IP do pedido. */
export function regiaoFilme199Country(p: { signup_country?: unknown; last_country?: unknown } | null | undefined): string | null {
  for (const raw of [p?.signup_country, p?.last_country]) {
    if (typeof raw !== 'string') continue
    const c = raw.trim().toUpperCase()
    if (/^[A-Z]{2}$/.test(c) && c !== 'XX' && c !== 'T1') return c
  }
  return null
}

export interface RegiaoFilme199Profile {
  trial_status?: string | null
  has_paid?: boolean | null
  plan?: string | null
  signup_country?: string | null
  last_country?: string | null
}

/**
 * KINEO-REGIAO-FILME-199-TRAVA-1111 — a PROVA DE SERVIDOR (o bloqueador da revisão de 11/11). O perfil sozinho não basta:
 * pela política "Users own profile" e o gatilho enforce_profile_client_guard, o navegador da própria pessoa pode TROCAR
 * trial_status, signup_country e last_country, BAIXAR has_paid de true para false e BAIXAR o plano para 'free' — qualquer
 * conta viraria "região/IN/nunca pagou". A tabela `events` não aceita escrita do navegador (RLS só com SELECT negado; os
 * nomes abaixo estão em SERVER_ONLY_EVENTS), então a prova vem de lá:
 *   · `trial_region_excluded` — gravado pelo SERVIDOR no cadastro, quando ele carimbou a conta sem filme grátis
 *     (lib/reverseTrial.ts), com o país do pedido de cadastro em metadata.country: tem de estar em IN/PK/NG;
 *   · nenhum `payment_success` na história (qualquer compra, inclusive assinatura que já acabou);
 *   · nenhum `region_film_199_paid` (o "uma vez por conta").
 * Leitura que falha = null = não elegível.
 */
export const REGIAO_FILME_199_REGION_EVENT = 'trial_region_excluded' as const
export interface RegiaoFilme199Prova {
  /** metadata.country do PRIMEIRO trial_region_excluded da conta (ou null se não houver) */
  regionCountry: string | null
  /** existe payment_success ou region_film_199_paid desta conta */
  everPaid: boolean
}
export function regiaoFilme199ProvaDe(regionRow: { metadata?: unknown } | null | undefined, paidRows: unknown[] | null | undefined): RegiaoFilme199Prova | null {
  if (!Array.isArray(paidRows)) return null
  const raw = (regionRow?.metadata as { country?: unknown } | null | undefined)?.country
  const regionCountry = typeof raw === 'string' && /^[A-Za-z]{2}$/.test(raw.trim()) ? raw.trim().toUpperCase() : null
  return { regionCountry, everPaid: paidRows.length > 0 }
}

/**
 * A conta pode comprar? TODAS as condições, decididas no servidor:
 *   · perfil (lido pela chave de serviço): 'region_paid_only', país do perfil em IN/PK/NG, has_paid === false, plano grátis;
 *   · prova de servidor (regiaoFilme199ProvaDe): o carimbo de região do cadastro com país em IN/PK/NG, nenhum pagamento na
 *     história, nenhuma compra deste SKU. Sem prova (leitura falhou) = não elegível.
 */
export function regiaoFilme199Eligible(row: RegiaoFilme199Profile | null | undefined, prova: RegiaoFilme199Prova | null): boolean {
  if (!row || row.trial_status !== REGIAO_FILME_199_TRIAL_STATUS) return false
  if (row.has_paid !== false) return false
  const plan = typeof row.plan === 'string' ? row.plan.trim().toLowerCase() : 'free'
  if (plan !== 'free' && plan !== '') return false
  const country = regiaoFilme199Country(row)
  if (!country || !REGIAO_FILME_199_COUNTRIES.includes(country)) return false
  if (!prova || prova.everPaid !== false) return false
  return !!prova.regionCountry && REGIAO_FILME_199_COUNTRIES.includes(prova.regionCountry)
}

/**
 * Quem vê a oferta na faixa: 'real' = conta elegível com o interruptor em 'public' · 'qa' = SÓ a allowlist exata da casa
 * (house = releaseVisible(email, 'internal'), nunca com o valor do interruptor), marcada como conferência · 'hide' = o
 * resto. 'off' = 'hide' para todos, a casa incluída. Conta de fora NUNCA cai em 'qa'.
 */
export type RegiaoFilme199Mode = 'real' | 'qa' | 'hide'
export function regiaoFilme199Mode(a: { release: RegiaoFilme199Release; house: boolean; eligible: boolean }): RegiaoFilme199Mode {
  if (a.release === 'off') return 'hide'
  if (a.release === 'public' && a.eligible === true) return 'real'
  if (a.house === true) return 'qa'
  return 'hide'
}

/** O checkout pode abrir uma sessão? SÓ com 'public' e conta elegível. Em 'internal' ninguém compra (nem a casa, que não é
 *  conta de região); em 'off' o SKU não existe. */
export function regiaoFilme199CheckoutAllowed(release: RegiaoFilme199Release, eligible: boolean): boolean {
  return release === 'public' && eligible === true
}

/** O que a rota da faixa manda ao navegador (só exibição; o checkout re-decide tudo no servidor). */
/** `balance` = saldo antes de pagar: a régua da volta do pacote (WALL_V1_PACK_BALANCE_KEY) — o Studio só libera o Generate
 *  quando o saldo passar dela, isto é, quando o webhook concedeu. */
export interface RegiaoFilme199Offer { price: string; credits: number; seconds: number; go: string; qa: boolean; balance: number | null }

// ── textos (en/pt/es — as línguas que a faixa já tem). {price} = regiaoFilme199PriceLabel(); {seconds} da fonte única. ──
// A verdade, sem prometer "este filme exato": a rota do filme pode recusar (sem cobrar) roteiro longo para 15 s.
export interface RegiaoFilme199Copy { kicker: string; title: string; body: string; cta: string; starter: string }
export const REGIAO_FILME_199_COPY: { en: RegiaoFilme199Copy; pt: RegiaoFilme199Copy; es: RegiaoFilme199Copy } = {
  en: {
    kicker: 'ONE FILM · ONE-TIME PAYMENT',
    title: 'Your film for {price}',
    body: 'One {seconds}-second film from your idea, one-time payment, no subscription. Your idea and script stay saved — the film is one click away after you pay.',
    cta: 'Make my film — {price}',
    starter: 'Or Starter ({starterPrice}) — {films} films of 15 seconds every month',
  },
  pt: {
    kicker: 'UM FILME · PAGAMENTO ÚNICO',
    title: 'Seu filme por {price}',
    body: 'Um filme de {seconds} segundos a partir da sua ideia, pagamento único, sem assinatura. A sua ideia e o roteiro ficam guardados — o filme sai com 1 clique depois de pagar.',
    cta: 'Fazer meu filme — {price}',
    starter: 'Ou o Starter ({starterPrice}) — {films} filmes de 15 segundos por mês',
  },
  es: {
    kicker: 'UNA PELÍCULA · PAGO ÚNICO',
    title: 'Tu película por {price}',
    body: 'Una película de {seconds} segundos a partir de tu idea, pago único, sin suscripción. Tu idea y el guion quedan guardados — la película sale con 1 clic después de pagar.',
    cta: 'Hacer mi película — {price}',
    starter: 'O Starter ({starterPrice}) — {films} películas de 15 segundos al mes',
  },
}

export function regiaoFilme199Fill(text: string, v: { price: string; seconds: number; starterPrice: string; films: number }): string {
  return text.split('{price}').join(v.price).split('{seconds}').join(String(v.seconds)).split('{starterPrice}').join(v.starterPrice).split('{films}').join(String(v.films))
}
