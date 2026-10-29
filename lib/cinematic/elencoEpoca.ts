// [TRAVA 8.2 — vai do fundador 27/10 "faz todos esses consertos de 1 a 6"] KINEO-ELENCO-EPOCA-2710 — ELENCO NOMEADO, ÉPOCA E FALSOS AMIGOS // KINEO-ELENCO-EPOCA-2710
// // KINEO-ELENCO-EPOCA-2710
// Três defeitos medidos no filme grátis de 15 s (Seedance 1.5, estrada clássica, 3 cenas), 27/10: // KINEO-ELENCO-EPOCA-2710
//   A. PERSONAGEM NOMEADO NUNCA APARECE (item 4): o conto urdu da Amna, do dragãozinho Mishu e do Baba Noor saiu com o dragão nas // KINEO-ELENCO-EPOCA-2710
//      3 cenas e NENHUMA menina/velho; "The last train… his full name" sem o passageiro; "Francisco Fernando e Sofia" sem a Sofia. // KINEO-ELENCO-EPOCA-2710
//      Causa: o elenco do 15 s (lib/filmes/filme15Elenco) só lê inglês nos visuais e o escritor de cenas elege um só personagem; o // KINEO-ELENCO-EPOCA-2710
//      ORDEM_DO_PROTAGONISTA ("any other person … is replaced by this same character") ainda expulsa quem sobrou. // KINEO-ELENCO-EPOCA-2710
//   B. ÉPOCA IGNORADA (item 6a): "In 1953, James Turner vanished… his car was found running" saiu com moletom e carro de hoje. // KINEO-ELENCO-EPOCA-2710
//      Causa: o eraLockSuffix da rota só lê 1000–1939 e só NEGA ("no cars") — nada diz como é 1953. // KINEO-ELENCO-EPOCA-2710
//   C. TRADUÇÃO LITERAL (item 6b): "Geli, a geleia roxa" virou uma ÁGUA-VIVA (jellyfish) na imagem. // KINEO-ELENCO-EPOCA-2710
// // KINEO-ELENCO-EPOCA-2710
// O QUE ISTO FAZ (puro, sem rede, determinístico — mesmo texto → mesmo resultado): // KINEO-ELENCO-EPOCA-2710
//   · epocaDaHistoria: ano (1800–2009, dígitos latinos ou árabe-índicos) ou década ("the 1950s", "anos 50", "années 50", "50er") nas // KINEO-ELENCO-EPOCA-2710
//     palavras da história → pista POSITIVA de figurino/veículos/objetos da década em TODA cena (o sufixo negativo da rota continua). // KINEO-ELENCO-EPOCA-2710
//   · personagensNomeados: lê o texto EM INGLÊS (o original quando é inglês; a tradução que a rota já memoiza — assuntoTraduzido — // KINEO-ELENCO-EPOCA-2710
//     nas outras línguas e escritas) e acha quem AGE: nome como sujeito de verbo, possessivo, fala, aposto com ser ("Mishu, the little // KINEO-ELENCO-EPOCA-2710
//     dragon"), título/parentesco ("Baba Noor"). Cada um ganha UMA descrição curta e fixa; o protagonista é quem mais age. // KINEO-ELENCO-EPOCA-2710
//   · aplicarElencoEEpoca: cena cujo prompt final não cita o nome ganha "Named character in this shot: …" — na cena cuja FALA o cita // KINEO-ELENCO-EPOCA-2710
//     (línguas latinas) ou na cena da posição do texto (escritas que não casam, como o urdu). Protagonista sem nome ("a tired // KINEO-ELENCO-EPOCA-2710
//     commuter") entra na cena 1 quando nenhum prompt mostra gente. A ordem "só o protagonista" e o "No people" saem da cena que ganha // KINEO-ELENCO-EPOCA-2710
//     alguém. Faceless (sem tag): a pessoa entra de costas/perfil, como manda a política; com a tag [faceless]: nada de elenco. // KINEO-ELENCO-EPOCA-2710
//   · corrigirFalsosAmigos: história em PT/ES/FR/IT com "geleia/gelatina/jalea/gelée" e sem água-viva → "jellyfish" no prompt vira // KINEO-ELENCO-EPOCA-2710
//     criatura de gelatina. Tabela pequena, só casos conhecidos. // KINEO-ELENCO-EPOCA-2710
// Sem nome, sem época e sem falso amigo: os prompts voltam byte a byte. Guardião: scripts/test-elenco-epoca-2710.mjs. // KINEO-ELENCO-EPOCA-2710
import { sanitizeRealPeople } from '@/lib/hollywood/router' // KINEO-ELENCO-EPOCA-2710 — pessoa real famosa nunca vira "named character" (sem semelhança)
import { figuraFiel, descricaoFielDoSer } from '@/lib/cinematic/seresFieis' // KINEO-JUIZ-REFAZ-2810 — anatomia fiel por espécie + figuras conhecidas: o mascote ("big round friendly eyes and a short tail") morreu aqui
import { semRotulosDeSecao, PALAVRAS_DE_SECAO, pessoasPossessivas, falaCitaPessoa, cenaMostraPessoa } from '@/lib/cinematic/pessoasDaNarracao' // KINEO-ELENCO-MARCADOR-2910

export const MARCA_ELENCO_EPOCA = 'KINEO-ELENCO-EPOCA-2710' // KINEO-ELENCO-EPOCA-2710
export const ELENCO_EPOCA_VERSAO = 'elenco_epoca_v1' // KINEO-ELENCO-EPOCA-2710
export const ELENCO_EPOCA_MAX_PERSONAGENS = 3 // KINEO-ELENCO-EPOCA-2710
export const ELENCO_EPOCA_MAX_POR_CENA = 2 // KINEO-ELENCO-EPOCA-2710
/** Teto do prompt da fal (2.500): pista de época e elenco nunca estouram; acima disso a forma curta, depois nada (relato diz). */ // KINEO-ELENCO-EPOCA-2710
export const ELENCO_EPOCA_TETO_PROMPT = 2500 // KINEO-ELENCO-EPOCA-2710

export type ModoVisualDoElenco = 'documentary_faceless' | 'character_story' | 'presenter' // KINEO-ELENCO-EPOCA-2710

// ═══ 1. ÉPOCA ═════════════════════════════════════════════════════════════════════════════════════════════════════ // KINEO-ELENCO-EPOCA-2710
export interface Epoca { ano: number | null; decada: number; rotulo: string; origem: 'ano' | 'decada' } // KINEO-ELENCO-EPOCA-2710

