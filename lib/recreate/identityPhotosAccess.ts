import { releaseVisible, type InternalRelease } from './access'

export const RECREATE_IDENTITY_PHOTOS_RELEASE: InternalRelease = 'internal' // CEO 23/11: só a lista exata da casa, para o teste pago aprovado pelo dono

export function recreateIdentityPhotosVisible(email: string | null | undefined, release: InternalRelease = RECREATE_IDENTITY_PHOTOS_RELEASE): boolean {
  return Boolean(email) && releaseVisible(email, release)
}
