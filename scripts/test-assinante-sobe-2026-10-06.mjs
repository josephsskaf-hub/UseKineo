// KINEO-ASSINANTE-SOBE-2026-10-06 — guardião: assinante sem crédito sobe de plano NA HORA (MRR de expansão).
// Prova, EXECUTANDO lib/billing/subscriberUpgrade.ts e lib/growth/planSwitch.ts (puros):
//   (1) assinante ativo vê o PRÓXIMO degrau; os créditos de hoje são o delta que /api/stripe/change-plan credita e o
//       preço é o TIER_PRICES do degrau — os dois lidos de lib/checkoutPricing.ts, nunca digitados aqui;
//   (2) não-assinante (e PayPal / autopilot / leitura que falhou = assinatura não confirmada) não vê nada;
//   (3) Studio (topo) e teste de 7 dias veem só a recarga; interruptor desligado = nada;
//   (4) a peça troca pela rota de troca (switchPlan → POST /api/stripe/change-plan) depois de confirmar, nunca vai ao
//       checkout, e passa as fontes (TIER_CREDITS, TIER_PRICES, canPurchaseCreditTopup) sem número digitado;
//   (5) o modal do /studio/create pinta o empurrão SÓ no ramo de assinante, e as linhas de plano (o caminho do
//       /api/stripe/checkout?tier=) somem para o assinante; no /studio, o clipe liga o empurrão só no 402;
//   (6) as frases existem nas 16 línguas com os mesmos marcadores;
//   (7) mutantes: cada regra quebrada fica vermelha — e cada mutante prova que aplicou.
// Estilo readFileSync + transpile (molde scripts/test-clipe-gratis-regiao-2026-10-05.mjs).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const ts = require(path.join(ROOT, 'node_modules', 'typescript'))
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }

/** Carrega um módulo TS puro; imports relativos ('./x') resolvem para o .ts vizinho. Qualquer outro import = erro. */
function load(rel, over = {}) {
  const src = (over[rel] ?? read(rel)).replace(/\r\n/g, '\n')
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const mod = { exports: {} }
  const req = (name) => {
    if (!name.startsWith('./')) throw new Error(`${rel}: import inesperado ${name} (módulo precisa ser puro)`)
    return load(path.posix.join(path.posix.dirname(rel), name.slice(2) + '.ts'), over)
  }
  new Function('module', 'exports', 'require', js)(mod, mod.exports, req)
  return mod.exports
}

const LIB = 'lib/billing/subscriberUpgrade.ts'
const SWITCH = 'lib/growth/planSwitch.ts'
const PRICING = 'lib/checkoutPricing.ts'
const ROUTE = 'app/api/stripe/change-plan/route.ts'
const NUDGE = 'components/billing/SubscriberUpgradeNudge.tsx'
const GEN = 'app/(dashboard)/generate/GenerateClient.tsx'
const STUDIO = 'app/(dashboard)/studio/StudioClient.tsx'
const COPYFILE = 'lib/ui/refinementCopy.json'
const TIERS = ['starter', 'basic', 'pro']

/** Linha inteira (com ou sem comentário no fim), contada: a âncora não casa com prefixo nem com comentário que cita o código. */
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const lineCount = (src, line) => (src.match(new RegExp(`^[ \\t]*${esc(line)}[ \\t]*(//.*)?$`, 'gm')) || []).length
const lineIndex = (src, line) => { const m = new RegExp(`^[ \\t]*${esc(line)}[ \\t]*(//.*)?$`, 'm').exec(src); return m ? m.index : -1 }

/** TIER_CREDITS / TIER_PRICES lidos da fonte (o bloco do export, linha a linha). */
function tierTable(src, name) {
  const start = src.indexOf(`export const ${name}:`)
  if (start < 0) return null
  const block = src.slice(start, src.indexOf('\n}\n', start))
  const out = {}
  for (const tier of TIERS) {
    const re = name === 'TIER_PRICES' ? new RegExp(`^  ${tier}: \\{ usd: (\\d+) \\},$`, 'm') : new RegExp(`^  ${tier}: (\\d+),$`, 'm')
    const m = block.match(re)
    if (!m) return null
    out[tier] = Number(m[1])
  }
  return out
}

