// ═══ KINEO-JUIZ-REFAZ-2810 [TRAVA 8.2 — vai do fundador 28/10 "o mascote tem de morrer"] — SERES E FIGURAS FIÉIS ═══ // KINEO-JUIZ-REFAZ-2810
// // KINEO-JUIZ-REFAZ-2810
// O MASCOTE (defeito nº 1 do filme grátis, 27-28/10): toda criatura/animal nomeado que a casa não sabia descrever virava o MESMO // KINEO-JUIZ-REFAZ-2810
// texto fixo — "a medium-sized <cor sorteada> <espécie> with big round friendly eyes and a short tail, no clothes" — em dois lugares: // KINEO-JUIZ-REFAZ-2810
// lib/cinematic/elencoEpoca.ts descrever() (estrada clássica, TODO cliente) e lib/cinematic/folhaDePersonagem.ts canonicaDeterministica() // KINEO-JUIZ-REFAZ-2810
// (a folha). Casos reais: Gênesis de 28/10 (dc4ac291): "Among the stars, Lucifer, the brightest angel, fell from grace" virou // KINEO-JUIZ-REFAZ-2810
// "Lucifer, a medium-sized bright green angel with big round friendly eyes and a short tail" (+ "Among, a teal star" — o "Among" // KINEO-JUIZ-REFAZ-2810
// virou gente); Ghost Rider em Teerã (27/10) = "a soft purple ghost with big round friendly eyes"; Krishna (27/10) = "a small and // KINEO-JUIZ-REFAZ-2810
// chubby soft purple demon with a cream belly". Os três filmes saíram com o mesmo bichinho roxo/verde; nenhum foi baixado. // KINEO-JUIZ-REFAZ-2810
// // KINEO-JUIZ-REFAZ-2810
// ESTE MÓDULO (puro, sem import, determinístico) é a única fonte das duas trilhas: // KINEO-JUIZ-REFAZ-2810
//   · ANATOMIA_DO_SER: o que o motor precisa VER para a espécie existir (asas de pena no anjo, chifres no demônio, crânio no // KINEO-JUIZ-REFAZ-2810
//     esqueleto…). Nada de "olhos redondos amigáveis e rabinho" por padrão: isso só entra no CONTO INFANTIL, e mesmo lá com a // KINEO-JUIZ-REFAZ-2810
//     anatomia da espécie (o dragãozinho tem asas e escamas). Ser sagrado ou sombrio (anjo, demônio, fantasma, zumbi…) nunca é // KINEO-JUIZ-REFAZ-2810
//     fofo nem recebe cor sorteada — só a cor que o TEXTO disse. // KINEO-JUIZ-REFAZ-2810
//   · FIGURAS_FIEIS: nome de figura conhecida → a aparência que qualquer pessoa reconhece (domínio público) ou, para personagem // KINEO-JUIZ-REFAZ-2810
//     de franquia, o EQUIVALENTE GENÉRICO fiel pela regra da casa de marca zero (Ghost Rider = motoqueiro de crânio em chamas, // KINEO-JUIZ-REFAZ-2810
//     sem logotipo). Lucifer = anjo caído de asas escuras em fogo e luz — a cena sagrada é mostrada literalmente, nunca um mascote. // KINEO-JUIZ-REFAZ-2810
// Guardião: scripts/test-juiz-refaz-2810.mjs (com os textos REAIS de Gênesis, Krishna e Ghost Rider). // KINEO-JUIZ-REFAZ-2810

export const MARCA_SERES_FIEIS = 'KINEO-JUIZ-REFAZ-2810' // KINEO-JUIZ-REFAZ-2810

const limpa = (s: string | null | undefined) => String(s ?? '').replace(/\s+/g, ' ').trim() // KINEO-JUIZ-REFAZ-2810
const normaliza = (s: string) => limpa(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’‘]/g, "'") // KINEO-JUIZ-REFAZ-2810

