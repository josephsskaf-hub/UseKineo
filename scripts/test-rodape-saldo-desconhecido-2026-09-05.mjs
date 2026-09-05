#!/usr/bin/env node
// KINEO-RODAPE-SALDO-DESCONHECIDO-2026-09-05 (sprint-assinaturas #1)
//
// O DEFEITO. O rodape do e-mail "Your Short is ready" decide entre pedir o
// EPISODIO 2 e pedir o PLANO olhando `creditsRemaining`. Quando esse campo era
// `null` — saldo DESCONHECIDO — a decisao caia no ramo de quem esta SEM saldo:
// a porta do episodio 2 desaparecia e sobrava so o preco. Medido no banco
// (marco 03/09 16:00 UTC, 43h, contas externas): dos 26 e-mails `plan_films`,
// 22 sairam com `credits_remaining` NULL, e 17 das 20 pessoas desse grupo
// tinham >= 5 creditos na mao (media 8,3) — dava para fazer outro filme.
// A causa e estrutural: nos motores cinematicos o credito e consumido na
// ABERTURA do job, entao /api/compose/status nao tem retorno de debito e
// carimba `null` de proposito. Quem usou o motor CARO era o unico a perder a
// porta.
//
// Este teste prova as duas metades: (1) o comportamento da biblioteca real e
// (2) que a rota real passou a resolver o saldo pelo perfil.
import { readFileSync } from 'node:fs'
import { videoReadyFooter, videoReadyFooterFromRows, NEXT_VIDEO_MIN_CREDITS } from '../lib/lifecycle/videoReadyFooter.ts'

let ok = 0
const falhas = []
const checa = (n, c, d = '') => { if (c) { ok++; console.log(`  ok  ${n}`) } else { falhas.push(n); console.log(`  XX  ${n}${d ? ' — ' + d : ''}`) } }

const APP = 'https://www.usekineo.com'
const TEMA = 'The Boiling River of the Amazon'
const base = { topic: TEMA, cost: 15, durationSeconds: 62, appUrl: APP }

const temPortaEp2 = (h) => /Episode 2:/.test(h)
const temLinkPlano = (h) => /\/pricing\?/.test(h)
const citaSaldo = (h) => /You have <strong[^>]*>\d+ credits?<\/strong> left/i.test(h)

