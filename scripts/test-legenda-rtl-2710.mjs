// KINEO-LEGENDA-RTL-2710 [TRAVA 8.2 — vai do fundador 27/10 "faz todos esses consertos de 1 a 6"]
// Guardião da legenda da direita para a esquerda. Caso real: render c5e68914-53a6-4f30-99a7-d7b0a96ae93f (filme grátis
// de 15 s em urdu, 27/10 17:42Z) — a narração estava certa e a legenda queimada mostrava as palavras fora de ordem:
// "چھوٹا سا راز ایک" no lugar de "ایک چھوٹا سا راز", "کو ملا ایک جادوئی آمنہ" no lugar de "آمنہ کو ملا ایک جادوئی".
// Causa: o karaokê embrulha a palavra corrente em [color]…[/color] e o Creatomate dispõe as corridas LTR.
// Tudo offline: módulos reais transpilados, sem rede, SDK, render ou crédito. A BASE (origin/main b5f25b397) é
// carregada do git para provar o defeito e a identidade byte a byte das línguas LTR.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(ROOT)
const BASE = 'b5f25b397'
const MARCA = 'KINEO-LEGENDA-RTL-2710'
const FILES = { T: 'lib/textLanguage.ts', C: 'lib/compose.ts', F: 'lib/filmes/faceless15.ts', A: 'lib/ads/cena/captions95.ts', M: 'lib/ads/cena/montage95.ts' }
const lf = (s) => String(s).replace(/\r\n/g, '\n')
const rd = (p) => lf(fs.readFileSync(path.join(ROOT, p), 'utf8'))
const git = (...args) => execFileSync('git', ['-C', ROOT, ...args], { encoding: 'utf8', maxBuffer: 1 << 26 })
const base = (p) => lf(git('show', `${BASE}:${p}`))
const json = (v) => JSON.parse(JSON.stringify(v))

function load(overrides = {}) {
  const forbidden = () => { throw new Error('Teste offline: serviço proibido') }
  const L = createOfflineLoader({
    mocks: { '@/lib/openai': { buildCaptionSegments: forbidden, pickHighlightWord: () => null, OPENAI_TTS_TIMEOUT_MS: 1, OPENAI_WHISPER_TIMEOUT_MS: 1 } },
    source: (rel, src) => (Object.hasOwn(overrides, rel) ? overrides[rel] : src),
  })
  return { T: L('@/lib/textLanguage'), C: L('@/lib/compose'), F: L('@/lib/filmes/faceless15'), A: L('@/lib/ads/cena/captions95') }
}
const NEW = load()
const OLD = load(Object.fromEntries(Object.values(FILES).map((p) => [p, base(p)])))

