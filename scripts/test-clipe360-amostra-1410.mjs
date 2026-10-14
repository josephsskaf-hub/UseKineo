#!/usr/bin/env node
// KINEO-CLIPE360-AMOSTRA-1410 — guardião das duas correções aprovadas pelo fundador em 14/10 ("tudo sim").
// Caso real: o Pedro (Universo E-commerce, prospecção de 13/10) escolheu o efeito Produto 360° no /clips, saiu pela barra
// lateral e voltou (a escolha sumiu), e pediu "girando em 360°" como clipe LIVRE no Seedance 1.5 com uma foto: quase parado.
// E a amostra grátis do Studio Ads dele saiu no nível mais baixo (photo_motion).
// Node puro: transpila os módulos puros e os EXECUTA; a tela é conferida no texto; nada de fal, banco ou crédito.
// Prova:
//   (1) a detecção de giro funciona em pt, en e es (as frases REAIS do Pedro incluídas) e não dispara em falsos amigos;
//   (2) a nota e a troca aparecem (efeito na galeria → 'switch'; sem ele → 'orbit'); sem foto ou com efeito escolhido, nada;
//   (3) gerar como escrito continua: generate/send/canGenerate IDÊNTICOS ao commit-base e a nota fora do canGenerate;
//   (4) a escolha de efeito persiste (sessionStorage, ?effect= vence, chave fora da galeria não volta) e é gravada/limpa em
//       todo ponto que muda o efeito;
//   (5) o Produto 360° está no ar (interruptor, catálogo, motor Kling 2.5, prévia feita pelo próprio efeito);
//   (6) textos nas 16 línguas;
//   (7) a amostra é commercial, 15 s; os caminhos de dinheiro (v2Billing, v2Tiers, v2StartCore, /start, /orders) estão
//       byte a byte iguais à base; sample.ts só mudou nas linhas esperadas; e a amostra EXECUTADA continua 0 crédito
//       (test-ads-amostra-2026-10-09, seção 4, rodado aqui no nível commercial); custo fal extra por amostra calculado;
//   (8) mutantes: cada um prova que aplicou (a fonte mudou) e deixa a MESMA função de regras vermelha.
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { semAmostra1410 } from './test-support/desfaz-clipe360-amostra-1410.mjs'
import { semModeracao1410 } from './test-support/desfaz-moderacao-1410.mjs' // reancorado KINEO-LEVA-1410-BASE: a moderação (14/10) entrou no /orders depois desta base; sai em memória antes do byte a byte

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const ts = require(path.join(ROOT, 'node_modules', 'typescript'))
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
// O pai do primeiro commit marcado KINEO-CLIPE360-AMOSTRA-1410 (origin/main de onde esta entrega nasceu).
const BASE_SHA = '107d766bb6df3fba45baf3e73f09fa500c478186'
const gitShow = (rel) => execFileSync('git', ['show', `${BASE_SHA}:${rel}`], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 * 1024 * 1024 }).replace(/\r\n/g, '\n')

let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }

const F = {
  hint: 'lib/clips/clipRotateHint.ts',
  copy: 'lib/clips/clipCopy.ts',
  effects: 'lib/clips/clipEffects.ts',
  client: 'app/(dashboard)/clips/ClipsClient.tsx',
  sample: 'lib/ads/sample.ts',
  access: 'lib/ads/serverAccess.ts',
  billing: 'lib/ads/v2Billing.ts',
  tiers: 'lib/ads/v2Tiers.ts',
  startCore: 'lib/ads/v2StartCore.ts',
  start: 'app/api/ads/v2/start/route.ts',
  orders: 'app/api/ads/v2/orders/route.ts',
  adsPage: 'app/ads/page.tsx',
  shopify: 'app/shopify/app/route.ts',
}

/** Carrega um módulo TS puro (só imports relativos; `import type` some na transpilação). `srcOf(rel)` dá a fonte. */
function loader(srcOf) {
  const cache = new Map()
  const loadTs = (rel) => {
    if (cache.has(rel)) return cache.get(rel).exports
    const js = ts.transpileModule(srcOf(rel), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, fileName: rel }).outputText
    const mod = { exports: {} }
    cache.set(rel, mod)
    const req = (name) => {
      if (name.startsWith('./')) return loadTs(path.posix.join(path.posix.dirname(rel), name.slice(2) + '.ts'))
      throw new Error(`${rel}: import inesperado ${name} (módulo precisa ser puro)`)
    }
    new Function('require', 'module', 'exports', js)(req, mod, mod.exports)
    return mod.exports
  }
  return loadTs
}

