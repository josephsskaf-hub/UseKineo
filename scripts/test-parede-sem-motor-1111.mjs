// KINEO-PAREDE-SEM-MOTOR-1111 [FUNDADOR 11/11 ~22:10, vendo as duas alternativas lado a lado: "Tira, com certeza"] — a parede de crédito
// (components/offers/ConversionUpgrade.tsx) é a tela em que a pessoa decide pagar; ela não cita nome de motor/fornecedor. Saem
// "· Seedance 1.5" da legenda da amostra, "Capacity uses MiniMax H3 Turbo" do rodapé dos planos e "MiniMax H3 Turbo." do passe avulso.
// Fica de fora, de propósito, a linha da superfície 'pricing' (página pública: o fundador pediu para não tirar texto que o ChatGPT lê).
import { readFileSync } from 'node:fs'
const F = 'components/offers/ConversionUpgrade.tsx'
const fonte = readFileSync(F, 'utf8')
const MOTOR = /seedance|kling|veo\s?3|minimax|h3\s?(?:turbo|max)|nano banana|hailuo/i
function falhas(src) {
  const out = []
  const linhas = src.split('\n')
  linhas.forEach((l, i) => {
    if (!MOTOR.test(l)) return
    if (/^\s*\/\//.test(l) || /^\s*import\b/.test(l)) return // comentário de linha inteira e import não chegam à tela
    if (l.includes("surface === 'pricing'")) return // página pública: fica como está
    out.push(`linha ${i + 1} cita motor na parede: ${l.trim().slice(0, 120)}`)
  })
  if (!src.includes("'A short excerpt from a Kineo founder film. Your purchase creates your own film or clips.'")) out.push('(a) a legenda da amostra não é a frase sem motor')
  if (!src.includes('Capacity counts standard films, with the entire allowance used for one format, without extras. Films and clips are alternatives, not added together.')) out.push('(b) o rodapé dos planos não é a frase sem motor')
  if (!src.includes('Counted in standard films. Choose films or clips from the same allowance; other engines, durations and extras use it differently. No renewal.')) out.push('(c) o texto do passe avulso não é a frase sem motor')
  return out
}
const reais = falhas(fonte)
const mutantes = [
  ['M1 a legenda volta a citar o motor', fonte.replace('Kineo founder film. Your purchase', 'Kineo founder film · Seedance 1.5. Your purchase')],
  ['M2 o rodapé volta a citar o fornecedor', fonte.replace('Capacity counts standard films,', 'Capacity uses MiniMax H3 Turbo,')],
  ['M3 o passe avulso volta a citar o fornecedor', fonte.replace('Counted in standard films. Choose', 'MiniMax H3 Turbo. Choose')],
  ['M4 um botão ganha nome de motor', fonte.replace('START WITH ONE FILM · NO SUBSCRIPTION', 'START WITH ONE KLING 4 FILM · NO SUBSCRIPTION')],
]
let ok = 0, fail = 0
const no = (cond, msg) => { if (cond) { fail++; console.log('FALHA', msg) } else ok++ }
for (const f of reais) no(true, f)
no(false, 'fonte real limpa')
for (const [nome, src] of mutantes) no(src === fonte || falhas(src).length === 0, `${nome}: o mutante passou (o guardião não vê a volta)`)
console.log(`test-parede-sem-motor-1111: ${ok} ok, ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
