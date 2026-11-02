// KINEO-K4-SUJEITO-0111 [TRAVA 8.2 — vai do fundador 01/11 "vai tudo" (melhorias)] — O SUJEITO OBRIGATÓRIO DO FILME KLING 4.
//
// Revisor de vídeos, 01/11 (docs/revisao-videos/2026-11-01.md e FILA-DEFEITOS.md, CENA_FORA_DO_PEDIDO): no filme grátis de 15 s do
// Kling 4 (multi_prompt de 3 cenas) o tema central do pedido não aparecia em quadro nenhum —
//   · "o avião C-54 que sumiu": o avião nunca aparece; 2 homens de terno em 5 de 8 quadros (1º filme; a cliente pagou mesmo assim);
//   · "criança com caneta 3D": a criança nunca aparece;
//   · "vida sob o gelo": o desfecho (a vida debaixo do gelo) não aparece.
// O elenco (elencoEpoca/folhaDePersonagem) cuida de GENTE nomeada; máquina, bicho e objeto central não tinham dono.
//
// v4: a ADIVINHAÇÃO POR LISTA DE PALAVRAS SAIU (rodadas 1-3 reprovadas: "El robo del siglo" virava robô, "Mis planes" avião,
// "Leverage is a double-edged sword" espada, "How AI trains" trem, "Billy the Kid" criança). O sujeito vem de UMA chamada semântica
// curta ao gpt-4o-mini sobre o PEDIDO ORIGINAL (nunca o roteiro com pistas [Pexels]). temperature 0, json_schema estrito, prazo ~4 s,
// no máximo 1 tentativa extra (só em 5xx/408/rede/prazo — 4xx não tem como dar certo). FALHA SEGURA: erro, prazo, JSON inválido,
// sujeito mal formado ou sem âncora no pedido = nada é injetado.
// v5 (revisão adversarial do 11db2897c): (1) o NÚCLEO do sujeito ("a talking parrot" → parrot, "a shopping cart" → cart) vem do próprio
// modelo (head_noun, validado como palavra minúscula escrita no sujeito) — o corte por regex em "-ing" que jogava fora respostas
// certas SAIU; (2) a resposta começa por uma leitura curta (reasoning, ≤ 25 palavras), 14 exemplos resolvidos (nenhum do conjunto
// de calibração) vão como conversa, e no fim o modelo confere o USO das palavras do pedido (word_use: literal, nome/título, figurado,
// verbo, nada) — o código só aceita sujeito com uso "literal" ("Jaws" não vira tubarão); has_human/request_language substituem as
// listas de pessoa e de palavras-função do pt/es; (3) todo descarte grava o motivo no relato (nada some em silêncio); (4) a chamada
// só sai DEPOIS da reserva do teste e com 3 cenas; 4xx não ganha 2ª tentativa.
// v6 (revisão adversarial do c5dbdbcf3), tudo em código e sem mexer no prompt (a calibração gravada continua valendo): (1) a presença
// exige o NÚCLEO (head_noun) — família de sinônimos só substitui a forma do núcleo quando a citação dela contém o núcleo; as outras
// famílias e o modificador visual ("flying car") só reforçam, exigidas junto; (2) nome de pessoa dona/autora do objeto sai do texto
// injetado ("Napoleon's hat" → "a hat", "designed by Leonardo da Vinci", "belonging to King Arthur"), com o original no relato;
// (3) palavra igual nas duas línguas ("o hamster", "o táxi") não é mais "sujeito sem tradução".
// v7 (revisão do 21d3c2333), ainda sem mexer no prompt: (1) o nome da pessoa também sai em "a painting by Pablo Picasso", "the Wright
// brothers' first airplane", "the Kennedy family's yacht" e "a guitar Jimi Hendrix smashed" (ver semNomeDePessoa); o artigo é refeito;
// lugar/navio/árvore/marca ficam; (2) núcleo com gênero ("boy") não é provado pela família "child" com uma menina, e "Lego" é exigido;
// (3) -ves volta a um singular só. Casos rv6-* com resposta MOCKADA (OpenAI 429 em 01/11) — pendente de medir.
// Calibração (conjunto de ajuste + conjunto CEGO congelado antes da rodada, respostas reais da API) em
// docs/calibracao/KINEO-K4-SUJEITO-0111.json. LIMITE CONHECIDO: a âncora no pedido e o word_use vêm do mesmo modelo; se ele errar os
// dois juntos, a validação não pega — a proteção real é a calibração do caminho inteiro (0 grave em 151 casos x 2 passadas).
//   1. pedidoOriginalDoSujeito — de onde vem o pedido (inalterado desde a v2, aprovado nas revisões): ideia solta que chegou crua,
//      ou a `original_idea` que o /studio/create manda junto com o roteiro estruturado a partir DELA. Roteiro "as is", ideia longa,
//      ideia com marcadores/pistas ou que não fala do mesmo assunto da narração = null, nada é corrigido.
//   2. lerSujeitoDoPedido — a chamada semântica (async, rede). avaliarSujeito/sujeitoObrigatorio — a leitura vira o sujeito (puro).
//   3. exigirSujeitoNoKling4 — se nenhum prompt do multi_prompt mostra o sujeito, a cena cuja FALA o cita (senão a última, o
//      desfecho) ganha "Main subject clearly visible in frame: …" logo depois do meio, dentro do orçamento de 464 code points da
//      camada. Corrige, nunca bloqueia. A cena corrigida que tinha imagem-chave do meio perde a imagem; a imagem de abertura nunca
//      é tirada. A fala nunca é tocada ("Use my script as is" continua literal).
//   4. O relato (leitura semântica crua, sujeito, motivo de descarte, fonte do pedido, já presente, corrigido, cena, imagem tirada) vai
//      no claim, em kling4_trial.sujeito_obrigatorio.
import { KLING4_ORCAMENTO_DA_CAMADA, eixoCurtoKling4 } from '@/lib/cinematic/cenaKling4'
import { temaDiscordaDaFala } from '@/lib/pedidoCerto'
import { AI_TEXT_MODELS } from '@/lib/aiModels'

export const SUJEITO_K4_VERSAO = 'k4_sujeito_0111_v7_semantico' as const

// ─── A chamada semântica (compartilhada com o juiz do fim, lib/cinematic/finalResposta.ts) ──────────────────────────────────────
export const MODELO_SEMANTICO_0111 = AI_TEXT_MODELS.scenePlannerLight // gpt-4o-mini (registro único: lib/aiModels.ts)
export interface OpcoesSemanticas {
  /** Guardião offline injeta a resposta gravada; produção usa o fetch global. */
  fetchImpl?: typeof fetch
  timeoutMs?: number
  /** 0 ou 1 (nunca mais): a tentativa extra só sai se ainda couber no prazo total. */
  tentativasExtras?: 0 | 1
  /** Prazo total das tentativas (a 2ª só sai se sobrar um timeout inteiro). */
  prazoTotalMs?: number
  model?: string
  apiKey?: string
}
export type ResultadoSemantico<T> =
  | { ok: true; valor: T; ms: number; model: string; tentativas: number }
  | { ok: false; erro: string; ms: number; model: string; tentativas: number }

/** HTTP que vale uma 2ª tentativa: só erro do servidor e 408. 400/401/403/404/429 não têm como dar certo dentro de 4 s. */
const vale2aTentativa = (status: number) => status >= 500 || status === 408

