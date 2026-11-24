import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
const frozen=JSON.parse(readFileSync(new URL('./citacoes-crescimento-referencias-2411.json',import.meta.url),'utf8'))
assert.equal(createHash('sha256').update(JSON.stringify({sources:frozen.sources,caller:frozen.caller})).digest('hex'),'10929d2669c6b0c73245e7956592ce1b0daafe7eee855f015818ad644089478d','Exact reviewed references, portable without unmerged Git objects')
export function citationFilmBaseline(file){assert.ok(Object.hasOwn(frozen.sources,file),'Frozen source exists');return frozen.sources[file]}
export const REVIEWED_FILM_CALLER=frozen.caller
