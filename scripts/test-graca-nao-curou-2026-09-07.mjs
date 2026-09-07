// ═══════════════════════════════════════════════════════════════════════════
// GUARDIÃO — KINEO-GRACA-NAO-CUROU-2026-09-07 — a graça parou o sangramento,
// mas nunca curou as duas vítimas que ela mesma nomeia.
// ═══════════════════════════════════════════════════════════════════════════
// O que este arquivo impede, em uma frase: que a decisão "restaurar o plano de
// quem foi revogado antes da graça" volte a falhar ABERTA (restaurar quem não
// deve), que a cura toque crédito, ou que ela exista sem chamador.
//
// Medido em 07/09/2026: as duas assinaturas (US$ 24,90 AU · US$ 9,90 NG) com
// `has_paid=true`, `plan='free'`, `stripe_subscription_id` INTACTO e a Stripe
// ainda cobrando. Às 17:26:28Z a Stripe recusou a de NG de novo e o ramo da
// graça escreveu "acesso preservado" — sem user_id, para alguém já `free`.
//
// Quatro perigos concretos:
//  1. DECISÃO FALHANDO ABERTA. `lib/billing/dunningReconcile.ts` é importado DE
//     VERDADE (node 24 só tira tipos; o arquivo não tem `@/`) e executado
//     contra a VARIÁVEL que decide, com os dois casos reais.
//  2. CONTRATO SEM CHAMADOR (memória `contrato-de-servidor-sem-chamador`). O
//     webhook é lido com readFileSync e o ramo da graça tem de CHAMAR a
//     decisão, escrever SÓ `plan`+`is_pro`, e carregar `access_was_actually_held`.
//  3. ROTA ADMIN QUE ESCREVE SEM `confirm=APPLY`.
//  4. GUARDIÃO QUE NÃO RESISTE (memória `mutacao-precisa-provar-que-aplicou`).
//     Dez mutantes escritos EM DISCO; cada um prova que mudou o arquivo antes
//     de rodar, e o original volta no fim — inclusive em erro.
//
// Rodar: node scripts/test-graca-nao-curou-2026-09-07.mjs

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { register } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const LIB = join(root, 'lib', 'billing', 'dunningReconcile.ts')
const WEBHOOK = join(root, 'app', 'api', 'stripe', 'webhook', 'route.ts')
const ADMIN = join(root, 'app', 'api', 'admin', 'reconcile-dunning', 'route.ts')

// CRLF normalizado NA LEITURA das asserções (memória `guardiao-crlf-falso-vermelho`);
// a escrita dos mutantes usa o conteúdo cru, para devolver os bytes exatos.
const raw = (p) => readFileSync(p, 'utf8')
const norm = (s) => s.replace(/\r\n/g, '\n')

// ── O node não resolve `./subscriptionAccess` sem extensão em ESM. Um hook de
// resolução acrescenta `.ts` só a import relativo sem extensão — assim o
// arquivo REAL é importado, sem cópia e sem reescrita. (data: URL falha no
// node 24 do Windows; por isso o hook vai para um arquivo temporário.)
const hookDir = mkdtempSync(join(tmpdir(), 'kineo-graca-'))
const hookPath = join(hookDir, 'resolve-ts.mjs')
writeFileSync(
  hookPath,
  [
    'export async function resolve(specifier, context, next) {',
    "  if (/^\\.\\.?\\//.test(specifier) && !/\\.[a-z]+$/i.test(specifier)) {",
    "    try { return await next(specifier + '.ts', context) } catch {}",
    '  }',
    '  return next(specifier, context)',
    '}',
    '',
  ].join('\n'),
)
register(pathToFileURL(hookPath).href)

let total = 0
let failed = 0
function check(name, condition) {
  total += 1
  if (condition) return
  failed += 1
  console.error(`FAIL ${name}`)
}

// Cache-bust por query: cada import é um módulo novo para o node, então um
// mutante gravado em disco é lido de verdade, e não a cópia de antes.
let importSeq = 0
const importLib = () => import(`${pathToFileURL(LIB).href}?v=${++importSeq}`)

