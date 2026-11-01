// KINEO-K4-SUJEITO-0111 [TRAVA 8.2 — vai do fundador 01/11 "vai tudo" (melhorias)] — O SUJEITO OBRIGATÓRIO DO FILME KLING 4.
//
// Revisor de vídeos, 01/11 (docs/revisao-videos/2026-11-01.md e FILA-DEFEITOS.md, CENA_FORA_DO_PEDIDO): no filme grátis de 15 s do
// Kling 4 (multi_prompt de 3 cenas) o tema central do pedido não aparecia em quadro nenhum —
//   · "o avião C-54 que sumiu": o avião nunca aparece; 2 homens de terno em 5 de 8 quadros (1º filme; a cliente pagou mesmo assim);
//   · "criança com caneta 3D": a criança nunca aparece;
//   · "vida sob o gelo": o desfecho (a vida debaixo do gelo) não aparece.
// O elenco (elencoEpoca/folhaDePersonagem) cuida de GENTE nomeada; máquina, bicho e objeto central não tinham dono — e veículo é
// sujeito, nunca pessoa (KINEO-ELENCO-AVIAO-LUGAR-0111 já impede "Skymaster" de virar homem de terno; faltava o avião ENTRAR).
//
// Aqui, puro e determinístico (sem rede, sem custo), ANTES do POST pago:
//   1. pedidoOriginalDoSujeito — o sujeito sai SÓ do pedido original da pessoa (v2, revisão adversarial da leva 2): no modo IA a
//      rota recebe o ROTEIRO pronto (HOOK/PAYOFF com pistas [Pexels: …]) e ler o sujeito dele exigia "a rover" num filme sobre Marte
//      e tirava a criança da caneta 3D. Fontes aceitas: a ideia solta que chegou crua (o servidor escreve o roteiro) ou a
//      `original_idea` que o /studio/create manda junto com o roteiro estruturado a partir DELA. Roteiro "as is", ideia longa,
//      ideia com marcadores/pistas ou que não fala do mesmo assunto da narração = null, nada é corrigido (fail-safe).
//   2. sujeitoObrigatorio — do pedido sai o sujeito central: veículo, criatura, criança (com o objeto que segura) ou objeto, por um
//      léxico curto em inglês/português/espanhol com fronteira de palavra e desambiguação ("Lula" é pessoa — lula só com
//      "gigante"; "Tesouro Direto" é finanças; "bebe" é verbo; "train your brain" é verbo; "fight or flight" não é voo; "SS" só com
//      nome de navio e contexto naval, nunca com contexto nazista; "crash" sozinho não é aviação; "their kids"/"ensinar os filhos"
//      não exige criança). Nome próprio de gente NUNCA vira sujeito (essa é a regra do elenco). A fala só ENRIQUECE o modelo de um
//      veículo que o pedido já pede (mesma família) — nunca cria o sujeito.
//   3. exigirSujeitoNoKling4 — se nenhum prompt do multi_prompt mostra o sujeito, a cena cuja FALA o cita (senão a última, o
//      desfecho) ganha "Main subject clearly visible in frame: …" logo depois do meio, dentro do orçamento de 464 code points da
//      camada (o mesmo de cenaKling4). Corrige, nunca bloqueia. A cena corrigida que tinha imagem-chave do meio perde a imagem
//      (a imagem foi desenhada sem o sujeito e venceria o texto); a imagem de abertura nunca é tirada — a cena 1 só é escolhida
//      sem ela. A fala nunca é tocada ("Use my script as is" continua literal).
//   4. O relato (sujeito, fonte do pedido, já presente, corrigido, cena, imagem tirada) vai no claim, em kling4_trial.sujeito_obrigatorio.
import { KLING4_ORCAMENTO_DA_CAMADA, eixoCurtoKling4 } from '@/lib/cinematic/cenaKling4'
import { temaDiscordaDaFala } from '@/lib/pedidoCerto'

//   v3 (2ª revisão adversarial): nome próprio pego pela CAIXA — palavra do léxico com maiúscula no meio da frase, ou colada a outra
//   maiúscula ("El Niño", "La Niña", "Billy the Kid", "Karate Kid", "Kid Rock", "SpaceX Dragon"), é nome de gente/coisa, nunca o
//   sujeito (pedido todo em Title Case não conta: lá a caixa não diz nada, e só os vetos explícitos valem). Vetos novos: clima
//   (El Niño/La Niña), dragão de Komodo/barbudo/cápsula (o Komodo ganha entrada própria: "a Komodo dragon lizard"), espécie
//   invasora, "um coroa"/"coroa de 60 anos" (gíria de gente madura), "rocket man". "SS St. Louis" vira "an SS St. Louis ship".
export const SUJEITO_K4_VERSAO = 'k4_sujeito_0111_v3' as const

export type TipoDoSujeito = 'veiculo' | 'criatura' | 'pessoa' | 'objeto'
/** veto: lido no pedido inteiro — se casa (qualquer um), a entrada não vale (desambiguação). nomeProprioOk: a maiúscula faz parte do nome comum ("Komodo"). */
interface Entrada { grupo: string; tipo: TipoDoSujeito; en: string; re: RegExp; veto?: RegExp | ReadonlyArray<RegExp>; nomeProprioOk?: boolean }
const vetado = (e: Entrada, texto: string) => (Array.isArray(e.veto) ? e.veto : e.veto ? [e.veto] : []).some((v: RegExp) => v.test(texto))

