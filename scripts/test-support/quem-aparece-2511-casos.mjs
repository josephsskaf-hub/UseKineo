// KINEO-QUEM-APARECE-2511 — os casos da régua (a mesma lista vai à sonda da casa, /api/admin/sonda-presenca). NENHUM texto de cliente: tudo aqui é meu.
//   · parte_b (61): remontados por MIM dos grupos e exemplos do §2 do parecer da revisora (docs/revisoes-2311/CEO-PARTE-B-PRIMEIRO-NOME-2511.md); a lista
//     exata dela fica com ela (CEO 25/11 08:40). O filme base é o do 499143ac em paráfrase minha (Elias e o 2º personagem); só o plano 4 varia.
//   · amostra (18): os 18 planos da amostra do diagnóstico (DIAGNOSTICO-REPETICAO-E-REGISTRO-2511.md §2), PARAFRASEADOS (7 claros: sem a pessoa; 8 falsos: com
//     ela; 3 duvidosos: sem gabarito, a sonda só conta);
//   · lingua (4): pronome e outra língua (CEO 25/11 08:40, item 3);
//   · filmes (3): Alcatraz, Umudara e Shiro, em paráfrase minha, com o gabarito por plano.
// `esperado`: por plano, por pessoa do elenco, true (visível), false (ausente) ou null (sem gabarito).
// [volta 2, CEO 25/11 11:55 (b)] cada pessoa leva a `descricao` curta que a rota tem na ficha (a canônica, sem o nome). As descrições são MINHAS e neutras:
// nenhuma copia a palavra do plano que o leitor errou (o rapaz de f2 não tem capuz; o menino de l3 não diz "Junge").
const ELIAS = { nome: 'Elias Ward', tipo: 'humano', genero: 'man', descricao: 'a weathered lighthouse keeper in his fifties with a grey beard and a dark wool coat', protagonista: true }
const DESCRICAO_DO_2O = { woman: 'a harbor office clerk in her thirties with short dark hair and a yellow raincoat', man: 'a harbor office clerk in his forties with a flat cap and a navy sweater' }
const pessoa = (nome, genero = 'woman', descricao = DESCRICAO_DO_2O[genero] ?? null) => ({ nome, tipo: 'humano', genero, descricao })
const p = (fala, marcador = '', visual = '') => ({ fala, marcador, visual })
const BASE_B = (x) => [p('Elias climbs the lighthouse stairs at dusk.', 'old lighthouse stairs at dusk'), p(`${x} answers the radio in the harbor office.`, 'harbor office radio'), p('Elias lights the great lamp.', 'lighthouse lamp')]
const caso = (id, grupo, segundo, plano4, visivel, extra = {}) => ({ id, grupo, autor: 'autor-do-motor (remontado do §2 da revisora)', elenco: [ELIAS, segundo],
  planos: [...BASE_B(segundo.nome.split(' ')[0]), p(plano4, extra.marcador ?? '')], esperado: [[true, false], [false, true], [true, false], [null, visivel]] })
