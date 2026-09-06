#!/usr/bin/env node
// ═══ sprint-assinaturas #4 (2026-09-05) — A FAIXA RAPIDA DO "SEU VIDEO NAO SAIU"
//
// MEDIDO NO BANCO DE PRODUCAO em 05/09 (302 envios desta campanha em 14 dias):
//   · mediana entre `video_generation_started` e o e-mail que fala disso:
//     597 HORAS = 24,9 DIAS. Apenas 3 dos 302 chegaram em menos de 2 horas.
//   · lote de hoje (25 pessoas, 16:30 UTC): mediana 19,2 dias, maximo 26,7.
//   · desfecho dos 302: 1 filme, 0 pagamentos.
//   · a ordenacao NAO e a causa: as 5 pessoas frescas do lote de hoje eram
//     exatamente as 5 com trial vivo e foram as 5 primeiras (2,4h a mais
//     rapida). A causa e o RELOGIO: um lote por dia, 16:30 UTC.
//
// Este teste le os ARQUIVOS REAIS (nunca reimplementa a regra) e prova:
//   1. `distinctUserIdsForEvents` devolve `latestAt` e le `created_at`;
//   2. a paginacao ganhou ORDER BY (o defeito do broll-gc no CLAUDE.md);
//   3. `fresh_hours` existe, e CLAMPADO, e AUSENTE = coorte de sempre;
//   4. o filtro fresco usa `started.latestAt` e exclui carimbo ilegivel;
//   5. NAO AFROUXOU: o invariante de 1 e-mail por pessoa (`.eq(FLAG_COLUMN,
//      false)`), a supressao de 4h e o SUBJECT continuam byte a byte;
//   6. o cron novo NASCE DESARMADO e so manda `confirm=SEND` com a env;
//   7. o cron novo NAO copia logica: chama o MESMO GET da rota admin;
//   8. o cron novo tem auth fail-closed e `fetchCache = 'force-no-store'`;
//   9. o vercel.json tem a entrada horaria SEM query string (a armadilha que
//      o proprio docblock da rampa documenta como falha SILENCIOSA);
//  10. o lote diario de 16:30 e a copy do e-mail ficaram intactos.
//
// Rodar: node scripts/test-stalled-frescor-2026-09-05.mjs   (sem rede, sem custo)

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')

// CRLF: o checkout limpo do Windows entrega \r\n e regex de duas linhas
// quebra ai — foi assim que a #3 ficou VERMELHA com o codigo byte a byte
// correto. Normalizar na LEITURA, sempre.
const ler = (p) => readFileSync(join(raiz, p), 'utf8').replace(/\r\n/g, '\n')

const ADMIN = 'app/api/admin/send-stalled-rescue/route.ts'
const CRON_DIARIO = 'app/api/cron/send-stalled-rescue/route.ts'
const CRON_FRESCO = 'app/api/cron/send-stalled-rescue-fresh/route.ts'
const VERCEL = 'vercel.json'

const admin = ler(ADMIN)
const cronDiario = ler(CRON_DIARIO)
const cronFresco = ler(CRON_FRESCO)
const vercel = ler(VERCEL)

let ok = 0
let fail = 0
const falhas = []
function check(nome, cond) {
  if (cond) { ok += 1; return }
  fail += 1
  falhas.push(nome)
  console.error(`  ✗ ${nome}`)
}

// ─── 1. latestAt existe e vem de created_at ────────────────────────────────
console.log('\n1) A campanha passa a saber QUANDO, nao so QUEM')
check('helper devolve latestAt no tipo de retorno',
  /distinctUserIdsForEvents\([\s\S]{0,200}?\): Promise<\{ ids: Set<string>; latestAt: Map<string, number>; error\?: string \}>/.test(admin))
check('helper seleciona created_at junto com user_id',
  /\.select\('user_id, created_at'\)/.test(admin))
check('helper mantem o Set de ids (fonte da coorte nao mudou)',
  /const ids = new Set<string>\(\)/.test(admin) && /ids\.add\(r\.user_id\)/.test(admin))
