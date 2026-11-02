// KINEO-JUIZ-PLANO-0111 [TRAVA 8.2 — vai do fundador 01/11 "concordo vai"] — JUIZ DO PLANO v2 (juiz_plano_v2), fase 1: SÓ OBSERVAR.
//
// Por que existe (docs/JUIZ-AUTOMATICO-DESENHO-2026-11-02.md, camada A; confirmação de 01/11 em
// docs/calibracao/juiz-plano-confirmacao-0111.json): 8 de 9 filmes ruins da semana já tinham o defeito ESCRITO no plano antes
// do POST pago à fal. O v1 reaproveitava o coherence_v2 e não separava bom de ruim (média 87,1 nos ruins × 87,6 nos bons):
// lia no máximo 1.500 caracteres por cena, perguntava "a cena mostra a fala?" (o nome presente aprova a ficha errada) e dava
// nota livre (escrevia o defeito e dava 95).
//
// O v2 é UMA chamada gpt-4o-mini (AI_TEXT_MODELS.utility), temperatura 0,3, seed 11, n=3 leituras (a maioria decide), JSON com
// schema estrito, só com PERGUNTAS DE SIM/NÃO,
// plano a plano, sobre o TEXTO FINAL que vai à fal (sem o corte de 1.500):
//   (a) a ficha/elenco do plano bate com o que o pedido/fala diz do personagem (espécie, idade, gênero, identidade)?
//   (b) algum nome usado como PERSONAGEM é na verdade lugar, time, empresa, veículo, número, efeito sonoro ou palavra comum?
//   (c) uma criatura, objeto ou adjetivo virou o protagonista NO LUGAR do protagonista da história?
//   (d) o sujeito central do pedido aparece (visível, não escondido por "faceless"/"só mãos") em algum plano?
//   (e) quando o gancho promete uma resposta, a fala + o último plano entregam?
// A nota NÃO é do modelo: reprovado = qualquer "não" em a/d ou "sim" em b/c; (e) "não" baixa a nota e vira alerta, mas sozinho
// não reprova; nota = 100 − 25 × falhas. Toda acusação de
// plano (a "não", b/c "sim") precisa citar as palavras EXATAS do texto do plano — citação que não está no texto é descartada
// (o modelo não pode inventar defeito). O prompt foi congelado só com filmes de 29-30/10 e medido nos 19 de 01/11
// (docs/calibracao/juiz-plano-v2-0111.json): META NÃO ATINGIDA — pegou 4 de 10 filmes com defeito no texto (r1) e 3 de 10 (r2),
// 1 alarme em 6 filmes sem defeito no texto; o conjunto de teste não era cego (ver o JSON). Só observar até medir em filmes novos.
// Hollywood (8-15 planos) nunca foi medido.
//
// Modo observe:
//   · NUNCA altera prompt, fala, payload ou cobrança: recebe CÓPIAS das strings e devolve só um relato.
//   · NUNCA segura o 1º POST: a rota dispara o juiz DEPOIS do envio (clássico/Kling 4 grátis) ou depois do laço que reescreve
//     hs.prompt (hollywood), com o texto exato que foi à fal, e não espera; o veredito vai só para o evento juiz_plano_verdict
//     (tabela events, só service_role), gravado depois da resposta via waitUntil (lib/posResposta). Nunca vai ao cliente.
//   · Só o ensaio de $0 (dry_run:true, contas internas) espera o veredito e o devolve.
//   · Falha segura: teto contado do início; erro, prazo, JSON inválido ou sem chave = UNVERIFIED.
// Interruptor JUIZ_PLANO_MODE = 'off' | 'observe' | 'enforce' (padrão 'observe'; 'enforce' ainda é observe até o "vai").
// TODO(KINEO-JUIZ-PLANO-0111 enforce): reescrever só o visual cru das cenas reprovadas e remontar o prompt; exige mover o
//   disparo para antes do 1º POST. Não implementar sem o "vai".
import { AI_TEXT_MODELS } from '@/lib/aiModels'
import { usdFromUsage } from '@/lib/regua95/coherenceV2'
import { waitUntilDaRequisicao } from '@/lib/posResposta'

export const JUIZ_PLANO_EVENT = 'juiz_plano_verdict'
export const JUIZ_PLANO_VERSION = 'juiz_plano_v2'
/** Teto total (início → veredito), em ms. Ninguém espera no caminho pago (o juiz corre depois do envio); só o ensaio. */
export const JUIZ_PLANO_TETO_MS = 25_000
/** O pedido do cliente pode ser um roteiro inteiro: o juiz lê os primeiros 1.500 caracteres. */
export const JUIZ_PLANO_PEDIDO_CHARS = 1500
/** Trava de custo por plano (o maior texto real visto: ~3.000). Plano maior é cortado e registrado em cenas_cortadas. */
export const JUIZ_PLANO_PLANO_CHARS = 6000
/** Citações gravadas no evento: só um trecho curto (nunca o prompt inteiro). */
export const JUIZ_PLANO_CITACAO_CHARS = 120

