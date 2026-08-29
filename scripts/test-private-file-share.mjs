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
check(handler.includes("text: 'Made with Kineo — https://www.usekineo.com'"), 'optional share text names the canonical site')
check(!handler.includes('/v/'), 'private handler never constructs a public watch URL')
check(!handler.includes('fetch('), 'share handler never downloads the MP4 again')
check(!handler.includes('localStorage'), 'private video bytes are never persisted')
check(handler.includes("trackEvent('video_share_clicked'"), 'existing creator-loop click metric remains comparable')
check(handler.includes("trackEvent('video_shared'"), 'existing creator-loop completion metric remains comparable')
check(handler.includes("method: 'native_file'"), 'completion declares native file sharing')
check(handler.includes("public_page_created: false"), 'telemetry states the privacy boundary')
check(handler.includes("error.name === 'AbortError'"), 'user cancellation is separated from failure')
check(!handler.includes('error.message'), 'free-form browser errors never enter telemetry')

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
check(privateCard.includes('Share downloaded MP4'), 'CTA names the attached asset')
check(privateCard.includes('Nothing is sent until you choose a recipient.'), 'copy preserves explicit user choice')
check(privateCard.includes('Public watch links are temporarily paused'), 'privacy containment remains visible')
check(privateCard.includes('explicit visibility choice'), 'public-page boundary remains explicit')
check(!privateCard.includes('href="/v/'), 'private card cannot leak a public link')

const viewStart = generate.indexOf("trackEvent('private_video_file_share_viewed'")
const viewArea = generate.slice(viewStart - 900, viewStart + 500)
check(viewStart > 0, 'private-file impression is measured')
check(viewArea.includes('intersectionRatio >= 0.5'), 'impression requires half-viewport visibility')
check(viewArea.includes("variant: 'native_file_share_v1'"), 'impression identifies the variant')
check(viewArea.includes('public_page_created: false'), 'impression states no public page exists')

console.log(`private-file-share: ${checks}/${checks} checks passed`)