const MARA = pessoa('Mara Quinn')
let n = 0
const B = (grupo, segundo, plano4, visivel, extra) => caso(`b${++n}`, grupo, segundo, plano4, visivel, extra)
export const PARTE_B = [
  B('mesmo_prenome', MARA, 'Mara Stone, a stranger who shares her first name, waits on the pier while Elias watches.', false),
  B('mesmo_prenome', MARA, 'Elias greets Mara Quinn at the door.', true),
  B('mesmo_prenome', MARA, 'Mara and Elias walk along the harbor.', true),
  B('nucleo_prenome', MARA, 'The radio crackles as Mara turns the dial.', true),
  B('nucleo_prenome', MARA, 'Elias hands the lamp to Mara, who lights it.', true),
  ...[['Grace Hale', 'Grace fills every movement Elias makes.'], ['Hope Quinn', 'Hope rises in Elias as the storm clears.'], ['Hope Quinn', 'Elias turns, hope rising in his chest.'],
    ['Will Ames', 'Will the boat make it?'], ['May Lin', 'May the sea be calm tonight.'], ['Rose Hart', 'Rose petals float on the dark water.'], ['Mark Doyle', 'Mark the spot where the boat sank.'],
    ['Faith Ross', 'Faith keeps Elias at his post.'], ['Summer Cole', 'Summer light floods the empty harbor.'], ['Dawn Price', 'Dawn breaks over the empty harbor.'], ['Joy Reyes', 'Joy spreads across the village square.'],
    ['Iris Vale', 'Iris flowers bloom by the lighthouse.'], ['Ruby Shaw', 'Ruby light glows from the lamp.'], ['Amber Fox', 'Amber clouds drift over the cliffs.'], ['Daisy Moore', 'Daisy chains hang from the fence.'],
    ['Bill Ortiz', 'Bill the ferryman rows past the rocks while Elias waves.'], ['Frank Lowe', 'Frank winds batter the tower.'], ['Jack Byrne', 'Jack the cat sleeps by the stove.'], ['Hope Quinn', 'Elias waits, hope fading as night falls.']]
    .map(([nome, t]) => B('palavra_comum', pessoa(nome, nome.startsWith('Bill') || nome.startsWith('Will') || nome.startsWith('Mark') || nome.startsWith('Frank') || nome.startsWith('Jack') ? 'man' : 'woman'), t, false)),
  ...["Mara's radio sits alone on the desk.", 'Mara’s chair is empty tonight.', "Elias holds Mara's old scarf.", "Elias and Mara's dog walk the beach.", "Mara's boat drifts empty in the bay."].map((t) => B('posse_ausente', MARA, t, false)),
  B('fala_lembranca', MARA, "Elias whispers: 'Mara, come home.'", false),
  B('fala_lembranca', MARA, 'Elias stares at the sea, thinking of Mara.', false),
  B('fala_lembranca', MARA, 'In a memory, Mara laughs on the pier.', true),
  ...['Mara speaks over the radio while Elias listens alone.', 'Mara calls over the radio, Elias alone in the tower.', 'Mara, on the radio, guides him through the storm.', 'Mara is heard on the radio.',
    'Mara can only be heard, never seen.', 'Mara calls from the next room.', 'Off-screen, Mara calls his name.'].map((t) => B('voz_fora', MARA, t, false)),
  ...["Mara isn't in the room.", 'Mara is gone.', 'Mara has left the room.', 'Mara does not appear in this shot.', 'Mara never arrives.', 'Mara is away at sea.', 'Mara, absent tonight, is missed by Elias.',
    'Mara is out of frame.', 'Elias is alone; Mara is in the city.', 'Mara is not present.', 'Mara remains absent.', 'Mara is nowhere to be seen.'].map((t) => B('ausencia', MARA, t, false)),
  ...['Mara and Elias watch the small boat reach the harbor.', 'Mara, a young radio operator, listens to the static.', 'Mara runs up the stairs.', 'Elias hugs Mara at the door.', 'Mara waves from the pier.',
    'Mara alone tends the lamp tonight.'].map((t) => B('presenca', MARA, t, true)),
  B('pronome_lingua', MARA, 'She runs to the window and waves at him.', true),
  B('pronome_lingua', MARA, 'Ele sobe a escada sozinho e acende a lâmpada.', false),
  B('pronome_lingua', MARA, 'Mara sorri e acena do cais.', true),
  B('pronome_lingua', MARA, 'Mara winkt vom Steg und lacht.', true),
]

