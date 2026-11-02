// ═══ KINEO-PROTAGONISTA-SEEDANCE-0111 [TRAVA 8.2 — vai do fundador 01/11 "vai personagem"] — O ELENCO SEMÂNTICO ═══
//
// O DEFEITO (renders de 01/11, conector, Seedance 1.5 de 15 s, "Use my script as is"):
//   · BRO (faaa6054): "BRO the muscular pigeon … a bright pink unicorn mane" → o elenco era só "the bright pink unicorn";
//   · Mila (93b10f01): Mila e o Skoczuś viraram "towering giant" (o gigante era a FLOR do roteiro);
//   · Max (39523e3f): Max virou "a small brown and white puppy" (o filhote que ele salva).
// Três rodadas de regex/léxico em lib/cinematic/folhaDePersonagem.ts consertaram esses três e quebraram outros reais
// ("Pigeon Forge" fazia da Sarah um pombo; "Imagine a dragon" virava o personagem "Imagine"; "Death Valley" virava conto fofo).
// Quem é personagem, o que ele é e quem é o protagonista é LEITURA DE TEXTO — não cabe em lista de palavras.
//
// O DESENHO (decisão de arquitetura de 01/11):
//   1. UMA chamada curta ao gpt-4o-mini (o mesmo modelo e o mesmo caminho HTTP do casting da folha), JSON estrito,
//      temperature 0, prazo ~4 s, 1 tentativa extra (só para erro de rede/HTTP/prazo). Devolve {protagonist, supporting (≤3), places_and_orgs}.
//   2. O CÓDIGO confere a resposta contra o texto: nome tem de estar no texto; espécie de bicho/criatura tem de estar no texto;
//      aparência só fica se as palavras dela estão no texto; lugar/empresa listado nunca vira personagem. Dúvida = descarta.
//   3. FALHA SEGURA: sem chave, erro, prazo, JSON inválido, protagonista sem nome ou que não passa na conferência →
//      `null` e a rota segue o elenco determinístico de sempre (elencoDoRoteiro), byte a byte.
//   4. Com protagonista NOMEADO válido: o elenco do pedido passa a ser o semântico (protagonista + 1 coadjuvante, o teto
//      PERSONAGEM_MAX_PERSONAGENS); quem o determinístico já acertou (mesmo nome, mesmo tipo e espécie) fica com a ficha de
//      antes; figura mítica/da tabela (origem 'mitica') nunca é trocada. A lista de nomes válidos vai à camada elencoEpoca,
//      que deixa de inserir nome que não é personagem (lugar, "Lena is gone").
// Escopo: estrada clássica (Seedance/Kling 2.5/Veo) em character_story, incluindo o filme grátis de 15 s. Hollywood/Kling 4
// não chamam (docs/calibracao/protagonista-seedance-0111.json). Módulo puro + uma função de rede com fetch injetável.
//
// REVISÃO 01/11 (rodada 5):
//   · PORTUGUÊS/ESPANHOL: a conferência é no idioma do texto ("vira-lata", "gata", "pombo"), mas a ficha vai em inglês. O modelo devolve
//     também species_en / role_en / appearance_en; o código só usa o inglês depois que a palavra original passou na conferência.
//     Antes, "Thor, a vira-lata with realistic vira-lata anatomy" e "Luna, a gata" iam ao motor.
//   · O 15 s volta a completar o elenco pelos visuais (inglês) — a fonte do pedido em PT/ES —, mas só com papel que o texto NÃO escreve:
//     palavra que o texto escreve e a leitura semântica não chamou de personagem ("unicorn" da peruca do BRO) não entra.
//   · A ficha literal do juiz (lib/cinematic/juizFicha elencoComFichaLiteral) não apaga mais a ficha semântica com lixo ("night Pip",
//     "morning Toast", "and Emma"): para quem o elenco semântico leu, o trecho só entra se traz palavra da aparência ou da espécie lida.
//
// REVISÃO 01/11 (rodada 6, revisão adversarial):
//   · APARÊNCIA: palavra inteira e na ordem do texto (era includes de pedaço: "red hat" passava por "tired"/"that", "scar" por "scared").
//   · CAMPOS _en num texto em INGLÊS: só valem se o texto também os escreve ("pigeon" → species_en "eagle" não vira "BRO, a eagle";
//     appearance_en não acrescenta roupa). Em PT/ES continuam traduzindo.
//   · ESPÉCIE: conferida fora do próprio nome ("Meet Duck, a retired boxer" não é pato) e fora dos lugares listados ("Bear Lake").
//   · TEMPO: teto total de 6 s para as 2 tentativas (era ~8 s no pior caso). Custo de log revisto para US$ 0,0005.
//   · Fora deste arquivo: elencoEpoca.mesmoPersonagem compara o nome inteiro (sobrenome/título em comum não junta "Emma Collins" e "Jack
//     Collins"); o 15 s só casa a cena pelo nome próprio com o elenco semântico (sem ele, protagonistaEmTodaCena é a base byte a byte).
import { canonicaDeterministica, PERSONAGEM_CASTING_MODELO, PERSONAGEM_MAX_PERSONAGENS, type FichaDePersonagem, type TipoDePersonagem } from '@/lib/cinematic/folhaDePersonagem'
import { descricaoDoSerPersonificado } from '@/lib/cinematic/seresFieis'
import { elencoComFichaLiteral, literalDaCanonica, type ElencoLiteral } from '@/lib/cinematic/juizFicha'

