// KINEO-RETENTAR-CENA-1410 — guardião: a cena que a fal derruba com a aba FECHADA é refeita pelo cron (até 2 vezes), sem
// cobrar duas vezes, e o filme monta inteiro. [TRAVA 8.2 — vai do fundador 14/10]
// Caso que abriu a dívida: canário S25 de 01/09 (6 cenas aceitas, 3 morreram com 503 de capacidade, too_few 3/6, não montou).
// Este guardião EXECUTA, offline, o código REAL:
//   (a) lib/cinematic/sceneRetryPolicy.ts — classificação (5xx/429/408/capacidade = retentável; conteúdo, saldo e desconhecido
//       não) e o plano (teto 2 somando aba + cron, espera, cena pronta exigida, teto de idade, máximo por rodada);
//   (b) a rodada do cron: a coleta (collectFinishedClips) e o desvio novo (retentarCenasDoFilme) fatiados do arquivo real, o
//       ramo too_few real (estorno), contra uma fal falsa — chamando a retomada REAL (/api/retry-hollywood-scene) em modo
//       serviço, com o claim REAL (HMAC, retarget, falhas terminais) num banco sintético:
//         · 503 na cena 3, depois ok → filme monta com as 6, 1 POST novo, 0 estorno, 0 escrita de crédito;
//         · 503 na cena 3 três vezes (+ recusa de conteúdo na 4) → 2 retentativas e o caminho de sempre (too_few, 1 estorno);
//         · recusa de conteúdo → nunca reenviada (decisão gravada UMA vez);
//         · nenhuma cena pronta é reenviada; duas rodadas sobrepostas = 1 POST só (trava determinística);
//         · evento cinematic_scene_retry com cena, status HTTP e número da tentativa;
//         · result() falho SEM erro na fila não prova job morto → não reenvia; filme com 70+ min → não reenvia;
//   (c) modo serviço da retomada: fail-closed (segredo, uuid); hollywood ambíguo em modo serviço SOLTA o filme (502, sem
//       hold), e pela aba segue prendendo como sempre (422);
//   (d) a marca: desfeito (scripts/test-support/desfaz-retentar-cena-1410.mjs), cada arquivo é EXATAMENTE a base — o pai do
//       1º commit com a marca (nunca origin/main) —, a lib nova não move crédito, e a ordem no cron é retentar → too_few.
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import vm from 'node:vm'
import ts from 'typescript'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
import { semModeracao1410 } from './test-support/desfaz-moderacao-1410.mjs' // reancorado KINEO-MODERACAO-1410
import { semRetentarCena1410, MARCA_RETENTAR_CENA_1410, ARQUIVO_RETOMADA_1410, ARQUIVO_CRON_1410, ARQUIVO_LIB_NOVA_1410, FORMA_RETENTAR_CENA_1410 } from './test-support/desfaz-retentar-cena-1410.mjs'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(RAIZ)
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) ok++; else { falhas.push(n); console.log('  FALHOU: ' + n) } }
const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)))
const transpila = (src) => ts.transpileModule(src, { compilerOptions: { module: 1, target: 9 } }).outputText

const LIB = rd(ARQUIVO_LIB_NOVA_1410)
const CRON = rd(ARQUIVO_CRON_1410)
const RETOMADA = rd(ARQUIVO_RETOMADA_1410)
const ROUTER_SRC = rd('lib/hollywood/router.ts')
const constDe = (src, nome) => (src.match(new RegExp(`const ${nome} = '([^']+)'`)) || [])[1] ?? null

