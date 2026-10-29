// ═══ KINEO-META95-PERSONAGEM-2010 [TRAVA 8.2 — vai do fundador 19/10 "Vai pra meta do 95"] — A FOLHA DE PERSONAGEM ═══
//
// O DEFEITO (docs/DIAGNOSTICO-META-95-2026-10-19.md, causa C5 + §3): o MESMO personagem troca de cara, de espécie ou some
// entre as 3 cenas. Caso real: o Dino (render b3732cf0, 19/10) é "Dino" nos três prompts e em NENHUM deles alguém diz o que
// o Dino É — o still da cena 3 saiu um menino humano. a0b58200: a protagonista com 3 rostos. 5a114e02: o menino da moto
// nunca aparece. Hoje cada still FLUX é um pedido INDEPENDENTE (lib/hollywood/anchors generateCinematicSceneStill): a única
// continuidade é a semente compartilhada e a ficha de TEXTO (deriveStoryCharacter / derivarElenco), que só existe quando o
// autor descreveu o personagem — e um nome nu ("Dino") não vira descrição.
//
// O QUE OS LÍDERES FAZEM (docs/CONSISTENCIA-COMO-OS-LIDERES-GARANTEM-2026-10-19.md, M7): referência travada — ficha de
// personagem (InVideo), Soul ID (Higgsfield), Popcorn (imagens consistentes que viram start frame). Uma imagem de referência
// gerada UMA vez e reutilizada em toda cena. É o que a casa já faz na "Estrela do filme" (lib/estrelaDoFilme) com as FOTOS do
// cliente — aqui a "foto" é uma FOLHA gerada do roteiro.
//
// O DESENHO (fase 1, 20/10 — só conta interna, por pedido):
//   1. ELENCO: lê o roteiro e acha o(s) personagem(ns) (no máximo 2): nome com papel de sujeito/possessivo/fala ("Dino heard",
//      "Ravan's face", "Dino:"), ou protagonista sem nome ("a sad Indian boy", "a young man"). Cada um ganha UMA descrição
//      canônica determinística (espécie/idade/cor/roupa; mesmo roteiro → mesma ficha), e o gpt-4o-mini (1 chamada, ~US$ 0,0005,
//      6 s) só REFINA a descrição mantendo nome e espécie — falhou, fica a determinística. A ficha do autor (deriveExplicitCharacter)
//      vence as duas.
//   2. FOLHA: 1 imagem de referência por personagem (FLUX dev, o mesmo gerador do still de hoje, ~US$ 0,015), corpo inteiro,
//      fundo neutro, com a descrição canônica e o look do filme.
//   3. CENAS: cada cena que cita o personagem (nome, papel ou pronome em continuação) tem o still gerado pelo
//      fal-ai/nano-banana-pro/edit com a folha como image_urls (o MESMO endpoint e o mesmo corpo da Estrela, US$ 0,15), com o
//      prompt final da cena + a instrução de identidade. Cena sem personagem: o still FLUX de sempre.
//   4. TEXTO: a descrição canônica entra no prompt de TODA cena que cita o personagem (ficha → policy.character / elenco — a
//      mesma trilha de KINEO-SEEDANCE-FICHA / PARCEIRO-EYEBIBLE-2), no still e no clipe i2v.
//   5. JUIZ: o crítico do still (lib/cinematic/criticoStill) recebe a folha como 2ª imagem e o critério IDENTITY; still
//      reprovado é refeito UMA vez (edit com a folha, instrução positiva) antes do clipe pago.
//   Sem personagem no roteiro (documentário sem pessoa): nada muda. Desligado: nada roda — fluxo e JSON de sempre.
//
// Módulo PURO (sem rede): o guardião scripts/test-meta95-personagem-2010.mjs transpila e EXECUTA este arquivo com os roteiros
// REAIS do Dino, do Ravan e da biblioteca da meia-noite. A rede (folha FLUX, edit, crítico) fica na rota e em
// lib/estrelaServer (gerarStillsDaEstrela, reutilizado com a folha no lugar das fotos).
import { deriveExplicitCharacter, type PapelDoElenco, type StyleAnchor } from '@/lib/cinematic/sceneStyle'
import { ESTRELA_EDIT_SLUG, buildEstrelaEditInput } from '@/lib/estrelaDoFilme'
import { AI_TEXT_MODELS } from '@/lib/aiModels'
import { descricaoFielDoSer } from '@/lib/cinematic/seresFieis' // KINEO-JUIZ-REFAZ-2810 — anatomia fiel por espécie: a ficha canônica deixa de inventar o mascote
import { semRotulosDeSecao, PALAVRAS_DE_SECAO, pessoasPossessivas } from '@/lib/cinematic/pessoasDaNarracao' // KINEO-ELENCO-MARCADOR-2910

export const MARCA_PERSONAGEM = 'KINEO-META95-PERSONAGEM-2010'
export const PERSONAGEM_VERSAO = 'personagem_v1'
/** Um evento por filme com a folha ligada. session_id = generation_id. */
export const PERSONAGEM_EVENTO = 'cinematic_character_sheet'
/** O item de `formatFlags` que liga a folha num pedido de conta interna. */
export const PERSONAGEM_FLAG = 'personagem'
/** INTERRUPTOR PÚBLICO — false = só conta interna, por pedido (formatFlags). Vira true depois dos 3 filmes de teste do fundador. */
export const PERSONAGEM_PUBLIC = false
/** O edit com referência: o MESMO endpoint da Estrela do filme (validado em produção desde 01/10). */
export const PERSONAGEM_EDIT_SLUG: string = ESTRELA_EDIT_SLUG
/** Motores com still por cena na estrada clássica (KINEO-ANCORA-3-MOTORES). Hollywood/s25/sora/fast ficam de fora na fase 1. */
export const PERSONAGEM_MOTORES = ['seedance', 'kling', 'veo'] as const
export const PERSONAGEM_MAX_PERSONAGENS = 2
/** Teto de stills com folha por filme (custo: 90 s no Veo planeja até ~14 planos). */
export const PERSONAGEM_MAX_STILLS = 9
/** Custos de log (US$): a folha é um FLUX dev 9:16 (0,59 MP × US$ 0,025/MP); o still com folha é um Nano Banana Pro 1K; o
 *  crítico com 2 imagens em detail 'low' (2 × 2.833 tokens + texto) ≈ US$ 0,001; o casting ≈ US$ 0,0005. */
