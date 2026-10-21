// KINEO-LEGENDA-BENGALI-2010 [TRAVA 8.2 — vai do fundador 20/10 "vai pra tudo"]
// Catálogo + payload REAL do montador, executados offline. Nenhum render, SDK ou rede.
// A base reproduz Montserrat para bn; a árvore escolhe Noto Sans Bengali.
// Todas as entradas antigas, fontes, detector e payloads ficam idênticos à base.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import ts from 'typescript'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
import { semLegendaBengali2010, MARCA_LEGENDA_BENGALI_2010 as MARCA, LEGENDA_BENGALI_2010_BASE as BASE, REGRAS_LEGENDA_BENGALI_2010 as REGRAS } from './test-support/desfaz-legenda-bengali-2010.mjs'
import { semAvatarEstorno2010, MARCA_AVATAR_ESTORNO_2010, REGRAS_AVATAR_ESTORNO_2010 } from './test-support/desfaz-avatar-estorno-2010.mjs'
import { semMenuUgc2010 } from './test-support/desfaz-menu-ugc-2010.mjs'
const ROOT = path.resolve(import.meta.dirname, '..')
process.chdir(ROOT)
const lf = s => String(s).replace(/\r\n/g, '\n')
const rd = p => lf(fs.readFileSync(path.join(ROOT, p), 'utf8'))
const git = (...args) => execFileSync('git', ['-C', ROOT, ...args], { encoding: 'utf8', maxBuffer: 1 << 26 })
const base = p => lf(git('show', `${BASE}:${p}`))
const F = 'lib/textLanguage.ts', COMPOSE = 'lib/compose.ts'
const BENGALI = 'বাংলার আকাশে একটি পাখি উড়ে যায়'
const json = value => JSON.parse(JSON.stringify(value))
let passed = 0
async function check(name, fn) { await fn(); passed++; console.log('ok — ' + name) }
function load(overrides = {}) {
  const forbidden = () => { throw new Error('Teste offline: serviço proibido') }
  const L = createOfflineLoader({
    mocks: { '@/lib/openai': { buildCaptionSegments: forbidden, pickHighlightWord: forbidden, OPENAI_TTS_TIMEOUT_MS: 1, OPENAI_WHISPER_TIMEOUT_MS: 1 } },
    source: (rel, source) => Object.hasOwn(overrides, rel) ? overrides[rel] : source,
  })
  return { T: L('@/lib/textLanguage'), compose: L('@/lib/compose') }
}
const OLD = load({ [F]: base(F) })
const samples = [BENGALI, 'The bird flew over the old house and then it found its way home.', 'O pássaro voou sobre a casa e depois ele voltou para o seu ninho.', 'La historia del pájaro que salió de su casa y volvió al nido.', '', 'x']
function caption(M, language, input = {}) {
  const code = M.T.narrationLanguage(language) ?? 'en' // mesma normalização do /compose e /compose/unlock
  const font = M.compose.setActiveCaptionFont(code)
  const elements = M.compose.buildCaptionElements({ text: BENGALI, time: 0.25, duration: 2, ...input })
  return { font, elements: json(elements) }
}
async function problems(overrides = {}) {
  const issues = []
  const run = (name, fn) => { try { fn() } catch (e) { issues.push(name + ': ' + e.message) } }
  let M
  try { M = load(overrides) } catch (e) { return ['carregamento: ' + e.message] }
  const T = M.T
  run('catálogo e normalização bn', () => {
    assert.match(overrides[F] ?? rd(F), /^export type NarrationLanguage = .*'bn'/m)
    assert.equal(T.NARRATION_LANGUAGE_CODES.length, OLD.T.NARRATION_LANGUAGE_CODES.length + 1)
    assert.equal(T.NARRATION_LANGUAGES.filter(l => l.code === 'bn').length, 1)
    assert.equal(T.narrationLanguage('bn'), 'bn'); assert.equal(T.narrationLanguage(' BN '), 'bn')
    assert.equal(T.LANGUAGE_NAMES.bn, 'Bengali')
    assert.equal(T.resolveNarrationLanguage('bn', BENGALI).language, 'bn')
    assert.equal(T.captionFontFor('bn'), 'Noto Sans Bengali'); assert.equal(T.captionFontFor(' BN '), 'Noto Sans Bengali')
    assert.equal(T.isHollywoodLanguage('bn'), false)
  })
  run('demais línguas, fontes e detector equivalentes', () => {
    assert.deepEqual(json(T.NARRATION_LANGUAGES.filter(l => l.code !== 'bn')), json(OLD.T.NARRATION_LANGUAGES))
    assert.deepEqual(json(T.HOLLYWOOD_LANGUAGES), json(OLD.T.HOLLYWOOD_LANGUAGES))
    assert.equal(T.DEFAULT_CAPTION_FONT, OLD.T.DEFAULT_CAPTION_FONT)
    for (const raw of [...OLD.T.NARRATION_LANGUAGE_CODES, 'xx', 'ja', '', null, undefined]) {
      assert.equal(T.narrationLanguage(raw), OLD.T.narrationLanguage(raw), String(raw))
      assert.equal(T.captionFontFor(raw), OLD.T.captionFontFor(raw), String(raw))
      for (const text of samples) assert.deepEqual(json(T.resolveNarrationLanguage(raw, text)), json(OLD.T.resolveNarrationLanguage(raw, text)))
    }
    for (const text of samples) assert.deepEqual(json(T.detectNarrationLanguage(text)), json(OLD.T.detectNarrationLanguage(text)))
  })
  run('payload real bengali, simples e karaoke', () => {
    const plain = caption(M, 'bn')
    assert.equal(plain.font, 'Noto Sans Bengali')
    assert.equal(plain.elements.length, 1); assert.equal(plain.elements[0].text, BENGALI)
    assert.equal(plain.elements[0].font_family, 'Noto Sans Bengali')
    const words = [{ word: 'বাংলার', start: 0.25, end: 1 }, { word: 'আকাশে', start: 1, end: 2.25 }]
    const karaoke = caption(M, 'bn', { text: 'বাংলার আকাশে', karaokeWords: words })
    assert.equal(karaoke.elements.length, 2)
    assert.ok(karaoke.elements.every(e => e.font_family === 'Noto Sans Bengali' && e.text.includes('বাংলার')))
    const withoutFont = e => { const out = { ...e }; delete out.font_family; return out }
    assert.deepEqual(plain.elements.map(withoutFont), caption(OLD, 'bn').elements.map(withoutFont))
  })
  run('payloads antigos exatos e fonte reiniciada entre pedidos', () => {
    for (const raw of [...OLD.T.NARRATION_LANGUAGE_CODES, 'xx', null, undefined]) {
      caption(M, 'bn')
      assert.deepEqual(caption(M, raw), caption(OLD, raw), String(raw))
    }
    for (const [language, font] of [['bn', 'Noto Sans Bengali'], ['hi', 'Noto Sans Devanagari'], ['en', 'Montserrat'], ['ar', 'Noto Sans Arabic'], ['bn', 'Noto Sans Bengali']]) {
      const out = caption(M, language); assert.equal(out.font, font); assert.ok(out.elements.every(e => e.font_family === font))
    }
  })
  return issues
}
await check('BASE reproduz o defeito: bn vira en/Montserrat no caminho do montador', () => {
  assert.equal(OLD.T.narrationLanguage('bn'), null)
  assert.equal(caption(OLD, 'bn').font, 'Montserrat')
  assert.equal(caption(OLD, 'bn').elements[0].font_family, 'Montserrat')
})
await check('catálogo atual, payload real e equivalência das outras línguas', async () => assert.deepEqual(await problems(), []))
await check('rotas e montador intactos; os dois caminhos continuam usando a fonte do idioma', () => {
  for (const file of [COMPOSE, 'app/api/compose/route.ts', 'app/api/compose/unlock/route.ts']) assert.equal(rd(file), base(file), file)
  assert.match(rd('app/api/compose/route.ts'), /const language = narrationLanguage\(body.language\) \?\? 'en'/)
  assert.equal((rd('app/api/compose/route.ts').match(/setActiveCaptionFont\(language\)/g) ?? []).length, 2)
  assert.match(rd('app/api/compose/unlock/route.ts'), /setActiveCaptionFont\(language\)/)
})
await check('catálogo SEO preservado: ajuste apenas no tipo, JavaScript idêntico à base', () => {
  const file = 'lib/seo/freeShortsGeneratorLangs.ts'
  const compile = src => ts.transpileModule(src, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, removeComments: true } }).outputText
  assert.match(rd(file), /code: Exclude<NarrationLanguage, 'en' \| 'pt' \| 'es' \| 'bn'>/)
  assert.equal(compile(rd(file)), compile(base(file)))
})
for (const [name, file, before, after] of [
  ['bn sai do tipo', F, " | 'bn' // KINEO-LEGENDA-BENGALI-2010", ' // KINEO-LEGENDA-BENGALI-2010'],
  ['bn sai do catálogo', F, "  { code: 'bn', name: 'Bengali', native: 'বাংলা', captionFont: 'Noto Sans Bengali', rtl: false },", ''],
  ['bengali volta à Montserrat', F, "captionFont: 'Noto Sans Bengali'", "captionFont: 'Montserrat'"],
  ['bengali recebe devanágari', F, "captionFont: 'Noto Sans Bengali'", "captionFont: 'Noto Sans Devanagari'"],
  ['normalização perde maiúsculas', F, 'raw.trim().toLowerCase()', 'raw.trim()'],
  ['fonte padrão muda todas as línguas', F, "DEFAULT_CAPTION_FONT = 'Montserrat'", "DEFAULT_CAPTION_FONT = 'Noto Sans Bengali'"],
  ['setter ignora idioma', COMPOSE, 'ACTIVE_CAPTION_FONT = captionFontFor(language)', "ACTIVE_CAPTION_FONT = captionFontFor('en')"],
  ['payload fixa Montserrat', COMPOSE, 'font_family: ACTIVE_CAPTION_FONT,', "font_family: 'Montserrat',"],
  ['bn entra indevidamente na voz própria', F, "HOLLYWOOD_LANGUAGES = ['en', 'pt', 'es']", "HOLLYWOOD_LANGUAGES = ['en', 'pt', 'es', 'bn']"],
]) await check(`MUTANTE aplicado → vermelho: ${name}`, async () => {
  const src = rd(file); assert.equal(src.split(before).length, 2, 'âncora única presente')
  const mutant = src.replace(before, after); assert.notEqual(mutant, src)
  assert.ok((await problems({ [file]: mutant })).length > 0)
})
await check('desfaz exato, idempotente, CRLF, marcas e cadeia mais nova', () => {
  for (const file of Object.keys(REGRAS)) {
    const src = rd(file), old = base(file)
    assert.equal(semLegendaBengali2010(src, file), old, file)
    assert.equal(semLegendaBengali2010(old, file), old, file)
    assert.equal(semLegendaBengali2010(semLegendaBengali2010(src, file), file), old, file)
    assert.equal(semLegendaBengali2010(src.replace(/\n/g, '\r\n'), file), old.replace(/\n/g, '\r\n'), file)
    assert.equal(semLegendaBengali2010(src, file.replace(/\//g, '\\')), old, file)
    const diff = git('diff', '--unified=0', BASE, '--', file)
    for (const line of lf(diff).split('\n').filter(l => l.startsWith('+') && !l.startsWith('+++'))) assert.ok(line.includes(MARCA), file + ': linha nova sem marca')
  }
  assert.equal(semAvatarEstorno2010(rd(F), F), base(F))
  assert.equal(semMenuUgc2010(rd(F), F), base(F))
  assert.equal(semLegendaBengali2010(MARCA, 'arquivo-fora'), MARCA)
  assert.throws(() => semLegendaBengali2010(rd(F).replace(/^.*code: 'bn'.*\n/m, ''), F))
})
await check('MUTANTE aplicado → vermelho: cabeça deixa de chamar a camada Bengali', () => {
  const file = 'scripts/test-support/desfaz-avatar-estorno-2010.mjs', src = rd(file)
  const anchor = '  texto = semLegendaBengali2010(texto, p)'
  assert.ok(src.includes(anchor)); const mutant = src.replace(anchor, '  // chamada retirada:')
  assert.notEqual(mutant, src)
  const compile = text => new Function('semLegendaBengali2010', 'MARCA_AVATAR_ESTORNO_2010', 'REGRAS_AVATAR_ESTORNO_2010', text.slice(text.indexOf('export function semAvatarEstorno2010')).replace('export function', 'function') + '\nreturn semAvatarEstorno2010')(semLegendaBengali2010, MARCA_AVATAR_ESTORNO_2010, REGRAS_AVATAR_ESTORNO_2010)
  assert.equal(compile(src)(rd(F), F), base(F))
  assert.notEqual(compile(mutant)(rd(F), F), base(F), 'a comparação byte a byte da cadeia fica vermelha')
})
console.log(`${passed} provas verdes; mutantes acima foram detectados em memória`)
