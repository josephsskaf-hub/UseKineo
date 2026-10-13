// KINEO-MONUMENTO-2026-10-13 — LUGAR REAL QUE O PÚBLICO RECONHECE NÃO PODE VIRAR LUGAR GENÉRICO.
//
// Caso real (parceiro Logan, 11/10 21:16 UTC, Seedance 1.5, 60 s, render 608449fe): "drone tour of the Palace of
// Versailles" saiu com templos do Sudeste Asiático e skyline moderno. O roteiro do GPT estava CERTO (Hall of Mirrors,
// King's Grand Apartments, Apollo Fountain, Orangerie, Grand Canal, Treaty of Versailles, Louis XIV). Quem apagou foi
// o filtro anti-invenção (scrubInventedSetting, KINEO-VIGIA-CENARIO-2026-09-11, e a varredura da fala,
// KINEO-FALA-CLASSICA-FIEL-2026-09-15): contexto = só o pedido (212 caracteres), então todo nome próprio que o pedido
// não dizia saiu — da FALA ("was the site of the of Versailles, ending I.") e de 6 das 7 cenas
// (`setting_scrubbed`: "cena 5: Apollo | Fountain", "cena 7: Grand | Canal"…). Sobrou "Wide establishing shot,
// reflecting the evening sky, with boats gently floating" — sem lugar nenhum; o motor inventou um.
//
// Este módulo é PURO (sem I/O, sem modelo, sem import): (1) reconhece no pedido um lugar real que é o assunto do
// filme — lista curada com nome, país, 2 descritores visuais verdadeiros e negativos óbvios, ou, fora da lista, o
// nome próprio de lugar no formato "Palace of X" / "X Cathedral"; (2) devolve o vocabulário verdadeiro do lugar
// (sub-lugares, figuras, anos) para os filtros anti-invenção não apagarem fato real; (3) ancora o nome + descritores
// no prompt visual de cada cena; (4) verifica, em código, que o nome chegou ao prompt final.
// Pedido SEM lugar real (mistério, atmosfera, conto inventado): tudo aqui devolve null / '' / o texto intacto.

export interface LugarReal {
  /** id estável para telemetria */
  id: string
  /** nome canônico em inglês, como vai ao motor ("the Palace of Versailles") */
  nome: string
  /** país/cidade ('' no genérico) */
  onde: string
  /** palavra que PROVA o lugar no prompt final (minúscula) */
  chave: string
  /** 1–2 descritores visuais verdadeiros (vazio no genérico) */
  descritores: string[]
  /** negativos óbvios, em linguagem que o motor lê ('' no genérico) */
  negativos: string
  /** true = lista curada; false = nome próprio de lugar reconhecido pelo formato */
  curado: boolean
}

interface Entrada extends Omit<LugarReal, 'curado'> {
  aliases: RegExp
  /** nomes próprios e anos verdadeiros ligados ao lugar (o filtro anti-invenção não os apaga) */
  termos: string
}

const SEM_TEMPLO_NEM_ARRANHA_CEU = 'no Asian temples or pagodas, no modern skyscrapers or city skyline'