function problems(over = {}) {
  const p = []
  const src = (rel) => (over[rel] ?? read(rel)).replace(/\r\n/g, '\n')
  let L
  let S
  try { L = load(LIB, over) } catch (err) { return [`lib não carrega crua: ${err.message}`] }
  try { S = load(SWITCH, over) } catch (err) { return [`planSwitch não carrega cru: ${err.message}`] }

  // ── (1)(2)(3) a decisão, executada com os números da fonte ─────────────────────────────────────────────────────
  const pricing = src(PRICING)
  const credits = tierTable(pricing, 'TIER_CREDITS')
  const prices = tierTable(pricing, 'TIER_PRICES')
  if (!credits || !prices) return ['não achei TIER_CREDITS / TIER_PRICES em lib/checkoutPricing.ts (reancore a leitura)']
  if (!(credits.starter < credits.basic && credits.basic < credits.pro)) p.push('a escada de créditos da fonte não sobe (starter < creator < studio)')
  if (L.SUBSCRIBER_UPGRADE_ENABLED !== true) p.push('interruptor SUBSCRIBER_UPGRADE_ENABLED desligado')
  if (L.nextTierUp('starter') !== 'basic' || L.nextTierUp('basic') !== 'pro' || L.nextTierUp('pro') !== null || L.nextTierUp(null) !== null) {
    p.push('escada errada: Starter → Creator → Studio → (nada)')
  }
  const offer = (state, topupAllowed, extra = {}) => L.subscriberUpgradeOffer({ state, credits, pricesMinor: prices, topupAllowed, ...extra })
  const ativo = (tier) => ({ subscribed: true, tier, status: 'active' })
  const st = offer(ativo('starter'), true)
  if (st.kind !== 'switch' || st.to !== 'basic' || st.creditsToday !== credits.basic - credits.starter || st.priceMinor !== prices.basic || st.topup !== true) {
    p.push(`Starter ativo devia ver Creator +${credits.basic - credits.starter} hoje a ${prices.basic}¢ — veio ${JSON.stringify(st)}`)
  }
  const cr = offer(ativo('basic'), true)
  if (cr.kind !== 'switch' || cr.to !== 'pro' || cr.creditsToday !== credits.pro - credits.basic || cr.priceMinor !== prices.pro) {
    p.push(`Creator ativo devia ver Studio +${credits.pro - credits.basic} hoje a ${prices.pro}¢ — veio ${JSON.stringify(cr)}`)
  }
  if (offer(ativo('pro'), true).kind !== 'topup_only') p.push('Studio (topo) devia ver só a recarga')
  if (offer(ativo('pro'), false).kind !== 'none') p.push('Studio sem recarga aceita pelo cobrador não pode ver nada')
  if (offer(S.PLAN_SWITCH_EMPTY, true).kind !== 'none') p.push('não-assinante (PLAN_SWITCH_EMPTY) não pode ver nada')
  if (offer({ subscribed: false, tier: 'starter', status: null }, true).kind !== 'none') p.push('assinatura não confirmada pelo servidor (subscribed:false) não pode ver nada')
  if (offer({ subscribed: true, tier: 'autopilot', status: 'active' }, true).kind !== 'none') p.push('plano fora da escada (autopilot) não pode ver nada')
  if (offer({ subscribed: true, tier: 'starter', status: 'trialing' }, true).kind !== 'topup_only') p.push('teste de 7 dias devia ver só a recarga (a troca no teste não credita nada hoje)')
  if (offer(ativo('starter'), true, { enabled: false }).kind !== 'none') p.push('enabled:false não desliga')
  if (L.planFromSwitchState(ativo('pro')) !== 'pro' || L.planFromSwitchState({ subscribed: true, tier: 'basic', status: 'trialing' }) !== 'basic_trial' || L.planFromSwitchState(S.PLAN_SWITCH_EMPTY) !== null) {
    p.push('planFromSwitchState não devolve o plano do perfil (pro | basic_trial | null)')
  }
  if (L.fillCopy('{plan} {plan} $1 +{credits}', { plan: 'Creator', credits: 90 }) !== 'Creator Creator $1 +90') p.push('fillCopy não preenche todos os marcadores')

  // a rota credita exatamente esse delta e grava exatamente esse preço (senão a tela promete o que a rota não faz)
  const route = src(ROUTE)
  if (lineCount(route, "const delta = !trialing && currentTier ? Math.max(0, TIER_CREDITS[target] - TIER_CREDITS[currentTier]) : 0") !== 1) {
    p.push('a rota de troca não credita mais o delta TIER_CREDITS[alvo] − TIER_CREDITS[atual] (a promessa "+N today" ficaria falsa)')
  }
  if (lineCount(route, 'unit_amount: TIER_PRICES[target].usd,') !== 1) p.push('a rota de troca não grava mais TIER_PRICES[alvo].usd (o preço mostrado ficaria falso)')
  // e o helper troca pela rota de troca, por POST
  const sw = src(SWITCH)
  const iPost = lineIndex(sw, "const res = await fetch('/api/stripe/change-plan', {")
  if (iPost < 0 || !/^\s*method: 'POST',$/m.test(sw.slice(iPost, iPost + 200))) p.push('switchPlan não faz mais POST /api/stripe/change-plan')

  // ── (4) a peça ─────────────────────────────────────────────────────────────────────────────────────────────────
  const nudge = src(NUDGE)
  for (const line of [
    "import { TIER_CREDITS, TIER_PRICES, formatCheckoutMoney } from '@/lib/checkoutPricing'",
    "import { canPurchaseCreditTopup } from '@/lib/growth/topupEligibility'",
    "import { PLAN_SWITCH_EMPTY, fetchPlanSwitchState, planSwitchErrorText, switchPlan, type PlanSwitchState } from '@/lib/growth/planSwitch'",
    'void fetchPlanSwitchState().then((s) => { if (alive) setState(s) })',
    'const plan = planFromSwitchState(current)',
    'credits: TIER_CREDITS,',
    'pricesMinor: { starter: TIER_PRICES.starter.usd, basic: TIER_PRICES.basic.usd, pro: TIER_PRICES.pro.usd },',
    'topupAllowed: canPurchaseCreditTopup(plan),',
    "const visible = offer.kind === 'switch' || (offer.kind === 'topup_only' && topup)",
    'const result = await switchPlan(offer.to)',
  ]) if (lineCount(nudge, line) !== 1) p.push(`peça sem a linha "${line}" (uma vez)`)
  const iConfirm = lineIndex(nudge, "if (typeof window !== 'undefined' && !window.confirm(fillCopy(ui(COPY.confirm), { plan: name, price, credits: offer.creditsToday }))) return")
  const iSwitch = lineIndex(nudge, 'const result = await switchPlan(offer.to)')
  if (iConfirm < 0) p.push('a troca não pede confirmação (preço, créditos e rateio) antes')
  else if (iSwitch < 0 || iConfirm > iSwitch) p.push('a confirmação não vem ANTES da troca')
  if (nudge.includes('/api/stripe/checkout')) p.push('a peça menciona /api/stripe/checkout — assinante nunca vai ao checkout de plano')
  if (/location\.(href|assign|replace)/.test(nudge)) p.push('a peça navega sozinha (location.*) — a troca é por POST, a recarga pelo modal existente')
  if (/\$\s?\d/.test(nudge)) p.push('preço digitado na peça ($ + dígito)')
  if (/[+]\s?\d+\s*(credits|cr)\b/.test(nudge)) p.push('créditos digitados na peça (+N credits)')
  for (const key of ['switchCta', 'terms', 'confirm', 'switching', 'done', 'keepCreating', 'comparePlans', 'addCredits']) {
    if (!nudge.includes(`COPY.${key}`)) p.push(`a peça não usa a frase COPY.${key}`)
  }
  if (!nudge.includes('ui(error)') || lineCount(nudge, 'setError(planSwitchErrorText(result.error))') !== 1) p.push('o erro da troca não sai pelo texto honesto traduzido (planSwitchErrorText → ui)')

  // ── (5) as paredes ─────────────────────────────────────────────────────────────────────────────────────────────
  const gen = src(GEN)
  if (!/^import SubscriberUpgradeNudge, \{ SUBSCRIBER_UPGRADE_ENABLED \} from '@\/components\/billing\/SubscriberUpgradeNudge'( \/\/.*)?$/m.test(gen)) p.push('GenerateClient não importa a peça e o interruptor')
  const iModal = gen.indexOf('\nfunction UpgradeModal({')
  const iUrgency = gen.indexOf('\nfunction UrgencyModal({')
  if (iModal < 0 || iUrgency < iModal) p.push('não achei a função UpgradeModal inteira (reancore)')
  else {
    const modal = gen.slice(iModal, iUrgency)
    const NUDGE_LINE = '{isSubscriber && <SubscriberUpgradeNudge surface="generate_upgrade_modal" tone="dark" onDone={onClose} />}'
    const GUARD_LINE = 'if (!tier || (isSubscriber && SUBSCRIBER_UPGRADE_ENABLED)) return null'
    if (lineCount(modal, NUDGE_LINE) !== 1) p.push('modal: o empurrão não está (uma vez) preso a isSubscriber')
    if ((modal.match(/<SubscriberUpgradeNudge\b/g) || []).length !== 1) p.push('modal: mais de um empurrão (ou nenhum)')
    const iMap = modal.indexOf('{PLAN_LIST.map((plan) => {')
    const iGuard = lineIndex(modal, GUARD_LINE)
    const iUpgrade = modal.indexOf('onUpgrade(tier)')
    if (lineCount(modal, GUARD_LINE) !== 1 || iGuard < 0) p.push('modal: as linhas de plano não somem para o assinante (levariam ao /api/stripe/checkout?tier=)')
    else if (iMap < 0 || iGuard < iMap || iUpgrade < iGuard) p.push('modal: a guarda do assinante não fica dentro das linhas de plano, antes do onUpgrade(tier)')
    if ((modal.match(/onUpgrade\(tier\)/g) || []).length !== 1) p.push('modal: onUpgrade(tier) aparece fora das linhas de plano guardadas')
    if (iMap >= 0 && lineIndex(modal, NUDGE_LINE) > iMap) p.push('modal: o empurrão devia ficar acima das linhas de plano')
  }
  const studio = src(STUDIO)
  if (!/^import SubscriberUpgradeNudge from '@\/components\/billing\/SubscriberUpgradeNudge'( \/\/.*)?$/m.test(studio)) p.push('StudioClient não importa a peça')
  if (lineCount(studio, "if (!r.ok || !j.render_id) { setClipState({ phase: 'failed', error: j.error || 'Could not start the clip.', noCredits: r.status === 402 }); return }") !== 1) {
    p.push('clipe do /studio: a falha não marca o 402 (noCredits)')
  }
  const CLIP_LINE = "{clipState.phase === 'failed' && clipState.noCredits && <SubscriberUpgradeNudge surface=\"studio_clip_402\" topup onDone={(b) => { if (typeof b === 'number') setBalance(b); setClipState({ phase: 'idle' }) }} />}"
  if (lineCount(studio, CLIP_LINE) !== 1 || (studio.match(/<SubscriberUpgradeNudge\b/g) || []).length !== 1) p.push('clipe do /studio: o empurrão não está (uma vez) preso ao 402')
  else {
    const iResult = studio.indexOf('data-testid="clip-result"')
    const iClip = lineIndex(studio, CLIP_LINE)
    if (iResult < 0 || iClip < iResult) p.push('clipe do /studio: o empurrão saiu da caixa do resultado do clipe')
  }

  // ── (6) as frases, nas 16 línguas ──────────────────────────────────────────────────────────────────────────────
  let copy
  try { copy = JSON.parse(src(COPYFILE)) } catch (err) { return [...p, `refinementCopy.json não é JSON: ${err.message}`] }
  const langs = Object.keys(copy)
  if (langs.length !== 16 || !langs.includes('en')) p.push(`refinementCopy com ${langs.length} línguas, não 16`)
  const marks = (s) => (String(s).match(/\{[a-z]+\}/g) || []).sort().join(',')
  const C = L.SUBSCRIBER_UPGRADE_COPY ?? {}
  const keys = Object.entries(C).filter(([id]) => id !== 'addCredits').map(([, en]) => en)
  if (keys.length !== 7) p.push(`esperava 7 frases novas no SUBSCRIBER_UPGRADE_COPY, achei ${keys.length}`)
  const errors = ['annual_needs_support', 'paypal_subscription', 'same_plan', 'no_subscription', 'qualquer_outro'].map((code) => S.planSwitchErrorText(code))
  for (const en of [...keys, ...errors]) {
    for (const lang of langs) {
      const v = copy[lang]?.[en]
      if (typeof v !== 'string' || !v.trim()) { p.push(`frase sem tradução em ${lang}: "${en}"`); continue }
      if (lang === 'en' && v !== en) p.push(`en não é identidade: "${en}"`)
      if (marks(v) !== marks(en)) p.push(`${lang}: marcadores de "${en}" viraram ${marks(v)}`)
    }
  }
  // 'Add credits →' já vive nos dicionários da interface (es, hi e as 13 do lib/ui/interface)
  const addKey = `'${C.addCredits}': '`
  for (const rel of ['lib/ui/interfaceLabels.ts', 'lib/ui/interfaceHindi.ts', ...['pt', 'fr', 'de', 'it', 'nl', 'pl', 'tr', 'ru', 'uk', 'ar', 'ur', 'id', 'vi'].map((l) => `lib/ui/interface/${l}.ts`)]) {
    if (!src(rel).includes(addKey)) p.push(`"${C.addCredits}" sem tradução em ${rel}`)
  }
  return p
}

