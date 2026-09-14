// KINEO-FIDELIDADE-2026-09-14 — regressões offline sobre o PLANO REAL do cenário H3
// Lituya (f04527a7), com os cinco achados da revisão visual do Board:
// abertura sem o acontecimento · deslizamento sobre fiorde calmo · onda sem escala ·
// "My son and I" sem atribuição · aparências diferentes do mesmo sobrevivente.
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import ts from 'typescript'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) ok++; else falhas.push(n) }
const roda = (src, globals = {}) => { const js = ts.transpileModule(src, { compilerOptions: { module: 1, target: 9 } }).outputText; const exp = {}; vm.runInNewContext(js, { exports: exp, console, ...globals }); return exp }
const F = roda(rd('lib/hollywood/fidelidade.ts'))

// ── o plano real do H3 (claim de 14/09 13:48 UTC) ──
const ficha = 'A rugged fisherman in his late 40s, weathered tan skin, short salt-and-pepper beard, dark wool cap, faded orange oilskin jacket over a grey sweater, heavy rubber boots'
const cenas = [
  { prompt: 'Howard Ulrich looks away from the camera, mouth closed, his expression serious. "Here is something most people do not know about the 1958 Lituya Bay megatsunami: a 524 meter wave caused by a landslide in Alaska.", subtle handheld camera movement, natural imperfect lighting', voiceover: 'The 1958 Lituya Bay megatsunami, caused by a landslide, generated a towering wave of 524 meters, the highest ever documented in history.' },
  { prompt: 'A wide shot of Lituya Bay, the still water reflecting the ominous clouds above. Mouth closed, not speaking, no lip movement., subtle handheld camera movement', voiceover: 'On July 9, 1958, Lituya Bay, Alaska, experienced a catastrophic tsunami that reshaped its landscape.' },
  { prompt: 'Aerial view of the steep mountains surrounding Lituya Bay, showing the rocky terrain. Mouth closed, not speaking, no lip movement.', voiceover: 'A massive landslide, triggered by an earthquake, displaced 30 million cubic meters of rock, creating a geological disaster of immense scale.' },
  { prompt: 'Close-up of a wall of water cascading down towards the bay, showing the immense height of the wave. Mouth closed, not speaking, no lip movement.', voiceover: 'The wave reached an astonishing height of 524 meters, dwarfing the Empire State Building in New York City.' },
  { prompt: 'Howard Ulrich turns to the camera, urgency in his eyes. "My son and I saw the wave coming, and we knew we had to act fast to survive it!", subtle handheld camera movement', voiceover: null, dialogueLine: 'My son and I saw the wave coming, and we knew we had to act fast to survive it!' },
  { prompt: 'A shot of the barren landscape after the tsunami, fallen trees scattered across the mountainside. Mouth closed, not speaking, no lip movement.', voiceover: 'The tsunami uprooted trees over 500 meters up the mountains, leaving a stark landscape of destruction behind.' },
  { prompt: 'Close-up of Howard Ulrich and his son on the boat, relieved and exhausted, looking at the wreckage around them. Mouth closed, not speaking, no lip movement.', voiceover: "Against all odds, Ulrich's quick thinking in that perilous moment saved them, marking their miraculous survival story in history." },
]

console.log('== achado 4: "My son and I" ganha atribuição, sem perder uma palavra ==')
const atrib = F.atribuirFalaConvertida(cenas[4].dialogueLine, ficha)
checa('fala em 1ª pessoa convertida em narração vem atribuída ao papel da ficha', atrib === 'The fisherman would later recall: "My son and I saw the wave coming, and we knew we had to act fast to survive it!"')
checa('nenhuma palavra da fala some', atrib.includes(cenas[4].dialogueLine))
checa('fala em 3ª pessoa não é tocada', F.atribuirFalaConvertida('The wave rose over the trees.', ficha) === 'The wave rose over the trees.')
checa('sem ficha, o papel é "the survivor"', F.atribuirFalaConvertida('I saw it.', '') === 'The survivor would later recall: "I saw it."')

