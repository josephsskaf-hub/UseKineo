import 'server-only'
import { CLIP_ENGINES } from '@/lib/clips/clipCatalog'
import { clipEffectByKey } from '@/lib/clips/clipEffects'
import { moldeDeTrechos } from '@/lib/recreate/invasorMolde'
import { catalogoNoSeedance25, SEU_VIDEO_MOTOR } from '@/lib/recreate/seuVideo'
import type { RecreateFormat } from '@/lib/recreate/formats'
import type { ClipTemplateSpec } from './clipWorkspace'

export const clipOwnVideoModelLabel = () => SEU_VIDEO_MOTOR === 'kling4' ? 'Kling 4.0 Edit' : 'Seedance 2.5'

/** Mirrors the dispatch branches in /api/recreate. This projection carries no recipe or provider cost. */
export function clipTemplateSpecs(formats: readonly RecreateFormat[]): Record<string, ClipTemplateSpec> {
  return Object.fromEntries(formats.map(format => [format.id, templateSpec(format)]))
}

function templateSpec(format: RecreateFormat): ClipTemplateSpec {
  if (moldeDeTrechos(format.id)) return { model: 'Kling 4.0 Edit', quality: '720p' }
  if (format.type === 'motion') return { model: 'Kling 2.6 Motion Control', quality: null }
  if (format.type === 'swap') return catalogoNoSeedance25(format.id)
    ? { model: 'Seedance 2.5', quality: '480p' }
    : { model: 'MiniMax H3 Max Recast', quality: '768p' }

  const effect = clipEffectByKey(format.effectKey)
  if (!effect) return { model: 'Photo effect', quality: null }
  const resolution = effect.template?.input('').resolution
  return { model: effect.template?.label ?? CLIP_ENGINES[effect.engine].label, quality: typeof resolution === 'string' ? resolution : null }
}
