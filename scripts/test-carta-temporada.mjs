#!/usr/bin/env node
// ═══ KINEO-CARTA-DA-TEMPORADA-2026-09-06 — guardiao ══════════════════════
//
// Uma carta alcanca dezenas de pessoas reais de uma vez e o carimbo e
// VITALICIO: erro aqui nao tem segunda chance com a mesma pessoa. Por isso
// este guardiao verifica tres classes de coisa, todas lendo o arquivo real:
//
//   (A) as TRAVAS DE SEGURANCA que as cartas-irmas ja tem, uma a uma — se
//       alguma faltar nesta rota, ela sai mais frouxa que as outras;
//   (B) a COORTE, que aqui e o INVERSO da `next_episode_wall` (saldo que
//       ainda paga, e nunca bateu na parede) — trocar um sinal manda a carta
//       errada para a lista mais quente da casa;
//   (C) a HONESTIDADE DA COPY e do CUSTO: nada de preco digitado, nada de
//       promessa que a casa nao cumpre, e dry-run que nao gasta.
//
// Rodar: node scripts/test-carta-temporada.mjs   (sem rede, sem custo)

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const ler = (rel) => readFileSync(join(raiz, rel), 'utf8').split('\r\n').join('\n')

const carta = ler('app/api/admin/send-season-letter/route.ts')
const irma = ler('app/api/admin/send-next-episode-wall/route.ts')
const recovery = ler('app/api/admin/send-checkout-recovery/route.ts')

let ok = 0
const falhas = []
const check = (nome, cond) => {
  if (cond) ok++
  else falhas.push(nome)
}