/** Espécie como a casa a escreve (dino → dinosaur, trex → t-rex). */ // KINEO-JUIZ-REFAZ-2810
export function especieCanonica(especie: string | null | undefined): string | null { // KINEO-JUIZ-REFAZ-2810
  const e = normaliza(String(especie ?? '')).replace(/s$/, (m, off, s) => (/(?:ss|us|is)$/.test(s) ? m : '')) // KINEO-JUIZ-REFAZ-2810 — "dragons" → "dragon"; "octopus" fica
  if (!e) return null // KINEO-JUIZ-REFAZ-2810
  if (e === 'dino') return 'dinosaur' // KINEO-JUIZ-REFAZ-2810
  if (e === 'trex' || e === 't-rex' || e === 'tyrannosaurus') return 't-rex' // KINEO-JUIZ-REFAZ-2810
  return e // KINEO-JUIZ-REFAZ-2810
} // KINEO-JUIZ-REFAZ-2810

/** O que o motor precisa VER para a espécie existir — anatomia, nunca gosto. Começa sempre por artigo ("a tall luminous angel…"). */ // KINEO-JUIZ-REFAZ-2810
export const ANATOMIA_DO_SER: Readonly<Record<string, string>> = { // KINEO-JUIZ-REFAZ-2810
  angel: 'a tall luminous angel with a human face and body, large white feathered wings, flowing pale robes and a soft golden glow around the head', // KINEO-JUIZ-REFAZ-2810
  demon: 'a menacing demon with dark red skin, curved horns, glowing eyes, sharp teeth and bat-like wings', // KINEO-JUIZ-REFAZ-2810
  devil: 'a menacing devil with dark red skin, curved horns, glowing eyes, sharp teeth and bat-like wings', // KINEO-JUIZ-REFAZ-2810
  ghost: 'a translucent pale spectral figure with a human shape, faintly glowing, in tattered flowing robes, with hollow dark eyes', // KINEO-JUIZ-REFAZ-2810
  spirit: 'a translucent glowing spirit with a human silhouette, trailing wisps of light', // KINEO-JUIZ-REFAZ-2810
  dragon: 'a dragon with a long scaled body, a horned reptilian head, leathery bat-like wings, sharp claws and a long spiked tail', // KINEO-JUIZ-REFAZ-2810
  dinosaur: 'a dinosaur with scaly skin, a long heavy tail, clawed feet and a reptilian head', // KINEO-JUIZ-REFAZ-2810
  't-rex': 'a tyrannosaurus with a massive head, powerful jaws full of sharp teeth, tiny two-fingered arms and a long thick tail', // KINEO-JUIZ-REFAZ-2810
  raptor: 'a velociraptor with a sleek scaled body, a long stiff tail, sickle claws and a narrow toothed snout', // KINEO-JUIZ-REFAZ-2810
  robot: 'a humanoid robot with a metallic articulated body, visible joints and glowing eyes', // KINEO-JUIZ-REFAZ-2810
  android: 'an android with a sleek metallic humanoid body, seamed panels and softly glowing eyes', // KINEO-JUIZ-REFAZ-2810
  cyborg: 'a cyborg with a human face and visible metal implants, one mechanical arm and a glowing optic', // KINEO-JUIZ-REFAZ-2810
  alien: 'a slender grey alien with a large head, big black almond-shaped eyes and long thin limbs', // KINEO-JUIZ-REFAZ-2810
  monster: 'a hulking monster with rough textured skin, claws, fangs and glowing eyes', // KINEO-JUIZ-REFAZ-2810
  beast: 'a wild beast with thick fur, fangs, claws and burning eyes', // KINEO-JUIZ-REFAZ-2810
  creature: 'a strange creature with clearly visible limbs, a distinct head and natural textured skin', // KINEO-JUIZ-REFAZ-2810
  zombie: 'a rotting zombie with grey decaying skin, torn clothes, sunken eyes and a slack jaw', // KINEO-JUIZ-REFAZ-2810
  vampire: 'a pale vampire with slicked dark hair, red eyes, sharp fangs and a long black cloak with a high collar', // KINEO-JUIZ-REFAZ-2810
  werewolf: 'a werewolf: a towering wolf-headed figure with thick dark fur, fangs, claws and torn clothes', // KINEO-JUIZ-REFAZ-2810
  mermaid: 'a mermaid with a human upper body, long flowing hair and a shimmering scaled fish tail', // KINEO-JUIZ-REFAZ-2810
  giant: 'a towering giant with a rough weathered face, enormous hands and crude cloth garments', // KINEO-JUIZ-REFAZ-2810
  golem: 'a golem of cracked stone and clay with glowing rune eyes', // KINEO-JUIZ-REFAZ-2810
  genie: 'a genie with blue skin, a muscular torso fading into a trail of smoke, gold bracelets and a topknot', // KINEO-JUIZ-REFAZ-2810
  fairy: 'a tiny fairy with translucent glittering insect wings, pointed ears and a dress of petals', // KINEO-JUIZ-REFAZ-2810
  elf: 'an elf with pointed ears, fine features and green forest clothing', // KINEO-JUIZ-REFAZ-2810
  dwarf: 'a stout dwarf with a long braided beard, a leather apron and a heavy axe', // KINEO-JUIZ-REFAZ-2810
  troll: 'a hulking troll with mossy green skin, a bulbous nose, tusks and a wooden club', // KINEO-JUIZ-REFAZ-2810
  goblin: 'a small goblin with green skin, pointed ears, a hooked nose and ragged leather clothes', // KINEO-JUIZ-REFAZ-2810
  unicorn: 'a white unicorn horse with a single spiralling horn and a flowing mane', // KINEO-JUIZ-REFAZ-2810
  phoenix: 'a phoenix: a great bird made of flame with blazing red-gold feathers and a long trailing tail', // KINEO-JUIZ-REFAZ-2810
  griffin: 'a griffin with the head and wings of an eagle and the body of a lion', // KINEO-JUIZ-REFAZ-2810
  yeti: 'a yeti: a towering ape-like creature covered in shaggy white fur', // KINEO-JUIZ-REFAZ-2810
  gnome: 'a small gnome with a red pointed hat, a white beard and a blue jacket', // KINEO-JUIZ-REFAZ-2810
  witch: 'a witch in a black pointed hat and dark layered robes, holding a gnarled broom', // KINEO-JUIZ-REFAZ-2810
  wizard: 'a wizard with a long grey beard, a pointed hat and flowing robes, holding a wooden staff', // KINEO-JUIZ-REFAZ-2810
  skeleton: 'a human skeleton with a bare skull, hollow eye sockets, ribs and bony hands', // KINEO-JUIZ-REFAZ-2810
  mummy: 'a mummy wrapped head to toe in aged linen bandages, with dark hollow eyes', // KINEO-JUIZ-REFAZ-2810
  ogre: 'a massive ogre with greenish warty skin, a huge belly, tusks and a ragged tunic', // KINEO-JUIZ-REFAZ-2810
} // KINEO-JUIZ-REFAZ-2810