// ─── (a) a lib pura ─────────────────────────────────────────────────────────────────────────────────────────────────
console.log('== (a) lib/cinematic/sceneRetryPolicy.ts ==')
const P = (() => { const exp = {}; vm.runInNewContext(transpila(LIB), { exports: exp, Number, Math, Set, Array, Object, String, Date }); return exp })()
const cls = P.classificarFalhaDeCena
checa('503/500/502/504/429/408 → retentável', [503, 500, 502, 504, 429, 408].every((h) => cls({ http: h, message: null }) === 'retentavel'))
checa('sem HTTP, "Service at capacity" / "Request timed out" / "Internal server error" → retentável', ['Service at capacity, please retry', 'Request timed out', 'Internal server error'].every((m) => cls({ http: null, message: m }) === 'retentavel'))
checa('422 "content policy" → conteúdo; 500 + "content policy violation" → conteúdo (conteúdo vence o 5xx)', cls({ http: 422, message: 'Content policy' }) === 'conteudo' && cls({ http: 500, message: 'content policy violation' }) === 'conteudo')
checa('422/400 sem texto → conteúdo (payload/moderação: reenviar igual não muda nada)', cls({ http: 422 }) === 'conteudo' && cls({ http: 400, message: '' }) === 'conteudo')
checa('"Exhausted balance" e 401/402/403 → saldo (nunca retenta)', cls({ http: 500, message: 'User is locked. Reason: Exhausted balance' }) === 'saldo' && [401, 402, 403].every((h) => cls({ http: h }) === 'saldo'))
checa('sem HTTP e sem texto reconhecível → desconhecida (não retenta)', cls({ http: null, message: 'status FAILED' }) === 'desconhecida' && cls({ http: null }) === 'desconhecida')
checa('teto 2, esperas [60 s, 5 min], idade 70 min, 4 por rodada', P.RETENTAR_CENA_MAX === 2 && JSON.stringify(P.RETENTAR_CENA_ESPERA_MS) === '[60000,300000]' && P.RETENTAR_CENA_IDADE_MAX_MIN === 70 && P.RETENTAR_CENA_MAX_POR_RODADA === 4 && P.CENA_RETRY_EVENT === 'cinematic_scene_retry')
{
  const T0 = 1_800_000_000_000
  const f = (index, http = 503, message = 'capacity') => ({ index, requestId: 'r' + index, model: 'm', http, message })
  const plan = (o) => P.planejarRetentativas({ falhas: [f(2)], anteriores: [], prontas: 5, agora: T0 + 10 * 60_000, inicioMs: T0, idadeMin: 10, ...o }).map((p) => `${p.decisao}:${p.tentativa}`)
  checa('1ª: retentar (tentativa 1)', plan({})[0] === 'retentar:1')
  checa('a aba já usou 1: 2ª só depois de 5 min da anterior', plan({ anteriores: [{ index: 2, at: T0 + 8 * 60_000 }] })[0] === 'esperar:2' && plan({ anteriores: [{ index: 2, at: T0 + 4 * 60_000 }] })[0] === 'retentar:2')
  checa('2 usadas (aba + cron somadas) → esgotada', plan({ anteriores: [{ index: 2, at: T0 }, { index: 2, at: T0 + 60_000 }] })[0] === 'esgotada:3')
  checa('retentativa de OUTRA cena não gasta a cota desta', plan({ anteriores: [{ index: 1, at: T0 }, { index: 1, at: T0 }] })[0] === 'retentar:1')
  checa('0 cenas prontas → sem_cena_pronta (o estorno de sempre)', plan({ prontas: 0 })[0] === 'sem_cena_pronta:1')
  checa('70 min → tarde_demais (a varredura de 100 min não pode atropelar a cena nova)', plan({ idadeMin: 70 })[0] === 'tarde_demais:1' && plan({ idadeMin: 69.9 })[0] === 'retentar:1')
  checa('conteúdo → nao_retentavel', P.planejarRetentativas({ falhas: [f(2, 422, 'content policy')], anteriores: [], prontas: 5, agora: T0 + 600_000, inicioMs: T0, idadeMin: 10 })[0].decisao === 'nao_retentavel')
  checa('mesma cena duas vezes na lista → um plano só', P.planejarRetentativas({ falhas: [f(2), f(2)], anteriores: [], prontas: 5, agora: T0 + 600_000, inicioMs: T0, idadeMin: 10 }).length === 1)
  checa('claim com 30 s de vida → esperar (espera de 60 s antes da 1ª)', plan({ agora: T0 + 30_000 })[0] === 'esperar:1')
  // executar: 6 cenas falhadas → 4 nesta rodada, 2 na próxima, e o cron SEGURA
  const marcas = [], posts = []
  const r = await P.executarRetentativas({ falhas: [0, 1, 2, 3, 4, 5].map((i) => f(i)), anteriores: [], prontas: 1, agora: T0 + 600_000, inicioMs: T0, idadeMin: 10,
    deps: { marcar: async (t, p) => { marcas.push(t + p.falha.index); return 'nova' }, provar: async () => true, reenviar: async (x) => { posts.push(x.index); return { status: 200, requestId: 'n' + x.index } }, registrar: async () => {} } })
  checa('6 falhadas: 4 POSTs nesta rodada, 2 adiadas, segurar=true', posts.length === 4 && r.reenviadas === 4 && r.segurar === true && r.resultados.filter((x) => x.desfecho === 'proxima_rodada').length === 2)
  const r2 = await P.executarRetentativas({ falhas: [f(2)], anteriores: [], prontas: 3, agora: T0 + 600_000, inicioMs: T0, idadeMin: 10,
    deps: { marcar: async () => 'nova', provar: async () => false, reenviar: async () => { throw Error('não deveria postar') }, registrar: async () => {} } })
  checa('prova no claim falhou → nenhum POST, segurar=false (cai no caminho de sempre)', r2.reenviadas === 0 && r2.segurar === false)
  for (const marca of ['repetida', 'erro']) {
    let postou = 0
    const r3 = await P.executarRetentativas({ falhas: [f(2)], anteriores: [], prontas: 3, agora: T0 + 600_000, inicioMs: T0, idadeMin: 10,
      deps: { marcar: async (t) => (t === 'tentativa' ? marca : 'nova'), provar: async () => true, reenviar: async () => { postou++; return { status: 200, requestId: 'n' } }, registrar: async () => {} } })
    checa(`trava da tentativa '${marca}' → nenhum POST (desfecho ${r3.resultados[0]?.desfecho})`, postou === 0 && r3.reenviadas === 0 && r3.resultados[0]?.desfecho === (marca === 'repetida' ? 'ja_tentada' : 'trava_indisponivel'))
  }
}

