#!/usr/bin/env node
/**
 * GUARDIÃO — KINEO-D5D10-PORTA-DE-1-DOLAR-2026-09-07
 *
 * Prova que as duas cartas de maior vazão da casa (expired_offer_d5 e
 * expired_lastcall_d10), NO RAMO DE QUEM TEM FILME, oferecem o trial de $1 —
 * e que o cupom COMEBACK50 continua exatamente onde estava.
 *
 * ESTILO readFileSync DE PROPÓSITO: guardião com alias `@/` não roda neste
 * repo (memória `guardioes-com-alias-nao-rodam` — 72 testes morrem no import
 * antes da primeira verificação). Aqui a fonte é lida como texto.
 *
 * O QUE ESTE GUARDIÃO NÃO PODE SER: um contador de texto. Um mutante que
 * troque `if (c.videosMade >= 1)` por `if (true)` mantém toda a contagem
 * intacta (memória `guardiao-contar-texto-nao-prova-condicao`). Por isso as
 * verificações 12-16 amarram a porta de $1 à VARIÁVEL que decide o ramo e à
 * distância entre as âncoras, não à mera presença das strings.
 */
import { readFileSync } from 'node:fs'

const ROTA = 'app/api/cron/trial-lifecycle-emails/route.ts'
const COBRADOR = 'app/api/stripe/checkout/route.ts'
const PRICING = 'app/pricing/PricingClient.tsx'

// CRLF no checkout do Windows quebra regex de duas linhas — normalizar SEMPRE
// na leitura (memória `guardiao-crlf-falso-vermelho`).
const ler = (f) => readFileSync(f, 'utf8').split('\r\n').join('\n')
const src = ler(ROTA)
const cobrador = ler(COBRADOR)
const pricing = ler(PRICING)

let ok = 0
let falhas = 0
const check = (nome, cond) => {
  if (cond) {
    ok += 1
  } else {
    falhas += 1
    console.error(`  ✗ ${nome}`)
  }
}

// ── A. a porta existe e é a porta do produto, não uma inventada ──────────────
check('1. TRIAL_1USD_PATH declarado', src.includes("const TRIAL_1USD_PATH = '/api/stripe/checkout?tier=basic&billing=monthly&trial=1'"))
check('2. tier=basic (o único que o servidor aceita com trial=1)', src.includes('tier=basic&billing=monthly&trial=1'))
check('3. helper trial1UsdUrl existe', /function trial1UsdUrl\(campaign: string\): string/.test(src))
check('4. a URL do e-mail carrega intent_campaign (medição)', src.includes('&intent_campaign=${campaign}'))
check('5. campanha do D5 distinta', src.includes("trial1UsdUrl('trial_1usd_d5')"))
check('6. campanha do D10 distinta', src.includes("trial1UsdUrl('trial_1usd_d10')"))

// ── B. a casa fala uma língua só: o texto veio do botão do /pricing ─────────
const LINHA = 'try Creator for 7 days — $1, then $15/mo'
check('7. TRIAL_1USD_LINE é o texto do botão do /pricing', src.includes(`const TRIAL_1USD_LINE = '${LINHA}'`))
check('8. o /pricing ainda diz exatamente isso (senão a casa passa a falar dois preços)', pricing.includes(LINHA))
check('9. o mesmo caminho de checkout do /pricing', pricing.includes('/api/stripe/checkout?tier=basic&billing=monthly&trial=1'))

// ── C. o cobrador aceita esta coorte — a oferta não pode ser recusada no caixa
check('10. o único gate de trial=1 continua sendo has_paid', cobrador.includes("checkoutMetadata.card_trial_denied = 'has_paid'"))
check('11. CARD_TRIAL_ENABLED continua ligado', /const CARD_TRIAL_ENABLED = true/.test(cobrador))

