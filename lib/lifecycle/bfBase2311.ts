// ═══ KINEO-BF-BASE-2311 — a carta da semana da Black Friday para a base (dono 23/11/2026: "manda sem filme") ═══════════════════
//
// SÓ E-MAIL, NENHUM RENDER. Meta da semana: 10 a 15 assinantes novos. Disparo MANUAL pela CEO (sem cron, fora do vercel.json):
// rota /api/admin/send-bf-base-2311 (ensaio por padrão; envio só com confirm=SEND, limit ≤ 150 e arm=a|b|both).
//
// A LISTA (régua desta carta; a rota lê o banco e entrega os fatos a bfBaseTrava, que decide):
//   · país rico: coalesce(signup_country, last_country) em BF_BASE_2311_PAISES;
//   · fez pelo menos um filme (vídeo concluído em `videos`);
//   · nunca pagou: has_paid === false (null = não sabemos = fora), sem stripe_subscription_id, sem paypal_subscription_id, sem
//     payment_success;
//   · não pediu para sair (email_opted_out); não é da casa (INTERNAL_EXACT_EMAILS exata ou domínio usekineo.com);
//   · não recebeu e-mail nosso nos últimos 7 dias (email_send_log ok e trial_emails_log; a rota soma a supressão da casa de 168 h);
//   · não recebeu ESTA carta (selo bf_base_2311_sent, para sempre);
//   · não é afiliado (tabela affiliates, por user_id ou e-mail) e não está em teste ativo (plano *_trial com trial_status active ou
//     courtesy, ou cortesia ativa em courtesy_grants com ends_at no futuro): "if you want to keep going" não serve a quem está de
//     plano grátis ativo. Teste encerrado/rebaixado e cortesia vencida ENTRAM. Quem abriu e cancelou checkout FICA (decisão da CEO).
//
// DUAS METADES para medir qual oferta vende (divisão determinística pelo id da conta, hash estável — nada sorteado na hora):
//   A → o Starter ANUAL pelo preço da Black Friday (página /black-friday; o preço entra pelo portão do checkout, bf2026CheckoutEligible).
//       A janela acaba em 01/12 (BF2026_ENDS_AT). Fora da janela a metade A NÃO sai (a rota confere bf2026Open).
//   B → metade do 1º mês do Creator MENSAL com o FIRST50 que JÁ existe. O botão vai DIRETO ao checkout do Creator mensal
//       (/api/stripe/checkout?tier=basic&billing=monthly&promo=FIRST50, o mesmo formato de offerCheckoutHref em lib/offers/studio50.ts),
//       nunca à /pricing: lá o FIRST50 iria junto para o Studio mensal, que o dono deixou sem desconto novo (revisão 23/11). O GET do
//       checkout leva quem está sem sessão ao cadastro/login com a compra inteira na URL e retoma a mesma compra (resumed=1); conta que
//       já assina é barrada lá ("You already have a Kineo subscription"). O código não tem prazo para o FIRST50: a carta B não fala em prazo.
// Nenhum desconto novo, nenhum cupom criado, nenhum preço digitado: todo número sai de lib/checkoutPricing.ts e de bf2026PriceRows().
//
// Módulo PURO (sem env, sem banco, sem rede): a rota e o guardião scripts/test-bf-base-2311.mjs executam a mesma régua.
import { BF2026_ENDS_AT, BF2026_PAGE_PATH, BF2026_TIME_ZONE, bf2026PriceRows, bf2026Usd } from '../billing/blackFriday2026'
import { TIER_CREDITS, TIER_PRICES, type CheckoutTier } from '../checkoutPricing'
import { CHECKOUT_RECOVERY_PROMO } from './checkoutRecoveryOffer'
import { contaDaCasaExata } from '../internalAccounts'
import { VOLTA_1211_FROM, VOLTA_1211_REPLY_TO, voltaTitulo } from '../growth/volta1211'

