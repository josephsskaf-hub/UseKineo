import { createClient as createAdminClient } from '@supabase/supabase-js'

// KINEO-REVIVE-2026-07-26 — a única fonte de verdade do que /revive sabe.
//
// POR QUE ESTE MÓDULO EXISTE: três consumidores precisam concordar sobre o que
// é um prospect e o que a página pode mostrar dele — a página
// (app/revive/[handle]/page.tsx), a rota de clique (app/api/revive/click) e a
// rota de ingestão do batch (app/api/revive). Mesma lição de
// lib/publicVideos.ts: se a regra vive em dois lugares, ela diverge.
//
// A leitura NÃO faz `select` na tabela. Ela chama a função
// `revive_prospect_public(handle)` da migration 022, que é security definer,
// devolve UMA linha e uma projeção fixa. Consequência prática: não existe
// caminho de código aqui capaz de vazar contact_email, notes ou as colunas de
// outcome, nem de listar prospects — nem por bug, nem por um `select('*')`
// distraído no futuro.
//
// A pasta `_lib` tem underscore de propósito: no App Router isso é uma private
// folder e o Next nunca a trata como rota.

// ═══════════════════════════════════════════════════════════════════════════
// ⚠️  O SKU DO PILOTO
// ═══════════════════════════════════════════════════════════════════════════
// LIGADO em 2026-07-26. O fallback deixou de ser /pricing e passou a ser o
// checkout real. As duas pré-condições que travavam isto caíram:
//   1. `?pack=autopilot_pilot` existe no GET de app/api/stripe/checkout
//      (branch explícito → buildAutopilotPilotAndRedirect, mode:'payment',
//      $99 one-time). Antes, um `?tier=` inventado caía em silêncio no
//      'basic' e cobrava $24.90/mês — por isso o default apontava para uma
//      página em vez de uma cobrança.
//   2. profiles.plan_expires_at foi aplicada em produção, então a rota não
//      aborta mais no guard que checa a coluna antes de vender.
// O prospect chega deslogado: o handler devolve /login?redirect=<esta URL>&
// resumed=1 e retoma o checkout depois do sign-in. Fluxo previsto, não erro.
//
// A env var continua aceita para trocar o destino sem deploy, mas o valor
// abaixo funciona sozinho — feature atrás de env var que ninguém seta é
// feature que não existe.
// A página e a rota de clique importam as duas constantes, então preço exibido
// e destino do botão nunca saem de sincronia.
export const REVIVE_PILOT_CHECKOUT_PATH: string =
  process.env.NEXT_PUBLIC_REVIVE_PILOT_CHECKOUT_PATH ||
  '/api/stripe/checkout?pack=autopilot_pilot&utm_source=revive&utm_medium=outbound&utm_campaign=revive_pilot'

/** Rótulo de preço do piloto. Muda junto com o SKU acima — nunca sozinho. */
export const REVIVE_PILOT_PRICE_LABEL = '$99'
/** Duração do piloto, em dias. */
export const REVIVE_PILOT_DAYS = 7

/** Host público canônico. Igual a lib/publicVideos.ts, app/sitemap.ts e app/robots.ts. */
export const REVIVE_BASE_URL = 'https://www.usekineo.com'

/** Janela de dedupe do pageview, em minutos. Ver revive_mark_view() na 022. */
export const REVIVE_VIEW_DEDUPE_MINUTES = 30

// ═══════════════════════════════════════════════════════════════════════════
// Tipos
// ═══════════════════════════════════════════════════════════════════════════

export type ReviveVideo = {
  slot: number
  id: string
  title: string | null
  url: string
  posterUrl: string | null
}

export type ReviveProspect = {
  handle: string
  channelTitle: string
  channelUrl: string | null
  subscriberCount: number | null
  lastUploadAt: string | null
  /**
   * Dias parados. Calculado a partir de `last_upload_at` NO MOMENTO DO RENDER,
   * com `days_dormant` (snapshot da coleta) como fallback. Null quando as duas
   * fontes falham — e aí a página simplesmente não escreve a frase, em vez de
   * imprimir "undefined days ago".
   */
  daysDormant: number | null
  /** True quando daysDormant veio da data real e não do snapshot. */
  daysDormantIsLive: boolean
  niche: string | null
  videos: ReviveVideo[]
}

/**
 * `missing` e `unavailable` são deliberadamente distintos, mesma razão
 * registrada em lib/publicVideos.ts: um handle que realmente não existe tem que
 * ser 404 de verdade, mas uma queda do Supabase (ou a migration 022 ainda não
 * aplicada) NÃO pode transformar em 404 a página que a gente acabou de mandar
 * por email — o lead clica uma vez só.
 */
export type ReviveProspectResult =
  | { status: 'ok'; prospect: ReviveProspect }
  | { status: 'missing' }
  | { status: 'unavailable' }