const p = (fonte: string) => new RegExp(`(?<![\\p{L}\\p{N}])(?:${fonte})(?![\\p{L}\\p{N}])`, 'iu')
// possessivo antes ("their kids", "seus filhos"): a criança é de quem fala, não o sujeito do filme
const SEM_POSSESSIVO = String.raw`(?<!(?:their|your|our|my|his|her|its|seus|suas|meus|minhas|nossos|nossas|teus|tuas|sus|tus|mis|nuestros|nuestras)\s+)`
const FINANCAS = String.raw`invest\w*|renda fixa|juros|selic|ipca|cdb|dividend\w*|bonds?|treasury|inversi[óo]n|invertir|bonos?|a[çc][õo]es|stocks?|crypto\w*|cripto\w*|bitcoin|poupan[çc]a|savings`

// O léxico: o que o cliente escreve (en/pt/es) → a frase em inglês que o motor desenha. O grupo é a família de palavras que,
// em inglês, prova que o prompt da cena já mostra o sujeito.
const LEXICO: ReadonlyArray<Entrada> = [
  { grupo: 'aircraft', tipo: 'veiculo', en: 'airplane',
    // "flight" sozinho não é avião ("fight or flight", "flight of stairs"): só "flight 19", "voo 447", "ghost flight", "o voo que sumiu"
    re: p(String.raw`airplanes?|aeroplanes?|planes?|aircraft|airliners?|jetliners?|bombers?|seaplanes?|warplanes?|avi[aã]o|avi[õo]es|aeronaves?|avi[óo]n(?:es)?|avionetas?|flugzeug|(?:flight|voo|vôo|vuelo)\s+(?:n[º°o.]\s*)?[a-z]{0,3}\s?\d{1,4}|(?:ghost|missing|lost|doomed|vanished|passenger|commercial|cargo|mystery)\s+flights?|v[ôo]os?\s+(?:fantasmas?|perdidos?|desaparecidos?|comerciais?|que\s+(?:sumiu|desapareceu|caiu|nunca))|vuelos?\s+(?:fantasmas?|perdidos?|desaparecidos?|comerciales?|que\s+(?:desapareci[óo]|cay[óo]|nunca))`),
    veto: p(String.raw`(?:astral|inclined|cartesian|coordinate|geometric|higher|spiritual|existential)\s+planes?|plano\s+astral`) },
  { grupo: 'helicopter', tipo: 'veiculo', en: 'helicopter', re: p('helicopters?|helic[óo]pteros?'), veto: p(String.raw`helicopter\s+(?:parents?|parenting|money|mom|dad)|pais\s+helic[óo]ptero`) },
  { grupo: 'submarine', tipo: 'veiculo', en: 'submarine', re: p('submarines?|submarinos?') },
  { grupo: 'watercraft', tipo: 'veiculo', en: 'ship', re: p(String.raw`ships?|shipwrecks?|ocean liners?|galleons?|warships?|navios?|naufr[áa]gios?|gale[õo]es|buques?|barcos?|boats?|veleiros?|sailboats?|yachts?|iates?`) },
  { grupo: 'spacecraft', tipo: 'veiculo', en: 'spacecraft', re: p(String.raw`rockets?|spacecraft|spaceships?|space probes?|(?:space|crew|dragon|apollo|orion)\s+capsules?|foguetes?|naves? espaciais?|nave espacial|c[áa]psulas?\s+espacia(?:l|is|les)|cohetes?|sondas? espaciais?|sondas? espaciales?`),
    // "rocket man" é apelido de gente (Kim Jong Un, Elton John); "Rocket League" é jogo
    veto: p(String.raw`rocket\s+scien\w*|(?:prices?|stocks?|sales|shares?|rents?)\s+rocket\w*|(?:little\s+)?rocket\s*-?\s*m[ae]n|homem[- ]foguete|rocket\s+league|pocket\s+rockets?`) },
  { grupo: 'rover', tipo: 'veiculo', en: 'rover', re: p(String.raw`rovers?|jipe-rob[ôo]|veh[íi]culo explorador`), veto: p('land rover|range rover') },
  { grupo: 'train', tipo: 'veiculo', en: 'train',
    // "train" é verbo ("train your brain", "how to train"): o substantivo só com determinante/modificador antes ou substantivo depois
    re: p(String.raw`trains(?!\s+(?:your|his|her|their|our|my|its|the\s+brain|hard|for|to|with|like|daily))|(?:the|a|an|this|that|ghost|steam|freight|bullet|passenger|express|night|runaway|subway|cargo|old|last|lost|abandoned|mystery|haunted|orient|toy)\s+train|train\s+(?:station|crash|wreck|robbery|derail\w*|tunnel|tracks?|cars?|that|which|vanished|disappeared|ride|journey|driver)|locomotives?|trens?|trem|tren(?:es)?|locomotivas?|locomotoras?`) },
  { grupo: 'car', tipo: 'veiculo', en: 'car', re: p(String.raw`cars?|automobiles?|carros?|autom[óo]veis|autom[óo]vel|coches?|carrinhos?`) },
  { grupo: 'truck', tipo: 'veiculo', en: 'truck', re: p(String.raw`trucks?|caminh[ãa]o|caminh[õo]es|cami[óo]n(?:es)?`) },
  { grupo: 'bus', tipo: 'veiculo', en: 'bus', re: p(String.raw`bus(?:es)?|[ôo]nibus|autob[úu]s(?:es)?`) },
  { grupo: 'motorcycle', tipo: 'veiculo', en: 'motorcycle', re: p('motorcycles?|motorbikes?|motos?|motocicletas?') },
  { grupo: 'bicycle', tipo: 'veiculo', en: 'bicycle', re: p('bicycles?|bikes?|bicicletas?') },
  { grupo: 'balloon', tipo: 'veiculo', en: 'hot air balloon', re: p(String.raw`hot air balloons?|bal[ãa]o de ar quente|globo aerost[áa]tico|zeppelins?|dirig[íi]veis|dirig[íi]vel|airships?`) },
  { grupo: 'under_ice_life', tipo: 'criatura', en: 'living creatures swimming beneath the ice', re: p(String.raw`(?:life|creatures?|vida|criaturas?|seres vivos)\s+(?:under|beneath|below|sob|debaixo d[oa]|embaixo d[oa]|abaixo d[oa]|bajo|debajo del?)\s+(?:the\s+|o\s+|a\s+|el\s+|la\s+)?(?:ice|gelo|hielo|frozen\s+\p{L}+|ice\s+sheet)`) },
  { grupo: 'whale', tipo: 'criatura', en: 'whale', re: p('whales?|baleias?|ballenas?'), veto: p(FINANCAS) },
  { grupo: 'shark', tipo: 'criatura', en: 'shark', re: p(String.raw`sharks?|tubar[õo]es|tubar[ãa]o|tiburones|tibur[óo]n`), veto: p(String.raw`loan\s+sharks?|shark\s+tank|card\s+sharks?|agiotas?`) },
  // "Lula" é pessoa (o presidente): no português a lula-bicho só vale com "gigante"/"colossal"
  { grupo: 'squid', tipo: 'criatura', en: 'giant squid', re: p(String.raw`giant squids?|colossal squids?|squids?|lulas?\s+gigantes?|lulas?\s+colossa(?:l|is)|calamar(?:es)?\s+gigantes?|calamar(?:es)?`), veto: p(String.raw`squid\s+game|round\s+6`) },
  { grupo: 'octopus', tipo: 'criatura', en: 'octopus', re: p(String.raw`octopus(?:es)?|octopi|polvos?|pulpos?`) },
  { grupo: 'dinosaur', tipo: 'criatura', en: 'dinosaur', re: p(String.raw`dinosaurs?|dinossauros?|dinosaurios?|t-?rex`) },
  // o dragão de Komodo é um LAGARTO de verdade: entrada própria, nunca "a dragon" (o motor desenharia o de fantasia)
  { grupo: 'komodo', tipo: 'criatura', en: 'Komodo dragon lizard', nomeProprioOk: true, re: p(String.raw`komodo(?:\s+dragons?)?|drag[õo]es[- ]+de[- ]+komodo|drag[ãa]o[- ]+de[- ]+komodo|drag[óo]n(?:es)?\s+de\s+komodo`) },
  { grupo: 'dragon', tipo: 'criatura', en: 'dragon', re: p(String.raw`dragons?|drag[õo]es|drag[ãa]o|dragones|drag[óo]n`),
    // lagarto (Komodo, barbudo, d'água), dragão-marinho (peixe), cápsula da SpaceX, fruta, jogo/desenho: nunca o dragão de fantasia
    veto: p(String.raw`komodo|bearded\s+dragons?|drag[ãa]o[- ]barbudo|drag[óo]n\s+barbudo|(?:water|sea|leafy|weedy|komodo|flying)\s+dragons?|drag[ãa]o[- ]marinho|drag[óo]n\s+de\s+mar|spacex|crew\s+dragon|dragon\s+(?:capsules?|spacecraft|fruit|ball|boat|dance|fly)|fruta[- ]d[oe][- ]drag[ãa]o|pitaya|lizards?|lagartos?`) },
  { grupo: 'robot', tipo: 'criatura', en: 'robot', re: p(String.raw`robots?|rob[ôo]s?`) },
  // espécie invasora/exótica e "alien" jurídico (imigrante) não são extraterrestres
  { grupo: 'alien', tipo: 'criatura', en: 'alien', re: p(String.raw`aliens?|alien[íi]genas?|extraterrestres?`),
    veto: p(String.raw`(?:illegal|legal|resident|enemy|invasive|non-?resident|undocumented)\s+aliens?|aliens?\s+(?:species|plants?|weeds?|fish|trees?|invasive|registration|enemies|act|card)|esp[ée]cies?\s+(?:ex[óo]ticas?\s+)?(?:invasoras?|alien[íi]genas?)|(?:plantas?|peixes?)\s+alien[íi]genas?`) },
  // "boy/girl/garota/chica" ficam de fora: muitas vezes é gente adulta (romance) — nunca "a child" num pedido adulto. "bebe" sem acento é o verbo beber.
  { grupo: 'child', tipo: 'pessoa', en: 'child',
    re: p(String.raw`${SEM_POSSESSIVO}(?:child(?:ren)?|kids?|little\s+(?:boy|girl)s?|toddlers?|crian[çc]as?|menin[oa]s?|beb[êé]s?|ni[ñn][oa]s?|nen[ea]s?)`),
    veto: [
      // conselho para pais ("what rich parents teach kids about money"): a criança é o público do conselho, não a cena
      p(String.raw`(?:teach|teaches|teaching|raise|raising|parenting|ensinar|ensinam|ensine|educar|enseñar|enseñan|criar\s+(?:os\s+)?filhos)[^.]{0,40}(?:kids?|children|crian[çc]as|filhos|ni[ñn]os|hijos)|(?:kids?|children|crian[çc]as|filhos|ni[ñn]os)[^.]{0,30}(?:about\s+money|sobre\s+dinheiro|sobre\s+dinero)`),
      // El Niño / La Niña: o fenômeno do clima, nunca "a child" — com maiúscula, com artigo português antes ("o La Niña") ou com clima perto
      /(?<![\p{L}])(?:El|EL|La|LA)\s+(?:Ni[ñn][oa]|NI[ÑN][OA])(?![\p{L}])/u,
      p(String.raw`(?:o|do|no|pelo|ao|of|the)\s+(?:el\s+ni[ñn]o|la\s+ni[ñn]a)|(?:el\s+ni[ñn]o|la\s+ni[ñn]a)[^.]{0,80}(?:climate|clima|weather|winter|inverno|invierno|summer|ver[ãa]o|verano|rain\w*|chuva\w*|lluvia\w*|drought|seca|sequ[íi]a|pacific|pac[íi]fico|oc(?:e|é)an\w*|storms?|hurricanes?|furac\w+|hurac\w+|temperatur\w*|forecast|previs\w+|pron[óo]stico|fen[ôo]meno|phenomenon|monsoon|warming|aquecimento|calentamiento|noaa)|(?:climate|clima|fen[ôo]meno|phenomenon|efeito|efecto|effect|weather|noaa)[^.]{0,40}(?:el\s+ni[ñn]o|la\s+ni[ñn]a)`),
      // "the Kid" como apelido de gente ("Billy the Kid", "Karate Kid", "Kid Rock")
      p(String.raw`billy\s+the\s+kid|karate\s+kid|sundance\s+kid|cisco\s+kid|kid\s+(?:rock|cudi|laroi|creole|flash|icarus|n\s+play)|the\s+kid\s+laroi`),
      /\p{Lu}\p{Ll}+\s+the\s+Kids?(?![\p{L}])/u,
    ] },
  { grupo: 'diver', tipo: 'pessoa', en: 'scuba diver', re: p(String.raw`divers?|scuba divers?|mergulhador(?:a|es)?|buceador(?:a|es)?|buzos?`) },
  { grupo: 'astronaut', tipo: 'pessoa', en: 'astronaut', re: p(String.raw`astronauts?|astronautas?|cosmonauts?`) },
  { grupo: 'pen3d', tipo: 'objeto', en: '3D printing pen', re: p(String.raw`3d pens?|3d printing pens?|caneta(?:s)? 3d|pluma(?:s)? 3d|bol[íi]grafo(?:s)? 3d|l[áa]piz 3d`) },
  // "Tesouro Direto"/"bonos del Tesoro" são finanças: o baú só com palavra de tesouro de verdade (perdido, pirata, caça…) e sem contexto de investimento
  { grupo: 'treasure', tipo: 'objeto', en: 'treasure chest',
    re: p(String.raw`treasure\s+chests?|treasures?|ba[úu]\s+do\s+tesouro|ca[çc]a\s+ao\s+tesouro|tesouros?\s+(?:perdidos?|escondidos?|enterrados?|piratas?|afundados?|antigos?|de\s+ouro|submersos?)|tesouros?\s+d[oa]s?\s+(?:piratas?|navios?|templos?|reis?|fara[óo]s?|incas?|astecas?)|tesoros?\s+(?:perdidos?|escondidos?|enterrados?|piratas?|hundidos?|antiguos?|de\s+oro)|b[úu]squeda\s+del\s+tesoro|cofre\s+del\s+tesoro`),
    veto: p(String.raw`tesouro\s+(?:direto|nacional|selic|ipca|prefixado)|t[íi]tulos?\s+do\s+tesouro|bonos?\s+del\s+tesoro|tesoro\s+p[úu]blico|letras\s+del\s+tesoro|national\s+treasure|${FINANCAS}`) },
  { grupo: 'meteorite', tipo: 'objeto', en: 'meteorite', re: p(String.raw`meteorites?|meteoritos?|asteroids?|aster[óo]ides?`) },
  { grupo: 'sword', tipo: 'objeto', en: 'sword', re: p('swords?|espadas?') },
  // "coroa" é gíria de gente madura ("um coroa", "coroa de 60 anos", "namorar uma coroa"): a coroa-objeto é feminina e sem idade
  { grupo: 'crown', tipo: 'objeto', en: 'crown', re: p('crowns?|coroas?|coronas?'),
    veto: p(String.raw`coroa\s+(?:dent[áa]ria|do\s+dente)|corona\s*virus|coronav[íi]rus|(?:um|o|os|uns|dos|do|pro|pros|ao|aos|esse|este|aquele|meu|seu)\s+coroas?|coroas?\s+(?:de|com)\s+(?:\d+|mais\s+de\s+\d+)|coroas?\s+(?:enxut[ao]s?|gat[ao]s?|safad[ao]s?|solteir[ao]s?|ric[ao]s?|bonit[ao]s?|lind[ao]s?|sarad[ao]s?|vi[úu]v[ao]s?)|(?:namor\w*|peg\w*|casad[ao]\s+com|ficar\s+com)\s+(?:uma?\s+|com\s+uma?\s+)?coroas?|the\s+crown\s+(?:netflix|series|s[ée]rie|season|temporada)|crown\s+(?:royal|vic(?:toria)?|point)`) },
  { grupo: 'statue', tipo: 'objeto', en: 'statue', re: p(String.raw`statues?|est[áa]tuas?`) },
]

