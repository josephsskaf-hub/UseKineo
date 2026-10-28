// KINEO-LEGENDA-LINGUAS-2810 — guardião: a legenda queimada leva o roteiro INTEIRO, em toda escrita.
//
//     node scripts/test-legenda-linguas-2810.mjs
//
// Sem rede, sem banco, sem env: módulos REAIS transpilados pelo carregador offline (lib/captionScriptSpelling,
// lib/compose buildCaptionsFromWhisperWords + buildCaptionElements + sentenceStartTimes, lib/filmes/faceless15
// agruparLegendaFaceless15, lib/openai buildCaptionSegments, lib/free15CanonicalCaptions).
//
// O DEFEITO (filme grátis Seedance 15 s em hindi, 28/10, vídeo 25999984): roteiro "रात के ठीक 3 बजे, रिया के कमरे का
// दरवाज़ा खटखटाया गया।" e legenda "रात के ठी बजे". As palavras do Whisper abaixo são as REAIS do cache de voz daquele filme:
// o Whisper nunca escreveu o "क" nem o "3"; a grafia do roteiro (28/09) travou em 62 % de âncoras (< 70 %) e mandou o
// Whisper cru para a tela.
//
// O QUE ESTE ARQUIVO PROVA:
//   1. a base reproduz o defeito (só a grafia: "रात के ठी बजे"); com o conserto, a legenda real (F1 do faceless15, o
//      chunker clássico de 4 e o karaokê de buildCaptionElements) carrega o roteiro inteiro, com os mesmos cortes;
//   2. em 20 línguas/escritas (devanágari hi/mr, bengali, tâmil, telugo, árabe/urdu/persa, hebraico, tailandês, chinês,
//      japonês, coreano, cirílico, grego, vietnamita, EN/PT/ES com 1953/$9.90/100%/R$ 9,90) e algarismos nativos (३ ১৬৭৪
//      ৩ ٣ ۳), com o Whisper estragado de 4 jeitos (engole dígito, corta a última letra/marca, funde duas palavras,
//      tudo junto): letras + marcas + dígitos das legendas juntadas == as do roteiro, nas 3 estradas da legenda, e os
//      inícios de frase (cortes do montador) e a janela do gancho idênticos aos do Whisper;
//   3. RTL (textos do guardião de 27/10): elemento único, text_direction rtl, texto na ordem lógica — sem regressão;
//   4. repetição dita ("ठक ठक ठक") sai inteira na F1; a gagueira do Whisper cru o anti-gagueira continua tirando
//      (comportamento de antes); Whisper que já leva o roteiro inteiro fica byte a byte (mesmo array);
//      Whisper que não parece o roteiro fica intacto;
//   5. a ligação: /api/compose aplica depois da grafia e antes da rede da escrita; o unlock (grafiaDoRoteiro) também;
//   6. mutantes em memória, cada um provado aplicado e vermelho.

import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

process.chdir(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'))

let total = 0
let falhas = 0
function check(rotulo, ok, detalhe = '') {
  total++
  if (ok) console.log(`  ok   ${rotulo}`)
  else { falhas++; console.log(`  FALHA ${rotulo}${detalhe ? ` — ${detalhe}` : ''}`) }
}

const CWPC = Number(fs.readFileSync('lib/compose.ts', 'utf8').match(/^const CAPTION_WORDS_PER_CHUNK = (\d+)$/m)?.[1])
assert.ok(Number.isFinite(CWPC), 'CAPTION_WORDS_PER_CHUNK não encontrado em lib/compose.ts')

function mundo(transform = null) {
  const load = createOfflineLoader(transform ? { source: transform } : {})
  return {
    G: load('@/lib/captionScriptSpelling'),
    C: load('@/lib/compose'),
    F: load('@/lib/filmes/faceless15'),
    O: load('@/lib/openai'),
    K: load('@/lib/free15CanonicalCaptions'),
  }
}

// ── o mesmo critério para tudo: letras + marcas + dígitos, NFC, maiúsculas (a legenda sai em maiúsculas) ──
const essencia = (s) => String(s ?? '').normalize('NFC').toUpperCase().replace(/[^\p{L}\p{M}\p{N}]/gu, '')
const semCor = (s) => String(s ?? '').replace(/\[color [^\]]*\]|\[\/color\]/g, '')
const iguais = (a, b) => a.length === b.length && a.every((x, k) => x === b[k])
const W = (word, start, end, sentenceEnd = false) => ({ word, start, end, ...(sentenceEnd ? { sentenceEnd: true } : {}) })

