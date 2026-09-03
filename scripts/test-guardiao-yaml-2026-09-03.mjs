// ═══ KINEO-GUARDIAO-SEM-SPAM-2026-09-03 ═══════════════════════════════════
// O QUE ACONTECEU, para o próximo que ler: o Guardião (nosso primeiro CI) foi
// escrito em 02/09 e falhou 30 vezes seguidas, mandando 30 e-mails ao fundador
// em uma manhã — SEM NUNCA TER RODADO NADA. Não era teste vermelho nem
// typecheck sujo: era "Invalid workflow file ... error in your yaml syntax".
//
// A causa, exata: dentro de um bloco `run: |`, uma string de shell foi quebrada
// em duas linhas e a continuação ficou com MENOS indentação que o bloco:
//
//     run: |
//           vermelhas="$vermelhas
//   - $f"                          <-- 2 espaços: fora do bloco
//
// O YAML entende que o bloco terminou ali, lê `- $f"` como item de lista, e o
// GitHub recusa o arquivo INTEIRO. O sintoma (30 falhas) fica a 80 linhas de
// distância da causa, e o e-mail não diz qual é.
//
// A LIÇÃO QUE VALE MAIS QUE O CONSERTO: um alarme que toca em todo push é um
// alarme que a pessoa aprende a ignorar — e aí ele deixa de proteger. Barulho
// não é rigor; é o contrário.
//
// Esta bateria não valida YAML de verdade (não temos parser aqui). Ela procura
// EXATAMENTE o defeito que nos custou a manhã, que é barato de detectar.
import { readFileSync, existsSync } from 'node:fs'
const url = new URL('../.github/workflows/guardiao.yml', import.meta.url)
let ok = 0, fail = 0
const check = (n, c) => { c ? (ok++, console.log('  ok  ' + n)) : (fail++, console.log('  FAIL ' + n)) }

console.log('1 · o arquivo existe e tem o formato mínimo')
check('o workflow existe', existsSync(url))
const raw = readFileSync(url, 'utf8').replace(/\r\n/g, '\n')
const linhas = raw.split('\n')
check('tem nome, gatilho e jobs', /^name:/m.test(raw) && /^on:/m.test(raw) && /^jobs:/m.test(raw))
check('roda em push na main', /branches: \[main\]/.test(raw))

console.log('2 · O DEFEITO DE 03/09: linha de bloco `run: |` com indentação a menos')
const indent = (l) => l.length - l.trimStart().length
const culpados = []
for (let i = 0; i < linhas.length; i++) {
  const m = linhas[i].match(/^(\s*)run: \|\s*$/)
  if (!m) continue
  const indentDoRun = m[1].length
  // a primeira linha não vazia depois do `run: |` define a indentação do bloco
  let j = i + 1
  while (j < linhas.length && linhas[j].trim() === '') j++
  if (j >= linhas.length) continue
  const base = indent(linhas[j])
  for (let k = j; k < linhas.length; k++) {
    const l = linhas[k]
    if (l.trim() === '') continue
    const ind = indent(l)
    if (ind <= indentDoRun) break // o bloco acabou de forma legítima
    if (ind < base) culpados.push(`linha ${k + 1}: "${l.trim().slice(0, 40)}" (${ind} espaços, o bloco exige ${base})`)
  }
}
check(
  culpados.length === 0
    ? 'nenhuma linha escapa da indentação do próprio bloco'
    : `linha(s) fora do bloco: ${culpados.join(' | ')}`,
  culpados.length === 0,
)
check('a string do placar não é mais quebrada em duas linhas', !/vermelhas="\$vermelhas\n/.test(raw))
check('o aviso para o próximo autor ficou escrito no arquivo', raw.includes('NÃO quebre string de shell em duas linhas'))

console.log('3 · o CI mede antes de bloquear (senão vira 30 e-mails de novo)')
check('a suíte de 252 baterias não reprova o push', /suite:[\s\S]{0,400}continue-on-error: true/.test(raw))
check('o typecheck também mede primeiro, com a razão escrita', /typecheck:[\s\S]{0,700}continue-on-error: true/.test(raw) && raw.includes('Um alarme que toca sempre é um alarme que ninguém escuta'))
check('quando virar portão de verdade, é só remover o continue-on-error', raw.split('continue-on-error: true').length === 3)

console.log('4 · o que o CI ainda tem que fazer (não virou enfeite)')
check('continua rodando TODAS as baterias scripts/test-*.mjs', raw.includes('for f in scripts/test-*.mjs; do'))
check('continua publicando o placar no resumo do GitHub', raw.includes('$GITHUB_STEP_SUMMARY'))
check('continua filtrando os 3 erros de tipo conhecidos, como o bat local', raw.includes('grep -v "acacia"') && raw.includes('grep -v "TrialDowngradeModal"'))

console.log(`\n${ok} ok, ${fail} fail`)
process.exit(fail ? 1 : 0)
