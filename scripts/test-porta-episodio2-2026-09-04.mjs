#!/usr/bin/env node
/**
 * sprint-retencao #2 — 04/09/2026 — A PORTA DO EPISODIO 2 ESTAVA NO RODAPE
 *
 * O QUE ESTE TESTE PROTEGE, E POR QUE:
 *
 * Medido em 04/09 (30 dias, contas externas): 413 pessoas chegaram na tela de
 * filme pronto. 382 receberam a prateleira de tema NOVO (`next_shorts_shown`,
 * 93%) e apenas 49 chegaram a VER o botao de continuar a PROPRIA historia
 * (`series_continue_seen`, 12%) — ele mora depois do player, do download, do
 * painel de compartilhar e do bloco do YouTube. E continuar e o que preve
 * pagamento: 58 cliques em 30d viraram 30 filmes em 24h (52%), contra ~19% de
 * segundo filme na base. A regua da casa: 1 filme = 0,3% de pagantes; 4o
 * filme = 15%.
 *
 * Junto, o caso vivo de 04/09 (pessoa d20530865c): primeiro filme no Seedance
 * (15cr), sobraram 10, clicou continuar as 10:45 e as 10:51 levou
 * `upgrade_modal_opened` reason=trial_spent com 10 creditos na mao. A
 * continuacao herdava o MOTOR do episodio 1 e nao herdava a pergunta "o saldo
 * ainda paga esse motor?".
 *
 * AS QUATRO COISAS QUE ESTE TESTE TRANCA:
 *   1. o link continua BYTE A BYTE o de hoje quando ninguem passa motor — a
 *      mudanca e aditiva, e as 8 chamadas antigas nao mudam de destino;
 *   2. a porta nova existe DENTRO do primeiro viewport (logo depois do
 *      download) e NAO no rodape, e o download continua sendo a acao entregue
 *      primeiro (KINEO-DELIVER-FIRST-2026-07-30, que foi medida e nao se
 *      reverte por hipotese);
 *   3. o desvio para o motor gratis FALHA FECHADA: sem prova de que o saldo
 *      nao cobre, de que o Kineo 1 custa 0 nesta conta e de que a vaga da cota
 *      esta livre, a porta nao promete nada (a disciplina da rodada #16);
 *   4. a trava de qualidade do fundador (03/09 23:40) continua intacta: nada
 *      de compose/hollywood/cinematic/broll/narrationFit/analyze-idea/
 *      generate-script foi tocado.
 *
 * FALSIFICACOES RODADAS DE VERDADE antes do commit (cada uma aplicada no
 * arquivo real, teste executado, arquivo restaurado — 5 mutacoes, 5 quedas,
 * nenhuma passou despercebida):
 *   1. tirar o `if (engine)` do href (sempre escrever o parametro)
 *        -> caem 1.2, 1.3, 1.4 e 1.4b
 *   2. trocar `episode2QuotaKnown` por `true`            -> cai 3.6
 *   3. tirar `!freeFastQuotaSpent` da condicao            -> cai 3.5
 *   4. tirar a frase da marca d agua da copy do ramo free -> caem 4.2 e 4.2b
 *   5. passar 'fast' fixo no onClick em vez do derivado
 *        -> caem 2.2, 2.3, 2.8, 3.7, 4.1, 4.2 e 4.2b
 * A sexta que eu queria rodar — mover o botao para depois do bloco do YouTube
 * — e um recorte estrutural que nao se faz com troca de texto; o que a
 * substitui e a checagem 2.3, que compara a POSICAO no arquivo e nao a
 * existencia do botao.
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

const series = loadTs('lib/seriesContinuation.ts')
const engineCost = loadTs('lib/credits/engineCost.ts')
const client = read('app/(dashboard)/generate/GenerateClient.tsx')
const SEED = 'The lake that turns animals to stone'

// ───────────────────────────────────────────────────────────────────────────
// 1. O LINK: ADITIVO. QUEM JA CHAMAVA NAO MUDA DE DESTINO.
// ───────────────────────────────────────────────────────────────────────────
const semMotor = series.buildSeriesContinuationHref(SEED, 'done_screen')
const semMotorTop = series.buildSeriesContinuationHref(SEED, 'done_screen_top')
ok(semMotor.startsWith('/studio/create?'), '1.1 o destino continua /studio/create')
ok(!semMotor.includes('engine='), '1.2 sem opts, NENHUM engine entra no link — as 8 chamadas antigas nao mudam')
ok(!series.buildSeriesContinuationHref(SEED, 'done_screen', {}).includes('engine='),
  '1.3 opts vazio tambem nao inventa motor')
ok(!series.buildSeriesContinuationHref(SEED, 'done_screen', { engine: null }).includes('engine='),
  '1.4 engine null nao escreve o parametro (falha fechada)')
ok(!series.buildSeriesContinuationHref(SEED, 'done_screen', { engine: '   ' }).includes('engine='),
  '1.4b engine em branco nao escreve o parametro')
const comMotor = series.buildSeriesContinuationHref(SEED, 'done_screen_top', { engine: 'fast' })
ok(comMotor.includes('engine=fast'), '1.5 com prova, o link carrega engine=fast')
ok(series.buildSeriesContinuationHref(SEED, 'done_screen_top', { engine: 'FAST' }).includes('engine=fast'),
  '1.5b o motor e normalizado para minusculo — o consumidor da tela faz toLowerCase()')
ok(comMotor.includes('continuation_source=done_screen_top'), '1.6 a fonte nova viaja no link')
ok(semMotorTop.includes('series=1') && semMotorTop.includes('autoanalyze=1'),
  '1.7 a porta de cima carrega o mesmo contrato de serie da porta de baixo')
equal(series.buildSeriesContinuationHref('', 'done_screen_top', { engine: 'fast' }), '/studio',
  '1.8 sem tema nao ha continuacao — e o motor nao vaza para o fallback')
ok(comMotor.split('engine=').length === 2, '1.9 o parametro entra UMA vez')

// ───────────────────────────────────────────────────────────────────────────
// 2. O LUGAR: PRIMEIRO VIEWPORT, DEPOIS DO DOWNLOAD. NAO NO RODAPE.
// ───────────────────────────────────────────────────────────────────────────
// Os indices sao procurados A PARTIR do botao de download, nao do inicio do
// arquivo: 'Push #317' e '<NextShortsSection' aparecem antes, em comentarios e
// em outra tela, e um indexOf ingenuo mediria a ordem errada.
const iDownload = client.indexOf('Download my Short (')
const iPortaTopo = client.indexOf("'done_screen_top', publicVideoId, episode2Engine", iDownload)
const iPortaRodape = client.indexOf("handleContinueSeries(analysis?.title ?? prompt, 'done_screen'", iDownload)
const iYoutube = client.indexOf('{/* Push #317 — YouTube upload: connect or post directly */}', iDownload)
const iPrateleira = client.indexOf('<NextShortsSection', iDownload)
const iBlocoPorta = client.indexOf('sprint-retencao #2 — a porta do episodio 2, no primeiro', iDownload)
const iFimPorta = client.indexOf('</button>', iPortaTopo)
const blocoPorta = client.slice(iBlocoPorta, iFimPorta + 9)
ok(iDownload > 0, '2.1 o botao de download continua na tela')
ok(iPortaTopo > 0, '2.2 a porta do episodio 2 existe na tela de filme pronto')
ok(iPortaTopo > iDownload && iPortaTopo < iYoutube,
  '2.3 ela nasce DEPOIS do download e ANTES do bloco do YouTube — primeiro viewport')
