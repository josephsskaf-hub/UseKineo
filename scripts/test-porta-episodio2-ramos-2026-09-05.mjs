#!/usr/bin/env node
/**
 * sprint-retencao #11 (2026-09-05) — A PORTA DO EPISODIO 2 NOS DOIS RAMOS
 * DA TELA DE FILME PRONTO.
 *
 * O QUE ESTAVA ERRADO (medido no banco, 30 dias, contas externas):
 *   410 pessoas chegaram ao `video_ready_viewed`; so 44 (10,7%) satisfizeram
 *   `showPostVideoExportChoice` — a condicao que o evento
 *   `post_video_currency_resolved` espelha exatamente. O #18 pos a porta do
 *   episodio 2 "no primeiro viewport", mas DENTRO desse ramo. Resultado:
 *   rodape (`done_screen`) alcancou 51 pessoas, topo (`done_screen_top`)
 *   alcancou 0 — a peca feita para levar a porta de 12% a 60% de alcance
 *   nascia com teto estrutural de ~11%, ABAIXO do rodape que ela corrigia.
 *
 * REPRODUZIDO em pessoa viva (05/09 01:11 UTC, `trial_status='active'`):
 *   `series_continue_seen(done_screen)` disparou e `done_screen_top` nao, na
 *   mesma geracao e com o mesmo `attempt_id`.
 *
 * A tela tem DOIS ramos irmaos e mutuamente exclusivos, cada um com o seu
 * proprio botao de download. Este teste prova que a porta existe nos DOIS,
 * que eles continuam exclusivos (nada renderiza duas vezes), e que a regra
 * KINEO-DELIVER-FIRST continua de pe (a porta vem DEPOIS do download).
 *
 * Le o arquivo REAL. Zero rede, zero banco, zero credito.
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const CAMINHO_TELA = join(RAIZ, 'app/(dashboard)/generate/GenerateClient.tsx')
const CAMINHO_LIB = join(RAIZ, 'lib/seriesContinuation.ts')

let ok = 0
let falhas = 0
const erros = []

function checa(nome, condicao, detalhe = '') {
  if (condicao) {
    ok += 1
    console.log(`  ok  ${nome}`)
  } else {
    falhas += 1
    erros.push(`${nome}${detalhe ? ` — ${detalhe}` : ''}`)
    console.log(`  FALHA  ${nome}${detalhe ? ` — ${detalhe}` : ''}`)
  }
}

const tela = readFileSync(CAMINHO_TELA, 'utf8')
const lib = readFileSync(CAMINHO_LIB, 'utf8')

// ── 1. O GATE E A RAZAO DE ELE EXCLUIR O TRIAL ────────────────────────────
console.log('\n1) O gate `showPostVideoExportChoice` e o que ele exclui')

const defGate = tela.match(/const showPostVideoExportChoice\s*=([\s\S]{0,220})/)
checa('1.1 o gate existe e e uma constante derivada', Boolean(defGate))
const corpoGate = defGate ? defGate[1] : ''
checa('1.2 o gate exige phase done', /phase === 'done'/.test(corpoGate))
checa(
  '1.3 o gate EXCLUI trial ativo (a razao pela qual a porta nao aparecia)',
  /!trialActive/.test(corpoGate),
  'se esta condicao sumir, a premissa deste teste mudou — remedir antes de editar',
)
checa('1.4 o gate exige marca d agua no resultado', /currentResultHasWatermark/.test(corpoGate))

// ── 2. A PORTA EXISTE NOS DOIS RAMOS ──────────────────────────────────────
console.log('\n2) A porta `done_screen_top` nos dois ramos irmaos')

const chamadas = [...tela.matchAll(/handleContinueSeries\(\s*episode2Seed\s*,\s*'done_screen_top'/g)]
checa(
  '2.1 existem EXATAMENTE 2 pontos de render da porta de topo',
  chamadas.length === 2,
  `encontrados ${chamadas.length}`,
)

const refs = [...tela.matchAll(/ref=\{nextEpisodeTopBtnRef\}/g)]
checa(
  '2.2 os dois botoes usam o MESMO ref (os ramos nunca coexistem)',
  refs.length === 2,
  `encontrados ${refs.length}`,
)

// O ramo gated: dentro de `{showPostVideoExportChoice && (`
const idxGated = tela.indexOf('{showPostVideoExportChoice && (')
const idxSecaoUngated = tela.indexOf("{!showPostVideoExportChoice && (")
checa('2.3 o ramo da caixa de export limpo existe', idxGated > 0)
checa('2.4 o ramo irmao (sem a caixa) existe', idxSecaoUngated > idxGated)

const idxPortaGated = chamadas.length === 2 ? chamadas[0].index : -1
const idxPortaUngated = chamadas.length === 2 ? chamadas[1].index : -1
checa(
  '2.5 a primeira porta esta dentro do ramo da caixa de export',
  idxPortaGated > idxGated && idxPortaGated < idxSecaoUngated,
)
checa(
  '2.6 a segunda porta esta no ramo irmao, depois dele',
  idxPortaUngated > idxSecaoUngated,
)

// A segunda porta precisa estar sob guarda de NEGACAO do gate
const trechoAntesDaSegunda = tela.slice(idxSecaoUngated, idxPortaUngated)
const guardaDaSegunda = /\{!showPostVideoExportChoice && episode2Seed && \(/.test(trechoAntesDaSegunda)
checa(
  '2.7 a segunda porta so renderiza quando o gate e FALSO (exclusao mutua)',
  guardaDaSegunda,
  'sem `!showPostVideoExportChoice &&` os dois botoes podem coexistir e o ref colide',
)
checa(
  '2.8 a segunda porta tambem exige uma semente valida',
  /\{!showPostVideoExportChoice && episode2Seed && \(/.test(trechoAntesDaSegunda),
)

// ── 3. DELIVER-FIRST: A PORTA VEM DEPOIS DO DOWNLOAD ──────────────────────
console.log('\n3) KINEO-DELIVER-FIRST — o arquivo primeiro, a porta depois')

// No ramo irmao, o <a> de download e o primeiro filho do bloco.
const idxDownloadUngated = tela.indexOf('onClick={handleDownload}', idxSecaoUngated)
checa('3.1 o ramo irmao tem o botao de download', idxDownloadUngated > 0)
checa(
  '3.2 a porta vem DEPOIS do download no ramo irmao',
  idxDownloadUngated > 0 && idxPortaUngated > idxDownloadUngated,
  '107 pessoas ja foram embora sem o arquivo (KINEO-DELIVER-FIRST-2026-07-30); a porta nunca vem antes',
)

const idxDownloadGated = tela.indexOf('onClick={handleDownload}', idxGated)
checa(
  '3.3 no ramo da caixa de export a porta tambem vem depois do download',
  idxDownloadGated > 0 && idxPortaGated > idxDownloadGated && idxDownloadGated < idxSecaoUngated,
)

// Peso de acao secundaria ate o download confirmado, nos DOIS botoes.
const blocoSegundaPorta = tela.slice(idxPortaUngated, idxPortaUngated + 1600)
checa(
  '3.4 a porta nova so ganha peso de acao principal depois do download',
  /watermarkedDownloadConfirmed/.test(blocoSegundaPorta),
)

// ── 4. O EVENTO DE IMPRESSAO CONTINUA COMPARAVEL ──────────────────────────
console.log('\n4) A impressao `done_screen_top` continua significando a mesma coisa')

const efeito = tela.match(/const nextEpisodeTopSeenRef[\s\S]{0,2600}?\}, \[phase, episode2Seed\]\)/)
checa('4.1 o efeito de impressao da porta de topo existe', Boolean(efeito))
const corpoEfeito = efeito ? efeito[0] : ''
checa('4.2 ele so roda na fase done', /if \(phase !== 'done'\) return/.test(corpoEfeito))
checa('4.3 ele exige a semente', /if \(!episode2Seed\) return/.test(corpoEfeito))
checa(
  '4.4 ele emite a fonte `done_screen_top`',
  /source: 'done_screen_top'/.test(corpoEfeito),
)
checa(
  '4.5 ele procura o botao por ~10s antes de desistir (o botao pode montar depois)',
  /tentativas > 25/.test(corpoEfeito),
  'sem a espera, o ramo novo emitiria menos que o antigo e a comparacao ficaria enviesada',
)
checa(
  '4.6 uma impressao por geracao (attempt_id)',
  /nextEpisodeTopSeenRef\.current === attemptId/.test(corpoEfeito),
)

// ── 5. A FONTE CONTINUA DECLARADA NA LIB ──────────────────────────────────
console.log('\n5) A fonte no contrato de lib/seriesContinuation.ts')
checa("5.1 'done_screen_top' e uma fonte declarada", /\|\s*'done_screen_top'/.test(lib))
checa("5.2 'done_screen' (rodape) continua existindo para a comparacao", /\|\s*'done_screen'\s*$/m.test(lib))

// ── 6. TRAVA DE QUALIDADE (fundador 03/09) ────────────────────────────────
console.log('\n6) Trava de qualidade — nada de motor foi tocado')

const SIMBOLOS_DE_MOTOR = ['secondsOf(', 'secondsFor(', 'scenePrompt', 'fal-ai/', 'creditCostFor(']
// A porta nova nao pode conter nenhum simbolo do motor.
for (const simbolo of SIMBOLOS_DE_MOTOR) {
  checa(
    `6.${SIMBOLOS_DE_MOTOR.indexOf(simbolo) + 1} a porta nova nao toca \`${simbolo}\``,
    !blocoSegundaPorta.includes(simbolo),
  )
}

// ── 7. FALSIFICACAO — as mutacoes que este teste PRECISA pegar ────────────
console.log('\n7) Falsificacao (mutacoes em memoria, o arquivo nao e tocado)')

function contaFalhasCom(textoMutado) {
  // Reexecuta as 3 afirmacoes estruturais que sustentam a entrega.
  const c = [...textoMutado.matchAll(/handleContinueSeries\(\s*episode2Seed\s*,\s*'done_screen_top'/g)]
  const iUn = textoMutado.indexOf("{!showPostVideoExportChoice && (")
  const iPorta2 = c.length === 2 ? c[1].index : -1
  const iDown = textoMutado.indexOf('onClick={handleDownload}', iUn)
  const guarda = iPorta2 > 0 && /\{!showPostVideoExportChoice && episode2Seed && \(/.test(textoMutado.slice(iUn, iPorta2))
  return {
    duasPortas: c.length === 2,
    guardaExclusiva: guarda,
    deliverFirst: iDown > 0 && iPorta2 > iDown,
  }
}

// Mutacao A: alguem remove a porta nova (volta ao defeito original)
const mutA = tela.replace(/\{!showPostVideoExportChoice && episode2Seed && \(/, '{false && episode2Seed && (')
const rA = contaFalhasCom(mutA)
checa(
  '7.1 remover a guarda correta da porta nova REPROVA',
  !rA.guardaExclusiva,
  'a mutacao passou despercebida',
)

// Mutacao B: alguem tira a negacao do gate (os dois ramos coexistiriam)
const mutB = tela.replace(
  '{!showPostVideoExportChoice && episode2Seed && (',
  '{episode2Seed && (',
)
const rB = contaFalhasCom(mutB)
checa(
  '7.2 tirar a exclusao mutua REPROVA (ref colidiria entre dois botoes)',
  !rB.guardaExclusiva,
)

// Mutacao C: alguem move a porta para ANTES do download (quebra deliver-first)
const iUn0 = tela.indexOf("{!showPostVideoExportChoice && (")
const iPorta2_0 = chamadas[1].index
const inicioBloco = tela.lastIndexOf('{/* sprint-retencao #11', iPorta2_0)
const fimBloco = tela.indexOf(')}', tela.indexOf('</button>', iPorta2_0)) + 2
const blocoInteiro = tela.slice(inicioBloco, fimBloco)
const mutC = tela.slice(0, inicioBloco) + tela.slice(fimBloco)
const mutC2 = mutC.slice(0, iUn0) + blocoInteiro + '\n' + mutC.slice(iUn0)
const rC = contaFalhasCom(mutC2)
checa(
  '7.3 mover a porta para ANTES do download REPROVA',
  !rC.deliverFirst,
  'deliver-first deixou de ser verificavel',
)

// ── RESULTADO ─────────────────────────────────────────────────────────────
const total = ok + falhas
console.log(`\n${'─'.repeat(66)}`)
console.log(`RESULTADO: ${ok}/${total} verificacoes ok`)
if (falhas > 0) {
  console.log(`\n${falhas} FALHA(S):`)
  for (const e of erros) console.log(`  · ${e}`)
  process.exit(1)
}
console.log('A porta do episodio 2 existe nos DOIS ramos da tela de filme pronto,')
console.log('eles continuam mutuamente exclusivos, e o download continua primeiro.')
process.exit(0)