const LUGARES: Entrada[] = [
  { id: 'versailles', nome: 'the Palace of Versailles', onde: 'France', chave: 'versailles', aliases: /(?<!treaty of\s)(?<!tratado de\s)(?<!trait[eé] de\s)\b(?:palace of versailles|ch[aâ]teau de versailles|pal[aá]cio de versalhes|palacio de versalles|versailles|versalhes|versalles)\b/i, // o TRATADO não é o palácio
    descritores: ['French baroque royal palace with gilded gates and golden details', 'formal geometric French gardens with fountains'],
    negativos: SEM_TEMPLO_NEM_ARRANHA_CEU,
    termos: "Hall of Mirrors, King's Grand Apartments, Queen's Apartments, Royal Chapel, Royal Opera, Apollo Fountain, Latona Fountain, Orangerie, Grand Canal, Grand Trianon, Petit Trianon, Queen's Hamlet, Louis XIII, Louis XIV, Louis XV, Louis XVI, Sun King, Marie Antoinette, André Le Nôtre, Le Vau, Hardouin-Mansart, Charles Le Brun, Treaty of Versailles, World War, French Revolution, Paris, France, French 1623 1661 1678 1682 1710 1789 1919" },
  { id: 'eiffel', nome: 'the Eiffel Tower', onde: 'Paris, France', chave: 'eiffel', aliases: /\b(?:eiffel tower|tour eiffel|torre eiffel|eiffel)\b/i,
    descritores: ['wrought-iron lattice tower', 'Paris rooftops along the Seine'],
    negativos: 'no other tower in its place, no Asian temples or pagodas',
    termos: "Gustave Eiffel, Champ de Mars, Trocadéro, Seine, Paris, France, French, World's Fair, Exposition Universelle 1887 1889" },
  { id: 'machu-picchu', nome: 'Machu Picchu', onde: 'Peru', chave: 'machu picchu', aliases: /\b(?:machu\s+pic?chu)\b/i,
    descritores: ['ancient Inca dry-stone terraces and walls on a mountain ridge', 'the green peak of Huayna Picchu above the clouds'],
    negativos: 'no Asian temples or pagodas, no Egyptian pyramids, no modern buildings',
    termos: 'Huayna Picchu, Inca, Incas, Inca Empire, Pachacuti, Andes, Cusco, Cuzco, Urubamba, Sacred Valley, Intihuatana, Temple of the Sun, Hiram Bingham, Peru, Peruvian 1450 1911 1983' },
  { id: 'taj-mahal', nome: 'the Taj Mahal', onde: 'Agra, India', chave: 'taj mahal', aliases: /\b(?:taj\s+mahal)\b/i,
    descritores: ['white marble mausoleum with a great onion dome and four minarets', 'long reflecting pool in Mughal gardens'],
    negativos: 'no Chinese pagodas, no Southeast Asian temples, no modern skyscrapers',
    termos: 'Shah Jahan, Mumtaz Mahal, Mughal, Mughals, Agra, Yamuna, India, Indian, Ustad Ahmad Lahauri, UNESCO 1631 1632 1643 1648 1653 1983' },
  { id: 'cristo-redentor', nome: 'Christ the Redeemer statue', onde: 'Rio de Janeiro, Brazil', chave: 'redeemer', aliases: /\b(?:christ the redeemer|cristo redentor|cristo rei do corcovado|corcovado)\b/i,
    descritores: ['colossal Art Deco statue with outstretched arms atop Corcovado mountain', 'view over Rio de Janeiro, Guanabara Bay and Sugarloaf Mountain'],
    negativos: 'no other statue in its place, no Asian temples or pagodas',
    termos: 'Christ the Redeemer, Cristo Redentor, Corcovado, Rio de Janeiro, Guanabara Bay, Sugarloaf Mountain, Tijuca Forest, Brazil, Brazilian, Paul Landowski, Heitor da Silva Costa, Albert Caquot, Art Deco, New Seven Wonders 1922 1926 1931 2007' },
  { id: 'colosseum', nome: 'the Colosseum', onde: 'Rome, Italy', chave: 'colosseum', aliases: /\b(?:colosseum|coliseum|coliseu|coliseo|colosseo)\b/i,
    descritores: ['ancient Roman stone amphitheater with tiered arches', 'partly ruined outer wall in the heart of Rome'],
    negativos: SEM_TEMPLO_NEM_ARRANHA_CEU,
    termos: 'Flavian Amphitheatre, Vespasian, Titus, Rome, Roman, Romans, Roman Empire, Italy, Italian, Forum' },
  { id: 'great-wall', nome: 'the Great Wall of China', onde: 'China', chave: 'great wall', aliases: /\b(?:great wall(?: of china)?|grande muralha(?: da china)?|gran muralla(?: china)?)\b/i,
    descritores: ['ancient stone wall with watchtowers snaking over green mountain ridges'],
    negativos: 'no modern skyscrapers or city skyline',
    termos: 'Ming, Ming Dynasty, Qin, Qin Shi Huang, Badaling, Mutianyu, Jinshanling, China, Chinese, Beijing' },
  { id: 'giza', nome: 'the Great Pyramids of Giza', onde: 'Egypt', chave: 'giza', aliases: /\b(?:pyramids? of giza|great pyramids?|giza pyramids?|pir[aâ]mides de giz[eé]h?|giza)\b/i,
    descritores: ['massive limestone pyramids on the desert plateau', 'the Great Sphinx'],
    negativos: 'no Maya pyramids, no Asian temples or pagodas, no modern buildings',
    termos: 'Giza, Khufu, Cheops, Khafre, Menkaure, Great Sphinx, Sphinx, Cairo, Nile, Egypt, Egyptian, Egyptians, Pharaoh, Old Kingdom' },
  { id: 'liberty', nome: 'the Statue of Liberty', onde: 'New York, USA', chave: 'liberty', aliases: /\b(?:statue of liberty|est[aá]tua da liberdade|estatua de la libertad)\b/i,
    descritores: ['copper-green colossal statue holding a torch aloft', 'on Liberty Island in New York Harbor'],
    negativos: 'no other statue in its place',
    termos: 'Liberty Island, New York, New York Harbor, Manhattan, Ellis Island, Frédéric Auguste Bartholdi, Bartholdi, Gustave Eiffel, France, United States, America, American 1884 1886' },
  { id: 'petra', nome: 'Petra', onde: 'Jordan', chave: 'petra', aliases: /\bpetra\b(?=[^\n]{0,80}\b(?:jordan|jord[aâ]nia|treasury|nabatae\w*|siq|al-khazneh)\b)/i, // Petra também é nome de pessoa
    descritores: ['rose-red sandstone facades carved into cliffs', 'the Treasury at the end of the narrow Siq canyon'],
    negativos: SEM_TEMPLO_NEM_ARRANHA_CEU,
    termos: 'Al-Khazneh, Al Khazneh, Treasury, Siq, Nabataean, Nabataeans, Jordan, Monastery, Ad Deir, Wadi Musa' },
  { id: 'chichen-itza', nome: 'Chichén Itzá', onde: 'Yucatán, Mexico', chave: 'chich', aliases: /\b(?:chich[eé]n\s+itz[aá])\b/i,
    descritores: ['the stepped Maya pyramid of El Castillo', 'surrounded by Yucatán jungle'],
    negativos: 'no Egyptian pyramids, no Asian temples or pagodas, no modern buildings',
    termos: 'El Castillo, Kukulcán, Kukulkan, Maya, Mayan, Mayas, Yucatán, Yucatan, Mexico, Mexican' },
  { id: 'angkor-wat', nome: 'Angkor Wat', onde: 'Cambodia', chave: 'angkor', aliases: /\b(?:angkor\s+wat|angkor)\b/i,
    descritores: ['Khmer sandstone temple with lotus-bud towers', 'reflected in the moat at sunrise'],
    negativos: 'no modern skyscrapers or city skyline',
    termos: 'Khmer, Khmer Empire, Siem Reap, Cambodia, Cambodian, Suryavarman, Vishnu, Angkor Thom, Bayon' },
  { id: 'stonehenge', nome: 'Stonehenge', onde: 'England', chave: 'stonehenge', aliases: /\b(?:stonehenge)\b/i,
    descritores: ['prehistoric ring of massive standing stones and lintels', 'open grassy Salisbury Plain'],
    negativos: SEM_TEMPLO_NEM_ARRANHA_CEU,
    termos: 'Salisbury Plain, Salisbury, Wiltshire, England, English, Britain, British, Neolithic, Druids, Avebury' },
  { id: 'big-ben', nome: 'Big Ben and the Palace of Westminster', onde: 'London, England', chave: 'big ben', aliases: /\b(?:big ben|palace of westminster|elizabeth tower)\b/i,
    descritores: ['Gothic Revival clock tower beside the Houses of Parliament', 'on the River Thames'],
    negativos: 'no Asian temples or pagodas',
    termos: 'Big Ben, Elizabeth Tower, Westminster, Houses of Parliament, Parliament, River Thames, Thames, London, England, Britain, British, Charles Barry, Augustus Pugin 1859' },
  { id: 'sagrada-familia', nome: 'the Sagrada Família basilica', onde: 'Barcelona, Spain', chave: 'sagrada', aliases: /\b(?:sagrada\s+fam[ií]l(?:i|í)a)\b/i,
    descritores: ["Gaudí's towering basilica with organic stone spires"],
    negativos: 'no Asian temples or pagodas',
    termos: 'Sagrada Família, Sagrada Familia, Antoni Gaudí, Gaudí, Gaudi, Barcelona, Spain, Spanish, Catalonia, Catalan, Nativity, Passion, Glory 1882 1926 2026' },
  { id: 'mont-saint-michel', nome: 'Mont-Saint-Michel', onde: 'Normandy, France', chave: 'michel', aliases: /\b(?:mont[- ]saint[- ]michel|monte saint[- ]michel)\b/i,
    descritores: ['medieval abbey crowning a rocky tidal island', 'surrounded by sand flats and sea'],
    negativos: SEM_TEMPLO_NEM_ARRANHA_CEU,
    termos: 'Mont-Saint-Michel, Saint Michel, Normandy, Brittany, France, French, Benedictine, Couesnon' },
  { id: 'neuschwanstein', nome: 'Neuschwanstein Castle', onde: 'Bavaria, Germany', chave: 'neuschwanstein', aliases: /\b(?:neuschwanstein)\b/i,
    descritores: ['white fairy-tale castle with turrets on a forested crag', 'the Bavarian Alps behind it'],
    negativos: SEM_TEMPLO_NEM_ARRANHA_CEU,
    termos: 'Ludwig, King Ludwig, Bavaria, Bavarian, Bavarian Alps, Alps, Germany, German, Füssen, Hohenschwangau 1869 1886' },
  { id: 'sydney-opera', nome: 'the Sydney Opera House', onde: 'Sydney, Australia', chave: 'opera house', aliases: /\b(?:sydney opera house|opera house of sydney|[oó]pera de sydney)\b/i,
    descritores: ['white sail-shaped shell roofs on the harbour', 'Sydney Harbour Bridge nearby'],
    negativos: 'no Asian temples or pagodas',
    termos: 'Sydney, Sydney Harbour, Harbour Bridge, Jørn Utzon, Utzon, Bennelong Point, Australia, Australian 1959 1973' },
  { id: 'golden-gate', nome: 'the Golden Gate Bridge', onde: 'San Francisco, USA', chave: 'golden gate', aliases: /\b(?:golden gate(?: bridge)?|ponte golden gate)\b/i,
    descritores: ['International Orange suspension bridge over the bay', 'fog rolling over San Francisco Bay'],
    negativos: 'no other bridge in its place',
    termos: 'Golden Gate, San Francisco, San Francisco Bay, Marin, Marin Headlands, California, Pacific, Alcatraz, Joseph Strauss 1933 1937' },
  { id: 'acropolis', nome: 'the Parthenon on the Acropolis', onde: 'Athens, Greece', chave: 'parthenon', aliases: /\b(?:parthenon|partenon|partenón|acropolis|acr[oó]pole|acr[oó]polis)\b/i,
    descritores: ['white marble Doric temple atop the rocky Acropolis hill', 'overlooking Athens'],
    negativos: 'no Asian temples or pagodas, no modern skyscrapers',
    termos: 'Parthenon, Acropolis, Athena, Athena Parthenos, Athens, Athenian, Pericles, Phidias, Erechtheion, Propylaea, Greece, Greek, Greeks' },
  { id: 'notre-dame', nome: 'Notre-Dame de Paris cathedral', onde: 'Paris, France', chave: 'notre', aliases: /\bnotre[- ]dame(?=\s+de\s+paris|\s+cathedral|[^\n]{0,80}\b(?:paris|cathedral|catedral|gothic|g[oó]tica|spire)\b)|\bcatedral de notre[- ]dame\b/i, // a universidade/o time de Notre Dame não é a catedral
    descritores: ['French Gothic cathedral with twin towers and flying buttresses', 'on the Île de la Cité by the Seine'],
    negativos: 'no Asian temples or pagodas, no modern skyscrapers',
    termos: 'Notre-Dame, Notre Dame, Paris, France, French, Seine, Île de la Cité, Ile de la Cite, Quasimodo, Victor Hugo, Viollet-le-Duc, Gothic 1163 1345 1831 2019 2024' },
  { id: 'pisa', nome: 'the Leaning Tower of Pisa', onde: 'Tuscany, Italy', chave: 'pisa', aliases: /\b(?:leaning tower(?: of pisa)?|tower of pisa|torre de pisa|torre di pisa|torre pendente de pisa)\b/i, // "pisa" sozinho é verbo em português
    descritores: ['white marble bell tower visibly leaning', 'on the lawn of the Piazza dei Miracoli'],
    negativos: 'no other tower in its place, no Asian temples or pagodas',
    termos: 'Pisa, Piazza dei Miracoli, Piazza del Duomo, Tuscany, Italy, Italian, Galileo, Galileo Galilei 1173 1372 1990 2001' },
  { id: 'alhambra', nome: 'the Alhambra', onde: 'Granada, Spain', chave: 'alhambra', aliases: /\b(?:alhambra)\b/i,
    descritores: ['Moorish palace-fortress with intricate carved arches', 'the Sierra Nevada behind it'],
    negativos: 'no Asian temples or pagodas, no modern skyscrapers',
    termos: 'Granada, Nasrid, Nasrids, Moorish, Moors, Spain, Spanish, Generalife, Andalusia, Court of the Lions, Sierra Nevada 1238 1492' },
  { id: 'forbidden-city', nome: 'the Forbidden City', onde: 'Beijing, China', chave: 'forbidden city', aliases: /\b(?:forbidden city|cidade proibida|ciudad prohibida)\b/i,
    descritores: ['vast imperial palace of red walls and golden-tiled roofs'],
    negativos: 'no modern skyscrapers or city skyline',
    termos: 'Forbidden City, Beijing, Ming, Ming Dynasty, Qing, Qing Dynasty, Emperor, Yongle, China, Chinese, Tiananmen, Palace Museum 1406 1420 1912' },
  { id: 'everest', nome: 'Mount Everest', onde: 'the Himalayas, Nepal–Tibet', chave: 'everest', aliases: /\b(?:mount everest|monte everest|everest)\b/i,
    descritores: ['snow-covered pyramid summit of the highest peak on Earth', 'Himalayan glaciers and ridges'],
    negativos: 'no buildings, no modern city',
    termos: 'Everest, Himalayas, Himalaya, Himalayan, Nepal, Nepali, Tibet, Tibetan, Sherpa, Sherpas, Edmund Hillary, Hillary, Tenzing Norgay, Tenzing, Khumbu, Khumbu Icefall, Sagarmatha, Chomolungma, George Mallory, Mallory 1924 1953' },
  { id: 'grand-canyon', nome: 'the Grand Canyon', onde: 'Arizona, USA', chave: 'grand canyon', aliases: /\b(?:grand canyon|grand cañon|grande c[aâ]nion|gran ca[nñ][oó]n)\b/i,
    descritores: ['vast layered red-rock canyon carved by the Colorado River'],
    negativos: 'no buildings, no modern city',
    termos: 'Grand Canyon, Colorado River, Colorado, Arizona, South Rim, North Rim, Skywalk, Havasupai, John Wesley Powell, Powell 1869 1919' },
  { id: 'niagara', nome: 'Niagara Falls', onde: 'USA–Canada border', chave: 'niagara', aliases: /\b(?:niagara(?: falls)?|cataratas do ni[aá]gara)\b/i,
    descritores: ['massive horseshoe-shaped waterfall with rising mist'],
    negativos: 'no Asian temples or pagodas',
    termos: 'Niagara, Niagara Falls, Horseshoe Falls, American Falls, Bridal Veil Falls, Niagara River, Ontario, New York, Canada, Canadian, Maid of the Mist' },
  { id: 'hagia-sophia', nome: 'Hagia Sophia', onde: 'Istanbul, Turkey', chave: 'sophia', aliases: /\b(?:hagia sophia|santa sofia|aya sofya|ayasofya)\b/i,
    descritores: ['massive Byzantine domed basilica flanked by minarets'],
    negativos: 'no modern skyscrapers',
    termos: 'Hagia Sophia, Istanbul, Constantinople, Byzantine, Byzantium, Ottoman, Ottomans, Justinian, Mehmed, Bosphorus, Turkey, Turkish 537 1453 1934 2020' },
  { id: 'tower-of-london', nome: 'the Tower of London', onde: 'London, England', chave: 'tower of london', aliases: /\b(?:tower of london|torre de londres)\b/i,
    descritores: ['medieval stone fortress with the square White Tower', 'beside the River Thames'],
    negativos: 'no Asian temples or pagodas',
    termos: 'White Tower, Tower Bridge, River Thames, Thames, London, England, English, Britain, British, Beefeaters, Yeoman Warders, Crown Jewels, William the Conqueror, Anne Boleyn 1066 1078' },
  { id: 'pompeii', nome: 'the ruins of Pompeii', onde: 'Italy', chave: 'pompeii', aliases: /\b(?:pompeii|pompeia|pompeya)\b/i,
    descritores: ['ancient Roman stone streets and ruined villas', 'Mount Vesuvius looming behind'],
    negativos: SEM_TEMPLO_NEM_ARRANHA_CEU,
    termos: 'Pompeii, Vesuvius, Mount Vesuvius, Naples, Bay of Naples, Herculaneum, Pliny, Pliny the Younger, Roman, Romans, Italy, Italian' },
]

