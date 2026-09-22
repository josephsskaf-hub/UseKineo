// KINEO-FIDELIDADE-2026-09-14 (v4) — regressões ADVERSARIAIS sobre o PLANO REAL do
// cenário H3 Lituya (f04527a7), os cinco pontos da 2ª revisão do Board e o delta
// da 3ª revisão:
//   1. conversão de pessoa preserva gramática, profissão e sentido ("I see" → "sees",
//      "Eu sobrevivi" → "sobreviveu", "Yo recuerdo" → "recuerda", nurse ≠ doctor);
//      construção não suportada é DECLARADA e o texto fica intacto
//   2. cobertura em 3 estados; dois substantivos não provam ação ("collapsed" ×
//      "remains intact"); a contradição identificada (negação, calmaria, escala) SAI
//      do prompt enviado; regex sem estado global (repetição/ordem)
//   3. cadeia inteira: planejador → correção → sceneTruth → textSafetySuffix →
//      submittedPrompt (fatia real da rota, sem fornecedor)
//   4. identidade EXPLÍCITA: a ficha entra no lugar da descrição do papel; pronome
//      não identifica ninguém ("his son… he grips" não recebe a ficha do pai)
//   5. duração: nunca tirar 1 s sem folga ≥ 2,0 s (15/09; era 1,25 s e o render H3 7bb62a29
//      estourou o clipe com a voz real); 7×10 s×21 palavras não é aparado
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
const ST = roda(rd('lib/cinematic/sceneTruth.ts'))
const VM = roda(rd('lib/cinematic/visualMode.ts'))
const SS = roda(rd('lib/cinematic/sceneStyle.ts'))

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