ok(iPortaTopo < iPortaRodape, '2.4 a porta de cima vem antes da porta antiga do rodape')
ok(iPortaTopo < iPrateleira, '2.5 e antes da prateleira de tema NOVO, que hoje alcanca 93%')
ok(iPortaRodape > 0, '2.6 a porta antiga NAO foi removida — as duas fontes convivem para comparacao')
ok(client.indexOf('KINEO-DELIVER-FIRST-2026-07-30') > 0 && client.indexOf('KINEO-DELIVER-FIRST-2026-07-30') < iDownload,
  '2.7 a decisao DELIVER-FIRST continua governando a ordem: entregar antes de convidar')
ok(/watermarkedDownloadConfirmed[\s\S]{0,400}linear-gradient\(135deg, #2997ff/.test(
  blocoPorta),
  '2.8 a porta so ganha peso de acao PRINCIPAL depois que o arquivo esta na mao')

// ───────────────────────────────────────────────────────────────────────────
// 3. O MOTOR: A REGRA FALHA FECHADA
// ───────────────────────────────────────────────────────────────────────────
const bloco = client.slice(client.indexOf('const episode2Seed'), client.indexOf('const nextEpisodeTopBtnRef'))
ok(bloco.includes('selectedUnaffordable'), '3.1 so desvia quando o saldo NAO cobre o motor herdado')
ok(bloco.includes("creditCostForDuration('fast', isPaidAccount, duration)"),
  '3.2 o custo do motor gratis vem da MESMA funcao que o servidor usa para cobrar')
ok(bloco.includes('episode2FreeCost === 0'),
  '3.3 e so desvia se o Kineo 1 realmente custar ZERO nesta conta')
ok(bloco.includes('episode2QuotaKnown'), '3.4 vaga DESCONHECIDA nao autoriza promessa nenhuma')
ok(bloco.includes('!freeFastQuotaSpent'), '3.5 vaga GASTA nao autoriza promessa nenhuma')
ok(/const episode2QuotaKnown = freeFastUsedInWindow !== null/.test(bloco),
  '3.6 "conhecida" e literalmente "o contador existe", nao um palpite')
ok(client.includes("'done_screen_top', publicVideoId, episode2Engine)"),
  '3.7 o clique passa o motor DERIVADO, nunca um literal')
ok(/episode2Engine: 'fast' \| null/.test(bloco),
  '3.8 o unico desvio possivel e o Kineo 1 — a porta nao inventa motor caro')
ok(bloco.includes('inherited_fits') && bloco.includes('unknown_quota') && bloco.includes('free_quota_used'),
  '3.9 os motivos de NAO desviar sao nomeados, para a proxima rodada nao adivinhar')

