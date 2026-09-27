#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════════════
// GUARDIÃO — CTAs DO TRIAL: STARTER PRIMEIRO, TESTE REVERSÍVEL POR CONSTANTE
// (sprint 16h · V3 · 27/09/2026)
//
// O QUE ELE PROTEGE, e por que cada trava existe:
//
//  1. UMA CONSTANTE decide o plano do botão principal das duas superfícies de
//     trial que pedem dinheiro (banner do trial ativo + modal de fim de
//     trial): lib/growth/trialCtaTier.ts, TRIAL_CTA_PRIMARY_TIER = 'starter'.
//     Reverter o teste é UMA linha lá — nunca uma caça a literais nas telas.
//  2. O LITERAL ANTIGO MORREU (=0): nenhum `launch('basic'` no botão principal,
//     nenhum "Keep Creator after the trial", nenhum "Continue on Creator" no
//     código (comentários históricos não contam).
//  3. NADA É REDIGITADO: preço, créditos, filmes/mês e preço por filme derivam
//     de getTierPrice / formatCheckoutMoney / TIER_CREDITS com o tier da
//     constante — o teste não pode abrir a porta por onde um número volta.
//  4. O CREATOR NÃO SOME: vira link secundário ("need more? Creator · N cr",
//     N = TIER_CREDITS.basic) com o destino histórico, e só existe quando o
//     principal é OUTRO plano (com a constante em 'basic' o link some sozinho).
//  5. O EVENTO DIZ A VERDADE: `tier` real do botão + `cta_role`
//     ('primary' | 'secondary') nos dois eventos de clique, e o evento de
//     impressão do banner recebe o tier que o botão pinta (a política deixou
//     de gravar 'basic' como literal).
//  6. MUTANTE: com a constante em 'basic', o que a tela pinta MUDA — rótulo,
//     destino e presença do link secundário —, provado a partir dos templates
//     lidos do próprio componente, não de uma cópia deles aqui.
//
// Estilo readFileSync de propósito: guardião que importa com alias `@/` morre
// no import antes da 1ª verificação (memória `guardioes-com-alias-nao-rodam`).
// Toda leitura normaliza CRLF (memória `guardiao-crlf-falso-vermelho`).
// ════════════════════════════════════════════════════════════════════════════
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (p) => readFileSync(join(ROOT, p), 'utf8').replace(/\r\n/g, '\n')
const requireFromRepo = createRequire(join(ROOT, 'package.json'))
const ts = requireFromRepo('typescript')

const TIER_PATH = 'lib/growth/trialCtaTier.ts'
const BANNER_PATH = 'components/TrialActiveBanner.tsx'
const MODAL_PATH = 'components/TrialDowngradeModal.tsx'
const POLICY_PATH = 'lib/growth/trialActiveSubscriptionCta.ts'

const tierSrc = read(TIER_PATH)
const banner = read(BANNER_PATH)
const modal = read(MODAL_PATH)
const policy = read(POLICY_PATH)

let ok = 0
let bad = 0
const check = (cond, label) => {
  if (cond) {
    ok += 1
    console.log(`  ✓ ${label}`)
  } else {
    bad += 1
    console.log(`  ✗ ${label}`)
  }
}

// Comentários de linha inteira e blocos /* */ fora: só código conta na
// contagem de literal antigo. (Não serve para varrer POSIÇÃO — memória
// `semcomentarios-nao-serve-para-varrer-posicao` — e aqui só conta presença.)
const semComentarios = (s) =>
  s
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !/^\s*\/\//.test(l))
    .join('\n')

// Carrega o módulo PURO da constante (transpile + Function, sem require real).
function loadTierModule(source) {
  const out = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const box = { exports: {} }
  new Function('module', 'exports', 'require', out)(box, box.exports, () => {
    throw new Error('lib/growth/trialCtaTier.ts tem de continuar puro (sem import)')
  })
  return box.exports
}

// Recorta um bloco entre duas âncoras (a segunda procurada DEPOIS da primeira).
function slice(src, startAnchor, endAnchor) {
  const start = src.indexOf(startAnchor)
  if (start < 0) return null
  const end = src.indexOf(endAnchor, start + startAnchor.length)
  if (end < 0) return null
  return src.slice(start, end)
}

