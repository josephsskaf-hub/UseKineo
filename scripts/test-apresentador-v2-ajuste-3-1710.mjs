// KINEO-APRESENTADOR-V2-AJUSTE-3-1710 — guardião do AJUSTE 3 do apresentador v2 do Studio Ads depois da 2ª rodada real (pedido 8becd82d, 17/10; notas
// 8/8/7/9/8/7/9/7; docs/RESULTADO-T1-APRESENTADOR-V2-R2-2026-10-17.md). Só contas internas (ADS_V2_PRESENTER_V2_MODE 'internal'); fora da TRAVA 8.2.
// Roda com `node scripts/test-apresentador-v2-ajuste-3-1710.mjs` da raiz do repo, sem rede, sem banco, sem fornecedor: os módulos são transpilados pelo
// typescript do repo e rodados com stubs (o arreio de scripts/test-apresentador-v2-ajuste-1710.mjs); o MP3 é montado aqui, quadro a quadro.
//
// O que prova (1 seção por item):
//   H  MÃOS PARADAS por padrão: o gesto só com EXATAMENTE 2 mãos confirmadas (uma no produto, outra vazia, ambas inteiras, "yes" nunca "unsure"); a pergunta
//      nova ("how many separate hands are visible; for each: is it holding the product (yes/no)"); a mão livre aberta no peito no prompt da foto; a atuação
//      das mãos paradas em frase afirmativa; piscadas calmas;
//   A  ÁUDIO: 0,6 s de silêncio no fim do MP3 que vai ao Kling (executado num MP3 montado aqui: quadros, Xing/Info, CRC da tag Lavf/LAME, ID3) e o avanço
//      manda ESSA voz ao motor (a do pedido continua a fala real);
//   C  CORTE E DISSOLVE: corte no fim real da fala + 0,15 s, o close numa trilha ACIMA do apresentador com fade de 0,35 s (o apresentador fica por baixo o
//      dissolve inteiro), a duração total igual à de antes;
//   U  FOTO LIMPA: interface de celular "yes" descarta a opção; "unsure" só no log;
//   F  FRASE DE TELA acima do retângulo do produto (sem ele, o terço de cima);
//   D  desfaz exato + ida + marca em todo bloco + encadeamento (a cadeia apresentador-v2-ajuste tira esta camada primeiro) + diff só nos arquivos da lista;
//   M  mutantes (todos APLICADOS e VERMELHOS).
import { diffSoHome3Cards1910 } from './test-support/desfaz-home-3-cards-1910.mjs' // reancorado KINEO-HOME-3-CARDS-1910 — os 3 cards da home (+ amostra pela entrada do card) saem do diff/leitura em memória
import { semCloseReal1910 } from './test-support/desfaz-close-real-1910.mjs' // reancorado KINEO-CLOSE-REAL-1910 — a entrega de 19/10 sai primeiro, em memória
import { semFilmesF1F4_1910 } from './test-support/desfaz-filmes-f1f4-1910.mjs' // reancorado KINEO-FILMES-F1-F4-1910 [TRAVA 8.2 — vai do fundador 19/10 "vai, sim pra tudo"]: as linhas marcadas do Faceless 15 s saem antes da comparação com a base
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname, posix } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import ts from 'typescript'
import { semApresentadorV2Ajuste3_1710, comApresentadorV2Ajuste3_1710, desfazApresentadorV2Ajuste3_1710, APRESENTADOR_V2_AJUSTE_3_1710_ARQUIVOS, APRESENTADOR_V2_AJUSTE_3_1710_NOVOS, APRESENTADOR_V2_AJUSTE_3_1710_BASE, MARCA_APRESENTADOR_V2_AJUSTE_3_1710 } from './test-support/desfaz-apresentador-v2-ajuste-3-1710.mjs'
import { desfazApresentadorV2Ajuste1710, semApresentadorV2Ajuste1710 } from './test-support/desfaz-apresentador-v2-ajuste-1710.mjs'
import { desfazApresentadorV2_1710, semApresentadorV2_1710 } from './test-support/desfaz-apresentador-v2-1710.mjs'
import { desfazJuizGrade1610 } from './test-support/desfaz-juiz-grade-1610.mjs'
import { semFilmeRapido1710 } from './test-support/desfaz-filme-rapido-1710.mjs' // reancorado KINEO-FILME-RAPIDO-1710 [TRAVA 8.2 — vai do fundador 17/10 "vai pra tudo"]: a entrega mais nova sai antes da comparação com a base
import { desfazApresentadorV2Libera1910 } from './test-support/desfaz-apresentador-v2-libera-1910.mjs' // reancorado KINEO-APRESENTADOR-V2-LIBERA-1910: a liberação (19/10) sai antes de tudo, em memória

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const nodeRequire = createRequire(import.meta.url)
const MARCA = 'KINEO-APRESENTADOR-V2-AJUSTE-3-1710'
const rd = (p) => semFilmeRapido1710(desfazApresentadorV2Libera1910(p, semCloseReal1910(semFilmesF1F4_1910(readFileSync(join(ROOT, p), 'utf8'), p), p)), p).replace(/\r\n/g, '\n') // reancorado KINEO-APRESENTADOR-V2-LIBERA-1910: a liberação de 19/10 sai primeiro (é a camada mais nova), depois a entrega de 17/10 // o arquivo VIVO (esta é a camada mais nova) /* reancorado KINEO-FILME-RAPIDO-1710: a entrega de 17/10 sai primeiro, em memória */ /* reancorado KINEO-CLOSE-REAL-1910: a entrega de 19/10 (Close do produto real) sai primeiro, em memória */ // reancorado KINEO-FILMES-F1-F4-1910: o Faceless 15 s (camada mais nova) sai primeiro, por dentro do Close real
const git = (...a) => execFileSync('git', ['-C', ROOT, ...a], { encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] })
const base = (p) => { try { return git('show', `${APRESENTADOR_V2_AJUSTE_3_1710_BASE}:${p}`).replace(/\r\n/g, '\n') } catch { return null } }
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }
const check = async (m, fn) => { let v = false; try { v = !!(await fn()) } catch (e) { console.log('       (lançou: ' + (e && e.message) + ')'); v = false } ok(v, m) }
const trocar = (src, a, b) => { const n = src.split(a).length - 1; if (n !== 1) throw new Error('mutante não aplicou (' + n + 'x): ' + a.slice(0, 60)); const out = src.split(a).join(b); if (out === src) throw new Error('mutante sem efeito'); return out }
const near = (a, b, e = 1e-6) => Math.abs(a - b) < e
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'sk-guardiao-sem-rede' // só para passar da porta "sem chave": todo fetch aqui é falso