// ── D. AMARRAÇÃO À CONDIÇÃO — o que um contador de texto não pegaria ────────
// Recorta cada carta e, dentro dela, o ramo `videosMade >= 1`. Se o ramo
// sumir, mudar de condição ou a porta escorregar para fora dele, cai aqui.
function ramoComFilme(kind) {
  const i = src.indexOf(`if (c.kind === '${kind}')`)
  if (i < 0) return null
  const j = src.indexOf('if (c.videosMade >= 1) {', i)
  if (j < 0) return null
  // fim do ramo = o começo do ramo de quem NÃO tem vídeo, na mesma carta
  const k = src.indexOf('if (c.videosMade === 0 && otherDeliveriesTotal(c.otherMade) === 0)', j)
  if (k < 0) return null
  return src.slice(j, k)
}

for (const [kind, campanha] of [
  ['expired_offer_d5', 'trial_1usd_d5'],
  ['expired_lastcall_d10', 'trial_1usd_d10'],
]) {
  const ramo = ramoComFilme(kind)
  check(`12/${kind}. o ramo guardado por videosMade >= 1 existe`, ramo !== null)
  if (!ramo) continue
  check(`13/${kind}. a porta de $1 está DENTRO desse ramo`, ramo.includes(`trial1UsdUrl('${campanha}')`))
  check(`14/${kind}. o botão de $1 é servido no HTML do ramo`, ramo.includes("cta(trialUrl, 'Start Creator for $1')"))
  check(`15/${kind}. o corpo em texto puro também leva o link`, ramo.includes('${trialUrl}'))
  check(`16/${kind}. o carimbo do bundle novo`, ramo.includes("body: 'offer_with_film_1usd'"))
  // O CUPOM É DO CODEX — código, URL e porcentagem intactos.
  check(`17/${kind}. cupom COMEBACK50 continua no mesmo ramo`, ramo.includes('${COMEBACK_CODE}'))
  check(`18/${kind}. o link do cupom continua o /pricing?promo=`, ramo.includes('${cta(url, '))
  check(`19/${kind}. os 50% continuam escritos`, ramo.includes('50% off Creator for 3 months'))
  // O $1 vem ANTES do cupom: é a barreira menor. Se alguém inverter, cai aqui.
  check(
    `20/${kind}. o $1 aparece antes do cupom no corpo HTML`,
    ramo.indexOf("cta(trialUrl, 'Start Creator for $1')") < ramo.indexOf('${cta(url, '),
  )
}

// ── E. o ramo de quem NUNCA fez filme continua intocado ─────────────────────
// A objeção dele é prova, não preço (sprint #12). Se a porta de $1 vazar para
// lá, este guardião reprova.
function ramoSemFilme(kind) {
  const i = src.indexOf(`if (c.kind === '${kind}')`)
  const j = src.indexOf('if (c.videosMade === 0 && otherDeliveriesTotal(c.otherMade) === 0)', i)
  if (j < 0) return null
  const fim = src.indexOf("if (c.kind === '", j + 10)
  return src.slice(j, fim > 0 ? fim : src.length)
}
for (const kind of ['expired_offer_d5', 'expired_lastcall_d10']) {
  const ramo = ramoSemFilme(kind)
  check(`21/${kind}. o ramo de quem nunca fez filme existe`, ramo !== null)
  check(`22/${kind}. e NÃO recebeu a porta de $1`, ramo !== null && !ramo.includes('trialUrl'))
  check(`23/${kind}. e continua oferecendo o filme de 1 clique`, ramo !== null && ramo.includes('oneClickBlocks'))
}

// ── F. o assunto passou a carregar o preço ──────────────────────────────────
check('24. assunto do D5 cita $1', src.includes('is still in your Library — try Creator for $1'))
check('25. assunto do D10 cita $1', src.includes('and Creator is $1 for 7 days'))
check('26. nenhum assunto antigo sobrou', !src.includes('is still in your Library — and Creator is 50% off'))
check('27. nenhum body antigo sobrou nos ramos com filme', !src.includes("body: 'offer_with_film',"))

console.log(`\n${ok} verificações passaram, ${falhas} falharam.`)
process.exit(falhas === 0 ? 0 : 1)
