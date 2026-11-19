import { createHmac, timingSafeEqual } from 'node:crypto'

export const cookieName = 'kineo-home-3d'
export const maxAge = 30 * 60

// Exchange the shared screening key before the home or any of its analytics can see it.
export function makePass(expires: number) {
  const key = process.env.KINEO_3D_PREVIEW_KEY
  if (!key) return ''
  const mac = createHmac('sha256', key).update('home-3d:' + expires).digest('hex')
  return expires + '.' + mac
}

export function validPass(value?: string) {
  if (!value || !/^\d{10}\.[0-9a-f]{64}$/.test(value)) return false
  const expires = Number(value.split('.')[0])
  if (expires <= Date.now() / 1000) return false
  const expected = makePass(expires)
  return Boolean(expected) && timingSafeEqual(Buffer.from(value), Buffer.from(expected))
}