export const PERSONAGEM_FOLHA_USD = 0.015
export const PERSONAGEM_STILL_USD = 0.15
export const PERSONAGEM_CRITICO_USD = 0.001
export const PERSONAGEM_CASTING_USD = 0.0005
export const PERSONAGEM_CASTING_MODELO: string = AI_TEXT_MODELS.scenePlannerLight
export const PERSONAGEM_CASTING_PRAZO_MS = 6_000

// ═══ 0. O interruptor ═════════════════════════════════════════════════════════════════════════════════════════════
/** `formatFlags` (lista ou texto "a,b") contém 'personagem'? Qualquer outra forma = false. */
export function pedidoDePersonagem(raw: unknown): boolean {
  const itens = Array.isArray(raw) ? raw : typeof raw === 'string' ? raw.split(/[,\s]+/) : []
  return itens.some((x) => typeof x === 'string' && x.trim().toLowerCase() === PERSONAGEM_FLAG)
}

export interface DecisaoPersonagem { ativo: boolean; motivo: string }

/**
 * Liga a folha neste pedido? Tudo tem de ser verdade: pedido de conta interna (ou PERSONAGEM_PUBLIC), motor clássico com still
 * por cena, âncora ligada, sem Estrela (a Estrela JÁ é uma folha, com fotos reais) e sem a tag [faceless] (quem a escreve não
 * quer personagem em cena). Cliente que manda o campo: ignorado (motivo registrado, nada muda).
 */
export function decidirPersonagem(args: {
  interna: boolean
  pedido: unknown
  engine: unknown
  anchorEnabled: boolean
  estrelaAtiva: boolean
  tagFaceless: boolean
}): DecisaoPersonagem {
  const pediu = pedidoDePersonagem(args.pedido)
  if (!pediu && !PERSONAGEM_PUBLIC) return { ativo: false, motivo: 'nao_pedido' }
  if (pediu && !args.interna && !PERSONAGEM_PUBLIC) return { ativo: false, motivo: 'conta_de_fora' }
  const motor = typeof args.engine === 'string' && args.engine.trim() ? args.engine.trim().toLowerCase() : 'seedance'
  if (!(PERSONAGEM_MOTORES as readonly string[]).includes(motor)) return { ativo: false, motivo: `motor_sem_folha:${motor}` }
  if (!args.anchorEnabled) return { ativo: false, motivo: 'ancora_desligada' }
  if (args.estrelaAtiva) return { ativo: false, motivo: 'estrela_ativa' }
  if (args.tagFaceless) return { ativo: false, motivo: 'tag_faceless' }
  return { ativo: true, motivo: pediu ? 'pedido_interno' : 'publico' }
}

// ═══ 1. O ELENCO (determinístico) ════════════════════════════════════════════════════════════════════════════════
export type TipoDePersonagem = 'humano' | 'animal' | 'criatura'
export interface FichaDePersonagem {
  /** Como o roteiro chama ("Dino", "Ravan") ou, sem nome, o papel ("boy", "young man"). */
  nome: string
  /** Como a cena o cita: o nome ou o substantivo-núcleo do papel ("boy"). */
  nucleo: string
  tipo: TipoDePersonagem
  /** A descrição canônica em inglês (espécie/idade/cor/roupa) — vai na folha, em toda cena e no crítico. */
  canonica: string
  origem: 'autor' | 'deterministica' | 'modelo'
  protagonista: boolean
  /** 'man' | 'woman' | null — para o pronome em continuação. */
  genero: 'man' | 'woman' | null
}

