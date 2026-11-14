import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join, posix } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import ts from 'typescript'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const nativeRequire = createRequire(import.meta.url)
const read = (path) => readFileSync(join(root, path), 'utf8').replace(/\r\n/g, '\n')
function loader(over = {}) {
  const cache = new Map()
  const load = (path) => {
    if (cache.has(path)) return cache.get(path).exports
    const module = { exports: {} }; cache.set(path, module)
    const req = (name) => {
      if (name.startsWith('node:')) return nativeRequire(name)
      const base = name.startsWith('@/') ? name.slice(2) : name.startsWith('.') ? posix.normalize(posix.join(posix.dirname(path), name)) : null
      const target = base && [base, `${base}.ts`, `${base}.tsx`].find((p) => existsSync(join(root, p)))
      assert(target, `dependência externa: ${name}`)
      return load(target)
    }
    const js = ts.transpileModule(over[path] ?? read(path), { fileName: path, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
    new Function('require', 'module', 'exports', 'process', 'fetch', js)(req, module, module.exports, { env: {} }, () => { throw new Error('rede proibida') })
    return module.exports
  }
  return load
}
// KINEO-LUGAR-DO-PEDIDO-1111 — reprise dos 6 filmes (CEO 11/11): o 657ad797 pedia "sits alone at a stylish Johannesburg coffee shop" e os
// planos diziam só "a café". E o filme 2120f018 (11/11 17:00) saiu com "period piece set strictly in the historical era being narrat." —
// uma "época" sem época, cortada no meio da palavra. Trava (Node puro, sem rede): (a) o lugar do pedido real é lido; (b) dois lugares,
// nenhum, ou lugar em proibição = nada; (c) os 3 planos reais do 657ad797 levam o lugar, e o plano que não cabe a ficha inteira tira o
// lugar antes da roupa; (d) a época sem época não entra no plano; a de verdade fica inteira; (e) a rota põe o lugar nas duas estradas.
const R = JSON.parse(readFileSync(join(root, 'scripts/test-support/pedido-657ad797-1111.json'), 'utf8'))
const PED = 'lib/cinematic/pessoaDoPedido.ts', FQ = 'lib/cinematic/filmQuality.ts', ROTA = 'app/api/generate-video-cinematic/route.ts'
function problems(over) {
  const p = []
  const no = (bad, msg) => { if (bad) p.push(msg) }
  let P, K, S, T, J
  try { const load = loader(over); P = load(PED); K = load('lib/cinematic/cenaKling4.ts'); S = load('lib/cinematic/sceneStyle.ts'); T = load('lib/kling4Trial.ts'); J = load('lib/cinematic/juizFicha.ts') } catch (e) { return [`fonte não carrega: ${e.message}`] }
  no(P.lugarDoPedido(R.original) !== 'a stylish Johannesburg coffee shop', `(a) 657ad797 → ${JSON.stringify(P.lugarDoPedido(R.original))}`)
  for (const [nome, t] of [['dois lugares', 'The girl waits in a small café, then runs through the dark forest.'], ['nenhum', 'The history of the Roman Empire in 60 seconds.'], ['CAFE KOOK (coffee shop + café)', 'A coffee commercial for a premium coffee shop called CAFE KOOK.'], ['proibição', 'A woman reads a letter. No office, no street.']])
    no(P.lugarDoPedido(t) !== null, `(b) ${nome} → ${JSON.stringify(P.lugarDoPedido(t))}`)
  const style = S.deriveStyleAnchor('photorealistic documentary')
  const pessoa = P.pessoaDoPedido(R.original), ficha = P.fichaDaPessoa(R.derivada, pessoa)
  const el = P.elencoComPessoaDoPedido(pessoa, [{ nome: 'the woman', tipo: 'humano', origem: 'deterministica', canonica: R.sorteada }])
  const prompts = R.prompts.map((x) => P.comLugarDoPedido(P.comLuzDoPedido(J.trocarFichaNoPrompt(x.split(`consistent design: ${R.derivada}.`).join(`consistent design: ${ficha}.`), el.trocas), P.luzDoPedido(R.original)), P.lugarDoPedido(R.original)))
  const mp = T.buildKling4TrialInput(prompts.map((x, i) => K.promptDaCenaKling4(x, style, i, true)), [null, null, null], { voiceovers: R.falas, wordsPerSecond: R.wps }).input.multi_prompt
  no(!mp[0].prompt.includes('Place: a stylish Johannesburg coffee shop.'), `(c) o lugar não chegou ao plano 1 → ${mp[0].prompt.slice(0, 120)}`)
  // KINEO-LUGAR-CEDE-A-ACAO-1111 [CEO 11/11: "o lugar cede à ação quando os dois não cabem"] — no plano 3, com o lugar, a ação era cortada no meio
  // da oração ("…as her expression,") e o payoff sumia: o lugar sai desse plano (fica no 1, onde a ação cai em vírgula) e o payoff volta inteiro.
  no(mp[2].prompt.includes('Place:') || !/as her expression transforms from anticipation to joy/.test(mp[2].prompt), `(c) plano 3: o lugar tomou o payoff → ${mp[2].prompt.slice(-200)}`)
  for (const [i, m] of mp.entries()) {
    no(!/long neat black braids/.test(m.prompt) || !/cream blouse and elegant black trousers/.test(m.prompt), `(c) plano ${i + 1}: o lugar tomou o lugar da roupa`)
    no(Array.from(m.prompt).length > 512 || !m.prompt.endsWith(' Mouth closed, no speaking.'), `(c) plano ${i + 1}: tamanho ou cauda`)
  }
  const semEpoca = 'Film visual medium: photorealistic, ultra-detailed. A glowing orb of light rises over the dark sea, waves crashing on the rocks below, period piece set strictly in the historical era being narrated: every person, building, street, vehicle and object belongs to that exact time, no readable text, letters, numbers, labels or signage anywhere in the frame'
  const k1 = K.promptDaCenaKling4(semEpoca, style, 0, true)
  no(/historical era|being narrat/.test(k1), `(d) a época sem época entrou no plano → ${k1.slice(0, 160)}`)
  // a frase longa da época, como a rota escreve (eraLockSuffix), sai INTEIRA da ação (2120f018 refeito: sobrava ": every person, building, street…")
  const longa = 'Film visual medium: photorealistic, ultra-detailed. A wide shot of a star-filled night sky, with constellations twinkling brightly, capturing the vastness of creation\'s beauty., period piece set strictly in the historical era being narrated: every person, building, street, vehicle and object belongs to that exact time — period clothing, period architecture and period transport only, as it really looked then, no readable text, letters, numbers, labels or signage anywhere in the frame'
  const k3 = K.promptDaCenaKling4(longa, style, 0, true)
  no(/every person, building|period clothing|as it really looked then/.test(k3), `(d) sobrou a frase longa da época → ${k3.slice(0, 220)}`)
  const comEpoca = semEpoca.replace('the historical era being narrated', 'the year 79 AD')
  const k2 = K.promptDaCenaKling4(comEpoca, style, 0, true)
  no(!/period piece set strictly in the year 79 AD\./.test(k2), `(d) a época de verdade não ficou inteira → ${k2.slice(0, 160)}`)
  const rota = over[ROTA] ?? read(ROTA)
  no(!rota.includes('classicScenePrompts[i] = comLugarDoPedido(classicScenePrompts[i], lugarPedido)') || !rota.includes('const base = comLugarDoPedido(relogioComPonteiros(quality.prompts[i]), lugarHollywood)'), '(e) a rota não põe o lugar nas duas estradas')
  return p
}
const atual = problems({})
assert.deepEqual(atual, [], `violações:\n  ${atual.join('\n  ')}`)
let n = 1, falhas = 0
console.log('ok  estado atual limpo (lugar do pedido nos planos, cedendo à roupa; época sem época fora; a de verdade inteira)')
const ped = read(PED), fq = read(FQ), rota = read(ROTA)
const MUT = [
  ['M1 dois lugares valem', { [PED]: ped.replace('if (nomes.size !== 1) return null', 'if (nomes.size === 0) return null') }],
  ['M2 o compactador ignora o lugar', { [FQ]: fq.replace('const lugarPedido = /(?:Setting as the customer asked|Setting of this film): ([^.]+)\\./.exec(prompt)?.[1]?.trim()', 'const lugarPedido = undefined as string | undefined') }],
  ['M3 o lugar não cede à roupa', { [FQ]: fq.replace('const pre = lugarPedido && (!cabeAFicha(prefix) || !acaoInteiraComLugar) ?', 'const pre = lugarPedido && !acaoInteiraComLugar ?') }],
  ['M4 a época sem época volta', { [FQ]: fq.replace("period && !/historical era being narrated/i.test(period) ?", 'period ?') }],
  ['M6 a frase longa da época fica na ação', { [FQ]: fq.replace("action = action.replace(/,?\\s*(?:period piece set strictly in [^:]+)?:\\s*(?:every person", "action = action.replace(/NUNCA(?:period piece set strictly in [^:]+)?:\\s*(?:every person") }], // KINEO-CENA-SEM-GENTE-1411 — reancorado: a mesma linha ganhou a alternativa da época curta do plano sem gente
  ['M7 o lugar não cede à ação', { [FQ]: fq.replace('const pre = lugarPedido && (!cabeAFicha(prefix) || !acaoInteiraComLugar) ?', 'const pre = lugarPedido && !cabeAFicha(prefix) ?') }],
  ['M8 o lugar sai de todo plano', { [FQ]: fq.replace('return Math.max(Array.from(porFrase).length, Array.from(porOracao).length) >= limite * 0.6', 'return false') }],
  ['M5 a rota clássica sem o lugar', { [ROTA]: rota.replace('classicScenePrompts[i] = comLugarDoPedido(classicScenePrompts[i], lugarPedido)', 'classicScenePrompts[i] = classicScenePrompts[i]') }],
]
for (const [nome, over] of MUT) {
  const [k, v] = Object.entries(over)[0]
  if (v === read(k)) { console.log(`FALHA ${nome}: não aplicou`); falhas++; continue }
  const r = problems(over)
  if (!r.length) { console.log(`FALHA ${nome}: ficou verde`); falhas++ } else { console.log(`ok  ${nome}: vermelho (${r[0].slice(0, 150)})`); n++ }
}
console.log(`${n} ok · ${falhas} falha(s)`)
if (falhas) process.exit(1)
