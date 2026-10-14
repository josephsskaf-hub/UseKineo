#!/usr/bin/env node
// KINEO-CONTRATO-CLASSICOS-1410 [TRAVA 8.2 — vai do fundador 14/10] — guardião do Contrato de Cena no caminho clássico.
//
// O que foi medido antes (30 d, `cinematic_submission_claim`): o contrato JÁ roda nos clássicos desde 121b669e (27/08) e
// 100% dos claims de Seedance 1.5 / Kling 2.5 / Veo 3.1 com resposta gravam contrato_cena + visual_mode. O defeito real
// era outro: das 6 remoções que o gate clássico fez, 5 mutilaram o prompt PAGO por casar substring — "container ships ed
// in a port" (Kling, 29/09: "anchored" perdeu "anchor"), e "host" arrancado de 3 histórias de fantasma (Waverly Hills,
// farol, Mary Celeste). O conserto: o gate clássico casa proibido/traição por PALAVRA INTEIRA, loga o veredito e o claim
// grava a régua aplicada (contrato_modo). O hollywood não passa a flag e fica como era.
//
// Este guardião roda o CÓDIGO REAL, offline, sem rede e sem custo:
//   (A) byte a byte: desfeito o conserto (scripts/test-support/desfaz-contrato-classicos-1410.mjs), a rota e o sceneTruth
//       são EXATAMENTE os do pai do 1º commit com a marca (nunca origin/main);
//   (B) a fatia real do laço clássico (classicScenePrompts, com o contrato, o romance e os eixos do Kling/Veo) roda para
//       Seedance, Kling 2.5, Veo e Sora: cada um passa pelo contrato; "ghostly"/"anchored"/"ghost ship" saem intactos;
//       a cena que contradiz a fala (apresentador num filme faceless sobre um U-boat) é CORRIGIDA, nunca recusada;
//   (C) o objeto real do claim clássico grava contrato_cena, visual_mode, contrato_modo e contrato_palavra_inteira, e o
//       ensaio de $0 (dry_run) mostra o mesmo contrato_modo;
//   (D) hollywood idêntico: o ponto de chamada do hollywood é o da base, letra por letra, e a lib nova SEM a flag dá
//       resultado JSON-idêntico à lib da base num corpus que inclui os casos de substring;
//   (E) 6 mutantes, cada um provado aplicado, cada um tem de ficar VERMELHO.
//
// Rodar: node scripts/test-contrato-classicos-1410.mjs
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import vm from 'node:vm'
import ts from 'typescript'
import { semContratoClassicos1410, MARCA_CONTRATO_CLASSICOS_1410 as MARCA } from './test-support/desfaz-contrato-classicos-1410.mjs'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const ROTA = 'app/api/generate-video-cinematic/route.ts'
const LIB = 'lib/cinematic/sceneTruth.ts'
const MODO = 'lib/cinematic/visualMode.ts'
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
const git = (args) => execFileSync('git', args, { cwd: RAIZ, maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] }).toString()

let ok = 0
let falhas = 0
const checa = (nome, cond) => { if (cond) { ok++; console.log('  ✓ ' + nome) } else { falhas++; console.log('  ✗ ' + nome) } }

// ── base: o pai do commit MAIS ANTIGO com a marca na história de HEAD; antes do commit existir, o próprio HEAD ──
let BASE = null
try {
  const shas = git(['log', '--format=%H', `--grep=${MARCA}`, 'HEAD']).trim().split('\n').filter(Boolean)
  for (const ref of shas.length ? [shas[shas.length - 1] + '^', 'HEAD'] : ['HEAD']) {
    try { if (!git(['show', `${ref}:${ROTA}`]).includes(MARCA)) { BASE = ref; break } } catch { /* tenta o próximo */ }
  }
} catch { BASE = null }
const rdBase = (p) => { if (!BASE) return null; try { return git(['show', `${BASE}:${p}`]).replace(/\r\n/g, '\n') } catch { return null } }
console.log(`   base de comparação: ${BASE ?? '(nenhuma)'}`)