const ANIMAIS = 'bunny|rabbit|bear|fox|mouse|puppy|dog|kitten|cat|owl|turtle|elephant|lion|zebra|giraffe|penguin|duck|duckling|frog|monkey|tiger|wolf|deer|whale|dolphin|bee|butterfly|horse|pony|pig|cow|sheep|goat|chicken|hen|rooster|parrot|eagle|hawk|squirrel|hedgehog|raccoon|panda|koala|otter|seal|crab|octopus|snake|lizard|hamster|donkey|camel'
const CRIATURAS = 'dinosaur|dino|dragon|robot|unicorn|monster|ghost|demon|alien|fairy|elf|dwarf|troll|goblin|zombie|vampire|werewolf|mermaid|giant|golem|witch|wizard|genie|angel|yeti|gnome|t-rex|trex|raptor'
const PESSOAS = 'boy|girl|man|woman|kid|child|baby|toddler|teen|teenager|student|captain|soldier|knight|king|queen|prince|princess|farmer|fisherman|sailor|pilot|doctor|nurse|teacher|scientist|detective|explorer|astronaut|pirate|cowboy|monk|priest|keeper|traveler|traveller|stranger|hunter|climber|miner|engineer|chef|artist|painter|writer|singer|dancer|player|runner|mother|father|grandmother|grandfather|sister|brother|son|daughter|friend|neighbor|neighbour|villager|warrior|hero|heroine|librarian|guard|officer|driver|rider|nomad|shepherd|merchant|thief|widow|bride|groom|designer|storyteller'
const ANIMAL_RE = new RegExp(`\\b(${ANIMAIS})s?\\b`, 'i')
const CRIATURA_RE = new RegExp(`\\b(${CRIATURAS})s?\\b`, 'i')
const PESSOA_RE = new RegExp(`\\b(${PESSOAS})\\b`, 'i')
const QUALIFICADOR = '(?:sad|happy|young|little|tiny|small|big|old|elderly|teenage|brave|clever|lonely|curious|shy|kind|poor|rich|tall|short|scared|sleepy|sneaky|cheerful|grumpy|mysterious|friendly|wise|[A-Z][a-z]+)'
/** Protagonista sem nome: "a sad Indian boy", "A young man", "a little girl", "the brave fox". O 1º do roteiro. */
const SEM_NOME_RE = new RegExp(`\\b(?:a|an|the)\\s+((?:${QUALIFICADOR}\\s+){0,3}(?:${PESSOAS}|${ANIMAIS}|${CRIATURAS}))\\b`, 'i')
/** Palavras com maiúscula que NÃO são nome de personagem (início de frase, marcadores, pronomes, interjeições). */
const NAO_NOME = new Set(('the|a|an|it|its|he|she|they|we|you|i|his|her|their|our|this|that|these|those|there|here|when|then|but|and|or|so|if|as|at|in|on|of|to|for|with|from|by|one|two|three|first|next|last|now|today|tonight|tomorrow|yesterday|midnight|noon|morning|night|day|suddenly|instead|everyone|everybody|nobody|someone|something|nothing|oh|wow|hey|yes|no|okay|ok|wait|look|good|bad|hook|micro|reward|escalation|payoff|rhythm|pexels|scene|cut|intro|outro|cta|voiceover|narrator|narration|caption|title|style|camera|visual|monday|tuesday|wednesday|thursday|friday|saturday|sunday|january|february|march|april|may|june|july|august|september|october|november|december|bhai|mbak|mommy|mom|dad|daddy|sir|madam|mr|mrs|ms|dr|just|only|what|why|how|where|who|which|while|after|before|because|once|until|every|each|all|some|most|many|more|less|little|big|new|old').split('|'))
/** Um nome vira personagem quando age: sujeito de verbo ("Dino heard"), possessivo ("Ravan's face") ou fala ("Dino:"). */
const VERBO_RE = /^(?:is|was|has|had|does|did|can|could|will|would|says|said|took|ran|sat|saw|went|got|felt|came|heard|opened|stood|looked|stares?|rolls?|smiles?|cries|screams?|laughs?|turns?|walks?|runs?|finds?|found|knows|knew|wants|loves|hates|lives|lived|sees|hears|thinks|thought|feels|holds|held|takes|gives|gave|makes|made|asks|asked|answers|whispers|shouts|jumps|flies|flew|swims|hides|hid|waits|sleeps|wakes|woke|[a-z]{3,}(?:ed|s))\b/

const limpa = (s: string) => String(s ?? '').replace(/\s+/g, ' ').trim()
const escapaRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const baixa = (s: string) => s.toLowerCase().replace(/[’‘]/g, "'")

/** FNV-1a de 32 bits: o mesmo nome escolhe sempre o mesmo traço (determinístico, como lib/cinematic/elencoDaHistoria). */
function hash(texto: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < texto.length; i++) { h ^= texto.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0 }
  return h >>> 0
}
function escolhe(lista: readonly string[], semente: number, usados: Set<string>): string {
  for (let i = 0; i < lista.length; i++) { const op = lista[(semente + i) % lista.length]; if (!usados.has(op)) { usados.add(op); return op } }
  return lista[semente % lista.length]
}
const CORES = ['bright green', 'sky blue', 'warm orange', 'soft purple', 'sunny yellow', 'teal']
const BARRIGA = ['a cream belly', 'a pale yellow belly', 'a white chest patch', 'a lighter belly']
const CABELO = ['short dark hair', 'messy brown hair', 'curly black hair', 'straight sandy-blond hair', 'wavy chestnut hair', 'short reddish hair']
const ROUPA_CRIANCA = ['a red t-shirt and blue shorts', 'a yellow hoodie and dark jeans', 'a green striped shirt and khaki shorts', 'a blue jacket over a white t-shirt', 'a purple sweater and grey trousers']
const ROUPA_ADULTO = ['a dark blue jacket over a grey t-shirt', 'a brown leather jacket and dark jeans', 'a white shirt with rolled sleeves and dark trousers', 'an olive field jacket and jeans', 'a grey wool coat and a black scarf']
const ROSTO = ['round face and big expressive eyes', 'narrow face and sharp eyes', 'freckles and a small nose', 'thick eyebrows and a warm smile', 'high cheekbones and dark eyes']

const FEM_RE = /\b(?:girl|woman|queen|princess|mother|mom|grandmother|sister|daughter|heroine|witch|mermaid|fairy|bride|widow|nurse|she|her|hers|herself)\b/i
const MASC_RE = /\b(?:boy|man|king|prince|father|dad|grandfather|brother|son|hero|wizard|cowboy|monk|priest|groom|he|him|his|himself)\b/i
const CRIANCA_RE = /\b(?:boy|girl|kid|child|baby|toddler|little|young|teen|teenager|student)\b/i
const VELHO_RE = /\b(?:old|elderly|grandmother|grandfather|grandma|grandpa|veteran|senior)\b/i

function generoDe(texto: string): 'man' | 'woman' | null {
  const f = (texto.match(/\b(?:she|her|hers|herself|girl|woman|sister|daughter|mother|queen|princess)\b/gi) ?? []).length
  const m = (texto.match(/\b(?:he|him|his|himself|boy|man|brother|son|father|king|prince)\b/gi) ?? []).length
  return f > m ? 'woman' : m > f ? 'man' : null
}