const F = { v2: 'lib/ads/v2PresenterV2.ts', advance: 'lib/ads/v2Advance.ts', montage: 'lib/ads/adV2Montage.ts', vision: 'lib/ads/v2LockVision.ts', presenter: 'lib/ads/v2Presenter.ts', engines: 'lib/ads/v2Engines.ts' }

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
const L = (over = {}) => makeLoader({}, over)
const V2 = L()(F.v2)
const MO = L()(F.montage)
const PR = L()(F.presenter)
const EN = L()(F.engines)
const B = APRESENTADOR_V2_AJUSTE_3_1710_BASE
const V2_ANTES = L({ [F.v2]: base(F.v2) })(F.v2) // a lib de ANTES (a origin/main): a atuação de gesto que linhas antigas ainda guardam
const MO_ANTES = L({ [F.montage]: base(F.montage) })(F.montage)
const ADV = rd(F.advance)
const comV2 = (a, b) => L({ [F.v2]: trocar(rd(F.v2), a, b) })(F.v2)
const comMO = (a, b) => L({ [F.montage]: trocar(rd(F.montage), a, b) })(F.montage)

// ═══ H. mãos paradas por padrão ═══════════════════════════════════════════════════════════════════════════════════════
console.log('H. mãos paradas por padrão; gesto só com 2 mãos confirmadas')
const h1 = (v2 = V2) => {
  const P = v2.adsV2PresenterV2ParseHands, FH = v2.adsV2PresenterV2FreeHandOf
  const m = (count, hands, ui = 'no') => P(JSON.stringify({ hand_count: count, hands: hands.map(([h, w]) => ({ holding_product: h, whole: w })), phone_ui: ui }))
  const confirmada = m(2, [['yes', 'yes'], ['no', 'yes']])
  const r2 = m(2, [['yes', 'yes'], ['unsure', 'yes']]) // o falso positivo da R2: a mão do frasco contada de novo, sem certeza
  const uma = m(1, [['yes', 'yes']])
  const cortada = m(2, [['yes', 'yes'], ['no', 'unsure']])
  const produtoCortado = m(2, [['yes', 'unsure'], ['no', 'yes']])
  const contaDiverge = m(3, [['yes', 'yes'], ['no', 'yes']])
  const tres = m(3, [['yes', 'yes'], ['no', 'yes'], ['no', 'yes']])
  const duasVazias = m(2, [['no', 'yes'], ['no', 'yes']])
  const duasNoProduto = m(2, [['yes', 'yes'], ['yes', 'yes']])
  const antiga = P({ hands: [{ holds_product: 'yes', whole: 'yes' }, { holds_product: 'no', whole: 'yes' }] }) // a chave de antes ainda é lida
  return FH(confirmada) === true && FH(r2) === false && FH(uma) === false && FH(cortada) === false && FH(produtoCortado) === false && FH(contaDiverge) === false && FH(tres) === false &&
    FH(duasVazias) === false && FH(duasNoProduto) === false && FH(antiga) === true && FH(P('lixo')) === null && FH(P({})) === null && FH(null) === null && confirmada.count === 2 &&
    V2_ANTES.adsV2PresenterV2FreeHandOf(V2_ANTES.adsV2PresenterV2ParseHands({ hands: [{ holds_product: 'yes', whole: 'yes' }, { holds_product: 'unsure', whole: 'yes' }] })) === true // a regra de ANTES dava "mão livre" no caso da R2
}
await check('H1 gesto só com EXATAMENTE 2 mãos (lista e contagem), uma segurando o produto e outra vazia, as duas inteiras, tudo "yes"/"no" firme: o caso da R2 (mão do frasco + "unsure") que a regra de antes aprovava agora é "não"; 1 ou 3 mãos, mão cortada, duas vazias = não; ilegível = null', () => h1())
const STILL_FRASE = 'only the one hand holding the product is in the frame and it stays still; the other arm rests out of frame'
const h2 = (v2 = V2) => {
  const p = v2.ADS_V2_PRESENTER_V2_PERFORMANCE_PROMPT, q = v2.ADS_V2_PRESENTER_V2_PERFORMANCE_PROMPT_STILL
  return q.includes(STILL_FRASE) && !/gesture/i.test(q) && [p, q].every((t) => t.includes('natural blinking at a relaxed pace') && !/\b(no|not|never|without|don't)\b/i.test(t) && t.length < EN.ADS_V2_PROMPT_MAX_CHARS) &&
    v2.adsV2PresenterV2Performance(null) === q && v2.adsV2PresenterV2Performance(undefined) === q && v2.adsV2PresenterV2Performance(false) === q && v2.adsV2PresenterV2Performance(true) === p &&
    v2.adsV2PresenterV2PerformanceOf(V2_ANTES.ADS_V2_PRESENTER_V2_PERFORMANCE_PROMPT) === q && v2.adsV2PresenterV2PerformanceOf(V2_ANTES.ADS_V2_PRESENTER_V2_PERFORMANCE_PROMPT_STILL) === q && // linha antiga (gesto ou não) = mãos paradas
    v2.adsV2PresenterV2PerformanceOf(PR.ADS_V2_PRESENTER_PERFORMANCE_PROMPT) === q && v2.adsV2PresenterV2PerformanceOf(p) === p && v2.adsV2PresenterV2PerformanceOf(q) === q
}
await check(`H2 a atuação padrão é "mãos paradas" em frase AFIRMATIVA ("${STILL_FRASE}"), sem gesto; as duas pedem "natural blinking at a relaxed pace"; não sei / não = mãos paradas; linha antiga (a atuação de gesto de antes) cai nas mãos paradas`, () => h2())
const h3 = async (v2 = V2) => {
  const q = v2.ADS_V2_PRESENTER_V2_HANDS_QUESTION
  const VI = L()(F.vision)
  const sent = []
  const resposta = '{"hand_count":2,"hands":[{"holding_product":"yes","whole":"yes"},{"holding_product":"no","whole":"yes"}],"phone_ui":"no"}'
  const raw = await VI.adsV2PresenterV2HandsRaw('https://sb.test/o1.png', q, async (url, init) => { sent.push(JSON.parse(init.body)); return { ok: true, json: async () => ({ choices: [{ message: { content: resposta } }] }) } })
  const inv = v2.adsV2PresenterV2ParseHands(raw)
  return q.includes('How many separate hands are visible?') && q.includes('for each: is it holding the product?') && q.includes('"holding_product": "yes" or "no"') && q.includes('"hand_count"') &&
    q.includes('is there any phone camera interface, on-screen buttons or overlaid text drawn in the image? "yes", "no" or "unsure"') && !q.includes('List every human hand') &&
    sent.length === 1 && sent[0].messages[0].content[1].text === q && v2.adsV2PresenterV2FreeHandOf(inv) === true && v2.adsV2PresenterV2PhoneUiOf(inv) === 'no'
}
await check('H3 a pergunta nova do checador: "How many separate hands are visible?" + "for each: is it holding the product?" (yes/no) + a interface de celular; a chamada EXECUTADA (fetch falso) leva ESSA pergunta e a leitura confirma as 2 mãos', () => h3())
const h4 = (v2 = V2) => {
  const pl = v2.planAdsV2PresenterV2({ entry: { id: 'sofia', gender: 'woman', look: 'a woman in her late 20s', pronoun: 'She', portrait: '/ads/presenters/sofia.webp' }, sector: 'store', setting: 'num hotel com chuva', performancePrompt: PR.ADS_V2_PRESENTER_PERFORMANCE_PROMPT })
  return pl && pl.prompt.includes('The other hand rests open on the chest, clearly visible and fully inside the frame') && pl.prompt.includes(v2.ADS_V2_PRESENTER_V2_CLEAN_PHOTO) &&
    v2.ADS_V2_PRESENTER_V2_CLEAN_PHOTO === 'A clean photo, no phone screen interface, no on-screen buttons, no text overlays.' && pl.prompt.includes(v2.ADS_V2_PRESENTER_V2_NEUTRAL_MOUTH) && pl.prompt.includes(v2.ADS_V2_PRESENTER_V2_ONLY_PRODUCT)
}
await check('H4 o prompt da foto pede a mão livre ABERTA e apoiada no peito, inteira no quadro, e a foto limpa ("no phone screen interface, no on-screen buttons, no text overlays"); boca neutra e só o produto ficam iguais', () => h4())
const h5 = (src = ADV) => src.includes('vis.adsV2PresenterV2HandsRaw(u, pv.lib.ADS_V2_PRESENTER_V2_HANDS_QUESTION).then((raw) => pv.lib.adsV2PresenterV2ParseHands(raw))') &&
  src.includes('const hands = handInv.map((h) => pv.lib.adsV2PresenterV2FreeHandOf(h))') && src.includes('const phoneUi = handInv.map((h) => pv.lib.adsV2PresenterV2PhoneUiOf(h))') &&
  src.includes('const pick = pv.lib.adsV2PresenterV2PickClean(both, hands, phoneUi)') && !src.includes('const pick = pv.lib.adsV2PresenterV2PickHand(') &&
  src.includes("{ status: 'image_done', image_url: chosen, prompt: pv.lib.adsV2PresenterV2Performance(chosenHand) }") && src.includes('const chosenHand = hands[kept.indexOf(chosen)] ?? null') &&
  src.includes('phone_ui: phoneUi, hand_counts: handInv.map((h) => (h ? h.hands.length : null))')
await check('H5 o avanço: UMA checagem por opção (mãos + interface), a mão livre pela regra estrita, a escolha que descarta a interface, a atuação da linha pela foto escolhida (mãos paradas salvo 2 mãos confirmadas), tudo no evento', () => h5())

// ═══ A. 0,6 s de silêncio no áudio do motor ═══════════════════════════════════════════════════════════════════════════
console.log('\nA. o áudio do Kling com 0,6 s de silêncio no fim')
const BR1 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320], BR2 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160]
const SR1 = { 44100: 0, 48000: 1, 32000: 2 }, SR2 = { 22050: 0, 24000: 1, 16000: 2 }
const crc16 = (b) => { let c = 0; for (const x of b) { c ^= x; for (let i = 0; i < 8; i++) c = c & 1 ? (c >>> 1) ^ 0xa001 : c >>> 1 } return c }
const be32 = (b, o) => ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0
const put32 = (b, o, v) => { b[o] = (v >>> 24) & 255; b[o + 1] = (v >>> 16) & 255; b[o + 2] = (v >>> 8) & 255; b[o + 3] = v & 255 }
function cab({ mpeg1 = true, sr = 32000, kbps = 128, mono = true }) {
  const h = ((0x7ff << 21) | ((mpeg1 ? 3 : 2) << 19) | (1 << 17) | (1 << 16) | ((mpeg1 ? BR1 : BR2).indexOf(kbps) << 12) | ((mpeg1 ? SR1 : SR2)[sr] << 10) | ((mono ? 3 : 0) << 6)) >>> 0
  const size = Math.floor(((mpeg1 ? 144 : 72) * kbps * 1000) / sr)
  return { h, size, samples: mpeg1 ? 1152 : 576, sr, side: mpeg1 ? (mono ? 17 : 32) : mono ? 9 : 17 }
}
// um MP3 de mentira: ID3v2 + quadro Info (Xing com frames/bytes/TOC/qualidade + tag Lavf/LAME com o CRC) + N quadros "de voz" (bytes não nulos) + ID3v1
function mp3({ n = 40, info = 'Lavf', id3 = true, v1 = true, ...fmt } = {}) {
  const c = cab(fmt)
  const parts = []
  if (id3) parts.push(Uint8Array.from([0x49, 0x44, 0x33, 4, 0, 0, 0, 0, 0, 20, ...new Array(20).fill(7)]))
  const voz = (k) => { const f = new Uint8Array(c.size); put32(f, 0, c.h); for (let i = 4; i < c.size; i++) f[i] = (i * 31 + k * 7) % 251 + 1; return f }
  let infoFrame = null
  if (info) {
    infoFrame = new Uint8Array(c.size); put32(infoFrame, 0, c.h)
    const x = 4 + c.side
    infoFrame.set([0x49, 0x6e, 0x66, 0x6f], x); put32(infoFrame, x + 4, 0x0f); put32(infoFrame, x + 8, n); put32(infoFrame, x + 12, (n + 1) * c.size)
    const p = x + 8 + 4 + 4 + 100 + 4
    infoFrame.set([...info].map((ch) => ch.charCodeAt(0)), p)
    const at = p + 34
    const crc = info === 'Lavf' ? crc16(infoFrame.slice(0, 190)) : crc16(infoFrame.slice(0, at)) // Lavf: os 190 primeiros com o campo zerado (a voz MiniMax); LAME: os bytes antes do campo
    infoFrame[at] = crc >>> 8; infoFrame[at + 1] = crc & 255
    parts.push(infoFrame)
  }
  for (let k = 0; k < n; k++) parts.push(voz(k))
  if (v1) parts.push(Uint8Array.from([0x54, 0x41, 0x47, ...new Array(125).fill(32)]))
  const out = new Uint8Array(parts.reduce((s, p) => s + p.length, 0)); let o = 0; for (const p of parts) { out.set(p, o); o += p.length }
  return { bytes: out, c, first: id3 ? 30 : 0 }
}
// leitor independente: pula o ID3, anda quadro a quadro (Layer III) e soma as amostras
function anda(b) {
  let o = b[0] === 0x49 && b[1] === 0x44 && b[2] === 0x33 ? 10 + (((b[6] & 0x7f) << 21) | ((b[7] & 0x7f) << 14) | ((b[8] & 0x7f) << 7) | (b[9] & 0x7f)) : 0
  let frames = 0, samples = 0, sr = 0
  for (;;) {
    if (o + 4 > b.length || b[o] !== 0xff || (b[o + 1] & 0xe0) !== 0xe0) break
    const h = be32(b, o), v = (h >>> 19) & 3, bi = (h >>> 12) & 15, si = (h >>> 10) & 3
    const m1 = v === 3, s = m1 ? [44100, 48000, 32000][si] : [22050, 24000, 16000][si]
    const size = Math.floor(((m1 ? 144 : 72) * (m1 ? BR1 : BR2)[bi] * 1000) / s) + ((h >>> 9) & 1)
    if (o + size > b.length) break
    frames++; samples += m1 ? 1152 : 576; sr = s; o += size
  }
  return { frames, seconds: sr ? samples / sr : 0, end: o }
}
const a1 = (v2 = V2) => {
  const { bytes, c, first } = mp3({})
  const copia = bytes.slice()
  const r = v2.adsV2PresenterV2PadMp3(bytes, v2.ADS_V2_PRESENTER_V2_TAIL_SILENCE_SECONDS)
  if (!r) return false
  const a = anda(bytes), d = anda(r.bytes)
  const x = first + 4 + c.side
  const silencio = r.bytes.slice(a.end, a.end + r.frames * c.size)
  const cabSilencio = be32(silencio, 0)
  const at = x + 8 + 4 + 4 + 100 + 4 + 34
  const zf = r.bytes.slice(first, first + c.size); zf[at - first] = 0; zf[at - first + 1] = 0
  const crcOk = ((r.bytes[at] << 8) | r.bytes[at + 1]) === crc16(zf.slice(0, 190))
  let soCabecalho = true // fora o Xing (frames/bytes) e o CRC da tag, o começo é o MESMO arquivo
  for (let i = 0; i < a.end; i++) if (r.bytes[i] !== bytes[i] && !(i >= x + 8 && i < x + 16) && !(i >= at && i < at + 2)) soCabecalho = false
  return v2.ADS_V2_PRESENTER_V2_TAIL_SILENCE_SECONDS === 0.6 && r.frames === 17 && near(r.addedSeconds, 0.612) && d.frames === a.frames + 17 && near(d.seconds - a.seconds, 0.612, 1e-3) &&
    r.bytes.length === bytes.length + 17 * c.size && soCabecalho && Buffer.compare(Buffer.from(bytes), Buffer.from(copia)) === 0 &&
    be32(r.bytes, x + 8) === 40 + 17 && be32(r.bytes, x + 12) === 41 * c.size + 17 * c.size && crcOk &&
    cabSilencio === ((c.h | 0x10000) & ~0x200) >>> 0 && silencio.slice(4, c.size).every((z) => z === 0) && silencio.length === 17 * c.size &&
    Buffer.compare(Buffer.from(r.bytes.slice(-128)), Buffer.from(bytes.slice(-128))) === 0 && r.bytes[r.bytes.length - 128] === 0x54 // o ID3v1 continua no FIM
}
await check('A1 EXECUTADO num MP3 montado aqui (a forma da voz MiniMax: ID3 + Info/Lavf, 32 kHz mono 128 kbps): +17 quadros de silêncio (0,612 s) DEPOIS do último quadro de voz e ANTES do ID3v1; o Info passa a contar quadros e bytes; o CRC da tag Lavf recalculado; quadro calado = cabeçalho sem CRC/padding + zeros; a entrada não muda', () => a1())
const a2 = (v2 = V2) => {
  const lame = mp3({ info: 'LAME' })
  const r = v2.adsV2PresenterV2PadMp3(lame.bytes)
  const at = lame.first + 4 + lame.c.side + 8 + 4 + 4 + 100 + 4 + 34
  const lameOk = r && ((r.bytes[at] << 8) | r.bytes[at + 1]) === crc16(r.bytes.slice(lame.first, at))
  const m2 = mp3({ mpeg1: false, sr: 24000, kbps: 64, mono: false, info: null, id3: false, v1: false }) // a TTS de 24 kHz (MPEG-2), sem Xing nem tags
  const r2 = v2.adsV2PresenterV2PadMp3(m2.bytes)
  const lixo = v2.adsV2PresenterV2PadMp3(new Uint8Array(500).fill(9))
  return lameOk && r2 && r2.frames === 25 && near(r2.addedSeconds, 0.6) && anda(r2.bytes).frames === anda(m2.bytes).frames + 25 && r2.bytes.length === m2.bytes.length + 25 * m2.c.size &&
    lixo === null && v2.adsV2PresenterV2PadMp3(m2.bytes, 0) === null && v2.adsV2PresenterV2PadMp3(null) === null
}
await check('A2 a tag LAME (CRC dos bytes antes do campo) também é recalculada; MPEG-2 24 kHz sem Xing ganha 25 quadros (0,6 s); bytes que não são MP3, 0 s ou nada = null (o avanço manda a voz de sempre)', () => a2())
const a3 = (src = ADV) => {
  const fn = src.slice(src.indexOf('async function presenterV2TailVoice('), src.indexOf('/** KINEO-ADS-PRODUTO-NA-MAO-1610 — o interruptor do lado servidor'))
  return fn.includes('pv.lib.adsV2PresenterV2PadMp3(new Uint8Array(await res.arrayBuffer()), pv.lib.ADS_V2_PRESENTER_V2_TAIL_SILENCE_SECONDS)') && fn.includes('uploadVoiceoverToSupabase(order.user_id, Buffer.from(padded.bytes))') && fn.includes('return null') &&
    src.includes('const tail = pv ? await presenterV2TailVoice(order, pv) : null') && src.includes("audioUrl: tail ? tail.url : order.voice_url ?? ''") &&
    src.includes("const genSeconds = engine === 'kling_avatar' ? Math.round(((num(order.voice_seconds) ?? spec.genSeconds) + (tail ? tail.seconds : 0)) * 1000) / 1000 : spec.genSeconds") &&
    src.indexOf('const claimed = await markShot(admin, row, [\'pending\', \'image_done\'], { submit_claimed_at: nowIso() }, \'submit_claimed_at\')') < src.indexOf('const tail = pv ? await presenterV2TailVoice(order, pv) : null') &&
    src.includes("const w = await admin.from('ads_v2_orders').update({ voice_url: voiceUrl, voice_seconds: voiceSeconds,") // a voz do PEDIDO continua a fala real (o corte da montagem usa voice_seconds)
}
await check('A3 o avanço (depois de reservar o envio) manda ao Kling a voz COM o silêncio (cópia no nosso bucket) e cobra os segundos dela; a voz do pedido (voice_url/voice_seconds) continua a fala real; falha = a voz de sempre', () => a3())
const a4 = (v2 = V2) => {
  const u = v2.adsV2PresenterV2UsdPro({ totalUsd: 1.243 }, 15)
  return near(u.avatarUsd, Math.round(0.115 * 11.1 * 1000) / 1000) && near(u.totalUsd, 2.138 + 0.069, 2e-3)
}
await check('A4 o teto do dry-run conta os 0,6 s a mais do avatar PRO (US$ 1,21 → 1,28; anúncio ≈ US$ 2,21)', () => a4())

