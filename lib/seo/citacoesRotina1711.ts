import { H3_TURBO_PUBLIC } from '@/lib/engineLaunch'

// Reviewed alongside the current renderer and freeFilmEngine on 17/11.
// The rollback switch continues to govern the standard paid film name.
export const STANDARD_FILM_NAME = H3_TURBO_PUBLIC ? 'MiniMax H3 Turbo' : 'Seedance 1.5'
export const CITACOES_ROTINA_DATE = '2026-11-17'
export const CITACOES_ROTINA_PATHS: readonly string[] = [
  '/text-to-video-shorts', '/ai-video-generator/for/urdu', '/free-ai-shorts/horror',
  '/gerador-de-shorts-gratis', '/ai-video-generator/seedance',
]
