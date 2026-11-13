// ═══ KINEO-FICHA-DO-PEDIDO-0911 [TRAVA 8.2 — aval permanente do fundador 01/11 (laço do revisor)] — A FICHA LÊ O PEDIDO ORIGINAL ═══
//
// O FILME DE 08/11 (grátis, 15 s, Kling 4, estrada clássica, render 0c36b949): a cliente pediu "At 3:03 AM, Mara, a young Black female
// security guard with braided hair, enters an old apartment elevator." O roteiro automático de 15 s resumiu para "At 3:03 AM, Mara enters
// an old elevator." e foi ELE que a rota entregou a todas as leituras do elenco. Com o nome nu, o gerador determinístico sorteou "a person
// in their late sixties with short dark hair … wearing a dark blue jacket", o casting só refinou o sorteio e o filme saiu com uma senhora
// branca de cabelo curto e blazer nos 8 quadros. A leitura de origem (KINEO-ORIGEM-DO-ELENCO-0311), que lê o pedido, respondeu
// "cliente_disse" — contou que as palavras da cliente estariam na ficha — e por isso também não pôs nada. As duas camadas se contradiziam.
//
// AS DUAS CAUSAS:
//   (1) a ficha literal (lib/cinematic/juizFicha) só recebia o ROTEIRO despachado; o pedido de onde ele nasceu (body.original_idea, que o
//       Studio manda quando o roteiro é exatamente o que a ideia gerou) nunca chegava a ela;
//   (2) o leitor do juiz (descricaoLiteral) lê o que vem ANTES do nome ("a tiny blue-skinned Lord Krishna") e o complemento "wearing/with…";
//       o APOSTO depois do nome ("Mara, a young … guard with braided hair, enters") ele não lê — e, no texto de um pedido, devolve lixo
//       ("revealing another Mara"). Por isso o pedido NÃO passa por ele: tem leitor próprio, estreito.
//
// O CONSERTO (puro, sem rede): para cada personagem de NOME PRÓPRIO do elenco que ainda não tem as palavras do cliente, procura no pedido
// original o aposto colado ao nome — "Nome, <artigo> <descrição>" fechado por pontuação — e o leva VERBATIM para a ficha, no mesmo formato
// da ficha literal do juiz (`Mara, exactly as the author wrote: "young Black … braided hair"`, origem 'autor'). O que vem depois (origem,
// trava de estilo, época, folha, still, cenas, crítico) já lê essa ficha: nenhuma outra camada muda.
//
// COMO O APOSTO FECHA (volta 2 do revisor — a v1 fechava com uma lista de ~100 verbos: verbo fora da lista levava a AÇÃO para a ficha, "Jake,
// a 40-year-old bearded trucker kills the hitchhiker…" virava ficha, e verbo dentro da lista jogava a descrição fora). Agora é TUDO OU NADA
// e não há lista de verbos comuns: o trecho inteiro, do artigo até a pontuação, tem de ser reconhecido como DESCRIÇÃO; qualquer palavra que
// não caiba (o verbo de um aposto sem vírgula de fechamento, outra oração, um vocativo) deixa a ficha como estava — nunca se corta no meio.
//   · o trecho é uma CABEÇA ("young Black female security guard") seguida de COMPLEMENTOS abertos por um elo de classe fechada (with,
//     wearing, in, and, dressed in · de, com, e, usando, vestindo… · con, y, vistiendo…): "with braided hair", "in a black suit";
//   · palavra de função no meio (the, of, to, who, is, her…) = não é descrição;
//   · inglês: todo verbo finito de sujeito singular termina em -s (presente), em -ed (passado regular), é um pretérito irregular (classe
//     fechada da língua, listada com os particípios) ou é auxiliar/modal (palavra de função). Palavra com essa cara, ou em -ing, depois da 1ª palavra
//     de um segmento só passa se for de um vocabulário CONHECIDO de descrição (hair, eyes, scrubs, bearded…) ou se vier antes do
//     substantivo conhecido que ela qualifica ("long flowing hair", "tall hooded man") — o verbo de um aposto sem vírgula vem DEPOIS dele;
//   · português/espanhol (artigo ou qualquer palavra da língua no trecho): verbo e adjetivo têm a mesma cara ("senhora negra" × "senhora
//     prepara"), então depois da 1ª palavra de cada segmento SÓ entra vocabulário conhecido (cor, idade, porte, cabelo, roupa);
//   · no fim, o trecho tem de descrever um SER: gente (palavra de pessoa, gênero, idade, cabelo/pele/olhos/barba ou o que veste) ou a
//     espécie da ficha (bicho/criatura); 2 a 28 palavras; sem citar outro personagem do elenco; "another/outra Mara" é o duplo, não ela.
// Os vocabulários de descrição são listas do que ENTRA: o que falta neles faz a ficha ficar como estava. As duas listas do que SAI são
// classes fechadas da língua (as palavras de função e os verbos irregulares do inglês).
// LIMITE CONHECIDO (texto que o leitor lê como nome, não como ação): verbo que também é nome de roupa ou de traço no plural, depois de um
// substantivo sem "a/an" e seguido de pontuação ("… with her dog pants, exhausted" entra como "dog pants"); e, dentro de um complemento,
// passado regular seguido de substantivo conhecido sem artigo ("with a comb brushed hair").
// Fica como estava: pedido ausente (roteiro colado pelo cliente, ideia solta — o próprio texto já é lido pelas camadas de sempre), nome nu,
// aposto sem pontuação de fechamento, ficha que já é do autor (toda ficha literal é), figura conhecida/mítica (a iconografia da casa),
// personagem sem nome próprio.
// Guardião: scripts/test-ficha-do-pedido-0911.mjs (o pedido e o roteiro REAIS da Mara + controles + os casos do revisor + mutantes).
import type { FichaDePersonagem } from '@/lib/cinematic/folhaDePersonagem'
import { canonicaLiteral, figuraConhecidaJuiz, literalDaCanonica, type ElencoLiteral } from '@/lib/cinematic/juizFicha'
import { figuraConhecida } from '@/lib/cinematic/personagemAjuste'
import { especieDePessoa } from '@/lib/cinematic/elencoSemantico'

