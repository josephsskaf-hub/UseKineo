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
// v8 (revisão do c04a09837 — o filtro DEPOIS_DO_AUTOR deixava "built by Galileo Galilei", "used by Abraham Lincoln", "the one James
// Dean drove" voltarem ao prompt pago, e nome com epíteto virava texto quebrado: "an Alexander the helmet", "a Joan of sword").
// DECISÃO SIMPLES: o corte cirúrgico do nome (semNomeDePessoa e suas exceções de lugar/navio/marca) SAIU. O texto injetado é um campo
// PRÓPRIO que o modelo escreve, subject_visual_no_people — só o objeto/veículo/criatura com o que se vê, sem nenhum nome próprio — e
// o código o valida (visualSemPessoas): corta tudo a partir de by/belonging to/owned/used/designed/built/that/which/who/once…;
// possessivo, palavra com inicial maiúscula sem dígito ("C-54" e "3D" ficam) ou palavra que o próprio subject escreveu com maiúscula
// (nome escondido em minúscula) = nada injetado; resto quebrado (artigo duplo, artigo ou preposição no fim, núcleo fora) = nada
// injetado. Falha segura sempre: na dúvida, a cena fica como estava. Prompt mudou → calibração refeita contra a API (respostas reais).
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

export const SUJEITO_K4_VERSAO = 'k4_sujeito_0111_v8_semantico' as const

// ═══ KINEO-SUJEITO-APARENCIA-1311 [CEO 13/11, gato ninja 7f92fe17: "a cor, a espécie e o lugar que o cliente escreveu têm de chegar a TODOS os
// planos, com ou sem nome próprio"] — "рыжий кот ниндзя бежит по крышам" foi lido como "a ninja cat running on rooftops": o leitor perdeu o
// "рыжий" (ruivo) e, como o gato já aparecia num plano, nada foi injetado; os planos 2 e 3 (metades de cena) saíram "cat jumping rooftop",
// sem cor e na rua. Duas peças, atrás de SUJEITO_APARENCIA_1311 ('off' = byte a byte o de hoje):
//   (a) uma pergunta SEPARADA e pequena (lerAparenciaDoSujeito), feita DEPOIS do sujeito decidido, devolve só a cor/pelagem/marca/pele/
//       roupa/material que o PEDIDO escreve para aquele sujeito, em inglês. O leitor do sujeito NÃO muda: no ensaio A/B de 13/11, pôr o
//       campo dentro dele mexeu na decisão do sujeito em 5 pedidos estáveis (vampiro, menino do mapa, Voynich, baobá, "bunker being").
//       A frase injetada vira "<visual> (<aparência>)" quando a aparência ainda não está nela.
//   (b) sem ficha de personagem em nenhum plano, o sujeito completo vai a TODO plano do Kling 4 que ainda não o traz (sem cortar a ação:
//       plano que não cabe fica como está), e lib/kling4QuatroPlanos leva a mesma linha a cada metade de cena.
// Ensaio: scripts/ensaio-sujeito-aparencia-1311.mjs (pedidos reais). Guardião: scripts/test-sujeito-aparencia-1311.mjs.
export type ModoSujeitoAparencia = 'off' | 'all'
export const SUJEITO_APARENCIA_1311: ModoSujeitoAparencia = 'all'
export const sujeitoAparenciaLigada = (modo: ModoSujeitoAparencia = SUJEITO_APARENCIA_1311): boolean => modo === 'all'
export const MARCA_SUJEITO_NA_CENA = 'Main subject clearly visible in frame:'

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
  /** KINEO-PROTAGONISTA-1311 (item 4) — a leitura do sujeito já feita neste filme (antes da decisão do modo): mesmo texto = devolve ela, sem 2ª chamada. */
  leituraPronta?: { texto: string; resultado: ResultadoSemantico<LeituraDoSujeito> }
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
  /** Sintagma em inglês como o modelo leu o pedido ("Napoleon's hat", "a Komodo dragon"); auditoria e âncora — NUNCA vai ao motor. */
  subject: string | null
  /** v8: o que o motor desenha — só o objeto/veículo/criatura e o que se vê, sem nome próprio ("a black bicorne hat"), JÁ validado por
   *  visualSemPessoas; null = nada a injetar. */
  subject_visual: string | null
  /** v8: o campo subject_visual_no_people como o modelo escreveu (auditoria; null = não escreveu). */
  subject_visual_no_people: string | null
  /** O substantivo comum inglês no centro do sujeito ("parrot", "cart", "creatures"), escrito no subject_visual — prova presença no prompt. */
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
  /** KINEO-SUJEITO-APARENCIA-1311 — a cor/pelagem/marca/roupa/material que o PEDIDO escreve para o sujeito, em inglês minúsculo, lida por uma
   *  pergunta SEPARADA (lerAparenciaDoSujeito) depois do sujeito decidido; ausente/null = o pedido não escreve nenhuma ou o interruptor está off. */
  appearance?: string | null
}

