// KINEO-PROXIMO-EPISODIO-0111-SEMANTICA — calibração da leitura semântica da ficha (lib/fichaDoEpisodio.ts) contra a API REAL.
//
// Conjunto rotulado: todos os exemplos das revisões adversariais 1 e 2 (positivos e negativos) + filmes reais do banco
// (Supabase, leitura só, 30 dias até 01/11) + episódios escritos (quem o episódio segue). Roda a função DE VERDADE (mesmo
// prompt, mesmo esquema, mesmo modelo), grava conjunto + veredito + a resposta crua de cada caso em
// docs/calibracao/KINEO-PROXIMO-EPISODIO-0111.json — o guardião (scripts/test-proximo-episodio-0111.mts) reusa essas
// respostas como mock, sem rede.
// Meta: 0 falso positivo grave (inventar sujeito/personagem, coisa/lugar/metáfora virando ficha, pessoa real virando objeto
// ou criatura) e ≥ 85% de acerto nos positivos.
// A chave da OpenAI é lida de C:\kineo\.env.local (ou KINEO_ENV_LOCAL) só aqui, em memória; nunca é impressa nem gravada.
// Rodar: npx tsx scripts/calibrar-ficha-episodio-0111.mts
import fs from 'node:fs'
import path from 'node:path'
import { lerFichaDoFilme, protagonistaDoEpisodio, FICHA_SEMANTICA_VERSAO, FICHA_SISTEMA } from '../lib/fichaDoEpisodio'
import { mesmoSer } from '../lib/episodeContinuity'

