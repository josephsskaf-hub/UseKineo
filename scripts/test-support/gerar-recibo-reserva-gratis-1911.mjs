// KINEO-RESERVA-GRATIS-1911 — gera o recibo EXATO desta entrega (desfaz-reserva-gratis-1911-fontes.json) a partir de `git diff origin/main`.
// Rodar só depois de commitar a entrega: node scripts/test-support/gerar-recibo-reserva-gratis-1911.mjs
import { execFileSync } from 'node:child_process'
import { writeFileSync, readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
const ARQS = ['lib/kling4TrialAsyncStatus.ts', 'lib/kling4TrialScript.ts']
const lf = (t) => String(t).replace(/\r\n/g, '\n')
const sha = (t) => createHash('sha256').update(t).digest('hex')
const scope = {}
const base = execFileSync('git', ['merge-base', 'HEAD', 'origin/main'], { encoding: 'utf8' }).trim()
for (const f of ARQS) {
  const antes = lf(execFileSync('git', ['show', `${base}:${f}`], { encoding: 'utf8', maxBuffer: 64 << 20 }))
  const depois = lf(readFileSync(f, 'utf8'))
  const diff = lf(execFileSync('git', ['diff', '-U3', base, '--', f], { encoding: 'utf8', maxBuffer: 64 << 20 }))
  const hunks = []
  for (const bloco of diff.split(/^@@[^\n]*\n/m).slice(1)) {
    const linhas = bloco.replace(/\n$/, '').split('\n').filter((l) => !l.startsWith('\\'))
    const before = linhas.filter((l) => !l.startsWith('+')).map((l) => l.slice(1)).join('\n') + '\n'
    const after = linhas.filter((l) => !l.startsWith('-')).map((l) => l.slice(1)).join('\n') + '\n'
    hunks.push({ before, after })
  }
  scope[f] = { beforeSha256: sha(antes), afterSha256: sha(depois), hunks }
}
writeFileSync(new URL('./desfaz-reserva-gratis-1911-fontes.json', import.meta.url), JSON.stringify({ base, scope }, null, 1) + '\n')
console.log('recibo gerado para', Object.keys(scope).join(', '), 'sobre', base.slice(0, 9))