export const MARCA_FICHA_DO_PEDIDO = 'KINEO-FICHA-DO-PEDIDO-0911'
export const FICHA_DO_PEDIDO_VERSAO = 'ficha_do_pedido_0911_v2'
/** Quanto do pedido é lido (o mesmo teto da leitura de origem, lib/cinematic/origemDoElenco textoDaOrigem). */
export const FICHA_DO_PEDIDO_MAX_CHARS = 2500
export const APOSTO_MIN_PALAVRAS = 2
export const APOSTO_MAX_PALAVRAS = 28
/** Tamanho de um segmento: a cabeça ("young Black female security guard") e cada complemento depois do elo e do artigo ("long curly red hair"). */
export const CABECA_MAX_PALAVRAS = 8
export const COMPLEMENTO_MAX_PALAVRAS = 5

const escapaRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const palavraRe = (w: string, flags = 'u') => new RegExp(`(?<![\\p{L}\\p{N}-])${escapaRe(w)}(?![\\p{L}\\p{N}-])`, flags)
const inteira = (alternativas: string) => new RegExp(`^(?:${alternativas})$`, 'iu')

/** O pedido como o cliente escreveu: sem as pistas de busca, com as quebras de linha (elas fecham a frase). '' = não há pedido original. */
export function textoDoPedidoOriginal(ideiaOriginal: unknown): string {
  if (typeof ideiaOriginal !== 'string') return ''
  return ideiaOriginal.replace(/\[[^\]]*\]/g, ' ').replace(/\r\n?/g, '\n').replace(/[^\S\n]+/g, ' ').slice(0, FICHA_DO_PEDIDO_MAX_CHARS).trim()
}