/** As frases do roteiro que citam o nome (janela para espécie e pronomes). */
function frasesCom(texto: string, nome: string): string[] {
  const re = new RegExp(`(?<![\\p{L}\\p{N}])${escapaRe(nome)}(?![\\p{L}\\p{N}])`, 'iu')
  return texto.split(/(?<=[.!?…])\s+|\n+/).filter((f) => re.test(f))
}

/** As palavras coladas ao nome (12 antes, 25 depois — "little Dino", "Ravan rolls his"): é delas que saem idade e gênero do nomeado. */
function janelasDoNome(texto: string, nome: string): string {
  const re = new RegExp(`(?<![\\p{L}\\p{N}])${escapaRe(nome)}(?![\\p{L}\\p{N}])`, 'giu')
  const janelas: string[] = []
  for (const m of texto.matchAll(re)) janelas.push(texto.slice(Math.max(0, (m.index ?? 0) - 12), (m.index ?? 0) + nome.length + 25))
  return janelas.join(' ')
}

/** Tipo pelo que o roteiro diz perto do nome (e, sem pista, pelo roteiro inteiro); humano por padrão. */
function tipoDoNome(texto: string, nome: string): { tipo: TipoDePersonagem; especie: string | null } {
  const perto = frasesCom(texto, nome).join(' ')
  const nomeBaixo = nome.toLowerCase()
  // "Dino" é apelido de dinossauro; "Leo the Lion"
  const pelaForma = CRIATURA_RE.exec(nomeBaixo) ?? ANIMAL_RE.exec(nomeBaixo)
  for (const fonte of [perto, texto]) {
    const c = CRIATURA_RE.exec(fonte)
    if (c) return { tipo: 'criatura', especie: c[1].toLowerCase() === 'dino' ? 'dinosaur' : c[1].toLowerCase() }
    const a = ANIMAL_RE.exec(fonte)
    if (a) return { tipo: 'animal', especie: a[1].toLowerCase() }
    if (PESSOA_RE.test(fonte)) break
  }
  if (pelaForma) { const e = pelaForma[1].toLowerCase(); return { tipo: CRIATURA_RE.test(e) ? 'criatura' : 'animal', especie: e === 'dino' ? 'dinosaur' : e } }
  return { tipo: 'humano', especie: null }
}

/** A descrição canônica determinística de um personagem (mesmo roteiro → mesmo texto). */
function canonicaDeterministica(nome: string, tipo: TipoDePersonagem, especie: string | null, contexto: string, usados: Set<string>): string {
  const h = hash(nome.toLowerCase())
  if (tipo !== 'humano') {
    // KINEO-JUIZ-REFAZ-2810 — era o MASCOTE: `${nome}, a ${porte} ${cor} ${especieTxt} with ${barriga}, big round friendly eyes and a short tail, no clothes` — o Krishna "small and chubby soft purple demon with a cream belly" de 27/10 era literalmente este texto. Agora a anatomia da espécie (lib/cinematic/seresFieis); o fofo só quando o roteiro é de criança (a mesma pista que decidia o porte).
    const cor = escolhe(CORES, h, usados)
    void BARRIGA // KINEO-JUIZ-REFAZ-2810 — a barriga de cor fazia parte do mascote; a lista fica para o casting (lerCasting a reconhece), a ficha não a usa mais
    const infantil = CRIANCA_RE.test(contexto) || /\b(?:tiny|little|small|baby)\b/i.test(contexto) // KINEO-JUIZ-REFAZ-2810
    const corDita = new RegExp(`\\b(red|blue|green|yellow|purple|violet|orange|pink|brown|black|white|gray|grey|golden|gold|silver|teal|turquoise|lilac|crimson|scarlet|indigo|magenta)\\s+(?:[a-z-]+\\s+)?(?:${especie ? escapaRe(especie) + '|' : ''}${escapaRe(nome)})\\b`, 'i').exec(contexto)?.[1]?.toLowerCase() ?? null // KINEO-JUIZ-REFAZ-2810 — só a cor colada ao ser ("the blue dragon Mishu"), nunca a da "golden light" da frase
    return descricaoFielDoSer({ nome, tipo, especie, corDita, corSorteada: cor, pequeno: infantil, infantil }) // KINEO-JUIZ-REFAZ-2810
  }
  // idade e gênero vêm do PRÓPRIO papel ("young man", "little girl") ou, no nome, das palavras coladas a ele — nunca de
  // outra pessoa da mesma frase (o Ravan não vira menino porque "a sad Indian boy" está na frase dele)
  const papel = contexto.split(' | ')[0]
  const genero = generoDe(papel) ?? generoDe(contexto)
  const crianca = /\b(?:boy|girl|kid|child|baby|toddler|little|tiny)\b/i.test(papel)
  const adolescente = /\b(?:teen|teenager|student)\b/i.test(papel)
  const jovem = /\b(?:young|younger)\b/i.test(papel)
  const velho = VELHO_RE.test(papel)
  const idade = crianca ? 'about nine years old' : adolescente ? 'about sixteen years old' : jovem ? 'in their early twenties' : velho ? 'in their late sixties' : 'in their early thirties'
  const pessoa = genero === 'woman' ? (crianca ? 'girl' : velho ? 'elderly woman' : 'woman') : genero === 'man' ? (crianca ? 'boy' : velho ? 'elderly man' : 'man') : crianca ? 'child' : 'person'
  const cabelo = escolhe(CABELO, h, usados)
  const rosto = escolhe(ROSTO, h >>> 2, usados)
  const roupa = escolhe(crianca ? ROUPA_CRIANCA : ROUPA_ADULTO, h >>> 4, usados)
  return `${nome}, a ${pessoa} ${idade} with ${cabelo}, ${rosto}, wearing ${roupa}`
}

