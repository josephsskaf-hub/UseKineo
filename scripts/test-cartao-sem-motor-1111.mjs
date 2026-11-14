// KINEO-CARTAO-SEM-MOTOR-1111 [FUNDADOR 11/11, vendo o antes e depois da /pricing: "Boa sua recomendação" = limpar só os cartões]
// O bloco "o que o plano faz, em filmes" do cartão de plano (components/pricing/PlanValueStage.tsx) diz "premium film", sem nome de motor.
// As perguntas frequentes, "See credits by engine" e o texto que o ChatGPT lê NÃO são deste guardião: continuam com os nomes.
import { readFileSync } from 'node:fs'
const fonte = readFileSync('components/pricing/PlanValueStage.tsx', 'utf8')
const MOTOR = /seedance|kling|veo\s?3|minimax|h3\s?(?:turbo|max)|hailuo/i
function bloco(src) {
  const i = src.indexOf('data-kineo="plano-filmes"')
  if (i < 0) return null
  const f = src.indexOf('</div>', i)
  return f < 0 ? null : src.slice(i, f)
}
// KINEO-PRECOS-PREVIA-1411 [CEO 14/11, reancoragem sem afrouxar] — o componente passou a ter DOIS cartões: o compacto (só na prévia escondida
// /pricing-preview) e o público. `bloco` pegava o PRIMEIRO marcador, que virou o do compacto, e o guardião parou de olhar o cartão público.
// Agora olha TODOS: cada cartão vai do marcador até o fim do parágrafo "or … premium …" que o acompanha, e cada um tem de passar nas três checagens.
function cartoes(src) {
  const out = []
  let i = -1
  while ((i = src.indexOf('data-kineo="plano-filmes"', i + 1)) >= 0) {
    const fimDiv = src.indexOf('</div>', i)
    if (fimDiv < 0) continue
    const prox = src.indexOf('data-kineo="plano-filmes"', i + 1)
    const or = src.indexOf('className="pv-films-or"', i)
    // no compacto o parágrafo "or … premium …" fica FORA do <div> do marcador: junta só o parágrafo (do <p ao </p>), para não trazer metade de uma expressão
    const paragrafoDeFora = or > fimDiv && (prox < 0 || or < prox) ? src.slice(src.lastIndexOf('<p', or), src.indexOf('</p>', or)) : ''
    out.push(src.slice(i, fimDiv) + ' ' + paragrafoDeFora)
  }
  return out
}
function falhas(src) {
  const cs = cartoes(src), out = []
  if (!bloco(src) || !cs.length) return ['não achei o bloco plano-filmes']
  cs.forEach((b, n) => {
    const qual = cs.length > 1 ? ` (cartão ${n + 1} de ${cs.length})` : ''
    let visivel = b, antes // só o texto que vai à tela: tira as expressões {…} (as variáveis se chamam filmes.kling60/kling15)
    do { antes = visivel; visivel = visivel.replace(/{[^{}]*}/g, ' ') } while (visivel !== antes)
    if (MOTOR.test(visivel)) out.push('o bloco de filmes do cartão cita nome de motor: ' + (visivel.match(MOTOR) || [''])[0] + qual)
    if ((b.match(/<\/b> premium \{plural\(/g) || []).length !== 2) out.push('o cartão não diz "premium film(s)" nas duas contas (60 s e 15 s)' + qual)
    if (!b.includes("'standard film', 'standard films'")) out.push('a conta padrão ("standard films") sumiu' + qual)
  })
  return out
}
const trocaUltimo = (src, de, para) => { const i = src.lastIndexOf(de); return i < 0 ? src : src.slice(0, i) + para + src.slice(i + de.length) } // o ÚLTIMO marcador é o do cartão público
let ok = 0, fail = 0
const no = (c, m) => { if (c) { fail++; console.log('FALHA', m) } else ok++ }
for (const f of falhas(fonte)) no(true, f)
no(false, 'fonte real limpa')
const mutantes = [
  ['M1 a conta de 60 s volta a dizer Kling 4.0', fonte.replace("</b> premium {plural(filmes.kling60", "</b> Kling 4.0 {plural(filmes.kling60")],
  ['M2 a conta de 15 s volta a dizer Kling 4.0', fonte.replace("</b> premium {plural(filmes.kling15", "</b> Kling 4.0 {plural(filmes.kling15")],
  ['M3 a conta padrão ganha nome de fornecedor', fonte.replace("'standard film', 'standard films'", "'MiniMax H3 Turbo film', 'MiniMax H3 Turbo films'")],
  // KINEO-PRECOS-PREVIA-1411 — os três de cima acertam o 1º cartão (o compacto); estes acertam o cartão PÚBLICO
  ['M4 no cartão público a conta de 60 s volta a dizer Kling 4.0', trocaUltimo(fonte, "</b> premium {plural(filmes.kling60", "</b> Kling 4.0 {plural(filmes.kling60")],
  ['M5 no cartão público a conta de 15 s volta a dizer Kling 4.0', trocaUltimo(fonte, "</b> premium {plural(filmes.kling15", "</b> Kling 4.0 {plural(filmes.kling15")],
  ['M6 no cartão público a conta padrão ganha nome de fornecedor', trocaUltimo(fonte, "'standard film', 'standard films'", "'MiniMax H3 Turbo film', 'MiniMax H3 Turbo films'")],
]
for (const [nome, src] of mutantes) no(src === fonte || falhas(src).length === 0, `${nome}: o mutante passou`)
console.log(`test-cartao-sem-motor-1111: ${ok} ok, ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
