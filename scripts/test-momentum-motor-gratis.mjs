#!/usr/bin/env node
/**
 * sprint-assinaturas #16 — 04/09/2026 — O SALDO ZERO COMIA O DEGRAU
 *
 * O QUE ESTE TESTE PROTEGE, E POR QUE:
 *
 * `send-momentum-nudge` e a unica campanha da casa escrita para levar a pessoa
 * do 1o ao 4o filme. Medido em 04/09 (7 dias, externos): das 138 pessoas que
 * receberam filme, as 113 que fizeram UM deram 0 assinaturas; as 25 que fizeram
 * 2+ deram as 3 assinaturas da semana. O segundo filme E a assinatura.
 *
 * A rota derrubava em SILENCIO quem estava sem credito, usando como bar o preco
 * do Kineo 1 para conta PAGANTE (`creditCostFor('fast', true)` = 5) — e esta
 * carta so fala com quem NAO paga, conta em que o mesmo motor custa 0. Eram
 * 304 de 349 candidatos do resgate de 30d (217 com exatamente 1 filme).
 *
 * As tres coisas que este teste tranca:
 *   1. a REGRA e pura, deriva o custo de creditCostFor e falha FECHADA
 *      (saldo ilegivel, cota ilegivel, cota gasta -> nao manda);
 *   2. quem ja passava continua passando IDENTICO (ramo 'credits', link sem
 *      engine=fast) — a mudanca e aditiva;
 *   3. a carta do balde novo aponta para o motor que a pessoa pode pagar
 *      (engine=fast, honrado pelo GenerateClient) e diz a verdade inteira
 *      (custa 0 credito, sai com marca d agua).
 *
 * FALSIFICACOES RODADAS DE VERDADE antes do commit (cada uma aplicada no
 * arquivo real, teste executado, arquivo restaurado):
 *   1. reintroduzir o descarte `video_credits < minCredits`    -> cai 3.2
 *   2. trocar a vaga da pessoa por um numero fixo              -> cai 4.6b
 *   3. tirar `engine: 'fast'` do link do ramo free             -> cai 5.5
 *   4. deixar o descarte por saldo mudo de novo (sem skipped)  -> cai 3.5
 *   5. cravar 0 no lugar de creditCostFor('fast', false)       -> cai 3.3
 *   6. baixar o piso do ramo pago de minCredits para 1         -> cai 3.1b
 * Nenhuma passou despercebida.
 */
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const requireFromRepo = createRequire(join(root, 'package.json'))
const ts = requireFromRepo('typescript')
const read = (path) => readFileSync(join(root, path), 'utf8')

let checks = 0
const fails = []
function ok(value, label) {
  if (value) { checks += 1; return }
  fails.push(label)
}
function equal(actual, expected, label) {
  ok(Object.is(actual, expected) || JSON.stringify(actual) === JSON.stringify(expected),
    label + ' — esperado ' + JSON.stringify(expected) + ', veio ' + JSON.stringify(actual))
}

function loadTs(path, mocks = {}) {
  const output = ts.transpileModule(read(path), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: path,
  }).outputText
  const module = { exports: {} }
  const localRequire = (id) => {
    if (Object.prototype.hasOwnProperty.call(mocks, id)) return mocks[id]
    throw new Error(path + ': import inesperado ' + id)
  }
  new Function('require', 'module', 'exports', output)(localRequire, module, module.exports)
  return module.exports
}

const ladder = loadTs('lib/momentumLadder.ts')
const engineCost = loadTs('lib/credits/engineCost.ts')
const offerMod = loadTs('lib/freeTierOffer.ts', { './credits/engineCost': engineCost })
const quota = loadTs('lib/freeFastQuota.ts')
const route = read('app/api/cron/send-momentum-nudge/route.ts')

const FREE = engineCost.creditCostFor('fast', false)
const PAID = engineCost.creditCostFor('fast', true)

