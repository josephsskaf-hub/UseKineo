import { releaseVisible, type InternalRelease } from './access'

export const RECREATE_IDENTITY_PHOTOS_RELEASE: InternalRelease = 'public' // dono 23/11 07:1x, depois do teste pago 1 foto × 3 fotos: "Abre sim". Volta = 'internal' (só a casa) ou 'off'.

export function recreateIdentityPhotosVisible(email: string | null | undefined, release: InternalRelease = RECREATE_IDENTITY_PHOTOS_RELEASE): boolean {
  return Boolean(email) && releaseVisible(email, release)
}
