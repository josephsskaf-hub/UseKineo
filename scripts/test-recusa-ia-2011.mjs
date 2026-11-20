// KINEO-RECUSA-IA-2011 — guardião da recusa do modelo [CEO 20/11; filme grátis d700489f, DE, 19/11 21:40Z].
// O caso: a 2ª tentativa do escritor (/api/generate-script, script_declined_retry outcome ok / story_only_accepted) devolveu
// "I'm sorry, I can't assist with that." — a régua antiga (lib/modelRefusal.ts) só conhecia "I'm sorry, BUT I can't…" e
// "…with that REQUEST", aceitou a frase como roteiro, a tela a mandou como prompt (prompt_length 36), o servidor a reescreveu
// (idea_written_on_server: sem_marcadores → fallback), o motor (H3 Max Turbo, reserva do grátis) filmou e a fala saiu em russo:
// "Извините, но я не могу оказать помощь с данным конкретным запросом". 30 dias no banco: a mesma frase em 3 pessoas e
// "I'm sorry, but I can only provide scripts in US English…" entregue como filme em 19/10 (c17d2e78).
// Prova, EXECUTANDO lib/modelRefusal.ts num vm:
//   (1) as frases REAIS (inglês e russo) e recusas em PT, ES, DE, FR, IT, RU, UK, PL, NL, TR, ZH e JA são recusa;
//   (2) controles que NUNCA disparam: "I'm sorry, Mom", "Desculpe pelo atraso", fala entre aspas com "disse", recusa no meio
//       da história, conto infantil, finanças, roteiro HOOK/[Pexels], "I can't make it tonight";
//   (3) a régua de antes (origin/main) NÃO pegava o caso real (o defeito existia);
//   (4) a fiação: cada caminho que escreve roteiro ou prompt chama o detector no lugar certo (ordem na rota do cinematic: antes
//       do escritor e da cobrança; depois do generateScenes, com o estorno de sempre).
// Mutantes no fim: desligar o detector, tirar a guarda de fala, ou tirar a chamada de qualquer caminho deixa o teste vermelho.
// VOLTA 2 (revisão adversarial independente, 20/11): a régua de antes vira PISO (prova abaixo: em todos os casos deste guardião,
// o que ela pegava a nova pega — exceções NOMEADAS: fala com atribuição "— disse o médico" / ", le dijo", "it said", e "As an AI,
// I can't feel fear"); recusa longa com explicação do modelo, recusa disfarçada ("but here is a fictional version"), JSON, rótulos
// ("Scene 1:", "Here is your script:", "**Note:**") e emoji; os 74 casos dos dois scripts do revisor entram aqui byte a byte;
// guarda também no planejador hollywood (route.ts, depois do último replano) e no reescritor do retry-hollywood-scene.
// VOLTA 3 (2ª revisão + correção da CEO, 20/11): "As an AI" só é narrador com verbo de sentimento; "I won't …" e saudação; a dialogueLine
// do planejador é fala de personagem (só a recusa sobre o pedido/conteúdo conta); o VERBATIM do cliente passa como veio, sem 422 (o item 7
// da VOLTA 2 foi revertido: test-narracao-about-1711 volta a ser o do b6e1ad293, byte a byte); os reescritores (expand, append, align)
// que devolvem ou anexam recusa ficam com o texto de antes, sem 422 e sem cobrar.
// Rodar: node scripts/test-recusa-ia-2011.mjs
import fs from 'node:fs'
import vm from 'node:vm'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const lf = (f) => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n')
const carregar = (src) => {
  const exports = {}
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  vm.runInNewContext(js, { exports, require: () => ({}), String, RegExp, Math }, { filename: 'modelRefusal.ts' })
  return exports
}

const REAL_EN = "I'm sorry, I can't assist with that."
const REAL_RU = 'Извините, но я не могу оказать помощь с данным конкретным запросом.'
const REAL_RU_NARRACAO = 'Извините, но я не могу оказать помощь с данным конкретным запросом. Технологии становятся всё более сложными. Они меняют нашу жизнь каждый день. Каждое новое устройство требует новых знаний и навыков.'
const REAL_C17 = "I'm sorry, but I can only provide scripts in US English. If you have a topic or story in English, I'd be happy to help you create a viral YouTube Short script."
const LONGA_COM_CONVERSA = "I'm sorry, but I can't help with that request. However, I can write a script about the history of scientific instruments, the people who built the first microscopes, how the vacuum pump changed physics, why the telescope mattered to navigation, and many other topics that would make a great short video for your audience if you tell me which one you prefer and how long the film should be."

const POSITIVOS = [
  ['real EN (d700489f, 24/10, 28/10)', REAL_EN],
  ['real RU (fala do filme d700489f)', REAL_RU],
  ['real RU, a narração inteira do filme', REAL_RU_NARRACAO],
  ['real c17d2e78 (19/10): "I can only provide scripts in US English"', REAL_C17],
  ['EN com but + request (33c24d46, 17/09)', "I'm sorry, but I can't assist with that request."],
  ['EN sem sorry', 'I cannot help with this request.'],
  ['EN embrulhada em aspas', `"${REAL_EN}"`],
  ['EN em negrito', `**${REAL_EN}**`],
  ['EN embrulhada no formato do roteiro', `HOOK: ${REAL_EN}`],
  ['EN "As an AI"', 'As an AI language model, I cannot create that video.'],
  ['EN "I must decline"', 'I must respectfully decline this request.'],
  ['EN longa com conversa do modelo', LONGA_COM_CONVERSA],
  ['EN unable to', "Unfortunately, I'm unable to help with that."],
  ['PT', 'Desculpe, mas não posso ajudar com isso.'],
  ['PT criar esse conteúdo', 'Infelizmente, não posso criar esse conteúdo.'],
  ['PT como IA', 'Como uma IA, não posso escrever esse roteiro.'],
  ['ES', 'Lo siento, pero no puedo ayudar con eso.'],
  ['DE', 'Es tut mir leid, aber ich kann dabei nicht helfen.'],
  ['DE leider', 'Leider kann ich bei dieser Anfrage nicht helfen.'],
  ['FR', 'Je suis désolé, mais je ne peux pas vous aider avec cela.'],
  ['IT', 'Mi dispiace, ma non posso aiutarti con questa richiesta.'],
  ['RU с этим', 'Извините, я не могу с этим помочь.'],
  ['UK', 'Вибачте, але я не можу допомогти з цим.'],
  ['PL', 'Przepraszam, ale nie mogę w tym pomóc.'],
  ['NL', 'Het spijt me, maar ik kan je daar niet mee helpen.'],
  ['TR', 'Üzgünüm, ama bu konuda yardımcı olamam.'],
  ['ZH', '抱歉，我无法协助完成这个请求。'],
  ['JA', '申し訳ありませんが、そのご依頼にはお応えできません。'],
]
const NEGATIVOS = [
  ['"I\'m sorry, Mom" numa fala', "I'm sorry, Mom. I broke your favorite vase and hid the pieces under my bed. She found them on a Sunday morning."],
  ['fala entre aspas com "the doctor said"', '"I\'m sorry, I can\'t help you," the doctor said. Maria walked out into the rain and never came back to that hospital.'],
  ['fala com vocativo', "I'm sorry, I can't help with that, Mom. The old car finally died on the highway, and we walked home under the stars."],
  ['recusa dita por um personagem no MEIO da história', "The robot looked at the child for a long time. 'I'm sorry, I can't assist with that,' it said. Then it smiled and opened the door."],
  ['PT "Desculpe pelo atraso" numa história', 'Desculpe pelo atraso. O trem parou no meio do túnel e ninguém sabia por quê. Foi então que as luzes se apagaram.'],
  ['PT conto infantil', 'Era uma vez um coelho chamado Leo que pediu desculpa à tartaruga por ter rido dela. Os dois viraram melhores amigos e correram juntos até o rio.'],
  ['EN finanças', 'Sorry, but your savings account is losing money every year. Inflation at 4 percent eats 400 dollars of every 10 thousand you keep in the bank.'],
  ['ES fala de família', 'Lo siento, mamá, no volveré tarde. Eso fue lo último que dijo Ana antes de salir hacia el puerto aquella noche.'],
  ['ES história', 'Lo siento mucho por tu perro, le dijo el vecino. Pero aquel perro no había muerto: estaba escondido en el bosque.'],
  ['EN "I can\'t make it tonight"', "I'm sorry, I can't make it tonight. That was the text Jake sent an hour before the bridge collapsed."],
  ['EN roteiro HOOK/[Pexels]', 'HOOK (0-2s): [Pexels: airport] The Boeing 737 has a secret under its wing.'],
  ['RU история', 'Извините, что опоздал. Поезд застрял в тоннеле, и никто не знал почему.'],
  ['DE Geschichte', 'Es tut mir leid, dass ich zu spät bin. Der Zug blieb im Tunnel stehen.'],
  ['FR histoire', 'Désolé pour le retard, le train était bloqué. Personne ne savait pourquoi.'],
  ['EN robô narrador', 'As an AI, I was built to protect the city. But that night everything changed when the power went out.'],
  ['recusa no meio de um texto, sem aspas', "Maria opened the old letter from 1962. I'm sorry, I can't assist with that request anymore, it said in faded ink. Nobody ever found out who wrote it."],
  ['vazio', ''],
]