// ───────────────────────────────────────────────────────────────────────────
// 1. O NUMERO QUE ORIGINOU A JOGADA E REAL NO CODIGO DE PRECO
// ───────────────────────────────────────────────────────────────────────────
equal(FREE, 0, '1.1 Kineo 1 custa ZERO na conta que este e-mail contata (nao pagante)')
equal(PAID, 5, '1.2 Kineo 1 custa 5 na conta PAGANTE — o bar antigo, e a conta errada')
ok(PAID > 0, '1.2b o bar antigo exigia credito de verdade de quem nao tem nenhum')
ok(FREE !== PAID, '1.3 os dois precos divergem: era isso que fazia o bar mentir')

// ───────────────────────────────────────────────────────────────────────────
// 2. A REGRA PURA — momentumNextFilm
// ───────────────────────────────────────────────────────────────────────────
ok(typeof ladder.momentumNextFilm === 'function', '2.1 a regra existe e e exportada')

const nf = (credits, freeQuotaLeft, freeEngineCost = FREE, creditFloor = PAID) =>
  ladder.momentumNextFilm({ credits, creditFloor, freeEngineCost, freeQuotaLeft })

// quem ja passava (saldo >= o bar antigo) continua passando, no ramo antigo
for (const c of [5, 13, 25, 40]) {
  equal(nf(c, 1), { ok: true, kind: 'credits' }, '2.2 saldo ' + c + ' continua no ramo credits')
}
// e continua passando mesmo se a vaga free estiver gasta: ela nao governa quem tem credito
equal(nf(25, 0), { ok: true, kind: 'credits' }, '2.3 vaga free gasta nao derruba quem tem credito')

// o balde novo: saldo zero + motor free de graca + vaga livre
equal(nf(0, 1), { ok: true, kind: 'free_engine' }, '2.4 saldo ZERO com vaga livre agora recebe')
equal(nf(0, 3), { ok: true, kind: 'free_engine' }, '2.5 vaga sobrando idem')

// falha fechada nos tres jeitos de nao saber / nao poder
equal(nf(0, 0).reason, 'free_quota_used', '2.6 vaga gasta nao recebe promessa de filme')
equal(nf(0, null).reason, 'unknown_balance', '2.7 cota ilegivel = nao manda (falha fechada)')
equal(nf(null, 1).reason, 'unknown_balance', '2.8 saldo ilegivel = nao manda')
equal(nf(undefined, 1).reason, 'unknown_balance', '2.9 saldo ausente = nao manda')
equal(nf(Number.NaN, 1).reason, 'unknown_balance', '2.10 saldo NaN = nao manda')
// conta em que o Fast CUSTA (pagante) e sem saldo: continua fora, com motivo visivel
equal(nf(0, 5, PAID).reason, 'too_few_credits', '2.11 conta onde o Fast custa e o saldo nao cobre')
// o piso do ramo pago E o bar antigo: 1-4 creditos nao compram filme e caem no motor free
for (const c of [1, 2, 3, 4]) {
  equal(nf(c, 1).kind, 'free_engine', '2.11b saldo ' + c + ' (abaixo do bar de ' + PAID + ') cai no motor free')
}
equal(nf(PAID - 1, 0).reason, 'free_quota_used', '2.11c e sem vaga nao recebe promessa nenhuma')
ok(nf(-3, 1).ok === true && nf(-3, 1).kind === 'free_engine',
  '2.12 saldo negativo cai no motor free quando ha vaga')
ok(nf(-3, 0).ok === false, '2.13 saldo negativo sem vaga nao recebe nada')
ok(nf(0.5, 1).kind === 'free_engine', '2.14 saldo fracionario abaixo do bar nao vira credito')
ok(nf(10, 1, FREE, Number.NaN).ok === false, '2.14b piso ilegivel = falha fechada')

