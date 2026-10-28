import { semIdiomasFormatos2410 } from './test-support/desfaz-idiomas-formatos-2410.mjs' // KINEO-IDIOMAS-FORMATOS-2410 — exact newer source layer precedes every historical assertion and mutant.
// KINEO-JUIZ-STILL-1410 [TRAVA 8.2 — vai do fundador 14/10 "tudo sim", melhoria nº 8] — o crítico do STILL antes do clipe pago.
// Prova, sem rede e sem render (OpenAI e fal falsos, relógio falso), executando o BLOCO REAL da rota (o lote de stills do
// caminho clássico, de `const STILL_POOL = 3` até o log de custo) e a lib real (lib/cinematic/criticoStill.ts):
//   (a) off  = comportamento byte a byte: mesmas chamadas ao FLUX, mesmos stills, mesmo relógio que o bloco da BASE (o pai do
//       1º commit marcado), nenhuma chamada ao crítico, nenhum evento;
//   (b) log_only (o PADRÃO, STILL_CRITIC_MODE ausente) = julga cada still, grava cinematic_still_critic e NUNCA regera; a foto
//       original segue sempre, até no FAIL (regeraria=true no evento);
//   (c) enforce = FAIL refaz o still UMA vez (semente nova, instrução positiva), julga de novo e segue a melhor; nunca 2
//       regerações na mesma cena; teto de 3 por filme;
//   (d) timeout = a foto segue (veredito ERRO, timeout no evento), em log_only e em enforce;
//   (e) os 60 s: nenhuma chamada do crítico passa do prazo dos stills; sem folga, a cena é pulada ('prazo'); o bloco não termina
//       depois de max(fim da base, prazo); o pool de 3 não espera o crítico (o lote seguinte sai no mesmo instante que na base);
//   (f) o evento: nome, session_id = generation_id, metadata com veredito, problemas, regeraria, custo, modo, motor;
//   (g) hollywood: nunca no s25; em log_only a cena não espera; em enforce espera; a linha da cena fica entre o juiz do s25 e
//       a âncora final;
//   (h) o modelo é o do juiz do s25 (nenhuma string crua de modelo nova); desfeito o ajuste, a rota é o pai do 1º commit marcado;
//   (i) mutantes: cada um fica vermelho e prova que aplicou.
import { semTrilha15s1610 as semTrilha15s1610Puro, linhaDaTrilha15s1610 as linhaDaTrilha15s1610Puro, linhasTrocadasTrilha15s1610 as linhasTrocadasTrilha15s1610Puro } from './test-support/desfaz-trilha-15s-1610.mjs' // reancorado KINEO-FILME-RAPIDO-1710: os nomes abaixo também desfazem a entrega mais nova (17/10)
import { semFilmeRapido1710, linhaDoFilmeRapido1710, linhasTrocadasFilmeRapido1710 } from './test-support/desfaz-filme-rapido-1710.mjs' // reancorado KINEO-FILME-RAPIDO-1710 [TRAVA 8.2 — vai do fundador 17/10 "vai pra tudo"]
const semTrilha15s1610 = (texto, p) => semTrilha15s1610Puro(semFilmeRapido1710(texto, p), p) // reancorado KINEO-FILME-RAPIDO-1710
const linhaDaTrilha15s1610 = (l) => linhaDaTrilha15s1610Puro(l) || linhaDoFilmeRapido1710(l) // reancorado KINEO-FILME-RAPIDO-1710
const linhasTrocadasTrilha15s1610 = (p) => [...linhasTrocadasTrilha15s1610Puro(p), ...linhasTrocadasFilmeRapido1710(p)] // reancorado KINEO-FILME-RAPIDO-1710
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import ts from 'typescript'
import { semJuizStill1410, desfazJuizStill1410, FORMA_JUIZ_STILL_1410, MARCA_JUIZ_STILL_1410 as MARCA } from './test-support/desfaz-juiz-still-1410.mjs'
import { semCenaNegacao1510 } from './test-support/desfaz-cena-negacao-1510.mjs' // reancorado KINEO-CENA-NEGACAO-1510 [TRAVA 8.2 — vai do fundador 15/10]

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const ROTA = 'app/api/generate-video-cinematic/route.ts'
const LIB = 'lib/cinematic/criticoStill.ts'
const JUIZ = 'lib/hollywood/juizStill.ts'
const rd = (p) => semIdiomasFormatos2410(readFileSync(join(RAIZ, p), 'utf8'), p).replace(/\r\n/g, '\n')
const git = (args) => execFileSync('git', ['-C', RAIZ, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })

globalThis.fetch = () => { throw new Error('rede proibida no guardião') }
process.env.OPENAI_API_KEY = 'chave-falsa-do-guardiao'
const realSetTimeout = setTimeout

