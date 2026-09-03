export const CLIENT_SHORT_BRIEF_CAMPAIGN = 'client_short_brief_v1' as const
export const CLIENT_SHORT_BRIEF_SHARE_CAMPAIGN = 'client_short_brief_share_v1' as const

export type ClientShortBriefEntry =
  | 'organic'
  | 'client_intake_share'
  | 'affiliate_client_intake'
  | 'agency_margin_proposal'
  | 'agency_page'

/**
 * Classifies the current door into the brief tool without replacing the
 * product-wide first-touch UTM contract. Only exact, owned pairs are accepted;
 * arbitrary query strings fail closed to organic.
 */
export function readClientShortBriefEntry(search: string): ClientShortBriefEntry {
  const params = new URLSearchParams(search)
  const source = params.get('utm_source')
  const medium = params.get('utm_medium')
  const campaign = params.get('utm_campaign')

  if (source === 'affiliate' && medium === 'partner' && campaign === 'affiliate_client_brief') {
    return 'affiliate_client_intake'
  }
  if (source === 'client_brief_share' && campaign === CLIENT_SHORT_BRIEF_SHARE_CAMPAIGN) {
    return 'client_intake_share'
  }
  if (source === 'agency_margin_proposal' && campaign === 'agency_margin_proposal_v1') {
    return 'agency_margin_proposal'
  }
  if (params.get('entry') === 'agency_page') return 'agency_page'
  return 'organic'
}

export const CLIENT_SHORT_GOALS = [
  { id: 'leads', label: 'Generate qualified leads' },
  { id: 'explain', label: 'Explain the offer clearly' },
  { id: 'trust', label: 'Build trust before the sale' },
  { id: 'launch', label: 'Support a launch' },
] as const

export type ClientShortGoal = (typeof CLIENT_SHORT_GOALS)[number]['id']

export interface ClientShortBriefInput {
  offer: string
  audience: string
  goal: ClientShortGoal
  proof: string
  cta: string
}

export interface ClientShortBrief {
  title: string
  objective: string
  audience: string
  hookDirection: string
  storyBeats: string[]
  visualDirection: string
  proofBoundary: string
  callToAction: string
  approvalChecklist: string[]
}

function clean(value: string | null | undefined, limit: number): string {
  return (value ?? '').replace(/\s+/g, ' ').trim().slice(0, limit)
}

export function normalizeClientShortBriefInput(input: ClientShortBriefInput): ClientShortBriefInput {
  return {
    offer: clean(input.offer, 140),
    audience: clean(input.audience, 100),
    goal: CLIENT_SHORT_GOALS.some((option) => option.id === input.goal) ? input.goal : 'leads',
    proof: clean(input.proof, 180),
    cta: clean(input.cta, 100),
  }
}

function goalObjective(goal: ClientShortGoal): string {
  const objectives: Record<ClientShortGoal, string> = {
    leads: 'Help the right viewer recognize a real problem and choose a useful next step.',
    explain: 'Make the offer understandable in one viewing without hiding its limits.',
    trust: 'Show one verifiable reason to believe before asking for action.',
    launch: 'Connect the launch to one concrete use case without fake urgency.',
  }
  return objectives[goal]
}

export function buildClientShortBrief(raw: ClientShortBriefInput): ClientShortBrief | null {
  const input = normalizeClientShortBriefInput(raw)
  if (input.offer.length < 8 || input.audience.length < 4) return null

  const proof = input.proof || '[add one verified feature, process detail, demo, quote or limitation]'
  const cta = input.cta || '[add the real next step]'

  return {
    title: `35-second faceless Short for ${input.offer}`,
    objective: goalObjective(input.goal),
    audience: input.audience,
    hookDirection: `Open with the specific situation that sends ${input.audience} looking for ${input.offer}. Do not open with a generic question or an unsupported statistic.`,
    storyBeats: [
      `Problem: name one concrete friction ${input.audience} already recognizes.`,
      `Offer: explain what ${input.offer} does in plain language.`,
      `Proof: show or state only this supplied evidence — ${proof}.`,
      `Fit: say who should use it and preserve any important limitation.`,
      `Payoff: make the next step feel like the natural resolution, not a surprise pitch.`,
    ],
    visualDirection: `Vertical 9:16, faceless, readable captions, one visual idea per beat. Show the offer, process or outcome only when the supplied facts support it; avoid generic office meetings and unrelated spectacle.`,
    proofBoundary: `The finished video may use only facts supplied in this brief. Keep placeholders visible instead of inventing reviews, numbers, guarantees, discounts or deadlines. Supplied evidence: ${proof}.`,
    callToAction: cta,
    approvalChecklist: [
      'Every spoken claim is present in the supplied facts.',
      'The first two seconds name a concrete tension or outcome.',
      'Visuals illustrate the exact beat instead of adding a new claim.',
      'The CTA matches the real destination and has no fake urgency.',
    ],
  }
}

export function clientShortBriefAsText(brief: ClientShortBrief): string {
  return [
    brief.title,
    '',
    `OBJECTIVE\n${brief.objective}`,
    '',
    `AUDIENCE\n${brief.audience}`,
    '',
    `HOOK DIRECTION\n${brief.hookDirection}`,
    '',
    'STORY BEATS',
    ...brief.storyBeats.map((beat, index) => `${index + 1}. ${beat}`),
    '',
    `VISUAL DIRECTION\n${brief.visualDirection}`,
    '',
    `PROOF BOUNDARY\n${brief.proofBoundary}`,
    '',
    `CALL TO ACTION\n${brief.callToAction}`,
    '',
    'CLIENT APPROVAL CHECKLIST',
    ...brief.approvalChecklist.map((item) => `- ${item}`),
  ].join('\n')
}

export function buildClientShortActivationHref(brief: ClientShortBrief): string {
  // /signup intentionally caps forwarded prompts at 1,000 characters. Keep
  // the handoff compact and put the two commercially sensitive inputs (proof
  // and CTA) before creative direction so neither can be truncated. The full
  // client-facing brief remains available through clientShortBriefAsText().
  const suppliedEvidence = brief.proofBoundary.split('Supplied evidence: ').at(-1)?.replace(/\.$/, '') ?? '[add verified proof]'
  const prompt = [
    'Create a 35-second faceless 9:16 client Short from this approved brief.',
    `Offer: ${brief.title.replace(/^35-second faceless Short for /, '')}`,
    `Audience: ${brief.audience}`,
    `Goal: ${brief.objective}`,
    `Verified proof only: ${suppliedEvidence}`,
    `Exact CTA: ${brief.callToAction}`,
    'Structure: concrete hook, problem, offer, proof, fit, payoff, exact CTA. Use readable captions and relevant visuals. Never invent claims; keep missing facts as [placeholders].',
  ].join('\n')
  const destination = `/generate?${new URLSearchParams({
    prompt,
    duration: '35',
    autoanalyze: '1',
    intent_campaign: CLIENT_SHORT_BRIEF_CAMPAIGN,
  }).toString()}`
  return `/signup?${new URLSearchParams({
    utm_source: 'client_brief_generator',
    utm_medium: 'organic',
    utm_campaign: CLIENT_SHORT_BRIEF_CAMPAIGN,
    redirect: destination,
  }).toString()}`
}

export function buildClientShortBriefShareHref(): string {
  return `/client-video-brief-generator?${new URLSearchParams({
    utm_source: 'client_brief_share',
    utm_medium: 'referral',
    utm_campaign: CLIENT_SHORT_BRIEF_SHARE_CAMPAIGN,
  }).toString()}`
}
