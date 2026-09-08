// Guardião da ROTINA ENTREGA — noite 08→09/09/2026.
//
// O QUE ESTE ARQUIVO DEFENDE (causa nº1 da auditoria da noite): 22 pessoas em
// 14 dias apertaram Generate, não receberam filme e não viram erro nenhum. O
// mecanismo: `/api/generate-video-fast` trabalha 30-40s, termina com o payload
// completo do compose, e o checkpoint durável só nascia quando o CLIENTE
// recebia a resposta e a reenviava. Aba morta = trabalho pronto evaporado, sem
// checkpoint, sem resgate, sem aviso.
//
// O conserto: a própria rota grava o checkpoint (`source:'server'`) ANTES de
// devolver, e o checkpoint do cliente pode substituí-lo uma vez.
//
// Estilo readFileSync de propósito: os 72 testes de scripts/ que usam import
// com alias `@/` morrem antes da primeira verificação (memória
// `guardioes-com-alias-nao-rodam`). Aqui nada é importado do app.
import { readFileSync } from 'node:fs'

const FAST = 'app/api/generate-video-fast/route.ts'
const RECOVERY = 'app/api/render-recovery/route.ts'

// CRLF: o checkout do Windows grava \r\n e toda regex que cruza duas linhas
// daria vermelho falso (memória `guardiao-crlf-falso-vermelho`). Normalizado
// na leitura, uma vez, para os dois arquivos.
const fast = readFileSync(FAST, 'utf8').replace(/\r\n/g, '\n')
const recovery = readFileSync(RECOVERY, 'utf8').replace(/\r\n/g, '\n')

let ok = 0
let bad = 0
/** @param {string} nome @param {boolean} condicao */
function check(nome, condicao) {
  if (condicao === true) {
    ok += 1
  } else {
    bad += 1
    console.error(`  ✗ ${nome}`)
  }
}

// ─── 1. A rota do Kineo 1 grava o próprio checkpoint ────────────────────────

// Amarrado à CHAMADA, não à palavra: o que salva o filme é o sanitizador rodar
// sobre o payload do servidor. Trocar por um objeto cru passaria num teste de
// texto e entregaria mídia não verificada à fase 4.
const chamadaSanitize = /const\s+recoveryPayload\s*=\s*sanitizeFastComposePayload\s*\(\s*generationId\s*,/
check(
  'fast: monta o payload do checkpoint com sanitizeFastComposePayload(generationId, …)',
  chamadaSanitize.test(fast),
)

// A escrita tem de ser GUARDADA pelo payload saneado. `sanitize` devolve null
// quando o payload não serve (host de clipe desconhecido, roteiro vazio,
// duração fora da faixa); gravar assim mesmo criaria resgate de mídia de
// origem desconhecida — exatamente o que a rota de recovery recusa.
check(
  'fast: só grava o checkpoint quando o payload saneado existe (if (recoveryPayload))',
  /if\s*\(\s*recoveryPayload\s*\)\s*\{/.test(fast),
)

// A fase 4 do cron procura o checkpoint por `session_id = generationId`. Um
// checkpoint gravado sem esse vínculo é invisível para o resgate: existiria no
// banco e não terminaria filme nenhum.
const blocoEscrita = fast.slice(
  fast.indexOf('const recoveryPayload'),
  fast.indexOf('const recoveryPayload') + 1400,
)
check(
  'fast: o checkpoint do servidor é gravado com sessionId = generationId',
  /sessionId:\s*generationId/.test(blocoEscrita),
)
check(
  'fast: o checkpoint do servidor usa o nome de evento compartilhado RECOVERABLE_EVENT',
  /name:\s*RECOVERABLE_EVENT/.test(blocoEscrita),
)
check(
  'fast: o checkpoint do servidor é do dono autenticado (userId: user.id)',
  /userId:\s*user\.id/.test(blocoEscrita),
)

// `source: 'server'` é a dobradiça de DUAS coisas: a substituição pelo cliente
// (abaixo) e o corte pelo qual esta entrega se mede. Sem ele, o conserto fica
// sem prova e rebaixa o resgate de quem tem aba viva.
check(
  "fast: o checkpoint do servidor carrega source: 'server'",
  /source:\s*'server'/.test(blocoEscrita),
)

// O payload do servidor tem de levar o que o compose precisa. Cada campo aqui
// é um pedaço do filme: sem clip_urls não há imagem, sem voiceover_script não
// há narração, sem duration o planner não sabe o tamanho.
for (const campo of ['clip_urls', 'voiceover_script', 'scene_captions', 'duration']) {
  check(
    `fast: o payload do checkpoint do servidor inclui ${campo}`,
    // `[,:]` porque `duration` entra por shorthand e os outros por `campo:`.
    new RegExp(`(^|[^\\w])${campo}\\s*[,:]`, 'm').test(blocoEscrita),
  )
}

// A regra vive num arquivo só (memória `regra-vive-em-varios-arquivos`): a
// rota importa o saneador e o nome do evento em vez de recriá-los. Uma cópia
// local divergiria em silêncio no dia em que o saneador mudasse.
check(
  'fast: importa sanitizeFastComposePayload e RECOVERABLE_EVENT do módulo de recovery (não recria)',
  /import\s*\{[^}]*RECOVERABLE_EVENT[^}]*sanitizeFastComposePayload[^}]*\}\s*from\s*'@\/app\/api\/render-recovery\/route'/.test(
    fast,
  ),
)

