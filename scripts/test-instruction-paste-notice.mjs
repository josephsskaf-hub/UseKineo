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

// sprint-retencao #9 — `looksLikeInstruction` vive em lib/momentumTopic.ts, que
// importa './resumeStrip'. O `loadTs` acima estoura em qualquer import, de
// proposito. Aqui carregamos so o trecho ATE `pickMomentumTopic` — a unica
// parte que o aviso consulta, e a unica que nao depende do import. Os literais
// das regex sao os do arquivo de producao, byte a byte: nada e reescrito.
function loadInstructionGate() {
  const source = read('lib/momentumTopic.ts')
  const cut = source.indexOf('export function pickMomentumTopic')
  assert.ok(cut > 0, 'lib/momentumTopic.ts mudou de forma: pickMomentumTopic sumiu')
  const output = ts.transpileModule(source.slice(0, cut).replace(/^import .*$/m, ''), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: 'lib/momentumTopic.ts',
  }).outputText
  const module = { exports: {} }
  // KINEO-MARCADOR-DA-CASA-2026-09-05 — `looksLikeInstruction` passou a consultar
  // `pareceRoteiroDaCasa` (lib/nextEpisodeMarkers.ts) para nao classificar como
  // colagem de chatbot o roteiro que a NOSSA home escreve em marcadores da casa.
  // Este unico vizinho e carregado DE VERDADE, do arquivo de producao: substitui-lo
  // por um dublê faria o teste medir o dublê. Todo OUTRO import continua estourando,
  // que e a garantia original deste carregador.
  const requireVizinho = (especificador) => {
    if (especificador === './nextEpisodeMarkers') return loadTs('lib/nextEpisodeMarkers.ts')
    throw new Error(`lib/momentumTopic.ts: unexpected import (${especificador})`)
  }
  new Function('require', 'module', 'exports', output)(requireVizinho, module, module.exports)
  return module.exports.looksLikeInstruction
}

const policy = loadTs('lib/growth/instructionPasteNotice.ts')
const looksLikeInstruction = loadInstructionGate()
const client = read('app/(dashboard)/generate/GenerateClient.tsx')

// sprint-retencao #9 — v1 → v2. A copy deixou de ser uma so: o ramo
// `command_to_chatbot` e novo e o `labeled_script` e a copy de 02/09 intacta.
// Um experimento cujo texto mudou para parte do publico nao pode manter a
// mesma versao, senao a leitura do evento mistura as duas telas.
equal(policy.INSTRUCTION_PASTE_NOTICE_VERSION, 'instruction_paste_notice_v2', 'experiment has a frozen version')
equal(policy.shouldShowInstructionPasteNotice('prompt_looks_like_instruction'), true, 'instruction skip shows guidance')
equal(policy.shouldShowInstructionPasteNotice('empty_prompt'), false, 'empty prompt does not show unrelated guidance')
equal(policy.shouldShowInstructionPasteNotice('paid_account'), false, 'paid account skip does not show unrelated guidance')
equal(policy.shouldShowInstructionPasteNotice(null), false, 'missing reason fails closed')
// `paste_shape` e o unico campo novo, e continua CATEGORICO: 'command_to_chatbot'
// ou 'labeled_script'. Sem ele o evento nao distingue as duas telas e a proxima
// sessao mede um numero so para dois defeitos diferentes.
equal(policy.instructionPasteNoticeMetadata(), {
  version: 'instruction_paste_notice_v2',
  reason: 'prompt_looks_like_instruction',
  surface: 'generate_idea',
  paste_shape: 'labeled_script',
}, 'metadata is categorical and contains no customer text')
equal(policy.instructionPasteNoticeMetadata('command_to_chatbot'), {
  version: 'instruction_paste_notice_v2',
  reason: 'prompt_looks_like_instruction',
  surface: 'generate_idea',
  paste_shape: 'command_to_chatbot',
}, 'the new branch is measurable and still categorical')
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
ok(client.includes('...instructionPasteNoticeMetadata(classifyInstructionPaste(explicitPrompt))'), 'live event uses allow-listed metadata')
ok(client.includes('instructionPromptLengthBand(explicitPrompt.length)'), 'live event records only a categorical length band')
ok(!client.slice(showIndex, skipIndex).includes('explicitPrompt,'), 'customer script is not sent in notice telemetry')
ok(client.includes('role="status"'), 'notice is announced to assistive technology')
ok(client.includes('aria-live="polite"'), 'notice does not interrupt the user')
ok(client.includes('if (showInstructionPasteNotice) setShowInstructionPasteNotice(false)'), 'manual editing clears stale guidance')
// A tela deixou de ler uma constante fixa: ela le a copy DO RAMO classificado.
ok(client.includes('instructionPasteNoticeFor(classifyInstructionPaste(prompt)).title'), 'live UI renders canonical title')
ok(client.includes('instructionPasteNoticeFor(classifyInstructionPaste(prompt)).body'), 'live UI renders canonical body')
ok(!client.includes('{INSTRUCTION_PASTE_NOTICE.title}') && !client.includes('{INSTRUCTION_PASTE_NOTICE.body}'),
  'no branch is left reading the frozen single-copy constant')
