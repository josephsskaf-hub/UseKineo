// KINEO-DESENHO-SOM-2110 — guardião de "o som do desenho infantil" (fundador 21/10, nota 9,5 aos curtas do Ollie: "o que me incomodou foi a
// trilha, tem que ser diferente; o resto está perfeito"; e a pesquisa docs/MERCADO-DESENHO-INFANTIL-OPCOES-2026-10-21.md: o padrão é um
// narrador contador de histórias caloroso, não voz de criança). Só o filme com kids_cartoon muda; filme comum = byte a byte o de antes.
//
// O QUE ELE PROVA (executando o código real de lib/narration/niche-mapping.ts, lib/vozDoFilmeCurto.ts, lib/musicDirection.ts,
// lib/lyriaMusic.ts e lib/kidsCartoon/kidsCartoon.ts num vm, e lendo as rotas):
//   S1 VOZ: com o vertical infantil, a persona é a contadora calorosa (emotional-storyteller, nova) em EN/PT/ES, para qualquer história
//      (inclusive "learns…", que o palpite por palavra mandava ao documentário); o 15 s fica na régua (fator 1, 2,47 ≤ 2,5 pal/s);
//      SEM o vertical infantil, a persona é exatamente a da base (d37a272bf) em 12 roteiros × 6 verticais × 3 línguas × 3 níveis;
//   S2 TRILHA: com o vertical infantil, a direção é 'kids' (prompt do Lyria com ukulele/glockenspiel/xilofone/piano, sem bateria, épico
//      ou tensão, instrumental); sem ele, a direção e o prompt são os da base para os mesmos roteiros;
//   S3 ROTA DO FILME: o vertical infantil é posto logo depois da recusa do desenho e ANTES da voz ser medida (vozCurta/classicPersona);
//      o claim leva kids_cartoon (personagem + legenda) e narration_voice também no 35 s; nada disso fora de desenhoInfantil.ativo;
//   S4 MONTAGEM: só o claim assinado decide (desenhoDoClaim; filme sem o campo = null, nada roda); sem legenda tira só as trilhas 5/7
//      (marca d'água 9 fica); a trilha (áudio da trilha 8) vai a 8%; tudo antes do envio ao Creatomate;
//   S5 LIB: kids_captions só viaja quando o botão está desligado; desenhoDoClaim recusa campo malformado; kidsClaimField;
//   S6 TELA: o botão "Captions on the video" (ligado por padrão) entra no corpo do filme; copy EN/PT/ES;
//   S7 o literal 'kids_story' de niche-mapping e musicDirection = KIDS_NARRATION_VERTICAL;
//   K  desfaz encadeado como camada mais nova (semDesenhoNota9_2110 chama este primeiro); diff da base só nos arquivos declarados;
//   M  mutantes: cada um APLICADO (provado por diferença) e VERMELHO.
import fs from 'node:fs'
import { semAvatarEstorno2010 } from './test-support/desfaz-avatar-estorno-2010.mjs' // KINEO-AVATAR-ESTORNO-2010 — reancorado na integração 21/10: as linhas do estorno/legenda bengali (camada mais nova) saem antes da conferência da marca
import path from 'node:path'
import vm from 'node:vm'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import {
  semDesenhoSom2110, desfazDesenhoSom2110, MARCA_DESENHO_SOM_2110 as MARCA, DESENHO_SOM_2110_BASE as BASE,
  DESENHO_SOM_2110_ARQUIVOS, DESENHO_SOM_2110_NOVOS, DESENHO_SOM_2110_REESCRITOS, TROCAS_DESENHO_SOM_2110,
} from './test-support/desfaz-desenho-som-2110.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const rd = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/\r\n/g, '\n')
const git = (...a) => { try { return execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 * 1024 * 1024 }) } catch { return '' } }
const base = (f) => { const s = git('show', `${BASE}:${f}`); return s ? s.replace(/\r\n/g, '\n') : null }
const ts = createRequire(path.join(ROOT, 'package.json'))('typescript')
const F = {
  niche: 'lib/narration/niche-mapping.ts',
  musica: 'lib/musicDirection.ts',
  lyria: 'lib/lyriaMusic.ts',
  voz: 'lib/vozDoFilmeCurto.ts',
  lib: 'lib/kidsCartoon/kidsCartoon.ts',
  tpl: 'components/kidsCartoon/KidsCartoonTemplate.tsx',
  rota: 'app/api/generate-video-cinematic/route.ts',
  compose: 'app/api/compose/route.ts',
}
let falhas = 0, oks = 0
const ok = (c, m) => { if (c) { oks++; console.log(`  ok   ${m}`) } else { falhas++; console.log(`  FALHA ${m}`) } }
const tenta = (fn) => { try { return fn() } catch (e) { return [`lançou: ${e.message}`] } }

