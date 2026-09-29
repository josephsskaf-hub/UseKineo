// [TRAVA 8.2] KLING25-60S-TETO — guardião do teto de planos do Kling 2.5 no roteiro pronto (28/09/2026).
// Fundador (28/09): "quero que você melhore o Kling 2.5 (...) teste com 60 segundos para chegar em 65 ou 70". O ensaio de
// $0 em produção (203 palavras, 60 s, verbatim) saiu com 12 planos [5,10,10,10,10,10,10,5,5,5,10,5] = 95 s de imagem para
// 88 s de fala: bateu no TETO de 12 e encheu com planos de 10 s. O pedido é "mais variedade": ~13-14 planos de 5 s num
// filme de 60 s com 65-70 s de fala, não 7 planos de 10 s. Custo IGUAL — a fal cobra por segundo (US$ 0,07/s).
//
// Este guardião EXECUTA a lib real e fatias reais da rota (readFileSync + transpile + vm; sem rede, sem banco, sem
// fornecedor, sem .env) e prova:
//   (a) lib/cinematic/klingShots: teto físico 18, teto do modo IA 12, kling25MaxShots (60 s → 14 · 65-70 s → 15-16 ·
//       90 s → 18 · 35 s → 12, não morde · modo IA sempre 12);
//   (b) roteiro real de ~150 palavras a 2,3 pal/s (≈ 65-67 s de fala) pedido a 60 s: ≥ 13 planos, maioria de 5 s, imagem
//       útil ≥ fala + respiro, CADA plano cabe a própria fala (logo nenhum mostra menos de 25 % dela), nenhuma palavra
//       perdida, custo de clipe declarado contra a base (teto 12: no máximo uma unidade de 5 s a mais);
//   (c) roteiro real de 203 palavras (≈ 88 s) a 60 s e a 90 s: idem (o caso medido em produção);
//   (d) 35 s continua 8-9: o canário de 98 palavras continua em 9 planos e no mesmo custo da base;
//   (i) FOLGA CONTRA VOZ LENTA: o bloco de 5 s do roteiro pronto cabe em 4,54 s (≤ 10 palavras a 2,3 pal/s, era 11) — ao
//       subir o teto, 16 planos cheios em fila fizeram a voz de 2,14 pal/s do c589a6a5 atrasar 3,1 s atrás da imagem
//       (medido no guardião irmão, seção h1; com o teto 12 era 1,65 s). Com a folga: 0,43 s. Uma voz a 2,07 pal/s ainda
//       cabe em todo plano de 5 s;
//   (e) modo IA intocado: 60 s → 12 e 90 s → 12 planos, na lib e na fatia real da rota;
//   (f) rota: só o ramo do Kling mudou — cada linha do diff de route.ts do COMMIT INTRODUTOR contra o seu pai fala de
//       Kling (nunca a worktree: depois do merge ela carrega os irmãos); Seedance/Veo/Sora dimensionam idêntico à base em
//       24 combinações; a rota não aperta o teto por opção;
//   (g) 240 roteiros aleatórios de 60/90 s: nunca acima do teto do filme nem do físico, só 5|10 s, cabe, cobre, nunca
//       MENOS planos nem MAIS planos de 10 s do que a base, custo de clipe nunca acima da base;
//   (h) mutantes: teto de volta a 12 → (b) e (c) vermelhos; teto do modo IA solto → (e) vermelho; rota sem `{ verbatim }`
//       → o dimensionamento provisório do roteiro pronto volta a 12.
import { readFileSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import vm from 'node:vm'
import ts from 'typescript'

const RAIZ = resolve(join(dirname(fileURLToPath(import.meta.url)), '..'))
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) ok++; else { falhas.push(n); console.log('  FALHOU: ' + n) } }
const roda = (src, globals = {}) => {
  const js = ts.transpileModule(src, { compilerOptions: { module: 1, target: 9 } }).outputText
  const exp = {}
  vm.runInNewContext(js, { exports: exp, console: { log() {}, warn() {}, error() {} }, JSON, Math, Number, Array, Object, Set, Map, process: { env: {} }, ...globals })
  return exp
}
const fatia = (src, ini, fim) => { const a = src.indexOf(ini); if (a < 0) return null; const b = src.indexOf(fim, a + ini.length); return b < 0 ? null : src.slice(a, b + fim.length) }
const eqJ = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const palavras = (t) => String(t ?? '').trim().split(/\s+/).filter(Boolean)
const git = (args) => execFileSync('git', args, { cwd: RAIZ, maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] }).toString()