// ── [1] A constante ─────────────────────────────────────────────────────────
console.log('\n[1] A constante: pura, tipada, e hoje = starter')
check(
  /^export const TRIAL_CTA_PRIMARY_TIER: 'starter' \| 'basic' = 'starter'$/m.test(tierSrc),
  'TRIAL_CTA_PRIMARY_TIER é tipada como starter|basic e vale starter',
)
check(!/^import /m.test(tierSrc), 'o arquivo da constante não importa nada (puro)')
check(/reverter/i.test(tierSrc) && /27\/09/.test(tierSrc), 'o arquivo explica o teste de 27/09 e como reverter')
const tier = loadTierModule(tierSrc)
check(tier.TRIAL_CTA_PRIMARY_TIER === 'starter', 'o módulo carregado devolve starter')
check(
  tier.TRIAL_CTA_TIER_NAME?.starter === 'Starter' && tier.TRIAL_CTA_TIER_NAME?.basic === 'Creator',
  'a tabela de nomes cobre os dois tiers com os nomes públicos',
)

// ── [2] As duas telas importam a constante ──────────────────────────────────
console.log('\n[2] As duas superfícies leem da MESMA constante')
const IMPORT = /import \{ TRIAL_CTA_PRIMARY_TIER, TRIAL_CTA_TIER_NAME \} from '@\/lib\/growth\/trialCtaTier'/
check(IMPORT.test(banner), 'o banner importa TRIAL_CTA_PRIMARY_TIER + nome')
check(IMPORT.test(modal), 'o modal importa TRIAL_CTA_PRIMARY_TIER + nome')

