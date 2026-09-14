// KINEO-FIDELIDADE-2026-09-14 (v3) — regressões ADVERSARIAIS sobre o PLANO REAL do
// cenário H3 Lituya (f04527a7) e sobre os cinco pontos da 2ª revisão do Board:
//   1. fala gerada → narração FACTUAL em 3ª pessoa (sem "would later recall"), EN/PT/ES
//   2. cobertura em 3 estados (coberta / divergente / desconhecida) — ação negada,
//      ausente, sujeito errado, escala divergente (5 m ≠ 524 m), calmo ≠ desabando
//   3. cadeia inteira: planejador → correção → PROMPT EFETIVAMENTE ENVIADO (fatia real da rota)
//   4. continuidade: ficha COMPLETA normalizada, só no protagonista
//   5. duração: nunca tirar 1 s sem folga ≥ 1,25 s; 7×10 s×21 palavras não é aparado
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
const libSrc = rd('lib/hollywood/fidelidade.ts')
const F = roda(libSrc)

// ── o plano real do H3 (claim de 14/09 13:48 UTC) ──
const ficha = 'A rugged fisherman in his late 40s, weathered tan skin, short salt-and-pepper beard, dark wool cap, faded orange oilskin jacket over a grey sweater, heavy rubber boots'
const planoReal = () => [
  { index: 1, type: 'support', prompt: 'Howard Ulrich looks away from the camera, mouth closed, his expression serious. "Here is something most people do not know about the 1958 Lituya Bay megatsunami: a 524 meter wave caused by a landslide in Alaska.", subtle handheld camera movement, natural imperfect lighting', voiceover: 'The 1958 Lituya Bay megatsunami, caused by a landslide, generated a towering wave of 524 meters, the highest ever documented in history.', seconds: 10 },
  { index: 2, type: 'support', prompt: 'A wide shot of Lituya Bay, the still water reflecting the ominous clouds above. Mouth closed, not speaking, no lip movement., subtle handheld camera movement', voiceover: 'On July 9, 1958, Lituya Bay, Alaska, experienced a catastrophic tsunami that reshaped its landscape.', seconds: 10 },
  { index: 3, type: 'support', prompt: 'Aerial view of the steep mountains surrounding Lituya Bay, showing the rocky terrain. Mouth closed, not speaking, no lip movement.', voiceover: 'A massive landslide, triggered by an earthquake, displaced 30 million cubic meters of rock, creating a geological disaster of immense scale.', seconds: 10 },
  { index: 4, type: 'support', prompt: 'Close-up of a wall of water cascading down towards the bay, showing the immense height of the wave. Mouth closed, not speaking, no lip movement.', voiceover: 'The wave reached an astonishing height of 524 meters, dwarfing the Empire State Building in New York City.', seconds: 10 },
  { index: 5, type: 'dialogue', prompt: 'Howard Ulrich turns to the camera, urgency in his eyes. "My son and I saw the wave coming, and we knew we had to act fast to survive it!", subtle handheld camera movement', dialogueLine: 'My son and I saw the wave coming, and we knew we had to act fast to survive it!', seconds: 10 },
  { index: 6, type: 'support', prompt: 'A shot of the barren landscape after the tsunami, fallen trees scattered across the mountainside. Mouth closed, not speaking, no lip movement.', voiceover: 'The tsunami uprooted trees over 500 meters up the mountains, leaving a stark landscape of destruction behind.', seconds: 10 },
  { index: 7, type: 'support', prompt: 'Close-up of Howard Ulrich and his son on the boat, relieved and exhausted, looking at the wreckage around them. Mouth closed, not speaking, no lip movement.', voiceover: "Against all odds, Ulrich's quick thinking in that perilous moment saved them, marking their miraculous survival story in history.", seconds: 10 },
]

