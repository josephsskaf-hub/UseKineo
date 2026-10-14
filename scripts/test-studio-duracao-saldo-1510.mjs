// KINEO-STUDIO-DURACAO-SALDO-1510 — guardião da duração que o saldo PAGA no /studio, antes do clique.
// (fundador 15/10: "tudo sim" nas jogadas de venda; consertos valem mesmo com o produto congelado.)
//
// O defeito: o /studio abria/ficava em 35/60/90 s para quem tem 10 cr (teste) ou 14 cr (região) — a régua de entrada
// rodava uma vez e a duração que chegava depois (router.push do atalho do ChatGPT com duration=60/35, troca de motor)
// passava por cima. A pessoa só descobria no clique: wall_before_script ou a prévia de cenas.
// O conserto: lib/growth/duracaoPeloSaldo.ts decide (puro) e o StudioClient aplica sempre que saldo/motor/duração mudam,
// respeitando a escolha feita com a mão. Este guardião EXECUTA a regra com a função que COBRA (lib/credits/engineCost.ts)
// e lê a fiação no StudioClient. Sem rede, sem banco.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import crypto from 'node:crypto'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const ts = require(path.join(ROOT, 'node_modules', 'typescript'))
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }
function load(src) {
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const mod = { exports: {} }
  new Function('module', 'exports', 'require', js)(mod, mod.exports, (p) => { throw new Error('import inesperado: ' + p) })
  return mod.exports
}
const temLinha = (src, linha) => src.split('\n').some((l) => l === linha)

const HELPER_SRC = read('lib/growth/duracaoPeloSaldo.ts')
const H = load(HELPER_SRC)
const COST = load(read('lib/credits/engineCost.ts'))
const DUR = load(read('lib/durationByEngine.ts'))
const ST = read('app/(dashboard)/studio/StudioClient.tsx')
const CURTO = DUR.SEEDANCE_SHORT_SECONDS
const custoSeedance = (s) => COST.creditCostForDuration('cinematic_ai', true, s)
const OPCOES_SEEDANCE = [CURTO, 35, 60, 90]

console.log('0 — régua de dinheiro (a função que cobra, nenhum número digitado aqui)')
ok(CURTO === 15, 'o filme curto do Seedance 1.5 é de 15 s')
ok(custoSeedance(15) > 0 && custoSeedance(15) <= 10, `15 s (${custoSeedance(15)} cr) cabe no teste de 10 e na região de 14`)
ok(custoSeedance(35) > 14 && custoSeedance(60) > 14, `35 s (${custoSeedance(35)} cr) e 60 s (${custoSeedance(60)} cr) NÃO cabem em 14`)
ok(custoSeedance(35) <= 35, `35 s (${custoSeedance(35)} cr) cabe em 35`)