// ═══ 1. A DECISÃO, EXECUTADA ═════════════════════════════════════════════════
// Devolve a lista de falhas em vez de contar, para os mutantes reusarem.
function behaviorFailures(mod) {
  const f = []
  let n = 0
  const t = (name, cond) => { n += 1; if (!cond) f.push(name) }
  const { decideDunningReconcile: decide, stripeSubscriptionTier: tier } = mod

  // Os dois casos reais: assinatura viva == a do perfil, past_due, plan free.
  const AU = decide({
    hasPaid: true, plan: 'free', isPro: false,
    profileSubscriptionId: 'sub_1U0I7bIah5dxzSBfuMoK0qAA', liveSubscriptionId: 'sub_1U0I7bIah5dxzSBfuMoK0qAA',
    liveStatus: 'past_due', metadataTier: 'pro',
  })
  t('1.1 vítima AU (past_due, tier pro, plan free) → restore pro', AU.action === 'restore' && AU.tier === 'pro' && AU.reason === 'restaurar')
  const NG = decide({
    hasPaid: true, plan: 'free', isPro: false,
    profileSubscriptionId: 'sub_1TyTh1Iah5dxzSBfOq8MMFrP', liveSubscriptionId: 'sub_1TyTh1Iah5dxzSBfOq8MMFrP',
    liveStatus: 'past_due', metadataTier: 'starter',
  })
  t('1.2 vítima NG (past_due, tier starter, plan free) → restore starter', NG.action === 'restore' && NG.tier === 'starter')

  const base = {
    hasPaid: true, plan: 'free', isPro: false,
    profileSubscriptionId: 'sub_X', liveSubscriptionId: 'sub_X',
    liveStatus: 'past_due', metadataTier: 'starter',
  }
  // A Stripe desistiu: free está CERTO.
  for (const s of ['canceled', 'unpaid', 'incomplete', 'incomplete_expired', 'paused']) {
    const r = decide({ ...base, liveStatus: s })
    t(`1.3 ${s} → skip stripe_revogou`, r.action === 'skip' && r.reason === 'stripe_revogou' && r.tier === null)
  }
  // A recusa chegou atrasada e a assinatura já voltou a active: também restaura.
  const late = decide({ ...base, liveStatus: 'active' })
  t('1.4 active com plan free → restore (falha atrasada, estado vivo ganha)', late.action === 'restore')

  // Assinatura diferente nunca reescreve o tier do perfil.
  const diff = decide({ ...base, profileSubscriptionId: 'sub_A', liveSubscriptionId: 'sub_B' })
  t('1.5 assinatura diferente → skip assinatura_diferente', diff.action === 'skip' && diff.reason === 'assinatura_diferente')
  const noProfile = decide({ ...base, profileSubscriptionId: null })
  t('1.6 perfil sem assinatura → skip assinatura_diferente', noProfile.action === 'skip' && noProfile.reason === 'assinatura_diferente')
  const noLive = decide({ ...base, liveSubscriptionId: undefined })
  t('1.7 sem assinatura viva → skip assinatura_diferente', noLive.action === 'skip' && noLive.reason === 'assinatura_diferente')

  // Tier falha FECHADO — o default 'basic' do renewal NÃO vive aqui.
  for (const bad of [undefined, null, '', 'Pro', 'basic ', 'STARTER', 42, {}]) {
    const r = decide({ ...base, metadataTier: bad })
    t(`1.8 tier ${JSON.stringify(bad) ?? 'undefined'} → skip tier_desconhecido`, r.action === 'skip' && r.reason === 'tier_desconhecido' && r.tier === null)
    t(`1.9 stripeSubscriptionTier(${JSON.stringify(bad) ?? 'undefined'}) === null`, tier(bad) === null)
  }
  for (const good of ['starter', 'basic', 'pro', 'autopilot']) {
    t(`1.10 stripeSubscriptionTier('${good}') === '${good}'`, tier(good) === good)
    const r = decide({ ...base, metadataTier: good })
    t(`1.11 tier ${good} → restore ${good}`, r.action === 'restore' && r.tier === good)
  }

  // Quem nunca pagou não é restaurado — e é a PRIMEIRA porta.
  const never = decide({ ...base, hasPaid: false })
  t('1.12 has_paid=false → skip nunca_pagou', never.action === 'skip' && never.reason === 'nunca_pagou')
  const neverAndCanceled = decide({ ...base, hasPaid: false, liveStatus: 'canceled' })
  t('1.13 ordem: nunca_pagou vence stripe_revogou', neverAndCanceled.reason === 'nunca_pagou')

  // Já correto: nada a escrever.
  const ok = decide({ ...base, plan: 'starter', isPro: true })
  t('1.14 plan=tier e is_pro → already_ok', ok.action === 'already_ok' && ok.tier === 'starter')
  // Metade certa não é certo: plan bate mas is_pro caiu → restaura.
  const half = decide({ ...base, plan: 'starter', isPro: false })
  t('1.15 plan=tier mas is_pro=false → restore', half.action === 'restore')
  const otherTier = decide({ ...base, plan: 'basic', isPro: true })
  t('1.16 plan diferente do tier contratado → restore com o tier da Stripe', otherTier.action === 'restore' && otherTier.tier === 'starter')

  // A decisão nunca devolve tier em skip.
  t('1.17 skip nunca carrega tier', [diff, never, noProfile].every((r) => r.tier === null))
  return { f, n }
}