/** Ser sagrado ou sombrio: nunca fofo, nunca cor sorteada (só a cor que o texto disse), nem em conto infantil. */ // KINEO-JUIZ-REFAZ-2810
const SAGRADO_OU_SOMBRIO = new Set(['angel', 'demon', 'devil', 'ghost', 'spirit', 'zombie', 'vampire', 'werewolf', 'giant', 'golem', 'genie', 'witch', 'wizard', 'skeleton', 'mummy', 'mermaid', 'ogre']) // KINEO-JUIZ-REFAZ-2810

export interface PedidoDeSer { // KINEO-JUIZ-REFAZ-2810
  nome: string // KINEO-JUIZ-REFAZ-2810
  tipo: 'animal' | 'criatura' // KINEO-JUIZ-REFAZ-2810
  especie: string | null // KINEO-JUIZ-REFAZ-2810
  /** a cor que o TEXTO disse ("the blue ghost") — a única que entra num ser sagrado/sombrio */ // KINEO-JUIZ-REFAZ-2810
  corDita: string | null // KINEO-JUIZ-REFAZ-2810
  /** a cor sorteada da casa — só entra no conto infantil */ // KINEO-JUIZ-REFAZ-2810
  corSorteada: string // KINEO-JUIZ-REFAZ-2810
  pequeno: boolean // KINEO-JUIZ-REFAZ-2810
  /** conto infantil (kids_cartoon ou pistas do texto): aí sim o estilo é fofo — por cima da anatomia da espécie */ // KINEO-JUIZ-REFAZ-2810
  infantil: boolean // KINEO-JUIZ-REFAZ-2810
} // KINEO-JUIZ-REFAZ-2810

