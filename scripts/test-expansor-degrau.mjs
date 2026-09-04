#!/usr/bin/env node
// ═══ KINEO-EXPANSOR-DEGRAU-2026-09-03 ══════════════════════════════════════
//
// O DEFEITO QUE ESTE TESTE TRANCA: o expansor recusava um roteiro que o
// renderizador aceitaria. Desde o #1 desta sprint (6c822b36, em produção) o
// servidor DESCE o alvo sozinho a partir de 60% de cobertura, antes do custo:
// um roteiro de 30,4s vira um filme de 30s para quem pediu 35s. O expansor
// continuava exigindo encher os 35s exatos e devolvia `growth_limit` —
// frase vermelha, nenhum botão — para texto que o render entregaria.
//
// CASOS REAIS (events.script_expand_failed, contas externas, medidos 03/09
// 22:08 BRT):
//   · mehmetcakoglu   03/09 22:45 chatgpt.com  base 13s · teto 77  · cand. 96  · candidate_fits=true
//   · sohamughade96   03/09 05:57 taaft        base 19s · teto 107 · cand. 114 · candidate_fits=true
//   · livehigorxly    02/09 01:19 chatgpt.com  base 33s · teto 187 · cand. 230 · candidate_fits=true
//
// EXECUTA as funções reais (lib/expandPolicy.ts + lib/narrationFit.ts +
// lib/scriptParser.ts compiladas com o tsc do repo) e LÊ o route.ts real para
// provar que a rota chama o veredito. Sem rede, sem banco, sem custo.
//
// Rodar:  node scripts/test-expansor-degrau.mjs

import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const saida = mkdtempSync(join(tmpdir(), 'kineo-degrau-'))
const requerer = createRequire(join(saida, 'x.cjs'))

execFileSync(
  process.execPath,
  [
    join(raiz, 'node_modules', 'typescript', 'bin', 'tsc'),
    join(raiz, 'lib', 'expandPolicy.ts'),
    join(raiz, 'lib', 'narrationFit.ts'),
    join(raiz, 'lib', 'scriptParser.ts'),
    '--outDir', saida, '--module', 'commonjs', '--target', 'es2022',
    '--moduleResolution', 'node', '--skipLibCheck',
  ],
  { stdio: 'pipe' },
)
writeFileSync(join(saida, 'package.json'), JSON.stringify({ type: 'commonjs' }))

const P = requerer(join(saida, 'expandPolicy.js'))
const N = requerer(join(saida, 'narrationFit.js'))
const { parseUserScript } = requerer(join(saida, 'scriptParser.js'))

let falhas = 0
const linhas = []
function checa(nome, cond, detalhe = '') {
  linhas.push({ nome, ok: !!cond, detalhe })
  if (!cond) falhas += 1
}

// ── Fábrica de texto com contagem de palavras EXATA ────────────────────────
// Frases de 8 palavras terminadas em ponto. A régua conta PALAVRAS (não
// caracteres), então o número de palavras é o que decide tudo aqui.
// DOIS VOCABULARIOS DISJUNTOS de proposito: a fala do AUTOR e a que a IA
// acrescenta. Na 1a versao deste teste os dois saiam do mesmo pool e as frases
// "da IA" eram IDENTICAS as do autor — a tesoura as preservava como frases do
// autor, nao cortava nada, e tres casos falhavam por um defeito do TESTE.
const PAL_AUTOR = ['gold', 'river', 'stone', 'valley', 'engine', 'harbor', 'lantern', 'copper', 'signal', 'anchor']
const PAL_IA = ['tundra', 'basalt', 'ember', 'kelp', 'quartz', 'monsoon', 'ridge', 'plume', 'ferry', 'cinder']
function frase(pool, i, n = 8) {
  const p = []
  for (let k = 0; k < n; k++) p.push(pool[(i * 3 + k * 7 + 1) % pool.length])
  return p.join(' ').replace(/^./, (c) => c.toUpperCase()) + '.'
}
function comPool(pool, palavras, deslocamento = 0) {
  const frases = []
  let usado = 0
  let i = deslocamento
  while (usado + 8 <= palavras) { frases.push(frase(pool, i++)); usado += 8 }
  if (palavras - usado > 0) frases.push(frase(pool, i++, palavras - usado))
  return frases.join(' ')
}
/** Fala do AUTOR. */
const texto = (palavras, deslocamento = 0) => comPool(PAL_AUTOR, palavras, deslocamento)
/** Material NOVO, que a IA acrescentou — nenhuma frase colide com a do autor. */
const textoIA = (palavras, deslocamento = 0) => comPool(PAL_IA, palavras, deslocamento)
const contar = (t) => t.trim().split(/\s+/).filter(Boolean).length

