// Execute the actual browser cleanup with in-memory storage; no auth or network.
const assert = require('node:assert/strict')
const { loader, read } = require('../recreate-0911/test-recreate.cjs')
const storage = entries => {
  const values = new Map(entries)
  return { get length() { return values.size }, key: index => [...values.keys()][index] ?? null, getItem: key => values.get(key) ?? null, removeItem: key => values.delete(key) }
}
const previousWindow = global.window, previousDocument = global.document
try {
  const sessionStorage = storage([
    ['kineo:recreate:flow:attempt:first:passarela', 'private request'],
    ['kineo:recreate:flow:attempt:second:passarela', 'another private request'],
    ['kineo:recreate:seu-video:uncertain:first', 'opaque pending request'],
    ['other-feature-draft', 'keep'],
  ])
  global.window = { sessionStorage, localStorage: storage([['sb-test-auth-token', 'fixture'], ['kineo:appearance:v1', 'light']]), location: { protocol: 'https:', hostname: 'www.usekineo.com' } }
  global.document = { cookie: '' }
  const client = loader({ '@/lib/supabase/client': { createClient() { throw Error('No auth permitted in this test') } } }, {
    'lib/auth/sairDaContaCliente.ts': read('lib/auth/sairDaContaCliente.ts').replace('process.env.NEXT_PUBLIC_SUPABASE_URL', 'undefined'),
  })('lib/auth/sairDaContaCliente')
  client.apagarSessaoNoNavegador()
  assert.equal(sessionStorage.getItem('kineo:recreate:flow:attempt:first:passarela'), null)
  assert.equal(sessionStorage.getItem('kineo:recreate:flow:attempt:second:passarela'), null)
  assert.equal(sessionStorage.getItem('kineo:recreate:seu-video:uncertain:first'), null)
  assert.equal(sessionStorage.getItem('other-feature-draft'), 'keep')
  assert.equal(window.localStorage.getItem('kineo:appearance:v1'), 'light')
  assert.equal(window.localStorage.getItem('sb-test-auth-token'), null)
  Object.defineProperty(window, 'sessionStorage', { get() { throw Error('Storage unavailable') } })
  assert.doesNotThrow(() => client.apagarSessaoNoNavegador())
  console.log('PASS M12 logout: 7 checks; retry snapshots cleared, unrelated storage kept, blocked storage does not block logout')
} finally {
  if (previousWindow === undefined) delete global.window; else global.window = previousWindow
  if (previousDocument === undefined) delete global.document; else global.document = previousDocument
}
