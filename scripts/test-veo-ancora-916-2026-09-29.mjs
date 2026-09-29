// KINEO-VEO-ANCORA-2026-09-29 — guardião: still FLUX em TODAS as cenas do Veo 3.1 e quadro 9:16 explícito no t2v e no i2v.
// Palavra do fundador (29/09 00:30 BRT): "quero foco total hoje para arrumar o Veo, que é um motor que temos que ter a
// partir de agora". O Veo planeja cenas de 8 s (duration '8s' fixo): um filme de 60 s tem 9 cenas, mas o pool de âncoras
// clássico só dava still às 6 primeiras (MAX_ANCHORED_SCENES = 6, orçamento de 30 s) — a segunda metade saía em t2v, de
// outro mundo/paleta. Provado no banco (events.cinematic_dispatch_result, 30 dias): a44cd5d3 (21/09, "navio ao largo de
// Cuba", 9 cenas) = [t2v, i2v×4, t2v×4]; 579f4b2b (19/09) = [i2v×6, t2v×3]; d21e366b (16/09) = [i2v, t2v×3, i2v×2, t2v×3].
// Este guardião EXECUTA fatias reais (readFileSync + transpile + vm, sem rede, sem banco, sem fornecedor) e prova:
//   (a) o pool de âncoras real da rota, com relógio e FLUX simulados: Veo com 9, 12 e 13 cenas → 9, 12 e 13 stills (base: 6);
//       Kling 2.5 com 12 → 12 (como já era); Seedance 1.5 → 6 stills e o MESMO vetor de stills da base (byte a byte);
//       pool de 3 e janela de 12 s por imagem intactos; pior caso (12 s por still) cabe no orçamento de 60 s;
//   (b) buildFalInput REAL do Veo: t2v e i2v com pedido 9:16 carregam aspect_ratio '9:16' (nunca 'auto') e resolution
//       '1080p'; sem `aspect` o default é 9:16; 16:9 pedido → '16:9'; o still da âncora nasce com image_size portrait_16_9;
//   (c) o still de cada cena chega ao despacho paralelo do Veo (sceneStills[idx]) e vira i2v primeiro, t2v como reserva;
//   (d) intocabilidade: o route.ts do COMMIT INTRODUTOR fora do bloco de âncoras é byte-idêntico ao seu pai (Seedance,
//       Kling, Sora e a família hollywood não mudam); lib/compose.ts, lib/cinematic/*, lib/hollywood/anchors.ts idem;
//   (e) custo: ANCHORS_USD = US$ 0,10 por still → 60 s (9 cenas) = +US$ 0,30; 35 s (≤ 6 cenas) = +US$ 0,00; crédito inalterado;
//   (f) mutantes: cada peça central fica vermelha quando desfeita (Veo fora do teto; orçamento de 30 s de volta; i2v com
//       aspect_ratio 'auto'; resolution '720p'; a regra apontada para o Seedance).
import { readFileSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import vm from 'node:vm'
import ts from 'typescript'

const RAIZ = resolve(join(dirname(fileURLToPath(import.meta.url)), '..'))
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) ok++; else { falhas.push(n); console.log('  FALHOU: ' + n) } }
const transp = (src) => ts.transpileModule(src, { compilerOptions: { module: 1, target: 9 } }).outputText
const roda = (src, globals = {}) => {
  const exp = {}
  vm.runInNewContext(transp(src), { exports: exp, console: { log() {}, warn() {}, error() {} }, JSON, Math, Number, String, Array, Object, Set, Map, Promise, process: { env: {} }, ...globals })
  return exp
}
const fatia = (src, ini, fim, incluiFim = true) => { const a = src.indexOf(ini); if (a < 0) return null; const b = src.indexOf(fim, a + ini.length); return b < 0 ? null : src.slice(a, incluiFim ? b + fim.length : b) }
const eqJ = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const MARCA = 'KINEO-VEO-ANCORA'

