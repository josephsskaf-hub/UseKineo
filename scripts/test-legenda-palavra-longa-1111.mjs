// KINEO-LEGENDA-PALAVRA-LONGA-1111 — filme 4572756e (11/11 12:05, grátis de 15 s, alemão): "HINÜBERGEKOMMENDEN" (18 letras) saiu cortada na
// tela. A fonte do compose já descia para a maior palavra caber (KINEO-LEGENDA-LARGURA-3010), mas a F1 do faceless15 vestia o bloco com a
// fonte fixa (64; gancho 80) e a legenda canônica do grátis copiava o font_size do estilo — as duas por cima do ajuste. O source real
// gravado (free_redo_film_source) tinha font_size 80 em "EIN JUNGE KAUFT EINEN [color #FFD700]HINÜBERGEKOMMENDEN[/color]".
// Trava (Node puro, o compose e o faceless15 reais carregados offline, sem rede): (a) a F1 real com o bloco real: a palavra cabe na caixa;
// (b) a canônica com o roteiro real: idem; (c) bloco curto continua com a fonte de sempre (64/80); (d) mutantes no fim.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(RAIZ)
const read = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
const F15 = 'lib/filmes/faceless15.ts', CAN = 'lib/free15CanonicalCaptions.ts'
const ROTEIRO = 'Ein Junge kauft einen hinübergekommenden Zoo in seiner Stadt für nur 1000 Euro. Als er sieht wie kaputt alles ist will er aufgeben. Kurz bevor er wieder geht hört er etwas aus einer Holzkiste. Ein Mauzen. Er öffnet die Kiste und …… dann kommt Teil 2'
const BLOCO = 'EIN JUNGE KAUFT EINEN [color #FFD700]HINÜBERGEKOMMENDEN[/color]'
// a caixa real: 1080 × 78 % × 0,92 (respiro da pílula) e ~0,72 em por letra em caixa alta ExtraBold (a régua de lib/compose)
const caixa = 1080 * 0.78 * 0.92
const cabe = (texto, fonte) => Math.max(...String(texto).replace(/\[\/?color[^\]]*\]/g, '').toUpperCase().split(/\s+/).map((p) => Array.from(p).length)) * 0.72 * fonte <= caixa

function problems(over) {
  const p = []
  const no = (bad, msg) => { if (bad) p.push(msg) }
  let F, C
  try { const load = createOfflineLoader({ env: { OPENAI_API_KEY: 'offline' }, source: (rel, src) => over[rel] ?? src }); F = load(F15); C = load(CAN) } catch (e) { return [`fonte não carrega: ${e.message}`] }
  // (a) a F1 real, com o bloco real no gancho (0 s) e um bloco curto depois
  const els = [
    { type: 'text', track: 5, time: 0, duration: 3, text: BLOCO, width: '78%', font_size: 80 },
    { type: 'text', track: 5, time: 6, duration: 2, text: 'ALS ER SIEHT', width: '78%', font_size: 64 },
    { type: 'audio', track: 4, time: 0, duration: 14 },
  ]
  const quadro = F.lerQuadroFaceless15({ duration: 15, elements: els }, null)
  const r = F.aplicarF1Faceless15(els, quadro, null)
  const legendas = r.els.filter((e) => e.type === 'text' && Number(e.track) === 5)
  const longas = legendas.filter((e) => /HINÜBERGEKOMMENDEN/i.test(String(e.text)))
  no(!longas.length, `(a) a F1 perdeu o bloco da palavra longa → ${JSON.stringify(legendas.map((e) => e.text))}`)
  for (const e of longas) no(!cabe(e.text, Number(e.font_size)), `(a) F1: "${e.text}" a ${e.font_size} px não cabe na caixa`)
  const curtas = legendas.filter((e) => !/HINÜBERGEKOMMENDEN/i.test(String(e.text)))
  no(curtas.some((e) => ![64, 80].includes(Number(e.font_size))), `(c) F1: bloco curto mudou de fonte → ${JSON.stringify(curtas.map((e) => [e.text, e.font_size]))}`)
  // (b) a canônica do grátis, com o roteiro real e o estilo de 80 que o source tinha
  const canon = C.buildFree15CanonicalCaptions({ script: ROTEIRO, audioSeconds: 14, source: { elements: [{ type: 'text', track: 5, time: 0, duration: 3, text: 'X', font_size: 80, width: '78%' }] } })
    .filter((e) => e.type === 'text')
  const comLonga = canon.filter((e) => /HINÜBERGEKOMMENDEN/i.test(String(e.text)))
  no(!comLonga.length, '(b) a canônica não trouxe a palavra longa')
  for (const e of comLonga) no(!cabe(e.text, Number(e.font_size)), `(b) canônica: "${e.text}" a ${e.font_size} px não cabe`)
  no(canon.some((e) => Number(e.font_size) > 80), '(b) a canônica passou do teto do estilo')
  // a função da F1, direto
  no(F.fonteQueCabeFaceless15('ALS ER SIEHT', 64, '78%') !== 64 || F.fonteQueCabeFaceless15('ALS ER SIEHT', 80, '78%') !== 80, '(c) bloco curto: a fonte de sempre mudou')
  return p
}

const atual = problems({})
assert.deepEqual(atual, [], `violações:\n  ${atual.join('\n  ')}`)
let n = 1, falhas = 0
console.log('ok  estado atual limpo ("HINÜBERGEKOMMENDEN" cabe na F1 e na canônica; bloco curto com a fonte de sempre)')
const f15 = read(F15), can = read(CAN)
const MUT = [
  ['M1 a F1 volta à fonte fixa', { [F15]: f15.replace('font_size: fonteQueCabeFaceless15(e.text, gancho ? FACELESS15_LEGENDA_FONTE_GANCHO : FACELESS15_LEGENDA_FONTE, e.width),', 'font_size: gancho ? FACELESS15_LEGENDA_FONTE_GANCHO : FACELESS15_LEGENDA_FONTE,') }],
  ['M2 a canônica volta a copiar o font_size do estilo', { [CAN]: can.replace('...(Number(style.font_size) > 0 && Number(element.font_size) > 0 ? { font_size: Math.min(Number(style.font_size), Number(element.font_size)) } : {})', '') }],
  ['M3 a conta ignora a palavra', { [F15]: f15.replace("  return fonteDaLegendaQueCabe(limpo, tamanho,", "  return tamanho; fonteDaLegendaQueCabe(limpo, tamanho,") }],
]
for (const [nome, over] of MUT) {
  const [k, v] = Object.entries(over)[0]
  if (v === read(k)) { console.log(`FALHA ${nome}: não aplicou`); falhas++; continue }
  const r = problems(over)
  if (!r.length) { console.log(`FALHA ${nome}: ficou verde`); falhas++ } else { console.log(`ok  ${nome}: vermelho (${r[0].slice(0, 150)})`); n++ }
}
console.log(`${n} ok · ${falhas} falha(s)`)
if (falhas) process.exit(1)
