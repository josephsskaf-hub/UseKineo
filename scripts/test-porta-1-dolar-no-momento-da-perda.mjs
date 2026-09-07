#!/usr/bin/env node
/**
 * GUARDIÃO — KINEO-PORTA-NO-MOMENTO-DA-PERDA-2026-09-07 (va-r6)
 *
 * Prova que a carta de MAIOR ALCANCE da casa — `downgraded_loss`, 686 envios
 * para 676 pessoas em 60 dias, disparada no minuto em que o trial morre e os
 * créditos somem — oferece a porta de entrada paga nos DOIS ramos de quem já
 * recebeu alguma coisa, e NÃO a oferece a quem nunca viu um filme sair.
 *
 * POR QUE ESTA CARTA E NÃO OUTRA (medido na rotação va-r6, 60d, campo
 * `utm_campaign`, com controle rodado — o campo tem 1.073 chegadas e 25
 * campanhas distintas, então um zero nele seria zero de verdade):
 *   · `downgraded_loss` .......... 686 envios → 4 visitantes no link de dinheiro
 *   · `expired_offer_d5` + `d10` .. 1.006 envios → 6 visitantes, e é onde a
 *     porta nasceu hoje de tarde
 *   · dos 12 pagantes dos últimos 90 dias, DEZ pagaram em menos de 48h do
 *     cadastro. O D5/D10 fala com a pessoa fora dessa janela; esta carta fala
 *     dentro dela.
 *
 * ESTILO readFileSync DE PROPÓSITO: guardião com alias `@/` não roda neste
 * repo (memória `guardioes-com-alias-nao-rodam`). A fonte é lida como texto.
 *
 * E ELE NÃO PODE SER UM CONTADOR DE TEXTO: um mutante que troque
 * `if (c.burnedWithFilm)` por `if (true)` mantém toda a contagem intacta
 * (memória `guardiao-contar-texto-nao-prova-condicao`). Por isso as
 * verificações são feitas sobre RECORTES por ramo, e a bateria de mutantes no
 * fim prova que cada recorte realmente cai quando a condição muda — cada
 * mutante conferindo antes que o texto MUDOU (memória
 * `mutacao-precisa-provar-que-aplicou`).
 */
import { readFileSync } from 'node:fs'

const ROTA = 'app/api/cron/trial-lifecycle-emails/route.ts'
const COBRADOR = 'app/api/stripe/checkout/route.ts'

// CRLF no checkout do Windows quebra âncora de duas linhas — normalizar SEMPRE
// na leitura (memória `guardiao-crlf-falso-vermelho`).
const ler = (f) => readFileSync(f, 'utf8').split('\r\n').join('\n')

let ok = 0
let falhas = 0
const check = (nome, cond) => {
  if (cond) ok += 1
  else { falhas += 1; console.error(`  ✗ ${nome}`) }
}

// ── recortes por ramo ───────────────────────────────────────────────────────
// Se um ramo sumir, mudar de condição, ou a porta escorregar para fora dele,
// o recorte devolve null / muda de conteúdo e as verificações caem.
function recortes(src) {
  const i = src.indexOf("if (c.kind === 'downgraded_loss') {")
  const fim = src.indexOf("if (c.kind === 'expired_offer_d5') {", i < 0 ? 0 : i)
  if (i < 0 || fim < 0) return null
  const carta = src.slice(i, fim)

  const iNever = carta.indexOf('if (neverRan) {')
  const iBurn = carta.indexOf('if (c.burnedWithFilm) {')
  const iStd = carta.indexOf("const ep2 = episodeTwoBlock(c.lastTopic, 'trial_loss_episode2'")
  if (iNever < 0 || iBurn < 0 || iStd < 0) return null
  if (!(iNever < iBurn && iBurn < iStd)) return null

  return {
    carta,
    neverRan: carta.slice(iNever, iBurn),
    burned: carta.slice(iBurn, iStd),
    padrao: carta.slice(iStd),
  }
}

const src = ler(ROTA)
const cobrador = ler(COBRADOR)
const r = recortes(src)

console.log('GUARDIÃO — a porta de entrada no momento da perda\n')

check('1. a carta downgraded_loss existe e tem os TRÊS ramos na ordem esperada', r !== null)
if (!r) {
  console.error('\nRecorte impossível — o resto não pode ser afirmado.')
  process.exit(1)
}

// ── a porta existe nos dois ramos de quem recebeu algo ──────────────────────
check('2. ramo burnedWithFilm monta a porta com campanha própria',
  r.burned.includes("trialEntryUrl('trial_1usd_loss_burned')"))