// POSIÇÃO É A ESSÊNCIA DO CONSERTO. Gravar DEPOIS do return é código morto:
// o `return` encerra a função. O defeito inteiro era o checkpoint nascer tarde
// demais — este é o teste que prova que ele nasce a tempo.
const idxEscrita = fast.indexOf('const recoveryPayload')
const idxReturnSucesso = fast.indexOf("mode: 'fast',\n      generationId,")
check('fast: o bloco do checkpoint existe', idxEscrita > 0)
check('fast: o return de sucesso do Kineo 1 foi localizado', idxReturnSucesso > 0)
check(
  'fast: o checkpoint é gravado ANTES do return de sucesso (senão é código morto)',
  idxEscrita > 0 && idxReturnSucesso > 0 && idxEscrita < idxReturnSucesso,
)

// ─── 2. O checkpoint do cliente vence o do servidor (uma vez) ───────────────

// A CONDIÇÃO QUE DECIDE. Ligar o conserto sem isto rebaixaria o resgate de
// todo mundo cuja aba continuou viva: o payload do servidor (mais pobre, sem
// `vertical`) venceria o do cliente por chegar primeiro.
check(
  "recovery: só um checkpoint anterior de source 'server' pode ser substituído",
  /priorSource\s*!==\s*'server'/.test(recovery),
)
check(
  'recovery: a origem anterior é LIDA do metadata gravado, não presumida',
  /const\s+priorSource\s*=\s*\(\(prior\.metadata\s*\?\?\s*\{\}\)\s*as\s*Record<string,\s*unknown>\)\.source/.test(
    recovery,
  ),
)

// A idempotência antiga tem de sobreviver: entre dois checkpoints do CLIENTE a
// resposta continua sendo `already_recoverable`, sem reescrever linha.
check(
  'recovery: checkpoint de cliente sobre checkpoint de cliente continua already_recoverable',
  /if\s*\(\s*priorSource\s*!==\s*'server'\s*\)\s*\{[\s\S]{0,220}already_recoverable/.test(recovery),
)

// A leitura precisa trazer o metadata — sem ele `priorSource` é sempre
// undefined e a substituição nunca acontece (falha silenciosa).
check(
  'recovery: a busca do checkpoint anterior seleciona id E metadata',
  /\.select\('id,\s*metadata'\)/.test(recovery),
)

// Quem grava pelo cliente se identifica como cliente — é o outro lado do corte
// de medição.
check(
  "recovery: o insert do cliente marca source: 'client'",
  /clips:\s*\(payload\.clip_urls\s*as\s*string\[\]\)\.length,\s*source:\s*'client'/.test(recovery),
)

// Falha da escrita não pode destruir a rede de segurança: se o UPDATE falhar,
// o checkpoint do servidor continua valendo e a fase 4 ainda termina o filme.
check(
  'recovery: UPDATE que falha preserva o checkpoint do servidor (server_checkpoint_kept)',
  /server_checkpoint_kept/.test(recovery),
)

// A substituição é UPDATE da linha existente, nunca um segundo INSERT — duas
// linhas fariam a fase 4 varrer o mesmo filme duas vezes.
check(
  'recovery: a substituição é UPDATE pela id da linha anterior, não um segundo INSERT',
  /\.update\(\{[\s\S]{0,400}\}\)\s*\.eq\('id',\s*prior\.id\s*as\s*string\)/.test(recovery),
)

// ─── 3. O que esta entrega NÃO pode ter tocado ─────────────────────────────
// Pipeline de qualidade congelado (regra da casa). O conserto move QUEM grava
// o bilhete, nunca o que o filme é.
check(
  'fast: o conserto não introduziu custo/crédito novo na rota',
  !/creditCostFor|deductCredits|charge\(/.test(blocoEscrita),
)
check(
  'fast: o conserto não mexe em prompt de cena nem em duração pedida',
  !/promptPara|buildScenePrompt|requestedDuration\s*=/.test(blocoEscrita),
)

console.log(`\n${ok} verificações OK, ${bad} falharam`)
process.exit(bad === 0 ? 0 : 1)
