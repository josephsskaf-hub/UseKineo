// ═══ GUARDIÃO — KINEO-PRECO-PARA-SALDO-CHEIO-2026-09-07 ════════════════════
//
// O QUE ELE PROTEGE: quem tem trial ativo e saldo >= FULL_SEEDANCE_COST (25)
// NÃO recebe a ponte (`full_seedance_already_fits`) — recebe o degrau irmão
// `trial_repeat`. Esse degrau tinha caminho para /pricing mas SEM número, e
// uma impressão que não sabia se havia preço na tela. Este guardião garante
// que (a) o número está lá, da fonte única, (b) a impressão e o clique dizem
// que ele estava lá e por que a ponte não ficou com o slot, e (c) a decisão
// que manda esse perfil para cá continua sendo a mesma.
//
// POR QUE ELE NÃO CONTA TEXTO SOLTO (memória `guardiao-contar-texto-nao-prova-
// condicao`): recorta o degrau pela sua própria condição de render e só
// procura dentro do recorte.
//
// Estilo readFileSync de propósito: guardião com import `@/` morre no import
// antes da primeira verificação (memória `guardioes-com-alias-nao-rodam`).
// CRLF normalizado na leitura (memória `guardiao-crlf-falso-vermelho`).

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const ler = (p) => readFileSync(join(raiz, p), 'utf8').replace(/\r\n/g, '\n')

const gc = ler('app/(dashboard)/generate/GenerateClient.tsx')
const bridgeLib = ler('lib/growth/trialBalanceBridge.ts')
const repeatLib = ler('lib/growth/trialRepeatBeforeCheckout.ts')
const pricing = ler('lib/pricing.ts')

let falhas = 0
let total = 0
function t(nome, ok, detalhe = '') {
  total += 1
  if (ok) {
    console.log(`  ok   ${nome}`)
  } else {
    falhas += 1
    console.log(`  FALHA ${nome}${detalhe ? ` — ${detalhe}` : ''}`)
  }
}

console.log('\n═══ PREÇO PARA SALDO CHEIO — degrau trial_repeat na tela de filme pronto ═══\n')

