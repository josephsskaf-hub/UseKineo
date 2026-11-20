import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join, posix } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import ts from 'typescript'

// KINEO-EPOCA-TURCO-2011 — revisor 20/11 18:02: FILME, EPOCA_ERRADA. Kling 4 grátis 15 s, 1º filme, TR, render bcecd459. Pedido em inglês
// ("ultra-realistic cinematic historical documentary about Pompeii in 79 AD"), narração em turco. A trava de época ENTROU em todas as cenas
// ("period piece set strictly in the year 79 AD: … period transport only…"), mas a âncora do monumento abria cada cena com
// "Setting: the ruins of Pompeii, Italy (ancient Roman stone streets and ruined villas, …)": a imagem-chave da cena 1 nasceu como o sítio
// arqueológico de hoje (casas sem teto, cidade moderna ao fundo) com um carro preto na rua, e o Kling 4 animou essa imagem por 5 s.
// O semMarcoAnacronico (KINEO-MARCO-ANACRONICO-1111) já troca marco posterior à época, mas (1) não conhecia a ruína e (2) o anoDaEpoca
// só lia 3–4 dígitos: "the year 79 AD" voltava null. Trava (Node puro, sem rede): o prompt REAL do caso + PT, EN, ES e controles.
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
const M = 'lib/cinematic/marcoAnacronico.ts', MON = 'lib/cinematic/monumentoReal.ts', ROTA = 'app/api/generate-video-cinematic/route.ts'

