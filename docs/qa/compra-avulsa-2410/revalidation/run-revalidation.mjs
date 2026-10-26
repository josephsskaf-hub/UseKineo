import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync, execFileSync } from 'node:child_process'
const root = process.cwd(), runnerDir = path.dirname(fileURLToPath(import.meta.url))
const out = path.join(runnerDir, 'revalidation-' + new Date().toISOString().replace(/[:.]/g, '-'))
fs.mkdirSync(out); fs.writeFileSync(path.join(runnerDir, 'latest-revalidation-path.txt'), out)
const allowed = ['PATH','Path','PATHEXT','SystemRoot','WINDIR','TEMP','TMP','USERPROFILE','LOCALAPPDATA','APPDATA','ProgramFiles','ProgramFiles(x86)','COMSPEC']
const env = Object.fromEntries(allowed.filter(k => process.env[k] !== undefined).map(k => [k, process.env[k]]))
env.NODE_OPTIONS = '--require=' + path.join(runnerDir, 'offline-guard.cjs')
const git = (...args) => execFileSync('git', args, { encoding: 'utf8', windowsHide: true }).trim()
const doc = { date: new Date().toISOString(), head: git('rev-parse','HEAD'), typecheckHead: '4ff20d54', results: [] }
doc.productiveChanges = git('diff','--name-only','4ff20d54','--','app','components','lib','migrations_pending','package.json','package-lock.json','.github').split('\n').filter(Boolean)
if (doc.productiveChanges.length) throw new Error('Productive sources changed after the full candidate; broader revalidation required')
console.log('EVIDENCE:', out)
for (const file of ['scripts/test-ads-formatos-escolha-2410.mjs', 'scripts/test-compra-avulsa-undo-2410.mjs', 'scripts/test-idiomas-formatos-undo-2410.mjs']) {
  const started = Date.now(), result = spawnSync(process.execPath, [file], { cwd: root, env, encoding: 'utf8', windowsHide: true, maxBuffer: 64 << 20, timeout: 600000 })
  const log = path.basename(file, '.mjs') + '.log'
  fs.writeFileSync(path.join(out, log), 'COMMAND: ' + process.execPath + ' ' + file + '\nEXIT: ' + result.status + '\n' + (result.stdout ?? '') + (result.stderr ?? ''))
  doc.results.push({ file, args: [], exit: result.status, ok: result.status === 0, elapsedMs: Date.now() - started, log })
  fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(doc, null, 2) + '\n')
  console.log(result.status === 0 ? 'PASS' : 'FAIL', file)
}
if (doc.results.some(r => !r.ok)) process.exitCode = 1
