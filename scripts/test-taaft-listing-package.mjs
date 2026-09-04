#!/usr/bin/env node

import assert from 'node:assert/strict'
import fs from 'node:fs'

const read = (file) => fs.readFileSync(file, 'utf8')
const listing = read('docs/TAAFT-LISTING-2026-09-03.md')
const pricing = read('lib/checkoutPricing.ts')
const trial = read('lib/freeTierOffer.ts')
const engines = read('lib/engineLaunch.ts')
const pasteReady = listing.split('## 2. Texto pronto para colar')[1]?.split('## 3. As três capturas')[0] ?? ''
let checks = 0
const check = (value, message) => { assert.ok(value, message); checks += 1 }

check(/starter:\s*\{\s*usd:\s*700\s*\}/.test(pricing), 'canonical Starter price remains $7 USD')
check(/TRIAL_GRANT_CREDITS_COPY\s*=\s*25/.test(trial), 'canonical free grant remains 25 credits')
check(/VIDEO_ENGINE_COUNT_WORD\s*=\s*S25_PUBLIC\s*\?\s*'Nine'\s*:\s*'Eight'/.test(engines), 'public engine count remains eight before S25 launch')

for (const truth of [
  '25 free credits',
  '$7/month in USD',
  'eight video engines',
  'Trial films include a Kineo watermark',
  'credits are returned automatically',
]) {
  check(listing.toLowerCase().includes(truth.toLowerCase()), `listing carries current truth: ${truth}`)
}

for (const stale of ['Five engines', '40 credits', '50 credits', 'from $9.90/mo']) {
  check(!pasteReady.includes(stale), `stale claim is never proposed: ${stale}`)
}

for (const url of [
  'https://www.usekineo.com/?utm_source=taaft&utm_medium=referral',
  'https://www.usekineo.com/studio?engine=seedance&utm_source=taaft&utm_medium=referral',
  'https://www.usekineo.com/history',
]) {
  check(listing.includes(`\`${url}\``), `capture plan includes exact URL: ${url}`)
}

for (const marker of [
  'Name', 'Tagline', 'Short description', 'Long description', 'Pricing field',
  'Precisa estar visível', 'Não clique em Generate', 'não acessou o painel',
  'checkout_success_viewed', 'Gate de parada',
]) {
  check(listing.includes(marker), `package includes ${marker}`)
}

console.log(`PASS — ${checks}/${checks} TAAFT listing-package checks`)