// ─── (b) a rodada do cron contra uma fal falsa, com a retomada e o claim REAIS ────────────────────────────────────────
console.log('== (b) rodada do cron: coleta + retentativa + too_few, retomada real em modo serviço ==')
const ROUTER = {
  HOLLYWOOD_MODELS: { dialogue: 'fal-ai/kling-video/v3/pro/text-to-video', cinematic: 'fal-ai/kling-video/v3/pro/text-to-video', support: 'fal-ai/kling-video/v3/pro/text-to-video' },
  KLING3_I2V_MODEL: constDe(ROUTER_SRC, 'KLING3_I2V_MODEL'), H3_I2V_MODEL: constDe(ROUTER_SRC, 'H3_I2V_MODEL'), OMNI_I2V_MODEL: constDe(ROUTER_SRC, 'OMNI_I2V_MODEL'),
  S25_I2V_MODEL: constDe(ROUTER_SRC, 'S25_I2V_MODEL'), S25_T2V_MODEL: constDe(ROUTER_SRC, 'S25_T2V_MODEL'),
  H3_MODELS: { dialogue: 'minimax/h3/text-to-video', cinematic: 'minimax/h3/text-to-video', support: 'minimax/h3/text-to-video' }, H3_RESOLUTION: '768P', S25_RESOLUTION: '480p',
  H3MAX_I2V_MODEL: constDe(ROUTER_SRC, 'H3MAX_I2V_MODEL'), H3MAX_RESOLUTION: '768P', H3_PROMPT_EXPANSION: 'disabled',
  H3MAX_MODELS: { dialogue: 'minimax/h3-max/text-to-video', cinematic: 'minimax/h3-max/text-to-video', support: 'minimax/h3-max/text-to-video' },
}
const S25 = ROUTER.S25_T2V_MODEL
checa('router: id do Seedance 2.5 t2v lido do arquivo real', S25 === 'fal-ai/seedance-2.5/text-to-video')
const SEEDANCE15 = 'fal-ai/bytedance/seedance/v1.5/pro/text-to-video'
const CRON_SECRET = 'cron-fixture-secret'
const USER = '11111111-2222-3333-4444-555555555555'

// Fatias REAIS do cron: a coleta + o desvio novo (até serviceHeaders, inclusive), e o miolo do laço até `const clips`.
const iniColeta = CRON.indexOf('const STALE_SCENE_MINUTES = 120')
const fimColeta = CRON.indexOf('function rescueText(')
const FATIA_COLETA = iniColeta > 0 && fimColeta > iniColeta ? CRON.slice(iniColeta, fimColeta) : null
const iniLaco = CRON.indexOf('    const requestIds = Array.isArray(md.fal_request_ids) ? (md.fal_request_ids as Array<string | null>) : []')
const fimLaco = CRON.indexOf('    const clips = collected.clips', iniLaco)
const FATIA_LACO = iniLaco > 0 && fimLaco > iniLaco ? CRON.slice(iniLaco, fimLaco) : null
checa('fatias do cron existem (coleta+desvio; laço até const clips)', Boolean(FATIA_COLETA && FATIA_LACO && FATIA_COLETA.includes('async function retentarCenasDoFilme(') && FATIA_LACO.includes("if (collected.state === 'too_few') {")))

