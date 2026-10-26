import { levaTaskSource, levaTaskInventory, levaCurrentInventory } from './test-support/leva-integration-2410.mjs' // KINEO-LEVA-2410 — sealed live source and complete current-tree inventory.
// KINEO-CARDS-GIRO-2410 — exact source undo, fixed points, EOL, Windows paths, tamper rejection and bounded task inventory; no writes.
import { semCardsBordas2410 } from './test-support/desfaz-cards-bordas-2410.mjs' // KINEO-CARDS-BORDAS-2410
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { semCardsGiro2410 as undo, CARDS_GIRO_2410_MANIFEST as manifest, CARDS_GIRO_2410_BASE as BASE } from './test-support/desfaz-cards-giro-2410.mjs'
const git = (...args) => execFileSync('git',args,{encoding:'utf8',windowsHide:true,maxBuffer:64<<20,stdio:['ignore','pipe','ignore']}).replace(/\r\n/g,'\n')
const lf = source => source.replace(/\r\n/g,'\n'), crlf=source=>lf(source).replace(/\n/g,'\r\n'), hash=source=>createHash('sha256').update(source).digest('hex')
assert.equal(manifest.base,BASE)
for (const [file,item] of Object.entries(manifest.sources)) {
  const raw=levaTaskSource(readFileSync(file,'utf8'),file,'cards'), current=lf(raw), before=git('show',BASE+':'+file)
  assert.equal(item.before,before,'before bytes come from immutable base: '+file)
  assert.equal(item.beforeHash,hash(before),'base hash: '+file)
  assert.equal(item.afterHash,hash(current),'complete current source hash: '+file)
  assert.equal(undo(current,file),before,'exact LF restoration: '+file)
  assert.equal(undo(raw,file),raw.includes('\r\n')?crlf(before):before,'actual EOL restoration: '+file)
  assert.equal(undo(crlf(current),file),crlf(before),'CRLF restoration: '+file)
  assert.equal(undo(current,file.replace(/\//g,'\\')),before,'Windows path restoration: '+file)
  assert.equal(undo(before,file),before,'base fixed point: '+file)
  assert.equal(undo(undo(current,file),file),before,'idempotent restoration: '+file)
  assert.throws(()=>undo(current+'\n// unrelated tamper\n',file),/fonte divergente/,'unreviewed outside bytes reject: '+file)
  const unmarked=current.replaceAll('KINEO-CARDS-GIRO-2410','REMOVED_TASK_MARK')
  if(unmarked!==current)assert.throws(()=>undo(unmarked,file),/fonte divergente/,'layer evidence survives removed marker: '+file)
  const saved=item.before
  try {item.before+='corrupt';assert.throws(()=>undo(before,file),/manifesto divergente/,'manifest before tampering rejects: '+file)}finally{item.before=saved}
}
for(const file of manifest.newFiles){assert.ok(existsSync(file),'new task file exists: '+file);assert.throws(()=>git('show',BASE+':'+file),undefined,'new task file absent from base: '+file)}
for(const file of manifest.artifacts??[])assert.ok(file.startsWith('docs/')&&existsSync(file),'review evidence under docs: '+file)
const actual=levaTaskInventory('cards',levaCurrentInventory(BASE)) // KINEO-LEVA-2410
assert.deepEqual([...Object.keys(manifest.sources),...manifest.newFiles,...(manifest.artifacts??[])].sort(),actual,'exact complete task inventory; no file outside declared layer')
assert.equal(undo(null,'lib/ui/homeThreeCards.ts'),null)
assert.equal(undo('unrelated\r\n','lib/unrelated.ts'),'unrelated\r\n')
console.log(`ok KINEO-CARDS-GIRO-2410 undo: ${Object.keys(manifest.sources).length} exact sources return to ${BASE}; LF/CRLF/Windows; idempotent; removed marker and outside tampering rejected; complete task inventory; no writes`)