// BASE = o "antes" deste trabalho (teto 12) e CANDIDATO = o commit que o introduziu. Memória "trava por diff fica verde ao
// mergear / medir vs pai do commit": depois do merge com a main e a fila, HEAD é um merge — o diff da base contra a WORKTREE
// (ou contra o pai de HEAD) carrega o trabalho dos IRMÃOS (a âncora KLING25-60S-ANCORA, a pilha da trava) e fica vermelho
// à toa. Por isso, como no guardião dos planos de 5 s (base 3519a0b0^ resolvida pela mensagem):
//   (1) o commit "[TRAVA 8.2] KLING25-60S-TETO" mais antigo na história de HEAD → base = <sha>^ e candidato = <sha>. As
//       asserções de DIFF leem `git show <sha>:<arquivo>`; as que EXECUTAM a lógica leem o arquivo ATUAL da worktree, para
//       provar que o comportamento continua no HEAD;
//   (2) antes do commit existir (worktree pristina): base = HEAD (senão origin/main) e candidato = a worktree, como antes.
// A base escolhida NÃO pode conter o marcador; o candidato TEM de conter.
let BASE = null
let SHA = null // o commit introdutor; null = o candidato é a worktree
{
  try { const shas = git(['log', '--basic-regexp', '--format=%H', '--grep=^\\[TRAVA 8.2\\] KLING25-60S-TETO', 'HEAD']).trim().split('\n').filter(Boolean); if (shas.length) SHA = shas[shas.length - 1] } catch { /* sem commit ainda */ }
  const candidatos = SHA ? [SHA + '^'] : []
  candidatos.push('HEAD', 'origin/main')
  for (const ref of candidatos) {
    try { if (!git(['show', `${ref}:lib/cinematic/klingShots.ts`]).includes('KLING25-60S-TETO')) { BASE = ref; break } } catch { /* tenta o próximo */ }
  }
  if (SHA && BASE !== SHA + '^') SHA = null // o pai do commit já tinha o marcador: não é o introdutor — o candidato volta a ser a worktree
}
console.log(`   base de comparação: ${BASE ?? '(nenhuma)'} · candidato do diff: ${SHA ?? 'worktree (sem o commit na história)'}`)
const rdBase = (p) => { if (!BASE) return null; try { return git(['show', `${BASE}:${p}`]).replace(/\r\n/g, '\n') } catch { return null } }
const rdCand = (p) => { if (!SHA) return rd(p); try { return git(['show', `${SHA}:${p}`]).replace(/\r\n/g, '\n') } catch { return null } }
checa('a base (teto 12) está disponível para as comparações', Boolean(BASE))

const LIB = 'lib/cinematic/klingShots.ts'
const ROTA = 'app/api/generate-video-cinematic/route.ts'
const libSrc = rd(LIB)
const rota = rd(ROTA)
const libBaseSrc = rdBase(LIB)
const rotaBase = rdBase(ROTA)
const libCandSrc = rdCand(LIB)
const rotaCand = rdCand(ROTA)
const K = roda(libSrc)
const KB = libBaseSrc ? roda(libBaseSrc) : null
checa('a base não tem kling25MaxShots e o novo tem (a prova compara antes × depois de verdade)', KB && typeof KB.kling25MaxShots !== 'function' && typeof K.kling25MaxShots === 'function')
checa('o candidato do diff (o commit introdutor, ou a worktree antes dele existir) carrega o marcador na lib e a base não — o commit resolvido é o introdutor, não um irmão', String(libCandSrc).includes('KLING25-60S-TETO') && !String(libBaseSrc).includes('KLING25-60S-TETO') && typeof roda(String(libCandSrc)).kling25MaxShots === 'function')

