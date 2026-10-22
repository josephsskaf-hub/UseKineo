// KINEO-ADS-CENA-95-2110 — pipeline/adapters reais, dublês fail-closed, orçamento durável e mutantes em memória.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
import { fixture95 } from './test-ads-cena-95-montagem-2110.mjs'
const ADAPT = 'lib/ads/cena/adapters95.ts', PIPE = 'lib/ads/cena/pipeline95.ts'
const read = p => readFileSync(p, 'utf8').replace(/\r\n/g, '\n')
const plain = x => JSON.parse(JSON.stringify(x))
export function planFixture95(mode = 'narrated') {
  const base = fixture95(mode).plan
  const hook = 'Ready for your run?', pain = 'Your pace changes along the way.', demonstration = 'Look at the Pulse watch on your own wrist while you run around the track this morning.', benefit = 'Battery for seven days.', offer = 'Free shipping this week.', cta = 'Order your Pulse watch.'
  const beforeCta = [hook, pain, demonstration, benefit, offer].join(' '), narration = `${beforeCta} ${cta}`
  const script = { hooks: [hook, 'Check your pace.', 'Time to run?'], hook, pain, demonstration, use: `${pain} ${demonstration}`, benefit: `${benefit} ${offer}`, offer, cta, narration, beforeCta, words: narration.split(' ').length, hookEstimatedSeconds: 4 / 2.9, estimatedSeconds: narration.split(' ').length / 2.9 + .35, timingBasis: 'rate_estimate', pauseSeconds: .35 }
  const presenter = { id: 'jade', name: 'Jade', portrait: 'https://www.usekineo.com/fixtures/approved-jade.jpg', look: 'one approved adult runner', gender: 'female', age: 'young_adult' }
  return { ...base, product: 'Pulse watch', input: { ...base.input, frase: 'Pulse watch with battery for seven days', oferta: offer, beneficios: [benefit], actorUrl: presenter.portrait, language: 'en' }, script, continuity: { actorUrl: presenter.portrait, wardrobe: 'yellow athletic shirt', productWrist: 'left' }, quality95: { version: 'KINEO-ADS-CENA-95-2110', presenter, wardrobe: 'yellow athletic shirt', musicMood: 'hustle', closePhoto: base.input.foto, shots: [{ kind: 'hook', start: 0, seconds: 3 }, { kind: 'use', start: 3, seconds: 7 }, { kind: 'close', start: 10, seconds: 5 }], costs: Object.fromEntries(['kling3', 'seedance2', 'veo31'].map(route => [route, { budgetMaxUsd: 100, assumptions: [], items: [] }])), planningUsage: { inputTokens: 10, outputTokens: 20, calls: 1, measuredCalls: 1 }, nativeVoice: 'one consistent natural woman voice in English' } }
}
function modules(over = {}) { const load = createOfflineLoader({ source: (p, s) => over[p] ?? s }); return { P: load(PIPE), A: load(ADAPT), M: load('lib/ads/cena/montage95.ts') } }
const booleans = ['product_faithful', 'product_whole', 'no_invented_text', 'real_scale', 'no_extra_hands', 'own_hands_attached', 'five_fingers', 'natural_face', 'same_actor', 'same_wardrobe', 'correct_wrist', 'no_extra_people', 'nothing_near_face', 'mouth_closed', 'mouth_speaking', 'motion_visible', 'no_hands', 'no_people', 'no_extra_objects']
export const goodVerdict = (score = 99) => Object.fromEntries([...booleans.map(k => [k, true]), ['score', score]])
function harness(P, route = 'kling3', mode = 'narrated', options = {}) {
  const state = P.newCena95State(planFixture95(mode), route).score95
  let time = 1_000_000, saved = plain(state)
  const effects = [], events = [], submissions = [], judges = []
  const reservation = id => assert.ok(saved.reservations.some(r => r.id === id), 'reserva persistida ANTES de efeito: ' + id)
  const ident = j => `${j.family}-c${j.candidate}-r${j.round}`
  const deps = {
    now: () => time,
    save: async s => { saved = plain(s); effects.push(['save', s.reservedUsd]) },
    submit: async j => {
      reservation(`model-${j.index}`); assert.equal(saved.jobs.find(x => x.index === j.index).status, 'submitting')
      if (j.kind === 'video') { assert.ok(saved.baseUrl); assert.ok(saved.jobs.filter(x => x.family === 'base' && x.round === saved.rounds.base).every(x => x.verdicts?.base), 'nenhum vídeo antes de julgar todos os candidatos de base') }
      submissions.push({ ...plain(j), id: ident(j) }); effects.push(['submit', ident(j)])
      return options.submit?.(j) ?? { kind: 'accepted', requestId: 'offline-' + ident(j) }
    },
    poll: async j => { assert.ok(j.requestId); effects.push(['poll', ident(j)]); return options.poll?.(j) ?? { state: 'done', url: `https://offline.example/result/${ident(j)}.${j.kind === 'image' ? 'png' : 'mp4'}` } },
    persist: async j => { effects.push(['persist', ident(j)]); return `https://offline.example/stored/${ident(j)}.${j.kind === 'image' ? 'png' : 'mp4'}` },
    frames: async j => {
      reservation(`frames-${j.index}`); assert.ok(saved.jobs.find(x => x.index === j.index).frameClaimedAt)
      effects.push(['frames', ident(j)])
      if (options.frames) return options.frames(j)
      return Array.from({ length: Math.floor(j.seconds * 2) + 1 }, (_, n) => ({ t: n / 2, url: `https://offline.example/frame/${ident(j)}-t${n / 2}.jpg` }))
    },
    json: async call => {
      const image = call.images.at(-1), match = image.match(/(base|person0|person1|close)-c(\d)-r(\d)/)
      assert.ok(match, 'juiz recebe frame persistido ou imagem aprovada')
      const [, family, candidateText, roundText] = match, candidate = Number(candidateText), round = Number(roundText), j = state.jobs.find(j => j.family === family && j.candidate === candidate && j.round === round)
      const segment = call.text.match(/segment=(\w+)/)[1]
      judges.push({ family, candidate, round, segment, call: plain(call) })
      reservation(`judge-${j.index}-${segment}`); assert.ok(saved.jobs.find(x => x.index === j.index).judgeClaims[segment])
      const frames = call.images.filter(u => u.includes('/frame/'))
      if (j.kind === 'video') {
        assert.equal(frames.length, 3, 'exatamente três quadros de cada segmento avaliado')
        assert.equal(new Set(frames).size, 3, 'quadros distintos')
        const times = frames.map(u => Number(u.match(/-t([\d.]+)\.jpg$/)[1]))
        const start = segment === 'use' && family === 'person0' && ['kling3', 'veo31'].includes(route) ? 3 : 0
        const end = family === 'close' ? 5 : segment === 'hook' ? 3 : family === 'person0' ? route === 'veo31' ? 8 : 10 : route === 'veo31' ? 2 : 7
        assert.equal(new Set(times).size, 3, 'instantes distintos')
        assert.equal(times[0], start); assert.equal(times.at(-1), end, 'frames cobrem início, meio e final do trecho mantido')
      }
      assert.equal(call.images[0], state.plan.input.foto)
      if (family === 'close') assert.ok(!call.images.includes(state.plan.input.actorUrl), 'close é julgado só contra produto')
      else assert.ok(call.images.includes(state.plan.input.actorUrl), 'identidade da pessoa acompanha juiz')
      call.onUsage?.({ prompt_tokens: 100, completion_tokens: 20 })
      const score = family === 'base' || family === 'person1' || family === 'close' ? candidate === 1 ? 99 : 97 : segment === 'hook' ? candidate === 0 ? 100 : 98 : candidate === 1 ? 99 : 95
      return options.verdict?.({ family, candidate, round, segment, j }) ?? goodVerdict(score)
    },
    event: async (name, data) => { events.push([name, plain(data)]); effects.push(['event', name]) },
  }
  return { state, deps, effects, events, submissions, judges, advance: ms => { time += ms }, persisted: () => saved }
}
async function drain(P, h, max = 100) { for (let n = 0; n < max && !['ready', 'failed'].includes(h.state.phase); n++) await P.stepCena95(h.state, h.deps); assert.ok(['ready', 'failed'].includes(h.state.phase), 'pipeline limitado precisa terminar'); return h }
function coverage(clips, end = 15) { let at = 0; for (const c of clips) { assert.equal(c.start, at); assert.ok((c.trimStart ?? 0) + c.keepSeconds <= c.seconds); at += c.keepSeconds }; assert.equal(at, end) }
export function adaptersProof95(over = {}) {
  const { A } = modules(over), photo = planFixture95().input.foto, baseUrl = 'https://offline.example/approved-base.png'
  for (const mode of ['narrated', 'talking']) for (const route of ['kling3', 'veo31', 'seedance2']) {
    const p = planFixture95(mode), base = A.cena95BaseRequests(p), requests = A.cena95VideoRequests(p, route, baseUrl)
    assert.deepEqual(plain(base.map(j => j.candidate)), [0, 1]); assert.ok(base.every(j => j.endpoint === 'fal-ai/nano-banana-pro/edit' && j.kind === 'image' && j.input.image_urls.includes(photo) && j.input.image_urls.includes(p.input.actorUrl)))
    const person0 = requests.filter(j => j.family === 'person0'), person1 = requests.filter(j => j.family === 'person1'), close = requests.filter(j => j.family === 'close')
    assert.deepEqual(plain(person0.map(j => j.candidate)), [0, 1]); assert.equal(person1.length, route === 'kling3' ? 0 : 2)
    assert.equal(close.length, 1, 'somente as tomadas de pessoa são best-of-2; close tem uma tentativa por rodada')
    assert.equal(close[0].photoReference, photo); assert.equal(close[0].keepSeconds, 5); assert.equal(close[0].seconds, route === 'veo31' ? 6 : 5); assert.equal(close[0].input.generate_audio, false)
    assert.equal(close[0].input[route === 'kling3' ? 'start_image_url' : 'image_url'], photo)
    assert.match(close[0].input.prompt, /No hand, person/); assert.match(close[0].input.prompt, /exact original customer/)
    if (route === 'kling3') {
      for (const j of person0) { assert.equal(j.seconds, mode === 'talking' ? 15 : 10); assert.equal(j.input.duration, mode === 'talking' ? '15' : '10'); assert.equal(j.input.shot_type, 'customize'); assert.equal(j.input.start_image_url, baseUrl); assert.deepEqual(plain(j.input.multi_prompt.map(s => s.duration)), mode === 'talking' ? ['3', '7', '5'] : ['3', '7']); assert.equal(j.input.generate_audio, mode === 'talking') }
    } else if (route === 'veo31') {
      for (const j of [...person0, ...person1]) { assert.equal(j.seconds, 8); assert.equal(j.keepSeconds, j.family === 'person0' ? 8 : 7); assert.equal(j.input.duration, '8s'); assert.deepEqual(plain(j.input.image_urls), [baseUrl, photo]); assert.equal(j.input.generate_audio, mode === 'talking') }
    } else {
      assert.ok(person0.every(j => j.seconds === 4 && j.keepSeconds === 3 && j.input.duration === '4'))
      assert.ok(person1.every(j => j.seconds === (mode === 'talking' ? 12 : 7) && j.keepSeconds === j.seconds && j.input.duration === (mode === 'talking' ? '12' : '7')))
      assert.ok([...person0, ...person1].every(j => j.input.generate_audio === (mode === 'talking')))
    }
    assert.ok(requests.every(j => Number.isFinite(j.unitUsd) && j.unitUsd > 0))
  }
  assert.throws(() => A.cena95VideoRequests(planFixture95(), 'kling3', 'bad'), /base_required/)
}
// KINEO-ADS-CENA-95-2110 — nativo divide a narração inteira, em vez de forçar hook+pain em3s.
export function nativeSegmentsProof95(over = {}) {
  const { A } = modules(over), count = s => s.trim().split(/\s+/u).length
  for (const total of [39, 40, 41]) for (const durations of [[3, 7, 5], [3, 12], [8, 7]]) {
    const words = Array.from({ length: total }, (_, n) => `word${n}`), script = { narration: words.join(' '), cta: words.slice(-4).join(' '), pauseSeconds: .35 }
    const segments = A.cena95NativeSegments(script, durations)
    assert.equal(segments.map(s => s.text).join(' '), script.narration, 'nenhuma palavra perdida, duplicada ou fora de ordem')
    assert.equal(segments.length, durations.length); assert.ok(segments.at(-1).text.endsWith(script.cta), 'CTA inteira só depois da pausa no último trecho')
    let at = 0
    for (const [n, segment] of segments.entries()) {
      assert.equal(segment.start, at); assert.equal(segment.seconds, durations[n]); at += segment.seconds
      assert.equal(segment.pauseSeconds, n === segments.length - 1 ? .35 : 0)
      assert.equal(segment.spokenSeconds, segment.seconds - segment.pauseSeconds)
      assert.equal(segment.estimatedWordsPerSecond, count(segment.text) / segment.spokenSeconds)
      assert.ok(segment.estimatedWordsPerSecond <= 2.9 + 1e-9, 'cada trecho cabe sem acelerar acima da taxa declarada')
      assert.equal(segment.timingBasis, 'planning_assumption_not_measured')
      if (n < segments.length - 1) assert.ok(!segment.text.includes('word' + (total - 4)), 'nenhuma palavra da CTA antes da pausa')
    }
    assert.equal(at, 15)
  }
  for (const durations of [[3, 7, 5], [3, 12]]) {
    const words = Array.from({ length: 42 }, (_, n) => `w${n}`)
    assert.throws(() => A.cena95NativeSegments({ narration: words.join(' '), cta: words.slice(-4).join(' '), pauseSeconds: .35 }, durations), /native_speech_does_not_fit/, '42 palavras não cabem nos cortes inteiros K3/Seedance a≤2.9wps')
  }
  const words42 = Array.from({ length: 42 }, (_, n) => `w${n}`)
  assert.equal(A.cena95NativeSegments({ narration: words42.join(' '), cta: words42.slice(-4).join(' '), pauseSeconds: .35 }, [8, 7]).map(s => s.text).join(' '), words42.join(' '))
  const p = planFixture95('talking'), baseUrl = 'https://offline.example/base.png'
  for (const route of ['kling3', 'seedance2']) {
    const reqs = A.cena95VideoRequests(p, route, baseUrl), durations = route === 'kling3' ? [3, 7, 5] : [3, 12]
    const segments = A.cena95NativeSegments(p.script, durations)
    for (const candidate of [0, 1]) {
      const jobs = reqs.filter(j => j.family !== 'close' && j.candidate === candidate)
      const prompts = route === 'kling3' ? jobs[0].input.multi_prompt.map(s => s.prompt) : jobs.map(j => j.input.prompt)
      const spoken = prompts.map(s => s.match(/Say ONLY: ([\s\S]+)$/u)?.[1])
      assert.deepEqual(plain(spoken), plain(segments.map(s => s.text)))
      assert.equal(spoken.join(' '), p.script.narration)
      assert.ok(count(spoken[0]) <= 8 && count(spoken[0]) < count(`${p.script.hook} ${p.script.pain}`), 'primeiro trecho não tenta falar11palavras em3s')
      assert.ok(spoken[0].startsWith(p.script.hook), 'gancho humano permanece completo no começo')
      assert.ok(prompts.at(-1).includes('Pause 0.35s immediately before the final 4 words'))
      assert.ok(prompts.slice(0, -1).every(s => !s.includes('Pause 0.35s')))
    }
  }
  const tooLongCta = { narration: words42.slice(0, 41).join(' '), cta: words42.slice(20, 41).join(' '), pauseSeconds: .35 }
  assert.throws(() => A.cena95NativeSegments(tooLongCta, [3, 7, 5]), /native_speech_does_not_fit/, 'não corta uma CTA que excede capacidade final')
  const compactWords = words42.slice(0, 28), largeCta = { narration: compactWords.join(' '), cta: compactWords.slice(-13).join(' '), pauseSeconds: .35 }
  assert.ok(A.cena95NativeSegments(largeCta, [3, 7, 5]).at(-1).text.endsWith(largeCta.cta), 'ajusta fronteira ideal para manter CTA longa inteira depois da pausa')
  for (const [script, durations] of [[{ ...p.script, cta: 'wrong ending' }, [3, 7, 5]], [p.script, [3, 7, 4]], [{ ...p.script, pauseSeconds: NaN }, [3, 7, 5]]]) assert.throws(() => A.cena95NativeSegments(script, durations), /native_speech_does_not_fit/)
}
export function judgeProof95(over = {}) {
  const { P } = modules(over)
  const required = { base: ['product_faithful', 'product_whole', 'no_invented_text', 'real_scale', 'no_extra_hands', 'own_hands_attached', 'five_fingers', 'natural_face', 'same_actor', 'same_wardrobe', 'correct_wrist', 'no_extra_people', 'nothing_near_face'], person: ['product_faithful', 'product_whole', 'no_invented_text', 'real_scale', 'no_extra_hands', 'own_hands_attached', 'five_fingers', 'natural_face', 'same_actor', 'same_wardrobe', 'correct_wrist', 'no_extra_people', 'nothing_near_face', 'motion_visible'], close: ['product_faithful', 'product_whole', 'no_invented_text', 'no_hands', 'no_people', 'no_extra_objects'] }
  for (const kind of ['base', 'person', 'close']) for (const narrated of [false, true]) {
    assert.equal(P.judgeCena95(goodVerdict(), kind, narrated).approved, true)
    const keys = [...required[kind], ...(kind !== 'close' && narrated ? ['mouth_closed'] : []), ...(kind === 'person' && !narrated ? ['mouth_speaking'] : [])]
    for (const key of keys) for (const bad of [false, undefined, 'true', 1]) { const v = goodVerdict(100); if (bad === undefined) delete v[key]; else v[key] = bad; assert.equal(P.judgeCena95(v, kind, narrated).approved, false, `${kind}/${narrated}: ${key} precisa booleano true`) }
  }
  for (const score of [94, -1, 101, NaN, '100']) assert.equal(P.judgeCena95({ ...goodVerdict(), score }, 'person', true).approved, false)
  assert.equal(P.judgeCena95('not json', 'person', true).approved, false)
}
export async function pipelineProof95(over = {}) {
  const { P, M } = modules(over)
  for (const mode of ['narrated', 'talking']) for (const route of ['kling3', 'veo31', 'seedance2']) {
    const h = await drain(P, harness(P, route, mode)), s = h.state
    assert.equal(s.phase, 'ready'); assert.match(s.baseUrl, /base-c1-r1/)
    assert.equal(s.rounds.base, 1); assert.equal(s.rounds.person0, 1); assert.equal(s.rounds.close, 1)
    assert.equal(h.submissions.filter(j => j.family === 'base').length, 2)
    assert.equal(h.submissions.filter(j => j.family === 'person0').length, 2)
    assert.equal(h.submissions.filter(j => j.family === 'close').length, 1)
    coverage(s.selectedClips)
    assert.deepEqual(plain(s.selectedClips.map(j => [j.kind, j.start, j.keepSeconds, j.trimStart])), route === 'veo31' ? [['hook', 0, 3, 0], ['use', 3, 5, 3], ['use', 8, 2, 0], ['close', 10, 5, 0]] : [['hook', 0, 3, 0], ['use', 3, 7, route === 'kling3' ? 3 : 0], ['close', 10, 5, 0]])
    assert.equal(s.selectedClips.at(-1).photoReference, s.plan.input.foto); assert.equal(s.selectedClips.at(-1).hasSpeech, false)
    if (mode === 'narrated') { assert.equal(s.nativeAudioClips.length, 0); assert.match(s.selectedClips[0].url, /person0-c0/); assert.match(s.selectedClips[1].url, /(?:person0|person1)-c1/); assert.ok(s.selectedClips.every(j => !j.hasSpeech)) }
    else { coverage(s.nativeAudioClips); assert.ok(s.nativeAudioClips.every(j => j.hasSpeech === true)); if (route !== 'seedance2') assert.match(s.nativeAudioClips[0].url, /person0-c1/, 'talking escolhe o par melhor, preservando uma voz e a continuidade') }
    assert.ok(h.effects.findIndex(e => e[0] === 'submit' && e[1].startsWith('person')) > h.effects.findIndex(e => e[0] === 'event' && e[1] === 'ads_cena95_candidate_judged'))
    assert.equal(s.videoTokens.measuredCalls, h.judges.length); assert.equal(s.videoTokens.input, h.judges.length * 100)
    assert.equal(s.videoTokens.output, h.judges.length * 20)
    assert.equal(new Set(s.reservations.map(r => r.id)).size, s.reservations.length)
    assert.ok(Math.abs(s.reservedUsd - s.reservations.reduce((sum, r) => sum + r.usd, 0)) < .00001)
    const out = M.buildCena95Montage({ plan: s.plan, selectedClips: s.selectedClips, nativeAudioClips: s.nativeAudioClips, ...(mode === 'narrated' ? { voiceUrl: 'https://offline.example/tts.mp3', voiceSeconds: 15 } : {}) })
    assert.equal(out.duration, 15); assert.equal(out.elements.filter(e => e.type === 'video' && e.track === 2).at(-1).duration, 5)
    const previous = h.submissions.length; await P.stepCena95(s, h.deps); assert.equal(h.submissions.length, previous, 'ready não cria outro trabalho')
  }
  const retry = await drain(P, harness(P, 'kling3', 'narrated', { verdict: ({ family, round }) => family === 'close' && round === 1 ? { ...goodVerdict(), no_hands: false } : goodVerdict() }))
  assert.equal(retry.state.phase, 'ready'); assert.equal(retry.state.rounds.close, 2)
  assert.equal(retry.submissions.filter(j => j.family === 'close').length, 2); assert.equal(retry.submissions.filter(j => j.family === 'person0').length, 2, 'refaz só família reprovada')
  assert.equal(retry.events.filter(e => e[0] === 'ads_cena95_retry').length, 1)
  for (const family of ['base', 'person0', 'person1']) {
    const retriedFamily = await drain(P, harness(P, 'veo31', 'narrated', { verdict: j => j.family === family && j.round === 1 ? { ...goodVerdict(), product_faithful: false } : goodVerdict() }))
    assert.equal(retriedFamily.state.phase, 'ready'); assert.equal(retriedFamily.state.rounds[family], 2)
    assert.equal(retriedFamily.submissions.filter(j => j.family === family).length, 4, 'família de pessoa/base recebe só uma nova rodada best-of-2')
    assert.ok(Object.entries(retriedFamily.state.rounds).filter(([key]) => key !== family).every(([, round]) => round === 1))
  }
  const failed = await drain(P, harness(P, 'kling3', 'narrated', { verdict: ({ family }) => family === 'close' ? { ...goodVerdict(), no_hands: false } : goodVerdict() }))
  assert.equal(failed.state.phase, 'failed'); assert.equal(failed.state.rounds.close, 2); assert.equal(failed.state.reason, 'cena95_close_rejected')
  assert.equal(failed.submissions.filter(j => j.family === 'close').length, 2)
  assert.equal(failed.state.selectedClips.length, 0, 'nenhuma seleção parcial vira entrega')
  const lowFrames = await drain(P, harness(P, 'kling3', 'narrated', { frames: () => [{ t: 0, url: 'https://offline.example/one.jpg' }, { t: 1, url: 'https://offline.example/two.jpg' }] }))
  assert.equal(lowFrames.state.phase, 'failed'); assert.equal(lowFrames.judges.filter(j => j.family !== 'base').length, 0, 'não paga juiz sem3frames por segmento')
  const repeated = await drain(P, harness(P, 'kling3', 'narrated', { frames: j => Array.from({ length: 3 }, () => ({ t: 1, url: `https://offline.example/frame/${j.family}-c${j.candidate}-r${j.round}-t1.jpg` })) }))
  assert.equal(repeated.state.phase, 'failed'); assert.equal(repeated.judges.filter(j => j.family !== 'base').length, 0, 'um frame repetido não comprova movimento')
  const sameUrl = await drain(P, harness(P, 'kling3', 'narrated', { frames: j => [0, 1.5, 3, 5, 7, 10].filter(t => t <= j.seconds).map(t => ({ t, url: `https://offline.example/frame/${j.family}-c${j.candidate}-r${j.round}-t0.jpg` })) }))
  assert.equal(sameUrl.state.phase, 'failed'); assert.equal(sameUrl.judges.filter(j => j.family !== 'base').length, 0, 'timestamps diferentes da mesma URL não são frames diferentes')
  const sameTime = await drain(P, harness(P, 'kling3', 'narrated', { frames: j => [0, 1, 2].map(n => ({ t: 1, url: `https://offline.example/frame/${j.family}-c${j.candidate}-r${j.round}-t${n}.jpg` })) }))
  assert.equal(sameTime.state.phase, 'failed'); assert.equal(sameTime.judges.filter(j => j.family !== 'base').length, 0, 'URLs diferentes do mesmo instante não são movimento')
  const narrow = await drain(P, harness(P, 'kling3', 'narrated', { frames: j => [1, 1.1, 1.2].map(n => ({ t: n, url: `https://offline.example/frame/${j.family}-c${j.candidate}-r${j.round}-t${n}.jpg` })) }))
  assert.equal(narrow.state.phase, 'failed'); assert.equal(narrow.judges.filter(j => j.family !== 'base').length, 0, 'três instantes concentrados não cobrem um segmento')
}
export async function effectsProof95(over = {}) {
  const { P } = modules(over)
  const h = harness(P)
  await P.reserveCena95(h.state, h.deps, 'one', 'offline', 1); await P.reserveCena95(h.state, h.deps, 'one', 'offline', 1)
  assert.equal(h.state.reservedUsd, 1); assert.equal(h.state.reservations.length, 1)
  await assert.rejects(P.reserveCena95(h.state, h.deps, 'over', 'offline', 101), /budget_exhausted/)
  assert.equal(h.state.reservedUsd, 1); assert.equal(h.state.reservations.length, 1)
  const budget = harness(P); budget.state.budgetMaxUsd = .01
  await assert.rejects(P.stepCena95(budget.state, budget.deps), /budget_exhausted/)
  assert.equal(budget.submissions.length, 0); assert.equal(budget.state.reservedUsd, 0)
  for (const bad of [-1, NaN, Infinity]) await assert.rejects(P.reserveCena95(h.state, h.deps, 'bad', 'offline', bad), /budget_exhausted/)
  const ambiguous = harness(P, 'kling3', 'narrated', { submit: () => ({ kind: 'ambiguous' }) })
  await P.stepCena95(ambiguous.state, ambiguous.deps); const n = ambiguous.submissions.length
  await P.stepCena95(ambiguous.state, ambiguous.deps); assert.equal(ambiguous.submissions.length, n)
  ambiguous.advance(21 * 60_000); await P.stepCena95(ambiguous.state, ambiguous.deps)
  assert.equal(ambiguous.state.phase, 'failed'); assert.equal(ambiguous.state.reason, 'cena95_submit_unconfirmed'); assert.equal(ambiguous.submissions.length, n, 'submit ambíguo jamais se repete')
  const claimed = harness(P); await P.stepCena95(claimed.state, claimed.deps); await P.stepCena95(claimed.state, claimed.deps)
  claimed.state.jobs[0].judgeClaims = { base: 1 }; await P.stepCena95(claimed.state, claimed.deps)
  assert.equal(claimed.judges.length, 0); assert.equal(claimed.state.jobs[0].verdicts.base.approved, false, 'intenção de juiz sem recibo não se repete')
  const frameClaimed = harness(P)
  for (let n = 0; n < 20 && !(frameClaimed.state.phase === 'videos' && frameClaimed.state.jobs.some(j => j.kind === 'video') && frameClaimed.state.jobs.filter(j => j.kind === 'video').every(j => j.status === 'done')); n++) await P.stepCena95(frameClaimed.state, frameClaimed.deps)
  const firstVideo = frameClaimed.state.jobs.find(j => j.kind === 'video'); firstVideo.frameClaimedAt = 1
  await P.stepCena95(frameClaimed.state, frameClaimed.deps)
  assert.ok(!frameClaimed.effects.some(e => e[0] === 'frames'), 'intenção de extrair frames sem recibo não se repete')
  assert.ok(Object.values(firstVideo.verdicts).every(v => !v.approved))
  const pending = harness(P, 'kling3', 'narrated', { poll: () => ({ state: 'pending', url: null }) })
  await P.stepCena95(pending.state, pending.deps); pending.advance(26 * 60_000); await P.stepCena95(pending.state, pending.deps); await P.stepCena95(pending.state, pending.deps)
  assert.equal(pending.state.rounds.base, 2); await P.stepCena95(pending.state, pending.deps)
  pending.advance(26 * 60_000); await P.stepCena95(pending.state, pending.deps); await P.stepCena95(pending.state, pending.deps)
  assert.equal(pending.state.phase, 'failed'); assert.equal(pending.submissions.length, 4, 'deadline permite só uma nova rodada')
}
export async function proofAll95(over = {}) { adaptersProof95(over); nativeSegmentsProof95(over); judgeProof95(over); await pipelineProof95(over); await effectsProof95(over) }
export async function runPipeline95() {
  await proofAll95(); console.log('ok pipeline95: contratos, best-of-2 pessoa, close único, quadros por segmento, juiz95, famílias, retry1 e efeitos após reserva')
  const mutations = [
    [ADAPT, 'só um candidato de pessoa', 'for (const candidate of [0, 1])', 'for (const candidate of [0])'],
    [ADAPT, 'close usa foto errada', 'photoReference: plan.input.foto', "photoReference: 'https://offline.example/wrong.png'"],
    [ADAPT, 'Kling narrated custa duração errada', 'const duration = talking ? 15 : 10', 'const duration = talking ? 15 : 15'],
    [ADAPT, 'Veo perde segundo segmento', 'keepSeconds: part === 0 ? 8 : 7', 'keepSeconds: part === 0 ? 8 : 6'],
    [ADAPT, 'restaura hook+pain de11palavras em3s', '${speech(native[0])}', "${plan.quality95.nativeVoice} Say ONLY: ${[plan.script.hook, plan.script.pain].join(' ')}"],
    [ADAPT, 'duplica palavra na fronteira', 'words.slice(at, end)', 'words.slice(Math.max(0, at - 1), end)'],
    [ADAPT, 'inverte ordem das palavras', "words.slice(at, end).join(' ')", "words.slice(at, end).reverse().join(' ')"],
    [ADAPT, 'perde palavra no corte', 'at = end; start += seconds', 'at = end + 1; start += seconds'],
    [ADAPT, 'pausa deixa de reduzir orçamento', 's - (n === durations.length - 1 ? pause : 0)', 's'],
    [ADAPT, 'permite42palavras aceleradas', 'Math.floor(s * CENA95_TARGET_WPS + 1e-9)', 'Math.ceil(s * CENA95_TARGET_WPS)'],
    [ADAPT, 'CTA cortada antes da pausa', 'words.length - cta.length - (durations.length - n - 2)', 'words.length - (durations.length - n - 1)'],
    [PIPE, 'juiz aceita cinco dedos desconhecidos', "'five_fingers', ", ''],
    [PIPE, 'juiz aceita produto gigante', "'real_scale', ", ''],
    [PIPE, 'juiz aceita mão extra', "'no_extra_hands', ", ''],
    [PIPE, 'talking aceita boca sem falar', "['mouth_speaking']", '[]'],
    [PIPE, 'juiz aceita campo ausente', 'r[k] !== true', 'r[k] === false'],
    [PIPE, 'nota94 vira aprovada', 'CENA95_MIN_SCORE = 95', 'CENA95_MIN_SCORE = 90'],
    [PIPE, 'terceira tentativa extra', 'CENA95_MAX_ROUNDS = 2', 'CENA95_MAX_ROUNDS = 3'],
    [PIPE, 'custo excedido é aceito', ' || s.reservedUsd + usd > s.budgetMaxUsd + 0.000001', ''],
    [PIPE, 'submit sem reserva prévia', 'await reserveCena95(s, d, `model-${j.index}`, j.kind, j.unitUsd); ', ''],
    [PIPE, 'ambíguo é submetido novamente', "else if (r.kind === 'rejected') j.status = 'failed'", "else j.status = 'new'"],
    [PIPE, 'escolhe menor nota', 'b.verdicts![key].score - a.verdicts![key].score', 'a.verdicts![key].score - b.verdicts![key].score'],
    [PIPE, 'talking ignora qualidade conjunta', "talking && s.route !== 'seedance2' ? pair(p0)", "false ? pair(p0)"],
    [PIPE, 'quadros duplicados voltam a contar', 'new Set(eligible.map(f => f.url)).size !== eligible.length || new Set(eligible.map(f => f.t)).size !== eligible.length', 'false'],
    [PIPE, 'quadros deixam de cobrir segmento', 'return chosen[0].t! > start + span * 0.25 || chosen[2].t! < end - span * 0.25 || chosen[1].t! - chosen[0].t! < span * 0.15 || chosen[2].t! - chosen[1].t! < span * 0.15 ? [] : chosen', 'return chosen'],
  ]
  for (const [file, label, before, after] of mutations) {
    const original = read(file); assert.equal(original.split(before).length - 1, 1, 'mutação aplicada1vez: ' + label)
    let red = false; try { await proofAll95({ [file]: original.replace(before, after) }) } catch { red = true }
    assert.ok(red, 'mutante precisa ficar vermelho: ' + label); console.log('ok mutante vermelho: ' + label)
  }
}
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) await runPipeline95()
