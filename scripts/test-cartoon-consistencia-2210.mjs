// KINEO-CARTOON-CONSISTENCIA-2210 — módulos e fatias da rota REAL executados offline. Zero fornecedor, crédito ou .env.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { execFileSync } from 'node:child_process'
import ts from 'typescript'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
import { cartoonStoryUiProof } from './test-support/cartoon-story-ui-proof-2210.mjs'
import { cartoonRetryCapProof } from './test-support/cartoon-retry-cap-proof-2210.mjs'
import { cartoonEpisodeBudgetProof } from './test-support/cartoon-episode-budget-proof-2210.mjs'
import { cartoonMusicBudgetProof } from './test-support/cartoon-music-budget-proof-2210.mjs'
import { semCartoonConsistencia2210, CARTOON_CONSISTENCIA_FILES, CARTOON_CONSISTENCIA_NEW, CARTOON_CONSISTENCIA_BASE, CARTOON_CONSISTENCIA_MARK as MARK } from './test-support/desfaz-cartoon-consistencia-2210.mjs'
import { semAdsCenaRetomada2110 } from './test-support/desfaz-ads-cena-retomada-2110.mjs'
import { cartoonMergeSource2410 } from './test-support/cartoon-merge-sources-2410.mjs' // KINEO-CARTOON-JUNTAR-2410 — behavior above reads raw sources; historical bytes below reverse only the exact external integration hunks.

const RULE = 'lib/kidsCartoon/cartoonConsistency.ts', SERVER = 'lib/kidsCartoon/cartoonReferenceServer.ts'
const GEN = 'app/api/generate-video-cinematic/route.ts'
const read = p => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n')
const norm = x => JSON.parse(JSON.stringify(x))
let proofs = 0, killed = 0
const check = (name, ok) => { assert.ok(ok, name); proofs++ }
const source = { [RULE]: read(RULE), [SERVER]: read(SERVER), [GEN]: read(GEN) }
const base = p => execFileSync('git', ['show', CARTOON_CONSISTENCIA_BASE + ':' + p], { encoding: 'utf8', maxBuffer: 1 << 27 }).replace(/\r\n/g, '\n')
const uniqueReplace = (s, from, to) => { assert.equal(s.split(from).length - 1, 1, 'unique mutant ' + from); return s.replace(from, to) }

function rig(overrides = {}, settings = {}) {
  const calls = { config: [], posts: [], status: [], result: [], moderation: [] }
  const load = createOfflineLoader({ source: (p, s) => overrides[p] ?? s,
    env: { ...(settings.noKey ? {} : { FAL_KEY: 'offline-fake-never-a-credential' }) },
    mocks: {
      '@fal-ai/client': { fal: {
        config: x => calls.config.push(x),
        queue: {
          status: async (model, { requestId }) => { calls.status.push({ model, requestId }); return { status: settings.failed ? 'FAILED' : 'COMPLETED' } },
          result: async (model, { requestId }) => { calls.result.push({ model, requestId }); return { data: { images: [{ url: settings.badUrl ? 'http://offline.test/ref.png' : 'https://offline.test/' + requestId + '.png' }] } } },
        },
      } },
      '@/lib/falQueue': { submitFalQueueOnce: async (model, input) => {
        const index = calls.posts.length; calls.posts.push({ model, input: norm(input) })
        if (settings.ambiguous) throw Object.assign(new Error('offline transport uncertain'), { ambiguous: true, status: 503 })
        return 'image-' + index
      } },
      '@/lib/safety/contentModeration': { moderateContent: async input => {
        calls.moderation.push(norm(input)); return settings.moderationFail || (settings.partialModerationFail && input.meta.scene === 0) ? { ok: false, reason: 'unsafe_image' } : { ok: true }
      } },
    },
  })
  return { calls, load, R: load(RULE), S: load(SERVER) }
}
const canonical = rig(), R = canonical.R, K = canonical.load('lib/kidsCartoon/kidsCartoon.ts')
const request = (duration = 15, count = 3) => ({ primary: 'ollie', story: 'Ollie and Mia share a leaf beside the little river.', duration,
  prompts: Array.from({ length: count }, (_, i) => 'Ollie carries a leaf beside the river, camera angle ' + i),
  narrations: Array.from({ length: count }, () => 'Mia smiles and helps Ollie.'), seconds: Array(count).fill(duration === 15 ? 6 : 10),
  aspect: '9:16', userId: 'offline-user', seed: 713,
})

