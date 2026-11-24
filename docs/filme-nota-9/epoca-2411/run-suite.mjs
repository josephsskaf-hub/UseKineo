import {spawnSync} from 'node:child_process'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
const here=path.dirname(fileURLToPath(import.meta.url))
import {CANDIDATE} from './versoes.mjs'
const [repoArg,rev=CANDIDATE]=process.argv.slice(2)
if(!repoArg||!rev) throw Error('Uso: node run-suite.mjs <repo da Kineo> <SHA completo | working=pasta-da-worktree>')
const repo=path.resolve(repoArg)
for(const [file,args] of [
  ['base.mjs',[repo]],['conferir.mjs',[repo,rev,path.join(here,'acoplar.mjs')]],
  ['fusao.mjs',[repo,rev]],['pressao.mjs',[repo,rev]],['hoje.mjs',[repo,rev]]
]){
  const result=spawnSync(process.execPath,[path.join(here,file),...args],{encoding:'utf8'})
  if(result.status!==0||result.error) {
    process.stderr.write(String(result.error||result.stderr||result.stdout))
    process.exit(result.status||1)
  }
  console.log(file+' passou')
}
