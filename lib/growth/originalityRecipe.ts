export const ORIGINALITY_RECIPE_OPTIONS = [
  {
    id: 'surprising_explanation',
    label: 'Explain the surprise',
    description: 'Reveal the counterintuitive reason behind the topic.',
    direction: 'Open with a surprising claim, explain the counterintuitive reason behind it, and end with one useful takeaway.',
  },
  {
    id: 'myth_vs_fact',
    label: 'Myth vs. fact',
    description: 'Challenge a common belief with evidence and context.',
    direction: 'Open with a common belief, challenge it with a specific fact, explain the missing context, and end with the corrected takeaway.',
  },
  {
    id: 'story_with_payoff',
    label: 'Tell a short story',
    description: 'Use tension, one turning point and a clear payoff.',
    direction: 'Tell a concise story with an immediate hook, rising tension, one turning point, and a clear payoff for the viewer.',
  },
  {
    id: 'practical_breakdown',
    label: 'Give a useful breakdown',
    description: 'Turn the topic into steps the viewer can use.',
    direction: 'Frame one practical problem, break the solution into three specific steps, and end with the first action the viewer should take.',
  },
] as const

export type OriginalityRecipeId = (typeof ORIGINALITY_RECIPE_OPTIONS)[number]['id']

const TOPIC_MAX = 180

export function cleanOriginalityTopic(topic: string): string {
  return topic.replace(/\s+/g, ' ').trim().slice(0, TOPIC_MAX)
}

export function buildOriginalityPrompt(topic: string, recipeId: OriginalityRecipeId): string {
  const cleanTopic = cleanOriginalityTopic(topic)
  const recipe = ORIGINALITY_RECIPE_OPTIONS.find((option) => option.id === recipeId)
    ?? ORIGINALITY_RECIPE_OPTIONS[0]

  if (!cleanTopic) return ''

  return [
    `Create an original 45-second faceless YouTube Short about: ${cleanTopic}.`,
    recipe.direction,
    'Use a distinct angle, concrete details, and natural language. Do not claim that monetization is guaranteed.',
  ].join(' ')
}
