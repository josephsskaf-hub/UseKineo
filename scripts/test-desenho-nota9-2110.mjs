// KINEO-DESENHO-NOTA9-2110 — guardião de "o desenho infantil inteiro na tela clara" (fundador 21/10: "experiência do cliente no mínimo
// nota 9"; o "Make my cartoon" caía no /generate antigo: escuro, categorias adultas com Billionaire marcado, parede de motores, "+21",
// mediana, "35s costs 21 credits — you have 0…").
//
// O QUE ELE PROVA (lendo os arquivos reais e executando a lib pura num vm):
//   T1 a tela (components/kidsCartoon/KidsCartoonTemplate.tsx) NUNCA manda para o /generate nem para o /studio/create: nenhum link,
//      push ou href para lá; a passagem antiga (kidsCartoonGenerateHref / data.href) não é usada; a história continua vindo do servidor;
//   T2 o filme sai na MESMA tela pelos MESMOS endpoints do /generate: POST /api/generate-video-cinematic → /api/cinematic-clip-status
//      (ids + model + models + generationId) → /api/retry-hollywood-scene (2 rodadas, a 2ª suavizada) → POST /api/compose →
//      /api/compose/status/<id> com resume=1, quality, duration, topic; reconexão 409/503 pending; player + download + biblioteca;
//   T3 o corpo do filme = o do /generate no Seedance 1.5 com "Use my script as is" e kids_cartoon (lib kidsCinematicPayload), e o
//      /generate ainda manda exatamente esses campos; o compose = os nomes do composePayload do /generate (lib kidsComposePayload);
//   T4 UMA linha de custo, com o preço REAL: creditCostForDuration('cinematic_ai', true, s) — a MESMA chamada do débito do servidor —,
//      imediatamente acima do botão; saldo curto = "You need X credits — you have Y." + um botão de planos (e "15 s" se couber);
//      sem "+N", sem mediana, sem parede de motores; só as 2 durações do template (15/35), cada uma com seus créditos; EN/PT/ES;
//   T5 rostos: os 6 personagens com retrato próprio (public/kids-cartoon/<id>.webp, ≤ 30 KB), nada de inicial;
//   T6 o que já era garantido continua: a tela não pula a regra infantil (texto editado é conferido; o servidor confere de novo), a
//      legenda "Made with AI" e o 402 "credits_held_by_render" não abre planos (o defeito de 15/08);
//   T7 intocados: o /generate (GenerateClient), lib/engineWall.ts, lib/homeVideoCuration.ts, a rota da história e a do filme;
//   K  desfaz encadeado como camada mais nova (semHomeCardsClaros2010 chama este primeiro); diff da base só nos arquivos declarados;
//   M  mutantes: cada um APLICADO (provado por diferença) e VERMELHO.
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import {
  semDesenhoNota9_2110, desfazDesenhoNota9_2110, MARCA_DESENHO_NOTA9_2110 as MARCA, DESENHO_NOTA9_2110_BASE as BASE,
  DESENHO_NOTA9_2110_ARQUIVOS, DESENHO_NOTA9_2110_NOVOS, DESENHO_NOTA9_2110_REESCRITOS, TROCAS_DESENHO_NOTA9_2110,
} from './test-support/desfaz-desenho-nota9-2110.mjs'
import { semMeta95PersonagemAjuste2010 } from './test-support/desfaz-meta95-personagem-ajuste-2010.mjs' // reancorado KINEO-META95-PERSONAGEM-AJUSTE-2010 [TRAVA 8.2 — vai do fundador 19/10 "Vai pra meta do 95"] — os consertos da folha (camada de depois) tocam a rota do filme; o T7 compara a rota sem eles

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const rd = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/\r\n/g, '\n')
const git = (...a) => { try { return execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 * 1024 * 1024 }) } catch { return '' } }
const base = (f) => { const s = git('show', `${BASE}:${f}`); return s ? s.replace(/\r\n/g, '\n') : null }
const claroDepois = (f) => git('log', '--no-merges', '--format=%H', '--grep=KINEO-HOME-CARDS-CLAROS-2010', `${BASE}..HEAD`, '--', f).trim() !== '' // KINEO-HOME-CARDS-CLAROS-2010 — reâncora: arquivo que a entrega do selo (fundador 21/10: "pode tirar o motor de todos os cards desses 4 primeiros") continuou mexendo depois desta base não tem versão pura para comparar; confere-se que o desfaz tira as linhas desta camada sem lançar
const F = {
  tpl: 'components/kidsCartoon/KidsCartoonTemplate.tsx',
  lib: 'lib/kidsCartoon/kidsCartoon.ts',
  gen: 'app/(dashboard)/generate/GenerateClient.tsx',
  rota: 'app/api/generate-video-cinematic/route.ts',
  story: 'app/api/kids-cartoon/story/route.ts',
  page: 'app/(dashboard)/kids-cartoon/page.tsx',
}
let falhas = 0, oks = 0
const ok = (c, m) => { if (c) { oks++; console.log(`  ok   ${m}`) } else { falhas++; console.log(`  FALHA ${m}`) } }
const tenta = (fn) => { try { return fn() } catch (e) { return [`lançou: ${e.message}`] } }
const semComentario = (s) => s.split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n')