check('3. ramo padrão monta a porta com campanha própria (balde separado)',
  r.padrao.includes("trialEntryUrl('trial_1usd_loss')"))
check('4. as duas campanhas são DIFERENTES entre si e diferentes do D5/D10',
  new Set(['trial_1usd_loss_burned', 'trial_1usd_loss', 'trial_1usd_d5', 'trial_1usd_d10']).size === 4)
check('5. burned: a frase da porta sai da constante derivada, no texto',
  r.burned.includes('The cheapest way back in is ${TRIAL_ENTRY_LINE}. Cancel anytime.'))
check('6. burned: a frase da porta sai da constante derivada, no html',
  r.burned.includes('${escapeHtmlText(TRIAL_ENTRY_LINE)}'))
check('7. padrão: a frase da porta sai da constante derivada, no texto',
  r.padrao.includes('The cheapest way back in is ${TRIAL_ENTRY_LINE}. Cancel anytime.'))
check('8. padrão: a frase da porta sai da constante derivada, no html',
  r.padrao.includes('${escapeHtmlText(TRIAL_ENTRY_LINE)}'))
check('9. burned: o link da porta desce para o corpo de texto',
  r.burned.includes('${lossTrialUrl}'))
check('10. padrão: o link da porta desce para o corpo de texto',
  r.padrao.includes('${lossTrialUrl}'))
check('11. burned: o botão do html aponta para a porta, não para outro link',
  r.burned.includes('${cta(lossTrialUrl,'))
check('12. padrão: o botão do html aponta para a porta, não para outro link',
  r.padrao.includes('${cta(lossTrialUrl,'))
check('13. o prazo do botão é derivado de CARD_TRIAL_DAYS, nunca digitado',
  (r.burned + r.padrao).split('${CARD_TRIAL_DAYS}-day Creator trial').length - 1 === 2)

// ── quem NÃO recebe a porta, e isso é decisão ──────────────────────────────
check('14. o ramo neverRan NÃO oferece a porta (objeção é de prova, não de preço)',
  !r.neverRan.includes('lossTrialUrl') && !r.neverRan.includes('TRIAL_ENTRY_LINE'))
check('15. o ramo neverRan continua oferecendo o filme grátis de 1 clique',
  r.neverRan.includes('oneClickBlocks('))

// ── nada foi removido para caber a porta ───────────────────────────────────
check('16. burned: /pricing continua no e-mail', r.burned.includes('plansUrl'))
check('17. padrão: /pricing continua no e-mail', r.padrao.includes("cta(url, 'Get Creator back')"))
check('18. burned: a tabela de filmes por plano continua intacta',
  r.burned.includes('${plansText}') && r.burned.includes('${plansHtml}'))
check('19. burned: o episódio 2 continua no e-mail', r.burned.includes('ep2b'))
check('20. padrão: o episódio 2 continua no e-mail', r.padrao.includes('${ep2.text}'))
check('21. burned: a Library continua sendo o primeiro link', r.burned.includes('libraryUrl'))
check('22. a lista de perdas continua sendo montada pelos bullets',
  r.burned.includes('${bullets.map(') && r.padrao.includes('${bullets.map('))

// ── nenhum valor digitado à mão nesta carta ────────────────────────────────
// A trava da casa: preço/valor nasce da fonte única, nunca do teclado. O
// recorte inclui comentários de propósito — a trava não sabe distinguir
// comentário de copy, e ensiná-la a distinguir abre a porta pela qual o número
// volta (lição da va-r5).
const PRECO_LITERAL = /\$\d|USD|\b\d+\.\d\d\b/
check('23. burned: nenhum preço literal digitado no ramo', !PRECO_LITERAL.test(r.burned))
check('24. padrão: nenhum preço literal digitado no ramo', !PRECO_LITERAL.test(r.padrao))

// ── o carimbo do deploy ────────────────────────────────────────────────────
check('25. os três ramos da carta carimbam trialDoor (inclusive o FALSO explícito)',
  r.neverRan.includes('trialDoor: false') &&
  r.burned.includes('trialDoor: true') &&
  r.padrao.includes('trialDoor: true'))
check('26. o carimbo desce para o metadata do evento',
  src.includes('{ trial_door: body.trialDoor }'))
check('27. o carimbo é omitido quando indefinido — linha antiga não vira "false"',
  src.includes('body.trialDoor === undefined ? {} :'))