// ═══ C. corte e dissolve ══════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nC. corte no fim da fala + 0,15 s e dissolve visível para o close')
const PRODUCT = 'https://sb.test/footage/atheeri.jpg'
const montageInput = (v2extra = {}, presenterExtra = {}) => ({
  width: 1080, height: 1920, fontFamily: 'Inter', cardUrl: 'https://sb.test/card.png', cardSeconds: 2.5, musicUrl: 'https://sb.test/m.mp3', voiceUrl: null, voiceSeconds: null,
  overlays: [{ text: 'Perfume Atheeri', start: 0, end: 4 }, { text: 'Um perfume encantador', start: 4, end: 8 }],
  shots: [{ url: PRODUCT, kind: 'text', packshot: true, cutStart: 0, cutSeconds: 4, measuredSeconds: null }, { url: 'https://sb.test/foto.jpg', kind: 'text', cutStart: 0, cutSeconds: 4, measuredSeconds: null }],
  presenter: { url: 'https://sb.test/ator.mp4', measuredSeconds: 9.936 + 0.612 + 0.05, insertOrder: [], v2: { speechSeconds: 9.936, closeUrl: PRODUCT, ...v2extra }, ...presenterExtra },
})
const c1 = (mo = MO) => {
  const comCauda = mo.adsV2PresenterV2Timeline({ clipSeconds: 9.936 + 0.612 + 0.05, speechSeconds: 9.936, cardSeconds: 2.5 })
  const antes = MO_ANTES.adsV2PresenterV2Timeline({ clipSeconds: 9.936 + 0.612 + 0.05, speechSeconds: 9.936, cardSeconds: 2.5 })
  const semCauda = mo.adsV2PresenterV2Timeline({ clipSeconds: 9.867, speechSeconds: 9.936, cardSeconds: 2.5 }) // a R2: o Kling devolveu 9,87 s para 9,94 s de voz
  return mo.ADS_V2_PRESENTER_V2_SPEECH_PAD === 0.15 && near(comCauda.cut, 9.936 + 0.15) && near(comCauda.total, antes.total) && near(comCauda.total, 9.936 + 0.15 + 2 + 2.5) &&
    near(semCauda.cut, 9.867 - mo.ADS_V2_PRESENTER_V2_DISSOLVE) && mo.ADS_V2_PRESENTER_V2_DISSOLVE === 0.35 && comCauda.cut + mo.ADS_V2_PRESENTER_V2_DISSOLVE <= 9.936 + 0.612 + 0.05 + 1e-9
}
await check('C1 o corte = fim real da fala + 0,15 s, com o dissolve de 0,35 s inteiro DENTRO da cauda calada (0,6 s); a duração total do anúncio é a MESMA de antes (14,59 s na fala da R2); sem cauda, o corte recua para caber o dissolve', () => c1())
const c2 = (mo = MO) => {
  const src = mo.buildAdV2Source(montageInput())
  const t = mo.adsV2PresenterV2Timeline({ clipSeconds: 9.936 + 0.612 + 0.05, speechSeconds: 9.936, cardSeconds: 2.5 })
  const ator = src.elements.find((e) => e.type === 'video' && e.source === 'https://sb.test/ator.mp4')
  const close = src.elements.filter((e) => near(e.time, t.cut) && (e.source === PRODUCT || e.type === 'shape') && e.track !== 1)
  const card = src.elements.find((e) => e.source === 'https://sb.test/card.png')
  const textos = src.elements.filter((e) => e.type === 'text')
  const naTrilhaDoAtor = src.elements.filter((e) => e.track === mo.ADS_V2_PRESENTER_TRACK)
  return near(ator.duration, t.cut + 0.35) && ator.track === mo.ADS_V2_PRESENTER_TRACK && ator.volume === '100%' &&
    close.length === 3 && close.every((e) => e.track === mo.ADS_V2_PRESENTER_V2_CLOSE_TRACK && e.track > ator.track && e.enter_transition && e.enter_transition.type === 'fade' && e.enter_transition.duration === 0.35 && near(e.duration, 2 + mo.ADS_V2_MONTAGE_FADE)) &&
    ator.time + ator.duration >= t.cut + 0.35 - 1e-9 && naTrilhaDoAtor.length === 1 && // nada mais na trilha do apresentador: o close CRUZA por cima dele
    card.track === mo.ADS_V2_PRESENTER_V2_CARD_TRACK && card.track > mo.ADS_V2_PRESENTER_V2_CLOSE_TRACK && near(card.time, t.cardStart) && textos.length === 2 && textos.every((e) => e.track === mo.ADS_V2_PRESENTER_V2_TEXT_TRACK && e.time + e.duration <= t.cut + 1e-9) &&
    near(src.duration, t.total) && near(src.duration, MO_ANTES.buildAdV2Source(montageInput()).duration)
}
await check('C2 montagem EXECUTADA: o apresentador (com o som) fica 0,35 s a mais POR BAIXO; o close da foto real entra numa trilha ACIMA dele (era a mesma — o dissolve não cruzava) com fade de 0,35 s; cartão e frases por cima; duração igual à de antes', () => c2())

