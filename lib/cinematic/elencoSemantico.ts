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
//
// REVISÃO 01/11 (rodada 8, decisão: REDUZIR A SUPERFÍCIE). O núcleo (quem é o protagonista e qual a espécie) acertava 98,9%; as falhas
// vinham das camadas de conferência em volta do modelo (aparência colada de frases diferentes; detector de língua EN×PT/ES). Agora:
//   · o modelo decide SÓ quem é personagem, o kind e a species (e o papel de quem não tem nome). Aparência, gênero e idade NÃO são mais
//     lidos (o prompt é o MESMO da v4: medido em 01/11, tirar dele as regras de aparência/gênero/idade derrubou o núcleo — 3 erros graves
//     em 217, BRO virou criatura, Marta tomou o lugar da calopsita —, então o modelo ainda as responde e o código as ignora): a
//     aparência vem só do caminho determinístico que a base já tinha (a ficha literal do juiz, com as palavras do autor, conferida em
//     conferirFichaLiteral); gênero e idade vêm do gerador determinístico, como na base;
//   · (a troca de protagonista por contagem de frases desta rodada SAIU na rodada 9 — ver abaixo);
//   · sem detector de língua: a species aceita é a que aparece como PALAVRA INTEIRA no texto (em qualquer língua); o species_en só é usado
//     como tradução quando a palavra original está no texto; sem a palavra original no texto, nada (o papel sem nome segue a mesma regra);
//   · o 15 s segue com o protagonista em toda cena que não o cita; na dúvida (nome de lugar com a mesma grafia: "Rocky Mountains",
//     "rooftops of Paris"), a cena é forçada, como na base.
//
// REVISÃO 01/11 (rodada 9, revisão adversarial com 10 casos na API): menos lógica, não mais.
//   · SAIU a troca de protagonista por contagem de frases: o roteiro em inglês narra o protagonista por pronome ("she/he") e o coadjuvante
//     pelo nome, e o verbo "will" contava como o nome Will — Lily virava o gato Oreo, Emma virava o Liam, Jack virava o avô Will. Vale o
//     protagonista que o modelo leu (no "Seu Jorge tem uma tartaruga chamada Flecha" os dois são leitura defensável; a cena da tartaruga
//     cita "turtle" e não é forçada).
//   · gente nomeada de quem o texto não diz o que é ("Meet Emma.", "Lince tem oito anos") e que o determinístico não tem NÃO ganha ficha
//     inventada ("a person in their early thirties" no lugar do menino de oito anos dos visuais): protagonista assim = o elenco de sempre.
//   · o papel escrito no texto passa a ser lido também para quem tem nome ("Meet Lily, a young baker", "Her grandson Theo") e o gênero
//     que o modelo leu deste personagem volta (a idade não: "a young baker" vinha "child"). O papel leva idade ao gerador e faz a ficha
//     literal "grandson Theo" ser reconhecida (antes o neto virava "a girl" pelo "Her" da avó); "Grandma Rosa" volta a ser mulher.
//
// REVISÕES 01/11 (rodadas 10 e 11): a idade escrita era lida por REGEX em volta do nome (aposto, "de NOME", possessivo, "He/She is N" da
// frase seguinte, "anos de carreira"...). Cada regra nova quebrava outro caso real ("The story of Leo, a 9-year-old inventor" virava adulto;
// "de oito anos de olhos azuis" perdia a idade). SAÍRAM TODAS na rodada 12 (abaixo).
//
// REVISÃO 02/11 (rodada 12, decisão de arquitetura — o padrão que passou no Kling 4): o MODELO copia, o CÓDIGO confere.
//   · O modelo devolve, para cada personagem, age_text e role_text como TRECHO LITERAL copiado do roteiro ("a 9-year-old", "de oito
//     anos", "is six", "inventor", "um menino") ou null. A idade de outra pessoa ("grandson of a 78-year-old fisherman") é dele não ler.
//   · O código só aceita o trecho se ele existe LITERALMENTE no texto (palavra inteira) a até ~12 palavras do nome (TRECHO_MAX_DISTANCIA).
//     Aceito, ele entra na ficha como o autor escreveu: "Leo, a 9-year-old inventor, exactly as the author wrote — a boy with …".
//     Recusado ou null, fica a base (o gerador determinístico de sempre).
//   · Do trecho aceito o código só INTERPRETA: número (algarismo ou por extenso EN/PT/ES) e palavra de faixa (criança, adolescente,
//     idoso). Idade literal menor de 18 ou palavra de criança no trecho nunca recebe "early thirties": a cabeça vira "a boy/a girl/a child".
//   · O gênero continua como na rodada 10/11 (papel/nome que diz o gênero, ou o do modelo confirmado por pronome no texto).
//
// REVISÃO 02/11 (rodada 13): dois defeitos da rodada 12, sem regra nova de leitura de texto.
//   · A UNIDADE colada ao número do trecho aceito conta: "18 months old"/"dieciocho meses" eram 18 ANOS ("a man"); "10 months old" e
//     "six weeks old" eram "a child". Meses/semanas/dias → bebê (< 12 meses) ou criança pequena (< 48 meses).
//   · A ficha literal do juiz (conferirFichaLiteral) que vence a ficha com idade do trecho do autor não apaga mais a idade nem a pessoa em
//     inglês: "Arjun, little brother, 6, exactly as the author wrote — a boy; exactly as the author wrote: "little brother Arjun"" (antes
//     sobrava só "little brother Arjun"; a Valentina ficava só em espanhol).
//
// REVISÃO 02/11 (rodada 14, decisão: NÃO INTERPRETAR IDADE NEM GÊNERO). Traduzir o trecho em faixa errou feio na API: "a month old" →
// "an elderly woman" (o "old"), "6yo" → "early thirties" (o número com letra colada), "seven decades young" → "a girl", "his big sister
// Maya, 10" → "a boy". SAIU toda conversão de trecho em faixa ou gênero (idadeDoTrecho, números por extenso, palavras de faixa, unidades,
// a cabeça "a boy/a girl/an elderly woman" e a aparência do gerador colada ao trecho). Regra única:
//   · trecho do autor aceito (age_text/role_text que existem literalmente perto do nome) → a ficha é "<Nome>, <trecho>, exactly as the
//     author wrote" — nada nosso depois (fichaDoAutor). Os motores leem "a month old", "6yo" e "seven decades young" melhor que a tradução;
//   · o gênero da ficha só vem de palavra de gênero ESCRITA no trecho/nome ("sister", "Grandma", "menina", "abuela"); pronome e o
//     gender_if_stated do modelo, não;
//   · sem trecho aceito, a base, como antes.
//
// REVISÃO 02/11 (rodada 15): no caminho REAL de 15 s a rota roda o casting da folha (FILME15_ROSTO_FIXO_PUBLIC → gerarFolha →
// elencoComCastingAjuste) — passo que o guardião não rodava. A ficha do trecho do autor tinha origem 'deterministica' e o gpt-4o-mini a
// reescrevia com faixa/gênero/aparência próprios ("Sam, a seventy-two-year-old human woman"; "Bean, a nine-year-old boy"); depois o juiz
// literal ficava sozinho e a idade escrita sumia ("little brother Arjun" sem o 6; Finn 8, Wren 7, Bean 9, Pia 16). Agora a ficha do autor
// nasce com origem 'autor': o casting e o juiz não a tocam (como toda ficha do autor). SAIU a junção "autor; juiz" das rodadas 13/14
// (cabecaDoAutor): com a origem certa ela nunca acontece — e com ela saem os trechos inúteis do juiz ("door every day for Grandma June").
// Fora deste arquivo: o 15 s com elenco semântico de DUAS pessoas não força a cena que já mostra gente sem nome (filme15Elenco).
import { canonicaDeterministica, PERSONAGEM_CASTING_MODELO, PERSONAGEM_MAX_PERSONAGENS, type FichaDePersonagem, type TipoDePersonagem } from '@/lib/cinematic/folhaDePersonagem'
import { descricaoDoSerPersonificado } from '@/lib/cinematic/seresFieis'
import { elencoComFichaLiteral, literalDaCanonica, type ElencoLiteral } from '@/lib/cinematic/juizFicha'
import { mesmoPersonagem } from '@/lib/cinematic/elencoEpoca'