console.log('== 1. fala gerada vira narração FACTUAL em 3ª pessoa — nunca depoimento inventado ==')
const n1 = F.narrarEmTerceiraPessoa('My son and I saw the wave coming, and we knew we had to act fast to survive it!', ficha, 'en')
checa('EN: "My son and I saw…we knew we had to" → "The fisherman and his son saw…they knew they had to" (fato, não testemunho)', n1 === 'The fisherman and his son saw the wave coming, and they knew they had to act fast to survive it!')
checa('EN: sem "would later recall", sem "said", sem aspas — nada que exija fonte', !/recall|said|says|\"/.test(n1))
checa('EN: nenhuma palavra de conteúdo se perde (wave, coming, knew, act, fast, survive)', ['wave', 'coming', 'knew', 'act fast', 'survive it!'].every((w) => n1.includes(w)))
checa('EN: "I\'m scared, my hands are shaking. I saw it. I ran." → é/ele, sem 1ª pessoa', F.narrarEmTerceiraPessoa("I'm scared, my hands are shaking. I saw it. I ran.", ficha, 'en') === 'The fisherman is scared, his hands are shaking. He saw it. He ran.')
checa('EN: "We have never seen anything like it" → "They have never seen…"', F.narrarEmTerceiraPessoa('We have never seen anything like it.', ficha, 'en') === 'They have never seen anything like it.')
checa('EN: ficha feminina → she/her', F.narrarEmTerceiraPessoa('I held my daughter and we waited.', 'A young woman with red hair and a green raincoat', 'en') === 'The woman held her daughter and they waited.')
checa('EN: 3ª pessoa não é tocada', F.narrarEmTerceiraPessoa('The wave rose over the trees.', ficha, 'en') === 'The wave rose over the trees.')
checa('EN: sem ficha → "the survivor"', F.narrarEmTerceiraPessoa('I saw it.', '', 'en') === 'The survivor saw it.')
checa('PT: "Meu filho e eu vimos a onda chegando" → "O pescador e seu filho viram a onda chegando"', F.narrarEmTerceiraPessoa('Meu filho e eu vimos a onda chegando.', ficha, 'pt') === 'O pescador e seu filho viram a onda chegando.')
checa('PT: "Eu estou com medo, minhas mãos tremem." → "O pescador está com medo, suas mãos tremem."', F.narrarEmTerceiraPessoa('Eu estou com medo, minhas mãos tremem.', ficha, 'pt') === 'O pescador está com medo, suas mãos tremem.')
checa('ES: "Mi hijo y yo vimos la ola" → "El pescador y su hijo vieron la ola"', F.narrarEmTerceiraPessoa('Mi hijo y yo vimos la ola.', ficha, 'es') === 'El pescador y su hijo vieron la ola.')
checa('ES: "Yo tengo miedo, mis manos tiemblan." → "El pescador tiene miedo, sus manos tiemblan."', F.narrarEmTerceiraPessoa('Yo tengo miedo, mis manos tiemblan.', ficha, 'es') === 'El pescador tiene miedo, sus manos tiemblan.')
checa('a biblioteca não tem mais o depoimento inventado ("would later recall"/atribuirFalaConvertida)', !libSrc.includes('would later recall: ') && !libSrc.includes('atribuirFalaConvertida') && !/return `[^`]*recall/.test(libSrc))

