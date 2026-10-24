// KINEO-IDIOMAS-FORMATOS-2410 — raw code, isolated mocks; no service, secret or paid request.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
const ROOT = path.resolve(import.meta.dirname, '..'); process.chdir(ROOT)
const rd = p => fs.readFileSync(path.join(ROOT, p), 'utf8').replace(/\r\n/g, '\n')
const enumBoosts = ['Chinese','Chinese,Yue','English','Arabic','Russian','Spanish','French','Portuguese','German','Turkish','Dutch','Ukrainian','Vietnamese','Indonesian','Japanese','Italian','Korean','Thai','Polish','Romanian','Greek','Czech','Finnish','Hindi','Bulgarian','Danish','Hebrew','Malay','Slovak','Swedish','Croatian','Hungarian','Norwegian','Slovenian','Catalan','Nynorsk','Afrikaans']
const json = x => JSON.parse(JSON.stringify(x))
function modules(overrides = {}, mocks = {}) {
  const calls = { fal: [], openai: [] }
  const forbid = () => { throw Error('offline: service forbidden') }
  const load = createOfflineLoader({
    mocks: {
      '@fal-ai/client': { fal: { config: forbid, subscribe: forbid } },
      '@/lib/serverEvents': { writeServerEvent: forbid }, '@/lib/openaiAlert': {}, '@/lib/falAlert': {}, '@/lib/llmFallback': {},
      '@/lib/openai': { buildCaptionSegments: forbid, pickHighlightWord: forbid, OPENAI_TTS_TIMEOUT_MS: 1, OPENAI_WHISPER_TIMEOUT_MS: 1, openai: { audio: { speech: { create: async (...a) => { calls.openai.push(a); return { arrayBuffer: async () => Buffer.from('old-voice') } } } } } },
      ...mocks,
    },
    source: (p, s) => overrides[p] ?? s,
  })
  return { load, calls, T: load('@/lib/textLanguage'), K: load('@/lib/kidsCartoon/kidsCartoon'), V: load('@/lib/ads/cena/voice95'), F: load('@/lib/ttsFallback') }
}
let pass = 0
async function check(name, fn) { await fn(); console.log('ok — ' + name); pass++ }
function contract(M) {
  const {T,K,V,F} = M
  assert.equal(T.NARRATION_LANGUAGES.length, 39)
  assert.equal(new Set(T.NARRATION_LANGUAGE_CODES).size, 39)
  assert.equal(T.NARRATION_LANGUAGES.filter(l => l.minimaxPrimary).length, 22)
  assert.deepEqual(json(T.NARRATION_LANGUAGES.filter(l => l.minimaxBoost).map(l => l.minimaxBoost).sort()), enumBoosts.toSorted())
  assert.deepEqual(json(K.KIDS_CARTOON_LANGUAGES), json(T.NARRATION_LANGUAGE_CODES))
  assert.equal(T.minimaxLanguageBoost('yue'), 'Chinese,Yue')
  assert.deepEqual(json(F.ttsFallbackInput('Hello')), { prompt: 'Hello', output_format: 'url', language_boost: 'auto' })
  for (const row of T.NARRATION_LANGUAGES) {
    assert.equal(T.narrationLanguage(row.code.toUpperCase()), row.code)
    assert.equal(T.resolveNarrationLanguage(row.code, 'x').language, row.code)
    assert.equal(K.isKidsCartoonLanguage(row.code), true)
    const request = K.validateKidsCartoonRequest({ character: 'leo', language: row.code, duration: 15, ideaId: 'rain' })
    assert.equal(request.ok, true); assert.equal(request.value.language, row.code); assert.ok(request.value.idea)
    assert.ok(K.kidsStoryWriterPrompt({ request: request.value, minWords: 20, maxWords: 25 }).system.includes(row.name))
    const voice = V.cena95NarratedVoiceRequest({ text: 'A complete story.', language: row.code, gender: 'female', age: 'adult' })
    assert.equal(voice.input.language_boost, row.minimaxBoost ?? 'auto'); assert.ok(voice.input.voice_setting.voice_id)
    const input = F.ttsFallbackInput('A complete story.', row.code, 1.1)
    assert.equal(input.language_boost, row.minimaxBoost ?? 'auto')
    if (row.minimaxPrimary) { assert.equal(T.usesMiniMaxNarration(row.code), true); assert.equal(input.voice_setting.voice_id, T.minimaxVoiceFor(row.code)); assert.equal(input.voice_setting.speed, 1.1) }
  }
  for (const [code,font] of Object.entries({zh:'Noto Sans SC',yue:'Noto Sans TC',ja:'Noto Sans JP',ko:'Noto Sans KR',th:'Noto Sans Thai',he:'Noto Sans Hebrew',hi:'Noto Sans Devanagari',ar:'Noto Sans Arabic',ur:'Noto Sans Arabic',bn:'Noto Sans Bengali',el:'Noto Sans'})) assert.equal(T.captionFontFor(code), font)
  for (const [code,text] of Object.entries({ zh:'小鸟飞过天空。朋友一起回家！', yue:'小鳥飛過天空。朋友一齊返屋企！', ja:'小鳥は空を飛びました。友達と一緒に帰ろう！', th:'นกน้อยบินข้ามท้องฟ้าและกลับบ้านกับเพื่อน' })) { const tokens=T.narrationTokens(text,code); assert.ok(tokens.length>3); assert.equal(T.joinNarrationTokens(tokens,code),text); assert.equal(K.kidsWordCount(text),T.narrationWordCount(text,code)) }
  assert.equal(T.narrationWordCount('  Same old   words. '),3)
  for (const [code, text] of [['ja', 'これは Apple Watch です。'], ['th', 'ลอง Apple Watch แล้วไปเดินเล่น 👋🏽']]) assert.equal(T.joinNarrationTokens(T.narrationTokens(text, code), code), text, 'mixed product names and graphemes remain unchanged')
  assert.equal(T.joinNarrationTokens(['Apple ', 'Watch ']), 'Apple Watch ', 'a Latin-only page from compact segmentation keeps its original separators')
  assert.equal(T.joinNarrationTokens(['A small', 'bird']), 'A small bird', 'Latin line wrapping still inserts the natural word separator')
  assert.deepEqual(json(T.HOLLYWOOD_LANGUAGES), ['en','pt','es'])
  assert.equal(T.usesMiniMaxNarration('ur'),false); assert.equal(T.minimaxLanguageBoost('ur'),'auto'); assert.equal(T.usesMiniMaxNarration('bn'),false)
}
await check('catálogo, boosts, vozes, scripts e fontes reais nos 39 códigos', () => contract(modules()))
await check('o Studio de filme e Cartoon leem a lista única; idioma da interface separado', () => {
  assert.match(rd('app/(dashboard)/studio/StudioClient.tsx'), /NARRATION_LANGUAGES\.map/)
  const ui=rd('components/kidsCartoon/KidsCartoonTemplate.tsx'); assert.match(ui,/NARRATION_LANGUAGES\.map/); assert.match(ui,/ideaLang: 'en' \| 'pt' \| 'es'/); assert.ok(!ui.includes('var(--paper)')); assert.match(ui,/colorScheme: 'inherit'/)
  assert.equal((rd('lib/ads/cena/runtime.ts').match(/language: state\.plan\.input\.language/g)??[]).length,2)
})
await check('generateTTS e cache escolhem MiniMax apenas nas línguas novas', async () => {
  const s=rd('lib/compose.ts'); assert.match(s,/if \(usesMiniMaxNarration\(language\)\) \{[\s\S]*?synthesizeTtsFallback\(cleaned, \{ language, speed \}\)/)
  const M=modules(); const C=M.load('@/lib/compose')
  for(const code of ['zh','yue','ja','ko','th','he','af']) { const id=C.resolveTtsVoiceIdentity('sample',1.1,undefined,'free',code,'tts-1-hd');assert.equal(id.model,'fal-ai/minimax/speech-2.8-hd');assert.equal(id.voice,M.T.minimaxVoiceFor(code));assert.equal(id.speed,1.1) }
  assert.equal(C.resolveTtsVoiceIdentity('sample',1,undefined,'free','en','tts-1-hd').model,'tts-1-hd')
  const calls = [], R = modules({}, { '@/lib/ttsFallback': { synthesizeTtsFallback: async (text, ctx) => { calls.push({ text, ctx }); return Buffer.from('offline-voice') } } }), raw = R.load('@/lib/compose')
  for (const row of R.T.NARRATION_LANGUAGES.filter(l => l.minimaxPrimary)) {
    const audio = await raw.generateTTS('A complete story.', 1.1, undefined, 'free', row.code)
    assert.equal(audio.toString(), 'offline-voice'); assert.equal(calls.at(-1).ctx.language, row.code)
  }
  assert.equal(calls.length, 22); assert.equal(R.calls.openai.length, 0)
})
await check('mutantes aplicados em memória derrubam o contrato', () => {
  const files={ T:'lib/textLanguage.ts', F:'lib/ttsFallback.ts' }
  const cases=[['falta finlandês',files.T,s=>s.replace(/^.*code: 'fi'.*\n/m,'')],['tailandês com fonte latina',files.T,s=>s.replace("captionFont: 'Noto Sans Thai'","captionFont: DEFAULT_CAPTION_FONT")],['boost cantonês errado',files.T,s=>s.replace("minimaxBoost: 'Chinese,Yue'","minimaxBoost: 'Chinese'")],['nova língua sem MiniMax',files.T,s=>s.replace("minimaxBoost: 'Japanese', minimaxPrimary: true","minimaxBoost: 'Japanese'")],['TTS perde boost',files.F,s=>s.replace('language_boost: minimaxLanguageBoost(language)',"language_boost: 'auto'")]]
  for(const [name,file,change] of cases){ const old=rd(file),mutated=change(old);assert.notEqual(mutated,old,name);assert.throws(()=>contract(modules({[file]:mutated})),{ code: 'ERR_ASSERTION' },name) }
})
console.log(`${pass} contratos passaram; 5 mutantes rejeitados; chamadas pagas: 0`)
