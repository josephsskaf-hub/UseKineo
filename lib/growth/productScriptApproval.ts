import type { ProductScriptLine } from '@/lib/growth/productToVideo'

export const PRODUCT_SCRIPT_APPROVAL_VERSION = 'product_script_approval_v1' as const
export const PRODUCT_SCRIPT_SHARE_URL =
  `https://www.usekineo.com/product-to-video-script?utm_source=product_script_copy&utm_medium=referral&utm_campaign=${PRODUCT_SCRIPT_APPROVAL_VERSION}` as const

export type ProductScriptDraftSource = 'manual' | 'example'

function cleanLine(value: string): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, 240)
}

export function buildProductScriptApprovalText(lines: readonly ProductScriptLine[]): string {
  const script = lines
    .slice(0, 5)
    .map((line) => {
      const label = cleanLine(line.label).toUpperCase().slice(0, 18)
      const text = cleanLine(line.text)
      return label && text ? `${label}: ${text}` : text
    })
    .filter(Boolean)
    .join('\n\n')

  if (!script) return ''
  return [
    'PRODUCT SHORT SCRIPT — FOR REVIEW',
    '',
    script,
    '',
    'Prepared with Kineo’s free fact-bounded product video script builder:',
    PRODUCT_SCRIPT_SHARE_URL,
  ].join('\n')
}

export function productScriptApprovalMetadata(draftSource?: ProductScriptDraftSource) {
  return {
    version: PRODUCT_SCRIPT_APPROVAL_VERSION,
    surface: 'product_to_video_script',
    output_type: 'fact_bounded_product_script',
    ...(draftSource ? { draft_source: draftSource } : {}),
  } as const
}
