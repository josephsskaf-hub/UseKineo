import { normalizeInternalRedirect } from '@/lib/authRedirect'
import {
  PRODUCT_SURFACE_DESTINATIONS,
  type ProductSurface,
} from '@/lib/growth/productSurfaceIntent'

export type SignupProductDestinationPreview = {
  surface: ProductSurface
  eyebrow: string
  heading: string
  description: string
  destinationLabel: string
}

const PREVIEW: Record<ProductSurface, Omit<SignupProductDestinationPreview, 'surface'>> = {
  images: {
    eyebrow: 'Destination saved',
    heading: 'Your AI Image Studio is next',
    description: 'After sign-in, Kineo opens the image workspace. Nothing is generated until you choose a model and submit.',
    destinationLabel: 'AI Image Studio',
  },
  audio: {
    eyebrow: 'Destination saved',
    heading: 'Your AI Voice Studio is next',
    description: 'After sign-in, Kineo opens the voice workspace. Nothing is generated until you choose a voice and submit.',
    destinationLabel: 'AI Voice Studio',
  },
  fast: {
    eyebrow: 'Engine saved',
    heading: 'Kineo 1 Fast is selected',
    description: 'After sign-in, Kineo opens the Studio with Fast selected. Nothing starts until you review the setup and submit.',
    destinationLabel: 'Studio · Kineo 1 Fast',
  },
  seedance: {
    eyebrow: 'Engine saved',
    heading: 'Seedance is selected',
    description: 'After sign-in, Kineo opens the Studio with Seedance selected. Nothing starts until you review the setup and submit.',
    destinationLabel: 'Studio · Seedance',
  },
  h3: {
    eyebrow: 'Engine saved',
    heading: 'MiniMax H3 is selected',
    description: 'After sign-in, Kineo opens the Studio with MiniMax H3 selected and shows its credit cost before you submit. Nothing starts automatically.',
    destinationLabel: 'Studio · MiniMax H3',
  },
}

function destinationSignature(raw: string): string | null {
  const normalized = normalizeInternalRedirect(raw)
  if (!normalized) return null

  const parsed = new URL(normalized, 'https://kineo.local')
  const allowedKeys = parsed.pathname === '/studio'
    ? new Set(['engine', 'intent_campaign'])
    : new Set(['intent_campaign'])
  if ([...parsed.searchParams.keys()].some((key) => !allowedKeys.has(key))) return null

  if (parsed.pathname === '/studio') {
    const engine = parsed.searchParams.get('engine')
    return engine ? `${parsed.pathname}?engine=${engine}` : null
  }
  return parsed.pathname
}

/**
 * Turn only the five closed product redirects into reassuring auth copy. Any
 * checkout, affiliate or arbitrary redirect stays on the existing generic
 * signup contract and never gets interpreted as a product promise.
 */
export function buildSignupProductDestinationPreview(
  rawRedirect: string | null | undefined
): SignupProductDestinationPreview | null {
  if (!rawRedirect) return null
  const signature = destinationSignature(rawRedirect)
  if (!signature) return null

  for (const surface of Object.keys(PRODUCT_SURFACE_DESTINATIONS) as ProductSurface[]) {
    if (destinationSignature(PRODUCT_SURFACE_DESTINATIONS[surface]) === signature) {
      return { surface, ...PREVIEW[surface] }
    }
  }
  return null
}