/** Uma pergunta com resposta JSON estrita. Qualquer falha = { ok: false } (o chamador NÃO mexe em nada). */
export async function perguntaSemantica<T>(
  args: { system: string; user: string; nome: string; schema: Record<string, unknown>; ler: (o: unknown) => T | null; maxTokens?: number; /** Exemplos resolvidos (pares pedido → JSON) mandados como conversa antes da pergunta. */ exemplos?: ReadonlyArray<{ user: string; assistant: string }> },
  opts: OpcoesSemanticas = {},
): Promise<ResultadoSemantico<T>> {
  const model = opts.model ?? MODELO_SEMANTICO_0111
  const inicio = Date.now()
  const key = opts.apiKey ?? process.env.OPENAI_API_KEY
  if (!key) return { ok: false, erro: 'sem_chave', ms: 0, model, tentativas: 0 }
  const timeoutMs = opts.timeoutMs ?? 4_000
  const prazoTotalMs = opts.prazoTotalMs ?? timeoutMs * 2 + 500
  const doFetch = opts.fetchImpl ?? fetch
  let erro = 'nao_tentou'
  let tentativas = 0
  for (let t = 0; t <= (opts.tentativasExtras ?? 1); t++) {
    if (t > 0 && Date.now() - inicio + timeoutMs > prazoTotalMs) break
    tentativas++
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), timeoutMs)
    try {
      const res = await doFetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        signal: ctrl.signal,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model, temperature: 0, max_tokens: args.maxTokens ?? 120,
          response_format: { type: 'json_schema', json_schema: { name: args.nome, strict: true, schema: args.schema } },
          messages: [{ role: 'system', content: args.system }, ...(args.exemplos ?? []).flatMap((e) => [{ role: 'user', content: e.user }, { role: 'assistant', content: e.assistant }]), { role: 'user', content: args.user }],
        }),
      })
      if (!res.ok) { erro = `http_${res.status}`; if (vale2aTentativa(res.status)) continue; break }
      const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
      let bruto: unknown
      try { bruto = JSON.parse(String(data.choices?.[0]?.message?.content ?? '')) } catch { erro = 'json_invalido'; continue }
      const valor = args.ler(bruto)
      if (valor === null) { erro = 'formato_invalido'; continue }
      return { ok: true, valor, ms: Date.now() - inicio, model, tentativas }
    } catch (e) {
      erro = ctrl.signal.aborted ? 'prazo' : `erro_${e instanceof Error ? e.name : 'desconhecido'}`
    } finally {
      clearTimeout(timer)
    }
  }
  return { ok: false, erro, ms: Date.now() - inicio, model, tentativas }
}

// ─── A leitura do sujeito ───────────────────────────────────────────────────────────────────────────────────────────────────────
export type KindDoSujeito = 'object' | 'vehicle' | 'creature' | 'person_generic' | 'none'
export type UsoDaPalavra = 'literal' | 'name_or_title' | 'figurative' | 'verb' | 'none'
const USOS: ReadonlyArray<UsoDaPalavra> = ['literal', 'name_or_title', 'figurative', 'verb', 'none']
export interface LeituraDoSujeito {
  /** A leitura curta que o modelo faz do pedido antes de decidir (auditoria; nunca entra no prompt do vídeo). */
  reasoning: string
  /** Como as palavras citadas são usadas NESTE pedido — o código só aceita "literal" (nome/título, figurado, verbo e nada = sem sujeito). */
  word_use: UsoDaPalavra
  /** Sintagma visual em inglês ("a 1950s C-54 propeller airplane"); null quando não há nada a injetar. */
  subject: string | null
  /** O substantivo comum inglês no centro do sujeito ("parrot", "cart", "creatures") — é ele que prova presença no prompt. */
  head_noun: string | null
  kind: KindDoSujeito
  /** O sujeito é ou inclui gente (criança, menino, mulher, mergulhador…), seja qual for o kind. */
  has_human: boolean
  real_person: boolean
  /** As palavras do PRÓPRIO pedido (na língua dele) que nomeiam o sujeito — âncora anti-invenção e escolha da cena pela fala. */
  mention_words: string[]
  /** Língua do pedido (ISO 639-1, minúsculo), lida pelo modelo — só serve para pegar sujeito copiado sem traduzir. */
  request_language: string
  /** Por que o sujeito ficou null depois da validação (null = válido). */
  descartado: string | null
  /** v6: o sujeito como o modelo escreveu, quando o nome de pessoa dona/autora saiu dele (null = nada cortado). */
  subject_original: string | null
}

const KINDS: ReadonlyArray<KindDoSujeito> = ['object', 'vehicle', 'creature', 'person_generic', 'none']
// A ordem dos campos é a ordem em que o modelo escreve: uma leitura curta (reasoning) ANTES da decisão, e a conferência das palavras do
// pedido e do uso delas (word_use) DEPOIS — o código só aceita word_use "literal".
const SCHEMA_SUJEITO = {
  type: 'object', additionalProperties: false,
  required: ['reasoning', 'subject', 'head_noun', 'kind', 'real_person', 'has_human', 'mention_words', 'word_use', 'request_language'],
  properties: {
    reasoning: { type: 'string' },
    subject: { type: ['string', 'null'] },
    head_noun: { type: ['string', 'null'] },
    kind: { type: 'string', enum: KINDS },
    real_person: { type: 'boolean' },
    has_human: { type: 'boolean' },
    mention_words: { type: 'array', items: { type: 'string' } },
    word_use: { type: 'string', enum: USOS },
    request_language: { type: 'string' },
  },
} as const