// ── 1. o caso real ───────────────────────────────────────────────────────────────────────────────────────────────
const HINDI_FRASE = 'रात के ठीक 3 बजे, रिया के कमरे का दरवाज़ा खटखटाया गया।'
const HINDI_ROTEIRO = `${HINDI_FRASE} ठक… ठक… ठक… बाहर से आवाज़ आई, “बेटा, दरवाज़ा खोलो… मैं माँ हूँ।” अलमारी से आवाज़ आई... “रिया… दरवाज़ा मत खोलना…” और तभी किसी ने फुसफुसाया—“तो फिर… दरवाज़ा कौन खटखटा रहा है?”`
// Palavras do Whisper REAIS (cache de voz do filme 25999984, 28/10 17:10Z; texto e tempos, sem dado da conta).
const HINDI_WHISPER = [
  {"word":"रात","start":0,"end":0.3199999928474426},
  {"word":"के","start":0.3199999928474426,"end":0.4000000059604645},
  {"word":"ठी","start":0.4000000059604645,"end":0.8399999737739563},
  {"word":"बजे","start":0.8399999737739563,"end":1.2799999713897705},
  {"word":"रिया","start":1.7999999523162842,"end":1.9199999570846558},
  {"word":"के","start":1.9199999570846558,"end":2.0199999809265137},
  {"word":"कमरे","start":2.0199999809265137,"end":2.319999933242798},
  {"word":"का","start":2.319999933242798,"end":2.4000000953674316},
  {"word":"दर्वाजा","start":2.4000000953674316,"end":2.7799999713897705},
  {"word":"खटकाया","start":2.7799999713897705,"end":3.4000000953674316},
  {"word":"गया","start":3.4000000953674316,"end":3.4800000190734863,"sentenceEnd":true},
  {"word":"तक","start":4,"end":4.019999980926514},
  {"word":"तक","start":4.019999980926514,"end":4.28000020980835},
  {"word":"बहरसे","start":4.28000020980835,"end":4.739999771118164},
  {"word":"आवाज","start":4.739999771118164,"end":5},
  {"word":"आयी","start":5,"end":5.300000190734863},
  {"word":"बेटा","start":5.599999904632568,"end":5.679999828338623},
  {"word":"दर्वाजा","start":5.679999828338623,"end":6.079999923706055},
  {"word":"खोलो","start":6.079999923706055,"end":6.400000095367432},
  {"word":"मैं","start":6.639999866485596,"end":6.760000228881836},
  {"word":"माहूँ।","start":6.760000228881836,"end":7.340000152587891},
  {"word":"अलमारी","start":7.340000152587891,"end":7.699999809265137},
  {"word":"से","start":7.699999809265137,"end":7.760000228881836},
  {"word":"आवाज","start":7.760000228881836,"end":8.079999923706055},
  {"word":"आयी।","start":8.079999923706055,"end":8.979999542236328},
  {"word":"रिया","start":8.979999542236328,"end":9.180000305175781},
  {"word":"दर्वाजा","start":9.479999542236328,"end":9.739999771118164},
  {"word":"मत","start":9.739999771118164,"end":9.880000114440918},
  {"word":"खोलना।","start":9.880000114440918,"end":11.0600004196167},
  {"word":"और","start":11.0600004196167,"end":11.15999984741211},
  {"word":"तभी","start":11.15999984741211,"end":11.359999656677246},
  {"word":"किसीने","start":11.359999656677246,"end":11.899999618530273},
  {"word":"फुस्फुस","start":11.899999618530273,"end":12.420000076293945},
  {"word":"आया।","start":12.420000076293945,"end":13.199999809265137},
  {"word":"तो","start":13.199999809265137,"end":13.34000015258789},
  {"word":"फिर","start":13.34000015258789,"end":13.579999923706055},
  {"word":"दर्वाजा","start":13.579999923706055,"end":14.039999961853027},
  {"word":"कौन","start":14.039999961853027,"end":14.180000305175781},
  {"word":"खटकटारा","start":14.180000305175781,"end":14.739999771118164},
  {"word":"है","start":14.739999771118164,"end":14.819999694824219,"sentenceEnd":true},
]
const HINDI_AUDIO = 16.848