console.log('1 — a decisão (executada)')
const base = { atual: 35, opcoes: OPCOES_SEEDANCE, saldo: 14, paga: false, escolhaExplicita: false, custo: custoSeedance }
const dec = (over = {}) => H.duracaoQueOSaldoPaga({ ...base, ...over })
const r14 = dec()
ok(r14.mudou === true && r14.duracao === 15 && r14.de === 35 && r14.motivo === 'fit', 'saldo 14 + padrão 35 s → 15 s selecionado')
const r10 = dec({ saldo: 10 })
ok(r10.mudou === true && r10.duracao === 15, 'saldo 10 + padrão 35 s → 15 s selecionado')
ok(dec({ atual: 60 }).duracao === 15 && dec({ atual: 90, saldo: 10 }).duracao === 15, '60 s e 90 s também descem para 15 s')
ok(r14.custoPara === custoSeedance(15) && r14.custoDe === custoSeedance(35), 'os custos do evento são os da função que cobra')
const r35 = dec({ saldo: 35 })
ok(r35.mudou === false && r35.duracao === 35 && r35.motivo === 'balance_pays', 'saldo 35 + 35 s → 35 s mantido')
ok(dec({ saldo: custoSeedance(60), atual: 60 }).mudou === false, 'saldo que paga 60 s mantém 60 s')
const r60para35 = dec({ atual: 60, saldo: custoSeedance(35) })
ok(r60para35.mudou === true && r60para35.duracao === 35, 'desce para a MAIOR que cabe (60 → 35 quando o saldo paga 35), não direto para 15')
const explicita = dec({ escolhaExplicita: true })
ok(explicita.mudou === false && explicita.duracao === 35 && explicita.motivo === 'explicit', 'escolha explícita (35 s com 14 cr) é respeitada — a parede de sempre explica')
ok(dec({ paga: true, saldo: 500, atual: 60 }).mudou === false, 'plano pago com saldo: nada muda')
ok(dec({ paga: true }).mudou === false && dec({ paga: true }).motivo === 'paid_or_unknown', 'plano pago com saldo curto: nada muda (fora deste conserto)')
ok(dec({ paga: null }).mudou === false && dec({ paga: undefined }).mudou === false, 'conta que não sabemos se paga: nada muda')
ok(dec({ saldo: null }).motivo === 'balance_unknown' && dec({ saldo: NaN }).mudou === false, 'saldo desconhecido: nada muda')
ok(dec({ atual: 15, saldo: 1000 }).duracao === 15, 'nunca SOBE (15 s com saldo alto fica 15 s — subir cobraria mais)')
ok(dec({ saldo: 3 }).mudou === false && dec({ saldo: 3 }).motivo === 'nothing_shorter_fits', 'nada cabe (3 cr): fica, a parede explica')
ok(dec({ opcoes: [35, 60, 90] }).motivo === 'nothing_shorter_fits', 'sem o botão de 15 s no motor, não inventa 15 s')
ok(dec({ opcoes: [90, 15, 15, 60, 35] }).duracao === 15, 'opções fora de ordem/duplicadas não mudam a escolha')

console.log('2 — a nota honesta')
ok(H.notaDaDuracaoPeloSaldo({ engine: 'seedance', para: 15, saldo: 14, segundosDoFilmeGratis: CURTO }) === 'Your free film is 15 s — longer films need a plan.', 'Seedance 15 s: "Your free film is 15 s — longer films need a plan."')
ok(/^Set to 35 s — the longest your 30 credits pay\. Longer films need a plan\.$/.test(H.notaDaDuracaoPeloSaldo({ engine: 'veo', para: 35, saldo: 30, segundosDoFilmeGratis: CURTO })), 'outro motor: diz a duração e o saldo, sem prometer "grátis"')
ok(!/\b\d+\s*cr\b|\$\s*\d/.test(HELPER_SRC.replace(/^\s*\/\/.*$/gm, '')), 'o módulo não digita preço nenhum')

