#!/usr/bin/env node
// Guardião KINEO-VISIBILIDADE-CHATGPT-2026-10-06 — páginas citáveis da rodada 1 e a separação de marca da kineo.studio.
// Roda sem rede e sem .env: lê só o repositório.
import assert from 'node:assert/strict'
import fs from 'node:fs'

let checks = 0
const ok = (v, m) => { assert.ok(v, m); checks++ }
const read = (p) => fs.readFileSync(p, 'utf8')

const pages = {
  oneplace: 'app/seedance-kling-veo-in-one-place/page.tsx',
  faceless: 'app/faceless-youtube-shorts-generator/page.tsx',
  brand: 'app/kineo-vs-kineo-studio/page.tsx',
}
const hub = read('lib/seo/citableHubPages.ts')
const shell = read('components/CitableHubShell.tsx')

for (const [key, file] of Object.entries(pages)) {
  const src = read(file)
  ok(src.includes('KINEO-VISIBILIDADE-CHATGPT-2026-10-06'), `${key}: carries the change mark`)
  ok(src.includes("export const dynamic = 'force-static'"), `${key}: static HTML (what OAI-SearchBot and Bing read)`)
  ok(src.includes('alternates: { canonical:'), `${key}: self-canonical`)
  // Preço da Kineo nunca digitado: nenhum "$12.90", "$29.90", "$54.90" literal nas páginas.
  ok(!/\$(12|29|54)\.90/.test(src), `${key}: no Kineo price literal`)
  ok(src.includes('<CitableHubShell'), `${key}: visible FAQ + matching FAQPage JSON-LD via the shared shell`)
}
ok(read(pages.oneplace).includes('BRAND_WITH_DOMAIN') && read(pages.faceless).includes('BRAND_WITH_DOMAIN'), 'titles carry "Kineo (usekineo.com)"')
ok(read(pages.brand).includes("title: { absolute: TITLE }") && read(pages.brand).includes('Kineo (usekineo.com) vs Kineo Studio (kineo.studio)'), 'brand page title names both domains')

// Honestidade: a página "one place" não pode afirmar que a Kineo é mais barata que ir direto por clipe cru.
ok(read(pages.oneplace).includes('For raw clips, usually not.'), 'one-place FAQ admits raw clips are cheaper direct')
ok(!read(pages.oneplace).includes('cheapestDirect('), 'one-place does not use the Runway-Standard-only comparison')

// Fatos de terceiros sempre com URL e data.
for (const k of ['INVIDEO_FACTS', 'KENERATE_FACTS', 'KINEO_STUDIO_FACTS']) {
  const block = hub.slice(hub.indexOf(`export const ${k}`), hub.indexOf('} as const', hub.indexOf(`export const ${k}`)))
  ok(/url: 'https:\/\//.test(block) && block.includes('checkedOn:'), `${k}: official URL and read date`)
}
ok(shell.includes('faqJsonLd(faqs)') && shell.includes('{faqs.map('), 'FAQ JSON-LD mirrors the visible FAQ')

// Superfícies: sitemap, llms.txt, rodapé.
ok(read('app/sitemap.ts').includes('...Object.values(HUB_PAGES).map('), 'sitemap lists every hub page')
const llms = read('app/llms.txt/route.ts')
ok(llms.includes('# Kineo (usekineo.com)'), 'llms.txt H1 carries the domain')
ok(llms.includes('Not the same company as Kineo Studio (kineo.studio)'), 'llms.txt disambiguates kineo.studio')
ok(llms.includes('Object.values(HUB_PAGES)'), 'llms.txt links the hub pages')
const footer = read('components/Footer.tsx')
for (const p of ['/faceless-youtube-shorts-generator', '/seedance-kling-veo-in-one-place', '/kineo-vs-kineo-studio']) ok(footer.includes(`href: '${p}'`), `footer links ${p}`)

// Entidade: disambiguatingDescription no schema global e na home.
const brand = read('lib/brandIdentity.ts')
ok(brand.includes("'Kineo (usekineo.com)'"), 'alias with the domain')
ok(brand.includes('It is not affiliated with Kineo Studio (kineo.studio)'), 'disambiguation sentence')
ok((read('components/StructuredData.tsx').match(/disambiguatingDescription: BRAND_DISAMBIGUATION/g) ?? []).length === 2, 'global Organization + SoftwareApplication disambiguate')
ok(read('app/page.tsx').includes('disambiguatingDescription: BRAND_DISAMBIGUATION'), 'home Organization disambiguates')

// A tag interna [CONFIRMAR] não sai crua na tabela de comparação.
const cmp = read('components/CitationComparisonDecision.tsx')
ok(cmp.includes("const UNCONFIRMED_LABEL = 'Not confirmed'") && cmp.includes('{UNCONFIRMED_LABEL}</span>'), 'comparison renders "Not confirmed"')
ok(!cmp.includes('<span className="kc-unknown">[CONFIRMAR]</span>'), 'Kineo row no longer shows its own duration as unconfirmed')

console.log(`visibilidade-chatgpt-2026-10-06: ${checks}/${checks} checks passed`)
