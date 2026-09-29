// KINEO-SEEDANCE-BLOCOS-2026-09-29 [TRAVA 8.2 — "vai conserta" do fundador, 29/09] — guardião: no Seedance 1.5 de 35/60/90 s,
// todo bloco marcado do roteiro vira cena (os vizinhos se juntam), com o MESMO número de clipes de hoje.
//
// Defeito (o mesmo do 15 s, a305d6fc): com mais blocos marcados (HOOK/MICRO REWARD/ESCALATION/RHYTHM/PAYOFF) do que clipes,
// a rota montava as cenas com resolveVerbatimSegments (lib/cinematic/verbatimBeats), que SORTEIA blocos por índice
// (7 blocos em 5 clipes → 0, 2, 3, 5, 6): MICRO REWARD 1 e ESCALATION ficavam sem imagem, a fala deles caía no clipe vizinho
// (a voz lê voiceover_script, a narração inteira) e o ensaio de $0 contava menos palavras do que a voz lê.
// Conserto (app/api/generate-video-cinematic/route.ts, bloco KINEO-SEEDANCE-BLOCOS logo depois do bloco do 15 s): só no
// Seedance 1.5 da estrada clássica, fora do 15 s, roteiro verbatim com blocos > cenas → seedanceShortMarkedScenes(parsedScript,
// scenes.length) (lib/durationByEngine — a lib do 15 s, que já recebe N): N = o que o sorteio já dava, custo igual.
//
// Este guardião EXECUTA as fatias REAIS da rota (dimensionamento #442 → Kling 2.5/Veo modo IA → 15 s → montagem das cenas →
// 15 s → Seedance 35/60/90 → Veo planos/marcado → Kling 2.5 planos), na BASE (a rota sem o bloco, via git) e na árvore:
//   1. a causa na base: com 7/9/12 blocos em 4-9 clipes, pistas [Pexels] somem e o ensaio conta menos que a narração;
//   2. o conserto: toda pista vira cena (exatamente uma), soma das falas = narração, nenhuma cena sem fala, nº de clipes e
//      clipCount = os da base, ensaio conta a narração inteira, a maior cena é a menor possível (força bruta);
//   3. Seedance com blocos <= clipes, prosa, modo IA e 15 s: idêntico à base;
//   4. Kling 2.5, Veo 3.1, Sora, Kling 3/H3/Omni/S25 e Kineo 1 ('fast'), em 35/60/90, verbatim marcado/prosa e modo IA:
//      cenas e clipCount idênticos à base (JSON byte a byte);
//   5. ITEM 2 (voz rápida no 15 s) — o que ficou PROVADO e por que NÃO foi consertado aqui: a recusa acontece ANTES do débito
//      (claim liberado, zero crédito); a voz que fala é escolhida DENTRO do /api/compose (generateTTS por texto + vertical),
//      que não lê persona nenhuma do claim — trocar a persona só na rota passaria o portão com uma voz que o compose não usa;
//   6. mutantes, todos VERMELHOS.
//   7. (revisão de be58db31) o desempate pelo alinhamento: esse filme não assina clip_word_starts, o compose mostra a cena k
//      na fatia igual k·T/N — entre cortes empatados, vence o de menor desvio máximo entre o início da fala da cena e o da
//      sua fatia (força bruta); o 15 s (sem a opção) fica idêntico à lib da base; e um roteiro com UM bloco a mais que clipes
//      (6 → 5) entra na prova (o mutante "> scenes.length + 1" ficava verde).
import { readFileSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import vm from 'node:vm'
import ts from 'typescript'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const RAIZ = resolve(join(dirname(fileURLToPath(import.meta.url)), '..'))
process.chdir(RAIZ) // o loader offline resolve '@/...' a partir do cwd
const LF = String.fromCharCode(10), CR = String.fromCharCode(13)
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').split(CR + LF).join(LF)
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) { ok++; console.log('  ✓ ' + n) } else { falhas.push(n); console.log('  ✗ FALHOU: ' + n) } }
const linhas = (src) => src.split(LF).map((l) => l.trimEnd())
const temLinha = (src, l) => linhas(src).includes(l)
const trocaUma = (src, a, b) => (src != null && src.split(a).length === 2 ? src.split(a).join(b) : null)
const fatia = (src, ini, fim) => { if (src == null) return null; const a = src.indexOf(ini); if (a < 0) return null; const b = src.indexOf(fim, a + ini.length); return b < 0 ? null : src.slice(a, b) }
const eqJ = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const palavras = (t) => String(t ?? '').trim().split(/\s+/).filter(Boolean)
const L = createOfflineLoader()
const SILENCIO = { log() {}, warn() {}, error() {} }
const roda = (src, globals = {}) => {
  if (src == null) throw new Error('fonte ausente')
  const js = ts.transpileModule(src, { compilerOptions: { module: 1, target: 9, esModuleInterop: true } }).outputText
  const exports = {}
  vm.runInNewContext(js, { exports, require: (n) => L(n), console: SILENCIO, process: { env: {} }, ...globals })
  return exports
}

