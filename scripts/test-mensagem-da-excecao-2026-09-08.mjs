#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// KINEO-SOBRENOME-DO-ERRO-2026-09-08 — guardião do #15 da madrugada-produto.
//
// O QUE ESTAVA ERRADO
// `trackGenerationFailure` sempre aceitou `message`, sempre truncou em 200 e
// sempre gravou o campo no evento. Doze `catch` do GenerateClient reportam
// exceção; DEZ deles mandavam só `detail: err.name` e jogavam fora o que a
// exceção disse. Medido no banco em 08/09 sobre a história inteira:
//
//     generation_stage_error ............ 1.929 linhas
//     com metadata->>'message' .............. 24  (1,2%)
//
// E nessas 24 o diagnóstico aparece inteiro: TODO "TypeError" era
// `Failed to fetch` ou `Load failed` — rede/aba arrancada, não bug nosso.
// Sem a mensagem, "TypeError" é indiagnosticável E está na lista de "causa
// antiga" dos vigias do CLAUDE.md: alarme que ninguém consegue fechar.
//
// O QUE ESTE GUARDIÃO TRAVA
// Que qualquer `catch` volte a reportar o NOME da exceção sem o que ela DISSE.
// A âncora é a CONDIÇÃO (todo `detail: err.name` tem um `message:` no mesmo
// objeto), nunca a contagem de ocorrências — se amanhã nascer o 13º catch, ele
// nasce coberto sem ninguém mexer aqui.
//
// Estilo readFileSync/contagem de propósito: guardião com alias `@/` não roda
// (memória `guardioes-com-alias-nao-rodam`), e `assert` morre na 1ª falha.
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const CAMINHO = join(raiz, 'app', '(dashboard)', 'generate', 'GenerateClient.tsx')
const bruto = readFileSync(CAMINHO, 'utf8')

// Contagem NUNCA casa com o comentário que explica o conserto
// (memória: o guardião do #10 ficou vermelho sozinho por isso).
function semComentarios(texto) {
  return texto
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
}
const src = semComentarios(bruto)
const linhas = src.split(/\r?\n/)

let ok = 0
let fail = 0
const falhas = []
function check(nome, condicao) {
  if (condicao) { ok++; console.log(`  ✓ ${nome}`) }
  else { fail++; falhas.push(nome); console.log(`  ✗ ${nome}`) }
}

console.log('\n1. O EMISSOR CONTINUA SABENDO RECEBER E GRAVAR A MENSAGEM')
check('1.1 a assinatura aceita `message?: string`', /extra\?:\s*\{[^}]*message\?:\s*string/.test(src))
check('1.2 a mensagem e truncada em 200 antes de sair do navegador',
  /extra\.message\.trim\(\)\.slice\(0,\s*200\)/.test(src))
check('1.3 o campo `message` viaja no evento generation_stage_error',
  /generation_stage_error[\s\S]{0,2600}?\n\s*message:\s*mensagem,/.test(src))
check('1.4 `error` continua preferindo o detalhe — a troca NAO mexe no histograma antigo',
  /const causa = detalhe \?\?/.test(src))
check('1.5 `error_source` continua separando detail de message',
  /causaOrigem:\s*'detail'\s*\|\s*'message'\s*\|\s*'synthesized'/.test(src))

console.log('\n2. A CONDICAO QUE IMPORTA: NOME SEM MENSAGEM NAO EXISTE MAIS')
// Para cada `detail: err.name`, olhar para a frente ate o fim do objeto de
// `extra` e exigir um `message:` la dentro. Ancorado na CONDICAO, nao no total.
//
// ⚠ ESTA VARREDURA LE O ARQUIVO BRUTO, NAO O `src` SEM COMENTARIOS — e isso
// e o conserto de um furo que a bateria de mutacao pegou em 08/09 antes de
// publicar. `semComentarios()` remove blocos `/* */` que ocupam VARIAS linhas,
// e ao remove-los ele JUNTA linhas: a numeracao deixa de bater e a janela de
// 20 linhas passa a enxergar o `message:` do catch VIZINHO. Resultado medido:
// o mutante que apagava a mensagem de um catch (orfao de verdade, provado por
// grep) devolvia "orfaos: nenhum" — guardiao verde sobre defeito real.
// Aqui a linha de comentario e PULADA, nunca esvaziada.
const linhasBrutas = bruto.split(/\r?\n/)
const ehComentario = (l) => /^\s*(\/\/|\/\*|\*)/.test(l)
const ALVO = /^(\s*)detail: err instanceof Error \? err\.name : 'unknown',$/
const orfaos = []
let totalNome = 0
for (let i = 0; i < linhasBrutas.length; i++) {
  if (!ALVO.test(linhasBrutas[i])) continue
  totalNome++
  let temMessage = false
  for (let j = i + 1; j < Math.min(i + 20, linhasBrutas.length); j++) {
    const N = linhasBrutas[j]
    if (ehComentario(N)) continue
    if (/^\s*\}\)?,?\s*$/.test(N) || /^\s*\)/.test(N)) break
    if (/^\s*message:/.test(N)) { temMessage = true; break }
  }
  if (!temMessage) orfaos.push(i + 1)
}
check(`2.1 existe pelo menos um catch reportando err.name (achados: ${totalNome})`, totalNome >= 10)
check(`2.2 NENHUM err.name viaja sem message (orfaos: ${orfaos.join(', ') || 'nenhum'})`, orfaos.length === 0)

