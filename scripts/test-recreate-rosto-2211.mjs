import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const plain = value => JSON.parse(JSON.stringify(value))
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const load = createOfflineLoader({ mocks: { 'server-only': {} } })
const I = load('lib/recreate/invasor.ts')
const { MOLDES_DE_TRECHOS } = load('lib/recreate/invasorMolde.ts')
const { entradaDaLinha } = load('lib/recreate/filaKlingEdit.ts')
const { clipTemplateSpecs } = load('lib/create/clipWorkspaceServer.ts')
const { formatosParaOCliente } = load('lib/recreate/catalogoServidor.ts')
const { RECREATE_IDENTITY_PHOTOS_RELEASE, recreateIdentityPhotosVisible } = load('lib/recreate/identityPhotosAccess.ts')
const { KLING_IDENTITY_PHOTO_LIMIT, validRecreatePhotoCount } = load('lib/recreate/identityPhotos.ts')
const { INTERNAL_EXACT_EMAILS } = load('lib/internalAccounts.ts')
const { facePhotoNotices } = load('lib/recreate/facePhotoQuality.ts')
const { readFrontalFaceCascade, detectFrontalFaceWidth } = load('lib/recreate/frontalFaceDetector.ts')
const { ownedClipImageUrl } = load('lib/clips/clipCatalog.ts')
const SUPABASE = 'https://recreate-fixture.invalid'
const userId = '11111111-2222-4333-8444-555555555555'
const otherId = 'aaaaaaaa-2222-4333-8444-555555555555'
const image = (suffix, owner = userId) => `${SUPABASE}/storage/v1/object/public/avatars/${owner}/${suffix}.jpg`
const [front, left, right, shoulders] = ['front', 'left', 'right', 'shoulders'].map(name => image(name))
const inputs = [front, left, right, shoulders]
const ctx = { userId, supabaseUrl: SUPABASE, dono: url => ownedClipImageUrl(url, userId, SUPABASE) }
const body = (format, photos) => ({ format, photos, consent: true, prompt: 'Untrusted recipe override' })
const basketball = 'basquete'

assert.equal(RECREATE_IDENTITY_PHOTOS_RELEASE, 'off')
const house = INTERNAL_EXACT_EMAILS[0]
const customer = 'customer@example.invalid'
assert.equal(recreateIdentityPhotosVisible(house), false)
assert.equal(recreateIdentityPhotosVisible(house, 'internal'), true)
assert.equal(recreateIdentityPhotosVisible(customer, 'internal'), false)
assert.equal(recreateIdentityPhotosVisible(null, 'public'), false)
const available = formatosParaOCliente(house)
const disabledSpecs = clipTemplateSpecs(available, house)
const enabledSpecs = clipTemplateSpecs(available, house, 'internal')
assert.ok(Object.values(disabledSpecs).every(spec => spec.identityPhotoLimit === undefined))
assert.equal(clipTemplateSpecs(available, customer, 'internal')[basketball].identityPhotoLimit, undefined)
assert.equal(enabledSpecs.passarela.identityPhotoLimit, 1, 'Recast accepts one photo per person')
assert.equal(enabledSpecs['escolha-o-favorito'].identityPhotoLimit, 1, 'two people retain separate slots')
assert.equal(enabledSpecs.elevador.identityPhotoLimit, 1, 'Seedance keeps the current subject mapping')
assert.ok(available.filter(f => f.type === 'effect').every(f => enabledSpecs[f.id].identityPhotoLimit === undefined))

for (const molde of MOLDES_DE_TRECHOS) {
  const legacy = I.planInvasor(body(molde.id, [front]), ctx, null)
  assert.equal(legacy.ok, true, molde.id)
  assert.deepEqual(plain(legacy.plan.input.image_urls), [front])
  assert.equal(legacy.plan.input.elements, undefined)
  assert.match(legacy.plan.input.prompt, /@Image1\b/)
  assert.equal(I.planInvasor(body(molde.id, [front, left]), ctx, null).ok, false, 'planner defaults to one photo')
  if (molde.alvo.tipo === 'bicho') {
    assert.equal(enabledSpecs[molde.id].identityPhotoLimit, undefined)
    assert.equal(I.planInvasor(body(molde.id, [front, left]), { ...ctx, aceitarAngulos: true }, null).ok, false)
    continue
  }
  assert.equal(enabledSpecs[molde.id].identityPhotoLimit, KLING_IDENTITY_PHOTO_LIMIT)
  for (const count of [2, 3, 4]) {
    const photos = inputs.slice(0, count)
    const result = I.planInvasor(body(molde.id, photos), { ...ctx, aceitarAngulos: true }, null)
    assert.equal(result.ok, true, molde.id)
    assert.deepEqual(plain(result.plan.photos), photos, 'all photos go through the existing image and moderation checks')
    assert.deepEqual(plain(result.plan.input.elements), [{ frontal_image_url: front, reference_image_urls: photos.slice(1) }])
    assert.equal(result.plan.input.image_urls, undefined)
    assert.equal(result.plan.input.prompt, legacy.plan.input.prompt.replaceAll('@Image1', '@Element1'))
    assert.equal(result.plan.credits, legacy.plan.credits)
    assert.equal(result.plan.falUsd, legacy.plan.falUsd)
  }
}

