#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import ts from 'typescript'

const root = process.cwd()
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')
let checks = 0
const check = (value, message) => { assert.ok(value, message); checks++ }
const equal = (actual, expected, message) => { assert.equal(actual, expected, message); checks++ }

function executeTs(file) {
  const compiled = ts.transpileModule(read(file), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText
  const moduleBox = { exports: {} }
  vm.runInNewContext(compiled, {
    module: moduleBox,
    exports: moduleBox.exports,
    require: (id) => { throw new Error(`unmocked import ${id}`) },
  }, { filename: file })
  return moduleBox.exports
}

const policy = executeTs('lib/growth/affiliateBusinessRecruitment.ts')
const metadata = policy.affiliateBusinessRecruitmentMetadata()

equal(policy.AFFILIATE_BUSINESS_RECRUITMENT_VERSION, 'affiliate_business_recruitment_v1', 'experiment has an immutable version')
equal(policy.AFFILIATE_BUSINESS_RECRUITMENT_VISIBLE_RATIO, 0.6, 'view requires sixty percent visibility')
equal(policy.AFFILIATE_BUSINESS_RECRUITMENT_HOST, 'www.usekineo.com', 'measurement host is canonical production')
equal(policy.isAffiliateBusinessRecruitmentMeasurementHost('www.usekineo.com'), true, 'canonical production is measurable')
equal(policy.isAffiliateBusinessRecruitmentMeasurementHost(' WWW.USEKINEO.COM '), true, 'canonical host normalizes case and whitespace')
for (const host of ['usekineo.com', 'localhost', '127.0.0.1', 'kineo-preview.vercel.app', 'www.usekineo.com.evil.example', null]) {
  equal(policy.isAffiliateBusinessRecruitmentMeasurementHost(host), false, `non-production host is not measurable: ${host}`)
}
equal(metadata.surface, 'partners', 'measurement is scoped to the recruiting page')
equal(metadata.placement, 'business_campaign', 'placement is categorical')
equal(metadata.audience, 'business', 'audience is categorical')
equal(metadata.destination, 'affiliate_apply', 'destination is categorical and contains no free URL')
equal(Object.keys(metadata).length, 5, 'metadata contains only the five allow-listed fields')
check(!JSON.stringify(metadata).includes('utm_'), 'metadata does not duplicate or overwrite acquisition attribution')

const component = read('components/AffiliateBusinessRecruitmentCard.tsx')
check(component.startsWith("'use client'"), 'interactive telemetry stays behind a client boundary')
check(component.includes('IntersectionObserver'), 'view is based on real viewport exposure')
check(component.includes('intersectionRatio < AFFILIATE_BUSINESS_RECRUITMENT_VISIBLE_RATIO'), 'observer enforces the policy-owned threshold')
check(component.includes("'affiliate_business_recruitment_viewed'"), 'view event is explicit')
check(component.includes("'affiliate_business_recruitment_clicked'"), 'click event is explicit')
check(component.includes("trackEvent('organic_cta_clicked'"), 'new CTA remains visible to the existing organic funnel')
check(component.includes("destination: '/affiliate'"), 'generic event records a categorical first-party destination')
check(component.includes('sessionStorage.setItem(marker'), 'successful events dedupe for the browser session')
check(component.includes('if (!stored) return false'), 'failed writes do not poison the dedupe gate')
check(component.includes('isAffiliateBusinessRecruitmentMeasurementHost(window.location.hostname)'), 'preview and local traffic cannot enter the production gate')
check(component.includes('Businesses &amp; freelancers'), 'card names the missing audience')
check(component.includes('free weekly content plan'), 'card describes the already implemented B2B utility')
check(component.includes('Apply and get the business campaign'), 'card offers the existing application flow')
check(!component.includes('40%') && !component.includes('$'), 'new component invents no price or commission promise')

const partners = read('app/partners/page.tsx')
check(partners.includes("import AffiliateBusinessRecruitmentCard from '@/components/AffiliateBusinessRecruitmentCard'"), 'real public page imports the card')
check(partners.includes('<AffiliateBusinessRecruitmentCard href={APPLY} />'), 'real public page passes the existing apply route')
check(partners.includes("minmax(min(100%, 260px), 1fr)"), 'four campaigns form a balanced two-column desktop grid and stack on narrow screens')
for (const existing of ['Script-first audience', 'Ready to test video', 'Faceless creators']) {
  check(partners.includes(existing), `existing campaign remains intact: ${existing}`)
}
check(partners.includes("const APPLY = '/affiliate?utm_source=partners"), 'application path preserves its existing campaign')

const dashboard = read('app/(dashboard)/affiliate/page.tsx')
check(dashboard.includes('AFFILIATE_DESTINATIONS.map'), 'dashboard continues to use the frozen destination kit')
const destinations = read('lib/affiliateDestinations.ts')
check(destinations.includes("key: 'business'"), 'the already implemented business destination still exists')
check(destinations.includes("path: '/business-video-content-plan'"), 'business destination remains the existing planner')

const preview = read('docs/previews/AFFILIATE-BUSINESS-RECRUITMENT-V1-2026-09-01.html')
for (const label of ['BEFORE · DESKTOP', 'AFTER · DESKTOP', 'BEFORE · MOBILE', 'AFTER · MOBILE']) {
  check(preview.includes(label), `preview includes ${label}`)
}
check(preview.includes('15 anonymous sessions'), 'preview carries the dated production reach evidence')
check(preview.includes('0 business destination copies'), 'preview states the measured gap')
check(!/https?:\/\//i.test(preview), 'preview has no external dependency')

console.log(`PASS — ${checks}/${checks} affiliate business recruitment checks`)