// A forma da mensagem tem de ser a mesma nos dois lados do `instanceof`:
// `String(err)` cobre o throw que nao e Error (string, objeto do fornecedor).
const FORMA = /message: err instanceof Error \? err\.message\.slice\(0, 200\) : String\(err\)\.slice\(0, 200\),/g
const comForma = (src.match(FORMA) || []).length
check(`2.3 toda mensagem de excecao usa a MESMA forma, com fallback String(err) (${comForma})`, comForma >= 10)
check('2.4 nenhuma mensagem de excecao vai sem truncar', !/message: err instanceof Error \? err\.message,/.test(src))

console.log('\n3. OS DOIS CATCH QUE JA ESTAVAM CERTOS CONTINUAM CERTOS')
check('3.1 generate_script_threw continua mandando os dois campos',
  /trackGenerationFailure\('scripting', 'generate_script_threw', \{[\s\S]{0,400}?detail:[\s\S]{0,300}?message:/.test(src))
check('3.2 analyze_threw continua mandando os dois campos',
  /'analyze_timeout_50s' : 'analyze_threw'[\s\S]{0,900}?message: err instanceof Error/.test(src))

console.log('\n4. OS CATCH QUE ESTAVAM CEGOS E QUE A MEDICAO ACUSOU')
// fast_threw e o que falhou HOJE (08/09 10:36 UTC, 121s de relogio, TypeError
// pelado); broll_plan_threw_autopilot e compose_threw sao os outros dois com
// linha real no banco nos ultimos 14 dias.
for (const [nome, marca] of [
  ['4.1 fast_threw', "trackGenerationFailure('generating', 'fast_threw', {"],
  ['4.2 broll_plan_threw_autopilot', "trackGenerationFailure('broll_planning', 'broll_plan_threw_autopilot', {"],
  ['4.3 compose_threw', "trackGenerationFailure('clips_ready', 'compose_threw', {"],
]) {
  const i = src.indexOf(marca)
  const trecho = i >= 0 ? src.slice(i, i + 700) : ''
  check(`${nome} manda a mensagem junto do nome`,
    i >= 0 && /detail: err instanceof Error/.test(trecho) && /message: err instanceof Error/.test(trecho))
}

console.log('\n5. A RAZAO FICA ESCRITA ONDE QUEM MEXER VAI LER')
check('5.1 a ancora KINEO-SOBRENOME-DO-ERRO-2026-09-08 esta no arquivo',
  bruto.includes('KINEO-SOBRENOME-DO-ERRO-2026-09-08'))
check('5.2 o comentario diz o numero medido (1.929 / 24), nao "muitos"',
  /1\.929/.test(bruto) && /24 com mensagem|24 com|só 24/.test(bruto))
check('5.3 o comentario nomeia este guardiao, para o proximo achar a trava',
  bruto.includes('test-mensagem-da-excecao-2026-09-08'))

// 5.4 — TRAVA DE PREMISSA. Este conserto so vale enquanto `message` for um
// campo do evento e nao virar, por exemplo, `error_message`. Se alguem
// renomear, esta linha fica vermelha e obriga a revisitar a escolha em vez de
// herda-la (memoria `comentario-que-justifica-envelhece`).
check('5.4 premissa: o campo do evento ainda se chama `message`', /\n\s*message: mensagem,/.test(src))

console.log(`\n${fail === 0 ? '✅' : '❌'} ${ok} verdes, ${fail} vermelhas`)
if (fail > 0) {
  console.error('\nFalhas:')
  for (const f of falhas) console.error(`  · ${f}`)
  process.exit(1)
}
