// ═══ KINEO-EPISODIO2-NO-ASSUNTO-2026-10-13 — o episódio 2 continua o MESMO filme ═══
//
// O DEFEITO (medido em `events.next_episode_written`, 13/10): o "próximo
// episódio" que /api/next-episode escreve saía sobre OUTRO assunto.
//   · Milo, a caixinha de leite            → "The Last Pizza Slice"
//   · Mila no Rainbow Valley                → "The Whispering Forest"
//   · dinossauro que não para de dançar     → "The Great Jellyfish Migration"
//   · por que a janela do avião é redonda   → "The Secret of Honey's Longevity"
//   · Lumi e Pipo contam até dez (PT)       → "The Ocean's Mysterious Abyss"
// A CAUSA não era a fonte do texto (o EPISODE 1 chegava certo): era a ORDEM
// dada ao escritor. O `sistema` da rota mandava, com todas as letras, "a
// different story in the same subject area" e "Same curiosity, new subject",
// num "knowledge/curiosity channel" onde "no invented people" proíbe a
// própria personagem da história infantil. O modelo obedecia: trocava de
// assunto e virava documentário. O conserto de 22/09 (lib/episodeSubject.ts)
// cola o assunto anterior nas rotas de RENDER, não nesta.
//
// O QUE ESTE ARQUIVO FAZ (puro, zero imports — o guardião roda offline):
//   · `assuntoDoFilme` tira do filme de origem uma ÂNCORA curta de assunto
//     (quem/o quê), limpando o andaime de produção ("Create a 15–35 second
//     story…", "HOOK (0-2s):", "[Pexels: …]", "Duration: …"). Prefere a
//     NARRAÇÃO real do filme (`videos.script`), depois o texto que a rota já
//     usa como EPISODE 1.
//   · `formatoDoFilme` reconhece história com personagem (o caso que mais
//     derivava) para a linha FORMAT dizer "continue a ficção".
//   · `blocoDeContinuidade` monta as duas linhas que entram no prompt do
//     usuário. Sem âncora utilizável devolve '' — e o prompt fica como antes.

/** Teto da âncora: o bastante para nome + situação, curto para não competir
 *  com o EPISODE 1 inteiro que já vai no prompt. */
export const MAX_ASSUNTO_CHARS = 280
/** Âncora menor que isto não diz de quem é o filme. */
const MIN_ASSUNTO_CHARS = 12

// "[Pexels: toyota supra mk4 closeup]" e afins: instrução de cena, não assunto.
const ETIQUETA = /\[[^\]]{0,160}\]/g
// Rótulo no começo da linha: "HOOK (0-2s):", "MICRO REWARD 1:", "Concept:".
const ROTULO =
  /^\s*(?:HOOK|MICRO\s*REWARD(?:\s*\d+)?|ESCALATION|RHYTHM|PAYOFF|TITLE|T[ÍI]TULO|CONCEPT|CONCEITO|CONCEPTO|TOPIC|TEMA|SCENE\s*\d+|CENA\s*\d+|ESCENA\s*\d+)\s*(?:\([^)]{0,20}\))?\s*[:\-–—]\s*/i
// Linha que é só ficha técnica.
const FICHA = /^\s*(?:duration|dura[cç][aã]o|duraci[oó]n|aspect(?: ratio)?|format|formato|resolution|music|m[uú]sica|voice|voz|camera|c[aâ]mera|sequence|sequ[eê]ncia|trick|truque|style|estilo)\s*:/i
// Frase que só dá ORDEM de produção. Só cai quando não carrega o assunto
// ("Create a video ABOUT the Titanic" fica; "Create a 15–35 second story in a
// sweet, fairytale style" sai).
const ORDEM =
  /^(?:create|make|generate|write|produce|render|crie|cria|gere|gera|fa[cç]a|escreva|crea|genera|haz|escribe|every shot|each shot|do not|don't|never|keep|use|the story must|the video must|it must|must)\b/i
const ORDEM_COM_ASSUNTO = /\b(?:about|sobre|acerca de|named|called|chamad[oa]|llamad[oa])\b/i
// Andaime de continuação antigo: 'Topic: "X". This is the next episode…'.
const CONTINUACAO_ANTIGA = /^\s*(?:topic|tema)\s*:\s*"?([^"\n]+?)"?\s*\.\s+this is the next episode[\s\S]*$/i

function limparLinha(linha: string): string {
  return linha.replace(ETIQUETA, ' ').replace(ROTULO, '').replace(/\s+/g, ' ').trim()
}

function frasesDe(texto: string): string[] {
  const out: string[] = []
  for (const bruta of texto.split(/\n+/)) {
    if (FICHA.test(bruta)) continue
    const linha = limparLinha(bruta)
    if (!linha) continue
    for (const f of linha.split(/(?<=[.!?…])\s+/)) {
      const frase = f.trim()
      if (frase) out.push(frase)
    }
  }
  return out
}

