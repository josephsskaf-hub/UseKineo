import { CHATGPT_QUICKSTART_VARIANT, type ChatGptQuickstartChoice } from '@/lib/growth/chatgptQuickstart'

export type ChatGptQuickstartEvent = {
  name: string
  user_id: string | null
  session_id: string | null
  created_at: string | null
  metadata: Record<string, unknown> | null
}

export type ChatGptQuickstartFunnel = {
  views: number
  selections: number
  scriptSelections: number
  ideaSelections: number
  studioReady: number
  starts: number
  completions: number
  checkoutStarts: number
  payments: number
  viewToSelectionRate: string
  selectionToStudioReadyRate: string
  studioReadyToStartRate: string
  selectionToStartRate: string
  startToCompleteRate: string
  completeToCheckoutRate: string
  checkoutToPaidRate: string
}

function actor(event: ChatGptQuickstartEvent): string | null {
  return event.user_id || event.session_id || null
}

function at(event: ChatGptQuickstartEvent): number | null {
  if (!event.created_at) return null
  const parsed = new Date(event.created_at).getTime()
  return Number.isFinite(parsed) ? parsed : null
}

function pct(numerator: number, denominator: number): string {
  if (denominator <= 0) return '—'
  return `${((numerator / denominator) * 100).toFixed(1)}%`
}

function quickstartChoice(event: ChatGptQuickstartEvent): ChatGptQuickstartChoice | null {
  const value = event.metadata?.input_type
  return value === 'finished_script' || value === 'idea' ? value : null
}

/**
 * Strict person/session-level journey. Every downstream stage must happen
 * after the prior one, so an unrelated old render or checkout cannot be
 * credited to the quick-start choice.
 */
export function buildChatGptQuickstartFunnel(events: ChatGptQuickstartEvent[]): ChatGptQuickstartFunnel {
  const rows = events
    .map((event) => ({ event, actor: actor(event), at: at(event) }))
    .filter((row): row is { event: ChatGptQuickstartEvent; actor: string; at: number } =>
      row.actor !== null && row.at !== null
    )
    .sort((a, b) => a.at - b.at)

  const byActor = new Map<string, typeof rows>()
  for (const row of rows) {
    const prior = byActor.get(row.actor)
    if (prior) prior.push(row)
    else byActor.set(row.actor, [row])
  }

  let views = 0
  let selections = 0
  let scriptSelections = 0
  let ideaSelections = 0
  let studioReady = 0
  let starts = 0
  let completions = 0
  let checkoutStarts = 0
  let payments = 0

  for (const journey of byActor.values()) {
    const view = journey.find((row) =>
      row.event.name === 'chatgpt_welcome_banner_shown' &&
      row.event.metadata?.variant === CHATGPT_QUICKSTART_VARIANT
    )
    if (!view) continue
    views += 1

    const selection = journey.find((row) =>
      row.event.name === 'chatgpt_quickstart_selected' &&
      row.event.metadata?.variant === CHATGPT_QUICKSTART_VARIANT &&
      quickstartChoice(row.event) !== null &&
      row.at >= view.at
    )
    if (!selection) continue
    selections += 1
    const choice = quickstartChoice(selection.event)
    if (choice === 'finished_script') scriptSelections += 1
    if (choice === 'idea') ideaSelections += 1

    const ready = journey.find((row) =>
      row.event.name === 'chatgpt_quickstart_studio_ready' &&
      row.event.metadata?.variant === CHATGPT_QUICKSTART_VARIANT &&
      quickstartChoice(row.event) === choice &&
      row.at >= selection.at
    )
    if (!ready) continue
    studioReady += 1

    const start = journey.find((row) => row.event.name === 'generate_started' && row.at >= ready.at)
    if (!start) continue
    starts += 1

    const completion = journey.find((row) => row.event.name === 'generate_completed' && row.at >= start.at)
    if (!completion) continue
    completions += 1

    const checkout = journey.find((row) => row.event.name === 'checkout_started' && row.at >= completion.at)
    if (!checkout) continue
    checkoutStarts += 1

    const payment = journey.find((row) => row.event.name === 'payment_success' && row.at >= checkout.at)
    if (payment) payments += 1
  }

  return {
    views,
    selections,
    scriptSelections,
    ideaSelections,
    studioReady,
    starts,
    completions,
    checkoutStarts,
    payments,
    viewToSelectionRate: pct(selections, views),
    selectionToStudioReadyRate: pct(studioReady, selections),
    studioReadyToStartRate: pct(starts, studioReady),
    selectionToStartRate: pct(starts, selections),
    startToCompleteRate: pct(completions, starts),
    completeToCheckoutRate: pct(checkoutStarts, completions),
    checkoutToPaidRate: pct(payments, checkoutStarts),
  }
}

