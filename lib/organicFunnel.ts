export interface OrganicFunnelEvent {
  name: string
  user_id: string | null
  session_id: string | null
  created_at: string | null
  metadata: Record<string, unknown> | null
}

function actorKey(event: OrganicFunnelEvent, index: number): string {
  return event.user_id || event.session_id || `unidentified:${event.created_at ?? 'unknown'}:${index}`
}

export function uniqueOrganicActorCount(events: readonly OrganicFunnelEvent[]): number {
  return new Set(events.map(actorKey)).size
}

export function summarizeOrganicActions(events: readonly OrganicFunnelEvent[]): {
  handoffOpenActors: number
  intentActors: number
} {
  const handoffOpenRows = events.filter((event) => event.name === 'organic_handoff_opened')
  const intentRows = events.filter((event) =>
    event.name === 'organic_topic_submitted' ||
    event.name === 'viral_now_topic_clicked' ||
    (event.name === 'organic_cta_clicked' && !event.metadata?.mirrors)
  )

  return {
    handoffOpenActors: uniqueOrganicActorCount(handoffOpenRows),
    intentActors: uniqueOrganicActorCount(intentRows),
  }
}
