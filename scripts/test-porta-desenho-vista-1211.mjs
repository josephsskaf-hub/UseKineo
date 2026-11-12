// KINEO-PORTA-DESENHO-VISTA-1211 — guardião da impressão da porta "só com plano" do desenho infantil.
// Prova: (1) o evento kids_cartoon_plan_door_shown dispara só quando o servidor disse "sem plano" e a pessoa está logada;
// (2) uma vez por montagem; (3) o navegador pode gravá-lo (não está na lista de eventos só do servidor); (4) a tela e o clique de
// sempre (kids_cartoon_plans_clicked, o botão "See plans") não mudaram. Cada mutante tem de derrubar a bateria.
// Rodar: node scripts/test-porta-desenho-vista-1211.mjs
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(resolve(root, p), 'utf8').replace(/\r\n/g, '\n')
const TPL = 'components/kidsCartoon/KidsCartoonTemplate.tsx'
const EVENTS = 'app/api/events/route.ts'
const SRC = { [TPL]: rd(TPL), [EVENTS]: rd(EVENTS) }

function battery(src) {
  const p = []
  const t = src[TPL]
  const i = t.indexOf("trackEvent('kids_cartoon_plan_door_shown'")
  if (i < 0) return ['o evento da porta vista não existe']
  if (t.split("trackEvent('kids_cartoon_plan_door_shown'").length !== 2) p.push('o evento da porta vista dispara de mais de um lugar')
  const bloco = t.slice(t.lastIndexOf('useEffect(() => {', i), t.indexOf('}, [', i) + 30)
  if (!bloco.includes('if (!semPlano || visitante || portaVista.current) return')) p.push('a impressão não está presa a "sem plano", "logado" e "uma vez"')
  if (!bloco.includes('portaVista.current = true')) p.push('a impressão não marca que já disparou (dispararia a cada render)')
  if (!bloco.includes('}, [semPlano, visitante])')) p.push('a impressão não depende da leitura do plano')
  if (!t.includes('const portaVista = useRef(false)')) p.push('falta a trava de uma vez por montagem')
  const ev = src[EVENTS]
  const lista = ev.slice(ev.indexOf('const SERVER_ONLY_EVENTS = new Set(['), ev.indexOf('])', ev.indexOf('const SERVER_ONLY_EVENTS = new Set([')))
  if (lista.includes("'kids_cartoon_plan_door_shown'")) p.push('o evento está na lista só do servidor: o navegador não consegue gravar')
  // a tela de sempre
  if (!t.includes("{semPlano && !visitante ? <button type=\"button\" className=\"kkc-go kkc-big\" data-kineo=\"kids-ver-planos\" onClick={irAosPlanos}>")) p.push('o botão "See plans" da porta mudou')
  if (!t.includes("void trackEvent('kids_cartoon_plans_clicked', { credits: cost, balance, duration, surface: 'form' })")) p.push('o clique da porta mudou')
  return p
}

let failed = 0
const base = battery(SRC)
console.log(base.length === 0 ? 'PASS porta do desenho: impressão só sem plano, logado, uma vez; o navegador grava; botão e clique intocados' : 'FAIL\n  ' + base.join('\n  '))
if (base.length) failed++

const muta = (rel, from, to) => {
  if (!SRC[rel].includes(from)) throw new Error(`mutante sem âncora em ${rel}: ${from.slice(0, 80)}`)
  return { ...SRC, [rel]: SRC[rel].replace(from, to) }
}
const MUTANTES = [
  ['dispara para todo mundo', muta(TPL, 'if (!semPlano || visitante || portaVista.current) return', 'if (portaVista.current) return')],
  ['dispara para visitante', muta(TPL, 'if (!semPlano || visitante || portaVista.current) return', 'if (!semPlano || portaVista.current) return')],
  ['dispara a cada render', muta(TPL, '    portaVista.current = true\n', '')],
  ['evento sumiu', muta(TPL, "void trackEvent('kids_cartoon_plan_door_shown'", "void trackEvent('kids_cartoon_door'")],
  ['evento só do servidor', muta(EVENTS, 'const SERVER_ONLY_EVENTS = new Set([', "const SERVER_ONLY_EVENTS = new Set([\n  'kids_cartoon_plan_door_shown',")],
  ['clique mudou', muta(TPL, "surface: 'form' })", "surface: 'porta' })")],
]
let killed = 0
for (const [nome, src] of MUTANTES) {
  let p
  try { p = battery(src) } catch (e) { p = [`lançou: ${e.message}`] }
  if (p.length > 0) killed++
  else { failed++; console.log(`SOBREVIVEU mutante: ${nome}`) }
}
console.log(`mutantes: ${killed}/${MUTANTES.length} mortos`)
if (failed) { console.log('FAIL'); process.exit(1) }
console.log('OK')
