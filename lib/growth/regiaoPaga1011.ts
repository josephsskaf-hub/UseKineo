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
export const REGIAO_PAGA_1011_RELEASE: RegiaoPagaRelease = 'public' // KINEO-REGIAO-PAGA-ABRE-1011 — conferido logado pela casa em 10/11 18:56; voltar a 'internal' ou 'off' desfaz

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

// ── (2) quem vê o quê: cliente de verdade, conferência da casa, ou nada ─────────────────────────────────────────────
/**
 * O interruptor abre para esta conta? `house` = releaseVisible(email, 'internal') — a allowlist EXATA da casa, calculada
 * SEMPRE com 'internal' (nunca com o valor do interruptor), para que 'public' jamais transforme cliente em casa.
 */
export function regiaoPagaSwitchOpen(release: RegiaoPagaRelease, house: boolean): boolean {
  return release === 'public' || (release === 'internal' && house === true)
}

/**
 * 'real' = conta de região elegível à prévia, com o interruptor aberto para ela · 'qa' = conferência: SÓ a allowlist exata
 * da casa, que não é de região (vê a própria última prévia ou a amostra marcada "QA sample") · 'hide' = o resto.
 * Interruptor 'off' = 'hide' para todos, a casa incluída. Conta de fora NUNCA cai em 'qa', em nenhum valor do interruptor.
 */
export type RegiaoPagaMode = 'real' | 'qa' | 'hide'
export function regiaoPagaMode(a: { release: RegiaoPagaRelease; house: boolean; eligible: boolean; previaPublic: boolean }): RegiaoPagaMode {
  if (a.release === 'off') return 'hide'
  if (a.previaPublic === true && a.eligible === true && regiaoPagaSwitchOpen(a.release, a.house)) return 'real'
  if (a.house === true) return 'qa'
  return 'hide'
}

/** Amostra de conferência (só a casa, sem prévia própria): pôsteres públicos da casa, marcados "QA sample" na tela. */
export const REGIAO_PAGA_QA_SAMPLE: { idea: string; scenes: RegiaoPagaScene[] } = {
  idea: 'QA sample — not a customer preview',
  scenes: [
    { label: 'HOOK', text: 'QA sample scene 1', image: '/posters/04189a48-45f7-45f4-b98c-27832702e837.jpg' },
    { label: 'MICRO REWARD 1', text: 'QA sample scene 2', image: '/posters/26d25419-6719-47ab-b24b-df214e007fbd.jpg' },
    { label: 'MICRO REWARD 2', text: 'QA sample scene 3', image: '/posters/33249fbf-57b6-47cf-8486-88bfb2a02db1.jpg' },
    { label: 'PAYOFF', text: 'QA sample scene 4', image: '/posters/36a04f7b-65f7-42d9-a2ab-198b5a7f115e.jpg' },
  ],
}

/** Onde a faixa está: o /pricing vindo da prévia, ou a própria prévia recusada pelo limite (mudança 3). */
export type RegiaoPagaSurface = 'pricing' | 'preview_limit'
export function regiaoPagaSurface(raw: unknown): RegiaoPagaSurface {
  return raw === 'preview_limit' ? 'preview_limit' : 'pricing'
}
/** Recusas da prévia que mostram a faixa (as de limite; as outras dizem "tente de novo" e continuam como estão). */
export const REGIAO_PAGA_LIMIT_REASONS: readonly string[] = ['daily_limit', 'total_limit', 'global_limit']

/** Quantos filmes iguais ao da prévia (15 s) o plano faz por mês — inteiro, nunca arredondado para cima. */
export function regiaoPagaFilms(planCredits: number, filmCredits: number): number {
  if (!(planCredits > 0) || !(filmCredits > 0)) return 0
  return Math.floor(planCredits / filmCredits)
}