const digitosAscii = (t: string): string => t.replace(/[٠-٩۰-۹]/g, (c) => String(c.charCodeAt(0) & 0xf)) // KINEO-ELENCO-EPOCA-2710 — ۱۹۵۳ → 1953
const RESOLUCAO_RE = /\b(?:resolution|resolução|resolucao|resolución|resolucion|res)\s*[:=]?\s*\d{3,4}(?:\s*(?:[×✕*xX]|by|por)\s*\d{3,4})?|\b\d{3,4}\s*(?:[×✕*xX]|by|por)\s*\d{3,4}\b|\b\d{3,4}\s*(?:p|px|pixels?|fps|hz)\b/gi // KINEO-ELENCO-EPOCA-2710 — a mesma régua da rota: 1080 × 1920 não é ano
const ANO_RE = /(?<![\p{L}\p{N}$€£#.,:/+-])((?:1[89]|20)\d{2})(?![\p{N}]|[.,]\d|\s*(?:%|dollars?|usd|euros?|reais|pesos|rupees|rupias|km|kg|m\b|meters?|metres?|metros|miles?|feet|ft|people|men|women|soldiers?|troops|units?|copies|views|followers|subscribers|likes|calories|pounds|lbs|tons?|toneladas|hp|cc|mm|cm|words?|pages?|palavras|páginas|pessoas|homens|soldados|personas|hombres|years?\s+old|anos|años|ani))/giu // KINEO-ELENCO-EPOCA-2710
const DECADA_RES: ReadonlyArray<RegExp> = [ // KINEO-ELENCO-EPOCA-2710 — 4 dígitos sempre valem; 2 dígitos só com a palavra de década por perto
  /(?<![\p{L}\p{N}])((?:1[89]|20)\d0)(?:s|['’]s)(?![\p{L}\p{N}])/giu, // KINEO-ELENCO-EPOCA-2710 — "1950s"
  /\b(?:the|early|late|mid|mid-)\s+['’]?(\d0)s\b/giu, // KINEO-ELENCO-EPOCA-2710 — "the '50s", "early 50s"
  /\b(?:anos|años|década\s+de(?:\s+los)?|decada\s+de|années|anni|anii)\s+(?:de\s+)?['’]?((?:1[89]|20)?\d0)\b/giu, // KINEO-ELENCO-EPOCA-2710 — PT/ES/FR/IT/RO
  /\b((?:1[89]|20)?\d0)er(?:[- ]?jahren?)?\b/giu, // KINEO-ELENCO-EPOCA-2710 — DE "50er Jahre"
] // KINEO-ELENCO-EPOCA-2710
/** Ano explícito ≥ 2015 na história = há um "hoje" no texto; duas épocas → não travar nenhuma. */ // KINEO-ELENCO-EPOCA-2710
const ANO_PRESENTE_MIN = 2015 // KINEO-ELENCO-EPOCA-2710
const ANO_EPOCA_MAX = 2009 // KINEO-ELENCO-EPOCA-2710
const ANO_EPOCA_MIN = 1800 // KINEO-ELENCO-EPOCA-2710

function rotuloDaDecada(decada: number): string { return decada >= 1900 ? `${decada}s` : `${Math.floor(decada / 100) + 1}th-century` } // KINEO-ELENCO-EPOCA-2710

/** A época que as PALAVRAS da história fixam (tema + fala, qualquer língua). Primeiro ano/década citado; null = presente ou época mista. */ // KINEO-ELENCO-EPOCA-2710
export function epocaDaHistoria(contexto: string): Epoca | null { // KINEO-ELENCO-EPOCA-2710
  const t = digitosAscii(String(contexto ?? '')).slice(0, 6000).replace(RESOLUCAO_RE, ' ') // KINEO-ELENCO-EPOCA-2710
  const achados: Array<{ pos: number; ano: number | null; decada: number }> = [] // KINEO-ELENCO-EPOCA-2710
  let presente = false // KINEO-ELENCO-EPOCA-2710
  for (const m of t.matchAll(ANO_RE)) { // KINEO-ELENCO-EPOCA-2710
    const ano = Number(m[1]) // KINEO-ELENCO-EPOCA-2710
    if (ano >= ANO_PRESENTE_MIN) presente = true // KINEO-ELENCO-EPOCA-2710
    else if (ano >= ANO_EPOCA_MIN && ano <= ANO_EPOCA_MAX) achados.push({ pos: m.index ?? 0, ano, decada: Math.floor(ano / 10) * 10 }) // KINEO-ELENCO-EPOCA-2710
  } // KINEO-ELENCO-EPOCA-2710
  for (const re of DECADA_RES) for (const m of t.matchAll(re)) { // KINEO-ELENCO-EPOCA-2710
    const bruto = Number(m[1]) // KINEO-ELENCO-EPOCA-2710
    const decada = bruto < 100 ? 1900 + bruto : bruto // KINEO-ELENCO-EPOCA-2710
    if (decada >= ANO_PRESENTE_MIN) presente = true // KINEO-ELENCO-EPOCA-2710
    else if (decada >= ANO_EPOCA_MIN && decada <= ANO_EPOCA_MAX) achados.push({ pos: m.index ?? 0, ano: null, decada }) // KINEO-ELENCO-EPOCA-2710
  } // KINEO-ELENCO-EPOCA-2710
  if (presente || achados.length === 0) return null // KINEO-ELENCO-EPOCA-2710
  achados.sort((a, b) => a.pos - b.pos) // KINEO-ELENCO-EPOCA-2710
  const p = achados[0] // KINEO-ELENCO-EPOCA-2710
  return { ano: p.ano, decada: p.decada, rotulo: rotuloDaDecada(p.decada), origem: p.ano === null ? 'decada' : 'ano' } // KINEO-ELENCO-EPOCA-2710
} // KINEO-ELENCO-EPOCA-2710

/** Figurino, veículos e objetos por década — o que o motor precisa VER para a época existir (o "no cars" sozinho não desenha 1953). */ // KINEO-ELENCO-EPOCA-2710
const PISTAS_DA_DECADA: Record<number, { roupa: string; veiculos: string; objetos: string }> = { // KINEO-ELENCO-EPOCA-2710
  1900: { roupa: 'Edwardian dress: high collars, waistcoats, bowler hats, long skirts and buttoned boots', veiculos: 'horse-drawn carriages and rare early motorcars with brass lamps', objetos: 'gas lamps, candlesticks, steamer trunks' }, // KINEO-ELENCO-EPOCA-2710
  1910: { roupa: '1910s dress: three-piece suits, flat caps, boaters, ankle-length skirts', veiculos: 'early black motorcars with running boards and horse carts', objetos: 'candlestick telephones, gramophones, oil lamps' }, // KINEO-ELENCO-EPOCA-2710
  1920: { roupa: '1920s dress: cloche hats, drop-waist dresses, double-breasted suits, newsboy caps', veiculos: 'boxy black 1920s automobiles and streetcars', objetos: 'candlestick telephones, typewriters, gramophones' }, // KINEO-ELENCO-EPOCA-2710
  1930: { roupa: '1930s dress: fedoras, wide-lapel suits, bias-cut dresses, wool overcoats', veiculos: 'rounded 1930s sedans with spare wheels on the fender', objetos: 'rotary telephones, tube radios, newspapers' }, // KINEO-ELENCO-EPOCA-2710
  1940: { roupa: '1940s dress: fedoras, trench coats, broad-shouldered suits, victory-roll hair, knee-length dresses', veiculos: '1940s cars with rounded fenders and running boards', objetos: 'rotary telephones, tube radios, suitcases' }, // KINEO-ELENCO-EPOCA-2710
  1950: { roupa: '1950s dress: fedora hats, wool overcoats, high-waisted pleated trousers, cardigans, full skirts, cat-eye glasses', veiculos: '1950s sedans with rounded chrome bodies, whitewall tires and tail fins', objetos: 'rotary dial telephones, tube radios, chrome diners, jukeboxes' }, // KINEO-ELENCO-EPOCA-2710
  1960: { roupa: '1960s dress: slim suits with skinny ties, shift dresses, beehive and bouffant hair, horn-rimmed glasses', veiculos: 'long boxy 1960s cars with chrome trim', objetos: 'rotary telephones, transistor radios, black-and-white televisions' }, // KINEO-ELENCO-EPOCA-2710
  1970: { roupa: '1970s dress: flared trousers, wide collars, earth-tone knitwear, long hair and sideburns', veiculos: 'boxy 1970s cars and vans in brown, mustard and avocado tones', objetos: 'rotary telephones, wood-panel interiors, record players' }, // KINEO-ELENCO-EPOCA-2710
  1980: { roupa: '1980s dress: shoulder pads, acid-wash denim, windbreakers, big permed hair', veiculos: 'angular 1980s cars with pop-up headlights', objetos: 'corded push-button telephones, cassette players, CRT televisions' }, // KINEO-ELENCO-EPOCA-2710
  1990: { roupa: '1990s dress: baggy jeans, flannel shirts, windbreakers, oversized sweaters', veiculos: 'rounded 1990s sedans and minivans', objetos: 'pagers, bulky CRT monitors, corded phones, early flip phones' }, // KINEO-ELENCO-EPOCA-2710
  2000: { roupa: 'early-2000s dress: low-rise jeans, cargo pants, trucker caps, flip phones on belts', veiculos: 'early-2000s cars with silver paint', objetos: 'flip phones, CRT and early flat monitors, DVD players' }, // KINEO-ELENCO-EPOCA-2710
} // KINEO-ELENCO-EPOCA-2710
const PISTAS_SECULO_XIX = { roupa: '19th-century dress: top hats, waistcoats, frock coats, long dresses and bonnets', veiculos: 'horse-drawn carriages and steam trains', objetos: 'oil lamps, candlelight, quill pens and inkwells' } // KINEO-ELENCO-EPOCA-2710

export function pistasDaEpoca(epoca: Epoca): { roupa: string; veiculos: string; objetos: string } { return PISTAS_DA_DECADA[epoca.decada] ?? PISTAS_SECULO_XIX } // KINEO-ELENCO-EPOCA-2710

const MARCA_EPOCA_NO_PROMPT = 'Period setting:' // KINEO-ELENCO-EPOCA-2710
/** O sufixo positivo de época (longo) e a forma curta para prompt perto do teto. */ // KINEO-ELENCO-EPOCA-2710
export function sufixoDeEpoca(epoca: Epoca, curto = false): string { // KINEO-ELENCO-EPOCA-2710
  const quando = epoca.ano !== null ? `${epoca.ano} (${epoca.rotulo})` : `the ${epoca.rotulo}` // KINEO-ELENCO-EPOCA-2710
  const p = pistasDaEpoca(epoca) // KINEO-ELENCO-EPOCA-2710
  if (curto) return ` ${MARCA_EPOCA_NO_PROMPT} ${quando}; period-accurate ${epoca.rotulo} clothing, vehicles and props only; no present-day smartphones, cars or fashion.` // KINEO-ELENCO-EPOCA-2710
  return ` ${MARCA_EPOCA_NO_PROMPT} ${quando}. Every person in frame wears ${p.roupa}; any vehicle in frame is ${p.veiculos}; props are ${p.objetos}; absolutely no present-day smartphones, no present-day cars, no hoodies or modern streetwear, no LED screens.` // KINEO-ELENCO-EPOCA-2710
} // KINEO-ELENCO-EPOCA-2710

/** Objeto de hoje escrito pelo descritor numa história de época ("a man in a hoodie" em 1953): a troca determinística pelo equivalente da década, só no que é seguro. */ // KINEO-ELENCO-EPOCA-2710
export function trocarModernidades(prompt: string, epoca: Epoca): { prompt: string; trocas: string[] } { // KINEO-ELENCO-EPOCA-2710
  let out = String(prompt ?? '') // KINEO-ELENCO-EPOCA-2710
  const trocas: string[] = [] // KINEO-ELENCO-EPOCA-2710
  const d = epoca.decada // KINEO-ELENCO-EPOCA-2710
  const troca = (rotulo: string, re: RegExp, por: string, ate: number) => { if (d >= ate) return; re.lastIndex = 0; if (re.test(out)) { re.lastIndex = 0; out = out.replace(re, por); trocas.push(`${rotulo}→${por}`) } } // KINEO-ELENCO-EPOCA-2710
  troca('hoodie', /\b(?:a|an)\s+hoodie\b|\bhoodies?\b/gi, d >= 1900 ? `a ${rotuloDaDecada(d)} wool overcoat and hat` : 'a long wool coat and hat', 1990) // KINEO-ELENCO-EPOCA-2710
  troca('smartphone', /\b(?:smartphones?|cell\s*phones?|mobile\s*phones?|iphones?)\b/gi, d >= 1990 ? 'flip phone' : d >= 1930 ? 'rotary telephone' : 'candlestick telephone', 2010) // KINEO-ELENCO-EPOCA-2710
  troca('laptop', /\b(?:laptops?|tablets?)\b/gi, d >= 1990 ? 'bulky CRT computer' : 'typewriter', 1990) // KINEO-ELENCO-EPOCA-2710
  troca('sneakers', /\bsneakers\b/gi, 'leather shoes', 1980) // KINEO-ELENCO-EPOCA-2710
  troca('modern car', /\b(?:modern|contemporary)\s+(cars?|sedans?|trucks?|vehicles?)\b/gi, `${rotuloDaDecada(d)} $1`, 2010) // KINEO-ELENCO-EPOCA-2710
  troca('led', /\bled\s+(?:screens?|lights?|panels?)\b/gi, d >= 1930 ? 'incandescent lamps' : 'gas lamps', 2000) // KINEO-ELENCO-EPOCA-2710
  return { prompt: out, trocas } // KINEO-ELENCO-EPOCA-2710
} // KINEO-ELENCO-EPOCA-2710

/** Acrescenta a época UMA vez ao prompt da cena, respeitando o teto da fal. Devolve o prompt e o que coube. */ // KINEO-ELENCO-EPOCA-2710
export function aplicarEpoca(prompt: string, epoca: Epoca): { prompt: string; aplicada: 'longa' | 'curta' | 'ja_tinha' | 'sem_espaco' } { // KINEO-ELENCO-EPOCA-2710
  const base = String(prompt ?? '').replace(/\s+$/, '') // KINEO-ELENCO-EPOCA-2710
  if (base.includes(MARCA_EPOCA_NO_PROMPT)) return { prompt: base, aplicada: 'ja_tinha' } // KINEO-ELENCO-EPOCA-2710
  const sep = /[.!?;]$/.test(base) ? '' : '.' // KINEO-ELENCO-EPOCA-2710 — o prompt costuma acabar em "subject framed…" sem ponto
  const longa = sep + sufixoDeEpoca(epoca) // KINEO-ELENCO-EPOCA-2710
  if (base.length + longa.length <= ELENCO_EPOCA_TETO_PROMPT) return { prompt: `${base}${longa}`, aplicada: 'longa' } // KINEO-ELENCO-EPOCA-2710
  const curta = sep + sufixoDeEpoca(epoca, true) // KINEO-ELENCO-EPOCA-2710
  if (base.length + curta.length <= ELENCO_EPOCA_TETO_PROMPT) return { prompt: `${base}${curta}`, aplicada: 'curta' } // KINEO-ELENCO-EPOCA-2710
  return { prompt: base, aplicada: 'sem_espaco' } // KINEO-ELENCO-EPOCA-2710
} // KINEO-ELENCO-EPOCA-2710

// ═══ 2. ELENCO NOMEADO (lido do texto em inglês) ══════════════════════════════════════════════════════════════════ // KINEO-ELENCO-EPOCA-2710
export type TipoNomeado = 'humano' | 'animal' | 'criatura' // KINEO-ELENCO-EPOCA-2710
export interface PersonagemNomeado { // KINEO-ELENCO-EPOCA-2710
  /** Como a história o chama ("Amna", "Baba Noor", "James Turner") ou, sem nome, o papel ("the commuter"). */ // KINEO-ELENCO-EPOCA-2710
  nome: string // KINEO-ELENCO-EPOCA-2710
  nomeado: boolean // KINEO-ELENCO-EPOCA-2710
  tipo: TipoNomeado // KINEO-ELENCO-EPOCA-2710
  genero: 'man' | 'woman' | null // KINEO-ELENCO-EPOCA-2710
  /** Descrição curta e fixa em inglês, começa pelo nome. */ // KINEO-ELENCO-EPOCA-2710
  descricao: string // KINEO-ELENCO-EPOCA-2710
  protagonista: boolean // KINEO-ELENCO-EPOCA-2710
  ocorrencias: number // KINEO-ELENCO-EPOCA-2710
  /** Posições (0..1) das ocorrências no texto em inglês — a cena por posição quando a fala não casa o nome. */ // KINEO-ELENCO-EPOCA-2710
  posicoes: number[] // KINEO-ELENCO-EPOCA-2710
  possessivo?: { nucleo: string; objeto: string | null } // KINEO-ELENCO-MARCADOR-2910 — papel sem nome: somente a fala pode colocá-lo na cena.
} // KINEO-ELENCO-EPOCA-2710

const PESSOAS = 'boy|girl|man|woman|kid|child|baby|toddler|teen|teenager|student|commuter|passenger|traveler|traveller|worker|clerk|waiter|waitress|nurse|doctor|teacher|scientist|detective|explorer|astronaut|pirate|cowboy|monk|priest|keeper|stranger|hunter|climber|miner|engineer|chef|artist|painter|writer|singer|dancer|player|runner|driver|rider|nomad|shepherd|merchant|thief|widow|bride|groom|captain|soldier|knight|king|queen|prince|princess|farmer|fisherman|sailor|pilot|mother|father|grandmother|grandfather|grandpa|grandma|sister|brother|son|daughter|friend|neighbor|neighbour|villager|warrior|hero|heroine|librarian|guard|officer|lady|gentleman|guy|person|elder|uncle|aunt|wizard|witch|archaeologist|journalist|reporter|photographer|mechanic|baker|tailor|shopkeeper|cashier|banker|lawyer|judge|mayor|janitor|gardener|postman|mailman|firefighter|policeman|cop|sheriff|salesman|accountant|secretary|housewife|widower|orphan|prisoner|refugee|immigrant|survivor|witness|victim' // KINEO-ELENCO-EPOCA-2710
const ANIMAIS = 'bunny|rabbit|bear|fox|mouse|puppy|dog|kitten|cat|owl|turtle|tortoise|elephant|lion|zebra|giraffe|penguin|duck|duckling|frog|monkey|tiger|wolf|deer|whale|dolphin|bee|butterfly|horse|pony|pig|cow|sheep|lamb|goat|chicken|hen|rooster|parrot|eagle|hawk|squirrel|hedgehog|raccoon|panda|koala|otter|seal|crab|octopus|snake|lizard|hamster|donkey|camel|bird|fish|sparrow|crow|raven|swan|goose|bat|mole|beaver|bulldog|poodle|labrador' // KINEO-ELENCO-EPOCA-2710
const CRIATURAS = 'dinosaur|dino|dragon|robot|unicorn|monster|ghost|demon|alien|fairy|elf|dwarf|troll|goblin|zombie|vampire|werewolf|mermaid|giant|golem|genie|angel|yeti|gnome|t-rex|trex|raptor|phoenix|griffin|spirit|android|cyborg|creature|beast' // KINEO-ELENCO-EPOCA-2710
/** Coisas que viram personagem em conto infantil: "Geli, a geleia roxa", "a little cloud named Nuvo". */ // KINEO-ELENCO-EPOCA-2710
const SERES_OBJETO = 'jelly|gelatin|gelatine|jello|blob|slime|cloud|star|snowman|snowflake|doll|puppet|teapot|cookie|cupcake|pumpkin|balloon|pencil|crayon|sock|leaf|raindrop|candle|lantern|kite|seed|acorn|pebble|rock|stone|teddy|toy|car|train|truck|boat|plane|rocket|robot|lamp|book|clock|umbrella|flower|tree|mushroom|carrot|potato|apple|banana|egg|moon|sun|wave|bubble' // KINEO-ELENCO-EPOCA-2710
const SER_RE = new RegExp(`\\b(${PESSOAS}|${ANIMAIS}|${CRIATURAS}|${SERES_OBJETO})s?\\b`, 'i') // KINEO-ELENCO-EPOCA-2710
const PESSOA_RE = new RegExp(`\\b(?:${PESSOAS})s?\\b`, 'i') // KINEO-ELENCO-EPOCA-2710
const ANIMAL_RE = new RegExp(`\\b(?:${ANIMAIS})s?\\b`, 'i') // KINEO-ELENCO-EPOCA-2710
const CRIATURA_RE = new RegExp(`\\b(?:${CRIATURAS})s?\\b`, 'i') // KINEO-ELENCO-EPOCA-2710
const CORES = 'red|blue|green|yellow|purple|violet|orange|pink|brown|black|white|gray|grey|golden|gold|silver|teal|turquoise|lilac|crimson|scarlet|indigo|magenta|beige|cream' // KINEO-ELENCO-EPOCA-2710
const QUALI = String.raw`(?:[\p{Ll}][\p{Ll}-]*\s+){0,3}` // KINEO-ELENCO-EPOCA-2710 — até 3 adjetivos minúsculos
/** Título/parentesco colado ao nome = pessoa, mesmo com uma só ocorrência ("Baba Noor", "Mr. Turner", "Seu Zé", "Dona Maria"). */ // KINEO-ELENCO-EPOCA-2710
const TITULOS = 'baba|dada|dadi|nana|nani|amma|abba|ammi|chacha|chachi|mama|mami|mamu|khala|phupho|bua|uncle|aunt|auntie|aunty|grandpa|grandma|grandfather|grandmother|granny|grandad|mr|mrs|ms|miss|dr|doctor|professor|prof|captain|sir|madam|madame|monsieur|mademoiselle|lady|lord|king|queen|prince|princess|saint|st|father|mother|brother|sister|detective|officer|sergeant|general|colonel|major|senhor|senhora|seu|dona|dom|don|doña|tio|tia|tío|tía|vovô|vovó|vô|vó|señor|señora|frau|herr|oma|opa|onkel|tante|domnul|doamna|nenea|tanti|bunicul|bunica|mos|moș|baba|nonno|nonna|zio|zia|signor|signora|papa|mama|mamãe|papai|mamá|papá|old|little|young|master|mistress|nurse|teacher|judge|mayor|sheriff|chief|reverend|rabbi|imam|sheikh|sultan|emir|raja|rani|maharaja|pandit|guru|swami|sensei|bhai|didi|bibi|begum|sahib|sahiba|ji' // KINEO-ELENCO-EPOCA-2710
const TITULO_RE = new RegExp(`^(?:${TITULOS})\\.?$`, 'i') // KINEO-ELENCO-EPOCA-2710
const FEM_TITULO_RE = /^(?:dadi|nani|amma|ammi|chachi|mami|khala|phupho|bua|aunt|auntie|aunty|grandma|grandmother|granny|mrs|ms|miss|madam|madame|mademoiselle|lady|queen|princess|mother|sister|senhora|dona|doña|tia|tía|vovó|vó|señora|frau|oma|tante|doamna|tanti|bunica|nonna|zia|signora|mama|mamãe|mamá|mistress|nurse|rani|didi|bibi|begum|sahiba)\.?$/i // KINEO-ELENCO-EPOCA-2710
const MASC_TITULO_RE = /^(?:baba|dada|nana|abba|chacha|mamu|uncle|grandpa|grandfather|grandad|mr|sir|monsieur|lord|king|prince|father|brother|senhor|seu|dom|don|tio|tío|vovô|vô|señor|herr|opa|onkel|domnul|nenea|bunicul|mos|moș|nonno|zio|signor|papa|papai|papá|master|rabbi|imam|sheikh|sultan|emir|raja|maharaja|pandit|guru|swami|bhai|sahib)\.?$/i // KINEO-ELENCO-EPOCA-2710
const VELHO_TITULO_RE = /^(?:baba|dada|dadi|nana|nani|grandpa|grandma|grandfather|grandmother|granny|grandad|vovô|vovó|vô|vó|oma|opa|bunicul|bunica|mos|moș|nonno|nonna|old)\.?$/i // KINEO-ELENCO-EPOCA-2710
const PARTICULAS = new Set(['de', 'da', 'do', 'dos', 'das', 'del', 'della', 'di', 'von', 'van', 'der', 'den', 'la', 'le', 'el', 'al', 'bin', 'ibn', 'ul', 'ur', 'y', 'e']) // KINEO-ELENCO-EPOCA-2710
/** Nome composto de LUGAR ("Mount Everest", "New York", "Times Square", "Hudson River"): nunca vira personagem, mesmo como sujeito de verbo. */ // KINEO-ELENCO-EPOCA-2710
const GEO_PREFIXO_RE = /^(?:Mount|Mt\.?|Lake|River|New|San|Santa|Santo|São|Sao|Saint|St\.?|Los|Las|Port|Porto|Fort|Cape|North|South|East|West|Upper|Lower|Great|Grand|Lower|Old|Royal|National|Central|Union|Grand|Hong|Buenos|Rio|Kuala|Addis|Dar|Abu|Tel|Las|Le|La)$/i // KINEO-ELENCO-EPOCA-2710
const GEO_SUFIXO_RE = /^(?:City|Island|Islands|Valley|Canyon|Desert|Mountain|Mountains|Bay|Beach|Park|Street|Avenue|Road|Bridge|Tower|Castle|Palace|Temple|Station|Airport|University|Hospital|Company|Corporation|Inc|Ltd|Empire|Kingdom|Republic|Ocean|Sea|Falls|Forest|Jungle|Plains|Square|Market|Bazaar|Museum|Church|Cathedral|Mosque|Hotel|Theater|Theatre|Stadium|Arena|Zoo|Garden|Gardens|Harbor|Harbour|Lane|Boulevard|Canal|Dam|Mine|Mines|Plant|Factory|Prison|School|College|Bank|Hall|Manor|Farm|Ranch|Village|Town|County|State|Province|Coast|Peninsula|Strait|Gulf|Lagoon|Glacier|Volcano|Crater|Reef|Cave|Caves|Trail|Highway|Route|Railway|Express|Mall|Center|Centre|Base|Camp|Field|Fields|Lake|River|Hill|Hills|Rock|Point|Pass|Peak|Summit|Ridge|Cliff|Cliffs|Shore|Creek|Spring|Springs|Woods|Heights|Grove|Meadow|Marsh|Swamp|Triangle|Line|Wall|Gate|Tunnel|Port|Pier|Dock|Docks|Wharf|Lighthouse|Fortress|Citadel|Abbey|Monastery|Shrine|Pyramid|Pyramids|Ruins|Tomb|Library|Archive|Archives|Institute|Academy|Agency|Bureau|Department|Ministry|Council|Court|Parliament|Senate|Congress|Army|Navy|Guard|Police|Times|Post|Herald|Tribune|News|Gazette|Journal|Review|Press)$/i // KINEO-ELENCO-EPOCA-2710
/** Palavras com maiúscula que não são nome de personagem (inglês + o que a tradução traz: países, gentílicos, meses, marcas, abstratos que abrem frase). */ // KINEO-ELENCO-EPOCA-2710
const NAO_NOME = new Set(('the|a|an|it|its|he|she|they|we|you|i|his|her|their|our|this|that|these|those|there|here|when|then|but|and|or|so|if|as|at|in|on|of|to|for|with|from|by|one|two|three|first|next|last|now|today|tonight|tomorrow|yesterday|midnight|noon|morning|night|day|suddenly|instead|everyone|everybody|nobody|someone|something|nothing|oh|wow|hey|yes|no|okay|ok|wait|look|good|bad|hook|micro|reward|escalation|payoff|rhythm|pexels|scene|cut|intro|outro|cta|voiceover|narrator|narration|caption|title|style|camera|visual|topic|idea|script|prompt|resolution|duration|language|engine|format|aspect|note|notes|instructions|instruction|tone|mood|voice|music|subtitle|subtitles|hashtags|description|output|input|config|settings|your|yours|mine|ours|theirs|us|them|him|me|my|monday|tuesday|wednesday|thursday|friday|saturday|sunday|january|february|march|april|may|june|july|august|september|october|november|december|just|only|what|why|how|where|who|whom|whose|which|while|after|before|because|once|until|every|each|all|some|most|many|more|less|little|big|new|old|meanwhile|however|later|inside|outside|finally|sometimes|somewhere|nowhere|everywhere|perhaps|maybe|almost|never|always|still|even|soon|ever|since|though|although|again|back|also|yet|thus|hence|indeed|rain|snow|wind|fire|water|time|life|death|money|people|nature|history|science|love|fear|hope|silence|darkness|dawn|dusk|sunlight|moonlight|thunder|lightning|smoke|ice|gold|silver|blood|war|peace|music|light|power|fortune|luck|truth|justice|freedom|hunger|sleep|dreams|dream|memory|winter|summer|spring|autumn|fall|evening|world|earth|moon|sun|mars|sky|sea|ocean|river|mountain|forest|city|town|village|home|house|school|church|temple|mosque|station|train|car|road|street|internet|youtube|tiktok|instagram|facebook|twitter|google|apple|netflix|amazon|microsoft|chatgpt|ai|america|american|americans|europe|european|africa|african|asia|asian|china|chinese|india|indian|japan|japanese|brazil|brazilian|france|french|england|english|britain|british|germany|german|russia|russian|spain|spanish|italy|italian|mexico|mexican|pakistan|pakistani|korea|korean|romania|romanian|portugal|portuguese|turkey|turkish|egypt|egyptian|greece|greek|arab|arabic|urdu|hindi|latin|london|paris|rome|tokyo|york|god|allah|heaven|hell|christmas|halloween|easter|ramadan|eid|diwali|nasa|fbi|cia|un|usa|uk|us|tv|dna|gps|led|wifi|ceo|cnn|bbc|mcdonald|coca|cola|nike|ford|toyota|tesla|iphone|android').split('|')) // KINEO-ELENCO-EPOCA-2710
// KINEO-JUIZ-REFAZ-2810 — preposição/advérbio que abre a frase e virava "nome": Gênesis 28/10 (dc4ac291) "Among the stars, Lucifer, the brightest angel, fell" deu "Among, a teal star" no elenco (o "the stars" casou o aposto "Mishu the dragon") e o mascote verde entrou na cena do cosmos. Lista fixa, só palavras que nunca são nome de gente.
for (const w of 'among|amongst|between|beyond|beneath|below|above|across|through|throughout|during|despite|without|within|under|underneath|over|into|onto|upon|toward|towards|against|along|around|behind|beside|besides|inside|outside|until|unless|whether|either|neither|nor|except|unlike|near|past|since|per|via|versus|amid|amidst|deep|far|high|legend|legends|story|stories|chapter|episode|beginning|imagine|picture|listen|remember|welcome|meet|enter|introducing|watch|discover|year|years|century|centuries|decade|decades|ago|million|billion|thousand|hundred|according|actually|apparently|basically|honestly|somehow|elsewhere|anywhere|whenever|wherever|whoever|whatever|whichever|otherwise|therefore|moreover|furthermore|nevertheless|nonetheless|consequently|eventually|ultimately|immediately|slowly|quickly|quietly|silently|gently|carefully|sadly|happily|luckily|unfortunately|fortunately|surprisingly|strangely|behold|alas|verily|wherein|whereupon|hence'.split('|')) NAO_NOME.add(w) // KINEO-JUIZ-REFAZ-2810
/** Coisa que só vira personagem em conto infantil (estrela, nuvem, pedra…): fora dele é cenário, nunca "named character". Geleia/blob ficam de fora (só existem como personagem). */ // KINEO-JUIZ-REFAZ-2810
const COISA_DE_CENARIO_RE = /^(?:star|cloud|moon|sun|wave|bubble|rock|stone|pebble|leaf|raindrop|snowflake|seed|acorn|flower|tree|mushroom|egg|apple|banana|carrot|potato|candle|lantern|kite|balloon|car|train|truck|boat|plane|rocket|lamp|book|clock|umbrella|pencil|crayon|sock|teapot|cookie|cupcake|pumpkin|doll|puppet|teddy|toy|snowman)s?$/i // KINEO-JUIZ-REFAZ-2810
const VERBO_RE = /^(?:is|was|has|had|does|did|can|could|will|would|says|said|took|ran|sat|saw|went|got|felt|came|heard|opened|stood|looked|stares?|rolls?|smiles?|cries|screams?|laughs?|turns?|walks?|runs?|finds?|found|knows|knew|wants|loves|hates|lives|lived|sees|hears|thinks|thought|feels|holds|held|takes|gives|gave|makes|made|asks|asked|answers|whispers|shouts|jumps|flies|flew|swims|hides|hid|waits|sleeps|wakes|woke|vanished|disappeared|died|left|met|fell|began|kept|put|set|cut|let|read|hit|lost|won|wore|drove|rode|ate|drank|sang|told|spoke|wrote|caught|bought|brought|taught|fought|sought|built|sent|spent|lent|meant|stole|chose|broke|froze|hung|swung|flung|struck|shook|shone|grew|threw|knelt|slept|wept|crept|bent|lit|slid|bled|fled|sped|leapt|dreamt|[a-z]{3,}(?:ed|s))\b/ // KINEO-ELENCO-EPOCA-2710
const LUGAR_ANTES_RE = /\b(?:in|at|from|near|into|across|through|toward|towards|around|outside|inside|within|via|along|beyond|beneath|under|above|behind|over)\s+(?:the\s+|a\s+|an\s+)?$/i // KINEO-ELENCO-EPOCA-2710
const NOMEADO_ANTES_RE = /\b(?:named|called|known\s+as|nicknamed|chamad[oa]|llamad[oa]|nombrad[oa]|appelé[e]?|chiamat[oa]|numit[ăa]?)\s+$/i // KINEO-ELENCO-EPOCA-2710
const PALAVRA_NOME = String.raw`\p{Lu}[\p{Ll}'’]{1,}(?:-\p{Lu}?[\p{Ll}]+)?` // KINEO-ELENCO-EPOCA-2710
const NOME_RUN_RE = new RegExp(String.raw`(?<![\p{L}\p{N}'’])((?:\p{Lu}[\p{Ll}]{0,3}\. )?${PALAVRA_NOME}(?:(?: (?:${[...PARTICULAS].join('|')}))? ${PALAVRA_NOME}){0,2})(?![\p{L}\p{N}])`, 'gu') // KINEO-ELENCO-EPOCA-2710

const limpa = (s: string) => String(s ?? '').replace(/\s+/g, ' ').trim() // KINEO-ELENCO-EPOCA-2710
for (const palavra of PALAVRAS_DE_SECAO) NAO_NOME.add(palavra) // KINEO-ELENCO-MARCADOR-2910 — inclui rótulos soltos, em qualquer caixa.
const escapaRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // KINEO-ELENCO-EPOCA-2710
const normaliza = (s: string) => s.toLowerCase().replace(/ı/g, 'i').normalize('NFD').replace(/[̀-ͯ]/g, '') // KINEO-ELENCO-EPOCA-2710
function hash(texto: string): number { let h = 0x811c9dc5; for (let i = 0; i < texto.length; i++) { h ^= texto.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0 } return h >>> 0 } // KINEO-ELENCO-EPOCA-2710 — FNV-1a, como elencoDaHistoria
function escolhe(lista: readonly string[], semente: number, usados: Set<string>): string { for (let i = 0; i < lista.length; i++) { const op = lista[(semente + i) % lista.length]; if (!usados.has(op)) { usados.add(op); return op } } return lista[semente % lista.length] } // KINEO-ELENCO-EPOCA-2710
/** A palavra inteira no texto (Unicode, sem acento, sem caixa). */ // KINEO-ELENCO-EPOCA-2710
export function citaPalavra(texto: string, palavra: string): boolean { // KINEO-ELENCO-EPOCA-2710
  const p = normaliza(limpa(palavra)) // KINEO-ELENCO-EPOCA-2710
  if (!p) return false // KINEO-ELENCO-EPOCA-2710
  return new RegExp(`(?<![\\p{L}\\p{N}])${escapaRe(p)}(?![\\p{L}\\p{N}])`, 'iu').test(normaliza(String(texto ?? ''))) // KINEO-ELENCO-EPOCA-2710
} // KINEO-ELENCO-EPOCA-2710

interface Candidato { nome: string; atua: number; forte: number; lugar: number; meio: number; total: number; posicoes: number[]; primeira: number; titulos: string[]; aposto: string | null } // KINEO-ELENCO-EPOCA-2710

/** Separa o texto em frases (para pronomes e janelas). */ // KINEO-ELENCO-EPOCA-2710
const frasesCom = (texto: string, nome: string): string[] => { // KINEO-ELENCO-EPOCA-2710 — a frase que cita o nome + a seguinte ("James Turner vanished. His car…": o pronome vem depois)
  const fs = texto.split(/(?<=[.!?…])\s+|\n+/) // KINEO-ELENCO-EPOCA-2710
  const chave = nome.split(' ').filter((w) => !TITULO_RE.test(w) && !PARTICULAS.has(w.toLowerCase())).pop() ?? nome // KINEO-ELENCO-EPOCA-2710
  return fs.flatMap((f, i) => (citaPalavra(f, chave) ? [`${f} ${fs[i + 1] ?? ''}`] : [])) // KINEO-ELENCO-EPOCA-2710
} // KINEO-ELENCO-EPOCA-2710

function candidatos(texto: string): Candidato[] { // KINEO-ELENCO-EPOCA-2710
  const mapa = new Map<string, Candidato>() // KINEO-ELENCO-EPOCA-2710
  const n = Math.max(1, texto.length) // KINEO-ELENCO-EPOCA-2710
  for (const m of texto.matchAll(NOME_RUN_RE)) { // KINEO-ELENCO-EPOCA-2710
    let run = m[1] // KINEO-ELENCO-EPOCA-2710
    let pos = m.index ?? 0 // KINEO-ELENCO-EPOCA-2710
    // "With Baba Noor", "Then Amna": a palavra de início de frase que não é nome sai do bloco (e "Amna The" perde a cauda) // KINEO-ELENCO-EPOCA-2710
    for (;;) { const w = run.split(' ')[0]; if (run.includes(' ') && !TITULO_RE.test(w) && NAO_NOME.has(normaliza(w))) { pos += w.length + 1; run = run.slice(w.length + 1) } else break } // KINEO-ELENCO-EPOCA-2710
    for (;;) { const ws = run.split(' '); const w = ws[ws.length - 1]; if (ws.length > 1 && !TITULO_RE.test(w) && NAO_NOME.has(normaliza(w.replace(/['’]s$/, '')))) run = ws.slice(0, -1).join(' '); else break } // KINEO-ELENCO-EPOCA-2710
    const palavras = run.split(' ') // KINEO-ELENCO-EPOCA-2710
    const titulos = palavras.filter((w) => TITULO_RE.test(w)) // KINEO-ELENCO-EPOCA-2710
    const proprias = palavras.filter((w) => !TITULO_RE.test(w) && !PARTICULAS.has(w.toLowerCase())) // KINEO-ELENCO-EPOCA-2710
    if (proprias.length === 0 || proprias.every((w) => NAO_NOME.has(normaliza(w.replace(/['’]s$/, ''))))) continue // KINEO-ELENCO-EPOCA-2710
    if (proprias.length === 1 && titulos.length === 0 && NAO_NOME.has(normaliza(proprias[0].replace(/['’]s$/, '')))) continue // KINEO-ELENCO-EPOCA-2710
    const nome = palavras.filter((w) => !(titulos.length > 0 && /^(?:old|little|young)$/i.test(w))).join(' ').replace(/['’]s$/, '') // KINEO-ELENCO-EPOCA-2710 — "old Baba Noor" → "Baba Noor"; "Amna's" → "Amna"
    const before = texto.slice(Math.max(0, pos - 80), pos) // KINEO-ELENCO-EPOCA-2710
    const after = texto.slice(pos + run.length, pos + run.length + 80) // KINEO-ELENCO-EPOCA-2710
    const inicioDeFrase = /(?:^|[.!?…]\s*|["“]\s*|\n\s*)$/.test(before) // KINEO-ELENCO-EPOCA-2710
    const depois = after.replace(/^\s+/, '') // KINEO-ELENCO-EPOCA-2710
    const possessivo = /^['’]s\b/.test(depois) || /['’]s$/.test(run) // KINEO-ELENCO-EPOCA-2710
    const fala = /^:\s*["“'‘]?\p{L}/u.test(depois) // KINEO-ELENCO-EPOCA-2710 — "Dino: …" é fala; "Resolution: 1080" é configuração
    const geo = GEO_PREFIXO_RE.test(proprias[0]) || GEO_SUFIXO_RE.test(proprias[proprias.length - 1]) // KINEO-ELENCO-EPOCA-2710 — "Mount Everest claims lives" não é gente
    if (geo) continue // KINEO-ELENCO-EPOCA-2710 — lugar composto nunca entra no mapa (nem absorve "Berlin" solto)
    const depoisDaCoordenacao = depois.replace(/^(?:and|&|e|y|et|und|și|si)\s+(?:\p{Lu}[\p{Ll}'’]+\s+){1,3}/u, '') // KINEO-ELENCO-EPOCA-2710 — "Franz Ferdinand and Sophie drove": o verbo vale para os dois
    const verbo = (VERBO_RE.test(depois.replace(/^['’]s\s+/, '')) || (depoisDaCoordenacao !== depois && VERBO_RE.test(depoisDaCoordenacao))) && !new RegExp(`^(?:${PESSOAS}|${ANIMAIS}|${CRIATURAS}|${SERES_OBJETO}|city|town|village|street|river|island|empire|kingdom|temple|station)s?\\b`, 'i').test(depois) // KINEO-ELENCO-EPOCA-2710 — "Paris streets" não é verbo
    const apostoDepois = new RegExp(String.raw`^,\s*(?:a|an|the|our|his|her|their|my)\s+(${QUALI})(${SER_RE.source.slice(3, -5)})s?\b`, 'iu').exec(depois) // KINEO-ELENCO-EPOCA-2710 — "Mishu, the little dragon"
    const apostoAntes = new RegExp(String.raw`(?:a|an|the|our|his|her|their|my)\s+(${QUALI})(${SER_RE.source.slice(3, -5)})s?\s+(?:named\s+|called\s+)?$`, 'iu').exec(before) // KINEO-ELENCO-EPOCA-2710 — "the little dragon Mishu", "a girl named Amna"
    const apostoThe = new RegExp(String.raw`^the\s+(${QUALI})(${SER_RE.source.slice(3, -5)})\b`, 'iu').exec(depois) // KINEO-ELENCO-EPOCA-2710 — "Mishu the dragon" · KINEO-JUIZ-REFAZ-2810 — só no SINGULAR (era `s?`): "Among the stars" não é "Among, a estrela"
    const aposto = apostoDepois ?? apostoAntes ?? apostoThe // KINEO-ELENCO-EPOCA-2710
    const nomeado = NOMEADO_ANTES_RE.test(before) // KINEO-ELENCO-EPOCA-2710
    const lugar = (LUGAR_ANTES_RE.test(before) && !possessivo && !verbo) || geo // KINEO-ELENCO-EPOCA-2710
    const forte = !geo && (titulos.length > 0 || !!aposto || nomeado || fala) // KINEO-ELENCO-EPOCA-2710
    const atua = !geo && (forte || verbo || possessivo) // KINEO-ELENCO-EPOCA-2710
    const chave = normaliza(nome) // KINEO-ELENCO-EPOCA-2710
    const c = mapa.get(chave) ?? { nome, atua: 0, forte: 0, lugar: 0, meio: 0, total: 0, posicoes: [], primeira: pos, titulos: [], aposto: null } // KINEO-ELENCO-EPOCA-2710
    c.total += 1; c.posicoes.push(pos / n) // KINEO-ELENCO-EPOCA-2710
    if (atua) c.atua += 1 // KINEO-ELENCO-EPOCA-2710
    if (forte) c.forte += 1 // KINEO-ELENCO-EPOCA-2710
    if (lugar) c.lugar += 1 // KINEO-ELENCO-EPOCA-2710
    if (!inicioDeFrase || (proprias.length >= 2 && verbo)) c.meio += 1 // KINEO-ELENCO-EPOCA-2710 — "Franz Ferdinand and Sophie drove": nome composto que age vale mesmo abrindo a frase
    if (titulos.length) c.titulos = titulos // KINEO-ELENCO-EPOCA-2710
    if (aposto && !c.aposto) c.aposto = `${aposto[1] ?? ''}${aposto[2]}`.trim() // KINEO-ELENCO-EPOCA-2710
    mapa.set(chave, c) // KINEO-ELENCO-EPOCA-2710
  } // KINEO-ELENCO-EPOCA-2710
  // nome composto absorve o simples ("James Turner" + "Turner"): ocorrências somam no composto // KINEO-ELENCO-EPOCA-2710
  const lista = [...mapa.values()] // KINEO-ELENCO-EPOCA-2710
  for (const c of lista) { // KINEO-ELENCO-EPOCA-2710
    if (c.nome.includes(' ')) continue // KINEO-ELENCO-EPOCA-2710
    const dono = lista.find((d) => d !== c && d.nome.includes(' ') && d.nome.split(' ').some((w) => normaliza(w) === normaliza(c.nome))) // KINEO-ELENCO-EPOCA-2710
    if (dono) { dono.total += c.total; dono.atua += c.atua; dono.meio += c.meio; dono.posicoes.push(...c.posicoes); dono.primeira = Math.min(dono.primeira, c.primeira); mapa.delete(normaliza(c.nome)) } // KINEO-ELENCO-EPOCA-2710
  } // KINEO-ELENCO-EPOCA-2710
  return [...mapa.values()].filter((c) => c.atua >= 1 && c.atua >= c.lugar && (c.meio >= 1 || c.forte >= 1 || c.atua >= 2)) // KINEO-ELENCO-EPOCA-2710
} // KINEO-ELENCO-EPOCA-2710

const CABELO = ['short dark hair', 'long dark braided hair', 'curly black hair', 'straight sandy-blond hair', 'wavy chestnut hair', 'short reddish hair', 'neatly combed brown hair'] // KINEO-ELENCO-EPOCA-2710
const CABELO_FEMININO = ['long dark braided hair', 'long straight black hair in a ponytail', 'curly black hair tied with a ribbon', 'long wavy chestnut hair', 'shoulder-length dark hair with a hair clip', 'long sandy-blond hair in two braids'] // KINEO-ELENCO-EPOCA-2710 — 28/10
const ROSTO = ['round face and big expressive eyes', 'narrow face and sharp eyes', 'freckles and a small nose', 'thick eyebrows and a warm smile', 'high cheekbones and dark eyes', 'a square jaw and tired eyes'] // KINEO-ELENCO-EPOCA-2710
const ROUPA_CRIANCA = ['a red tunic and blue trousers', 'a yellow dress with a small embroidered collar', 'a green striped shirt and khaki shorts', 'a blue jacket over a white shirt', 'a purple sweater and grey trousers'] // KINEO-ELENCO-EPOCA-2710
const ROUPA_ADULTO = ['a dark blue jacket over a grey shirt', 'a brown coat and dark trousers', 'a white shirt with rolled sleeves and dark trousers', 'an olive jacket and plain trousers', 'a grey wool coat and a dark scarf'] // KINEO-ELENCO-EPOCA-2710
const ROUPA_VELHO = ['a long loose cream tunic and a woven shawl', 'a brown cardigan over a white shirt', 'a grey waistcoat and a wool cap', 'a long dark coat and a flat cap'] // KINEO-ELENCO-EPOCA-2710
const CORES_SER = ['bright green', 'sky blue', 'warm orange', 'soft purple', 'sunny yellow', 'teal'] // KINEO-ELENCO-EPOCA-2710

function generoDe(texto: string): 'man' | 'woman' | null { // KINEO-ELENCO-EPOCA-2710
  const f = (texto.match(/\b(?:she|her|hers|herself|girl|woman|sister|daughter|mother|queen|princess|lady|aunt|grandmother|grandma|wife|widow|bride)\b/gi) ?? []).length // KINEO-ELENCO-EPOCA-2710
  const m = (texto.match(/\b(?:he|him|his|himself|boy|man|brother|son|father|king|prince|uncle|grandfather|grandpa|husband|widower|groom)\b/gi) ?? []).length // KINEO-ELENCO-EPOCA-2710
  return f > m ? 'woman' : m > f ? 'man' : null // KINEO-ELENCO-EPOCA-2710
} // KINEO-ELENCO-EPOCA-2710

// KINEO-ELENCO-EPOCA-2710 — 28/10: o PRIMEIRO NOME comum diz o gênero quando o papel não diz. Caso real (render de 28/10): a menina urdu
// KINEO-ELENCO-EPOCA-2710 — "Amna" (آمنہ) saiu com cara de menino — o gênero só vinha de pronome, e a tradução urdu→inglês não tinha
// KINEO-ELENCO-EPOCA-2710 — nenhum ("Amna found a magical star…"); quando tinha, era o "he" do Baba Noor na mesma frase. Tabela fixa
// KINEO-ELENCO-EPOCA-2710 — (determinística, sem rede), só nomes INEQUÍVOCOS — unissex (Alex, Noor, Ji-woo, Kim…) fica fora e cai nos pronomes.
// KINEO-ELENCO-EPOCA-2710 — Ordem em descrever(): título (Dadi, Baba) → papel ("a girl") → NOME → pronomes das frases do nome.
const NOMES_FEMININOS = new Set([ // KINEO-ELENCO-EPOCA-2710
  'amna', 'aamna', 'amina', 'aminah', 'aisha', 'ayesha', 'aysha', 'aishah', 'fatima', 'fatimah', 'fatma', 'maryam', 'mariam', 'zara', 'zahra', 'sana', 'hira', 'khadija', 'khadijah', 'zainab', 'zaynab', 'mahnoor', 'iqra', 'rabia', 'saima', 'hina', 'nadia', 'laila', 'layla', 'leila', 'yasmin', 'yasmeen', 'huda', 'mehwish', 'anaya', 'inaya', 'alina', 'aliya', 'aaliya', 'samina', 'rukhsana', 'shabnam', 'farah', 'mariyam', 'safiya', 'hafsa', 'noura', 'salma', // KINEO-ELENCO-EPOCA-2710 — urdu/árabe romanizados
  'priya', 'ananya', 'aditi', 'kavya', 'diya', 'isha', 'pooja', 'puja', 'neha', 'anjali', 'lakshmi', 'sita', 'radha', 'meera', 'riya', 'shreya', 'sunita', 'geeta', 'gita', 'divya', 'nisha', // KINEO-ELENCO-EPOCA-2710 — hindi
  'ana', 'anna', 'maria', 'mariana', 'sofia', 'sophia', 'sophie', 'emma', 'olivia', 'ava', 'mia', 'isabella', 'isabela', 'isabel', 'julia', 'beatriz', 'camila', 'valentina', 'lucia', 'carmen', 'gabriela', 'laura', 'alice', 'helena', 'manuela', 'luiza', 'luisa', 'larissa', 'fernanda', 'juliana', 'patricia', 'rosa', 'elena', 'paula', 'clara', 'marta', 'joana', 'leticia', 'bianca', 'vitoria', 'giovanna', 'lara', 'alicia', 'ximena', 'daniela', 'catalina', // KINEO-ELENCO-EPOCA-2710 — português/espanhol
  'lily', 'emily', 'chloe', 'grace', 'ella', 'charlotte', 'amelia', 'hannah', 'jennifer', 'jessica', 'elizabeth', 'mary', 'lucy', 'sarah', 'sara', 'rachel', 'rebecca', 'susan', 'margaret', 'abigail', 'zoe', 'ruby', 'rose', 'daisy', 'matilda', 'wendy', // KINEO-ELENCO-EPOCA-2710 — inglês
  'seo-yeon', 'seoyeon', 'min-ji', 'minji', 'ha-eun', 'haeun', 'ji-yeon', 'jiyeon', 'soo-ah', 'sooah', 'yuna', 'seo-yun', 'hye-jin', 'eun-ji', 'soo-jin', 'ji-eun', 'jieun', 'su-bin', // KINEO-ELENCO-EPOCA-2710 — coreano romanizado
  'آمنہ', 'آمنه', 'امنہ', 'عائشہ', 'عائشة', 'عائشه', 'فاطمہ', 'فاطمة', 'فاطمه', 'مریم', 'مريم', 'زارا', 'زهرا', 'زہرا', 'ثنا', 'حرا', 'خدیجہ', 'خديجة', 'زینب', 'زينب', 'سارہ', 'سارة', 'ماہنور', 'لیلیٰ', 'ليلى', 'یاسمین', 'ياسمين', 'آمنة', 'أمينة', 'امینہ', // KINEO-ELENCO-EPOCA-2710 — escrita original (urdu/árabe)
  'प्रिया', 'सीता', 'राधा', 'आयशा', 'अनन्या', 'लक्ष्मी', 'मीरा', // KINEO-ELENCO-EPOCA-2710 — devanágari
].map(normaliza)) // KINEO-ELENCO-EPOCA-2710
const NOMES_MASCULINOS = new Set([ // KINEO-ELENCO-EPOCA-2710
  'ali', 'ahmed', 'ahmad', 'omar', 'umar', 'hassan', 'hasan', 'hussain', 'husain', 'hussein', 'bilal', 'hamza', 'usman', 'osman', 'ibrahim', 'yusuf', 'yousuf', 'yousef', 'muhammad', 'mohammed', 'mohammad', 'imran', 'faisal', 'tariq', 'zain', 'saad', 'salman', 'kareem', 'karim', 'khalid', 'ayaan', 'rayyan', 'hamid', 'rashid', 'adnan', 'asad', 'junaid', 'waqar', 'mustafa', 'abdullah', // KINEO-ELENCO-EPOCA-2710 — urdu/árabe romanizados
  'arjun', 'rahul', 'rohan', 'aarav', 'vivaan', 'aditya', 'ravi', 'raj', 'vikram', 'krishna', 'ram', 'amit', 'sanjay', 'suresh', 'ramesh', 'anil', 'vijay', 'arnav', // KINEO-ELENCO-EPOCA-2710 — hindi
  'joao', 'pedro', 'lucas', 'gabriel', 'rafael', 'mateus', 'matheus', 'gustavo', 'felipe', 'bruno', 'thiago', 'tiago', 'diego', 'carlos', 'juan', 'jose', 'luis', 'miguel', 'javier', 'alejandro', 'pablo', 'antonio', 'francisco', 'manuel', 'paulo', 'marcos', 'enzo', 'davi', 'arthur', 'heitor', 'bernardo', 'santiago', 'mateo', // KINEO-ELENCO-EPOCA-2710 — português/espanhol
  'james', 'john', 'michael', 'david', 'william', 'thomas', 'daniel', 'matthew', 'jack', 'oliver', 'harry', 'noah', 'liam', 'ethan', 'benjamin', 'samuel', 'joseph', 'henry', 'george', 'charles', 'edward', 'peter', 'robert', 'richard', 'jacob', 'max', 'tom', 'ben', // KINEO-ELENCO-EPOCA-2710 — inglês
  'min-jun', 'minjun', 'ji-ho', 'jiho', 'seo-jun', 'seojun', 'do-yun', 'doyun', 'jun-ho', 'junho', 'hyun-woo', 'hyunwoo', 'joon', 'tae-yang', // KINEO-ELENCO-EPOCA-2710 — coreano romanizado
  'علی', 'علي', 'احمد', 'أحمد', 'عمر', 'حسن', 'حسین', 'حسين', 'بلال', 'حمزہ', 'حمزة', 'یوسف', 'يوسف', 'محمد', 'ابراہیم', 'إبراهيم', 'عثمان', 'خالد', // KINEO-ELENCO-EPOCA-2710 — escrita original (urdu/árabe)
  'राम', 'अर्जुन', 'राहुल', 'रवि', 'कृष्ण', // KINEO-ELENCO-EPOCA-2710 — devanágari
].map(normaliza)) // KINEO-ELENCO-EPOCA-2710
/** O gênero que o PRIMEIRO nome diz (tabela fixa); nome fora da tabela ou unissex → null (decide o pronome). */ // KINEO-ELENCO-EPOCA-2710
export function generoDoNome(nome: string): 'man' | 'woman' | null { // KINEO-ELENCO-EPOCA-2710
  const primeiro = normaliza(String(nome ?? '').trim().split(/\s+/)[0] ?? '').replace(/['’]s$/, '').replace(/[.,!?;:"“”]+$/u, '') // KINEO-ELENCO-EPOCA-2710
  if (!primeiro) return null // KINEO-ELENCO-EPOCA-2710
  return NOMES_FEMININOS.has(primeiro) ? 'woman' : NOMES_MASCULINOS.has(primeiro) ? 'man' : null // KINEO-ELENCO-EPOCA-2710
} // KINEO-ELENCO-EPOCA-2710

/** Descrição curta e fixa (mesmo nome → mesma cara); com época, a roupa é a da década. */ // KINEO-ELENCO-EPOCA-2710
/** Conto infantil: o template kids_cartoon, ou pistas do texto (estrela mágica, dragãozinho, fada, "era uma vez", ننھا/پری em urdu, menino/menina pequeno). */ // KINEO-ELENCO-EPOCA-2710
const INFANTIL_EN_RE = /\b(?:magic(?:al)?\s+(?:star|wand|forest|garden|kingdom|key|seed|stone|tree|cloud|kite|balloon)|(?:little|tiny|baby)\s+(?:dragon|star|cloud|bunny|rabbit|bear|fox|kitten|puppy|duck|bird|owl|mouse|elephant|whale|monster|robot|unicorn|fairy|princess|prince)|fairy|fairies|unicorns?|talking\s+(?:[a-z]+\s+)?(?:animal|star|cloud|tree|toy|teddy|cat|dog)|once\s+upon\s+a\s+time|bedtime\s+story|teddy\s+bear|lullaby|kindergarten|nursery|playground|tooth\s+fairy|(?:little|young|small)\s+(?:girl|boy|child|kid))\b/i // KINEO-ELENCO-EPOCA-2710
const INFANTIL_ORIGINAL_RE = /(?:ننھ[اےی]|چھوٹ[اےی]\s*(?:سا|سی)|پری\b|جادوئی|एक\s+था|छोट[ाीे]\s+(?:बच्च|लड़क)|\b(?:pequen[ao]\s+(?:menin[ao]|drag[aã]o|estrel[ai]nha|fad[ai]nha)|menininh[ao]|dragãozinho|estrelinha\s+mágica|fad[ai]nha|era\s+uma\s+vez|hadita|dragoncito|estrellita\s+mágica|niñ[ao]\s+pequeñ[ao]|érase\s+una\s+vez|había\s+una\s+vez)\b)/iu // KINEO-ELENCO-EPOCA-2710
export function historiaInfantil(contextoOriginal: string, textoIngles: string | null | undefined, kidsCartoon = false): boolean { // KINEO-ELENCO-EPOCA-2710
  if (kidsCartoon) return true // KINEO-ELENCO-EPOCA-2710
  return INFANTIL_EN_RE.test(String(textoIngles ?? '')) || INFANTIL_ORIGINAL_RE.test(String(contextoOriginal ?? '')) || INFANTIL_EN_RE.test(String(contextoOriginal ?? '')) // KINEO-ELENCO-EPOCA-2710
} // KINEO-ELENCO-EPOCA-2710
const ADULTO_RE = /\b(?:man|woman|men|women|father|mother|dad|mom|mum|papa|mama|husband|wife|uncle|aunt|king|queen|teacher|doctor|nurse|farmer|fisherman|soldier|worker|driver|shopkeeper|merchant|officer|knight|wizard|witch|captain|pilot|chef|baker|lady|gentleman|adult|parent)\b/i // KINEO-ELENCO-EPOCA-2710 — papel ou título adulto explícito: o conto infantil não o rejuvenesce
function descrever(nome: string, tipo: TipoNomeado, especie: string | null, papel: string, contexto: string, titulos: string[], epoca: Epoca | null, usados: Set<string>, infantil = false): { descricao: string; genero: 'man' | 'woman' | null } { // KINEO-ELENCO-EPOCA-2710
  const h = hash(normaliza(nome)) // KINEO-ELENCO-EPOCA-2710
  if (tipo !== 'humano') { // KINEO-ELENCO-EPOCA-2710
    const corDita = new RegExp(`\\b(${CORES})\\b`, 'i').exec(papel)?.[1]?.toLowerCase() ?? null // KINEO-ELENCO-EPOCA-2710
    const cor = corDita ?? escolhe(CORES_SER, h, usados) // KINEO-ELENCO-EPOCA-2710
    const pequeno = /\b(?:tiny|little|small|baby|young)\b/i.test(papel) || /\b(?:tiny|little|small|baby)\b/i.test(contexto) // KINEO-ELENCO-EPOCA-2710
    if (/\b(?:jelly|gelatine?|jello|blob|slime)\b/i.test(especie ?? '')) return { descricao: `${nome}, a ${pequeno ? 'small ' : ''}wobbly translucent ${cor} jelly blob creature with a simple smiling face and two round eyes (a soft gelatin being, not a sea jellyfish)`, genero: null } // KINEO-ELENCO-EPOCA-2710
    // KINEO-JUIZ-REFAZ-2810 — era o MASCOTE: `a ${pequeno ? 'small and chubby' : 'medium-sized'} ${cor} ${oQue} with big round friendly eyes and a short tail, no clothes` — "Lucifer, a medium-sized bright green angel with big round friendly eyes and a short tail" (Gênesis 28/10), o fantasma roxo do Ghost Rider (27/10). Agora a anatomia da espécie; o fofo só no conto infantil (lib/cinematic/seresFieis).
    return { descricao: descricaoFielDoSer({ nome, tipo, especie, corDita, corSorteada: cor, pequeno, infantil }), genero: null } // KINEO-JUIZ-REFAZ-2810
  } // KINEO-ELENCO-EPOCA-2710
  const titulo = titulos[0] ?? '' // KINEO-ELENCO-EPOCA-2710
  const genero = FEM_TITULO_RE.test(titulo) ? 'woman' : MASC_TITULO_RE.test(titulo) ? 'man' : generoDe(papel) ?? generoDoNome(nome) ?? generoDe(contexto) // KINEO-ELENCO-EPOCA-2710 — 28/10: o nome vem antes dos pronomes da frase (o "he" do Baba Noor não vira a Amna em menino)
  const adolescente = /\b(?:teen|teenager|student)\b/i.test(papel) // KINEO-ELENCO-EPOCA-2710
  const velho = VELHO_TITULO_RE.test(titulo) || /\b(?:old|elderly|grandfather|grandmother|grandpa|grandma|elder|widow|widower)\b/i.test(papel) // KINEO-ELENCO-EPOCA-2710
  // conto infantil (kids_cartoon, estrela mágica, dragãozinho, ننھا…): nome humano SEM pista de idade é criança (~9 anos), nunca "a woman in her thirties" (a Amna do conto urdu) // KINEO-ELENCO-EPOCA-2710
  const semPistaDeIdade = !titulo && !velho && !adolescente && !ADULTO_RE.test(papel) && !/\b(?:young|younger|middle-aged|adult|grown)\b/i.test(papel) // KINEO-ELENCO-EPOCA-2710
  const crianca = /\b(?:boy|girl|kid|child|baby|toddler|little|tiny|orphan)\b/i.test(papel) || (!titulo && /\b(?:little|young)\s+(?:girl|boy|child|kid)\b/i.test(contexto)) || (infantil && semPistaDeIdade) // KINEO-ELENCO-EPOCA-2710
  const jovem = /\b(?:young|younger)\b/i.test(papel) // KINEO-ELENCO-EPOCA-2710
  const pron = genero === 'woman' ? 'her' : genero === 'man' ? 'his' : 'their' // KINEO-ELENCO-EPOCA-2710
  const idade = crianca ? 'about nine years old' : adolescente ? 'about sixteen years old' : velho ? `in ${pron} late sixties with a lined face` : jovem ? `in ${pron} early twenties` : `in ${pron} thirties` // KINEO-ELENCO-EPOCA-2710
  const pessoa = genero === 'woman' ? (crianca ? 'girl' : velho ? 'elderly woman' : 'woman') : genero === 'man' ? (crianca ? 'boy' : velho ? 'elderly man' : 'man') : crianca ? 'child' : 'person' // KINEO-ELENCO-EPOCA-2710
  const cabelo = velho ? (genero === 'man' ? 'short white hair and a white beard' : 'white hair tied back') : escolhe(genero === 'woman' ? CABELO_FEMININO : CABELO, h, usados) // KINEO-ELENCO-EPOCA-2710 — 28/10: menina/mulher nunca sai com cabelo curto de menino
  const rosto = escolhe(ROSTO, h >>> 2, usados) // KINEO-ELENCO-EPOCA-2710
  const roupa = epoca ? `period-accurate ${epoca.rotulo} clothing` : escolhe(crianca ? ROUPA_CRIANCA : velho ? ROUPA_VELHO : ROUPA_ADULTO, h >>> 4, usados) // KINEO-ELENCO-EPOCA-2710
  const papelTxt = papel && !/\b(?:man|woman|boy|girl|person|child)\b/i.test(papel) && PESSOA_RE.test(papel) ? ` (the ${papel.toLowerCase().replace(/^(?:a|an|the)\s+/, '')})` : '' // KINEO-ELENCO-EPOCA-2710 — "the commuter", "the lighthouse keeper"
  return { descricao: `${nome}${papelTxt}, ${/^[aeiou]/i.test(pessoa) ? 'an' : 'a'} ${pessoa} ${idade} with ${cabelo}, ${rosto}, wearing ${roupa}`, genero } // KINEO-ELENCO-EPOCA-2710
} // KINEO-ELENCO-EPOCA-2710

function tipoDe(nome: string, aposto: string | null, frases: string, titulos: string[]): { tipo: TipoNomeado; especie: string | null } { // KINEO-ELENCO-EPOCA-2710
  if (titulos.length > 0) return { tipo: 'humano', especie: null } // KINEO-ELENCO-EPOCA-2710
  const fonte = aposto ?? '' // KINEO-ELENCO-EPOCA-2710
  const nucleo = fonte.split(' ').pop() ?? '' // KINEO-ELENCO-EPOCA-2710
  if (nucleo) { // KINEO-ELENCO-EPOCA-2710
    if (PESSOA_RE.test(nucleo)) return { tipo: 'humano', especie: null } // KINEO-ELENCO-EPOCA-2710
    if (CRIATURA_RE.test(nucleo)) return { tipo: 'criatura', especie: nucleo.toLowerCase() === 'dino' ? 'dinosaur' : nucleo.toLowerCase() } // KINEO-ELENCO-EPOCA-2710
    if (ANIMAL_RE.test(nucleo)) return { tipo: 'animal', especie: nucleo.toLowerCase() } // KINEO-ELENCO-EPOCA-2710
    return { tipo: 'criatura', especie: nucleo.toLowerCase() } // KINEO-ELENCO-EPOCA-2710 — geleia, nuvem, estrela que fala
  } // KINEO-ELENCO-EPOCA-2710
  // sem aposto: a espécie que as frases do nome dizem perto dele ("the dragon Mishu flew") — gente por padrão // KINEO-ELENCO-EPOCA-2710
  const janela = new RegExp(String.raw`(?:(${CRIATURAS}|${ANIMAIS})s?\s+(?:named\s+|called\s+)?${escapaRe(nome)}|${escapaRe(nome)}\s+the\s+(?:[\p{Ll}-]+\s+){0,2}(${CRIATURAS}|${ANIMAIS})s?)\b`, 'iu').exec(frases) // KINEO-ELENCO-EPOCA-2710
  if (janela) { const e = (janela[1] ?? janela[2]).toLowerCase(); return { tipo: CRIATURA_RE.test(e) ? 'criatura' : 'animal', especie: e === 'dino' ? 'dinosaur' : e } } // KINEO-ELENCO-EPOCA-2710
  // o próprio nome diz a espécie ("Dino", "Leo the Lion" já caiu acima): como em lib/cinematic/folhaDePersonagem tipoDoNome // KINEO-ELENCO-EPOCA-2710
  const pelaForma = CRIATURA_RE.exec(nome.toLowerCase()) ?? ANIMAL_RE.exec(nome.toLowerCase()) // KINEO-ELENCO-EPOCA-2710
  if (pelaForma) { const e = pelaForma[0].toLowerCase(); return { tipo: CRIATURA_RE.test(e) ? 'criatura' : 'animal', especie: e === 'dino' ? 'dinosaur' : e } } // KINEO-ELENCO-EPOCA-2710
  return { tipo: 'humano', especie: null } // KINEO-ELENCO-EPOCA-2710
} // KINEO-ELENCO-EPOCA-2710

/** Os personagens NOMEADOS do texto em inglês (até 3; o protagonista é quem mais age). Texto sem nome que age → []. */ // KINEO-ELENCO-EPOCA-2710
export function personagensNomeados(textoIngles: string, epoca: Epoca | null = null, infantil = false): PersonagemNomeado[] { // KINEO-ELENCO-EPOCA-2710
  const texto = limpa(sanitizeRealPeople(semRotulosDeSecao(String(textoIngles ?? '').replace(/\[[^\]]*\]/g, ' ')))).slice(0, 8000) // KINEO-ELENCO-MARCADOR-2910
  if (!texto) return [] // KINEO-ELENCO-EPOCA-2710
  const lista = candidatos(texto).sort((a, b) => (b.atua + b.forte) - (a.atua + a.forte) || b.total - a.total || a.primeira - b.primeira).slice(0, ELENCO_EPOCA_MAX_PERSONAGENS) // KINEO-ELENCO-EPOCA-2710
  const usados = new Set<string>() // KINEO-ELENCO-EPOCA-2710
  const saida = lista.flatMap((c): PersonagemNomeado[] => { // KINEO-ELENCO-EPOCA-2710 · KINEO-JUIZ-REFAZ-2810 — flatMap: a coisa de cenário sai sem deixar buraco; o protagonista é decidido depois
    const frases = frasesCom(texto, c.nome).join(' ') // KINEO-ELENCO-EPOCA-2710
    // KINEO-JUIZ-REFAZ-2810 — figura conhecida (Lucifer, Ghost Rider, Krishna…) tem a cara que o mundo reconhece ANTES de qualquer dedução de espécie: "Lucifer, the brightest angel" não é "a bright green angel with a short tail"
    const fig = figuraFiel(c.nome) // KINEO-JUIZ-REFAZ-2810
    if (fig) return [{ nome: c.nome, nomeado: true, tipo: fig.tipo, genero: fig.genero, descricao: `${c.nome}, ${fig.descricao}`, protagonista: false, ocorrencias: c.total, posicoes: c.posicoes.sort((x, y) => x - y) }] // KINEO-JUIZ-REFAZ-2810
    const { tipo, especie } = tipoDe(c.nome, c.aposto, frases, c.titulos) // KINEO-ELENCO-EPOCA-2710
    if (!infantil && tipo === 'criatura' && especie !== null && COISA_DE_CENARIO_RE.test(especie)) return [] // KINEO-JUIZ-REFAZ-2810 — fora do conto infantil, estrela/nuvem/pedra é cenário, não "named character"
    const d = descrever(c.nome, tipo, especie, c.aposto ?? '', frases, c.titulos, epoca, usados, infantil) // KINEO-ELENCO-EPOCA-2710
    return [{ nome: c.nome, nomeado: true, tipo, genero: d.genero, descricao: d.descricao, protagonista: false, ocorrencias: c.total, posicoes: c.posicoes.sort((x, y) => x - y) }] // KINEO-ELENCO-EPOCA-2710 · KINEO-JUIZ-REFAZ-2810 — protagonista decidido abaixo
  }) // KINEO-ELENCO-EPOCA-2710
  return saida.map((p, i) => ({ ...p, protagonista: i === 0 })) // KINEO-JUIZ-REFAZ-2810 — quem mais age entre os que FICARAM é o protagonista (era `i === 0` do mapa, antes do filtro)
} // KINEO-ELENCO-EPOCA-2710

const SEM_NOME_RE = new RegExp(String.raw`\b(?:a|an|the)\s+((?:(?:sad|happy|young|little|tiny|small|big|old|elderly|teenage|brave|clever|lonely|curious|shy|kind|poor|rich|tall|short|scared|sleepy|tired|exhausted|weary|nervous|quiet|lost|late|lone|lonely|middle-aged|cheerful|grumpy|mysterious|friendly|wise|night-shift|night)\s+){0,3}(?:${PESSOAS}))\b`, 'i') // KINEO-ELENCO-EPOCA-2710
/** Protagonista SEM nome ("a tired commuter", "a young man"): o 1º papel humano do texto em inglês. */ // KINEO-ELENCO-EPOCA-2710
export function protagonistaSemNome(textoIngles: string, epoca: Epoca | null = null, infantil = false): PersonagemNomeado | null { // KINEO-ELENCO-EPOCA-2710
  const texto = limpa(String(textoIngles ?? '').replace(/\[[^\]]*\]/g, ' ')).slice(0, 8000) // KINEO-ELENCO-EPOCA-2710
  const m = SEM_NOME_RE.exec(texto) // KINEO-ELENCO-EPOCA-2710
  if (!m) return null // KINEO-ELENCO-EPOCA-2710
  const papel = limpa(m[1]) // KINEO-ELENCO-EPOCA-2710
  const nucleo = papel.split(' ').pop() ?? papel // KINEO-ELENCO-EPOCA-2710
  const frases = frasesCom(texto, nucleo).join(' ') // KINEO-ELENCO-EPOCA-2710
  const d = descrever(`the ${papel.toLowerCase()}`, 'humano', null, papel, frases, [], epoca, new Set(), infantil) // KINEO-ELENCO-EPOCA-2710
  return { nome: `the ${papel.toLowerCase()}`, nomeado: false, tipo: 'humano', genero: d.genero, descricao: d.descricao.replace(/^the\s+[^,(]+(?:\s\([^)]*\))?,\s*/i, `the ${papel.toLowerCase()}, `), protagonista: true, ocorrencias: 1, posicoes: [(m.index ?? 0) / Math.max(1, texto.length)] } // KINEO-ELENCO-EPOCA-2710
} // KINEO-ELENCO-EPOCA-2710

// ═══ 3. FALSOS AMIGOS ═════════════════════════════════════════════════════════════════════════════════════════════ // KINEO-ELENCO-EPOCA-2710
interface FalsoAmigo { gatilho: RegExp; contra: RegExp; errado: RegExp; certo: string; nome: string } // KINEO-ELENCO-EPOCA-2710
/** Casos conhecidos: a palavra da história (língua original) × a tradução literal errada no prompt em inglês × o que a cena devia mostrar. */ // KINEO-ELENCO-EPOCA-2710
export const FALSOS_AMIGOS: ReadonlyArray<FalsoAmigo> = [ // KINEO-ELENCO-EPOCA-2710
  { nome: 'geleia→jellyfish', gatilho: /(?<!\p{L})(?:gel[ée]ias?|gelatinas?|jaleas?|gel[ée]es?|gelatine)(?!\p{L})/iu, contra: /(?<!\p{L})(?:água[- ]viva|aguaviva|agua[- ]viva|alforreca|medusas?|aguamala|m[ée]duses?|qualle|jellyfish)(?!\p{L})/iu, errado: /\bjelly[- ]?fish(?:es)?\b/gi, certo: 'jelly blob creature (a soft wobbly gelatin being, not a sea jellyfish)' }, // KINEO-ELENCO-EPOCA-2710 — lookaround Unicode: \b não enxerga "água"
] // KINEO-ELENCO-EPOCA-2710

/** Troca a tradução literal pelo sentido, só quando a história original tem o gatilho e não tem o contrário. Idempotente. */ // KINEO-ELENCO-EPOCA-2710
export function corrigirFalsosAmigos(prompt: string, contextoOriginal: string): { prompt: string; trocas: string[] } { // KINEO-ELENCO-EPOCA-2710
  let out = String(prompt ?? '') // KINEO-ELENCO-EPOCA-2710
  const ctx = String(contextoOriginal ?? '') // KINEO-ELENCO-EPOCA-2710
  const trocas: string[] = [] // KINEO-ELENCO-EPOCA-2710
  for (const fa of FALSOS_AMIGOS) { // KINEO-ELENCO-EPOCA-2710
    if (!fa.gatilho.test(ctx) || fa.contra.test(ctx)) continue // KINEO-ELENCO-EPOCA-2710
    if (out.includes(fa.certo)) continue // KINEO-ELENCO-EPOCA-2710 — já corrigido (o texto certo contém a palavra errada negada)
    fa.errado.lastIndex = 0 // KINEO-ELENCO-EPOCA-2710
    if (!fa.errado.test(out)) continue // KINEO-ELENCO-EPOCA-2710
    fa.errado.lastIndex = 0 // KINEO-ELENCO-EPOCA-2710
    out = out.replace(fa.errado, fa.certo) // KINEO-ELENCO-EPOCA-2710
    trocas.push(fa.nome) // KINEO-ELENCO-EPOCA-2710
  } // KINEO-ELENCO-EPOCA-2710
  return { prompt: out, trocas } // KINEO-ELENCO-EPOCA-2710
} // KINEO-ELENCO-EPOCA-2710

// ═══ 4. A DIRETRIZ PARA O ESCRITOR DE CENAS E O DESCRITOR ═════════════════════════════════════════════════════════ // KINEO-ELENCO-EPOCA-2710
// Vive em lib/cinematic/visualPromptPolicy.ts (ELENCO_EPOCA_DIRECTION, dentro de visualDescriptionDirection): chega ao escritor de // KINEO-ELENCO-EPOCA-2710
// cenas (APPROVED VISUAL CONTRACT) e ao descritor do verbatim sem import novo lá. Texto é pedido; a garantia em código é a seção 5. // KINEO-ELENCO-EPOCA-2710

// ═══ 5. A APLICAÇÃO NOS PROMPTS FINAIS DAS CENAS ══════════════════════════════════════════════════════════════════ // KINEO-ELENCO-EPOCA-2710
export interface RelatoElencoEpoca { // KINEO-ELENCO-EPOCA-2710
  versao: string // KINEO-ELENCO-EPOCA-2710
  texto: 'ingles' | 'traduzido' | 'sem_traducao' // KINEO-ELENCO-EPOCA-2710
  epoca: { ano: number | null; decada: number; rotulo: string; origem: string } | null // KINEO-ELENCO-EPOCA-2710
  cenas_com_epoca: number[] // KINEO-ELENCO-EPOCA-2710
  elenco: Array<{ nome: string; nomeado: boolean; tipo: TipoNomeado; protagonista: boolean; descricao: string; cenas_pela_fala: number[]; cenas_inseridas: number[]; ja_presente: boolean }> // KINEO-ELENCO-EPOCA-2710
  ordem_removida: number[] // KINEO-ELENCO-EPOCA-2710
  falsos_amigos: string[] // KINEO-ELENCO-EPOCA-2710
  modernidades: string[] // KINEO-ELENCO-EPOCA-2710
  motivo_sem_elenco: string | null // KINEO-ELENCO-EPOCA-2710
  /** Conto infantil (kids_cartoon ou pistas do texto): nome humano sem idade dita vira criança de ~9 anos. */ // KINEO-ELENCO-EPOCA-2710
  historia_infantil: boolean // KINEO-ELENCO-EPOCA-2710
} // KINEO-ELENCO-EPOCA-2710

const ORDEM_PROTAGONISTA_RE = /^The only person in this shot is the same main character \((?:[^()]|\([^()]*\))*\); any other person described below is replaced by this same character\. /u // KINEO-ELENCO-EPOCA-2710 — lib/filmes/filme15Elenco ORDEM_DO_PROTAGONISTA
const CLAUSULA_SEM_GENTE_RE = /\s*No people, no human figures and no faces anywhere in this shot\./g // KINEO-ELENCO-EPOCA-2710 — lib/cinematic/personagemAjuste CLAUSULA_SEM_GENTE
const GENTE_NO_PROMPT_RE = /\b(?:man|men|woman|women|boy|boys|girl|girls|kid|kids|child|children|person|people|figure|figures|silhouette|silhouettes|commuter|passenger|passengers|someone|somebody|guy|lady|stranger|character|characters|hands?|face|faces)\b/i // KINEO-ELENCO-EPOCA-2710

/** O texto em inglês que o extrator lê: o original (inglês puro) ou a parte traduzida que a rota memoizou (contexto + inglês + nomes). */ // KINEO-ELENCO-EPOCA-2710
export function textoInglesDe(contextoOriginal: string, contextoFiltro: string | null | undefined): { texto: string | null; origem: RelatoElencoEpoca['texto'] } { // KINEO-ELENCO-EPOCA-2710
  const original = String(contextoOriginal ?? '') // KINEO-ELENCO-EPOCA-2710
  if (typeof contextoFiltro !== 'string') return { texto: null, origem: 'sem_traducao' } // KINEO-ELENCO-EPOCA-2710
  if (contextoFiltro === original) return { texto: original, origem: 'ingles' } // KINEO-ELENCO-EPOCA-2710
  if (contextoFiltro.startsWith(original)) { const resto = contextoFiltro.slice(original.length).trim(); return resto ? { texto: semListaDeNomes(resto), origem: 'traduzido' } : { texto: original, origem: 'ingles' } } // KINEO-ELENCO-EPOCA-2710
  return { texto: semListaDeNomes(contextoFiltro), origem: 'traduzido' } // KINEO-ELENCO-EPOCA-2710
} // KINEO-ELENCO-EPOCA-2710
/** vocabularioDoAssunto = "<inglês> <nomes separados por espaço>": a lista do fim ("Amna Mishu Baba Noor") não é uma pessoa de 4 nomes. Fica só a prosa (até a última pontuação de frase). */ // KINEO-ELENCO-EPOCA-2710
function semListaDeNomes(ingles: string): string { // KINEO-ELENCO-EPOCA-2710
  const fim = Math.max(ingles.lastIndexOf('.'), ingles.lastIndexOf('!'), ingles.lastIndexOf('?'), ingles.lastIndexOf('…'), ingles.lastIndexOf('۔')) // KINEO-ELENCO-EPOCA-2710
  return fim > 0 ? ingles.slice(0, fim + 1) : ingles // KINEO-ELENCO-EPOCA-2710
} // KINEO-ELENCO-EPOCA-2710

/** As cenas do personagem: as cuja FALA (original) cita uma palavra do nome; senão, as da posição das ocorrências no texto. */ // KINEO-ELENCO-EPOCA-2710
export function cenasDoPersonagem(p: PersonagemNomeado, falas: ReadonlyArray<string>): { pelaFala: number[]; porPosicao: number[] } { // KINEO-ELENCO-EPOCA-2710
  if (p.possessivo) return { pelaFala: falas.map((f, i) => falaCitaPessoa(f, p.possessivo!.nucleo) ? i : -1).filter((i) => i >= 0), porPosicao: [] } // KINEO-ELENCO-MARCADOR-2910
  const n = falas.length // KINEO-ELENCO-EPOCA-2710
  const palavras = p.nome.split(' ').filter((w) => !PARTICULAS.has(w.toLowerCase()) && !TITULO_RE.test(w) && w.replace(/[^\p{L}]/gu, '').length >= 3) // KINEO-ELENCO-EPOCA-2710
  const pelaFala = p.nomeado ? falas.map((f, i) => (palavras.some((w) => citaPalavra(f, w)) ? i : -1)).filter((i) => i >= 0) : [] // KINEO-ELENCO-EPOCA-2710
  const porPosicao = [...new Set(p.posicoes.map((r) => Math.min(n - 1, Math.max(0, Math.floor(r * n)))))] // KINEO-ELENCO-EPOCA-2710
  return { pelaFala, porPosicao } // KINEO-ELENCO-EPOCA-2710
} // KINEO-ELENCO-EPOCA-2710

export const CLAUSULA_ELENCO = (descricoes: ReadonlyArray<string>, faceless: boolean) => `Named character${descricoes.length > 1 ? 's' : ''} in this shot: ${descricoes.join('; ')} — clearly visible in frame${faceless ? ', seen from behind or in profile, face not readable' : ''}. ` // KINEO-ELENCO-EPOCA-2710

/**
 * Elenco nomeado + época + falsos amigos nos prompts FINAIS das cenas (o vetor que alimenta o still FLUX e o clipe), depois do
 * último toque da rota (contrato, eixos, monumento, folha) e antes da moderação, do dry-run e de qualquer POST. Sem nada a fazer:
 * byte a byte.
 */ // KINEO-ELENCO-EPOCA-2710
export function aplicarElencoEEpoca(args: { // KINEO-ELENCO-EPOCA-2710
  prompts: ReadonlyArray<string> // KINEO-ELENCO-EPOCA-2710
  falas: ReadonlyArray<string> // KINEO-ELENCO-EPOCA-2710
  contextoOriginal: string // KINEO-ELENCO-EPOCA-2710
  contextoFiltro: string | null | undefined // KINEO-ELENCO-EPOCA-2710
  modo: ModoVisualDoElenco // KINEO-ELENCO-EPOCA-2710
  tagFaceless: boolean // KINEO-ELENCO-EPOCA-2710
  /** O template /kids-cartoon está ativo no pedido: conto infantil sem precisar de pista no texto. */ // KINEO-ELENCO-EPOCA-2710
  kidsCartoon?: boolean // KINEO-ELENCO-EPOCA-2710
}): { prompts: string[]; relato: RelatoElencoEpoca } { // KINEO-ELENCO-EPOCA-2710
  const prompts = args.prompts.map((p) => String(p ?? '')) // KINEO-ELENCO-EPOCA-2710
  const n = prompts.length // KINEO-ELENCO-EPOCA-2710
  const { texto, origem } = textoInglesDe(args.contextoOriginal, args.contextoFiltro) // KINEO-ELENCO-EPOCA-2710
  const epoca = epocaDaHistoria(args.contextoOriginal) // KINEO-ELENCO-EPOCA-2710
  const infantil = historiaInfantil(args.contextoOriginal, texto, args.kidsCartoon === true) // KINEO-ELENCO-EPOCA-2710 — a Amna do conto urdu é menina, não "a woman in her thirties"
  const relato: RelatoElencoEpoca = { versao: ELENCO_EPOCA_VERSAO, texto: origem, epoca: epoca ? { ano: epoca.ano, decada: epoca.decada, rotulo: epoca.rotulo, origem: epoca.origem } : null, cenas_com_epoca: [], elenco: [], ordem_removida: [], falsos_amigos: [], modernidades: [], motivo_sem_elenco: null, historia_infantil: infantil } // KINEO-ELENCO-EPOCA-2710
  if (n === 0) return { prompts, relato } // KINEO-ELENCO-EPOCA-2710
  // C. falsos amigos (antes do elenco: a descrição da Geli já nasce certa; o prompt que dizia jellyfish é consertado) // KINEO-ELENCO-EPOCA-2710
  for (let i = 0; i < n; i++) { const r = corrigirFalsosAmigos(prompts[i], args.contextoOriginal); prompts[i] = r.prompt; for (const t of r.trocas) if (!relato.falsos_amigos.includes(t)) relato.falsos_amigos.push(t) } // KINEO-ELENCO-EPOCA-2710
  // A. elenco nomeado // KINEO-ELENCO-EPOCA-2710
  if (args.tagFaceless) relato.motivo_sem_elenco = 'tag_faceless' // KINEO-ELENCO-EPOCA-2710
  else if (args.modo === 'presenter') relato.motivo_sem_elenco = 'presenter' // KINEO-ELENCO-EPOCA-2710
  else if (texto === null) relato.motivo_sem_elenco = 'sem_traducao' // KINEO-ELENCO-EPOCA-2710
  else { // KINEO-ELENCO-EPOCA-2710
    const faceless = args.modo === 'documentary_faceless' // KINEO-ELENCO-EPOCA-2710
    let elenco = personagensNomeados(texto, epoca, infantil) // KINEO-ELENCO-EPOCA-2710
    // KINEO-ELENCO-MARCADOR-2910 — dono sem nome entra mesmo quando já existe outro personagem (ou outra pessoa nos visuais).
    for (const pessoa of pessoasPossessivas(texto)) {
      if (elenco.some((p) => p.possessivo?.nucleo === pessoa.nucleo)) continue
      elenco.push({ nome: `the ${pessoa.papel}`, nomeado: false, tipo: 'humano', genero: pessoa.genero, descricao: pessoa.descricao, protagonista: false, ocorrencias: 1, posicoes: [pessoa.posicao], possessivo: { nucleo: pessoa.nucleo, objeto: pessoa.objeto } })
    }
    if (elenco.length === 0) { // KINEO-ELENCO-EPOCA-2710
      const semNome = protagonistaSemNome(texto, epoca, infantil) // KINEO-ELENCO-EPOCA-2710
      // só quando NENHUM prompt mostra gente: o passageiro do último trem sumiu porque as 3 cenas eram plataforma, relógio e trilho // KINEO-ELENCO-EPOCA-2710
      if (semNome && !prompts.some((p) => GENTE_NO_PROMPT_RE.test(p.replace(/no (?:foreground )?(?:human )?faces?/gi, '').replace(/No people, no human figures and no faces anywhere in this shot\./g, '').replace(/talking head|foreground human face/gi, '')))) elenco = [semNome] // KINEO-ELENCO-EPOCA-2710
      else relato.motivo_sem_elenco = semNome ? 'protagonista_sem_nome_ja_em_cena' : 'sem_personagem' // KINEO-ELENCO-EPOCA-2710
    } // KINEO-ELENCO-EPOCA-2710
    const porCena: string[][] = prompts.map(() => []) // KINEO-ELENCO-EPOCA-2710
    for (const p of elenco) { // KINEO-ELENCO-EPOCA-2710
      const presente = prompts.map((pr) => (p.nomeado ? p.nome.split(' ').filter((w) => !TITULO_RE.test(w) && !PARTICULAS.has(w.toLowerCase())).some((w) => citaPalavra(pr, w)) : p.possessivo ? cenaMostraPessoa(pr, p.possessivo.nucleo) : citaPalavra(pr, p.nome.split(' ').pop() ?? p.nome))) // KINEO-ELENCO-MARCADOR-2910 — "girl's teddy" no prompt não prova menina visível.
      const { pelaFala, porPosicao } = cenasDoPersonagem(p, args.falas) // KINEO-ELENCO-EPOCA-2710
      const alvo = p.possessivo ? pelaFala : pelaFala.length > 0 ? pelaFala : porPosicao.length > 0 ? porPosicao : [0] // KINEO-ELENCO-MARCADOR-2910
      const jaPresente = presente.some(Boolean) // KINEO-ELENCO-EPOCA-2710
      const inseridas: number[] = [] // KINEO-ELENCO-EPOCA-2710
      // protagonista ausente de TODO prompt: entra em todas as cenas-alvo; coadjuvante: nas cenas-alvo em que não está // KINEO-ELENCO-EPOCA-2710
      for (const i of alvo) if (!presente[i] && porCena[i].length < ELENCO_EPOCA_MAX_POR_CENA) { // KINEO-ELENCO-MARCADOR-2910
        const objeto = p.possessivo ? pessoasPossessivas(args.falas[i]).find((dono) => dono.nucleo === p.possessivo!.nucleo)?.objeto : null // KINEO-ELENCO-MARCADOR-2910
        porCena[i].push(`${p.descricao}${objeto ? ` ${objeto}` : ''}`); inseridas.push(i) // KINEO-ELENCO-MARCADOR-2910
      } // KINEO-ELENCO-MARCADOR-2910
      if (p.protagonista && inseridas.length === 0 && !jaPresente && porCena[0].length < ELENCO_EPOCA_MAX_POR_CENA) { porCena[0].push(p.descricao); inseridas.push(0) } // KINEO-ELENCO-EPOCA-2710
      relato.elenco.push({ nome: p.nome, nomeado: p.nomeado, tipo: p.tipo, protagonista: p.protagonista, descricao: p.descricao, cenas_pela_fala: pelaFala.map((i) => i + 1), cenas_inseridas: inseridas.map((i) => i + 1), ja_presente: jaPresente }) // KINEO-ELENCO-EPOCA-2710
    } // KINEO-ELENCO-EPOCA-2710
    for (let i = 0; i < n; i++) { // KINEO-ELENCO-EPOCA-2710
      if (porCena[i].length === 0) continue // KINEO-ELENCO-EPOCA-2710
      let p = prompts[i] // KINEO-ELENCO-EPOCA-2710
      if (ORDEM_PROTAGONISTA_RE.test(p)) { p = p.replace(ORDEM_PROTAGONISTA_RE, ''); relato.ordem_removida.push(i + 1) } // KINEO-ELENCO-EPOCA-2710 — "qualquer outra pessoa vira o protagonista" expulsaria quem entra agora
      p = p.replace(CLAUSULA_SEM_GENTE_RE, '') // KINEO-ELENCO-EPOCA-2710
      const clausula = porCena[i].some((d) => /^(?:a|an)\s/.test(d)) ? CLAUSULA_ELENCO(porCena[i], faceless).replace(/^Named character/, 'Character') : CLAUSULA_ELENCO(porCena[i], faceless) // KINEO-ELENCO-MARCADOR-2910 — papel sem nome nunca recebe o rótulo "Named".
      if (p.length + clausula.length <= ELENCO_EPOCA_TETO_PROMPT) prompts[i] = clausula + p // KINEO-ELENCO-EPOCA-2710
      else { prompts[i] = p; for (const e of relato.elenco) e.cenas_inseridas = e.cenas_inseridas.filter((c) => c !== i + 1) } // KINEO-ELENCO-EPOCA-2710 — sem espaço: nada entra, o relato diz
    } // KINEO-ELENCO-EPOCA-2710
  } // KINEO-ELENCO-EPOCA-2710
  // B. época em toda cena (gente, veículo ou interior de qualquer cena precisa da década); o objeto de hoje que o descritor escreveu sai antes // KINEO-ELENCO-EPOCA-2710
  if (epoca) for (let i = 0; i < n; i++) { // KINEO-ELENCO-EPOCA-2710
    const t = trocarModernidades(prompts[i], epoca) // KINEO-ELENCO-EPOCA-2710
    for (const x of t.trocas) if (!relato.modernidades.includes(x)) relato.modernidades.push(x) // KINEO-ELENCO-EPOCA-2710
    const r = aplicarEpoca(t.prompt, epoca) // KINEO-ELENCO-EPOCA-2710
    prompts[i] = r.prompt // KINEO-ELENCO-EPOCA-2710
    if (r.aplicada === 'longa' || r.aplicada === 'curta') relato.cenas_com_epoca.push(i + 1) // KINEO-ELENCO-EPOCA-2710
  } // KINEO-ELENCO-EPOCA-2710
  return { prompts, relato } // KINEO-ELENCO-EPOCA-2710
} // KINEO-ELENCO-EPOCA-2710
