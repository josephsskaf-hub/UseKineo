#!/usr/bin/env node
// ═══ KINEO-CREDITO-PRESO-2026-09-03 (sprint-assinaturas #5) ═════════════════
//
// O CASO. Quem pede um filme e nao tem saldo por causa de um render anterior
// que ainda nao se resolveu recebia esta frase:
//
//   "A video you already started is still holding N credits. If it doesn't
//    finish, they come back automatically within the hour."
//
// Medido em producao (`compose_refused` reason='credits_held_by_render',
// contas externas, 17/08 -> 02/09): 16 recusas, 10 pessoas, ZERO viraram filme
// em 24h, 8 das 10 nunca viram um unico filme da Kineo na vida. Os 16 debitos
// que seguravam o credito foram TODOS estornados depois — a promessa era
// verdadeira e inutil. E a idade do debito no instante da recusa (minutos):
//
//   0 0 1 1 2 2 2 3 3 4 10 20 40 74     <- 11 das 16 abaixo de 5 minutos
//
// Ou seja: na maioria esmagadora o render NAO estava morto, estava no forno, e
// a pessoa clicou de novo. Ela recebeu um erro de saldo com cara de paywall.
// Uma delas (ferruxezimzade, 23/08) levou a mesma parede 5 vezes em 84s.
//
// O QUE ESTE TESTE PROVA, com os modulos REAIS compilados:
//   1. os 16 casos de producao caem na frase CERTA (forno x credito preso);
//   2. `explainsGap` nao foi afrouxado: quem esta sem saldo de verdade
//      continua lendo a frase antiga;
//   3. idade indatavel NUNCA vira "no forno" (o sentido da falha importa);
//   4. a frase do forno nao promete prazo, nao cita preco e nao pede plano;
//   5. no route.ts, o estorno ao vivo acontece ANTES da recusa e ANTES de
//      qualquer coisa que dependa do saldo — provado por indice no texto;
//   6. a varredura escopada nao afrouxou nada: mesmo cutoff, mesma prova, e o
//      `userId` so ESTREITA a consulta;
//   7. sem `opts`, `sweepAbandonedCinematicDebits` continua identica ao cron.
//
// Rodar: node scripts/test-credito-preso.mjs   (sem rede, sem custo)

import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
let ok = 0
const falhas = []
function v(nome, cond) {
  if (cond) { ok++; return }
  falhas.push(nome)
  console.error('  FALHOU: ' + nome)
}

function acharTsc(base) {
  const tentativas = []
  let dir = base
  for (let i = 0; i < 6; i++) {
    tentativas.push(join(dir, 'node_modules', 'typescript', 'bin', 'tsc'))
    const pai = dirname(dir)
    if (pai === dir) break
    dir = pai
  }
  for (const t of tentativas) if (existsSync(t)) return t
  console.error('Nao achei o typescript. Rode `npm install` na pasta do projeto.')
  process.exit(1)
}
const TSC = acharTsc(raiz)

// ── compila o modulo puro REAL (sem dependencia nenhuma) ────────────────────
const saida = mkdtempSync(join(tmpdir(), 'kineo-preso-'))
const requerer = createRequire(join(saida, 'x.cjs'))
mkdirSync(join(saida, 'src'), { recursive: true })
writeFileSync(join(saida, 'src', 'heldRender.ts'), readFileSync(join(raiz, 'lib/credits/heldRender.ts'), 'utf8'))
execFileSync(process.execPath, [
  TSC, join(saida, 'src', 'heldRender.ts'),
  '--outDir', join(saida, 'out'), '--module', 'commonjs', '--target', 'es2022',
  '--moduleResolution', 'node', '--skipLibCheck', '--strict', '--rootDir', join(saida, 'src'),
], { stdio: 'pipe' })
writeFileSync(join(saida, 'out', 'package.json'), JSON.stringify({ type: 'commonjs' }))
const M = requerer(join(saida, 'out', 'heldRender.js'))
const { classifyHold, inFlightMessage, HOLD_IN_FLIGHT_MAX_AGE_MS } = M

const min = (m) => m * 60 * 1000

