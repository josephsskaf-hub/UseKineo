// ═══ KINEO-ANUNCIO-MOTOR-2026-10-07 — O CLIQUE PAGO VIAJA ATÉ A COMPRA (inclusive a compra sem login) ═══════════════
//
// POR QUÊ (fundador 07/10, "vai pra tudo"): o teste de anúncio no Google Search por NOME DE MOTOR (US$ 18/dia, 7 dias,
// meta ≥ 1 pagante a cada US$ 100 — docs/ANUNCIO-GOOGLE-MOTORES-2026-10-07.md) só se lê se a COMPRA souber que veio de
// um clique pago. Conferido em origin/main 5ca07684 antes deste arquivo:
//   · utm_* e gclid entram no sessionStorage da ABA (lib/analytics.ts captureUtmsOnce) e vão em todo evento do navegador;
//   · o perfil guarda a origem do PRIMEIRO toque (cookie kineo_src, 90 dias) e o gclid só quando o cadastro acontece na
//     mesma aba do pouso;
//   · checkout_started e payment_success NÃO levavam utm nem gclid: a ligação com o anúncio dependia de o session_id da
//     aba da compra ser o mesmo da aba do pouso. Quem clicou no anúncio, saiu e voltou outro dia por outra porta pagava
//     sem origem — e, na compra sem login (06/10), a conta nasce no webhook sem signup_utm_*;
//   · gbraid/wbraid (cliques vindos do iOS, sem gclid) não eram guardados em lugar nenhum.
//
// O DESENHO (três pontas, nenhuma decide acesso nem preço):
//   1. components/SourceCapture.tsx (todo pouso) grava o ÚLTIMO clique pago num cookie primário de 90 dias — e só quando
//      a URL traz sinal pago (gclid/gbraid/wbraid ou utm_medium pago). Visita orgânica nunca apaga um clique pago.
//   2. app/api/stripe/checkout/route.ts copia esse clique para os eventos de checkout (checkout_attempted,
//      checkout_started, checkout_guest_started…), logado ou convidado.
//   3. app/api/stripe/webhook/route.ts copia do checkout_started para o payment_success (a mesma leitura que já recuperava
//      o session_id da aba). Nada entra na Stripe: preço, metadata da sessão e chave de idempotência ficam intactos.
// O cookie é editável por quem quiser: tudo é saneado AQUI (formato fechado, idade máxima) e serve só para atribuição.
//
// MÓDULO PURO (nenhum import): o guardião scripts/test-anuncio-motor-rastreio-2026-10-07.mjs o transpila e EXECUTA.

export const PAID_CLICK_VERSION = 'paid_click_v1' as const
export const PAID_CLICK_COOKIE = 'kineo_paid_click' as const
/** 90 dias: a mesma janela do cookie de origem (kineo_src) e da conversão de clique do Google Ads. */
export const PAID_CLICK_MAX_AGE_SECONDS = 90 * 24 * 60 * 60
/** Relógio do navegador adiantado até este limite ainda vale (o cookie carrega a hora do PRÓPRIO navegador). */
export const PAID_CLICK_CLOCK_SKEW_MS = 10 * 60 * 1000

/** Ordem = precedência: o gclid do Google vence; gbraid/wbraid são os identificadores do iOS quando não há gclid. */
export const PAID_CLICK_ID_TYPES = ['gclid', 'gbraid', 'wbraid'] as const
export type PaidClickIdType = (typeof PAID_CLICK_ID_TYPES)[number]

/** utm_medium que contam como clique pago mesmo sem identificador (ex.: Reddit/Meta com UTM manual). */
export const PAID_CLICK_MEDIUMS = ['cpc', 'ppc', 'paid', 'paidsearch', 'paid_search', 'paid-search'] as const

/** As chaves que os eventos de checkout e o payment_success ganham (e só elas). */
export const PAID_CLICK_METADATA_KEYS = [
  'paid_click_version',
  'paid_utm_source',
  'paid_utm_medium',
  'paid_utm_campaign',
  'paid_utm_term',
  'paid_click_id_type',
  'paid_click_id',
  'paid_click_at',
] as const