// ───────────────────────────────────────────────────────────────────────────
// 4. A COPY DIZ A VERDADE INTEIRA
// ───────────────────────────────────────────────────────────────────────────
// So o bloco da porta nova — o trecho ate o YouTube contem o painel de
// compartilhar e a oferta de plano, que nao sao desta jogada.
const copy = blocoPorta
ok(copy.includes('Episode 2 of this story'), '4.1 a porta se chama pelo que ela faz')
ok(/renders on Kineo 1[\s\S]{0,120}watermark/.test(copy),
  '4.2 o ramo gratis diz, na MESMA frase, que o filme sai com marca d agua')
ok(/free on your account/.test(copy),
  '4.2b e diz que e de graca NA CONTA DELA — nao "de graca" no ar')
ok(!/priority|1080p|premium|unlimited/i.test(copy),
  '4.3 nenhuma promessa que o produto nao cumpre entrou junto')
ok(!/\$|USD|price|per month/i.test(copy), '4.4 a porta nao vende plano nem cita preco')

// ───────────────────────────────────────────────────────────────────────────
// 5. A MEDICAO NASCE JUNTO COM A JOGADA
// ───────────────────────────────────────────────────────────────────────────
ok(client.includes("source: 'done_screen_top'"),
  '5.1 a impressao da porta de cima tem fonte propria — comparavel com done_screen')
ok(/engine_offered: episode2Engine/.test(client), '5.2 a impressao registra o motor oferecido')
ok(/engine_reason: episode2EngineReason/.test(client), '5.3 e o motivo de nao ter desviado')
ok(/engine: engine \?\? null/.test(client), '5.4 o CLIQUE tambem carrega o motor')
const iImpressao = client.indexOf("source: 'done_screen_top'")
const impressao = client.slice(iImpressao - 400, iImpressao + 900)
ok(/seconds_after_ready/.test(impressao),
  '5.5 e quantos segundos depois do "pronto" a porta entrou na tela')
ok(client.includes('threshold: 0.5'),
  '5.6 impressao so conta quando METADE do botao entra no viewport — o mesmo contrato da porta antiga')
ok(/observed,/.test(impressao),
  '5.7 navegador sem IntersectionObserver marca observed:false em vez de sumir da serie')

// ───────────────────────────────────────────────────────────────────────────
// 6. A TRAVA DE QUALIDADE DO FUNDADOR (03/09 23:40) CONTINUA INTACTA
// ───────────────────────────────────────────────────────────────────────────
// Esta jogada tocou DOIS arquivos: lib/seriesContinuation.ts (o link) e
// GenerateClient.tsx (a tela). Nenhum dos dois pode passar a conhecer o
// pipeline que faz o filme — se um dia alguem importar dali, esta secao cai.
const cont = read('lib/seriesContinuation.ts')
const pipeline = ['lib/compose', 'lib/hollywood', 'lib/cinematic', 'lib/broll', 'lib/narrationFit', 'lyriaMusic']
for (const mod of pipeline) {
  ok(!cont.includes(mod), '6.0 o modulo do link nao importa nem cita ' + mod)
}
ok(!client.includes("from '@/lib/compose'"), '6.0b a tela nao importa o motor de composicao')
// A tela JA importava a regua de narracao antes desta jogada (MIN_COVERAGE e
// speechSeconds, para desenhar o aviso de cobertura). O que esta jogada nao
// pode fazer e USAR a regua: a porta do episodio 2 e navegacao, nao decisao
// de roteiro. Se um dia ela passar a calcular segundos de fala, esta cai.
ok(client.includes("import { MIN_COVERAGE, speechSeconds } from '@/lib/narrationFit'"),
  '6.0c o import pre-existente da regua de narracao ficou byte a byte o de antes')
ok(!blocoPorta.includes('speechSeconds') && !blocoPorta.includes('MIN_COVERAGE'),
  '6.0d e a porta nova nao chama a regua de narracao')
ok(cont.includes('This is the next episode in the same Short series'),
  '6.2 o texto do prompt de continuacao ficou byte a byte o de hoje')
ok(!cont.includes('hollywood') && !cont.includes('cinematic'),
  '6.3 o modulo do link nao decide motor caro nem prompt de cena')

// ───────────────────────────────────────────────────────────────────────────
// 7. O PRECO E REAL — a jogada so faz sentido porque o Kineo 1 custa 0
// ───────────────────────────────────────────────────────────────────────────
equal(engineCost.creditCostFor('fast', false), 0, '7.1 Kineo 1 custa ZERO na conta que ve esta porta')
ok(engineCost.creditCostFor('fast', true) > 0, '7.2 e custa credito na conta PAGA — por isso a regra le isPaidAccount')

console.log('\nsprint-retencao #2 — porta do episodio 2')
console.log('  verificacoes: ' + checks)
if (fails.length) {
  console.log('  FALHAS: ' + fails.length)
  for (const f of fails) console.log('   ✗ ' + f)
  process.exit(1)
}
console.log('  0 falhas\n')
