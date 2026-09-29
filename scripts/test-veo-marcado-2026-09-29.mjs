// [TRAVA 8.2] VEO-MARCADO-2026-09-29 — guardião do Veo 3.1 com ROTEIRO MARCADO (HOOK/MICRO REWARD/… com [Pexels: …] por bloco).
// Palavra do fundador (29/09): "quero o Veo pronto pra amanhã". Auditoria de 29/09, dois furos: (1) o #442 dimensiona o verbatim em
// min(9, …) e resolveVerbatimSegments AMOSTRA 9 blocos por índice (descarta, não funde) — 12 blocos em 60 s viravam 9 cenas; (2) o
// bloco acima de fit8 (17 palavras a 2,3 pal/s) ganhava 8 s e a fala invadia o plano seguinte. Este guardião EXECUTA a lib real,
// o parser real e fatias reais da rota (readFileSync + transpile + vm; sem rede, sem banco, sem fornecedor) e prova:
//   (a) parser real: o roteiro marcado de 12 blocos / 60 s vira 12 segmentos e a narração é a união deles; a base (teto 9) descarta
//       3 blocos (o texto some da lista de cenas); lib: teto 12-18 pela imagem do filme; veoMarkedBeats funde acima do teto, nunca
//       descarta; veoMarkedPlan: 12 blocos → 13-14 planos, o HOOK de 31 palavras dividido em 2-3 planos que cabem em 8 s
//       (fim de frase / vírgula), nenhuma palavra perdida, clip_word_starts crescentes, cobertura ≥ o filme; teto 12 → sem vaga,
//       HOOK fica em 8 s e vai a `transbordam`; veoVerbatimPlan sem footageSeconds idêntico à base (a prosa não muda);
//   (b) fatias REAIS da rota: o bloco novo substitui as 9 cenas amostradas por 13-14 planos com clipSeconds 4|6|8 e a descrição
//       [Pexels: …] herdada; wantsVeo falso / modo IA / prosa sem marcador = nada muda; o bloco dos planos do Veo (mais abaixo) lê
//       os segundos prontos; o claim assinado (clip_word_starts) nasce crescente; a rota chama veoVerbatimPlan e veoSceneSeconds
//       UMA vez cada (a trava de test-veo-planos), veoMarkedPlan e veoMaxShots uma vez cada;
//   (c) Seedance / Kling 2.5 / Sora / hollywood byte a byte: verbatimBeats, klingShots, scriptParser, compose, classicDryRun,
//       runway intocados; o Seedance com o MESMO roteiro sai com as MESMAS 9 cenas da base (lib da base executada); as fatias da
//       rota do #442, do seletor #369, do Kling, do Seedance e dos dois blocos do Veo idênticas à base; TODA linha nova da rota
//       mora no bloco do VEO-MARCADO, no import e no relato do ensaio (diff contra a base); nenhuma linha da base apagada;
//   (d) custo: 12 blocos / 169 palavras a 60 s — antes 9 × 8 s = US$ 7,20 (com 3 blocos sem plano); depois 13-14 planos ≈ US$ 8-9;
//   (e) mutantes: teto 9 de volta na lib → 9 cenas → vermelho; lib sem dividir → HOOK em 8 s transbordando → vermelho; bloco da
//       rota sem `wantsVeo` → Seedance ganharia o bloco → vermelho.
import { readFileSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import vm from 'node:vm'
import ts from 'typescript'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const RAIZ = resolve(join(dirname(fileURLToPath(import.meta.url)), '..'))
process.chdir(RAIZ)
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) ok++; else { falhas.push(n); console.log('  FALHOU: ' + n) } }
const roda = (src, globals = {}) => {
  const js = ts.transpileModule(src, { compilerOptions: { module: 1, target: 9 } }).outputText
  const exp = {}
  vm.runInNewContext(js, { exports: exp, console: { log() {}, warn() {}, error() {} }, JSON, Math, Number, Array, Object, Set, Map, String, process: { env: {} }, ...globals })
  return exp
}
const fatia = (src, ini, fim) => { const a = src.indexOf(ini); if (a < 0) return null; const b = src.indexOf(fim, a + ini.length); return b < 0 ? null : src.slice(a, b + fim.length) }
// [TRAVA 8.2 — "vai conserta" do fundador, 29/09] KINEO-VOZ-15S-MESMA-DA-MONTAGEM-2026-09-29 — o /api/compose ganhou só o import e o bloco
// marcados da voz assinada do filme de 15 s (linhas acrescentadas, antes de `vertical`/`explicitSpeed`); fora deles, byte a byte a base.
const semVoz15Base = (p, s) => { if (p !== 'app/api/compose/route.ts' || s == null) return s; const bloco = fatia(s, '    // [TRAVA 8.2 — "vai conserta" do fundador, 29/09] KINEO-VOZ-15S-MESMA-DA-MONTAGEM-2026-09-29 — o filme de 15 s do', '    if (vozAssinada) { body.vertical = vozAssinada.vertical; body.speed = vozAssinada.speed }\n'); return (bloco ? s.split(bloco).join('') : s).split('\n').filter((l) => !(l.startsWith('import {') && l.includes("from '@/lib/vozDoFilmeCurto'"))).join('\n') }
// [TRAVA 8.2 — aguarda "vai E4" do fundador] KINEO-E4-SAIDA-B-2026-09-29 — reancorado com motivo: a E4 acrescenta ao /api/compose
// só o import marcado e o portão do Kineo 1 no ramo free-plan-fast (antes de `if (isFreePlanFast) {`), e à rota do cinematic
// só linhas marcadas (imports, admissão da cota semanal e o aviso region_paid_only dentro do gate de plano). Fora delas, a base.
const semE4 = (p, s) => { if (p !== 'app/api/compose/route.ts' || s == null) return s; const bloco = fatia(s, '        // ═══ KINEO-E4-SAIDA-B-2026-09-29 — PORTÃO DO KINEO 1 no ramo free-plan-fast', '        if (isFreePlanFast) {\n'); return (bloco ? s.split(bloco).join('        if (isFreePlanFast) {\n') : s).split('\n').filter((l) => !(l.startsWith('import {') && l.includes('KINEO-E4-SAIDA-B-2026-09-29'))).join('\n') }
// [TRAVA 8.2 — aguarda "vai E4" do fundador] KINEO-E4-CONSERTO-2026-09-29 — reancorado com motivo (revisão de dinheiro,
// achado 2): no ramo free-plan-fast do /api/compose a reserva da cota ganhou um desvio marcado para a casa e o Autopilot
// (claim de custo 0 sem a contagem da cota em 0). Tirando o bloco marcado, voltam as duas linhas da base.
const semE4Conserto = (p, s) => { if (p !== 'app/api/compose/route.ts' || s == null) return s; const bloco = fatia(s, '          // KINEO-E4-CONSERTO-2026-09-29 (achado 2)', '            if (quotaResponse) return quotaResponse\n          }\n'); return bloco ? s.split(bloco).join('          const quotaResponse = await reserveFreeFastPreviewSlot()\n          if (quotaResponse) return quotaResponse\n') : s }
const semVoz15 = (p, s) => semE4Conserto(p, semE4(p, semVoz15Base(p, s)))
const blocosE4Rota = (r) => [fatia(r, '    // ═══ KINEO-E4-SAIDA-B-2026-09-29 [TRAVA 8.2 — "vai E4" do fundador] — ADMISSÃO DA COTA SEMANAL NOVA ═══', '    // PUSH #20 — every premium AI engine is paid-only.'), fatia(r, '      // KINEO-E4-SAIDA-B-2026-09-29 — a cota semanal nova é a única outra exceção', '        )\n      }\n'), fatia(r, '    // ═══ KINEO-E4-CONSERTO-2026-09-29 [TRAVA 8.2 — "vai E4" do fundador] (revisão de dinheiro, achado 5) ═══', '    // KINEO-CAPACITY-2026-08-08 — DISJUNTOR GLOBAL'), ...r.split('\n').filter((l) => l.includes('KINEO-E4-SAIDA-B-2026-09-29') || l.includes('KINEO-E4-CONSERTO-2026-09-29'))]
const eqJ = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const palavras = (t) => String(t ?? '').trim().split(/\s+/).filter(Boolean)
const conta = (src, re) => (src.match(re) || []).length
const git = (args) => execFileSync('git', args, { cwd: RAIZ, maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] }).toString()

