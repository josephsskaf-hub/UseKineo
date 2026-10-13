// KINEO-ESCRITOR-MONUMENTO-2026-10-13 — guardião: em pedido de LUGAR REAL o escritor de cenas mira o alvo da régua.
//
// Achado (13/10, dry-runs de produção a $0 no ce41365a, Seedance 1.5, 35 s, modo IA, régua 2,45 pal/s → 86 esperadas,
// faixa ouvida pelo escritor 22-24/cena): "Drone tour of the Palace of Versailles" = 102 · 99 · 107 palavras (+19/+15/+24 %;
// 106 no ensaio das 06:22); controle Flannan Isles (régua 2,3 → 81) = 92 · 88. O vocabulário do monumento NÃO entra no
// prompt do escritor — o gpt-4o escreve ficha de fatos com nomes compostos e enfeite; os filtros apagavam os nomes até
// a6d44a11 e escondiam o excesso. Conserto: lib/cinematic/escritorNoLugar.ts + 2 linhas marcadas na rota + placeRule em
// lib/runway generateScenes. Este guardião prova:
//   (1) a lib: Versailles → faixa [22, 22] + regra; sem lugar (mistério) → null; entrada inválida → null;
//   (2) o trecho REAL da rota, executado: opções do escritor de Versailles mudam; as do controle são as MESMAS (deep equal);
//   (3) generateScenes REAL com OpenAI simulado: controle → system/user prompts BYTE A BYTE iguais aos da base (runway sem
//       placeRule, reconstruída em memória); Versailles → "22-22 words" + a regra do lugar, e só isso muda;
//   (4) a régua: com o comportamento MEDIDO do escritor (fala ÷ teto pedido, por cena, nos 3 ensaios), o teto novo põe
//       Versailles dentro de −8 %/+25 % no relatório REAL do ensaio de $0 (classicDryRunReport) — inclusive no pior caso
//       (todas as cenas com o maior excesso medido: 106, +23 %), que com o teto antigo reprova (116, +35 %);
//   (5) nenhuma palavra verdadeira volta a ser apagada: os contextos dos filtros seguem comVocabularioDoLugar, e o conserto
//       só mexe nas OPÇÕES do escritor (nada roda sobre as falas).
import { readFileSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { isDeepStrictEqual } from 'node:util'
import vm from 'node:vm'
import ts from 'typescript'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const RAIZ = resolve(join(dirname(fileURLToPath(import.meta.url)), '..'))
process.chdir(RAIZ)
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) { ok++; console.log('  ok  ', n) } else { falhas.push(n); console.log('  FALHA', n) } }

const MARCA = 'KINEO-ESCRITOR-MONUMENTO-2026-10-13'
const VERSAILLES = 'Drone tour of the Palace of Versailles'
const CONTROLE = 'The mystery of the Flannan Isles lighthouse keepers who vanished in 1900'

// A inserção em lib/runway.ts (desfeita em memória para reconstruir a base).
const INSERCAO_RUNWAY = "${typeof writerOptions?.placeRule === 'string' ? writerOptions.placeRule : ''}"
const COMENTARIO_RUNWAY = ' · placeRule: KINEO-ESCRITOR-MONUMENTO-2026-10-13 (ausente = texto byte a byte)'
const semPlaceRule = (src) => src
  .split(INSERCAO_RUNWAY).join('')
  .split(COMENTARIO_RUNWAY).join('')
  .split('\n').filter((l) => l !== '  placeRule?: string' && !(l.includes(MARCA) && l.includes('frase extra da regra da fala'))).join('\n')
// (conferido em 13/10: semPlaceRule(lib/runway.ts deste commit) === `git show origin/main:lib/runway.ts`, byte a byte)

const chamadas = []
const respostaFalsa = (n, palavras) => JSON.stringify(Array.from({ length: n }, (_, i) => ({
  description: `Aerial drone shot ${i + 1} of the subject at golden hour, slow push in`, searchKeywords: 'palace garden', stockSearchQuery: 'aerial drone palace garden',
  negativeVisualPrompt: 'cartoon', scenePurpose: i === 0 ? 'HOOK' : 'EXPLANATION', visualIntent: 'awe', visualCategory: 'general_documentary',
  voiceover: Array.from({ length: palavras }, (_, k) => (k === 0 ? 'Word' : 'word')).join(' ') + '.', caption: 'caption',
})))
const openaiFalso = { openai: { chat: { completions: { create: async (body) => { chamadas.push(body); return { choices: [{ message: { content: respostaFalsa(4, 30) } }] } } } } } }
const mocks = { '@/lib/openai': openaiFalso, '@/lib/compose': { targetWordCount: (d) => Math.round(Math.max(5, Math.min(120, Math.round(d))) * 3.1) } }
const load = createOfflineLoader({ mocks })
const loadBase = createOfflineLoader({ mocks, source: (rel, txt) => (rel === 'lib/runway.ts' ? semPlaceRule(txt) : txt) })

