import assert from 'node:assert/strict'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

function screen(key, founder = false, nodeEnv = 'production') {
  const load = createOfflineLoader({
    env: { NODE_ENV: nodeEnv, KINEO_3D_PREVIEW_KEY: key },
    mocks: { '@/lib/auth/signedInFounder': { signedInFounder: async () => founder } },
  })
  return { ...load('app/dev/_screening/access.ts'), ...load('app/dev/home-3d/pass.ts') }
}

const gate = screen('local-test-key')
assert.equal(await gate.canViewScreening([]), false)
assert.equal(await gate.canViewScreening(['other']), false)
assert.equal(await gate.canViewScreening(['local-test-key', 'local-test-key']), false)
assert.equal(await gate.canViewScreening(['local-test-key']), true)
assert.equal(await screen(undefined, true).canViewScreening([]), true)
assert.equal(await screen(undefined, false, 'development').canViewScreening([]), true)

const now = Math.floor(Date.now() / 1000)
const pass = gate.makePass(now + gate.maxAge)
assert(gate.validPass(pass))
assert(!pass.includes('local-test-key'))
assert(!gate.validPass(gate.makePass(now - 1)))
assert(!gate.validPass(pass.replace(/^\d+/, String(now + gate.maxAge + 60))))
assert(!gate.validPass(pass + 'x'))
assert(!screen('rotated-test-key').validPass(pass))
assert(!screen(undefined).validPass(pass))
console.log('OK · preview access, scoped signed pass, expiry and key rotation')