// a regra e PURA: sem rede, sem banco, sem env
const ladderSrc = read('lib/momentumLadder.ts')
ok(!/fetch\(|createClient|process\.env/.test(ladderSrc), '2.15 a escada continua pura (sem rede/env)')

// ───────────────────────────────────────────────────────────────────────────
// 3. A ROTA USA A REGRA — E NAO O BAR ANTIGO
// ───────────────────────────────────────────────────────────────────────────
ok(/momentumNextFilm\(\{/.test(route), '3.1 a rota chama a regra')
ok(/creditFloor: minCredits/.test(route),
  '3.1b o piso do ramo pago E o bar antigo — a coorte de hoje nao muda de carta')
ok(route.includes("const minCredits = creditCostFor('fast', true)"),
  '3.1c e esse bar continua derivado de creditCostFor')
ok(!/video_credits as number\) \?\? 0\) < minCredits/.test(route),
  '3.2 o descarte mudo por menor-que-minCredits NAO existe mais')
ok(route.includes("const freeEngineCost = creditCostFor('fast', false)"),
  '3.3 o custo do proximo filme deriva de creditCostFor com o argumento da conta certa')
ok(/freeEngineCost,\s*\n/.test(route),
  '3.3b e e ESSE valor que a decisao recebe (nao um literal no call site)')
ok(!/freeEngineCost:\s*0\b/.test(route), '3.4 nenhum zero cravado no lugar do preco')
ok(/if \(!decision\.ok\) \{ skipped\[decision\.reason\]\+\+; continue \}/.test(route),
  '3.5 todo descarte cai num contador visivel')
for (const reason of ['too_few_credits', 'free_quota_used', 'unknown_balance']) {
  ok(new RegExp(reason + ': 0').test(route), '3.6 skipped inicializa ' + reason)
}
ok(/p\.stripe_subscription_id\) continue/.test(route),
  '3.7 pagante continua fora desta campanha (a premissa do preco free)')