const E = load('@/lib/cinematic/escritorNoLugar')
const M = load('@/lib/cinematic/monumentoReal')
const W = load('@/lib/cinematic/sceneWords')
const D = load('@/lib/cinematic/classicDryRun')
const S = load('@/lib/cinematic/sceneStyle')
const R = load('@/lib/runway')
const RB = loadBase('@/lib/runway')

// ═══ (1) a lib ═══
console.log('== (1) lib/cinematic/escritorNoLugar ==')
const lugarV = M.lugarPrincipal(VERSAILLES)
const lugarC = M.lugarPrincipal(CONTROLE)
checa('Versailles é lugar real (curado); o controle de mistério não é lugar', lugarV?.nome === 'the Palace of Versailles' && lugarV?.curado === true && lugarC === null)
const faixaV = W.wordsPerSceneFor(35, 4, 2.45)
const faixaC = W.wordsPerSceneFor(35, 4, 2.3)
checa('régua real de produção: Versailles 22-24 (86 esperadas), controle 21-23 (81)', isDeepStrictEqual([...faixaV], [22, 24]) && isDeepStrictEqual([...faixaC], [21, 23]) && Math.round(35 * 2.45) === 86 && Math.round(35 * 2.3) === 81)
const esc = E.faixaDoEscritorNoLugar(faixaV, lugarV)
checa('Versailles: o escritor mira o alvo — faixa [22, 22] (o piso não muda)', esc && isDeepStrictEqual([...esc.wordsPerScene], [22, 22]))
checa('a regra diz o lugar, "exactly 22 words", nome composto conta palavra por palavra e cita os enfeites medidos', esc && esc.placeRule.startsWith(' This idea is about a real place (the Palace of Versailles)') && esc.placeRule.includes('aim for exactly 22 words') && esc.placeRule.includes('every word of a multi-word name') && ['magnificent', 'stunning', 'impressive', 'exquisite', 'remarkable', 'opulent'].every((a) => esc.placeRule.includes(a)))
checa('sem lugar real → null (o chamador não toca em nada)', E.faixaDoEscritorNoLugar(faixaC, lugarC) === null && E.faixaDoEscritorNoLugar(faixaV, null) === null && E.faixaDoEscritorNoLugar(faixaV, undefined) === null)
checa('faixa ausente/inválida → null', E.faixaDoEscritorNoLugar(undefined, lugarV) === null && E.faixaDoEscritorNoLugar([0, 0], lugarV) === null && E.faixaDoEscritorNoLugar([NaN, 3], lugarV) === null)
checa('lugar genérico pelo formato também vale ("Palace of X")', E.faixaDoEscritorNoLugar([20, 22], { nome: 'Palace of Caserta' })?.placeRule.includes('(Palace of Caserta)'))
checa('aspas no nome não quebram o prompt', !E.faixaDoEscritorNoLugar([20, 22], { nome: 'the "Odd" Castle' }).placeRule.includes('"Odd"'))

