export const AGENCY_MARGIN_PROPOSAL_VARIANT = 'agency_margin_proposal_v1' as const

const ALLOWED_VOLUMES = new Set([10, 20, 30, 50])

export type AgencyProposalPriceBand = 'under_15' | '15_29' | '30_59' | '60_plus'

export interface AgencyClientProposalInput {
  videos: number
  clientPriceMinor: number
  approvalHref: string
}

function validMinor(value: number): number {
  return Number.isSafeInteger(value) && value > 0 ? value : 0
}

function formatUsd(minor: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(minor / 100)
}

export function agencyProposalPriceBand(clientPriceMinor: number): AgencyProposalPriceBand {
  const price = validMinor(clientPriceMinor)
  if (price < 1500) return 'under_15'
  if (price < 3000) return '15_29'
  if (price < 6000) return '30_59'
  return '60_plus'
}

export function buildAgencyProposalApprovalHref(): string {
  return `/client-video-brief-generator?${new URLSearchParams({
    utm_source: 'agency_margin_proposal',
    utm_medium: 'referral',
    utm_campaign: AGENCY_MARGIN_PROPOSAL_VARIANT,
  }).toString()}`
}

export function buildAgencyClientProposal(input: AgencyClientProposalInput): string | null {
  const videos = Math.floor(input.videos)
  const clientPriceMinor = validMinor(input.clientPriceMinor)
  const approvalHref = input.approvalHref.trim()
  if (!ALLOWED_VOLUMES.has(videos) || clientPriceMinor === 0 || !approvalHref) return null

  const projectTotalMinor = videos * clientPriceMinor
  return [
    'SHORT-FORM VIDEO PROPOSAL — DRAFT',
    '',
    `Scope: ${videos} vertical 9:16 Fast Shorts`,
    `Client price: ${formatUsd(clientPriceMinor)} per finished Short`,
    `Project total: ${formatUsd(projectTotalMinor)}`,
    '',
    'Included',
    '- Script, AI voice, matched visuals and burned-in captions',
    '- Clean vertical MP4 files for commercial delivery',
    '- One approval brief before production starts',
    '',
    'Confirm before acceptance',
    '- Timeline, revision rounds, posting, source files, usage terms, taxes and payment schedule',
    '- Every claim, result, quote and limitation the videos may use',
    '',
    `Client approval brief: ${approvalHref}`,
    '',
    'Draft only. Review the scope and commercial terms before sending or accepting it.',
  ].join('\n')
}
