// KINEO-ESCOLHA-ORDEM-ANATOMIA-1211 [CEO, revisão do b5ced7856 em 11/11 noite] — a legenda das 4 fotos perdeu os códigos internos ("anatomy:…"),
// mas a ORDEM das fotos depende deles: anatomyIssues conta "anatomy:…:false" para pôr a foto com defeito por último. Se o filtro da legenda
// roda antes da ordenação, toda foto fica com 0 defeito e a ordem vira só nota. Aqui: ordena com os motivos crus, depois limpa a legenda.
import { readFileSync } from 'node:fs'
const fonte = readFileSync('lib/ads/cena/escolhaStills.ts', 'utf8')
function falhas(src) {
  const out = []
  const linha = src.split('\n').find((l) => l.includes('stills: p.escolhaFlow.stills.filter')) ?? ''
  if (!linha) return ['não achei a linha que monta as fotos']
  const iSort = linha.indexOf('.sort('), iLimpa = linha.indexOf('escolhaMotivosParaCliente(')
  if (iSort < 0) out.push('a lista de fotos não é mais ordenada')
  if (iLimpa < 0) out.push('a legenda voltou a mostrar os códigos internos (sem escolhaMotivosParaCliente)')
  if (iSort >= 0 && iLimpa >= 0 && iLimpa < iSort) out.push('a legenda é limpa ANTES da ordenação: anatomyIssues deixa de ver "anatomy:…:false"')
  if (!/anatomyIssues\(a\.reasons\) - anatomyIssues\(b\.reasons\)/.test(linha)) out.push('a ordenação não usa mais os defeitos de anatomia')
  if (!/\/\^anatomy:\.\*:false\$\/u/.test(src)) out.push('anatomyIssues não conta mais "anatomy:…:false"')
  return out
}
let ok = 0, fail = 0
const no = (c, m) => { if (c) { fail++; console.log('FALHA', m) } else ok++ }
for (const f of falhas(fonte)) no(true, f)
no(false, 'fonte real')
const mutantes = [
  ['M1 limpa antes de ordenar', fonte.replace('reasons: j.verdict?.reasons ?? [] })).sort(', 'reasons: escolhaMotivosParaCliente(j.verdict?.reasons ?? []) })).sort(').replace('.map(s => ({ ...s, reasons: escolhaMotivosParaCliente(s.reasons) }))', '')],
  ['M2 a legenda volta a mostrar o código', fonte.replace('.map(s => ({ ...s, reasons: escolhaMotivosParaCliente(s.reasons) }))', '')],
  ['M3 a ordenação esquece a anatomia', fonte.replace('anatomyIssues(a.reasons) - anatomyIssues(b.reasons) || ', '')],
]
for (const [nome, src] of mutantes) no(src === fonte || falhas(src).length === 0, `${nome}: o mutante passou`)
console.log(`test-escolha-ordem-anatomia-1211: ${ok} ok, ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
