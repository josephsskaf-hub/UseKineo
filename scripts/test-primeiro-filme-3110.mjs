// KINEO-PRIMEIRO-FILME-3110 [TRAVA 8.2 — vai do fundador 31/10 "10 tarefas, já vamos fazer"] — guardião do conserto
// "o atalho 'faça seu primeiro filme' não abandona o filme que já está sendo feito".
// O DEFEITO (Supabase, só SELECT, 30 dias até 31/10): na tela de geração (/studio/create), no meio da preparação do 1º filme,
// "Build my 15s Seedance episode →" (TrialActiveBanner) e "Make my free film" (RegionPaidOnlyBanner) voltavam ao /studio com
// outro roteiro: 14 + 34 contas, 7 + 16 delas sem vídeo nenhum até hoje.
// Prova: (1) a régua pura (lib/growth/primeiroFilmeNaTela.ts) executada; (2) as duas faixas usam a régua no lugar certo, com o
// hook fora do &&; (3) os botões de COMPRAR não passaram a depender dela; (4) mutantes da régua e das faixas QUEBRAM o teste.
// Rodar: node scripts/test-primeiro-filme-3110.mjs
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n')
let pass = 0, fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ', m) } else { fail++; console.log('  FALHA', m) } }

function loadHelper(source) {
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const module = { exports: {} }
  new Function('module', 'exports', js)(module, module.exports)
  return module.exports
}

// ── (1) a régua pura ───────────────────────────────────────────────────────────────────────────────────────────────────
function helperChecks(h) {
  const r = []
  r.push(['/studio/create é tela de geração', h.isGenerateSurface('/studio/create') === true])
  r.push(['/studio/create/ (barra final) é tela de geração', h.isGenerateSurface('/studio/create/') === true])
  r.push(['/studio/create?prompt=x é tela de geração', h.isGenerateSurface('/studio/create?prompt=x') === true])
  r.push(['/generate (porteiro) é tela de geração', h.isGenerateSurface('/generate') === true])
  r.push(['/studio NÃO é tela de geração', h.isGenerateSurface('/studio') === false])
  r.push(['/studio/previa NÃO é tela de geração', h.isGenerateSurface('/studio/previa') === false])
  r.push(['/library NÃO é tela de geração', h.isGenerateSurface('/library') === false])
  r.push(['caminho nulo = não (a faixa segue como era)', h.isGenerateSurface(null) === false && h.isGenerateSurface(undefined) === false && h.isGenerateSurface('') === false])
  r.push(['atalho some em /studio/create', h.firstFilmDetourAllowed('/studio/create') === false])
  r.push(['atalho some em /generate', h.firstFilmDetourAllowed('/generate') === false])
  r.push(['atalho continua em /studio', h.firstFilmDetourAllowed('/studio') === true])
  r.push(['atalho continua em /library', h.firstFilmDetourAllowed('/library') === true])
  r.push(['atalho continua sem caminho', h.firstFilmDetourAllowed(null) === true])
  r.push(['marca', h.PRIMEIRO_FILME_MARCA === 'KINEO-PRIMEIRO-FILME-3110'])
  return r
}
const HELPER_SRC = read('lib/growth/primeiroFilmeNaTela.ts')
ok(!/^\s*import\s/m.test(HELPER_SRC), 'régua pura: sem imports')
for (const [m, c] of helperChecks(loadHelper(HELPER_SRC))) ok(c, `régua: ${m}`)

