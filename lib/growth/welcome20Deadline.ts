// ═══ KINEO-CHECKOUT-CLAREZA-1610 — PRAZO REAL DE 48 h NOS 20% DO 1º MÊS (WELCOME20) ═══════════════════════════════════
// Decisão do fundador (16/10, "tudo sim", jogada 6 de docs/PESQUISA-FECHAMENTO-CONCORRENTES-2026-10-16.md): a oferta de
// boas-vindas (20% no 1º mês de Creator/Studio MENSAL, WELCOME20, aplicada pelo servidor do checkout desde
// KINEO-CLARITY-WELCOME20-2026-10-12) ganha um prazo VERDADEIRO por pessoa:
//   · 48 h a partir da PRIMEIRA vez que a CONTA vê a oferta (faixa ou cartão do /pricing, convite de boas-vindas, ou a
//     própria sessão da Stripe com o desconto). Sem conta = sem prazo e sem contagem na tela (nada é inventado).
//   · O relógio mora no SERVIDOR: UMA linha em `events` (nome WELCOME20_DEADLINE_STARTED_EVENT) com id DETERMINÍSTICO por
//     conta (uuid derivado de sha256 da semente abaixo). Duas abas, dois cliques, duas rotas: a segunda escrita bate na
//     chave primária (23505) e o início continua sendo o da primeira. O relógio NUNCA reinicia: não há rota que apague,
//     atualize ou regrave essa linha; ler é sempre "a linha mais antiga com esse nome desta conta".
//   · Depois do prazo a oferta SOME: as telas param de mostrar (e o cartão para de mandar ?promo=WELCOME20) e o checkout
//     NÃO aplica o WELCOME20 automático; um link velho com ?promo=WELCOME20 NÃO recusa a compra (recusar perde a venda): o
//     cupom é descartado e a sessão abre a preço cheio, que a página da Stripe mostra com clareza; a resposta JSON e o
//     /pricing levam o aviso WELCOME20_DEADLINE_ENDED_NOTICE. Quem decide é o servidor (app/api/stripe/checkout/route.ts).
//   · Leitura que falha = 'unknown': a tela não mostra contagem e o checkout segue como era antes do prazo (nunca cobra
//     mais por erro nosso, nunca inventa que acabou).
// Sem tabela nova e sem migration: a tabela `events` já existe, já é fechada ao navegador (o sink /api/events recusa o nome,
// lista SERVER_ONLY_EVENTS) e já tem índice por nome (events_name_idx).
//
// MÓDULO PURO E SEM IMPORT: telas, rotas e o guardião scripts/test-checkout-clareza-1610.mjs o carregam cru. O cliente
// do banco chega por argumento (a forma mínima do supabase-js que as duas rotas usam).

/** Interruptor do prazo. false = a oferta volta a ser sem prazo (como até 15/10), em tela e no checkout, juntos. */
export const WELCOME20_DEADLINE_LIVE = true
export const WELCOME20_DEADLINE_HOURS = 48
export const WELCOME20_DEADLINE_MS = WELCOME20_DEADLINE_HOURS * 60 * 60 * 1000
export const WELCOME20_DEADLINE_VERSION = 'welcome20_deadline_48h_v1' as const
/** A linha do relógio (só servidor: está em SERVER_ONLY_EVENTS de app/api/events/route.ts). */
export const WELCOME20_DEADLINE_STARTED_EVENT = 'welcome20_deadline_started' as const
/** A rota que a tela chama: GET lê; POST lê e, se ainda não começou, começa (só com conta). */
export const WELCOME20_DEADLINE_API = '/api/offers/welcome20-deadline'

export type Welcome20DeadlineState = 'no_account' | 'not_started' | 'active' | 'expired' | 'unknown' | 'off'
export type Welcome20DeadlineSurface = 'pricing_deal_bar' | 'pricing_card' | 'welcome_modal' | 'checkout'
export const WELCOME20_DEADLINE_SURFACES: readonly Welcome20DeadlineSurface[] = ['pricing_deal_bar', 'pricing_card', 'welcome_modal', 'checkout']

