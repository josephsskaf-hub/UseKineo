// KINEO-KLING25-60S-ANCORA-2026-09-28 — guardião: still em TODAS as cenas do Kling 2.5 e nenhuma apara abaixo da fala.
// Palavra do fundador (28/09): "quero que você melhore o Kling 2.5 (...) teste com 60 segundos para chegar em 65 ou 70".
// Com os planos de 5 s (KINEO-KLING25-PLANOS-5S, 3519a0b0) um filme de 60 s tem 12 planos, mas o pool de âncoras
// clássico (route.ts, MAX_ANCHORED_SCENES = 6, orçamento de 30 s) só dava still FLUX às 6 primeiras cenas: a segunda
// metade do filme saía em t2v, de outro mundo/paleta. Este guardião EXECUTA fatias reais (readFileSync + transpile + vm,
// sem rede, sem banco, sem fornecedor) e prova:
//   (a) o pool de âncoras real da rota, com relógio e FLUX simulados: Kling 2.5 com 12 e 14 planos → 12 e 14 stills
//       (base: 6); Seedance 1.5 e Veo 3.1 → 6 stills e o MESMO vetor de stills da base (byte a byte); pool de 3 intacto;
//   (b) o route.ts do COMMIT INTRODUTOR fora do bloco de âncoras é byte-idêntico ao seu pai (só a fatia mudou);
//       lib/compose.ts e /api/compose não mudaram nesse commit (commit × commit, nunca a worktree — depois do merge ela
//       carrega os irmãos); o still de cada cena chega ao despacho serial do Kling (i2v cena a cena);
//   (c) custo: ANCHORS_USD = US$ 0,10 por still → +US$ 0,60 (12 planos) e +US$ 0,80 (14) por filme; crédito inalterado;
//   (d) APARA — o caminho do Kling 2.5 no compose clássico (lib/compose buildCreatomateSource, ramo signedClipSeconds):
//       o relógio do filme é o áudio real (66,8 s de fala → filme de 66,8 s; 70,3 → 70,3); o TIKTOK-61 só ESTICA
//       (59,2 → 61,5); o único teto é 90 s (documentado em klingShots); a linha do tempo com teto por clipe
//       (planCappedClipTimeline) cobre o filme inteiro (soma dos trechos = filme) sem passar do comprimento de nenhum clipe;
//       o teto de apara de 64 s (TRIM_CEILING) mora no builder HOLLYWOOD e está DESLIGADO; o passe corretivo de voz do
//       /api/compose nunca acelera roteiro verbatim (!claimVerbatim). Veredito: SEM APARA no caminho do Kling 2.5;
//   (e) mutantes: cada peça central fica vermelha quando desfeita (teto 6 de volta; orçamento 30 s de volta com 14 planos;
//       um teto de 64 s enfiado no compose clássico; anchorEngine trocado).
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
  vm.runInNewContext(transp(src), { exports: exp, console: { log() {}, warn() {}, error() {} }, JSON, Math, Number, Array, Object, Set, Map, Promise, process: { env: {} }, ...globals })
  return exp
}
const fatia = (src, ini, fim, incluiFim = true) => { const a = src.indexOf(ini); if (a < 0) return null; const b = src.indexOf(fim, a + ini.length); return b < 0 ? null : src.slice(a, incluiFim ? b + fim.length : b) }
const eqJ = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const MARCA = 'KINEO-KLING25-60S-ANCORA'