// BASE = a rota sem o marcador: o pai do 1º commit com o marcador na história de HEAD; antes do commit, HEAD; senão origin/main.
const git = (args) => execFileSync('git', args, { cwd: RAIZ, maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] }).toString()
const MARCA = 'KINEO-SEEDANCE-BLOCOS-2026-09-29'
const ROTA_P = 'app/api/generate-video-cinematic/route.ts'
let BASE = null
{
  const candidatos = []
  try { const shas = git(['log', '--format=%H', '--grep=SEEDANCE-BLOCOS', 'HEAD']).trim().split(LF).filter(Boolean); if (shas.length) candidatos.push(shas[shas.length - 1] + '^') } catch { /* sem commit ainda */ }
  candidatos.push('HEAD', 'origin/main')
  for (const ref of candidatos) {
    try { if (!git(['show', `${ref}:${ROTA_P}`]).includes(MARCA)) { BASE = ref; break } } catch { /* próximo */ }
  }
}
const rdBase = (p) => { if (!BASE) return null; try { return git(['show', `${BASE}:${p}`]).split(CR + LF).join(LF) } catch { return null } }
console.log(`   base de comparação: ${BASE ?? '(nenhuma)'}`)

const ROTA = rd(ROTA_P)
const ROTA_BASE = rdBase(ROTA_P)
const D_SRC = rd('lib/durationByEngine.ts')
const D_BASE_SRC = rdBase('lib/durationByEngine.ts')
const D = roda(D_SRC)
const D_BASE = D_BASE_SRC ? roda(D_BASE_SRC) : null
const COMPOSE = rd('app/api/compose/route.ts')
const P = L('lib/scriptParser.ts')
const VB = L('lib/cinematic/verbatimBeats.ts')
const SR = L('lib/speechRate.ts')
const NM = L('lib/narration/niche-mapping.ts')
const K = L('lib/cinematic/klingShots.ts')
const V = L('lib/cinematic/veoShots.ts')
const DR = L('lib/cinematic/classicDryRun.ts')
checa('a base (a rota sem o bloco novo) está disponível', Boolean(BASE && ROTA_BASE && D_BASE) && !ROTA_BASE.includes(MARCA))

// ═══ o harness: as fatias REAIS da rota, na ordem em que a rota as roda ═══
function funcaoDe(src, nome) {
  const ast = ts.createSourceFile('route.ts', src, ts.ScriptTarget.Latest, true)
  let achou = null
  const v = (n) => { if (!achou && ts.isFunctionDeclaration(n) && n.name?.text === nome) achou = n.getText(ast); if (!achou) ts.forEachChild(n, v) }
  v(ast)
  return achou
}
const L_VEO = '    if (wantsVeo) clipCount = Math.max(clipCount, Math.min(12, Math.ceil(duration / 8) + 1))'
const INI_TAM = '    if (verbatim) {\n      const SECONDS_PER_CLIP = (wantsVeo || wantsSora) ? 8 : 10'
const FIM_TAM = '    if (seedanceShortFilm) clipCount = SEEDANCE_SHORT_CLIPS\n'
const INI_CENAS = '    let scenes: { description: string;'
const FIM_CENAS = '    // ═══ KINEO-ZERO-SCENES-FALLBACK-2026-09-04'
const INI_BLOCO = '    // [TRAVA 8.2 — "vai conserta" do fundador, 29/09] KINEO-SEEDANCE-BLOCOS-2026-09-29'
const FIM_BLOCO = '    // ═══ [TRAVA 8.2] VEO-PLANOS-2026-09-29'
const fatiasDe = (src) => ({ ccf: funcaoDe(src, 'clipCountForDuration'), tam: fatia(src, INI_TAM, FIM_TAM), cenas: fatia(src, INI_CENAS, FIM_CENAS) })
const HOLLY = new Set(['hollywood', 'h3', 'omni', 's25'])
const stubCenasIA = async (texto, n) => Array.from({ length: n }, (_, i) => ({ description: `shot ${i} of ${texto.slice(0, 12)}`, voiceover: `Line ${i} of the film.`, caption: `c${i}`, stockSearchQuery: `q${i}` }))
async function rodaRota(src, Dx, { texto, engine, duration, verbatim = null }) {
  const f = fatiasDe(src)
  if (!f.ccf || !f.tam || !f.cenas || !temLinha(src, L_VEO)) return null
  const body = engine === undefined ? {} : { engine }
  const parsedScript = P.parseUserScript(texto)
  const verb = verbatim ?? (parsedScript.hasMarkers && parsedScript.segments.length > 0)
  const hollywoodPath = HOLLY.has(engine)
  const pers = hollywoodPath ? null : NM.selectPersonaForScript(texto, undefined, 'cinematic', 'en')
  const narrationRate = SR.speechRateFor({ family: hollywoodPath ? 'hollywood' : 'classic', speed: parsedScript.speed, language: 'en', voice: pers?.voice, personaSpeed: pers?.defaultSpeed })
  const modulo = `${f.ccf}\nexport async function run() {\n let clipCount = clipCountForDuration(duration)\n${L_VEO}\n${f.tam}${FIM_TAM}${f.cenas}\n return { scenes, clipCount }\n}`
  const out = await roda(modulo, {
    body, parsedScript, verbatim: verb, duration, prompt: texto, narrationRate, hollywoodPath,
    wantsKling: engine === 'kling', wantsVeo: engine === 'veo', wantsSora: engine === 'sora',
    resolveVerbatimSegments: VB.resolveVerbatimSegments, shortCaptionFromVoiceover: (t) => String(t).slice(0, 40),
    generateScenes: stubCenasIA, SCENE_WRITER_INPUT_MAX_CHARS: 12000, classicVisualPolicy: {}, classicWriterOptions: {},
    removerDatasInventadas: (t) => ({ texto: t, removidas: [] }), scrubInventedSetting: (t) => ({ text: t, removed: [] }),
    SEEDANCE_SHORT_SECONDS: Dx.SEEDANCE_SHORT_SECONDS, SEEDANCE_SHORT_CLIPS: Dx.SEEDANCE_SHORT_CLIPS, isSeedance15: Dx.isSeedance15,
    seedanceShortMarkedScenes: Dx.seedanceShortMarkedScenes,
    kling25FootageNeeded: K.kling25FootageNeeded, kling25ShotCount: K.kling25ShotCount, kling25VerbatimPlan: K.kling25VerbatimPlan, kling25VisualHint: K.kling25VisualHint,
    veoFootageNeededAI: V.veoFootageNeededAI, veoShotCountAI: V.veoShotCountAI, veoAverageShotSecondsAI: V.veoAverageShotSecondsAI,
    veoVerbatimPlan: V.veoVerbatimPlan, veoVisualHint: V.veoVisualHint, veoMaxShots: V.veoMaxShots, veoFilmSeconds: V.veoFilmSeconds,
    veoMarkedBeats: V.veoMarkedBeats, veoMarkedPlan: V.veoMarkedPlan, veoClipsUsd: V.veoClipsUsd,
  }).run()
  return { ...out, parsedScript, verbatim: verb }
}