console.log('\n== 1. o caso do defeito: saldo desconhecido, tema conhecido ==')
const desconhecido = videoReadyFooter({ ...base, isSubscriber: false, creditsRemaining: null })
checa('kind proprio, para o antes/depois ser contavel', desconhecido.kind === 'unknown_balance_episode2', desconhecido.kind)
checa('a porta do episodio 2 VOLTA a existir', temPortaEp2(desconhecido.html))
checa('a porta carrega o tema REAL da pessoa', desconhecido.html.includes('The Boiling River of the Amazon'))
checa('o pedido de plano CONTINUA (a oferta nao foi removida)', temLinkPlano(desconhecido.html))
checa('NENHUMA frase afirma saldo (sem numero provado, nao se cita numero)', !citaSaldo(desconhecido.html))
checa('o link do episodio 2 e absoluto (e-mail nao tem caminho relativo)', /href="https:\/\/www\.usekineo\.com\/generate\?/.test(desconhecido.html))
checa('o link carrega series=1 (senao a chegada nao e contada)', /series=1/.test(desconhecido.html))
// A fonte e o que o evento de chegada (series_continuation_landed) carrega;
// a campanha e o que o e-mail carrega. Os dois precisam ser proprios deste
// ramo, senao o antes/depois do conserto some no meio das outras portas.
checa('fonte propria no link (e o que series_continuation_landed grava)', /continuation_source=video_ready_unknown_balance&/.test(desconhecido.html))
checa('campanha propria no link', /utm_campaign=video_ready_unknown_balance_episode2/.test(desconhecido.html))
checa(
  'as outras portas NAO herdaram a fonte nova',
  /continuation_source=video_ready_email&/.test(
    videoReadyFooter({ ...base, isSubscriber: false, creditsRemaining: 12 }).html,
  ),
)

console.log('\n== 2. o que NAO pode ter mudado ==')
const comSaldo = videoReadyFooter({ ...base, isSubscriber: false, creditsRemaining: 12 })
checa('saldo >= 5 continua trial_episode2', comSaldo.kind === 'trial_episode2', comSaldo.kind)
checa('e continua citando o saldo (numero provado)', citaSaldo(comSaldo.html))

const semSaldo = videoReadyFooter({ ...base, isSubscriber: false, creditsRemaining: 2 })
checa('saldo PROVADO baixo continua plan_films', semSaldo.kind === 'plan_films', semSaldo.kind)
checa('e continua SEM porta de episodio 2 (nao mandamos ninguem para a parede)', !temPortaEp2(semSaldo.html))

const zero = videoReadyFooter({ ...base, isSubscriber: false, creditsRemaining: 0 })
checa('saldo provado ZERO continua plan_films (0 nao e desconhecido)', zero.kind === 'plan_films', zero.kind)
checa('zero nao ganha porta', !temPortaEp2(zero.html))

const assinante = videoReadyFooter({ ...base, isSubscriber: true, creditsRemaining: null })
checa('assinante com saldo desconhecido continua subscriber_next', assinante.kind === 'subscriber_next', assinante.kind)
checa('assinante nunca ve preco no e-mail de entrega', !temLinkPlano(assinante.html))
checa('assinante mantem a porta do episodio 2', temPortaEp2(assinante.html))

console.log('\n== 3. o limiar e a borda ==')
checa('o limiar continua sendo o menor filme da casa (Kineo 1 = 5cr)', NEXT_VIDEO_MIN_CREDITS === 5)
const naBorda = videoReadyFooter({ ...base, isSubscriber: false, creditsRemaining: NEXT_VIDEO_MIN_CREDITS })
checa('exatamente no limiar ainda e trial_episode2', naBorda.kind === 'trial_episode2', naBorda.kind)
const abaixo = videoReadyFooter({ ...base, isSubscriber: false, creditsRemaining: NEXT_VIDEO_MIN_CREDITS - 1 })
checa('um credito abaixo do limiar e plan_films', abaixo.kind === 'plan_films', abaixo.kind)

console.log('\n== 4. sem tema nao se inventa porta (regra do selo honesto) ==')
const semTema = videoReadyFooter({ ...base, topic: '', isSubscriber: false, creditsRemaining: null })
checa('saldo desconhecido SEM tema nao vira unknown_balance_episode2', semTema.kind !== 'unknown_balance_episode2', semTema.kind)
checa('e nao imprime porta nenhuma', !temPortaEp2(semTema.html))
const temaLixo = videoReadyFooter({ ...base, topic: 'Untitled Short', isSubscriber: false, creditsRemaining: null })
checa('tema degenerado ("Untitled Short") tambem nao abre porta', !temPortaEp2(temaLixo.html))

console.log('\n== 5. a ponte de linhas do banco (o caminho do cron) ==')
const linha = videoReadyFooterFromRows(
  { has_paid: false, plan: 'free', video_credits: null },
  { title: TEMA, topic: null, credits_used: 15, duration: 62 },
  APP,
)
checa('perfil com video_credits null cai no ramo novo, nao em plan_films', linha.kind === 'unknown_balance_episode2', linha.kind)
const linhaComSaldo = videoReadyFooterFromRows(
  { has_paid: false, plan: 'free', video_credits: 9 },
  { title: TEMA, topic: null, credits_used: 15, duration: 62 },
  APP,
)
checa('perfil com saldo real continua trial_episode2', linhaComSaldo.kind === 'trial_episode2', linhaComSaldo.kind)

console.log('\n== 6. a ROTA REAL (nao adianta a biblioteca estar certa sozinha) ==')
const rota = readFileSync(new URL('../app/api/compose/status/[renderId]/route.ts', import.meta.url), 'utf8')
checa('a leitura de perfil do e-mail passou a pedir video_credits', /has_paid, plan, video_credits, \$\{TRIAL_ENTITLEMENT_COLUMNS\}/.test(rota))
checa('existe a variavel de saldo do perfil', /let readyEmailCreditsFallback: number \| null = null/.test(rota))
checa('ela e preenchida a partir do planRow', /readyEmailCreditsFallback =[\s\S]{0,80}typeof saldoPerfil === 'number'/.test(rota))
checa('o rodape recebe debito @@ perfil, nao mais so o debito', /const readyCredits = creditsRemaining \?\? readyEmailCreditsFallback/.test(rota))
checa('e o rodape e chamado com esse valor', /creditsRemaining: readyCredits,/.test(rota))
checa('o carimbo grava o saldo EFETIVO', /credits_remaining: readyCredits,/.test(rota))
checa('o carimbo diz DE ONDE veio o numero (debit|profile|unknown)', /credits_source:/.test(rota) && /'debit'/.test(rota) && /'profile'/.test(rota) && /'unknown'/.test(rota))
checa('a leitura de perfil acontece ANTES da montagem do rodape',
  rota.indexOf('let readyEmailCreditsFallback') < rota.indexOf('const readyCredits = creditsRemaining'))

console.log('\n== 7. a oferta nao foi tocada (limite do ciclo) ==')
const lib = readFileSync(new URL('../lib/lifecycle/videoReadyFooter.ts', import.meta.url), 'utf8')
const libSemComentario = lib.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
checa('nenhum preco digitado na biblioteca', !/\$\d/.test(libSemComentario))
checa('o preco continua vindo de TIER_PRICES', /TIER_PRICES/.test(lib))
checa('os creditos continuam vindo de TIER_CREDITS', /TIER_CREDITS/.test(lib))
checa('o ramo novo reusa a MESMA funcao de plano (copy identica)', /filmsPlanHtml\(appUrl, input\.cost, input\.durationSeconds, 'video_ready_unknown_balance_plan_films'\)/.test(lib))
checa('nenhuma promessa de cupom/desconto/credito gratis', !/(coupon|discount|free credits?)/i.test(libSemComentario))

console.log(`\n${falhas.length ? 'FALHOU' : 'PASSOU'}: ${ok} verificacoes ok, ${falhas.length} falhas`)
if (falhas.length) { falhas.forEach((f) => console.log('  - ' + f)); process.exit(1) }