console.log('== achados 1 e 5: citação sai do prompt de imagem; nome real vira o papel; a ficha entra verbatim ==')
const p1 = F.garantirFichaNoPrompt(F.despersonalizarPrompt(F.limparCitacaoDoPrompt(cenas[0].prompt), ficha), ficha)
checa('cena 1: a citação "Here is something…" saiu do prompt de imagem', !p1.includes('Here is something') && !p1.includes('"'))
checa('cena 1: "Howard Ulrich looks" virou "the fisherman looks"', /^A rugged fisherman[\s\S]*the fisherman looks away from the camera/.test(p1) && !/Howard Ulrich/.test(p1))
checa('cena 1: a ficha abre o prompt (continuidade em código)', p1.startsWith(ficha))
const p5 = F.garantirFichaNoPrompt(F.despersonalizarPrompt(F.limparCitacaoDoPrompt(cenas[4].prompt), ficha), ficha)
checa('cena 5: sem citação, sem nome real, com a ficha', !p5.includes('My son and I') && !/Howard Ulrich/.test(p5) && p5.startsWith(ficha) && /the fisherman turns to the camera/.test(p5))
const p7 = F.garantirFichaNoPrompt(F.despersonalizarPrompt(cenas[6].prompt, ficha), ficha)
checa('cena 7: "Close-up of Howard Ulrich and his son" vira o papel + ficha', /the fisherman and his son/.test(p7) && p7.startsWith(ficha) && !/Howard/.test(p7))
const p2 = F.garantirFichaNoPrompt(F.despersonalizarPrompt(cenas[1].prompt, ficha), ficha)
checa('cena 2 (só paisagem): a ficha NÃO é colada (evita o mesmo homem em todo b-roll)', p2 === cenas[1].prompt)
checa('a ficha não é duplicada quando o modelo já a repetiu', F.garantirFichaNoPrompt(`${ficha}. He stands on the deck.`, ficha).split('rugged fisherman').length === 2)
checa('"Lituya Bay" e "Empire State Building" não são tratados como pessoa (só nome + verbo de pessoa)', F.despersonalizarPrompt('A wide shot of Lituya Bay. The Empire State Building at dusk.', ficha) === 'A wide shot of Lituya Bay. The Empire State Building at dusk.')

console.log('== achados 2 e 3: a ação central da narração entra no pedido visual ==')
checa('cena 2: narração fala de tsunami que remodelou a paisagem; o prompt mostra água parada → ganha a frase da narração no início', !F.acaoCentralPresente(cenas[1].prompt, cenas[1].voiceover) && F.garantirAcaoCentral(cenas[1].prompt, cenas[1].voiceover).startsWith('Shows exactly this moment, as the narration describes it: "On July 9, 1958, Lituya Bay, Alaska, experienced a catastrophic tsunami that reshaped its landscape."'))
checa('cena 3: "deslizamento… 30 milhões de m³ de rocha" sobre "montanhas rochosas" → o prompt ganha o deslizamento', !F.acaoCentralPresente(cenas[2].prompt, cenas[2].voiceover) && /massive landslide/.test(F.garantirAcaoCentral(cenas[2].prompt, cenas[2].voiceover)))
checa('cena 4: onda de 524 m "dwarfing the Empire State Building" — o prompt passa a carregar a escala anunciada', /524 meters, dwarfing the Empire State Building/.test(F.garantirAcaoCentral(cenas[3].prompt, cenas[3].voiceover)))
checa('cena 6: a ação já está (trees/mountains), mas "over 500 meters" é ESCALA anunciada → o prompt ganha a frase; sem a escala, nada mudaria', /over 500 meters up the mountains/.test(F.garantirAcaoCentral(cenas[5].prompt, cenas[5].voiceover)) && F.garantirAcaoCentral(cenas[5].prompt, 'The tsunami uprooted trees high up the mountains, leaving destruction behind.') === cenas[5].prompt)
checa('narração vazia: prompt intacto', F.garantirAcaoCentral('anything', '') === 'anything')
checa('nomes próprios não contam como ação (Lituya/Alaska/Empire State ficam de fora)', !F.palavrasDeAcao(cenas[1].voiceover).includes('lituya') && F.palavrasDeAcao(cenas[1].voiceover).includes('tsunami') && F.palavrasDeAcao(cenas[3].voiceover).includes('astonishing') && !F.palavrasDeAcao(cenas[3].voiceover).includes('empire'))
checa('escala anunciada: "524 meters" e "dwarfing" são escala; "wall of water" não é', F.escalaAnunciada(cenas[3].voiceover) && !F.escalaAnunciada(cenas[3].prompt) && F.escalaAnunciada('taller than the Empire State Building'))

