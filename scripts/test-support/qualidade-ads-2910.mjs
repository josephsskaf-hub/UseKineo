// KINEO-QUALIDADE-TODOS-MOTORES-2910 — execute real Ads plans/adapters, with provider/vision/storage boundaries injected.
import assert from 'node:assert/strict'
import { createOfflineLoader } from './offline-ts-loader.mjs'

export async function provaQualidadeAds(source = null) {
  const load = createOfflineLoader({ source })
  const plans = load('lib/ads/cena/escolhaPlan.ts')
  const shots = load('lib/ads/cena/escolhaShots.ts')
  const catalog = load('lib/ads/cena/escolhaCatalog.ts')
  const categories = Object.keys(load('lib/ads/cena/catalog.ts').CENA_CATALOG)
  const video = load('lib/ads/cena/escolhaVideo.ts')
  const stills = load('lib/ads/cena/escolhaStills.ts')
  let combinations = 0, payloads = 0, largestPrompt = 0, firstPlan
  for (const category of categories) for (const format of shots.CENA_ESCOLHA_FORMATS) {
    const input = { foto: 'https://offline.example/product.png', frase: 'Produto.', language: 'pt', formato: format.id, voice_mode: 'narrated' }
    const json = async c => c.images.length ? { category, confidence: .99, product: 'Produto', offer: '', benefits: [] }
      : { hooks: ['Conhece o Produto?', 'Qual Produto escolher?', 'Veja o Produto.'], use: 'Conheça o Produto.', benefit: '', cta: 'Conheça o Produto.' }
    const plan = await plans.planCenaEscolha(input, 'kling3', json, {
      presenter_id: 'sofia', scenario_id: catalog.escolhaScenarios(category)[0].id, category,
    })
    firstPlan ??= plan
    assert.equal(plan.filmQuality.version, 'film_quality_2910_v1')
    assert.equal(plan.filmQuality.style.look, 'photoreal')
    assert.equal(plan.filmQuality.actorReference, plan.escolha.actorUrl)
    assert.equal(plan.filmQuality.elenco.length, 1)
    assert.equal(plan.filmQuality.elenco[0].origem, 'autor')
    assert.ok(plan.filmQuality.elenco[0].canonica.includes(plan.escolha.wardrobe))
    assert.match(plan.keyframePrompts[0], /SINGLE PHOTOGRAPH/, 'film quality preserves the complete product/photo contract')
    if (format.id === 'unboxing') assert.match(plan.keyframePrompts[0], /CLOSED.*transparent front.*whole actual product.*fully visible inside/u)
    if (format.id === 'product_in_hand') assert.match(plan.keyframePrompts[0], /wearable\/shoes are held, not worn/u)
    for (const prompt of [...plan.keyframePrompts, plan.videoPrompt, ...plan.segmentPrompts]) {
      assert.match(prompt, /Film visual medium: .*photoreal/)
      assert.doesNotMatch(prompt, /Named character.*(?:Ending|TWIST|HOOK)/)
    }
    const speech = JSON.stringify(plan.script)
    for (const route of ['kling4', 'kling3', 'seedance2', 'veo31']) {
      const requests = video.escolhaVideoRequests(plan, route, 'https://offline.example/approved.png')
      assert.equal(requests.reduce((sum, r) => sum + r.keepSeconds, 0), 15)
      assert.equal(JSON.stringify(plan.script), speech, 'quality never rewrites spoken copy')
      if (route === 'kling4' || route === 'kling3') {
        for (const [index, shot] of requests[0].input.multi_prompt.entries()) {
          assert.equal(shot.prompt, plan.escolha.shotPrompts[index], 'no provider truncation of style, action, identity or silent-mouth instructions')
          assert.ok(shot.prompt.length <= 500)
          largestPrompt = Math.max(largestPrompt, shot.prompt.length)
          assert.match(shot.prompt, /Chosen photoreal still:/)
          assert.match(shot.prompt, /same ONE adult, outfit, scene/)
          assert.match(shot.prompt, /whole real product, label unchanged/)
          assert.match(shot.prompt, /Own attached hands, five fingers/)
          assert.match(shot.prompt, /Lips closed; ambient action sounds only, no speech\/music/)
        }
        assert.equal(requests[0].input.start_image_url, 'https://offline.example/approved.png')
      }
      payloads++
    }
    combinations++
  }
  const flow = { marker: stills.ESCOLHA_MARK, stage: 'stills', round: 1, stills: Array.from({ length: 4 }, (_, index) => ({
    id: `still-${index + 1}`, index, attempt: 1, kind: 'image', status: 'done', url: `https://offline.example/preview-${index}.png`,
  })) }
  let visionCalls = 0
  const forbidden = () => { throw new Error('Quality must not submit another fal image') }
  await stills.stepEscolhaStills(firstPlan, flow, {
    now: () => 1, save: async () => {}, submit: forbidden, poll: forbidden, persist: forbidden,
    json: async call => {
      visionCalls++
      assert.ok(call.system.includes('IDENTITY'))
      assert.ok(call.system.includes('same_visual_medium'))
      assert.equal(call.images[1], firstPlan.escolha.actorUrl)
      return { score: 95, reasons: [], same_face: true, same_outfit: true, same_visual_medium: false,
        anatomy: { limbs_attached: true, normal_joints: true, five_fingers: true, no_reversed_knees: true, no_reversed_hands: true } }
    },
  })
  assert.equal(visionCalls, 4, 'one already-existing judge call per preview')
  assert.equal(flow.stage, 'choose', 'the founder-approved human choice stays available')
  assert.ok(flow.stills.every(s => s.verdict.score <= 20 && s.verdict.reasons.some(r => r.includes('Rendering style differs'))))
  for (const [file, fn] of [['pipeline.ts', 'stepCena'], ['pipeline95.ts', 'stepCena95']]) {
    const plan = JSON.parse(JSON.stringify(firstPlan)); delete plan.filmQuality
    const state = { plan, phase: 'ready' }
    await load('lib/ads/cena/' + file)[fn](state, { save: forbidden, submit: forbidden, json: forbidden })
    assert.equal(state.plan.filmQuality.style.look, 'photoreal', 'stored plans also enter shared quality without provider effects')
  }
  return { combinations, payloads, largestPrompt, visionCalls, legacy: await provaQualidadeAdsV2(source) }
}