/** Candidatos a nome: maiúscula fora de início de frase OU com papel de sujeito/possessivo/fala. */
function nomesDoRoteiro(script: string): string[] {
  const texto = semRotulosDeSecao(script.replace(/\[[^\]]*\]/g, ' ')) // KINEO-ELENCO-MARCADOR-2910
  const contagem = new Map<string, { atua: number; total: number }>()
  const re = /(^|[^\p{L}\p{N}'’])(\p{Lu}[\p{Ll}]{2,})(?:'s|’s)?(?=($|[^\p{L}\p{N}]))/gu
  for (const m of texto.matchAll(re)) {
    const nome = m[2]
    if (NAO_NOME.has(nome.toLowerCase()) || (PALAVRAS_DE_SECAO as readonly string[]).includes(nome.toLowerCase())) continue // KINEO-ELENCO-MARCADOR-2910
    const fim = (m.index ?? 0) + m[0].length
    const depois = texto.slice(fim, fim + 40).replace(/^[\s]+/, '')
    const possessivo = /(?:'s|’s)$/.test(m[0])
    const fala = /^:/.test(depois)
    const verbo = VERBO_RE.test(depois)
    const adjetivo = new RegExp(`^(?:${PESSOAS}|${ANIMAIS}|${CRIATURAS}|effigy|village|city|street|food|dish|style|flag|border|army|empire|temple|ocean|river|forest)s?\\b`, 'i').test(depois)
    const atual = contagem.get(nome) ?? { atua: 0, total: 0 }
    atual.total += 1
    if ((possessivo || fala || verbo) && !adjetivo) atual.atua += 1
    contagem.set(nome, atual)
  }
  return [...contagem.entries()].filter(([, c]) => c.atua >= 1 && c.total >= 2).sort((a, b) => b[1].atua - a[1].atua || b[1].total - a[1].total).map(([n]) => n)
}

/**
 * O elenco determinístico do roteiro: até 2 personagens, o 1º é o protagonista. Nome com papel de sujeito/possessivo/fala
 * primeiro; senão (ou além), o protagonista sem nome ("a sad Indian boy"). A ficha do autor (deriveExplicitCharacter) vira a
 * canônica do protagonista. Roteiro sem personagem → [].
 */
export function elencoDeterministico(script: string): FichaDePersonagem[] {
  const bruto = limpa(semRotulosDeSecao(String(script ?? ''))).slice(0, 8000) // KINEO-ELENCO-MARCADOR-2910 — limpa antes de perder as quebras que delimitam seções.
  if (!bruto) return []
  // as janelas e as frases leem o texto SEM as tags [Pexels: …] (a tag "cartoon boy shock" colada ao "Ravan:" fazia o Ravan virar menino);
  // o tipo ainda lê o texto inteiro (a tag "dinosaur blanket" é a única pista de espécie do Dino)
  const semTags = limpa(bruto.replace(/\[[^\]]*\]/g, ' '))
  const usados = new Set<string>()
  const elenco: FichaDePersonagem[] = []
  for (const nome of nomesDoRoteiro(bruto)) {
    if (elenco.length >= PERSONAGEM_MAX_PERSONAGENS) break
    const { tipo, especie } = tipoDoNome(bruto, nome)
    const contexto = `${janelasDoNome(semTags, nome)} | ${frasesCom(semTags, nome).join(' ')}`
    const canonica = canonicaDeterministica(nome, tipo, especie, contexto, usados)
    elenco.push({ nome, nucleo: nome, tipo, canonica, origem: 'deterministica', protagonista: elenco.length === 0, genero: tipo === 'humano' ? generoDe(janelasDoNome(semTags, nome)) ?? generoDe(contexto) : null })
  }
  if (elenco.length < PERSONAGEM_MAX_PERSONAGENS) {
    const m = SEM_NOME_RE.exec(semTags)
    if (m) {
      const papel = limpa(m[1])
      const nucleo = papel.split(' ').pop()!.toLowerCase()
      const jaTem = elenco.some((e) => baixa(e.canonica).includes(nucleo) || e.nucleo.toLowerCase() === nucleo)
      if (!jaTem) {
        const tipo: TipoDePersonagem = CRIATURA_RE.test(nucleo) ? 'criatura' : ANIMAL_RE.test(nucleo) ? 'animal' : 'humano'
        const contexto = `${papel} | ${frasesCom(semTags, nucleo).join(' ')}`
        const genero = tipo === 'humano' ? generoDe(contexto) : null
        const det = canonicaDeterministica(`the ${papel.toLowerCase()}`, tipo, tipo === 'humano' ? null : nucleo, contexto, usados)
        const ficha: FichaDePersonagem = { nome: `the ${papel.toLowerCase()}`, nucleo, tipo, canonica: det, origem: 'deterministica', protagonista: elenco.length === 0, genero }
        // o protagonista sem nome entra na FRENTE quando aparece antes do nomeado (o Ravan vem depois do menino)
        const primeiroNomeado = elenco[0] ? semTags.search(new RegExp(`(?<![\\p{L}\\p{N}])${escapaRe(elenco[0].nome)}(?![\\p{L}\\p{N}])`, 'iu')) : -1
        if (elenco[0] && (m.index ?? 0) < primeiroNomeado) { elenco[0].protagonista = false; ficha.protagonista = true; elenco.unshift(ficha) } else elenco.push(ficha)
      }
    }
  }
  // KINEO-ELENCO-MARCADOR-2910 — "the little girl's teddy bear" inclui a menina na ficha; mantém o teto de folhas existente.
  for (const pessoa of pessoasPossessivas(semTags)) {
    if (elenco.some((f) => f.nucleo === pessoa.nucleo)) continue
    if (elenco.length >= PERSONAGEM_MAX_PERSONAGENS) break
    elenco.push({ nome: `the ${pessoa.papel}`, nucleo: pessoa.nucleo, tipo: 'humano', canonica: pessoa.descricao, origem: 'deterministica', protagonista: elenco.length === 0, genero: pessoa.genero })
  }
  const autor = deriveExplicitCharacter(bruto)
  if (autor && elenco[0]) {
    const p = elenco.find((e) => e.protagonista) ?? elenco[0]
    p.canonica = p.tipo === 'humano' || !/\b(?:man|woman|boy|girl)\b/i.test(autor) ? `${p.nome}, ${autor}` : p.canonica
    if (p.canonica.startsWith(`${p.nome}, ${autor}`)) p.origem = 'autor'
  }
  return elenco
}