/** A frase "cute" do conto infantil — nunca sai sozinha, sempre por cima da anatomia da espécie. */ // KINEO-JUIZ-REFAZ-2810
export const ESTILO_INFANTIL = 'drawn in a soft friendly cartoon style with a rounded body and big expressive eyes' // KINEO-JUIZ-REFAZ-2810

/**
 * A descrição fiel de um ser não humano. Mesmo pedido → mesmo texto. Nunca devolve "big round friendly eyes and a short tail":
 * a anatomia da espécie vem primeiro; o estilo fofo só no conto infantil e só para ser que não é sagrado nem sombrio.
 */ // KINEO-JUIZ-REFAZ-2810
export function descricaoFielDoSer(p: PedidoDeSer): string { // KINEO-JUIZ-REFAZ-2810
  const esp = especieCanonica(p.especie) ?? (p.tipo === 'animal' ? 'animal' : 'creature') // KINEO-JUIZ-REFAZ-2810
  const anatomia = ANATOMIA_DO_SER[esp] // KINEO-JUIZ-REFAZ-2810
  const sombrio = SAGRADO_OU_SOMBRIO.has(esp) // KINEO-JUIZ-REFAZ-2810
  const corDita = p.corDita ? normaliza(p.corDita) : null // KINEO-JUIZ-REFAZ-2810
  const porte = p.pequeno ? 'small ' : '' // KINEO-JUIZ-REFAZ-2810
  if (anatomia) { // KINEO-JUIZ-REFAZ-2810
    if (sombrio || !p.infantil) return `${p.nome}, ${porte ? anatomia.replace(/^(an?) /, `$1 ${porte}`) : anatomia}${corDita ? `, ${corDita} in colour` : ''}` // KINEO-JUIZ-REFAZ-2810
    const cor = corDita ?? p.corSorteada // KINEO-JUIZ-REFAZ-2810
    return `${p.nome}, a ${porte}${cor} ${esp} — ${anatomia.replace(/^an? (?:\w+ )?(?=\w)/, '')}, ${ESTILO_INFANTIL}` // KINEO-JUIZ-REFAZ-2810
  } // KINEO-JUIZ-REFAZ-2810
  if (p.tipo === 'animal' && esp !== 'animal') { // KINEO-JUIZ-REFAZ-2810 — bicho real: a anatomia do bicho, não a de um mascote
    if (p.infantil) return `${p.nome}, a ${porte}${corDita ?? p.corSorteada} ${esp} with true ${esp} anatomy (the real ears, snout, paws and tail of a ${esp}), ${ESTILO_INFANTIL}` // KINEO-JUIZ-REFAZ-2810
    return `${p.nome}, a ${p.pequeno ? 'young ' : ''}${esp} with realistic ${esp} anatomy and natural colours${corDita ? `, ${corDita} in colour` : ''}` // KINEO-JUIZ-REFAZ-2810
  } // KINEO-JUIZ-REFAZ-2810
  // coisa que vira personagem só no conto infantil (nuvem, estrela, biscoito): ainda com a FORMA da coisa // KINEO-JUIZ-REFAZ-2810
  if (p.infantil) return `${p.nome}, a ${porte}${corDita ?? p.corSorteada} living ${esp} character, still clearly shaped like a ${esp}, with a simple friendly face, ${ESTILO_INFANTIL}` // KINEO-JUIZ-REFAZ-2810
  return `${p.nome}, ${/^[aeiou]/i.test(esp) ? 'an' : 'a'} ${porte}${corDita ? `${corDita} ` : ''}${esp}` // KINEO-JUIZ-REFAZ-2810
} // KINEO-JUIZ-REFAZ-2810

