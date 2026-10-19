// KINEO-CLOSE-REAL-LEGENDA-PILULA-1910 — guardião da PÍLULA DE VOLTA na legenda da fala do "Close do produto real" (canário do cc5c984cc em produção, 19/10:
// nota 7,5 contra 8,5 da rodada 3 — o contorno de 3 px sem pílula sumia sobre vidro com líquido dourado, seda clara e fundo bege; folhas em
// C:\kineo-wt\prints-1610\cr4-1910). Roda com `node scripts/test-close-real-legenda-pilula-1910.mjs` na raiz do repo, sem rede, sem banco, sem fornecedor:
// a MONTAGEM é executada de verdade (scripts/test-support/offline-ts-loader.mjs), lado a lado com a régua de antes (esta camada desfeita em memória).
//
// O que prova:
//   T  TAMANHO mantido: a fala em 3,6% da altura; as linhas vão ao Creatomate com "\n" (≤ 2 linhas de ≤ 4 palavras NA TELA); o título do gancho igual a antes;
//   B  PÍLULA de volta: background_color/background_x_padding/background_y_padding/border_radius da rodada 3 (as mesmas do título), alpha 0,72; o contorno fica;
//   F  PALAVRA FRACA não fecha linha ("…única de | fragrância" → "…única | de fragrância"; "…apaixonar por | Perfume" → "…apaixonar | por Perfume LUME");
//   L  LUGAR: a legenda continua fora do produto;
//   R  O RESTO intocado: fora as legendas da fala, a montagem é a mesma de antes; as palavras de cada legenda são as mesmas;
//   D  desfaz exato + novos + marca + encadeamento (os guardiões do Close real tiram esta camada PRIMEIRO);
//   M  mutantes (todos APLICADOS e VERMELHOS): sem pílula, fonte 4,5%, palavra fraca no fim da linha, sem "\n", pílula fora da régua da rodada 3.
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import zlib from 'node:zlib'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
import { semCloseRealLegendaPilula1910, CLOSE_REAL_LEGENDA_PILULA_1910_ARQUIVOS, CLOSE_REAL_LEGENDA_PILULA_1910_NOVOS, CLOSE_REAL_LEGENDA_PILULA_1910_BASE, MARCA_CLOSE_REAL_LEGENDA_PILULA_1910, TROCAS_CLOSE_REAL_LEGENDA_PILULA_1910, ACRESCIMOS_CLOSE_REAL_LEGENDA_PILULA_1910 } from './test-support/desfaz-close-real-legenda-pilula-1910.mjs'
import { semCloseRealLegendaCorte1910 } from './test-support/desfaz-close-real-legenda-corte-1910.mjs' // KINEO-CLOSE-REAL-LEGENDA-CORTE-1910 — reancorado: o corte novo (a camada mais nova) sai PRIMEIRO
import { semCloseRealLegenda1910 } from './test-support/desfaz-close-real-legenda-1910.mjs'
import { semCloseRealV3_1910 } from './test-support/desfaz-close-real-v3-1910.mjs'
import { semCloseRealAjuste1910 } from './test-support/desfaz-close-real-ajuste-1910.mjs'
import { semCloseReal1910 } from './test-support/desfaz-close-real-1910.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(ROOT)
const MARCA = 'KINEO-CLOSE-REAL-LEGENDA-PILULA-1910'
const lf = (s) => String(s).split('\r\n').join('\n')
import { semMeta95Assunto1910 } from './test-support/desfaz-meta95-assunto-1910.mjs' // KINEO-META95-ASSUNTO-1910 — reancorado: o assunto traduzido (19/10, a camada mais nova nos guardiões reancorados) sai PRIMEIRO, em memória
const disco = (p) => lf(semCloseRealLegendaCorte1910(semMeta95Assunto1910(readFileSync(join(ROOT, p), 'utf8'), p), p)) /* reancorado KINEO-META95-ASSUNTO-1910: a camada do assunto traduzido sai antes */ // KINEO-CLOSE-REAL-LEGENDA-CORTE-1910 — reancorado: lê os arquivos SEM o corte novo (provado em scripts/test-close-real-legenda-corte-1910.mjs)
const git = (...a) => execFileSync('git', ['-C', ROOT, ...a], { encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] })
const base = (p) => { try { return lf(git('show', `${CLOSE_REAL_LEGENDA_PILULA_1910_BASE}:${p}`)) } catch { return null } }
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b) // os objetos nascem no contexto do carregador: compara o JSON (o que vai ao Creatomate)
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }
const check = async (m, fn) => { let v = false; try { v = !!(await fn()) } catch (e) { console.log('       (lançou: ' + (e && e.message) + ')'); v = false } ok(v, m) }
const trocar = (src, a, b) => { const n = src.split(a).length - 1; if (n !== 1) throw new Error('mutante não aplicou (' + n + 'x): ' + a.slice(0, 70)); const out = src.split(a).join(b); if (out === src) throw new Error('mutante sem efeito'); return out }