// ═══ 2. O CASTING (gpt-4o-mini refina a descrição; a rede fica no chamador) ═══════════════════════════════════════
export function mensagensDoCasting(script: string, elenco: ReadonlyArray<FichaDePersonagem>): Array<{ role: 'system' | 'user'; content: string }> {
  const lista = elenco.map((e) => `- ${e.nome} (${e.tipo === 'humano' ? 'human' : e.tipo === 'animal' ? 'animal' : 'creature'}): draft "${e.canonica}"`).join('\n')
  return [
    {
      role: 'system',
      content:
        'You are the casting director of a short narrated film. For EACH listed character, write ONE canonical visual description in English (25-45 words) that an image model can reproduce identically in every scene: species or human; apparent age; body size and shape; skin/fur/scale colour; hair; eyes; ONE fixed outfit with colours (or "no clothes" for animals); one distinctive detail. ' +
        'Keep the character NAME and the species/human kind exactly as listed. Use the script only to pick what fits the story (era, culture, mood); never invent a second character, never describe the scene or the action, never use the words "reference", "photo" or "same". ' +
        'Reply ONLY with JSON: {"characters":[{"name":"<as listed>","description":"<25-45 words>"}]}',
    },
    { role: 'user', content: `SCRIPT:\n${limpa(script).slice(0, 2400)}\n\nCHARACTERS:\n${lista}` },
  ]
}

/** Lê a resposta do casting: só descrições de nomes listados, 12-70 palavras, sem termo de referência. Qualquer dúvida → a determinística fica. */
export function lerCasting(raw: string, elenco: ReadonlyArray<FichaDePersonagem>): FichaDePersonagem[] {
  let parsed: unknown
  try { parsed = JSON.parse(String(raw ?? '')) } catch { return elenco.map((e) => ({ ...e })) }
  const lista = parsed && typeof parsed === 'object' && Array.isArray((parsed as { characters?: unknown }).characters) ? ((parsed as { characters: unknown[] }).characters) : []
  return elenco.map((e) => {
    const item = lista.find((c) => c && typeof c === 'object' && typeof (c as { name?: unknown }).name === 'string' && limpa((c as { name: string }).name).toLowerCase() === e.nome.toLowerCase()) as { description?: unknown } | undefined
    const d = item && typeof item.description === 'string' ? limpa(item.description).replace(/[\s.;,]+$/, '') : ''
    const palavras = d ? d.split(' ').length : 0
    if (!d || palavras < 12 || palavras > 70 || /\b(?:reference|photo|same|scene)\b/i.test(d)) return { ...e }
    if (e.origem === 'autor') return { ...e }
    // criatura/animal descrita como gente ("a little boy with a dinosaur plush") não passa; "the size of a child" é tamanho, não espécie
    const humanoNaDescricao = /\b(?:man|woman|boy|girl|person|teen|teenager|elderly|human|lady|guy)\b/i.test(d) || (e.tipo === 'humano' && /\bchild\b/i.test(d))
    const especie = e.tipo === 'humano' ? humanoNaDescricao : new RegExp(`\\b(?:${ANIMAIS}|${CRIATURAS})s?\\b`, 'i').test(d) && !humanoNaDescricao
    if (!especie) return { ...e }
    const semNome = d.replace(new RegExp(`^${escapaRe(e.nome)}[\\s,:-]*(?:is\\s+)?`, 'i'), '')
    return { ...e, canonica: `${e.nome}, ${semNome.charAt(0).toLowerCase()}${semNome.slice(1)}`, origem: 'modelo' }
  })
}

/**
 * Uma chamada por filme (só quando a folha está ligada): refina as descrições; falhou (sem chave, prazo, HTTP, JSON) → o
 * elenco determinístico, igual. `fetchImpl` existe para o guardião offline.
 */
export async function elencoComCasting(script: string, elenco: ReadonlyArray<FichaDePersonagem>, opts?: { timeoutMs?: number; fetchImpl?: typeof fetch; apiKey?: string }): Promise<{ elenco: FichaDePersonagem[]; casting: 'modelo' | 'falhou' | 'sem_chave' | 'sem_elenco'; ms: number }> {
  const t0 = Date.now()
  if (elenco.length === 0) return { elenco: [], casting: 'sem_elenco', ms: 0 }
  const key = opts?.apiKey ?? (typeof process !== 'undefined' ? process.env.OPENAI_API_KEY : undefined)
  if (!key) return { elenco: elenco.map((e) => ({ ...e })), casting: 'sem_chave', ms: 0 }
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), opts?.timeoutMs ?? PERSONAGEM_CASTING_PRAZO_MS)
  try {
    const doFetch = opts?.fetchImpl ?? fetch
    const res = await doFetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: PERSONAGEM_CASTING_MODELO, temperature: 0, max_tokens: 400, response_format: { type: 'json_object' }, messages: mensagensDoCasting(script, elenco) }),
    })
    if (!res.ok) return { elenco: elenco.map((e) => ({ ...e })), casting: 'falhou', ms: Date.now() - t0 }
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
    const lido = lerCasting(data.choices?.[0]?.message?.content ?? '', elenco)
    return { elenco: lido, casting: lido.some((e) => e.origem === 'modelo') ? 'modelo' : 'falhou', ms: Date.now() - t0 }
  } catch {
    return { elenco: elenco.map((e) => ({ ...e })), casting: 'falhou', ms: Date.now() - t0 }
  } finally {
    clearTimeout(timer)
  }
}

