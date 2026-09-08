// scripts/test-tentativa-perdida-ve-o-fast-2026-09-08.mjs
//
// O QUE ESTE GUARDIÃO PROVA
// ─────────────────────────
// A Fase 5 do cron `finish-stranded-renders` é a carta que socorre quem
// apertou gerar e não recebeu filme nenhum. Ela nasceu em 04/09 e, medido em
// 08/09, `attempt_lost_rescue_sent` tinha ZERO linhas na história inteira.
// A causa não era a decisão nem a copy: era o DETECTOR.
//
//   · ele procurava `generation_attempt_opened` sem `generation_attempt_closed`;
//   · esse par é emitido em UM arquivo só, `app/api/generate-video-cinematic/`.
//     O Fast — motor padrão, único gratuito, maior volume do funil e o motor
//     de 100% das pessoas que essa carta descreve — não emite nenhum dos dois;
//   · e mesmo dentro do cinematográfico havia 61 abertos e 61 fechados: a
//     coorte "aberto sem fechado" nunca teve um único elemento.
//
// O conserto troca a fonte do candidato pelo sinal que existe em TODOS os
// motores (`video_generation_started`, o mesmo que a `/api/next-action` usa),
// e mantém o envio DESLIGADO por interruptor até o fundador decidir.
//
// Estilo: readFileSync + contagem. Nada de `assert` que morre na 1ª falha —
// um guardião que para na primeira linha esconde as outras.
// Toda contagem passa por `semComentarios()`: senão a busca casa com o próprio
// comentário que explica o conserto e o guardião fica vermelho sozinho.

import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const ler = (p) => readFileSync(join(raiz, p), 'utf8')

/** Remove `//`, `/* *\/` e `{/* *\/}` para que nenhuma contagem case com a
 *  prosa que documenta o conserto. */
function semComentarios(txt) {
  return txt
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^[ \t]*\/\/.*$/gm, '')
    .replace(/([^:])\/\/.*$/gm, '$1')
}

let ok = 0
let fail = 0
const falhas = []
function check(nome, condicao) {
  if (condicao) { ok += 1 } else { fail += 1; falhas.push(nome) }
}

const CRON = 'app/api/cron/finish-stranded-renders/route.ts'
const cronRaw = ler(CRON)
const cron = semComentarios(cronRaw)

// ── 1. O DETECTOR PASSOU A OLHAR O SINAL QUE O FAST EMITE ────────────────────
check(
  '1.1 existe a constante do sinal de perda',
  /const ATTEMPT_LOSS_SIGNAL_EVENT\s*=\s*'video_generation_started'/.test(cron),
)
check(
  '1.2 a consulta de candidatos usa o sinal de perda',
  /\.eq\(\s*'name'\s*,\s*ATTEMPT_LOSS_SIGNAL_EVENT\s*\)/.test(cron),
)
// A trava que importa: a consulta de candidatos NÃO pode voltar a filtrar pelo
// evento do cinematográfico. `ATTEMPT_OPENED_EVENT` pode continuar declarado
// (o `_closed` segue sendo exclusão legítima), mas não pode ser a FONTE.
check(
  '1.3 a consulta de candidatos nao filtra mais por ATTEMPT_OPENED_EVENT',
  !/\.eq\(\s*'name'\s*,\s*ATTEMPT_OPENED_EVENT\s*\)/.test(cron),
)
check(
  '1.4 o sinal escolhido e o MESMO que a /api/next-action usa para attempt_lost',
  semComentarios(ler('app/api/next-action/route.ts')).includes("'video_generation_started'"),
)
// Falsificação da premissa que motivou o conserto: se algum dia o Fast passar a
// emitir o par aberto/fechado, esta linha vira vermelha e alguém revisita a
// escolha em vez de herdá-la (memória `comentario-que-justifica-envelhece`).
check(
  '1.5 o Fast segue SEM emitir generation_attempt_opened (premissa do conserto)',
  !semComentarios(ler('app/api/generate-video-fast/route.ts')).includes('generation_attempt_opened'),
)