function cortar(texto: string): string {
  if (texto.length <= MAX_ASSUNTO_CHARS) return texto
  const janela = texto.slice(0, MAX_ASSUNTO_CHARS)
  const fimFrase = Math.max(janela.lastIndexOf('. '), janela.lastIndexOf('! '), janela.lastIndexOf('? '))
  if (fimFrase >= MIN_ASSUNTO_CHARS * 3) return janela.slice(0, fimFrase + 1).trim()
  const fimPalavra = janela.lastIndexOf(' ')
  return (fimPalavra > MIN_ASSUNTO_CHARS ? janela.slice(0, fimPalavra) : janela).trim()
}

/** A âncora de assunto de UM texto (narração ou ordem). '' quando não há. */
function ancoraDe(texto: string | null | undefined): string {
  let t = (texto ?? '').replace(/\r\n/g, '\n')
  // Episódio que já nasceu de continuação carrega o bloco do anterior no topic.
  t = t.split('\n\nPREVIOUS EPISODE')[0]
  const antiga = CONTINUACAO_ANTIGA.exec(t)
  if (antiga) t = antiga[1]
  const frases = frasesDe(t)
  if (!frases.length) return ''
  const comAssunto = frases.filter((f) => !(ORDEM.test(f) && !ORDEM_COM_ASSUNTO.test(f)))
  // Se TUDO era ordem, a ordem é o que existe: melhor ela que nada.
  const escolhidas = comAssunto.length ? comAssunto : frases
  const ancora = cortar(escolhidas.join(' ').replace(/\s+/g, ' ').trim())
  return ancora.length >= MIN_ASSUNTO_CHARS ? ancora : ''
}

/**
 * A âncora de assunto do filme de origem. As fontes vêm em ordem de
 * preferência (a narração real primeiro); a primeira que render âncora vence.
 */
export function assuntoDoFilme(...fontes: Array<string | null | undefined>): string {
  for (const f of fontes) {
    const a = ancoraDe(f)
    if (a) return a
  }
  return ''
}

export type FormatoDoFilme = 'historia' | 'livre'

const SINAL_HISTORIA =
  /\b(?:once upon a time|fairy ?tale|fairytale|bedtime|short story|a story|kids'? story|children'?s story|fictional|fiction|protagonist|main character|characters?|cartoon|animated|anthropomorphic|fable|era uma vez|hist[oó]ria infantil|personage(?:m|ns)|conto de fadas|érase una vez|[eé]rase una vez|cuento|personaje|f[aá]bula)\b/i
const BICHO_PERSONAGEM =
  /\b(?:a|an|the|um|uma|un|una)\s+(?:little|tiny|cute|fluffy|small|baby|sad|brave|pequen[oa]|fofinh[oa])\s+(?:[a-z]+\s+)?(?:dinosaur|bunny|rabbit|cat|dog|puppy|kitten|bear|dragon|monster|creature|girl|boy|robot|fox|pig|duck|unicorn|elephant|lion|mouse|owl|penguin|carton|dinossauro|coelho|gat[oa]|cachorr[oa]|menin[oa]|drag[aã]o|criatura)\b/i
// Nome próprio apresentado como personagem: "named Mila", "named MILO", "chamada Lumi".
const NOME_PERSONAGEM = /\b(?:named|called|chamad[oa]|llamad[oa])\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ][\p{L}]+/u

/** História com personagem → 'historia'. O resto → 'livre' (o escritor lê o
 *  EPISODE 1 e segue o formato dele). Nunca chuta 'fatos': uma história de
 *  terror sem palavra-sinal não pode ser empurrada para documentário. */
export function formatoDoFilme(...fontes: Array<string | null | undefined>): FormatoDoFilme {
  const t = fontes.filter((f): f is string => typeof f === 'string').join('\n')
  if (SINAL_HISTORIA.test(t) || BICHO_PERSONAGEM.test(t) || NOME_PERSONAGEM.test(t)) return 'historia'
  return 'livre'
}

const LINHA_FORMATO: Record<FormatoDoFilme, string> = {
  historia:
    'FORMAT: a story with characters. Continue it as fiction: the SAME characters (same names) in the SAME world, and what happens to them next. Do not turn it into a documentary.',
  livre:
    'FORMAT: same as episode 1. If it is a story, continue the same characters in the same world; if it is factual, stay on the same theme with the next angle.',
}

// ═══ KINEO-PROXIMO-EPISODIO-0111 — a FICHA do personagem atravessa o episódio (vai do fundador 01/11 "vai tudo") ═══
//
// O DEFEITO QUE SOBROU DEPOIS DE 13/10 (medido em `events.next_episode_written`, 13/10 → 01/11): o assunto ficou, o
// PERSONAGEM não. O robô que conserta brinquedos virou coadjuvante de uma "little girl, named Mia" (nome inventado, em dois
// episódios); o urso de pelúcia ganhou o nome "Tofu". A ficha que o AUTOR escreveu ("Roland Pernicus Oznard, a gruff old man
// with shoulder-length gray-brown hair"; "BRO, a muscular grey city pigeon"; "A tiny cute blue milk carton named MILO") não
// era dita ao escritor como regra — e, quando o EPISODE 1 é a narração, a ficha do PEDIDO nem chegava a ele.
// `fichasExplicitas` lê a ficha palavra por palavra (sem inventar nada) e `blocoDeContinuidade` a manda como MAIN CHARACTER.
// Também usada pela ideia do botão "Next episode" (lib/proximoEpisodioStudio.ts). Continua pura, zero imports.

