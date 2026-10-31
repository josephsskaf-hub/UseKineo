// KINEO-LEGENDA-PONTO-ALFABETOS + KINEO-CENA-ACAO-LADO-3110 — guardião dos 3 consertos do pedido do revisor de 30/10 23:20
// (vídeo fd0a408e, Kling 4, 15 s, árabe): (1) a cena mostra a AÇÃO e o lado da câmera; (2) a última cena não repete a primeira,
// em qualquer língua; (3) ؟ ۔ । 。！？ fecham frase na legenda (e a vírgula árabe/chinesa fecha o pedaço).
// Rodar: npx tsx scripts/test-legenda-cena-3110.mts
import fs from 'node:fs'
import { cenaQuaseIgual, FINAL_DIFERENTE_DA_ABERTURA } from '../lib/cinematic/filmQuality'


let pass = 0, fail = 0
const ok = (c: unknown, m: string) => { if (c) { pass++; console.log('  ok  ', m) } else { fail++; console.log('  FALHA', m) } }
const rd = (p: string) => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n')

// (3) legenda
const csp = rd('lib/captionScriptSpelling.ts')
const fecha = new RegExp(/const FECHA_POR_PONTUACAO = \/(.+?\$)\//.exec(csp)![1])
for (const w of ['متر؟', 'ہے۔', 'है।', '吗？', '了。', 'end.', 'what?']) ok(fecha.test(w), `(3) "${w}" fecha frase`)
ok(!fecha.test('متر') && !fecha.test('word,'), '(3) palavra sem ponto final não fecha frase')
const compose = rd('lib/compose.ts')
ok((compose.match(/\/\[\.!\?…؟۔।。！？\]\["'”’»\)\\\]」』\]\?\$\//g) ?? []).length === 3, '(3) compose.ts: as 3 regras de fim de frase conhecem ؟ ۔ । 。！？')
ok(compose.includes("/[,;:،؛，、；]$/.test((w.word ?? '').trim())"), '(3) compose.ts: a vírgula árabe/chinesa também fecha o pedaço')
const f15 = rd('lib/free15CanonicalCaptions.ts')
ok(f15.includes("sentenceEnd: /[.!?…؟۔।。！？]"), '(3) filme grátis de 15 s: o mesmo fim de frase')


// (2) última cena ≠ primeira, em qualquer língua
const abertura = 'Film visual medium: photorealistic. Slow push-in. A man in a black suit inside a submarine looks out through a round porthole into the dark deep sea, cold blue light.'
const fecho = 'Film visual medium: photorealistic. Low-angle shot. A man in a black suit inside a submarine looks through the round porthole at the dark deep sea, blue light.'
const outro = 'Film visual medium: photorealistic. Wide shot. A diver in the dark water knocks on the glass of a submarine porthole from outside, bubbles rising.'
ok(cenaQuaseIgual(fecho, abertura), '(2) fecho com o mesmo cenário e sujeito da abertura = quase igual')
ok(!cenaQuaseIgual(outro, abertura), '(2) cena com outra ação/lado ≠ quase igual')
const moldura = ['photorealistic', 'submarine', 'porthole', 'dark', 'deep']
ok(!cenaQuaseIgual('Film visual medium: photorealistic. A deep dark ocean, a submarine porthole glowing, an old man with a white beard looks up at storm clouds over an ancient city.', 'Film visual medium: photorealistic. A deep dark ocean, a submarine porthole glowing, a vibrant rainbow arcs over a wooden ship in the sunlight.', moldura), '(2) a moldura comum a todas as cenas não conta como repetição')
const fq = rd('lib/cinematic/filmQuality.ts')
ok(fq.includes('i === variedAdj.length - 1 && args.falas[i] !== args.falas[0] && cenaQuaseIgual(p, variedAdj[0], molduraDoFilme)') && fq.includes('aplicarEixoVisual(p, \'\', FINAL_DIFERENTE_DA_ABERTURA)'), '(2) só a ÚLTIMA cena, com fala diferente da 1ª, ganha o eixo do desfecho')
ok(/different place and angle from the opening shot/.test(FINAL_DIFERENTE_DA_ABERTURA), '(2) o eixo pede outro lugar e ângulo, mostrando o fim')

// (1) o descritor de cenas
const route = rd('app/api/generate-video-cinematic/route.ts')
ok(route.includes('show the ACTION the narration says (who does what to what)') && route.includes('put the camera on the side where that action is visible'), '(1) descritor: ação + lado da câmera')
ok(route.includes('The narration can be in any language; always write the shot in English.'), '(1) descritor: fala em qualquer língua, plano em inglês')
ok(route.includes('the LAST scene shows how the story ends') && route.includes('never repeat the opening shot'), '(2) descritor: a última cena mostra o fim, nunca repete a abertura')

console.log(`\n${pass} ok, ${fail} falha(s)`)
if (fail) process.exit(1)
