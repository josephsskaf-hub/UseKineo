// [TRAVA 8.2] VEO-PLANOS-2026-09-29 — guardião dos planos de 4/6/8 s do Veo 3.1.
// Palavra do fundador (29/09 00:30 BRT): "quero foco total hoje para arrumar o Veo, que é um motor que temos que ter a
// partir de agora". Até aqui o Veo rodava 8 s FIXOS por cena (⌈s/8⌉ + 1 planos). Este guardião EXECUTA a lib real e
// fatias reais da rota (readFileSync + transpile + vm; sem rede, sem banco, sem fornecedor) e prova:
//   (a) lib/cinematic/veoShots: roteiro de 150 palavras a 2,3 pal/s → planos 4/6/8 que cabem, cada um, a própria fala
//       (no útil, com folga), soma ≥ fala + respiro, nenhum plano com menos de 25 % da própria fala, nenhuma palavra
//       some; 35 s → ≥ 6 planos; 60 s → planos dentro do teto 12-18;
//   (b) buildFalInput REAL da rota: Veo t2v e i2v recebem '4s'/'6s'/'8s' pelo plano e '8s' sem segundos (o de antes);
//   (c) Seedance / Kling 2.5 / Sora / hollywood: payload JSON-idêntico à base em todas as combinações; klingShots.ts e
//       lib/compose.ts byte a byte; as fatias da rota que pertencem ao Kling e ao Seedance idênticas à base;
//   (d) o claim assinado do Veo (clip_seconds 4|6|8 + clip_word_starts) é alinhado por veoAlignSignedClipPlan e o
//       alinhador do Kling devolve null para ele (a razão de existir do novo); o /api/compose escolhe pelo fal_model;
//   (e) o eixo de variedade do Veo é o mesmo prefixo determinístico do Kling e o strip é o inverso exato;
//   (f) custo por filme: 35 s e 60 s, antes (8 s fixos) e depois, a US$ 0,10/s;
//   (g) mutantes: '8s' fixo de volta no builder → (b) vermelho; passo sem caber a fala → (a) vermelho; compose sem o
//       alinhador do Veo → (d) vermelho.
import { readFileSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import vm from 'node:vm'
import ts from 'typescript'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const RAIZ = resolve(join(dirname(fileURLToPath(import.meta.url)), '..'))
process.chdir(RAIZ)
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) ok++; else { falhas.push(n); console.log('  FALHOU: ' + n) } }
const roda = (src, globals = {}) => {
  const js = ts.transpileModule(src, { compilerOptions: { module: 1, target: 9 } }).outputText
  const exp = {}
  vm.runInNewContext(js, { exports: exp, console: { log() {}, warn() {}, error() {} }, JSON, Math, Number, Array, Object, Set, Map, process: { env: {} }, ...globals })
  return exp
}
const fatia = (src, ini, fim) => { const a = src.indexOf(ini); if (a < 0) return null; const b = src.indexOf(fim, a + ini.length); return b < 0 ? null : src.slice(a, b + fim.length) }
const eqJ = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const palavras = (t) => String(t ?? '').trim().split(/\s+/).filter(Boolean)
const git = (args) => execFileSync('git', args, { cwd: RAIZ, maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] }).toString()

// BASE = o "antes" deste trabalho: o pai do commit mais antigo "VEO-PLANOS" na história de HEAD; antes do commit existir,
// o próprio HEAD; senão origin/main. A base escolhida tem de NÃO conter o marcador.
let BASE = null
{
  const candidatos = []
  try { const shas = git(['log', '--format=%H', '--grep=VEO-PLANOS', 'HEAD']).trim().split('\n').filter(Boolean); if (shas.length) candidatos.push(shas[shas.length - 1] + '^') } catch { /* sem commit ainda */ }
  candidatos.push('HEAD', 'origin/main')
  for (const ref of candidatos) {
    try { if (!git(['show', `${ref}:app/api/generate-video-cinematic/route.ts`]).includes('VEO-PLANOS-2026-09-29')) { BASE = ref; break } } catch { /* tenta o próximo */ }
  }
}
console.log(`   base de comparação: ${BASE ?? '(nenhuma)'}`)
const rdBase = (p) => { if (!BASE) return null; try { return git(['show', `${BASE}:${p}`]).replace(/\r\n/g, '\n') } catch { return null } }
checa('a base (o Veo a 8 s fixos) está disponível para as comparações byte a byte', Boolean(BASE))