console.log('TESTE assinante sem crédito sobe de plano na hora — 06/10')
const real = problems()
ok(real.length === 0, '(1–6) próximo degrau com números da fonte, não-assinante sem nada, Studio/teste só recarga, troca por POST com confirmação, paredes ligadas só no ramo do assinante, 16 línguas' + (real.length ? ' → ' + real.join(' | ') : ''))

// ── (7) mutantes — cada um prova que aplicou e que derruba o guardião ──────────────────────────────────────────
const PT_KEY = '"Switch to {plan} now — +{credits} credits today": "Mude para o {plan} agora — +{credits} créditos hoje",'
const mutants = [
  ['M1 Starter pula direto para o Studio', LIB, 'return i >= 0 && i < SUBSCRIBER_LADDER.length - 1 ? SUBSCRIBER_LADDER[i + 1] : null', 'return i >= 0 && i < SUBSCRIBER_LADDER.length - 1 ? SUBSCRIBER_LADDER[SUBSCRIBER_LADDER.length - 1] : null'],
  ['M2 "+N today" vira o grant cheio do degrau', LIB, 'const creditsToday = Math.floor(input.credits[to]) - Math.floor(input.credits[from])', 'const creditsToday = Math.floor(input.credits[to])'],
  // KINEO-TROCA-BUSINESS-2026-10-10 — re-ancorado: a guarda passou a comparar como string (o estado da troca também traz 'business').
  ['M3 não-assinante passa a ver', LIB, "if (!state.subscribed || !state.tier || !(SUBSCRIBER_LADDER as readonly string[]).includes(state.tier)) return { kind: 'none' }", "if (!state.tier || !(SUBSCRIBER_LADDER as readonly string[]).includes(state.tier)) return { kind: 'none' }"],
  ['M4 o topo ganha um degrau inexistente', LIB, 'return i >= 0 && i < SUBSCRIBER_LADDER.length - 1 ? SUBSCRIBER_LADDER[i + 1] : null', 'return i >= 0 && i < SUBSCRIBER_LADDER.length ? SUBSCRIBER_LADDER[i + 1] : null'],
  ['M5 Studio perde a recarga', LIB, "const topupOnly: SubscriberUpgradeOffer = input.topupAllowed ? { kind: 'topup_only', from } : { kind: 'none' }", "const topupOnly: SubscriberUpgradeOffer = { kind: 'none' }"],
  ['M6 teste de 7 dias ganha a troca (que não credita nada hoje)', LIB, "if (!to || state.status !== 'active') return topupOnly", 'if (!to) return topupOnly'],
  ['M7 interruptor desligado', LIB, 'export const SUBSCRIBER_UPGRADE_ENABLED = true', 'export const SUBSCRIBER_UPGRADE_ENABLED = false'],
  ['M8 preço digitado na peça', NUDGE, 'pricesMinor: { starter: TIER_PRICES.starter.usd, basic: TIER_PRICES.basic.usd, pro: TIER_PRICES.pro.usd },', 'pricesMinor: { starter: 1290, basic: 2990, pro: 5490 },'],
  ['M9 créditos digitados na peça', NUDGE, 'credits: TIER_CREDITS,', 'credits: { starter: 60, basic: 150, pro: 300 },'],
  ['M10 a peça manda o assinante ao checkout', NUDGE, 'const result = await switchPlan(offer.to)', "window.location.href = `/api/stripe/checkout?tier=${offer.to}`; const result = { ok: false as const, error: 'redirect' }"],
  ['M11 recarga por outra régua que a do cobrador', NUDGE, 'topupAllowed: canPurchaseCreditTopup(plan),', 'topupAllowed: true,'],
  ['M12 pinta sem assinatura confirmada', NUDGE, "const visible = offer.kind === 'switch' || (offer.kind === 'topup_only' && topup)", 'const visible = true'],
  ['M13 troca sem confirmação', NUDGE, "if (typeof window !== 'undefined' && !window.confirm(fillCopy(ui(COPY.confirm), { plan: name, price, credits: offer.creditsToday }))) return", ''],
  ['M14 modal: linhas de plano voltam para o assinante (checkout)', GEN, 'if (!tier || (isSubscriber && SUBSCRIBER_UPGRADE_ENABLED)) return null', 'if (!tier) return null'],
  ['M15 modal: empurrão para todo mundo', GEN, '{isSubscriber && <SubscriberUpgradeNudge surface="generate_upgrade_modal" tone="dark" onDone={onClose} />}', '{<SubscriberUpgradeNudge surface="generate_upgrade_modal" tone="dark" onDone={onClose} />}'],
  ['M16 clipe: empurrão sem o 402', STUDIO, "{clipState.phase === 'failed' && clipState.noCredits && <SubscriberUpgradeNudge", "{clipState.phase === 'failed' && <SubscriberUpgradeNudge"],
  ['M17 tradução some em pt', COPYFILE, PT_KEY + '\n', ''],
  ['M18 tradução perde o marcador {plan}', COPYFILE, '"Mude para o {plan} agora — +{credits} créditos hoje"', '"Mude para o plano agora — +{credits} créditos hoje"'],
]
for (const [label, file, from, to] of mutants) {
  const srcText = read(file)
  if (!srcText.includes(from)) { ok(false, `(${label}) âncora do mutante não encontrada — reancore`); continue }
  const mutated = srcText.replace(from, to)
  if (mutated === srcText || (to && !mutated.includes(to))) { ok(false, `(${label}) o mutante não aplicou`); continue }
  let bitten = false
  try {
    bitten = problems({ [file]: mutated }).length > 0
  } catch (err) {
    console.log(`    (mutante lançou: ${err instanceof Error ? err.message : String(err)})`)
    bitten = true
  }
  ok(bitten, `(${label}) → vermelho`)
}

console.log(`\n  RESULTADO: ${pass} ok · ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
