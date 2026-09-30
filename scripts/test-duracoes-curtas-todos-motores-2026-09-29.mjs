// ═══ KINEO-DURACOES-CURTAS-2026-09-29 [TRAVA 8.2 — vai do fundador 29/09 'vai pra todas as 4'] — guardião ═══
// Fundador (29/09): "nem todo mundo faz vídeo de um minuto" — 15 s em TODOS os motores (e 30 s na estrada hollywood).
// Este guardião EXECUTA (readFileSync + transpile + vm; sem rede, sem banco, sem fornecedor, sem alias @/ resolvido pelo node):
//   A. estrada CLÁSSICA (Kling 2.5 e Veo 3.1 a 15 s): a tabela motor × durações, a recusa honesta fora dela, o preço
//      (creditCostForDuration) e a margem sobre o custo fal dos clipes PLANEJADOS; as FATIAS REAIS da rota do cinematic
//      (contagem de clipes, construção de cenas, segundos de cada plano) com roteiros reais de 15 s em en/pt/es — prosa,
//      roteiro marcado de 4 blocos, roteiro colado de 7 blocos e modo IA — provando: clipes somam ≥ 15 s e cobrem a fala,
//      cada clipe dentro do schema do motor (Kling 5|10; Veo 4|6|8), nenhum clipe repetido, fala inteira (as cenas somam a
//      narração palavra por palavra), mudo ≤ 6 s e o ensaio de $0 (classicDryRunReport) sem problema; a voz do 15 s assinada;
//      a guarda de roteiro longo; o escritor 36–41 (en/pt/es) com ritmo por idioma; as telas (/studio, /generate, handoff).
//   B. estrada HOLLYWOOD (Kling 3, MiniMax H3, Omni, Seedance 2.5 a 15 e 30 s) — seção B, abaixo.
//   Mutantes VERMELHOS (aplicados na memória sobre a fonte real e revertidos): piso de 34 s de volta, clipe fora do schema,
//   preço subindo em silêncio (clamp e troca de duração na rota), voz do 15 s só no Seedance, guarda que sempre aprova,
//   fusão de blocos do Kling apagada.
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import vm from 'node:vm'

const RAIZ = resolve(join(dirname(fileURLToPath(import.meta.url)), '..'))
const requireDaRaiz = createRequire(join(RAIZ, 'package.json'))
const ts = requireDaRaiz('typescript')
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) ok++; else { falhas.push(n); console.log('  FALHOU: ' + n) } }
const silencio = { log() {}, warn() {}, error() {} }

// Carregador: transpila o TS real e resolve '@/…' e './…' à mão (o node não resolve o alias). `fontes` troca a fonte de um
// arquivo (é assim que os mutantes são aplicados SEM tocar no disco — e revertidos ao descartar o carregador).
function carregador(fontes = {}) {
  const cache = new Map()
  const carrega = (rel) => {
    let p = rel.replace(/\\/g, '/')
    for (const ext of ['.ts', '.tsx', '']) if (fontes[p + ext] !== undefined || existsSync(join(RAIZ, p + ext))) { p = p + ext; break }
    if (cache.has(p)) return cache.get(p)
    const src = fontes[p] ?? rd(p)
    const js = ts.transpileModule(src, { compilerOptions: { module: 1, target: 9 } }).outputText
    const exp = {}
    cache.set(p, exp)
    const req = (m) => {
      if (m.startsWith('@/')) return carrega(m.slice(2))
      if (m.startsWith('./') || m.startsWith('../')) return carrega(join(dirname(p), m).replace(/\\/g, '/'))
      return requireDaRaiz(m)
    }
    vm.runInNewContext(js, { exports: exp, module: { exports: exp }, require: req, console: silencio, process: { env: {} } })
    return exp
  }
  return carrega
}
const L = carregador()
const D = L('lib/durationByEngine')
const E = L('lib/credits/engineCost')
const K = L('lib/cinematic/klingShots')
const V = L('lib/cinematic/veoShots')
const P = L('lib/scriptParser')
const VB = L('lib/cinematic/verbatimBeats')
const CDR = L('lib/cinematic/classicDryRun')
const VOZ = L('lib/vozDoFilmeCurto')
const SR = L('lib/speechRate')
const W = L('lib/scriptWriterRate')

const ROTA_P = 'app/api/generate-video-cinematic/route.ts'
const ROTA = rd(ROTA_P)
const palavras = (t) => String(t ?? '').trim().split(/\s+/).filter(Boolean)
const eqJ = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const fatia = (src, ini, fim) => { const a = src.indexOf(ini); if (a < 0) return null; const b = src.indexOf(fim, a + ini.length); return b < 0 ? null : src.slice(a, b + fim.length) }
const USD_POR_CREDITO_STUDIO = 0.183 // docs/DECISAO-PRECOS-V8-2026-09-28.md: Studio US$ 54,90 / 300 cr
const USD_STILL = 0.1 // still FLUX de âncora por cena — ANCHORS_USD, a régua CONSERVADORA da casa (o Kling 2.5 e o Veo ancoram TODAS as cenas)
const USD_TTS_COMPOSE = 0.3 // TTS + Creatomate por filme (estimativa da casa, route.ts KINEO-VEO-90)

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
console.log('A0) a tabela motor × durações (fonte única: lib/durationByEngine supportedDurationsFor)')
function provaTabelaClassica(M) {
  const r = []
  for (const e of ['kling', 'cinematic_kling', 'veo', 'cinematic_veo']) r.push(eqJ([...M.supportedDurationsFor(e)], [15, 35, 60, 90]))
  for (const e of ['seedance', 'cinematic_ai', '', null]) r.push(eqJ([...M.supportedDurationsFor(e)], [15, 35, 60, 90]))
  for (const e of ['sora', 'fast', 'avatar']) r.push(eqJ([...M.supportedDurationsFor(e)], [35, 60, 90]))
  // a tela com o interruptor desligado não mostra as curtas NOVAS; o Seedance segue com o 15 dele
  r.push(eqJ([...M.supportedDurationsFor('kling', { curtas: false })], [35, 60, 90]) && eqJ([...M.supportedDurationsFor('veo', { curtas: false })], [35, 60, 90]))
  r.push(eqJ([...M.supportedDurationsFor('seedance', { curtas: false })], [15, 35, 60, 90]))
  return r.every(Boolean)
}
checa('Kling 2.5 e Veo 3.1 oferecem 15/35/60/90; Seedance intacto; Sora/Kineo 1/Avatar 35/60/90; curtas:false esconde só as novas', provaTabelaClassica(D))

console.log('A1) checarDuracao: a tabela é a porta; fora dela, recusa honesta (nunca troca em silêncio)')
function provaChecagemClassica(M) {
  const r = []
  for (const e of ['kling', 'veo', 'cinematic_kling', 'cinematic_veo']) {
    for (const s of [15, 35, 60, 90]) r.push(M.checarDuracao(e, s).ok === true)
    const c20 = M.checarDuracao(e, 20); r.push(c20.ok === false && c20.recusa === 'duration_not_offered' && c20.sugestao === 35)
    const c10 = M.checarDuracao(e, 10); r.push(c10.ok === false && c10.recusa === 'duration_not_offered' && c10.sugestao === 15)
    const inf = M.checarDuracao(e, Infinity); r.push(inf.ok === false && inf.sugestao === 15)
  }
  const sora = M.checarDuracao('sora', 15); r.push(sora.ok === false && sora.recusa === 'only_seedance_15s' && sora.sugestao === 35)
  const s10 = M.checarDuracao('seedance', 10); r.push(s10.ok === false && s10.recusa === 'duration_not_offered' && s10.sugestao === 15)
  r.push(M.checarDuracao('seedance', 15).ok === true)
  r.push(M.mensagemDaRecusaDeDuracao(M.checarDuracao('kling', 20), 'kling') === 'Kling 2.5 films are 15, 35, 60 or 90 seconds long; pick one of those. Nothing was charged.')
  r.push(M.mensagemDaRecusaDeDuracao(M.checarDuracao('seedance', 10), 'seedance') === M.SEEDANCE_DURATION_NOT_OFFERED_MESSAGE)
  r.push(M.mensagemDaRecusaDeDuracao(M.checarDuracao('seedance', 10)) === M.SEEDANCE_DURATION_NOT_OFFERED_MESSAGE)
  return r.every(Boolean)
}
checa('Kling/Veo: 15/35/60/90 passam; 20→sugere 35, 10→sugere 15 (nunca abaixo do pedido); Sora a 15 recusa; Seedance como antes; frase pelo motor', provaChecagemClassica(D))

console.log('A2) preço: creditCostForDuration na duração pedida (a mesma função que debita); clamp de 10 s não morde')
const QUALIDADE = { seedance: 'cinematic_ai', kling: 'cinematic_kling', veo: 'cinematic_veo', hollywood: 'cinematic_hollywood', h3: 'cinematic_h3', omni: 'cinematic_omni', s25: 'cinematic_s25' }
function provaPreco(Eng) {
  const r = []
  for (const m of ['kling', 'veo']) {
    const base = Eng.creditCostFor(QUALIDADE[m], true)
    const c15 = Eng.creditCostForDuration(QUALIDADE[m], true, 15)
    r.push(c15 === Math.ceil(base * 15 / 60)) // proporcional, arredonda para cima — a régua dos 35/60/90
    r.push(c15 < Eng.creditCostForDuration(QUALIDADE[m], true, 35)) // o curto é mais barato: nada sobe em silêncio
    r.push(Eng.creditCostForDuration(QUALIDADE[m], true, 35) === Math.ceil(base * 35 / 60)) // 35/60/90 intactos
  }
  r.push(Eng.creditCostForDuration('cinematic_kling', true, 15) === 15 && Eng.creditCostForDuration('cinematic_veo', true, 15) === 25)
  r.push(Eng.creditCostForDuration('cinematic_ai', true, 15) === 7)
  return r.every(Boolean)
}
checa('preço a 15 s = ⌈base × 15/60⌉ (Kling 2.5 15 cr, Veo 25 cr, Seedance 7), abaixo do de 35 s, 35/60/90 intactos', provaPreco(E))
const ENGCOST_SRC = rd('lib/credits/engineCost.ts')
const mutClamp = ENGCOST_SRC.replace('const clamped = Math.max(10, Math.min(180, safe))', 'const clamped = Math.max(35, Math.min(180, safe))')
checa('mutante: clamp mínimo sobe para 35 s (preço do filme curto sobe em silêncio) fica VERMELHO', mutClamp !== ENGCOST_SRC && !provaPreco(carregador({ 'lib/credits/engineCost.ts': mutClamp })('lib/credits/engineCost')))