const roda = (src, globals = {}) => {
  const js = ts.transpileModule(src, { compilerOptions: { module: 1, target: 9 } }).outputText
  const exp = {}
  vm.runInNewContext(js, { exports: exp, console: { log() {}, warn() {}, error() {} }, JSON, Math, Number, Array, Object, Set, Map, RegExp, String, Error, process: { env: {} }, ...globals })
  return exp
}
const fatia = (src, ini, fim) => { const a = src.indexOf(ini); if (a < 0) return null; const b = src.indexOf(fim, a + ini.length); return b < 0 ? null : src.slice(a, b + fim.length) }
const eqJ = (a, b) => JSON.stringify(a) === JSON.stringify(b)

// ── fatias reais da rota ──
const INI_LACO = '    const classicScenePrompts = scenes.map((scene, sceneIndex) => {\n'
const FIM_LACO = 'veoApplyShotAxis(classicScenePrompts[i], i)\n'
const INI_HOLLY = '            const contrato = montarContrato({\n'
const FIM_HOLLY = '            const r = aplicarContrato(contrato)\n'
const INI_RESP = "\n    const response: Record<string, unknown> = {\n      mode: 'cinematic_ai',"
const FIM_RESP = '\n    }\n'
const INI_ENSAIO = '    if (body.dry_run === true && isDryRunAccount(user.email)) {\n      const classicReport = classicDryRunReport({'
const FIM_ENSAIO = '    // ── KINEO-CINEMATIC-ANCHOR-2026-07-24 — cross-scene consistency (CLASSIC)'

// Corpus: falas e planos dos casos reais de 30 d (claims) + o caso que tem de ser corrigido.
const CENAS = [
  { voiceover: 'Nurses at Waverly Hills swore they saw a ghostly figure drifting down the fourth floor corridor.', aiPrompt: 'A ghostly figure drifting down an abandoned hospital corridor at night, flickering light' },
  { voiceover: 'Hurricane Polo never touched land, yet giant container ships stayed anchored off the coast for days.', aiPrompt: 'Wide shot of giant container ships anchored in a port, illustrating their size' },
  { voiceover: 'In 1942 a German U-boat sank the tanker just off the coast.', aiPrompt: 'A TV host speaks beside a ghostly lighthouse on the beach' },
  { voiceover: 'Sailors started calling the Mary Celeste a ghost ship.', aiPrompt: 'A ghost ship drifting through thick fog at dawn' },
]
const SUFIXO = ', faceless cinematic b-roll, focus on the described subject and its environment, no foreground human faces, photorealistic'
const MOTORES = [
  { nome: 'Seedance 1.5', wantsKling: false, wantsVeo: false },
  { nome: 'Kling 2.5', wantsKling: true, wantsVeo: false },
  { nome: 'Veo 3.1', wantsKling: false, wantsVeo: true },
  { nome: 'Sora', wantsKling: false, wantsVeo: false },
]