// ═══ 3. A FOLHA (o prompt da imagem de referência) ═══════════════════════════════════════════════════════════════
/** O prompt da folha: corpo inteiro, de frente, pose neutra, fundo liso, no look do filme. Uma folha por personagem. */
export function promptDaFolha(ficha: FichaDePersonagem, look: Pick<StyleAnchor, 'lookPhrase'> | null | undefined): string {
  const lookPhrase = limpa(look?.lookPhrase ?? 'photorealistic, ultra-detailed')
  return (
    `Character reference sheet, exactly one character, nobody else: ${ficha.canonica}. ` +
    `Full body visible from head to feet, standing, facing the camera, neutral relaxed pose, centered, plain light grey studio background, soft even lighting, ` +
    `${lookPhrase}, sharp focus, no text, no letters, no watermark, no logo, one single frame, no split screen, no collage`
  )
}

// ═══ 4. AS CENAS que citam o personagem ═══════════════════════════════════════════════════════════════════════════
const SEM_GENTE_RE = /\b(?:no (?:people|person|humans?|human figures?|one|foreground human faces?)|without (?:people|humans?|anyone)|nobody|empty (?:scene|street|room|beach|landscape|city)|unpopulated|deserted)\b/i

function citaNaCena(visual: string, ficha: FichaDePersonagem): boolean {
  const v = baixa(visual)
  const nomeRe = new RegExp(`(?<![\\p{L}\\p{N}])${escapaRe(ficha.nome.toLowerCase().replace(/^the\s+/, ''))}(?![\\p{L}\\p{N}])`, 'u')
  if (nomeRe.test(v)) return true
  if (ficha.nucleo.toLowerCase() !== ficha.nome.toLowerCase()) {
    const nucleoRe = new RegExp(`(?<![\\p{L}\\p{N}])${escapaRe(ficha.nucleo.toLowerCase())}(?:'s)?(?![\\p{L}\\p{N}])`, 'u')
    if (nucleoRe.test(v)) return true
  }
  return false
}

/** Por cena (índice alinhado ao plano), os personagens que ela cita — nome, papel, ou pronome que continua a cena anterior. */
export function cenasComPersonagem(visuals: ReadonlyArray<string>, elenco: ReadonlyArray<FichaDePersonagem>): Array<{ indice: number; nomes: string[] }> {
  let anterior: string[] = []
  return visuals.map((visual, indice) => {
    const v = String(visual ?? '')
    if (!v.trim()) { anterior = []; return { indice, nomes: [] } }
    // quem é CITADO está na cena ("a young Indian boy … in a deserted street": o menino está lá); a negação de gente só corta o pronome em continuação
    const nomes = elenco.filter((f) => citaNaCena(v, f)).map((f) => f.nome)
    if (nomes.length === 0 && SEM_GENTE_RE.test(v)) { anterior = []; return { indice, nomes: [] } }
    if (nomes.length === 0 && anterior.length > 0) {
      // "He opens a book…" / "his face" — o pronome continua o personagem da cena anterior (só humanos com gênero conhecido ou o único do elenco)
      const ele = /\b(?:he|him|his|himself)\b/i.test(v)
      const ela = /\b(?:she|her|hers|herself)\b/i.test(v)
      for (const nome of anterior) {
        const f = elenco.find((e) => e.nome === nome)
        if (!f) continue
        if ((ele && f.genero === 'man') || (ela && f.genero === 'woman') || ((ele || ela) && elenco.length === 1 && f.tipo !== 'humano')) nomes.push(nome)
      }
    }
    anterior = nomes
    return { indice, nomes }
  })
}

// ═══ 5. O TEXTO em toda cena e o pedido ao edit ═══════════════════════════════════════════════════════════════════
/** A ficha que vai à política da estrada clássica (policy.character) — o protagonista; a mesma trilha de KINEO-SEEDANCE-FICHA. */
export function fichaDoProtagonista(elenco: ReadonlyArray<FichaDePersonagem>): string | null {
  const p = elenco.find((e) => e.protagonista) ?? elenco[0]
  return p ? p.canonica : null
}
/** Os outros personagens, no formato do elenco de KINEO-PARCEIRO-EYEBIBLE-2 (comElencoNaCena cola a ficha na cena que cita o papel). */
export function elencoSecundario(elenco: ReadonlyArray<FichaDePersonagem>): PapelDoElenco[] {
  const p = elenco.find((e) => e.protagonista) ?? elenco[0]
  return elenco.filter((e) => e !== p).map((e) => ({ papel: e.nome.toLowerCase().replace(/^the\s+/, ''), ficha: e.canonica.replace(new RegExp(`^${escapaRe(e.nome)},\\s*`, 'i'), '') }))
}

const PERSONAGEM_IDENTIDADE = 'The character(s) named above must be EXACTLY the character shown in the reference image: same species, same body shape and size, same colours, same face, same hair and same outfit. Do not copy the reference pose or background; place the character in the described scene doing the described action, framed as described.'
const PERSONAGEM_UM_QUADRO = 'One single continuous composition filling the whole frame, no split screen, no collage, no picture-in-picture, no text, no letters, no watermark, no logo.'
const PROMPT_MAX = 2400