// O que, em inglês, prova que o prompt da cena já mostra o sujeito (o prompt do descritor é sempre inglês).
// Sem palavras ambíguas: "chest" sozinho é peito ("hand on chest"), "jet" sozinho é jato d'água, "girl/boy" pode ser adulto.
const CHAVES: Readonly<Record<string, RegExp>> = {
  aircraft: p(String.raw`airplanes?|aeroplanes?|planes?|aircraft|airliners?|jetliners?|fighter\s+jets?|jet\s+(?:planes?|aircraft|airliners?)|bombers?|seaplanes?|fuselage`),
  helicopter: p('helicopters?'), submarine: p('submarines?'),
  watercraft: p(String.raw`ships?|shipwrecks?|vessels?|ocean\s+liners?|galleons?|warships?|boats?|sailboats?|yachts?|hull`),
  spacecraft: p(String.raw`rockets?|spacecraft|spaceships?|space\s+probes?|(?:space|crew|dragon)\s+capsules?`), rover: p('rovers?'),
  train: p('trains?|locomotives?'), car: p('cars?|automobiles?'), truck: p('trucks?'), bus: p('bus(?:es)?'),
  motorcycle: p('motorcycles?|motorbikes?'), bicycle: p('bicycles?|bikes?'), balloon: p('balloons?|zeppelins?|airships?'),
  under_ice_life: p(String.raw`(?:creatures?|life|fish|animals?|organisms?|krill|jellyfish)\b[^.]{0,60}\b(?:beneath|under|below)\b[^.]{0,30}\bice`),
  whale: p('whales?'), shark: p('sharks?'), squid: p('squids?'), octopus: p('octopus(?:es)?|octopi'), dinosaur: p('dinosaurs?|t-?rex'),
  komodo: p(String.raw`komodo|monitor\s+lizards?|lizards?`), dragon: p('dragons?'), robot: p('robots?|androids?'), alien: p('aliens?|extraterrestrials?'),
  child: p(String.raw`child(?:ren)?|kids?|toddlers?|schoolchildren|(?:little|young|small)\s+(?:boys?|girls?)|(?:boys?|girls?),?\s+(?:aged\s+)?(?:[4-9]|1[0-2])(?:-year-old)?|(?:[4-9]|1[0-2])-year-old\s+(?:boys?|girls?)`),
  diver: p('divers?'), astronaut: p('astronauts?|cosmonauts?'),
  pen3d: p(String.raw`3d\s+(?:printing\s+)?pens?`),
  treasure: p(String.raw`treasures?|treasure\s+chests?|chests?\s+(?:of|full\s+of|filled\s+with|overflowing\s+with)\s+(?:gold|coins|jewels|treasure)|gold\s+coins|jewels`),
  meteorite: p('meteorites?|asteroids?'), sword: p('swords?'), crown: p('crowns?'), statue: p('statues?'),
}

