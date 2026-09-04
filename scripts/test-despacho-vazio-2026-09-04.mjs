#!/usr/bin/env node
// ═══ sprint-retencao #20 (2026-09-04) — O DESPACHO VAZIO PARAVA DE MENTIR ═══
//
// MEDIDO NO BANCO DE PRODUCAO (contas externas, 21 dias, corte 04/09 ~20:55 UTC):
//   · 34 `cinematic_dispatch_result` com planned=0 E attempted=0, de 25 PESSOAS
//   · dessas 25, NOVE nunca viram um filme da Kineo na vida
//   · 8 dos 34 foram seguidos de OUTRO despacho vazio em 30 minutos
//   · 16 dos 34 foram seguidos de um despacho ACEITO em 5 minutos
//
// planned=0 significa que nao havia UMA UNICA CENA para enviar: o laco de
// submissao nao roda, nenhum POST sai. Mesmo assim a pessoa lia
// "Our video provider did not accept the job" — uma frase sobre um fornecedor
// que nunca foi chamado. Caso vivo de hoje (pessoa ffd78315, 20:27→20:42 UTC):
// 4 falhas identicas, depois 12 telas de 429 "Two AI attempts were just
// refunded", e ela so escapou porque mudou o texto por conta propria.
//
// Este teste le os ARQUIVOS REAIS (nunca reimplementa a regra) e prova:
//   1. o route separa plano vazio de recusa do fornecedor, nas DUAS saidas
//      (razao de release e mensagem);
//   2. a mensagem nova NAO diz que o fornecedor recusou, e diz o que houve;
//   3. a mensagem nova mantem o fragmento que o cron de resgate usa para
//      reconhecer defeito nosso — provado contra o arquivo do cron, nao
//      contra uma copia da lista;
//   4. `empty_plan_rejected_refunded` NAO casa com o filtro do resfriamento
//      anti-abuso, e `provider_rejected_refunded` continua casando;
//   5. o cliente classifica a mensagem nova como `empty_plan` e a antiga
//      continua `provider_rejected`;
//   6. `empty_plan` NAO entra na lista de causas deterministicas (o dado nao
//      sustenta a afirmacao);
//   7. o ramo do Joscha (planned>0, totalPosts=0) fica byte a byte como estava;
//   8. a trava de qualidade do fundador: o diff nao toca no motor de video.
//
// Rodar: node scripts/test-despacho-vazio-2026-09-04.mjs   (sem rede, sem custo)

import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const ROUTE = join(raiz, 'app/api/generate-video-cinematic/route.ts')
const CLIENT = join(raiz, 'app/(dashboard)/generate/GenerateClient.tsx')
const CRON = join(raiz, 'app/api/cron/send-failure-recovery/route.ts')

const route = readFileSync(ROUTE, 'utf8')
const client = readFileSync(CLIENT, 'utf8')
const cron = readFileSync(CRON, 'utf8')

let ok = 0
let fail = 0
const falhas = []
function check(nome, cond) {
  if (cond) { ok += 1; return }
  fail += 1
  falhas.push(nome)
  console.error(`  ✗ ${nome}`)
}

// A mensagem nova, escrita UMA vez aqui e procurada nos arquivos reais.
const MSG_VAZIO = "We couldn't build a single scene from this text, so nothing was ever sent to our video provider — this is on our side, not yours. Your credits were refunded automatically and the team was alerted. Editing the text, or letting the AI structure it for you, is the change most likely to get this through."
const MSG_FORNECEDOR = 'Our video provider did not accept the job — this is on our side, not yours. Nothing started, your credits were refunded automatically, and the team was alerted. Please try again in a few minutes.'

