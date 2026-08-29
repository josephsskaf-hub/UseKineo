// KINEO-POSTVIDEO-SINGLE-PRIMARY-2026-08-27
// Deterministic source-contract test. No network, credentials or production writes.

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const clientPath = join(root, 'app', '(dashboard)', 'generate', 'GenerateClient.tsx')
const source = readFileSync(clientPath, 'utf8')

let total = 0
let failed = 0

function check(name, condition) {
  total += 1
  if (condition) return
  failed += 1
  console.error(`FAIL ${name}`)
}

// KINEO-TRIAL-BALANCE-BRIDGE-2026-08-29 — the original subscription card now
// owns the explicit non-bridge branch. Keep this suite scoped to that card;
// the bridge has its own executable policy and source-contract suite.
const cardStart = source.indexOf('{showTrialPostVideoOffer && !trialBalanceBridge.eligible && (')
const cardEnd = source.indexOf('{/* Keep the revenue/export decision first.', cardStart)
const card = cardStart >= 0 && cardEnd > cardStart ? source.slice(cardStart, cardEnd) : ''
const downloadStart = source.indexOf('Download clean Short')
const detailsStart = card.indexOf('<details')
const detailsEnd = card.indexOf('</details>')
const primaryLaunch = card.indexOf('const started = trialPostVideoCheckout.launch(')
const primaryArea = card.slice(0, detailsStart)
const detailsArea = card.slice(detailsStart, detailsEnd)
const impressionStart = source.indexOf("trackEvent('trial_post_video_offer_viewed'")
const impressionArea = source.slice(impressionStart, impressionStart + 3400)

console.log('\nKINEO — trial post-video single-primary contract\n')