const ROTA = 'app/api/generate-video-cinematic/route.ts'
const rota = rd(ROTA)
const rotaBase = rdBase(ROTA)
const routeAst = (src) => ts.createSourceFile('route.ts', src, ts.ScriptTarget.Latest, true)
function acha(ast, pred) { let f; const v = (n) => { if (!f && pred(n)) f = n; if (!f) ts.forEachChild(n, v) }; v(ast); return f }
const funcaoDe = (src, nome) => { const ast = routeAst(src); const n = acha(ast, (x) => ts.isFunctionDeclaration(x) && x.name?.text === nome); return n ? n.getText(ast) : null }
const varDe = (src, nome) => { const ast = routeAst(src); const n = acha(ast, (x) => ts.isVariableDeclaration(x) && x.name.getText(ast) === nome); return n ? `const ${nome} = ${n.initializer.getText(ast)};` : null }

// ═══ (a) a lib real ═══
console.log('== (a) lib/cinematic/veoShots ==')
const load = createOfflineLoader({})
const V = load('@/lib/cinematic/veoShots')
const K = load('@/lib/cinematic/klingShots')
const ROTEIRO_150 = 'In 1942, the sky above Los Angeles lit up with anti-aircraft fire. For over an hour, gunners fired more than fourteen hundred shells at something no one could identify. Searchlights converged on a single object drifting slowly over the coast. Witnesses described a glowing shape that never changed course, even under direct fire. Not a single bomb fell, and no wreckage was ever recovered. The next morning, newspapers printed photographs of the beams crossing in the dark. The Army said it was nerves; the Navy said there was nothing there at all. Five people died that night, from car accidents and heart attacks during the blackout. Decades later, declassified memos still disagree about what the gunners were shooting at. Some say a weather balloon; others say the fog itself was the enemy. Whatever it was, the city fired for an hour and hit nothing. The mystery of the Battle of Los Angeles has never been solved, and it probably never will be.'
const ROTEIRO_100 = palavras(ROTEIRO_150).slice(0, 100).join(' ')
const ROTEIRO_180 = ROTEIRO_150 + ' Every February, people still gather on the same beach and look up, waiting for the beams to cross again. They never do.'
checa(`roteiro de teste tem ~150 palavras (${palavras(ROTEIRO_150).length})`, palavras(ROTEIRO_150).length >= 140 && palavras(ROTEIRO_150).length <= 170)
checa('tabela de passos do Veo = 4 / 6 / 8 s (schema da fal veo3.1/fast) e preço US$ 0,10/s', eqJ([...V.VEO_SHOT_STEPS], [4, 6, 8]) && V.VEO_USD_PER_SECOND === 0.1)
checa('preço na fonte: docs/PRECOS-MOTORES-V4.md cita o Veo a $0.10/s', /Veo 3\.1 Fast \| fal-ai\/veo3\.1\/fast \| \$0\.10/.test(rd('docs/PRECOS-MOTORES-V4.md')))