// Exemplos resolvidos, mandados como conversa (o gpt-4o-mini segue exemplo melhor que regra). NENHUM deles está no conjunto da
// calibração (nem no ajuste nem no cego) — assim o placar do cego não é inflado por cópia.
const ex = (user: string, o: Record<string, unknown>) => ({ user: `Video request:\n${user}`, assistant: JSON.stringify(o) })
const nada = { subject: null, head_noun: null, kind: 'none', real_person: false, has_human: false, mention_words: [] as string[], word_use: 'none' }
export const EXEMPLOS_SUJEITO_0111: ReadonlyArray<{ user: string; assistant: string }> = [
  ex('Why do octopuses have three hearts', { reasoning: 'About octopuses, the animal itself; the word is literal.', subject: 'an octopus', head_noun: 'octopus', kind: 'creature', real_person: false, has_human: false, mention_words: ['octopuses'], word_use: 'literal', request_language: 'en' }),
  ex('a sleepy koala hugging a tree in the rain', { reasoning: 'A koala, literal animal; sleepy and hugging describe it.', subject: 'a sleepy koala hugging a tree in the rain', head_noun: 'koala', kind: 'creature', real_person: false, has_human: false, mention_words: ['koala'], word_use: 'literal', request_language: 'en' }),
  ex('o caminhão que atravessou o deserto sozinho', { reasoning: 'A truck crossing a desert; caminhão is a literal truck.', subject: 'a truck crossing the desert alone', head_noun: 'truck', kind: 'vehicle', real_person: false, has_human: false, mention_words: ['caminhão'], word_use: 'literal', request_language: 'pt' }),
  ex('un anciano pescador y su barca al amanecer', { reasoning: 'An unnamed old fisherman with his boat; literal person.', subject: 'an old fisherman with his boat at dawn', head_noun: 'fisherman', kind: 'person_generic', real_person: false, has_human: true, mention_words: ['anciano pescador'], word_use: 'literal', request_language: 'es' }),
  ex('What happened to the submarine K-129', { reasoning: 'A numbered submarine; a literal vehicle drawn as a submarine.', subject: 'a Soviet K-129 submarine', head_noun: 'submarine', kind: 'vehicle', real_person: false, has_human: false, mention_words: ['submarine K-129'], word_use: 'literal', request_language: 'en' }),
  ex('Where is flight MH370 now', { reasoning: 'A numbered flight; the real airliner is literal, drawn as the plane.', subject: 'a Malaysia Airlines passenger jet', head_noun: 'jet', kind: 'vehicle', real_person: false, has_human: false, mention_words: ['flight MH370'], word_use: 'literal', request_language: 'en' }),
  ex('a vida nas fontes hidrotermais do fundo do mar', { reasoning: 'Life in a place means the living creatures there; literal.', subject: 'creatures living around deep-sea hydrothermal vents', head_noun: 'creatures', kind: 'creature', real_person: false, has_human: false, mention_words: ['vida'], word_use: 'literal', request_language: 'pt' }),
  ex('the village where goats outnumber people', { reasoning: 'Goats are the striking literal animal of the village.', subject: 'goats roaming a mountain village', head_noun: 'goats', kind: 'creature', real_person: false, has_human: false, mention_words: ['goats'], word_use: 'literal', request_language: 'en' }),
  ex('The Paper Boat — a paper boat floats down a flooded street and reaches the sea', { reasoning: 'A story titled after its main object; the paper boat is literal.', subject: 'a paper boat floating down a flooded street', head_noun: 'boat', kind: 'vehicle', real_person: false, has_human: false, mention_words: ['paper boat'], word_use: 'literal', request_language: 'en' }),
  ex("Elvis Presley's first guitar", { reasoning: 'An object that belonged to a named person; the guitar is literal.', subject: 'a vintage acoustic guitar', head_noun: 'guitar', kind: 'object', real_person: false, has_human: false, mention_words: ['guitar'], word_use: 'literal', request_language: 'en' }),
  ex('The Lion King facts you missed', { reasoning: 'About the film The Lion King; Lion is part of a film title, not an animal to draw.', ...nada, mention_words: ['Lion King'], word_use: 'name_or_title', request_language: 'en' }),
  ex('Don\'t be a lone wolf at work', { reasoning: 'Career advice; lone wolf is an idiom for a person, not an animal.', ...nada, mention_words: ['lone wolf'], word_use: 'figurative', request_language: 'en' }),
  ex('Abraham Lincoln\'s last day', { reasoning: 'About a specific real person, Abraham Lincoln.', ...nada, real_person: true, request_language: 'en' }),
  ex('como funcionam os juros compostos', { reasoning: 'Compound interest, an abstract finance topic.', ...nada, request_language: 'pt' }),
]

export const SYSTEM_SUJEITO_0111 = [
  'You read a short request for a video (any language) and name the ONE central physical thing the viewer must SEE, so an English-only image model can draw it.',
  'reasoning: first, in at most 25 English words, say what the video is about and whether its key word is meant literally (the real thing) or is a name/title, an idiom, slang or a verb.',
  'kind "vehicle", "creature" (any animal, pet, monster or creature, alone or in a group), "person_generic" (an unnamed, generic person such as a child, a boy, a diver, a clown) or "object" (an object, building or structure) ONLY when the request is literally about that concrete thing. A question, mystery or list of facts ABOUT a concrete animal, vehicle or object still has that thing as its subject. "Life" in a place or "the secret life of" an animal means the living creatures themselves. A named or numbered vehicle (a flight number, a named ship, a car model) is a vehicle drawn as its plain kind of machine. In a story, the subject is the main character or main object, never a prop or the setting.',
  'kind "none" with subject null when the topic is abstract or has no single concrete physical subject (money, finance, habits, advice, psychology, religion or prayer, news, weather phenomena, a general place or event, a list of facts about a place), or when the only candidate word is part of a name or title (person, company, brand, product, film, series, song, game, band, sports team, weather phenomenon), an idiom or metaphor, slang for a kind of person, a verb, or a foreign word that only looks like an English noun. Never translate a word into a different thing; never draw the animal or object a title or team name alludes to.',
  'real_person true (and subject null) when the central subject is a specific real person, named or clearly identifiable; a named fictional character is kind "none". But an object that belongs to a named person (their crown, hat, guitar, machine) is itself the subject, with real_person false.',
  'subject: a short noun phrase WRITTEN IN ENGLISH (always translate; never copy words of another language), at most 10 words, starting with "a", "an" or "the", built around a plain English common noun (never only a name or number), keeping only the concrete details the request gives. Never add details, characters or objects that are not in the request.',
  'head_noun: the one English common noun, lowercase and exactly as written in subject, that IS the subject (not an adjective or verb before it; never "flight", a name or a number — a flight is drawn as an airplane): "a talking parrot" gives "parrot". Null when subject is null.',
  'has_human: true when the subject is or includes a person of any age. mention_words: the exact word or words copied from the request, in its own language and spelling, that name the subject (empty when kind is "none"). word_use: how those words are used in THIS request — "literal"; "name_or_title" only when they name a person, a work (film, series, book, song, game), a sports team, a company, a brand or a weather phenomenon (the proper name of a ship, flight or other vehicle, and the title of the requested story itself, are "literal"); "figurative"; "verb"; or "none" when kind is "none". request_language: ISO 639-1 code.',
  'Reply with JSON only.',
].join('\n')

