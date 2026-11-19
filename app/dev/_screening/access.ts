import { createHash, timingSafeEqual } from 'node:crypto'
import { signedInFounder } from '@/lib/auth/signedInFounder'

export function hasScreeningKey(keys: string[]) {
  const key = process.env.KINEO_3D_PREVIEW_KEY
  if (!key || keys.length !== 1) return false
  const digest = (value: string) => createHash('sha256').update(value).digest()
  return timingSafeEqual(digest(key), digest(keys[0]))
}

export function canViewScreening(keys: string[]) {
  return process.env.NODE_ENV === 'development' || hasScreeningKey(keys) || signedInFounder()
}