const useful = (s) => K.kling25UsefulSeconds(s)
const provaPlano = (nome, roteiro, duration, wps) => {
  const p = V.veoVerbatimPlan(roteiro, { durationSeconds: duration, wordsPerSecond: wps })
  const W = palavras(roteiro)
  const cabe = p.chunks.every((c, i) => palavras(c).length / p.pace <= useful(p.seconds[i]) - V.VEO_FIT_SLACK_SECONDS + 1e-6)
  const somaUtil = p.seconds.reduce((a, s) => a + useful(s), 0)
  const fala = W.length / p.pace
  const respiro = V.VEO_FIT_SLACK_SECONDS * p.seconds.length
  const quartos = p.chunks.every((c, i) => useful(p.seconds[i]) >= 0.25 * (palavras(c).length / p.pace))
  const todos = p.seconds.every((s) => s === 4 || s === 6 || s === 8)
  const inteiro = p.chunks.join(' ') === W.join(' ')
  const cobre = somaUtil + 1e-6 >= p.needSeconds
  console.log(`   ${nome}: ${p.seconds.length} planos [${p.seconds.join(',')}] = ${p.seconds.reduce((a, b) => a + b, 0)}s de imagem (útil ${somaUtil.toFixed(1)}s) para ${fala.toFixed(1)}s de fala, filme ${p.needSeconds}s, passo ${p.pace}, cabe ${p.fit.join('/')} pal`)
  return { p, cabe, somaUtil, fala, respiro, quartos, todos, inteiro, cobre }
}
const r150 = provaPlano('150 palavras · 60 s · 2,3', ROTEIRO_150, 60, 2.3)
checa('150 palavras a 2,3: todo plano é 4, 6 ou 8 s', r150.todos)
checa('150 palavras a 2,3: cada plano cabe a própria fala no útil com a folga', r150.cabe)
checa('150 palavras a 2,3: soma útil ≥ fala + respiro', r150.somaUtil + 1e-6 >= r150.fala + r150.respiro)
checa('150 palavras a 2,3: nenhum plano com menos de 25 % da própria fala', r150.quartos)
checa('150 palavras a 2,3: nenhuma palavra some, nenhuma muda de ordem', r150.inteiro)
checa('150 palavras a 2,3: a imagem cobre o filme (relógio = fala no passo, ≥ 61,5 s)', r150.cobre && r150.p.needSeconds === Math.round(Math.max(61.5, palavras(ROTEIRO_150).length / 2.3) * 10) / 10)
const r100 = provaPlano('100 palavras · 35 s · 2,3', ROTEIRO_100, 35, 2.3)
checa('35 s (100 palavras): ≥ 6 planos', r100.p.seconds.length >= 6)
checa('35 s (100 palavras): variedade real — mais planos que os 6 × 8 s de antes e pelo menos dois passos diferentes', r100.p.seconds.length >= 7 && new Set(r100.p.seconds).size >= 2)
checa('35 s (100 palavras): cabe a fala, cobre o filme, nada some', r100.cabe && r100.cobre && r100.inteiro)
const r180 = provaPlano('180 palavras · 60 s · 2,3', ROTEIRO_180, 60, 2.3)
checa('60 s (180 palavras): entre 12 e 18 planos, cabe a fala, cobre o filme', r180.p.seconds.length >= 12 && r180.p.seconds.length <= 18 && r180.cabe && r180.cobre && r180.inteiro)
checa('60 s (150 e 180 palavras): mais planos que os 9 × 8 s de antes (12-14) e três passos em uso', r150.p.seconds.length >= 12 && r180.p.seconds.length >= 12 && new Set(r180.p.seconds).size === 3)
const rLenta = provaPlano('150 palavras · 60 s · voz 2,0', ROTEIRO_150, 60, 2.0)
checa('voz mais lenta (2,0 pal/s): o passo segue a voz e cada plano ainda cabe a fala', rLenta.p.pace === 2 && rLenta.cabe && rLenta.cobre)
checa('teto: modo IA 12; roteiro pronto 35 s → 13, 60 s → 18, 90 s → 18 (nunca acima de 18)', V.veoMaxShots({ verbatim: false, footageSeconds: 90 }) === 12 && V.veoMaxShots({ verbatim: true, footageSeconds: 43.5 }) === 13 && V.veoMaxShots({ verbatim: true, footageSeconds: 61.5 }) === 18 && V.veoMaxShots({ verbatim: true, footageSeconds: 90 }) === 18)
checa('veoFalDuration: 4 → "4s", 6 → "6s", 8 → "8s", sem segundos → "8s"', V.veoFalDuration(4) === '4s' && V.veoFalDuration(6) === '6s' && V.veoFalDuration(8) === '8s' && V.veoFalDuration(undefined) === '8s' && V.veoFalDuration(null) === '8s')
checa('veoSceneSeconds (roteiro marcado): 5 palavras → 4 s, 10 → 6 s, 16 → 8 s; cobertura promove do fim', eqJ(V.veoSceneSeconds([5, 10, 16], 0, 2.3), [4, 6, 8]) && eqJ(V.veoSceneSeconds([5, 5, 5], 14, 2.3), [4, 6, 6]))

