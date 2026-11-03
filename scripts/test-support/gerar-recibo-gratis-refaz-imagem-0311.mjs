// KINEO-GRATIS-REFAZ-IMAGEM-0311 [TRAVA 8.2 — fundador 03/11: "três sim" — refazer também a imagem da cena no 1º filme grátis] — gera
// desfaz-gratis-refaz-imagem-0311-fontes.json a partir do diff contra o commit-base (rodar de novo se o código mudar).
// Uso: node scripts/test-support/gerar-recibo-gratis-refaz-imagem-0311.mjs [commit-base]   (padrão: o base já gravado no recibo; sem recibo, origin/main)
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join } from 'node:path'

const raiz = join(import.meta.dirname, '..', '..')
const lf = (t) => String(t).replace(/\r\n/g, '\n')
const sha = (t) => createHash('sha256').update(t).digest('hex')
const git = (...a) => execFileSync('git', a, { cwd: raiz, encoding: 'utf8', maxBuffer: 64 << 20 })
const RECIBO = join(raiz, 'scripts/test-support/desfaz-gratis-refaz-imagem-0311-fontes.json')
const BASE = git('rev-parse', process.argv[2] ?? (existsSync(RECIBO) ? JSON.parse(readFileSync(RECIBO, 'utf8')).base : 'origin/main')).trim()
const ESCOPO = [
  'lib/free15Gate.ts', 'lib/free15GateServer.ts', // o portão do filme grátis (não protegido pela TRAVA, mas lido por guardiões que comparam com o commit-base)
  'scripts/test-gratis-refaz-cena-0311.mjs', 'scripts/test-painel-motor-entregue-0211.mjs', // os guardiões históricos ajustados (encadeiam esta camada antes)
  'lib/free15RefazImagem0311.ts', 'lib/free15StillFlux0311.ts', 'scripts/test-gratis-refaz-imagem-0311.mjs',
  'scripts/test-support/desfaz-gratis-refaz-imagem-0311.mjs', 'scripts/test-support/gerar-recibo-gratis-refaz-imagem-0311.mjs', // os novos
]

const scope = {}, addedSources = {}
for (const file of ESCOPO) {
  const now = lf(readFileSync(join(raiz, file), 'utf8'))
  const existe = git('ls-tree', '--name-only', BASE, '--', file).trim()
  if (!existe) { addedSources[file] = sha(now); continue }
  const before = lf(git('show', `${BASE}:${file}`))
  // hunks por linhas: blocos contíguos diferentes, com 1 linha de contexto de cada lado (único no arquivo)
  const a = before.split('\n'), b = now.split('\n')
  let i = 0, j = 0; const hunks = []
  while (i < a.length || j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue }
    if (i >= a.length) { hunks.push({ before: a[i - 1], after: [b[j - 1], ...b.slice(j)].join('\n') }); break }
    let ii = -1, jj = -1
    outer: for (let d = 1; d < 400; d++) for (let x = 0; x <= d; x++) { const y = d - x; if (a[i + x] !== undefined && a[i + x] === b[j + y] && a[i + x + 1] === b[j + y + 1]) { ii = i + x; jj = j + y; break outer } }
    if (ii < 0) throw Error('diff grande demais em ' + file)
    const ctxA = i > 0 ? [a[i - 1]] : [], ctxB = j > 0 ? [b[j - 1]] : []
    hunks.push({ before: [...ctxA, ...a.slice(i, ii), a[ii]].join('\n'), after: [...ctxB, ...b.slice(j, jj), b[jj]].join('\n') })
    i = ii; j = jj
  }
  let r = now
  for (const h of hunks) { if (r.split(h.after).length !== 2) throw Error('trecho ambíguo em ' + file); r = r.replace(h.after, () => h.before) }
  if (r !== before) throw Error('desfazer não devolve o commit-base em ' + file)
  scope[file] = { beforeSha256: sha(before), afterSha256: sha(now), hunks }
}
writeFileSync(RECIBO, JSON.stringify({ base: BASE, scope, addedSources }, null, 1) + '\n')
console.log('recibo:', BASE.slice(0, 9), Object.keys(scope).length, 'alterados,', Object.keys(addedSources).length, 'novos')
