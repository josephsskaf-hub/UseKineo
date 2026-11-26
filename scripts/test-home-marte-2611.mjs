import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { React, loader, renderToStaticMarkup, link } = require('../docs/studio-na-moldura-1011/runtime.cjs')
const m = loader({ 'next/link': link, 'next/navigation': { usePathname: () => '/' } })
const Page = m('components/home/HomeThreeCards').default
for (const signedIn of [false, true]) {
  const markup = renderToStaticMarkup(React.createElement(Page, { signedIn, kidsCard: true, entradaNova: true, focusedShowcase: true }))
  const cards = [...markup.matchAll(/<a\b[^>]*class="k3c-card"[^>]*>[\s\S]*?<\/a>/g)].map(hit => hit[0])
  assert.equal(cards.length, 4)
  assert.match(cards[0], /AI Faceless Videos/)
  assert.match(cards[0], /Type an idea/)
  assert.match(cards[1], /The door on Mars/)
  assert.match(cards[1], /An astronaut hears three knocks/)
  assert.match(cards[1], /src="data:image\/webp;base64,/)
  const inline = cards[1].match(/data:image\/webp;base64,([a-zA-Z0-9+/=]+)/)
  assert.ok(inline)
  assert.ok(markup.indexOf(inline[1], markup.indexOf('home-portas-celular')) > 0, 'compact Mars shortcut paints the same cover')
  assert.equal(Buffer.from(inline[1], 'base64').subarray(8, 12).toString(), 'WEBP')
  assert.equal(fs.readFileSync('public/posters/home-card-mars-door-2611.webp').subarray(8, 12).toString(), 'WEBP')
  assert.equal(cards.slice(2).filter(card => card.includes('data-home-card="kids_cartoon"')).length, 2)
}
console.log('Mars first paint, distinct story, original copy, four cards and guest/member passed.')
