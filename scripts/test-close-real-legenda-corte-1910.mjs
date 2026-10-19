// KINEO-CLOSE-REAL-LEGENDA-CORTE-1910 — guardião do CORTE NOVO da legenda da fala do "Close do produto real" (canário do f8d1bf990 em produção, 19/10, nota 8:
// "Um perfume único / que traz" ficou 4,7 s na tela — a fala era "Um perfume único que traz uma fragrância envolvente e marcante" e o teto 2 × 4 cortou depois do
// verbo; folhas em C:\kineo-wt\prints-1610\cr5-1910). Roda com `node scripts/test-close-real-legenda-corte-1910.mjs` na raiz do repo, sem rede, sem banco,
// sem fornecedor: a MONTAGEM é executada de verdade (scripts/test-support/offline-ts-loader.mjs), lado a lado com a régua de antes (esta camada desfeita em memória).
//
// O que prova:
//   R  CASO REAL: a frase do canário vai INTEIRA em 3 linhas de ≤ 4 palavras ("Um perfume único que / traz uma fragrância / envolvente e marcante"), também com as caixas do produto;
//   C  REGRA 2: sem caber, o corte é SÓ antes de conjunção/relativo ou depois de vírgula — nunca depois de verbo ("…que traz") nem de palavra fraca; sem corte válido, inteira;
//   P  POSIÇÃO: a legenda de 3 linhas que não acha lugar fora do produto cai para a regra 2 com 2 linhas;
//   Q  QUEBRA: nenhuma linha (fora a última) termina em palavra fraca; prefere menos linhas e não acabar linha em "que";
//   O  O RESTO intocado: fora as legendas da fala, a montagem é a mesma de antes; o título do gancho igual; fala em 3,6% (= a fonte mínima);
//   D  desfaz exato + novos + marca + encadeamento;  M  mutantes (todos APLICADOS e VERMELHOS).
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import zlib from 'node:zlib'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
import { semCloseRealLegendaCorte1910, CLOSE_REAL_LEGENDA_CORTE_1910_ARQUIVOS, CLOSE_REAL_LEGENDA_CORTE_1910_NOVOS, CLOSE_REAL_LEGENDA_CORTE_1910_BASE, MARCA_CLOSE_REAL_LEGENDA_CORTE_1910, TROCAS_CLOSE_REAL_LEGENDA_CORTE_1910, ACRESCIMOS_CLOSE_REAL_LEGENDA_CORTE_1910 } from './test-support/desfaz-close-real-legenda-corte-1910.mjs'
import { semCloseRealLegendaPilula1910 } from './test-support/desfaz-close-real-legenda-pilula-1910.mjs'
import { semCloseRealLegenda1910 } from './test-support/desfaz-close-real-legenda-1910.mjs'
import { semCloseRealV3_1910 } from './test-support/desfaz-close-real-v3-1910.mjs'
import { semCloseRealAjuste1910 } from './test-support/desfaz-close-real-ajuste-1910.mjs'
import { semCloseReal1910 } from './test-support/desfaz-close-real-1910.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(ROOT)
const MARCA = 'KINEO-CLOSE-REAL-LEGENDA-CORTE-1910'
const lf = (s) => String(s).split('\r\n').join('\n')
const disco = (p) => lf(readFileSync(join(ROOT, p), 'utf8'))
const git = (...a) => execFileSync('git', ['-C', ROOT, ...a], { encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] })
const base = (p) => { try { return lf(git('show', `${CLOSE_REAL_LEGENDA_CORTE_1910_BASE}:${p}`)) } catch { return null } }
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b)
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }
const check = async (m, fn) => { let v = false; try { v = !!(await fn()) } catch (e) { console.log('       (lançou: ' + (e && e.message) + ')'); v = false } ok(v, m) }
const trocar = (src, a, b) => { const n = src.split(a).length - 1; if (n !== 1) throw new Error('mutante não aplicou (' + n + 'x): ' + a.slice(0, 70)); const out = src.split(a).join(b); if (out === src) throw new Error('mutante sem efeito'); return out }

