#!/usr/bin/env node
// ═══ KINEO-353A — TESTES DE DISPOSIÇÃO E ISOLAMENTO ════════════════════════
//
// Compila lib/cinematic/sceneDisposition.ts com o tsc do repositório e EXECUTA
// as funções reais. Cobre os oito casos exigidos:
//   1. duas requests concorrentes sem contaminação
//   2. 403 de auth não vira balance
//   3. 422/moderação não recebe retry
//   4. 429 segue apenas o retry permitido
//   5. timeout/transporte/5xx/2xx-sem-id ficam ambiguous e recebem zero rePOST
//   6. logs e eventos sem dados sensíveis
//   7. evento de sucesso fornece denominador
//   8. comportamento financeiro atual permanece coberto
//
// Rodar: node scripts/test-scene-disposition.mjs   (sem rede, sem banco, $0)

import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { AsyncLocalStorage } from 'node:async_hooks'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const saida = mkdtempSync(join(tmpdir(), 'kineo-353a-'))
const requerer = createRequire(join(saida, 'x.cjs'))

try {
  execFileSync(process.execPath, [
    join(raiz, 'node_modules', 'typescript', 'bin', 'tsc'),
    join(raiz, 'lib', 'cinematic', 'sceneDisposition.ts'),
    '--outDir', saida, '--module', 'commonjs', '--target', 'es2022',
    '--moduleResolution', 'node', '--skipLibCheck',
  ], { stdio: 'pipe' })
  writeFileSync(join(saida, 'package.json'), JSON.stringify({ type: 'commonjs' }))
} catch (e) {
  console.error('Não consegui compilar sceneDisposition:\n', e.stdout?.toString() || e.message)
  process.exit(1)
}

const D = requerer(join(saida, 'sceneDisposition.js'))

let falhas = 0
const casos = []
const checa = (nome, cond, detalhe = '') => {
  casos.push({ nome, ok: !!cond, detalhe })
  if (!cond) falhas += 1
}

console.log('\nKINEO #353A — disposição de cena e isolamento por requisição\n')

// ── 2. 403 de auth NÃO vira balance (o bug do looksExhausted) ─────────────
const auth403 = D.classifyProviderFailure({ status: 403, ambiguous: false, message: 'Forbidden: model access denied for this key' })
checa('403 de acesso → auth_model_access (não balance)', auth403.reason_class === 'auth_model_access', auth403.reason_class)
checa('403 de acesso não é retentável às cegas', auth403.retry_safety === 'never')
checa('403 de acesso NÃO dispara alarme de saldo',
  D.isBalanceExhausted(403, 'Forbidden: model access denied for this key') === false)
const saldo403 = D.classifyProviderFailure({ status: 403, ambiguous: false, message: 'User is locked: insufficient balance' })
checa('403 com texto de saldo → balance_quota', saldo403.reason_class === 'balance_quota', saldo403.reason_class)
checa('403 de saldo dispara alarme de saldo',
  D.isBalanceExhausted(403, 'User is locked: insufficient balance') === true)
const mod403 = D.classifyProviderFailure({ status: 403, ambiguous: false, message: 'Blocked content: safety policy' })
checa('403 de moderação → provider_moderation', mod403.reason_class === 'provider_moderation', mod403.reason_class)
checa('402 → balance_quota', D.classifyProviderFailure({ status: 402, ambiguous: false }).reason_class === 'balance_quota')
checa('401 → auth_model_access', D.classifyProviderFailure({ status: 401, ambiguous: false }).reason_class === 'auth_model_access')
checa('404 → auth_model_access (modelo inexistente)',
  D.classifyProviderFailure({ status: 404, ambiguous: false }).reason_class === 'auth_model_access')

// ── 3. 422/400 e moderação: terminal, sem retry ───────────────────────────
for (const st of [400, 422]) {
  const inval = D.classifyProviderFailure({ status: st, ambiguous: false, message: 'invalid parameter: duration' })
  checa(`${st} inválido → invalid_payload, retry never`,
    inval.reason_class === 'invalid_payload' && inval.retry_safety === 'never')
  const mod = D.classifyProviderFailure({ status: st, ambiguous: false, message: 'NSFW content detected' })
  checa(`${st} de moderação → provider_moderation, retry never`,
    mod.reason_class === 'provider_moderation' && mod.retry_safety === 'never')
}