/** Teto de uma ficha (nome + descrição + aparência). */
export const MAX_FICHA_CHARS = 240
const SER =
  '(?:man|woman|boy|girl|kid|child|baby|toddler|teen|teenager|lady|gentleman|guy|grandma|grandpa|grandmother|grandfather|mother|father|mom|dad|sister|brother|son|daughter|king|queen|prince|princess|knight|wizard|witch|pirate|captain|sailor|soldier|detective|doctor|nurse|farmer|fisherman|teacher|student|scientist|explorer|astronaut|keeper|hunter|warrior|hero|heroine|robot|android|cyborg|alien|dragon|dinosaur|monster|creature|ghost|fairy|elf|unicorn|mermaid|giant|troll|goblin|vampire|zombie|toy|doll|teddy|puppet|bear|bunny|rabbit|fox|wolf|dog|puppy|cat|kitten|mouse|rat|owl|pigeon|dove|crow|raven|sparrow|parrot|eagle|hawk|seagull|gull|duck|duckling|goose|swan|chicken|hen|rooster|penguin|bird|frog|turtle|tortoise|snake|lizard|horse|pony|donkey|cow|pig|sheep|goat|lion|tiger|elephant|giraffe|zebra|monkey|gorilla|panda|koala|squirrel|hedgehog|raccoon|otter|deer|whale|dolphin|shark|octopus|crab|bee|butterfly|spider|snail|fish|hamster|camel|cub|pup|calf|foal|chick|piglet|lamb|pilot|chef|baker|artist|inventor|sheriff|cowboy|ninja|samurai|viking|spy|thief|orphan|monk|nun|priest|officer|homem|mulher|menino|menina|garoto|garota|velho|velha|cachorro|cachorra|gato|gata|pombo|coelho|urso|hombre|mujer|niño|niña|perro|paloma|conejo|oso)(?:e?s)?'
const SER_RE = new RegExp(`(?<![\\p{L}])${SER}(?![\\p{L}])`, 'iu')
// KINEO-PROXIMO-EPISODIO-0111 (revisão) — título com ponto ("Dr. Vega") é UM nome: antes virava "Dr" + uma 2ª ficha.
const HONORIFICO = String.raw`(?:Dr|Dra|Mr|Mrs|Ms|Mx|Prof|Profa|Capt|Gen|Lt|Sgt|Col|St|Sr|Sra|Srta)\.\s+`
const NOME = String.raw`(?:${HONORIFICO})?\p{Lu}[\p{L}'’-]+(?:\s+\p{Lu}[\p{L}'’-]+){0,3}`
// "Nome, a/an descrição" (aposto). A descrição vai até o fim da frase; o corte fino é feito depois.
const APOSTO_RE = new RegExp(String.raw`(?<![\p{L}\p{N}])(${NOME}),\s+(a|an|um|uma|un|una|une)\s+(?=([^.!?;\n]{3,260}))`, 'gu') // a descrição em lookahead: "Pip, a mouse…, and Luna, an owl" acha os dois
// "a/an descrição named/called Nome" — o nome dado já prova o personagem.
const PALAVRA_DESC = String.raw`(?!(?:a|an|the|about|of|for|to|in|on|with|that|who|and|or|story|video|film|tale)(?![\p{L}]))[\p{L}'’-]+`
const NOMEADO_RE = new RegExp(String.raw`(?<![\p{L}])([Aa]n?|[Tt]he)\s+((?:${PALAVRA_DESC}\s+){0,7}${PALAVRA_DESC})\s+(?:named|called)\s+(${NOME})`, 'gu')
// "Main character: …" / "Protagonist: …" — inclusive o rótulo que a ideia do botão escreve (o episódio 3 herda do 2).
const ROTULO_FICHA_RE = /(?:^|\n|\.\s)\s*(?:main character|protagonist|personagem principal|protagonista)\s*:\s*([^\n]{8,260}?)(?=\.\s|\.$|\n|$)/giu
/** Palavra com maiúscula que abre frase e NÃO é nome. */
const NAO_E_NOME = new Set(('the|a|an|in|on|at|by|but|and|or|so|then|when|once|today|tonight|yesterday|tomorrow|meet|hook|micro|reward|escalation|payoff|rhythm|title|concept|episode|scene|chapter|part|story|also|now|here|there|this|that|every|each|after|before|era|uma|un|una|el|la|o|os|as|em|no|na|it|he|she|they|we|you|i|his|her|their|our|my|its|suddenly|finally|later|first|next|last|one|two|three|narrator|voiceover|cut|style|camera|visual|duration|format|sequence|create|make|generate' +
  // KINEO-PROXIMO-EPISODIO-0111 (revisão) — palavras que ABREM frase antes de vírgula: "Meanwhile, a little girl watched…" virava
  // MAIN CHARACTER "Meanwhile". Nenhuma delas é nome de personagem; títulos soltos ("Dr" sem nome) também não.
  '|meanwhile|somewhere|however|inside|outside|look|elsewhere|imagine|picture|listen|remember|behold|yet|still|soon|instead|nearby|above|below|beyond|behind|underneath|deep|far|long|years|centuries|decades|legend|legends|history|again|besides|moreover|therefore|thus|indeed|sometimes|often|usually|recently|eventually|ultimately|luckily|sadly|unfortunately|fortunately|surprisingly|amazingly|believe|guess|hey|oh|well|yes|no|okay|everywhere|nowhere|until|while|because|although|though|since|if|as|with|without|for|from|to|of|into|across|through|during|dear|welcome|hello|hi|kineo|youtube|tiktok|instagram|enquanto|depois|então|entao|porém|porem|agora|aqui|ali|lá|mientras|entonces|ahora|aquí|luego|después|despues|dr|dra|mr|mrs|ms|mx|prof|sr|sra|st' +
  // KINEO-PROXIMO-EPISODIO-0111 (revisão 2) — "En México, un hombre…" ficava com o "En" dentro do nome.
  '|en|del|al|dans|au|aux|nos|nas|do|da|de|desde|hasta|até|ate|past|early|late|near').split('|'))