// ═══ U. foto limpa: a interface de celular descarta a opção ═══════════════════════════════════════════════════════════
console.log('\nU. foto limpa (interface de celular)')
const u1 = (v2 = V2) => {
  const P = v2.adsV2PresenterV2PickClean
  const r2 = P([false, false, false, false], [false, false, false, false], ['yes', 'no', 'no', 'no']) // a R2: a opção 0 com a câmera do iPhone desenhada
  const talvez = P([false, false], [false, false], ['unsure', 'no'])
  const comMao = P([false, false, false], [true, false, true], ['yes', 'no', 'no'])
  const todas = P([false, false], [false, false], ['yes', 'yes'])
  const resto = P([false, true, true], [false, false, false], ['yes', 'no', 'no']) // a única limpa tem a interface: fica a 1ª SEM ela
  const surda = P([null, null], [null, null], [null, null])
  const PU = v2.adsV2PresenterV2PhoneUiOf, PH = v2.adsV2PresenterV2ParseHands
  return r2.index === 1 && r2.why === 'clean_no_free_hand' && talvez.index === 0 && comMao.index === 2 && comMao.why === 'clean_free_hand' && todas.index === 0 && todas.why === 'all_discarded' &&
    resto.index === 1 && resto.why === 'all_discarded' && surda.index === 0 && surda.why === 'unchecked' &&
    PU(PH({ hands: [], phone_ui: 'yes' })) === 'yes' && PU(PH({ hands: [], phone_ui: 'no' })) === 'no' && PU(PH({ hands: [] })) === 'unsure' && PU(PH('lixo')) === null
}
await check('U1 "yes" na interface de celular descarta a opção como "frasco e caixa" (na R2: a 0 sai, fica a 1); "unsure" só registra; com 2 mãos confirmadas, a 1ª limpa SEM interface; todas descartadas = a 1ª sem a interface', () => u1())
const u2 = (src = ADV) => src.includes('const options = kept.map((url, k) => ({ url, bothObjects: both[k] ?? null, freeHand: hands[k] ?? null, phoneUi: phoneUi[k] ?? null }))') && src.includes('phone_ui: phoneUi,')
await check('U2 a resposta de cada opção fica no pedido (options[k].phoneUi) e no evento (phone_ui) — "unsure" vai para o log', () => u2())