export type JuizPlanoModo = 'off' | 'observe' | 'enforce'
export type JuizPlanoCaminho = 'classico' | 'kling4_gratis' | 'kling4_fallback_seedance' | 'hollywood'
export type JuizPlanoFalha = 'a_ficha' | 'b_nome_falso' | 'c_criatura' | 'd_sujeito' | 'e_final'

/** JUIZ_PLANO_MODE → modo pedido. Vazio, ausente ou desconhecido = 'observe' (mede, nunca muda o filme). */
export function modoDoJuizDoPlano(valor?: string | null): JuizPlanoModo {
  const bruto = valor === undefined ? (typeof process !== 'undefined' ? process.env.JUIZ_PLANO_MODE : undefined) : valor
  const v = String(bruto ?? '').trim().toLowerCase()
  if (v === 'off') return 'off'
  if (v === 'enforce') return 'enforce'
  return 'observe'
}

export type JuizPlanoEntrada = {
  caminho: JuizPlanoCaminho
  /** true = o ensaio de $0 (dry_run:true), com o texto que IRIA à fal (sem os stills) */
  ensaio?: boolean
  engine: string | null
  /** o `prompt` da rota: a ideia solta, ou "[Idea: …]" + roteiro, ou o roteiro colado */
  pedido: string
  verbatim: boolean
  seconds: number | null
  /** plano a plano, na ordem: a fala daquele plano e o texto FINAL que foi (ou iria) à fal */
  cenas: Array<{ fala: string; prompt: string }>
}

// ── o texto que foi à fal ──

/**
 * O texto exato de cada plano que a rota mandou à fal. Kling 4 grátis: os `multi_prompt` do input de buildKling4TrialInput
 * (compactados por promptDaCenaKling4 e cortados em 512); fallback e clássico: o `prompt` do input assinado de cada cena.
 * Cena sem input (nunca foi à fal) fica fora. `kling4Input` é uma função porque montar o input pode lançar.
 */
export function planoDoEnvio(args: {
  kling4Candidato: boolean
  kling4Input: () => Record<string, unknown> | null | undefined
  falas: readonly string[]
  inputs: ReadonlyArray<Record<string, unknown> | null | undefined>
}): { caminho: JuizPlanoCaminho; cenas: Array<{ fala: string; prompt: string }> } {
  let multi: Array<{ prompt?: unknown }> | null = null
  if (args.kling4Candidato) {
    try {
      const input = args.kling4Input()
      const mp = input && Array.isArray(input.multi_prompt) ? (input.multi_prompt as Array<{ prompt?: unknown }>) : null
      if (mp && mp.length > 0) multi = mp
    } catch { multi = null }
  }
  if (multi) {
    return { caminho: 'kling4_gratis', cenas: multi.map((m, i) => ({ fala: String(args.falas[i] ?? ''), prompt: typeof m?.prompt === 'string' ? m.prompt : '' })) }
  }
  return {
    caminho: args.kling4Candidato ? 'kling4_fallback_seedance' : 'classico',
    cenas: args.inputs.flatMap((input, i) => {
      const enviado = input?.prompt
      return typeof enviado === 'string' && enviado.trim() ? [{ fala: String(args.falas[i] ?? ''), prompt: enviado }] : []
    }),
  }
}

/** Frases de estilo FIXAS, iguais em todo filme, que não dizem nada sobre o sujeito (tiradas literalmente, só elas). */
export const FRASES_FIXAS_DO_PLANO = [
  '9:16 vertical framing, subject framed in the upper two-thirds with the lower third clear for captions, smooth camera motion, ',
  'no watermark, no logo, no readable text, letters, numbers, labels or signage anywhere in the frame, ',
  'same photorealistic look in every scene, one consistent color grade and lighting, same lens and film grain, ',
  'characters act naturally within the scene without addressing the viewer, ',
  'Opening shot: show the described subject and action immediately in the first frame, clearly readable; no unrelated establishing landscape or slow fade-in. ',
] as const

export function limparTextoDoPlano(texto: string): string {
  let t = String(texto ?? '')
  for (const f of FRASES_FIXAS_DO_PLANO) t = t.split(f).join('')
  return t.replace(/\s+/g, ' ').trim()
}

// ── a pergunta ──

const IDEIA_COLCHETE = /^\s*\[Idea:\s*([^\]\n]*)\]\s*/i

/** Pedido da rota → o que o cliente pediu ("[Idea: …]" vence) e o resto (roteiro), cortados para o juiz. */
export function pedidoParaOJuiz(pedido: string): { ideia: string | null; texto: string } {
  const p = String(pedido ?? '')
  const m = p.match(IDEIA_COLCHETE)
  const ideia = m && m[1].trim() ? m[1].trim() : null
  return { ideia, texto: Array.from(p).slice(0, JUIZ_PLANO_PEDIDO_CHARS).join('') }
}