export const BF_BASE_2311_MARK = 'KINEO-BF-BASE-2311' as const
export const BF_BASE_2311_CAMPAIGN = 'bf_base_2311' as const
/** O selo: gravado ANTES do envio (id determinístico por conta = nunca duas vezes). Metadata { campaign, arm, ok, … }. */
export const BF_BASE_2311_SENT = 'bf_base_2311_sent' as const
/** Remetente e resposta: os da carta de volta (a caixa que a casa varre). */
export const BF_BASE_2311_FROM = VOLTA_1211_FROM
export const BF_BASE_2311_REPLY_TO = VOLTA_1211_REPLY_TO
/** Ninguém recebe 2 e-mails nossos em 7 dias. */
export const BF_BASE_2311_SUPPRESSION_DAYS = 7
export const BF_BASE_2311_SUPPRESSION_HOURS = BF_BASE_2311_SUPPRESSION_DAYS * 24
/** Teto por chamada de envio (o limit é obrigatório). */
export const BF_BASE_2311_BATCH_MAX = 150

/** Países de renda alta da carta (ordem do dono, 23/11). */
export const BF_BASE_2311_PAISES: readonly string[] = [
  'US', 'GB', 'CA', 'AU', 'DE', 'FR', 'NL', 'SE', 'NO', 'DK', 'CH', 'IE', 'NZ', 'AT', 'BE', 'FI', 'ES', 'IT', 'JP', 'SG', 'AE', 'IL', 'KR',
]

/**
 * FIRST50 = metade da 1ª fatura (cupom KINEO_FIRST50, percent_off 50, duration once, auto-provisionado em
 * app/api/stripe/checkout/route.ts e app/api/admin/send-comeback50/route.ts). Fração, não preço: o preço vem de TIER_PRICES.
 * O guardião confere que o checkout ainda cria o cupom com percent_off 50.
 */
export const BF_BASE_2311_FIRST50_FRACTION = 1 / 2

export type BfBaseArm = 'a' | 'b'
export type BfBaseArmParam = BfBaseArm | 'both'

/** O país da régua: coalesce(signup_country, last_country), normalizado (ISO alfa-2; vazio/XX/T1 = sem país). */
export function bfBasePais(signupCountry: unknown, lastCountry: unknown): string | null {
  const norm = (c: unknown): string | null => {
    if (typeof c !== 'string') return null
    const v = c.trim().toUpperCase()
    return /^[A-Z]{2}$/.test(v) && v !== 'XX' && v !== 'T1' ? v : null
  }
  // coalesce do SQL: o signup_country vence quando existe; só cai no last_country quando ele é nulo/vazio.
  const s = typeof signupCountry === 'string' && signupCountry.trim() ? signupCountry : null
  return s !== null ? norm(s) : norm(lastCountry)
}

/** Conta da casa: a lista EXATA (INTERNAL_EXACT_EMAILS) ou o domínio usekineo.com. */
export function bfBaseDaCasa(email: string): boolean {
  const e = email.trim().toLowerCase()
  return contaDaCasaExata(e) || /@(?:[a-z0-9-]+\.)*usekineo\.com$/.test(e)
}

export type BfBaseTrava =
  | 'sem_email' | 'casa' | 'pais_fora' | 'saiu' | 'pagou' | 'afiliado' | 'em_teste' | 'sem_filme' | 'ja_recebeu_esta' | 'email_7d'

