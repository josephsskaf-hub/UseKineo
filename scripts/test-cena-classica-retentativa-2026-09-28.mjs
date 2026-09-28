// KINEO-CENA-CLASSICA-2026-09-28 — retomada de cena para os motores CLÁSSICOS (Seedance 1.5, Kling 2.5, Veo 3.1).
// Casos: 3ab8128c (conta externa via TAAFT, Seedance 60 s, 16/09) — 7/7 cenas aceitas, 6 prontas, a 7ª nunca voltou; morreu
// no prazo de 50 min, 25 cr estornados. d6e8e8b3 (fundador, Seedance 60 s, 15/09) — 6 de 7 cenas, cobrado inteiro, zero
// retentativa. 14 dias: Seedance 5 parciais em 49 claims, Veo 1/6, Kling 2.5 0/5. A família hollywood já tinha 2 rodadas
// (original, depois suavizada) via /api/retry-hollywood-scene; a clássica não: a rota recusava o modelo (400) e o claim
// clássico não guardava o payload que foi ao fal.
// Este guardião EXECUTA:
//   (a) o espelho dos 6 ids clássicos (retomada ≡ poller cinematic-clip-status) e o ALLOWED real da rota;
//   (b) signedClassic (fatia real) em payloads bons e ruins;
//   (c) o POST real da rota (loader offline, banco sintético com HMAC real): payload assinado reenviado byte a byte na 1ª
//       rodada, só o prompt suavizado na 2ª, evento com family 'classic'; claim clássico de hoje (sem scene_fal_inputs) = 409
//       sem gasto; modelo desconhecido = 400; hollywood intacto (family 'hollywood');
//   (d) o portão do cliente (fatias reais do GenerateClient): abre com scene_prompts, e o corpo manda o modelo do filme
//       quando a resposta não traz fal_models;
//   (e) mutantes: sem o https do i2v, e sem os clássicos no ALLOWED.
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import ts from 'typescript'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(RAIZ) // o loader offline resolve '@/...' a partir do cwd
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) ok++; else { falhas.push(n); console.log('  FALHOU: ' + n) } }
const roda = (src, globals = {}) => { const js = ts.transpileModule(src, { compilerOptions: { module: 1, target: 9 } }).outputText; const exp = {}; vm.runInNewContext(js, { exports: exp, console, JSON, Math, Set, Array, Object, ...globals }); return exp }
const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)))
const fatia = (src, ini, fim, incluiFim = true) => { const a = src.indexOf(ini); if (a < 0) return null; const b = src.indexOf(fim, a + ini.length); return b < 0 ? null : src.slice(a, incluiFim ? b + fim.length : b) }

const RETRY_PATH = 'app/api/retry-hollywood-scene/route.ts'
const retry = rd(RETRY_PATH)
const status = rd('app/api/cinematic-clip-status/route.ts')
const router = rd('lib/hollywood/router.ts')
const constDe = (src, nome) => (src.match(new RegExp(`const ${nome} = '([^']+)'`)) || [])[1] ?? null
const CLASSICOS = ['SEEDANCE_MODEL', 'SEEDANCE_I2V_MODEL', 'KLING_MODEL', 'KLING_I2V_MODEL', 'VEO_MODEL', 'VEO_I2V_MODEL']
const ID = Object.fromEntries(CLASSICOS.map((n) => [n, constDe(status, n)]))
// KINEO-CENA-CLASSICA-2026-09-28 (revisão adversarial) — os 6 ids e a régua do hold clássico moram em lib/classicSceneRetry.ts
// (pura: a retomada, o compose e o cron leem dela). Executada de verdade abaixo.
const LIB_PATH = 'lib/classicSceneRetry.ts'
const libClassica = rd(LIB_PATH)
const LIB = roda(libClassica)
const ROUTER = {
  HOLLYWOOD_MODELS: { dialogue: 'fal-ai/kling-video/v3/pro/text-to-video', cinematic: 'fal-ai/kling-video/v3/pro/text-to-video', support: 'fal-ai/kling-video/v3/pro/text-to-video' },
  KLING3_I2V_MODEL: constDe(router, 'KLING3_I2V_MODEL'), H3_I2V_MODEL: constDe(router, 'H3_I2V_MODEL'), OMNI_I2V_MODEL: constDe(router, 'OMNI_I2V_MODEL'),
  S25_I2V_MODEL: constDe(router, 'S25_I2V_MODEL'), S25_T2V_MODEL: constDe(router, 'S25_T2V_MODEL'),
  H3_MODELS: { dialogue: 'minimax/h3/text-to-video', cinematic: 'minimax/h3/text-to-video', support: 'minimax/h3/text-to-video' }, H3_RESOLUTION: '768P', S25_RESOLUTION: '480p',
}
checa('router: constantes hollywood lidas do arquivo real (Kling 3 i2v, H3 i2v, Omni, S25)', Object.values(ROUTER).every(Boolean) && router.includes("dialogue: 'fal-ai/kling-video/v3/pro/text-to-video'"))