checa('a fábrica de texto conta palavras de verdade', contar(texto(31)) === 31, String(contar(texto(31))))
checa('a régua é 2,3 palavras/segundo', N.WORDS_PER_SECOND === 2.3, String(N.WORDS_PER_SECOND))
checa('a cobertura mínima é 95%', N.MIN_COVERAGE === 0.95, String(N.MIN_COVERAGE))

// ── Reprodução do caminho REAL da rota ─────────────────────────────────────
// Mesma aritmética do app/api/expand-script/route.ts: orçamento, apara,
// veredito. Se a rota mudar a fórmula, este teste deixa de reproduzi-la — por
// isso a bateria 9 lê o route.ts e cobra as duas coisas juntas.
function rodada({ palavrasAutor, palavrasCandidato, alvo, opts = {} }) {
  const autor = texto(palavrasAutor)
  // O candidato PRESERVA cada frase do autor (Contrato C1) e acrescenta o resto.
  const candidato = autor + ' ' + textoIA(palavrasCandidato - palavrasAutor, 40)
  const falaAutor = parseUserScript(autor).narration || autor
  const speechBase = N.speechSeconds(falaAutor)
  const teto = P.maxCandidateWords(speechBase)
  const depois = N.narrationFit(parseUserScript(candidato).narration || candidato, alvo)
  const orcamento = Math.min(teto, Math.ceil(alvo * N.WORDS_PER_SECOND) + 8)
  const cortado = P.trimCandidateToBudget(candidato, falaAutor, orcamento)
  const falaCortada = parseUserScript(cortado).narration || cortado
  const veredito = P.judgeTrimmedCandidate(Object.assign({
    originalRaw: autor,
    originalSpeech: falaAutor,
    trimmedRaw: cortado,
    trimmedSpeech: falaCortada,
    baseSpeechSeconds: speechBase,
    targetSeconds: alvo,
  }, opts))
  return {
    autor, candidato, cortado, falaCortada, speechBase, teto, orcamento, veredito,
    estouraTeto: !P.withinGrowthLimit(speechBase, depois.speech),
    candidatoEnche: depois.ok,
    aparadoEnchia: N.narrationFit(falaCortada, alvo).ok,
    palavrasCortado: contar(falaCortada),
  }
}

// ═══ 1. mehmetcakoglu — 03/09 22:45, o caso que ainda acontecia hoje ═══════
const mehmet = rodada({ palavrasAutor: 31, palavrasCandidato: 96, alvo: 35 })
checa('mehmet: teto do banco confere (77 palavras)', mehmet.teto === 77, 'teto=' + mehmet.teto)
checa('mehmet: o candidato de 96 palavras ENCHE os 35s (candidate_fits=true)', mehmet.candidatoEnche === true)
checa('mehmet: o candidato ESTOURA o teto de 2,5x (era o growth_limit)', mehmet.estouraTeto === true)
checa(
  'mehmet: a apara sozinha NAO enchia os 35s — a janela tinha meia palavra',
  mehmet.aparadoEnchia === false,
  'aparado=' + mehmet.palavrasCortado + ' palavras, precisava ' + Math.ceil(0.95 * 35 * 2.3),
)
checa(
  'mehmet: AGORA e aceito, pela duracao que o render vai usar',
  mehmet.veredito.accepted === true && mehmet.veredito.reason === 'fits_lower_duration',
  mehmet.veredito.reason,
)
checa(
  'mehmet: o filme prometido e de 30s (multiplo de 5, para baixo)',
  mehmet.veredito.effectiveSeconds === 30,
  mehmet.veredito.effectiveSeconds + 's',
)
checa(
  'mehmet: o teto de 2,5x foi respeitado no texto aceito',
  P.withinGrowthLimit(mehmet.speechBase, mehmet.veredito.trimmedSpeechSeconds) === true,
)
checa(
  'mehmet: o alvo descido e ENCHIDO de verdade pela regua canonica',
  N.narrationFit(mehmet.falaCortada, mehmet.veredito.effectiveSeconds).ok === true,
)
checa(
  'mehmet: cada frase do autor sobreviveu (Contrato C1)',
  P.authorPreserved(parseUserScript(mehmet.autor).narration || mehmet.autor, mehmet.falaCortada).ok === true,
)
checa(
  'mehmet: o texto aceito e MAIOR que o dele (expansao de verdade)',
  mehmet.veredito.trimmedSpeechSeconds > mehmet.speechBase,
)

// ═══ 2. sohamughade96 — 03/09 05:57, taaft ════════════════════════════════
const soham = rodada({ palavrasAutor: 43, palavrasCandidato: 114, alvo: 35 })
checa('soham: teto do banco confere (107 palavras)', soham.teto === 107, 'teto=' + soham.teto)
checa('soham: o candidato ENCHE os 35s', soham.candidatoEnche === true)
checa('soham: o candidato ESTOURA o teto', soham.estouraTeto === true)
checa('soham: agora e aceito', soham.veredito.accepted === true, soham.veredito.reason)
checa(
  'soham: entrega >=30s (nunca abaixo do piso hollywood)',
  soham.veredito.effectiveSeconds >= 30,
  soham.veredito.effectiveSeconds + 's',
)

