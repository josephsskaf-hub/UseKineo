// ═══ KINEO-EMAILS-VENDA-2026-10-13 — AÇÃO 2: "seu filme está pronto — quer a versão de 60 s?" ═══════════════════════
//
// POR QUÊ (fundador 13/10, "tudo sim"): 242 contas grátis dos últimos 30 dias fizeram o filme grátis e não pagaram
// (medido 13/10, contas externas, has_paid=false, plano free, ≥1 vídeo completed). A lição registrada da casa manda na
// forma: "CRÉDITO NÃO É ISCA — winback-25 deu 25 cr a 95 pessoas e teve ZERO cliques; a isca é o FILME PRONTO". Então
// esta carta não dá crédito nenhum: ela NOMEIA o filme que a pessoa fez, leva até ele (área logada) e oferece a versão de
// 60 s pelo Creator com os 20% do 1º mês que o site inteiro já anuncia.
//
// AS QUATRO VERDADES QUE A CARTA CARREGA (nada digitado):
//   · o filme: título vindo de `pickMomentumTopic` (a régua da casa que recusa ordem de ChatGPT, markdown e rótulo de
//     produção); sem título aproveitável, a carta diz "the film you made" e não inventa nome;
//   · onde ver: `/history` — tela LOGADA (o middleware manda para /login quem não tem sessão) que lê só os vídeos do
//     dono por RLS. A página pública `/v/<id>` está fechada por privacidade desde a contenção (app/v/[id]/page.tsx,
//     "owners use authenticated dashboard pages") e NUNCA aparece aqui — nem o MP4 cru, nem o id do vídeo;
//   · o preço: `buyCreatorPrice()` (lib/growth/buyCreatorOffer.ts → TIER_PRICES + WELCOME20_PERCENT_OFF). Com o
//     interruptor WELCOME20_SITE_OFFER_LIVE desligado, os 20% somem da carta no mesmo deploy;
//   · a compra: /api/stripe/checkout?tier=basic&billing=monthly&intent_campaign=winback_film_60s — o MESMO link do
//     botão "Get Creator" das páginas que vendem, SEM ?promo= e SEM recovery=1 (os dois fariam
//     welcome20AutoSkipReason pular o desconto automático). Funciona logado e como convidado (a Stripe coleta o e-mail
//     e o webhook acha a conta pelo e-mail — KINEO-COMPRA-SEM-LOGIN-2026-10-06).
//
// MÓDULO PURO (sem env, sem banco, sem rede): a rota app/api/admin/send-winback-film-60s e o guardião
// scripts/test-emails-venda-2026-10-13.mjs executam as MESMAS funções.
import { buyCreatorPrice, creatorSeedanceFilms, BUY_CREATOR_FILM_SECONDS } from './buyCreatorOffer'
import { pickMomentumTopic } from '../momentumTopic'

export const WINBACK_FILM_60S_MARK = 'KINEO-EMAILS-VENDA-2026-10-13' as const
/** utm_campaign e intent_campaign (o checkout aceita só [A-Za-z0-9._~-]{1,100}). */
export const WINBACK_FILM_60S_CAMPAIGN = 'winback_film_60s' as const
/** Carimbo de ENVIO (entra em LIFECYCLE_EMAIL_EVENT_NAMES e em SERVER_ONLY_EVENTS no mesmo commit). */
export const WINBACK_FILM_60S_SENT = 'winback_film_60s_emailed' as const
/** Reserva atômica por pessoa (id determinístico): dois cliques simultâneos no link de envio não mandam duas cartas. */
export const WINBACK_FILM_60S_CLAIM = 'winback_film_60s_claimed' as const
export const WINBACK_FILM_60S_FROM = 'Kineo Team <hello@usekineo.com>' as const
export const WINBACK_FILM_60S_REPLY_TO = 'hello@usekineo.com' as const
/** Janela de cadastro da coorte (dias). A rota aceita ?days= até o teto. */
export const WINBACK_FILM_60S_DAYS_DEFAULT = 30
export const WINBACK_FILM_60S_DAYS_MAX = 60
/** Lote por chamada: padrão e teto. */
export const WINBACK_FILM_60S_BATCH_DEFAULT = 30
export const WINBACK_FILM_60S_BATCH_MAX = 60

const SITE = 'https://www.usekineo.com'