const semAcento = (t: string) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const SUJEITO_VALIDO_RE = /^[\p{Script=Latin}\p{N}][\p{Script=Latin}\p{N}\s'’,.-]*$/u

// ─── v6: nome de pessoa real NUNCA entra no texto injetado ──────────────────────────────────────────────────────────────────────
// Revisão adversarial do c5dbdbcf3: a calibração gravou "Napoleon's hat", "a flying machine designed by Leonardo da Vinci" e "a crown
// belonging to King Arthur" — o motor de vídeo pode desenhar a PESSOA (rosto de gente real) em vez do objeto. O objeto fica; o dono sai.
// v7 (revisão do 21d3c2333): também saem "a painting by Pablo Picasso" (by sem verbo), "the Wright brothers' first airplane" / "the
// Kennedy family's yacht" (possessivo depois de substantivo de grupo) e "a guitar Jimi Hendrix smashed" / "a violin Einstein loved"
// (qualquer verbo no passado logo depois do objeto); o artigo é refeito pelo som (an/a) e plural fica sem artigo ("finches", nunca
// "a finches"); "the car that John F. Kennedy rode in" → "the car". FICAM: "of" + nome depois de substantivo de lugar ("the ruins of
// Machu Picchu"), "of the X" ("the flag of the United States"), título + nome antes de navio/árvore/lugar ("a Queen Mary ocean liner",
// "the General Sherman tree"), marca com possessivo ("a McDonald's restaurant", lista fechada), "by" de lugar ("by Lake Como").
// Corte determinístico e estreito, só nos formatos em que um nome próprio é DONO/AUTOR do objeto. Nome de navio, voo, modelo, marca,
// espécie ou lugar SEM esses formatos fica ("the SS St. Louis refugee ship", "a Komodo dragon", "a SpaceX Dragon capsule"). Se o núcleo
// sumir no corte, nada é injetado. LIMITE declarado: nome usado como adjetivo, sem nenhum desses formatos ("a Picasso painting", "a
// Van Gogh painting") fica — sem lista de pessoas é indistinguível de marca/modelo ("a Tesla car"); o motor lê como estilo, não como rosto.
const PALAVRA_DE_NOME = String.raw`\p{Lu}[\p{L}'’.-]*`
const CONECTOR_DE_NOME = String.raw`(?:da|de|del|della|di|du|do|dos|das|van|von|der|den|la|le|bin|ibn|al|el)`
const NOME_PROPRIO = String.raw`${PALAVRA_DE_NOME}(?:\s+(?:${CONECTOR_DE_NOME}\s+)?${PALAVRA_DE_NOME})*`
const TITULO_DE_PESSOA = String.raw`(?:King|Queen|Prince|Princess|Emperor|Empress|Pharaoh|Pope|Sir|Lord|Lady|President|General|Captain|Admiral|Tsar|Czar|Tsarina|Sultan|Duke|Duchess|Count|Countess|Baron|Chief|Dr\.?|Doctor|Professor)`
const TITULO_INICIAL_RE = new RegExp(String.raw`^${TITULO_DE_PESSOA}\s`, 'u')
const VERBO_DE_AUTORIA = String.raw`(?:designed|built|invented|owned|made|created|painted|worn|used|drawn|sculpted|carved|written|commissioned|flown|driven|ridden|played|signed|given|gifted|discovered|found|sung|won|taken|stolen|thrown|broken|held|kept|lost|sold|bought)`
// verbo no passado logo depois do objeto ("the hat Napoleon wore", "a guitar Jimi Hendrix smashed", "a violin Einstein loved"): os
// irregulares mais comuns + qualquer palavra em -ed
const VERBO_NO_PASSADO = String.raw`(?:wore|owned|used|built|designed|invented|drove|flew|rode|played|painted|made|carried|signed|wrote|sang|threw|broke|gave|took|bought|sold|held|kept|lost|found|stole|left|won|drew|ate|read|saw|\p{Ll}{2,}ed)`
const GRUPO_DE_PESSOAS = String.raw`(?:brothers|sisters|family|families|twins|couple|clan|dynasty|household|children|kids|sons|daughters|wife|husband|widow|mother|father|son|daughter|grandmother|grandfather|administration|estate|gang|band)`
const ASTRO = /^(?:Earth|Moon|Sun|Mars|Venus|Jupiter|Saturn|Mercury|Neptune|Uranus|Pluto)$/
// lugar dentro do nome ("the United States", "Death Valley") e primeira palavra de acidente geográfico ("by Lake Como" = à beira do lago)
const PALAVRA_DE_LUGAR = /^(?:States|Kingdom|Republic|Empire|Islands?|Mountains?|Valley|City|Lake|River|Mount|Mt\.?|Ocean|Sea|Canyon|Park|Desert|Bay|Falls|Coast|Peninsula|Strait|Gulf|Union|Emirates|Nations|Cape|Isle|Fort|Port|Glacier|Forest|Reef|Alps|Andes|Himalayas|Sahara|Amazon|Nile)$/
// substantivo de lugar logo antes do "of" ("the ruins of Machu Picchu", "the streets of New York"): o nome depois é lugar, não dono
const LUGAR_ANTES_DO_OF = /(?:^|\s)(?:ruins|flags?|streets|coast|city|map|skyline|shores?|capital|islands?|temples?|walls|harbou?r|ports?|beach(?:es)?|mountains|valley|jungle|desert|towns?|village|kingdom|empire|waters|lakes?|rivers?|landscape|skies|sky|outskirts|heart|center|centre|suburbs)$/i
// navio, árvore, lugar ou obra com nome de gente ("a Queen Mary ocean liner", "the General Sherman tree")
const COISA_COM_NOME_DE_GENTE = /^(?:ocean\s+liner|liner|ship|steamship|steamer|vessel|boat|yacht|cruiser|battleship|carrier|submarine|frigate|schooner|train|locomotive|tree|sequoia|tower|building|bridge|airport|station|hotel|stadium|dam|street|avenue|highway|tunnel|canal|park|hospital|university|college|school|museum|library|theater|theatre|square|island|glacier|mountain|peak|falls|lake|river|crater|reef)(?![\p{L}])/iu
// marca com possessivo no próprio nome ("a McDonald's restaurant"): fica. Lista curta e fechada.
const MARCA_COM_POSSESSIVO = new Set(['McDonald', 'Macy', 'Wendy', 'Denny', 'Kellogg', 'Hershey', 'Domino', 'Arby', 'Chili', 'Applebee', 'Carl', 'Lowe', 'Kohl', 'Sainsbury', 'Levi', 'Dunkin', 'Trader Joe', 'Reese', 'Hardee', 'Nathan'])
const ARTIGO_OU_DETERMINANTE = /^(?:a|an|the|this|that|these|those|his|her|its|their|our|my|your|some|one)$/i

const AUTORIA_RE = new RegExp(String.raw`(?:,\s*|\s+)(?:that\s+|which\s+)?(?:(?:once\s+)?(?:${VERBO_DE_AUTORIA}|\p{Ll}{2,}ed)\s+by|(by)|belong(?:ing|ed|s)\s+to|(of))\s+(the\s+)?(${NOME_PROPRIO})(\s+${GRUPO_DE_PESSOAS}(?![\p{L}]))?`, 'gu')
const NOME_E_VERBO_RE = new RegExp(String.raw`\s+(?:that\s+|which\s+)?(?:the\s+)?(${NOME_PROPRIO})(?:\s+${GRUPO_DE_PESSOAS})?\s+(?:once\s+)?${VERBO_NO_PASSADO}(?![\p{L}])(?:\s+(?:in|on|with|to|from|into|onto|aboard|through|about|for|at)(?=\s*(?:$|[,;.])))?`, 'gu')
const POSSESSIVO_DE_GRUPO_RE = new RegExp(String.raw`(?<![\p{L}\p{N}])(${NOME_PROPRIO})\s+${GRUPO_DE_PESSOAS}(?:['’]s|['’])(?=\s)\s*`, 'gu')
const POSSESSIVO_RE = new RegExp(String.raw`(?<![\p{L}\p{N}])(${NOME_PROPRIO})(?:['’]s|['’])(?=\s)\s*`, 'gu')
const TITULO_E_NOME_RE = new RegExp(String.raw`(?<![\p{L}\p{N}])${TITULO_DE_PESSOA}\s+${NOME_PROPRIO}\s*`, 'gu')
// depois de "by Nome" sem verbo, o nome só é AUTOR se a frase acaba, pontua, ou segue com preposição/relativa/-ing ("a painting by
// Picasso hanging in a museum"); "a boat pulled by Clydesdale horses" (nome como adjetivo de outro substantivo) não tem autor
const DEPOIS_DO_AUTOR = /^\s*(?:$|[,;.)]|(?:in|on|at|with|from|for|of|that|which|who|during|before|after|inside|near|under|over|and|himself|herself|themselves)(?![\p{L}])|\p{Ll}+ing(?![\p{L}]))/u

const palavrasDe = (t: string) => t.split(/\s+/).filter(Boolean)
const ehLugar = (nome: string) => palavrasDe(nome).some((w) => PALAVRA_DE_LUGAR.test(w))
const ehAstro = (nome: string) => palavrasDe(nome).every((w) => ASTRO.test(w))
const somDeVogal = (w: string) => /^(?:hour|honest|honou?r|heir)/i.test(w) || (/^[aeiou]/i.test(w) && !/^(?:uni|use|usu|uti|eu|one|once|ur[aeio])/i.test(w))
const ehPlural = (w: string) => {
  const n = w.toLowerCase()
  if (n in IRREGULARES) return false
  if (n in SINGULAR_IRREGULAR) return true
  return /[^aeiou]men$/.test(n) || (/s$/.test(n) && !/(?:ss|us|is|ics)$/.test(n))
}

