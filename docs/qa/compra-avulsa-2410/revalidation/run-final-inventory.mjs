// Only overwrites the two pre-inventoried evidence files below; runs offline from the repo worktree.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync, execFileSync } from 'node:child_process'
const root = process.cwd(), dir = path.dirname(fileURLToPath(import.meta.url))
const log = path.join(dir, 'final-inventory.log'), json = path.join(dir, 'final-inventory-results.json')
if (![log, json].every(file => fs.existsSync(file))) throw new Error('Evidence filenames must exist before the inventory is captured')
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', windowsHide: true }).trim()
const productiveChanges = git('diff', '--name-only', '4ff20d54543e3c917a15dfc290d8f1185a226eef', '--', 'app', 'components', 'lib', 'migrations_pending', 'package.json', 'package-lock.json', '.github').split('\n').filter(Boolean)
if (productiveChanges.length) throw new Error('Productive sources changed after the full validated candidate')
const allowed = ['PATH','Path','PATHEXT','SystemRoot','WINDIR','TEMP','TMP','USERPROFILE','LOCALAPPDATA','APPDATA','ProgramFiles','ProgramFiles(x86)','COMSPEC']
const env = Object.fromEntries(allowed.filter(k => process.env[k] !== undefined).map(k => [k, process.env[k]]))
env.NODE_OPTIONS = '--require="' + path.join(dir, '../candidate/offline-guard.cjs').replaceAll('\\', '/') + '"'
const file = 'scripts/test-compra-avulsa-undo-2410.mjs', started = Date.now()
const result = spawnSync(process.execPath, [file], { cwd: root, env, encoding: 'utf8', windowsHide: true, maxBuffer: 64 << 20, timeout: 600000 })
fs.writeFileSync(log, `COMMAND: ${process.execPath} ${file}\nEXIT: ${result.status}\n${result.stdout ?? ''}${result.stderr ?? ''}`)
const doc = { date: new Date().toISOString(), head: git('rev-parse', 'HEAD'), productiveChanges, file, exit: result.status, ok: result.status === 0, elapsedMs: Date.now() - started, log: 'final-inventory.log' }
fs.writeFileSync(json, JSON.stringify(doc, null, 2) + '\n')
console.log(JSON.stringify(doc, null, 2))
if (!doc.ok) process.exitCode = 1
