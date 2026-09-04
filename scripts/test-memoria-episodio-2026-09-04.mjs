#!/usr/bin/env node
/**
 * sprint-retencao #4 — 04/09/2026 — O FILME NAO LEMBRAVA O QUE ELE MESMO FALOU
 *
 * O NUMERO QUE DOIA (producao, 04/09):
 *
 *   select count(*), count(script) from videos
 *     where status='completed' and created_at > now() - interval '45 days';
 *   -> 1013 filmes entregues, 0 com roteiro gravado.
 *
 * A coluna `public.videos.script` existe, e citada NOMINALMENTE no comentario
 * do proprio INSERT canonico ("Real prod columns: ... topic, script, ...") e
 * nunca foi escrita desde 13/05/2026. Mesma doenca do `thumbnail_url`.
 *
 * POR QUE ISSO IMPORTA PARA A PISTA: a continuacao de serie e a peca mais
 * eficiente da casa (48 dos 58 primeiros cliques em 30d vieram de gente com 1
 * filme, 60% entregaram outro em 24h contra 6,6% de base). Mas a ordem que ela
 * manda ao gerador diz "new facts... Do not repeat the previous episode" para
 * um gerador que NAO SABE o que o episodio anterior falou. Nao da para escrever
 * o episodio 2 a partir do episodio 1 enquanto o episodio 1 nao deixa rastro.
 *
 * AS SEIS COISAS QUE ESTE TESTE TRANCA:
 *   1. o helper puro faz o que promete e falha FECHADO (null, nunca '');
 *   2. a narracao e gravada no claim de submissao NOS DOIS sitios — o insert
 *      E a completude, porque a completude SUBSTITUI o metadata inteiro e e o
 *      unico claim localizavel por render_id;
 *   3. o lado que le e PREGUICOSO: nada muda no caminho de polling;
 *   4. `videos.script` so e escrito quando ha narracao — vazio continua
 *      omitindo a coluna, e NULL de hoje nunca vira '' de amanha;
 *   5. a narracao NAO vaza para superficie publica (PUBLIC_VIDEO_COLUMNS) nem
 *      vira titulo de card (deriveTitle prefere title/topic/prompt);
 *   6. a trava de qualidade do fundador (03/09 23:40) continua intacta.
 *
 * FALSIFICACOES RODADAS DE VERDADE antes do commit (cada uma aplicada no
 * arquivo real, teste executado, arquivo restaurado):
 *   1. tirar `narration:` do claim de completude          -> cai 2.3
 *   2. tirar `narration:` do claim de insercao            -> cai 2.2
 *   3. trocar `if (episodeNarration)` por escrita sempre  -> cai 4.2
 *   4. baixar MIN_EPISODE_MEMORY_CHARS para 0             -> cai 1.4
 *   5. por `script` em PUBLIC_VIDEO_COLUMNS               -> cai 5.1
 *   6. tirar o `await lerNarracaoDoEpisodio()` do persist -> cai 3.4
 *   7. mover a leitura para fora do bloco de persistencia -> cai 3.2
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

const mem = loadTs('lib/episodeMemory.ts')
const memSrc = read('lib/episodeMemory.ts')
const composeSrc = read('app/api/compose/route.ts')
const statusSrc = read('app/api/compose/status/[renderId]/route.ts')
const publicSrc = read('lib/publicVideos.ts')
const videosApiSrc = read('app/api/videos/route.ts')

const NARRACAO =
  'In 1902, a lighthouse keeper vanished from an island with the door still locked from the inside. ' +
  'The lamp was lit. The table was set for three. And the logbook kept writing for two more days.'

// ---------------------------------------------------------------------------
// 1. O HELPER PURO — E ELE FALHA FECHADO
// ---------------------------------------------------------------------------
ok(typeof mem.episodeNarrationForMemory === 'function',
  '1.1 o helper existe e e executavel sozinho (funcao pura, zero import)')
ok(!/^\s*import /m.test(memSrc),
  '1.2 lib/episodeMemory.ts nao importa NADA — da para provar sem subir servidor')
ok(mem.episodeNarrationForMemory(NARRACAO) === NARRACAO.replace(/\s+/g, ' ').trim(),
  '1.3 narracao real passa inteira, so com espacos achatados')
ok(mem.episodeNarrationForMemory('Pompeii') === null,
  '1.4 sobra curta NAO vira memoria — memoria FALSA e pior que memoria nenhuma')
ok(mem.episodeNarrationForMemory('') === null && mem.episodeNarrationForMemory(null) === null
   && mem.episodeNarrationForMemory(undefined) === null,
  '1.5 vazio/nulo devolve null, nunca string vazia: o caller OMITE a coluna')
ok(mem.MIN_EPISODE_MEMORY_CHARS > 0 && mem.MAX_EPISODE_MEMORY_CHARS >= 1000,
  '1.6 piso e teto existem e o teto cobre uma narracao de 90s com folga')

const longa = 'Every sentence here is a complete thought that ends with a period. '.repeat(200)
const cortada = mem.episodeNarrationForMemory(longa)
ok(cortada !== null && cortada.length <= mem.MAX_EPISODE_MEMORY_CHARS,
  '1.7 narracao gigante e cortada dentro do teto')
ok(cortada !== null && !/\s$/.test(cortada) && longa.startsWith(cortada),
  '1.8 o corte e um PREFIXO da fala real — nunca reescreve, nunca resume')
ok(cortada !== null && /[.!?…]$/.test(cortada),
  '1.9 o corte cai em fronteira de frase — palavra cortada no meio foi o defeito que a semente de serie levou 3 rodadas para matar')
const semPonto = 'x'.repeat(20) + ' ' + 'palavra '.repeat(2000)
const cortadaSemPonto = mem.episodeNarrationForMemory(semPonto)
ok(cortadaSemPonto !== null && !cortadaSemPonto.endsWith('palav') && semPonto.startsWith(cortadaSemPonto),
  '1.10 sem nenhum ponto final, o corte cai no ultimo espaco — nunca no meio da palavra')

// ---------------------------------------------------------------------------
// 2. O CLAIM GUARDA A NARRACAO — NOS DOIS SITIOS
// ---------------------------------------------------------------------------
ok(composeSrc.includes("import { episodeNarrationForMemory } from '@/lib/episodeMemory'"),
  '2.1 /api/compose importa o helper')
const iInsert = composeSrc.indexOf('async function claimGenerationSubmission')
const iComplete = composeSrc.indexOf('async function completeGenerationClaim')
const trechoInsert = composeSrc.slice(iInsert, iComplete)
const trechoComplete = composeSrc.slice(iComplete, iComplete + 4000)
ok(iInsert > 0 && iComplete > iInsert, '2.0 as duas funcoes de claim foram localizadas no arquivo real')
ok(trechoInsert.includes('narration: episodeNarrationForMemory(voiceoverScript)'),
  '2.2 o claim de INSERCAO ja nasce com a narracao')
ok(trechoComplete.includes('narration: episodeNarrationForMemory(voiceoverScript)'),
  '2.3 o claim de COMPLETUDE tambem — ele SUBSTITUI o metadata inteiro, e e o unico achavel por render_id')
ok(trechoComplete.includes('render_id: renderId'),
  '2.4 a completude e mesmo o objeto que carrega o render_id (prova de que 2.3 mede o sitio certo)')
ok(composeSrc.indexOf('let voiceoverScript') > 0
   && composeSrc.indexOf('let voiceoverScript') < iInsert,
  '2.5 a fala ja esta resolvida antes do claim — nao ha ordem de execucao a inventar')
ok((composeSrc.match(/narration: episodeNarrationForMemory\(voiceoverScript\)/g) || []).length === 2,
  '2.6 exatamente DOIS sitios: nem a mais (metadata inchado), nem a menos (campo apagado na completude)')

// ---------------------------------------------------------------------------
// 3. O LADO QUE LE E PREGUICOSO — O POLLING NAO PAGA NADA
// ---------------------------------------------------------------------------
ok(statusSrc.includes('async function lerNarracaoDoEpisodio'),
  '3.1 existe um leitor dedicado da narracao')
const iLeitor = statusSrc.indexOf('async function lerNarracaoDoEpisodio')
const iPersist = statusSrc.indexOf('await persistCompletedVideo({')
const iChamada = statusSrc.indexOf('await lerNarracaoDoEpisodio()')
ok(iPersist > 0 && iChamada > iPersist,
  '3.2 a UNICA chamada acontece DENTRO do bloco que persiste o video — nao a cada polling')
ok((statusSrc.match(/await lerNarracaoDoEpisodio\(\)/g) || []).length === 1,
  '3.3 uma chamada, uma leitura: o filme entregue custa no maximo uma ida a mais ao banco')
ok(statusSrc.includes('narration: await lerNarracaoDoEpisodio(),'),
  '3.4 a narracao chega mesmo ao persistidor')
const leitor = statusSrc.slice(iLeitor, iLeitor + 1600)
ok(leitor.includes('if (claimNarration) return claimNarration'),
  '3.5 se o lookup adiantado ja trouxe a narracao, nao ha segunda consulta')
ok(leitor.includes('catch') && leitor.includes("return ''"),
  '3.6 FAIL-OPEN: erro devolve vazio e a coluna nao e escrita — nunca pior que hoje')
ok(leitor.includes("eq('metadata->>render_id', renderId)") && leitor.includes('COMPOSE_CLAIM_EVENT'),
  '3.7 le o claim pelo mesmo par (nome do evento + render_id) que o fallback de tema ja usava')
ok(leitor.includes('MAX_EPISODE_MEMORY_CHARS'),
  '3.8 o teto vale tambem na LEITURA — claim adulterado nao vira coluna gigante')

// ---------------------------------------------------------------------------
// 4. `videos.script` SO E ESCRITO QUANDO HA NARRACAO
// ---------------------------------------------------------------------------
ok(statusSrc.includes('narration?: string | null'),
  '4.1 o persistidor declara o campo como opcional e anulavel')
ok(statusSrc.includes('if (episodeNarration) row.script = episodeNarration'),
  '4.2 vazio continua OMITINDO a coluna — o NULL de hoje nunca vira string vazia amanha')
const iRow = statusSrc.indexOf('const row: Record<string, unknown> = {')
const iInsertVideos = statusSrc.search(/\.from\('videos'\)\r?\n\s*\.insert\(row\)/)
ok(iRow > 0 && iInsertVideos > iRow
   && statusSrc.indexOf('row.script = episodeNarration') > iRow
   && statusSrc.indexOf('row.script = episodeNarration') < iInsertVideos,
  '4.3 a coluna e adicionada ao row ANTES do insert — nao depois dele')
ok(statusSrc.includes('topic, script, hashtags'),
  '4.4 o comentario do INSERT canonico continua listando `script` como coluna real de producao')

// ---------------------------------------------------------------------------
// 5. A NARRACAO NAO VAZA E NAO VIRA TITULO
// ---------------------------------------------------------------------------
const iPublicCols = publicSrc.indexOf('PUBLIC_VIDEO_COLUMNS =')
const publicCols = publicSrc.slice(iPublicCols, iPublicCols + 400)
ok(iPublicCols > 0 && !/\bscript\b/.test(publicCols.split('\n').slice(0, 3).join('\n')),
  '5.1 `script` NAO entra na lista publica: /v/[id] e sitemap continuam sem a fala crua (incidente de 11/08)')
const iDerive = videosApiSrc.indexOf('function deriveTitle')
const derive = videosApiSrc.slice(iDerive, videosApiSrc.indexOf('\n}', iDerive))
ok(iDerive > 0 && derive.indexOf('row.title') < derive.indexOf('row.script'),
  '5.2 o titulo do card prefere title/topic/prompt — narracao gravada nao troca titulo de ninguem')
ok(!videosApiSrc.includes('script: strOrNull(row.script)'),
  '5.3 a narracao NAO e reenviada ao navegador na lista de videos — zero peso novo de payload')

// ---------------------------------------------------------------------------
// 6. TRAVA DE QUALIDADE DO FUNDADOR (03/09 23:40) — LISTA FECHADA
// ---------------------------------------------------------------------------
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
ok(!/scaleVoiceoverScript|targetWordCount|narrationFit/.test(trechoInsert + trechoComplete),
  '6.9 os dois blocos de claim nao encostam em nenhuma regua de narracao — so gravam o que ja foi decidido')

// ---------------------------------------------------------------------------
console.log('')
console.log('  verificacoes: ' + checks + ' - falhas: ' + fails.length)
if (fails.length) {
  console.log('')
  for (const f of fails) console.log('  x ' + f)
  process.exit(1)
}
console.log('  OK — o filme entregue passa a lembrar o que ele mesmo falou')
console.log('')