/** As três estradas da legenda queimada, com as palavras que a rota entrega ao montador. */
function estradas(M, words, audio) {
  const classic = M.C.buildCaptionsFromWhisperWords(words, audio, 0, CWPC)
  const karaoke = classic.flatMap((c) => M.C.buildCaptionElements({ text: c.text, time: c.time, duration: c.duration, highlight: c.highlight, karaokeWords: c.words }))
  const f1 = M.F.agruparLegendaFaceless15(words, audio)
  return {
    classic: classic.map((c) => c.text),
    karaokeOk: classic.every((c) => {
      const els = M.C.buildCaptionElements({ text: c.text, time: c.time, duration: c.duration, highlight: c.highlight, karaokeWords: c.words })
      return els.length > 0 && els.every((e) => semCor(e.text) === c.text.toUpperCase())
    }),
    karaoke,
    f1: f1.map((b) => b.text),
  }
}
/** A cadeia da rota: grafia do roteiro (28/09) → roteiro inteiro (este conserto). */
const cadeia = (M, ws, roteiro) => M.G.roteiroInteiroNaLegenda(M.G.alinharGrafiaDoRoteiro(ws, roteiro).words, roteiro)
const fimDaPrimeira = (ws) => ws.find((w) => w.sentenceEnd === true)?.end ?? null

function provaReal(M) {
  const r = {}
  const base = M.G.alinharGrafiaDoRoteiro(HINDI_WHISPER, HINDI_ROTEIRO)
  const eBase = estradas(M, base.words, HINDI_AUDIO)
  r.baseMotivo = base.motivo
  r.baseDefeito = base.motivo === 'poucas_ancoras' && eBase.f1[0]?.startsWith('रात के ठी बजे') && !eBase.f1.join(' ').includes('3')
  const fix = cadeia(M, HINDI_WHISPER, HINDI_ROTEIRO)
  const e = estradas(M, fix.words, HINDI_AUDIO)
  r.f1 = e.f1
  r.motivo = fix.motivo
  r.inteiro = fix.aplicada && [e.classic, e.f1].every((t) => essencia(t.join('')) === essencia(HINDI_ROTEIRO)) && e.karaokeOk
  r.primeira = e.f1[0] === 'रात के ठीक 3' || e.f1[0]?.startsWith('रात के ठीक 3')
  r.cortes = iguais(M.C.sentenceStartTimes(HINDI_WHISPER), M.C.sentenceStartTimes(fix.words)) && fimDaPrimeira(HINDI_WHISPER) === fimDaPrimeira(fix.words)
  r.tempo = fix.words.every((w, k) => w.start <= w.end && w.start < HINDI_AUDIO && (k === 0 || w.start >= fix.words[k - 1].start)) &&
    fix.words[0].start === HINDI_WHISPER[0].start && fix.words.at(-1).end === HINDI_WHISPER.at(-1).end
  r.repeticao = e.f1.join(' ').includes('ठक ठक ठक')
  r.unlock = essencia(M.G.grafiaDoRoteiro(HINDI_WHISPER, HINDI_ROTEIRO).map((w) => w.word).join('')) === essencia(HINDI_ROTEIRO)
  return r
}