// ── base = o "antes" e candidato = o commit que introduziu a âncora do Veo (mesmo esquema do guardião do Kling) ──────
// Memória "trava por diff fica verde ao mergear / medir vs pai do commit": o commit "[TRAVA 8.2] VEO-ANCORA" mais antigo
// na história de HEAD → base = <sha>^ e candidato = <sha>. As asserções de DIFF leem `git show`; as que EXECUTAM leem a
// worktree (HEAD), para provar que o comportamento continua vivo. Antes do commit existir: base = HEAD/origin/main sem o
// marcador e candidato = a worktree.
const git = (args) => execFileSync('git', args, { cwd: RAIZ, maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] }).toString()
let BASE = null
let SHA = null
{
  try { const shas = git(['log', '--basic-regexp', '--format=%H', '--grep=^\\[TRAVA 8.2\\] VEO-ANCORA', 'HEAD']).trim().split('\n').filter(Boolean); if (shas.length) SHA = shas[shas.length - 1] } catch { /* sem commit ainda */ }
  const candidatos = SHA ? [SHA + '^'] : []
  candidatos.push('HEAD', 'origin/main')
  for (const ref of candidatos) {
    try { if (!git(['show', `${ref}:app/api/generate-video-cinematic/route.ts`]).includes(MARCA)) { BASE = ref; break } } catch { /* tenta o próximo */ }
  }
  if (SHA && BASE !== SHA + '^') SHA = null
}
console.log(`   base de comparação: ${BASE ?? '(nenhuma)'} · candidato do diff: ${SHA ?? 'worktree (sem o commit na história)'}`)
const rdBase = (p) => { if (!BASE) return null; try { return git(['show', `${BASE}:${p}`]).replace(/\r\n/g, '\n') } catch { return null } }
const rdCand = (p) => { if (!SHA) return rd(p); try { return git(['show', `${SHA}:${p}`]).replace(/\r\n/g, '\n') } catch { return null } }
checa('a base (o "antes", Veo com teto de 6 cenas ancoradas) está disponível', Boolean(BASE))

const ROTA = 'app/api/generate-video-cinematic/route.ts'
const rota = rd(ROTA)
const rotaBase = rdBase(ROTA) ?? ''
const rotaCand = rdCand(ROTA) ?? ''
checa('o route.ts de HEAD carrega o marcador ' + MARCA, rota.includes(MARCA))
checa('o candidato do diff carrega o marcador', rotaCand.includes(MARCA))
checa('a base NÃO carrega o marcador (é o antes de verdade)', !rotaBase.includes(MARCA))

// ═══ (a) o pool de âncoras real, executado ════════════════════════════════════════════════════════════════════════
const INI_BLOCO = '    if (anchorActive) {\n'
const FIM_BLOCO = '(user credits unchanged; kling=${KLING_CREDIT_COST}cr)`,\n      )\n    }\n'
const blocoNovo = fatia(rota, INI_BLOCO, FIM_BLOCO)
const blocoBase = fatia(rotaBase, INI_BLOCO, FIM_BLOCO)
const blocoCand = fatia(rotaCand, INI_BLOCO, FIM_BLOCO)
checa('o bloco de âncoras clássico existe em HEAD, no candidato e na base', Boolean(blocoNovo) && Boolean(blocoCand) && Boolean(blocoBase))
const LINHA_TETO = "const MAX_ANCHORED_SCENES = anchorEngine === 'kling' || anchorEngine === 'veo' ? scenes.length : 6"
const LINHA_ORCAMENTO = "const STILL_BUDGET_MS = anchorEngine === 'kling' || anchorEngine === 'veo' ? 60_000 : 30_000"
checa('HEAD: teto de cenas ancoradas = todas as cenas no Kling E no Veo; Seedance segue 6', blocoNovo?.includes(LINHA_TETO) === true)
checa('HEAD: orçamento de tempo dos stills = 60 s no Kling e no Veo, 30 s no Seedance', blocoNovo?.includes(LINHA_ORCAMENTO) === true)
checa('candidato: o commit introdutor traz as duas linhas (o diff de (d) mede ESTE trabalho)', blocoCand?.includes(LINHA_TETO) === true && blocoCand?.includes(LINHA_ORCAMENTO) === true)
checa('base: só o Kling tinha todas as cenas (o Veo parava em 6)', blocoBase?.includes("const MAX_ANCHORED_SCENES = anchorEngine === 'kling' ? scenes.length : 6") === true)
checa('HEAD: pool de 3 stills em paralelo e janela de 12 s por imagem inalterados', blocoNovo?.includes('const STILL_POOL = 3') === true && blocoNovo?.includes('const STILL_POLL_WINDOW_MS = 12_000') === true)
checa('a rota tem maxDuration = 300 (60 s de stills + despacho paralelo do Veo cabem)', /export const maxDuration = 300\b/.test(rota))

