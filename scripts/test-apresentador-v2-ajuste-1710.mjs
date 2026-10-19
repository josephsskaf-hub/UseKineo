// KINEO-APRESENTADOR-V2-AJUSTE-1710 — guardião do AJUSTE do apresentador v2 do Studio Ads depois do 1º teste real (pedido b6823063, 17/10; notas
// 8/6/6/6/8/7/6; docs/RESULTADO-T1-APRESENTADOR-V2-2026-10-17.md). Só contas internas (ADS_V2_PRESENTER_V2_MODE 'internal'); fora da TRAVA 8.2.
// Roda com `node scripts/test-apresentador-v2-ajuste-1710.mjs` da raiz do repo, sem rede, sem banco, sem fornecedor: os módulos são transpilados pelo
// typescript do repo e rodados com stubs (o arreio de scripts/test-apresentador-v2-1710.mjs) e a extração do texto roda no carregador offline da casa
// com a OpenAI falsa (o de scripts/test-ads-mao-ajuste-3-1610.mjs).
//
// O que prova (1 seção por item):
//   N  DURAÇÃO: a narração do v2 pede e aceita 17 a 21 palavras (a extração EXECUTADA recusa 24 e fica com a de 20), só neste caminho; 21 palavras na
//      voz medida (2,1 pal/s) = 10 s e o anúncio fecha em ~15 s (montagem EXECUTADA); a voz acima do alvo acelera até 1,08 ou perde uma frase INTEIRA;
//   A  ATUAÇÃO própria do v2: sem "upbeat"/"visible-hand gestures", boca relaxada, nenhuma mão nova (as mãos do quadro = as da foto), câmera estável; o
//      motor não aceita negative prompt (o campo não vai; a lista fica pronta);
//   H  ESCOLHA da foto: entre as limpas, a que tem a mão livre inteira (checagem de presença das mãos); nenhuma = a 1ª limpa; o motivo vai no pedido;
//   C  COPY: "perfume Perfume" removido (pt, es, en, sem distinguir maiúscula) no código, e o pedido ao modelo deixa de ensinar a repetição;
//   E  MOTOR: o Kling AI Avatar v2 PRO numa constante (o avanço manda para ele e grava o preço dele) e o custo novo do anúncio;
//   S  MÚSICA: o Lyria recusado cai SOZINHO na trilha da casa e o evento da montagem diz de onde veio a trilha;
//   D  desfaz exato + ida + marca em todo bloco + encadeamento (a cadeia do apresentador v2 tira esta camada primeiro) + diff só nos arquivos da lista;
//   M  mutantes (todos APLICADOS e VERMELHOS).
import { semCloseReal1910 } from './test-support/desfaz-close-real-1910.mjs' // reancorado KINEO-CLOSE-REAL-1910 — a entrega de 19/10 sai primeiro, em memória
import { semFilmesF1F4_1910 } from './test-support/desfaz-filmes-f1f4-1910.mjs' // reancorado KINEO-FILMES-F1-F4-1910 [TRAVA 8.2 — vai do fundador 19/10 "vai, sim pra tudo"]: as linhas marcadas do Faceless 15 s saem antes da comparação com a base
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname, posix } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import ts from 'typescript'
import { semApresentadorV2Ajuste1710, comApresentadorV2Ajuste1710, desfazApresentadorV2Ajuste1710, APRESENTADOR_V2_AJUSTE_1710_ARQUIVOS, APRESENTADOR_V2_AJUSTE_1710_NOVOS, APRESENTADOR_V2_AJUSTE_1710_BASE, MARCA_APRESENTADOR_V2_AJUSTE_1710 } from './test-support/desfaz-apresentador-v2-ajuste-1710.mjs'
import { desfazApresentadorV2_1710, semApresentadorV2_1710 } from './test-support/desfaz-apresentador-v2-1710.mjs'
import { desfazJuizGrade1610 } from './test-support/desfaz-juiz-grade-1610.mjs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
import { desfazApresentadorV2Ajuste3_1710 } from './test-support/desfaz-apresentador-v2-ajuste-3-1710.mjs' // reancorado KINEO-APRESENTADOR-V2-AJUSTE-3-1710
import { semFilmeRapido1710 } from './test-support/desfaz-filme-rapido-1710.mjs' // reancorado KINEO-FILME-RAPIDO-1710 [TRAVA 8.2 — vai do fundador 17/10 "vai pra tudo"]: a entrega mais nova sai antes da comparação com a base

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const nodeRequire = createRequire(import.meta.url)
const MARCA = 'KINEO-APRESENTADOR-V2-AJUSTE-1710'
const rd = (p) => desfazApresentadorV2Ajuste3_1710(p, semFilmeRapido1710(semCloseReal1910(semFilmesF1F4_1910(readFileSync(join(ROOT, p), 'utf8'), p), p), p)) // reancorado KINEO-APRESENTADOR-V2-AJUSTE-3-1710 — o ajuste 3 (17/10) veio depois: este guardião lê o texto SEM ele (já LF); o ajuste 3 é provado em scripts/test-apresentador-v2-ajuste-3-1710.mjs /* reancorado KINEO-FILME-RAPIDO-1710: a entrega de 17/10 sai primeiro, em memória */ /* reancorado KINEO-CLOSE-REAL-1910: a entrega de 19/10 (Close do produto real) sai primeiro, em memória */ // reancorado KINEO-FILMES-F1-F4-1910: o Faceless 15 s (camada mais nova) sai primeiro, por dentro do Close real
const git = (...a) => execFileSync('git', ['-C', ROOT, ...a], { encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] })
const base = (p) => { try { return git('show', `${APRESENTADOR_V2_AJUSTE_1710_BASE}:${p}`).replace(/\r\n/g, '\n') } catch { return null } }
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }
const check = async (m, fn) => { let v = false; try { v = !!(await fn()) } catch (e) { console.log('       (lançou: ' + (e && e.message) + ')'); v = false } ok(v, m) }
const trocar = (src, a, b) => { const n = src.split(a).length - 1; if (n !== 1) throw new Error('mutante não aplicou (' + n + 'x): ' + a.slice(0, 60)); const out = src.split(a).join(b); if (out === src) throw new Error('mutante sem efeito'); return out }
const near = (a, b, e = 1e-6) => Math.abs(a - b) < e
const palavras = (t) => String(t ?? '').trim().split(/\s+/).filter(Boolean).length
process.env.FAL_KEY = process.env.FAL_KEY || 'fal-guardiao-sem-rede' // só para passar da porta "sem chave": a fal aqui é falsa
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'sk-guardiao-sem-rede' // idem para a visão: todo fetch aqui é falso