console.log('== 1. fala gerada vira narração FACTUAL em 3ª pessoa — gramática, profissão e sentido; não suportada é declarada ==')
const N = (l, s = ficha, i = 'en') => F.narrarEmTerceiraPessoa(l, s, i)
const n1 = N('My son and I saw the wave coming, and we knew we had to act fast to survive it!')
checa('EN: "My son and I saw…we knew we had to" → "The fisherman and his son saw…they knew they had to" (fato, não testemunho)', n1.texto === 'The fisherman and his son saw the wave coming, and they knew they had to act fast to survive it!' && n1.status === 'convertida')
checa('EN: sem "would later recall", sem "said", sem aspas — nada que exija fonte', !/recall|said|says|"/.test(n1.texto))
checa('EN Board: "I see the wave." → "The fisherman sees the wave." (verbo conjugado, não "The fisherman see")', N('I see the wave.').texto === 'The fisherman sees the wave.')
checa('EN: "I remember the sound. I still hear it." → "remembers… he still hears"', N('I remember the sound. I still hear it.').texto === 'The fisherman remembers the sound. He still hears it.')
checa('EN: "I\'m scared, my hands are shaking. I saw it. I ran." → é/ele, sem 1ª pessoa', N("I'm scared, my hands are shaking. I saw it. I ran.").texto === 'The fisherman is scared, his hands are shaking. He saw it. He ran.')
checa('EN: "I go back every year and I cry." → "goes… he cries"', N('I go back every year and I cry.').texto === 'The fisherman goes back every year and he cries.')
checa('EN: "We have never seen anything like it." → "They have never seen…"', N('We have never seen anything like it.').texto === 'They have never seen anything like it.')
checa('EN: ficha feminina → she/her ("I held my daughter and we waited." → "The woman held her daughter and they waited.")', N('I held my daughter and we waited.', 'A young woman with red hair and a green raincoat').texto === 'The woman held her daughter and they waited.')
checa('EN: ficha sem gênero → they + verbo plural ("I see it. I watch." → "The survivor sees it. They watch.")', N('I see it. I watch.', 'A person in a yellow coat').texto === 'The survivor sees it. They watch.')
checa('EN: 3ª pessoa não é tocada e é declarada sem_primeira_pessoa', N('The wave rose over the trees.').texto === 'The wave rose over the trees.' && N('The wave rose over the trees.').status === 'sem_primeira_pessoa')
checa('EN: verbo desconhecido após "I" ("I reckon it was fate.") → nao_suportada, texto INTACTO (nenhuma substituição parcial)', N('I reckon it was fate.').status === 'nao_suportada' && N('I reckon it was fate.').texto === 'I reckon it was fate.')
checa('EN: "I" sem verbo ("Only I, the last one, remained.") → nao_suportada, intacto', N('Only I, the last one, remained.').status === 'nao_suportada' && N('Only I, the last one, remained.').texto === 'Only I, the last one, remained.')
checa('profissão preservada: nurse → "the nurse" (não "the doctor"); doctor → "the doctor"', F.papelDoPersonagem('A tired nurse in blue scrubs', 'en') === 'the nurse' && F.papelDoPersonagem('An old doctor with glasses', 'en') === 'the doctor' && N('I hold the lamp.', 'A tired nurse in blue scrubs, her hair tied back').texto === 'The nurse holds the lamp.')
checa('PT Board: "Eu sobrevivi." → "O pescador sobreviveu." (não "O pescador sobrevivi")', N('Eu sobrevivi.', ficha, 'pt').texto === 'O pescador sobreviveu.')
checa('PT: "Meu filho e eu vimos a onda chegando." → "O pescador e seu filho viram a onda chegando."', N('Meu filho e eu vimos a onda chegando.', ficha, 'pt').texto === 'O pescador e seu filho viram a onda chegando.')
checa('PT: "Eu estou com medo, minhas mãos tremem. Eu pensei que ia morrer." → está / suas / pensou', N('Eu estou com medo, minhas mãos tremem. Eu pensei que ia morrer.', ficha, 'pt').texto === 'O pescador está com medo, suas mãos tremem. Ele pensou que ia morrer.')
checa('PT: ficha feminina → "a pescadora"', N('Eu vi tudo.', 'Uma fisherwoman de 50 anos, cabelo grisalho', 'pt').texto === 'A pescadora viu tudo.')
checa('PT: verbo ambíguo/desconhecido ("Eu fugi.") → nao_suportada, texto intacto', N('Eu fugi.', ficha, 'pt').status === 'nao_suportada' && N('Eu fugi.', ficha, 'pt').texto === 'Eu fugi.')
checa('ES Board: "Yo recuerdo." → "El pescador recuerda." (não "El pescador recuerdo")', N('Yo recuerdo.', ficha, 'es').texto === 'El pescador recuerda.')
checa('ES: "Mi hijo y yo vimos la ola." → "El pescador y su hijo vieron la ola."', N('Mi hijo y yo vimos la ola.', ficha, 'es').texto === 'El pescador y su hijo vieron la ola.')
checa('ES: "Yo tengo miedo, mis manos tiemblan. Yo corrí." → tiene / sus / corrió', N('Yo tengo miedo, mis manos tiemblan. Yo corrí.', ficha, 'es').texto === 'El pescador tiene miedo, sus manos tiemblan. Él corrió.')
checa('ES: verbo desconhecido ("Yo huyo.") → nao_suportada, intacto', N('Yo huyo.', ficha, 'es').status === 'nao_suportada' && N('Yo huyo.', ficha, 'es').texto === 'Yo huyo.')
// FID-V4-R1 (Board): "I'd" é had OU would; substituição ambígua nunca é "convertida"
checa('Board: "I\'d escape if I could." → "The fisherman would escape if he could." (would antes de forma base)', N("I'd escape if I could.").texto === 'The fisherman would escape if he could.' && N("I'd escape if I could.").status === 'convertida')
checa('"I\'d seen the wave before." → "The fisherman had seen the wave before." (had antes de particípio)', N("I'd seen the wave before.").texto === 'The fisherman had seen the wave before.')
checa('"I\'d never seen it. I\'d rather die." → had never seen / would rather die', N("I'd never seen it. I'd rather die.").texto === 'The fisherman had never seen it. He would rather die.')
checa('"We\'d escape together." → "They would escape together."; "We\'d been there." → "They had been there."', N("We'd escape together.").texto === 'They would escape together.' && N("We'd been there.").texto === 'They had been there.')
checa('"I\'d" antes de palavra fora das tabelas ("I\'d reckon so.") → nao_suportada, texto intacto', N("I'd reckon so.").status === 'nao_suportada' && N("I'd reckon so.").texto === "I'd reckon so.")
checa('"I\'d" no fim da frase ("Yes, I\'d.") → nao_suportada, intacto', N("Yes, I'd.").status === 'nao_suportada' && N("Yes, I'd.").texto === "Yes, I'd.")
// FID-V4-R3 (Board): as classes base/particípio NÃO são exclusivas — interseção é ambígua, nunca "convertida"
{
  const inter = F.EN_BASE_E_PARTICIPIO()
  checa(`propriedade: a interseção base ∩ particípio tem ${inter.length} palavras (come, run, put…) e auxiliarDeD devolve null em TODAS`, inter.length >= 10 && ['come', 'run', 'put', 'set', 'cut', 'hit', 'let', 'read', 'shut', 'split', 'spread'].every((w) => inter.includes(w)) && inter.every((w) => F.auxiliarDeD(w) === null))
  for (const frase of ["I'd come if I could.", "We'd run if we could.", "I'd put it there if I could."]) checa(`Board: "${frase}" → nao_suportada, texto INTACTO (nem had nem would)`, N(frase).status === 'nao_suportada' && N(frase).texto === frase)
  checa('exclusivos preservados: "I\'d escape" → would; "I\'d seen" → had; "I\'d been there" → had been; "I\'d be lost" → would be', F.auxiliarDeD('escape') === 'would' && F.auxiliarDeD('seen') === 'had' && N("I'd been there.").texto === 'The fisherman had been there.' && N("I'd be lost.").texto === 'The fisherman would be lost.')
  checa('"-ed" não decide sozinho: "need" está na base → "I\'d need help." → "would need"; "I\'d survived." → "had survived" (regular fora da base)', N("I'd need help.").texto === 'The fisherman would need help.' && N("I'd survived.").texto === 'The fisherman had survived.')
  checa('a decisão é por classe, não por frase: "We\'d cut the rope." (cut nas duas) → nao_suportada; "We\'d cut the rope" nunca vira "They had cut"', N("We'd cut the rope.").status === 'nao_suportada' && !/They had cut/.test(N("We'd cut the rope.").texto))
}
checa('a biblioteca não tem mais o depoimento inventado ("would later recall"/atribuirFalaConvertida)', !libSrc.includes('would later recall: ') && !libSrc.includes('atribuirFalaConvertida') && !/return `[^`]*recall/.test(libSrc))