console.log('\n1) O route separa plano vazio de recusa do fornecedor')
check('1.1 define planoVazio a partir de scenes.length === 0', /const planoVazio = scenes\.length === 0/.test(route))
check('1.2 release usa empty_plan_rejected quando o plano e vazio', /planoVazio\s*\n?\s*\?\s*'empty_plan_rejected'/.test(route))
check('1.3 release mantem provider_rejected quando havia plano', /:\s*'provider_rejected',/.test(route))
check('1.4 saldo esgotado continua vencendo os dois', /balanceExhausted\s*\n?\s*\?\s*'provider_balance_rejected'/.test(route))
check('1.5 o ramo novo so dispara dentro de totalPosts === 0', (() => {
  const i = route.indexOf('ctxDespacho().totalPosts === 0')
  const j = route.indexOf('if (planoVazio) {', i)
  return i > 0 && j > i && j - i < 1200
})())
check('1.6 a mensagem de plano vazio existe no route', route.includes(MSG_VAZIO))
check('1.7 alarme proprio EMPTY_PLAN (nao reusa ZERO_POSTS)', /alertFalExhausted\(`EMPTY_PLAN /.test(route))

console.log('2) A mensagem nova diz a verdade')
check('2.1 nao afirma que o fornecedor recusou', !MSG_VAZIO.includes('did not accept the job'))
check('2.2 afirma que nada foi enviado ao fornecedor', MSG_VAZIO.includes('nothing was ever sent to our video provider'))
check('2.3 assume a culpa como nossa', MSG_VAZIO.includes('on our side, not yours'))
check('2.4 confirma o estorno', MSG_VAZIO.includes('refunded automatically'))
check('2.5 oferece a acao que muda o resultado (editar/estruturar)', /Editing the text, or letting the AI structure it/.test(MSG_VAZIO))
check('2.6 NAO manda repetir igual em alguns minutos', !/try again in a few minutes/i.test(MSG_VAZIO))

console.log('3) O cron de resgate continua reconhecendo isto como defeito nosso')
// Le a lista REAL do cron, nao uma copia.
const mDef = cron.match(/const DEFEITO_EXPLICITO = \[([\s\S]*?)\]/)
check('3.1 DEFEITO_EXPLICITO foi encontrado no cron real', Boolean(mDef))
const fragmentos = mDef ? [...mDef[1].matchAll(/'([^']+)'/g)].map((m) => m[1]) : []
check('3.2 a lista tem fragmentos', fragmentos.length > 0)
check('3.3 a mensagem NOVA casa com algum fragmento de defeito explicito',
  fragmentos.some((f) => MSG_VAZIO.toLowerCase().includes(f.toLowerCase())))
check('3.4 a mensagem ANTIGA continua casando (nao quebrei o caminho do Joscha)',
  fragmentos.some((f) => MSG_FORNECEDOR.toLowerCase().includes(f.toLowerCase())))

console.log('4) O resfriamento anti-abuso deixa de trancar quem nao gastou nada')
const mFiltro = route.match(/\/\^provider_\.\*_refunded\$\/\.test\(metadata\.resolution_reason\)/)
check('4.1 o filtro do resfriamento continua sendo provider_*_refunded', Boolean(mFiltro))
const RE_COOLDOWN = /^provider_.*_refunded$/
check('4.2 empty_plan_rejected_refunded NAO conta para o resfriamento', !RE_COOLDOWN.test('empty_plan_rejected_refunded'))
check('4.3 provider_rejected_refunded CONTINUA contando', RE_COOLDOWN.test('provider_rejected_refunded'))
check('4.4 provider_balance_rejected_refunded CONTINUA contando', RE_COOLDOWN.test('provider_balance_rejected_refunded'))
// O sufixo _refunded e posto por releaseBirthClaim; provar que a regra segue viva.
check('4.5 releaseBirthClaim ainda sufixa _refunded no debito confirmado',
  /releaseReason = `\$\{reason\}_refunded`/.test(route))

console.log('5) O cliente classifica a causa nova')
check('5.1 existe a causa empty_plan', /return 'empty_plan'/.test(client))
check('5.2 ela e reconhecida pelo trecho da mensagem nova', /raw\.includes\('build a single scene'\)/.test(client))
check('5.3 o trecho procurado existe mesmo na mensagem do servidor',
  MSG_VAZIO.toLowerCase().includes('build a single scene'))
check('5.4 empty_plan vem ANTES de provider_rejected na cascata', (() => {
  const a = client.indexOf("return 'empty_plan'")
  const b = client.indexOf("return 'provider_rejected'")
  return a > 0 && b > 0 && a < b
})())
check('5.5 provider_rejected continua existindo para o caso real', /raw\.includes\('did not accept the job'\)/.test(client))

console.log('6) Nao afirmamos mais do que o dado sustenta')
const mDet = client.match(/const failureIsDeterministic =([\s\S]*?)\n  const showGenericFailure/)
check('6.1 achei a lista de causas deterministicas', Boolean(mDet))
check('6.2 empty_plan NAO esta na lista (16 de 34 recuperaram em 5 min)',
  Boolean(mDet) && !mDet[1].includes('empty_plan'))
check('6.3 as deterministicas antigas continuam la', Boolean(mDet) && mDet[1].includes('narration_short'))

console.log('7) O ramo do Joscha (planned>0) ficou intacto')
check('7.1 a mensagem antiga continua no route', route.includes(MSG_FORNECEDOR))
check('7.2 o alarme ZERO_POSTS continua existindo', /alertFalExhausted\(`ZERO_POSTS /.test(route))
check('7.3 o comentario historico KINEO-ZERO-POSTS continua', route.includes('KINEO-ZERO-POSTS-2026-08-28'))
check('7.4 a saida 502 final de submit continua', route.includes('Could not submit clips to AI generator'))
check('7.5 a saida de refund nao confirmado continua', route.includes('your automatic refund is still being confirmed'))

console.log('8) Trava de qualidade do fundador (03/09): o motor de video nao foi tocado')
let diff = ''
try {
  diff = execFileSync('git', ['diff', '--name-only', 'origin/main', '--'], { cwd: raiz, encoding: 'utf8' })
} catch { diff = '' }
const PROIBIDOS = [
  'lib/compose', 'lib/hollywood/', 'lib/cinematic/', 'lib/broll/',
  'lib/lyriaMusic', 'lib/narrationFit', 'app/api/analyze-idea/', 'app/api/generate-script/',
]
const tocados = diff.split('\n').map((s) => s.trim()).filter(Boolean)
check('8.1 o git diff foi lido', tocados.length > 0)
for (const p of PROIBIDOS) {
  check(`8.2 nao toca ${p}`, !tocados.some((f) => f.startsWith(p)))
}
// 8.3 (ajuste 04/09 18:40, Claude-chat): o diff e contra origin/main, ou seja, a FILA
// inteira de entrega, nao so este commit. Numa fila com #20 (memoria de episodio) +
// #21 (este) + telemetria, "exatamente os 3" reprova a propria fila da rotacao sem
// nenhum defeito. A trava de qualidade continua sendo o 8.2 (caminhos proibidos);
// aqui basta provar que os 3 arquivos DESTA entrega estao presentes no diff.
check('8.3 os 3 arquivos desta entrega estao no diff (fila pode ter mais)', (() => {
  const esperados = new Set([
    'app/api/generate-video-cinematic/route.ts',
    'app/(dashboard)/generate/GenerateClient.tsx',
    'scripts/test-despacho-vazio-2026-09-04.mjs',
  ])
  const codigo = new Set(tocados.filter((f) => !f.startsWith('docs/')))
  return [...esperados].every((f) => codigo.has(f))
})())

console.log(`\n${fail === 0 ? '✅' : '❌'} ${ok} verdes, ${fail} vermelhas`)
if (fail > 0) {
  console.error('\nFalhas:')
  for (const f of falhas) console.error(`  · ${f}`)
  process.exit(1)
}
