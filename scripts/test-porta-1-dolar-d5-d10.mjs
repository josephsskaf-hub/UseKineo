#!/usr/bin/env node
/**
 * GUARDIÃO — KINEO-D5D10-PORTA-DE-ENTRADA-2026-09-07
 *
 * Prova que as duas cartas de maior vazão da casa (expired_offer_d5 e
 * expired_lastcall_d10), NO RAMO DE QUEM TEM FILME, oferecem o trial pago de
 * entrada — e que o cupom COMEBACK50 continua exatamente onde estava.
 *
 * ESTILO readFileSync DE PROPÓSITO: guardião com alias `@/` não roda neste
 * repo (memória `guardioes-com-alias-nao-rodam` — 72 testes morrem no import
 * antes da primeira verificação). Aqui a fonte é lida como texto.
 *
 * O QUE ESTE GUARDIÃO NÃO PODE SER: um contador de texto. Um mutante que
 * troque `if (c.videosMade >= 1)` por `if (true)` mantém toda a contagem
 * intacta (memória `guardiao-contar-texto-nao-prova-condicao`). Por isso as
 * verificações 12-16 amarram a porta à VARIÁVEL que decide o ramo, e a 20 à
 * ordem entre as âncoras — não à mera presença das strings.
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

/**
 * A REGRA DA CASA, já cobrada por test-trial-offer-d5-with-film.mjs,
 * test-trial-lastcall-d10-with-film.mjs e test-trial-offer-first-film.mjs:
 * neste arquivo NÃO se escreve preço literal. Ela existe porque a taxa de
 * entrada é TRIAL_ENTRY_FEE_CENTS (100 unidades menores) na moeda DA PESSOA e
 * o plano tem preço regional — medido em 30d: 696 pessoas em usd, 80 em inr,
 * 19 em brl. Escrever "$1, then $15/mo" (o texto do botão do /pricing, que
 * localiza) mentiria para 99 pessoas, 12% da base: é o item 4 da auditoria de
 * 28/08, "COPY QUE MENTE".
 *
 * Nesta rotação eu quebrei essa regra DUAS vezes — primeiro com "1.00", depois
 * no assunto PLURAL, que é outra string e escapou da primeira correção. Os
 * guardiões antigos pegaram as duas. A trava não foi afrouxada; o número saiu.
 */
const PRECO_LITERAL = /\$\d|USD|\b\d+\.\d\d\b/

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

// ── recortes ────────────────────────────────────────────────────────────────
// Cada carta, e dentro dela o ramo `videosMade >= 1`. Se o ramo sumir, mudar de
// condição ou a porta escorregar para fora dele, as checagens abaixo caem.
function ramoComFilme(kind) {
  const i = src.indexOf(`if (c.kind === '${kind}')`)
  if (i < 0) return null
  const j = src.indexOf('if (c.videosMade >= 1) {', i)
  if (j < 0) return null
  const k = src.indexOf('if (c.videosMade === 0 && otherDeliveriesTotal(c.otherMade) === 0)', j)
  if (k < 0) return null
  return src.slice(j, k)
}
function ramoSemFilme(kind) {
  const i = src.indexOf(`if (c.kind === '${kind}')`)
  const j = src.indexOf('if (c.videosMade === 0 && otherDeliveriesTotal(c.otherMade) === 0)', i)
  if (j < 0) return null
  const fim = src.indexOf("if (c.kind === '", j + 10)
  return src.slice(j, fim > 0 ? fim : src.length)
}

// ── A. a porta existe e é a porta do produto, não uma inventada ─────────────
check('1. TRIAL_ENTRY_PATH declarado', src.includes("const TRIAL_ENTRY_PATH = '/api/stripe/checkout?tier=basic&billing=monthly&trial=1'"))
check('2. tier=basic (o único que o servidor aceita com trial=1)', src.includes('tier=basic&billing=monthly&trial=1'))
check('3. helper trialEntryUrl existe', /function trialEntryUrl\(campaign: string\): string/.test(src))
check('4. a URL do e-mail carrega intent_campaign (medição)', src.includes('&intent_campaign=${campaign}'))
check('5. campanha do D5 distinta', src.includes("trialEntryUrl('trial_1usd_d5')"))
check('6. campanha do D10 distinta', src.includes("trialEntryUrl('trial_1usd_d10')"))

