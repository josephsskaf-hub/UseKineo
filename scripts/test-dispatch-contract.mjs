#!/usr/bin/env node
// ═══ KINEO-353A.1 — TESTE DE CONTRATO DA ORQUESTRAÇÃO ══════════════════════
//
// POR QUE ESTE TESTE EXISTE, E POR QUE O ANTERIOR NÃO BASTAVA
//
// Os 72 casos do #353A eram puros ou regex, e o teste de concorrência
// instanciava um `AsyncLocalStorage` PRÓPRIO — ou seja, provava que o padrão
// funciona, não que o produto usa o padrão. Enquanto isso, no caminho vivo,
// `submitScene` re-POSTava qualquer rejeição explícita depois de 800 ms:
// 401, 403, 404 e 422 eram repetidos apesar de `retry_safety` dizer "never".
// Teste verde, produto errado.
//
// Este arquivo IMPORTA `lib/cinematic/dispatchScenes` — o MESMO módulo que a
// rota chama — e injeta uma Fal falsa. A lógica exercitada é a lógica real;
// nada é reimplementado aqui.
//
// Rodar: node scripts/test-dispatch-contract.mjs   (sem rede, sem custo)

import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const saida = mkdtempSync(join(tmpdir(), 'kineo-353a1-'))
const requerer = createRequire(join(saida, 'x.cjs'))

try {
  execFileSync(process.execPath, [
    join(raiz, 'node_modules', 'typescript', 'bin', 'tsc'),
    join(raiz, 'lib', 'cinematic', 'dispatchScenes.ts'),
    join(raiz, 'lib', 'cinematic', 'sceneDisposition.ts'),
    '--outDir', saida, '--module', 'commonjs', '--target', 'es2022',
    '--moduleResolution', 'node', '--skipLibCheck', '--rootDir', join(raiz, 'lib', 'cinematic'),
  ], { stdio: 'pipe' })
  writeFileSync(join(saida, 'package.json'), JSON.stringify({ type: 'commonjs' }))
} catch (e) {
  console.error('Não consegui compilar a orquestração:\n', e.stdout?.toString() || e.message)
  process.exit(1)
}

const O = requerer(join(saida, 'dispatchScenes.js'))
const D = requerer(join(saida, 'sceneDisposition.js'))

let falhas = 0
const casos = []
const checa = (nome, cond, detalhe = '') => {
  casos.push({ nome, ok: !!cond, detalhe })
  if (!cond) falhas += 1
}

/** Fal falsa: conta POSTs REAIS e devolve o roteiro programado. */
function falFalsa(roteiro) {
  const posts = []
  const submit = async (model, onPost) => {
    onPost()
    posts.push(model)
    const passo = roteiro[posts.length - 1] ?? roteiro[roteiro.length - 1]
    if (passo.ok) return `req_${posts.length}`
    const err = new Error(passo.message ?? 'fal rejected')
    err.name = 'FalQueueSubmitError'
    err.status = passo.status ?? null
    err.ambiguous = passo.ambiguous === true
    throw err
  }
  return { submit, posts }
}

console.log('\nKINEO #353A.1 — contrato da orquestração (a mesma que a rota chama)\n')

// ── Retry visual seguro: no máximo UMA segunda submissão ──────────────────
async function dispatchVisual(roteiro, original = 'original visual', safe = 'safe visual') {
  const calls = []
  const submit = async (model, visualPrompt, onPost) => {
    onPost()
    calls.push({ model, visualPrompt })
    const passo = roteiro[calls.length - 1] ?? roteiro[roteiro.length - 1]
    if (passo.ok) return `req_${calls.length}`
    const err = new Error(passo.message ?? 'fal rejected')
    err.status = passo.status ?? null
    err.ambiguous = passo.ambiguous === true
    throw err
  }
  const result = await O.dispatchOneSceneWithSafeVisualRetry({
    sceneIndex: 4, models: ['m'], visualPrompt: original, safeVisualPrompt: safe, submit,
  })
  return { result, calls }
}

