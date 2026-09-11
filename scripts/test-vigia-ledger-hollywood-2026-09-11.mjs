// KINEO-VIGIA-LEDGER-2026-09-11 — guardião do livro-razão do caminho hollywood.
//
// O que ele protege: 5 de 5 `cinematic_dispatch_result` da família Kling 3 /
// H3 / Omni nos últimos 7 dias (inclusive dois filmes de 150cr ENTREGUES)
// saíam attempted=0 · not_attempted=N · invariant_ok=false · claim_action=
// unknown · provider_spend_possible=false. O caminho hollywood nunca escrevia
// ctx.outcomes/attempts nem claimAction — só o clássico fazia. Resultado: o
// placar dizia "nada foi ao fornecedor" para os motores mais caros, e a
// medição de "fal: accepted = planned" (critério g da vigília) era impossível.
//
// Segundo ponto: NENHUM evento de render gravava o quadro pedido (aspect).
// "Formato respeitado" não se media no banco. Agora `requested_aspect` viaja
// em generation_dispatch_received e `aspect` no claim assinado (dois caminhos).
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import ts from 'typescript'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) ok++; else falhas.push(n) }
// dispatchScenes.ts importa irmãos; para executar resumirPlano/invarianteFecha
// (puros) basta um `require` que devolve vazio para tudo que não é usado aqui.
const roda = (src) => {
  const js = ts.transpileModule(src, { compilerOptions: { module: 1, target: 9 } }).outputText
  const exp = {}
  vm.runInNewContext(js, { exports: exp, require: () => ({}) })
  return exp
}

const rt = rd('app/api/generate-video-cinematic/route.ts')
const idx = (s) => rt.indexOf(s)
const conta = (s) => rt.split(s).length - 1

console.log('== 1. a disposição por cena nasce ao lado do request id ==')
checa('hDispositions declarado logo após hRequestIds, com os 3 valores da Disposition real',
  /const hRequestIds: \(string \| null\)\[\] = \[\]\n(?:\s*\/\/[^\n]*\n)*\s*const hDispositions: Array<'accepted' \| 'explicit_reject' \| 'ambiguous'> = \[\]/.test(rt))
checa('fim do laço: push da disposição decidido por `id` (aceito ↔ recusado), colado ao push do id',
  /hRequestIds\.push\(id\)\n\s*hDispositions\.push\(id \? 'accepted' : 'explicit_reject'\)/.test(rt))
checa('os DOIS ramos ambíguos (presenter e t2v/i2v) empurram ambiguous, nunca accepted',
  conta("hRequestIds.push(null)\n                hDispositions.push('ambiguous')") === 1 &&
  conta("hRequestIds.push(null)\n              hDispositions.push('ambiguous')") === 1 &&
  conta("hDispositions.push('ambiguous')") === 2)
checa('nenhum outro push em hDispositions (3 no total: aceito/recusado + 2 ambíguos)', conta('hDispositions.push(') === 3)

console.log('== 2. o preenchimento do razão fica entre o acolchoamento e o FAILFAST ==')
const iPad = idx('while (hRequestIds.length < plan.scenes.length) {')
const iFill = idx('const disp = hDispositions[i]')
const iValid = idx('const hValid = hRequestIds.filter((id): id is string => id !== null)')
checa('ordem: acolchoamento → razão → hValid (o FAILFAST já vê os outcomes)', iPad > 0 && iFill > iPad && iValid > iFill)
checa('cena nunca tentada fica FORA (vira not_attempted no finalizador)', /const disp = hDispositions\[i\]\n\s*if \(!disp\) continue/.test(rt))
checa('outcome grava a disposição decidida (`disposition: disp`) e nunca um literal', /disposition: disp,\n/.test(rt) && !/disposition: 'accepted',\n\s*reason_class: disp/.test(rt))
checa('recusa sem classe vai como unknown/never (nunca autoriza re-POST); aceito = ok/200',
  /reason_class: disp === 'accepted' \? 'ok' : disp === 'ambiguous' \? 'transport_timeout_5xx' : 'unknown',\n\s*retry_safety: 'never',\n\s*provider_http_status: disp === 'accepted' \? 200 : null,/.test(rt))
checa('attempts alinhado por índice e totalPosts cresce por cena tentada',
  /c\.attempts\[i\] = \[\{ model, status: disp === 'accepted' \? 200 : null, ambiguous: disp === 'ambiguous', accepted: disp === 'accepted' \}\]\n\s*c\.totalPosts \+= 1/.test(rt))