export interface FiguraFiel { nomes: readonly string[]; descricao: string; genero: 'man' | 'woman'; tipo: 'criatura' | 'humano' } // KINEO-JUIZ-REFAZ-2810

/**
 * Figuras conhecidas: iconografia de domínio público (religião, mito, folclore) e, para personagem de franquia, o EQUIVALENTE
 * GENÉRICO fiel (regra da casa de marca zero: o que o espectador reconhece, sem nome de marca nem logotipo no prompt).
 * As 5 figuras hindus vieram de lib/cinematic/juizFicha (27/10); as da tabela de lib/cinematic/personagemAjuste (Ravan, Hanuman,
 * Ganesha, Zeus, Poseidon, Medusa, Anubis, Thor) continuam lá — aquela tabela consulta esta depois.
 */ // KINEO-JUIZ-REFAZ-2810
export const FIGURAS_FIEIS: ReadonlyArray<FiguraFiel> = [ // KINEO-JUIZ-REFAZ-2810
  { nomes: ['lucifer', 'satan', 'the devil', 'devil', 'the fallen angel', 'morning star'], tipo: 'criatura', genero: 'man', descricao: 'the fallen angel: a tall, strikingly beautiful angelic figure with a human face, huge dark feathered wings, pale luminous skin, long dark hair and torn white robes, wreathed in fire and streaks of falling light' }, // KINEO-JUIZ-REFAZ-2810
  { nomes: ['ghost rider', 'the ghost rider', 'ghostrider'], tipo: 'criatura', genero: 'man', descricao: 'a spectral motorcycle rider with a flaming skull for a head, wearing a black leather jacket wrapped in heavy chains, riding a black motorcycle whose wheels burn with fire (a generic flaming-skull rider, no logos)' }, // KINEO-JUIZ-REFAZ-2810
  { nomes: ['grim reaper', 'the grim reaper', 'the reaper'], tipo: 'criatura', genero: 'man', descricao: 'the grim reaper: a tall skeletal figure in a hooded black robe, a bare skull inside the hood, bony hands holding a long scythe' }, // KINEO-JUIZ-REFAZ-2810
  { nomes: ['dracula', 'count dracula'], tipo: 'criatura', genero: 'man', descricao: 'a classic vampire count: a pale gaunt man with slicked-back black hair, a widow\'s peak, red eyes, sharp fangs, a black tailcoat and a long black cape with a high red-lined collar' }, // KINEO-JUIZ-REFAZ-2810
  { nomes: ['frankenstein', "frankenstein's monster", 'the frankenstein monster'], tipo: 'criatura', genero: 'man', descricao: 'a towering stitched-together man with greenish-grey skin, a flat-topped head, visible scars and stitches, metal bolts at the neck and a ragged dark suit' }, // KINEO-JUIZ-REFAZ-2810
  { nomes: ['santa claus', 'santa', 'father christmas', 'papai noel', 'papá noel', 'saint nicholas', 'st nicholas'], tipo: 'humano', genero: 'man', descricao: 'Santa Claus: a plump elderly man with a long white beard, rosy cheeks, round spectacles, a red suit with white fur trim, a black belt and a red hat' }, // KINEO-JUIZ-REFAZ-2810
  { nomes: ['jesus', 'jesus christ', 'christ', 'jesus of nazareth'], tipo: 'humano', genero: 'man', descricao: 'Jesus: a man in his early thirties with long brown hair, a full brown beard, warm gentle eyes, a plain white robe with a red sash and leather sandals' }, // KINEO-JUIZ-REFAZ-2810
  { nomes: ['krishna', 'krishn', 'kanha', 'kanhaiya', 'gopal', 'govinda', 'shri krishna', 'sri krishna', 'lord krishna'], tipo: 'criatura', genero: 'man', descricao: 'the Hindu god Krishna: a graceful figure with deep blue skin, a golden crown with a peacock feather, long dark curly hair, large calm eyes, a yellow silk dhoti, flower garlands and gold jewellery, holding a bamboo flute' }, // KINEO-JUIZ-REFAZ-2810
  { nomes: ['shiva', 'shiv', 'mahadev', 'lord shiva'], tipo: 'criatura', genero: 'man', descricao: 'the Hindu god Shiva: an ascetic with pale blue-grey skin, matted hair piled high with a crescent moon, a third eye on the forehead, a cobra around the neck, a tiger skin around the waist, holding a trident' }, // KINEO-JUIZ-REFAZ-2810
  { nomes: ['rama', 'ram', 'shri ram', 'lord rama'], tipo: 'criatura', genero: 'man', descricao: 'the Hindu god Rama: a noble prince with blue skin, a golden crown, long dark hair, yellow and orange silk garments, gold jewellery, carrying a tall bow and a quiver of arrows' }, // KINEO-JUIZ-REFAZ-2810
  { nomes: ['durga', 'maa durga', 'goddess durga'], tipo: 'criatura', genero: 'woman', descricao: 'the Hindu goddess Durga: a radiant woman with golden skin, ten arms each holding a weapon, a tall golden crown, a red and gold sari, riding a lion' }, // KINEO-JUIZ-REFAZ-2810
  { nomes: ['buddha', 'gautama buddha', 'the buddha', 'siddhartha'], tipo: 'humano', genero: 'man', descricao: 'the Buddha: a serene seated monk with a shaved head of tight curls, a topknot, long earlobes, a saffron robe draped over one shoulder, hands resting in meditation' }, // KINEO-JUIZ-REFAZ-2810
  { nomes: ['vishwaroop', 'vishvarupa', 'vishwarupa', 'vishwaroopam', 'viraat roop', 'virat roop'], tipo: 'criatura', genero: 'man', descricao: 'the cosmic universal form of Vishnu: a colossal radiant figure filling the sky, with countless serene faces and crowns stacked upward, many arms holding weapons and lotuses, ornate golden armour, blazing with light' }, // KINEO-JUIZ-REFAZ-2810 — o filme REAL do Krishna (28/10) saía "a person in their thirties"
] // KINEO-JUIZ-REFAZ-2810