const FCR = 'lib/ads/v2CloseReal.ts'
const SRC = disco(FCR)
const CR = (over = null, velho = false) => createOfflineLoader({ mocks: { 'node:zlib': zlib }, source: (rel, text) => (rel === FCR && over !== null ? over : velho ? semCloseRealLegendaCorte1910(text, rel) : text) })(FCR)
const H = (n) => `https://cdn.test/${n}`
const FOTOS = [H('frasco-pequeno.jpg'), H('frasco-bege.jpg'), H('cetim.jpg')]
const FRASE = 'Um perfume único que traz uma fragrância envolvente e marcante'
const NARR_CR5 = `Perfume LUME. ${FRASE}. Deixe-se levar pelo seu aroma. Descubra sua essência agora mesmo. Você merece.` // as legendas do canário do f8d1bf990
const BUILD = (extra = {}) => ({ width: 1080, height: 1920, heroUrl: H('hero.png'), heroFallbackUrl: FOTOS[0], photos: FOTOS, phrases: ['Perfume LUME - Fragrâncias Únicas', 'x'], fontFamily: 'Montserrat', cardUrl: H('card.png'), cardSeconds: 2.5, musicUrl: H('m.mp3'), musicTrimStart: 0, voiceUrl: H('v.mp3'), voiceSeconds: 12.5, watermark: null, narration: NARR_CR5, closeCard: { url: H('cc.png'), name: 'Perfume LUME', cta: 'Compre agora', ink: '#2a1d10' }, ...extra })
const legendas = (cr, src) => src.elements.filter((e) => e.type === 'text' && e.track === cr.ADS_V2_CLOSE_REAL_TRACKS.text).sort((a, b) => a.time - b.time)
const CAIXAS = { [FOTOS[1]]: { w: 1080, h: 1920, x0: 0.3, x1: 0.7, y0: 0.1, y1: 0.45 }, [FOTOS[2]]: { w: 1080, h: 1920, x0: 0.32, x1: 0.68, y0: 0.32, y1: 0.8 }, [FOTOS[0]]: { w: 1080, h: 1350, x0: 0.3, x1: 0.7, y0: 0.08, y1: 0.95 } }
const CHEIA = Object.fromEntries(FOTOS.map((f) => [f, { w: 1080, h: 1920, x0: 0.25, x1: 0.75, y0: 0.12, y1: 0.97 }])) // o produto enche o quadro: 3 linhas não acham lugar
const FRACAS = new Set(['a', 'an', 'the', 'of', 'to', 'for', 'with', 'your', 'de', 'do', 'da', 'o', 'os', 'as', 'um', 'uma', 'em', 'no', 'na', 'por', 'pelo', 'pela', 'para', 'com', 'seu', 'sua', 'te', 'se'])
const CONJ = new Set(['que', 'e', 'mas', 'ou', 'porque', 'and', 'but', 'or', 'that', 'which', 'who', 'y', 'pero'])
const norm = (w) => String(w).toLocaleLowerCase().replace(/[^\p{L}\p{N}'’-]/gu, '')

// ── R: o caso real ──────────────────────────────────────────────────────────────────────────────────────────────────
const provaReal = (over = null) => {
  const cr = CR(over)
  return [null, CAIXAS].every((boxes) => {
    const els = legendas(cr, cr.buildAdV2CloseRealSource(BUILD({ photoBoxes: boxes })))
    const da = els.filter((e) => e.text.split('\n').join(' ') === FRASE)
    return da.length >= 1 && da.every((e) => e.text === 'Um perfume único que\ntraz uma fragrância\nenvolvente e marcante' && e.font_size === 69) &&
      !els.some((e) => /que traz$/.test(e.text)) && els.slice(1).every((e) => e.text.split('\n').length <= 3 && e.text.split('\n').every((l) => l.split(' ').length <= 4))
  }) && cr.ADS_V2_CLOSE_REAL_SPEECH_LINES_MAX === 3
}

// ── C: a regra 2 ────────────────────────────────────────────────────────────────────────────────────────────────────
const provaCorte = (over = null) => {
  const cr = CR(over)
  const q = (s, L) => cr.adsV2CloseRealSpeechCut(s.split(' '), 1080, 1920, L).join(' ')
  const LONGA = 'Cada gota revela notas de baunilha, âmbar e sândalo que ficam na pele durante o dia inteiro.'
  const SEM = 'Nossa coleção artesanal combina ingredientes raros importados diretamente das melhores plantações do mundo inteiro.'
  const casos = q(FRASE + '.', 3) === FRASE + '.' && q(FRASE + '.', 2) === 'Um perfume único' &&
    q(LONGA, 3) === 'Cada gota revela notas de baunilha, âmbar e sândalo' && q(LONGA, 2) === 'Cada gota revela notas de baunilha, âmbar' && q(SEM, 3) === SEM && q('Você merece.', 2) === 'Você merece.'
  // propriedade: todo corte para ANTES de conjunção/relativo ou DEPOIS de vírgula, e nunca depois de palavra fraca
  const frases = [FRASE + '.', LONGA, 'Each fragrance tells a unique story, inviting you to experience something truly special.', 'Experimente a sensação única de Perfume LUME e sinta a fragrância que encanta a todos.', 'Find your new favorite scent today and indulge yourself with our exclusive limited collection!']
  const valido = [2, 3].every((L) => frases.every((s) => { const ws = s.split(' '), out = cr.adsV2CloseRealSpeechCut(ws, 1080, 1920, L); const k = out.length; return k === ws.length || ((/,$/.test(ws[k - 1]) || CONJ.has(norm(ws[k]))) && !FRACAS.has(norm(ws[k - 1])) && !CONJ.has(norm(ws[k - 1]))) }))
  return casos && valido && cr.ADS_V2_CLOSE_REAL_SPEECH_FONT === cr.ADS_V2_CLOSE_REAL_CAPTION_FONT_MIN
}

// ── P: a posição ────────────────────────────────────────────────────────────────────────────────────────────────────
const provaPosicao = (over = null) => {
  const cr = CR(over)
  const els = legendas(cr, cr.buildAdV2CloseRealSource(BUILD({ photoBoxes: CHEIA })))
  const textos = els.map((e) => e.text.split('\n').join(' '))
  return textos.includes('Um perfume único') && !textos.includes(FRASE) && els.slice(1).every((e) => e.text.split('\n').length <= 2)
}

// ── Q: a quebra ─────────────────────────────────────────────────────────────────────────────────────────────────────
const provaQuebra = (over = null) => {
  const cr = CR(over)
  const q = (s) => cr.adsV2CloseRealSpeechSplit(s, 69, 1080).join('|')
  const casos = q('Uma experiência única de fragrância') === 'Uma experiência|única de fragrância' && q('Sinta a essência que envolve') === 'Sinta a essência|que envolve' &&
    q('Compre já o seu perfume favorito') === 'Compre já|o seu perfume favorito' && q('Venha se apaixonar por Perfume LUME') === 'Venha se apaixonar|por Perfume LUME' && q(FRASE) === 'Um perfume único que|traz uma fragrância|envolvente e marcante' &&
    q('Perfume LUME\nde') === 'Perfume LUME|de' && q('Você merece') === 'Você merece'
  const mont = [null, CAIXAS, CHEIA].every((boxes) => legendas(cr, cr.buildAdV2CloseRealSource(BUILD({ photoBoxes: boxes }))).slice(1).every((e) => e.text.split('\n').slice(0, -1).every((l) => !FRACAS.has(norm(l.split(' ').pop())))))
  return casos && mont
}

// ── O: o resto ──────────────────────────────────────────────────────────────────────────────────────────────────────
const provaResto = () => {
  const cr = CR(), velho = CR(null, true)
  const fora = (c, src) => src.elements.filter((e) => !(e.type === 'text' && e.track === c.ADS_V2_CLOSE_REAL_TRACKS.text))
  return [null, CAIXAS, CHEIA].every((boxes) => {
    const a = cr.buildAdV2CloseRealSource(BUILD({ photoBoxes: boxes })), b = velho.buildAdV2CloseRealSource(BUILD({ photoBoxes: boxes }))
    const la = legendas(cr, a), lb = legendas(velho, b)
    return igual(fora(cr, a), fora(velho, b)) && igual(la[0], lb[0]) && la.slice(1).every((e) => e.font_size === 69 && e.background_color === 'rgba(0,0,0,0.72)' && e.stroke_width === 3)
  })
}

console.log('\nR. o caso real')
await check('R1 EXECUTADO: "Um perfume único que traz uma fragrância envolvente e marcante" vai INTEIRA em 3 linhas de ≤ 4 palavras (sem e com as caixas do produto); "…que traz" não volta', () => provaReal())
console.log('\nC. a regra 2')
await check('C1 sem caber: corta SÓ antes de conjunção/relativo ou depois de vírgula, nunca depois de verbo ("…que traz") nem de palavra fraca; sem corte válido, a frase inteira (na fonte mínima = 3,6%)', () => provaCorte())
console.log('\nP. a posição')
await check('P1 EXECUTADO com o produto enchendo o quadro: a legenda de 3 linhas que não acha lugar cai para a regra 2 com 2 linhas ("Um perfume único")', () => provaPosicao())
console.log('\nQ. a quebra')
await check('Q1 a melhor divisão: sem palavra fraca no fim de linha, menos linhas, sem "que" no fim quando dá; na montagem nenhuma linha (fora a última) termina em palavra fraca', () => provaQuebra())
console.log('\nO. o resto')
await check('O1 EXECUTADO lado a lado com a régua de antes: fora as legendas a montagem é IDÊNTICA; o título do gancho igual; a fala segue 3,6% na pílula 0,72 com contorno 3', () => provaResto())

console.log('\nD. desfaz exato, novos, marca, encadeamento')
await check(`D1 cada arquivo tocado, desfeito (scripts/test-support/desfaz-close-real-legenda-corte-1910.mjs), é EXATAMENTE a base ${CLOSE_REAL_LEGENDA_CORTE_1910_BASE.slice(0, 9)}; os novos existem e não existiam lá`, () =>
  CLOSE_REAL_LEGENDA_CORTE_1910_ARQUIVOS.length === 3 && CLOSE_REAL_LEGENDA_CORTE_1910_ARQUIVOS.every((f) => { const b = base(f); return b !== null && lf(semCloseRealLegendaCorte1910(disco(f), f)) === b }) &&
  CLOSE_REAL_LEGENDA_CORTE_1910_NOVOS.length === 3 && CLOSE_REAL_LEGENDA_CORTE_1910_NOVOS.every((f) => existsSync(join(ROOT, f)) && base(f) === null) && MARCA_CLOSE_REAL_LEGENDA_CORTE_1910 === MARCA)
await check('D2 toda linha nova traz a marca (troca listada inteira, a da base existe lá); a marca não contém as das camadas de antes; contagem errada = erro', () => {
  const ts = Object.entries(TROCAS_CLOSE_REAL_LEGENDA_CORTE_1910)
  return ts.length === 2 && ts.every(([f, l]) => l.every(([nova, antiga]) => nova.includes(MARCA) && !antiga.includes(MARCA) && disco(f).split('\n').includes(nova) && base(f).split('\n').includes(antiga))) &&
    ['KINEO-CLOSE-REAL-1910', 'KINEO-CLOSE-REAL-AJUSTE-1910', 'KINEO-CLOSE-REAL-V3-1910', 'KINEO-CLOSE-REAL-LEGENDA-1910', 'KINEO-CLOSE-REAL-LEGENDA-PILULA-1910'].every((m) => !MARCA.includes(m)) &&
    CLOSE_REAL_LEGENDA_CORTE_1910_ARQUIVOS.every((f) => { const b = new Set(base(f).split('\n')); return disco(f).split('\n').filter((l) => !b.has(l)).every((l) => l.includes(MARCA)) }) &&
    (() => { try { semCloseRealLegendaCorte1910(`${SRC}\nx // ${MARCA}`, FCR); return false } catch { return true } })() && semCloseRealLegendaCorte1910(`a // ${MARCA}`, 'lib/x.ts') === `a // ${MARCA}` && ACRESCIMOS_CLOSE_REAL_LEGENDA_CORTE_1910[FCR] > 0
})
await check('D3 encadeamento: a pílula (e por ela a legenda menor, a rodada 3, o ajuste e o Close real) tira esta camada PRIMEIRO; o guardião da pílula lê e executa sem ela', () => {
  const pg = disco('scripts/test-close-real-legenda-pilula-1910.mjs')
  const sem = semCloseRealLegendaCorte1910(SRC, FCR)
  return [semCloseRealLegendaPilula1910, semCloseRealLegenda1910, semCloseRealV3_1910, semCloseRealAjuste1910, semCloseReal1910].every((f) => f(SRC, FCR) === f(sem, FCR)) &&
    pg.includes("const disco = (p) => lf(semCloseRealLegendaCorte1910(readFileSync(join(ROOT, p), 'utf8'), p))") && pg.includes(': semCloseRealLegendaCorte1910(text, rel)) })(FCR)')
})

console.log('\nM. mutantes (aplicados e vermelhos)')
const mut = async (nome, fn) => { let red = false; try { red = !(await fn()) } catch (e) { if (/mutante não aplicou|mutante sem efeito/.test(e.message)) { console.log('       (' + e.message + ')'); red = false } else red = true } ok(red, nome) }
await mut('M1 o corte pode cair em qualquer palavra (depois do verbo: "Um perfume único que traz") → C vermelho', () => provaCorte(trocar(SRC, "const corte = /[,;:–—]$/u.test(ws[k - 1]) || CLOSE_REAL_CUT_BEFORE.has(closeRealNormWord(ws[k]));", 'const corte = true;')))
await mut('M2 3 linhas proibidas quando a frase inteira cabe (volta o teto 2) → R vermelho', () => provaReal(trocar(SRC, 'export const ADS_V2_CLOSE_REAL_SPEECH_LINES_MAX = 3', 'export const ADS_V2_CLOSE_REAL_SPEECH_LINES_MAX = 2')))
await mut('M3 a legenda de 3 linhas fica mesmo sem lugar fora do produto → P vermelho', () => provaPosicao(trocar(SRC, '    if (cobre) captions[k] =', '    if (false) captions[k] =')))
await mut('M4 a quebra ignora a palavra fraca no fim da linha ("Compre já o seu | perfume") → Q vermelho', () => provaQuebra(trocar(SRC, 'const cmp = (a: Plan, b: Plan): number => a.hard - b.hard ||', 'const cmp = (a: Plan, b: Plan): number => 0 ||')))
await mut('M5 a regra nova desligada (volta o encurtamento da rodada 3, que cortava em "traz") → R vermelho', () => provaReal(trocar(SRC, '  if (ws.length) return adsV2CloseRealSpeechCut(ws, frameW, frameH)', '  if (false) return adsV2CloseRealSpeechCut(ws, frameW, frameH)')))
await mut('M6 sem corte válido a frase é amputada em 2 palavras (em vez de ir inteira) → C vermelho', () => provaCorte(trocar(SRC, '  return ws // KINEO-CLOSE-REAL-LEGENDA-CORTE-1910 — nenhum corte válido: inteira', '  return ws.slice(0, 2) // KINEO-CLOSE-REAL-LEGENDA-CORTE-1910 — nenhum corte válido: inteira')))

console.log(`\n${pass} ok, ${fail} falhas`)
process.exit(fail === 0 ? 0 : 1)
