import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const load = createOfflineLoader()
const manifest = load('app/manifest.ts').default()
assert.equal(manifest.start_url, '/app-launch')
assert.equal(manifest.id, '/')
assert.equal(manifest.display, 'standalone')
assert.equal(manifest.share_target.method, 'POST')

function imageSize(url) {
  const bytes = readFileSync('public' + url)
  assert.equal(bytes.toString('hex', 0, 8), '89504e470d0a1a0a')
  return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)]
}
for (const [size, purpose] of [[192, undefined], [512, undefined], [512, 'maskable']]) {
  const icon = manifest.icons.find(icon => icon.sizes === size + 'x' + size && icon.purpose === purpose)
  assert.ok(icon)
  assert.deepEqual(imageSize(icon.src), [size, size])
}
for (const {url, media} of load('lib/ui/installAppearance.ts').iphoneStartupImages) {
  const [,w,h] = url.match(/start-(\d+)x(\d+)-/)
  assert.deepEqual(imageSize(url), [Number(w), Number(h)])
  assert.match(media, /prefers-color-scheme/)
}
assert.doesNotMatch(readFileSync('public/sw.js','utf8'), /caches\.|addEventListener\(['"]fetch/)

for (const [user, destination] of [[null, '/'], [{id:'test-user'}, '/studio']]) {
  let calls = 0
  const route = createOfflineLoader({ globals:{Response}, mocks:{
    '@/lib/supabase/server': { createClient: () => ({ auth:{ getUser: async () => { calls++; return {data:{user}} } } }) },
  } })('app/app-launch/route.ts')
  const response = await route.GET()
  assert.equal(calls, 1)
  assert.equal(response.status, 307)
  assert.equal(response.headers.get('location'), destination)
  assert.match(response.headers.get('cache-control'), /no-store/)
  assert.equal(response.headers.get('vary'), 'Cookie')
}

console.log('OK · lançamento por sessão, resposta privada, imagens reais, instalação e compartilhamento')
