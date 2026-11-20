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
// Item 7 registrado: "NARRATION: I'm sorry, I can't assist with that." em "Use my script as is" agora vai à revisão (422, nada
// cobrado); o b6e1ad293 deixava texto rotulado passar — barrar é o lado seguro.
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
  ["NARRATION: (item 7: em 'Use my script as is' vai à revisão, 422 sem cobrança — o b6e1ad293 deixava rotulado passar)", "NARRATION: I'm sorry, I can't assist with that."],
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
const EXCECOES_DO_PISO = ['desculpe nao posso historia', 'lo siento historia', 'As an AI narrador', 'recusa no meio de um texto, sem aspas']

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
  if (!/could not turn this idea into a script \(the AI declined the topic\)/.test(M.MODEL_REFUSAL_MESSAGE ?? '')) falhas.push('a frase da recusa mudou (lib/recusaBotao.ts a reconhece)')
  return falhas
}

// ═══ fiação ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
const CAMINHOS = {
  'app/api/generate-video-cinematic/route.ts': (s) => {
    const f = []
    if (!s.includes("import { looksLikeModelRefusal, algumaRecusaDoModelo, MODEL_REFUSAL_MESSAGE } from '@/lib/modelRefusal'")) f.push('cinematic: import')
    const guarda = s.indexOf('    if (looksLikeModelRefusal(body.prompt)) {')
    const leitura = s.indexOf('const promptRaw = (body.prompt ?? \'\').trim()')
    const cobranca = s.indexOf('await debitVideoCredits(supabase, {')
    if (guarda < 0 || leitura < 0 || !(guarda < leitura) || !(guarda < cobranca)) f.push('cinematic: a guarda do prompt não vem antes da leitura do pedido e da cobrança')
    if (!s.includes("if (!usarIdeia2011 || !ideiaDoCliente2011) return NextResponse.json({ error: MODEL_REFUSAL_MESSAGE, reason: 'model_refused_topic', code: 'model_refused_topic', charged: false, retryable: false }, { status: 422 })")) f.push('cinematic: sem ideia, 422 sem cobrança')
    if (!s.includes('body.prompt = ideiaDoCliente2011')) f.push('cinematic: com a ideia do cliente, o filme nasce da ideia')
    if (!/const usarIdeia2011 = !!ideiaDoCliente2011 && !\(typeof body\.script_mode === 'string' && body\.script_mode\.toLowerCase\(\) === 'verbatim'\)/.test(s)) f.push('cinematic: "Use my script as is" nunca narra a ideia')
    const helper = s.indexOf('const recusaDoEscritorDeCenas2011 = async')
    if (helper < 0 || !/if \(!algumaRecusaDoModelo\(falas\)\) return null\n\s+const refunded = await confirmCinematicRefund\(\)\n\s+const released = refunded && await releaseBirthClaim\('model_refused_topic'\)/.test(s)) f.push('cinematic: a recusa nas cenas não passa pelo estorno de sempre')
    const usos = s.split('await recusaDoEscritorDeCenas2011(').length - 1
    if (usos !== 3) f.push(`cinematic: as 2 saídas do generateScenes e o plano hollywood chamam a guarda (achei ${usos})`)
    const ultimoReplano = s.lastIndexOf('const replanned = await planHollywoodScenes(')
    const uh = s.indexOf('await recusaDoEscritorDeCenas2011(plan.scenes.flatMap((sc) => [sc.voiceover, sc.dialogueLine, sc.prompt]))')
    const contrato = s.indexOf('// ═══ KINEO-CONTRATO-2026-08-18 — Cláusulas 1+2')
    if (!(ultimoReplano > 0 && uh > ultimoReplano && contrato > uh)) f.push('cinematic: guarda do planejador hollywood depois do último replano e antes do contrato/despacho')
    const g1 = s.indexOf('const generated = await generateScenes(')
    const u1 = s.indexOf('await recusaDoEscritorDeCenas2011(scenes.map((s) => s.voiceover))')
    if (!(g1 > 0 && u1 > g1 && u1 - g1 < 1200)) f.push('cinematic: guarda logo depois do 1º generateScenes')
    const g2 = s.indexOf('const generated = await generateScenes(', g1 + 10)
    const u2 = s.indexOf('await recusaDoEscritorDeCenas2011(recuperadas.map((s) => s.voiceover))')
    if (!(g2 > 0 && u2 > g2 && u2 - g2 < 1200)) f.push('cinematic: guarda logo depois do 2º generateScenes')
    if (!s.includes('descriptions: cobertura.descriptions.map((d, i) => (d && !looksLikeModelRefusal(d) ? d : null) ?? scenes[i].aiPrompt ?? null)')) f.push('cinematic: descrição que é recusa vira "sem descrição"')
    return f
  },
  'app/api/generate-script/route.ts': (s) => {
    const f = []
    if (!s.includes("import { looksLikeModelRefusal, MODEL_REFUSAL_MESSAGE } from '@/lib/modelRefusal'")) f.push('escritor: import')
    for (const l of ['if (looksLikeModelRefusal(script)) {', 'if (roteiroDeNovo && !looksLikeModelRefusal(roteiroDeNovo)) historiaAceita = roteiroDeNovo', 'if (texto && !looksLikeModelRefusal(texto)) historiaAceita = texto', 'if (textoDaApara && !looksLikeModelRefusal(textoDaApara)) {']) if (!s.includes(l)) f.push('escritor: ' + l)
    return f
  },
  'lib/meta95/ideiaNoEscritor.ts': (s) => (s.includes("if (looksLikeModelRefusal(parsed.narration)) return nao('recusa_do_modelo')") ? [] : ['ideia no servidor: recusa_do_modelo']),
  'app/api/expand-script/route.ts': (s) => (s.includes('if (!expandido || looksLikeModelRefusal(expandido)) {') ? [] : ['expandir: a recusa substitui o roteiro']),
  'app/api/apply-suggestion/route.ts': (s) => (s.includes('if (!improved || looksLikeModelRefusal(improved)) {') ? [] : ['sugestão: a recusa substitui o roteiro']),
  'app/api/regenerate-scene/route.ts': (s) => (s.includes('newBrollPrompt = gptBrollPrompt.length > 20 && !looksLikeModelRefusal(gptBrollPrompt) ? gptBrollPrompt : builtFallback.brollPrompt') ? [] : ['refazer cena: a recusa vai ao motor como prompt']),
  'app/api/ad-script/route.ts': (s) => (s.includes('if (!script || looksLikeModelRefusal(script)) {') ? [] : ['anúncio (avatar): a recusa vira roteiro']),
  'app/api/ads/script/route.ts': (s) => (s.includes('const semRecusa2011 = (v: ReturnType<typeof parseAdsScriptOutput>) => (v && v.some((x) => looksLikeModelRefusal(x.script)) ? null : v)') && s.split('semRecusa2011(parseAdsScriptOutput(raw, model, brief.value))').length === 3 ? [] : ['anúncio (Studio Ads): versão que é recusa passa']),
  'app/api/kids-cartoon/story/route.ts': (s) => (s.includes("if (looksLikeModelRefusal(texto)) texto = ''") ? [] : ['desenho: a recusa vira história']),
  'app/api/baby-podcast/prepare/route.ts': (s) => (s.includes("if (looksLikeModelRefusal(texto)) texto = ''") ? [] : ['podcast do bebê: a recusa vira roteiro']),
  'app/api/demo-script/route.ts': (s) => (/if \(script && looksLikeModelRefusal\(script\)\) return NextResponse\.json\(\{ script: mode === 'comment' \? fallbackCommentScript\(topic\) : mode === 'product' \? fallbackProductScript\(topic\) : fallbackDemoScript\(topic\), fallback: true \}\)[^\n]*\n\s+if \(script\) return NextResponse\.json\(\{ script \}\)/.test(s) ? [] : ['demo: a recusa vira a demo']),
  'app/api/retry-hollywood-scene/route.ts': (s) => (s.includes('return out.length >= 20 && out.length <= Math.min(prompt.length * 1.5, 6000) && !looksLikeModelRefusal(out) ? out : prompt') ? [] : ['retentar cena: a recusa do reescritor vai ao motor']),
}
const IMPORT_SIMPLES = "import { looksLikeModelRefusal } from '@/lib/modelRefusal'"
const COM_IMPORT_SIMPLES = ['app/api/retry-hollywood-scene/route.ts', 'app/api/expand-script/route.ts', 'app/api/apply-suggestion/route.ts', 'app/api/regenerate-scene/route.ts', 'app/api/ad-script/route.ts', 'app/api/ads/script/route.ts', 'app/api/kids-cartoon/story/route.ts', 'app/api/baby-podcast/prepare/route.ts', 'app/api/demo-script/route.ts']
function checarFiacao(fontes) {
  const f = []
  for (const [arq, ch] of Object.entries(CAMINHOS)) f.push(...ch(fontes[arq]))
  for (const arq of COM_IMPORT_SIMPLES) if (!fontes[arq].includes(IMPORT_SIMPLES)) f.push('import ausente em ' + arq)
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
mutDetector('PISO sem a exceção do "As an AI" de narrador', "    if (casou.every((c, k) => !c || k === AS_AN_AI_DE_ANTES) && !AS_AN_AI.test(f.slice(Math.max(0, f.search(/as an AI/i))))) continue\n", '')
mutDetector('sem a recusa disfarçada', '  if (DISFARCE_NA_FRASE.test(fs[0]) || (fs[1] && DISFARCE_NA_SEGUINTE.test(fs[1]))) return true\n', '')
mutDetector('sem a explicação do modelo na régua da metade', ' || EXPLICACAO_DO_MODELO.test(fs[i])) doModelo', ') doModelo')
mutDetector('sem o JSON', '  if (doJson) return doJson.some((s) => looksLikeModelRefusal(s))\n', '')
mutDetector('sem os rótulos na frente (Scene 1:, Note:)', String.raw`|NOTE|NOTA|RESPONSE|ANSWER|(?:SCENE|CENA|ESCENA|SZENE|СЦЕНА)\s*\d{0,2})`, ')')
mutDetector('sem tirar o "Here is your script:" da frente', String.raw`      .replace(/^(?:Sure[!,.]?\s*)?(?:Here(?:['’]s| is)|Below is)`, String.raw`      .replace(/^x(?:Sure[!,.]?\s*)?(?:Here(?:['’]s| is)|Below is)`)
mutDetector('sem tirar o emoji', String.raw`  t = t.replace(/\p{Extended_Pictographic}️?/gu, ' ')`, '  t = t')
mutDetector('"do" volta a não ser verbo de assistente', '|engage|continue|do)', '|engage|continue)')
const mutFio = (nome, arq, de, para) => { if (!fontes[arq].includes(de)) { mutantes.push([nome, false, 'trecho do mutante não achado']); return } mutantes.push([nome, checarFiacao({ ...fontes, [arq]: fontes[arq].replace(de, para) }).length > 0]) }
const CIN = 'app/api/generate-video-cinematic/route.ts'
mutFio('cinematic sem a guarda do prompt', CIN, '    if (looksLikeModelRefusal(body.prompt)) {', '    if (false) {')
mutFio('cinematic narra a ideia no "Use my script as is"', CIN, "!(typeof body.script_mode === 'string' && body.script_mode.toLowerCase() === 'verbatim')", 'true')
mutFio('cinematic sem a guarda do 1º generateScenes', CIN, 'await recusaDoEscritorDeCenas2011(scenes.map((s) => s.voiceover))', 'null')
mutFio('cinematic sem a guarda do 2º generateScenes', CIN, 'await recusaDoEscritorDeCenas2011(recuperadas.map((s) => s.voiceover))', 'null')
mutFio('cinematic sem estorno na recusa das cenas', CIN, "const released = refunded && await releaseBirthClaim('model_refused_topic')", 'const released = true')
mutFio('cinematic leva a descrição-recusa ao motor', CIN, '(d && !looksLikeModelRefusal(d) ? d : null) ?? scenes[i].aiPrompt', 'd ?? scenes[i].aiPrompt')
mutFio('escritor aceita a recusa na 2ª tentativa', 'app/api/generate-script/route.ts', 'if (roteiroDeNovo && !looksLikeModelRefusal(roteiroDeNovo)) historiaAceita = roteiroDeNovo', 'if (roteiroDeNovo) historiaAceita = roteiroDeNovo')
mutFio('expandir sem a guarda', 'app/api/expand-script/route.ts', 'if (!expandido || looksLikeModelRefusal(expandido)) {', 'if (!expandido) {')
mutFio('sugestão sem a guarda', 'app/api/apply-suggestion/route.ts', 'if (!improved || looksLikeModelRefusal(improved)) {', 'if (!improved) {')
mutFio('refazer cena sem a guarda', 'app/api/regenerate-scene/route.ts', ' && !looksLikeModelRefusal(gptBrollPrompt)', '')
mutFio('anúncio (avatar) sem a guarda', 'app/api/ad-script/route.ts', 'if (!script || looksLikeModelRefusal(script)) {', 'if (!script) {')
mutFio('Studio Ads sem a guarda na correção', 'app/api/ads/script/route.ts', '      versions = semRecusa2011(parseAdsScriptOutput(raw, model, brief.value))', '      versions = parseAdsScriptOutput(raw, model, brief.value)')
mutFio('desenho sem a guarda', 'app/api/kids-cartoon/story/route.ts', "if (looksLikeModelRefusal(texto)) texto = ''", '')
mutFio('podcast do bebê sem a guarda', 'app/api/baby-podcast/prepare/route.ts', "if (looksLikeModelRefusal(texto)) texto = ''", '')
mutFio('demo sem a guarda', 'app/api/demo-script/route.ts', 'if (script && looksLikeModelRefusal(script)) return', 'if (false) return')
mutFio('cinematic sem a guarda do planejador hollywood', CIN, 'await recusaDoEscritorDeCenas2011(plan.scenes.flatMap((sc) => [sc.voiceover, sc.dialogueLine, sc.prompt]))', 'null')
mutFio('retentar cena sem a guarda', 'app/api/retry-hollywood-scene/route.ts', ' && !looksLikeModelRefusal(out) ? out : prompt', ' ? out : prompt')
for (const [nome, reprovou, nota] of mutantes) { if (reprovou) { ok++; console.log('  ✓ mutante reprova: ' + nome) } else { falhas.push('mutante passou: ' + nome); console.log('  ✗ mutante PASSOU: ' + nome + (nota ? ` (${nota})` : '')) } }

console.log(`\n${ok} ok · ${falhas.length} falhas`)
process.exit(falhas.length ? 1 : 0)
