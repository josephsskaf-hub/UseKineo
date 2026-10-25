// KINEO-TRENDING-CAPAS-2510 — authored editorial covers, never evidence of a generated film.
// Each rotating topic gets a local illustration; real house films retain their own poster and engine.
const TOPIC_COVERS: Readonly<Record<string, string>> = {
  billionaire: 'billionaire', money: 'money', ai: 'ai', psychology: 'psychology',
  mystery: 'mystery', history: 'history', science: 'science', country: 'country',
  health: 'health', space: 'space', nature: 'nature', technology: 'technology', crime: 'crime',
}

export function topicCoverFor(vertical: string): string {
  const name = Object.prototype.hasOwnProperty.call(TOPIC_COVERS, vertical) ? TOPIC_COVERS[vertical] : 'default'
  return `/trending/topics/${name}.svg`
}