// KINEO-PROXIMO-EPISODIO-0111 (revisão 2) — LUGAR ou DATA antes da vírgula não é personagem: "In Ohio, a man found…" virava
// MAIN CHARACTER "Ohio, a man"; "Last Friday, a teacher…" virava "Friday, …"; "Em Minas, um homem…" virava "Minas, …". Se a
// palavra que abre o "nome" (ou a que vem logo antes dele) é preposição/marca de tempo, o aposto é um adjunto, não uma ficha.
const PREPOSICAO_OU_TEMPO = new Set(('in|on|at|near|across|inside|outside|since|until|during|after|before|last|this|next|every|each|past|early|late|around|throughout|em|no|na|nos|nas|desde|até|ate|en|hasta|durante|dans|au|aux|à').split('|')) // sem of/to/by/de: "the story of Pip, a brave mouse" é personagem
const DIA_OU_MES = /^(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|january|february|march|september|october|november|december|christmas|easter|halloween|segunda|terça|terca|quarta|quinta|sexta|sábado|sabado|domingo|janeiro|fevereiro|março|marco|setembro|outubro|novembro|dezembro|lunes|martes|miércoles|miercoles|jueves|viernes|enero|febrero|marzo|septiembre|octubre|noviembre|diciembre|natal|navidad)$/i
/** KINEO-PROXIMO-EPISODIO-0111 (revisão) — palavra que abre frase / não é nome de personagem (usada também pela ideia do Studio). */
export function naoEhNome(palavra: string): boolean {
  return NAO_E_NOME.has(String(palavra ?? '').trim().toLowerCase())
}

const limpa = (s: string) => String(s ?? '').replace(/\s+/g, ' ').trim()
/** Pedaço que continua descrevendo a aparência depois de uma vírgula ("…, with a torn wing", "…, wearing a cap"). */
const CONTINUA_APARENCIA = /^(?:with|wearing|in (?:a|an|his|her|their)|dressed|carrying|holding|missing|covered|whose)\b/i

/** Tira do começo as palavras que abrem frase ("Meet Pip" → "Pip"); '' quando não sobra nome. */
function nomeLimpo(nome: string): string {
  const palavras = limpa(nome).split(' ')
  while (palavras.length && NAO_E_NOME.has(palavras[0].toLowerCase())) palavras.shift()
  return palavras.length && palavras.every((p) => p.length >= 2) ? palavras.join(' ') : ''
}
/**
 * KINEO-PROXIMO-EPISODIO-0111 (revisão 2) — o "Nome" do aposto é nome de alguém, não um adjunto de lugar/tempo?
 * "In Ohio, a man…" / "Last Friday, a teacher…" / "Em Minas, um homem…" / "En México, un hombre…" / "Yesterday in Ohio, a
 * man…" / "Friday, a teacher…" = não.
 */