// ═══ (b) o builder real da fal ═══
console.log('== (b) buildFalInput real ==')
const aspect = load('@/lib/aspect')
const policy = load('@/lib/cinematic/visualPromptPolicy')
const router = rd('lib/hollywood/router.ts')
const routerNames = ['HOLLYWOOD_MODELS', 'KLING3_I2V_MODEL', 'H3_MODELS', 'H3_I2V_MODEL', 'H3_RESOLUTION', 'OMNI_I2V_MODEL', 'S25_I2V_MODEL', 'S25_T2V_MODEL', 'S25_RESOLUTION']
const R = roda(routerNames.map((n) => `export ${varDe(router, n)}`).join('\n'))
const modelNames = ['SEEDANCE_MODEL', 'KLING_MODEL', 'KLING_I2V_MODEL', 'SEEDANCE_I2V_MODEL', 'VEO_I2V_MODEL', 'VEO_MODEL', 'SORA_MODEL', 'KLING3_MODEL']
const montaBuilder = (src) => {
  const fn = funcaoDe(src, 'buildFalInput')
  if (!fn) return null
  return roda(modelNames.map((n) => varDe(src, n)).join('\n') + '\n' + fn + `\nObject.assign(exports, { buildFalInput, ${modelNames.join(', ')} });`,
    { ...R, H3_PROMPT_EXPANSION: 'disabled', aspectSpec: aspect.aspectSpec, classicVisualNegativePrompt: policy.classicVisualNegativePrompt })
}
const B = montaBuilder(rota)
const Bb = rotaBase ? montaBuilder(rotaBase) : null
const IMG = 'https://v3.fal.media/files/still-1.png'
const builderVeoOk = (b) => {
  if (!b) return false
  const d = (m, s, img) => b.buildFalInput(m, 'shot', false, false, s, img, 17, false, '9:16', 'documentary_faceless').duration
  return d(b.VEO_MODEL, 4) === '4s' && d(b.VEO_MODEL, 6) === '6s' && d(b.VEO_MODEL, 8) === '8s' && d(b.VEO_MODEL, undefined) === '8s' &&
    d(b.VEO_I2V_MODEL, 4, IMG) === '4s' && d(b.VEO_I2V_MODEL, 6, IMG) === '6s' && d(b.VEO_I2V_MODEL, 8, IMG) === '8s' && d(b.VEO_I2V_MODEL, undefined, IMG) === '8s'
}
checa('buildFalInput real: Veo t2v e i2v mandam "4s"/"6s"/"8s" pelo plano e "8s" sem segundos', builderVeoOk(B))
checa('buildFalInput real: o plano do Veo é a única mudança do payload (1080p, sem áudio, safety 5, negative, seed iguais)', (() => {
  const a = B.buildFalInput(B.VEO_MODEL, 'shot', false, false, 4, undefined, 17, false, '9:16', 'documentary_faceless')
  const b = Bb ? Bb.buildFalInput(Bb.VEO_MODEL, 'shot', false, false, 4, undefined, 17, false, '9:16', 'documentary_faceless') : null
  return b && eqJ({ ...a, duration: 0 }, { ...b, duration: 0 }) && b.duration === '8s'
})())
checa('base: o Veo mandava "8s" com qualquer segundos (o defeito)', Bb && Bb.buildFalInput(Bb.VEO_MODEL, 'shot', false, false, 4, undefined, 17, false, '9:16', 'documentary_faceless').duration === '8s')