/** A lib pura (zero import) transpilada e executada num vm, como o guardião do bebê faz. */
const ts = createRequire(path.join(ROOT, 'package.json'))('typescript')
function puro(src) {
  const js = ts.transpileModule(src, { compilerOptions: { module: 1, target: 9 } }).outputText
  const mod = { exports: {} }
  vm.runInNewContext(js, { module: mod, exports: mod.exports, console, Intl, URLSearchParams })
  return mod.exports
}

// ─── T1 nunca mais o /generate ─────────────────────────────────────────────────
function t1(tpl = rd(F.tpl)) {
  const p = []
  const code = semComentario(tpl)
  if (/['"`]\/generate\b|\/studio\/create|kidsCartoonGenerateHref|data\.href|router\.push/.test(code)) p.push('a tela ainda manda para o /generate, /studio/create ou usa a passagem antiga')
  if (!code.includes("fetch('/api/kids-cartoon/story'")) p.push('a história não vem do servidor')
  return p
}
// ─── T2 o filme sai na mesma tela, pelos mesmos endpoints ───────────────────────
function t2(tpl = rd(F.tpl)) {
  const p = []
  const code = semComentario(tpl)
  const precisa = [
    "postJson('/api/generate-video-cinematic', kidsCinematicPayload(",
    '`/api/cinematic-clip-status?${q}`',
    "&model=${encodeURIComponent(r.model)}",
    "&models=${encodeURIComponent(JSON.stringify(r.models))}",
    "&generationId=${encodeURIComponent(r.generationId)}",
    "fetch('/api/retry-hollywood-scene'",
    'sanitize: r.retried === 2',
    "postJson('/api/compose', kidsComposePayload(",
    '`/api/compose/status/${encodeURIComponent(r.renderId as string)}?${q.toString()}`',
    "resume: '1'",
    "(res.status === 409 || res.status === 503) && data.pending === true",
    'className="kkc-video" src={videoUrl} controls',
    'href={videoUrl} download',
    'href="/library"',
  ]
  for (const s of precisa) if (!code.includes(s)) p.push(`ausente: ${s.slice(0, 60)}`)
  const q = code.match(/new URLSearchParams\(\{ quality: r\.quality, resume: '1', rapido: '1', duration: String\(r\.duration\), topic: r\.script\.slice\(0, 500\) \}\)/)
  if (!q) p.push('parâmetros do /api/compose/status fora do padrão do /generate')
  return p
}
// ─── T3 os corpos = os do /generate ────────────────────────────────────────────
function t3(libSrc = rd(F.lib), gen = rd(F.gen)) {
  const p = []
  const L = puro(libSrc)
  const corpo = L.kidsCinematicPayload({ generationId: 'kids-abc12345', script: '  Pip helps a bird.  ', request: { character: 'pip', language: 'pt', duration: 15 } })
  const esperado = { generationId: 'kids-abc12345', prompt: 'Pip helps a bird.', duration: 15, language: 'pt', script_mode: 'verbatim', engine: 'seedance', kids_cartoon: 'pip' }
  if (JSON.stringify(corpo) !== JSON.stringify(esperado)) p.push(`corpo do filme: ${JSON.stringify(corpo)}`)
  for (const s of ['generationId: cinematicGenerationId,', 'prompt: trimmed,', 'script_mode: scriptMode,', 'engine: aiEngine,', "...(kidsCartoonId && aiEngine === 'seedance' ? { kids_cartoon: kidsCartoonId } : {}),"]) if (!gen.includes(s)) p.push(`o /generate não manda mais: ${s}`)
  const comp = L.kidsComposePayload({ generationId: 'g1234567', clipUrls: ['a', 'b'], voiceover: 'v', captions: ['c'], duration: 35, topic: 't', quality: 'cinematic_ai', language: 'en', speed: 1.05 })
  const chaves = Object.keys(comp).join(',')
  if (chaves !== 'generationId,clip_urls,voiceover_script,scene_captions,duration,topic,quality,language,speed') p.push(`compose: ${chaves}`)
  for (const k of ['clip_urls: clipUrls,', 'voiceover_script: voiceoverScript,', 'scene_captions: sceneCaptions,', "quality: falUsedRef.current ? falQualityRef.current : quality,", '...(ttsSpeed != null ? { speed: ttsSpeed } : {}),']) if (!gen.includes(k)) p.push(`composePayload do /generate mudou: ${k}`)
  if ('speed' in L.kidsComposePayload({ generationId: 'g', clipUrls: [], voiceover: 'v', captions: [], duration: 15, topic: 't', quality: 'q', language: 'en', speed: null })) p.push('speed nulo viaja')
  return p
}
// ─── T4 uma linha de custo, preço real, acima do botão ──────────────────────────
function t4(tpl = rd(F.tpl), libSrc = rd(F.lib), rota = rd(F.rota)) {
  const p = []
  const code = semComentario(tpl)
  if (!code.includes("return creditCostForDuration('cinematic_ai', true, seconds)")) p.push('o preço da tela não é creditCostForDuration(cinematic_ai, true, s)')
  if (!rota.includes('const cost = creditCostForDuration(costQuality, true, duration)')) p.push('o débito do servidor mudou de função')
  const iCusto = code.indexOf('<p className="kkc-cost" data-enough={String(costLine.enough)}>')
  const iBotao = code.indexOf('onClick={make}')
  const iPlanos = code.indexOf('href={KIDS_PLANS_PATH}')
  if (iCusto < 0 || iBotao < 0 || iPlanos < 0 || !(iCusto < iPlanos && iPlanos < iBotao) || code.slice(iCusto, iBotao).split('kkc-cost').length !== 2) p.push('a linha de custo não fica logo acima do botão (ou há mais de uma)')
  if ((code.match(/kkc-cost"/g) || []).length !== 1) p.push('mais de uma linha de custo')
  if (/median|\+\{|'\+'|`\+\$\{/.test(code)) p.push('"+N" ou mediana na tela')
  if (!code.includes('KIDS_CARTOON_DURATIONS.map((d) =>') || !code.includes('kidsDurationChip(ui, d, kidsCartoonCost(d))')) p.push('durações sem os créditos de cada uma')
  const L = puro(libSrc)
  if (JSON.stringify(L.KIDS_CARTOON_DURATIONS) !== '[15,35]') p.push('durações ≠ 15/35')
  const c = (lang, b, cost = 9, s = 15) => L.kidsCostLine(lang, { seconds: s, cost, balance: b })
  const casos = [
    [c('en', 1000), '15-second cartoon · 9 credits · you have 1,000 → 991 left', true],
    [c('pt', 1000), 'Desenho de 15 segundos · 9 créditos · você tem 1.000 → sobram 991', true],
    [c('es', 1000), 'Dibujo de 15 segundos · 9 créditos · tienes 1000 → te quedan 991', true],
    [c('en', 0, 21, 35), 'You need 21 credits — you have 0.', false],
    [c('pt', 9, 21, 35), 'Você precisa de 21 créditos — você tem 9.', false],
    [c('es', 12000), 'Dibujo de 15 segundos · 9 créditos · tienes 12.000 → te quedan 11.991', true],
    [c('es', 3, 21, 35), 'Necesitas 21 créditos — tienes 3.', false],
    [c('en', null), '15-second cartoon · 9 credits', null],
    [c('en', 9), '15-second cartoon · 9 credits · you have 9 → 0 left', true],
    [c('fr', 5, 1), '15-second cartoon · 1 credit · you have 5 → 4 left', true],
  ]
  for (const [r, txt, enough] of casos) if (r.text !== txt || r.enough !== enough) p.push(`linha: "${r.text}" (${r.enough}) ≠ "${txt}"`)
  if (L.kidsDurationChip('pt', 35, 21) !== '35 s · 21 créditos' || L.kidsDurationChip('en', 15, 9) !== '15 s · 9 credits') p.push('pílula de duração')
  if (L.KIDS_PLANS_PATH !== '/pricing') p.push('planos fora do /pricing')
  const chaves = (o) => Object.keys(o).sort().join(',')
  if (!(chaves(L.KIDS_TEMPLATE_COPY.en) === chaves(L.KIDS_TEMPLATE_COPY.pt) && chaves(L.KIDS_TEMPLATE_COPY.en) === chaves(L.KIDS_TEMPLATE_COPY.es))) p.push('copy EN/PT/ES com chaves diferentes')
  if (L.kidsTemplateCopy('es') !== L.KIDS_TEMPLATE_COPY.es || L.kidsTemplateCopy('de') !== L.KIDS_TEMPLATE_COPY.en) p.push('kidsTemplateCopy fora das 3 línguas')
  return p
}
// ─── T5 rostos ─────────────────────────────────────────────────────────────────
function t5(libSrc = rd(F.lib), tpl = rd(F.tpl)) {
  const p = []
  const L = puro(libSrc)
  for (const c of L.KIDS_CHARACTERS) {
    const f = path.join(ROOT, 'public', c.portrait.replace(/^\//, ''))
    if (c.portrait !== `/kids-cartoon/${c.id}.webp`) p.push(`${c.id}: retrato ${c.portrait}`)
    else if (!fs.existsSync(f)) p.push(`${c.id}: arquivo ausente`)
    else { const b = fs.readFileSync(f); if (b.length > 30_000 || b.slice(0, 4).toString() !== 'RIFF' || b.slice(8, 12).toString() !== 'WEBP') p.push(`${c.id}: não é webp leve`) }
  }
  if (L.KIDS_CHARACTERS.length !== 6) p.push('≠ 6 personagens')
  if (!semComentario(tpl).includes('<span className="kkc-face" aria-hidden="true">{c.portrait ? <img src={c.portrait} alt="" />')) p.push('a escolha não mostra o rosto')
  return p
}
// ─── T6 garantias de sempre ────────────────────────────────────────────────────
function t6(tpl = rd(F.tpl), libSrc = rd(F.lib)) {
  const p = []
  const code = semComentario(tpl)
  if (!code.includes('const editedRefusal = stage === \'review\' ? kidsContentRefusal(script) : null') || !code.includes('if (!texto || kidsContentRefusal(texto)) return') || !code.includes("disabled={!script.trim() || Boolean(editedRefusal)}")) p.push('texto editado sem a regra infantil')
  if (!code.includes("data.reason !== 'credits_held_by_render'")) p.push('402 de saldo preso abre planos')
  if (!code.includes('maxLength={KIDS_HANDOFF_PROMPT_MAX_CHARS}')) p.push('texto editado sem teto')
  const L = puro(libSrc)
  if (!/Made with AI/.test(L.kidsPostCaption('en', 'leo')) || !/Feito com IA/.test(L.kidsPostCaption('pt', 'mia'))) p.push('legenda sem o selo de IA')
  if (!code.includes('{t.caption}') || !code.includes('{t.label}')) p.push('a tela pronta sem a legenda com o selo')
  const page = rd(F.page)
  if (!page.includes('robots: { index: false, follow: false }') || !page.includes('notFound()')) p.push('portas da página')
  return p
}
// ─── T7 intocados ──────────────────────────────────────────────────────────────
function t7() {
  const p = []
  for (const f of [F.gen, 'lib/engineWall.ts', 'lib/homeVideoCuration.ts', F.story, F.rota, F.page, 'app/api/compose/route.ts', 'lib/credits/engineCost.ts']) {
    const b = base(f)
    if (b === null) { p.push(`${f}: sem base`); continue }
    if (semMeta95PersonagemAjuste2010(rd(f), f) !== b) p.push(`${f} mudou`) // reancorado KINEO-META95-PERSONAGEM-AJUSTE-2010 — a rota sem os consertos da folha (só rodam com a folha interna, desfaz próprio); era: if (rd(f) !== b)
  }
  return p
}

console.log('T. a tela clara, ponta a ponta')
{ const p = tenta(() => t1()); ok(p.length === 0, `T1 nunca mais o /generate nem o /studio/create; a história vem do servidor (${p.join('; ') || 'ok'})`) }
{ const p = tenta(() => t2()); ok(p.length === 0, `T2 o filme sai na mesma tela pelos endpoints do /generate (despacho, cenas com retomada, montagem, status com resume) + player/download/biblioteca (${p.join('; ') || 'ok'})`) }
{ const p = tenta(() => t3()); ok(p.length === 0, `T3 corpo do filme = /generate no Seedance 1.5 verbatim + kids_cartoon; compose = composePayload do /generate (${p.join('; ') || 'ok'})`) }
{ const p = tenta(() => t4()); ok(p.length === 0, `T4 uma linha de custo com o preço real, logo acima do botão; saldo curto → planos; 15/35 com créditos; EN/PT/ES (${p.join('; ') || 'ok'})`) }
{ const p = tenta(() => t5()); ok(p.length === 0, `T5 os 6 personagens com rosto próprio (webp ≤ 30 KB) (${p.join('; ') || 'ok'})`) }
{ const p = tenta(() => t6()); ok(p.length === 0, `T6 regra infantil no texto editado, teto, selo "Made with AI", saldo preso não vende, portas da página (${p.join('; ') || 'ok'})`) }
{ const p = tenta(() => t7()); ok(p.length === 0, `T7 /generate, engineWall, homeVideoCuration, rota da história, rota do filme, compose e engineCost intocados (${p.join('; ') || 'ok'})`) }

// ─── K desfaz e diff ───────────────────────────────────────────────────────────
console.log('\nK. desfaz encadeado e diff da base')
{
  const difs = []
  for (const f of DESENHO_NOTA9_2110_ARQUIVOS) {
    const b = base(f)
    if (b === null) { difs.push(`${f}: fora da base`); continue }
    try { const out = semDesenhoNota9_2110(rd(f), f); if (claroDepois(f) ? out.includes(MARCA) : out !== b) difs.push(f) } catch (e) { difs.push(`${f}: ${e.message}`) } // KINEO-HOME-CARDS-CLAROS-2010 — reâncora: claroDepois; era: if (semDesenhoNota9_2110(rd(f), f) !== b) difs.push(f)
  }
  ok(difs.length === 0, `K1 ${DESENHO_NOTA9_2110_ARQUIVOS.length} arquivos tocados por linha, desfeitos, = base ${BASE} (${difs.join('; ') || 'ok'})`)
  ok(DESENHO_NOTA9_2110_NOVOS.every((f) => fs.existsSync(path.join(ROOT, f)) && base(f) === null), `K2 os ${DESENHO_NOTA9_2110_NOVOS.length} arquivos novos existem e não existiam na base`)
  const cadeia = /export function semHomeCardsClaros2010\(texto, p\) \{\n  texto = semDesenhoNota9_2110\(texto, p\)/.test(rd('scripts/test-support/desfaz-home-cards-claros-2010.mjs'))
  ok(cadeia, 'K3 encadeamento: semHomeCardsClaros2010 (chamada primeiro por semBebeQueFala2010 e pela cabeça semMenuUgc2010) tira esta camada PRIMEIRO')
  let lancou = false
  try { semDesenhoNota9_2110(rd(DESENHO_NOTA9_2110_ARQUIVOS[0]) + `\n// linha nova ${MARCA}`, DESENHO_NOTA9_2110_ARQUIVOS[0]) } catch { lancou = true }
  const trocasOk = Object.entries(TROCAS_DESENHO_NOTA9_2110).every(([f, t]) => DESENHO_NOTA9_2110_ARQUIVOS.includes(f) && t.every(([nova, velha]) => nova.includes(MARCA) && !velha.includes(MARCA)))
  ok(lancou && trocasOk && semDesenhoNota9_2110('sem marca', F.tpl) === 'sem marca' && desfazDesenhoNota9_2110(F.tpl, null) === null && !/KINEO-BEBE|KINEO-HOME/.test(MARCA), 'K4 idempotente fora da lista / sem a marca / null; acréscimo a mais lança; trocas marcadas; marca sem a de camada antiga')
  const TOPO = git('log', '--no-merges', '--format=%H', `--grep=${MARCA}`, '-1', 'HEAD').trim() || 'HEAD'
  const tocados = new Set([...git('diff', '--name-only', BASE, TOPO).trim().split('\n'), ...git('diff', '--name-only', 'HEAD').trim().split('\n'), ...git('ls-files', '--others', '--exclude-standard', 'scripts', 'public/kids-cartoon').trim().split('\n').filter((f) => f.includes('desenho-nota9') || f.startsWith('public/kids-cartoon/'))].filter(Boolean))
  const permitidos = new Set([...DESENHO_NOTA9_2110_ARQUIVOS, ...DESENHO_NOTA9_2110_NOVOS, ...DESENHO_NOTA9_2110_REESCRITOS])
  const fora = [...tocados].filter((f) => !permitidos.has(f))
  const semMarca = DESENHO_NOTA9_2110_ARQUIVOS.filter((f) => { const b = new Set(((claroDepois(f) ? semDesenhoNota9_2110(rd(f), f) : base(f)) ?? '').split('\n')); return !rd(f).split('\n').every((l) => b.has(l) || l.includes(MARCA) || l.includes('KINEO-META95-PERSONAGEM-AJUSTE-2010')) }) // KINEO-HOME-CARDS-CLAROS-2010 — reâncora: claroDepois; era: new Set((base(f) ?? '').split(...)) // reancorado KINEO-META95-PERSONAGEM-AJUSTE-2010 [TRAVA 8.2 — vai do fundador 19/10 "Vai pra meta do 95"] — as reâncoras dos consertos da folha (camada de depois, desfaz próprio) levam a marca delas
  const reescritosMarcados = DESENHO_NOTA9_2110_REESCRITOS.every((f) => rd(f).includes(MARCA))
  ok(tocados.size > 0 && fora.length === 0 && semMarca.length === 0 && reescritosMarcados, `K5 o diff da base só toca a lista, os reescritos e os novos; toda linha nova por linha traz a marca (${[...fora.map((f) => `fora: ${f}`), ...semMarca.map((f) => `sem marca: ${f}`)].join('; ') || 'ok'})`)
}

// ─── M mutantes ────────────────────────────────────────────────────────────────
console.log('\nM. mutantes (cada um APLICADO e VERMELHO)')
function mut(nome, arq, de, para, checa) {
  const src = rd(arq)
  const m = typeof de === 'string' ? src.replace(de, para) : src.replace(de, para)
  if (m === src) { ok(false, `${nome} — mutante NÃO aplicou`); return }
  const p = tenta(() => checa(m))
  ok(p.length > 0, `${nome} → vermelho (${String(p[0] ?? '').slice(0, 90)})`)
}
mut('M1 "Make my cartoon" volta a ser link para o /generate', F.tpl, '<button type="button" className="kkc-go kkc-big" onClick={make}', '<a href={\'/generate?\' + script} className="kkc-go kkc-big" onClick={make}', (s) => t1(s))
mut('M2 passa pelo /studio/create', F.tpl, "fetch('/api/kids-cartoon/story'", "fetch('/studio/create'", (s) => t1(s))
mut('M3 status sem resume=1', F.tpl, "resume: '1', rapido", "rapido", (s) => t2(s))
mut('M4 cenas sem a retomada', F.tpl, "fetch('/api/retry-hollywood-scene'", "fetch('/api/nada'", (s) => t2(s))
mut('M5 corpo do filme sem verbatim', F.lib, "script_mode: 'verbatim' as const,", "script_mode: 'ai' as const,", (s) => t3(s))
mut('M6 corpo sem kids_cartoon', F.lib, '    engine: KIDS_CARTOON_ENGINE,\n    kids_cartoon: i.request.character,\n', '    engine: KIDS_CARTOON_ENGINE,\n', (s) => t3(s))
mut('M7 preço inventado na tela', F.tpl, "return creditCostForDuration('cinematic_ai', true, seconds)", 'return Math.round(seconds * 0.6)', (s) => t4(s))
mut('M8 linha de custo DEPOIS do botão', F.tpl, /(\s*<p className="kkc-cost" data-enough=\{String\(costLine\.enough\)\}><i aria-hidden="true" \/>\{costLine\.text\}<\/p>)([\s\S]*?\{error \? <p className="kkc-err" role="alert">\{error\}<\/p> : null\}\n                \{stage === 'failed')/, (_m, a, b) => `${b.replace(/\n                \{stage === 'failed'$/, '')}${a}\n                {stage === 'failed'`, (s) => t4(s))
mut('M9 saldo curto sem dizer quanto falta', F.lib, 'return { enough: false, text: `You need ${c} ${cr} — you have ${b}.` }', 'return { enough: false, text: `Not enough credits` }', (s) => t4(undefined, s))
mut('M10 sobra errada', F.lib, 'const left = kidsNum(i.balance - i.cost, l)', 'const left = kidsNum(i.balance, l)', (s) => t4(undefined, s))
mut('M11 mediana de volta', F.tpl, '<p className="kkc-note">{t.wait}</p>', '<p className="kkc-note">{t.wait} median 5.9 min</p>', (s) => t4(s))
mut('M12 retrato apagado (inicial de volta)', F.lib, "portrait: '/kids-cartoon/mia.webp'", "portrait: ''", (s) => t5(s))
mut('M13 texto editado sem a regra infantil', F.tpl, 'if (!texto || kidsContentRefusal(texto)) return', 'if (!texto) return', (s) => t6(s))
mut('M14 saldo preso abre planos', F.tpl, "data.reason !== 'credits_held_by_render'", 'true', (s) => t6(s))
mut('M15 legenda sem o selo', F.lib, '🌈 Made with AI (AI-generated 3D cartoon)', '🌈', (s) => t6(undefined, s))
mut('M16 copy ES sem uma chave', F.lib, "    download: 'Descargar video', ", '    ', (s) => t4(undefined, s))
{
  const D = 'scripts/test-support/desfaz-home-cards-claros-2010.mjs'
  const quebrado = rd(D).replace(/^  texto = semDesenhoNota9_2110\(texto, p\).*\n/m, '')
  ok(quebrado !== rd(D) && !/export function semHomeCardsClaros2010\(texto, p\) \{\n  texto = semDesenhoNota9_2110\(texto, p\)/.test(quebrado), 'M17 semHomeCardsClaros2010 sem chamar esta camada → K3 vermelho')
  let lancou = false
  const f = 'scripts/test-support/desfaz-home-cards-claros-2010.mjs'
  try { semDesenhoNota9_2110(rd(f).replace(/^import \{ semDesenhoNota9_2110 \}.*\n/m, ''), f) } catch { lancou = true }
  ok(lancou, 'M18 desfaz com um acréscimo a menos (linha apagada à mão) lança → K1 vermelho')
}

console.log(`\n${falhas === 0 ? 'VERDE' : 'VERMELHO'}: ${oks} ok, ${falhas} falha(s)`)
process.exit(falhas === 0 ? 0 : 1)