/** Carrega um módulo TS do repo num vm (imports relativos e @/ resolvidos; `over` troca o texto de um arquivo; `doBase` lê da base). */
function carregador(over = {}, doBase = false) {
  const cache = new Map()
  const fonte = (f) => over[f] ?? (doBase ? (base(f) ?? rd(f)) : rd(f))
  function load(file) {
    if (cache.has(file)) return cache.get(file).exports
    const mod = { exports: {} }
    cache.set(file, mod)
    const req = (id) => {
      const b = id.startsWith('@/') ? id.slice(2) : id.startsWith('.') ? path.posix.join(path.posix.dirname(file), id) : null
      if (b === null) return createRequire(path.join(ROOT, 'package.json'))(id)
      const t = [b, `${b}.ts`, `${b}.tsx`, `${b}/index.ts`].find((x) => fs.existsSync(path.join(ROOT, x)) && fs.statSync(path.join(ROOT, x)).isFile())
      if (!t) throw new Error(`dep ${id} de ${file}`)
      return load(t)
    }
    const js = ts.transpileModule(fonte(file), { compilerOptions: { module: 1, target: 9, esModuleInterop: true } }).outputText
    vm.runInNewContext(js, { module: mod, exports: mod.exports, require: req, console: { log() {}, warn() {}, error() {} }, process: { env: {} }, URLSearchParams, URL, Intl, setTimeout, clearTimeout, fetch: async () => { throw new Error('sem rede') } })
    return mod.exports
  }
  return load
}

const HISTORIAS = [
  'Meet Ollie! Today he learns to share his red ball with a new friend at the park. Sharing makes everyone smile. Can you share today?',
  'Este é o Pip! Ele aprende por que escovamos os dentes antes de dormir. Que dentes brilhantes! E você, já escovou os seus?',
  'Esta es Bibi. Descubre que un día de lluvia puede ser divertido. ¡Salta en los charcos! ¿Te gusta la lluvia?',
]
const ROTEIROS = [
  ...HISTORIAS,
  'The unsolved mystery of the ship that vanished in 1872 still haunts sailors.',
  'Billionaire habits: how Elon invests his money every morning.',
  'Ancient Rome built roads that still exist today. Did you know?',
  'Artificial intelligence will change software forever.',
  'The country with the strangest capital city in the world.',
  'A funeral in the rain: the day the village mourned.',
  'Peaceful forest sounds and a calm lake at dawn.',
  'War, soldiers and the battle that changed everything.',
  'Fun fact: honey never spoils.',
]
const VERTICAIS = [undefined, 'learning', 'mystery', 'finance', 'history', 'kids']