// ═══ roteiros ═══
// ~150 palavras (65-67 s a 2,3 pal/s) — o filme de 60 s que o fundador quer "com 65 ou 70" de fala.
const S150 = 'Deep in the Sahara, there is a scar so big it can be seen from space. It is called the Eye of the Sahara, a bullseye of stone forty kilometers wide, sitting in the middle of Mauritania. For decades, astronauts used it as a landmark, because nothing else in the desert looked like it. At first, scientists thought a meteor had punched the rings into the ground. But there was no crater, no melted rock, no shattered debris. The truth was stranger. Millions of years ago, magma pushed the land upward into a dome, and then the dome collapsed. Wind and time carved the layers into rings, one after another, like a giant fingerprint pressed into the earth. Some people believe it is the lost city of Atlantis, because the rings match the description Plato wrote. Geologists disagree. But when you fly over it, the desert seems to be staring right back at you.'
// 203 palavras (88 s a 2,3 pal/s) — o tamanho do ensaio de produção de 28/09 (Batalha de Los Angeles, 1942).
const S203 = 'On the night of February twenty-fourth, 1942, the sky over Los Angeles exploded. Air raid sirens screamed across the city, and more than fourteen hundred anti-aircraft shells were fired into the darkness. Searchlights swept the clouds, hunting for something. Thousands of people ran into the streets, convinced that Japan was attacking the mainland. The shooting lasted for almost an hour. When the sun came up, there were no enemy planes, no bombs, and no wreckage anywhere. But five people were dead, three from car crashes in the chaos, and two from heart attacks. The Army first said it was a real attack. Then the Navy said there had been nothing in the sky at all. Newspapers printed a photograph of the searchlights converging on a single bright object, and the country demanded answers. Some witnesses swore they saw a slow, silent shape the shells never touched. The official explanation came years later: war nerves, and a lost weather balloon that spooked the gunners. Many people never accepted that story. To this day, the Battle of Los Angeles remains one of the strangest nights in American history, a battle fought against an enemy that, as far as anyone could ever prove, was never there.'
const CANARIO = 'In Death Valley there is a dry lakebed called Racetrack Playa, and its rocks move on their own. Some weigh hundreds of pounds. Behind them, long trails are carved into the cracked mud. For decades nobody ever saw one move. Theories blamed hurricane-force winds, slick algae, even pranksters. Then scientists fitted rocks with GPS trackers, and in December 2013 they finally caught them moving. After rain, a thin layer of ice forms on the playa. When the sun breaks that ice into floating panels, a light breeze pushes them, and the panels shove the rocks across the mud.'
checa(`roteiros reais: ~150 (${palavras(S150).length}), 203 (${palavras(S203).length}) e o canário de 98 (${palavras(CANARIO).length}) palavras`, palavras(S150).length >= 148 && palavras(S150).length <= 156 && palavras(S203).length === 203 && palavras(CANARIO).length === 98)

const util = (secs) => secs.reduce((a, s) => a + s - 0.16, 0)
const fala = (chunk, pace) => palavras(chunk).length / pace
const resumo = (L, texto, d, wps = 3.1) => {
  const p = L.kling25VerbatimPlan(texto, { durationSeconds: d, wordsPerSecond: wps })
  const longos = p.seconds.filter((s) => s === 10).length
  return { p, n: p.seconds.length, longos, curtos: p.seconds.length - longos, util: Math.round(util(p.seconds) * 10) / 10, usd: L.kling25ClipsUsd(p.seconds), soma: p.seconds.reduce((a, b) => a + b, 0) }
}
// as provas de um filme (b/c): ≥ 13 planos, maioria 5 s, imagem útil ≥ fala + respiro, cada plano cabe a própria fala,
// nenhuma palavra perdida, nenhum plano fora de 5|10
const RESPIRO = 1
const UMA_UNIDADE = 0.35 // um plano de 5 s a US$ 0,07/s
const provasDoFilme = (L, texto, d, wps) => {
  const r = resumo(L, texto, d, wps)
  const { p } = r
  const cabe = p.chunks.every((c, i) => fala(c, p.pace) <= p.seconds[i] - 0.16 + 1e-9)
  const mostra25 = p.chunks.every((c, i) => (p.seconds[i] - 0.16) / Math.max(1e-9, fala(c, p.pace)) >= 0.25)
  return { ...r, treze: r.n >= 13, maioria5: r.curtos > r.longos, cobreComRespiro: util(p.seconds) + 1e-9 >= p.needSeconds + RESPIRO, cabe, mostra25, semPerda: p.chunks.join(' ') === texto, so510: p.seconds.every((s) => s === 5 || s === 10) }
}
// (i) folga: a fala de um bloco de 5 s, no passo do plano, cabe em 5 − 0,16 − 0,3 = 4,54 s. No passo de 2,3 pal/s isso é
// ≤ 10 palavras, e 10 palavras cabem nos 4,84 s úteis até numa voz de 2,07 pal/s (10 ÷ 4,84). Roteiro cortado em 90 s tem
// passo maior (kling25PlanPace) — a folga de 0,3 s vale igual, em segundos.
const VOZ_LENTA = 2.07
const p5cabe = (chunk, secs, pace = 2.3) => secs !== 5 || palavras(chunk).length / pace <= 5 - 0.16 - 0.3 + 1e-9
const p5vozLenta = (chunk, secs) => secs !== 5 || (palavras(chunk).length <= 10 && palavras(chunk).length / VOZ_LENTA <= 5 - 0.16 + 1e-9)
const mostra = (tag, f) => console.log(`   ${tag}: ${f.n} planos [${f.p.seconds.join(',')}] = ${f.soma} s brutos, ${f.util} s úteis para ${f.p.needSeconds} s de fala · ${f.curtos}×5 s + ${f.longos}×10 s · US$ ${f.usd.toFixed(2)} · passo ${f.p.pace}`)

