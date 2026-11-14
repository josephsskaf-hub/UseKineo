// KINEO-LUGAR-DO-ROTEIRO-1411 [CEO 14/11, lote 3 dos vídeos de teste: caso E] — guardião.
// Prova OFFLINE, EXECUTANDO o código real, com os textos REAIS do claim:
//   (A) Racetrack Playa (39c5cc92): o lugar do filme sai das cenas ("the cracked lakebed") e vai a TODA cena, inclusive a do gelo na água rasa;
//   (B) o lugar árido é UM tipo só (lakebed, playa, desert, dunes); dois lugares de verdade continuam null; os filmes que o ensaio da vírgula
//       mostrou errados (Éden, gatinho) continuam sem lugar;
//   (C) a rota usa o lugar do pedido e, sem ele, o das cenas; desligado = byte a byte; (M) mutantes ficam vermelhos.
import fs from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

let ok = 0
const falhas = []
const checa = (n, c) => { if (c) { ok++; console.log('  ok  ' + n) } else { falhas.push(n); console.log('  FALHA ' + n) } }
const ARQ = 'lib/cinematic/pessoaDoPedido.ts'
const lf = (t) => String(t).replace(/\r\n/g, '\n')
const carrega = (mutar = null) => createOfflineLoader({ globals: {}, source: (rel, text) => (mutar && rel === ARQ ? mutar(lf(text)) : text) })

const RACETRACK_PEDIDO = 'Rocks in Death Valley move by themselves. On an empty, dry lakebed called Racetrack Playa, heavy stones sit at the end of long, curving trails in the cracked mud. In December of twenty thirteen, time-lapse cameras finally caught them moving. After a rare rain, a thin sheet of ice forms on the shallow water. The morning sun breaks the ice into wide floating panels. A light breeze pushes the panels, and the panels push the rocks. Would you have guessed ice? Follow for more.'
const RACETRACK_CENAS = ['A wide shot of Racetrack Playa, showcasing heavy stones resting at the end of long, curving trails in the cracked mud.', 'A time-lapse perspective of heavy stones moving across the cracked lakebed at Racetrack Playa.', 'A close-up of a thin sheet of ice forming on the shallow water, sunlight glinting off the surface as it begins to crack.', 'A wide shot of floating ice panels gently pushing heavy rocks along the cracked lakebed.']
const EDEN = ['Lucifer falls among the stars.', 'A slow push-in through a lush, vibrant garden, sunlight filtering through leaves, revealing Adam and Eve standing together.', 'A close-up of a serpent slithering through the grass.']
const GATINHO = ['A close-up of a small kitten huddled on a cold, rain-soaked street, under a dim streetlight.', 'A low-angle tracking shot of indifferent pedestrians walking past the kitten.', 'A macro shot of the kitten nestled on a soft blanket.']

function provas(L) {
  const erros = []
  const m = L(ARQ)
  // (A)
  if (m.lugarDoPedido(RACETRACK_PEDIDO) !== null) erros.push('A o pedido do Racetrack tem dois lugares (Death Valley e o leito): devia ficar null')
  const lugar = m.lugarDasCenas(RACETRACK_CENAS)
  if (lugar !== 'the cracked lakebed') erros.push('A o lugar do filme do Racetrack: ' + lugar)
  const comLugar = RACETRACK_CENAS.map((c) => m.comLugarDoFilme(c, lugar))
  if (!comLugar.every((c) => c.endsWith('Setting of this film: the cracked lakebed.'))) erros.push('A nem toda cena ganhou o lugar: ' + comLugar[2])
  // (B)
  if (m.lugarDasCenas(['A camel walks across the desert.', 'A close-up of the sand dunes at the playa.', 'A lone camel walking.']) !== 'the desert') erros.push('B deserto, dunas e playa não são o mesmo tipo de lugar')
  if (m.lugarDasCenas(['A girl walks on the beach.', 'She crosses the desert at noon.', 'She sleeps.']) !== null) erros.push('B praia e deserto (dois lugares) viraram um')
  if (m.lugarDasCenas(EDEN) !== null || m.lugarDasCenas(GATINHO) !== null) erros.push('B a vírgula entrou: o Éden ou o gatinho ganharam lugar do filme')
  if (m.lugarDoPedido('A man drinks coffee at a stylish Johannesburg coffee shop.') !== 'a stylish Johannesburg coffee shop') erros.push('B o lugar de sempre mudou')
  if (!m.lugarDoRoteiroLigado() || m.lugarDoRoteiroLigado('off') || m.LUGAR_DO_ROTEIRO_1411 !== 'all') erros.push('interruptor')
  return erros
}

const base = provas(carrega())
checa(`A e B verdes nos textos reais${base.length ? ': ' + base.join(' · ') : ''}`, base.length === 0)
{
  const m = carrega((s) => s.replace("export const LUGAR_DO_ROTEIRO_1411: ModoLugarDoRoteiro = 'all'", "export const LUGAR_DO_ROTEIRO_1411: ModoLugarDoRoteiro = 'off'"))(ARQ)
  checa('C desligado: o Racetrack volta a ficar sem lugar (byte a byte o de antes)', m.lugarDasCenas(RACETRACK_CENAS) === null)
}
const rota = lf(fs.readFileSync('app/api/generate-video-cinematic/route.ts', 'utf8'))
checa('C a rota clássica põe o lugar do pedido e, sem ele, o das cenas, fora do filme herdado', rota.includes('const lugarPedido = qualidadeHerdada ? null : lugarDoPedidoDoCliente(pedidoDoCliente)') && rota.includes('const lugarFilme = qualidadeHerdada || lugarPedido ? null : lugarDasCenas(scenes.map((s) => s.description))'))
const MUTANTES = [
  ['sem "lakebed" e "playa" na lista', (s) => s.replace("const LUGAR_ARIDO_1411 = 'dry lakebed|lakebed|lake bed|dry lake|playa|salt flats?|sand dunes|dunes'", "const LUGAR_ARIDO_1411 = 'xxxx'")],
  ['o lugar árido não vira um tipo só', (s) => s.replace("return lugarDoRoteiroLigado() && ARIDO_RE_1411.test(t) ? 'desert' : t", 'return t')],
  ['a vírgula entra (o Éden ganha lugar)', (s) => s.replace("(?:[\\\\p{L}'’-]+\\\\s+){0,4}?${LUGAR_NOME_1411}", "(?:[\\\\p{L}'’-]+,?\\\\s+){0,4}?${LUGAR_NOME_1411}")],
  ['lugarDasCenas ignora a regra nova', (s) => s.replace("const porCena = textos.map((t) => new Set([...t.matchAll(lugarSoRe())].map((m) => tipoDoLugar(m[0]))))", "const porCena = textos.map((t) => new Set([...t.matchAll(LUGAR_SO_RE)].map((m) => m[0].toLowerCase())))")],
]
for (const [nome, fn] of MUTANTES) {
  const src = lf(fs.readFileSync(ARQ, 'utf8'))
  const mudou = fn(src) !== src
  let e = ['(mutante não aplicou)']
  if (mudou) { try { e = provas(carrega(fn)) } catch (x) { e = ['lançou: ' + x.message] } }
  checa(`mutante "${nome}" fica vermelho (${mudou ? e.length + ' erro(s)' : 'NÃO APLICOU'})`, mudou && e.length > 0)
}
console.log(`\n${ok} ok, ${falhas.length} falha(s)`)
process.exit(falhas.length ? 1 : 0)