// ── 4. 429: o ÚNICO com retry permitido ───────────────────────────────────
const r429 = D.classifyProviderFailure({ status: 429, ambiguous: false })
checa('429 → rate_limit com retry limited', r429.reason_class === 'rate_limit' && r429.retry_safety === 'limited')
checa('429 é explicit_reject (nada foi enfileirado)', r429.disposition === 'explicit_reject')
const semLimited = [401, 402, 403, 404, 400, 422].map((st) => D.classifyProviderFailure({ status: st, ambiguous: false }).retry_safety)
checa('nenhum outro status ganha retry', semLimited.every((r) => r === 'never'), semLimited.join(','))

// ── 5. ambíguos: zero rePOST ──────────────────────────────────────────────
const ambiguos = [
  ['transporte (sem status)', { status: null, ambiguous: true }],
  ['408', { status: 408, ambiguous: true }],
  ['500', { status: 500, ambiguous: true }],
  ['503', { status: 503, ambiguous: true }],
  ['200 sem request id', { status: 200, ambiguous: true }],
]
for (const [nome, input] of ambiguos) {
  const c = D.classifyProviderFailure(input)
  checa(`${nome} → ambiguous, retry never`, c.disposition === 'ambiguous' && c.retry_safety === 'never',
    `${c.disposition}/${c.retry_safety}`)
}
checa('sem status e sem flag → ambiguous (lado seguro)',
  D.classifyProviderFailure({ status: null, ambiguous: false }).disposition === 'ambiguous')

// ── accepted e ambiguous NUNCA entram na lista de reenvio ─────────────────
const vetor = [
  D.accepted(0, 'seedance'),
  D.failed({ scene_index: 1, model: 'seedance', status: 429, ambiguous: false }),
  D.failed({ scene_index: 2, model: 'seedance', status: null, ambiguous: true }),
  D.notAttempted(3, 'seedance'),
  D.failed({ scene_index: 4, model: 'seedance', status: 403, ambiguous: false, message: 'no access' }),
]
const reenviaveis = D.resubmittable(vetor).map((o) => o.scene_index)
checa('só 429 (limited) e not_attempted (safe) são reenviáveis',
  JSON.stringify(reenviaveis) === JSON.stringify([1, 3]), JSON.stringify(reenviaveis))
checa('accepted nunca é reenviável', !reenviaveis.includes(0))
checa('ambiguous nunca é reenviável', !reenviaveis.includes(2))
checa('403 terminal nunca é reenviável', !reenviaveis.includes(4))

// ── 8. gasto possível no fornecedor = a decisão financeira do #353B ───────
checa('accepted ⇒ gasto possível', D.providerSpendPossible([D.accepted(0, 'm')]) === true)
checa('ambiguous ⇒ gasto possível',
  D.providerSpendPossible([D.failed({ scene_index: 0, model: 'm', status: 500, ambiguous: true })]) === true)
checa('só rejeições explícitas ⇒ SEM gasto possível (pode estornar)',
  D.providerSpendPossible([
    D.failed({ scene_index: 0, model: 'm', status: 429, ambiguous: false }),
    D.notAttempted(1, 'm'),
  ]) === false)

// ── 7. denominador ────────────────────────────────────────────────────────
const resumo = D.summarize(vetor, 6)
checa('resumo conta planejadas', resumo.planned === 6, JSON.stringify(resumo))
checa('resumo conta aceitas', resumo.accepted === 1)
checa('resumo conta ambíguas', resumo.ambiguous === 1)
checa('resumo conta rejeitadas', resumo.rejected === 2)
checa('resumo conta não tentadas (inclui as que faltaram do plano)', resumo.not_attempted === 2, String(resumo.not_attempted))
checa('resumo conta tentadas', resumo.attempted === 4, String(resumo.attempted))
const soSucesso = D.summarize([D.accepted(0, 'm'), D.accepted(1, 'm')], 2)
checa('sucesso puro também gera resumo (denominador existe)',
  soSucesso.accepted === 2 && soSucesso.rejected === 0 && soSucesso.ambiguous === 0)