function cenario(opcoes) {
  const relogio = { agora: 1_900_000_000_000 }
  const secret = 'offline-signing-fixture', userId = USER, generationId = 'retentar-cena-1410-' + opcoes.nome
  const model = opcoes.model ?? S25
  const n = opcoes.cenas
  const events = [], postsFal = [], escritasDeCredito = [], estornos = [], timers = []
  let birth
  const field = (row, key) => key.split(/->>?/).reduce((value, part) => value?.[part], row)
  const db = { from(table) {
    if (!['events', 'credit_debits'].includes(table)) throw Error('Unexpected table ' + table)
    let action = 'select', value, single = false, limit, order
    const predicates = []
    const query = {
      select() { return query },
      eq(key, expected) { predicates.push((row) => field(row, key) === expected); return query },
      is(key, expected) { predicates.push((row) => (field(row, key) ?? null) === expected); return query },
      gte(key, expected) { predicates.push((row) => field(row, key) >= expected); return query },
      in(key, expected) { predicates.push((row) => expected.includes(field(row, key))); return query },
      limit(c) { limit = c; return query },
      order(key, { ascending }) { order = { key, ascending }; return query },
      maybeSingle() { single = true; return query },
      insert(row) { action = 'insert'; value = row; return query },
      update(row) { action = 'update'; value = row; return query },
      delete() { action = 'delete'; return query },
      then(resolve, reject) { return Promise.resolve().then(async () => {
        if (table !== 'events') { if (action !== 'select') escritasDeCredito.push(action); return { data: single ? null : [], error: null } }
        let rows = events.filter((row) => predicates.every((t) => t(row)))
        if (action === 'insert') {
          for (const v of Array.isArray(value) ? value : [value]) {
            if (v.id && events.some((row) => row.id === v.id)) return { data: null, error: { code: '23505' } }
            events.push(clone({ ...v, created_at: new Date(relogio.agora).toISOString() }))
          }
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
  // fal falsa: o que cada request id "virou" na fila. Os jobs novos seguem o roteiro opcoes.novos (na ordem dos POSTs).
  const destino = new Map()
  for (let i = 0; i < n; i++) destino.set(`orig-${i}`, opcoes.originais?.[i] ?? { ok: true })
  const load = createOfflineLoader({
    env: { NEXT_PUBLIC_SUPABASE_URL: 'https://fixture.invalid', SUPABASE_SERVICE_ROLE_KEY: secret, FAL_KEY: 'synthetic-key', CRON_SECRET },
    mocks: {
      'next/server': { NextResponse: { json: (body, init = {}) => ({ body, status: init.status ?? 200 }) } },
      '@/lib/supabase/server': { createClient: () => { if (opcoes.aba) return { auth: { getUser: async () => ({ data: { user: { id: userId } } }) } }; throw Error('modo serviço não pode ler cookie') } },
      '@supabase/supabase-js': { createClient: () => db },
      '@/lib/credits/refund': { refundRenderCredits: () => { throw Error('Forbidden refund na retomada') } },
      '@/lib/hollywood/router': ROUTER,
      '@/lib/openai': { openai: { chat: { completions: { create: async () => { throw Error('OpenAI proibida no modo serviço (sanitize:false)') } } } } },
    },
    globals: {
      setTimeout: (fn, ms = 0) => { timers.push(ms); if (ms < 5_000) fn(); else if (opcoes.prazoDispara) globalThis.setTimeout(fn, 0); return timers.length },
      clearTimeout() {},
      fetch: async (url, init) => {
        const k = postsFal.length
        postsFal.push({ url, body: JSON.parse(init.body) })
        const roteiro = (opcoes.novos ?? [])[k] ?? { ok: true }
        if (roteiro.post === 'hang') return new Promise(() => {})
        if (typeof roteiro.post === 'number') return { ok: false, status: roteiro.post, headers: { get: () => '0' }, text: async () => JSON.stringify({ detail: 'provider said no' }) }
        const id = `novo-${k + 1}`
        destino.set(id, roteiro)
        return { ok: true, status: 200, headers: { get: () => '0' }, text: async () => JSON.stringify({ request_id: id }) }
      },
    },
  })
  const claims = load('@/lib/cinematic/claim')
  const lib = load('@/lib/cinematic/sceneRetryPolicy')
  const birthId = claims.cinematicClaimId(userId, generationId)
  const ids = Array.from({ length: n }, (_, i) => `orig-${i}`)
  const response = {
    generationId, quality: 'cinematic_s25', fal_request_ids: ids, fal_models: ids.map(() => model), aspect: '9:16',
    scene_prompts: ids.map((_, i) => `Signed scene prompt number ${i + 1} with a storm over the coast at night.`),
    scene_seconds: ids.map(() => 8), scene_anchor_urls: ids.map(() => null),
    ...(model === SEEDANCE15 ? { scene_fal_inputs: ids.map((_, i) => ({ prompt: `Signed classic payload ${i + 1} storm over the coast.`, aspect_ratio: '9:16', duration: '8', seed: 4242 })) } : {}),
    submission_uncertain: false,
  }
  birth = { id: birthId, name: claims.CINEMATIC_CLAIM_EVENT, path: claims.CINEMATIC_CLAIM_PATH, user_id: userId, session_id: generationId,
    created_at: new Date(relogio.agora).toISOString(),
    metadata: { generation_id: generationId, status: 'settled', fingerprint: 'a'.repeat(64), credit_cost: 150, quality: 'cinematic_s25', engine: model,
      fal_request_ids: ids, fal_models: ids.map(() => model), authorized_completed_urls: ids.map(() => null),
      response, response_hash: '', resolution_reason: 'provider_submitted', resolution_reference: `cinematic-${birthId}` } }
  const m = birth.metadata
  m.response_hash = claims.cinematicValueHash(m.response)
  m.authority = claims.signCinematicClaim(secret, { claimId: birthId, userId, generationId, status: m.status, fingerprint: m.fingerprint,
    creditCost: m.credit_cost, quality: m.quality, engine: m.engine, falRequestIds: m.fal_request_ids, falModels: m.fal_models,
    authorizedCompletedUrls: m.authorized_completed_urls, responseHash: m.response_hash, resolutionReason: m.resolution_reason, resolutionReference: m.resolution_reference })
  events.push(birth)
  const route = load(ARQUIVO_RETOMADA_1410)
  const urlDe = (id) => `https://v3.fal.media/files/${id}.mp4`
  // fal.queue do @fal-ai/client, falsa: COMPLETED com/sem erro (id conferido) e result() que lança com status
  const fal = { config() {}, queue: {
    status: async (_model, { requestId }) => {
      const d = destino.get(requestId) ?? { ok: true }
      if (d.fila === 'IN_PROGRESS') return { status: 'IN_PROGRESS', request_id: requestId }
      return d.ok ? { status: 'COMPLETED', request_id: requestId } : { status: 'COMPLETED', request_id: requestId, ...(d.semErroNaFila ? {} : { error: d.message ?? 'Service Unavailable', error_type: d.tipo ?? 'server_error' }) }
    },
    result: async (_model, { requestId }) => {
      const d = destino.get(requestId) ?? { ok: true }
      if (d.ok) return { data: { video: { url: urlDe(requestId) } } }
      const e = new Error(d.message ?? 'Service Unavailable'); e.status = d.http ?? 503; throw e
    },
  } }
  class NextRequestFalso { constructor(url, init = {}) { this.url = url; this._body = init.body; const h = new Map(Object.entries(init.headers ?? {}).map(([k, v]) => [k.toLowerCase(), v])); this.headers = { get: (k) => h.get(k.toLowerCase()) ?? null } } async json() { return JSON.parse(this._body) } }
  class DataFalsa extends Date { constructor(...a) { if (a.length) super(...a); else super(relogio.agora) } static now() { return relogio.agora } }
  const resultsAll = []
  const ctx = {
    console: { log() {}, warn() {}, error() {} }, process: { env: { CRON_SECRET, FAL_KEY: 'synthetic-key' } }, Date: DataFalsa, JSON, Math, Number, String, Array, Object, Set, Map, Promise, Error,
    fal, createHash, NextRequest: NextRequestFalso, APP_URL: 'https://fixture.invalid',
    authorizeCinematicCompletedUrls: claims.authorizeCinematicCompletedUrls, authorizeCinematicTerminalFailures: claims.authorizeCinematicTerminalFailures,
    executarRetentativas: lib.executarRetentativas, CENA_RETRY_EVENT: lib.CENA_RETRY_EVENT, HOLLYWOOD_SCENE_RETRIED_EVENT: 'hollywood_scene_retried',
    sceneRetryPost: async (req) => { const r = await route.POST(req); return { status: r.status, json: async () => clone(r.body) } },
    releaseCinematicClaim: claims.releaseCinematicClaim,
    refundRenderCredits: async (ref) => { estornos.push(ref); return 150 },
    PENDING_STALE_MINUTES: 45,
  }
  vm.createContext(ctx)
  vm.runInContext(transpila(FATIA_COLETA.replace(/^type RastroDaColeta = .*$/m, '')) + '\n;globalThis.collectFinishedClips = collectFinishedClips; globalThis.retentarCenasDoFilme = retentarCenasDoFilme;', ctx)
  vm.runInContext(transpila(`async function __rodada(md: any, claim: any, admin: any, secret: any, userId: any, genId: any, gen8: any, results: any, estado: any) { for (const __ of [0]) {\n${FATIA_LACO}\n estado.prontas = collected.clips.map((c: any) => c.requestId) } }`) + '\n;globalThis.__rodada = __rodada;', ctx)
  const rodadaFn = ctx.__rodada
  return {
    events, postsFal, escritasDeCredito, estornos, relogio, generationId, claims, secret, userId, birth, route, db,
    /** Uma rodada do cron `minutos` depois do nascimento do claim. */
    rodada: async (minutos) => {
      relogio.agora = Date.parse(birth.created_at) + minutos * 60_000
      const results = [], estado = { prontas: null }
      await rodadaFn(birth.metadata, { created_at: birth.created_at }, db, secret, userId, generationId, generationId.slice(0, 8), results, estado)
      resultsAll.push(...results)
      return { desfecho: results[0]?.outcome ?? (estado.prontas ? `ready:${estado.prontas.length}` : 'nada'), prontas: estado.prontas }
    },
    eventos: (nome) => events.filter((e) => e.name === nome),
    retentar: (args) => ctx.retentarCenasDoFilme(args),
    claimAgora: async () => (await claims.loadVerifiedCinematicClaim({ db, secret, userId, generationId })).claim,
  }
}

{ // 1) 503 na cena 3, depois ok → monta com as 6
  const c = cenario({ nome: 'um', cenas: 6, originais: { 2: { ok: false, message: 'Service Unavailable: model at capacity', http: 503 } }, novos: [{ ok: true }] })
  const r1 = await c.rodada(10)
  checa(`S25 6 cenas, cena 3 morreu com 503: a rodada SEGURA (nem monta com 5 nem estorna) — ${r1.desfecho}`, r1.desfecho === 'scene_retry_wait:1/6' && c.estornos.length === 0)
  checa('UM POST novo à fal, só da cena 3, no endpoint do motor, payload hollywood assinado (prompt da cena 3, 8 s, 480p)', c.postsFal.length === 1 && c.postsFal[0].url.endsWith(S25) && c.postsFal[0].body.prompt.includes('number 3') && c.postsFal[0].body.duration === '8' && c.postsFal[0].body.resolution === '480p')
  const v = await c.claimAgora()
  checa('claim assinado retargetado: slot 3 = job novo; as 5 prontas autorizadas e intocadas', v && v.falRequestIds[2] === 'novo-1' && v.falRequestIds.filter((id, i) => i !== 2).every((id, i) => id === `orig-${i < 2 ? i : i + 1}`) && v.authorizedCompletedUrls.filter(Boolean).length === 5)
  const ev = c.eventos('cinematic_scene_retry')
  const tent = ev.find((e) => e.metadata.fase === 'tentativa'), res = ev.find((e) => e.metadata.fase === 'resultado')
  checa('evento cinematic_scene_retry: cena (índice 2), HTTP 503, tentativa 1 de 2, via cron, classe retentável', tent && tent.metadata.scene_index === 2 && tent.metadata.provider_http_status === 503 && tent.metadata.attempt === 1 && tent.metadata.max_attempts === 2 && tent.metadata.via === 'cron' && tent.metadata.classe === 'retentavel' && tent.session_id === c.generationId)
  checa('evento de resultado: reenviada, request novo, status da retomada 200', res && res.metadata.desfecho === 'reenviada' && res.metadata.new_request_id === 'novo-1' && res.metadata.retry_http_status === 200)
  checa('hollywood_scene_retried gravado pela retomada (conta a tentativa para a aba e para o cron)', c.eventos('hollywood_scene_retried').length === 1 && c.eventos('hollywood_scene_retried')[0].metadata.scene_index === 2)
  checa('mutex do compose solto depois da retomada', !c.events.some((e) => e.name === 'compose_submission_claim'))
  const r2 = await c.rodada(16)
  checa(`rodada seguinte: cena nova pronta → o filme vai para a montagem com as 6 (${r2.desfecho})`, r2.desfecho === 'ready:6' && r2.prontas.includes('novo-1'))
  checa('dinheiro: 0 estorno, 0 escrita em tabela de crédito, 1 POST — a cobrança continua a ÚNICA do nascimento', c.estornos.length === 0 && c.escritasDeCredito.length === 0 && c.postsFal.length === 1)
}
{ // 2) 503 na cena 3 três vezes + conteúdo na cena 4 → 2 retentativas, depois too_few com estorno (o caminho de sempre)
  const capacidade = { ok: false, message: 'Service Unavailable: model at capacity', http: 503 }
  const c = cenario({ nome: 'tres', cenas: 4, originais: { 2: capacidade, 3: { ok: false, message: 'Content policy violation: prompt flagged', http: 422 } }, novos: [capacidade, capacidade] })
  const r1 = await c.rodada(10)
  checa(`rodada 1: retenta a cena 3 (tentativa 1) e não a 4 (conteúdo) — ${r1.desfecho}`, r1.desfecho === 'scene_retry_wait:1/4' && c.postsFal.length === 1)
  const r2 = await c.rodada(13)
  checa(`rodada 2 (3 min depois da 1ª retentativa): ESPERA (backoff de 5 min), sem POST — ${r2.desfecho}`, r2.desfecho === 'scene_retry_wait:0/4' && c.postsFal.length === 1 && c.estornos.length === 0)
  const r3 = await c.rodada(16)
  checa(`rodada 3: tentativa 2 da cena 3 — ${r3.desfecho}`, r3.desfecho === 'scene_retry_wait:1/4' && c.postsFal.length === 2)
  const r4 = await c.rodada(22)
  checa(`rodada 4: a 3ª falha esgota (2 de 2) → caminho de sempre: too_few 2/4 com estorno — ${r4.desfecho}`, r4.desfecho === 'too_few_refunded:2/4' && c.estornos.length === 1 && c.postsFal.length === 2)
  const tent = c.eventos('cinematic_scene_retry').filter((e) => e.metadata.fase === 'tentativa')
  checa('eventos: tentativas 1 e 2 da cena 3, cada uma com HTTP 503', tent.length === 2 && tent.every((e) => e.metadata.scene_index === 2 && e.metadata.provider_http_status === 503) && tent.map((e) => e.metadata.attempt).join() === '1,2')
  const dec = c.eventos('cinematic_scene_retry').filter((e) => e.metadata.fase === 'decisao')
  checa('decisões gravadas UMA vez cada: cena 4 nao_retentavel (conteúdo, 422) e cena 3 esgotada', dec.filter((e) => e.metadata.scene_index === 3 && e.metadata.decisao === 'nao_retentavel' && e.metadata.provider_http_status === 422).length === 1 && dec.filter((e) => e.metadata.scene_index === 2 && e.metadata.decisao === 'esgotada').length === 1)
  checa('nenhum POST da cena 4 (conteúdo) nem das prontas', c.postsFal.every((p) => p.body.prompt.includes('number 3')))
  const v = await c.claimAgora()
  checa('claim liberado pelo ramo too_few de sempre (provider_failed_refunded)', v && v.status === 'released')
}
{ // 3) conteúdo sozinho, filme de 6 → não retenta; monta com 5 (o caminho de sempre)
  const c = cenario({ nome: 'conteudo', cenas: 6, originais: { 2: { ok: false, message: 'Content policy violation', http: 422 } } })
  const r1 = await c.rodada(10)
  const r1b = await c.rodada(15)
  checa(`recusa de conteúdo: 0 POST, monta com 5 (${r1.desfecho} / ${r1b.desfecho})`, c.postsFal.length === 0 && r1.desfecho === 'ready:5' && r1b.desfecho === 'ready:5')
  checa('decisão nao_retentavel gravada UMA vez em duas rodadas', c.eventos('cinematic_scene_retry').filter((e) => e.metadata.decisao === 'nao_retentavel').length === 1)
}
{ // 4) result() falho SEM erro na fila → não prova job morto, não reenvia
  const c = cenario({ nome: 'semerro', cenas: 6, originais: { 2: { ok: false, semErroNaFila: true, http: 500 } } })
  const r = await c.rodada(10)
  checa(`COMPLETED sem erro na fila + result() 500: nenhuma retentativa (${r.desfecho})`, c.postsFal.length === 0 && c.eventos('cinematic_scene_retry').length === 0 && r.desfecho === 'ready:5')
}
{ // 5) tarde demais e zero prontas → caminho de sempre
  const c = cenario({ nome: 'tarde', cenas: 6, originais: { 2: { ok: false, message: 'Service Unavailable', http: 503 } } })
  const r = await c.rodada(75)
  checa(`claim com 75 min: não retenta, monta com 5 (${r.desfecho})`, c.postsFal.length === 0 && r.desfecho === 'ready:5')
  const z = cenario({ nome: 'zero', cenas: 2, originais: { 0: { ok: false, message: 'Service Unavailable', http: 503 }, 1: { ok: false, message: 'Service Unavailable', http: 503 } } })
  const rz = await z.rodada(10)
  checa(`0 de 2 prontas: nenhuma retentativa, too_few com estorno (${rz.desfecho})`, z.postsFal.length === 0 && rz.desfecho === 'too_few_refunded:0/2' && z.estornos.length === 1)
}
{ // 6) duas rodadas sobrepostas (mesmo retrato do claim) → 1 POST só
  const c = cenario({ nome: 'sobreposta', cenas: 6, originais: { 2: { ok: false, message: 'Service Unavailable', http: 503 } } })
  c.relogio.agora = Date.parse(c.birth.created_at) + 10 * 60_000
  const rastro = () => ({ falhas: [{ index: 2, requestId: 'orig-2', model: S25, http: 503, message: 'Service Unavailable' }], prontas: [0, 1, 3, 4, 5].map((i) => ({ requestId: `orig-${i}`, model: S25, url: `https://v3.fal.media/files/orig-${i}.mp4` })) })
  const args = { admin: c.db, secret: c.secret, userId: c.userId, genId: c.generationId, claimCreatedAt: c.birth.created_at, claimAgeMin: 10 }
  const [a, b] = await Promise.all([c.retentar({ ...args, rastro: rastro() }), c.retentar({ ...args, rastro: rastro() })])
  const v = await c.claimAgora()
  checa(`rodadas sobrepostas: 1 POST à fal, 1 job novo no claim (a trava segura a 2ª) — ${a.reenviadas}+${b.reenviadas}`, c.postsFal.length === 1 && a.reenviadas + b.reenviadas === 1 && v && v.falRequestIds[2] === 'novo-1')
}
{ // 7) Seedance 1.5 (família clássica) pelo mesmo desvio: payload assinado byte a byte
  const c = cenario({ nome: 'classica', model: SEEDANCE15, cenas: 4, originais: { 1: { ok: false, message: 'Request timed out', http: 504 } } })
  const r = await c.rodada(10)
  checa(`Seedance 1.5, cena 2 com 504: retentada com o payload clássico assinado (${r.desfecho})`, r.desfecho === 'scene_retry_wait:1/4' && c.postsFal.length === 1 && c.postsFal[0].body.prompt === 'Signed classic payload 2 storm over the coast.' && c.postsFal[0].body.seed === 4242)
  checa('família clássica: registro classic_scene_retry_attempt antes do gasto', c.eventos('classic_scene_retry_attempt').length === 1)
}

// ─── (c) modo serviço da retomada ─────────────────────────────────────────────────────────────────────────────────────
console.log('== (c) modo serviço da retomada ==')
{
  const ini = RETOMADA.indexOf('function usuarioDeServico(')
  const fim = RETOMADA.indexOf('\n}', ini)
  const src = ini > 0 ? RETOMADA.slice(ini, fim + 2) : ''
  const env = { CRON_SECRET: 's3cr3t' }
  const U = vm.runInNewContext(transpila(src) + '\nusuarioDeServico', { process: { env } })
  const req = (h) => ({ headers: { get: (k) => h[k.toLowerCase()] ?? null } })
  checa('Bearer certo + uuid → id do dono', U(req({ authorization: 'Bearer s3cr3t', 'x-kineo-service-user': USER })) === USER)
  checa('Bearer errado / uuid inválido / sem header → cookie (null)', U(req({ authorization: 'Bearer outro', 'x-kineo-service-user': USER })) === null && U(req({ authorization: 'Bearer s3cr3t', 'x-kineo-service-user': 'nao-e-uuid' })) === null && U(req({})) === null)
  env.CRON_SECRET = ''
  checa('sem CRON_SECRET no ambiente o modo serviço NÃO existe (nem com "Bearer ")', U(req({ authorization: 'Bearer ', 'x-kineo-service-user': USER })) === null)
  checa('todo uso de `classic` no fluxo (não no payload) virou soltaNaDuvida; o payload continua escolhido por `classic`',
    (RETOMADA.match(/soltaNaDuvida/g) || []).length === 9 && RETOMADA.includes('const signedNow = (claim: CinematicClaim) => classic ? signedClassic(claim, slot) : signedScene(claim, slot)') && RETOMADA.includes("family: classic ? 'classic' : 'hollywood'"))
}
{ // hollywood (S25) com POST ambíguo (503 no envio): modo serviço solta; aba prende como sempre
  const viaServico = cenario({ nome: 'ambiguo', cenas: 3, originais: { 1: { ok: false, message: 'Service Unavailable', http: 503 } }, novos: [{ post: 503 }] })
  const r = await viaServico.rodada(10)
  const mutex = viaServico.events.find((e) => e.name === 'compose_submission_claim')
  checa(`modo serviço, S25, envio da retomada ambíguo (503): mutex SOLTO, nada preso (${r.desfecho})`, !mutex && viaServico.postsFal.length === 1)
  checa('o registro da tentativa FICA (nenhum 2º POST para o mesmo slot) e o job órfão vira evento', viaServico.eventos('classic_scene_retry_attempt').length === 1 && viaServico.eventos('classic_scene_retry_unconfirmed').length === 1)
  const r2 = await viaServico.rodada(16)
  checa(`rodada seguinte: nenhum 2º POST; o filme vai com as prontas (${r2.desfecho})`, viaServico.postsFal.length === 1 && r2.desfecho === 'ready:2')
  const pelaAba = cenario({ nome: 'aba', aba: true, cenas: 3, originais: { 1: { ok: false, message: 'Service Unavailable', http: 503 } }, novos: [{ post: 503 }] })
  await pelaAba.claims.authorizeCinematicCompletedUrls({ db: pelaAba.db, secret: pelaAba.secret, userId: pelaAba.userId, generationId: pelaAba.generationId, completed: [{ requestId: 'orig-0', model: S25, url: 'https://v3.fal.media/files/orig-0.mp4' }] })
  await pelaAba.claims.authorizeCinematicTerminalFailures({ db: pelaAba.db, secret: pelaAba.secret, userId: pelaAba.userId, generationId: pelaAba.generationId, failed: [{ requestId: 'orig-1', model: S25 }] })
  const ra = await pelaAba.route.POST({ headers: { get: () => null }, json: async () => ({ generationId: pelaAba.generationId, sceneIndex: 1, model: S25, oldRequestId: 'orig-1', sanitize: false }) })
  checa(`pela aba (cookie), mesmo caso: 422 scene_retry_unresolved como sempre (status ${ra.status})`, ra.status === 422 && ra.body.reason === 'scene_retry_unresolved')
}

// ─── (d) a marca, a base e a ordem ────────────────────────────────────────────────────────────────────────────────────
console.log('== (d) marca, base (pai do 1º commit com a marca) e ordem no cron ==')
const gitBruto = (...a) => { try { return execFileSync('git', a, { cwd: RAIZ, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 * 1024 * 1024 }) } catch { return '' } }
const git = (...a) => gitBruto(...a).trim()
const primeiro = git('log', '--format=%H', '--reverse', '-S', MARCA_RETENTAR_CENA_1410, '--', ARQUIVO_RETOMADA_1410).split('\n').filter(Boolean)[0]
const base = primeiro ? `${primeiro}^` : 'HEAD'
checa(`base resolvida (${primeiro ? 'pai de ' + primeiro.slice(0, 8) : 'HEAD — conserto ainda sem commit'})`, Boolean(git('rev-parse', '--verify', base)))
for (const f of [ARQUIVO_RETOMADA_1410, ARQUIVO_CRON_1410]) {
  const naBase = gitBruto('show',`${base}:${f}`).replace(/\r\n/g, '\n')
  const atual = rd(f)
  let desfeito = null
  try { desfeito = semRetentarCena1410(atual, f) } catch (e) { console.log('  ' + e.message) }
  checa(`${f}: desfeito = EXATAMENTE a base (${FORMA_RETENTAR_CENA_1410[f].trocas} trocas, ${FORMA_RETENTAR_CENA_1410[f].acrescimos} acréscimos)`, desfeito !== null && naBase.length > 0 && desfeito === naBase)
  checa(`${f}: a base não tem a marca e o desfaz é idempotente nela`, !naBase.includes(MARCA_RETENTAR_CENA_1410) && semRetentarCena1410(naBase, f) === naBase)
}
checa('lib nova não existe na base (desfeita = ausente)', git('cat-file', '-e', `${base}:${ARQUIVO_LIB_NOVA_1410}`) === '' && existsSync(join(RAIZ, ARQUIVO_LIB_NOVA_1410)))
{
  let lancou = false
  try { semRetentarCena1410(rd(ARQUIVO_CRON_1410).replace('    } // KINEO-RETENTAR-CENA-1410\n', '    } // KINEO-RETENTAR-CENA-1410\n    const x = 1 // KINEO-RETENTAR-CENA-1410\n'), ARQUIVO_CRON_1410) } catch { lancou = true }
  checa('desfaz lança diante de linha marcada nova (não engole mudança)', lancou)
}
const marcadas = [RETOMADA, CRON].flatMap((s) => s.split('\n').filter((l) => l.includes(MARCA_RETENTAR_CENA_1410)))
checa('dinheiro: nenhuma linha marcada nem a lib chamam estorno/débito/saldo de crédito', ![...marcadas, ...LIB.split('\n')].some((l) => /refundRenderCredits|credit_debits|debitCredits|video_credits|creditCost|credit_cost|releaseCinematicClaim/.test(l)))
// reancorado KINEO-MODERACAO-1410 — a régua completa do texto (outra entrega, vai do fundador 14/10) acrescentou 3 linhas marcadas ao /orders do Studio Ads;
// desfeitas elas (scripts/test-support/desfaz-moderacao-1410.mjs), o arquivo tem de ser o da base deste conserto — preço/motor/ads seguem intocados AQUI.
const ORDERS_MOD_1410 = 'app/api/ads/v2/orders/route.ts' // reancorado KINEO-MODERACAO-1410
const soModeracao1410 = (f) => { try { return f === ORDERS_MOD_1410 && semModeracao1410(rd(f), 'ads') === gitBruto('show', `${base}:${f}`).replace(/\r\n/g, '\n') } catch { return false } } // reancorado KINEO-MODERACAO-1410
checa('nenhum preço/motor: lib/engineWall, lib/homeVideoCuration e ads intocados', git('diff', '--name-only', base, primeiro || 'HEAD', '--', 'lib/engineWall.ts', 'lib/homeVideoCuration.ts', 'lib/ads', 'app/api/ads') /* reancorado KINEO-LEVA-1410-BASE: mede o PRÓPRIO commit do conserto (base→1º commit com a marca), não a árvore — senão qualquer leva posterior de Ads o deixa vermelho sem defeito */.split('\n').filter(Boolean).filter((f) => !soModeracao1410(f)).length === 0) // reancorado KINEO-MODERACAO-1410
{
  const iDesvio = CRON.indexOf('    if (rastroDaColeta.falhas.length > 0) { // KINEO-RETENTAR-CENA-1410')
  const iTooFew = CRON.indexOf("    if (collected.state === 'too_few') {")
  const iColeta = CRON.indexOf('    const collected = await collectFinishedClips(requestIds, models, claimAgeMin, rastroDaColeta) // KINEO-RETENTAR-CENA-1410')
  checa('ordem no cron: coleta → desvio da retentativa → too_few (estorno) → montagem', iColeta > 0 && iDesvio > iColeta && iTooFew > iDesvio)
  checa('o cron só chama a retomada com sanitize:false (OpenAI fica fora do caminho sem aba)', CRON.includes('oldRequestId: f.requestId, sanitize: false }'))
}

console.log(`\n${ok} ok, ${falhas.length} falha(s)`)
if (falhas.length) { console.log('FALHAS:\n - ' + falhas.join('\n - ')); process.exit(1) }
