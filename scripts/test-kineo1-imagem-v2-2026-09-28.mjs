// KINEO1-IMAGEM-V2-2026-09-28 — guardião da imagem v2 do Kineo 1 (parte A: peças INERTES + replay offline).
//
// Kineo 1 faz 93% dos filmes de cliente; desde 19/09 o juiz dá 69 geral, 89 fala e 53 IMAGEM (63 de 131 filmes com 40).
// Taxonomia das 136 cenas reprovadas (40 filmes nota 40, 21-27/09): 36 busca errada, 23 assunto que o banco não tem,
// 21 portão/ranking, 19 fala abstrata, 24 cofre sem portão, 5 instrução colada. Este guardião EXECUTA o código real
// (lib/pixabay.ts, lib/clipVault.ts, lib/fastAiScene.ts, lib/fastAiClips.ts, lib/kineo1/sceneQueries.ts,
// lib/kineo1/replay.ts) com os exemplos REAIS do rastro (tags do fast_scene_plan) e prova:
//   (a) v2 conserta: cone snail ≠ vulcão; french handwriting ≠ Riviera; "news" ≠ "new"; criança volta quando a cena
//       pede criança; o raio-X do cofre não vai mais para "close-up macro wolf tracks snow moonlight"; linha ai-hook
//       fica de fora; Google/Earth não são personagem; "space needle, brainstorming, skyline" não serve a "eggs and
//       toast"; o plano de câmera sai antes da Pixabay; o clipe de IA TROCA o stock (sem laço);
//   (b) v1 INTACTO sem a opção: as mesmas funções, com os mesmos insumos, devolvem o mesmo que o código do commit
//       22c8e70e (a origin/main de onde a v2 nasceu) — portão, cabeça, pool com Pixabay falsa, cofre, detector de
//       personagem, encaixe dos clipes;
//   (c) a rota: até a parte B, "não liga nada"; com o commit [TRAVA 8.2], tudo atrás do interruptor KINEO1_IMAGEM_V2
//       (o caminho da rota é executado em scripts/test-kineo1-imagem-v2-rota-2026-09-28.mjs);
//   (d) o replay não escreve (dryRun, zero insert/update/delete) e roda ponta a ponta sem rede.
//   (e) parte B, peças ainda inertes (lib/kineo1/pastedBrief.ts, a ordem das buscas, os candidatos do pool, o painel no
//       modo troca, o custo real no compose): os textos REAIS da Lua (2ff93c15) e dos gêmeos (b3b3e101), narração com
//       abertura imperativa que NÃO pode perder linha, e a fatia real do painel executada com eventos falsos.
//       Revisão pós-auditoria (28/09): D1 — briefing com SOBRA de instrução (17dd0c7a virava filme cobrado lendo
//       "Conte a história…"; 8b23d27a e 8c0ed465 narravam direção) e D2 — roteiro de UM parágrafo lido como briefing
//       ("Este vídeo vai…", "Evite… Em poucos segundos…", "Change your life in 30 seconds…").
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import vm from 'node:vm'
import ts from 'typescript'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
const BASE = '22c8e70e' // origin/main de onde a v2 nasceu (27/09)
const rdBase = (p) => { try { return execFileSync('git', ['show', `${BASE}:${p}`], { cwd: RAIZ, maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] }).toString().replace(/\r\n/g, '\n') } catch { return null } }
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) ok++; else falhas.push(n) }
const J = (x) => JSON.stringify(x)

// ── carregador CJS com ciclo (pixabay ⇄ clipVault) — sem '@/…' de verdade: o mapa resolve os caminhos ──
const ALIAS = {
  './clipVault': 'lib/clipVault.ts', '@/lib/clipVault': 'lib/clipVault.ts',
  './pixabay': 'lib/pixabay.ts', '@/lib/pixabay': 'lib/pixabay.ts',
  '@/lib/aspect': 'lib/aspect.ts', './broll/aesthetic-score': 'lib/broll/aesthetic-score.ts',
  './sceneQueries': 'lib/kineo1/sceneQueries.ts', '@/lib/kineo1/sceneQueries': 'lib/kineo1/sceneQueries.ts',
  '@/lib/kineo1/aiClipPrompt': 'lib/kineo1/aiClipPrompt.ts', // KINEO1-CLIPE-IA-PROMPT-2026-09-28
}
function mundo({ fontes = {}, stubs = {}, env = {}, globals = {} } = {}) {
  const cache = new Map()
  const logs = []
  const quieto = { log: (...a) => logs.push(a.join(' ')), warn: (...a) => logs.push(a.join(' ')), error: (...a) => logs.push(a.join(' ')) }
  function carregar(id) {
    if (cache.has(id)) return cache.get(id).exports
    const mod = { exports: {} }
    cache.set(id, mod)
    const src = fontes[id] ?? rd(id)
    const js = ts.transpileModule(src, { compilerOptions: { module: 1, target: 9 } }).outputText
    const req = (m) => (m in stubs ? stubs[m] : ALIAS[m] ? carregar(ALIAS[m]) : {})
    vm.runInNewContext(js, { exports: mod.exports, module: mod, require: req, process: { env }, console: quieto, Math, Date, Number, Set, Map, Array, JSON, Object, RegExp, String, Promise, Buffer, Error, setTimeout, clearTimeout, URL, URLSearchParams, AbortSignal, AbortController, ...globals }, { filename: id })
    return mod.exports
  }
  return { carregar, logs }
}
const stubVault = { vaultClipAsync: () => {} }
const P = mundo({ stubs: { './clipVault': stubVault } }).carregar('lib/pixabay.ts')
const baseSrc = { pix: rdBase('lib/pixabay.ts'), scene: rdBase('lib/fastAiScene.ts'), clips: rdBase('lib/fastAiClips.ts'), vault: rdBase('lib/clipVault.ts') }
const temBase = Object.values(baseSrc).every(Boolean)
const P0 = temBase ? mundo({ fontes: { 'lib/pixabay.ts': baseSrc.pix }, stubs: { './clipVault': stubVault } }).carregar('lib/pixabay.ts') : null

// Vídeo da Pixabay com as tags REAIS do fast_scene_plan (a string gravada é cortada em 160 caracteres).
const vid = (id, tags, o = {}) => ({ id, pageURL: '', type: 'film', tags, duration: o.dur ?? 12, downloads: 50, likes: 5, videos: { large: { url: `https://cdn.pixabay.com/v/${id}.mp4`, width: o.w ?? 1080, height: o.h ?? 1920, size: 1, thumbnail: '' }, medium: { url: '', width: 0, height: 0, size: 0, thumbnail: '' }, small: { url: '', width: 0, height: 0, size: 0, thumbnail: '' }, tiny: { url: '', width: 0, height: 0, size: 0, thumbnail: '' } } })
const REAL = {
  vulcao: 'volcano, eruption, fire, heat, burn, volcanic, iceland, nature, magma, cone, fissure, vent', // 3b01d92c cena 3 "cone snail on coral"
  riviera: "nature, sea, ocean, waves, beach, drone, aerial, co, france, french riviera, cote d'azur, aerial video, drone video, drone shot, drone clip", // d13292b4 "french handwriting"
  chafariz: 'fountain of the seas, place de la concorde, paris, france, the water, to flow, monument, statue, cast iron, urban, sculpture, public, capital city, parisian, ma', // 463958ba "parisian diner"
  caminhao: 'road, cargo, trailer, truck', // 463958ba "food truck london"
  cabelo: 'woman, sunset, nature, sunrise, wind, hair', // eb04233e "hair growth bottle"
  cachoeira: 'waterfall, cascade, river, flow, energy, quick, fury, flood, nature, slow motion', // 99d5e8bb "quick dance moves"
  presepio: 'jesus child, nativity scene, christmas, advent, craft', // 99d5e8bb "joyful child dancing"
  cinema: 'nostalgic, stale, time, cinema, antique, retro, classical, photography, time machine, cinematic', // b53d8650 "antique fork"
  vitrola: 'record, record player, vinyl, turntable, retro, spinning, disco, playing, equipment, black', // 7c0a2023 "historical players"
  borboleta: 'nature, travel, butterfly, wood, forest, flower, new, tree', // 6 filmes "news seconds launched tts"
  raiox: 'doctor, x-ray, hospital, nurse, medicine, diagnosis, clinic, health, patient, healthcare', // 54090f4d "close-up macro wolf tracks snow moonlight"
}
const V2 = { v2: true }

console.log('== (a) portão do sujeito v2 — os vazamentos reais ==')
const CASOS = [
  ['cone snail on coral', REAL.vulcao, 'vulcão (tag "cone") no filme do caramujo-cone'],
  ['french handwriting', REAL.riviera, 'Riviera Francesa para "caligrafia francesa"'],
  ['parisian diner', REAL.chafariz, 'chafariz de Paris para "lanchonete parisiense"'],
  ['food truck london', REAL.caminhao, 'caminhão de carga para "food truck"'],
  ['hair growth bottle', REAL.cabelo, 'cabelo de mulher para "frasco de crescimento capilar"'],
  ['quick dance moves', REAL.cachoeira, 'cachoeira (tag "quick") para "passos de dança"'],
  ['joyful child dancing', REAL.presepio, 'presépio ("jesus child") para "criança dançando"'],
  ['antique fork', REAL.cinema, 'cinema antigo para "garfo antigo"'],
]
for (const [q, tags, nome] of CASOS) {
  checa(`v1 reproduz o vazamento: ${nome}`, P.tagsRelevantToQuery(vid(1, tags), q) === true)
  checa(`v2 recusa: ${nome}`, P.tagsRelevantToQuery(vid(1, tags), q, V2) === false)
}
checa('v2 ainda ACEITA o clipe certo: cone snail / french handwriting / freshwater snail (modificador fora) / wolf tracks (saco: cabeça = primeira) / mosquito', P.tagsRelevantToQuery(vid(1, 'cone snail, snail, shell, sea, marine, coral'), 'cone snail on coral', V2) === true && P.tagsRelevantToQuery(vid(1, 'handwriting, french, letter, pen, ink'), 'french handwriting', V2) === true && P.tagsRelevantToQuery(vid(1, 'groove snail, snail, gastropod, animal'), 'freshwater snail in water', V2) === true && P.tagsRelevantToQuery(vid(1, 'wolf, snow, winter, animal, predator'), 'close-up macro wolf tracks snow moonlight', V2) === true && P.tagsRelevantToQuery(vid(1, 'mosquito, insect, macro, blood'), 'mosquito insect close up macro bite', V2) === true && P.tagsRelevantToQuery(vid(1, 'wasp, insect, macro, bite'), 'mosquito insect close up macro bite', V2) === false)
checa('frase-cabeça curta exige TODAS as palavras: caramujo de jardim não serve a "cone snail"; ônibus de Londres não serve a "food truck london"', P.tagsRelevantToQuery(vid(1, 'garden snail, snail, shell, leaf'), 'cone snail on coral', V2) === false && P.tagsRelevantToQuery(vid(1, 'london, street, bus, city'), 'food truck london', V2) === false)
checa('frase-cabeça: "cone snail on coral" → cabeça snail, exige cone+snail; "freshwater snail" exige só snail; saco de 4 palavras → cabeça wolf', J(P.subjectPhraseV2('cone snail on coral')) === J({ head: 'snail', required: ['cone', 'snail'], anchor: 'snail' }) && J(P.subjectPhraseV2('freshwater snail in water')) === J({ head: 'snail', required: ['snail'], anchor: 'snail' }) && P.subjectPhraseV2('close-up macro wolf tracks snow moonlight').head === 'wolf' && P.headSubjectToken('cone snail on coral', V2) === 'snail' && P.headSubjectToken('cone snail on coral') === 'cone')
{
  const TIGRE = 'tiger, predator, dangerous, carnivores, big cat, wildlife, slow motion' // filme nota 80: "tiger stalking in jungle"
  const FB = { v2: true, headFallback: true }
  checa('regra 5 (opcional): o tigre dos filmes nota 80 volta ("tiger stalking in jungle", "tiger paw closeup"), "earth spinning" volta; a regra 2 pura os recusava', P.tagsRelevantToQuery(vid(1, TIGRE), 'tiger stalking in jungle', V2) === false && P.tagsRelevantToQuery(vid(1, TIGRE), 'tiger stalking in jungle', FB) === true && P.tagsRelevantToQuery(vid(1, TIGRE), 'tiger paw closeup', FB) === true && P.tagsRelevantToQuery(vid(1, 'earth, planet, space, universe, sun'), 'earth spinning', FB) === true && P.subjectPhraseV2('tiger stalking in jungle').anchor === 'tiger')
  checa('regra 5 mantém recusados os vazamentos da âncora (vulcão, Riviera, chafariz, frasco, cachoeira, garfo) — e admite o presépio ("dancing" é ação): por isso é opcional e o replay mede as duas', ['cone snail on coral|' + REAL.vulcao, 'french handwriting|' + REAL.riviera, 'parisian diner|' + REAL.chafariz, 'hair growth bottle|' + REAL.cabelo, 'quick dance moves|' + REAL.cachoeira, 'antique fork|' + REAL.cinema].every((c) => { const [q, t] = c.split('|'); return P.tagsRelevantToQuery(vid(1, t), q, FB) === false }) && P.tagsRelevantToQuery(vid(1, REAL.presepio), 'joyful child dancing', FB) === true)
}
checa('"news" ≠ "new": v1 (modo ficção) aceitava a borboleta; v2 não — nem pela cabeça, nem pelo plural', P.headMatchesTagExactly('news', ['butterfly', 'new']) === true && P.headMatchesTagExactly('news', ['butterfly', 'new'], V2) === false && P.headMatchesTagExactly('rings', ['ring'], V2) === true && P.headMatchesTagExactly('snail', ['snails'], V2) === true)
P.setActiveStrictSubject(true)
checa('filme de notícias de IA em modo ficção ("Google" personagem): v1 aceita a borboleta para "news seconds launched tts"; v2 recusa', P.tagsRelevantToQuery(vid(1, REAL.borboleta), 'news seconds launched tts') === true && P.tagsRelevantToQuery(vid(1, REAL.borboleta), 'news seconds launched tts', V2) === false)
P.setActiveStrictSubject(false)
checa('substring ao contrário morreu no v2: "handwriting" não casa a tag "writing" (v1 casava)', P.tagsRelevantToQuery(vid(1, 'writing, pen, desk'), 'handwriting', V2) === false && P.tagsRelevantToQuery(vid(1, 'writing, pen, desk'), 'handwriting') === true)
checa('"historical players" (fala: "hit the ball with their bare hands") → vitrola recusada como homônimo só no v2', P.clipTagsGate(REAL.vitrola, 'historical players', { v2: true, sceneText: 'Players originally hit the ball with their bare hands.' }).reason === 'homonym' && P.clipTagsGate(REAL.vitrola, 'historical players', { sceneText: 'Players originally hit the ball with their bare hands.' }).ok === true)