// Modelo de veículo: "C-54 Skymaster", "B-29", "Boeing 747", "USS Thresher". Só vale com contexto de avião/navio no texto.
const MODELO_RE = /(?<![\p{L}\p{N}-])((?:\p{Lu}{1,3}-\d{1,4}\p{Lu}?)|(?:Boeing|Airbus|Douglas|Lockheed|Cessna|Antonov|Tupolev|Ilyushin|Sikorsky|Junkers|Messerschmitt)\s+[\p{L}\d-]+|(?:USS|HMS|RMS|SS)\s+(?:(?:St|Ste|Mt)\.?\s+|(?:Saint|San|Santa|Santo|Sankt)\s+)?\p{Lu}\p{Ll}+)(?:\s+(\p{Lu}\p{Ll}{3,}))?/u
// "crash" sozinho não é aviação (I-95 crash = estrada): só verbos/lugares de voo
const CONTEXTO_AEREO_RE = p(String.raw`flights?|passengers?|pilots?|airfield|runway|airport|vanished over|disappeared over|cockpit|voo|passageiros|piloto|pista de pouso|aeroporto|vuelo|pasajeros|aeropuerto`)
const CONTEXTO_NAVAL_RE = p(String.raw`sank|sunk|sinking|navy|crew|sea|ocean|ship|vessel|afundou|naufragou|marinha|tripula[çc][ãa]o|navio|hundi[óo]|armada|tripulaci[óo]n|buque`)
const CONTEXTO_ESTRADA_RE = p(String.raw`highway|interstate|freeway|motorway|road|rodovia|estrada|carretera|autopista|traffic|tr[âa]nsito`)
// "SS" com contexto da 2ª Guerra é a tropa nazista, nunca navio ("SS Heinrich Himmler", "SS Panzer")
const CONTEXTO_NAZISTA_RE = p(String.raw`nazis?|nazistas?|nazismo|hitler|himmler|heydrich|eichmann|mengele|waffen|panzer|gestapo|wehrmacht|third\s+reich|terceiro\s+reich|tercer\s+reich|holocaust\w*|holocausto|totenkopf|leibstandarte|einsatzgruppen|schutzstaffel|auschwitz`)
const NAO_NOME_DE_MODELO = new Set(['The', 'This', 'That', 'And', 'But', 'When', 'Then', 'With', 'From', 'Over', 'Into', 'After', 'Before'])