/** Contas da casa, pela régua pedida pelo fundador (além de isInternalEmail, que a rota também aplica). */
export const WINBACK_INTERNAL_RE = /(josephsskaf|josephskaf|josepghsskaf|@usekineo\.com)/i
/** ⛔ Nunca escrever para estes (mesma lista de lib/growth/mrrReactivation.ts e send-next-episode-wall). */
export const WINBACK_NEVER = ['den.higgins', 'noelrss21', 'emiliomontinari', 'akajitin', 'altaitools.com'] as const
const DISPOSABLE = ['mailinator', 'yopmail', 'tempmail', 'guerrillamail', 'sharklasers', 'getnada', 'maildrop', 'trashmail', '10minutemail', 'dispostable', 'fakeinbox', 'temp-mail']
/** Planos que já pagam (espelho de app/api/admin/_shared/mrr PAID_PLANS + trials pagos; a rota usa os dois). */
const PAID_LIKE = /^(starter|basic|pro|creator|studio|business|autopilot)/i

export type WinbackProfile = {
  id?: unknown
  email?: unknown
  plan?: unknown
  has_paid?: unknown
  email_opted_out?: unknown
}

/** A conta pode receber esta carta? (o resto — filme, pagamento, carimbo, supressão — a rota cruza por pessoa). */
export function winbackProfileOk(p: WinbackProfile): boolean {
  const email = typeof p.email === 'string' ? p.email.trim().toLowerCase() : ''
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false
  if (p.email_opted_out === true) return false
  // has_paid precisa ser false de verdade: null/indefinido = não sabemos = não escrever.
  if (p.has_paid !== false) return false
  const plan = typeof p.plan === 'string' ? p.plan.trim().toLowerCase() : 'free'
  if (plan && plan !== 'free' && PAID_LIKE.test(plan)) return false
  if (WINBACK_INTERNAL_RE.test(email)) return false
  if (WINBACK_NEVER.some((x) => email.includes(x))) return false
  if (DISPOSABLE.some((d) => email.includes(d))) return false
  return true
}