/** Todas as checagens de comportamento sobre um trio de textos {rota, lib, modo}. Devolve a lista de falhas. */
function avaliar({ rota, lib, modo }, log = false) {
  const erros = []
  const c = (nome, cond) => { if (log) checa(nome, cond); if (!cond) erros.push(nome) }
  let L, V
  try { L = roda(lib); V = roda(modo) } catch (e) { c('a lib compila e carrega: ' + e.message, false); return erros }

  // (B) o laço clássico real, para cada motor
  const laco = fatia(rota, INI_LACO, FIM_LACO)
  c('(B) a fatia real do laço clássico existe (contrato → romance → eixo Kling → eixo Veo)', Boolean(laco))
  if (laco) {
    let rodar = null
    try {
      rodar = roda(`export function rodar(ctx: any) {\n  const { scenes, wantsKling, wantsVeo, classicVisualMode, classicVisualPolicy, eraSuffix } = ctx\n  const contratoRelatoClassico: any[] = []\n${laco}\n  return { classicScenePrompts, contratoRelatoClassico }\n}`, {
        buildClassicVisualPrompt: (v) => `${v}${SUFIXO}`,
        montarContrato: L.montarContrato, aplicarContrato: L.aplicarContrato, severidadeDe: L.severidadeDe,
        proibidosPorModo: V.proibidosPorModo,
        romanceAdulto: { ativo: false }, aplicarRomanceAdulto: (p) => p,
        kling25ApplyShotAxis: (p, i) => `[K${i}] ${p}`, veoApplyShotAxis: (p, i) => `[V${i}] ${p}`,
      }).rodar
    } catch (e) { c('(B) a fatia do laço transpila: ' + e.message, false) }
    if (rodar) {
      for (const m of MOTORES) {
        let r = null
        try { r = rodar({ scenes: CENAS.map((s) => ({ ...s })), wantsKling: m.wantsKling, wantsVeo: m.wantsVeo, classicVisualMode: 'documentary_faceless', classicVisualPolicy: {}, eraSuffix: '' }) } catch (e) { c(`(B) ${m.nome}: o laço roda sem lançar (${e.message})`, false); continue }
        const P = r.classicScenePrompts
        const R = r.contratoRelatoClassico
        const eixo = m.wantsKling ? '[K' : m.wantsVeo ? '[V' : null
        c(`(B) ${m.nome}: ${CENAS.length} prompts, nenhum vazio (o contrato corrige, nunca recusa o filme)`, P.length === CENAS.length && P.every((p) => typeof p === 'string' && p.trim().length > 20))
        c(`(B) ${m.nome}: o contrato rodou nas 4 cenas (a cena que contradiz a fala entrou no relato com remoção + injeção)`, R.some((x) => x.cena === 3 && x.antes === 'elemento_proibido' && x.acoes.includes('removido: host') && x.acoes.includes('removido: speaks') && x.acoes.some((a) => a.startsWith('injetado: '))))
        c(`(B) ${m.nome}: a cena corrigida sai coerente (depois = aprovada) e com o sujeito da fala na frente ("submarine")`, R.some((x) => x.cena === 3 && L.severidadeDe(x.depois) !== 'corrigir') && /^(\[[KV]2\] )?(wreck, )?submarine, |^(\[[KV]2\] )?(submarine, )?wreck, /.test(P[2]))
        c(`(B) ${m.nome}: o apresentador sumiu da cena 3 e "ghostly lighthouse" ficou inteiro`, !/\bhost\b/i.test(P[2]) && !/\bspeaks\b/i.test(P[2]) && P[2].includes('ghostly lighthouse'))
        c(`(B) ${m.nome}: "ghostly figure", "anchored in a port" e "ghost ship" chegam INTEIROS ao motor`, P[0].includes('A ghostly figure drifting') && P[1].includes('ships anchored in a port') && P[3].includes('A ghost ship drifting'))
        c(`(B) ${m.nome}: nenhuma correção nas cenas 1, 2 e 4 (substring não é mais proibido)`, R.filter((x) => x.cena !== 3).every((x) => x.antes === 'sem_ancora_comum' && x.acoes.length === 0))
        c(`(B) ${m.nome}: o eixo do motor entra POR CIMA do prompt já corrigido (Kling/Veo prefixam; Seedance/Sora intocados)`, eixo ? P.every((p, i) => p.startsWith(`${eixo}${i}] `)) : P.every((p) => !/^\[[KV]\d\] /.test(p)))
      }
    }
  }
  c('(B) a chamada do contrato clássico pede palavra inteira, com a régua do modo clássico', Boolean(laco) && laco.includes('          elementosProibidos: proibidosPorModo(classicVisualMode),\n          palavraInteira: true,'))
  c('(B) o laço clássico vive fora do bloco do hollywood e sem condição de motor (indentação de corpo de função, depois do "if (hollywoodPath) {")', rota.indexOf(INI_LACO) > rota.indexOf('    if (hollywoodPath) {\n') && rota.indexOf('    if (hollywoodPath) {\n') > 0 && /const hollywoodPath = wantsHollywood \|\| wantsH3 \|\| wantsH3Max \|\| wantsOmni \|\| wantsS25\b/.test(rota))

  // (C) claim e ensaio
  const objResp = fatia(rota, INI_RESP, FIM_RESP)
  c('(C) a fatia real do objeto de resposta clássico (claim assinado) existe', Boolean(objResp))
  if (objResp) {
    const VARS = ['generationId', 'prompt', 'duration', 'requestedDuration', 'aspectRequested', 'degrau', 'scenes', 'voiceoverScript', 'falRequestIds', 'usedModel', 'usedModels', 'claimQuality', 'verbatim', 'parsedScript', 'contratoRelatoClassico', 'formatoVisual', 'classicSceneInputs', 'anchorActive', 'classicVisualMode']
    const relato = [{ cena: 3, antes: 'elemento_proibido', depois: 'aprovada', cobertura: 'lexico', acoes: ['removido: host'], motivo: 'm' }]
    let resp = null
    try {
      resp = roda(`export function montar(ctx: any) {\n  const { ${VARS.join(', ')} } = ctx\n${objResp}\n  return response\n}`, { kling25SceneWordStarts: () => [] }).montar({
        generationId: 'g', prompt: 'p', duration: 35, requestedDuration: 35, aspectRequested: '9:16', degrau: null, scenes: [{ description: 'a', caption: 'A', voiceover: 'x' }], voiceoverScript: 'x',
        falRequestIds: ['r0'], usedModel: 'm', usedModels: ['m'], claimQuality: 'cinematic_ai', verbatim: true, parsedScript: { speed: null }, contratoRelatoClassico: relato,
        formatoVisual: { modo: 'documentary_faceless' }, classicSceneInputs: [null], anchorActive: false, classicVisualMode: 'character_story',
      })
    } catch (e) { c('(C) o objeto do claim monta: ' + e.message, false) }
    if (resp) {
      c('(C) claim: contrato_cena = o relato do gate clássico', eqJ(resp.contrato_cena, relato))
      c('(C) claim: visual_mode = a decisão do Diretor de Formato (o campo de sempre, comparável com o histórico)', resp.visual_mode === 'documentary_faceless')
      c('(C) claim: contrato_modo = a régua que o gate clássico APLICOU (aqui character_story ≠ visual_mode) e contrato_palavra_inteira = true', resp.contrato_modo === 'character_story' && resp.contrato_palavra_inteira === true)
    }
  }
  const ensaio = fatia(rota, INI_ENSAIO, FIM_ENSAIO)
  c('(C) ensaio de $0 (dry_run clássico): devolve contrato_cena e o mesmo contrato_modo/contrato_palavra_inteira', Boolean(ensaio) && ensaio.includes('        contrato_cena: contratoRelatoClassico,\n        contrato_modo: classicVisualMode, contrato_palavra_inteira: true,'))

  // (D) hollywood idêntico
  const baseRota = rdBase(ROTA)
  const holly = fatia(rota, INI_HOLLY, FIM_HOLLY)
  const hollyBase = baseRota ? fatia(baseRota, INI_HOLLY, FIM_HOLLY) : null
  c('(D) hollywood: o ponto de chamada do contrato é o da base, letra por letra, sem palavraInteira', Boolean(holly) && holly === hollyBase && !holly.includes('palavraInteira'))
  const baseLib = rdBase(LIB)
  if (baseLib) {
    let Lb = null
    try { Lb = roda(baseLib) } catch { Lb = null }
    const corpus = [
      ...CENAS.map((s) => ({ fala: s.voiceover, prompt: s.aiPrompt + SUFIXO })),
      { fala: 'The ship was abandoned and empty.', prompt: 'A crowded busy street with a news anchor and a host, speakers everywhere' },
      { fala: 'The bridge collapsed in 1907.', prompt: 'A pristine brand new bridge, close-up of a face, facial detail' },
      { fala: 'Satellite imagery showed an oil sheen.', prompt: 'A volcano at night' },
    ]
    const MODOS = ['documentary_faceless', 'character_story', 'presenter']
    const resultado = (Lx) => corpus.flatMap((k, i) => MODOS.map((modoV) => Lx.aplicarContrato(Lx.montarContrato({ indice: i + 1, falaFinal: k.fala, promptFinal: k.prompt, elementosProibidos: V.proibidosPorModo(modoV) }))))
    c('(D) hollywood (sem a flag): a lib nova dá resultado JSON-idêntico à da base em 7 cenas × 3 modos, inclusive nos casos de substring', Boolean(Lb) && eqJ(resultado(L), resultado(Lb)))
    c('(D) o corpus exercita o defeito: a lib da base (e o hollywood, que não liga a flag) mutila "anchored" → "ships ed in a port"', Boolean(Lb) && Lb.aplicarContrato(Lb.montarContrato({ indice: 1, falaFinal: CENAS[1].voiceover, promptFinal: CENAS[1].aiPrompt, elementosProibidos: V.proibidosPorModo('documentary_faceless') })).promptCorrigido.includes('ships ed in a port'))
  } else c('(D) a base do sceneTruth foi lida', false)
  return erros
}