/**
 * A figura de nome COMPOSTO que o texto cita e de que `palavra` faz parte ("Ghost" ou "Rider" num texto com "the Ghost Rider appears"):
 * o extrator da folha (lib/cinematic/folhaDePersonagem nomesDoRoteiro) só lê nomes de UMA palavra. null = nenhuma.
 */ // KINEO-JUIZ-REFAZ-2810
export function figuraFielNoTexto(texto: string | null | undefined, palavra: string | null | undefined): FiguraFiel | null { // KINEO-JUIZ-REFAZ-2810
  const t = normaliza(String(texto ?? '')) // KINEO-JUIZ-REFAZ-2810
  const p = normaliza(String(palavra ?? '')) // KINEO-JUIZ-REFAZ-2810
  if (!t || !p) return null // KINEO-JUIZ-REFAZ-2810
  for (const f of FIGURAS_FIEIS) for (const n of f.nomes) { // KINEO-JUIZ-REFAZ-2810
    if (!n.includes(' ') || !n.split(' ').includes(p)) continue // KINEO-JUIZ-REFAZ-2810
    if (new RegExp(`(?<![\\p{L}\\p{N}])${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{N}])`, 'iu').test(t)) return f // KINEO-JUIZ-REFAZ-2810
  } // KINEO-JUIZ-REFAZ-2810
  return null // KINEO-JUIZ-REFAZ-2810
} // KINEO-JUIZ-REFAZ-2810