const FCR = 'lib/ads/v2CloseReal.ts'
const SRC = disco(FCR)
const CR = (over = null, velho = false) => createOfflineLoader({ mocks: { 'node:zlib': zlib }, source: (rel, text) => (rel === FCR && over !== null ? over : velho ? semCloseRealLegendaPilula1910(text, rel) : semCloseRealLegendaCorte1910(text, rel)) })(FCR) // KINEO-CLOSE-REAL-LEGENDA-CORTE-1910 — reancorado: executa a pílula na régua dela (antes do corte novo)
const H = (n) => `https://cdn.test/${n}`
const FOTOS = [H('frasco-pequeno.jpg'), H('frasco-bege.jpg'), H('cetim.jpg')]
const NARR = {
  en: 'Explore the enchanting scents from Perfume LUME. Each fragrance tells a unique story, inviting you to experience something truly special. Find your new favorite scent today and indulge yourself!',
  pt: 'Conheça Perfume LUME. Um aroma envolvente que te transporta a momentos especiais. Experimente a sensação única de Perfume LUME e sinta a fragrância que encanta a todos. Você merece.',
  cr4: 'Conheça Perfume LUME. Uma experiência única de fragrância. Sinta a essência que envolve. Venha se apaixonar por Perfume LUME.', // as frases do canário do cc5c984cc
}
const VOZ = { en: 12.13, pt: 12.6, cr4: 9.8 }
const BUILD = (lang, w = 1080, h = 1920, extra = {}) => ({ width: w, height: h, heroUrl: H('hero.png'), heroFallbackUrl: FOTOS[0], photos: FOTOS, phrases: [lang === 'en' ? 'Perfume LUME - Unique Fragrances' : 'Perfume LUME - Fragrâncias Únicas', 'x'], fontFamily: 'Montserrat', cardUrl: H('card.png'), cardSeconds: 2.5, musicUrl: H('m.mp3'), musicTrimStart: 0, voiceUrl: H('v.mp3'), voiceSeconds: VOZ[lang], watermark: null, narration: NARR[lang], closeCard: { url: H('cc.png'), name: 'Perfume LUME', cta: lang === 'en' ? 'Shop now' : 'Compre agora', ink: '#2a1d10' }, ...extra })
const legendas = (cr, src) => src.elements.filter((e) => e.type === 'text' && e.track === cr.ADS_V2_CLOSE_REAL_TRACKS.text).sort((a, b) => a.time - b.time)
const QUADROS = [[1080, 1920], [720, 1280]]
const CASOS = ['en', 'pt', 'cr4']
// lista independente (as palavras que deixariam a linha pendurada)
const FRACAS = new Set(['a', 'an', 'the', 'of', 'to', 'in', 'on', 'at', 'for', 'from', 'with', 'by', 'and', 'or', 'but', 'your', 'de', 'do', 'da', 'dos', 'das', 'e', 'o', 'os', 'as', 'que', 'para', 'por', 'com', 'um', 'uma', 'em', 'no', 'na', 'te', 'se', 'seu', 'sua'])
const norm = (w) => String(w).toLocaleLowerCase().replace(/[^\p{L}\p{N}'’-]/gu, '')
const linhasDe = (e) => String(e.text).split('\n')

// ── T: o tamanho ────────────────────────────────────────────────────────────────────────────────────────────────────
const provaTamanho = (over = null) => {
  const cr = CR(over), velho = CR(null, true)
  return QUADROS.every(([W, HH]) => CASOS.every((lang) => {
    const els = legendas(cr, cr.buildAdV2CloseRealSource(BUILD(lang, W, HH)))
    const antes = legendas(velho, velho.buildAdV2CloseRealSource(BUILD(lang, W, HH)))
    const per = Math.max(4, Math.floor((W * 0.9 * 0.94) / (Math.round(0.036 * HH) * 0.58)))
    return els.length >= 3 && igual(els[0], antes[0]) && els[0].font_size === Math.round(0.045 * HH) &&
      els.slice(1).every((e) => e.font_size === Math.round(0.036 * HH) && linhasDe(e).length <= 2 && linhasDe(e).every((l) => l.trim() === l && l.length > 0 && l.split(' ').length <= 4 && l.length <= per))
  }))
}

// ── B: a pílula ─────────────────────────────────────────────────────────────────────────────────────────────────────
const provaPilula = (over = null) => {
  const cr = CR(over)
  return QUADROS.every(([W, HH]) => CASOS.every((lang) => {
    const src = cr.buildAdV2CloseRealSource(BUILD(lang, W, HH))
    const els = legendas(cr, src)
    const t = els[0] // o título do gancho = a pílula da rodada 3 (background_color rgba(0,0,0,0.6), folgas 3%/2%, border_radius 14)
    return t.background_color === 'rgba(0,0,0,0.6)' && !JSON.stringify(src).includes('shadow') && els.slice(1).every((e) =>
      e.background_color === 'rgba(0,0,0,0.72)' && e.background_color.replace('0.72', '0.6') === t.background_color && e.background_x_padding === t.background_x_padding && e.background_y_padding === t.background_y_padding && e.border_radius === t.border_radius &&
      e.background_x_padding === '3%' && e.background_y_padding === '2%' && e.border_radius === 14 && !('background_border_radius' in e) &&
      e.stroke_color === 'rgba(0,0,0,0.98)' && e.stroke_width === 3 && e.fill_color === '#ffffff' && e.font_weight === '800')
  }))
}

// ── F: palavra fraca não fecha linha ────────────────────────────────────────────────────────────────────────────────
const provaFraca = (over = null) => {
  const cr = CR(over)
  const q = (s) => cr.adsV2CloseRealSpeechLines(s, 69, 1080).join('|')
  const unit = q('Uma experiência única de fragrância') === 'Uma experiência única|de fragrância' && q('Venha se apaixonar por Perfume LUME') === 'Venha se apaixonar|por Perfume LUME' &&
    q('Each fragrance tells a unique story') === 'Each fragrance tells|a unique story' && q('Sinta a essência que envolve') === 'Sinta a essência|que envolve' &&
    q('Get it now for you') === 'Get it now|for you' && q('de') === 'de' && q('Perfume LUME\nde') === 'Perfume LUME|de'
  const mont = QUADROS.every(([W, HH]) => CASOS.every((lang) => legendas(cr, cr.buildAdV2CloseRealSource(BUILD(lang, W, HH))).slice(1).every((e) => linhasDe(e).slice(0, -1).every((l) => !FRACAS.has(norm(l.split(' ').pop()))))))
  return unit && mont
}

// ── L: fora do produto ──────────────────────────────────────────────────────────────────────────────────────────────
const CAIXAS = { [FOTOS[1]]: { w: 1080, h: 1920, x0: 0.3, x1: 0.7, y0: 0.1, y1: 0.45 }, [FOTOS[2]]: { w: 1080, h: 1920, x0: 0.32, x1: 0.68, y0: 0.32, y1: 0.8 }, [FOTOS[0]]: { w: 1080, h: 1350, x0: 0.3, x1: 0.7, y0: 0.08, y1: 0.4 } }
const provaLugar = (over = null) => {
  const cr = CR(over)
  return ['pt', 'en', 'cr4'].every((lang) => {
    const b = BUILD(lang, 1080, 1920, { photoBoxes: CAIXAS })
    const t = cr.adsV2CloseRealTimeline({ voiceSeconds: b.voiceSeconds })
    const win = cr.adsV2CloseRealPlanWindows({ timeline: t, shotPhotos: cr.adsV2CloseRealShotPhotos(FOTOS), photoBoxes: CAIXAS, hookCutout: true, frameW: 1080, frameH: 1920 })
    return legendas(cr, cr.buildAdV2CloseRealSource(b)).slice(1).every((e) => {
      const yb = parseFloat(e.y) / 100, top = yb - (linhasDe(e).length * e.font_size * 1.1) / 1920 - 0.012, bottom = yb + 0.012
      return top >= 0.14 - 1e-6 && bottom <= 0.8 + 1e-3 && win.every((w) => !(e.time < w.end - 1e-6 && e.time + e.duration > w.start + 1e-6) || !w.span || !(w.span.x1 > 0.1 && w.span.x0 < 0.9 && bottom > w.span.y0 && top < w.span.y1))
    })
  })
}

// ── R: o resto intocado ─────────────────────────────────────────────────────────────────────────────────────────────
const provaResto = () => {
  const cr = CR(), velho = CR(null, true)
  const fora = (c, src) => src.elements.filter((e) => !(e.type === 'text' && e.track === c.ADS_V2_CLOSE_REAL_TRACKS.text))
  return QUADROS.every(([W, HH]) => ['en', 'pt'].every((lang) => {
    const a = cr.buildAdV2CloseRealSource(BUILD(lang, W, HH)), b = velho.buildAdV2CloseRealSource(BUILD(lang, W, HH))
    const la = legendas(cr, a), lb = legendas(velho, b)
    // as mesmas palavras, nos mesmos tempos e lugares (no canário nenhuma frase muda de tamanho); só o texto ganha "\n" e a fala ganha a pílula
    const mesmas = la.length === lb.length && la.every((e, k) => e.text.split('\n').join(' ') === lb[k].text.split('\n').join(' ') && e.time === lb[k].time && e.duration === lb[k].duration && e.y === lb[k].y && e.font_size === lb[k].font_size)
    return igual(fora(cr, a), fora(velho, b)) && mesmas
  }))
}

console.log('\nT. o tamanho')
await check('T1 EXECUTADO (canário EN/PT + as frases do canário do cc5c984cc; 1080×1920 e 720×1280): a fala segue em 3,6% da altura e vai ao Creatomate com "\\n" — ≤ 2 linhas de ≤ 4 palavras na tela; o título do gancho é o MESMO elemento de antes (4,5%)', () => provaTamanho())
console.log('\nB. a pílula')
await check('B1 EXECUTADO: a fala volta à pílula da rodada 3 (as MESMAS folgas 3%/2% e border_radius 14 do título; background_color preto com alpha 0,72) e mantém o contorno dos filmes (rgba(0,0,0,0.98), 3); nenhum shadow_*', () => provaPilula())
console.log('\nF. palavra fraca')
await check('F1 palavra fraca não fecha linha: "Uma experiência única | de fragrância", "Venha se apaixonar | por Perfume LUME", "Each fragrance tells | a unique story"; na montagem nenhuma linha que não seja a última termina em "de/a/por/the…"', () => provaFraca())
console.log('\nL. o lugar')
await check('L1 EXECUTADO com as caixas do recorte: a pílula fica entre 14% e 80% e não cruza o produto de nenhum plano em que está na tela', () => provaLugar())
console.log('\nR. o resto')
await check('R1 EXECUTADO lado a lado com a régua de antes: fora as legendas a montagem é IDÊNTICA; cada legenda tem as mesmas palavras, tempo, lugar e fonte', () => provaResto())

console.log('\nD. desfaz exato, novos, marca, encadeamento')
await check(`D1 cada arquivo tocado, desfeito (scripts/test-support/desfaz-close-real-legenda-pilula-1910.mjs), é EXATAMENTE a base ${CLOSE_REAL_LEGENDA_PILULA_1910_BASE.slice(0, 9)}; os novos existem e não existiam lá`, () =>
  CLOSE_REAL_LEGENDA_PILULA_1910_ARQUIVOS.length === 3 && CLOSE_REAL_LEGENDA_PILULA_1910_ARQUIVOS.every((f) => { const b = base(f); return b !== null && lf(semCloseRealLegendaPilula1910(disco(f), f)) === b }) &&
  CLOSE_REAL_LEGENDA_PILULA_1910_NOVOS.length === 3 && CLOSE_REAL_LEGENDA_PILULA_1910_NOVOS.every((f) => existsSync(join(ROOT, f)) && base(f) === null) && MARCA_CLOSE_REAL_LEGENDA_PILULA_1910 === MARCA)
await check('D2 toda linha nova traz a marca (troca listada inteira, a da base existe lá); a marca não contém as das camadas de antes; contagem errada = erro', () => {
  const ts = Object.entries(TROCAS_CLOSE_REAL_LEGENDA_PILULA_1910)
  return ts.length === 2 && ts.every(([f, l]) => l.every(([nova, antiga]) => nova.includes(MARCA) && !antiga.includes(MARCA) && disco(f).split('\n').includes(nova) && base(f).split('\n').includes(antiga))) &&
    ['KINEO-CLOSE-REAL-1910', 'KINEO-CLOSE-REAL-AJUSTE-1910', 'KINEO-CLOSE-REAL-V3-1910', 'KINEO-CLOSE-REAL-LEGENDA-1910', 'KINEO-FILMES-F1-VIRGULA-1910'].every((m) => !MARCA.includes(m)) &&
    CLOSE_REAL_LEGENDA_PILULA_1910_ARQUIVOS.every((f) => { const b = new Set(base(f).split('\n')); return disco(f).split('\n').filter((l) => !b.has(l)).every((l) => l.includes(MARCA)) }) &&
    (() => { try { semCloseRealLegendaPilula1910(`${SRC}\nx // ${MARCA}`, FCR); return false } catch { return true } })() && semCloseRealLegendaPilula1910(`a // ${MARCA}`, 'lib/x.ts') === `a // ${MARCA}` && ACRESCIMOS_CLOSE_REAL_LEGENDA_PILULA_1910[FCR] > 0
})
await check('D3 encadeamento: semCloseRealLegenda1910 (e por ela a rodada 3, o ajuste e o Close real) tira esta camada PRIMEIRO; o guardião da legenda menor lê e executa sem ela', () => {
  const lg = disco('scripts/test-close-real-legenda-1910.mjs')
  const sem = semCloseRealLegendaPilula1910(SRC, FCR)
  return [semCloseRealLegenda1910, semCloseRealV3_1910, semCloseRealAjuste1910, semCloseReal1910].every((f) => f(SRC, FCR) === f(sem, FCR)) &&
    lg.includes("const disco = (p) => lf(semCloseRealLegendaPilula1910(readFileSync(join(ROOT, p), 'utf8'), p))") && lg.includes(': semCloseRealLegendaPilula1910(text, rel)) })(FCR)')
})

console.log('\nM. mutantes (aplicados e vermelhos)')
const mut = async (nome, fn) => { let red = false; try { red = !(await fn()) } catch (e) { if (/mutante não aplicou|mutante sem efeito/.test(e.message)) { console.log('       (' + e.message + ')'); red = false } else red = true } ok(red, nome) }
await mut('M1 a fala sai SEM pílula (o cc5c984cc reprovado) → B vermelho', () => provaPilula(trocar(SRC, ', background_color: ADS_V2_CLOSE_REAL_SPEECH_BG, background_x_padding: ADS_V2_CLOSE_REAL_SPEECH_PAD_X, background_y_padding: ADS_V2_CLOSE_REAL_SPEECH_PAD_Y, border_radius: ADS_V2_CLOSE_REAL_SPEECH_RADIUS }); continue }', ' }); continue }')))
await mut('M2 a fala volta aos 4,5% → T vermelho', () => provaTamanho(trocar(SRC, 'export const ADS_V2_CLOSE_REAL_SPEECH_FONT = 0.036', 'export const ADS_V2_CLOSE_REAL_SPEECH_FONT = 0.045')))
await mut('M3 palavra fraca volta a fechar linha ("…única de") → F vermelho', () => provaFraca(trocar(SRC, '      while (last && k > 1 && CLOSE_REAL_WEAK_END.has(closeRealNormWord(last[k - 1]))) k--', '      while (false) k--')))
await mut('M4 o texto vai sem "\\n" (o motor quebra pela largura da caixa) → T vermelho', () => provaTamanho(trocar(SRC, "text: adsV2CloseRealSpeechLines(c.text, geo.font_size, width).join('\\n'),", 'text: c.text,')))
await mut('M5 a pílula fora da régua da rodada 3 (folga 4%) → B vermelho', () => provaPilula(trocar(SRC, "export const ADS_V2_CLOSE_REAL_SPEECH_PAD_X = '3%'", "export const ADS_V2_CLOSE_REAL_SPEECH_PAD_X = '4%'")))
await mut('M6 o contorno sai junto com a volta da pílula → B vermelho', () => provaPilula(trocar(SRC, 'stroke_color: ADS_V2_CLOSE_REAL_SPEECH_STROKE_COLOR, stroke_width: ADS_V2_CLOSE_REAL_SPEECH_STROKE_WIDTH, background_color:', 'background_color:')))
await mut('M7 5 palavras por linha ("Get it now for you" numa linha só) → F vermelho', () => provaFraca(trocar(SRC, 'export const ADS_V2_CLOSE_REAL_SPEECH_LINE_WORDS = 4', 'export const ADS_V2_CLOSE_REAL_SPEECH_LINE_WORDS = 5')))

console.log(`\n${pass} ok, ${fail} falhas`)
process.exit(fail === 0 ? 0 : 1)