// ═══ os roteiros ═══
// 35 s REAL (produção, o mesmo de scripts/test-entrada-seedance15-2026-09-29.mjs): 7 blocos.
const R35_REAL = 'HOOK (0-2s): [Pexels: foggy lake surface] Lake Nyos: 1,700 dead in one night. How?\n\nMICRO REWARD 1: [Pexels: volcanic craters aerial] Lake Nyos sits atop a dormant volcanic crater in Cameroon.\n\nMICRO REWARD 2: [Pexels: gas bubbling in water] It released a sudden, massive cloud of carbon dioxide.\n\nMICRO REWARD 3: [Pexels: livestock lying on ground] The gas, heavier than air, blanketed the ground silently.\n\nESCALATION: [Pexels: villagers fleeing in panic] It spread over 15 miles, suffocating everything in its path.\n\nRHYTHM: [Pexels: darkening sky over lake] Silent. Deadly. Unstoppable.\n\nPAYOFF: [Pexels: deserted village aftermath] The lake\'s CO2 eruption displaced oxygen, suffocating 1,700 people... in their sleep. Follow for more.'
// 35 s no tamanho do escritor clássico (~3,1 pal/s → ~110 palavras): 7 blocos para 5 clipes — o caso 0, 2, 3, 5, 6 do relato.
const R35 = 'HOOK (0-2s): [Pexels: frozen lake at night] In 1947 a frozen lake in Siberia swallowed an entire truck convoy in a single night, and nobody heard a thing.\n\nMICRO REWARD 1: [Pexels: soviet trucks in snow] Twelve trucks crossed the ice at dusk, carrying fuel and food to a remote radar station on the far shore.\n\nMICRO REWARD 2: [Pexels: cracked ice surface] The ice was almost a meter thick, strong enough for tanks, according to every engineer at the camp.\n\nMICRO REWARD 3: [Pexels: dark water under ice] But the lake sat on a warm spring that thinned the ice from below, invisible from the surface.\n\nESCALATION: [Pexels: headlights in blizzard] At midnight the lead truck broke through, and the others, driving close in the blizzard, followed it down one by one.\n\nRHYTHM: [Pexels: black hole in ice] Silent. Dark. Gone.\n\nPAYOFF: [Pexels: divers near wreck] Divers found the convoy decades later, still in formation, forty meters down. Follow for more.'
// 60 s com 9 blocos (MICRO REWARD 1-5) para 8 clipes.
const R60 = [
  'HOOK (0-2s): [Pexels: ancient library ruins] The greatest library of the ancient world did not burn in one night, and the real story is much stranger than the legend.',
  'MICRO REWARD 1: [Pexels: alexandria harbor] Alexandria was founded by a Greek king who wanted every book on Earth copied into one building.',
  'MICRO REWARD 2: [Pexels: ships in port] Ships entering the harbor had their scrolls seized, copied by scribes, and the owners got the copies back.',
  'MICRO REWARD 3: [Pexels: scrolls on shelves] At its peak the library held hundreds of thousands of scrolls on mathematics, medicine and astronomy.',
  'MICRO REWARD 4: [Pexels: scholars reading] Scholars there measured the size of the Earth and built the first steam toy centuries before the engine.',
  'MICRO REWARD 5: [Pexels: roman soldiers] When Caesar set fire to the ships in the harbor, flames reached some warehouses near the docks, but the library survived.',
  'ESCALATION: [Pexels: empty marble hall] What killed it was slower: kings stopped paying scholars, rulers expelled the intellectuals, and nobody replaced the rotting papyrus.',
  'RHYTHM: [Pexels: dust in sunlight] No fire. No battle. Just neglect.',
  'PAYOFF: [Pexels: crumbling scroll close up] By the time the last building fell, the library had already been dying for four hundred years. Follow for part two.',
].join('\n\n')
// 60 s com 7 blocos para 7 clipes (blocos <= clipes: nada muda).
const R60_IGUAL = [
  'HOOK (0-2s): [Pexels: deep ocean trench] The deepest point on Earth is eleven kilometers down, and only a handful of people have ever been there to see it with their own eyes.',
  'MICRO REWARD 1: [Pexels: submarine descending] In 1960 two men sank into the Challenger Deep inside a steel ball called the Trieste, a trip that took almost five hours.',
  'MICRO REWARD 2: [Pexels: cracked window] Halfway down, a window cracked with a loud bang, and they decided to keep going anyway toward the bottom of the trench.',
  'MICRO REWARD 3: [Pexels: sediment cloud] At the bottom they stayed twenty minutes, but the sediment cloud they raised blocked almost every view of the floor outside.',
  'ESCALATION: [Pexels: pressure gauge] The pressure there is more than a thousand times the air at sea level, enough to crush a car like paper in seconds.',
  'RHYTHM: [Pexels: dark water] Cold. Black. Crushing.',
  'PAYOFF: [Pexels: flatfish on seabed] And yet they reported a flat fish on the floor, proof that life reaches even the deepest place on the planet. Follow for more.',
].join('\n\n')
// 90 s com 12 blocos para 9 clipes (o teto de sempre).
const R90 = Array.from({ length: 12 }, (_, i) => {
  const rotulo = i === 0 ? 'HOOK (0-2s)' : i === 11 ? 'PAYOFF' : i === 9 ? 'ESCALATION' : i === 10 ? 'RHYTHM' : `MICRO REWARD ${i}`
  const frase = i === 10 ? 'Fast. Quiet. Final.' : `Fact number ${i + 1} about the lost city takes the story one step further, and the evidence found there changed what historians believed for a century.`
  return `${rotulo}: [Pexels: lost city view ${i + 1}] ${frase}`
}).join('\n\n')
const PROSA = 'The lighthouse keeper vanished in 1900. Three men lived on the island. The lamp was cold when the ship arrived. The clocks had stopped. The table was set for dinner. Nobody ever found them. The last log entry mentioned a storm that no other station recorded. Follow for more.'
const CURTO15 = 'HOOK (0-2s): [Pexels: foggy lake surface] Lake Nyos killed 1,700 people... in one night.\n\nMICRO REWARD 1: [Pexels: volcanic crater aerial] It\'s a volcanic crater lake in Cameroon, charged with carbon dioxide.\n\nMICRO REWARD 2: [Pexels: gas bubbling water] That night, CO2 suddenly erupted, displacing oxygen, suffocating nearby villages.\n\nPAYOFF: [Pexels: eerie village morning] The silent gas cloud spread fast... taking 1,700 lives in minutes.'
// 35 s com 6 blocos para 5 clipes: UM bloco a mais que clipes (o caso que a revisão de be58db31 achou descoberto).
const R35_SEIS = "HOOK (0-2s): [Pexels: prison island fog] Nobody escaped Alcatraz. Officially, anyway.\n\nMICRO REWARD 1: [Pexels: prison cell bars] In June 1962 three men left dummy heads made of soap and real hair in their beds, and slipped away.\n\nMICRO REWARD 2: [Pexels: air vent grate] For months they had widened the air vents behind their sinks with spoons and a drill built from a vacuum motor.\n\nMICRO REWARD 3: [Pexels: raincoats raft] They sewed more than fifty stolen raincoats into a raft and life vests, sealing the seams with heat from the steam pipes.\n\nESCALATION: [Pexels: dark bay water] That night they paddled into the freezing bay, and the guards only noticed the empty cells after the morning count began.\n\nPAYOFF: [Pexels: wanted poster] No bodies were ever found, and the case stayed open for decades. Would you have tried it? Follow."
const pistasDe = (t) => [...t.matchAll(/\[Pexels:\s*([^\]]+?)\s*\]/g)].map((m) => m[1])
const LONGOS = [
  { nome: '35 s · real de produção (7 blocos)', texto: R35_REAL, duration: 35 },
  { nome: '35 s · tamanho do escritor (7 blocos)', texto: R35, duration: 35 },
  { nome: '35 s · um bloco a mais que clipes (6 blocos)', texto: R35_SEIS, duration: 35 },
  { nome: '60 s · 9 blocos', texto: R60, duration: 60 },
  { nome: '90 s · 12 blocos', texto: R90, duration: 90 },
]
const otimoDe = (ws, k) => { let m = Infinity; const v = (i, g, mx) => { if (g === k - 1) { m = Math.min(m, Math.max(mx, ws.slice(i).reduce((a, b) => a + b, 0))); return } for (let j = i + 1; j <= ws.length - (k - 1 - g); j++) v(j, g + 1, Math.max(mx, ws.slice(i, j).reduce((a, b) => a + b, 0))) }; v(0, 0, 0); return m }
// desvio de alinhamento (|N·início − k·W|, em palavras×N) de um corte; e o melhor possível entre os cortes empatados na
// chave de antes (vazias, maior cena, PAYOFF sozinho, HOOK sozinho) — força bruta, independente da lib.
const desvioDe = (tamanhos, W) => { const N = tamanhos.length; let ac = 0, pior = 0; for (let k = 1; k < N; k++) { ac += tamanhos[k - 1]; pior = Math.max(pior, Math.abs(N * ac - k * W)) } return pior }
const cmpChave = (a, b) => { for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1; return 0 }
function melhorAlinhamento(ws, antes, N) {
  const n = ws.length, W = antes + ws.reduce((a, b) => a + b, 0)
  let chave = null, melhor = Infinity
  const v = (lim) => {
    if (lim.length === N) {
      const L2 = [...lim, n]
      const somas = L2.slice(0, -1).map((a, g) => ws.slice(a, L2[g + 1]).reduce((x, y) => x + y, 0))
      const k = [somas.filter((x) => x === 0).length, Math.max(...somas), L2[N - 1] === n - 1 ? 0 : 1, L2[1] === 1 ? 0 : 1]
      const d = desvioDe(somas.map((x, g) => x + (g === 0 ? antes : 0)), W)
      const c = chave === null ? -1 : cmpChave(k, chave)
      if (c < 0) { chave = k; melhor = d } else if (c === 0) melhor = Math.min(melhor, d)
      return
    }
    for (let c = lim[lim.length - 1] + 1; c <= n - (N - lim.length); c++) v([...lim, c])
  }
  v([0])
  return melhor
}
const alinhado = (x) => {
  const ws = x.parsedScript.segments.map((sg) => palavras(sg.voiceover).length)
  const W = palavras(x.parsedScript.narration).length
  const antes = W - ws.reduce((a, b) => a + b, 0)
  return { tem: desvioDe(x.scenes.map((sc) => palavras(sc.voiceover).length), W), melhor: melhorAlinhamento(ws, antes, x.scenes.length), N: x.scenes.length }
}
const ensaio = (scenes, duration) => DR.classicDryRunReport({ scenes: scenes.map((s) => ({ voiceover: s.voiceover, prompt: 'x' })), targetSeconds: duration, secondsPerClip: 10, verbatim: true }).total_words

