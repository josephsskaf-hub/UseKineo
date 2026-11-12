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
function falhas(src) {
  const b = bloco(src), out = []
  if (!b) return ['não achei o bloco plano-filmes']
  let visivel = b, antes // só o texto que vai à tela: tira as expressões {…} (as variáveis se chamam filmes.kling60/kling15)
  do { antes = visivel; visivel = visivel.replace(/{[^{}]*}/g, ' ') } while (visivel !== antes)
  if (MOTOR.test(visivel)) out.push('o bloco de filmes do cartão cita nome de motor: ' + (visivel.match(MOTOR) || [''])[0])
  if ((b.match(/<\/b> premium \{plural\(/g) || []).length !== 2) out.push('o cartão não diz "premium film(s)" nas duas contas (60 s e 15 s)')
  if (!b.includes("'standard film', 'standard films'")) out.push('a conta padrão ("standard films") sumiu')
  return out
}
let ok = 0, fail = 0
const no = (c, m) => { if (c) { fail++; console.log('FALHA', m) } else ok++ }
for (const f of falhas(fonte)) no(true, f)
no(false, 'fonte real limpa')
const mutantes = [
  ['M1 a conta de 60 s volta a dizer Kling 4.0', fonte.replace("</b> premium {plural(filmes.kling60", "</b> Kling 4.0 {plural(filmes.kling60")],
  ['M2 a conta de 15 s volta a dizer Kling 4.0', fonte.replace("</b> premium {plural(filmes.kling15", "</b> Kling 4.0 {plural(filmes.kling15")],
  ['M3 a conta padrão ganha nome de fornecedor', fonte.replace("'standard film', 'standard films'", "'MiniMax H3 Turbo film', 'MiniMax H3 Turbo films'")],
]
for (const [nome, src] of mutantes) no(src === fonte || falhas(src).length === 0, `${nome}: o mutante passou`)
console.log(`test-cartao-sem-motor-1111: ${ok} ok, ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
