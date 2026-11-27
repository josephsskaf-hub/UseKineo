import assert from 'node:assert/strict'
import { offlineModules, React, renderToStaticMarkup, source } from './gpt24h-offline-support.mjs'

const component = 'components/ugc/UgcCtaLink.tsx'
const catalog = 'lib/seo/paginasUgc2010.ts'
const flag = 'lib/create/publicEditorRelease.ts'
const mocks = {
  'lib/analytics.ts': { trackEvent() {} },
  'components/ads/useAdsEligibility.ts': { useAdsEligibility: () => null },
  'components/InterfaceLanguage.tsx': { useInterfaceLanguage: () => 'en' },
  'lib/supabase/client.ts': { createClient() { throw Error('SSR cannot call auth') } },
}
function substitute(text, from, to) {
  assert.equal(text.split(from).length, 2, 'unique fixture or mutant')
  return text.replace(from, to)
}
function render(open, session, campaign, changes = {}) {
  const original = changes[component] ?? source(component)
  const replacements = {
    ...changes,
    [component]: session ? substitute(original, 'useState(false)', 'useState(true)') : original,
    [flag]: 'export const PUBLIC_CREATE_EDITORS = ' + open,
  }
  const load = offlineModules({ mocks, replacements })
  const html = renderToStaticMarkup(React.createElement(load(component).default,
    { campaign, placement: 'hero' }, 'Make my first UGC ad free →'))
  assert.ok(html.includes('Make my first UGC ad free →'), 'existing CTA copy')
  const href = /href="([^"]+)"/.exec(html)?.[1].replaceAll('&amp;', '&')
  assert.ok(href, 'rendered href')
  return new URL(href, 'https://www.usekineo.com')
}
function verify(changes = {}) {
  for (const signedIn of [false, true]) {
    for (const campaign of ['ugc_pillar','ugc_pillar_pt','ugc_generator','ugc_beauty_skincare']) {
      const next = render(true, signedIn, campaign, changes)
      assert.equal(next.pathname, '/create/ads', 'public UGC editor')
      assert.deepEqual([...next.searchParams], [['entry','ugc'],['utm_source','seo'],['utm_medium','ugc_pages'],['utm_campaign',campaign]], 'exact editorial UGC intent and attribution')
    }
    const off = render(false, signedIn, 'ugc_pillar', changes)
    assert.equal(off.pathname, signedIn ? '/create/film' : '/studio', 'rollback restores the old focused Film destination')
    assert.equal(off.searchParams.get('utm_campaign'), 'ugc_pillar', 'rollback attribution')
  }
}
verify()
const omitGate = substitute(source(component), " && !adHref.startsWith('/create/ads?')", '')
assert.throws(() => verify({[component]:omitGate}), /public UGC editor/, 'former Film link must fail with editor ON')
const wrongRole = substitute(source(catalog), '/ads/v2?entry=ugc&utm_source=seo', '/ads/v2?entry=product&utm_source=seo')
assert.throws(() => verify({[catalog]:wrongRole}), /exact editorial UGC intent and attribution/, 'wrong ad entry must fail')
const lostCampaign = substitute(source(catalog), '/ads/v2?entry=ugc&utm_source=seo', '/ads/v2?entry=ugc&utm_source=elsewhere')
assert.throws(() => verify({[catalog]:lostCampaign}), /exact editorial UGC intent and attribution/, 'changed source must fail')
const dropRollback = substitute(source(component), 'FOCUSED_PRODUCT_NAV_2511 && campaign ===', 'false && campaign ===')
assert.throws(() => verify({[component]:dropRollback}), /rollback restores/, 'old OFF contract must survive')
console.log('PASS four UGC campaigns × two session states; two rollback paths; four targeted mutants')
