import { TRIAL_BALANCE_BRIDGE_VERSION } from '@/lib/growth/trialBalanceBridge'

export type TrialBalanceBridgeEvent = {
  name: string
  user_id: string | null
  session_id: string | null
  created_at: string | null
  metadata: Record<string, unknown> | null
}

export type TrialBalanceBridgeFunnel = {
  viewers: number
  clickers: number
  premiumCompleters: number
  checkoutStarters: number
  subscribers: number
  viewToClickRate: string
  clickToPremiumRate: string
  premiumToCheckoutRate: string
  checkoutToPaidRate: string
}

function actor(event: TrialBalanceBridgeEvent): string | null {
  return event.user_id || event.session_id || null
}

function at(event: TrialBalanceBridgeEvent): number | null {
  if (!event.created_at) return null
  const parsed = new Date(event.created_at).getTime()
  return Number.isFinite(parsed) ? parsed : null
}

function rate(numerator: number, denominator: number): string {
  return denominator > 0 ? `${((numerator / denominator) * 100).toFixed(1)}%` : '—'
}

function isBridgeCampaign(event: TrialBalanceBridgeEvent): boolean {
  return event.metadata?.intent_campaign === TRIAL_BALANCE_BRIDGE_VERSION
}

/** One ordered journey per person; duplicate views and mirrored completions do not inflate it. */
export function buildTrialBalanceBridgeFunnel(events: TrialBalanceBridgeEvent[]): TrialBalanceBridgeFunnel {
  const rows = events
    .map((event) => ({ event, actor: actor(event), at: at(event) }))
    .filter((row): row is { event: TrialBalanceBridgeEvent; actor: string; at: number } => row.actor !== null && row.at !== null)
    .sort((a, b) => a.at - b.at)

  const byActor = new Map<string, typeof rows>()
  for (const row of rows) {
    const current = byActor.get(row.actor)
    if (current) current.push(row)
    else byActor.set(row.actor, [row])
  }

  let viewers = 0
  let clickers = 0
  let premiumCompleters = 0
  let checkoutStarters = 0
  let subscribers = 0

  for (const journey of byActor.values()) {
    const view = journey.find((row) => row.event.name === 'trial_balance_bridge_viewed')
    if (!view) continue
    viewers += 1

    const click = journey.find((row) => row.event.name === 'trial_balance_bridge_clicked' && row.at >= view.at)
    if (!click) continue
    clickers += 1

    const completion = journey.find((row) =>
      row.event.name === 'video_generation_completed' &&
      row.at >= click.at &&
      isBridgeCampaign(row.event) &&
      row.event.metadata?.quality === 'cinematic_ai'
    )
    if (!completion) continue
    premiumCompleters += 1

    const checkout = journey.find((row) =>
      row.event.name === 'checkout_started' && row.at >= completion.at && isBridgeCampaign(row.event)
    )
    if (!checkout) continue
    checkoutStarters += 1

    const payment = journey.find((row) => row.event.name === 'payment_success' && row.at >= checkout.at)
    if (!payment) continue
    subscribers += 1
  }

  return {
    viewers,
    clickers,
    premiumCompleters,
    checkoutStarters,
    subscribers,
    viewToClickRate: rate(clickers, viewers),
    clickToPremiumRate: rate(premiumCompleters, clickers),
    premiumToCheckoutRate: rate(checkoutStarters, premiumCompleters),
    checkoutToPaidRate: rate(subscribers, checkoutStarters),
  }
}