// Lugar fora da lista: só nome próprio no FORMATO de lugar ("Palace of X", "X Cathedral", "Mount X"). Sem descritor
// (não inventamos fato), só o nome e a ordem de não trocar por outro lugar.
const TIPO = '(?:Palace|Castle|Cathedral|Basilica|Abbey|Temple|Tower|Bridge|Fortress|Citadel|Monastery|Mosque|Pyramids?|Ruins|Statue|Mausoleum|Shrine|Canyon|Falls|Wall|Gate|Square)'
const NOME = String.raw`\p{Lu}[\p{L}'’-]+(?:\s+(?:de|da|do|del|di|of|the|la|le)?\s*\p{Lu}[\p{L}'’-]+){0,3}`
const GENERICO_RE = new RegExp(String.raw`(?<![\p{L}])(?:${TIPO}\s+of\s+(?:the\s+)?${NOME}|${NOME}\s+${TIPO}|Mount\s+\p{Lu}[\p{L}'’-]+)(?![\p{L}])`, 'u')
// Formato de lugar que NÃO é lugar real reconhecível (cena de conto, não monumento)
const GENERICO_FALSO = /^(?:the\s+)?(?:old|dark|haunted|lost|forgotten|hidden|secret|ancient|abandoned|black|white|red|silent|great)\s/i

