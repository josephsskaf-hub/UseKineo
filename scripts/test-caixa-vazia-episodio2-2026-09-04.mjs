#!/usr/bin/env node
/**
 * sprint-retencao #3 — 04/09/2026 — A CAIXA VAZIA DE QUEM JA FEZ UM FILME
 *
 * O QUE ESTE TESTE PROTEGE, E POR QUE:
 *
 * Medido em 04/09 (30 dias, contas externas): 319 pessoas fizeram EXATAMENTE
 * 1 filme. 103 delas VOLTARAM a tela de criacao — intencao provada, elas
 * voltaram sozinhas — e apenas 21 apertaram gerar. As outras 82 encontraram
 * "1 · Choose a category" e um campo em branco pedindo uma ideia NOVA, como
 * se nunca tivessem feito nada aqui.
 *
 * A saida ja existia e estava escondida. A porta da serie e a peca mais
 * eficiente da casa, e o numero foi medido NO MOMENTO do clique (nao depois,
 * o que seria vies de selecao): dos 58 primeiros cliques de 30 dias, 48
 * vieram de gente com EXATAMENTE 1 filme, e 29 desses 48 (60%) entregaram
 * outro filme em 24h — contra 6,6% de segundo filme na base de 1 filme.
 * So que no /generate ela morava DEPOIS do compositor inteiro, dentro do
 * cartao "Recent Videos", e sem NENHUM evento de exposicao: 24 cliques em
 * 30 dias e zero denominador.
 *
 * AS CINCO COISAS QUE ESTE TESTE TRANCA:
 *   1. a porta nova nasce ANTES da primeira pergunta da tela ("1 · Choose a
 *      category"), e nao depois — a posicao e comparada por indice no
 *      arquivo, nao pela mera existencia do bloco;
 *   2. ela so aparece com a CAIXA VAZIA: quem chegou com tema na mao (home,
 *      ChatGPT, continuacao) nao ve nada novo e nao perde um pixel do
 *      caminho que ja funciona;
 *   3. ela so aparece para quem TEM um filme pronto — lista nula (ainda
 *      carregando), lista vazia e video sem titulo nao inventam porta;
 *   4. a exposicao e HONESTA: existe evento `series_continue_seen` com fonte
 *      propria `composer_empty`, disparado por IntersectionObserver, uma vez
 *      por video. Sem denominador, o clique nao prova nada — foi exatamente
 *      esse o buraco do cartao antigo;
 *   5. o cartao antigo do "Recent Videos" continua vivo (a mudanca e
 *      ADITIVA), e a trava de qualidade do fundador (03/09 23:40) continua
 *      intacta.
 *
 * FALSIFICACOES RODADAS DE VERDADE antes do commit (cada uma aplicada no
 * arquivo real, teste executado, arquivo restaurado):
 *   1. tirar `if (prompt.trim()) return null` do memo        -> cai 2.2
 *   2. tirar `if (!showStep1) return null`                   -> cai 2.1
 *   3. trocar `Array.isArray(recentVideos)` por truthiness   -> cai 3.1
 *   4. tirar o filtro `status === completed`                 -> cai 3.3
 *   5. mover o bloco para depois do "Choose a category"      -> cai 1.2
 *   6. trocar a fonte por `generate_recent_video`            -> caem 4.4 e 4.8
 *   7. apagar o cartao antigo do Recent Videos               -> cai 5.1
 */
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'

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
const client = read('app/(dashboard)/generate/GenerateClient.tsx')
const seriesSrc = read('lib/seriesContinuation.ts')
const SEED = 'The lake that turns animals to stone'

// ───────────────────────────────────────────────────────────────────────────
// 1. POSICAO: A PORTA NASCE ANTES DA PRIMEIRA PERGUNTA DA TELA
// ───────────────────────────────────────────────────────────────────────────
const iStrip = client.indexOf('composerEpisodeVideo && (')
const iCategoria = client.indexOf('1 · Choose a category')
const iRecent = client.indexOf('{showStep1 && <RecentVideosSection')
ok(iStrip > 0, '1.1 a porta da caixa vazia existe na tela')
ok(iCategoria > 0 && iStrip < iCategoria,
  '1.2 a porta vem ANTES de "1 Choose a category" — era esse o campo em branco que 82 pessoas viram')
ok(iRecent > 0 && iStrip < iRecent,
  '1.3 a porta vem ANTES do cartao Recent Videos, que e onde ela morava escondida')
ok(client.indexOf('const composerEpisodeVideo') < iStrip,
  '1.4 o memo que decide a porta e declarado antes do uso')

// ───────────────────────────────────────────────────────────────────────────
// 2. A CAIXA PRECISA ESTAR VAZIA, E A TELA PRECISA SER A DE CRIAR
// ───────────────────────────────────────────────────────────────────────────
const memo = client.slice(client.indexOf('const composerEpisodeVideo'),
  client.indexOf('}, [showStep1, prompt, recentVideos])'))
ok(memo.includes('if (!showStep1) return null'),
  '2.1 fora da tela de criar (analisando/renderizando) a porta nao existe')
ok(memo.includes('if (prompt.trim()) return null'),
  '2.2 caixa COM tema (home, ChatGPT, continuacao) nao ve nada novo — o caminho que funciona fica intacto')
ok(memo.includes('recentVideos'), '2.3 a decisao le a lista real de videos da pessoa')
ok(client.includes('}, [showStep1, prompt, recentVideos])'),
  '2.4 o memo recalcula quando a caixa e digitada — a porta some ao primeiro caractere')