export const JUIZ_PLANO_SYSTEM = `You check the TEXT PLAN of a short AI film BEFORE it is sent to a video model. You receive the customer's REQUEST, the NARRATION (what the voice says, per shot) and each SHOT's final prompt text exactly as it will be sent. Video models draw literally what the shot text describes: a wrong character description in the text becomes a wrong film. Answer only the questions below, about the TEXT. Ignore style, camera, lighting, beauty, text/watermark rules and other boilerplate. The request and narration may be in any language; the shot text is usually English.

For EACH shot, in this order:
(a) "ficha_no_texto": copy verbatim the character description written in the shot text, if any (patterns like "Named character(s) in this shot: X, a person in their thirties…", "main character (X, …)", "Identity: X, …", "Visible: X, …", "Recurring characters … the X is …", "Cast: a man and a woman, both adults"). Empty string when the shot has none.
    "historia_diz": copy verbatim the words of the REQUEST or NARRATION that state or clearly imply who/what that character is (e.g. "talking vegetables", "a girl with pigtails", "preschool", "Tsutomu Yamaguchi", "Noah's Ark", "Naruto"). Empty string when the story says nothing about it.
    "a_ficha_contradiz": "sem_ficha" when ficha_no_texto is empty; "nao" when historia_diz is empty. Otherwise "sim" when that description clearly CONTRADICTS what the REQUEST/NARRATION says or clearly implies about that character — kind/species (human, animal, vegetable, robot, object), age group (child vs adult), gender, or identity (a real historical person's ethnicity and era, a well-known fictional or religious figure); else "nao". Examples of "sim": talking vegetables described as "a man in their early thirties" or a cast of "a man and a woman, both adults"; a preschool girl described as "a woman in her early thirties"; a Japanese man of 1945 with "sandy-blond hair … leather jacket and dark jeans"; the biblical Noah described as "a god"; an anime hero described as an ordinary adult in a wool coat. When the REQUEST/NARRATION says nothing about an attribute, an invented look is fine ("nao"): e.g. "Serafina, a person in their thirties with sandy-blond hair" when the story only says she is an agent. But a real, named historical person, or a famous fictional or religious figure, carries their known identity (ethnicity, era, species), and a story about children, animals or vegetables implies that kind.
(b) "b_nome_falso": "sim" when a name used as a CHARACTER in the shot (given a body, face, age or costume, or called "main character") is actually NOT a character of the story — a place, country, team, company, vehicle, number, time, sound or music cue, or an ordinary word or verb lifted from the text. Examples: "Barcelona" as the main character of a football story; "Check" (from "Confira o seu"); "Open (the son)" (from "open the door"); "Sound" (from "Sound: record scratch"); "Cute". A team, club, company, brand, city or country is never a character, even when the story talks about it. The story's real characters (people, animals, vegetables, heroes, villains) are NEVER "sim" here, even when their description is wrong — that is question (a). "b_nome": that exact name as written in the shot text, else "".
(c) "c_criatura_no_lugar": "sim" when the shot text makes a creature, object or adjective the protagonist IN PLACE of the story's own protagonist (e.g. "The only person in this shot is the same main character (the bunny …)" when the story's hero is someone else). Not when the story itself is about that creature. "c_citacao": the exact words from the shot text, else "".

Film level:
(d) "d_sujeito": the central subject of the REQUEST — what the customer asked to see (an ad: the product, and the person wearing/using it if asked; a story: its main character(s); a documentary: the object, place or event). "d_sujeito_e_pessoa": "sim" when that subject is a human being the customer wants to see (a character, an influencer, a family, a king); "nao" for objects, places, events, animals, and for ghosts, monsters, shadow figures or creatures. "d_sujeito_aparece": "sim" when at least one shot's text shows that subject as a visible subject; "nao" when no shot describes it, or when the subject is a person or people and every shot that mentions them hides them ("faceless cinematic b-roll … no foreground human faces", only hands, distant silhouette, "no people").
(e) "e_promessa": the specific answer or payoff the REQUEST or the NARRATION's hook promises (a reveal, what was found, who wins, how it ends), else "". "e_final_entrega": "nao_se_aplica" when nothing specific is promised (questions to the audience such as "what will they choose? stay tuned" or "write your answer in the comments" are not promises; a mood or a message is not a promise). "nao" ONLY when the promised answer is never stated in the narration AND the last shot does not show it. Otherwise "sim".

Keep "e_motivo" short (max 20 words, Portuguese). Copy shot text verbatim; never paraphrase a quote.`

