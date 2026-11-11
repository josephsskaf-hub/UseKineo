// KINEO-PLANO-PRIMEIRO-FILME-1111 — no 1º filme, o plano de câmera vira filme narrado no modo IA em vez do 422.
// Trava (Node puro, sem rede/banco): (a) a lib real executada: o corpo vira a ideia, "chave: valor" vira direção visual,
// duração/clipe somem, JSON simples também; 1º filme só com contagem 0 (null = não é); (b) a rota: conta sem filme passa pela
// conversão ANTES da recusa; conta com filme recebe o mesmo 422 de sempre; leitura que falha = recusa; o caso "monumento" no modo
// "as is" segue a mesma regra. Mutantes em memória no fim.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n')
const ts = (await import('typescript')).default
const load = (src) => { const m = { exports: {} }; new Function('module', 'exports', ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(m, m.exports); return m.exports }
const SRC = { lib: read('lib/cinematic/planoNoPrimeiroFilme.ts'), route: read('app/api/generate-video-cinematic/route.ts') }
const PLANO = 'A lonely astronaut walks across the red dunes of Mars at sunset, looking for the lost rover.\ncamera: slow dolly in, low angle\nstyle: cinematic, dark, dusty\nduration: 8s'
const JSONP = '{\n"scene": "a fox jumps over a frozen river at dawn",\n"camera": "tracking shot",\n"duration": 6\n}'

function problems(S) {
  const p = []
  const no = (bad, msg) => { if (bad) p.push(msg) }
  let L
  try { L = load(S.lib) } catch (e) { return [`lib não executa: ${e.message}`] }
  const a = L.pedidoDeFilmeDoPlano(PLANO)
  no(!a.includes('lonely astronaut walks across the red dunes of Mars'), 'lib: a ideia do plano sumiu do pedido')
  no(!/Visual direction \(never read aloud\) — camera slow dolly in, low angle; style cinematic, dark, dusty\./.test(a), `lib: a câmera/estilo não viraram direção visual (${a})`)
  no(/duration|8s/.test(a), 'lib: a duração do plano foi para o pedido')
  no(!/^A short narrated film/.test(a) || !/never the camera/.test(a), 'lib: o pedido não manda narrar a história (a narradora leria o plano)')
  const b = L.pedidoDeFilmeDoPlano(JSONP)
  no(!b.includes('a fox jumps over a frozen river at dawn') || !b.includes('camera tracking shot') || /duration|[{}]/.test(b.replace(/\(never read aloud\)/, '')), `lib: plano em JSON mal convertido (${b})`)
  no(L.ehPrimeiroFilme(0) !== true, 'lib: conta sem filme não é 1º filme')
  for (const v of [1, 5, null, undefined, NaN, -1]) no(L.ehPrimeiroFilme(v) !== false, `lib: ${v} filmes virou 1º filme (leitura falha precisa recusar)`)

  const r = S.route
  const iConta = r.indexOf('const contaSemFilmeNoPlano = detectShotSpec(prompt).isShotSpec && ehPrimeiroFilme(await filmesEntreguesDaConta(user.id))')
  const iConv = r.indexOf('const planoEmContaSemFilme = shot.isShotSpec && contaSemFilmeNoPlano')
  no(iConta < 0 || iConta > r.indexOf('if (lugarDoPedido && detectShotSpec(prompt).isShotSpec) {'), 'rota: a contagem do 1º filme não vem antes do caso monumento')
  const iRec = r.indexOf("        await writeServerEvent({ name: 'shot_spec_detected',")
  no(iConv < 0, 'rota: o 1º filme não consulta a contagem antes do plano')
  no(iConv > 0 && !(iConv < iRec), 'rota: a conversão vem depois da recusa')
  no(!r.includes("        prompt = pedidoDeFilmeDoPlano(prompt) // KINEO-PLANO-PRIMEIRO-FILME-1111\n        body.script_mode = 'ai' // KINEO-PLANO-PRIMEIRO-FILME-1111"), 'rota: o 1º filme não vira pedido narrado no modo IA')
  no(!r.includes('      } else if (shot.isShotSpec) { // KINEO-PLANO-PRIMEIRO-FILME-1111'), 'rota: conta com filme perdeu a recusa de sempre')
  no(!/error: `This looks like a shot plan \(\$\{shot\.keys\.slice\(0, 4\)\.join\(', '\)\}\), not a story to narrate\./.test(r), 'rota: a frase da recusa de sempre mudou')
  no(!r.includes("if (body.script_mode !== 'ai' && !contaSemFilmeNoPlano) return NextResponse.json(briefRequiresReview(body.language), { status: 422 })"), 'rota: o plano sobre lugar real ainda recusa o 1º filme no modo "as is"')
  const h = r.slice(r.indexOf('async function filmesEntreguesDaConta('), r.indexOf('type UnsettledHold ='))
  no(!h.includes(".from('videos').select('id', { count: 'exact', head: true }).eq('user_id', userId).neq('status', 'failed')"), 'rota: a contagem não é a dos filmes entregues da própria conta')
  no(!h.includes('return error || typeof count !== \'number\' ? null : count') || !h.includes('} catch { return null }'), 'rota: leitura que falha não devolve null (adivinharia 1º filme)')
  const iVerb = r.indexOf("const userSaysVerbatim = ((body.script_mode ?? '') as string).toLowerCase() === 'verbatim'")
  no(!(iConv > 0 && iVerb > iConv), 'rota: o modo "as is" é decidido antes da conversão (o modo IA não pegaria)')
  return p
}

const atual = problems(SRC)
assert.deepEqual(atual, [], `violações:\n  ${atual.join('\n  ')}`)
let n = 1, falhas = 0
console.log('ok  estado atual limpo')
const MUT = [
  ['M1 qualquer conta passa pela conversão', 'route', (s) => s.replace('const planoEmContaSemFilme = shot.isShotSpec && contaSemFilmeNoPlano', 'const planoEmContaSemFilme = shot.isShotSpec')],
  ['M2 converte sem trocar o modo', 'route', (s) => s.replace("        body.script_mode = 'ai' // KINEO-PLANO-PRIMEIRO-FILME-1111\n", '')],
  ['M3 leitura que falha vira 1º filme', 'lib', (s) => s.replace('return filmesEntreguesDaConta === 0', 'return !filmesEntreguesDaConta').replace('return filmesEntregues === 0', 'return !filmesEntregues')],
  ['M4 duração entra no pedido', 'lib', (s) => s.replace('|duration|seconds|length|', '|seconds|length|')],
  ['M5 a recusa de sempre some', 'route', (s) => s.replace('      } else if (shot.isShotSpec) { // KINEO-PLANO-PRIMEIRO-FILME-1111', '      } else if (false) { // KINEO-PLANO-PRIMEIRO-FILME-1111')],
  ['M6 monumento volta a recusar o 1º filme', 'route', (s) => s.replace("if (body.script_mode !== 'ai' && !contaSemFilmeNoPlano) return", "if (body.script_mode !== 'ai') return")],
  ['M7 contagem lida para toda conta', 'route', (s) => s.replace('const contaSemFilmeNoPlano = detectShotSpec(prompt).isShotSpec && ehPrimeiroFilme(', 'const contaSemFilmeNoPlano = ehPrimeiroFilme(')],
]
for (const [nome, k, f] of MUT) {
  const s2 = f(SRC[k])
  if (s2 === SRC[k]) { console.log(`FALHA ${nome}: não aplicou`); falhas++; continue }
  const v = problems({ ...SRC, [k]: s2 })
  if (!v.length) { console.log(`FALHA ${nome}: ficou verde`); falhas++ } else { console.log(`ok  ${nome}: vermelho (${v[0]})`); n++ }
}
console.log(`${n} ok · ${falhas} falha(s)`)
if (falhas) process.exit(1)