// ── base = o "antes" e candidato = o commit que introduziu a âncora ──────────────────────────────────────────────────
// Memória "trava por diff fica verde ao mergear / medir vs pai do commit": depois do merge com a main e a fila, HEAD é um
// merge — comparar a base com a WORKTREE (ou com o pai de HEAD) carrega o trabalho dos IRMÃOS (o teto KLING25-60S-TETO
// mexeu em klingShots.ts e no route.ts fora do bloco de âncoras) e fica vermelho à toa. Por isso, como no guardião dos
// planos de 5 s (base 3519a0b0^ resolvida pela mensagem):
//   (1) o commit "[TRAVA 8.2] KLING25-60S-ANCORA" mais antigo na história de HEAD → base = <sha>^ e candidato = <sha>. As
//       asserções de DIFF (byte a byte) leem `git show <sha>:<arquivo>`; as que EXECUTAM a fatia leem o route.ts ATUAL da
//       worktree, para provar que o comportamento continua no HEAD;
//   (2) antes do commit existir (worktree pristina): base = HEAD (senão origin/main) e candidato = a worktree, como antes.
// A base escolhida NÃO pode conter o marcador; o candidato TEM de conter.
const git = (args) => execFileSync('git', args, { cwd: RAIZ, maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] }).toString()
let BASE = null
let SHA = null // o commit introdutor; null = o candidato é a worktree
{
  try { const shas = git(['log', '--basic-regexp', '--format=%H', '--grep=^\\[TRAVA 8.2\\] KLING25-60S-ANCORA', 'HEAD']).trim().split('\n').filter(Boolean); if (shas.length) SHA = shas[shas.length - 1] } catch { /* sem commit ainda */ }
  const candidatos = SHA ? [SHA + '^'] : []
  candidatos.push('HEAD', 'origin/main')
  for (const ref of candidatos) {
    try { if (!git(['show', `${ref}:app/api/generate-video-cinematic/route.ts`]).includes(MARCA)) { BASE = ref; break } } catch { /* tenta o próximo */ }
  }
  if (SHA && BASE !== SHA + '^') SHA = null // o pai do commit já tinha o marcador: não é o introdutor — o candidato volta a ser a worktree
}
console.log(`   base de comparação: ${BASE ?? '(nenhuma)'} · candidato do diff: ${SHA ?? 'worktree (sem o commit na história)'}`)
const rdBase = (p) => { if (!BASE) return null; try { return git(['show', `${BASE}:${p}`]).replace(/\r\n/g, '\n') } catch { return null } }
const rdCand = (p) => { if (!SHA) return rd(p); try { return git(['show', `${SHA}:${p}`]).replace(/\r\n/g, '\n') } catch { return null } }
checa('a base (o "antes", com o teto de 6 cenas ancoradas) está disponível', Boolean(BASE))

const ROTA = 'app/api/generate-video-cinematic/route.ts'
const rota = rd(ROTA)
const rotaBase = rdBase(ROTA) ?? ''
const rotaCand = rdCand(ROTA) ?? ''
checa('o route.ts de HEAD carrega o marcador ' + MARCA, rota.includes(MARCA))
checa('o candidato do diff (o commit introdutor, ou a worktree antes dele existir) carrega o marcador', rotaCand.includes(MARCA))
checa('a base NÃO carrega o marcador (é o antes de verdade)', !rotaBase.includes(MARCA))