const MARCA = 'VEO-MARCADO-2026-09-29'
const ROTA = 'app/api/generate-video-cinematic/route.ts'
const LIB = 'lib/cinematic/veoShots.ts'
// BASE = o "antes" deste trabalho: o pai do commit mais antigo "VEO-MARCADO" na história de HEAD; antes do commit existir, o
// próprio HEAD; senão origin/main. A base escolhida tem de NÃO conter o marcador.
let BASE = null
{
  const candidatos = []
  try { const shas = git(['log', '--format=%H', '--grep=VEO-MARCADO', 'HEAD']).trim().split('\n').filter(Boolean); if (shas.length) candidatos.push(shas[shas.length - 1] + '^') } catch { /* sem commit ainda */ }
  candidatos.push('HEAD', 'origin/main')
  for (const ref of candidatos) {
    try { if (!git(['show', `${ref}:${ROTA}`]).includes(MARCA)) { BASE = ref; break } } catch { /* tenta o próximo */ }
  }
}
console.log(`   base de comparação: ${BASE ?? '(nenhuma)'}`)
const rdBase = (p) => { if (!BASE) return null; try { return git(['show', `${BASE}:${p}`]).replace(/\r\n/g, '\n') } catch { return null } }
checa('a base (o Veo com teto 9 no roteiro marcado) está disponível para as comparações byte a byte', Boolean(BASE))

const rota = rd(ROTA)
const rotaBase = rdBase(ROTA)
const libSrc = rd(LIB)
const libBase = rdBase(LIB)
const routeAst = (src) => ts.createSourceFile('route.ts', src, ts.ScriptTarget.Latest, true)
function acha(ast, pred) { let f; const v = (n) => { if (!f && pred(n)) f = n; if (!f) ts.forEachChild(n, v) }; v(ast); return f }
const funcaoDe = (src, nome) => { const ast = routeAst(src); const n = acha(ast, (x) => ts.isFunctionDeclaration(x) && x.name?.text === nome); return n ? n.getText(ast) : null }

// ═══ (a) parser real + lib real ═══
console.log('== (a) parser real, verbatimBeats (a base) e lib/cinematic/veoShots — roteiro marcado ==')
const load = createOfflineLoader({})
const V = load('@/lib/cinematic/veoShots')
const K = load('@/lib/cinematic/klingShots')
const VB = load('@/lib/cinematic/verbatimBeats')
const parseUserScript = load('@/lib/scriptParser').parseUserScript
const rodaLib = (src) => {
  const js = ts.transpileModule(src, { compilerOptions: { module: 1, target: 9 } }).outputText
  const exp = {}
  vm.runInNewContext(js, { exports: exp, require: (n) => load(n === './klingShots' ? '@/lib/cinematic/klingShots' : n), console: { log() {}, warn() {}, error() {} }, JSON, Math, Number, Array, Object, Set, Map, String, process: { env: {} } })
  return exp
}
const useful = (s) => K.kling25UsefulSeconds(s)

