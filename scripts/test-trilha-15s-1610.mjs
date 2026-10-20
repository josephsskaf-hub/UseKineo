#!/usr/bin/env node
// KINEO-TRILHA-15S [TRAVA 8.2 — vai do fundador 16/10 "vai nos 2"] — guardião da TRILHA do clipe na estrada clássica.
//
// O defeito (docs/SEEDANCE-15-FORA-DA-TRILHA-2026-10-16.md, 20 filmes Seedance 1.5 de 15 s, 60 cenas): o Studio manda o plano
// de b-roll do roteiro INTEIRO (4 blocos = 4 cenas de plano) e a rota o aplicava POR POSIÇÃO nas 3 cenas do filme (blocos
// vizinhos juntados). O clipe 2 mostrava o bloco anterior, o clipe 3 o bloco 3, o prompt do PAYOFF nunca era usado — e o
// descritor #441 (imagem escrita pela fala real do clipe) era pulado porque "havia plano". 2º defeito: no modo sem rosto o
// protagonista era APAGADO ("a silhouette of a lost standing alone").
//
// Este guardião roda o CÓDIGO REAL, offline, sem rede e sem custo:
//   (A) lib/cinematic/planoDeBroll.ts: contagem diferente → plano ignorado; contagem igual e cenas = blocos → plano usado;
//       modo IA, prosa, blocos juntados/divididos com a mesma contagem → ignorado;
//   (B) os 5 roteiros REAIS do diagnóstico (scripts/test-support/trilha-15s-1610-roteiros.json, lidos do claim): o bloco
//       L2B + #441 da rota ANTIGA (conserto desfeito em memória) reproduz a troca (clipe i = bloco i do plano, payoff fora,
//       descritor desligado); o da rota NOVA ignora o plano, liga o descritor, grava broll_plan_descartado, e o clipe 3 leva
//       a fala e a pista do PAYOFF;
//   (C) outras durações e motores: 35 s (7 blocos → 5 clipes), 60 s em prosa (16 frases → 8 clipes), aligned 3/3 e 4/4
//       (plano usado, como antes), modo IA (plano fora, prompt do escritor intacto), hollywood (como sempre);
//   (D) modo sem rosto: o protagonista vira silhueta/figura de costas/mãos em close mantendo o substantivo; "of a man",
//       possessivo, texto sem pessoa, story/presenter: byte a byte iguais; a cauda fixa do prompt é a mesma; nada de U+E000;
//   (E) estático: a rota importa a lib, o ensaio de $0 mostra broll_plan, o evento existe, hollywood intocado;
//   (F) byte a byte: desfeito o conserto (test-support/desfaz-trilha-15s-1610.mjs), rota e visualPromptPolicy são EXATAMENTE
//       os do pai do 1º commit com a marca; toda linha nova leva a marca; varietyAxis/sceneTruth/sceneStyle intocados;
//   (G) mutantes, cada um provado aplicado, cada um tem de ficar VERMELHO.
//
// Rodar: node scripts/test-trilha-15s-1610.mjs            (prova)
//        node scripts/test-trilha-15s-1610.mjs --doc=ARQ   (prova + grava o antes × depois dos 5 roteiros em ARQ)
import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import vm from 'node:vm'
import ts from 'typescript'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
import { semTrilha15s1610 as semTrilha15s1610Puro, linhaDaTrilha15s1610 as linhaDaTrilha15s1610Puro, FORMA_TRILHA_15S_1610, MARCA_TRILHA_15S_1610 as MARCA } from './test-support/desfaz-trilha-15s-1610.mjs' // reancorado KINEO-FILME-RAPIDO-1710: os nomes abaixo também desfazem a entrega mais nova (17/10)
import { semFilmeRapido1710, linhaDoFilmeRapido1710, linhasTrocadasFilmeRapido1710 } from './test-support/desfaz-filme-rapido-1710.mjs' // reancorado KINEO-FILME-RAPIDO-1710 [TRAVA 8.2 — vai do fundador 17/10 "vai pra tudo"]
const semTrilha15s1610 = (texto, p) => semTrilha15s1610Puro(semFilmeRapido1710(texto, p), p) // reancorado KINEO-FILME-RAPIDO-1710
const linhaDaTrilha15s1610 = (l) => linhaDaTrilha15s1610Puro(l) || linhaDoFilmeRapido1710(l) // reancorado KINEO-FILME-RAPIDO-1710

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(RAIZ) // o loader offline resolve '@/…' a partir do cwd
const ROTA = 'app/api/generate-video-cinematic/route.ts'
const VPP = 'lib/cinematic/visualPromptPolicy.ts'
const LIB = 'lib/cinematic/planoDeBroll.ts'
const ler = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
const FX = JSON.parse(readFileSync(join(RAIZ, 'scripts/test-support/trilha-15s-1610-roteiros.json'), 'utf8')).roteiros
const SELO = '[TRAVA 8.2 — vai do fundador 16/10 "vai nos 2"]'
const CAUDA_INICIO = ', faceless cinematic b-roll'

const transpila = (src) => ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
function carregarLib(src) {
  const exp = {}
  vm.runInNewContext(transpila(src), { exports: exp, module: { exports: exp }, String, Number, Math, Array, Object })
  return exp
}
/** Os libs de apoio (parser, divisor, plano, descrições) vêm SEMPRE da árvore atual — o conserto não os toca. */
const apoio = createOfflineLoader()
const SP = apoio('@/lib/scriptParser')
const D = apoio('@/lib/durationByEngine')
const B = apoio('@/lib/broll/scene-splitter')
const VB = apoio('@/lib/cinematic/verbatimBeats')
const SD = apoio('@/lib/cinematic/sceneDescriptions')
const SS = apoio('@/lib/cinematic/sceneStyle')

