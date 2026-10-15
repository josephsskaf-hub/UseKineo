'use client'
// KINEO-CHECKOUT-CLAREZA-1610 — o lado da TELA do prazo de 48 h do WELCOME20. Só pergunta ao servidor
// (/api/offers/welcome20-deadline) e mostra o que ele disse: o relógio nunca nasce nem é recalculado no navegador.
//   · fetchWelcome20Deadline(null)      → GET (só lê). Uma vez por página (promessa em cache do módulo).
//   · fetchWelcome20Deadline(surface)   → POST (lê e, se não começou, começa). Uma vez por página.
//   · useWelcome20Deadline({ enabled, start }) → { ready, allowed, deadline, label } com a contagem "Ends in 47h 12m",
//     atualizada a cada 30 s com o relógio do SERVIDOR (diferença medida na resposta), sem nunca reiniciar nada.
// Falha de rede = 'unknown': a oferta segue como era antes do prazo, sem contagem (nada inventado).
import { useEffect, useState } from 'react'
import {
  WELCOME20_DEADLINE_API,
  WELCOME20_DEADLINE_UNKNOWN,
  welcome20DeadlineLabel,
  welcome20OfferAllowed,
  type Welcome20Deadline,
  type Welcome20DeadlineState,
  type Welcome20DeadlineSurface,
} from './welcome20Deadline'

const STATES: readonly Welcome20DeadlineState[] = ['no_account', 'not_started', 'active', 'expired', 'unknown', 'off']

let readPromise: Promise<Welcome20Deadline> | null = null
let startPromise: Promise<Welcome20Deadline> | null = null
/** Relógio do servidor − relógio do navegador (ms), medido na última resposta. */
let serverSkewMs = 0

function parseReply(json: unknown): Welcome20Deadline {
  const r = (json ?? {}) as { state?: unknown; startedAt?: unknown; endsAt?: unknown; now?: unknown }
  const state = typeof r.state === 'string' && (STATES as readonly string[]).includes(r.state) ? (r.state as Welcome20DeadlineState) : 'unknown'
  const serverNow = typeof r.now === 'string' ? Date.parse(r.now) : NaN
  if (Number.isFinite(serverNow)) serverSkewMs = serverNow - Date.now()
  return {
    state,
    startedAt: typeof r.startedAt === 'string' ? r.startedAt : null,
    endsAt: typeof r.endsAt === 'string' ? r.endsAt : null,
  }
}

async function call(method: 'GET' | 'POST', surface: Welcome20DeadlineSurface | null): Promise<Welcome20Deadline> {
  try {
    const res = await fetch(WELCOME20_DEADLINE_API, {
      method,
      credentials: 'same-origin',
      cache: 'no-store',
      ...(method === 'POST' ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ surface }) } : {}),
    })
    if (!res.ok) return WELCOME20_DEADLINE_UNKNOWN
    return parseReply(await res.json())
  } catch {
    return WELCOME20_DEADLINE_UNKNOWN
  }
}

/** Lê (surface null) ou lê-e-começa (surface). Uma chamada de cada por página; o começo vence a leitura. */
export function fetchWelcome20Deadline(surface: Welcome20DeadlineSurface | null): Promise<Welcome20Deadline> {
  if (surface) {
    if (!startPromise) startPromise = call('POST', surface)
    return startPromise
  }
  if (startPromise) return startPromise
  if (!readPromise) readPromise = call('GET', null)
  return readPromise
}

/** "Ends in 47h 12m" pelo relógio do servidor; null sem prazo ativo. */
export function welcome20DeadlineLabelNow(deadline: Welcome20Deadline | null): string | null {
  return welcome20DeadlineLabel(deadline, Date.now() + serverSkewMs)
}

/** O prazo venceu enquanto a página estava aberta? (só a tela; o checkout decide de novo no servidor). */
function expiredNow(deadline: Welcome20Deadline | null): boolean {
  if (!deadline || deadline.state !== 'active' || !deadline.endsAt) return false
  return Date.parse(deadline.endsAt) <= Date.now() + serverSkewMs
}

/**
 * Para as vitrines SECUNDÁRIAS dos 20% (preço da home, botão das páginas que vendem, versão de 60 s do filme pronto):
 * só lê, e só com sessão no navegador (getSession é local: visitante sem conta não gera chamada nenhuma). Devolve false
 * apenas quando o servidor disse que o prazo desta conta venceu; antes disso, a vitrine é a de sempre (o checkout decide
 * de novo no servidor e cobra o preço cheio de quem venceu).
 */
export function useWelcome20OfferLive(live: boolean): boolean {
  const [expired, setExpired] = useState(false)
  useEffect(() => {
    if (!live) return
    let alive = true
    void import('@/lib/supabase/client')
      .then(({ createClient }) => createClient().auth.getSession())
      .then(({ data }) => (data.session ? fetchWelcome20Deadline(null) : null))
      .then((d) => { if (alive && d && (!welcome20OfferAllowed(d.state) || expiredNow(d))) setExpired(true) })
      .catch(() => { /* sem leitura: a vitrine de sempre */ })
    return () => { alive = false }
  }, [live])
  return live && !expired
}

export function useWelcome20Deadline(input: { enabled: boolean; start: Welcome20DeadlineSurface | null }): {
  ready: boolean
  allowed: boolean
  deadline: Welcome20Deadline | null
  label: string | null
} {
  const [deadline, setDeadline] = useState<Welcome20Deadline | null>(null)
  const [, setTick] = useState(0)
  useEffect(() => {
    if (!input.enabled) return
    let alive = true
    void fetchWelcome20Deadline(input.start).then((d) => { if (alive) setDeadline(d) })
    return () => { alive = false }
  }, [input.enabled, input.start])
  useEffect(() => {
    if (!deadline || deadline.state !== 'active') return
    const id = window.setInterval(() => setTick((n) => n + 1), 30000)
    return () => window.clearInterval(id)
  }, [deadline])
  const effective: Welcome20Deadline | null = deadline && expiredNow(deadline) ? { ...deadline, state: 'expired' } : deadline
  return {
    ready: effective !== null,
    allowed: welcome20OfferAllowed(effective?.state),
    deadline: effective,
    label: welcome20DeadlineLabelNow(effective),
  }
}
