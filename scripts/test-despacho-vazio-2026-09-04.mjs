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

// A mensagem servida e LIDA DO ROUTE, nunca transcrita aqui: com a copia a
// mao, mudar a copy do servidor passava batido e o cliente ficava para tras
// sem ninguem ver. (Falso-verde encontrado ao falsificar, nao na revisao.)
const mMsgVazio = route.match(/"(We couldn't build a single scene[^"]*)"/)
const MSG_VAZIO = mMsgVazio ? mMsgVazio[1] : ''
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
// A telemetria da sessao paralela (#21) mora DENTRO deste mesmo ramo e e a
// unica coisa que pode achar a causa raiz (por que 60s da zero cena e 35s
// nao). Duas sessoes editando o mesmo bloco em paralelo apagam trabalho uma
// da outra sem conflito de merge — este check e o que impede isso.
check('1.8 a telemetria cinematic_zero_scenes_planned continua no ramo', (() => {
  const i = route.indexOf('if (planoVazio) {')
  return i > 0 && route.slice(i, i + 1800).includes('cinematic_zero_scenes_planned')
})())
check('1.9 ela ainda carrega os campos que acham a causa raiz',
  ['requested_seconds', 'effective_seconds', 'has_markers', 'segments', 'narration_chars']
    .every((c) => route.includes(c)))

console.log('2) A mensagem nova diz a verdade')
check('2.1 nao afirma que o fornecedor recusou', !MSG_VAZIO.includes('did not accept the job'))
check('2.2 afirma que nada foi enviado ao fornecedor', MSG_VAZIO.includes('nothing was ever sent to our video provider'))
check('2.3 assume a culpa como nossa', MSG_VAZIO.includes('on our side, not yours'))
check('2.4 confirma o estorno', MSG_VAZIO.includes('refunded automatically'))
check('2.5 oferece a acao que muda o resultado (editar/estruturar)', /Editing the text, or letting the AI structure it/.test(MSG_VAZIO))
check('2.6 NAO manda repetir igual em alguns minutos', !/try again in a few minutes/i.test(MSG_VAZIO))

console.log('3) O e-mail de resgate ainda alcanca estas pessoas (regra REAL do cron)')
// Le as DUAS listas do cron real e reproduz a decisao dele. So a lista de
// defeito nao basta: uma mensagem tambem entra na fila por NAO casar o
// NAO_E_BUG, e e exatamente assim que varias entram.
const mDef = cron.match(/const DEFEITO_EXPLICITO = \[([\s\S]*?)\]/)
const mNao = cron.match(/const NAO_E_BUG(?::[^=]*)? = \[([\s\S]*?)\n\]/)
check('3.1 DEFEITO_EXPLICITO foi lido do cron real', Boolean(mDef))
check('3.2 NAO_E_BUG foi lido do cron real', Boolean(mNao))
// Extrair literal de lista TS SEM se enganar: tira as linhas de comentario
// PRIMEIRO. Os comentarios tem apostrofo e aspas em portugues, e o proprio
// item "can't depict real people" (aspas duplas com apostrofo dentro)
// desalinhava o pareamento: a versao anterior extraia 19 'fragmentos', quase
// todos lixo, e NENHUM dos de saldo curto — em silencio.
const NOVA_LINHA = String.fromCharCode(10)
const RETORNO = String.fromCharCode(13)
const literais = (corpo) => corpo
  .split(NOVA_LINHA)
  .map((l) => l.split(RETORNO).join(''))
  .filter((l) => !l.trim().startsWith('//'))
  .join(NOVA_LINHA)
  .match(/'[^']*'|"[^"]*"/g)
  ?.map((v) => v.slice(1, -1)).filter((v) => v && v.trim().length > 0) ?? []
const fragDef = mDef ? literais(mDef[1]) : []
const fragNao = mNao ? literais(mNao[1]) : []
// Sanidade da propria extracao: se ela desalinhar de novo, as listas encolhem
// e o resto do bloco vira teatro.
check('3.3 a lista NAO_E_BUG veio inteira (>= 15 fragmentos)', fragNao.length >= 15)
check('3.4 os fragmentos de saldo curto estao entre eles', fragNao.includes('credits. You have'))
check('3.5 o fragmento de defeito explicito veio', fragDef.includes('on our side, not yours'))
const ehDefeito = (msg) => {
  const low = msg.toLowerCase()
  if (fragDef.some((f) => low.includes(f.toLowerCase()))) return true
  return !fragNao.some((f) => low.includes(f.toLowerCase()))
}
check('3.6 a mensagem de plano vazio e classificada como DEFEITO nosso', MSG_VAZIO ? ehDefeito(MSG_VAZIO) : false)
check('3.7 a mensagem do fornecedor continua classificada como defeito', ehDefeito(MSG_FORNECEDOR))
check('3.8 uma recusa legitima de saldo NAO e defeito (a regra ainda discrimina)',
  !ehDefeito('AI Generated needs 25 credits. You have 10.'))

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
// O trecho procurado e LIDO DO CLIENTE, nao escrito aqui: e esta dupla que
// impede servidor e tela de divergirem em silencio. Com a frase transcrita a
// mao, trocar o matcher do cliente por qualquer bobagem passava batido — e a
// tela voltaria a jogar esta recusa em 'other' sem nenhum teste reclamar.
const mNeedle = client.match(/raw\.includes\('([^']+)'\)\) return 'empty_plan'/)
check('5.2 o cliente casa empty_plan por um trecho literal', Boolean(mNeedle))
check('5.3 esse trecho existe MESMO na mensagem servida pelo servidor',
  Boolean(mNeedle) && MSG_VAZIO.toLowerCase().includes(mNeedle[1].toLowerCase()))
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
// 8.3 (ajuste 04/09 19:05, Claude-chat): checagem de DIFF nao e estavel — contra origin/main
// reprova a fila da rotacao; contra HEAD reprova qualquer entrega posterior que toque o
// route. O que importa provar e que o MECANISMO do #21 continua no arquivo. Trava de
// caminhos proibidos segue no 8.2.
check('8.3 o mecanismo do #21 continua no route (planoVazio + empty_plan_rejected)', route.includes('if (planoVazio) {') && route.includes("'empty_plan_rejected'"))

console.log(`\n${fail === 0 ? '✅' : '❌'} ${ok} verdes, ${fail} vermelhas`)
if (fail > 0) {
  console.error('\nFalhas:')
  for (const f of falhas) console.error(`  · ${f}`)
  process.exit(1)
}
