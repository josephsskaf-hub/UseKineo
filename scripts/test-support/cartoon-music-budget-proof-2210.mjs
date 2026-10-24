// KINEO-CARTOON-CONSISTENCIA-2210 — música real em dublê: mesmo job aceito, decisão tardia do claim, zero rede/crédito.
import fs from 'node:fs'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createOfflineLoader } from './offline-ts-loader.mjs'

export async function cartoonMusicBudgetProof({ overrides = {} } = {}) {
  const AUDIO = 'lib/audioNoClique.ts', COMPOSE = 'app/api/compose/route.ts'
  const read = file => (overrides[file] ?? fs.readFileSync(file, 'utf8')).replaceAll('\r\n', '\n')
  const base = execFileSync('git', ['show', '1b991815:' + AUDIO], { encoding: 'utf8' })
  let assertions = 0
  const rows = []
  const check = (value, message) => { assert.ok(value, message); assertions++ }
  const hookLine = read(COMPOSE).split('\n').find(s => s.includes('const audioDoClique = montagemComAudioDoClique('))
  check(hookLine?.includes('naoRepetirJobAceito: () =>'), 'compose uses a late callback instead of freezing the not-yet-loaded claim')
  const callback = hookLine.slice(hookLine.indexOf('naoRepetirJobAceito: ') + 'naoRepetirJobAceito: '.length, hookLine.indexOf(' })'))
  const pure = createOfflineLoader({ source: (p, s) => overrides[p] ?? s })('lib/kidsCartoon/kidsCartoon.ts')
  const claimState = new Function('desenhoDoClaim', `let cinematicBirthClaim = null; const callback = ${callback}; return { callback, setClaim(value) { cinematicBirthClaim = value } }`)(pure.desenhoDoClaim)
  const claim = (duration = 15, kids = true, quality = 'cinematic_ai') => ({ quality, response: { duration, ...(kids ? { kids_cartoon: { character: 'leo', captions: true } } : {}) } })
  check(claimState.callback() === false, 'constructor does not enable protection before a verified claim exists')
  claimState.setClaim(claim())
  check(claimState.callback() === true, 'the same callback enables protection after verified Kids15 assignment')
  for (const other of [claim(35), claim(15, false), claim(15, true, 'fast'), { quality: 'cinematic_ai', response: { duration: 15, kids_cartoon: { character: 'invalid', captions: true } } }]) {
    claimState.setClaim(other)
    check(claimState.callback() === false, '35s, common, other quality and invalid Kids claim retain their previous behavior')
  }

  async function exercise(label, { old = false, flag = true, scenario = 'timeout' } = {}) {
    let row = null, posts = 0, waits = [], now = 1000, catalog = 0
    const job = { requestId: 'accepted-original', statusUrl: 'https://offline.test/status', responseUrl: 'https://offline.test/result' }
    const db = { from() { return {
      insert(value) { row = value; return Promise.resolve({ error: null }) },
      update(patch) { return { eq() { row = { ...row, ...patch }; return Promise.resolve({ error: null }) } } },
      select() { return { eq() { return { maybeSingle() { return Promise.resolve(scenario === 'db_error' ? { data: null, error: { message: 'offline db unavailable' } } : { data: row, error: null }) } } } } },
    } } }
    const load = createOfflineLoader({ source: (p, s) => p === AUDIO && old ? base : (overrides[p] ?? s), mocks: {
      '@/lib/lyriaMusic': { lyriaPromptFor: () => 'kids-exact-prompt', getLyriaMusicUrl: async () => { posts++; return 'https://offline.test/new-paid-music.mp3' } },
      '@/lib/pixabayMusic': { resolveMusicMood: () => 'nature', getBackgroundMusicUrl: async () => { catalog++; return 'https://offline.test/catalog.mp3' } },
    } })
    const A = load(AUDIO), M = load('lib/musicScore.ts')
    const request = { generationId: 'offline-cartoon', userId: 'offline-user', promptMusica: 'kids-exact-prompt', voz: null, cenas: [], esperaDaTrilhaMs: 150000 }
    const reserved = await A.reservarAquecimento(db, request, now)
    await A.executarAquecimento({ db, agora: () => now, submeterLyria: async () => { posts++; return job }, esperarLyria: async () => null }, request, reserved.registro)
    check(row.metadata.musica.status === 'falhou' && row.metadata.musica.job.requestId === job.requestId, label + ': fixture is a real accepted warming job whose result timed out')
    if (['during_wait', 'pending_no_job'].includes(scenario)) row.metadata.musica = { prompt_sha: row.metadata.musica.prompt_sha, status: 'pendente', job: null }
    if (scenario === 'invalid_url') row.metadata.musica.job = { ...job, statusUrl: 'http://offline.test/invalid' }
    if (scenario === 'no_job') { row.metadata.musica.job = null; posts = 0 }
    if (scenario === 'pending_no_job') posts = 0
    if (scenario === 'absent') { row = null; posts = 0 }
    const mounted = A.montagemComAudioDoClique({ db, generationId: request.generationId, lookup: async () => null,
      esperarLyria: async (actualJob, deadline) => { waits.push({ actualJob, deadline }); if (scenario === 'throw') throw Error('offline result unavailable'); return scenario === 'ready' ? 'https://offline.test/original-music.mp3' : null },
      orcamentoLyriaMs: 45000, agora: () => now,
      dormir: async ms => { now += ms; if (scenario === 'during_wait') row.metadata.musica = { ...row.metadata.musica, status: 'falhou', job } },
      ...(flag === 'absent' ? {} : { naoRepetirJobAceito: () => flag }),
    })
    const mountedAt = now
    const selected = await M.selectMusicForScript({ script: 'Leo shares a toy.', vertical: 'kids_story', lyriaPronta: mounted.musica })
    const protectedKids = !old && flag === true
    const accepted = !['no_job', 'absent', 'pending_no_job'].includes(scenario)
    if (protectedKids) {
      check(posts === (accepted ? 1 : 0), label + ': compose never starts a new paid job')
      check(selected === (scenario === 'ready' ? 'https://offline.test/original-music.mp3' : 'https://offline.test/catalog.mp3'), label + ': existing output or static catalog')
      check(catalog === (scenario === 'ready' ? 0 : 1), label + ': catalog appears only when original output is unavailable')
      const canWait = accepted && !['invalid_url', 'db_error'].includes(scenario)
      check(waits.length === (canWait ? 1 : 0), label + ': only a known accepted job is waited')
      if (waits.length) check(waits[0].actualJob.requestId === job.requestId && waits[0].deadline === mountedAt + 45000, label + ': same job id and bounded deadline')
    } else {
      check(posts === (['no_job', 'absent'].includes(scenario) ? 1 : 2), label + ': original default/fresh-generation behavior preserved')
      check(selected === 'https://offline.test/new-paid-music.mp3' && waits.length === 0, label + ': other products retain the previous selector result')
    }
    rows.push({ label, old, flag, scenario, mockedPosts: posts, waited: waits.map(w => w.actualJob.requestId), catalog, selected })
  }
  await exercise('baseline reproduces second paid request', { old: true })
  for (const scenario of ['ready', 'timeout', 'throw', 'during_wait', 'invalid_url', 'no_job', 'absent', 'db_error', 'pending_no_job']) await exercise('Kids15 ' + scenario, { scenario })
  await exercise('default option unchanged', { flag: 'absent' })
  for (const other of [claim(35), claim(15, false)]) { claimState.setClaim(other); await exercise('outside verified Kids15 ' + other.response.duration, { flag: claimState.callback() }) }
  return { assertions, rows }
}