for (const character of K.KIDS_CHARACTERS) {
  const cast = R.cartoonCast(character.id, 'Mia smiles gently beside the garden.')
  const input = R.cartoonEditInput('A garden scene', cast, '9:16', 123)
  check('canonical primary image and sheet: ' + character.id,
    input.image_urls[0] === 'https://www.usekineo.com' + character.portrait && input.prompt.includes('Reference image 1: ' + character.sheet))
  const mia = K.kidsCharacter('mia'), index = cast.findIndex(c => c.id === 'mia')
  check('Mia owns her image and sheet beside ' + character.id,
    index >= 0 && input.image_urls[index] === 'https://www.usekineo.com' + mia.portrait && input.prompt.includes('Reference image ' + (index + 1) + ': ' + mia.sheet) && new Set(input.image_urls).size === input.image_urls.length)
}
check('a partial name does not recruit another character', R.cartoonCast('ollie', 'Miami, Leonardo and pipeline').length === 1)
check('case-insensitive complete names preserve the canonical cast', R.cartoonCast('ollie', 'MIA and Leo').map(c => c.id).join(',') === 'ollie,leo,mia')
const i = request(), frames = await canonical.S.cartoonReferenceFrames(i)
check('all three reference frames complete', frames.ok && frames.urls.length === 3 && frames.urls.every(Boolean) && frames.submitted === 3)
for (const [index, post] of canonical.calls.posts.entries()) {
  check('every frame is a single Nano Banana edit with BOTH canonical identities ' + index,
    post.model === R.CARTOON_EDIT_MODEL && post.input.image_urls.join(',') === 'https://www.usekineo.com/kids-cartoon/ollie.webp,https://www.usekineo.com/kids-cartoon/mia.webp' &&
    post.input.prompt.includes(K.kidsCharacter('ollie').sheet) && post.input.prompt.includes(K.kidsCharacter('mia').sheet) && post.input.num_images === 1 && post.input.limit_generations === true && post.input.seed === 713 + index)
}
check('moderation approves every edited image before use', canonical.calls.moderation.length === 3 && canonical.calls.moderation.every(x => x.surface === 'images_edit' && x.stage === 'output' && x.imageUrls.length === 1))
for (const settings of [{ ambiguous: true }, { failed: true }, { moderationFail: true }, { partialModerationFail: true }, { badUrl: true }, { noKey: true }]) {
  const x = rig({}, settings), r = await x.S.cartoonReferenceFrames(i)
  check('no missing/unsafe/ambiguous reference is a successful film: ' + JSON.stringify(settings), !r.ok)
  check('a reference submission is never repeated after an ambiguous or failed result', x.calls.posts.length === (settings.noKey ? 0 : 3))
}
const over = rig(), denied = await over.S.cartoonReferenceFrames({ ...request(15, 4), seconds: [12, 12, 12, 12] })
check('15s rejects an over-cap plan before a provider POST', !denied.ok && denied.reason === 'budget' && over.calls.posts.length === 0)
const thirtyFive = rig(), long = await thirtyFive.S.cartoonReferenceFrames(request(35, 4))
check('35s retains the existing number of frames outside the 15s variable cap', long.ok && long.submitted === 4 && thirtyFive.calls.posts.length === 4 && !R.cartoonVariableCost([10, 10, 10, 10]).withinCap)
for (const seconds of [[6, NaN, 6], [0, 6, 6]]) {
  const invalid = rig(), bad = await invalid.S.cartoonReferenceFrames({ ...i, seconds })
  check('invalid signed-time input spends nothing: ' + JSON.stringify(seconds), !bad.ok && bad.reason === 'invalid_plan' && invalid.calls.posts.length === 0)
}
check('3x6 and 3x8 known variable costs stay below the unchanged $0.85 cap',
  Math.abs(R.cartoonVariableCost([6, 6, 6]).knownUsd - 0.58596) < 1e-10 && Math.abs(R.cartoonVariableCost([8, 8, 8]).knownUsd - 0.74148) < 1e-10 && R.CARTOON_VARIABLE_CAP_USD === 0.85)