console.log('== 2. cobertura em 3 estados — coincidência lexical NÃO é "ação presente" ==')
const cob = (p, v, s = '') => F.avaliarCobertura(p, v, s).status
checa('ação NEGADA no prompt ("no landslide visible") → divergente', cob('The mountains, with no landslide visible, stand over the bay.', 'The landslide tore the mountainside apart and hit the water.') === 'divergente')
checa('ação AUSENTE (montanhas rochosas × deslizamento de 30 milhões de m³) → desconhecida, não coberta', cob(planoReal()[2].prompt, planoReal()[2].voiceover) === 'desconhecida')
checa('montanhas TRANQUILAS × montanhas DESABANDO → divergente', cob('Calm, tranquil mountains above a quiet bay at dawn.', 'A massive landslide sent the whole mountainside collapsing into the bay.') === 'divergente')
checa('cena 2 real: fiorde parado ("still water") × tsunami catastrófico → divergente', cob(planoReal()[1].prompt, planoReal()[1].voiceover) === 'divergente')
checa('escala DIVERGENTE: onda de 5 m no prompt × 524 m na narração → divergente', cob('A 5 meter wave hits the rocky shore.', 'The wave reached 524 meters, the highest ever recorded.') === 'divergente')
checa('escala AUSENTE: onda sem número × narração com 524 m e "dwarfing" → desconhecida', cob(planoReal()[3].prompt, planoReal()[3].voiceover) === 'desconhecida')
checa('SUJEITO ERRADO: narração fala do pescador, prompt mostra só o filho → divergente', cob('His son grips the rail as the boat climbs the wave.', 'The fisherman gripped the wheel and steered the boat straight into the wave.', ficha) === 'divergente')
checa('mesmo texto com o pescador na cena → coberta', cob('The fisherman grips the wheel as the boat climbs the wave.', 'The fisherman gripped the wheel and steered the boat straight into the wave.', ficha) === 'coberta')
checa('coincidência lexical ÚNICA ("mountains") não aprova: desconhecida', cob('Aerial view of mountains at sunset.', 'The landslide, triggered by an earthquake, tore the mountains apart and displaced millions of tons of rock.') === 'desconhecida')
checa('ação presente de verdade (uprooted trees + mountainside) → coberta', cob('Fallen, uprooted trees scattered across the mountainside after the wave.', 'The tsunami uprooted trees high up the mountains, leaving destruction behind.') === 'coberta')
checa('sem narração → sem_narracao, prompt intacto', cob('anything', '') === 'sem_narracao' && F.garantirAcaoCentral('anything', '').prompt === 'anything')
const g5 = F.garantirAcaoCentral('A 5 meter wave hits the rocky shore.', 'The wave reached 524 meters, the highest ever recorded.')
checa('divergente por escala: o "5 meter" contraditório SAI e a frase da narração ABRE o prompt', !/5 meter/.test(g5.prompt) && g5.prompt.startsWith('Shows exactly this moment, as the narration describes it: The wave reached 524 meters, the highest ever recorded.') && g5.cobertura.status === 'divergente')
const g2 = F.garantirAcaoCentral(planoReal()[1].prompt, planoReal()[1].voiceover)
checa('cena 2 real: "still" (calmo) sai do prompt e o tsunami entra na abertura', !/\bstill\b/.test(g2.prompt) && /catastrophic tsunami that reshaped its landscape/.test(g2.prompt))
checa('desconhecida também recebe a frase da narração (declarada, não aprovada por omissão)', F.garantirAcaoCentral(planoReal()[2].prompt, planoReal()[2].voiceover).prompt.startsWith('Shows exactly this moment') && F.garantirAcaoCentral(planoReal()[2].prompt, planoReal()[2].voiceover).cobertura.status === 'desconhecida')
checa('coberta deixa o prompt como está', F.garantirAcaoCentral('Fallen, uprooted trees scattered across the mountainside.', 'The tsunami uprooted trees high up the mountains.').prompt === 'Fallen, uprooted trees scattered across the mountainside.')