// ═══ (a) a régua nova ═══
console.log('== (a) lib: teto físico, teto do modo IA e kling25MaxShots ==')
checa('teto físico 18 e teto do modo IA 12', K.KLING25_MAX_SHOTS === 18 && K.KLING25_MAX_SHOTS_AI === 12)
checa('roteiro pronto: 60 s (61,5 s úteis) → 14 · 65 s → 15 · 70 s → 16 · 82,6 s → 18 · 90 s → 18', K.kling25MaxShots({ verbatim: true, footageSeconds: 61.5 }) === 14 && K.kling25MaxShots({ verbatim: true, footageSeconds: 65 }) === 15 && K.kling25MaxShots({ verbatim: true, footageSeconds: 70 }) === 16 && K.kling25MaxShots({ verbatim: true, footageSeconds: 82.6 }) === 18 && K.kling25MaxShots({ verbatim: true, footageSeconds: 90 }) === 18)
checa('roteiro pronto: 35/45 s (42,6 e 48 s úteis) ficam em 12 — o teto não morde abaixo de 12', K.kling25MaxShots({ verbatim: true, footageSeconds: 42.6 }) === 12 && K.kling25MaxShots({ verbatim: true, footageSeconds: 48 }) === 12 && K.kling25MaxShots({ verbatim: true, footageSeconds: 0 }) === 12 && K.kling25MaxShots({ verbatim: true }) === 12)
checa('modo IA: sempre 12, para qualquer imagem (o escritor de cenas corta em 12)', [0, 38, 64.5, 93, 500].every((f) => K.kling25MaxShots({ verbatim: false, footageSeconds: f }) === 12))
checa('nunca acima de 18 nem abaixo de 12', [0, 10, 61.5, 90, 200, 5000].every((f) => { const t = K.kling25MaxShots({ verbatim: true, footageSeconds: f }); return t >= 12 && t <= 18 }))
checa('kling25ShotCount: sem opção = modo IA (500 s → 12); { verbatim: true } acompanha o filme (61,5 → 13; 90 → 18; 500 → 18); piso 2', K.kling25ShotCount(500) === 12 && K.kling25ShotCount(500, {}) === 12 && K.kling25ShotCount(61.5, { verbatim: true }) === 13 && K.kling25ShotCount(90, { verbatim: true }) === 18 && K.kling25ShotCount(500, { verbatim: true }) === 18 && K.kling25ShotCount(0, { verbatim: true }) === 2)
checa('base: kling25ShotCount(500) era 12 nos dois modos (o que este trabalho muda)', KB && KB.kling25ShotCount(500) === 12 && KB.kling25VerbatimPlan(S203, { durationSeconds: 60, wordsPerSecond: 3.1 }).seconds.length <= 12)

// ═══ (b) ~150 palavras a 60 s ═══
console.log('== (b) roteiro de ~150 palavras (65-67 s de fala) pedido a 60 s ==')
{
  const f = provasDoFilme(K, S150, 60, 3.1)
  const fb = KB ? resumo(KB, S150, 60, 3.1) : null
  mostra('novo  ', f)
  if (fb) mostra('base  ', { ...fb, util: fb.util })
  checa(`~150 palavras a 60 s: ≥ 13 planos (saíram ${f.n}) — a base dava ${fb?.n}`, f.treze && fb && fb.n <= 12)
  checa(`~150 palavras a 60 s: maioria de 5 s (${f.curtos}×5 s vs ${f.longos}×10 s)`, f.maioria5)
  checa(`~150 palavras a 60 s: imagem útil ${f.util} s ≥ fala ${f.p.needSeconds} s + ${RESPIRO} s de respiro`, f.cobreComRespiro)
  checa('~150 palavras a 60 s: CADA plano cabe a própria fala no passo de planejamento (nenhum plano mostra menos de 25 % dela — mostra 100 %)', f.cabe && f.mostra25)
  checa('~150 palavras a 60 s: nenhuma palavra perdida, só planos de 5|10 s', f.semPerda && f.so510)
  checa(`~150 palavras a 60 s: custo de clipe declarado — US$ ${f.usd.toFixed(2)} contra US$ ${fb?.usd.toFixed(2)} da base (no máximo uma unidade de 5 s a mais: a fal cobra por segundo)`, fb && f.usd <= fb.usd + UMA_UNIDADE + 1e-9)
  checa('~150 palavras a 60 s: nenhum bloco de 5 s passa de 10 palavras (folga de 0,3 s) e uma voz a 2,07 pal/s cabe em todos', f.p.chunks.every((c, i) => p5cabe(c, f.p.seconds[i], f.p.pace) && p5vozLenta(c, f.p.seconds[i])))
  checa('~150 palavras a 60 s: a voz de 2,3 pal/s dá o mesmo plano que a de 3,1 (o passo de planejamento é min(voz, 2,3))', eqJ(K.kling25VerbatimPlan(S150, { durationSeconds: 60, wordsPerSecond: 2.3 }).seconds, f.p.seconds))
}