/** Os fatos de UMA conta. A rota preenche; o guardião monta à mão. */
export type BfBasePessoa = {
  email: unknown
  signupCountry: unknown
  lastCountry: unknown
  emailOptedOut: unknown
  hasPaid: unknown
  stripeSubscriptionId: unknown
  paypalSubscriptionId: unknown
  /** payment_success em events. */
  paymentEvent?: boolean
  /** está na tabela affiliates (por user_id ou pelo e-mail). */
  isAffiliate?: boolean
  /** profiles.plan e profiles.trial_status. */
  plan?: unknown
  trialStatus?: unknown
  /** linhas de courtesy_grants da conta (status e ends_at). */
  courtesy?: ReadonlyArray<{ status: unknown; endsAt: unknown }>
  /** vídeos concluídos em `videos`. */
  films: number
  /** já tem o selo bf_base_2311_sent. */
  alreadyGotThis: boolean
  /** último e-mail nosso aceito (email_send_log ok, trial_emails_log), em ms; 0/null = nenhum. */
  lastEmailMs: number | null
  nowMs: number
}

const temValor = (v: unknown) => typeof v === 'string' ? v.trim().length > 0 : v !== null && v !== undefined && v !== false

/** As travas só de PERFIL (a rota usa antes de ler vídeos e e-mails). Ordem fixa: a 1ª que bate é a contada. */
export function bfBaseTravaPerfil(p: Pick<BfBasePessoa, 'email' | 'signupCountry' | 'lastCountry' | 'emailOptedOut' | 'hasPaid' | 'stripeSubscriptionId' | 'paypalSubscriptionId'>): BfBaseTrava | null {
  const email = typeof p.email === 'string' ? p.email.trim().toLowerCase() : ''
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'sem_email'
  if (bfBaseDaCasa(email)) return 'casa'
  const pais = bfBasePais(p.signupCountry, p.lastCountry)
  if (pais === null || !BF_BASE_2311_PAISES.includes(pais)) return 'pais_fora'
  if (p.emailOptedOut !== false && p.emailOptedOut !== null && p.emailOptedOut !== undefined) return 'saiu'
  // has_paid precisa ser false DE VERDADE: null = não sabemos = não escrever.
  if (p.hasPaid !== false || temValor(p.stripeSubscriptionId) || temValor(p.paypalSubscriptionId)) return 'pagou'
  return null
}

/** A régua inteira. null = entra na lista. */
export function bfBaseTrava(p: BfBasePessoa): BfBaseTrava | null {
  const perfil = bfBaseTravaPerfil(p)
  if (perfil) return perfil
  if (p.paymentEvent === true) return 'pagou'
  if (p.isAffiliate === true) return 'afiliado'
  if (bfBaseEmTeste(p)) return 'em_teste'
  if (!(Number.isFinite(p.films) && p.films >= 1)) return 'sem_filme'
  if (p.alreadyGotThis) return 'ja_recebeu_esta'
  const ultimo = typeof p.lastEmailMs === 'number' && Number.isFinite(p.lastEmailMs) ? p.lastEmailMs : 0
  if (ultimo > 0 && p.nowMs - ultimo < BF_BASE_2311_SUPPRESSION_DAYS * 86_400_000) return 'email_7d'
  return null
}

/** Em teste ativo: plano *_trial com trial_status active/courtesy, ou cortesia ativa (status active e ends_at no futuro). */
export function bfBaseEmTeste(p: Pick<BfBasePessoa, 'plan' | 'trialStatus' | 'courtesy' | 'nowMs'>): boolean {
  const plan = typeof p.plan === 'string' ? p.plan.trim().toLowerCase() : ''
  const ts = typeof p.trialStatus === 'string' ? p.trialStatus.trim().toLowerCase() : ''
  if (plan.endsWith('_trial') && (ts === 'active' || ts === 'courtesy')) return true
  return (p.courtesy ?? []).some((g) => {
    const fim = Date.parse(String(g.endsAt ?? ''))
    return String(g.status ?? '').trim().toLowerCase() === 'active' && Number.isFinite(fim) && fim > p.nowMs
  })
}

/** Hash estável (FNV-1a 32 bits + finalizador do murmur3) — sem relógio, sem sorteio, sem dependência. */
function hash32(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b)
  h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35)
  h ^= h >>> 16
  return h >>> 0
}