/** Corpo de `function nome(` … `}` de mesmo nível (pelas chaves), no texto dado. */
function fnBody(src, header) {
  const i = src.indexOf(header)
  if (i < 0) return null
  let depth = 0
  for (let j = src.indexOf('{', i); j < src.length; j++) {
    if (src[j] === '{') depth++
    else if (src[j] === '}') { depth--; if (depth === 0) return src.slice(i, j + 1) }
  }
  return null
}
const lineOf = (src, start) => src.split('\n').find((l) => l.trimStart().startsWith(start)) ?? null

// Frases de giro (as 2 do Pedro + pt/en/es) e falsos amigos.
const PEDRO = [
  'quero que crie um vídeo desse produto rodando em 360° em cima de uma mesa preta, deixe o fundo embaçado',
  'crie para mim um vídeo do produto girando em 360° em cima de uma mesa preta, o fundo pode deixar escuro e meio embaçado',
]
const POS = {
  pt: [...PEDRO, 'faça a garrafa girar devagar', 'produto numa base giratória', 'o tênis dando voltas no pedestal', 'gire o perfume'],
  en: ['make the bottle spin slowly on a black table', 'product rotating on a turntable', 'the watch turns around to show the back', 'a full 360 view of the sneaker', '360-degree product shot'],
  es: ['que el producto gire sobre la mesa', 'producto girando en 360 grados', 'el reloj dando vueltas', 'rotar la botella lentamente', 'en una plataforma giratoria'],
}
const NEG = ['slow push-in on the statue, soft light', 'girafa caminhando na savana', 'spinach salad on a wooden table', 'a drone shot in 360p', 'rota da câmera ao pôr do sol',
  '3600 metros de altitude', 'rodar o vídeo em câmera lenta', 'tourner une vidéo en ville', 'la ruta del atardecer', '', '   ']