// ═══ (c) 203 palavras a 60 s e a 90 s ═══
console.log('== (c) roteiro de 203 palavras (88 s de fala) — o ensaio de produção — a 60 s e a 90 s ==')
for (const d of [60, 90]) {
  const f = provasDoFilme(K, S203, d, 3.1)
  const fb = KB ? resumo(KB, S203, d, 3.1) : null
  mostra(`novo ${d}s`, f)
  if (fb) mostra(`base ${d}s`, fb)
  checa(`203 palavras a ${d} s: ≥ 13 planos (saíram ${f.n}) — a base dava ${fb?.n} com ${fb?.longos} de 10 s`, f.treze && fb && fb.n <= 12)
  checa(`203 palavras a ${d} s: maioria de 5 s (${f.curtos}×5 s vs ${f.longos}×10 s) e MENOS planos de 10 s que a base`, f.maioria5 && fb && f.longos < fb.longos)
  checa(`203 palavras a ${d} s: imagem útil ${f.util} s ≥ fala ${f.p.needSeconds} s + ${RESPIRO} s`, f.cobreComRespiro)
  checa(`203 palavras a ${d} s: cada plano cabe a própria fala, nenhuma palavra perdida, só 5|10 s`, f.cabe && f.mostra25 && f.semPerda && f.so510)
  checa(`203 palavras a ${d} s: custo de clipe declarado — US$ ${f.usd.toFixed(2)} contra US$ ${fb?.usd.toFixed(2)} da base (no máximo uma unidade de 5 s a mais)`, fb && f.usd <= fb.usd + UMA_UNIDADE + 1e-9)
  checa(`203 palavras a ${d} s: nenhum bloco de 5 s passa de 10 palavras e uma voz a 2,07 pal/s cabe em todos`, f.p.chunks.every((c, i) => p5cabe(c, f.p.seconds[i], f.p.pace) && p5vozLenta(c, f.p.seconds[i])))
  checa(`203 palavras a ${d} s: nunca acima do teto do filme (${K.kling25MaxShots({ verbatim: true, footageSeconds: f.p.needSeconds })})`, f.n <= K.kling25MaxShots({ verbatim: true, footageSeconds: f.p.needSeconds }))
}

// ═══ (d) 35 s continua 8-9 ═══
console.log('== (d) 35 s: o canário de 98 palavras não muda ==')
{
  const f = resumo(K, CANARIO, 35, 3.1)
  const fb = KB ? resumo(KB, CANARIO, 35, 3.1) : null
  mostra('novo 35s', f)
  checa(`canário a 35 s: ${f.n} planos (8-9), mesmo custo da base (US$ ${f.usd.toFixed(2)}), nenhuma palavra perdida e nenhum bloco de 5 s acima de 10 palavras`, f.n >= 8 && f.n <= 9 && fb && f.usd === fb.usd && f.p.chunks.join(' ') === CANARIO && f.p.chunks.every((c, i) => p5cabe(c, f.p.seconds[i], f.p.pace) && p5vozLenta(c, f.p.seconds[i])))
  checa('canário a 35 s: dimensionamento provisório idêntico ao da base (42,6 s → 9 planos, nos dois modos)', K.kling25ShotCount(42.6, { verbatim: true }) === 9 && K.kling25ShotCount(42.6) === 9 && KB.kling25ShotCount(42.6) === 9)
}

