// KINEO-CLIPE-ROTEIRO-QUALQUER-LINGUA-1411 [revisor 14/11 12:21] — guardião sem rede. O caso: 1º vídeo de um cliente dos EUA
// (nota 5, não baixou) colou no Clipe, com foto, um roteiro de desenho 3D de 30 s em ÁRABE (três falas entre «», contagem,
// narração) e recebeu um clipe de 5 s. Prova, executando a função REAL (lib/clips/clipTextoLongo.ts):
//   (A) o roteiro árabe do caso e roteiros em russo, japonês, chinês, turco, hindi, coreano e árabe curto → filme;
//   (B) 36 pedidos curtos de clipe em 13 línguas (inclui "16:9", "1080x1920", letreiro entre aspas, 5 e 12 s) → clipe;
//   (C) decidirClipeNoStudio (Studio) segue a mesma régua;
//   (M) mutantes morrem: sem a regra das aspas, sem a duração em outra escrita, sem os algarismos arábico-índicos,
//       "16:9" aceito como duração, sem o fim de frase CJK, sem a narração em outras línguas.
// v2 (ensaio no corpus real de 49 pedidos, 14/11): tamanho sozinho não faz filme.
//   (D) 7 cenas únicas longas e ricas (70–150 palavras, sem fala nem duração longa: urso, coelho em 10 s, homem no palco,
//       navio na tempestade, vila de pescadores, Pompeia com quadro inicial e blocos 0–3/3–6/6–10 s, cena em PT) → clipe;
//   (E) "60-second … Hindi voiceover", dois monólogos com falas, K-pop de "2 minutes", corretor (passa o dia) → filme;
//   (F) v2.1: CLIP_MAX_SEGUNDOS_PADRAO = o MENOR teto dos motores na oferta (catálogo real menos os aposentados), e o teto do
//       Studio = CLIP_MAX_SECONDS do shotSpec (o que /api/generate-clip corta) = o maior botão do Studio;
//   (G) v2.1: o teto é o do motor do pedido ("15 seconds" com motor de 15 s = clipe; sem motor = filme, como na main);
//       "Plot:"/"In the finale" = enredo = filme; "She speaks to the camera" = fala = filme;
//   (M) "60 palavras voltam a bastar", "bloco de tempo dentro do clipe conta como duração longa", e os sinais de clipe.
// Rodar: node scripts/test-clipe-roteiro-qualquer-lingua-1411.mjs
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const ROOT = path.resolve(import.meta.dirname, '..')
const ts = require(path.join(ROOT, 'node_modules', 'typescript'))
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
const F = { longo: 'lib/clips/clipTextoLongo.ts', studio: 'lib/clips/clipNoStudio0311.ts' }
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ', m) } else { fail++; console.log('  FALHA', m) } }