/** Lugares curados citados no texto (na ordem da lista). */
function curadosCitados(texto: string): Entrada[] {
  const t = String(texto ?? '')
  return t ? LUGARES.filter((l) => l.aliases.test(t)) : []
}

/**
 * O lugar real que é o ASSUNTO do pedido: citado no começo (primeiros 300 caracteres) ou 2+ vezes.
 * Curado primeiro; fora da lista, o nome próprio de lugar pelo formato. null = pedido sem lugar real.
 */
export function lugarPrincipal(pedido: string): LugarReal | null {
  const t = String(pedido ?? '').replace(/\s+/g, ' ').trim()
  if (!t) return null
  const inicio = t.slice(0, 300)
  for (const l of LUGARES) {
    const global = new RegExp(l.aliases.source, 'gi')
    const n = (t.match(global) ?? []).length
    if (l.aliases.test(inicio) || n >= 2) return { id: l.id, nome: l.nome, onde: l.onde, chave: l.chave, descritores: l.descritores, negativos: l.negativos, curado: true }
  }
  const m = inicio.match(GENERICO_RE)
  if (m && !GENERICO_FALSO.test(m[0])) {
    const nome = m[0].trim()
    return { id: 'generico', nome, onde: '', chave: nome.toLowerCase(), descritores: [], negativos: '', curado: false }
  }
  return null
}