// ── B. a copy não promete preço que o e-mail não sabe localizar ─────────────
const LINHA = 'a 7-day Creator trial with a token entry fee — the checkout shows it in your own currency'
check('7. TRIAL_ENTRY_LINE é a linha neutra de moeda', src.includes(`const TRIAL_ENTRY_LINE = '${LINHA}'`))
check('8. a linha não carrega preço literal nenhum', !PRECO_LITERAL.test(LINHA))
check('8b. o botão do /pricing continua existindo (a tela é quem localiza)', pricing.includes('/api/stripe/checkout?tier=basic&billing=monthly&trial=1'))
check(
  '8c. NENHUM ramo com filme carrega preço literal — o assunto plural já escapou uma vez',
  ['expired_offer_d5', 'expired_lastcall_d10'].every((k) => {
    const r = ramoComFilme(k)
    return r !== null && !PRECO_LITERAL.test(r)
  }),
)

// ── C. o cobrador aceita esta coorte — a oferta não pode ser recusada no caixa
// (memória `vitrine-oferece-o-que-o-cobrador-recusa`)
check('9. o único gate de trial=1 continua sendo has_paid', cobrador.includes("checkoutMetadata.card_trial_denied = 'has_paid'"))
check('10. CARD_TRIAL_ENABLED continua ligado', /const CARD_TRIAL_ENABLED = true/.test(cobrador))

// ── D. AMARRAÇÃO À CONDIÇÃO ─────────────────────────────────────────────────
for (const [kind, campanha] of [
  ['expired_offer_d5', 'trial_1usd_d5'],
  ['expired_lastcall_d10', 'trial_1usd_d10'],
]) {
  const ramo = ramoComFilme(kind)
  check(`12/${kind}. o ramo guardado por videosMade >= 1 existe`, ramo !== null)
  if (!ramo) continue
  check(`13/${kind}. a porta está DENTRO desse ramo`, ramo.includes(`trialEntryUrl('${campanha}')`))
  check(`14/${kind}. o botão é servido no HTML do ramo`, ramo.includes("cta(trialUrl, 'Start the 7-day Creator trial')"))
  check(`15/${kind}. o corpo em texto puro também leva o link`, ramo.includes('${trialUrl}'))
  check(`16/${kind}. o carimbo do bundle novo`, ramo.includes("body: 'offer_with_film_1usd'"))
  // O CUPOM É DO CODEX — código, URL e porcentagem intactos.
  check(`17/${kind}. cupom COMEBACK50 continua no mesmo ramo`, ramo.includes('${COMEBACK_CODE}'))
  check(`18/${kind}. o link do cupom continua o /pricing?promo=`, ramo.includes('${cta(url, '))
  // Os 50% têm de sobreviver NOS DOIS corpos. Verificar só a frase solta deixa
  // passar um mutante que apaga a versão HTML e mantém a de texto puro — foi
  // exatamente o que aconteceu no teste de mutação desta rotação.
  check(`19a/${kind}. os 50% continuam no corpo de texto`, ramo.includes('50% off Creator for 3 months, '))
  check(`19b/${kind}. os 50% continuam no corpo HTML`, ramo.includes('<strong>50% off Creator for 3 months</strong>'))
  // A porta barata vem ANTES do cupom. Se alguém inverter, cai aqui.
  check(
    `20/${kind}. a porta aparece antes do cupom no corpo HTML`,
    ramo.indexOf("cta(trialUrl, 'Start the 7-day Creator trial')") < ramo.indexOf('${cta(url, '),
  )
}

// ── E. o ramo de quem NUNCA fez filme continua intocado ─────────────────────
// A objeção dele é prova, não preço (sprint #12). Se a porta vazar para lá,
// este guardião reprova.
for (const kind of ['expired_offer_d5', 'expired_lastcall_d10']) {
  const ramo = ramoSemFilme(kind)
  check(`21/${kind}. o ramo de quem nunca fez filme existe`, ramo !== null)
  check(`22/${kind}. e NÃO recebeu a porta de entrada`, ramo !== null && !ramo.includes('trialUrl'))
  check(`23/${kind}. e continua oferecendo o filme de 1 clique`, ramo !== null && ramo.includes('oneClickBlocks'))
}

// ── F. assuntos: singular E plural, que são strings diferentes ──────────────
check('24a. assunto do D5 (1 filme)', src.includes('${noun} is still in your Library — and there is a cheaper way back than the coupon'))
check('24b. assunto do D5 (N filmes)', src.includes('videos are still in your Library — and there is a cheaper way back than the coupon'))
check('25a. assunto do D10 (1 filme)', src.includes('Last call — your ${noun} is waiting, and there are two ways back in'))
check('25b. assunto do D10 (N filmes)', src.includes('videos are waiting, and there are two ways back in'))
check('26. nenhum assunto antigo sobrou', !src.includes('is still in your Library — and Creator is 50% off'))
check('27. nenhum body antigo sobrou nos ramos com filme', !src.includes("body: 'offer_with_film',"))

console.log(`\n${ok} verificações passaram, ${falhas} falharam.`)
process.exit(falhas === 0 ? 0 : 1)