// Roteiro REAL no formato da casa (o da Batalha de Los Angeles, o canário S25 de 01-02/09, reescrito em 12 blocos para 60 s; o HOOK
// tem 31 palavras — o caso do furo 2). 169 palavras.
const ROTEIRO_12 = `HOOK
[Pexels: anti-aircraft searchlights night sky 1940s]
In February 1942, the sky above Los Angeles lit up with anti-aircraft fire, and for over an hour gunners fired more than fourteen hundred shells at something no one could identify.

MICRO REWARD
[Pexels: searchlight beams converging night]
Searchlights converged on a single object drifting slowly over the coast.

MICRO REWARD
[Pexels: vintage newspaper front page 1942]
Witnesses described a glowing shape that never changed course, even under direct fire.

ESCALATION
[Pexels: empty beach dawn california]
Not a single bomb fell, and no wreckage was ever recovered.

ESCALATION
[Pexels: old newspaper printing press]
The next morning, newspapers printed photographs of the beams crossing in the dark.

ESCALATION
[Pexels: army officer wartime press conference]
The Army said it was nerves; the Navy said there was nothing there at all.

RHYTHM
[Pexels: blackout city street night 1940s]
Five people died that night, from car accidents and heart attacks during the blackout.

ESCALATION
[Pexels: declassified documents folder stamp]
Decades later, declassified memos still disagree about what the gunners were shooting at.

ESCALATION
[Pexels: weather balloon night sky]
Some say a weather balloon; others say the fog itself was the enemy.

RHYTHM
[Pexels: anti-aircraft gun firing night]
Whatever it was, the city fired for an hour and hit nothing.

PAYOFF
[Pexels: los angeles skyline night mystery]
The Battle of Los Angeles has never been solved, and it probably never will be.

CTA
[Pexels: follow button dark cinematic]
Follow, because the next mystery is already declassified.
`
const WPS = 2.55 // persona finance-authority / documentary: o passo do plano cai a 2,3
const parsed = parseUserScript(ROTEIRO_12)
const vozes = parsed.segments.map((s) => s.voiceover)
const uniao = (falas) => palavras(falas.join(' ')).join(' ')
checa('parser real: o roteiro de 12 blocos vira 12 segmentos com [Pexels: …] e fala, e a narração do autor é a UNIÃO exata deles (169 palavras)', parsed.hasMarkers && parsed.segments.length === 12 && palavras(parsed.narration).length === 169 && uniao(vozes) === palavras(parsed.narration).join(' ') && parsed.segments.every((s) => s.pexelsQuery.length > 0 && palavras(s.voiceover).length > 0))
checa('o HOOK tem 31 palavras (> fit8 = 17): o caso do furo 2; os outros 11 blocos têm 8-15 palavras (cabem em 8 s)', palavras(vozes[0]).length === 31 && vozes.slice(1).every((v) => palavras(v).length >= 8 && palavras(v).length <= 15))
const base9 = VB.resolveVerbatimSegments(parsed, 9)
const perdidas = 169 - palavras(base9.map((s) => s.voiceover).join(' ')).length
checa(`a base (resolveVerbatimSegments com teto 9) DESCARTA — não funde: 12 blocos → 9 cenas, ${perdidas} palavras de 3 blocos somem da lista de cenas (a narração inteira ainda é falada: o furo 1)`, base9.length === 9 && perdidas > 0 && base9[0].voiceover === vozes[0] && base9[8].voiceover === vozes[11] && uniao(base9.map((s) => s.voiceover)) !== uniao(vozes))
checa('resolveVerbatimSegments trava em 9 mesmo pedindo 12 (Math.min(9, …) dentro da lib — Seedance/Kling/Sora seguem assim)', VB.resolveVerbatimSegments(parsed, 12).length === 9 && VB.resolveVerbatimSegments(parsed, 18).length === 9)

