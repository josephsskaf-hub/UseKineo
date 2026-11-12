// KINEO-CANCELADO-SEM-MOTOR-1211 — guardião: a /checkout/cancelled não mostra nome de motor no filme incluído do trial.
// Regra do fundador (11/11: "Tira, com certeza" / "Tira também"): tela logada do caminho do dinheiro sem nome de motor. Aqui, além do
// nome, a frase estava velha — o filme do trial não é mais Seedance (o trilho 'seedance' é feito pelo MiniMax H3 Turbo).
// Prova: (1) as três frases do filme incluído não citam motor; (2) link, motor de destino, custo, eventos e versão intocados;
// (3) a linha do "plano que cabe" (engineLabel) fica: ela descreve o motor que a pessoa escolheu e é listada, não reescrita.
// Rodar: node scripts/test-cancelado-sem-motor-1211.mjs
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const PAGE = 'app/checkout/cancelled/page.tsx'
const SRC = readFileSync(resolve(root, PAGE), 'utf8').replace(/\r\n/g, '\n')
const MOTORES = /\b(Seedance|MiniMax|Kling|Veo|Hailuo|Sora|Runway|Wan|Topaz|Kineo 1)\b/u

function battery(src) {
  const p = []
  const textos = [
    '`Your included ${TRIAL_FIRST_DELIVERY_DURATION}s film is still available.`',
    'Start with a {TRIAL_FIRST_DELIVERY_DURATION}s film for {TRIAL_FIRST_DELIVERY_COST} credits and keep the rest of your trial for more videos. Nothing starts until you choose Generate.',
    'Build my {TRIAL_FIRST_DELIVERY_DURATION}s film →',
  ]
  for (const t of textos) if (!src.includes(t)) p.push(`falta a frase sem motor: ${t.slice(0, 60)}`)
  // nenhum nome de motor em texto visível: tira o que é técnico (link, evento) e procura no resto do JSX/strings
  const visivel = src
    .split('\n')
    .filter((l) => !/^\s*(\/\/|\/\*|\*)/u.test(l))
    .map((l) => l.replace(/engine=seedance/gu, '').replace(/target_engine: 'seedance'/gu, '').replace(/\/\*[^*]*\*\//gu, ''))
    .join('\n')
  const m = visivel.match(MOTORES)
  if (m) p.push(`nome de motor visível na página: ${m[0]}`)
  // intocados
  if (!src.includes('const firstDeliveryHref = `/studio/create?engine=seedance&duration=${TRIAL_FIRST_DELIVERY_DURATION}&intent_campaign=${TRIAL_FIRST_DELIVERY_VERSION}`')) p.push('o link do filme incluído mudou')
  if (src.split("target_engine: 'seedance',").length !== 3) p.push('o motor de destino nos eventos mudou')
  if (!src.includes("trackEvent('checkout_cancelled_trial_delivery_clicked'")) p.push('o evento do clique mudou')
  if (!src.includes('{planFitReturn.monthlyVideos} × {planFitReturn.seconds}s {planFitReturn.engineLabel} video')) p.push('a linha do "plano que cabe" foi reescrita (era para só listar)')
  return p
}

let failed = 0
const base = battery(SRC)
console.log(base.length === 0 ? 'PASS /checkout/cancelled sem nome de motor no filme incluído; link, eventos e plano-que-cabe intocados' : 'FAIL\n  ' + base.join('\n  '))
if (base.length) failed++

const muta = (from, to) => { if (!SRC.includes(from)) throw new Error('mutante sem âncora: ' + from.slice(0, 60)); return SRC.replace(from, to) }
const MUTANTES = [
  ['Seedance volta no aviso', muta('s film is still available.`', 's Seedance episode is still available.`')],
  ['Seedance volta no botão', muta('Build my {TRIAL_FIRST_DELIVERY_DURATION}s film →', 'Build my {TRIAL_FIRST_DELIVERY_DURATION}s Seedance episode →')],
  ['MiniMax no texto', muta('Start with a {TRIAL_FIRST_DELIVERY_DURATION}s film for', 'Start with a {TRIAL_FIRST_DELIVERY_DURATION}s MiniMax H3 Turbo film for')],
  ['link mudou', muta('engine=seedance&duration=', 'engine=h3&duration=')],
  ['plano-que-cabe reescrito', muta('{planFitReturn.seconds}s {planFitReturn.engineLabel} video', '{planFitReturn.seconds}s video')],
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