/** O nome do filme para a carta (null = sem título aproveitável → a carta não inventa um). */
export function winbackFilmTitle(title: unknown, topic: unknown): string | null {
  const t = pickMomentumTopic(typeof title === 'string' ? title : null) ?? pickMomentumTopic(typeof topic === 'string' ? topic : null)
  if (!t) return null
  // Cabeçalho de e-mail: nada de quebra de linha nem controle (injeção de cabeçalho no assunto).
  const clean = t.replace(/[\r\n\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 90)
  return clean.length >= 3 ? clean : null
}

function utm(): string {
  return `utm_source=lifecycle&utm_medium=email&utm_campaign=${WINBACK_FILM_60S_CAMPAIGN}`
}

/** Onde a pessoa vê o PRÓPRIO filme: a biblioteca logada. Nunca a página pública do vídeo, nunca o MP4, nunca o id do vídeo. */
export function winbackWatchUrl(): string {
  return `${SITE}/history?${utm()}`
}

/** O link de compra: Creator mensal, sem ?promo= e sem recovery=1 (o WELCOME20 automático aplica sozinho). */
export function winbackCheckoutUrl(): string {
  return `${SITE}/api/stripe/checkout?tier=basic&billing=monthly&intent_campaign=${WINBACK_FILM_60S_CAMPAIGN}`
}

export type WinbackOffer = {
  /** "$15.92" com a oferta viva; null com o interruptor desligado. */
  firstMonth: string | null
  full: string
  percentOff: number | null
  films: number
  seconds: number
  cta: string
}

/** A oferta, montada da fonte única do botão "Get Creator" (nada digitado). */
export function winbackOffer(live?: boolean): WinbackOffer {
  const price = live === undefined ? buyCreatorPrice() : buyCreatorPrice(live)
  const films = creatorSeedanceFilms()
  const seconds = BUY_CREATOR_FILM_SECONDS
  const cta = price.firstMonth
    ? `Make the ${seconds}-second version — Creator ${price.firstMonth} first month (${price.percentOff}% off)`
    : `Make the ${seconds}-second version — Creator ${price.full}/month`
  return { firstMonth: price.firstMonth, full: price.full, percentOff: price.percentOff, films, seconds, cta }
}

const esc = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/**
 * O tipo do filme muda a frase, porque a coorte tem DOIS filmes diferentes (medido 13/10, último filme de cada pessoa):
 *   · 'short' — o filme grátis curto (Seedance 1.5 de ~15 s; ~103 pessoas). A versão de 60 s é a história inteira;
 *   · 'retired_engine' — filme de ~35–62 s feito no Kineo 1 (motor de banco de imagens, aposentado; ~134 pessoas). Para
 *     ela "a versão de 60 s" NÃO é novidade de duração — é o mesmo filme num motor que gera cada cena com IA.
 * Clipe de efeito (quality_mode 'clip') não é filme: a rota nem o escolhe (12 pessoas só com clipe ficam fora).
 */
export type WinbackFilmKind = 'short' | 'retired_engine'

/** Classifica pelo motor e pela duração do último filme (dados do próprio banco, nunca adivinhados). */
export function winbackFilmKind(qualityMode: unknown, seconds: unknown): WinbackFilmKind {
  const q = typeof qualityMode === 'string' ? qualityMode.trim().toLowerCase() : ''
  if (q === 'fast') return 'retired_engine'
  const s = typeof seconds === 'number' && Number.isFinite(seconds) ? seconds : null
  return s !== null && s >= 45 && !q.startsWith('cinematic') ? 'retired_engine' : 'short'
}

/** Um vídeo da pessoa serve como "o filme" da carta? (completed e não é clipe de efeito). */
export function winbackIsFilm(v: { status?: unknown; quality_mode?: unknown }): boolean {
  return v.status === 'completed' && v.quality_mode !== 'clip'
}

export function winbackSubject(film: string | null, kind: WinbackFilmKind = 'short'): string {
  const o = winbackOffer()
  const name = film ? `"${film}"` : null
  if (kind === 'retired_engine') {
    return name ? `Your film ${name} — want it as a ${o.seconds}-second AI film?` : `Your film is ready — want it as a ${o.seconds}-second AI film?`
  }
  return name ? `Your film ${name} is ready — want the full ${o.seconds}-second version?` : `Your film is ready — want the full ${o.seconds}-second version?`
}

/** Corpo da carta. `footer` = o rodapé de descadastro da casa (a rota passa emailFooterText/emailFooterHtml). */
export function winbackBody(
  film: string | null,
  kind: WinbackFilmKind,
  footer: { text: string; html: string },
  live?: boolean,
): { text: string; html: string } {
  const o = winbackOffer(live)
  const watch = winbackWatchUrl()
  const buy = winbackCheckoutUrl()
  const nameText = film ? `"${film}"` : 'your first film'
  const nameHtml = film ? `<strong>&ldquo;${esc(film)}&rdquo;</strong>` : 'your first film'
  const priceText = o.firstMonth
    ? `${o.firstMonth} for the first month (${o.percentOff}% off), then ${o.full}/month`
    : `${o.full}/month`
  const pitchText = kind === 'retired_engine'
    ? `It was made on Kineo 1, our stock-footage engine, which we've retired. Creator makes it again on Seedance 1.5 — every scene generated by AI, ${o.seconds} seconds, no watermark.`
    : `The free version is the short cut. The full story fits in ${o.seconds} seconds: more scenes, the whole narration, no watermark.`
  const pitchHtml = kind === 'retired_engine'
    ? `It was made on Kineo&nbsp;1, our stock-footage engine, which we&rsquo;ve retired. Creator makes it again on <strong>Seedance 1.5</strong> &mdash; every scene generated by AI, <strong>${o.seconds} seconds</strong>, no watermark.`
    : `The free version is the short cut. The full story fits in <strong>${o.seconds} seconds</strong>: more scenes, the whole narration, no watermark.`
  const text = `Hi,

You made ${nameText} on Kineo — it's saved in your library, private to your account:
${watch}

${pitchText}

${o.cta}:
${buy}

Creator is ${priceText} — ${o.films} watermark-free ${o.seconds}-second films a month. Cancel anytime.

If something about your film didn't look right, just reply — a real person reads every message.

Kineo Team
usekineo.com${footer.text}`
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;color:#111;line-height:1.6;max-width:480px;">
  <p style="margin:0 0 14px;">Hi,</p>
  <p style="margin:0 0 14px;">You made ${nameHtml} on Kineo — it&rsquo;s saved in your library, private to your account. <a href="${watch}" style="color:#2997ff;">Watch it again &rarr;</a></p>
  <p style="margin:0 0 14px;">${pitchHtml}</p>
  <p style="margin:0 0 8px;"><a href="${buy}" style="display:inline-block;background:#2997ff;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:12px 22px;border-radius:10px;">${esc(o.cta)} &rarr;</a></p>
  <p style="margin:0 0 18px;font-size:13px;color:#555;">${o.firstMonth ? `<s>${o.full}</s> <strong>${o.firstMonth}</strong> the first month, then ${o.full}/month` : `${o.full}/month`} &middot; ${o.films} watermark-free ${o.seconds}-second films a month &middot; cancel anytime.</p>
  <p style="margin:0 0 14px;">If something about your film didn&rsquo;t look right, just reply &mdash; a real person reads every message.</p>
  <p style="margin:0 0 2px;">Kineo Team</p>
  <p style="margin:0;"><a href="${SITE}" style="color:#2997ff;">usekineo.com</a></p>
</div>${footer.html}`
  return { text, html }
}

/** UUID determinístico da reserva (campanha + pessoa): a 2ª inserção bate na chave primária e a pessoa é pulada. */
export function winbackClaimId(sha256Hex: (input: string) => string, userId: string): string {
  const hex = sha256Hex(`${WINBACK_FILM_60S_CAMPAIGN}:${userId}`).slice(0, 32)
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`
}
