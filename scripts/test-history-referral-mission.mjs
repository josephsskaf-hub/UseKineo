import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const root = process.cwd()
const output = mkdtempSync(path.join(tmpdir(), 'kineo-history-referral-'))
const localTsc = path.join(root, 'node_modules', 'typescript', 'bin', 'tsc')
const sharedTsc = path.resolve(root, '..', '..', '..', 'node_modules', 'typescript', 'bin', 'tsc')
const tsc = existsSync(localTsc) ? localTsc : sharedTsc
const requireFromOutput = createRequire(path.join(output, 'test.cjs'))
let checks = 0

function check(condition, message) {
  assert.ok(condition, message)
  checks += 1
}

try {
  execFileSync(process.execPath, [
    tsc,
    'lib/historyReferralMission.ts',
    '--target', 'ES2022',
    '--module', 'commonjs',
    '--moduleResolution', 'node',
    '--outDir', output,
    '--skipLibCheck',
  ], { cwd: root, stdio: 'pipe' })
  writeFileSync(path.join(output, 'package.json'), JSON.stringify({ type: 'commonjs' }))

  const policy = requireFromOutput(path.join(output, 'historyReferralMission.js'))
  const history = readFileSync(path.join(root, 'app/(dashboard)/history/HistoryClient.tsx'), 'utf8')
  const api = readFileSync(path.join(root, 'app/api/referral/route.ts'), 'utf8')
  const sharing = readFileSync(path.join(root, 'lib/videoShare.ts'), 'utf8')
  const mission = history.slice(
    history.indexOf('aria-label="Invite one creator while keeping your video private"'),
    history.indexOf('aria-label="Private sharing notice"'),
  )
  const referralHandlersStart = history.indexOf('function historyReferralMetadata')
  const referralHandlers = history.slice(
    referralHandlersStart,
    history.indexOf('// Push #421', referralHandlersStart),
  )

  check(policy.HISTORY_REFERRAL_MISSION_VARIANT === 'history_referral_mission_v1', 'variant is stable and explicit')
  check(policy.normalizeReferralRewardCredits(47) === 47, 'integer API reward is accepted')
  check(policy.normalizeReferralRewardCredits('47') === 47, 'numeric API reward is accepted')
  check(policy.normalizeReferralRewardCredits(0) === null, 'zero reward is rejected')
  check(policy.normalizeReferralRewardCredits(-1) === null, 'negative reward is rejected')
  check(policy.normalizeReferralRewardCredits(2.5) === null, 'fractional reward is rejected')
  check(policy.normalizeReferralRewardCredits(1001) === null, 'implausible reward is rejected')
  check(policy.normalizeReferralRewardCredits('not-a-number') === null, 'non-number is rejected')

  const code = 'ABCD2345'
  const canonicalUrl = `https://www.usekineo.com/?ref=${code}`
  check(policy.normalizeReferralInviteUrl(canonicalUrl, code) === canonicalUrl, 'canonical root referral URL is accepted')
  check(policy.normalizeReferralInviteUrl(`http://www.usekineo.com/?ref=${code}`, code) === null, 'http is rejected')
  check(policy.normalizeReferralInviteUrl(`https://usekineo.com/?ref=${code}`, code) === null, 'non-canonical host is rejected')
  check(policy.normalizeReferralInviteUrl(`https://www.usekineo.com/v/video?ref=${code}`, code) === null, 'video path is rejected')
  check(policy.normalizeReferralInviteUrl(`https://www.usekineo.com/?ref=ZZZZ9999`, code) === null, 'mismatched referral is rejected')
  check(policy.normalizeReferralInviteUrl(`${canonicalUrl}&utm_source=history`, code) === null, 'unexpected query data is rejected')
  check(policy.normalizeReferralInviteUrl(`${canonicalUrl}#secret`, code) === null, 'fragment is rejected')
  check(policy.normalizeReferralInviteUrl('not-a-url', code) === null, 'malformed URL is rejected')
  check(policy.normalizeReferralInviteUrl(canonicalUrl, 'bad-code') === null, 'invalid referral code is rejected')

  const rewarded = policy.historyReferralMissionCopy(47)
  check(rewarded.eyebrow === 'Give 47 credits · Get 47 credits', 'eyebrow uses runtime reward')
  check(rewarded.headline.includes('Keep your video private'), 'headline states the privacy boundary')
  check(rewarded.description.includes('only your Kineo invite link'), 'description names the exact shared object')
  check(rewarded.description.includes('qualifying friend'), 'qualification is stated before the action')
  check(rewarded.description.includes('finishes their first video'), 'first-video condition is stated before the action')
  check(rewarded.description.match(/47/g)?.length === 1, 'description states the dynamic reward once')
  check(rewarded.primaryAction === 'Invite on WhatsApp', 'primary action does not claim credits are sent')
  check(rewarded.whatsappMessage.includes('after your first video qualifies'), 'shared message keeps the condition')
  check(rewarded.whatsappMessage.includes('both receive 47 Kineo credits'), 'shared message carries the runtime incentive')
  check(rewarded.privacyNote.includes('video stays private'), 'privacy note promises no video exposure')
  check(rewarded.privacyNote.includes('nothing is sent until you choose'), 'privacy note preserves user agency')

  check(sharing.includes('PUBLIC_VIDEO_SHARING_ENABLED = false as const'), 'public video sharing remains disabled')
  check(history.includes("from '@/lib/historyReferralMission'"), 'live history imports the policy')
  check(history.includes('normalizeReferralRewardCredits(d?.rewardCredits)'), 'live history reads reward from API response')
  check(history.includes('normalizeReferralInviteUrl(d?.url, code)'), 'live history validates the API invite URL')
  check(api.includes('rewardCredits: REFERRAL_REWARD_CREDITS'), 'owned API remains the reward source')
  check(api.includes("const APP_URL = 'https://www.usekineo.com'"), 'owned API pins the canonical production origin')
  check(api.includes('url: `${APP_URL}/?ref=${code}`'), 'owned API returns only the canonical root invite')
  check(history.includes('!PUBLIC_VIDEO_SHARING_ENABLED && historyReferralCopy && referralInviteUrl'), 'mission executes in the live privacy branch')
  check(mission.includes('{historyReferralCopy.eyebrow}'), 'live eyebrow is dynamic')
  check(mission.includes('{historyReferralCopy.description}'), 'live qualification copy is dynamic')
  check(mission.includes('{historyReferralCopy.privacyNote}'), 'live privacy boundary is visible')
  check(mission.indexOf('handleReferralInviteWhatsApp') < mission.indexOf('handleReferralInviteCopy'), 'WhatsApp precedes copy in the live mission')
  check(mission.includes("linear-gradient(135deg, #25D366, #128C4A)"), 'primary action is visibly WhatsApp-first')
  check(referralHandlers.includes('navigator.clipboard.writeText(referralInviteUrl)'), 'copy action uses the root invite URL')
  check(referralHandlers.includes('`${copy.whatsappMessage} ${referralInviteUrl}`'), 'WhatsApp uses the policy and root invite URL')
  check(!referralHandlers.includes('video_id'), 'mission analytics never records a video id')
  check(!referralHandlers.includes('publicShareUrl'), 'mission handlers never construct a public video URL')
  check(!referralHandlers.includes('/v/'), 'mission handlers never reference a public video path')
  check(referralHandlers.includes('version: PUBLIC_VIDEO_SHARE_VERSION'), 'existing creator-loop measurement consumes mission events')
  check(referralHandlers.includes('variant: HISTORY_REFERRAL_MISSION_VARIANT'), 'events identify the new mission')
  check(referralHandlers.includes("where: 'history_private_referral'"), 'events isolate the privacy-safe surface')
  check(referralHandlers.includes("trackEvent('video_share_clicked'"), 'click remains in the measured creator loop')
  check(referralHandlers.includes("'video_shared'"), 'copied invite remains in the measured creator loop')
  check(referralHandlers.includes("trackEvent('video_share_channel_opened'"), 'WhatsApp open remains in the measured creator loop')
  check(history.includes("trackEvent('video_share_prompt_viewed'"), 'view remains in the measured creator loop')
  check(!mission.includes('publicSharePath'), 'live mission does not expose the public video helper')
  check(!mission.includes('latestVideo.id'), 'live mission does not pass the video id')
  console.log(`history-referral-mission: ${checks}/${checks} checks passed`)
} finally {
  rmSync(output, { recursive: true, force: true })
}