export function welcome20DeadlineSurface(value: unknown): Welcome20DeadlineSurface | null {
  return typeof value === 'string' && (WELCOME20_DEADLINE_SURFACES as readonly string[]).includes(value)
    ? (value as Welcome20DeadlineSurface)
    : null
}

export interface Welcome20Deadline {
  state: Welcome20DeadlineState
  /** ISO do início (só 'active'/'expired'). */
  startedAt: string | null
  /** ISO do fim = início + 48 h (só 'active'/'expired'). */
  endsAt: string | null
}

export const WELCOME20_DEADLINE_UNKNOWN: Welcome20Deadline = { state: 'unknown', startedAt: null, endsAt: null }

/** O estado a partir da linha mais antiga lida (ou null = nenhuma). Data ilegível = 'unknown', nunca "acabou". */
export function welcome20DeadlineFrom(startedAtIso: string | null, nowMs: number): Welcome20Deadline {
  if (!WELCOME20_DEADLINE_LIVE) return { state: 'off', startedAt: null, endsAt: null }
  if (startedAtIso === null) return { state: 'not_started', startedAt: null, endsAt: null }
  const start = Date.parse(startedAtIso)
  if (!Number.isFinite(start) || !Number.isFinite(nowMs)) return WELCOME20_DEADLINE_UNKNOWN
  const end = start + WELCOME20_DEADLINE_MS
  return {
    state: nowMs >= end ? 'expired' : 'active',
    startedAt: new Date(start).toISOString(),
    endsAt: new Date(end).toISOString(),
  }
}

/** A oferta pode aparecer para esta pessoa? Só 'expired' some. O resto (inclusive 'unknown') é o comportamento de antes. */
export function welcome20OfferAllowed(state: Welcome20DeadlineState | null | undefined): boolean {
  return state !== 'expired'
}

