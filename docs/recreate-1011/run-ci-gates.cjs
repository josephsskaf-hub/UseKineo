// Local replay of the reviewed critical workflow's Node commands. No deploy,
// credentials, npm lifecycle scripts, checkout or production database access.
const fs = require('node:fs')
const path = require('node:path')
const {spawnSync} = require('node:child_process')
const {createHash} = require('node:crypto')
const root = path.resolve(process.env.CI_WORKTREE_ROOT || path.resolve(__dirname, '../..'))
const reportDirectory = path.resolve(process.env.CI_REPORT_DIRECTORY || __dirname)
fs.mkdirSync(reportDirectory,{recursive:true})
process.chdir(root)
const workflow = fs.readFileSync('.github/workflows/guardiao.yml', 'utf8').split('  legacy:')[0]
const commands = []
for (const line of workflow.split('\n')) {
  const match = /^\s*(?:run:\s*|if\s+)?node\s+(.+?)(?:; then)?\s*$/.exec(line)
  if (!match) continue
  const args = match[1].replace(/\s+#.*$/, '').replace(/; then$/, '')
  const tokens = args.match(/"[^"]*"|\S+/g).map(t => t.replace(/^"|"$/g, ''))
  const expected = /--mutant$/.test(args) ? 'reject' : 'pass'
  for (const item of tokens[0].includes('${item}') ? ['a', 'b', 'c'] : ['']) {
    commands.push({args:tokens.map(t => t.replace('${item}', item)), expected})
  }
}
const env = Object.fromEntries(['PATH','Path','SystemRoot','SYSTEMROOT','WINDIR','TEMP','TMP','USERPROFILE','HOME','COMSPEC','PATHEXT','APPDATA','LOCALAPPDATA'].filter(k => process.env[k]).map(k => [k,process.env[k]]))
const pathKey = Object.keys(env).find(k=>k.toLowerCase()==='path') || 'PATH'
env[pathKey] = path.dirname(process.execPath)+path.delimiter+(env[pathKey] || '')
if (process.env.PGLITE_MODULE) env.PGLITE_MODULE = process.env.PGLITE_MODULE
if (process.env.NODE_PATH) env.NODE_PATH = process.env.NODE_PATH
const sqlPackage = process.env.CI_SQL_PGLITE_MODULE
for (const c of commands) c.args = c.args.map(a => a.includes('$RUNNER_TEMP/') ? (sqlPackage || a) : a)
const output = {date:new Date().toISOString(), node:process.version, workflowSha256:createHash('sha256').update(workflow).digest('hex'), localOnly:true, results:[]}
const filter = process.argv[2]
const scoped=[['scripts/test-five-improvements.mjs'],['scripts/test-clipes-2026-09-29.mjs'],['scripts/test-studio-series-review.mjs'],['docs/recreate-0911/test-recreate.cjs'],['docs/recreate-0911/test-migration.cjs'],['--max-old-space-size=4096','node_modules/typescript/bin/tsc','--noEmit','--incremental','false']].map(args=>({args,expected:'pass'}))
const selected=filter==='--scoped'?scoped:commands.filter(c=>!filter||c.args[0].includes(filter))
const report=filter==='--scoped'?'validacao-final.json':filter?'ci-filter-results.json':'ci-critical-results.json'
output.kind=filter==='--scoped'?'Three requested gates, Recreate, isolated migration and complete typecheck':'critical workflow Node commands; local replay, not npm ci or Linux build'
output.base='10407b89a43bb2a5800ce5c706a88be34cd9484b'
for (const c of selected) {
  const started = Date.now()
  const r = spawnSync(process.execPath,c.args,{cwd:root,env,encoding:'utf8',maxBuffer:16<<20,timeout:c.args[0].includes('test-clipes-nos-2-lugares')?360000:180000})
  const details = ((r.stdout || '')+'\n'+(r.stderr || '')).trim()
  // A crashed mutant process is not evidence that a contract assertion killed it.
  const baseline = c.expected === 'reject' ? output.results.find(r=>r.expected==='pass' && r.args[0]===c.args[0]) : null
  const passed = c.expected === 'pass' ? r.status === 0 : baseline?.passed === true && r.status !== null && r.status !== 0 && /AssertionError|FALHA|FAIL|mutante detectado/i.test(details) && !/SyntaxError|ReferenceError|mutante sem alvo/.test(details)
  const result = {...c,status:r.status,passed,ms:Date.now()-started,output:details,error:r.error?.message || null}
  output.results.push(result)
  fs.writeFileSync(path.join(reportDirectory,report),JSON.stringify(output,null,2)+'\n')
  console.log(`${passed?'PASS':'FAIL'} ${c.args.join(' ')} [${r.status}; ${result.ms}ms]`)
  if (!passed) console.log(details.slice(-1000))
}
console.log(JSON.stringify({passed:output.results.filter(r=>r.passed).length,failed:output.results.filter(r=>!r.passed).length}))
process.exitCode = output.results.every(r=>r.passed) ? 0 : 1