export interface SujeitoObrigatorio {
  /** O que o motor tem de desenhar, em inglês: "a C-54 Skymaster airplane", "a child holding a 3D printing pen". */
  frase: string
  tipo: TipoDoSujeito
  grupos: string[]
  /** Fichas extras (modelo/nome) que também provam presença: "C-54", "Skymaster". */
  tokens: string[]
  /** Sempre o pedido original (a fala só enriquece o modelo de um veículo que o pedido já pede). */
  origem: 'pedido'
}

const limpa = (s: unknown) => String(s ?? '').replace(/\s+/g, ' ').trim()
const escapa = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
// sigla lida letra a letra: "an SS …", "an HMS …", "a USS …", "a C-54 …"
const artigo = (s: string) => {
  const sigla = /^(\p{Lu})\p{Lu}{0,3}(?=[-\s\d]|$)/u.exec(s)
  if (sigla) return 'AEFHILMNORSX'.includes(sigla[1]) ? 'an' : 'a'
  return /^[aeiou]/i.test(s) && !/^(?:uni|eu|one)/i.test(s) ? 'an' : 'a'
}

const CABECALHO_DE_SECAO = /(?:^|\n)\s*(?:HOOK|GANCHO|MICRO\s+REWARD|MICRO\s+RECOMPENSA|ESCALATION|ESCALADA|RHYTHM|RITMO|PAYOFF|PAGAMENTO|RECOMPENSA\s+FINAL)\b\s*\d*\s*(?:\([^)]*\))?\s*:/i

