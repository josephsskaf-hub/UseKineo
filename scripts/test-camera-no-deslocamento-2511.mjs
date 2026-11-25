// KINEO-CAMERA-NO-DESLOCAMENTO-2511 — guardião (sem rede, sem custo). O dono viu o Vidu Q4: o Elias sobe a escada de costas; no Gemini ele desce. O plano pedia
// "climbs the staircase" e "Keep the face" sem dizer onde a câmera está. Prova:
//   1. a regra vai ao sistema do descritor (o trecho REAL da rota, executado) logo depois das linhas de câmera, SÓ com a chave (só a casa), e continua no
//      sistema da chamada por seção (sistemaPorSecao tira só as duas linhas de câmera de sempre); sem a chave = a origin/main byte a byte;
//   2. a regra não tem exemplo nem lista de verbos; diz onde a câmera está (não é movimento de câmera), "nunca de costas" para personagem nomeado salvo quando
//      as palavras do autor dizem que ele vai embora, e as palavras do autor mandam;
//   3. a chave chega ao descritor pela política visual DO PEDIDO (WeakSet): as chamadas ao descritor ficam as da main;
//   4. o pacote do ensaio (10 dry_runs da casa, 40 seções, 20 com deslocamento e 3 delas "vai embora") está bem formado.
// A régua do ensaio (CEO 25/11): ≥ 90% dos planos com deslocamento dizem a câmera; 0 de costas com personagem nomeado (fora dos "vai embora"); câmera em ≤ 10% dos parados.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
import { CASOS, CORPOS } from './test-support/camera-no-deslocamento-2511-casos.mjs'

const K = 'lib/kling4PlanoDaFala1911.ts', R = 'app/api/generate-video-cinematic/route.ts'
const lf = (t) => t.replace(/\r\n/g, '\n')
const local = (f) => lf(readFileSync(f, 'utf8'))
const daBase = (f) => lf(execSync(`git show origin/main:${f}`, { encoding: 'utf8', maxBuffer: 64 << 20 }))
const igual = (a, b, m) => assert.equal(JSON.stringify(a), JSON.stringify(b), m)
const BASE = Object.fromEntries([K, R].map((f) => [f, daBase(f)]))
const lb = createOfflineLoader({ env: { OPENAI_API_KEY: 'k' }, source: (rel, t) => BASE[rel] ?? t })
const Kb = lb('@/' + K), Pb = lb('@/lib/cinematic/pistaNaoManda.ts'), { parseUserScript } = lb('@/lib/scriptParser.ts')
function descritorDe(rota) {
  const iLista = rota.indexOf('const list = scenes\n'), iUser = rota.indexOf('const userMsg = `Topic:', iLista), iFim = rota.indexOf('\n', iUser)
  assert.ok(iLista > 0 && iUser > iLista, 'o trecho do descritor')
  const corpo = rota.slice(iLista, iFim).replace(/\/\/ PEDIDO-FIEL-2610[^\n]*$/, '')
  return new Function('scenes', 'topic', 'lote', 'temMarcaDeBusca', 'REGRA_DA_PISTA', 'visualDescriptionDirection', 'visualPolicy', 'kling4Gratis', 'desenhoProtagonista', 'aspectSpec',
    'NO_TEXT_OBJECT_DIRECTION', 'REGRAS_DO_ESCRITOR_DE_CENAS', 'cameraNoDeslocamento2511', 'REGRA_DA_CAMERA_2511', `${corpo}\nreturn { system, userMsg }`)
}
const ROTEIRO = CORPOS[0].corpo.prompt