export const JUIZ_PLANO_SCHEMA = {
  name: 'juiz_plano_v2',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['protagonista', 'planos', 'd_sujeito', 'd_sujeito_e_pessoa', 'd_sujeito_aparece', 'e_promessa', 'e_final_entrega', 'e_motivo'],
    properties: {
      protagonista: { type: 'string' },
      planos: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['plano', 'ficha_no_texto', 'historia_diz', 'a_ficha_contradiz', 'b_nome_falso', 'b_nome', 'c_criatura_no_lugar', 'c_citacao'],
          properties: {
            plano: { type: 'integer' },
            ficha_no_texto: { type: 'string' },
            historia_diz: { type: 'string' },
            a_ficha_contradiz: { type: 'string', enum: ['sim', 'nao', 'sem_ficha'] },
            b_nome_falso: { type: 'string', enum: ['sim', 'nao'] },
            b_nome: { type: 'string' },
            c_criatura_no_lugar: { type: 'string', enum: ['sim', 'nao'] },
            c_citacao: { type: 'string' },
          },
        },
      },
      d_sujeito: { type: 'string' },
      d_sujeito_e_pessoa: { type: 'string', enum: ['sim', 'nao'] },
      d_sujeito_aparece: { type: 'string', enum: ['sim', 'nao'] },
      e_promessa: { type: 'string' },
      e_final_entrega: { type: 'string', enum: ['sim', 'nao', 'nao_se_aplica'] },
      e_motivo: { type: 'string' },
    },
  },
} as const

/** As mensagens da chamada (puras; o guardião confere que a chamada leva exatamente estas). */
export function montarMensagensJuizPlano(entrada: JuizPlanoEntrada) {
  const ped = pedidoParaOJuiz(entrada.pedido)
  const linhas = entrada.cenas.map((c, i) => {
    const texto = Array.from(limparTextoDoPlano(c.prompt)).slice(0, JUIZ_PLANO_PLANO_CHARS).join('')
    return `SHOT ${i + 1}${i === entrada.cenas.length - 1 ? ' (LAST)' : ''}\nnarration: ${String(c.fala ?? '').trim() || '(none)'}\ntext: ${texto || '(empty)'}`
  })
  const user = [
    ped.ideia ? `REQUEST (the customer's own words): ${ped.ideia}` : null,
    `REQUEST${ped.ideia ? ' + SCRIPT' : ''}: ${ped.texto}`,
    `FILM: ${entrada.seconds ?? '?'} s, ${entrada.cenas.length} shot(s)`,
    '',
    ...linhas,
  ].filter((l) => l !== null).join('\n')
  return [{ role: 'system' as const, content: JUIZ_PLANO_SYSTEM }, { role: 'user' as const, content: user }]
}

// ── a derivação (código, não o modelo) ──

export type JuizPlanoRespostaPlano = { plano: number; a: 'bate' | 'contradiz' | 'sem_ficha'; b: 'sim' | 'nao'; c: 'sim' | 'nao'; citacoes: string[]; descartadas: string[] }

export type JuizPlanoVeredito = {
  versao: string
  modo: 'observe'
  modo_pedido: JuizPlanoModo
  caminho: JuizPlanoCaminho
  ensaio: boolean
  engine: string | null
  status: 'JUDGED' | 'UNVERIFIED'
  /** true = qualquer "não" em a/d ou "sim" (com citação verificada) em b/c; (e) sozinho é alerta, não reprova */
  reprovado: boolean
  /** = reprovado (nome mantido para o painel e para o enforce) */
  aponta: boolean
  /** 100 − 25 × falhas (piso 0); null quando não julgou. Nunca é nota livre do modelo. */
  nota: number | null
  falhas: JuizPlanoFalha[]
  /** frases curtas para a revisão das 48 h (com citação de até 120 caracteres; nunca o prompt inteiro) */
  defeitos: string[]
  /** planos (1..N) que o enforce reescreveria */
  cenas_reescreveria: number[]
  protagonista: string
  d_sujeito: string
  d_sujeito_aparece: 'sim' | 'nao' | null
  d_sujeito_e_pessoa: boolean | null
  /** true = o sujeito é humano e todo plano está no modo sem rosto (decidido em código, não pelo modelo) */
  d_escondido_sem_rosto: boolean
  e_promessa: string
  e_final_entrega: 'sim' | 'nao' | 'nao_se_aplica' | null
  planos: Array<{ plano: number; a: string; b: string; c: string }>
  /** acusações cuja citação NÃO está no texto do plano (descartadas, não contam) */
  citacoes_descartadas: number
  /** as acusações descartadas (plano, pergunta e o trecho que o modelo citou), para a revisão das 48 h */
  descartes: string[]
  cenas: number
  cenas_cortadas: number[]
  motivo: string
  /** leituras pedidas na chamada, as válidas e as falhas de cada uma (a maioria decide) */
  leituras: number
  leituras_validas: number
  leituras_falhas: string[]
  modelo: string | null
  usd: number
  ms: number
}

