// KINEO-ATORES-IA-2026-10-13 — guardião da BIBLIOTECA de apresentadores de IA do Studio Ads (fundador 13/10: "manda fazer mais
// pessoas de IA … agora"). Roda com `node scripts/test-atores-ia-1310.mjs`, sem rede, sem banco, sem fal.
//
// O que ele prova, EXECUTANDO o código real (libs transpiladas pelo carregador offline da casa):
//   1. A biblioteca é FECHADA: 12 entradas, ids únicos [a-z], nomes genéricos, 25–60 anos, homens e mulheres, os 5 estilos; os 6
//      primeiros = as 6 pessoas do sorteio de sempre (mesma ordem, mesmo texto); pronome e voz casam com a pessoa; as vozes
//      ElevenLabs são da lista fechada da rota /audio e o espelho do contrato = os ids da biblioteca.
//   2. Os arquivos: retrato WebP 9:16 ≤ 120 KB, vídeo MP4 leve, amostra de voz MP3 leve; o que a biblioteca aponta existe, o que
//      ela marca como pendente (null) NÃO existe, e nada solto na pasta.
//   3. Nenhuma entrada livre: o contrato só aceita id da lista (com o ator ligado); URL, texto, caixa trocada, "constructor",
//      número = 400 bad_presenter_id; 'auto'/null/ausente = o corpo de antes, byte a byte.
//   4. O PADRÃO NÃO MUDA: sem escolha, o plano do ator (pessoa, prompt) é byte a byte o da base aece556d em 30 pedidos × 9
//      setores; escolher a Sofia dá o MESMO prompt que o sorteio daria para a pessoa 0; homem sai com "He … his".
//   5. A voz: sem escolha (ou voz MiniMax) = synthesizeTtsFallback(texto, ctx) idêntico; homem = ElevenLabs v3 com o corpo da
//      rota /audio; falha da ElevenLabs no passo do ator = espera (lança), na montagem = a voz de sempre.
//   6. Rótulo de IA: selo "AI" em cada cartão e no destaque, frase de honestidade nas 16 línguas, nenhuma nota/avaliação/
//      depoimento; e o guardião FTC (test-ator-sem-depoimento-1310) continua verde.
//   7. Medição: evento ads_presenter_selected só de servidor, gravado pelo /plan com o id; o id fica no plano do pedido.
//   8. Mutantes: cada peça quebrada fica vermelha, e cada mutante prova que aplicou.
import fs from 'node:fs'
import { semMelhorias1410 } from './test-support/desfaz-melhorias-1410.mjs' // reancorado KINEO-ADS-MELHORIAS-1410
import path from 'node:path'
import { execFileSync, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(ROOT)
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }
const check = async (m, fn) => { let v = false; try { v = !!(await fn()) } catch (e) { console.log('       (lançou: ' + (e && e.message) + ')'); v = false } ok(v, m) }
const trocar = (src, de, para) => {
  if (src.split(de).length !== 2) throw new Error('mutante sem âncora única: ' + de.slice(0, 70))
  const out = src.split(de).join(para)
  if (out === src) throw new Error('mutante não aplicou: ' + de.slice(0, 70))
  return out
}
const code = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map((l) => l.replace(/(^|[^:'"`\\])\/\/.*$/, '$1')).join('\n')

const BASE = 'aece556d' // origin/main antes da biblioteca
const atBase = (rel) => execFileSync('git', ['show', `${BASE}:${rel}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }).replace(/\r\n/g, '\n')

const F = {
  presenter: 'lib/ads/v2Presenter.ts',
  library: 'lib/ads/v2PresenterLibrary.ts',
  contract: 'lib/ads/v2Contract.ts',
  plan: 'lib/ads/v2PlanCore.ts',
  advance: 'lib/ads/v2Advance.ts',
  tts: 'lib/ttsFallback.ts',
  events: 'lib/ads/events.ts',
  sink: 'app/api/events/route.ts',
  audio: 'app/api/audio/generate/route.ts',
  picker: 'components/ads/AdsPresenterPicker.tsx',
  simple: 'app/(dashboard)/ads/v2/AdsV2Simple.tsx',
  full: 'app/(dashboard)/ads/v2/AdsV2Client.tsx',
  label: 'lib/ads/v2AiLabel.ts',
}
const SRC = Object.fromEntries(Object.entries(F).map(([k, v]) => [k, read(v)]))

// Mundo offline: as libs puras de verdade; fal, rede e alarmes falsos (registram o que receberam).
const world = (over = {}, net = {}) => {
  const subs = []
  const tts = []
  const fal = {
    config() {},
    subscribe: async (slug, opts) => { subs.push({ slug, input: structuredClone(opts.input) }); if (net.falFails) throw new Error('fal down'); return { data: { audio: { url: 'https://fal.media/x.mp3' } } } },
  }
  const load = createOfflineLoader({
    env: { FAL_KEY: 'test-key' },
    globals: {
      AbortSignal,
      fetch: async () => ({ ok: true, status: 200, arrayBuffer: async () => new TextEncoder().encode('ID3-eleven').buffer }),
    },
    mocks: {
      '@fal-ai/client': { fal },
      '@/lib/scriptParser': { stripScriptMarkers: (s) => String(s) },
      '@/lib/serverEvents': { writeServerEvent: async () => {} },
      '@/lib/openaiAlert': { alertOpenAiExhausted: async () => {}, looksOpenAiQuotaDead: () => false, openAiAlertKind: () => 'hang' },
      '@/lib/llmFallback': { isOpenAiOutageError: () => false, primaryStatusOf: () => null, settleWithin: async (_ms, ps) => Promise.allSettled(ps), FALLBACK_SIDE_EFFECTS_MS: 2500, FAL_BALANCE_ALARM_WAIT_MS: 2500 },
      '@/lib/falAlert': { alertFalExhausted: async () => {}, looksExhausted: () => false },
    },
    source: (rel, text) => (Object.prototype.hasOwnProperty.call(over, rel) ? over[rel] : text),
  })
  return { load, subs, tts }
}
const W = world()
const P = W.load(F.presenter)
const LIB = W.load(F.library)
const C = W.load(F.contract)
const EV = W.load(F.events)
const PB = (extra) => ({ order_id: '00000000-0000-4000-8000-000000000009', sector: 'store', logo_footage_id: '00000000-0000-4000-8000-000000000008', photos: [{ footage_id: '00000000-0000-4000-8000-000000000001', kind: 'product' }, { footage_id: '00000000-0000-4000-8000-000000000002', kind: 'place' }], ...extra })
const FOTOS = [{ footage_id: 'f1', kind: 'product', url: 'https://x.supabase.co/u/1.jpg' }, { footage_id: 'f2', kind: 'place', url: 'https://x.supabase.co/u/2.jpg' }]
const SECTORS = ['restaurant', 'clinic', 'real_estate', 'gym', 'salon', 'store', 'app_service', 'other', null]
const ORDERS = Array.from({ length: 30 }, (_, i) => `00000000-0000-4000-8000-${String(100 + i).padStart(12, '0')}`)

// ═══ 1. a biblioteca fechada ═════════════════════════════════════════════════════════════════════════════════════════
const audioVoices = (() => { const m = SRC.audio.match(/const ELEVEN_VOICES = \[([^\]]+)\] as const/); return m ? m[1].split(',').map((s) => s.trim().replace(/'/g, '')) : [] })()
const bibliotecaOk = (Pm, Cm) => {
  const L = Pm.ADS_V2_PRESENTER_LIBRARY
  const ids = L.map((p) => p.id)
  const ageOk = L.every((p) => Number.isInteger(p.ageMin) && Number.isInteger(p.ageMax) && p.ageMin >= 25 && p.ageMax <= 60 && p.ageMin <= p.ageMax)
  const noMinor = L.every((p) => !/\b(girl|boy|teen|teenager|child|kid|minor|student|young girl)\b/i.test(p.look) && /\b(woman|man)\b/.test(p.look))
  const noReal = L.every((p) => /^[A-ZÀ-Ý][a-zà-ÿ]+$/.test(p.name) && !/\b(celebrity|famous|like|resembl|lookalike|actor|actress|star)\b/i.test(p.look))
  const pron = L.every((p) => (p.gender === 'man' ? p.pronoun === 'He' && /\bman\b/.test(p.look) : p.pronoun === 'She' && /\bwoman\b/.test(p.look)))
  const voz = L.every((p) => (p.gender === 'man' ? p.voice.engine === 'eleven' && ['Brian', 'Daniel'].includes(p.voice.voice) : p.voice.engine === 'minimax' || (p.voice.engine === 'eleven' && ['Aria', 'Jessica'].includes(p.voice.voice))))
  const tags = Pm.ADS_V2_PRESENTER_TAGS.every((t) => L.some((p) => p.tag === t)) && L.every((p) => Pm.ADS_V2_PRESENTER_TAGS.includes(p.tag))
  const firstSix = Pm.ADS_V2_PRESENTER_PEOPLE.length === 6 && Pm.ADS_V2_PRESENTER_PEOPLE.every((who, i) => L[i].look === who && L[i].voice.engine === 'minimax' && L[i].gender === 'woman')
  const mirror = JSON.stringify([...Cm.ADS_V2_CONTRACT_PRESENTER_IDS]) === JSON.stringify(ids) && JSON.stringify([...Pm.ADS_V2_PRESENTER_IDS]) === JSON.stringify(ids)
  return L.length === 12 && new Set(ids).size === 12 && ids.every((id) => /^[a-z]{2,24}$/.test(id)) && new Set(L.map((p) => p.name)).size === 12 &&
    ageOk && noMinor && noReal && pron && voz && tags && firstSix && mirror &&
    L.filter((p) => p.gender === 'man').length >= 4 && L.some((p) => p.ageMax >= 55) && L.some((p) => p.ageMin <= 27)
}
await check('1a biblioteca FECHADA: 12, ids únicos [a-z], nomes genéricos, 25–60, ≥4 homens, alguém 55+, os 5 estilos; 6 primeiros = as 6 do sorteio; pronome/voz casam; espelho do contrato = ids', () => bibliotecaOk(P, C))
await check('1b vozes ElevenLabs ⊂ a lista fechada da rota /audio, e o espelho em ttsFallback é o mesmo', () => {
  const T = world().load(F.tts)
  return audioVoices.length >= 6 && P.ADS_V2_PRESENTER_ELEVEN_VOICES.every((v) => audioVoices.includes(v)) &&
    JSON.stringify([...T.ADS_PRESENTER_ELEVEN_VOICES]) === JSON.stringify([...P.ADS_V2_PRESENTER_ELEVEN_VOICES]) &&
    T.ADS_PRESENTER_ELEVEN_MODEL === "fal-ai/elevenlabs/tts/eleven-v3" && SRC.audio.includes("slug: 'fal-ai/elevenlabs/tts/eleven-v3'") &&
    SRC.audio.includes("input: (text, voice) => ({ text, voice: voice ?? 'Rachel', stability: 0.5 })") &&
    JSON.stringify(T.elevenTtsInput('oi', 'Brian')) === JSON.stringify({ text: 'oi', voice: 'Brian', stability: 0.5 })
})
await check('1c lookup só por igualdade exata (Sofia/SOFIA/constructor/__proto__/URL/número = null)', () =>
  P.adsV2PresenterById('sofia')?.name === 'Sofia' && ['Sofia', 'SOFIA', 'constructor', '__proto__', 'toString', 'https://x/a.webp', 7, null, undefined, {}, ['sofia']].every((v) => P.adsV2PresenterById(v) === null) &&
  P.adsV2PresenterVoiceOf('zzz').engine === 'minimax' && P.adsV2PresenterVoiceOf(null).engine === 'minimax' && P.adsV2PresenterVoiceOf('marcus').voice === 'Brian')

// ═══ 2. os arquivos ══════════════════════════════════════════════════════════════════════════════════════════════════
const pub = (p) => path.join(ROOT, 'public', p.replace(/^\//, ''))
const webpSize = (b) => {
  if (b.subarray(0, 4).toString() !== 'RIFF' || b.subarray(8, 12).toString() !== 'WEBP') return null
  const kind = b.subarray(12, 16).toString()
  if (kind === 'VP8 ') return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff }
  if (kind === 'VP8X') return { w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3) }
  if (kind === 'VP8L') { const bits = b.readUInt32LE(21); return { w: (bits & 0x3fff) + 1, h: ((bits >> 14) & 0x3fff) + 1 } }
  return null
}
const arquivosOk = (L) => {
  const dir = path.join(ROOT, 'public', 'ads', 'presenters')
  const files = fs.existsSync(dir) ? fs.readdirSync(dir) : []
  const pointed = new Set()
  for (const p of L) {
    for (const [field, re] of [['portrait', /^\/ads\/presenters\/[a-z]+\.webp$/], ['clip', /^\/ads\/presenters\/[a-z]+\.mp4$/], ['voiceSample', /^\/ads\/presenters\/[a-z]+-voice\.mp3$/]]) {
      const v = p[field]
      const expected = field === 'portrait' ? `/ads/presenters/${p.id}.webp` : field === 'clip' ? `/ads/presenters/${p.id}.mp4` : `/ads/presenters/${p.id}-voice.mp3`
      if (v === null) { if (fs.existsSync(pub(expected))) return false; continue } // pendente ⇔ arquivo ausente
      if (typeof v !== 'string' || !re.test(v) || v !== expected || !fs.existsSync(pub(v))) return false
      pointed.add(path.basename(v))
      const b = fs.readFileSync(pub(v))
      if (field === 'portrait') { const s = webpSize(b); if (!s || b.length > 120 * 1024 || b.length < 4000 || Math.abs(s.w / s.h - 9 / 16) > 0.01) return false }
      if (field === 'clip' && (b.subarray(4, 8).toString() !== 'ftyp' || b.length > 400 * 1024 || b.length < 20000)) return false
      if (field === 'voiceSample' && (!(b.subarray(0, 3).toString() === 'ID3' || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0)) || b.length > 120 * 1024 || b.length < 8000)) return false
    }
    if (p.clip && !p.portrait) return false // vídeo sempre com o pôster
  }
  return files.length > 0 && files.every((f) => pointed.has(f))
}
await check('2a retratos WebP 9:16 ≤ 120 KB, vídeos MP4 ≤ 400 KB, amostras MP3 ≤ 120 KB; apontado ⇔ existe; pendente (null) ⇔ ausente; nada solto na pasta', () => arquivosOk(P.ADS_V2_PRESENTER_LIBRARY))
await check('2b 12 retratos (Sofia/Amara de renders internos; os outros 10 gerados em produção 13/10), 2 vídeos e as 12 amostras de voz (6 MiniMax + 6 ElevenLabs) — KINEO-ATORES-IA-RETRATOS-2026-10-13', () => {
  const L = P.ADS_V2_PRESENTER_LIBRARY
  return L.length === 12 && L.every((p) => p.portrait) && L.filter((p) => p.clip).length === 2 &&
    L.every((p) => p.voiceSample) && L.filter((p) => p.voice.engine === 'minimax').map((p) => p.id).join() === 'sofia,clara,hannah,jade,amara,chloe' &&
    L.filter((p) => p.gender === 'man').every((p) => p.voice.engine === 'eleven')
})

// ═══ 3. nenhuma entrada livre ════════════════════════════════════════════════════════════════════════════════════════
const contratoFechado = (Cm) => {
  const okId = Cm.sanitizePlanBody(PB({ presenter: true, presenter_id: 'marcus' }))
  const semEscolha = Cm.sanitizePlanBody(PB({ presenter: true }))
  const ruins = ['Marcus', 'MARCUS', 'constructor', '__proto__', 'https://evil.test/face.webp', 'a woman with blue hair', '', 'marcus ', 7, true, {}, ['marcus']]
  return okId.ok && okId.value.presenter_id === 'marcus' &&
    ruins.every((v) => Cm.sanitizePlanBody(PB({ presenter: true, presenter_id: v })).error === 'bad_presenter_id') &&
    Cm.sanitizePlanBody(PB({ presenter_id: 'marcus' })).error === 'bad_presenter_id' && // sem o ator ligado
    ['auto', null, undefined].every((v) => { const r = Cm.sanitizePlanBody(PB(v === undefined ? { presenter: true } : { presenter: true, presenter_id: v })); return r.ok && !('presenter_id' in r.value) && JSON.stringify(r.value) === JSON.stringify(semEscolha.value) }) &&
    Cm.ADS_V2_CONTRACT_PRESENTER_IDS.every((id) => Cm.sanitizePlanBody(PB({ presenter: true, presenter_id: id })).value.presenter_id === id)
}
await check('3a contrato: só id da lista com o ator ligado; URL/texto/caixa/"constructor"/número = 400 bad_presenter_id; auto/null/ausente = o corpo de antes', () => contratoFechado(C))
await check('3b o plano gravado só aceita id da lista (isAdsV2PresenterPlan recusa id inventado); id fora da lista no plan = o sorteio', () => {
  const p = P.planAdsV2Presenter({ sector: 'store', photos: FOTOS, seedKey: ORDERS[0], presenterId: 'marcus' })
  const fake = { ...p, presenterId: 'hacker' }
  const semId = P.planAdsV2Presenter({ sector: 'store', photos: FOTOS, seedKey: ORDERS[0] })
  return P.isAdsV2PresenterPlan(p) && !P.isAdsV2PresenterPlan(fake) && !P.isAdsV2PresenterPlan({ ...p, presenterId: 7 }) &&
    JSON.stringify(P.planAdsV2Presenter({ sector: 'store', photos: FOTOS, seedKey: ORDERS[0], presenterId: 'https://evil.test/a.webp' })) === JSON.stringify(semId)
})
// reancorado KINEO-ADS-MELHORIAS-1410 — o corpo do /plan e a assinatura da tela simples ganharam o formato no fim (linhas marcadas):
// semMelhorias1410 as devolve ao texto EXATO de antes; a regra (só o id do apresentador, nunca imagem/texto) vale sobre ele.
await check('3c a rota /plan passa SÓ o id já validado pelo contrato (input.presenter_id) e a tela manda só o id (nunca imagem/texto)', () => {
  const plan = code(SRC.plan)
  const s = code(semMelhorias1410(SRC.simple))
  const f = code(SRC.full)
  return /planAdsV2Presenter\(\{ sector, photos, seedKey: order\.id, presenterId: input\.presenter_id \?\? null \}\)/.test(plan) &&
    /\.\.\.\(presenterOn && presenterPick \? \{ presenter_id: presenterPick \} : \{\}\) \}/.test(s) && /\.\.\.\(presenterOn && presenterPick \? \{ presenter_id: presenterPick \} : \{\}\) \}/.test(f) &&
    !/presenter_(image|url|look|prompt|description)/.test(s + f + plan)
})

// ═══ 4. o padrão não muda ════════════════════════════════════════════════════════════════════════════════════════════
const BASE_P = world({ [F.presenter]: atBase(F.presenter) }).load(F.presenter)
const padraoIgual = (Pm) => ORDERS.every((id) => SECTORS.every((sector) =>
  JSON.stringify(Pm.planAdsV2Presenter({ sector, photos: FOTOS, seedKey: id })) === JSON.stringify(BASE_P.planAdsV2Presenter({ sector, photos: FOTOS, seedKey: id })) &&
  JSON.stringify(Pm.planAdsV2Presenter({ sector, photos: FOTOS, seedKey: id, presenterId: null })) === JSON.stringify(BASE_P.planAdsV2Presenter({ sector, photos: FOTOS, seedKey: id })))) &&
  [0, 1, 2, 3, 4, 5, 6, 7, -1, 2.5].every((n) => SECTORS.every((sector) => Pm.adsV2ActorPrompt(sector, n) === BASE_P.adsV2ActorPrompt(sector, n)))
await check('4a SEM escolha: plano do ator (pessoa, prompt, chaves) byte a byte o da base aece556d — 30 pedidos × 9 setores; adsV2ActorPrompt idêntico', () => padraoIgual(P))
await check('4b escolher um dos 6 de sempre = o MESMO prompt que o sorteio daria para aquela pessoa (+ o id gravado)', () =>
  P.ADS_V2_PRESENTER_LIBRARY.slice(0, 6).every((e, i) => SECTORS.every((sector) => {
    const p = P.planAdsV2Presenter({ sector, photos: FOTOS, seedKey: ORDERS[3], presenterId: e.id })
    return p.actorPrompt === BASE_P.adsV2ActorPrompt(sector, i) && p.person === i && p.presenterId === e.id && p.productUrl === FOTOS[0].url
  })))
await check('4c homem: "He holds … his face", a descrição dele, nada de "She"; o resto do prompt (boca fechada, produto EXATO, sem texto) igual', () =>
  P.ADS_V2_PRESENTER_LIBRARY.filter((e) => e.gender === 'man').every((e) => {
    const pr = P.planAdsV2Presenter({ sector: 'gym', photos: FOTOS, seedKey: ORDERS[1], presenterId: e.id }).actorPrompt
    return pr.includes(`selfie photo of ${e.look},`) && /He holds the product from the reference photo in one hand near his face and chest/.test(pr) && !/\bShe\b|\bher\b/.test(pr) &&
      /mouth closed/.test(pr) && /EXACTLY as in the reference photo/.test(pr) && /No text, no captions, no logos or watermarks added/.test(pr) && /only one person/.test(pr) && /a bright, modern gym/.test(pr)
  }))
await check('4d a tela começa SEM escolha ("Surprise me" = null) nos dois modos, e o seletor só aparece com o ator ligado', () => {
  const s = code(semMelhorias1410(SRC.simple)) // reancorado KINEO-ADS-MELHORIAS-1410
  const f = code(SRC.full)
  return [s, f].every((x) => /const \[presenterPick, setPresenterPick\] = useState<string \| null>\(null\)/.test(x) && /\{presenterOn \? <AdsPresenterPicker /.test(x)) &&
    /const planSig = presenterOn && presenterPick \? `\$\{planSigBase\}\|presenter:\$\{presenterPick\}` : planSigBase/.test(f) &&
    /style, \.\.\.\(presenterOn && presenterPick \? \{ presenterPick \} : \{\}\) \}\)/.test(s)
})

// ═══ 5. a voz ═══════════════════════════════════════════════════════════════════════════════════════════════════════
const fatia = (src, re) => { const m = src.match(re); if (!m) throw new Error('fatia ausente: ' + re); return m[0] }
const vozDoPedido = (advanceSrc, deps) => {
  const fn = fatia(advanceSrc, /async function adsV2NarrationVoice\([\s\S]*?\n}\n/)
  const of = fatia(advanceSrc, /export function adsV2PresenterPlanOf\([\s\S]*?\n}\n/).replace(/^export /, '')
  const js = ts.transpileModule(of + '\n' + fn, { compilerOptions: { module: ts.ModuleKind.None, target: ts.ScriptTarget.ES2022 } }).outputText
  return new Function('ctx', `const { synthesizeTtsFallback, synthesizeElevenVoice, adsV2PresenterVoiceOf, isAdsV2PresenterPlan, console } = ctx;\n${js}\nreturn adsV2NarrationVoice`)(deps)
}
const vozOk = async (advanceSrc) => {
  const calls = []
  const deps = (elevenFails) => ({
    synthesizeTtsFallback: async (t, c) => { calls.push(['minimax', t, JSON.stringify(c)]); return Buffer.from('mm') },
    synthesizeElevenVoice: async (t, v, c) => { calls.push(['eleven', t, v, JSON.stringify(c)]); if (elevenFails) throw new Error('eleven down'); return Buffer.from('el') },
    adsV2PresenterVoiceOf: P.adsV2PresenterVoiceOf,
    isAdsV2PresenterPlan: P.isAdsV2PresenterPlan,
    console: { warn() {} },
  })
  const order = (presenterId) => ({ id: 'o1', user_id: 'u1', generation_id: 'g1', plan: { narration: 'x', presenter: P.planAdsV2Presenter({ sector: 'store', photos: FOTOS, seedKey: 'o1', presenterId }) } })
  const ctx = JSON.stringify({ userId: 'u1', generationId: 'g1' })
  const f = vozDoPedido(advanceSrc, deps(false))
  calls.length = 0
  await f({ id: 'o0', user_id: 'u1', generation_id: 'g1', plan: { narration: 'x' } }, 'texto', false) // pedido sem ator
  await f(order(null), 'texto', false) // ator sem escolha
  await f(order('sofia'), 'texto', true) // escolha de voz MiniMax
  const minimaxOnly = calls.length === 3 && calls.every((c) => c[0] === 'minimax' && c[1] === 'texto' && c[2] === ctx)
  calls.length = 0
  await f(order('marcus'), 'texto', false)
  await f(order('lucia'), 'texto', true)
  const eleven = calls.length === 2 && calls[0][0] === 'eleven' && calls[0][2] === 'Brian' && calls[1][2] === 'Aria' && calls.every((c) => c[3] === ctx)
  const g = vozDoPedido(advanceSrc, deps(true))
  calls.length = 0
  let lancou = false
  try { await g(order('kenji'), 'texto', false) } catch { lancou = true }
  const espera = lancou && calls.length === 1 && calls[0][0] === 'eleven'
  calls.length = 0
  const buf = await g(order('kenji'), 'texto', true)
  const reserva = buf.toString() === 'mm' && calls.map((c) => c[0]).join() === 'eleven,minimax'
  const s = code(advanceSrc)
  const ligado = /const buf = await adsV2NarrationVoice\(order, speakableForTts\(narration, language\), false\)/.test(fatia(s, /async function ensureAdsV2Voice\([\s\S]*?\n}\n/)) &&
    /const buf = await adsV2NarrationVoice\(order, speakableForTts\(narration, language\), true\)/.test(fatia(s, /async function prepareAndSubmit\([\s\S]*?\n}\n/)) &&
    (s.match(/synthesizeTtsFallback\(/g) || []).length === 2 // só as 2 dentro de adsV2NarrationVoice
  return minimaxOnly && eleven && espera && reserva && ligado
}
await check('5a voz do pedido: sem ator/sem escolha/voz MiniMax = synthesizeTtsFallback(texto, ctx) idêntico; homem = ElevenLabs (Brian/Daniel), Lucía = Aria; falha no ATOR = espera (lança), na MONTAGEM = a voz de sempre', () => vozOk(SRC.advance))
const elevenOk = async (ttsOver) => {
  const w = world(ttsOver ? { [F.tts]: ttsOver } : {})
  const T = w.load(F.tts)
  const buf = await T.synthesizeElevenVoice('Meet LUME.', 'Daniel', { userId: 'u' })
  let recusou = false
  try { await T.synthesizeElevenVoice('Meet LUME.', 'Rachel; drop', {}) } catch { recusou = true }
  return buf.toString() === 'ID3-eleven' && w.subs.length === 1 && w.subs[0].slug === 'fal-ai/elevenlabs/tts/eleven-v3' &&
    JSON.stringify(w.subs[0].input) === JSON.stringify({ text: 'Meet LUME.', voice: 'Daniel', stability: 0.5 }) && recusou && w.subs.length === 1
}
await check('5b synthesizeElevenVoice: slug e corpo EXATOS da rota /audio ({ text, voice, stability: 0.5 }); voz fora da lista nunca chega à fal', () => elevenOk(null))

// ═══ 6. rótulo de IA e honestidade ═══════════════════════════════════════════════════════════════════════════════════
const LANGS = ['en', 'pt', 'es', 'fr', 'de', 'it', 'nl', 'pl', 'tr', 'ru', 'uk', 'ar', 'ur', 'hi', 'id', 'vi']
const FIELDS = ['title', 'hint', 'vary', 'ai', 'autoName', 'autoLine', 'hear', 'stop', 'voiceSoon', 'previewSoon', 'voiceWoman', 'voiceMan', 'selected']
const copyOk = (table) => Object.keys(table).length === 16 && LANGS.every((l) => table[l] && FIELDS.every((k) => typeof table[l][k] === 'string' && table[l][k].trim()) &&
  ['all', 'casual', 'business', 'fitness', 'beauty', 'home'].every((t) => typeof table[l].tags?.[t] === 'string' && table[l].tags[t].trim())) &&
  LANGS.filter((l) => l !== 'en').every((l) => ['title', 'hint', 'vary', 'autoName', 'hear', 'voiceSoon'].every((k) => table[l][k] !== table.en[k]))
await check('6a frases do seletor nas 16 línguas, completas e escritas (nenhuma copiada do inglês); língua desconhecida = inglês; a frase diz "IA, não é pessoa real, nunca cliente"', () =>
  copyOk(LIB.ADS_V2_PRESENTER_PICKER_COPY) && LIB.adsV2PresenterPickerCopy('xx') === LIB.ADS_V2_PRESENTER_PICKER_COPY.en &&
  /AI-made/.test(LIB.ADS_V2_PRESENTER_PICKER_COPY.en.hint) && /not a real person/.test(LIB.ADS_V2_PRESENTER_PICKER_COPY.en.hint) && /never a customer/.test(LIB.ADS_V2_PRESENTER_PICKER_COPY.en.hint) &&
  /feito por IA/.test(LIB.ADS_V2_PRESENTER_PICKER_COPY.pt.hint) && !/^\s*import\s(?!type)/m.test(SRC.library) && !/^\s*import\s(?!type)/m.test(SRC.presenter))
const seletorHonesto = (src) => {
  const s = code(src)
  return /<span className="kpp-ai">\{copy\.ai\}<\/span>/.test(s) && (s.match(/<span className="kpp-ai">\{copy\.ai\}<\/span>/g) || []).length >= 3 && // cartão, mídia do destaque, nome do destaque
    /\{copy\.hint\} \{copy\.vary\}/.test(s) && /type="radio"/.test(s) &&
    !/\b(rating|ratings|stars?|review|reviews|testimonial|★|⭐|\d(\.\d)?\s*\/\s*5|trusted by|customers love)\b/i.test(s.replace(/prefers-reduced-motion/g, ''))
}
await check('6b seletor: selo "AI" no cartão e no destaque (≥ 3), frase de honestidade no topo, rádio de verdade; NENHUMA nota/estrela/avaliação/depoimento', () => seletorHonesto(SRC.picker))
await check('6c o aviso "Made with AI" da entrega continua nas 16 línguas (lib v2AiLabel intocada desde a base)', () => SRC.label === atBase(F.label))
await check('6d o guardião FTC (scripts/test-ator-sem-depoimento-1310.mjs) continua VERDE', () => spawnSync(process.execPath, ['scripts/test-ator-sem-depoimento-1310.mjs'], { cwd: ROOT, encoding: 'utf8', timeout: 120000 }).status === 0)

// ═══ 7. medição ═════════════════════════════════════════════════════════════════════════════════════════════════════
const medicaoOk = (evSrc, sinkSrc, planSrc) => {
  const E = world({ [F.events]: evSrc }).load(F.events)
  const plan = code(planSrc)
  return E.isAdsEvent('ads_presenter_selected') && E.ADS_SERVER_ONLY_EVENTS.includes('ads_presenter_selected') && /'ads_presenter_selected',/.test(sinkSrc) &&
    /if \(presenter\) await writeServerEvent\(\{ name: 'ads_presenter_selected', userId: uid, path: '\/api\/ads\/v2\/plan', metadata: \{ order_id: order\.id, presenter_id: presenter\.presenterId \?\? 'auto', picked: !!presenter\.presenterId,/.test(plan) &&
    plan.indexOf("name: 'ads_presenter_selected'") > plan.indexOf('await served(true,') && /\.\.\.\(presenter \? \{ presenter \} : \{\}\) \}/.test(plan)
}
await check('7a evento ads_presenter_selected: na lista, só de servidor (lib e sink), gravado pelo /plan DEPOIS do plano servido, com order_id e o id (ou "auto"); o id mora no plano do pedido', () => medicaoOk(SRC.events, SRC.sink, SRC.plan))

// ═══ 8. mutantes ════════════════════════════════════════════════════════════════════════════════════════════════════
const mutante = async (nome, file, de, para, aindaPassa) => {
  const src = read(file)
  let m = src
  let aplicou = false
  try { m = trocar(src, de, para); aplicou = m !== src && m.includes(para) } catch (e) { console.log('       (' + e.message + ')') }
  let passa = true
  try { passa = !!(await aindaPassa(m)) } catch { passa = false }
  ok(aplicou && !passa, `8 mutante: ${nome} fica vermelho`)
}
const comPresenter = (src) => world({ [F.presenter]: src }).load(F.presenter)
await mutante('contrato aceitando qualquer id', F.contract, " || !(ADS_V2_CONTRACT_PRESENTER_IDS as readonly string[]).includes(b.presenter_id)) return fail('bad_presenter_id')", ") return fail('bad_presenter_id')",
  (m) => contratoFechado(world({ [F.contract]: m }).load(F.contract)))
await mutante('contrato aceitando id sem o ator ligado', F.contract, "    if (!presenter || typeof b.presenter_id", "    if (typeof b.presenter_id",
  (m) => contratoFechado(world({ [F.contract]: m }).load(F.contract)))
await mutante('Sofia com outra descrição (sai do sorteio de sempre)', F.presenter, "look: 'a friendly woman in her late twenties with long dark wavy hair', pronoun: 'She', voice: { engine: 'minimax' }, portrait: `${P}sofia.webp`",
  "look: 'a friendly woman in her late twenties with long dark wavy hair and glasses', pronoun: 'She', voice: { engine: 'minimax' }, portrait: `${P}sofia.webp`", (m) => bibliotecaOk(comPresenter(m), C))
await mutante('homem com a voz feminina de sempre', F.presenter, "voice: { engine: 'eleven', voice: 'Brian' }, portrait: `${P}marcus.webp`", // reancorado KINEO-ATORES-IA-RETRATOS-2026-10-13
  "voice: { engine: 'minimax' }, portrait: `${P}marcus.webp`", (m) => bibliotecaOk(comPresenter(m), C))
await mutante('apresentador de 19 anos', F.presenter, "{ id: 'yasmin', name: 'Yasmin', gender: 'woman', ageMin: 25,", "{ id: 'yasmin', name: 'Yasmin', gender: 'woman', ageMin: 19,", (m) => bibliotecaOk(comPresenter(m), C))
await mutante('espelho do contrato sem um id', F.contract, "'lucia', 'yasmin'] as const", "'lucia'] as const", (m) => bibliotecaOk(P, world({ [F.contract]: m }).load(F.contract)))
await mutante('escolha ignorada (sempre o sorteio)', F.presenter, '  const pick = adsV2PresenterById(input.presenterId)\n', '  const pick = adsV2PresenterById(null)\n',
  (m) => { const Pm = comPresenter(m); return Pm.planAdsV2Presenter({ sector: 'store', photos: FOTOS, seedKey: ORDERS[2], presenterId: 'marcus' })?.presenterId === 'marcus' })
await mutante('prompt do homem com "She"', F.presenter, '    `${pronoun} holds the product from the reference photo in one hand near ${their} face and chest, label facing the camera, clearly visible.`,',
  "    'She holds the product from the reference photo in one hand near her face and chest, label facing the camera, clearly visible.',",
  (m) => { const Pm = comPresenter(m); const pr = Pm.planAdsV2Presenter({ sector: 'gym', photos: FOTOS, seedKey: ORDERS[1], presenterId: 'kenji' }).actorPrompt; return /He holds/.test(pr) && !/\bShe\b/.test(pr) })
await mutante('padrão mudado (sorteio com outra semente)', F.presenter, '  let h = 0x811c9dc5\n', '  let h = 0x811c9dc6\n', (m) => padraoIgual(comPresenter(m)))
await mutante('voz da montagem sem reserva (pedido trava se a ElevenLabs cair)', F.advance, '    if (!fallbackToDefault) throw e\n', '    throw e\n', (m) => vozOk(m))
await mutante('voz do ator caindo na voz de sempre (mulher na boca de homem)', F.advance, '    if (!fallbackToDefault) throw e\n', '', (m) => vozOk(m))
await mutante('ElevenLabs com parâmetro inventado', F.tts, '  return { text, voice, stability: 0.5 }\n}', '  return { text, voice, stability: 0.5, speed: 1.2 } as never\n}', (m) => elevenOk(m))
await mutante('retrato apontando arquivo que não existe', F.presenter, "portrait: `${P}clara.webp`, clip: null", "portrait: `${P}clara-nao-existe.webp`, clip: null", // reancorado KINEO-ATORES-IA-RETRATOS-2026-10-13
  (m) => arquivosOk(comPresenter(m).ADS_V2_PRESENTER_LIBRARY))
await mutante('amostra marcada pendente com o arquivo lá (a tela esconderia a voz)', F.presenter, "clip: `${P}amara.mp4`, voiceSample: `${P}amara-voice.mp3` },", "clip: `${P}amara.mp4`, voiceSample: null },",
  (m) => arquivosOk(comPresenter(m).ADS_V2_PRESENTER_LIBRARY))
await mutante('cartão sem o selo AI', F.picker, '            <span className="kpp-ai">{copy.ai}</span>\n            <span className="kpp-check"', '            <span className="kpp-check"', (m) => seletorHonesto(m))
await mutante('nota de estrelas inventada no cartão', F.picker, '          <span className="kpp-tag">{p ? copy.tags[p.tag] : copy.autoLine}</span>', '          <span className="kpp-tag">{p ? copy.tags[p.tag] : copy.autoLine} ★ 4.9 rating</span>', (m) => seletorHonesto(m))
await mutante('frase de honestidade fora do topo', F.picker, '<p className="kpp-hint">{copy.hint} {copy.vary}</p>', '<p className="kpp-hint">{copy.vary}</p>', (m) => seletorHonesto(m))
// reancorado KINEO-LEVA6-1310 — com o lote, a linha marcada do apresentador deixou de ser a última da lista só-servidor;
// o mutante tira a MESMA linha marcada (inteira, única: a de ADS_EVENTS não tem o comentário) sem depender do "]" seguinte.
await mutante('evento aberto ao navegador (fora do só-servidor)', F.events, "  'ads_presenter_selected', // KINEO-ATORES-IA-2026-10-13\n", '', (m) => medicaoOk(m, SRC.sink, SRC.plan))
await mutante('frase faltando numa língua', F.library, "    voiceSoon: 'Sắp có giọng mẫu',\n", '', (m) => copyOk(world({ [F.library]: m }).load(F.library).ADS_V2_PRESENTER_PICKER_COPY))
await mutante('língua copiada do inglês', F.library, "    title: 'Escolha o apresentador',", "    title: 'Choose your presenter',", (m) => copyOk(world({ [F.library]: m }).load(F.library).ADS_V2_PRESENTER_PICKER_COPY))

console.log(`\ntest-atores-ia-1310: ${pass} ok · ${fail} falhas`)
if (fail) process.exit(1)