// ═══════════════════════════════════════════════════════════════════════════
// Handle
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Normaliza um handle do YouTube para a chave da URL/tabela.
 * Aceita "@MysteryFiles", "MysteryFiles", "youtube.com/@MysteryFiles" e devolve
 * "mysteryfiles". Devolve null quando o resultado não bate o CHECK
 * `revive_prospects_handle_urlsafe` da migration 022 — a validação vive nos dois
 * lados de propósito: o banco é a garantia, isto aqui é o erro legível.
 */
export function normalizeReviveHandle(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  let h = raw.trim().toLowerCase()
  // Tolera a URL inteira colada do navegador.
  h = h.replace(/^https?:\/\//, '').replace(/^(?:www\.)?youtube\.com\//, '')
  h = h.replace(/^@/, '')
  h = h.split(/[/?#]/)[0] ?? ''
  if (!/^[a-z0-9][a-z0-9._-]{1,59}$/.test(h)) return null
  return h
}

// ═══════════════════════════════════════════════════════════════════════════
// Formatação (tudo em EN — o público está inteiro fora do Brasil)
// ═══════════════════════════════════════════════════════════════════════════

const MS_PER_DAY = 86_400_000

/**
 * Dias completos desde uma coluna `date` do Postgres ("YYYY-MM-DD").
 * Ancorado em meia-noite UTC porque a coluna é DATE, sem hora: interpretar como
 * local jogaria o resultado um dia pra lá ou pra cá dependendo do fuso do
 * servidor, e "há 74 dias" só tem força se estiver certo.
 * Retorna null para data inválida ou no futuro (dado sujo do scanner).
 */
export function daysSinceDate(value: string | null | undefined): number | null {
  if (!value) return null
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00Z` : value
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return null
  const days = Math.floor((Date.now() - t) / MS_PER_DAY)
  return days >= 0 ? days : null
}

/** "12,400" — separador de milhar en-US, sem inventar arredondamento. */
export function formatSubscribers(count: number | null): string | null {
  if (count == null || !Number.isFinite(count) || count < 0) return null
  return Math.round(count).toLocaleString('en-US')
}

/** "Mar 14, 2026" a partir de uma coluna DATE. Null quando não dá pra ler. */
export function formatUploadDate(value: string | null): string | null {
  if (!value) return null
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00Z` : value
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return null
  return new Date(t).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

/** "mystery" / "finance_facts" → "Mystery" / "Finance facts". */
export function formatNiche(niche: string | null): string | null {
  const n = (niche ?? '').trim().replace(/[_-]+/g, ' ')
  if (!n) return null
  return n.charAt(0).toUpperCase() + n.slice(1).toLowerCase()
}

// ═══════════════════════════════════════════════════════════════════════════
// Acesso a dados
// ═══════════════════════════════════════════════════════════════════════════

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  // A tabela tem RLS ligada e ZERO policies de leitura (migration 022 §2), e o
  // prospect não tem sessão nenhuma — então a leitura tem que ser service_role.
  // O que mantém isso seguro não é o cliente, é a função: a projeção pública é
  // decidida no banco, não aqui.
  return createAdminClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

/** Só aceita http(s). Uma URL de vídeo com esquema `javascript:` viraria XSS no `src`. */
function safeHttpUrl(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null
  try {
    const u = new URL(value.trim())
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.toString() : null
  } catch {
    return null
  }
}

function parseVideos(raw: unknown): ReviveVideo[] {
  if (!Array.isArray(raw)) return []
  const out: ReviveVideo[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const url = safeHttpUrl(row.url)
    const id = typeof row.id === 'string' ? row.id : null
    if (!url || !id) continue
    const rawTitle = typeof row.title === 'string' ? row.title.trim() : ''
    out.push({
      slot: typeof row.slot === 'number' ? row.slot : out.length + 1,
      id,
      title: rawTitle ? rawTitle.slice(0, 120) : null,
      url,
      posterUrl: safeHttpUrl(row.poster_url),
    })
  }
  return out.sort((a, b) => a.slot - b.slot).slice(0, 3)
}

/**
 * Lê um prospect pela função pública. NUNCA lança — a página é o último
 * artefato de um lead que só clica uma vez.
 */
export async function getReviveProspect(rawHandle: string): Promise<ReviveProspectResult> {
  const handle = normalizeReviveHandle(rawHandle)
  // Handle malformado nem chega no banco: é 404 na hora.
  if (!handle) return { status: 'missing' }

  const admin = adminClient()
  if (!admin) return { status: 'unavailable' }

  try {
    const { data, error } = await admin.rpc('revive_prospect_public', { p_handle: handle })
    if (error) {
      // Inclui o caso "migration 022 ainda não aplicada" (PGRST202 / 42883).
      // Vira `unavailable`, não `missing`: 404 para todo handle esconderia um
      // problema de deploy atrás de uma resposta que parece normal.
      console.error('[revive] rpc revive_prospect_public failed:', error.message)
      return { status: 'unavailable' }
    }
    const row = Array.isArray(data) ? data[0] : data
    if (!row) return { status: 'missing' }

    const r = row as Record<string, unknown>
    const channelTitle = typeof r.channel_title === 'string' ? r.channel_title.trim() : ''
    const lastUploadAt = typeof r.last_upload_at === 'string' ? r.last_upload_at : null
    const storedDays =
      typeof r.days_dormant === 'number' && Number.isFinite(r.days_dormant) && r.days_dormant >= 0
        ? Math.round(r.days_dormant)
        : null
    const liveDays = daysSinceDate(lastUploadAt)

    return {
      status: 'ok',
      prospect: {
        handle,
        // A tabela exige channel_title NOT NULL; o fallback existe só para que
        // um dado sujo não derrube o render inteiro.
        channelTitle: channelTitle || `@${handle}`,
        channelUrl: safeHttpUrl(r.channel_url) ?? `https://www.youtube.com/@${handle}`,
        subscriberCount:
          typeof r.subscriber_count === 'number' && Number.isFinite(r.subscriber_count)
            ? Math.round(r.subscriber_count)
            : null,
        lastUploadAt,
        daysDormant: liveDays ?? storedDays,
        daysDormantIsLive: liveDays != null,
        niche: typeof r.niche === 'string' && r.niche.trim() ? r.niche.trim() : null,
        videos: parseVideos(r.videos),
      },
    }
  } catch (err) {
    console.error('[revive] unexpected read failure:', err instanceof Error ? err.message : err)
    return { status: 'unavailable' }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Outcome tracking
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Marca UM pageview. Devolve true só quando a linha foi realmente contada
 * (fora da janela de dedupe) — o chamador usa isso para decidir se grava também
 * o evento em `events`, mantendo as duas contagens de acordo.
 */
export async function markReviveView(handle: string): Promise<boolean> {
  const admin = adminClient()
  if (!admin) return false
  try {
    const { data, error } = await admin.rpc('revive_mark_view', {
      p_handle: handle,
      p_window_minutes: REVIVE_VIEW_DEDUPE_MINUTES,
    })
    if (error) {
      console.error('[revive] rpc revive_mark_view failed:', error.message)
      return false
    }
    return data === true
  } catch {
    // Tracking nunca pode derrubar a página. Perder um evento é barato; não
    // renderizar a entrega para um lead que clicou uma vez, não.
    return false
  }
}

/** Marca UM clique no CTA. Sem dedupe: clicar de novo é sinal, não ruído. */
export async function markReviveClick(handle: string): Promise<boolean> {
  const admin = adminClient()
  if (!admin) return false
  try {
    const { data, error } = await admin.rpc('revive_mark_click', { p_handle: handle })
    if (error) {
      console.error('[revive] rpc revive_mark_click failed:', error.message)
      return false
    }
    return data === true
  } catch {
    return false
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Filtro de robô — não é higiene, é a diferença entre medir e não medir
// ═══════════════════════════════════════════════════════════════════════════
// O repo já pagou por isso: o PUSH #97 descobriu 39 `checkout_auth_required`
// que não eram gente nenhuma — eram prefetch de navegador e scanner de link
// abrindo sessões do Stripe sozinhos. Esta campanha é 100% outbound por email,
// ou seja, TODO clique passa antes por um scanner corporativo (Outlook Safe
// Links, Proofpoint, Barracuda) que busca a URL para "verificar". Sem este
// filtro, view→click — a única métrica que decide se a campanha continua —
// nasce inflada no numerador errado.

const BOT_UA =
  /(bot|crawler|spider|crawling|slurp|preview|scanner|monitor|curl|wget|python-requests|node-fetch|axios|headless|phantom|puppeteer|playwright|lighthouse|facebookexternalhit|whatsapp|telegram|slackbot|discordbot|twitterbot|linkedinbot|bingpreview|google-?read-?aloud|safelinks|proofpoint|barracuda|mimecast|urldefense|go-http-client|okhttp|java\/|libwww|apache-httpclient)/i

/** Um user-agent que quase certamente não é uma pessoa lendo no celular. */
export function isLikelyBotUserAgent(ua: string | null | undefined): boolean {
  const s = (ua ?? '').trim()
  // UA vazio: nenhum navegador real omite. Vale como robô.
  if (!s) return true
  return BOT_UA.test(s)
}

/**
 * Prefetch / especulação do navegador. Mesma lista de headers que
 * app/api/stripe/checkout/route.ts passou a checar no PUSH #97, pelo mesmo
 * motivo: o navegador buscava a URL sozinho e a gente contava como clique.
 */
// Tipado como "qualquer coisa com .get" e não como `Headers`: o objeto que
// next/headers devolve num Server Component é um ReadonlyHeaders, e a rota de
// API passa um Headers de verdade. Os dois satisfazem isto.
export function isSpeculativeRequest(headers: { get(name: string): string | null }): boolean {
  const purpose = (
    headers.get('sec-purpose') ||
    headers.get('purpose') ||
    headers.get('x-purpose') ||
    headers.get('x-moz') ||
    ''
  ).toLowerCase()
  if (purpose.includes('prefetch') || purpose.includes('prerender') || purpose.includes('preview')) return true
  if (headers.get('next-router-prefetch')) return true
  return false
}