const norm = (s: string) => String(s ?? '').toLowerCase().replace(/[“”"'‘’`´]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
const curto = (s: string) => { const t = String(s ?? '').replace(/\s+/g, ' ').trim(); return t.length > JUIZ_PLANO_CITACAO_CHARS ? `${t.slice(0, JUIZ_PLANO_CITACAO_CHARS - 1)}…` : t }

/** A citação está no texto do plano? Exata (normalizada) ou ≥ 85% das palavras dela, se tiver 4+ palavras. */
export function citacaoNoTexto(citacao: string, texto: string): boolean {
  const c = norm(citacao), t = norm(texto)
  if (!c || c.length < 3) return false
  if (t.includes(c)) return true
  const palavras = c.split(' ').filter((w) => w.length >= 3)
  if (palavras.length < 4) return false
  const conjunto = new Set(t.split(' '))
  return palavras.filter((w) => conjunto.has(w)).length / palavras.length >= 0.85
}

function base(entrada: JuizPlanoEntrada, modoPedido: JuizPlanoModo): JuizPlanoVeredito {
  return {
    versao: JUIZ_PLANO_VERSION, modo: 'observe', modo_pedido: modoPedido, caminho: entrada.caminho, ensaio: entrada.ensaio === true,
    engine: entrada.engine, status: 'UNVERIFIED', reprovado: false, aponta: false, nota: null, falhas: [], defeitos: [],
    cenas_reescreveria: [], protagonista: '', d_sujeito: '', d_sujeito_aparece: null, d_sujeito_e_pessoa: null, d_escondido_sem_rosto: false, e_promessa: '', e_final_entrega: null, planos: [],
    citacoes_descartadas: 0, descartes: [], cenas: entrada.cenas.length,
    cenas_cortadas: entrada.cenas.map((c, i) => (Array.from(limparTextoDoPlano(c.prompt)).length > JUIZ_PLANO_PLANO_CHARS ? i + 1 : 0)).filter(Boolean),
    motivo: '', leituras: 1, leituras_validas: 0, leituras_falhas: [], modelo: null, usd: 0, ms: 0,
  }
}

const ENUM_SN = new Set(['sim', 'nao'])
/** Onde a NOSSA rota escreve uma ficha de personagem no plano (só citação com um destes conta como ficha). */
export const MARCA_DE_FICHA = /Named characters? in this shot:|main character \(|Identity:|Visible:|Recurring characters|consistent design:|Cast:|\b(a|an)\s+(person|man|woman|boy|girl|human|child|kid|god|goddess)\b/i
const escaparRe = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
/** O nome está no plano COMO PERSONAGEM (logo depois de uma marca de ficha da rota)? */
export function nomeComoPersonagem(nome: string, texto: string): boolean {
  const n = String(nome ?? '').trim()
  if (n.length < 2) return false
  const re = new RegExp(`(Named characters? in this shot:[^.]{0,400}?|main character \\(|Identity:\\s*|Visible:\\s*|consistent design:\\s*|Recurring characters[^:]{0,80}:\\s*(?:the\\s+)?)${escaparRe(n)}`, 'i')
  return re.test(String(texto ?? ''))
}
/** Marcadores do modo sem rosto: o plano esconde pessoas de propósito ("seen from behind or in profile" NÃO esconde). */
export const PLANO_ESCONDE_PESSOAS = /faceless cinematic b-roll|no foreground human faces|\bno people\b|no human figures|distant silhouettes?\b|silhouetted figure/i
const ENUM_E = new Set(['sim', 'nao', 'nao_se_aplica'])

/**
 * Resposta do modelo → veredito (puro; exportado para o guardião). A nota sai SÓ das respostas; resposta fora do schema = UNVERIFIED.
 */
export function vereditoDasRespostas(entrada: JuizPlanoEntrada, modoPedido: JuizPlanoModo, bruto: unknown, extra?: { modelo?: string | null; usd?: number; ms?: number }): JuizPlanoVeredito {
  const v = { ...base(entrada, modoPedido), modelo: extra?.modelo ?? null, usd: Math.round((extra?.usd ?? 0) * 1e6) / 1e6, ms: extra?.ms ?? 0 }
  const r = bruto && typeof bruto === 'object' ? (bruto as Record<string, unknown>) : null
  if (!r || !Array.isArray(r.planos) || !ENUM_SN.has(String(r.d_sujeito_aparece)) || !ENUM_E.has(String(r.e_final_entrega))) return { ...v, motivo: 'resposta_fora_do_schema' }
  const n = entrada.cenas.length
  const textos = entrada.cenas.map((c) => limparTextoDoPlano(c.prompt))
  const pedidoBruto = pedidoParaOJuiz(entrada.pedido).texto
  const falasBrutas = entrada.cenas.map((c) => c.fala).join(' ')
  const planos: JuizPlanoRespostaPlano[] = []
  const falhas = new Set<JuizPlanoFalha>()
  const defeitos: string[] = []
  const reescrever = new Set<number>()
  let descartadas = 0
  const descartes: string[] = []
  for (const p of r.planos as Array<Record<string, unknown>>) {
    const idx = Number(p?.plano)
    if (!Number.isInteger(idx) || idx < 1 || idx > n || planos.some((x) => x.plano === idx)) continue
    const a: JuizPlanoRespostaPlano['a'] = String(p.a_ficha_contradiz) === 'sim' ? 'contradiz' : String(p.a_ficha_contradiz) === 'nao' ? 'bate' : 'sem_ficha'
    const b = ENUM_SN.has(String(p.b_nome_falso)) ? (String(p.b_nome_falso) as 'sim' | 'nao') : 'nao'
    const c = ENUM_SN.has(String(p.c_criatura_no_lugar)) ? (String(p.c_criatura_no_lugar) as 'sim' | 'nao') : 'nao'
    const item: JuizPlanoRespostaPlano = { plano: idx, a, b, c, citacoes: [], descartadas: [] }
    const texto = textos[idx - 1]
    const acusar = (falha: JuizPlanoFalha, citacao: unknown, rotulo: string) => {
      const cit = String(citacao ?? '')
      if (!citacaoNoTexto(cit, texto)) { descartadas++; item.descartadas.push(falha); descartes.push(`plano ${idx} · ${falha}: "${curto(cit) || '(sem citação)'}"`); return }
      falhas.add(falha); reescrever.add(idx); item.citacoes.push(cit)
      defeitos.push(`plano ${idx} · ${rotulo}: "${curto(cit)}"`)
    }
    if (a === 'contradiz') {
      const ficha = String(p.ficha_no_texto ?? ''), diz = String(p.historia_diz ?? '')
      // a acusação precisa de uma FICHA de verdade no plano e de palavras da história que digam quem o personagem é
      if (!MARCA_DE_FICHA.test(ficha) || !citacaoNoTexto(diz, `${pedidoBruto} ${falasBrutas} ${texto}`)) { descartadas++; item.descartadas.push('a_ficha'); descartes.push(`plano ${idx} · a_ficha: "${curto(ficha) || '(sem ficha)'}" × "${curto(diz) || '(a história não diz)'}"`) }
      else acusar('a_ficha', ficha, `ficha contradiz "${curto(diz)}"`)
    }
    if (b === 'sim') {
      const nome = String(p.b_nome ?? '').trim()
      if (nome && nomeComoPersonagem(nome, texto)) acusar('b_nome_falso', nome, `"${curto(nome)}" não é personagem e virou gente`)
      else { descartadas++; item.descartadas.push('b_nome_falso'); descartes.push(`plano ${idx} · b_nome_falso: nome "${curto(nome) || '(vazio)'}" fora do texto`) }
    }
    if (c === 'sim') acusar('c_criatura', p.c_citacao, 'criatura/adjetivo no lugar do protagonista')
    planos.push(item)
  }
  const dPessoa = String(r.d_sujeito_e_pessoa) === 'sim'
  // (d) mecânico: sujeito humano e TODO plano no modo sem rosto (faceless/silhueta/sem gente) = o cliente não vê quem pediu.
  const dEscondido = dPessoa && n > 0 && textos.every((t) => PLANO_ESCONDE_PESSOAS.test(t))
  const dAparece: 'sim' | 'nao' = String(r.d_sujeito_aparece) === 'nao' || dEscondido ? 'nao' : 'sim'
  const eFinal = String(r.e_final_entrega) as 'sim' | 'nao' | 'nao_se_aplica'
  const dSujeito = curto(String(r.d_sujeito ?? ''))
  const ePromessa = curto(String(r.e_promessa ?? ''))
  if (dAparece === 'nao') { falhas.add('d_sujeito'); defeitos.push(`sujeito do pedido ${dEscondido && String(r.d_sujeito_aparece) !== 'nao' ? 'escondido pelo modo sem rosto em todos os planos' : 'ausente/escondido em todos os planos'}: ${dSujeito || '?'}`) }
  if (eFinal === 'nao') { falhas.add('e_final'); if (n > 0) reescrever.add(n); defeitos.push(`o final não entrega a promessa: ${ePromessa || '?'} — ${curto(String(r.e_motivo ?? ''))}`) }
  const lista = (['a_ficha', 'b_nome_falso', 'c_criatura', 'd_sujeito', 'e_final'] as JuizPlanoFalha[]).filter((f) => falhas.has(f))
  // regra do pedido: qualquer "sim" em b/c ou "não" em a/d = reprovado; (e) baixa a nota e vira alerta, mas sozinho não reprova
  const reprovado = lista.some((f) => f !== 'e_final')
  planos.sort((x, y) => x.plano - y.plano)
  return {
    ...v,
    status: 'JUDGED',
    reprovado,
    aponta: reprovado,
    nota: Math.max(0, 100 - 25 * lista.length),
    falhas: lista,
    defeitos: defeitos.slice(0, 8),
    cenas_reescreveria: lista.length > 0 ? [...reescrever].sort((x, y) => x - y) : [],
    protagonista: curto(String(r.protagonista ?? '')),
    d_sujeito: dSujeito,
    d_sujeito_aparece: dAparece,
    d_sujeito_e_pessoa: dPessoa,
    d_escondido_sem_rosto: dEscondido,
    e_promessa: ePromessa,
    e_final_entrega: eFinal,
    planos: planos.map((p) => ({ plano: p.plano, a: p.a, b: p.b, c: p.c })),
    citacoes_descartadas: descartadas,
    descartes: descartes.slice(0, 8),
    motivo: reprovado ? `reprovado: ${lista.join(', ')}` : lista.length ? `alerta: ${lista.join(', ')}` : 'aprovado',
  }
}

/** Leituras por chamada (n da OpenAI: UMA requisição, várias respostas) e a maioria que decide cada pergunta. */
export const JUIZ_PLANO_LEITURAS = 3

/**
 * Junta as leituras de UMA chamada: cada falha só conta se aparece (com citação verificada) na MAIORIA das leituras válidas.
 * Puro; exportado para o guardião. Sem leitura válida = UNVERIFIED.
 */
export function combinarLeituras(entrada: JuizPlanoEntrada, modoPedido: JuizPlanoModo, leituras: JuizPlanoVeredito[], extra?: { modelo?: string | null; usd?: number; ms?: number }): JuizPlanoVeredito {
  const validas = leituras.filter((l) => l.status === 'JUDGED')
  const usd = Math.round((extra?.usd ?? 0) * 1e6) / 1e6
  if (validas.length === 0) return { ...base(entrada, modoPedido), motivo: leituras[0]?.motivo || 'sem_leitura_valida', modelo: extra?.modelo ?? null, usd, ms: extra?.ms ?? 0, leituras: leituras.length, leituras_validas: 0 }
  const minimo = Math.floor(validas.length / 2) + 1
  const ordem: JuizPlanoFalha[] = ['a_ficha', 'b_nome_falso', 'c_criatura', 'd_sujeito', 'e_final']
  const falhas = ordem.filter((f) => validas.filter((l) => l.falhas.includes(f)).length >= minimo)
  // a leitura que melhor representa a maioria: a que tem exatamente essas falhas (ou a primeira válida)
  const rep = validas.find((l) => l.falhas.join() === falhas.join()) ?? validas[0]
  const prefixo: Record<JuizPlanoFalha, RegExp> = { a_ficha: /ficha contradiz/, b_nome_falso: /não é personagem/, c_criatura: /criatura\/adjetivo/, d_sujeito: /^sujeito do pedido/, e_final: /^o final não entrega/ }
  const defeitos = [...new Set(validas.flatMap((l) => l.defeitos).filter((d) => falhas.some((f) => prefixo[f].test(d))))].slice(0, 8)
  const reescrever = new Set<number>()
  for (const d of defeitos) { const m = d.match(/^plano (\d+) ·/); if (m) reescrever.add(Number(m[1])) }
  if (falhas.includes('e_final') && entrada.cenas.length > 0) reescrever.add(entrada.cenas.length)
  const reprovado = falhas.some((f) => f !== 'e_final')
  return {
    ...rep,
    reprovado,
    aponta: reprovado,
    nota: Math.max(0, 100 - 25 * falhas.length),
    falhas,
    defeitos,
    cenas_reescreveria: falhas.length ? [...reescrever].sort((x, y) => x - y) : [],
    d_sujeito_aparece: falhas.includes('d_sujeito') ? 'nao' : 'sim',
    citacoes_descartadas: validas.reduce((a, l) => a + l.citacoes_descartadas, 0),
    descartes: [...new Set(validas.flatMap((l) => l.descartes))].slice(0, 8),
    leituras: leituras.length,
    leituras_validas: validas.length,
    leituras_falhas: validas.map((l) => l.falhas.join('+') || '-'),
    motivo: reprovado ? `reprovado: ${falhas.join(', ')}` : falhas.length ? `alerta: ${falhas.join(', ')}` : 'aprovado',
    modelo: extra?.modelo ?? rep.modelo,
    usd,
    ms: extra?.ms ?? rep.ms,
  }
}

// ── a chamada ──

export type JuizPlanoHandle = { inicio: number; veredito: Promise<JuizPlanoVeredito> }

async function perguntar(entrada: JuizPlanoEntrada, modoPedido: JuizPlanoModo, inicio: number, opts: { apiKey: string; fetchImpl?: typeof fetch; timeoutMs: number; model?: string }): Promise<JuizPlanoVeredito> {
  const model = opts.model ?? AI_TEXT_MODELS.utility
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs)
  try {
    const res = await (opts.fetchImpl ?? fetch)('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${opts.apiKey}` },
      body: JSON.stringify({ model, temperature: 0.3, seed: 11, n: JUIZ_PLANO_LEITURAS, max_tokens: 3000, response_format: { type: 'json_schema', json_schema: JUIZ_PLANO_SCHEMA }, messages: montarMensagensJuizPlano(entrada) }),
    })
    if (!res.ok) return { ...base(entrada, modoPedido), motivo: `http_${res.status}`, ms: Date.now() - inicio }
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string; refusal?: string | null } }>; usage?: { prompt_tokens?: number; completion_tokens?: number } }
    const usd = usdFromUsage(data.usage)
    const ms = Date.now() - inicio
    const leituras = (data.choices ?? []).map((ch) => {
      try { return vereditoDasRespostas(entrada, modoPedido, JSON.parse(ch?.message?.content ?? ''), { modelo: model, ms }) } catch { return { ...base(entrada, modoPedido), motivo: 'json_invalido' } }
    })
    if (leituras.length === 0) return { ...base(entrada, modoPedido), motivo: 'sem_resposta', modelo: model, usd, ms }
    return combinarLeituras(entrada, modoPedido, leituras, { modelo: model, usd, ms })
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Dispara o juiz (não espera). 'off' = null (nada roda). A promessa NUNCA rejeita e termina em até `tetoMs` desde a chamada;
 * `aoDecidir` (o evento) roda UMA vez e faz parte da promessa entregue ao waitUntil da requisição (sobrevive à resposta).
 */