const filme = V.veoFilmSeconds({ durationSeconds: 60, verbatimWords: 169, wordsPerSecond: WPS })
const TETO = V.veoMaxShots({ verbatim: true, footageSeconds: filme })
checa('teto do roteiro marcado no Veo = veoMaxShots pela imagem que o filme pede: 169 palavras a 2,3 pal/s ≈ 73,5 s → 18 planos (12-18; o Kling do KLING25-60S-TETO); 100 palavras a 35 s (43,5 s) → 13', filme === 73.5 && TETO === 18 && V.veoMaxShots({ verbatim: true, footageSeconds: V.veoFilmSeconds({ durationSeconds: 35, verbatimWords: 100, wordsPerSecond: WPS }) }) === 13)
checa('veoMarkedBeats: 12 blocos sob teto 18 → os mesmos 12 (fala e pista visual intactas); teto 9 → 9 grupos de vizinhos FUNDIDOS por índice (3 pares: blocos 3+4, 7+8, 11+12), união idêntica, pista visual unida; teto 5 → 5', (() => {
  const b18 = V.veoMarkedBeats(parsed.segments, 18), b9 = V.veoMarkedBeats(parsed.segments, 9), b5 = V.veoMarkedBeats(parsed.segments, 5)
  return b18.length === 12 && b18.every((b, i) => b.voiceover === vozes[i] && b.pexelsQuery === parsed.segments[i].pexelsQuery) && b9.length === 9 && uniao(b9.map((b) => b.voiceover)) === uniao(vozes) && b9[0].voiceover === vozes[0] && b9[2].voiceover === vozes[2] + ' ' + vozes[3] && b9[2].pexelsQuery === parsed.segments[2].pexelsQuery + ' ' + parsed.segments[3].pexelsQuery && b9[8].voiceover === vozes[10] + ' ' + vozes[11] && b5.length === 5 && uniao(b5.map((b) => b.voiceover)) === uniao(vozes)
})())
const plano = V.veoMarkedPlan(parsed.narration, vozes, { durationSeconds: 60, wordsPerSecond: WPS, maxShots: TETO })
const fit8 = plano.fit[2]
console.log(`   plano do roteiro marcado: ${plano.shots.length} planos [${plano.seconds.join(',')}] · passo ${plano.pace} · fit ${plano.fit.join('/')} · filme ${plano.needSeconds}s · divididas ${JSON.stringify(plano.divididas)} · transbordam ${JSON.stringify(plano.transbordam)}`)
console.log(`   HOOK dividido: ${plano.shots.filter((s) => s.scene === 0).map((s) => `"${s.voiceover}" (${palavras(s.voiceover).length})`).join(' | ')}`)
checa('veoMarkedPlan: passo min(voz, 2,3) = 2,3; 4/6/8 s cabem 8/12/17 palavras; filme ≈ 73,5 s', plano.pace === 2.3 && eqJ(plano.fit, [8, 12, 17]) && plano.needSeconds === 73.5)
checa('12 blocos → 13-14 planos: só o HOOK (31 palavras) é dividido, em 2-3 planos; nenhum bloco transborda', plano.shots.length >= 13 && plano.shots.length <= 14 && eqJ(plano.divididas, [0]) && eqJ(plano.transbordam, []) && plano.shots.filter((s) => s.scene === 0).length === plano.shots.length - 11)
checa('as partes do HOOK cortam em fronteira de frase/vírgula/palavra e CADA uma cabe em 8 s (≤ 17 palavras atribuídas); a 1ª começa em "In February 1942," e a última termina em "identify."', (() => {
  const partes = plano.shots.filter((s) => s.scene === 0)
  return partes.every((s, k) => s.split && plano.assigned[k] <= fit8 && plano.assigned[k] > 0) && partes[0].voiceover.startsWith('In February 1942,') && partes[partes.length - 1].voiceover.endsWith('identify.')
})())
checa('NENHUMA palavra some nem muda de ordem: os planos unidos = os 12 blocos unidos = a narração do autor; os 11 blocos não divididos mantêm o texto original', uniao(plano.shots.map((s) => s.voiceover)) === uniao(vozes) && plano.shots.filter((s) => !s.split).every((s) => s.voiceover === vozes[s.scene]))
checa('cada plano recebe 4|6|8 s e a sua fala atribuída cabe no passo (palavras ≤ fit do passo); a soma útil cobre o filme (≥ 73,5 s)', plano.seconds.every((s, k) => V.VEO_SHOT_STEPS.includes(s) && plano.assigned[k] <= plano.fit[V.VEO_SHOT_STEPS.indexOf(s)]) && plano.seconds.reduce((a, s) => a + useful(s), 0) >= plano.needSeconds)
const inicios = K.kling25SceneWordStarts(parsed.narration, plano.shots.map((s) => s.voiceover))
checa('clip_word_starts (kling25SceneWordStarts, a linha do claim) sobre os planos finais: começa em 0 e é ESTRITAMENTE crescente — o compose corta cada plano na 1ª palavra da própria fala', inicios[0] === 0 && inicios.every((x, i) => i === 0 || x > inicios[i - 1]) && inicios.length === plano.shots.length)
const planoTeto = V.veoMarkedPlan(parsed.narration, vozes, { durationSeconds: 60, wordsPerSecond: WPS, maxShots: 12 })
checa('teto 12 com 12 blocos: sem vaga — o HOOK NÃO é dividido, fica em 8 s e vai a `transbordam` (o relato avisa; nada some)', planoTeto.shots.length === 12 && eqJ(planoTeto.divididas, []) && eqJ(planoTeto.transbordam, [0]) && planoTeto.seconds[0] === 8 && uniao(planoTeto.shots.map((s) => s.voiceover)) === uniao(vozes))
const planoTeto13 = V.veoMarkedPlan(parsed.narration, vozes, { durationSeconds: 60, wordsPerSecond: WPS, maxShots: 13 })
checa('teto 13 com 12 blocos: UMA vaga — o HOOK vira exatamente 2 planos, as duas partes cabem em 8 s', planoTeto13.shots.length === 13 && eqJ(planoTeto13.divididas, [0]) && eqJ(planoTeto13.transbordam, []) && planoTeto13.assigned.slice(0, 2).every((w) => w <= fit8))
checa('fundir + planejar (9 grupos, teto 18): união idêntica; o HOOK (31) e o par fundido 3+4 (24 palavras) são divididos; nenhum grupo transborda; 11-15 planos', (() => {
  const b9 = V.veoMarkedBeats(parsed.segments, 9)
  const p = V.veoMarkedPlan(parsed.narration, b9.map((b) => b.voiceover), { durationSeconds: 60, wordsPerSecond: WPS, maxShots: 18 })
  return uniao(p.shots.map((s) => s.voiceover)) === uniao(vozes) && p.divididas.includes(0) && p.divididas.includes(2) && eqJ(p.transbordam, []) && p.shots.length >= 11 && p.shots.length <= 15 && p.assigned.every((w) => w <= fit8)
})())
checa('bloco de UMA palavra acima do fit (impossível de dividir) e bloco vazio não quebram: 8 s + `transbordam` / 4 s', (() => {
  const p = V.veoMarkedPlan('', ['', 'w1 w2 w3.'], { durationSeconds: 35, wordsPerSecond: WPS, maxShots: 18 })
  return p.shots.length === 2 && p.seconds[0] === 4 && p.seconds.length === 2
})())
if (libBase) {
  const B = rodaLib(libBase)
  const PROSA = 'In 1942, the sky above Los Angeles lit up with anti-aircraft fire. For over an hour, gunners fired more than fourteen hundred shells at something no one could identify. Searchlights converged on a single object drifting slowly over the coast. Witnesses described a glowing shape that never changed course, even under direct fire. Not a single bomb fell, and no wreckage was ever recovered. The next morning, newspapers printed photographs of the beams crossing in the dark. The Army said it was nerves; the Navy said there was nothing there at all. Five people died that night, from car accidents and heart attacks during the blackout. Decades later, declassified memos still disagree about what the gunners were shooting at. Some say a weather balloon; others say the fog itself was the enemy. Whatever it was, the city fired for an hour and hit nothing. The mystery of the Battle of Los Angeles has never been solved, and it probably never will be.'
  const casos = [[35, 2.55], [60, 2.55], [60, 2.3], [90, 3.1]].map(([d, w]) => [V.veoVerbatimPlan(PROSA, { durationSeconds: d, wordsPerSecond: w }), B.veoVerbatimPlan(PROSA, { durationSeconds: d, wordsPerSecond: w })])
  checa('veoVerbatimPlan SEM footageSeconds (o verbatim em prosa de VEO-PLANOS) devolve chunks/segundos/needSeconds idênticos à lib da base em 4 casos — a prosa não mudou', casos.every(([a, b]) => eqJ(a, b)))
  checa('veoVerbatimPlan com footageSeconds: 0 (a divisão de um bloco marcado) não promove cobertura: needSeconds 0 e cada parte no menor passo que a comporta', (() => { const p = V.veoVerbatimPlan(vozes[0], { durationSeconds: 60, wordsPerSecond: WPS, footageSeconds: 0, maxShots: 3 }); return p.needSeconds === 0 && p.chunks.length >= 2 && p.chunks.length <= 3 && p.seconds.every((s, k) => s === V.veoStepFor(palavras(p.chunks[k]).length, p.pace)) })())
  checa('veoAiPlan, veoSceneSeconds, veoMaxShots, veoStepFor, veoFitWords: idênticos à base para as mesmas entradas (o modo IA e o divisor não mudaram)', (() => {
    const cenas = ['w1 w2 w3 w4 w5 w6.', 'w1 w2 w3 w4 w5 w6 w7 w8 w9 w10 w11 w12 w13 w14 w15 w16 w17 w18 w19 w20.', 'w1 w2 w3.']
    return eqJ(V.veoAiPlan(cenas, { footageSeconds: 38, wordsPerSecond: WPS }), B.veoAiPlan(cenas, { footageSeconds: 38, wordsPerSecond: WPS })) && eqJ(V.veoSceneSeconds([5, 10, 16, 30], 61.5, 2.3), B.veoSceneSeconds([5, 10, 16, 30], 61.5, 2.3)) && [0, 30, 61.5, 73.5, 93].every((f) => V.veoMaxShots({ verbatim: true, footageSeconds: f }) === B.veoMaxShots({ verbatim: true, footageSeconds: f })) && eqJ(V.veoFitWords(2.3), B.veoFitWords(2.3)) && [1, 8, 9, 12, 13, 17, 18].every((w) => V.veoStepFor(w, 2.3) === B.veoStepFor(w, 2.3))
  })())
}