async function suite(change) {
  const muda = (rel, t) => (change && rel === change[0] ? t.split(change[1]).join(change[2]) : t)
  const L = createOfflineLoader({ env: { OPENAI_API_KEY: 'k' }, source: (rel, t) => muda(rel, t) })
  const k = L('@/' + K)
  const rota = muda(R, local(R)), rotaB = BASE[R]

  // ── a chave ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  assert.equal(k.CAMERA_NO_DESLOCAMENTO_2511, 'internal')
  igual([k.cameraNoDeslocamentoLigado('internal', true), k.cameraNoDeslocamentoLigado('internal', false), k.cameraNoDeslocamentoLigado('off', true), k.cameraNoDeslocamentoLigado('public', false)], [true, false, false, true])
  const G = "typeof cameraNoDeslocamento2511 !== 'undefined' && cameraNoDeslocamento2511"
  assert.ok(rota.includes('    const cameraNoDeslocamento2511 = cameraNoDeslocamentoLigado(CAMERA_NO_DESLOCAMENTO_2511, contaDaCasaExataCamera2511(user.email))'), 'a chave pela casa EXATA')
  { const iFlag = rota.indexOf('    const cameraNoDeslocamento2511 = cameraNoDeslocamentoLigado('), iPol = rota.indexOf('    const classicVisualPolicy: VisualPromptPolicy = {'), iAdd = rota.indexOf(`    if (${G}) CAMERA_NO_DESLOCAMENTO_POLITICAS_2511.add(classicVisualPolicy)`)
    const iDesc = rota.indexOf('generateCinematicDescriptions(secoesParaODescritor(parsedScript.segments)')
    assert.ok(iFlag > 0 && iPol > iFlag && iAdd > iPol && iDesc > iAdd, 'a política do pedido é marcada logo depois de nascer e antes do 1º pedido ao descritor')
    assert.ok(rota.includes("  const cameraNoDeslocamento2511 = typeof CAMERA_NO_DESLOCAMENTO_POLITICAS_2511 !== 'undefined' && CAMERA_NO_DESLOCAMENTO_POLITICAS_2511.has(visualPolicy)"), 'o descritor lê a marca da política do seu pedido')
    const linhas = (r, t) => r.split('\n').filter((l) => l.includes(t))
    igual(linhas(rota, 'generateCinematicDescriptions('), linhas(rotaB, 'generateCinematicDescriptions('), 'as chamadas ao descritor = a main') }

  // ── 1. o descritor (o trecho REAL da rota) ──────────────────────────────────────────────────────────────────────────────────────────────────────
  const cenas = parseUserScript(ROTEIRO).segments.map((x) => ({ description: x.pexelsQuery, voiceover: x.voiceover, stockSearchQuery: x.pexelsQuery }))
  const roda = (r, extra) => descritorDe(r)(cenas, ROTEIRO, undefined, Pb.temMarcaDeBusca, Pb.REGRA_DA_PISTA, () => 'look.', {}, false, null, () => ({ promptFraming: 'x' }), 'y', 'z', ...extra)
  const hoje = roda(rotaB, []), com = roda(rota, [true, k.REGRA_DA_CAMERA_2511])
  const VARY = '- VARY the camera move and framing across scenes — do not repeat the same shot type; rotate aerial / tracking / slow push-in / macro / wide / low-angle.\n'
  assert.ok(com.system.includes(`${VARY}- ${k.REGRA_DA_CAMERA_2511}\n- Keep the approved look`), '1: com a chave, a regra logo depois das linhas de câmera')
  igual(com.system.replace(`- ${k.REGRA_DA_CAMERA_2511}\n`, ''), hoje.system, '1: tirando a linha, o resto = a main')
  igual(com.userMsg, hoje.userMsg, '1: os dados (fala e pista) iguais')
  for (const [nome, extra] of [['sem a chave', []], ['chave false', [false, k.REGRA_DA_CAMERA_2511]]]) { const x = roda(rota, extra); igual([x.system, x.userMsg], [hoje.system, hoje.userMsg], `1 ${nome}: a main byte a byte`) }
  // a chamada por seção: sistemaPorSecao tira as duas linhas de câmera de sempre e mantém a regra
  const porSecao = k.sistemaPorSecao(com.system) + k.REGRA_DO_PLANO_DA_FALA
  assert.ok(porSecao.includes(k.REGRA_DA_CAMERA_2511) && !porSecao.includes('- Include a camera move') && !porSecao.includes('- VARY the camera move'), '1: a regra chega à chamada por seção')
  igual(k.sistemaPorSecao(hoje.system) + k.REGRA_DO_PLANO_DA_FALA, Kb.sistemaPorSecao(hoje.system) + Kb.REGRA_DO_PLANO_DA_FALA, '1: a chamada por seção sem a chave = a main')

  // ── 2. a regra ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  const r = k.REGRA_DA_CAMERA_2511
  for (const t of ['when the subject travels from one place to another in the shot', 'say where the camera stands relative to that path', 'which way the subject moves relative to the camera',
    '(where the camera stands, not a camera move)', 'toward or across the camera with the face visible, never away from it', "unless the author's words for that shot say the subject is leaving", "the author's words for the shot always decide"])
    assert.ok(r.includes(t), '2: ' + t)
  assert.ok(r.startsWith('KINEO-CAMERA-NO-DESLOCAMENTO-2511: ') && !/"|e\.g\.|for example|such as|stair|climb|walk|run|enter|exit|descend/i.test(r), '2: sem exemplo e sem lista de verbos')

  // ── 4. o pacote do ensaio ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  assert.equal(CASOS.length, 10); assert.equal(new Set(CASOS.map((c) => c.id)).size, 10)
  const mov = CASOS.flatMap((c) => c.mov), sai = CASOS.flatMap((c) => c.sai)
  igual([mov.length, mov.filter(Boolean).length, sai.filter(Boolean).length, CASOS.flatMap((c, i) => c.sai.map((v, j) => v && !c.mov[j])).filter(Boolean).length], [40, 20, 3, 0], '4: 40 seções, 20 com deslocamento, 3 "vai embora" (todas com deslocamento)')
  for (const c of CORPOS) { const seg = parseUserScript(c.corpo.prompt).segments; assert.equal(seg.length, 4, c.id + ': 4 seções'); assert.ok(seg.every((x) => x.pexelsQuery && x.voiceover), c.id + ': marca e fala')
    igual([c.corpo.dry_run, c.corpo.script_mode, c.corpo.duration], [true, 'verbatim', 15], c.id + ': dry_run, verbatim, 15 s') }
}

await suite(null)
const mutants = [
  [K, "export const CAMERA_NO_DESLOCAMENTO_2511: ModoCameraNoDeslocamento2511 = 'internal'", "export const CAMERA_NO_DESLOCAMENTO_2511: ModoCameraNoDeslocamento2511 = 'public'"],
  [K, "(modo === 'internal' && contaDaCasa === true)", "(modo === 'internal')"],
  [K, " unless the author\\'s words for that shot say the subject is leaving;", ';'],
  [K, "never away from it", 'away from it if needed'],
  [K, " (where the camera stands, not a camera move)", ''],
  [R, "${typeof cameraNoDeslocamento2511 !== 'undefined' && cameraNoDeslocamento2511 === true ? `- ${REGRA_DA_CAMERA_2511}\\n` : ''}", ''],
  [R, "${typeof cameraNoDeslocamento2511 !== 'undefined' && cameraNoDeslocamento2511 === true ?", '${true ?'],
  [R, 'cameraNoDeslocamentoLigado(CAMERA_NO_DESLOCAMENTO_2511, contaDaCasaExataCamera2511(user.email))', 'cameraNoDeslocamentoLigado(CAMERA_NO_DESLOCAMENTO_2511, true)'],
  [R, "    if (typeof cameraNoDeslocamento2511 !== 'undefined' && cameraNoDeslocamento2511) CAMERA_NO_DESLOCAMENTO_POLITICAS_2511.add(classicVisualPolicy)", '    CAMERA_NO_DESLOCAMENTO_POLITICAS_2511.add(classicVisualPolicy)'],
  [R, "&& CAMERA_NO_DESLOCAMENTO_POLITICAS_2511.has(visualPolicy)", '&& true'],
]
let mortos = 0
for (const m of mutants) {
  assert.ok(local(m[0]).includes(m[1]), 'mutante não aplica: ' + m[1].slice(0, 100))
  await assert.rejects(suite(m), (e) => e instanceof assert.AssertionError, 'SOBREVIVEU: ' + m[1].slice(0, 120))
  mortos++
}
console.log(`PASS KINEO-CAMERA-NO-DESLOCAMENTO-2511: chave 'internal' (casa exata) pela política do pedido (as chamadas ao descritor = a main); a regra logo depois das linhas de câmera no descritor (trecho real da rota) e na chamada por seção; sem a chave = a main byte a byte; sem exemplo nem lista de verbos; "nunca de costas" salvo quando o autor diz que a pessoa vai embora; pacote do ensaio: 10 dry_runs, 40 seções (20 com deslocamento, 3 "vai embora"); ${mortos}/${mutants.length} mutantes mortos.`)