// ═══ 3. livehigorxly — 02/09 01:19, 60s ═══════════════════════════════════
const higor = rodada({ palavrasAutor: 75, palavrasCandidato: 230, alvo: 60 })
checa('higor: teto do banco confere (187 palavras)', higor.teto === 187, 'teto=' + higor.teto)
checa('higor: o candidato de 230 palavras ENCHE os 60s', higor.candidatoEnche === true)
checa('higor: o candidato ESTOURA o teto', higor.estouraTeto === true)
checa('higor: agora e aceito', higor.veredito.accepted === true, higor.veredito.reason)

// ═══ 4. O TETO DE 2,5x NAO AFROUXOU — a trava que o fundador exigiu ═══════
checa('MAX_GROWTH_FACTOR continua 2,5x', P.MAX_GROWTH_FACTOR === 2.5, String(P.MAX_GROWTH_FACTOR))
{
  const autor = texto(20)
  const falaAutor = parseUserScript(autor).narration || autor
  const gigante = autor + ' ' + textoIA(200, 40)
  const v = P.judgeTrimmedCandidate({
    originalRaw: autor, originalSpeech: falaAutor,
    trimmedRaw: gigante, trimmedSpeech: gigante,
    baseSpeechSeconds: N.speechSeconds(falaAutor), targetSeconds: 60,
  })
  checa('acima do teto continua recusado, mesmo enchendo o alvo', v.accepted === false && v.reason === 'over_cap', v.reason)
  checa('e o diagnostico diz que o teto foi o motivo', v.withinCap === false)
}

// ═══ 5. CONTRATO C1 — frase do autor mexida continua reprovando ═══════════
{
  const autor = texto(31)
  const falaAutor = parseUserScript(autor).narration || autor
  const reescrito = textoIA(31, 99) + ' ' + textoIA(40, 40)
  const v = P.judgeTrimmedCandidate({
    originalRaw: autor, originalSpeech: falaAutor,
    trimmedRaw: reescrito, trimmedSpeech: reescrito,
    baseSpeechSeconds: N.speechSeconds(falaAutor), targetSeconds: 35,
  })
  checa('autor reescrito continua recusado', v.accepted === false && v.reason === 'author_rewritten', v.reason)
  checa('e o diagnostico aponta o autor', v.authorOk === false)
}

// ═══ 6. ESTRUTURA — HOOK comido continua reprovando ═══════════════════════
{
  const corpo = texto(31)
  const autor = 'HOOK: ' + corpo
  const falaAutor = parseUserScript(autor).narration || autor
  const semHook = corpo + ' ' + textoIA(40, 40)
  const v = P.judgeTrimmedCandidate({
    originalRaw: autor, originalSpeech: falaAutor,
    trimmedRaw: semHook, trimmedSpeech: semHook,
    baseSpeechSeconds: N.speechSeconds(falaAutor), targetSeconds: 35,
  })
  checa('marcador estrutural perdido continua recusado', v.accepted === false && v.reason === 'structure_lost', v.reason)
}

// ═══ 7. SEM PROMESSA FALSA ABAIXO DO PISO ═════════════════════════════════
{
  // Fala de ~26s: floor(26/5)*5 = 25 < piso hollywood 30 ⇒ recusa.
  const autor = texto(24)
  const falaAutor = parseUserScript(autor).narration || autor
  const cand = autor + ' ' + textoIA(36, 40)
  const v = P.judgeTrimmedCandidate({
    originalRaw: autor, originalSpeech: falaAutor,
    trimmedRaw: cand, trimmedSpeech: cand,
    baseSpeechSeconds: N.speechSeconds(falaAutor), targetSeconds: 35,
  })
  checa(
    'fala que so daria 25s NAO vira promessa (piso hollywood 30s)',
    v.accepted === false && v.reason === 'too_short_even_lower',
    v.reason + ' · fala=' + v.trimmedSpeechSeconds.toFixed(1) + 's',
  )
  const comPisoClassico = P.judgeTrimmedCandidate({
    originalRaw: autor, originalSpeech: falaAutor,
    trimmedRaw: cand, trimmedSpeech: cand,
    baseSpeechSeconds: N.speechSeconds(falaAutor), targetSeconds: 35,
    floorSeconds: N.AUTOFIT_DOWN_FLOOR_SECONDS,
  })
  checa(
    'com o piso classico (20s) o mesmo caso passaria — o padrao e o estrito',
    comPisoClassico.accepted === true && comPisoClassico.effectiveSeconds === 25,
    comPisoClassico.reason + ' · ' + comPisoClassico.effectiveSeconds + 's',
  )
}