console.log('== ligação: planejador e montagem final usam a biblioteca ==')
const router = rd('lib/hollywood/router.ts')
checa('router: a conversão diálogo→narração atribui a fala e limpa a citação', router.includes('sc.voiceover = atribuirFalaConvertida(line, characterSheet)') && router.includes('sc.prompt = limparCitacaoDoPrompt(sc.prompt)'))
checa('router: toda cena sem diálogo passa por despersonalizar + ficha verbatim', router.includes('sc.prompt = garantirFichaNoPrompt(despersonalizarPrompt(limparCitacaoDoPrompt(sc.prompt), characterSheet), characterSheet)'))
const rota = rd('app/api/generate-video-cinematic/route.ts')
const iAcao = rota.indexOf("if (hs.type !== 'dialogue') hs.prompt = garantirAcaoCentral(limparCitacaoDoPrompt(hs.prompt), hs.voiceover ?? '')")
checa('rota: a ação central entra no prompt FINAL (depois do enche-silêncio, antes do POST), só em cena sem diálogo', iAcao > 0 && iAcao > rota.indexOf('KINEO-ENCHE-SILENCIO-2026-09-13 — modo IA') && iAcao < rota.indexOf('const scenePromptBruto = mouthPrefix + uprightPrefix + hs.prompt'))
checa('rota: duração reconciliada — acima de 105% do pedido o respiro é aparado, nunca palavras, nunca abaixo de 4 s', rota.includes('while ((totalSil > 7.5 || totalSec > duration * 1.05) && totalSec - 1 >= duration && guard-- > 0) {') && rota.includes("const folga = totalSil > 7.5 ? 1 : 0.8"))
// aritmética do apara sobre o plano real: 65 s planejados para 60 pedidos → cai para ≤63 sem tocar palavra
{
  const secs = [11, 7, 10, 9, 11, 8, 9]; const words = [22, 15, 21, 18, 22, 17, 20]
  const scenes = secs.map((s, i) => ({ seconds: s, words: words[i] }))
  const sil = (sc) => sc.seconds - sc.words / 2.3
  let totalSil = scenes.reduce((a, sc) => a + Math.max(0, sil(sc)), 0), totalSec = scenes.reduce((a, sc) => a + sc.seconds, 0), guard = 40
  const duration = 60
  while ((totalSil > 7.5 || totalSec > duration * 1.05) && totalSec - 1 >= duration && guard-- > 0) {
    const folga = totalSil > 7.5 ? 1 : 0.8
    const alvo = scenes.filter((sc) => sc.seconds > 4 && sil(sc) > folga).sort((a, b) => sil(b) - sil(a))[0]
    if (!alvo) break
    alvo.seconds -= 1; totalSil = scenes.reduce((a, sc) => a + Math.max(0, sil(sc)), 0); totalSec -= 1
  }
  checa(`plano real: 65 s → ${totalSec} s (≤ 63 = 105% de 60), palavras intactas, nenhuma cena abaixo de 4 s`, totalSec <= 63 && totalSec >= 60 && scenes.every((sc) => sc.seconds >= 4) && scenes.reduce((a, sc) => a + sc.words, 0) === 135)
}

console.log(`\n${ok} ok · ${falhas.length} falhas`)
for (const f of falhas) console.log('  ✗', f)
process.exit(falhas.length ? 1 : 0)