const KINDS: ReadonlyArray<KindDoSujeito> = ['object', 'vehicle', 'creature', 'person_generic', 'none']
// A ordem dos campos é a ordem em que o modelo escreve: uma leitura curta (reasoning) ANTES da decisão, e a conferência das palavras do
// pedido e do uso delas (word_use) DEPOIS — o código só aceita word_use "literal".
const SCHEMA_SUJEITO = {
  type: 'object', additionalProperties: false,
  required: ['reasoning', 'subject', 'head_noun', 'subject_visual_no_people', 'kind', 'real_person', 'has_human', 'mention_words', 'word_use', 'request_language'],
  properties: {
    reasoning: { type: 'string' },
    subject: { type: ['string', 'null'] },
    head_noun: { type: ['string', 'null'] },
    subject_visual_no_people: { type: ['string', 'null'] },
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
const nada = { subject: null, head_noun: null, subject_visual_no_people: null, kind: 'none', real_person: false, has_human: false, mention_words: [] as string[], word_use: 'none' }
// v8: subject_visual_no_people logo depois do subject — o mesmo objeto, só pelo que se vê, sem nome próprio nenhum (dono, autor, marca,
// navio, lugar, espécie com nome); código com dígito ("K-129") pode ficar.
export const EXEMPLOS_SUJEITO_0111: ReadonlyArray<{ user: string; assistant: string }> = [
  ex('Why do octopuses have three hearts', { reasoning: 'About octopuses, the animal itself; the word is literal.', subject: 'an octopus', head_noun: 'octopus', subject_visual_no_people: 'an octopus', kind: 'creature', real_person: false, has_human: false, mention_words: ['octopuses'], word_use: 'literal', request_language: 'en' }),
  ex('a sleepy koala hugging a tree in the rain', { reasoning: 'A koala, literal animal; sleepy and hugging describe it.', subject: 'a sleepy koala hugging a tree in the rain', head_noun: 'koala', subject_visual_no_people: 'a sleepy koala hugging a tree in the rain', kind: 'creature', real_person: false, has_human: false, mention_words: ['koala'], word_use: 'literal', request_language: 'en' }),
  ex('o caminhão que atravessou o deserto sozinho', { reasoning: 'A truck crossing a desert; caminhão is a literal truck.', subject: 'a truck crossing the desert alone', head_noun: 'truck', subject_visual_no_people: 'a truck crossing the desert alone', kind: 'vehicle', real_person: false, has_human: false, mention_words: ['caminhão'], word_use: 'literal', request_language: 'pt' }),
  ex('un anciano pescador y su barca al amanecer', { reasoning: 'An unnamed old fisherman with his boat; literal person.', subject: 'an old fisherman with his boat at dawn', head_noun: 'fisherman', subject_visual_no_people: 'an old fisherman with his boat at dawn', kind: 'person_generic', real_person: false, has_human: true, mention_words: ['anciano pescador'], word_use: 'literal', request_language: 'es' }),
  ex('What happened to the submarine K-129', { reasoning: 'A numbered submarine; a literal vehicle drawn as a submarine.', subject: 'a Soviet K-129 submarine', head_noun: 'submarine', subject_visual_no_people: 'a K-129 diesel submarine', kind: 'vehicle', real_person: false, has_human: false, mention_words: ['submarine K-129'], word_use: 'literal', request_language: 'en' }),
  ex('Where is flight MH370 now', { reasoning: 'A numbered flight; the real airliner is literal, drawn as the plane.', subject: 'a Malaysia Airlines passenger jet', head_noun: 'jet', subject_visual_no_people: 'a white passenger jet', kind: 'vehicle', real_person: false, has_human: false, mention_words: ['flight MH370'], word_use: 'literal', request_language: 'en' }),
  ex('a vida nas fontes hidrotermais do fundo do mar', { reasoning: 'Life in a place means the living creatures there; literal.', subject: 'creatures living around deep-sea hydrothermal vents', head_noun: 'creatures', subject_visual_no_people: 'creatures living around deep-sea hydrothermal vents', kind: 'creature', real_person: false, has_human: false, mention_words: ['vida'], word_use: 'literal', request_language: 'pt' }),
  ex('the village where goats outnumber people', { reasoning: 'Goats are the striking literal animal of the village.', subject: 'goats roaming a mountain village', head_noun: 'goats', subject_visual_no_people: 'goats roaming a mountain village', kind: 'creature', real_person: false, has_human: false, mention_words: ['goats'], word_use: 'literal', request_language: 'en' }),
  ex('The Paper Boat — a paper boat floats down a flooded street and reaches the sea', { reasoning: 'A story titled after its main object; the paper boat is literal.', subject: 'a paper boat floating down a flooded street', head_noun: 'boat', subject_visual_no_people: 'a paper boat floating down a flooded street', kind: 'vehicle', real_person: false, has_human: false, mention_words: ['paper boat'], word_use: 'literal', request_language: 'en' }),
  ex("Elvis Presley's first guitar", { reasoning: 'An object that belonged to a named person; the guitar is literal.', subject: "Elvis Presley's first guitar", head_noun: 'guitar', subject_visual_no_people: 'a vintage acoustic guitar', kind: 'object', real_person: false, has_human: false, mention_words: ['guitar'], word_use: 'literal', request_language: 'en' }),
  ex('o bracelete de ouro que pertenceu a Cleópatra', { reasoning: 'A gold bracelet owned by a named queen; the bracelet is literal.', subject: 'a gold bracelet that belonged to Cleopatra', head_noun: 'bracelet', subject_visual_no_people: 'an ancient gold bracelet', kind: 'object', real_person: false, has_human: false, mention_words: ['bracelete de ouro'], word_use: 'literal', request_language: 'pt' }),
  ex('the Golden Hind, a famous sailing ship', { reasoning: 'A named ship; the ship itself is literal, drawn as a sailing ship.', subject: 'the Golden Hind sailing ship', head_noun: 'ship', subject_visual_no_people: 'a 16th-century wooden sailing ship', kind: 'vehicle', real_person: false, has_human: false, mention_words: ['sailing ship'], word_use: 'literal', request_language: 'en' }),
  ex('a Rolls-Royce from the 1920s parked in Paris', { reasoning: 'A vintage luxury car; the car itself is literal.', subject: 'a 1920s Rolls-Royce car parked in Paris', head_noun: 'car', subject_visual_no_people: 'a 1920s luxury car parked on a city street', kind: 'vehicle', real_person: false, has_human: false, mention_words: ['Rolls-Royce'], word_use: 'literal', request_language: 'en' }),
  ex('the Brazilian flag flying over the Amazon', { reasoning: 'A national flag, a literal object over a forest.', subject: 'the Brazilian flag over the Amazon rainforest', head_noun: 'flag', subject_visual_no_people: 'a green and yellow Brazilian flag over a rainforest', kind: 'object', real_person: false, has_human: false, mention_words: ['flag'], word_use: 'literal', request_language: 'en' }),
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
  'subject_visual_no_people: the text the image model will receive. The SAME subject described only by what the viewer sees, in plain English, at most 10 words, starting with "a", "an" or "the" (or a plural noun), and containing the head_noun word exactly. Write every word in lowercase and use NO proper name of any kind, not even in lowercase: no person (owner, maker, user, artist, inventor, king, saint, character), no place or city, no ship or vehicle name, no brand, company or model name; replace each name with what it looks like ("Napoleon\'s hat" gives "a black bicorne hat", "Machu Picchu" gives "ancient stone ruins on a mountain ridge", "a Porsche" gives "a silver sports car", "the Queen Mary" gives "a 1930s ocean liner", "Darwin\'s finches" gives "small brown finches", "a Lego car" gives "a lego toy car"). Only these may keep a capital letter: a nationality or era word (Greek, Roman, Victorian, Brazilian), a named species (Komodo dragon) and model codes with digits (C-54, K-129, 3D). No "by", "belonging to", "owned", "used", "designed", "built" or "that someone drove" clause, and no possessive. Null when subject is null.',
  'has_human: true when the subject is or includes a person of any age. mention_words: the exact word or words copied from the request, in its own language and spelling, that name the subject (empty when kind is "none"). word_use: how those words are used in THIS request — "literal"; "name_or_title" only when they name a person, a work (film, series, book, song, game), a sports team, a company, a brand or a weather phenomenon (the proper name of a ship, flight or other vehicle, and the title of the requested story itself, are "literal"); "figurative"; "verb"; or "none" when kind is "none". request_language: ISO 639-1 code.',
  'Reply with JSON only.',
].join('\n')

// ═══ KINEO-SUJEITO-APARENCIA-1311 (a) — a pergunta da APARÊNCIA, separada do leitor do sujeito ═══════════════════════════════════
// Recebe o pedido e o sujeito JÁ decidido; devolve as palavras do pedido que descrevem a aparência DESSE sujeito (request_words, copiadas na
// língua do pedido — âncora anti-invenção conferida no código) e a tradução (appearance). Sem palavra do pedido = null, sempre.
export const SYSTEM_APARENCIA_1311 = [
  'You read a video request (any language) and the main subject already chosen from it.',
  'request_words: the exact words copied from the request, in its own language and spelling, that state the colour, coat, fur, markings, skin, clothing or material of THAT subject. Empty when the request writes none for it, or when such words describe something else (the background, the place, the style or look of the video, another object or character).',
  'appearance: those words in natural plain English for that thing (an animal coat uses the usual word, e.g. a tabby rabbit, a bay horse), lowercase, at most 8 words, no names. Null when request_words is empty. Never infer, guess or add a colour from your own knowledge.',
  'Reply with JSON only.',
].join('\n')
const SCHEMA_APARENCIA_1311 = {
  type: 'object', additionalProperties: false,
  required: ['request_words', 'appearance'],
  properties: { request_words: { type: 'array', items: { type: 'string' } }, appearance: { type: ['string', 'null'] } },
} as const
const exAp = (pedido: string, sujeito: string, o: { request_words: string[]; appearance: string | null }) => ({ user: `Video request:\n${pedido}\nMain subject: ${sujeito}`, assistant: JSON.stringify(o) })
// nenhum vem do ensaio nem dos filmes do caso
export const EXEMPLOS_APARENCIA_1311: ReadonlyArray<{ user: string; assistant: string }> = [
  exAp('un perro blanco con manchas negras corre por la playa', 'a dog running on a beach', { request_words: ['blanco', 'manchas negras'], appearance: 'white with black spots' }),
  exAp('сонная серая сова сидит на заснеженной ветке', 'a sleepy owl on a snowy branch', { request_words: ['серая'], appearance: 'gray' }),
  exAp('um cavalo alazão galopando na praia, estilo aquarela azul', 'a horse galloping on a beach', { request_words: ['alazão'], appearance: 'chestnut' }),
  exAp('a knight in rusty silver armor guarding a bridge', 'a knight guarding a bridge', { request_words: ['rusty silver armor'], appearance: 'rusty silver armor' }),
  exAp('the Brazilian flag flying over the Amazon', 'a green and yellow Brazilian flag over a rainforest', { request_words: [], appearance: null }),
  exAp('a robot walking through a neon pink city at night', 'a robot walking through a city at night', { request_words: [], appearance: null }),
  exAp('why do flamingos stand on one leg', 'a flamingo standing on one leg', { request_words: [], appearance: null }),
]
/** A aparência que o modelo escreveu, validada: inglês minúsculo (letras latinas, espaço, vírgula, hífen), 1 a 8 palavras, sem nome. */
export function aparenciaValida(v: unknown): string | null {
  const t = typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().replace(/[.\s]+$/, '') : ''
  if (!t || t.toLowerCase() === 'null' || t.toLowerCase() === 'none') return null
  if (!/^[a-z][a-z\s,'-]*$/.test(t) || t.split(/\s+/).length > 8) return null
  return t
}
/** A resposta da pergunta da aparência, conferida: toda palavra citada está no pedido (sem acento, sem caixa); sem citação = null. */
export function lerAparencia(bruto: unknown, pedido: string): { appearance: string | null } | null {
  if (!bruto || typeof bruto !== 'object') return null
  const o = bruto as Record<string, unknown>
  if (!Array.isArray(o.request_words) || o.request_words.some((w) => typeof w !== 'string')) return null
  if (o.appearance !== null && typeof o.appearance !== 'string') return null
  const citadas = (o.request_words as string[]).map((w) => w.trim()).filter(Boolean)
  const norma = (t: string) => ` ${String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()} `
  const p = norma(pedido)
  if (citadas.length === 0 || !citadas.every((w) => p.includes(norma(w)))) return { appearance: null }
  return { appearance: aparenciaValida(o.appearance) }
}
/** A pergunta (rede, gpt-4o-mini, ~1 s). Falha = { ok: false } e nada muda. */
export async function lerAparenciaDoSujeito(pedido: string, sujeito: string, opts: OpcoesSemanticas = {}): Promise<ResultadoSemantico<{ appearance: string | null }>> {
  const texto = String(pedido ?? '').replace(/\s+/g, ' ').trim().slice(0, 600)
  return perguntaSemantica(
    { system: SYSTEM_APARENCIA_1311, user: `Video request:\n${texto}\nMain subject: ${String(sujeito ?? '').slice(0, 120)}`, nome: 'aparencia_do_sujeito', schema: SCHEMA_APARENCIA_1311 as unknown as Record<string, unknown>, maxTokens: 80, exemplos: EXEMPLOS_APARENCIA_1311, ler: (o) => lerAparencia(o, texto) },
    { timeoutMs: 4_000, tentativasExtras: 0, ...opts },
  )
}
/** A frase do sujeito com a aparência do pedido: "a ninja cat running on rooftops (ginger)"; aparência já toda na frase = a mesma frase. */
export function fraseComAparencia(frase: string, aparencia: string | null | undefined): string {
  const a = aparenciaValida(aparencia)
  if (!a) return frase
  const palavras = a.split(/[\s,]+/).filter((w) => w.length >= 3 && !['with', 'and', 'the'].includes(w))
  return palavras.length && palavras.every((w) => new RegExp(`(?<![a-z])${w}(?![a-z])`, 'i').test(frase)) ? frase : `${frase} (${a})`
}

const semAcento = (t: string) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const SUJEITO_VALIDO_RE = /^[\p{Script=Latin}\p{N}][\p{Script=Latin}\p{N}\s'’,.-]*$/u

// ─── v8: o texto injetado é o campo VISUAL, sem gente — e o código o valida ─────────────────────────────────────────────────────
// Revisões do c5dbdbcf3, 21d3c2333 e c04a09837: cortar o nome de dentro do subject ("Napoleon's hat", "designed by Leonardo da Vinci",
// "a telescope built by Galileo Galilei 400 years ago", "Alexander the Great's helmet") foi um jogo de exceções sem fim — cada rodada
// deixava um formato passar ou quebrava o texto ("an Alexander the helmet", "a Joan of sword"). Decisão simples (v8): o motor recebe
// SÓ o subject_visual_no_people, que o modelo escreve sem nome próprio nenhum, e visualSemPessoas confere:
//   1. corta tudo a partir de by / belonging to / owned / used / designed / built / once / wore / drove / named / "the one" e de
//      "that/which/whom/whose … drove/wore/owned/built/played…" (a oração de dono/autor nunca chega ao motor, mesmo que o modelo a
//      escreva), e de "of/depicting/showing" + nome com maiúscula ("the lifeboats of the Titanic" → "the lifeboats"); "a boy who
//      found a meteorite" fica (oração de ação, sem dono);
//   2. possessivo de pessoa ("Napoleon's", "napoleon's" quando o subject escreveu Napoleon, "Titanic's") SAI — só a palavra do dono
//      ("the Titanic's lifeboats" → "the lifeboats"); o que sobrar de nome em volta cai nas regras 3-5; possessivo de substantivo
//      comum ("a girls' school", "the moon's surface") fica;
//   3. palavra com inicial maiúscula = nada injetado, salvo código com dígito ("C-54", "K-129", "3D"), o artigo do começo e a lista
//      FECHADA NOME_PROPRIO_PERMITIDO (nacionalidade/época — Greek, Roman, Victorian — e espécie com nome — Komodo): só permite, nunca
//      cria sujeito, e nenhuma dessas palavras é rosto de gente;
//   4. palavra que o PRÓPRIO subject escreveu com maiúscula (o nome do dono/navio/marca escondido em minúscula: "napoleon",
//      "galileo") = nada injetado, salvo a mesma lista e o material de brinquedo de MODIFICADOR_VISUAL ("lego");
//   5. resto quebrado = nada injetado: artigo seguido de artigo/preposição, artigo/preposição/conjunção no fim, texto vazio, ou o
//      núcleo (head_noun) fora do texto.
// Nada disso tenta CONSERTAR o texto: na dúvida a cena fica como estava (falha segura). LIMITE: nome de gente escrito em minúscula
// que o subject também não escreveu com maiúscula passa — a calibração (com "proibido" sem caixa) mede isso no caminho inteiro.
const VERBO_DE_DONO = String.raw`(?:drove|driven|wore|worn|owned|used|built|designed|played|signed|loved|gave|rode|ridden|flew|flown|wielded|made|painted|carved|sculpted|smashed|invented|carried|kept|held|wrote|written)`
const CORTE_DE_AUTORIA_RE = new RegExp(String.raw`(?:,\s*|\s+)(?:by|belong(?:s|ed|ing)?|owned|once|used|designed|built|made\s+by|invented|created\s+by|painted\s+by|worn|wore|drove|driven|rode|ridden|flew|flown|wielded|signed|played\s+by|named|called|(?:(?:similar\s+to|like)\s+)?the\s+one|(?:that|which|whom|whose)\s+(?:[\p{L}'’.-]+\s+){0,4}?${VERBO_DE_DONO})(?![\p{L}\p{N}'’-]).*$`, 'iu')
// "of"/"depicting"/"showing" + nome com maiúscula é o possessivo por extenso ("the lifeboats of the Titanic", "a sword of Joan of Arc",
// "a postcard of San Francisco"): sai do marcador até o fim, com caixa (o nome começa com maiúscula; "of the sea" fica)
const CORTE_DE_NOME_RE = /(?:,\s*|\s+)(?:of|depicting|showing)\s+(?:the\s+)?\p{Lu}(?![\p{Lu}\d-]*\d).*$/u
// palavras com maiúscula que podem ficar no texto do motor: nacionalidade/época/região e espécie com nome. Lista FECHADA que só PERMITE
// (nunca cria sujeito); nenhuma é nome de pessoa.
const NOME_PROPRIO_PERMITIDO = new Set(['american', 'british', 'english', 'french', 'german', 'italian', 'spanish', 'portuguese', 'dutch', 'russian', 'soviet', 'chinese', 'japanese', 'korean', 'indian', 'mexican', 'brazilian', 'argentine', 'peruvian', 'egyptian', 'greek', 'roman', 'viking', 'norse', 'celtic', 'aztec', 'mayan', 'maya', 'inca', 'incan', 'persian', 'ottoman', 'mongol', 'mongolian', 'arab', 'arabian', 'african', 'european', 'asian', 'arctic', 'antarctic', 'atlantic', 'pacific', 'medieval', 'renaissance', 'victorian', 'edwardian', 'baroque', 'gothic', 'byzantine', 'babylonian', 'sumerian', 'polynesian', 'hawaiian', 'scandinavian', 'siberian', 'australian', 'canadian', 'irish', 'scottish', 'swiss', 'swedish', 'norwegian', 'polish', 'turkish', 'thai', 'vietnamese', 'filipino', 'andean', 'himalayan', 'komodo', 'galapagos', 'bengal', 'dalmatian', 'labrador', 'shetland', 'holstein', 'lego'])
const POSSESSIVO_NO_VISUAL_RE = /([\p{L}][\p{L}\p{N}-]*?)(?:['’]s|(?<=s)['’])(?![\p{L}])/gu
const PALAVRA_FUNCIONAL = /^(?:a|an|the|of|by|to|from|with|and|or|in|on|at|for|as|into|onto|than|nor|but)$/i
const ARTIGO = /^(?:a|an|the)$/i
const somDeVogal = (w: string) => /^(?:hour|honest|honou?r|heir)/i.test(w) || (/^[aeiou]/i.test(w) && !/^(?:uni|use|usu|uti|eu|one|once|ur[aeio])/i.test(w))
const palavrasDe = (t: string) => t.split(/\s+/).filter(Boolean)
const limpaPalavra = (w: string) => w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')

/** v8: o subject_visual_no_people validado (o que vai ao motor) — ou o motivo de nada ser injetado. Puro, sem rede. */
export function visualSemPessoas(visual: string | null, subject: string | null, nucleo: string | null): { frase: string | null; motivo: string | null } {
  const bruto = String(visual ?? '').replace(/\s+/g, ' ').trim().replace(/[.\s]+$/, '')
  if (!bruto || bruto.toLowerCase() === 'null') return { frase: null, motivo: 'sem_visual' }
  // o artigo do começo pode vir com maiúscula ("A black hat"); fora ele, maiúscula é nome
  let s = bruto.replace(/^(A|An|The)\s/, (m) => m.toLowerCase())
  // 1. a oração de dono/autor sai inteira, do marcador até o fim
  s = s.replace(CORTE_DE_AUTORIA_RE, '').replace(CORTE_DE_NOME_RE, '').replace(/[\s,;:-]+$/, '').trim()
  if (Array.from(s).length > 90 || palavrasDe(s).length > 12 || !SUJEITO_VALIDO_RE.test(s || '-')) return { frase: null, motivo: 'visual_mal_formado' }
  // os nomes que o PRÓPRIO subject escreveu com maiúscula (menos a 1ª palavra, se for artigo ou o próprio núcleo — "Goats roaming…" —,
  // e códigos): servem às regras 2 e 4
  const doSubject = palavrasDe(String(subject ?? '')).map(limpaPalavra).map((w) => w.replace(/['’]s$/, ''))
  const nomes = new Set(doSubject.filter((w, i) => /^\p{Lu}/u.test(w) && !/\d/.test(w) && !(i === 0 && (ARTIGO.test(w) || w.toLowerCase() === String(nucleo ?? '').toLowerCase()))).flatMap((w) => w.toLowerCase().split('-')))
  const ehNome = (w: string) => /^\p{Lu}/u.test(w) || nomes.has(w.toLowerCase()) || nomes.has(w.toLowerCase().replace(/s$/, ''))
  // 2. possessivo de PESSOA: dono com maiúscula ("Napoleon's", "Titanic's") ou que o subject escreveu com maiúscula ("napoleon's") =
  // nada injetado; possessivo de substantivo comum ("a girls' school", "the moon's surface") não é dono com rosto e fica
  // o possessivo de pessoa SAI (só a palavra do dono: "the Titanic's lifeboats" → "the lifeboats"); o que sobrar de nome em volta dele
  // ("an Alexander the Great's helmet" → "an Alexander the helmet") cai na regra 3 — nada injetado, nunca consertado
  const antesDoCorte = s
  s = s.replace(POSSESSIVO_NO_VISUAL_RE, (todo: string, dono: string) => (ehNome(dono) ? '' : todo)).replace(/\s+/g, ' ').trim()
  if (s !== antesDoCorte && (!s || !SUJEITO_VALIDO_RE.test(s))) return { frase: null, motivo: 'visual_com_possessivo' }
  const palavras = palavrasDe(s).map(limpaPalavra).filter(Boolean)
  // 3. maiúscula sem dígito
  if (palavras.some((w) => /^\p{Lu}/u.test(w) && !/\d/.test(w) && !NOME_PROPRIO_PERMITIDO.has(w.toLowerCase()))) return { frase: null, motivo: 'visual_com_maiuscula' }
  // 4. nome escondido em minúscula: palavra que o subject escreveu com maiúscula
  const material = new Set(MODIFICADOR_VISUAL.split('|'))
  if (palavras.some((w) => w.toLowerCase().split('-').some((p) => nomes.has(p) && !material.has(p) && !NOME_PROPRIO_PERMITIDO.has(p)))) return { frase: null, motivo: 'visual_com_nome_do_subject' }
  // 5. resto quebrado
  const ws = palavrasDe(s)
  if (ws.length === 0 || (ws.length === 1 && ARTIGO.test(ws[0]))) return { frase: null, motivo: 'visual_quebrado' }
  if (PALAVRA_FUNCIONAL.test(limpaPalavra(ws[ws.length - 1]))) return { frase: null, motivo: 'visual_quebrado' }
  for (let i = 0; i + 1 < ws.length; i++) if (ARTIGO.test(ws[i]) && PALAVRA_FUNCIONAL.test(ws[i + 1])) return { frase: null, motivo: 'visual_quebrado' }
  const h = String(nucleo ?? '').trim().toLowerCase()
  if (!h || !NUCLEO_RE.test(h) || !s.split(/[^\p{L}-]+/u).includes(h)) return { frase: null, motivo: 'sem_nucleo' }
  // a/an pelo som da palavra seguinte (nunca "a ancient"); o resto é o texto do modelo, intocado
  const comArtigo = /^(a|an)\s+(\S+)/i.exec(s)
  if (comArtigo) s = (somDeVogal(comArtigo[2]) ? 'an' : 'a') + s.slice(comArtigo[1].length)
  return { frase: s, motivo: null }
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
  // v8: o campo visual é obrigatório no formato (null ou texto); resposta sem ele (formato antigo) = falha segura
  if (o.subject_visual_no_people !== null && typeof o.subject_visual_no_people !== 'string') return null
  if (o.head_noun !== null && typeof o.head_noun !== 'string') return null
  if (!Array.isArray(o.mention_words) || o.mention_words.some((w) => typeof w !== 'string')) return null
  // "null" escrito como texto (visto na calibração real) é null
  const texto = (v: unknown) => { const s = typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : ''; return s && s.toLowerCase() !== 'null' ? s : null }
  const leitura: LeituraDoSujeito = {
    reasoning: o.reasoning.replace(/\s+/g, ' ').trim().slice(0, 300), word_use: o.word_use as UsoDaPalavra,
    subject: texto(o.subject)?.replace(/[.\s]+$/, '') ?? null,
    subject_visual: null, subject_visual_no_people: texto(o.subject_visual_no_people),
    head_noun: texto(o.head_noun)?.toLowerCase() ?? null,
    kind: o.kind as KindDoSujeito, has_human: o.has_human, real_person: o.real_person,
    mention_words: (o.mention_words as string[]).map((w) => w.trim()).filter(Boolean).slice(0, 6),
    request_language: o.request_language.trim().toLowerCase().slice(0, 8), descartado: null,
  }
  const descarta = (motivo: string) => ({ ...leitura, subject: null, subject_visual: null, descartado: motivo })
  if (leitura.real_person) return descarta('pessoa_real')
  if (leitura.word_use !== 'literal') return descarta(`uso_${leitura.word_use}`)
  if (leitura.kind === 'none' || !leitura.subject) return descarta('sem_sujeito')
  const s = leitura.subject
  if (Array.from(s).length > 90 || s.split(/\s+/).length > 12 || !SUJEITO_VALIDO_RE.test(s)) return descarta('sujeito_mal_formado')
  // v8: o que vai ao motor é o campo VISUAL validado (sem nome próprio, sem oração de dono/autor, sem texto quebrado); o núcleo
  // (head_noun) é UMA palavra minúscula escrita nele ("parrot" em "a talking parrot") — fora disso nada é injetado
  const vis = visualSemPessoas(leitura.subject_visual_no_people, s, leitura.head_noun)
  if (!vis.frase) return descarta(vis.motivo ?? 'sem_visual')
  leitura.subject_visual = vis.frase
  return validarAncora(leitura, pedido, descarta)
}

function validarAncora(leitura: LeituraDoSujeito, pedido: string, descarta: (motivo: string) => LeituraDoSujeito): LeituraDoSujeito {
  const s = leitura.subject_visual ?? ''
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
  if (!citacaoInteira && !palavrasDoSujeito.some(noPedido) && !conteudo(leitura.subject ?? '').some(noPedido)) return descarta('sem_ancora_no_pedido')
  return leitura
}

/** A chamada semântica sobre o PEDIDO ORIGINAL (nunca o roteiro). Falha = { ok: false } e nada é injetado. */
export async function lerSujeitoDoPedido(pedido: string, opts: OpcoesSemanticas = {}): Promise<ResultadoSemantico<LeituraDoSujeito>> {
  const texto = String(pedido ?? '').replace(/\s+/g, ' ').trim().slice(0, 600)
  // KINEO-PROTAGONISTA-1311 (item 4) — a leitura deste mesmo texto já foi feita neste filme: ela mesma, sem perguntar de novo
  if (opts.leituraPronta && String(opts.leituraPronta.texto ?? '').replace(/\s+/g, ' ').trim().slice(0, 600) === texto) return opts.leituraPronta.resultado
  return perguntaSemantica(
    { system: SYSTEM_SUJEITO_0111, user: `Video request:\n${texto}`, nome: 'sujeito_do_pedido', schema: SCHEMA_SUJEITO as unknown as Record<string, unknown>, maxTokens: 320, exemplos: EXEMPLOS_SUJEITO_0111, ler: (o) => lerLeituraDoSujeito(o, texto) },
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

// v8: os plurais em -ves que voltam a -f/-fe (lista fechada); qualquer outro -ves só perde o "s" ("caves", "gloves", "olives")
const PLURAL_EM_VES: Readonly<Record<string, string>> = { wolves: 'wolf', knives: 'knife', leaves: 'leaf', halves: 'half', shelves: 'shelf', lives: 'life', wives: 'wife', loaves: 'loaf', calves: 'calf', elves: 'elf', thieves: 'thief', selves: 'self', sheaves: 'sheaf', scarves: 'scarf', wharves: 'wharf', hooves: 'hoof' }
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
    else if (/ves$/.test(n) && n.length > 4) raiz = PLURAL_EM_VES[n] ?? n.slice(0, -1) // v8: "caves" → cave, "gloves" → glove (nunca "caf"/"glof")
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
  // v8: o modificador pode estar até 2 palavras antes do núcleo ("a toy brick car"); "toy" e "lego" provam um ao outro (o campo visual
  // escreve "a toy brick car", o descritor pode escrever "a Lego car")
  const mod = new RegExp(`(?<![\\p{L}\\p{N}])(${MODIFICADOR_VISUAL})(?:[\\s-]+\\p{Ll}+){0,2}?[\\s-]+${escapa(h)}(?![\\p{L}\\p{N}])`, 'iu').exec(frase)?.[1]?.toLowerCase()
  const fonteDoMod = mod === 'toy' || mod === 'lego' ? 'toys?|lego' : mod ? escapa(mod) : ''
  const chaveDoMod = mod && !reforcos.some((re) => re.test(mod)) && !chaveDoNucleo.test(mod) ? [p(fonteDoMod)] : []
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
  // v8: o que o motor recebe é o campo VISUAL validado (sem gente); o subject do modelo nunca vai ao prompt
  const frase = l.subject_visual
  if (!l.subject || !frase || l.real_person || l.kind === 'none') return { sujeito: null, motivo: 'sem_sujeito' }
  // romance/pedido adulto (pessoaPermitida=false): gente genérica nunca vira sujeito obrigatório (nunca "a boy" num pedido adulto).
  // Gente = o kind, o has_human do modelo ou criança escrita na frase — qualquer um dos três.
  const ehGente = l.kind === 'person_generic' || l.has_human || CHAVES.child.test(l.subject) || CHAVES.child.test(frase)
  if (ehGente && args.pessoaPermitida === false) return { sujeito: null, motivo: 'gente_em_pedido_adulto' }
  const chaves = chavesDoSujeito(frase, l.head_noun)
  const tokens = [...frase.matchAll(/(?<![\p{L}\p{N}-])\p{Lu}{1,3}-\d{1,4}\p{Lu}?(?![\p{L}\p{N}])/gu)].map((m) => m[0])
  if (chaves.length === 0 && tokens.length === 0) return { sujeito: null, motivo: 'sem_chave_de_presenca' }
  // KINEO-SUJEITO-APARENCIA-1311 (a) — a frase injetada leva a aparência que o pedido escreveu; as chaves de presença seguem as da frase visual
  return { sujeito: { frase: fraseComAparencia(frase, l.appearance), tipo: ehGente ? 'pessoa' : TIPO_DO_KIND[l.kind], chaves, tokens, mencoes: l.mention_words, origem: 'pedido' }, motivo: null }
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
// KINEO-SUJEITO-APARENCIA-1311 (b) — o plano já tem ficha de personagem (a ficha diz quem é e como é): o sujeito não vai a todo plano.
export const FICHA_NO_PLANO_RE = /(?:Identity|Visible(?:, seen from behind)?): |same main character|consistent design:/i
// KINEO-SUJEITO-TODO-PLANO-CORTE-1311 [CEO 13/11: "para caber nos 464, sai primeiro o texto fixo de estilo e só depois o eixo de câmera"] — na peça
// (b) a frase vai a TODO plano; comSujeitoNaCena (feita para UM plano) tira primeiro o EIXO de câmera, e em todo plano isso apagava a variedade
// de enquadramento do KINEO-REPETICAO-FREE15-1011 (simulação nos filmes salvos: o rio perdia "Wide establishing shot" e "Extreme close-up").
// Aqui a ordem é: (1) a lista fixa de estilo depois da última frase da ação ("photorealistic, ultra-detailed, dramatic cinematic lighting, …"),
// item a item, do fim para o começo; (2) só então o eixo; (3) só então o corte do corpo de comSujeitoNaCena. A proteção do fim (no readable
// text / Mouth closed) nunca sai.
export function comSujeitoEmTodoPlano(prompt: string, frase: string, index: number, orcamento = KLING4_ORCAMENTO_DA_CAMADA): string {
  const clausula = `${MARCA_SUJEITO_NA_CENA} ${frase}. `
  const medio = /^[^.]+\. /.exec(prompt)?.[0] ?? ''
  const resto = prompt.slice(medio.length)
  const m = TAIL_RE.exec(resto)
  const cauda = m ? resto.slice(m.index) : ''
  let corpo = m ? resto.slice(0, m.index) : resto
  const junta = () => `${medio}${clausula}${corpo}${cauda}`
  if (len(junta()) <= orcamento) return junta()
  // (1) a lista de estilo: o que vem depois da última frase terminada da ação, sem ponto final dentro
  const fimDaAcao = corpo.lastIndexOf('. ')
  const acao = fimDaAcao >= 0 ? corpo.slice(0, fimDaAcao + 1) : ''
  let estilo = fimDaAcao >= 0 ? corpo.slice(fimDaAcao + 1) : ''
  if (acao && !estilo.includes('.')) {
    const itens = estilo.split(',')
    while (itens.length && len(`${medio}${clausula}${acao}${itens.join(',')}${cauda}`) > orcamento) itens.pop()
    estilo = itens.join(',').replace(/[\s,]+$/u, '')
    corpo = `${acao}${estilo}`
    if (len(junta()) <= orcamento) return junta()
  }
  // (2) o eixo; (3) o corte do corpo, como em comSujeitoNaCena
  const semEixo = `${medio}${corpo.replace(`${eixoCurtoKling4(index)}. `, '')}${cauda}`
  return comSujeitoNaCena(semEixo, frase, index, orcamento)
}
// Revisão da CEO 13/11 — a peça (b) vale só para sujeito VIVO (bicho ou pessoa), que é o caso provado (gato ninja 7f92fe17). Em 14 dias, o
// sujeito já aparecia em algum plano em 48 de 141 filmes do Kling 4, e 35 deles eram objeto ou veículo ("a river", "an island with dense
// vegetation", "a ship"): pôr "Main subject clearly visible in frame: a river." em TODO plano desses filmes não foi medido (pode trocar cena
// fora do pedido por repetição). Objeto e veículo seguem a regra de sempre (sujeito em pelo menos 1 cena) até um ensaio com filme renderizado.
export const TIPOS_EM_TODO_PLANO_1311: ReadonlySet<string> = new Set(['criatura', 'pessoa'])

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
  leitura: { ok: boolean; erro: string | null; ms: number; model: string; tentativas: number; reasoning: string | null; word_use: UsoDaPalavra | null; subject: string | null; head_noun: string | null; kind: KindDoSujeito | null; has_human: boolean | null; real_person: boolean | null; mention_words: string[]; request_language: string | null; descartado: string | null; subject_visual: string | null; subject_visual_no_people: string | null } | null
  ja_presente: boolean
  corrigido: boolean
  /** Cena corrigida, 1-based (null = nada corrigido). */
  cena: number | null
  keyframe_removido: boolean
  /** KINEO-SUJEITO-APARENCIA-1311 (b) — os planos (1-based) que ganharam o sujeito completo. */
  planos_com_sujeito?: number[]
}

function relatoDaLeitura(r: ResultadoSemantico<LeituraDoSujeito> | null): RelatoSujeitoK4['leitura'] {
  if (!r) return null
  if (!r.ok) return { ok: false, erro: r.erro, ms: r.ms, model: r.model, tentativas: r.tentativas, reasoning: null, word_use: null, subject: null, head_noun: null, kind: null, has_human: null, real_person: null, mention_words: [], request_language: null, descartado: null, subject_visual: null, subject_visual_no_people: null }
  const v = r.valor
  return { ok: true, erro: null, ms: r.ms, model: r.model, tentativas: r.tentativas, reasoning: v.reasoning, word_use: v.word_use, subject: v.subject, head_noun: v.head_noun, kind: v.kind, has_human: v.has_human, real_person: v.real_person, mention_words: v.mention_words, request_language: v.request_language, descartado: v.descartado, subject_visual: v.subject_visual, subject_visual_no_people: v.subject_visual_no_people }
}

/** A checagem antes do POST pago do Kling 4: o sujeito do PEDIDO ORIGINAL em pelo menos 1 cena do multi_prompt — corrige, nunca bloqueia. */
export function exigirSujeitoNoKling4(args: {
  pedido: PedidoDoSujeito; leitura: ResultadoSemantico<LeituraDoSujeito> | null; falas: ReadonlyArray<string>; prompts: ReadonlyArray<string>; stills?: ReadonlyArray<string | null>; pessoaPermitida?: boolean
  /** KINEO-SUJEITO-APARENCIA-1311 (b) — sem ficha em nenhum plano, o sujeito completo vai a TODO plano (só o Kling 4 passa true). */
  todosOsPlanos?: boolean
}): { prompts: string[]; stills: (string | null)[]; relato: RelatoSujeitoK4 } {
  const prompts = [...args.prompts]
  const stills = [...(args.stills ?? [])]
  const avaliado = args.pedido.pedido ? avaliarSujeito({ leitura: args.leitura, pessoaPermitida: args.pessoaPermitida }) : { sujeito: null, motivo: 'sem_pedido' }
  const s = avaliado.sujeito
  const relato: RelatoSujeitoK4 = { versao: SUJEITO_K4_VERSAO, sujeito: s?.frase ?? null, tipo: s?.tipo ?? null, origem: s?.origem ?? null, motivo_sem_sujeito: avaliado.motivo, fonte_do_pedido: args.pedido.fonte, motivo_do_pedido: args.pedido.motivo, leitura: relatoDaLeitura(args.leitura), ja_presente: false, corrigido: false, cena: null, keyframe_removido: false }
  if (!s || prompts.length === 0) return { prompts, stills, relato }
  if (prompts.some((q) => promptMostraOSujeito(q, s))) {
    relato.ja_presente = true
    // KINEO-SUJEITO-APARENCIA-1311 (b) — o sujeito já aparece em algum plano (o gato ninja), mas sem ficha de personagem nada mantém a cor e o
    // lugar nos outros: a frase completa (espécie, cor, lugar) vai a todo plano que ainda não a traz, pela MESMA inserção de hoje
    // (comSujeitoNaCena: logo depois do meio; para caber nos 464 sai primeiro o eixo e depois o FIM do corpo — nos planos do Kling 4 o fim é o
    // texto fixo de estilo, depois da ação); nenhuma imagem-chave sai (elas já mostram o sujeito). Sujeito ausente de todos os planos (o avião
    // C-54) segue a correção de sempre, abaixo: uma cena, e a imagem dela sai.
    if (args.todosOsPlanos && !prompts.some((q) => FICHA_NO_PLANO_RE.test(q))) {
      if (!TIPOS_EM_TODO_PLANO_1311.has(s.tipo)) return { prompts, stills, relato } // revisão da CEO 13/11 — só sujeito vivo (ver a constante)
      const marcados: number[] = []
      prompts.forEach((q, i) => { if (q.includes(s.frase)) return; prompts[i] = comSujeitoEmTodoPlano(q, s.frase, i); marcados.push(i + 1) }) // KINEO-SUJEITO-TODO-PLANO-CORTE-1311 — estilo sai antes do eixo
      if (marcados.length) { relato.corrigido = true; relato.cena = marcados[0]; relato.planos_com_sujeito = marcados }
    }
    return { prompts, stills, relato }
  }
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
    // KINEO-SUJEITO-APARENCIA-1311 (a) — com o sujeito decidido e válido, a pergunta separada da aparência; falha = sem aparência (nada muda)
    const ligado = sujeitoAparenciaLigada()
    if (ligado && leitura?.ok && leitura.valor.subject_visual && !leitura.valor.descartado && args.pedido.pedido) {
      const ap = await lerAparenciaDoSujeito(args.pedido.pedido, leitura.valor.subject_visual, opts)
      if (ap.ok) leitura.valor.appearance = ap.valor.appearance
    }
    return exigirSujeitoNoKling4({ ...args, leitura, todosOsPlanos: ligado })
  } catch (e) {
    const relato: RelatoSujeitoK4 = { versao: SUJEITO_K4_VERSAO, sujeito: null, tipo: null, origem: null, motivo_sem_sujeito: `erro_inesperado:${e instanceof Error ? e.name : 'desconhecido'}`, fonte_do_pedido: args.pedido.fonte, motivo_do_pedido: args.pedido.motivo, leitura: null, ja_presente: false, corrigido: false, cena: null, keyframe_removido: false }
    return { prompts: [...args.prompts], stills: [...(args.stills ?? [])], relato }
  }
}