console.log('A) byte a byte contra a base (pai do 1º commit com a marca)')
const atual = { rota: rd(ROTA), lib: rd(LIB), modo: rd(MODO) }
const baseRota = rdBase(ROTA)
const baseLib = rdBase(LIB)
let rotaDesfeita = null
let libDesfeita = null
try { rotaDesfeita = semContratoClassicos1410(atual.rota, ROTA); libDesfeita = semContratoClassicos1410(atual.lib, LIB) } catch (e) { console.log('   desfaz lançou: ' + e.message) }
checa('a base existe e NÃO tem a marca', Boolean(baseRota) && !baseRota.includes(MARCA) && Boolean(baseLib) && !baseLib.includes(MARCA))
checa('rota: desfeito o conserto, byte a byte igual à base', rotaDesfeita !== null && rotaDesfeita === baseRota)
checa('sceneTruth: desfeito o conserto, byte a byte igual à base', libDesfeita !== null && libDesfeita === baseLib)
checa('visualMode intocado (proibidosPorModo é a régua dos dois caminhos)', rdBase(MODO) === atual.modo)
checa('toda linha nova/trocada da rota e do sceneTruth leva a marca (o diff não tem linha sem marca)', (() => {
  if (!BASE) return false
  const d = git(['diff', BASE, '--', ROTA, LIB]).replace(/\r/g, '')
  const add = d.split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++'))
  return add.length > 0 && add.every((l) => l.includes(MARCA))
})())
let lancouMarcadaEstranha = false
try { semContratoClassicos1410(atual.rota + '\n// linha estranha ' + MARCA + '\n', ROTA) } catch { lancouMarcadaEstranha = true }
checa('o desfaz LANÇA em linha marcada inesperada (nunca apaga em silêncio)', lancouMarcadaEstranha)