console.log('== criança: a cena pede, a criança vem ==')
const KIDS = 'kids, dance, dancing, outdoors, happy, child'
checa('v1 recusa "kids dancing outdoors" (lista dura) — o 99d5e8bb caiu num clipe reciclado', P.clipTagsGate(KIDS, 'kids dancing outdoors', { sceneText: 'Kids under five have more flexible joints' }).reason === 'lifestyle')
checa('v2 aceita "kids dancing outdoors" e "toddler breakdancing" (a busca pede criança)', P.clipTagsGate(KIDS, 'kids dancing outdoors', { v2: true, sceneText: 'Kids under five have more flexible joints' }).ok === true && P.clipTagsGate('toddler, baby, dance, breakdancing, funny', 'toddler breakdancing', { v2: true, sceneText: 'Ever seen a toddler breakdance?' }).ok === true)
checa('v2 mantém a lista dura quando só a FALA diz "student" (o caso Mark Cuban do Push #437)', P.clipTagsGate('student, homework, classroom, kid, desk', 'cheap apartment desk', { v2: true, sceneText: 'Mark Cuban lived like a broke student' }).reason === 'lifestyle' && P.sceneAsksForKids('cheap apartment desk', 'Mark Cuban lived like a broke student') === false && P.sceneAsksForKids('', 'Ever seen a toddler breakdance?') === true)

console.log('== plano de câmera sai no USO (o roteirista continua escrevendo) ==')
checa('stripCameraPhrases: os 7 planos do roteirista e as variações', P.stripCameraPhrases('close-up macro wolf tracks snow moonlight') === 'wolf tracks snow moonlight' && P.stripCameraPhrases('aerial drone Falcon 9 rocket launch night') === 'Falcon 9 rocket launch night' && P.stripCameraPhrases('wide establishing café exterior bustling people afternoon') === 'café exterior bustling people afternoon' && P.stripCameraPhrases('medium shot chef cooking') === 'chef cooking' && P.stripCameraPhrases('low angle skyscraper') === 'skyscraper' && P.stripCameraPhrases('POV driving mountain road') === 'driving mountain road' && P.stripCameraPhrases('slow-motion impact') === 'impact' && P.stripCameraPhrases('maple leaves, autumn forest, slow motion') === 'maple leaves, autumn forest')
checa('stripCameraPhrases não come palavra de conteúdo ("medium rare steak", "aerial silk") nem esvazia a busca ("close-up")', P.stripCameraPhrases('medium rare steak') === 'medium rare steak' && P.stripCameraPhrases('aerial silk dancer') === 'aerial silk dancer' && P.stripCameraPhrases('close-up') === 'close-up')
const runway = rd('lib/runway.ts')
checa('lib/runway.ts continua mandando o prefixo e o outraConsulta continua dependendo dele (tirar é no uso)', runway.includes('PREPEND a shot type to every query: "aerial drone", "close-up macro", "wide establishing", "medium shot", "low angle", or "POV"') && runway.includes("const outraConsulta = (q: string) => { const semPrefixo = q.replace(/^(?:aerial drone|close-up macro|wide establishing|medium shot|low angle|POV)\\s+/i, '')"))

console.log('== o pool de verdade, com uma Pixabay falsa ==')
function pixabayFalsa(porQuery) {
  const urls = []
  const f = async (url) => { urls.push(url); const q = new URL(url).searchParams.get('q'); return { ok: true, status: 200, json: async () => ({ hits: porQuery(q) }) } }
  return { f, urls }
}
const HITS_CONE = [vid(11, REAL.vulcao), vid(12, 'cone snail, snail, shell, sea, marine, coral')]
async function pool(src, queries, opts, porQuery = () => HITS_CONE) {
  const vaultCalls = []
  const fake = pixabayFalsa(porQuery)
  const m = mundo({ fontes: src ? { 'lib/pixabay.ts': src } : {}, stubs: { './clipVault': { vaultClipAsync: (x) => { vaultCalls.push(x) } } }, env: { PIXABAY_API_KEY: 'k' }, globals: { fetch: fake.f } }).carregar('lib/pixabay.ts')
  let rel = null
  const urls = await m.getPixabayClipsForScene(queries, false, 'Cone snails: their venom can paralyze instantly.', { ...opts, onReport: (r) => { rel = r } })
  return { urls, vaultCalls, rel, pedidos: fake.urls }
}
{
  const v1 = await pool(null, ['cone snail on coral'], { maxClips: 2 })
  const v2 = await pool(null, ['cone snail on coral'], { maxClips: 2, v2: true })
  checa('v1 (sem opção): o vulcão entra como 2º clipe da cena do caramujo-cone — o 3b01d92c', J(v1.urls) === J(['https://cdn.pixabay.com/v/12.mp4', 'https://cdn.pixabay.com/v/11.mp4']))
  checa('v2: só o caramujo; relatório diz origem pool com as tags do clipe', J(v2.urls) === J(['https://cdn.pixabay.com/v/12.mp4']) && v2.rel?.origin === 'pool' && v2.rel?.picks?.[0]?.tags.startsWith('cone snail'))
  const cam1 = await pool(null, ['close-up macro cone snail on coral'], { maxClips: 1 })
  const cam2 = await pool(null, ['close-up macro cone snail on coral'], { maxClips: 1, v2: true })
  const qDe = (u) => new URL(u).searchParams.get('q')
  checa('o plano de câmera chega à Pixabay no v1 e NÃO chega no v2', cam1.pedidos.some((u) => qDe(u).startsWith('close-up macro')) && cam2.pedidos.length > 0 && cam2.pedidos.every((u) => !/close-up|macro/.test(qDe(u))))
  // o completo é paisagem 4K (sem o bônus de retrato): só a chave "âncora vai para o fim" o põe na frente do retrato.
  const TIGRE_H = [vid(21, 'tiger, predator, big cat, wildlife'), vid(22, 'tiger, stalking, jungle, predator, big cat', { w: 3840, h: 2160 })]
  const tig = await pool(null, ['tiger stalking in jungle'], { maxClips: 2, v2: true, headFallback: true }, () => TIGRE_H)
  const tigEstrito = await pool(null, ['tiger stalking in jungle'], { maxClips: 2, v2: true }, () => TIGRE_H)
  checa('regra 5 no pool: o clipe que bate TODAS as palavras vem primeiro, o que entrou só pela âncora vem depois; sem a regra 5 só o completo', J(tig.urls) === J(['https://cdn.pixabay.com/v/22.mp4', 'https://cdn.pixabay.com/v/21.mp4']) && J(tigEstrito.urls) === J(['https://cdn.pixabay.com/v/22.mp4']))
  const seco = await pool(null, ['cone snail on coral'], { maxClips: 1, v2: true, dryRun: true })
  checa('dryRun (replay): nada vai para o cofre; sem dryRun o vencedor é gravado como hoje', seco.vaultCalls.length === 0 && v2.vaultCalls.length === 1 && v1.vaultCalls.length === 2)
  if (temBase) {
    const v0 = await pool(baseSrc.pix, ['cone snail on coral'], { maxClips: 2 })
    const c0 = await pool(baseSrc.pix, ['close-up macro cone snail on coral'], { maxClips: 1 })
    checa(`v1 intacto no pool: mesma escolha, mesmos pedidos à Pixabay e mesmo cofre que o ${BASE}`, J(v0.urls) === J(v1.urls) && J(v0.pedidos) === J(v1.pedidos) && J(v0.vaultCalls) === J(v1.vaultCalls) && J(c0.pedidos) === J(cam1.pedidos))
  } else checa('comparação com a base pulada (git indisponível)', true)
}

console.log('== (b) v1 intacto: as funções puras dão o mesmo que a base ==')
if (temBase) {
  const QS = ['cone snail on coral', 'french handwriting', 'parisian diner', 'food truck london', 'hair growth bottle', 'quick dance moves', 'joyful child dancing', 'antique fork', 'historical players', 'news seconds launched tts', 'close-up macro wolf tracks snow moonlight', 'boeing 737 engine closeup', 'mosquito insect close up macro bite', 'whispering voice', 'bedroom door', 'low angle dark hallway night', 'mustang car', 'bullet trajectory', 'dense jungle canopy', 'freshwater snail in water', 'kids dancing outdoors', 'toddler breakdancing', 'space needle, brainstorming, skyline', 'door window', 'golden hour']
  const TS = [...Object.values(REAL), 'cone snail, snail, shell', 'handwriting, french, letter', 'horse, horses, stallion', 'train, rail, shinkansen', KIDS, 'toddler, baby, dance, breakdancing', 'bedrooms, doors, night, house', 'hallway, dark, corridor', 'wolf, snow, winter', 'mosquito, insect, macro', 'wasp, insect, macro, bite', 'groove snail, snail, gastropod']
  let iguais = true
  const dif = []
  for (const strict of [false, true]) {
    P.setActiveStrictSubject(strict); P0.setActiveStrictSubject(strict)
    for (const q of QS) {
      if (J(P.headSubjectToken(q)) !== J(P0.headSubjectToken(q)) || J(P.specificTokens(q)) !== J(P0.specificTokens(q))) { iguais = false; dif.push(`head/spec ${q}`) }
      for (const t of TS) {
        const w = t.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)
        if (P.tagsRelevantToQuery(vid(1, t), q) !== P0.tagsRelevantToQuery(vid(1, t), q)) { iguais = false; dif.push(`rel ${strict} ${q} × ${t.slice(0, 20)}`) }
        if (P.subjectConflictWithTags(q, t, 'car rifle ball') !== P0.subjectConflictWithTags(q, t, 'car rifle ball')) { iguais = false; dif.push(`conf ${q}`) }
        const h = P.headSubjectToken(q)
        if (h && P.headMatchesTagExactly(h, w) !== P0.headMatchesTagExactly(h, w)) { iguais = false; dif.push(`exact ${q}`) }
      }
    }
  }
  P.setActiveStrictSubject(false); P0.setActiveStrictSubject(false)
  checa(`sem a opção: ${QS.length} buscas × ${TS.length} tags × modo ficção on/off — portão, cabeça, específicos, homônimo e tag exata IGUAIS à base${dif.length ? ' — difere: ' + dif.slice(0, 3).join('; ') : ''}`, iguais)
  checa('genericsAllowedFor igual à base', QS.every((q) => P.genericsAllowedFor([q]) === P0.genericsAllowedFor([q])))
} else checa('comparação com a base pulada (git indisponível)', true)

