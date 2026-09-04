#!/usr/bin/env node
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (path) => readFileSync(join(root, path), 'utf8')
const requireFromRepo = createRequire(join(root, 'package.json'))
const ts = requireFromRepo('typescript')
let checks = 0
const ok = (value, label) => { assert.ok(value, label); checks += 1 }
const equal = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks += 1 }

function loadTs(path) {
  const output = ts.transpileModule(read(path), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: path,
  }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', output)(() => {
    throw new Error(`${path}: unexpected import`)
  }, module, module.exports)
  return module.exports
}

const policy = loadTs('lib/growth/instructionPasteNotice.ts')
const client = read('app/(dashboard)/generate/GenerateClient.tsx')

equal(policy.INSTRUCTION_PASTE_NOTICE_VERSION, 'instruction_paste_notice_v1', 'experiment has a frozen version')
equal(policy.shouldShowInstructionPasteNotice('prompt_looks_like_instruction'), true, 'instruction skip shows guidance')
equal(policy.shouldShowInstructionPasteNotice('empty_prompt'), false, 'empty prompt does not show unrelated guidance')
equal(policy.shouldShowInstructionPasteNotice('paid_account'), false, 'paid account skip does not show unrelated guidance')
equal(policy.shouldShowInstructionPasteNotice(null), false, 'missing reason fails closed')
equal(policy.instructionPasteNoticeMetadata(), {
  version: 'instruction_paste_notice_v1',
  reason: 'prompt_looks_like_instruction',
  surface: 'generate_idea',
}, 'metadata is categorical and contains no customer text')
equal(policy.instructionPromptLengthBand(299), 'under_300', 'short instructions are not mislabeled')
equal(policy.instructionPromptLengthBand(300), '300_699', 'observed lower band begins at 300')
equal(policy.instructionPromptLengthBand(699), '300_699', 'observed lower band includes 699')
equal(policy.instructionPromptLengthBand(700), '700_999', 'middle band begins at 700')
equal(policy.instructionPromptLengthBand(999), '700_999', 'middle band includes 999')
equal(policy.instructionPromptLengthBand(1000), '1000', 'legacy silent-cut signature has its own band')
equal(policy.instructionPromptLengthBand(1001), 'over_1000', 'full scripts above the old ceiling are measurable')
equal(policy.instructionPromptLengthBand(Number.NaN), 'unknown', 'invalid length fails closed')
ok(policy.INSTRUCTION_PASTE_NOTICE.title.includes('still here'), 'title confirms the paste was preserved')
ok(policy.INSTRUCTION_PASTE_NOTICE.body.includes('spoken lines'), 'body explains what becomes narration')
ok(policy.INSTRUCTION_PASTE_NOTICE.body.includes('press Generate'), 'body names the next action')

const guardIndex = client.indexOf('if (looksLikeInstruction(explicitPrompt))')
const showIndex = client.indexOf('setShowInstructionPasteNotice(true)', guardIndex)
const skipIndex = client.indexOf("consumeAndSkip('prompt_looks_like_instruction')", guardIndex)
ok(guardIndex > 0 && showIndex > guardIndex && skipIndex > showIndex, 'live guard exposes guidance before consuming autostart')
ok(client.includes("trackEvent('activation_instruction_notice_viewed'"), 'visible guidance has its own measurable event')
ok(client.includes('...instructionPasteNoticeMetadata()'), 'live event uses allow-listed metadata')
ok(client.includes('instructionPromptLengthBand(explicitPrompt.length)'), 'live event records only a categorical length band')
ok(!client.slice(showIndex, skipIndex).includes('explicitPrompt,'), 'customer script is not sent in notice telemetry')
ok(client.includes('role="status"'), 'notice is announced to assistive technology')
ok(client.includes('aria-live="polite"'), 'notice does not interrupt the user')
ok(client.includes('if (showInstructionPasteNotice) setShowInstructionPasteNotice(false)'), 'manual editing clears stale guidance')
ok(client.includes('{INSTRUCTION_PASTE_NOTICE.title}'), 'live UI renders canonical title')
ok(client.includes('{INSTRUCTION_PASTE_NOTICE.body}'), 'live UI renders canonical body')
ok(client.includes("consumeAndSkip('prompt_looks_like_instruction')"), 'quality guard remains intact')

console.log(`Instruction paste notice: ${checks}/${checks} checks passed`)
