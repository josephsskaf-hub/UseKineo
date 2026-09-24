// Offline regression: navigation must not flash the retired editor or drop work.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
import { renderPage } from './preview-ux-complete.mjs'
const { hasStudioCreateIntent, studioEntryView } = createOfflineLoader()('@/lib/navigation/studioEntry')
let checks = 0
const eq = (got, want) => { assert.equal(got, want); checks++ }
const base = { hasIntent: false, pendingPrompt: null, restoreResolved: false, resumed: false, phase: 'idle', hasBlockingUi: false }
for (const query of ['', 'src=engine_bento', 'utm_source=email&utm_campaign=welcome', 'prompt=%20']) eq(hasStudioCreateIntent(new URLSearchParams(query)), false)
for (const key of ['prompt','topic','create_intent','studio','autoanalyze','engine','welcome','signup','return','generationId','avatar','resume','wm_unlock','viral_topic','session_id']) {
  const intent = hasStudioCreateIntent(new URLSearchParams({ [key]: '1' }))
  eq(intent, true)
  eq(studioEntryView({ ...base, hasIntent: intent }), 'render')
}
eq(studioEntryView(base), 'loading') // SSR and first hydration paint agree.
eq(studioEntryView({ ...base, pendingPrompt: false }), 'loading')
eq(studioEntryView({ ...base, restoreResolved: true }), 'loading')
eq(studioEntryView({ ...base, restoreResolved: true, pendingPrompt: false }), 'redirect')
eq(studioEntryView({ ...base, restoreResolved: true, pendingPrompt: true }), 'render')
eq(studioEntryView({ ...base, resumed: true }), 'render')
eq(studioEntryView({ ...base, hasBlockingUi: true }), 'render')
for (const phase of ['analyzing','scripting','options','generating','composing','done','failed']) eq(studioEntryView({ ...base, phase }), 'render')
const html = renderPage('app/KineoLanding.tsx', false, {}, { initialUser: { id: 'fixture' } })
eq(html.includes('href="/studio?src=engine_bento"'), true)
eq(html.includes('href="/studio/create?src=engine_bento"'), false)
const source = fs.readFileSync(new URL('../app/(dashboard)/generate/GenerateClient.tsx', import.meta.url), 'utf8')
eq(source.indexOf("if (entryView !== 'render')") < source.indexOf('className={`px-4 sm:px-6 lg:px-10'), true)
eq(source.includes("if (entryView !== 'redirect') return"), true)
eq(source.indexOf('setEntryHasPendingPrompt(Boolean') < source.indexOf("sessionStorage.removeItem('pendingVideoPrompt')"), true)
console.log(`Studio entry: ${checks} regression checks passed; no network or generation.`)