console.log('\n1) OS 16 CASOS DE PRODUCAO, um por um')
// pessoa, saldo, custo, credito preso, idade do debito em minutos.
// Copiados do banco em 03/09 (events.compose_refused, credits_held_by_render).
const PRODUCAO = [
  ['02/09 wummm709', 6, 19, 19, 0],
  ['01/09 contextoaparte', 6, 19, 19, 0],
  ['30/08 fazilazaheer03', 10, 15, 15, 74],
  ['28/08 bishtnakul49 b', 19, 25, 6, 20],
  ['28/08 bishtnakul49 a', 19, 25, 6, 2],
  ['24/08 gugtenterf', 10, 12, 15, 4],
  ['23/08 ferruxezimzade e', 5, 20, 20, 3],
  ['23/08 ferruxezimzade d', 5, 20, 20, 2],
  ['23/08 ferruxezimzade c', 5, 20, 20, 2],
  ['23/08 ferruxezimzade b', 5, 20, 20, 1],
  ['23/08 ferruxezimzade a', 5, 20, 20, 0],
  ['22/08 tworldsoftware b', 10, 15, 15, 3],
  ['22/08 tworldsoftware a', 10, 15, 15, 1],
  ['21/08 tsatsraljess', 26, 30, 54, 40],
  ['19/08 a0935728843a', 10, 20, 20, 10],
  ['17/08 rohanthapa476', 9, 20, 20, 2],
]
v('os 16 casos medidos estao no teste', PRODUCAO.length === 16)
let forno = 0
let velhos = 0
for (const [nome, saldo, custo, preso, idadeMin] of PRODUCAO) {
  const r = classifyHold({ hold: { held: preso, newestAgeMs: min(idadeMin) }, balance: saldo, cost: custo })
  // TODOS os 16 tem `explainsGap` — foi assim que entraram na consulta.
  v(nome + ': o credito preso explica o buraco', r.explainsGap === true)
  if (idadeMin < 12) {
    forno++
    v(nome + ': ' + idadeMin + ' min => filme NO FORNO', r.inFlight === true)
    v(nome + ': minutos nunca zero na frase', r.minutes !== null && r.minutes >= 1)
  } else {
    velhos++
    v(nome + ': ' + idadeMin + ' min => render velho, frase antiga', r.inFlight === false)
  }
}
v('13 dos 16 sao filme no forno', forno === 13)
v('3 dos 16 passam dos 12 min', velhos === 3)

console.log('\n2) `explainsGap` NAO foi afrouxado')
// Sem saldo de verdade: 5 de saldo, 20 de custo, 2 presos. Nem de volta fecha.
v('preso que nao fecha a conta nao desculpa nada',
  classifyHold({ hold: { held: 2, newestAgeMs: min(1) }, balance: 5, cost: 20 }).explainsGap === false)
v('e por isso tambem nao vira "no forno"',
  classifyHold({ hold: { held: 2, newestAgeMs: min(1) }, balance: 5, cost: 20 }).inFlight === false)
v('preso zero nunca explica',
  classifyHold({ hold: { held: 0, newestAgeMs: min(1) }, balance: 5, cost: 20 }).explainsGap === false)
v('fecha exatamente na borda (saldo+preso === custo)',
  classifyHold({ hold: { held: 15, newestAgeMs: min(1) }, balance: 5, cost: 20 }).explainsGap === true)
v('um credito abaixo da borda ja nao explica',
  classifyHold({ hold: { held: 14, newestAgeMs: min(1) }, balance: 5, cost: 20 }).explainsGap === false)

console.log('\n3) idade indatavel NUNCA vira "no forno"')
for (const idade of [null, undefined, NaN, -1, Infinity]) {
  const r = classifyHold({ hold: { held: 20, newestAgeMs: idade }, balance: 5, cost: 20 })
  v('idade ' + String(idade) + ': explica o buraco (diagnostico antigo intacto)', r.explainsGap === true)
  v('idade ' + String(idade) + ': NAO promete filme no forno', r.inFlight === false)
}
v('idade indatavel nao inventa minutos',
  classifyHold({ hold: { held: 20, newestAgeMs: null }, balance: 5, cost: 20 }).minutes === null)

