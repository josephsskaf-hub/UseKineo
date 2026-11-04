// KINEO-PRECO-MERCADO-0411 [fundador 04/11: "9. 19. 59", mensal sem desconto, anual 50%] — gera desfaz-preco-mercado-0411-fontes.json a partir do diff contra a base desta entrega (rodar de novo se um destes arquivos mudar).
// Uso: node scripts/test-support/gerar-recibo-preco-mercado-0411.mjs
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join } from 'node:path'

const raiz = join(import.meta.dirname, '..', '..')
const BASE = '7da88cf10b727a76f118d151f5937b1d30bd4554'
const lf = (t) => String(t).replace(/\r\n/g, '\n')
const sha = (t) => createHash('sha256').update(t).digest('hex')
const git = (...a) => execFileSync('git', a, { cwd: raiz, encoding: 'utf8', maxBuffer: 64 << 20 })
// Só os arquivos que um guardião histórico compara com a base byte a byte.
const ESCOPO = ['lib/checkoutPricing.ts', 'lib/settlementCurrency.ts', 'lib/billing/annualRefill.ts']

const scope = {}
for (const file of ESCOPO) {
  const now = lf(readFileSync(join(raiz, file), 'utf8'))
  const before = lf(git('show', `${BASE}:${file}`))
  // hunks por linhas: blocos contíguos diferentes, com 1 linha de contexto de cada lado
  const a = before.split('\n'), b = now.split('\n')
  let i = 0, j = 0; const hunks = []
  while (i < a.length || j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue }
    let ii = -1, jj = -1
    outer: for (let d = 1; d < 400; d++) for (let x = 0; x <= d; x++) { const y = d - x; if (a[i + x] !== undefined && a[i + x] === b[j + y] && a[i + x + 1] === b[j + y + 1]) { ii = i + x; jj = j + y; break outer } }
    if (ii < 0) throw Error('diff grande demais em ' + file)
    const ctxA = i > 0 ? [a[i - 1]] : [], ctxB = j > 0 ? [b[j - 1]] : []
    hunks.push({ before: [...ctxA, ...a.slice(i, ii), a[ii]].join('\n'), after: [...ctxB, ...b.slice(j, jj), b[jj]].join('\n') })
    i = ii; j = jj
  }
  // confere: desfazer devolve a base
  let r = now
  for (const h of hunks) { if (r.split(h.after).length !== 2) throw Error('trecho ambíguo em ' + file + ': ' + h.after.slice(0, 80)); r = r.replace(h.after, () => h.before) }
  if (r !== before) throw Error('desfazer não devolve a base em ' + file)
  scope[file] = { beforeSha256: sha(before), afterSha256: sha(now), hunks }
}
writeFileSync(join(raiz, 'scripts/test-support/desfaz-preco-mercado-0411-fontes.json'), JSON.stringify({ base: BASE, scope }, null, 1) + '\n')
console.log('recibo:', Object.keys(scope).length, 'arquivos')
