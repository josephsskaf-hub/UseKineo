// [TRAVA 8.2 — vai do fundador 26/10 "1A"] KINEO-FILME15-ROSTO-2610 — guardião do "rosto fixo no filme grátis de 15 s".
// Prova, sem rede e sem render, com o código REAL:
//   A. lib/filmes/filme15RostoFixo.ts: 15 s + Seedance 1.5 + conta interna → liga; conta de fora → não (fase 1); fase pública →
//      liga para todos; 35 s, Kling, Veo → nunca.
//   B. rota: o pedido implícito entra em personagemPedido E em decidirPersonagem (interna || filme15RostoFixo; pedido ['personagem']),
//      sem tocar nas outras portas (motor, âncora, Estrela, [faceless]).
//   C. decidirPersonagem REAL (lib/cinematic/folhaDePersonagem.ts) com o pedido implícito: liga no Seedance; [faceless] e Estrela
//      continuam desligando.
//   D. desfaz exato: sem a camada a rota é byte a byte a base; mutantes aplicados e vermelhos.
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import vm from 'node:vm'
import ts from 'typescript'
import { semFilme15Rosto2610, FILME15_ROSTO_2610, MARCA_FILME15_ROSTO_2610 as MARCA } from './test-support/desfaz-filme15-rosto-2610.mjs'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const lf = (t) => t.replace(/\r\n/g, '\n')
const rd = (p) => lf(readFileSync(join(RAIZ, p), 'utf8'))
const git = (...a) => execFileSync('git', a, { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 << 20 })
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) { ok++; console.log('  ok  ' + n) } else { falhas.push(n); console.log('  FALHA ' + n) } }
const roda = (src, mods = {}) => {
  const js = ts.transpileModule(src, { compilerOptions: { module: 1, target: 9 } }).outputText
  const exp = {}
  vm.runInNewContext(js, { exports: exp, module: { exports: exp }, require: (id) => mods[id] ?? {}, console, process: { env: {} } })
  return exp
}
const durationByEngine = { SEEDANCE_SHORT_SECONDS: 15, isSeedance15: (e) => { const k = typeof e === 'string' ? e.trim().toLowerCase() : ''; return k === '' || k === 'seedance' || k === 'cinematic_ai' } }
const ROSTO_SRC = rd('lib/filmes/filme15RostoFixo.ts')
const R = roda(ROSTO_SRC, { '@/lib/durationByEngine': durationByEngine })

console.log('== A. decisão pura ==')
checa('A1 fase 2 (fundador 26/10 "pode ligar para todos"): FILME15_ROSTO_FIXO_PUBLIC = true', R.FILME15_ROSTO_FIXO_PUBLIC === true)
checa('A2 15 s + seedance + interna → liga', R.rostoFixoNoFilme15({ duration: 15, engine: 'seedance', interna: true }) === true)
checa('A3 15 s + engine ausente (padrão Seedance) + interna → liga', R.rostoFixoNoFilme15({ duration: '15', engine: undefined, interna: true }) === true)
checa('A4 fase 2: conta de fora liga (padrão público); com publico:false explícito, não', R.rostoFixoNoFilme15({ duration: 15, engine: 'seedance', interna: false }) === true && R.rostoFixoNoFilme15({ duration: 15, engine: 'seedance', interna: false, publico: false }) === false)
checa('A5 fase pública → liga para conta de fora', R.rostoFixoNoFilme15({ duration: 15, engine: 'seedance', interna: false, publico: true }) === true)
checa('A6 35 s, Kling e Veo nunca ligam (mesmo interna/pública)', [[35, 'seedance'], [15, 'kling'], [15, 'veo'], [60, 'seedance']].every(([d, e]) => R.rostoFixoNoFilme15({ duration: d, engine: e, interna: true, publico: true }) === false))

console.log('== B. rota ==')
const rota = rd('app/api/generate-video-cinematic/route.ts')
checa('B1 import do módulo novo', rota.includes("import { rostoFixoNoFilme15 } from '@/lib/filmes/filme15RostoFixo' // KINEO-FILME15-ROSTO-2610"))
checa('B2 filme15RostoFixo calculado com duration, engine e conta interna', rota.includes('const filme15RostoFixo = rostoFixoNoFilme15({ duration: body.duration, engine: body.engine, interna: isInternalEmail(user.email) })'))
const iPedido = rota.indexOf('const personagemPedido = PERSONAGEM_PUBLIC || filme15RostoFixo || ')
checa('B3 personagemPedido inclui o pedido implícito e vem depois do cálculo', iPedido > 0 && iPedido > rota.indexOf('const filme15RostoFixo = '))
checa('B4 decidirPersonagem recebe interna || filme15RostoFixo e pedido [\'personagem\']', rota.includes("decidirPersonagem({ interna: isInternalEmail(user.email) || filme15RostoFixo, pedido: filme15RostoFixo ? ['personagem'] : "))
checa('B5 as outras portas continuam iguais (âncora, Estrela, [faceless])', /anchorEnabled: CINEMATIC_ANCHOR_ENABLED, estrelaAtiva, tagFaceless: tagFacelessPresente \}\)/.test(rota))