console.log('== 2. cobertura em 3 estados — dois substantivos não provam ação; contradição SAI; sem estado global ==')
const cob = (p, v, s = '') => F.avaliarCobertura(p, v, s).status
checa('Board: "The mountain village collapsed" × "The mountain village remains intact" → divergente (não coberta)', cob('The mountain village remains intact under a grey sky.', 'The mountain village collapsed in seconds.') === 'divergente')
checa('dois substantivos sem ação ("mountain village at dawn" × "collapsed") → desconhecida', cob('The mountain village at dawn, smoke rising from chimneys.', 'The mountain village collapsed in seconds.') === 'desconhecida')
checa('ação NEGADA no prompt ("no landslide visible") → divergente', cob('The mountains, with no landslide visible, stand over the bay.', 'The landslide tore the mountainside apart and hit the water.') === 'divergente')
checa('ação AUSENTE (montanhas rochosas × deslizamento de 30 milhões de m³) → desconhecida, não coberta', cob(planoReal()[2].prompt, planoReal()[2].voiceover) === 'desconhecida')
checa('montanhas TRANQUILAS × montanhas DESABANDO → divergente', cob('Calm, tranquil mountains above a quiet bay at dawn.', 'A massive landslide sent the whole mountainside collapsing into the bay.') === 'divergente')
checa('cena 2 real: fiorde parado ("still water") × tsunami catastrófico → divergente', cob(planoReal()[1].prompt, planoReal()[1].voiceover) === 'divergente')
checa('escala DIVERGENTE: onda de 5 m no prompt × 524 m na narração → divergente', cob('A 5 meter wave hits the rocky shore.', 'The wave reached 524 meters, the highest ever recorded.') === 'divergente')
checa('escala AUSENTE: onda sem número × narração com 524 m e "dwarfing" → desconhecida', cob(planoReal()[3].prompt, planoReal()[3].voiceover) === 'desconhecida')
checa('SUJEITO ERRADO: narração fala do pescador, prompt mostra só o filho → divergente', cob('His son grips the rail as the boat climbs the wave.', 'The fisherman gripped the wheel and steered the boat straight into the wave.', ficha) === 'divergente')
// FID-V4-R1 (Board): citar o papel para declará-lo AUSENTE não é presença
checa('Board: "Only his son grips the wheel; the fisherman is absent." × "The fisherman grips the wheel." → divergente (sujeito ausente), não coberta', cob('Only his son grips the wheel; the fisherman is absent.', 'The fisherman grips the wheel.', ficha) === 'divergente' && /^sujeito ausente/.test(F.avaliarCobertura('Only his son grips the wheel; the fisherman is absent.', 'The fisherman grips the wheel.', ficha).motivo))
checa('"without the fisherman" e "the fisherman is nowhere to be seen" também são ausência', F.protagonistaAusente('The boat drifts without the fisherman.', ficha) && F.protagonistaAusente('The deck is empty; the fisherman is nowhere to be seen.', ficha) && !F.protagonistaAusente('The fisherman is exhausted.', ficha))
checa('caso legítimo preservado: "His son is alone on the boat. He grips the rail." × "The boy grips the rail." → coberta, prompt intacto', cob('His son is alone on the boat. He grips the rail.', 'The boy grips the rail.', ficha) === 'coberta' && F.garantirAcaoCentral('His son is alone on the boat. He grips the rail.', 'The boy grips the rail.', ficha).prompt === 'His son is alone on the boat. He grips the rail.')
// FID-V4-R3 (Board): a ausência de OUTRA pessoa não apaga a cena do protagonista — mesma oração, sem atravessar while/and/but
{
  const legit = 'The fisherman grips the wheel while his son is missing.'
  checa('Board: "The fisherman grips the wheel while his son is missing." → o pescador NÃO está ausente (é o filho)', F.protagonistaAusente(legit, ficha) === false)
  checa('mesmo caso: cobertura coberta (grips/grips), e o prompt fica INTACTO com o contexto do filho desaparecido', cob(legit, 'The fisherman grips the wheel.', ficha) === 'coberta' && F.garantirAcaoCentral(legit, 'The fisherman grips the wheel.', ficha).prompt === legit)
  checa('não atravessa "and"/"but"/", " nem outra pessoa: "The fisherman rows and the boy is gone", "The fisherman waits but the crew is missing", "The fisherman\'s son is missing" → nenhuma ausência do pescador', !F.protagonistaAusente('The fisherman rows and the boy is gone.', ficha) && !F.protagonistaAusente('The fisherman waits but the crew is missing.', ficha) && !F.protagonistaAusente("The fisherman's son is missing from the deck.", ficha) && !F.protagonistaAusente('The fisherman grips the wheel; he is gone.', ficha))
  checa('ausência EXPLÍCITA do próprio papel continua reconhecida: "the fisherman is absent", "the fisherman himself is nowhere to be seen", "without the fisherman"', F.protagonistaAusente('Only his son grips the wheel; the fisherman is absent.', ficha) && F.protagonistaAusente('The deck rolls; the fisherman himself is nowhere to be seen.', ficha) && F.protagonistaAusente('The boat drifts without the fisherman.', ficha))
  checa('relação não compreendida ("The fisherman, however, is absent" com vírgula) NÃO é removida por suspeita: prompt fica como está', F.removerAusencia('The fisherman, however, is absent.', ficha) === 'The fisherman, however, is absent.')
  const rem = F.removerAusencia('The fisherman is absent from the deck while his son grips the wheel.', ficha)
  checa('remoção cirúrgica: só a oração "the fisherman is absent from the deck" sai; "his son grips the wheel" fica', rem === 'his son grips the wheel.')
  checa('remoção preserva o caso já fechado: "Only his son grips the wheel; the fisherman is absent." → "Only his son grips the wheel."', F.removerAusencia('Only his son grips the wheel; the fisherman is absent.', ficha) === 'Only his son grips the wheel.')
}
checa('mesmo texto com o pescador na cena → coberta (gripped/grips casam pelo radical, e é AÇÃO)', cob('The fisherman grips the wheel as the boat climbs the wave.', 'The fisherman gripped the wheel and steered the boat straight into the wave.', ficha) === 'coberta')
checa('coincidência lexical ÚNICA de substantivo ("mountains") não aprova: desconhecida', cob('Aerial view of mountains at sunset.', 'The landslide, triggered by an earthquake, tore the mountains apart and displaced millions of tons of rock.') === 'desconhecida')
checa('ação presente de verdade (uprooted trees + mountainside) → coberta', cob('Fallen, uprooted trees scattered across the mountainside after the wave.', 'The tsunami uprooted trees high up the mountains, leaving destruction behind.') === 'coberta')
checa('sem narração → sem_narracao, prompt intacto', cob('anything', '') === 'sem_narracao' && F.garantirAcaoCentral('anything', '').prompt === 'anything')
// 15/09, render H3 7bb62a29: o sufixo de nitidez do router ("… pristine clarity …") vai em toda cena e marcava
// as 7 cenas de um terremoto como "divergente" — qualidade de IMAGEM não é estado de CENA
checa('"pristine clarity" (sufixo de nitidez) com narração de terremoto NÃO é divergente', cob('Aerial view of the rockslide tearing down the mountainside into the bay. Tack-sharp focus, crystal-clear detail, pristine clarity.', 'A massive rockslide fell into the bay after the earthquake.') !== 'divergente' && !libSrc.includes('|pristine|'))
{
  const p = 'Calm, tranquil mountains above a quiet bay at dawn.'; const v = 'A massive landslide sent the whole mountainside collapsing into the bay.'
  const r = [1, 2, 3, 4, 5].map(() => cob(p, v))
  checa('sem estado global: cinco chamadas IDÊNTICAS dão o mesmo veredito (não alternam)', r.every((x) => x === 'divergente'))
  const antes = cob('A wide shot of the bay.', 'The wave hit.'); const depois = cob(p, v); const denovo = cob('A wide shot of the bay.', 'The wave hit.')
  checa('ordem não muda o veredito (calmo → outro → calmo)', antes === denovo && depois === 'divergente' && cob(p, v) === 'divergente')
  checa('regex de teste sem flag g na biblioteca (CALMO_RE/VIOLENTO_RE)', libSrc.includes("const CALMO_RE = new RegExp(`\\\\b(?:${CALMO_PALAVRAS})\\\\b`, 'i')") && /const VIOLENTO_RE = \/[^\n]*\/i\n/.test(libSrc))
}
const gAus = F.garantirAcaoCentral('Only his son grips the wheel; the fisherman is absent.', 'The fisherman grips the wheel.', ficha)
checa('sujeito ausente: a direção incompatível SAI ("Only his son" e "is absent" somem) e o sujeito da frase vira o da narração', !/Only his son|absent/i.test(gAus.prompt) && /the fisherman grips the wheel\./i.test(gAus.prompt) && gAus.prompt.startsWith('Shows exactly this moment, as the narration describes it: The fisherman grips the wheel.'))
const gErr = F.garantirAcaoCentral('His son grips the rail as the boat climbs the wave.', 'The fisherman gripped the wheel and steered the boat straight into the wave.', ficha)
checa('sujeito errado: "His son grips the rail" vira "The fisherman grips the rail" no pedido visual', /The fisherman grips the rail as the boat climbs the wave\./.test(gErr.prompt) && !/His son/.test(gErr.prompt))
const gNeg = F.garantirAcaoCentral('The mountains, with no landslide visible, stand over the bay.', 'The landslide tore the mountainside apart and hit the water.')
checa('negação identificada é REMOVIDA do prompt (não concatenada a ordem oposta): sem "no landslide", com a frase da narração', !/no landslide/i.test(gNeg.prompt) && /^Shows exactly this moment, as the narration describes it: The landslide tore the mountainside apart and hit the water\./.test(gNeg.prompt) && /stand over the bay/.test(gNeg.prompt))
const gInt = F.garantirAcaoCentral('The mountain village remains intact under a grey sky.', 'The mountain village collapsed in seconds.')
checa('"remains intact" identificado é removido; o desabamento abre o prompt', !/intact|remains/i.test(gInt.prompt) && /^Shows exactly this moment, as the narration describes it: The mountain village collapsed in seconds\./.test(gInt.prompt))
const g5 = F.garantirAcaoCentral('A 5 meter wave hits the rocky shore.', 'The wave reached 524 meters, the highest ever recorded.')
checa('divergente por escala: o "5 meter" contraditório SAI e a frase da narração ABRE o prompt (sem aspas)', !/5 meter/.test(g5.prompt) && g5.prompt.startsWith('Shows exactly this moment, as the narration describes it: The wave reached 524 meters, the highest ever recorded.') && g5.cobertura.status === 'divergente')
const g2 = F.garantirAcaoCentral(planoReal()[1].prompt, planoReal()[1].voiceover)
checa('cena 2 real: "still" (calmo) sai do prompt e o tsunami entra na abertura', !/\bstill\b/.test(g2.prompt) && /catastrophic tsunami that reshaped its landscape/.test(g2.prompt))
checa('desconhecida também recebe a frase da narração (declarada, não aprovada por omissão)', F.garantirAcaoCentral(planoReal()[2].prompt, planoReal()[2].voiceover).prompt.startsWith('Shows exactly this moment') && F.garantirAcaoCentral(planoReal()[2].prompt, planoReal()[2].voiceover).cobertura.status === 'desconhecida')
checa('coberta deixa o prompt como está', F.garantirAcaoCentral('Fallen, uprooted trees scattered across the mountainside.', 'The tsunami uprooted trees high up the mountains.').prompt === 'Fallen, uprooted trees scattered across the mountainside.')

