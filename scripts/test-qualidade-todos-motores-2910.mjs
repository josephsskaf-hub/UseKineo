// KINEO-QUALIDADE-TODOS-MOTORES-2910 — runtime das fontes reais + ligações de todos os caminhos; sem rede ou fornecedor.
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join, posix } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import ts from 'typescript'
import { runQualityInheritanceChecks, runQualityReferenceChecks } from './test-support/qualidade-heranca-2910.mjs'
import { provaQualidadeAds } from './test-support/qualidade-ads-2910.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const nativeRequire = createRequire(import.meta.url)
const read = (path) => readFileSync(join(root, path), 'utf8').replace(/\r\n/g, '\n')
const cache = new Map()
function load(path) {
  if (cache.has(path)) return cache.get(path).exports
  const module = { exports: {} }; cache.set(path, module)
  const req = (name) => {
    if (name.startsWith('node:')) return nativeRequire(name)
    const base = name.startsWith('@/') ? name.slice(2) : name.startsWith('.') ? posix.normalize(posix.join(posix.dirname(path), name)) : null
    const target = base && [base, `${base}.ts`, `${base}.tsx`].find((p) => existsSync(join(root, p)))
    assert(target, `pure quality imported an external dependency: ${name}`)
    return load(target)
  }
  const js = ts.transpileModule(read(path), { fileName: path, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
  new Function('require', 'module', 'exports', 'process', 'fetch', js)(req, module, module.exports, { env: {} }, () => { throw new Error('network forbidden') })
  return module.exports
}
let passed = 0
const failures = []
async function test(name, run) {
  try { await run(); passed++; console.log(`ok ${name}`) } catch (error) { failures.push(name); console.error(`FAIL ${name}: ${String(error.message).slice(0, 1200)}`) }
}
const copy = (x) => JSON.parse(JSON.stringify(x))
const route = read('app/api/generate-video-cinematic/route.ts')
const Q = load('lib/cinematic/filmQuality.ts')
const style = load('lib/cinematic/sceneStyle.ts').deriveStyleAnchor('stylized 3D animated film')
const falas = ['This robot had one day left to live… and one final gift to give.',
  'A tiny discarded robot collected broken toys, repairing them for lonely children.',
  "The robot shuts down... but the little girl's teddy bear suddenly lights up with the robot's tiny heart-shaped LED."]
const script = `HOOK: ${falas[0]}\nMICRO REWARD: ${falas[1]}\nEnding: ${falas[2]}`
const basePrompts = ['A tiny robot waits beside a broken toy.', 'A tiny robot repairs toys at a workbench.', "Close-up of the little girl's teddy bear, its heart-shaped LED lights up."]
const args = { prompts: basePrompts, falas, contextoOriginal: script, contextoFiltro: script, modo: 'character_story', tagFaceless: false, style }
const prepared = Q.prepararQualidadeDoFilme(args)

await test('política única: ficha, juiz, elenco, contrato, estilo e seres fiéis independem do motor', () => {
  const src = read('lib/cinematic/filmQuality.ts')
  const decision = Q.decidirQualidadeDoFilme({ tagFaceless: false, estrelaAtiva: false, folhaLegada: false })
  for (const key of ['ficha', 'elenco', 'estilo', 'contrato', 'seresFieis', 'stillCritic', 'juizFicha']) assert.equal(decision[key], true, key)
  assert.equal(decision.gerarFolha, false, 'não introduz folha paga')
  assert.equal(Q.decidirQualidadeDoFilme({ tagFaceless: false, estrelaAtiva: false, folhaLegada: true }).gerarFolha, true)
  assert.equal(Q.decidirQualidadeDoFilme({ tagFaceless: true, estrelaAtiva: false, folhaLegada: true }).ficha, false)
  assert.equal(Q.decidirQualidadeDoFilme({ tagFaceless: false, estrelaAtiva: true, folhaLegada: true }).gerarFolha, false)
  for (const name of ['aplicarElencoEEpoca', 'elencoDoRoteiro', 'elencoComFichaLiteral', 'aplicarContrato', 'montarContrato', 'aplicarEixoVisual', 'travarEstiloDoFilme']) assert.match(src, new RegExp(`${name}\\(`), name)
  assert.match(read('lib/cinematic/elencoEpoca.ts'), /descricaoFielDoSer/)
  assert.match(read('lib/cinematic/folhaDePersonagem.ts'), /descricaoFielDoSer/)
  assert(!/fetch\(|fal\.subscribe|fal\.queue/.test(src))
})
await test('caso do cliente: menina com ursinho só no final; ficha e estilo compartilhados', () => {
  assert.match(prepared.prompts[2], /little girl[^.]*holding the glowing teddy bear/)
  assert(!/\bgirl\b/i.test(prepared.prompts[1])); assert(!/\bgirl\b/i.test(prepared.prompts[0]))
  assert(prepared.elenco.some((f) => f.nucleo === 'girl'))
  assert(prepared.elenco.some((f) => f.nucleo === 'robot'))
  for (const p of prepared.prompts) assert(p.startsWith(`Film visual medium: ${style.lookPhrase}. `))
  assert(!prepared.prompts.some((p) => /Named character[^:]*:\s*Ending/.test(p)))
  assert.deepEqual(falas, args.falas); assert.deepEqual(basePrompts, args.prompts)
})
// KINEO-QUALIDADE-TODOS-MOTORES-2910 — reproduz a cadeia real da rota, incluindo fichas que já estão no prompt antes da camada comum.
await test('cadeia clássica real: ficha colada não substitui menina visível; payload Kling4 mostra menina segurando ursinho', () => {
  const P = load('lib/cinematic/personagemAjuste.ts'), F = load('lib/cinematic/folhaDePersonagem.ts'), V = load('lib/cinematic/visualPromptPolicy.ts')
  const elenco = P.elencoDoRoteiro(script)
  const prompts = basePrompts.map(visual => V.buildClassicVisualPrompt(visual, { mode: 'character_story', style,
    character: F.fichaDoProtagonista(elenco), elenco: F.elencoSecundario(elenco) }))
  const adjusted = P.ajustarPromptsDoElenco({ prompts, visuals: basePrompts, falas, elenco })
  const final = Q.prepararQualidadeDoFilme({ ...args, prompts: adjusted.prompts, elenco, aplicarContrato: false })
  const cenas = P.cenasDoElenco(final.prompts, falas, elenco)
  assert(cenas.slice(0, 2).every(c => !c.nomes.includes('the little girl')))
  assert(cenas[2].nomes.includes('the little girl'))
  assert.match(final.prompts[2], /little girl[^.]*holding the glowing teddy bear/)
  const compact = final.prompts.map(p => Q.promptCurtoDoFilmeKling4(p, style))
  const input = load('lib/kling4Trial.ts').buildKling4TrialInput(compact, [null, null, null]).input
  assert.match(input.multi_prompt[2].prompt, /little girl[^.]*holding the glowing teddy bear/)
  assert(input.multi_prompt.slice(0, 2).every(s => !/\bgirl\b/.test(s.prompt)))
  assert(input.multi_prompt.every(s => Array.from(s.prompt).length <= 512))
})
await test('mesma camada atende os três planos do Kling4 e fallback e cinco cenas clássicas', () => {
  const expanded = [...falas.slice(0, 2), 'The robot sorts the toys.', 'The workshop grows quiet.', falas[2]]
  const five = Q.prepararQualidadeDoFilme({ ...args, falas: expanded, prompts: [...basePrompts.slice(0, 2), 'A robot sorting toys.', 'An empty workshop.', basePrompts[2]] })
  assert.equal(five.prompts.length, 5)
  assert.match(five.prompts[4], /little girl[^.]*holding the glowing teddy bear/)
  assert(five.prompts.slice(0, 4).every((p) => !/\bgirl\b/.test(p)))
  const trial = load('lib/kling4Trial.ts').buildKling4TrialInput(prepared.prompts, [null, null, null])
  const payload = JSON.stringify(trial.input)
  assert(payload.includes('little girl') && payload.includes('holding the glowing teddy bear'))
  assert(payload.includes(style.lookPhrase))
  const fallback = load('lib/kling4PaidFilm.ts').kling4PaidFallbackPrompts({ seconds: 30, scenes: five.prompts.map(prompt => ({ prompt, seconds: 6 })) })
  assert(fallback.every((p) => p.includes(style.lookPhrase)))
  assert(fallback.at(-1).includes('little girl') && fallback.at(-1).includes('holding the glowing teddy bear'))
})
await test('estética travada nas duas direções e idempotente', () => {
  const animated = Q.travarEstiloDoFilme('A photorealistic live-action girl holds a teddy bear.', style)
  assert(!/A photorealistic|A live-action|photorealistic live-action/.test(animated))
  assert.equal(Q.travarEstiloDoFilme(animated, style), animated)
  const real = load('lib/cinematic/sceneStyle.ts').deriveStyleAnchor('photorealistic live-action film')
  const locked = Q.travarEstiloDoFilme('A 3D animated cartoon girl holds a teddy bear.', real)
  assert(!/A 3D animated cartoon girl/.test(locked), 'real continua real: remove a ordem positiva de desenho')
  assert(locked.startsWith(`Film visual medium: ${real.lookPhrase}. `))
})
await test('payload final Kling4 de 512 caracteres conserva menina, ursinho, estética e boca fechada', () => {
  const long = prepared.prompts.map(p => p + ' Soft volumetric light, detailed workshop textures, delicate cinematic atmosphere.'.repeat(16))
  assert(long.every(p => Array.from(p).length > 512))
  const compact = long.map(p => Q.promptCurtoDoFilmeKling4(p, style))
  assert(compact.every(p => Array.from(p).length <= 440))
  const { input } = load('lib/kling4Trial.ts').buildKling4TrialInput(compact, [0, 1, 2].map(i => `https://example.test/approved-${i}.png`))
  const final = input.multi_prompt.map(s => s.prompt)
  assert(final.every(p => Array.from(p).length <= 512))
  assert(final.every(p => /3D animated film/.test(p) && /Mouth closed, no speaking\./.test(p)))
  assert.match(final[2], /little girl[^.]*holding the glowing teddy bear/)
  assert(final.slice(0, 2).every(p => !/little girl/.test(p)))
  assert.equal(input.multi_prompt.reduce((n, s) => n + s.duration, 0), 15)
  assert.match(route, /classicScenePrompts\.map\(\(p, i\) => promptDaCenaKling4\(p, styleAnchor, i\)\)/) // reancorado KINEO-CENA-PEDIDO-3010 — o Kling 4 passa por promptDaCenaKling4 (sem a moldura que comia os 512 + eixo de câmera), que chama promptCurtoDoFilmeKling4 por dentro
  assert.match(route, /scenes: paidScenes\.map\(\(s, i\) => \(\{ \.\.\.s, prompt: promptDaCenaKling4\(s\.prompt, styleAnchor, i\) \}\)\)/) // reancorado KINEO-CENA-PEDIDO-3010 — o Kling 4 passa por promptDaCenaKling4 (sem a moldura que comia os 512 + eixo de câmera), que chama promptCurtoDoFilmeKling4 por dentro
})
await test('continuação conserva a canônica original, sem recasting', () => {
  const characters = prepared.elenco.map((f) => ({ ...f, canonica: f.nucleo === 'girl' ? 'the little girl, a small animated girl with a yellow raincoat and red boots' : 'the robot, a tiny weathered brass robot with a heart-shaped red LED', origem: 'autor' }))
  const next = Q.prepararQualidadeDoFilme({ ...args, elenco: characters, preservarElenco: true })
  assert.deepEqual(next.elenco, characters)
  assert(next.prompts[2].includes(characters.find((f) => f.nucleo === 'girl').canonica))
  assert(next.prompts[0].includes(characters.find((f) => f.nucleo === 'robot').canonica))
  const unknown = Q.prepararQualidadeDoFilme({ ...args, elenco: [], preservarElenco: true })
  assert.deepEqual(unknown.elenco, [], 'origem sem ficha não inventa nova ficha')
  const missingScript = 'Maria held the teddy bear. Maria watched the robot. Maria smiled.'
  const missing = Q.prepararQualidadeDoFilme({ ...args, contextoOriginal: missingScript, contextoFiltro: missingScript,
    falas: ['Maria held the teddy bear.', 'Maria watched the robot.', 'Maria smiled.'], prompts: ['A teddy bear.', 'A robot.', 'A room.'], elenco: [], preservarElenco: true })
  assert(!missing.prompts.some(p => /wearing |about nine years old|in her thirties|with .* hair/.test(p)), 'snapshot incompleto não sorteia aparência nova no prompt')
})
// KINEO-QUALIDADE-TODOS-MOTORES-2910 — provider budgets apply after every identity/style rewrite.
await test('ficha herdada longa conserva holding no Kling4; Kling2.5 final cabe sem perder estilo, época e proteção', () => {
  const canonica = 'the little girl, a small animated girl with a yellow raincoat and red boots, dark braided hair, a large knitted orange scarf wrapped twice around her neck, delicate embroidered sleeves and a small silver pendant on her collar'
  const characters = prepared.elenco.map(f => f.nucleo === 'girl' ? { ...f, canonica } : f)
  const inherited = Q.prepararQualidadeDoFilme({ ...args, elenco: characters, preservarElenco: true })
  const compact = Q.promptCurtoDoFilmeKling4(inherited.prompts[2], style)
  assert.match(compact, /Visible: the little girl[^.]*holding the glowing teddy bear/)
  assert(Array.from(compact).length <= 440)
  const K = load('lib/cinematic/klingShots.ts')
  const nearLimit = K.kling25ApplyShotAxis('A robot repairs a broken toy. ' + 'Workshop tools reflect warm lamplight. '.repeat(110), 0)
  const expanded = Q.prepararQualidadeDoFilme({ ...args, prompts: [nearLimit], falas: [falas[1]], aplicarContrato: false }).prompts[0]
  const longGirl = Q.prepararQualidadeDoFilme({ ...args, prompts: [nearLimit], falas: [falas[2]], aplicarContrato: false }).prompts[0]
  assert.match(longGirl, /little girl[^.]*holding the glowing teddy bear/, 'reserva espaço antes do gate de inserção do elenco')
  const withEra = expanded + ' Fine workshop textures.'.repeat(80) + ' Period setting: 1953 (1950s). Mouth closed, no speaking.'
  assert(withEra.length > 2500)
  const bounded = Q.limitarPromptDoFilmeKling25(withEra, 0)
  assert(bounded.length <= 2500)
  assert.match(bounded, /A robot repairs a broken toy/)
  assert.match(bounded, /Period setting: 1953/)
  assert.match(bounded, /Film visual medium:/)
  assert.match(bounded, /Mouth closed, no speaking\./)
  assert.equal(bounded.split(K.kling25ShotAxis(0)).length - 1, 1)
  assert.equal(Q.limitarPromptDoFilmeKling25('An unchanged short shot.', 0), 'An unchanged short shot.')
  assert.match(route, /classicScenePrompts\[i\] = limitarPromptDoFilmeKling25\(classicScenePrompts\[i\], i\)/)
})
await test('juiz comum executa crítico real e juiz_ficha sem elevar gerações fal', async () => {
  const J = load('lib/cinematic/filmQualityJudge.ts'), C = load('lib/cinematic/criticoStill.ts')
  const entry = { indice: 0, url: 'https://example.test/still.png', mostra: 'a little girl holding a teddy bear', fala: falas[2], prompt: prepared.prompts[2], seed: 7,
    referencia: { url: 'https://example.test/girl-sheet.png', descricao: 'a small animated girl with a yellow raincoat' } }
  const calls = []; let generated = 0
  const deps = { filme: C.novoFilmeDoCritico('enforce'), fichas: prepared.elenco.filter((f) => f.nucleo === 'girl'), maxRegeracoesCena: 0, apiKey: 'offline-fixture',
    gerarStill: async () => { generated++; throw new Error('fal não autorizado') },
    fetchImpl: async (_, init) => { calls.push(JSON.parse(init.body)); return Response.json({ choices: [{ message: { content: JSON.stringify({ verdict: 'FAIL', issues: ['identity'], reason: 'wrong character identity', score: 20 }) } }] }) } }
  const result = await J.julgarStillDoFilme(entry, deps)
  assert.equal(generated, 0); assert.equal(calls.length, 1)
  assert.equal(result.relato.juiz_ficha, 'juiz_ficha_v1')
  assert.equal(result.relato.ficha_reprovada, true)
  assert.equal(result.relato.fal_extra, 0)
  assert(calls[0].messages.some((m) => JSON.stringify(m).includes('girl-sheet.png')))
  assert(calls[0].messages.some((m) => JSON.stringify(m).includes('IDENTITY')))
})

// KINEO-QUALIDADE-TODOS-MOTORES-2910 — as ligações são lidas da fonte usada na entrega, nunca de uma tabela paralela.
await test('15s Kling4 e fallback Seedance: prompt comum e juiz antes do despacho', () => {
  const common = route.indexOf('const elencoEpoca = prepararQualidadeDoFilme(')
  const dispatch = route.indexOf('await orchestrateKling4Trial(')
  assert(common > 0 && common < dispatch)
  assert.match(route.slice(common, dispatch), /classicScenePrompts\[i\] = elencoEpoca\.prompts\[i\]/)
  assert.match(route.slice(common, dispatch), /julgarStillDoFilme\(/)
  assert.match(route.slice(common, dispatch), /const kling4Prompts = classicScenePrompts\.map\(\(p, i\) => promptDaCenaKling4\(p, styleAnchor, i\)\)/) // reancorado KINEO-CENA-PEDIDO-3010 — o Kling 4 passa por promptDaCenaKling4 (sem a moldura que comia os 512 + eixo de câmera), que chama promptCurtoDoFilmeKling4 por dentro
  assert.match(route.slice(dispatch, dispatch + 1500), /prompts: kling4Prompts/)
  assert.match(route.slice(dispatch, dispatch + 1700), /seedance15_fallback|submitClassicScenes/)
})
await test('clássico Seedance/Kling2.5/Veo: mesma ficha, estilo e juiz', () => {
  assert.match(route, /const personagem = \{ ativo: qualidadeFilme\.ficha/)
  assert.match(route, /qualidadeFilme\.gerarFolha && anchorActive/)
  assert.match(route, /if \(qualidadeHerdada\?\.style\) Object\.assign\(styleAnchor, qualidadeHerdada\.style\)/)
  const common = route.indexOf('const elencoEpoca = prepararQualidadeDoFilme(')
  const clips = route.indexOf('await orchestrateKling4Trial(')
  assert.match(route.slice(common, clips), /julgarStillDoFilme/)
  assert.match(route, /wantsKling/); assert.match(route, /wantsVeo/)
  assert.match(route.slice(common, clips), /referenciaDaCena\(qualidadeHerdada/)
})
await test('Hollywood Kling4 pago/H3: contrato comum antes dos payloads e juiz em ambos', () => {
  const common = route.indexOf('const aplicarQualidadeHollywood = async')
  const paid = route.indexOf('prepareKling4PaidFilm({ seconds: duration')
  assert(common > 0 && common < paid)
  assert.match(route.slice(common, paid), /prepararQualidadeDoFilme\(/)
  assert.match(route.slice(common, paid), /julgarStillDoFilme\(/)
  assert.match(route.slice(common, paid), /maxRegeracoesCena: 0/)
  assert.match(route.slice(paid), /await aplicarQualidadeHollywood\(\)/)
  assert.match(route.slice(paid), /julgarStillDoFilme\(/)
  assert.match(route, /travarEstiloDoFilme\(scenePrompt/)
})
await test('versão completa Seedance/Kling4: identidade carregada do intent pago e mantida pelo roteirista', async () => {
  assert.match(route, /loadFilmCompleteQuality\(/)
  assert.match(route, /preservarElenco: !!qualidadeHerdada/)
  const server = read('lib/filmComplete/server.ts')
  assert.match(server, /filmQualityWriterDirection\(/)
  assert.match(server, /filmQualityFromBirth\(/)
  assert.match(server, /source_quality/)
  await runQualityInheritanceChecks()
})
await test('versão completa: falas expandidas usam imagens originais nos payloads de Seedance e Kling4', () => {
  runQualityReferenceChecks()
  assert.match(route, /approvedStillUrl: ancoraHerdadaDaCena\(qualidadeHerdada/)
  assert.match(route, /const inheritedUrl = ancoraHerdadaDaCena\(qualidadeHerdada, scenes\[idx\]\.voiceover/)
  assert.match(route, /const url = inheritedUrl \?\? await generateCinematicSceneStill\(/)
  assert.match(route, /generated: !inheritedUrl/)
})
await test('conector Claude/ChatGPT compartilha o endpoint de filmes', () => {
  const source = read('lib/mcp/studioTools.ts')
  assert.match(source, /STUDIO_GENERATE_PATH\s*=\s*['"]\/api\/generate-video-cinematic['"]/)
  assert.match(source, /io\.fetch\(`\$\{ctx\.origin\}\$\{STUDIO_GENERATE_PATH\}`/)
  assert.match(route, /decidirQualidadeDoFilme\(/)
  assert.match(route, /prepararQualidadeDoFilme\(/)
})
await test('anúncio: mesma camada e identidade da foto no juiz existente, sem folha extra', () => {
  const quality = read('lib/ads/cena/filmQuality.ts'), plan = read('lib/ads/cena/plan.ts'), choice = read('lib/ads/cena/escolhaPlan.ts'), stills = read('lib/ads/cena/escolhaStills.ts')
  assert.match(quality, /prepararQualidadeDoFilme\(/)
  assert.match(quality, /presenter/)
  assert.match(plan, /return aplicarQualidadeDoAnuncio\(options\.retomada \? ajustePlanComposition\(\{ \.\.\.plan, quality_notes: quality\.quality_notes \?\? \[\] \}\) : plan\)/)
  assert.match(choice, /aplicarQualidadeDoAnuncio\(plan\)/)
  assert.match(stills, /STILL_CRITIC_IDENTIDADE/)
  assert.match(stills, /qualidadeDoAnuncioParaJuiz\(plan\)/)
  assert(!/generateCinematicSceneStill|gerarStillDaEstrela|fetch\(/.test(quality))
})
await test('anúncio runtime: identidade/foto, 36 combinações e 4 motores sem custo fal novo', provaQualidadeAds)

console.log(`${passed} testes de qualidade passaram; ${failures.length} falha(s).`)
if (failures.length) process.exitCode = 1
