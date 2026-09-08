// ═══ GUARDIÃO DA CAPA — KINEO-CAPA-NASCE-NO-RENDER-2026-09-08 ══════════════
//
// O QUE ELE PROTEGE. 1.685 filmes e ZERO capas: `snapshot_time` nunca chegou
// ao Creatomate. Em 28/08 ele foi posto no CORPO do POST e ignorado em
// silêncio; o lugar certo é DENTRO do `source` (propriedade de topo do
// RenderScript). Este guardião existe para que ninguém "limpe" a linha de
// volta para o corpo, nem apague o parâmetro achando que é enfeite.
//
// ESTILO: contagem, nunca `assert` que morre na primeira falha — um vermelho
// tem de mostrar TUDO que quebrou. As funções puras são exercitadas de
// verdade; a amarração ao caller é lida do arquivo, porque é lá que mora o
// defeito de 28/08 (parâmetro no nível errado).

import { readFileSync } from 'node:fs'

let ok = 0
let bad = 0
const falhas = []
function check(nome, condicao) {
  if (condicao) ok += 1
  else { bad += 1; falhas.push(nome) }
}

const SRC = readFileSync(new URL('../lib/compose.ts', import.meta.url), 'utf8')

// ─── 1. As funções puras, transpiladas do próprio arquivo ──────────────────
// Reimplementar aqui seria escrever um segundo juiz — a doença das duas
// réguas. Extraímos o corpo REAL das funções do arquivo e o executamos.
function extrairFuncao(nome) {
  const i = SRC.indexOf(`export function ${nome}(`)
  if (i < 0) return null
  let j = SRC.indexOf('{', i)
  let profundidade = 0
  for (let k = j; k < SRC.length; k += 1) {
    if (SRC[k] === '{') profundidade += 1
    else if (SRC[k] === '}') {
      profundidade -= 1
      if (profundidade === 0) return SRC.slice(i, k + 1)
    }
  }
  return null
}

const fonteSnapshotTime = extrairFuncao('snapshotTimeFor')
const fonteWith = extrairFuncao('withSnapshotRequest')
check('snapshotTimeFor existe e é exportada', !!fonteSnapshotTime)
check('withSnapshotRequest existe e é exportada', !!fonteWith)

let snapshotTimeFor = null
let withSnapshotRequest = null
if (fonteSnapshotTime && fonteWith) {
  const js = (fonteSnapshotTime + '\n' + fonteWith)
    .replace(/export function/g, 'function')
    .replace(/: unknown/g, '')
    .replace(/: number\b/g, '')
    .replace(/: Record<string, unknown>/g, '')
    .replace(/SNAPSHOT_TIME_SECONDS/g, '2')
  const fabrica = new Function(`${js}; return { snapshotTimeFor, withSnapshotRequest }`)
  const m = fabrica()
  snapshotTimeFor = m.snapshotTimeFor
  withSnapshotRequest = m.withSnapshotRequest
}

if (snapshotTimeFor && withSnapshotRequest) {
  // O instante nunca cai fora da linha do tempo — snapshot depois do fim não
  // nasce, e é assim que a capa voltaria a ser nula sem ninguém ver.
  for (const d of [15, 35, 45, 60, 90, 4.5, 3, 2.4]) {
    check(`instante dentro do filme de ${d}s`, snapshotTimeFor(d) > 0 && snapshotTimeFor(d) < d)
  }
  check('duração ausente ⇒ 2s', snapshotTimeFor(undefined) === 2)
  check('duração nula ⇒ 2s', snapshotTimeFor(null) === 2)
  check('duração não-numérica ⇒ 2s', snapshotTimeFor('60') === 2)
  check('NaN ⇒ 2s', snapshotTimeFor(NaN) === 2)
  check('Infinity ⇒ 2s', snapshotTimeFor(Infinity) === 2)
  check('duração zero ⇒ 2s', snapshotTimeFor(0) === 2)
  check('duração negativa ⇒ 2s', snapshotTimeFor(-10) === 2)
  check('filme longo ⇒ exatamente 2s', snapshotTimeFor(60) === 2)
  check('filme de 4s ⇒ metade', snapshotTimeFor(4) === 2)
  check('filme de 3s ⇒ 1,5s', snapshotTimeFor(3) === 1.5)

  // O contrato do source.
  const base = { output_format: 'mp4', width: 1080, height: 1920, elements: [] }
  const saida = withSnapshotRequest(base)
  check('pede snapshot_time', typeof saida.snapshot_time === 'number' && saida.snapshot_time > 0)
  check('NÃO manda snapshot_location (ele SUBSTITUI um quadro do filme)',
    !('snapshot_location' in saida))
  check('não muta o objeto do caller', !('snapshot_time' in base))
  check('preserva output_format', saida.output_format === 'mp4')
  check('preserva width', saida.width === 1080)
  check('preserva height', saida.height === 1920)
  check('preserva elements', Array.isArray(saida.elements))
  check('respeita snapshot_time já escolhido pelo caller',
    withSnapshotRequest({ ...base, snapshot_time: 7 }).snapshot_time === 7)
  check('snapshot_time nulo do caller é preenchido',
    withSnapshotRequest({ ...base, snapshot_time: null }).snapshot_time === 2)
  check('usa a duração do próprio source',
    withSnapshotRequest({ ...base, duration: 3 }).snapshot_time === 1.5)
}

// ─── 2. A AMARRAÇÃO — o defeito de 28/08 foi de NÍVEL, não de parâmetro ────
const corpoPost = /body:\s*JSON\.stringify\(\{\s*source:\s*withSnapshotRequest\(source\)\s*\}\)/
check('o POST manda o source PASSADO por withSnapshotRequest', corpoPost.test(SRC))
check('o POST não manda mais o source cru',
  !/body:\s*JSON\.stringify\(\{\s*source\s*\}\)/.test(SRC))
// A regressão exata de 28/08: snapshot_time como irmão de `source` no corpo.
check('snapshot_time NÃO está no corpo do POST, ao lado de source',
  !/JSON\.stringify\(\{[^}]*\bsource\b[^}]*snapshot_time/.test(SRC))
check('a lição de 28/08 continua escrita no arquivo', SRC.includes('28/08'))

// ─── 3. Mutação: provar que o guardião REPROVA a volta atrás ───────────────
// Sem isto, um guardião que só conta linhas passa igual com o defeito de volta.
const mutante = SRC.replace(
  'body: JSON.stringify({ source: withSnapshotRequest(source) }),',
  'body: JSON.stringify({ source }),',
)
check('a mutação foi mesmo aplicada (senão o verde abaixo é falso)', mutante !== SRC)
check('o guardião REPROVA o source cru de volta no POST', !corpoPost.test(mutante))

console.log(`\n${ok} verificações OK, ${bad} falharam`)
if (bad > 0) {
  console.log('\nFALHAS:')
  for (const f of falhas) console.log(`  ✗ ${f}`)
  process.exit(1)
}
console.log('✅ a capa continua sendo pedida ao Creatomate, no nível certo do RenderScript')