// ═══ (a) o pool de âncoras real, executado ════════════════════════════════════════════════════════════════════════
const INI_BLOCO = '    if (anchorActive) {\n'
const FIM_BLOCO = '(user credits unchanged; kling=${KLING_CREDIT_COST}cr)`,\n      )\n    }\n'
const blocoNovo = fatia(rota, INI_BLOCO, FIM_BLOCO)
const blocoBase = fatia(rotaBase, INI_BLOCO, FIM_BLOCO)
const blocoCand = fatia(rotaCand, INI_BLOCO, FIM_BLOCO)
checa('o bloco de âncoras clássico existe em HEAD, no candidato e na base', Boolean(blocoNovo) && Boolean(blocoCand) && Boolean(blocoBase))
// KINEO-VEO-ANCORA-2026-09-29: o Veo 3.1 ganhou a mesma regra (todas as cenas, 60 s) — HEAD aceita as duas formas; o candidato (commit introdutor) segue só-Kling.
const HEAD_TETO = /const MAX_ANCHORED_SCENES = anchorEngine === 'kling'( \|\| anchorEngine === 'veo')? \? scenes\.length : 6\n/.test(blocoNovo ?? '')
const HEAD_ORCAMENTO = /const STILL_BUDGET_MS = anchorEngine === 'kling'( \|\| anchorEngine === 'veo')? \? 60_000 : 30_000/.test(blocoNovo ?? '')
checa('HEAD: teto de cenas ancoradas = todas as cenas no Kling (e, desde VEO-ANCORA, no Veo); Seedance segue 6', HEAD_TETO)
checa('HEAD: orçamento de tempo dos stills = 60 s no Kling (e no Veo), 30 s no Seedance', HEAD_ORCAMENTO)
checa('candidato: o commit introdutor já traz o teto por motor e o orçamento de 60 s (o diff de (b) mede ESTE trabalho, não o dos irmãos)', blocoCand?.includes("const MAX_ANCHORED_SCENES = anchorEngine === 'kling' ? scenes.length : 6") === true && blocoCand?.includes("const STILL_BUDGET_MS = anchorEngine === 'kling' ? 60_000 : 30_000") === true)
checa('HEAD: pool de 3 stills em paralelo inalterado', blocoNovo?.includes('const STILL_POOL = 3') === true && blocoBase?.includes('const STILL_POOL = 3') === true)
checa('HEAD: janela de 12 s por imagem inalterada', blocoNovo?.includes('const STILL_POLL_WINDOW_MS = 12_000') === true)
checa('base: teto fixo de 6 cenas ancoradas (o defeito: 12 planos, 6 stills)', blocoBase?.includes('const MAX_ANCHORED_SCENES = 6') === true)
checa('a rota tem maxDuration = 300 (o orçamento de 60 s dos stills cabe com folga para os POSTs seriais do Kling)', /export const maxDuration = 300\b/.test(rota))

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
// Relógio simulado: cada still leva `msPorStill`; os 3 de um lote correm juntos, então o lote leva `msPorStill`.
async function simula(bloco, { anchorEngine, planos, msPorStill = 3000 }) {
  const { fatiaAncora } = roda(harnessAncora(bloco))
  const relogio = { t: 1_000_000 }
  let emVoo = 0
  let maxEmVoo = 0
  const chamadas = []
  const generateCinematicSceneStill = async (args) => {
    emVoo++
    maxEmVoo = Math.max(maxEmVoo, emVoo)
    if (emVoo === 1) relogio.t += msPorStill // os stills de um lote correm juntos: o lote inteiro leva o tempo de um still
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

const novoK12 = await simula(blocoNovo, { anchorEngine: 'kling', planos: 12 })
const novoK14 = await simula(blocoNovo, { anchorEngine: 'kling', planos: 14 })
const baseK12 = await simula(blocoBase, { anchorEngine: 'kling', planos: 12 })
const baseK14 = await simula(blocoBase, { anchorEngine: 'kling', planos: 14 })
console.log(`   Kling 2.5 · 12 planos: base ${baseK12.stills} stills → HEAD ${novoK12.stills} (${novoK12.decorridoMs / 1000}s simulados) · 14 planos: base ${baseK14.stills} → HEAD ${novoK14.stills}`)
checa('ANTES (base): Kling 2.5 com 12 planos recebia still em só 6 cenas', baseK12.stills === 6)
checa('DEPOIS (HEAD): Kling 2.5 com 12 planos → 12 stills (todas as cenas)', novoK12.stills === 12 && novoK12.sceneStills.every((s, i) => s === `still:p${i + 1}`))
checa('DEPOIS (HEAD): Kling 2.5 com 14 planos → 14 stills (todas as cenas)', novoK14.stills === 14 && novoK14.sceneStills.every(Boolean))
checa('HEAD: nunca mais de 3 stills em voo (pool intacto)', novoK12.maxEmVoo === 3 && novoK14.maxEmVoo === 3)
checa('HEAD: cada still recebe o prompt da PRÓPRIA cena, seed e aspecto do pedido', novoK12.chamadas.every((c, i) => c.scenePrompt === `p${i + 1}` && c.seed === 7 && c.aspect === '9:16' && c.pollWindowMs === 12_000 && c.styleSuffix === ''))
checa('HEAD: o claim fica protegido (providerSubmissionMayExist) assim que os stills começam, como antes', novoK12.providerSubmissionMayExist === true && baseK12.providerSubmissionMayExist === true)
// pior caso real: cada still esgota a janela de 12 s → 12 planos = 4 lotes × 12 s = 48 s < 60 s; 14 = 5º lote começa aos 48 s
const piorK12 = await simula(blocoNovo, { anchorEngine: 'kling', planos: 12, msPorStill: 12_000 })
const piorK14 = await simula(blocoNovo, { anchorEngine: 'kling', planos: 14, msPorStill: 12_000 })
checa('HEAD: mesmo com cada still esgotando a janela de 12 s, 12 planos → 12 stills e 14 → 14 (orçamento de 60 s cabe)', piorK12.stills === 12 && piorK14.stills === 14)
const piorBaseSemTeto = await simula(blocoBase.replace('const MAX_ANCHORED_SCENES = 6', 'const MAX_ANCHORED_SCENES = scenes.length'), { anchorEngine: 'kling', planos: 12, msPorStill: 12_000 })
checa('só subir o teto sem subir o orçamento (30 s) NÃO bastaria: no pior caso 12 planos parariam em 9 stills', piorBaseSemTeto.stills === 9)

// KINEO-VEO-ANCORA-2026-09-29: o Veo saiu desta lista — ganhou still em todas as cenas (guardião test-veo-ancora-916-2026-09-29.mjs). Seedance: 6 e 30 s, como antes.
for (const [motor, planos] of [['seedance', 12], ['seedance', 9]]) {
  const n = await simula(blocoNovo, { anchorEngine: motor, planos })
  const b = await simula(blocoBase, { anchorEngine: motor, planos })
  checa(`${motor} com ${planos} cenas: 6 stills como antes e o MESMO vetor de stills da base (byte a byte)`, n.stills === 6 && b.stills === 6 && eqJ(n.sceneStills, b.sceneStills) && eqJ(n.chamadas, b.chamadas))
  const nPior = await simula(blocoNovo, { anchorEngine: motor, planos, msPorStill: 12_000 })
  const bPior = await simula(blocoBase, { anchorEngine: motor, planos, msPorStill: 12_000 })
  checa(`${motor} com ${planos} cenas no pior caso (12 s por still): orçamento de 30 s como antes → ${bPior.stills} stills nos dois`, nPior.stills === bPior.stills && eqJ(nPior.sceneStills, bPior.sceneStills))
}

// ═══ (b) intocabilidade: fora do bloco, byte a byte — CANDIDATO × base (commit × commit), nunca a worktree ═══════════
// Depois do merge a worktree carrega o teto KLING25-60S-TETO (klingShots.ts e route.ts fora do bloco): irmão, não esta
// entrega. Medido em 28/09: contra a worktree, "klingShots.ts não mudou" e "route.ts fora do bloco" ficavam vermelhos à toa.
checa('route.ts do candidato fora do bloco de âncoras é byte-idêntico à base (só a fatia mudou neste commit)', Boolean(blocoCand) && rotaCand.replace(blocoCand, '') === rotaBase.replace(blocoBase, ''))
for (const p of ['lib/compose.ts', 'app/api/compose/route.ts', 'lib/cinematic/klingShots.ts', 'lib/hollywood/anchors.ts']) {
  checa(`${p} não mudou neste commit (candidato × base)`, rdCand(p) !== null && rdCand(p) === rdBase(p))
}
checa("a escolha do motor ancorado segue wantsKling → 'kling' (Seedance/Veo/Sora inalterados)", rota.includes("const anchorEngine: 'kling' | 'veo' | 'seedance' | null = wantsKling ? 'kling' : wantsVeo ? 'veo' : wantsSora ? null : 'seedance'"))
checa('o despacho SERIAL do Kling leva o still de cada cena ao i2v (submitScene com sceneStills[i])', rota.includes('const res = await submitScene(scenes[i], model, i, sceneStills[i] ?? undefined)'))
checa('cena com still → modelo i2v do Kling 2.5 (image-to-video), t2v como segundo modelo', rota.includes("? [model === KLING_MODEL ? KLING_I2V_MODEL : model === SEEDANCE_MODEL ? SEEDANCE_I2V_MODEL : model === VEO_MODEL ? VEO_I2V_MODEL : model, model]"))
checa("KLING_I2V_MODEL = fal-ai/kling-video/v2.5-turbo/pro/image-to-video", rota.includes("const KLING_I2V_MODEL = 'fal-ai/kling-video/v2.5-turbo/pro/image-to-video'"))

// ═══ (c) custo ═════════════════════════════════════════════════════════════════════════════════════════════════════
const anchorsTs = rd('lib/hollywood/anchors.ts')
checa('ANCHORS_USD = 0.1 (US$ 0,10 por still FLUX)', anchorsTs.includes('export const ANCHORS_USD = 0.1'))
const custo12 = Math.round((novoK12.stills - baseK12.stills) * 0.1 * 100) / 100
const custo14 = Math.round((novoK14.stills - baseK14.stills) * 0.1 * 100) / 100
console.log(`   custo a mais por filme: 12 planos +US$ ${custo12.toFixed(2)} (${novoK12.stills - baseK12.stills} stills) · 14 planos +US$ ${custo14.toFixed(2)} (${novoK14.stills - baseK14.stills} stills)`)
checa('custo declarado no comentário da rota bate com o medido (+US$ 0,60 em 12 planos, +US$ 0,80 em 14)', custo12 === 0.6 && custo14 === 0.8 && blocoNovo.includes('12 planos = +US$ 0,60, 14 = +US$ 0,80'))
checa('o preço em créditos do Kling 2.5 não é tocado (o log continua "user credits unchanged")', blocoNovo.includes('(user credits unchanged; kling=${KLING_CREDIT_COST}cr)'))

// ═══ (d) APARA — o caminho do Kling 2.5 no compose clássico ════════════════════════════════════════════════════════
const compose = rd('lib/compose.ts')
const iBuild = compose.indexOf('export function buildCreatomateSource(')
const iHolly = compose.indexOf('export function buildHollywoodCreatomateSource(')
const iRamo = compose.indexOf('  } else if (signedClipSeconds) {')
const iTeto64 = compose.indexOf('const TRIM_CEILING = 64')
checa('o ramo dos planos assinados do Kling 2.5 vive dentro de buildCreatomateSource (clássico)', iBuild > 0 && iRamo > iBuild && iRamo < iHolly)
checa('o teto de apara de 64 s (TRIM_CEILING) vive no builder HOLLYWOOD, fora do caminho do Kling 2.5', iTeto64 > iHolly)
checa('e está DESLIGADO (HOLLYWOOD_TRIM_ENABLED = false)', compose.includes('const HOLLYWOOD_TRIM_ENABLED = false'))
const ramoKling = fatia(compose, '  } else if (signedClipSeconds) {', '\n  } else {', false) ?? ''
checa('o ramo do Kling 2.5 não tem nenhum 64/61.5/trim de total — só a linha do tempo com teto por clipe', ramoKling.length > 200 && !/\b64\b/.test(ramoKling) && ramoKling.includes('planCappedClipTimeline({') && ramoKling.includes('totalDuration,'))

// relógio do filme, executado: da medição do áudio ao TIKTOK-61
const INI_RELOGIO = '  const minPlausibleAudio = hasAvatar ? 0.5 : 4\n'
const FIM_RELOGIO = '    totalDuration = 61.5\n  }\n'
const relogioSrc = fatia(compose, INI_RELOGIO, FIM_RELOGIO)
checa('a fatia do relógio do filme (masterDuration → clamp → TIKTOK-61) foi encontrada', Boolean(relogioSrc))
const harnessRelogio = (src) => `
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)) }
function filmeSegundos(hasAvatar, realAudioDuration, duration, clipUrls) {
${src}
  return totalDuration
}
exports.filmeSegundos = filmeSegundos
`
const { filmeSegundos } = roda(harnessRelogio(relogioSrc))
const urls12 = Array.from({ length: 12 }, (_, i) => `https://c/${i}.mp4`)
checa('fala de 66,8 s num pedido de 60 s → filme de 66,8 s (o relógio é o áudio; nada apara)', filmeSegundos(false, 66.8, 60, urls12) === 66.8)
checa('fala de 70,3 s num pedido de 60 s → filme de 70,3 s', filmeSegundos(false, 70.3, 60, urls12) === 70.3)
checa('fala de 66,8 s num pedido de 35 s → filme de 66,8 s (passar do alvo é bom, em qualquer alvo)', filmeSegundos(false, 66.8, 35, urls12) === 66.8)
checa('fala de 59,2 s num pedido de 60 s → 61,5 s (TIKTOK-61 só ESTICA, nunca corta)', filmeSegundos(false, 59.2, 60, urls12) === 61.5)
checa('único teto do caminho: 90 s (fala de 95 s → 90; documentado em klingShots como o limite dos 225+ palavras)', filmeSegundos(false, 95, 60, urls12) === 90)
checa('o clamp da fatia é [5, 90] e não há outro Math.min sobre totalDuration fora do avatar', relogioSrc.includes('let totalDuration = clamp(Math.ceil(masterDuration * 10) / 10, hasAvatar ? 3 : 5, 90)') && (relogioSrc.match(/Math\.min\(totalDuration/g) ?? []).length === 1 && relogioSrc.includes('if (hasAvatar && realAudioDuration'))

// linha do tempo com teto por clipe, executada: cobre o filme inteiro sem passar do comprimento de nenhum clipe
const planoSrc = fatia(compose, 'export function planCappedClipTimeline(', '\n  return slots\n}\n')
checa('planCappedClipTimeline foi encontrada', Boolean(planoSrc))
const { planCappedClipTimeline } = roda(planoSrc)
const soma = (slots) => Math.round(slots.reduce((a, s) => a + s.len, 0) * 1000) / 1000
const dentroDoTeto = (slots, clipSeconds) => slots.every((s) => s.trimStart + s.len <= clipSeconds[s.clip] - 0.06 + 1e-6)
{
  const clipes = [5, 5, 5, 10, 5, 5, 10, 5, 5, 10, 5, 10] // 80 s brutos, 78,1 úteis
  const slots = planCappedClipTimeline({ totalDuration: 66.8, clipSeconds: clipes, beatTimes: [], anchors: null, trimStart: 0.1, overlap: 0.06 })
  checa('66,8 s de filme com 12 planos (8×5 s + 4×10 s): os trechos somam 66,8 s — o fim da fala está na tela', soma(slots) === 66.8 && dentroDoTeto(slots, clipes))
  const ancoras = [0, 5.2, 10.9, 16.1, 25.4, 30.2, 35.7, 45.1, 50.3, 55.0, 62.9, 66.0]
  const slotsA = planCappedClipTimeline({ totalDuration: 66.8, clipSeconds: clipes, beatTimes: [], anchors: ancoras, trimStart: 0.1, overlap: 0.06 })
  checa('66,8 s com o início de fala de cada cena assinado: soma 66,8 s, cada trecho dentro do próprio clipe', soma(slotsA) === 66.8 && dentroDoTeto(slotsA, clipes))
  const so5 = new Array(12).fill(5) // 58 s úteis para 70,3 s de filme: reuso dentro do teto, nunca corte
  const slotsR = planCappedClipTimeline({ totalDuration: 70.3, clipSeconds: so5, beatTimes: [], anchors: null, trimStart: 0.1, overlap: 0.06 })
  checa('70,3 s de filme com imagem de 58 s úteis: os trechos ainda somam 70,3 s (reuso dentro do teto; o filme não encolhe)', soma(slotsR) === 70.3 && dentroDoTeto(slotsR, so5))
}

// o /api/compose: o passe corretivo de voz nunca acelera roteiro verbatim (o teste do fundador é verbatim)
const composeRota = rd('app/api/compose/route.ts')
const condCorretivo = fatia(composeRota, '    if (\n      !cachedVoiceover && // never re-synthesize a cache hit', 'Math.abs(realAudioDuration - duration) > DURATION_TOLERANCE_SECONDS\n    ) {')
checa('/api/compose: o passe corretivo de velocidade exige !claimVerbatim — roteiro literal de 66-70 s não é acelerado', Boolean(condCorretivo) && condCorretivo.includes('!claimVerbatim &&'))
const iTail = composeRota.indexOf('KINEO-TAIL-2026-08-20')
const iFamiliaHollywood = composeRota.indexOf("if (quality === 'cinematic_hollywood' || quality === 'cinematic_h3' || quality === 'cinematic_omni' || quality === 'cinematic_s25') {")
checa('/api/compose: a apara do rabo mudo (KINEO-TAIL) vive dentro da família hollywood, depois do seu if — não no Kling 2.5', iFamiliaHollywood > 0 && iTail > iFamiliaHollywood)

// ═══ (e) mutantes ══════════════════════════════════════════════════════════════════════════════════════════════════
{
  const m1 = blocoNovo.replace(/const MAX_ANCHORED_SCENES = anchorEngine === 'kling'( \|\| anchorEngine === 'veo')? \? scenes\.length : 6/, 'const MAX_ANCHORED_SCENES = 6')
  checa('mutante: teto de 6 de volta → Kling 2.5 com 12 planos cai para 6 stills (vermelho)', (await simula(m1, { anchorEngine: 'kling', planos: 12 })).stills === 6)
  const m2 = blocoNovo.replace(/const STILL_BUDGET_MS = anchorEngine === 'kling'( \|\| anchorEngine === 'veo')? \? 60_000 : 30_000/, 'const STILL_BUDGET_MS = 30_000')
  checa('mutante: orçamento de 30 s de volta → no pior caso 12 planos param em 9 stills (vermelho)', (await simula(m2, { anchorEngine: 'kling', planos: 12, msPorStill: 12_000 })).stills === 9)
  const m3 = blocoNovo.split("anchorEngine === 'kling'").join("anchorEngine === 'seedance'")
  const m3s = await simula(m3, { anchorEngine: 'seedance', planos: 12 })
  checa('mutante: a regra apontada para o Seedance → Seedance com 12 cenas ganharia 12 stills (vermelho: a fatia do Seedance pegaria)', m3s.stills === 12)
  const m4 = relogioSrc + '  totalDuration = Math.min(totalDuration, 64)\n'
  const { filmeSegundos: fs64 } = roda(harnessRelogio(m4))
  checa('mutante: um teto de 64 s enfiado no relógio do filme → 66,8 s de fala virariam 64 (vermelho)', fs64(false, 66.8, 60, urls12) === 64)
  const m5 = planoSrc.replace('  // Sobra: a imagem não cobre o filme.', '  return slots\n  // Sobra: a imagem não cobre o filme.')
  const { planCappedClipTimeline: semReuso } = roda(m5)
  const slotsM = semReuso({ totalDuration: 70.3, clipSeconds: new Array(12).fill(5), beatTimes: [], anchors: null, trimStart: 0.1, overlap: 0.06 })
  checa('mutante: sem o reuso, 70,3 s de filme com 58 s de imagem ficam com buraco no fim (vermelho)', soma(slotsM) < 70.3)
}

console.log(`\n${ok} ok · ${falhas.length} falhas`)
if (falhas.length) console.log(falhas.map((f) => ' - ' + f).join('\n'))
process.exit(falhas.length ? 1 : 0)