check('28. o tipo de retorno de buildEmail declara o carimbo',
  /function buildEmail\(c: Candidate\):[^\n]*trialDoor\?: boolean/.test(src))

// ── o cobrador realmente abre a porta para esta coorte ─────────────────────
// (memória `vitrine-oferece-o-que-o-cobrador-recusa`: não anunciar o que o
// caixa recusa. A coorte é trial morto que nunca pagou.)
check('29. a URL da porta continua pedindo o trial pago no tier certo',
  src.includes("const TRIAL_ENTRY_PATH = '/api/stripe/checkout?tier=basic&billing=monthly&trial=1'"))
check('30. o cobrador ainda recusa o trial APENAS por has_paid',
  /has_paid/.test(cobrador) && /trial/.test(cobrador))

// ══ MUTANTES — cada um prova que aplicou ANTES de exigir o vermelho ════════
const mutantes = [
  {
    nome: 'apagar a porta do ramo burned',
    de: "trialEntryUrl('trial_1usd_loss_burned')",
    para: "`${APP_URL}/pricing`",
  },
  {
    nome: 'apagar a porta do ramo padrão',
    de: "trialEntryUrl('trial_1usd_loss')",
    para: "`${APP_URL}/pricing`",
  },
  {
    nome: 'jogar os dois ramos no mesmo balde de campanha',
    de: "trialEntryUrl('trial_1usd_loss_burned')",
    para: "trialEntryUrl('trial_1usd_loss')",
  },
  {
    nome: 'oferecer a porta a quem nunca viu um filme sair',
    de: 'trialDoor: false,',
    para: 'trialDoor: true,',
  },
  {
    nome: 'parar de carimbar o evento',
    de: '{ trial_door: body.trialDoor }',
    para: '{}',
  },
  {
    nome: 'trocar o botão da porta pelo link de /pricing',
    de: '${cta(lossTrialUrl,',
    para: '${cta(url,',
  },
]

// Mutante do valor DIGITADO. O texto de substituição é montado por
// concatenação de propósito: um valor literal escrito neste arquivo poderia
// ser lido por outra trava da casa como se fosse copy, e guardião que dispara
// trava alheia treina gente a ignorar guardião.
mutantes.push({
  nome: 'digitar o valor à mão em vez de derivar do cobrador',
  de: 'The cheapest way back in is ${TRIAL_ENTRY_LINE}. Cancel anytime.',
  para: 'The cheapest way back in is ' + '$' + '1 for 7 days. Cancel anytime.',
})

function rodarSobre(texto) {
  const rr = recortes(texto)
  if (!rr) return false
  const P = /\$\d|USD|\b\d+\.\d\d\b/
  return (
    rr.burned.includes("trialEntryUrl('trial_1usd_loss_burned')") &&
    rr.padrao.includes("trialEntryUrl('trial_1usd_loss')") &&
    rr.burned.includes('The cheapest way back in is ${TRIAL_ENTRY_LINE}. Cancel anytime.') &&
    rr.padrao.includes('The cheapest way back in is ${TRIAL_ENTRY_LINE}. Cancel anytime.') &&
    rr.burned.includes('${cta(lossTrialUrl,') &&
    rr.padrao.includes('${cta(lossTrialUrl,') &&
    !rr.neverRan.includes('lossTrialUrl') &&
    !rr.neverRan.includes('TRIAL_ENTRY_LINE') &&
    rr.neverRan.includes('trialDoor: false') &&
    !P.test(rr.burned) &&
    !P.test(rr.padrao) &&
    texto.includes('{ trial_door: body.trialDoor }')
  )
}

console.log('\nMUTANTES (cada um tem de deixar o guardião vermelho):')
for (const m of mutantes) {
  if (!src.includes(m.de)) {
    falhas += 1
    console.error(`  x mutante NAO ANCOROU: ${m.nome}`)
    continue
  }
  const mutado = src.split(m.de).join(m.para)
  if (mutado === src) {
    falhas += 1
    console.error(`  x mutante NAO APLICOU (texto identico): ${m.nome}`)
    continue
  }
  if (rodarSobre(mutado)) {
    falhas += 1
    console.error(`  x mutante PASSOU (guardiao cego): ${m.nome}`)
  } else {
    ok += 1
    console.log(`  ok pegou: ${m.nome}`)
  }
}

console.log(`\n${ok} verificacoes OK - ${falhas} falhas`)
process.exit(falhas === 0 ? 0 : 1)