/** As regras de (1) a (4) e (6), sobre um mapa de fontes (real ou mutante). Devolve [cond, msg][]. */
function clipRules(srcOf) {
  const out = []
  const H = loader(srcOf)(F.hint)
  const C = loader(srcOf)(F.copy)
  const client = srcOf(F.client)
  const base = gitShow(F.client)
  // (1)
  for (const [lang, list] of Object.entries(POS)) out.push([list.every((t) => H.asksForRotation(t) === true), `1 detecção de giro em ${lang}: ${list.length} frases`])
  out.push([PEDRO.every((t) => H.asksForRotation(t)), '1 as 2 frases REAIS do Pedro (14/10) são reconhecidas'])
  out.push([NEG.every((t) => H.asksForRotation(t) === false) && H.asksForRotation(null) === false && H.asksForRotation(42) === false, '1 falsos amigos (girafa, spinach, 360p, rota, 3600, rodar o vídeo, tourner une vidéo) e vazio não disparam'])
  // (2)
  const keys = ['bring_to_life', 'product_360', 'melt']
  const sw = H.clipRotateHint({ prompt: PEDRO[1], withPhoto: true, effectChosen: false, effectKeys: keys })
  const orb = H.clipRotateHint({ prompt: PEDRO[1], withPhoto: true, effectChosen: false, effectKeys: ['melt'] })
  out.push([sw?.kind === 'switch' && sw.effect === 'product_360' && H.CLIP_ROTATE_EFFECT_KEY === 'product_360', '2 com foto + texto de giro + efeito na galeria → troca de 1 clique para product_360'])
  out.push([orb?.kind === 'orbit', '2 sem o efeito na galeria da conta → nota de órbita/aproximação, sem botão de troca'])
  out.push([H.clipRotateHint({ prompt: PEDRO[1], withPhoto: false, effectChosen: false, effectKeys: keys }) === null &&
    H.clipRotateHint({ prompt: PEDRO[1], withPhoto: true, effectChosen: true, effectKeys: keys }) === null &&
    H.clipRotateHint({ prompt: 'slow push-in', withPhoto: true, effectChosen: false, effectKeys: keys }) === null, '2 sem foto, com efeito já escolhido ou sem pedido de giro → nada aparece'])
  const noteBlock = client.slice(client.indexOf('{rotateHint && ('), client.indexOf('{engine && modeProblem &&'))
  out.push([/const rotateHint = clipRotateHint\(\{ prompt, withPhoto, effectChosen: !!effect, effectKeys: effects\.map\(\(fx\) => fx\.key\) \}\)/.test(client) &&
    noteBlock.includes("rotateHint.kind === 'switch' ? t('rotateNote') : t('rotateOrbit')") && noteBlock.includes('data-clip-rotate-hint={rotateHint.kind}') &&
    /onClick=\{switchToRotateEffect\}/.test(noteBlock) && noteBlock.includes("{t('rotateSwitch')}") && noteBlock.includes('data-clip-action="use_effect"'),
  '2 a tela calcula a nota com clipRotateHint (foto, efeito escolhido, galeria DESTA conta) e mostra nota + botão de troca'])
  const swFn = fnBody(client, 'function switchToRotateEffect()') ?? ''
  out.push([/setEffectKey\(CLIP_ROTATE_EFFECT_KEY\)/.test(swFn) && /rememberClipEffect\(CLIP_ROTATE_EFFECT_KEY\)/.test(swFn) && /effects\.some\(\(fx\) => fx\.key === CLIP_ROTATE_EFFECT_KEY\)/.test(swFn) &&
    !/setPhotoUrl|setPrompt|send\(|generate/.test(swFn), '2 a troca escolhe o Produto 360° com a MESMA foto, lembra a escolha e não gera nada sozinha'])
  // (3) gerar como escrito
  const canNow = lineOf(client, 'const canGenerate =')
  out.push([canNow !== null && canNow === lineOf(base, 'const canGenerate =') && !/rotate/i.test(canNow), '3 canGenerate idêntico ao commit-base (a nota nunca bloqueia)'])
  out.push([fnBody(client, 'async function generate()') === fnBody(base, 'async function generate()') && fnBody(client, 'async function send(') === fnBody(base, 'async function send(') &&
    fnBody(client, 'async function generateEffect()') === fnBody(base, 'async function generateEffect()'), '3 generate/send/generateEffect idênticos ao commit-base: o pedido vai exatamente como foi escrito'])
  out.push([/<button type="button" data-clip-action="generate" onClick=\{generate\} disabled=\{!canGenerate\}/.test(client), '3 o botão de gerar do clipe livre segue ligado só ao canGenerate de sempre'])
  // (4) persistência
  out.push([H.CLIP_EFFECT_MEMORY_KEY === 'kineo.clips.effect.v1' &&
    H.restoredClipEffect({ fromUrl: null, remembered: 'product_360', effectKeys: keys }) === 'product_360' &&
    H.restoredClipEffect({ fromUrl: 'melt', remembered: 'product_360', effectKeys: keys }) === 'melt' &&
    H.restoredClipEffect({ fromUrl: 'nope', remembered: 'gone', effectKeys: keys }) === null &&
    H.restoredClipEffect({ fromUrl: null, remembered: null, effectKeys: keys }) === null, '4 restoredClipEffect: lembrada volta; ?effect= vence; chave fora da galeria não volta'])
  const choose = fnBody(client, 'function chooseEffect(key: string)') ?? ''
  out.push([/const next = effectKey === key \? null : key/.test(choose) && /setEffectKey\(next\)/.test(choose) && /rememberClipEffect\(next\)/.test(choose), '4 escolher/desmarcar o cartão grava (ou limpa) a escolha'])
  out.push([/restoredClipEffect\(\{ fromUrl: wanted, remembered: rememberedClipEffect\(\), effectKeys: effects\.map\(\(fx\) => fx\.key\) \}\)/.test(client) && /if \(restored\) setEffectKey\(restored\)/.test(client),
    '4 ao abrir o /clips a escolha volta (o caso do Pedro: /clips → /spaces → /clips)'])
  out.push([/onClick=\{\(\) => \{ setEffectKey\(null\); rememberClipEffect\(null\); setError\(null\) \}\}>← \{t\('effectBack'\)\}/.test(client) &&
    /setEffectKey\(null\)\n\s+rememberClipEffect\(null\) \/\/ KINEO-CLIPE360-AMOSTRA-1410\n\s+setPhotoUrl\(null\)/.test(client), '4 "escrever meu clipe" e a ideia do clipe grátis limpam a escolha lembrada'])
  const remember = fnBody(client, 'function rememberClipEffect(') ?? ''
  const recall = fnBody(client, 'function rememberedClipEffect(') ?? ''
  out.push([/try \{/.test(remember) && /window\.sessionStorage\.setItem\(CLIP_EFFECT_MEMORY_KEY, key\)/.test(remember) && /window\.sessionStorage\.removeItem\(CLIP_EFFECT_MEMORY_KEY\)/.test(remember) && /catch/.test(remember) &&
    /try \{ return window\.sessionStorage\.getItem\(CLIP_EFFECT_MEMORY_KEY\) \} catch \{ return null \}/.test(recall), '4 sessionStorage com try/catch (aba anônima/bloqueada = a tela de antes)'])
  // (6) 16 línguas
  const langs = Object.keys(C.CLIP_COPY)
  const NEW = ['rotateNote', 'rotateSwitch', 'rotateOrbit']
  out.push([langs.length === 15 && NEW.every((k) => typeof C.CLIP_COPY_EN[k] === 'string' && C.CLIP_COPY_EN[k].length > 10) &&
    langs.every((l) => NEW.every((k) => typeof C.CLIP_COPY[l][k] === 'string' && C.CLIP_COPY[l][k].trim().length > 5 && C.CLIP_COPY[l][k] !== C.CLIP_COPY_EN[k])),
  '6 rotateNote/rotateSwitch/rotateOrbit escritos nas 16 línguas (nenhuma cai no inglês)'])
  out.push([['en', ...langs].every((l) => { const d = l === 'en' ? C.CLIP_COPY_EN : C.CLIP_COPY[l]; return d.rotateNote.includes('360') && d.rotateSwitch.includes('360') && !d.rotateOrbit.includes('360') && !/\{(engine|s|n)\}/.test(d.rotateNote + d.rotateSwitch + d.rotateOrbit) }),
    '6 a nota e o botão citam o efeito 360°; a nota de órbita não promete o efeito; nenhum marcador solto'])
  out.push([C.clipCopy('pt', 'rotateNote').startsWith('Uma foto só não mostra a parte de trás') && C.clipCopy('es', 'rotateSwitch') === 'Cambiar a Producto 360°' && C.clipCopy('en', 'rotateSwitch') === 'Switch to Product 360°',
    '6 pt/es/en na voz da decisão do fundador'])
  return out
}

/** As regras de (7), sobre um mapa de fontes (real ou mutante). */
function adsRules(srcOf) {
  const out = []
  const sampleSrc = srcOf(F.sample)
  const S = loader(srcOf)(F.sample)
  out.push([S.ADS_SAMPLE_TIER === 'commercial' && S.ADS_SAMPLE_LIVE === true && S.ADS_SAMPLE_DAILY_CAP === 10 && S.ADS_SAMPLE_PREFIX === 'adssample-', '7 a amostra é commercial; interruptor, teto de 10/dia e prefixo adssample- intocados'])
  const marked = sampleSrc.split('\n').filter((l) => l.includes('KINEO-CLIPE360-AMOSTRA-1410'))
  out.push([marked.length === 5 && marked.every((l) => l.startsWith('// KINEO-CLIPE360-AMOSTRA-1410')), '7 sample.ts: as linhas marcadas são EXATAMENTE 5 de comentário (nada de dinheiro escondido)'])
  out.push([semAmostra1410(sampleSrc) === gitShow(F.sample), '7 sample.ts menos a troca (tier + nome do nível + comentários) = base byte a byte'])
  out.push([[F.billing, F.tiers, F.startCore, F.start, F.orders, F.access].every((f) => (f === F.orders ? semModeracao1410(srcOf(f), 'ads') : srcOf(f)) === gitShow(f)) /* reancorado KINEO-LEVA-1410-BASE */, '7 v2Billing, v2Tiers, v2StartCore, /start, /orders e serverAccess byte a byte iguais à base (preço, débito e régua do nível intocados)'])
  const core = srcOf(F.startCore)
  out.push([core.includes("credits_charged: sampleRun ? 0 : cost") && core.includes("const charge: AdsV2ChargeResult = sampleRun ? { ok: true, balance: null } : await chargeAdsV2(") &&
    /if \(sampleRun && !adsSampleLevelOk\(order\.tier, order\.seconds\)\) return v2Fail\('sample_level_only', 403\)/.test(core), '7 a amostra trava com 0 crédito, sem débito, e só no nível/duração da amostra'])
  out.push([/return tier === ADS_SAMPLE_TIER && seconds === ADS_V2_SCREEN_SECONDS/.test(srcOf(F.access)), '7 adsSampleLevelOk segue lendo ADS_SAMPLE_TIER (15 s): o commercial passa a ser o único nível aberto'])
  const en = S.ADS_SAMPLE_COPY.en.note
  out.push([/1 per account, Commercial level, 15 s/.test(en) && S.ADS_SAMPLE_COPY.pt.note.includes('nível Comercial') && S.ADS_SAMPLE_COPY.es.note.includes('nivel Comercial') &&
    Object.values(S.ADS_SAMPLE_COPY).every((c) => !c.note.includes('Photo motion')) && Object.keys(S.ADS_SAMPLE_COPY).length === 16, '7 a frase da amostra diz Commercial nas 16 línguas'])
  out.push([srcOf(F.adsPage).includes('One ad per account at the Commercial level') && !srcOf(F.adsPage).includes('at the Photo motion level') &&
    srcOf(F.shopify).includes("sample_level_only: 'The free ad uses the Commercial level.") && srcOf(F.shopify).includes("'Your first ad is free (' + (TIER_NAMES[account.sample_tier] || 'Commercial') + ' level, 15 s).'"),
  '7 a porta /ads e o app Shopify dizem o nível certo'])
  return out
}

console.log('test-clipe360-amostra-1410')
const real = (rel) => read(rel)
for (const [c, m] of clipRules(real)) ok(c, m)
for (const [c, m] of adsRules(real)) ok(c, m)

// (5) o Produto 360° está no ar
{
  const fx = loader(real)(F.effects)
  const e = fx.clipEffectByKey('product_360')
  ok(fx.CLIP_EFFECTS_PUBLIC === true && e && e.engine === 'kling' && e.seconds === 5 && !e.template && /rotates a full 360 degrees on a turntable/.test(e.prompt) &&
    e.preview?.video === '/previews/efeito-product_360.mp4' && /^Made with this effect/.test(e.preview.note) && fs.existsSync(path.join(ROOT, 'public', 'previews', 'efeito-product_360.mp4')),
  '5 product_360 no ar: interruptor ligado, Kling 2.5 (5 s, prompt de turntable), prévia feita pelo próprio efeito')
  ok(read(F.effects) === gitShow(F.effects), '5 o catálogo de efeitos (lib/clips/clipEffects.ts) intocado')
}

// (7) custo fal por amostra (estimativa da própria casa) e a amostra EXECUTADA no commercial com 0 crédito
{
  const T = loader(real)(F.tiers)
  const shots = (tier) => tier === 'photo_motion'
    ? ['product', 'product', 'people', 'people', 'place', 'product'].map((kind) => ({ kind, source: 'client_photo' }))
    : [{ kind: 'product', source: 'client_photo' }, { kind: 'product', source: 'client_photo' }, { kind: 'people', source: 'generated_scene' }, { kind: 'people', source: 'generated_scene' }, { kind: 'people', source: 'generated_scene' }, { kind: 'place', source: 'client_photo' }]
  const pm = T.estimateAdUsd({ tier: 'photo_motion', shots: shots('photo_motion'), seconds: 15 })
  const co = T.estimateAdUsd({ tier: 'commercial', shots: shots('commercial'), seconds: 15 })
  const extra = Math.round((co.totalUsd - pm.totalUsd) * 1000) / 1000
  console.log(`  ..  custo fal estimado por amostra: photo_motion US$ ${pm.totalUsd} → commercial US$ ${co.totalUsd} (+US$ ${extra}; teto 10/dia = +US$ ${Math.round(extra * 10 * 100) / 100}/dia no máximo)`)
  ok(extra === 0.45 && co.sceneImages === 3 && T.ADS_V2_SCENE_IMAGE_USD === 0.15 && T.adsV2Credits('commercial', 15) === 41, '7 custo extra por amostra = 3 cenas Nano Banana Pro × US$ 0,15 = +US$ 0,45 (preço de lista do commercial segue 41 cr; a amostra cobra 0)')
  let amostraOut = ''
  let rc = 0
  try { amostraOut = execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'test-ads-amostra-2026-10-09.mjs')], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 }) } catch (e) { rc = e.status ?? 1; amostraOut = String(e.stdout ?? '') }
  ok(rc === 0 && /ok\s+4a conta free com 0 crédito/.test(amostraOut) && /ok\s+4b nível errado \(photo_motion\)/.test(amostraOut) && /0 falhas/.test(amostraOut),
    '7 EXECUTADO (test-ads-amostra 4a/4b): a amostra no commercial trava com adssample-, credits_charged 0, sem débito; photo_motion agora é recusado')
}