/** O sujeito sem o nome de pessoa que é dono/autor do objeto ("Napoleon's historic hat" → "a historic hat"). Sem nome = o mesmo texto. */
export function semNomeDePessoa(subject: string, nucleo?: string | null): string {
  const entrada = String(subject ?? '')
  // o artigo do começo nunca é nome ("The Titanic's lifeboats": o artigo fica, o "Titanic's" sai)
  const base = entrada.replace(/^(A|An|The)\s/, (m) => m.toLowerCase())
  let s = base
  s = s.replace(AUTORIA_RE, (todo: string, porSo: string | undefined, de: string | undefined, oArtigo: string | undefined, nome: string, grupo: string | undefined, offset: number, tudo: string) => {
    if (de) {
      // "of King Arthur" e "of Leonardo da Vinci" (2+ palavras, sem "the") saem; "of the Titanic", "of the United States", "of Mars",
      // "of Einstein" (1 palavra: pode ser lugar ou navio) e "the ruins of Machu Picchu" (lugar antes do of) ficam
      if (TITULO_INICIAL_RE.test(nome + ' ')) return ''
      if (oArtigo || palavrasDe(nome).length < 2 || ehLugar(nome) || LUGAR_ANTES_DO_OF.test(tudo.slice(0, offset))) return todo
      return ''
    }
    // "by" sozinho também é "à beira de": "by Lake Como", "by the Thames" ficam
    if (porSo && ((oArtigo && !grupo) || ehLugar(nome) || ehAstro(nome))) return todo
    // autor só se a frase seguir como frase de autor ("a boat pulled by Clydesdale horses": o nome é adjetivo de "horses", fica)
    return DEPOIS_DO_AUTOR.test(tudo.slice(offset + todo.length)) ? '' : todo
  })
  s = s.replace(NOME_E_VERBO_RE, (todo: string, nome: string, offset: number, tudo: string) => {
    // só logo depois do OBJETO ("the hat Napoleon wore"), nunca logo depois do artigo ("the Golden Gate Bridge painted red")
    const antes = palavrasDe(tudo.slice(0, offset)).pop() ?? ''
    if (!antes || ARTIGO_OU_DETERMINANTE.test(antes) || !/^\p{Ll}/u.test(antes) || ehLugar(nome) || ehAstro(nome)) return todo
    return ''
  })
  s = s.replace(POSSESSIVO_DE_GRUPO_RE, (todo: string, nome: string) => (ehLugar(nome) ? todo : ''))
  s = s.replace(POSSESSIVO_RE, (todo: string, nome: string) => (ehAstro(nome) || MARCA_COM_POSSESSIVO.has(nome) ? todo : ''))
  s = s.replace(TITULO_E_NOME_RE, (todo: string, offset: number, tudo: string) => (COISA_COM_NOME_DE_GENTE.test(tudo.slice(offset + todo.length)) ? todo : ''))
  s = s.replace(/\s+/g, ' ').replace(/[\s,]+$/, '').replace(/\s+(?:of|by|to|from|with|and|that|which)$/i, '').trim()
  if (s === base) return entrada
  // o artigo: a/an pelo som da palavra que ficou (nunca "a ocean liner"), e o que o corte levou volta ("Napoleon's hat" → "a hat");
  // plural fica sem artigo ("Darwin's finches" → "finches", nunca "a finches")
  const comArtigo = /^(a|an)\s+(\S+)/i.exec(s)
  if (comArtigo) return `${somDeVogal(comArtigo[2]) ? 'an' : 'a'} ${s.slice(comArtigo[1].length + 1)}`
  if (!s || /^the\s/i.test(s)) return s
  const h = String(nucleo ?? '').trim() || (palavrasDe(s.split(/\s+(?:in|on|at|of|with|from|that|which|who)\s+/i)[0]).pop() ?? '')
  if (ehPlural(h)) return s
  return `${somDeVogal(s) ? 'an' : 'a'} ${s}`
}

// v6: palavra que é a MESMA em inglês e na língua do pedido ("o hamster", "o táxi"): o sujeito em inglês é igual a ela, e isso não é
// "copiado sem traduzir". Lista curta e fechada — só serve para não descartar esses casos; nunca cria sujeito.
const MESMA_PALAVRA_EM_INGLES = new Set(['hamster', 'taxi', 'robot', 'drone', 'panda', 'koala', 'gorilla', 'jaguar', 'piano', 'radio', 'sofa', 'hotel', 'pizza', 'chocolate', 'mosquito', 'iguana', 'puma', 'chihuahua', 'poodle', 'pug', 'husky', 'alpaca', 'llama', 'yacht', 'kayak', 'tablet', 'laptop', 'smartphone', 'skate', 'jeep', 'trailer', 'container', 'satellite'])

/** Lê e VALIDA a resposta do modelo. Fora do formato = null (falha segura). Sujeito mal formado/sem âncora no pedido = descartado (com motivo). */
export function lerLeituraDoSujeito(bruto: unknown, pedido: string): LeituraDoSujeito | null {
  if (!bruto || typeof bruto !== 'object') return null
  const o = bruto as Record<string, unknown>
  if (!KINDS.includes(o.kind as KindDoSujeito) || typeof o.real_person !== 'boolean' || typeof o.has_human !== 'boolean') return null
  if (!USOS.includes(o.word_use as UsoDaPalavra) || typeof o.request_language !== 'string' || typeof o.reasoning !== 'string') return null
  if (o.subject !== null && typeof o.subject !== 'string') return null
  if (o.head_noun !== null && typeof o.head_noun !== 'string') return null
  if (!Array.isArray(o.mention_words) || o.mention_words.some((w) => typeof w !== 'string')) return null
  // "null" escrito como texto (visto na calibração real) é null
  const texto = (v: unknown) => { const s = typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : ''; return s && s.toLowerCase() !== 'null' ? s : null }
  const leitura: LeituraDoSujeito = {
    reasoning: o.reasoning.replace(/\s+/g, ' ').trim().slice(0, 300), word_use: o.word_use as UsoDaPalavra,
    subject: texto(o.subject)?.replace(/[.\s]+$/, '') ?? null,
    head_noun: texto(o.head_noun)?.toLowerCase() ?? null,
    kind: o.kind as KindDoSujeito, has_human: o.has_human, real_person: o.real_person,
    mention_words: (o.mention_words as string[]).map((w) => w.trim()).filter(Boolean).slice(0, 6),
    request_language: o.request_language.trim().toLowerCase().slice(0, 8), descartado: null, subject_original: null,
  }
  const descarta = (motivo: string) => ({ ...leitura, subject: null, descartado: motivo })
  if (leitura.real_person) return descarta('pessoa_real')
  if (leitura.word_use !== 'literal') return descarta(`uso_${leitura.word_use}`)
  if (leitura.kind === 'none' || !leitura.subject) return descarta('sem_sujeito')
  const s = leitura.subject
  if (Array.from(s).length > 90 || s.split(/\s+/).length > 12 || !SUJEITO_VALIDO_RE.test(s)) return descarta('sujeito_mal_formado')
  // o núcleo é UMA palavra minúscula que está no próprio sujeito ("parrot" em "a talking parrot"); fora disso o motor não tem o que provar
  const h = leitura.head_noun
  if (!h || !NUCLEO_RE.test(h) || !s.split(/[^\p{L}-]+/u).includes(h)) return descarta('sem_nucleo')
  // v6: o nome da pessoa dona/autora do objeto sai do texto que vai para o motor; se o núcleo sumir junto, nada é injetado
  const semNome = semNomeDePessoa(s, h)
  if (semNome !== s) {
    leitura.subject_original = s
    if (!semNome.split(/[^\p{L}-]+/u).includes(h)) return descarta('nome_de_pessoa_no_sujeito')
    leitura.subject = semNome
  }
  return validarAncora(leitura, pedido, descarta)
}