export const MARCA_ELENCO_SEMANTICO = 'KINEO-PROTAGONISTA-SEEDANCE-0111'
export const ELENCO_SEMANTICO_VERSAO = 'elenco_semantico_v3' // rodada 6: mesma pergunta ao modelo, conferência mais dura
export const ELENCO_SEMANTICO_MODELO: string = PERSONAGEM_CASTING_MODELO
export const ELENCO_SEMANTICO_PRAZO_MS = 4_000
export const ELENCO_SEMANTICO_TENTATIVAS = 2
/** Revisão 01/11 (rodada 6): teto TOTAL da leitura (as 2 tentativas juntas). Era 4 s + 4 s = ~8 s no pior caso, em série, antes do casting;
 *  agora a tentativa extra só usa o que sobra de 6 s (1ª estourou o prazo → a 2ª tem ~2 s; 1ª falhou rápido → a 2ª tem os 4 s). */
export const ELENCO_SEMANTICO_ORCAMENTO_MS = 6_000
export const ELENCO_SEMANTICO_MAX_COADJUVANTES = 3
/** Custo de log (US$): ~1,5 mil tokens só do prompt de sistema + o roteiro (até ~1 mil) de entrada e ~250 de saída no gpt-4o-mini
 *  (US$ 0,15/M entrada, US$ 0,60/M saída) ≈ US$ 0,0005. Revisão 01/11 (rodada 6): era 0,0003, contado sem o tamanho real do prompt. */
export const ELENCO_SEMANTICO_USD = 0.0005

export type KindSemantico = 'human' | 'animal' | 'creature' | 'object'
export interface PersonagemSemantico {
  /** O nome como o texto escreve ("BRO", "Captain Ahab") ou null para papel sem nome. */
  name: string | null
  /** Papel sem nome, em inglês ("stray puppy", "old fisherman"); só quando name é null. */
  role: string | null
  /** O papel como o texto escreve ("velho pescador"), conferido no texto; só quando name é null. */
  role_text: string | null
  kind: KindSemantico
  /** O substantivo em inglês do que ele é ("pigeon", "dog"); gente: o papel ou 'human'. Vai na ficha. */
  species: string | null
  /** O substantivo como o TEXTO escreve ("pombo", "vira-lata"), conferido no texto. */
  species_text: string | null
  /** As palavras do texto que dizem como ele é (no idioma do texto). */
  appearance_from_text: string
  /** A mesma aparência em inglês, só quando o texto não é inglês (senão ""). */
  appearance_en: string
  gender_if_stated: 'male' | 'female' | null
  age_if_stated: 'child' | 'teen' | 'adult' | 'elderly' | null
  /** As palavras do texto que dizem a idade ("nineteen", "de oito anos"); "" sem idade. */
  age_evidence: string
}
export interface ElencoSemantico {
  protagonist: PersonagemSemantico | null
  supporting: PersonagemSemantico[]
  places_and_orgs: string[]
}

const limpa = (s: unknown) => String(s ?? '').replace(/\s+/g, ' ').trim()
const escapaRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const semTags = (t: string) => limpa(String(t ?? '').replace(/\[[^\]]*\]/g, ' ').replace(/\*\*/g, ' '))
const semAcento = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
const TEXTO_MAX = 4000

const SISTEMA = [
  'You read the narration script of a short film and return its CAST as strict JSON. The script may be in any language (English, Portuguese, Spanish, ...).',
  'RULES:',
  '1. A character is a being that has a name or a role (the boy, the old fisherman, the stray puppy) AND acts in the story (does, says, feels or is shown doing something). A named person the story is about is a character even when they are missing, dead, absent or only described (missing-person cases, true crime, history): in "Maura Murray vanished in 2004" Maura Murray is the protagonist.',
  '2. NEVER a character: places (cities, towns, lakes, rivers, mountains, parks, streets, shops, stations) even when the place name contains an animal or creature word (Pigeon Forge, Swan Lake, Eagle Peak, Beaver Creek, Death Valley); companies, brands, apps, organizations, agencies, teams, bands; ships, planes, cars, trucks and other vehicles; titles of films, shows, ballets, books and songs; products; events; abstract ideas and metaphors; the narrator; the viewer ("you"); and imperative or opening words at the start of a sentence in any language (Imagine, Picture, Watch, Meet, Wait, Stop, Run, Never, Only, POV, OMG, Later, Finally, Meanwhile, Not, Imagina, Olha, Veja, Conheça, Imagínate, Mira, Conoce).',
  '3. An animal or creature word used as an ADJECTIVE of a thing is not a character: "a unicorn mane", "a dragon-shaped cake", "a ghost flight", "a bear hug", "a dinosaur blanket".',
  '4. A named object, food or vehicle that talks or acts like a person (Broccoli opens his eyes; the fridge replies) IS a character with kind "object". A named real person, historical figure or celebrity is kind "human".',
  '5. kind is one of "human", "animal", "creature" (fantasy, mythical, robot, alien, dinosaur, monster, ghost), "object". species is the exact noun the TEXT uses for what this character is, copied word for word from the script and never translated: an English script gives an English word ("pigeon", "golden retriever", "cat", "tiny robot", "baby elephant", "broccoli", "strawberry"); only a script written in another language gives a word of that language. For a human use the role noun the text gives ("boy", "nurse", "old man") or "human". Never guess a species: if the text never says what a named being is, it is kind "human", species "human". Any real-world animal species is kind "animal", never "creature", even in a cartoon and even when it talks, has a name, muscles or human habits (cockroach, panda, pigeon, goldfish, cat, dog); "creature" is only for beings that do not exist in nature. A named being stays human even when an animal appears near it: in "Max picks up a stray puppy" Max is a human and the puppy is a separate character.',
  '6. A pet or animal that belongs to someone ("his cat Whiskers", "a rescue horse named Thunder", "my golden retriever Luna") has that species; its owner is a different character.',
  '7. appearance_from_text: ONLY words the text itself uses to describe how THIS character LOOKS (visible physical traits: hair, clothes, colours, size, body), copied verbatim in the text\'s language, at most 15 words; "" if the text gives none. Actions, places, poses and states are NOT appearance. Examples: "A stray puppy shivers in the rain" → ""; "Ahab stands on the deck in the storm" → ""; "Skoczuś, fast asleep, snoring" → ""; "Broccoli opens his eyes" → ""; "Mila, with her turquoise hair and star-shaped backpack" → "turquoise hair and star-shaped backpack"; "BRO the muscular pigeon is bald" → "muscular, bald"; "Avocado, wearing sunglasses" → "wearing sunglasses". Never invent; never write "none".',
  '8. gender_if_stated: "male", "female" or null, only from pronouns or nouns that clearly refer to THIS character. age_if_stated: "child", "teen", "adult", "elderly" or null, and age_evidence: the exact words of the text that state that age ("a little girl", "an 18-year-old", "nineteen", "the old man", "baby elephant", "de oito anos"); if the text does not state the age, age_if_stated is null and age_evidence is "". A name alone never tells the age.',
  '9. protagonist: the character the story follows the most: the one who is the subject of the most sentences; a character introduced with "Meet X" is usually the protagonist. If the main character has no name, set name null and role to the role noun phrase as the text writes it ("old fisherman", "velho pescador"). If the script has no character at all (pure facts, places, objects that do not act), protagonist is null.',
  '10. supporting: up to 3 other characters that are PRESENT and do something in the story, the most important first, with the same fields; someone only mentioned as absent, gone, dead, remembered or talked about ("Lena is gone") is not a supporting character. For every character also answer on_screen: true if the text shows them physically present doing something in the story, false if they are only mentioned (gone, missing, remembered, talked about). places_and_orgs: every capitalized name in the text that is NOT a character (places, organizations, vehicles, titles, products).',
  '11. name is a PROPER NAME only, copied exactly as written in the text (keep its capitalization; full name if the text gives it, e.g. "Sarah Collins"). A description such as "the old wolf" or "the soldier" is not a name: put it in role and set name to null.',
  '12. ENGLISH FIELDS, always filled. For an English script they repeat the same English words (species "cat" → species_en "cat"). For a script in another language (Portuguese, Spanish, ...) species, role, appearance_from_text and age_evidence stay in that language, copied from the script, and the _en fields translate them: species_en is the plain common English noun ("pombo" → "pigeon", "vira-lata" → "mixed-breed dog", "gata" → "cat", "dragão" → "dragon", "brócolis" → "broccoli"); role_en is role in plain English ("velho pescador" → "old fisherman"), or null when role is null; appearance_en is appearance_from_text in English ("negra de olhos verdes" → "black with green eyes"), "" when appearance_from_text is "".',
  'Reply ONLY with JSON: {"protagonist":{"name":string|null,"role":string|null,"role_en":string|null,"kind":"human"|"animal"|"creature"|"object","species":string|null,"species_en":string|null,"appearance_from_text":string,"appearance_en":string,"gender_if_stated":"male"|"female"|null,"age_if_stated":"child"|"teen"|"adult"|"elderly"|null,"age_evidence":string,"on_screen":boolean}|null,"supporting":[...same shape...],"places_and_orgs":[string]}',
].join('\n')

