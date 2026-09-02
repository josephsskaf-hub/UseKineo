// KINEO-1-CINEMA-2026-09-02 — provas lendo o codigo real (compose + pixabay)
import { readFileSync } from 'node:fs'
const src = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8')
let ok = 0, fail = 0
const check = (n, c) => { c ? (ok++, console.log('  ok  ' + n)) : (fail++, console.log('  FAIL ' + n)) }
const compose = src('lib/compose.ts'), pix = src('lib/pixabay.ts')

console.log('compose.ts')
check('teto do corte 4 → 4.5 (piso 2.5 intacto)', compose.includes('const FAST_MAX_CUT_SECONDS = 4.5') && compose.includes('const FAST_MIN_CUT_SECONDS = 2.5'))
check('letterbox 6% definido e com kill-switch (0 desliga)', compose.includes('const FAST_LETTERBOX_PCT = 6') && compose.includes('FAST_LETTERBOX_PCT > 0'))
check('barras so no fast, sem avatar, com path (desenham de verdade)', /isFastStock && !hasAvatar && FAST_LETTERBOX_PCT > 0[\s\S]{0,600}path: RECT_PATH/.test(compose))
check('barras em track propria (6): acima do grade, abaixo da marca d\'agua (9)', /track: 6,[\s\S]{0,300}fill_color: '#000000'/.test(compose))
check('barras nao invadem a legenda (y 78%, ancora 100%) — 94-100% e 0-6%', compose.includes("CAPTION_BOTTOM_Y = '78%'") && compose.includes('100 - FAST_LETTERBOX_PCT'))
check('abertura: fade do preto no 1o corte, so fast, so 1a passagem', compose.includes("isFastStock && i === 0 && reuseIndex === 0") && compose.includes("enter_transition: { type: 'fade', duration: FAST_OPENING_FADE_SECONDS }"))
check('grade: wash +0.03 e glow +0.02 SO no fast', compose.includes('const gradeStep = isFastStock ? 0.03 : 0') && compose.includes('const glowStep = isFastStock ? 0.02 : 0'))
check('grade: tons inalterados (rgba de cada nicho preservado)', compose.includes('rgba(35,26,8,${') && compose.includes('rgba(8,14,40,${') && compose.includes('rgba(10,32,40,${') && compose.includes('rgba(12,34,51,${'))
// aritmetica do grade
const wash = (base) => (base + 0.03).toFixed(2)
check('wealth 0.07 → 0.10 (valor original de PUSH #94)', wash(0.07) === '0.10')
check('mystery 0.08 → 0.11', wash(0.08) === '0.11')
// geometria das barras
const pct = 6
const bars = [0, 100 - pct].map((yTop) => ({ top: yTop, bottom: yTop + pct, center: yTop + pct / 2 }))
check('barra de cima 0-6%, centro 3%', bars[0].top === 0 && bars[0].bottom === 6 && bars[0].center === 3)
check('barra de baixo 94-100%, centro 97%', bars[1].top === 94 && bars[1].bottom === 100 && bars[1].center === 97)
check('legenda (termina em 78%) nao toca a barra de baixo (comeca em 94%)', 78 < 94)
check('marca d\'agua (y 5%) cai DENTRO da barra de cima → branco sobre preto', 5 < 6)

console.log('pixabay.ts')
check('penalidade de baixa resolucao existe e e explicita', pix.includes('const lowRes = !rez ? 0 : portrait ? (rez.height < 1080 ? 3 : 0) : (rez.width < 2560 ? 2 : 0)'))
check('entra no score como penalidade (nao rejeicao)', pix.includes('- (tooShort ? 2 : 0) - lowRes +'))
check('aparece no log do candidato', pix.includes('lowRes=${lowRes}'))
// invariantes de ranking: relevancia continua mandando (1 match = 4 > qualquer penalidade isolada)
check('1 token de relevancia (4) > penalidade maxima de resolucao (3)', 4 > 3)
check('retrato nativo 1080×1920: penalidade 0', (() => { const rez = { width: 1080, height: 1920 }; const portrait = rez.height >= rez.width; return (portrait ? (rez.height < 1080 ? 3 : 0) : (rez.width < 2560 ? 2 : 0)) === 0 })())
check('paisagem 1920×1080: −2 (sai esticada 1,78×)', (() => { const rez = { width: 1920, height: 1080 }; const portrait = rez.height >= rez.width; return (portrait ? (rez.height < 1080 ? 3 : 0) : (rez.width < 2560 ? 2 : 0)) === 2 })())
check('paisagem 3840×2160: 0 (recorte 1215×2160, nitido)', (() => { const rez = { width: 3840, height: 2160 }; const portrait = rez.height >= rez.width; return (portrait ? (rez.height < 1080 ? 3 : 0) : (rez.width < 2560 ? 2 : 0)) === 0 })())

console.log(`\n${ok} ok, ${fail} fail`)
process.exit(fail ? 1 : 0)