function validarAncora(leitura: LeituraDoSujeito, pedido: string, descarta: (motivo: string) => LeituraDoSujeito): LeituraDoSujeito {
  const s = leitura.subject ?? ''
  // sujeito COPIADO sem traduzir de pedido em outra língua ("a moeda", "a menina"): o motor só lê inglês. A língua é a que o modelo leu;
  // pedido em inglês nunca cai aqui ("Leonardo da Vinci's flying machine" passa).
  const conteudo = (t: string) => semAcento(t).replace(/[^\p{L}\p{N}]+/gu, ' ').split(' ').filter((w) => w.length >= 3 && !['the', 'and', 'with'].includes(w))
  const doPedido = new Set(conteudo(pedido))
  const palavrasDoSujeito = conteudo(s)
  if (leitura.request_language !== 'en' && palavrasDoSujeito.length > 0 && palavrasDoSujeito.every((w) => doPedido.has(w)) && !palavrasDoSujeito.every((w) => MESMA_PALAVRA_EM_INGLES.has(w))) return descarta('sujeito_sem_traducao')
  // âncora anti-invenção: uma citação INTEIRA (todas as palavras dela) está no pedido, ou uma palavra de conteúdo do próprio sujeito está
  // no pedido (sem acento, sem caixa). Prova só que o sujeito sai de palavras do pedido — o SENTIDO é do modelo (ver calibração).
  const p = ` ${semAcento(pedido).replace(/[^\p{L}\p{N}]+/gu, ' ')} `
  const noPedido = (w: string) => p.includes(` ${w} `) || (w.length >= 5 && p.includes(` ${w.replace(/s$/, '')}`))
  const citacaoInteira = leitura.mention_words.some((m) => { const ws = conteudo(m); return ws.length > 0 && ws.every(noPedido) })
  if (!citacaoInteira && !palavrasDoSujeito.some(noPedido)) return descarta('sem_ancora_no_pedido')
  return leitura
}

/** A chamada semântica sobre o PEDIDO ORIGINAL (nunca o roteiro). Falha = { ok: false } e nada é injetado. */
export async function lerSujeitoDoPedido(pedido: string, opts: OpcoesSemanticas = {}): Promise<ResultadoSemantico<LeituraDoSujeito>> {
  const texto = String(pedido ?? '').replace(/\s+/g, ' ').trim().slice(0, 600)
  return perguntaSemantica(
    { system: SYSTEM_SUJEITO_0111, user: `Video request:\n${texto}`, nome: 'sujeito_do_pedido', schema: SCHEMA_SUJEITO as unknown as Record<string, unknown>, maxTokens: 260, exemplos: EXEMPLOS_SUJEITO_0111, ler: (o) => lerLeituraDoSujeito(o, texto) },
    { timeoutMs: 4_000, tentativasExtras: 1, prazoTotalMs: 8_500, ...opts },
  )
}

// ─── O sujeito e a cena ─────────────────────────────────────────────────────────────────────────────────────────────────────────
export type TipoDoSujeito = 'veiculo' | 'criatura' | 'pessoa' | 'objeto'
const TIPO_DO_KIND: Readonly<Record<Exclude<KindDoSujeito, 'none'>, TipoDoSujeito>> = { vehicle: 'veiculo', creature: 'criatura', person_generic: 'pessoa', object: 'objeto' }

export interface SujeitoObrigatorio {
  /** O que o motor tem de desenhar, em inglês: "a C-54 Skymaster airplane", "a child holding a 3D printing pen". */
  frase: string
  tipo: TipoDoSujeito
  /** As famílias (inglês) que provam que o prompt já mostra o sujeito — todas têm de aparecer. */
  chaves: RegExp[]
  /** Fichas de modelo ("C-54") que também provam presença. */
  tokens: string[]
  /** As palavras do pedido que nomeiam o sujeito (escolha da cena pela fala, em qualquer língua). */
  mencoes: string[]
  origem: 'pedido'
}

const p = (fonte: string) => new RegExp(`(?<![\\p{L}\\p{N}])(?:${fonte})(?![\\p{L}\\p{N}])`, 'iu')
// O que, em inglês, prova que o prompt da cena já mostra o sujeito (o prompt do descritor é sempre inglês) — sinônimos lidos sobre a
// FRASE do sujeito (inglês, escrita pelo modelo), nunca sobre o pedido. Sem palavras ambíguas: "chest" sozinho é peito, "jet" sozinho
// é jato d'água, "girl/boy" pode ser adulto.
const CHAVES: Readonly<Record<string, RegExp>> = {
  aircraft: p(String.raw`airplanes?|aeroplanes?|planes?|aircraft|airliners?|jetliners?|fighter\s+jets?|jet\s+(?:planes?|aircraft|airliners?)|bombers?|seaplanes?|fuselage`),
  helicopter: p('helicopters?'), submarine: p('submarines?'),
  watercraft: p(String.raw`ships?|shipwrecks?|vessels?|ocean\s+liners?|galleons?|warships?|boats?|sailboats?|yachts?|hull`),
  spacecraft: p(String.raw`rockets?|spacecraft|spaceships?|space\s+probes?|(?:space|crew|dragon)\s+capsules?`), rover: p('rovers?'),
  train: p('trains?|locomotives?'), car: p('cars?|automobiles?'), truck: p('trucks?'), bus: p('bus(?:es)?'),
  motorcycle: p('motorcycles?|motorbikes?'), bicycle: p('bicycles?|bikes?'), balloon: p('balloons?|zeppelins?|airships?'),
  under_ice_life: p(String.raw`(?:creatures?|life|fish|animals?|organisms?|krill|jellyfish)\b[^.]{0,60}\b(?:beneath|under|below)\b[^.]{0,30}\bice`),
  whale: p('whales?'), shark: p('sharks?'), squid: p('squids?'), octopus: p('octopus(?:es)?|octopi'), dinosaur: p('dinosaurs?|t-?rex'),
  komodo: p(String.raw`komodo(?:\s+dragons?)?|monitor\s+lizards?`), dragon: p('dragons?'), robot: p('robots?|androids?'), alien: p('aliens?|extraterrestrials?'),
  child: p(String.raw`child(?:ren)?|kids?|toddlers?|schoolchildren|(?:little|young|small)\s+(?:boys?|girls?)|(?:boys?|girls?),?\s+(?:aged\s+)?(?:[4-9]|1[0-2])(?:-year-old)?|(?:[4-9]|1[0-2])-year-old\s+(?:boys?|girls?)`),
  diver: p('divers?'), astronaut: p('astronauts?|cosmonauts?'),
  pen3d: p(String.raw`3d\s+(?:printing\s+)?pens?`),
  treasure: p(String.raw`treasures?|treasure\s+chests?|chests?\s+(?:of|full\s+of|filled\s+with|overflowing\s+with)\s+(?:gold|coins|jewels|treasure)|gold\s+coins|jewels`),
  meteorite: p('meteorites?|asteroids?'), sword: p('swords?'), crown: p('crowns?'), statue: p('statues?'),
}
const escapa = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Plurais irregulares do núcleo (o resto sai pela regra de -s/-es/-ies/-ves).
const IRREGULARES: Readonly<Record<string, string>> = { child: 'children', person: 'people', mouse: 'mice', goose: 'geese', tooth: 'teeth', foot: 'feet', ox: 'oxen', cactus: 'cacti', octopus: 'octopi', fungus: 'fungi', sheep: 'sheep', deer: 'deer', fish: 'fish', moose: 'moose', bison: 'bison', aircraft: 'aircraft', spacecraft: 'spacecraft' }
const SINGULAR_IRREGULAR: Readonly<Record<string, string>> = Object.fromEntries(Object.entries(IRREGULARES).map(([s, pl]) => [pl, s]))