console.log('\n4) a regua dos 12 minutos')
v('11:59 ainda e forno', classifyHold({ hold: { held: 20, newestAgeMs: min(12) - 1000 }, balance: 5, cost: 20 }).inFlight === true)
v('12:00 exatos ja nao sao', classifyHold({ hold: { held: 20, newestAgeMs: min(12) }, balance: 5, cost: 20 }).inFlight === false)
v('a regua e a MIN_AGE_MS do cron de resgate (12 min)', HOLD_IN_FLIGHT_MAX_AGE_MS === 12 * 60 * 1000)
const cronFonte = readFileSync(join(raiz, 'app/api/cron/finish-stranded-renders/route.ts'), 'utf8')
v('e o cron continua com MIN_AGE_MS de 12 min (se mudar la, este teste cai)',
  /const MIN_AGE_MS = 12 \* 60 \* 1000/.test(cronFonte))

console.log('\n5) a frase do forno')
const f = inFlightMessage(3, 19)
v('diz que o filme esta sendo feito', /still being made/.test(f))
v('diz a idade real', /from 3 minutes ago/.test(f))
v('diz quantos creditos estao segurando', /19 credits/.test(f))
v('manda NAO comecar de novo', /do not need to start it again/i.test(f))
v('promete o e-mail se fechar a aba', /email you the link/i.test(f))
v('NAO fala em plano', !/plan|upgrade|subscri/i.test(f))
v('NAO tem preco', !/\$|\bUSD\b|price/i.test(f))
v('NAO promete "within the hour"', !/within the hour/i.test(f))
v('singular de 1 credito', /1 credit\b/.test(inFlightMessage(2, 1)) && !/1 credits/.test(inFlightMessage(2, 1)))
v('singular de 1 minuto', /from 1 minute ago/.test(inFlightMessage(1, 5)))
v('sem minutos legiveis, "a moment"', /from a moment ago/.test(inFlightMessage(null, 5)))