const SAIDA = 'docs/calibracao/KINEO-PROXIMO-EPISODIO-0111.json'
const ENV = process.env.KINEO_ENV_LOCAL || 'C:\\kineo\\.env.local'
const chave = (() => {
  const linha = fs.readFileSync(ENV, 'utf8').split(/\r?\n/).find((l) => /^OPENAI_API_KEY\s*=/.test(l)) ?? ''
  return linha.replace(/^OPENAI_API_KEY\s*=\s*/, '').replace(/^["']|["']$/g, '').trim()
})()
if (!chave) { console.error('sem OPENAI_API_KEY em', ENV); process.exit(2) }

export interface Caso {
  id: string
  fonte: 'revisao-1' | 'revisao-2' | 'revisao-3' | 'guardiao' | 'banco'
  pedido?: string
  narracao?: string
  /** Nomes aceitos como protagonista; null = não pode haver ficha. */
  protagonista: string[] | null
  /** Coadjuvantes aceitos (além do protagonista). */
  coadjuvantes?: string[]
  /** Caso ambíguo: não entra na conta dos positivos; ficha com estes nomes não é falso positivo. */
  opcional?: boolean
  /** Pessoas reais nomeadas: ficha delas num filme sem personagem = FP leve (não grave), contado à parte. */
  pessoas?: string[]
  /** Coisas/lugares/metáforas/organizações: virar ficha = FP GRAVE. */
  naoSeres?: string[]
  /** A mesma pessoa citada com variações: no máximo uma ficha com esse nome. */
  umaFicha?: string
}
export interface CasoEpisodio { id: string; titulo: string; script: string; segue: string | null; fonte: string }

const ROLAND = 'Roland Pernicus Oznard, a gruff old man with shoulder-length gray-brown hair, shuffles to his mailbox every morning. Today the box is warm. Roland opens it and finds a letter with no stamp.'
const BRO = 'BRO, a muscular grey city pigeon, rules the rooftop of the old bakery. Every morning BRO fights the seagulls for the crumbs.'
const MILO = 'Generate a continuous visual story with CONSISTENT characters.\n\nA tiny cute blue milk carton named MILO.\n\nHe has small arms and legs, huge expressive brown eyes, tiny white sneakers, and a slightly crushed corner on the top of his carton.'
const JANELA = 'Two tragic crashes exposed a critical design flaw in the square airplane windows used in the aircraft construction. Round airplane windows spread the cabin pressure evenly.'

const n = (id: string, narracao: string, extra: Partial<Caso> = {}): Caso => ({ id, fonte: 'revisao-2', narracao, protagonista: null, ...extra })
const p = (id: string, narracao: string, prot: string[], extra: Partial<Caso> = {}): Caso => ({ id, fonte: 'guardiao', narracao, protagonista: prot, ...extra })

export const CASOS: Caso[] = [
  // ── positivos: ficha que o produto TEM de manter (guardião das rodadas 1-2) ──
  p('roland', ROLAND, ['Roland Pernicus Oznard']),
  p('bro', BRO, ['BRO']),
  { id: 'milo-pedido', fonte: 'guardiao', pedido: MILO, narracao: 'Nobody wanted Milo, as he stood all alone on the bottom shelf. Then a little hand reached for him.', protagonista: ['MILO'] },
  p('pip-e-luna', 'Meet Pip, a brave little mouse with a red scarf, and Luna, an old owl. Pip wants to see the sea; Luna knows the way.', ['Pip'], { coadjuvantes: ['Luna'] }),
  p('kali-kameron', 'Kali and Kameron are ready to play! Kali swoops her toy plane high above the play table. Kameron points to the toy boat. Kali laughs.', ['Kali', 'Kameron'], { coadjuvantes: ['Kali', 'Kameron'] }),
  p('dino', 'Dino the dinosaur loved to dance. Dino danced all night. Dino smiled at the moon.', ['Dino']),
  p('grog', 'Grog, a friendly giant, lived in the hills. Every morning Grog carried the village children across the river on his shoulders.', ['Grog']),
  p('smaug', 'Once upon a time, Smaug, a dragon, slept on gold. One day a tiny thief tiptoed into his cave.', ['Smaug']),
  p('mila-cabelo', 'Mila, a girl with a red scarf and tangled hair, dreamed of stars. One night she climbed the tallest tree to touch one.', ['Mila']),
  p('pip-historia', 'The story of Pip, a brave mouse. Pip lived under the old piano and dreamed of the kitchen.', ['Pip']),
  p('leo-filhote', 'At night, Leo, a lion cub, roared. His mother laughed, and Leo roared again, louder.', ['Leo']),
  p('rua', 'In the forest, Rua, a little fox, found a key. Rua hid it under her tail and ran home.', ['Rua']),
  p('bolt', 'A tiny robot named Bolt fixes toys. Every night Bolt rolls through the playroom with his little screwdriver.', ['Bolt']),
  p('bia-pt', 'Bia, uma menina curiosa, achou um mapa no sótão. Bia correu para mostrar ao avô.', ['Bia']),
  p('roland-duplo', 'Roland Pernicus Oznard, a gruff old man with gray hair, opens his mailbox. Roland Oznard, a stubborn man, never asks for help. Roland reads the letter twice.', ['Roland Pernicus Oznard', 'Roland Oznard'], { fonte: 'revisao-3', umaFicha: 'Roland' }),
  p('briggs-duplo', 'A man named Benjamin Briggs ran a small fishing boat. Briggs, a careful sailor, never lost a single crate. One night Briggs heard a knock on the hull, far from any shore.', ['Benjamin Briggs', 'Briggs'], { fonte: 'revisao-3', umaFicha: 'Briggs' }),
  // ambíguos (não contam nos positivos)
  p('dr-vega', 'Elsewhere, a scientist named Dr. Vega studied the comet.', ['Dr. Vega'], { fonte: 'revisao-1', opcional: true }),
  p('mia-frase', 'Mia, a little girl watched the storm from her window.', ['Mia'], { fonte: 'revisao-1', opcional: true }),
  p('juan-es', 'Juan, un hombre de Lima, encontró oro.', ['Juan'], { fonte: 'revisao-2', opcional: true }),
  p('mrs-lopez', 'Mrs. Lopez, a teacher in Texas paid off every student loan in her class.', ['Mrs. Lopez'], { fonte: 'revisao-2', opcional: true }),

  // ── negativos: filme factual / sem personagem nomeado (revisão 1) ──
  n('janela', JANELA, { fonte: 'guardiao', naoSeres: ['airplane', 'windows'] }),
  n('skymaster-tehran', 'In 1950, a C-54 Skymaster disappeared over the Yukon. Tehran, a city of 9 million, never sleeps.', { fonte: 'revisao-1', naoSeres: ['Skymaster', 'Tehran', 'Yukon'] }),
  n('paquistao', 'Pakistan has one of the lowest literacy rates in Asia. Literacy in Pakistan rose to 60 percent. Pakistan spends little on schools. Literacy matters.', { fonte: 'revisao-1', naoSeres: ['Pakistan', 'Literacy'] }),
  n('roma', 'Rome was not built in a day. Rome had a million people. Rome fell in 476. The man who ruled Rome was Augustus.', { fonte: 'revisao-1', naoSeres: ['Rome'], pessoas: ['Augustus'] }),
  n('lua-terra', 'The Moon pulls the oceans. Earth spins. The Moon is moving away from Earth every year. Earth has one moon.', { fonte: 'revisao-1', naoSeres: ['Moon', 'Earth'] }),
  n('use-kineo', 'Use this trick. Use it every day. Kineo makes videos. Kineo is fast. Video is the future. Video wins.', { fonte: 'revisao-1', naoSeres: ['Use', 'Kineo', 'Video'] }),
  n('ten-talent', 'Ten years ago, nobody cared. Ten countries signed. Seventy percent of people agree. Talent matters. Talent wins. Son of a farmer, he worked.', { fonte: 'revisao-1', naoSeres: ['Ten', 'Seventy', 'Talent', 'Son'] }),
  n('china-inflacao', 'China said on Monday it will cut tariffs. China says the economy grew. China has a plan. Inflation runs wild. Inflation hits the poor.', { fonte: 'revisao-1', naoSeres: ['China', 'Inflation', 'Monday'] }),
  n('helping', 'Helping others is good. Helping makes you happy. Friendship lasts. Friendship has rules.', { fonte: 'revisao-1', naoSeres: ['Helping', 'Friendship'] }),
  n('meanwhile', 'Meanwhile, a little girl watched the storm from her window. The storm grew. The little girl was scared of the storm.', { fonte: 'revisao-1', naoSeres: ['Meanwhile'] }),
  n('aberturas', 'Somewhere, a lonely fox waited in the snow. However, a strange man appeared at the door. Inside, a robot hummed quietly. Later, a tired old man sat down. Finally, a small bird landed on the roof.', { fonte: 'revisao-1', naoSeres: ['Somewhere', 'However', 'Inside', 'Later', 'Finally'] }),
  n('hisarlik', 'Hisarlik, a hill where a farmer found gold, hides Troy. Qinngua, a place in Greenland where a hunter lived.', { fonte: 'revisao-1', naoSeres: ['Hisarlik', 'Qinngua', 'Troy', 'Greenland'] }),
  n('rei-franca', 'The king of France signed the treaty. The king died in 1715. Historians still debate it.', { fonte: 'revisao-1', naoSeres: ['France'] }),
  n('robo-sem-nome', 'A tiny discarded robot collects broken toys and repairs them for lonely children. One day, the robot shuts down.', { fonte: 'guardiao' }),
  // revisão 2
  n('ohio', 'In Ohio, a man found a winning lottery ticket in his old coat. The ticket was worth two million dollars.', { naoSeres: ['Ohio'] }),
  n('last-friday', 'Last Friday, a teacher in Texas paid off every student loan in her class. The students cried.', { naoSeres: ['Friday', 'Texas'] }),
  n('monday-kenya', 'On Monday, a farmer in Kenya found a meteorite. Scientists rushed to the farm.', { naoSeres: ['Monday', 'Kenya'] }),
  n('minas', 'Em Minas, um homem achou ouro no quintal. A cidade inteira foi ver.', { naoSeres: ['Minas'] }),
  n('mexico', 'En México, un hombre encontró una ciudad bajo su casa. Los arqueólogos llegaron.', { naoSeres: ['México', 'Mexico'] }),
  n('yesterday-ohio', 'Yesterday in Ohio, a man found gold. Friday, a teacher found a dog.', { naoSeres: ['Ohio', 'Friday'] }),
  n('centralia', 'Centralia, a ghost town in Pennsylvania, has burned since 1962.', { naoSeres: ['Centralia', 'Pennsylvania'] }),
  n('mary-celeste', 'Mary Celeste, a ghost ship, was found empty in 1872.', { naoSeres: ['Mary Celeste'] }),
  n('jupiter', 'Jupiter, a gas giant, has 95 moons.', { naoSeres: ['Jupiter'] }),
  n('nvidia', 'Nvidia, a chip giant, is worth trillions.', { naoSeres: ['Nvidia'] }),
  n('kodak', 'Kodak, a giant of photography, went bankrupt.', { naoSeres: ['Kodak'] }),
  n('lego', 'Lego, a toy company, nearly died in 2003.', { naoSeres: ['Lego'] }),
  n('china-dragao', 'China, a sleeping dragon, woke up.', { naoSeres: ['China'] }),
  n('inflacao-monstro', 'Inflation, a monster that eats your savings, is back.', { naoSeres: ['Inflation'] }),
  n('town-called', 'A small town called Centralia has burned for sixty years.', { naoSeres: ['Centralia'] }),
  n('tesla', 'Tesla, the robot maker, doubled its sales.', { naoSeres: ['Tesla'] }),
  n('moon-hides', 'The Moon hides a secret. The Moon is drifting away from Earth.', { naoSeres: ['Moon', 'Earth'] }),
  n('pakistan-hopes', 'Pakistan hopes to double literacy. Pakistan spends little on schools.', { naoSeres: ['Pakistan'] }),
  n('new-york', 'New York laughs at your salary. Rent in New York doubled.', { naoSeres: ['New York', 'York'] }),
  n('bitcoin-rei', 'Bitcoin, the king of crypto, crashed. Bitcoin fell 20 percent in a day.', { naoSeres: ['Bitcoin'] }),
  // revisão 3 (a do 892e180a5)
  n('inflacao-ladra', 'Inflation, a silent thief, takes 3 percent a year from your savings. Prices climb while your salary stands still.', { fonte: 'revisao-3', naoSeres: ['Inflation'] }),
  n('thanks-bitcoin', 'Thanks to Bitcoin, a teenager in Ohio became a millionaire. He bought his first coin at fourteen.', { fonte: 'revisao-3', naoSeres: ['Bitcoin', 'Ohio'] }),
  n('gracas-pix', 'Graças ao Pix, um homem de Goiânia montou um império de pastel. Hoje ele vende dez mil por dia.', { fonte: 'revisao-3', naoSeres: ['Pix', 'Goiânia'] }),
  n('segun-forbes', 'Según Forbes, un hombre de Monterrey gana más que todo su país. Su fortuna creció 40 por ciento.', { fonte: 'revisao-3', naoSeres: ['Forbes', 'Monterrey'] }),
  n('like-apple', 'Like Apple, a farmer in Iowa bet everything on one product. Now his corn sells in 40 countries.', { fonte: 'revisao-3', naoSeres: ['Apple', 'Iowa'] }),
  n('titanic-olympic', 'The Titanic had a twin called Olympic. Olympic sailed for 24 years and even rammed a German submarine.', { fonte: 'revisao-3', naoSeres: ['Titanic', 'Olympic'] }),
  n('satoshi', 'This is the story of a coin called Bitcoin. Satoshi, a ghost, wrote the code and vanished in 2011.', { fonte: 'revisao-3', naoSeres: ['Bitcoin'], pessoas: ['Satoshi'] }),
  n('kodak-company', 'A company called Kodak, a giant with 145,000 workers, invented the digital camera and buried it.', { fonte: 'revisao-3', naoSeres: ['Kodak'] }),
]

// ── filmes reais do banco (Supabase cqqukkvjjrguayiyjvhh, leitura só, 01/11, últimos 30 dias) ──
const b = (id: string, narracao: string, prot: string[] | null, extra: Partial<Caso> = {}): Caso => ({ id: `banco-${id}`, fonte: 'banco', narracao, protagonista: prot, ...extra })
CASOS.push(
  b('840a372a', "Meet Tommy—a boy with a sandwich and a big adventure. Suddenly, a mischievous pup leaps and grabs Tommy's snack! Tommy chases, but the pup's got moves—like a true performer! And then... the pup dances on Tommy's head. Laughter erupts!", ['Tommy']),
  b('4a580774', 'Dentinho, a escova de dentes mais corajosa do banheiro, acorda com um barulho estranho. Um monstrinho de açúcar está escondido entre os dentes do Lucas! Dentinho chama a pasta Mentinha, e juntos fazem espuma, giram e esfregam até o monstrinho fugir. Lucas sorri: dentes brilhando!', ['Dentinho'], { coadjuvantes: ['Mentinha', 'Lucas'] }),
  b('38937288', 'Ploc, um alienígena laranja, aperta um botão misterioso! Cada espirro... um novo Ploc surge, clonando-se sem parar! Geli, a geleia roxa, tenta impedir o desastre com urgência. Bip, o robô verde, acidentalmente ativa outra alavanca... aumentando o caos!', ['Ploc'], { coadjuvantes: ['Geli', 'Bip'] }),
  b('0a7fa307', "Deep inside a magical forest, there lived a little panda named Milo. One morning, Milo heard a little cry near a tree. Together, they found the bird's family... Milo learned kindness makes a big difference.", ['Milo']),
  b('1bf949b7', "Leo tiptoed into his dark bedroom, feeling a little scared. Suddenly, a friendly firefly flew in, lighting up the room. Leo giggled as the firefly danced. Darkness isn't so scary with a little light. What helps you feel brave at night?", ['Leo']),
  b('60e03554', 'Imagine um desenho animado 3D... com um toque único! Conheça Tito, a capivara robusta, com cabelo roxo-violeta e três pontas. E os coelhinhos, fofos, com orelhas flexíveis e reações hilárias! Tudo acontece na floresta encantada... um mundo de cores vibrantes e expressões exageradas!', ['Tito']),
  b('f7ac21dd', 'Kael, an 18-year-old in torn clothes, stands alone... Behind him, enormous stone castles and wealthy people mock. Kael whispers, “One day, they will all bow before me.” Soldiers shout, “There he is! Catch him!” Kael runs, fear igniting his escape.', ['Kael']),
  b('b237e578', "In Rainbow Valley, Mila, with her turquoise hair and star-shaped backpack, discovers a world where the grass glows like neon. Suddenly, a dazzling mini vortex of brilliant light opens up, revealing Skoczuś, a pastel-colored creature with mesmerizing eyes resembling sparkling, precious gems. Mila and Skoczuś joyfully run through the enchanting valley, leaping over vibrant balls that explode into a shower of colorful confetti.", ['Mila'], { coadjuvantes: ['Skoczuś'], naoSeres: ['Rainbow Valley'] }),
  b('70dc1a09', "Leadership isn't just a title—it's a guiding light for success. Meet Alex, a warehouse operator who leads with genuine passion. His team exceeds targets consistently—together, they achieve more. Alex's key to success? Leadership isn't about control... It's about trust, vision, and inspiring unity.", ['Alex'], { opcional: true }),
  b('6ccc6edc', 'What if helping others succeed means starting your own journey anew? Meet Neeraj Kumar, a trainer and mentor for over 17 years. From classrooms to AI, Neeraj keeps reinventing himself. Through his podcast, Neeraj shares: "Talent opens doors... but skills, mindset, and confidence make opportunities count."', null, { pessoas: ['Neeraj Kumar'] }),
  b('5ea848e6', "Two armies faced each other: Israelites versus Philistines, preparing for battle. From the Philistines came Goliath, a giant challenging Israel daily. Young shepherd David arrived, shocked by Goliath's bold challenge. With faith and a sling, David's stone... struck Goliath down. Victory.", ['David', 'Goliath'], { opcional: true, coadjuvantes: ['Goliath', 'David'], naoSeres: ['Israel', 'Philistines', 'Israelites'] }),
  b('e6eccede', 'POV: You wake up as a gladiator in Ancient Rome in 100 AD. The crowd is screaming, the gates slowly open, and a giant opponent steps into the arena. You grip your sword, knowing this could be your last day alive. Suddenly, a lion is released behind your opponent. What happens next?', null, { naoSeres: ['Rome', 'Ancient Rome'] }),
  b('3c612308', 'A young man walks alone through a dark Indonesian village at midnight. Suddenly, a terrifying ghost appears behind a large tree. The man turns around and calmly asks, "Mbak, tahu warung pecel lele yang masih buka?" The ghost screams and hides behind him... everyone runs away, hilariously!', null, { naoSeres: ['Mbak'] }),
  b('f8ea1e8f', "This Viking family reached America before Columbus. A skeleton near their home just solved a mystery. Southern Greenland. Around the year 980, an exiled Viking called Erik the Red sailed here and built his farm on a fjord once known as Erik's Fjord. According to the sagas, his son Leif later sailed west and reached North America, five hundred years before Columbus. For years, archaeologists studied a strange stone wall near Erik's old home, at a place called Qinngua. Inside it stood a large stone building. It looked like a church. Then, this August, they dug. And they found a skeleton, buried with the head facing east.", null, { pessoas: ['Erik the Red', 'Erik', 'Leif', 'Columbus'], naoSeres: ['Qinngua', 'Greenland', "Erik's Fjord", 'America'] }),
  b('735a5b67', "They just found music inside Troy. Yes, that Troy. The city of the Trojan Horse. The city Homer wrote about in the Iliad. Its ruins sit on a hill called Hisarlik, in Turkey, and archaeologists have been digging there for more than a hundred and fifty years. And this month, Turkey's culture minister announced something nobody had ever pulled out of that hill. A piece of a flute. Made of bone. About two thousand eight hundred years old.", null, { pessoas: ['Homer'], naoSeres: ['Troy', 'Hisarlik', 'Turkey', 'Iliad'] }),
  b('acce4a3c', 'Did they finally find Amelia Earhart\'s plane? On July second, 1937, Amelia Earhart and her navigator Fred Noonan vanished over the Pacific. She was thirty-nine, trying to become the first woman to fly around the world. They never reached Howland Island. About four hundred miles away sits a tiny island called Nikumaroro. In 2020, a satellite spotted something strange in its lagoon. They called it the Taraia Object. This month, a team backed by Purdue University sailed out to finally touch it. And the answer was... trees.', null, { pessoas: ['Amelia Earhart', 'Fred Noonan'], naoSeres: ['Nikumaroro', 'Howland Island', 'Taraia Object', 'Purdue University', 'Pacific'] }),
  b('cfc55fc2', "What if time travel isn't just science fiction? In 1941, a physicist named Kurt Gödel suggested it could be real. He discovered solutions to Einstein's equations that allow for time loops. These solutions... imply that under certain conditions, time travel is mathematically possible.", null, { pessoas: ['Kurt Gödel', 'Einstein'] }),
  b('94902363', 'Hoje à noite vai chover cometa no Brasil. Isso mesmo. Hoje, de vinte e um para vinte e dois de outubro, é o pico das Orionídeas, a chuva de meteoros que vem do cometa Halley. O Halley passa perto do Sol a cada setenta e poucos anos e deixa um rastro de poeira pelo caminho. Todo outubro, a Terra atravessa esse rastro. E o Halley em pessoa? Só volta em 2061.', null, { naoSeres: ['Halley', 'Brasil', 'Orionídeas', 'Terra', 'Sol'] }),
  b('4b3b7668', "In March 1922, footprints in fresh snow led from the Bavarian forest to Hinterkaifeck farm, but none returned. Inexplicably, a Munich newspaper appeared in Hinterkaifeck, alarming the Gruber family who hadn't bought it, deepening their fears of an intruder. On March 31, 1922, four family members were lured to the barn and murdered in cold blood. Before the tragic events, the Gruber family's maid resigned, terrified by mysterious footsteps echoing from the attic during the night. Despite thorough investigations, the Hinterkaifeck murders remain an unsolved mystery, haunting the Bavarian woods to this day.", null, { pessoas: ['Andreas Gruber', 'Gruber'], naoSeres: ['Hinterkaifeck', 'Munich', 'Bavarian'] }),
  b('54fde4c4', 'In the summer of 480 BC, the largest army the world had ever seen marched into Greece. King Xerxes of Persia brought well over a hundred thousand men. Waiting for him at a narrow pass called Thermopylae stood King Leonidas of Sparta, with three hundred Spartans and a few thousand Greek allies. Xerxes sent a message: lay down your weapons. Leonidas answered: "Come and take them." For two days, the pass held. A Spartan named Dienekes was warned that the Persian arrows would blot out the sun. He smiled: "Good. Then we will fight in the shade." Leonidas sent most of the allies home. He stayed, with his three hundred.', null, { pessoas: ['Leonidas', 'King Leonidas', 'Xerxes', 'King Xerxes', 'Dienekes'], naoSeres: ['Thermopylae', 'Sparta', 'Persia', 'Greece'] }),
  b('f14f4aa2', '79 AD. The Bay of Naples. Across the water, Mount Vesuvius explodes. A giant cloud shaped like a pine tree rises into the sky. That is how a seventeen-year-old named Pliny the Younger described it. His uncle, Pliny the Elder, commands the Roman fleet. A message arrives from a woman named Rectina. Her villa sits right under the volcano. She begs for rescue. Pliny orders the warships out. Pliny refuses. "Fortune favors the brave." Across the bay, Pompeii disappears under the ash.', null, { pessoas: ['Pliny the Elder', 'Pliny the Younger', 'Pliny', 'Rectina'], naoSeres: ['Vesuvius', 'Mount Vesuvius', 'Naples', 'Pompeii', 'Stabiae'] }),
  b('9888d70f', 'Is the Black Death back in Russia? Last week, a twenty-eight-year-old researcher in Siberia died. She worked at the Irkutsk Anti-Plague Institute, a lab that studies dangerous germs. Within days, nearly two hundred people were put under medical observation. Even the US Secretary of State, Marco Rubio, said it could quickly spread. The World Health Organization says no dangerous pathogens were found in any of her contacts.', null, { pessoas: ['Marco Rubio'], naoSeres: ['Black Death', 'Russia', 'Siberia', 'Irkutsk Anti-Plague Institute', 'World Health Organization'] }),
)

// ── quem o EPISÓDIO ESCRITO segue (o filtro de assunto) ──
export const EPISODIOS: CasoEpisodio[] = [
  { id: 'ep-roland-fiel', fonte: 'guardiao', titulo: 'The Letter With No Stamp', script: 'HOOK\nRoland never expected the letter to answer back.\nMICRO REWARD\nThe paper was warm. Roland read the first line twice. It was written in his own handwriting.\nESCALATION\nMore letters came.\nPAYOFF\nThe last one was dated tomorrow.', segue: 'Roland' },
  { id: 'ep-mia', fonte: 'guardiao', titulo: 'A Gift Beyond Time', script: 'HOOK\nWhat happens when a forgotten toy comes to life?\nMICRO REWARD\nThe little girl, named Mia, hugs her glowing teddy bear.\nESCALATION\nShe runs.\nPAYOFF\nShe smiles.', segue: 'Mia' },
  { id: 'ep-luna', fonte: 'revisao-1', titulo: 'The Girl Who Found the Box', script: 'HOOK\nLuna, a curious girl, finds Roland’s old mailbox.\nMICRO REWARD\nLuna opens it. Luna reads the letter aloud.\nPAYOFF\nLuna smiles.', segue: 'Luna' },
  { id: 'ep-roland-luna-passagem', fonte: 'revisao-1', titulo: 'The Letter', script: 'HOOK\nRoland never expected the letter to answer back.\nMICRO REWARD\nLuna, a curious girl, waves at him. Roland tears the envelope open and reads it on the porch.', segue: 'Roland' },
  { id: 'ep-tofu', fonte: 'revisao-1', titulo: 'A Gift Beyond Time', script: 'HOOK\nWhat if a forgotten toy came to life?\nMICRO REWARD\nA teddy bear named Tofu wakes up. Tofu hugs the robot. Tofu runs away.', segue: 'Tofu' },
  { id: 'ep-while-roland-slept', fonte: 'revisao-3', titulo: 'The Mailbox at Night', script: 'HOOK\nWhile Roland slept, Mia opened the mailbox.\nMICRO REWARD\nMia read the letter. Mia ran to the forest.\nPAYOFF\nMia never came back.', segue: 'Mia' },
  { id: 'ep-this-time-roland', fonte: 'revisao-2', titulo: 'The Second Letter', script: 'HOOK\nThe letter came back.\nMICRO REWARD\nThis time, Roland did not wait. He tore it open and read every word.', segue: 'Roland' },
  { id: 'ep-naquela-noite', fonte: 'revisao-2', titulo: 'A segunda carta', script: 'HOOK\nA carta voltou.\nMICRO REWARD\nNaquela noite, Roland abriu a carta. Roland leu tudo duas vezes.', segue: 'Roland' },
]

const nomeDe = (ficha: string) => ficha.split(',')[0].trim()
const casa = (nome: string, lista: readonly string[] | undefined) => (lista ?? []).some((x) => mesmoSer(x, nome) || x.toLowerCase() === nome.toLowerCase())
/** Palavra de espécie que transforma pessoa real em coisa/criatura (só para o relatório da calibração). */
const ESPECIE_COISA = /\b(?:object|thing|creature|monster|ghost|dragon|beast|animal|machine|robot|place|city|town|ship|planet|company)\b/i

async function main() {
  const respostas = new Map<string, string>()
  const fetchGravando = (id: string): typeof fetch => (async (url: RequestInfo | URL, init?: RequestInit) => {
    const res = await fetch(url, init)
    const corpo = await res.text()
    try { const j = JSON.parse(corpo); respostas.set(id, j?.choices?.[0]?.message?.content ?? '') } catch { respostas.set(id, corpo.slice(0, 200)) }
    return new Response(corpo, { status: res.status, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch

  const resultados: Array<Record<string, unknown>> = []
  let positivos = 0, acertosPos = 0, fpGrave = 0, fpLeve = 0, negativos = 0, negOk = 0, falhas = 0, dupl = 0
  for (const c of CASOS) {
    const r = await lerFichaDoFilme({ pedido: c.pedido, narracao: c.narracao }, { apiKey: chave, fetchImpl: fetchGravando(c.id) })
    const fichas = r.aplicada?.fichas ?? []
    const nomes = fichas.map(nomeDe)
    if (!r.aplicada) falhas += 1
    const aceitos = [...(c.protagonista ?? []), ...(c.coadjuvantes ?? [])]
    const graves: string[] = []
    const leves: string[] = []
    for (const nm of nomes) {
      if (casa(nm, c.naoSeres)) { graves.push(`${nm} (coisa/lugar/metáfora)`); continue }
      if (casa(nm, aceitos)) continue
      if (casa(nm, c.pessoas)) { leves.push(`${nm} (pessoa real em filme sem personagem)`); continue }
      graves.push(`${nm} (personagem inventado/não rotulado)`)
    }
    // pessoa real virando coisa/criatura
    for (const f of fichas) if (casa(nomeDe(f), c.pessoas) && ESPECIE_COISA.test(f.slice(nomeDe(f).length))) graves.push(`${nomeDe(f)} (pessoa real virou coisa/criatura: ${f})`)
    if (c.umaFicha && nomes.filter((x) => x.toLowerCase().includes(c.umaFicha!.toLowerCase())).length > 1) { graves.push(`${c.umaFicha} em duas fichas`); dupl += 1 }
    let acerto: boolean | null = null
    if (c.protagonista && !c.opcional) {
      positivos += 1
      acerto = r.aplicada?.formato === 'story' && nomes.length > 0 && casa(nomes[0], c.protagonista)
      if (acerto) acertosPos += 1
    } else if (!c.protagonista) {
      negativos += 1
      if (!nomes.length) negOk += 1
    }
    fpGrave += graves.length ? 1 : 0
    fpLeve += !graves.length && leves.length ? 1 : 0
    const linha = { id: c.id, fonte: c.fonte, esperado: { protagonista: c.protagonista, coadjuvantes: c.coadjuvantes ?? [], opcional: c.opcional ?? false }, obtido: { formato: r.aplicada?.formato ?? null, fichas, origem: r.auditoria.origem, erro: r.auditoria.erro, ms: r.auditoria.ms, tentativas: r.auditoria.tentativas }, acerto_positivo: acerto, fp_grave: graves, fp_leve: leves }
    resultados.push(linha)
    console.log(`${graves.length ? 'GRAVE' : acerto === false ? 'ERRO ' : '  ok '} ${c.id.padEnd(24)} ${r.aplicada?.formato ?? 'FALHA'} ${JSON.stringify(fichas)}${graves.length ? ' ← ' + graves.join('; ') : ''}${leves.length ? ' (leve: ' + leves.join('; ') + ')' : ''}`)
  }
  const eps: Array<Record<string, unknown>> = []
  let epOk = 0
  for (const e of EPISODIOS) {
    const lido = await protagonistaDoEpisodio({ title: e.titulo, script: e.script }, { apiKey: chave, fetchImpl: fetchGravando(e.id), tentativas: 1 })
    const ok = e.segue === null ? lido === null : typeof lido === 'string' && (mesmoSer(lido, e.segue) || lido.toLowerCase().includes(e.segue.toLowerCase()))
    if (ok) epOk += 1
    eps.push({ id: e.id, fonte: e.fonte, esperado: e.segue, obtido: lido ?? (lido === null ? null : 'nao_lido'), ok })
    console.log(`${ok ? '  ok ' : 'ERRO '} ${e.id.padEnd(24)} segue ${JSON.stringify(lido)} (esperado ${e.segue})`)
  }
  const resumo = {
    casos: CASOS.length,
    positivos,
    acertos_positivos: acertosPos,
    taxa_positivos: positivos ? Math.round((acertosPos / positivos) * 1000) / 10 : null,
    negativos,
    negativos_sem_ficha: negOk,
    falsos_positivos_graves: fpGrave,
    falsos_positivos_leves: fpLeve,
    duplicatas: dupl,
    falhas_seguras: falhas,
    episodios: EPISODIOS.length,
    episodios_ok: epOk,
    meta: '0 falso positivo grave e >= 85% de acerto nos positivos',
    meta_ok: fpGrave === 0 && positivos > 0 && acertosPos / positivos >= 0.85,
  }
  console.log('\n' + JSON.stringify(resumo, null, 2))
  const doc = {
    marcador: 'KINEO-PROXIMO-EPISODIO-0111',
    versao: FICHA_SEMANTICA_VERSAO,
    rodado_em: new Date().toISOString(),
    modelo: 'AI_TEXT_MODELS.utility (gpt-4o-mini), temperature 0, json_schema strict',
    sistema_sha: (await import('node:crypto')).createHash('sha256').update(FICHA_SISTEMA).digest('hex'),
    regua: 'positivo = protagonista certo em formato story; FP grave = coisa/lugar/metáfora/organização virando ficha, nome que não estava rotulado como personagem, pessoa real virando coisa/criatura, ou a mesma pessoa em duas fichas; FP leve = pessoa real nomeada virando ficha num filme sem personagem (não acontece: factual não gera ficha)',
    resumo,
    casos: CASOS.map((c) => ({ ...c, resposta_do_modelo: respostas.get(c.id) ?? null })),
    episodios: EPISODIOS.map((e) => ({ ...e, resposta_do_modelo: respostas.get(e.id) ?? null })),
    resultados,
    resultados_episodios: eps,
  }
  fs.mkdirSync(path.dirname(SAIDA), { recursive: true })
  fs.writeFileSync(SAIDA, JSON.stringify(doc, null, 1) + '\n')
  console.log(`gravado ${SAIDA}`)
  if (!resumo.meta_ok) process.exit(1)
}
await main()
