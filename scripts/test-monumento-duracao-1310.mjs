// KINEO-MONUMENTO-DURACAO-2026-10-13 — guardião: no Seedance 1.5 (35/60/90 s, modo IA) a imagem cobre a fala inteira.
//
// Achado pós-publicação do monumento (96c67b9b no ar), dry-run de produção, Seedance 1.5, 35 s, "Let AI structure",
// "Drone tour of the Palace of Versailles": monumento OK (4/4), mas FAIL — "footage de 40s para 43.3s de fala: o compose
// repetiria cena para fechar o tempo" (106 palavras contra 86 esperadas). Controle de mistério (Flannan Isles, 86 palavras,
// 37,4 s) dá PASS. Regra do fundador: passar do alvo é bom, ficar abaixo é defeito, nunca amputar a fala nem repetir cena.
//
// Este guardião EXECUTA o bloco REAL da rota (extraído do arquivo, transpilado) com a lib real e passa o resultado pelo
// relatório REAL do ensaio de $0 (classicDryRunReport, o mesmo que deu o FAIL em produção):
//   (1) Versailles 35 s: ANTES reproduz o FAIL; DEPOIS imagem ≥ fala e PASS, as MESMAS palavras na MESMA ordem,
//       nenhum plano visual repetido, o lugar ancorado em todos os planos (âncora do monumento roda depois);
//   (2) controle de mistério: cenas, clipCount e veredito byte a byte iguais (o bloco não roda);
//   (3) Kling 2.5 / Veo / Sora / 15 s / cena com segundos próprios: o bloco não roda;
//   (4) teto de 12 clipes e cena curta (< 8 palavras) não se divide; (5) a rota está ligada na ordem certa.
import { readFileSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import ts from 'typescript'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const RAIZ = resolve(join(dirname(fileURLToPath(import.meta.url)), '..'))
process.chdir(RAIZ)
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) { ok++; console.log('  ok  ', n) } else { falhas.push(n); console.log('  FALHA', n) } }

const load = createOfflineLoader({})
const C = load('@/lib/cinematic/seedanceCobreAFala')
const D = load('@/lib/cinematic/classicDryRun')
const M = load('@/lib/cinematic/monumentoReal')
const rt = rd('app/api/generate-video-cinematic/route.ts')
const MARCA = 'KINEO-MONUMENTO-2026-10-13 (duração)' // a leva do monumento, parte da duração: os guardiões reancorados no monumento já descontam a marca

// ── o bloco real da rota ──
const iIni = rt.indexOf('    let seedanceCoberturaRelato: ')
const FIM = `\n    } // ${MARCA}\n` // com a quebra de linha na frente: o fecho do if interno (6 espaços) não pode casar
const iFim = rt.indexOf(FIM, iIni)
const bloco = iIni > 0 && iFim > iIni ? rt.slice(iIni, iFim + FIM.length) : ''
checa('o bloco da rota existe e foi extraído', bloco.length > 0)
const caption = (t) => String(t ?? '').split(' ').slice(0, 5).join(' ')
function rodaBloco(cenas0, { wps = 2.45, flags = {}, clipCount0 = cenas0.length, semDescricao = [] } = {}) {
  const ctx = {
    cenas0, clipCount0, hollywoodPath: false, wantsKling: false, wantsVeo: false, wantsSora: false, seedanceShortFilm: false, ...flags,
    narrationRate: { wordsPerSecond: wps }, shortCaptionFromVoiceover: caption,
    cobrirFalaComImagem: C.cobrirFalaComImagem, SEEDANCE_COBRE_VARIACAO: C.SEEDANCE_COBRE_VARIACAO,
    cenasSemDescricaoDoModelo: new Set(semDescricao), console: { log() {}, warn() {} },
  }
  ctx.globalThis = ctx
  const src = `let scenes = cenas0; let clipCount = clipCount0;\n${bloco}\nglobalThis.__r = { scenes, clipCount, relato: seedanceCoberturaRelato }`
  vm.runInNewContext(ts.transpileModule(src, { compilerOptions: { target: 9, module: 99 } }).outputText, ctx)
  return { ...ctx.__r, semDescricao: [...ctx.cenasSemDescricaoDoModelo] }
}
const ensaio = (cenas, wps) => D.classicDryRunReport({ scenes: cenas.map((s) => ({ voiceover: s.voiceover, prompt: s.aiPrompt })), targetSeconds: 35, secondsPerClip: 10, verbatim: false, wordsPerSecond: wps })
const texto = (cenas) => cenas.map((s) => s.voiceover).join(' ').split(/\s+/).filter(Boolean).join(' ')