/** "Nome, <artigo> <trecho>" até a primeira pontuação (vírgula, travessão, fim de frase ou de linha). Grupo 1 = artigo, 2 = trecho, 3 = a pontuação. */
const APOSTO_RE = /^, (a|an|the|um|uma|o|un|una|el|la) ([^,.;:!?…\n()"“”«»—–]{3,200}?) ?([,.;:!?…\n—–]|$)/iu
/** Depois da vírgula que fecha o aposto: "and/or/e/y/ou" abre uma lista ("Mara, a guard, and her dog") — aí não se sabe quem é quem. */
const LISTA_RE = /^,\s*(?:and|or|e|y|ou|o)\s/iu
/** "another Mara, a pale version…" descreve o duplo, não a personagem. */
const DUPLO_RE = /(?<![\p{L}\p{N}])(?:another|other|second|outr[oa]|otr[oa]|segund[oa])\s+$/iu

// ── vocabulário do que ENTRA numa descrição (cada palavra do trecho é testada inteira) ──
/** Elo que abre um complemento. Classe fechada. */
const ELO_RE = inteira('with|wearing|in|and|de|com|con|e|y|usando|vestindo|vistiendo|llevando')
const ELO_CONJUNCAO_RE = inteira('and|e|y')
/** "dressed in …", "vestida de …": só valem como elo colados à preposição ("the nurse dressed a wound" é ação). */
const VESTIDO_RE = inteira('dressed|vestid[oa]')
const VESTIDO_PREP_RE = inteira('in|de|com|con')
/** Elo que só se usa para o que alguém VESTE — prova de que o trecho descreve gente. */
const ELO_DE_ROUPA_RE = inteira('wearing|usando|vestindo|vistiendo|llevando')
/** Artigo/possessivo que pode abrir um complemento ("with A red beard", "in HIS late twenties", "de UM casaco"). */
const DETERMINANTE_RE = inteira('a|an|the|his|her|their|its|o|os|um|uma|seu|sua|seus|suas|el|la|los|las|un|una|su|sus')
/** Palavra de função do inglês (preposição, conjunção, pronome, auxiliar/modal): dentro do trecho, não é descrição. Classe fechada. */
const FUNCAO_RE = inteira('of|to|at|on|by|for|from|into|onto|over|under|behind|beside|besides|near|through|across|around|about|against|between|without|within|toward|towards|upon|up|down|out|off|past|after|before|during|since|until|inside|outside|beneath|below|above|atop|amid|among|along|alongside|beyond|like|as|but|or|nor|so|yet|while|when|where|if|because|although|though|then|than|who|whom|whose|which|that|what|she|he|it|they|we|you|him|them|me|us|i|is|was|are|were|be|been|being|am|has|had|have|does|did|do|can|could|will|would|shall|should|may|might|must|not|no|never|just|now|also|there|here|this|these|those')
/** Adjetivo de gente: vale em qualquer lugar e prova que o trecho descreve uma pessoa. */
const GENTE_ADJ_RE = inteira('female|male|\\d{1,3}-?years?-?old|\\d{1,3}yo|(?:[\\p{L}\\d]+-)+(?:haired|eyed|skinned|bearded|old|aged)|bearded|bald|feminin[oa]|masculin[oa]|careca|calv[oa]')
/** Traço de gente (cabelo, olhos, pele, barba, idade): vale dentro de um complemento e prova que o trecho descreve uma pessoa. */
const GENTE_NOME_RE = inteira('hair|braids?|dreadlocks|beard|moustache|mustache|eyes|skin|freckles|teens|twenties|thirties|forties|fifties|sixties|seventies|eighties|nineties|(?:(?:early|mid|late)-)?\\d0s|cabelos?|tranças|barba|bigode|olhos|pele|anos|cabellos?|trenzas|bigote|ojos|piel|años')
/** O que se veste ou se traz no corpo: vale dentro de um complemento (sozinho não prova gente: "a coat rack"). */
const NO_CORPO_RE = inteira('coats?|jackets?|dress(?:es)?|shirts?|t-shirts?|suits?|uniforms?|scrubs|hats?|caps?|jeans|sweaters?|hoodies?|scarf|scarves|gowns?|robes?|cloaks?|armou?r|boots|glasses|sunglasses|blazers?|overcoats?|skirts?|vests?|helmets?|aprons?|kimonos?|tunics?|trousers|pants|shorts|sneakers|shoes|gloves|ties?|turbans?|hijabs?|veils?|masks?|hoods?|capes?|overalls|tuxedos?|collars?|eyebrows|cheeks|lips|shoulders|curls|dimples|wrinkles|scars?|tattoos?|piercings|earrings?|sideburns|bangs|pigtails|ponytails?|locs|dreads|cheekbones|lashes|eyelashes|muscles|hands|arms|legs|clothes|clothing|sandals|socks|necklaces?|bracelets?|rings?|beads|suspenders|headphones|casacos?|jaquetas?|vestidos?|camisas?|camisetas?|ternos?|uniformes?|chapéus?|bonés?|suéter(?:es)?|moletom|cachecol|botas|óculos|saias?|coletes?|avental|calças?|túnicas?|capas?|mantos?|abrigos?|chaquetas?|trajes?|sombreros?|gorras?|bufandas?|gafas|faldas?|chalecos?|delantal|pantalones')
/** Cor, idade, porte e origem em português/espanhol (o adjetivo vem depois do substantivo: "senhora negra", "cabelo branco", "pescador mexicano"). */
const COR_E_PORTE_RE = inteira('negr[oa]s?|branc[oa]s?|blanc[oa]s?|pret[oa]s?|pard[oa]s?|loir[oa]s?|lour[oa]s?|rubi[oa]s?|ruiv[oa]s?|pelirroj[oa]s?|moren[oa]s?|grisalh[oa]s?|canos[oa]s?|castanh[oa]s?|castañ[oa]s?|azul|azuis|azules|verdes?|vermelh[oa]s?|roj[oa]s?|amarel[oa]s?|amarill[oa]s?|cinza|gris|grises|marrom|marrón|jovem|joven|velh[oa]s?|viej[oa]s?|idos[oa]s?|ancian[oa]s?|alt[oa]s?|magr[oa]s?|delgad[oa]s?|gord[oa]s?|cachead[oa]s?|rizad[oa]s?|lis[oa]s?|cresp[oa]s?|curt[oa]s?|long[oa]s?|comprid[oa]s?|brasileir[oa]s?|mexican[oa]s?|american[oa]s?|african[oa]s?|asiátic[oa]s?|latin[oa]s?|indígenas?|argentin[oa]s?|colombian[oa]s?|peruan[oa]s?|chilen[oa]s?|cuban[oa]s?|italian[oa]s?|indian[oa]s?|japones[ae]s?|chines[ae]s?|portugues[ae]s?|frances[ae]s?|ingles[ae]s?|español(?:a|as|es)?|espanh(?:ol|ola|olas|óis)')
/** Pessoa, no singular, em inglês (as palavras de pessoa vêm de especieDePessoa; as demais são plural ou de outra língua). */
const PESSOA_EN_RE = inteira('boy|girl|kid|child|twin|baby|toddler|infant|newborn|man|woman|person|human|lady|guy|teen|teenager|son|daughter|mother|father|mom|mum|dad|brother|sister|grandma|grandpa|grandmother|grandfather|granddaughter|grandson')
/** Pessoa, no plural, em inglês: na cabeça de um aposto pede verbo sem -s ("the men run…") — não é descrição de UM personagem. */
const PESSOAS_EN_RE = inteira('boys|girls|kids|children|twins|babies|toddlers|infants|newborns|men|women|persons|people|humans|ladies|guys|teens|teenagers|sons|daughters|mothers|fathers|brothers|sisters')
/** Palavra que só existe em português/espanhol: o trecho é lido pelo modo dessas línguas. */
const PT_ES_RE = inteira('de|com|con|e|y|que|para|por|em|en|na|nos|nas|da|dos|das|del|ao|se|um|uma|un|una|el|la|los|las|os|su|sua|seu|usando|vestindo|vestid[oa]|vistiendo|llevando|feminin[oa]|masculin[oa]|careca|calv[oa]|cabelos?|barba|bigode|olhos|pele|anos|cabellos?|trenzas|bigote|ojos|piel')
/** Pretérito e particípio irregulares do inglês — classe fechada da língua (os regulares terminam em -ed; o presente, em -s). */
const VERBO_IRREGULAR_RE = inteira('abode|arose|arisen|ate|eaten|awoke|awoken|bade|beat|beaten|became|befell|began|begun|beheld|bent|bet|bid|bit|bitten|bled|blew|blown|bore|borne|bought|bound|bred|broadcast|broke|broken|brought|built|burnt|burst|came|cast|caught|chose|chosen|clung|cost|crept|cut|dealt|done|dove|drank|drawn|dreamt|drew|driven|drove|drunk|dug|dwelt|fallen|fed|fell|felt|fit|fled|flew|flown|flung|forbade|forbidden|forecast|forgave|forgiven|forgot|forgotten|forsaken|forsook|fought|found|froze|frozen|gave|given|gone|got|gotten|grew|ground|grown|heard|held|hid|hidden|hit|hung|hurt|kept|knelt|knew|knit|known|laid|lain|lay|leant|leapt|learnt|led|left|lent|let|lit|lost|made|meant|met|mistaken|mistook|misunderstood|overcame|overdid|overtaken|overthrew|overtook|paid|pled|put|quit|ran|rang|read|rid|ridden|risen|rode|rose|rung|said|sang|sank|sat|saw|seen|sent|set|shaken|shed|shod|shone|shook|shot|shown|shrank|shrunk|shut|slain|slept|slew|slid|slit|slung|smelt|smote|snuck|sold|sought|spat|sped|spelt|spent|spilt|split|spoilt|spoke|spoken|sprang|spread|sprung|spun|stank|stole|stolen|stood|stricken|strode|strove|struck|strung|stuck|stung|sung|sunk|swam|swept|swollen|swore|sworn|swum|swung|taken|taught|thought|threw|thrown|thrust|told|took|tore|torn|trod|trodden|understood|undid|undone|upheld|upset|wed|went|wept|withdrawn|withdrew|withheld|withstood|woke|woken|won|wore|worn|wound|wove|woven|written|wrote|wrung')

const numero = (t: string) => /^\d+$/.test(t)
const pessoa = (t: string) => especieDePessoa(t.replace(/[^\p{L}]/gu, ''))
/** Cor/porte/origem só em minúscula: "Lisa", "Alta", "Branca" com maiúscula no meio da frase são nomes. */
const corOuPorte = (t: string) => t === t.toLowerCase() && COR_E_PORTE_RE.test(t)
/** Plural ou 3ª pessoa do presente: termina em -s (mas não em -ss/-us: "actress", "genius"). */
const terminaEmS = (t: string) => t.length >= 3 && /s$/iu.test(t) && !/(?:ss|us)$/iu.test(t)
/** A cara de um verbo do inglês com sujeito singular (finito, particípio ou -ing solto). Composto com hífen em -ed é adjetivo ("middle-aged"). */
const caraDeVerbo = (t: string) => terminaEmS(t) || (t.length >= 4 && /ed$/iu.test(t) && !t.includes('-')) || (t.length >= 5 && /ing$/iu.test(t)) || VERBO_IRREGULAR_RE.test(t)
const ptEs = (t: string) => /[áàâãéêíóôõúüçñ]/iu.test(t) || PT_ES_RE.test(t) || corOuPorte(t) || (pessoa(t) && !PESSOA_EN_RE.test(t) && !PESSOAS_EN_RE.test(t))

/**
 * Um segmento da descrição (a cabeça ou um complemento, já sem o elo e o artigo) só tem palavra de descrição?
 * `livre` = inglês: palavra desconhecida passa se não tiver cara de verbo. Fora dele (português/espanhol), depois da 1ª só entra vocabulário.
 * `pedeConhecido` = o complemento tem de trazer um substantivo conhecido: o de "in" (idade ou roupa — "in the lobby", "in pain" não são
 * aparência), o de "and/e/y" sem artigo ("… and screams") e o de "and/e/y" colado à cabeça ("a bald man and a dog" são dois).
 * `semArtigo` = aberto por "and/e/y" sem artigo: em português/espanhol nem a 1ª palavra é livre ("… e morre").
 */
function segmentoDescreve(palavras: ReadonlyArray<string>, o: { cabeca: boolean; livre: boolean; pedeConhecido: boolean; semArtigo: boolean; artigoSingular?: boolean }): boolean {
  if (palavras.length === 0 || palavras.length > (o.cabeca ? CABECA_MAX_PALAVRAS : COMPLEMENTO_MAX_PALAVRAS)) return false
  if (palavras.some((t) => ELO_RE.test(t) || DETERMINANTE_RE.test(t) || FUNCAO_RE.test(t))) return false
  // o substantivo conhecido do segmento: na cabeça, a pessoa no singular; no complemento, o traço ou o que se veste
  const conhecido = (t: string) => (o.cabeca ? pessoa(t) && (!o.livre || PESSOA_EN_RE.test(t)) : GENTE_NOME_RE.test(t) || NO_CORPO_RE.test(t))
  if (o.cabeca && o.livre && palavras.some((t) => PESSOAS_EN_RE.test(t))) return false // "the men run…": plural pede verbo sem -s
  const nucleo = palavras.findIndex(conhecido) // o 1º: o verbo de um aposto sem vírgula vem DEPOIS dele ("hair drives…", "woman runs…")
  if (o.pedeConhecido && nucleo < 0) return false
  if (o.livre && o.artigoSingular && nucleo >= 1 && terminaEmS(palavras[nucleo])) return false // "with a robe dresses…": depois de "a/an + substantivo", o -s é o verbo
  for (let i = 0; i < palavras.length; i++) {
    const t = palavras[i]
    if (numero(t) || GENTE_ADJ_RE.test(t)) continue
    if (conhecido(t) && !(o.livre && i > nucleo && terminaEmS(t))) continue // depois do 1º substantivo conhecido, outro em -s pode ser o verbo ("… hair dresses, then leaves")
    if (!o.livre) { if (i === 0 && !o.semArtigo) continue; if (corOuPorte(t)) continue; return false }
    if (i === 0) continue // a 1ª palavra depois do artigo ou do elo não é o verbo
    if (i < nucleo) { if (terminaEmS(t)) return false; continue } // qualifica o substantivo conhecido: "long flowing hair", "old worn coat", "tall hooded man"
    if (!o.cabeca && nucleo >= 0) return false // num complemento, depois do substantivo conhecido só outro conhecido ("… her dog dresses quickly" não entra)
    if (caraDeVerbo(t)) return false
  }
  return true
}

/**
 * O trecho inteiro é uma DESCRIÇÃO (cabeça + complementos) de um ser? Tudo ou nada: uma palavra fora do lugar e a resposta é não.
 * `artigo` = o artigo que abriu o aposto; `ficha` diz que ser se espera (gente, ou a espécie do bicho/criatura).
 */
export function trechoDescreve(trecho: string, artigo: string, ficha: Pick<FichaDePersonagem, 'nome' | 'nucleo' | 'tipo'>): boolean {
  const palavras = trecho.split(' ').filter(Boolean)
  if (palavras.length < APOSTO_MIN_PALAVRAS || palavras.length > APOSTO_MAX_PALAVRAS) return false
  const livre = /^(?:a|an|the)$/iu.test(artigo) && !palavras.some(ptEs)
  if (livre && /^the$/iu.test(artigo) && terminaEmS(palavras[0])) return false // "the lights flicker…": sujeito plural, verbo sem -s
  let i = 0
  let veste = false
  const segmento = () => { const ini = i; while (i < palavras.length && !ELO_RE.test(palavras[i]) && !(VESTIDO_RE.test(palavras[i]) && VESTIDO_PREP_RE.test(palavras[i + 1] ?? ''))) i++; return palavras.slice(ini, i) }
  if (!segmentoDescreve(segmento(), { cabeca: true, livre, pedeConhecido: false, semArtigo: false })) return false
  for (let primeiro = true; i < palavras.length; primeiro = false) {
    // o elo: um só, ou a conjunção seguida de outro ("and with", "and wearing"), ou "dressed in"/"vestida de"
    let conjuncao = false
    let pedeConhecido = false
    if (ELO_CONJUNCAO_RE.test(palavras[i])) { conjuncao = true; i++ }
    if (VESTIDO_RE.test(palavras[i] ?? '') && VESTIDO_PREP_RE.test(palavras[i + 1] ?? '')) { veste = true; conjuncao = false; i += 2 }
    else if (ELO_RE.test(palavras[i] ?? '') && !ELO_CONJUNCAO_RE.test(palavras[i])) { if (ELO_DE_ROUPA_RE.test(palavras[i])) veste = true; pedeConhecido = /^in$/iu.test(palavras[i]); conjuncao = false; i++ }
    else if (!conjuncao) return false
    const comArtigo = DETERMINANTE_RE.test(palavras[i] ?? '')
    const artigoSingular = comArtigo && /^an?$/iu.test(palavras[i])
    if (comArtigo) i++
    if (!segmentoDescreve(segmento(), { cabeca: false, livre, pedeConhecido: pedeConhecido || (conjuncao && (primeiro || !comArtigo)), semArtigo: conjuncao && !comArtigo, artigoSingular })) return false
  }
  if (ficha.tipo === 'humano') return veste || palavras.some((t) => pessoa(t) || GENTE_ADJ_RE.test(t) || GENTE_NOME_RE.test(t))
  const nucleo = String(ficha.nucleo ?? '').trim()
  return !!nucleo && nucleo.toLowerCase() !== String(ficha.nome ?? '').trim().toLowerCase() && palavraRe(nucleo, 'iu').test(trecho)
}

const nomeProprio = (nome: string) => /^\p{Lu}[\p{L}'’.-]*(?: \p{Lu}[\p{L}'’.-]*){0,3}$/u.test(nome)

/**
 * As palavras do cliente sobre ESTE personagem no pedido original: o aposto colado ao nome próprio ("Mara, a young Black female security
 * guard with braided hair, enters…" → "young Black female security guard with braided hair"). null = o pedido não descreve este nome assim
 * (nome nu, aposto sem pontuação de fechamento, outra oração, lista, trecho sem ser nenhum) — a ficha fica como está. `outros` = os demais
 * nomes do elenco. Determinístico.
 */
export function apostoDoPedido(pedido: string, ficha: Pick<FichaDePersonagem, 'nome' | 'nucleo' | 'tipo'>, outros: ReadonlyArray<string> = []): string | null {
  const nome = String(ficha.nome ?? '').trim()
  if (!pedido || !nomeProprio(nome)) return null
  for (const m of pedido.matchAll(palavraRe(nome, 'gu'))) {
    const ini = m.index ?? 0
    const fim = ini + m[0].length
    if (DUPLO_RE.test(pedido.slice(Math.max(0, ini - 12), ini))) continue
    const a = APOSTO_RE.exec(pedido.slice(fim, fim + 240))
    if (!a) continue
    const trecho = a[2].trim()
    if (a[3] === ',' && LISTA_RE.test(pedido.slice(fim + a[0].length - 1, fim + a[0].length + 8))) continue
    if (!trechoDescreve(trecho, a[1], ficha)) continue
    if (outros.some((o) => o && o !== nome && nomeProprio(o) && palavraRe(o).test(trecho))) continue
    return trecho
  }
  return null
}

// ═══ KINEO-APARENCIA-DO-PEDIDO-1311 (peça 4) — "a tiny adorable fluffy orange kitten named Milo" ═══════════════════════════════════════
// O pedido do Milo (982a6aeb) descreve o bicho ANTES do nome, ligado por "named/called" — não é aposto, e a ficha ficava com a frase do
// nosso roteiro. Mesma régua do aposto, tudo ou nada: o trecho entre o artigo e "named/called <Nome>", dentro de uma frase, tem de ser
// DESCRIÇÃO (trechoDescreve: para bicho/criatura, com a espécie da ficha). Sem isso, nada muda. Liga com elencoComFichaDoPedido(…, { aparencia1311 }).
const nomeadoRe = (nome: string) => new RegExp(`(?<![\\p{L}\\p{N}])(an?|the)\\s+([^.,;:!?()\\n"“”]{2,160}?)\\s+(?:named|called)\\s+${escapaRe(nome)}(?![\\p{L}\\p{N}-])`, 'giu')
/** As palavras do cliente sobre ESTE personagem na forma "<artigo> <descrição> named/called <Nome>"; null = o pedido não o descreve assim. */
export function nomeadoNoPedido(pedido: string, ficha: Pick<FichaDePersonagem, 'nome' | 'nucleo' | 'tipo'>, outros: ReadonlyArray<string> = []): string | null {
  const nome = String(ficha.nome ?? '').trim()
  if (!pedido || !nomeProprio(nome)) return null
  for (const m of pedido.matchAll(nomeadoRe(nome))) {
    const trecho = m[2].replace(/\s+/g, ' ').trim()
    // bicho/criatura cujo núcleo é o próprio nome (o extrator determinístico dá nucleo "Milo"): a espécie é o substantivo que fecha o trecho
    // ("… orange kitten named Milo"), nunca palavra de gente — "a tall man named Milo" não vira ficha de um gato.
    const cabeca = trecho.split(' ').pop() ?? ''
    const nucleoPeloTrecho = ficha.tipo !== 'humano' && String(ficha.nucleo ?? '').trim().toLowerCase() === nome.toLowerCase() && !especieDePessoa(cabeca)
    if (nucleoPeloTrecho && (/(?:man|men|woman|women)$/iu.test(cabeca) || trechoDescreve(trecho, m[1], { ...ficha, tipo: 'humano' }))) continue // "old fisherman", "tall man": gente ("tiger", "hamster" passam)
    if (!trechoDescreve(trecho, m[1], nucleoPeloTrecho ? { ...ficha, nucleo: cabeca } : ficha)) continue
    if (outros.some((o) => o && o !== nome && nomeProprio(o) && palavraRe(o).test(trecho))) continue
    return trecho
  }
  return null
}
/** A frase "exactly as the author wrote" da ficha não aparece no pedido (quem a escreveu foi o roteiro, não o cliente)? */
export function fraseForaDoPedido(canonica: string, pedido: string): boolean {
  const frase = literalDaCanonica(canonica)
  const norma = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
  return !!frase && !!pedido && !norma(pedido).includes(norma(frase))
}

/**
 * O elenco com as palavras do PEDIDO ORIGINAL onde o roteiro despachado as perdeu. Mesma forma de saída de elencoComFichaLiteral (juiz):
 * `trocas` = [canônica de antes, canônica literal], para os prompts de cena já escritos. Ficha do autor (a literal nasce do autor), figura
 * conhecida/mítica e personagem sem nome próprio ficam como estão; sem pedido original, o elenco inteiro fica. Nunca mexe no objeto recebido.
 */
export function elencoComFichaDoPedido(ideiaOriginal: unknown, elenco: ReadonlyArray<FichaDePersonagem>, opcoes: { aparencia1311?: boolean } = {}): ElencoLiteral {
  const pedido = textoDoPedidoOriginal(ideiaOriginal)
  const literais: string[] = []
  const trocas: Array<[string, string]> = []
  const nomes = elenco.map((f) => f.nome)
  const saida = elenco.map((f) => {
    // KINEO-APARENCIA-DO-PEDIDO-1311 — com a peça 4 ligada, a ficha de "autor" cuja frase NÃO está no pedido foi escrita pelo NOSSO roteiro
    // (Milo, 982a6aeb: "duckling hugs Milo") e cede para as palavras do cliente; a frase que está no pedido é do cliente e fica.
    const autorDoRoteiro = !!opcoes.aparencia1311 && f.origem === 'autor' && fraseForaDoPedido(f.canonica, pedido)
    if (!pedido || (f.origem === 'autor' && !autorDoRoteiro) || (f.origem as string) === 'mitica' || figuraConhecidaJuiz(f.nome) || figuraConhecida(f.nome)) return { ...f }
    const aposto = apostoDoPedido(pedido, f, nomes) ?? (opcoes.aparencia1311 ? nomeadoNoPedido(pedido, f, nomes) : null)
    if (!aposto) return { ...f }
    const canonica = canonicaLiteral(f, aposto, null, null)
    literais.push(f.nome)
    trocas.push([f.canonica, canonica])
    return { ...f, canonica, origem: 'autor' as FichaDePersonagem['origem'] }
  })
  return { elenco: saida, literais, trocas, natureza: null }
}