function harnessAncora(bloco) {
  return `
async function fatiaAncora(ctx) {
  const { anchorEngine, scenes, classicScenePrompts, generationSeed, aspectRequested, generationId, generateCinematicSceneStill, Date } = ctx
  const anchorActive = true
  const anchorI2vModel = 'i2v'
  const ANCHORS_USD = 0.1
  const KLING_CREDIT_COST = 50
  let providerSubmissionMayExist = false
  const sceneStills = new Array(scenes.length).fill(null)
${bloco}
  return { sceneStills, providerSubmissionMayExist }
}
exports.fatiaAncora = fatiaAncora
`
}
async function simula(bloco, { anchorEngine, planos, msPorStill = 3000 }) {
  const { fatiaAncora } = roda(harnessAncora(bloco))
  const relogio = { t: 1_000_000 }
  let emVoo = 0
  let maxEmVoo = 0
  const chamadas = []
  const generateCinematicSceneStill = async (args) => {
    emVoo++
    maxEmVoo = Math.max(maxEmVoo, emVoo)
    if (emVoo === 1) relogio.t += msPorStill
    chamadas.push(args)
    await Promise.resolve()
    emVoo--
    return `still:${args.scenePrompt}`
  }
  const scenes = Array.from({ length: planos }, (_, i) => ({ voiceover: `fala ${i + 1}` }))
  const classicScenePrompts = scenes.map((_, i) => `p${i + 1}`)
  const r = await fatiaAncora({
    anchorEngine, scenes, classicScenePrompts, generationSeed: 7, aspectRequested: '9:16', generationId: 'g1',
    generateCinematicSceneStill, Date: { now: () => relogio.t },
  })
  const stills = r.sceneStills.filter(Boolean).length
  return { stills, sceneStills: r.sceneStills, chamadas, maxEmVoo, providerSubmissionMayExist: r.providerSubmissionMayExist, decorridoMs: relogio.t - 1_000_000 }
}