/** Singular e plural do núcleo, sem amputar ("creatures" → creature|creatures, "puppies" → puppy|puppies, "fisherman" → fisherman|fishermen, "wolves" → wolf|wolves). */
function formasDoNucleo(nucleo: string): string {
  const n = nucleo.toLowerCase()
  const formas = new Set<string>([n])
  if (IRREGULARES[n]) formas.add(IRREGULARES[n])
  else if (SINGULAR_IRREGULAR[n]) formas.add(SINGULAR_IRREGULAR[n])
  else if (/men$/.test(n) && n.length > 4) formas.add(n.replace(/men$/, 'man'))
  else if (/man$/.test(n) && n.length > 4) formas.add(n.replace(/man$/, 'men'))
  else {
    let raiz = n
    if (/[^aeiou]ies$/.test(n)) raiz = n.slice(0, -3) + 'y'
    else if (/(?:s|x|z|ch|sh)es$/.test(n)) raiz = n.slice(0, -2)
    // v7: -ves volta a UM singular ("wolves" → wolf, "knives" → knife), nunca às duas formas ("wolfe"/"wolfes" saíam no 21d3c2333)
    else if (/ves$/.test(n) && n.length > 4) raiz = /ives$/.test(n) ? n.slice(0, -3) + 'fe' : n.slice(0, -3) + 'f'
    else if (/[^s]s$/.test(n) && n.length > 3) raiz = n.slice(0, -1)
    formas.add(raiz)
    if (raiz === n) formas.add(/[^aeiou]y$/.test(raiz) ? raiz.slice(0, -1) + 'ies' : /(?:s|x|z|ch|sh)$/.test(raiz) ? raiz + 'es' : /(?:[^f]f|fe)$/.test(raiz) ? raiz.replace(/fe?$/, 'ves') : raiz + 's')
    if (raiz === n && /[^f]f$/.test(raiz)) formas.add(raiz + 's') // "roof" → roofs (e roves, inofensivo); "knife" nunca vira "knifes"
  }
  return [...formas].map(escapa).join('|')
}

// v6: o modificador colado ao núcleo que MUDA o que se vê ("a flying car" não é "cars in traffic", "a paper boat" não é "a boat").
// Tamanho, humor e ação ("giant", "talking", "sleeping") não entram: o motor desenha o bicho/objeto do mesmo jeito.
// v7: material de brinquedo também muda o que se vê ("a Lego car" não é "cars stuck in traffic").
const MODIFICADOR_VISUAL = String.raw`flying|robot|robotic|mechanical|toy|paper|origami|ghost|ghostly|zombie|skeleton|cyborg|astronaut|lego|clay|plush|stuffed|cardboard|inflatable`
// v7: núcleo com gênero ("a 7-year-old boy"): a família "child" não o substitui — "a young girl running" não prova o menino.
const NUCLEO_COM_GENERO = /^(?:boys?|girls?)$/
const NUCLEO_RE = /^\p{Ll}{3,}(?:-\p{Ll}+)?$/u
const comFlagG = (re: RegExp) => new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g')
const ou = (res: RegExp[]) => res.length === 1 ? res[0] : new RegExp(res.map((r) => `(?:${r.source})`).join('|'), 'iu')

/**
 * As chaves que provam presença no prompt — TODAS têm de aparecer.
 * v6 (revisão adversarial do c5dbdbcf3: "a dog waiting at a train station" ficava presente só com "train"): o NÚCLEO que o modelo
 * apontou (head_noun — o bicho, a pessoa ou o objeto principal) é SEMPRE exigido. Uma família de sinônimos só substitui a forma do
 * núcleo quando a citação dela na frase CONTÉM o núcleo ("a C-54 airplane" → aircraft, "a Komodo dragon" → komodo/monitor lizard,
 * "creatures beneath the ice" → criaturas DEBAIXO do gelo); as outras famílias da frase (a caneta 3D da criança, o meteorito do
 * menino) só reforçam — são exigidas JUNTO com o núcleo, nunca no lugar dele. O modificador visual colado ao núcleo ("flying car",
 * "astronaut cat") também é exigido. Sem núcleo válido = [] (nada a provar; a leitura já foi descartada como sem_nucleo).
 */
export function chavesDoSujeito(frase: string, nucleo?: string | null): RegExp[] {
  const h = String(nucleo ?? '').trim().toLowerCase()
  if (!NUCLEO_RE.test(h)) return []
  const ondeNucleo = [...frase.matchAll(new RegExp(`(?<![\\p{L}\\p{N}-])${escapa(h)}(?![\\p{L}\\p{N}-])`, 'giu'))].map((m) => [m.index ?? 0, (m.index ?? 0) + m[0].length] as const)
  if (ondeNucleo.length === 0) return []
  const grupos = Object.entries(CHAVES).filter(([, re]) => re.test(frase)).map(([g]) => g)
  const finais = grupos.includes('komodo') ? grupos.filter((g) => g !== 'dragon') : grupos
  const cobreONucleo = (g: string) => [...frase.matchAll(comFlagG(CHAVES[g]))].some((m) => ondeNucleo.some(([a, b]) => (m.index ?? 0) <= a && (m.index ?? 0) + m[0].length >= b))
  const doNucleo = finais.filter(cobreONucleo)
  const chaveDoNucleo = doNucleo.length && !NUCLEO_COM_GENERO.test(h) ? ou(doNucleo.map((g) => CHAVES[g])) : p(formasDoNucleo(h))
  const reforcos = finais.filter((g) => !doNucleo.includes(g)).map((g) => CHAVES[g])
  const mod = new RegExp(`(?<![\\p{L}\\p{N}])(${MODIFICADOR_VISUAL})[\\s-]+${escapa(h)}(?![\\p{L}\\p{N}])`, 'iu').exec(frase)?.[1]?.toLowerCase()
  const chaveDoMod = mod && !reforcos.some((re) => re.test(mod)) && !chaveDoNucleo.test(mod) ? [p(escapa(mod))] : []
  return [chaveDoNucleo, ...reforcos, ...chaveDoMod]
}

const limpa = (s: unknown) => String(s ?? '').replace(/\s+/g, ' ').trim()

/** A leitura semântica vira o sujeito — ou o MOTIVO de não virar (gravado no relato: nada some em silêncio). */
export function avaliarSujeito(args: { leitura: ResultadoSemantico<LeituraDoSujeito> | null; pessoaPermitida?: boolean }): { sujeito: SujeitoObrigatorio | null; motivo: string | null } {
  const r = args.leitura
  if (!r) return { sujeito: null, motivo: 'leitura_nao_chamada' }
  if (!r.ok) return { sujeito: null, motivo: `leitura_falhou:${r.erro}` }
  const l = r.valor
  if (l.descartado) return { sujeito: null, motivo: l.descartado }
  if (!l.subject || l.real_person || l.kind === 'none') return { sujeito: null, motivo: 'sem_sujeito' }
  // romance/pedido adulto (pessoaPermitida=false): gente genérica nunca vira sujeito obrigatório (nunca "a boy" num pedido adulto).
  // Gente = o kind, o has_human do modelo ou criança escrita na frase — qualquer um dos três.
  const ehGente = l.kind === 'person_generic' || l.has_human || CHAVES.child.test(l.subject)
  if (ehGente && args.pessoaPermitida === false) return { sujeito: null, motivo: 'gente_em_pedido_adulto' }
  const chaves = chavesDoSujeito(l.subject, l.head_noun)
  const tokens = [...l.subject.matchAll(/(?<![\p{L}\p{N}-])\p{Lu}{1,3}-\d{1,4}\p{Lu}?(?![\p{L}\p{N}])/gu)].map((m) => m[0])
  if (chaves.length === 0 && tokens.length === 0) return { sujeito: null, motivo: 'sem_chave_de_presenca' }
  return { sujeito: { frase: l.subject, tipo: ehGente ? 'pessoa' : TIPO_DO_KIND[l.kind], chaves, tokens, mencoes: l.mention_words, origem: 'pedido' }, motivo: null }
}