// ═══ 1-2. a causa e o conserto ═══
async function provaSeedance(src, Dx, { log = false } = {}) {
  const r = []
  for (const c of LONGOS) {
    for (const engine of [undefined, 'seedance', 'cinematic_ai']) {
      const x = await rodaRota(src, Dx, { texto: c.texto, engine, duration: c.duration })
      const b = ROTA_BASE ? await rodaRota(ROTA_BASE, D_BASE, { texto: c.texto, engine, duration: c.duration }) : null
      if (!x || !b) { r.push(false); continue }
      const narr = x.parsedScript.narration
      const falas = x.scenes.map((s) => s.voiceover)
      const pistas = pistasDe(c.texto)
      const blocos = x.parsedScript.segments.map((s) => palavras(s.voiceover).length)
      const provas = {
        blocosMaisQueClipes: x.parsedScript.segments.length > b.scenes.length,
        mesmoNumero: x.scenes.length === b.scenes.length && x.clipCount === b.clipCount,
        soma: falas.join(' ') === narr,
        semVazia: falas.every((v) => v.trim().length > 0),
        pistas: pistas.every((q) => x.scenes.filter((s) => String(s.stockSearchQuery).split(', ').includes(q)).length === 1) && x.scenes.every((s) => s.description === s.stockSearchQuery),
        ensaio: ensaio(x.scenes, c.duration) === palavras(narr).length,
        otimo: Math.max(...falas.map((v) => palavras(v).length)) === otimoDe(blocos, x.scenes.length),
        alinhado: (() => { const a = alinhado(x); return a.tem === a.melhor })(),
      }
      if (log && engine === undefined) {
        const perdidas = pistas.filter((q) => !b.scenes.some((s) => String(s.stockSearchQuery).split(', ').includes(q)))
        console.log(`     ${c.nome}: ${x.parsedScript.segments.length} blocos ${JSON.stringify(blocos)} · ${b.scenes.length} clipes (base e agora) · base: ensaio ${ensaio(b.scenes, c.duration)}/${palavras(narr).length}, sem imagem: ${perdidas.join(' | ')} · agora: cenas ${JSON.stringify(falas.map((v) => palavras(v).length))}`)
        for (const [k, v] of Object.entries(provas)) if (!v) console.log(`       (falhou: ${k})`)
      }
      r.push(Object.values(provas).every(Boolean))
    }
  }
  return r.length > 0 && r.every(Boolean)
}
console.log('1) a causa: na base, blocos inteiros ficam sem imagem no Seedance de 35/60/90 s')
for (const c of LONGOS) {
  const b = ROTA_BASE ? await rodaRota(ROTA_BASE, D_BASE, { texto: c.texto, engine: 'seedance', duration: c.duration }) : null
  const pistas = pistasDe(c.texto)
  const perdidas = b ? pistas.filter((q) => !b.scenes.some((s) => s.stockSearchQuery === q)) : pistas
  checa(`${c.nome}: a base sorteia ${b?.scenes.length} de ${pistas.length} blocos — ${perdidas.length} pista(s) sem imagem e o ensaio conta ${b ? ensaio(b.scenes, c.duration) : '?'} de ${palavras(b?.parsedScript.narration).length} palavras`,
    Boolean(b) && perdidas.length === pistas.length - b.scenes.length && perdidas.length > 0 && ensaio(b.scenes, c.duration) < palavras(b.parsedScript.narration).length)
}
console.log('2) o conserto: toda pista vira cena, soma das falas = narração, mesmo nº de clipes')
checa('Seedance 1.5 (engine ausente/"seedance"/"cinematic_ai") em 35/60/90 s com 6, 7, 9 e 12 blocos (inclusive UM a mais que clipes): mesmo nº de cenas e clipCount da base; soma das falas = narração; nenhuma cena sem fala; cada pista [Pexels] em exatamente uma cena; o ensaio conta a narração inteira; a maior cena é a menor possível; entre os cortes empatados, o de menor desvio da fatia (força bruta)',
  await provaSeedance(ROTA, D, { log: true }))
{
  const x = await rodaRota(ROTA, D, { texto: R35, engine: 'seedance', duration: 35 })
  const segs = x?.parsedScript.segments ?? []
  checa('35 s (7 blocos, 5 clipes): HOOK sozinho no 1º clipe e PAYOFF sozinho no último; MICRO REWARD 1 e ESCALATION agora têm imagem',
    Boolean(x) && x.scenes.length === 5 && x.scenes[0].voiceover === segs[0].voiceover && x.scenes[4].voiceover === segs[6].voiceover &&
    x.scenes.some((s) => s.stockSearchQuery.split(', ').includes(segs[1].pexelsQuery)) && x.scenes.some((s) => s.stockSearchQuery.split(', ').includes(segs[4].pexelsQuery)))
}

