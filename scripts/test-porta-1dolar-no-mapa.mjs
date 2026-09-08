// KINEO-PORTA-1DOLAR-NO-MAPA-2026-09-07 — guardião da porta de $1 na superfície
// que os motores de resposta leem (/llms.txt).
//
// O QUE ESTE GUARDIÃO PROTEGE. A oferta mais barata da casa (trial pago de $1,
// 7 dias, Creator) existia em 14 superfícies do produto e em ZERO linhas do
// documento que o ChatGPT lê para nos descrever. Um motor perguntado "qual é a
// forma mais barata de testar o Kineo?" respondia "$7/month", porque $7 era o
// menor número que nós contávamos a ele.
//
// ESTILO readFileSync DE PROPÓSITO (memória: guardioes-com-alias-nao-rodam).
// Um `import '@/lib/kineoFacts'` morreria no resolvedor de alias antes da
// primeira verificação e devolveria verde por não ter rodado.
//
// ⚠️ A ARMADILHA QUE ESTE ARQUIVO EVITA (memória: guardiao-contar-texto-nao-
// prova-condicao): contar a string "$1" no llms.txt não prova nada — um
// mutante que troque `CARD_TRIAL_FACT.enabled` por `false` mantém o texto do
// arquivo-fonte intacto e some com a linha na SAÍDA. Por isso as verificações
// abaixo amarram os NÚMEROS ao módulo que cobra (lib/checkoutPricing.ts) e à
// rota que cobra (app/api/stripe/checkout/route.ts), não à prosa.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
// ⚠️ NORMALIZAR CRLF NA LEITURA (memória: guardiao-crlf-falso-vermelho). No
// checkout do Windows o arquivo chega com \r\n e todo padrão que atravessa
// duas linhas — ou que ancora em '\n' — falha por vermelho FALSO.
const ler = (p) => readFileSync(join(raiz, p), 'utf8').replace(/\r\n/g, '\n')

const precos = ler('lib/checkoutPricing.ts')
const rota = ler('app/api/stripe/checkout/route.ts')
const fatos = ler('lib/kineoFacts.ts')
const llms = ler('app/llms.txt/route.ts')

let ok = 0
let falhas = 0
const check = (nome, condicao) => {
  if (condicao) {
    ok += 1
  } else {
    falhas += 1
    console.error(`  ✗ ${nome}`)
  }
}

// ── 1. A fonte única exporta os três números da porta ───────────────────────
const capturar = (fonte, nome) => {
  const m = fonte.match(new RegExp(`export const ${nome}\\s*=\\s*(\\d+)`))
  return m ? Number(m[1]) : null
}
const feeFonte = capturar(precos, 'CARD_TRIAL_ENTRY_FEE_MINOR')
const diasFonte = capturar(precos, 'CARD_TRIAL_DAYS')
const creditosFonte = capturar(precos, 'CARD_TRIAL_GRANT_CREDITS')

check('checkoutPricing exporta CARD_TRIAL_ENTRY_FEE_MINOR', feeFonte !== null)
check('checkoutPricing exporta CARD_TRIAL_DAYS', diasFonte !== null)
check('checkoutPricing exporta CARD_TRIAL_GRANT_CREDITS', creditosFonte !== null)

// ── 2. O COBRADOR concorda com a fonte única ───────────────────────────────
// Se a rota do Stripe divergir, quem anuncia está mentindo. Este é o par que
// impede a cópia de envelhecer enquanto a outra pista mexe no checkout.
const capturarLocal = (fonte, nome) => {
  const m = fonte.match(new RegExp(`const ${nome}\\s*=\\s*(\\d+)`))
  return m ? Number(m[1]) : null
}
const feeRota = capturarLocal(rota, 'TRIAL_ENTRY_FEE_CENTS')
const diasRota = capturarLocal(rota, 'TRIAL_DAYS')

check('a rota do Stripe declara TRIAL_ENTRY_FEE_CENTS', feeRota !== null)
check('a rota do Stripe declara TRIAL_DAYS', diasRota !== null)
check(`taxa de entrada: fonte ${feeFonte} == cobrador ${feeRota}`, feeFonte === feeRota)
check(`dias de trial: fonte ${diasFonte} == cobrador ${diasRota}`, diasFonte === diasRota)

// ── 3. A porta está LIGADA no servidor ─────────────────────────────────────
// O fato publica `enabled: true`. Se alguém desligar a porta no checkout e
// esquecer do mapa, o /llms.txt passa a anunciar uma oferta que o servidor
// recusa — a vitrine que promete o que o cobrador não entrega.
const ligadaNaRota = /const CARD_TRIAL_ENABLED\s*=\s*true/.test(rota)
const ligadaNoFato = /enabled:\s*true/.test(
  fatos.slice(fatos.indexOf('export const CARD_TRIAL_FACT')),
)
check('CARD_TRIAL_ENABLED = true na rota do Stripe', ligadaNaRota)
check('CARD_TRIAL_FACT.enabled acompanha a rota', ligadaNaRota === ligadaNoFato)