function apostoComNomeDeVerdade(texto: string, pos: number, nomeBruto: string): boolean {
  const palavras = limpa(nomeBruto).split(' ')
  for (const p of palavras) {
    const w = p.toLowerCase()
    if (!NAO_E_NOME.has(w)) break
    if (PREPOSICAO_OU_TEMPO.has(w)) return false
  }
  if (palavras.some((p) => DIA_OU_MES.test(p))) return false
  const antes = /([\p{L}]+)[\s]*$/u.exec(texto.slice(Math.max(0, pos - 40), pos))?.[1]?.toLowerCase() ?? ''
  if (antes && PREPOSICAO_OU_TEMPO.has(antes)) return false
  return true
}
/** ", with turquoise hair and a star-shaped yellow backpack" logo depois do nome (padrão "a girl named Mila, with …"). */
function apostoDepoisDoNome(texto: string, fim: number): string {
  const m = /^,\s+([^.!?;\n]{3,220})/u.exec(texto.slice(fim))
  if (!m) return ''
  const out: string[] = []
  for (const p of m[1].split(/,\s+/)) {
    if (!CONTINUA_APARENCIA.test(p)) break
    out.push(p)
  }
  return out.join(', ').replace(/\s+(?:and|e|y)$/i, '').trim()
}
/** Corta a descrição do aposto: 1º trecho até a vírgula + trechos que continuam a aparência. */
function cortarDescricao(desc: string): string {
  const partes = limpa(desc).split(/,\s+/)
  const out = [partes[0]]
  for (const p of partes.slice(1)) {
    if (!CONTINUA_APARENCIA.test(p)) break
    out.push(p)
  }
  return semAcaoDepoisDoSer(out.join(', ').replace(/\s+(?:and|e|y)$/i, '').trim())
}
// KINEO-PROXIMO-EPISODIO-0111 (revisão 2) — o SER tem de ser o NÚCLEO (a palavra-cabeça) da descrição, não uma palavra
// qualquer das 6 primeiras: "Centralia, a ghost TOWN", "Mary Celeste, a ghost SHIP", "Lego, a toy COMPANY" têm ser no meio e
// coisa no núcleo. Em inglês a cabeça é a ÚLTIMA palavra antes de "with/who/of/in…"; em pt/es/fr (um/uma/un/una/une) o
// adjetivo vem depois, então a 1ª palavra também conta ("uma menina curiosa").
const FIM_DO_NUCLEO = /^(?:who|whom|whose|that|which|where|when|of|from|near|in|on|at|by|than|once|with|without|wearing|holding|carrying|dressed|covered|named|called|and|or|but|que|onde|de|do|da|dos|das|em|no|na|com|sem|e|ou|del|en|con|sin|y|cuyo|cuya|quien|qui|dont|avec)$/i
const SER_INTEIRO_RE = new RegExp(`^${SER}$`, 'iu')
/** Ser que vive de METÁFORA em documentário: "a chip giant", "a sleeping dragon", "a monster that eats your savings",
 *  "a giant of photography". Só vira ficha em história (ou com adjetivo de personagem: "a friendly giant", "a little dragon"). */
const SER_FIGURADO_RE = /^(?:giant|dragon|monster|king|queen|prince|princess|ghost|hero|heroine|wizard|witch|knight|warrior|vampire|zombie|troll|goblin|shark|wolf|bear|lion|tiger|fox|snake|whale|unicorn|dinosaur|creature|puppet|toy|doll)s?$/i
const ADJETIVO_DE_PERSONAGEM = /^(?:little|tiny|cute|small|baby|young|old|brave|kind|friendly|gentle|grumpy|shy|lonely|clumsy|curious|fluffy|furry|magical|playful|silly|wise|sad|happy|cheerful|lazy|naughty|mischievous|sweet|hungry|scared|clever|fearless|timid|chubby|cuddly|adorable|funny|goofy|sleepy|pequen[oa]|fof[oa]|fofinh[oa]|valente|corajos[oa]|simp[aá]tic[oa]|pequeñ[oa]|valiente|amable)$/i
/** Coisa/lugar/organização: nunca personagem, nem com "named/called" ("a town called Centralia", "a company named Kodak"). */
const LUGAR_OU_ORGANIZACAO = /^(?:town|city|village|country|nation|state|region|province|county|empire|kingdom|republic|company|firm|brand|startup|corporation|business|bank|fund|ship|boat|vessel|plane|aircraft|planet|star|moon|comet|asteroid|island|mountain|hill|river|lake|sea|ocean|desert|forest|valley|place|site|street|road|house|building|tower|castle|palace|temple|church|school|university|college|hospital|prison|mine|coin|currency|token|app|platform|network|channel|website|program|project|law|rule|tax|market|cidade|vila|pa[ií]s|estado|empresa|marca|navio|barco|planeta|ilha|montanha|rio|lago|lugar|rua|casa|escola|ciudad|pueblo|compañía|compania|isla|monta[nñ]a|r[ií]o)s?$/i
/** As palavras do núcleo da descrição (para no "who/with/of…" ou num verbo). */
function nucleoDe(desc: string): string[] {
  const out: string[] = []
  for (const bruta of limpa(desc).split(' ')) {
    const w = bruta.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}'’-]+$/gu, '')
    if (!w || FIM_DO_NUCLEO.test(w) || out.length >= 6) break
    if (out.length && ehVerbo(w, out[out.length - 1])) break
    out.push(w)
  }
  return out
}
/**
 * O ser é o núcleo da descrição e é literal? `artigo` decide a língua (um/uma/un/una/une = o adjetivo vem depois).
 * `historia` = o filme é ficção (formatoDoFilme): aí "a dragon", "a giant" são personagens de verdade.
 */
function serNoNucleo(desc: string, artigo: string, historia: boolean): boolean {
  const nucleo = nucleoDe(desc)
  if (!nucleo.length) return false
  const cabeca = nucleo[nucleo.length - 1]
  const romance = /^(?:um|uma|un|una|une)$/i.test(artigo)
  const ser = SER_INTEIRO_RE.test(cabeca) ? cabeca : romance && SER_INTEIRO_RE.test(nucleo[0]) ? nucleo[0] : ''
  if (!ser) return false
  if (SER_FIGURADO_RE.test(ser) && !historia && !nucleo.some((w) => ADJETIVO_DE_PERSONAGEM.test(w))) return false
  return true
}
/** Descrição depois de "named/called": o nome já prova o personagem, mas coisa/lugar/empresa não; objeto (o MILO caixinha
 *  de leite) só em história; ser figurado só em história ou com adjetivo de personagem. */
