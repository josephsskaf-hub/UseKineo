#!/usr/bin/env node
// K17 — plan capacity is presented in finished films first, with credits
// secondary. Compiles and executes the exact pricing graph used by the UI.

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const requireFromRepo = createRequire(join(root, 'package.json'))
const ts = requireFromRepo('typescript')
const cache = new Map()
const read = (path) => readFileSync(join(root, path), 'utf8')

function loadTs(path) {
  const normalized = path.replaceAll('\\', '/')
  if (cache.has(normalized)) return cache.get(normalized).exports

  const module = { exports: {} }
  cache.set(normalized, module)
  const output = ts.transpileModule(read(normalized), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: normalized,
  }).outputText

  const localRequire = (id) => {
    if (id.startsWith('@/')) return loadTs(`${id.slice(2)}.ts`)
    return requireFromRepo(id)
  }
  new Function('require', 'module', 'exports', 'process', output)(
    localRequire,
    module,
    module.exports,
    process,
  )
  return module.exports
}

let checks = 0
function equal(actual, expected, label) {
  assert.deepEqual(actual, expected, label)
  checks += 1
}
function ok(value, label) {
  assert.ok(value, label)
  checks += 1
}
function throws(run, label) {
  assert.throws(run, label)
  checks += 1
}

const language = loadTs('lib/growth/planFilmLanguage.ts')
const pricing = loadTs('lib/checkoutPricing.ts')
const marketing = loadTs('lib/marketingPrice.ts')
const welcome = read('components/WelcomeOfferModal.tsx')
const exit = read('components/ExitIntentOffer.tsx')

equal(language.PLAN_FILM_LANGUAGE_VERSION, 'plan_film_language_v1', 'measurement version is stable')
equal(language.planFilmLanguageMetadata(), {
  capacity_unit_version: 'plan_film_language_v1',
}, 'metadata is categorical and allow-listed')

const starterFilms = marketing.videosPerMonth('starter', 'fast')
const creatorFilms = marketing.videosPerMonth('basic', 'cinematic_ai')
const studioFilms = marketing.videosPerMonth('pro', 'cinematic_ai')
equal(starterFilms, 8, 'current Starter grant buys eight paid Kineo 1 films')
equal(creatorFilms, 3, 'current Creator grant buys three Seedance films')
equal(studioFilms, 7, 'current Studio grant buys seven Seedance films')

equal(
  language.formatPlanFilmCapacity(starterFilms, 'Kineo 1 film', pricing.TIER_CREDITS.starter),
  '8 Kineo 1 films / month · 40 credits',
  'Starter label puts finished films before credits',
)
equal(
  language.formatPlanFilmCapacity(creatorFilms, 'Seedance film', pricing.TIER_CREDITS.basic),
  '3 Seedance films / month · 90 credits',
  'Creator label puts finished films before credits',
)
equal(
  language.formatPlanFilmCapacity(studioFilms, 'Seedance film', pricing.TIER_CREDITS.pro),
  '7 Seedance films / month · 180 credits',
  'Studio label puts finished films before credits',
)
equal(
  language.formatPlanFilmCapacity(1, 'Seedance film', 25),
  '1 Seedance film / month · 25 credits',
  'singular grammar is safe',
)
throws(() => language.formatPlanFilmCapacity(-1, 'film', 40), 'negative film count is rejected')
throws(() => language.formatPlanFilmCapacity(1.5, 'film', 40), 'fractional film count is rejected')
throws(() => language.formatPlanFilmCapacity(1, 'film', -1), 'negative credit count is rejected')

for (const [source, label] of [[welcome, 'welcome'], [exit, 'exit intent']]) {
  ok(source.includes("from '@/lib/growth/planFilmLanguage'"), `${label} uses the shared language contract`)
  ok(source.includes('...planFilmLanguageMetadata()'), `${label} events identify the copy version`)
  ok(source.includes('formatPlanFilmCapacity('), `${label} renders the shared film-first label`)
}
ok(welcome.includes("videosPerMonth('basic', 'cinematic_ai')"), 'welcome Creator count comes from canonical engine cost')
ok(welcome.includes("videosPerMonth('pro', 'cinematic_ai')"), 'welcome Studio count comes from canonical engine cost')
ok(exit.includes("videosPerMonth('starter', 'fast')"), 'exit Starter count comes from canonical engine cost')
ok(exit.includes("videosPerMonth('basic', 'cinematic_ai')"), 'exit Creator count comes from canonical engine cost')
ok(welcome.includes('TIER_CREDITS.basic') && welcome.includes('TIER_CREDITS.pro'), 'welcome credit details remain canonical')
ok(exit.includes('TIER_CREDITS.starter') && exit.includes('TIER_CREDITS.basic'), 'exit credit details remain canonical')
ok(!welcome.includes('credits: `${TIER_CREDITS'), 'welcome no longer leads plan cards with raw credits')
ok(!exit.includes('{TIER_CREDITS.starter} credits/mo'), 'exit Starter no longer leads with raw credits')
ok(!exit.includes('{TIER_CREDITS.basic} credits/mo'), 'exit Creator no longer leads with raw credits')
ok(exit.includes('A monthly balance for finished films.'), 'exit-intent framing names the customer outcome')
ok(exit.indexOf('formatPlanFilmCapacity(') < exit.indexOf("exitPrice('starter')"), 'capacity is visible before the Starter price CTA')
ok(welcome.includes('promo=WELCOME20&checkout_origin=welcome20_modal'), 'welcome checkout destination is unchanged')
ok(exit.includes('/api/stripe/checkout?tier=starter&intro=1'), 'exit Starter checkout destination is unchanged')
ok(exit.includes('/api/stripe/checkout?tier=basic&intro=1'), 'exit Creator checkout destination is unchanged')

console.log(`Plan film language: ${checks}/${checks} checks passed`)