for (const [nome, status, message] of [
  ['moderação', 400, 'safety filter triggered'],
  ['payload', 422, 'invalid prompt payload'],
]) {
  const { result, calls } = await dispatchVisual([
    { ok: false, status, message },
    { ok: true },
  ])
  checa(`${nome} explícita → exatamente uma segunda submissão`, calls.length === 2, `posts=${calls.length}`)
  checa(`${nome} explícita → retry usa prompt visual seguro`, calls[1].visualPrompt === 'safe visual')
  checa(`${nome} explícita → histórico e POSTs mesclados`, result.attempts.length === 2 && result.posts === 2)
  checa(`${nome} explícita → request id do retry preservado`, result.requestId === 'req_2')
}

for (const [nome, passo] of [
  ['aceite', { ok: true }],
  ['auth', { ok: false, status: 401 }],
  ['saldo', { ok: false, status: 402 }],
  ['acesso', { ok: false, status: 403, message: 'model is locked for your account' }],
  ['ambíguo', { ok: false, status: 503, ambiguous: true }],
]) {
  const { calls } = await dispatchVisual([passo, { ok: true }])
  checa(`${nome} → nunca recebe retry visual`, calls.length === 1, `posts=${calls.length}`)
}

{
  const { result, calls } = await dispatchVisual([
    { ok: false, status: 400, message: 'safety filter triggered' },
    { ok: false, status: 503, ambiguous: true },
    { ok: true },
  ])
  checa('retry visual ambíguo → para em dois POSTs', calls.length === 2)
  checa('retry visual ambíguo → desfecho final continua ambíguo', result.outcome.disposition === 'ambiguous')
}

{
  let submissions = 0
  const submit = async (_model, _prompt, onPost) => {
    submissions += 1
    onPost()
    if (submissions === 1) {
      // Simula o retry-after interno do falQueue: dois POSTs, uma só tentativa
      // visível para esta camada, seguida de rejeição explícita final.
      onPost()
      const err = new Error('safety filter triggered')
      err.status = 400
      err.ambiguous = false
      throw err
    }
    return 'req_after_safe_retry'
  }
  const result = await O.dispatchOneSceneWithSafeVisualRetry({
    sceneIndex: 1, models: ['m'], visualPrompt: 'original', safeVisualPrompt: 'safe', submit,
  })
  checa('POSTs internos + retry visual são somados sem usar attempts.length',
    result.posts === 3 && result.outcome.attempt_count === 3 && result.attempts.length === 2,
    JSON.stringify({ posts: result.posts, attempts: result.attempts.length, count: result.outcome.attempt_count }))
}

{
  const safe = O.buildContextualSafeVisualPrompt('bloody murder with a gun https://example.test secret@example.test')
  checa('fallback visual remove termos sensíveis e URLs',
    !/(blood|murder|gun|https|@)/i.test(safe), safe)
  checa('fallback visual é curto e determinístico',
    safe === O.buildContextualSafeVisualPrompt('bloody murder with a gun https://example.test secret@example.test') && safe.length < 600)
}

checa('lote clássico sem nenhum ID continua irrecuperável',
  O.hasRenderableClassicScene([null, null, null]) === false)
checa('um único ID torna o lote clássico renderizável',
  O.hasRenderableClassicScene([null, 'req_paid_scene', null]) === true)
checa('lista vazia não inventa cobertura',
  O.hasRenderableClassicScene([]) === false)

// ── Terminais: EXATAMENTE UM POST ─────────────────────────────────────────
for (const status of [400, 401, 402, 403, 404, 422]) {
  const fal = falFalsa([{ ok: false, status, message: 'no' }])
  const r = await O.dispatchOneScene({ sceneIndex: 0, models: ['m'], submit: fal.submit })
  checa(`${status} → exatamente 1 POST`, fal.posts.length === 1, `posts=${fal.posts.length}`)
  checa(`${status} → explicit_reject`, r.outcome.disposition === 'explicit_reject', r.outcome.disposition)
  checa(`${status} → attempt_count = POSTs`, r.outcome.attempt_count === fal.posts.length)
}

// ── 429: o único com retry, e o retry é do falQueue (1 POST daqui) ────────
{
  const fal = falFalsa([{ ok: false, status: 429 }])
  const r = await O.dispatchOneScene({ sceneIndex: 0, models: ['m'], submit: fal.submit })
  checa('429 → 1 POST desta camada (o falQueue é o dono do retry)', fal.posts.length === 1)
  checa('429 → rate_limit', r.outcome.reason_class === 'rate_limit')
  checa('429 → retry_safety limited', r.outcome.retry_safety === 'limited')
}