check('no text-to-video model survives the cartoon dispatcher',
  R.cartoonSceneModels([R.CARTOON_VIDEO_MODEL, 'fal-ai/bytedance/seedance/v1.5/pro/text-to-video', R.CARTOON_VIDEO_MODEL]).join(',') === R.CARTOON_VIDEO_MODEL && R.cartoonSceneModels(['text-to-video']).length === 0)

// Extract complete real AST statements; no copied decision/dispatch logic in this harness.
function nodes(s, predicate) {
  const file = ts.createSourceFile(GEN, s, ts.ScriptTarget.Latest, true), found = []
  function walk(n) { if (predicate(n, file)) found.push(n); ts.forEachChild(n, walk) }
  walk(file); return { file, found }
}
function statement(s, predicate) {
  const { file, found } = nodes(s, predicate)
  assert.equal(found.length, 1, 'unique production AST statement')
  return found[0].getText(file)
}
function compile(body, context) {
  const code = ts.transpileModule('async function run(){' + body + '\n}', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
  return vm.runInNewContext(code + '\nrun', context, { timeout: 5000 })
}
const referenceBlock = s => statement(s, (n, f) => ts.isIfStatement(n) && n.expression.getText(f) === 'desenhoInfantil.ativo' && n.thenStatement.getText(f).includes('const references = await cartoonReferenceFrames('))
const fluxBlock = s => statement(s, (n, f) => ts.isIfStatement(n) && n.expression.getText(f) === '!desenhoInfantil.ativo' && n.thenStatement.getText(f).includes('const STILL_POOL = 3'))
async function referenceFlow(s, { success = true, refund = true, kids = true, invalidPlan = false, providerRig = null } = {}) {
  const calls = [], state = {}, stills = Array(3).fill(null)
  const ctx = { desenhoInfantil: { ativo: kids, personagem: { id: 'ollie' } }, providerSubmissionMayExist: false,
    scenes: i.prompts.map((description, j) => ({ description, voiceover: i.narrations[j], clipSeconds: invalidPlan && j === 0 ? 0 : 6 })),
    prompt: i.story, duration: 15, classicScenePrompts: i.prompts, aspectRequested: i.aspect, user: { id: i.userId }, generationSeed: i.seed,
    generationId: 'offline-generation', sceneStills: stills, cartoonVariableCost: R.cartoonVariableCost, CARTOON_EDIT_MODEL: R.CARTOON_EDIT_MODEL,
    cartoonReferenceFrames: async req => { calls.push(['images', norm(req)]); return providerRig ? providerRig.S.cartoonReferenceFrames(req) : { ok: success, urls: success ? ['ref1', 'ref2', 'ref3'] : ['', 'ref2', 'ref3'], submitted: invalidPlan ? 0 : 3, requestIds: invalidPlan ? [] : ['a', 'b', 'c'], reason: invalidPlan ? 'invalid_plan' : 'reference_failed' } },
    writeServerEvent: async event => calls.push(['event', norm(event)]),
    releaseBirthClaim: async reason => { calls.push(['release', reason]); return refund }, ctxDespacho: () => state,
    NextResponse: { json: (body, init) => ({ body, status: init.status }) },
    video: () => { calls.push(['video']); return { done: true } },
  }
  const result = await compile(referenceBlock(s) + '\nreturn video()', ctx)()
  return { result, calls, state, stills }
}
for (const refund of [true, false]) {
  const x = await referenceFlow(source[GEN], { success: false, refund })
  check('reference failure returns before any video and acknowledges only a confirmed refund: ' + refund,
    x.result.status === 503 && x.result.body.reason === 'kids_reference_failed' && x.result.body.refunded === refund && x.result.body.charged === !refund && !x.calls.some(c => c[0] === 'video') && x.state.refundConfirmed === refund && x.calls.filter(c => c[0] === 'release').length === 1)
}
const ready = await referenceFlow(source[GEN])
check('the live route stores ALL frame references before video submission', ready.stills.join(',') === 'ref1,ref2,ref3' && ready.calls.at(-1)[0] === 'video' && ready.calls[0][0] === 'images')
const actualProvider = rig(), actualFlow = await referenceFlow(source[GEN], { providerRig: actualProvider })
check('live route → real reference server → mocked queue fills every scene before the video boundary', actualProvider.calls.posts.length === 3 && actualFlow.stills.every((s, n) => s === 'https://offline.test/image-' + n + '.png') && actualFlow.calls.at(-1)[0] === 'video')
const unsafeProvider = rig({}, { partialModerationFail: true }), unsafeFlow = await referenceFlow(source[GEN], { providerRig: unsafeProvider })
check('one unsafe real-server image makes the actual route refund before any clip', unsafeProvider.calls.posts.length === 3 && unsafeFlow.result.status === 503 && unsafeFlow.result.body.refunded === true && !unsafeFlow.calls.some(c => c[0] === 'video'))
const ordinary = await referenceFlow(source[GEN], { kids: false })
check('ordinary videos do not enter the new image/refund branch', ordinary.calls.length === 1 && ordinary.calls[0][0] === 'video')
const invalidProvider = rig(), invalidFlow = await referenceFlow(source[GEN], { invalidPlan: true, providerRig: invalidProvider })
check('invalid_plan [0] cannot throw during cost logging before the normal refund path', invalidProvider.calls.posts.length === 0 && invalidFlow.result.status === 503 && invalidFlow.result.body.refunded === true && !invalidFlow.calls.some(c => c[0] === 'video') && invalidFlow.calls.find(c => c[0] === 'event')[1].metadata.known_cost_usd === null)
await compile(fluxBlock(source[GEN]) + '\nreturn true', { desenhoInfantil: { ativo: true } })()
check('the actual ordinary FLUX pool is gated out for cartoons', true)
check('parallel AND serial live dispatch pass each scene its matching reference',
  source[GEN].includes('submitScene(scenes[idx], model, idx, sceneStills[idx] ?? undefined)') && source[GEN].includes('submitScene(scenes[i], model, i, sceneStills[i] ?? undefined)') && source[GEN].indexOf('const references = await cartoonReferenceFrames(') < source[GEN].indexOf('const submitScene = async'))

function dispatchBody(s) {
  const { file, found } = nodes(s, n => ts.isVariableDeclaration(n) && n.name.getText() === 'submitScene')
  assert.equal(found.length, 1)
  const body = found[0].initializer.body, end = body.statements.find(n => n.getText(file).startsWith('const despachoCena = await dispatchOneSceneWithSafeVisualRetry('))
  assert.ok(end)
  return s.slice(body.statements[0].getStart(file), end.end) + '\nreturn despachoCena'
}
async function dispatchProof(s, { rejection = null, kids = true } = {}) {
  const calls = [], sceneInputs = []
  const dispatcher = createOfflineLoader()('lib/cinematic/dispatchScenes.ts')
  const ctx = { desenhoInfantil: { ativo: kids }, cinematic: 'Ollie in a quiet garden', classicScenePrompts: ['Ollie in a quiet garden'],
    imageUrl: 'https://offline.test/canonical-frame.png', model: 'seedance-t2v', sceneIndex: 0, scene: { description: 'Ollie carries a leaf', clipSeconds: 6 },
    KLING_MODEL: 'kling-t2v', KLING_I2V_MODEL: 'kling-i2v', SEEDANCE_MODEL: 'seedance-t2v', SEEDANCE_I2V_MODEL: R.CARTOON_VIDEO_MODEL, VEO_MODEL: 'veo-t2v', VEO_I2V_MODEL: 'veo-i2v',
    cartoonSceneModels: R.cartoonSceneModels, dispatchOneSceneWithSafeVisualRetry: dispatcher.dispatchOneSceneWithSafeVisualRetry,
    buildContextualSafeVisualPrompt: () => 'A gentle safe visual of Ollie beside a tree', sanitizeRealPeople: x => x, classicVisualPolicy: {}, storyCharacter: '', eraSuffix: '',
    romanceAdulto: { ativo: false }, hd: true, generationSeed: 42, isStylizedLook: () => true, styleAnchor: {}, aspectRequested: '9:16', classicVisualMode: 'cartoon', classicSceneInputs: sceneInputs,
    buildFalInput: (model, prompt, hd, hollywood, seconds, imageUrl) => ({ model, prompt, image_url: imageUrl, duration: String(seconds), resolution: '1080p', generate_audio: true }),
    submitFalQueueOnce: async (model, input, onPost) => {
      onPost(); calls.push({ model, input: norm(input) })
      if (rejection && calls.length === 1) throw Object.assign(new Error(rejection === 'explicit' ? 'content policy violation' : 'uncertain connection'), { status: rejection === 'explicit' ? 422 : 503, ambiguous: rejection !== 'explicit' })
      return 'accepted-video-job'
    },
  }
  const result = await compile(dispatchBody(s), ctx)()
  return { result, calls, sceneInputs }
}
for (const rejection of [null, 'explicit', 'ambiguous']) {
  const x = await dispatchProof(source[GEN], { rejection })
  check('live cartoon dispatch preserves image, resolution, silence and signed inputs: ' + rejection,
    x.calls.length === (rejection === 'explicit' ? 2 : 1) && x.calls.every(c => c.model === R.CARTOON_VIDEO_MODEL && c.input.image_url === 'https://offline.test/canonical-frame.png' && c.input.resolution === '720p' && c.input.generate_audio === false && c.input.enable_safety_checker === true && c.input.prompt.includes('Preserve the exact face, age, hair shape and outfit')) && JSON.stringify(x.sceneInputs[0]) === JSON.stringify(x.calls.at(-1).input))
  check('accepted or uncertain jobs are terminal, unpaid explicit rejection alone permits one safe visual retry: ' + rejection,
    rejection === 'ambiguous' ? x.result.requestId === null && x.result.outcome.disposition === 'ambiguous' : x.result.requestId === 'accepted-video-job')
}
const normalDispatch = await dispatchProof(source[GEN], { kids: false })
check('ordinary provider payload retains its previous resolution and audio choices', normalDispatch.calls[0].input.resolution === '1080p' && normalDispatch.calls[0].input.generate_audio === true)

const mutants = [
  ['secondary identity omitted', RULE, 'image_urls: cartoonReferenceUrls(cast)', 'image_urls: cartoonReferenceUrls(cast.slice(0, 1))', async x => { const p = x.R.cartoonEditInput('Ollie and Mia', x.R.cartoonCast('ollie', 'Mia'), '9:16', 1); return p.image_urls.length !== 2 }],
  ['secondary image replaced with protagonist', RULE, 'new URL(c.portrait, CARTOON_CANONICAL_ORIGIN)', 'new URL(cast[0].portrait, CARTOON_CANONICAL_ORIGIN)', async x => new Set(x.R.cartoonReferenceUrls(x.R.cartoonCast('ollie', 'Mia'))).size !== 2],
  ['paid FLUX replaces canonical edit', RULE, "CARTOON_EDIT_MODEL = 'fal-ai/nano-banana/edit'", "CARTOON_EDIT_MODEL = 'fal-ai/flux/schnell'", async x => { await x.S.cartoonReferenceFrames(i); return x.calls.posts.some(c => c.model !== 'fal-ai/nano-banana/edit') }],
  ['missing frame accepted', SERVER, 'urls.every(Boolean)', 'urls.some(Boolean)', async x => { const r = await x.S.cartoonReferenceFrames(i); return r.ok }, { partialModerationFail: true }],
  ['15s budget guard removed', SERVER, '(i.duration === 15 && !cost.withinCap)', 'false', async x => { await x.S.cartoonReferenceFrames({ ...request(15, 4), seconds: [12, 12, 12, 12] }); return x.calls.posts.length > 0 }],
]
// A partially missing reference is distinct from a fully failed image set.
for (const mutant of mutants) {
  const [name, file, from, to, red, settings = {}] = mutant
  const changed = uniqueReplace(source[file], from, to)
  const x = rig({ [file]: changed }, settings)
  check('product proof rejects mutant: ' + name, await red(x)); killed++
}
for (const [name, from, to, red] of [
  ['reference failure allowed to reach video', 'if (!references.ok)', 'if (false)', async s => (await referenceFlow(s, { success: false })).calls.some(c => c[0] === 'video')],
  ['failed refund falsely acknowledged', 'refunded: released, retryable: true', 'refunded: true, retryable: true', async s => (await referenceFlow(s, { success: false, refund: false })).result.body.refunded !== false],
  ['1080p cost override', "input.resolution = '720p'", "input.resolution = '1080p'", async s => (await dispatchProof(s)).calls[0].input.resolution !== '720p'],
  ['audio expense enabled', 'input.generate_audio = false; input.enable_safety_checker', 'input.generate_audio = true; input.enable_safety_checker', async s => (await dispatchProof(s)).calls[0].input.generate_audio !== false],
  ['t2v fallback restored', '...cartoonSceneModels(modelos)', '...modelos', async s => (await dispatchProof(s, { rejection: 'explicit' })).calls.some(c => c.model !== R.CARTOON_VIDEO_MODEL)],
]) {
  check('live-route proof rejects mutant: ' + name, await red(uniqueReplace(source[GEN], from, to))); killed++
}

const story = await cartoonStoryUiProof(), retry = await cartoonRetryCapProof(), episode = await cartoonEpisodeBudgetProof()
const music = await cartoonMusicBudgetProof()
check('real story route and restart execute all 104 behavior proofs', story.assertions === 104)
check('real browser/cron retry route executes all 24 scope and cost proofs', retry.assertions === 24)
check('the real sales cron enforces possible-spend history and confirmed funding', episode.assertions >= 28)
check('real music warming/adapter/selector and the late verified-claim hook enforce the Kids15 budget', music.assertions === 68 && music.rows.length === 13)
for (const [name, file, from, to, prove] of [
  ['case-sensitive writer check restored', 'lib/kidsCartoon/kidsCartoon.ts', "new RegExp(`${B}${c.name}${E}`, 'iu')", "new RegExp(`${B}${c.name}${E}`, 'u')", cartoonStoryUiProof],
  ['duplicated protagonist prefix restored', 'lib/kidsCartoon/kidsCartoon.ts', 'const user = `Story idea: ${i.request.idea}`', 'const user = `Story idea: ${c.name} ${i.request.idea}`', cartoonStoryUiProof],
  ['new-episode reset removed', 'components/kidsCartoon/KidsCartoonTemplate.tsx', "setIdea(''); setIdeaId(null); setCopied(false)", 'void 0', cartoonStoryUiProof],
  ['accepted-scene paid retry enabled', 'app/api/retry-hollywood-scene/route.ts', "Number(loaded.claim.response?.duration) === 15", "Number(loaded.claim.response?.duration) === 35", cartoonRetryCapProof],
  ['possible-spend history ignored', 'lib/kidsVenda/cron.ts', "if (order.duration === 15 && open.some(", "if (false && open.some(", cartoonEpisodeBudgetProof],
  ['unconfirmed funding allowed to dispatch', 'lib/kidsVenda/cron.ts', "if (fundedRecord.error || (fundedRecord.data as { credits_funded?: number } | null)?.credits_funded !== cost)", 'if (false)', cartoonEpisodeBudgetProof],
]) {
  const changed = uniqueReplace(read(file), from, to)
  await assert.rejects(() => prove({ overrides: { [file]: changed } }), e => e?.code === 'ERR_ASSERTION', 'behavior proof must reject with an assertion, never syntax/import/transport: ' + name)
  check('real-route behavior proof rejects mutant: ' + name, true); killed++
}
const musicUndo = JSON.parse(fs.readFileSync(new URL('./test-support/desfaz-cartoon-consistencia-2210-trocas.json', import.meta.url), 'utf8'))
const audioFile = 'lib/audioNoClique.ts', composeFile = 'app/api/compose/route.ts'
for (const [name, file, from, to] of [
  ['accepted failed warm job is discarded before reuse', audioFile, musicUndo[audioFile][0][0], musicUndo[audioFile][0][1]],
  ['missing warm record permits another paid music job', audioFile, 'naoRepetirJobAceito ? r ?? null : r', 'naoRepetirJobAceito ? r : r'],
  ['accepted job completing during wait is discarded', audioFile, musicUndo[audioFile][1][0], musicUndo[audioFile][1][1]],
  ['music budget flag targets 35s instead of signed 15s', composeFile, 'Number(cinematicBirthClaim.response?.duration) === 15', 'Number(cinematicBirthClaim.response?.duration) === 35'],
]) {
  const changed = uniqueReplace(read(file), from, to)
  await assert.rejects(() => cartoonMusicBudgetProof({ overrides: { [file]: changed } }), e => e?.code === 'ERR_ASSERTION', 'music mutant must fail behavior, never syntax/import/transport: ' + name)
  check('real music-chain proof rejects mutant: ' + name, true); killed++
}
await import('./test-cartoon-duration-floor-2210.mjs')

for (const file of CARTOON_CONSISTENCIA_FILES) {
  const actual = cartoonMergeSource2410(read(file), file, 'consistencia'), before = base(file), undone = semCartoonConsistencia2210(actual, file)
  assert.equal(undone, before, 'exact undo to base: ' + file)
  assert.equal(semCartoonConsistencia2210(undone, file), before, 'idempotent undo: ' + file)
  assert.equal(semCartoonConsistencia2210(actual.replace(/\n/g, '\r\n'), file), before.replace(/\n/g, '\r\n'), 'CRLF preserved: ' + file)
  assert.equal(semAdsCenaRetomada2110(actual, file), semAdsCenaRetomada2110(before, file), 'latest historical undo removes this layer FIRST: ' + file)
  assert.throws(() => semCartoonConsistencia2210(actual + '\n// ' + MARK + ' unexpected addition', file), /divergente/, 'additional marked mutation fails closed: ' + file)
  proofs += 5
}
check('undeclared paths and null are untouched', semCartoonConsistencia2210('// ' + MARK, 'outside.ts') === '// ' + MARK && semCartoonConsistencia2210(null, CARTOON_CONSISTENCIA_FILES[0]) === null)
const git = args => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 1 << 27 }).trim().split('\n').filter(Boolean)
const declared = new Set([...CARTOON_CONSISTENCIA_FILES, ...CARTOON_CONSISTENCIA_NEW])
const changed = git(['diff', '--name-only', CARTOON_CONSISTENCIA_BASE, '153e9f31f']) // KINEO-CARTOON-JUNTAR-2410 — closed layer inventory, not unrelated upstream files.
check('the delivery touches only its explicit files', changed.length > 0 && changed.every(p => declared.has(p)))
const TRAVA = '[TRAVA 8.2 — vai do fundador 22/10 "vamos dar tração em todas"]'
const subjects = git(['log', '--format=%s', CARTOON_CONSISTENCIA_BASE + '..153e9f31f']) // KINEO-CARTOON-JUNTAR-2410 — this task's immutable committed authorization remains checked.
check('each committed delivery change carries its own prefix and exact founder authorization', subjects.every(s => s.startsWith(MARK + ' ') && s.includes(TRAVA)))
console.log(`${MARK}: ${proofs} integrated proofs + ${story.assertions} story/reset + ${retry.assertions} retry + ${episode.assertions} episode budget + ${music.assertions} music budget; ${killed}/${killed} integrated mutants rejected + duration 5/5; no real network/provider call.`)