// ── [3] Banner: botão principal ─────────────────────────────────────────────
console.log('\n[3] Banner — o botão principal vende o tier da constante')
const bannerCode = semComentarios(banner)
const bannerPrimary = slice(banner, '<button\n        ref={subscriptionCtaRef}', '</button>}')
check(bannerPrimary !== null, 'o bloco do botão principal do banner foi recortado')
const bp = bannerPrimary ?? ''
check(/checkout\.launch\(\s*primaryCtaTier,/.test(bp), 'o launch principal usa primaryCtaTier (derivado da constante)')
// O bloco carrega um comentário HISTÓRICO que cita o launch antigo; só código conta.
check(!/launch\(\s*'basic'/.test(semComentarios(bp)), "não existe launch('basic' no botão principal")
check(!/tier: 'basic'/.test(bp), "não existe tier: 'basic' no botão principal")
check((bp.match(/tier: primaryCtaTier/g) ?? []).length >= 2, 'evento e telemetria do launch levam o tier real do botão')
check(bp.includes("cta_role: 'primary'"), 'o clique principal se declara primary')
check(
  bp.includes('`/api/stripe/checkout?tier=${TRIAL_CTA_PRIMARY_TIER}&intro=1`'),
  'o destino da queda (fora da porta de $1) leva o tier da constante',
)
check(
  bp.includes('`Continue on ${primaryTierName} after the trial — ${priceLabel}/mo`'),
  'o rótulo nasce do nome do tier + preço derivado',
)
check(
  /const primaryCtaTier: 'starter' \| 'basic' = subscriptionDoor\.visible \? 'basic' : TRIAL_CTA_PRIMARY_TIER/.test(banner),
  'o tier efetivo cede à porta de $1 (produto de Creator) e fora dela é a constante',
)
check(banner.includes('const primaryTierName = TRIAL_CTA_TIER_NAME[TRIAL_CTA_PRIMARY_TIER]'), 'o nome vem da tabela, pela constante')
check(banner.includes('hasIntroOffer(TRIAL_CTA_PRIMARY_TIER, currency, region)'), 'a elegibilidade de intro pergunta pelo tier da constante')
check(banner.includes('getTierPrice(TRIAL_CTA_PRIMARY_TIER, currency, region)'), 'o preço do botão vem de getTierPrice(constante)')
check(banner.includes('getIntroPrice(TRIAL_CTA_PRIMARY_TIER, currency, region)'), 'o preço de intro vem de getIntroPrice(constante)')
check(!bannerCode.includes('Keep Creator after the trial'), 'o rótulo antigo "Keep Creator after the trial" morreu no código (=0)')
check(
  /trialActiveSubscriptionCtaViewMetadata\(\{[^}]*tier: TRIAL_CTA_PRIMARY_TIER/.test(banner),
  'a impressão do banner recebe o tier que o botão pinta',
)

// ── [4] Banner: link secundário de Creator ──────────────────────────────────
console.log('\n[4] Banner — o Creator continua na tela, como link secundário')
check(
  banner.includes("const creatorLinkRendered = !subscriptionDoor.visible && TRIAL_CTA_PRIMARY_TIER !== 'basic'"),
  'o link só existe quando o principal é outro plano (e fora da porta)',
)
check(banner.includes('{!firstDelivery.eligible && creatorLinkRendered && ('), 'o link obedece à mesma trava de primeiro filme do botão principal')
const bannerSecondary = slice(banner, '{!firstDelivery.eligible && creatorLinkRendered && (', '</button>')
const bs = bannerSecondary ?? ''
check(bannerSecondary !== null, 'o bloco do link secundário do banner foi recortado')
check(bs.includes("checkout.launch('basic', '/api/stripe/checkout?tier=basic&intro=1'"), 'o link secundário lança Creator no destino histórico')
check(bs.includes("cta_role: 'secondary'") && bs.includes("tier: 'basic'"), 'o clique secundário se declara secondary com tier basic')
check(bs.includes('need more? Creator · {TIER_CREDITS.basic} cr'), 'o grant do link é TIER_CREDITS.basic, nunca digitado')
check(/import \{[^}]*TIER_CREDITS[^}]*\} from '@\/lib\/checkoutPricing'/.test(banner), 'TIER_CREDITS vem de lib/checkoutPricing')
check(banner.indexOf('ref={subscriptionCtaRef}') < banner.indexOf('creatorLinkRendered && ('), 'o principal vem ANTES do secundário')
check(!/[$€£]\s?\d/.test(bannerCode), 'nenhum preço literal no código do banner')

// ── [5] Modal: botão principal ──────────────────────────────────────────────
console.log('\n[5] Modal — a caixa de decisão inteira deriva da constante')
const modalCode = semComentarios(modal)
const modalPrimary = slice(modal, 'function goToCreator()', 'function goToCreatorMore()')
check(modalPrimary !== null, 'o bloco goToCreator foi recortado (termina onde começa o secundário)')
const mp = modalPrimary ?? ''
check(/checkout\.launch\(\s*primaryCtaTier,/.test(mp), 'o launch principal do modal usa primaryCtaTier')
check(!/launch\(\s*'basic'/.test(mp), "não existe launch('basic' no botão principal do modal")
check(!/tier: 'basic'/.test(mp), "não existe tier: 'basic' no botão principal do modal")
check((mp.match(/tier: primaryCtaTier/g) ?? []).length >= 2, 'evento e telemetria do launch levam o tier real do botão')
check(mp.includes("cta_role: 'primary'"), 'o clique principal do modal se declara primary')
check(mp.includes('`/api/stripe/checkout?tier=${TRIAL_CTA_PRIMARY_TIER}&intro=1`'), 'o destino da queda do modal leva o tier da constante')
check(
  /const primaryCtaTier: 'starter' \| 'basic' = trialDoor\.visible \? 'basic' : TRIAL_CTA_PRIMARY_TIER/.test(modal),
  'o tier efetivo cede à porta de $1 e fora dela é a constante',
)
check(modal.includes('const primaryName = TRIAL_CTA_TIER_NAME[TRIAL_CTA_PRIMARY_TIER]'), 'o nome vem da tabela, pela constante')
check(modal.includes('const primaryCredits = TIER_CREDITS[TRIAL_CTA_PRIMARY_TIER]'), 'os créditos vêm de TIER_CREDITS[constante]')
check(modal.includes('hasIntroOffer(TRIAL_CTA_PRIMARY_TIER, currency, region)'), 'a elegibilidade de intro pergunta pelo tier da constante')
check(modal.includes('getTierPrice(TRIAL_CTA_PRIMARY_TIER, currency, region)) : null'), 'o preço principal vem de getTierPrice(constante)')
check(modal.includes('Math.floor(primaryCredits / SEEDANCE_COST)'), 'filmes/mês derivam dos créditos do tier principal')
check(
  (modal.match(/getTierPrice\(TRIAL_CTA_PRIMARY_TIER, currency, region\) \/ filmesPorMes/g) ?? []).length === 2,
  'o preço por filme (grade + caixa) divide o preço do tier principal',
)
check(modal.includes('{primaryCredits} cr/mo'), 'o tile de créditos imprime os créditos do tier principal')
check(modal.includes('Continue on {primaryName}</p>'), 'a manchete da caixa nomeia o tier principal')
check(modal.includes('|| `Continue on ${primaryName}`'), 'a queda do botão nomeia o tier principal')
check(modal.includes('`Choose ${primaryName} now`'), 'o botão de pagar antes do primeiro filme nomeia o tier principal')
check(modal.includes('{primaryName} brings the AI engines and clean downloads back'), 'a frase de benefício nomeia o tier e só promete o que has_paid entrega')
check(modal.includes('primary_tier: TRIAL_CTA_PRIMARY_TIER'), 'o evento de comparar planos grava o tier principal real')
check(!modalCode.includes("'Continue on Creator'"), "o literal antigo 'Continue on Creator' morreu no código (=0)")
check(!modalCode.includes('Continue on Creator</p>'), 'a manchete antiga morreu no código (=0)')
check(!modalCode.includes('Choose Creator now'), 'o literal antigo "Choose Creator now" morreu no código (=0)')
check(
  (modalCode.match(/TIER_CREDITS\.basic/g) ?? []).length === 1,
  'TIER_CREDITS.basic sobrevive só no link secundário (a caixa não mistura os dois planos)',
)
// A porta de $1 (produto de Creator) continua prometendo a mensalidade do
// Creator — nunca o preço do Starter.
check(/const fullPrice = currency !== null \? formatCheckoutMoney\(currency, getTierPrice\('basic', currency, region\)\) : null/.test(modal), 'a mensalidade entregue à porta de $1 continua sendo a do Creator')
check(/monthlyLabel:\s*fullPrice/.test(modal), 'a porta recebe fullPrice (Creator), não o preço do tier principal')

// ── [6] Modal: link secundário de Creator ───────────────────────────────────
console.log('\n[6] Modal — o Creator continua na tela, como link secundário')
check(modal.includes("{TRIAL_CTA_PRIMARY_TIER !== 'basic' && ("), 'o link só existe quando o principal é outro plano')
check(modal.includes('onClick={goToCreatorMore}'), 'o link tem handler próprio')
const modalSecondary = slice(modal, 'function goToCreatorMore()', 'function comparePlans()')
const ms = modalSecondary ?? ''
check(modalSecondary !== null, 'o bloco goToCreatorMore foi recortado')
check(ms.includes("checkout.launch('basic', '/api/stripe/checkout?tier=basic&intro=1'"), 'o link secundário lança Creator no destino histórico')
check(ms.includes("cta_role: 'secondary'") && ms.includes("tier: 'basic'"), 'o clique secundário se declara secondary com tier basic')
check(ms.includes('humanViewStopRef.current?.()'), 'o clique secundário cancela o dwell da impressão como os outros')
check(modal.includes('need more? Creator · {TIER_CREDITS.basic} cr'), 'o grant do link é TIER_CREDITS.basic, nunca digitado')
check(
  modal.lastIndexOf('`Choose ${primaryName} now`') < modal.lastIndexOf('onClick={goToCreatorMore}') &&
    modal.lastIndexOf('onClick={goToCreatorMore}') < modal.lastIndexOf('Compare all plans →'),
  'ordem: pagar o principal → link de Creator → comparar planos',
)

// ── [7] A política do banner não grava mais um tier literal ─────────────────
console.log('\n[7] Política — o evento afirma o tier que o botão pinta')
check((policy.match(/tier: input\.tier/g) ?? []).length === 2, 'impressão e clique ecoam o tier recebido')
check(!policy.includes("tier: 'basic'"), "a política não grava tier: 'basic' como literal")
check(policy.includes("export type TrialActiveSubscriptionCtaTier = 'starter' | 'basic'"), 'o tipo do tier é fechado (starter|basic)')

// ── [M] Mutantes ────────────────────────────────────────────────────────────
// Cada mutante prova que APLICOU antes de julgar (memória
// `mutacao-precisa-provar-que-aplicou`). Tudo em memória: nada vai ao disco.
console.log('\n[M] Mutantes')

// M1 — a constante em 'basic' muda o que a tela pinta. Os templates são LIDOS
// do componente: se o rótulo mudar de forma, este bloco fica vermelho junto.
const render = (tpl, vars) => tpl.replace(/\$\{(\w+)\}/g, (_, k) => String(vars[k]))
const bannerLabelTpl = (banner.match(/`(Continue on \$\{primaryTierName\} after the trial — \$\{priceLabel\}\/mo)`/) ?? [])[1]
const fallbackUrlTpl = (banner.match(/`(\/api\/stripe\/checkout\?tier=\$\{TRIAL_CTA_PRIMARY_TIER\}&intro=1)`/) ?? [])[1]
const modalLabelTpl = (modal.match(/`(Continue on \$\{primaryName\})`/) ?? [])[1]
check(Boolean(bannerLabelTpl && fallbackUrlTpl && modalLabelTpl), 'os três templates foram lidos do código das telas')
const paint = (mod) => {
  const t = mod.TRIAL_CTA_PRIMARY_TIER
  const name = mod.TRIAL_CTA_TIER_NAME[t]
  return {
    bannerLabel: render(bannerLabelTpl ?? '', { primaryTierName: name, priceLabel: '<price>' }),
    fallbackUrl: render(fallbackUrlTpl ?? '', { TRIAL_CTA_PRIMARY_TIER: t }),
    modalLabel: render(modalLabelTpl ?? '', { primaryName: name }),
    // Espelho da trava `TRIAL_CTA_PRIMARY_TIER !== 'basic'` já provada acima.
    creatorLink: t !== 'basic',
  }
}
// Âncora pela LINHA da constante: um "= 'starter'" solto casaria primeiro com a linha do tipo.
const mutantSrc = tierSrc.replace("TRIAL_CTA_PRIMARY_TIER: 'starter' | 'basic' = 'starter'", "TRIAL_CTA_PRIMARY_TIER: 'starter' | 'basic' = 'basic'")
check(mutantSrc !== tierSrc && /^export const TRIAL_CTA_PRIMARY_TIER: 'starter' \| 'basic' = 'basic'$/m.test(mutantSrc), 'M1 aplicou: a constante mutada vale basic')
const mutant = loadTierModule(mutantSrc)
check(mutant.TRIAL_CTA_PRIMARY_TIER === 'basic', 'M1: o módulo mutado devolve basic')
const before = paint(tier)
const after = paint(mutant)
check(before.bannerLabel === 'Continue on Starter after the trial — <price>/mo', 'hoje o banner pinta Starter')
check(after.bannerLabel === 'Continue on Creator after the trial — <price>/mo', 'M1: com a constante em basic o banner pinta Creator')
check(before.fallbackUrl.includes('tier=starter') && after.fallbackUrl.includes('tier=basic'), 'M1: o destino do checkout muda com a constante')
check(before.modalLabel === 'Continue on Starter' && after.modalLabel === 'Continue on Creator', 'M1: a manchete do modal muda com a constante')
check(before.creatorLink === true && after.creatorLink === false, 'M1: o link secundário de Creator some quando o principal já é Creator')

// M2 — alguém devolve o literal 'basic' ao launch principal do banner.
{
  const from = 'checkout.launch(\n            primaryCtaTier,'
  const to = "checkout.launch(\n            'basic',"
  const mutated = banner.replace(from, to)
  check(mutated !== banner && mutated.includes(to), 'M2 aplicou: launch principal do banner com basic literal')
  const block = semComentarios(slice(mutated, '<button\n        ref={subscriptionCtaRef}', '</button>}') ?? '')
  check(/launch\(\s*'basic'/.test(block), 'M2: a trava do botão principal do banner detecta o literal')
}

// M3 — alguém devolve o literal 'basic' ao launch principal do modal.
{
  const from = 'checkout.launch(\n      primaryCtaTier,'
  const to = "checkout.launch(\n      'basic',"
  const mutated = modal.replace(from, to)
  check(mutated !== modal && mutated.includes(to), 'M3 aplicou: launch principal do modal com basic literal')
  const block = slice(mutated, 'function goToCreator()', 'function goToCreatorMore()') ?? ''
  check(/launch\(\s*'basic'/.test(block), 'M3: a trava do botão principal do modal detecta o literal')
}

// M4 — alguém redigita os créditos do tile do modal.
{
  const mutated = modal.replace('{primaryCredits} cr/mo', '{60} cr/mo')
  check(mutated !== modal, 'M4 aplicou: tile de créditos redigitado')
  check(!mutated.includes('{primaryCredits} cr/mo'), 'M4: a trava do tile derivado detecta o número digitado')
}

console.log(`\n${ok} ok / ${bad} falhas`)
process.exit(bad === 0 ? 0 : 1)