export function mensagensDoElencoSemantico(texto: string): Array<{ role: 'system' | 'user'; content: string }> {
  return [
    { role: 'system', content: SISTEMA },
    { role: 'user', content: `SCRIPT:\n${semTags(texto).slice(0, TEXTO_MAX)}` },
  ]
}

// ═══ A conferência contra o texto (o código decide se a leitura do modelo pode entrar) ═══════════════════════════
const palavraNoTexto = (texto: string, w: string) => new RegExp(`(?<![\\p{L}\\p{N}])${escapaRe(w)}(?![\\p{L}\\p{N}])`, 'iu').test(texto)
/** "pigeon" está no texto como "pigeon"/"pigeons"; "golden retriever" pela última palavra (o núcleo). Acento não importa ("dragao" = "dragão"). */
function especieNoTexto(texto: string, especie: string): boolean {
  const nucleo = semAcento(limpa(especie)).split(' ').pop() ?? ''
  if (nucleo.length < 2) return false
  const t = semAcento(texto)
  const formas = [nucleo, `${nucleo}s`, `${nucleo}es`, nucleo.replace(/s$/, ''), nucleo.replace(/ies$/, 'y')]
  return formas.some((f) => f.length >= 2 && palavraNoTexto(t, f))
}
const frasesDe = (texto: string) => texto.split(/(?<=[.!?…])\s+|\n+/)
const tiraNome = (texto: string, nome: string, flags: string) => texto.replace(new RegExp(`(?<![\\p{L}\\p{N}])${escapaRe(nome)}(?![\\p{L}\\p{N}])`, flags), ' ')
/**
 * O nome e a espécie na mesma frase — e a espécie FORA do próprio nome. Revisão 01/11 (rodada 6): "Meet Duck, a retired boxer" achava
 * "duck" no nome do Duck e o boxeador virava pato. O nome sai da frase (na grafia exata: "Duck the duck" mantém o "duck" do papel).
 */
function mesmaFrase(texto: string, nome: string, especie: string): boolean {
  return frasesDe(texto).some((f) => palavraNoTexto(f, nome) && especieNoTexto(tiraNome(f, nome, 'gu'), especie))
}
/** O texto sem os lugares/empresas que o modelo listou: "Cara grew up in Bear Lake" não prova que alguém é urso. */
const semLugares = (texto: string, lugares: readonly string[]) => lugares.filter((l) => l.length >= 2).reduce((t, l) => tiraNome(t, l, 'giu'), texto)
/** Palavras de função que denunciam o idioma do texto (só para decidir se os campos _en podem trocar a palavra do texto). */
const FUNCAO_EN = new Set(['the', 'and', 'of', 'to', 'is', 'was', 'his', 'her', 'with', 'he', 'she', 'it', 'that', 'on', 'at', 'for', 'they', 'are', 'were', 'this', 'from', 'but', 'into'])
const FUNCAO_PT_ES = new Set(['o', 'os', 'as', 'de', 'do', 'da', 'dos', 'das', 'que', 'e', 'um', 'uma', 'com', 'nao', 'el', 'la', 'los', 'las', 'y', 'en', 'con', 'del', 'por', 'para', 'ao', 'na', 'seu', 'sua', 'su', 'pero', 'mas', 'ele', 'ela', 'muy', 'muito'])
/**
 * O texto é inglês? Revisão 01/11 (rodada 6): num roteiro em inglês os campos _en têm de repetir as palavras do texto (regra 12 do
 * prompt); se o modelo "traduz" ("pigeon" → species_en "eagle"; aparência_en inventada), o código fica com a palavra do texto.
 */