// ─── S1 voz ────────────────────────────────────────────────────────────────────
function s1(over = {}) {
  const p = []
  const L = carregador(over)
  const N = L(F.niche), V = L(F.voz)
  for (const h of HISTORIAS) for (const lang of ['en', 'pt', 'es']) for (const tier of ['free', 'premium', 'cinematic']) {
    const per = N.selectPersonaForScript(h, 'kids_story', tier, lang)
    if (per.id !== 'emotional-storyteller' || per.voice !== 'nova') p.push(`kids ${lang}/${tier}: ${per.id}/${per.voice}`)
  }
  const curta = V.vozDoFilmeCurto({ engine: 'seedance', seconds: 15, narration: HISTORIAS[0], vertical: 'kids_story', language: 'en' })
  if (!curta || curta.id !== 'emotional-storyteller' || curta.speedFactor !== 1 || curta.vertical !== 'kids_story') p.push(`15 s: ${JSON.stringify(curta)}`)
  const NB = carregador({}, true)(F.niche)
  for (const r of ROTEIROS) for (const v of VERTICAIS) for (const lang of ['en', 'pt', 'es']) for (const tier of ['free', 'premium', 'cinematic']) {
    const a = N.selectPersonaForScript(r, v, tier, lang), b = NB.selectPersonaForScript(r, v, tier, lang)
    if (a.id !== b.id || a.voice !== b.voice) { p.push(`filme comum mudou: ${v}/${lang}/${tier} ${b.id}→${a.id}`); break }
  }
  return p
}
// ─── S2 trilha ─────────────────────────────────────────────────────────────────
function s2(over = {}) {
  const p = []
  const L = carregador(over)
  const D = L(F.musica), Ly = L(F.lyria)
  for (const h of HISTORIAS) {
    const d = D.resolveMusicDirection({ script: h, vertical: 'kids_story' })
    if (!(d.enabled && d.emotion === 'kids' && d.mood === 'nature' && d.curatedFallback === true)) p.push(`direção kids: ${JSON.stringify(d)}`)
    const pr = Ly.lyriaPromptFor(d.mood, d)
    for (const t of ['ukulele', 'glockenspiel', 'xylophone', 'soft piano', 'No drums', 'no epic orchestra', 'no tension', 'Instrumental only']) if (!pr.includes(t)) p.push(`prompt sem "${t}"`)
  }
  const LB = carregador({}, true)
  const DB = LB(F.musica), LyB = LB(F.lyria)
  for (const r of ROTEIROS) for (const v of VERTICAIS) {
    const a = D.resolveMusicDirection({ script: r, vertical: v }), b = DB.resolveMusicDirection({ script: r, vertical: v })
    if (JSON.stringify(a) !== JSON.stringify(b) || Ly.lyriaPromptFor(a.mood, a) !== LyB.lyriaPromptFor(b.mood, b)) { p.push(`filme comum mudou de trilha: ${v} "${r.slice(0, 30)}"`); break }
  }
  return p
}
// ─── S3 rota do filme ──────────────────────────────────────────────────────────
function s3(rota = rd(F.rota)) {
  const p = []
  const iRecusa = rota.search(/\n    if \(desenhoInfantil\.recusa\) \{/)
  const iVert = rota.indexOf('    if (desenhoInfantil.ativo) body.vertical = KIDS_NARRATION_VERTICAL')
  const iVoz = rota.indexOf('    const vozCurta = (() => {')
  const iPersona = rota.indexOf('    const classicPersona = hollywoodPath ? null')
  if (!(iRecusa > 0 && iVert > iRecusa && iVoz > iVert && iPersona > iVoz)) p.push('o vertical infantil não entra entre a recusa do desenho e a medida da voz')
  if (rota.slice(iRecusa + 1, iVert).split('\n').length !== 2) p.push('o vertical infantil não está logo depois da recusa')
  const iNv = rota.indexOf('    if (seedanceShortFilm && vozCurta) response.narration_voice = campoDaVozAssinada(vozCurta)\n')
  const k1 = rota.indexOf("    if (desenhoInfantil.ativo) response.kids_cartoon = kidsClaimField({ character: desenhoInfantil.personagem.id, captions: (body as { kids_captions?: unknown }).kids_captions !== false })")
  const k2 = rota.indexOf("    if (desenhoInfantil.ativo && !response.narration_voice) { const vozInfantil = vozQueOComposeEscolhe({ narration: parsedScript.narration || prompt, vertical: KIDS_NARRATION_VERTICAL, tier: 'cinematic', language: narrationLanguage.language }); response.narration_voice = { vertical: KIDS_NARRATION_VERTICAL, speed_factor: 1, voice: vozInfantil.voice, speed: vozInfantil.defaultSpeed, persona_id: vozInfantil.id } }")
  if (!(iNv > 0 && k1 > iNv && k2 > k1)) p.push('o claim do desenho (kids_cartoon / narration_voice do 35 s) fora do lugar')
  const marcadas = rota.split('\n').filter((l) => l.includes(MARCA))
  if (marcadas.length !== 5 || !marcadas.slice(2).every((l) => /^    if \(desenhoInfantil\.ativo/.test(l))) p.push('linha nova da rota fora de desenhoInfantil.ativo')
  return p
}
// ─── S4 montagem ───────────────────────────────────────────────────────────────
function s4(compose = rd(F.compose), libSrc = rd(F.lib)) {
  const p = []
  const iSem = compose.indexOf('    if (semLegenda.tirarLegenda || semLegenda.tirarGancho) { const sl = tirarLegendaEGancho(source,')
  const iDes = compose.indexOf('    const desenhoAssinado = desenhoDoClaim(cinematicBirthClaim?.response)')
  const iLeg = compose.indexOf('    if (desenhoAssinado && !desenhoAssinado.captions && !semLegenda.tirarLegenda) { const sl = tirarLegendaEGancho(source, { legenda: true, gancho: false }); source = sl.source;')
  const iMus = compose.indexOf('    if (desenhoAssinado) { const q = kidsMusicQuieter(source); source = q.source;')
  const iEnvio = compose.indexOf('    // Step 5 — Submit to Creatomate once per authenticated generation.')
  if (!(iSem > 0 && iDes > iSem && iLeg > iDes && iMus > iLeg && iEnvio > iMus)) p.push('legenda/trilha do desenho fora do lugar (depois do sem-legenda, antes do Creatomate)')
  if ((compose.match(/desenhoAssinado/g) || []).length !== 4) p.push('desenhoAssinado usado fora das 3 linhas')
  const L = carregador({ [F.lib]: libSrc })(F.lib)
  if (L.desenhoDoClaim({ duration: 35, narration_voice: { vertical: null } }) !== null || L.desenhoDoClaim(null) !== null) p.push('filme comum vira desenho')
  const src = { elements: [{ type: 'video', track: 2 }, { type: 'text', track: 5 }, { type: 'audio', track: 8, volume: '12%', source: 'm.mp3' }, { type: 'text', track: 9, text: 'usekineo.com/free' }, { type: 'audio', track: 1, volume: '100%' }] }
  const q = L.kidsMusicQuieter(src)
  const els = q.source.elements
  if (q.changed !== 1 || els[2].volume !== '8%' || els[4].volume !== '100%' || els[2].source !== 'm.mp3' || src.elements[2].volume !== '12%' || L.KIDS_MUSIC_VOLUME !== '8%') p.push(`trilha: ${JSON.stringify(els)}`)
  return p
}
// ─── S5 lib ────────────────────────────────────────────────────────────────────
function s5(libSrc = rd(F.lib)) {
  const p = []
  const L = carregador({ [F.lib]: libSrc })(F.lib)
  const req = { character: 'ollie', language: 'en', duration: 35 }
  const off = L.kidsCinematicPayload({ generationId: 'g12345678', script: 'x', request: req, captions: false })
  const on = L.kidsCinematicPayload({ generationId: 'g12345678', script: 'x', request: req, captions: true })
  const nada = L.kidsCinematicPayload({ generationId: 'g12345678', script: 'x', request: req })
  if (off.kids_captions !== false || 'kids_captions' in on || 'kids_captions' in nada) p.push('kids_captions fora do botão')
  if (JSON.stringify(L.kidsClaimField({ character: 'pip', captions: false })) !== '{"character":"pip","captions":false}') p.push('kidsClaimField')
  for (const ruim of [{ kids_cartoon: { character: 'zed', captions: true } }, { kids_cartoon: { character: 'pip' } }, { kids_cartoon: ['pip'] }, { kids_cartoon: 'pip' }]) if (L.desenhoDoClaim(ruim) !== null) p.push(`campo malformado aceito: ${JSON.stringify(ruim)}`)
  if (JSON.stringify(L.desenhoDoClaim({ kids_cartoon: { character: 'mia', captions: false } })) !== '{"character":"mia","captions":false}') p.push('desenhoDoClaim válido')
  return p
}
// ─── S6 tela ───────────────────────────────────────────────────────────────────
function s6(tpl = rd(F.tpl), libSrc = rd(F.lib)) {
  const p = []
  if (!tpl.includes('const [captions, setCaptions] = useState(true)')) p.push('legenda não nasce ligada')
  if (/className="kkc-badge"|KIDS_CARTOON_ENGINE_LABEL/.test(tpl) || /className="kug-badge"|KIDS_CARTOON_ENGINE_LABEL/.test(rd('components/kidsCartoon/KidsCartoonPages.tsx'))) p.push('pílula do motor na porta de entrada')
  if (!tpl.includes('kidsCinematicPayload({ generationId, script: texto, request: { character, language, duration }, captions })')) p.push('o botão não entra no corpo do filme')
  if (!tpl.includes('<input type="checkbox" checked={captions} onChange={(e) => setCaptions(e.target.checked)} />')) p.push('sem o botão na tela')
  const L = carregador({ [F.lib]: libSrc })(F.lib)
  for (const l of ['en', 'pt', 'es']) if (!L.KIDS_TEMPLATE_COPY[l].captionsToggle || !L.KIDS_TEMPLATE_COPY[l].captionsHint) p.push(`copy ${l}`)
  return p
}
// ─── S7 literal espelhado ──────────────────────────────────────────────────────
function s7() {
  const p = []
  const L = carregador()(F.lib)
  if (L.KIDS_NARRATION_VERTICAL !== 'kids_story' || L.KIDS_NARRATION_PERSONA !== 'emotional-storyteller') p.push('constantes')
  if (!rd(F.niche).includes(`if (vertical === '${L.KIDS_NARRATION_VERTICAL}') { const k = getPersona('${L.KIDS_NARRATION_PERSONA}')`)) p.push('niche-mapping fora do espelho')
  if (!rd(F.musica).includes(`if (input.vertical === '${L.KIDS_NARRATION_VERTICAL}') return`)) p.push('musicDirection fora do espelho')
  return p
}

console.log('S. o som do desenho infantil')
{ const p = tenta(() => s1()); ok(p.length === 0, `S1 voz contadora calorosa (nova) em EN/PT/ES e no 15 s dentro da régua; filme comum com a persona da base (${p.slice(0, 3).join('; ') || 'ok'})`) }
{ const p = tenta(() => s2()); ok(p.length === 0, `S2 trilha de programa infantil no desenho; filme comum com a direção e o prompt da base (${p.slice(0, 3).join('; ') || 'ok'})`) }
{ const p = tenta(() => s3()); ok(p.length === 0, `S3 rota: vertical infantil antes da voz; claim com kids_cartoon e voz do 35 s; só com desenhoInfantil.ativo (${p.join('; ') || 'ok'})`) }
{ const p = tenta(() => s4()); ok(p.length === 0, `S4 montagem: só o claim decide; sem legenda tira 5/7 (marca fica); trilha a 8%; antes do Creatomate (${p.join('; ') || 'ok'})`) }
{ const p = tenta(() => s5()); ok(p.length === 0, `S5 lib: kids_captions só com o botão desligado; claim validado (${p.join('; ') || 'ok'})`) }
{ const p = tenta(() => s6()); ok(p.length === 0, `S6 tela: botão "Captions on the video" ligado por padrão, no corpo do filme, EN/PT/ES; sem a pílula do motor na tela e nas páginas (${p.join('; ') || 'ok'})`) }
{ const p = tenta(() => s7()); ok(p.length === 0, `S7 'kids_story' de niche-mapping/musicDirection = KIDS_NARRATION_VERTICAL (${p.join('; ') || 'ok'})`) }

console.log('\nK. desfaz encadeado e diff da base')
{
  const difs = []
  for (const f of DESENHO_SOM_2110_ARQUIVOS) {
    const b = base(f)
    if (b === null) { difs.push(`${f}: fora da base`); continue }
    try { if (semDesenhoSom2110(rd(f), f) !== b) difs.push(f) } catch (e) { difs.push(`${f}: ${e.message}`) }
  }
  ok(difs.length === 0, `K1 ${DESENHO_SOM_2110_ARQUIVOS.length} arquivos tocados por linha, desfeitos, = base ${BASE} (${difs.join('; ') || 'ok'})`)
  ok(DESENHO_SOM_2110_NOVOS.every((f) => fs.existsSync(path.join(ROOT, f)) && base(f) === null), `K2 os ${DESENHO_SOM_2110_NOVOS.length} arquivos novos existem e não existiam na base`)
  ok(/export function semAdsNota92110\(texto, p\) \{\n  texto = semDesenhoSom2110\(texto, p\)/.test(rd('scripts/test-support/desfaz-ads-nota9-2110.mjs')) && /export function semDesenhoNota9_2110\(texto, p\) \{\n  texto = semAdsNota92110\(texto, p\)/.test(rd('scripts/test-support/desfaz-desenho-nota9-2110.mjs')), 'K3 encadeamento: semAdsNota92110 (chamada primeiro por semDesenhoNota9_2110, semHomeCardsClaros2010 e o resto da cadeia) tira esta camada PRIMEIRO')
  let lancou = false
  try { semDesenhoSom2110(rd(F.niche) + `\n// linha nova ${MARCA}`, F.niche) } catch { lancou = true }
  const trocasOk = Object.entries(TROCAS_DESENHO_SOM_2110).every(([f, t]) => DESENHO_SOM_2110_ARQUIVOS.includes(f) && t.every(([nova, velha]) => nova.includes(MARCA) && !velha.includes(MARCA)))
  ok(lancou && trocasOk && semDesenhoSom2110('sem marca', F.niche) === 'sem marca' && desfazDesenhoSom2110(F.niche, null) === null && !/KINEO-DESENHO-NOTA9|KINEO-BEBE|KINEO-HOME/.test(MARCA), 'K4 idempotente fora da lista / sem a marca / null; acréscimo a mais lança; trocas marcadas; marca sem a de camada antiga')
  const TOPO = git('log', '--format=%H', `--grep=${MARCA}`, '-1', 'HEAD').trim() || 'HEAD' // merge incluso (a base é a ponta da fila mesclada)
  const tocados = new Set([...git('diff', '--name-only', BASE, TOPO).trim().split('\n'), ...git('diff', '--name-only', 'HEAD').trim().split('\n'), ...git('ls-files', '--others', '--exclude-standard', 'scripts').trim().split('\n').filter((f) => f.includes('desenho-som'))].filter(Boolean))
  const permitidos = new Set([...DESENHO_SOM_2110_ARQUIVOS, ...DESENHO_SOM_2110_NOVOS, ...DESENHO_SOM_2110_REESCRITOS])
  const fora = [...tocados].filter((f) => !permitidos.has(f))
  const semMarca = DESENHO_SOM_2110_ARQUIVOS.filter((f) => { const b = new Set((base(f) ?? '').split('\n')); return !rd(f).split('\n').every((l) => b.has(l) || l.includes(MARCA) || l.includes('KINEO-META95-PERSONAGEM-AJUSTE-2010')) }) // reancorado KINEO-META95-PERSONAGEM-AJUSTE-2010 [TRAVA 8.2 — vai do fundador 19/10 "Vai pra meta do 95"] — as reâncoras dos consertos da folha (camada de depois, chamada primeiro por semDesenhoSom2110) levam a marca delas
  semMarca.splice(0, semMarca.length, ...semMarca.filter((f) => { const b = new Set((base(f) ?? '').split('\n')); return !semAvatarEstorno2010(rd(f), f).split('\n').every((l) => b.has(l) || l.includes(MARCA) || l.includes('KINEO-META95-' + 'PERSONAGEM-AJUSTE-2010')) })) // KINEO-AVATAR-ESTORNO-2010
  ok(tocados.size > 0 && fora.length === 0 && semMarca.length === 0 && DESENHO_SOM_2110_REESCRITOS.every((f) => rd(f).includes(MARCA)) && ![...tocados].some((f) => /engineCost|lib\/compose\.ts|lib\/engineWall|homeVideoCuration/.test(f)), `K5 o diff da base só toca a lista, os reescritos e os novos; toda linha nova traz a marca; lib/compose, preços e vitrine intocados (${[...fora.map((f) => `fora: ${f}`), ...semMarca.map((f) => `sem marca: ${f}`)].join('; ') || 'ok'})`)
}

console.log('\nM. mutantes (cada um APLICADO e VERMELHO)')
function mut(nome, arq, de, para, checa) {
  const src = rd(arq)
  const m = src.replace(de, para)
  if (m === src) { ok(false, `${nome} — mutante NÃO aplicou`); return }
  const p = tenta(() => checa(m))
  ok(p.length > 0, `${nome} → vermelho (${String(p[0] ?? '').slice(0, 90)})`)
}
mut('M1 voz do desenho volta ao palpite por palavra', F.niche, "if (vertical === 'kids_story') { const k = getPersona('emotional-storyteller'); if (k) return applyLanguageOverride(k, language) }", '', (s) => s1({ [F.niche]: s }))
mut('M2 voz infantil para todo filme', F.niche, "if (vertical === 'kids_story') { const k", "if (true) { const k", (s) => s1({ [F.niche]: s }))
mut('M3 trilha infantil vira a de documentário', F.musica, "  if (input.vertical === 'kids_story') return { enabled: true, source: 'theme', emotion: 'kids', mood: 'nature', curatedFallback: true }", "  if (input.vertical === 'kids_story') return { enabled: true, source: 'theme', emotion: 'neutral', mood: 'nature', curatedFallback: true }", (s) => s2({ [F.musica]: s }))
mut('M4 prompt infantil com bateria', F.musica, 'No drums, no heavy percussion, ', '', (s) => s2({ [F.musica]: s }))
mut('M5 trilha infantil para todo filme', F.musica, "if (input.vertical === 'kids_story') return", "if (input.vertical !== 'zzz') return", (s) => s2({ [F.musica]: s }))
mut('M6 vertical infantil depois da medida da voz', F.rota, /(    if \(desenhoInfantil\.ativo\) body\.vertical = KIDS_NARRATION_VERTICAL[^\n]*\n)([\s\S]*?)(    const vozCurta = \(\(\) => \{)/, (_m, a, b, c) => `${b}${c.replace('    const vozCurta', `${a}    const vozCurta`)}`, (s) => s3(s))
mut('M7 claim sem a legenda do botão', F.rota, ".kids_captions !== false })", ".kids_captions === 123 })", (s) => s3(s))
mut('M8 vertical infantil para todo filme', F.rota, '    if (desenhoInfantil.ativo) body.vertical = KIDS_NARRATION_VERTICAL', '    if (true) body.vertical = KIDS_NARRATION_VERTICAL', (s) => s3(s))
mut('M9 trilha a 12% no desenho', F.lib, "export const KIDS_MUSIC_VOLUME = '8%'", "export const KIDS_MUSIC_VOLUME = '12%'", (s) => s4(undefined, s))
mut('M10 sem legenda tira a marca d\'água', F.compose, 'tirarLegendaEGancho(source, { legenda: true, gancho: false }); source = sl.source; console.log(`[compose] KINEO-DESENHO-SOM-2110', 'tirarLegendaEGancho(source, { legenda: false, gancho: false }); source = sl.source; console.log(`[compose] KINEO-DESENHO-SOM-2110', (s) => s4(s))
mut('M11 desenho decidido pelo corpo do cliente', F.compose, 'const desenhoAssinado = desenhoDoClaim(cinematicBirthClaim?.response)', 'const desenhoAssinado = desenhoDoClaim(body)', (s) => s4(s))
mut('M12 kids_captions sempre no corpo', F.lib, '    ...(i.captions === false ? { kids_captions: false as const } : {}),', '    kids_captions: i.captions !== true,', (s) => s5(s))
mut('M13 claim aceita personagem desconhecido', F.lib, '  if (!isKidsCharacterId(character) || typeof captions !== \'boolean\') return null', "  if (typeof captions !== 'boolean') return null", (s) => s5(s))
mut('M14 legenda nasce desligada', F.tpl, 'const [captions, setCaptions] = useState(true)', 'const [captions, setCaptions] = useState(false)', (s) => s6(s))
mut('M18 pílula do motor de volta na tela', F.tpl, '<h1>{t.title}</h1>', '<span className="kkc-badge">{KIDS_CARTOON_ENGINE_LABEL} · 3D</span>\n      <h1>{t.title}</h1>', (s) => s6(s))
mut('M15 botão fora do corpo do filme', F.tpl, 'request: { character, language, duration }, captions })', 'request: { character, language, duration } })', (s) => s6(s))
{
  const D = 'scripts/test-support/desfaz-ads-nota9-2110.mjs'
  const quebrado = rd(D).replace(/^  texto = semDesenhoSom2110\(texto, p\).*\n/m, '')
  ok(quebrado !== rd(D) && !/export function semAdsNota92110\(texto, p\) \{\n  texto = semDesenhoSom2110\(texto, p\)/.test(quebrado), 'M16 semAdsNota92110 sem chamar esta camada → K3 vermelho')
  let lancou = false
  try { semDesenhoSom2110(rd(F.compose).replace(/^.*kidsMusicQuieter\(source\).*\n/m, ''), F.compose) } catch { lancou = true }
  ok(lancou, 'M17 desfaz com um acréscimo a menos (linha apagada à mão) lança → K1 vermelho')
}

console.log(`\n${falhas === 0 ? 'VERDE' : 'VERMELHO'}: ${oks} ok, ${falhas} falha(s)`)
process.exit(falhas === 0 ? 0 : 1)