const novoV9 = await simula(blocoNovo, { anchorEngine: 'veo', planos: 9 })
const novoV12 = await simula(blocoNovo, { anchorEngine: 'veo', planos: 12 })
const novoV13 = await simula(blocoNovo, { anchorEngine: 'veo', planos: 13 })
const novoV5 = await simula(blocoNovo, { anchorEngine: 'veo', planos: 5 })
const baseV9 = await simula(blocoBase, { anchorEngine: 'veo', planos: 9 })
const baseV5 = await simula(blocoBase, { anchorEngine: 'veo', planos: 5 })
console.log(`   Veo 3.1 · 9 cenas (60 s): base ${baseV9.stills} stills → HEAD ${novoV9.stills} (${novoV9.decorridoMs / 1000}s simulados) · 12: ${novoV12.stills} · 13 (90 s): ${novoV13.stills} · 5 (35 s): ${novoV5.stills}`)
checa('ANTES (base): Veo com 9 cenas recebia still em só 6 (o defeito dos filmes a44cd5d3/579f4b2b)', baseV9.stills === 6)
checa('DEPOIS (HEAD): Veo com 9 cenas → 9 stills, cada um da própria cena', novoV9.stills === 9 && novoV9.sceneStills.every((s, i) => s === `still:p${i + 1}`))
checa('DEPOIS (HEAD): Veo com 12 cenas → 12 stills; 13 cenas (90 s) → 13', novoV12.stills === 12 && novoV13.stills === 13 && novoV13.sceneStills.every(Boolean))
checa('Veo com 5 cenas (35 s): 5 stills em HEAD e na base — nada muda abaixo de 6', novoV5.stills === 5 && baseV5.stills === 5 && eqJ(novoV5.sceneStills, baseV5.sceneStills))
checa('HEAD: nunca mais de 3 stills em voo (pool intacto)', novoV9.maxEmVoo === 3 && novoV13.maxEmVoo === 3)
checa('HEAD: cada still recebe o prompt da PRÓPRIA cena, seed e aspecto do pedido (9:16)', novoV9.chamadas.every((c, i) => c.scenePrompt === `p${i + 1}` && c.seed === 7 && c.aspect === '9:16' && c.pollWindowMs === 12_000 && c.styleSuffix === ''))
checa('HEAD: o claim fica protegido (providerSubmissionMayExist) assim que os stills começam', novoV9.providerSubmissionMayExist === true)
const piorV9 = await simula(blocoNovo, { anchorEngine: 'veo', planos: 9, msPorStill: 12_000 })
const piorV13 = await simula(blocoNovo, { anchorEngine: 'veo', planos: 13, msPorStill: 12_000 })
checa('HEAD: pior caso (cada still esgota 12 s): 9 cenas → 9 stills em 36 s; 13 → 13 (5º lote começa aos 48 s < 60 s)', piorV9.stills === 9 && piorV9.decorridoMs === 36_000 && piorV13.stills === 13)
const piorBaseSemTeto = await simula(blocoBase.replace("anchorEngine === 'kling' ? scenes.length : 6", 'scenes.length'), { anchorEngine: 'veo', planos: 13, msPorStill: 12_000 })
checa('só subir o teto sem subir o orçamento (30 s) NÃO bastaria: 13 cenas parariam em 9 stills', piorBaseSemTeto.stills === 9)

const novoK12 = await simula(blocoNovo, { anchorEngine: 'kling', planos: 12 })
const baseK12 = await simula(blocoBase, { anchorEngine: 'kling', planos: 12 })
checa('Kling 2.5 com 12 planos: 12 stills em HEAD e na base — o Kling não muda', novoK12.stills === 12 && baseK12.stills === 12 && eqJ(novoK12.sceneStills, baseK12.sceneStills))
for (const planos of [9, 12]) {
  const n = await simula(blocoNovo, { anchorEngine: 'seedance', planos })
  const b = await simula(blocoBase, { anchorEngine: 'seedance', planos })
  checa(`Seedance com ${planos} cenas: 6 stills como antes e o MESMO vetor de stills da base (byte a byte)`, n.stills === 6 && b.stills === 6 && eqJ(n.sceneStills, b.sceneStills) && eqJ(n.chamadas, b.chamadas))
  const nPior = await simula(blocoNovo, { anchorEngine: 'seedance', planos, msPorStill: 12_000 })
  const bPior = await simula(blocoBase, { anchorEngine: 'seedance', planos, msPorStill: 12_000 })
  checa(`Seedance com ${planos} cenas no pior caso: orçamento de 30 s como antes → ${bPior.stills} stills nos dois`, nPior.stills === bPior.stills && eqJ(nPior.sceneStills, bPior.sceneStills))
}