function nomeadoEhPersonagem(desc: string, historia: boolean): boolean {
  const nucleo = nucleoDe(desc)
  const cabeca = nucleo[nucleo.length - 1] ?? ''
  if (!cabeca || LUGAR_OU_ORGANIZACAO.test(cabeca)) return false
  if (!SER_INTEIRO_RE.test(cabeca)) return historia
  if (SER_FIGURADO_RE.test(cabeca) && !historia && !nucleo.some((w) => ADJETIVO_DE_PERSONAGEM.test(w))) return false
  return true
}
// "Mia, a little girl watched the storm…": a frase de ação depois do SER não é aparência — corta antes do verbo.
// KINEO-PROXIMO-EPISODIO-0111 (revisão 2) — o verbo pode vir DEPOIS de uma locução ("a teacher in Texas PAID off every
// student loan") e pode ser pt/es ("um homem ACHOU ouro", "un hombre ENCONTRÓ"): antes só a palavra colada ao ser era olhada.
const VERBO_FORTE = /^(?:is|was|were|are|has|had|have|does|did|can|could|will|would|sat|sits|stood|stands|ran|runs|went|goes|came|comes|saw|sees|found|finds|felt|feels|woke|wakes|said|says|lives|lived|looks|hears|heard|knew|knows|took|takes|gets|got|paid|pays|made|makes|built|builds|bought|buys|sold|sells|won|wins|became|becomes|gave|gives|told|tells|kept|keeps|met|meets|began|begins|spent|spends|wrote|writes|drove|drives|flew|flies|swam|ate|eats|drank|fell|falls|broke|breaks|é|era|foi|tem|tinha|vive|vivia|mora|morava|achou|encontrou|viu|descobriu|comprou|ganhou|perdeu|fez|es|fue|tiene|tenía|tenia|encontró|vio|descubrió|compró|ganó|perdió|hizo|vivía)$/i
const NAO_E_VERBO = /^(?:named|called|dressed|covered|armed|aged|tired|scared|winged|haired|eyed|legged|horned|tailed|shaped|colou?red|striped|spotted|feathered|furred|bearded|masked|hooded|cursed|beloved|bored|retired|talented|gifted|wicked|crooked|ragged|rugged|naked|sacred|learned|wretched|stuffed|patched|painted|tattered|wrinkled|freckled|abandoned|discarded|forgotten|red|bed|seed|need|speed|steed|creed|weed|shed|sled)$/i
/** `w` é verbo de ação (não aparência)? Forma genérica (-ed, -ou/-iu, -ó) só quando vem logo depois do ser ou de um nome
 *  com maiúscula ("in Texas paid"); no meio da aparência ("a red scarf and tangled hair") não corta. */
