// KINEO-K4-SUJEITO-0111 [TRAVA 8.2 — vai do fundador 01/11 "vai tudo" (melhorias)] — O SUJEITO OBRIGATÓRIO DO FILME KLING 4.
//
// Revisor de vídeos, 01/11 (docs/revisao-videos/2026-11-01.md e FILA-DEFEITOS.md, CENA_FORA_DO_PEDIDO): no filme grátis de 15 s do
// Kling 4 (multi_prompt de 3 cenas) o tema central do pedido não aparecia em quadro nenhum —
//   · "o avião C-54 que sumiu": o avião nunca aparece; 2 homens de terno em 5 de 8 quadros (1º filme; a cliente pagou mesmo assim);
//   · "criança com caneta 3D": a criança nunca aparece;
//   · "vida sob o gelo": o desfecho (a vida debaixo do gelo) não aparece.
// O elenco (elencoEpoca/folhaDePersonagem) cuida de GENTE nomeada; máquina, bicho e objeto central não tinham dono.
//
// v4 (rodadas 1-3 reprovadas em revisão adversarial: o léxico de regex errava em entrada real — "El robo del siglo" virava robô,
// "Mis planes" avião, "Leverage is a double-edged sword" espada, "How AI trains" trem, "Billy the Kid" criança): a ADIVINHAÇÃO POR
// LISTA DE PALAVRAS SAIU. O sujeito agora vem de UMA chamada semântica curta ao gpt-4o-mini sobre o PEDIDO ORIGINAL (nunca o roteiro
// com pistas [Pexels]): {subject, kind, real_person, mention_words}. temperature 0, json_schema estrito, prazo ~4 s, no máximo 1
// tentativa extra. FALHA SEGURA: erro, prazo, JSON inválido, sujeito mal formado ou sem âncora no pedido = nada é injetado.
// real_person=true ou kind="none" = nada a injetar (gente real é do elenco; tema abstrato não tem sujeito). Calibração gravada em
// docs/calibracao/KINEO-K4-SUJEITO-0111.json (conjunto rotulado + respostas reais da API).
//   1. pedidoOriginalDoSujeito — de onde vem o pedido (inalterado desde a v2, aprovado nas revisões): ideia solta que chegou crua,
//      ou a `original_idea` que o /studio/create manda junto com o roteiro estruturado a partir DELA. Roteiro "as is", ideia longa,
//      ideia com marcadores/pistas ou que não fala do mesmo assunto da narração = null, nada é corrigido.
//   2. lerSujeitoDoPedido — a chamada semântica (async, rede). sujeitoObrigatorio — a leitura vira o sujeito (puro).
//   3. exigirSujeitoNoKling4 — se nenhum prompt do multi_prompt mostra o sujeito, a cena cuja FALA o cita (senão a última, o
//      desfecho) ganha "Main subject clearly visible in frame: …" logo depois do meio, dentro do orçamento de 464 code points da
//      camada. Corrige, nunca bloqueia. A cena corrigida que tinha imagem-chave do meio perde a imagem; a imagem de abertura nunca
//      é tirada. A fala nunca é tocada ("Use my script as is" continua literal). A checagem "já está em cena" e a escolha da cena
//      são as mesmas da v3 (as revisões não as condenaram); só a origem do sujeito mudou.
//   4. O relato (leitura semântica crua, sujeito, fonte do pedido, já presente, corrigido, cena, imagem tirada) vai no claim, em
//      kling4_trial.sujeito_obrigatorio.
import { KLING4_ORCAMENTO_DA_CAMADA, eixoCurtoKling4 } from '@/lib/cinematic/cenaKling4'
import { temaDiscordaDaFala } from '@/lib/pedidoCerto'
import { AI_TEXT_MODELS } from '@/lib/aiModels'

export const SUJEITO_K4_VERSAO = 'k4_sujeito_0111_v4_semantico' as const

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