check('helper guarda o instante MAIS RECENTE por pessoa',
  /const prev = latestAt\.get\(r\.user_id\)[\s\S]{0,120}?if \(prev === undefined \|\| t > prev\) latestAt\.set\(r\.user_id, t\)/.test(admin))
check('carimbo ilegivel nao entra no mapa (Number.isFinite)',
  /if \(!Number\.isFinite\(t\)\) continue/.test(admin))
check('o caminho de erro tambem devolve latestAt (nao quebra o contrato)',
  /return \{ ids, latestAt, error: error\.message \}/.test(admin))

// ─── 2. paginacao determinista ─────────────────────────────────────────────
console.log('\n2) .range() sem ORDER BY era o defeito do broll-gc')
check('paginacao ordena por created_at',
  /\.order\('created_at', \{ ascending: true \}\)/.test(admin))
check('paginacao desempata por id (determinismo real)',
  /\.order\('id', \{ ascending: true \}\)/.test(admin))
check('a ordenacao vem ANTES do .range()',
  admin.indexOf(".order('id', { ascending: true })") < admin.indexOf('.range(from, from + PAGE - 1)'))

// ─── 3. fresh_hours: existe, clampado, ausente = hoje ──────────────────────
console.log('\n3) fresh_hours e opcional, clampado, e ausente NAO muda nada')
check('le o parametro fresh_hours da query',
  /req\.nextUrl\.searchParams\.get\('fresh_hours'\)/.test(admin))
check('fresh_hours invalido/ausente vira null',
  /const freshHours =\s*\n?\s*Number\.isFinite\(freshHoursParam\) && freshHoursParam > 0\s*\n?\s*\? Math\.min\(freshHoursParam, 720\)\s*\n?\s*: null/.test(admin))
check('fresh_hours e clampado em 720h (30 dias)',
  /Math\.min\(freshHoursParam, 720\)/.test(admin))
check('AUSENTE = a coorte inteira de sempre (stalledIdsAll)',
  /const stalledIds =\s*\n?\s*freshCutoffMs === null\s*\n?\s*\? stalledIdsAll/.test(admin))
check('a coorte crua continua sendo started menos completed',
  /const stalledIdsAll = Array\.from\(started\.ids\)\.filter\(\(id\) => !completed\.ids\.has\(id\)\)/.test(admin))

// ─── 4. o filtro fresco ────────────────────────────────────────────────────
console.log('\n4) O filtro fresco le o mapa real e falha para o lado seguro')
check('o filtro consulta started.latestAt',
  /started\.latestAt\.get\(id\)/.test(admin))
check('sem carimbo legivel a pessoa NAO e considerada fresca',
  /return typeof t === 'number' && t >= freshCutoffMs/.test(admin))
check('o corte e calculado a partir de agora menos N horas',
  /Date\.now\(\) - freshHours \* 60 \* 60 \* 1000/.test(admin))
check('o payload expoe fresh_hours (senao coorte de 2 parece coorte encolhendo)',
  /fresh_hours: freshHours,/.test(admin))
check('o payload expoe a coorte TOTAL ao lado da fresca',
  /started_never_completed_all: stalledIdsAll\.length,/.test(admin))
check('o desfecho SENT tambem diz por qual passada saiu',
  /mode: 'SENT',[\s\S]{0,400}?fresh_hours: freshHours,/.test(admin))

// ─── 5. NAO AFROUXOU ───────────────────────────────────────────────────────
console.log('\n5) NAO AFROUXOU — o que segurava a campanha continua de pe')
// ⚠ ANCORADO NA LINHA INTEIRA, e a mutacao que exigiu isso vale registrar:
// a 1a versao deste check usava /\.eq\(FLAG_COLUMN, false\)/ e SOBREVIVEU a
// remocao da linha real — porque o proprio comentario que EU escrevi na rota
// cita a chamada, e o regex casava com o comentario. Um guardiao que le a
// propria documentacao como se fosse codigo nao guarda nada.
check('1 e-mail por pessoa PARA SEMPRE: a CHAMADA .eq(FLAG_COLUMN, false) intacta',
  /^\s*\.eq\(FLAG_COLUMN, false\)\s*$/m.test(admin))
