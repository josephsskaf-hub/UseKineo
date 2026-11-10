// KINEO-REGIAO-PAGA-1011 [fundador 10/11: "3 ações para a gente conseguir vender mais… ações sem dinheiro"]
//
// O DEFEITO (banco, 7 dias até 10/11, sem contas da casa): das 59 contas que viram o aviso "região só paga", 26 viram a
// prévia grátis do PRÓPRIO tema (roteiro + cenas, /studio/previa) e 20 apertaram "Turn into a film". As 20 chegaram ao
// /pricing?from=scene_preview — e o /pricing IGNORA o `from`: tabela genérica, sem o filme dela, sem dizer qual plano
// faz aquele filme. 1 de 20 abriu o pagamento; 0 pagaram (5 semanas: 44 cliques no "Turn into a film", 0 pagantes).
//
// O CONSERTO (sem custo de fornecedor): no /pricing vindo da prévia, uma faixa no topo com as cenas que ela JÁ viu
// (lidas do evento scene_preview_shown — nada é gerado), a ideia dela, e o plano mais barato em destaque com o preço da
// tabela (TIER_PRICES via lib/marketingPrice) e quantos filmes iguais a esse ele faz. O botão leva ao checkout de sempre
// do Starter mensal. NÃO muda preço, país, cobrança, débito nem a política de filme grátis.
//
// MÓDULO PURO (sem import em tempo de execução): a rota, a faixa, a página e o guardião
// (scripts/test-regiao-paga-1011.mjs) leem as MESMAS regras.

/** Interruptor próprio. 'off' = ninguém · 'internal' = só a allowlist exata da casa (lib/recreate/access.ts →
 *  releaseVisible) · 'public' = toda conta elegível à prévia. Nasce 'internal'. */
export type RegiaoPagaRelease = 'off' | 'internal' | 'public'
export const REGIAO_PAGA_1011_RELEASE: RegiaoPagaRelease = 'internal'

/** O `from` que a prévia já põe no link dos planos (ScenePreviewClient → `/pricing?from=scene_preview`). */
export const REGIAO_PAGA_FROM = 'scene_preview'

/** Eventos de SERVIDOR (com user_id): faixa mostrada e clique no botão. */
export const REGIAO_PAGA_EVENTS = {
  shown: 'region_preview_pricing_shown',
  clicked: 'region_preview_pricing_clicked',
} as const

/** A campanha que viaja do clique ao checkout_started/payment_success (intent_campaign). */
export const REGIAO_PAGA_CAMPAIGN = 'region_preview_pricing_v1'

/** O checkout de sempre do Starter mensal (o mesmo href de lib/pricing.ts), com a campanha. */
export const REGIAO_PAGA_CHECKOUT_HREF = `/api/stripe/checkout?tier=starter&intent_campaign=${REGIAO_PAGA_CAMPAIGN}`

/** A rota da faixa: GET = dados (e o evento shown); GET ?go=1 = grava o clique e redireciona ao checkout. */
export const REGIAO_PAGA_STRIP_API = '/api/scene-preview/pricing-strip'

/** O /pricing monta a faixa? Só vindo da prévia e com o interruptor não-'off'. Desligado = a página de sempre. */
export function regiaoPagaStripMount(from: unknown, release: RegiaoPagaRelease = REGIAO_PAGA_1011_RELEASE): boolean {
  if (release === 'off') return false
  const f = Array.isArray(from) ? from[0] : from
  return f === REGIAO_PAGA_FROM
}

export interface RegiaoPagaScene { label: string; text: string; image: string }

/** As cenas da última prévia (metadata de scene_preview_shown) que dá para mostrar: imagem https do NOSSO bucket. */
export function regiaoPagaScenes(raw: unknown, supabaseUrl: string | null | undefined): RegiaoPagaScene[] {
  if (!Array.isArray(raw)) return []
  const base = typeof supabaseUrl === 'string' && /^https:\/\//.test(supabaseUrl) ? `${supabaseUrl.replace(/\/+$/, '')}/storage/v1/object/public/` : null
  const out: RegiaoPagaScene[] = []
  for (const s of raw) {
    if (!s || typeof s !== 'object') continue
    const x = s as { label?: unknown; text?: unknown; image?: unknown }
    if (typeof x.image !== 'string' || !base || !x.image.startsWith(base)) continue
    out.push({ label: typeof x.label === 'string' ? x.label.slice(0, 32) : '', text: typeof x.text === 'string' ? x.text.slice(0, 200) : '', image: x.image })
    if (out.length >= 4) break
  }
  return out
}

/**
 * A faixa aparece? Interruptor deixa esta conta ver + conta elegível à prévia (a régua de previaEligible, passada pela
 * rota) + existe uma prévia mostrada com pelo menos 1 cena com imagem. Qualquer dúvida = não mostra (página de sempre).
 */
export function regiaoPagaShow(args: { visible: boolean; eligible: boolean; scenes: readonly RegiaoPagaScene[] }): boolean {
  return args.visible === true && args.eligible === true && args.scenes.length > 0
}

/** Quantos filmes iguais ao da prévia (15 s) o plano faz por mês — inteiro, nunca arredondado para cima. */
export function regiaoPagaFilms(planCredits: number, filmCredits: number): number {
  if (!(planCredits > 0) || !(filmCredits > 0)) return 0
  return Math.floor(planCredits / filmCredits)
}

// ── textos (pt/en/es; o resto cai no inglês) — {price} = "$9/mo" da tabela; {films} = inteiro calculado ─────────────
export interface RegiaoPagaCopy { title: string; body: string; cta: string; other: string }
export const REGIAO_PAGA_COPY: { en: RegiaoPagaCopy; pt: RegiaoPagaCopy; es: RegiaoPagaCopy } = {
  en: {
    title: 'Your film is saved — one step left',
    body: 'Starter ({price}) makes this 15-second film from your script, and has credits for {films} films like it every month. After you pay, your script is waiting for you — one click to make it.',
    cta: 'Make my film with Starter — {price}',
    other: 'Or compare all plans below.',
  },
  pt: {
    title: 'Seu filme está guardado — falta um passo',
    body: 'O Starter ({price}) faz este filme de 15 segundos com o seu roteiro e tem créditos para {films} filmes como este por mês. Depois de pagar, o roteiro fica esperando por você — 1 clique para fazer.',
    cta: 'Fazer meu filme com o Starter — {price}',
    other: 'Ou compare todos os planos abaixo.',
  },
  es: {
    title: 'Tu película está guardada — falta un paso',
    body: 'Starter ({price}) hace esta película de 15 segundos con tu guion y tiene créditos para {films} películas como esta cada mes. Después de pagar, tu guion te espera — 1 clic para hacerla.',
    cta: 'Hacer mi película con Starter — {price}',
    other: 'O compara todos los planes abajo.',
  },
}

export function regiaoPagaFill(text: string, v: { price: string; films: number }): string {
  return text.split('{price}').join(v.price).split('{films}').join(String(v.films))
}
