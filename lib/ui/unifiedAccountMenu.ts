import type { InternalRelease } from '@/lib/recreate/release'

export const ACCOUNT_MENU_RELEASE = 'off' as InternalRelease
export const ACCOUNT_MENU_MAY_RENDER = ACCOUNT_MENU_RELEASE !== 'off'
export const ACCOUNT_MENU_VISIBILITY_API = '/api/account/menu-visibility'
export const ACCOUNT_CREDITS_OFFER_SURFACE = 'account_offer'
export const PRICING_CREDITS_SURFACE = 'pricing_credits'

const PAGES = {
  '/': 'home',
  '/studio': 'studio',
  '/studio/create': 'studio_create',
  '/studio/previa': 'studio_preview',
  '/dashboard': 'dashboard',
  '/create/film': 'film',
  '/create/cartoon': 'cartoon',
  '/create/ads': 'create_ads',
  '/create/clip': 'clip',
  '/pricing': 'pricing',
  '/recreate': 'recreate',
  '/recreate-preview': 'recreate_preview',
  '/ads': 'ads',
  '/ads/new': 'ads_new',
  '/ads/producao': 'ads_production',
  '/ads/team': 'ads_team',
  '/ads/v2': 'ads_v2',
  '/effects': 'effects',
  '/examples': 'examples',
  '/showcase': 'showcase',
  '/made-with-kineo': 'made_with_kineo',
  '/tools': 'tools',
  '/tools/editor': 'video_editor',
  '/account': 'profile',
  '/library': 'library',
  '/clips': 'clips',
  '/images': 'images',
  '/audio': 'audio',
  '/animate': 'animate',
  '/kids-cartoon': 'kids_cartoon',
  '/templates': 'templates',
  '/affiliate': 'affiliate',
  '/autopilot': 'autopilot',
  '/avatar': 'avatar',
  '/baby-podcast': 'baby_podcast',
  '/channel': 'channel',
  '/create': 'create',
  '/generate': 'generate',
  '/history': 'history',
  '/my-videos': 'my_videos',
  '/referral': 'referral',
  '/spaces': 'spaces',
  '/thumbnail-generator': 'thumbnail_generator',
  '/v2': 'v2',
  '/video': 'video',
  '/viral-now': 'viral_now',
  '/best-ai-shorts-generators': 'best_ai_shorts_generators',
  '/for-creators': 'for_creators',
  '/free-ai-shorts': 'free_ai_shorts',
  '/free-ai-shorts-generator': 'free_ai_shorts_generator',
  '/gerador-de-shorts-gratis': 'gerador_de_shorts_gratis',
  '/state-of-ai-shorts-2026': 'state_of_ai_shorts',
  '/ai-video-generator': 'ai_video_generator',
  '/text-to-video-shorts': 'text_to_video_shorts',
  '/chatgpt': 'chatgpt',
} as const

/** Measure known surfaces without sending route IDs, prompt text or query strings. */
export function unifiedAccountSurface(pathname: string): string {
  const paths = pathname.split('/').filter(Boolean)
  for (const path of ['/' + paths.slice(0, 2).join('/'), '/' + paths.slice(0, 1).join('/')]) {
    if (Object.hasOwn(PAGES, path)) return `account_${PAGES[path as keyof typeof PAGES]}`
  }
  return 'account_public'
}

export function isAccountCreditsSurface(surface: unknown): surface is string {
  return typeof surface === 'string' && (
    surface === 'sidebar_chip' || surface === PRICING_CREDITS_SURFACE ||
    surface === 'account_public' || Object.values(PAGES).some(page => surface === `account_${page}`)
  )
}

export type AccountMenuPlacement = { left: number; width: number; top?: number; bottom?: number; maxHeight: number }

export function placeAccountMenu(
  anchor: { right: number; top: number; bottom: number }, viewport: { width: number; height: number }, panelWidth: number,
): AccountMenuPlacement {
  const inset = 12
  const gap = 8
  const width = Math.min(panelWidth, Math.max(0, viewport.width - 2 * inset))
  const left = Math.max(inset, Math.min(anchor.right - width, viewport.width - width - inset))
  const below = viewport.height - anchor.bottom
  const above = anchor.top
  const useTop = below >= above
  return {
    left, width,
    ...(useTop ? { top: Math.max(inset, anchor.bottom + gap) } : { bottom: Math.max(inset, viewport.height - anchor.top + gap) }),
    maxHeight: Math.max(0, (useTop ? below : above) - inset - gap),
  }
}
