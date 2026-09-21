// KINEO1-AVISO-DESENHO-2026-09-18 — guardião: pedido de desenho/animação no Kineo 1 ganha aviso ANTES do crédito.
// Fundador: "no 3 quero o aviso" (não a troca automática). Sem rede, sem banco; decisão pura com mutante + montagem.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const ts = require(join(root, 'node_modules', 'typescript'))
const rd = (p) => readFileSync(join(root, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0; const falhas = []
const checa = (nome, cond) => { if (cond) { ok += 1; return } falhas.push(nome); console.error('  ✗ ' + nome) }
function roda(src) {
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const m = { exports: {} }
  // KINEO1-FILME-DESENHADO-2026-09-21 — as palavras de desenho moram em lib/cinematic/sceneStyle (fonte única);
  // o único import permitido é esse, carregado cru como o próprio módulo.
  new Function('module', 'exports', 'require', js)(m, m.exports, (id) => {
    if (id === '@/lib/cinematic/sceneStyle') return roda(rd('lib/cinematic/sceneStyle.ts'))
    throw new Error('sem imports: ' + id)
  })
  return m.exports
}

console.log('1) decisão pura, com os pedidos REAIS de 18/09')
const libSrc = rd('lib/growth/kineo1FitNotice.ts')
const L = roda(libSrc)
const hindi = 'रंग-बिरंगे कार्टून स्टाइल में एक भारतीय मोहल्ले का दृश्य। मोटू, पतलू और चुटकी घर के बाहर खड़े हैं।'
checa('pedido em hindi de desenho (कार्टून) no Kineo 1 → aviso', L.decideKineo1FitNotice({ engine: 'fast', text: hindi }).show === true)
checa('o mesmo pedido no Seedance → sem aviso', L.decideKineo1FitNotice({ engine: 'seedance', text: hindi }).reason === 'not_kineo1')
checa('"a cartoon about a brave little robot" → aviso', L.decideKineo1FitNotice({ engine: 'fast', text: 'a cartoon about a brave little robot who learns to fly' }).show === true)
checa('"dibujos animados de un perro" → aviso', L.decideKineo1FitNotice({ engine: 'fast', text: 'un video de dibujos animados de un perro que viaja a la luna' }).show === true)
checa('"desenho animado" → aviso', L.decideKineo1FitNotice({ engine: 'fast', text: 'um desenho animado sobre um menino e a lua' }).show === true)
checa('árabe (كرتون) → aviso', L.decideKineo1FitNotice({ engine: 'fast', text: 'فيديو كرتون عن قطة صغيرة تتعلم الطيران' }).show === true)
checa('"the deadliest animals in the world" (filme real de 18/09) → sem aviso', L.decideKineo1FitNotice({ engine: 'fast', text: 'The animal deadlier than sharks, wolves, and lions combined... fits in your hand.' }).reason === 'no_cartoon_words')
checa('"animal" não é "animated" (fronteira de palavra)', L.decideKineo1FitNotice({ engine: 'fast', text: 'wild animals of africa and their animalistic behavior' }).show === false)
checa('texto curto demais não dispara', L.decideKineo1FitNotice({ engine: 'fast', text: 'anime' }).reason === 'too_short')
const copy = L.kineo1FitNoticeCopy('15 cr')
checa('copy diz que o Kineo 1 usa filmagem real e aponta o Seedance com o custo', /real footage/i.test(copy.title) && copy.body.includes('Seedance 1.5') && copy.body.includes('15 cr'))

console.log('2) mutante: tirar o interruptor do motor faria o aviso aparecer no Seedance')
const mut = libSrc.replace("if (input.engine !== 'fast') return { show: false, reason: 'not_kineo1', version }", '')
checa('mutante aplicou', mut !== libSrc)
checa('mutante é pego (aviso no Seedance)', roda(mut).decideKineo1FitNotice({ engine: 'seedance', text: hindi }).show === true)

console.log('3) montagem no Studio')
const st = rd('app/(dashboard)/studio/StudioClient.tsx')
checa('Studio importa a decisão', st.includes("import { decideKineo1FitNotice, kineo1FitNoticeCopy } from '@/lib/growth/kineo1FitNotice'"))
checa('a decisão lê o motor escolhido e o texto digitado', st.includes('decideKineo1FitNotice({ engine, text: prompt })'))
checa('aviso montado abaixo do texto, com botão de troca para o Seedance e botão de manter', st.includes('data-kineo="aviso-desenho"') && st.includes("setEngine('seedance')") && st.includes('setKineo1FitKept(true)'))
checa('três eventos: mostrado, trocou, manteve', st.includes("trackEvent('kineo1_fit_notice_shown'") && st.includes("trackEvent('kineo1_fit_notice_switched'") && st.includes("trackEvent('kineo1_fit_notice_kept'"))
checa('o aviso não bloqueia o render (nenhum return/disabled amarrado a kineo1Fit no botão de gerar)', !/disabled=\{[^}]*kineo1Fit/.test(st))

console.log(`\n═══ ${ok} passaram, ${falhas.length} falharam ═══`)
process.exit(falhas.length ? 1 : 0)