/** A metade da conta: mesmo id, mesma metade, sempre. */
export function bfBaseMetade(userId: string): BfBaseArm {
  return (hash32(`${BF_BASE_2311_CAMPAIGN}:${String(userId).trim().toLowerCase()}`) & 1) === 0 ? 'a' : 'b'
}

/** Id do selo (uuid v4 de forma, derivado do id da conta): o 2º insert bate na chave primária e a conta não recebe de novo. */
export function bfBaseClaimId(sha256Hex: (s: string) => string, userId: string): string {
  const h = sha256Hex(`${BF_BASE_2311_SENT}:${userId}`)
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`
}

const utm = (arm: BfBaseArm) => `utm_source=email&utm_campaign=${BF_BASE_2311_CAMPAIGN}&utm_content=arm_${arm}`
const semBarra = (app: string) => app.replace(/\/+$/, '')

/** Link A: a página da Black Friday (o preço entra pelo portão do checkout). */
export function bfBaseLinkA(app: string): string {
  return `${semBarra(app)}${BF2026_PAGE_PATH}?${utm('a')}`
}

/** O plano da metade B: só o Creator (o FIRST50 também valeria no Studio mensal, que fica sem desconto novo). */
export const BF_BASE_2311_TIER_B: CheckoutTier = 'basic'

/** Link B: DIRETO ao checkout do Creator mensal com o FIRST50, no formato dos links de oferta da casa (offerCheckoutHref,
 *  bf2026CheckoutHref): tier, billing, promo e intent_campaign (que o checkout grava em checkout_started), mais os três utm. */
export function bfBaseLinkB(app: string): string {
  return `${semBarra(app)}/api/stripe/checkout?tier=${BF_BASE_2311_TIER_B}&billing=monthly&promo=${CHECKOUT_RECOVERY_PROMO}` +
    `&intent_campaign=${BF_BASE_2311_CAMPAIGN}_arm_b&${utm('b')}`
}

/** O último dia da oferta A, na data de Nova York, lido de BF2026_ENDS_AT (fim exclusivo → 1 ms antes). Ex.: "Tuesday, Dec 1". */
export function bfBaseFimA(): string {
  const ultimo = new Date(Date.parse(BF2026_ENDS_AT) - 1)
  return new Intl.DateTimeFormat('en-US', { timeZone: BF2026_TIME_ZONE, weekday: 'long', month: 'short', day: 'numeric' }).format(ultimo)
}

/** Os números da oferta A, todos do código. */
export function bfBaseNumerosA() {
  const starter = bf2026PriceRows().find((r) => r.tier === 'starter')
  if (!starter) throw new Error('bf_base_2311: Starter fora da Black Friday — a carta A não pode sair')
  return { name: starter.name, price: bf2026Usd(starter.bfMinor), twelveMonthly: bf2026Usd(starter.twelveMonthlyMinor), credits: starter.credits }
}

/** Os números da oferta B, todos do código: Creator mensal e a metade do FIRST50. */
export function bfBaseNumerosB() {
  const cheio = TIER_PRICES[BF_BASE_2311_TIER_B].usd
  return { name: 'Creator', full: bf2026Usd(cheio), first: bf2026Usd(Math.round(cheio * BF_BASE_2311_FIRST50_FRACTION)), credits: TIER_CREDITS.basic }
}

type Carta = { subject: string; lines: string[]; button: string; link: string }
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function cartaA(film: string | null, app: string): Carta {
  const n = bfBaseNumerosA()
  const f = film ? `“${film}”` : null
  return {
    subject: f ? `About your film ${f}: Black Friday on Kineo` : 'About the film you made on Kineo: Black Friday',
    lines: [
      'Hi,',
      `You made ${f ?? 'a film'} on Kineo. For Black Friday, the yearly ${n.name} plan is ${n.price} for the whole year (${n.twelveMonthly} if paid month by month), through ${bfBaseFimA()} (New York time).`,
      `It renews at that same price, and ${n.credits} credits arrive every month for your next films.`,
    ],
    button: 'See the Black Friday price',
    link: bfBaseLinkA(app),
  }
}

function cartaB(film: string | null, app: string): Carta {
  const n = bfBaseNumerosB()
  const f = film ? `“${film}”` : null
  return {
    subject: f ? `About your film ${f}: half off your first month` : 'About the film you made on Kineo: half off your first month',
    lines: [
      'Hi,',
      `You made ${f ?? 'a film'} on Kineo. If you want to keep going, your first month of ${n.name} is ${n.first} instead of ${n.full}, applied automatically through this link.`,
      `${n.name} is a monthly plan with ${n.credits} credits a month. The discount covers only the first month; after that it is ${n.full} a month.`,
    ],
    button: 'Get half off my first month',
    link: bfBaseLinkB(app),
  }
}

/** Assunto + texto + HTML de uma metade. O rodapé de descadastro vem do chamador (emailFooterText/emailFooterHtml(userId)). */
export function bfBaseCarta(input: { arm: BfBaseArm; filmTitle?: unknown; filmTopic?: unknown; app: string; footer: { text: string; html: string } }): { subject: string; text: string; html: string; link: string } {
  const film = voltaTitulo(input.filmTitle ?? null, input.filmTopic ?? null)
  const c = input.arm === 'a' ? cartaA(film, input.app) : cartaB(film, input.app)
  const assina = '— The Kineo team'
  const text = [...c.lines.flatMap((l) => [l, '']), `${c.button}: ${c.link}`, '', assina, '', input.footer.text].join('\n')
  const html = `<div style="font-family:Arial,sans-serif;font-size:16px;line-height:1.5;color:#111;max-width:520px">${c.lines.map((l) => `<p style="margin:0 0 14px">${esc(l)}</p>`).join('')}<p style="margin:22px 0"><a href="${esc(c.link)}" style="display:inline-block;background:#111;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:700">${esc(c.button)}</a></p><p style="margin:0 0 14px;color:#555">${esc(assina)}</p>${input.footer.html}</div>`
  return { subject: c.subject, text, html, link: c.link }
}

export type BfBasePedido =
  | { modo: 'DRY_RUN'; arm: BfBaseArmParam }
  | { modo: 'SEND'; arm: BfBaseArmParam; limit: number }
  | { erro: string; status: number }

/** Lê os parâmetros. Sem confirm=SEND exato → ENSAIO (nada sai, nada se grava). Envio pede limit 1..150 e arm=a|b|both. */
export function bfBasePedido(params: { confirm: string | null; limit: string | null; arm: string | null }): BfBasePedido {
  const armRaw = (params.arm ?? '').trim().toLowerCase()
  const armOk = armRaw === 'a' || armRaw === 'b' || armRaw === 'both'
  if (params.confirm !== 'SEND') return { modo: 'DRY_RUN', arm: armOk ? (armRaw as BfBaseArmParam) : 'both' }
  if (!armOk) return { erro: 'arm obrigatório no envio: a, b ou both. Nada foi enviado.', status: 400 }
  const raw = (params.limit ?? '').trim()
  const n = /^\d+$/.test(raw) ? Number(raw) : NaN
  if (!Number.isInteger(n) || n < 1) return { erro: 'limit obrigatório no envio (1 a 150). Nada foi enviado.', status: 400 }
  if (n > BF_BASE_2311_BATCH_MAX) return { erro: `limit acima do teto de ${BF_BASE_2311_BATCH_MAX} por chamada. Nada foi enviado.`, status: 400 }
  return { modo: 'SEND', arm: armRaw as BfBaseArmParam, limit: n }
}

/** A metade entra nesta chamada? (arm pedido × metade da conta) */
export function bfBaseArmPedido(pedido: BfBaseArmParam, arm: BfBaseArm): boolean {
  return pedido === 'both' || pedido === arm
}
