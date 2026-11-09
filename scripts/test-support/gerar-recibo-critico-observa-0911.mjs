// KINEO-CRITICO-OBSERVA-0911 — [TRAVA 8.2 — "vai no crítico" do fundador 09/11]: gera o recibo exato (antes/depois por trecho, com 1 linha de contexto).
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
const raiz = new URL('../../', import.meta.url)
const file = 'lib/cinematic/criticoStill.ts'
const lf = (t) => String(t).replace(/\r\n/g, '\n')
const sha = (t) => createHash('sha256').update(t).digest('hex')
const base = lf(execFileSync('git', ['show', `origin/main:${file}`], { cwd: raiz, encoding: 'utf8', maxBuffer: 64 << 20 }))
const depois = lf(readFileSync(new URL(file, raiz), 'utf8'))
const diff = execFileSync('git', ['diff', '-U1', 'origin/main', '--', file], { cwd: raiz, encoding: 'utf8', maxBuffer: 64 << 20 })
const hunks = []
for (const bloco of lf(diff).split(/\n(?=@@ )/).filter((b) => b.startsWith('@@'))) {
  const linhas = bloco.split('\n').slice(1).filter((l) => l !== '\ No newline at end of file')
  const antes = [], novo = []
  for (const l of linhas) { if (l.startsWith('-')) antes.push(l.slice(1)); else if (l.startsWith('+')) novo.push(l.slice(1)); else { antes.push(l.slice(1)); novo.push(l.slice(1)) } }
  hunks.push({ before: antes.join('\n'), after: novo.join('\n') })
}
let r = depois
for (const h of hunks) { if (r.split(h.after).length !== 2) throw Error('trecho ambiguo'); r = r.replace(h.after, () => h.before) }
if (r !== base) throw Error('desfazer não devolve a base')
const head = execFileSync('git', ['rev-parse', 'origin/main'], { cwd: raiz, encoding: 'utf8' }).trim()
writeFileSync(new URL('./desfaz-critico-observa-0911-fontes.json', import.meta.url), JSON.stringify({ base: head, scope: { [file]: { beforeSha256: sha(base), afterSha256: sha(depois), hunks } }, addedSources: {} }, null, 1) + '\n')
console.log('recibo ok:', hunks.length, 'trechos')