// ═══ 2. O CHAMADOR NO WEBHOOK ════════════════════════════════════════════════
function webhookFailures(text) {
  const f = []
  let n = 0
  const t = (name, cond) => { n += 1; if (!cond) f.push(name) }
  t('2.1 webhook importa a decisão de @/lib/billing/dunningReconcile',
    /import \{ decideDunningReconcile \} from '@\/lib\/billing\/dunningReconcile'/.test(text))

  // O ramo da graça: do `if (isDunning` até o warn "kept access" que o fecha.
  const start = text.indexOf('if (stripeSubscriptionIsDunning(failedSubscription.status)) {')
  const end = text.indexOf("console.warn('[stripe webhook] payment_failed kept access for subscription:'", start)
  t('2.2 o ramo da graça existe no invoice.payment_failed', start > 0 && end > start)
  const branch = start > 0 && end > start ? text.slice(start, end) : ''

  t('2.3 o dono é resolvido pela assinatura que falhou',
    /\.select\('id, plan, is_pro, has_paid'\)[\s\S]{0,80}?\.eq\('stripe_subscription_id', failedSubscriptionId\)/.test(branch))
  t('2.4 o evento held carrega o user_id do dono',
    /name: 'subscription_access_held_during_dunning',\s*\n\s*userId: dunningOwner\?\.id \?\? null,/.test(branch))
  t('2.5 o evento held carrega access_was_actually_held amarrado ao plan (não a uma constante)',
    /access_was_actually_held: dunningOwner !== null && dunningOwner\.plan !== 'free',/.test(branch))
  t('2.6 o evento held carrega owner_resolved e plan_at_event',
    /owner_resolved: dunningOwner !== null,/.test(branch) && /plan_at_event: dunningOwner\?\.plan \?\? null,/.test(branch))
  t('2.7 a decisão é CHAMADA dentro do ramo, com o status e o tier VIVOS',
    /const repair = decideDunningReconcile\(\{[\s\S]{0,400}?liveStatus: failedSubscription\.status,\s*\n\s*metadataTier: failedSubscription\.metadata\?\.tier,/.test(branch))
  t('2.8 o update de restauração só acontece com action === restore',
    /if \(repair\.action === 'restore' && repair\.tier\) \{[\s\S]{0,300}?\.update\(\{ plan: repair\.tier, is_pro: true \}\)\s*\n\s*\.eq\('id', dunningOwner\.id\)/.test(branch))
  t('2.9 o update escreve APENAS plan e is_pro',
    /\.update\(\{ plan: repair\.tier, is_pro: true \}\)/.test(branch))
  t('2.10 a cura NUNCA toca crédito nem token',
    !/video_credits/.test(branch) && !/cinematic_tokens/.test(branch))
  t('2.11 o evento de cura existe com versão, tier e previous_plan',
    /name: 'subscription_access_restored_after_wrong_revoke',[\s\S]{0,400}?version: 'stripe_dunning_repair_v1',[\s\S]{0,200}?previous_plan: dunningOwner\.plan,/.test(branch))
  t('2.12 erro na cura vira evento subscription_access_repair_failed, nunca throw',
    /catch \(err\) \{[\s\S]{0,700}?name: 'subscription_access_repair_failed',/.test(branch) &&
      !/throw new RetryableEntitlementError/.test(branch))
  t('2.13 o ramo não redigita o predicado do cobrador',
    !/=== 'past_due'/.test(branch))
  t('2.14 entitlementConfirmed segue true antes do ramo e o break segue depois',
    /entitlementConfirmed = true\s*\n\s*entitlementPending = false\s*\n\s*if \(stripeSubscriptionIsDunning/.test(text) &&
      /payment_failed kept access for subscription:', failedSubscriptionId, failedSubscription\.status\)\s*\n\s*break/.test(text))
  return { f, n }
}

// ═══ 3. A ROTA ADMIN: DRY-RUN POR PADRÃO ═════════════════════════════════════
function adminFailures(text) {
  const f = []
  let n = 0
  const t = (name, cond) => { n += 1; if (!cond) f.push(name) }
  t('3.1 guard admin igual às vizinhas (isAdminEmail + 403)',
    /if \(!user\?\.email \|\| !isAdminEmail\(user\.email\)\) \{\s*\n\s*return NextResponse\.json\(\{ error: 'forbidden' \}, \{ status: 403 \}\)/.test(text))
  t('3.2 confirm só é verdadeiro com a string exata APPLY',
    /const confirm = req\.nextUrl\.searchParams\.get\('confirm'\) === 'APPLY'/.test(text))
  const updates = text.match(/\.update\(/g) ?? []
  t('3.3 existe exatamente UM update na rota', updates.length === 1)
  t('3.4 o único update vive dentro de if (confirm && action === restore)',
    /if \(confirm && decision\.action === 'restore' && decision\.tier\) \{[\s\S]{0,300}?\.update\(\{ plan: decision\.tier, is_pro: true \}\)\s*\n\s*\.eq\('id', userId\)/.test(text))
  t('3.5 o update escreve APENAS plan e is_pro; crédito intacto',
    !/video_credits/.test(text) && !/cinematic_tokens/.test(text))
  t('3.6 nenhuma outra escrita (insert/upsert/delete/rpc)',
    !/\.(insert|upsert|delete|rpc)\(/.test(text))
  t('3.7 a rota usa a decisão pura, não a redigita',
    /decideDunningReconcile\(\{/.test(text) && !/=== 'past_due'/.test(text))
  t('3.8 Stripe indisponível numa pessoa → skip stripe_indisponivel e continue',
    /reason: 'stripe_indisponivel',[\s\S]{0,80}?\}\)\s*\n\s*continue/.test(text))
  t('3.9 nunca ecoa env nem segredo', !/process\.env/.test(text))
  t('3.10 os eventos são os mesmos do webhook',
    /name: 'subscription_access_restored_after_wrong_revoke'/.test(text) && /name: 'subscription_access_repair_failed'/.test(text))
  t('3.11 coorte = has_paid · plan free · assinatura não nula',
    /\.eq\('has_paid', true\)\s*\n\s*\.eq\('plan', 'free'\)\s*\n\s*\.not\('stripe_subscription_id', 'is', null\)/.test(text))
  return { f, n }
}

// ═══ 4. MUTANTES — cada um tem de ser escrito em disco E morrer ═════════════
const originals = new Map([[LIB, raw(LIB)], [WEBHOOK, raw(WEBHOOK)], [ADMIN, raw(ADMIN)]])
function restoreAll() {
  for (const [p, content] of originals) {
    try { if (raw(p) !== content) writeFileSync(p, content) } catch {}
  }
}
process.on('exit', restoreAll)
process.on('uncaughtException', (e) => { restoreAll(); console.error(e); process.exit(1) })

const MUTANTS = [
  { file: LIB, kind: 'lib', name: 'M1 a porta has_paid some',
    from: 'if (!input.hasPaid) {', to: 'if (false) {' },
  { file: LIB, kind: 'lib', name: 'M2 stripe_revogou some (canceled restauraria)',
    from: 'if (!stripeSubscriptionKeepsAccess(input.liveStatus)) {', to: 'if (false) {' },
  { file: LIB, kind: 'lib', name: "M3 tier desconhecido vira 'basic' (o default do renewal copiado)",
    from: "if (typeof metadataTier !== 'string') return null", to: "if (typeof metadataTier !== 'string') return 'basic'" },
  { file: LIB, kind: 'lib', name: 'M4 assinatura diferente deixa de travar',
    from: 'if (!profileSub || !liveSub || profileSub !== liveSub) {', to: 'if (!profileSub || !liveSub) {' },
  { file: LIB, kind: 'lib', name: 'M5 already_ok com metade certa (|| em vez de &&)',
    from: 'if (input.plan === tier && input.isPro) {', to: 'if (input.plan === tier || input.isPro) {' },
  { file: WEBHOOK, kind: 'webhook', name: 'M6 a cura do webhook passa a tocar crédito',
    from: '.update({ plan: repair.tier, is_pro: true })', to: '.update({ plan: repair.tier, is_pro: true, video_credits: 0 })' },
  { file: WEBHOOK, kind: 'webhook', name: 'M7 access_was_actually_held vira constante true',
    from: "access_was_actually_held: dunningOwner !== null && dunningOwner.plan !== 'free',", to: 'access_was_actually_held: true,' },
  { file: WEBHOOK, kind: 'webhook', name: 'M8 o update do webhook ignora a decisão',
    from: "if (repair.action === 'restore' && repair.tier) {", to: 'if (repair.tier) {' },
  { file: ADMIN, kind: 'admin', name: 'M9 a rota admin escreve sem confirm',
    from: "if (confirm && decision.action === 'restore' && decision.tier) {", to: "if (decision.action === 'restore' && decision.tier) {" },
  { file: ADMIN, kind: 'admin', name: 'M10 confirm invertido (escreve sem APPLY)',
    from: "searchParams.get('confirm') === 'APPLY'", to: "searchParams.get('confirm') !== 'APPLY'" },
]

async function failuresFor(kind) {
  if (kind === 'lib') return behaviorFailures(await importLib()).f
  if (kind === 'webhook') return webhookFailures(norm(raw(WEBHOOK))).f
  return adminFailures(norm(raw(ADMIN))).f
}
// Cada verificação de um bloco conta UMA vez e sai nomeada quando falha —
// nunca um número cravado à mão, que envelhece na primeira asserção nova.
function tally(label, { f, n }) {
  total += n
  failed += f.length
  for (const name of f) console.error(`FAIL ${name}`)
  console.log(`  ${label}: ${n - f.length}/${n}`)
}

console.log('\nKINEO — a graça não curou: decisão executada, chamador provado, mutantes em disco\n')

try {
  // Original: tudo verde, e cada verificação conta.
  tally('1. decisão executada', behaviorFailures(await importLib()))
  tally('2. chamador no webhook', webhookFailures(norm(raw(WEBHOOK))))
  tally('3. rota admin dry-run', adminFailures(norm(raw(ADMIN))))
  console.log('  4. mutantes em disco:')

  for (const m of MUTANTS) {
    const before = originals.get(m.file)
    const occurrences = before.split(m.from).length - 1
    check(`${m.name}: alvo existe exatamente 1x no original`, occurrences === 1)
    if (occurrences !== 1) continue
    const mutated = before.replace(m.from, m.to)
    writeFileSync(m.file, mutated)
    // Prova de aplicação: o disco tem de ter MUDADO (memória
    // `mutacao-precisa-provar-que-aplicou`). Sem isto, um mutante que não
    // grava devolve verde e se lê como guardião resistindo.
    const onDisk = raw(m.file)
    const applied = onDisk !== before && onDisk === mutated
    check(`${m.name}: mutante gravado em disco`, applied)
    if (!applied) { writeFileSync(m.file, before); continue }
    let fails = []
    try {
      fails = await failuresFor(m.kind)
    } finally {
      writeFileSync(m.file, before)
    }
    check(`${m.name}: MORTO (${fails.length} verificação(ões) reprovaram)`, fails.length > 0)
    check(`${m.name}: original restaurado byte a byte`, raw(m.file) === before)
    console.log(`     ${m.name} → morto (${fails.length} reprovação(ões))`)
  }
} finally {
  restoreAll()
  try { rmSync(hookDir, { recursive: true, force: true }) } catch {}
}

const mortos = MUTANTS.length
console.log(`\n${total - failed}/${total} verificações · ${mortos} mutantes escritos em disco`)
if (failed > 0) {
  console.error(`\n${failed} FALHA(S)`)
  process.exit(1)
}
console.log('OK — a graça agora cura quem ela deixou para trás, e só quem deve.\n')