console.log('== C. decidirPersonagem REAL ==')
const modelos = new Proxy({}, { get: () => 'modelo-falso' })
const F = roda(rd('lib/cinematic/folhaDePersonagem.ts'), { '@/lib/aiModels': { AI_TEXT_MODELS: modelos }, '@/lib/cinematic/sceneStyle': { deriveExplicitCharacter: () => null }, '@/lib/estrelaDoFilme': { ESTRELA_EDIT_SLUG: 'x', buildEstrelaEditInput: () => ({}) } })
const dec = (o) => F.decidirPersonagem({ interna: true, pedido: ['personagem'], engine: 'seedance', anchorEnabled: true, estrelaAtiva: false, tagFaceless: false, ...o })
if (typeof F.decidirPersonagem === 'function') {
  checa('C1 pedido implícito no Seedance → ativo', dec({}).ativo === true)
  checa('C2 [faceless] desliga', dec({ tagFaceless: true }).ativo === false)
  checa('C3 Estrela desliga', dec({ estrelaAtiva: true }).ativo === false)
  checa('C4 âncora desligada desliga', dec({ anchorEnabled: false }).ativo === false)
} else checa('C0 decidirPersonagem carregou', false)

console.log('== D. desfaz exato ==')
const commits = git('log', '--format=%H', `--grep=${MARCA}`).trim().split('\n').filter(Boolean)
const base = commits.length ? `${commits[commits.length - 1]}^` : 'HEAD'
const baseSha = git('rev-parse', base).trim()
checa(`D1 base da tabela = base real (${baseSha.slice(0, 9)})`, FILME15_ROSTO_2610.base === baseSha)
const f = 'app/api/generate-video-cinematic/route.ts'
const baseTxt = lf(git('show', `${baseSha}:${f}`))
checa('D2 sem a camada a rota é byte a byte a base', semFilme15Rosto2610(rota, f) === baseTxt)
checa('D3 idempotente e preserva CRLF', semFilme15Rosto2610(baseTxt, f) === baseTxt && semFilme15Rosto2610(rota.replace(/\n/g, '\r\n'), f) === baseTxt.replace(/\n/g, '\r\n'))
checa('D4 todo trecho novo leva a marca', FILME15_ROSTO_2610.scope[f].hunks.every((h) => h.after.includes(MARCA)))
let lancou = false
try { semFilme15Rosto2610(rota.replace("filme15RostoFixo ? ['personagem']", "filme15RostoFixo ? ['x']"), f) } catch { lancou = true }
checa('D5 adulterada → LANÇA', lancou)

console.log('== mutantes ==')
const m1 = ROSTO_SRC.replace('return ehFilme15(args.duration, args.engine) && (publico || args.interna === true)', 'return ehFilme15(args.duration, args.engine) && (publico || true)')
checa('M1 aplicado (conta de fora liga na fase 1)', m1 !== ROSTO_SRC)
checa('M1 → A4 vermelho', roda(m1, { '@/lib/durationByEngine': durationByEngine }).rostoFixoNoFilme15({ duration: 15, engine: 'seedance', interna: false, publico: false }) === true)
const m2 = ROSTO_SRC.replace('return Number(duration) === SEEDANCE_SHORT_SECONDS && ', 'return ')
checa('M2 aplicado (qualquer duração)', m2 !== ROSTO_SRC)
checa('M2 → A6 vermelho', roda(m2, { '@/lib/durationByEngine': durationByEngine }).rostoFixoNoFilme15({ duration: 35, engine: 'seedance', interna: true }) === true)
const baseRota = semFilme15Rosto2610(rota, f)
checa('M3 base da rota não tem o pedido implícito (B4 seria vermelho)', !baseRota.includes('filme15RostoFixo'))

console.log(`\n${ok} ok, ${falhas.length} falha(s)`)
if (falhas.length) { console.log(falhas.map((x) => ' - ' + x).join('\n')); process.exit(1) }
