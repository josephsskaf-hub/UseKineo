// KINEO-FICHA-DO-PEDIDO-0911 [TRAVA 8.2 — aval permanente do fundador 01/11 (laço do revisor)] — gera desfaz-ficha-do-pedido-0911-fontes.json a partir do diff contra a base (rodar de novo se o código mudar).
// Uso: node scripts/test-support/gerar-recibo-ficha-do-pedido-0911.mjs
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join } from 'node:path'

const raiz = join(import.meta.dirname, '..', '..')
const lf = (t) => String(t).replace(/\r\n/g, '\n')
const sha = (t) => createHash('sha256').update(t).digest('hex')
const git = (...a) => execFileSync('git', a, { cwd: raiz, encoding: 'utf8', maxBuffer: 64 << 20 })
const BASE = '6e6afd0c52b57cb543840ae21c85966050617a06' // a origin/main em que este conserto nasceu (fixa: o recibo não muda quando a origin/main anda)
const ESCOPO = ['app/api/generate-video-cinematic/route.ts', 'lib/cinematic/fichaDoPedido.ts'] // KINEO-FICHA-DO-PEDIDO-0911 — as 4 linhas da rota (import + caminho principal + ajuste de 15 s) e o leitor novo do pedido original

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
    // bloco acrescentado no FIM do arquivo (não há linha em comum depois): o trecho vai até o fim
    if (i >= a.length) { hunks.push({ before: a[i - 1], after: [b[j - 1], ...b.slice(j)].join('\n') }); break }
    // acha a próxima linha em comum (busca gulosa limitada)
    let ii = -1, jj = -1
    outer: for (let d = 1; d < 400; d++) for (let x = 0; x <= d; x++) { const y = d - x; if (a[i + x] !== undefined && a[i + x] === b[j + y] && a[i + x + 1] === b[j + y + 1]) { ii = i + x; jj = j + y; break outer } }
    if (ii < 0) throw Error('diff grande demais em ' + file)
    const ctxA = i > 0 ? [a[i - 1]] : [], ctxB = j > 0 ? [b[j - 1]] : []
    hunks.push({ before: [...ctxA, ...a.slice(i, ii), a[ii]].join('\n'), after: [...ctxB, ...b.slice(j, jj), b[jj]].join('\n') })
    i = ii; j = jj
  }
  // confere: desfazer devolve a origin/main
  let r = now
  for (const h of hunks) { if (r.split(h.after).length !== 2) throw Error('trecho ambíguo em ' + file); r = r.replace(h.after, () => h.before) }
  if (r !== before) throw Error('desfazer não devolve a origin/main em ' + file)
  scope[file] = { beforeSha256: sha(before), afterSha256: sha(now), hunks }
}
writeFileSync(join(raiz, 'scripts/test-support/desfaz-ficha-do-pedido-0911-fontes.json'), JSON.stringify({ base: BASE, scope, addedSources }, null, 1) + '\n')
console.log('recibo:', Object.keys(scope).length, 'alterados,', Object.keys(addedSources).length, 'novos')
