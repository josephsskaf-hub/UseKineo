// KINEO-H3-LETREIRO-0611 — o motor sem proibição não recebe mais "captions" no prompt; todo filme refaz a imagem reprovada, até a última cena.
import { readFileSync } from 'node:fs'
import { semConviteDeLetreiro as s } from '../lib/semConviteDeLetreiro.ts'
let falhas = 0
const ok = (nome, v) => { console.log(`  ${v ? 'ok ' : 'FALHA'}  ${nome}`); if (!v) falhas++ }
const ler = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8')
const H3 = 'minimax/h3-max-turbo/image-to-video', SEED = 'fal-ai/bytedance/seedance/v1.5/pro/image-to-video', KLING = 'fal-ai/kling-video/v2.5-turbo/pro/image-to-video', VEO = 'fal-ai/veo3.1/fast/image-to-video', EDIT = 'fal-ai/nano-banana-pro/edit'
const historia = 'Film visual medium: photorealistic, ultra-detailed. Wide shot of a whale. 9:16 vertical framing, subject framed in the upper two-thirds with the lower third clear for captions, smooth camera motion, no watermark, no logo, no readable text, letters, numbers, labels or signage anywhere in the frame, same look.'
const doc = 'Opening shot: show the described subject and action immediately in the first frame, clearly readable; no unrelated establishing landscape or slow fade-in. A canyon, faceless cinematic b-roll, smooth camera motion, subject clearly framed with the lower third clear for captions, no watermark, no logo, no readable text, letters, numbers, labels or signage anywhere in the frame'
for (const [nome, p] of [['história', historia], ['documentário', doc]]) for (const [m, motor] of [[H3, 'H3 Turbo'], [SEED, 'Seedance']]) {
  const r = s(m, p)
  ok(`${motor}, ${nome}: sem "captions"`, !/captions/i.test(r))
  ok(`${motor}, ${nome}: sem a lista de proibição de texto`, !/readable text|no logo|watermark/i.test(r) && !/clearly readable/.test(r))
  ok(`${motor}, ${nome}: cena e cenário continuam`, /natural scenery continuing down to the bottom edge/.test(r) && /(whale|canyon)/i.test(r))
  ok(`${motor}, ${nome}: aplicar duas vezes não muda`, s(m, r) === r)
}
ok('fecho de foto só em filme realista', s(H3, historia).endsWith('Real photographed footage only.') && !s(H3, doc).includes('photographed'))
for (const [m, motor] of [[KLING, 'Kling 2.5'], [VEO, 'Veo 3.1']]) {
  const r = s(m, historia)
  ok(`${motor}: sem "captions", proibição mantida`, !/captions/i.test(r) && /no readable text/.test(r) && !r.includes('photographed'))
}
ok('imagem por edição não muda', s(EDIT, historia) === historia)
const semFrase = 'A whale, no readable text, letters, numbers, labels or signage anywhere in the frame'
ok('prompt sem a frase não muda (clipes e anúncios)', s(H3, semFrase) === semFrase)
ok('proteção da cena fica', /out of focus and unreadable/.test(s(H3, `${historia} writing out of focus and unreadable`)))

const fila = ler('lib/falQueue.ts'), reserva = ler('lib/kling4TrialFallback.ts'), rota = ler('app/api/generate-video-cinematic/route.ts'), critico = ler('lib/cinematic/criticoStill.ts')
ok('envio único usa o filtro', fila.includes('JSON.stringify(entradaSemConviteDeLetreiro(model, input))') && !fila.includes('body: JSON.stringify(input)'))
ok('reserva do grátis usa o filtro', reserva.includes('entradaSemConviteDeLetreiro(RESERVA_H3_MODEL, input)'))
ok('todo filme refaz a imagem', rota.includes("const criticoModo = modoDoCriticoDoStill(undefined, 'enforce')"))
ok('refações acompanham as cenas', rota.includes('regeracoes: scenes.length + 3'))
ok('teto nunca cai abaixo de 6', /Math\.max\(STILL_CRITIC_MAX_REGERACOES_FILME, o\.regeracoes \?\? 0\)/.test(critico))
if (falhas) { console.error(`${falhas} FALHA(S)`); process.exit(1) }
console.log('TUDO OK')
