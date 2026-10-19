// KINEO-CLOSE-REAL-LEGENDA-1910 — guardião da LEGENDA MENOR do formato "Close do produto real" do Studio Ads (fundador 19/10, nota 8,5: "achei a legenda um
// pouco grande"; pesquisa: docs/PESQUISA-TAMANHO-LEGENDA-ADS-2026-10-19.md — legenda falada do mercado em 2,5–3,5% da altura, gancho 3,5–5%, branca com contorno).
// Roda com `node scripts/test-close-real-legenda-1910.mjs` na raiz do repo, sem rede, sem banco, sem fornecedor: os módulos são transpilados pelo typescript
// do repo (scripts/test-support/offline-ts-loader.mjs) e a MONTAGEM é executada de verdade, lado a lado com a régua de antes (a camada desfeita em memória).
//
// O que prova:
//   S  TAMANHO: toda legenda da fala em 3,6% da altura (69 px em 1920), ≤ 2 linhas de ≤ 4 palavras; o título do gancho segue IDÊNTICO (4,5%, pílula);
//   E  ESTILO: a fala é branca com EXATAMENTE o contorno da legenda dos filmes no ar (lib/compose.ts), sem pílula (nenhum background_*) e sem shadow_* (nunca exercitado);
//   C  ENCURTAMENTO: a frase falada que passa de 2 linhas é encurtada no fim de uma oração — nunca um pedaço do meio, nunca termina em palavra fraca;
//   P  LUGAR: a legenda menor continua fora do produto (as caixas do recorte com o zoom do plano);
//   R  O RESTO intocado: fora as legendas da fala, a montagem é a mesma de antes elemento a elemento; sem voz = o título grande e as frases no estilo da fala;
//   D  desfaz exato + novos + marca + encadeamento (os guardiões do Close real tiram esta camada PRIMEIRO);
//   M  mutantes (todos APLICADOS e VERMELHOS).
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
const isDeepStrictEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b) // os objetos da montagem nascem no contexto do carregador (outro protótipo): compara o JSON, a mesma coisa que vai ao Creatomate
import zlib from 'node:zlib'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
import { semCloseRealLegenda1910, CLOSE_REAL_LEGENDA_1910_ARQUIVOS, CLOSE_REAL_LEGENDA_1910_NOVOS, CLOSE_REAL_LEGENDA_1910_BASE, MARCA_CLOSE_REAL_LEGENDA_1910, TROCAS_CLOSE_REAL_LEGENDA_1910, ACRESCIMOS_CLOSE_REAL_LEGENDA_1910 } from './test-support/desfaz-close-real-legenda-1910.mjs'
import { semCloseRealV3_1910 } from './test-support/desfaz-close-real-v3-1910.mjs'
import { semCloseRealAjuste1910 } from './test-support/desfaz-close-real-ajuste-1910.mjs'
import { semCloseReal1910 } from './test-support/desfaz-close-real-1910.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(ROOT)
const MARCA = 'KINEO-CLOSE-REAL-LEGENDA-1910'
const lf = (s) => String(s).split('\r\n').join('\n')
const disco = (p) => lf(readFileSync(join(ROOT, p), 'utf8'))
const git = (...a) => execFileSync('git', ['-C', ROOT, ...a], { encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] })
const base = (p) => { try { return lf(git('show', `${CLOSE_REAL_LEGENDA_1910_BASE}:${p}`)) } catch { return null } }
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }
const check = async (m, fn) => { let v = false; try { v = !!(await fn()) } catch (e) { console.log('       (lançou: ' + (e && e.message) + ')'); v = false } ok(v, m) }
const trocar = (src, a, b) => { const n = src.split(a).length - 1; if (n !== 1) throw new Error('mutante não aplicou (' + n + 'x): ' + a.slice(0, 70)); const out = src.split(a).join(b); if (out === src) throw new Error('mutante sem efeito'); return out }