const on = { ...ctx, aceitarAngulos: true }
for (const photos of [[], [...inputs, image('fifth')], [front, front], [null, left]]) {
  assert.equal(I.planInvasor(body(basketball, photos), on, null).ok, false)
}
assert.equal(I.planInvasor(body(basketball, [front, image('foreign', otherId)]), on, null).status, 403)
assert.equal(I.planInvasor(body(basketball, [front, 'https://foreign.invalid/photo.jpg']), on, null).status, 403)
assert.equal(I.planInvasor({ ...body(basketball, [front, left]), consent: false }, on, null).status, 400)

const multi = I.planInvasor(body(basketball, [front, left, right]), on, null).plan
const old = I.planInvasor(body(basketball, [front]), ctx, null).plan
const rowFrom = plan => ({ id: 'clip-fixture', status: 'processing', engine: 'h3', mode: 'image', model: plan.model, fingerprint: JSON.stringify(['fixture', plan.model, plan.input]) })
const stored = rowFrom(multi)
const oldRow = rowFrom(old)
const oldData = I.dadosDaLinha(oldRow)
assert.equal(oldData.foto, front)
assert.deepEqual(plain(I.entradaDoTrecho({ ...oldData, trecho: 0 }).image_urls), [front])
const queueEntry = entradaDaLinha(stored)
const signedSegment = async (_molde, index) => `https://guide-fixture.invalid/basketball-${index}.mp4`
const queuedInput = await I.resolverEntrada(queueEntry.input, signedSegment)
const data = I.dadosDaLinha(stored)
const secondInput = await I.resolverEntrada(I.entradaDoTrecho({ ...data, trecho: 1 }), signedSegment)
assert.equal(queuedInput.video_url, await signedSegment(null, 0))
assert.equal(secondInput.video_url, await signedSegment(null, 1))
assert.deepEqual(plain(secondInput.elements), plain(queuedInput.elements), 'every segment keeps the same identity element')
assert.equal(secondInput.prompt, queuedInput.prompt)
assert.ok(!Object.keys(queuedInput).some(key => key.startsWith('kineo_')))
assert.equal(I.dadosDaLinha(rowFrom({ ...multi, input: { ...multi.input, image_urls: [front] } })), null)

let existing = null
const noSpend = () => { throw new Error('The stopped request attempted to spend or write.') }
const route = createOfflineLoader({ env: { NEXT_PUBLIC_SUPABASE_URL: SUPABASE }, mocks: {
  '@/lib/clips/clipServer': { submitDepsFor: () => ({ findByKey: async () => existing, submit: noSpend }), filaKlingEditEstado: noSpend },
  '@/lib/clips/clipFlow': { submitClip: noSpend },
  '@/app/api/admin/_shared/mrr': { isPayingPlan: noSpend },
  '@/lib/recreate/server': { recreateEngineAccess: noSpend },
  './descricaoDaPessoa': { lerDescricaoDaPessoa: noSpend },
  './invasorServer': { invasorArquivosPresentes: noSpend, assinarTrechoDoInvasor: noSpend },
  '@/lib/serverEvents': { writeServerEvent: noSpend },
} })('lib/recreate/invasorRota.ts')
const args = photos => ({ admin: {}, supabase: {}, user: { id: userId, email: house }, account: { userId, balance: 100 }, raw: body(basketball, photos), key: 'fixture-recreate-0001' })
assert.equal((await route.pedirInvasor(args([front, left, right]))).body.code, 'photo_angles_unavailable', 'off rejects new groups before any spend')
existing = stored
assert.equal((await route.pedirInvasor(args([front, left, right]))).body.replay, true, 'request remains recoverable after the switch closes')
assert.equal((await route.pedirInvasor(args([front, right, left]))).status, 409)

assert.deepEqual(plain(facePhotoNotices(1000, 1000, 180)), [])
assert.deepEqual(plain(facePhotoNotices(1000, 1000, 179)), ['small-face'])
assert.deepEqual(plain(facePhotoNotices(639, 900, null)), ['small-image', 'face-unconfirmed'])
assert.equal(validRecreatePhotoCount(4, 1, 4), true)
assert.equal(validRecreatePhotoCount(4, 1), false)
assert.equal(validRecreatePhotoCount(3, 2, 4), false)
const asset = readFileSync(new URL('../public/models/recreate/pico-facefinder-v1.bin', import.meta.url))
assert.equal(createHash('sha256').update(asset).digest('hex'), 'd8014993e7298c7b1865d1f8b855d6dbf4ec5c808bf879e2091ab6837abf90cd')
const cascade = asset.buffer.slice(asset.byteOffset, asset.byteOffset + asset.byteLength)
assert.throws(() => readFrontalFaceCascade(cascade.slice(0, -1)))
assert.equal(detectFrontalFaceWidth(new Uint8Array(80 * 80), 80, 80, readFrontalFaceCascade(cascade)), null)

assert.match(read('lib/clips/clipServer.ts'), /resolverEntrada\(entradaDoTrecho\(\{ \.\.\.dados, trecho: i \}\)/)
const editor = read('app/recreate/RecreateClient.tsx')
assert.match(editor, /photos\.slice\(0, requiredPhotoSlots\)\.filter\(Boolean\)/, 'extra angles cannot replace the required front photo')
assert.match(editor, /className="cw-photo-notice"[^\n]+role="status"/)
assert.match(editor, /selected\.seconds\} s · \{photoSummary\}/, 'the reference card uses the allowed count')
assert.match(editor, /detail: `[^\n]+\$\{photoSummary\}`/, 'the preview uses the same count')
console.log('Recreate identity photos: release, routing, ownership, price, retry, all segments and local photo guidance verified offline.')