console.log('== (a) os 6 clássicos: espelho do poller e ALLOWED real ==')
checa('poller cinematic-clip-status tem os 6 ids clássicos', CLASSICOS.every((n) => typeof ID[n] === 'string' && ID[n].length > 5))
// Re-ancorado em 28/09: os 6 ids saíram da rota para lib/classicSceneRetry.ts (o compose e o cron também leem); a rota
// importa CLASSIC/CLASSIC_I2V de lá. A intenção é a mesma: o espelho do poller é conferido valor a valor.
checa('lib/classicSceneRetry declara os 6 com o MESMO valor do poller (mexeu lá, mexe na lib)', CLASSICOS.every((n) => constDe(libClassica, n) === ID[n]))
checa('a retomada importa CLASSIC/CLASSIC_I2V da lib e não redeclara nenhum id clássico', retry.includes("import { CLASSIC, CLASSIC_I2V } from '@/lib/classicSceneRetry'") && CLASSICOS.every((n) => constDe(retry, n) === null))
const blocoAllowed = fatia(retry, 'const H3_SET = new Set<string>(', 'for (const model of CLASSIC) ALLOWED.add(model)')
checa('fatia H3_SET → ALLOWED (+ clássicos) existe na rota', Boolean(blocoAllowed))
checa('a linha do ALLOWED hollywood segue byte a byte (test-qualidade-comprovada ancora nela)', retry.includes('OMNI_I2V_MODEL, S25_I2V_MODEL, S25_T2V_MODEL]) // KINEO-S25-STATUS-2026-09-15'))
const montaAllowed = (bloco) => roda(`${bloco.split('\n').map((l) => l.replace(/^const (\w+) =/, 'export const $1 =')).join('\n')}\n`, { ...ROUTER, CLASSIC: LIB.CLASSIC, CLASSIC_I2V: LIB.CLASSIC_I2V })
const A = blocoAllowed ? montaAllowed(blocoAllowed) : {}
checa('ALLOWED executado contém os 6 clássicos', A.ALLOWED && CLASSICOS.every((n) => A.ALLOWED.has(ID[n])))
checa('ALLOWED ainda recusa modelo desconhecido e o Sora (sem retomada clássica conferida)', A.ALLOWED && !A.ALLOWED.has('unsupported') && !A.ALLOWED.has('fal-ai/sora-2/text-to-video') && !A.ALLOWED.has('fal-ai/kling-video/ai-avatar/v2/standard'))
checa('ALLOWED mantém a família hollywood (Kling 3 t2v/i2v, H3, Omni, S25)', A.ALLOWED && [ROUTER.HOLLYWOOD_MODELS.support, ROUTER.KLING3_I2V_MODEL, ROUTER.H3_I2V_MODEL, ROUTER.H3_MODELS.support, ROUTER.OMNI_I2V_MODEL, ROUTER.S25_I2V_MODEL, ROUTER.S25_T2V_MODEL].every((m) => A.ALLOWED.has(m)))
checa('i2v clássicos (lib) = Seedance/Kling/Veo image-to-video; CLASSIC = os 6 e nenhum hollywood', LIB.CLASSIC_I2V && LIB.CLASSIC_I2V.size === 3 && [ID.SEEDANCE_I2V_MODEL, ID.KLING_I2V_MODEL, ID.VEO_I2V_MODEL].every((m) => LIB.CLASSIC_I2V.has(m)) && LIB.CLASSIC.size === 6 && CLASSICOS.every((n) => LIB.CLASSIC.has(ID[n])) && ![ROUTER.HOLLYWOOD_MODELS.support, ROUTER.KLING3_I2V_MODEL, ROUTER.H3_I2V_MODEL, ROUTER.H3_MODELS.support, ROUTER.OMNI_I2V_MODEL, ROUTER.S25_I2V_MODEL, ROUTER.S25_T2V_MODEL].some((m) => LIB.CLASSIC.has(m)))

console.log('== (b) signedClassic, fatia real ==')
const fnSigned = fatia(retry, 'function signedClassic(', '\n}\n')
checa('fatia signedClassic existe', Boolean(fnSigned))
const montaSigned = (fn) => roda(`export ${fn}`, { CLASSIC_I2V: LIB.CLASSIC_I2V }).signedClassic
const SC = fnSigned ? montaSigned(fnSigned) : () => 'sem-fatia'
const PROMPT = 'Vertical 9:16 documentary shot of basalt columns at dusk, slow push-in, volumetric light. '
const i2v = { image_url: 'https://v3.fal.media/files/still.png', prompt: PROMPT, aspect_ratio: '9:16', resolution: '720p', duration: '8', generate_audio: false, seed: 4242 }
const t2v = { prompt: PROMPT, aspect_ratio: '9:16', resolution: '720p', duration: '8', generate_audio: false, seed: 4242 }
const claimCom = (inputs) => ({ response: { scene_fal_inputs: inputs } })
const slotDe = (model, index = 0) => ({ index, oldRequestId: 'old', model })
{
  const r = SC(claimCom([i2v]), slotDe(ID.SEEDANCE_I2V_MODEL))
  checa('i2v com image_url https: aceito, prompt EXATO (espaço final preservado) e payload inteiro', r && r.prompt === PROMPT && JSON.stringify(r.input) === JSON.stringify(i2v))
  checa('t2v sem image_url: aceito (Seedance, Kling e Veo)', [ID.SEEDANCE_MODEL, ID.KLING_MODEL, ID.VEO_MODEL].every((m) => SC(claimCom([t2v]), slotDe(m))?.prompt === PROMPT))
  checa('i2v com image_url http://: recusado', SC(claimCom([{ ...i2v, image_url: 'http://x.invalid/a.png' }]), slotDe(ID.KLING_I2V_MODEL)) === null)
  checa('i2v sem image_url: recusado (Veo i2v)', SC(claimCom([t2v]), slotDe(ID.VEO_I2V_MODEL)) === null)
  checa('t2v carregando image_url (payload de outro modelo): recusado', SC(claimCom([i2v]), slotDe(ID.SEEDANCE_MODEL)) === null)
  checa('prompt com 19 caracteres úteis: recusado; com 20: aceito', SC(claimCom([{ ...t2v, prompt: '   ' + 'x'.repeat(19) + '  ' }]), slotDe(ID.KLING_MODEL)) === null && SC(claimCom([{ ...t2v, prompt: 'x'.repeat(20) }]), slotDe(ID.KLING_MODEL))?.prompt === 'x'.repeat(20))
  checa('prompt com 6001 caracteres: recusado; 6000: aceito', SC(claimCom([{ ...t2v, prompt: 'y'.repeat(6001) }]), slotDe(ID.VEO_MODEL)) === null && Boolean(SC(claimCom([{ ...t2v, prompt: 'y'.repeat(6000) }]), slotDe(ID.VEO_MODEL))))
  checa('prompt não-string, payload array/null/string: recusados', SC(claimCom([{ ...t2v, prompt: 42 }]), slotDe(ID.VEO_MODEL)) === null && SC(claimCom([[t2v]]), slotDe(ID.VEO_MODEL)) === null && SC(claimCom([null]), slotDe(ID.VEO_MODEL)) === null && SC(claimCom(['texto']), slotDe(ID.VEO_MODEL)) === null)
  checa('claim sem scene_fal_inputs (os claims clássicos de hoje) ou índice fora: recusado', SC({ response: {} }, slotDe(ID.SEEDANCE_MODEL)) === null && SC({ response: null }, slotDe(ID.SEEDANCE_MODEL)) === null && SC(claimCom([t2v]), slotDe(ID.SEEDANCE_MODEL, 3)) === null)
}

