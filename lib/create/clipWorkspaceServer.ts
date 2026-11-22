import 'server-only'
import { CLIP_ENGINES } from '@/lib/clips/clipCatalog'
import { clipEffectByKey } from '@/lib/clips/clipEffects'
import { moldeDeTrechos } from '@/lib/recreate/invasorMolde'
import { catalogoNoSeedance25, SEU_VIDEO_MOTOR } from '@/lib/recreate/seuVideo'
import type { RecreateFormat } from '@/lib/recreate/formats'
import { KLING_IDENTITY_PHOTO_LIMIT } from '@/lib/recreate/identityPhotos'
import { recreateIdentityPhotosVisible } from '@/lib/recreate/identityPhotosAccess'
import type { InternalRelease } from '@/lib/recreate/release'
import type { ClipTemplateSpec } from './clipWorkspace'

export const clipOwnVideoModelLabel = () => SEU_VIDEO_MOTOR === 'kling4' ? 'Kling 4.0 Edit' : 'Seedance 2.5'

/** Mirrors the dispatch branches in /api/recreate. This projection carries no recipe or provider cost. */
export function clipTemplateSpecs(formats: readonly RecreateFormat[], email?: string | null, release?: InternalRelease): Record<string, ClipTemplateSpec> {
  const photoGuidance = recreateIdentityPhotosVisible(email, release)
  return Object.fromEntries(formats.map(format => [format.id, templateSpec(format, photoGuidance)]))
}

function templateSpec(format: RecreateFormat, photoGuidance: boolean): ClipTemplateSpec {
  const segmented = moldeDeTrechos(format.id)
  if (segmented) return { model: 'Kling 4.0 Edit', quality: '720p', ...(photoGuidance && segmented.alvo.tipo === 'pessoa' ? { identityPhotoLimit: KLING_IDENTITY_PHOTO_LIMIT } : {}) }
  switch (format.type) {
    case 'motion':
      return { model: 'Kling 2.6 Motion Control', quality: null, ...(photoGuidance ? { identityPhotoLimit: 1 } : {}) }
    case 'swap': {
      const spec = catalogoNoSeedance25(format.id)
        ? { model: 'Seedance 2.5', quality: '480p' }
        : { model: 'MiniMax H3 Max Recast', quality: '768p' }
      return { ...spec, ...(photoGuidance ? { identityPhotoLimit: 1 } : {}) }
    }
    case 'effect': {
      const effect = clipEffectByKey(format.effectKey)
      if (!effect) return { model: 'Photo effect', quality: null }
      const resolution = effect.template?.input('').resolution
      return { model: effect.template?.label ?? CLIP_ENGINES[effect.engine].label, quality: typeof resolution === 'string' ? resolution : null }
    }
  }
}