// ═══ 8. mutantes ═══════════════════════════════════════════════════════════════════════════════════════════════════
const swap = (rel, a, b) => {
  const src = read(rel)
  if (!src.includes(a)) throw new Error(`mutante sem âncora em ${rel}: ${a.slice(0, 60)}`)
  const mutated = src.split(a).join(b)
  return { rel, mutated, applied: mutated !== src }
}
const MUTANTS = [
  { name: 'detecção sem "girando/rodando" e sem 360 (o caso do Pedro passa batido)', rules: clipRules,
    m: (() => { const x = swap(F.hint, "  'girando', 'girar',", "  'girar',"); const y = x.mutated.split("'rodando', ").join('').split('return THREE_SIXTY_RE.test(t) || WORD_RE.test(t)').join('return WORD_RE.test(t)'); return { rel: F.hint, mutated: y, applied: y !== read(F.hint) } })() },
  { name: 'nota ignora a foto (aparece no texto-para-vídeo)', rules: clipRules, m: swap(F.hint, '  if (input.withPhoto !== true) return null\n', '') },
  { name: 'nota bloqueia a geração (entra no canGenerate)', rules: clipRules,
    m: swap(F.client, '&& textOk && !busy && !uploading && cost !== null', '&& textOk && !busy && !uploading && cost !== null && !asksRotation') },
  { name: 'escolher efeito deixa de lembrar (o bug do Pedro volta)', rules: clipRules, m: swap(F.client, '    setEffectKey(next)\n    rememberClipEffect(next)\n', '    setEffectKey(next)\n') },
  { name: 'a troca não leva ao Produto 360°', rules: clipRules, m: swap(F.client, '    setEffectKey(CLIP_ROTATE_EFFECT_KEY)\n    rememberClipEffect(CLIP_ROTATE_EFFECT_KEY)', '    rememberClipEffect(CLIP_ROTATE_EFFECT_KEY)') },
  { name: 'uma língua cai no inglês', rules: clipRules, m: swap(F.copy, "    rotateSwitch: 'Cambiar a Producto 360°',", "    rotateSwitch: 'Switch to Product 360°',") },
  { name: 'amostra volta ao photo_motion', rules: adsRules, m: swap(F.sample, "export const ADS_SAMPLE_TIER: AdsV2Tier = 'commercial'", "export const ADS_SAMPLE_TIER: AdsV2Tier = 'photo_motion'") },
  { name: 'amostra passa a cobrar (credits_charged = custo)', rules: adsRules, m: swap(F.startCore, 'credits_charged: sampleRun ? 0 : cost', 'credits_charged: cost') },
  { name: 'teto da amostra escondido numa linha marcada', rules: adsRules, m: swap(F.sample, 'export const ADS_SAMPLE_DAILY_CAP = 10', 'export const ADS_SAMPLE_DAILY_CAP = 50 // KINEO-CLIPE360-AMOSTRA-1410') },
  { name: 'preço de lista do commercial muda em v2Tiers', rules: adsRules, m: swap(F.tiers, "commercial: { id: 'commercial', credits15: 41,", "commercial: { id: 'commercial', credits15: 40,") },
]
for (const mu of MUTANTS) {
  const srcOf = (rel) => (rel === mu.m.rel ? mu.m.mutated : read(rel))
  let red = false
  try { red = mu.rules(srcOf).some(([c]) => !c) } catch { red = true }
  ok(mu.m.applied && red, `8 mutante VERMELHO: ${mu.name}`)
}

console.log(`test-clipe360-amostra-1410: ${pass} ok · ${fail} falhas`)
process.exit(fail ? 1 : 0)
