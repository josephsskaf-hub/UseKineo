// KINEO-CITADO-NAO-AGE-0311 [TRAVA 8.2 — fundador 03/11: "já pode arrumar"] — quem o roteiro só CITA não vira personagem de quem abre a história.
//
// Caso real (historyhideshere, 03/11, filme cd0a0700): "A mystery woman filmed Kennedy's assassination…". "Kennedy's" contava como quem age, a palavra
// "woman" da mesma frase fazia dele "a woman", e "F. Kennedy, a woman with long sandy-blond hair in two braids" entrou à força na cena 1, que era só a câmera.
// A protagonista de verdade ficou sem ficha, porque a checagem achava que "woman" já estava no elenco.
//
// A regra é estreita de propósito: só vale quando a PRIMEIRA frase abre com um papel sem nome agindo ("A mystery woman filmed…"), e o nome nunca é sujeito,
// nunca fala, nunca é apresentado ("named Tommy", "a girl, Amna") nem descrito ("Kennedy, the president"). Na dúvida, o nome fica: é o comportamento antigo.
// Pessoa real que age ("Kennedy waved") continua com ficha. Módulo puro: quem chama passa o verbo da própria camada.

const escapa = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Papéis humanos sem nome (a mesma lista de lib/cinematic/elencoEpoca). */
const PAPEIS = 'boy|girl|man|woman|kid|child|baby|toddler|teen|teenager|student|commuter|passenger|traveler|traveller|worker|clerk|waiter|waitress|nurse|doctor|teacher|scientist|detective|explorer|astronaut|pirate|cowboy|monk|priest|keeper|stranger|hunter|climber|miner|engineer|chef|artist|painter|writer|singer|dancer|player|runner|driver|rider|nomad|shepherd|merchant|thief|widow|bride|groom|captain|soldier|knight|king|queen|prince|princess|farmer|fisherman|sailor|pilot|mother|father|grandmother|grandfather|grandpa|grandma|sister|brother|son|daughter|friend|neighbor|neighbour|villager|warrior|hero|heroine|librarian|guard|officer|lady|gentleman|guy|person|elder|uncle|aunt|wizard|witch|archaeologist|journalist|reporter|photographer|mechanic|baker|tailor|shopkeeper|cashier|banker|lawyer|judge|mayor|janitor|gardener|postman|mailman|firefighter|policeman|cop|sheriff|salesman|accountant|secretary|housewife|widower|orphan|prisoner|refugee|immigrant|survivor|witness|victim'

/** Palavras de grupo que abrem frase com maiúscula e nunca são nome de gente ("Investigators appealed…"). */
export const GRUPOS_NAO_NOME: readonly string[] = 'investigators|officials|authorities|witnesses|scientists|researchers|experts|historians|archaeologists|detectives|journalists|reporters|survivors|rescuers|searchers|locals|villagers|neighbors|neighbours|doctors|engineers|soldiers|sailors|divers|explorers|farmers|workers|police|prosecutors|analysts|scholars|astronomers|biologists|geologists|crews|passengers|residents|citizens|lawyers|judges'.split('|')

/** KINEO-SO-GENTE-NA-FICHA-0411 — palavra comum que abre frase ou compõe nome de lugar e nunca é gente: rótulo de roteiro ("Sound:", "Moral:", "Essential:"), parte de lugar ("Lituya Bay acted", "Empire State Building stands") e direção ("Northeast"). É a rede de segurança de quando a leitura semântica falha. */
export const PALAVRAS_NUNCA_NOME: readonly string[] = 'essential|essentials|moral|moraleja|ending|opening|concept|dialogue|sound|incomplete|confusion|digital|laughter|northeast|northwest|southeast|southwest|building|skyscraper|bay|tower|bridge|lake|island|valley|canyon|desert|harbor|harbour|strait|gulf|peninsula|volcano|glacier|cathedral|museum|stadium|airport|avenue|university|hospital|republic|empire|state'.split('|')

/** O papel sem nome que abre a história agindo ("A mystery woman filmed…" → "woman"), ou null. */
export function papelQueAbre(texto: string, verbo: RegExp): string | null {
  const t = String(texto ?? '').replace(/^[^\p{L}]+/u, '')
  const m = new RegExp(`^(?:A|An|One|The)\\s+(?:[\\p{Ll}-]+\\s+){0,3}(${PAPEIS})(?![\\p{L}\\p{N}'’-])\\s+`, 'u').exec(t)
  if (!m) return null
  return verbo.test(t.slice(m[0].length)) ? m[1] : null
}

/** true = o texto abre com um papel sem nome agindo e este nome só é citado. Qualquer dúvida → false. */
export function nomeSoCitado(texto: string, nome: string, verbo: RegExp): boolean {
  const t = String(texto ?? '')
  const papel = papelQueAbre(t, verbo)
  if (!papel) return false
  const chave = String(nome ?? '').trim().split(/\s+/).pop()?.replace(/['’]s$/, '') ?? ''
  if (!chave) return false
  const ocorrencias = [...t.matchAll(new RegExp(`(?<![\\p{L}\\p{N}])${escapa(chave)}(?![\\p{L}\\p{N}])`, 'gu'))]
  if (ocorrencias.length === 0) return false
  return ocorrencias.every((m) => {
    const ini = m.index ?? 0
    const fim = ini + m[0].length
    const antes = t.slice(Math.max(0, ini - 60), ini)
    const depois = t.slice(fim, fim + 80)
    if (/^['’]s(?![\p{L}])/u.test(depois)) return true // "Kennedy's motorcade": a coisa dele, não ele em cena
    if (/\b(?:named|called|known\s+as|nicknamed)\s+$/i.test(antes)) return false // apresentado: é a mesma pessoa do papel
    if (new RegExp(`\\b${escapa(papel)},?\\s+$`, 'i').test(antes)) return false // "a girl, Amna" / "the doctor Lee"
    const resto = depois.replace(/^\s+/, '')
    if (/^[:,]/.test(resto)) return false // fala ("Dino: …") ou aposto ("Kennedy, the president")
    const semCoordenacao = resto.replace(/^(?:and|&)\s+(?:\p{Lu}[\p{Ll}'’]+\s+){1,3}/u, '') // "Kennedy and Jackie waved": o verbo vale para os dois
    return !verbo.test(resto) && !verbo.test(semCoordenacao)
  })
}