// ═══ 3-4. nada mais muda ═══
async function identicoABase(src, Dx, casos) {
  const difs = []
  for (const k of casos) {
    const a = await rodaRota(src, Dx, k)
    const b = await rodaRota(ROTA_BASE, D_BASE, k)
    if (!a || !b || !eqJ([a.scenes, a.clipCount], [b.scenes, b.clipCount])) difs.push(`${k.engine ?? '(sem engine)'} ${k.duration}s ${k.verbatim === false ? 'IA' : 'verbatim'} ${k.texto.slice(0, 18)}`)
  }
  return difs
}
const TEXTOS = [R35_REAL, R35, R60, R60_IGUAL, R90, PROSA]
const casosDe = (engines, durs) => engines.flatMap((engine) => durs.flatMap((duration) => TEXTOS.flatMap((texto) => [{ texto, engine, duration }, { texto, engine, duration, verbatim: texto === PROSA ? true : false }])))
console.log('3) Seedance sem blocos a mais (blocos <= clipes, prosa, modo IA) e o 15 s: idêntico à base')
{
  const casos = [
    ...['seedance', undefined].flatMap((engine) => [35, 60, 90].flatMap((duration) => [...(duration >= 60 ? [{ texto: R60_IGUAL, engine, duration }] : []), { texto: PROSA, engine, duration, verbatim: true }, { texto: PROSA, engine, duration, verbatim: false }, { texto: R35, engine, duration, verbatim: false }])),
    { texto: CURTO15, engine: 'seedance', duration: 15 }, { texto: PROSA, engine: 'seedance', duration: 15, verbatim: true }, { texto: R35_REAL, engine: 'seedance', duration: 15 },
  ]
  const iguais = []
  for (const duration of [60, 90]) { const b = ROTA_BASE ? await rodaRota(ROTA_BASE, D_BASE, { texto: R60_IGUAL, engine: 'seedance', duration }) : null; iguais.push(Boolean(b) && b.parsedScript.segments.length <= b.scenes.length) }
  checa('pré-condição: o roteiro de 7 blocos em 60/90 s tem blocos <= clipes na base (é o caso "nada muda")', iguais.every(Boolean))
  const difs = ROTA_BASE ? await identicoABase(ROTA, D, casos) : ['sem base']
  checa(`${casos.length} casos (60/90 s com 7 blocos em 7+ clipes, prosa verbatim, modo IA, 15 s marcado/prosa): cenas e clipCount idênticos à base${difs.length ? ' — difere: ' + difs.join('; ') : ''}`, difs.length === 0)
}
console.log('4) outros motores: idênticos à base (Kling 2.5, Veo 3.1, Sora, Kling 3/H3/Omni/S25, Kineo 1)')
const OUTROS = ['kling', 'veo', 'sora', 'hollywood', 'h3', 'omni', 's25', 'fast']
{
  const casos = casosDe(OUTROS, [35, 60, 90])
  const difs = ROTA_BASE ? await identicoABase(ROTA, D, casos) : ['sem base']
  checa(`${casos.length} execuções (${OUTROS.join('/')} × 35/60/90 × 6 roteiros × verbatim/IA): cenas e clipCount byte a byte iguais à base${difs.length ? ' — difere: ' + difs.slice(0, 6).join('; ') : ''}`, difs.length === 0)
  const kling = ROTA_BASE ? await rodaRota(ROTA, D, { texto: R60, engine: 'kling', duration: 60 }) : null
  checa('controle: o Kling 2.5 com 9 blocos continua na política de sempre (o sorteio da base, que este conserto NÃO toca)', Boolean(kling) && eqJ(kling.scenes, (await rodaRota(ROTA_BASE, D_BASE, { texto: R60, engine: 'kling', duration: 60 })).scenes))
}

