import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {execFileSync} from 'node:child_process'
import {createHash} from 'node:crypto'
import {pathToFileURL} from 'node:url'

// Reuse the pinned loader; expose Git blobs through the two read-only fs methods it uses.
// This also works in a sparse checkout and never creates a product worktree.
export async function mundo(root, commit) {
  const require = createRequire(path.join(process.env.KINEO_TS_ROOT||root,'package.json'))
  const tsPath = require.resolve('typescript')
  const git = (...args) => execFileSync('git',['-C',root,...args], {encoding:'utf8',maxBuffer:32e6})
  const working=commit.startsWith('working=')
  const key=p=>{const x=path.normalize(path.resolve(p));return process.platform==='win32'?x.toLowerCase():x}
  let sourceCommit=commit
  if(working) {
    const entry=git('worktree','list','--porcelain').replace(/\r\n/g,'\n').split(/\n\n+/u).find(record=>{
      const match=/^worktree (.+)$/mu.exec(record)
      return match&&key(match[1])===key(commit.slice(8))
    })
    assert.ok(entry,'A pasta deve ser uma worktree registrada nesse repositório')
    sourceCommit=/^HEAD ([a-f0-9]+)$/mu.exec(entry)[1]
  }
  const parent=git('rev-parse','--verify',sourceCommit+'^{commit}').trim()
  const overrides=new Map()
  if(working) for(const file of ['lib/cinematic/epocaVisual2411.ts','app/api/generate-video-cinematic/route.ts']) {
    overrides.set(file,fs.readFileSync(path.join(commit.slice(8),file),'utf8'))
  }
  const sha=working?parent+'+working:'+createHash('sha256').update([...overrides.values()].join('\0')).digest('hex'):parent
  const before = '7af247b9d006517b91791bf5261f69a7d5219404'
  const loader = git('show',before+':scripts/test-support/offline-ts-loader.mjs')
  const names = new Set([...git('ls-tree','--name-only','-r',parent,'lib','app/api/generate-video-cinematic/route.ts').trim().split(/\r?\n/),...overrides.keys()])
  const byName = new Map()
  function read(name) {
    if (!names.has(name)) throw Error('Blob fora da lista: '+name)
    if (!byName.has(name)) byName.set(name,overrides.get(name)??git('show',parent+':'+name))
    return byName.get(name)
  }
  const relative = file => path.relative(root,file).split(path.sep).join('/')
  const binding = Symbol.for('offline.epoca.gitfs.'+sha)
  globalThis[binding] = {existsSync:file=>names.has(relative(file)),readFileSync:file=>read(relative(file))}
  const adapted = loader.replace("import fs from 'node:fs'",'const fs=globalThis[Symbol.for('+JSON.stringify(Symbol.keyFor(binding))+')]')
    .replace("from 'typescript'",'from '+JSON.stringify(pathToFileURL(tsPath).href))
  assert.ok(adapted.includes('const fs=globalThis'))
  const {createOfflineLoader} = await import('data:text/javascript;base64,'+Buffer.from(adapted).toString('base64'))
  const load = createOfflineLoader({globals:{AbortSignal}})
  return {sha,read,load,ts:require(tsPath)}
}
