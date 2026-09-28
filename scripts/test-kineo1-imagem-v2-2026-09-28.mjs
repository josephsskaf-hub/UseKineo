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
//   (c) inerte: a rota travada não liga nada (nenhum `v2: true` em app/api/generate-video-fast/route.ts);
//   (d) o replay não escreve (dryRun, zero insert/update/delete) e roda ponta a ponta sem rede.
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
  checa('35 s / 12 clipes: índice 5 nunca reentra → troca com 5 s (US$ 0,13); índice 1 pode reentrar → inserção de hoje (5 s cobririam com laço); pagando, 11 s cobrem a reentrada', meio.mode === 'replace' && meio.seconds === 5 && meio.usd === 0.13 && meio.reentries === 0 && reentra.mode === 'insert' && reentra.reentries === 1 && pago.mode === 'replace' && pago.seconds === 11 && pago.sourceSeconds <= 11)
}
const clipsSrc = rd('lib/fastAiClips.ts')
checa('o pedido padrão à fal é o de sempre (720p, 5 s, SEM áudio); seconds só troca a duração', clipsSrc.includes("resolution: '720p', duration: '5', generate_audio: false, ...(seconds !== undefined ? { duration: seedanceDurationParam(seconds) } : {})"))
if (temBase) {
  const C0 = mundo({ stubs: { '@fal-ai/client': falStub, './fastAiHook': { persistHookClip: async (u) => u } }, env: { FAL_KEY: 'k' }, fontes: { 'lib/fastAiClips.ts': baseSrc.clips } }).carregar('lib/fastAiClips.ts')
  const casos = [[{ scene: 1, at_index: 0, url: 'H', ms: 1 }], [{ scene: 3, at_index: 2, url: 'A', ms: 1 }, { scene: 1, at_index: 0, url: 'H', ms: 1 }], [{ scene: 9, at_index: 99, url: 'Z', ms: 0 }], []]
  checa(`encaixe e leitura do evento sem replace_index = o do ${BASE}`, casos.every((r) => J(C.spliceAiClips(base5, r)) === J(C0.spliceAiClips(base5, r))) && J(C.parsePendingAiClips({ clips: [{ request_id: 'a', scene: 1, at_index: 0, prompt: 'p', usd: 0.13 }] })) === J(C0.parsePendingAiClips({ clips: [{ request_id: 'a', scene: 1, at_index: 0, prompt: 'p', usd: 0.13 }] })))
} else checa('comparação com a base pulada', true)

console.log('== (c) inerte: a rota travada não liga nada ==')
const rota = rd('app/api/generate-video-fast/route.ts')
checa('app/api/generate-video-fast/route.ts não passa v2/dryRun/replace_index (a parte B é o commit [TRAVA 8.2])', !/\bv2: true\b/.test(rota) && !/\bdryRun: true\b/.test(rota) && !rota.includes('replace_index') && !rota.includes('planSceneQueries') && !rota.includes('stripCameraPhrases'))
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

console.log(`\n${ok} ok · ${falhas.length} falhas`)
if (falhas.length) { for (const f of falhas) console.log('  ✗ ' + f); process.exit(1) }