console.log('== 4. identidade EXPLÍCITA — a ficha entra no lugar da descrição do papel; pronome não identifica ==')
const GF = (p, s = ficha) => F.garantirFichaNoPrompt(p, s)
checa('"The fisherman grips the wheel." → a ficha ENTRA NO LUGAR de "the fisherman"', GF('The fisherman grips the wheel.').prompt === `${ficha} grips the wheel.` && GF('The fisherman grips the wheel.').identidade === 'ficha_no_lugar_da_descricao')
checa('Board: "A rugged fisherman in his 60s with a white beard grips the wheel." → a ficha substitui a descrição conflitante (sem 60s, sem white beard)', GF('A rugged fisherman in his 60s with a white beard grips the wheel.').prompt === `${ficha} grips the wheel.`)
checa('Board: "His son is alone on the deck. He grips the rail." → NENHUMA ficha (pronome não é identidade)', GF('His son is alone on the deck. He grips the rail.').prompt === 'His son is alone on the deck. He grips the rail.' && GF('His son is alone on the deck. He grips the rail.').identidade === 'sem_identidade_explicita')
checa('protagonista declarado ausente não recebe a ficha ("…; the fisherman is absent" → sem identidade explícita)', GF('Only his son grips the wheel; the fisherman is absent.').identidade === 'sem_identidade_explicita')
checa('"She looks at the sea." com ficha feminina → NENHUMA ficha por pronome', GF('She looks at the sea.', 'A young woman with red hair').prompt === 'She looks at the sea.')
checa('ficha já presente com pontuação/caixa diferentes → comparação normalizada, não duplica', GF('a rugged FISHERMAN in his late 40s weathered tan skin short salt and pepper beard dark wool cap faded orange oilskin jacket over a grey sweater heavy rubber boots grips the wheel').identidade === 'ficha_ja_presente')
checa('outra pessoa ("a young woman on the shore") NÃO recebe a ficha do protagonista', GF('A young woman on the shore watches the water.').prompt === 'A young woman on the shore watches the water.')
checa('paisagem sem gente NÃO recebe a ficha', GF(planoReal()[1].prompt).prompt === planoReal()[1].prompt)
checa('"Close-up of the fisherman and his son on the boat" → "Close-up of <ficha> and his son on the boat"', GF('Close-up of the fisherman and his son on the boat.').prompt === `Close-up of ${ficha} and his son on the boat.`)
checa('papel sem artigo ("Fisherman at the helm") → ficha prefixada, declarada', GF('Fisherman at the helm, waves breaking.').identidade === 'ficha_prefixada' && GF('Fisherman at the helm, waves breaking.').prompt.startsWith(ficha))
checa('"Lituya Bay"/"Empire State Building" não são pessoa (só nome + verbo de pessoa vira papel)', F.despersonalizarPrompt('A wide shot of Lituya Bay. The Empire State Building at dusk.', ficha) === 'A wide shot of Lituya Bay. The Empire State Building at dusk.' && F.despersonalizarPrompt('Howard Ulrich turns to the camera', ficha) === 'the fisherman turns to the camera')

