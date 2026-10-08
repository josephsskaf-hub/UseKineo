import { normalizeInternalRedirect } from '@/lib/authRedirect'
import {
  PRODUCT_SURFACE_DESTINATIONS,
  type ProductSurface,
} from '@/lib/growth/productSurfaceIntent'
import {
  ENGINE_LANDING_LABELS,
  ENGINE_LANDING_PARAMS,
  type EngineLandingParam,
} from '@/lib/growth/engineLandingIntent'

export type SignupProductDestinationPreview = {
  surface: ProductSurface | EngineLandingParam | 'spaces'
  eyebrow: string
  heading: string
  description: string
  destinationLabel: string
  /** Linha logo abaixo do título. Sem ela, o /signup usa a frase genérica de destino salvo. */
  subtitle?: string
}

export type SignupDestinationPreviewOptions = {
  /** Navegador em português (navigator.language "pt…"). Só o Spaces tem texto em português hoje. */
  portuguese?: boolean
}

const PREVIEW: Record<'images' | 'audio', Omit<SignupProductDestinationPreview, 'surface'>> = {
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
}

// KINEO-SPACES-VISITANTE-2026-10-08 — o /spaces sem login manda o visitante para /signup?redirect=/spaces
// (lib/spaces/visitorRedirect.ts). Quem chega assim vem, em geral, do canal do fundador no Instagram (público brasileiro,
// imóvel e negócio), e o cadastro dizia "Create your AI Short": vídeo, em inglês. Agora o destino Spaces tem texto próprio,
// em português quando o navegador é português. A promessa é só a verdade do produto: fotos de um espaço vazio → o espaço
// pronto, e nada é gerado antes de a pessoa enviar.
const SPACES_PREVIEW: Record<'en' | 'pt', Omit<SignupProductDestinationPreview, 'surface'>> = {
  en: {
    eyebrow: 'Destination saved',
    heading: 'Spaces is next',
    description: 'After sign-up, Kineo opens Spaces: upload photos of an empty space and choose a style. Nothing is generated until you submit.',
    destinationLabel: 'Kineo Spaces',
  },
  pt: {
    eyebrow: 'Destino salvo',
    heading: 'O Spaces abre em seguida',
    description: 'Depois do cadastro, a Kineo abre o Spaces: você envia as fotos de um espaço vazio e escolhe o estilo. Nada é gerado antes de você enviar.',
    destinationLabel: 'Kineo Spaces',
    subtitle: 'Crie sua conta grátis e continue de onde parou.',
  },
}

function parsedDestination(raw: string): { pathname: string; engine: string | null } | null {
  const normalized = normalizeInternalRedirect(raw)
  if (!normalized) return null

  const parsed = new URL(normalized, 'https://kineo.local')
  const keys = [...parsed.searchParams.keys()]
  if (new Set(keys).size !== keys.length) return null
  const allowedKeys = parsed.pathname === '/studio'
    ? new Set(['engine', 'intent_campaign'])
    : new Set(['intent_campaign'])
  if (keys.some((key) => !allowedKeys.has(key))) return null

  if (parsed.pathname === '/studio') {
    const engine = parsed.searchParams.get('engine')
    return engine ? { pathname: parsed.pathname, engine } : null
  }
  return { pathname: parsed.pathname, engine: null }
}

/**
 * Turn only the closed product redirects (the five product surfaces + Spaces)
 * into reassuring auth copy. Any checkout, affiliate or arbitrary redirect stays
 * on the existing generic signup contract and never gets interpreted as a
 * product promise.
 */
export function buildSignupProductDestinationPreview(
  rawRedirect: string | null | undefined,
  options: SignupDestinationPreviewOptions = {}
): SignupProductDestinationPreview | null {
  if (!rawRedirect) return null
  const destination = parsedDestination(rawRedirect)
  if (!destination) return null

  if (destination.pathname === '/studio' && destination.engine) {
    if (!ENGINE_LANDING_PARAMS.includes(destination.engine as EngineLandingParam)) return null
    const engine = destination.engine as EngineLandingParam
    const label = ENGINE_LANDING_LABELS[engine]
    return {
      surface: engine,
      eyebrow: 'Engine saved',
      heading: `${label} is selected`,
      description: `After sign-in, Kineo opens the Studio with ${label} selected and shows its credit cost before you submit. Nothing starts automatically.`,
      destinationLabel: `Studio · ${label}`,
    }
  }

  if (destination.pathname === '/spaces') {
    return { surface: 'spaces', ...SPACES_PREVIEW[options.portuguese ? 'pt' : 'en'] }
  }

  for (const surface of ['images', 'audio'] as const) {
    const canonical = parsedDestination(PRODUCT_SURFACE_DESTINATIONS[surface])
    if (canonical?.pathname === destination.pathname) {
      return { surface, ...PREVIEW[surface] }
    }
  }
  return null
}
