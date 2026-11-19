// KINEO-SELO-ADMIN-1811 — guardião: o cartão de "Tudo que esta pessoa fez" (/admin/people) mostra o motor que RODOU.
// Caso real 18/11 (assinante basic, tema GTA 6): videos.engine_used = kling4 (filme de 30 s, cinematic_hollywood) e
// h3_max_turbo (cinematic_ai), confirmados pelos fal_models do claim. O cartão dizia "KLING 3" e "SEEDANCE".
// Executa a tradução real (lib/engineLabel.ts) e confere a ligação da rota e da tela. Mutantes têm de morrer.
import fs from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const lf = (s) => s.replace(/\r\n/g, '\n')
const erros = []
let ok = 0
const checa = (nome, cond) => { if (cond) ok++; else erros.push(nome) }

function avalia(rota, tela, rotulo) {
  const falhas = []
  const casos = [
    ['cinematic_hollywood', 'kling4', 'Kling 4.0'],
    ['cinematic_ai', 'h3_max_turbo', 'MiniMax H3 Turbo'],
    ['cinematic_ai', 'kling4', 'Kling 4.0'],
  ]
  for (const [q, e, esperado] of casos) if (rotulo(q, e) !== esperado) falhas.push(`A ${q}+${e} → ${rotulo(q, e)} (esperado ${esperado})`)
  if (!/\.select\('[^']*\bengine_used\b[^']*'\)/.test(rota)) falhas.push('B a rota não lê videos.engine_used')
  if (!/engine:\s*engineLabelFor\(v\.quality_mode[^\n]*engine_used/.test(rota)) falhas.push('C a rota não entrega o rótulo do recibo ao cartão')
  if (!/\{v\.engine \?\? MEDIA_ENGINE_LABEL\[/.test(tela)) falhas.push('D o cartão não mostra o motor do recibo antes do mapa por modo')
  return falhas
}

const load = createOfflineLoader()
const { engineLabelFor } = load('lib/engineLabel.ts')
const rota = lf(fs.readFileSync('app/api/admin/person-media/route.ts', 'utf8'))
const tela = lf(fs.readFileSync('app/admin/people/PeopleClient.tsx', 'utf8'))

const real = avalia(rota, tela, engineLabelFor)
checa('real: ' + real.join(' | '), real.length === 0)
// sem recibo continua o mapa de sempre (filme antigo)
checa('sem recibo, cinematic_hollywood segue no mapa', engineLabelFor('cinematic_hollywood', null) === 'Kling 3')

const mutantes = [
  ['rota sem engine_used no select', () => avalia(rota.replace(', engine_used\')', '\')'), tela, engineLabelFor)],
  ['rota sem o campo engine', () => avalia(rota.replace(/engine: engineLabelFor\([^\n]*\n/, ''), tela, engineLabelFor)],
  ['tela volta ao mapa por modo', () => avalia(rota, tela.replace('{v.engine ?? MEDIA_ENGINE_LABEL[', '{MEDIA_ENGINE_LABEL['), engineLabelFor)],
  ['rótulo ignora o recibo', () => avalia(rota, tela, (q) => engineLabelFor(q, null))],
]
for (const [nome, roda] of mutantes) checa(`mutante "${nome}" morre`, roda().length > 0)

for (const e of erros) console.log('FAIL', e)
console.log(`${ok} ok, ${erros.length} falhas`)
process.exit(erros.length ? 1 : 0)