// ═══ (e) modo IA intocado — lib e fatia real da rota ═══
console.log('== (e) modo IA: 12 planos a 60 s e a 90 s, como antes ==')
const routeAst = (src) => ts.createSourceFile('route.ts', src, ts.ScriptTarget.Latest, true)
function acha(ast, pred) { let f; const v = (n) => { if (!f && pred(n)) f = n; if (!f) ts.forEachChild(n, v) }; v(ast); return f }
const funcaoDe = (src, nome) => { const ast = routeAst(src); const n = acha(ast, (x) => ts.isFunctionDeclaration(x) && x.name?.text === nome); return n ? n.getText(ast) : null }
const veoLinha = (src) => { const m = src.match(/\n    if \(wantsVeo\) clipCount = Math\.max\(clipCount, Math\.min\(12, Math\.ceil\(duration \/ 8\) \+ 1\)\)\n/); return m ? m[0] : null }
const bloco442 = (src) => { const ast = routeAst(src); const n = acha(ast, (x) => ts.isIfStatement(x) && x.expression.getText(ast) === 'verbatim' && x.getText(ast).includes('SECONDS_PER_CLIP')); return n ? n.getText(ast) : null }
const blocoKlingDim = (src) => fatia(src, '    let kling25Footage = 0\n', '\n    }\n')
function dimensiona(src, { engine, duration, verbatim = false, narration = '', wps = 3.1 }, lib = K) {
  const partes = [veoLinha(src), bloco442(src), blocoKlingDim(src)]
  if (!partes[0] || !partes[1] || !partes[2]) return null
  const clipCountForDuration = roda(`export ${funcaoDe(src, 'clipCountForDuration')}`).clipCountForDuration
  return roda(`export function run() { let clipCount = clipCountForDuration(duration)\n${partes.join('\n')}\n return { clipCount, kling25Footage } }`, {
    clipCountForDuration, duration, verbatim, parsedScript: { narration, segments: [] }, wantsKling: engine === 'kling', wantsVeo: engine === 'veo', wantsSora: engine === 'sora',
    narrationRate: { wordsPerSecond: wps }, kling25FootageNeeded: lib.kling25FootageNeeded, kling25ShotCount: lib.kling25ShotCount,
  }).run()
}
checa('lib: modo IA 60 s (64,5 s úteis) → 12 e 90 s (93 s) → 12, igual à base', K.kling25ShotCount(64.5) === 12 && K.kling25ShotCount(93) === 12 && KB.kling25ShotCount(64.5) === 12 && KB.kling25ShotCount(93) === 12)
{
  const ia60 = dimensiona(rota, { engine: 'kling', duration: 60 }), ia90 = dimensiona(rota, { engine: 'kling', duration: 90 }), ia35 = dimensiona(rota, { engine: 'kling', duration: 35 })
  checa('rota real, modo IA: Kling 2.5 pede 8 planos a 35 s, 12 a 60 s e 12 a 90 s (como antes)', ia35?.clipCount === 8 && ia60?.clipCount === 12 && ia90?.clipCount === 12)
  const vb60 = dimensiona(rota, { engine: 'kling', duration: 60, verbatim: true, narration: S203 }), vb90 = dimensiona(rota, { engine: 'kling', duration: 90, verbatim: true, narration: S203 })
  const vb150 = dimensiona(rota, { engine: 'kling', duration: 60, verbatim: true, narration: S150 })
  checa(`rota real, roteiro pronto: 203 palavras pedem 18 planos provisórios a 60 s e a 90 s (saíram ${vb60?.clipCount}/${vb90?.clipCount}); ~150 palavras pedem ${vb150?.clipCount} (14-15)`, vb60?.clipCount === 18 && vb90?.clipCount === 18 && vb150 && vb150.clipCount >= 14 && vb150.clipCount <= 15)
  const vbCan = dimensiona(rota, { engine: 'kling', duration: 35, verbatim: true, narration: CANARIO, wps: 2.5 })
  checa('rota real, roteiro pronto: o canário (98 palavras, 42,6 s) continua pedindo 9 provisórios', vbCan?.clipCount === 9 && vbCan.kling25Footage === 42.6)
}