// ═══ (b) buildFalInput REAL do Veo — quadro e resolução explícitos ═════════════════════════════════════════════════
// A função real é recortada da rota e executada com aspectSpec REAL (lib/aspect.ts, pura); todo identificador que a
// função consulta fora da fatia (constantes de modelo, helpers de negativo) é preenchido iterativamente com um stub
// nomeado — o que se mede é o payload do Veo, não os vizinhos.
const aspectLib = roda(rd('lib/aspect.ts'))
checa('aspectSpec real: 9:16 → falAspectRatio 9:16 e still portrait_16_9 (o still da âncora nasce em pé)', aspectLib.aspectSpec('9:16').falAspectRatio === '9:16' && aspectLib.aspectSpec('9:16').fluxImageSize === 'portrait_16_9' && aspectLib.aspectSpec(undefined).falAspectRatio === '9:16')
const anchorsTs = rd('lib/hollywood/anchors.ts')
checa('anchors.ts: o still FLUX usa image_size = aspectSpec(aspect).fluxImageSize (9:16 → portrait_16_9)', anchorsTs.includes('image_size: aspectSpec(aspect).fluxImageSize,'))
const VEO_MODEL = (rota.match(/const VEO_MODEL = '([^']+)'/) ?? [])[1]
const VEO_I2V_MODEL = (rota.match(/const VEO_I2V_MODEL = '([^']+)'/) ?? [])[1]
checa("VEO_MODEL = fal-ai/veo3.1/fast · VEO_I2V_MODEL = fal-ai/veo3.1/fast/image-to-video", VEO_MODEL === 'fal-ai/veo3.1/fast' && VEO_I2V_MODEL === 'fal-ai/veo3.1/fast/image-to-video')
function carregaBuildFalInput(src) {
  const fn = fatia(src, 'function buildFalInput(', '\n}\n')
  if (!fn) return null
  const stubs = { VEO_MODEL, VEO_I2V_MODEL, aspectSpec: aspectLib.aspectSpec }
  for (let i = 0; i < 60; i++) {
    try {
      const exp = roda(fn + '\nexports.buildFalInput = buildFalInput\n', stubs)
      // exercita os dois ramos do Veo para forçar os ReferenceError do corpo
      exp.buildFalInput(VEO_MODEL, 'p', true, false, undefined, undefined, 7, false, '9:16', 'documentary_faceless')
      exp.buildFalInput(VEO_I2V_MODEL, 'p', true, false, undefined, 'https://x/still.png', 7, false, '9:16', 'documentary_faceless')
      exp.buildFalInput(VEO_MODEL, 'p', true, true, undefined, undefined, undefined, false, '9:16')
      return exp.buildFalInput
    } catch (e) {
      const m = /^(\w+) is not defined/.exec(e.message) || /^(\w+) is not a function/.exec(e.message)
      if (!m) throw e
      stubs[m[1]] = e.message.includes('not a function') ? (() => '') : `stub:${m[1]}`
    }
  }
  return null
}
const buildFalInput = carregaBuildFalInput(rota)
checa('buildFalInput real foi recortado e executa', typeof buildFalInput === 'function')
if (buildFalInput) {
  const t2v = buildFalInput(VEO_MODEL, 'a ship off Cuba', true, false, undefined, undefined, 7, false, '9:16', 'documentary_faceless')
  const i2v = buildFalInput(VEO_I2V_MODEL, 'a ship off Cuba', true, false, undefined, 'https://x/still.png', 7, false, '9:16', 'documentary_faceless')
  console.log(`   Veo t2v: aspect_ratio=${t2v.aspect_ratio} resolution=${t2v.resolution} duration=${t2v.duration} · i2v: aspect_ratio=${i2v.aspect_ratio} resolution=${i2v.resolution} image_url=${i2v.image_url}`)
  checa("Veo t2v com pedido 9:16: aspect_ratio '9:16' explícito, resolution '1080p', duration '8s', sem áudio, seed compartilhado", t2v.aspect_ratio === '9:16' && t2v.resolution === '1080p' && t2v.duration === '8s' && t2v.generate_audio === false && t2v.seed === 7)
  checa("Veo i2v com pedido 9:16: aspect_ratio '9:16' explícito (NUNCA 'auto' — o still não decide o quadro), resolution '1080p', image_url do still, seed", i2v.aspect_ratio === '9:16' && i2v.resolution === '1080p' && i2v.image_url === 'https://x/still.png' && i2v.duration === '8s' && i2v.seed === 7)
  const semAspect = buildFalInput(VEO_I2V_MODEL, 'p', true, false, undefined, 'https://x/s.png', 7, false, undefined, 'documentary_faceless')
  checa("sem `aspect` (chamador antigo): i2v ainda manda '9:16' (default de lib/aspect), nunca 'auto'", semAspect.aspect_ratio === '9:16' && semAspect.resolution === '1080p')
  const deitado = buildFalInput(VEO_MODEL, 'p', true, false, undefined, undefined, 7, false, '16:9', 'documentary_faceless')
  checa("pedido 16:9 (YouTube longo): t2v manda '16:9' — o quadro segue o pedido, não um chumbado", deitado.aspect_ratio === '16:9')
  checa('nenhum ramo do Veo carrega aspect_ratio literal \'auto\'', !/aspect_ratio: 'auto'/.test(fatia(rota, 'function buildFalInput(', '\n}\n') ?? 'auto'))
}

