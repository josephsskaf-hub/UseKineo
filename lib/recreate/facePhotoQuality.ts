import { RECREATE_FACE_WIDTH_SHARE, RECREATE_RECOMMENDED_PHOTO_SIDE } from './identityPhotos'
import { detectFrontalFaceWidth, readFrontalFaceCascade } from './frontalFaceDetector'

type Notice = 'small-image' | 'small-face' | 'face-unconfirmed'
type NativeDetector = new (options: { fastMode: boolean; maxDetectedFaces: number }) => {
  detect(bitmap: ImageBitmap): Promise<Array<{ boundingBox: { width: number } }>>
}

export const FACE_PHOTO_NOTICE: Record<Notice, string> = {
  'small-image': `Small photo. For more detail, use at least ${RECREATE_RECOMMENDED_PHOTO_SIDE} pixels on the shorter side.`,
  'small-face': `The face looks smaller than ${Math.round(RECREATE_FACE_WIDTH_SHARE * 100)}% of the photo width. Try a closer shot.`,
  'face-unconfirmed': 'Could not check the face size. Make sure it is clear and fills about a fifth of the photo width.',
}

export function facePhotoNotices(width: number, height: number, faceWidth: number | null): Notice[] {
  const notices: Notice[] = []
  if (Math.min(width, height) < RECREATE_RECOMMENDED_PHOTO_SIDE) notices.push('small-image')
  if (faceWidth === null || !Number.isFinite(faceWidth) || faceWidth <= 0) notices.push('face-unconfirmed')
  else if (faceWidth / width < RECREATE_FACE_WIDTH_SHARE) notices.push('small-face')
  return notices
}

let cascade: Promise<ReturnType<typeof readFrontalFaceCascade>> | undefined

async function localFaceWidth(bitmap: ImageBitmap): Promise<number | null> {
  cascade ??= fetch('/models/recreate/pico-facefinder-v1.bin', { signal: AbortSignal.timeout(4000) })
    .then(response => {
      if (!response.ok) throw new Error('Face detector unavailable.')
      return response.arrayBuffer()
    })
    .then(readFrontalFaceCascade)
    .catch(error => { cascade = undefined; throw error })
  const classify = await cascade
  const scale = Math.min(1, 320 / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  const width = canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  const height = canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return null
  context.drawImage(bitmap, 0, 0, width, height)
  const rgba = context.getImageData(0, 0, width, height).data
  const grayscale = new Uint8Array(width * height)
  for (let i = 0; i < grayscale.length; i++) grayscale[i] = (2 * rgba[i * 4] + 7 * rgba[i * 4 + 1] + rgba[i * 4 + 2]) / 10
  const faceWidth = detectFrontalFaceWidth(grayscale, width, height, classify)
  return faceWidth === null ? null : faceWidth * bitmap.width / width
}

async function measureFaceWidth(bitmap: ImageBitmap): Promise<number | null> {
  const Detector = (window as Window & { FaceDetector?: NativeDetector }).FaceDetector
  if (Detector) {
    try {
      const [face] = await new Detector({ fastMode: true, maxDetectedFaces: 1 }).detect(bitmap)
      if (face?.boundingBox.width > 0) return face.boundingBox.width
    } catch { /* Use the local classifier when this browser cannot run the native detector. */ }
  }
  return localFaceWidth(bitmap).catch(() => null)
}

/** The decoded photo stays on the device. Only the optional model download uses the network. */
export async function inspectRecreateFacePhoto(file: File): Promise<Notice[]> {
  const bitmap = await createImageBitmap(file)
  try {
    return facePhotoNotices(bitmap.width, bitmap.height, await measureFaceWidth(bitmap))
  } finally {
    bitmap.close()
  }
}