// A trava de época REAL da rota (eraLockSuffix e as regex dela), recortada e executada — não uma cópia.
function eraLock(rota) {
  const ini = rota.indexOf('const ERA_YEAR_RE =')
  const fimFn = rota.indexOf('function eraLockSuffix(context: string): string {')
  const fim = rota.indexOf('\n}\n', fimFn)
  if (ini < 0 || fimFn < 0 || fim < 0) return null
  const js = ts.transpileModule(`${rota.slice(ini, fim + 3)}\nmodule.exports = eraLockSuffix`, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const module = { exports: null }
  new Function('module', js)(module)
  return module.exports
}

// O texto REAL que foi ao still e ao Kling 4 na cena 1 e 2 (cinematic_submission_claim.kling4_trial.scene_plan[].prompt, 20/11 20:21 UTC).
const TRAVA_79 = 'period piece set strictly in the year 79 AD: every person, building, street, vehicle and object belongs to that exact time — period clothing, period architecture and period transport only, as it really looked then'
const CENA1 = `Film visual medium: photorealistic, ultra-detailed. Opening shot: show the described subject and action immediately in the first frame, clearly readable; no unrelated establishing landscape or slow fade-in. photorealistic, ultra-detailed. Setting: the ruins of Pompeii, Italy (ancient Roman stone streets and ruined villas, Mount Vesuvius looming behind). A breathtaking aerial view of ancient Pompeii, showcasing beautiful Roman buildings and bustling marketplaces under warm Mediterranean sunlight, with Mount Vesuvius looming in the distance. No Asian temples or pagodas, no modern skyscrapers or city skyline. 9:16 vertical framing, subject framed in the upper two-thirds with the lower third clear for captions, smooth camera motion, no watermark, no logo, no readable text, letters, numbers, labels or signage anywhere in the frame, same photorealistic look in every scene, one consistent color grade and lighting, same lens and film grain, mysterious, cinematic_dark, documentary, consistent color grade across all scenes, characters act naturally within the scene without addressing the viewer, ${TRAVA_79}, 9:16 vertical framing`
const CENA2 = `Film visual medium: photorealistic, ultra-detailed. photorealistic, ultra-detailed. Setting: the ruins of Pompeii, Italy (ancient Roman stone streets and ruined villas, Mount Vesuvius looming behind). The camera glides through a lively Roman marketplace, capturing merchants selling vibrant goods, families walking, and children playing, all dressed in authentic Roman attire amidst detailed architecture. No Asian temples or pagodas, no modern skyscrapers or city skyline. 9:16 vertical framing, ${TRAVA_79}, 9:16 vertical framing`
const PEDIDO_REAL = `Create a 15-second ultra-realistic cinematic historical documentary about Pompeii in 79 AD.\n\nVISUAL SCENES:\n\n0–5 seconds:\nA breathtaking aerial view of ancient Pompeii. Beautiful Roman buildings, stone streets, busy marketplaces and Mount Vesuvius in the distance.\n\nTURKISH VOICEOVER:\n"Bir şehir düşün... İnsanlar güne sıradan bir şekilde başladı. MS 79 yılında Pompeii'de hayat tüm canlılığıyla devam ediyordu. Ancak ufukta büyük bir felaket yaklaşıyordu."`
const PEDIDOS = {
  real_en_tr: PEDIDO_REAL,
  pt: 'Documentário histórico ultrarrealista sobre Pompeia em 79 d.C.: a vida no mercado antes da erupção do Vesúvio.',
  en: 'A cinematic documentary about daily life in Pompeii in 79 AD, the morning before Vesuvius erupted.',
  es: 'Documental histórico sobre Pompeya en el año 79 d. C.: la vida en el mercado antes de la erupción.',
}
const MODERNOS = [ // história de HOJE: sem trava de época, nada muda (a ruína é o assunto)
  'A drone tour of the ruins of Pompeii today, tourists walking between the excavated villas.',
  'Tour de drone pelas ruínas de Pompeia hoje, com turistas entre as casas escavadas.',
]

function problems(over) {
  const p = []
  const no = (bad, msg) => { if (bad) p.push(msg) }
  let A, L
  try { A = loader(over)(M); L = loader(over)(MON) } catch (e) { return [`fonte não carrega: ${e.message}`] }
  const rota = over[ROTA] ?? read(ROTA)
  const trava = eraLock(rota)
  if (!trava) return ['(r) eraLockSuffix não encontrado na rota']

  // (a) o texto REAL do caso: a ruína sai, a cidade viva entra, o lugar continua nomeado, o resto byte a byte
  for (const [nome, c] of [['cena 1', CENA1], ['cena 2', CENA2]]) {
    const s = A.semMarcoAnacronico(c)
    no(/ruins of Pompeii|ruined villas/i.test(s), `(a) ${nome}: a ruína ficou → ${s.slice(200, 360)}`)
    no(!/Setting: the living Roman town of Pompeii, Italy \(ancient Roman stone streets and intact red-tiled villas, shops and taverns, Mount Vesuvius looming behind\)\./.test(s), `(a) ${nome}: âncora da cidade viva ausente → ${s.slice(200, 400)}`)
    no(!L.promptTemOLugar(s, L.lugarPrincipal(PEDIDO_REAL)), `(a) ${nome}: o nome do lugar sumiu (a rota reancoraria a ruína)`)
    no(s.replace('the living Roman town of Pompeii', 'the ruins of Pompeii').replace('intact red-tiled villas, shops and taverns', 'ruined villas') !== c, `(a) ${nome}: mudou mais que a ruína`)
    no(!s.includes(TRAVA_79), `(a) ${nome}: a trava de época saiu`)
  }
  // (b) a cadeia real em PT, EN, ES e no pedido do caso: lugarPrincipal → âncora → trava da rota → semMarcoAnacronico
  for (const [nome, ped] of Object.entries(PEDIDOS)) {
    const lugar = L.lugarPrincipal(ped)
    const sufixo = trava(ped)
    no(lugar?.id !== 'pompeii', `(b) ${nome}: Pompeia não reconhecida`)
    no(!/period piece set strictly in the year 79 AD/.test(sufixo), `(b) ${nome}: trava de 79 AD não ligou → "${sufixo.slice(0, 60)}"`)
    const final = A.semMarcoAnacronico(`${L.ancorarLugarNoPrompt('A busy Roman market street at morning', lugar)}${sufixo}`)
    no(/ruins|ruined/i.test(final) || !/living Roman town of Pompeii/.test(final), `(b) ${nome}: → ${final.slice(0, 200)}`)
  }
  // (c) controles: história de hoje sem trava = byte a byte; ruína em época POSTERIOR fica; Coliseu antigo inteiro, moderno em ruína
  for (const ped of MODERNOS) {
    const lugar = L.lugarPrincipal(ped), sufixo = trava(ped)
    const antes = `${L.ancorarLugarNoPrompt('Aerial shot over the excavated streets', lugar)}${sufixo}`
    no(sufixo !== '', `(c) história de hoje ganhou trava de época: ${ped.slice(0, 50)}`)
    no(A.semMarcoAnacronico(antes) !== antes, `(c) história de hoje mudou: ${ped.slice(0, 50)}`)
  }
  const ruina1913 = 'Setting: the ruins of Pompeii, Italy (ancient Roman stone streets and ruined villas). Visitors in hats, period piece set strictly in the year 1913: every person'
  no(A.semMarcoAnacronico(ruina1913) !== ruina1913, '(c) Pompeia em 1913 perdeu a ruína (em 1913 ela já era ruína)')
  const col80 = 'Setting: the Colosseum, Rome, Italy (ancient Roman stone amphitheater with tiered arches, partly ruined outer wall in the heart of Rome). period piece set strictly in the year 80 AD: every person'
  no(/ruined/.test(A.semMarcoAnacronico(col80)), '(c) Coliseu em 80 AD continuou em ruína')
  const col1913 = col80.replace('80 AD', '1913')
  no(A.semMarcoAnacronico(col1913) !== col1913, '(c) Coliseu em 1913 mudou')
  const versalhes = `A street in Paris with the Eiffel Tower behind, period piece set strictly in the year 1913: every person`
  no(A.semMarcoAnacronico(versalhes) !== versalhes, '(c) Torre Eiffel em 1913 mudou (é de 1889)')
  no(/Eiffel/.test(A.semMarcoAnacronico(`Gladiators with the Eiffel Tower behind, ${TRAVA_79}`)), '(c) Torre Eiffel ficou em 79 AD')
  // (d) o ano da época
  const anos = [[TRAVA_79, 79], ['period piece set strictly in the year 44 BC: x', -44], ['period piece set strictly in the year 1913: x', 1913], ['Period setting: 1937 (1930s).', 1937], ['period piece set strictly in the historical era being narrated: x', null], ['no era at all', null]]
  for (const [t, ano] of anos) no(A.anoDaEpoca(t) !== ano, `(d) anoDaEpoca("${t.slice(0, 50)}") = ${A.anoDaEpoca(t)}, esperado ${ano}`)
  // (e) a rota aplica a troca DEPOIS da reancoragem do monumento e antes das imagens-chave
  const iRepara = rota.indexOf('classicScenePrompts[i] = `${ancoraDoLugar(lugarDoPedido)} ${classicScenePrompts[i]}`')
  const iMarco = rota.indexOf('classicScenePrompts[i] = semMarcoAnacronico(classicScenePrompts[i])')
  no(iRepara < 0 || iMarco < 0 || iMarco < iRepara, '(e) a rota não troca o marco depois de reancorar o monumento')
  return p
}

const atual = problems({})
assert.deepEqual(atual, [], `violações:\n  ${atual.join('\n  ')}`)
console.log('ok  estado atual limpo (Pompeia de 79 AD sem ruína no texto real; PT/EN/ES; história de hoje igual; 1913 igual; ano antigo lido)')
const m = read(M)
const MUT = [
  ['M1 anoDaEpoca volta a 3–4 dígitos', { [M]: m.replace('(\\d{1,4})(?:\\s?(AD|CE|BC|BCE))?\\b', '(\\d{3,4})\\b') }],
  ['M2 sem a troca da ruína de Pompeia', { [M]: m.replace("troca: 'the living Roman town of ' },", "troca: 'the ruins of ' },") }],
  ['M3 sem olhar o ano', { [M]: m.replace('if (ano >= m.ano || (m.quando && !m.quando.test(out))) continue', 'if (m.quando && !m.quando.test(out)) continue') }],
  ['M4 BC lido como AD', { [M]: m.replace('/^bc/i.test(m[2]) ? -ano : ano', 'false ? -ano : ano') }],
]
let falhas = 0
for (const [nome, over] of MUT) {
  const mudou = Object.entries(over).some(([k, v]) => v !== read(k))
  const r = mudou ? problems(over) : ['mutante não aplicou']
  if (!mudou || r.length === 0) { falhas++; console.log(`FALHOU  ${nome}: ${mudou ? 'passou verde' : 'não aplicou'}`) } else console.log(`ok  ${nome} → vermelho (${r[0].slice(0, 90)})`)
}
if (falhas) { console.log(`\n${falhas} mutante(s) sobreviveram`); process.exit(1) }
console.log(`\nPASS test-epoca-turco-2011: estado limpo + ${MUT.length} mutantes vermelhos`)