// ═══ F. a frase de tela acima do produto ══════════════════════════════════════════════════════════════════════════════
console.log('\nF. a frase de tela acima do produto e das mãos')
const RECT = { x0: 0.3, y0: 0.45, x1: 0.7, y1: 0.8 }
const f1 = (mo = MO) => {
  const g = mo.adsV2PresenterV2OverlayGeometry('Um perfume encantador', 1080, 1920, RECT)
  const sem = mo.adsV2PresenterV2OverlayGeometry('Um perfume encantador', 1080, 1920, null)
  const alto = mo.adsV2PresenterV2OverlayGeometry('Um perfume encantador', 1080, 1920, { x0: 0.3, y0: 0.05, x1: 0.7, y1: 0.4 })
  const baixo = mo.adsV2PresenterV2OverlayGeometry('Um perfume encantador', 1080, 1920, { x0: 0.3, y0: 0.97, x1: 0.7, y1: 0.99 })
  const safe = mo.ADS_V2_OVERLAY_SAFE['9:16']
  const lineH = (g.font_size * mo.ADS_V2_OVERLAY_LINE_HEIGHT) / 1920
  const lines = mo.adsV2OverlayLines('Um perfume encantador', g.font_size, 1080).length
  return g.place.band === 'above_product' && g.y_anchor === '100%' && g.place.bottom + mo.ADS_V2_OVERLAY_PILL_PAD <= RECT.y0 - mo.ADS_V2_OVERLAY_AVOID_PAD + 1e-9 && near(g.place.bottom, RECT.y0 - mo.ADS_V2_OVERLAY_AVOID_PAD - mo.ADS_V2_OVERLAY_PILL_PAD, 1e-4) &&
    sem.place.band === 'upper_third' && sem.place.bottom < 1 / 3 && near(sem.place.bottom, safe.top + mo.ADS_V2_OVERLAY_PILL_PAD + 2 * lineH, 1e-4) &&
    near(alto.place.bottom, safe.top + mo.ADS_V2_OVERLAY_PILL_PAD + lines * lineH, 1e-4) && near(baixo.place.bottom, safe.bottom - mo.ADS_V2_OVERLAY_PILL_PAD, 1e-4)
}
await check('F1 a frase do v2 fica logo ACIMA do topo do produto (com folga), presa à zona segura (produto alto = topo da zona; produto baixo = faixa de baixo); sem o retângulo, o terço de cima', () => f1())
const f2 = (mo = MO, v2 = V2) => {
  const comRect = mo.buildAdV2Source(montageInput({ productRect: RECT })).elements.filter((e) => e.type === 'text')
  const semRect = mo.buildAdV2Source(montageInput()).elements.filter((e) => e.type === 'text')
  const antes = MO_ANTES.buildAdV2Source(montageInput()).elements.filter((e) => e.type === 'text')
  const yr = (e) => parseFloat(e.y) / 100
  const rect = v2.adsV2PresenterV2ProductRect({ products: [{ type: 'box', box: [100, 100, 900, 900], visible: 'yes' }, { type: 'bottle', box: [450, 300, 800, 700], visible: 'yes' }, { type: 'bottle', box: [0, 0, 1000, 1000], visible: 'unsure' }], people: [], hands: 'yes' })
  return comRect.length === 2 && comRect.every((e) => yr(e) <= RECT.y0 - mo.ADS_V2_OVERLAY_AVOID_PAD) && semRect.every((e) => yr(e) < 1 / 3) && antes.every((e) => yr(e) > 0.6) && // antes: a faixa de baixo (os dedos)
    rect && near(rect.x0, 0.3) && near(rect.y0, 0.45) && near(rect.x1, 0.7) && near(rect.y1, 0.8) && v2.adsV2PresenterV2ProductRect(null) === null && v2.adsV2PresenterV2ProductRect({ products: [{ type: 'box', box: [1, 1, 2, 2], visible: 'yes' }] }) === null
}
await check('F2 montagem EXECUTADA: com o retângulo, as 2 frases ficam acima do produto (antes: na faixa de baixo, sobre os dedos); sem ele, no terço de cima; o retângulo = o maior produto "yes" do inventário (nunca a caixa)', () => f2())
const f3 = (src = ADV) => src.includes('const productRect = pv.lib.adsV2PresenterV2ProductRect(invs[kept.indexOf(chosen)] ?? null)') && src.includes('chosenWhy: pick.why, productRect }') &&
  src.includes('closeUrl: presenterV2.productUrl, productRect: presenterV2.v2?.productRect ?? null') && src.includes("vis.adsV2InHandInventoryOf(u).catch(() => null)")
