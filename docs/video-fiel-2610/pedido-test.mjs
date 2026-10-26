// PEDIDO-FIEL-2610: real pure modules and actual route guards, no network/env/database.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import ts from 'typescript'
import { fileURLToPath } from 'node:url'
import { createOfflineLoader } from '../../scripts/test-support/offline-ts-loader.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
process.chdir(ROOT)
const load = createOfflineLoader()
const request = load('lib/requestFidelity.ts')
const parser = load('lib/scriptParser.ts')
const pasted = load('lib/pastedDirectives.ts')
const writer = load('lib/meta95/ideiaNoEscritor.ts')
let checks = 0
const check = (name, fn) => { fn(); checks++; console.log('PASS ' + name) }
const brief = 'Crie um vídeo de 50 segundos sobre três vilas antigas. Use imagens das ruínas. Inclua um fato sobre cada vila.'
const literal = 'As ruínas guardavam um segredo. Uma criança encontrou uma chave azul e chamou o avô. Juntos abriram o portão.'
const marked = 'HOOK: [Pexels: old village gate] Uma criança encontrou uma chave azul.\nPAYOFF: [Pexels: open gate] O avô abriu o portão e sorriu.'
const base = { prompt: brief, scriptMode: 'verbatim', duration: 15, language: 'pt' }

check('single-line Portuguese brief is detected; original parser text remains intact', () => {
  assert.equal(parser.looksLikeBrief(brief), true)
  assert.equal(parser.parseUserScript(brief).narration, brief)
  assert.equal(pasted.readPastedDirectives(brief).looksPasted, true)
})
check('literal never silently invokes the writer, including brief', () => {
  for (const prompt of [brief, literal, marked]) assert.equal(writer.ehIdeiaSolta({ prompt, scriptMode: 'verbatim' }), false)
})
check('production request cannot be narrated without explicit AI choice', () => {
  for (const scriptMode of ['verbatim', undefined, '', 'unknown']) {
    const result = request.reviewRequestFidelity({ ...base, scriptMode })
    assert.equal(result.reason, 'brief_requires_review')
    assert.equal(result.charged, false)
    assert.equal(result.retryable, false)
    assert.equal(result.review_required, true)
  }
  for (const prompt of ['[faceless] ' + brief, '[camera: slow push] ' + brief]) assert.equal(request.reviewRequestFidelity({ ...base, prompt }).reason, 'brief_requires_review')
})
check('50/60 second request does not silently become a 15 second film', () => {
  for (const seconds of [50, 60]) {
    const prompt = `Crie um vídeo de ${seconds} segundos sobre um farol abandonado. Use cenas noturnas.`
    const input = { ...base, scriptMode: 'ai', prompt }
    const original = JSON.stringify(input)
    const result = request.reviewRequestFidelity(input)
    assert.equal(result.reason, 'request_duration_mismatch')
    assert.equal(result.requested_seconds, seconds)
    assert.equal(result.selected_seconds, 15)
    assert.equal(JSON.stringify(input), original)
  }
  assert.equal(request.reviewRequestFidelity({ ...base, scriptMode: 'ai', duration: 60 }), null)
})
check('English and Spanish production requests have localized review', () => {
  assert.match(request.reviewRequestFidelity({ ...base, prompt: 'Create a 60-second video about a lighthouse.', language: 'en' }).error, /finished narration/)
  assert.match(request.reviewRequestFidelity({ ...base, prompt: 'Crea un vídeo de 60 segundos sobre un faro.', language: 'es' }).error, /narración lista/)
})
check('legitimate prose, quotation, dialogue, labels and marked story are preserved', () => {
  const safe = [literal, marked, '“Crie um vídeo de 50 segundos”, disse a professora.', 'PROFESSORA: “Crie um vídeo de 50 segundos.”\nALUNO: “Vou tentar!”', 'NARRAÇÃO: Crie um vídeo por dia. Esta é a dica que me ajudou a praticar.', 'HOOK: Crie um vídeo por dia para praticar.\nPAYOFF: Compartilhe sua experiência.', 'O foguete levou 60 segundos para alcançar o céu. A equipe comemorou.', 'Make no mistake, this voice belongs to the forest.', 'Please share this video with your friends.', 'Make a video every day to practice your storytelling. Keep your first attempts short.']
  for (const prompt of safe) {
    assert.equal(request.reviewRequestFidelity({ ...base, prompt }), null, prompt)
    assert.equal(writer.ehIdeiaSolta({ prompt, scriptMode: 'verbatim' }), false)
  }
})
check('unsupported duration notice supports PT/ES with English fallback', () => {
  const reading = pasted.readPastedDirectives('Crie um vídeo de 3 minutos sobre um farol.')
  assert.match(pasted.fraseDoQueNaoDamosConta(reading, 'pt-BR'), /Seu texto pede 3 minutos/)
  assert.match(pasted.fraseDoQueNaoDamosConta(reading, 'es'), /Tu texto pide 3 minutos/)
  assert.match(pasted.fraseDoQueNaoDamosConta(reading), /Your text asks for/)
})