// ═══ (b) fatias reais da rota ═══
console.log('== (b) rota: import, bloco do roteiro marcado, bloco dos planos do Veo, claim e ensaio ==')
const IMPORT_MARCADO = "import { veoMaxShots, veoMarkedBeats, veoMarkedPlan } from '@/lib/cinematic/veoShots' // [TRAVA 8.2] VEO-MARCADO-2026-09-29 — só wantsVeo && verbatim && parsedScript.segments.length > 0 (linha própria: a rota só GANHA linhas)\n"
const INI_BLOCO = '    // ═══ [TRAVA 8.2] VEO-MARCADO-2026-09-29 — no Veo 3.1 o roteiro MARCADO'
const FIM_BLOCO = '        clipCount = scenes.length\n      }\n    }\n'
const blocoMarcado = (src) => fatia(src, INI_BLOCO, FIM_BLOCO)
const corpoMarcado = (src) => fatia(src, '    let veoMarcadoRelato: ', FIM_BLOCO)
const LINHA_RELATO = '        ...(veoMarcadoRelato ? { veo_marked_plan: veoMarcadoRelato } : {}),\n'
const blocoVeoProsa = (src) => fatia(src, 'if (wantsVeo && verbatim && parsedScript.segments.length === 0 && scenes.length > 0) {', 'clipCount = scenes.length\n      }\n    }')
const blocoVeoPlanos = (src) => fatia(src, 'if (wantsVeo && verbatim && scenes.length > 0) {', '(antes: ${scenes.length} × 8 s)`)\n    }')
checa('a rota importa veoMaxShots/veoMarkedBeats/veoMarkedPlan numa linha PRÓPRIA e marcada, depois da do modo IA; os imports de VEO-PLANOS e VEO-MODO-IA ficam intocados', rota.includes(IMPORT_MARCADO) && rota.indexOf(IMPORT_MARCADO) > rota.indexOf("VEO_MAX_SHOTS } from '@/lib/cinematic/veoShots' // [TRAVA 8.2] VEO-MODO-IA-2026-09-29") && (rotaBase ? rotaBase.split('\n').filter((l) => l.includes("from '@/lib/cinematic/veoShots'")).every((l) => rota.includes(l)) : true))
checa('o bloco do roteiro marcado existe sob `wantsVeo && verbatim && parsedScript.segments.length > 0 && scenes.length > 0`, DEPOIS do bloco do verbatim em prosa do Veo e ANTES do bloco do Kling em prosa (e do fallback de zero cenas)', (() => {
  const b = blocoMarcado(rota)
  return b && b.includes('if (wantsVeo && verbatim && parsedScript.segments.length > 0 && scenes.length > 0) {') && rota.indexOf(blocoVeoProsa(rota)) < rota.indexOf(INI_BLOCO) && rota.indexOf(INI_BLOCO) < rota.indexOf('if (wantsKling && verbatim && parsedScript.segments.length === 0 && scenes.length > 0) {') && rota.indexOf(INI_BLOCO) < rota.indexOf('KINEO-ZERO-SCENES-FALLBACK-2026-09-04')
})())
checa('o ensaio de $0 traz veo_marked_plan logo depois de veo_ai_plan', rota.includes(LINHA_RELATO) && rota.indexOf(LINHA_RELATO) > rota.indexOf('...(veoAiRelato ? { veo_ai_plan: veoAiRelato } : {}),\n'))
checa('a rota chama veoVerbatimPlan e veoSceneSeconds UMA vez cada (a trava de test-veo-planos), veoMarkedPlan, veoMarkedBeats e veoMaxShots uma vez cada, todas dentro do bloco novo', conta(rota, /veoVerbatimPlan\(/g) === 1 && conta(rota, /veoSceneSeconds\(/g) === 1 && conta(rota, /veoMarkedPlan\(/g) === 1 && conta(rota, /veoMarkedBeats\(/g) === 1 && conta(rota, /veoMaxShots\(/g) === 1 && blocoMarcado(rota).includes('veoMarkedPlan(') && blocoMarcado(rota).includes('veoMarkedBeats(') && blocoMarcado(rota).includes('veoMaxShots('))
const cenasDaBase = () => VB.resolveVerbatimSegments(parsed, 9).map((seg) => ({ description: seg.pexelsQuery, voiceover: seg.voiceover, caption: palavras(seg.voiceover).slice(0, 8).join(' '), stockSearchQuery: seg.pexelsQuery }))
function rodaBloco(src, { wantsVeo = true, verbatim = true, parsedScript = parsed, duration = 60, wps = WPS, lib = V } = {}) {
  const b = corpoMarcado(src)
  if (!b) return null
  const g = {
    wantsVeo, verbatim, parsedScript, duration, narrationRate: { wordsPerSecond: wps },
    veoMaxShots: lib.veoMaxShots, veoFilmSeconds: lib.veoFilmSeconds, veoMarkedBeats: lib.veoMarkedBeats, veoMarkedPlan: lib.veoMarkedPlan, veoClipsUsd: lib.veoClipsUsd,
    shortCaptionFromVoiceover: (t) => palavras(t).slice(0, 8).join(' '),
  }
  return roda(`export function run() { let scenes = ${JSON.stringify(cenasDaBase())}; let clipCount = scenes.length\n${b}\n return { scenes, clipCount, veoMarcadoRelato } }`, g).run()
}
const r = rodaBloco(rota)
checa('rota real (Veo, roteiro marcado de 12 blocos, 60 s): as 9 cenas amostradas viram 13-14 planos com clipSeconds 4|6|8; clipCount acompanha', r && r.scenes.length >= 13 && r.scenes.length <= 14 && r.scenes.every((s) => [4, 6, 8].includes(s.clipSeconds)) && r.clipCount === r.scenes.length)
checa('cada plano leva a descrição/stockSearchQuery do [Pexels: …] do SEU bloco (as partes do HOOK herdam a do HOOK); legenda da própria fala; a união das falas = a narração do autor', r && r.scenes.slice(0, r.scenes.length - 11).every((s) => s.description === parsed.segments[0].pexelsQuery && s.stockSearchQuery === parsed.segments[0].pexelsQuery) && r.scenes.slice(-11).every((s, k) => s.description === parsed.segments[k + 1].pexelsQuery && s.voiceover === vozes[k + 1]) && r.scenes.every((s) => s.caption === palavras(s.voiceover).slice(0, 8).join(' ')) && uniao(r.scenes.map((s) => s.voiceover)) === uniao(vozes))
checa('o relato do ensaio: 12 blocos, 9 cenas antes, 13-14 planos, teto 18, sem fusão, divididas [1] (1-based), transbordam []', r && r.veoMarcadoRelato && r.veoMarcadoRelato.blocos === 12 && r.veoMarcadoRelato.cenas_antes === 9 && r.veoMarcadoRelato.planos === r.scenes.length && r.veoMarcadoRelato.teto === 18 && r.veoMarcadoRelato.fundidos === false && eqJ(r.veoMarcadoRelato.divididas, [1]) && eqJ(r.veoMarcadoRelato.transbordam, []))
const rNao = rodaBloco(rota, { wantsVeo: false })
const rIa = rodaBloco(rota, { verbatim: false })
const rProsa = rodaBloco(rota, { parsedScript: { hasMarkers: false, segments: [], narration: parsed.narration, speed: null } })
checa('wantsVeo falso (Seedance/Kling/Sora), modo IA ou prosa sem marcador: o bloco não roda — as 9 cenas da base intactas, sem clipSeconds, relato null, clipCount 9', [rNao, rIa, rProsa].every((x) => x && x.scenes.length === 9 && x.scenes.every((s) => s.clipSeconds === undefined) && x.veoMarcadoRelato === null && x.clipCount === 9 && eqJ(x.scenes, cenasDaBase())))
// o bloco dos planos do Veo (VEO-PLANOS, intocado) lê os segundos prontos
function rodaPlanos(src, scenes) {
  const b = blocoVeoPlanos(src)
  if (!b) return null
  const g = { wantsVeo: true, verbatim: true, parsedScript: parsed, duration: 60, narrationRate: { wordsPerSecond: WPS }, veoAssignedWords: V.veoAssignedWords, kling25PlanPace: K.kling25PlanPace, veoSceneSeconds: V.veoSceneSeconds, veoFilmSeconds: V.veoFilmSeconds, veoClipsUsd: V.veoClipsUsd }
  return roda(`export function run() { let scenes = ${JSON.stringify(scenes)}; let veoClipSeconds = null; let veoPasso = 0\n${b}\n return { scenes, veoClipSeconds, veoPasso } }`, g).run()
}
const rp = r ? rodaPlanos(rota, r.scenes) : null
checa('o bloco dos planos do Veo (intocado) encontra clipSeconds em todas as cenas e os assina como veoClipSeconds, passo 2,3 — sem recalcular', rp && eqJ(rp.veoClipSeconds, r.scenes.map((s) => s.clipSeconds)) && rp.veoPasso === 2.3 && eqJ(rp.scenes.map((s) => s.clipSeconds), r.scenes.map((s) => s.clipSeconds)))
const LINHA_CLAIM = "...(scenes.some((s) => typeof s.clipSeconds === 'number') ? { clip_seconds: scenes.map((s) => s.clipSeconds ?? null), clip_word_starts: kling25SceneWordStarts(voiceoverScript, scenes.map((s) => s.voiceover)) } : {}),"
checa('claim assinado: a linha do Kling/Veo (intocada) grava clip_seconds + clip_word_starts; para os planos do roteiro marcado os inícios saem crescentes e o 1º é 0', rota.includes(LINHA_CLAIM) && r && (() => { const st = K.kling25SceneWordStarts(parsed.narration, r.scenes.map((s) => s.voiceover)); return st[0] === 0 && st.every((x, i) => i === 0 || x > st[i - 1]) })())
checa('o plano viaja pelo builder da fal do Veo (scene.clipSeconds → duration 4s|6s|8s), o mesmo do verbatim em prosa e do modo IA', rota.includes("const input = buildFalInput(m, promptForAttempt, hd, false, scene.clipSeconds,") && rota.includes("duration: typeof seconds === 'number' && seconds > 0 && seconds <= 4 ? '4s' : typeof seconds === 'number' && seconds > 0 && seconds <= 6 ? '6s' : '8s',"))

// ═══ (c) Seedance / Kling 2.5 / Sora / hollywood byte a byte ═══
console.log('== (c) Seedance / Kling 2.5 / Sora / hollywood byte a byte ==')
for (const p of ['lib/cinematic/verbatimBeats.ts', 'lib/cinematic/klingShots.ts', 'lib/scriptParser.ts', 'lib/compose.ts', 'lib/cinematic/classicDryRun.ts', 'lib/runway.ts', 'lib/cinematic/sceneWords.ts', 'lib/speechRate.ts', 'app/api/compose/route.ts', 'lib/cinematic/speechImageAlign.ts']) {
  checa(`${p} byte a byte igual à base${p === 'app/api/compose/route.ts' ? ' (fora o import e o bloco marcados KINEO-VOZ-15S-MESMA-DA-MONTAGEM, só acrescentados)' : ''}`, rdBase(p) !== null && rdBase(p) === semVoz15(p, rd(p)))
}
if (libBase) {
  const VBbase = rodaLib(libBase) // só para provar o carregador; a lib de verbatimBeats da base vem abaixo
  const js = ts.transpileModule(rdBase('lib/cinematic/verbatimBeats.ts') ?? '', { compilerOptions: { module: 1, target: 9 } }).outputText
  const exp = {}
  vm.runInNewContext(js, { exports: exp, Math, Number, Array, String, JSON })
  checa('o Seedance com o MESMO roteiro marcado sai com as MESMAS 9 cenas da base (verbatimBeats da base executada contra a de hoje: idênticas)', typeof VBbase.veoStepFor === 'function' && typeof exp.resolveVerbatimSegments === 'function' && eqJ(exp.resolveVerbatimSegments(parsed, 9), VB.resolveVerbatimSegments(parsed, 9)) && eqJ(exp.resolveVerbatimSegments(parsed, 12), VB.resolveVerbatimSegments(parsed, 12)))
}
const fatiasIntocadas = [
  ['if (verbatim) {\n      const SECONDS_PER_CLIP', 'clipCount = sized\n      }\n    }'],
  ['    if (verbatim) {\n      // #369 — pick `clipCount` beats EVENLY', '      }))\n    } else {\n'],
  ['let kling25Footage = 0', 'clipCount = planos\n    }'],
  ['    let veoFootage = 0\n', '\n    }\n'],
  ['if (wantsKling && verbatim && parsedScript.segments.length === 0', 'clipCount = scenes.length\n      }\n    }'],
  ['if (wantsVeo && verbatim && parsedScript.segments.length === 0 && scenes.length > 0) {', 'clipCount = scenes.length\n      }\n    }'],
  ['if (seedanceShortFilm && verbatim && scenes.length > 0 && scenes.length < SEEDANCE_SHORT_CLIPS', 'clipCount = scenes.length\n      }\n    }'],
  ['let kling25ClipSeconds: number[] | null = null', 'necessário ${kling25Footage}s)`)\n    }'],
  ['if (wantsVeo && verbatim && scenes.length > 0) {', '(antes: ${scenes.length} × 8 s)`)\n    }'],
  ['    let veoAiRelato: ', "transbordam em 8 s: ${veoAiRelato.transbordam.join(',')}` : ''})`)\n    }\n"],
  ['let seedanceClipSeconds: number[] | null = null', 'palavras)`)\n    }'],
  ['    if (scenes.length === 0 && prompt.trim().length > 0) {', "      via = 'verbatim_split'\n        }\n"],
  ['    if (hollywoodPath) {', '    // ── end KINEO-HOLLYWOOD-2026-07-09'],
]
for (const [ini, fim] of fatiasIntocadas) {
  const a = fatia(rota, ini, fim), b = rotaBase ? fatia(rotaBase, ini, fim) : null
  checa(`fatia da rota "${ini.slice(0, 48).replace(/\n/g, ' ').trim()}…" idêntica à base`, a !== null && a === b)
}
checa('buildFalInput (Seedance, Kling, Sora, Veo t2v/i2v, hollywood) byte a byte igual à base', rotaBase !== null && funcaoDe(rota, 'buildFalInput') === funcaoDe(rotaBase, 'buildFalInput'))
if (rotaBase) {
  const diff = git(['diff', '--no-color', '-U0', BASE, 'HEAD', '--', ROTA]).replace(/\r/g, '')
  const worktreeDiff = git(['diff', '--no-color', '-U0', BASE, '--', ROTA]).replace(/\r/g, '')
  const d = worktreeDiff.length ? worktreeDiff : diff
  const adicionadas = d.split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++')).map((l) => l.slice(1))
  const removidas = d.split('\n').filter((l) => l.startsWith('-') && !l.startsWith('---')).map((l) => l.slice(1))
  const permitidas = [blocoMarcado(rota), fatia(rota, '        // [TRAVA 8.2] VEO-MARCADO-2026-09-29 — roteiro marcado: blocos do autor', LINHA_RELATO), IMPORT_MARCADO,
    // [TRAVA 8.2 — "vai conserta" do fundador, 29/09] KINEO-SEEDANCE-BLOCOS-2026-09-29 — o bloco do Seedance 35/60/90 s (roteiro marcado com mais blocos que clipes) mora em peça própria, marcada, sem import novo; este guardião a aceita
    fatia(rota, '    // [TRAVA 8.2 — "vai conserta" do fundador, 29/09] KINEO-SEEDANCE-BLOCOS-2026-09-29', '    // ═══ [TRAVA 8.2] VEO-PLANOS-2026-09-29'),
    // [TRAVA 8.2 — "vai" do 15 s] KINEO-CONTAGEM-FALA-15S-2026-09-29 — o bloco do filme de 15 s do Seedance (roteiro marcado com mais de 3 blocos) mora em bloco próprio, marcado, com import em linha própria; este guardião os aceita
    fatia(rota, '    // [TRAVA 8.2 — "vai" do 15 s] KINEO-CONTAGEM-FALA-15S-2026-09-29 — roteiro marcado', FIM_BLOCO), rota.split('\n').find((l) => l.startsWith('import {') && l.includes("from '@/lib/durationByEngine'") && l.includes('KINEO-CONTAGEM-FALA-15S-2026-09-29')),
    // [TRAVA 8.2 — "vai conserta" do fundador, 29/09] KINEO-VOZ-15S-MESMA-DA-MONTAGEM-2026-09-29 — a voz do filme de 15 s do Seedance (portão = voz da montagem) mora em linhas próprias, marcadas, com import em linha própria; este guardião as aceita
    fatia(rota, '    // [TRAVA 8.2 — "vai conserta" do fundador, 29/09] KINEO-VOZ-15S-MESMA-DA-MONTAGEM-2026-09-29 — no filme de 15 s do', '      if (vozCurta) return vozCurta\n'), fatia(rota, '    // [TRAVA 8.2 — "vai conserta" do fundador, 29/09] KINEO-VOZ-15S-MESMA-DA-MONTAGEM-2026-09-29 — só no filme de 15 s do', 'response.narration_voice = campoDaVozAssinada(vozCurta)\n'), rota.split('\n').find((l) => l.startsWith('import {') && l.includes("from '@/lib/vozDoFilmeCurto'")),
    // [TRAVA 8.2 — "vai conserta" do fundador, 29/09] KINEO-RITMO-POR-IDIOMA-15S-2026-09-29 — o ritmo da língua do filme de 15 s do Seedance (a régua do portão e a guarda de roteiro longo da língua) mora em linhas próprias, marcadas, só ACRESCENTADAS, com import em linha própria; este guardião as aceita
    fatia(rota, '    // [TRAVA 8.2 — "vai conserta" do fundador, 29/09] KINEO-RITMO-POR-IDIOMA-15S-2026-09-29 — no filme de 15 s do', 'narrationRate.wordsPerSecond = ritmoDaVozNoIdioma(narrationRate.wordsPerSecond, narrationLanguage.language)\n'), fatia(rota, '    // [TRAVA 8.2 — "vai conserta" do fundador, 29/09] KINEO-RITMO-POR-IDIOMA-15S-2026-09-29 — a guarda de roteiro longo', '    // ═══ KINEO-SEEDANCE-15S-2026-09-29 [TRAVA 8.2 — "vai" do 15 s] — roteiro longo pedido como filme curto ═══'), rota.split('\n').find((l) => l.startsWith('import {') && l.includes("from '@/lib/durationByEngine'") && l.includes('KINEO-RITMO-POR-IDIOMA-15S-2026-09-29')), ...blocosE4Rota(rota)].filter(Boolean).join('\n').split('\n')
  const foraDoLugar = adicionadas.filter((l) => l.trim() && !permitidas.includes(l))
  checa(`diff da rota contra a base: ${adicionadas.length} linhas novas, todas dentro do bloco do roteiro marcado, do import e do relato (${foraDoLugar.length} fora: ${foraDoLugar.slice(0, 2).map((l) => l.trim().slice(0, 60)).join(' | ')})`, adicionadas.length > 0 && foraDoLugar.length === 0)
  checa(`diff da rota contra a base: NENHUMA linha da base alterada ou apagada — a rota só ganhou linhas (${removidas.length} removida(s))`, removidas.length === 0)
}

// ═══ (d) custo ═══
console.log('== (d) custo por filme (clipes, US$ 0,10/s; stills FLUX à parte) ==')
{
  const antes = V.veoClipsUsd(new Array(9).fill(8))
  const depois = V.veoClipsUsd(plano.seconds)
  console.log(`   60 s / 12 blocos / 169 palavras: antes 9 × 8 s = US$ ${antes.toFixed(2)} (3 blocos sem plano) · depois ${plano.shots.length} planos [${plano.seconds.join(',')}] = US$ ${depois.toFixed(2)} (${depois >= antes ? '+' : ''}${(depois - antes).toFixed(2)})`)
  checa('custo do clipe: antes US$ 7,20 (9 × 8 s); depois entre US$ 7,20 e 9,60 (13-14 planos de 4/6/8 s) — 12 blocos com plano próprio', antes === 7.2 && depois >= 7.2 && depois <= 9.6)
}

// ═══ (e) mutantes ═══
console.log('== (e) mutantes ==')
{
  const m = libSrc.replace('  return Math.max(VEO_MAX_SHOTS_AI, Math.min(VEO_MAX_SHOTS, porImagem))\n', '  return 9\n')
  if (m === libSrc) throw new Error('mutante do teto não aplicou')
  const x = rodaBloco(rota, { lib: rodaLib(m) })
  checa('mutante da lib (teto 9 de volta): 12 blocos → 9 cenas fundidas, sem vaga para dividir o HOOK → (b) vermelho', x && x.scenes.length === 9 && x.veoMarcadoRelato.teto === 9 && x.veoMarcadoRelato.fundidos === true && !(x.scenes.length >= 13))
}
{
  const m = libSrc.replace('.filter((i) => atrib.words[i] > fitLong)', '.filter(() => false)')
  if (m === libSrc) throw new Error('mutante da divisão não aplicou')
  const M = rodaLib(m)
  const p = M.veoMarkedPlan(parsed.narration, vozes, { durationSeconds: 60, wordsPerSecond: WPS, maxShots: 18 })
  checa('mutante da lib (nunca divide): o HOOK de 31 palavras ficaria em 8 s com a fala transbordando ~5,6 s no plano seguinte → (a) vermelho', p.shots.length === 12 && p.seconds[0] === 8 && p.divididas.length === 0 && p.transbordam.includes(0))
}
if (rotaBase) {
  const m = rota.replace('    if (wantsVeo && verbatim && parsedScript.segments.length > 0 && scenes.length > 0) {\n      const palavrasDoRoteiro', '    if (verbatim && parsedScript.segments.length > 0 && scenes.length > 0) {\n      const palavrasDoRoteiro')
  if (m === rota) throw new Error('mutante do bloco não aplicou')
  const x = rodaBloco(m, { wantsVeo: false })
  checa('mutante do bloco (sem wantsVeo): o Seedance com roteiro marcado ganharia planos de 4/6/8 s → (b) vermelho', x && x.scenes.length !== 9)
}

console.log(`\n${ok} verificações OK · ${falhas.length} falha(s)`)
if (falhas.length) { console.log('FALHAS:\n - ' + falhas.join('\n - ')); process.exit(1) }
