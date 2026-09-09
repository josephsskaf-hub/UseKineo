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

check(/starter:\s*\{\s*usd:\s*990\s*\}/.test(pricing), 'canonical Starter price is $9.90 USD (V5, restauração de 09/09)')
check(/CARD_ENTRY_ONLY\s*=\s*false/.test(read('lib/entryPolicy.ts')), 'restauração 09/09: a entrada é grátis (30 créditos), o $1 morreu')
check(/VIDEO_ENGINE_COUNT_WORD\s*=\s*S25_PUBLIC\s*\?\s*'Nine'\s*:\s*'Eight'/.test(engines), 'public engine count remains eight before S25 launch')

for (const truth of [
  '$1 trial',
  '$9/month in USD',
  'no free tier',
  'eight video engines',
  'credits are returned automatically',
]) {
  check(listing.toLowerCase().includes(truth.toLowerCase()), `listing carries current truth: ${truth}`)
}

for (const stale of ['Five engines', '40 credits', '50 credits', '25 free credits', 'from $14/month', '$7/month', '$1 trial', '80 credits']) {
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
