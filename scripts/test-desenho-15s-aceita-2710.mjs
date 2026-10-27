// KINEO-DESENHO-15S-ACEITA-2710 — o escritor do desenho de 15 s não recusa história que o filme aceita.
// Causa (27/10): faixa pedida 36–41 palavras e conferida com o MESMO teto; o GPT passava de 41 duas vezes → writer_too_long →
// 3 das 5 amostras de desenho e 5 pedidos de clientes em 22/10 morreram sem filme. O cinematic aceita até maxWordsForShortFilm (56 em inglês).
import fs from 'node:fs'
const ROUTE = 'app/api/kids-cartoon/story/route.ts'
const src = fs.readFileSync(ROUTE, 'utf8')

function confere(t) {
  const erros = []
  const banda = t.slice(t.indexOf('function kidsStoryWordBand'), t.indexOf('export async function POST'))
  if (!/aceita: number/.test(banda)) erros.push('a faixa não devolve o teto de aceitação')
  if (!/const aceita = duration === SEEDANCE_SHORT_SECONDS \? Math\.max\(max, maxWordsForShortFilm\(duration, language\)\) : max/.test(banda)) erros.push('o teto de aceitação do 15 s não é o do cinematic')
  if (!/return \{ min: Math\.min\(min, max\), max, aceita \}/.test(banda)) erros.push('a faixa não devolve aceita')
  const checagem = t.match(/kidsStoryCheck\(texto, \{[^}]*\}\)/g) ?? []
  if (checagem.length !== 1) erros.push(`esperava 1 conferência, achei ${checagem.length}`)
  else if (!/maxWords: band\.aceita/.test(checagem[0])) erros.push('a conferência ainda usa o teto do pedido')
  const pedido = t.match(/kidsStoryWriterPrompt\(\{[^}]*\}\)/)
  if (!pedido || !/maxWords: band\.max/.test(pedido[0])) erros.push('o pedido ao escritor deixou de pedir a faixa curta')
  return erros
}

let ok = 0
const real = confere(src)
if (real.length) { console.error('FALHA', real); process.exit(1) }
ok++
// mutantes: cada um precisa ser pego
const mutantes = [
  ['volta ao teto do pedido', (t) => t.replace('maxWords: band.aceita', 'maxWords: band.max')],
  ['aceita sem o teto do cinematic', (t) => t.replace('Math.max(max, maxWordsForShortFilm(duration, language))', 'max')],
  ['pedido passa a pedir o teto largo', (t) => t.replace('minWords: band.min, maxWords: band.max', 'minWords: band.min, maxWords: band.aceita')],
]
for (const [nome, muta] of mutantes) {
  const m = muta(src)
  if (m === src) { console.error('FALHA mutante não aplicou:', nome); process.exit(1) }
  if (confere(m).length === 0) { console.error('FALHA mutante sobreviveu:', nome); process.exit(1) }
  ok++
}
console.log(`ok ${ok} — o desenho de 15 s aceita até o teto do filme; ${mutantes.length} mutantes pegos`)