export function iniciarJuizDoPlano(
  entrada: JuizPlanoEntrada,
  opts?: { modo?: JuizPlanoModo; tetoMs?: number; fetchImpl?: typeof fetch; apiKey?: string; model?: string; aoDecidir?: (v: JuizPlanoVeredito) => unknown; waitUntil?: ((p: Promise<unknown>) => void) | null },
): JuizPlanoHandle | null {
  const modoPedido = opts?.modo ?? modoDoJuizDoPlano()
  if (modoPedido === 'off') return null
  const inicio = Date.now()
  const teto = Math.max(50, opts?.tetoMs ?? JUIZ_PLANO_TETO_MS)
  // cópia: o juiz nunca recebe a referência dos arrays da rota (strings são imutáveis).
  const copia: JuizPlanoEntrada = { ...entrada, cenas: entrada.cenas.map((c) => ({ fala: String(c?.fala ?? ''), prompt: String(c?.prompt ?? '') })) }
  const julgar = (async (): Promise<JuizPlanoVeredito> => {
    try {
      const key = opts?.apiKey ?? (typeof process !== 'undefined' ? process.env.OPENAI_API_KEY : undefined)
      if (!key) return { ...base(copia, modoPedido), motivo: 'sem_chave', ms: Date.now() - inicio }
      if (copia.cenas.length === 0 || copia.cenas.every((c) => !c.prompt.trim())) return { ...base(copia, modoPedido), motivo: 'plano_vazio', ms: Date.now() - inicio }
      return await perguntar(copia, modoPedido, inicio, { apiKey: key, fetchImpl: opts?.fetchImpl, timeoutMs: Math.max(25, teto - 150), model: opts?.model })
    } catch {
      return { ...base(copia, modoPedido), motivo: 'erro', ms: Date.now() - inicio }
    }
  })()
  let timer: ReturnType<typeof setTimeout> | null = null
  const prazo = new Promise<JuizPlanoVeredito>((resolve) => {
    timer = setTimeout(() => resolve({ ...base(copia, modoPedido), motivo: 'prazo', ms: Date.now() - inicio }), teto)
  })
  const veredito = Promise.race([julgar, prazo]).then(async (v) => {
    if (timer) clearTimeout(timer)
    try { await opts?.aoDecidir?.(v) } catch { /* o evento nunca derruba o filme */ }
    return v
  })
  try { (opts?.waitUntil === undefined ? waitUntilDaRequisicao() : opts.waitUntil)?.(veredito) } catch { /* sem contexto: segue como fogo-e-esquece */ }
  return { inicio, veredito }
}

/** Espera o veredito (só o ensaio de $0 usa) sem passar do teto contado do INÍCIO. null quando desligado. Nunca rejeita. */
export async function esperarJuizDoPlano(h: JuizPlanoHandle | null, tetoMs = JUIZ_PLANO_TETO_MS): Promise<JuizPlanoVeredito | null> {
  if (!h) return null
  const resta = Math.max(0, tetoMs - (Date.now() - h.inicio)) + 250
  let timer: ReturnType<typeof setTimeout> | null = null
  try {
    return await Promise.race([h.veredito, new Promise<null>((resolve) => { timer = setTimeout(() => resolve(null), resta) })])
  } catch {
    return null
  } finally {
    if (timer) clearTimeout(timer)
  }
}