// KINEO-QUALIDADE-TODOS-MOTORES-2910 — live legacy dispatch, every sector/tier and all prompt-capable engines.
export async function provaQualidadeAdsV2(source = null) {
  const load = createOfflineLoader({ source, globals: { AbortController, setTimeout: () => 0, clearTimeout() {} } })
  const planner = load('lib/ads/v2ShotLists.ts'), adapter = load('lib/ads/v2FilmQuality.ts')
  const engines = load('lib/ads/v2Engines.ts'), judge = load('lib/ads/v2FilmQualityJudge.ts')
  let plans = 0, images = 0, videos = 0
  const photos = ['product', 'place', 'people'].map((kind, i) => ({ id: String(i), kind, url: 'https://offline.example/' + kind + '.png' }))
  for (const sector of planner.ADS_V2_SECTORS) for (const tier of planner.ADS_V2_PLAN_TIERS) {
    const plan = { ...planner.planShots({ sector, tier, photos, seconds: 15 }), narration: 'TWIST: Produto Ending para seu dia.', overlays: [] }
    const before = JSON.stringify(plan)
    for (const shot of plan.shots) {
      if (shot.scenePrompt) {
        const q = adapter.qualidadeDoPlanoAdsV2(plan, shot.kind, shot.scenePrompt)
        assert.equal(q.elenco.length, 0, 'product words are never invented people')
        assert.match(q.prompt, /Film visual medium: .*photoreal/)
        assert.doesNotMatch(q.prompt, /Named character in this shot/)
        const image = engines.buildSceneImageInput({ prompt: q.prompt, referenceUrls: shot.referenceUrls })
        assert.equal(image.num_images, 1); images++
      }
      if (!shot.prompt || shot.kind === 'text' || shot.kind === 'user_video') continue
      const q = adapter.qualidadeDoPlanoAdsV2(plan, shot.kind, shot.prompt, true)
      for (const engine of ['kling4', 'kling_o3', 'seedance_20_fast', 'h3', 'kling_avatar']) {
        const input = engines.buildShotInput(engine, { imageUrl: photos[0].url, prompt: q.prompt, audioUrl: 'https://offline.example/voice.mp3' })
        assert.match(input.prompt, /^Style: photoreal\. /)
        assert.equal(input.prompt, q.prompt, 'legacy provider must not truncate fidelity instructions')
        videos++
      }
    }
    assert.equal(JSON.stringify(plan), before, 'duration, cuts, narration, references and effects unchanged'); plans++
  }
  const presenter = { actorPrompt: 'a friendly adult with short dark hair and a blue shirt', v2: { portraitUrl: 'https://offline.example/actor.png' } }
  const plan = { narration: 'Our product is ready.', presenter }
  const q = adapter.qualidadeDoPlanoAdsV2(plan, 'presenter', 'The approved person holds the real product.')
  assert.equal(q.elenco[0].canonica, presenter.actorPrompt)
  assert.equal(q.referencia.url, presenter.v2.portraitUrl)
  let visionCalls = 0
  const result = await judge.julgarStillAdsV2({ plan, kind: 'presenter', indice: 31, url: 'https://offline.example/still.png', prompt: q.prompt }, {
    apiKey: 'offline-only', fetchImpl: async (_url, req) => {
      const body = JSON.parse(req.body); visionCalls++
      assert.ok(JSON.stringify(body.messages).includes(presenter.v2.portraitUrl))
      return { ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify({ verdict: 'FAIL', issues: ['identity'], score: 20, reason: 'Wrong identity' }) } }] }) }
    },
  })
  assert.equal(visionCalls, 1); assert.equal(result.relato.veredito, 'FAIL')
  assert.equal(result.relato.regeracoes, 0); assert.equal(result.relato.fal_extra, 0)
  assert.equal(result.url, 'https://offline.example/still.png')
  const effect = engines.buildShotInput('pixverse_effect', { imageUrl: photos[0].url, effect: 'package_explosion', prompt: q.prompt })
  assert.equal(Object.hasOwn(effect, 'prompt'), false, 'PixVerse effect schema has no free-form prompt')
  return { plans, images, videos, visionCalls }
}
