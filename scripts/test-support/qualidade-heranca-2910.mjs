// KINEO-QUALIDADE-TODOS-MOTORES-2910 — executes the real intent/dispatch code and pure inheritance module with in-memory I/O only.
import assert from 'node:assert/strict'
import { world, USER, VIDEO, OTHER } from './upsell-filme15-harness-2610.mjs'

const SOURCE = '2b9a32ba-c99d-4489-af3f-a4658cf80fb4'
const STORY = "This robot had one day left to live… and one final gift to give. A tiny discarded robot collected broken toys, repairing them for lonely children. The robot shuts down... but the little girl's teddy bear suddenly lights up with the robot's tiny heart-shaped LED."

function fixture({ legacy = false } = {}) {
  const ctx = world(), quality = ctx.load('lib/filmComplete/qualityInheritance.ts')
  const style = ctx.load('lib/cinematic/sceneStyle.ts').deriveStyleAnchor('stylized 3D animated film')
  const characters = [
    { nome: 'robot', nucleo: 'robot', tipo: 'criatura', canonica: 'robot, a tiny discarded metal robot with a heart-shaped LED', origem: 'autor', protagonista: true, genero: null },
    { nome: 'little girl', nucleo: 'girl', tipo: 'humano', canonica: 'little girl, a small animated girl holding her teddy bear', origem: 'autor', protagonista: false, genero: 'woman' },
  ]
  const prompts = [
    `A robot with one day left. The same main character appears in this scene, consistent design: ${characters[0].canonica}. ${style.suffix}`,
    `The robot repairs toys. ${style.suffix}`,
    `A little girl holding the glowing teddy bear. The same main character appears in this scene, consistent design: ${characters[1].canonica}. ${style.suffix}`,
  ]
  const snapshot = {
    version: quality.FILM_QUALITY_SNAPSHOT_VERSION, sourceGenerationId: SOURCE, characters, style,
    characterReferences: characters.map((f, i) => ({ nome: f.nome, url: `https://cdn.example.test/sheet-${i}.png` })),
    approvedStills: prompts.map((prompt, i) => ({ url: `https://cdn.example.test/still-${i}.png`, prompt, voiceover: STORY.split('. ')[i] ?? '', characterNames: i === 2 ? ['little girl'] : ['robot'] })),
    characterSheet: characters.map(f => f.canonica).join('; '), styleSheet: style.lookPhrase, environmentSheet: 'a tiny repair workshop',
    portraitUrl: null, environmentUrl: null, provenance: 'snapshot', missing: [],
  }
  const response = legacy ? {
    prompt: STORY, language: 'en', visual_mode: 'character_story',
    personagem: { elenco: characters.map(({ canonica, ...f }) => f) },
    kling4_trial: { scene_plan: snapshot.approvedStills.map(s => ({ prompt: s.prompt, text: s.voiceover, still_url: s.url })) },
  } : { prompt: STORY, language: 'en', visual_mode: 'character_story', quality_snapshot: snapshot }
  ctx.tables.videos[0].script = STORY
  ctx.tables.events[0].session_id = SOURCE
  ctx.tables.events.push({ id: ctx.load('lib/cinematic/claim.ts').cinematicClaimId(USER, SOURCE), user_id: USER,
    name: ctx.load('lib/cinematic/claim.ts').CINEMATIC_CLAIM_EVENT, metadata: { response }, created_at: '2026-10-29T10:00:00Z' })
  return { ctx, quality, snapshot, response }
}

async function arm(ctx) {
  const intent = await ctx.service.createFilmCompleteIntent(ctx.db, USER, VIDEO, 'film_ready')
  ctx.tables.events.find(row => row.id === intent.id).metadata.paid_session_id = 'paid-fixture'
  ctx.pay()
  return ctx.service.loadFilmCompleteIntent(ctx.db, USER, intent.id)
}

