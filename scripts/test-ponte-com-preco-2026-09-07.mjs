// ═══ GUARDIÃO — KINEO-PONTE-COM-PRECO-2026-09-07 ═══════════════════════════
//
// O QUE ELE PROTEGE: na tela de filme pronto, o degrau de oferta MAIS LARGO
// (`trial_balance_bridge`, 76 pessoas em 7 dias contra 7 do degrau de
// assinatura) dizia "No card. No purchase." e não tinha caminho nenhum para o
// preço. Este guardião existe para que ele não volte a não ter.
//
// POR QUE ELE NÃO CONTA TEXTO SOLTO (memória `guardiao-contar-texto-nao-prova-
// condicao`): um mutante que MOVE o link para fora do bloco da ponte, ou que
// troca a condição do bloco, mantém intacta qualquer contagem de ocorrências
// no arquivo inteiro. Então as verificações abaixo RECORTAM o bloco da ponte
// pela sua própria condição de render e só procuram dentro do recorte.
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

console.log('\n═══ PONTE COM PREÇO — tela de filme pronto ═══\n')

// ── O RECORTE. Do início do bloco da ponte até o início do PRÓXIMO degrau.
// Se a condição de render mudar de nome, o recorte falha e o guardião cai
// inteiro — que é exatamente o comportamento desejado: a peça está amarrada
// à variável que decide a visibilidade dela, não a uma frase.
const CONDICAO_PONTE = '{showTrialPostVideoOffer && trialBalanceBridge.eligible && ('
const inicio = gc.indexOf(CONDICAO_PONTE)
t('A1 o bloco da ponte existe e é achado pela sua condição de render', inicio !== -1,
  `procurei por ${JSON.stringify(CONDICAO_PONTE)}`)

const DEPOIS = '{showTrialPostVideoOffer && !trialBalanceBridge.eligible'
const fim = gc.indexOf(DEPOIS, inicio === -1 ? 0 : inicio)
t('A2 o degrau seguinte existe (o recorte tem fim, não vai até o fim do arquivo)',
  inicio !== -1 && fim > inicio)

const bloco = inicio !== -1 && fim > inicio ? gc.slice(inicio, fim) : ''

// ── O LINK VIVE DENTRO DO RECORTE.
t('B1 o clique de assinatura da ponte está DENTRO do bloco da ponte',
  bloco.includes("trackEvent('trial_bridge_subscription_clicked'"))
t('B2 o destino é /pricing com a campanha desta peça',
  bloco.includes("/pricing?intent_campaign=trial_bridge_secondary_v1#plans"))
t('B3 o texto visível promete plano e preço',
  /plans start at/.test(bloco) && /See plans →/.test(bloco))

// ── O MUTANTE MAIS PROVÁVEL: mover o link para fora. Se o clique aparecer no
// arquivo mas NÃO no recorte, isto reprova.
const ocorrenciasNoArquivo = (gc.match(/trial_bridge_subscription_clicked/g) || []).length
const ocorrenciasNoBloco = (bloco.match(/trial_bridge_subscription_clicked/g) || []).length
t('B4 o link não escapou do bloco (toda ocorrência do arquivo está no recorte)',
  ocorrenciasNoArquivo > 0 && ocorrenciasNoArquivo === ocorrenciasNoBloco,
  `arquivo=${ocorrenciasNoArquivo} bloco=${ocorrenciasNoBloco}`)

// ── O PREÇO VEM DA FONTE ÚNICA, NUNCA DATILOGRAFADO.
// Memória `campo-validado-gravado-ecoado-nao-e-honrado`: auditar o construtor
// final, não a validação. Aqui o construtor final é o JSX.
t('C1 o preço exibido sai de STARTER_PLAN_FACTS.priceLabel',
  bloco.includes('STARTER_PLAN_FACTS.priceLabel'))
t('C2 os créditos exibidos saem de STARTER_PLAN_FACTS.credits',
  bloco.includes('STARTER_PLAN_FACTS.credits'))
t('C3 nenhum preço em dólar datilografado dentro do bloco',
  !/\$\s?\d/.test(bloco), 'achei um literal $N no recorte')

t('D1 STARTER_PLAN_FACTS deriva de PLAN_LIST (fonte única de lib/pricing)',
  /const STARTER_PLAN_FACTS = PLAN_LIST\.find\(\(plan\) => plan\.tier === 'starter'\)/.test(gc))
t('D2 lib/pricing calcula o preço do Starter a partir de TIER_PRICES',
  /price: TIER_PRICES\.starter\.usd \/ 100/.test(pricing))
t('D3 lib/pricing calcula os créditos do Starter a partir de TIER_CREDITS',
  /credits: TIER_CREDITS\.starter/.test(pricing))

// ── O DENOMINADOR. O link é incondicional dentro do bloco, então a impressão
// JÁ EXISTENTE da ponte é o denominador da adoção. O marcador de versão é o
// que separa, no mesmo fluxo, a ponte muda da ponte com preço.
t('E1 a impressão da ponte carrega o marcador de versão plans_link',
  /trackEvent\('trial_balance_bridge_viewed', \{[\s\S]{0,900}?plans_link: Boolean\(STARTER_PLAN_FACTS\)/.test(gc))

// ── A PEÇA NÃO PODE SER A ÚNICA: o degrau irmão já tinha o caminho para o
// preço e é o que provou que a ponte estava sozinha. Se ele sumir, a leitura
// comparativa do diário deixa de valer.
t('F1 o degrau irmão (trial_repeat) segue com o caminho para planos',
  gc.includes("trial_repeat_subscription_clicked") &&
  gc.includes("/pricing?intent_campaign=trial_repeat_secondary_v1#plans"))

console.log(`\n${total - falhas}/${total} verificações passaram\n`)
process.exit(falhas === 0 ? 0 : 1)