/** Uma pergunta com resposta JSON estrita. Qualquer falha = { ok: false } (o chamador NÃO mexe em nada). */
export async function perguntaSemantica<T>(
  args: { system: string; user: string; nome: string; schema: Record<string, unknown>; ler: (o: unknown) => T | null; maxTokens?: number },
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
          messages: [{ role: 'system', content: args.system }, { role: 'user', content: args.user }],
        }),
      })
      if (!res.ok) { erro = `http_${res.status}`; continue }
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
export interface LeituraDoSujeito {
  /** Sintagma visual em inglês ("a 1950s C-54 propeller airplane"); null quando não há nada a injetar. */
  subject: string | null
  kind: KindDoSujeito
  real_person: boolean
  /** As palavras do PRÓPRIO pedido (na língua dele) que nomeiam o sujeito — âncora anti-invenção e escolha da cena pela fala. */
  mention_words: string[]
  /** Por que o sujeito ficou null depois da validação (null = válido ou nada a injetar por decisão do modelo). */
  descartado: string | null
}

const KINDS: ReadonlyArray<KindDoSujeito> = ['object', 'vehicle', 'creature', 'person_generic', 'none']
const SCHEMA_SUJEITO = {
  type: 'object', additionalProperties: false,
  required: ['subject', 'kind', 'real_person', 'mention_words'],
  properties: {
    subject: { type: ['string', 'null'] },
    kind: { type: 'string', enum: KINDS },
    real_person: { type: 'boolean' },
    mention_words: { type: 'array', items: { type: 'string' } },
  },
} as const

export const SYSTEM_SUJEITO_0111 = [
  'You read a short request for a video (any language) and name the ONE central physical thing the viewer must SEE, so an English-only image model can draw it.',
  'Return kind "vehicle", "creature" (any animal, pet, monster or creature, alone or in a group), "person_generic" (an unnamed, generic person such as a child, a diver, a lighthouse keeper, a clown) or "object" (an object, building or structure) ONLY when the request literally asks for that concrete thing as its topic.',
  'Return kind "none" with subject null when the topic is abstract or has no single concrete physical subject: money, finance, habits, advice, rules, psychology, news, weather phenomena, a general place or event, a question about something not drawable, or a list of facts.',
  'Read the words in context, including slang. A word used as a verb, an idiom, a metaphor, slang for a kind of person, a nickname, part of a proper name (person, company, product, film, song, game, band, weather phenomenon) or a word of another language that only looks like an English noun is NOT the subject. Never translate a word into a different thing.',
  'A question, a mystery or a list of facts ABOUT a concrete animal, living thing, vehicle or object still has that thing as its subject (why an animal is dangerous, what happened to a numbered flight). "Life" in a place (life under the ice, life in the deep sea, the secret life of an animal) means the living creatures themselves. A specific named or numbered vehicle (a numbered flight, a named ship, a car model) is a vehicle: the subject names the plain kind of machine (a numbered flight is drawn as its airplane or airplanes).',
  'In a short story, the subject is the main character (person or animal) or the main object the story is about, never a secondary prop or the setting.',
  'If the central subject is a specific real person (named, or clearly identifying a real historical individual), set real_person true and subject null: real people are handled elsewhere and are never turned into an object, animal or creature. A named fictional character is also kind "none". But a physical object that merely belongs to a named person (their crown, their car, their sword) is itself the subject, with real_person false.',
  'subject: a short noun phrase WRITTEN IN ENGLISH (always translate it; never copy words of another language), at most 10 words, starting with "a", "an" or "the", built around the plain English common noun (airplane, ship, dog, crown, girl) — never only a name or a number —, keeping the concrete details the request gives (model, era, colour, species, what a person is holding or doing). Examples: "um gato preto no telhado" gives "a black cat on a rooftop"; "el barco pirata hundido" gives "a sunken pirate ship"; "criança segurando um balão vermelho" gives "a child holding a red balloon". Never add details, characters or objects that are not in the request.',
  'mention_words: the exact word or words copied from the request, in its own language and spelling, that name the subject. Empty when kind is "none".',
  'More examples: "a vida secreta das corujas" gives creature "owls in the wild"; "life at the bottom of the ocean" gives creature "living creatures on the dark ocean floor"; "Flight 914 that landed decades late" gives vehicle "a passenger airplane"; "o gato que salvou o dono" gives creature "a cat"; "why gold prices keep rising" gives kind "none"; "the general who crossed the Alps with elephants" gives real_person true.',
  'Reply with JSON only.',
].join('\n')