// ═══ 5. item 2: o que foi provado ═══
console.log('5) item 2 (voz rápida no 15 s): recusa antes do débito; a voz é decidida no /api/compose')
{
  const iRecusa = ROTA.indexOf("        await releaseBirthClaim('narration_too_short_no_charge')")
  const iDebito = ROTA.indexOf('    const upfrontDebit = await ensureCinematicDebit(cost)')
  checa('a recusa de narração curta (portão de 95 %) libera o claim ANTES do débito: nenhuma cobrança na recusa', iRecusa > 0 && iDebito > 0 && iRecusa < iDebito)
  checa('o compose escolhe a voz sozinho (generateTTS(scaledScript, …, vertical, narrationTier, language)) e não lê persona do claim clássico',
    temLinha(COMPOSE, '          audioBuffer = await generateTTS(scaledScript, explicitSpeed ?? 1.0, vertical, narrationTier, language)') &&
    !/response\?\.(narration_persona|classic_persona|persona)/.test(COMPOSE))
  const reguas = ['storyteller', 'futuristic-ai', 'energetic-facts', 'documentary', 'emotional-storyteller', 'dark-mystery', 'luxury-narrator', 'finance-authority', 'conspiracy'].map((id) => {
    const p = L('lib/narration/personas.ts').VOICE_PERSONAS.find((x) => x.id === id)
    const r = SR.speechRateFor({ family: 'classic', language: 'en', voice: p.voice, personaSpeed: p.defaultSpeed }).wordsPerSecond
    return `${id} ${r} (piso 15 s: ${Math.ceil(15 * 0.95 * r)} palavras)`
  })
  console.log(`     régua por persona (pal/s) e palavras mínimas para 95 % de 15 s: ${reguas.join(' · ')}`)
}

