#!/usr/bin/env node
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const requireFromRepo = createRequire(join(root, 'package.json'))
const ts = requireFromRepo('typescript')
const read = (path) => readFileSync(join(root, path), 'utf8')

let checks = 0
function ok(value, label) { assert.ok(value, label); checks += 1 }
function equal(actual, expected, label) { assert.equal(actual, expected, label); checks += 1 }

function loadTs(path, mocks = {}) {
  const output = ts.transpileModule(read(path), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: path,
  }).outputText
  const module = { exports: {} }
  const localRequire = (id) => {
    if (Object.prototype.hasOwnProperty.call(mocks, id)) return mocks[id]
    throw new Error(`${path}: unexpected import ${id}`)
  }
  new Function('require', 'module', 'exports', output)(localRequire, module, module.exports)
  return module.exports
}

const engineCost = loadTs('lib/credits/engineCost.ts')
// Idem: entryPolicy entrou em 08/09 e e a fonte unica da porta de $1.
const entryPolicy = loadTs('lib/entryPolicy.ts')
const offer = loadTs('lib/freeTierOffer.ts', { './credits/engineCost': engineCost, './entryPolicy': entryPolicy })
const facts = loadTs('lib/growth/trialAccessFacts.ts')

equal(offer.TRIAL_GRANT_CREDITS_COPY, 10, 'test reads the canonical current grant (10 desde 16/09, fundador; era 30 na restauração de 09/09)')
equal(offer.buildFreeTierOffer(true).reverseTrial, true, 'reverse trial branch is executable')
// 08/09 (VERSAO B): sob a porta unica nao ha franquia recorrente — limit 0 e a
// politica, nao um defeito. Lido do mesmo seletor que o produto usa.
// KINEO-E4-SAIDA-B-2026-09-29 — reancorado com motivo: a E4 desliga a cota de Kineo 1 (limit 0 tambem fora da porta
// unica); a cota semanal nova (1 Seedance 15 s, so pais rico) mora em lib/freeWeeklyFilm.ts e nao e anunciada.
equal(
  offer.buildFreeTierOffer(true).limit,
  0,
  'recurring post-trial limit comes from the offer',
)

const engines = [
  ['Kineo 1', 'fast'],
  ['Seedance 1.5', 'cinematic_ai'],
  ['Kling 2.5', 'cinematic_kling'],
  ['Veo 3.1', 'cinematic_veo'],
  ['Avatar', 'avatar'],
  ['MiniMax H3', 'cinematic_h3'],
  ['Omni Flash', 'cinematic_omni'],
  ['Kling 3', 'cinematic_hollywood'],
].map(([name, quality]) => ({
  name,
  credits: engineCost.creditCostForDuration(quality, true, 60),
}))

const trial = facts.buildTrialAccessFact({
  enabled: true,
  credits: offer.TRIAL_GRANT_CREDITS_COPY,
  engines,
})
ok(trial, 'enabled trial produces a record')
equal(trial.credits, 10, 'trial publishes the real balance (10 desde 16/09)')
equal(trial.everyEngineUnlocked, true, 'access is explicit')
equal(trial.noCardRequired, true, 'card boundary is explicit')
equal(trial.watermark, true, 'trial watermark is explicit')
equal(trial.cleanDownloadRequiresPaidPlan, true, 'clean-download boundary is explicit')
equal(trial.engineCoverage.length, engines.length, 'coverage includes every named engine')

for (const row of trial.engineCoverage) {
  const source = engines.find((engine) => engine.name === row.engine)
  equal(row.creditsPerReferenceVideo, source.credits, `${row.engine}: cost comes from the real 60s ruler`)
  equal(row.wholeReferenceVideosCovered, Math.floor(10 / source.credits), `${row.engine}: balance coverage is calculated (trial de 10 desde 16/09)`)
}

const covered = trial.engineCoverage.filter((row) => row.wholeReferenceVideosCovered > 0).map((row) => row.engine)
equal(covered.join(','), 'Kineo 1', '10 credits cover only Kineo 1 (Seedance needs 25) — KINEO-TRIAL-10, fundador 16/09')
const balanceShort = trial.engineCoverage.filter((row) => row.wholeReferenceVideosCovered === 0).map((row) => row.engine)
equal(balanceShort.join(','), 'Seedance 1.5,Kling 2.5,Veo 3.1,Avatar,MiniMax H3,Omni Flash,Kling 3', 'unlocked-but-not-covered engines stay named (Seedance joins the list with the 10-credit trial, 16/09)')
equal(facts.buildTrialAccessFact({ enabled: false, credits: 25, engines }), null, 'disabled trial publishes no trial record')
assert.throws(() => facts.buildTrialAccessFact({ enabled: true, credits: -1, engines }), /invalid_trial_credit_balance/)
checks += 1

const recurring = facts.buildRecurringFreeAccessFact({ engine: 'Kineo 1', videosPerWindow: 1, rollingWindowHours: 720 })
equal(recurring.engine, 'Kineo 1', 'recurring access names the public engine')
equal(recurring.videosPerWindow, 1, 'recurring access names the allowance')
equal(recurring.rollingWindowHours, 720, 'recurring access names the real window')
equal(recurring.creditsGranted, 0, 'recurring access does not pretend to grant credits')