// ── 4. O fato NÃO digita dinheiro à mão ────────────────────────────────────
// memória: preco-literal-em-email-mente. Todo rótulo sai de
// formatCheckoutMoney sobre a constante — nunca de uma string com cifrão.
const blocoFato = fatos.slice(
  fatos.indexOf('export const CARD_TRIAL_FACT'),
  fatos.indexOf('export const CARD_TRIAL_FACT') + 1600,
)
check(
  'CARD_TRIAL_FACT não contém cifrão literal',
  !/['"`][^'"`]*\$\d/.test(blocoFato),
)
check(
  'entryPrice vem de formatCheckoutMoney sobre a constante',
  /entryPrice:\s*formatCheckoutMoney\(\s*'usd',\s*CARD_TRIAL_ENTRY_FEE_MINOR\s*\)/.test(blocoFato),
)
check(
  'days vem de CARD_TRIAL_DAYS',
  /days:\s*CARD_TRIAL_DAYS/.test(blocoFato),
)
check(
  'credits vem de CARD_TRIAL_GRANT_CREDITS',
  /credits:\s*CARD_TRIAL_GRANT_CREDITS/.test(blocoFato),
)
check(
  'thenMonthly vem de TIER_PRICES.basic (o que passa a ser cobrado)',
  /thenMonthly:\s*formatCheckoutMoney\(\s*'usd',\s*TIER_PRICES\.basic\.usd\s*\)/.test(blocoFato),
)

// ── 5. As DUAS recusas do servidor são publicadas junto da oferta ──────────
// memória: vitrine-oferece-o-que-o-cobrador-recusa. O servidor recusa ?trial=1
// para quem já pagou (has_paid) e no faturamento anual.
check(
  'o servidor recusa a porta para has_paid === true',
  /wantsTrial\s*&&[^\n]*has_paid[^\n]*===\s*true/.test(rota),
)
check(
  'o servidor exige faturamento mensal (!isAnnual)',
  /wantsTrial\s*&&\s*!isAnnual/.test(rota),
)
check(
  'CARD_TRIAL_FACT.notAvailableTo tem as DUAS recusas',
  /notAvailableTo:\s*\[[^\]]*subscribed[^\]]*annual/s.test(blocoFato),
)

// ── 6. A porta é Creator, e a URL leva ao tier que o servidor aceita ───────
// TRIAL_TIER é 'basic' no servidor: uma URL com outro tier faz o servidor
// zerar wantsTrial em silêncio e cobrar o plano cheio.
check("TRIAL_TIER = 'basic' no servidor", /const TRIAL_TIER\s*=\s*'basic'/.test(rota))
check(
  'a URL do fato pede tier=basic com trial=1 e billing mensal',
  /url:\s*`\$\{BASE\}\/api\/stripe\/checkout\?tier=basic&billing=monthly&trial=1`/.test(blocoFato),
)

// ── 7. O /llms.txt RENDERIZA a porta, e antes da tabela de planos ─────────
// A ordem importa: um motor de resposta cita a oração principal da seção. Se
// a porta vier depois dos planos, a resposta continua sendo "$7/month".
check('llms.txt importa CARD_TRIAL_FACT', /CARD_TRIAL_FACT,/.test(llms))
check(
  'llms.txt monta a linha a partir do fato, não de texto solto',
  /cardTrialLines\s*=\s*CARD_TRIAL_FACT\.enabled/.test(llms),
)
check(
  'a linha usa entryPrice/days/credits/thenMonthly do fato',
  /CARD_TRIAL_FACT\.entryPrice/.test(llms) &&
    /CARD_TRIAL_FACT\.days/.test(llms) &&
    /CARD_TRIAL_FACT\.credits/.test(llms) &&
    /CARD_TRIAL_FACT\.thenMonthly/.test(llms),
)
check(
  'as recusas são renderizadas na mesma lista',
  /CARD_TRIAL_FACT\.notAvailableTo\.map/.test(llms),
)
const posPorta = llms.indexOf('${cardTrialLines}')
const posPlanos = llms.indexOf('${plans}\n')
check('a seção Pricing renderiza cardTrialLines', posPorta !== -1)
check(
  'a porta de $1 vem ANTES da tabela de planos',
  posPorta !== -1 && posPlanos !== -1 && posPorta < posPlanos,
)

// ── 8. O comentário condicional de 21/08 foi honrado ──────────────────────
// Ele dizia: "se o trial de $1 for religado um dia, ESTE comentário volta
// junto — e não antes." A afirmação morta não pode continuar no arquivo.
check(
  'a afirmação morta "CARD_TRIAL_ENABLED = false" saiu de kineoFacts',
  !/CARD_TRIAL_ENABLED = false/.test(fatos),
)

console.log(`\nporta-1dolar-no-mapa: ${ok} passaram, ${falhas} falharam`)
process.exit(falhas === 0 ? 0 : 1)
