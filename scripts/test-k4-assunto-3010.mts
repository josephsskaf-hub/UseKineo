// KINEO-K4-SEM-MOLDURA-3010 + KINEO-SUJEITO-DA-FALA-3010 + KINEO-DESFECHO-3010 — guardião sem rede com os casos reais da revisão de 30/10 (Kling 4, 1º filme):
// (a) anúncio grego: 2 cenas com o MESMO prompt e tela de site com letras falsas; (b) Vênus: o fecho virou galáxia genérica.
import { promptDaCenaKling4, KLING4_PROMPT_MAX } from '../lib/cinematic/cenaKling4'
import { comSujeitoDaFala, sujeitosDaFala, comDesfechoDaFala, desfechoDaFala, prepararQualidadeDoFilme } from '../lib/cinematic/filmQuality'
import { deriveStyleAnchor } from '../lib/cinematic/sceneStyle'
let ok = 0, f = 0
const check = (n: string, c: boolean) => { if (c) { ok++; console.log('ok   ' + n) } else { f++; console.log('FAIL ' + n) } }
const P = 'Film visual medium: photorealistic, ultra-detailed. A sleek laptop screen shows the NCB Software website homepage while a business owner scrolls through it in a modern office., faceless cinematic b-roll, focus on the described subject and its environment, no foreground human faces, photorealistic, ultra-detailed, dramatic cinematic lighting, smooth camera motion, subject clearly framed with the lower third clear for captions, no watermark, no logo, no readable text, letters, numbers, labels or signage anywhere in the frame, same photorealistic look in every scene, one consistent color grade and lighting, same lens and film grain, energetic, natural, documentary, consistent color grade across all scenes, 9:16 vertical framing'
const st = deriveStyleAnchor('ad for software')
const k = [0, 1, 2].map((i) => promptDaCenaKling4(P, st, i))
check('3 cenas com o mesmo texto de origem saem com prompts DIFERENTES', new Set(k).size === 3)
check('cada cena cabe nos 512 do Kling 4', k.every((p) => Array.from(p).length <= KLING4_PROMPT_MAX))
check('a tela vai descrita em positivo', k.every((p) => /Every screen glows with soft abstract light and colour\./.test(p)))
check('a moldura do documentário saiu', k.every((p) => !/faceless cinematic b-roll|lower third clear for captions/.test(p)))
check('a ação do pedido continua', k.every((p) => /business owner scrolls/.test(p)))
check('a cauda continua', k.every((p) => p.endsWith('Mouth closed, no speaking.')))
check('Vênus entra no fecho que mostrava só galáxia', comSujeitoDaFala('A breathtaking view of the stars and galaxy', 'On Venus, the year ends before a single day does!', []).startsWith('Venus clearly visible as the subject of this shot.'))
check('cena que já mostra um dos assuntos fica igual', comSujeitoDaFala('A close-up of Venus rotating', 'This planet is Venus! But only 225 days to orbit the Sun.', []) === 'A close-up of Venus rotating')
check('pergunta sem nome próprio não muda nada', sujeitosDaFala('Did you know there is a planet where a day lasts longer than a year?').length === 0)
check('fala com pronome de gente fica de fora', sujeitosDaFala('Tsutomu Yamaguchi survived both bombs, and he lived to 93.').length === 0)
check('quem tem ficha no elenco não é repetido', comSujeitoDaFala('A girl plays', 'Then Kali smiles.', ['Kali']) === 'A girl plays')
// KINEO-DESFECHO-3010 — a última cena mostra o último acontecimento da fala (nallelhy, US, 30/10: a festa do pijama nunca apareceu)
const FESTA = 'At the mall, she buys a puppy and more... then a slumber party!'
check('desfecho lido depois do último "then"', desfechoDaFala(FESTA) === 'a slumber party')
check('última cena sem o desfecho ganha o desfecho na frente', comDesfechoDaFala('A girl walks through a shopping mall puppy store', FESTA).startsWith('Final moment of the story, clearly shown: a slumber party.'))
check('última cena que já mostra o desfecho fica igual', comDesfechoDaFala('Kids at a slumber party with pillows', FESTA) === 'Kids at a slumber party with pillows')
check('fala sem "then/…/depois" não inventa desfecho', desfechoDaFala('On Venus, the year ends before a single day does!') === null)
check('português: "e então viu o mar"', desfechoDaFala('Ela abriu a porta e então viu o mar.') === 'viu o mar')
const q = prepararQualidadeDoFilme({ prompts: ['A girl decorates a luxury kitchen', 'A girl opens a package', 'A girl walks through a shopping mall puppy store'], falas: ['A girl in a luxury kitchen makes everything aesthetic.', "It's a package full of squishies.", FESTA], contextoOriginal: FESTA, contextoFiltro: FESTA, modo: 'character_story', tagFaceless: false, style: st })
check('no filme inteiro, só a ÚLTIMA cena ganha o desfecho', /slumber party/.test(q.prompts[2]) && !/Final moment/.test(q.prompts[0] + q.prompts[1]))
console.log(`${f ? '🔴' : '🟢'} k4-assunto-3010: ${ok}/${ok + f}`)
if (f) process.exit(1)