// ═══ 7. o desempate pelo alinhamento (revisão de be58db31) ═══
console.log('7) desempate: a cena começa perto da sua fatia do tempo (o compose corta em fatias iguais); o 15 s não muda')
{
  const x = await rodaRota(ROTA, D, { texto: R90, engine: 'seedance', duration: 90 })
  const velho = x ? D_BASE.seedanceShortMarkedScenes(x.parsedScript, x.scenes.length) : null
  const W = x ? palavras(x.parsedScript.narration).length : 0
  const dVelho = velho ? desvioDe(velho.map((c) => palavras(c.voiceover).length), W) / x.scenes.length : NaN
  const dAgora = x ? desvioDe(x.scenes.map((c) => palavras(c.voiceover).length), W) / x.scenes.length : NaN
  console.log(`     90 s, 12 blocos: sem o desempate ${JSON.stringify(velho?.map((c) => palavras(c.voiceover).length))} (desvio máx. ${dVelho.toFixed(1)} palavras) → agora ${JSON.stringify(x?.scenes.map((c) => palavras(c.voiceover).length))} (${dAgora.toFixed(1)})`)
  checa('90 s com 12 blocos: o desvio máximo entre a fala da cena e a sua fatia cai (29,4 → ≤ 12 palavras), com a mesma maior cena', Boolean(x) && dVelho > 29 && dAgora <= 12 && Math.max(...x.scenes.map((c) => palavras(c.voiceover).length)) === Math.max(...velho.map((c) => palavras(c.voiceover).length)))
  let iguais = 0, total = 0, semente = 7
  const aleat = (m) => { semente = (semente * 1103515245 + 12345) % 2147483648; return semente % m }
  for (let t = 0; t < 400; t++) {
    const n = 2 + aleat(9), N = 1 + aleat(6)
    const segs = Array.from({ length: n }, (_, i) => ({ voiceover: Array.from({ length: aleat(4) === 0 ? 0 : 1 + aleat(30) }, (_, j) => `p${i}x${j}`).join(' '), pexelsQuery: `q${i}` }))
    const antesTxt = aleat(3) === 0 ? 'Before the marker. ' : ''
    const parsed = { segments: segs, narration: antesTxt + segs.map((sg) => sg.voiceover).filter(Boolean).join(' ') }
    total++
    if (eqJ(D.seedanceShortMarkedScenes(parsed, N), D_BASE.seedanceShortMarkedScenes(parsed, N))) iguais++
  }
  checa(`sem a opção (o 15 s e qualquer outro chamador): ${iguais}/${total} casos gerados idênticos à lib da base`, iguais === total)
}

