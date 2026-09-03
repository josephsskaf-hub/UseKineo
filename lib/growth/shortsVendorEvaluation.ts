export const SHORTS_VENDOR_EVALUATION_VERSION = 'b2b_vendor_evaluation_v1' as const
export const SHORTS_VENDOR_EVALUATION_SOURCE = 'vendor_evaluation_sheet' as const
export const SHORTS_VENDOR_EVALUATION_MEDIUM = 'referral' as const
export const SHORTS_VENDOR_EVALUATION_PATH = '/short-form-video-vendor-evaluation.csv' as const

export interface VendorEvaluationRow {
  category: string
  requirement: string
  evidenceToRequest: string
  vendorA: string
  vendorB: string
  owner: string
  decision: string
}

export interface VendorEvaluationWorksheet {
  version: typeof SHORTS_VENDOR_EVALUATION_VERSION
  generatedFor: string
  publisher: string
  disclosure: string
  instructions: string
  rows: readonly VendorEvaluationRow[]
}

function canonicalUrl(baseUrl: string, path: string): string {
  const base = new URL(baseUrl)
  const url = new URL(path, base)
  if (base.origin !== 'https://www.usekineo.com' || url.origin !== base.origin) {
    throw new Error('Vendor evaluation worksheet requires one canonical HTTPS origin')
  }
  return url.toString()
}

function briefUrl(baseUrl: string): string {
  const url = new URL(canonicalUrl(baseUrl, '/client-video-brief-generator'))
  url.searchParams.set('utm_source', SHORTS_VENDOR_EVALUATION_SOURCE)
  url.searchParams.set('utm_medium', SHORTS_VENDOR_EVALUATION_MEDIUM)
  url.searchParams.set('utm_campaign', SHORTS_VENDOR_EVALUATION_VERSION)
  return url.toString()
}

export function buildShortsVendorEvaluation(baseUrl: string): VendorEvaluationWorksheet {
  const rows: VendorEvaluationRow[] = [
    ['Production', 'Monthly short-form volume', 'Document the number of finished videos included and what consumes capacity.'],
    ['Formats', 'Required aspect ratios', 'Confirm which aspect ratios are supported and whether one output includes one or several formats.'],
    ['Turnaround', 'Expected delivery time', 'Request a measured range and ask what happens during provider delays.'],
    ['Workflow', 'Review and approval', 'Run one sample from brief through revision, approval and final download.'],
    ['Accuracy', 'Claims and source material', 'Ask how supplied facts are preserved and who approves statements before publishing.'],
    ['Brand safety', 'Restricted or sensitive content', 'Request the written policy and the recovery path when a scene is rejected.'],
    ['Ownership', 'Finished-file rights', 'Read the current terms for commercial use, storage, deletion and customer responsibility.'],
    ['Export', 'Usable final deliverable', 'Verify file format, watermark rules, captions and whether project access is required later.'],
    ['Team', 'Access and handoff', 'Confirm seats, roles, client review, account ownership and offboarding before purchase.'],
    ['Support', 'Failure and refund handling', 'Ask how failed work is detected, retried, credited and escalated.'],
    ['Commercial', 'Billing model', 'Separate recurring subscription, one-time purchase and managed service before comparing totals.'],
    ['Decision', 'Named owner and acceptance test', 'Assign one decision owner and define the sample that must pass before rollout.'],
  ].map(([category, requirement, evidenceToRequest]) => ({
    category,
    requirement,
    evidenceToRequest,
    vendorA: '',
    vendorB: '',
    owner: '',
    decision: '',
  }))
  rows.push({
    category: 'Optional Kineo resource',
    requirement: 'Create a client-ready short-video brief',
    evidenceToRequest: briefUrl(baseUrl),
    vendorA: '',
    vendorB: '',
    owner: '',
    decision: '',
  })
  return {
    version: SHORTS_VENDOR_EVALUATION_VERSION,
    generatedFor: 'Short-form video vendor evaluation',
    publisher: 'Kineo',
    disclosure: 'The criteria are vendor-neutral. The optional Kineo resource is a first-party example; request equivalent evidence from every vendor.',
    instructions: 'Use one row per requirement. Record evidence, not sales claims. Keep unknowns visible and make the decision owner explicit.',
    rows,
  }
}

export function safeCsvCell(raw: string): string {
  const normalized = raw.replace(/\r\n?/g, '\n')
  const formulaSafe = /^[\t\n ]*[=+\-@]/.test(normalized) ? `'${normalized}` : normalized
  return `"${formulaSafe.replace(/"/g, '""')}"`
}

export function renderShortsVendorEvaluationCsv(sheet: VendorEvaluationWorksheet): string {
  const columns = ['Category', 'Requirement', 'Evidence to request', 'Vendor A', 'Vendor B', 'Owner', 'Decision']
  const body = sheet.rows.map((row) => [
    row.category,
    row.requirement,
    row.evidenceToRequest,
    row.vendorA,
    row.vendorB,
    row.owner,
    row.decision,
  ].map(safeCsvCell).join(','))
  return [
    ['Worksheet version', sheet.version, '', '', '', '', ''].map(safeCsvCell).join(','),
    ['Publisher', sheet.publisher, '', '', '', '', ''].map(safeCsvCell).join(','),
    ['Disclosure', sheet.disclosure, '', '', '', '', ''].map(safeCsvCell).join(','),
    ['Instructions', sheet.instructions, '', '', '', '', ''].map(safeCsvCell).join(','),
    columns.map(safeCsvCell).join(','),
    ...body,
    '',
  ].join('\r\n')
}