console.log('== 4. continuidade por personagem — ficha COMPLETA normalizada, só no protagonista ==')
checa('prompt que mostra o pescador ganha a ficha na abertura', F.garantirFichaNoPrompt('The fisherman grips the wheel.', ficha).startsWith(ficha))
checa('ARMADILHA dos 25 caracteres: "A rugged fisherman in his 60s with a white beard" NÃO é a ficha → a ficha completa entra', F.garantirFichaNoPrompt('A rugged fisherman in his 60s with a white beard grips the wheel.', ficha).startsWith(ficha))
checa('ficha já presente com pontuação/caixa diferentes → comparação normalizada, não duplica', F.garantirFichaNoPrompt('a rugged FISHERMAN in his late 40s weathered tan skin short salt and pepper beard dark wool cap faded orange oilskin jacket over a grey sweater heavy rubber boots grips the wheel', ficha).split(/rugged fisherman/i).length === 2)
checa('outra pessoa ("a young woman on the shore") NÃO recebe a ficha do protagonista', F.garantirFichaNoPrompt('A young woman on the shore watches the water.', ficha) === 'A young woman on the shore watches the water.')
checa('"his son clings to the rail" (só o filho) NÃO recebe a ficha', F.garantirFichaNoPrompt('His son clings to the rail of the boat.', ficha) === 'His son clings to the rail of the boat.')
checa('paisagem sem gente NÃO recebe a ficha', F.garantirFichaNoPrompt(planoReal()[1].prompt, ficha) === planoReal()[1].prompt)
checa('"the fisherman and his son" → recebe (o protagonista está na cena)', F.garantirFichaNoPrompt('Close-up of the fisherman and his son on the boat.', ficha).startsWith(ficha))
checa('ficha feminina: "she" recebe, "he" não', F.garantirFichaNoPrompt('She looks at the sea.', 'A young woman with red hair').startsWith('A young woman with red hair') && F.garantirFichaNoPrompt('He looks at the sea.', 'A young woman with red hair') === 'He looks at the sea.')
checa('"Lituya Bay"/"Empire State Building" não são pessoa (só nome + verbo de pessoa vira papel)', F.despersonalizarPrompt('A wide shot of Lituya Bay. The Empire State Building at dusk.', ficha) === 'A wide shot of Lituya Bay. The Empire State Building at dusk.' && F.despersonalizarPrompt('Howard Ulrich turns to the camera', ficha) === 'the fisherman turns to the camera')