// ── 2. O ENVIO NASCE DESLIGADO, E O DESLIGAMENTO É DE VERDADE ────────────────
check(
  '2.1 o interruptor existe e esta em false',
  /const ATTEMPT_LOST_SEND_ENABLED\s*=\s*false/.test(cron),
)
check(
  '2.2 o sendEmail da fase 5 esta CONDICIONADO ao interruptor',
  /ATTEMPT_LOST_SEND_ENABLED\s*\?\s*await sendEmail\(/.test(cron),
)
check(
  '2.3 desligado, o carimbo usa nome PROPRIO (nao mente "sent")',
  /name:\s*ATTEMPT_LOST_SEND_ENABLED\s*\?\s*ATTEMPT_LOST_EVENT\s*:\s*ATTEMPT_LOST_CANDIDATE_EVENT/.test(cron),
)
check(
  '2.4 o carimbo de medicao tem nome distinto do de envio',
  /const ATTEMPT_LOST_CANDIDATE_EVENT\s*=\s*'attempt_lost_rescue_candidate'/.test(cron)
  && /const ATTEMPT_LOST_EVENT\s*=\s*'attempt_lost_rescue_sent'/.test(cron),
)
check(
  '2.5 a rodada informa quantos RECEBERIAM',
  /attemptsLostWouldSend/.test(cron) && /attemptsLostWouldSend\s*\+=\s*1/.test(cron),
)

// ── 3. MEDIR NÃO PODE QUEIMAR A COORTE ──────────────────────────────────────
// Esta é a armadilha central do commit. Enquanto o envio está desligado a fase
// grava uma linha por candidato; se o dedupe "uma vez por pessoa, para sempre"
// contasse a LINHA em vez do ENVIO, todo mundo medido hoje ficaria queimado e a
// carta continuaria sem sair no dia em que o interruptor fosse ligado.
check(
  '3.1 o dedupe por pessoa exige sent=true, nao a mera existencia da linha',
  /\.eq\(\s*'name'\s*,\s*ATTEMPT_LOST_EVENT\s*\)[\s\S]{0,200}?\.eq\(\s*'metadata->>sent'\s*,\s*'true'\s*\)/.test(cron),
)
check(
  '3.2 o dedupe por pessoa NAO conta o carimbo de medicao',
  !/\.eq\(\s*'name'\s*,\s*ATTEMPT_LOST_CANDIDATE_EVENT\s*\)[\s\S]{0,200}?count/.test(cron),
)

// ── 4. A CARTA CONTINUA VERDADEIRA ──────────────────────────────────────────
// Ela afirma "nothing was ever made — and nothing was charged". Quem viu uma
// tela de erro já foi avisado, e por outra campanha.
check(
  '4.1 existe a lista de eventos que provam que a pessoa foi avisada',
  /const ATTEMPT_ERROR_EVENTS\s*=\s*\[\s*'generation_stage_error'\s*,\s*'video_generation_failed'\s*\]/.test(cron),
)
check(
  '4.2 quem teve erro explicito e excluido da coorte',
  /\.in\(\s*'name'\s*,\s*ATTEMPT_ERROR_EVENTS[\s\S]{0,120}?\.gte\(\s*'created_at'/.test(cron),
)
check(
  '4.3 a exclusao por erro e fail-closed (leitura que falha nao vira carta)',
  /if\s*\(\s*avisadoErr\s*\|\|\s*\(\s*avisado\s*\?\?\s*0\s*\)\s*>\s*0\s*\)\s*continue/.test(cron),
)
check(
  '4.4 a copy da carta NAO mudou',
  cronRaw.includes('The tab closed before our engine picked the job up')
  && cronRaw.includes('Your film never started — one click to make it'),
)
check(
  '4.5 quem ja recebeu um filme continua fora da coorte',
  /\.from\('videos'\)[\s\S]{0,240}?\.eq\('status',\s*'completed'\)/.test(cron),
)
check(
  '4.6 opt-out e conta interna/descartavel continuam fora',
  /prof\?\.email_opted_out\s*\|\|\s*isInternalOrJunkEmail\(email\)/.test(cron),
)

// ── 5. O CUSTO POR RODADA NÃO EXPLODIU ──────────────────────────────────────
// Com o envio desligado, um teto que contasse ENVIO deixaria o laço varrer os
// 200 candidatos fazendo 4 consultas cada, de 15 em 15 minutos.
check(
  '5.1 o teto por rodada conta candidatos EXAMINADOS',
  /if\s*\(\s*examinados\s*>=\s*MAX_ATTEMPT_LOST_PER_RUN\s*\)\s*break/.test(cron),
)
check(
  '5.2 o contador de examinados e incrementado antes das consultas caras',
  /examinados\s*\+=\s*1/.test(cron),
)
check(
  '5.3 o teto por rodada continua existindo',
  /const MAX_ATTEMPT_LOST_PER_RUN\s*=\s*\d+/.test(cron),
)

// ── 6. A JANELA E O CRON CONTINUAM DE PÉ ────────────────────────────────────
check(
  '6.1 piso de 20 min e teto de 24h intactos',
  /ATTEMPT_LOST_MIN_AGE_MS\s*=\s*20\s*\*\s*60\s*\*\s*1000/.test(cron)
  && /ATTEMPT_LOST_MAX_AGE_MS\s*=\s*24\s*\*\s*60\s*\*\s*60\s*\*\s*1000/.test(cron),
)
check(
  '6.2 o cron continua agendado (a fase roda sozinha)',
  /"path":\s*"\/api\/cron\/finish-stranded-renders"/.test(ler('vercel.json')),
)
check(
  '6.3 fail-closed do lote de dedupe por geracao continua',
  /if\s*\(settledErr\)\s*throw new Error/.test(cron),
)

console.log(`\n${fail === 0 ? '✅' : '❌'} ${ok} verdes, ${fail} vermelhas`)
if (fail > 0) {
  console.error('\nFalhas:')
  for (const f of falhas) console.error(`  · ${f}`)
  process.exit(1)
}