// ── Ambíguos: 1 POST e PARA. Zero rePOST. ────────────────────────────────
const ambiguos = [
  ['rede', { ok: false, status: null, ambiguous: true }],
  ['408', { ok: false, status: 408, ambiguous: true }],
  ['500', { ok: false, status: 500, ambiguous: true }],
  ['503', { ok: false, status: 503, ambiguous: true }],
  ['2xx sem id', { ok: false, status: 200, ambiguous: true }],
]
for (const [nome, passo] of ambiguos) {
  const fal = falFalsa([passo])
  const r = await O.dispatchOneScene({ sceneIndex: 0, models: ['i2v', 't2v'], submit: fal.submit })
  checa(`${nome} → 1 POST mesmo com modelo alternativo disponível`, fal.posts.length === 1, `posts=${fal.posts.length}`)
  checa(`${nome} → ambiguous`, r.outcome.disposition === 'ambiguous')
  checa(`${nome} → sem request id`, r.requestId === null)
}

// ── accepted: 1 POST e para ──────────────────────────────────────────────
{
  const fal = falFalsa([{ ok: true }])
  const r = await O.dispatchOneScene({ sceneIndex: 3, models: ['i2v', 't2v'], submit: fal.submit })
  checa('accepted → 1 POST', fal.posts.length === 1)
  checa('accepted → não tenta o segundo modelo', fal.posts.length === 1 && fal.posts[0] === 'i2v')
  checa('accepted → scene_index preservado', r.outcome.scene_index === 3)
  checa('accepted → request id devolvido', r.requestId === 'req_1')
}

// ── i2v → t2v: OUTRO MODELO, não retry escondido ─────────────────────────
{
  const fal = falFalsa([{ ok: false, status: 400, message: 'i2v unsupported' }, { ok: true }])
  const r = await O.dispatchOneScene({ sceneIndex: 2, models: ['kling-i2v', 'kling-t2v'], submit: fal.submit })
  checa('fallback de modelo após rejeição explícita acontece', fal.posts.length === 2, `posts=${fal.posts.length}`)
  checa('fallback usa o SEGUNDO modelo', fal.posts[1] === 'kling-t2v', fal.posts.join(','))
  checa('fallback registra as DUAS tentativas', r.attempts.length === 2)
  checa('fallback registra os DOIS modelos',
    r.attempts[0].model === 'kling-i2v' && r.attempts[1].model === 'kling-t2v')
  checa('fallback registra os dois status', r.attempts[0].status === 400 && r.attempts[1].status === 200)
  checa('fallback NÃO cria cena adicional', r.outcome.scene_index === 2)
  checa('attempt_count conta os 2 POSTs', r.outcome.attempt_count === 2)
}
{
  const fal = falFalsa([{ ok: false, status: null, ambiguous: true }, { ok: true }])
  const r = await O.dispatchOneScene({ sceneIndex: 0, models: ['i2v', 't2v'], submit: fal.submit })
  checa('ambíguo no i2v NUNCA cai para o t2v (job pode existir)', fal.posts.length === 1)
  checa('ambíguo no i2v mantém disposição ambiguous', r.outcome.disposition === 'ambiguous')
}

// ── Ordem de conclusão fora de ordem NÃO troca scene_index ───────────────
{
  const resultados = new Map()
  const atrasos = { 0: 30, 1: 1, 2: 15 }
  await Promise.all([0, 1, 2].map(async (idx) => {
    const fal = falFalsa([{ ok: true }])
    const submit = async (m, onPost) => {
      await new Promise((r) => setTimeout(r, atrasos[idx]))
      return fal.submit(m, onPost)
    }
    resultados.set(idx, await O.dispatchOneScene({ sceneIndex: idx, models: [`m${idx}`], submit }))
  }))
  const plano = O.montarPlano(3, 'm', resultados)
  checa('promises fora de ordem mantêm scene_index correto',
    plano.outcomes.every((o, i) => o.scene_index === i),
    JSON.stringify(plano.outcomes.map((o) => o.scene_index)))
  checa('modelo por cena não é embaralhado',
    plano.models.join(',') === 'm0,m1,m2', plano.models.join(','))
}