function ehVerbo(w: string, anterior: string): boolean {
  if (NAO_E_VERBO.test(w)) return false
  if (VERBO_FORTE.test(w)) return true
  if (!/^(?:[\p{Ll}]{3,}ed|[\p{Ll}]{3,}(?:ou|iu)|[\p{Ll}]{2,}(?:ó|ió))$/u.test(w)) return false
  return SER_INTEIRO_RE.test(anterior) || /^\p{Lu}/u.test(anterior)
}
const RELATIVO = /^(?:who|whom|whose|that|which|que|quem|quien|cuyo|cuya|qui|dont)$/i
function semAcaoDepoisDoSer(desc: string): string {
  const re = new RegExp(`(?<![\\p{L}])${SER}(?![\\p{L}])`, 'giu')
  for (const m of desc.matchAll(re)) {
    const ini = (m.index ?? 0) + m[0].length
    let anterior = m[0]
    let n = 0
    for (const p of desc.slice(ini).matchAll(/[\p{L}\p{N}'’-]+/gu)) {
      const w = p[0]
      if (RELATIVO.test(w) || ++n > 7) break // oração relativa = descrição ("a girl who loves stars")
      if (ehVerbo(w, anterior)) return desc.slice(0, ini + (p.index ?? 0)).replace(/[\s,;:]+$/, '').trim()
      anterior = w
    }
  }
  return desc
}
function cortarFicha(f: string): string {
  const t = limpa(f).replace(/[,;:\s]+$/, '')
  if (t.length <= MAX_FICHA_CHARS) return t
  const janela = t.slice(0, MAX_FICHA_CHARS)
  return janela.slice(0, Math.max(0, janela.lastIndexOf(' '))).replace(/[,;:\s]+$/, '')
}
/** "He has small arms…" logo depois da ficha vira ", with small arms…" (a aparência que o autor escreveu). */
function aparenciaSeguinte(texto: string, fim: number): string {
  const resto = texto.slice(fim)
  const m = /^[^.!?\n]*[.!?]?\s+(?:He|She|It|They)\s+(?:has|have|wears|is wearing|are wearing)\s+([^.!?\n]{6,200})/u.exec(resto)
  return m ? limpa(m[1]) : ''
}

/**
 * As fichas que o AUTOR escreveu, verbatim, na ordem em que aparecem (no máximo 2, uma por nome). Fontes em ordem de
 * preferência (o pedido, a narração…). [] quando ninguém descreveu personagem — nada é inventado aqui.
 */
export function fichasExplicitas(...fontes: Array<string | null | undefined>): string[] {
  const achadas: Array<{ nome: string; ficha: string }> = []
  const junta = (nome: string, ficha: string) => {
    const chave = limpa(nome).toLowerCase()
    if (!chave || achadas.some((a) => a.nome === chave)) return
    achadas.push({ nome: chave, ficha: cortarFicha(ficha) })
  }
  // KINEO-PROXIMO-EPISODIO-0111 (revisão 2) — ficção ou não: "a dragon"/"a giant" só são personagem em história.
  const historia = formatoDoFilme(...fontes) === 'historia'
  for (const fonte of fontes) {
    if (typeof fonte !== 'string' || !fonte.trim()) continue
    const texto = fonte.replace(/\r\n/g, '\n').replace(/\[[^\]]{0,160}\]/g, ' ').slice(0, 8000)
    const daFonte: Array<{ pos: number; nome: string; ficha: string }> = []
    for (const m of texto.matchAll(ROTULO_FICHA_RE)) {
      const ficha = limpa(m[1])
      if (!SER_RE.test(ficha) && !/\b(?:named|called)\b/i.test(ficha)) continue
      daFonte.push({ pos: m.index ?? 0, nome: ficha.split(',')[0], ficha })
    }
    for (const m of texto.matchAll(APOSTO_RE)) {
      if (!apostoComNomeDeVerdade(texto, m.index ?? 0, m[1])) continue // KINEO-PROXIMO-EPISODIO-0111 (revisão 2) — lugar/data
      const nome = nomeLimpo(m[1])
      if (!nome) continue
      const desc = cortarDescricao(m[3])
      if (desc.length < 3 || !serNoNucleo(desc, m[2], historia)) continue // KINEO-PROXIMO-EPISODIO-0111 (revisão) — o ser é o núcleo, não um detalhe
      const ap = aparenciaSeguinte(texto, (m.index ?? 0) + m[0].length + m[3].length)
      daFonte.push({ pos: m.index ?? 0, nome, ficha: `${nome}, ${m[2].toLowerCase()} ${desc}${ap ? `, with ${ap}` : ''}` })
    }
    for (const m of texto.matchAll(NOMEADO_RE)) {
      const nome = nomeLimpo(m[3])
      if (!nome || DIA_OU_MES.test(nome)) continue
      if (!nomeadoEhPersonagem(m[2], historia)) continue // KINEO-PROXIMO-EPISODIO-0111 (revisão 2) — "a town called Centralia"
      const desc = limpa(m[2])
      const artigo = /^[aeiou]/i.test(desc) ? 'an' : 'a'
      const fim = (m.index ?? 0) + m[0].length
      const junto = apostoDepoisDoNome(texto, fim)
      const ap = aparenciaSeguinte(texto, fim)
      daFonte.push({ pos: m.index ?? 0, nome, ficha: `${nome}, ${artigo} ${desc}${junto ? `, ${junto}` : ''}${ap ? `, with ${ap}` : ''}` })
    }
    daFonte.sort((a, b) => a.pos - b.pos)
    for (const f of daFonte) junta(f.nome, f.ficha)
    if (achadas.length >= 2) break
  }
  return achadas.slice(0, 2).map((a) => a.ficha)
}

/**
 * KINEO-PROXIMO-EPISODIO-0111 (revisão) — a espécie que o TEXTO cola no nome: "Dino the dinosaur", "Dino, the little
 * dinosaur", "the little fox Rua" → "the little dinosaur" / "the little fox". '' quando o texto não disse — e aí ninguém
 * acrescenta espécie nem gênero.
 */
export function especieJuntoDoNome(texto: string | null | undefined, nome: string): string {
  const t = limpa(String(texto ?? '').replace(/\[[^\]]{0,160}\]/g, ' ')).slice(0, 8000)
  const n = limpa(nome)
  if (!t || !n) return ''
  const esc = n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  // qualificadores só (nunca "where/of/the…": "Rome, a city where the man" não dá espécie a Rome)
  const qual = String.raw`(?:(?!(?:who|whom|that|which|where|when|of|in|on|at|from|with|and|or|but|the|a|an|is|was|has|had)\s)[\p{Ll}'’-]+\s+){0,3}?`
  // KINEO-PROXIMO-EPISODIO-0111 (revisão 2) — "Bitcoin, the king OF crypto": título figurado, não espécie.
  const naoFigura = String.raw`(?![\p{L}])(?!\s+(?:of|de|do|da|del)(?![\p{L}]))`
  const depois = new RegExp(String.raw`(?<![\p{L}\p{N}])${esc},?\s+(the|a|an|o|a|um|uma|el|la|un|una)\s+(${qual}${SER})${naoFigura}`, 'u').exec(t)
  // KINEO-PROXIMO-EPISODIO-0111 (revisão 2) — o ser é a CABEÇA ("Tesla, the robot maker": a cabeça é "maker"): depois dele
  // só pontuação, fim, palavra de ligação ou verbo ("Dino the dinosaur loved…").
  if (depois) {
    const resto = t.slice((depois.index ?? 0) + depois[0].length)
    const seguinte = /^\s+([\p{L}'’-]+)/u.exec(resto)?.[1] ?? ''
    const cabeca = !seguinte || FIM_DO_NUCLEO.test(seguinte) || ehVerbo(seguinte, depois[2].split(' ').pop() ?? '') || /^(?:is|was)$/i.test(seguinte)
    if (cabeca) return `${depois[1].toLowerCase()} ${limpa(depois[2])}`
  }
  const antes = new RegExp(String.raw`(?<![\p{L}])(the|a|an|our|my|o|um|uma|el|la|un|una)\s+(${qual}${SER})\s+${esc}(?![\p{L}\p{N}])`, 'iu').exec(t)
  if (antes) return `${/^(?:our|my)$/i.test(antes[1]) ? 'the' : antes[1].toLowerCase()} ${limpa(antes[2])}`
  return ''
}

/** KINEO-PROXIMO-EPISODIO-0111 (revisão 2) — a palavra de ser aparece no texto como CABEÇA (seguida de pontuação, fim,
 *  ligação ou verbo) pelo menos uma vez? "the robot maker" / "a toy company" = não; "the robot shuts down" = sim. */
export function serComoCabeca(texto: string | null | undefined, palavra: string): boolean {
  const p = limpa(palavra)
  if (!p) return false
  const esc = p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const t = String(texto ?? '')
  for (const m of t.matchAll(new RegExp(String.raw`(?<![\p{L}])${esc}(?![\p{L}])`, 'giu'))) {
    const seguinte = /^\s+([\p{L}'’-]+)/u.exec(t.slice((m.index ?? 0) + m[0].length))?.[1] ?? ''
    if (!seguinte || FIM_DO_NUCLEO.test(seguinte) || ehVerbo(seguinte, p) || /^(?:is|was)$/i.test(seguinte)) return true
    // verbo no presente ("the robot collects/shuts/fixes"), não plural de substantivo composto ("robot makers/companies")
    if (/^[\p{Ll}]{3,}s$/u.test(seguinte) && !/(?:ers|ies|ists|ics|ss)$/u.test(seguinte)) return true
  }
  return false
}
/** KINEO-PROXIMO-EPISODIO-0111 (revisão 2) — a espécie é de metáfora ("the king", "a giant", "the dragon") e não tem
 *  adjetivo de personagem? Aí só vale em história ou quando o nome age (quem chama decide). */
export function especieFigurada(especie: string): boolean {
  const ws = limpa(especie).split(' ')
  return SER_FIGURADO_RE.test(ws[ws.length - 1] ?? '') && !ws.some((w) => ADJETIVO_DE_PERSONAGEM.test(w))
}

/**
 * As linhas de continuidade que a rota cola logo depois do EPISODE 1.
 * '' quando o filme não tem assunto utilizável: aí o prompt fica como antes.
 */
export function blocoDeContinuidade(entrada: {
  /** Texto que a rota já usa como EPISODE 1 (narração do cliente ou topic). */
  anterior: string
  /** `videos.script` do filme de origem (a narração real), quando lida. */
  narracaoOrigem?: string | null
  /** KINEO-PROXIMO-EPISODIO-0111 — `videos.topic` (o pedido do autor): é onde a ficha costuma estar escrita. */
  pedidoOrigem?: string | null
}): string {
  const assunto = assuntoDoFilme(entrada.narracaoOrigem, entrada.anterior)
  if (!assunto) return ''
  const formato = formatoDoFilme(entrada.anterior, entrada.narracaoOrigem)
  // KINEO-PROXIMO-EPISODIO-0111 — a ficha escrita pelo autor vira regra do escritor (pedido primeiro, depois o EPISODE 1
  // e a narração). Filme sem ficha escrita: nenhuma linha nova — o prompt de 13/10 fica igual.
  const fichas = fichasExplicitas(entrada.pedidoOrigem, entrada.anterior, entrada.narracaoOrigem)
  return `SUBJECT TO CONTINUE (stay on it): ${assunto}\n${LINHA_FORMATO[formato]}${linhasDaFicha(fichas)}`
}

const CABECA_FICHA = 'MAIN CHARACTER (keep exactly the same name, species and look; never rename or replace them, never invent a new protagonist): '
/** KINEO-PROXIMO-EPISODIO-0111 — as linhas da ficha ('' sem ficha). */
function linhasDaFicha(fichas: readonly string[]): string {
  if (!fichas.length) return ''
  return `\n${CABECA_FICHA}${fichas[0]}${fichas[1] ? `\nALSO IN THE STORY (same name and look): ${fichas[1]}` : ''}`
}

/**
 * KINEO-PROXIMO-EPISODIO-0111 — a rota cola a ficha escrita no PEDIDO (`videos.topic`) num bloco já pronto. Bloco vazio
 * (filme sem assunto) fica vazio — o prompt de antes, byte a byte; bloco que já tem a ficha (achada no EPISODE 1) fica igual.
 */
export function comFichaDoPedido(bloco: string, pedidoOrigem: string | null | undefined): string {
  if (!bloco || bloco.includes(CABECA_FICHA)) return bloco
  return `${bloco}${linhasDaFicha(fichasExplicitas(pedidoOrigem))}`
}