check('o carimbo de envio continua sendo gravado',
  /\.update\(\{ \[FLAG_COLUMN\]: true, stalled_rescue_sent_at: new Date\(\)\.toISOString\(\) \}\)/.test(admin))
check('a coluna de idempotencia continua sendo stalled_rescue_emailed',
  /const FLAG_COLUMN = 'stalled_rescue_emailed'/.test(admin))
check('o preflight da coluna de idempotencia continua existindo',
  /at least one is missing — refusing to send/.test(admin))
check('supressao cruzada de 4h intacta',
  /const RESCUE_SUPPRESSION_HOURS = 4/.test(admin))
check('supressao continua sendo chamada com a janela de 4h',
  /loadLifecycleSuppression\(\s*\n?\s*admin,\s*\n?\s*candidates\.map\(\(c\) => c\.id\),\s*\n?\s*RESCUE_SUPPRESSION_HOURS,/.test(admin))
check('confirm=SEND continua sendo obrigatorio para enviar',
  /const confirm = req\.nextUrl\.searchParams\.get\('confirm'\) === 'SEND'/.test(admin))
check('o lote continua limitado a 200 por chamada',
  /Math\.min\(limitParam, 200\)/.test(admin))
check('SUBJECT do e-mail intocado (nenhuma copy nova nesta entrega)',
  admin.includes(`const SUBJECT = "That video you started never came out — let's fix it"`))
check('a prioridade por relogio de trial continua sendo a ordenacao',
  /if \(at && bt\) return at\.endsAt\.getTime\(\) - bt\.endsAt\.getTime\(\)/.test(admin))
check('quem ja pagou continua fora da coorte',
  /\.filter\(\(r\) => !r\.has_paid && !r\.is_pro && !PAID_PLANS\.has\(r\.plan\)\)/.test(admin))
check('quem abandonou checkout continua sendo do send-recovery',
  /abandonedUsers\.has\(r\.id\)/.test(admin))

// ─── 6. o cron novo nasce DESARMADO ────────────────────────────────────────
console.log('\n6) A rota nova nasce dry-run — o SEND e do fundador')
check('so arma com KINEO_STALLED_FRESH_ENABLED === "true"',
  /process\.env\.KINEO_STALLED_FRESH_ENABLED === 'true'/.test(cronFresco))
check('desarmado NAO manda confirm=SEND',
  /if \(armed\) url\.searchParams\.set\('confirm', 'SEND'\)\s*\n\s*else url\.searchParams\.delete\('confirm'\)/.test(cronFresco))
check('desarmado devolve mode DISARMED (nao 200 mudo)',
  /mode: 'DISARMED'/.test(cronFresco))
check('desarmado diz quantas pessoas estao esperando (would_send)',
  /would_send: wouldSend/.test(cronFresco))
check('desarmado GRITA no log (console.warn), lição dos crons que dormiram 30 dias',
  /console\.warn\(\s*\n?\s*'\[cron\/stalled-rescue-fresh\] DISARMED/.test(cronFresco))
check('o payload diz COMO armar',
  /arm_with: 'KINEO_STALLED_FRESH_ENABLED=true'/.test(cronFresco))

// ─── 7. sem copia de logica ────────────────────────────────────────────────
console.log('\n7) Zero duplicacao: a faixa rapida chama a rota admin')
check('importa o GET da rota admin',
  /import \{ GET as adminStalledRescue \} from '@\/app\/api\/admin\/send-stalled-rescue\/route'/.test(cronFresco))
check('chama adminStalledRescue com a NextRequest montada',
  /await adminStalledRescue\(inner\)/.test(cronFresco))
check('aponta para o pathname da rota admin',
  /url\.pathname = '\/api\/admin\/send-stalled-rescue'/.test(cronFresco))
check('repassa fresh_hours para a rota admin',
  /url\.searchParams\.set\('fresh_hours', String\(hours\)\)/.test(cronFresco))
check('NAO reimplementa filtro de coorte (sem .from("profiles") no cron)',
  !/\.from\('profiles'\)/.test(cronFresco))
check('NAO fala com o Resend diretamente',
  !/api\.resend\.com/.test(cronFresco))
check('repassa o MESMO bearer recebido, nao reconstroi da env',
  /authorization: req\.headers\.get\('authorization'\) \?\? ''/.test(cronFresco))

// ─── 8. auth e cache ───────────────────────────────────────────────────────
console.log('\n8) Auth fail-closed e cache desligado')
check('sem CRON_SECRET ninguem entra',
  /const cronSecret = process\.env\.CRON_SECRET\s*\n\s*if \(!cronSecret\) return false/.test(cronFresco))
check('exige Bearer igual ao CRON_SECRET',
  /req\.headers\.get\('authorization'\) === `Bearer \$\{cronSecret\}`/.test(cronFresco))
check('403 quando nao autorizado',
  /return NextResponse\.json\(\{ error: 'Forbidden' \}, \{ status: 403 \}\)/.test(cronFresco))
check("fetchCache = 'force-no-store' (Data Cache da Vercel, 02/09)",
  /export const fetchCache = 'force-no-store'/.test(cronFresco))
check('teto por execucao clampado',
  /const MAX_FRESH_LIMIT = 15/.test(cronFresco) && /Math\.min\(Math\.floor\(raw\), max\)/.test(cronFresco))
check('janela de frescor clampada',
  /const MAX_FRESH_HOURS = 168/.test(cronFresco))
check('default da faixa: 48h e 5 por execucao',
  /const DEFAULT_FRESH_HOURS = 48/.test(cronFresco) && /const DEFAULT_FRESH_LIMIT = 5/.test(cronFresco))

// ─── 9. vercel.json ────────────────────────────────────────────────────────
console.log('\n9) A entrada horaria existe e NAO carrega query string')
let crons = null
try { crons = JSON.parse(vercel).crons } catch { crons = null }
check('vercel.json continua sendo JSON valido', Array.isArray(crons))
const fresco = (crons ?? []).find((c) => c.path === '/api/cron/send-stalled-rescue-fresh')
check('entrada /api/cron/send-stalled-rescue-fresh registrada', !!fresco)
check('a entrada roda de hora em hora', fresco?.schedule === '25 * * * *')
check('a entrada NAO depende de query string preservada pela plataforma',
  !!fresco && !fresco.path.includes('?'))
const diario = (crons ?? []).find((c) => c.path === '/api/cron/send-stalled-rescue')
check('o lote diario continua registrado', !!diario)
check('o lote diario continua as 16:30 UTC', diario?.schedule === '30 16 * * *')

// ─── 10. o lote diario nao foi tocado ──────────────────────────────────────
console.log('\n10) O que ja funcionava ficou como estava')
check('o wrapper diario continua com teto de 25/dia',
  /const DEFAULT_DAILY_LIMIT = 25/.test(cronDiario))
check('o wrapper diario continua mandando confirm=SEND',
  /url\.searchParams\.set\('confirm', 'SEND'\)/.test(cronDiario))
check('o wrapper diario NAO passa fresh_hours (segue drenando o historico)',
  !/fresh_hours/.test(cronDiario))
check('o wrapper diario continua chamando a mesma rota admin',
  /await adminStalledRescue\(inner\)/.test(cronDiario))

console.log(`\n${fail === 0 ? '✅' : '❌'} ${ok} ok, ${fail} fail`)
if (fail > 0) {
  console.error('\nfalhas:')
  for (const f of falhas) console.error(`  · ${f}`)
  process.exit(1)
}