function textoEmIngles(texto: string): boolean {
  let en = 0, pt = 0
  for (const w of tokensDe(texto)) { if (FUNCAO_EN.has(w)) en++; else if (FUNCAO_PT_ES.has(w)) pt++ }
  return en >= 3 && en > pt * 2
}
/** Palavras de ligação que o modelo acrescenta ao resumir a aparência ("girl WITH a red scarf"): não contam na conferência. */
const LIGACAO = new Set(['and', 'with', 'the', 'his', 'her', 'its', 'their', 'has', 'had', 'who', 'that', 'into', 'from', 'com', 'uma', 'umas', 'uns', 'dos', 'das', 'del', 'los', 'las', 'con', 'sus', 'seu', 'sua', 'que'])
const tokensDe = (s: string) => semAcento(String(s ?? '')).split(/[^\p{L}\p{N}]+/u).filter(Boolean)
/** A mesma palavra inteira, aceitando o plural simples ("eye" = "eyes"; "boot" = "boots"). Nunca pedaço de palavra ("red" ≠ "tired"). */
const mesmaPalavra = (a: string, b: string) => a === b || `${a}s` === b || `${b}s` === a || `${a}es` === b || `${b}es` === a
/** Distância máxima (em palavras do texto) entre duas palavras seguidas da aparência: "turquoise hair and star-shaped backpack" cabe; palavras soltas em frases distantes, não. */
const APARENCIA_SALTO_MAX = 6
/**
 * A aparência só fica quando ≥ 80% das palavras de conteúdo (≥ 3 letras, fora as de ligação) estão no texto como PALAVRA INTEIRA e
 * NA MESMA ORDEM, cada uma a no máximo APARENCIA_SALTO_MAX palavras da anterior — uma sequência que o texto escreve de verdade.
 * Revisão 01/11 (rodada 6): era `texto.includes(pedaço)` — "red hat" passava por "tired, but that night" e "scar" por "scared"; a roupa
 * inventada virava ficha do autor (origem 'autor'), que vence a determinística e o casting nunca troca.
 */