await check('F3 o avanço tira o retângulo do MESMO inventário da checagem "frasco e caixa" (sem chamada nova), grava no pedido e passa à montagem', () => f3())

// ═══ D. desfaz, marca, encadeamento ══════════════════════════════════════════════════════════════════════════════════
console.log('\nD. desfaz exato, marca, encadeamento, diff só nos arquivos da lista')
await check(`D1 cada arquivo tocado, desfeito (scripts/test-support/desfaz-apresentador-v2-ajuste-3-1710.mjs), é EXATAMENTE a origin/main ${B.slice(0, 9)}; a ida devolve o vivo; os novos existem e não existiam`, () =>
  APRESENTADOR_V2_AJUSTE_3_1710_ARQUIVOS.length === 5 && APRESENTADOR_V2_AJUSTE_3_1710_ARQUIVOS.every((f) => base(f) !== null && semApresentadorV2Ajuste3_1710(f, rd(f)) === base(f) && comApresentadorV2Ajuste3_1710(f, base(f)) === rd(f) && !semApresentadorV2Ajuste3_1710(f, rd(f)).includes(MARCA)) &&
  MARCA_APRESENTADOR_V2_AJUSTE_3_1710 === MARCA && APRESENTADOR_V2_AJUSTE_3_1710_NOVOS.every((f) => existsSync(join(ROOT, f)) && base(f) === null))