const semAcento = (t: string) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const SUJEITO_VALIDO_RE = /^[\p{Script=Latin}\p{N}][\p{Script=Latin}\p{N}\s'’,.-]*$/u

/** Lê e VALIDA a resposta do modelo. Fora do formato = null (falha segura). Sujeito mal formado/sem âncora no pedido = descartado. */
export function lerLeituraDoSujeito(bruto: unknown, pedido: string): LeituraDoSujeito | null {
  if (!bruto || typeof bruto !== 'object') return null
  const o = bruto as Record<string, unknown>
  if (!KINDS.includes(o.kind as KindDoSujeito) || typeof o.real_person !== 'boolean') return null
  if (o.subject !== null && typeof o.subject !== 'string') return null
  if (!Array.isArray(o.mention_words) || o.mention_words.some((w) => typeof w !== 'string')) return null
  const leitura: LeituraDoSujeito = {
    subject: typeof o.subject === 'string' && o.subject.trim() ? o.subject.replace(/\s+/g, ' ').trim().replace(/[.\s]+$/, '') : null,
    kind: o.kind as KindDoSujeito, real_person: o.real_person,
    mention_words: (o.mention_words as string[]).map((w) => w.trim()).filter(Boolean).slice(0, 6), descartado: null,
  }
  const descarta = (motivo: string) => ({ ...leitura, subject: null, descartado: motivo })
  if (leitura.real_person) return descarta('pessoa_real')
  if (leitura.kind === 'none') return descarta('sem_sujeito')
  if (!leitura.subject) return descarta('sem_sujeito')
  const s = leitura.subject
  if (Array.from(s).length > 90 || s.split(/\s+/).length > 12 || !SUJEITO_VALIDO_RE.test(s)) return descarta('sujeito_mal_formado')
  // só nome/número ("Flight 19", "the SS St. Louis"): o motor não sabe O QUE desenhar — precisa de um substantivo comum (minúsculo)
  if (!s.split(/\s+/).some((w) => /^\p{Ll}{3,}[\p{Ll}'’-]*$/u.test(w) && !['the', 'and', 'with', 'from', 'into', 'over'].includes(w))) return descarta('sem_substantivo_comum')
  // sujeito COPIADO sem traduzir de pedido em outra língua ("a moeda", "a menina"): o motor só lê inglês. Identificação de LÍNGUA
  // (palavras-função do pt/es no pedido), nunca de significado; pedido em inglês nunca cai aqui.
  const conteudo = (t: string) => semAcento(t).replace(/[^\p{L}\p{N}]+/gu, ' ').split(' ').filter((w) => w.length >= 3 && !['the', 'and', 'with'].includes(w))
  const doPedido = new Set(conteudo(pedido))
  const pedidoLatinoNaoIngles = /(?<![\p{L}])(?:que|uma?|el|los|las|del|com|para|por|una|unos|como|sobre|nao|sim|muito|pelo|pela|seu|sua|dos|das|nos|nas|da|do|de|ou|e|y)(?![\p{L}])/iu.test(semAcento(pedido))
  const palavrasDoSujeito = conteudo(s)
  if (pedidoLatinoNaoIngles && palavrasDoSujeito.length > 0 && palavrasDoSujeito.every((w) => doPedido.has(w))) return descarta('sujeito_sem_traducao')
  // âncora anti-invenção: uma citação INTEIRA (todas as palavras dela) está no pedido, ou — pedido em inglês, citação vazia — uma
  // palavra de conteúdo do próprio sujeito está no pedido (sem acento, sem caixa). Sem âncora = descartado (seguro).
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
    { system: SYSTEM_SUJEITO_0111, user: `Video request:\n${texto}`, nome: 'sujeito_do_pedido', schema: SCHEMA_SUJEITO as unknown as Record<string, unknown>, ler: (o) => lerLeituraDoSujeito(o, texto) },
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
// O que, em inglês, prova que o prompt da cena já mostra o sujeito (o prompt do descritor é sempre inglês) — o mesmo dicionário da
// v3, agora lido sobre a FRASE do sujeito (inglês, escrita pelo modelo), nunca sobre o pedido. Sem palavras ambíguas: "chest"
// sozinho é peito, "jet" sozinho é jato d'água, "girl/boy" pode ser adulto.
const CHAVES: Readonly<Record<string, RegExp>> = {
  aircraft: p(String.raw`airplanes?|aeroplanes?|planes?|aircraft|airliners?|jetliners?|fighter\s+jets?|jet\s+(?:planes?|aircraft|airliners?)|bombers?|seaplanes?|fuselage`),
  helicopter: p('helicopters?'), submarine: p('submarines?'),
  watercraft: p(String.raw`ships?|shipwrecks?|vessels?|ocean\s+liners?|galleons?|warships?|boats?|sailboats?|yachts?|hull`),
  spacecraft: p(String.raw`rockets?|spacecraft|spaceships?|space\s+probes?|(?:space|crew|dragon)\s+capsules?`), rover: p('rovers?'),
  train: p('trains?|locomotives?'), car: p('cars?|automobiles?'), truck: p('trucks?'), bus: p('bus(?:es)?'),
  motorcycle: p('motorcycles?|motorbikes?'), bicycle: p('bicycles?|bikes?'), balloon: p('balloons?|zeppelins?|airships?'),
  under_ice_life: p(String.raw`(?:creatures?|life|fish|animals?|organisms?|krill|jellyfish)\b[^.]{0,60}\b(?:beneath|under|below)\b[^.]{0,30}\bice`),
  whale: p('whales?'), shark: p('sharks?'), squid: p('squids?'), octopus: p('octopus(?:es)?|octopi'), dinosaur: p('dinosaurs?|t-?rex'),
  komodo: p(String.raw`komodo|monitor\s+lizards?`), dragon: p('dragons?'), robot: p('robots?|androids?'), alien: p('aliens?|extraterrestrials?'),
  child: p(String.raw`child(?:ren)?|kids?|toddlers?|schoolchildren|(?:little|young|small)\s+(?:boys?|girls?)|(?:boys?|girls?),?\s+(?:aged\s+)?(?:[4-9]|1[0-2])(?:-year-old)?|(?:[4-9]|1[0-2])-year-old\s+(?:boys?|girls?)`),
  diver: p('divers?'), astronaut: p('astronauts?|cosmonauts?'),
  pen3d: p(String.raw`3d\s+(?:printing\s+)?pens?`),
  treasure: p(String.raw`treasures?|treasure\s+chests?|chests?\s+(?:of|full\s+of|filled\s+with|overflowing\s+with)\s+(?:gold|coins|jewels|treasure)|gold\s+coins|jewels`),
  meteorite: p('meteorites?|asteroids?'), sword: p('swords?'), crown: p('crowns?'), statue: p('statues?'),
}
// Fora do dicionário: o núcleo do sintagma ("a plump raccoon" → raccoon; "an old lighthouse keeper climbing…" → keeper).
const CORTE_DO_NUCLEO_RE = /\s(?:and|with|holding|carrying|wearing|in|on|at|under|beneath|below|above|inside|near|of|from|that|which|who|against|over|into|during|while)\s|\s\p{L}+ing\s/iu
const VAZIAS_DO_NUCLEO = new Set(['a', 'an', 'the', 'some', 'two', 'three', 'several', 'many'])
const escapa = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** As chaves que provam presença no prompt: famílias do dicionário que a frase cita, senão o núcleo do sintagma (plural tolerado). */
export function chavesDoSujeito(frase: string): RegExp[] {
  const grupos = Object.entries(CHAVES).filter(([, re]) => re.test(frase)).map(([g]) => g)
  const finais = grupos.includes('komodo') ? grupos.filter((g) => g !== 'dragon') : grupos
  if (finais.length) return finais.map((g) => CHAVES[g])
  const sintagma = ` ${frase} `.split(CORTE_DO_NUCLEO_RE)[0].trim()
  const palavras = sintagma.split(/\s+/).map((w) => w.replace(/[^\p{L}\p{N}'’-]/gu, '')).filter((w) => w && !VAZIAS_DO_NUCLEO.has(w.toLowerCase()))
  const nucleo = palavras[palavras.length - 1] ?? ''
  if (nucleo.length < 3) return []
  const raiz = nucleo.toLowerCase().replace(/(?:es|s)$/, '')
  return [p(`${escapa(raiz)}(?:s|es)?`)]
}

const limpa = (s: unknown) => String(s ?? '').replace(/\s+/g, ' ').trim()

/** A leitura semântica vira o sujeito (null = nada a injetar: falha, pessoa real, sem sujeito, descartado, criança em pedido adulto). */
export function sujeitoObrigatorio(args: { leitura: ResultadoSemantico<LeituraDoSujeito> | null; pessoaPermitida?: boolean }): SujeitoObrigatorio | null {
  const r = args.leitura
  if (!r || !r.ok) return null
  const l = r.valor
  if (!l.subject || l.real_person || l.kind === 'none') return null
  // romance/pedido adulto (pessoaPermitida=false): gente genérica nunca vira sujeito obrigatório (nunca "a child" num pedido adulto).
  // A calibração mostrou "children playing in the park" com kind "creature": criança na frase é gente, seja qual for o kind.
  const ehGente = l.kind === 'person_generic' || CHAVES.child.test(l.subject)
  if (ehGente && args.pessoaPermitida === false) return null
  const chaves = chavesDoSujeito(l.subject)
  const tokens = [...l.subject.matchAll(/(?<![\p{L}\p{N}-])\p{Lu}{1,3}-\d{1,4}\p{Lu}?(?![\p{L}\p{N}])/gu)].map((m) => m[0])
  if (chaves.length === 0 && tokens.length === 0) return null
  return { frase: l.subject, tipo: ehGente ? 'pessoa' : TIPO_DO_KIND[l.kind], chaves, tokens, mencoes: l.mention_words, origem: 'pedido' }
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
  /** De onde veio o pedido original (null = não havia pedido confiável: nada foi corrigido e a chamada não saiu). */
  fonte_do_pedido: FonteDoPedido | null
  motivo_do_pedido: string
  /** A leitura semântica crua, para auditoria (null = não chamada). */
  leitura: { ok: boolean; erro: string | null; ms: number; model: string; tentativas: number; subject: string | null; kind: KindDoSujeito | null; real_person: boolean | null; mention_words: string[]; descartado: string | null } | null
  ja_presente: boolean
  corrigido: boolean
  /** Cena corrigida, 1-based (null = nada corrigido). */
  cena: number | null
  keyframe_removido: boolean
}

function relatoDaLeitura(r: ResultadoSemantico<LeituraDoSujeito> | null): RelatoSujeitoK4['leitura'] {
  if (!r) return null
  if (!r.ok) return { ok: false, erro: r.erro, ms: r.ms, model: r.model, tentativas: r.tentativas, subject: null, kind: null, real_person: null, mention_words: [], descartado: null }
  const v = r.valor
  return { ok: true, erro: null, ms: r.ms, model: r.model, tentativas: r.tentativas, subject: v.subject, kind: v.kind, real_person: v.real_person, mention_words: v.mention_words, descartado: v.descartado }
}

/** A checagem antes do POST pago do Kling 4: o sujeito do PEDIDO ORIGINAL em pelo menos 1 cena do multi_prompt — corrige, nunca bloqueia. */
export function exigirSujeitoNoKling4(args: {
  pedido: PedidoDoSujeito; leitura: ResultadoSemantico<LeituraDoSujeito> | null; falas: ReadonlyArray<string>; prompts: ReadonlyArray<string>; stills?: ReadonlyArray<string | null>; pessoaPermitida?: boolean
}): { prompts: string[]; stills: (string | null)[]; relato: RelatoSujeitoK4 } {
  const prompts = [...args.prompts]
  const stills = [...(args.stills ?? [])]
  const s = args.pedido.pedido ? sujeitoObrigatorio({ leitura: args.leitura, pessoaPermitida: args.pessoaPermitida }) : null
  const relato: RelatoSujeitoK4 = { versao: SUJEITO_K4_VERSAO, sujeito: s?.frase ?? null, tipo: s?.tipo ?? null, origem: s?.origem ?? null, fonte_do_pedido: args.pedido.fonte, motivo_do_pedido: args.pedido.motivo, leitura: relatoDaLeitura(args.leitura), ja_presente: false, corrigido: false, cena: null, keyframe_removido: false }
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