// ═══ (f) rota: só o ramo do Kling mudou ═══
console.log('== (f) rota: só o Kling 2.5 mudou ==')
checa('a rota dimensiona com `kling25ShotCount(kling25Footage, { verbatim })` e não aperta o teto do divisor por opção', rota.includes('const planos = kling25ShotCount(kling25Footage, { verbatim })') && /kling25VerbatimPlan\(parsedScript\.narration, \{ durationSeconds: duration, wordsPerSecond: narrationRate\.wordsPerSecond \}\)/.test(rota) && !/kling25VerbatimPlan\([^)]*maxShots/.test(rota))
checa('a rota não precisa importar nada novo (kling25ShotCount já vinha da lib) e não chama o escritor de cenas com teto novo', rota.includes("kling25ShotCount, kling25SceneSeconds, kling25ClipsUsd, kling25WriterBudget, kling25AlignBudget") && !rota.includes('maxScenes'))
if (rotaBase) {
  // O diff é do CANDIDATO contra a base (commit × commit). Contra a worktree, depois do merge, ele carregaria os irmãos
  // (a âncora KLING25-60S-ANCORA e a pilha) — 19 linhas, 6 de código, algumas sem Kling: vermelho falso (visto em 28/09).
  checa('candidato: o commit introdutor tem `kling25ShotCount(kling25Footage, { verbatim })` e a base tem a chamada sem opção (o diff abaixo mede ESTE trabalho)', String(rotaCand).includes('const planos = kling25ShotCount(kling25Footage, { verbatim })') && rotaBase.includes('const planos = kling25ShotCount(kling25Footage)') && !rotaBase.includes('{ verbatim })'))
  let linhas = []
  try { linhas = git(SHA ? ['diff', BASE, SHA, '--', ROTA] : ['diff', BASE, '--', ROTA]).split('\n').filter((l) => (l.startsWith('+') || l.startsWith('-')) && !l.startsWith('+++') && !l.startsWith('---')) } catch { linhas = null }
  const codigo = Array.isArray(linhas) ? linhas.filter((l) => !/^[+-]\s*\/\//.test(l)) : null
  checa(`diff de route.ts do candidato (${SHA ? SHA.slice(0, 8) : 'worktree'}) contra a base: ${linhas?.length ?? '?'} linhas mudadas (${codigo?.length ?? '?'} de código), toda linha de código fala do Kling 2.5 e nenhuma linha toca Seedance/Veo/Sora/hollywood em código`, Array.isArray(linhas) && linhas.length > 0 && linhas.length <= 12 && codigo.length > 0 && codigo.every((l) => /kling/i.test(l)) && codigo.every((l) => !/wantsVeo|wantsSora|seedance|hollywood/i.test(l)))
  const iguais = []
  for (const engine of ['seedance', 'veo', 'sora']) for (const duration of [35, 45, 60, 90]) for (const verbatim of [false, true]) {
    const a = dimensiona(rota, { engine, duration, verbatim, narration: verbatim ? S203 : '' }, K)
    const b = dimensiona(rotaBase, { engine, duration, verbatim, narration: verbatim ? S203 : '' }, KB)
    iguais.push(a && b && a.clipCount === b.clipCount && a.kling25Footage === 0 && b.kling25Footage === 0)
  }
  checa(`Seedance/Veo/Sora dimensionam idêntico à base em ${iguais.length} combinações (imagem do Kling = 0 em todas)`, iguais.length === 24 && iguais.every(Boolean))
  checa('lib: a base tinha o teto 12 cravado; o novo tem 18 físico + 12 do modo IA + kling25MaxShots', libBaseSrc.includes('export const KLING25_MAX_SHOTS = 12') && libSrc.includes('export const KLING25_MAX_SHOTS = 18') && libSrc.includes('export const KLING25_MAX_SHOTS_AI = 12'))
}

// ═══ (g) roteiros aleatórios de 60 e 90 s ═══
console.log('== (g) 240 roteiros aleatórios de 60/90 s (120-300 palavras) ==')
{
  let seed = 20260928
  const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648 }
  let dentroDoTeto = true, so510 = true, cabe = true, cobre = true, semPerda = true, menos = 0, folga = true, algumAcimaDe12 = 0, somaNovo = 0, somaBase = 0, maiorDelta = 0, planosNovo = 0, planosBase = 0
  for (let caso = 0; caso < 240; caso++) {
    const frases = []
    let total = 0
    const alvo = 120 + Math.floor(rnd() * 180)
    while (total < alvo) { const n = 4 + Math.floor(rnd() * 20); frases.push(Array.from({ length: n }, (_, i) => `w${Math.floor(rnd() * 999)}${i === Math.floor(n / 2) && rnd() < 0.5 ? ',' : ''}`).join(' ') + (rnd() < 0.15 ? '!' : '.')); total += n }
    const texto = frases.join(' ')
    const d = rnd() < 0.6 ? 60 : 90
    const wps = 2.3 + rnd() * 0.8
    const p = K.kling25VerbatimPlan(texto, { durationSeconds: d, wordsPerSecond: wps })
    const pb = KB.kling25VerbatimPlan(texto, { durationSeconds: d, wordsPerSecond: wps })
    const teto = K.kling25MaxShots({ verbatim: true, footageSeconds: p.needSeconds })
    if (p.chunks.length > teto || p.chunks.length > 18 || p.chunks.length < 2) dentroDoTeto = false
    if (!p.seconds.every((s) => s === 5 || s === 10) || p.seconds.length !== p.chunks.length) so510 = false
    if (!p.chunks.every((c, i) => palavras(c).length <= (p.seconds[i] === 5 ? p.fitShort : p.fitLong))) cabe = false
    if (util(p.seconds) + 1e-6 < p.needSeconds) cobre = false
    if (p.chunks.join(' ') !== texto) semPerda = false
    if (p.chunks.length < pb.chunks.length) menos++
    planosNovo += p.chunks.length; planosBase += pb.chunks.length
    if (!p.chunks.every((c, i) => p5cabe(c, p.seconds[i], p.pace))) folga = false
    const uN = K.kling25ClipsUsd(p.seconds), uB = KB.kling25ClipsUsd(pb.seconds)
    somaNovo += uN; somaBase += uB; maiorDelta = Math.max(maiorDelta, uN - uB)
    if (p.chunks.length > 12) algumAcimaDe12++
  }
  const mediaDelta = (somaNovo - somaBase) / 240
  console.log(`   custo de clipe nos 240 aleatórios: base (teto 12) US$ ${somaBase.toFixed(2)} → US$ ${somaNovo.toFixed(2)} (+US$ ${mediaDelta.toFixed(2)} por filme; maior +${maiorDelta.toFixed(2)}); ${algumAcimaDe12} passaram de 12 planos`)
  checa('aleatórios: de 2 ao teto do filme (nunca acima de 18), só 5|10 s', dentroDoTeto && so510)
  checa('aleatórios: cada plano cabe a própria fala e a imagem útil cobre o filme', cabe && cobre)
  checa('aleatórios: nenhuma palavra perdida', semPerda)
  console.log(`   planos por filme nos 240 aleatórios: base ${(planosBase / 240).toFixed(1)} → ${(planosNovo / 240).toFixed(1)}; ${menos} filmes com menos planos que a base (bloco de 11 palavras que virou plano de 10 s pela folga)`)
  checa('aleatórios: a fala de todo bloco de 5 s cabe em 4,54 s no passo do plano (a folga de 0,3 s contra voz mais lenta)', folga)
  checa(`aleatórios: em média +3 planos por filme ou mais (${(planosBase / 240).toFixed(1)} → ${(planosNovo / 240).toFixed(1)}; ${algumAcimaDe12} de 240 passaram de 12) e no máximo 1 em 10 filmes com menos planos que a base`, planosNovo / 240 >= planosBase / 240 + 3 && algumAcimaDe12 >= 100 && menos <= 24)
  checa(`aleatórios: custo de clipe DECLARADO e com teto: média ≤ +US$ 0,70 por filme e nenhum filme acima de +US$ 1,05 (três unidades de 5 s) contra o teto 12`, mediaDelta <= 0.7 && maiorDelta <= 1.05 + 1e-9)
}