await check('D2 todo bloco do desfaz traz a marca; o diff contra a base só toca os arquivos da lista e os novos (cobrança, /start, /plan, texto, visão, TTS, compose, motores e o ator de antes fora)', () => {
  const src = rd('scripts/test-support/desfaz-apresentador-v2-ajuste-3-1710.mjs')
  const D = JSON.parse(src.split('\n').find((l) => l.startsWith('const DESFAZ = ')).slice('const DESFAZ = '.length))
  const blocos = Object.values(D).flat()
  const shas = git('log', '--no-merges', '--format=%H', `--grep=${MARCA}`, 'HEAD').trim().split('\n').filter(Boolean)
  const TOPO = shas[0] || 'HEAD'
  const tocados = git('diff', '--name-only', B, TOPO).trim().split('\n').filter(Boolean).concat(git('diff', '--name-only', 'HEAD').trim().split('\n').filter(Boolean).filter((f) => !diffSoHome3Cards1910(git('diff', '-U0', '--no-color', 'HEAD', '--', f), f))) // reancorado KINEO-HOME-3-CARDS-1910 — o não commitado só desta entrega (todo bloco com a marca) fora da lista
  const permitidos = new Set([...APRESENTADOR_V2_AJUSTE_3_1710_ARQUIVOS, ...APRESENTADOR_V2_AJUSTE_3_1710_NOVOS])
  return blocos.length > 0 && blocos.every((h) => h.now.join('\n').includes(MARCA)) && tocados.length > 0 && tocados.every((f) => permitidos.has(f)) &&
    ['lib/ads/v2Tiers.ts', 'lib/ads/v2Billing.ts', 'lib/ads/v2StartCore.ts', 'lib/ads/v2PlanCore.ts', 'lib/ads/v2Brief.ts', 'lib/ads/v2LockVision.ts', 'lib/ttsFallback.ts', 'lib/compose.ts', 'app/api/audio/generate/route.ts', 'lib/ads/v2Engines.ts', 'lib/avatar/veed.ts', 'lib/avatar/voice.ts', 'lib/ads/v2Presenter.ts', 'lib/ads/producao.ts', 'lib/lyriaMusic.ts'].every((f) => !tocados.includes(f))
})
await check('D3 encadeamento: o desfaz do ajuste anterior (e, por ele, o apresentador v2, a grade do juiz e a cadeia toda) tira esta camada PRIMEIRO; texto sem a marca, arquivo fora da lista e null passam igual; o guardião do ajuste anterior foi reancorado', () => {
  return APRESENTADOR_V2_AJUSTE_3_1710_ARQUIVOS.filter((f) => f.startsWith('lib/')).every((f) => {
    const vivo = rd(f)
    const semEste = semApresentadorV2Ajuste3_1710(f, vivo)
    return desfazApresentadorV2Ajuste1710(f, vivo) === desfazApresentadorV2Ajuste1710(f, semEste) && semApresentadorV2_1710(f, vivo) === semApresentadorV2_1710(f, semEste) &&
      desfazApresentadorV2_1710(f, vivo) === desfazApresentadorV2_1710(f, semEste) && desfazJuizGrade1610(f, vivo) === desfazJuizGrade1610(f, semEste) && desfazApresentadorV2Ajuste3_1710(f, base(f)) === base(f)
  }) && semApresentadorV2Ajuste1710(F.v2, rd(F.v2)) === semApresentadorV2Ajuste1710(F.v2, semApresentadorV2Ajuste3_1710(F.v2, rd(F.v2))) &&
    desfazApresentadorV2Ajuste3_1710(F.vision, rd(F.vision)) === rd(F.vision) && desfazApresentadorV2Ajuste3_1710(F.advance, null) === null &&
    /reancorado KINEO-APRESENTADOR-V2-AJUSTE-3-1710/.test(rd('scripts/test-apresentador-v2-ajuste-1710.mjs')) &&
    /desfazApresentadorV2Ajuste3_1710\(rel, String\(text\)\) \/\/ KINEO-APRESENTADOR-V2-AJUSTE-3-1710/.test(rd('scripts/test-support/desfaz-apresentador-v2-ajuste-1710.mjs')) &&
    /text = desfazApresentadorV2Ajuste3_1710\(rel, text\) \/\/ KINEO-APRESENTADOR-V2-AJUSTE-3-1710/.test(rd('scripts/test-support/desfaz-apresentador-v2-ajuste-1710.mjs'))
})
await check("D4 as travas: só contas internas (ADS_V2_PRESENTER_V2_MODE = 'internal'), só o Comercial; a lib do v2 continua PURA (só import type) e a montagem sem import; o avanço carrega a lib por import DINÂMICO", () => {
  const v2src = rd(F.v2)
  return V2.ADS_V2_PRESENTER_V2_MODE === 'internal' && JSON.stringify(V2.ADS_V2_PRESENTER_V2_TIERS) === '["commercial"]' && v2src.split('\n').filter((l) => /^import /.test(l)).every((l) => /^import type /.test(l)) &&
    !/^import /m.test(rd(F.montage)) && !/^import [^\n]*v2PresenterV2/m.test(ADV) && ADV.includes("return import('@/lib/ads/v2PresenterV2')")
})

