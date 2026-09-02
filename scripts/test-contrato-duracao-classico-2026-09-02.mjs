// KINEO-CONTRATO-DURACAO-2026-09-02 — caminho classico (Seedance 1.5, Kineo 1, Veo, Kling 2.5)
import { readFileSync } from 'node:fs'
const src = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8')
let ok = 0, fail = 0
const check = (n, c) => { c ? (ok++, console.log('  ok  ' + n)) : (fail++, console.log('  FAIL ' + n)) }
const openai = src('lib/openai.ts'), analyze = src('app/api/analyze-idea/route.ts'), gen = src('app/(dashboard)/generate/GenerateClient.tsx'), compose = src('lib/compose.ts')
check('durationPlanFor conhece 35 (tipo 35|60|90)', openai.includes('duration: 35 | 60 | 90'))
check('35s → 100-115 palavras (3,1 pal/s × 35 ≈ 108)', openai.includes("{ duration: 35, wordCountRange: [100, 115], sceneCount: 4 }"))
check('45 (fantasma) cai em 35, nao em 45', !openai.includes('duration: 45,') && openai.includes('return { duration: 35'))
check('analyze-idea aceita 35/60/90 e defaulta 35', analyze.includes('[35, 60, 90].includes(requestedDuration) ? requestedDuration : 35'))
check('regua do compose continua 3,1 (mesma do plano)', compose.includes('const TTS_WORDS_PER_SECOND = 3.1'))
check('roteiro longo verbatim: sobe o alvo para o botao que a fala enche', gen.includes("trackEvent('script_duration_autofit'") && gen.includes('falaSeg <= d * 1.15'))
check('analise usa o alvo ajustado', gen.includes('duration: alvoAnalise, language, scriptMode'))
check('fala que nao cabe em 90 fica registrada', gen.includes("trackEvent('script_duration_overflow'"))
// aritmetica
const wps = 3.1
check('60s: 175-195 palavras ≈ 56-63s de fala', 175/wps >= 55 && 195/wps <= 64)
check('35s: 100-115 ≈ 32-37s', 100/wps >= 31 && 115/wps <= 38)
// autofit: 80s de fala com 60 no botao → 90 (80 ≤ 103.5); 45s de fala com 35 → 60? 45 > 35*1.2=42 → 60 (45 ≤ 69) sim
const opts=[35,60,90]; const fit=(fala,dur)=>opts.filter(d=>d>dur && fala<=d*1.15).sort((a,b)=>a-b)[0]
check('80s de fala + botao 60 → 90', fit(80,60)===90)
check('45s de fala + botao 35 → 60', fit(45,35)===60)
check('120s de fala + botao 60 → sem botao (overflow)', fit(120,60)===undefined)
console.log(`\n${ok} ok, ${fail} fail`); process.exit(fail?1:0)