/** Módulo TS → exports. `mapa` resolve imports; `escopo` injeta nomes (Date, setTimeout, fetch falsos). */
function carrega(src, { mapa = {}, escopo = {} } = {}) {
  const js = ts.transpileModule(src, { fileName: 'm.ts', compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const mod = { exports: {} }
  const nomes = Object.keys(escopo)
  const req = (n) => { if (n in mapa) return mapa[n]; throw new Error(`import inesperado ${n}`) }
  new Function('module', 'exports', 'require', ...nomes, js)(mod, mod.exports, req, ...nomes.map((k) => escopo[k]))
  return mod.exports
}
const fatia = (txt, ini, fim) => {
  const a = txt.indexOf(ini)
  const b = a < 0 ? -1 : txt.indexOf(fim, a + ini.length)
  return a < 0 || b < 0 ? null : txt.slice(a, b)
}

// ── relógio VIRTUAL: cada espera (FLUX, crítico, teto) vira um alarme; o relógio só anda quando todo o código pronto já rodou
// (macrotarefa), e anda até o alarme mais próximo — atividades em paralelo de verdade, sem um atraso empurrar o outro ──
function relogio(t0 = 1_000_000) {
  const r = { t: t0, pend: [], agendado: false }
  const passo = () => {
    r.agendado = false
    if (!r.pend.length) return
    r.pend.sort((a, b) => a.at - b.at)
    r.t = Math.max(r.t, r.pend[0].at)
    const prontos = r.pend.filter((p) => p.at <= r.t)
    r.pend = r.pend.filter((p) => p.at > r.t)
    for (const p of prontos) p.fn()
    agenda()
  }
  const agenda = () => { if (!r.agendado && r.pend.length) { r.agendado = true; realSetTimeout(passo, 0) } }
  r.Date = { now: () => r.t }
  r.setTimeout = (fn, ms) => { const h = { at: r.t + Math.max(0, ms), fn }; r.pend.push(h); agenda(); return h }
  r.clearTimeout = (h) => { r.pend = r.pend.filter((p) => p !== h) }
  r.dura = (ms) => new Promise((res) => r.setTimeout(res, ms))
  return r
}

const CENAS = (n) => Array.from({ length: n }, (_, i) => ({
  description: `harbor ${i + 1}`,
  aiPrompt: `A fishing boat number ${i + 1} crossing a stormy harbor at dawn`,
  voiceover: `In the year 1900 boat number ${i + 1} left the harbor before the storm.`,
  caption: '',
}))
const GEN = 'gen-critico-1410'
const SEED = 424_242

/** Fábrica: o FLUX falso (url por chamada) e o crítico falso (resposta por URL de imagem). */
function fakes(rel, { stillMs = 5_000, criticoMs = 2_000, respostas = {}, stillFalha = new Set() } = {}) {
  const stills = []
  const pedidos = []
  const eventos = []
  let n = 0
  const generateCinematicSceneStill = async (args) => {
    stills.push({ scenePrompt: args.scenePrompt, seed: args.seed, pollWindowMs: args.pollWindowMs, aspect: args.aspect ?? null, styleSuffix: args.styleSuffix, t: rel.t })
    const k = n++
    const janela = typeof args.pollWindowMs === 'number' ? args.pollWindowMs : Infinity
    await rel.dura(Math.min(stillMs, janela))
    return stillFalha.has(k) || stillMs > janela ? null : `still://${k}`
  }
  const fetch = async (url, init) => {
    const corpo = JSON.parse(init.body)
    const img = corpo.messages[1].content.find((p) => p.type === 'image_url').image_url.url
    pedidos.push({ img, modelo: corpo.model, t: rel.t })
    const r = respostas[img] ?? { verdict: 'PASS', issues: [], reason: '', score: 85 }
    if (r === 'pendura') return new Promise((_, rej) => init.signal.addEventListener('abort', () => { const e = new Error('aborted'); e.name = 'AbortError'; rej(e) }))
    await rel.dura(criticoMs)
    if (typeof r === 'number') return { ok: false, status: r, json: async () => ({}) }
    return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: JSON.stringify(r) } }], usage: { prompt_tokens: 3200, completion_tokens: 40 } }) }
  }
  const writeServerEvent = async (ev) => { eventos.push({ ...ev, t: rel.t }); return true }
  return { stills, pedidos, eventos, generateCinematicSceneStill, fetch, writeServerEvent }
}
const FAIL = (issues, score = 30) => ({ verdict: 'FAIL', issues, reason: 'mão com seis dedos', score })
const PASS = (score = 85) => ({ verdict: 'PASS', issues: [], reason: '', score })

function montaBloco(rotaSrc, libSrc, rel, f) {
  const corpo = fatia(rotaSrc, '      const STILL_POOL = 3\n', '      // Cost logging only')
  if (!corpo) throw new Error('fatia do lote de stills não encontrada')
  const juiz = carrega(rd(JUIZ), { escopo: {} })
  const lib = carrega(libSrc, { mapa: { '@/lib/hollywood/juizStill': juiz }, escopo: { Date: rel.Date, setTimeout: rel.setTimeout, clearTimeout: rel.clearTimeout, fetch: f.fetch } })
  const src = `export async function bloco(ctx: any) {\n  const { scenes, classicScenePrompts, generateCinematicSceneStill, romanceAdulto, ROMANCE_ADULT_SUFFIX, generationSeed, aspectRequested, anchorEngine, generationId, user, writeServerEvent, modoDoCriticoDoStill, novoFilmeDoCritico, criticarStill, esperarCriticos, esperaMaximaDoCritico, STILL_CRITIC_EVENTO, console } = ctx\n  const sceneStills: (string | null)[] = new Array(scenes.length).fill(null)\n  let providerSubmissionMayExist = false\n${corpo}\n  return { sceneStills, stillsMade, stillDeadline }\n}`
  const { bloco } = carrega(src, { escopo: { Date: rel.Date } })
  return (scenes, engine = 'seedance') => bloco({
    scenes, classicScenePrompts: scenes.map((s, i) => `${s.aiPrompt}. Shot ${i + 1}, cinematic grade, light film grain.`),
    generateCinematicSceneStill: f.generateCinematicSceneStill, romanceAdulto: { ativo: false }, ROMANCE_ADULT_SUFFIX: '', generationSeed: SEED,
    aspectRequested: '9:16', anchorEngine: engine, generationId: GEN, user: { id: 'u-1' }, writeServerEvent: f.writeServerEvent, ...lib,
    console: { log() {}, warn() {}, error() {} },
  })
}