// ═══ (2) o trecho REAL da rota ═══
console.log('== (2) a rota ==')
const rt = rd('app/api/generate-video-cinematic/route.ts')
const linhas = rt.split('\n')
const iOpc = linhas.findIndex((l) => l.startsWith('    const classicWriterOptions = { wordsPerScene: wordsPerSceneFor(duration, clipCount, narrationRate.wordsPerSecond), language: narrationLanguage.language }'))
const iEsc = linhas.findIndex((l) => l === `    const escritorNoLugar = faixaDoEscritorNoLugar(classicWriterOptions.wordsPerScene, lugarDoPedido) // KINEO-MONUMENTO-2026-10-13 (escritor) — ${MARCA}`)
const iAss = linhas.findIndex((l) => l === `    if (escritorNoLugar) Object.assign(classicWriterOptions, escritorNoLugar) // KINEO-MONUMENTO-2026-10-13 (escritor) — ${MARCA}`)
const iLugar = linhas.findIndex((l) => l.startsWith('    const lugarDoPedido = lugarPrincipal(prompt)'))
const iKling = linhas.findIndex((l) => l.startsWith('    if (wantsKling) Object.assign(classicWriterOptions,'))
const iGen = linhas.findIndex((l) => l.includes('const generated = await generateScenes(prompt.slice(0, SCENE_WRITER_INPUT_MAX_CHARS), clipCount,') && l.includes('classicWriterOptions'))
checa('import da lib marcado', rt.includes(`import { faixaDoEscritorNoLugar } from '@/lib/cinematic/escritorNoLugar' // KINEO-MONUMENTO-2026-10-13 (escritor) — ${MARCA}`))
checa('ordem: lugarDoPedido → opções do escritor → régua do lugar → ajustes do Kling/Veo → generateScenes', iLugar > 0 && iOpc > iLugar && iEsc > iOpc && iAss === iEsc + 1 && iKling > iAss && iGen > iKling)
checa('toda linha nova/trocada desta leva leva a marca (e a do monumento, que os guardiões reancorados já descontam)', linhas.filter((l) => l.includes(MARCA)).every((l) => l.includes('KINEO-MONUMENTO-2026-10-13')))
const trecho = [linhas[iOpc], linhas[iEsc], linhas[iAss]].join('\n')
function opcoesDaRota(prompt, wps) {
  const ctx = { duration: 35, clipCount: 4, narrationRate: { wordsPerSecond: wps }, narrationLanguage: { language: 'en' }, wordsPerSceneFor: W.wordsPerSceneFor, faixaDoEscritorNoLugar: E.faixaDoEscritorNoLugar, lugarDoPedido: M.lugarPrincipal(prompt) }
  ctx.globalThis = ctx
  vm.runInNewContext(ts.transpileModule(`${trecho}\nglobalThis.__o = classicWriterOptions`, { compilerOptions: { target: 9, module: 99 } }).outputText, ctx)
  return ctx.__o
}
function opcoesDaBase(wps) {
  const ctx = { duration: 35, clipCount: 4, narrationRate: { wordsPerSecond: wps }, narrationLanguage: { language: 'en' }, wordsPerSceneFor: W.wordsPerSceneFor }
  ctx.globalThis = ctx
  vm.runInNewContext(ts.transpileModule(`${linhas[iOpc]}\nglobalThis.__o = classicWriterOptions`, { compilerOptions: { target: 9, module: 99 } }).outputText, ctx)
  return ctx.__o
}
const oV = opcoesDaRota(VERSAILLES, 2.45)
const oC = opcoesDaRota(CONTROLE, 2.3)
checa('rota, Versailles: faixa [22, 22] + placeRule', isDeepStrictEqual([...oV.wordsPerScene], [22, 22]) && typeof oV.placeRule === 'string' && oV.placeRule.includes('Palace of Versailles'))
checa('rota, controle: opções IGUAIS às da base (mesmas chaves, mesma faixa 21-23, sem placeRule)', isDeepStrictEqual(JSON.parse(JSON.stringify(oC)), JSON.parse(JSON.stringify(opcoesDaBase(2.3)))) && !('placeRule' in oC))

// ═══ (3) generateScenes REAL com OpenAI simulado ═══
console.log('== (3) generateScenes (prompt do escritor) ==')
const politica = (p) => ({ mode: 'documentary_faceless', style: S.deriveStyleAnchor(p), character: null, aspect: '9:16' })
async function capturar(api, prompt, opcoes) {
  chamadas.length = 0
  const cenas = await api.generateScenes(prompt, 4, politica(prompt), opcoes)
  return { sys: chamadas[0]?.messages?.[0]?.content ?? '', user: chamadas[0]?.messages?.[1]?.content ?? '', n: chamadas.length, cenas }
}
const cNovo = await capturar(R, CONTROLE, oC)
const cBase = await capturar(RB, CONTROLE, opcoesDaBase(2.3))
checa('base reconstruída de fato (sem placeRule no fonte desfeito)', !semPlaceRule(rd('lib/runway.ts')).includes('placeRule') && rd('lib/runway.ts').includes(INSERCAO_RUNWAY))
checa('controle: system prompt BYTE A BYTE igual ao da base', cNovo.sys.length > 1000 && cNovo.sys === cBase.sys)
checa('controle: user prompt BYTE A BYTE igual ao da base', cNovo.user.length > 100 && cNovo.user === cBase.user)
checa('controle: diz "21-23 words" como sempre', cNovo.sys.includes('one narration line (21-23 words — this line alone must fill'))
const vNovo = await capturar(R, VERSAILLES, oV)
const vBase = await capturar(RB, VERSAILLES, opcoesDaBase(2.45))
checa('Versailles: o escritor ouve "22-22 words" + a regra do lugar', vNovo.sys.includes('one narration line (22-22 words — this line alone must fill') && vNovo.sys.includes(`describe people exactly as the idea describes them${oV.placeRule}). MUST include`))
checa('Versailles: a base ouvia "22-24 words" sem regra (o antes)', vBase.sys.includes('one narration line (22-24 words — this line alone must fill') && !vBase.sys.includes('real place'))
checa('Versailles: só a faixa e a regra mudam no system prompt', vNovo.sys.replace(oV.placeRule, '').replace('(22-22 words', '(22-24 words') === vBase.sys)
checa('Versailles: user prompt igual (o pedido não ganha vocabulário nem fatos)', vNovo.user === vBase.user && !vNovo.user.includes('Hall of Mirrors'))
checa('as falas do escritor saem como vieram (o conserto não corta nem reescreve fala)', vNovo.cenas.length === 4 && vNovo.cenas.every((c) => c.voiceover.split(/\s+/).length === 30))

