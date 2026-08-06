#!/usr/bin/env node
// AUDITORIA DE PÁGINAS ÓRFÃS  [KINEO-ORPHAN-REVENUE-2026-08-06]
//
// Roda: `node scripts/audit-orphan-pages.mjs` (não precisa de .env — lê só o repo).
//
// A PERGUNTA QUE ELE RESPONDE: quais páginas do sitemap NENHUMA página do site
// linka? Estar no sitemap não é ser linkada. Sitemap é um convite; link interno
// é um voto. Página que só recebe convite é candidata natural a "Discovered –
// currently not indexed", que é uma das duas métricas que o prompt diário diz
// que decidem tudo.
//
// DUAS EXCLUSÕES QUE MUDAM O RESULTADO (e sem as quais o número mente):
//   · app/sitemap.ts NÃO conta como link interno — é a própria fonte da lista.
//     Contá-lo faria toda página do sitemap ter no mínimo 1 e o audit acharia
//     zero órfãs.
//   · rotas app/api/** NÃO contam — uma string de caminho num handler de API
//     (ex.: o painel /admin/funnel) não é um <a> que crawler segue.
//
// FALSO POSITIVO JÁ PAGO: a primeira versão lia `{ path: '/pt', priority: 0.9 }`
// de dentro de um COMENTÁRIO do sitemap e reportava uma órfã de prioridade 0.9
// para uma página que não existe mais. Linhas comentadas são descartadas antes
// do parse — se um dia este script acusar uma órfã, conferir primeiro se a
// entrada é real.
//
// Resultado de 06/08/2026 (antes da correção desta sprint): 3 órfãs em 38
// entradas, e as TRÊS eram páginas de receita — /make-money-clipping-with-ai,
// /ai-avatar e /facts.

import fs from 'fs'
import path from 'path'

const SITEMAP = 'app/sitemap.ts'
const SCAN_DIRS = ['app', 'components', 'lib']

function sitemapEntries() {
  const raw = fs.readFileSync(SITEMAP, 'utf8')
  const code = raw
    .split('\n')
    .filter((line) => !line.trim().startsWith('//') && !line.trim().startsWith('*'))
    .join('\n')
  return [...code.matchAll(/\{\s*path:\s*'([^']*)'\s*,\s*priority:\s*([\d.]+)/g)]
    .map((m) => ({ path: m[1] || '/', priority: Number(m[2]) }))
    .filter((e) => e.path !== '/')
}

function sourceFiles() {
  const out = []
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules' && entry.name !== '.next') walk(p)
      } else if (/\.tsx?$/.test(entry.name)) {
        out.push(p)
      }
    }
  }
  for (const d of SCAN_DIRS) if (fs.existsSync(d)) walk(d)
  return out
}

const entries = sitemapEntries()
const files = sourceFiles()
const sources = new Map(files.map((f) => [f.replace(/\\/g, '/'), fs.readFileSync(f, 'utf8')]))

const rows = entries.map(({ path: route, priority }) => {
  const self = `app${route}/page.tsx`
  const from = []
  for (const [file, code] of sources) {
    if (file === self) continue // a própria página não vota em si
    if (file.endsWith('app/sitemap.ts')) continue // ver cabeçalho
    if (file.includes('/api/')) continue // ver cabeçalho
    if (code.includes(`"${route}"`) || code.includes(`'${route}'`) || code.includes(`href="${route}`)) {
      from.push(file)
    }
  }
  return { route, priority, inlinks: from.length, from }
})

rows.sort((a, b) => a.inlinks - b.inlinks || b.priority - a.priority)

console.log('PÁGINA DO SITEMAP'.padEnd(44) + 'PRIO  INLINKS  ORIGEM')
for (const r of rows) {
  console.log(
    r.route.padEnd(44) +
      String(r.priority).padEnd(6) +
      String(r.inlinks).padStart(5) +
      (r.inlinks <= 2 ? '    ' + r.from.map((f) => f.replace(/^\.\//, '')).join(', ') : ''),
  )
}

const orphans = rows.filter((r) => r.inlinks === 0)
console.log('')
console.log(`Entradas no sitemap: ${rows.length}`)
console.log(`ÓRFÃS (0 links internos): ${orphans.length}${orphans.length ? ' → ' + orphans.map((o) => o.route).join(', ') : ''}`)
console.log(`Só 1 link interno (frágil): ${rows.filter((r) => r.inlinks === 1).length}`)
// Regra dos 30/07: todo número sai com o denominador.
console.log(`Denominador: ${sources.size} arquivos .ts/.tsx varridos em ${SCAN_DIRS.join(', ')}`)
if (orphans.length > 0) process.exitCode = 1