export type PaidClick = {
  source: string | null
  medium: string | null
  campaign: string | null
  /** utm_term = a palavra-chave do Google ({keyword} no sufixo do URL final). */
  term: string | null
  idType: PaidClickIdType | null
  id: string | null
  atMs: number
}

export type PaidClickMetadata = Partial<Record<(typeof PAID_CLICK_METADATA_KEYS)[number], string | null>>

/** utm_source/medium/campaign: o mesmo alfabeto fechado do intent_campaign da rota de checkout, até 100 caracteres. */
const UTM_TOKEN = /^[A-Za-z0-9._~-]{1,100}$/
/** utm_term: o texto da palavra-chave (letras, números, espaço e . _ ~ + -), até 100 caracteres. */
const UTM_TERM = /^[A-Za-z0-9 ._~+-]{1,100}$/
/** gclid/gbraid/wbraid: base64url do Google. Nunca e-mail, URL, aspas ou espaço. */
const CLICK_ID = /^[A-Za-z0-9_-]{8,255}$/
/** Antes de 2024 é data impossível para um clique (relógio zerado ou valor forjado): nem grava, nem aceita. */
const OLDEST_PLAUSIBLE_MS = Date.UTC(2024, 0, 1)

function cleanToken(raw: unknown, pattern: RegExp, lower: boolean): string | null {
  if (typeof raw !== 'string') return null
  const value = raw.trim()
  if (!value || !pattern.test(value)) return null
  return lower ? value.toLowerCase() : value
}

function isPaidMedium(medium: string | null): boolean {
  return medium !== null && (PAID_CLICK_MEDIUMS as readonly string[]).includes(medium)
}

function isIdType(value: unknown): value is PaidClickIdType {
  return typeof value === 'string' && (PAID_CLICK_ID_TYPES as readonly string[]).includes(value)
}

/**
 * O clique pago que esta query string carrega, ou null. Sem gclid/gbraid/wbraid e sem utm_medium pago não há clique:
 * a visita orgânica (ChatGPT, busca, direto) devolve null e, por isso, nunca sobrescreve um clique pago guardado.
 */
export function paidClickFromSearch(search: string | null | undefined, nowMs: number): PaidClick | null {
  if (!Number.isFinite(nowMs) || nowMs < OLDEST_PLAUSIBLE_MS) return null
  let params: URLSearchParams
  try {
    params = new URLSearchParams(search ?? '')
  } catch {
    return null
  }
  let idType: PaidClickIdType | null = null
  let id: string | null = null
  for (const type of PAID_CLICK_ID_TYPES) {
    const value = cleanToken(params.get(type), CLICK_ID, false)
    if (value) {
      idType = type
      id = value
      break
    }
  }
  const medium = cleanToken(params.get('utm_medium'), UTM_TOKEN, true)
  if (id === null && !isPaidMedium(medium)) return null
  return {
    source: cleanToken(params.get('utm_source'), UTM_TOKEN, true),
    medium,
    campaign: cleanToken(params.get('utm_campaign'), UTM_TOKEN, false),
    term: cleanToken(params.get('utm_term'), UTM_TERM, false),
    idType,
    id,
    atMs: Math.floor(nowMs),
  }
}

/** JSON compacto do cookie (chaves curtas: o gclid sozinho tem ~100 caracteres). */
export function serializePaidClick(click: PaidClick): string {
  return JSON.stringify({
    v: 1,
    s: click.source,
    m: click.medium,
    c: click.campaign,
    t: click.term,
    k: click.idType,
    i: click.id,
    a: Math.floor(click.atMs / 1000),
  })
}

/** Cada campo é null ou passa no MESMO formato da captura; qualquer outra coisa invalida o clique inteiro (adulterado). */
function nullableToken(raw: unknown, pattern: RegExp, lower: boolean): string | null | undefined {
  if (raw === null) return null
  const value = cleanToken(raw, pattern, lower)
  return value === null ? undefined : value
}

type ClickFields = { s: unknown; m: unknown; c: unknown; t: unknown; k: unknown; i: unknown; atMs: number }