// ── A. A DECISÃO QUE MANDA O PERFIL PARA CÁ. Se a ponte deixar de recusar o
// saldo cheio, ou o repeat deixar de assumir quando a ponte recusa, este
// guardião protege a peça errada.
t('A1 a ponte recusa saldo >= FULL_SEEDANCE_COST com full_seedance_already_fits',
  /if \(input\.credits >= FULL_SEEDANCE_COST\) \{\s*\n\s*return \{ \.\.\.base, eligible: false, reason: 'full_seedance_already_fits' \}/.test(bridgeLib))
t('A2 FULL_SEEDANCE_COST é o Seedance de 60s, não um número solto',
  /export const FULL_SEEDANCE_COST = creditCostForDuration\('cinematic_ai', true, 60\)/.test(bridgeLib))
t('A3 o repeat só cede o slot para a ponte quando ela é elegível',
  /if \(input\.bridgeEligible\) return \{ \.\.\.base, action: 'bridge', reason: 'bridge_first' \}/.test(repeatLib))
t('A4 na tela, o repeat recebe bridgeEligible da decisão real da ponte',
  /decideTrialRepeatBeforeCheckout\(\{\s*\n\s*trialPhase: trialPostVideoPhase,\s*\n\s*credits,\s*\n\s*bridgeEligible: trialBalanceBridge\.eligible,/.test(gc))
t('A5 o degrau irmão só fica de pé quando o repeat decide episódio',
  /const showTrialRepeatEpisode =\s*\n\s*showTrialPostVideoOffer && trialRepeatDecision\.action === 'episode'/.test(gc))

// ── B. O RECORTE. Do início do card do episódio até o início da ponte.
const CONDICAO_REPEAT = '{(!showTrialPostVideoOffer || showTrialRepeatEpisode) && (nextEpisode || nextEpisodeLoading) && ('
const inicio = gc.indexOf(CONDICAO_REPEAT)
t('B1 o card do episódio existe e é achado pela sua condição de render', inicio !== -1,
  `procurei por ${JSON.stringify(CONDICAO_REPEAT)}`)
const DEPOIS = '{showTrialPostVideoOffer && trialBalanceBridge.eligible && ('
const fim = gc.indexOf(DEPOIS, inicio === -1 ? 0 : inicio)
t('B2 a ponte vem depois (o recorte tem fim)', inicio !== -1 && fim > inicio)
const card = inicio !== -1 && fim > inicio ? gc.slice(inicio, fim) : ''

// Dentro do card, o sub-recorte do degrau do trial: só existe sob a condição
// do repeat, nunca para quem não está em trial.
const CONDICAO_DEGRAU = '{showTrialRepeatEpisode && trialRepeatDecision.action === \'episode\' && ('
const inicioDegrau = card.indexOf(CONDICAO_DEGRAU)
t('B3 o degrau do trial dentro do card é amarrado a showTrialRepeatEpisode', inicioDegrau !== -1)
const degrau = inicioDegrau !== -1 ? card.slice(inicioDegrau) : ''

// ── C. O LINK COM PREÇO VIVE DENTRO DO DEGRAU.
t('C1 o clique de assinatura do repeat está DENTRO do degrau',
  degrau.includes("trackEvent('trial_repeat_subscription_clicked'"))
t('C2 o destino é /pricing com a campanha desta peça',
  degrau.includes("/pricing?intent_campaign=trial_repeat_secondary_v1#plans"))
t('C3 o texto visível promete plano e preço, condicionado a STARTER_PLAN_FACTS',
  /\{STARTER_PLAN_FACTS\s*\n?\s*\? <>Prefer clean exports now\? Plans start at \{STARTER_PLAN_FACTS\.priceLabel\}\/month for \{STARTER_PLAN_FACTS\.credits\} credits\. See plans →<\/>/.test(degrau))
t('C4 sem Starter o texto volta ao antigo (link sem número), não some o link',
  degrau.includes(": 'Prefer clean exports now? See paid plans →'"))
const ocorrenciasNoArquivo = (gc.match(/trial_repeat_subscription_clicked/g) || []).length
const ocorrenciasNoDegrau = (degrau.match(/trial_repeat_subscription_clicked/g) || []).length
t('C5 o clique não escapou do degrau (toda ocorrência do arquivo está no recorte)',
  ocorrenciasNoArquivo > 0 && ocorrenciasNoArquivo === ocorrenciasNoDegrau,
  `arquivo=${ocorrenciasNoArquivo} degrau=${ocorrenciasNoDegrau}`)

// ── D. O PREÇO VEM DA FONTE ÚNICA, NUNCA DATILOGRAFADO.
t('D1 nenhum preço em dólar datilografado dentro do card',
  !/\$\s?\d/.test(card), 'achei um literal $N no recorte')
t('D2 STARTER_PLAN_FACTS deriva de PLAN_LIST (fonte única de lib/pricing)',
  /const STARTER_PLAN_FACTS = PLAN_LIST\.find\(\(plan\) => plan\.tier === 'starter'\)/.test(gc))
t('D3 lib/pricing calcula o preço do Starter a partir de TIER_PRICES',
  /price: TIER_PRICES\.starter\.usd \/ 100/.test(pricing))
t('D4 lib/pricing calcula os créditos do Starter a partir de TIER_CREDITS',
  /credits: TIER_CREDITS\.starter/.test(pricing))

// ── E. A PEÇA É CONTÁVEL. Impressão com marcador + motivo, evento irmão do
// preço, e clique com os mesmos campos.
const IMPRESSAO = "trackEvent('trial_repeat_episode_viewed', {"
const iImp = gc.indexOf(IMPRESSAO)
const impressao = iImp !== -1 ? gc.slice(iImp, gc.indexOf('observer.disconnect()', iImp)) : ''
t('E1 a impressão do repeat existe no observer', iImp !== -1)
t('E2 a impressão carrega plans_link: Boolean(STARTER_PLAN_FACTS)',
  /plans_link: Boolean\(STARTER_PLAN_FACTS\)/.test(impressao))
t('E3 a impressão carrega bridge_reason da decisão real da ponte',
  /bridge_reason: balanceBridgeForImpression\.reason/.test(impressao))
t('E4 o evento irmão trial_repeat_price_viewed só dispara com STARTER_PLAN_FACTS',
  /if \(STARTER_PLAN_FACTS\) \{\s*\n\s*trackEvent\('trial_repeat_price_viewed', \{/.test(impressao))
t('E5 o evento irmão carrega motivo, saldo e o rótulo do preço',
  /trial_repeat_price_viewed', \{[\s\S]{0,600}?bridge_reason: balanceBridgeForImpression\.reason[\s\S]{0,300}?credits_before: repeatForImpression\.creditsBefore[\s\S]{0,300}?starter_price_label: STARTER_PLAN_FACTS\.priceLabel/.test(impressao))
t('E6 o evento irmão vive no mesmo ramo do observer que a impressão (antes do disconnect)',
  impressao.includes("trial_repeat_price_viewed"))
t('E7 o clique carrega plans_link e bridge_reason da decisão real',
  /trial_repeat_subscription_clicked', \{[\s\S]{0,700}?plans_link: Boolean\(STARTER_PLAN_FACTS\)[\s\S]{0,200}?bridge_reason: trialBalanceBridge\.reason/.test(degrau))
t('E8 o motivo full_seedance_already_fits ainda é um valor possível da ponte',
  /'full_seedance_already_fits'/.test(bridgeLib))

// ── F. A PONTE COM PREÇO (02:32) CONTINUA DE PÉ — esta peça é complemento,
// não substituição.
const ponte = gc.slice(fim, gc.indexOf('{showTrialPostVideoOffer && !trialBalanceBridge.eligible', fim))
t('F1 a ponte segue com o seu link de preço',
  ponte.includes("trial_bridge_subscription_clicked") && ponte.includes('STARTER_PLAN_FACTS.priceLabel'))

console.log(`\n${total - falhas}/${total} verificações passaram\n`)
process.exit(falhas === 0 ? 0 : 1)