// ── INVARIANTE: soma das disposições finais = planned ────────────────────
{
  const resultados = new Map()
  const cenarios = [
    { ok: true },                                   // 0 accepted
    { ok: false, status: 403, message: 'no access' }, // 1 reject
    { ok: false, status: null, ambiguous: true },   // 2 ambiguous
  ]
  for (let i = 0; i < 3; i++) {
    const fal = falFalsa([cenarios[i]])
    resultados.set(i, await O.dispatchOneScene({ sceneIndex: i, models: ['m'], submit: fal.submit }))
  }
  // cenas 3,4,5 nunca tentadas (orçamento)
  const plano = O.montarPlano(6, 'm', resultados)
  const s = O.resumirPlano(plano)
  checa('invariante fecha: accepted+rejected+ambiguous+not_attempted = planned',
    O.invarianteFecha(s), JSON.stringify(s))
  checa('planned = 6', s.planned === 6)
  checa('accepted = 1', s.accepted === 1)
  checa('rejected = 1', s.rejected === 1)
  checa('ambiguous = 1', s.ambiguous === 1)
  checa('not_attempted = 3', s.not_attempted === 3, String(s.not_attempted))
  checa('attempted conta cenas ÚNICAS com POST, não POSTs', s.attempted === 3, String(s.attempted))
  checa('total_posts é campo SEPARADO', s.total_posts === 3, String(s.total_posts))
    // ⚠️ Corrigi ESTA asserção, não o código: eu esperava `ok === 1` contando só
  // a cena aceita, mas `not_attempted` também tem reason_class 'ok' (não é
  // falha). São 1 aceita + 3 não tentadas = 4. A asserção que vale é a que
  // prova a CLASSE DA FALHA aparecendo separada, sem representante único.
  checa('histograma de classes é por cena, sem "representante" pescado por find',
    s.reason_histogram.auth_model_access === 1 &&
    s.reason_histogram.transport_timeout_5xx === 1 &&
    s.reason_histogram.ok === 4,
    JSON.stringify(s.reason_histogram))
  checa('histograma de status do fornecedor existe',
    s.provider_status_histogram['200'] === 1 && s.provider_status_histogram['403'] === 1,
    JSON.stringify(s.provider_status_histogram))
}

// ── Classificação: os casos adversariais ─────────────────────────────────
const adversarios = [
  [403, 'model is locked for your account', 'auth_model_access', 'locked de ACESSO não vira saldo'],
  [403, 'user is locked: insufficient balance', 'balance_quota', 'saldo real continua saldo'],
  [403, 'blocked due to content policy', 'provider_moderation', '"content policy" agora casa'],
  [403, 'your content_policy check failed', 'provider_moderation', 'content_policy com underscore'],
  [403, 'forbidden for this key', 'auth_model_access', 'chave sem permissão'],
  [400, 'safety filter triggered', 'provider_moderation', 'safety filter é moderação'],
  [400, 'duration must be a number', 'invalid_payload', 'parâmetro inválido não é moderação'],
  [403, 'account locked pending payment', 'balance_quota', 'locked + payment é saldo'],
  [402, '', 'balance_quota', '402 é saldo por status'],
  [401, 'unauthorized', 'auth_model_access', '401 é acesso'],
]
for (const [status, msg, esperado, porque] of adversarios) {
  const c = D.classifyProviderFailure({ status, ambiguous: false, message: msg })
  checa(`${porque} (${status})`, c.reason_class === esperado, `${c.reason_class} ≠ ${esperado}`)
}
checa('"model is locked for your account" NÃO dispara alarme de saldo',
  D.isBalanceExhausted(403, 'model is locked for your account') === false)
checa('"insufficient balance" dispara alarme de saldo',
  D.isBalanceExhausted(403, 'user is locked: insufficient balance') === true)