/**
 * O contexto dos filtros anti-invenção + o vocabulário verdadeiro dos lugares curados que o contexto cita.
 * Contexto sem lugar curado volta IDÊNTICO (mesma string) — mistério/atmosfera não mudam.
 */
export function comVocabularioDoLugar(contexto: string): string {
  const base = String(contexto ?? '')
  const citados = curadosCitados(base)
  if (!citados.length) return base
  return `${base} ${citados.map((l) => `${l.nome} ${l.onde} ${l.termos}`).join(' ')}`
}

/** A frase de cenário que vai na frente do plano visual. */
export function ancoraDoLugar(lugar: LugarReal): string {
  const onde = lugar.onde ? `, ${lugar.onde}` : ''
  const desc = lugar.descritores.length ? ` (${lugar.descritores.join(', ')})` : ' (the real, recognizable landmark, accurately depicted)'
  return `Setting: ${lugar.nome}${onde}${desc}.`
}

/**
 * O plano visual de uma cena com o lugar ancorado: cenário na frente, negativos no fim. Idempotente.
 * lugar null → o texto volta intacto.
 */
export function ancorarLugarNoPrompt(visual: string, lugar: LugarReal | null): string {
  const v = String(visual ?? '').trim()
  if (!lugar) return visual
  const ancora = ancoraDoLugar(lugar)
  if (v.includes(ancora)) return v
  const nao = lugar.negativos ? ` ${lugar.negativos.charAt(0).toUpperCase()}${lugar.negativos.slice(1)}.` : ' Never a different or generic place.'
  return `${ancora} ${v || 'The landmark itself, clearly framed'}${/[.!?]$/.test(v) ? '' : '.'}${nao}`.replace(/\s{2,}/g, ' ').trim()
}