check('trial offer card is found', card.length > 0)
check('deliver-first remains true', downloadStart >= 0 && downloadStart < cardStart)
// KINEO-CHATGPT-STARTER-FIRST-2026-08-29 — the heading is now conditional by
// persisted first touch. Testing one literal alone would call the measured
// ChatGPT branch a regression, or let the generic branch disappear unnoticed.
check(
  'clean-film benefit is the heading in both source variants',
  /<h3[\s\S]{0,700}'Take this ChatGPT idea to a clean export'[\s\S]{0,350}'Get a clean version of this film'/.test(card),
)
check('trial timing is demoted to status', /<p[^>]*>[\s\n ]*\{trialOfferHeadline\}[\s\n ]*<\/p>/.test(card))
check('copy does not promise exact reproduction', !card.includes('exact film') && !card.includes('exact video'))
check('copy does not promise instant rebuild', !card.includes('clean now'))
check('primary CTA names clean version and plan', card.includes('`Get the clean version + continue on ${ladderPrimaryPlanLabel} →`'))
check('premium path has honest continuity CTA', card.includes('`Continue creating on ${ladderPrimaryPlanLabel} →`'))
check(
  'asset watermark truth includes entitlement and engine',
  source.includes("planTier === 'free' && !hasPaid && quality === 'fast' &&") &&
    source.includes('!falUsedRef.current && Boolean(lastFastRenderRef.current)'),
)
check('trial clean promise additionally requires trial phase', source.includes('trialPostVideoPhase !== null && currentResultHasWatermark'))
check(
  'generic watermark card requires asset truth and no trial offer phase',
  source.includes('phase === \'done\' && Boolean(finalVideoUrl) && currentResultHasWatermark &&') &&
    source.includes('!trialActive && !wmUnlocking && trialPostVideoPhase === null'),
)
check(
  'generic-card observers use the same render condition',
  source.includes('if (!showPostVideoExportChoice) return') &&
    source.includes('if (!showPostVideoExportChoice || !postVideoCurrency || !element'),
)
check(
  'primary checkout launches canonical ladder tier',
  primaryLaunch >= 0 && card.slice(primaryLaunch, primaryLaunch + 180).includes('ladderPrimaryTier'),
)
check('primary clean rebuild return is conditional', primaryArea.includes("trialPrimaryUnlocksCurrentFilm ? '&return=wm' : ''") && primaryArea.includes("return_to: 'watermark_unlock'"))
check('clean handoff is persisted and read back', source.includes("localStorage.setItem('kineo_wm_unlock', serialized)") && source.includes("localStorage.getItem('kineo_wm_unlock') !== serialized"))
check('storage failure stops checkout with a visible error', source.includes('if (!prepareTrialCleanCheckout(\'monthly\')) return') && source.includes('Your browser blocked the clean-film handoff'))
check('existing primary event is preserved', card.includes("trackEvent('trial_post_video_offer_clicked'"))
check('existing checkout event path is preserved', card.includes('trackCheckoutClick(ladderPrimaryTier)'))
check('monthly checkout error is announced', card.includes('role="alert" className="text-center mt-2 text-xs"'))
check('source-aware layout is identifiable', card.includes('offer_layout: postVideoOfferDecision.variant'))
check('click benefit is discriminated by behavior', card.includes("? 'current_clean_version'") && card.includes(": 'monthly_creation'"))
check('impression carries the source-aware layout', impressionArea.includes('offer_layout: offerDecision.variant'))
check('impression carries the same benefit split', impressionArea.includes("? 'current_clean_version'") && impressionArea.includes(": 'monthly_creation'"))
check('impression effect tracks engine, entitlement, source and live balance changes', source.includes('planFitOwnsRecurringSlot, quality, planTier, signupUtmSource, credits])'))
check('other options use native collapsed disclosure', detailsStart >= 0 && detailsEnd > detailsStart)
check('disclosure is closed by default', !card.slice(detailsStart, card.indexOf('>', detailsStart) + 1).includes(' open'))
check('one-time option remains available for both asset classes', detailsArea.includes('handleBuyThisVideoOnly()') && detailsArea.includes('handleBuyCreditsOnly()'))
check('lower monthly tier remains available inside disclosure', card.indexOf('ladderSecondaryLabel', detailsStart) > detailsStart && card.indexOf('ladderSecondaryLabel', detailsStart) < detailsEnd)
check('one-time failure is visible with its option', detailsArea.includes('wmCheckout.error') && detailsArea.includes('role="alert"'))
check('secondary monthly path requires verified handoff', detailsArea.includes("if (!prepareTrialCleanCheckout('monthly')) return"))
check('secondary monthly path preserves conditional clean return', detailsArea.includes("trialPrimaryUnlocksCurrentFilm ? '&return=wm' : ''") && detailsArea.includes("return_to: 'watermark_unlock'"))
check('premium one-time pack does not request a clean rebuild', source.includes("withIntentCampaign('/api/stripe/checkout?pack=starter')") && !source.includes("starter_pack_credits_only&return=wm"))
check('premium pack copy sells credits, not film cleaning', card.includes('No subscription · use them on your next videos'))
check('secondary options follow the primary checkout', detailsStart > primaryLaunch)
check('post reward does not compete with trial subscription', source.includes("planTier === 'free' && !hasPaid && !showTrialPostVideoOffer"))
check('next episode does not compete with trial subscription', source.includes('!showTrialPostVideoOffer && (nextEpisode || nextEpisodeLoading)'))
check('download event uses asset truth', source.includes('const exportType = currentResultHasWatermark'))
check('download title uses asset truth', source.includes('title={currentResultHasWatermark'))
check('watermark note uses asset truth', source.includes('!showPostVideoExportChoice && currentResultHasWatermark'))
check('credits follow the tier selected by policy', card.includes('TIER_CREDITS[ladderPrimaryTier]'))
check('one-time credits remain sourced from PACK_CREDITS', card.includes('PACK_CREDITS.starter'))
check('price remains sourced from helpers', card.includes('trialOfferPriceNote') && card.includes('packPriceLabel()'))
check('no literal dollar price was added to card', !/\$\s*\d/.test(card))
check('no render endpoint was added to offer card', !card.includes('/api/generate-video'))
check('security/cancellation copy remains visible', card.includes('Secure checkout · cancel anytime'))

console.log(`${total - failed}/${total} checks passed`)
if (failed) process.exit(1)