// ── a BASE: pai do 1º commit marcado (antes do 1º commit: HEAD) ──
let BASE = null
try {
  const marcados = git(['log', '--format=%H', '--reverse', '-S', MARCA, '--', ROTA]).trim().split('\n').filter(Boolean)
  BASE = marcados.length ? `${marcados[0]}^` : 'HEAD'
} catch { BASE = null }
const rdBase = (p) => { try { return git(['show', `${BASE}:${p}`]).replace(/\r\n/g, '\n') } catch { return null } }

async function verificacoes(over = {}) {
  const V = []
  const v = (rotulo, prova) => V.push([rotulo, Boolean(prova)])
  const rota = over[ROTA] ?? rd(ROTA)
  const libSrc = over[LIB] ?? rd(LIB)
  const rotaBase = rdBase(ROTA)
  const roda = async (modo, opcoes = {}, n = 5, engine = 'seedance', src = rota) => {
    if (modo === undefined) delete process.env.STILL_CRITIC_MODE
    else process.env.STILL_CRITIC_MODE = modo
    const rel = relogio()
    const f = fakes(rel, opcoes)
    const t0 = rel.t
    let res
    try { res = await Promise.race([montaBloco(src, libSrc, rel, f)(CENAS(n), engine), new Promise((_, rej) => realSetTimeout(() => rej(new Error('bloco pendurado (10 s reais)')), 10_000))]) } catch (e) { res = { erro: e.message } }
    return { ...f, res, rel, t0, fim: rel.t, relatos: f.eventos.map((e) => e.metadata) }
  }

  // ═══ (a) off = byte a byte o bloco da base ═══
  v('a base de comparação existe (pai do 1º commit marcado, ou HEAD antes dele)', Boolean(rotaBase))
  if (rotaBase) {
    for (const n of [5, 9, 15]) {
      const base = await roda('off', {}, n, 'seedance', rotaBase)
      const off = await roda('off', {}, n)
      v(`off (${n} cenas): o bloco roda sem erro`, !off.res.erro && !base.res.erro)
      v(`off (${n} cenas): mesmas chamadas ao FLUX que a base (prompt, semente, janela, aspecto, instante)`, JSON.stringify(off.stills) === JSON.stringify(base.stills))
      v(`off (${n} cenas): mesmos stills e mesma contagem que a base`, JSON.stringify(off.res.sceneStills) === JSON.stringify(base.res.sceneStills) && off.res.stillsMade === base.res.stillsMade)
      v(`off (${n} cenas): o bloco termina no mesmo instante que a base`, off.fim === base.fim)
      v(`off (${n} cenas): nenhuma chamada ao crítico, nenhum evento`, off.pedidos.length === 0 && off.eventos.length === 0)
    }
    const offVariantes = []
    for (const m of ['OFF', ' off ', '0', 'false']) offVariantes.push((await roda(m)).pedidos.length)
    v('off também por OFF / " off " / 0 / false', offVariantes.every((x) => x === 0))
  }

  // ═══ (b) log_only — o PADRÃO ═══
  const resp5 = { 'still://1': FAIL(['anatomy']), 'still://3': FAIL(['text', 'artifact'], 20) }
  const padrao = await roda(undefined, { respostas: resp5 })
  const lo = await roda('log_only', { respostas: resp5 })
  for (const [nome, r] of [['STILL_CRITIC_MODE ausente (padrão)', padrao], ['log_only', lo]]) {
    v(`${nome}: julga os 5 stills (5 chamadas, modelo do juiz)`, r.pedidos.length === 5 && r.pedidos.every((p) => p.modelo === 'gpt-4o-mini'))
    v(`${nome}: NUNCA regera — 5 chamadas ao FLUX, nenhuma a mais`, r.stills.length === 5)
    v(`${nome}: a foto original segue em todas as cenas, até nas 2 com FAIL`, JSON.stringify(r.res.sceneStills) === JSON.stringify(['still://0', 'still://1', 'still://2', 'still://3', 'still://4']))
    v(`${nome}: 5 eventos, modo log_only, 2 FAIL com regeraria=true e regerou=false`, r.eventos.length === 5 && r.relatos.every((m) => m.modo === 'log_only') && r.relatos.filter((m) => m.veredito === 'FAIL').length === 2 && r.relatos.filter((m) => m.regeraria).length === 2 && r.relatos.every((m) => m.regerou === false && m.escolhida === 'original' && m.url_final === m.url_original))
  }
  {
    const m2 = lo.relatos.find((m) => m.cena === 2)
    const m4 = lo.relatos.find((m) => m.cena === 4)
    v('log_only: os motivos ficam no evento (cena 2 anatomia; cena 4 texto+artefato; nota)', m2?.problemas?.join() === 'anatomia' && m2?.motivo === 'mão com seis dedos' && m4?.problemas?.join() === 'texto,artefato' && m4?.nota === 20 && m2?.pulado_por === 'modo_log_only')
  }
  const loErro = await roda('log_only', { respostas: { 'still://0': 500 } })
  v('log_only: HTTP 500 do crítico = ERRO no evento e a foto segue', loErro.relatos.find((m) => m.cena === 1)?.veredito === 'ERRO' && loErro.relatos.find((m) => m.cena === 1)?.erro === 'http_500' && loErro.res.sceneStills[0] === 'still://0')

  // ═══ (c) enforce ═══
  {
    const r = await roda('enforce', { respostas: { 'still://1': FAIL(['anatomy']), 'still://5': PASS(90) } })
    const regen = r.stills[5]
    v('enforce: 1 FAIL = exatamente UMA foto nova (6 chamadas ao FLUX)', r.stills.length === 6)
    v('enforce: a foto nova tem semente nova (≠ a do filme) e a instrução positiva logo depois do visual', regen && regen.seed !== SEED && regen.scenePrompt.startsWith('A fishing boat number 2 crossing a stormy harbor at dawn. Natural anatomy: relaxed, well-formed hands'))
    v('enforce: a instrução não nomeia o defeito nem usa negação ("no X" desenha X)', regen && !/\b(?:no|not|without|never|extra|six|deformed|fingers)\b/i.test(regen.scenePrompt.replace(/A fishing boat.*?dawn\. /, '').split('. Shot')[0]))
    v('enforce: a foto nova é julgada de novo (6 chamadas ao crítico) e, aprovada, segue para a cena 2', r.pedidos.length === 6 && r.res.sceneStills[1] === 'still://5')
    v('enforce: as outras cenas seguem com a original', ['still://0', 'still://2', 'still://3', 'still://4'].every((u, i) => r.res.sceneStills[[0, 2, 3, 4][i]] === u))
    const m = r.relatos.find((x) => x.cena === 2)
    v('enforce: o evento conta regerou, regeracao_ok, veredito da nova e a escolha', m?.regerou === true && m?.regeracao_ok === true && m?.veredito_regerada === 'PASS' && m?.escolhida === 'regerada' && m?.url_final === 'still://5' && m?.modo === 'enforce')
  }
  {
    // KINEO-JUIZ-REFAZ-2810 — era "FAIL de novo na foto nova = NÃO regera outra vez (6 FLUX) e segue a de nota maior"; agora o laço refaz a 2ª vez e julga de novo
    const r = await roda('enforce', { respostas: { 'still://2': FAIL(['subject'], 40), 'still://5': FAIL(['subject'], 25) } })
    v('enforce: FAIL de novo na foto nova = 2ª foto nova (7 chamadas ao FLUX), julgada de novo e, aprovada, segue', r.stills.length === 7 && r.res.sceneStills[2] === 'still://6' && r.relatos.find((x) => x.cena === 3)?.escolhida === 'regerada' && r.relatos.find((x) => x.cena === 3)?.regeracoes === 2 && r.relatos.find((x) => x.cena === 3)?.chamadas === 3) // KINEO-JUIZ-REFAZ-2810
    const r3 = await roda('enforce', { respostas: { 'still://2': FAIL(['subject'], 40), 'still://5': FAIL(['subject'], 25), 'still://6': FAIL(['subject'], 35) } })
    v('enforce: as três recusadas = nunca uma 3ª foto nova (7 FLUX) e segue a de nota maior (a original, 40 > 35 > 25)', r3.stills.length === 7 && r3.res.sceneStills[2] === 'still://2' && r3.relatos.find((x) => x.cena === 3)?.escolhida === 'original' && JSON.stringify(r3.relatos.find((x) => x.cena === 3)?.notas) === '[40,25,35]') // KINEO-JUIZ-REFAZ-2810
    const r2 = await roda('enforce', { respostas: { 'still://2': FAIL(['subject'], 25), 'still://5': FAIL(['artifact'], 60), 'still://6': FAIL(['artifact'], 50) } })
    v('enforce: as três recusadas, a foto nova com nota maior segue (a 1ª, 60)', r2.res.sceneStills[2] === 'still://5' && r2.relatos.find((x) => x.cena === 3)?.escolhida_tentativa === 1) // KINEO-JUIZ-REFAZ-2810
  }
  {
    // KINEO-JUIZ-REFAZ-2810 — era "5 FAIL = no máximo 3 fotos novas"; o teto por filme é STILL_CRITIC_MAX_REGERACOES_FILME (6): 5 cenas reprovadas cujas fotos novas também reprovam pedem 10 e recebem 6
    const todasFail = Object.fromEntries(Array.from({ length: 16 }, (_, i) => [`still://${i}`, FAIL(['text'])]))
    const r = await roda('enforce', { respostas: todasFail })
    const novas = r.relatos.reduce((s, m) => s + (m.regeracoes ?? 0), 0)
    v(`enforce: 5 FAIL (e fotos novas também FAIL) = no máximo ${6} fotos novas no filme (teto por filme), nenhuma cena passa de 2`, r.stills.length === 5 + 6 && novas === 6 && r.relatos.every((m) => (m.regeracoes ?? 0) <= 2)) // KINEO-JUIZ-REFAZ-2810
  }
  {
    const r = await roda('enforce', { respostas: { 'still://1': FAIL(['anatomy']) }, stillFalha: new Set([5]) })
    v('enforce: a foto nova falhou no FLUX = segue a original (nunca "sem foto")', r.stills.length === 6 && r.res.sceneStills[1] === 'still://1' && r.relatos.find((m) => m.cena === 2)?.regeracao_ok === false)
  }

  // ═══ (d) timeout = a foto segue ═══
  for (const modo of ['log_only', 'enforce']) {
    const r = await roda(modo, { respostas: { 'still://2': 'pendura' } })
    const m = r.relatos.find((x) => x.cena === 3)
    v(`${modo}: crítico pendurado aborta no teto de 6 s, veredito ERRO, e o still da cena 3 segue`, m?.veredito === 'ERRO' && m?.erro === 'timeout_6000ms' && r.res.sceneStills[2] === 'still://2' && r.stills.length === 5)
  }
  {
    const r = await roda('enforce', { stillMs: 8_000, respostas: { 'still://0': 'pendura', 'still://1': 'pendura', 'still://3': FAIL(['anatomy']) } })
    v('disjuntor: 2 erros desligam o crítico no resto do filme (a cena 4 não é julgada, nem regerada)', r.relatos.filter((m) => m.pulado_por === 'disjuntor').length >= 1 && r.res.sceneStills[3] === 'still://3' && r.stills.length === 5)
  }

  // ═══ (e) os 60 s ═══
  {
    // 15 cenas, FLUX lento (12 s por lote), crítico 2 s, todas FAIL em enforce: 5 lotes = 60 s → o último lote nasce no prazo
    const todasFail = Object.fromEntries(Array.from({ length: 25 }, (_, k) => [`still://${k}`, FAIL(['artifact'])]))
    const base = rotaBase ? await roda('off', { stillMs: 12_000 }, 15, 'kling', rotaBase) : null
    for (const modo of ['log_only', 'enforce']) {
      const r = await roda(modo, { stillMs: 12_000, respostas: todasFail }, 15, 'kling')
      const prazo = r.res.stillDeadline
      v(`${modo}: o prazo do crítico é o dos stills (início + 60 s)`, prazo === r.t0 + 60_000)
      v(`${modo}: nenhuma chamada ao crítico começa depois do prazo`, r.pedidos.every((p) => p.t <= prazo))
      v(`${modo}: nenhum julgamento termina depois do prazo (instante do evento)`, r.eventos.length > 0 && r.eventos.every((e) => e.t <= prazo))
      v(`${modo}: o bloco rodou sem erro`, !r.res.erro)
      v(`${modo}: still nascido sem folga é PULADO por 'prazo' e segue`, r.relatos.some((m) => m.pulado_por === 'prazo' && m.veredito === 'PULADO'))
      if (base) {
        v(`${modo}: o pool de 3 não espera o crítico — os lotes saem nos mesmos instantes que na base (as 15 primeiras chamadas ao FLUX)`, JSON.stringify(r.stills.filter((s) => s.seed === SEED).map((s) => s.t)) === JSON.stringify(base.stills.map((s) => s.t)))
        v(`${modo}: o bloco termina até max(fim da base, prazo)`, r.fim <= Math.max(base.fim, prazo))
      }
    }
    const r = await roda('enforce', { stillMs: 12_000, respostas: todasFail }, 15, 'kling')
    const regen = r.stills.filter((s) => s.seed !== SEED)
    v('enforce: nenhuma foto nova começa com menos de 8 s de folga, nem pede janela além do prazo', regen.every((s) => r.res.stillDeadline - s.t >= 8_000 && s.t + s.pollWindowMs <= r.res.stillDeadline))
  }

  // ═══ (f) o evento ═══
  {
    const e = lo.eventos[0]
    v('evento: nome cinematic_still_critic, session_id = generation_id, path da rota, user', e?.name === 'cinematic_still_critic' && e?.sessionId === GEN && e?.path === '/api/generate-video-cinematic' && e?.userId === 'u-1')
    const m = e?.metadata ?? {}
    v('evento: metadata com generation_id, motor, caminho, versão, veredito, problemas, nota, regeraria, custo, ms, modelo', m.generation_id === GEN && m.engine === 'seedance' && m.path_kind === 'classico' && m.versao === 'still_critic_v1' && typeof m.veredito === 'string' && Array.isArray(m.problemas) && typeof m.regeraria === 'boolean' && typeof m.custo_usd === 'number' && m.custo_usd > 0 && typeof m.ms === 'number' && m.modelo === 'gpt-4o-mini' && m.url_original === 'still://0')
    v('evento: custo por foto julgada ≈ US$ 0,0005 (usage 3.200/40 tokens)', Math.abs(m.custo_usd - (3200 * 0.15 + 40 * 0.6) / 1e6) < 1e-9)
  }

  // ═══ (g) hollywood ═══
  {
    const defs = fatia(rota, '      const criticoHModo = ', '      // Veredito do Contrato Cena Verdadeira')
    v('hollywood: o bloco do crítico existe na rota', Boolean(defs))
    if (defs) {
      const rodaH = async (modo, family, resposta) => {
        process.env.STILL_CRITIC_MODE = modo
        const rel = relogio()
        const f = fakes(rel, { respostas: { 'still://h': resposta } })
        const juiz = carrega(rd(JUIZ), { escopo: {} })
        const lib = carrega(libSrc, { mapa: { '@/lib/hollywood/juizStill': juiz }, escopo: { Date: rel.Date, setTimeout: rel.setTimeout, clearTimeout: rel.clearTimeout, fetch: f.fetch } })
        const { h } = carrega(`export async function h(ctx: any) {\n  const { family, generationSeed, generateCinematicSceneStill, plan, writeServerEvent, user, generationId, modoDoCriticoDoStill, criticoNaFamiliaHollywood, novoFilmeDoCritico, criticarStill, STILL_CRITIC_EVENTO, STILL_CRITIC_ORCAMENTO_SERIAL_MS, esperarCriticos, esperaMaximaDoCritico, console } = ctx\n${defs}\n  const hs = { prompt: 'A lighthouse keeper climbing a spiral stair at night', voiceover: 'He climbed the stairs.' }\n  let sceneStillUrl: string | null = 'still://h'\n  const idx = 0\n  const antesDoLaco = f.pedidos.length\n  if (criticoHCena && sceneStillUrl) sceneStillUrl = await criticoHCena(idx, sceneStillUrl, hs)\n  const pedidosNaCena = f.pedidos.length\n  const eventosNaCena = f.eventos.length\n  const tNaCena = Date.now()\n  const naCena = sceneStillUrl\n  if (criticoHFilme) { await esperarCriticos(criticoHTarefas, esperaMaximaDoCritico(criticoHFilme, Date.now())); await esperarCriticos(criticoHEventos, 1_500) }\n  return { naCena, pedidosNaCena, eventosNaCena, tNaCena, t0: 1_000_000, existe: Boolean(criticoHCena) }\n}`, { escopo: { Date: rel.Date, f } })
        const out = await h({ family, generationSeed: SEED, generateCinematicSceneStill: f.generateCinematicSceneStill, plan: { styleSheet: 'teal grade' }, writeServerEvent: f.writeServerEvent, user: { id: 'u-1' }, generationId: GEN, ...lib, console: { log() {}, warn() {}, error() {} } })
        return { ...out, f }
      }
      const s25 = await rodaH('enforce', 's25', FAIL(['anatomy']))
      v('hollywood: nunca no s25 (o juiz da foto-base já cobre) — nenhuma chamada, nenhum evento', !s25.existe && s25.f.pedidos.length === 0 && s25.f.eventos.length === 0)
      const off = await rodaH('off', 'hollywood', FAIL(['anatomy']))
      v('hollywood: off = nada roda', !off.existe && off.f.pedidos.length === 0)
      const lo = await rodaH('log_only', 'omni', FAIL(['anatomy']))
      v('hollywood log_only: a cena NÃO espera (veredito ainda não chegou quando a cena segue) e a foto original segue', lo.naCena === 'still://h' && lo.pedidosNaCena === 1 && lo.eventosNaCena === 0 && lo.tNaCena === lo.t0 && lo.f.stills.length === 0)
      v('hollywood log_only: o evento é gravado depois do laço (caminho hollywood, motor = família)', lo.f.eventos.length === 1 && lo.f.eventos[0].metadata.path_kind === 'hollywood' && lo.f.eventos[0].metadata.engine === 'omni' && lo.f.eventos[0].metadata.regeraria === true)
      const en = await rodaH('enforce', 'hollywood', FAIL(['anatomy']))
      v('hollywood enforce: a cena espera o veredito e recebe a foto nova (1 regeração, estilo do filme)', en.eventosNaCena === 1 && en.tNaCena > en.t0 && en.naCena === 'still://0' && en.f.stills.length === 1 && en.f.stills[0].styleSuffix === 'teal grade' && en.f.stills[0].seed !== SEED)
    }
    const iJuiz = rota.indexOf("if (juizStillCena && sceneStillUrl) sceneStillUrl = await juizStillCena(")
    const iCrit = rota.indexOf('if (criticoHCena && sceneStillUrl) sceneStillUrl = await criticoHCena(idx, sceneStillUrl, hs)')
    const iAnc = rota.indexOf('const sceneAnchor = anchorUrl ?? sceneStillUrl ?? undefined')
    v('hollywood: a linha da cena fica DEPOIS do juiz do s25 e ANTES da âncora final (hSceneAnchors e o POST leem a foto escolhida)', iJuiz > 0 && iCrit > iJuiz && iAnc > iCrit)
    const iEspera = rota.indexOf('await esperarCriticos(criticoHTarefas, esperaMaximaDoCritico(criticoHFilme, Date.now()))')
    const iResumo = rota.indexOf('const resumoJuiz = resumoDoJuizStill(juizStillFilme, plan.scenes.length)')
    v('hollywood: a espera das críticas fica depois do laço de cenas, antes do resumo do juiz', iEspera > iAnc && iResumo > iEspera)
    const iPost = rota.indexOf('const results = await Promise.allSettled(', rota.indexOf('const criticarStillClassico'))
    const iAplica = rota.indexOf('for (const c of await esperarCriticos(criticoTarefas')
    const iSubmit = rota.indexOf('const submitScene = async (')
    v('clássico: a escolha do crítico entra em sceneStills ANTES do despacho das cenas', iAplica > 0 && iSubmit > iAplica && (iPost < 0 || iPost > iAplica))
  }

  // ═══ (h) modelo, lib e byte a byte ═══
  {
    const juiz = carrega(rd(JUIZ), { escopo: {} })
    const L = carrega(libSrc, { mapa: { '@/lib/hollywood/juizStill': juiz } })
    v('modelo: o crítico usa a constante do juiz do s25 (JUIZ_STILL_MODELO), nenhuma string crua de modelo na lib nova', L.STILL_CRITIC_MODELO === juiz.JUIZ_STILL_MODELO && !/(['"`])(?:openai\/)?gpt-[^'"`]*\1/.test(libSrc))
    v('modo: ausente / vazio / desconhecido = log_only; off/OFF/0/false = off; enforce = enforce', L.modoDoCriticoDoStill('') === 'log_only' && L.modoDoCriticoDoStill(null) === 'log_only' && L.modoDoCriticoDoStill('qualquer') === 'log_only' && L.modoDoCriticoDoStill('OFF') === 'off' && L.modoDoCriticoDoStill('0') === 'off' && L.modoDoCriticoDoStill('false') === 'off' && L.modoDoCriticoDoStill(' Enforce ') === 'enforce' && L.modoDoCriticoDoStill('log-only') === 'log_only')
    v('resposta: FAIL sem problema da lista (gosto) vira PASS; JSON quebrado = null; verdict estranho = null', L.lerRespostaDoCritico('{"verdict":"FAIL","issues":["ugly"],"score":20}').veredito === 'PASS' && L.lerRespostaDoCritico('x{') === null && L.lerRespostaDoCritico('{"verdict":"MAYBE"}') === null && L.lerRespostaDoCritico('{"verdict":"FAIL","issues":["anatomy","anatomy","text"],"score":140}').problemas.join() === 'anatomia,texto' && L.lerRespostaDoCritico('{"verdict":"FAIL","issues":["anatomy"],"score":140}').nota === 100)
    const todas = L.instrucaoDoCritico(['artefato', 'texto', 'anatomia', 'sujeito'])
    v('instrução: uma frase por problema (sujeito → anatomia → texto → artefato), sem negação e sem nomear o defeito', todas.startsWith('The main subject') && todas.split('. ').length >= 4 && !/\b(?:no|not|without|never|avoid|extra|deformed|garbled|watermark|letters?|text)\b/i.test(todas) && L.instrucaoDoCritico([]) === '')
    v('semente da foto nova: determinística e diferente da do filme', L.seedDaRegeracaoCritico(SEED, 1) === L.seedDaRegeracaoCritico(SEED, 1) && L.seedDaRegeracaoCritico(SEED, 1) !== SEED && L.seedDaRegeracaoCritico(SEED, 1) !== L.seedDaRegeracaoCritico(SEED, 2))
    v('esperaMaxima: com prazo = até o prazo (teto de uma cena); sem prazo = teto de uma cena', L.esperaMaximaDoCritico(L.novoFilmeDoCritico('log_only', { prazo: 1_030_000 }), 1_000_000) === L.STILL_CRITIC_TETO_CENA_MS && L.STILL_CRITIC_TETO_CENA_MS === 30_000 && /* KINEO-JUIZ-REFAZ-2810 — era 20_000 fixo; o teto da cena subiu para 30 s (2 fotos novas) */ L.esperaMaximaDoCritico(L.novoFilmeDoCritico('log_only', { prazo: 1_005_000 }), 1_000_000) === 5_000 && L.esperaMaximaDoCritico(L.novoFilmeDoCritico('log_only', { prazo: 900_000 }), 1_000_000) === 0 && L.esperaMaximaDoCritico(L.novoFilmeDoCritico('enforce', {}), 1) === L.STILL_CRITIC_TETO_CENA_MS) // KINEO-JUIZ-REFAZ-2810 — era === 20_000
    const offR = await L.criticarStill({ indice: 0, url: 'u', mostra: 'x', fala: 'y', prompt: 'z', seed: 1 }, { filme: L.novoFilmeDoCritico('off'), gerarStill: async () => 'nova', fetchImpl: async () => { throw new Error('não devia chamar') } })
    v('lib: modo off não chama nada e devolve a mesma foto', offR.url === 'u' && offR.relato.chamadas === 0 && offR.relato.veredito === 'PULADO')
  }
  {
    const forma = FORMA_JUIZ_STILL_1410[ROTA]
    v(`desfaz: a rota tem exatamente ${forma.acrescimos} linhas marcadas, todas acréscimos (nenhuma troca)`, rota.split('\n').filter((l) => l.includes(MARCA)).length === forma.acrescimos && forma.trocas === 0)
    v('desfaz: idempotente e recusa ajuste pela metade', semJuizStill1410(ROTA, 'a\nb') === 'a\nb' && (() => { try { semJuizStill1410(ROTA, `x // ${MARCA}`); return false } catch { return true } })())
    if (rotaBase) v(`byte a byte: desfeito o ajuste, a rota é EXATAMENTE a base (${BASE})`, desfazJuizStill1410(ROTA, semCenaNegacao1510(semTrilha15s1610(rota, ROTA) /* reancorado KINEO-TRILHA-15S */, ROTA)) === rotaBase) // reancorado KINEO-CENA-NEGACAO-1510 [TRAVA 8.2 — vai do fundador 15/10]: a negação no contrato de cena sai em memória antes do byte a byte
    const sujos = git(['diff', '--name-only', BASE, (BASE && BASE.endsWith('^') ? BASE.slice(0, -1) : 'HEAD'), '--', 'app', 'lib', 'components']) /* reancorado KINEO-LEVA-1410-BASE: mede o PRÓPRIO commit do conserto, não a árvore (levas posteriores o deixavam vermelho) */.trim().split('\n').filter(Boolean)
    v(`só a rota e a lib nova mudaram em app/lib/components contra a base (${sujos.join(', ')})`, sujos.every((p) => p === ROTA || p === LIB))
    const proibidos = git(['diff', '--name-only', BASE, (BASE && BASE.endsWith('^') ? BASE.slice(0, -1) : 'HEAD'), '--', 'lib/engineWall.ts', 'lib/homeVideoCuration.ts', 'lib/ads', 'app/api/ads', 'lib/engineCost.ts', 'lib/hollywood/anchors.ts']) /* reancorado KINEO-LEVA-1410-BASE */.trim()
    v('intocados: engineWall, homeVideoCuration, Ads, engineCost e anchors', proibidos === '')
  }
  return V
}

// ═══ rodada principal ═══
let pass = 0
let fail = 0
const principal = await verificacoes()
for (const [rotulo, okk] of principal) { if (okk) { pass++; console.log('  ok  ' + rotulo) } else { fail++; console.log('  FAIL ' + rotulo) } }

// ═══ (i) mutantes — cada um aplica (prova por texto) e fica vermelho ═══
const troca = (txt, de, para) => { if (!txt.includes(de)) return null; return txt.replace(de, para) }
const rotaAtual = rd(ROTA)
const libAtual = rd(LIB)
const MUTANTES = [
  ['M1 log_only regera (a linha do log_only some da lib)', LIB, troca(libAtual, "    if (filme.modo !== 'enforce') { r.pulado_por = 'modo_log_only'; return { url, relato: r } }\n", '')],
  ['M2 teto da chamada ignora a folga (6 s fixos × 10)', LIB, troca(libAtual, 'const v1 = await chamarCritico(e, e.url, { timeoutMs: Math.min(STILL_CRITIC_TIMEOUT_MS, restante())', 'const v1 = await chamarCritico(e, e.url, { timeoutMs: STILL_CRITIC_TIMEOUT_MS * 10')],
  ['M3 off também roda o crítico na rota', ROTA, troca(rotaAtual, "const criticoFilme = criticoModo === 'off' ? null : novoFilmeDoCritico", 'const criticoFilme = false ? null : novoFilmeDoCritico')],
  ['M4 a escolha do enforce não entra em sceneStills', ROTA, troca(rotaAtual, ')) sceneStills[c.idx] = c.url // KINEO-JUIZ-STILL-1410', ')) void c // KINEO-JUIZ-STILL-1410')],
  ['M5 o evento não é gravado', ROTA, troca(rotaAtual, 'criticoEventos.push(writeServerEvent({ name: STILL_CRITIC_EVENTO', 'void (({ name: STILL_CRITIC_EVENTO')],
  ['M6 sem teto de regerações por filme', LIB, troca(libAtual, 'if (filme.regeracoesRestantes <= 0)', 'if (false)')],
  ['M7 o prazo dos stills é ignorado', LIB, troca(libAtual, 'return { prazo: filme.prazo - t,', 'return { prazo: Infinity,')],
  ['M8 o pool espera o crítico (await dentro do lote)', ROTA, troca(rotaAtual, 'if (criticoFilme && url) criticoTarefas.push(criticarStillClassico(idx, url))', 'if (criticoFilme && url) await criticarStillClassico(idx, url).then((c) => { criticoTarefas.push(Promise.resolve(c)) })')],
  ['M9 hollywood roda no s25', LIB, troca(libAtual, "family.length > 0 && family !== 's25'", 'family.length > 0')],
  ['M10 timeout derruba a foto (url vazia no ERRO)', LIB, troca(libAtual, "      if (filme.erros >= STILL_CRITIC_ERROS_PARA_DESLIGAR) filme.desligado = true\n      return { url, relato: r }", "      if (filme.erros >= STILL_CRITIC_ERROS_PARA_DESLIGAR) filme.desligado = true\n      url = ''\n      return { url, relato: r }")],
]
let mutantesVermelhos = 0
for (const [nome, arq, txt] of MUTANTES) {
  if (txt === null) { fail++; console.log(`  FAIL mutante ${nome}: não aplicou (âncora sumiu)`); continue }
  const aplicou = txt !== (arq === ROTA ? rotaAtual : libAtual)
  // mutante da rota: a forma do desfaz muda? o byte a byte cobre; para os outros, o comportamento
  const over = { [arq]: txt }
  if (arq === ROTA) over[ROTA] = txt
  const res = await verificacoes(over)
  const vermelhas = res.filter(([, o]) => !o).map(([r]) => r)
  if (aplicou && vermelhas.length > 0) { mutantesVermelhos++; pass++; console.log(`  ok  mutante ${nome}: aplicou e ficou vermelho (${vermelhas.length}: ${vermelhas[0].slice(0, 90)})`) } else { fail++; console.log(`  FAIL mutante ${nome}: aplicou=${aplicou}, vermelhas=${vermelhas.length}`) }
}
delete process.env.STILL_CRITIC_MODE
console.log(`\n${pass} ok · ${fail} falha(s) · ${mutantesVermelhos}/${MUTANTES.length} mutantes vermelhos · base ${BASE}`)
process.exit(fail === 0 ? 0 : 1)