// ═══ M. mutantes ═════════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nM. mutantes (cada um APLICADO e VERMELHO)')
const mut = async (m, fn) => { let vermelho = false; try { vermelho = !(await fn()) } catch (e) { vermelho = !/mutante (não aplicou|sem efeito)/.test(String(e && e.message)) } ok(vermelho, 'mutante vermelho: ' + m) }
const advCom = (a, b) => trocar(ADV, a, b)
await mut('H: a regra de antes (qualquer mão que não diga "yes" no produto)', () => h1(comV2("  const free = inv.hands.filter((h) => h.holds === 'no' && h.whole === 'yes').length", "  const free = inv.hands.filter((h) => h.holds !== 'yes' && h.whole === 'yes').length")))
await mut('H: "unsure" na mão inteira confirma', () => h1(comV2("  const holding = inv.hands.filter((h) => h.holds === 'yes' && h.whole === 'yes').length", "  const holding = inv.hands.filter((h) => h.holds === 'yes' && h.whole !== 'no').length")))
await mut('H: a contagem é ignorada', () => h1(comV2('if (inv.hands.length !== 2 || (inv.count != null && inv.count !== 2)) return false', 'if (inv.hands.length !== 2) return false')))
await mut('H: 3 mãos valem', () => h1(comV2('if (inv.hands.length !== 2 || (inv.count != null && inv.count !== 2)) return false', 'if (inv.hands.length < 2) return false')))
await mut('H: na dúvida, gesto', () => h2(comV2('return freeHand === true ? ADS_V2_PRESENTER_V2_PERFORMANCE_PROMPT : ADS_V2_PRESENTER_V2_PERFORMANCE_PROMPT_STILL', 'return freeHand !== false ? ADS_V2_PRESENTER_V2_PERFORMANCE_PROMPT : ADS_V2_PRESENTER_V2_PERFORMANCE_PROMPT_STILL')))
await mut('H: a frase afirmativa das mãos paradas some', () => h2(comV2('only the one hand holding the product is in the frame and it stays still; the other arm rests out of frame; ', 'the hands in the frame stay exactly the ones in the photo, calm and in place; ')))
await mut('H: sem as piscadas calmas', () => h2(comV2('natural blinking at a relaxed pace; steady camera', 'steady camera')))
await mut('H: a pergunta volta a "List every human hand"', () => h3(comV2('How many separate hands are visible? Count each human hand once.', 'List every human hand you can see in it.')))
await mut('H: a pergunta esquece a interface', () => h3(comV2(' "phone_ui": is there any phone camera interface, on-screen buttons or overlaid text drawn in the image? "yes", "no" or "unsure" (the printed label on the product itself does not count).', '')))
await mut('H: a mão livre volta a "fully inside the frame" sem o peito', () => h4(comV2("'The other hand rests open on the chest, clearly visible and fully inside the frame,", "'The other hand is fully inside the frame,")))
await mut('H: a foto limpa sai do prompt', () => h4(comV2('    ADS_V2_PRESENTER_V2_CLEAN_PHOTO, // ' + MARCA + '\n', '')))
await mut('H: o avanço escolhe sem a interface', () => h5(advCom('const pick = pv.lib.adsV2PresenterV2PickClean(both, hands, phoneUi)', 'const pick = pv.lib.adsV2PresenterV2PickHand(both, hands)')))
await mut('A: nenhum quadro de silêncio', () => a1(comV2('  const frames = Math.ceil((seconds * head.sr) / head.samples - 1e-9)', '  const frames = 0')))
await mut('A: o Info não conta os quadros novos', () => a1(comV2('  mp3FixVbrHeader(out, first, head, frames, frames * sh.size)', '  void mp3FixVbrHeader')))
await mut('A: o CRC da tag fica velho', () => a1(comV2('      if (c !== null) { out[first + at] = (c >>> 8) & 255; out[first + at + 1] = c & 255 }', '      void c')))
await mut('A: o silêncio entra DEPOIS do ID3v1', () => a1(comV2('  for (let hd = mp3HeadAt(b, end); hd && hd.sr === head.sr', '  end = b.length\n  for (let hd = mp3HeadAt(b, end); hd && hd.sr === head.sr')))
await mut('A: o silêncio vira 0,3 s', () => a1(comV2('export const ADS_V2_PRESENTER_V2_TAIL_SILENCE_SECONDS = 0.6', 'export const ADS_V2_PRESENTER_V2_TAIL_SILENCE_SECONDS = 0.3')))
await mut('A: o avanço manda a voz sem o silêncio', () => a3(advCom("audioUrl: tail ? tail.url : order.voice_url ?? ''", "audioUrl: order.voice_url ?? ''")))
await mut('A: o custo esquece o silêncio', () => a4(comV2('(ADS_V2_PRESENTER_V2_VOICE_TARGET_SECONDS + ADS_V2_PRESENTER_V2_TAIL_SILENCE_SECONDS)', '(ADS_V2_PRESENTER_V2_VOICE_TARGET_SECONDS)')))
await mut('C: o close volta à trilha do apresentador', () => c2(comMO('adsV2PackshotElements(v2.closeUrl, ADS_V2_PRESENTER_V2_CLOSE_TRACK,', 'adsV2PackshotElements(v2.closeUrl, ADS_V2_PRESENTER_TRACK,')))
await mut('C: o dissolve volta a 0,25 s', () => c2(comMO("{ enter_transition: { type: 'fade', duration: ADS_V2_PRESENTER_V2_DISSOLVE } }", "{ enter_transition: { type: 'fade', duration: ADS_V2_MONTAGE_FADE } }")))
await mut('C: o apresentador sai antes do fim do dissolve', () => c2(comMO('duration: r3(t.cut + ADS_V2_PRESENTER_V2_DISSOLVE), source: presenter.url.trim()', 'duration: r3(t.cut + ADS_V2_MONTAGE_FADE), source: presenter.url.trim()')))
await mut('C: o corte cai no limite de antes (o dissolve não cabe)', () => c1(comMO('  const room = r3(i.clipSeconds - ADS_V2_PRESENTER_V2_DISSOLVE)', '  const room = r3(i.clipSeconds - ADS_V2_MONTAGE_FADE)')))
await mut('C: o corte esquece o fim da fala', () => c1(comMO('export const ADS_V2_PRESENTER_V2_SPEECH_PAD = 0.15', 'export const ADS_V2_PRESENTER_V2_SPEECH_PAD = 0.75')))
await mut('U: a interface não descarta', () => u1(comV2("  const merged = both.map((b, k) => (ui[k] === 'yes' ? true : b))", '  const merged = both.slice()')))
await mut('U: "unsure" descarta', () => u1(comV2("  const merged = both.map((b, k) => (ui[k] === 'yes' ? true : b))", "  const merged = both.map((b, k) => (ui[k] === 'yes' || ui[k] === 'unsure' ? true : b))")))
await mut('F: a frase ignora o retângulo', () => f1(comMO('  const bottom = okRect ? Math.min(lowest,', '  const bottom = false ? Math.min(lowest,')))
await mut('F: a montagem volta à geometria de antes', () => f2(comMO('    const geo = adsV2PresenterV2OverlayGeometry(text, width, height, v2.productRect ?? null)', '    const geo = adsV2OverlayGeometry(text, width, height, null)')))
await mut('F: o retângulo aceita a caixa', () => f2(undefined, comV2("p.visible === 'yes' && p.type !== 'box' && ok(p.box)", "p.visible === 'yes' && ok(p.box)")))
await mut('F: o avanço não passa o retângulo', () => f3(advCom('closeUrl: presenterV2.productUrl, productRect: presenterV2.v2?.productRect ?? null', 'closeUrl: presenterV2.productUrl')))

console.log(`\n${pass} ok, ${fail} falha(s)`)
process.exit(fail === 0 ? 0 : 1)