const canonical = read('lib/kineoFacts.ts')
ok(canonical.includes('export const TRIAL_ACCESS = buildTrialAccessFact({'), 'canonical facts build the trial record')
ok(canonical.includes('engines: ENGINE_FACTS'), 'trial coverage uses the canonical engine catalog')
// KINEO-FILME-GRATIS-15S-2026-09-29 — reancorado com motivo: a cota semanal deixou de ser ANUNCIADA (decisão do fundador); o builder continua
// sendo a única forma de publicar a cota, mas só atrás de RECURRING_FREE_ANNOUNCED (hoje false → null).
// RECURRING_PUBLISHED = !reverseTrial || RECURRING_FREE_ANNOUNCED: o mundo legado (flag OFF) segue publicando a franquia.
ok(/export const RECURRING_FREE_ACCESS = RECURRING_PUBLISHED\r?\n  \? buildRecurringFreeAccessFact\(\{/.test(canonical) && /^const RECURRING_PUBLISHED: boolean = !FREE_OFFER\.reverseTrial \|\| RECURRING_FREE_ANNOUNCED\r?$/m.test(canonical),'canonical facts build recurring access only when announced (or in the legacy flag-OFF world)')
ok(canonical.includes('videosPerWindow: FREE_OFFER.limit'), 'recurring limit uses the offer')
// Reancorado 29/09 (revisão da E2b, achado 4 de texto): a constante passou a ser EXPORTADA (a carta send-weekly-quota a lê para
// devolver 409 enquanto a cota não é anunciada). O valor exigido continua false, na linha inteira.
ok(/^export const RECURRING_FREE_ANNOUNCED: boolean = false$/m.test(canonical), 'recurring access is not announced (29/09)')
ok(canonical.includes('trialAccess: TRIAL_ACCESS'), 'JSON payload exposes trialAccess')
ok(canonical.includes('recurringFreeAccess: RECURRING_FREE_ACCESS'), 'JSON payload exposes recurringFreeAccess')
// KINEO-FILME-GRATIS-15S-2026-09-29 — reancorado com motivo: o escopo recorrente e o nome do motor só saem com a cota anunciada;
// ENGINE_FACTS[0] deixou de ser o Kineo 1 (fora do catálogo), então o nome vem do KINEO1_ENGINE_FACT.
ok(canonical.includes("engineScope: RECURRING_PUBLISHED ? ('recurring_free_access' as const) : ('none' as const)"), 'legacy free-tier engine declares its recurring scope (or none)')
ok(canonical.includes('engineCanonicalName: RECURRING_PUBLISHED ? KINEO1_ENGINE_FACT.name : null'), 'legacy engine key is paired with the public name only when announced')
ok(!canonical.includes('80 créditos na inscrição'), 'stale trial-credit comment is removed')
ok(!canonical.includes('the only one available on the free tier'), 'engine prose no longer contradicts trial access')

const llms = read('app/llms.txt/route.ts')
ok(llms.includes('TRIAL_ACCESS.engineCoverage'), 'llms text derives engine coverage')
ok(llms.includes('Access does not mean the balance covers a full video.'), 'llms text explains access versus balance')
ok(llms.includes('After the trial, recurring free access is'), 'llms text distinguishes the recurring allowance')
// KINEO-FILME-GRATIS-15S-2026-09-29 — reancorado com motivo: sem cota anunciada o llms diz que não há filme grátis recorrente, e publica o filme que o trial paga.
// Reancorado 29/09 (revisão da E2b, texto achado 5): a decisão foi DEIXAR DE ANUNCIAR a cota, não negá-la (o mecanismo segue
// até a E4 e a recusa dele diz "comes back in 7 days"). A frase nova afirma só o que é verdade: o filme do trial é o único anunciado.
ok(llms.includes('The trial film is the only free film Kineo advertises') && !llms.includes('no recurring free films') && llms.includes('const freeFilm = TRIAL_ACCESS.freeFilm'), 'llms text states the trial film is the only advertised free film and the 15-second free film')
ok(!llms.includes('The generative engines below require a paid plan.'), 'live contradictory sentence is removed')
ok(llms.includes('wholeReferenceVideosCovered === 0'), 'insufficient balance is calculated rather than guessed')

const page = read('app/facts/page.tsx')
ok(page.includes("q: 'Can I try every Kineo video engine for free?'"), 'human fact sheet answers the buyer question')
ok(page.includes('TRIAL_COVERED_ENGINES'), 'human answer derives covered engines')
ok(page.includes('TRIAL_BALANCE_SHORT_ENGINES'), 'human answer derives balance-short engines')
// Reancorado 29/09 (revisão da E2b, texto achado 5): idem — sem negar o mecanismo que continua ligado.
ok(page.includes('recurring free access is') && page.includes('The trial film is the only free film Kineo advertises.') && !page.includes('no recurring free films'), 'human page distinguishes post-trial access')

const preview = read('docs/previews/AEO-TRIAL-ACCESS-TRUTH-2026-08-28.html')
for (const label of ['BEFORE · DESKTOP', 'AFTER · DESKTOP', 'BEFORE · MOBILE', 'AFTER · MOBILE']) {
  ok(preview.includes(label), `preview includes ${label}`)
}
ok(preview.includes('Unlocked ≠ covered by the balance'), 'preview shows the corrected mental model')
ok(preview.includes('Recurring free access'), 'preview names the second state')

console.log(`AEO trial access: ${checks}/${checks} checks passed`)
