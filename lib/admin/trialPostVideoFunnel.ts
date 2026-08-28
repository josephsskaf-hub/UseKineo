export type TrialOfferEvent = {
  name: string
  user_id: string | null
  session_id: string | null
  created_at: string | null
  metadata: Record<string, unknown> | null
}

export type TrialOfferSourceRow = {
  source: string
  views: number
  clicks: number
  checkoutStarts: number
  payments: number
}

export type TrialPostVideoFunnel = {
  views: number
  clicks: number
  checkoutStarts: number
  payments: number
  noClickViewers: number
  checkoutAfterViewWithoutClick: number
  singlePrimaryViews: number
  singlePrimaryClicks: number
  viewToClickRate: string
  clickToCheckoutRate: string
  checkoutToPaidRate: string
  sourceBreakdown: TrialOfferSourceRow[]
}

type ActorJourney = {
  source: string
  clickedAt: number | null
  checkoutAt: number | null
  paymentAt: number | null
  singlePrimaryViewed: boolean
  singlePrimaryClicked: boolean
  checkoutAfterViewWithoutClick: boolean
}

const CLICK_CHECKOUT_SKEW_MS = 2 * 60 * 1000

function percent(numerator: number, denominator: number): string {
  if (denominator <= 0) return '—'
  return `${((numerator / denominator) * 100).toFixed(1)}%`
}

function eventActor(event: TrialOfferEvent): string | null {
  return event.user_id || event.session_id || null
}

function eventTime(event: TrialOfferEvent): number | null {
  if (!event.created_at) return null
  const value = new Date(event.created_at).getTime()
  return Number.isFinite(value) ? value : null
}

function isSinglePrimary(event: TrialOfferEvent): boolean {
  return event.metadata?.offer_layout === 'single_primary_v1'
}

/**
 * Person-level causal funnel. Checkout is credited only after the same actor
 * clicked the trial offer (with a small request-race tolerance), and payment
 * only after that checkout. Unrelated later purchases never inflate the card.
 */
export function buildTrialPostVideoFunnel(
  events: TrialOfferEvent[],
  sourceByUserId: ReadonlyMap<string, string>,
): TrialPostVideoFunnel {
  const sorted = events
    .map((event) => ({ event, at: eventTime(event), actor: eventActor(event) }))
    .filter((row): row is { event: TrialOfferEvent; at: number; actor: string } => row.at !== null && row.actor !== null)
    .sort((a, b) => a.at - b.at)

  const byActor = new Map<string, typeof sorted>()
  for (const row of sorted) {
    const prior = byActor.get(row.actor)
    if (prior) prior.push(row)
    else byActor.set(row.actor, [row])
  }

  const journeys: ActorJourney[] = []
  for (const rows of byActor.values()) {
    const firstView = rows.find((row) => row.event.name === 'trial_post_video_offer_viewed')
    if (!firstView) continue
    const click = rows.find((row) =>
      row.event.name === 'trial_post_video_offer_clicked' && row.at >= firstView.at
    )
    const checkout = click
      ? rows.find((row) =>
          row.event.name === 'checkout_started' &&
          row.at >= Math.max(firstView.at, click.at - CLICK_CHECKOUT_SKEW_MS)
        )
      : undefined
    const payment = checkout
      ? rows.find((row) => row.event.name === 'payment_success' && row.at >= checkout.at)
      : undefined
    const checkoutAfterView = rows.find((row) =>
      row.event.name === 'checkout_started' && row.at >= firstView.at
    )
    const userId = firstView.event.user_id

    journeys.push({
      source: (userId && sourceByUserId.get(userId)) || 'direct / unknown',
      clickedAt: click?.at ?? null,
      checkoutAt: checkout?.at ?? null,
      paymentAt: payment?.at ?? null,
      singlePrimaryViewed: rows.some((row) =>
        row.event.name === 'trial_post_video_offer_viewed' && row.at >= firstView.at && isSinglePrimary(row.event)
      ),
      singlePrimaryClicked: rows.some((row) =>
        row.event.name === 'trial_post_video_offer_clicked' && row.at >= firstView.at && isSinglePrimary(row.event)
      ),
      checkoutAfterViewWithoutClick: !click && Boolean(checkoutAfterView),
    })
  }

  const sourceMap = new Map<string, TrialOfferSourceRow>()
  for (const journey of journeys) {
    const row = sourceMap.get(journey.source) ?? {
      source: journey.source,
      views: 0,
      clicks: 0,
      checkoutStarts: 0,
      payments: 0,
    }
    row.views += 1
    if (journey.clickedAt !== null) row.clicks += 1
    if (journey.checkoutAt !== null) row.checkoutStarts += 1
    if (journey.paymentAt !== null) row.payments += 1
    sourceMap.set(journey.source, row)
  }

  const views = journeys.length
  const clicks = journeys.filter((journey) => journey.clickedAt !== null).length
  const checkoutStarts = journeys.filter((journey) => journey.checkoutAt !== null).length
  const payments = journeys.filter((journey) => journey.paymentAt !== null).length

  return {
    views,
    clicks,
    checkoutStarts,
    payments,
    noClickViewers: views - clicks,
    checkoutAfterViewWithoutClick: journeys.filter((journey) => journey.checkoutAfterViewWithoutClick).length,
    singlePrimaryViews: journeys.filter((journey) => journey.singlePrimaryViewed).length,
    singlePrimaryClicks: journeys.filter((journey) => journey.singlePrimaryClicked).length,
    viewToClickRate: percent(clicks, views),
    clickToCheckoutRate: percent(checkoutStarts, clicks),
    checkoutToPaidRate: percent(payments, checkoutStarts),
    sourceBreakdown: Array.from(sourceMap.values()).sort((a, b) =>
      b.views - a.views || a.source.localeCompare(b.source)
    ),
  }
}