/** Verificação em código: o nome do lugar está no prompt final? */
export function promptTemOLugar(prompt: string, lugar: LugarReal): boolean {
  return String(prompt ?? '').toLowerCase().includes(lugar.chave)
}

// KINEO-MONUMENTO-2026-10-13 — "drone tour / Style: / Camera:" sobre um lugar real é pedido de FILME, não plano de clipe.
// As linhas "chave: valor" de plano viram UMA linha de direção visual (sem os dois-pontos que o detector lê) e o
// pedido ganha a frase de documentário narrado. Quem chama força o modo IA (a narradora nunca lê o plano).
const LINHA_DE_PLANO_RE = /^\s*"?(clip|shot|scene|duration|action|camera|vfx|lighting|style|subject|motion|combat_logic|environment|mood|lens|composition)"?\s*[:=]\s*(.+)$/i
export function pedidoDeTourNarrado(texto: string, lugar: LugarReal): string {
  const linhas = String(texto ?? '').split(/\r?\n/)
  const direcao: string[] = []
  const resto: string[] = []
  for (const l of linhas) {
    const m = l.match(LINHA_DE_PLANO_RE)
    if (m) { if (!/^(clip|shot|duration)$/i.test(m[1])) direcao.push(`${m[1].toLowerCase().replace(/_/g, ' ')} ${m[2].trim().replace(/^["'“”]+|["'“”,]+$/g, '')}`) } else resto.push(l)
  }
  const corpo = resto.join('\n').trim()
  const visual = direcao.length ? `\nVisual direction — ${direcao.join('; ')}.` : ''
  return `The story of ${lugar.nome}${lugar.onde ? `, ${lugar.onde}` : ''}, told as a narrated cinematic tour of the real place.\n${corpo}${visual}`.trim()
}