console.log('== cofre v2 ==')
function supabaseFalso(rows, { honraNot = true } = {}) {
  const chamadas = []
  const like = (v, pat) => { const p = pat.toLowerCase(); const s = String(v ?? '').toLowerCase(); if (p.startsWith('%') && p.endsWith('%')) return s.includes(p.slice(1, -1)); if (p.endsWith('%')) return s.startsWith(p.slice(0, -1)); return s === p }
  return {
    chamadas,
    from(table) {
      const st = { table, ors: [], nots: [], lim: 1000, escrita: null }
      const b = {
        select() { return b }, order() { return b },
        or(expr) { st.ors.push(expr); return b },
        not(col, op, pat) { st.nots.push([col, op, pat]); return b },
        limit(n) { st.lim = n; return b },
        insert() { st.escrita = 'insert'; return b }, update() { st.escrita = 'update'; return b }, delete() { st.escrita = 'delete'; return b }, upsert() { st.escrita = 'upsert'; return b },
        eq() { return b }, maybeSingle() { return b },
        then(res, rej) {
          chamadas.push(st)
          let out = !honraNot ? rows : rows.filter((r) => st.ors.every((expr) => expr.split(',').some((cl) => { const [col, op, ...rest] = cl.split('.'); return op === 'ilike' && like(r[col], rest.join('.')) })))
          if (honraNot) out = out.filter((r) => st.nots.every(([col, op, pat]) => !(op === 'ilike' && like(r[col], pat))))
          out = [...out].sort((a, c) => (c.score ?? 0) - (a.score ?? 0)).slice(0, st.lim)
          return Promise.resolve({ data: out, error: null }).then(res, rej)
        },
      }
      return b
    },
  }
}
const RAIOX = { storage_url: 'https://supa/broll/vault/raiox.mp4', tags: REAL.raiox, query: 'close-up macro patient coughing clinic room', score: 20, duration_sec: 14 }
const LOBO = { storage_url: 'https://supa/broll/vault/lobo.mp4', tags: 'wolf, tracks, snow, winter, animal, predator, forest', query: 'wolf in snow', score: 12, duration_sec: 20 }
const HOOK = { storage_url: 'https://supa/broll/vault/hook.mp4', tags: 'ai-hook, seedance, cinematic, [pexels: royal palace exterior] the shocking royal massacre of nepal', query: 'the shocking royal massacre', score: 30, duration_sec: 5 }
const PALACIO = { storage_url: 'https://supa/broll/vault/palacio.mp4', tags: 'palace, royal, exterior, architecture, garden, night', query: 'royal palace exterior', score: 14, duration_sec: 15 }
function cofre(rows, stubsExtra = {}, src = null) {
  const sb = supabaseFalso(rows, stubsExtra.honra === false ? { honraNot: false } : {})
  const m = mundo({ fontes: src ? { 'lib/clipVault.ts': src } : {}, stubs: { '@supabase/supabase-js': { createClient: () => sb } }, env: { NEXT_PUBLIC_SUPABASE_URL: 'https://x', SUPABASE_SERVICE_ROLE_KEY: 'k' } })
  return { V: m.carregar('lib/clipVault.ts'), sb }
}
{
  const { V } = cofre([RAIOX, LOBO])
  const v1 = await V.searchVault('close-up macro wolf tracks snow moonlight', { limit: 2 })
  const v2 = await V.searchVault('close-up macro wolf tracks snow moonlight', { limit: 2, v2: true, sceneText: 'Las huellas del lobo en la nieve fresca' })
  checa('v1 serve o raio-X de hospital ao lobo (casou "close"+"macro" na busca antiga do clipe) — o 54090f4d', v1.some((h) => h.storageUrl.endsWith('raiox.mp4')))
  checa('v2 não serve o raio-X e serve o lobo', v2.length === 1 && v2[0].storageUrl.endsWith('lobo.mp4'))
  const { V: Vx, sb: sbx } = cofre([RAIOX, LOBO], { honra: false })
  const v2x = await Vx.searchVault('close-up macro wolf tracks snow moonlight', { v2: true })
  checa('v2 casa só nas TAGS (o SQL nem pergunta pela coluna query) e só palavra inteira; o portão do pool recusa mesmo se o SQL devolver tudo', !J(sbx.chamadas).includes('query.ilike') && v2x.every((h) => !h.storageUrl.endsWith('raiox.mp4')))
  const { V: Vh, sb: sbh } = cofre([HOOK, PALACIO])
  const h1 = await Vh.searchVault('royal palace exterior night', { limit: 1 })
  const h2 = await Vh.searchVault('royal palace exterior night', { limit: 1, v2: true })
  checa("v1 serve a linha 'ai-hook' (score 30, prompt de outro cliente) — o 5aab0b8c; v2 serve o palácio de verdade e pede ao SQL para excluir ai-hook%", h1[0]?.storageUrl.endsWith('hook.mp4') && h2[0]?.storageUrl.endsWith('palacio.mp4') && J(sbh.chamadas.at(-1).nots) === J([['tags', 'ilike', 'ai-hook%']]))
  const { V: Vh2 } = cofre([HOOK, PALACIO], { honra: false })
  const h3 = await Vh2.searchVault('royal palace exterior night', { limit: 3, v2: true })
  checa("linha ai-hook fica de fora mesmo se o filtro do SQL falhar (conferência no código); nenhuma linha apagada", h3.every((h) => !h.storageUrl.endsWith('hook.mp4')) && !J(sbh.chamadas).includes('"escrita":"delete"'))
  const LUA = { storage_url: 'https://supa/broll/vault/lua.mp4', tags: 'snow, moonlight, night, winter, landscape', query: 'snowy night moonlight', score: 25, duration_sec: 18 }
  const lua = await cofre([LUA, LOBO]).V.searchVault('close-up macro wolf tracks snow moonlight', { limit: 2, v2: true })
  checa('cofre v2 passa cada acerto pelo portão do pool: neve+lua casa 2 palavras inteiras mas não tem o lobo (cabeça) → fora; o lobo fica', lua.length === 1 && lua[0].storageUrl.endsWith('lobo.mp4'))
  const cafe = await cofre([{ storage_url: 'https://supa/cc.mp4', tags: 'call center, consultant, customer service, office, headset', query: 'wide establishing customer service call center busy', score: 16, duration_sec: 12 }]).V.searchVault('wide establishing café exterior bustling people afternoon', { v2: true })
  checa('o call center não vai mais para o café (1d8103a8)', cafe.length === 0)
  if (temBase) {
    const { V: V0 } = cofre([RAIOX, LOBO, HOOK, PALACIO], {}, baseSrc.vault)
    const { V: V1 } = cofre([RAIOX, LOBO, HOOK, PALACIO])
    let igual = true
    for (const q of ['close-up macro wolf tracks snow moonlight', 'royal palace exterior night', 'wolf in snow', 'clinic patient', 'palace garden night']) {
      const a = await V0.searchVault(q, { limit: 3 }); const b = await V1.searchVault(q, { limit: 3 })
      if (J(a) !== J(b)) igual = false
    }
    checa(`cofre sem a opção = o do ${BASE} (mesmos acertos, mesma ordem, mesmo score)`, igual)
  } else checa('comparação com a base pulada (git indisponível)', true)
}

console.log('== personagem v2 ==')
const S = mundo().carregar('lib/fastAiScene.ts')
const S0 = temBase ? mundo({ fontes: { 'lib/fastAiScene.ts': baseSrc.scene } }).carregar('lib/fastAiScene.ts') : null
// Trechos dos textos reais (fast_scene_plan de 19-27/09), o bastante para a contagem de cada caso.
const TEXTOS = [
  ['Google', null, 'AI news in 60 seconds. Google launched Gemini 3.8 Flash TTS and Flash-Lite TTS. Google says they bring more natural voices to apps. Meta introduced Muse Realtime Avatar, technology for expressive, interactive avatars built around Muse Realtime Voice.'],
  ['Earth', null, 'Imagine Earth stopped spinning for just one second. Would you notice? Earth\'s surface moves at 1,600 kilometers per hour.'],
  ['Moon', null, 'The night sky would appear eerily empty without the Moon, leaving only the stars. Without the Moon\'s pull, the tides would shrink.'],
  ['France', null, 'Why is tennis called tennis? The answer may go back hundreds of years to medieval France. As the game spread from France to England, the word changed over time.'],
  ['Your', null, 'Your brain does something crazy every single day. Your brain is never really off.'],
  ['Lantana', null, 'Lantana camara, an invasive alien shrub, covers millions of hectares in India. The berries of Lantana camara are spread by birds.'],
  ['Mars', null, 'What did NASA find on Mars that they never announced? In 2012, the rover analyzed soil on Mars and found something strange.'],
  ['More', null, 'In 1969, two computers connected. More networks. More connections. Billions linked.'],
  ['Emily', 'Emily', 'At precisely 3:00 AM, Emily was startled by three slow knocks on her bedroom door. Emily froze in the dark.'],
  ['Bezos', 'Bezos', 'Jeff Bezos does one thing every morning that most CEOs refuse to do. It is why Amazon grew so fast. Bezos reads before any meeting.'],
  ['Sultan', 'Khalid', "British naval forces bombarded Sultan Khalid's palace. Sultan Khalid's troops were ill-prepared and outnumbered."],
  ['Papa', 'Papa', 'Johny peeks at the cookie jar. Papa walks in. Johny hides the crumbs.'],
  ['Silence', null, 'Silence. The forest waits for the storm. Silence returns at dawn.'],
]
for (const [v1, v2, txt] of TEXTOS) checa(`personagem: v1 "${v1}" → v2 ${v2 === null ? 'nenhum' : `"${v2}"`}`, S.characterStoryName(txt) === v1 && S.characterStoryName(txt, { v2: true }) === v2)
checa('v2 nunca detecta onde v1 não detectava (texto sem nome repetido)', S.characterStoryName('Cold water at 14 degrees triggers a spike in norepinephrine.', { v2: true }) === null && S.characterStoryName('Cold water at 14 degrees triggers a spike in norepinephrine.') === null)
if (S0) checa(`detector sem a opção = o do ${BASE} nos ${TEXTOS.length} textos`, TEXTOS.every(([, , t]) => S.characterStoryName(t) === S0.characterStoryName(t)))
else checa('comparação com a base pulada', true)

console.log('== buscas da fala (sceneQueries) ==')
const Q = mundo({ stubs: { '@/lib/openai': { openai: {} }, './clipVault': stubVault } }).carregar('lib/kineo1/sceneQueries.ts')
checa('vírgula: "space needle, brainstorming, skyline" para "Bezos preferred eggs and toast" não guarda NADA (c52d3df1)', J(Q.commaPlanQueryParts('space needle, brainstorming, skyline', 'Bezos preferred to start the day with eggs and toast.')) === '[]')
checa('vírgula: guarda só o pedaço que a fala menciona ("woman removing ring"), sem o marco inventado', J(Q.commaPlanQueryParts('woman removing ring, praça do comércio, couple laughing', 'She slowly took off her wedding ring and left.')) === J(['woman removing ring']))
checa('vírgula: tira o plano de câmera do pedaço que fica', J(Q.commaPlanQueryParts('close-up macro eggs toast plate, skyline', 'Bezos preferred eggs and toast')) === J(['eggs toast plate']))
const RESPOSTA = { scenes: [
  { scene: 1, subject: 'Cone Snail', queries: ['close-up macro cone snail shell', 'cone snail reef', 'Cone snail in aquarium tank', 'cone snail reef'], stockable: true, ai_prompt: 'A venomous cone snail creeping over a coral reef, cinematic 9:16, no text.' },
  { scene: 2, subject: 'businessman breakfast', queries: ['businessman eating breakfast', 'eggs toast plate', 'morning kitchen table'], stockable: false, ai_prompt: 'A billionaire eating eggs and toast at dawn, cinematic vertical shot.' },
  { scene: 9, subject: 'x', queries: ['y'], stockable: true, ai_prompt: 'z' },
] }
const plano = Q.parseSceneQueryPlan(JSON.stringify(RESPOSTA), 3)
checa('parse: minúsculas, sem plano de câmera, até 4 palavras, sem repetição, até 3 buscas; stockable lido; cena ausente = null; cena fora do alcance ignorada', plano && plano.length === 3 && plano[0].subject === 'cone snail' && J(plano[0].queries) === J(['cone snail shell', 'cone snail reef', 'cone snail in aquarium']) && plano[1].stockable === false && plano[2] === null)
checa('parse: JSON quebrado ou sem cenas → null (quem chamou fica com as buscas de hoje)', Q.parseSceneQueryPlan('{nope', 2) === null && Q.parseSceneQueryPlan({ foo: 1 }, 2) === null && Q.parseSceneQueryPlan({ scenes: [] }, 2) === null)
const msgs = Q.buildSceneQueryMessages([{ voiceover: 'Cone snails: their venom can paralyze instantly.', planQuery: 'cone snail on coral' }], { topic: 'deadliest animals', language: 'en' })
checa('o modelo recebe as regras: sem nome próprio, sem câmera, stockable, ai_prompt 9:16 sem rosto falando; a fala e a busca do plano', /NO proper names/.test(msgs[0].content) && /NO camera or style words/.test(msgs[0].content) && /stockable: false/.test(msgs[0].content) && /no faces talking to the camera/.test(msgs[0].content) && msgs[1].content.includes('line="Cone snails: their venom') && msgs[1].content.includes('planner="cone snail on coral"'))
{
  let corpo = null, opcoes = null
  const r = await Q.planSceneQueries([{ voiceover: 'a' }, { voiceover: 'b' }, { voiceover: 'c' }], { topic: 't' }, { create: async (b, o) => { corpo = b; opcoes = o; return { choices: [{ message: { content: JSON.stringify(RESPOSTA) } }] } } })
  const erro = await Q.planSceneQueries([{ voiceover: 'a' }], { topic: 't' }, { create: async () => { throw new Error('429') } })
  const semChave = await Q.planSceneQueries([{ voiceover: 'a' }], { topic: 't' })
  checa('UMA chamada gpt-4o-mini JSON, temperatura baixa, sem retentativa; erro → null; sem chave → null', r?.length === 3 && corpo.model === 'gpt-4o-mini' && corpo.temperature <= 0.3 && corpo.response_format?.type === 'json_object' && opcoes.maxRetries === 0 && erro === null && semChave === null)
}
checa('cena fraca DEPOIS da busca: reciclado > sem stock possível > só cofre > sujeito não é tag exata; forte → null', Q.weakSceneReason({ origin: 'recycled' }) === 'no_stock' && Q.weakSceneReason({ origin: 'pool', stockable: false }) === 'not_stockable' && Q.weakSceneReason({ origin: 'vault', stockable: true }) === 'vault_only' && Q.weakSceneReason({ origin: 'vault', stockable: false }) === 'not_stockable' && Q.weakSceneReason({ origin: 'pool', stockable: true, subject: 'cone snail', pickedTags: REAL.vulcao }) === 'subject_not_exact' && Q.weakSceneReason({ origin: 'pool', stockable: true, subject: 'cone snail', pickedTags: 'cone snail, snail, shell' }) === null)
checa('escolha dos clipes de IA: pior razão primeiro, empate → mais tardia, cena 1 fora quando há hook, teto respeitado', J(Q.pickAiClipScenesV2([{ scene: 1, reason: 'no_stock' }, { scene: 2, reason: 'subject_not_exact' }, { scene: 3, reason: 'not_stockable' }, { scene: 4, reason: 'no_stock' }, { scene: 5, reason: null }], 2, { skipScene1: true })) === '[3,4]' && Q.pickAiClipScenesV2([{ scene: 2, reason: 'no_stock' }], 0).length === 0)