// ═══ (c) o still chega ao despacho do Veo e vira i2v primeiro ═══════════════════════════════════════════════════════
checa('o despacho PARALELO (Seedance/Veo) leva sceneStills[idx] a submitScene', rota.includes('batch.map(async (idx) => ({ idx, res: await submitScene(scenes[idx], model, idx, sceneStills[idx] ?? undefined) })),'))
checa('Veo é despachado em paralelo (canParallelize inclui VEO_MODEL)', rota.includes('const canParallelize = model === SEEDANCE_MODEL || model === VEO_MODEL'))
checa('cena com still → VEO_I2V_MODEL primeiro, VEO_MODEL (t2v) como outro modelo', rota.includes("? [model === KLING_MODEL ? KLING_I2V_MODEL : model === SEEDANCE_MODEL ? SEEDANCE_I2V_MODEL : model === VEO_MODEL ? VEO_I2V_MODEL : model, model]"))
checa("a escolha do motor ancorado segue wantsVeo → 'veo'", rota.includes("const anchorEngine: 'kling' | 'veo' | 'seedance' | null = wantsKling ? 'kling' : wantsVeo ? 'veo' : wantsSora ? null : 'seedance'"))
checa('o payload de cada cena fica gravado (classicSceneInputs) — a próxima cena 16:9 terá o input exato para investigar', rota.includes('classicSceneInputs[sceneIndex] = input // KINEO-CENA-CLASSICA-2026-09-28'))

// ═══ (d) intocabilidade — candidato × base, commit × commit ═══════════════════════════════════════════════════════════
checa('route.ts do candidato fora do bloco de âncoras é byte-idêntico à base (Seedance/Kling/Sora/hollywood intactos)', Boolean(blocoCand) && rotaCand.replace(blocoCand, '') === rotaBase.replace(blocoBase, ''))
const soLinhasVeo = (() => {
  if (!blocoCand || !blocoBase) return false
  const dc = blocoCand.split('\n').filter((l) => !blocoBase.includes(l))
  const db = blocoBase.split('\n').filter((l) => !blocoCand.includes(l))
  // tudo que saiu da base são as 2 linhas de regra + 1 linha de comentário; tudo que entrou são as 2 linhas novas + comentário VEO-ANCORA
  return db.length === 3 && db.some((l) => l.includes("anchorEngine === 'kling' ? scenes.length : 6")) && db.some((l) => l.includes("anchorEngine === 'kling' ? 60_000 : 30_000")) && dc.every((l) => l.trim().startsWith('//') || l.includes(LINHA_TETO) || l.includes(LINHA_ORCAMENTO))
})()
checa('dentro do bloco, o diff é só as 2 linhas de regra (+ comentário): nenhuma outra linha do pool mudou', soLinhasVeo)
for (const p of ['lib/compose.ts', 'app/api/compose/route.ts', 'lib/cinematic/klingShots.ts', 'lib/cinematic/sceneTruth.ts', 'lib/hollywood/anchors.ts', 'lib/aspect.ts']) {
  checa(`${p} não mudou neste commit (candidato × base)`, rdCand(p) !== null && rdCand(p) === rdBase(p))
}