// ── 6. nada sensível nos campos logáveis ──────────────────────────────────
const campos = D.safeLogFields(D.failed({
  scene_index: 0, model: 'fal-ai/bytedance/seedance',
  status: 400, ambiguous: false,
  message: 'prompt "a secret story about Maria" rejected at https://cdn.fal/media/abc.png key=sk-123',
}))
const blob = JSON.stringify(campos).toLowerCase()
// ⚠️ Corrigi ESTA asserção, não o código: eu tinha proibido a substring "http"
// e ela casa com o NOME do campo `provider_http_status`, que é justamente o
// dado que a gente quer guardar. O proibido é URL, não a palavra.
for (const proibido of ['secret', 'maria', 'sk-', 'key=', 'prompt', 'rejected at']) {
  checa(`log não contém "${proibido}"`, !blob.includes(proibido), blob)
}
for (const url of ['http://', 'https://', 'cdn.fal', '.png']) {
  checa(`log não contém URL/mídia "${url}"`, !blob.includes(url), blob)
}
checa('log mantém o que serve para diagnosticar',
  campos.reason_class === 'invalid_payload' && campos.provider_http_status === 400 && campos.scene_index === 0)
checa('safeLogFields não expõe campo de mensagem', !('message' in campos) && !('body' in campos))

// ── request id nunca entra cru ────────────────────────────────────────────
// ⚠️ ASSINATURA MUDOU NO #353A.1, e mudou porque estava errada: o segredo
// vinha por parâmetro com fallback 'kineo-fallback', o que tornava o
// fingerprint reversível por quem lesse o arquivo. Agora o segredo é de
// ambiente, dedicado, e SEM ele o campo simplesmente não é emitido.
process.env.KINEO_FINGERPRINT_SECRET = 'segredo-de-teste'
const fp = D.requestIdFingerprint('req_abcdef123456789')
checa('fingerprint não contém o request id', !fp.includes('abcdef123456789'), fp)
checa('fingerprint é curto e estável',
  fp.length === 12 && fp === D.requestIdFingerprint('req_abcdef123456789'))
checa('fingerprint muda com o id', fp !== D.requestIdFingerprint('req_outro'))
checa('request id vazio → fingerprint vazio', D.requestIdFingerprint('') === '')
delete process.env.KINEO_FINGERPRINT_SECRET
checa('sem segredo dedicado, fecha fechado (campo omitido)',
  D.requestIdFingerprint('req_abcdef123456789') === '')

// ── 1. CONCORRÊNCIA: duas requisições não se contaminam ───────────────────
// Reproduz o desenho da rota: AsyncLocalStorage com um contexto por request.
// Com a variável de módulo antiga, o reset de B zerava o estado de A.
const als = new AsyncLocalStorage()
const novoCtx = () => ({ balanceExhausted: false, outcomes: [] })
const ctx = () => als.getStore() ?? novoCtx()
async function requisicao(qual, status, mensagem) {
  return als.run(novoCtx(), async () => {
    const c = ctx()
    await new Promise((r) => setTimeout(r, qual === 'A' ? 12 : 1)) // B termina primeiro
    const o = D.failed({ scene_index: 0, model: 'seedance', status, ambiguous: false, message: mensagem })
    c.outcomes.push(o)
    if (D.isBalanceExhausted(status, mensagem)) c.balanceExhausted = true
    await new Promise((r) => setTimeout(r, qual === 'A' ? 1 : 12))
    return { qual, exhausted: c.balanceExhausted, n: c.outcomes.length, classe: c.outcomes[0].reason_class }
  })
}
const [A, B] = await Promise.all([
  requisicao('A', 403, 'model access denied'),      // NÃO é saldo
  requisicao('B', 403, 'insufficient balance'),     // É saldo
])
checa('request A (acesso) não herda o alarme de saldo de B', A.exhausted === false, JSON.stringify(A))
checa('request B (saldo) mantém o próprio alarme', B.exhausted === true, JSON.stringify(B))
checa('A vê só a própria cena', A.n === 1 && A.classe === 'auth_model_access', JSON.stringify(A))
checa('B vê só a própria cena', B.n === 1 && B.classe === 'balance_quota', JSON.stringify(B))

// ── a rota realmente usa o desenho testado ────────────────────────────────
const rota = readFileSync(join(raiz, 'app/api/generate-video-cinematic/route.ts'), 'utf8')
checa('FAL_EXHAUSTED global não existe mais',
  !/^\s*let FAL_EXHAUSTED/m.test(rota))