console.log('== clipe de IA: troca em vez de inserção, sem laço ==')
const falStub = { fal: { config() {}, queue: { submit: async () => ({ request_id: 'r' }), status: async () => ({ status: 'COMPLETED' }), result: async (_m, { requestId }) => ({ data: { video: { url: `https://v3.fal.media/${requestId}.mp4` } } }) } } }
const C = mundo({ stubs: { '@fal-ai/client': falStub, './fastAiHook': { persistHookClip: async (u) => u.replace('https://v3.fal.media/', 'https://supa/broll/ai-scene/') } }, env: { FAL_KEY: 'k' } }).carregar('lib/fastAiClips.ts')
const base5 = ['s1', 's2', 's3', 's4', 's5']
checa('troca: o clipe pronto SUBSTITUI o stock do índice; o hook continua abrindo (inserção); a contagem da rota se mantém', J(C.spliceAiClips(base5, [{ scene: 1, at_index: 0, url: 'H', ms: 1 }, { scene: 3, at_index: 2, url: 'A', ms: 1, replace_index: 2 }])) === J(['H', 's1', 's2', 'A', 's4', 's5']))
checa('troca não pronta → o stock fica (cena nunca vazia); índice fora do alcance → encaixe de hoje', J(C.spliceAiClips(base5, [{ scene: 3, at_index: 2, url: null, ms: 1, replace_index: 2 }])) === J(base5) && J(C.spliceAiClips(base5, [{ scene: 3, at_index: 2, url: 'A', ms: 1, replace_index: 9 }])) === J(['s1', 's2', 'A', 's3', 's4', 's5']))
checa('empate de índice: a inserção vem antes e a troca cai no clipe que ela empurrou', J(C.spliceAiClips(base5, [{ scene: 2, at_index: 0, url: 'R', ms: 1, replace_index: 0 }, { scene: 1, at_index: 0, url: 'H', ms: 1 }])) === J(['H', 'R', 's2', 's3', 's4', 's5']))
checa('sem replace_index o encaixe é o de hoje (o caso do guardião de 17/09)', J(C.spliceAiClips(base5, [{ scene: 1, at_index: 0, url: 'H', ms: 1 }, { scene: 3, at_index: 3, url: 'A', ms: 1 }, { scene: 5, at_index: 4, url: null, ms: 1 }])) === J(['H', 's1', 's2', 's3', 'A', 's4', 's5']))
{
  const pend = C.parsePendingAiClips({ clips: [{ request_id: 'a', scene: 1, at_index: 0, prompt: 'p', usd: 0.13 }, { request_id: 'b', scene: 4, at_index: 5, prompt: 'p', usd: 0.13, replace_index: 5, seconds: 5 }, { request_id: 'c', scene: 5, at_index: 7, replace_index: -1, seconds: 30 }] })
  checa('evento pendente: replace_index/seconds só entram quando válidos', pend.length === 3 && pend[0].replace_index === undefined && pend[1].replace_index === 5 && pend[1].seconds === 5 && pend[2].replace_index === undefined && pend[2].seconds === undefined)
  const prontos = await C.awaitPendingAiClips(pend, 2000)
  checa('o pronto herda o modo troca do pendente (e só ele)', prontos.length === 3 && prontos[1].replace_index === 5 && prontos[0].replace_index === undefined && prontos.every((p) => p.url && p.url.startsWith('https://supa/')))
}
const compose = rd('lib/compose.ts')
checa('espelho do montador (lib/compose.ts, travado) confere: fatia 2,5-4,5 s, trim 0,1, sobreposição 0,06, crossfade 0,25, reentrada min(volta×(fatia+0,6), 6)', compose.includes('const FAST_MIN_CUT_SECONDS = 2.5') && compose.includes('const FAST_MAX_CUT_SECONDS = 4.5') && compose.includes('const CLIP_TRIM_START = 0.1') && compose.includes('const CLIP_GAP_OVERLAP = 0.06') && compose.includes('const FAST_CROSSFADE_SECONDS = 0.25') && compose.includes('? round3(CLIP_TRIM_START + Math.min(reuseIndex * (segLen + 0.6), 6))') && compose.includes('? clamp(totalDuration / cleanClips.length, FAST_MIN_CUT_SECONDS, FAST_MAX_CUT_SECONDS)'))
checa('Seedance 1.5 Pro aceita 4-12 s (lib/cinematic/shotSpec.ts) e a duração pedida respeita isso', rd('lib/cinematic/shotSpec.ts').includes('export const CLIP_MIN_SECONDS = 4') && rd('lib/cinematic/shotSpec.ts').includes('export const CLIP_MAX_SECONDS = 12') && C.seedanceDurationParam() === '5' && C.seedanceDurationParam(4.91) === '5' && C.seedanceDurationParam(10.01) === '11' && C.seedanceDurationParam(30) === '12' && C.seedanceDurationParam(2) === '4')
checa('uma fatia cheia lê 4,91 s do arquivo: 5 s cobrem sem laço', C.fastSlotSourceSeconds(4.5) === 4.91 && C.fastSlotSourceSeconds(4.5) <= 5)
{
  const meio = C.planAiClipForSlot({ filmSeconds: 35, clipCount: 12, index: 5 })
  const reentra = C.planAiClipForSlot({ filmSeconds: 35, clipCount: 12, index: 1 })
  const pago = C.planAiClipForSlot({ filmSeconds: 35, clipCount: 12, index: 1, maxUsd: 0.3 })
  // KINEO1-SEM-LACO-2026-09-28 (FIX-REVISAO-2) — o plano não recua mais para a inserção de 5 s: o índice 1 reentra, 11 s
  // não cabem no teto de hoje → fits=false com a duração e o preço de verdade (quem chama pula a cena, o stock fica).
  checa('35 s / 12 clipes: índice 5 nunca reentra → troca com 5 s (US$ 0,13); índice 1 reentra → SEM o recuo de 5 s (fits=false, 11 s e o preço deles); pagando, 11 s cobrem a reentrada', meio.mode === 'replace' && meio.seconds === 5 && meio.usd === 0.13 && meio.reentries === 0 && meio.fits === true && reentra.fits === false && reentra.mode === 'replace' && reentra.reentries === 1 && reentra.seconds === 11 && reentra.usd > C.SEEDANCE_720P_5S_USD && pago.mode === 'replace' && pago.fits === true && pago.seconds === 11 && pago.sourceSeconds <= 11)
  // Varredura: nenhum plano que cabe lê além do arquivo (sem laço), e nenhum plano devolve um clipe de 5 s para uma fatia
  // que reentra. O recuo antigo ('insert' 5 s com reentries > 0) reprova aqui.
  let semLaco = true
  const quebras = []
  for (const filmSeconds of [35, 45, 61.5, 66, 90]) for (let clipCount = 4; clipCount <= 20; clipCount++) for (let index = 0; index < clipCount; index++) for (const maxUsd of [0.05, 0.13, 0.144, 0.2, 0.3, 0.4]) {
    const p = C.planAiClipForSlot({ filmSeconds, clipCount, index, maxUsd })
    const ok = typeof p.fits === 'boolean' && p.mode === 'replace' && p.seconds >= C.fastSlotSourceSeconds(4.5, 0) && (p.fits ? p.sourceSeconds <= p.seconds && p.usd <= maxUsd + 1e-9 : p.usd > maxUsd + 1e-9 || p.sourceSeconds > 12) && !(p.reentries > 0 && p.seconds <= 5)
    if (!ok) { semLaco = false; if (quebras.length < 3) quebras.push(J({ filmSeconds, clipCount, index, maxUsd, p })) }
  }
  checa(`sem laço: em ${5 * 17} filmes × índices × 6 tetos, todo plano cobre a leitura (fits) ou diz que não cabe; nunca 5 s numa fatia que reentra${quebras.length ? ' — ' + quebras.join(' | ') : ''}`, semLaco)
}
const clipsSrc = rd('lib/fastAiClips.ts')
checa('o pedido padrão à fal é o de sempre (720p, 5 s, SEM áudio); seconds só troca a duração', clipsSrc.includes("resolution: '720p', duration: '5', generate_audio: false, ...(seconds !== undefined ? { duration: seedanceDurationParam(seconds) } : {})"))
if (temBase) {
  const C0 = mundo({ stubs: { '@fal-ai/client': falStub, './fastAiHook': { persistHookClip: async (u) => u } }, env: { FAL_KEY: 'k' }, fontes: { 'lib/fastAiClips.ts': baseSrc.clips } }).carregar('lib/fastAiClips.ts')
  const casos = [[{ scene: 1, at_index: 0, url: 'H', ms: 1 }], [{ scene: 3, at_index: 2, url: 'A', ms: 1 }, { scene: 1, at_index: 0, url: 'H', ms: 1 }], [{ scene: 9, at_index: 99, url: 'Z', ms: 0 }], []]
  checa(`encaixe e leitura do evento sem replace_index = o do ${BASE}`, casos.every((r) => J(C.spliceAiClips(base5, r)) === J(C0.spliceAiClips(base5, r))) && J(C.parsePendingAiClips({ clips: [{ request_id: 'a', scene: 1, at_index: 0, prompt: 'p', usd: 0.13 }] })) === J(C0.parsePendingAiClips({ clips: [{ request_id: 'a', scene: 1, at_index: 0, prompt: 'p', usd: 0.13 }] })))
} else checa('comparação com a base pulada', true)