// ══ (A) AS TRAVAS DE SEGURANCA, COMPARADAS COM A IRMA ════════════════════
// Cada linha abaixo e uma trava que a `next_episode_wall` ja carrega. A
// comparacao com a irma e deliberada: e assim que "esqueci uma" aparece.
const TRAVAS = [
  ['opt-out respeitado', /email_opted_out === true\) continue/],
  ['dominio descartavel barrado', /isJunk\(email\)/],
  ['bloqueados do ciclo barrados', /isBloqueado\(email\)/],
  ['pagante barrado', /has_paid === true\) continue/],
  ['plano pago barrado', /PAGOS\.has\(/],
  ['carimbo de campanha em events exclui', /jaEmailado\.has\(id\)\) continue/],
  ['carimbos booleanos de profiles excluem', /STAMP_COLUMNS\.some\(/],
  ['carimbos de data de profiles excluem', /STAMP_DATES\.some\(/],
  ['quem tocou o checkout e de outra campanha', /tocouCheckout\.has\(id\)\) continue/],
  ['supressao de 24h aplicada', /loadLifecycleSuppression\(/],
  ['cabecalho de descadastro no envio', /unsubscribeHeaders\(d\.id\)/],
  ['rodape de descadastro no corpo', /emailFooterText\(userId\)/],
  ['confirm=SEND obrigatorio', /confirm=== ?'SEND'|confirm'\) === 'SEND'/],
  ['carimbo gravado SO no sucesso', /if \(!res\.ok\) throw new Error\(`resend/],
]
for (const [nome, re] of TRAVAS) {
  check(`A. ${nome}`, re.test(carta))
  // e a mesma trava tem de continuar existindo na irma (nao afrouxei nada la)
  check(`A. ${nome} — a irma tambem continua com ela`, re.test(irma))
}
// -- A DISTINCAO QUE VALE A CAMPANHA INTEIRA -----------------------------
// Carimbo de PULO nao e carimbo de ENVIO. Se alguem "simplificar" isto de
// volta para a comparacao com null (que e o que as irmas fazem), esta carta
// volta a silenciar 30 das 36 pessoas da coorte — e ficaria VERDE sem esta
// trava, porque o STAMP_DATES.some( continua no arquivo nos dois casos.
check('A. a exclusao por data usa isRealSendStamp, nao comparacao com null', /isRealSendStamp\(/.test(carta) && !/STAMP_DATES\.some\(\(c\) => raw\[c\] != null\)/.test(carta))
check('A. data ilegivel erra para o lado seguro (conta como envio)', /!Number\.isFinite\(t\) \|\| isRealSendStamp\(t\)/.test(carta))
check('A. o leitor vem da lib da casa, nao de um piso redigitado aqui', /from '@\/lib\/lifecycle\/skipStamp'/.test(carta) && !/2020-01-01/.test(carta))
check('A. teto de 30 por chamada', /Math\.min\(limiteParam, 30\)/.test(carta))
check('A. so admin da casa ou o cron entram', /ADMIN_EMAILS\.has\(/.test(carta) && /autorizadoPorCron\(req\)/.test(carta))
check('A. cron FAIL-CLOSED: sem a env, ninguem entra', /if \(!cronSecret\) return false/.test(carta))
check('A. pausa entre envios (nao estoura o fornecedor)', /setTimeout\(r, 600\)/.test(carta))

// ══ (B) A COORTE — o inverso da irma ═════════════════════════════════════
// A irma manda para quem NAO pode pagar outro filme: `saldo >= custo` exclui.
check('B. a IRMA continua mirando quem NAO tem saldo', /saldo >= ultimo\.custo\) continue/.test(irma))
// Esta carta manda para quem PODE: `saldo < custo` exclui. Trocar este sinal
// e o erro mais caro possivel aqui, e ele passaria despercebido numa leitura.
check('B. esta carta exclui quem NAO tem saldo (o inverso da irma)', /if \(saldo < custo\) continue/.test(carta))
check('B. quem bateu na parede de credito e EXCLUIDO desta carta', /if \(bateuNaParede\.has\(id\)\) continue/.test(carta))
check('B. a parede e lida do evento real, nao inferida', /'upgrade_modal_opened'/.test(carta) && /n === 'upgrade_modal_opened'\) bateuNaParede\.add\(uid\)/.test(carta))
check('B. a coorte e EXATAMENTE 1 filme, contado por pessoa', /contagem\.get\(u\) === 1/.test(carta))
check('B. o custo do episodio vem da fonte unica, nao de numero digitado', /creditCostForDuration\(q, ent\.treatAsPaid, seg\)/.test(carta))
check('B. free/pago vem de getEffectiveEntitlement, nao redigitado', /getEffectiveEntitlement\(raw\)/.test(carta))
check('B. sem custo confiavel, a pessoa NAO recebe carta', /if \(custo === null \|\| custo <= 0\) continue/.test(carta))

// ── O CARIMBO CRUZADO (aviso da #13: as DUAS rotas, ou carta dupla) ──────
check('B. a carta conhece o carimbo das duas irmas', /'next_episode_wall_emailed_v1'/.test(carta) && /'checkout_recovery_emailed_v1'/.test(carta))
check('B. a irma next_episode_wall conhece o carimbo desta carta', /'season_letter_emailed_v1'/.test(irma))
check('B. a irma checkout_recovery conhece o carimbo desta carta', /'season_letter_emailed_v1'/.test(recovery))

// ══ (C) HONESTIDADE DA COPY E DO CUSTO ═══════════════════════════════════
// Preco publico e decisao do fundador. A carta linka a pagina; nao a recita.
// ⚠ A PRIMEIRA VERSAO DESTA VERIFICACAO LIA O ARQUIVO INTEIRO e reprovava por
// causa de PAGOS = new Set(['starter','basic',...]) — que e a lista de
// EXCLUSAO de planos pagos, ou seja, uma TRAVA DE SEGURANCA, o oposto de copy
// de preco. Ler o arquivo todo mistura o que a carta DIZ com o que a rota
// SABE. A verificacao agora le so o que vai dentro do envelope: o assunto e os
// dois corpos. Escopo mais estreito e conteudo MAIS duro — passou a proibir
// tambem cupom, desconto e "/mo", que a versao larga deixava passar.
const iCopy = carta.indexOf('function assunto(')
const fCopy = carta.indexOf('type Destinatario')
const copy = iCopy > 0 && fCopy > iCopy ? carta.slice(iCopy, fCopy) : ''
check('C. o bloco de copy foi localizado (senao a verificacao seria vazia)', copy.length > 400)
check(
  'C. a copy nao escreve valor em dinheiro, nome de plano, cupom nem desconto',
  copy.length > 400 &&
    !/\$\s?\d|\d+\.\d\d\b|per month|\/mo\b|starter|creator|autopilot|coupon|discount|% off/i.test(copy),
)
check('C. a porta do plano e um LINK etiquetado, nao uma promessa', /pricing\?utm_source=lifecycle&utm_medium=email&utm_campaign=/.test(carta))
// A frase do saldo tem de ser DERIVADA. Se virar texto fixo, a carta passa a
// afirmar sobre o bolso da pessoa sem olhar o bolso dela.
check('C. quantos episodios cabem e calculado, nunca digitado', /Math\.floor\(d\.saldo \/ d\.custo\)/.test(carta))
check('C. a frase do saldo tem os tres ramos (temporada inteira / parcial / nenhum)', /cabem >= TOTAL_EPISODIOS/.test(carta) && /cabem > 0/.test(carta))
// A promessa: TITULOS escritos. Nao os cinco filmes prontos, nao o roteiro no
// e-mail — foi a mentira que o #14 removeu de outras cartas.
check('C. a carta promete TITULOS, nao filmes prontos nem roteiro por e-mail', !/full script|the whole script|five videos ready|already rendered/i.test(carta))
check('C. sem temporada NAO sai carta e a pessoa NAO e carimbada', /if \(!t\) \{[\s\S]{0,400}?semTemporada\+\+[\s\S]{0,200}?continue/.test(carta))
// Dinheiro da casa: o dry-run tem de custar zero.
const iDry = carta.indexOf("if (!confirm) {")
const iSend = carta.indexOf('const batch = destinatarios.slice(0, lote)')
const corpoDry = iDry > 0 && iSend > iDry ? carta.slice(iDry, iSend) : ''
check('C. o dry-run existe e vem ANTES do envio', corpoDry.length > 0)
check('C. o dry-run NAO escreve temporada (escrever:false)', /garantirTemporada\(admin, d\.id, d\.filmeRaw, \{ escrever: false \}\)/.test(corpoDry))
check('C. o dry-run NAO manda e-mail nenhum', !/api\.resend\.com/.test(corpoDry))
check('C. o dry-run diz quanto o envio vai custar', /custo_estimado_do_envio_usd/.test(corpoDry))
check('C. o dry-run mostra a lista nominal antes do disparo', /lista: amostra\.map/.test(corpoDry))
// A rota nao pode mexer em dinheiro do cliente.
check('C. a carta nao concede credito nem cobra nada', !/video_credits:\s|\.update\(|admin_credits_granted/.test(carta))
check('C. o unico insert e o carimbo de envio', (carta.match(/\.insert\(/g) ?? []).length === 1 && /name: SENT_EVENT/.test(carta))

console.log(`\n${ok}/${ok + falhas.length} verificacoes passaram`)
if (falhas.length) {
  console.error('\nFALHOU:')
  for (const f of falhas) console.error('  ✗ ' + f)
  process.exit(1)
}
console.log('✓ a carta so alcanca quem PODE fazer o episodio, e nao promete o que a casa nao entrega')