// ═══ (c) o resto byte a byte ═══
console.log('== (c) Seedance / Kling / Sora / hollywood idênticos à base ==')
if (Bb) {
  const casos = []
  const modelos = [['SEEDANCE_MODEL'], ['SEEDANCE_I2V_MODEL', IMG], ['SORA_MODEL'], ['KLING_MODEL'], ['KLING_I2V_MODEL', IMG]]
  for (const [nome, img] of modelos) for (const aspecto of ['9:16', '16:9', null]) for (const modo of ['documentary_faceless', 'character_story', 'presenter']) for (const stylized of [false, true]) for (const s of [4, 5, 6, 8, 10, undefined]) {
    casos.push(eqJ(B.buildFalInput(B[nome], 'A basalt coast at dusk', false, false, s, img, 4242, stylized, aspecto, modo), Bb.buildFalInput(Bb[nome], 'A basalt coast at dusk', false, false, s, img, 4242, stylized, aspecto, modo)))
  }
  checa(`Seedance t2v/i2v, Sora, Kling 2.5 t2v/i2v: payload JSON-idêntico à base em ${casos.length} combinações (com 4/6/8 s inclusive)`, casos.length === 540 && casos.every(Boolean))
  const holly = []
  for (const m of [R.KLING3_I2V_MODEL, R.HOLLYWOOD_MODELS.dialogue, R.H3_I2V_MODEL, R.H3_MODELS.dialogue, R.OMNI_I2V_MODEL, R.S25_I2V_MODEL, R.S25_T2V_MODEL, B.SEEDANCE_MODEL, B.VEO_MODEL]) for (const s of [4, 5, 6, 8, 10, undefined]) {
    holly.push(eqJ(B.buildFalInput(m, 'Mira says: "hello"', true, true, s, IMG, undefined, false, '9:16'), Bb.buildFalInput(m, 'Mira says: "hello"', true, true, s, IMG, undefined, false, '9:16')))
  }
  checa(`família hollywood (inclusive o Veo hollywood a "8s"): payload JSON-idêntico à base em ${holly.length} combinações`, holly.length === 54 && holly.every(Boolean))
}
checa('lib/cinematic/klingShots.ts byte a byte igual à base', rdBase('lib/cinematic/klingShots.ts') === rd('lib/cinematic/klingShots.ts'))
checa('lib/compose.ts byte a byte igual à base', rdBase('lib/compose.ts') === rd('lib/compose.ts'))
checa('lib/cinematic/classicDryRun.ts byte a byte igual à base', rdBase('lib/cinematic/classicDryRun.ts') === rd('lib/cinematic/classicDryRun.ts'))
const fatiasKling = [
  ['let kling25Footage = 0', 'clipCount = planos\n    }'],
  ['if (wantsKling && verbatim && parsedScript.segments.length === 0', 'clipCount = scenes.length\n      }\n    }'],
  ['let kling25ClipSeconds: number[] | null = null', 'necessário ${kling25Footage}s)`)\n    }'],
  ['if (model === KLING_I2V_MODEL) {', 'if (model === KLING_MODEL) {'],
  ['if (model === SEEDANCE_I2V_MODEL) {', 'if (model === VEO_I2V_MODEL) {'],
  ['if (model === SORA_MODEL) {', 'if (model === VEO_MODEL) {'],
  ['if (verbatim) {\n      const SECONDS_PER_CLIP', 'clipCount = sized\n      }\n    }'],
]
for (const [ini, fim] of fatiasKling) {
  const a = fatia(rota, ini, fim), b = rotaBase ? fatia(rotaBase, ini, fim) : null
  checa(`fatia da rota "${ini.slice(0, 40).replace(/\n/g, ' ')}…" idêntica à base`, a !== null && a === b)
}
checa('a rota só chama o novo módulo sob wantsVeo (veoVerbatimPlan, veoSceneSeconds, veoApplyShotAxis, veoStripShotAxis, uma vez cada)', (() => {
  const conta = (re) => (rota.match(re) || []).length
  const bloco1 = fatia(rota, 'if (wantsVeo && verbatim && parsedScript.segments.length === 0 && scenes.length > 0) {', 'clipCount = scenes.length\n      }\n    }')
  const bloco2 = fatia(rota, 'if (wantsVeo && verbatim && scenes.length > 0) {', '(antes: ${scenes.length} × 8 s)`)\n    }')
  return conta(/veoVerbatimPlan\(/g) === 1 && bloco1 && bloco1.includes('veoVerbatimPlan(') && conta(/veoSceneSeconds\(/g) === 1 && bloco2 && bloco2.includes('veoSceneSeconds(') &&
    conta(/veoApplyShotAxis\(/g) === 1 && conta(/veoStripShotAxis\(/g) === 1 && rota.split('\n').filter((l) => /veoApplyShotAxis\(|veoStripShotAxis\(/.test(l) && !l.includes('import ')).every((l) => l.includes('if (wantsVeo)'))
})())
checa('a rota: o ternário do Kling fica literal e o Veo aplica o eixo no mesmo vetor logo depois, sob wantsVeo', rota.includes('.map((promptDaCena, sceneIndex) => (wantsKling ? kling25ApplyShotAxis(promptDaCena, sceneIndex) : promptDaCena))\n') && rota.includes('if (wantsVeo) for (let i = 0; i < classicScenePrompts.length; i++) classicScenePrompts[i] = veoApplyShotAxis(classicScenePrompts[i], i)'))
checa('a rota: still em todas as cenas e 60 s de orçamento também no Veo (linhas do Kling literais; Seedance segue 6 / 30 s)', rota.includes("const MAX_ANCHORED_SCENES = anchorEngine === 'kling' ? scenes.length : 6") && rota.includes("const veoAnchorsAll = anchorEngine === 'veo'") && rota.includes('const anchorCount = Math.min(scenes.length, veoAnchorsAll ? scenes.length : MAX_ANCHORED_SCENES)') && rota.includes('const stillDeadline = Date.now() + (veoAnchorsAll ? 60_000 : STILL_BUDGET_MS)'))
checa('a rota: o juiz do Veo recebe o prompt sem o eixo por splice (a rota mantém UMA atribuição a c.submittedPrompts[sceneIndex])', rota.includes('if (wantsVeo) c.submittedPrompts.splice(sceneIndex, 1, veoStripShotAxis(cinematic).slice(0, 240))') && rota.split('c.submittedPrompts[sceneIndex] =').length - 1 === 1)
checa('a rota: o claim assinado leva clip_seconds + clip_word_starts para toda cena com clipSeconds (Kling e Veo, mesmo campo)', rota.includes("...(scenes.some((s) => typeof s.clipSeconds === 'number') ? { clip_seconds: scenes.map((s) => s.clipSeconds ?? null), clip_word_starts: kling25SceneWordStarts(voiceoverScript, scenes.map((s) => s.voiceover)) } : {})"))
checa('a rota: o ensaio de $0 mostra os planos do Veo (relatorioVeo com sceneSeconds: veoClipSeconds; clip_seconds, clips_usd, clips_usd_before)', rota.includes('sceneSeconds: veoClipSeconds, clipLossSeconds: KLING25_CLIP_LOSS_SECONDS, sceneFitWordsPerSecond: veoPasso, sceneFitStrict: verbatim') && rota.includes('...(relatorioVeo ?? {}),') && rota.includes('clips_usd_before: veoClipsUsd(veoClipSeconds.map(() => 8))'))

// ═══ (d) o claim assinado do Veo no compose ═══
console.log('== (d) claim assinado → compose ==')
const urls = ['https://v3.fal.media/files/a.mp4', 'https://v3.fal.media/files/b.mp4', null, 'https://v3.fal.media/files/d.mp4']
const claimVeo = { fal_model: 'fal-ai/veo3.1/fast', voiceover_script: ROTEIRO_100, clip_seconds: [4, 6, 8, 6], clip_word_starts: [0, 20, 45, 70] }
const alinhado = V.veoAlignSignedClipPlan(claimVeo, urls, urls.filter(Boolean))
checa('veoAlignSignedClipPlan: 4|6|8 alinhados às URLs completas (a cena sem URL cai fora) e os inícios de fala junto', alinhado && eqJ(alinhado.seconds, [4, 6, 6]) && eqJ(alinhado.wordStarts, [0, 20, 70]) && alinhado.narrationWords.length === 100)
checa('o alinhador do Kling devolve null para o claim do Veo (5|10 só): por isso o novo existe', K.alignSignedClipPlan(claimVeo, urls, urls.filter(Boolean)) === null)
checa('veoAlignSignedClipPlan: valor fora de 4|6|8 → null; URL trocada → null; sem clip_seconds → null', V.veoAlignSignedClipPlan({ ...claimVeo, clip_seconds: [4, 5, 8, 6] }, urls, urls.filter(Boolean)) === null && V.veoAlignSignedClipPlan(claimVeo, urls, ['x', 'y', 'z']) === null && V.veoAlignSignedClipPlan({ fal_model: 'fal-ai/veo3.1/fast' }, urls, urls.filter(Boolean)) === null)
checa('isVeoClaim: veo3.1/fast e veo3.1/fast/image-to-video sim; Kling, Seedance, Sora, sem fal_model não', V.isVeoClaim({ fal_model: 'fal-ai/veo3.1/fast' }) && V.isVeoClaim({ fal_model: 'fal-ai/veo3.1/fast/image-to-video' }) && !V.isVeoClaim({ fal_model: 'fal-ai/kling-video/v2.5-turbo/pro/text-to-video' }) && !V.isVeoClaim({ fal_model: 'fal-ai/bytedance/seedance/v1.5/pro/text-to-video' }) && !V.isVeoClaim({}) && !V.isVeoClaim(null))
const composeRota = rd('app/api/compose/route.ts')
checa('/api/compose: a linha do Kling fica literal e o claim do Veo só entra no alinhador do Veo quando ela devolve null', composeRota.includes('      signedClipPlan = alignSignedClipPlan(cinematicBirthClaim.response, cinematicBirthClaim.authorizedCompletedUrls, clipUrls)\n') && composeRota.includes('if (!signedClipPlan && isVeoClaim(cinematicBirthClaim.response)) signedClipPlan = veoAlignSignedClipPlan(cinematicBirthClaim.response, cinematicBirthClaim.authorizedCompletedUrls, clipUrls)'))
const compose = rd('lib/compose.ts')
checa('lib/compose aceita qualquer comprimento assinado entre 0,5 e 30 s (4/6/8 passam) — não filtra por motor', compose.includes('clipSeconds.every((s) => typeof s === \'number\' && Number.isFinite(s) && s > 0.5 && s <= 30)') && !/planCappedClipTimeline[\s\S]{0,400}(kling|veo|seedance)/i.test(compose.slice(compose.indexOf('export function planCappedClipTimeline'))))
{
  const C = load('@/lib/compose')
  const t = C.planCappedClipTimeline({ clipSeconds: [4, 6, 8, 6], totalDuration: 21, trimStart: 0.1, overlap: 0.06 })
  checa('planCappedClipTimeline real com [4,6,8,6]: nenhum trecho passa do comprimento do clipe (trimStart + len ≤ segundos)', Array.isArray(t) && t.length > 0 && t.every((x) => x.trimStart + x.len <= [4, 6, 8, 6][x.clip] + 1e-6))
}

// ═══ (e) eixo de variedade ═══
console.log('== (e) eixo de variedade ==')
const PROMPT = 'A lone lighthouse on a basalt coast at dusk, waves crashing, rain streaks on the lens. No readable text, no watermark. Vertical 9:16 composition.'
checa('veoApplyShotAxis: prefixo do eixo por índice, 12 vizinhos distintos, prompt inteiro preservado', Array.from({ length: 12 }, (_, i) => V.veoApplyShotAxis(PROMPT, i)).every((p, i, arr) => p.startsWith(K.kling25ShotAxis(i) + '. ') && p.endsWith(PROMPT) && (i === 0 || !p.startsWith(arr[i - 1].split('. ')[0]))))
checa('veoStripShotAxis é o inverso exato para o juiz', Array.from({ length: 12 }, (_, i) => V.veoStripShotAxis(V.veoApplyShotAxis(PROMPT, i)) === PROMPT).every(Boolean) && V.veoStripShotAxis(PROMPT) === PROMPT)

// ═══ (f) custo ═══
console.log('== (f) custo por filme (clipes, US$ 0,10/s; stills FLUX à parte) ==')
const custo = (nome, r, antesPlanos) => {
  const depois = V.veoClipsUsd(r.p.seconds), antes = antesPlanos * 8 * 0.1
  console.log(`   ${nome}: antes ${antesPlanos} × 8 s = US$ ${antes.toFixed(2)} · depois ${r.p.seconds.length} planos = US$ ${depois.toFixed(2)} (${depois >= antes ? '+' : ''}${(depois - antes).toFixed(2)})`)
  return depois
}
const c35 = custo('35 s (100 palavras)', r100, 6)
const c60 = custo('60 s (150 palavras)', r150, 9)
const c60b = custo('60 s (180 palavras)', r180, 9)
checa('custo: 35 s fica entre US$ 4,00 e 6,50 e 60 s entre US$ 6,00 e 10,00 (a imagem segue a fala, não o botão)', c35 >= 4 && c35 <= 6.5 && c60 >= 6 && c60 <= 10.5 && c60b >= 6 && c60b <= 10.5)

// ═══ (g) mutantes ═══
console.log('== (g) mutantes ==')
const libSrc = rd('lib/cinematic/veoShots.ts')
const mutanteLib = (troca) => { const s = troca(libSrc); if (s === libSrc) throw new Error('mutante não aplicou'); return load.fromSource ? load.fromSource(s) : null }
{
  // builder da rota com '8s' fixo de volta
  const rotaMut = rota.split("typeof seconds === 'number' && seconds > 0 && seconds <= 4 ? '4s' : typeof seconds === 'number' && seconds > 0 && seconds <= 6 ? '6s' : '8s'").join("'8s'")
  if (rotaMut === rota) throw new Error('mutante do builder não aplicou')
  checa('mutante do builder ("8s" fixo de volta): (b) fica vermelho', !builderVeoOk(montaBuilder(rotaMut)))
}
{
  // planejador que ignora a fala: todo bloco em 4 s
  const s = libSrc.split('for (let k = 0; k < VEO_SHOT_STEPS.length; k++) if (words <= fit[k]) return VEO_SHOT_STEPS[k]').join('return VEO_SHOT_STEPS[0]')
  if (s === libSrc) throw new Error('mutante do passo não aplicou')
  const js = ts.transpileModule(s.replace(/from '\.\/klingShots'/, "from '@/lib/cinematic/klingShots'"), { compilerOptions: { module: 1, target: 9 } }).outputText
  const exp = {}
  vm.runInNewContext(js, { exports: exp, require: (n) => load(n), console: { log() {}, warn() {}, error() {} }, JSON, Math, Number, Array, Object, Set, Map })
  const p = exp.veoVerbatimPlan(ROTEIRO_150, { durationSeconds: 60, wordsPerSecond: 2.3 })
  const cabe = p.chunks.every((c, i) => palavras(c).length / p.pace <= useful(p.seconds[i]) - V.VEO_FIT_SLACK_SECONDS + 1e-6)
  checa('mutante do passo (todo plano em 4 s, cego à fala): "cada plano cabe a própria fala" fica vermelho', !cabe)
}
{
  const composeMut = composeRota.split('if (!signedClipPlan && isVeoClaim(cinematicBirthClaim.response)) signedClipPlan = veoAlignSignedClipPlan(').join('if (false) signedClipPlan = veoAlignSignedClipPlan(')
  if (composeMut === composeRota) throw new Error('mutante do compose não aplicou')
  checa('mutante do /api/compose (sem o alinhador do Veo): o claim do Veo cairia no alinhador do Kling → null → vermelho', !composeMut.includes('isVeoClaim(cinematicBirthClaim.response)) signedClipPlan') && K.alignSignedClipPlan(claimVeo, urls, urls.filter(Boolean)) === null)
}
void mutanteLib

console.log(`\n${ok} verificações passaram, ${falhas.length} falharam`)
if (falhas.length) { console.log('FALHAS:\n - ' + falhas.join('\n - ')); process.exit(1) }
