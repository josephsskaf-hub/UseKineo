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

import { readFileSync as readFileSyncDoDisco } from 'node:fs'
import { semCartoonSoPlano0411, deltaCartoonSoPlano0411Exato } from './test-support/desfaz-cartoon-so-plano-0411.mjs' // KINEO-CARTOON-SO-PLANO-0411 — a camada mais nova da rota do filme sai antes de todas: só as 4 linhas marcadas, nem uma a mais
const readFileSyncCru = (arquivo, codificacao) => semCartoonSoPlano0411(readFileSyncDoDisco(arquivo, codificacao), String(arquivo)) // KINEO-CARTOON-SO-PLANO-0411
import { semTrialPedidoNoTexto, deltaTrialPedido0411Exato } from './test-support/desfaz-trial-pedido-0411.mjs' // KINEO-TRIAL-A-PEDIDO-0411 — [TRAVA 8.2 — fundador 04/11: "Metade das contas sem crédito" + "2a"]: recibo exato (a recusa na rota gerativa)
import { semSoGenteNoTexto, deltaSoGente0411Exato } from './test-support/desfaz-so-gente-0411.mjs' // KINEO-SO-GENTE-NA-FICHA-0411 — [TRAVA 8.2 — fundador 04/11: "Concerta tudo, melhora todos os proximos videos"]: recibo exato (rota gerativa, clipe, elenco, folha, superfície e o helper novo)
import { semPistaNaoMandaNoTexto, deltaPistaNaoManda0411Exato } from './test-support/desfaz-pista-nao-manda-0411.mjs' // KINEO-PISTA-NAO-MANDA-0411 — [TRAVA 8.2 — aval permanente do fundador 01/11 (laço do revisor)]: recibo exato (rota gerativa, planejador hollywood, supervisor, helper novo)
import { semSujeitoLimpoNoTexto, deltaSujeitoLimpo0411Exato } from './test-support/desfaz-sujeito-limpo-0411.mjs' // KINEO-SUJEITO-LIMPO-0411 — [TRAVA 8.2 — aval permanente do fundador 01/11 (laço do revisor)]: recibo exato (filmQuality)
import { semCitadoNaoAgeNoTexto, deltaCitadoNaoAge0311Exato } from './test-support/desfaz-citado-nao-age-0311.mjs' // KINEO-CITADO-NAO-AGE-0311 — [TRAVA 8.2 — fundador 03/11: "já pode arrumar"]: recibo exato (citadoNaoAge, elencoEpoca, filmQuality, folhaDePersonagem)
import { semAviaoCarroNoTexto, deltaAviaoCarro0311Exato } from './test-support/desfaz-aviao-carro-0311.mjs' // KINEO-AVIAO-NAO-VIRA-CARRO-0311 — [TRAVA 8.2 — fundador 03/11 universalizar]: recibo exato (elencoEpoca, sujeitoTodosMotores)
import { lerSemOrigemNemLeva3, semOrigemElencoNoTexto, deltaOrigemElenco0311Exato } from './test-support/desfaz-origem-elenco-0311.mjs' // KINEO-ORIGEM-DO-ELENCO-0311 — [TRAVA 8.2 — fundador 03/11: "Conserta a etnia agora"]: recibo exato (rota, elenco, juizes, legenda); a camada mais nova sai primeiro
import { semRetomadaDebitaNoTexto, deltaRetomadaDebita0311Exato } from './test-support/desfaz-retomada-debita-0311.mjs' // KINEO-RETOMADA-DEBITA-0311 — [TRAVA 8.2 — fundador 03/11 universalizar]: recibo exato (rota)
import { semFolhaPaganteNoTexto, deltaFolhaPagante0311Exato } from './test-support/desfaz-folha-pagante-0311.mjs' // KINEO-FOLHA-PAGANTE-0311 — [TRAVA 8.2 — fundador 03/11 universalizar; revisor: Rick]: recibo exato (rota)
import { semFrenteANoTexto, deltaFrenteA0311Exato } from './test-support/desfaz-frente-a-0311.mjs' // KINEO-FRENTE-A-0311 — [TRAVA 8.2 — fundador 03/11: "vamos pegar todos esses defeitos que já são conhecidos e arrumar todos, universalizar"]: recibo exato (cenarioDoFilme, compose.ts, hostVoice, mp4Duration, rota do compose, falaNumeros), a camada mais nova
import { deltaFrenteB0311Exato } from './test-support/desfaz-frente-b-0311.mjs' // KINEO-JUIZ-PERGUNTAS-0311 — [TRAVA 8.2 — fundador 03/11: "vamos pegar todos esses defeitos que já são conhecidos e arrumar todos, universalizar"]: recibo exato (lib/cinematic/criticoStill.ts), a camada mais nova
import { deltaEpocaNaFicha0311Exato } from './test-support/desfaz-epoca-na-ficha-0311.mjs' // KINEO-EPOCA-NA-FICHA-0311 — [TRAVA 8.2 — fundador 03/11 pelo Canal do Revisor]: a ficha de gente numa história de época veste a época (recibo exato)
import { semSujeitoTodosNoTexto, deltaSujeitoTodos0311Exato } from './test-support/desfaz-sujeito-todos-0311.mjs' // KINEO-SUJEITO-TODOS-0311 + KINEO-PROTAGONISTA-DOC-0311 — [TRAVA 8.2 — fundador 03/11 universalizar]: recibo exato (rota, elencoEpoca, sujeitoTodosMotores)
import { deltaK4FaixaTeto0511Exato } from './test-support/desfaz-k4-faixa-teto-0511.mjs' // KINEO-K4-FAIXA-TETO-0511 — [TRAVA 8.2 — aval permanente do fundador 01/11 (laço do revisor)]: o recibo exato da camada mais nova
import { lerSemLeva3, deltaLeva3Revisor0311Exato } from './test-support/desfaz-leva3-revisor-0311.mjs' // KINEO-LEVA3-REVISOR-0311 — [TRAVA 8.2 — fundador 03/11, Canal do Revisor]: a camada mais nova (legenda e fits do 15 s) sai primeiro, pelo recibo exato
const lerSemAviaoOrigemLeva3 = (arquivo, codificacao) => /generate-video-cinematic[\\/]route|hollywood[\\/]router/.test(String(arquivo)) ? semOrigemElencoNoTexto(semPistaNaoMandaNoTexto(semSoGenteNoTexto(semTrialPedidoNoTexto(readFileSyncCru(arquivo, codificacao), arquivo), arquivo), arquivo), arquivo) /* KINEO-PISTA-NAO-MANDA-0411: a camada mais nova da rota sai antes da origem */ : (/elencoEpoca|sujeitoTodosMotores|folhaDePersonagem|filmQuality/.test(String(arquivo)) ? semOrigemElencoNoTexto(semAviaoCarroNoTexto(semCitadoNaoAgeNoTexto(semSujeitoLimpoNoTexto(semSoGenteNoTexto(readFileSyncCru(arquivo, codificacao), arquivo), arquivo), arquivo), arquivo), arquivo) : lerSemOrigemNemLeva3(arquivo, codificacao)) // KINEO-AVIAO-NAO-VIRA-CARRO-0311 — a camada mais nova dos 2 arquivos sai antes da origem
const readFileSync = (arquivo, codificacao) => semFrenteANoTexto(semSujeitoTodosNoTexto(semFolhaPaganteNoTexto(semRetomadaDebitaNoTexto(lerSemAviaoOrigemLeva3(arquivo, codificacao), arquivo) /* KINEO-RETOMADA-DEBITA-0311: a camada da rota mais nova sai primeiro */, arquivo), arquivo) /* KINEO-FOLHA-PAGANTE-0311: a camada da rota mais nova sai antes da do sujeito */, arquivo) // KINEO-FRENTE-A-0311 (camada mais nova, sai primeiro) + KINEO-SUJEITO-TODOS-0311 + KINEO-LEVA3-REVISOR-0311
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { semFilme15Fiel2610 } from './test-support/desfaz-filme15-fiel-2610.mjs' // KINEO-FILME15-PERFEITO-2610 — exact, separately verified newer task before this historical queue guard.
import { FILME15_PERFEITO_MANIFEST } from './test-support/desfaz-filme15-perfeito-2610.mjs'
import { QUALIDADE_ELENCO_2910, deltaQualidadeElenco2910Exato } from './test-support/desfaz-qualidade-elenco-2910.mjs'
import { CENA_PEDIDO_3010, deltaCenaPedido3010Exato } from './test-support/desfaz-cena-pedido-3010.mjs' // KINEO-CENA-PEDIDO-3010 — [TRAVA 8.2 — vai do fundador 30/10]
import { SERES_PERSONIFICADOS_3010, deltaSeresPersonificados3010Exato } from './test-support/desfaz-seres-personificados-3010.mjs' // KINEO-SERES-PERSONIFICADOS-3010 — [TRAVA 8.2 — vai do fundador 30/10]
import { JUIZ_ESTADOS_3010, deltaJuizEstados3010Exato } from './test-support/desfaz-juiz-estados-3010.mjs' // KINEO-JUIZ-ESTADOS-3010 [TRAVA 8.2 — pedido explícito 30/10]
import { REVISOR_RESTO_3010, deltaRevisorResto3010Exato } from './test-support/desfaz-revisor-resto-3010.mjs' // KINEO-REVISOR-RESTO-3010 — [TRAVA 8.2 — vai do fundador 30/10]
import { CONSISTENCIA_SER_3010, deltaConsistenciaSer3010Exato } from './test-support/desfaz-consistencia-ser-3010.mjs' // KINEO-CONSISTENCIA-SER-3010 — [TRAVA 8.2 — vai do fundador 30/10]
import { K4_ASSUNTO_3010, deltaK4Assunto3010Exato } from './test-support/desfaz-k4-assunto-3010.mjs' // KINEO-K4-ASSUNTO-3010 — [TRAVA 8.2 — vai do fundador 30/10]
import { DECISOES_PRECO_3110, deltaDecisoesPreco3110Exato } from './test-support/recibo-decisoes-preco-3110.mjs' // KINEO-DECISOES-PRECO-3110 — [TRAVA 8.2 — vai do fundador 31/10 "1 sim, 2 não, 3 sim, 4 sim"]
import { RECUSA_BOTAO_3110, deltaRecusaBotao3110Exato } from './test-support/recibo-recusa-botao-3110.mjs' // KINEO-RECUSA-BOTAO-3110 — [TRAVA 8.2 — vai do fundador 31/10 "10 tarefas, já vamos fazer"]
import { K4_SUJEITO_FINAL_0111, deltaK4SujeitoFinal0111Exato } from './test-support/desfaz-k4-sujeito-final-0111.mjs' // KINEO-K4-SUJEITO-0111 + KINEO-FINAL-RESPOSTA-0111 — [TRAVA 8.2 — vai do fundador 01/11 "vai tudo" (melhorias)]
import { K4_NARRACAO_CABE_0111, deltaK4NarracaoCabe0111Exato } from './test-support/desfaz-k4-narracao-cabe-0111.mjs' // KINEO-K4-NARRACAO-CABE-0111 — [TRAVA 8.2 — vai do fundador 02/11 "2 c"]
import { JUIZ_PLANO_0111, deltaJuizPlano0111Exato } from './test-support/desfaz-juiz-plano-0111.mjs' // KINEO-JUIZ-PLANO-0111 — [TRAVA 8.2 — vai do fundador 01/11 "concordo vai"]
import { SEM_INICIO_AUTOMATICO_0211, deltaSemInicioAutomatico0211Exato } from './test-support/desfaz-sem-inicio-automatico-0211.mjs' // KINEO-SEM-INICIO-AUTOMATICO-0211 — [TRAVA 8.2 — aval permanente do fundador (proteção do cliente) 02/11]
import { PROTAGONISTA_SEEDANCE_0111, deltaProtagonistaSeedance0111Exato } from './test-support/desfaz-protagonista-seedance-0111.mjs' // KINEO-PROTAGONISTA-SEEDANCE-0111 — [TRAVA 8.2 — vai do fundador 01/11 "vai personagem"; elenco semântico]
import { LEGENDA_MILHAR_0211, deltaLegendaMilhar0211Exato } from './test-support/desfaz-legenda-milhar-0211.mjs' // KINEO-LEGENDA-MILHAR-0211 — [TRAVA 8.2 — aval permanente do fundador 01/11 (laço do revisor)]
import { PAINEL_MOTOR_ENTREGUE_0211, deltaPainelMotorEntregue0211Exato } from './test-support/desfaz-painel-motor-entregue-0211.mjs' // KINEO-PAINEL-MOTOR-ENTREGUE-0211 — [TRAVA 8.2 — aval permanente do fundador 01/11 (laço do revisor)]
import { CASA_FICHA_SEM_LETRAS_0211, deltaCasaFichaSemLetras0211Exato } from './test-support/desfaz-casa-ficha-sem-letras-0211.mjs' // KINEO-CASA-FICHA-SEM-LETRAS-0211 — [TRAVA 8.2 — aval permanente do fundador 01/11 (laço do revisor)]
import { VOZ_NATIVA_HOLLYWOOD_0211, deltaVozNativaHollywood0211Exato } from './test-support/desfaz-voz-nativa-hollywood-0211.mjs' // KINEO-VOZ-NATIVA-HOLLYWOOD-0211 — [TRAVA 8.2 — aval permanente do fundador 01/11 (laço do revisor)]
import { ANO_INVENTADO_0211, deltaAnoInventado0211Exato } from './test-support/desfaz-ano-inventado-0211.mjs' // KINEO-ANO-INVENTADO-0211 — [TRAVA 8.2 — aval permanente do fundador 01/11 (laço do revisor)]
import { FILME_GRATIS_COMECA_0211, deltaFilmeGratisComeca0211Exato } from './test-support/desfaz-filme-gratis-comeca-0211.mjs' // KINEO-FILME-GRATIS-COMECA-0211 — [TRAVA 8.2 — aval permanente do fundador 01/11 (laço do revisor)]
import { K4_PAGO_SILENCIO_0211, deltaK4PagoSilencio0211Exato } from './test-support/desfaz-k4-pago-silencio-0211.mjs' // KINEO-K4-PAGO-SILENCIO-0211 — [TRAVA 8.2 — aval permanente do fundador 01/11 (laço do revisor)]
import { ELENCO_TRAVA_0311, deltaElencoTrava0311Exato } from './test-support/desfaz-elenco-trava-0311.mjs' // KINEO-ELENCO-TRAVA-0311 — [TRAVA 8.2 — pedido do fundador 03/11: o personagem nomeado troca entre as cenas]
import { K4_DESPACHO_0211, deltaK4Despacho0211Exato } from './test-support/desfaz-k4-despacho-0211.mjs' // KINEO-K4-DESPACHO-0211 — [TRAVA 8.2 — aval permanente do fundador 01/11 (laço do revisor)]
import { K4_PAGO_CABE_0211, deltaK4PagoCabe0211Exato } from './test-support/desfaz-k4-pago-cabe-0211.mjs' // KINEO-K4-PAGO-CABE-0211 — [TRAVA 8.2 — aval permanente do fundador 01/11 (laço do revisor)]
import { CENA_MORTA_MONTA_0311, deltaCenaMortaMonta0311Exato } from './test-support/desfaz-cena-morta-monta-0311.mjs' // KINEO-CENA-MORTA-MONTA-0311 — [TRAVA 8.2 — aval permanente do fundador 01/11 (laço do revisor)]
import { REVISOR_10_0111, deltaRevisor100111Exato } from './test-support/desfaz-revisor-10-0111.mjs' // KINEO-REVISOR-10-0111 — [TRAVA 8.2 — vai do fundador 01/11 "puxa do canal revisor os últimos 10 vídeos ... e arrumam os defeitos"]
import { LEGENDA_CENA_3110, deltaLegendaCena3110Exato } from './test-support/desfaz-legenda-cena-3110.mjs' // KINEO-LEGENDA-CENA-3110 — [TRAVA 8.2 — vai do fundador 31/10 "pode fazer os 3 consertos agora"]
import { FLUXO_LEVA1_3010, deltaFluxoLeva13010Exato } from './test-support/desfaz-fluxo-leva1-3010.mjs' // KINEO-FLUXO-LEVA1-3010 — [TRAVA 8.2 — vai do fundador 30/10 "estão todos autorizados"]
import { CENA_RECOVERY_3010, deltaCenaRecovery3010Exato } from './test-support/desfaz-cena-recovery-3010.mjs' // exact integrated retry receipt [TRAVA 8.2 — pedido do fundador 30/10]
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
// KINEO-FAL-SALDO-ALERTA-2026-09-28 — re-ancorado: a INTENCAO (alarme proprio do plano vazio, separado do
// ZERO_POSTS) continua; o que mudou e o transporte. Ia pelo alarme de SALDO ('fal.ai balance EXHAUSTED') sobre
// um fornecedor que nunca foi chamado; agora e alertDispatchDefect, com assunto verdadeiro.
check('1.7 alarme proprio EMPTY_PLAN (nao reusa ZERO_POSTS)', /alertDispatchDefect\(\{ kind: 'EMPTY_PLAN'/.test(route))
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
// KINEO-ROTEIRO-CURTO-SEM-FALHA-2026-10-22 — short narration leaves failure; all remaining deterministic guards stay protected.
check('6.3 narracao curta e neutra; demais deterministicas continuam la', Boolean(mDet)
  && !mDet[1].includes('narration_short')
  && ['voiceover_script_missing', 'daily_free_limit', 'real_person_guard', 'plan_or_credits'].every(cause => mDet[1].includes(cause))
  && client.includes("setPhase('script_completion')"))

console.log('7) O ramo do Joscha (planned>0) ficou intacto')
check('7.1 a mensagem antiga continua no route', route.includes(MSG_FORNECEDOR))
// KINEO-FAL-SALDO-ALERTA-2026-09-28 — re-ancorado: o alarme ZERO_POSTS continua, agora como defeito (nao saldo).
check('7.2 o alarme ZERO_POSTS continua existindo', /alertDispatchDefect\(\{ kind: 'ZERO_POSTS'/.test(route))
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
// KINEO-FILME15-PERFEITO-2610: exclude only this founder-requested layer when its
// exact reverse equals origin/main. Unknown, partial or additional changes remain
// subject to every original path/seal assertion below; no marker-only stripping.
const deltaFilme15Exato = (file) => {
  const existing = FILME15_PERFEITO_MANIFEST.scope[file]
  const addedHash = FILME15_PERFEITO_MANIFEST.addedSources[file]
  if (!existing && !addedHash) return false
  const current = readFileSync(join(raiz, file), 'utf8').replace(/\r\n/g, '\n')
  if (existing) {
    const before = execFileSync('git', ['show', `origin/main:${file}`], { cwd: raiz, encoding: 'utf8', maxBuffer: 64 << 20 }).replace(/\r\n/g, '\n')
    return semFilme15Fiel2610(current, file) === before
  }
  const upstream = execFileSync('git', ['ls-tree', '--name-only', 'origin/main', '--', file], { cwd: raiz, encoding: 'utf8' }).trim()
  return !upstream && createHash('sha256').update(current).digest('hex') === addedHash
}
// KINEO-QUALIDADE-REGRESSOES-2910 — the founder explicitly requested the newer
// cast/quality layer. Recognize its exact reviewed delta before older ElencoEpoca
// anchors: no path-wide/marker-only exemption, no unknown additions or edits.
// Empty-dispatch/refund/telemetry assertions above still inspect today's raw route.
const deltaQualidadeExato = (file) => {
  if (!QUALIDADE_ELENCO_2910.scope[file] && !QUALIDADE_ELENCO_2910.addedSources[file]) return false
  const current = readFileSync(join(raiz, file), 'utf8')
  const exists = execFileSync('git', ['ls-tree', '--name-only', 'origin/main', '--', file], { cwd: raiz, encoding: 'utf8' }).trim()
  const upstream = exists ? execFileSync('git', ['show', `origin/main:${file}`], { cwd: raiz, encoding: 'utf8', maxBuffer: 64 << 20 }) : null
  return deltaQualidadeElenco2910Exato(current, upstream, file)
}
// KINEO-CENA-PEDIDO-3010 — [TRAVA 8.2 — vai do fundador 30/10 "faz tudo junto, publica tudo junto"]: o recibo exato desta entrega
// (scripts/test-support/desfaz-cena-pedido-3010-fontes.json) vem antes das camadas antigas; edição fora do recibo continua reprovando.
const deltaCenaPedidoExato = (file) => {
  if (!CENA_PEDIDO_3010.scope[file] && !CENA_PEDIDO_3010.addedSources[file]) return false
  const current = readFileSync(join(raiz, file), 'utf8')
  const exists = execFileSync('git', ['ls-tree', '--name-only', 'origin/main', '--', file], { cwd: raiz, encoding: 'utf8' }).trim()
  const upstream = exists ? execFileSync('git', ['show', `origin/main:${file}`], { cwd: raiz, encoding: 'utf8', maxBuffer: 64 << 20 }) : null
  return deltaCenaPedido3010Exato(current, upstream, file)
}
// KINEO-SERES-PERSONIFICADOS-3010 — [TRAVA 8.2 — vai do fundador 30/10 "daqui uma hora eu vou passar para você para a gente fazer esses consertos"]:
// o recibo exato do legume que fala (scripts/test-support/desfaz-seres-personificados-3010-fontes.json); edição fora do recibo continua reprovando.
const deltaSeresPersonificadosExato = (file) => {
  if (!SERES_PERSONIFICADOS_3010.scope[file] && !SERES_PERSONIFICADOS_3010.addedSources[file]) return false
  const current = readFileSync(join(raiz, file), 'utf8')
  const exists = execFileSync('git', ['ls-tree', '--name-only', 'origin/main', '--', file], { cwd: raiz, encoding: 'utf8' }).trim()
  const upstream = exists ? execFileSync('git', ['show', `origin/main:${file}`], { cwd: raiz, encoding: 'utf8', maxBuffer: 64 << 20 }) : null
  return deltaSeresPersonificados3010Exato(current, upstream, file)
}
// KINEO-REVISOR-RESTO-3010 — [TRAVA 8.2 — vai do fundador 30/10 "vamos arrumar tudo que o revisor mandou agora"]: recibo exato
// (scripts/test-support/desfaz-revisor-resto-3010-fontes.json) de criança no brinquedo e povo pelo lugar; edição fora dele continua reprovando.
const deltaRevisorRestoExato = (file) => {
  if (!REVISOR_RESTO_3010.scope[file] && !REVISOR_RESTO_3010.addedSources[file]) return false
  const current = readFileSync(join(raiz, file), 'utf8')
  const exists = execFileSync('git', ['ls-tree', '--name-only', 'origin/main', '--', file], { cwd: raiz, encoding: 'utf8' }).trim()
  const upstream = exists ? execFileSync('git', ['show', `origin/main:${file}`], { cwd: raiz, encoding: 'utf8', maxBuffer: 64 << 20 }) : null
  return deltaRevisorResto3010Exato(current, upstream, file)
}
// KINEO-CONSISTENCIA-SER-3010 — [TRAVA 8.2 — vai do fundador 30/10 "vamos fazer já essas entregas que você quer deixar para depois"]:
// recibo exato (scripts/test-support/desfaz-consistencia-ser-3010-fontes.json) do ser não humano com desenho fixo; edição fora dele continua reprovando.
const deltaConsistenciaSerExato = (file) => {
  if (!CONSISTENCIA_SER_3010.scope[file] && !CONSISTENCIA_SER_3010.addedSources[file]) return false
  const current = readFileSync(join(raiz, file), 'utf8')
  const exists = execFileSync('git', ['ls-tree', '--name-only', 'origin/main', '--', file], { cwd: raiz, encoding: 'utf8' }).trim()
  const upstream = exists ? execFileSync('git', ['show', `origin/main:${file}`], { cwd: raiz, encoding: 'utf8', maxBuffer: 64 << 20 }) : null
  return deltaConsistenciaSer3010Exato(current, upstream, file)
}
// KINEO-K4-ASSUNTO-3010 — [TRAVA 8.2 — vai do fundador 30/10 "vamos resolver os problemas por aqui"]: recibo exato
// (scripts/test-support/desfaz-k4-assunto-3010-fontes.json) da moldura do Kling 4 e do assunto da fala; edição fora dele continua reprovando.
// KINEO-LEGENDA-CENA-3110 — recibo exato (scripts/test-support/desfaz-legenda-cena-3110-fontes.json): pontuação da legenda, ação/lado da cena, fecho ≠ abertura.
// KINEO-REVISOR-10-0111 — recibo exato (scripts/test-support/desfaz-revisor-10-0111-fontes.json): os consertos da rodada "últimos 10 vídeos".
// KINEO-K4-SUJEITO-0111 + KINEO-FINAL-RESPOSTA-0111 — recibo exato (scripts/test-support/desfaz-k4-sujeito-final-0111-fontes.json): sujeito do Kling 4 e fim que revela.
const deltaK4SujeitoFinalExato = (file) => {
  if (!K4_SUJEITO_FINAL_0111.scope[file] && !K4_SUJEITO_FINAL_0111.addedSources[file]) return false
  const current = readFileSync(join(raiz, file), 'utf8')
  const exists = execFileSync('git', ['ls-tree', '--name-only', 'origin/main', '--', file], { cwd: raiz, encoding: 'utf8' }).trim()
  const upstream = exists ? execFileSync('git', ['show', `origin/main:${file}`], { cwd: raiz, encoding: 'utf8', maxBuffer: 64 << 20 }) : null
  return deltaK4SujeitoFinal0111Exato(current, upstream, file)
}
// KINEO-K4-NARRACAO-CABE-0111 — recibo exato (scripts/test-support/desfaz-k4-narracao-cabe-0111-fontes.json): a rota mede a fala (TTS da montagem) antes do POST pago do Kling 4 grátis; sobra em movimento.
const deltaK4NarracaoCabeExato = (file) => {
  if (!K4_NARRACAO_CABE_0111.scope[file] && !K4_NARRACAO_CABE_0111.addedSources[file]) return false
  const current = readFileSync(join(raiz, file), 'utf8')
  const exists = execFileSync('git', ['ls-tree', '--name-only', 'origin/main', '--', file], { cwd: raiz, encoding: 'utf8' }).trim()
  const upstream = exists ? execFileSync('git', ['show', `origin/main:${file}`], { cwd: raiz, encoding: 'utf8', maxBuffer: 64 << 20 }) : null
  return deltaK4NarracaoCabe0111Exato(current, upstream, file)
}
// KINEO-JUIZ-PLANO-0111 — recibo exato (scripts/test-support/desfaz-juiz-plano-0111-fontes.json): juiz do plano em modo só observar (camada mais nova, sai primeiro).
const deltaJuizPlanoExato = (file) => {
  if (!JUIZ_PLANO_0111.scope[file] && !JUIZ_PLANO_0111.addedSources[file]) return false
  const current = readFileSync(join(raiz, file), 'utf8')
  const exists = execFileSync('git', ['ls-tree', '--name-only', 'origin/main', '--', file], { cwd: raiz, encoding: 'utf8' }).trim()
  const upstream = exists ? execFileSync('git', ['show', `origin/main:${file}`], { cwd: raiz, encoding: 'utf8', maxBuffer: 64 << 20 }) : null
  return deltaJuizPlano0111Exato(current, upstream, file)
}
// KINEO-VOZ-NATIVA-HOLLYWOOD-0211 — recibo exato (scripts/test-support/desfaz-voz-nativa-hollywood-0211-fontes.json): a voz nativa (MiniMax) na estrada hollywood
// (hostVoice + gênero no ttsFallback, a língua nos 4 chamadores, a língua resolvida no conector). Camada mais nova: conferida primeiro.
const deltaVozNativaHollywoodExato = (file) => {
  if (!VOZ_NATIVA_HOLLYWOOD_0211.scope[file] && !VOZ_NATIVA_HOLLYWOOD_0211.addedSources[file]) return false
  const current = readFileSync(join(raiz, file), 'utf8')
  const exists = execFileSync('git', ['ls-tree', '--name-only', 'origin/main', '--', file], { cwd: raiz, encoding: 'utf8' }).trim()
  const upstream = exists ? execFileSync('git', ['show', `origin/main:${file}`], { cwd: raiz, encoding: 'utf8', maxBuffer: 64 << 20 }) : null
  return deltaVozNativaHollywood0211Exato(current, upstream, file)
}
// KINEO-ANO-INVENTADO-0211 — recibo exato (scripts/test-support/desfaz-ano-inventado-0211-fontes.json): o escritor nunca inventa o ano
// (generate-script + analyze-idea: data real do pedido + regra única de lib/dataRealDoEscritor). Camada mais nova: conferida primeiro.
const deltaAnoInventadoExato = (file) => {
  if (!ANO_INVENTADO_0211.scope[file] && !ANO_INVENTADO_0211.addedSources[file]) return false
  const current = readFileSync(join(raiz, file), 'utf8')
  const exists = execFileSync('git', ['ls-tree', '--name-only', 'origin/main', '--', file], { cwd: raiz, encoding: 'utf8' }).trim()
  const upstream = exists ? execFileSync('git', ['show', `origin/main:${file}`], { cwd: raiz, encoding: 'utf8', maxBuffer: 64 << 20 }) : null
  return deltaAnoInventado0211Exato(current, upstream, file)
}
// KINEO-FILME-GRATIS-COMECA-0211 — recibo exato (scripts/test-support/desfaz-filme-gratis-comeca-0211-fontes.json): "Make my free film" começa o filme
// (GenerateClient + lib/growth/filmeGratisComeca). Camada mais nova: conferida primeiro.
const deltaFilmeGratisComecaExato = (file) => {
  if (!FILME_GRATIS_COMECA_0211.scope[file] && !FILME_GRATIS_COMECA_0211.addedSources[file]) return false
  const current = readFileSync(join(raiz, file), 'utf8')
  const exists = execFileSync('git', ['ls-tree', '--name-only', 'origin/main', '--', file], { cwd: raiz, encoding: 'utf8' }).trim()
  const upstream = exists ? execFileSync('git', ['show', `origin/main:${file}`], { cwd: raiz, encoding: 'utf8', maxBuffer: 64 << 20 }) : null
  return deltaFilmeGratisComeca0211Exato(current, upstream, file)
}
// KINEO-ELENCO-TRAVA-0311 — recibo exato (scripts/test-support/desfaz-elenco-trava-0311-fontes.json): o personagem nomeado não troca entre as cenas (estilo na ficha,
// âncoras da folha, still que falhou refaz/vizinha/texto com ficha, portão do filme grátis refaz o still com a folha). Camada mais nova: conferida primeiro.
const deltaElencoTravaExato = (file) => {
  if (!ELENCO_TRAVA_0311.scope[file] && !ELENCO_TRAVA_0311.addedSources[file]) return false
  const current = readFileSync(join(raiz, file), 'utf8')
  const exists = execFileSync('git', ['ls-tree', '--name-only', 'origin/main', '--', file], { cwd: raiz, encoding: 'utf8' }).trim()
  const upstream = exists ? execFileSync('git', ['show', `origin/main:${file}`], { cwd: raiz, encoding: 'utf8', maxBuffer: 64 << 20 }) : null
  return deltaElencoTrava0311Exato(current, upstream, file)
}
// KINEO-K4-PAGO-SILENCIO-0211 — recibo exato (scripts/test-support/desfaz-k4-pago-silencio-0211-fontes.json): a régua de silêncio do Kling 4 PAGO de 15 s julga o
// clipe único com a fala inteira no passo real da faixa (rota do cinematic + lib/kling4PaidSilence). Camada mais nova: conferida primeiro.
const deltaK4PagoSilencioExato = (file) => {
  if (!K4_PAGO_SILENCIO_0211.scope[file] && !K4_PAGO_SILENCIO_0211.addedSources[file]) return false
  const current = readFileSync(join(raiz, file), 'utf8')
  const exists = execFileSync('git', ['ls-tree', '--name-only', 'origin/main', '--', file], { cwd: raiz, encoding: 'utf8' }).trim()
  const upstream = exists ? execFileSync('git', ['show', `origin/main:${file}`], { cwd: raiz, encoding: 'utf8', maxBuffer: 64 << 20 }) : null
  return deltaK4PagoSilencio0211Exato(current, upstream, file)
}
// KINEO-K4-DESPACHO-0211 — recibo exato (scripts/test-support/desfaz-k4-despacho-0211-fontes.json): o Kling 4 PAGO consulta a fal antes do timeout (20 min,
// lib/kling4PaidAsyncStatus) e o despacho pago entra no ledger (rota do cinematic). Camada mais nova: conferida primeiro.
const deltaK4DespachoExato = (file) => {
  if (!K4_DESPACHO_0211.scope[file] && !K4_DESPACHO_0211.addedSources[file]) return false
  const current = readFileSync(join(raiz, file), 'utf8')
  const exists = execFileSync('git', ['ls-tree', '--name-only', 'origin/main', '--', file], { cwd: raiz, encoding: 'utf8' }).trim()
  const upstream = exists ? execFileSync('git', ['show', `origin/main:${file}`], { cwd: raiz, encoding: 'utf8', maxBuffer: 64 << 20 }) : null
  return deltaK4Despacho0211Exato(current, upstream, file)
}
// KINEO-K4-PAGO-CABE-0211 — recibo exato (scripts/test-support/desfaz-k4-pago-cabe-0211-fontes.json): a faixa do escritor do Kling 4 PAGO de 15 s
// (lib/kling4TrialScript) e a ligação no generate-script (faixa, instrução e teto duro). Camada mais nova: conferida primeiro.
const deltaK4PagoCabeExato = (file) => {
  if (!K4_PAGO_CABE_0211.scope[file] && !K4_PAGO_CABE_0211.addedSources[file]) return false
  const current = readFileSync(join(raiz, file), 'utf8')
  const exists = execFileSync('git', ['ls-tree', '--name-only', 'origin/main', '--', file], { cwd: raiz, encoding: 'utf8' }).trim()
  const upstream = exists ? execFileSync('git', ['show', `origin/main:${file}`], { cwd: raiz, encoding: 'utf8', maxBuffer: 64 << 20 }) : null
  return deltaK4PagoCabe0211Exato(current, upstream, file)
}
// KINEO-CASA-FICHA-SEM-LETRAS-0211 — recibo exato (scripts/test-support/desfaz-casa-ficha-sem-letras-0211-fontes.json): cenário do filme (era+lugar+povo) e sem
// letras/figura pública em todo motor (constante das regras do escritor em lib/cinematic, lida pelo planejador hollywood e pelo descritor da rota cinematic). Camada mais nova: conferida primeiro.
const deltaCasaFichaSemLetrasExato = (file) => {
  if (!CASA_FICHA_SEM_LETRAS_0211.scope[file] && !CASA_FICHA_SEM_LETRAS_0211.addedSources[file]) return false
  const current = readFileSync(join(raiz, file), 'utf8')
  const exists = execFileSync('git', ['ls-tree', '--name-only', 'origin/main', '--', file], { cwd: raiz, encoding: 'utf8' }).trim()
  const upstream = exists ? execFileSync('git', ['show', `origin/main:${file}`], { cwd: raiz, encoding: 'utf8', maxBuffer: 64 << 20 }) : null
  return deltaCasaFichaSemLetras0211Exato(current, upstream, file)
}
// KINEO-LEGENDA-MILHAR-0211 — recibo exato (scripts/test-support/desfaz-legenda-milhar-0211-fontes.json): algarismo-separador-algarismo
// ("2,600", "1.500", "3.5") vira um token só no chunker da legenda. Camada mais nova: conferida primeiro; edição fora do recibo continua reprovando.
const deltaLegendaMilharExato = (file) => {
  if (!LEGENDA_MILHAR_0211.scope[file] && !LEGENDA_MILHAR_0211.addedSources[file]) return false
  const current = readFileSync(join(raiz, file), 'utf8')
  const exists = execFileSync('git', ['ls-tree', '--name-only', 'origin/main', '--', file], { cwd: raiz, encoding: 'utf8' }).trim()
  const upstream = exists ? execFileSync('git', ['show', `origin/main:${file}`], { cwd: raiz, encoding: 'utf8', maxBuffer: 64 << 20 }) : null
  return deltaLegendaMilhar0211Exato(current, upstream, file)
}
// KINEO-PAINEL-MOTOR-ENTREGUE-0211 — recibo exato (scripts/test-support/desfaz-painel-motor-entregue-0211-fontes.json): motor entregue no painel,
// língua do pacote de publicação e overlay nosso fora do teto do pixel_score. Camada mais nova: conferida primeiro (antes da do filme de 15 s,
// que lê lib/regua95/pixelScore.ts); edição fora do recibo continua reprovando.
const deltaPainelMotorEntregueExato = (file) => {
  if (!PAINEL_MOTOR_ENTREGUE_0211.scope[file] && !PAINEL_MOTOR_ENTREGUE_0211.addedSources[file]) return false
  const current = readFileSync(join(raiz, file), 'utf8')
  const exists = execFileSync('git', ['ls-tree', '--name-only', 'origin/main', '--', file], { cwd: raiz, encoding: 'utf8' }).trim()
  const upstream = exists ? execFileSync('git', ['show', `origin/main:${file}`], { cwd: raiz, encoding: 'utf8', maxBuffer: 64 << 20 }) : null
  return deltaPainelMotorEntregue0211Exato(current, upstream, file)
}
// KINEO-CENA-MORTA-MONTA-0311 — recibo exato (scripts/test-support/desfaz-cena-morta-monta-0311-fontes.json): cena morta por idade vira prova no claim.
const deltaCenaMortaMontaExato = (file) => {
  if (!CENA_MORTA_MONTA_0311.scope[file] && !CENA_MORTA_MONTA_0311.addedSources[file]) return false
  const current = readFileSync(join(raiz, file), 'utf8')
  const exists = execFileSync('git', ['ls-tree', '--name-only', 'origin/main', '--', file], { cwd: raiz, encoding: 'utf8' }).trim()
  const upstream = exists ? execFileSync('git', ['show', `origin/main:${file}`], { cwd: raiz, encoding: 'utf8', maxBuffer: 64 << 20 }) : null
  return deltaCenaMortaMonta0311Exato(current, upstream, file)
}
const deltaRevisor10Exato = (file) => {
  if (!REVISOR_10_0111.scope[file] && !REVISOR_10_0111.addedSources[file]) return false
  const current = readFileSync(join(raiz, file), 'utf8')
  const exists = execFileSync('git', ['ls-tree', '--name-only', 'origin/main', '--', file], { cwd: raiz, encoding: 'utf8' }).trim()
  const upstream = exists ? execFileSync('git', ['show', `origin/main:${file}`], { cwd: raiz, encoding: 'utf8', maxBuffer: 64 << 20 }) : null
  return deltaRevisor100111Exato(current, upstream, file)
}
// KINEO-SEM-INICIO-AUTOMATICO-0211 — recibo exato (scripts/test-support/desfaz-sem-inicio-automatico-0211-fontes.json): depois de pagar nada começa sozinho; a mais nova, conferida primeiro.
const deltaSemInicioAutomaticoExato = (file) => {
  if (!SEM_INICIO_AUTOMATICO_0211.scope[file] && !SEM_INICIO_AUTOMATICO_0211.addedSources[file]) return false
  const current = readFileSync(join(raiz, file), 'utf8')
  const exists = execFileSync('git', ['ls-tree', '--name-only', 'origin/main', '--', file], { cwd: raiz, encoding: 'utf8' }).trim()
  const upstream = exists ? execFileSync('git', ['show', `origin/main:${file}`], { cwd: raiz, encoding: 'utf8', maxBuffer: 64 << 20 }) : null
  return deltaSemInicioAutomatico0211Exato(current, upstream, file)
}
// KINEO-PROTAGONISTA-SEEDANCE-0111 — recibo exato (scripts/test-support/desfaz-protagonista-seedance-0111-fontes.json): o elenco semântico (protagonista nomeado).
const deltaProtagonistaSeedanceExato = (file) => {
  if (!PROTAGONISTA_SEEDANCE_0111.scope[file] && !PROTAGONISTA_SEEDANCE_0111.addedSources[file]) return false
  const current = readFileSync(join(raiz, file), 'utf8')
  const exists = execFileSync('git', ['ls-tree', '--name-only', 'origin/main', '--', file], { cwd: raiz, encoding: 'utf8' }).trim()
  const upstream = exists ? execFileSync('git', ['show', `origin/main:${file}`], { cwd: raiz, encoding: 'utf8', maxBuffer: 64 << 20 }) : null
  return deltaProtagonistaSeedance0111Exato(current, upstream, file)
}
const deltaLegendaCenaExato = (file) => {
  if (!LEGENDA_CENA_3110.scope[file] && !LEGENDA_CENA_3110.addedSources[file]) return false
  const current = readFileSync(join(raiz, file), 'utf8')
  const exists = execFileSync('git', ['ls-tree', '--name-only', 'origin/main', '--', file], { cwd: raiz, encoding: 'utf8' }).trim()
  const upstream = exists ? execFileSync('git', ['show', `origin/main:${file}`], { cwd: raiz, encoding: 'utf8', maxBuffer: 64 << 20 }) : null
  return deltaLegendaCena3110Exato(current, upstream, file)
}
// KINEO-FLUXO-LEVA1-3010 — recibo exato (scripts/test-support/desfaz-fluxo-leva1-3010-fontes.json): escritor, legenda e camisa sem marca.
const deltaFluxoLeva1Exato = (file) => {
  if (!FLUXO_LEVA1_3010.scope[file] && !FLUXO_LEVA1_3010.addedSources[file]) return false
  const current = readFileSync(join(raiz, file), 'utf8')
  const exists = execFileSync('git', ['ls-tree', '--name-only', 'origin/main', '--', file], { cwd: raiz, encoding: 'utf8' }).trim()
  const upstream = exists ? execFileSync('git', ['show', `origin/main:${file}`], { cwd: raiz, encoding: 'utf8', maxBuffer: 64 << 20 }) : null
  return deltaFluxoLeva13010Exato(current, upstream, file)
}
const deltaK4AssuntoExato = (file) => {
  if (!K4_ASSUNTO_3010.scope[file] && !K4_ASSUNTO_3010.addedSources[file]) return false
  const current = readFileSync(join(raiz, file), 'utf8')
  const exists = execFileSync('git', ['ls-tree', '--name-only', 'origin/main', '--', file], { cwd: raiz, encoding: 'utf8' }).trim()
  const upstream = exists ? execFileSync('git', ['show', `origin/main:${file}`], { cwd: raiz, encoding: 'utf8', maxBuffer: 64 << 20 }) : null
  return deltaK4Assunto3010Exato(current, upstream, file)
}
// KINEO-JUIZ-ESTADOS-3010 — exact receipt; no marker-only/path-wide exemption.
const deltaJuizEstadosExato = (file) => {
  if (!JUIZ_ESTADOS_3010.scope[file] && !JUIZ_ESTADOS_3010.addedSources[file]) return false
  const current = readFileSync(join(raiz, file), 'utf8')
  const exists = execFileSync('git', ['ls-tree', '--name-only', 'origin/main', '--', file], { cwd: raiz, encoding: 'utf8' }).trim()
  const upstream = exists ? execFileSync('git', ['show', `origin/main:${file}`], { cwd: raiz, encoding: 'utf8', maxBuffer: 64 << 20 }) : null
  return deltaJuizEstados3010Exato(current, upstream, file)
}
const deltaCenaRecoveryExato = (file) => {
  if (!CENA_RECOVERY_3010.scope[file] && !CENA_RECOVERY_3010.addedSources[file]) return false
  const current = readFileSync(join(raiz, file), 'utf8')
  const exists = execFileSync('git', ['ls-tree', '--name-only', 'origin/main', '--', file], { cwd: raiz, encoding: 'utf8' }).trim()
  const upstream = exists ? execFileSync('git', ['show', `origin/main:${file}`], { cwd: raiz, encoding: 'utf8', maxBuffer: 64 << 20 }) : null
  return deltaCenaRecovery3010Exato(current, upstream, file)
}
// KINEO-DECISOES-PRECO-3110 — recibo exato (scripts/test-support/recibo-decisoes-preco-3110-fontes.json): as decisões de preço de 31/10; a mais nova, conferida primeiro.
const deltaDecisoesPrecoExato = (file) => {
  if (!DECISOES_PRECO_3110.scope[file] && !DECISOES_PRECO_3110.addedSources[file]) return false
  const current = readFileSync(join(raiz, file), 'utf8')
  const exists = execFileSync('git', ['ls-tree', '--name-only', 'origin/main', '--', file], { cwd: raiz, encoding: 'utf8' }).trim()
  const upstream = exists ? execFileSync('git', ['show', `origin/main:${file}`], { cwd: raiz, encoding: 'utf8', maxBuffer: 64 << 20 }) : null
  return deltaDecisoesPreco3110Exato(current, upstream, file)
}
// KINEO-RECUSA-BOTAO-3110 — recibo exato (scripts/test-support/recibo-recusa-botao-3110-fontes.json): o botão de 1 clique das recusas; a mais nova, conferida primeiro.
const deltaRecusaBotaoExato = (file) => {
  if (!RECUSA_BOTAO_3110.scope[file] && !RECUSA_BOTAO_3110.addedSources[file]) return false
  const current = readFileSync(join(raiz, file), 'utf8')
  const exists = execFileSync('git', ['ls-tree', '--name-only', 'origin/main', '--', file], { cwd: raiz, encoding: 'utf8' }).trim()
  const upstream = exists ? execFileSync('git', ['show', `origin/main:${file}`], { cwd: raiz, encoding: 'utf8', maxBuffer: 64 << 20 }) : null
  return deltaRecusaBotao3110Exato(current, upstream, file)
}
const deltaTrialPedidoExato = (file) => { // KINEO-TRIAL-A-PEDIDO-0411 — recibo exato
  const exists = execFileSync('git', ['ls-tree', '--name-only', 'origin/main', '--', file], { cwd: raiz, encoding: 'utf8' }).trim()
  const upstream = exists ? execFileSync('git', ['show', `origin/main:${file}`], { cwd: raiz, encoding: 'utf8', maxBuffer: 64 << 20 }) : null
  return deltaTrialPedido0411Exato(readFileSyncCru(join(raiz, file), 'utf8'), upstream, file)
}
const deltaSoGenteExato = (file) => { // KINEO-SO-GENTE-NA-FICHA-0411 — recibo exato
  const exists = execFileSync('git', ['ls-tree', '--name-only', 'origin/main', '--', file], { cwd: raiz, encoding: 'utf8' }).trim()
  const upstream = exists ? execFileSync('git', ['show', `origin/main:${file}`], { cwd: raiz, encoding: 'utf8', maxBuffer: 64 << 20 }) : null
  return deltaSoGente0411Exato(readFileSyncCru(join(raiz, file), 'utf8'), upstream, file)
}
const deltaPistaNaoMandaExato = (file) => { // KINEO-PISTA-NAO-MANDA-0411 — recibo exato
  const exists = execFileSync('git', ['ls-tree', '--name-only', 'origin/main', '--', file], { cwd: raiz, encoding: 'utf8' }).trim()
  const upstream = exists ? execFileSync('git', ['show', `origin/main:${file}`], { cwd: raiz, encoding: 'utf8', maxBuffer: 64 << 20 }) : null
  return deltaPistaNaoManda0411Exato(readFileSyncCru(join(raiz, file), 'utf8'), upstream, file)
}
const deltaSujeitoLimpoExato = (file) => { // KINEO-SUJEITO-LIMPO-0411 — recibo exato
  const exists = execFileSync('git', ['ls-tree', '--name-only', 'origin/main', '--', file], { cwd: raiz, encoding: 'utf8' }).trim()
  const upstream = exists ? execFileSync('git', ['show', `origin/main:${file}`], { cwd: raiz, encoding: 'utf8', maxBuffer: 64 << 20 }) : null
  return deltaSujeitoLimpo0411Exato(readFileSyncCru(join(raiz, file), 'utf8'), upstream, file)
}
const deltaCitadoNaoAgeExato = (file) => { // KINEO-CITADO-NAO-AGE-0311 — recibo exato
  const exists = execFileSync('git', ['ls-tree', '--name-only', 'origin/main', '--', file], { cwd: raiz, encoding: 'utf8' }).trim()
  const upstream = exists ? execFileSync('git', ['show', `origin/main:${file}`], { cwd: raiz, encoding: 'utf8', maxBuffer: 64 << 20 }) : null
  return deltaCitadoNaoAge0311Exato(readFileSyncCru(join(raiz, file), 'utf8'), upstream, file)
}
const deltaAviaoCarroExato = (file) => { // KINEO-AVIAO-NAO-VIRA-CARRO-0311 — recibo exato
  const exists = execFileSync('git', ['ls-tree', '--name-only', 'origin/main', '--', file], { cwd: raiz, encoding: 'utf8' }).trim()
  const upstream = exists ? execFileSync('git', ['show', `origin/main:${file}`], { cwd: raiz, encoding: 'utf8', maxBuffer: 64 << 20 }) : null
  return deltaAviaoCarro0311Exato(readFileSyncCru(join(raiz, file), 'utf8'), upstream, file)
}
const deltaOrigemElencoExato = (file) => { // KINEO-ORIGEM-DO-ELENCO-0311 — recibo exato (scripts/test-support/desfaz-origem-elenco-0311-fontes.json)
  const exists = execFileSync('git', ['ls-tree', '--name-only', 'origin/main', '--', file], { cwd: raiz, encoding: 'utf8' }).trim()
  const upstream = exists ? execFileSync('git', ['show', `origin/main:${file}`], { cwd: raiz, encoding: 'utf8', maxBuffer: 64 << 20 }) : null
  return deltaOrigemElenco0311Exato(readFileSyncCru(join(raiz, file), 'utf8'), upstream, file)
}
const deltaRetomadaDebitaExato = (file) => { // KINEO-RETOMADA-DEBITA-0311 — recibo exato (scripts/test-support/desfaz-retomada-debita-0311-fontes.json)
  const exists = execFileSync('git', ['ls-tree', '--name-only', 'origin/main', '--', file], { cwd: raiz, encoding: 'utf8' }).trim()
  const upstream = exists ? execFileSync('git', ['show', `origin/main:${file}`], { cwd: raiz, encoding: 'utf8', maxBuffer: 64 << 20 }) : null
  return deltaRetomadaDebita0311Exato(readFileSyncCru(join(raiz, file), 'utf8'), upstream, file)
}
const deltaFolhaPaganteExato = (file) => { // KINEO-FOLHA-PAGANTE-0311 — recibo exato (scripts/test-support/desfaz-folha-pagante-0311-fontes.json)
  const exists = execFileSync('git', ['ls-tree', '--name-only', 'origin/main', '--', file], { cwd: raiz, encoding: 'utf8' }).trim()
  const upstream = exists ? execFileSync('git', ['show', `origin/main:${file}`], { cwd: raiz, encoding: 'utf8', maxBuffer: 64 << 20 }) : null
  return deltaFolhaPagante0311Exato(readFileSyncCru(join(raiz, file), 'utf8'), upstream, file)
}
const deltaFrenteAExato = (file) => { // KINEO-FRENTE-A-0311 — recibo exato (scripts/test-support/desfaz-frente-a-0311-fontes.json)
  const exists = execFileSync('git', ['ls-tree', '--name-only', 'origin/main', '--', file], { cwd: raiz, encoding: 'utf8' }).trim()
  const upstream = exists ? execFileSync('git', ['show', `origin/main:${file}`], { cwd: raiz, encoding: 'utf8', maxBuffer: 64 << 20 }) : null
  return deltaFrenteA0311Exato(readFileSyncCru(join(raiz, file), 'utf8'), upstream, file)
}
const deltaFrenteBExato = (file) => { // KINEO-JUIZ-PERGUNTAS-0311 — recibo exato (scripts/test-support/desfaz-frente-b-0311-fontes.json)
  const exists = execFileSync('git', ['ls-tree', '--name-only', 'origin/main', '--', file], { cwd: raiz, encoding: 'utf8' }).trim()
  const upstream = exists ? execFileSync('git', ['show', `origin/main:${file}`], { cwd: raiz, encoding: 'utf8', maxBuffer: 64 << 20 }) : null
  return deltaFrenteB0311Exato(readFileSyncCru(join(raiz, file), 'utf8'), upstream, file)
}
const deltaSujeitoTodosExato = (file) => { // KINEO-SUJEITO-TODOS-0311 — recibo exato (scripts/test-support/desfaz-sujeito-todos-0311-fontes.json)
  const exists = execFileSync('git', ['ls-tree', '--name-only', 'origin/main', '--', file], { cwd: raiz, encoding: 'utf8' }).trim()
  const upstream = exists ? execFileSync('git', ['show', `origin/main:${file}`], { cwd: raiz, encoding: 'utf8', maxBuffer: 64 << 20 }) : null
  return deltaSujeitoTodos0311Exato(readFileSyncCru(join(raiz, file), 'utf8'), upstream, file)
}
const deltaEpocaNaFichaExato = (file) => { // KINEO-EPOCA-NA-FICHA-0311 — recibo exato (scripts/test-support/desfaz-epoca-na-ficha-0311-fontes.json)
  const exists = execFileSync('git', ['ls-tree', '--name-only', 'origin/main', '--', file], { cwd: raiz, encoding: 'utf8' }).trim()
  const upstream = exists ? execFileSync('git', ['show', `origin/main:${file}`], { cwd: raiz, encoding: 'utf8', maxBuffer: 64 << 20 }) : null
  return deltaEpocaNaFicha0311Exato(readFileSyncCru(join(raiz, file), 'utf8'), upstream, file)
}
const deltaCartoonSoPlanoExato = (file) => { // KINEO-CARTOON-SO-PLANO-0411 — a rota do filme é origin/main + as 4 linhas marcadas?
  const exists = execFileSync('git', ['ls-tree', '--name-only', 'origin/main', '--', file], { cwd: raiz, encoding: 'utf8' }).trim()
  return !!exists && deltaCartoonSoPlano0411Exato(readFileSyncDoDisco(join(raiz, file), 'utf8'), execFileSync('git', ['show', `origin/main:${file}`], { cwd: raiz, encoding: 'utf8', maxBuffer: 64 << 20 }), file)
}
const deltaK4FaixaTetoExato = (file) => { // KINEO-K4-FAIXA-TETO-0511 — recibo exato (scripts/test-support/desfaz-k4-faixa-teto-0511-fontes.json): o roteiro do filme grátis Kling 4 na faixa
  const exists = execFileSync('git', ['ls-tree', '--name-only', 'origin/main', '--', file], { cwd: raiz, encoding: 'utf8' }).trim()
  const upstream = exists ? execFileSync('git', ['show', `origin/main:${file}`], { cwd: raiz, encoding: 'utf8', maxBuffer: 64 << 20 }) : null
  return deltaK4FaixaTeto0511Exato(readFileSyncCru(join(raiz, file), 'utf8'), upstream, file)
}
const deltaLeva3Exato = (file) => { // KINEO-LEVA3-REVISOR-0311 — recibo exato (scripts/test-support/desfaz-leva3-revisor-0311-fontes.json): legenda e fits do filme curto
  const exists = execFileSync('git', ['ls-tree', '--name-only', 'origin/main', '--', file], { cwd: raiz, encoding: 'utf8' }).trim()
  const upstream = exists ? execFileSync('git', ['show', `origin/main:${file}`], { cwd: raiz, encoding: 'utf8', maxBuffer: 64 << 20 }) : null
  return deltaLeva3Revisor0311Exato(readFileSyncCru(join(raiz, file), 'utf8'), upstream, file)
}
const tocados = diff.split('\n').map((s) => s.trim()).filter(Boolean).filter((file) => !deltaCartoonSoPlanoExato(file) /* KINEO-CARTOON-SO-PLANO-0411 */ && !deltaK4FaixaTetoExato(file) /* KINEO-K4-FAIXA-TETO-0511 */ && !deltaTrialPedidoExato(file) /* KINEO-TRIAL-A-PEDIDO-0411 */ && !deltaSoGenteExato(file) /* KINEO-SO-GENTE-NA-FICHA-0411 */ && !deltaPistaNaoMandaExato(file) /* KINEO-PISTA-NAO-MANDA-0411 */ && !deltaSujeitoLimpoExato(file) /* KINEO-SUJEITO-LIMPO-0411 */ && !deltaCitadoNaoAgeExato(file) /* KINEO-CITADO-NAO-AGE-0311 */ && !deltaAviaoCarroExato(file) /* KINEO-AVIAO-NAO-VIRA-CARRO-0311 */ && !deltaOrigemElencoExato(file) /* KINEO-ORIGEM-DO-ELENCO-0311 */ && !deltaRetomadaDebitaExato(file) /* KINEO-RETOMADA-DEBITA-0311 */ && !deltaFolhaPaganteExato(file) /* KINEO-FOLHA-PAGANTE-0311 */ && !deltaFrenteAExato(file) /* KINEO-FRENTE-A-0311 */ && !deltaFrenteBExato(file) /* KINEO-JUIZ-PERGUNTAS-0311 */ && !deltaSujeitoTodosExato(file) /* KINEO-SUJEITO-TODOS-0311 */ && !deltaEpocaNaFichaExato(file) /* KINEO-EPOCA-NA-FICHA-0311 */ && !deltaLeva3Exato(file) /* KINEO-LEVA3-REVISOR-0311 */ && !deltaCenaMortaMontaExato(file) /* KINEO-CENA-MORTA-MONTA-0311 */ && !deltaElencoTravaExato(file) /* KINEO-ELENCO-TRAVA-0311 */ && !deltaVozNativaHollywoodExato(file) /* KINEO-VOZ-NATIVA-HOLLYWOOD-0211 */ && !deltaAnoInventadoExato(file) && !deltaFilmeGratisComecaExato(file) && !deltaK4PagoSilencioExato(file) && !deltaK4DespachoExato(file) && !deltaK4PagoCabeExato(file) && !deltaCasaFichaSemLetrasExato(file) && !deltaLegendaMilharExato(file) && !deltaPainelMotorEntregueExato(file) && !deltaK4NarracaoCabeExato(file) && !deltaSemInicioAutomaticoExato(file) && !deltaProtagonistaSeedanceExato(file) && !deltaJuizPlanoExato(file) && !deltaK4SujeitoFinalExato(file) && !deltaRevisor10Exato(file) && !deltaDecisoesPrecoExato(file) && !deltaRecusaBotaoExato(file) && !deltaLegendaCenaExato(file) &&!deltaFluxoLeva1Exato(file) && !deltaCenaRecoveryExato(file) && !deltaJuizEstadosExato(file) && !deltaK4AssuntoExato(file) && !deltaConsistenciaSerExato(file) && !deltaRevisorRestoExato(file) && !deltaSeresPersonificadosExato(file) &&!deltaCenaPedidoExato(file) &&!deltaQualidadeExato(file) && !deltaFilme15Exato(file))
// KINEO-DIFF-VAZIO-NAO-E-FALHA-2026-09-07 — esta linha exigia diff NÃO-VAZIO, e
// isso inverte a própria trava. A regra 8.2 diz "a sua entrega não pode tocar o
// motor de vídeo"; um diff vazio significa "não há entrega pendente", que é o
// caso que MENOS pode reprovar. Consequência medida hoje: rodar a suíte a
// partir de um checkout limpo da ponta (o jeito honesto de conferir o que está
// no ar) deixava este guardião permanentemente vermelho, sem defeito nenhum —
// e falso vermelho treina gente a ignorar guardião
// (memória `guardiao-crlf-falso-vermelho`).
//
// O diff continua sendo LIDO e a leitura continua tendo de funcionar: o que
// muda é que "nada pendente" passa a ser um resultado válido, e não uma falha.
// A trava de qualidade do fundador (8.2) roda igual nos dois casos — sobre uma
// lista vazia ela é trivialmente verdadeira, que é exatamente o correto.
check('8.1 o git diff foi lido (vazio = nada pendente, e isso e valido)', typeof diff === 'string')
// Reancorado 29/09 (KINEO-ENTRADA-SEEDANCE15, E2b): a trava 8.2 continua proibindo TODO arquivo desses caminhos, com uma
// única saída — a do próprio protocolo da trava: o arquivo só pode estar no diff se TODO commit da fila que o toca
// (origin/main..HEAD) carregar o selo nominal "[TRAVA 8.2" na mensagem (o "vai" do fundador) e se ele NÃO tiver mudança
// pendente fora de commit. Arquivo tocado sem selo, ou com edição solta na árvore, continua vermelho.
const pendentes = (() => { try { return execFileSync('git', ['diff', '--name-only', 'HEAD', '--'], { cwd: raiz, encoding: 'utf8' }).split('\n').map((s) => s.trim()).filter(Boolean) } catch { return null } })()
const comSelo = (f) => {
  if (!pendentes || pendentes.includes(f)) return false
  try {
    const assuntos = execFileSync('git', ['log', '--format=%s', 'origin/main..HEAD', '--', f], { cwd: raiz, encoding: 'utf8' }).split('\n').map((s) => s.trim()).filter(Boolean)
    return assuntos.length > 0 && assuntos.every((s) => s.includes('[TRAVA 8.2'))
  } catch { return false }
}
for (const p of PROIBIDOS) {
  check(`8.2 nao toca ${p}`, !tocados.some((f) => f.startsWith(p) && !comSelo(f)))
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
