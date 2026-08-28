export const PLATFORM_GOALS = ['reach', 'revenue', 'customers'] as const
export type PlatformGoal = (typeof PLATFORM_GOALS)[number]

export const PLATFORM_CONTENT_TYPES = ['stories', 'expertise', 'business'] as const
export type PlatformContentType = (typeof PLATFORM_CONTENT_TYPES)[number]

export type PlatformDecision = {
  primary: 'TikTok first' | 'YouTube Shorts first' | 'Publish to both'
  reason: string
  secondMove: string
  duration: 35 | 60
  prompt: string
}
const STARTER_PROMPTS: Record<PlatformContentType, string> = {
  stories:
    'Tell the fact-checked mystery of the Mary Celeste as a suspenseful vertical story. Open on the abandoned ship, reveal one clue at a time, and end with the strongest unresolved question.',
  expertise:
    'Explain the three-second hook test with one surprising example, one mistake creators make, and a payoff viewers can use on their next short-form video.',
  business:
    'Tell a before-and-after story about a local business turning its most common customer question into a short video that earns attention and trust. Keep the lesson practical, not salesy.',
}

export function decidePlatformRoute(
  goal: PlatformGoal,
  contentType: PlatformContentType,
): PlatformDecision {
  const prompt = STARTER_PROMPTS[contentType]

  if (goal === 'reach') {
    return {
      primary: 'TikTok first',
      reason:
        'Use TikTok as the fast-feedback lane: publish the strongest hook there first, then carry the clean export to YouTube Shorts.',
      secondMove: 'If the first viewers stay through the reveal, cross-post the same clean file to YouTube Shorts.',
      duration: 60,
      prompt,
    }
  }

  if (goal === 'revenue') {
    return {
      primary: 'YouTube Shorts first',
      reason:
        'Use YouTube as the durable library: searchable, evergreen Shorts can keep finding viewers after the first distribution burst.',
      secondMove: 'Post the same clean export to TikTok to add discovery without doubling production work.',
      duration: 35,
      prompt,
    }
  }

  if (contentType === 'stories') {
    return {
      primary: 'Publish to both',
      reason:
        'Story-led videos can earn TikTok discovery and YouTube replay value. One clean vertical master lets you test both audiences.',
      secondMove: 'Use the same opening hook, but write a platform-native caption for each upload.',
      duration: 60,
      prompt,
    }
  }

  return {
    primary: 'YouTube Shorts first',
    reason:
      'For expertise and business content, YouTube gives the answer a longer shelf life while the video builds trust with future customers.',
    secondMove: 'Cross-post the clean export to TikTok as the reach layer after the YouTube upload is live.',
    duration: 35,
    prompt,
  }
}
