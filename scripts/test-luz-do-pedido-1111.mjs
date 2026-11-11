// KINEO-LUZ-DO-PEDIDO-1111 — a luz que o cliente pediu chega à cena e ao plano do Kling 4, SÓ a luz. A prova paga do 657ad797 (11/11, 8,0)
// saiu à noite num pedido de "Natural sunlight enters through large glass windows". A 1ª versão (devolvida pela CEO) colava a 1ª frase que
// CONTINHA palavra de luz em toda cena — "At sunset, the boy finds the wooden box." viraria ação repetida nas 4 cenas.
// Trava (Node puro, fontes reais transpiladas, sem rede): (a) o pedido real do 657ad797 dá a frase de luz inteira (o assunto é a luz);
// (b) frase de enredo dá só a expressão de luz ("at sunset") ou nada ("The neon sign says OPEN", "He drove all night"); (c) dia numa frase e
// noite em outra = nada; (d) os 3 planos reais do 657ad797 refeitos levam "Light: …" e a ficha inteira; (e) uma história com "at night" no
// meio da ação: toda cena leva só "at night", nenhuma leva a frase de ação de outra; (f) a rota põe a luz; mutantes no fim.
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
const R657 = JSON.parse(readFileSync(join(root, 'scripts/test-support/pedido-657ad797-1111.json'), 'utf8'))
const PED = 'lib/cinematic/pessoaDoPedido.ts', FQ = 'lib/cinematic/filmQuality.ts', ROTA = 'app/api/generate-video-cinematic/route.ts'
// uma história (forma de pedido real de 15 s) com "at night" no meio da ação e três cenas clássicas com ações diferentes
const HISTORIA = 'A little girl walks home at night through the old forest and finds a glowing fox hiding under a fallen tree. She follows it to a hidden lake.'
const SUF = ' 9:16 vertical framing, subject framed in the upper two-thirds with the lower third clear for captions, smooth camera motion, no watermark, no logo, no readable text, letters, numbers, labels or signage anywhere in the frame, same photorealistic look in every scene, one consistent color grade and lighting, same lens and film grain, mysterious, natural, documentary, consistent color grade across all scenes, characters act naturally within the scene without addressing the viewer, 9:16 vertical framing'
const CENAS = [
  'Film visual medium: photorealistic, ultra-detailed. photorealistic, ultra-detailed. A little girl walks along a narrow path between tall old trees, holding a small lantern.',
  'Film visual medium: photorealistic, ultra-detailed. photorealistic, ultra-detailed. A glowing fox peeks out from under a fallen mossy tree trunk.',
  'Film visual medium: photorealistic, ultra-detailed. photorealistic, ultra-detailed. The girl and the fox stand at the edge of a still hidden lake.',
].map((c) => c + SUF)