// ═══ 6. mutantes ═══
console.log('6) mutantes (todos VERMELHOS)')
{
  checa('o compilador de mutantes, sobre a rota SEM mutação, passa nos predicados', await provaSeedance(ROTA, roda(D_SRC)))
  const bloco = fatia(ROTA, INI_BLOCO, FIM_BLOCO)
  checa('o bloco novo está entre o bloco do 15 s e o VEO-PLANOS, em uma só peça', Boolean(bloco) && ROTA.indexOf('      const juntos = seedanceShortMarkedScenes(parsedScript, SEEDANCE_SHORT_CLIPS)') < ROTA.indexOf(INI_BLOCO))
  const semBloco = bloco ? ROTA.split(bloco).join('') : null
  checa('mutante: a rota sem o bloco (volta o sorteio por índice) → VERMELHO', semBloco !== null && !(await provaSeedance(semBloco, D)))
  const L_GUARDA = "    const seedanceClassicFilm = isSeedance15(typeof body.engine === 'string' ? body.engine : null) && !wantsKling && !wantsVeo && !wantsSora"
  const todos = trocaUma(ROTA, L_GUARDA, '    const seedanceClassicFilm = true')
  const difsTodos = todos ? await identicoABase(todos, D, casosDe(['kling', 'hollywood', 'fast'], [60])) : []
  checa('mutante: o bloco vale para todo motor (sem isSeedance15/!wantsKling/!hollywoodPath) → VERMELHO nos outros motores', todos !== null && difsTodos.length > 0)
  const L_CHAMA = '      const juntosLongo = seedanceShortMarkedScenes(parsedScript, scenes.length, { alinharFatias: true })'
  const sorteia = trocaUma(ROTA, L_CHAMA, '      const juntosLongo = resolveVerbatimSegments(parsedScript, scenes.length)')
  checa('mutante: o bloco usa o sorteio por índice no lugar da junção → VERMELHO', sorteia !== null && !(await provaSeedance(sorteia, D)))
  const muda = trocaUma(trocaUma(ROTA, L_CHAMA, '      const juntosLongo = seedanceShortMarkedScenes(parsedScript, scenes.length - 1)'), '      if (juntosLongo.length === scenes.length) {', '      if (juntosLongo.length > 0) {')
  checa('mutante: a junção muda o número de clipes (um a menos) → VERMELHO', muda !== null && !(await provaSeedance(muda, D)))
  const umBloco = trocaUma(D_SRC, "    return { voiceover: grupo.map((s) => s.voiceover).filter(Boolean).join(' '), pexelsQuery: pistas.join(', ') }", "    return { voiceover: grupo[0].voiceover, pexelsQuery: pistas.join(', ') }")
  let vermelhoLib = false
  try { vermelhoLib = umBloco !== null && !(await provaSeedance(ROTA, roda(umBloco))) } catch { vermelhoLib = umBloco !== null }
  checa('mutante: a lib fica só com a fala do 1º bloco do grupo → VERMELHO', vermelhoLib)
  const semOtimo = trocaUma(D_SRC, '      Math.max(...somas),\n', '')
  let vermelhoOtimo = false
  try { vermelhoOtimo = semOtimo !== null && !(await provaSeedance(ROTA, roda(semOtimo))) } catch { vermelhoOtimo = semOtimo !== null }
  checa('mutante: a lib sem o critério da maior cena → VERMELHO', vermelhoOtimo)
  const semOpcao = trocaUma(ROTA, L_CHAMA, '      const juntosLongo = seedanceShortMarkedScenes(parsedScript, scenes.length)')
  checa('mutante: a rota chama a lib sem { alinharFatias: true } (volta o desempate pelo 1º corte) → VERMELHO', semOpcao !== null && !(await provaSeedance(semOpcao, D)))
  const semDesvio = trocaUma(D_SRC, '      desvioDasFatias(limites), // KINEO-SEEDANCE-BLOCOS: início da cena perto da sua fatia (só com alinharFatias)\n', '')
  let vermelhoDesvio = false
  try { vermelhoDesvio = semDesvio !== null && !(await provaSeedance(ROTA, roda(semDesvio))) } catch { vermelhoDesvio = semDesvio !== null }
  checa('mutante: a lib sem o critério do alinhamento → VERMELHO', vermelhoDesvio)
  const umAMais = trocaUma(ROTA, '    if (seedanceClassicFilm && !seedanceShortFilm && verbatim && scenes.length > 0 && parsedScript.segments.length > scenes.length) {', '    if (seedanceClassicFilm && !seedanceShortFilm && verbatim && scenes.length > 0 && parsedScript.segments.length > scenes.length + 1) {')
  checa('mutante: a guarda exige 2+ blocos a mais que clipes ("> scenes.length + 1") → VERMELHO (o roteiro de 6 blocos em 5 clipes)', umAMais !== null && !(await provaSeedance(umAMais, D)))
}

console.log(`\n${ok} ok · ${falhas.length} falhas`)
if (falhas.length) { console.log('FALHOU:\n - ' + falhas.join('\n - ')); process.exit(1) }
console.log('PASS — no Seedance 1.5 de 35/60/90 s todo bloco marcado vira cena (vizinhos juntos), com o mesmo número de clipes; os outros motores ficam idênticos.')