const F = {
  v2: 'lib/ads/v2PresenterV2.ts', advance: 'lib/ads/v2Advance.ts', plan: 'lib/ads/v2PlanCore.ts', brief: 'lib/ads/v2Brief.ts', vision: 'lib/ads/v2LockVision.ts',
  montage: 'lib/ads/adV2Montage.ts', voice: 'lib/avatar/voice.ts', veed: 'lib/avatar/veed.ts', tiers: 'lib/ads/v2Tiers.ts', engines: 'lib/ads/v2Engines.ts',
  presenter: 'lib/ads/v2Presenter.ts', lyria: 'lib/lyriaMusic.ts', pixabay: 'lib/pixabayMusic.ts', fit: 'lib/ads/v2CopyFit.ts',
}

// ── carregador: transpila TS → CJS, resolve '@/' (os arquivos reais) com stubs; `over` = fonte mutante ───────────────────────────
function makeLoader(stubs, over = {}) {
  const cache = new Map()
  const load = (rel) => {
    if (cache.has(rel)) return cache.get(rel)
    const text = Object.prototype.hasOwnProperty.call(over, rel) ? over[rel] : rd(rel)
    const js = ts.transpileModule(text, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
    const module = { exports: {} }
    cache.set(rel, module.exports)
    const req = (spec) => {
      if (Object.prototype.hasOwnProperty.call(stubs, spec)) return stubs[spec]
      if (spec.startsWith('node:') || spec === 'crypto') return nodeRequire(spec)
      let target = null
      if (spec.startsWith('@/')) target = `${spec.slice(2)}.ts`
      else if (spec.startsWith('./') || spec.startsWith('../')) target = `${posix.normalize(posix.join(posix.dirname(rel), spec))}.ts`
      if (target && existsSync(join(ROOT, target))) return load(target)
      throw new Error(`sem stub: ${spec} (em ${rel})`)
    }
    new Function('exports', 'require', 'module', js)(module.exports, req, module)
    cache.set(rel, module.exports)
    return module.exports
  }
  return load
}
const falLog = []
const STUBS = {
  '@fal-ai/client': { fal: { config() {}, subscribe: async (model, { input }) => { falLog.push({ model, input }); return { data: { audio: { url: 'https://fal.media/voz.mp3' } } } } } },
  '@/lib/falAlert': { alertFalExhausted: async () => null, falErrorText: () => '', looksExhausted: () => false },
}
const L = (over = {}) => makeLoader(STUBS, over)
const V2 = L()(F.v2)
const MO = L()(F.montage)
const TI = L()(F.tiers)
const EN = L()(F.engines)
const PR = L()(F.presenter)

// ═══ N. duração: 17 a 21 palavras, ~15 s ══════════════════════════════════════════════════════════════════════════════
console.log('N. duração (narração ≤ 21 palavras, anúncio ~15 s)')
const n1 = (v2 = V2) => {
  const w30 = v2.adsV2PresenterV2Words(30), w40 = v2.adsV2PresenterV2Words(40), w10 = v2.adsV2PresenterV2Words(10)
  return v2.ADS_V2_PRESENTER_V2_MAX_WORDS === 21 && v2.ADS_V2_PRESENTER_V2_MIN_WORDS === 17 && w30.max === 21 && w30.min === 17 && w40.max === 21 && w10.max === 10 && w10.min === 10 &&
    near(21 / v2.ADS_V2_PRESENTER_V2_WPS, 10) && 21 / v2.ADS_V2_PRESENTER_V2_WPS <= v2.ADS_V2_PRESENTER_V2_VOICE_TARGET_SECONDS && near(30 / v2.ADS_V2_PRESENTER_V2_WPS, 14.2857, 1e-3) // o T1: 30 palavras ≈ 14,3 s
}
await check('N1 a régua do v2: teto 21 (nunca acima do teto do anúncio), piso 17; 21 palavras na voz medida (2,1 pal/s) = 10 s ≤ alvo de 10,5 s (as 30 do T1 davam ~14,3 s)', () => n1())
// a extração REAL (carregador offline + OpenAI falsa: 900 = brief, 1100 = versões, o resto = texto em fila)
const JSONS = Object.fromEntries(['lib/ui/refinementCopy.json'].map((rel) => ['@/' + rel, JSON.parse(rd(rel))]))
function openaiFalsa(copies) {
  const log = []
  const fila = copies.slice()
  const brief = { business: 'Perfume Atheeri — Fragrâncias', offer: '', cta: 'visit', contact: '', audience: '', tone: 'warm', extra: {}, model_hint: '' }
  const create = async (params) => { log.push(structuredClone(params)); const r = params.max_tokens === 900 ? brief : params.max_tokens === 1100 ? { variants: [] } : fila.shift(); return { choices: [{ message: { content: JSON.stringify(r ?? {}) } }] } }
  return { log, openai: { chat: { completions: { create } } } }
}
const mundo = (over, oa) => createOfflineLoader({ mocks: { '@/lib/openai': { openai: oa.openai }, ...JSONS }, source: (rel, text) => (over[rel] !== undefined ? over[rel] : text) })
const N24 = 'Conheça o perfume Perfume Atheeri. Uma fragrância envolvente que acompanha você em cada momento do seu dia inteiro. Sinta a essência. Experimente hoje mesmo.'
const N20 = 'Conheça o perfume Perfume Atheeri. Uma fragrância envolvente que surpreende a cada momento. Sinta a essência e experimente hoje mesmo.'
async function extrair(over, args, copies = [N24, N20]) {
  const oa = openaiFalsa(copies.map((n) => ({ narration: n, overlays: ['Perfume Atheeri Fragrâncias', 'Uma fragrância envolvente'], sector: 'store' })))
  const r = await mundo(over, oa)(F.brief).extractAdsV2Brief({ text: 'Perfume Atheeri', language: 'pt', languageName: 'Brazilian Portuguese (pt-BR)', narration: true, overlays: true, facts: [], sentence: 'Perfume Atheeri', productPhoto: true, presenter: true, scripts: false, ...args })
  const texto = oa.log.filter((p) => p.max_tokens !== 900 && p.max_tokens !== 1100)
  return { r, texto, sys: texto[0] ? texto[0].messages.map((m) => m.content).join('\n') : '' }
}
const n2 = async (over = {}) => {
  const v2 = await extrair(over, { maxWords: 21, speechMinExact: 17, speechSentences: V2.ADS_V2_PRESENTER_V2_SPEECH_SENTENCES })
  const sempre = await extrair(over, { maxWords: 21 }, [N20])
  return palavras(N24) === 24 && palavras(N20) === 20 && v2.r.ok === true && v2.texto.length === 2 && v2.sys.includes('two or three short, calm spoken sentences, 17 to 21 words') &&
    palavras(v2.r.copy.narration) >= 17 && palavras(v2.r.copy.narration) <= 21 && sempre.sys.includes('19 to 21 words') && !sempre.sys.includes('17 to 21')
}
await check('N2 extração EXECUTADA (OpenAI falsa): o v2 pede "two or three short, calm spoken sentences, 17 to 21 words", RECUSA a fala de 24 e fica com a de 20; sem o piso exato a régua de sempre daria 19 a 21', () => n2())
const PC = rd(F.plan)
const n3 = (src = PC) => src.includes('const maxWords = v2Words ? v2Words.max : adsV2NarrationMaxWords(order.seconds)') &&
  src.includes("presenterV2Early.adsV2PresenterV2Eligible({ on: presenterV2Early.adsV2PresenterV2On(reason === 'internal'), tier: order.tier, format, style: ADS_V2_STYLES_PUBLIC ? input.style ?? null : null })") &&
  src.includes('...(v2Words && presenterV2Early ? { speechMinExact: v2Words.min, speechSentences: presenterV2Early.ADS_V2_PRESENTER_V2_SPEECH_SENTENCES } : {})') &&
  src.includes('if (presenter && presenterV2Lib && v2Words && presenterV2Lib.adsV2PresenterV2Eligible(') && src.includes('edit_limits: { narration_words: maxWords,') &&
  src.indexOf('const v2Words = ') < src.indexOf('const extracted = await extractAdsV2Brief({') && /const presenterV2Early = presenterAsked \?/.test(src)
await check('N3 o /plan decide o v2 ANTES do texto (as mesmas travas: interna, Comercial, 9:16, sem estilo, retrato) e só ele ganha o teto 21 / piso 17; o v2 só entra com a narração da régua dele; a tela edita no mesmo teto', () => n3())
const n4 = (mo = MO, v2 = V2) => {
  const voz21 = 21 / v2.ADS_V2_PRESENTER_V2_WPS
  const a = mo.adsV2PresenterV2Timeline({ clipSeconds: voz21 + 0.4, speechSeconds: voz21, cardSeconds: 2.5 })
  const b = mo.adsV2PresenterV2Timeline({ clipSeconds: v2.ADS_V2_PRESENTER_V2_VOICE_TARGET_SECONDS + 0.4, speechSeconds: v2.ADS_V2_PRESENTER_V2_VOICE_TARGET_SECONDS, cardSeconds: 2.5 })
  const t1 = mo.adsV2PresenterV2Timeline({ clipSeconds: 14.4, speechSeconds: 14.364, cardSeconds: 2.5 })
  return near(a.total, 14.65) && near(b.total, 15.15) && Math.abs(a.total - v2.ADS_V2_PRESENTER_V2_TARGET_TOTAL_SECONDS) <= 0.5 && Math.abs(b.total - 15) <= 0.5 && t1.total > 18 && mo.ADS_V2_PRESENTER_V2_CLOSE_SECONDS === 2 && mo.ADS_V2_PRESENTER_V2_SPEECH_PAD === 0.15
}
await check('N4 montagem EXECUTADA: 21 palavras (10 s de voz) = 14,65 s; a voz no alvo (10,5 s) = 15,15 s; o T1 (14,36 s de voz) dava 18,65 s; close 2 s e cartão 2,5 s intactos', () => n4())
const n5 = (v2 = V2) => {
  const F3 = 'Conheça Perfume Atheeri. Uma fragrância envolvente que acompanha você em cada momento do seu dia inteiro. Experimente hoje mesmo.' // 19 palavras, 3 frases
  const okk = v2.adsV2PresenterV2VoiceFit({ seconds: 10.4, text: F3, canSpeed: true })
  const sp = v2.adsV2PresenterV2VoiceFit({ seconds: 11.0, text: F3, canSpeed: true })
  const sp8 = v2.adsV2PresenterV2VoiceFit({ seconds: 11.34, text: F3, canSpeed: true })
  const cut = v2.adsV2PresenterV2VoiceFit({ seconds: 14.0, text: F3, canSpeed: true })
  const two = v2.adsV2PresenterV2VoiceFit({ seconds: 14.0, text: 'Conheça Perfume Atheeri, a fragrância envolvente do seu dia inteiro. Experimente hoje mesmo.', canSpeed: true })
  const noSpeed = v2.adsV2PresenterV2VoiceFit({ seconds: 11.0, text: F3, canSpeed: false })
  const frases = F3.split(/(?<=[.!?…])\s+/u)
  const rec = v2.adsV2PresenterV2VoiceFitRecord(cut, { seconds: 14.0, text: F3 })
  return okk.action === 'ok' && sp.action === 'speed' && near(sp.speed, 1.05) && sp.text === F3 && sp8.action === 'speed' && near(sp8.speed, 1.08) &&
    cut.action === 'cut' && cut.text === `${frases[0]} ${frases[2]}` && cut.speed >= 1 && cut.speed <= 1.08 && // a frase do meio sai INTEIRA; gancho e chamada ficam
    two.action === 'speed' && near(two.speed, 1.08) && two.text.startsWith('Conheça Perfume Atheeri, a fragrância') && // sem frase do meio: acelera no teto e aceita passar (nunca amputa)
    noSpeed.action === 'cut' && noSpeed.speed === 1 && rec && rec.action === 'cut' && rec.wordsBefore === 19 && rec.wordsAfter === palavras(cut.text) && rec.secondsBefore === 14 &&
    v2.ADS_V2_PRESENTER_V2_MAX_SPEED === 1.08 && v2.adsV2PresenterV2VoiceFitRecord(okk, { seconds: 10.4, text: F3 }) === null
}
await check('N5 voz acima do alvo: até 8% acelera (11,0 s → speed 1,05; 11,34 s → 1,08) com o texto inteiro; mais que isso tira a frase do MEIO inteira (gancho e chamada ficam) e acelera no máximo 1,08; sem frase do meio, acelera 1,08 e aceita passar; voz sem speed só corta', () => n5())
const ADV = rd(F.advance)
const n6 = async (src = ADV, voiceSrc = rd(F.voice)) => {
  falLog.length = 0
  const realFetch = globalThis.fetch
  globalThis.fetch = async () => ({ ok: true, arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer })
  try {
    const VX = L({ [F.voice]: voiceSrc })(F.voice)
    const pt = V2.ADS_V2_PRESENTER_V2_PT_BR_VOICE
    await VX.synthesizeWithVoice({ voiceId: pt.voiceId, text: 'Conheça Perfume Atheeri.', model: pt.model, languageBoost: pt.languageBoost, speed: 1.05 })
    const corpo = falLog[0]
    return corpo && corpo.input.voice_setting.speed === 1.05 && corpo.input.voice_setting.voice_id === 'Portuguese_ConfidentWoman' &&
      src.includes('const fitted = await presenterV2FitVoice(order, narration, language, voiceSeconds)') && src.includes('if (fitted) { buf = fitted.buf; voiceSeconds = fitted.voiceSeconds }') &&
      src.includes("...(fitted ? { plan: fitted.plan } : {}) }).eq('id', order.id).is('voice_url', null)") &&
      src.includes("const fit = pv.lib.adsV2PresenterV2VoiceFit({ seconds: voiceSeconds, text: narration, canSpeed: voice.engine === 'minimax' })") &&
      src.includes('fit.speed !== 1 ? fit.speed : undefined)') && src.includes("speed: typeof speedOverride === 'number' && speedOverride > 0 ? speedOverride : v2Voice.speed") &&
      src.includes('narration: fit.text, ...(presenter ? { presenter: { ...presenter, v2: { ...pv.v2, voiceFit: record } } } : {})')
  } finally { globalThis.fetch = realFetch }
}
await check('N6 o avanço mede a voz e, acima do alvo, re-sintetiza UMA vez (speed na voz com voice id — corpo EXECUTADO com speed 1,05 — ou a frase inteira a menos), grava o roteiro falado e o registro (plan.presenter.v2.voiceFit)', () => n6())

// ═══ A. a atuação do v2 ═══════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nA. atuação própria (calma, boca relaxada, nenhuma mão nova)')
const a1 = (v2 = V2) => {
  const p = v2.ADS_V2_PRESENTER_V2_PERFORMANCE_PROMPT, q = v2.ADS_V2_PRESENTER_V2_PERFORMANCE_PROMPT_STILL
  return [p, q].every((t) => !/upbeat/i.test(t) && !/visible-hand gestures/i.test(t) && /calm, natural UGC style/.test(t) && t.includes('the mouth stays relaxed and the lips follow every syllable') &&
    t.includes('a light closed-lip smile only at the very start and at the very end') && t.includes('the hands in the frame stay exactly the ones in the photo') && t.includes('steady camera') &&
    !/\b(no|not|never|without|don't)\b/i.test(t) && t.length < EN.ADS_V2_PROMPT_MAX_CHARS) && // afirmativo: o motor não tem negative prompt e "no X" desenha X
    p.includes('small, low gestures with the free hand that is already visible in the photo') && !/gesture/i.test(q) &&
    v2.adsV2PresenterV2Performance(true) === p && v2.adsV2PresenterV2Performance(false) === q && v2.adsV2PresenterV2Performance(null) === q &&
    v2.adsV2PresenterV2PerformanceOf(PR.ADS_V2_PRESENTER_PERFORMANCE_PROMPT) === q && v2.adsV2PresenterV2PerformanceOf(p) === p && v2.adsV2PresenterV2PerformanceOf(null) === q && /upbeat/.test(PR.ADS_V2_PRESENTER_PERFORMANCE_PROMPT)
}
await check('A1 atuação do v2: sem "upbeat"/"visible-hand gestures"; calma de UGC, sorriso leve só no começo e no fim, boca relaxada seguindo as sílabas, as mãos do quadro = as da foto (nenhuma mão nova), câmera estável; gesto pequeno só com a mão livre que JÁ está na foto; sem ela = mãos paradas; a de 09/10 nunca passa', () => a1())
const a2 = (src = ADV, v2 = V2) => {
  const input = EN.buildShotInput('kling_avatar', { imageUrl: 'https://sb.test/foto.png', audioUrl: 'https://sb.test/voz.mp3', prompt: v2.adsV2PresenterV2PerformanceOf(PR.ADS_V2_PRESENTER_PERFORMANCE_PROMPT) })
  const corpo = v2.adsV2PresenterV2AvatarInput(input)
  const pronto = v2.adsV2PresenterV2AvatarInput(input, true)
  return corpo === input && !('negative_prompt' in corpo) && JSON.stringify(Object.keys(corpo).sort()) === JSON.stringify(['audio_url', 'image_url', 'prompt']) && corpo.prompt === v2.ADS_V2_PRESENTER_V2_PERFORMANCE_PROMPT_STILL &&
    v2.ADS_V2_PRESENTER_V2_NEGATIVE_SUPPORTED === false && pronto.negative_prompt === 'big smile while talking, teeth, hand entering frame, hand close to camera, blur' &&
    src.includes("prompt: pv ? pv.lib.adsV2PresenterV2PerformanceOf(row.prompt) : videoPromptOf(order, row)") && src.includes('if (pv) input = pv.lib.adsV2PresenterV2AvatarInput(input)') &&
    src.includes("{ status: 'image_done', image_url: chosen, prompt: pv.lib.adsV2PresenterV2Performance(chosenHand) }")
}
await check('A2 o corpo EXECUTADO do motor leva a atuação do v2 (a linha grava a da foto escolhida); o Kling AI Avatar v2 não tem negative prompt no schema: o campo não vai (a lista pedida fica pronta para quando houver)', () => a2())

// ═══ H. escolha com a mão livre ═══════════════════════════════════════════════════════════════════════════════════════
console.log('\nH. escolha da foto: a mão livre inteira')
const h1 = (v2 = V2) => {
  const P = v2.adsV2PresenterV2ParseHands, FH = v2.adsV2PresenterV2FreeHandOf
  const duas = P(JSON.stringify({ hands: [{ holds_product: 'yes', whole: 'yes' }, { holds_product: 'no', whole: 'yes' }] }))
  const cortada = P({ hands: [{ holds_product: 'yes', whole: 'yes' }, { holds_product: 'no', whole: 'no' }] })
  const uma = P({ hands: [{ holds_product: 'yes', whole: 'yes' }] })
  const talvez = P({ hands: [{ holds_product: 'yes', whole: 'yes' }, { holds_product: 'unsure', whole: 'yes' }] })
  const sozinha = P({ hands: [{ holds_product: 'unsure', whole: 'yes' }] }) // uma mão só é a do produto, mesmo sem certeza
  const q = v2.ADS_V2_PRESENTER_V2_HANDS_QUESTION
  return FH(duas) === true && FH(cortada) === false && FH(uma) === false && FH(talvez) === true && FH(sozinha) === false && FH(P('lixo')) === null && FH(P({})) === null && FH(null) === null &&
    q.includes('List every human hand you can see') && q.includes('"holds_product"') && q.includes('"whole"') && !/\b(only|apenas|just)\b/i.test(q)
}
await check('H1 a checagem das mãos é de PRESENÇA (liste as mãos; segura o produto? inteira?) e o código decide: mão livre inteira = 2+ mãos e uma que não segura o produto inteira; 1 mão / cortada = não; ilegível = null', () => h1())
const h2 = (v2 = V2) => {
  const P = v2.adsV2PresenterV2PickHand
  const t1 = P([false, false, false, false], [false, false, true, false]) // o T1: só a opção 2 tinha a mão livre
  const nenhuma = P([false, false, false, false], [false, false, false, false])
  const surda = P([false, false, false, false], [null, null, null, null])
  const descartada = P([false, true, false, false], [false, true, false, true])
  const todas = P([true, true, true, true], [true, true, true, true])
  return t1.index === 2 && t1.why === 'clean_free_hand' && nenhuma.index === 0 && nenhuma.why === 'clean_no_free_hand' && surda.index === 0 && surda.why === 'clean_no_free_hand' &&
    descartada.index === 3 && descartada.why === 'clean_free_hand' && todas.index === 0 && todas.why === 'all_discarded' && v2.adsV2PresenterV2Pick([false, false]).why === 'clean'
}
await check('H2 a escolha: "frasco e caixa" decide primeiro; entre as limpas, a 1ª com a mão livre inteira (no T1: a opção 2, não a 0); nenhuma (ou não leu) = a 1ª limpa, como antes; o motivo sai em why', () => h2())
const h3 = async (visSrc = rd(F.vision)) => {
  const VI = L({ [F.vision]: visSrc })(F.vision)
  const body = VI.adsV2PresenterV2HandsBody('https://sb.test/o2.png', V2.ADS_V2_PRESENTER_V2_HANDS_QUESTION)
  const sent = []
  const raw = await VI.adsV2PresenterV2HandsRaw('https://sb.test/o2.png', V2.ADS_V2_PRESENTER_V2_HANDS_QUESTION, async (url, init) => { sent.push({ url, body: JSON.parse(init.body) }); return { ok: true, json: async () => ({ choices: [{ message: { content: '{"hands":[{"holds_product":"yes","whole":"yes"},{"holds_product":"no","whole":"yes"}]}' } }] }) } })
  const sem = await VI.adsV2PresenterV2HandsRaw('http://inseguro', V2.ADS_V2_PRESENTER_V2_HANDS_QUESTION, async () => { throw new Error('não devia chamar') })
  const c = body.messages[0].content
  return body.model === VI.ADS_V2_IN_HAND_JUDGE_MODEL && body.temperature === 0 && body.response_format.type === 'json_object' && c[0].type === 'image_url' && c[0].image_url.detail === 'high' && c[1].text === V2.ADS_V2_PRESENTER_V2_HANDS_QUESTION &&
    sent.length === 1 && sent[0].url === 'https://api.openai.com/v1/chat/completions' && V2.adsV2PresenterV2FreeHandOf(V2.adsV2PresenterV2ParseHands(raw)) === true && sem === null
}
await check('H3 a chamada EXECUTADA (fetch falso): o modelo do juiz, a foto em "high" antes da pergunta, temperatura 0, JSON; URL sem https não sai', () => h3())
const h4 = (src = ADV) => src.includes("vis.adsV2PresenterV2HandsRaw(u, pv.lib.ADS_V2_PRESENTER_V2_HANDS_QUESTION).then((raw) => pv.lib.adsV2PresenterV2FreeHandOf(pv.lib.adsV2PresenterV2ParseHands(raw)))") &&
  src.includes('const pick = pv.lib.adsV2PresenterV2PickHand(both, hands)') && src.includes('({ url, bothObjects: both[k] ?? null, freeHand: hands[k] ?? null })') &&
  src.includes('chosenWhy: pick.why') && src.includes('free_hands: hands') && !src.includes('const pick = pv.lib.adsV2PresenterV2Pick(both)')
await check('H4 o avanço checa as mãos de CADA opção, escolhe pela regra nova e grava o motivo (chosenWhy no pedido; free_hands no evento) e a mão de cada opção', () => h4())

// ═══ C. copy: "perfume Perfume" ═══════════════════════════════════════════════════════════════════════════════════════
console.log('\nC. copy: a categoria repetida antes do nome')
const BR = (over = {}) => createOfflineLoader({ mocks: { '@/lib/openai': { openai: {} }, ...JSONS }, source: (rel, text) => (over[rel] !== undefined ? over[rel] : text) })(F.brief)
const c1 = (B = BR()) => {
  const names = B.adsV2NameVariants('Perfume Atheeri')
  const fx = (t) => B.adsV2CategoryRepeatFix(t, names).text
  return fx('Conheça o perfume Perfume Atheeri. Sinta a essência.') === 'Conheça o Perfume Atheeri. Sinta a essência.' && // pt
    fx('Descubre el PERFUME Perfume Atheeri hoy.') === 'Descubre el Perfume Atheeri hoy.' && // es, maiúscula
    fx('Meet the perfume perfume atheeri today.') === 'Meet the perfume atheeri today.' && // en, minúscula
    fx('Conheça o perfume Atheeri.') === 'Conheça o perfume Atheeri.' && fx('Perfume Atheeri, para você.') === 'Perfume Atheeri, para você.' && fx('um perfume de Perfume Atheeri') === 'um perfume de Perfume Atheeri' &&
    B.adsV2CategoryRepeatFix('Conheça o perfume Perfume Atheeri.', names).fixes[0] === 'category_repeat:perfume'
}
await check('C1 o código tira a categoria colada antes do nome que já a contém: pt "o perfume Perfume Atheeri" → "o Perfume Atheeri", es e en também, sem distinguir maiúscula; o resto do texto igual', () => c1())
const c2 = (B = BR()) => {
  const names = B.adsV2NameVariants('Perfume Atheeri')
  const a = B.adsV2NameFinish({ narration: 'Conheça o perfume Perfume Atheeri. O aroma do perfume Perfume Atheeri.', overlays: ['perfume Perfume Atheeri'], sectorHint: null }, names, 'pt')
  const b = B.adsV2NameFinish({ narration: 'La esencia del perfume Perfume Atheeri.', overlays: [], sectorHint: null }, names, 'es')
  return a.copy.narration === 'Conheça o Perfume Atheeri. O aroma de Perfume Atheeri.' && a.copy.overlays[0] === 'Perfume Atheeri' && b.copy.narration === 'La esencia de Perfume Atheeri.' && !/perfume\s+perfume/i.test(a.copy.narration + b.copy.narration)
}
await check('C2 o acabamento EXECUTADO (adsV2NameFinish): a repetição sai ANTES do artigo ("do perfume Perfume Atheeri" → "de Perfume Atheeri"), na narração e nas frases', () => c2())
const c3 = (B = BR()) => {
  const r = B.adsV2NameArticleRule('Perfume Atheeri')
  const sempre = B.adsV2NameArticleRule('Atheeri')
  return !r.includes('o perfume Perfume Atheeri") ') && !r.includes('("o perfume Perfume Atheeri")') && r.includes('"Perfume Atheeri" already names the product: never write the word "perfume" right before it') && r.includes('"Conheça Perfume Atheeri"') &&
    sempre.endsWith('If the sentence needs an article, put it before a common noun instead ("o perfume Atheeri").') && B.adsV2NameCategoryWord('Perfume Atheeri') === 'perfume' && B.adsV2NameCategoryWord('Atheeri') === null && B.adsV2NameCategoryWord('Lattafa Atheeri') === null
}
await check('C3 o pedido ao modelo deixa de ENSINAR a repetição: nome que começa pela categoria = "diga o nome sozinho"; nome sem categoria = a frase de sempre, byte a byte', () => c3())
const c4 = async (over = {}) => {
  const e = await extrair(over, { maxWords: 21, speechMinExact: 17, speechSentences: V2.ADS_V2_PRESENTER_V2_SPEECH_SENTENCES })
  return e.r.ok === true && !/perfume\s+perfume/i.test(e.r.copy.narration) && e.r.copy.narration.startsWith('Conheça o Perfume Atheeri.') && e.sys.includes('already names the product')
}
await check('C4 executado de ponta a ponta (extração com a OpenAI falsa respondendo "Conheça o perfume Perfume Atheeri"): o texto final sai "Conheça o Perfume Atheeri."', () => c4())

// ═══ E. motor PRO e custo ═════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nE. motor Kling AI Avatar v2 PRO e o custo')
const veed = rd(F.veed)
const e1 = (v2 = V2) => veed.includes(`export const PRESENTER_PRO_MODEL = '${v2.ADS_V2_PRESENTER_V2_ENGINE_SLUG}'`) && v2.ADS_V2_PRESENTER_V2_ENGINE_SLUG === 'fal-ai/kling-video/ai-avatar/v2/pro' &&
  veed.includes(`export const PRESENTER_PRO_USD_PER_SECOND = ${v2.ADS_V2_PRESENTER_V2_USD_PER_SECOND}`) && v2.ADS_V2_PRESENTER_V2_STANDARD_USD_PER_SECOND === TI.ADS_V2_ENGINES.kling_avatar.usdPerSecond &&
  TI.ADS_V2_ENGINES.kling_avatar.slug === 'fal-ai/kling-video/ai-avatar/v2/standard' && TI.ADS_V2_ENGINES.kling_avatar.slug.split('/').slice(0, 2).join('/') === v2.ADS_V2_PRESENTER_V2_ENGINE_SLUG.split('/').slice(0, 2).join('/') // a fila da fal consulta pelo app: o poll de sempre lê o pedido pro
await check('E1 o motor do v2 numa constante = Kling AI Avatar v2 PRO (o PRESENTER_PRO_MODEL da casa, US$ 0,115/s); o ator de 09/10 segue no standard; mesmo app da fila (o poll de sempre serve)', () => e1())
const e2 = (src = ADV) => src.includes('const slug = pv ? pv.lib.ADS_V2_PRESENTER_V2_ENGINE_SLUG : spec.slug') && src.includes('const outcome = await submitShotOnce(slug, input, { userId: order.user_id, orderId: order.id })') &&
  src.includes('usd: Math.round(usdPerSecond * genSeconds * 10000) / 10000') && src.includes('const usdPerSecond = pv ? pv.lib.ADS_V2_PRESENTER_V2_USD_PER_SECOND : spec.usdPerSecond') &&
  src.includes("const pv = engine === 'kling_avatar' && row.kind === ADS_V2_PRESENTER_KIND ? await presenterV2Of(order) : null")
await check('E2 o avanço manda o apresentador v2 ao PRO e grava o preço dele na linha; os outros motores e o ator de antes, o slug de sempre', () => e2())
const e3 = (v2 = V2, plan = PC) => {
  const u = v2.adsV2PresenterV2UsdPro({ totalUsd: 1.243 }, 15) // o dry-run do T1: 1,243 = 0,25 fixos + 0,15 foto + 0,843 avatar standard 15 s
  return near(u.avatarUsd, 1.208, 2e-3) && near(u.avatarDeltaUsd, 0.365, 2e-3) && near(u.checksUsd, 0.08) && near(u.extraImagesUsd, 0.45) && near(u.totalUsd, 2.138, 2e-3) && u.engine === v2.ADS_V2_PRESENTER_V2_ENGINE_SLUG &&
    plan.includes('usd: presenterV2Lib.adsV2PresenterV2UsdPro(usd, order.seconds), words: v2Words')
}
await check('E3 o custo do anúncio v2 (teto do dry-run): avatar PRO no alvo da voz (US$ 1,21) no lugar do standard de 15 s, + 3 fotos + 8 checagens = ≈ US$ 2,14 (era 1,73 no plano; o real do T1 foi ~1,5)', () => e3())

// ═══ S. música ════════════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nS. música: o Lyria recusado cai na trilha da casa, e o evento diz')
const s1 = async () => {
  const realFetch = globalThis.fetch
  globalThis.fetch = async () => ({ ok: false, status: 422, json: async () => ({ detail: 'flagged by a content checker' }) })
  try {
    const LY = L()(F.lyria)
    const PX = L()(F.pixabay)
    const lyria = await LY.getLyriaMusicUrl(null, 'hustle')
    const reserva = await PX.getBackgroundMusicUrl('b6823063-ac95-426f-9b7b-78fe112c9dec', 'hustle')
    return lyria === null && typeof reserva === 'string' && /\/music\/hustle-\d+\.mp3$/.test(reserva)
  } finally { globalThis.fetch = realFetch }
}
await check('S1 EXECUTADO: o Lyria recusado (422 do filtro) devolve null e a reserva é AUTOMÁTICA — a trilha curada da casa do mesmo clima (no T1: hustle-02.mp3)', () => s1())
const s2 = (src = ADV) => src.includes("if (musicUrl && musicSource === 'none') musicSource = 'library'") && src.includes("if (musicUrl) musicSource = 'lyria'") &&
  src.includes("music_source: musicUrl ? musicSource : 'none'") && src.includes("let musicSource: 'stored' | 'lyria' | 'library' | 'library_swap' | 'none' = musicUrl ? 'stored' : 'none'") &&
  src.indexOf("if (musicUrl) musicSource = 'lyria'") < src.indexOf('if (!musicUrl) musicUrl = await getBackgroundMusicUrl(order.id, mood)') && src.includes('presenter_v2_voice_fit: presenterV2.v2.voiceFit')
await check('S2 o evento da montagem (ads_v2_assembling) registra de onde veio a trilha (lyria / library = a reserva / library_swap / stored) e o ajuste da voz do v2', () => s2())

// ═══ D. desfaz, marca, encadeamento ══════════════════════════════════════════════════════════════════════════════════
console.log('\nD. desfaz exato, marca, encadeamento, diff só nos arquivos da lista')
await check(`D1 cada arquivo tocado, desfeito (scripts/test-support/desfaz-apresentador-v2-ajuste-1710.mjs), é EXATAMENTE a origin/main ${APRESENTADOR_V2_AJUSTE_1710_BASE.slice(0, 9)}; a ida devolve o vivo; os novos existem e não existiam`, () =>
  APRESENTADOR_V2_AJUSTE_1710_ARQUIVOS.length === 7 && APRESENTADOR_V2_AJUSTE_1710_ARQUIVOS.every((f) => base(f) !== null && semApresentadorV2Ajuste1710(f, rd(f)) === base(f) && comApresentadorV2Ajuste1710(f, base(f)) === rd(f) && !semApresentadorV2Ajuste1710(f, rd(f)).includes(MARCA)) &&
  MARCA_APRESENTADOR_V2_AJUSTE_1710 === MARCA && APRESENTADOR_V2_AJUSTE_1710_NOVOS.every((f) => existsSync(join(ROOT, f)) && base(f) === null))
await check('D2 todo bloco do desfaz traz a marca; o diff contra a base só toca os arquivos da lista e os novos (cobrança, /start, montagem, TTS da casa, /audio, compose e motores do filme fora)', () => {
  const src = rd('scripts/test-support/desfaz-apresentador-v2-ajuste-1710.mjs')
  const D = JSON.parse(src.split('\n').find((l) => l.startsWith('const DESFAZ = ')).slice('const DESFAZ = '.length))
  const blocos = Object.values(D).flat()
  const shas = git('log', '--no-merges', '--format=%H', `--grep=${MARCA}`, 'HEAD').trim().split('\n').filter(Boolean)
  const TOPO = shas[0] || 'HEAD'
  const tocados = git('diff', '--name-only', APRESENTADOR_V2_AJUSTE_1710_BASE, TOPO).trim().split('\n').filter(Boolean).concat(git('diff', '--name-only', 'HEAD').trim().split('\n').filter(Boolean))
  const permitidos = new Set([...APRESENTADOR_V2_AJUSTE_1710_ARQUIVOS, ...APRESENTADOR_V2_AJUSTE_1710_NOVOS])
  return blocos.length > 0 && blocos.every((h) => h.now.join('\n').includes(MARCA)) && tocados.length > 0 && tocados.every((f) => permitidos.has(f)) &&
    ['lib/ads/v2Tiers.ts', 'lib/ads/v2Billing.ts', 'lib/ads/v2StartCore.ts', 'lib/ttsFallback.ts', 'lib/compose.ts', 'app/api/audio/generate/route.ts', 'lib/ads/v2Engines.ts', 'lib/ads/adV2Montage.ts', 'lib/avatar/veed.ts', 'lib/ads/v2Presenter.ts', 'lib/lyriaMusic.ts'].every((f) => !tocados.includes(f))
})
await check('D3 encadeamento: o desfaz do apresentador v2 (e, por ele, a grade do juiz e a cadeia toda) tira esta camada PRIMEIRO; texto sem a marca, arquivo fora da lista e null passam igual; o guardião do apresentador v2 foi reancorado', () => {
  return APRESENTADOR_V2_AJUSTE_1710_ARQUIVOS.filter((f) => f.startsWith('lib/')).every((f) => {
    const vivo = rd(f)
    const semEste = semApresentadorV2Ajuste1710(f, vivo)
    return desfazApresentadorV2_1710(f, vivo) === desfazApresentadorV2_1710(f, semEste) && semApresentadorV2_1710(f, vivo) === semApresentadorV2_1710(f, semEste) && desfazJuizGrade1610(f, vivo) === desfazJuizGrade1610(f, semEste) && desfazApresentadorV2Ajuste1710(f, base(f)) === base(f)
  }) && desfazApresentadorV2Ajuste1710(F.montage, rd(F.montage)) === rd(F.montage) && desfazApresentadorV2Ajuste1710(F.advance, null) === null &&
    /reancorado KINEO-APRESENTADOR-V2-AJUSTE-1710/.test(rd('scripts/test-apresentador-v2-1710.mjs')) && /desfazApresentadorV2Ajuste1710\(rel, text\) \/\/ KINEO-APRESENTADOR-V2-AJUSTE-1710/.test(rd('scripts/test-support/desfaz-apresentador-v2-1710.mjs'))
})
await check("D4 as travas: só contas internas (ADS_V2_PRESENTER_V2_MODE = 'internal'), só o Comercial; a lib continua PURA (só import type) e o avanço/o /plan a carregam por import DINÂMICO", () => {
  const v2src = rd(F.v2)
  return V2.ADS_V2_PRESENTER_V2_MODE === 'internal' && JSON.stringify(V2.ADS_V2_PRESENTER_V2_TIERS) === '["commercial"]' && v2src.split('\n').filter((l) => /^import /.test(l)).every((l) => /^import type /.test(l)) &&
    !/^import [^\n]*v2PresenterV2/m.test(ADV) && !/^import [^\n]*v2PresenterV2/m.test(PC.replace(/^import type[^\n]*$/gm, '')) && PC.includes("await import('@/lib/ads/v2PresenterV2')")
})

// ═══ M. mutantes ═════════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nM. mutantes (cada um APLICADO e VERMELHO)')
const SRC = { v2: rd(F.v2), brief: rd(F.brief), vision: rd(F.vision), voice: rd(F.voice) }
const comV2 = (a, b) => L({ [F.v2]: trocar(SRC.v2, a, b) })(F.v2)
const comBR = (a, b) => BR({ [F.brief]: trocar(SRC.brief, a, b) })
const mut = async (m, fn) => { let vermelho = false; try { vermelho = !(await fn()) } catch (e) { vermelho = !/mutante (não aplicou|sem efeito)/.test(String(e && e.message)) } ok(vermelho, 'mutante vermelho: ' + m) }
await mut('N: o teto volta a 30', () => n1(comV2('export const ADS_V2_PRESENTER_V2_MAX_WORDS = 21', 'export const ADS_V2_PRESENTER_V2_MAX_WORDS = 30')))
await mut('N: o piso exato é ignorado na extração', () => n2({ [F.brief]: trocar(SRC.brief, "args.narration && typeof args.speechMinExact === 'number'", "false && typeof args.speechMinExact === 'number'") }))
await mut('N: o /plan usa o teto de sempre', () => n3(trocar(PC, 'const maxWords = v2Words ? v2Words.max : adsV2NarrationMaxWords(order.seconds)', 'const maxWords = adsV2NarrationMaxWords(order.seconds)')))
await mut('N: o v2 entra mesmo sem a régua dele', () => n3(trocar(PC, 'if (presenter && presenterV2Lib && v2Words && presenterV2Lib', 'if (presenter && presenterV2Lib && presenterV2Lib')))
await mut('N: o alvo da voz vira 14,5 s', () => n4(MO, comV2('export const ADS_V2_PRESENTER_V2_VOICE_TARGET_SECONDS = 10.5', 'export const ADS_V2_PRESENTER_V2_VOICE_TARGET_SECONDS = 14.5')))
await mut('N: a voz acelera sem teto', () => n5(comV2('export const ADS_V2_PRESENTER_V2_MAX_SPEED = 1.08', 'export const ADS_V2_PRESENTER_V2_MAX_SPEED = 1.5')))
await mut('N: o corte tira o gancho (1ª frase)', () => n5(comV2('for (let k = 1; k < parts.length - 1; k++)', 'for (let k = 0; k < parts.length - 1; k++)')))
await mut('N: sem frase do meio, amputa a última', () => n5(comV2("if (cut === text) return i.canSpeed === true ? { action: 'speed', speed: ADS_V2_PRESENTER_V2_MAX_SPEED, text } : { action: 'ok' }", "if (cut === text) return { action: 'cut', speed: 1, text: parts.slice(0, -1).join(' ') || text }")))
await mut('N: o avanço não ajusta a voz', () => n6(trocar(ADV, 'const fitted = await presenterV2FitVoice(order, narration, language, voiceSeconds)', 'const fitted = null as Awaited<ReturnType<typeof presenterV2FitVoice>>')))
await mut('N: a aceleração não chega à síntese', () => n6(trocar(ADV, "speed: typeof speedOverride === 'number' && speedOverride > 0 ? speedOverride : v2Voice.speed", 'speed: v2Voice.speed')))
await mut('A: o v2 volta ao "upbeat… visible-hand gestures"', () => a1(comV2("export const ADS_V2_PRESENTER_V2_PERFORMANCE_PROMPT = 'the person talks to the camera in a calm, natural UGC style", "export const ADS_V2_PRESENTER_V2_PERFORMANCE_PROMPT = 'the person speaks with upbeat presenter energy: lively visible-hand gestures; the person talks to the camera in a calm, natural UGC style")))
await mut('A: a boca deixa de ser relaxada', () => a1(comV2('while speaking the mouth stays relaxed and the lips follow every syllable naturally; small, low gestures', 'while speaking a big bright smile; small, low gestures')))
await mut('A: a mão entra no quadro (sem "as mãos da foto")', () => a1(comV2('kept near the chest; the hands in the frame stay exactly the ones in the photo; the other hand', 'kept near the chest; the other hand')))
await mut('A: a atuação de 09/10 passa direto', () => a1(comV2('rowPrompt === ADS_V2_PRESENTER_V2_PERFORMANCE_PROMPT || rowPrompt === ADS_V2_PRESENTER_V2_PERFORMANCE_PROMPT_STILL ? rowPrompt', 'typeof rowPrompt === \'string\' && rowPrompt ? rowPrompt')))
await mut('A: o avanço manda a atuação da linha sem filtro', () => a2(trocar(ADV, 'prompt: pv ? pv.lib.adsV2PresenterV2PerformanceOf(row.prompt) : videoPromptOf(order, row)', 'prompt: videoPromptOf(order, row)')))
await mut('A: negative_prompt vai a um motor que não o aceita', () => a2(undefined, comV2('export const ADS_V2_PRESENTER_V2_NEGATIVE_SUPPORTED: boolean = false', 'export const ADS_V2_PRESENTER_V2_NEGATIVE_SUPPORTED: boolean = true')))
await mut('H: a escolha ignora a mão livre', () => h2(comV2("const withHand = list.findIndex((b, k) => b === false && hands[k] === true)", 'const withHand = -1')))
await mut('H: a mão livre ganha da checagem "frasco e caixa"', () => h2(comV2("const withHand = list.findIndex((b, k) => b === false && hands[k] === true)", 'const withHand = hands.findIndex((h) => h === true)')))
await mut('H: uma mão só conta como mão livre', () => h1(comV2('if (inv.hands.length < 2) return false', 'if (inv.hands.length < 1) return false')))
await mut('H: a pergunta das mãos vira negação', () => h1(comV2('List every human hand you can see in it.', 'Is there only one hand?')))
await mut('H: o avanço escolhe sem as mãos', () => h4(trocar(ADV, 'const pick = pv.lib.adsV2PresenterV2PickHand(both, hands)', 'const pick = pv.lib.adsV2PresenterV2Pick(both)')))
await mut('H: a visão das mãos vai em "low"', () => h3(trocar(SRC.vision, "content: [{ type: 'image_url', image_url: { url: imageUrl, detail: 'high' } }, { type: 'text', text: question }]", "content: [{ type: 'image_url', image_url: { url: imageUrl, detail: 'low' } }, { type: 'text', text: question }]")))
await mut('C: a repetição fica no texto', () => c1(comBR("out = out.replace(re, (_all: string, pre: string) => { fixes.push('category_repeat:' + first.toLowerCase()); return pre })", 'out = out')))
await mut('C: a checagem distingue maiúscula', () => c1(comBR("reEscape(String(name).trim()) + '(?![\\\\p{L}]))', 'giu')", "reEscape(String(name).trim()) + '(?![\\\\p{L}]))', 'gu')")))
await mut('C: o acabamento não chama a checagem', () => c2(comBR("const rep = typeof copy.narration === 'string' ? adsV2CategoryRepeatFix(copy.narration, names) : null", "const rep = typeof copy.narration === 'string' ? { text: copy.narration, fixes: [] as string[] } : null")))
await mut('C: o pedido volta a ensinar "o perfume Perfume Atheeri"', () => c3(comBR('const category = adsV2NameCategoryWord(brand)', 'const category = null as string | null')))
await mut('E: o v2 volta ao standard', () => e1(comV2("export const ADS_V2_PRESENTER_V2_ENGINE_SLUG = 'fal-ai/kling-video/ai-avatar/v2/pro'", "export const ADS_V2_PRESENTER_V2_ENGINE_SLUG = 'fal-ai/kling-video/ai-avatar/v2/standard'")))
await mut('E: o avanço ignora a constante', () => e2(trocar(ADV, 'const outcome = await submitShotOnce(slug, input, { userId: order.user_id, orderId: order.id })', 'const outcome = await submitShotOnce(spec.slug, input, { userId: order.user_id, orderId: order.id })')))
await mut('E: o custo esquece o PRO', () => e3(comV2('const avatarDeltaUsd = r3(avatarUsd - ADS_V2_PRESENTER_V2_STANDARD_USD_PER_SECOND * secs)', 'const avatarDeltaUsd = 0')))
await mut('S: a reserva some do evento', () => s2(trocar(ADV, "music_source: musicUrl ? musicSource : 'none', ", '')))
await mut('S: a reserva é marcada como Lyria', () => s2(trocar(ADV, "if (musicUrl && musicSource === 'none') musicSource = 'library'", "if (musicUrl && musicSource === 'none') musicSource = 'lyria'")))

console.log(`\n${pass} ok, ${fail} falha(s)`)
process.exit(fail === 0 ? 0 : 1)