/** O prompt do still com folha: a cena (prompt final) + quem está nela + a instrução de identidade. */
export function promptDoStillComFolha(scenePrompt: string, fichas: ReadonlyArray<FichaDePersonagem>): string {
  const cena = limpa(scenePrompt).slice(0, PROMPT_MAX - 700)
  const quem = fichas.map((f) => `${f.nome} is ${f.canonica.replace(new RegExp(`^${escapaRe(f.nome)},\\s*`, 'i'), '')}`).join('; ')
  return `${cena}\n\nCharacter in this scene: ${quem}.\n${PERSONAGEM_IDENTIDADE} ${PERSONAGEM_UM_QUADRO}`
}

/** O corpo do edit: o MESMO da Estrela (lib/estrelaDoFilme buildEstrelaEditInput), com a folha no lugar das fotos. */
export function buildPersonagemEditInput(prompt: string, folhaUrl: string, aspect: unknown): Record<string, unknown> {
  return buildEstrelaEditInput(prompt, [folhaUrl], aspect)
}

// ═══ 6. Custo e relato ════════════════════════════════════════════════════════════════════════════════════════════
export interface CustoPersonagem { folhas: number; stills: number; criticos: number; regeracoes: number; usd: number }
/** O custo extra por filme (sem o clipe): folhas FLUX + stills com folha (no lugar de stills FLUX de US$ 0,015) + crítico + regerações. */
export function custoDoPersonagemUsd(args: { folhas: number; stills: number; criticos: number; regeracoes: number }): CustoPersonagem {
  const usd = args.folhas * PERSONAGEM_FOLHA_USD + args.stills * (PERSONAGEM_STILL_USD - 0.015) + args.criticos * PERSONAGEM_CRITICO_USD + args.regeracoes * (PERSONAGEM_STILL_USD + PERSONAGEM_CRITICO_USD) + (args.folhas > 0 ? PERSONAGEM_CASTING_USD : 0)
  return { ...args, usd: Math.round(usd * 1000) / 1000 }
}

export interface RelatoPersonagem {
  version: string
  engine: string
  elenco: Array<{ nome: string; tipo: TipoDePersonagem; origem: FichaDePersonagem['origem']; palavras: number }>
  casting: string
  folhas: number
  folhas_falhadas: number
  cenas: number
  cenas_com_personagem: number
  stills_ok: number
  fallback: number
  critico: Array<{ cena: number; veredito: string; problemas: string[]; regerou: boolean; escolhida: string }>
  extra_usd: number
  ms: number
}
/** Metadado do evento cinematic_character_sheet — contagens e vereditos, nunca URL nem texto do cliente. */
export function relatoDoPersonagem(args: {
  engine: string
  elenco: ReadonlyArray<FichaDePersonagem>
  casting: string
  folhas: number
  folhasFalhadas: number
  cenas: number
  cenasComPersonagem: number
  stillsOk: number
  critico: ReadonlyArray<{ cena: number; veredito: string; problemas: ReadonlyArray<string>; regerou: boolean; escolhida: string }>
  ms: number
}): RelatoPersonagem {
  const regeracoes = args.critico.filter((c) => c.regerou).length
  const custo = custoDoPersonagemUsd({ folhas: args.folhas, stills: args.stillsOk, criticos: args.critico.length, regeracoes })
  return {
    version: PERSONAGEM_VERSAO,
    engine: args.engine,
    elenco: args.elenco.map((e) => ({ nome: e.nome, tipo: e.tipo, origem: e.origem, palavras: e.canonica.split(' ').length })),
    casting: args.casting,
    folhas: args.folhas,
    folhas_falhadas: args.folhasFalhadas,
    cenas: args.cenas,
    cenas_com_personagem: args.cenasComPersonagem,
    stills_ok: args.stillsOk,
    fallback: Math.max(0, args.cenasComPersonagem - args.stillsOk),
    critico: args.critico.map((c) => ({ cena: c.cena, veredito: c.veredito, problemas: [...c.problemas], regerou: c.regerou, escolhida: c.escolhida })),
    extra_usd: custo.usd,
    ms: Math.max(0, Math.round(args.ms)),
  }
}

/** O que o ensaio de $0 (dry_run) mostra: o elenco, as cenas com folha e a estimativa — nada é gerado. */
export function ensaioDoPersonagem(args: { engine: string; elenco: ReadonlyArray<FichaDePersonagem>; casting: string; visuals: ReadonlyArray<string>; look: Pick<StyleAnchor, 'lookPhrase'> | null | undefined }) {
  const cenas = cenasComPersonagem(args.visuals, args.elenco)
  const comPersonagem = cenas.filter((c) => c.nomes.length > 0).length
  return {
    version: PERSONAGEM_VERSAO,
    engine: args.engine,
    casting: args.casting,
    elenco: args.elenco.map((e) => ({ nome: e.nome, tipo: e.tipo, origem: e.origem, canonica: e.canonica, protagonista: e.protagonista })),
    folhas: args.elenco.map((e) => promptDaFolha(e, args.look)),
    cenas: cenas.map((c) => ({ cena: c.indice + 1, personagens: c.nomes })),
    cenas_com_personagem: comPersonagem,
    custo_estimado_usd: custoDoPersonagemUsd({ folhas: args.elenco.length, stills: Math.min(comPersonagem, PERSONAGEM_MAX_STILLS), criticos: Math.min(comPersonagem, PERSONAGEM_MAX_STILLS), regeracoes: 0 }).usd,
    custo_pior_caso_usd: custoDoPersonagemUsd({ folhas: args.elenco.length, stills: Math.min(comPersonagem, PERSONAGEM_MAX_STILLS), criticos: Math.min(comPersonagem, PERSONAGEM_MAX_STILLS), regeracoes: Math.min(comPersonagem, PERSONAGEM_MAX_STILLS) }).usd,
  }
}