checa('a rota usa AsyncLocalStorage', /new AsyncLocalStorage<DispatchContext>\(\)/.test(rota))
checa('o POST roda dentro do contexto', /despacho\.run\(novoContextoDeDespacho\(\)/.test(rota))
checa('providerBody saiu do log', !/body,\s*\n\s*\}\)\)/.test(rota) && !/message: e\?\.message, body/.test(rota))
// ⚠️ AS CINCO ÂNCORAS ABAIXO FORAM REESCRITAS NO #353A.1 — e outra vez o motivo
// é que o CÓDIGO que elas descreviam estava errado, não o contrário:
//  · `safeLogFields(disposicao)` saiu do submitToFal porque aquele push usava
//    `outcomes.length` como índice de cena (ordem de conclusão das promises,
//    não a cena real) e criava cena fantasma para stills/Hollywood/salvage;
//  · `registrarDespacho` em três ramos escolhidos a dedo virou UM finalizador
//    que recebe a Response real — antes, sucesso Hollywood, salvage, catch
//    externo e todo return pós-claim não geravam evento nenhum;
//  · `appHttpStatus: 200` era mentira quando o publish devolvia 402/409/503;
//  · `provider_http_status: piorStatus` juntava a classe de uma cena com o
//    status de outra, via find(). Virou histograma.
// A verificação de COMPORTAMENTO destas garantias vive agora em
// scripts/test-dispatch-contract.mjs, que executa a orquestração real.
checa('o log de falha continua redigido (classificação, não corpo)',
  /reason_class: classe\.reason_class/.test(rota))
checa('safeLogFields segue sendo o formatador do evento',
  /ctx\.outcomes\.map\(safeLogFields\)/.test(rota))
checa('existe UM finalizador, awaitado, com a Response real',
  /await finalizarDespacho\(ctx, res\)/.test(rota))
checa('o finalizador é idempotente', /if \(ctx\.registrado\) return/.test(rota))
checa('app_http_status vem da Response real', /app_http_status: res\.status/.test(rota))
checa('status do fornecedor vai em histograma, sem "representante"',
  /provider_status_histogram/.test(rota) && !/piorStatus/.test(rota))
checa('deploy_sha vai no evento', /deploy_sha: process\.env\.VERCEL_GIT_COMMIT_SHA/.test(rota))
checa('engine/quality vêm do servidor (claimQuality), não do seletor',
  /c\.quality = String\(claimQuality\)/.test(rota) && !/quality: String\(quality\)/.test(rota))
checa('engine clássico é o modelo real resolvido', /c\.engine = usedModel/.test(rota))

const eventos = readFileSync(join(raiz, 'app/api/events/route.ts'), 'utf8')
checa('cinematic_submission_claim está na denylist', /'cinematic_submission_claim',/.test(eventos))
checa('cinematic_dispatch_result está na denylist', /'cinematic_dispatch_result',/.test(eventos))

// ── 8. o comportamento financeiro atual continua coberto ──────────────────
checa('FAILFAST clássico só libera a claim quando nenhum ID é renderizável',
  /if \(!hasRenderableClassicScene\(falRequestIds\)\)[\s\S]{0,500}releaseBirthClaim\(ctxDespacho\(\)\.balanceExhausted/.test(rota))
checa('FAILFAST hollywood ainda libera a claim e estorna',
  /hollywood FAILFAST[\s\S]{0,400}releaseBirthClaim\(ctxDespacho\(\)\.balanceExhausted/.test(rota))
checa('#353A NÃO cria submitting/recoverable', !/'submitting'|'recoverable'/.test(rota))
checa('#353A NÃO altera prazo financeiro',
  !/recovery_deadline_at/.test(rota))

for (const c of casos) console.log(`  ${c.ok ? '✓' : '✗'} ${c.nome}${c.detalhe && !c.ok ? `\n      ${c.detalhe}` : ''}`)
rmSync(saida, { recursive: true, force: true })
console.log(falhas === 0
  ? `\n${casos.length} CASOS OK — classificação honesta, isolamento por request, log sem vazamento.\n`
  : `\n${falhas} de ${casos.length} CASOS FALHARAM.\n`)
process.exit(falhas === 0 ? 0 : 1)