// ───────────────────────────────────────────────────────────────────────────
// 4. A VAGA DO FREE TIER GOVERNA A PROMESSA — MESMA FONTE DO ENFORCEMENT
// ───────────────────────────────────────────────────────────────────────────
ok(/getFreeTierOffer\(\)/.test(route), '4.1 a cota vem da fonte unica do free tier')
ok(/countFreeFastUsage\(\{/.test(route), '4.2 a contagem e a MESMA funcao que o compose usa')
ok(/COMPOSE_CLAIM_EVENT/.test(route) && /metadata->>cost', '0'/.test(route),
  '4.3 conta reserva de custo zero, como o enforcement')
ok(/onUnknownUser: 'skip'/.test(route), '4.4 linha orfa e pulada, nao derruba a rodada')
ok(/quotaReadOk/.test(route) && /: null/.test(route),
  '4.5 leitura falha => mapa nulo => ninguem do balde novo recebe')
ok(/OFFER\.limit - \(freeUsageByUser\.get\(id\) \?\? 0\)/.test(route),
  '4.6 vagas restantes = limite da oferta menos o uso medido')
ok(/freeQuotaLeft: freeQuotaLeftFor\(id\)/.test(route),
  '4.6b e a decisao de CADA pessoa recebe a vaga DELA — nunca um numero fixo')

// a oferta residual do reverse trial e 1 por 30 dias — o numero que a promessa respeita
const on = offerMod.buildFreeTierOffer(true)
equal(on.limit, 1, '4.7 free tier residual do reverse trial: 1 filme por janela')
equal(on.windowMs, 30 * 24 * 3600000, '4.8 janela rolante de 30 dias')
const off = offerMod.buildFreeTierOffer(false)
equal(off.limit, 3, '4.9 com a flag desligada, 3 por janela')
ok(typeof quota.countFreeFastUsage === 'function', '4.10 a funcao de cota existe onde a rota a busca')

// a contagem real: uma reserva na janela ocupa a vaga, com ou sem video
const usage = quota.countFreeFastUsage({
  claims: [{ user_id: 'a', metadata: { render_id: 'r1' } }],
  videos: [{ user_id: 'a', render_id: 'r1' }, { user_id: 'b', render_id: 'r2' }],
  onUnknownUser: 'skip',
})
equal(usage.get('a'), 1, '4.11 reserva + video do mesmo render contam UMA vaga')
equal(usage.get('b'), 1, '4.12 video sem reserva tambem ocupa vaga')

// ───────────────────────────────────────────────────────────────────────────
// 5. A CARTA: O LINK DO BALDE NOVO LEVA AO MOTOR QUE A PESSOA PODE PAGAR
// ───────────────────────────────────────────────────────────────────────────
const series = loadTs('lib/seriesContinuation.ts')
const urlFree = series.buildSeriesContinuationEmailUrl('https://www.usekineo.com', 'Pompeii in 79 AD',
  'momentum_email', { utm_source: 'lifecycle', utm_medium: 'email', utm_campaign: 'momentum', engine: 'fast' })
const urlPago = series.buildSeriesContinuationEmailUrl('https://www.usekineo.com', 'Pompeii in 79 AD',
  'momentum_email', { utm_source: 'lifecycle', utm_medium: 'email', utm_campaign: 'momentum' })
ok(/[?&]engine=fast/.test(urlFree), '5.1 o link do ramo free carrega o motor')
ok(!/engine=/.test(urlPago), '5.2 o link de quem TEM credito continua identico ao de antes')
ok(urlFree.startsWith('https://www.usekineo.com/generate?'), '5.3 destino continua o Studio')
ok(/prompt=/.test(urlFree) && /autoanalyze=1/.test(urlFree), '5.4 o tema continua viajando no botao')

ok(/\.\.\.\(freeEngine \? \{ engine: 'fast' \} : \{\}\)/.test(route),
  '5.5 a rota so acrescenta o motor no ramo free')
ok(/const freeEngine = nextFilm === 'free_engine'/.test(route), '5.6 o ramo governa a carta inteira')
ok(/costs no credits on your account/.test(route), '5.7 a carta diz que o proximo filme nao custa credito')
ok(!/trial credits are gone/.test(route),
  '5.7b a frase nao afirma saldo ZERO — o ramo tambem cobre quem tem 1-4 creditos')
ok(/watermark/.test(route), '5.8 e diz a verdade inteira: sai com marca d agua')
ok(/freeLineText\s*=\s*freeEngine/.test(route) && /freeLineHtml\s*=\s*freeEngine/.test(route),
  '5.9 a frase nova existe nas duas versoes da carta (texto e html)')
ok(/buildEmail\(t\.id, t\.count, t\.topic, t\.nextFilm\)/.test(route),
  '5.10 o envio passa o ramo para a carta')

// o GenerateClient realmente honra engine=fast — senao o link e uma promessa vazia
const gen = read('app/(dashboard)/generate/GenerateClient.tsx')
ok(/searchParams\.get\('engine'\)/.test(gen), '5.11 o Studio le o parametro engine')
ok(/if \(engine === 'fast'\) \{[\s\S]{0,40}setMode\('fast'\)/.test(gen),
  '5.12 e o valor fast seleciona o Kineo 1')
ok(/urlPickedEngine/.test(gen), '5.13 a escolha da URL vence os defaults por plano')

// ───────────────────────────────────────────────────────────────────────────
// 6. MEDICAO: SEM O CARIMBO, A JOGADA NAO TEM VEREDITO
// ───────────────────────────────────────────────────────────────────────────
ok(/next_film: t\.nextFilm/.test(route), '6.1 o carimbo separa as duas coortes')
ok(/por_proximo_filme/.test(route), '6.2 o dry-run mostra o tamanho de cada balde')
ok(/exemplo_link_motor_free/.test(route), '6.3 o dry-run mostra o link exato do balde novo')
ok(/free_quota: \{/.test(route), '6.4 o dry-run mostra limite, janela e se a leitura da cota foi ok')

// ───────────────────────────────────────────────────────────────────────────
// 7. A TRAVA DE QUALIDADE DO FUNDADOR (03/09 23:40): NADA DE GERACAO MUDOU
// ───────────────────────────────────────────────────────────────────────────
for (const proibido of ['lib/compose.ts', 'lib/hollywood/', 'lib/cinematic/', 'lib/broll/',
  'lib/lyriaMusic', 'generate-script', 'analyze-idea']) {
  ok(!route.includes(proibido), '7.1 a rota nao toca ' + proibido)
}

if (fails.length) {
  console.error('\n' + fails.length + ' FALHA(S) de ' + (checks + fails.length) + ' verificacoes:\n')
  for (const f of fails) console.error('  x ' + f)
  process.exit(1)
}
console.log('OK — ' + checks + ' verificacoes, 0 falhas.')