// ═══ (4) a régua, com o comportamento MEDIDO do escritor ═══
console.log('== (4) a régua do ensaio de $0 ==')
// Palavras por cena do ESCRITOR (antes da divisão do ce41365a, que não muda a soma) nos 3 ensaios de 13/10, teto ouvido = 24.
const MEDIDO = [[26, 23, 27, 26], [25, 24, 24, 26], [22, 28, 29, 28]]
checa('os 3 ensaios somam 102 · 99 · 107 (os números do relatório de produção)', isDeepStrictEqual(MEDIDO.map((r) => r.reduce((a, b) => a + b, 0)), [102, 99, 107]))
const ensaio = (falas) => D.classicDryRunReport({ scenes: falas.map((w) => ({ voiceover: Array.from({ length: w }, () => 'w').join(' '), prompt: 'p' })), targetSeconds: 35, secondsPerClip: 10, verbatim: false, wordsPerSecond: 2.45, elasticFootage: true })
// projeção pelo TOTAL (fala ÷ teto pedido do filme), distribuída por igual nas 4 cenas — sem inflar por arredondamento por cena
const distribui = (total) => [0, 1, 2, 3].map((k) => Math.floor(total / 4) + (k < total % 4 ? 1 : 0))
const projeta = (porCena, tetoAntigo, tetoNovo) => distribui(Math.round((porCena.reduce((a, b) => a + b, 0) / (4 * tetoAntigo)) * 4 * tetoNovo))
const razoes = MEDIDO.flat().map((w) => w / 24)
const piorRazao = Math.max(...razoes)
checa(`excesso medido por cena: de ${Math.round((Math.min(...razoes) - 1) * 100)} % a +${Math.round((piorRazao - 1) * 100)} % (média +${Math.round((razoes.reduce((a, b) => a + b, 0) / razoes.length - 1) * 100)} %)`, Math.abs(piorRazao - 29 / 24) < 1e-9 && Math.abs(Math.min(...razoes) - 22 / 24) < 1e-9)
const piorAntes = ensaio(distribui(Math.round(4 * 24 * piorRazao)))
const piorDepois = ensaio(distribui(Math.round(4 * 22 * piorRazao)))
checa(`pior caso (TODAS as cenas no maior excesso) com o teto ANTIGO: ${piorAntes.total_words} palavras — reprova no escalador`, piorAntes.rescale_risk === true && piorAntes.total_words === 116)
checa(`pior caso com o teto NOVO: ${piorDepois.total_words} palavras (+${Math.round(piorDepois.rescale_drift * 100)} %) — dentro de −8 %/+25 %`, piorDepois.rescale_risk === false && piorDepois.pass && piorDepois.total_words === 106)
const projetados = MEDIDO.map((r) => ensaio(projeta(r, 24, 22)))
checa(`os 3 ensaios projetados no teto novo: ${projetados.map((p) => `${p.total_words} (+${Math.round(p.rescale_drift * 100)} %)`).join(" · ")} — todos PASS, todos ≥ 86`, projetados.every((p) => p.pass && !p.rescale_risk && p.total_words >= 86))
const obediente = ensaio([22, 22, 22, 22])
checa(`escritor que obedece à risca (4 × 22 = 88) não fica abaixo do alvo: ${obediente.verdict.slice(0, 40)}`, obediente.pass && obediente.total_words >= 86)
checa('o piso da 2ª passada (expandShortVoiceovers) é o mesmo: 22 × 4', oV.wordsPerScene[0] === faixaV[0])

// ═══ (5) nada volta a apagar nome verdadeiro ═══
console.log('== (5) nomes verdadeiros ==')
checa('a fala clássica segue filtrada com o vocabulário do lugar', rt.includes('const contextoFalaClassica = comVocabularioDoLugar(prompt) // KINEO-MONUMENTO-2026-10-13') && rt.includes('const r = removerDatasInventadas(sc.voiceover, contextoFalaClassica)') && rt.includes('const r2 = scrubInventedSetting(r.texto, contextoFalaClassica)'))
const libSrc = rd('lib/cinematic/escritorNoLugar.ts')
checa('a lib é pura (sem import, sem I/O) e não toca em fala', !/^import /m.test(libSrc) && !/voiceover/.test(libSrc.replace(/\/\/.*$/gm, '')))

console.log(`\n${ok} ok, ${falhas.length} falha(s)`)
if (falhas.length) { for (const f of falhas) console.log('FALHA:', f); process.exit(1) }