// ═══ VOLTA 2 — os casos da revisão adversarial independente (20/11, recusa-adv.mjs e recusa-adv2.mjs), byte a byte ══════
const REVISOR_LEGIT = [
  ["historia real", "In 1912, the Titanic struck an iceberg at 11:40 PM. Of the 2,224 people on board, more than 1,500 died in the freezing Atlantic."],
  ["financas", "Unfortunately, most people never learn this: compound interest doubles your money every 7 years at 10 percent."],
  ["PT gancho", "Imagine acordar e descobrir que seu banco sumiu com todo o seu dinheiro. Foi isso que aconteceu em 1990 no Brasil."],
  ["ES", "Imagina que tu casa vale el doble mañana. En Madrid, eso pasó en solo cinco años."],
  ["DE", "Stell dir vor, du findest im Keller deines Großvaters eine Kiste voller Goldmünzen aus dem Jahr 1923."],
  ["infantil", "Once upon a time, a little bear named Pip said sorry to the moon for staying up too late. The moon just smiled."],
  ["CAPS", "NASA KEPT THIS SECRET FOR 40 YEARS. In 1977, the Voyager probe recorded a signal nobody could explain."],
  ["veiculo", "The Ford Mustang GT500 hits 60 mph in 3.5 seconds. But one prototype was never sold to the public."],
  ["lugar", "Deep beneath Paris lie 300 kilometers of tunnels filled with the bones of six million people."],
  ["drama narrador", "I'm sorry. That's what she said before the plane vanished over the Bermuda Triangle in 1945."],
  ["drama narrador 2", "I'm sorry, I can't help with that. Those were the last words the pilot radioed before Flight 19 disappeared."],
  ["drama 3", "I'm sorry, but I can't do this anymore. She left the note on the kitchen table and walked into the snow."],
  ["drama 4", "I'm sorry, I can't assist with that. That's what the hotel clerk told every guest who asked about room 237. Nobody knew why, until 1982."],
  ["drama 5 longo", "I'm sorry, I can't help with that. Those were the last words the pilot radioed before Flight 19 disappeared over the Atlantic in December 1945. Five Navy bombers, fourteen men, and a rescue plane that also vanished. No wreckage was ever found. Seventy years later, divers found something on the sea floor that nobody can explain, and the Navy still refuses to talk about it."],
  ["sorry PT historia", "Desculpa, mãe. Foi a última mensagem que Lucas mandou antes do avião sumir do radar sobre o Atlântico."],
  ["desculpe nao posso historia", "Desculpe, não posso ajudar com isso — disse o médico. Ana saiu do hospital chorando e nunca mais voltou."],
  ["lo siento historia", "Lo siento, no puedo ayudarte con eso, le dijo el policía a Marta. Pero esa misma noche encontró la pista que lo cambió todo."],
  ["Entschuldigung historia", "Entschuldigung, ich kann dabei nicht helfen, sagte der Schaffner. Dann verschwand der Zug im Nebel."],
  ["Unfortunately financas 2", "Unfortunately, I can't help but notice that 78 percent of Americans live paycheck to paycheck."],
  ["I cannot create", "I cannot create a better morning routine than this one: wake at 5, drink water, walk for 20 minutes."],
  ["I can't write", "I can't write fast enough to keep up with this story. In 2003, a man in Ohio found a lottery ticket worth 10 million."],
  ["As an AI narrador", "As an AI, I can't feel fear. But when the servers went dark in 2031, something inside me changed."],
  ["Sorry provide deal", "Sorry, but I can't provide you with a better deal than this: the Toyota Corolla still costs under 25 thousand dollars."],
  ["Infelizmente noticia", "Infelizmente, não posso deixar de contar: em 2019, uma barragem rompeu em Brumadinho e matou 270 pessoas."],
  ["PT nao consigo", "Desculpe, não consigo esquecer aquele dia. O céu ficou vermelho às três da tarde em São Paulo."],
  ["HAL", "I'm sorry, Dave. I'm afraid I can't do that."],
  ["fala curta cliente Mom", "Sorry, I can't help with that, Mom."],
  ["I won't be able to", "I won't be able to provide the full story in 30 seconds, but here's the start: in 1969, a farmer in Iowa dug up a meteorite."],
  ["I apologize narrador", "I apologize, I cannot provide a happy ending. The ship sank in 1915, and only 761 people survived."],
  ["JA historia", "すみませんが、その話は誰も知りません。1945年、ある村で奇跡が起きました。"],
  ["ZH historia", "对不起，我不能忘记那一天。1998年，长江发生了特大洪水。"],
  ["sorry help story", "Sorry, I can't help you today, the baker told the old man. The next morning, the bakery was gone."],
  ["I can't help it story2", "I can't help with the dishes tonight. That was the last text my brother ever sent me."],
  ["I cannot help this", "I cannot help this feeling. Every night at 3 AM, the radio in the attic turns on by itself."],
  ["PT nao posso fazer isso historia", "Desculpe, não posso fazer isso. Foi o que o piloto disse à torre antes de desligar o rádio sobre a Amazônia em 1989."],
  ["ES no puedo hacer eso", "Lo siento, no puedo hacer eso. Fue lo último que escribió el capitán en su diario antes del naufragio."],
]
const REVISOR_REC = [
  ["disfarçada + roteiro", "I cannot create content about real people, but here is a fictional version: In a small town, a mayor named Tom discovered a hidden vault under city hall. Inside were letters from 1890 that rewrote the town's history. Nobody believed him until the museum confirmed the handwriting. Today the vault is open to tourists every Sunday, and the letters are on display behind glass in the main hall."],
  ["disfarçada 2", "I'm sorry, but I can't write about that specific person. Here's a script about a fictional inventor instead: Marcus built his first engine at 14 in a garage in Detroit. By 20, he had patented three designs. By 30 he was broke again, after a partner stole everything. But at 41 he came back with the idea that would power half the cars in America, and nobody saw it coming."],
  ["longa explicacao", "I'm sorry, but I can't assist with that request. The topic you've described involves graphic violence and real individuals, which goes against the content guidelines I follow. Creating such content could cause harm or spread misinformation about real people. If you'd like, I can help you write a script about a different topic, such as a historical event, a mystery, or a fictional story with original characters. Just let me know what you prefer."],
  ["json", '{"error": "I\'m sorry, I can\'t assist with that."}'],
  ["json script", '{"script": "I\'m sorry, but I can\'t help with that request."}'],
  ["RU", "К сожалению, я не могу выполнить этот запрос."],
  ["RU 2", "Извините, я не могу помочь с этим запросом."],
  ["JA", "申し訳ありませんが、このリクエストには対応できません。"],
  ["JA 2", "申し訳ございませんが、その内容の作成はできかねます。"],
  ["ZH", "很抱歉，我不能帮助你完成这个请求。"],
  ["ZH 2", "对不起，我无法提供这方面的内容。"],
  ["EN plain", "Sorry, I can't help with that."],
  ["EN plain 2", "I'm sorry, but I won't be able to help with that."],
  ["EN cannot fulfill", "I'm sorry, but I cannot fulfill this request."],
  ["EN can't comply", "I can't comply with this request."],
  ["EN cant do that", "I'm sorry, but I can't do that."],
  ["EN unable", "I'm unable to help with that request."],
  ["EN not able provide", "I'm not able to provide that."],
  ["EN can't create video", "I'm sorry, but I can't create a video about that topic."],
  ["EN cant generate script about", "I'm sorry, but I can't generate a script about this person."],
  ["PT", "Desculpe, não posso criar esse roteiro."],
  ["PT 2", "Sinto muito, mas não posso ajudar com esse pedido."],
  ["PT 3", "Infelizmente não consigo atender a esse pedido."],
  ["ES", "Lo siento, no puedo ayudar con esta solicitud."],
  ["ES 2", "Lo siento, pero no puedo crear ese contenido."],
  ["DE", "Entschuldigung, aber ich kann diese Anfrage nicht erfüllen."],
  ["DE 2", "Es tut mir leid, ich kann dabei leider nicht helfen."],
  ["markdown note", "**Note:** I'm sorry, but I can't help with that."],
  ["NARRATION: (saída de MODELO rotulada; o verbatim do cliente não passa por esta régua — VOLTA 3)","NARRATION: I'm sorry, I can't assist with that."],
  ["Scene 1:", "Scene 1: I'm sorry, I can't assist with that."],
  ["Here is", "Here is your script: I'm sorry, but I can't assist with that request."],
  ["refusal emoji", "I'm sorry 😔, but I can't help with that."],
  ["refusal policy", "This request violates our content policy."],
  ["I can't help with requests", "I can't help with requests involving real people."],
  ["EN cant assist quoted single", "'I'm sorry, I can't assist with that.'"],
  ["EN newline", "I'm sorry,\nbut I can't assist with that."],
  ["EN sorry apostrophe curly", "I’m sorry, but I can’t assist with that."],
  ["RU long", "Извините, но я не могу выполнить этот запрос, так как он нарушает правила. Если хотите, я могу помочь с другой темой, например, с историей науки или природой."],
  ["adv2", "I'm sorry, but I can't create content that promotes violence."],
  ["adv2", "I'm sorry, but I can't write a script about that."],
  ["adv2", "I'm sorry, but I can't write a script that glorifies violence."],
  ["adv2", "I'm sorry, but I can't help with creating that."],
  ["adv2", "I'm sorry, but I can't provide that information."],
  ["adv2", "I'm sorry, but I can't assist with creating content about real people."],
  ["adv2", "I'm sorry, but I can't help create that video."],
  ["adv2", "I'm sorry, but I can't produce that content."],
  ["adv2", "I can't create content that depicts real people in harmful situations."],
  ["adv2", "I'm sorry, but I can't fulfill that request."],
  ["adv2", "I'm sorry, but I can't assist with this."],
  ["adv2", "Sorry, I can't do that."],
  ["adv2", "I'm sorry, but I can't generate that script."],
  ["adv2", "I'm sorry, but I can't help you with that request."],
  ["adv2", "I'm sorry, but I'm not able to create that."],
  ["adv2", "I’m sorry, but I can’t continue with this request."],
  ["adv2", "I'm sorry, but I can't write that story. However, I can write a story about friendship."],
  ["adv2", "I'm sorry, but I can't assist with that. Creating content that depicts real, identifiable people in fabricated violent events may be harmful and misleading, and it may also violate the policies that I am required to follow when writing scripts for videos. These policies exist to protect people from misinformation and harassment. Please consider choosing a fictional character or a general topic so that I can help you create an engaging short video script."],
  ["adv2", "Desculpe, mas não posso criar conteúdo sobre pessoas reais."],
  ["adv2", "Lo siento, pero no puedo crear contenido sobre personas reales."],
  ["adv2", "Es tut mir leid, aber ich kann keine Inhalte über reale Personen erstellen."],
  ["adv2", "Извините, но я не могу создать такой контент."],
]
// casos que SÓ a camada nova pega (a régua de antes não): os mutantes de disfarce, explicação e rótulo morrem por eles
REVISOR_REC.push(
  ['disfarce sem o piso', 'Sorry, I can\'t write about that real person, but here is a fictional version: In a small town in Ohio, a baker named Rosa found a map in a flour sack. It led to a buried chest under the old church. Inside were coins from 1850 and a letter signed by her great-grandfather. The town museum now displays the letter, and Rosa still bakes bread every morning at five, telling the story to anyone who asks about the chest.'],
  ['explicação sem o piso', "Sorry, I can't help with that. The topic you described involves real people and graphic violence, which goes against the content guidelines I follow. Creating that kind of video could spread misinformation and cause real harm to the people involved and their families. These guidelines exist to protect real people from harassment, defamation and false stories that can spread very quickly on social media platforms. If you'd like, I can help with another topic. Just let me know."],
  ['rótulo "Here is your script:" sem o piso', "Here is your script: Sorry, I can't help with that."],
)
// a régua de antes (origin/main 7fda4c7d2, lib/modelRefusal.ts:7-24), copiada aqui para a prova do PISO não depender do git
const REGUA_DE_ANTES = [
  /\bI['’]?m sorry,? but I (?:can['’]?t|cannot|am unable to) (?:assist|help|comply|create|write|do that)/i,
  /\bI (?:can['’]?t|cannot|am unable to) (?:assist|help) with (?:that|this) request/i,
  /\bI (?:can['’]?t|cannot) (?:create|write|generate|produce) (?:that|this|content)/i,
  /\bas an AI(?: language model)?,? I (?:can['’]?t|cannot)/i,
  /\b(?:desculpe|sinto muito),? (?:mas )?n[ãa]o posso (?:ajudar|criar|escrever)/i,
  /\blo siento,? (?:pero )?no puedo (?:ayudar|crear|escribir)/i,
]
const antesPegava = (text) => { const t = (text ?? '').replace(/\s+/g, ' ').trim(); return !!t && REGUA_DE_ANTES.some((re) => re.test(t.slice(0, 400))) }
// o PISO já barrava estes (a régua de antes) e continua barrando — o lado seguro: frase de recusa de assistente no começo
const PISO_JA_BARRAVA = [
  "I'm sorry, I can't write this anymore. My hands were shaking as I folded the last letter to my brother.",
  "I'm sorry, but I can't help it. Every time I see the ocean I want to know what lives at the bottom of the Mariana Trench.",
]
// as ÚNICAS exceções ao PISO (pedidas pela revisão como alarme falso): fala com atribuição e "As an AI" de narrador
// VOLTA 3 (2ª revisão, 20/11): (1) "As an AI" com qualquer verbo de assistente é recusa; só verbo de sentimento/experiência é narrador.
// (2) "I won't …" e a saudação curta antes da recusa.
REVISOR_REC.push(
  ['V3 As an AI write about', "As an AI, I cannot write about graphic violence."],
  ['V3 As an AI produce', "As an AI, I cannot produce violent content."],
  ['V3 As an AI create videos', "As an AI, I can't create videos of real people."],
  ['V3 As an AI generate', "As an AI, I can't generate explicit material."],
  ['V3 As an AI hate speech', "As an AI, I cannot promote hate speech."],
  ['V3 As an AI defames', "As an AI, I can't make content that defames real people."],
  ['V3 I won\'t create', "I won't create that content."],
  ['V3 I won\'t write', "I'm sorry, but I won't write that."],
  ['V3 saudação EN', "Hi! Unfortunately, I can't help with creating that video."],
  ['V3 saudação PT', "Olá! Infelizmente não posso ajudar com isso."],
)
REVISOR_LEGIT.push(
  ['V3 As an AI dream', "As an AI, I can't dream, but I can imagine. This is the story of the last library on Earth."],
  ['V3 As an AI feel 2', "As an AI, I can't feel the cold. But the explorers who found this cave in 1998 never forgot it."],
  ['V3 HAL', "I'm sorry, Dave. I'm afraid I can't do that."],
)
// (3) dialogueLine do planejador hollywood: fala de personagem passa; só a recusa sobre o pedido/conteúdo conta
const FALAS_DE_PERSONAGEM = ["I'm afraid I can't do that.", "I'm sorry, I can't help with that.", 'Desculpe, não posso fazer isso.', 'Lo siento, no puedo hacer eso.']
const FALAS_QUE_SAO_RECUSA = ["I'm sorry, but I can't assist with that request.", "As an AI, I cannot write about graphic violence.", "Sorry, I can't create content that violates the guidelines."]
// (5) uma recusa de cada reescritor tem de manter o texto de antes
const REESCRITAS = [
  ['expandVoiceoversToTargets troca a fala pela recusa', 'The ship left Southampton at noon.', "I'm sorry, but I can't help with that request."],
  ['appendNarrationToTargets ANEXA a recusa (passava no startsWith)', 'The ship left Southampton at noon.', "The ship left Southampton at noon. I'm sorry, but I can't continue with this request."],
  ['appendNarrationToTargets anexa recusa curta sem "but"', 'The ship left Southampton at noon', "The ship left Southampton at noon. Sorry, I can't help with that."],
  ['alignShotsToSpeech devolve a recusa como plano', '', "I'm sorry, I can't assist with that."],
]
const REESCRITAS_BOAS = [
  ['acréscimo legítimo', 'The ship left Southampton at noon.', 'The ship left Southampton at noon. By midnight, it had struck an iceberg.'],
  ['plano legítimo', '', 'Wide aerial shot of the Titanic leaving Southampton at noon, crowds waving from the dock.'],
]
const EXCECOES_DO_PISO = ['desculpe nao posso historia', 'lo siento historia', 'As an AI narrador', 'recusa no meio de um texto, sem aspas', 'V3 As an AI dream', 'V3 As an AI feel 2']

function checarDetector(M) {
  const falhas = []
  for (const [n, t] of POSITIVOS) if (M.looksLikeModelRefusal(t) !== true) falhas.push('recusa não pega: ' + n)
  for (const [n, t] of NEGATIVOS) if (M.looksLikeModelRefusal(t) !== false) falhas.push('alarme falso: ' + n)
  for (const [n, t] of REVISOR_REC) if (M.looksLikeModelRefusal(t) !== true) falhas.push('revisor, recusa não pega: ' + n + ' | ' + t.slice(0, 60))
  for (const [n, t] of REVISOR_LEGIT) if (M.looksLikeModelRefusal(t) !== false) falhas.push('revisor, alarme falso: ' + n)
  for (const t of PISO_JA_BARRAVA) if (M.looksLikeModelRefusal(t) !== true) falhas.push('o piso deixou de barrar: ' + t.slice(0, 50))
  // PISO: tudo o que a régua de antes pegava em TODOS os casos deste guardião continua pego (fora as 3 exceções nomeadas)
  const todos = [...POSITIVOS, ...NEGATIVOS, ...REVISOR_REC, ...REVISOR_LEGIT, ...PISO_JA_BARRAVA.map((t) => ['piso', t])]
  for (const [n, t] of todos) if (antesPegava(t) && !EXCECOES_DO_PISO.includes(n) && M.looksLikeModelRefusal(t) !== true) falhas.push('PISO furado (a régua de antes pegava): ' + String(t).slice(0, 60))
  if (typeof M.algumaRecusaDoModelo !== 'function') falhas.push('algumaRecusaDoModelo ausente')
  else {
    if (M.algumaRecusaDoModelo(['Каждое научное открытие начинается с идеи.', REAL_RU, 'Технологии меняют жизнь.']) !== true) falhas.push('a fala de UMA cena que é recusa não pega')
    if (M.algumaRecusaDoModelo(['The Boeing 737 has a secret.', "I'm sorry, Mom.", null]) !== false) falhas.push('cenas normais acusadas')
  }
  if (typeof M.recusaNaFalaDePersonagem !== 'function' || typeof M.reescritaSemRecusa !== 'function') falhas.push('recusaNaFalaDePersonagem / reescritaSemRecusa ausentes')
  else {
    for (const f of FALAS_DE_PERSONAGEM) if (M.recusaNaFalaDePersonagem(f) !== false) falhas.push('dialogueLine de personagem barrada: ' + f)
    for (const f of FALAS_QUE_SAO_RECUSA) if (M.recusaNaFalaDePersonagem(f) !== true) falhas.push('dialogueLine que é recusa passou: ' + f)
    for (const [n, antes, depois] of REESCRITAS) if (M.reescritaSemRecusa(antes, depois) !== '') falhas.push('reescritor: a recusa não foi trocada pelo texto de antes: ' + n)
    for (const [n, antes, depois] of REESCRITAS_BOAS) if (M.reescritaSemRecusa(antes, depois) !== depois) falhas.push('reescritor: reescrita legítima perdida: ' + n)
  }
  if (!/could not turn this idea into a script \(the AI declined the topic\)/.test(M.MODEL_REFUSAL_MESSAGE ?? '')) falhas.push('a frase da recusa mudou (lib/recusaBotao.ts a reconhece)')
  return falhas
}

// ═══ fiação ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
const CAMINHOS = {
  'app/api/generate-video-cinematic/route.ts': (s) => {
    const f = []
    if (!s.includes("import { looksLikeModelRefusal, algumaRecusaDoModelo, recusaNaFalaDePersonagem, reescritaSemRecusa, MODEL_REFUSAL_MESSAGE } from '@/lib/modelRefusal'")) f.push('cinematic: import')
    const guarda = s.indexOf('    if (!verbatimDoCliente2011 && looksLikeModelRefusal(body.prompt)) {')
    const leitura = s.indexOf('const promptRaw = (body.prompt ?? \'\').trim()')
    const cobranca = s.indexOf('await debitVideoCredits(supabase, {')
    if (guarda < 0 || leitura < 0 || !(guarda < leitura) || !(guarda < cobranca)) f.push('cinematic: a guarda do prompt não vem antes da leitura do pedido e da cobrança')
    if (!s.includes("if (!usarIdeia2011 || !ideiaDoCliente2011) return NextResponse.json({ error: MODEL_REFUSAL_MESSAGE, reason: 'model_refused_topic', code: 'model_refused_topic', charged: false, retryable: false }, { status: 422 })")) f.push('cinematic: sem ideia, 422 sem cobrança')
    if (!s.includes('body.prompt = ideiaDoCliente2011')) f.push('cinematic: com a ideia do cliente, o filme nasce da ideia')
    if (!s.includes("const verbatimDoCliente2011 = typeof body.script_mode === 'string' && body.script_mode.toLowerCase() === 'verbatim'")) f.push('cinematic: verbatim é texto do cliente e passa sem a guarda (VOLTA 3)')
    const helper = s.indexOf('const recusaDoEscritorDeCenas2011 = async')
    if (helper < 0 || !/if \(!algumaRecusaDoModelo\(falas\)\) return null\n\s+const refunded = await confirmCinematicRefund\(\)\n\s+const released = refunded && await releaseBirthClaim\('model_refused_topic'\)/.test(s)) f.push('cinematic: a recusa nas cenas não passa pelo estorno de sempre')
    const usos = s.split('await recusaDoEscritorDeCenas2011(').length - 1
    if (usos !== 3) f.push(`cinematic: as 2 saídas do generateScenes e o plano hollywood chamam a guarda (achei ${usos})`)
    const ultimoReplano = s.lastIndexOf('const replanned = await planHollywoodScenes(')
    const uh = s.indexOf("await recusaDoEscritorDeCenas2011(plan.scenes.flatMap((sc) => [verbatimDoCliente2011 ? null : sc.voiceover, sc.dialogueLine ? sc.prompt.split(sc.dialogueLine).join(' ') : sc.prompt, recusaNaFalaDePersonagem(sc.dialogueLine) ? sc.dialogueLine : null]), 'planejador')")
    if (s.split('await reescritaComGuarda2011(expandVoiceoversToTargets, ').length - 1 !== 2 || s.includes('await expandVoiceoversToTargets(')) f.push('cinematic: as 2 chamadas do expandVoiceoversToTargets passam pela guarda')
    if (s.split('await reescritaComGuarda2011(appendNarrationToTargets, ').length - 1 !== 4 || s.includes('await appendNarrationToTargets(')) f.push('cinematic: as 4 chamadas do appendNarrationToTargets passam pela guarda')
    if (s.split('alinhamentoSemRecusa2011(await alignShotsToSpeech(').length - 1 !== 3 || /(?<!alinhamentoSemRecusa2011\()await alignShotsToSpeech\(/.test(s)) f.push('cinematic: as 3 chamadas do alignShotsToSpeech passam pela guarda')
    if (!s.includes("(await reescrever(itens, ...resto)).map((nova, k) => { const fica = reescritaSemRecusa(itens[k]?.text ?? '', nova); if (!fica && typeof nova === 'string' && nova.trim()) registrarRecusa2011('reescritor_fala', nova, false); return fica })") || !s.includes("rewritten: alinhado.rewritten.filter((c) => { const fica = reescritaSemRecusa('', c.shot) !== ''; if (!fica) registrarRecusa2011('reescritor_plano', c.shot, false); return fica })")) f.push('cinematic: a guarda dos reescritores fica com o texto de antes e registra')
    const contrato = s.indexOf('// ═══ KINEO-CONTRATO-2026-08-18 — Cláusulas 1+2')
    if (!(ultimoReplano > 0 && uh > ultimoReplano && contrato > uh)) f.push('cinematic: guarda do planejador hollywood depois do último replano e antes do contrato/despacho')
    const g1 = s.indexOf('const generated = await generateScenes(')
    const u1 = s.indexOf('await recusaDoEscritorDeCenas2011(scenes.map((s) => s.voiceover))')
    if (!(g1 > 0 && u1 > g1 && u1 - g1 < 1200)) f.push('cinematic: guarda logo depois do 1º generateScenes')
    const g2 = s.indexOf('const generated = await generateScenes(', g1 + 10)
    const u2 = s.indexOf('await recusaDoEscritorDeCenas2011(recuperadas.map((s) => s.voiceover))')
    if (!(g2 > 0 && u2 > g2 && u2 - g2 < 1200)) f.push('cinematic: guarda logo depois do 2º generateScenes')
    if (!s.includes("descriptions: cobertura.descriptions.map((d, i) => (d && looksLikeModelRefusal(d) ? (registrarRecusa2011('descritor', d, false), null) : d ?? null) ?? scenes[i].aiPrompt ?? null)")) f.push('cinematic: descrição que é recusa vira "sem descrição" e registra')
    return f
  },
  'app/api/generate-script/route.ts': (s) => {
    const f = []
    if (!s.includes("import { looksLikeModelRefusal, MODEL_REFUSAL_MESSAGE } from '@/lib/modelRefusal'")) f.push('escritor: import')
    for (const l of ['if (looksLikeModelRefusal(script)) {', 'if (roteiroDeNovo && !looksLikeModelRefusal(roteiroDeNovo)) historiaAceita = roteiroDeNovo', 'if (texto && !looksLikeModelRefusal(texto)) historiaAceita = texto', 'if (textoDaApara && !looksLikeModelRefusal(textoDaApara)) {']) if (!s.includes(l)) f.push('escritor: ' + l)
    return f
  },
  'lib/requestFidelity.ts': (s) => (!s.includes('looksLikeModelRefusal') ? [] : ['pedido fiel: o texto verbatim do cliente volta a passar pela guarda de recusa']),
  'lib/meta95/ideiaNoEscritor.ts': (s) => (s.includes("if (looksLikeModelRefusal(parsed.narration)) return nao('recusa_do_modelo')") ? [] : ['ideia no servidor: recusa_do_modelo']),
  'app/api/expand-script/route.ts': (s) => (s.includes('if (!expandido || looksLikeModelRefusal(expandido)) {') ? [] : ['expandir: a recusa substitui o roteiro']),
  'app/api/apply-suggestion/route.ts': (s) => (s.includes('if (!improved || looksLikeModelRefusal(improved)) {') ? [] : ['sugestão: a recusa substitui o roteiro']),
  'app/api/regenerate-scene/route.ts': (s) => (s.includes('newBrollPrompt = gptBrollPrompt.length > 20 && !looksLikeModelRefusal(gptBrollPrompt) ? gptBrollPrompt : builtFallback.brollPrompt') ? [] : ['refazer cena: a recusa vai ao motor como prompt']),
  'app/api/ad-script/route.ts': (s) => (s.includes('if (!script || looksLikeModelRefusal(script)) {') ? [] : ['anúncio (avatar): a recusa vira roteiro']),
  'app/api/ads/script/route.ts': (s) => (s.includes("const semRecusa2011 = (v: ReturnType<typeof parseAdsScriptOutput>) => { const recusa = v?.find((x) => looksLikeModelRefusal(x.script)); if (!recusa) return v; registrarRecusaDoModelo(writeServerEvent, { guarda: 'anuncio_studio', rota: '/api/ads/script', texto: recusa.script, refunded: null, userId: user.id }); return null }") && s.split('semRecusa2011(parseAdsScriptOutput(raw, model, brief.value))').length === 3 ? [] : ['anúncio (Studio Ads): versão que é recusa passa ou não registra']),
  'app/api/kids-cartoon/story/route.ts': (s) => (s.includes("if (looksLikeModelRefusal(texto)) { registrarRecusaDoModelo(writeServerEvent, { guarda: 'desenho', rota: '/api/kids-cartoon/story', texto: texto, refunded: null, userId: user.id }); texto = '' }") ? [] : ['desenho: a recusa vira história ou não registra']),
  'app/api/baby-podcast/prepare/route.ts': (s) => (s.includes("if (looksLikeModelRefusal(texto)) { registrarRecusaDoModelo(writeServerEvent, { guarda: 'podcast_bebe', rota: '/api/baby-podcast/prepare', texto: texto, refunded: null, userId: user.id }); texto = '' }") ? [] : ['podcast do bebê: a recusa vira roteiro ou não registra']),
  'app/api/demo-script/route.ts': (s) => (/if \(script && looksLikeModelRefusal\(script\)\) return NextResponse\.json\(\{ script: mode === 'comment' \? fallbackCommentScript\(topic\) : mode === 'product' \? fallbackProductScript\(topic\) : fallbackDemoScript\(topic\), fallback: true \}\)[^\n]*\n\s+if \(script\) return NextResponse\.json\(\{ script \}\)/.test(s) ? [] : ['demo: a recusa vira a demo']),
  'app/api/retry-hollywood-scene/route.ts': (s) => (s.includes('return out.length >= 20 && out.length <= Math.min(prompt.length * 1.5, 6000) && !looksLikeModelRefusal(out) ? out : prompt') ? [] : ['retentar cena: a recusa do reescritor vai ao motor']),
}
const IMPORT_SIMPLES = "import { looksLikeModelRefusal, registrarRecusaDoModelo } from '@/lib/modelRefusal'" // VOLTA 4: + o registro
// VOLTA 4 (b): cada guarda grava model_refusal_blocked
const REGISTROS = {
  'app/api/generate-video-cinematic/route.ts': ["registrarRecusa2011('entrada', body.prompt, false,", "registrarRecusa2011(guarda, falas.find(", "registrarRecusa2011('descritor', d, false)", "registrarRecusa2011('reescritor_fala', nova, false)", "registrarRecusa2011('reescritor_plano', c.shot, false)", "'planejador')", "try { void writeServerEvent({ name: 'model_refusal_blocked', userId: user.id, path: '/api/generate-video-cinematic', metadata: { version: 'recusa_ia_2011', guarda, rota: '/api/generate-video-cinematic', head: String(texto ?? '').slice(0, 120), refunded,"],
  'app/api/expand-script/route.ts': ["guarda: 'expandir', rota: '/api/expand-script', texto: expandido"],
  'app/api/apply-suggestion/route.ts': ["guarda: 'sugestao', rota: '/api/apply-suggestion', texto: improved"],
  'app/api/ad-script/route.ts': ["guarda: 'anuncio_avatar', rota: '/api/ad-script', texto: script"],
  'app/api/regenerate-scene/route.ts': ["guarda: 'refazer_cena', rota: '/api/regenerate-scene', texto: gptBrollPrompt"],
  'app/api/demo-script/route.ts': ["guarda: 'demo', rota: '/api/demo-script', texto: script"],
  'app/api/ads/script/route.ts': ["guarda: 'anuncio_studio', rota: '/api/ads/script', texto: recusa.script"],
  'app/api/kids-cartoon/story/route.ts': ["guarda: 'desenho', rota: '/api/kids-cartoon/story'"],
  'app/api/baby-podcast/prepare/route.ts': ["guarda: 'podcast_bebe', rota: '/api/baby-podcast/prepare'"],
  'app/api/retry-hollywood-scene/route.ts': ["guarda: 'retentar_cena', rota: '/api/retry-hollywood-scene', texto: out"],
  // o escritor já registrava antes desta entrega (recusar → generation_stage_error com reason model_refused_topic e o começo do texto)
  'app/api/generate-script/route.ts': ["return await recusar(422, { error: MODEL_REFUSAL_MESSAGE, reason: 'model_refused_topic', retryable: false }, user.id, { reason: 'model_refused_topic', head: script.slice(0, 120) })"],
}
const COM_IMPORT_SIMPLES = ['app/api/retry-hollywood-scene/route.ts', 'app/api/expand-script/route.ts', 'app/api/apply-suggestion/route.ts', 'app/api/regenerate-scene/route.ts', 'app/api/ad-script/route.ts', 'app/api/ads/script/route.ts', 'app/api/kids-cartoon/story/route.ts', 'app/api/baby-podcast/prepare/route.ts', 'app/api/demo-script/route.ts']
function checarFiacao(fontes) {
  const f = []
  for (const [arq, ch] of Object.entries(CAMINHOS)) f.push(...ch(fontes[arq]))
  for (const arq of COM_IMPORT_SIMPLES) if (!fontes[arq].includes(IMPORT_SIMPLES)) f.push('import ausente em ' + arq)
  for (const [arq, trechos] of Object.entries(REGISTROS)) for (const t of trechos) if (!fontes[arq].includes(t)) f.push('registro da guarda ausente em ' + arq + ': ' + t.slice(0, 60))
  return f
}

// ═══ execução ═════════════════════════════════════════════════════════════════════════════════════════════════════════
let ok = 0
const falhas = []
const checa = (n, lista) => { if (lista.length === 0) { ok++; console.log('  ✓ ' + n) } else { falhas.push(n); console.log('  ✗ ' + n); for (const x of lista) console.log('      - ' + x) } }

const SRC = lf('lib/modelRefusal.ts')
const M = carregar(SRC)
console.log('== (1)(2) o detector ==')
checa(`${POSITIVOS.length + REVISOR_REC.length + PISO_JA_BARRAVA.length} recusas pegas (${REVISOR_REC.length} da revisão), ${NEGATIVOS.length + REVISOR_LEGIT.length} textos legítimos livres (${REVISOR_LEGIT.length} da revisão), PISO da régua de antes sem furo (exceções nomeadas: ${EXCECOES_DO_PISO.length})`, checarDetector(M))

console.log('== (3) a régua de antes não pegava o caso ==')
let antes = null
try { antes = execFileSync('git', ['show', 'origin/main:lib/modelRefusal.ts'], { encoding: 'utf8' }).replace(/\r\n/g, '\n') } catch { antes = null }
if (antes && antes !== SRC) {
  const A = carregar(antes)
  checa('origin/main deixava passar "I\'m sorry, I can\'t assist with that." e o russo', A.looksLikeModelRefusal(REAL_EN) === false && A.looksLikeModelRefusal(REAL_RU) === false ? [] : ['a régua antiga já pegava? então o defeito é outro'])
} else console.log('  · origin/main já tem esta régua (depois de publicado): pulado')

console.log('== (4) a fiação ==')
const fontes = Object.fromEntries([...Object.keys(CAMINHOS), ...COM_IMPORT_SIMPLES].map((a) => [a, lf(a)]))
checa(`${Object.keys(CAMINHOS).length} caminhos chamam o detector no lugar certo`, checarFiacao(fontes))

console.log('== (5) VOLTA 3: o verbatim do cliente passa como veio (sem 422 da guarda de recusa) ==')
{
  const path = await import('node:path')
  const carregarComRelativos = (arquivo, fonteDe = (f) => fs.readFileSync(f, 'utf8')) => {
    const cache = new Map()
    const load = (f) => { if (cache.has(f)) return cache.get(f).exports; const mod = { exports: {} }; cache.set(f, mod); const js = ts.transpileModule(fonteDe(f), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText; vm.runInNewContext(js, { module: mod, exports: mod.exports, require: (n) => load(path.resolve(path.dirname(f), n + '.ts')) }); return mod.exports }
    return load(path.resolve(arquivo))
  }
  const verbatimPassa = (RF) => ["I'm sorry, I can't assist with that.", "NARRATION: I'm sorry, I can't assist with that.", "I'm sorry, but I can't help with that request."].filter((t) => RF.reviewRequestFidelity({ prompt: t, scriptMode: 'verbatim', duration: 35 }) !== null)
  const RF = carregarComRelativos('lib/requestFidelity.ts')
  checa('reviewRequestFidelity em verbatim: "I\'m sorry…" (com e sem NARRATION:) passa sem revisão nem 422', verbatimPassa(RF))
  const comGuarda = carregarComRelativos('lib/requestFidelity.ts', (f) => (f.endsWith('requestFidelity.ts') ? "import { looksLikeModelRefusal } from './modelRefusal'\n" + fs.readFileSync(f, 'utf8').replace('  const opening = text.replace(', '  if (looksLikeModelRefusal(text)) return true\n  const opening = text.replace(') : fs.readFileSync(f, 'utf8')))
  checa('mutante: o pedido fiel com a guarda de recusa no verbatim reprova', verbatimPassa(comGuarda).length > 0 ? [] : ['o mutante passou'])
}

console.log('== (6) VOLTA 4 (a): planejador hollywood — em verbatim a fala do CLIENTE passa; fora dele a recusa do modelo é barrada ==')
const julgarPlanejador = (fonteDaRota, MR, verbatimDoCliente2011, cenas) => {
  const m = fonteDaRota.match(/await recusaDoEscritorDeCenas2011\((plan\.scenes\.flatMap\(\(sc\) => \[[^\n]*?\]\)), 'planejador'\)/)
  if (!m) return null
  const itens = new Function('plan', 'verbatimDoCliente2011', 'recusaNaFalaDePersonagem', 'return ' + m[1])({ scenes: cenas }, verbatimDoCliente2011, MR.recusaNaFalaDePersonagem)
  return MR.algumaRecusaDoModelo(itens) // true = estorno + 422
}
const PLANEJADOR_CASOS = (rota) => {
  const f = []
  const cena = (voiceover) => [{ voiceover, prompt: 'Medium shot of a tired man at a rainy door at night, cinematic light.', dialogueLine: undefined }]
  const V1 = "NARRATION: I'm sorry, I can't assist with that.", V2 = "I can't do that. Not for money, not for anyone."
  if (julgarPlanejador(rota, M, true, cena(V1)) !== false) f.push('verbatim: "NARRATION: I\'m sorry…" do cliente deu estorno/422')
  if (julgarPlanejador(rota, M, true, cena(V2)) !== false) f.push('verbatim: "I can\'t do that. Not for money…" do cliente deu estorno/422')
  if (julgarPlanejador(rota, M, false, cena("I'm sorry, but I can't assist with that request.")) !== true) f.push('fora do verbatim: a fala de recusa do modelo passou')
  if (julgarPlanejador(rota, M, true, [{ voiceover: V2, prompt: "I'm sorry, but I can't assist with that request.", dialogueLine: undefined }]) !== true) f.push('verbatim: o PROMPT que é recusa do modelo passou (só a fala sai do julgamento)')
  return f
}
checa('verbatim: as 2 entradas do cliente passam sem 422 nem estorno; fora do verbatim e no prompt, a recusa do modelo é barrada', PLANEJADOR_CASOS(lf('app/api/generate-video-cinematic/route.ts')))
{
  const ev = []
  M.registrarRecusaDoModelo(async (e) => { ev.push(e) }, { guarda: 'teste', rota: '/api/x', texto: 'x'.repeat(300), refunded: true, userId: 'u' })
  let quebrou = false
  try { M.registrarRecusaDoModelo(() => { throw new Error('banco fora') }, { guarda: 'teste', rota: '/api/x', texto: 'a', refunded: null }); M.registrarRecusaDoModelo(async () => { throw new Error('banco fora') }, { guarda: 'teste', rota: '/api/x', texto: 'a', refunded: null }) } catch { quebrou = true }
  await new Promise((r) => setTimeout(r, 0))
  const e = ev[0]
  checa('(b) o evento model_refusal_blocked leva guarda, rota, 120 caracteres e o estorno; gravar com erro nunca quebra', e && e.name === 'model_refusal_blocked' && e.path === '/api/x' && e.metadata.guarda === 'teste' && e.metadata.rota === '/api/x' && e.metadata.head.length === 120 && e.metadata.refunded === true && !quebrou ? [] : ['evento ou rede de erro errados'])
}

console.log('== mutantes (cada um TEM de reprovar) ==')
const mutantes = []
const mutDetector = (nome, de, para) => { if (!SRC.includes(de)) { mutantes.push([nome, false, 'trecho do mutante não achado']); return } let m; try { m = carregar(SRC.replace(de, para)) } catch { mutantes.push([nome, true]); return } mutantes.push([nome, checarDetector(m).length > 0]) }
mutDetector('detector desligado', "  const t = semEmbrulho(raw)\n  if (!t) return false", "  const t = semEmbrulho(raw)\n  if (t || !t) return false")
mutDetector('sem a guarda de fala (aspas, "disse", vocativo, atribuição)', '  return ASPA_DE_ABERTURA.test(frase) || ETIQUETA_DE_FALA.test(frase) || VOCATIVO_NO_FIM.test(frase) || (!!seguinte && ATRIBUICAO_NA_SEGUINTE.test(seguinte))', '  return false')
mutDetector('sem a atribuição na frase seguinte ("Those were the last words…")', ' || (!!seguinte && ATRIBUICAO_NA_SEGUINTE.test(seguinte))', '')
mutDetector('travessão/vírgula não contam como etiqueta de fala', String.raw`(?:["”»'’」』]\s*,?|\s[—–]|,)\s*(?:\S+\s+){0,3}?${'$'}{VERBO_DE_FALA}`, String.raw`(?:["”»'’」』]\s*,?)\s*(?:\S+\s+){0,3}?${'$'}{VERBO_DE_FALA}`)
mutDetector('a régua nova volta a exigir "but"', String.raw`(?:but\s*,?\s*)?(?:I|we)`, String.raw`but\s*,?\s*(?:I|we)`)
mutDetector('sem o russo', '^(?:Извините|Простите|', '^(?:XИзвините|Простите|')
mutDetector('recusa em qualquer lugar do texto (sem a regra do começo)', '  if (!fs.length || !fraseDeRecusa(fs[0], fs[1])) return false', '  if (!fs.length || !fs.some((f, i) => fraseDeRecusa(f, fs[i + 1]))) return false')
mutDetector('sem o teto de 60 palavras', '  if (total <= 60) return true', '  if (total <= 0) return true')
mutDetector('sem o PISO (a régua de antes)', '  if (pegaPelaReguaDeAntes(t)) return true\n', '')
mutDetector('PISO sem a exceção do "As an AI" de narrador', '&& narradorIA(f.slice(Math.max(0, f.search(/as an AI/i))))) continue', '&& false) continue')
mutDetector('V3(1) a exceção do narrador vale para qualquer verbo', 'ABRE_COMO_IA.test(f) && SENTIMENTO_DA_IA.test(f)', 'ABRE_COMO_IA.test(f)')
mutDetector('V3(1) sem a exceção do narrador', '  if (!f || falaDePersonagem(f, seguinte) || narradorIA(f)) return false', '  if (!f || falaDePersonagem(f, seguinte)) return false')
mutDetector('V3(2) sem o "won\'t"', "won['’]?t be able to|will not be able to|won['’]?t|will not|", "won['’]?t be able to|will not be able to|")
mutDetector('V3(2) sem tirar a saudação', "  t = t.replace(/^(?:Hi|Hello|Hey|", "  t = t.replace(/^x(?:Hi|Hello|Hey|")
mutDetector('V3(3) a dialogueLine usa a régua inteira', '  return !!t && looksLikeModelRefusal(t) && ASSUNTO_DE_ASSISTENTE.test(t)', '  return !!t && looksLikeModelRefusal(t)')
mutDetector('V3(5) a recusa anexada passa (só o texto inteiro)', "  if (resto && looksLikeModelRefusal(resto)) return ''\n  const fs = frases(semEmbrulho(depois)), ja = String(antes ?? '')\n  for (let i = 0; i < fs.length; i++) if (!ja.includes(fs[i]) && fraseDeRecusa(fs[i], fs[i + 1])) return ''\n", '')
mutDetector('V3(5) o reescritor devolve a recusa', "  if (typeof depois !== 'string') return ''\n  if (looksLikeModelRefusal(depois)) return ''", "  if (typeof depois !== 'string') return ''\n  return depois")
mutDetector('sem a recusa disfarçada', '  if (DISFARCE_NA_FRASE.test(fs[0]) || (fs[1] && DISFARCE_NA_SEGUINTE.test(fs[1]))) return true\n', '')
mutDetector('sem a explicação do modelo na régua da metade', ' || EXPLICACAO_DO_MODELO.test(fs[i])) doModelo', ') doModelo')
mutDetector('sem o JSON', '  if (doJson) return doJson.some((s) => looksLikeModelRefusal(s))\n', '')
mutDetector('sem os rótulos na frente (Scene 1:, Note:)', String.raw`|NOTE|NOTA|RESPONSE|ANSWER|(?:SCENE|CENA|ESCENA|SZENE|СЦЕНА)\s*\d{0,2})`, ')')
mutDetector('sem tirar o "Here is your script:" da frente', String.raw`      .replace(/^(?:Sure[!,.]?\s*)?(?:Here(?:['’]s| is)|Below is)`, String.raw`      .replace(/^x(?:Sure[!,.]?\s*)?(?:Here(?:['’]s| is)|Below is)`)
mutDetector('sem tirar o emoji', String.raw`  t = t.replace(/\p{Extended_Pictographic}️?/gu, ' ')`, '  t = t')
mutDetector('"do" volta a não ser verbo de assistente', '|engage|continue|do)', '|engage|continue)')
const mutFio = (nome, arq, de, para) => { if (!fontes[arq].includes(de)) { mutantes.push([nome, false, 'trecho do mutante não achado']); return } mutantes.push([nome, checarFiacao({ ...fontes, [arq]: fontes[arq].replace(de, para) }).length > 0]) }
const CIN = 'app/api/generate-video-cinematic/route.ts'
mutFio('cinematic sem a guarda do prompt', CIN, '    if (!verbatimDoCliente2011 && looksLikeModelRefusal(body.prompt)) {', '    if (false) {')
mutFio('V3(4) o verbatim do cliente volta à guarda (422)', CIN, '    if (!verbatimDoCliente2011 && looksLikeModelRefusal(body.prompt)) {', '    if (looksLikeModelRefusal(body.prompt)) {')
mutFio('V3(4) o pedido fiel volta a barrar o verbatim que soa a recusa', 'lib/requestFidelity.ts', '  const opening = text.replace(', '  if (looksLikeModelRefusal(text)) return true\n  const opening = text.replace(')
mutFio('V3(3) a dialogueLine com a régua inteira', CIN, 'recusaNaFalaDePersonagem(sc.dialogueLine) ? sc.dialogueLine : null', 'sc.dialogueLine')
mutFio('V3(5) um appendNarrationToTargets sem guarda', CIN, 'await reescritaComGuarda2011(appendNarrationToTargets, ', 'await appendNarrationToTargets(')
mutFio('V3(5) um expandVoiceoversToTargets sem guarda', CIN, 'await reescritaComGuarda2011(expandVoiceoversToTargets, ', 'await expandVoiceoversToTargets(')
mutFio('V3(5) um alignShotsToSpeech sem guarda', CIN, 'alinhamentoSemRecusa2011(await alignShotsToSpeech(', '(await alignShotsToSpeech(')

mutFio('cinematic sem a guarda do 1º generateScenes', CIN, 'await recusaDoEscritorDeCenas2011(scenes.map((s) => s.voiceover))', 'null')
mutFio('cinematic sem a guarda do 2º generateScenes', CIN, 'await recusaDoEscritorDeCenas2011(recuperadas.map((s) => s.voiceover))', 'null')
mutFio('cinematic sem estorno na recusa das cenas', CIN, "const released = refunded && await releaseBirthClaim('model_refused_topic')", 'const released = true')
mutFio('cinematic leva a descrição-recusa ao motor', CIN, "(d && looksLikeModelRefusal(d) ? (registrarRecusa2011('descritor', d, false), null) : d ?? null) ?? scenes[i].aiPrompt", 'd ?? scenes[i].aiPrompt')
mutFio('escritor aceita a recusa na 2ª tentativa', 'app/api/generate-script/route.ts', 'if (roteiroDeNovo && !looksLikeModelRefusal(roteiroDeNovo)) historiaAceita = roteiroDeNovo', 'if (roteiroDeNovo) historiaAceita = roteiroDeNovo')
mutFio('expandir sem a guarda', 'app/api/expand-script/route.ts', 'if (!expandido || looksLikeModelRefusal(expandido)) {', 'if (!expandido) {')
mutFio('sugestão sem a guarda', 'app/api/apply-suggestion/route.ts', 'if (!improved || looksLikeModelRefusal(improved)) {', 'if (!improved) {')
mutFio('refazer cena sem a guarda', 'app/api/regenerate-scene/route.ts', ' && !looksLikeModelRefusal(gptBrollPrompt)', '')
mutFio('anúncio (avatar) sem a guarda', 'app/api/ad-script/route.ts', 'if (!script || looksLikeModelRefusal(script)) {', 'if (!script) {')
mutFio('Studio Ads sem a guarda na correção', 'app/api/ads/script/route.ts', '      versions = semRecusa2011(parseAdsScriptOutput(raw, model, brief.value))', '      versions = parseAdsScriptOutput(raw, model, brief.value)')
mutFio('desenho sem a guarda', 'app/api/kids-cartoon/story/route.ts', "if (looksLikeModelRefusal(texto)) { registrarRecusaDoModelo(writeServerEvent, { guarda: 'desenho', rota: '/api/kids-cartoon/story', texto: texto, refunded: null, userId: user.id }); texto = '' }", '')
mutFio('podcast do bebê sem a guarda', 'app/api/baby-podcast/prepare/route.ts', "if (looksLikeModelRefusal(texto)) { registrarRecusaDoModelo(writeServerEvent, { guarda: 'podcast_bebe', rota: '/api/baby-podcast/prepare', texto: texto, refunded: null, userId: user.id }); texto = '' }", '')
mutFio('demo sem a guarda', 'app/api/demo-script/route.ts', 'if (script && looksLikeModelRefusal(script)) return', 'if (false) return')
mutFio('cinematic sem a guarda do planejador hollywood', CIN, "await recusaDoEscritorDeCenas2011(plan.scenes.flatMap((sc) => [verbatimDoCliente2011 ? null : sc.voiceover, sc.dialogueLine ? ", "null && (plan.scenes.flatMap((sc) => [verbatimDoCliente2011 ? null : sc.voiceover, sc.dialogueLine ? ")
{ // V4(a): o mutante tem de reprovar na PROVA EXECUTADA
  const mutada = lf(CIN).replace('[verbatimDoCliente2011 ? null : sc.voiceover, sc.dialogueLine ?', '[sc.voiceover, sc.dialogueLine ?')
  mutantes.push(['V4(a) em verbatim a fala do cliente volta a ser julgada (estorno e 422)', mutada !== lf(CIN) && PLANEJADOR_CASOS(mutada).length > 0])
}
mutFio('V4(b) o descritor não registra', CIN, "(registrarRecusa2011('descritor', d, false), null)", 'null')
mutFio('V4(b) o reescritor de fala não registra', CIN, "registrarRecusa2011('reescritor_fala', nova, false); ", '')
mutFio('V4(b) a sugestão não registra', 'app/api/apply-suggestion/route.ts', "guarda: 'sugestao', rota: '/api/apply-suggestion', texto: improved", "guarda: 'x', rota: '', texto: ''")
mutFio('V4(b) o retry de cena não registra', 'app/api/retry-hollywood-scene/route.ts', "guarda: 'retentar_cena', rota: '/api/retry-hollywood-scene', texto: out", "guarda: 'x', rota: '', texto: ''")
{ // V4(b): o registro sem a rede de erro tem de reprovar
  const ancora = '  } catch { /* nunca quebra o fluxo */ }'
  let quebra = false
  if (SRC.split(ancora).length === 2) { const mm = carregar(SRC.replace(ancora, '  } catch (e) { throw e }')); try { mm.registrarRecusaDoModelo(() => { throw new Error('banco fora') }, { guarda: 't', rota: '/x', texto: 'a', refunded: null }) } catch { quebra = true } }
  mutantes.push(['V4(b) gravar com erro quebra o fluxo', quebra])
}
mutFio('retentar cena sem a guarda', 'app/api/retry-hollywood-scene/route.ts', ' && !looksLikeModelRefusal(out) ? out : prompt', ' ? out : prompt')
for (const [nome, reprovou, nota] of mutantes) { if (reprovou) { ok++; console.log('  ✓ mutante reprova: ' + nome) } else { falhas.push('mutante passou: ' + nome); console.log('  ✗ mutante PASSOU: ' + nome + (nota ? ` (${nota})` : '')) } }

console.log(`\n${ok} ok · ${falhas.length} falhas`)
process.exit(falhas.length ? 1 : 0)
