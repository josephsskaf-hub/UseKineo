// Execute the selectors used by the admin table without connecting to the admin API.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ui = fs.readFileSync('app/admin/people/PeopleClient.tsx', 'utf8')
const api = fs.readFileSync('app/api/admin/people/route.ts', 'utf8')
const selectBody = ui.match(/const filtered = useMemo\(\(\) => \{([\s\S]*?)\}, \[people, q\]\)/)[1]
const ownerTest = api.match(/is_founder: ([^\r\n]+),/)[1]
function person(email, internal) {
  return { email, is_internal: internal, is_founder: vm.runInNewContext(ownerTest, { p: { email } }) }
}
const owner = person('JosephSskaf@gmail.com', true)
const testAccount = person('josephsskaf+test@gmail.com', true)
const external = Array.from({ length: 260 }, (_, i) => person('person' + i + '@example.test', false))
const select = q => vm.runInNewContext('(() => {' + selectBody + '})()', { people: [...external, testAccount, owner], q })
assert.equal(select('')[0], owner)
assert.equal(select('').length, 261)
assert.equal(select('joseph')[0], owner)
assert.equal(select('joseph').length, 1)
assert.equal(select('person259')[0], external[259])
assert.match(ui, /filtered\.slice\(0, 250\)/)
assert.match(ui, /!p\.is_internal && p\.paid_kind/)
assert.match(ui, /everyone\.map\([\s\S]*?<GrantButton email=\{p\.email\} onClick=\{setGrantFor\}/)
assert.match(api, /const ext = people\.filter\(\(p\) => !p\.is_internal\)/)
console.log('PASS founder, alias, 250-row cutoff, search, shared grant and external metrics')