// ── textos (pt/en/es; o resto cai no inglês) — {price} = "$9/mo" da tabela; {films} = inteiro calculado ─────────────
// (2) "{films} films of 15 seconds": créditos do Starter (TIER_CREDITS) ÷ custo pago do Seedance 1.5 de 15 s
// (creditCostForDuration('cinematic_ai', true, 15)) — conferido no relatório; o Seedance não é motor só-Studio
// (lib/enginePlanGate.ts). A frase "faz ESTE filme" saiu: a rota do filme pode recusar (sem cobrar) roteiro que não cabe em 15 s.
// "your idea and script stay saved — one click away after you pay" é a MESMA promessa que a tela da prévia já faz (toFilmHint).
export interface RegiaoPagaCopy { title: string; body: string; cta: string; other: string; seeAll: string; qa: string }
export const REGIAO_PAGA_COPY: { en: RegiaoPagaCopy; pt: RegiaoPagaCopy; es: RegiaoPagaCopy } = {
  en: {
    title: 'Your film is saved — one step left',
    body: 'Starter ({price}) has credits for {films} films of 15 seconds like this one every month. Your idea and script stay saved — the film is one click away after you pay.',
    cta: 'Make my film with Starter — {price}',
    other: 'Or compare all plans below.',
    seeAll: 'See all plans',
    qa: 'QA sample — only the Kineo team sees this',
  },
  pt: {
    title: 'Seu filme está guardado — falta um passo',
    body: 'O Starter ({price}) tem créditos para {films} filmes de 15 segundos como este por mês. A sua ideia e o roteiro ficam guardados — o filme sai com 1 clique depois de pagar.',
    cta: 'Fazer meu filme com o Starter — {price}',
    other: 'Ou compare todos os planos abaixo.',
    seeAll: 'Ver todos os planos',
    qa: 'Amostra de conferência — só a equipe da Kineo vê',
  },
  es: {
    title: 'Tu película está guardada — falta un paso',
    body: 'Starter ({price}) tiene créditos para {films} películas de 15 segundos como esta cada mes. Tu idea y el guion quedan guardados — la película sale con 1 clic después de pagar.',
    cta: 'Hacer mi película con Starter — {price}',
    other: 'O compara todos los planes abajo.',
    seeAll: 'Ver todos los planes',
    qa: 'Muestra de control — solo el equipo de Kineo la ve',
  },
}

export function regiaoPagaFill(text: string, v: { price: string; films: number }): string {
  return text.split('{price}').join(v.price).split('{films}').join(String(v.films))
}

// ── (2) mudança 2: o aviso de região com a prévia na manchete ──────────────────────────────────────────────────────
// Verdade do fluxo (/studio/previa + app/api/scene-preview): roteiro + 3–4 imagens das cenas, sem vídeo e sem voz, com os
// tetos de sempre (3 por conta, 1 por dia, 200 por dia no total). O subtítulo usa as palavras da própria tela da prévia
// (PREVIA_COPY.sub) e mantém escrito que o filme grátis não está disponível no país — só deixa de ser a manchete.
export interface RegiaoPagaBannerCopy { title: string; body: string }
export const REGIAO_PAGA_BANNER_COPY: { en: RegiaoPagaBannerCopy; pt: RegiaoPagaBannerCopy; es: RegiaoPagaBannerCopy } = {
  en: {
    title: 'Write your idea — see your film’s script and scenes free',
    body: 'Kineo writes the script and shows your scenes as images — free. The free film is not available in your country yet; plans work normally.',
  },
  pt: {
    title: 'Escreva sua ideia — veja o roteiro e as cenas do seu filme, grátis',
    body: 'A Kineo escreve o roteiro e mostra as suas cenas em imagens — grátis. O filme grátis ainda não está disponível no seu país; os planos funcionam normalmente.',
  },
  es: {
    title: 'Escribe tu idea — mira el guion y las escenas de tu película, gratis',
    body: 'Kineo escribe el guion y muestra tus escenas en imágenes — gratis. La película gratis todavía no está disponible en tu país; los planes funcionan con normalidad.',
  },
}
/** Metadata a mais nos eventos do aviso invertido (o aviso de sempre não ganha campo nenhum). */
export const REGIAO_PAGA_BANNER_VARIANT = 'preview_first' as const
/**
 * O aviso invertido liga? Só com o interruptor em 'public'. O aviso só existe para conta de região (regionPaidOnlyNoticeVisible),
 * e conta da casa não é de região: em 'internal' não há quem o veja — por isso não se calcula allowlist aqui (o layout fica
 * intocado). Em 'off': o aviso de sempre.
 */
export const REGIAO_PAGA_BANNER_PREVIEW_FIRST: boolean = regiaoPagaSwitchOpen(REGIAO_PAGA_1011_RELEASE, false)
