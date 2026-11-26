import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { renderPage } from './preview-ux-complete.mjs'

const require = createRequire(import.meta.url)
const { loader, read } = require('../docs/studio-na-moldura-1011/runtime.cjs')
const releaseFile = 'lib/create/publicEditorRelease.ts'
const off = { [releaseFile]: read(releaseFile).replace('PUBLIC_CREATE_EDITORS = true', 'PUBLIC_CREATE_EDITORS = false') }
assert.notEqual(off[releaseFile], read(releaseFile))
const menu = overrides => loader({}, overrides)('lib/create/entry').createEntryHref
const movieLinks = ['/studio', '/studio?intent_campaign=nav_door']
for (const legacy of movieLinks) {
  const target = menu({})('film', legacy, true)
  assert.equal(new URL(target, 'https://example.invalid').pathname, '/create/film')
  assert.equal(menu({})('film', legacy, false), target)
  assert.equal(menu(off)('film', legacy, false), legacy)
  assert.equal(menu({})('film', legacy, undefined), legacy)
  for (const gate of ['shell', 'entry', 'filmInplace']) {
    assert.equal(menu({})('film', legacy, false, { [gate]: 'off' }), legacy)
  }
}
for (const [kind, url] of [['cartoon', '/kids-cartoon'], ['ads', '/ads/new'], ['film', '/studio?avancado=1']]) {
  assert.equal(menu({})(kind, url, false), url)
}

for (const signedIn of [true,false]) {
  const html = renderPage('app/KineoLanding.tsx', false, { pathname: '/' }, { initialUser: signedIn ? { id: 'fixture' } : null })
  const links = [...html.matchAll(/<a\b(?=[^>]*\bdata-nav-item="video")[^>]*>/g)].map(([tag]) => tag.match(/\bhref="([^"]+)"/)?.[1])
  assert.ok(links.includes('/create/film?intent_campaign=nav_door'), 'Films desktop')
  assert.ok(links.includes('/create/film?intent_campaign=studio_simple'), 'Films mobile')
}
console.log('Films desktop/mobile: editor aberto com campanha, cadastro preservado, rollback e demais produtos conferidos.')