// ═══ (1) Versailles 35 s — 4 cenas do escritor, 106 palavras (o número do ensaio de produção) ═══
console.log('== (1) Versailles 35 s ==')
const VERSAILLES = [
  { voiceover: 'The Palace of Versailles began as a hunting lodge for Louis XIII in 1623. Louis XIV turned it into Europe\'s most dazzling royal residence.', aiPrompt: 'Aerial drone shot gliding toward the golden gates of the Palace of Versailles at sunrise.' },
  { voiceover: 'The Hall of Mirrors holds 357 mirrors, a luxury only a king could afford. In 1919 the Treaty of Versailles was signed here, ending World War I.', aiPrompt: 'Slow glide down the Hall of Mirrors, chandeliers reflected in 357 mirrors.' },
  { voiceover: 'Outside, André Le Nôtre drew formal gardens stretching for miles. The Apollo Fountain shows the sun god rising from the water, a mirror of the Sun King himself.', aiPrompt: 'Low angle of the Apollo Fountain, water cascading in the sunlight.' },
  { voiceover: 'Beyond it, the Grand Canal stretches 1,670 meters. Louis staged mock naval battles there, with gondolas sent from Venice. Today ten million visitors walk these paths yearly.', aiPrompt: 'Wide establishing shot of the Grand Canal reflecting the evening sky.' },
].map((s) => ({ ...s, description: s.aiPrompt, caption: caption(s.voiceover), stockSearchQuery: 'versailles' }))
{
  const palavras = texto(VERSAILLES).split(' ').length
  checa('fixture: 106 palavras em 4 cenas (o caso de produção)', palavras === 106)
  const antes = ensaio(VERSAILLES, 2.45)
  checa('ANTES reproduz o FAIL de produção: "footage de 40s para 43.3s de fala"', !antes.pass && antes.problems.some((p) => p.startsWith('footage de 40s para 43.3s de fala')))
  const r = rodaBloco(VERSAILLES, { semDescricao: [3] })
  const depois = ensaio(r.scenes, 2.45)
  checa('DEPOIS: PASS no relatório real do ensaio', depois.pass === true)
  checa('DEPOIS: imagem ≥ fala (5 clipes × 10 s = 50 s ≥ 43,3 s)', r.scenes.length === 5 && depois.footage_seconds >= depois.speech_seconds && r.relato?.imagem_depois_s === 50 && r.relato?.fala_s === 43.3)
  checa('DEPOIS: clipCount acompanha os planos', r.clipCount === 5)
  checa('DEPOIS: as MESMAS 106 palavras, na mesma ordem — nada amputado nem reescrito', texto(r.scenes) === texto(VERSAILLES) && depois.total_words === 106)
  checa('DEPOIS: a divisão caiu em fronteira de frase (cada plano termina em pontuação de frase)', r.scenes.every((s) => /[.!?…]$/.test(s.voiceover)))
  checa('DEPOIS: nenhum plano visual repetido (o 2º plano da cena dividida tem outro enquadramento)', new Set(r.scenes.map((s) => s.aiPrompt)).size === r.scenes.length && r.scenes.filter((s) => s.aiPrompt.endsWith(C.SEEDANCE_COBRE_VARIACAO)).length === 1)
  checa('DEPOIS: legenda curta refeita para as duas metades', r.scenes.every((s) => s.caption === caption(s.voiceover)))
  // a cena de mais palavras é a 3 (28): planos [1, 2, 3a, 3b, 4] — a cena 4 (índice 3) sem descrição do modelo passa a ser o plano 5 (índice 4)
  checa('DEPOIS: a cena de mais palavras (3) foi a dividida e o índice da cena sem descrição do modelo foi remapeado (3 → 4)', JSON.stringify(r.relato?.divididas) === '[3]' && JSON.stringify(r.semDescricao) === '[4]' && r.scenes[4].voiceover === VERSAILLES[3].voiceover)
  checa('DEPOIS: relato aponta a cena dividida e não está curto', Array.isArray(r.relato?.divididas) && r.relato.divididas.length === 1 && r.relato.ainda_curta === false)
  const lugar = M.lugarPrincipal('Drone tour of the Palace of Versailles')
  checa('DEPOIS + âncora do monumento: Versailles em 5 de 5 planos', r.scenes.map((s) => M.ancorarLugarNoPrompt(s.aiPrompt, lugar)).every((p) => M.promptTemOLugar(p, lugar)))
  const r23 = rodaBloco(VERSAILLES, { wps: 2.3 })
  checa('na voz mais lenta (2,3 pal/s, 46,1 s de fala) também cobre: 5 × 10 s ≥ 46,1 s, sem o problema de footage (o +31% de palavras é o aviso do escalador, outro limiar)', r23.scenes.length === 5 && !ensaio(r23.scenes, 2.3).problems.some((p) => p.startsWith('footage')))
}