console.log('== 3. claim_action deixa de ser unknown no sucesso hollywood e no salvage ==')
const iPubH = idx('return publishCinematicResponse(response, hRequestIds, hModels)')
const iPubS = idx('return publishCinematicResponse(patched, freshIds, storedModels)')
const iPubC = idx('return publishCinematicResponse(response, falRequestIds, usedModels)')
const pubAntes = (i) => rt.lastIndexOf("c.claimAction = 'published'", i)
checa('hollywood: claimAction=published imediatamente antes do publish', iPubH > 0 && iPubH - pubAntes(iPubH) < 260)
checa('salvage: claimAction=published imediatamente antes do publish', iPubS > 0 && iPubS - pubAntes(iPubS) < 200)
checa('clássico continua igual (3 pontos no total)', iPubC > 0 && iPubC - pubAntes(iPubC) < 200 && conta("c.claimAction = 'published'") === 3)

console.log('== 4. o quadro pedido passa a existir no banco ==')
checa('generation_dispatch_received grava requested_aspect (normalizado)',
  /requested_duration: Number\(\(body as \{ duration\?: unknown \}\)\.duration\) \|\| null,\n(?:\s*\/\/[^\n]*\n)*\s*requested_aspect: normalizeAspect\(\(body as \{ aspect\?: unknown \}\)\.aspect\),\n\s*\},\n\s*\}\)/.test(rt))
checa('aspect: aspectRequested nos DOIS claims (hollywood e clássico), ao lado de requested_duration',
  conta('requested_duration: requestedDuration,\n        aspect: aspectRequested,') === 1 &&
  conta('requested_duration: requestedDuration,\n      aspect: aspectRequested,') === 1)

console.log('== 5. o invariante fecha de verdade com o vetor que a rota monta ==')
const D = roda(rd('lib/cinematic/dispatchScenes.ts'))
function montar(disps, planned) {
  const outcomes = []; const attempts = []; let totalPosts = 0
  for (let i = 0; i < planned; i++) {
    const disp = disps[i]
    if (!disp) continue
    outcomes[i] = { scene_index: i, model: 'm', disposition: disp, reason_class: disp === 'accepted' ? 'ok' : disp === 'ambiguous' ? 'transport_timeout_5xx' : 'unknown', retry_safety: 'never', provider_http_status: disp === 'accepted' ? 200 : null, attempt_count: 1 }
    attempts[i] = [{ model: 'm', status: disp === 'accepted' ? 200 : null, ambiguous: disp === 'ambiguous', accepted: disp === 'accepted' }]
    totalPosts += 1
  }
  const r = D.resumirPlano({ outcomes, requestIds: [], models: [], attempts, totalPosts })
  const planejado = planned || r.planned
  const not_attempted = planejado - r.accepted - r.rejected - r.ambiguous
  return { ...r, planned: planejado, not_attempted, invariant_ok: D.invarianteFecha({ ...r, planned: planejado, not_attempted }) }
}
{
  const r = montar(Array(8).fill('accepted'), 8) // o filme do faroleiro (8/8 aceitas, 150cr)
  checa('8/8 aceitas: attempted=8, accepted=8, not_attempted=0, invariant_ok=true, histograma 200×8',
    r.attempted === 8 && r.accepted === 8 && r.not_attempted === 0 && r.invariant_ok === true && r.provider_status_histogram['200'] === 8 && r.total_posts === 8)
}
{
  const r = montar(['accepted', 'accepted', 'ambiguous'], 8) // ambíguo na 3ª → break → 5 nunca tentadas
  checa('2 aceitas + 1 ambígua + break: attempted=3, ambiguous=1, not_attempted=5, invariante fecha',
    r.attempted === 3 && r.accepted === 2 && r.ambiguous === 1 && r.not_attempted === 5 && r.invariant_ok === true)
}
{
  const r = montar(['accepted', 'explicit_reject', 'accepted'], 3)
  checa('recusa explícita conta como rejected (não como not_attempted) e o histograma tem status none',
    r.rejected === 1 && r.not_attempted === 0 && r.invariant_ok === true && r.provider_status_histogram['none'] === 1)
}
{
  const r = montar([], 6) // o que acontecia ANTES: nada escrito
  checa('vetor vazio (o defeito antigo) é o que dava attempted=0/not_attempted=6', r.attempted === 0 && r.not_attempted === 6)
}

console.log(`\n${ok} ok · ${falhas.length} falhas`)
for (const f of falhas) console.log('  ✗', f)
process.exit(falhas.length ? 1 : 0)