console.log('== (c) POST real da rota: loader offline, banco sintético, HMAC real ==')
function fixture(options = {}) {
  const secret = 'offline-signing-fixture', userId = 'fixture-owner', generationId = 'classic-generation-2809'
  const events = [], posts = [], openaiPosts = [], openaiOpts = [], timers = []
  let birth, releaseFailures = options.releaseFailures ?? 0, retargetFailures = options.retargetFailures ?? 0
  const field = (row, key) => key.split(/->>?/).reduce((value, part) => value?.[part], row)
  const db = { from(table) {
    if (!['events', 'videos', 'credit_debits'].includes(table)) throw Error('Unexpected table ' + table)
    let action = 'select', value, single = false, limit, order
    const predicates = [], filters = []
    const query = {
      select() { return query },
      eq(key, expected) { filters.push([key, expected]); predicates.push((row) => field(row, key) === expected); return query },
      is(key, expected) { predicates.push((row) => (field(row, key) ?? null) === expected); return query },
      gte(key, expected) { predicates.push((row) => field(row, key) >= expected); return query },
      in(key, expected) { predicates.push((row) => expected.includes(field(row, key))); return query },
      limit(count) { limit = count; return query },
      order(key, { ascending }) { order = { key, ascending }; return query },
      maybeSingle() { single = true; return query },
      insert(row) { action = 'insert'; value = row; return query },
      update(row) { action = 'update'; value = row; return query },
      delete() { action = 'delete'; return query },
      then(resolve, reject) { return Promise.resolve().then(async () => {
        if (table !== 'events' && action !== 'select') throw Error('Forbidden write ' + table)
        let rows = table === 'events' ? events.filter((row) => predicates.every((test) => test(row))) : []
        // KINEO-CENA-CLASSICA-2026-09-28 — falhas injetáveis: a linha do mutex (compose_submission_claim) que não sai, o
        // retarget do claim de nascimento que não grava, o registro da tentativa que não entra, a anotação da fase.
        const nome = filters.find(([k]) => k === 'name')?.[1] ?? value?.name
        if (action === 'delete' && nome === 'compose_submission_claim' && releaseFailures > 0) { releaseFailures--; return { data: null, error: { message: 'injected delete failure' } } }
        if (action === 'update' && rows.includes(birth) && retargetFailures > 0) { retargetFailures--; return { data: null, error: { message: 'injected update failure' } } }
        if (action === 'update' && nome === 'compose_submission_claim' && options.markerFails) return { data: null, error: { message: 'injected marker failure' } }
        if (action === 'insert') {
          if (value.name === 'classic_scene_retry_attempt' && options.attemptInsertFails) return { data: null, error: { code: 'XX000' } }
          if (value.id && events.some((row) => row.id === value.id)) return { data: null, error: { code: '23505' } }
          events.push(clone({ ...value, created_at: new Date().toISOString() }))
          return { data: null, error: null }
        }
        if (action === 'update') for (const row of rows) Object.assign(row, clone(value))
        if (action === 'delete') for (const row of rows) events.splice(events.indexOf(row), 1)
        if (order) rows = [...rows].sort((a, b) => String(a[order.key]).localeCompare(String(b[order.key])) * (order.ascending ? 1 : -1))
        if (limit) rows = rows.slice(0, limit)
        return { data: clone(single ? rows[0] ?? null : rows), error: null }
      }).then(resolve, reject) },
    }
    return query
  } }
  const load = createOfflineLoader({
    env: { NEXT_PUBLIC_SUPABASE_URL: 'https://fixture.invalid', SUPABASE_SERVICE_ROLE_KEY: secret, FAL_KEY: 'synthetic-key' },
    mocks: {
      'next/server': { NextResponse: { json: (body, init = {}) => ({ body, status: init.status ?? 200 }) } },
      '@/lib/supabase/server': { createClient: () => ({ auth: { getUser: async () => ({ data: { user: { id: userId } } }) } }) },
      '@supabase/supabase-js': { createClient: () => db },
      '@/lib/credits/refund': { refundRenderCredits: () => { throw Error('Forbidden refund') } },
      '@/lib/hollywood/router': ROUTER,
      '@/lib/openai': { openai: { chat: { completions: { create: async (input, opts) => {
        openaiPosts.push(clone(input)); openaiOpts.push(clone(opts))
        return { choices: [{ message: { content: 'Vertical 9:16 documentary shot of calm basalt columns at dusk, gentle push-in.' } }] }
      } } } } },
    },
    globals: {
      // Espera curta (o 429 da fal) roda na hora; o prazo de 25 s do POST clássico só dispara quando o caso pede
      // (options.deadlineFires) — e então num macrotask real, depois que o fetch pendurado já ficou para trás.
      setTimeout: (fn, ms = 0) => { timers.push(ms); if (ms < 5_000) fn(); else if (options.deadlineFires) globalThis.setTimeout(fn, 0); return timers.length },
      clearTimeout() {},
      fetch: async (url, init) => {
        posts.push({ url, body: JSON.parse(init.body) })
        const outcome = (options.fal ?? [200])[posts.length - 1] ?? 200
        if (outcome === 'hang') return new Promise(() => {})
        if (outcome === 'transport') throw Error('socket hang up')
        const ok = typeof outcome === 'number' && outcome >= 200 && outcome < 300
        const status = outcome === 'noid' ? 200 : outcome
        return { ok: ok || outcome === 'noid', status, headers: { get: () => '0' },
          text: async () => outcome === 'noid' ? '{}' : JSON.stringify(ok ? { request_id: `new-request-id${posts.length > 1 ? '-' + posts.length : ''}` } : { detail: 'provider said no' }) }
      },
    },
  })
  const claims = load('@/lib/cinematic/claim')
  const model = options.model
  const quality = options.quality ?? 'cinematic_ai'
  const birthId = claims.cinematicClaimId(userId, generationId)
  const response = {
    generationId, quality, fal_request_ids: ['old-request-id', 'ready-request-id'], fal_models: [model, model],
    ...(options.response ?? {}),
    terminal_failed_jobs: [{ requestId: 'old-request-id', model }], submission_uncertain: false,
  }
  birth = { id: birthId, name: claims.CINEMATIC_CLAIM_EVENT, path: claims.CINEMATIC_CLAIM_PATH, user_id: userId,
    session_id: generationId, created_at: new Date(Date.now() - 10000).toISOString(),
    metadata: { generation_id: generationId, status: 'settled', fingerprint: 'a'.repeat(64), credit_cost: 25, quality, engine: model,
      fal_request_ids: response.fal_request_ids, fal_models: response.fal_models, authorized_completed_urls: [null, 'https://fixture.invalid/ready.mp4'],
      response, response_hash: '', resolution_reason: 'provider_submitted', resolution_reference: `cinematic-${birthId}` } }
  const m = birth.metadata
  m.response_hash = claims.cinematicValueHash(m.response)
  m.authority = claims.signCinematicClaim(secret, { claimId: birthId, userId, generationId, status: m.status, fingerprint: m.fingerprint,
    creditCost: m.credit_cost, quality: m.quality, engine: m.engine, falRequestIds: m.fal_request_ids, falModels: m.fal_models,
    authorizedCompletedUrls: m.authorized_completed_urls, responseHash: m.response_hash, resolutionReason: m.resolution_reason, resolutionReference: m.resolution_reference })
  events.push(birth)
  const route = load(RETRY_PATH)
  const body = { generationId, sceneIndex: 0, oldRequestId: 'old-request-id', model, sanitize: false, ...(options.body ?? {}) }
  const composeClaims = load('@/lib/composeClaim')
  const mutexId = composeClaims.composeClaimId(userId, generationId)
  return {
    events, posts, openaiPosts, openaiOpts, timers, claims, db, secret, userId, generationId, load, mutexId,
    post: async (override) => clone(await route.POST({ json: async () => ({ ...body, ...override }) })),
    retried: () => events.filter((e) => e.name === 'hollywood_scene_retried'),
    // KINEO-CENA-CLASSICA-2026-09-28 — o que a revisão adversarial olhou: a linha do mutex, o hold assinado, o registro
    // da tentativa e o evento do job órfão.
    mutex: () => events.find((e) => e.id === mutexId) ?? null,
    hold: () => load('@/lib/cinematic/sceneRetry').readVerifiedSceneRetryHold({ db, secret, userId, generationId }),
    tentativas: () => events.filter((e) => e.name === 'classic_scene_retry_attempt'),
    orfaos: () => events.filter((e) => e.name === 'classic_scene_retry_unconfirmed'),
    birthNow: async () => (await claims.loadVerifiedCinematicClaim({ db, secret, userId, generationId })).claim,
  }
}
const assinado = { image_url: 'https://v3.fal.media/files/still-cena-1.png', prompt: PROMPT + 'Faceless, no people.', aspect_ratio: '9:16', resolution: '720p', duration: '8', generate_audio: false, seed: 4242 }
const assinadoVeo = { prompt: PROMPT + 'Aerial.', aspect_ratio: '9:16', duration: '8s', resolution: '1080p', generate_audio: false, safety_tolerance: '5', negative_prompt: 'people, faces, text', seed: 4242 }
{
  const f = fixture({ model: ID.SEEDANCE_I2V_MODEL, response: { scene_prompts: [assinado.prompt, 'Ready scene prompt already delivered fine.'], scene_fal_inputs: [assinado, null] } })
  const r = await f.post({ prompt: 'Forged prompt from the browser that must not reach fal.', anchorUrl: 'https://attacker.invalid/p.png', seconds: 15 })
  checa(`1ª rodada Seedance i2v: 200 com request novo (status ${r.status})`, r.status === 200 && r.body.requestId === 'new-request-id')
  checa('1ª rodada: UM POST ao fal, no endpoint do slot, com o payload ASSINADO byte a byte (seed, still, duração, quadro)', f.posts.length === 1 && f.posts[0].url.includes(ID.SEEDANCE_I2V_MODEL) && JSON.stringify(f.posts[0].body) === JSON.stringify(assinado))
  checa('1ª rodada: nada do navegador vaza (prompt/âncora/segundos forjados) e nenhuma chamada à OpenAI', !JSON.stringify(f.posts).includes('attacker.invalid') && !JSON.stringify(f.posts).includes('Forged') && f.openaiPosts.length === 0)
  const ev = f.retried()
  checa('evento hollywood_scene_retried com family classic, modelo, sanitize false e session_id = geração (relógio da cena presa reinicia)', ev.length === 1 && ev[0].metadata.family === 'classic' && ev[0].metadata.model === ID.SEEDANCE_I2V_MODEL && ev[0].metadata.sanitize === false && ev[0].session_id === f.generationId)
  const v = await f.claims.loadVerifiedCinematicClaim(f)
  checa('claim retargetado passa no HMAC real e aponta para o request novo', v.ok && v.claim.falRequestIds[0] === 'new-request-id')
}
{
  const f = fixture({ model: ID.VEO_MODEL, quality: 'cinematic_veo', response: { scene_prompts: [assinadoVeo.prompt, 'Ready scene prompt already delivered fine.'], scene_fal_inputs: [assinadoVeo, null] } })
  const r = await f.post({ sanitize: true })
  checa('2ª rodada Veo t2v (sanitize): 200', r.status === 200)
  checa('2ª rodada: a OpenAI recebe o prompt ASSINADO do payload clássico', f.openaiPosts.length === 1 && f.openaiPosts[0].messages[1].content === assinadoVeo.prompt)
  const { prompt: pPost, ...restoPost } = f.posts[0]?.body ?? {}
  const { prompt: _p, ...restoAss } = assinadoVeo
  checa('2ª rodada: só o prompt muda (suavizado); negative_prompt, safety_tolerance, seed, 1080p e duração ficam', f.posts.length === 1 && pPost === 'Vertical 9:16 documentary shot of calm basalt columns at dusk, gentle push-in.' && JSON.stringify(restoPost) === JSON.stringify(restoAss))
  checa('evento: family classic e sanitize true', f.retried()[0]?.metadata.family === 'classic' && f.retried()[0]?.metadata.sanitize === true)
}
{
  const f = fixture({ model: ID.SEEDANCE_MODEL, response: {} })
  const r = await f.post()
  checa('claim clássico de HOJE (sem scene_fal_inputs): 409, zero POST, zero OpenAI, zero evento — inerte até a rota de geração gravar o payload', r.status === 409 && f.posts.length === 0 && f.openaiPosts.length === 0 && f.retried().length === 0)
}
{
  const f = fixture({ model: ID.KLING_MODEL, quality: 'cinematic_kling', response: { scene_prompts: [assinado.prompt, 'x'.repeat(30)], scene_fal_inputs: [assinado, null] } })
  const r = await f.post()
  checa('slot t2v (Kling 2.5) com payload de i2v assinado: 409 sem gasto (payload de outro modelo nunca é reenviado)', r.status === 409 && f.posts.length === 0)
}
{
  const f = fixture({ model: 'fal-ai/sora-2/text-to-video', response: { scene_fal_inputs: [assinadoVeo, null] } })
  const r = await f.post()
  checa('modelo fora da lista (Sora): 400 antes de qualquer leitura/gasto', r.status === 400 && f.posts.length === 0)
}
{
  const f = fixture({ model: 'minimax/h3/text-to-video', quality: 'cinematic_h3', response: { scene_prompts: ['The exact signed scene prompt with sufficient description.', 'x'.repeat(30)], scene_seconds: [8, 10], scene_anchor_urls: [null, null] } })
  const r = await f.post()
  checa('hollywood (H3 t2v) intacto: 200, payload construído do jeito de sempre (duration 8, 768P), evento family hollywood', r.status === 200 && f.posts[0]?.body.duration === 8 && f.posts[0]?.body.resolution === '768P' && f.retried()[0]?.metadata.family === 'hollywood')
}