/**
 * O texto é curto o bastante para ser um PEDIDO (não um roteiro): até 280 caracteres e 45 palavras, sem pistas entre colchetes
 * ([Pexels: …], [faceless]) e sem cabeçalho de seção (HOOK:, PAYOFF:). Roteiro, história colada e texto estruturado = false.
 */
export function pedidoCurto(texto: unknown): boolean {
  const t = String(texto ?? '').trim()
  if (!t || t.length > 280) return false
  if (/[[\]]/.test(t) || CABECALHO_DE_SECAO.test(t)) return false
  return t.split(/\s+/).filter(Boolean).length <= 45
}

export type FonteDoPedido = 'ideia_solta' | 'ideia_original'
export interface PedidoDoSujeito { pedido: string | null; fonte: FonteDoPedido | null; motivo: string }

/**
 * O PEDIDO ORIGINAL da pessoa — a única fonte do sujeito obrigatório (nunca o roteiro, nunca as pistas [Pexels]).
 *   · roteiro "Use my script as is": null (o texto é dela; não há pedido separado);
 *   · ideia solta que chegou crua (o servidor escreve o roteiro): ela mesma, se for curta;
 *   · roteiro estruturado pelo cliente: a `original_idea` que veio junto (a ideia de onde AQUELE roteiro nasceu), se for curta e
 *     não discordar da narração (caixa velha de outro assunto = null).
 * Qualquer outra coisa: null — nada é corrigido.
 */
export function pedidoOriginalDoSujeito(args: { prompt: string; ideiaSolta: boolean; scriptMode?: unknown; originalIdea?: unknown; falas?: ReadonlyArray<string> }): PedidoDoSujeito {
  if (String(args.scriptMode ?? '').toLowerCase() === 'verbatim') return { pedido: null, fonte: null, motivo: 'roteiro_da_pessoa' }
  if (args.ideiaSolta) {
    const ideia = limpa(args.prompt)
    return pedidoCurto(ideia) ? { pedido: ideia, fonte: 'ideia_solta', motivo: 'ideia_solta' } : { pedido: null, fonte: null, motivo: 'ideia_longa' }
  }
  if (typeof args.originalIdea !== 'string' || !args.originalIdea.trim()) return { pedido: null, fonte: null, motivo: 'sem_pedido_original' }
  const ideia = limpa(args.originalIdea)
  if (!pedidoCurto(ideia)) return { pedido: null, fonte: null, motivo: 'ideia_original_invalida' }
  if (temaDiscordaDaFala(ideia, (args.falas ?? []).join(' '))) return { pedido: null, fonte: null, motivo: 'ideia_original_discorda_da_fala' }
  return { pedido: ideia, fonte: 'ideia_original', motivo: 'ideia_original' }
}

/** Pedido em Title Case ("The Giant Squid Caught On Camera"): a maiúscula não diz nada — só os vetos explícitos valem. */
function emTitleCase(texto: string): boolean {
  const ws = texto.match(/\p{L}{4,}/gu) ?? []
  return ws.length >= 3 && ws.filter((w) => /^\p{Lu}/u.test(w)).length / ws.length >= 0.6
}
/**
 * O achado é parte de NOME PRÓPRIO? Com maiúscula no meio da frase ("Billy the Kid", "El Niño", "SpaceX Dragon") ou, no começo da
 * frase, colado a outra maiúscula ("Kid Rock …", "Dragon Ball …"). Número logo depois ("Flight 19", "Voo 447") é o nome do voo — vale.
 */