/** "Ends in 47h 12m" — só com prazo ativo e tempo restante; senão null (nunca uma contagem inventada ou negativa). */
export function welcome20DeadlineLabel(deadline: Pick<Welcome20Deadline, 'state' | 'endsAt'> | null | undefined, nowMs: number): string | null {
  if (!deadline || deadline.state !== 'active' || !deadline.endsAt) return null
  const left = Date.parse(deadline.endsAt) - nowMs
  if (!Number.isFinite(left) || left <= 0) return null
  const totalMinutes = Math.floor(left / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `Ends in ${hours}h ${minutes}m`
}

/** A semente do id determinístico da linha do relógio (o chamador faz sha256 e welcome20DeadlineUuid). */
export function welcome20DeadlineIdSeed(userId: string): string {
  return `${WELCOME20_DEADLINE_STARTED_EVENT}:${userId}`
}

/** 32+ hex → uuid v4-forma (8-4-4-4-12). Mesmo formato do checkout_started determinístico da rota da Stripe. */
export function welcome20DeadlineUuid(hex: string): string {
  const h = hex.slice(0, 32)
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

// ─── a orquestração com o banco (o cliente chega por argumento) ────────────────────────────────────────────────────────
type DbError = { code?: string | null; message?: string | null } | null
type DbRead = PromiseLike<{ data: unknown; error: DbError }>
/** A forma mínima do supabase-js usada aqui (select → eq → eq → order → limit; insert). */
export interface Welcome20DeadlineDb {
  from(table: 'events'): {
    select(columns: string): {
      eq(column: string, value: string): {
        eq(column: string, value: string): {
          order(column: string, options: { ascending: boolean }): { limit(n: number): DbRead }
        }
      }
    }
    insert(row: Record<string, unknown>): PromiseLike<{ error: DbError }>
  }
}

/** Lê o relógio da conta: a linha MAIS ANTIGA com o nome do prazo. Erro de leitura = 'unknown'. */
export async function readWelcome20Deadline(db: Welcome20DeadlineDb, userId: string, nowMs: number): Promise<Welcome20Deadline> {
  if (!WELCOME20_DEADLINE_LIVE) return { state: 'off', startedAt: null, endsAt: null }
  try {
    const { data, error } = await db
      .from('events')
      .select('created_at')
      .eq('user_id', userId)
      .eq('name', WELCOME20_DEADLINE_STARTED_EVENT)
      .order('created_at', { ascending: true })
      .limit(1)
    if (error || !Array.isArray(data)) return WELCOME20_DEADLINE_UNKNOWN
    const first = data[0] as { created_at?: unknown } | undefined
    if (!first) return welcome20DeadlineFrom(null, nowMs)
    return typeof first.created_at === 'string' ? welcome20DeadlineFrom(first.created_at, nowMs) : WELCOME20_DEADLINE_UNKNOWN
  } catch {
    return WELCOME20_DEADLINE_UNKNOWN
  }
}

/**
 * Lê e, só se o relógio ainda não começou, começa (uma linha com id determinístico; a 2ª escrita cai no 23505 e é
 * ignorada). Depois de escrever, RELÊ: quem manda é a linha gravada, nunca o "agora" desta chamada.
 * Já ativo ou vencido = devolve como está (nunca reinicia). Falha ao escrever = 'unknown' (a tela não mostra contagem).
 */
export async function startWelcome20Deadline(
  db: Welcome20DeadlineDb,
  input: { userId: string; eventId: string; surface: Welcome20DeadlineSurface; nowMs: number },
): Promise<Welcome20Deadline> {
  const current = await readWelcome20Deadline(db, input.userId, input.nowMs)
  if (current.state !== 'not_started') return current
  try {
    const { error } = await db.from('events').insert({
      id: input.eventId,
      user_id: input.userId,
      name: WELCOME20_DEADLINE_STARTED_EVENT,
      path: WELCOME20_DEADLINE_API,
      metadata: { version: WELCOME20_DEADLINE_VERSION, surface: input.surface, hours: WELCOME20_DEADLINE_HOURS },
    })
    if (error && error.code !== '23505') return WELCOME20_DEADLINE_UNKNOWN
  } catch {
    return WELCOME20_DEADLINE_UNKNOWN
  }
  const after = await readWelcome20Deadline(db, input.userId, input.nowMs)
  return after.state === 'not_started' ? WELCOME20_DEADLINE_UNKNOWN : after
}

/**
 * A régua do checkout (pura). Devolve o que fazer com o WELCOME20 desta compra logada:
 *   'allow'  → segue como era (auto ou pedido explícito);
 *   'block_auto' → o automático não entra (a compra segue a preço cheio, sem erro);
 *   'drop_requested' → o ?promo=WELCOME20 explícito é DESCARTADO: a sessão abre a preço cheio (a Stripe mostra o total) e a
 *                      tela recebe o aviso de oferta encerrada. Nunca recusa a compra (recusar perde a venda).
 * Só 'expired' bloqueia. 'unknown' / 'not_started' / 'active' / 'off' = 'allow'.
 */
export function welcome20CheckoutDecision(input: { state: Welcome20DeadlineState; requestedWelcome: boolean; autoWelcome: boolean }): 'allow' | 'block_auto' | 'drop_requested' {
  if (input.state !== 'expired') return 'allow'
  if (input.requestedWelcome) return 'drop_requested'
  if (input.autoWelcome) return 'block_auto'
  return 'allow'
}

/** O aviso de quem chega com ?promo=WELCOME20 depois do prazo (a compra segue a preço cheio). Nunca bloqueia. */
export const WELCOME20_DEADLINE_ENDED_NOTICE = `Your ${WELCOME20_DEADLINE_HOURS}-hour welcome offer ended — this is the regular price.`