// ── Fingerprint: fecha fechado sem segredo ───────────────────────────────
{
  delete process.env.KINEO_FINGERPRINT_SECRET
  checa('sem segredo dedicado, o fingerprint NÃO é emitido',
    D.requestIdFingerprint('req_abc123') === '')
  process.env.KINEO_FINGERPRINT_SECRET = 'segredo-de-teste'
  const fp = D.requestIdFingerprint('req_abc123')
  checa('com segredo, emite 12 chars', fp.length === 12, fp)
  checa('fingerprint não contém o id cru', !fp.includes('abc123'))
  delete process.env.KINEO_FINGERPRINT_SECRET
}

// ── A ROTA usa mesmo tudo isto (âncoras estruturais mínimas) ─────────────
const rota = readFileSync(join(raiz, 'app/api/generate-video-cinematic/route.ts'), 'utf8')
checa('o retry cego de 800ms foi removido', !/setTimeout\(r, 800\)/.test(rota))
checa('a rota chama o dispatcher com retry visual seguro', /await dispatchOneSceneWithSafeVisualRetry\(\{/.test(rota))
checa('o retry seguro recebe contexto visual, nunca narração',
  /buildContextualSafeVisualPrompt\(\s*sanitizeRealPeople\(scene\.stockSearchQuery \|\| scene\.aiPrompt \|\| scene\.description\)/.test(rota))
checa('a rota usa a política executável de cobertura clássica',
  /if \(!hasRenderableClassicScene\(falRequestIds\)\)/.test(rota))
checa('o piso morto de 50% foi removido',
  !/validIds\.length < Math\.ceil\(scenes\.length \* 0\.5\)/.test(rota))
checa('submitScene recebe sceneIndex explícito', /sceneIndex: number,/.test(rota))
checa('o vetor NÃO usa mais outcomes.length como índice', !/scene_index: contexto\.outcomes\.length/.test(rota))
checa('existe UM ponto de finalização', /async function finalizarDespacho\(/.test(rota))
checa('o finalizador recebe a Response real', /await finalizarDespacho\(ctx, res\)/.test(rota))
checa('não há mais telemetria por ramo', !/registrarDespacho\(/.test(rota))
checa('telemetria é failure-isolated',
  /telemetria falhou \(resposta do cliente preservada\)/.test(rota))
checa('providerBody sumiu da rota', !/providerBody/.test(rota))
checa('catch externo não imprime mensagem livre', !/console\.error\('\[cinematic\] unexpected error:', msg\)/.test(rota))
// ⚠️ Corrigi ESTA asserção: a string `engine: 'hollywood'` ainda existe no
// arquivo — dentro do COMENTÁRIO que explica por que ela saiu do código. A
// asserção honesta ignora linhas de comentário.
const rotaSemComentarios = rota.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n')
checa('engine premium não é a string "hollywood" (fora de comentário)',
  !/engine: 'hollywood'/.test(rotaSemComentarios))
checa('engine premium vem do modelo real da cena',
  /c\.engine = hModels\.find\(Boolean\)/.test(rotaSemComentarios))
checa('app_http_status vem do status real da Response', /app_http_status: res\.status/.test(rota))
checa('claim_action vem do contexto', /claim_action: ctx\.claimAction/.test(rota))
checa('histogramas no evento, não representante',
  /reason_histogram: resumo\.reason_histogram/.test(rota) && /provider_status_histogram:/.test(rota))
checa('invariante vai no evento', /invariant_ok:/.test(rota))

const fq = readFileSync(join(raiz, 'lib/falQueue.ts'), 'utf8')
checa('falQueue é o dono único do retry e conta POSTs', /onPost\?\.\(\)/.test(fq))
checa('o contador dispara ANTES do fetch', /onPost\?\.\(\)[\s\S]{0,200}await fetch\(/.test(fq))

for (const c of casos) console.log(`  ${c.ok ? '✓' : '✗'} ${c.nome}${c.detalhe && !c.ok ? `\n      ${c.detalhe}` : ''}`)
rmSync(saida, { recursive: true, force: true })
console.log(falhas === 0
  ? `\n${casos.length} CASOS OK — a política de retry governa o caminho executado.\n`
  : `\n${falhas} de ${casos.length} CASOS FALHARAM.\n`)
process.exit(falhas === 0 ? 0 : 1)