/** visualPromptPolicy com a fonte dada (o resto, real). */
function carregarVpp(srcVpp) {
  const load = createOfflineLoader({ source: (rel, txt) => (rel === VPP ? srcVpp : txt) })
  return load('@/lib/cinematic/visualPromptPolicy')
}

/** O bloco L2B + a condição do descritor #441, extraídos da rota dada e executados. */
function blocoDaRota(rotaSrc) {
  const ini = rotaSrc.indexOf('    // L2B - prefer the smart BrollPlan per-scene cinematic prompt when provided\n')
  const fim = rotaSrc.indexOf('    // #441 — verbatim path has no cinematic description')
  const cond = fim < 0 ? null : rotaSrc.slice(fim).match(/\n {4}if \((verbatim &&[^\n{]*!hollywoodPath)\) \{/)
  if (ini < 0 || fim < 0 || ini > fim || !cond) throw new Error('bloco L2B/#441 não encontrado na rota')
  const corpo = rotaSrc.slice(ini, fim)
  const js = transpila(`exports.run = (ctx) => {\n  let scenes = ctx.scenes\n  const { planScenes, verbatim, hollywoodPath, parsedScript, user, generationId, body, duration, decidirPlanoDeBroll, writeServerEvent } = ctx\n${corpo}\n  const descritor = (${cond[1]})\n  return { scenes, descritor }\n}`)
  const exp = {}
  vm.runInNewContext(js, { exports: exp, console: { log() {}, warn() {}, error() {} }, String, Number, Math, Array, Object, JSON })
  return exp.run
}

const norm = (t) => String(t ?? '').trim().replace(/\s+/g, ' ')
const cenaDe = (seg) => ({ description: seg.pexelsQuery, voiceover: seg.voiceover, caption: '', stockSearchQuery: seg.pexelsQuery })

/** O filme de 15 s como a rota o monta (parseUserScript + seedanceShortMarkedScenes) e o plano como o Studio o pede. */
function filme15(r) {
  const parsedScript = SP.parseUserScript(r.prompt)
  const scenes = D.seedanceShortMarkedScenes(parsedScript, 3).map(cenaDe)
  const plano = B.splitScriptToScenes(r.prompt)
  const planScenes = plano.map((s, k) => ({ sceneNumber: k + 1, brollPrompt: r.enviado[k] ?? `Plan prompt for the PAYOFF block (never reached the engine): ${s.narration}` }))
  return { parsedScript, scenes, plano, planScenes }
}

/** Roda o bloco da rota num cenário; devolve o resultado + os eventos gravados. */
function rodar(run, lib, cen, extra = {}) {
  const eventos = []
  const out = run({
    scenes: cen.scenes.map((s) => ({ ...s })), planScenes: cen.planScenes, verbatim: extra.verbatim ?? true, hollywoodPath: extra.hollywoodPath ?? false,
    parsedScript: cen.parsedScript, user: { id: 'u-teste' }, generationId: 'g-teste', body: { engine: 'seedance', dry_run: true }, duration: extra.duration ?? 15,
    decidirPlanoDeBroll: lib?.decidirPlanoDeBroll, writeServerEvent: (e) => { eventos.push(e); return Promise.resolve(true) },
  })
  return { ...out, eventos }
}

/** Piso determinístico do descritor: o que a cena recebe se o GPT não devolver nada (completeSceneDescriptions). */
const pisoDoDescritor = (scenes, topic) => SD.completeSceneDescriptions({ descriptions: scenes.map(() => null), scenes: scenes.map((s) => ({ voiceover: s.voiceover, hint: s.stockSearchQuery || s.description })), topic }).descriptions

const POLITICA = (vpp, aspect = '9:16') => ({ mode: 'documentary_faceless', style: SS.deriveStyleAnchor('a documentary', ''), character: null, aspect })
const sujeito = (p) => p.replace(/^Opening shot:[^.]*\. /, '').split(CAUDA_INICIO)[0]
const cauda = (p) => p.slice(p.indexOf(CAUDA_INICIO))

// ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
function provas(fontes) {
  const falhas = []
  const oks = []
  const checa = (nome, cond, det = '') => { (cond ? oks : falhas).push(`${nome}${!cond && det ? ` — ${det}` : ''}`) }
  let L, runNovo, runAntigo, PN, PA
  try { L = carregarLib(fontes.lib) } catch (e) { return { falhas: [`lib não carrega: ${e.message}`], oks } }
  try { runNovo = blocoDaRota(fontes.rota); runAntigo = blocoDaRota(semTrilha15s1610(fontes.rotaReal ?? fontes.rota, ROTA)) } catch (e) { return { falhas: [`rota: ${e.message}`], oks } }
  try { PN = carregarVpp(fontes.vpp); PA = carregarVpp(semTrilha15s1610(fontes.vppReal ?? fontes.vpp, VPP)) } catch (e) { return { falhas: [`visualPromptPolicy não carrega: ${e.message}`], oks } }

  // (A) a lib
  {
    const blocos = ['Hook line here.', 'First reward line.', 'Second reward line.', 'Payoff line here.']
    const d = (n, cenas, segs, verbatim = true) => L.decidirPlanoDeBroll({ blocosDoPlano: n, falasDasCenas: cenas, falasDosBlocos: segs, verbatim })
    const a1 = d(4, ['Hook line here. First reward line.', 'Second reward line.', 'Payoff line here.'], blocos)
    checa('A contagem diferente (4 blocos, 3 cenas): plano ignorado', a1.aplicar === false && a1.motivo === 'contagem_diferente' && a1.blocos_do_plano === 4 && a1.cenas_do_filme === 3, JSON.stringify(a1))
    const a2 = d(3, blocos.slice(0, 3), blocos.slice(0, 3))
    checa('A contagem igual e cenas = blocos: plano usado', a2.aplicar === true && a2.motivo === 'alinhado', JSON.stringify(a2))
    const a3 = d(3, ['Hook line here.  First', 'reward line. Second reward line.', 'Payoff line here.'], ['Hook line here.', 'First reward line.', 'Payoff line here.'])
    checa('A mesma contagem mas cenas re-divididas (fala ≠ bloco): ignorado', a3.aplicar === false && a3.motivo === 'cenas_nao_sao_os_blocos', JSON.stringify(a3))
    const a4 = d(0, blocos, blocos)
    checa('A sem plano: nada a aplicar (sem_plano)', a4.aplicar === false && a4.motivo === 'sem_plano')
    const a5 = d(4, blocos, blocos, false)
    checa('A modo IA (escritor reescreve as falas) com a mesma contagem: ignorado', a5.aplicar === false && a5.motivo === 'modo_ia_sem_alinhamento', JSON.stringify(a5))
    const a6 = d(3, ['a b c', 'd e f', 'g h i'], [])
    checa('A prosa verbatim (sem blocos) com a mesma contagem: ignorado', a6.aplicar === false && a6.motivo === 'cenas_nao_sao_os_blocos')
    const a7 = d(3, ['Hook   line here. ', 'First reward\nline.', 'Second reward line.'], blocos.slice(0, 3))
    checa('A espaço/quebra de linha não descasa (normaliza)', a7.aplicar === true)
    const a8 = d(3, ['', 'x', 'y'], ['', 'x', 'y'])
    checa('A cena sem fala nunca prova alinhamento', a8.aplicar === false)
    const a9 = d(3, ['Hook line here.', 'First reward line.', 'Second reward line. Payoff line here.'], ['Hook line here.', 'First reward line.', 'Second reward line.'])
    checa('A só a última cena descasa (blocos 3+4 juntos): ignorado', a9.aplicar === false && a9.motivo === 'cenas_nao_sao_os_blocos', JSON.stringify(a9))
  }

  // (B) os 5 roteiros reais
  const ensaio = []
  for (const r of FX) {
    const cen = filme15(r)
    const velho = rodar(runAntigo, null, cen)
    const novo = rodar(runNovo, L, cen)
    const blocoDoClipe = velho.scenes.map((s) => cen.planScenes.findIndex((p) => p.brollPrompt.trim() === (s.aiPrompt ?? '').trim()))
    checa(`B ${r.id}: o roteiro tem 4 blocos e o plano 4 cenas; o filme tem 3 clipes (a mesma divisão do claim)`, cen.parsedScript.segments.length === 4 && cen.plano.length === 4 && cen.scenes.length === 3)
    {
      const starts = []; let w = 0
      for (const s of cen.scenes) { starts.push(w); w += s.voiceover.split(' ').filter(Boolean).length }
      checa(`B ${r.id}: clip_word_starts reproduzidos = os do claim`, JSON.stringify(starts) === JSON.stringify(r.clip_word_starts), JSON.stringify(starts))
    }
    checa(`B ${r.id} ANTIGO: clipe i recebe o prompt do bloco i do plano (a troca)`, JSON.stringify(blocoDoClipe) === '[0,1,2]', JSON.stringify(blocoDoClipe))
    checa(`B ${r.id} ANTIGO: o prompt enviado é o do claim, cena a cena`, velho.scenes.every((s, i) => s.aiPrompt === r.enviado[i]))
    checa(`B ${r.id} ANTIGO: o prompt do PAYOFF (bloco 4) nunca é usado`, !velho.scenes.some((s) => s.aiPrompt === cen.planScenes[3].brollPrompt))
    checa(`B ${r.id} ANTIGO: algum clipe tem prompt de um bloco cuja fala NÃO é a dele`, velho.scenes.some((s, i) => norm(s.voiceover) !== norm(cen.plano[blocoDoClipe[i]]?.narration)))
    checa(`B ${r.id} ANTIGO: descritor #441 desligado`, velho.descritor === false)
    checa(`B ${r.id} NOVO: nenhum clipe recebe prompt do plano`, novo.scenes.every((s) => !s.aiPrompt))
    checa(`B ${r.id} NOVO: descritor #441 ligado (escreve pela fala real)`, novo.descritor === true)
    checa(`B ${r.id} NOVO: evento broll_plan_descartado (4 blocos, 3 cenas, contagem_diferente)`, novo.eventos.length === 1 && novo.eventos[0].name === 'broll_plan_descartado' && novo.eventos[0].metadata.motivo === 'contagem_diferente' && novo.eventos[0].metadata.blocos_do_plano === 4 && novo.eventos[0].metadata.cenas_do_filme === 3, JSON.stringify(novo.eventos))
    const fala3 = novo.scenes[2].voiceover.toLowerCase()
    const piso = pisoDoDescritor(novo.scenes, r.prompt)
    const piso3 = piso[2].toLowerCase()
    checa(`B ${r.id} NOVO: o clipe 3 fala o PAYOFF e o piso do descritor cita o sujeito dele`, r.payoff_esperado.some((p) => fala3.includes(p)) && r.payoff_esperado.some((p) => piso3.includes(p)), `${fala3} | ${piso3}`)
    checa(`B ${r.id} NOVO: a fala das 3 cenas é a narração inteira, palavra por palavra`, norm(novo.scenes.map((s) => s.voiceover).join(' ')) === norm(r.voiceover_script))
    const promptsNovos = piso.map((p, i) => PN.buildClassicVisualPrompt(p, { ...POLITICA(PN, r.aspect), opening: i === 0 }))
    const promptsVelhos = velho.scenes.map((s, i) => PA.buildClassicVisualPrompt(s.aiPrompt, { ...POLITICA(PA, r.aspect), opening: i === 0 }))
    ensaio.push({ r, cen, velho, novo, blocoDoClipe, piso, promptsNovos, promptsVelhos })
  }

  // (C) outras durações / motores
  {
    // 35 s: 7 blocos em 5 clipes (o mesmo seedanceShortMarkedScenes do KINEO-SEEDANCE-BLOCOS)
    const sete = ['HOOK: [Pexels: city skyline night] One city never sleeps.', 'MICRO REWARD 1: [Pexels: subway train] Its trains run all night long.', 'MICRO REWARD 2: [Pexels: street food cart] Food carts serve at three in the morning.', 'ESCALATION: [Pexels: taxi traffic] Taxis outnumber private cars downtown.', 'MICRO REWARD 3: [Pexels: neon signs] Neon lights stay on until dawn.', 'MICRO REWARD 4: [Pexels: jazz club] Jazz clubs close only at sunrise.', 'PAYOFF: [Pexels: sunrise over bridge] And when the sun rises, the city simply starts again.'].join('\n\n')
    const p7 = SP.parseUserScript(sete)
    const cen35 = { parsedScript: p7, scenes: D.seedanceShortMarkedScenes(p7, 5, { alinharFatias: true }).map(cenaDe), planScenes: B.splitScriptToScenes(sete).map((s, k) => ({ brollPrompt: `Plan block ${k + 1} prompt about: ${s.narration}` })) }
    const v35 = rodar(runAntigo, null, cen35, { duration: 35 }), n35 = rodar(runNovo, L, cen35, { duration: 35 })
    checa('C 35 s: 7 blocos no plano, 5 clipes', p7.segments.length === 7 && cen35.planScenes.length === 7 && cen35.scenes.length === 5)
    checa('C 35 s ANTIGO: os blocos 6 e 7 (o PAYOFF) nunca viram imagem', !v35.scenes.some((s) => /Plan block (6|7)/.test(s.aiPrompt ?? '')) && v35.descritor === false)
    checa('C 35 s NOVO: plano ignorado, descritor ligado', n35.scenes.every((s) => !s.aiPrompt) && n35.descritor === true && n35.eventos[0]?.metadata?.motivo === 'contagem_diferente')
    // 60 s em prosa verbatim: 16 frases no plano (até 12), 8 clipes do divisor de palavras
    const frases = Array.from({ length: 16 }, (_, i) => `Sentence number ${i + 1} tells a different part of the story.`).join(' ')
    const p60 = SP.parseUserScript(frases)
    const cen60 = { parsedScript: p60, scenes: VB.resolveVerbatimSegments(p60, 8).map(cenaDe), planScenes: B.splitScriptToScenes(frases).slice(0, 12).map((s, k) => ({ brollPrompt: `Plan sentence ${k + 1} prompt: ${s.narration}` })) }
    const v60 = rodar(runAntigo, null, cen60, { duration: 60 }), n60 = rodar(runNovo, L, cen60, { duration: 60 })
    checa('C 60 s prosa: 12 frases no plano, 8 clipes, sem blocos', p60.segments.length === 0 && cen60.planScenes.length === 12 && cen60.scenes.length === 8)
    checa('C 60 s prosa ANTIGO: o clipe 8 recebe a frase 8 (a fala dele é a das frases 15-16)', /Plan sentence 8 /.test(v60.scenes[7].aiPrompt ?? '') && /16/.test(v60.scenes[7].voiceover) && v60.descritor === false)
    checa('C 60 s prosa NOVO: plano ignorado, descritor ligado', n60.scenes.every((s) => !s.aiPrompt) && n60.descritor === true)
    // alinhado: 3 blocos em 3 clipes (15 s) e 4 blocos em 4 cenas (35 s)
    for (const [nome, roteiro, clips, dur] of [['15 s 3/3', FX[0].prompt.split('\n\n').filter((b) => !b.startsWith('MICRO REWARD 2')).join('\n\n'), 3, 15], ['35 s 4/4', FX[2].prompt, 5, 35]]) {
      const pr = SP.parseUserScript(roteiro)
      const cen = { parsedScript: pr, scenes: VB.resolveVerbatimSegments(pr, clips).map(cenaDe), planScenes: B.splitScriptToScenes(roteiro).map((s, k) => ({ brollPrompt: `Aligned plan prompt ${k + 1}: ${s.narration}` })) }
      const v = rodar(runAntigo, null, cen, { duration: dur }), n = rodar(runNovo, L, cen, { duration: dur })
      checa(`C ${nome}: plano com a mesma contagem e cenas = blocos → USADO, igual ao antigo`, cen.planScenes.length === cen.scenes.length && n.scenes.every((s, i) => s.aiPrompt === cen.planScenes[i].brollPrompt) && JSON.stringify(n.scenes) === JSON.stringify(v.scenes) && n.descritor === false && v.descritor === false && n.eventos.length === 0)
    }
    // modo IA: o escritor de cenas já escreveu o prompt junto com a fala
    {
      const cen = { parsedScript: { segments: [], narration: '' }, scenes: [0, 1, 2].map((i) => ({ description: `writer shot ${i}`, voiceover: `writer line ${i}`, caption: '', aiPrompt: `Writer cinematic description number ${i}` })), planScenes: [0, 1, 2].map((k) => ({ brollPrompt: `Plan prompt of the original idea, sentence ${k}` })) }
      const n = rodar(runNovo, L, cen, { verbatim: false })
      checa('C modo IA: plano ignorado, a descrição do escritor (escrita com a fala) fica', n.scenes.every((s, i) => s.aiPrompt === `Writer cinematic description number ${i}`) && n.descritor === false && n.eventos[0]?.metadata?.motivo === 'modo_ia_sem_alinhamento')
    }
    // hollywood: como sempre (por posição), sem evento
    {
      const cen = filme15(FX[0])
      const v = rodar(runAntigo, null, cen, { hollywoodPath: true }), n = rodar(runNovo, L, cen, { hollywoodPath: true })
      checa('C hollywood: comportamento byte a byte o de antes (plano por posição), sem evento', JSON.stringify(n.scenes) === JSON.stringify(v.scenes) && n.descritor === false && n.eventos.length === 0)
    }
    // sem plano: nada muda, descritor ligado como sempre
    {
      const cen = { ...filme15(FX[1]), planScenes: [] }
      const v = rodar(runAntigo, null, cen), n = rodar(runNovo, L, cen)
      checa('C sem plano: igual ao antigo (descritor ligado, nenhum evento)', JSON.stringify(n.scenes) === JSON.stringify(v.scenes) && n.descritor === true && v.descritor === true && n.eventos.length === 0)
    }
  }

  // (D) modo sem rosto
  {
    const P = POLITICA(PN)
    const build = (M, v, pol = P) => M.buildClassicVisualPrompt(v, pol)
    const exu = FX[1].supervisor_cena_1
    const vN = build(PN, exu), vA = build(PA, exu)
    checa('D Exu (real): o antigo reproduz "a silhouette of a lost standing alone"', sujeito(vA).includes('a silhouette of a lost standing alone'), sujeito(vA))
    checa('D Exu (real): o novo mantém "lost man", sem rosto, e a frase fecha', sujeito(vN).includes('a silhouette of a lost man seen from behind standing alone') && !/lost standing/.test(vN), sujeito(vN))
    const casos = [
      ['A vibrant red rooster aggressively chasing a young man in a blue shalwar kameez', 'chasing a young man seen in silhouette from behind in a blue shalwar kameez'],
      ['A man in a vibrant blue jalabiya stands at the door', 'A man seen in silhouette from behind in a vibrant blue jalabiya stands'],
      ['A tracking shot of a lone man standing at a crossroads', 'a lone man seen in silhouette from behind standing at a crossroads'],
      ['a young man holding a golden coin', 'a young man, seen only as hands in close-up, holding a golden coin'],
      ['An old woman slowly pouring tea, steam rising', 'An old woman, seen only as hands in close-up, slowly pouring tea'],
      ['A man and a woman walk on the beach at dusk', 'A man and a woman seen from behind as distant silhouettes walk on the beach'],
      ['people walking in the rain under umbrellas', 'people seen from behind as distant silhouettes walking in the rain'],
      ['The crowd gathers in the square', 'The crowd seen from behind as distant silhouettes gathers in the square'],
    ]
    for (const [v, esperado] of casos) {
      const s = sujeito(build(PN, v))
      checa(`D "${v.slice(0, 44)}": substantivo mantido, forma sem rosto`, s.includes(esperado), s)
    }
    const iguais = ['Close-up shot of a man and a woman standing on a beach', "A close-up of a man's weathered hands", 'A drone shot over the empty Nevada desert at dawn', 'A sweeping view of a human skeleton model', 'Napoleon rides across the snow', 'An empty desert at dawn', ...FX.flatMap((r) => r.enviado).filter((t) => !/\b(?:man|woman|men|women|people|person|boy|girl|guy|crowd|family|child|children|kid|kids|student|students|lady|ladies|gentleman|ceo|entrepreneur|trader)\b/i.test(t))]
    for (const v of iguais) checa(`D byte a byte igual ao antigo: "${v.slice(0, 44)}"`, build(PN, v) === build(PA, v))
    const todos = [exu, ...casos.map(([v]) => v), ...iguais, ...FX.flatMap((r) => r.enviado)]
    checa('D nenhuma saída leva a marca interna U+E000', todos.every((v) => !build(PN, v).includes('')))
    checa('D a cauda fixa (", faceless cinematic b-roll, …") é a MESMA nos dois, em todo caso', todos.every((v) => cauda(build(PN, v)) === cauda(build(PA, v))))
    for (const modo of ['character_story', 'presenter']) {
      const pol = { ...P, mode: modo, character: 'a tall fisherman in a yellow raincoat' }
      checa(`D modo ${modo}: byte a byte igual ao antigo`, todos.every((v) => build(PN, v, pol) === build(PA, v, pol)))
    }
    checa('D "Mouth closed, not speaking" no fim do visual segue intacto', build(PN, 'A man rows a boat at night. Mouth closed, not speaking').includes('Mouth closed, not speaking'))
  }

  // (E) estático
  {
    const r = fontes.rota
    checa('E a rota importa a lib', r.includes("import { decidirPlanoDeBroll } from '@/lib/cinematic/planoDeBroll'"))
    checa('E o descritor #441 roda quando o plano NÃO foi aplicado', /\n {4}if \(verbatim && !planoDeBrollAplicado && !hollywoodPath\) \{/.test(r) && !r.includes('if (verbatim && planScenes.length === 0 && !hollywoodPath)'))
    checa('E o L2B só aplica com o plano aprovado', r.includes('    if (planoDeBrollAplicado) {') && !/\n {4}if \(planScenes\.length > 0\) \{/.test(r))
    checa('E hollywood segue por posição', r.includes('const planoDeBrollAplicado = hollywoodPath ? planScenes.length > 0 : decisaoPlanoDeBroll.aplicar'))
    checa('E evento broll_plan_descartado e campo broll_plan no ensaio de $0', r.includes("name: 'broll_plan_descartado'") && r.includes('broll_plan: { aplicado: planoDeBrollAplicado, ...decisaoPlanoDeBroll },'))
    checa('E a lib é pura (sem import)', !/^import /m.test(fontes.lib))
  }
  return { falhas, oks, ensaio }
}

// ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const REAL = { rota: ler(ROTA), vpp: ler(VPP), lib: ler(LIB) }
let total = 0
const falhasGerais = []
const relata = (nome, cond, det = '') => { total++; if (!cond) falhasGerais.push(`${nome}${det ? ` — ${det}` : ''}`); console.log(`  ${cond ? 'ok' : 'x '} ${nome}${!cond && det ? ` — ${det}` : ''}`) }

console.log('\nKINEO — trilha do clipe na estrada clássica (KINEO-TRILHA-15S)\n')
const res = provas(REAL)
for (const o of res.oks) relata(o, true)
for (const f of res.falhas) relata(f, false)

// (F) byte a byte contra o pai do 1º commit com a marca (ou HEAD, antes do commit)
{
  const git = (...a) => execFileSync('git', ['-C', RAIZ, ...a], { encoding: 'utf8', maxBuffer: 1 << 28 })
  const shas = git('log', '--format=%H', '-S', MARCA, '--', ROTA, VPP).trim().split('\n').filter(Boolean)
  const base = shas.length ? shas[shas.length - 1] + '^' : 'HEAD'
  for (const p of [ROTA, VPP]) {
    const atual = ler(p)
    let desfeito = null
    try { desfeito = semTrilha15s1610(atual, p) } catch (e) { desfeito = `ERRO ${e.message}` }
    relata(`F ${p}: desfeito == ${base.slice(0, 9)} byte a byte`, desfeito === git('show', `${base}:${p}`).replace(/\r\n/g, '\n'), typeof desfeito === 'string' && desfeito.startsWith('ERRO') ? desfeito : '')
    const marcadas = atual.split('\n').filter((l) => l.includes(MARCA))
    const fora = marcadas.filter((l) => !/\/\/.*KINEO-TRILHA-15S/.test(l)) // a marca mora num comentário de linha
    const f = FORMA_TRILHA_15S_1610[p]
    relata(`F ${p}: ${f.trocas} troca(s) + ${f.acrescimos} acréscimo(s) + ${f.blocos} bloco(s), toda linha marcada no comentário`, fora.length === 0 && marcadas.length >= f.trocas + f.acrescimos, fora.slice(0, 1).join(''))
  }
  const add = git('diff', base, '--', ROTA, VPP).replace(/\r/g, '').split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++'))
  relata('F toda linha nova/trocada da rota e do visualPromptPolicy leva a marca', add.length > 0 && add.every((l) => linhaDaTrilha15s1610(l) || l.includes('KINEO-META95-ASSUNTO-1910') /* reancorado KINEO-META95-ASSUNTO-1910 */ || l.includes('KINEO-BEBE-QUE-FALA-2010') /* reancorado KINEO-BEBE-QUE-FALA-2010 — o AI Kids Cartoon Stories (20/10) também é de depois da base; provado em scripts/test-bebe-que-fala-2010.mjs */), add.filter((l) => !linhaDaTrilha15s1610(l) && !l.includes('KINEO-META95-ASSUNTO-1910') && !l.includes('KINEO-BEBE-QUE-FALA-2010')).slice(0, 2).join(' | '))
  let libNaBase = true
  try { execFileSync('git', ['-C', RAIZ, 'cat-file', '-e', `${base}:${LIB}`], { stdio: ['ignore', 'ignore', 'ignore'] }) } catch { libNaBase = false }
  relata('F lib/cinematic/planoDeBroll.ts é arquivo novo (não existe na base)', !libNaBase)
  for (const p of ['lib/hollywood/varietyAxis.ts', 'lib/cinematic/sceneTruth.ts', 'lib/cinematic/sceneStyle.ts', 'lib/cinematic/sceneDescriptions.ts', 'lib/durationByEngine.ts', 'lib/broll/scene-splitter.ts', 'lib/cinematic/speechImageAlign.ts']) {
    relata(`F ${p} intocado (cauda protegida, contrato, divisor e descritor)`, git('diff', base, '--', p).trim() === '')
  }
  const assuntos = git('log', '--format=%s', `${base}..HEAD`, '--', ROTA, VPP, LIB).split('\n').map((s) => s.trim()).filter(Boolean).filter((s) => !s.includes('KINEO-FILME-RAPIDO-1710')).filter((s) => !s.includes('KINEO-META95-ASSUNTO-1910')).filter((s) => !s.includes('KINEO-BEBE-QUE-FALA-2010')) /* reancorado KINEO-BEBE-QUE-FALA-2010: os commits de 20/10 levam o selo deles */ // reancorado KINEO-FILME-RAPIDO-1710: os commits da entrega de 17/10 levam o selo deles · reancorado KINEO-META95-ASSUNTO-1910: os de 19/10 levam o selo "Vai pra meta do 95"
  assuntos.splice(0, assuntos.length, ...assuntos.filter((s) => !s.includes('KINEO-META95-IDEIA-1910'))) // reancorado KINEO-META95-IDEIA-1910 [TRAVA 8.2 — vai do fundador 19/10 "Vai pra meta do 95"]: os commits da ideia no escritor marcado (19/10) levam o selo deles
  assuntos.splice(0, assuntos.length, ...assuntos.filter((s) => !s.includes('KINEO-META95-PERSONAGEM-2010'))) // reancorado KINEO-META95-PERSONAGEM-2010 [TRAVA 8.2 — vai do fundador 19/10 "Vai pra meta do 95"]: os commits da folha de personagem (20/10) levam o selo deles
  relata(`F todo commit do conserto traz o selo ${SELO}`, assuntos.every((s) => s.includes(SELO)), assuntos.filter((s) => !s.includes(SELO)).slice(0, 1).join(''))
}

// (G) mutantes — cada um provado aplicado, cada um tem de ficar VERMELHO
{
  const MUTANTES = [
    ['M1 lib: sem a checagem de contagem (4 blocos aplicados em 3 cenas)', 'lib', "  if (blocos_do_plano !== cenas_do_filme) return { aplicar: false, motivo: 'contagem_diferente', ...base }\n", ''],
    ['M2 lib: sem a comparação cena a cena', 'lib', "    if (!fala || fala !== normalizar(input.falasDosBlocos[i])) return { aplicar: false, motivo: 'cenas_nao_sao_os_blocos', ...base }\n", ''],
    ['M3 lib: modo IA usa o plano', 'lib', "  if (!input.verbatim) return { aplicar: false, motivo: 'modo_ia_sem_alinhamento', ...base }\n", ''],
    ['M4 lib: só a 1ª cena é comparada com o bloco', 'lib', '  for (let i = 0; i < cenas_do_filme; i++) {', '  for (let i = 0; i < 1; i++) {'],
    ['M5 rota: descritor volta a exigir "nenhum plano"', 'rota', 'if (verbatim && !planoDeBrollAplicado && !hollywoodPath) {', 'if (verbatim && planScenes.length === 0 && !hollywoodPath) {'],
    ['M6 rota: L2B volta a aplicar qualquer plano', 'rota', '    if (planoDeBrollAplicado) {', '    if (planScenes.length > 0) {'],
    ['M7 rota: hollywood passa pela regra nova', 'rota', 'const planoDeBrollAplicado = hollywoodPath ? planScenes.length > 0 : decisaoPlanoDeBroll.aplicar', 'const planoDeBrollAplicado = decisaoPlanoDeBroll.aplicar'],
    ['M8 rota: sem o evento', 'rota', "void writeServerEvent({ name: 'broll_plan_descartado'", "void (() => {})({ name: 'broll_plan_descartado'"],
    ['M9 visualPromptPolicy: sem o passo do protagonista (volta a apagar)', 'vpp', '      .replace(GRUPO_DE_PESSOAS_TEXTO_RE, pessoaSemRosto) // KINEO-TRILHA-15S — protagonista sem rosto, substantivo mantido\n', ''],
    ['M10 visualPromptPolicy: a marca U+E000 não sai', 'vpp', ".trim().split(ROSTO_PROTEGIDO).join('') // KINEO-TRILHA-15S", '.trim() // KINEO-TRILHA-15S'],
    ['M11 visualPromptPolicy: sem as mãos em close', 'vpp', '  if (ACAO_DE_MAO_RE.test(depois)) return', '  if (false) return'],
    ['M12 visualPromptPolicy: "of a man" também é reescrito', 'vpp', '  if (PEDE_OBJETO_ANTES_RE.test(antes) || /^[\'’]s\\b/.test(depois)) return grupo', "  if (/^['’]s\\b/.test(depois)) return grupo"],
    ['M13 visualPromptPolicy: o substantivo não é protegido (o PERSON_NOUN_RE o apaga)', 'vpp', '(c: string) => c + ROSTO_PROTEGIDO)', '(c: string) => c)'],
    ['M14 visualPromptPolicy: plural vira silhueta única', 'vpp', "GRUPO_OU_PLURAL_RE.test(grupo.trim()) ? `${mantido} seen from behind as distant silhouettes`", "false ? `${mantido} seen from behind as distant silhouettes`"],
  ]
  console.log('\n(G) mutantes')
  for (const [nome, alvo, de, para] of MUTANTES) {
    const src = REAL[alvo]
    const aplicado = src.includes(de)
    if (!aplicado) { relata(`${nome}: aplicado`, false, 'âncora não encontrada'); continue }
    const fontes = { ...REAL, rotaReal: REAL.rota, vppReal: REAL.vpp, [alvo]: src.split(de).join(para) }
    let caem = []
    try { caem = provas(fontes).falhas } catch (e) { caem = [`lançou: ${e.message}`] }
    relata(`${nome}: aplicado e VERMELHO${caem.length ? ` (${caem.length} caem: ${caem[0].slice(0, 90)})` : ''}`, caem.length > 0)
  }
}

// --doc=ARQ — o antes × depois dos 5 roteiros reais
const docArg = process.argv.find((a) => a.startsWith('--doc='))
if (docArg && res.ensaio) {
  const md = []
  const cel = (t) => String(t ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ')
  md.push('# Trilha do clipe: antes × depois nos 5 roteiros reais (16/10/2026)', '')
  md.push('Gerado por `node scripts/test-trilha-15s-1610.mjs --doc=…` (KINEO-TRILHA-15S, [TRAVA 8.2 — vai do fundador 16/10 "vai nos 2"]). Offline, sem rede e sem custo: os roteiros são os do claim (`cinematic_submission_claim`, só leitura), o filme é montado pelas libs reais da rota (`parseUserScript` + `seedanceShortMarkedScenes`, que reproduzem os `clip_word_starts` do claim) e o plano de b-roll pelo divisor real do Studio (`splitScriptToScenes`). O bloco L2B + #441 é executado duas vezes: o da rota ANTIGA (conserto desfeito em memória) e o da NOVA.', '')
  md.push('**Como ler.** *Prompt antigo* = o que a produção mandou ao motor (núcleo de `scene_prompts[i]` do claim) e de qual bloco do plano ele veio. *Prompt novo* = o plano é ignorado (4 blocos no plano, 3 clipes no filme) e o descritor #441 escreve a imagem a partir da **fala do próprio clipe** + a pista `[Pexels]` dele; a coluna mostra essa entrada e o **piso determinístico** (o que sai mesmo se o GPT falhar: `completeSceneDescriptions`, já passado pelo `buildClassicVisualPrompt` novo, sem a cauda fixa). Em produção o GPT escreve a prosa a partir da mesma fala; o piso prova que o assunto já é o certo antes dele.', '')
  for (const e of res.ensaio) {
    md.push(`## ${e.r.id} — "${e.r.titulo}"`, '')
    md.push('| Clipe | Fala que toca | Prompt antigo (bloco do plano) | Prompt novo (fala real → descritor; piso) |', '|---|---|---|---|')
    e.novo.scenes.forEach((s, i) => {
      const b = e.blocoDoClipe[i]
      const falaDoBloco = e.cen.plano[b]?.narration ?? ''
      md.push(`| ${i + 1} | ${cel(s.voiceover)} | ${cel(e.velho.scenes[i].aiPrompt)} — **bloco ${b + 1} do plano** (fala do bloco: "${cel(falaDoBloco)}") | descritor recebe a fala do clipe + pista "${cel(s.stockSearchQuery)}"; piso: ${cel(sujeito(e.promptsNovos[i]))} |`)
    })
    md.push('', `PAYOFF (bloco 4: "${cel(e.cen.plano[3]?.narration)}"): antes, o prompt dele **nunca** chegou ao motor; agora o clipe 3 é escrito por essa fala.`, '')
  }
  md.push('## Protagonista no modo sem rosto (91a25fbb, cena 1)', '')
  const PN = carregarVpp(REAL.vpp), PA = carregarVpp(semTrilha15s1610(REAL.vpp, VPP))
  const pol = POLITICA(PN)
  md.push('| | Prompt (sem a cauda fixa) |', '|---|---|')
  md.push(`| Supervisor escreveu | ${cel(FX[1].supervisor_cena_1)} |`)
  md.push(`| Antigo (apagava) | ${cel(sujeito(PA.buildClassicVisualPrompt(FX[1].supervisor_cena_1, { ...pol, opening: true })))} |`)
  md.push(`| Novo (sem rosto, frase inteira) | ${cel(sujeito(PN.buildClassicVisualPrompt(FX[1].supervisor_cena_1, { ...pol, opening: true })))} |`, '')
  md.push('## Resultado', '', `- ${res.oks.length} verificações do guardião verdes, ${res.falhas.length} vermelhas (sem contar byte a byte e mutantes).`, '- Nos 5 roteiros, o antigo reproduz a troca (clipe i = bloco i do plano; o prompt do PAYOFF nunca é usado; descritor desligado). O novo ignora o plano, liga o descritor e o clipe 3 fala e mostra o PAYOFF.', '')
  // O que vem depois do marcador (placar de coerência, medido por SQL, fora do gerador) é preservado ao regravar.
  const MARCADOR_FORA = '<!-- KINEO-TRILHA-15S: fora do gerador'
  let preservado = ''
  try { const antigo = readFileSync(docArg.slice('--doc='.length), 'utf8').replace(/\r\n/g, '\n'); const i = antigo.indexOf(MARCADOR_FORA); if (i >= 0) preservado = antigo.slice(i) } catch { /* arquivo novo */ }
  writeFileSync(docArg.slice('--doc='.length), md.join('\n') + (preservado ? `\n${preservado}` : ''))
  console.log(`\ndoc gravado: ${docArg.slice('--doc='.length)}`)
}

console.log(`\n${total - falhasGerais.length}/${total} verificações — ${falhasGerais.length ? 'VERMELHO' : 'VERDE'}`)
process.exit(falhasGerais.length ? 1 : 0)