// ═══ (h) mutantes ═══
console.log('== (h) mutantes ==')
{
  const mutar = (a, b) => { if (!libSrc.includes(a)) throw new Error('âncora do mutante não encontrada: ' + a); return roda(libSrc.split(a).join(b)) }
  const teto12 = mutar('export const KLING25_MAX_SHOTS = 18', 'export const KLING25_MAX_SHOTS = 12')
  checa('mutante: teto físico de volta a 12 → o roteiro de ~150 palavras e o de 203 voltam a ≤ 12 planos ((b) e (c) vermelhos)', !provasDoFilme(teto12, S150, 60, 3.1).treze && !provasDoFilme(teto12, S203, 60, 3.1).treze && !provasDoFilme(teto12, S203, 90, 3.1).treze)
  const iaSolto = mutar('  if (!input.verbatim) return KLING25_MAX_SHOTS_AI\n', '')
  checa('mutante: teto do modo IA solto → o modo IA pediria 14 planos a 60 s e 18 a 90 s ao escritor que só devolve 12 ((e) vermelho)', iaSolto.kling25ShotCount(64.5) !== 12 && iaSolto.kling25ShotCount(93) !== 12 && iaSolto.kling25MaxShots({ verbatim: false, footageSeconds: 93 }) !== 12)
  const semPiso = mutar('  return Math.max(KLING25_MAX_SHOTS_AI, Math.min(KLING25_MAX_SHOTS, porImagem))', '  return Math.min(KLING25_MAX_SHOTS, porImagem)')
  checa('mutante: sem o piso 12 → um filme curto ganharia teto menor que o de hoje (a) vermelho', semPiso.kling25MaxShots({ verbatim: true, footageSeconds: 42.6 }) < 12)
  const semFolga = mutar('export const KLING25_SHORT_FIT_SLACK_SECONDS = 0.3', 'export const KLING25_SHORT_FIT_SLACK_SECONDS = 0')
  const planoSemFolga = semFolga.kling25VerbatimPlan(S203, { durationSeconds: 60, wordsPerSecond: 3.1 })
  checa('mutante: sem a folga de 0,3 s → voltam blocos de 11 palavras em 5 s (a voz de 2,14 pal/s atrasava 3,1 s) — (b)/(c)/(i) vermelhos', !planoSemFolga.chunks.every((c, i) => p5cabe(c, planoSemFolga.seconds[i], planoSemFolga.pace)) && planoSemFolga.fitShort === 11)
  const rotaSemOpcao = rota.split('const planos = kling25ShotCount(kling25Footage, { verbatim })').join('const planos = kling25ShotCount(kling25Footage)')
  const vb60 = dimensiona(rotaSemOpcao, { engine: 'kling', duration: 60, verbatim: true, narration: S203 })
  checa('mutante: rota sem `{ verbatim }` → o dimensionamento provisório do roteiro pronto de 203 palavras volta a 12 ((e) vermelho)', vb60?.clipCount === 12)
}

console.log(`\n${ok} ok · ${falhas.length} falhas`)
for (const f of falhas) console.log('  ✗ ' + f)
process.exit(falhas.length ? 1 : 0)