// ── A narração REAL do render (as três primeiras frases) ────────────────────────────────────────────────────────────
const URDU = 'ایک چھوٹا سا راز... جادوئی ستارے کا! آمنہ کو ملا ایک جادوئی ستارہ، چمکدار اور پراسرار۔'
const ENGLISH = 'A tiny little secret... of a magic star! Amna found a magic star, shiny and mysterious.'
const ARABIC = 'في قديم الزمان كان هناك ملك عادل يحكم مدينة كبيرة.'
const HEBREW = 'פעם אחת היה מלך שחי בעיר גדולה מאוד.'
const PERSIAN = 'یک راز کوچک درباره ستاره جادویی.'
const norm = (s) => String(s).split(/\s+/u).map((w) => w.replace(/[^\p{L}\p{N}]/gu, '')).filter(Boolean).join(' ')
/** Palavras Whisper sintéticas: 0,35 s por palavra, fim de frase na pontuação (incluindo o ponto urdu ۔ e o "!"). */
const W = (text, step = 0.35) => text.split(/\s+/u).filter(Boolean).map((word, i, a) => ({
  word, start: +(i * step).toFixed(3), end: +((i + 1) * step).toFixed(3),
  sentenceEnd: i === a.length - 1 || /[.!?۔]["'”’)\]]*$/u.test(word) && !/\.\.\.$/.test(word),
}))
const urduWords = W(URDU)
const englishWords = W(ENGLISH)

let passed = 0
async function check(name, fn) { await fn(); passed++; console.log('ok — ' + name) }

/** Legenda de um chunk no caminho do karaokê (o que o filme de 15 s e os clássicos usam). */
function caption(M, language, text, words, extra = {}) {
  M.C.setActiveCaptionFont(language)
  return json(M.C.buildCaptionElements({ text, time: words[0].start, duration: +(words[words.length - 1].end - words[0].start + 0.4).toFixed(3), highlight: null, karaokeWords: words, ...extra }))
}
/** Source mínimo do filme de 15 s: voz na trilha 4, uma legenda antiga na 5. */
function filme15(M, words, language = 'en', total = 15) {
  M.C.setActiveCaptionFont(language) // a rota chama setActiveCaptionFont(language) antes de montar; aqui o mesmo
  const source = { duration: total, elements: [
    { type: 'audio', track: 4, time: 0, duration: +(words[words.length - 1].end + 0.3).toFixed(3) },
    { type: 'text', track: 5, time: 0, duration: total, text: 'OLD CAPTION', font_size: 62 },
  ] }
  const quadro = M.F.lerQuadroFaceless15(source, words)
  const out = M.F.aplicarF1Faceless15(source.elements, quadro, words)
  return { legendas: json(out.els.filter((e) => e.type === 'text' && e.track === 5)), relato: json(out.relato) }
}
function ads(M, language, text, step = 0.3) {
  const words = M.T.narrationTokens(text).map((word, i) => ({ word, start: +(i * step).toFixed(3), end: +((i + 1) * step).toFixed(3) }))
  return json(M.A.cena95Captions({ text, language, words }).elements)
}

/** Todas as provas do comportamento novo — reaproveitadas pelos mutantes. */
function problems(M) {
  const issues = []
  const run = (name, fn) => { try { fn() } catch (e) { issues.push(name + ': ' + e.message) } }
  run('detector por escrita', () => {
    for (const t of [URDU, ARABIC, HEBREW, PERSIAN, 'ایک', '١٢٣ ریال', 'پښتو ژبه', 'سنڌي', 'כן']) assert.equal(M.T.textDirectionOf(t), true, t)
    for (const t of [ENGLISH, 'Olá mundo', 'हिन्दी', 'বাংলা', '普通话', 'Привет', '2024 was wild', '(hello)']) assert.equal(M.T.textDirectionOf(t), false, t)
    for (const t of ['2024!', '...', '', '  ', null, undefined, 42]) assert.equal(M.T.textDirectionOf(t), null, String(t))
    for (const t of [URDU, ARABIC, HEBREW, 'x ایک']) assert.equal(M.T.hasRtlScript(t), true)
    assert.equal(M.T.hasRtlScript(ENGLISH), false)
  })
  run('detector por idioma', () => {
    for (const code of ['ur', 'ar', 'he', ' AR ']) assert.equal(M.T.isRtlLanguage(code), true, code)
    for (const code of ['en', 'pt', 'es', 'hi', 'bn', 'fa', 'xx', '', null, undefined]) assert.equal(M.T.isRtlLanguage(code), false, String(code))
    assert.equal(M.T.isRtlCaption('2024!', 'ar'), true)
    assert.equal(M.T.isRtlCaption('2024!', 'en'), false)
    assert.equal(M.T.isRtlCaption(ENGLISH, 'ar'), false, 'texto com letra decide sozinho')
    assert.equal(M.T.isRtlCaption(URDU, 'en'), true, 'urdu com interface em inglês continua RTL')
  })
  run('chunk urdu: um elemento inteiro, ordem lógica, text_direction rtl, sem span', () => {
    const chunk = urduWords.slice(0, 4) // ایک چھوٹا سا راز...
    for (const language of ['ur', 'en', 'ar', 'hi']) {
      const els = caption(M, language, chunk.map((w) => w.word).join(' '), chunk)
      assert.equal(els.length, 1, language + ': um elemento por chunk (sem karaokê)')
      assert.equal(els[0].text, 'ایک چھوٹا سا راز...')
      assert.ok(!els[0].text.includes('[color'), 'nenhum span')
      assert.equal(els[0].text_direction, 'rtl')
      assert.equal(els[0].x_alignment, '50%', '9:16 centralizado (vem de lib/aspect.ts desde 14/10 — direção não muda a âncora)')
      assert.equal(els[0].fill_color, '#ffffff')
      assert.equal(els[0].font_family, M.T.captionFontFor(language), 'a fonte continua a do idioma')
    }
    for (const [text, words] of [[ARABIC, W(ARABIC)], [HEBREW, W(HEBREW)], [PERSIAN, W(PERSIAN)]]) {
      const els = caption(M, 'en', text, words)
      assert.equal(els.length, 1); assert.equal(els[0].text_direction, 'rtl'); assert.equal(els[0].text, text)
    }
    // ênfase de linha inteira (payoff amarelo) continua funcionando sem span
    const amarelo = caption(M, 'ur', 'چمکدار اور پراسرار۔', urduWords.slice(-3), { emphasize: true })
    assert.equal(amarelo.length, 1); assert.equal(amarelo[0].fill_color, '#FFD700'); assert.equal(amarelo[0].text_direction, 'rtl')
  })
  run('sem letra forte: o idioma do filme decide (e volta ao normal no pedido seguinte)', () => {
    const digits = [{ word: '2024!', start: 0, end: 0.4 }, { word: '50%', start: 0.4, end: 0.8 }]
    const ar = caption(M, 'ar', '2024! 50%', digits)
    assert.equal(ar.length, 1); assert.equal(ar[0].text_direction, 'rtl'); assert.ok(!ar[0].text.includes('[color'))
    const en = caption(M, 'en', '2024! 50%', digits)
    assert.equal(en[0].text_direction, undefined); assert.ok(en.length > 1 && en.some((e) => e.text.includes('[color')), 'inglês mantém o karaokê')
    assert.deepEqual(en, caption(OLD, 'en', '2024! 50%', digits))
  })
  run('filme de 15 s em urdu: cada legenda na ordem da fala, uma por chunk, RTL', () => {
    const { legendas, relato } = filme15(M, urduWords, 'ur')
    assert.equal(relato.chunker, 'whisper')
    assert.ok(relato.chunks >= 3 && relato.palavrasMax <= 5, JSON.stringify(relato))
    assert.equal(legendas.length, relato.chunks, 'um elemento por chunk: nada de karaokê em RTL')
    assert.equal(norm(legendas.map((e) => e.text).join(' ')), norm(URDU), 'as palavras na ordem exata da narração')
    assert.equal(legendas[0].text, 'ایک چھوٹا سا راز...', 'a primeira legenda é a que saiu errada no render')
    for (const e of legendas) {
      assert.equal(e.text_direction, 'rtl'); assert.ok(!e.text.includes('[color')); assert.equal(e.x_alignment, '50%')
      assert.equal(e.y, '62%'); assert.equal(e.font_family, M.T.captionFontFor('ur'))
      assert.ok(URDU.includes(e.text), 'o texto do chunk é um trecho literal (contíguo) da narração: ' + e.text)
    }
    for (let i = 1; i < legendas.length; i++) assert.ok(Math.abs(legendas[i - 1].time + legendas[i - 1].duration - legendas[i].time) < 1e-6, 'contíguas')
  })
  run('inglês byte a byte igual à base (chunk, filme de 15 s, todos os idiomas LTR do catálogo)', () => {
    const chunk = englishWords.slice(0, 4)
    for (const language of [...M.T.NARRATION_LANGUAGE_CODES.filter((c) => !M.T.isRtlLanguage(c)), 'xx', null, undefined]) {
      for (const extra of [{}, { hook: true }, { emphasize: true }, { karaokeWords: undefined }]) {
        assert.deepEqual(caption(M, language, 'A tiny little secret...', chunk, extra), caption(OLD, language, 'A tiny little secret...', chunk, extra), String(language) + JSON.stringify(extra))
      }
    }
    // idioma RTL escolhido na interface mas texto latino: o texto decide, nada muda
    assert.deepEqual(caption(M, 'ar', 'A tiny little secret...', chunk), caption(OLD, 'ar', 'A tiny little secret...', chunk))
    assert.deepEqual(filme15(M, englishWords, 'en'), filme15(OLD, englishWords, 'en'))
    assert.deepEqual(filme15(M, englishWords, 'ar'), filme15(OLD, englishWords, 'ar'), 'interface em árabe, roteiro em inglês: o texto decide')
    const urduNaInterfaceInglesa = filme15(M, urduWords, 'en').legendas
    assert.ok(urduNaInterfaceInglesa.length > 0 && urduNaInterfaceInglesa.every((e) => e.text_direction === 'rtl' && !e.text.includes('[color')), 'urdu com interface em inglês continua RTL')
    const hindi = W('एक छोटा सा रहस्य जादुई सितारे का।')
    assert.deepEqual(caption(M, 'hi', hindi.map((w) => w.word).join(' '), hindi), caption(OLD, 'hi', hindi.map((w) => w.word).join(' '), hindi))
    assert.ok(caption(M, 'en', 'A tiny little secret...', chunk).length > 1, 'o karaokê inglês continua ligado')
  })
  run('Studio Ads (captions95): urdu sem span e RTL; inglês e português iguais à base', () => {
    for (const language of ['ur', 'en', 'pt']) { // o texto decide: urdu com a interface em inglês/português continua RTL
      const ur = ads(M, language, 'یہ جوتا بہت ہلکا ہے اور دن بھر آرام دیتا ہے۔')
      assert.ok(ur.length > 0)
      for (const e of ur) { assert.equal(e.text_direction, 'rtl', language); assert.ok(!String(e.text).includes('[color'), e.text) }
    }
    for (const [language, text] of [['en', 'This shoe is light and keeps you comfortable all day long.'], ['pt', 'Este tênis é leve e deixa você confortável o dia inteiro.']]) {
      const now = ads(M, language, text), before = ads(OLD, language, text)
      assert.deepEqual(now, before, language)
      assert.ok(now.some((e) => String(e.text).includes('[color')), 'o karaokê do anúncio LTR continua')
    }
  })
  return issues
}

await check('BASE reproduz o defeito: chunk urdu vira vários elementos com [color] (as corridas que o Creatomate embaralha) e sem text_direction', () => {
  const chunk = urduWords.slice(0, 4)
  const els = caption(OLD, 'ur', chunk.map((w) => w.word).join(' '), chunk)
  assert.ok(els.length > 1 && els.every((e) => e.text.includes('[color') && e.text_direction === undefined))
  assert.ok(els.map((e) => e.text).some((t) => t.startsWith('[color #FFD700]ایک[/color]')), 'é exatamente a 1ª legenda do render: "ایک" pintada vira corrida própria')
  const { legendas } = filme15(OLD, urduWords, 'ur')
  assert.ok(legendas.some((e) => e.text.includes('[color')))
  assert.equal(typeof OLD.T.textDirectionOf, 'undefined')
})
await check('comportamento novo completo (detectores, chunk, filme de 15 s, anúncios, identidade LTR)', () => assert.deepEqual(problems(NEW), []))
await check('o agrupador não reordena: os blocos saem na ordem das palavras do Whisper (urdu, árabe, hebraico, inglês)', () => {
  for (const words of [urduWords, W(ARABIC), W(HEBREW), englishWords]) {
    const blocos = NEW.F.agruparLegendaFaceless15(words, 99)
    assert.equal(norm(blocos.flatMap((b) => b.words.map((w) => w.word)).join(' ')), norm(words.map((w) => w.word).join(' ')))
    assert.deepEqual(blocos.map((b) => b.text), blocos.map((b) => b.words.map((w) => w.word).join(' ')), 'texto do bloco = palavras na ordem')
    for (const b of blocos) for (let i = 1; i < b.words.length; i++) assert.ok(b.words[i].start >= b.words[i - 1].start)
    assert.deepEqual(json(blocos), json(OLD.F.agruparLegendaFaceless15(words, 99)), 'o agrupador em si não mudou')
  }
})

// ── Mutantes: cada reversão parcial fica vermelha ───────────────────────────────────────────────────────────────────
const MUTANTES = [
  ['karaokê volta a ligar em RTL', FILES.C, '&& duration > 0.3 && !rtl) {', '&& duration > 0.3) {'],
  ['text_direction some', FILES.C, "...(rtl ? { text_direction: 'rtl' as const } : {}),", '...{},'],
  ['idioma do filme deixa de valer sem letra forte', FILES.C, 'ACTIVE_CAPTION_RTL = isRtlLanguage(language)', 'ACTIVE_CAPTION_RTL = false'],
  ['RTL para todo mundo (inglês perde a identidade)', FILES.C, 'const rtl = textDirectionOf(text) ?? ACTIVE_CAPTION_RTL', 'const rtl = true'],
  ['faixa árabe sai do detector', FILES.T, '\\u0600-\\u06FF', ''],
  ['faixa hebraica sai do detector', FILES.T, '\\u0590-\\u05FF', ''],
  ['detector sempre LTR', FILES.T, 'if (RTL_SCRIPT_RE.test(ch)) return true', 'if (RTL_SCRIPT_RE.test(ch)) return false'],
  ['detector decide pela última letra, não pela primeira', FILES.T, "if (/\\p{L}/u.test(ch)) return false", ''],
  ['catálogo: urdu deixa de ser RTL', FILES.T, "{ code: 'ur', name: 'Urdu', native: 'اردو', captionFont: 'Noto Sans Arabic', rtl: true }", "{ code: 'ur', name: 'Urdu', native: 'اردو', captionFont: 'Noto Sans Arabic', rtl: false }"],
  ['agrupador inverte as palavras do bloco', FILES.F, 'const usados = ws.slice(i, i + tam)', 'const usados = ws.slice(i, i + tam).reverse()'],
  ['agrupador inverte o texto do bloco', FILES.F, "const text = usados.map((w) => String(w.word).trim()).join(' ').trim()", "const text = usados.map((w) => String(w.word).trim()).reverse().join(' ').trim()"],
  ['anúncio volta a pintar a palavra em RTL', FILES.A, 'x === active && !rtl ?', 'x === active ?'],
  ['anúncio perde o text_direction', FILES.A, "...(rtl ? { text_direction: 'rtl' } : {}) }", '}'],
  ['anúncio decide só pelo idioma (urdu com language en escapa)', FILES.A, "const rtl = isRtlCaption(words.map(w => w.word).join(' '), i.language)", "const rtl = isRtlLanguage(i.language)"],
]
for (const [name, file, before, after] of MUTANTES) await check(`MUTANTE aplicado → vermelho: ${name}`, () => {
  const src = rd(file)
  assert.equal(src.split(before).length, 2, 'âncora única presente em ' + file)
  let mutant = src.replace(before, after)
  if (file === FILES.A && after.includes('isRtlLanguage')) mutant = mutant.replace('isRtlCaption }', 'isRtlCaption, isRtlLanguage }')
  assert.notEqual(mutant, src)
  const issues = problems(load({ [file]: mutant }))
  assert.ok(issues.length > 0, 'o mutante passou despercebido')
})

await check('toda linha nova dos arquivos tocados leva a marca; faceless15 e a rota do compose não mudaram', () => {
  for (const file of [FILES.T, FILES.C, FILES.A, FILES.M]) {
    const diff = git('diff', '--no-color', '-U0', BASE, '--', file)
    const added = lf(diff).split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++'))
    assert.ok(added.length > 0, file + ': sem mudança?')
    for (const line of added) assert.ok(line.includes(MARCA), file + ': linha nova sem marca → ' + line)
  }
  assert.equal(rd(FILES.F), base(FILES.F), 'o agrupador do filme de 15 s não precisou mudar (a ordem já era a da fala)')
  assert.equal(rd('app/api/compose/route.ts'), base('app/api/compose/route.ts'))
  const m = rd(FILES.M)
  assert.ok(m.includes("p.index === active && !rtl ?") && m.includes("index++ === selected && !rtl ?"), 'montage95: CTA e rótulos finais sem span em RTL')
  assert.equal((m.match(/text_direction: 'rtl'/g) ?? []).length, 2)
})

console.log(`${passed} provas verdes; mutantes acima foram detectados em memória`)