console.log('3 — a fiação no StudioClient')
ok(ST.includes("import { duracaoQueOSaldoPaga, notaDaDuracaoPeloSaldo, DURACAO_PELO_SALDO_EVENT, DURACAO_PELO_SALDO_VERSION } from '@/lib/growth/duracaoPeloSaldo' // KINEO-STUDIO-DURACAO-SALDO-1510"), 'importa a regra pura')
ok(temLinha(ST, '      escolhaExplicita: duracaoExplicitaRef.current === engine,'), 'a escolha explícita vale para o motor em que foi feita')
ok(temLinha(ST, '      paga: contaPaga,') && temLinha(ST, '      saldo: balance,') && temLinha(ST, '      atual: duration,'), 'saldo, conta e duração atual entram na regra')
ok(temLinha(ST, "      custo: (s) => creditCostForDuration(ENGINE_QUALITY[engine] ?? 'cinematic_ai', true, s),"), 'o custo é a MESMA função/qualidade do preço da tela (cost)')
ok(ST.includes("const cost = creditCostForDuration(ENGINE_QUALITY[eng.key] ?? 'cinematic_ai', true, duration) + estrelaCr"), 'o preço da tela segue o de sempre')
ok(temLinha(ST, '      opcoes: [...curtasDoMotor(engine), MIN_DURATION_ALL_ENGINES, 60, 90],'), 'as opções são as do seletor deste motor (15 s só com o botão)')
ok(temLinha(ST, '  }, [flagsProntas, balance, engine, duration, contaPaga, seedance15Ok, curtasOk, scriptMode, estrelaLigada]) // eslint-disable-line react-hooks/exhaustive-deps'), 'roda de novo quando saldo, motor, duração ou conta mudam (não é mais uma vez só)')
ok(temLinha(ST, "    if (!flagsProntas || scriptMode === 'clip' || estrelaLigada) return"), 'espera as flags; clipe e estrela ficam como antes')
ok(temLinha(ST, '    if (!r.mudou) return') && temLinha(ST, '    setDuration(r.duracao as StudioDuration)'), 'só mexe quando a regra manda')
ok(ST.includes('void trackEvent(DURACAO_PELO_SALDO_EVENT, { engine, from: r.de, to: r.duracao, balance,'), 'mede a descida (evento com de/para/saldo)')
ok(temLinha(ST, '  const marcarEscolhaDeDuracao = () => { duracaoExplicitaRef.current = engine; setDuracaoAjustada(null) }'), 'a escolha com a mão marca o motor e apaga a nota')
const pills = [
  'onClick={() => setDuration(SEEDANCE_SHORT_SECONDS)} onClickCapture={marcarEscolhaDeDuracao}',
  'onClick={() => setDuration(d as StudioDuration)} onClickCapture={marcarEscolhaDeDuracao}',
  'onClick={() => setDuration(35)} onClickCapture={marcarEscolhaDeDuracao}>35s</button>',
  'onClick={() => setDuration(60)} onClickCapture={marcarEscolhaDeDuracao}>60s ⭐</button>',
  'onClick={() => setDuration(90)} onClickCapture={marcarEscolhaDeDuracao} title=',
]
ok(pills.every((p) => ST.includes(p)), 'os 5 botões de duração (15, curtas, 35, 60, 90) marcam a escolha com a mão')
ok(!/onClick=\{\(\) => setDuration\([^)]*\)\}(?! onClickCapture=\{marcarEscolhaDeDuracao\})/.test(ST), 'nenhum botão de duração troca a duração sem marcar a escolha')
ok(ST.includes('{notaDuracaoAjustada && (') && ST.includes('data-kineo="duracao-pelo-saldo"'), 'a nota honesta aparece depois da descida')
ok(ST.includes('<a href="/pricing?intent_campaign=studio_duration_fit"') && ST.includes('See plans →</a>'), 'o caminho do plano continua visível na nota')
ok(temLinha(ST, "  const notaDuracaoAjustada = duracaoAjustada && duracaoAjustada.engine === engine && duracaoAjustada.para === duration && balance !== null && scriptMode !== 'clip'"), 'a nota some quando a pessoa troca a duração ou o motor')
ok(ST.indexOf('const duracaoExplicitaRef = useRef') > ST.indexOf('const estrelaLigada ='), 'o efeito vem depois de estrelaLigada/curtasDoMotor (sem TDZ nas dependências)')

console.log('4 — só isto mudou no Studio (desfeito, é a base byte a byte)')
const { semDuracaoSaldo1510 } = await import('./test-support/desfaz-duracao-saldo-1510.mjs')
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex')
// A impressão do Studio de antes deste conserto (a mesma do D4 de scripts/test-ads-fluxo-1310.mjs).
ok(sha(semDuracaoSaldo1510(ST)) === 'f14aced01385418c88fd1a3fc7218c7a6ca83a805d36d776f14c7d2a371fc25c', 'desfeitos import + 2 blocos ▼▲ + 5 onClickCapture, o StudioClient é EXATAMENTE a base')
let lancou = false
try { semDuracaoSaldo1510(ST.replace('  const shortestDuration = ', '  const x = 1 // KINEO-STUDIO-DURACAO-SALDO-1510\n  const shortestDuration = ')) } catch { lancou = true }
ok(lancou, 'uma linha marcada a mais fora dos blocos faz o desfaz LANÇAR (não engole mudança nova)')
const STUDIO_KIT = read('components/studioKit.tsx')
ok(sha(STUDIO_KIT) === 'c2e1679411a5816f5e80f8a592c17499843e931b3c49b3fbf770637bb8040727', 'components/studioKit.tsx intocado (a pista do Ads reaproveita as classes)')

console.log(`\n${pass} ok, ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