console.log('B–D) comportamento real (laço clássico, claim, ensaio, hollywood)')
const errosReais = avaliar(atual, true)

console.log('E) mutantes (cada um provado aplicado; cada um tem de ficar VERMELHO)')
const LINHA_FLAG = '          palavraInteira: true, // KINEO-CONTRATO-CLASSICOS-1410'
const MUTANTES = [
  ['M1 rota: o laço clássico sem palavraInteira (volta a casar substring)', (t) => ({ ...t, rota: t.rota.split('\n').filter((l) => !l.startsWith(LINHA_FLAG)).join('\n') })],
  ['M2 lib: contemTermo ignora a flag (detecção por substring)', (t) => ({ ...t, lib: t.lib.replace("return palavraInteira ? regexPalavraInteira(termo, '').test(textoNormalizado) : textoNormalizado.includes(termo)", 'return textoNormalizado.includes(termo)') })],
  ['M3 lib: detecção por palavra inteira, mas a REMOÇÃO volta a ser substring', (t) => ({ ...t, lib: t.lib.replace("const re = contrato.palavraInteira ? regexPalavraInteira(ruim, 'gi') :", "const re = false ? regexPalavraInteira(ruim, 'gi') :") })],
  ['M4 rota: o claim clássico perde contrato_modo/contrato_palavra_inteira', (t) => ({ ...t, rota: t.rota.split('\n').filter((l) => !l.startsWith('      contrato_modo: classicVisualMode, contrato_palavra_inteira: true, // KINEO-CONTRATO-CLASSICOS-1410')).join('\n') })],
  ['M5 rota: o hollywood também liga a flag (deixaria de ser byte a byte)', (t) => ({ ...t, rota: t.rota.replace('              elementosProibidos: proibidosPorModo(formatoVisual.modo),\n', '              elementosProibidos: proibidosPorModo(formatoVisual.modo),\n              palavraInteira: true,\n') })],
  ['M6 lib: sem o lookbehind ("host" volta a casar dentro de "ghost ship")', (t) => ({ ...t, lib: t.lib.replace('`(?<![a-z0-9])${termo', '`${termo') })],
]
for (const [nome, muta] of MUTANTES) {
  const m = muta(atual)
  const aplicado = m.rota !== atual.rota || m.lib !== atual.lib
  const erros = aplicado ? avaliar(m) : []
  checa(`${nome}: aplicado e VERMELHO (${erros.length} checagem(ns) caíram${erros.length ? ': ' + erros[0].slice(0, 70) : ''})`, aplicado && erros.length > 0)
}

console.log(`\n${falhas === 0 && errosReais.length === 0 ? '✅' : '❌'} test-contrato-classicos-1410: ${ok} ok · ${falhas} falhas`)
process.exit(falhas === 0 && errosReais.length === 0 ? 0 : 1)