function problems(over) {
  const p = []
  const no = (bad, msg) => { if (bad) p.push(msg) }
  let P, K, S, T, J
  try { const load = loader(over); P = load(PED); K = load('lib/cinematic/cenaKling4.ts'); S = load('lib/cinematic/sceneStyle.ts'); T = load('lib/kling4Trial.ts'); J = load('lib/cinematic/juizFicha.ts') } catch (e) { return [`fonte não carrega: ${e.message}`] }
  // (a) o pedido real
  no(P.luzDoPedido(R657.original) !== 'Natural sunlight enters through large glass windows', `(a) 657ad797 → ${JSON.stringify(P.luzDoPedido(R657.original))}`)
  no(P.luzDoPedido('A cozy kitchen. Soft warm light fills the room.') !== 'Soft warm light fills the room', '(a) "Soft warm light fills the room" (assunto = luz) não veio inteira')
  no(P.luzDoPedido('A quiet harbor scene. Lighting: golden hour.') !== 'Lighting: golden hour', '(a) "Lighting: golden hour" não veio')
  no(P.luzDoPedido('Create a UGC video. Use soft natural daylight, realistic skin texture and minimal cuts.') !== 'soft natural daylight', `(b) "Use soft natural daylight, …" → ${JSON.stringify(P.luzDoPedido('Create a UGC video. Use soft natural daylight, realistic skin texture and minimal cuts.'))}`)
  // (b) frases de enredo
  no(P.luzDoPedido('At sunset, the boy finds the wooden box.') !== 'at sunset', `(b) "At sunset, the boy finds…" → ${JSON.stringify(P.luzDoPedido('At sunset, the boy finds the wooden box.'))} (só a oração de luz)`)
  no(P.luzDoPedido('The neon sign says OPEN. A man waits by the door.') !== null, `(b) "The neon sign says OPEN" virou luz → ${JSON.stringify(P.luzDoPedido('The neon sign says OPEN. A man waits by the door.'))}`)
  no(P.luzDoPedido('He drove all night to reach the coast.') !== null, `(b) "He drove all night" virou luz → ${JSON.stringify(P.luzDoPedido('He drove all night to reach the coast.'))}`)
  no(P.luzDoPedido('No text, no subtitles, no logo at night.') !== null || P.luzDoPedido('The history of the Roman Empire.') !== null, '(b) proibição ou pedido sem luz virou luz')
  // (c) dia numa frase, noite em outra
  const diaNoite = 'In the morning sunlight, Ana opens her bakery. At night, she counts the money alone.'
  no(P.luzDoPedido(diaNoite) !== null, `(c) dia→noite escolheu uma → ${JSON.stringify(P.luzDoPedido(diaNoite))}`)
  // (d) os 3 planos reais do 657ad797
  const style = S.deriveStyleAnchor('photorealistic documentary')
  const pessoa = P.pessoaDoPedido(R657.original), ficha = P.fichaDaPessoa(R657.derivada, pessoa)
  const el = P.elencoComPessoaDoPedido(pessoa, [{ nome: 'the woman', tipo: 'humano', origem: 'deterministica', canonica: R657.sorteada }])
  const luz = P.luzDoPedido(R657.original)
  const prompts = R657.prompts.map((x) => P.comLuzDoPedido(J.trocarFichaNoPrompt(x.split(`consistent design: ${R657.derivada}.`).join(`consistent design: ${ficha}.`), el.trocas), luz))
  no(prompts.some((x) => /dimly lit/i.test(x)) || P.comLuzDoPedido(prompts[0], luz) !== prompts[0], '(d) "dimly lit" ficou contra o sol do pedido, ou a luz entrou duas vezes')
  const mp = T.buildKling4TrialInput(prompts.map((x, i) => K.promptDaCenaKling4(x, style, i, true)), [null, null, null], { voiceovers: R657.falas, wordsPerSecond: R657.wps }).input.multi_prompt
  for (const [i, m] of mp.entries()) {
    no(!m.prompt.includes('Light: Natural sunlight enters through large glass windows.'), `(d) plano ${i + 1}: a luz não chegou → ${m.prompt.slice(0, 120)}`)
    no(!/long neat black braids/.test(m.prompt) || !/cream blouse/.test(m.prompt), `(d) plano ${i + 1}: a luz tomou o lugar da ficha`)
    no(Array.from(m.prompt).length > 512 || !m.prompt.endsWith(' Mouth closed, no speaking.'), `(d) plano ${i + 1}: passou de 512 ou perdeu a cauda`)
  }
  // (e) a história com "at night" no meio da ação
  const luzH = P.luzDoPedido(HISTORIA)
  no(luzH !== 'at night', `(e) história: a luz devia ser só "at night" → ${JSON.stringify(luzH)}`)
  const cenasH = CENAS.map((c) => P.comLuzDoPedido(c, luzH))
  const mpH = T.buildKling4TrialInput(cenasH.map((x, i) => K.promptDaCenaKling4(x, style, i, true)), [null, null, null], { voiceovers: ['A girl walks home at night.', 'She finds a glowing fox.', 'It leads her to a hidden lake.'], wordsPerSecond: 2.45 }).input.multi_prompt
  for (const [i, m] of mpH.entries()) {
    no(!m.prompt.includes('Light: at night.'), `(e) cena ${i + 1}: sem "Light: at night." → ${m.prompt.slice(0, 120)}`)
    no(/walks home|finds a glowing fox|follows it/i.test(m.prompt.replace(/Light: at night\./, '')) && i !== 0, `(e) cena ${i + 1}: a frase de ação do pedido entrou como luz`)
  }
  no(cenasH.some((c) => /girl walks home at night through the old forest/i.test(c)), '(e) a frase de ação do pedido foi colada nas cenas')
  // (f) a rota
  const rota = over[ROTA] ?? read(ROTA)
  no(!rota.includes('classicScenePrompts[i] = comLuzDoPedido(classicScenePrompts[i], luzPedida)'), '(f) a rota não põe a luz do pedido nas cenas')
  return p
}

const atual = problems({})
assert.deepEqual(atual, [], `violações:\n  ${atual.join('\n  ')}`)
let n = 1, falhas = 0
console.log('ok  estado atual limpo (só a luz: frase de luz inteira, expressão de luz da frase de ação, nada em enredo/dia→noite)')
const ped = read(PED), fq = read(FQ), rota = read(ROTA)
const MUT = [
  ['M1 volta a colar a frase que contém a palavra de luz', { [PED]: ped.replace('if (e) achadas.push(e[0].toLowerCase())', 'if (e) achadas.push(t)') }],
  ['M2 qualquer frase com palavra de luz vale como assunto', { [PED]: ped.replace('if (SUJEITO_LUZ_RE.test(t) && n >= 2', 'if ((SUJEITO_LUZ_RE.test(t) || /neon|night|sunset/i.test(t)) && n >= 2') }],
  ['M3 dia→noite escolhe a primeira', { [PED]: ped.replace('if (classes.size > 1) return null', 'if (false) return null') }],
  ['M4 a frase de luz não é mais lida', { [PED]: ped.replace('if (SUJEITO_LUZ_RE.test(t) && n >= 2', 'if (false && n >= 2') }],
  ['M5 o compactador ignora a luz', { [FQ]: fq.replace('const luzPedida = /Lighting as the customer asked: ([^.]+)\\./.exec(prompt)?.[1]?.trim()', 'const luzPedida = undefined as string | undefined') }],
  ['M6 a rota não põe a luz', { [ROTA]: rota.replace('classicScenePrompts[i] = comLuzDoPedido(classicScenePrompts[i], luzPedida)', 'classicScenePrompts[i] = classicScenePrompts[i]') }],
]
for (const [nome, over] of MUT) {
  const [k, v] = Object.entries(over)[0]
  if (v === read(k)) { console.log(`FALHA ${nome}: não aplicou`); falhas++; continue }
  const r = problems(over)
  if (!r.length) { console.log(`FALHA ${nome}: ficou verde`); falhas++ } else { console.log(`ok  ${nome}: vermelho (${r[0].slice(0, 150)})`); n++ }
}
console.log(`${n} ok · ${falhas} falha(s)`)
if (falhas) process.exit(1)