/** A leitura semântica vira o sujeito (null = nada a injetar; o motivo está em avaliarSujeito). */
export function sujeitoObrigatorio(args: { leitura: ResultadoSemantico<LeituraDoSujeito> | null; pessoaPermitida?: boolean }): SujeitoObrigatorio | null {
  return avaliarSujeito(args).sujeito
}

/** O prompt (inglês) já mostra o sujeito? Todas as chaves (criança E caneta) ou uma ficha do modelo ("C-54"). */
export function promptMostraOSujeito(prompt: string, s: SujeitoObrigatorio): boolean {
  const t = String(prompt ?? '')
  if (s.tokens.some((tk) => new RegExp(`(?<![\\p{L}\\p{N}])${escapa(tk)}(?![\\p{L}\\p{N}])`, 'iu').test(t))) return true
  return s.chaves.length > 0 && s.chaves.every((re) => re.test(t))
}

/** A fala cita o sujeito? A palavra do próprio pedido (qualquer língua), a ficha do modelo, ou a família em inglês. */
function falaCita(fala: string, s: SujeitoObrigatorio): boolean {
  const t = String(fala ?? '')
  if (s.tokens.some((tk) => t.includes(tk))) return true
  const f = ` ${semAcento(t).replace(/[^\p{L}\p{N}]+/gu, ' ')} `
  if (s.mencoes.some((m) => { const w = semAcento(m).replace(/[^\p{L}\p{N}]+/gu, ' ').trim(); return w.length >= 3 && f.includes(` ${w} `) })) return true
  return s.chaves.length > 0 && s.chaves.every((re) => re.test(t))
}

/**
 * O texto é curto o bastante para ser um PEDIDO (não um roteiro): até 280 caracteres e 45 palavras, sem pistas entre colchetes
 * ([Pexels: …], [faceless]) e sem cabeçalho de seção (HOOK:, PAYOFF:). Roteiro, história colada e texto estruturado = false.
 */
const CABECALHO_DE_SECAO = /(?:^|\n)\s*(?:HOOK|GANCHO|MICRO\s+REWARD|MICRO\s+RECOMPENSA|ESCALATION|ESCALADA|RHYTHM|RITMO|PAYOFF|PAGAMENTO|RECOMPENSA\s+FINAL)\b\s*\d*\s*(?:\([^)]*\))?\s*:/i
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
 * Qualquer outra coisa: null — nada é corrigido (e a chamada semântica nem sai).
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
  /** Por que não houve sujeito (leitura_falhou:prazo, sem_sujeito, pessoa_real, sem_nucleo, gente_em_pedido_adulto…); null = houve. */
  motivo_sem_sujeito: string | null
  /** De onde veio o pedido original (null = não havia pedido confiável: nada foi corrigido e a chamada não saiu). */
  fonte_do_pedido: FonteDoPedido | null
  motivo_do_pedido: string
  /** A leitura semântica crua, para auditoria (null = não chamada). */
  leitura: { ok: boolean; erro: string | null; ms: number; model: string; tentativas: number; reasoning: string | null; word_use: UsoDaPalavra | null; subject: string | null; head_noun: string | null; kind: KindDoSujeito | null; has_human: boolean | null; real_person: boolean | null; mention_words: string[]; request_language: string | null; descartado: string | null; subject_original: string | null } | null
  ja_presente: boolean
  corrigido: boolean
  /** Cena corrigida, 1-based (null = nada corrigido). */
  cena: number | null
  keyframe_removido: boolean
}

function relatoDaLeitura(r: ResultadoSemantico<LeituraDoSujeito> | null): RelatoSujeitoK4['leitura'] {
  if (!r) return null
  if (!r.ok) return { ok: false, erro: r.erro, ms: r.ms, model: r.model, tentativas: r.tentativas, reasoning: null, word_use: null, subject: null, head_noun: null, kind: null, has_human: null, real_person: null, mention_words: [], request_language: null, descartado: null, subject_original: null }
  const v = r.valor
  return { ok: true, erro: null, ms: r.ms, model: r.model, tentativas: r.tentativas, reasoning: v.reasoning, word_use: v.word_use, subject: v.subject, head_noun: v.head_noun, kind: v.kind, has_human: v.has_human, real_person: v.real_person, mention_words: v.mention_words, request_language: v.request_language, descartado: v.descartado, subject_original: v.subject_original }
}

/** A checagem antes do POST pago do Kling 4: o sujeito do PEDIDO ORIGINAL em pelo menos 1 cena do multi_prompt — corrige, nunca bloqueia. */
export function exigirSujeitoNoKling4(args: {
  pedido: PedidoDoSujeito; leitura: ResultadoSemantico<LeituraDoSujeito> | null; falas: ReadonlyArray<string>; prompts: ReadonlyArray<string>; stills?: ReadonlyArray<string | null>; pessoaPermitida?: boolean
}): { prompts: string[]; stills: (string | null)[]; relato: RelatoSujeitoK4 } {
  const prompts = [...args.prompts]
  const stills = [...(args.stills ?? [])]
  const avaliado = args.pedido.pedido ? avaliarSujeito({ leitura: args.leitura, pessoaPermitida: args.pessoaPermitida }) : { sujeito: null, motivo: 'sem_pedido' }
  const s = avaliado.sujeito
  const relato: RelatoSujeitoK4 = { versao: SUJEITO_K4_VERSAO, sujeito: s?.frase ?? null, tipo: s?.tipo ?? null, origem: s?.origem ?? null, motivo_sem_sujeito: avaliado.motivo, fonte_do_pedido: args.pedido.fonte, motivo_do_pedido: args.pedido.motivo, leitura: relatoDaLeitura(args.leitura), ja_presente: false, corrigido: false, cena: null, keyframe_removido: false }
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

/**
 * O passo inteiro da rota (chamado DEPOIS da reserva do teste e só com as 3 cenas do Kling 4): lê o sujeito do pedido original
 * (rede) e aplica a checagem. Nunca lança — qualquer erro inesperado devolve prompts e imagens intactos, com o motivo no relato.
 */
export async function sujeitoNoKling4(args: {
  pedido: PedidoDoSujeito; falas: ReadonlyArray<string>; prompts: ReadonlyArray<string>; stills?: ReadonlyArray<string | null>; pessoaPermitida?: boolean
}, opts: OpcoesSemanticas = {}): Promise<{ prompts: string[]; stills: (string | null)[]; relato: RelatoSujeitoK4 }> {
  try {
    const leitura = args.pedido.pedido ? await lerSujeitoDoPedido(args.pedido.pedido, opts) : null
    return exigirSujeitoNoKling4({ ...args, leitura })
  } catch (e) {
    const relato: RelatoSujeitoK4 = { versao: SUJEITO_K4_VERSAO, sujeito: null, tipo: null, origem: null, motivo_sem_sujeito: `erro_inesperado:${e instanceof Error ? e.name : 'desconhecido'}`, fonte_do_pedido: args.pedido.fonte, motivo_do_pedido: args.pedido.motivo, leitura: null, ja_presente: false, corrigido: false, cena: null, keyframe_removido: false }
    return { prompts: [...args.prompts], stills: [...(args.stills ?? [])], relato }
  }
}