// ═══ As fatias REAIS da rota (estrada clássica) ═══════════════════════════════════════════════════════════════════════
const FATIA_CONTA = fatia(ROTA, '    // #442 — in verbatim mode the final video follows the SCRIPT length, not the', '    if (seedanceShortFilm) clipCount = SEEDANCE_SHORT_CLIPS\n')
const FATIA_CENAS = fatia(ROTA, '    let scenes: { description: string; voiceover: string; caption: string; stockSearchQuery?: string; aiPrompt?: string; clipSeconds?: number }[]', '    // ═══ KINEO-ZERO-SCENES-FALLBACK-2026-09-04')
const FATIA_SEGUNDOS = fatia(ROTA, '    let kling25ClipSeconds: number[] | null = null', '    // KINEO-VIGIA-CENARIO-2026-09-11 — antes de qualquer still ou clipe pago,')
const L_CLIPCOUNT = (/\nfunction clipCountForDuration\(d: number\): number \{\n[^\n]*\n\}/.exec(ROTA) ?? [''])[0]
const L_VEO_CLIPS = '    if (wantsVeo) clipCount = Math.max(clipCount, Math.min(12, Math.ceil(duration / 8) + 1))'
checa('as fatias da rota existem (contagem de clipes, construção das cenas, segundos por plano) e as duas linhas do Veo/clipCount', Boolean(FATIA_CONTA && FATIA_CENAS && FATIA_SEGUNDOS && L_CLIPCOUNT && ROTA.includes(L_VEO_CLIPS)))

function montarRota(rota) {
  const conta = fatia(rota, '    // #442 — in verbatim mode the final video follows the SCRIPT length, not the', '    if (seedanceShortFilm) clipCount = SEEDANCE_SHORT_CLIPS\n')
  const cenas = fatia(rota, '    let scenes: { description: string; voiceover: string; caption: string; stockSearchQuery?: string; aiPrompt?: string; clipSeconds?: number }[]', '    // ═══ KINEO-ZERO-SCENES-FALLBACK-2026-09-04')
  const segundos = fatia(rota, '    let kling25ClipSeconds: number[] | null = null', '    // KINEO-VIGIA-CENARIO-2026-09-11 — antes de qualquer still ou clipe pago,')
  const nomes = ['verbatim', 'wantsKling', 'wantsVeo', 'wantsSora', 'parsedScript', 'narrationRate', 'narrationLanguage', 'body', 'prompt', 'hollywoodPath', 'generateScenes', 'classicVisualPolicy', 'SCENE_WRITER_INPUT_MAX_CHARS', 'resolveVerbatimSegments', 'shortCaptionFromVoiceover', 'removerDatasInventadas', 'scrubInventedSetting', 'seedanceShortMarkedScenes', 'pistasDosTrechos', 'isSeedance15', 'SEEDANCE_SHORT_SECONDS', 'SEEDANCE_SHORT_CLIPS', 'seedanceShortSpeechSeconds', 'seedanceShortClipSeconds', 'SEEDANCE_720P_USD_PER_SECOND', 'wordsPerSceneFor', 'KLING25_CLIP_LOSS_SECONDS', 'VEO_MAX_SHOTS', 'cenasSemDescricaoDoModelo', 'console',
    ...Object.keys(K).filter((k) => k.startsWith('kling25')), ...Object.keys(V).filter((k) => k.startsWith('veo'))]
  const src = `${L_CLIPCOUNT}\nexport async function rodar(ctx: any) {\n  const { ${[...new Set(nomes)].join(', ')} } = ctx\n  let duration = ctx.duration\n  let clipCount = clipCountForDuration(duration)\n${L_VEO_CLIPS}\n${conta}\n  const classicWriterOptions: any = { wordsPerScene: wordsPerSceneFor(duration, clipCount, narrationRate.wordsPerSecond), language: narrationLanguage.language }\n  if (wantsKling) Object.assign(classicWriterOptions, { sceneSeconds: kling25AverageShotSeconds(clipCount, kling25Footage) }, kling25WriterBudget(clipCount))\n${cenas}\n${segundos}\n  return { scenes, clipCount, kling25ClipSeconds, veoClipSeconds, seedanceClipSeconds, kling25Footage, veoFootage }\n}`
  const js = ts.transpileModule(src, { compilerOptions: { module: 1, target: 9 } }).outputText
  const exp = {}
  vm.runInNewContext(js, { exports: exp, console: silencio, JSON, Math, Number, Array, Object, Set, Map, String })
  return exp.rodar
}

const SW = L('lib/cinematic/sceneWords')
function ctxClassico(Kx, Vx, Dx, { motor, duracao, roteiro, verbatim, wps, idioma = 'en', cenasIA = null }) {
  const parsedScript = P.parseUserScript(roteiro)
  return {
    verbatim, wantsKling: motor === 'kling', wantsVeo: motor === 'veo', wantsSora: false, parsedScript, duration: duracao,
    narrationRate: { wordsPerSecond: wps }, narrationLanguage: { language: idioma }, body: { engine: motor }, prompt: roteiro, hollywoodPath: false,
    generateScenes: async (_p, n) => (cenasIA ?? []).slice(0, n).map((v, i) => ({ description: `shot ${i + 1} of the story`, voiceover: v, caption: v.split(' ').slice(0, 4).join(' '), stockSearchQuery: `shot ${i + 1}` })),
    classicVisualPolicy: {}, SCENE_WRITER_INPUT_MAX_CHARS: 6000, resolveVerbatimSegments: VB.resolveVerbatimSegments, shortCaptionFromVoiceover: (t) => String(t ?? '').split(' ').slice(0, 5).join(' '),
    removerDatasInventadas: (t) => ({ texto: t, removidas: [] }), scrubInventedSetting: (t) => ({ text: t, removed: [] }),
    seedanceShortMarkedScenes: Dx.seedanceShortMarkedScenes, pistasDosTrechos: Dx.pistasDosTrechos, isSeedance15: Dx.isSeedance15, SEEDANCE_SHORT_SECONDS: Dx.SEEDANCE_SHORT_SECONDS, SEEDANCE_SHORT_CLIPS: Dx.SEEDANCE_SHORT_CLIPS,
    seedanceShortSpeechSeconds: Dx.seedanceShortSpeechSeconds, seedanceShortClipSeconds: Dx.seedanceShortClipSeconds, SEEDANCE_720P_USD_PER_SECOND: 0.026,
    wordsPerSceneFor: SW.wordsPerSceneFor, KLING25_CLIP_LOSS_SECONDS: Kx.KLING25_CLIP_LOSS_SECONDS, VEO_MAX_SHOTS: Vx.VEO_MAX_SHOTS, cenasSemDescricaoDoModelo: new Set(), console: silencio,
    ...Object.fromEntries(Object.entries(Kx).filter(([k]) => k.startsWith('kling25'))), ...Object.fromEntries(Object.entries(Vx).filter(([k]) => k.startsWith('veo'))),
  }
}

// Roteiros reais de 15 s (a faixa do escritor: 36–41 palavras em en/pt/es), no formato que o "Let AI structure it" devolve
// (4 blocos) e em prosa ("Use my script as is"); e um roteiro colado de 7 blocos.
const MARCADOS = {
  en: `HOOK: [Pexels: calm crater lake at dawn] In 1986, a quiet lake in Cameroon killed 1,746 people in one night.
MICRO REWARD 1: [Pexels: volcanic crater aerial] The water hid a giant bubble of carbon dioxide.
MICRO REWARD 2: [Pexels: foggy valley village] It rolled downhill silently, faster than anyone could run.
PAYOFF: [Pexels: pipes venting gas from lake] Today, pipes vent the gas so it never happens again.`,
  pt: `HOOK: [Pexels: calm crater lake at dawn] Em 1986, um lago em Camarões matou quase duas mil pessoas numa noite.
MICRO REWARD 1: [Pexels: volcanic crater aerial] A água escondia uma bolha gigante de gás carbônico.
MICRO REWARD 2: [Pexels: foggy valley village] O gás desceu o vale em silêncio.
PAYOFF: [Pexels: pipes venting gas from lake] Hoje, canos soltam o gás aos poucos para nunca mais acontecer.`,
  es: `HOOK: [Pexels: calm crater lake at dawn] En 1986, un lago mató a casi dos mil personas en una sola noche.
MICRO REWARD 1: [Pexels: volcanic crater aerial] El agua escondía una burbuja enorme de gas.
MICRO REWARD 2: [Pexels: foggy valley village] El gas bajó por el valle en silencio total.
PAYOFF: [Pexels: pipes venting gas from lake] Hoy, unos tubos liberan el gas para que no vuelva a pasar.`,
}
const PROSA = {
  en: 'In 1986, a quiet lake in Cameroon killed 1,746 people in one night. The water hid a giant bubble of carbon dioxide. It rolled downhill silently, faster than anyone could run. Today, pipes vent the gas so it never happens again.',
  pt: 'Em 1986, um lago em Camarões matou quase duas mil pessoas numa noite. A água escondia uma bolha gigante de gás carbônico. O gás desceu o vale em silêncio. Hoje, canos soltam o gás aos poucos para nunca mais acontecer.',
  es: 'En 1986, un lago mató a casi dos mil personas en una sola noche. El agua escondía una burbuja enorme de gas. El gas bajó por el valle en silencio total. Hoy, unos tubos liberan el gas para que no vuelva a pasar.',
}
const COLADO7 = `HOOK: [Pexels: desert road] Nobody drives this road after dark.
MICRO REWARD 1: [Pexels: old sign] The sign warns about sand storms.
MICRO REWARD 2: [Pexels: dunes wind] Winds reach ninety miles an hour.
ESCALATION: [Pexels: buried car] Cars vanish under the dunes overnight.
MICRO REWARD 3: [Pexels: rescue truck] Rescue teams dig them out weeks later.
RHYTHM: [Pexels: empty desert] Some are never found.
PAYOFF: [Pexels: highway sunset] So the road simply closes at sunset.`
const IA_CENAS = ['A quiet lake in Cameroon killed hundreds of people in one night.', 'Its water hid a giant bubble of carbon dioxide gas.', 'The gas rolled down the valley faster than anyone could run.', 'Today pipes vent the gas so it never happens again.']