export const MARCA_ELENCO_SEMANTICO = 'KINEO-PROTAGONISTA-SEEDANCE-0111'
export const ELENCO_SEMANTICO_VERSAO = 'elenco_semantico_v12' // rodada 16: bicho/criatura com espécie de gente ("boys", "bebê") é recusado; protagonista bicho não apaga a pessoa da cena. rodada 15: a ficha do trecho do autor nasce com origem 'autor' (o casting do 15 s e o juiz não a reescrevem; a junção autor+juiz saiu). rodada 14: a ficha do trecho aceito é só o trecho do autor (sem faixa/pessoa/aparência nossa); gênero só de palavra escrita. rodada 12: age_text/role_text = trecho LITERAL copiado pelo modelo, aceito só se existe no texto a até ~12 palavras do nome; sem regex de idade. rodadas 10/11: idade por regex (removida). rodada 9: sem troca de protagonista por contagem; papel do nomeado + gênero lido. rodada 8: o código só usava quem, o kind e a species
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
  /** O papel em inglês ("stray puppy", "old fisherman", "inventor"); do role_en conferido. */
  role: string | null
  /** Rodada 12: o papel COMO O TEXTO ESCREVE — trecho literal conferido (nomeado: a até ~12 palavras do nome). Sem nome: o papel. */
  role_text: string | null
  kind: KindSemantico
  /** O substantivo em inglês do que ele é ("pigeon", "dog"); gente: o papel ou 'human'. Vai na ficha. */
  species: string | null
  /** O substantivo como o TEXTO escreve ("pombo", "vira-lata"), conferido no texto. */
  species_text: string | null
  /** Rodada 9: "male"/"female" dos pronomes/substantivos deste personagem (gender_if_stated), ou null. Só a ficha de gente o usa. */
  gender?: 'male' | 'female' | null
  /** Rodada 12: a idade COMO O TEXTO ESCREVE ("a 9-year-old", "de oito anos", "is six") — trecho literal a até ~12 palavras do nome, ou null. */
  age_text?: string | null
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
  '8. gender_if_stated: "male", "female" or null, only from pronouns or nouns that clearly refer to THIS character. age_text: the words of the script that state THIS character\'s age, COPIED EXACTLY, character for character, from the script and NEVER translated (same language as the script, same spelling; digits stay digits, words stay words), as short as possible: "a 10-year-old", "de cinco anos", "doce años", "is eleven", "a little boy", "teenage", "elderly"; null if the script does not state THIS character\'s age. The age of ANOTHER person written near the name is never this character\'s age: in "Nina, niece of a 70-year-old baker" Nina has age_text null and role_text "niece"; in "Ben\'s 90-year-old grandpa" the age belongs to the grandpa. Years of work or of living somewhere ("worked there for 30 years", "trabalhou 40 anos", "há dez anos") are not an age. A name alone never tells the age. role_text: the words of the script that say what THIS character is (job, family role or kind of person), COPIED EXACTLY from the script and NEVER translated (an English script gives English words), without the age, without appearance and without words about another person: "inventor", "retired sailor", "um menino", "velho pescador", "grumpy old woman"; null if the script gives none.',
  '9. protagonist: the character the story follows the most: the one who is the subject of the most sentences; a character introduced with "Meet X" is usually the protagonist. If the main character has no name, set name null and role_text to the role noun phrase as the text writes it ("old fisherman", "velho pescador"). If the script has no character at all (pure facts, places, objects that do not act), protagonist is null.',
  '10. supporting: up to 3 other characters that are PRESENT and do something in the story, the most important first, with the same fields; someone only mentioned as absent, gone, dead, remembered or talked about ("Lena is gone") is not a supporting character. For every character also answer on_screen: true if the text shows them physically present doing something in the story, false if they are only mentioned (gone, missing, remembered, talked about). places_and_orgs: every capitalized name in the text that is NOT a character (places, organizations, vehicles, titles, products).',
  '11. name is a PROPER NAME only, copied exactly as written in the text (keep its capitalization; full name if the text gives it, e.g. "Sarah Collins"). A description such as "the old wolf" or "the soldier" is not a name: put it in role_text and set name to null.',
  '12. ENGLISH FIELDS, always filled. For an English script they repeat the same English words (species "cat" → species_en "cat"). For a script in another language (Portuguese, Spanish, ...) species, role_text, appearance_from_text and age_text stay in that language, copied from the script, and the _en fields translate them: species_en is the plain common English noun ("pombo" → "pigeon", "vira-lata" → "mixed-breed dog", "gata" → "cat", "dragão" → "dragon", "brócolis" → "broccoli"); role_en is role_text in plain English ("velho pescador" → "old fisherman"), or null when role_text is null; appearance_en is appearance_from_text in English ("negra de olhos verdes" → "black with green eyes"), "" when appearance_from_text is "".',
  'Reply ONLY with JSON: {"protagonist":{"name":string|null,"role_text":string|null,"role_en":string|null,"kind":"human"|"animal"|"creature"|"object","species":string|null,"species_en":string|null,"appearance_from_text":string,"appearance_en":string,"gender_if_stated":"male"|"female"|null,"age_text":string|null,"on_screen":boolean}|null,"supporting":[...same shape...],"places_and_orgs":[string]}',
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
/** O campo em inglês: substantivo/sintagma curto só de letras latinas (≤ 4 palavras); fora disso, null (fica a palavra original). */
function inglesCurto(v: unknown, maxPalavras = 4): string | null {
  const s = limpa(v).toLowerCase().replace(/^(?:a|an|the|his|her|their|my|your|our|its)\s+/, '') // rodada 12: "her mother" → "mother" (era "the her mother")
  if (!s || s === 'null' || s.length > 48 || !/^[a-z][a-z' -]*$/.test(s) || s.split(' ').length > maxPalavras) return null
  return s
}

const KINDS: readonly KindSemantico[] = ['human', 'animal', 'creature', 'object']
/**
 * Rodada 16 (revisão da rodada 15): palavra de PESSOA nunca é espécie de bicho/criatura. "his twin boys, aged three" voltou kind "animal",
 * species "boys" (3 de 4 chamadas) e a ficha nascia "purple boy with … snout, paws and tail". Trava fixa, sem leitura nova: o núcleo da
 * species (a última palavra, sem acento) numa lista de gente em inglês/português/espanhol = a resposta DAQUELE personagem é recusada.
 */
const PALAVRAS_DE_PESSOA = new Set(('boy boys girl girls kid kids child children twin twins baby babies toddler toddlers infant infants newborn newborns '
  + 'man men woman women person persons people human humans lady ladies guy guys teen teens teenager teenagers son sons daughter daughters '
  + 'mother mothers father fathers mom mum dad brother brothers sister sisters grandma grandpa grandmother grandfather granddaughter grandson '
  + 'menino meninos menina meninas crianca criancas bebe bebes gemeo gemeos gemea gemeas homem homens mulher mulheres pessoa pessoas garoto garotos '
  + 'garota garotas moco moca filho filhos filha filhas pai pais mae maes irmao irmaos irma irmas avo avos neto netos neta netas '
  + 'nino ninos nina ninas gemelo gemelos gemela gemelas hombre hombres mujer mujeres persona personas chico chicos chica chicas hijo hijos hija hijas '
  + 'padre padres madre madres hermano hermanos hermana hermanas abuelo abuelos abuela abuelas nieto nietos nieta nietas').split(' '))
export const especieDePessoa = (w: string | null | undefined): boolean => !!w && PALAVRAS_DE_PESSOA.has(semAcento(limpa(w)).split(' ').pop() ?? '')
/** Rodada 12: o trecho diz algo além do próprio nome ("Emma" como role_text de "Meet Emma." não diz nada). */
const alemDoNome = (trecho: string, nome: string | null) => /[\p{L}\p{N}]/u.test(nome ? tiraNome(trecho, nome, 'giu') : trecho)
/**
 * Revisão 01/11 (rodada 8): o código só lê do modelo QUEM é, o kind e a species (e o papel de quem não tem nome). A regra das palavras,
 * sem detector de língua: a espécie aceita é a que aparece como PALAVRA INTEIRA no texto, em qualquer língua — a species do modelo ou, se
 * ela não está no texto, o species_en (o modelo às vezes escreve "gato" num roteiro inglês que diz "cat": vale o "cat" do texto). O
 * species_en só TRADUZ quando a palavra original está no texto ("pombo" → "pigeon"); sem nenhuma das duas no texto, nada (bicho/criatura
 * sem espécie conferida = resposta descartada → o determinístico). O papel sem nome segue a mesma regra (role / role_en).
 */
function lerPersonagem(bruto: unknown, texto: string, lugares: readonly string[]): PersonagemSemantico | null {
  if (!bruto || typeof bruto !== 'object') return null
  const o = bruto as Record<string, unknown>
  const kind = typeof o.kind === 'string' ? (o.kind.toLowerCase() as KindSemantico) : null
  if (!kind || !KINDS.includes(kind)) return null
  const nomeBruto = typeof o.name === 'string' && limpa(o.name) && limpa(o.name).toLowerCase() !== 'null' ? limpa(o.name) : null
  // "the old wolf" no campo do nome é descrição, não nome próprio: vira papel (nome próprio começa com maiúscula e sem artigo)
  const descricaoNoNome = !!nomeBruto && (/^(?:a|an|the|o|os|as|um|uma|el|la|los|las|un|una)\s/i.test(nomeBruto) || !/^\p{Lu}/u.test(nomeBruto))
  const name = descricaoNoNome ? null : nomeBruto
  // rodada 12: o papel vem em role_text (trecho literal); 'role' é o campo das respostas antigas (mocks gravados antes da rodada 12)
  const campoPapel = o.role_text !== undefined ? o.role_text : o.role
  const roleBruto = descricaoNoNome ? nomeBruto : typeof campoPapel === 'string' && limpa(campoPapel) && limpa(campoPapel).toLowerCase() !== 'null' ? limpa(campoPapel) : null
  if (!name && !roleBruto) return null
  if (name) {
    if (name.length > 40 || !palavraNoTexto(texto, name)) return null // nome que o texto não escreve = inventado
    if (lugares.some((l) => l.toLowerCase() === name.toLowerCase())) return null // o próprio modelo disse que é lugar/empresa
  }
  const roleEn = inglesCurto(o.role_en)
  let role: string | null = null
  let role_text: string | null = null
  if (!name) {
    // o papel sem nome (é ele que identifica o personagem): o original no texto (o role_en o traduz) ou, sem ele, o role_en se É ele que
    // o texto escreve; senão, nada
    // rodada 12: o papel é um sintagma curto (≤ 5 palavras) e o núcleo dele é conferido FORA dos lugares/empresas listados ("a team backed
    // by Purdue University" não é personagem: o "university" é da Purdue University)
    const semArtigo = roleBruto!.replace(/^(?:a|an|the|o|os|as|um|uma|el|la|los|las|un|una)\s+/i, '').toLowerCase()
    const textoPapel = semLugares(texto, lugares)
    if (semArtigo.split(' ').length > 5) return null
    if (especieNoTexto(textoPapel, semArtigo)) { role_text = semArtigo; role = roleEn ?? semArtigo }
    else if (roleEn && especieNoTexto(textoPapel, roleEn)) { role_text = roleEn; role = roleEn }
    else return null
  } else if (roleBruto) {
    // rodada 12: o papel de quem tem nome é TRECHO LITERAL a até ~12 palavras do nome; fora disso o personagem fica, sem papel
    // (o modelo às vezes traduz o role_text de um roteiro inglês — "neto de um pescador de 78 anos" — e repete o original no role_en: vale
    // o que o TEXTO escreve, conferido do mesmo jeito)
    // o trecho que é só o próprio nome ("Meet Emma." → role_text "Emma") não é papel
    const t = [trechoPerto(texto, roleBruto, name), typeof o.role_en === 'string' ? trechoPerto(texto, o.role_en, name) : null].find((x) => !!x && alemDoNome(x.t, name)) ?? null
    if (t) { role_text = t.t; role = roleEn && alemDoNome(roleEn, name) ? roleEn : inglesCurto(t.t, 6) }
  }
  // rodada 12: a idade é TRECHO LITERAL copiado pelo modelo, aceito só se existe no texto a até ~12 palavras do nome (ou do papel sem nome)
  const ancora = name ?? (role_text ?? '').split(' ').pop() ?? null
  const idadeAceita = typeof o.age_text === 'string' && ancora ? trechoPerto(texto, o.age_text, ancora) : null
  const age_text = idadeAceita && alemDoNome(idadeAceita.t, name) ? idadeAceita.t : null
  // o gênero que o modelo leu dos pronomes/substantivos DESTE personagem (só entra na ficha se o texto o confirmar: generoConfirmado)
  const gender = o.gender_if_stated === 'male' || o.gender_if_stated === 'female' ? o.gender_if_stated : null
  // rodada 9 (calibração na API): "Red-eyed Leo hates the rain" voltou species "red-eyed" = a própria appearance_from_text — o modelo mesmo
  // classificou a palavra como aparência, não espécie; ela não prova que o Leo é criatura (sem espécie, bicho/criatura cai no determinístico)
  const aparencia = semAcento(limpa(o.appearance_from_text))
  const naoEhAparencia = (w: string | null) => (w && aparencia && semAcento(w) === aparencia ? null : w)
  const speciesBruta = naoEhAparencia(typeof o.species === 'string' && limpa(o.species) ? limpa(o.species).toLowerCase() : null)
  const speciesEnBruta = naoEhAparencia(inglesCurto(o.species_en))
  // a espécie é conferida no texto SEM os lugares que o modelo listou ("Bear Lake", "Pigeon Forge")
  const textoEspecie = semLugares(texto, lugares)
  const temEspecie = (w: string | null): w is string => !!w && w !== 'human' && especieNoTexto(textoEspecie, w)
  const species_text_achada = temEspecie(speciesBruta) ? speciesBruta : temEspecie(speciesEnBruta) ? speciesEnBruta : null
  // a ficha vai em inglês: a palavra do texto é a original → o species_en a traduz; a palavra do texto já é o species_en → ela mesma
  // (o species_en que o texto TAMBÉM escreve, diferente da original, é outro ser da história — "BRO the pigeon fights an eagle" —, não tradução)
  const nucleoSemAcento = (w: string | null) => semAcento(String(w ?? '')).split(' ').pop()!.replace(/(?:es|s)$/, '')
  const outroSer = !!speciesEnBruta && nucleoSemAcento(speciesEnBruta) !== nucleoSemAcento(speciesBruta) && temEspecie(speciesEnBruta)
  const traduzida = species_text_achada === null ? null : species_text_achada === speciesBruta ? (outroSer ? speciesBruta : speciesEnBruta ?? speciesBruta) : speciesEnBruta
  let species: string | null
  let species_text: string | null = species_text_achada
  if (kind === 'human') species = traduzida && traduzida !== 'human' ? traduzida : 'human'
  else if (kind === 'object') species = traduzida ?? (name ? name.toLowerCase() : role)
  else if (especieDePessoa(speciesBruta) || especieDePessoa(speciesEnBruta)) return null // rodada 16: bicho/criatura com espécie de gente ("boys") = resposta recusada, fica a base
  else if (!species_text) return null // bicho/criatura sem a espécie escrita no texto: não confiamos
  // bicho/criatura NOMEADO: a espécie tem de estar na MESMA frase que o nome ("Laika, a stray dog"; "his cat Whiskers") e fora do próprio
  // nome ("Meet Duck, a retired boxer" não é pato). Em outro ponto do texto ela não prova que é dele (o Skoczuś virava a "flor gigante")
  else if (name && !mesmaFrase(textoEspecie, name, species_text)) return null
  else species = traduzida
  if (kind === 'human' && species === 'human') species_text = null
  return { name, role, role_text, kind, species, species_text, gender, age_text }
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
  const protagonist = o.protagonist === null ? null : lerPersonagem(o.protagonist, texto, lugares)
  if (o.protagonist !== null && !protagonist) return null // protagonista que não passa na conferência: nada do modelo entra
  const supporting = (Array.isArray(o.supporting) ? o.supporting : []).slice(0, ELENCO_SEMANTICO_MAX_COADJUVANTES)
    // coadjuvante que o próprio modelo diz que só é citado (on_screen false: "Lena is gone") não entra em cena
    .filter((s) => !(s && typeof s === 'object' && (s as { on_screen?: unknown }).on_screen === false))
    .map((s) => lerPersonagem(s, texto, lugares)).filter((s): s is PersonagemSemantico => !!s)
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

function frasesDoNome(texto: string, nome: string): string {
  return texto.split(/(?<=[.!?…])\s+|\n+/).filter((f) => palavraNoTexto(f, nome)).join(' ')
}
/** As palavras coladas ao nome (12 antes, 25 depois), como o elenco determinístico da base lê idade e gênero do nomeado. */
function janelasDoNome(texto: string, nome: string): string {
  const re = new RegExp(`(?<![\\p{L}\\p{N}])${escapaRe(nome)}(?![\\p{L}\\p{N}])`, 'giu')
  return [...texto.matchAll(re)].map((m) => texto.slice(Math.max(0, (m.index ?? 0) - 12), (m.index ?? 0) + nome.length + 25)).join(' ')
}

// ═══ Rodada 12: a idade e o papel são TRECHOS LITERAIS que o modelo copiou e o código conferiu ═══════════════════
// Rodadas 10/11 liam a idade por regex em volta do nome — cada regra nova quebrava outro caso real ("The story of Leo, a 9-year-old
// inventor" virava adulto). Agora o código não procura idade no texto: ele só CONFERE o trecho que o modelo copiou (existe literalmente,
// palavra inteira, a até TRECHO_MAX_DISTANCIA palavras do nome) e só INTERPRETA o trecho aceito (número e palavra de faixa).
/** Rodada 12: distância máxima, em palavras, entre o trecho literal (idade/papel) e o nome. */
export const TRECHO_MAX_DISTANCIA = 12
const TRECHO_MAX_PALAVRAS = 12
const PALAVRA_RE = /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu
export interface TrechoLiteral { t: string; ini: number; fim: number }
/**
 * O trecho que o modelo copiou, como o TEXTO o escreve (a grafia do texto, não a do modelo), se ele existe literalmente no texto (palavra
 * inteira, sem diferença de caixa) a até TRECHO_MAX_DISTANCIA palavras de uma ocorrência da âncora (o nome). Senão null.
 */
export function trechoPerto(textoOriginal: string, bruto: unknown, ancora: string | null | undefined, maxDistancia = TRECHO_MAX_DISTANCIA): TrechoLiteral | null {
  const texto = semTags(textoOriginal)
  const s = limpa(bruto).replace(/^["'“”‘’«»(\[]+/u, '').replace(/["'“”‘’«»)\].,;:!?…]+$/u, '').trim()
  if (!s || s.toLowerCase() === 'null' || s.length > 90 || s.split(' ').length > TRECHO_MAX_PALAVRAS || !/[\p{L}\p{N}]/u.test(s)) return null
  const reS = new RegExp(`(?<![\\p{L}\\p{N}])${escapaRe(s)}(?![\\p{L}\\p{N}])`, 'giu')
  const achados = [...texto.matchAll(reS)].map((m) => ({ t: m[0], ini: m.index ?? 0, fim: (m.index ?? 0) + m[0].length }))
  if (!achados.length) return null
  const a = limpa(ancora)
  if (!a) return null
  const ancoras = [...texto.matchAll(new RegExp(`(?<![\\p{L}\\p{N}])${escapaRe(a)}(?![\\p{L}\\p{N}])`, 'gu'))].map((m) => ({ ini: m.index ?? 0, fim: (m.index ?? 0) + m[0].length }))
  if (!ancoras.length) return null
  const inicios = [...texto.matchAll(PALAVRA_RE)].map((m) => m.index ?? 0)
  const antesDe = (pos: number) => inicios.filter((i) => i < pos).length // palavras que começam antes de pos
  const distancia = (x: { ini: number; fim: number }, y: { ini: number; fim: number }) => (x.ini >= y.fim ? antesDe(x.ini) - antesDe(y.fim) : y.ini >= x.fim ? antesDe(y.ini) - antesDe(x.fim) : 0)
  return achados.find((x) => ancoras.some((y) => distancia(x, y) <= maxDistancia)) ?? null
}

/**
 * Rodada 12: o trecho do AUTOR sobre esta pessoa — papel e idade aceitos, na grafia do texto. Colados no texto (≤ 3 palavras entre eles,
 * sem fim de frase no meio): o trecho contínuo ("um menino de sete anos", "a 9-year-old inventor"); separados: os dois, na ordem do texto.
 */
// KINEO-ELENCO-ATE-O-FIM-0511 — a aparência que vem colada no papel ("a gruff old man with shoulder-length gray-brown hair"): sem ela, a ficha ficava rala, a folha inventava o resto (barba branca) e o cabelo do autor sumia.
const APARENCIA_COLADA_RE = /^\s+((?:with|com|con)\s+[^.,;:!?…]{3,70})/iu
const APARENCIA_PALAVRA_RE = /(?<![\p{L}])(?:hair|beard|mustache|moustache|eyes|glasses|skin|scar|freckles|cabelos?|barba|bigode|olhos|[óo]culos|pele|cicatriz|sardas|cabello|pelo|ojos|gafas|lentes|piel)(?![\p{L}])/iu
export function aparenciaColada(texto: string, fim: number): string | null {
  const m = APARENCIA_COLADA_RE.exec(texto.slice(fim, fim + 90))
  return m && APARENCIA_PALAVRA_RE.test(m[1]) ? limpa(m[1]) : null
}
export function trechoDaPessoa(p: Pick<PersonagemSemantico, 'name' | 'role_text' | 'age_text'>, textoOriginal: string): string | null {
  const texto = semTags(textoOriginal)
  const ancora = p.name ?? (p.role_text ?? '').split(' ').pop() ?? null
  const papel = p.name && p.role_text ? trechoPerto(texto, p.role_text, ancora) : null
  const idade = p.age_text ? trechoPerto(texto, p.age_text, ancora) : null
  const fonteNome = p.name ? `(?<![\\p{L}\\p{N}])${escapaRe(p.name)}(?![\\p{L}\\p{N}])` : null
  const temNome = (x: string) => !!fonteNome && new RegExp(fonteNome, 'u').test(x)
  // o artigo colado antes do trecho vem junto ("a 9-year-old inventor", "um menino de sete anos")
  const comArtigo = (ini: number, fim: number) => { const m = /(?:^|\s)((?:a|an|um|uma|un|una)\s)$/iu.exec(texto.slice(Math.max(0, ini - 5), ini)); return texto.slice(m ? ini - m[1].length : ini, fim) }
  let literal: string | null
  if (papel && idade) {
    const [a, b] = papel.ini <= idade.ini ? [papel, idade] : [idade, papel]
    if (b.fim <= a.fim) literal = comArtigo(a.ini, a.fim) // um contém o outro
    else {
      const meio = texto.slice(a.fim, Math.max(a.fim, b.ini))
      const palavrasNoMeio = (meio.match(PALAVRA_RE) ?? []).length
      // contínuo só sem fim de frase e sem o próprio nome no meio ("Su abuelo Ramón, de 82 años" = "abuelo, de 82 años")
      literal = b.ini <= a.fim || (palavrasNoMeio <= 3 && !/[.!?…;]/u.test(meio) && !temNome(meio)) ? comArtigo(a.ini, b.fim) : `${a.t}, ${b.t}`
    }
  } else { const x = papel ?? idade; literal = x ? comArtigo(x.ini, x.fim) : null }
  if (!literal) return null
  const aparencia = aparenciaColada(texto, Math.max(papel?.fim ?? 0, idade?.fim ?? 0)) // KINEO-ELENCO-ATE-O-FIM-0511
  if (aparencia) literal = `${literal} ${aparencia}`
  // o próprio nome não se repete no trecho ("Seven-Year-Old Mia")
  if (fonteNome) literal = literal.replace(new RegExp(fonteNome, 'gu'), ' ')
  literal = limpa(literal).replace(/\s+([,;])/gu, '$1').replace(/^[,;:—–\-\s]+|[,;:—–\-\s]+$/gu, '')
    .replace(/^(A|An|Um|Uma|Un|Una)(?=\s)/u, (a) => a.toLowerCase()) // o artigo do começo de frase ("A boy named Liam") vai no meio da ficha
  return /[\p{L}\p{N}]/u.test(literal) ? literal : null
}
const PRON_F = /(?<![\p{L}])(?:she|her|hers|herself|ela|dela|nela|ella)(?![\p{L}])/iu
const PRON_M = /(?<![\p{L}])(?:he|him|his|himself|ele|dele|nele|él)(?![\p{L}])/iu
/**
 * O gênero que o modelo leu (gender_if_stated) só vale se o TEXTO o confirma: um pronome desse gênero na frase que cita a pessoa ou
 * na seguinte ("Meet Lily, whose dad is a fisherman. Every morning she waves"; "Walter feeds the gulls. One gull … waits for him").
 */
export function generoConfirmado(p: Pick<PersonagemSemantico, 'name' | 'role' | 'role_text' | 'gender'>, textoOriginal: string): 'male' | 'female' | null {
  if (p.gender !== 'male' && p.gender !== 'female') return null
  const chave = p.name ?? (p.role_text ?? p.role ?? '').split(' ').pop() ?? ''
  if (!chave) return null
  const frases = frasesDe(semTags(textoOriginal))
  const re = p.gender === 'female' ? PRON_F : PRON_M
  return frases.some((f, i) => palavraNoTexto(f, chave) && (re.test(f) || re.test(frases[i + 1] ?? ''))) ? p.gender : null
}
/** O gênero que o PAPEL escrito no texto diz ("brother", "grandma", "boy"; rodada 12: também o trecho literal em PT/ES — "menina", "avô"). */
export function generoDoPapel(papel: string | null | undefined): 'male' | 'female' | null {
  const p = String(papel ?? '').toLowerCase()
  const f = /(?<![\p{L}])(?:girl|woman|lady|grandma|grandmother|granny|mother|mom|mum|sister|daughter|granddaughter|wife|aunt|niece|queen|princess|widow|bride|dona|senhora|doña|señora|mrs|miss|madame|menina|garota|garotinha|menininha|mulher|avó|vó|vovó|mãe|filha|irmã|tia|neta|esposa|velha|velhinha|idosa|niña|niñita|chica|chiquilla|mujer|abuela|madre|hija|hermana|tía|nieta|vieja|anciana)(?![\p{L}])/u.test(p)
  const m = /(?<![\p{L}])(?:boy|man|guy|grandpa|grandfather|father|dad|brother|son|grandson|husband|uncle|nephew|king|prince|widower|groom|senhor|señor|mr|sir|menino|garoto|garotinho|menininho|homem|avô|vô|vovô|pai|filho|irmão|tio|neto|marido|velho|velhinho|idoso|seu|niño|niñito|chico|chiquillo|hombre|abuelo|padre|hijo|hermano|tío|nieto|viejo|anciano|don|dom)(?![\p{L}])/u.test(p)
  return f === m ? null : f ? 'female' : 'male'
}
/**
 * Rodada 12: o núcleo de um papel copiado do texto — as palavras antes do primeiro conector ("boy of nine" → "boy"; "grandson of a
 * 78-year-old fisherman" → "grandson"; "whose dad is a fisherman" → ""). É dele (não do papel inteiro) que saem gênero e o papel do gerador:
 * o resto da frase pode falar de outra pessoa.
 */
export function nucleoDoPapel(papel: string | null | undefined): string {
  const ws = limpa(papel).split(' ')
  const k = ws.findIndex((w) => /^(?:of|who|whose|that|which|with|and|from|de|da|do|dos|das|del|que|cujo|cuja|cuyo|cuya|com|con|e|y)$/i.test(w.replace(/[,;:]+$/, '')))
  return (k < 0 ? ws : ws.slice(0, k)).join(' ').replace(/[,;:]+$/, '')
}

/**
 * Rodada 14 (decisão 02/11: NÃO INTERPRETAR IDADE NEM GÊNERO): a ficha de quem tem papel/idade copiados do texto e conferidos é SÓ o que o
 * autor escreveu — "Zoe, 6yo, exactly as the author wrote"; "Ivy, a month old, exactly as the author wrote"; "Grandma Rose, Grandma, seven
 * decades young, exactly as the author wrote". Nenhuma faixa ("early thirties", "elderly") nem palavra de pessoa ("a man/woman/boy/girl")
 * nossa; nada da aparência do gerador (a barba/o blazer do gerador brigariam com "a month old"). Os motores leem "6yo" melhor que a tradução.
 */
export function fichaDoAutor(nome: string, literal: string): string {
  return `${nome}, ${literal}, exactly as the author wrote`
}
/**
 * Rodada 14: o gênero ESCRITO no trecho aceito — uma palavra de gênero no núcleo do papel ou da idade copiados ("big sister", "Grandma",
 * "a little girl", "menina", "abuela") ou no próprio nome que a ficha repete ("Grandma Rose"). Pronome (de qualquer frase) e o
 * gender_if_stated do modelo NÃO entram: "his big sister Maya, 10" com role_text "10" fica sem gênero, nunca "a boy" pelo "his" do Theo.
 */
function generoEscrito(p: Pick<PersonagemSemantico, 'name' | 'role_text' | 'age_text'>): 'male' | 'female' | null {
  return generoDoPapel(nucleoDoPapel(p.role_text)) ?? generoDoPapel(nucleoDoPapel(p.age_text)) ?? generoDoPapel(p.name)
}
/** O gênero que uma ficha de gente da BASE diz na cabeça (antes do " with "): só para ver se ela contradiz o texto (rodada 10). */
function generoDaCabeca(canonica: string): 'male' | 'female' | null {
  const c = ` ${canonica.split(' with ')[0].replace(/^[^,]*,\s*/, '').toLowerCase()} `
  return / (?:woman|girl|lady)\b/.test(c) ? 'female' : / (?:man|boy)\b/.test(c) ? 'male' : null
}
export interface EvidenciaEscrita { genero: 'male' | 'female' | null; /** rodada 12: o trecho do autor aceito (papel + idade), na grafia do texto */ literal: string | null }
/**
 * Com trecho do autor aceito: o gênero só da palavra escrita no trecho/nome (generoEscrito). Sem trecho (rodada 14: "fica a base,
 * exatamente como hoje"): o gênero do nome ou o do modelo confirmado por pronome na frase do nome ou na seguinte (rodada 10, Walter).
 */
function evidenciaEscrita(p: PersonagemSemantico, texto: string): EvidenciaEscrita {
  const literal = p.kind === 'human' ? trechoDaPessoa(p, texto) : null
  if (literal) return { genero: generoEscrito(p), literal }
  // (sem trecho, o papel do nomeado é null; o do personagem sem nome — o núcleo, "whose dad is…" não conta — segue como antes)
  const papel = p.species && p.species !== 'human' ? p.species : p.role
  return { genero: generoDoPapel(nucleoDoPapel(papel)) ?? generoDoPapel(nucleoDoPapel(p.role_text)) ?? generoDoPapel(p.name) ?? generoConfirmado(p, texto), literal: null }
}

/**
 * A ficha de quem o determinístico errou. Rodada 14: gente com trecho do autor aceito = fichaDoAutor (só o trecho; o gênero da ficha só da
 * palavra escrita). Sem trecho: o gerador determinístico da base (canonicaDeterministica), como antes — papel escrito (sem nome) ou o
 * gênero confirmado; sem nenhum dos dois, as janelas do nome. Bicho/criatura/objeto: como antes.
 */
function fichaDe(p: PersonagemSemantico, texto: string, protagonista: boolean, usados: Set<string>, evid?: EvidenciaEscrita): FichaDePersonagem {
  const tipo = TIPO[p.kind]
  const nome = p.name ?? `the ${p.role}`
  if (p.kind === 'object') {
    return { nome, nucleo: p.name ? nucleoDoNome(p.name, texto) : (p.role ?? nome).split(' ').pop()!, tipo, canonica: descricaoDoSerPersonificado(nome, p.species ?? nome), origem: 'deterministica', protagonista, genero: null }
  }
  if (p.kind === 'human') {
    const nucleo = p.name ? nucleoDoNome(p.name, texto) : (p.role ?? '').split(' ').pop() ?? nome
    const e = evid ?? evidenciaEscrita(p, texto)
    const generoDaFicha = e.genero === 'female' ? 'woman' : e.genero === 'male' ? 'man' : null
    // rodada 15: origem 'autor' — o casting da folha (lerCasting, que a rota roda em todo 15 s) e o juiz literal (elencoComFichaLiteral)
    // nunca reescrevem a ficha do autor (antes, 'deterministica': o casting dava "Sam, a seventy-two-year-old human woman" e o juiz apagava a idade)
    if (e.literal) return { nome, nucleo, tipo, canonica: fichaDoAutor(nome, e.literal), origem: 'autor', protagonista, genero: generoDaFicha }
    const papelBruto = p.species && p.species !== 'human' ? p.species : p.role ?? ''
    // ao gerador vai só o NÚCLEO do papel ("whose dad is a fisherman" → nada: o "dad" é de outra pessoa)
    const papelEscrito = limpa(nucleoDoPapel(papelBruto).replace(/\S*\d\S*|\S+-years?-olds?/giu, ' '))
    const pronome = e.genero === 'female' ? 'she' : e.genero === 'male' ? 'he' : ''
    const papel = papelEscrito || pronome ? `${papelEscrito} ${pronome}`.replace(/\s+/g, ' ').trim() : p.name ? janelasDoNome(texto, p.name) : ''
    const contexto = `${papel} | ${frasesDoNome(texto, p.name ?? nucleo)}`
    const canonica = canonicaDeterministica(nome, 'humano', null, contexto, usados)
    const genero = / (?:woman|girl|elderly woman) /.test(` ${canonica.split(' with ')[0]} `) ? 'woman' : / (?:man|boy|elderly man) /.test(` ${canonica.split(' with ')[0]} `) ? 'man' : null
    return { nome, nucleo, tipo, canonica, origem: 'deterministica', protagonista, genero }
  }
  const especie = (p.species ?? '').toLowerCase()
  const nucleo = especie.split(' ').pop() ?? especie
  const contexto = `${especie} | ${frasesDoNome(texto, p.name ?? nucleo)}`
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
  // rodada 9: gente nomeada de quem o texto não diz o que é (sem papel escrito: "Meet Emma.") e que o determinístico não tem
  // (mesmoPersonagem: "Collins" é a "Sarah Collins") não ganha ficha inventada ("a woman in their early thirties" no lugar da "shy girl" dos
  // visuais). Protagonista assim = o elenco de sempre (null); coadjuvante assim fica fora das fichas (o nome segue em `nomes`).
  // rodada 12: quem tem a idade ESCRITA (trecho literal aceito: "Pablo tiene nueve años", "Dona Rosa, de oitenta e dois anos") já tem o que o
  // texto diz dele: ganha a ficha com esse trecho (o Pablo deixava o filme para a avó Carmen).
  const semFicha = (p: PersonagemSemantico) => p.kind === 'human' && !!p.name && (!p.species || p.species === 'human') && !p.role && !p.age_text && !base.some((f) => mesmoPersonagem(f.nome, p.name!))
  if (semFicha(sem.protagonist)) return null
  const usados = new Set<string>()
  const novas: string[] = []
  const mantidas: string[] = []
  const noElenco = todos.filter((p) => !semFicha(p)).slice(0, PERSONAGEM_MAX_PERSONAGENS)
  const elenco = noElenco.map((p, i): FichaDePersonagem => {
    const nome = p.name ?? `the ${p.role}`
    const antes = base.find((f) => mesmoNome(f.nome, nome))
    const tipo = TIPO[p.kind]
    // rodada 10: o que o TEXTO escreve desta pessoa (gênero confirmado por pronome) vence a ficha antiga da base que o contradiz
    // ("Walter, a woman…" com "waits for him"). Rodada 12: o trecho literal aceito (papel/idade copiados do texto) que a ficha antiga não
    // traz também vence ("Riley, a woman in their early thirties" com "seven"). Ficha do autor e figura mítica ficam; sem evidência, a base.
    const evid: EvidenciaEscrita | undefined = p.kind === 'human' ? evidenciaEscrita(p, texto) : undefined
    const contradiz = (f: FichaDePersonagem) => {
      if (!evid || (f.origem as string) === 'mitica') return false
      // rodada 12: a ficha "do autor" da base (deriveExplicitCharacter, regex) que não traz NENHUM dos trechos que o modelo copiou e o código
      // conferiu é de outra pessoa ("Leo, grandson of a 78-year-old fisherman" → a base dava "Leo, a 78-year-old fisherman"): vence o trecho.
      // A que traz um deles ("Roland …, a gruff old man with shoulder-length gray-brown hair") é do autor e fica.
      if (f.origem === 'autor') return !!evid.literal && ![p.role_text, p.age_text].some((t) => !!t && f.canonica.toLowerCase().includes(t.toLowerCase()))
      const lida = generoDaCabeca(f.canonica)
      return (!!evid.genero && !!lida && lida !== evid.genero) || (!!evid.literal && !f.canonica.includes(evid.literal))
    }
    // gente com papel escrito no texto ("a boy named Tommy"): a ficha de antes só fica se diz a mesma pessoa ("a boy about nine…"), não
    // "a man in their early thirties" — revisão 01/11 (rodada 8, caso real Tommy 49b015e8). Ficha do autor fica sempre.
    const cabeca = (c: string) => c.split(' with ')[0].replace(/^[^,]*,\s*/, '')
    const especieBate = (f: FichaDePersonagem) => tipo === 'humano'
      ? !p.species || p.species === 'human' || f.origem === 'autor' || cabeca(f.canonica) === cabeca(fichaDe(p, texto, false, new Set(), evid).canonica)
      : !p.species || f.canonica.toLowerCase().includes((p.species.split(' ').pop() ?? '').toLowerCase())
    if (antes && ((antes.origem as string) === 'mitica' || (antes.tipo === tipo && especieBate(antes) && !contradiz(antes)))) { mantidas.push(antes.nome); return { ...antes, protagonista: i === 0 } }
    novas.push(nome)
    return fichaDe(p, texto, i === 0, usados, evid)
  })
  const leitura = noElenco.map((p): LeituraDaFicha => ({
    nome: p.name ?? `the ${p.role}`,
    nomeProprio: !!p.name,
    aceita: [...new Set([p.species_text ?? '', p.kind === 'human' && p.species === 'human' ? '' : p.species ?? '', p.role ?? '', p.role_text ?? ''].flatMap(palavrasDe))],
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
 * Revisão 01/11 (rodada 8): o modelo não diz mais a aparência — a aparência do autor É este trecho do juiz. Ele entra quando traz a
 * espécie/papel lido ("BRO the muscular pigeon") OU quando continua DEPOIS do nome ("Mila, with her turquoise hair and star-shaped
 * backpack": o complemento "wearing/with/in…" que o juiz só aceita depois de um conector). Só palavras ANTES do nome e sem a espécie
 * ("night Pip", "and Emma", "mischievous pup leaps and grabs Tommy" — o filhote que pegou o lanche do Tommy) não entram.
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
    // o trecho continua depois da última palavra do nome (ou do núcleo do papel): é o complemento do juiz, as palavras do autor sobre ele
    const tokens = (x: string) => semAcento(x).split(/[^\p{L}\p{N}]+/u).filter(Boolean)
    const chaves = leitura.nomeProprio ? tokens(leitura.nome) : tokens(leitura.nome).slice(-1)
    const toks = tokens(literal)
    let ult = -1
    toks.forEach((w, k) => { if (chaves.includes(w)) ult = k })
    const complemento = ult >= 0 && toks.slice(ult + 1).some((w) => w.length >= 3)
    // rodada 15: a junção "ficha do autor; trecho do juiz" das rodadas 13/14 SAIU — a ficha do trecho do autor nasce com origem 'autor'
    // (fichaDe) e o juiz não a toca, então ela nunca chega aqui
    if (traz || complemento) return
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
