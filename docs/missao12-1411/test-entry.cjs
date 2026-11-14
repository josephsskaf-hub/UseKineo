// Offline: real routing/access modules with a session fixture and inert UI.
// No Supabase, files uploaded, provider, auth navigation or network.
const assert = require('node:assert/strict')
const { loader, read } = require('../recreate-0911/test-recreate.cjs')

async function suite(extra = {}) {
  let user = null
  let checks = 0
  const ok = (value, message) => { assert.ok(value, message); checks++ }
  const noPage = async request => { await assert.rejects(request, /not-found/); checks++ }
  const stubs = {
    '@/lib/recreate/server': { recreateSession: async () => ({ user }) },
    '@/lib/recreate/seuVideoPresentation': { seuVideoPresentation: () => ({ audio: 'silent', resolution: '720p' }) },
    'next/navigation': { notFound() { throw Error('not-found') }, redirect(href) { throw Error('redirect:' + href) } },
    'app/recreate/RecreateClient': { __esModule: true, default: function Catalog() {} },
    'app/recreate-preview/SeuVideoRecreateClient': { __esModule: true, default: function OwnVideo() {} },
    'app/recreate/RecreateCatalogPublic': { __esModule: true, default: function CatalogList() {} },
  }
  const baseline = loader(stubs, extra)
  // reancorado KINEO-RECREATE-MOVIMENTO-1411 [CEO 14/11 08:45: "reancore ou tire, é resto da Missão 12"] — o interruptor foi LIGADO ao público em 14/11 06:36
  // (15f3f6b4d); o estado ligado de verdade é provado por scripts/test-recreate-flow-guardas-1411.mjs. Aqui: ligado, e o resto da entrada como antes.
  ok(baseline('lib/recreate/flowRelease').RECREATE_FLOW_ENABLED === true, 'Public switch is on since owner approval (14/11 06:36)')
  const Tabs = baseline('components/create/CreateTabs').default
  const normalTabs = Tabs({ active: 'recreate' }).props.children.map(link => [link.props['data-create-tab'], link.props.href])
  const previewTabs = Tabs({ active: 'recreate', recreateHref: '/recreate-flow-preview' }).props.children.map(link => [link.props['data-create-tab'], link.props.href])
  ok(normalTabs.find(([id]) => id === 'recreate')[1] === '/recreate', 'Normal creation navigation stays unchanged')
  assert.deepEqual(previewTabs, normalTabs.map(([id, href]) => [id, id === 'recreate' ? '/recreate-flow-preview' : href])); checks++
  const oldPage = baseline('app/recreate/[id]/page').default
  // reancorado KINEO-RECREATE-MOVIMENTO-1411 — com o fluxo ligado, o visitante abre o molde aprovado no fluxo (antes: redirect para o cadastro)
  const flowPage = await oldPage({ params: { id: 'passarela' } })
  ok(flowPage.props.currentFlow === true && flowPage.props.signedIn === false && flowPage.props.flowBasePath === '/recreate', 'Guest opens the approved template in the live flow')
  await noPage(oldPage({ params: { id: 'outfit-morph' } })) // a troca em teste nunca abre ao visitante
  await noPage(baseline('app/recreate/your-video/page').default({}))
  // reancorado KINEO-RECREATE-MOVIMENTO-1411 — com o fluxo ligado, /recreate é o fluxo (a grade pública vem de publicRecreateCatalog, conferida abaixo)
  const oldIndex = await baseline('app/recreate/page').default()
  ok(oldIndex.props.currentFlow === true && oldIndex.props.signedIn === false, 'Public /recreate is the live flow')
  const publicIds = baseline('lib/recreate/catalogPublic').publicRecreateCatalog().map(item => item.id)
  ok(publicIds.length > 0 && !publicIds.includes('outfit-morph'), 'Public catalog lists approved templates only')
  const preview = baseline('app/recreate-flow-preview/[id]/page').default
  const model = await preview({ params: { id: 'passarela' }, searchParams: { draft: 'opaque-local-reference' } })
  ok(model.props.currentFlow === true && model.props.signedIn === false && model.props.flowBasePath === '/recreate-flow-preview', 'Guest opens proposal before signup')
  ok(model.props.draftRef === 'opaque-local-reference' && model.props.accountKey === null, 'Only opaque draft reference passes to guest')
  assert.deepEqual([...model.props.formatIds].sort(), [...publicIds].sort()); checks++
  ok(model.props.guestQuotes.length === publicIds.length && model.props.guestQuotes.every(quote => publicIds.includes(quote.id) && (quote.credits === null || Number.isFinite(quote.credits))), 'Public tariff is supplied by the server only for visible templates')
  for (const id of ['outfit-morph', 'elevador', 'duelo-de-danca', 'missing', '..', 'https://other.example/']) await noPage(preview({ params: { id } }))
  const ownGuest = await preview({ params: { id: 'your-video' } })
  ok(ownGuest.props.signedIn === false && ownGuest.props.generationAllowed === false, 'Guest may prepare own video but cannot generate without account')
  ok(ownGuest.props.presentation.audio === 'silent', 'Server presentation reaches own-video UI')
  user = { id: 'external-fixture', email: 'customer@example.org' }
  await noPage(preview({ params: { id: 'outfit-morph' } }))
  const customer = await preview({ params: { id: 'passarela' } })
  ok(customer.props.signedIn && customer.props.accountKey === user.id && !customer.props.internalTools, 'External account keeps normal privileges')
  ok(customer.props.guestQuotes === undefined, 'Signed-in balance and availability must come from authenticated API')
  ok((await preview({ params: { id: 'your-video' } })).props.generationAllowed === false, 'Preview route does not open internal own-video engine to customers')
  user = { id: 'house-fixture', email: 'josephsskaf@gmail.com' }
  ok((await preview({ params: { id: 'outfit-morph' } })).props.internalTools, 'Exact house allowlist can still review test templates')
  ok((await preview({ params: { id: 'your-video' } })).props.generationAllowed, 'House access follows existing release')
  user = null
  const closed = loader(stubs, { ...extra, 'lib/recreate/flowRelease.ts': read('lib/recreate/flowRelease.ts').replace('RECREATE_FLOW_PREVIEW_ENABLED = true', 'RECREATE_FLOW_PREVIEW_ENABLED = false') })
  await noPage(closed('app/recreate-flow-preview/page').default())
  await noPage(closed('app/recreate-flow-preview/[id]/page').default({ params: { id: 'passarela' } }))
  const enabled = loader(stubs, { ...extra, 'lib/recreate/flowRelease.ts': read('lib/recreate/flowRelease.ts').replace('RECREATE_FLOW_ENABLED = false', 'RECREATE_FLOW_ENABLED = true') })
  const enabledProps = (await enabled('app/recreate/[id]/page').default({ params: { id: 'passarela' } })).props
  ok(enabledProps.currentFlow && !enabledProps.signedIn && enabledProps.flowBasePath === '/recreate', 'Future approval changes only flow on regular route')
  await noPage(enabled('app/recreate/[id]/page').default({ params: { id: 'outfit-morph' } }))
  ok(enabled('lib/recreate/entry').recreateEntryHref('passarela', false) === '/recreate/passarela', 'Approved template reaches editor before account only when enabled')
  ok(enabled('lib/recreate/entry').recreateEntryHref('outfit-morph', false).startsWith('/signup?'), 'Unapproved template never gains public editor entry')
  ok(enabled('lib/recreate/entry').recreateEntryHref('missing', false) === null, 'Unknown template has no entry')
  const enabledCatalog = enabled('lib/recreate/catalogPublic').publicRecreateCatalog()
  assert.deepEqual(enabledCatalog.map(item => item.id), publicIds); checks++
  ok(enabledCatalog.every(item => item.href === '/recreate/' + item.id), 'Same public cards, only Generate owns signup after approval')
  return checks
}

async function main() {
  const checks = await suite()
  const mutations = [
    ['public deactivation', 'lib/recreate/flowRelease.ts', 'RECREATE_FLOW_ENABLED = true', 'RECREATE_FLOW_ENABLED = false'], // reancorado KINEO-RECREATE-MOVIMENTO-1411 (o interruptor está ligado)
    ['template access', 'app/recreate/RecreateFlowPage.tsx', '!publicRecreatePath(id)', 'false'],
    ['own-video access', 'app/recreate/RecreateFlowPage.tsx', '!!user && releaseVisible(user.email, SEU_VIDEO_RELEASE)', 'true'],
  ]
  for (const [name, path, from, to] of mutations) {
    const source = read(path)
    assert.ok(source.includes(from), 'mutation anchor: ' + name)
    await assert.rejects(suite({ [path]: source.replace(from, to) }), undefined, 'mutation must fail: ' + name)
  }
  console.log(`PASS M12 entry: ${checks} checks; ${mutations.length} access mutations rejected; offline only`)
}
main().catch(error => { console.error(error); process.exitCode = 1 })
