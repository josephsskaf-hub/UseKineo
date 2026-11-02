// KINEO-SEM-INICIO-AUTOMATICO-0211 — [TRAVA 8.2 — aval permanente do fundador (proteção do cliente) 02/11]
// Gera desfaz-sem-inicio-automatico-0211-fontes.json a partir do diff contra origin/main (rodar de novo se o código mudar).
// Mesmo padrão do recibo de 85a82bbe9 (gerar-recibo-revisor-10-0111.mjs); a única diferença é o contexto ADAPTATIVO:
// o GenerateClient tem muitas linhas repetidas, então cada trecho cresce 1 linha de contexto por vez até ficar único.
// Uso: node scripts/test-support/gerar-recibo-sem-inicio-automatico-0211.mjs
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join } from 'node:path'

const raiz = join(import.meta.dirname, '..', '..')
const lf = (t) => String(t).replace(/\r\n/g, '\n')
const sha = (t) => createHash('sha256').update(t).digest('hex')
const git = (...a) => execFileSync('git', a, { cwd: raiz, encoding: 'utf8', maxBuffer: 64 << 20 })
const ESCOPO = [
  'app/(dashboard)/generate/GenerateClient.tsx',
  'app/(dashboard)/create/CreateClient.tsx',
  'app/admin/overview/page.tsx',
  'lib/admin/versaoBFunnel.ts',
  'lib/growth/cardEntryResumeDraft.ts',
  'lib/growth/semInicioAutomatico.ts',
  'scripts/test-sem-inicio-automatico-0211.mts',
] // KINEO-SEM-INICIO-AUTOMATICO-0211 — depois de pagar nada começa sozinho; 35 → 60 corrigido; 1º filme pago no clique

const conta = (s, sub) => s.split(sub).length - 1
const scope = {}, addedSources = {}
for (const file of ESCOPO) {
  const now = lf(readFileSync(join(raiz, file), 'utf8'))
  const existe = git('ls-tree', '--name-only', 'origin/main', '--', file).trim()
  if (!existe) { addedSources[file] = sha(now); continue }
  const before = lf(git('show', `origin/main:${file}`))
  const a = before.split('\n'), b = now.split('\n')
  // blocos diferentes [i..ii) em a e [j..jj) em b
  const blocos = []
  let i = 0, j = 0
  while (i < a.length || j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue }
    if (i >= a.length) { blocos.push([i, a.length, j, b.length]); break }
    let ii = -1, jj = -1
    outer: for (let d = 1; d < 600; d++) for (let x = 0; x <= d; x++) { const y = d - x; if (a[i + x] !== undefined && a[i + x] === b[j + y] && a[i + x + 1] === b[j + y + 1] && a[i + x + 2] === b[j + y + 2]) { ii = i + x; jj = j + y; break outer } }
    if (ii < 0) throw Error('diff grande demais em ' + file)
    blocos.push([i, ii, j, jj])
    i = ii; j = jj
  }
  const hunks = []
  let r = now
  for (const [i0, i1, j0, j1] of blocos) {
    let ctx = 1
    for (;;) {
      const antes = [...a.slice(Math.max(0, i0 - ctx), i0), ...a.slice(i0, i1), ...a.slice(i1, i1 + ctx)].join('\n')
      const depois = [...b.slice(Math.max(0, j0 - ctx), j0), ...b.slice(j0, j1), ...b.slice(j1, j1 + ctx)].join('\n')
      if (conta(now, depois) === 1 && conta(r, depois) === 1) { hunks.push({ before: antes, after: depois }); break }
      if (++ctx > 40) throw Error('trecho ambíguo em ' + file)
    }
  }
  for (const h of hunks) { if (conta(r, h.after) !== 1) throw Error('trecho ambíguo em ' + file); r = r.replace(h.after, () => h.before) }
  if (r !== before) throw Error('desfazer não devolve a origin/main em ' + file)
  scope[file] = { beforeSha256: sha(before), afterSha256: sha(now), hunks }
}
writeFileSync(join(raiz, 'scripts/test-support/desfaz-sem-inicio-automatico-0211-fontes.json'), JSON.stringify({ base: git('rev-parse', 'origin/main').trim(), scope, addedSources }, null, 1) + '\n')
console.log('recibo:', Object.keys(scope).length, 'alterados,', Object.keys(addedSources).length, 'novos')
