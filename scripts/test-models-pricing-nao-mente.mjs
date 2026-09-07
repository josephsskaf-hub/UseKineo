// /models-pricing não pode prometer um número que a própria tabela desmente.
// Sem rede, sem banco, sem credencial.
//
// Medido em 07/09/2026: a página dizia "Your free trial starts with 25 credits.
// On Kineo 1 that is twelve films" com o número escrito à mão, enquanto a tabela
// duas linhas abaixo — derivada de `creditCostForDuration` — mostrava 5 créditos
// para um filme de 60s no Kineo 1. Ou seja: 25/5 = 5 filmes, não doze. A página
// se contradizia sozinha, na cara de quem estava decidindo se assina.

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (p) => readFileSync(join(root, p), 'utf8').replace(/\r\n/g, '\n')

const page = read('app/models-pricing/page.tsx')

let total = 0
let failed = 0
function check(name, condition) {
  total += 1
  if (condition) return
  failed += 1
  console.error(`FAIL ${name}`)
}

console.log('\nKINEO — /models-pricing não mente sobre o trial\n')

// A frase do trial, isolada, é o objeto do teste.
const frase = (page.match(/Your free trial starts with[\s\S]{0,420}?<\/p>/) || [''])[0]
check('a frase do trial existe na página', frase.length > 0)

// 1. O crédito vem da constante canônica, não digitado.
check(
  'a página importa o crédito de trial da fonte canônica',
  /import \{ TRIAL_GRANT_CREDITS_COPY \} from '@\/lib\/freeTierOffer'/.test(page)
)
check(
  'a frase usa a constante, não um número escrito à mão',
  frase.includes('{TRIAL_GRANT_CREDITS_COPY} credits') && !/\b25 credits\b/.test(frase)
)

// 2. A contagem de filmes é DERIVADA do mesmo helper que monta a tabela.
check(
  'a contagem de filmes é dividida pelo mesmo helper da tabela',
  /Math\.floor\(TRIAL_GRANT_CREDITS_COPY \/ creditCostForDuration\('fast', true, 60\)\)/.test(
    frase
  )
)
// Amarra na AUSÊNCIA do número literal: quem trocar a expressão por um numeral
// (a regressão exata) cai aqui, mesmo mantendo o resto da frase intacto.
check(
  'nenhum numeral nem numeral por extenso sobrou na promessa de filmes',
  !/\b(twelve|eleven|ten|nine|eight|seven|six|five|four|three|two|one)\s+films\b/i.test(frase) &&
    !/\b\d+\s+films\b/.test(frase)
)

// 3. A tabela continua saindo do helper — se ela virar número fixo, a frase
//    passa a concordar com uma mentira em vez de com o preço real.
check(
  'a tabela continua derivando o custo por motor do helper',
  /\{creditCostForDuration\(r\.quality, true, s\)\} cr/.test(page)
)
check(
  'a linha do Starter continua derivando os filmes do helper',
  /Math\.floor\(starterCredits \/ creditCostForDuration\('fast', true, 60\)\)/.test(page)
)

console.log(`\n${total - failed}/${total} checks passed\n`)
process.exit(failed === 0 ? 0 : 1)