// ── 2. as línguas ────────────────────────────────────────────────────────────────────────────────────────────────
const URDU = 'ایک چھوٹا سا راز... جادوئی ستارے کا! آمنہ کو ملا ایک جادوئی ستارہ، چمکدار اور پراسرار۔' // = guardião RTL 27/10
const ARABIC = 'في قديم الزمان كان هناك ملك عادل يحكم مدينة كبيرة.' // = guardião RTL 27/10
const HEBREW = 'פעם אחת היה מלך שחי בעיר גדולה מאוד.' // = guardião RTL 27/10
const PERSIAN = 'یک راز کوچک درباره ستاره جادویی.' // = guardião RTL 27/10
const LINGUAS = [
  ['hi', HINDI_FRASE],
  ['hi-३', 'सुबह ठीक ३ बजे घंटी बजी और पूरा घर जाग गया।'],
  ['mr', 'शिवाजी महाराजांनी १६७४ साली रायगडावर राज्याभिषेक केला. तो दिवस महाराष्ट्राच्या इतिहासात अमर झाला.'],
  ['bn', 'রাত ঠিক ৩টায় দরজায় কেউ কড়া নাড়ল। কেউ সাড়া দিল না।'],
  ['ta', 'இரவு சரியாக 3 மணிக்கு கதவு தட்டப்பட்டது. யாரும் பதில் சொல்லவில்லை.'],
  ['te', 'రాత్రి సరిగ్గా 3 గంటలకు తలుపు తట్టారు. ఎవరూ జవాబు ఇవ్వలేదు.'],
  ['ur', URDU],
  ['ar', ARABIC],
  ['ar-٣', 'في عام ١٩٥٣ وصل المتسلقون إلى قمة إيفرست لأول مرة.'],
  ['fa', PERSIAN],
  ['fa-۳', 'در سال ۱۹۵۳ کوه اورست برای اولین بار فتح شد.'],
  ['he', HEBREW],
  ['he-1953', 'בשנת 1953 הגיעו המטפסים לפסגת האוורסט בפעם הראשונה.'],
  ['th', 'ตอนตีสามตรง มีคนเคาะประตูห้องของเธอ 3 ครั้ง แล้วเงียบไป'],
  ['zh', '凌晨3点整，有人敲响了莉娅的房门。门外传来妈妈的声音。'],
  ['ja', '午前3時ちょうど、リアの部屋のドアがノックされた。外から母の声がした。'],
  ['ko', '새벽 3시 정각, 리아의 방문을 누군가 두드렸다. 밖에서 엄마 목소리가 들렸다.'],
  ['ru', 'Ровно в 3 часа ночи в дверь комнаты Рии постучали. Никто не ответил.'],
  ['el', 'Στις 3 ακριβώς τα ξημερώματα, κάποιος χτύπησε την πόρτα. Κανείς δεν απάντησε.'],
  ['vi', 'Đúng 3 giờ sáng, có người gõ cửa phòng của Ria. Không ai trả lời.'],
  ['en', 'In 1953, a ticket cost $9.90 and 100% of the seats sold out. Nobody expected it.'],
  ['pt', 'Em 1953, o ingresso custava R$ 9,90 e 100% dos lugares esgotaram. Ninguém esperava.'],
  ['es', 'En 1953, la entrada costaba $9.90 y el 100% de los asientos se agotó. Nadie lo esperaba.'],
]
const COMPACTA = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}]/u
/** Como o Whisper devolve palavras: sem pontuação nas pontas; frase fecha pelo segmento (sentenceEnd). */
function palavrasFaladas(roteiro) {
  const out = []
  for (const peca of roteiro.split(/[\s–—]+/u).filter(Boolean)) {
    const partes = COMPACTA.test(peca)
      ? Array.from(new Intl.Segmenter(/\p{Script=Thai}/u.test(peca) ? 'th' : /[\p{Script=Hiragana}\p{Script=Katakana}]/u.test(peca) ? 'ja' : 'zh', { granularity: 'word' }).segment(peca))
        .reduce((acc, s) => { if (s.isWordLike) acc.push(s.segment); else if (acc.length) acc[acc.length - 1] += s.segment; return acc }, [])
      : [peca]
    for (const p of partes) {
      const limpa = p.replace(/^[^\p{L}\p{M}\p{N}]+|[^\p{L}\p{M}\p{N}]+$/gu, '')
      if (limpa) out.push({ texto: limpa, fecha: /[.!?।۔。！？]["'”’»)\]]*$/u.test(p) })
    }
  }
  return out
}
/** O Whisper estragado: `estrago` ∈ digitos | marcas | funde | tudo. Tempos de 0,3 s por palavra. */
function whisperEstragado(roteiro, estrago) {
  let ps = palavrasFaladas(roteiro)
  if (estrago === 'digitos' || estrago === 'tudo') ps = ps.map((p) => ({ ...p, texto: p.texto.replace(/\p{N}/gu, '') })).filter((p) => p.texto !== '' && !/^[$%.,R]+$/u.test(p.texto))
  if (estrago === 'marcas' || estrago === 'tudo') ps = ps.map((p, k) => (k % 3 === 1 && Array.from(p.texto).length > 2 ? { ...p, texto: Array.from(p.texto).slice(0, -1).join('') } : p))
  if ((estrago === 'funde' || estrago === 'tudo') && ps.length > 3 && !ps[1].fecha) ps = [ps[0], { texto: ps[1].texto + ps[2].texto, fecha: ps[2].fecha }, ...ps.slice(3)]
  return ps.map((p, k) => W(p.texto, r3(k * 0.3), r3(k * 0.3 + 0.27), p.fecha || k === ps.length - 1))
}
function r3(v) { return Math.round(v * 1000) / 1000 }

function provaLinguas(M) {
  const erros = []
  for (const [lingua, roteiro] of LINGUAS) {
    for (const estrago of ['digitos', 'marcas', 'funde', 'tudo']) {
      const ws = whisperEstragado(roteiro, estrago)
      const audio = r3(ws.at(-1).end + 0.3)
      const fix = cadeia(M, ws, roteiro)
      const e = estradas(M, fix.words, audio)
      const alvo = essencia(roteiro)
      const rotulo = `${lingua}/${estrago}`
      if (essencia(e.classic.join('')) !== alvo) erros.push(`${rotulo} clássico: ${e.classic.join(' | ')}`)
      if (essencia(e.f1.join('')) !== alvo) erros.push(`${rotulo} F1: ${e.f1.join(' | ')}`)
      if (!e.karaokeOk) erros.push(`${rotulo} karaokê muda o texto`)
      if (!iguais(M.C.sentenceStartTimes(ws), M.C.sentenceStartTimes(fix.words)) || fimDaPrimeira(ws) !== fimDaPrimeira(fix.words)) erros.push(`${rotulo} cortes mudaram`)
      if (!fix.words.every((w, k) => w.start <= w.end && w.start < audio && (k === 0 || w.start >= fix.words[k - 1].start))) erros.push(`${rotulo} tempo fora de ordem`)
      for (const simbolo of ['$9.90', '100%', 'R$']) if (roteiro.includes(simbolo) && !e.f1.join(' ').includes(simbolo)) erros.push(`${rotulo} perdeu "${simbolo}"`)
      if (COMPACTA.test(roteiro) && fix.words.length < 4) erros.push(`${rotulo} escrita compacta virou ${fix.words.length} palavra(s)`)
    }
    // plano B (sem Whisper): o caminho proporcional do roteiro também não perde nada
    const segs = M.O.buildCaptionSegments(roteiro, CWPC)
    if (essencia(segs.map((s) => s.text).join('')) !== essencia(roteiro)) erros.push(`${lingua} proporcional: ${segs.map((s) => s.text).join(' | ')}`)
  }
  return erros
}

// ── 3. RTL sem regressão ─────────────────────────────────────────────────────────────────────────────────────────
function provaRtl(M) {
  const erros = []
  for (const [lingua, roteiro] of [['ur', URDU], ['ar', ARABIC], ['fa', PERSIAN], ['he', HEBREW], ['ar-٣', LINGUAS.find((l) => l[0] === 'ar-٣')[1]]]) {
    const ws = whisperEstragado(roteiro, 'tudo')
    const fix = cadeia(M, ws, roteiro)
    const caps = M.C.buildCaptionsFromWhisperWords(fix.words, ws.at(-1).end + 0.3, 0, CWPC)
    for (const c of caps) {
      const els = M.C.buildCaptionElements({ text: c.text, time: c.time, duration: c.duration, highlight: c.highlight, karaokeWords: c.words })
      if (els.length !== 1 || els[0].text_direction !== 'rtl' || els[0].text !== c.text.toUpperCase() || /\[color/.test(els[0].text)) erros.push(`${lingua}: ${JSON.stringify(els.map((e) => [e.text, e.text_direction]))}`)
    }
  }
  return erros
}

// ── 4. bordas ────────────────────────────────────────────────────────────────────────────────────────────────────
function provaBordas(M) {
  const r = {}
  // Whisper que já leva o roteiro inteiro: o MESMO array (os 10 anúncios de 28/09 e todo filme em inglês bom ficam iguais).
  const bom = 'Last year rice prices rose sharply across the whole country'.split(' ').map((w, k) => W(w, k * 0.3, k * 0.3 + 0.25, k === 9))
  const o = M.G.roteiroInteiroNaLegenda(bom, 'Last year, rice prices rose sharply across the whole country.')
  r.intacto = o.motivo === 'ja_inteiro' && o.words === bom
  // Whisper que não parece o roteiro: intacto.
  const outro = 'Completely different words spoken here by someone else entirely today'.split(' ').map((w, k) => W(w, k * 0.4, k * 0.4 + 0.35, k === 9))
  const o2 = M.G.roteiroInteiroNaLegenda(outro, 'The quick brown fox jumps over the lazy dog')
  r.naoParece = o2.motivo === 'nao_parece_o_roteiro' && o2.words === outro
  // Tempo inválido: intacto.
  const ruim = [W('one', 0, 0.3), W('two', 0.2, 0.1), W('three', 0.5, 0.8, true)]
  r.tempoRuim = M.G.roteiroInteiroNaLegenda(ruim, 'one two 3 three.').words === ruim
  // Repetição dita atravessando o corte de 4 palavras: do roteiro fica; do Whisper cru o anti-gagueira continua tirando.
  const roteiro = 'One two three very very good news today.'
  const ws = whisperEstragado(roteiro, 'marcas')
  const fix = cadeia(M, ws, roteiro)
  const caps = M.C.buildCaptionsFromWhisperWords(fix.words, ws.at(-1).end + 0.3, 0, CWPC).map((c) => c.text)
  r.repeticao = fix.aplicada && caps.join(' ').toLowerCase().split(/\s+/).filter((w) => w === 'very').length === 2
  r.repeticaoDetalhe = caps.join(' | ')
  const cru = 'One two three very very good news today'.split(' ').map((w, k) => W(w, k * 0.3, k * 0.3 + 0.27, k === 7))
  r.gagueiraCru = M.C.buildCaptionsFromWhisperWords(cru, 3, 0, CWPC).map((c) => c.text).join(' ').split(' ').filter((w) => w === 'very').length === 1
  // Só dígito sumiu (o resto do Whisper perfeito): o "1953" e o "$9.90" voltam.
  const so = whisperEstragado(LINGUAS.find((l) => l[0] === 'en')[1], 'digitos')
  const fix2 = cadeia(M, so, LINGUAS.find((l) => l[0] === 'en')[1])
  r.soDigito = fix2.aplicada && fix2.words.some((w) => w.word === '1953') && fix2.words.some((w) => w.word === '$9.90') && fix2.words.some((w) => w.word === '100%')
  return r
}

// ── 5. a ligação ─────────────────────────────────────────────────────────────────────────────────────────────────
function ligacao(route, unlock, lib) {
  const r = {}
  r.import = /^import \{ roteiroInteiroNaLegenda \} from '@\/lib\/captionScriptSpelling'/m.test(route)
  const iGrafia = route.indexOf('    const grafia = legendaPelaGrafiaDoRoteiro && whisperWords ? alinharGrafiaDoRoteiro(whisperWords, scaledScript) : null')
  const iInteiro = route.indexOf('    if (grafia) { const inteiro = roteiroInteiroNaLegenda(grafia.words, scaledScript); if (inteiro.aplicada) grafia.words = inteiro.words;')
  const iLegenda = route.indexOf('    const legendaWords: WhisperWord[] | undefined = legendaNaEscritaDoRoteiro(grafia ? grafia.words : whisperWords, scaledScript)')
  const iBuild = route.indexOf('        whisperWords: legendaWords,')
  r.ordem = iGrafia > 0 && iInteiro > iGrafia && iLegenda > iInteiro && iBuild > iLegenda
  r.unlock = /\n        whisperWords: whisperWords \? grafiaDoRoteiro\(whisperWords, scaledScript\) : whisperWords,\n/.test(unlock.replace(/\r\n/g, '\n')) &&
    /export function grafiaDoRoteiro[^{]*\{\n\s*return roteiroInteiroNaLegenda\(alinharGrafiaDoRoteiro\(words, roteiro\)\.words, roteiro\)\.words/.test(lib.replace(/\r\n/g, '\n'))
  return r
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const REAL = mundo()
console.log('1. o filme hindi de 28/10 (Whisper real)\n')
{
  const r = provaReal(REAL)
  check('a base reproduz o defeito: só a grafia → poucas_ancoras e a 1ª legenda "रात के ठी बजे" sem o 3', r.baseDefeito, r.baseMotivo)
  check('com o conserto: legenda F1 + clássica + karaokê levam o roteiro inteiro', r.inteiro, `${r.motivo} · ${r.f1.join(' | ')}`)
  check('a 1ª legenda F1 é "रात के ठीक 3"', r.primeira, r.f1[0])
  check('cortes do montador (sentenceStartTimes real) e janela do gancho idênticos ao Whisper', r.cortes)
  check('tempo: monotônico, dentro do áudio, pontas = pontas do Whisper', r.tempo)
  check('"ठक ठक ठक" sai inteiro (repetição dita)', r.repeticao, r.f1.join(' | '))
  check('o unlock (grafiaDoRoteiro) também leva o roteiro inteiro', r.unlock)
}
console.log('\n2. 23 roteiros × 4 estragos do Whisper (clássico, F1, karaokê, proporcional)\n')
{
  const erros = provaLinguas(REAL)
  check(`nenhuma letra, marca ou dígito perdido em ${LINGUAS.map((l) => l[0]).join(' ')}`, erros.length === 0, erros.slice(0, 6).join(' ;; '))
}
console.log('\n3. RTL (textos do guardião de 27/10)\n')
{
  const erros = provaRtl(REAL)
  check('urdu/árabe/persa/hebraico: um elemento por legenda, text_direction rtl, ordem lógica, sem [color]', erros.length === 0, erros.slice(0, 3).join(' ;; '))
}
console.log('\n4. bordas\n')
{
  const r = provaBordas(REAL)
  check('Whisper que já leva o roteiro inteiro → o mesmo array (nada muda para quem estava certo)', r.intacto)
  check('Whisper que não parece o roteiro → intacto', r.naoParece)
  check('tempo inválido → intacto', r.tempoRuim)
  check('gagueira do Whisper cru (sem roteiro) → o anti-gagueira continua tirando (como antes)', r.gagueiraCru)
  check('só o dígito sumiu do Whisper: 1953, $9.90 e 100% voltam', r.soDigito)
}
console.log('\n5. ligação\n')
const ROUTE = fs.readFileSync('app/api/compose/route.ts', 'utf8').replace(/\r\n/g, '\n')
const UNLOCK = fs.readFileSync('app/api/compose/unlock/route.ts', 'utf8').replace(/\r\n/g, '\n')
const LIB = fs.readFileSync('lib/captionScriptSpelling.ts', 'utf8').replace(/\r\n/g, '\n')
{
  const l = ligacao(ROUTE, UNLOCK, LIB)
  check('/api/compose importa roteiroInteiroNaLegenda', l.import)
  check('/api/compose: grafia → roteiro inteiro → rede da escrita → buildCreatomateSource(whisperWords: legendaWords)', l.ordem)
  check('unlock: grafiaDoRoteiro passa pelo roteiro inteiro', l.unlock)
}

console.log('\n6. mutantes (cada um provado aplicado; todos têm de ficar vermelhos)\n')
function mutante(rotulo, arquivo, de, para) {
  let aplicado = false
  const M = mundo((rel, text) => {
    if (rel !== arquivo) return text
    const novo = text.split(de).join(para)
    if (novo !== text) aplicado = true
    return novo
  })
  check(`mutante "${rotulo}" aplicado`, aplicado)
  return M
}
const verde = (M) => {
  const r = provaReal(M)
  const b = provaBordas(M)
  return r.inteiro && r.primeira && r.cortes && r.repeticao && r.unlock && provaLinguas(M).length === 0 && provaRtl(M).length === 0 && b.intacto && b.soDigito
}
{
  const M = mutante('pular a checagem (todo Whisper vale como inteiro)', 'lib/captionScriptSpelling.ts', "if (letrasDaTela === letrasDoRoteiro) return sem('ja_inteiro')", "if (true) return sem('ja_inteiro')")
  check('… vermelho', !verde(M))
}
{
  const M = mutante('dígito fora da conta (\\p{N} sai de letrasDaLegenda)', 'lib/captionScriptSpelling.ts', "replace(/[^\\p{L}\\p{M}\\p{N}]/gu, '')\n}\n\n/** O roteiro em palavras", "replace(/[^\\p{L}\\p{M}]/gu, '')\n}\n\n/** O roteiro em palavras")
  check('… vermelho (o "1953" engolido pelo Whisper passava)', !provaBordas(M).soDigito)
}
{
  const M = mutante('marca combinante fora das pontas (a vogal final do hindi some)', 'lib/captionScriptSpelling.ts', '\\p{L}\\p{M}\\p{N}\\p{Sc}%#@&+°', '\\p{L}\\p{N}\\p{Sc}%#@&+°')
  check('… vermelho', !verde(M))
}
{
  const M = mutante('escrita compacta sem Intl.Segmenter (frase chinesa vira 1 palavra)', 'lib/captionScriptSpelling.ts', "if (!ESCRITA_COMPACTA.test(peca) || typeof Seg !== 'function') {", 'if (true) {')
  check('… vermelho', provaLinguas(M).length > 0)
}
{
  const M = mutante('mexer no tempo do início da palavra', 'lib/captionScriptSpelling.ts', '          start: inicios[k],\n', '          start: inicios[k] + 0.001,\n')
  check('… vermelho', !verde(M))
}
{
  const M = mutante('unlock sem o roteiro inteiro', 'lib/captionScriptSpelling.ts', 'return roteiroInteiroNaLegenda(alinharGrafiaDoRoteiro(words, roteiro).words, roteiro).words', 'return alinharGrafiaDoRoteiro(words, roteiro).words')
  check('… vermelho', !provaReal(M).unlock)
}
{
  const src = ROUTE.replace('if (inteiro.aplicada) grafia.words = inteiro.words;', '')
  check('mutante "rota não aplica" aplicado', src !== ROUTE)
  check('… vermelho', !ligacao(src, UNLOCK, LIB).ordem)
}

console.log(`\n${total - falhas}/${total} verificações passaram`)
process.exit(falhas ? 1 : 0)