const SCHEMA = { kling: [5, 10], veo: [4, 6, 8] }
const USD_POR_S = { kling: 0.07, veo: 0.1 }
const PERDA = 0.16 // o que o compose tira de cada plano (KLING25_CLIP_LOSS_SECONDS)
const executarRota = montarRota(ROTA)
const relatorios = []
async function provaPlanoClassico(rodar, caso, Kx = K, Vx = V, Dx = D) {
  const { motor, roteiro, verbatim, wps, idioma } = caso
  const r = await rodar(ctxClassico(Kx, Vx, Dx, { motor, duracao: 15, roteiro, verbatim, wps, idioma, cenasIA: IA_CENAS }))
  const cenas = r.scenes
  const segundos = cenas.map((s) => s.clipSeconds)
  const narr = verbatim ? P.parseUserScript(roteiro).narration : cenas.map((s) => s.voiceover).join(' ')
  const fala = palavras(narr).length / wps
  const util = segundos.reduce((a, s) => a + Math.max(0, s - PERDA), 0)
  const bruto = segundos.reduce((a, s) => a + s, 0)
  const juntas = cenas.map((s) => s.voiceover).join(' ').replace(/\s+/g, ' ').trim()
  const rep = CDR.classicDryRunReport({ scenes: cenas.map((s) => ({ voiceover: s.voiceover, prompt: s.description })), targetSeconds: 15, secondsPerClip: motor === 'kling' ? 5 : 8, verbatim, wordsPerSecond: wps, sceneSeconds: segundos, clipLossSeconds: PERDA, sceneFitWordsPerSecond: Kx.kling25PlanPace(wps, palavras(narr).length), sceneFitStrict: verbatim })
  const usd = bruto * USD_POR_S[motor] + cenas.length * USD_STILL + USD_TTS_COMPOSE
  const receita = E.creditCostForDuration(QUALIDADE[motor], true, 15) * USD_POR_CREDITO_STUDIO
  const out = {
    segundos, cenas: cenas.length, fala: Math.round(fala * 10) / 10, util: Math.round(util * 10) / 10, bruto,
    noSchema: segundos.every((s) => SCHEMA[motor].includes(s)),
    somaAlvo: bruto >= 15,
    cobreFala: util + 1e-6 >= fala,
    semRepetido: new Set(cenas.map((s) => s.voiceover)).size === cenas.length && cenas.every((s) => palavras(s.voiceover).length > 0),
    falaInteira: juntas === narr.replace(/\s+/g, ' ').trim() && /[.!?…]["'”’)]*$/.test(juntas),
    mudo: Math.max(0, 15 - fala),
    // O aviso de "escalador" do ensaio (+25 % sobre as palavras esperadas) não vale para roteiro verbatim: o /api/compose NÃO reescala
    // narração de claim verbatim (compose/route.ts: `} else if (explicitSpeed != null || claimVerbatim) {`, provado abaixo) — o mesmo
    // falso alarme que o ensaio já dá no Seedance 15 s acima de 47 palavras. Todo OUTRO problema do ensaio reprova.
    ensaio: rep.problems.filter((p) => !(verbatim && p.includes('o compose REESCREVE o corpo da narração'))),
    usd: Math.round(usd * 100) / 100, receita: Math.round(receita * 100) / 100, margem: Math.round((1 - usd / receita) * 100),
    assinados: cenas.every((s) => typeof s.clipSeconds === 'number'),
  }
  out.ok = out.noSchema && out.somaAlvo && out.cobreFala && out.semRepetido && out.falaInteira && out.mudo <= 6 && out.ensaio.length === 0 && out.margem > 0 && out.assinados
  return out
}
console.log('A3) os planejadores REAIS da rota a 15 s: Kling 2.5 e Veo 3.1 × en/pt/es × prosa/marcado/IA, voz 2,5 e 2,3 pal/s')
const CASOS_CLASSICOS = []
for (const motor of ['kling', 'veo']) for (const idioma of ['en', 'pt', 'es']) for (const wps of [2.5, 2.3]) {
  CASOS_CLASSICOS.push({ motor, idioma, wps, verbatim: true, forma: 'marcado', roteiro: MARCADOS[idioma] })
  CASOS_CLASSICOS.push({ motor, idioma, wps, verbatim: true, forma: 'prosa', roteiro: PROSA[idioma] })
}
// o teto da guarda de roteiro longo dos outros motores (1,25 × 15 s = 18,75 s → 46 palavras a 2,5 pal/s): o pior caso de custo que o preço de 15 s aceita
const TETO46 = `${PROSA.en} Scientists still watch it closely.`
for (const motor of ['kling', 'veo']) for (const wps of [2.5, 2.3]) {
  CASOS_CLASSICOS.push({ motor, idioma: 'en', wps, verbatim: true, forma: 'teto46', roteiro: TETO46 })
  CASOS_CLASSICOS.push({ motor, idioma: 'en', wps, verbatim: true, forma: 'colado7', roteiro: COLADO7 })
  CASOS_CLASSICOS.push({ motor, idioma: 'en', wps, verbatim: false, forma: 'IA', roteiro: 'A lake in Cameroon that killed a village in one night' })
}
for (const caso of CASOS_CLASSICOS) {
  const o = await provaPlanoClassico(executarRota, caso)
  relatorios.push({ ...caso, roteiro: undefined, ...o })
  checa(`${caso.motor} 15 s ${caso.idioma} ${caso.forma} voz ${caso.wps}: clipes [${o.segundos}] = ${o.bruto}s (${o.util}s úteis) p/ ${o.fala}s de fala · schema ${o.noSchema} · ≥15 ${o.somaAlvo} · cobre ${o.cobreFala} · sem repetido ${o.semRepetido} · fala inteira ${o.falaInteira} · mudo ${o.mudo.toFixed(1)}s · ensaio ${o.ensaio.length ? o.ensaio.join(' | ') : 'PASS'} · margem ${o.margem}%`, o.ok)
}
{
  // o roteiro colado de 7 blocos: nenhum bloco some das cenas no Kling (fusão de vizinhos), o Veo já fundia
  const o = await provaPlanoClassico(executarRota, { motor: 'kling', idioma: 'en', wps: 2.5, verbatim: true, forma: 'colado7', roteiro: COLADO7 })
  checa(`Kling 15 s, 7 blocos colados em ${o.cenas} planos: todas as ${palavras(P.parseUserScript(COLADO7).narration).length} palavras nas cenas`, o.falaInteira)
  const blocoCurto = fatia(ROTA, "    // ═══ [TRAVA 8.2 — vai do fundador 29/09 'vai pra todas as 4'] KINEO-DURACOES-CURTAS-2026-09-29 — Kling 2.5 e Veo 3.1 a 15 s com roteiro MARCADO ═══", '\n    } // KINEO-DURACOES-CURTAS-2026-09-29\n')
  const semFusao = blocoCurto ? ROTA.split(blocoCurto).join('') : ROTA
  const o2 = await provaPlanoClassico(montarRota(semFusao), { motor: 'kling', idioma: 'en', wps: 2.5, verbatim: true, forma: 'colado7', roteiro: COLADO7 })
  const o3 = await provaPlanoClassico(montarRota(semFusao), { motor: 'kling', idioma: 'es', wps: 2.5, verbatim: true, forma: 'marcado', roteiro: MARCADOS.es })
  checa(`mutante: planejador curto do roteiro marcado apagado fica VERMELHO (volta o sorteio que pula bloco: fala inteira ${o2.falaInteira}; e bloco a bloco: Kling es [${o3.segundos}] margem ${o3.margem}%)`, Boolean(blocoCurto) && semFusao !== ROTA && !o2.falaInteira && o3.margem < 5)
}
{
  // Mutante "clipe fora do schema": a tabela de passos do Veo com 7 s e o plano longo do Kling com 9 s
  const VEO_SRC = rd('lib/cinematic/veoShots.ts')
  const mutVeo = VEO_SRC.replace('export const VEO_SHOT_STEPS: ReadonlyArray<number> = [4, 6, 8]', 'export const VEO_SHOT_STEPS: ReadonlyArray<number> = [4, 7, 8]')
  const Lm = carregador({ 'lib/cinematic/veoShots.ts': mutVeo })
  const o = await provaPlanoClassico(executarRota, { motor: 'veo', idioma: 'en', wps: 2.5, verbatim: true, forma: 'prosa', roteiro: PROSA.en }, Lm('lib/cinematic/klingShots'), Lm('lib/cinematic/veoShots'))
  checa('mutante: Veo com passo de 7 s (fora do schema 4s|6s|8s) fica VERMELHO', mutVeo !== VEO_SRC && !o.noSchema)
  const K_SRC = rd('lib/cinematic/klingShots.ts')
  const mutK = K_SRC.replace('export const KLING25_SHOT_SECONDS = 5', 'export const KLING25_SHOT_SECONDS = 6')
  const Lk = carregador({ 'lib/cinematic/klingShots.ts': mutK })
  const ok2 = await provaPlanoClassico(executarRota, { motor: 'kling', idioma: 'en', wps: 2.5, verbatim: true, forma: 'prosa', roteiro: PROSA.en }, Lk('lib/cinematic/klingShots'), Lk('lib/cinematic/veoShots'))
  checa('mutante: Kling com plano curto de 6 s (fora do schema 5|10) fica VERMELHO', mutK !== K_SRC && !ok2.noSchema)
}

console.log('A4) roteiro longo pedido a 15 s: recusa antes do débito, com a saída que cabe (a mesma régua do Seedance)')
function provaGuarda(M) {
  const t = (n) => Array.from({ length: n }, (_, i) => `w${i}`).join(' ')
  const g = (engine, n, extra = {}) => M.checarFalaCurtaDoMotor({ engine, seconds: 15, verbatim: true, narration: t(n), language: 'en', ...extra })
  const r = []
  for (const e of ['kling', 'veo']) {
    r.push(g(e, 46).ok === true)
    const x = g(e, 47); r.push(x.ok === false && x.recusa === 'script_too_long_for_short_film' && x.sugestao === 35 && x.maxWords === 46)
    r.push(g(e, 150, { verbatim: false }).ok === true) // modo IA: o escritor faz o tamanho
    r.push(g(e, 150, { seconds: 35 }).ok === true) // 35 s: régua de sempre
    r.push(g(e, 38, { language: 'tr' }).ok === true && g(e, 39, { language: 'tr' }).ok === false) // ritmo do turco (2,03): 1,25 × 15 × 2,03 = 38
  }
  r.push(g('seedance', 150).ok === true) // o Seedance tem as duas guardas dele na rota, byte a byte
  const msg = M.scriptTooLongForShortFilmMessageDoMotor(g('kling', 60), 15, 35)
  r.push(msg.includes('Shorten it to about 46 words') && msg.includes('pick 35 s (35 credits)') && msg.includes('Nothing was charged'))
  return r.every(Boolean)
}
checa('Kling/Veo 15 s verbatim: 46 palavras passam, 47 recusam (sugere 35 s com o custo do motor); modo IA e 35 s não se aplicam; turco no ritmo dele', provaGuarda(D))
const DUR_SRC = rd('lib/durationByEngine.ts')
const mutGuarda = DUR_SRC.replace('  if (estSeconds <= limitSeconds) return { ok: true, estSeconds, limitSeconds }\n  const tabela', '  return { ok: true, estSeconds, limitSeconds }\n  const tabela')
checa('mutante: guarda do filme curto dos outros motores que sempre aprova fica VERMELHO', mutGuarda !== DUR_SRC && !provaGuarda(carregador({ 'lib/durationByEngine.ts': mutGuarda })('lib/durationByEngine')))
{
  const iGuarda = ROTA.indexOf('const falaCurtaDoMotor = checarFalaCurtaDoMotor(')
  const iCusto = ROTA.indexOf('    const cost = creditCostForDuration(costQuality, true, duration)')
  const iClaim = ROTA.indexOf('    const claimQuality = wantsS25')
  checa('rota: a guarda nova roda depois do custo (usa a qualidade do motor) e ANTES do claim/débito, com o custo da sugestão pela função que debita', iCusto > 0 && iGuarda > iCusto && iClaim > iGuarda && ROTA.includes('scriptTooLongForShortFilmMessageDoMotor(falaCurtaDoMotor, duration, creditCostForDuration(costQuality, true, falaCurtaDoMotor.sugestao))'))
}

console.log('A5) a voz do 15 s (a mesma do Seedance) no Kling 2.5 e no Veo, assinada no claim')
function provaVoz(VZ) {
  const r = []
  for (const e of ['kling', 'veo', 'cinematic_kling', 'cinematic_veo', 'seedance']) {
    for (const vertical of [null, 'science', 'mystery', 'finance']) {
      const v = VZ.vozDoFilmeCurto({ engine: e, seconds: 15, narration: PROSA.en, vertical, language: 'en' })
      const passo = v ? SR.speechRateFor({ family: 'classic', language: 'en', voice: v.voice, personaSpeed: v.defaultSpeed }).wordsPerSecond : 0
      r.push(Boolean(v) && v.speedFactor > 0 && v.speedFactor <= 1 && passo <= 2.5 + 1e-9)
    }
    r.push(VZ.vozDoFilmeCurto({ engine: e, seconds: 35, narration: PROSA.en, vertical: null, language: 'en' }) === null)
  }
  for (const e of ['hollywood', 'h3', 'omni', 's25', 'fast', 'sora']) r.push(VZ.vozDoFilmeCurto({ engine: e, seconds: 15, narration: PROSA.en, vertical: null, language: 'en' }) === null)
  return r.every(Boolean)
}
checa('vozDoFilmeCurto: Kling 2.5/Veo/Seedance a 15 s → voz com passo ≤ 2,5 pal/s; 35 s e outros motores → null', provaVoz(VOZ))
const VOZ_SRC = rd('lib/vozDoFilmeCurto.ts')
const mutVoz = VOZ_SRC.replace('!isClassicShortEngine(typeof args.engine', '!(typeof args.engine === "string" && ["", "seedance", "cinematic_ai"].includes(args.engine))(typeof args.engine')
checa('mutante: voz do 15 s só no Seedance (Kling/Veo mediriam numa persona de 2,65 pal/s e recusariam 36 palavras) fica VERMELHO', mutVoz !== VOZ_SRC && (() => { try { return !provaVoz(carregador({ 'lib/vozDoFilmeCurto.ts': mutVoz })('lib/vozDoFilmeCurto')) } catch { return true } })())
checa('rota: a voz vai assinada no claim do Kling/Veo 15 s (narration_voice), a do Seedance como estava', ROTA.includes('    if (vozCurta && (wantsKling || wantsVeo)) response.narration_voice = campoDaVozAssinada(vozCurta) // KINEO-DURACOES-CURTAS-2026-09-29') && ROTA.includes('    if (seedanceShortFilm && vozCurta) response.narration_voice = campoDaVozAssinada(vozCurta)\n'))
{
  // o portão de 95 % mede na voz do 15 s: 36 palavras (o piso do escritor) passam em toda persona que a montagem pode escolher
  const r = []
  for (const vertical of [null, 'science', 'mystery', 'finance', 'history', 'motivation']) {
    const v = VOZ.vozDoFilmeCurto({ engine: 'kling', seconds: 15, narration: PROSA.en, vertical, language: 'en' })
    const passo = SR.speechRateFor({ family: 'classic', language: 'en', voice: v.voice, personaSpeed: v.defaultSpeed }).wordsPerSecond
    r.push(36 / passo >= 15 * 0.95 - 1e-9)
  }
  checa('portão de 95 %: 36 palavras (piso do escritor) cobrem 14,25 s na voz do 15 s em toda persona', r.every(Boolean))
}

console.log('A6) o escritor: 36–41 palavras no Kling 2.5 e no Veo a 15 s (en/pt/es), no ritmo da língua nas de palavra longa')
{
  const r = []
  for (const q of ['cinematic_kling', 'cinematic_veo']) for (const l of ['en', 'pt', 'es']) {
    const reg = W.writerRateFor(q, 'x', l)
    r.push(W.minWordsFor(15, reg.wordsPerSecond, reg.coverage, l) === 36 && W.maxWordsFor(15, reg.wordsPerSecond, reg.coverage, l) === 41)
  }
  const regTr = W.writerRateFor('cinematic_kling', 'x', 'tr')
  r.push(W.minWordsFor(15, regTr.wordsPerSecond, regTr.coverage, 'tr') === 29 && W.maxWordsFor(15, regTr.wordsPerSecond, regTr.coverage, 'tr') === 34)
  checa('writerRateFor(Kling/Veo) a 15 s: 36–41 em en/pt/es; turco 29–34 (a língua entra pela rota do escritor)', r.every(Boolean))
  const GS = rd('app/api/generate-script/route.ts')
  checa('generate-script: a língua, o teto duro e a faixa do filme curto valem para Kling 2.5 e Veo, pela guarda DO MOTOR', GS.includes("    const idiomaDoRitmo = isShortFilmTarget(alvoSegundos) && isClassicShortEngine(typeof body.engine === 'string' ? body.engine : null) ? language : undefined") && GS.includes("    const tetoDuroFilmeCurto = isClassicShortEngine(typeof body.engine === 'string' ? body.engine : null) ? Math.max(tetoFilmeCurto, maxWordsCurtoDoMotor(typeof body.engine === 'string' ? body.engine : null, alvoSegundos, idiomaDoRitmo)) : tetoFilmeCurto") && GS.includes("faixaAceitaNoFilmeCurtoDoMotor(typeof body.engine === 'string' ? body.engine : null, alvoSegundos, MIN_COVERAGE, idiomaDoRitmo) : null"))
  const faixaK = D.faixaAceitaNoFilmeCurtoDoMotor('cinematic_kling', 15, 0.95, 'en')
  const faixaS = D.faixaAceitaNoFilmeCurtoDoMotor('cinematic_ai', 15, 0.95, 'en')
  checa(`escritor × guarda concordam: Kling/Veo 15 s aceita ${faixaK.min}–${faixaK.max} (a faixa 36–41 cabe; teto = a guarda de 1,25 ×); Seedance intacto ${faixaS.min}–${faixaS.max}`, faixaK.min === 36 && faixaK.max === 46 && D.maxWordsCurtoDoMotor('veo', 15, 'en') === 46 && D.maxWordsCurtoDoMotor('kling', 15, 'tr') === 38 && faixaS.min === 36 && faixaS.max === 56 && D.maxWordsCurtoDoMotor('seedance', 15, 'en') === D.maxWordsForShortFilm(15, 'en'))
  const EX = rd('app/api/expand-script/route.ts')
  checa('expand-script: a expansão do 15 s mede na voz do 15 s também no Kling 2.5 e no Veo', EX.includes('(isSeedance15(body.engine) || isClassicShortEngine(body.engine))'))
}

console.log('A7) a rota: recusa pelo motor, sem "alvo fantasma" para a curta oferecida, nenhuma troca silenciosa de duração')
{
  const COMPOSE = rd('app/api/compose/route.ts')
  checa('compose: narração de claim verbatim não é reescalada (por isso o aviso de escalador do ensaio não reprova o verbatim acima)', COMPOSE.includes('    const claimVerbatim = cinematicBirthClaim?.response?.verbatim === true') && COMPOSE.includes('    } else if (explicitSpeed != null || claimVerbatim) {') && /\n      verbatim,\n/.test(ROTA))
  checa('a recusa de duração escreve a frase do motor pedido', ROTA.includes("error: mensagemDaRecusaDeDuracao(checagemDuracao, typeof body.engine === 'string' ? body.engine : null), reason: checagemDuracao.recusa"))
  checa('o portão de narração trata a curta do motor como oferecida (resgate e aterrissagem leem oferecidasDoPortao)', (ROTA.match(/oferecidas: oferecidasDoPortao, \/\/ KINEO-DURACOES-CURTAS-2026-09-29/g) ?? []).length === 2 && !ROTA.includes('        oferecidas: SUPPORTED_DURATIONS,'))
  const semTroca = (r) => !/(^|[\s;{)])duration\s*=\s*(Math\.max\([^\n]*\b35\b|35\b|MIN_DURATION_ALL_ENGINES)/m.test(r)
  checa('nenhuma linha da rota sobe a duração para 35 depois do preço mostrado', semTroca(ROTA))
  const mutTroca = ROTA.replace("    const family: CinematicFamily = wantsH3 ? 'h3'", "    if (wantsKling || wantsVeo) duration = Math.max(duration, 35)\n    const family: CinematicFamily = wantsH3 ? 'h3'")
  checa('mutante: rota que troca 15 → 35 em silêncio no Kling/Veo fica VERMELHO', mutTroca !== ROTA && !semTroca(mutTroca))
  checa('a rota importa as funções novas numa linha própria marcada', ROTA.includes("import { checarFalaCurtaDoMotor, scriptTooLongForShortFilmMessageDoMotor, pistasDosTrechos } from '@/lib/durationByEngine' // [TRAVA 8.2 — vai do fundador 29/09 'vai pra todas as 4'] KINEO-DURACOES-CURTAS-2026-09-29 (linha própria)"))
}

console.log('A8) as telas: os botões leem a tabela (interruptor DURACOES_CURTAS_PUBLIC), preço pela função que debita')
{
  const LAUNCH = rd('lib/engineLaunch.ts')
  checa('interruptor DURACOES_CURTAS_PUBLIC existe, nasce false (casa até o canário) e duracoesCurtasVisible = público || casa', /\nexport const DURACOES_CURTAS_PUBLIC = (false|true)\n/.test(LAUNCH) && LAUNCH.includes('  return DURACOES_CURTAS_PUBLIC || isInternalEmail(email)'))
  const CRED = rd('app/api/me/credits/route.ts')
  checa('/api/me/credits devolve a flag `curtas`', CRED.includes('curtas: duracoesCurtasVisible(user.email)'))
  const STUDIO = rd('app/(dashboard)/studio/StudioClient.tsx')
  checa('/studio: os botões curtos de cada motor vêm de supportedDurationsFor(motor, { curtas }) e o card precifica na duração que o motor recebe', STUDIO.includes('[...supportedDurationsFor(key, { curtas: curtasOk })]') && STUDIO.includes("  const duracaoDoCard = (key: EngineKey): number => (key === 'seedance' || curtasDoMotor(key).includes(duration) ? duration : Math.max(duration, MIN_DURATION_ALL_ENGINES))") && STUDIO.includes('const cost = creditCostForDuration(ENGINE_QUALITY[eng.key] ?? \'cinematic_ai\', true, duration)'))
  checa('/studio: trocar de motor só volta a 35 s quando o motor novo não oferece a curta', STUDIO.includes('    if (engine !== \'seedance\' && duration < MIN_DURATION_ALL_ENGINES && !curtasDoMotor(engine).includes(duration)) setDuration(MIN_DURATION_ALL_ENGINES as 35)'))
  const GEN = rd('app/(dashboard)/generate/GenerateClient.tsx')
  const fn = fatia(GEN, 'function durationOptionsFor(', "  30: { value: 30 as Duration, label: '30s — Short' },\n}") ?? ''
  const opcoes = fatia(GEN, 'const DURATION_OPTIONS: { value: Duration; label: string }[] = [', '\n]') ?? ''
  const seedOpt = (GEN.match(/\nconst SEEDANCE_SHORT_OPTION: [^\n]*/) ?? [''])[0]
  let G = null
  try {
    const src = `type Duration = number\ntype GenerationMode = string\n${opcoes}\n${seedOpt}\n${fn}\nexport { durationOptionsFor }`
    const js = ts.transpileModule(src, { compilerOptions: { module: 1, target: 9 } }).outputText
    const exp = {}
    vm.runInNewContext(js, { exports: exp, SEEDANCE_SHORT_SECONDS: 15, supportedDurationsFor: D.supportedDurationsFor })
    G = exp.durationOptionsFor
  } catch (e) { console.log('   (durationOptionsFor não montou: ' + e.message + ')') }
  const v = (m, e, s15, cur, c) => (G ? G(m, e, s15, cur, c).map((o) => o.value) : null)
  checa('/generate (executado): Kling/Veo com curtas → 15/35/60/90; sem → 35/60/90 (15 só se já está nele); Seedance e Kineo 1 como antes',
    Boolean(G) && eqJ(v('cinematic_ai', 'kling', false, 60, true), [15, 35, 60, 90]) && eqJ(v('cinematic_ai', 'veo', true, 60, false), [35, 60, 90]) && eqJ(v('cinematic_ai', 'veo', false, 15, false), [15, 35, 60, 90]) &&
    eqJ(v('cinematic_ai', 'seedance', true, 60, false), [15, 35, 60, 90]) && eqJ(v('cinematic_ai', 'seedance', false, 60, true), [35, 60, 90]) && eqJ(v('fast', 'kling', true, 60, true), [35, 60, 90]) &&
    eqJ(v('cinematic_ai', 'h3', false, 60, true), [15, 30, 35, 60, 90]) && eqJ(v('cinematic_ai', 'hollywood', false, 30, false), [30, 35, 60, 90]) && eqJ(v('cinematic_ai', 's25', false, 60, false), [35, 60, 90]))
  checa('/generate: o cinto do auto-disparo aceita a curta do Studio nos outros motores pela tabela', GEN.includes("    if (uDur > 0 && uDur < 35 && uEng !== '' && uEng !== 'seedance' && supportedDurationsFor(uEng).includes(uDur) && duration !== uDur) { setDuration(uDur as Duration); return }"))
  // handoff (executado): ?duration=15 com Kling/Veo fica 15; sem motor / Kineo 1 / Sora cai no padrão
  const H_SRC = rd('lib/creationHandoff.ts')
  const Hjs = ts.transpileModule(H_SRC, { compilerOptions: { module: 1, target: 9 } }).outputText
  const Hexp = {}
  vm.runInNewContext(Hjs, { exports: Hexp, require: () => ({}) })
  const q = (s) => Hexp.readCreationHandoff(new URLSearchParams(s)).duration
  checa('handoff: 15 com Kling/Veo/Seedance fica 15; 15 sem motor, com Kineo 1 ou Sora cai no padrão; 35/60/90 intactos',
    q('duration=15&engine=kling') === 15 && q('duration=15&engine=veo') === 15 && q('duration=15&engine=seedance') === 15 && q('duration=15') === null && q('duration=15&engine=fast') === null && q('duration=15&engine=sora') === null && q('duration=35&engine=kling') === 35 && q('duration=20&engine=kling') === null)
  const espelho = /const CURTAS_DO_HANDOFF: Readonly<Record<string, readonly number\[\]>> = (\{[^\n]*\})/.exec(H_SRC)?.[1] ?? '{}'
  const tabelaHandoff = vm.runInNewContext(`(${espelho})`)
  checa('handoff: o espelho CURTAS_DO_HANDOFF é a tabela do servidor (as curtas novas de cada motor)', Object.entries(tabelaHandoff).every(([m, ds]) => eqJ(ds, [...D.supportedDurationsFor(m)].filter((d) => d < 35))) && ['kling', 'veo'].every((m) => m in tabelaHandoff))
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// ═══ SEÇÃO B — estrada HOLLYWOOD (Kling 3, MiniMax H3, Omni, Seedance 2.5) a 15 e 30 s, voz própria a 2,3 pal/s ═══
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const HW = ['hollywood', 'h3', 'omni', 's25']
console.log('B0) a tabela e a porta da estrada hollywood')
function provaTabelaHollywood(M) {
  const r = []
  for (const e of [...HW, 'cinematic_hollywood', 'cinematic_h3', 'cinematic_omni', 'cinematic_s25']) {
    r.push(eqJ([...M.supportedDurationsFor(e)], [15, 30, 35, 60, 90]))
    r.push(eqJ([...M.supportedDurationsFor(e, { curtas: false })], [35, 60, 90]))
    for (const s of [15, 30, 35, 60, 90]) r.push(M.checarDuracao(e, s).ok === true)
    const c20 = M.checarDuracao(e, 20); r.push(c20.ok === false && c20.recusa === 'duration_not_offered' && c20.sugestao === 30)
    const c10 = M.checarDuracao(e, 10); r.push(c10.ok === false && c10.sugestao === 15)
  }
  r.push(M.mensagemDaRecusaDeDuracao(M.checarDuracao('h3', 25), 'h3') === 'MiniMax H3 films are 15, 30, 35, 60 or 90 seconds long; pick one of those. Nothing was charged.')
  r.push(M.mensagemDaRecusaDeDuracao(M.checarDuracao('hollywood', 20), 'hollywood').startsWith('Kling 3 films are 15, 30, 35'))
  return r.every(Boolean)
}
checa('Kling 3 / H3 / Omni / Seedance 2.5: 15/30/35/60/90 passam; 20/25 → sugere 30, 10 → 15; curtas:false esconde 15/30; frase pelo motor', provaTabelaHollywood(D))

console.log('B1) o alvo do planejador: piso 30 → 15 (15 → 17, 30 → 34; 35/60/90 intactos) — a expressão REAL da rota, executada')
const alvoHollywood = (rota) => {
  const expr = fatia(rota, '      const hollywoodTarget = (() => {', '      })()')
  if (!expr) return null
  return (duration) => vm.runInNewContext(`(${expr.replace('      const hollywoodTarget = ', '')})`, { duration, Math })
}
const ALVO = alvoHollywood(ROTA)
checa(`hollywoodTarget: 15 → ${ALVO?.(15)}, 30 → ${ALVO?.(30)}, 35 → ${ALVO?.(35)}, 60 → ${ALVO?.(60)}, 90 → ${ALVO?.(90)}`, Boolean(ALVO) && ALVO(15) === 17 && ALVO(30) === 34 && ALVO(35) === 39 && ALVO(60) === 68 && ALVO(90) === 98)
const mutPiso = ROTA.replace('        const req = Math.max(15, Math.min(90, Math.round(duration || 60))) // KINEO-DURACOES-CURTAS-2026-09-29: piso 30 → 15', '        const req = Math.max(30, Math.min(90, Math.round(duration || 60)))')
checa(`mutante: piso do alvo de volta a 30 (15 s pedidos planejam ${alvoHollywood(mutPiso)?.(15)} s — o "34 s" de antes) fica VERMELHO`, mutPiso !== ROTA && alvoHollywood(mutPiso)(15) === 34 && alvoHollywood(mutPiso)(15) !== 17)

console.log('B2) o planejador hollywood (lib/hollywood/router.ts) executado com um GPT de mentira: alvo, instrução curta e teto')
const ROUTER_P = 'lib/hollywood/router.ts'
const ROUTER_SRC = rd(ROUTER_P)
const FAKE_OPENAI = `export const gancho: any = { f: null }
export const openai: any = { chat: { completions: { create: async (req: any) => gancho.f(req) } } }`
const FAKE_VEED = `export const PRESENTER_MODEL = 'presenter'\nexport const PRESENTER_USD_PER_SECOND = 0.0562`
function roteador(routerSrc) {
  const Lr = carregador({ 'lib/openai.ts': FAKE_OPENAI, 'lib/avatar/veed.ts': FAKE_VEED, [ROUTER_P]: routerSrc })
  const R = Lr('lib/hollywood/router')
  R.__gancho = Lr('lib/openai').gancho
  return R
}
const LINHA_LONGA = 'The narration keeps telling this story over the shot with concrete facts from the input, one clear sentence after another, until the scene ends.' // 25 palavras: sustenta 10 s
const cenaGPT = (i, type, seconds, beat) => ({ index: i + 1, type, beat, seconds, prompt: `A wide cinematic shot number ${i + 1} of the story, handheld, film grain`, ...(type === 'dialogue' ? { dialogueLine: LINHA_LONGA } : { voiceover: LINHA_LONGA }), caption: `Scene ${i + 1}` })
async function planejar(R, alvo, cenas, hostFits = false) {
  const pedidos = []
  R.__gancho.f = async (req) => { pedidos.push(req); return { choices: [{ message: { content: JSON.stringify({ genre: 'history', hostFits, stylized: false, characterSheet: 'a fictional woman in her forties with short gray hair and a green coat', environmentSheet: 'a quiet lakeside village at dawn', styleSheet: 'shot on 35mm, teal-orange grade, soft golden backlight, light film grain', scenes: cenas }) } }] } }
  const plan = await R.planHollywoodScenes({ idea: 'A lake in Cameroon that killed a village in one night', durationSeconds: alvo, voiceoverScript: PROSA.en, language: 'en', faceless: !hostFits })
  const user = pedidos[0]?.messages?.find((m) => m.role === 'user')?.content ?? ''
  return { plan, user, total: plan.scenes.reduce((a, s) => a + s.seconds, 0) }
}
{
  const R = roteador(ROUTER_SRC)
  // GPT que ignora o alvo curto e devolve 5 cenas de 10 s (50 s) para um filme de 15 s
  const gordo = Array.from({ length: 5 }, (_, i) => cenaGPT(i, i === 0 || i === 4 ? 'dialogue' : 'support', 10, i === 0 ? 'HOOK' : i === 4 ? 'PAYOFF' : 'ESCALATION'))
  const p17 = await planejar(R, 17, gordo, true)
  checa(`15 s (alvo 17): o pedido ao GPT diz "Target total duration: 17 seconds." + instrução de filme curto; plano de 50 s aparado a ${p17.total} s (teto 23), HOOK e PAYOFF nas pontas`, p17.user.includes('Target total duration: 17 seconds.') && p17.user.includes('SHORT FILM (STRICT') && p17.user.includes('Use 2 to 3 scenes') && p17.total <= 23 && p17.plan.scenes[0].beat === 'HOOK' && p17.plan.scenes[p17.plan.scenes.length - 1].beat === 'PAYOFF')
  const p34 = await planejar(R, 34, gordo, true)
  checa(`30 s (alvo 34): "Target total duration: 34 seconds." + instrução curta (3 a 5 cenas); teto 40 (plano ${p34.total} s)`, p34.user.includes('Target total duration: 34 seconds.') && p34.user.includes('Use 3 to 5 scenes') && p34.total <= 40)
  const p39 = await planejar(R, 39, gordo, true)
  checa(`35 s (alvo 39): pedido SEM instrução curta e teto de sempre (60 — o plano do GPT passa sem o teto curto: ${p39.total} s)`, p39.user.includes('Target total duration: 39 seconds.') && !p39.user.includes('SHORT FILM') && p39.total > 40)
  checa('instrucaoDoFilmeCurto: vazia a partir de 35 (o prompt dos 35/60/90 fica byte a byte)', R.instrucaoDoFilmeCurto(39) === '' && R.instrucaoDoFilmeCurto(68) === '' && R.instrucaoDoFilmeCurto(98) === '' && R.instrucaoDoFilmeCurto(17).length > 0)
  const mutRouter = ROUTER_SRC.replace('  const alvoDoPlano = Math.max(15, Math.min(100, Math.round(durationSeconds || 60))) // KINEO-DURACOES-CURTAS-2026-09-29: piso 30 → 15', '  const alvoDoPlano = Math.max(30, Math.min(100, Math.round(durationSeconds || 60)))')
  const pm = await planejar(roteador(mutRouter), 17, gordo, true)
  checa('mutante: piso de 30 de volta no planejador (o GPT ouve "30 seconds" para um filme de 15) fica VERMELHO', mutRouter !== ROUTER_SRC && !pm.user.includes('Target total duration: 17 seconds.'))
  const mutTeto = ROUTER_SRC.replace('  const ceiling = (durationSeconds || 60) < 35 ? Math.round(durationSeconds) + 6 : Math.max(60, Math.round(durationSeconds || 60) + 6) // KINEO-DURACOES-CURTAS-2026-09-29', '  const ceiling = Math.max(60, Math.round(durationSeconds || 60) + 6)')
  const pt = await planejar(roteador(mutTeto), 17, gordo, true)
  checa(`mutante: teto do plano de volta a 60 no alvo curto (15 s pagaria ${pt.total} s de clipe) fica VERMELHO`, mutTeto !== ROUTER_SRC && pt.total > 23)
}

console.log('B3) o C1 e as passadas do verbatim (fatia REAL da rota) a 15 e 30 s: 4 famílias × en/pt/es × planos do GPT')
const INI_HW = '      let verbatimOverflowWords = 0 // KINEO-FALA-MAIOR-QUE-A-CENA — sobra que não coube em cena nenhuma'
const FIM_HW = "            sceneMax: SILENCE_SCENE_MAX_SECONDS, totalMax: silence.totalMax,\n          }, { status: 422 })\n        }\n      }"
const TL = L('lib/cinematic/timelineContract')
const FID = L('lib/hollywood/fidelidade')
function montarHollywood(rota) {
  const s = fatia(rota, INI_HW, FIM_HW)
  if (!s) return null
  const nomes = ['plan', 'verbatim', 'duration', 'DIALOGUE_CAP', 'SCENE_CAP', 'FILLER_LINE_RE', 'expandVoiceoversToTargets', 'appendNarrationToTargets', 'hollywoodLanguage', 'prompt', 'apararComFolga', 'removerDatasInventadas', 'scrubInventedSetting', 'planSilenceReport', 'writeServerEvent', 'user', 'generationId', 'family', 'MAX_VERBATIM_SCENES', 'hollywoodVoiceover', 'releaseBirthClaim', 'cinematicAdmin', 'body', 'NextResponse', 'hollywoodTarget', 'requestedDuration', 'degrau', 'formatoVisual', 'resolveCharacterVoice', 'cinematicSceneModel', 'buildFalInput', 'confirmCinematicRefund', 'SILENCE_SCENE_MAX_SECONDS', 'SILENCE_TOTAL_MAX_SECONDS', 'fitCinematicPlanFloor', 'console', 'resolveHollywoodVoice', 'hollywoodVertical', 'sceneNarrationsForPlan']
  const src = `export async function rodar(ctx: any) {\n  const { ${nomes.join(', ')} } = ctx\n${s}\n  return { plan, rejeitado: null }\n}`
  const js = ts.transpileModule(src, { compilerOptions: { module: 1, target: 9 } }).outputText
  const exp = {}
  vm.runInNewContext(js, { exports: exp, console: silencio, JSON, Math, Number, Array, Object, Set, Map, String })
  return exp.rodar
}
const CAPS = { hollywood: [12, 15], h3: [12, 15], s25: [12, 15], omni: [10, 10] }
const SCHEMA_HW = { hollywood: [3, 15], h3: [5, 15], omni: [3, 10], s25: [4, 30] } // buildFalInput: Kling O3 3-15 · H3 5-15 · Omni 3-10 · S25 '4'-'30'
const USD_S_HW = { hollywood: 0.168, h3: 0.06, omni: 0.13, s25: 0.208 } // lib/hollywood/router *_USD_PER_SECOND
const ENHANCE_S25 = 0.02 // Topaz Proteus fator 1 por segundo de filme (o S25 sai em 480p + Enhance)
const ANCORAS_HW = 0.1 // ANCHORS_USD (as duas âncoras do Hollywood 3.0, régua conservadora)
function ctxHollywood({ plan, familia, duracao, roteiro, ritmo = 1.0, idioma = 'en' }) {
  const [SCENE_CAP, DIALOGUE_CAP] = CAPS[familia]
  const NextResponse = { json: (b, init) => ({ rejeitado: b, status: init?.status ?? 200 }) }
  const proibido = async () => { throw new Error('modelo de texto chamado em verbatim') }
  return {
    plan, verbatim: true, duration: duracao, DIALOGUE_CAP, SCENE_CAP, FILLER_LINE_RE: /^(imagine|what if)/i, expandVoiceoversToTargets: proibido, appendNarrationToTargets: proibido,
    hollywoodLanguage: idioma, prompt: roteiro, apararComFolga: FID.apararComFolga, removerDatasInventadas: (t) => ({ texto: t, removidas: [] }), scrubInventedSetting: (t) => ({ text: t, removed: [] }),
    planSilenceReport: TL.planSilenceReport, writeServerEvent: async () => true, user: { id: 'u1', email: 'cliente@example.com' }, generationId: 'g1', family: familia, MAX_VERBATIM_SCENES: 12,
    hollywoodVoiceover: roteiro, releaseBirthClaim: async () => true, cinematicAdmin: { from: () => ({ insert: async () => ({}) }) }, body: {}, NextResponse, hollywoodTarget: ALVO(duracao), requestedDuration: duracao, degrau: null,
    formatoVisual: { modo: 'documentary_faceless' }, resolveCharacterVoice: () => null, cinematicSceneModel: () => 'x', buildFalInput: () => ({}), confirmCinematicRefund: async () => true,
    SILENCE_SCENE_MAX_SECONDS: 1.5, SILENCE_TOTAL_MAX_SECONDS: 8, fitCinematicPlanFloor: TL.fitCinematicPlanFloor, console: silencio,
    resolveHollywoodVoice: () => ({ personaId: 'p', voice: 'onyx', defaultSpeed: ritmo }), hollywoodVertical: 'history', sceneNarrationsForPlan: (scenes) => scenes.map((sc) => (sc.type === 'dialogue' ? sc.dialogueLine : sc.voiceover) ?? null),
  }
}
// Roteiros prontos (verbatim) no alvo do escritor da estrada: 15 s ≈ 33-42 palavras; 30 s ≈ 69-83 (2,3 pal/s × alvo × 0,95-1,2).
const HW15 = {
  en: 'In 1986, a quiet lake in Cameroon killed almost two thousand people in one night. The water hid a giant bubble of gas. It rolled downhill faster than anyone could run. Today, pipes vent it.',
  pt: 'Em 1986, um lago tranquilo em Camarões matou quase duas mil pessoas numa só noite. A água escondia uma bolha gigante de gás. Ele desceu o vale mais rápido que qualquer pessoa. Hoje, canos soltam o gás.',
  es: 'En 1986, un lago tranquilo de Camerún mató a casi dos mil personas en una noche. El agua escondía una burbuja gigante de gas. Bajó por el valle más rápido que nadie. Hoy, unos tubos lo liberan.',
}
const HW30 = {
  en: `${HW15.en} Scientists learned the lake sits on a volcano that leaks gas into its deep water. For years the gas built up like a shaken soda. One landslide was enough to release it. Now alarms protect the villages.`,
  pt: `${HW15.pt} Os cientistas descobriram que o lago fica sobre um vulcão que solta gás na água funda. Por anos o gás se acumulou como um refrigerante sacudido. Um deslizamento bastou para liberar tudo. Hoje, alarmes protegem as aldeias.`,
  es: `${HW15.es} Los científicos descubrieron que el lago está sobre un volcán que suelta gas en el agua profunda. Durante años el gas se acumuló como un refresco agitado. Un deslizamiento bastó para liberarlo. Hoy, alarmas protegen las aldeas.`,
}
checa(`roteiros hollywood na faixa do escritor: 15 s ${Object.values(HW15).map((t) => palavras(t).length)} palavras (35–42), 30 s ${Object.values(HW30).map((t) => palavras(t).length)} (69–83)`, Object.values(HW15).every((t) => palavras(t).length >= 35 && palavras(t).length <= 42) && Object.values(HW30).every((t) => palavras(t).length >= 69 && palavras(t).length <= 83))
// Planos que o GPT devolve (depois do teto do planejador): com apresentador (diálogo nas pontas) e sem (tudo narrado).
const planoGPT = (duracao, host) => {
  const forma = duracao === 15
    ? (host ? [['dialogue', 5], ['support', 5], ['dialogue', 5]] : [['support', 5], ['support', 8], ['support', 5]])
    : (host ? [['dialogue', 5], ['support', 10], ['cinematic', 8], ['support', 5], ['dialogue', 5]] : [['support', 8], ['support', 8], ['cinematic', 8], ['support', 8]])
  return { characterSheet: 'a fictional woman', environmentSheet: 'a lakeside village', styleSheet: 'documentary', scenes: forma.map(([type, seconds], i) => cenaGPT(i, type, seconds, i === 0 ? 'HOOK' : i === forma.length - 1 ? 'PAYOFF' : 'ESCALATION')) }
}
const relatoriosHW = []
const excecoesHW = []
async function provaHollywood(rodar, caso) {
  const plan = planoGPT(caso.duracao, caso.host)
  const roteiro = (caso.duracao === 15 ? HW15 : HW30)[caso.idioma]
  const r = await rodar(ctxHollywood({ plan, familia: caso.familia, duracao: caso.duracao, roteiro, ritmo: caso.ritmo, idioma: caso.idioma }))
  if (!r.plan) { console.log('   (recusado: ' + JSON.stringify(r.rejeitado).slice(0, 300) + ')'); return { ok: false, rejeitado: r.rejeitado?.reason ?? 'sem plano', segundos: [], tipos: '', total: 0, silencio: 0, pior: 0, mudo: 0, margem: 0 } }
  const cenas = r.plan.scenes
  const falaDe = (sc) => (sc.type === 'dialogue' ? sc.dialogueLine : sc.voiceover) ?? ''
  const total = cenas.reduce((a, sc) => a + (sc.seconds || 0), 0)
  const ritmoVoz = Math.round(2.3 * Math.max(0.85, Math.min(1.1, caso.ritmo)) * 100) / 100
  const reg = TL.planSilenceReport(cenas, ritmoVoz)
  const totalMax = Math.round(8 * Math.max(1, total / 60) * 10) / 10
  const mudo = cenas.filter((sc) => palavras(falaDe(sc)).length === 0).reduce((a, sc) => a + sc.seconds, 0)
  const [cap, capD] = CAPS[caso.familia]
  const [smin, smax] = SCHEMA_HW[caso.familia]
  const enviados = cenas.map((sc) => Math.max(smin, Math.min(smax, Math.round(sc.seconds))))
  const noSchema = cenas.every((sc, i) => sc.seconds <= (sc.type === 'dialogue' ? capD : sc.type === 'cinematic' ? 8 : cap) && enviados[i] >= sc.seconds - 1e-9 && enviados[i] >= smin && enviados[i] <= smax)
  const juntas = cenas.map(falaDe).join(' ').replace(/'/g, '"').replace(/\s+/g, ' ').trim()
  const falaInteira = juntas.replace(/"/g, "'") === roteiro.replace(/"/g, "'").replace(/\s+/g, ' ').trim()
  const segundosFal = enviados.reduce((a, b) => a + b, 0)
  const usd = segundosFal * USD_S_HW[caso.familia] + ANCORAS_HW + USD_TTS_COMPOSE + (caso.familia === 's25' ? total * ENHANCE_S25 : 0)
  const receita = E.creditCostForDuration(QUALIDADE[caso.familia], true, caso.duracao) * USD_POR_CREDITO_STUDIO
  const o = {
    segundos: cenas.map((sc) => sc.seconds), tipos: cenas.map((sc) => sc.type[0]).join(''), total, rejeitado: r.rejeitado?.reason ?? null,
    alvoOk: total >= caso.duracao, silencioOk: reg.worst <= 1.5 && reg.total <= totalMax, mudo, noSchema, falaInteira,
    semRepetido: new Set(cenas.map(falaDe)).size === cenas.length,
    usd: Math.round(usd * 100) / 100, receita: Math.round(receita * 100) / 100, margem: Math.round((1 - usd / receita) * 100), silencio: reg.total, pior: reg.worst,
  }
  o.ok = !o.rejeitado && o.alvoOk && o.silencioOk && o.mudo <= 6 && o.noSchema && o.falaInteira && o.semRepetido && o.margem > 0
  return o
}
const executarHW = montarHollywood(ROTA)
checa('a fatia do verbatim hollywood (C1 → teto-rede → apara → régua de silêncio) existe na rota', Boolean(executarHW))
for (const familia of HW) for (const duracao of [15, 30]) for (const idioma of ['en', 'pt', 'es']) for (const host of [true, false]) for (const ritmo of [1.0, 0.94]) {
  const caso = { familia, duracao, idioma, host, ritmo }
  const o = await provaHollywood(executarHW, caso)
  if (ritmo === 1.0) relatoriosHW.push({ ...caso, ...o })
  // Exceção DECLARADA (não é do alvo curto): Omni (teto de diálogo 10 s) com o PAYOFF em diálogo de 21 palavras e voz lenta (×0,94 =
  // 2,16 pal/s) — o teto-rede corta a cauda de 5 palavras numa cena de apoio de 4 s (piso do clipe) que não tem vizinha narrada para
  // juntar: 1,7 s mudos e a régua de silêncio RECUSA antes de qualquer POST, com estorno (plan_silence_inside_scenes). É o caminho de
  // sempre do Omni em qualquer duração (a cauda depois de um diálogo final); aqui fica registrado como recusa honesta, não aprovado.
  const excecaoOmni = familia === 'omni' && ritmo === 0.94 && host && o.rejeitado === 'plan_silence_inside_scenes'
  if (excecaoOmni) excecoesHW.push(`${familia} ${duracao} s ${idioma}`)
  checa(`${familia} ${duracao} s ${idioma} ${host ? 'apresentador' : 'narrado'} voz ×${ritmo}: cenas ${o.tipos} [${o.segundos}] = ${o.total}s · ≥${duracao} ${o.alvoOk} · silêncio ${o.silencio}s (pior ${o.pior}) · mudo ${o.mudo}s · schema ${o.noSchema} · fala do autor inteira ${o.falaInteira} · margem ${o.margem}%${o.rejeitado ? ` · RECUSA HONESTA (sem débito) ${o.rejeitado}` : ''}`, o.ok || excecaoOmni)
}
checa(`recusas honestas da exceção declarada do Omni: ${excecoesHW.length} de ${HW.length * 2 * 3 * 2 * 2} casos (${excecoesHW.join('; ') || 'nenhuma'}) — no máximo 2`, excecoesHW.length <= 2)
{
  // Mutante: o C1 volta a exigir 40 palavras e 3 frases — o roteiro de 15 s cai fora do contrato (a fala seria a do GPT)
  const mutC1 = ROTA.replace('        const c1Curto = duration < 35 && totalWords >= 12 && sentences.length >= 1 // KINEO-DURACOES-CURTAS-2026-09-29', '        const c1Curto = false')
  const o = await provaHollywood(montarHollywood(mutC1), { familia: 'hollywood', duracao: 15, idioma: 'en', host: true, ritmo: 1.0 })
  checa('mutante: C1 só a partir de 40 palavras (o roteiro de 15 s vira fala do GPT) fica VERMELHO', mutC1 !== ROTA && !o.falaInteira)
}

console.log('B4) roteiro longo pedido a 15/30 s na estrada hollywood: recusa antes do débito')
function provaGuardaHW(M) {
  const t = (n) => Array.from({ length: n }, (_, i) => `w${i}`).join(' ')
  const g = (engine, seconds, n) => M.checarFalaCurtaDoMotor({ engine, seconds, verbatim: true, narration: t(n), language: 'en' })
  const r = []
  for (const e of HW) {
    r.push(g(e, 15, 43).ok === true)
    const x = g(e, 15, 44); r.push(x.ok === false && x.sugestao === 30 && x.maxWords === 43 && x.wordsPerSecond === 2.3)
    r.push(g(e, 30, 86).ok === true)
    const y = g(e, 30, 87); r.push(y.ok === false && y.sugestao === 35 && y.maxWords === 86)
    r.push(g(e, 35, 300).ok === true)
  }
  return r.every(Boolean)
}
checa('hollywood: 15 s aceita até 43 palavras (44 → sugere 30 s), 30 s até 86 (87 → sugere 35 s); 35 s fora da guarda', provaGuardaHW(D))
{
  const r = []
  for (const q of ['cinematic_hollywood', 'cinematic_h3', 'cinematic_omni', 'cinematic_s25']) {
    const reg = W.writerRateFor(q, 'x', 'en')
    const min15 = W.minWordsFor(15, reg.wordsPerSecond, reg.coverage), max15 = W.maxWordsFor(15, reg.wordsPerSecond, reg.coverage)
    const min30 = W.minWordsFor(30, reg.wordsPerSecond, reg.coverage), max30 = W.maxWordsFor(30, reg.wordsPerSecond, reg.coverage)
    r.push(min15 === 35 && max15 === 42 && min30 === 69 && max30 === 83)
    r.push(max15 <= D.maxWordsCurtoDoMotor(q, 15, 'en') && max30 <= D.maxWordsCurtoDoMotor(q, 30, 'en')) // o escritor nunca escreve o que a guarda recusa
    r.push(min15 / 2.3 >= 15 * 0.95 - 1e-9 && min30 / 2.3 >= 30 * 0.95 - 1e-9) // o piso do escritor passa no portão de 95 % (2,3 pal/s)
  }
  const GS = rd('app/api/generate-script/route.ts')
  r.push(GS.includes('const SUPPORTED_TARGETS = [15, 30, 35, 60, 90] as const'))
  checa('escritor hollywood: 15 s → 35–42 palavras, 30 s → 69–83 (o 30 entra em SUPPORTED_TARGETS); o teto cabe na guarda e o piso passa no portão', r.every(Boolean))
}

console.log('B5) preço e telas da estrada hollywood')
{
  const r = []
  for (const m of HW) {
    const base = E.creditCostFor(QUALIDADE[m], true)
    for (const s of [15, 30]) r.push(E.creditCostForDuration(QUALIDADE[m], true, s) === Math.ceil(base * s / 60))
    r.push(E.creditCostForDuration(QUALIDADE[m], true, 15) < E.creditCostForDuration(QUALIDADE[m], true, 30) && E.creditCostForDuration(QUALIDADE[m], true, 30) < E.creditCostForDuration(QUALIDADE[m], true, 35))
  }
  checa('preço hollywood a 15/30 s = ⌈base × s/60⌉ (Kling 3/Omni/S25 38 e 75 cr; H3 12 e 23), em ordem crescente até os 35 s', r.every(Boolean) && E.creditCostForDuration('cinematic_hollywood', true, 15) === 38 && E.creditCostForDuration('cinematic_h3', true, 30) === 23)
  const GEN = rd('app/(dashboard)/generate/GenerateClient.tsx')
  const STUDIO = rd('app/(dashboard)/studio/StudioClient.tsx')
  checa('/generate e /studio conhecem o 30 (tipo da duração e rótulo); o Diretor aceita 15/30', GEN.includes("  30: { value: 30 as Duration, label: '30s — Short' },") && /\ntype Duration = 15 \| 30 \| 35 \| 45 \| 60 \| 90\b/.test(GEN) && /\ntype StudioDuration = 15 \| 30 \| 35 \| 60 \| 90\b/.test(STUDIO) && rd('lib/diretor/suggest.ts').includes('export const DIRETOR_DURATIONS = [15, 30, 35, 60, 90] as const'))
  const H_SRC = rd('lib/creationHandoff.ts')
  const Hexp = {}
  vm.runInNewContext(ts.transpileModule(H_SRC, { compilerOptions: { module: 1, target: 9 } }).outputText, { exports: Hexp, require: () => ({}) })
  const q = (s) => Hexp.readCreationHandoff(new URLSearchParams(s)).duration
  checa('handoff: 30 com H3/Kling 3/Omni/S25 fica 30; 30 com Kling 2.5/Seedance/sem motor cai no padrão', q('duration=30&engine=h3') === 30 && q('duration=30&engine=hollywood') === 30 && q('duration=15&engine=s25') === 15 && q('duration=30&engine=kling') === null && q('duration=30&engine=seedance') === null && q('duration=30') === null)
  const CV = rd('lib/contadorVoz.ts')
  checa('contador da tela usa a MESMA tabela com o interruptor (curtas) — sem prometer duração que a tela esconde', (CV.match(/supportedDurationsFor\(args\.engine, \{ curtas: args\.curtas \}\)/g) ?? []).length === 3 && (GEN.match(/seconds: duration, curtas: curtasOk \}\)/g) ?? []).length === 2)
}

console.log('\nTabela motor × duração (hollywood — plano final da fatia REAL da rota, voz ×1,0, apresentador/narrado, Studio US$ 0,183/cr):')
for (const r of relatoriosHW.filter((x) => x.idioma === 'en')) console.log(`   ${r.familia.padEnd(9)} ${String(r.duracao).padStart(2)} s ${r.host ? 'apresentador' : 'narrado     '} cenas ${r.tipos.padEnd(5)} [${r.segundos.join(',')}] = ${r.total}s · ${E.creditCostForDuration(QUALIDADE[r.familia], true, r.duracao)} cr = US$ ${r.receita} · fal+âncoras+voz ≈ US$ ${r.usd} · margem ${r.margem}%`)

console.log('\nTabela motor × duração (clássico, 15 s — clipes PLANEJADOS pela rota, voz 2,5 pal/s, Studio US$ 0,183/cr):')
for (const r of relatorios.filter((x) => x.wps === 2.5)) console.log(`   ${r.motor.padEnd(6)} ${r.idioma} ${r.forma.padEnd(8)} clipes [${r.segundos.join(',')}] = ${r.bruto}s · ${E.creditCostForDuration(QUALIDADE[r.motor], true, 15)} cr = US$ ${r.receita} · fal+still+tts ≈ US$ ${r.usd} · margem ${r.margem}%`)

console.log(`\n${ok} verificações passaram, ${falhas.length} falharam`)
if (falhas.length) { for (const f of falhas) console.log('  ✗ ' + f); process.exit(1) }