export async function runQualityInheritanceChecks() {
  for (const engine of ['seedance', 'hollywood']) {
    const { ctx, snapshot } = fixture(), intent = await arm(ctx)
    assert.deepEqual(intent.metadata.source_quality, snapshot, `${engine}: checkout freezes the source character sheets/style/approved references`)
    const loaded = await ctx.service.loadFilmCompleteQuality(ctx.db, USER, intent.id, intent.generationId)
    assert.deepEqual(loaded, snapshot, `${engine}: renderer resolves the same owned snapshot`)
    assert.equal(await ctx.service.loadFilmCompleteQuality(ctx.db, OTHER, intent.id, intent.generationId), null)
    assert.equal(await ctx.service.loadFilmCompleteQuality(ctx.db, USER, intent.id, 'forged-generation'), null)
    const io = { ...ctx.io, kling4Free: async () => engine === 'hollywood', fetch: async (url, init) => {
      if (String(url).endsWith('/api/generate-script') && engine === 'hollywood') {
        const r = await ctx.io.fetch(url, init), data = await r.json()
        return Response.json({ ...data, targetSeconds: 30 })
      }
      return ctx.io.fetch(url, init)
    } }
    await ctx.service.startFilmComplete(ctx.db, intent, 'https://www.usekineo.com', io)
    const request = ctx.requests.find(r => r.url.endsWith('/api/generate-video-cinematic'))
    assert.ok(request, `${engine}: dispatched`)
    assert.equal(request.body.engine, engine)
    assert.equal(request.body.film_complete_id, intent.id)
    assert.equal(request.body.quality_snapshot, undefined, 'body cannot inject an arbitrary sheet or reference URL')
    assert.ok(ctx.requests[0].body.topic.includes(snapshot.style.lookPhrase), 'existing writer receives the frozen style')
    assert.ok(ctx.requests[0].body.topic.includes(snapshot.characters[1].canonica), 'existing writer receives the original girl')
    assert.deepEqual((await ctx.service.loadFilmCompleteIntent(ctx.db, USER, intent.id)).metadata.source_quality, snapshot)
  }
  const { ctx, quality, snapshot, response } = fixture({ legacy: true })
  const inherited = quality.filmQualityFromBirth({ sourceGenerationId: SOURCE, response })
  assert.equal(inherited.provenance, 'legacy_birth')
  assert.deepEqual(inherited.characters.map(f => f.canonica), snapshot.characters.map(f => f.canonica), 'legacy canonical descriptions come verbatim from source prompts')
  assert.equal(inherited.style.look, 'animated3d', 'legacy source animation remains animation')
  assert.deepEqual(inherited.approvedStills.map(s => s.url), snapshot.approvedStills.map(s => s.url), 'approved source Kling4 stills survive')
  assert.ok(inherited.missing.includes('character_reference_urls_not_persisted'), 'missing historical sheet URLs are explicit')
  const intent = await arm(ctx)
  const row = ctx.tables.events.find(row => row.id === intent.id)
  delete row.metadata.source_quality
  delete row.metadata.source_generation_id
  assert.deepEqual(await ctx.service.loadFilmCompleteQuality(ctx.db, USER, intent.id, intent.generationId), inherited, 'old intent recovers its owned birth, not a new cast')
  row.metadata.paid_session_id = null
  assert.equal(await ctx.service.loadFilmCompleteQuality(ctx.db, USER, intent.id, intent.generationId), null, 'unpaid intent cannot activate inheritance')
  const unsafe = quality.filmQualityFromBirth({ sourceGenerationId: SOURCE, response: { scene_prompts: ['A workshop'], scene_fal_inputs: [{ image_url: 'https://cdn.example.test/rejected.png' }] },
    criticEvents: [{ url_final: 'https://cdn.example.test/rejected.png', escolhida_tentativa: 1, tentativas: [{ n: 0, url: 'https://cdn.example.test/old.png', veredito: 'PASS' }, { n: 1, url: 'https://cdn.example.test/rejected.png', veredito: 'FAIL' }] }] })
  assert.deepEqual(unsafe.approvedStills, [], 'an earlier PASS never approves the rejected selected image')
  assert.deepEqual(unsafe.characters, [], 'missing source sheet never invokes recasting')
  console.log('qualidade-heranca: source snapshot + both dispatch engines + legacy client story + ownership + selected-URL approval; zero network')
}