function clickFromFields(fields: ClickFields, nowMs: number | null): PaidClick | null {
  if (!Number.isFinite(fields.atMs) || fields.atMs < OLDEST_PLAUSIBLE_MS) return null
  if (nowMs !== null) {
    if (!Number.isFinite(nowMs)) return null
    if (fields.atMs - nowMs > PAID_CLICK_CLOCK_SKEW_MS) return null
    if (nowMs - fields.atMs > PAID_CLICK_MAX_AGE_SECONDS * 1000) return null
  }
  const source = nullableToken(fields.s, UTM_TOKEN, true)
  const medium = nullableToken(fields.m, UTM_TOKEN, true)
  const campaign = nullableToken(fields.c, UTM_TOKEN, false)
  const term = nullableToken(fields.t, UTM_TERM, false)
  if (source === undefined || medium === undefined || campaign === undefined || term === undefined) return null
  const idType = fields.k === null ? null : isIdType(fields.k) ? fields.k : undefined
  const id = nullableToken(fields.i, CLICK_ID, false)
  if (idType === undefined || id === undefined) return null
  if ((idType === null) !== (id === null)) return null
  if (id === null && !isPaidMedium(medium)) return null
  return { source, medium, campaign, term, idType, id, atMs: Math.floor(fields.atMs) }
}

/**
 * Lê o valor do cookie (cru ou já decodificado — o Next entrega decodificado) e devolve o clique válido, ou null:
 * formato errado, campo adulterado, hora no futuro além da folga ou mais velho que PAID_CLICK_MAX_AGE_SECONDS.
 */
export function parsePaidClick(raw: string | null | undefined, nowMs: number): PaidClick | null {
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim()
  if (!trimmed || trimmed.length > 2048) return null
  let json = trimmed
  if (!trimmed.startsWith('{')) {
    try {
      json = decodeURIComponent(trimmed)
    } catch {
      return null
    }
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    return null
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
  const o = parsed as Record<string, unknown>
  if (o.v !== 1) return null
  if (typeof o.a !== 'number' || !Number.isInteger(o.a) || o.a <= 0) return null
  return clickFromFields({ s: o.s, m: o.m, c: o.c, t: o.t, k: o.k, i: o.i, atMs: o.a * 1000 }, nowMs)
}

/**
 * A linha `document.cookie = …` do pouso, ou null quando a URL não traz clique pago (aí NADA se escreve).
 * Último clique pago vence: um anúncio novo substitui o anterior; uma visita orgânica não toca no que existe.
 */
export function paidClickCookieWrite(search: string | null | undefined, nowMs: number, secure: boolean): string | null {
  const click = paidClickFromSearch(search, nowMs)
  if (!click) return null
  const value = encodeURIComponent(serializePaidClick(click))
  return `${PAID_CLICK_COOKIE}=${value}; Path=/; Max-Age=${PAID_CLICK_MAX_AGE_SECONDS}; SameSite=Lax${secure ? '; Secure' : ''}`
}

/** As chaves paid_* de um evento. null = {} (o evento sem anúncio não ganha chave nenhuma). */
export function paidClickEventMetadata(click: PaidClick | null): PaidClickMetadata {
  if (!click) return {}
  return {
    paid_click_version: PAID_CLICK_VERSION,
    paid_utm_source: click.source,
    paid_utm_medium: click.medium,
    paid_utm_campaign: click.campaign,
    paid_utm_term: click.term,
    paid_click_id_type: click.idType,
    paid_click_id: click.id,
    paid_click_at: new Date(click.atMs).toISOString(),
  }
}

/**
 * O webhook copia o clique do checkout_started para o payment_success: relê as chaves paid_* com as MESMAS regras
 * (sem idade máxima — o clique valia quando o checkout foi aberto) e devolve {} para qualquer coisa fora do formato.
 */
export function paidClickMetadataFromEvent(metadata: unknown): PaidClickMetadata {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return {}
  const m = metadata as Record<string, unknown>
  if (m.paid_click_version !== PAID_CLICK_VERSION) return {}
  const atMs = typeof m.paid_click_at === 'string' ? Date.parse(m.paid_click_at) : NaN
  const click = clickFromFields(
    {
      s: m.paid_utm_source ?? null,
      m: m.paid_utm_medium ?? null,
      c: m.paid_utm_campaign ?? null,
      t: m.paid_utm_term ?? null,
      k: m.paid_click_id_type ?? null,
      i: m.paid_click_id ?? null,
      atMs,
    },
    null,
  )
  return paidClickEventMetadata(click)
}
