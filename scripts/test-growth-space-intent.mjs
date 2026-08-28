import assert from 'node:assert/strict'
import fs from 'node:fs'
import { toolActivationHref } from '../lib/toolActivationHref.ts'

const page = fs.readFileSync('app/scripts/[vertical]/page.tsx', 'utf8')
const helper = fs.readFileSync('lib/toolActivationHref.ts', 'utf8')
const sitemap = fs.readFileSync('app/sitemap.ts', 'utf8')
const preview = fs.readFileSync('docs/previews/space-intent-2026-08-28.html', 'utf8')

let checks = 0
function check(value, message) {
  assert.ok(value, message)
  checks += 1
}

// The opportunity is not invented: the source records the exact production
// query, window, impressions and position that justified this narrow change.
check(page.includes('youtube shorts exoplanet life script 40 seconds'), 'exact Search Console query is recorded')
check(page.includes('44 vezes'), '44-impression evidence is recorded')
check(page.includes('posição média 5,5'), 'average-position evidence is recorded')
check(page.includes('40-Second Exoplanet Life Script (Free) | Kineo'), 'metadata answers the query directly')
check(page.includes('YouTube Shorts exoplanet life script (about 40 seconds)'), 'visible answer uses the searched language')

// Extract the actual constant so duration copy cannot drift away from the
// script visitors receive.
const scriptMatch = page.match(/const SPACE_EXOPLANET_SCRIPT = `([\s\S]*?)`\nconst SPACE_EXOPLANET_SPOKEN_WORDS/)
check(scriptMatch, 'exact script constant is extractable')
const exactScript = scriptMatch[1]
const narration = exactScript.replace(/^(?:HOOK|MICRO REWARD|ESCALATION|PAYOFF):\s*/gm, '')
const words = narration.trim().split(/\s+/)
check(words.length === 90, `script contains exactly 90 spoken words (found ${words.length})`)
for (const marker of ['HOOK:', 'MICRO REWARD:', 'ESCALATION:', 'PAYOFF:']) {
  check(exactScript.includes(marker), `${marker} is present`)
}
check(page.includes('CopyButton text={SPACE_EXOPLANET_SCRIPT}'), 'visitor can copy the answer')
check(page.includes('source={SPACE_EXOPLANET_CAMPAIGN}'), 'conversion click has a dedicated source')
check(page.includes('placement="exact_answer"'), 'conversion click has a dedicated placement')
check(page.includes('science.nasa.gov/exoplanets/can-we-find-life/'), 'biosignature claim cites NASA')
check(page.includes('what-would-earths-atmosphere-look-like-from-the-james-webb-space-telescope'), 'spectroscopy claim cites NASA')
check(page.includes("if (!customerLibraryEnabled && !isStaticSpaceAnswer) redirect('/scripts')"), 'privacy redirect exempts only the static space answer')
check(page.includes('const lib = customerLibraryEnabled ? await getScriptLibrary() : null'), 'static answer cannot invoke the customer-library loader')
check(page.includes("'@type': 'CreativeWork'"), 'static answer has matching CreativeWork data')
check(page.includes("robots: isStaticSpaceAnswer || count >= MIN_SCRIPTS_TO_INDEX ? undefined"), 'static answer remains indexable without customer rows')
check(sitemap.includes("CUSTOMER_VIDEO_PUBLIC_SURFACE_ENABLED ? SCRIPT_VERTICAL_SLUGS : ['space']"), 'sitemap keeps only the safe static shelf during lockdown')
check(!page.includes("if (!CUSTOMER_VIDEO_PUBLIC_SURFACE_ENABLED) redirect('/scripts')"), 'blanket redirect cannot hide the static answer')

// Runtime contract: the exact multi-line script survives signup, opens in
// verbatim mode and selects the nearest supported duration. It must never add
// create_intent, because this page may not start a credit-consuming render.
const href = toolActivationHref({
  prompt: exactScript,
  campaign: 'script_library_space_exoplanet_40s',
  scriptMode: 'verbatim',
  duration: 45,
})
const outer = new URL(href, 'https://www.usekineo.com')
const redirect = outer.searchParams.get('redirect')
check(Boolean(redirect), 'signup carries an internal redirect')
const destination = new URL(redirect, 'https://www.usekineo.com')
check(destination.pathname === '/generate', 'handoff lands in the generator')
check(destination.searchParams.get('prompt') === exactScript, 'exact script and line breaks survive the handoff')
check(destination.searchParams.get('script_mode') === 'verbatim', 'finished script cannot be silently rewritten')
check(destination.searchParams.get('duration') === '45', 'nearest supported duration is carried')
check(destination.searchParams.get('autoanalyze') === '1', 'draft is analyzed on arrival')
check(!outer.searchParams.has('create_intent'), 'signup does not auto-start a render')
check(!destination.searchParams.has('create_intent'), 'generator redirect does not auto-start a render')

// Existing simple callers retain their old one-line behavior and receive no
// new creation fields unless they explicitly request them.
const oldHref = toolActivationHref({ prompt: 'one\nidea', campaign: 'legacy_tool' })
const oldOuter = new URL(oldHref, 'https://www.usekineo.com')
const oldDestination = new URL(oldOuter.searchParams.get('redirect'), 'https://www.usekineo.com')
check(oldDestination.searchParams.get('prompt') === 'one idea', 'legacy prompts still collapse whitespace')
check(!oldDestination.searchParams.has('script_mode'), 'legacy callers do not inherit script mode')
check(!oldDestination.searchParams.has('duration'), 'legacy callers do not inherit duration')
check(helper.includes("scriptMode === 'verbatim'"), 'newline-preservation branch is explicit')

// Visual delivery includes the mandatory before/after comparison for both
// viewport classes touched by the responsive layout.
for (const label of ['Before · desktop', 'After · desktop', 'Before · mobile 390px', 'After · mobile 390px']) {
  check(preview.includes(label), `preview includes ${label}`)
}

console.log(`growth-space-intent: ${checks}/${checks} checks passed`)