const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8')
function guardSource(rel, name) {
  const text = read(rel), sf = ts.createSourceFile(rel, text, ts.ScriptTarget.Latest, true)
  let found
  function visit(node) {
    if (ts.isBlock(node)) {
      const at = node.statements.findIndex(s => ts.isVariableStatement(s) && s.declarationList.declarations.some(d => d.name.getText(sf) === name))
      if (at >= 0) found = { declaration: node.statements[at], next: node.statements[at + 1] }
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)
  assert.ok(found, rel + ': real guard declaration exists')
  assert.ok(ts.isIfStatement(found.next), rel + ': return guard immediately follows')
  return { text, at: found.declaration.getStart(sf), code: found.declaration.getText(sf) + '\n' + found.next.getText(sf) }
}
const routes = [
  ['app/api/analyze-idea/route.ts', 'scriptMode', ['await moderateTopic(', 'await polishVerbatimPacing(']],
  ['app/api/generate-video-fast/route.ts', 'script_mode', ['fastRequestFingerprint(', 'await generateScenes(']],
  ['app/api/generate-video-cinematic/route.ts', 'script_mode', ['await escreverIdeiaNoServidor(', 'await ensureCinematicDebit(', 'completeSceneDescriptions({']],
]
for (const [rel, modeField, laterCalls] of routes) {
  check(rel + ': real guard exits before later work and preserves request', () => {
    const g = guardSource(rel, 'requestReview')
    for (const call of laterCalls) {
      const at = g.text.indexOf(call)
      assert.ok(at > g.at, 'guard before ' + call)
    }
    const code = ts.transpileModule('(function(body,promptRaw){ const intake = { text: promptRaw }; ' + g.code + '; return { proceeded:true };})', { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
    const fn = vm.runInNewContext(code, { SUPPORTED_DURATIONS: [35, 45, 60, 90], reviewRequestFidelity: request.reviewRequestFidelity, NextResponse: { json: (data, init) => ({ data, status: init.status }) } })
    for (const [scriptMode, prompt, reason] of [['verbatim', brief, 'brief_requires_review'], ['ai', brief, 'request_duration_mismatch']]) {
      const body = { prompt, [modeField]: scriptMode, duration: 15, language: 'pt' }, before = JSON.stringify(body)
      const result = fn(body, prompt)
      assert.equal(result.status, 422)
      assert.equal(result.data.reason, reason)
      assert.equal(result.data.charged, false)
      assert.equal(JSON.stringify(body), before)
    }
    assert.equal(fn({ prompt: marked, [modeField]: 'verbatim', duration: 15 }, marked).proceeded, true)
  })
}

const cinematic = 'app/api/generate-video-cinematic/route.ts'
const description = guardSource(cinematic, 'descriptionReview')
check('description guard is after debit, before provider dispatch, and full context survives', () => {
  assert.ok(description.text.indexOf('await ensureCinematicDebit(') < description.at)
  assert.ok(description.text.indexOf('const usedModel =', description.at) > description.at)
  assert.ok(description.text.includes('Topic: ${topic.slice(0, 12000)}'))
})
for (const refunded of [false, true]) {
  const calls = []
  const code = ts.transpileModule('(async function(completas){' + description.code + '; return { proceeded:true };})', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
  const fn = vm.runInNewContext(code, {
    body: { language: 'pt' }, generationId: 'offline-generation', sceneDescriptionReviewMessage: request.sceneDescriptionReviewMessage,
    confirmCinematicRefund: async () => { calls.push('refund'); return refunded },
    releaseBirthClaim: async reason => { calls.push(reason); return true },
    NextResponse: { json: (data, init) => ({ data, status: init.status }) },
  })
  const result = await fn({ descriptions: ['a', '', 'b'], reviewRequired: [1] })
  check('missing own scene stops dispatch; refund=' + refunded, () => {
    assert.equal(result.status, refunded ? 422 : 503)
    assert.equal(result.data.refunded, refunded)
    assert.equal(result.data.claimReleased, refunded)
    assert.equal(result.data.retryable, false)
    assert.deepEqual(JSON.parse(JSON.stringify(result.data.scenes_requiring_review)), [2])
    assert.deepEqual(calls, refunded ? ['refund', 'scene_description_requires_review'] : ['refund'])
    assert.equal(/créditos foram devolvidos/.test(result.data.error), refunded)
  })
  calls.length = 0
  assert.equal((await fn({ descriptions: ['a', 'b'] })).proceeded, true)
  assert.equal(calls.length, 0)
}
check('mutant that bypasses explicit-mode review is caught behaviorally', () => {
  const mutant = createOfflineLoader({ source: (rel, source) => rel === 'lib/requestFidelity.ts' ? source.replace("if (mode !== 'ai')", 'if (false)') : source })('lib/requestFidelity.ts')
  assert.notEqual(mutant.reviewRequestFidelity(base)?.reason, 'brief_requires_review')
})
console.log(`PEDIDO-FIEL-2610 PASS: ${checks} behavioral checks, actual route AST guards, no external operations.`)