console.log('\n6) route.ts: o estorno acontece ANTES da recusa')
const rota = readFileSync(join(raiz, 'app/api/generate-video-cinematic/route.ts'), 'utf8')
const iRelease = rota.indexOf('releaseHeldCreditsNow(user.id)')
const iRecusa = rota.indexOf('const stallReason = heldExplainsGap')
const iResposta = rota.indexOf('? inFlightMessage(holdMinutes, heldByUnsettled)')
v('a rota chama o estorno ao vivo', iRelease > 0)
v('a rota decide a recusa depois do estorno', iRecusa > 0)
v('o estorno vem ANTES de decidir a recusa', iRelease < iRecusa)
v('o estorno vem ANTES de montar a resposta', iRelease < iResposta)
v('o saldo e RELIDO depois do estorno', /rereadVideoCredits\(user\.id\)/.test(rota))
v('o saldo so sobe, nunca desce, na releitura', /if \(fresh !== null && fresh > balance\) balance = fresh/.test(rota))
v('balance deixou de ser const (senao a releitura nao compila)', /let balance = profile\?\.video_credits \?\? 0/.test(rota))
v('a recusa por saldo e reavaliada DEPOIS do estorno (dois `if (balance < cost)`)',
  (rota.match(/if \(balance < cost\) \{/g) || []).length >= 2)
v('o desfecho do estorno vira evento medivel', /credits_held_release_attempted/.test(rota))
v('o evento carrega `unblocked` (a metrica da jogada)', /unblocked: balance >= cost/.test(rota))
v('a frase vem do modulo puro, sem segunda copia na rota',
  /inFlightMessage\(holdMinutes, heldByUnsettled\)/.test(rota) && !/still being made/.test(rota))
v('o motivo novo nao abre caixa de plano (upsell preso ao heldExplainsGap)',
  /upsell: trialBuyer && !heldExplainsGap \? 'creator' : undefined/.test(rota))
v('a telemetria da recusa separa os dois casos', /hold_in_flight: holdIsInFlight/.test(rota))
v('a telemetria guarda a idade que decidiu', /hold_age_ms: hold\.newestAgeMs/.test(rota))
v('a frase antiga do credito preso continua existindo para o caso velho',
  /come back automatically within the hour/.test(rota))

// ── A NAO-REGRESSAO QUE MAIS IMPORTA ──────────────────────────────────────
// GenerateClient.tsx tem, desde o sprint-v1v4 #33, uma SALA DE ESPERA ligada
// a `reason === 'credits_held_by_render'`: sem caixa de planos, com
// rechecagem, exibindo o texto do servidor. Se esta jogada tivesse inventado
// um `reason` novo, o caso MAIS COMUM (filme no forno, 13 dos 16) cairia no
// painel vermelho generico — que ainda diz "your credits have been returned -
// you can retry safely", exatamente a mentira que o #33 foi criado para
// matar. A frase nova entra NA SALA DE ESPERA porque o `reason` nao mudou.
v('o `reason` de fio continua sendo credits_held_by_render (nao inventar motivo novo)',
  /const stallReason = heldExplainsGap\s*\r?\n\s*\? 'credits_held_by_render'/.test(rota))
v('nenhum reason novo vazou para o cliente', !/'render_in_flight'/.test(rota))
const cliente = readFileSync(join(raiz, 'app/(dashboard)/generate/GenerateClient.tsx'), 'utf8')
v('a sala de espera do cliente continua ligada a esse reason',
  /data\?\.reason === 'credits_held_by_render'/.test(cliente))
v('a sala de espera mostra o texto do servidor (por onde a frase nova entra)',
  /message: typeof data\?\.error === 'string' \? data\.error : ''/.test(cliente))
v('a distincao viaja em holdState, campo aditivo',
  /holdState: heldExplainsGap \? \(holdIsInFlight \? 'in_flight' : 'dead'\) : undefined/.test(rota))

console.log('\n7) a varredura escopada nao afrouxou nada')
const refund = readFileSync(join(raiz, 'lib/credits/refund.ts'), 'utf8')
v('a assinatura aceita escopo opcional',
  /sweepAbandonedCinematicDebits\(opts\?: \{ userId\?: string; limit\?: number \}\)/.test(refund))
v('o userId apenas ESTREITA a consulta',
  /if \(opts\?\.userId\) debitQuery = debitQuery\.eq\('user_id', opts\.userId\)/.test(refund))
v('o cutoff continua sendo o mesmo do cron', /const cutoff = new Date\(Date\.now\(\) - CINEMATIC_ABANDON_CUTOFF_MS\)/.test(refund))
v('CINEMATIC_ABANDON_CUTOFF_MS nao foi mexido', /const CINEMATIC_ABANDON_CUTOFF_MS = 100 \* 60 \* 1000/.test(refund))
v('o filtro de abandono (refunded_at null) continua', /\.is\('refunded_at', null\)/.test(refund))
v('so debitos cinematic-% continuam elegiveis', /\.like\('render_id', 'cinematic-%'\)/.test(refund))
v('a prova de nao-entrega (claim de nascimento settled) continua', /textField\(birthMeta\.status\) !== 'settled'/.test(refund))
v('o claim continua sendo liberado em `provider_abandoned_refunded`', /reason: 'provider_abandoned_refunded'/.test(refund))
v('o cron horario continua chamando sem opts',
  /sweepAbandonedCinematicDebits\(\)/.test(readFileSync(join(raiz, 'app/api/cron/refund-sweep/route.ts'), 'utf8')))

console.log('\n8) o teto do escopo')
// limite valido, invalido e absurdo — nunca passa de 200 nem cai abaixo de 1.
const teto = (x) => Math.min(Math.max(Math.trunc(Number(x ?? 200)) || 200, 1), 200)
v('sem limite => 200', teto(undefined) === 200)
v('limite 5 => 5', teto(5) === 5)
v('limite 0 => 200 (0 e falsy, cai no padrao)', teto(0) === 200)
v('limite negativo => 1', teto(-9) === 1)
v('limite gigante => 200', teto(99999) === 200)
v('limite lixo => 200', teto('abc') === 200)
v('a rota pede 5, igual a janela do diagnostico',
  /sweepAbandonedCinematicDebits\(\{ userId, limit: 5 \}\)/.test(rota))

console.log('\n' + '='.repeat(70))
if (falhas.length === 0) {
  console.log('OK — ' + ok + ' verificacoes, 0 falhas.')
  process.exit(0)
}
console.error(falhas.length + ' FALHA(S) de ' + (ok + falhas.length) + ':')
for (const nome of falhas) console.error('  - ' + nome)
process.exit(1)
