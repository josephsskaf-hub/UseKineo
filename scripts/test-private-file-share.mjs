// KINEO-PRIVATE-FILE-SHARE-2026-08-29
// Executes the real download helper with a fake browser and audits the live caller.
// No network, credentials or production writes.

import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import ts from 'typescript'

const root = process.cwd()
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')
let checks = 0
const check = (condition, message) => {
  assert.ok(condition, message)
  checks++
}

const downloadSource = read('lib/videoDownload.ts')
const generate = read('app/(dashboard)/generate/GenerateClient.tsx')
const privacy = read('lib/videoShare.ts')
const referralSource = read('lib/historyReferralMission.ts')

function loadReferralModule() {
  const compiled = ts.transpileModule(referralSource, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const moduleBox = { exports: {} }
  vm.runInNewContext(compiled, {
    module: moduleBox,
    exports: moduleBox.exports,
    URL,
    Number,
  }, { filename: 'lib/historyReferralMission.ts' })
  return moduleBox.exports
}

function loadDownloadModule(onTrack = () => {}) {
  const compiled = ts.transpileModule(downloadSource, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText
  const moduleBox = { exports: {} }
  let anchorClicks = 0
  let objectUrls = 0
  const fakeDocument = {
    visibilityState: 'visible',
    body: { appendChild() {}, removeChild() {} },
    createElement() {
      return {
        href: '',
        download: '',
        dataset: {},
        style: {},
        click() { anchorClicks++ },
        remove() {},
        setAttribute() {},
        appendChild() {},
      }
    },
    getElementById() { return null },
    addEventListener() {},
    removeEventListener() {},
  }
  const fakeUrl = {
    createObjectURL() { objectUrls++; return 'blob:private-video' },
    revokeObjectURL() {},
  }
  const sandbox = {
    module: moduleBox,
    exports: moduleBox.exports,
    require: (id) => {
      if (id === '@/lib/analytics') return { trackEvent: onTrack }
      throw new Error(`unmocked import ${id}`)
    },
    console,
    process: { env: {} },
    navigator: { userAgent: 'Desktop Test Browser' },
    window: { innerWidth: 1280, open: () => ({}) },
    document: fakeDocument,
    fetch: async () => ({
      ok: true,
      status: 200,
      blob: async () => new Blob(['private-video-bytes'], { type: 'video/mp4' }),
    }),
    URL: fakeUrl,
    URLSearchParams,
    Blob,
    setTimeout: () => 1,
    clearTimeout: () => {},
    Date,
    Map,
    Promise,
  }
  vm.runInNewContext(compiled, sandbox)
  return {
    api: moduleBox.exports,
    anchorClicks: () => anchorClicks,
    objectUrls: () => objectUrls,
  }
}

const tracked = []
const first = loadDownloadModule((name, metadata) => tracked.push({ name, metadata }))
let captured = null
const outcome = await first.api.downloadVideoFile({
  url: 'https://cdn.example/video.mp4',
  filename: 'video.mp4',
  exportType: 'watermarked',
  surface: 'done_screen',
  onBlobReady: (blob) => { captured = blob },
})

check(outcome === 'blob', 'real download helper still returns blob')
check(captured instanceof Blob, 'real callback receives the fetched Blob')
check(captured?.type === 'video/mp4', 'callback preserves the MP4 mime type')
check(captured?.size > 0, 'callback receives non-empty bytes')
check(first.anchorClicks() === 1, 'download anchor still clicks exactly once')
check(first.objectUrls() === 1, 'download still creates exactly one object URL')
check(tracked.some((event) => event.name === 'video_downloaded'), 'historical video_downloaded event remains')

const throwing = loadDownloadModule()
const throwingOutcome = await throwing.api.downloadVideoFile({
  url: 'https://cdn.example/video.mp4',
  filename: 'video.mp4',
  exportType: 'clean',
  surface: 'done_screen',
  onBlobReady: () => { throw new Error('surface failed') },
})
check(throwingOutcome === 'blob', 'throwing optional callback cannot break delivery')
check(throwing.anchorClicks() === 1, 'throwing callback cannot suppress the download click')

const absent = loadDownloadModule()
const absentOutcome = await absent.api.downloadVideoFile({
  url: 'https://cdn.example/video.mp4',
  filename: 'video.mp4',
  exportType: 'clean',
  surface: 'done_screen',
})
check(absentOutcome === 'blob', 'existing callers work without the callback')
check(absent.anchorClicks() === 1, 'existing caller still downloads exactly once')

const referral = loadReferralModule()
check(
  referral.PRIVATE_FILE_SHARE_REFERRAL_VARIANT === 'native_file_share_referral_v2',
  'private referral variant separates the attributed treatment',
)
const referralPayload = referral.privateFileShareReferral({
  code: 'abcd2345',
  inviteUrl: 'https://www.usekineo.com/?ref=ABCD2345',
  rewardCredits: 47,
})
check(referralPayload?.code === 'ABCD2345', 'private referral normalizes the owned code')
check(referralPayload?.inviteUrl === 'https://www.usekineo.com/?ref=ABCD2345', 'private referral retains only the canonical root invite')
check(referralPayload?.rewardCredits === 47, 'private referral reads the runtime reward')
check(referralPayload?.headline.includes('Invite one creator'), 'private referral asks for one concrete acquisition action')
check(referralPayload?.description.includes('video stays a direct file'), 'private referral keeps the video private')
check(referralPayload?.description.includes('first video qualifies'), 'private referral states the qualification before the action')
check(referralPayload?.shareText.includes('47 Kineo credits'), 'shared message carries the runtime reward')
check(referralPayload?.shareText.endsWith('https://www.usekineo.com/?ref=ABCD2345'), 'shared message carries the canonical invite')
check(referral.privateFileShareReferral({
  code: 'ABCD2345',
  inviteUrl: 'https://www.usekineo.com/v/private?ref=ABCD2345',
  rewardCredits: 47,
}) === null, 'video URL fails closed')
check(referral.privateFileShareReferral({
  code: 'ABCD2345',
  inviteUrl: 'https://www.usekineo.com/?ref=ABCD2345',
  rewardCredits: 0,
}) === null, 'invalid reward fails closed')
check(referral.privateFileShareReferral({
  code: 'ABCD2345',
  inviteUrl: 'https://evil.example/?ref=ABCD2345',
  rewardCredits: 47,
}) === null, 'foreign origin fails closed')

check(downloadSource.includes('onBlobReady?: (blob: Blob) => void'), 'callback stays optional')
check(downloadSource.indexOf('opts.onBlobReady?.(blob)') > downloadSource.indexOf('const blob = await res.blob()'), 'callback receives fetched bytes')
check(downloadSource.indexOf('opts.onBlobReady?.(blob)') < downloadSource.indexOf('const blobUrl = URL.createObjectURL(blob)'), 'callback does not trigger a second fetch')
check(/try \{[\s\S]{0,80}opts\.onBlobReady\?\.\(blob\)[\s\S]{0,160}catch/.test(downloadSource), 'callback remains failure-isolated')

check(privacy.includes('PUBLIC_VIDEO_SHARING_ENABLED = false'), 'public customer-video sharing remains off')
check(generate.includes('downloadedVideoBlobRef = useRef<Blob | null>(null)'), 'done screen stores only an in-memory blob ref')
check(generate.includes('onBlobReady: (blob) => {'), 'real done-screen download supplies the callback')
check(generate.includes('downloadedVideoBlobRef.current = blob'), 'real caller captures the exact downloaded blob')
check(generate.includes('downloadedVideoBlobRef.current = null'), 'new video clears the prior blob')
check(generate.includes('setShareableDownloadedFile(false)'), 'new video hides the stale share action')
check(generate.includes('setPrivateFileShareState(\'idle\')'), 'new video resets share status')
const referralPreloadStart = generate.indexOf('// Preload the owned referral contract')
const referralPreloadEnd = generate.indexOf('// Count a post-render referral card', referralPreloadStart)
const referralPreload = generate.slice(referralPreloadStart, referralPreloadEnd)
check(referralPreload.includes("if (phase !== 'done'"), 'referral preload cannot mint codes before a completed video')
check(referralPreload.includes("fetch('/api/referral'"), 'completed-video preload uses the owned referral endpoint')
check(referralPreload.includes('privateReferralPreloadAttemptedRef.current = true'), 'referral preload runs at most once per mounted result flow')
check(referralPreload.includes('privateFileShareReferral({'), 'API payload crosses the canonical validator')
check(referralPreload.includes('setPrivateReferralResolved(true)'), 'referral eligibility settles before the impression is classified')

const handlerStart = generate.indexOf('async function handleShareDownloadedFile()')
const handlerEnd = generate.indexOf('\n  function handleContinueSeries(', handlerStart)
const handler = generate.slice(handlerStart, handlerEnd)
check(handler.length > 0, 'real private-file handler is found')
check(handler.includes('const blob = downloadedVideoBlobRef.current'), 'handler uses captured bytes')
check(handler.includes('new File([blob], filename'), 'handler attaches the MP4 as a File')
check(handler.includes("typeof navigator.share !== 'function'"), 'handler checks Web Share support')
check(handler.includes("typeof navigator.canShare !== 'function'"), 'handler checks file-share support')
check(handler.includes('navigator.canShare({ files: [file] })'), 'handler asks the browser about this exact file')
check(handler.includes('await navigator.share({'), 'share sheet opens only from the click handler')
check(handler.includes("privateReferral?.shareText ?? 'Made with Kineo — https://www.usekineo.com'"), 'native share attaches the invite only after canonical validation')
check(!handler.includes('/v/'), 'private handler never constructs a public watch URL')
check(!handler.includes('fetch('), 'share handler never downloads the MP4 again')
check(!handler.includes('localStorage'), 'private video bytes are never persisted')
check(handler.includes("trackEvent('video_share_clicked'"), 'existing creator-loop click metric remains comparable')
check(handler.includes("trackEvent('video_shared'"), 'existing creator-loop completion metric remains comparable')
check(handler.includes("method: 'native_file'"), 'completion declares native file sharing')
check(handler.includes("public_page_created: false"), 'telemetry states the privacy boundary')
check(handler.includes('referral_attached: privateReferral !== null'), 'native-share telemetry declares referral attachment')
check(handler.includes('incentive_credits_each: privateReferral?.rewardCredits ?? null'), 'native-share telemetry reads the runtime reward')
check(handler.includes("error.name === 'AbortError'"), 'user cancellation is separated from failure')
check(!handler.includes('error.message'), 'free-form browser errors never enter telemetry')

const copyStart = generate.indexOf('async function handleCopyPrivateReferral()')
const copyEnd = generate.indexOf('\n  function handleContinueSeries(', copyStart)
const copyHandler = generate.slice(copyStart, copyEnd)
check(copyHandler.length > 0, 'private referral copy handler is found')
check(copyHandler.includes('navigator.clipboard.writeText(privateReferral.shareText)'), 'copy action carries the qualified invite message')
check(copyHandler.includes("window.prompt('Copy your private Kineo invite message:'"), 'clipboard failure keeps a manual fallback')
check(copyHandler.includes("trackEvent('private_video_referral_message_copied'"), 'copy action has an isolated acquisition event')
check(copyHandler.includes("public_page_created: false"), 'copy telemetry preserves the privacy boundary')
check(!copyHandler.includes('video_id'), 'invite-only copy telemetry does not record a video id')
check(!copyHandler.includes('inviteUrl'), 'invite URL never enters analytics metadata')
check(!copyHandler.includes('/v/'), 'invite-only copy never constructs a public video URL')

const disabledStart = generate.indexOf('data-public-sharing-state="disabled"')
const disabledEnd = generate.indexOf('onClick={() => handleContinueSeries', disabledStart)
// The ref is an attribute of the same opening div and therefore precedes the
// data marker. Start at that div; slicing from data-public-sharing-state made
// the first version of this assertion incapable of seeing its sibling ref.
const disabledBlockStart = generate.lastIndexOf('<div', disabledStart)
const privateCard = generate.slice(disabledBlockStart, disabledEnd)
check(privateCard.includes('ref={privateFileShareRef}'), 'private card owns its visibility observer')
check(privateCard.includes('Share the MP4 — without making it public'), 'headline states the safe action')
check(privateCard.includes('onClick={handleShareDownloadedFile}'), 'CTA calls the real handler')
check(privateCard.includes("'Share MP4 + invite'"), 'eligible CTA names both the file and invite')
check(privateCard.includes('onClick={handleCopyPrivateReferral}'), 'desktop-safe copy alternative uses the referral handler')
check(privateCard.includes('Copy invite message'), 'copy alternative names the shared object')
check(privateCard.includes("privateReferral?.headline ?? 'Share the MP4 — without making it public'"), 'invalid referral falls back to the original private headline')
check(privateCard.includes('Nothing is sent until you choose a recipient.'), 'copy preserves explicit user choice')
check(privateCard.includes('Public watch links are temporarily paused'), 'privacy containment remains visible')
check(privateCard.includes('explicit visibility choice'), 'public-page boundary remains explicit')
check(!privateCard.includes('href="/v/'), 'private card cannot leak a public link')

const viewStart = generate.indexOf("trackEvent('private_video_file_share_viewed'")
const viewArea = generate.slice(viewStart - 900, viewStart + 500)
check(viewStart > 0, 'private-file impression is measured')
check(viewArea.includes('intersectionRatio >= 0.5'), 'impression requires half-viewport visibility')
check(viewArea.includes('variant: PRIVATE_FILE_SHARE_REFERRAL_VARIANT'), 'impression identifies the attributed variant')
check(viewArea.includes('public_page_created: false'), 'impression states no public page exists')
check(viewArea.includes('referral_attached: privateReferral !== null'), 'impression separates eligible and fallback states')
check(viewArea.includes('!privateReferralResolved'), 'impression waits for referral eligibility instead of racing the API')

console.log(`private-file-share: ${checks}/${checks} checks passed`)