console.log('== 3. a CADEIA INTEIRA: planejador → correção → sceneTruth → textSafetySuffix → submittedPrompt ==')
const rota = rd('app/api/generate-video-cinematic/route.ts')
const iIni = rota.indexOf("          const mouthSuffix = hs.type !== 'dialogue' ? ' If any person is visible: mouth closed, not speaking, no lip movement, no talking.' : ''")
const linhaFim = '          submittedPrompt = scenePrompt'
const iFim = rota.indexOf(linhaFim, iIni)
checa('a fatia da montagem final existe na rota (mouthSuffix … scenePromptBruto … contrato … submittedPrompt)', iIni > 0 && iFim > iIni)
const fatia = rota.slice(iIni, iFim + linhaFim.length)
checa('a fatia chama garantirAcaoCentral(silenciarFalaNoPrompt(hs.prompt), voiceover, ficha) e declara cobertura + conversão + identidade no relato', fatia.includes("const fid = garantirAcaoCentral(silenciarFalaNoPrompt(hs.prompt), hs.voiceover ?? '', plan.characterSheet ?? '', family === 'hollywood' ? 'fim' : 'inicio')") && fatia.includes('fidelidadeRelato.push({ cena: idx + 1, cobertura: fid.cobertura.status, motivo: fid.cobertura.motivo, conversao: hsFid.conversao ?? null, identidade: hsFid.identidade ?? null })') && fatia.includes('scenePrompt = scenePrompt + textSafetySuffix(scenePrompt)'))
const montagem = roda(`export function montar(hs: any, idx: number, sceneAnchor: any, eraSuffix: string, plan: any, fidelidadeRelato: any[], garantirAcaoCentral: any, silenciarFalaNoPrompt: any, montarContrato: any, aplicarContrato: any, severidadeDe: any, proibidosPorModo: any, formatoVisual: any, contratoRelato: any[], textSafetySuffix: any, console: any, family: any = 'h3') {\n  let submittedPrompt = ''\n${fatia}\n  return submittedPrompt\n}`).montar
const silencioso = { log: () => {}, warn: () => {} }
const enviar = (hs, idx, relato = [], contrato = []) => montagem(hs, idx, undefined, '', { characterSheet: ficha }, relato, F.garantirAcaoCentral, F.silenciarFalaNoPrompt, ST.montarContrato, ST.aplicarContrato, ST.severidadeDe, VM.proibidosPorModo, { modo: 'documentary_faceless' }, contrato, SS.textSafetySuffix, silencioso)
const plano = planoReal()
const relatoRouter = F.aplicarFidelidadeAoPlano(plano, ficha, 'en', true)
checa('planejador: a cena 5 (dialogue) virou support narrado, com a fala convertida em fato, declarada "convertida", sem dialogueLine', plano[4].type === 'support' && plano[4].voiceover === 'The fisherman and his son saw the wave coming, and they knew they had to act fast to survive it!' && plano[4].dialogueLine === undefined && plano[4].needsNarration === true && relatoRouter[4].convertida && relatoRouter[4].conversao === 'convertida' && plano[4].conversao === 'convertida')
checa('planejador: identidade declarada por cena (1, 5 e 7 = ficha no lugar da descrição; 2, 3, 4, 6 = sem identidade explícita)', [0, 4, 6].every((i) => relatoRouter[i].identidade === 'ficha_no_lugar_da_descricao') && [1, 2, 3, 5].every((i) => relatoRouter[i].identidade === 'sem_identidade_explicita'))
const relato = []
const enviados = plano.map((hs, idx) => enviar(hs, idx, relato))
checa('submittedPrompt: nenhuma cena leva aspas — nem a frase da narração vai entre aspas', enviados.every((p) => !/["“”]/.test(p)))
checa('submittedPrompt: nenhuma instrução contraditória de fala (says / speaking / talking to camera / into the lens / turns to the camera)', enviados.every((p) => !/the person says|begins speaking|speaking about|talks to the camera|into the lens|turns to the camera/i.test(p)))
checa('submittedPrompt: toda cena abre com "No one talks on camera" (prefixo de silêncio da rota) e leva o mouthSuffix', enviados.every((p) => p.startsWith('Nobody addresses the camera and nobody poses for it:') && p.includes('mouth closed, not speaking, no lip movement, no talking.'))) // KINEO-PREFIXO-SEM-PESSOA-2026-09-22: o prefixo deixou de presumir "every visible person"
checa('submittedPrompt cena 1: sem "Here is something…", sem Howard Ulrich, COM a ficha completa no lugar do papel', !/Here is something/.test(enviados[0]) && !/Howard Ulrich/.test(enviados[0]) && enviados[0].includes(`${ficha} looks away from the camera`))
checa('submittedPrompt cena 5: "My son and I" NÃO volta ao prompt de imagem; a ficha vira away from camera', !/My son and I/.test(enviados[4]) && enviados[4].includes(`${ficha} turns away from the camera, mouth closed`))
checa('submittedPrompt cena 2: o tsunami abre o pedido visual e "still" saiu', /Shows exactly this moment, as the narration describes it: On July 9, 1958, Lituya Bay, Alaska, experienced a catastrophic tsunami/.test(enviados[1]) && !/\bstill\b/.test(enviados[1]))
checa('submittedPrompt cena 3: o deslizamento entra no pedido visual', /massive landslide, triggered by an earthquake/.test(enviados[2]))
checa('submittedPrompt cena 4: os 524 m e o Empire State entram no pedido visual', /524 meters, dwarfing the Empire State Building/.test(enviados[3]))
checa('submittedPrompt cena 7: "Howard Ulrich and his son" virou "<ficha> and his son" (mesmo rosto)', enviados[6].includes(`Close-up of ${ficha} and his son`) && !/Howard/.test(enviados[6]))
checa('cenas 2, 3 e 6 (paisagem/b-roll) NÃO carregam a ficha (não é o mesmo homem em todo plano)', !enviados[1].includes(ficha) && !enviados[2].includes(ficha) && !enviados[5].includes(ficha))
checa('relato de cobertura DECLARADO por cena: 7 entradas, divergente (cena 2), desconhecida (3 e 4), com conversão e identidade, nenhuma aprovada por omissão', relato.length === 7 && relato[1].cobertura === 'divergente' && relato[2].cobertura === 'desconhecida' && relato[3].cobertura === 'desconhecida' && relato[4].conversao === 'convertida' && relato[0].identidade === 'ficha_no_lugar_da_descricao' && relato.every((r) => ['coberta', 'divergente', 'desconhecida', 'sem_narracao'].includes(r.cobertura) && r.motivo.length > 0))
// reproduções visuais do Board até o submittedPrompt
{
  const hs = { index: 8, type: 'support', prompt: 'The mountains, with no landslide visible, stand over the bay. Mouth closed, not speaking.', voiceover: 'The landslide tore the mountainside apart and hit the water.', seconds: 10 }
  const p = enviar(hs, 7)
  checa('Board: "no landslide visible" NÃO permanece no submittedPrompt (depois de sceneTruth e textSafetySuffix)', !/no landslide/i.test(p) && /The landslide tore the mountainside apart/.test(p))
}
{
  const hs = { index: 11, type: 'support', prompt: 'Only his son grips the wheel; the fisherman is absent.', voiceover: 'The fisherman grips the wheel.', seconds: 10 }
  const rel = []
  const p = enviar(hs, 10, rel)
  checa('Board: "Only his son… the fisherman is absent" → submittedPrompt sem "Only his son", sem "absent", cobertura divergente (não coberta)', !/Only his son|absent/i.test(p) && rel[0].cobertura === 'divergente' && /the fisherman grips the wheel/i.test(p))
  const cadeia = [{ index: 12, type: 'support', prompt: 'Only his son grips the wheel; the fisherman is absent.', voiceover: 'The fisherman grips the wheel.', seconds: 10 }]
  const relR = F.aplicarFidelidadeAoPlano(cadeia, ficha, 'en', true)
  const p2 = enviar(cadeia[0], 11)
  checa('cadeia inteira (planejador + rota): a ficha NÃO é colada na cláusula de ausência e o submittedPrompt sai sem a contradição', relR[0].identidade === 'sem_identidade_explicita' && !/Only his son|absent/i.test(p2))
  const leg = [{ index: 13, type: 'support', prompt: 'His son is alone on the boat. He grips the rail.', voiceover: 'The boy grips the rail.', seconds: 10 }]
  F.aplicarFidelidadeAoPlano(leg, ficha, 'en', true)
  const p3 = enviar(leg[0], 12)
  checa('caso legítimo até o submittedPrompt: o filho sozinho, descrito pela narração, fica como está e sem a ficha do pai', /His son is alone on the boat\. He grips the rail\./.test(p3) && !p3.includes(ficha))
  // FID-V4-R3 (Board): "while his son is missing" — a frase inteira chega ao submittedPrompt, cobertura não divergente
  const legit = 'The fisherman grips the wheel while his son is missing.'
  const relL = []
  const p4 = enviar({ index: 14, type: 'support', prompt: legit, voiceover: 'The fisherman grips the wheel.', seconds: 10 }, 13, relL)
  checa('Board: "The fisherman grips the wheel while his son is missing." chega INTEIRO ao submittedPrompt e a cobertura é coberta (não divergente)', p4.includes(legit) && relL[0].cobertura === 'coberta')
  const cadL = [{ index: 15, type: 'support', prompt: legit, voiceover: 'The fisherman grips the wheel.', seconds: 10 }]
  const relC = F.aplicarFidelidadeAoPlano(cadL, ficha, 'en', true)
  const p5 = enviar(cadL[0], 14)
  checa('cadeia planejador + rota: a ficha entra no lugar de "The fisherman" (identidade explícita) e "while his son is missing" sobrevive até o submittedPrompt', relC[0].identidade === 'ficha_no_lugar_da_descricao' && p5.includes(`${ficha} grips the wheel while his son is missing.`))
  const relA = []
  const p6 = enviar({ index: 16, type: 'support', prompt: 'The fisherman is absent from the deck while his son grips the wheel.', voiceover: 'The fisherman grips the wheel.', seconds: 10 }, 15, relA)
  checa('ausência explícita + oração legítima: só "is absent from the deck" sai; o sujeito vira o da narração; divergente declarado', !/absent|from the deck/.test(p6) && /The fisherman grips the wheel/.test(p6) && relA[0].cobertura === 'divergente')
}
{
  const hs = { index: 9, type: 'support', prompt: 'The mountain village remains intact under a grey sky.', voiceover: 'The mountain village collapsed in seconds.', seconds: 10 }
  const p = enviar(hs, 8)
  checa('Board: "remains intact" × "collapsed" → o submittedPrompt não leva "intact"/"remains" e mostra o desabamento', !/intact|remains/i.test(p) && /village collapsed/.test(p))
}
{
  const hs = { index: 10, type: 'support', prompt: 'The fisherman turns to the camera and says: "My son and I saw the wave coming!" Calm still water behind him.', voiceover: 'The fisherman and his son saw the wave coming.', seconds: 5 }
  const p = enviar(hs, 9)
  checa('ADVERSARIAL: citação reinserida + "says:" + água parada → submittedPrompt sem aspas, sem says, sem "still", com a onda', !/"/.test(p) && !/\bsays\b/.test(p) && !/\bstill\b/.test(p) && /wave/.test(p))
}
{
  const cenas = [{ index: 1, type: 'dialogue', prompt: 'A rugged fisherman in his 60s with a white beard looks into the lens. "I reckon it was fate."', dialogueLine: 'I reckon it was fate.', seconds: 5 }, { index: 2, type: 'support', prompt: 'His son is alone on the deck. He grips the rail.', voiceover: 'The boy held on.', seconds: 5 }]
  const rel = F.aplicarFidelidadeAoPlano(cenas, ficha, 'en', true)
  checa('cadeia: construção não suportada → narração INTACTA ("I reckon it was fate.") e declarada nao_suportada no relato e na cena', cenas[0].voiceover === 'I reckon it was fate.' && rel[0].conversao === 'nao_suportada' && cenas[0].conversao === 'nao_suportada')
  checa('cadeia: descrição conflitante (60s, white beard) substituída pela ficha; o filho não recebe a ficha do pai', cenas[0].prompt.startsWith(ficha) && !/60s|white beard/.test(cenas[0].prompt) && cenas[1].prompt === 'His son is alone on the deck. He grips the rail.' && rel[1].identidade === 'sem_identidade_explicita')
  const relatoClaim = []
  enviar(cenas[0], 0, relatoClaim)
  checa('claim: fidelidade_cena carrega conversao=nao_suportada e identidade=ficha_no_lugar_da_descricao', relatoClaim[0].conversao === 'nao_suportada' && relatoClaim[0].identidade === 'ficha_no_lugar_da_descricao')
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
  // 15/09 (render 7bb62a29): a apara a 1,25 s deixava 0,25 s e a voz real estourou o clipe. Agora só apara com folga ≥ 2,0 s.
  checa(`plano real do H3 (65 s): nenhuma cena tem folga ≥ 2,0 s → NENHUMA perde 1 s (${total} s), excedente 2 s REGISTRADO, palavras intactas`, total === 65 && r.aparado === 0 && r.excedente === 2 && r.reconciliado === false && scenes[0].seconds === 11 && scenes[4].seconds === 11 && scenes[1].seconds === 7 && scenes[2].seconds === 10 && scenes.reduce((a, sc) => a + sc.words, 0) === 135)
  checa('nada foi tocado: cada cena mantém exatamente a folga que tinha (0,3–1,4 s a 2,3 pal/s)', scenes.every((sc, i) => sc.seconds === secs[i]))
}
{
  // folga ≥ 2,0 s: aí sim a apara tira 1 s (e para quando o filme chega a ≤ 105 % do pedido)
  const scenes = [{ seconds: 12, words: 20 }, { seconds: 12, words: 20 }, { seconds: 10, words: 20 }]
  const r = F.apararComFolga(scenes, (sc) => sc.words, 30)
  const total = scenes.reduce((a, sc) => a + sc.seconds, 0)
  checa(`com folga ≥ 2,0 s (12 s × 20 palavras = 3,3 s) a apara tira 1 s por vez até ≤ 105 % do pedido: 34 → ${total} s, aparado ${r.aparado}, reconciliado`, total === 31 && r.aparado === 3 && r.reconciliado === true && scenes[2].seconds === 10)
  checa('e toda cena aparada ainda tem ≥ 1,0 s de folga', scenes.every((sc) => sc.seconds - sc.words / 2.3 >= 1.0))
  // ritmo da voz (15/09): a folga é medida no passo da persona quando a rota passa wps
  const lentas = [{ seconds: 12, words: 20 }, { seconds: 12, words: 20 }, { seconds: 10, words: 21 }]
  const r2 = F.apararComFolga(lentas, (sc) => sc.words, 30, 2.16)
  checa(`a 2,16 pal/s (onyx 0,94) a folga de 12 s × 20 palavras é 2,74 s → apara; 10 s × 21 (0,28 s) nunca é tocada: total ${lentas.reduce((a, sc) => a + sc.seconds, 0)} s`, lentas[2].seconds === 10 && r2.aparado >= 1 && lentas.every((sc) => sc.seconds - sc.words / 2.16 >= 0.25))
}
{
  const scenes = [{ seconds: 5, words: 4 }, { seconds: 4, words: 2 }, { seconds: 10, words: 23 }]
  F.apararComFolga(scenes, (sc) => sc.words, 12)
  checa('nunca abaixo de 4 s (a cena de 4 s não é tocada) e a de 10 s com 23 palavras (0 s de folga) não é tocada', scenes[1].seconds === 4 && scenes[2].seconds === 10)
}
checa('rota: o bloco de apara usa apararComFolga e grava o excedente no claim (base: estimate), sem o laço antigo de 0,8 s', rota.includes("const apara = apararComFolga(plan.scenes, (sc) => wordsOfLine(lineOf(sc)), duration, ritmoVoz)") && rota.includes("duracaoReconciliada = { reconciliado: apara.reconciliado, aparado_s: apara.aparado, excedente_s: apara.excedente, base: 'estimate' }") && !rota.includes('const folga = totalSil > 7.5 ? 1 : 0.8'))
checa('biblioteca: a folga mínima para aparar é 2,0 s (15/09; era 1,25 e a voz real estourava) e a cena nunca cai abaixo de 4 s', libSrc.includes('(sc.seconds || 0) > 4 && silencio(sc) >= 2.0') && !libSrc.includes('silencio(sc) >= 1.25'))

console.log(`\n${ok} ok · ${falhas.length} falhas`)
for (const f of falhas) console.log('  ✗', f)
process.exit(falhas.length ? 1 : 0)