console.log('== (c2) revisão adversarial 27/09: a retomada CLÁSSICA nunca prende o filme ==')
// O caso (POST real, claim Seedance i2v assinado, 1 de 2 cenas pronta): a fal respondeu 503 na retomada → 422
// scene_retry_unresolved e o mutex do compose preso em 'ambiguous'. Daí: compose 422 "Contact support" a cada tentativa,
// cron de resgate lendo "a pessoa compôs sozinha", refund-sweep lendo "ambíguo" — filme nunca entregue e 25 cr presos.
// Transporte, resposta sem id, retarget/liberação que falham e lambda morta davam o mesmo. Aqui roda de verdade: o POST da
// rota, a aquisição do compose (claimGenerationSubmission, extraída da rota), o ramo do hold do compose (fatia real), a
// régua da lib e a condição do cron (fatia real).
const composeSrc = rd('app/api/compose/route.ts')
const cronSrc = rd('app/api/cron/finish-stranded-renders/route.ts')
const fixClassica = (extra = {}) => fixture({ model: ID.SEEDANCE_I2V_MODEL, response: { scene_prompts: [assinado.prompt, 'Ready scene prompt already delivered fine.'], scene_fal_inputs: [assinado, null] }, ...extra })
const fixH3 = (extra = {}) => fixture({ model: 'minimax/h3/text-to-video', quality: 'cinematic_h3', response: { scene_prompts: ['The exact signed scene prompt with sufficient description.', 'x'.repeat(30)], scene_seconds: [8, 10], scene_anchor_urls: [null, null] }, ...extra })
// o ramo do hold do compose, executado (fatia real de responseForClaimRow)
const ramoHold = fatia(composeSrc, '        if (metadata.scene_retry) {', '          return unavailableClaimResponse()\n        }\n')
checa('fatia do ramo do hold no compose existe e consulta a régua clássica ANTES do 409/422 de sempre', Boolean(ramoHold) && ramoHold.indexOf('classicSceneRetryHoldResolvable(metadata.scene_retry, hold.phase, elapsed)') > 0 && ramoHold.indexOf('classicSceneRetryHoldResolvable(') < ramoHold.indexOf("hold.phase === 'submitting' && elapsed >= 0 && elapsed < 120_000"))
const montaRamo = (src, relogio) => roda(`export async function ramo(ctx: any) {\n  const { metadata, composeAdmin, serviceRoleKey, authenticatedUserId, generationId, claimId, readVerifiedSceneRetryHold, releaseSceneRetryMutex, classicSceneRetryHoldResolvable, writeServerEvent, NextResponse, unavailableClaimResponse } = ctx\n  if (!metadata.render_id) {\n${src}\n  }\n  return { status: 0, body: 'seguiu' }\n}`, relogio ? { Date: relogio } : {}).ramo
const relogioMais = (ms) => class extends Date { constructor(...a) { super(...(a.length ? a : [Date.now() + ms])) } static now() { return Date.now() + ms } }
// compose de verdade: a aquisição do mutex (mesma receita de test-scene-retry-mutex) → no choque, o ramo do hold real
const astCompose = ts.createSourceFile('route.ts', composeSrc, ts.ScriptTarget.Latest, true)
let fnAquisicao
;(function visita(n) { if (ts.isFunctionDeclaration(n) && n.name?.text === 'claimGenerationSubmission') fnAquisicao = n; ts.forEachChild(n, visita) })(astCompose)
checa('compose: claimGenerationSubmission encontrada na rota', Boolean(fnAquisicao))
const compoe = async (f, { ramo = ramoHold, relogio } = {}) => {
  const exp = {}, eventos = []
  const sceneRetry = f.load('@/lib/cinematic/sceneRetry'), cc = f.load('@/lib/composeClaim')
  const responseForClaimRow = async (row) => {
    const out = await montaRamo(ramo, relogio)({ metadata: row.metadata, composeAdmin: f.db, serviceRoleKey: f.secret, authenticatedUserId: f.userId, generationId: f.generationId, claimId: f.mutexId,
      readVerifiedSceneRetryHold: sceneRetry.readVerifiedSceneRetryHold, releaseSceneRetryMutex: sceneRetry.releaseSceneRetryMutex, classicSceneRetryHoldResolvable: LIB.classicSceneRetryHoldResolvable,
      writeServerEvent: async (e) => { eventos.push(clone(e)); return true }, NextResponse: { json: (body, init = {}) => ({ body, status: init.status ?? 200 }) }, unavailableClaimResponse: () => ({ status: 503, body: 'unavailable' }) })
    return clone(out)
  }
  vm.runInNewContext(ts.transpileModule(`export ${fnAquisicao.getText(astCompose)}`, { compilerOptions: { module: 1, target: 9 } }).outputText, {
    exports: exp, composeAdmin: f.db, authenticatedUserId: f.userId, generationId: f.generationId, claimId: f.mutexId, ...cc, serviceRoleKey: f.secret,
    quality: 'cinematic_ai', duration: 35, body: {}, voiceoverScript: '', episodeNarrationForMemory: () => '', ownsSubmissionClaim: false, submissionClaimIsCreditHold: false,
    console: { error() {} }, unavailableClaimResponse: () => ({ status: 503, body: 'unavailable' }), submissionOwner: 'compose-fixture-owner', submissionAuthority: '', cinematicBirthClaim: null, responseForClaimRow })
  const r = await exp.claimGenerationSubmission(25, false)
  return { kind: r.kind, status: r.response?.status ?? null, body: r.response?.body ?? null, eventos }
}
const soltaComposeDeVolta = (f) => { const i = f.events.findIndex((e) => e.id === f.mutexId && !e.metadata?.scene_retry); if (i >= 0) f.events.splice(i, 1) }
if (ramoHold && fnAquisicao) {
  for (const fal of [[503], [408], ['transport'], ['noid']]) {
    const f = fixClassica({ fal })
    const r = await f.post()
    const nome = JSON.stringify(fal)
    checa(`${nome} na retomada clássica: 502 "a cena segue falhada" (não o 422 scene_retry_unresolved), UM POST`, r.status === 502 && r.body.sceneSkipped === true && r.body.reason !== 'scene_retry_unresolved' && f.posts.length === 1)
    checa(`${nome}: mutex do compose SOLTO e nenhum hold assinado sobra`, f.mutex() === null && (await f.hold()) === null)
    const b = await f.birthNow()
    checa(`${nome}: o claim segue com a cena falhada (request antigo, terminal) — o compose já pode montar com a pronta`, b?.falRequestIds[0] === 'old-request-id' && f.claims.cinematicJobsAreTerminal(b))
    const c = await compoe(f)
    checa(`${nome}: o compose REAL adquire o mutex (antes: choque com o hold → 422 "Contact support")`, c.kind === 'acquired')
    soltaComposeDeVolta(f)
    checa(`${nome}: o registro da tentativa FICA e o job possível vira evento classic_scene_retry_unconfirmed (phase ambiguous)`, f.tentativas().length === 1 && f.orfaos().length === 1 && f.orfaos()[0].metadata.phase === 'ambiguous' && f.orfaos()[0].session_id === f.generationId)
    const r2 = await f.post({ sanitize: true })
    checa(`${nome}: a 2ª rodada do cliente na MESMA cena falhada é recusada pelo registro (409 "not authorized") sem OpenAI e sem 2º POST pago`, r2.status === 409 && r2.body.error === 'This scene is not authorized for retry.' && f.posts.length === 1 && f.openaiPosts.length === 0 && f.mutex() === null)
  }
  {
    // prazo: o POST clássico pendurado não segura a lambda até a morte (o marcador 'submitting' ficaria para trás)
    const f = fixClassica({ fal: ['hang'], deadlineFires: true })
    const r = await Promise.race([f.post(), new Promise((res) => setTimeout(() => res('PENDUROU'), 3000))])
    checa('POST clássico pendurado: o prazo de 25 s dispara, 502, mutex solto, evento ambíguo (a rota não morre segurando o mutex)', r !== 'PENDUROU' && r.status === 502 && f.mutex() === null && f.orfaos()[0]?.metadata.phase === 'ambiguous' && f.timers.includes(25_000))
  }
  for (const code of [422, 400]) {
    const f = fixClassica({ fal: [code, 200] })
    const r = await f.post()
    checa(`recusa EXPLÍCITA ${code}: 502 "não enviada", mutex solto, registro DEVOLVIDO (nenhum job existe) e nenhum evento de órfão`, r.status === 502 && r.body.sceneSkipped !== true && f.mutex() === null && f.tentativas().length === 0 && f.orfaos().length === 0)
    const r2 = await f.post({ sanitize: true })
    checa(`recusa ${code} → a 2ª rodada (suavizada) SEGUE valendo: 200, prompt suavizado, 2 POSTs no total`, r2.status === 200 && f.posts.length === 2 && f.posts[1].body.prompt !== assinado.prompt && f.openaiPosts.length === 1)
  }
  {
    const f = fixClassica({ fal: [503], releaseFailures: 1 })
    const r = await f.post()
    checa('liberação que falha UMA vez: a 2ª libera — 502, sem hold', r.status === 502 && f.mutex() === null)
  }
  {
    const f = fixClassica({ fal: [503], releaseFailures: 2 })
    const r = await f.post()
    const h = await f.hold()
    checa('liberação que falha DUAS vezes: 422 e o hold fica anotado (ambiguous) — o resto é do compose', r.status === 422 && h?.phase === 'ambiguous' && Boolean(f.mutex()))
    const c1 = await compoe(f)
    checa('compose REAL no hold clássico em fase final: desfaz o hold (409 pendente, evento classic_scene_retry_hold_cleared), linha do mutex apagada', c1.kind === 'existing' && c1.status === 409 && c1.body.pending === true && f.mutex() === null && c1.eventos[0]?.name === 'classic_scene_retry_hold_cleared' && c1.eventos[0]?.metadata.phase === 'ambiguous')
    const c2 = await compoe(f)
    checa('a chamada seguinte do compose adquire e monta (antes: 422 "Contact support" para sempre)', c2.kind === 'acquired')
  }
  {
    // lambda morta (ou liberação E anotação falhando): sobra o marcador 'submitting' original
    const f = fixClassica({ fal: [503], releaseFailures: 2, markerFails: true })
    await f.post()
    checa('liberação e anotação falhando: sobra o marcador submitting assinado', (await f.hold())?.phase === 'submitting')
    const cedo = await compoe(f, { relogio: relogioMais(60_000) })
    checa('compose com 60 s de marcador: 409 pendente SEM apagar (a retomada pode estar viva — maxDuration 60)', cedo.status === 409 && Boolean(f.mutex()) && cedo.eventos.length === 0)
    const tarde = await compoe(f, { relogio: relogioMais(121_000) })
    checa('compose com 121 s de marcador clássico: desfaz (lambda morta) e a chamada seguinte adquire', tarde.status === 409 && f.mutex() === null && tarde.eventos.length === 1 && (await compoe(f)).kind === 'acquired')
  }
  {
    const f = fixClassica({ fal: [200], retargetFailures: 1 })
    const r = await f.post()
    checa('retarget que falha UMA vez: o 2º (idempotente) grava — 200, claim no request novo, sem órfão', r.status === 200 && (await f.birthNow())?.falRequestIds[0] === 'new-request-id' && f.orfaos().length === 0 && f.mutex() === null)
  }
  {
    const f = fixClassica({ fal: [200], retargetFailures: 2 })
    const r = await f.post()
    const b = await f.birthNow()
    checa('retarget que falha DUAS vezes: 502, mutex solto, claim com a cena falhada, órfão retarget_failed com o request novo', r.status === 502 && f.mutex() === null && b?.falRequestIds[0] === 'old-request-id' && f.claims.cinematicJobsAreTerminal(b) && f.orfaos()[0]?.metadata.phase === 'retarget_failed' && f.orfaos()[0]?.metadata.new_request_id === 'new-request-id')
    checa('retarget_failed: a 2ª rodada não paga de novo (409, 1 POST)', (await f.post({ sanitize: true })).status === 409 && f.posts.length === 1)
  }
  {
    const f = fixClassica({ fal: [200], releaseFailures: 2 })
    const r = await f.post()
    checa('aceito e retargetado, liberação falha 2×: resposta de SUCESSO (o cliente acompanha a cena nova), hold release_unconfirmed', r.status === 200 && r.body.requestId === 'new-request-id' && (await f.hold())?.phase === 'release_unconfirmed' && f.retried().length === 1)
    const c = await compoe(f)
    checa('… e o compose REAL desfaz esse hold clássico (409) e adquire na seguinte', c.status === 409 && f.mutex() === null && (await compoe(f)).kind === 'acquired')
  }
  {
    const f = fixClassica({ attemptInsertFails: true })
    const r = await f.post()
    checa('registro da tentativa que não entra: nenhum POST pago, nenhuma OpenAI, mutex solto, 502', r.status === 502 && f.posts.length === 0 && f.openaiPosts.length === 0 && f.mutex() === null)
  }
  {
    const f = fixClassica({ fal: [200] })
    await f.post({ sanitize: true })
    checa('rodada suavizada: a OpenAI recebe prazo de 20 s SEM retentativa (antes: 20 s × 2 do cliente)', JSON.stringify(f.openaiOpts[0]) === JSON.stringify({ timeout: 20000, maxRetries: 0 }))
  }
  {
    // controle: hollywood continua segurando (a regra de lá não mudou)
    const f = fixH3({ fal: [503] })
    const r = await f.post()
    checa('controle hollywood (H3) com 503: 422 e hold ambiguous, como sempre', r.status === 422 && (await f.hold())?.phase === 'ambiguous')
    const c = await compoe(f, { relogio: relogioMais(3_600_000) })
    checa('controle hollywood: o compose NÃO desfaz o hold (422 "Contact support", linha intacta) nem 1 h depois', c.status === 422 && Boolean(f.mutex()) && c.eventos.length === 0)
    checa('controle hollywood: nenhum registro de tentativa clássica nem órfão clássico', f.tentativas().length === 0 && f.orfaos().length === 0)
  }
}
{
  const dur = Number((retry.match(/export const maxDuration = (\d+)/) || [])[1])
  const openaiMs = Number((retry.match(/const SANITIZE_TIMEOUT_MS = ([\d_]+)/) || [])[1]?.replace(/_/g, ''))
  const falMs = Number((retry.match(/const CLASSIC_SUBMIT_DEADLINE_MS = ([\d_]+)/) || [])[1]?.replace(/_/g, ''))
  checa(`orçamento da retomada: OpenAI ${openaiMs} ms + POST ${falMs} ms < maxDuration ${dur} s < janela do marcador ${LIB.SCENE_RETRY_SUBMIT_WINDOW_MS} ms`, openaiMs + falMs < dur * 1000 && dur * 1000 < LIB.SCENE_RETRY_SUBMIT_WINDOW_MS && LIB.SCENE_RETRY_SUBMIT_WINDOW_MS === 120_000)
  checa('a janela de 120 s é a mesma no compose e no /api/compose/active', composeSrc.includes("hold.phase === 'submitting' && elapsed >= 0 && elapsed < 120_000") && rd('app/api/compose/active/route.ts').includes("retry.phase === 'submitting' && elapsed >= 0 && elapsed < 120_000"))
}
console.log('== (c3) régua da lib e condição do cron (fatia real) ==')
{
  const R = LIB.classicSceneRetryHoldResolvable
  const mk = (model) => ({ version: 1, model, phase: 'x' })
  checa('régua: clássico em fase final = desfaz; submitting < 120 s = espera; ≥ 120 s = desfaz', R(mk(ID.VEO_MODEL), 'ambiguous', 5) && R(mk(ID.KLING_I2V_MODEL), 'release_unconfirmed', 0) && !R(mk(ID.SEEDANCE_MODEL), 'submitting', 119_999) && R(mk(ID.SEEDANCE_MODEL), 'submitting', 120_000) && R(mk(ID.SEEDANCE_MODEL), 'submitting', NaN))
  checa('régua: hollywood/S25/desconhecido/sem marcador NUNCA desfaz', [ROUTER.HOLLYWOOD_MODELS.support, ROUTER.KLING3_I2V_MODEL, ROUTER.H3_I2V_MODEL, ROUTER.OMNI_I2V_MODEL, ROUTER.S25_I2V_MODEL, 'unsupported'].every((m) => !R(mk(m), 'ambiguous', 999_999)) && !R(null, 'ambiguous', 999_999) && !R('texto', 'ambiguous', 999_999))
  const H = LIB.classicSceneRetryHoldRow
  checa('linha de hold clássico: pending + scene_retry clássico + sem render_id; render_id, hollywood ou compose comum não', H({ status: 'pending', scene_retry: mk(ID.VEO_I2V_MODEL) }) && !H({ status: 'pending', render_id: 'r-1', scene_retry: mk(ID.VEO_I2V_MODEL) }) && !H({ status: 'pending', scene_retry: mk(ROUTER.H3_I2V_MODEL) }) && !H({ status: 'pending', submission_owner: 'x' }) && !H({ status: 'done', scene_retry: mk(ID.VEO_MODEL) }) && !H(null))
  const cond = (cronSrc.match(/if \(\((ownCompose \?\? \[\]\)\.some\(\(row\) => [^\n]+)\) \{\n/) || [])[1]
  checa('cron: a condição "a pessoa compôs sozinha" existe e passa pela lib', Boolean(cond) && cond.includes('classicSceneRetryHoldRow('))
  if (cond) {
    const conta = roda(`export const conta = (ownCompose: any) => (${cond})`, { classicSceneRetryHoldRow: H }).conta
    checa('cron (fatia real): hold clássico sozinho NÃO conta como "compôs sozinha" — o cron segue para o compose, que desfaz o hold', conta([{ id: 'a', metadata: { status: 'pending', scene_retry: mk(ID.SEEDANCE_I2V_MODEL) } }]) === false)
    checa('cron (fatia real): compose de verdade (sem scene_retry), hold hollywood e metadata ausente CONTINUAM contando', conta([{ id: 'a', metadata: { status: 'pending', submission_owner: 'x' } }]) && conta([{ id: 'a', metadata: { status: 'pending', scene_retry: mk(ROUTER.H3_I2V_MODEL) } }]) && conta([{ id: 'a' }]) && !conta([]) && !conta(null))
  }
  checa('cron: o SELECT traz metadata (sem ela a lib veria toda linha como compose comum)', /\.select\('id, metadata'\)\n\s+\.eq\('name', 'compose_submission_claim'\)\n\s+\.eq\('session_id', genId\)/.test(cronSrc))
}
{
  // mutantes das fatias executadas acima (o de fonte da rota está no doc: rodados à mão e pegos)
  const mutRamo = ramoHold ? ramoHold.replace('if (classicSceneRetryHoldResolvable(metadata.scene_retry, hold.phase, elapsed)) {', 'if (false) {') : ramoHold
  if (mutRamo && mutRamo !== ramoHold && fnAquisicao) {
    const f = fixClassica({ fal: [503], releaseFailures: 2 })
    await f.post()
    const c = await compoe(f, { ramo: mutRamo })
    checa('mutante (compose sem a régua clássica) aplicou e é pego: 422 "Contact support" e o hold fica', c.status === 422 && Boolean(f.mutex()))
  } else checa('mutante do ramo do compose aplicou', false)
  const cond = (cronSrc.match(/if \(\((ownCompose \?\? \[\]\)\.some\(\(row\) => [^\n]+)\) \{\n/) || [])[1]
  const mutCond = cond ? cond.replace('!classicSceneRetryHoldRow(', 'true || !classicSceneRetryHoldRow(') : cond
  const contaMut = mutCond ? roda(`export const conta = (ownCompose: any) => (${mutCond})`, { classicSceneRetryHoldRow: LIB.classicSceneRetryHoldRow }).conta : null
  checa('mutante (cron conta o hold clássico como "compôs sozinha") aplicou e é pego', Boolean(contaMut) && mutCond !== cond && contaMut([{ id: 'a', metadata: { status: 'pending', scene_retry: { model: ID.SEEDANCE_I2V_MODEL } } }]) === true)
}

console.log('== (d) cliente: o portão abre com scene_prompts e o corpo leva o modelo do filme ==')
const gc = rd('app/(dashboard)/generate/GenerateClient.tsx')
const gate = fatia(gc, 'failedIdx.length > 0 &&\n            scenePromptsRef.current.length > 0 &&', '!cancelled', true)
const fill = ['falModelRef.current = typeof data.fal_model', 'falModelsRef.current = Array.isArray(data.fal_models)', 'scenePromptsRef.current = Array.isArray(data.scene_prompts)']
  .map((ini) => fatia(gc, ini, '\n', false))
const linhaModelo = fatia(gc, 'model: falModelsRef.current[fi] ?? ', '\n', false)
checa('fatias do cliente existem (portão, preenchimento dos refs, modelo no corpo)', Boolean(gate) && fill.every(Boolean) && Boolean(linhaModelo))
checa('o portão continua exigindo scene_prompts e no máximo 2 rodadas', gate && gate.includes('scenePromptsRef.current.length > 0') && gate.includes('hollyRetriedRef.current < 2'))
const cliente = (data, failedIdx) => {
  const src = `export function rodar(data: any, failedIdx: number[]) {
  const falModelRef = { current: '' }, falModelsRef = { current: [] as string[] }, scenePromptsRef = { current: [] as string[] }
  const hollyRetriedRef = { current: 0 }, cancelled = false, fi = failedIdx[0]
  ${fill.join('\n  ')}
  const abre = ${gate}
  const corpo = { ${linhaModelo} }
  return { abre, model: corpo.model }
}`
  return roda(src).rodar(data, failedIdx)
}
if (gate && fill.every(Boolean) && linhaModelo) {
  const classicaNova = { fal_model: ID.SEEDANCE_MODEL, fal_models: [ID.SEEDANCE_I2V_MODEL, ID.SEEDANCE_MODEL], scene_prompts: ['p'.repeat(40), 'q'.repeat(40)] }
  const classicaVelha = { fal_model: ID.SEEDANCE_MODEL, fal_models: [ID.SEEDANCE_I2V_MODEL, ID.SEEDANCE_MODEL] }
  const semModelos = { fal_model: ID.VEO_MODEL, scene_prompts: ['p'.repeat(40)] }
  checa('resposta clássica com scene_prompts: o portão ABRE e o modelo é o do slot (i2v da cena 1)', cliente(classicaNova, [0]).abre === true && cliente(classicaNova, [0]).model === ID.SEEDANCE_I2V_MODEL && cliente(classicaNova, [1]).model === ID.SEEDANCE_MODEL)
  checa('resposta clássica sem scene_prompts (antes da rota de geração): o portão fica FECHADO — nada muda até lá', cliente(classicaVelha, [0]).abre === false)
  checa('resposta sem fal_models: o corpo leva o fal_model do filme (o servidor confere contra o claim)', cliente(semModelos, [0]).model === ID.VEO_MODEL)
  checa('sem fal_models e sem fal_model: undefined (a rota responde 400, como antes)', cliente({ scene_prompts: ['p'.repeat(40)] }, [0]).model === undefined)
  checa('sem cena falha: portão fechado', cliente(classicaNova, []).abre === false)
}

console.log('== (e) mutantes ==')
{
  const mut = fnSigned ? fnSigned.replace("!image.startsWith('https://')", 'false') : fnSigned
  checa('mutante (i2v aceita qualquer image_url) aplicou e é pego: http:// passaria', Boolean(mut) && mut !== fnSigned && montaSigned(mut)(claimCom([{ ...i2v, image_url: 'http://x.invalid/a.png' }]), slotDe(ID.KLING_I2V_MODEL)) !== null)
}
{
  const mut = blocoAllowed ? blocoAllowed.replace('for (const model of CLASSIC) ALLOWED.add(model)', '') : blocoAllowed
  checa('mutante (ALLOWED sem os clássicos) aplicou e é pego: Seedance voltaria ao 400', Boolean(mut) && mut !== blocoAllowed && !montaAllowed(mut).ALLOWED.has(ID.SEEDANCE_MODEL))
}

console.log(`\n${ok} ok · ${falhas.length} falhas`)
if (falhas.length) { for (const f of falhas) console.log(' ✗ ' + f); process.exit(1) }