/** As figuras de nome COMPOSTO que o texto cita, com o nome como está escrito ("Ghost Rider"). Uma por figura, na ordem do texto. */ // KINEO-JUIZ-REFAZ-2810
export function figurasCompostasNoTexto(texto: string | null | undefined): Array<{ figura: FiguraFiel; nome: string; pos: number }> { // KINEO-JUIZ-REFAZ-2810
  const t = String(texto ?? '') // KINEO-JUIZ-REFAZ-2810
  if (!t) return [] // KINEO-JUIZ-REFAZ-2810
  const saida: Array<{ figura: FiguraFiel; nome: string; pos: number }> = [] // KINEO-JUIZ-REFAZ-2810
  for (const f of FIGURAS_FIEIS) { // KINEO-JUIZ-REFAZ-2810
    for (const n of f.nomes) { // KINEO-JUIZ-REFAZ-2810
      if (!n.includes(' ') || /^the /.test(n)) continue // KINEO-JUIZ-REFAZ-2810 — "the ghost rider" é a mesma figura de "ghost rider"
      const m = new RegExp(`(?<![\\p{L}\\p{N}])${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+')}(?![\\p{L}\\p{N}])`, 'iu').exec(t.normalize('NFD').replace(/[̀-ͯ]/g, '')) // KINEO-JUIZ-REFAZ-2810
      if (!m) continue // KINEO-JUIZ-REFAZ-2810
      if (!saida.some((s) => s.figura === f)) saida.push({ figura: f, nome: m[0].replace(/\s+/g, ' ').replace(/\b\p{L}/gu, (c) => c.toUpperCase()), pos: m.index }) // KINEO-JUIZ-REFAZ-2810
      break // KINEO-JUIZ-REFAZ-2810
    } // KINEO-JUIZ-REFAZ-2810
  } // KINEO-JUIZ-REFAZ-2810
  return saida.sort((a, b) => a.pos - b.pos) // KINEO-JUIZ-REFAZ-2810
} // KINEO-JUIZ-REFAZ-2810

/** Nome → figura conhecida (sem caixa, sem acento; "Lord Krishna", "the Ghost Rider", "Saint Nicholas" caem na mesma). null = desconhecido. */ // KINEO-JUIZ-REFAZ-2810
export function figuraFiel(nome: string | null | undefined): FiguraFiel | null { // KINEO-JUIZ-REFAZ-2810
  const n = normaliza(String(nome ?? '')).replace(/[.,!?;:"]+$/g, '') // KINEO-JUIZ-REFAZ-2810
  if (!n) return null // KINEO-JUIZ-REFAZ-2810
  const semTitulo = n.replace(/^(?:the|lord|shri|sri|saint|st|count|senhor|são|san)\.?\s+/, '') // KINEO-JUIZ-REFAZ-2810
  const direta = FIGURAS_FIEIS.find((f) => f.nomes.includes(n) || f.nomes.includes(semTitulo)) // KINEO-JUIZ-REFAZ-2810
  if (direta) return direta // KINEO-JUIZ-REFAZ-2810
  // nome composto cuja ÚLTIMA palavra é a figura ("Colossal Vishwaroop", "Baby Krishna"): o adjetivo que abriu a frase ficou colado ao nome // KINEO-JUIZ-REFAZ-2810
  const palavras = semTitulo.split(' ') // KINEO-JUIZ-REFAZ-2810
  if (palavras.length < 2) return null // KINEO-JUIZ-REFAZ-2810
  const ultima = palavras[palavras.length - 1] // KINEO-JUIZ-REFAZ-2810
  return FIGURAS_FIEIS.find((f) => f.nomes.includes(ultima)) ?? null // KINEO-JUIZ-REFAZ-2810 — só quando a última palavra é, sozinha, um nome da tabela (Krishna, Vishwaroop, Lucifer); "Rider" sozinho não é o Ghost Rider
} // KINEO-JUIZ-REFAZ-2810