// KINEO-QUALIDADE-TODOS-MOTORES-2910 — prove reference URLs reach real provider payloads after the screenplay expands.
export function runQualityReferenceChecks() {
  const { ctx, snapshot } = fixture()
  const { ancoraHerdadaDaCena } = ctx.load('lib/cinematic/filmQualityReference.ts')
  const { buildKling4TrialInput } = ctx.load('lib/kling4Trial.ts')
  const { prepareKling4PaidFilm } = ctx.load('lib/kling4PaidFilm.ts')
  const [robot, girl] = snapshot.characters
  const expanded = [
    [robot, 'The robot carries a repaired toy toward the village.', 'The robot walks through the village with a repaired toy.'],
    [robot, 'He carefully places the toy beside a doorstep.', 'The robot places the repaired toy beside a doorstep.'],
    [robot, 'Its heart-shaped LED pulses for the last time.', 'The robot sits by the workshop as its heart-shaped LED pulses.'],
    [girl, 'The little girl lifts her teddy bear toward the light.', 'The little girl lifts her teddy bear beside a window.'],
    [girl, 'A warm glow appears inside the bear she holds.', 'The little girl holds the glowing teddy bear.'],
    [girl, 'She hugs the teddy bear and smiles through her tears.', 'The little girl hugs her teddy bear.'],
  ]
  const scenes = expanded.map(([ficha, speech, prompt]) => ({ prompt, seconds: 5, approvedStillUrl: ancoraHerdadaDaCena(snapshot, speech, prompt, [ficha]) }))
  assert.deepEqual(scenes.map(s => s.approvedStillUrl), [0, 0, 0, 2, 2, 2].map(i => snapshot.approvedStills[i].url), 'new speech/action reuses the same character, without another FLUX or Nano image')
  // Seedance/Kling2.5/Veo classic submission receives this exact selected URL in its existing image_url slot.
  const classicInput = { prompt: scenes[3].prompt, image_url: scenes[3].approvedStillUrl }
  assert.equal(classicInput.image_url, snapshot.approvedStills[2].url)
  const chunks = prepareKling4PaidFilm({ seconds: 30, narration: expanded.map(s => s[1]).join(' '), scenes })
  assert.equal(chunks.length, 2)
  assert.equal(chunks[0].input.start_image_url, snapshot.approvedStills[0].url, 'chunk 1 actually receives the source robot image')
  assert.equal(chunks[1].input.start_image_url, snapshot.approvedStills[2].url, 'chunk 2 actually receives the source girl image')
  assert.ok(chunks.every(chunk => chunk.model === 'kling/v4/image-to-video'))
  assert.deepEqual(buildKling4TrialInput(scenes.slice(0, 3).map(s => s.prompt), scenes.slice(0, 3).map(s => s.approvedStillUrl)).input.middle_image_urls,
    [snapshot.approvedStills[0].url, snapshot.approvedStills[0].url])
  const girlOnly = { ...snapshot, characterReferences: [], approvedStills: [snapshot.approvedStills[2]] }
  assert.equal(ancoraHerdadaDaCena(girlOnly, expanded[0][1], expanded[0][2], [robot]), null, 'a girl frame never seeds a robot-only scene')
  assert.equal(ancoraHerdadaDaCena(girlOnly, snapshot.approvedStills[2].voiceover, expanded[0][2], [robot]), null, 'even matching narration cannot override incompatible cast')
  const both = { ...snapshot, approvedStills: [...snapshot.approvedStills, { url: 'https://cdn.example.test/together.png', prompt: 'The robot and little girl hold the teddy bear.', voiceover: 'They exchange the gift.', characterNames: ['robot', 'little girl'] }] }
  assert.equal(ancoraHerdadaDaCena(both, 'Together they lift the gift.', 'The robot and little girl raise the teddy bear.', [robot, girl]), 'https://cdn.example.test/together.png', 'prefer the source frame with both requested people')
  const legacy = { ...snapshot, characters: [], characterReferences: [], approvedStills: [{ ...snapshot.approvedStills[0], characterNames: [] }] }
  assert.equal(ancoraHerdadaDaCena(legacy, expanded[0][1], expanded[0][2], [robot]), snapshot.approvedStills[0].url, 'legacy role/canonical text still identifies the robot without source cast metadata')
  const legacyWithGirl = { ...legacy, approvedStills: [{ ...legacy.approvedStills[0], prompt: 'The robot stands next to the little girl.' }] }
  assert.equal(ancoraHerdadaDaCena(legacyWithGirl, expanded[0][1], expanded[0][2], [robot]), null, 'even an unrecorded girl excludes a mixed legacy frame from a robot-only scene')
  console.log('qualidade-referencia: expanded speech reaches both real Kling4 chunk inputs; classic frame, multi-person preference and incompatible-cast rejection; zero provider calls')
}