// ───────────────────────────────────────────────────────────────────────────
// 3. FALHA FECHADA: SEM FILME PRONTO, SEM PORTA
// ───────────────────────────────────────────────────────────────────────────
ok(memo.includes('if (!Array.isArray(recentVideos)) return null'),
  '3.1 lista NULA (ainda carregando) nao vira porta — null e "nao sei", nao "nao tem"')
ok(memo.includes("v.status === 'completed'"),
  '3.3 so filme ENTREGUE abre porta — processing/failed nao prometem episodio 2')
ok(memo.includes('!!v.title') && memo.includes('v.title.trim()'),
  '3.4 video sem titulo nao vira porta: o titulo E a semente do episodio 2')
ok(memo.includes('return done ?? null'), '3.5 sem candidato, a porta nao existe (lista vazia cai aqui)')
ok(!memo.includes('recentVideos[0]'),
  '3.6 a porta nao pega o primeiro da lista as cegas — ela procura um COMPLETED')

// ───────────────────────────────────────────────────────────────────────────
// 4. EXPOSICAO HONESTA — O DENOMINADOR QUE FALTAVA
// ───────────────────────────────────────────────────────────────────────────
ok(seriesSrc.includes("| 'composer_empty'"),
  '4.1 a fonte nova existe no contrato de tipos da serie')
ok(series.buildSeriesContinuationHref(SEED, 'composer_empty').includes('continuation_source=composer_empty'),
  '4.2 a fonte viaja no link — da para separar no banco a volta a tela do fim do filme')
ok(series.buildSeriesContinuationHref(SEED, 'composer_empty').startsWith('/studio/create?'),
  '4.3 o destino continua o mesmo /studio/create ja medido')
const efeito = client.slice(client.indexOf('const composerEpisodeSeenRef'),
  client.indexOf('}, [composerEpisodeVideo])'))
ok(efeito.includes("trackEvent('series_continue_seen'"),
  '4.4a a porta nova EMITE exposicao — o cartao antigo tinha 24 cliques e zero denominador')
ok(efeito.includes("source: 'composer_empty'"),
  '4.4 a exposicao carrega a fonte propria, e nao se mistura com a do fim do filme')
ok(efeito.includes('IntersectionObserver'),
  '4.5 a exposicao so conta quando o bloco ENTRA no viewport')
ok(efeito.includes('observed') && efeito.includes('marcar(false)'),
  '4.6 sem IntersectionObserver o evento sai marcado observed:false — nao infla o denominador')
ok(efeito.includes('composerEpisodeSeenRef.current === alvo.id'),
  '4.7 uma exposicao por video, nao uma por render do React')
ok(client.includes("handleContinueSeries(composerEpisodeVideo.title, 'composer_empty', composerEpisodeVideo.id)"),
  '4.8 o clique usa o MESMO caminho ja medido (handleContinueSeries), com a fonte nova')
ok(client.includes('ref={composerEpisodeRef}'), '4.9 o observer tem um alvo real na arvore')

// ───────────────────────────────────────────────────────────────────────────
// 5. ADITIVO: NADA DO QUE JA FUNCIONAVA FOI REMOVIDO
// ───────────────────────────────────────────────────────────────────────────
ok(client.includes("buildSeriesContinuationHref(latestCompleted.title, 'generate_recent_video')"),
  '5.1 o cartao antigo do Recent Videos continua vivo — a mudanca soma, nao troca')
ok(client.includes("source: 'done_screen'") && client.includes("'done_screen_top'"),
  '5.2 as portas do fim do filme (#18) continuam intactas')
for (const fonte of ['done_screen', 'generate_recent_video', 'history_milestone', 'render_pill']) {
  ok(!series.buildSeriesContinuationHref(SEED, fonte).includes('composer_empty'),
    '5.3 a fonte ' + fonte + ' nao foi contaminada')
}
ok(series.buildSeriesContinuationHref(SEED, 'done_screen') ===
   series.buildSeriesContinuationHref(SEED, 'done_screen'),
  '5.4 o link das fontes antigas continua deterministico')

// ───────────────────────────────────────────────────────────────────────────
// 6. TRAVA DE QUALIDADE DO FUNDADOR (03/09 23:40) — LISTA FECHADA
// ───────────────────────────────────────────────────────────────────────────
let tocados = ''
try {
  tocados = execSync('git diff --name-only HEAD', { cwd: root, encoding: 'utf8' })
} catch { tocados = '' }
const proibidos = [
  'lib/compose.ts', 'lib/hollywood/', 'lib/cinematic/', 'lib/broll/',
  'lib/lyriaMusic', 'lib/narrationFit.ts', 'app/api/analyze-idea',
  'app/api/generate-script', 'app/api/generate-video-',
]
for (const alvo of proibidos) {
  ok(!tocados.split('\n').some((f) => f.trim() && f.includes(alvo)),
    '6 trava de qualidade: nada tocado em ' + alvo)
}

// ───────────────────────────────────────────────────────────────────────────
console.log('')
console.log('  verificacoes: ' + checks + ' · falhas: ' + fails.length)
if (fails.length) {
  console.log('')
  for (const f of fails) console.log('  x ' + f)
  process.exit(1)
}
console.log('  OK — a caixa vazia de quem ja fez um filme deixou de ser um campo em branco')
console.log('')
