import { releaseVisible, type InternalRelease } from './access'

export const RECREATE_IDENTITY_PHOTOS_RELEASE: InternalRelease = 'off'

export function recreateIdentityPhotosVisible(email: string | null | undefined, release: InternalRelease = RECREATE_IDENTITY_PHOTOS_RELEASE): boolean {
  return Boolean(email) && releaseVisible(email, release)
}