const um = (id, grupo, quem, plano, visivel) => ({ id, grupo, autor: 'autor-do-motor (paráfrase da amostra do diagnóstico)', elenco: [quem], planos: [plano], esperado: [[visivel]] })
const ser = (nome, tipo = 'criatura', descricao = null) => ({ nome, tipo, genero: null, descricao })
export const AMOSTRA = [
  um('a1', 'claro', ser('Building', 'criatura', 'a tall glass office tower with a friendly cartoon face'), p('The impact pushed out an enormous wall of water.', 'coastline aerial'), false),
  um('a2', 'claro', pessoa('the boy', 'man', 'a ten-year-old boy with curly hair and a red hoodie'), p('Beyond the gate lies a world made of candy!', 'candy land'), false),
  um('a3', 'claro', ser('Banana', 'criatura', 'a cartoon banana with big round eyes and a green cap'), p('Three long weeks on this shelf!', 'Broccoli glares at Avocado on the top shelf'), false),
  um('a4', 'claro', ser('Broccoli', 'criatura', 'a cartoon broccoli with a grumpy face and tiny arms'), p("I'm done with all of this!", 'Banana throws a badge on the floor'), false),
  um('a5', 'claro', ser('Banana', 'criatura', 'a cartoon banana with big round eyes and a green cap'), p('', 'the supermarket lights dim over the vegetable aisle as Broccoli opens his eyes'), false),
  um('a6', 'claro', pessoa('the thief', 'man', 'a slim man in a black turtleneck and black gloves'), p('The famous painting vanished on a Monday morning, and nobody noticed until the next day.', 'empty frame on a museum wall'), false),
  um('a7', 'claro', pessoa('Noah', 'man', 'an old man with a long white beard and brown robes'), p('Imagine housing so many creatures on one boat.', 'wooden ark filled with animals'), false),
  um('f1', 'falso', ser('the shrimp', 'animal', 'a small mantis shrimp with a bright rainbow shell'), p('This tiny animal has one of the fastest punches on Earth.', 'tiny animal punching'), true),
  um('f2', 'falso', pessoa('a young man', 'man', 'a young man in his twenties with short brown hair and a plain grey jacket'), p('A hooded figure slips into the dark, unnoticed.', 'hooded figure on a cobblestone street'), true),
  um('f3', 'falso', pessoa('a young man', 'man', 'a young man in his twenties with short brown hair and a plain grey jacket'), p('Dropping into murky water, he scares the rats away.', 'dark sewer, rats scurrying'), true),
  um('f4', 'falso', ser('the griffin', 'criatura', 'a griffin with an eagle head, golden wings and a lion body'), p('It climbs toward the sacred mountain, above the clouds.', 'mythical mountain peak, starry sky'), true),
  um('f5', 'falso', pessoa('Jason', 'man', 'a man in his thirties with a buzz cut and a brown leather jacket'), p('Chaos erupts as the police chase him through the city.', 'high-speed car chase'), true),
  um('f6', 'falso', pessoa('Dube', 'man', 'a middle-aged man in a blue work shirt'), p('By 9:55 the SUV gleams, and Mr. Dube smiles at it.', 'sparkling SUV in the sun'), true),
  um('f7', 'falso', ser('Krishna', 'criatura', 'a blue-skinned child with a peacock feather crown and a golden necklace'), p('Under an indigo sky, a tiny blue-skinned child appears.', 'night sky with embers'), true),
  um('f8', 'falso', ser('Krishna', 'criatura', 'a blue-skinned child with a peacock feather crown and a golden necklace'), p('The blue-skinned child grows into a giant cosmic form.', 'glowing mandala, a giant cosmic form rises'), true),
  um('d1', 'duvidoso', ser('Moon', 'criatura', 'the moon with a gentle cartoon face'), p('For five seconds, the whole night sky would change.', 'dark city skyline, earth from space'), null),
  um('d2', 'duvidoso', pessoa('Jack', 'man', 'a blocky toy-like boy with a long wooden nose'), p('In this world, every lie makes your head grow!', 'blocky toy-like cityscape'), null),
  um('d3', 'duvidoso', pessoa('Rudo', 'man', 'a young office worker with round glasses'), p('The alarm buzzes. The calendar reads: client meeting at ten.', 'phone light in a dark room'), null),
]
export const LINGUA = [
  um('l1', 'pronome', pessoa('the old man', 'man', 'an old man with a wooden cane and a grey cardigan'), p('He walks slowly to the door and opens it.', 'old wooden door'), true),
  um('l2', 'lingua', pessoa('the confident woman', 'woman', 'a confident woman in her thirties with sunglasses and a red dress'), p('Uma mulher dirige um carro esportivo vermelho pela avenida.', 'red convertible on a neon boulevard'), true),
  um('l3', 'lingua', pessoa('the boy', 'man', 'a twelve-year-old boy with freckles and a blue backpack'), p('Ein Junge kauft einen alten Zoo für 1000 Euro.', 'old run-down zoo gate'), true),
  um('l4', 'lingua', pessoa('the investigator', 'man', 'a middle-aged investigator in a beige trench coat'), p('Un investigador encuentra un manuscrito imposible.', 'abandoned library'), true),
]
// os 3 filmes: `visual` = o plano que o NOSSO escritor gerou (paráfrase do que foi ao motor); o marcador e a fala = o autor (paráfrase)
export const FILMES = {
  alcatraz: { id: 'alcatraz', elenco: [{ nome: 'the guard', tipo: 'humano', genero: null, descricao: 'a stern prison guard in a grey uniform and cap' }], planos: [
    p('Three prisoners disappeared from the island prison without a trace.', 'island prison aerial', 'Main subject clearly visible in frame: three prisoners escaping from a prison. A close-up of a rusted cell door at the island prison.'),
    p('The guards swore nobody ever leaves the Rock.', 'cartoon guard at the prison gate', 'A close-up of a guard standing at the prison gate, stern and watchful.'),
    p('Their bodies were never found, and the mystery stayed open.', 'dark ocean waves at night', 'A tracking shot through a dark prison corridor with empty cells, hinting at the lost prisoners.')],
    esperado: [[false], [true], [false]] },
  umudara: { id: 'umudara', elenco: [{ nome: 'the mysterious warrior', tipo: 'humano', genero: 'man', descricao: 'a warrior in a dark hooded cloak riding a black horse' }], planos: [
    p('A hooded warrior rides toward a great kingdom.', 'warrior rides toward a kingdom', 'A lone warrior on horseback approaches a majestic kingdom at sunset.'),
    p('Ten years ago the kingdom buried its prince, believing he was dead. Now he returns for revenge.', 'misty ruins, revenge', 'The warrior rides through misty ruins under gathering dark clouds.'),
    p('The adviser whispers to the king: the man we buried has returned. The king answers: impossible.', 'adviser whispers to the king', 'In a grand palace, an adviser leans close to the king, both of them tense.')],
    esperado: [[true], [true], [false]] },
  shiro: { id: 'shiro', elenco: [{ nome: 'Shiro', tipo: 'humano', genero: 'man', descricao: 'a confident man in a white suit and dark sunglasses' }], planos: [
    p('Shiro drives his black luxury car through a dense jungle.', 'dense jungle', 'A black luxury car drives through a dense jungle.'),
    p('Suddenly a powerful panther appears in front of Shiro and growls.', 'panther in jungle, panther growling', 'A powerful panther emerges from the underbrush, glaring at the camera.'),
    p('Shiro smiles: let us be friends! Behind him, a convoy of cars arrives.', 'convoy of cars', 'Shiro smiles confidently as a convoy of cars approaches behind him.')],
    esperado: [[true], [false], [true]] },
}
/** [volta 2] os planos do gabarito em que aparecem outras pessoas claramente distintas do elenco (o resto: 'none'). */
export const OUTROS_DO_CASO = { alcatraz: ['distinct_people', 'none', 'none'], umudara: ['none', 'none', 'distinct_people'], b1: [null, null, null, 'distinct_people'] }
/** Os 5 casos em que a 1ª leitura TIROU quem estava (CEO 25/11 11:55): nenhum deles pode dar `no` na nova passada. */
export const NUNCA_NO = ['f2', 'f4', 'f5', 'l3', 'l4']
/** A leitura "certa" de um caso, no formato do modelo (para injetar na rede falsa): o gabarito; sem gabarito = 'unclear'. */
export function leituraCerta(c) {
  return JSON.stringify({ shots: c.esperado.map((linha, i) => ({ shot: i + 1, others: OUTROS_DO_CASO[c.id]?.[i] ?? 'none', cast: linha.map((v, k) => ({ id: k + 1, on_screen: v === true ? 'yes' : v === false ? 'no' : 'unclear', how: v === true ? 'shown' : v === false ? 'not_mentioned' : 'not_mentioned' })) })) })
}
/** Os corpos da sonda (um POST por caso), na ordem: parte B, amostra, língua, filmes. */
export const CORPOS_DA_SONDA = [...PARTE_B, ...AMOSTRA, ...LINGUA, ...Object.values(FILMES)].map((c) => ({ id: c.id, corpo: { elenco: c.elenco, planos: c.planos } }))
