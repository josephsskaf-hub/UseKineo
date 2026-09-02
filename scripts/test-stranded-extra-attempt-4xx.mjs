// sprint-assinaturas #7 — o cron de resgate ganha UMA tentativa extra quando
// todos os desfechos anteriores da geração foram compose_error_4xx (400 é
// determinístico; só um deploy muda o resultado). Caso e7f9f000 (02/09).
//   node scripts/test-stranded-extra-attempt-4xx.mjs
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const src = fs.readFileSync(path.join(root, 'app/api/cron/finish-stranded-renders/route.ts'), 'utf8')
let fails = 0, n = 0
const check = (name, ok, extra = '') => { n++; if (ok) console.log(`  ok  ${n}. ${name}`); else { fails++; console.log(`  FAIL ${n}. ${name}${extra ? ' — ' + extra : ''}`) } }

check('teto base continua 2', /const MAX_COMPOSE_ATTEMPTS = 2\n/.test(src))
check('extra é exatamente 1', /const EXTRA_ATTEMPT_AFTER_4XX = 1\n/.test(src))
check('lote de marcadores passa a ler stranded_outcome', /\.in\('name', \[RESCUE_EVENT, ATTEMPT_EVENT, READY_EVENT, COMPOSED_EVENT, OUTCOME_EVENT\]\)/.test(src))
check('só compose_error_4xx conta como "só 4xx"', /only4xx: prev\.only4xx && \/\^compose_error_4\\d\\d\$\/\.test\(oc\)/.test(src))
check('cap extra exige total de desfechos >= teto E só 4xx', /oc && oc\.total >= MAX_COMPOSE_ATTEMPTS && oc\.only4xx\s*\n\s*\? MAX_COMPOSE_ATTEMPTS \+ EXTRA_ATTEMPT_AFTER_4XX\s*\n\s*: MAX_COMPOSE_ATTEMPTS/.test(src))
check('a desistência (e-mail de resgate) usa attemptCap', /if \(attemptCount >= attemptCap\) \{\s*\n\s*\/\/ Fallback V1/.test(src))
check('a regra antiga "attemptCount >= MAX" não decide mais a desistência', !/if \(attemptCount >= MAX_COMPOSE_ATTEMPTS\) \{\s*\n\s*\/\/ Fallback V1/.test(src))
check('tentativa extra deixa rastro no log', /extra attempt after \$\{oc\?\.total \?\? 0\}x compose_error_4xx/.test(src))
check('trava do #3 (weComposed só com attempts=0) intacta', /\(attempts\.get\(genId\) \?\? 0\) === 0\)/.test(src))
check('teto por rodada (MAX_COMPOSE_PER_RUN) intacto', /if \(composed >= MAX_COMPOSE_PER_RUN\)/.test(src))

// simulação da regra
const cap = (total, only4xx) => (total >= 2 && only4xx) ? 3 : 2
const givesUp = (attempts, total, only4xx) => attempts >= cap(total, only4xx)
check('e7f9f000: 2 attempts, 2×400 → NÃO desiste (3ª tentativa)', !givesUp(2, 2, true))
check('3 attempts, 3×400 → desiste (e-mail de resgate)', givesUp(3, 3, true))
check('2 attempts, 1×400 + 1×compose_threw → desiste (não é só 4xx)', givesUp(2, 2, false))
check('2 attempts, 0 desfechos gravados → desiste (regra antiga)', givesUp(2, 0, true))
check('1 attempt, 1×400 → segue normal (abaixo do teto)', !givesUp(1, 1, true))
check('compose_error_503 não libera extra', !/^compose_error_4\d\d$/.test('compose_error_503'))
check('compose_error_400 e 409 liberam', /^compose_error_4\d\d$/.test('compose_error_400') && /^compose_error_4\d\d$/.test('compose_error_409'))

console.log(fails === 0 ? `\n${n} verificações, 0 falhas.` : `\n${fails} FALHAS de ${n}.`)
process.exit(fails ? 1 : 0)