// ═══ (2) controle de mistério — nada muda ═══
console.log('== (2) controle de mistério ==')
const MISTERIO = [
  { voiceover: 'Three lighthouse keepers vanished from the Flannan Isles in December 1900. The relief boat found the gate shut and the beds unmade.', aiPrompt: 'Storm clouds over a lonely lighthouse on a rocky island.' },
  { voiceover: 'Two oilskin coats were gone. The third still hung on its hook, as if one man had run out in a terrible hurry.', aiPrompt: 'A single oilskin coat swaying on a hook in a dim room.' },
  { voiceover: 'The clock had stopped. The last log entry spoke of a violent storm, yet the sea that night was calm.', aiPrompt: 'Close-up of a stopped wall clock, candle flickering.' },
  { voiceover: 'No bodies were ever found. More than a century later, nobody knows what took them, or why one coat stayed behind.', aiPrompt: 'Empty landing stage battered by waves at dusk.' },
].map((s) => ({ ...s, description: s.aiPrompt, caption: caption(s.voiceover), stockSearchQuery: 'lighthouse' }))
{
  checa('fixture: 86 palavras (o controle de produção)', texto(MISTERIO).split(' ').length === 86)
  const copia = JSON.stringify(MISTERIO)
  const antes = ensaio(MISTERIO, 2.3)
  const r = rodaBloco(MISTERIO, { wps: 2.3 })
  checa('mistério: o MESMO array volta (nada roda), cenas byte a byte', r.scenes === MISTERIO && JSON.stringify(r.scenes) === copia)
  checa('mistério: clipCount e relato inalterados', r.clipCount === 4 && r.relato === null)
  checa('mistério: veredito do ensaio idêntico ao de antes e PASS (37,4 s em 40 s)', antes.pass && JSON.stringify(ensaio(r.scenes, 2.3)) === JSON.stringify(antes) && antes.speech_seconds === 37.4)
}

// ═══ (3) outros motores e o 15 s: o bloco não roda ═══
console.log('== (3) só o Seedance 35/60/90 ==')
for (const [nome, flags] of [['Kling 2.5', { wantsKling: true }], ['Veo 3.1', { wantsVeo: true }], ['Sora', { wantsSora: true }], ['Seedance 15 s', { seedanceShortFilm: true }], ['hollywood', { hollywoodPath: true }]]) {
  const r = rodaBloco(VERSAILLES, { flags })
  checa(`${nome}: cenas intocadas`, r.scenes === VERSAILLES && r.relato === null)
}
{
  const comSegundos = VERSAILLES.map((s) => ({ ...s, clipSeconds: 10 }))
  checa('cenas que já têm segundos próprios (planos assinados): intocadas', rodaBloco(comSegundos).scenes === comSegundos)
}

// ═══ (4) limites ═══
console.log('== (4) limites ==')
{
  const longa = Array.from({ length: 9 }, (_, i) => ({ voiceover: Array.from({ length: 4 }, (_, j) => `Fact ${i}-${j} about the palace grounds and its long history.`).join(' '), aiPrompt: `shot ${i}`, description: `shot ${i}`, caption: '' }))
  const r = rodaBloco(longa, { wps: 2.45 })
  checa('fala enorme (90 s): teto de 12 clipes, relato marca ainda_curta', r.scenes.length === 12 && r.relato.ainda_curta === true && texto(r.scenes) === texto(longa))
  const curtas = [{ voiceover: 'Short line one here.', aiPrompt: 'a' }, { voiceover: 'Another tiny line.', aiPrompt: 'b' }]
  const rc = C.cobrirFalaComImagem(curtas, { wordsPerSecond: 0.1, fazerCena: (b, f) => ({ ...b, voiceover: f }) })
  checa('cena com menos de 8 palavras não vira fala picotada', rc.cenas.length === 2 && rc.ainda_curta === true)
  checa('pontoDeCorte prefere a fronteira de frase mais perto do meio', C.pontoDeCorte('One two three four five. Six seven eight nine ten eleven.'.split(' ')) === 5)
}

// ═══ (5) ligação na rota ═══
console.log('== (5) rota ==')
checa('import da lib', rt.includes(`import { cobrirFalaComImagem, SEEDANCE_COBRE_VARIACAO } from '@/lib/cinematic/seedanceCobreAFala' // ${MARCA}`))
const iVeoIA = rt.indexOf('    let veoAiRelato: ')
const iCurto = rt.indexOf('    let seedanceClipSeconds: number[] | null = null')
const iScrub = rt.indexOf('    // KINEO-VIGIA-CENARIO-2026-09-11 — antes de qualquer still ou clipe pago,')
const iAlinha = rt.indexOf('    let alinhamentoFalaImagem: AlignReport | null = null')
const iAncora = rt.indexOf('scenes[i].aiPrompt = ancorarLugarNoPrompt(')
checa('o bloco roda depois das réguas do Veo e do 15 s e ANTES do scrub, do supervisor fala×imagem, da âncora do lugar e das stills', iVeoIA > 0 && iCurto > iVeoIA && iIni > iCurto && iScrub > iIni && iAlinha > iScrub && iAncora > iAlinha)
checa('o ensaio de $0 devolve o relato da cobertura', rt.includes(`...(seedanceCoberturaRelato ? { cobertura_da_fala: seedanceCoberturaRelato } : {}), // ${MARCA}`))
checa('toda linha do bloco leva a marca', bloco.split('\n').filter(Boolean).every((l) => l.includes(MARCA)))

console.log(`\n${ok} ok, ${falhas.length} falha(s)`)
if (falhas.length) { for (const f of falhas) console.log(' - ' + f); process.exit(1) }