// ── (2) as faixas usam a régua ──────────────────────────────────────────────────────────────────────────────────────────
function trialBannerChecks(src) {
  const r = []
  r.push(['TrialActiveBanner importa a régua', src.includes("import { firstFilmDetourAllowed } from '@/lib/growth/primeiroFilmeNaTela'")])
  r.push(['TrialActiveBanner chama usePathname() sozinho (fora do &&)', /\n  const pathname = usePathname\(\)/.test(src) && !/&&[^\n]*usePathname\(/.test(src)])
  r.push(['o atalho = elegível E fora da tela de geração', src.includes('const firstDeliveryDetourShown = firstDelivery.eligible && firstFilmDetourAllowed(pathname)')])
  r.push(['o bloco verde do atalho só renderiza com o atalho permitido', /\{firstDeliveryDetourShown && \([^\n]*\n\s*<div\n\s*data-trial-first-delivery=/.test(src)])
  r.push(['o bloco verde NÃO renderiza só por estar elegível', !/\{firstDelivery\.eligible && \(\n\s*<div\n\s*data-trial-first-delivery=/.test(src)])
  r.push(['o clique também recusa na tela de geração', /const startFirstPremiumDelivery = \(\) => \{\n\s*if \(!firstDeliveryDetourShown\) return/.test(src)])
  // (3) comprar não mudou: o CTA de assinatura e a porta seguem sem a régua.
  r.push(['botão de assinatura (subscriptionCtaRef) não depende da régua', /ref=\{subscriptionCtaRef\}/.test(src) && !/firstDeliveryDetourShown[^\n]*subscriptionCta/.test(src)])
  r.push(['porta do 1º filme (TrialFirstFilmPayDoor) segue no critério de antes', src.includes('{firstDelivery.eligible && <TrialFirstFilmPayDoor')])
  return r
}
function regionBannerChecks(src) {
  const r = []
  r.push(['RegionPaidOnlyBanner importa a régua', src.includes("import { firstFilmDetourAllowed } from '@/lib/growth/primeiroFilmeNaTela'")])
  r.push(['"Make my free film" = fora do /studio E fora da tela de geração', src.includes('const freeFilmCtaShown = !onStudio && firstFilmDetourAllowed(path)')])
  r.push(['o link do filme grátis só renderiza com o atalho permitido', /\{freeFilmCtaShown \? \([^\n]*\n\s*<Link\n\s*href=\{REGION_FREE_FILM_HREF\}/.test(src)])
  r.push(['o link do filme grátis NÃO renderiza só por estar fora do /studio', !/\{!onStudio \? \(\n\s*<Link\n\s*href=\{REGION_FREE_FILM_HREF\}/.test(src)])
  // (3) comprar não mudou: "See plans" da faixa do filme grátis continua sem condição.
  const strip = src.slice(src.indexOf('function RegionFreeFilmStrip'), src.indexOf('function useFreeClipGift'))
  r.push(['"See plans" da faixa do filme grátis segue sem condição', /\) : null\}\n\s*<Link\n\s*href=\{REGION_PAID_ONLY_PLANS_HREF\}/.test(strip)])
  return r
}
const TRIAL_SRC = read('components/TrialActiveBanner.tsx')
const REGION_SRC = read('components/RegionPaidOnlyBanner.tsx')
for (const [m, c] of trialBannerChecks(TRIAL_SRC)) ok(c, m)
for (const [m, c] of regionBannerChecks(REGION_SRC)) ok(c, m)

// ── (4) mutantes: cada um tem de derrubar pelo menos uma checagem ───────────────────────────────────────────────────────
const someFails = (checks) => checks.some(([, c]) => !c)
const helperMutants = {
  'lista sem /studio/create': HELPER_SRC.replace("['/studio/create', '/generate']", "['/generate']"),
  'lista sem /generate': HELPER_SRC.replace("['/studio/create', '/generate']", "['/studio/create']"),
  'atalho sempre permitido': HELPER_SRC.replace('return !isGenerateSurface(pathname)', 'return true'),
  'barra final ignorada': HELPER_SRC.replace(".replace(/\\/+$/, '')", ''),
  'casa por prefixo (some em /studio também)': HELPER_SRC.replace('return GENERATE_SURFACE_PATHS.includes(limpo)', "return limpo.startsWith('/studio') || GENERATE_SURFACE_PATHS.includes(limpo)"),
}
for (const [name, mutated] of Object.entries(helperMutants)) {
  ok(mutated !== HELPER_SRC, `mutante da régua aplicável: ${name}`)
  let morto = false
  try { morto = someFails(helperChecks(loadHelper(mutated))) } catch { morto = true }
  ok(morto, `mutante da régua MORRE: ${name}`)
}
const trialMutants = {
  'bloco verde volta a firstDelivery.eligible': TRIAL_SRC.replace('{firstDeliveryDetourShown && ( // KINEO-PRIMEIRO-FILME-3110 — era `firstDelivery.eligible`', '{firstDelivery.eligible && ('),
  'atalho sem a régua': TRIAL_SRC.replace('firstDelivery.eligible && firstFilmDetourAllowed(pathname)', 'firstDelivery.eligible'),
  'hook dentro do &&': TRIAL_SRC.replace('  const pathname = usePathname()', '  const pathname = firstDelivery.eligible && usePathname()'),
  'clique sem a régua': TRIAL_SRC.replace('if (!firstDeliveryDetourShown) return', 'if (!firstDelivery.eligible) return'),
}
for (const [name, mutated] of Object.entries(trialMutants)) {
  ok(mutated !== TRIAL_SRC, `mutante do trial aplicável: ${name}`)
  ok(someFails(trialBannerChecks(mutated)), `mutante do trial MORRE: ${name}`)
}
const regionMutants = {
  'link volta a !onStudio': REGION_SRC.replace('{freeFilmCtaShown ? ( // KINEO-PRIMEIRO-FILME-3110 — era `!onStudio`', '{!onStudio ? ('),
  'régua fora da decisão': REGION_SRC.replace('!onStudio && firstFilmDetourAllowed(path)', '!onStudio'),
}
for (const [name, mutated] of Object.entries(regionMutants)) {
  ok(mutated !== REGION_SRC, `mutante da região aplicável: ${name}`)
  ok(someFails(regionBannerChecks(mutated)), `mutante da região MORRE: ${name}`)
}

console.log(`\n${pass} ok, ${fail} falha(s)`)
if (fail) process.exit(1)