console.log('== 3. a CADEIA INTEIRA: planejador (aplicarFidelidadeAoPlano) → montagem final da rota → prompt ENVIADO ==')
const rota = rd('app/api/generate-video-cinematic/route.ts')
const iIni = rota.indexOf("          const mouthSuffix = hs.type !== 'dialogue' ? ' If any person is visible: mouth closed, not speaking, no lip movement, no talking.' : ''")
const linhaFim = "          const scenePromptBruto = mouthPrefix + uprightPrefix + hs.prompt + eraSuffix + mouthSuffix + spectacleSuffix"
const iFim = rota.indexOf(linhaFim)
checa('a fatia da montagem final existe na rota (mouthSuffix … scenePromptBruto)', iIni > 0 && iFim > iIni)
const fatia = rota.slice(iIni, iFim + linhaFim.length)
checa('a fatia chama garantirAcaoCentral(silenciarFalaNoPrompt(hs.prompt), voiceover, ficha) e declara a cobertura no relato', fatia.includes("const fid = garantirAcaoCentral(silenciarFalaNoPrompt(hs.prompt), hs.voiceover ?? '', plan.characterSheet ?? '')") && fatia.includes('fidelidadeRelato.push({ cena: idx + 1, cobertura: fid.cobertura.status, motivo: fid.cobertura.motivo })'))
const montagem = roda(`export function montar(hs: any, idx: number, sceneAnchor: any, eraSuffix: string, plan: any, fidelidadeRelato: any[], garantirAcaoCentral: any, silenciarFalaNoPrompt: any) {\n${fatia}\n  return scenePromptBruto\n}`).montar
const plano = planoReal()
const relatoRouter = F.aplicarFidelidadeAoPlano(plano, ficha, 'en', true)
checa('planejador: a cena 5 (dialogue) virou support narrado, com a fala convertida em fato e sem dialogueLine', plano[4].type === 'support' && plano[4].voiceover === 'The fisherman and his son saw the wave coming, and they knew they had to act fast to survive it!' && plano[4].dialogueLine === undefined && plano[4].needsNarration === true && relatoRouter[4].convertida)
const relato = []
const enviados = plano.map((hs, idx) => montagem(hs, idx, undefined, '', { characterSheet: ficha }, relato, F.garantirAcaoCentral, F.silenciarFalaNoPrompt))
checa('ENVIADO: nenhuma cena leva aspas — nem a frase da narração vai entre aspas', enviados.every((p) => !/["“”]/.test(p)))
checa('ENVIADO: nenhuma instrução contraditória de fala (says / speaking / talking to camera / into the lens / turns to the camera)', enviados.every((p) => !/the person says|begins speaking|speaking about|talks to the camera|into the lens|turns to the camera/i.test(p)))
checa('ENVIADO: toda cena abre com "No one talks on camera" (prefixo de silêncio da rota) e leva o mouthSuffix', enviados.every((p) => p.startsWith('No one talks on camera.') && p.includes('mouth closed, not speaking, no lip movement, no talking.')))
checa('ENVIADO cena 1: sem "Here is something…", sem Howard Ulrich, COM a ficha completa', !/Here is something/.test(enviados[0]) && !/Howard Ulrich/.test(enviados[0]) && enviados[0].includes(ficha))
checa('ENVIADO cena 5: "My son and I" NÃO volta ao prompt de imagem; o pescador vira away from camera com a ficha', !/My son and I/.test(enviados[4]) && /the fisherman turns away from the camera, mouth closed/.test(enviados[4]) && enviados[4].includes(ficha))
checa('ENVIADO cena 2: o tsunami abre o pedido visual e "still" saiu', /Shows exactly this moment, as the narration describes it: On July 9, 1958, Lituya Bay, Alaska, experienced a catastrophic tsunami/.test(enviados[1]) && !/\bstill\b/.test(enviados[1]))
checa('ENVIADO cena 3: o deslizamento entra no pedido visual', /massive landslide, triggered by an earthquake/.test(enviados[2]))
checa('ENVIADO cena 4: os 524 m e o Empire State entram no pedido visual', /524 meters, dwarfing the Empire State Building/.test(enviados[3]))
checa('ENVIADO cena 7: "Howard Ulrich and his son" virou "the fisherman and his son" + ficha (mesmo rosto)', /the fisherman and his son/.test(enviados[6]) && enviados[6].includes(ficha) && !/Howard/.test(enviados[6]))
checa('cena 2 e 3 e 6 (paisagem/b-roll) NÃO carregam a ficha (não é o mesmo homem em todo plano)', !enviados[1].includes(ficha) && !enviados[2].includes(ficha) && !enviados[5].includes(ficha))
checa('relato de cobertura DECLARADO por cena: 7 entradas, com divergente (cena 2), desconhecida (3 e 4) e nenhuma aprovada por omissão', relato.length === 7 && relato[1].cobertura === 'divergente' && relato[2].cobertura === 'desconhecida' && relato[3].cobertura === 'desconhecida' && relato.every((r) => ['coberta', 'divergente', 'desconhecida', 'sem_narracao'].includes(r.cobertura) && r.motivo.length > 0))
// adversarial na cadeia: o planejador escreve a fala DE NOVO no prompt depois da conversão (o modelo repete a citação)
{
  const hs = { index: 9, type: 'support', prompt: 'The fisherman turns to the camera and says: "My son and I saw the wave coming!" Calm still water behind him.', voiceover: 'The fisherman and his son saw the wave coming.', seconds: 5 }
  const p = montagem(hs, 8, undefined, '', { characterSheet: ficha }, [], F.garantirAcaoCentral, F.silenciarFalaNoPrompt)
  checa('ADVERSARIAL: citação reinserida + "says:" + água parada → ENVIADO sem aspas, sem says, sem "still", com a onda', !/"/.test(p) && !/\bsays\b/.test(p) && !/\bstill\b/.test(p) && /wave/.test(p))
}
checa('router: a conversão sem rosto e a ficha passam pela MESMA função executada aqui (aplicarFidelidadeAoPlano), com o idioma do pedido', rd('lib/hollywood/router.ts').includes("aplicarFidelidadeAoPlano(outScenes, characterSheet, (args.language === 'pt' || args.language === 'es') ? args.language : 'en', true)") && rd('lib/hollywood/router.ts').includes("if (hostFits) aplicarFidelidadeAoPlano(outScenes, characterSheet, (args.language === 'pt' || args.language === 'es') ? args.language : 'en', false)"))
checa('rota: a cobertura por cena e a duração reconciliada vão no claim ao lado do contrato de cena', rota.includes('        contrato_cena: contratoRelato,\n        // KINEO-FIDELIDADE-2026-09-14 — cobertura da ação da narração por cena, declarada.\n        fidelidade_cena: fidelidadeRelato,\n        duracao_reconciliada: duracaoReconciliada,'))

console.log('== 5. duração — nunca tirar 1 s sem folga segura; estimativa não é áudio medido ==')
{
  const scenes = Array.from({ length: 7 }, () => ({ seconds: 10, words: 21 }))
  const r = F.apararComFolga(scenes, (sc) => sc.words, 60)
  checa('caso do Board: 7 cenas × 10 s × 21 palavras (9,13 s de fala) → NENHUMA vira 9 s', scenes.every((sc) => sc.seconds === 10) && r.aparado === 0)
  checa('sem folga segura: excedente REGISTRADO (70 s contra 63 = 105% de 60 → 7 s) e reconciliado=false', r.excedente === 7 && r.reconciliado === false)
}
{
  const secs = [11, 7, 10, 9, 11, 8, 9]; const words = [22, 15, 21, 18, 22, 17, 20]
  const scenes = secs.map((s, i) => ({ seconds: s, words: words[i] }))
  const r = F.apararComFolga(scenes, (sc) => sc.words, 60)
  const total = scenes.reduce((a, sc) => a + sc.seconds, 0)
  checa(`plano real do H3 (65 s): só as cenas com folga ≥ 1,25 s (1 e 5) perdem 1 s → ${total} s, reconciliado, palavras intactas`, total === 63 && scenes[0].seconds === 10 && scenes[4].seconds === 10 && scenes[1].seconds === 7 && scenes[2].seconds === 10 && r.reconciliado === true && r.aparado === 2 && scenes.reduce((a, sc) => a + sc.words, 0) === 135)
  checa('depois da apara toda cena mantém ≥ 0,25 s de folga estimada', scenes.every((sc) => sc.seconds - sc.words / 2.3 >= 0.25))
}
{
  const scenes = [{ seconds: 5, words: 4 }, { seconds: 4, words: 2 }, { seconds: 10, words: 23 }]
  F.apararComFolga(scenes, (sc) => sc.words, 12)
  checa('nunca abaixo de 4 s (a cena de 4 s não é tocada) e a de 10 s com 23 palavras (0 s de folga) não é tocada', scenes[1].seconds === 4 && scenes[2].seconds === 10)
}
checa('rota: o bloco de apara usa apararComFolga e grava o excedente no claim (base: estimate), sem o laço antigo de 0,8 s', rota.includes("const apara = apararComFolga(plan.scenes, (sc) => wordsOfLine(lineOf(sc)), duration)") && rota.includes("duracaoReconciliada = { reconciliado: apara.reconciliado, aparado_s: apara.aparado, excedente_s: apara.excedente, base: 'estimate' }") && !rota.includes('const folga = totalSil > 7.5 ? 1 : 0.8'))
checa('biblioteca: a folga mínima é 1,25 s e a cena nunca cai abaixo de 4 s', libSrc.includes('(sc.seconds || 0) > 4 && silencio(sc) >= 1.25'))

console.log(`\n${ok} ok · ${falhas.length} falhas`)
for (const f of falhas) console.log('  ✗', f)
process.exit(falhas.length ? 1 : 0)
