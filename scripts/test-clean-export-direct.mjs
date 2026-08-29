// KINEO-GROWTH-DIRECT-CLEAN-2026-08-29
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

const cardStart = source.indexOf('{showPostVideoExportChoice && (')
const cardEnd = source.indexOf('{/* Push #296', cardStart)
const card = cardStart >= 0 && cardEnd > cardStart ? source.slice(cardStart, cardEnd) : ''
const directStart = card.indexOf('{watermarkedDownloadConfirmed ? (')
const modalStart = card.indexOf('{!watermarkedDownloadConfirmed && showCleanPaywall')
const primaryStart = card.indexOf('onClick={handleRemoveWatermark}', directStart)
const secondaryStart = card.indexOf('onClick={handleBuyThisVideoOnly}', directStart)
const directArea = directStart >= 0 && modalStart > directStart
  ? card.slice(directStart, modalStart)
  : ''
const cleanClickStart = source.indexOf("trackEvent('post_video_clean_export_clicked'")
const cleanClickArea = source.slice(cleanClickStart, cleanClickStart + 800)
const packClickStart = source.indexOf("trackEvent('post_video_single_unlock_clicked'", cleanClickStart)
const packClickArea = source.slice(packClickStart, packClickStart + 800)
const directEffectStart = source.indexOf('// KINEO-GROWTH-DIRECT-CLEAN-2026-08-29')
const directViewStart = source.indexOf("trackEvent('clean_export_direct_choices_viewed'", directEffectStart)
// The visibility guard necessarily precedes the event call. Slice the whole
// effect, not only the payload; the first version of this assertion looked
// forward from trackEvent and therefore could never see intersectionRatio.
const directViewArea = source.slice(directEffectStart, directViewStart + 1000)

console.log('\nKINEO — direct clean export after download contract\n')

check('generic export card is found', card.length > 0)
check('free download remains before every paid action', card.indexOf('onClick={handleDownload}') < directStart)
check('direct branch requires a confirmed download', directStart >= 0)
check('direct branch is visually identified by its own ref', directArea.includes('ref={cleanExportDirectRef}'))
check('direct branch reassures that the free copy is safe', directArea.includes('Your free copy is safe'))
check('monthly checkout is one click after download', primaryStart > directStart)
check('one-time checkout is one click after download', secondaryStart > primaryStart)
check('monthly checkout stays visually primary', /onClick=\{handleRemoveWatermark\}[\s\S]{0,700}background: '#2997ff'/.test(directArea))
check('one-time checkout stays visually secondary', /onClick=\{handleBuyThisVideoOnly\}[\s\S]{0,700}background: 'transparent'/.test(directArea))
check('monthly value names the clean current video', directArea.includes('this video clean + {TIER_CREDITS.starter} credits every month'))
check('one-time value names one video', directArea.includes('Just this video — {packPriceLabel()}, one-time'))
check('monthly price is derived, not literal', directArea.includes('postVideoIntroPrice'))
check('one-time price is derived, not literal', directArea.includes('packPriceLabel()'))
check('no dollar literal was added to direct branch', !/\$\s*\d/.test(directArea))
check('trust line names Stripe', directArea.includes('Secure Stripe checkout'))
check('trust line preserves cancel anytime', directArea.includes('cancel anytime'))
check('trust line uses approved seven-day guarantee', directArea.includes('7-day money-back'))
check('pre-download path keeps the explanatory modal', directArea.includes('See clean export options →'))
check('pre-download trigger states the modal layout', directArea.includes("offer_layout: 'pre_download_modal_v1'"))
check('pre-download trigger cannot claim a completed download', directArea.includes('after_download: false'))
check('modal cannot reopen after download', modalStart > directStart)
check('modal still contains both existing checkout handlers', card.slice(modalStart).includes('onClick={handleRemoveWatermark}') && card.slice(modalStart).includes('onClick={handleBuyThisVideoOnly}'))
check('direct choices have a dedicated measured impression', directViewStart >= 0)
check('direct impression requires the download truth', source.includes('!watermarkedDownloadConfirmed ||'))
check('direct impression requires half-viewport visibility', directViewArea.includes('intersectionRatio >= 0.5'))
check('direct impression names its layout', directViewArea.includes("offer_layout: 'after_download_direct_v1'"))
check('direct impression names both offers', directViewArea.includes("primary_offer: 'starter_intro_month'") && directViewArea.includes("secondary_offer: 'starter_pack_one_time'"))
check('monthly click records direct versus modal path', cleanClickArea.includes("? 'direct_after_download_v1'") && cleanClickArea.includes(": 'modal_before_download_v1'"))
check('one-time click records direct versus modal path', packClickArea.includes("? 'direct_after_download_v1'") && packClickArea.includes(": 'modal_before_download_v1'"))
check('direct impression key resets for a new film', (source.match(/cleanExportDirectTrackedKeyRef\.current = null/g) ?? []).length >= 2)
check('legacy modal also resets for a new film', (source.match(/setShowCleanPaywall\(false\)/g) ?? []).length >= 4)
check('no render endpoint was added to direct branch', !directArea.includes('/api/generate-video'))
check('no new checkout endpoint was invented', !directArea.includes('/api/stripe/checkout'))

console.log(`${total - failed}/${total} checks passed`)
if (failed) process.exit(1)