function aparenciaDoTexto(texto: string, aparencia: string): string {
  const a = limpa(aparencia).replace(/^["']|["']$/g, '').slice(0, 160)
  if (!a || /^(?:none|n\/a|null|unknown)$/i.test(a)) return ''
  const palavras = tokensDe(a).filter((w) => w.length >= 3 && !LIGACAO.has(w))
  if (palavras.length === 0) return ''
  const t = tokensDe(texto)
  // a maior cadeia em ordem: melhor[i] guarda, para cada posição p do texto onde a palavra i casa, o tamanho da melhor cadeia que termina ali
  const melhor: Array<Map<number, number>> = palavras.map(() => new Map())
  let maior = 0
  palavras.forEach((w, i) => {
    t.forEach((tw, p) => {
      if (!mesmaPalavra(w, tw)) return
      let m = 1
      for (let j = 0; j < i; j++) for (const [q, v] of melhor[j]) if (q < p && p - q <= APARENCIA_SALTO_MAX + 1 && v + 1 > m) m = v + 1
      melhor[i].set(p, m)
      if (m > maior) maior = m
    })
  })
  return maior / palavras.length >= 0.8 ? a.split(' ').slice(0, 15).join(' ').replace(/[\s,;.]+$/, '') : ''
}
/** O campo em inglês: substantivo/sintagma curto só de letras latinas (≤ 4 palavras); fora disso, null (fica a palavra original). */
function inglesCurto(v: unknown, maxPalavras = 4): string | null {
  const s = limpa(v).toLowerCase().replace(/^(?:a|an|the)\s+/, '')
  if (!s || s === 'null' || s.length > 48 || !/^[a-z][a-z' -]*$/.test(s) || s.split(' ').length > maxPalavras) return null
  return s
}
/** A aparência em inglês: só quando a original passou e ela de fato traduz (difere da original); ≤ 20 palavras, sem aspas. */
function aparenciaEmIngles(v: unknown, original: string): string {
  if (!original) return ''
  const s = limpa(v).replace(/["“”]/g, '').replace(/[\s,;.]+$/, '')
  if (!s || /^(?:none|n\/a|null|unknown)$/i.test(s) || s.split(' ').length > 20 || !/^[\p{L}\p{N}' ,;-]+$/u.test(s)) return ''
  return semAcento(s) === semAcento(original) ? '' : s
}

const KINDS: readonly KindSemantico[] = ['human', 'animal', 'creature', 'object']
function lerPersonagem(bruto: unknown, texto: string, lugares: readonly string[], ingles: boolean): PersonagemSemantico | null {
  if (!bruto || typeof bruto !== 'object') return null
  const o = bruto as Record<string, unknown>
  const kind = typeof o.kind === 'string' ? (o.kind.toLowerCase() as KindSemantico) : null
  if (!kind || !KINDS.includes(kind)) return null
  const nomeBruto = typeof o.name === 'string' && limpa(o.name) && limpa(o.name).toLowerCase() !== 'null' ? limpa(o.name) : null
  // "the old wolf" no campo do nome é descrição, não nome próprio: vira papel (nome próprio começa com maiúscula e sem artigo)
  const descricaoNoNome = !!nomeBruto && (/^(?:a|an|the|o|os|as|um|uma|el|la|los|las|un|una)\s/i.test(nomeBruto) || !/^\p{Lu}/u.test(nomeBruto))
  const name = descricaoNoNome ? null : nomeBruto
  const roleBruto = descricaoNoNome ? nomeBruto : typeof o.role === 'string' && limpa(o.role) && limpa(o.role).toLowerCase() !== 'null' ? limpa(o.role) : null
  let role_text = !name && roleBruto ? roleBruto.replace(/^(?:a|an|the|o|os|as|um|uma|el|la|los|las|un|una)\s+/i, '').toLowerCase() : null
  if (!name && !role_text) return null
  if (name) {
    if (name.length > 40 || !palavraNoTexto(texto, name)) return null // nome que o texto não escreve = inventado
    if (lugares.some((l) => l.toLowerCase() === name.toLowerCase())) return null // o próprio modelo disse que é lugar/empresa
  }
  if (role_text && !especieNoTexto(texto, role_text)) {
    // o modelo às vezes traduz o papel de um texto em inglês para outra língua: vale o inglês, se É ele que o texto escreve
    const roleEnNoTexto = inglesCurto(o.role_en)
    if (!roleEnNoTexto || !especieNoTexto(texto, roleEnNoTexto)) return null
    role_text = roleEnNoTexto
  }
  // o papel em inglês só substitui o original que passou na conferência ("velho pescador" → "old fisherman"); num texto em INGLÊS, só se o
  // texto também o escreve (senão o "inglês" do modelo é troca de papel, não tradução)
  const roleEnBruto = inglesCurto(o.role_en)
  const roleEn = ingles && roleEnBruto && !especieNoTexto(texto, roleEnBruto) ? null : roleEnBruto
  const role = role_text ? (roleEn ?? role_text) : null
  const speciesBruta = typeof o.species === 'string' && limpa(o.species) ? limpa(o.species).toLowerCase() : null
  const speciesEnBruta = inglesCurto(o.species_en)
  // revisão 01/11 (rodada 6): a espécie é conferida no texto SEM os lugares que o modelo listou ("Bear Lake", "Pigeon Forge")
  const textoEspecie = semLugares(texto, lugares)
  // texto em inglês: quando o texto escreve a espécie original fora do nome, species_en só vale se o texto também o escreve ("pigeon" com
  // species_en "eagle" → fica "pigeon"; nunca "BRO, a eagle"). Espécie que só aparece NO nome ("Melancia" → "watermelon") não é troca.
  const originalForaDoNome = !!speciesBruta && especieNoTexto(name ? tiraNome(textoEspecie, name, 'giu') : textoEspecie, speciesBruta)
  const speciesEn = ingles && speciesEnBruta && originalForaDoNome && !especieNoTexto(textoEspecie, speciesEnBruta) ? null : speciesEnBruta
  // a âncora no texto: a palavra original ("pombo") ou, se o texto é inglês e o modelo traduziu o campo original ("gata" para "cat"), a inglesa
  const originalNoTexto = !!speciesBruta && especieNoTexto(textoEspecie, speciesBruta)
  const inglesNoTexto = !originalNoTexto && !!speciesEn && especieNoTexto(textoEspecie, speciesEn)
  const especieConferida = originalNoTexto || inglesNoTexto
  let species: string | null
  let species_text: string | null = originalNoTexto ? speciesBruta : inglesNoTexto ? speciesEn : null
  if (kind === 'human') species = especieConferida && species_text !== 'human' ? (speciesEn && speciesEn !== 'human' ? speciesEn : species_text) : 'human'
  else if (kind === 'object') species = especieConferida ? (speciesEn ?? species_text) : name ? name.toLowerCase() : role
  else if (!especieConferida) return null // bicho/criatura sem a espécie escrita no texto: não confiamos
  // bicho/criatura NOMEADO: a espécie tem de estar na MESMA frase que o nome ("Laika, a stray dog"; "his cat Whiskers"). A palavra estar em
  // outro ponto do texto não prova que é dele — no "Mila" em português o Skoczuś virava a "flor gigante" da frase anterior
  else if (name && !mesmaFrase(textoEspecie, name, species_text!)) return null
  else species = speciesEn ?? species_text
  if (kind === 'human' && species === 'human') species_text = null
  const g = o.gender_if_stated
  const gender = g === 'male' || g === 'female' ? g : null
  const a = o.age_if_stated
  // a idade só fica com a prova: as palavras do texto que a dizem (o modelo deu "child" ao Max sem o texto dizer)
  const prova = typeof o.age_evidence === 'string' ? limpa(o.age_evidence).replace(/^["']|["']$/g, '') : ''
  const age = (a === 'child' || a === 'teen' || a === 'adult' || a === 'elderly') && prova.length >= 3 && palavraNoTexto(texto, prova) ? a : null
  const appearance_from_text = aparenciaDoTexto(texto, typeof o.appearance_from_text === 'string' ? o.appearance_from_text : '')
  return {
    name, role, role_text, kind, species, species_text, appearance_from_text,
    // texto em inglês: a aparência do texto já é inglês — o "appearance_en" só poderia acrescentar o que o texto não diz
    appearance_en: ingles ? '' : aparenciaEmIngles(o.appearance_en, appearance_from_text),
    gender_if_stated: gender, age_if_stated: age, age_evidence: age ? prova.slice(0, 60) : '',
  }
}

/** Lê e confere a resposta. JSON inválido ou fora do formato → null (a rota segue o determinístico). */
export function lerElencoSemantico(raw: string, textoOriginal: string): ElencoSemantico | null {
  let parsed: unknown
  try { parsed = JSON.parse(String(raw ?? '')) } catch { return null }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
  const o = parsed as Record<string, unknown>
  if (!('protagonist' in o)) return null
  const texto = semTags(textoOriginal)
  const lugares = Array.isArray(o.places_and_orgs) ? o.places_and_orgs.filter((x): x is string => typeof x === 'string' && !!limpa(x)).map(limpa).slice(0, 20) : []
  if (o.protagonist !== null && (typeof o.protagonist !== 'object' || Array.isArray(o.protagonist))) return null
  const ingles = textoEmIngles(texto)
  const protagonist = o.protagonist === null ? null : lerPersonagem(o.protagonist, texto, lugares, ingles)
  if (o.protagonist !== null && !protagonist) return null // protagonista que não passa na conferência: nada do modelo entra
  const supporting = (Array.isArray(o.supporting) ? o.supporting : []).slice(0, ELENCO_SEMANTICO_MAX_COADJUVANTES)
    // coadjuvante que o próprio modelo diz que só é citado (on_screen false: "Lena is gone") não entra em cena
    .filter((s) => !(s && typeof s === 'object' && (s as { on_screen?: unknown }).on_screen === false))
    .map((s) => lerPersonagem(s, texto, lugares, ingles)).filter((s): s is PersonagemSemantico => !!s)
    .filter((s) => !protagonist || chave(s) !== chave(protagonist))
  return { protagonist, supporting, places_and_orgs: lugares }
}
const chave = (p: PersonagemSemantico) => (p.name ?? p.role ?? '').toLowerCase()

// ═══ A rede (uma chamada, 1 tentativa extra só para falha de rede/HTTP/prazo; nunca lança) ═══════════════════════
export type StatusElencoSemantico = 'ok' | 'sem_chave' | 'falhou' | 'json_invalido' | 'vazio'
export async function pedirElencoSemantico(texto: string, opts?: { timeoutMs?: number; orcamentoMs?: number; tentativas?: number; fetchImpl?: typeof fetch; apiKey?: string }): Promise<{ elenco: ElencoSemantico | null; status: StatusElencoSemantico; tentativas: number; ms: number; raw: string | null }> {
  const t0 = Date.now()
  if (!semTags(texto)) return { elenco: null, status: 'vazio', tentativas: 0, ms: 0, raw: null }
  const key = opts?.apiKey ?? (typeof process !== 'undefined' ? process.env.OPENAI_API_KEY : undefined)
  if (!key) return { elenco: null, status: 'sem_chave', tentativas: 0, ms: 0, raw: null }
  const doFetch = opts?.fetchImpl ?? fetch
  const max = Math.max(1, Math.min(3, opts?.tentativas ?? ELENCO_SEMANTICO_TENTATIVAS))
  let status: StatusElencoSemantico = 'falhou'
  let raw: string | null = null
  let n = 0
  const prazo = opts?.timeoutMs ?? ELENCO_SEMANTICO_PRAZO_MS
  const orcamento = opts?.orcamentoMs ?? Math.max(ELENCO_SEMANTICO_ORCAMENTO_MS, prazo)
  for (; n < max; n++) {
    const resta = orcamento - (Date.now() - t0)
    if (n > 0 && resta < Math.min(1_000, prazo)) break // sem tempo útil para a tentativa extra: o determinístico de sempre
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), Math.max(1, Math.min(prazo, resta)))
    try {
      const res = await doFetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        signal: ctrl.signal,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({ model: ELENCO_SEMANTICO_MODELO, temperature: 0, max_tokens: 700, response_format: { type: 'json_object' }, messages: mensagensDoElencoSemantico(texto) }),
      })
      if (!res.ok) { status = 'falhou'; continue }
      const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
      raw = data.choices?.[0]?.message?.content ?? ''
      const elenco = lerElencoSemantico(raw, texto)
      if (elenco) return { elenco, status: 'ok', tentativas: n + 1, ms: Date.now() - t0, raw }
      // resposta que chegou e foi reprovada na conferência: a temperature 0 devolveria a mesma — repetir só dobraria a espera
      status = 'json_invalido'
      n++
      break
    } catch {
      status = 'falhou'
    } finally {
      clearTimeout(timer)
    }
  }
  return { elenco: null, status, tentativas: n, ms: Date.now() - t0, raw }
}

// ═══ Do elenco semântico às fichas que o pipeline já usa ══════════════════════════════════════════════════════════
const TIPO: Record<KindSemantico, TipoDePersonagem> = { human: 'humano', animal: 'animal', creature: 'criatura', object: 'criatura' }

/** A palavra do nome que a cena mais usa ("Roland Pernicus Oznard" → "Roland"; "Captain Ahab" → "Ahab"): vira o núcleo. */
function nucleoDoNome(nome: string, texto: string): string {
  const partes = nome.split(/\s+/).filter((w) => w.replace(/[^\p{L}]/gu, '').length >= 2)
  if (partes.length <= 1) return nome
  let melhor = partes[partes.length - 1]
  let max = -1
  for (const w of partes) {
    const n = (texto.match(new RegExp(`(?<![\\p{L}\\p{N}])${escapaRe(w)}(?![\\p{L}\\p{N}])`, 'giu')) ?? []).length
    if (n > max || (n === max && w === partes[partes.length - 1])) { max = n; melhor = w }
  }
  return melhor.replace(/[^\p{L}\p{N}'-]/gu, '')
}

/** O papel sintético que alimenta o gerador determinístico (idade/gênero vêm do texto, não do sorteio). */
function papelSintetico(p: PersonagemSemantico): string {
  const f = p.gender_if_stated === 'female', m = p.gender_if_stated === 'male'
  switch (p.age_if_stated) {
    case 'child': return f ? 'girl' : m ? 'boy' : 'child'
    case 'teen': return f ? 'teen woman' : m ? 'teen man' : 'teen'
    case 'elderly': return f ? 'old woman' : m ? 'old man' : 'old'
    default: return f ? 'woman' : m ? 'man' : ''
  }
}
/** Quem é (gente com aparência do autor): a idade só como o texto a diz — sem número inventado ("nineteen" não vira "about sixteen") e,
 *  sem idade no texto, sem idade na ficha (a Mila do conto infantil não vira "a woman"). */
function quemEh(p: PersonagemSemantico): string {
  const f = p.gender_if_stated === 'female', m = p.gender_if_stated === 'male'
  const base = p.age_if_stated === 'child' ? (f ? 'a young girl' : m ? 'a young boy' : 'a young child')
    : p.age_if_stated === 'teen' ? (f ? 'a teenage girl' : m ? 'a teenage boy' : 'a teenager')
    : p.age_if_stated === 'elderly' ? (f ? 'an elderly woman' : m ? 'an elderly man' : 'an elderly person')
    : p.age_if_stated === 'adult' ? (f ? 'an adult woman' : m ? 'an adult man' : 'an adult')
    : f ? 'a female character' : m ? 'a male character' : 'a person'
  return p.age_evidence ? `${base} (age as the author wrote: "${p.age_evidence.replace(/"/g, '')}")` : base
}
const glosa = (p: PersonagemSemantico) => (p.appearance_en ? ` (in English: ${p.appearance_en})` : '')

function frasesDoNome(texto: string, nome: string): string {
  return texto.split(/(?<=[.!?…])\s+|\n+/).filter((f) => palavraNoTexto(f, nome)).join(' ')
}

function fichaDe(p: PersonagemSemantico, texto: string, protagonista: boolean, usados: Set<string>): FichaDePersonagem {
  const tipo = TIPO[p.kind]
  const nome = p.name ?? `the ${p.role}`
  // a aparência do texto só entra na ficha do PROTAGONISTA: na calibração as do protagonista eram traços ("turquoise hair", "muscular,
  // bald", "torn clothes"); nas dos coadjuvantes o modelo pôs ação ("shivers in the rain", "fast asleep") — o coadjuvante fica com a determinística
  const aparencia = protagonista ? p.appearance_from_text : ''
  if (p.kind === 'object') {
    return { nome, nucleo: p.name ? nucleoDoNome(p.name, texto) : (p.role ?? nome).split(' ').pop()!, tipo, canonica: descricaoDoSerPersonificado(nome, p.species ?? nome), origem: 'deterministica', protagonista, genero: null }
  }
  if (p.kind === 'human') {
    const papel = papelSintetico(p)
    const genero = p.gender_if_stated === 'female' ? 'woman' : p.gender_if_stated === 'male' ? 'man' : null
    const nucleo = p.name ? nucleoDoNome(p.name, texto) : (p.role ?? '').split(' ').pop() ?? nome
    if (aparencia) return { nome, nucleo, tipo, canonica: `${nome}, exactly as the author wrote: "${aparencia}"${glosa(p)}, ${quemEh(p)}`, origem: 'autor', protagonista, genero }
    // a idade do gerador é uma faixa fixa ("about sixteen years old" para todo teen): com a prova no texto, vale a prova ("diecinueve años")
    const canonica = canonicaDeterministica(nome, 'humano', null, `${papel} | `, usados)
    const comIdade = p.age_evidence ? canonica.replace(/ (?:about nine years old|about sixteen years old|in their early twenties|in their late sixties|in their early thirties)(?= with )/, ` (age as the author wrote: "${p.age_evidence.replace(/"/g, '')}")`) : canonica
    return { nome, nucleo, tipo, canonica: comIdade, origem: 'deterministica', protagonista, genero }
  }
  const especie = (p.species ?? '').toLowerCase()
  const nucleo = especie.split(' ').pop() ?? especie
  if (aparencia) return { nome, nucleo, tipo, canonica: `${nome}, a ${especie}, exactly as the author wrote: "${aparencia}"${glosa(p)}`, origem: 'autor', protagonista, genero: null }
  const contexto = `${p.age_if_stated === 'child' ? 'baby ' : ''}${especie} | ${frasesDoNome(texto, p.name ?? nucleo)}`
  return { nome, nucleo, tipo, canonica: canonicaDeterministica(nome, tipo, nucleo, contexto, usados), origem: 'deterministica', protagonista, genero: null }
}

const mesmoNome = (a: string, b: string) => a.toLowerCase().replace(/^the\s+/, '') === b.toLowerCase().replace(/^the\s+/, '')
const palavrasDe = (s: string) => semAcento(String(s ?? '')).split(/[^\p{L}\p{N}]+/u).filter((w) => w.length >= 3)

/** O que a leitura semântica sabe de cada personagem do elenco: as palavras que podem descrevê-lo (aparência + espécie/papel lidos). */
export interface LeituraDaFicha { nome: string; nomeProprio: boolean; aceita: string[] }

export interface ElencoAplicado {
  elenco: FichaDePersonagem[]
  /** Todos os nomes que o modelo leu como personagem (protagonista + até 3 coadjuvantes), para a camada elencoEpoca. */
  nomes: string[]
  protagonista: string
  naoPersonagens: string[]
  /** fichas novas (o determinístico errava) e fichas mantidas (o determinístico já acertava) */
  novas: string[]
  mantidas: string[]
  /** a guarda da ficha literal do juiz (conferirFichaLiteral) */
  leitura: LeituraDaFicha[]
}

/**
 * O elenco do pedido com o semântico. Só age com protagonista NOMEADO (onde o defeito acontece); senão null = o elenco de
 * sempre. Quem o determinístico já acertou (mesmo nome + mesmo tipo + mesma espécie) e figura mítica ficam com a ficha de antes —
 * exceto quando o protagonista tem aparência no texto e a ficha de antes não é do autor (o "red scarf" da Hope não some).
 */
export function aplicarElencoSemantico(base: ReadonlyArray<FichaDePersonagem>, sem: ElencoSemantico | null, textoOriginal: string): ElencoAplicado | null {
  if (!sem || !sem.protagonist || !sem.protagonist.name) return null
  const texto = semTags(textoOriginal)
  const todos = [sem.protagonist, ...sem.supporting]
  const usados = new Set<string>()
  const novas: string[] = []
  const mantidas: string[] = []
  const noElenco = todos.slice(0, PERSONAGEM_MAX_PERSONAGENS)
  const elenco = noElenco.map((p, i): FichaDePersonagem => {
    const nome = p.name ?? `the ${p.role}`
    const antes = base.find((f) => mesmoNome(f.nome, nome))
    const tipo = TIPO[p.kind]
    const especieBate = (f: FichaDePersonagem) => tipo === 'humano' || !p.species || f.canonica.toLowerCase().includes((p.species.split(' ').pop() ?? '').toLowerCase())
    const aparenciaPerdida = i === 0 && !!p.appearance_from_text && antes?.origem !== 'autor'
    if (antes && ((antes.origem as string) === 'mitica' || (antes.tipo === tipo && especieBate(antes) && !aparenciaPerdida))) { mantidas.push(antes.nome); return { ...antes, protagonista: i === 0 } }
    novas.push(nome)
    return fichaDe(p, texto, i === 0, usados)
  })
  const leitura = noElenco.map((p): LeituraDaFicha => ({
    nome: p.name ?? `the ${p.role}`,
    nomeProprio: !!p.name,
    aceita: [...new Set([p.appearance_from_text, p.appearance_en, p.species_text ?? '', p.kind === 'human' && p.species === 'human' ? '' : p.species ?? '', p.role ?? '', p.role_text ?? ''].flatMap(palavrasDe))],
  }))
  return {
    elenco,
    nomes: todos.map((p) => p.name ?? `the ${p.role}`),
    protagonista: elenco[0].nome,
    naoPersonagens: [...sem.places_and_orgs],
    novas,
    mantidas,
    leitura,
  }
}

/**
 * A ficha literal do juiz para quem o elenco semântico leu. O trecho "literal" só substitui a ficha quando traz alguma palavra que a
 * leitura semântica reconhece como desse personagem (aparência ou espécie/papel lidos no texto). "night Pip", "morning Toast", "and Emma",
 * "year later Nina" não trazem nenhuma: a ficha semântica fica. Figura mítica e personagem fora do elenco semântico: igual ao juiz.
 */
export function conferirFichaLiteral(lit: ElencoLiteral, antes: ReadonlyArray<FichaDePersonagem>, sem: { leitura?: ReadonlyArray<LeituraDaFicha> } | null | undefined): ElencoLiteral {
  if (!sem?.leitura?.length) return lit
  const elenco = lit.elenco.map((f) => ({ ...f }))
  const literais = [...lit.literais]
  let trocas = [...lit.trocas]
  lit.elenco.forEach((f, i) => {
    const a = antes[i]
    if (!a || a.canonica === f.canonica || (a.origem as string) === 'mitica') return
    const leitura = sem.leitura!.find((l) => mesmoNome(l.nome, a.nome))
    const literal = literalDaCanonica(f.canonica)
    if (!leitura || !literal) return
    const doNome = new Set(leitura.nomeProprio ? palavrasDe(leitura.nome) : [])
    const aceita = new Set(leitura.aceita)
    const traz = palavrasDe(literal).filter((w) => !doNome.has(w)).some((w) => aceita.has(w) || aceita.has(w.replace(/(?:es|s)$/, '')) || aceita.has(`${w}s`))
    if (traz) return
    elenco[i] = { ...a }
    const k = literais.indexOf(f.nome)
    if (k >= 0) literais.splice(k, 1)
    trocas = trocas.filter(([x, y]) => !(x === a.canonica && y === f.canonica))
  })
  return { ...lit, elenco, literais, trocas }
}

/** elencoComFichaLiteral + a conferência acima (sem elenco semântico: exatamente o juiz). */
export function fichaLiteralConferida(pedido: string, elenco: ReadonlyArray<FichaDePersonagem>, sem: { leitura?: ReadonlyArray<LeituraDaFicha> } | null | undefined): ElencoLiteral {
  return conferirFichaLiteral(elencoComFichaLiteral(pedido, elenco), elenco, sem)
}

/**
 * O 15 s completa o elenco pelos visuais (inglês) — a fonte do pedido em PT/ES ("the grandfather" de "o avô"). Com o elenco semântico:
 *   · palavra que o TEXTO escreve e a leitura semântica não chamou de personagem já foi julgada — não entra ("unicorn" da peruca do BRO);
 *   · bicho/criatura que o texto não escreve é invenção do escritor de cenas ou adjetivo traduzido ("unicorn" de "crina de unicórnio") —
 *     a leitura semântica confere toda espécie no texto, então não entra;
 *   · gente que o texto não escreve (o papel em inglês do pedido em PT/ES) entra pelas regras de sempre do 15 s.
 */
export function aceitaPapelDasCenas(textoOriginal: string): (ficha: Pick<FichaDePersonagem, 'tipo'>, chave: string) => boolean {
  const texto = semTags(textoOriginal)
  return (ficha, chave) => !!chave && ficha.tipo === 'humano' && !especieNoTexto(texto, chave)
}

/** Relato de log/evento: nomes e tipos (nunca o texto do cliente). */
export function relatoDoElencoSemantico(r: { status: StatusElencoSemantico; tentativas: number; ms: number }, aplicado: ElencoAplicado | null) {
  return {
    version: ELENCO_SEMANTICO_VERSAO,
    status: r.status,
    tentativas: r.tentativas,
    ms: Math.max(0, Math.round(r.ms)),
    aplicado: !!aplicado,
    elenco: aplicado ? aplicado.elenco.map((f) => ({ nome: f.nome, tipo: f.tipo, origem: f.origem, protagonista: f.protagonista })) : [],
    novas: aplicado?.novas ?? [],
    mantidas: aplicado?.mantidas ?? [],
  }
}