export function achadoEhNomeProprio(texto: string, pos: number, achado: string): boolean {
  if (!/^\p{Lu}/u.test(achado) || emTitleCase(texto)) return false
  const depois = texto.slice(pos + achado.length)
  if (/^\s+(?:n[º°o.]\s*)?\d/.test(depois)) return false
  const inicioDeFrase = /(?:^|[.!?…:;¿¡"“(\n])\s*$/u.test(texto.slice(0, pos))
  const proxima = /^\s+(\p{L}[\p{L}'’-]*)/u.exec(depois)?.[1] ?? ''
  return !inicioDeFrase || (/^\p{Lu}/u.test(proxima) && proxima !== 'I')
}

function achadosDoLexico(texto: string): Array<{ e: Entrada; pos: number }> {
  const achados: Array<{ e: Entrada; pos: number }> = []
  for (const e of LEXICO) {
    if (vetado(e, texto)) continue
    // a 1ª ocorrência que não é nome próprio (nome próprio de gente/coisa nunca vira sujeito — regra do elenco)
    const m = [...texto.matchAll(new RegExp(e.re.source, 'giu'))].find((x) => e.nomeProprioOk || !achadoEhNomeProprio(texto, x.index ?? 0, x[0]))
    if (m) achados.push({ e, pos: m.index ?? 0 })
  }
  return achados.sort((a, b) => a.pos - b.pos)
}

function modeloDoVeiculo(texto: string, contexto: string): { tokens: string[]; rotulo: string; grupo: 'aircraft' | 'watercraft' } | null {
  const m = MODELO_RE.exec(texto)
  if (!m) return null
  const prefixoNaval = /^(USS|HMS|RMS|SS)\s/.exec(m[1])?.[1] ?? null
  // "SS" só com contexto naval e nunca com contexto nazista; prefixo naval colado em nome nazista também não é navio
  if (prefixoNaval === 'SS' && (CONTEXTO_NAZISTA_RE.test(contexto) || !CONTEXTO_NAVAL_RE.test(contexto))) return null
  if (prefixoNaval && CONTEXTO_NAZISTA_RE.test(`${m[1]} ${m[2] ?? ''}`)) return null
  const aereo = CONTEXTO_AEREO_RE.test(contexto) || LEXICO[0].re.test(contexto)
  const naval = !!prefixoNaval || (CONTEXTO_NAVAL_RE.test(contexto) && !aereo)
  if (!naval && !aereo) return null
  // estrada (I-95, A-1): só é avião se o texto falar de avião com todas as letras
  if (!naval && CONTEXTO_ESTRADA_RE.test(contexto) && !LEXICO[0].re.test(contexto)) return null
  const nome = m[2] && !NAO_NOME_DE_MODELO.has(m[2]) ? m[2] : ''
  return { tokens: [m[1], ...(nome ? [nome] : [])], rotulo: nome ? `${m[1]} ${nome}` : m[1], grupo: naval ? 'watercraft' : 'aircraft' }
}

/**
 * O sujeito central do PEDIDO ORIGINAL (null = pedido sem veículo/criatura/criança/objeto central, ou só gente nomeada — nada muda).
 * Só o pedido cria o sujeito. A fala só entra para achar o MODELO de um veículo que o pedido já pede ("o avião que sumiu" +
 * fala "C-54 Skymaster") e como contexto para dizer se o modelo escrito no pedido é avião ou navio.
 */
export function sujeitoObrigatorio(args: { pedido: string | null; falas: ReadonlyArray<string>; pessoaPermitida?: boolean }): SujeitoObrigatorio | null {
  const pedido = limpa(String(args.pedido ?? '').replace(/^\s*\[Idea:\s*([^\]]*)\][\s\S]*$/i, '$1').replace(/\[[^\]]*\]/g, ' '))
  if (!pedido) return null
  const falas = limpa((args.falas ?? []).join(' ').replace(/\[[^\]]*\]/g, ' '))
  const tudo = `${pedido} ${falas}`
  // romance/pedido adulto (pessoaPermitida=false): criança nunca vira sujeito obrigatório.
  const achados = achadosDoLexico(pedido).filter((a) => args.pessoaPermitida !== false || a.e.tipo !== 'pessoa')
  const modeloDoPedido = modeloDoVeiculo(pedido, tudo)
  const primeiro = achados[0]
  if (!primeiro) {
    if (!modeloDoPedido) return null
    const en = modeloDoPedido.grupo === 'aircraft' ? 'airplane' : 'ship'
    return { frase: `${artigo(modeloDoPedido.rotulo)} ${modeloDoPedido.rotulo} ${en}`, tipo: 'veiculo', grupos: [modeloDoPedido.grupo], tokens: modeloDoPedido.tokens, origem: 'pedido' }
  }
  const e = primeiro.e
  if (e.tipo === 'veiculo') {
    const modelo = [modeloDoPedido, modeloDoVeiculo(falas, tudo)].find((m) => m && m.grupo === e.grupo) ?? null
    if (modelo) return { frase: `${artigo(modelo.rotulo)} ${modelo.rotulo} ${e.en}`, tipo: 'veiculo', grupos: [e.grupo], tokens: modelo.tokens, origem: 'pedido' }
  }
  if (e.tipo === 'pessoa') {
    // criança COM o objeto ("criança com caneta 3D", "a child … with a 3D pen"): os dois têm de aparecer juntos.
    const objeto = achados.find((a) => a.e.tipo === 'objeto' && a.pos > primeiro.pos)
    if (objeto) return { frase: `${artigo(e.en)} ${e.en} holding ${artigo(objeto.e.en)} ${objeto.e.en}`, tipo: 'pessoa', grupos: [e.grupo, objeto.e.grupo], tokens: [], origem: 'pedido' }
  }
  return { frase: e.grupo === 'under_ice_life' ? e.en : `${artigo(e.en)} ${e.en}`, tipo: e.tipo, grupos: [e.grupo], tokens: [], origem: 'pedido' }
}

/** O prompt (inglês) já mostra o sujeito? Todos os grupos (criança E caneta) ou uma ficha do modelo ("C-54"). */
export function promptMostraOSujeito(prompt: string, s: SujeitoObrigatorio): boolean {
  const t = String(prompt ?? '')
  if (s.tokens.some((tk) => new RegExp(`(?<![\\p{L}\\p{N}])${escapa(tk)}(?![\\p{L}\\p{N}])`, 'iu').test(t))) return true
  return s.grupos.every((g) => CHAVES[g]?.test(t))
}

/** A fala cita o sujeito? (qualquer língua do léxico, ou o modelo). */
function falaCita(fala: string, s: SujeitoObrigatorio): boolean {
  const t = String(fala ?? '')
  if (s.tokens.some((tk) => t.includes(tk))) return true
  return LEXICO.some((e) => e.grupo === s.grupos[0] && !vetado(e, t) && e.re.test(t))
}

const TAIL_RE = /(?:,\s*|\s)(?:no readable text|No readable text)|\sMouth closed, no speaking\./
const len = (s: string) => Array.from(s).length
const corta = (s: string, n: number) => Array.from(s).slice(0, Math.max(0, n)).join('')

/** "Main subject clearly visible in frame: <frase>." logo depois do meio, dentro do orçamento da camada (eixo sai antes do corpo). */
export function comSujeitoNaCena(prompt: string, frase: string, index: number, orcamento = KLING4_ORCAMENTO_DA_CAMADA): string {
  const clausula = `Main subject clearly visible in frame: ${frase}. `
  const medio = /^[^.]+\. /.exec(prompt)?.[0] ?? ''
  let resto = prompt.slice(medio.length)
  const junta = () => `${medio}${clausula}${resto}`
  if (len(junta()) <= orcamento) return junta()
  resto = resto.replace(`${eixoCurtoKling4(index)}. `, '')
  if (len(junta()) <= orcamento) return junta()
  const m = TAIL_RE.exec(resto)
  const cauda = m ? resto.slice(m.index) : ''
  const corpo = m ? resto.slice(0, m.index) : resto
  const cabe = orcamento - len(medio + clausula + cauda) - 1
  let curto = corta(corpo, cabe)
  const fronteira = Math.max(curto.lastIndexOf('. '), curto.lastIndexOf(', '))
  curto = (fronteira > cabe * 0.5 ? curto.slice(0, fronteira) : curto.replace(/\s+\S*$/, '')).replace(/[\s,;:.]+$/, '')
  resto = `${curto}${curto ? '.' : ''}${cauda}`
  return corta(junta(), orcamento)
}

export interface RelatoSujeitoK4 {
  versao: typeof SUJEITO_K4_VERSAO
  sujeito: string | null
  tipo: TipoDoSujeito | null
  origem: 'pedido' | null
  /** De onde veio o pedido original (null = não havia pedido confiável: nada foi corrigido). */
  fonte_do_pedido: FonteDoPedido | null
  motivo_do_pedido: string
  ja_presente: boolean
  corrigido: boolean
  /** Cena corrigida, 1-based (null = nada corrigido). */
  cena: number | null
  keyframe_removido: boolean
}

/** A checagem antes do POST pago do Kling 4: o sujeito do PEDIDO ORIGINAL em pelo menos 1 cena do multi_prompt — corrige, nunca bloqueia. */
export function exigirSujeitoNoKling4(args: {
  pedido: PedidoDoSujeito; falas: ReadonlyArray<string>; prompts: ReadonlyArray<string>; stills?: ReadonlyArray<string | null>; pessoaPermitida?: boolean
}): { prompts: string[]; stills: (string | null)[]; relato: RelatoSujeitoK4 } {
  const prompts = [...args.prompts]
  const stills = [...(args.stills ?? [])]
  const s = args.pedido.pedido ? sujeitoObrigatorio({ pedido: args.pedido.pedido, falas: args.falas, pessoaPermitida: args.pessoaPermitida }) : null
  const relato: RelatoSujeitoK4 = { versao: SUJEITO_K4_VERSAO, sujeito: s?.frase ?? null, tipo: s?.tipo ?? null, origem: s?.origem ?? null, fonte_do_pedido: args.pedido.fonte, motivo_do_pedido: args.pedido.motivo, ja_presente: false, corrigido: false, cena: null, keyframe_removido: false }
  if (!s || prompts.length === 0) return { prompts, stills, relato }
  if (prompts.some((q) => promptMostraOSujeito(q, s))) { relato.ja_presente = true; return { prompts, stills, relato } }
  const n = prompts.length
  const pelaFala = prompts.map((_, i) => i).filter((i) => falaCita(args.falas[i] ?? '', s))
  const ordem = [...pelaFala, n - 1, ...prompts.map((_, i) => i)].filter((i, k, a) => a.indexOf(i) === k)
  // A imagem de abertura nunca sai (sem ela o filme todo muda de motor): a cena 1 com imagem só é escolhida se não houver outra.
  const alvo = ordem.find((i) => !(i === 0 && stills[0])) ?? ordem[0]
  prompts[alvo] = comSujeitoNaCena(prompts[alvo], s.frase, alvo)
  if (alvo > 0 && stills[alvo]) { stills[alvo] = null; relato.keyframe_removido = true }
  relato.corrigido = true
  relato.cena = alvo + 1
  return { prompts, stills, relato }
}