console.log('== (c) a rota: a parte B ([TRAVA 8.2]) liga tudo atrás de UM interruptor ==')
// KINEO1-IMAGEM-V2-2026-09-28 [TRAVA 8.2] — até a parte B esta seção provava "a rota travada não liga nada" (a parte A
// subia sozinha). Com o commit [TRAVA 8.2] a intenção passa a ser: tudo o que a rota liga passa pelo interruptor
// KINEO1_IMAGEM_V2 (false = o caminho de 22c8e70e, EXECUTADO em scripts/test-kineo1-imagem-v2-rota-2026-09-28.mjs), o
// roteiro com [Pexels:] fica de fora, e o dryRun do replay (que não grava no cofre) nunca entra na rota.
const rota = rd('app/api/generate-video-fast/route.ts')
checa('app/api/generate-video-fast/route.ts: um interruptor; as duas opções v2 (cofre e Pixabay) só com imagemV2; personagem v2 pelo interruptor; nenhum dryRun', /\nconst KINEO1_IMAGEM_V2 = (?:true|false)\n/.test(rota) && rota.includes('const imagemV2 = KINEO1_IMAGEM_V2 && !verbatim') && (rota.match(/\bv2: true\b/g) || []).length === 2 && (rota.match(/imagemV2 \? \{ v2: true/g) || []).length === 2 && rota.includes('characterStoryName(falas || prompt, { v2: KINEO1_IMAGEM_V2 })') && !/\bdryRun: true\b/.test(rota))
checa('o compose continua chamando o mesmo encaixe (o modo troca chega pelo pronto, não por parâmetro novo)', rd('app/api/compose/route.ts').includes('composeClipUrls = spliceAiClips(clipUrls, ready)'))

console.log('== (d) replay: sem escrita, ponta a ponta sem rede ==')
const rotaReplay = rd('app/api/admin/kineo1-replay/route.ts')
const replaySrc = rd('lib/kineo1/replay.ts')
checa('rota do replay: só admin (sessão) ou CRON_SECRET; 403 sem; lote ≤ 40; sem POST', rotaReplay.includes("if (!(await autorizado(req))) return NextResponse.json({ error: 'forbidden' }, { status: 403 })") && rotaReplay.includes('isAdminEmail(user.email') && rotaReplay.includes('const LOTE_MAX = 40') && !/export async function (POST|PUT|DELETE|PATCH)/.test(rotaReplay))
checa('replay e rota não escrevem nada (nenhum insert/update/upsert/delete/rpc) e o pool roda com v2 + dryRun', !/\.(insert|update|upsert|delete|rpc)\(/.test(replaySrc + rotaReplay) && replaySrc.includes('v2: true, dryRun: true') && replaySrc.includes("searchVault(queries[0], { v2: true, client: admin"))
{
  // Filme sintético com as falas/buscas/tags reais: cena 1 do caramujo-cone (vulcão no stock), cena 2 do lobo (raio-X
  // do cofre), cena 3 do Bezos (vírgula inventada; o banco não tem "Bezos comendo").
  const film = {
    generation_id: '00000000-0000-4000-8000-000000000001', user_id: 'u', created_at: '2026-09-27T00:00:00Z', topic: 'deadliest animals and billionaire habits', verbatim: false,
    scenes: [
      { scene: 1, voiceover: 'Cone snails: their venom can paralyze instantly, with no known antidote.', query: 'cone snail on coral', sources: ['pixabay', 'pixabay'], tags: [REAL.vulcao] },
      { scene: 2, voiceover: 'Las huellas del lobo en la nieve fresca cuentan historias de caza.', query: 'close-up macro wolf tracks snow moonlight', sources: ['pixabay'], tags: [REAL.raiox] },
      { scene: 3, voiceover: 'Bezos preferred to start the day with eggs and toast.', query: 'space needle, brainstorming, skyline', sources: ['pixabay'], tags: ['work space, meeting, startup'] },
    ],
    narration: 'x', narration_source: 'compose_claim', film_seconds: 35,
    before: { score: 50, narration_vs_visuals: 40, problems: [], version: 'v5', at: '' },
    ai: { eligible: true, hookPrompt: null, hookReady: false, clipPrompts: {}, clipReady: [] },
    stills: { character: null, byScene: {} },
  }
  const PLANOS = [
    { subject: 'cone snail', queries: ['cone snail reef', 'cone snail shell'], stockable: true, aiPrompt: 'cone snail on a reef' },
    { subject: 'wolf tracks', queries: ['wolf tracks snow', 'wolf walking snow'], stockable: true, aiPrompt: 'wolf tracks in fresh snow at night' },
    { subject: 'eggs toast', queries: ['businessman eating breakfast', 'eggs toast plate'], stockable: false, aiPrompt: 'a man eating eggs and toast at dawn' },
  ]
  const juizes = []
  const sb = supabaseFalso([RAIOX, LOBO, HOOK])
  const vaultChamadas = []
  const fake = pixabayFalsa((q) => (q.includes('cone snail') ? [vid(11, REAL.vulcao), vid(12, 'cone snail, snail, shell, sea, marine, coral')] : q.includes('eggs') || q.includes('breakfast') ? [vid(31, 'breakfast, eggs, bacon, plate, kitchen')] : []))
  const m = mundo({ stubs: { '@/lib/openai': { openai: {} }, '@/lib/broll/aesthetic-packs': { PEOPLE_LIFESTYLE_RE: /\b(people|person|man|woman)\b/i }, '@supabase/supabase-js': { createClient: () => sb } }, env: { PIXABAY_API_KEY: 'k' }, globals: { fetch: fake.f } })
  // cofre REAL (com a Pixabay real deste mundo) e vaultClipAsync espiado; o resto das dependências do replay é stub.
  const pixM = m.carregar('lib/pixabay.ts')
  const vaultM = m.carregar('lib/clipVault.ts')
  const Qm = m.carregar('lib/kineo1/sceneQueries.ts')
  const Cm = mundo({ stubs: { '@fal-ai/client': falStub, './fastAiHook': {} } }).carregar('lib/fastAiClips.ts')
  const R = mundo({
    stubs: {
      '@/lib/broll/aesthetic-packs': { PEOPLE_LIFESTYLE_RE: /\b(people|person|man|woman)\b/i },
      '@/lib/clipVault': { ...vaultM, searchVault: (...a) => vaultM.searchVault(...a) },
      '@/lib/fastAiClips': { buildSceneClipPrompt: Cm.buildSceneClipPrompt, FIRST_FILM_AI_CLIPS_EVENT: 'fast_ai_clips_pending', FIRST_FILM_AI_CLIPS_RESULT_EVENT: 'fast_ai_clips_result' },
      '@/lib/fastAiScene': { characterStoryName: S.characterStoryName },
      '@/lib/fastCoherence': { FAST_COHERENCE_EVENT: 'fast_coherence', FAST_COHERENCE_VERSION: 'v5', FAST_SCENE_PLAN_EVENT: 'fast_scene_plan', scoreFastCoherence: async (inp) => { juizes.push(inp); return { score: 80, narration_vs_visuals: 80, problems: [], summary: 'ok' } } },
      '@/lib/pixabay': pixM,
      './sceneQueries': { ...Qm, planSceneQueries: async () => PLANOS },
    },
  }).carregar('lib/kineo1/replay.ts')
  const res = await R.replayFilm(sb, film, { aiMax: 2, pixabayRpm: 80, variants: 'strict' })
  const [e1, e2, e3] = juizes[0]?.scenes ?? []
  checa('replay cena 1: o vulcão sai, o caramujo fica (portão v2 no pool real)', e1 && J(e1.tags) === J(['cone snail, snail, shell, sea, marine, coral']) && res.per_scene[0].after.origin === 'pool')
  checa('replay cena 2: o raio-X do cofre não volta; o lobo do cofre entra (cofre v2) — cena só de cofre vira clipe de IA e o lobo SAI (troca)', e2 && !J(e2).includes('x-ray') && res.per_scene[1].after.weak === 'vault_only' && res.per_scene[1].after.origin === 'vault' && J(e2.sources) === '["aiVideo"]' && e2.tags.length === 0)
  checa('replay cena 3: a vírgula inventada sai; o banco não tem "Bezos" (stockable=false) → clipe de IA no modo TROCA (sem tags de stock, busca "AI clip: …")', e3 && J(e3.sources) === '["aiVideo"]' && e3.tags.length === 0 && e3.query.startsWith('AI clip: ') && !/space needle|skyline/.test(J(res.per_scene[2].after.queries)))
  checa('replay: ai_scenes = as cenas fracas (≤ ai_max), o juiz é chamado UMA vez, nada é gravado (nem cofre, nem evento)', J(res.ai_scenes) === '[2,3]' && juizes.length === 1 && sb.chamadas.every((c) => c.escrita === null))
  checa('replay: sem rpc/fal/render; custo 1 chamada de buscas + 1 de juiz', res.cost.openai_calls === 2 && res.plan_ok === true)
  checa('distribuição: faixas 40/60/80+ e média; resumo conta subiu/caiu', J(R.coherenceDistribution([40, 60, 80, null, 95]).buckets) === J({ '<=40': 1, '41-60': 1, '61-79': 0, '>=80': 2, null: 1 }) && R.summarizeReplay([res]).image_up === 1)
  juizes.length = 0
  const ambas = await R.replayFilm(sb, film, { aiMax: 2, pixabayRpm: 80 })
  checa('padrão = as duas variantes: 2 juízes (regra 2 pura e regra 5), after e after_fallback, 3 chamadas; ainda nada gravado', juizes.length === 2 && ambas.variant === 'strict' && ambas.after && ambas.after_fallback && Array.isArray(ambas.per_scene_fallback) && ambas.cost.openai_calls === 3 && sb.chamadas.every((c) => c.escrita === null) && R.summarizeReplay([ambas]).image_up_fallback === 1)
}

{
  // KINEO1-REPLAY-RPM-2026-09-28 (FIX-REVISAO-2) — o teto do replay vale POR PEDIDO. O revisor (replayFilm REAL, Pixabay
  // REAL, fetch falso sem acertos) mediu 24 pedidos em 13 ms numa cena só com rpm=10: a vaga era checada só antes de
  // cada cena e a cena levava TODAS as buscas (as da fala + 3 do plano + cada pedaço com vírgula), cada uma com até 4
  // alargamentos × 2 pedidos na cadeia do pool seco. A chave (100/min) é da produção também.
  const pedidos = []
  const fetchSeco = async (url) => { pedidos.push(new URL(url).searchParams.get('q')); return { ok: true, status: 200, json: async () => ({ hits: [] }) } }
  const semAcerto = () => []
  const mr = mundo({ stubs: { './clipVault': { vaultClipAsync: () => {} }, '@/lib/openai': { openai: {} } }, env: { PIXABAY_API_KEY: 'k', FAST_GPT_DIRECTOR: 'false' }, globals: { fetch: fetchSeco } })
  const pixR = mr.carregar('lib/pixabay.ts')
  const QmR = mr.carregar('lib/kineo1/sceneQueries.ts')
  const CmR = mundo({ stubs: { '@fal-ai/client': falStub, './fastAiHook': {} } }).carregar('lib/fastAiClips.ts')
  const carregarReplay = () => mundo({
    stubs: {
      '@/lib/broll/aesthetic-packs': { PEOPLE_LIFESTYLE_RE: /\b(people|person|man|woman)\b/i },
      '@/lib/clipVault': { searchVault: async () => semAcerto() },
      '@/lib/fastAiClips': { buildSceneClipPrompt: CmR.buildSceneClipPrompt, FIRST_FILM_AI_CLIPS_EVENT: 'fast_ai_clips_pending', FIRST_FILM_AI_CLIPS_RESULT_EVENT: 'fast_ai_clips_result' },
      '@/lib/fastAiScene': { characterStoryName: () => null },
      '@/lib/fastCoherence': { FAST_COHERENCE_EVENT: 'fast_coherence', FAST_COHERENCE_VERSION: 'v5', FAST_SCENE_PLAN_EVENT: 'fast_scene_plan', scoreFastCoherence: async () => ({ score: 60, narration_vs_visuals: 60, problems: [], summary: '' }) },
      '@/lib/pixabay': pixR,
      './sceneQueries': { ...QmR, planSceneQueries: async (cenas) => cenas.map((_, i) => ({ subject: `grass court ${i}`, queries: [`grass tennis court ${i}`, `tennis ball bounce ${i}`, `tennis player serve ${i}`], stockable: true, aiPrompt: 'x' })) },
    },
  }).carregar('lib/kineo1/replay.ts')
  const cena = (n) => ({ scene: n, voiceover: `With every hit the felt of the tennis ball wears down, and the ball boy hands the umpire chair a new one ${n}.`, query: `tennis ball felt closeup ${n}, tennis court bounce ${n}, player hitting ball ${n}, ball boy ${n}, umpire chair ${n}`, from: n - 1, sources: ['pixabay'], tags: ['x'] })
  const filmeRpm = (n) => ({ generation_id: 'g', user_id: 'u', created_at: '2026-09-27T00:00:00Z', topic: 'Why tennis players change balls', verbatim: false, scenes: Array.from({ length: n }, (_, i) => cena(i + 1)), narration: 'x', narration_source: 'scene_plan', film_seconds: 35, before: null, ai: { eligible: false, hookPrompt: null, hookReady: false, clipPrompts: {}, clipReady: [] }, stills: { character: null, byScene: {} } })
  const R10 = carregarReplay()
  const r10 = await R10.replayFilm({}, filmeRpm(2), { variants: 'strict', pixabayRpm: 10, deadlineAt: Date.now() + 300 })
  checa(`replay com rpm=10: no máximo 10 pedidos à Pixabay no minuto, o resto sem vaga até o prazo (cost.pixabay_denied) — foram ${pedidos.length}`, pedidos.length <= 10 && r10.cost?.pixabay_requests === pedidos.length && r10.cost?.pixabay_denied > 0)
  checa('replay: no máximo 4 buscas por cena, como a rota (KINEO1_SCENE_QUERIES_MAX); a vírgula da busca antiga não multiplica pedidos', R10.REPLAY_SCENE_QUERIES_MAX === 4 && r10.per_scene.every((s) => s.after.queries.length <= 4))
  pedidos.length = 0
  const R80 = carregarReplay()
  const r80 = await R80.replayFilm({}, filmeRpm(6), { variants: 'strict', pixabayRpm: 80, deadlineAt: Date.now() + 300 })
  checa(`replay pedindo rpm=80: o teto é REPLAY_PIXABAY_RPM_MAX (50) — a produção fica com a metade da chave; foram ${pedidos.length}`, R80.REPLAY_PIXABAY_RPM_MAX === 50 && pedidos.length <= 50 && r80.cost?.pixabay_denied > 0)
  const Rv = carregarReplay()
  const seq = [await Rv.vagaNaPixabay?.(3, Date.now() + 50), await Rv.vagaNaPixabay?.(3, Date.now() + 50), await Rv.vagaNaPixabay?.(3, Date.now() + 50), await Rv.vagaNaPixabay?.(3, Date.now() + 50)]
  checa('a vaga é por pedido: 3 por minuto → a 4ª espera; sem tempo até o prazo, volta false (nunca estoura o teto)', J(seq) === J([true, true, true, false]))
  const rotaRpm = rd('app/api/admin/kineo1-replay/route.ts')
  checa('rota do replay: o ?rpm= vai de REPLAY_PIXABAY_RPM_MIN a REPLAY_PIXABAY_RPM_MAX (era 10-80)', rotaRpm.includes("pixabayRpm: intParam(url, 'rpm', 40, REPLAY_PIXABAY_RPM_MIN, REPLAY_PIXABAY_RPM_MAX)") && !rotaRpm.includes("intParam(url, 'rpm', 40, 10, 80)"))
  const pixSrc = rd('lib/pixabay.ts')
  checa('lib/pixabay: a vaga só existe com a opção (throttle ausente = hoje) e é pedida antes de cada ida à rede, depois do cache e do disjuntor', pixSrc.includes('    if (throttle && !(await throttle())) return []') && pixSrc.indexOf('if (throttle && !(await throttle())) return []') > pixSrc.indexOf('if (Date.now() < breakerOpenUntil) {') && (pixSrc.match(/\.\.\.\(opts\.throttle \? \{ throttle: opts\.throttle \} : \{\}\)/g) || []).length === 2)
}

console.log('== (e) parte B, peças inertes: instrução colada, ordem das buscas, candidatos, painel no modo troca ==')
const PB = mundo().carregar('lib/kineo1/pastedBrief.ts')
// Os dois textos REAIS da taxonomia (fast_scene_plan.topic de 2ff93c15 e b3b3e101), inteiros.
const LUA = 'Crie um vídeo vertical 9:16 de 45–60 segundos, estilo YouTube Shorts viral, sobre: “O que aconteceria se a Lua desaparecesse de repente?”\n\nComece nos primeiros 2 segundos com um gancho muito forte. Use narração natural em inglês americano e legendas grandes e dinâmicas em inglês, destacando palavras importantes.\n\nMostre consequências cada vez mais surpreendentes: mudanças nas marés, noites muito mais escuras, impacto nos animais e possíveis efeitos de longo prazo na Terra.\n\nTroque as cenas a cada 2–3 segundos, usando imagens realistas e cinematográficas, movimentos de câmera, cortes rápidos e música de suspense.\n\nNão use avatar, introdução ou “like and subscribe”.\n\nO vídeo deve parecer profissional e feito por um criador humano, não um vídeo genérico de IA. Termine com uma informação surpreendente que faça a pessoa querer comentar.'
const GEMEOS = '"Esto le pasó a dos gemelos que nunca se conocieron. Los separaron al nacer. Cuando se reencontraron, a los 39 años, ambos se llamaban Jim. Ambos se habían casado con una Linda, luego con una Betty, y tenían un perro llamado Toy. Los científicos los estudiaron durante años. ¿Genética, casualidad... o algo más?"\n\nEstilo visual: ilustración minimalista, fondo azul marino profundo, acentos dorados y lavanda, siluetas sin rostros, hilos de luz dorada conectando figuras, atmósfera calmada y misteriosa. Sin personas reales ni caras detalladas.\n\nSubtítulos: grandes, blancos con contorno azul marino, en el centro-superior de la pantalla, nunca abajo.\n\nMúsica: ambiental suave y baja, sin letra.\n\nSin logos ni marcas de agua.'
{
  const lua = PB.splitPastedBrief(LUA)
  checa('2ff93c15 (a Lua): as 6 linhas são instrução (5 fortes + "Mostre…" fraca) → brief_only: o texto é um BRIEFING, quem escreve a fala é a IA', lua.mode === 'brief_only' && lua.brief.length === 6 && lua.narrationWords === 0 && J(lua.kinds) === J(['imperative', 'imperative', 'imperative_weak', 'imperative', 'imperative', 'about_film']))
  const gem = PB.splitPastedBrief(GEMEOS)
  checa('b3b3e101 (os gêmeos): "Estilo visual:", "Subtítulos:", "Música:" e "Sin logos…" saem; a fala entre aspas fica PALAVRA POR PALAVRA', gem.mode === 'narration_kept' && gem.narration === GEMEOS.split('\n')[0] && gem.brief.length === 4 && gem.brief[0].startsWith('Estilo visual:') && gem.brief.at(-1) === 'Sin logos ni marcas de agua.')
  const NARR = [
    'Use this trick to save money every month. Start your day with cold water. Show me a man who never failed, and I will show you a man who never tried.',
    'Keep watching, because the ending will shock you.\nTom: I told you the video was fake.\nMake no mistake, this changed everything.',
    'Imagine waking up in a world without the Moon. The tides would collapse. The nights would go black.',
    'No music could calm him that night. No light, no sound, only the sea.',
    'Mostre ao mundo quem você é. Comece hoje, termine amanhã, e nunca pare de tentar.',
  ]
  checa('narração com abertura imperativa ("Use this trick", "Start your day", "Show me", "Keep watching", "Tom:", "No music could…", "Mostre ao mundo") não perde nenhuma linha', NARR.every((t) => { const r = PB.splitPastedBrief(t); return r.mode === 'none' && r.narration === t }))
  const TITULO = 'Title: The Moon Vanishes\nImagine waking up without the Moon. The tides would collapse, the nights would go black, and every animal would lose its clock.\nHashtags: #moon #space'
  const t = PB.splitPastedBrief(TITULO)
  checa('roteiro do ChatGPT com Title:/Hashtags: fica só com a fala (linha inteira, intocada)', t.mode === 'narration_kept' && t.narration === TITULO.split('\n')[1])
  checa('rótulo de FALA ("Narração:") → nada muda aqui (o parser decide o roteiro rotulado)', PB.splitPastedBrief('Estilo visual: noir\nNarração: Era uma vez um farol no fim do mundo, e ninguém sabia quem acendia a luz.').mode === 'none')
  checa('linha que abre com aspas é fala mesmo com verbo de editor ou rótulo', PB.classifyPastedLine('“Use a narração do seu coração”, disse ela.') === null && PB.classifyPastedLine('> "Estilo visual: é tudo o que importa", ele disse.') === null)
  const KEEP = 'Title: The Last Signal\nKeep watching, because the video you see next was recorded seconds before the signal died.\nHashtags: #space #mystery'
  checa('"Keep watching…" é fala mesmo num texto com 2 rótulos (keep não é verbo de editor)', PB.splitPastedBrief(KEEP).mode === 'narration_kept' && PB.splitPastedBrief(KEEP).narration === KEEP.split('\n')[1])
  const umaForte = PB.splitPastedBrief('Estilo visual: noir, chuva, neon.\nMostre ao mundo quem você é. A cidade dorme, mas você não dorme há três dias e sabe muito bem por quê.')
  checa('uma linha forte sozinha sai; sem 2 fortes a fraca ("Mostre ao mundo…") fica', umaForte.mode === 'narration_kept' && umaForte.brief.length === 1 && umaForte.narration.startsWith('Mostre ao mundo'))
  checa('fala que sobra com menos de 12 palavras = briefing (a IA escreve)', PB.splitPastedBrief('Estilo visual: noir.\nSubtítulos: grandes.\nA Lua sumiu.').mode === 'brief_only' && PB.PASTED_BRIEF_MIN_NARRATION_WORDS === 12)
}
{
  // ── REVISÃO PÓS-AUDITORIA (28/09): os dois defeitos que o revisor provou executando a v1 desta peça ──
  // D1 — 17dd0c7a/2fa42114 (24/09, PT, 1ª tentativa da mesma pessoa da Lua): em 22c8e70e 108 s de fala → 422 sem
  // cobrança; a v1 deixava 102 palavras ("Conte a história…", "O resultado final deve…" e as duas falas entre aspas) →
  // filme de 35 s COBRADO lendo instrução. Texto REAL (render_job_opened.prompt), inteiro.
  const LUA17 = 'Crie um vídeo vertical (9:16) altamente envolvente de 35 a 45 segundos, desenvolvido para YouTube Shorts e Instagram Reels, com foco máximo em retenção.\n\nTema: O que aconteceria se a Lua desaparecesse de repente?\n\nComece imediatamente, sem introdução, com uma imagem impactante e o seguinte gancho:\n\n“Se a Lua desaparecesse hoje à noite, a Terra mudaria mais rápido do que você imagina.”\n\nO vídeo deve ter aparência de um documentário científico cinematográfico misturado com o ritmo rápido de um vídeo viral.\n\nUse imagens realistas e cinematográficas da Terra, Lua, oceanos, marés, cidades durante a noite, animais noturnos e espaço. Evite imagens genéricas com aparência óbvia de IA, objetos deformados, planetas irreais ou cenas repetidas.\n\nTroque o visual a cada 2–3 segundos. Use movimentos de câmera, aproximações, mudanças de escala, cortes rápidos e transições suaves para manter a atenção.\n\nConte a história aumentando progressivamente as consequências: primeiro a Lua desaparece; depois mostre o efeito sobre as marés; noites muito mais escuras; impacto sobre animais que dependem da luz da Lua; possíveis efeitos de longo prazo sobre a estabilidade do eixo da Terra; e termine com a consequência mais surpreendente.\n\nUse narração em inglês americano natural, com voz de documentário moderna, energética e convincente. As frases devem ser curtas e diretas.\n\nColoque legendas grandes e dinâmicas em inglês, perfeitamente sincronizadas com a narração. Destaque palavras importantes em amarelo. As legendas devem ser fáceis de ler em um celular e não devem cobrir os elementos principais das imagens.\n\nAdicione efeitos sonoros cinematográficos sutis e uma música de suspense que aumente gradualmente ao longo do vídeo.\n\nNão use apresentador ou avatar de IA. Não coloque introdução, logo, enrolação, “like and subscribe” ou conclusão genérica.\n\nTermine com:\n\n“And the strangest effects might not appear for thousands of years.”\n\nO resultado final deve parecer um YouTube Short profissional e viral, editado por uma pessoa, e não uma sequência genérica de imagens geradas por IA.'
  const l17 = PB.splitPastedBrief(LUA17)
  const cheias = (t) => t.split('\n').map((x) => x.trim()).filter(Boolean)
  checa('D1 17dd0c7a: briefing com gancho e fecho entre aspas → brief_only (a IA escreve o filme em volta; nenhuma linha de instrução é narrada)', l17.mode === 'brief_only' && J(cheias(l17.narration)) === J([LUA17.split('\n')[6], LUA17.split('\n')[26]]) && l17.narrationWords < PB.PASTED_BRIEF_QUOTED_FILM_MIN_WORDS && PB.PASTED_BRIEF_QUOTED_FILM_MIN_WORDS === 80)
  checa('D1 17dd0c7a: "Conte a história…" e "O resultado final deve…" são SOBRA de instrução (residual) — as duas que a v1 narrava', l17.brief.filter((l, i) => l17.kinds[i] === 'residual').map((l) => l.slice(0, 18)).join('|') === 'Conte a história a|O resultado final ')
  // 8b23d27a (ES, tênis, filme REAL entregue): 6 linhas de fala + 4 de instrução; a v1 tirava só "La narración debe…".
  const TENIS = '¿Por qué los tenistas cambian pelotas que parecen completamente nuevas?\n\n¡No es por capricho!\n\nCon cada golpe, el fieltro de la pelota se desgasta y cambia cómo se mueve por el aire y cómo bota.\n\nPor eso, en los torneos profesionales, las pelotas se cambian siguiendo una regla: después de los primeros siete juegos y, normalmente, cada nueve juegos más.\n\nY cuando escuchas al juez decir «¡pelotas nuevas!», ya sabes por qué.\n\nOjito con esto… porque puede que todo, no lo supieras.\n\nEstilo documental deportivo moderno, dinámico y visualmente atractivo. Utiliza imágenes o vídeos de stock relacionados directamente con el tenis: primeros planos de pelotas nuevas y usadas, jugadores sacando, pelotas botando en pista y recogepelotas.\n\nLa narración debe sonar natural en español de España, con ritmo ágil y tono de sorpresa. Añade subtítulos grandes, claros y sincronizados. Cambia de plano con frecuencia, pero evita transiciones exageradas y movimientos de cámara artificiales.\n\nEl primer segundo debe mostrar una pelota de tenis y presentar directamente la pregunta del guion. No incluyas una introducción, logo animado ni despedida larga.\n\nNo inventes escenas de un torneo específico ni presentes imágenes genéricas como si fueran de un partido real. No añadas estadísticas, textos ni afirmaciones que no estén en el guion. Termina justo después de la última frase.'
  const tn = PB.splitPastedBrief(TENIS)
  checa('D1 8b23d27a: com UMA linha forte ("La narración debe…"), a sobra de instrução também sai; a fala são as 6 linhas do autor, idênticas, na ordem', tn.mode === 'narration_kept' && tn.narration === TENIS.split('\n\n').slice(0, 6).join('\n\n') && J(tn.kinds) === J(['residual', 'about_film', 'residual', 'residual']))
  // 8c0ed465 (EN, "3 Places on Earth…"): roteiro + 17 linhas de direção; fica a fala do autor, com os títulos das partes.
  const LUGARES = 'Create a 40–45 second vertical viral video titled:\n\n“3 Places on Earth Where You Wouldn’t Survive 5 Minutes”\n\n“There are places on Earth where your body wouldn’t survive five minutes. And the last one is terrifying.”\n\n#3 – Death Valley, California\n\nDeath Valley is one of the hottest places on Earth. Temperatures can rise above 50°C. Without water or protection, extreme heat can quickly overwhelm the human body.\n\n#2 – Antarctica\n\nIn the coldest parts of Antarctica, temperatures can fall below -70°C. Exposed skin can freeze within minutes, while powerful winds make the conditions even more dangerous.\n\n#1 – The Bottom of the Mariana Trench\n\nAlmost 11 kilometers beneath the ocean, the pressure is more than 1,000 times greater than at sea level. Without a specially designed vessel, a human would have absolutely no chance of surviving.\n\n“And somehow, all three of these places exist on the same planet you call home.”\n\nCreate a completely NEW visual scene every 2–4 seconds.\n\nEvery visual MUST directly match the narration at that exact moment.\n\nFor Death Valley, show realistic extreme desert heat, cracked ground, heat distortion and temperature visuals.\n\nFor Antarctica, show realistic Antarctic landscapes, extreme snowstorms, ice and dangerous freezing conditions.\n\nFor the Mariana Trench, show a descent from the ocean surface into increasingly dark deep water, realistic deep-sea environments and crushing underwater pressure.\n\nDo NOT repeat the same footage.\n\nDo NOT use unrelated people, offices, houses, cities or random stock footage.\n\nDo NOT show cartoon visuals.\n\nUse photorealistic cinematic footage.\n\nUse dramatic male narration.\n\nAdd suspenseful cinematic background music.\n\nUse large, modern, readable subtitles.\n\nHighlight important words and numbers.\n\nFast pacing with a strong visual change every 2–4 seconds.\n\n1080x1920.\n\nDesigned specifically for TikTok, YouTube Shorts and Instagram Reels.'
  const lg = PB.splitPastedBrief(LUGARES)
  checa('D1 8c0ed465: fica a fala do autor (aspas + títulos + 3 parágrafos), sai toda linha de direção — nenhuma linha que sobra é instrução', lg.mode === 'narration_kept' && lg.narration === LUGARES.split('\n\n').slice(1, 10).join('\n\n') && lg.brief.length === 17)
  // e90a2f9c (PT, o polvo): "Narração:" sozinho marca a fala (fica); "Termine mostrando… na tela…" sai.
  const POLVO = 'Narração:\n\n“Esse animal parece ter saído de um filme de ficção científica… mas ele existe de verdade. O polvo tem três corações e seu sangue é azulado. Dois corações bombeiam sangue para as brânquias, enquanto o terceiro manda sangue para o resto do corpo. E tem uma coisa ainda mais estranha: quando ele nada, o coração principal diminui sua atividade. Talvez seja por isso que eles prefiram rastejar pelo fundo do oceano. Você já sabia disso?”\n\nTermine mostrando o polvo e a pergunta “Você já sabia disso?” na tela por alguns segundos. Não adicione informações que não estejam no roteiro.'
  const pv = PB.splitPastedBrief(POLVO)
  checa('e90a2f9c: "Termine mostrando… na tela" sai; o rótulo "Narração:" sozinho NÃO é instrução (fica para o parser)', pv.mode === 'narration_kept' && pv.narration === POLVO.split('\n\n').slice(0, 2).join('\n\n') && J(pv.kinds) === J(['imperative']))
  // Cada forma de sobra, isolada (um mutante por regra) — e as falas vizinhas que NÃO podem sair.
  const SOBRAS = [
    'Conte a história aumentando progressivamente as consequências.', // verbo de direção + história
    'Primeiro a Lua desaparece; depois mostre o efeito sobre as marés e a história muda.', // verbo de editor depois de ";"
    'O resultado final deve parecer profissional e viral.', // obrigação do resultado
    'Close-up of a digital clock showing 2:13 AM.', // plano de câmera
    'For Antarctica, show realistic Antarctic landscapes, extreme snowstorms, ice and dangerous freezing conditions.', // "Para X, mostre…"
    'Do NOT repeat the same footage.', // negação + produção
    '1080x1920.', // ficha técnica
    'Designed specifically for TikTok, YouTube Shorts and Instagram Reels.', // densidade de produção
    'Keep the horror suspenseful rather than showing graphic violence or gore. Do not reveal the entity too early. Keep the staircase and house visually consistent. Make the final whisper feel extremely close and unexpected.', // cadeia de ordens (801d0adf)
  ]
  checa('sobra de instrução: as 9 formas (direção+história, ";"+verbo, obrigação do resultado, câmera, "Para X, mostre", negação+produção, ficha, densidade, cadeia de ordens) são reconhecidas', SOBRAS.every((l) => PB.isResidualInstruction(l)))
  const FALAS = [
    'Death Valley is one of the hottest places on Earth. Temperatures can rise above 50°C. Without water or protection, extreme heat can quickly overwhelm the human body.',
    'For the first few nights, nothing happened.',
    'Con cada golpe, el fieltro de la pelota se desgasta y cambia cómo se mueve por el aire y cómo bota.',
    'Por eso, en los torneos profesionales, las pelotas se cambian siguiendo una regla: después de los primeros siete juegos y, normalmente, cada nueve juegos más.',
    '¡No es por capricho!',
    'Then another message appears:',
    'Here is the trick: start before you are ready.',
    '“Daniel... please come upstairs.”',
    'Narração:',
    '“Nobody watches this video on YouTube anymore.”',
    'The Moon holds the tides in place. Without it, the oceans would slowly settle into new shapes. Nights would turn pitch black for weeks at a time. Animals that hunt by moonlight would lose their clock. Close-up of a wolf in the dark would never mean the same again.',
  ]
  checa('as falas vizinhas NÃO são sobra (narração com "For…,", ":" + verbo sem história, "¡No…", aspas, rótulo de fala sozinho, parágrafo longo com UMA frase de câmera)', FALAS.every((l) => !PB.isResidualInstruction(l)))
  const TITULO_FALA = 'Title: The Rescue Ship\nThe video footage from the rescue ship still exists today, and almost nobody has ever watched it.\nHashtags: #titanic #history'
  checa('texto só com rótulos (Title:/Hashtags: do ChatGPT) não tem a sobra examinada: a fala com "video footage" fica', PB.splitPastedBrief(TITULO_FALA).mode === 'narration_kept' && PB.splitPastedBrief(TITULO_FALA).narration === TITULO_FALA.split('\n')[1])
  const ROTEIRO_ASPAS = 'Use narração em inglês americano.\nColoque legendas grandes.\nNão use avatar.\n“' + Array.from({ length: 9 }, () => 'The Moon holds the tides, the nights and the clock of every animal on Earth.').join(' ') + '”'
  checa('briefing com o ROTEIRO inteiro entre aspas (≥ 80 palavras) → a fala entre aspas é narrada como está (só o gancho curto vira "a IA escreve")', PB.splitPastedBrief(ROTEIRO_ASPAS).mode === 'narration_kept' && PB.splitPastedBrief(ROTEIRO_ASPAS).narration === ROTEIRO_ASPAS.split('\n')[3])
  // D2 — roteiro de UM parágrafo (os exemplos do revisor, PT/ES/EN): nada muda, a fala é o texto inteiro.
  const PARAGRAFOS = [
    'Este vídeo vai mudar a forma como você enxerga o dinheiro. A maioria das pessoas trabalha a vida inteira e nunca fica rica. O motivo é simples: elas gastam primeiro e investem o que sobra. Os ricos fazem o contrário. Eles pagam a si mesmos primeiro, investem pelo menos dez por cento de tudo que ganham e só depois gastam. Em dez anos, essa única decisão separa quem vive de salário de quem vive de renda. Comece hoje, mesmo com pouco. Você não precisa ganhar mais para ficar rico, precisa guardar antes de gastar.',
    'Evite estes três erros com dinheiro. Em poucos segundos, seu salário desaparece e você nem percebe para onde ele foi. O primeiro erro é gastar antes de investir. O segundo é parcelar tudo no cartão, pagando juros que dobram o preço das coisas. O terceiro é não ter reserva de emergência, e qualquer imprevisto vira dívida. Quem corrige esses três erros sai do vermelho em poucos meses e começa a construir patrimônio de verdade.',
    'Change your life in 30 seconds a day. Most people wake up, grab their phone and lose the first hour of their morning to other people’s problems. The top one percent do the opposite: they drink water, move their body and write down the one thing that matters today. Try it for a week and watch what happens to your focus.',
    'Este video va a cambiar tu forma de ver el dinero. La mayoría de la gente trabaja toda su vida y nunca se hace rica, porque gasta primero y ahorra lo que sobra. Los ricos hacen lo contrario: se pagan a sí mismos primero, invierten al menos el diez por ciento y solo después gastan.',
    'Este vídeo vai mudar a forma como você vê o dinheiro. A maioria das pessoas trabalha a vida inteira e nunca fica rica. O motivo é simples: elas gastam antes de investir.',
    'Evite estes 3 erros com dinheiro. Em poucos segundos, seu salário desaparece. O primeiro erro é gastar antes de investir, e quase todo mundo faz isso.',
    'Start every video with a hook. Use captions, because 85% of people watch on mute. Show your face in the first 3 seconds. Post at the same time every day.',
    'Avoid the camera at all costs, the spy said. For twenty years, no one ever saw his face in a single image.',
  ]
  checa('D2: roteiro de UM parágrafo (PT/ES/EN: "Este vídeo vai…", "Evite… Em poucos segundos…", "Change your life in 30 seconds…", "Este video va a…", "Start every video with a hook…") → nada muda, narrado palavra por palavra', PARAGRAFOS.every((t) => { const r = PB.splitPastedBrief(t); return r.mode === 'none' && r.narration === t }))
  checa('D2: parágrafo de fala (várias frases, > 40 palavras) nunca é classificado inteiro; a 1ª frase decide o resto', PB.classifyPastedLine(PARAGRAFOS[1]) === null && PB.classifyPastedLine(PARAGRAFOS[2]) === null && PB.PASTED_BRIEF_PROSE_LINE_WORDS === 40)
  checa('D2: o substantivo de produção só vale na 1ª frase ("…nenhum vídeo te conta isso" na 2ª não faz o imperativo virar forte)', PB.classifyPastedLine('Evite estes 3 erros com dinheiro. Em pouco tempo, seu salário some, e nenhum vídeo te conta isso.') === 'imperative_weak')
  checa('D2: "segundos" solto é narração ("in 30 seconds a day"); como especificação ("a cada 2–3 segundos", "35 a 45 segundos") é produção', PB.classifyPastedLine('Change your life in 30 seconds a day.') === 'imperative_weak' && PB.classifyPastedLine('Troque o visual a cada 2–3 segundos.') === 'imperative' && PB.classifyPastedLine('Faça algo de 35 a 45 segundos.') === 'imperative')
  checa('D2: "Este vídeo vai…"/"Este video va a…" é abertura de narração; "O vídeo deve…" continua instrução', PB.classifyPastedLine('Este vídeo vai mudar a forma como você enxerga o dinheiro.') === null && PB.classifyPastedLine('Este video va a cambiar tu forma de ver el dinero.') === null && PB.classifyPastedLine('O vídeo deve parecer profissional.') === 'about_film')
  checa('D2: UMA linha forte sozinha nunca troca para "a IA estrutura" ("Create a 1-minute video of…" sozinho → nada muda; a v1 dava brief_only)', PB.splitPastedBrief('Create a 1-minute video of the nursery rhyme "The Little Rocket"').mode === 'none' && PB.splitPastedBrief('Estilo visual: noir.\nA Lua sumiu.').mode === 'none')
  // ── REVISÃO 2 (28/09, FIX-REVISAO-2 — KINEO1-BRIEF-PORTAO-2026-09-28): imperativo SOZINHO nunca prova briefing ──
  // Os casos do revisor pelo bloco REAL da rota (roteiro de dicas para criador, UMA dica por linha, "Use my script as
  // is"): a peça de e750656c cortava (a) 60 s, 201 palavras → 5 dicas fora, 122 palavras, o filme descia a 35 s e dava UMA
  // dica; (b) 7 regras → 'brief_only' → a IA reescrevia o roteiro; (c) 116 → 63 palavras → 422 narration_too_short. E o
  // fecho de narração "This video must be shared…" saía como about_film. Todos ficam PALAVRA POR PALAVRA.
  const sinal = (t) => (typeof PB.briefSignal === 'function' ? PB.briefSignal(t) : 'sem_briefSignal')
  const DICAS_60 = [
    'Two years ago I had eleven followers and a phone with a cracked screen.',
    'Today my videos reach millions of people every single week, and nothing about my gear has changed.',
    'What changed was a short list of habits I picked up from the creators who were already winning.',
    'Here they are, in the order I learned them.',
    'Start every video with a hook. The first two seconds decide whether anyone stays.',
    'Use captions on every clip. Most people scroll with the sound off, on the bus or in bed.',
    'Change the scene every three seconds. A still frame is the fastest way to lose a viewer.',
    'Add trending music at low volume. The algorithm notices the sound before it notices you.',
    'Show your face in the first three seconds. People follow people, not logos or landscapes.',
    'Cut every pause and every breath. Silence feels twice as long on a phone.',
    'None of this costs money, and none of it needs a new camera or a studio.',
    'It only needs you to post, look at what worked, and do a little more of that tomorrow.',
    'Give it thirty days and then come back and tell me what happened to your numbers.',
  ].join('\n')
  const DICAS_REGRAS = [
    'Seven rules the biggest creators never break.',
    'Start every video with a hook. The first second decides if anyone stays to watch the rest.',
    'Use captions on every clip. Most people scroll with the sound off, on the bus or in bed.',
    'Change the scene every three seconds. A frozen frame is the fastest way to lose a viewer.',
    'Add music at low volume. The right sound makes a boring clip feel like a movie trailer.',
    'Show your face in the first three seconds. People follow people, not logos or empty landscapes.',
    'Avoid long intros on TikTok. Nobody waits for your logo animation to finish before they swipe.',
    'Create videos every single day. Consistency beats talent, and the algorithm rewards people who show up.',
  ].join('\n')
  const DICAS_LINHAS = [
    'Want more views on TikTok? Most creators get this completely wrong, and it quietly kills their reach.',
    'Start every video with a hook in the first two seconds.',
    'Use captions on every clip, because most people watch on mute.',
    'Change the scene every three seconds so the eye never gets bored.',
    'Add trending music at low volume under your voice.',
    'Show your face early, because people follow people, not logos.',
    'Post at the same time every day, so the algorithm learns when to push you.',
    'Reply to every comment in the first hour, because early replies tell the app your post is worth showing.',
    'Do this for thirty days and watch what happens to your views.',
  ].join('\n')
  const D2_EM_LINHAS = 'Start every video with a hook.\nUse captions, because 85% of people watch on mute.\nShow your face in the first 3 seconds.\nPost at the same time every day.'
  const DICAS_PT = 'Sete hábitos que mudaram o meu canal.\nComece todo vídeo com um gancho forte nos primeiros 2 segundos.\nUse legendas em todos os clipes, porque quase todo mundo assiste sem som.\nTroque de cena a cada 3 segundos para o olho não cansar.\nAdicione música em volume baixo por baixo da sua voz.\nMostre o seu rosto logo no começo, porque gente segue gente.\nPoste sempre no mesmo horário, para o algoritmo aprender quando te empurrar.\nFaça isso por trinta dias e depois me conte o que aconteceu com as suas visualizações.'
  const DICAS_ES = 'Cinco reglas que usan los creadores que más crecen.\nEmpieza cada video con un gancho en los primeros 2 segundos.\nUsa subtítulos en todos tus videos, porque casi nadie los ve con sonido.\nCambia de escena cada 3 segundos para que nadie se aburra.\nAñade música suave debajo de tu voz.\nEvita las introducciones largas en TikTok.\nHazlo durante treinta días y cuéntame qué pasó con tus vistas.'
  const LOTERIA = 'In 1992 a retired teacher from Ohio bought the same lottery numbers every week for thirty years.\nHer family laughed at her every single Sunday, and she never missed a draw.\nThe week she finally won, she gave almost everything away to the school where she had taught.\nThis video must be shared with everyone who says luck does not exist.'
  const TODO_VIDEO = 'Every video should teach your viewer one thing they did not know.\nStart every video with a hook in the first 2 seconds.\nUse captions on every clip, because most people watch on mute.'
  const CRIADOR = [DICAS_60, DICAS_REGRAS, DICAS_LINHAS, D2_EM_LINHAS, DICAS_PT, DICAS_ES, LOTERIA, TODO_VIDEO]
  checa('REVISÃO 2: dicas para criador, UMA por linha (os 3 do revisor, a D2 em linhas, PT, ES), "Every video should…" e o fecho "This video must be shared…" → nada muda, narrado palavra por palavra', CRIADOR.every((t) => { const r = PB.splitPastedBrief(t); return r.mode === 'none' && r.narration === t }))
  checa('REVISÃO 2: nenhum desses textos tem sinal de briefing (briefSignal null) — e o resultado diz o sinal (null)', CRIADOR.every((t) => sinal(t) === null && PB.splitPastedBrief(t).signal === null))
  const TITULO_DICAS = 'Title: 5 Rules Every Creator Follows\nStart every video with a hook in the first 2 seconds.\nUse captions on every clip, because most people watch on mute.\nShow your face early, because people follow people.\nHashtags: #creator #tiktok'
  const td = PB.splitPastedBrief(TITULO_DICAS)
  checa('REVISÃO 2: Title:/Hashtags: em volta das dicas → só os rótulos (de metadado) saem; as dicas, fortes e fracas, ficam na ordem (a peça de e750656c dava brief_only e a IA reescrevia)', td.mode === 'narration_kept' && td.narration === TITULO_DICAS.split('\n').slice(1, -1).join('\n') && J(td.kinds) === J(['label', 'label']) && td.signal === null)
  checa('REVISÃO 2: os briefings REAIS (2ff93c15, b3b3e101, 17dd0c7a, 8b23d27a, 8c0ed465, e90a2f9c) têm sinal — cada um pelo seu', sinal(LUA) === 'create_request' && sinal(GEMEOS) === 'production_label' && sinal(LUA17) === 'create_request' && sinal(TENIS) === 'about_film' && sinal(LUGARES) === 'create_request' && sinal(POLVO) === 'editor_line' && sinal(ROTEIRO_ASPAS) === 'editor_line')
  checa('REVISÃO 2: com sinal, a regra de antes vale inteira (mesmos modos, mesmas linhas)', PB.splitPastedBrief(LUA).mode === 'brief_only' && PB.splitPastedBrief(LUA17).mode === 'brief_only' && PB.splitPastedBrief(TENIS).brief.length === 4 && PB.splitPastedBrief(LUGARES).brief.length === 17 && PB.splitPastedBrief(GEMEOS).brief.length === 4 && PB.splitPastedBrief(LUA).signal === 'create_request')
  checa('REVISÃO 2: cada sinal isolado — e a dica vizinha que NÃO é sinal', sinal('Estilo visual: noir, chuva, neon.') === 'production_label' && sinal('Title: The Moon\nHashtags: #moon') === null && sinal('Caption: 7 rules #fyp') === null &&
    sinal('O vídeo deve parecer profissional.') === 'about_film' && sinal('The narrator should speak slowly, like a documentary.') === 'about_film' && sinal('The final result must look like real footage.') === 'about_film' &&
    sinal('Every video should teach one thing.') === null && sinal('This video must be shared with everyone who says luck does not exist.') === null && sinal('Este vídeo precisa ser visto por todo mundo que trabalha com vendas.') === null && sinal('The music should never be louder than your voice.') === null &&
    sinal('Create a funny 60–90 second 3D story about a pigeon.') === 'create_request' && sinal('Create this YouTube Short entirely in Arabic.') === 'create_request' && sinal('Crea un vídeo vertical sobre el tenis.') === 'create_request' &&
    sinal('Create videos every single day.') === null && sinal('Create a video about the Moon.') === null && sinal('Crie um gancho de 3 segundos em cada vídeo.') === null &&
    sinal('Use narração natural em inglês americano.') === 'editor_line' && sinal('Não use avatar.') === 'editor_line' && sinal('Use the provided image as the only visual source.') === 'editor_line' &&
    sinal('Add subtitles to every video.') === null && sinal('Use captions on every clip.') === null && sinal('Add trending music at low volume.') === null)
  checa('REVISÃO 2: o evento distingue a regra nova (versão v2 do detector)', PB.PASTED_BRIEF_VERSION === 'kineo1_brief_colado_v2')
}
{
  checa('buscas com vírgula: só os pedaços que a fala menciona; sem vírgula passa; tudo inventado → nada', J(Q.splitCommaQueries(['space needle, brainstorming, skyline', 'eggs toast plate'], 'Bezos preferred eggs and toast.')) === J(['eggs toast plate']) && J(Q.splitCommaQueries(['woman removing ring, praça do comércio, couple laughing'], 'She slowly took off her wedding ring.')) === J(['woman removing ring']))
  checa('ordem: as do plano novo na frente, as de hoje sem plano de câmera depois, sem repetir (caixa baixa), a já usada vai para o fim', J(Q.planFirstQueries(['cone snail reef', 'cone snail shell'], ['close-up macro Cone Snail Shell', 'venomous sea snail coral'], new Set(['cone snail reef']))) === J(['cone snail shell', 'venomous sea snail coral', 'cone snail reef']))
  checa('plano nulo (falha aberta) = as buscas de hoje, só sem o plano de câmera', J(Q.planFirstQueries(null, ['close-up macro wolf tracks snow', 'wolf in forest'])) === J(['wolf tracks snow', 'wolf in forest']))
  checa('tudo já usado: a ordem fica (a cena nunca fica sem busca)', J(Q.planFirstQueries(['a b'], [], new Set(['a b']))) === J(['a b']))
}
{
  const c = await pool(null, ['cone snail on coral'], { maxClips: 1, v2: true })
  checa('relatório do pool traz os candidatos (tags, nota, busca) — a evidência mostra o que a cena podia ter tido', Array.isArray(c.rel?.candidates) && c.rel.candidates.length >= 1 && c.rel.candidates[0].tags.startsWith('cone snail') && typeof c.rel.candidates[0].score === 'number' && c.rel.candidates[0].query === 'cone snail on coral')
}
{
  // Painel: a fatia REAL de lib/admin/fastCoherence.ts (aiClipPromptByGen … applyAiClips), executada com eventos falsos.
  const adm = rd('lib/admin/fastCoherence.ts')
  const ini = adm.indexOf('  const aiClipPromptByGen = new Map<string, Map<number, string>>()')
  const fim = adm.indexOf('  const planByGen = new Map<string, EventRow>()')
  const fatiaAdm = ini > 0 && fim > ini ? adm.slice(ini, fim) : null
  checa('fatia do painel encontrada', !!fatiaAdm)
  if (fatiaAdm) {
    const js = ts.transpileModule(`type EventRow = any\ntype FastSceneEvidence = any\nexport function montar(aiClipsPending: any, aiClipsResult: any) {\n${fatiaAdm}\n  return applyAiClips\n}`, { compilerOptions: { module: 1, target: 9 } }).outputText
    const ex = {}
    vm.runInNewContext(js, { exports: ex, Map, Set, Array, Number })
    const pend = { data: [{ session_id: 'g', metadata: { clips: [{ scene: 1, prompt: 'HOOK', at_index: 0 }, { scene: 2, prompt: 'P2', at_index: 3 }, { scene: 3, prompt: 'P3', at_index: 5, replace_index: 5 }] } }] }
    const res = { data: [{ session_id: 'g', metadata: { scenes: [{ scene: 1, ok: true }, { scene: 2, ok: true }, { scene: 3, ok: true }] } }] }
    const cenas = [1, 2, 3].map((n) => ({ scene: n, voiceover: 'v', query: 'q', from: 0, sources: n === 3 ? ['aiStill', 'pixabay'] : ['pixabay', 'pixabay'], tags: ['t1', 't2'] }))
    const out = ex.montar(pend, res)('g', cenas)
    checa('painel no modo TROCA: a cena 3 fica só com o gerado (still + aiVideo), sem as tags do stock que saiu; a inserção (cenas 1-2) segue como antes', J(out[2].sources) === J(['aiStill', 'aiVideo']) && out[2].tags.length === 0 && out[2].query === 'AI clip: P3' && J(out[1].sources) === J(['aiVideo', 'pixabay', 'pixabay']) && out[1].tags.length === 2)
    const semTroca = ex.montar({ data: [{ session_id: 'g', metadata: { clips: [{ scene: 3, prompt: 'P3', at_index: 5 }] } }] }, res)('g', cenas)
    checa('painel sem replace_index = o de antes (aiVideo na frente, stock e tags ficam)', J(semTroca[2].sources) === J(['aiVideo', 'aiStill', 'pixabay']) && semTroca[2].tags.length === 2)
  }
  checa('compose: o custo do resultado soma o preço de CADA clipe (4-12 s) e conta as trocas — com os clipes de 5 s de hoje, o mesmo número', rd('app/api/compose/route.ts').includes("est_usd: Math.round(pending.reduce((soma, p) => soma + (typeof p.usd === 'number' ? p.usd : SEEDANCE_720P_5S_USD), 0) * 100) / 100, replaced: ready.filter((r) => !!r.url && typeof r.replace_index === 'number').length }"))
}

console.log(`\n${ok} ok · ${falhas.length} falhas`)
if (falhas.length) { for (const f of falhas) console.log('  ✗ ' + f); process.exit(1) }