// ═══ 8. A REVERSAO EXISTE E FUNCIONA ══════════════════════════════════════
{
  const desligado = rodada({ palavrasAutor: 31, palavrasCandidato: 96, alvo: 35, opts: { floorSeconds: 10000 } })
  checa(
    'floorSeconds altissimo desliga o resgate inteiro (volta ao 422 de hoje)',
    desligado.veredito.accepted === false,
    desligado.veredito.reason,
  )
}

// ═══ 9. QUEM CHAMA — o route.ts REAL, nao a minha reproducao ══════════════
const rota = readFileSync(join(raiz, 'app', 'api', 'expand-script', 'route.ts'), 'utf8')
checa('a rota importa o veredito', /judgeTrimmedCandidate,/.test(rota))
checa('a rota CHAMA o veredito', /const veredito = judgeTrimmedCandidate\(\{/.test(rota))
checa('a rota passa a base do teto para o veredito', /baseSpeechSeconds: speechBase/.test(rota))
checa('a rota passa o alvo pedido', /targetSeconds: target/.test(rota))
checa('a rota so aceita com veredito.accepted', /if \(veredito\.accepted\)/.test(rota))
checa('a rota guarda a duracao efetiva', /duracaoEfetiva = veredito\.effectiveSeconds/.test(rota))
checa(
  'a rota marca a descida so quando foi descida',
  /descidoPeloRender = veredito\.reason === 'fits_lower_duration'/.test(rota),
)
checa('a resposta carrega effectiveDuration', /effectiveDuration: duracaoEfetiva/.test(rota))
checa('a resposta carrega autofitDown', /autofitDown: descidoPeloRender/.test(rota))
checa(
  'stillShort passou a contar a descida (senao o botao nao aparece)',
  /stillShort: !\(depois\.ok \|\| descidoPeloRender\)/.test(rota),
)
checa(
  'expanded_ready passou a contar a descida',
  /outcome: \(depois\.ok \|\| descidoPeloRender \? 'expanded_ready' : 'still_short'\)/.test(rota),
)
checa('o 422 de growth_limit passou a dizer POR QUE a apara falhou', /trimAttempt: aparaRecusada/.test(rota))
checa(
  'o veredito e consultado ANTES do 422 de growth_limit',
  rota.indexOf('judgeTrimmedCandidate({') > 0 &&
    rota.indexOf('judgeTrimmedCandidate({') < rota.indexOf("outcome: 'growth_limit'"),
)
checa(
  'o teto continua sendo cobrado na rota (a linha do growth_limit nao sumiu)',
  /if \(!withinGrowthLimit\(speechBase, depois\.speech\)\) \{/.test(rota),
)
checa(
  'a checagem do autor continua na rota depois do teto',
  rota.indexOf('const preservado = authorPreserved(falaOriginal, falaExpandida)') >
    rota.indexOf("outcome: 'growth_limit'"),
)

// ═══ 10. NAO-REGRESSAO: quem ja enchia o alvo nao muda de caminho ═════════
{
  const autor = texto(60)
  const falaAutor = parseUserScript(autor).narration || autor
  const cand = autor + ' ' + textoIA(23, 40)
  const v = P.judgeTrimmedCandidate({
    originalRaw: autor, originalSpeech: falaAutor,
    trimmedRaw: cand, trimmedSpeech: cand,
    baseSpeechSeconds: N.speechSeconds(falaAutor), targetSeconds: 35,
  })
  checa('quem enche o alvo continua saindo por fits_target', v.accepted === true && v.reason === 'fits_target', v.reason)
  checa('e a duracao efetiva continua sendo a pedida', v.effectiveSeconds === 35, String(v.effectiveSeconds))
}
{
  const autor = texto(40)
  const falaAutor = parseUserScript(autor).narration || autor
  const v = P.judgeTrimmedCandidate({
    originalRaw: autor, originalSpeech: falaAutor,
    trimmedRaw: autor, trimmedSpeech: autor,
    baseSpeechSeconds: N.speechSeconds(falaAutor), targetSeconds: 20,
  })
  checa('texto que nao cresceu nada e recusado como no_growth', v.accepted === false && v.reason === 'no_growth', v.reason)
}

// ── Placar ────────────────────────────────────────────────────────────────
console.log('\nKINEO-EXPANSOR-DEGRAU — o expansor passa a usar a regua do renderizador\n')
for (const l of linhas) {
  console.log((l.ok ? '  ok   ' : '  FALHA') + ' ' + l.nome + (l.detalhe ? '  [' + l.detalhe + ']' : ''))
}
console.log('\n' + (linhas.length - falhas) + '/' + linhas.length + ' verificacoes passaram\n')
process.exit(falhas > 0 ? 1 : 0)