const FCR = 'lib/ads/v2CloseReal.ts'
const SRC = disco(FCR)
// over: texto do v2CloseReal no lugar do disco (mutante); velho: a régua de antes (esta camada desfeita em memória)
const CR = (over = null, velho = false) => createOfflineLoader({ mocks: { 'node:zlib': zlib }, source: (rel, text) => (rel === FCR && over !== null ? over : velho ? semCloseRealLegenda1910(text, rel) : text) })(FCR)
const H = (n) => `https://cdn.test/${n}`
const FOTOS = [H('frasco-pequeno.jpg'), H('frasco-bege.jpg'), H('cetim.jpg')]
// o canário v2 (19/10) e um texto de palavras curtas (onde 5 palavras caberiam numa linha)
const NARR = {
  en: 'Explore the enchanting scents from Perfume LUME. Each fragrance tells a unique story, inviting you to experience something truly special. Find your new favorite scent today and indulge yourself!',
  pt: 'Conheça Perfume LUME. Um aroma envolvente que te transporta a momentos especiais. Experimente a sensação única de Perfume LUME e sinta a fragrância que encanta a todos. Você merece.',
  curto: 'Meet Perfume LUME. It is so good and we all love it so much. Try it now and see why you will love it too!',
}
const VOZ = { en: 12.13, pt: 12.6, curto: 9.5 }
const BUILD = (lang, w = 1080, h = 1920, extra = {}) => ({ width: w, height: h, heroUrl: H('hero.png'), heroFallbackUrl: FOTOS[0], photos: FOTOS, phrases: [lang === 'pt' ? 'Perfume LUME - Fragrâncias Únicas' : 'Perfume LUME - Unique Fragrances', 'x'], fontFamily: 'Montserrat', cardUrl: H('card.png'), cardSeconds: 2.5, musicUrl: H('m.mp3'), musicTrimStart: 0, voiceUrl: H('v.mp3'), voiceSeconds: VOZ[lang], watermark: null, narration: NARR[lang], closeCard: { url: H('cc.png'), name: 'Perfume LUME', cta: lang === 'pt' ? 'Compre agora' : 'Shop now', ink: '#2a1d10' }, ...extra })
const legendas = (cr, src) => src.elements.filter((e) => e.type === 'text' && e.track === cr.ADS_V2_CLOSE_REAL_TRACKS.text).sort((a, b) => a.time - b.time)
const QUADROS = [[1080, 1920], [720, 1280]]
const CASOS = ['en', 'pt', 'curto']
const FUNDO = ['background_color', 'background_x_padding', 'background_y_padding', 'border_radius', 'background_border_radius']
// independente do módulo: o texto cabe em ≤ 2 linhas de ≤ 4 palavras e ≤ perLine caracteres (a mesma largura útil da pílula de antes: 90% × 94%, 0,58 em por caractere)?
const cabeEm2de4 = (txt, px, W) => {
  const per = Math.max(4, Math.floor((W * 0.9 * 0.94) / (px * 0.58)))
  const ws = String(txt).split(/\s+/).filter(Boolean)
  for (let k = 0; k <= ws.length; k++) { const a = ws.slice(0, k), b = ws.slice(k); if (a.length <= 4 && b.length <= 4 && a.join(' ').length <= per && b.join(' ').length <= per) return ws.length > 0 }
  return false
}
const frases = (t) => t.split(/(?<=[.!?…])\s+/u).map((s) => s.trim()).filter(Boolean)
const palavras = (s) => String(s).toLocaleLowerCase().replace(/[^\p{L}\p{N}\s'’-]/gu, ' ').split(/\s+/).filter(Boolean)
const FRACAS = new Set(['a', 'an', 'the', 'of', 'to', 'from', 'with', 'and', 'or', 'but', 'that', 'de', 'do', 'da', 'e', 'o', 'que', 'para', 'com', 'um', 'uma', 'em', 'te', 'so', 'it'])

// ── S: o tamanho ────────────────────────────────────────────────────────────────────────────────────────────────────
const provaTamanho = (over = null) => {
  const cr = CR(over), velho = CR(null, true)
  return QUADROS.every(([W, HH]) => CASOS.every((lang) => {
    const els = legendas(cr, cr.buildAdV2CloseRealSource(BUILD(lang, W, HH)))
    const antes = legendas(velho, velho.buildAdV2CloseRealSource(BUILD(lang, W, HH)))
    const titulo = els[0], fala = els.slice(1)
    // o título do gancho: o MESMO elemento de antes (4,5%, pílula), no quadro 0
    const tituloIgual = titulo.time === 0 && titulo.text.includes('\n') && isDeepStrictEqual(titulo, antes[0]) && titulo.font_size === Math.round(0.045 * HH) && titulo.background_color === 'rgba(0,0,0,0.6)'
    // a fala: 3,6% cravado, ≤ 2 linhas de ≤ 4 palavras (conta do módulo E conta independente)
    const px = Math.round(0.036 * HH)
    const falaPequena = fala.length >= 2 && fala.every((e) => e.font_size === px && e.font_size < titulo.font_size && cabeEm2de4(e.text, e.font_size, W) && cr.adsV2CloseRealSpeechLines(e.text, e.font_size, W).length <= 2 && cr.adsV2CloseRealSpeechLines(e.text, e.font_size, W).every((l) => l.split(' ').length <= 4))
    return tituloIgual && falaPequena && cr.ADS_V2_CLOSE_REAL_SPEECH_FONT === 0.036 && cr.ADS_V2_CLOSE_REAL_SPEECH_LINE_WORDS === 4 && cr.ADS_V2_CLOSE_REAL_CAPTION_FONT === 0.045
  })) && cr.adsV2CloseRealSpeechLines('Get it now for you', 69, 1080).join('|') === 'Get it now for|you' && cr.adsV2CloseRealSpeechLines('Perfume LUME\nUnique', 69, 1080).join('|') === 'Perfume LUME|Unique'
}

// ── E: o estilo ─────────────────────────────────────────────────────────────────────────────────────────────────────
// o contorno da legenda dos filmes no ar, lido do bloco da legenda em lib/compose.ts (fill_color da ênfase → stroke_color → … → stroke_width → background_color)
const filme = (() => {
  const c = disco('lib/compose.ts')
  const i = c.indexOf("fill_color: emphasize ? HIGHLIGHT_COLOR : '#ffffff',")
  const bloco = i > 0 ? c.slice(i, c.indexOf("background_color: 'rgba(0,0,0,0.60)'", i)) : ''
  const cor = /stroke_color: '([^']+)'/.exec(bloco), larg = /stroke_width: (\d+),/.exec(bloco)
  const f15 = disco('lib/filmes/faceless15.ts')
  return cor && larg && f15.includes(`stroke_color: '${cor[1]}', stroke_width: ${larg[1]},`) ? { stroke_color: cor[1], stroke_width: Number(larg[1]) } : null
})()
const provaEstilo = (over = null) => {
  const cr = CR(over)
  return !!filme && filme.stroke_color === 'rgba(0,0,0,0.98)' && filme.stroke_width === 3 && QUADROS.every(([W, HH]) => CASOS.every((lang) => {
    const src = cr.buildAdV2CloseRealSource(BUILD(lang, W, HH))
    const els = legendas(cr, src)
    const fala = els.slice(1)
    const semSombra = !JSON.stringify(src).includes('shadow')
    return semSombra && FUNDO.some((k) => k in els[0]) && fala.every((e) => e.stroke_color === filme.stroke_color && e.stroke_width === filme.stroke_width && e.fill_color === '#ffffff' && e.font_weight === '800' && FUNDO.every((k) => !(k in e)))
  })) && !/shadow_\w*['"]?\s*:/.test(SRC) // nenhuma propriedade shadow_* no formato (o comentário que explica a ausência pode citar o nome)
}

// ── C: o encurtamento ───────────────────────────────────────────────────────────────────────────────────────────────
const provaEncurta = (over = null) => {
  const cr = CR(over)
  const enc = (s) => cr.adsV2CloseRealCaptionWords(s.split(' '), 1080, 1920).join(' ')
  const unit = enc('Experimente a sensação única de Perfume LUME e sinta a fragrância que encanta a todos.') === 'Experimente a sensação única de Perfume LUME' &&
    enc('Find your new favorite scent today and indulge yourself!') === 'Find your new favorite scent today' &&
    enc('Each fragrance tells a unique story, inviting you to experience something truly special.') === 'Each fragrance tells a unique story,' &&
    enc('Um aroma envolvente que te transporta a momentos especiais.') === 'Um aroma envolvente que te transporta' &&
    enc('Você vai amar.') === 'Você vai amar.' && enc('Try it now and see why!') === 'Try it now and see why!'
  // na montagem: cada legenda da fala é o COMEÇO de uma frase (maiúscula), nunca 2 frases, nunca termina em palavra fraca; os pedaços do canário não voltam
  const mont = CASOS.every((lang) => {
    const els = legendas(cr, cr.buildAdV2CloseRealSource(BUILD(lang)))
    const fs = frases(NARR[lang])
    return els.slice(1).every((e) => { const w = palavras(e.text); return fs.some((s) => palavras(s).slice(0, w.length).join(' ') === w.join(' ')) && /^\p{Lu}/u.test(e.text) && !/[.!?…]\s/u.test(e.text) && !FRACAS.has(w[w.length - 1]) && !/e sinta$|^a fragrância|^inviting/i.test(e.text) })
  })
  return unit && mont
}

// ── P: fora do produto ──────────────────────────────────────────────────────────────────────────────────────────────
const CAIXAS = { [FOTOS[1]]: { w: 1080, h: 1920, x0: 0.3, x1: 0.7, y0: 0.1, y1: 0.45 }, [FOTOS[2]]: { w: 1080, h: 1920, x0: 0.32, x1: 0.68, y0: 0.32, y1: 0.8 }, [FOTOS[0]]: { w: 1080, h: 1350, x0: 0.3, x1: 0.7, y0: 0.08, y1: 0.4 } }
const provaLugar = (over = null) => {
  const cr = CR(over)
  return ['pt', 'en'].every((lang) => {
    const b = BUILD(lang, 1080, 1920, { photoBoxes: CAIXAS })
    const src = cr.buildAdV2CloseRealSource(b)
    const t = cr.adsV2CloseRealTimeline({ voiceSeconds: b.voiceSeconds })
    const win = cr.adsV2CloseRealPlanWindows({ timeline: t, shotPhotos: cr.adsV2CloseRealShotPhotos(FOTOS), photoBoxes: CAIXAS, hookCutout: true, frameW: 1080, frameH: 1920 })
    return legendas(cr, src).slice(1).every((e) => {
      const n = cr.adsV2CloseRealSpeechLines(e.text, e.font_size, 1080).length, yb = parseFloat(e.y) / 100
      const top = yb - (n * e.font_size * 1.1) / 1920, bottom = yb
      return top >= 0.14 - 1e-6 && bottom <= 0.8 + 1e-6 && win.every((w) => !(e.time < w.end - 1e-6 && e.time + e.duration > w.start + 1e-6) || !w.span || !(w.span.x1 > 0.1 && w.span.x0 < 0.9 && bottom > w.span.y0 && top < w.span.y1))
    })
  })
}

// ── R: o resto intocado ─────────────────────────────────────────────────────────────────────────────────────────────
const provaResto = () => {
  const cr = CR(), velho = CR(null, true)
  const fora = (c, src) => src.elements.filter((e) => !(e.type === 'text' && e.track === c.ADS_V2_CLOSE_REAL_TRACKS.text))
  const igual = QUADROS.every(([W, HH]) => CASOS.every((lang) => { const a = cr.buildAdV2CloseRealSource(BUILD(lang, W, HH)), b = velho.buildAdV2CloseRealSource(BUILD(lang, W, HH)); return isDeepStrictEqual(fora(cr, a), fora(velho, b)) && isDeepStrictEqual(legendas(cr, a).map((e) => [e.text, e.time, e.duration].join('|')).slice(0, 1), legendas(velho, b).map((e) => [e.text, e.time, e.duration].join('|')).slice(0, 1)) }))
  // sem voz: o título grande na pílula; as outras frases de tela no estilo da fala
  const sv = { ...BUILD('en'), voiceUrl: null, voiceSeconds: null, narration: null, phrases: ['Perfume LUME - Unique Fragrances', 'Long lasting scent', 'Made for you'] }
  const els = legendas(cr, cr.buildAdV2CloseRealSource(sv))
  const semVoz = els.length >= 2 && els[0].font_size === 86 && els[0].background_color === 'rgba(0,0,0,0.6)' && els.slice(1).every((e) => e.font_size === 69 && !('background_color' in e) && e.stroke_width === 3)
  // sem título: nenhuma legenda fica grande
  const st = legendas(cr, cr.buildAdV2CloseRealSource({ ...BUILD('en'), phrases: [] }))
  return igual && semVoz && st.length >= 2 && st.every((e) => e.font_size === 69 && !('background_color' in e))
}

console.log('\nS. o tamanho')
await check('S1 EXECUTADO (canário EN e PT + palavras curtas; 1080×1920 e 720×1280): toda legenda da fala em 3,6% da altura (69 px em 1920), ≤ 2 linhas de ≤ 4 palavras (conta do módulo e conta independente); o título do gancho é o MESMO elemento de antes (4,5%, pílula)', () => provaTamanho())
console.log('\nE. o estilo')
await check(`E1 EXECUTADO: a fala é branca, negrito 800, com EXATAMENTE o contorno da legenda dos filmes no ar (lib/compose.ts ≡ lib/filmes/faceless15.ts: ${filme ? `stroke_color ${filme.stroke_color}, stroke_width ${filme.stroke_width}` : 'NÃO ACHADO'}), sem pílula (nenhum background_*/border_radius) e sem shadow_* (nunca exercitado); o título segue na pílula`, () => provaEstilo())
console.log('\nC. o encurtamento')
await check('C1 a frase que passa de 2 linhas de 4 palavras é encurtada no fim de uma oração ("…de Perfume LUME | e sinta…", "…scent today | and…", "…unique story, | inviting"), nunca em palavra fraca; frase curta inteira; na montagem toda legenda é o começo de uma frase', () => provaEncurta())
console.log('\nP. o lugar')
await check('P1 EXECUTADO com as caixas do recorte: a legenda menor fica entre 14% e 80% e não cruza o produto de nenhum plano em que está na tela', () => provaLugar())
console.log('\nR. o resto')
await check('R1 EXECUTADO lado a lado com a régua de antes: fora as legendas, a montagem é IDÊNTICA elemento a elemento (fotos, gancho, cartão, botão, voz, música); sem voz = título grande na pílula + frases no estilo da fala; sem título = tudo no estilo da fala', () => provaResto())

console.log('\nD. desfaz exato, novos, marca, encadeamento')
await check(`D1 cada arquivo tocado, desfeito (scripts/test-support/desfaz-close-real-legenda-1910.mjs), é EXATAMENTE a base ${CLOSE_REAL_LEGENDA_1910_BASE.slice(0, 9)}; os novos existem e não existiam lá`, () =>
  CLOSE_REAL_LEGENDA_1910_ARQUIVOS.length === 4 && CLOSE_REAL_LEGENDA_1910_ARQUIVOS.every((f) => { const b = base(f); return b !== null && lf(semCloseRealLegenda1910(disco(f), f)) === b }) &&
  CLOSE_REAL_LEGENDA_1910_NOVOS.length === 3 && CLOSE_REAL_LEGENDA_1910_NOVOS.every((f) => existsSync(join(ROOT, f)) && base(f) === null) && MARCA_CLOSE_REAL_LEGENDA_1910 === MARCA)
await check('D2 toda linha nova traz a marca (troca listada inteira, a da base existe lá); a marca não contém as das camadas de antes; contagem errada de acréscimos = erro', () => {
  const ts = Object.entries(TROCAS_CLOSE_REAL_LEGENDA_1910)
  return ts.length === 3 && ts.every(([f, l]) => l.every(([nova, antiga]) => nova.includes(MARCA) && !antiga.includes(MARCA) && disco(f).split('\n').includes(nova) && base(f).split('\n').includes(antiga))) &&
    ['KINEO-CLOSE-REAL-1910', 'KINEO-CLOSE-REAL-AJUSTE-1910', 'KINEO-CLOSE-REAL-V3-1910', 'KINEO-FILMES-F1-VIRGULA-1910'].every((m) => !MARCA.includes(m)) &&
    CLOSE_REAL_LEGENDA_1910_ARQUIVOS.every((f) => { const b = new Set(base(f).split('\n')); return disco(f).split('\n').filter((l) => !b.has(l)).every((l) => l.includes(MARCA)) }) &&
    (() => { try { semCloseRealLegenda1910(`${SRC}\nx // ${MARCA}`, FCR); return false } catch { return true } })() && semCloseRealLegenda1910(`a // ${MARCA}`, 'lib/x.ts') === `a // ${MARCA}` && ACRESCIMOS_CLOSE_REAL_LEGENDA_1910[FCR] > 0
})
await check('D3 encadeamento: semCloseRealV3_1910 (e por ela o ajuste e o Close real) tiram esta camada PRIMEIRO; o guardião da rodada 3 lê e executa sem ela; o guardião do export limpo pula os commits dela', () => {
  const v3 = disco('scripts/test-close-real-v3-1910.mjs'), f1 = disco('scripts/test-filmes-f1-virgula-1910.mjs')
  return semCloseRealV3_1910(SRC, FCR) === semCloseRealV3_1910(semCloseRealLegenda1910(SRC, FCR), FCR) && semCloseRealAjuste1910(SRC, FCR) === semCloseRealAjuste1910(semCloseRealLegenda1910(SRC, FCR), FCR) && semCloseReal1910(SRC, FCR) === semCloseReal1910(semCloseRealLegenda1910(SRC, FCR), FCR) &&
    v3.includes("lf(semFilmesF1Virgula1910(semCloseRealLegenda1910(readFileSync(join(ROOT, p), 'utf8'), p), p))") && v3.includes(': semCloseRealLegenda1910(text, rel)) })') &&
    f1.includes("'--grep=KINEO-CLOSE-REAL-LEGENDA-1910'") && f1.includes('const vivo = semCloseRealLegenda1910(rd(p), p)')
})

console.log('\nM. mutantes (aplicados e vermelhos)')
const mut = async (nome, fn) => { let red = false; try { red = !(await fn()) } catch (e) { if (/mutante não aplicou|mutante sem efeito/.test(e.message)) { console.log('       (' + e.message + ')'); red = false } else red = true } ok(red, nome) }
await mut('M1 a fala volta aos 4,5% → S vermelho', () => provaTamanho(trocar(SRC, 'export const ADS_V2_CLOSE_REAL_SPEECH_FONT = 0.036', 'export const ADS_V2_CLOSE_REAL_SPEECH_FONT = 0.045')))
await mut('M2 5 palavras por linha na fala → S vermelho', () => provaTamanho(trocar(SRC, 'export const ADS_V2_CLOSE_REAL_SPEECH_LINE_WORDS = 4', 'export const ADS_V2_CLOSE_REAL_SPEECH_LINE_WORDS = 5')))
await mut('M3 a caixa escura volta na fala → E vermelho', () => provaEstilo(trocar(SRC, 'stroke_width: ADS_V2_CLOSE_REAL_SPEECH_STROKE_WIDTH }); continue }', "stroke_width: ADS_V2_CLOSE_REAL_SPEECH_STROKE_WIDTH, background_color: 'rgba(0,0,0,0.6)', background_x_padding: '3%', background_y_padding: '2%', border_radius: 14 }); continue }")))
await mut('M4 o título do gancho encolhe para o tamanho da fala → S vermelho', () => provaTamanho(trocar(SRC, '    const speech = !(captions.indexOf(c) === 0', '    const speech = true || !(captions.indexOf(c) === 0')))
await mut('M5 o encurtamento volta à régua de antes (2 linhas de 5 palavras a ≥ 4%) → C vermelho', () => provaEncurta(trocar(SRC, 'const f = adsV2CloseRealSpeechFit(captionText(ws.slice(0, k)), frameW, frameH)', 'const f = adsV2CloseRealCaptionFit(captionText(ws.slice(0, k)), frameW, frameH)')))
await mut('M6 o contorno inventado (6 px, fora do que os filmes usam) → E vermelho', () => provaEstilo(trocar(SRC, 'export const ADS_V2_CLOSE_REAL_SPEECH_STROKE_WIDTH = 3', 'export const ADS_V2_CLOSE_REAL_SPEECH_STROKE_WIDTH = 6')))
await mut('M7 a fala sai sem contorno (fica só o branco) → E vermelho', () => provaEstilo(trocar(SRC, 'stroke_color: ADS_V2_CLOSE_REAL_SPEECH_STROKE_COLOR, stroke_width: ADS_V2_CLOSE_REAL_SPEECH_STROKE_WIDTH }); continue }', '}); continue }')))
await mut('M8 o lugar ignora o produto na fala (sempre no topo) → P vermelho', () => provaLugar(trocar(SRC, '  if (span && hits(b)) {', '  if (false) {')))

console.log(`\n${pass} ok, ${fail} falhas`)
process.exit(fail === 0 ? 0 : 1)
