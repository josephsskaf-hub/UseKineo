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
  assert.match(cards[2], /AI Cartoon Videos/)
  assert.match(cards[2], /3D kids cartoon stories with the same character, ready to post\./)
  assert.match(cards[2], /home-card-novo-werewolf_pup/)
  assert.match(cards[3], /The pumpkin in the pointed hat/)
  assert.match(cards[3], /A little pumpkin hops down a lantern-lit lane and waves hello\./)
  assert.match(cards[3], /home-card-cartoon-scene-0811/)
  assert.doesNotMatch(cards[3], /AI Cartoon Videos|3D kids cartoon stories/)
  assert.equal(cards.slice(2).filter(card => card.includes('data-home-card="kids_cartoon"')).length, 2)
}
const titles = new Set()
const subtitles = new Set()
const languages = m('lib/ui/interfaceLanguage').INTERFACE_LANGUAGE_OPTIONS
let language
const localized = loader({
  'next/link': link,
  'next/navigation': { usePathname: () => '/' },
  '@/components/InterfaceLanguage': {
    useUiCopy: () => s => s, useInterfaceLanguage: () => language, UiLabel: ({ children }) => children,
  },
})('components/home/HomeThreeCards').default
for (const { code } of languages) {
  language = code
  for (const signedIn of [false, true]) {
    const html = renderToStaticMarkup(React.createElement(localized, { signedIn, kidsCard: true, entradaNova: true, focusedShowcase: true }))
    const cards = [...html.matchAll(/<a\b[^>]*class="k3c-card"[^>]*>[\s\S]*?<\/a>/g)].map(hit => hit[0])
    assert.equal(cards.length, 4)
    assert.match(cards[3], /href="\/create\/cartoon\?[^"]*utm_source=/)
    const title = cards[3].match(/<h2 class="k3c-title">([^<]+)<\/h2>/)?.[1]
    const subtitle = cards[3].match(/<p class="k3c-sub">([^<]+)<\/p>/)?.[1]
    assert.ok(title && subtitle, code)
    if (signedIn) {
      assert.ok(titles.has(title) && subtitles.has(subtitle), code)
    } else {
      assert.ok(!titles.has(title) && !subtitles.has(subtitle), code + ' reused another language')
      titles.add(title)
      subtitles.add(subtitle)
    }
  }
}
console.log('Four cards, Mars first paint and localized pumpkin story in both sessions passed for ' + languages.length + ' languages.')