function load(over = {}) {
  const cache = {}
  const compile = (rel) => {
    if (cache[rel]) return cache[rel].exports
    const js = ts.transpileModule(over[rel] ?? read(rel), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
    const mod = { exports: {} }
    cache[rel] = mod
    new Function('require', 'module', 'exports', js)((s) => { if (s === './clipTextoLongo') return compile(F.longo); throw new Error('import inesperado ' + s) }, mod, mod.exports)
    return mod.exports
  }
  return { longo: compile(F.longo), studio: compile(F.studio) }
}

// O catálogo real de clipes (e o que ele importa), para ler a maior duração oferecida. `import type` some na transpilação.
function loadCatalogo() {
  const cache = {}
  const compile = (rel) => {
    if (cache[rel]) return cache[rel].exports
    const js = ts.transpileModule(read(rel), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
    const mod = { exports: {} }
    cache[rel] = mod
    new Function('require', 'module', 'exports', js)((s) => {
      if (s.startsWith('./')) return compile(path.posix.join(path.posix.dirname(rel), s.slice(2)) + '.ts')
      throw new Error('import inesperado ' + s)
    }, mod, mod.exports)
    return mod.exports
  }
  return compile('lib/clips/clipCatalog.ts')
}

// O texto do caso (14/11 12:21), sem nome de cliente.
const CASO_ARABE = `أنشئ فيديو كرتوني ثلاثي الأبعاد مدته 30 ثانية، بنسبة 16:9، داخل مطعم بيتزا ملون، مع موسيقى حماسية ومؤثرات صوتية.

يبدأ المشهد برنين جرس طلبية عاجلة لطالبات الثامن (٣). يفتح الشيف صناديق المكونات ويكتشف أنها فارغة، ثم يقول بدهشة:

«يا بطلات الثامن (٣)! وصلتنا طلبية عاجلة، لكن مكونات البيتزا الخمسة اختفت! أمامكن خمسة تحديات رياضية، وكل إجابة صحيحة ستمنحكن مكونًا جديدًا لإكمال البيتزا!»

تظهر العجينة والجبن والبيبروني والفلفل والزيتون مع مؤثرات مشوقة.

يبتسم الشيف ويقول: «معلمتكن أشواق تنتظر إبداعاتكن! هل أنتن مستعدات؟»

يظهر عد تنازلي 3، 2، 1، ثم يعلن بحماس: «تحدي بيتزا الرياضيات يبدأ الآن!»

اجعل التعليق الصوتي باللغة العربية الفصحى، مع انتقالات سينمائية سريعة وشخصية شيف مرحة.`

// Roteiros de filme fora das 5 línguas do site. Cada um, curto, pega por UM sinal (para os mutantes morrerem).
export const FILMES = [
  ['ar · caso real 14/11', CASO_ARABE],
  ['ar · só duração em ٣٠', 'فيديو كرتوني مدته ٣٠ ثانية عن قطة في المطبخ'],
  ['ar · só falas «»', 'الطاهي يقول «مرحبا بكم في مطبخنا الصغير» والطفل يرد «أنا جائع جدا اليوم»'],
  ['ar · só narração', 'قصة قطة صغيرة في المدينة مع التعليق الصوتي بالعربية'],
  ['ru · только длительность', 'мультфильм на 30 секунд про кота и собаку'],
  ['ru · озвучка', 'ролик про кота с озвучкой на русском'],
  ['ja · 「」 duas falas', '猫が言う「ここは僕の家だよ」。犬が答える「いや、ここは僕の家だよ」'],
  ['ja · 60秒', '猫と犬の60秒のアニメを作って'],
  ['ja · conto de 5 frases (。)', '昔々、ある小さな村に一匹の猫が住んでいました。猫は毎朝早く起きました。村の広場へ行きました。子供たちと遊びました。夜になると家に帰りました。'],
  ['zh · 旁白', '一只小猫的故事，加上中文旁白'],
  ['zh · 1分钟', '做一个1分钟的动画，讲小猫找妈妈'],
  ['ko · 30초 + 내레이션', '고양이 이야기 30초 애니메이션, 한국어 내레이션'],
  ['tr · 30 saniyelik', 'kedi ve köpek hakkında 30 saniyelik çizgi film'],
  ['tr · seslendirme', 'kedinin hikayesi, Türkçe seslendirme ile'],
  ['hi · 1 मिनट', 'बिल्ली और कुत्ते की 1 मिनट की कहानी'],
  ['hi · कथावाचक', 'एक बिल्ली की कहानी, हिंदी कथावाचक के साथ'],
  ['id · 45 detik', 'animasi kucing 45 detik dengan narasi'],
  ['vi · 20 giây', 'phim hoạt hình con mèo 20 giây'],
  ['th · 30 วินาที', 'การ์ตูนแมว 30 วินาที'],
]

export const CLIPES = [
  ['en · cat 5 seconds', 'a cat jumping, 5 seconds'],
  ['en · 16:9', 'slow zoom on a coffee cup, 16:9'],
  ['en · sign "OPEN"', 'neon sign that says "OPEN" in the rain'],
  ['en · two short labels', 'a cake with "Happy Birthday" and a card saying "Love you"'],
  ['en · 1080x1920', 'woman smiling at camera, 1080x1920, 12 s'],
  ['pt · 8 segundos', 'um cachorro correndo na praia, 8 segundos'],
  ['pt · 9:16', 'carro vermelho na chuva, 9:16'],
  ['es · 5 segundos', 'un perro saltando en el parque, 5 segundos'],
  ['es · atardecer', 'olas rompiendo en la playa al atardecer'],
  ['ar · 5 ثوان', 'قطة تقفز لمدة 5 ثوان'],
  ['ar · ٥ ثوانٍ', 'قطة تقفز لمدة ٥ ثوانٍ'],
  ['ar · 16:9', 'سيارة حمراء تسير تحت المطر، 16:9'],
  ['ar · 10 ثواني', 'رجل يبتسم للكاميرا، 10 ثواني'],
  ['ar · foto dos chefs', 'الطهاة الثلاثة يبتسمون ويلوحون للكاميرا'],
  ['ar · sem duração', 'طفل يلعب بالكرة في الحديقة'],
  ['hi · 5 सेकंड', 'समुद्र तट पर दौड़ता हुआ कुत्ता, 5 सेकंड'],
  ['hi · 16:9', 'बारिश में लाल कार, 16:9'],
  ['hi · बिल्ली', 'एक बिल्ली मेज पर कूदती है'],
  ['ru · 5 секунд', 'кошка прыгает на стол, 5 секунд'],
  ['ru · 16:9', 'красная машина под дождём, 16:9'],
  ['ru · 10 сек', 'девушка улыбается в камеру, 10 сек'],
  ['ja · 5秒', '猫がテーブルに飛び乗る、5秒'],
  ['ja · 16:9', '雨の中の赤い車、16:9'],
  ['ja · 「OPEN」', '看板に「OPEN」と書いてある'],
  ['ja · 3分の1', '画面の3分の1に猫が映る'],
  ['tr · 5 saniye', 'masaya zıplayan bir kedi, 5 saniye'],
  ['tr · 16:9', 'yağmurda kırmızı araba, 16:9'],
  ['tr · 10 saniye', 'kameraya gülümseyen kadın, 10 saniye'],
  ['zh · 5秒', '一只猫跳上桌子，5秒'],
  ['ko · 5초', '고양이가 테이블 위로 뛰어오른다, 5초'],
  ['id · 5 detik', 'kucing melompat ke meja, 5 detik'],
  ['vi · 5 giây', 'con mèo nhảy lên bàn, 5 giây'],
  ['th · 5 วินาที', 'แมวกระโดดขึ้นโต๊ะ 5 วินาที'],
  ['de · 5 Sekunden', 'eine Katze springt auf den Tisch, 5 Sekunden'],
  ['fr · 10 secondes', 'un chat saute sur la table, 10 secondes'],
  ['en · 2024 + 3 shots', 'Paris in 2024, 3 shots of the Eiffel tower at night'],
  ['en · "Scene 1" sozinho', 'Scene 1: a cat walks on the roof at night'],
]

// (G) v2.1 [corpus real 14/11] — o teto é o do MOTOR do pedido; sem motor, o menor teto da oferta (12 s).
const CURTO_15 = 'ocean waves crashing on black rocks at sunset, 15 seconds'
// A história de 15 s do corpus (sintética, mesmo formato: "15-second", 9 frases, "Plot:", "In the finale", "cinematic lighting").
const HISTORIA_15 = 'Create a 15-second animated short. Plot: a tiny robot named Bolt lives alone in a junkyard. Every night he looks at the stars and wishes for a friend. One day a lost puppy wanders in through the fence. Bolt is scared at first and hides behind a broken car. The puppy follows him and wags its tail. They play together until the sun goes down. In the finale, Bolt builds a small house for the puppy out of old metal. Warm cinematic lighting, Pixar style.'
const HISTORIA_15_SEM_ENREDO = HISTORIA_15.replace('Plot: a', 'A').replace('In the finale, Bolt', 'Then Bolt')
// Monólogo do corpus (sintético): "She speaks to the camera", falas em linhas, SEM aspas; câmera e luz tiram o peso das frases.
const MONOLOGO = 'A young woman sits alone in a dim kitchen at night. She speaks to the camera.\nI never told anyone about that summer.\nMy brother left without saying goodbye.\nI still keep his old jacket in my closet.\nClose-up, soft warm lighting, shallow depth of field.'
export const POR_MOTOR = [
  ['"15 seconds" curto, sem motor (como na main)', CURTO_15, undefined, true],
  ['"15 seconds" curto, motor de 15 s', CURTO_15, { maxSegundos: 15 }, false],
  ['"15 seconds" curto, motor de 12 s', CURTO_15, { maxSegundos: 12 }, true],
  ['história 15 s com enredo, sem motor', HISTORIA_15, undefined, true],
  ['história 15 s com enredo, motor de 12 s', HISTORIA_15, { maxSegundos: 12 }, true],
  ['história 15 s com enredo, motor de 15 s (o enredo decide)', HISTORIA_15, { maxSegundos: 15 }, true],
  // v2.2 [revisor, regra D]: era clipe na v2.1; são 8 frases de história (o robô faz várias ações em sequência) — é conto,
  // e conto vence a câmera. Mudança declarada no relatório da v2.2.
  ['a mesma história sem "Plot:"/"In the finale", motor de 15 s (conto de 8 frases)', HISTORIA_15_SEM_ENREDO, { maxSegundos: 15 }, true],
  ['enredo curto ("Plot:" + "In the finale"), motor de 15 s', 'Plot: a robot finds a lost puppy. In the finale they become friends. Cinematic lighting, 10 seconds.', { maxSegundos: 15 }, true],
  ['o mesmo plano curto sem enredo, motor de 15 s', 'A robot finds a lost puppy. They become friends. Cinematic lighting, 10 seconds.', { maxSegundos: 15 }, false],
  ['monólogo "She speaks to the camera" em linhas', MONOLOGO, undefined, true],
  // ═══ v2.2 [revisor independente 14/11] — as 8 pioras da v2.1 (eram certas na main) ═══
  ['R1 timelapse: "30 minutes of sunset in 8 seconds"', 'Timelapse of 30 minutes of sunset in 8 seconds over the city skyline', undefined, false],
  ['R2 relógio: "15 minutes past ten"', 'A clock showing 15 minutes past ten on an old brick tower', undefined, false],
  ['R3 "a 20-second exposure photo look"', 'city traffic at night with a 20-second exposure photo look', undefined, false],
  ['R4 dois nomes de produto entre aspas', 'a bathroom shelf with "Morning Dew Shampoo" and "Night Bloom Conditioner" bottles, soft light', undefined, false],
  ['R5 dois letreiros de 3+ palavras', 'a beach bar with a sign that reads "Welcome to Sunny Beach" and a label saying "Fresh Lemon Juice Daily"', undefined, false],
  ['R5b letreiros com "says"', 'a sign that says "WELCOME TO OUR TOWN" and a banner that says "HAPPY NEW YEAR EVERYONE"', undefined, false],
  ['R6 "Tell the story of my brand in one shot"', 'Tell the story of my brand in one shot: a coffee cup on a wooden table, steam rising', undefined, false],
  ['R7 "Plot twist ending? No, just a cat"', 'Plot twist ending? No, just a cat sleeping on a warm windowsill', undefined, false],
  ['R8 soldado: câmera + 6 frases de história', 'Cinematic lighting, slow dolly. A soldier returns home after the long war. He walks up the dusty road to his old farmhouse. He stops at the gate and looks at the empty porch. His mother opens the door and drops her basket. He runs to her and they hug for a long time. His little sister watches from the window and starts to cry.', undefined, true],
  // vizinhos das 8, nos dois lados
  ['"5 minutes before the wedding"', '5 minutes before the wedding, the bride looks out the window', undefined, false],
  ['"a 30-minute drive"', 'a 30-minute drive compressed into a highway at dusk', undefined, false],
  ['tempo declarado vence ("in 8 seconds")', 'a stopwatch running from 0 to 20 seconds, sped up in 8 seconds', undefined, false],
  ['"30-second video" declarado continua filme', 'a 30-second video of a cat on the beach', undefined, true],
  ['pt "vídeo de 30 segundos"', 'um vídeo de 30 segundos de um gato na praia', undefined, true],
  ['"4K 60s style" é estilo', '4K 60s style street dance under neon', undefined, false],
  ['"90s colors" é estilo', '90s colors, a girl rollerskating at the mall', undefined, false],
  ['"13.5 seconds" (decimal) passa dos 12 s', 'a slow pan across a desert, 13.5 seconds', undefined, true],
  ['"1/50 s" é obturador', 'a hummingbird hovering, shutter 1/50 s, macro lens', undefined, false],
  ['"2:45 minutes" é placar', 'the scoreboard clock reads 2:45 minutes, fans cheering', undefined, false],
  ['duas falas com "says/replies"', 'She looks at him and says "I will never leave this town again" and he replies "Then I will stay with you"', undefined, true],
  ['duas falas com o verbo depois', '"Run, everyone, run now!" she shouts. "The bridge is falling down!" he yells.', undefined, true],
  ['quadro inicial + "30-second video": o filme vence', 'Use the uploaded image as the starting frame, then a 30-second video of the family walking to the beach', undefined, true],
  ['ja: dois letreiros curtos 「」', '看板に「営業中」、ドアに「押す」と書いてある', undefined, false],
  ['"grand finale" de fogos não é enredo', 'fireworks grand finale over the harbor, wide shot, cinematic, 10 seconds', undefined, false],
  ['PT "fala para a câmera"', 'um homem fala para a câmera na cozinha, close-up, luz quente', undefined, true],
  ['ES "cuenta su historia"', 'una abuela cuenta su historia junto al fuego, primer plano, cinematic', undefined, true],
]

// (D) v2 — cenas únicas longas e ricas, no formato dos 6 textos do corpus real (sintéticas: o texto dos clientes não sai da
// base). 70 a 150 palavras, 5+ frases, nenhuma fala, nenhuma duração acima do clipe.
export const CENAS_LONGAS = [
  ['en · urso no rio', 'A massive grizzly bear stands knee-deep in a rushing mountain river at dawn. Golden hour light breaks through the tall pine trees and catches the spray of the water. The bear lowers its huge head, studies the current for a moment, and suddenly snaps a leaping salmon right out of the air. Droplets fly around its wet fur in slow motion. Thin mist rises from the river behind it while birds cross the pale sky. The camera stays low at water level, with a shallow depth of field and the snowy peaks soft in the background. Photorealistic, natural colors, no text on screen.'],
  ['en · coelho em 10 s', 'A small white rabbit sits alone in a sunlit meadow full of wildflowers, 10 seconds. Its long ears twitch as a blue butterfly lands on a nearby daisy. The rabbit sniffs the air, hops twice toward the flower and freezes, nose trembling with curiosity. A soft wind moves the tall grass in slow waves around it. Warm backlight outlines the fur with a thin golden rim and tiny seeds float through the light. Close-up at ground level with a slow push in and a creamy bokeh behind the rabbit. Cinematic, ultra realistic, calm and gentle mood.'],
  ['en · homem no palco', 'A tall man in a dark velvet suit walks slowly to the center of a huge empty theater stage. A single white spotlight follows him from above and dust floats in the beam. He stops, closes his eyes and lifts an old silver microphone close to his face. Behind him red curtains move gently as if pushed by a hidden wind. Thousands of empty seats fade into darkness at the back of the hall. The camera orbits him in one continuous move, low angle, dramatic cinematic lighting with deep shadows. Hyper realistic, 35mm film grain.'],
  ['en · navio na tempestade', 'An old wooden sailing ship fights a violent storm in the middle of the ocean at night. Giant black waves crash over the deck and white foam sprays into the air. Lightning splits the sky and for one second lights up the torn sails and the tilted masts. Heavy rain falls sideways in the strong wind. The ship climbs a wall of water and drops down the other side. Aerial drone shot circling the ship, then a slow tilt down toward the deck. Cinematic, photorealistic, cold blue lighting with flashes of white.'],
  ['en · vila de pescadores', 'A quiet fishing village on a rocky coast wakes up in the soft morning fog. Small colorful boats rock gently in the harbor and ropes creak against the wooden pier. Seagulls circle above the rooftops and land on stacked lobster traps. Smoke rises from a chimney of a white stone house. Waves roll slowly onto the pebble beach and pull back with a soft hiss. Wide shot from a drone gliding over the bay toward the lighthouse at the end of the pier. Golden hour, realistic, peaceful mood.'],
  ['en · Pompeia com quadro inicial', 'Use the uploaded image as the exact starting frame. Ancient Pompeii, a busy Roman street with merchants, carts and stone columns under a clear sky. 0–3 s: people walk and talk in the market, a dog runs past a fountain, everything is calm. 3–6 s: the ground trembles, dust falls from the roofs, people stop and look toward the mountain. 6–10 s: Mount Vesuvius erupts in the distance with a huge dark column of ash rising into the sky while the crowd starts to run. Keep the same architecture, colors and composition from the image, with no text and no modern objects anywhere.'],
  ['pt · cena única', 'Uma bailarina de vestido vermelho dança sozinha no meio de uma estação de trem vazia durante a madrugada. As luzes frias do teto piscam devagar e refletem no chão molhado. Ela gira na ponta dos pés e o vestido se abre como uma flor. Papéis velhos voam pelo chão com o vento de um trem que passa ao fundo sem parar. A respiração dela aparece no ar gelado. Câmera lenta, plano geral que se aproxima até o rosto dela, iluminação cinematográfica azulada, realista.'],
]

// (E) v2 — roteiros de verdade, com sinal de filme, que continuam filme (mesmo com termos de câmera).
export const FILMES_V2 = [
  ['en · 60-second + Hindi voiceover', 'Create a 60-second video with Hindi voiceover about the history of the Taj Mahal. Start with a drone shot at sunrise, show the marble details in close-up, the gardens and the river. Cinematic lighting, realistic.'],
  ['en · monólogo do pescador', 'An old fisherman sits on the dock at night and looks at the dark sea. He says: "I have waited forty years for this storm to come back." The wind grows stronger and the lamps swing. He stands up and whispers: "Tonight it finally answers me." Cinematic close-up, moody lighting.'],
  ['pt · monólogo da avó', 'Uma avó olha a foto antiga do marido na cozinha. Ela diz “você prometeu que voltaria antes do inverno”. Lá fora começa a nevar. Ela sorri e completa “e o inverno chegou sem você, meu amor”. Câmera lenta, iluminação quente.'],
  ['en · K-pop 2 minutes', 'A 2 minutes K-pop music video with several scenes: the group dances on a neon rooftop in Seoul, then walks through a rainy street with umbrellas, then a school hallway full of lockers, and a final stage with fireworks and a cheering crowd. Fast cuts, cinematic lighting, 4K.'],
  ['pt · corretor (guardião 29/10)', 'Crie um vídeo animado 1080x1920 em terceira pessoa. Um corretor de imóveis acorda cedo, abre o notebook e vê dezenas de leads novos chegando. Ele liga para cada um, agenda visitas, mostra apartamentos, negocia com calma e no fim do dia fecha três vendas. A câmera acompanha a rotina dele do café da manhã até a comemoração com a equipe no escritório, mostrando como organizar os leads mudou o jogo.'],
  ['en · 3 cenas sem tempo', 'Scene 1: a boy finds a map in the attic. Scene 2: he crosses the forest with his dog. Scene 3: he opens a chest on the beach.'],
]
// Cenas numeradas que cabem no clipe continuam clipe.
const CLIPE_EM_PLANOS = ['en · 3 shots em 10 s', 'Shot 1 (0–3 s): a cup of coffee on a table. Shot 2 (3–6 s): steam rises. Shot 3 (6–10 s): a hand picks it up.']

function checa(L) {
  const erros = []
  for (const [nome, t] of FILMES) if (L.longo.pareceRoteiroDeFilme(t) !== true) erros.push(`filme virou clipe: ${nome}`)
  for (const [nome, t] of CLIPES) if (L.longo.pareceRoteiroDeFilme(t) !== false) erros.push(`clipe virou filme: ${nome}`)
  for (const [nome, t] of CENAS_LONGAS) if (L.longo.pareceRoteiroDeFilme(t) !== false) erros.push(`cena longa virou filme: ${nome}`)
  for (const [nome, t] of FILMES_V2) if (L.longo.pareceRoteiroDeFilme(t) !== true) erros.push(`filme v2 virou clipe: ${nome}`)
  if (L.longo.pareceRoteiroDeFilme(CLIPE_EM_PLANOS[1]) !== false) erros.push(`clipe virou filme: ${CLIPE_EM_PLANOS[0]}`)
  for (const [nome, t, opcoes, esperado] of POR_MOTOR) if (L.longo.pareceRoteiroDeFilme(t, opcoes) !== esperado) erros.push(`por motor errou: ${nome}`)
  if (L.studio.decidirClipeNoStudio(CURTO_15) !== 'filme') erros.push('Studio: "15 seconds" passa dos 12 s do Studio e não vira filme')
  if (L.studio.decidirClipeNoStudio(CASO_ARABE) !== 'filme') erros.push('Studio: caso árabe não vira filme')
  if (L.studio.decidirClipeNoStudio('قطة تقفز لمدة 5 ثوان') !== 'clipe') erros.push('Studio: clipe árabe curto não é clipe')
  return erros
}

console.log('(A/B/C) função real')
const base = checa(load())
for (const [nome] of FILMES) ok(!base.includes(`filme virou clipe: ${nome}`), `filme · ${nome}`)
for (const [nome] of CLIPES) ok(!base.includes(`clipe virou filme: ${nome}`), `clipe · ${nome}`)
ok(!base.some((e) => e.startsWith('Studio')), 'Studio decide igual (caso árabe → filme; clipe árabe → clipe)')
ok(FILMES.length >= 7 && CLIPES.length >= 30, `corpus: ${FILMES.length} filmes, ${CLIPES.length} clipes`)
console.log('(D/E) v2: tamanho sozinho não faz filme')
for (const [nome, t] of CENAS_LONGAS) {
  const palavras = t.split(/\s+/).filter(Boolean).length
  ok(palavras >= 70 && palavras <= 150 && palavras > 60, `cena longa tem ${palavras} palavras (70–150): ${nome}`)
  ok(!base.includes(`cena longa virou filme: ${nome}`), `clipe · ${nome}`)
}
for (const [nome] of FILMES_V2) ok(!base.includes(`filme v2 virou clipe: ${nome}`), `filme · ${nome}`)
ok(!base.includes(`clipe virou filme: ${CLIPE_EM_PLANOS[0]}`), `clipe · ${CLIPE_EM_PLANOS[0]}`)
console.log('(G) v2.1: teto do motor, fala para a câmera, enredo')
for (const [nome, t, opcoes, esperado] of POR_MOTOR) ok(!base.includes(`por motor errou: ${nome}`), `${esperado ? 'filme' : 'clipe'} · ${nome}`)
console.log('(F) tetos lidos do código real')
{
  const cat = loadCatalogo()
  // Motores na oferta = o catálogo menos os aposentados de lib/engineLaunch.ts (lido do texto: a lib importa '@/…').
  const launch = read('lib/engineLaunch.ts')
  const aposentados = JSON.parse((launch.match(/export const OFFER_RETIRED_ENGINE_KEYS: readonly string\[\] = (\[[^\]]*\])/) ?? [])[1]?.replace(/'/g, '"') ?? 'null')
  ok(Array.isArray(aposentados) && aposentados.length > 0, `aposentados lidos de engineLaunch.ts: ${JSON.stringify(aposentados)}`)
  const tetos = cat.CLIP_ENGINE_ORDER.filter((k) => !(aposentados ?? []).includes(k)).map((k) => Math.max(...cat.offeredSecondsFor(k)))
  const L = load()
  ok(L.longo.CLIP_MAX_SEGUNDOS_PADRAO === Math.min(...tetos), `CLIP_MAX_SEGUNDOS_PADRAO (${L.longo.CLIP_MAX_SEGUNDOS_PADRAO}) = menor teto dos motores na oferta (${Math.min(...tetos)}; tetos ${tetos.join('/')})`)
  const shot = (() => { const m = { exports: {} }; new Function('require', 'module', 'exports', ts.transpileModule(read('lib/cinematic/shotSpec.ts'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(() => { throw new Error('shotSpec ganhou import') }, m, m.exports); return m.exports })()
  ok(L.studio.CLIPE_NO_STUDIO_MAX_SEGUNDOS === shot.CLIP_MAX_SECONDS, `teto do Studio na lib (${L.studio.CLIPE_NO_STUDIO_MAX_SEGUNDOS}) = CLIP_MAX_SECONDS do /api/generate-clip (${shot.CLIP_MAX_SECONDS})`)
  const studio = read('app/(dashboard)/studio/StudioClient.tsx')
  const botoes = (studio.match(/\{\[([\d, ]+)\]\.map\(\(s\) => \(\s*<button key=\{s\} type="button" className=\{`pill\$\{clipSeconds === s/) ?? [])[1]
  ok(!!botoes && Math.max(...botoes.split(',').map(Number)) === shot.CLIP_MAX_SECONDS, `botões de duração do clipe no Studio vão até ${shot.CLIP_MAX_SECONDS} (${botoes})`)
  ok(L.longo.duracaoPedida('0–3 s, 3–6 s, 6–10 s') === 10 && L.longo.duracaoPedida('16:9, 1080x1920') === 0 && L.longo.duracaoPedida('٣٠ ثانية') === 30 && L.longo.duracaoPedida('2 minutes') === 120, 'duracaoPedida: blocos = o maior, 16:9 = 0, ٣٠ ثانية = 30, 2 minutes = 120')
}

console.log('(M) mutantes')
const longo = read(F.longo)
const mutantes = [
  ['sem a regra das aspas', longo.replace('if (falasEntreAspas(t) >= CLIP_FALAS_ENTRE_ASPAS) return true', '')],
  ['sem as palavras de segundo em árabe', longo.replace('ثاني[ةه]|ثانیه|ثوان[يى]?|', '')],
  ['sem os algarismos arábico-índicos', longo.replace("[٠-٩۰-۹०-९０-９]", '[０-９]')],
  ['"16:9" aceito como duração', longo.replace("const UNIDADE_SEGUNDO = '(?:", "const UNIDADE_SEGUNDO = '(?::|")],
  ['sem o fim de frase CJK', longo.replace('|[。！？]+/g', '/g')],
  ['60 palavras voltam a bastar', longo.replace("  if (!t) return false\n  const max", "  if (!t) return false\n  if (t.split(/\\s+/).filter(Boolean).length > CLIP_ROTEIRO_PALAVRAS) return true\n  const max")],
  ['bloco de tempo dentro do clipe conta como duração longa', longo.replace('return Math.max(0, ...temposPedidos(texto))', 'return temposPedidos(texto).reduce((s, n) => s + n, 0)')],
  ['o padrão volta a ser 15', longo.replace('export const CLIP_MAX_SEGUNDOS_PADRAO = 12', 'export const CLIP_MAX_SEGUNDOS_PADRAO = 15')],
  ['maxSegundos do motor é ignorado', longo.replace('return typeof n === \'number\' && Number.isFinite(n) && n > 0 ? n : CLIP_MAX_SEGUNDOS_PADRAO', 'return CLIP_MAX_SEGUNDOS_PADRAO')],
  ['fala para a câmera não conta', longo.replace('if (FALA_PARA_A_CAMERA_RE.test(t)) return true // v2.1', '')],
  ['enredo explícito não conta', longo.replace('if (ENREDO_RE.test(t)) return true // v2.1', '')],
  ['sem o sinal de câmera', longo.replace('return termosDeCamera(t) >= CLIP_TERMOS_DE_CAMERA', 'return false')],
  ['sem o quadro inicial nem os blocos', longo.replace('if (FOTO_COMO_QUADRO_RE.test(t)) return true', '').replace('return blocos.length > 0 && Math.max(...blocos) <= max', 'return false')],
  // v2.2 [revisor independente]
  ['ANTES_DO_NUMERO sem ":.,x×/" (mutante do revisor)', longo.replace("const ANTES_DO_NUMERO = '(?<![\\\\d:.,x×/])'", "const ANTES_DO_NUMERO = '(?<![\\\\d])'")],
  ['tempo do assunto conta (of/past/before/exposure…)', longo.replace('if (NAO_E_TAMANHO_DEPOIS_RE.test(depois) || NAO_E_TAMANHO_ANTES_RE.test(antes)) continue', '')],
  ['tamanho declarado não vence', longo.replace('return (declarados.length > 0 ? declarados : tempos).map', 'return tempos.map')],
  ['década vira duração', longo.replace("(DECADA_DEPOIS_RE.test(depois) || DECADA_ANTES_RE.test(antes))) continue", '(false)) continue')],
  ['sem decimal', longo.replace('(\\\\d{1,3}(?:[.,]\\\\d{1,2})?)', '(\\\\d{1,3})')],
  ['aspas sem quem fala contam', longo.replace('if (latina && !temQuemFala(', 'if (false && !temQuemFala(')],
  ['letreiro com verbo de fala conta', longo.replace('&& !TEXTO_ESCRITO_RE.test(antes)', '').replace('&& !TEXTO_ESCRITO_RE.test(depois)', '')],
  ['"plot twist" solto volta a contar', longo.replace('|(?<![\\p{L}])in the finale(', '|(?<![\\p{L}])(?:in the finale|plot twist)(')],
  ['"tell the story of my brand" volta a ser fala', longo.replace('(?:tells|telling) (?:his|her|their) (?:own )?(?:life )?story', 'tell(?:s|ing)? (?:the|a|this|his|her|their|my|our) (?:own )?(?:life )?story')],
  ['câmera sempre vence o conto', longo.replace('return frasesDeHistoria(t) >= CLIP_CONTO_COM_CAMERA', 'return false')],
  ['conto com câmera volta a 5 frases', longo.replace('export const CLIP_CONTO_COM_CAMERA = 6', 'export const CLIP_CONTO_COM_CAMERA = 5')],
  ['sem a passagem de tempo', longo.replace('return PASSA_O_TEMPO_RE.test(t)', 'return false')],
  ['cenas numeradas: uma basta', longo.replace('export const CLIP_CENAS_DE_FILME = 3', 'export const CLIP_CENAS_DE_FILME = 1')],
  ['sinal de clipe vence sinal de filme', longo.replace("  if (temSinalDeFilme(t, max)) return true\n  if (temSinalDeClipe(t, max)) return false", "  if (temSinalDeClipe(t, max)) return false\n  if (temSinalDeFilme(t, max)) return true")],
  ['sem a narração em outras línguas', longo.replace('if (PEDE_NARRACAO_RE.test(t)) return true', '')],
  ['falas sem mínimo de palavras', longo.replace('if (!(miolo.split(/\\s+/).filter(Boolean).length >= 3 ||', 'if (!(miolo.split(/\\s+/).filter(Boolean).length >= 1 ||')],
  ['"3分の1" vira minuto', longo.replace("分(?!の)", '分')],
]
for (const [nome, src] of mutantes) {
  ok(src !== longo, `mutante "${nome}" aplicou`)
  let erros
  try { erros = checa(load({ [F.longo]: src })) } catch (e) { erros = [String(e)] }
  ok(erros.length > 0, `mutante "${nome}" fica vermelho (${erros.length}: ${erros[0] ?? ''})`)
}

console.log(`\n${pass} ok, ${fail} falha(s)`)
if (fail) process.exit(1)