// ═══ (e) custo ═════════════════════════════════════════════════════════════════════════════════════════════════════
checa('ANCHORS_USD = 0.1 (US$ 0,10 por still FLUX)', anchorsTs.includes('export const ANCHORS_USD = 0.1'))
const custo60 = Math.round((novoV9.stills - baseV9.stills) * 0.1 * 100) / 100
const custo35 = Math.round((novoV5.stills - baseV5.stills) * 0.1 * 100) / 100
console.log(`   custo a mais por filme Veo: 60 s (9 cenas) +US$ ${custo60.toFixed(2)} · 35 s (5 cenas) +US$ ${custo35.toFixed(2)}`)
checa('custo declarado no comentário da rota bate com o medido (+US$ 0,30 em 60 s, +US$ 0,00 em 35 s)', custo60 === 0.3 && custo35 === 0 && blocoNovo.includes('60 s = +US$ 0,30 (3 stills), 35 s (≤6 cenas) = +US$ 0,00'))
checa('o preço em créditos não é tocado (o log continua "user credits unchanged")', blocoNovo.includes('(user credits unchanged; kling=${KLING_CREDIT_COST}cr)'))

// ═══ (f) mutantes ══════════════════════════════════════════════════════════════════════════════════════════════════
{
  const m1 = blocoNovo.split(LINHA_TETO).join("const MAX_ANCHORED_SCENES = anchorEngine === 'kling' ? scenes.length : 6")
  checa('mutante: Veo fora do teto → 9 cenas caem para 6 stills (vermelho)', (await simula(m1, { anchorEngine: 'veo', planos: 9 })).stills === 6)
  const m2 = blocoNovo.split(LINHA_ORCAMENTO).join("const STILL_BUDGET_MS = anchorEngine === 'kling' ? 60_000 : 30_000")
  checa('mutante: orçamento de 30 s de volta para o Veo → no pior caso 13 cenas param em 9 stills (vermelho)', (await simula(m2, { anchorEngine: 'veo', planos: 13, msPorStill: 12_000 })).stills === 9)
  const m3 = blocoNovo.split("anchorEngine === 'kling' || anchorEngine === 'veo'").join("anchorEngine === 'seedance'")
  checa('mutante: a regra apontada para o Seedance → Seedance com 12 cenas ganharia 12 stills (vermelho: a fatia do Seedance pegaria)', (await simula(m3, { anchorEngine: 'seedance', planos: 12 })).stills === 12)
  if (buildFalInput) {
    const fnSrc = fatia(rota, 'function buildFalInput(', '\n}\n')
    const i2vRamo = fatia(fnSrc, '  if (model === VEO_I2V_MODEL) {', '\n  }\n')
    const m4 = rota.replace(i2vRamo, i2vRamo.replace("aspect_ratio: frame.falAspectRatio, // schema: default 'auto'", "aspect_ratio: 'auto',"))
    const b4 = carregaBuildFalInput(m4)
    checa("mutante: i2v com aspect_ratio 'auto' → o payload deixa de carregar '9:16' (vermelho)", b4 && b4(VEO_I2V_MODEL, 'p', true, false, undefined, 'https://x/s.png', 7, false, '9:16', 'documentary_faceless').aspect_ratio === 'auto')
    const m5 = rota.replace(i2vRamo, i2vRamo.replace("resolution: '1080p',", "resolution: '720p',"))
    const b5 = carregaBuildFalInput(m5)
    checa("mutante: i2v em '720p' → resolution deixa de ser 1080p (vermelho)", b5 && b5(VEO_I2V_MODEL, 'p', true, false, undefined, 'https://x/s.png', 7, false, '9:16', 'documentary_faceless').resolution === '720p')
  }
}

console.log(`\n${ok} ok · ${falhas.length} falhas`)
if (falhas.length) console.log(falhas.map((f) => ' - ' + f).join('\n'))
process.exit(falhas.length ? 1 : 0)
