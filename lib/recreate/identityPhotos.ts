/** Kling accepts one frontal image and one to three extra views of the same subject. */
export const KLING_IDENTITY_PHOTO_LIMIT = 4

/** Photo guidance for Recreate, independent of the provider's input validation. */
export const RECREATE_FACE_WIDTH_SHARE = 0.18
export const RECREATE_RECOMMENDED_PHOTO_SIDE = 640

export function validRecreatePhotoCount(count: number, required: number, identityLimit = 1): boolean {
  return count === required || (required === 1 && count > 1 && count <= identityLimit)
}