ok(client.includes("consumeAndSkip('prompt_looks_like_instruction')"), 'quality guard remains intact')

// ─────────────────────────────────────────────────────────────────────────────
// sprint-retencao #9 — OS DOIS RAMOS, com o texto REAL da vitima de 04/09
// ─────────────────────────────────────────────────────────────────────────────
// `nikitaamiran@gmail.com`, events 21:41:13 UTC, campo topic_hint. Ela viu o
// aviso as 21:38:45 e 17s depois escolheu "I have the full script" → verbatim
// → duas falhas → foi embora com 0 filmes. A copy antiga AFIRMAVA que o texto
// dela era um roteiro.
const VITIMA = 'Create a 35-second cinematic YouTube Short in English about what would happen if the Moon disappeared tomorrow.'
const RESPOSTA_DO_CHATBOT = 'Absolutely. Below is a **complete content package** for your Short.\nSTYLE: Bright, colourful\nVisual: wide shot of the moon'

equal(policy.classifyInstructionPaste(VITIMA), 'command_to_chatbot', 'the pasted request is named as an idea, not a script')
equal(policy.classifyInstructionPaste(RESPOSTA_DO_CHATBOT), 'labeled_script', 'the chatbot answer stays on the 02/09 branch')
equal(policy.classifyInstructionPaste('STYLE: Bright, colourful'), 'labeled_script', 'uppercase labels stay on the old branch')
equal(policy.classifyInstructionPaste('## Scene 1'), 'labeled_script', 'markdown stays on the old branch')
equal(policy.classifyInstructionPaste(''), 'labeled_script', 'a tie falls back to the copy already shipped')
equal(policy.classifyInstructionPaste(null), 'labeled_script', 'missing text fails to the old copy, never to undefined')
equal(policy.instructionPasteNoticeFor('ramo_que_nao_existe').body, policy.INSTRUCTION_PASTE_NOTICE.body,
  'an unknown shape falls back to the shipped copy')

// A porta NAO mudou: o mesmo publico ve o aviso, so o texto e que diverge.
ok(looksLikeInstruction(VITIMA), 'the victim text still opens the notice')
ok(looksLikeInstruction(RESPOSTA_DO_CHATBOT), 'the chatbot answer still opens the notice')
for (const tema of ['5 shocking facts about money', 'The day the Moon disappeared', 'Why do cats purr?']) {
  ok(!looksLikeInstruction(tema), `a normal topic still sees no notice: ${tema}`)
}

const novo = policy.instructionPasteNoticeFor('command_to_chatbot')
ok(/looks like your idea, not the script/.test(novo.title), 'new title names what was actually detected')
ok(/narrate the request itself/.test(novo.body), 'new body explains what verbatim would do')
ok(/I only have the idea/.test(novo.body), 'new body points at the mode that works')
ok(/keep the script mode/.test(novo.body), 'new body preserves the choice of whoever really wants verbatim')
ok(!/is blocked|not allowed|cannot generate/i.test(novo.body), 'guidance never promises a block it does not perform')
equal(policy.instructionPasteNoticeFor('labeled_script').body, policy.INSTRUCTION_PASTE_NOTICE.body,
  'the 02/09 copy survives byte for byte on the branch it served')

console.log(`Instruction paste notice: ${checks}/${checks} checks passed`)
