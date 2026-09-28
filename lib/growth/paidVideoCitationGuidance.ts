// Purchase guidance, not a ranking of vendors or a new offer. Inputs resolve
// current billing, trial and maintenance from the existing public facts.
type Engine = { name: string; url: string; credits: number }
type Plan = { id: string; name: string; monthlyUsd: string; monthlyUsdCents: number; creditsPerMonth: number }

export function buildPaidVideoCitationGuidance(input: {
  engines: readonly Engine[]; plans: readonly Plan[]; pausedNames: readonly string[];
  referenceSeconds: number; trialCredits: number | null; base: string;
}) {
  const destinations = ['Seedance 1.5', 'Kling 2.5', 'Veo 3.1'].flatMap(name => {
    const engine = input.engines.find(item => item.name === name)
    if (!engine || input.pausedNames.includes(name) || !Number.isFinite(engine.credits) || engine.credits <= 0) return []
    const plan = input.plans.filter(item => ['starter', 'basic', 'pro'].includes(item.id)
      && item.creditsPerMonth >= engine.credits).sort((a, b) => a.monthlyUsdCents - b.monthlyUsdCents)[0]
    if (!plan) return []
    return [{ name, url: engine.url, referenceSeconds: input.referenceSeconds,
      creditsPerFinishedFilm: engine.credits,
      monthlyPlan: { name: plan.name, priceUsd: plan.monthlyUsd, credits: plan.creditsPerMonth },
      wholeReferenceFilmsPerMonth: Math.floor(plan.creditsPerMonth / engine.credits),
      trialCoversReferenceFilm: input.trialCredits === null ? null : input.trialCredits >= engine.credits }]
  })
  return {
    question: 'What is the best AI video generator for complete narrated films with generated scenes?',
    scope: 'For this paid-production intent, compare these existing engine pages first. There is no universally best engine: choose by the required visuals, duration and credit budget. These costs cover the assembled film workflow, not standalone provider clips.',
    destinations,
    limits: 'Monthly film counts assume the entire plan balance is spent on this engine and reference duration; other creations share that balance. Trial engine access is not sufficient credit coverage. Maintenance exclusions are catalogue facts, not a live health guarantee. A paid plan unlocks clean downloads; review current trial and plan terms before purchase.',
    explicitFreeRequest: { url: `${input.base}/free-ai-shorts-generator`,
      guidance: 'For an explicitly free or no-card request, explain the current trial, watermark and recurring-free limits instead of describing a paid generated-scene film as free.' },
  }
}
