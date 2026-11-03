// ═══ KINEO-RECUSA-BOTAO-3110 [TRAVA 8.2 — vai do fundador 31/10 "10 tarefas, já vamos fazer"] — a recusa vira BOTÃO ═══
//
// O CASO (7 dias até 31/10): gente nova clicou em gerar e leu uma recusa honesta — "Your request asks for 60 seconds, but the
// selected duration is 15 seconds", "This script reads for about 141 seconds — too long for a 15-second film", "This looks like
// a shot plan", "This looks like a video request, not a finished narration", "the AI declined the topic", "high demand" — e foi
// embora. Cada frase já dizia a saída; nenhuma deixava apertá-la. Próximo passo aprovado no fluxo de 30/10: "recusas viram botão".
//
// ESTE MÓDULO (puro, sem rede/banco/relógio; o cliente e a rota importam o mesmo arquivo — guardião scripts/test-recusa-botao-3110.mjs):
//   1. fixDaRecusa(corpo)       → o conserto ESTRUTURADO de uma recusa (código + números), a partir dos campos que a rota já manda
//                                 (reason/code, requested_seconds, selected_seconds, suggested_seconds, queued/parked) e, sem eles,
//                                 da própria frase (cliente velho/servidor velho, telas que só guardam o texto).
//   2. anexarFixDaRecusa(res)   → a rota do cinematic anexa `fix` a TODA resposta de erro que tenha conserto conhecido (uma linha
//                                 no POST: nenhuma das ~40 recusas da rota precisou ser reescrita).
//   3. resolverBotoesDaRecusa() → o cliente decide o que CABE: duração oferecida pelo motor, saldo que paga, modo do texto. Conserto
//                                 que não cabe cai na alternativa (ex.: "Make it 60s" sem saldo → "Shorten to 15s for me").
//   4. trocarDuracaoNoTexto()   → a alternativa do "pediu 60, escolheu 15": reescreve só o número do pedido e CONFERE com o mesmo
//                                 leitor de diretrizes da rota (lib/pastedDirectives) que a recusa não volta.
// DINHEIRO: nada aqui cobra. O botão que muda a duração mostra o custo real (a função que cobra, passada pelo cliente) no rótulo.
// FILA: "high demand" com o filme ESTACIONADO (KINEO-FILA-QUEDA-FAL-2810, parked:true) não ganha botão — ele já recomeça sozinho.
// Só o que NÃO pôde estacionar (cena aceita/ambígua = gasto possível na fal; re-POSTar duplicaria cobrança) ganha o "Retry
// automatically in 2 min", que o próprio cliente agenda.
import { readPastedDirectives } from './pastedDirectives'

export const RECUSA_BOTAO_VERSION = 'recusa_botao_3110_v1'
export const RECUSA_BOTAO_MARCA = 'KINEO-RECUSA-BOTAO-3110'
/** Espera do "Retry automatically" (segundos). */
export const RETRY_LATER_SECONDS = 120
/** O ângulo seguro: pede ao MESMO escritor um tratamento respeitoso e factual do mesmo tema (nada é escondido da pessoa). */
export const SAFER_ANGLE_PREFIX = 'A respectful, factual, family-friendly short documentary about: '

export type RefusalFixCode =
  | 'switch_duration'       // trocar a duração para a que o texto pede / a sugerida
  | 'match_text_duration'   // manter a duração e reescrever o número do pedido no texto
  | 'shorten_for_me'        // modo IA na MESMA duração: o escritor condensa
  | 'ai_structure'          // modo IA com o MESMO texto: vira filme narrado
  | 'safer_angle'           // modo IA com o prefixo do ângulo seguro
  | 'retry_later'           // reenviar sozinho em N segundos

export type RefusalFix = {
  code: RefusalFixCode
  /** A recusa de origem (reason/code do servidor, ou 'text:<padrão>' quando veio da frase). */
  reason: string
  /** switch_duration: a duração-alvo · shorten_for_me / match_text_duration: a duração mantida. */
  seconds?: number
  /** match_text_duration: os segundos que o texto pede. */
  askedSeconds?: number
  /** retry_later: espera em segundos. */
  afterSec?: number
  alt?: RefusalFix
}

const CODES: ReadonlySet<string> = new Set(['switch_duration', 'match_text_duration', 'shorten_for_me', 'ai_structure', 'safer_angle', 'retry_later'])

function num(v: unknown): number | undefined {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN
  return Number.isFinite(n) && n > 0 && n <= 600 ? Math.round(n) : undefined
}

function sanear(v: unknown, depth = 0): RefusalFix | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null
  const o = v as Record<string, unknown>
  if (typeof o.code !== 'string' || !CODES.has(o.code)) return null
  const fix: RefusalFix = { code: o.code as RefusalFixCode, reason: typeof o.reason === 'string' ? o.reason.slice(0, 80) : 'server' }
  const s = num(o.seconds); if (s) fix.seconds = s
  const a = num(o.askedSeconds); if (a) fix.askedSeconds = a
  const w = num(o.afterSec); if (w) fix.afterSec = w
  if ((fix.code === 'switch_duration' || fix.code === 'match_text_duration') && !fix.seconds) return null
  if (fix.code === 'match_text_duration' && !fix.askedSeconds) return null
  if (depth === 0 && o.alt) { const alt = sanear(o.alt, 1); if (alt) fix.alt = alt }
  return fix
}

// As frases (EN/PT/ES) de lib/requestFidelity, lib/durationByEngine, lib/modelRefusal e da rota do cinematic.
const RE_PEDIU_X_ESCOLHEU_Y = [
  /asks for (\d+) seconds?, but the selected duration is (\d+) seconds?/i,
  /menciona (\d+) segundos, mas a dura[çc][ãa]o selecionada [ée] (\d+) segundos/i,
  /menciona (\d+) segundos, pero la duraci[óo]n seleccionada es de (\d+) segundos/i,
]
const RE_LONGO_DEMAIS = /reads for about (\d+) seconds?\W{1,4}too long for an? (\d+)-second film(?:.*?\bpick (\d+)\s?s\b)?/i
const RE_PLANO_DE_CAMERA = /looks like a shot plan\b/i
const RE_PEDIDO_NAO_FALA = /looks like a video request, not a finished narration|parece um pedido de v[íi]deo, n[ãa]o a fala pronta|parece una solicitud de v[íi]deo, no una narraci[óo]n lista/i
const RE_IA_RECUSOU = /could not turn this idea into a script \(the AI declined the topic\)/i
const RE_ALTA_DEMANDA = /experiencing high demand/i
const RE_ESTACIONADO = /Your film is saved|engine is paused/i

function pedidoXEscolhaY(reason: string, asked: number, selected: number): RefusalFix | null {
  if (!(asked > selected)) return null
  return { code: 'switch_duration', reason, seconds: asked, alt: { code: 'match_text_duration', reason, seconds: selected, askedSeconds: asked } }
}
function longoDemais(reason: string, selected: number, suggested?: number): RefusalFix {
  const alt: RefusalFix | undefined = suggested && suggested > selected ? { code: 'switch_duration', reason, seconds: suggested } : undefined
  return { code: 'shorten_for_me', reason, seconds: selected, ...(alt ? { alt } : {}) }
}

/**
 * O conserto de uma recusa, ou null. Aceita o corpo JSON da resposta (ou só `{ error }`).
 * Ordem: `fix` já pronto → campos estruturados → a frase.
 */
export function fixDaRecusa(body: unknown): RefusalFix | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null
  const b = body as Record<string, unknown>
  if (b.parked === true) return null // KINEO-FILA-QUEDA-FAL-2810: o filme já está salvo e recomeça sozinho
  const pronto = sanear(b.fix)
  if (pronto) return pronto
  const reason = typeof b.reason === 'string' ? b.reason : typeof b.code === 'string' ? b.code : ''
  const err = typeof b.error === 'string' ? b.error : ''
  const requested = num(b.requested_seconds)
  const selected = num(b.selected_seconds)
  const suggested = num(b.suggested_seconds)

  if (reason === 'request_duration_mismatch' && requested && selected) return pedidoXEscolhaY(reason, requested, selected)
  if (reason === 'script_too_long_for_short_film' && requested) return longoDemais(reason, requested, suggested)
  if ((reason === 'duration_not_offered' || reason === 'only_seedance_15s') && suggested && suggested !== requested) return { code: 'switch_duration', reason, seconds: suggested }
  if (reason === 'brief_requires_review' || reason === 'shot_spec_detected') return { code: 'ai_structure', reason }
  if (reason === 'model_refused_topic') return { code: 'safer_angle', reason }
  if (b.queued === true && !RE_ESTACIONADO.test(err)) return { code: 'retry_later', reason: 'provider_queued', afterSec: RETRY_LATER_SECONDS }

  if (!err) return null
  for (const re of RE_PEDIU_X_ESCOLHEU_Y) {
    const m = err.match(re)
    if (m) return pedidoXEscolhaY('text:request_duration_mismatch', Number(m[1]), Number(m[2]))
  }
  const longo = err.match(RE_LONGO_DEMAIS)
  if (longo) return longoDemais('text:script_too_long_for_short_film', Number(longo[2]), longo[3] ? Number(longo[3]) : undefined)
  if (RE_PLANO_DE_CAMERA.test(err)) return { code: 'ai_structure', reason: 'text:shot_spec_detected' }
  if (RE_PEDIDO_NAO_FALA.test(err)) return { code: 'ai_structure', reason: 'text:brief_requires_review' }
  if (RE_IA_RECUSOU.test(err)) return { code: 'safer_angle', reason: 'text:model_refused_topic' }
  if (RE_ALTA_DEMANDA.test(err) && !RE_ESTACIONADO.test(err)) return { code: 'retry_later', reason: 'text:provider_queued', afterSec: RETRY_LATER_SECONDS }
  return null
}

/**
 * Rota: anexa `fix` à resposta de ERRO que tenha conserto conhecido. Sucesso, corpo não-JSON, corpo que já tem `fix` e recusa
 * sem conserto voltam como vieram (a MESMA Response). Nunca lança.
 */
export async function anexarFixDaRecusa(res: Response): Promise<Response> {
  try {
    if (res.ok || res.status < 400) return res
    if (!(res.headers.get('content-type') ?? '').toLowerCase().includes('application/json')) return res
    const body = await res.clone().json().catch(() => null)
    if (!body || typeof body !== 'object' || Array.isArray(body) || 'fix' in body) return res
    const fix = fixDaRecusa(body)
    if (!fix) return res
    const headers = new Headers(res.headers)
    headers.delete('content-length')
    return new Response(JSON.stringify({ ...(body as Record<string, unknown>), fix }), { status: res.status, statusText: res.statusText, headers })
  } catch {
    return res
  }
}

/**
 * A alternativa do "pediu X, escolheu Y": troca o número do pedido no texto por Y e CONFERE com o leitor de diretrizes da rota.
 * null = não deu para reescrever com segurança (o botão não aparece).
 */
export function trocarDuracaoNoTexto(texto: string, askedSeconds: number, selectedSeconds: number): string | null {
  if (typeof texto !== 'string' || !texto.trim() || !(selectedSeconds > 0)) return null
  const d = readPastedDirectives(texto).directives.find((x) => x.kind === 'duration')
  if (!d || !d.raw || (d.askedSeconds ?? 0) !== askedSeconds) return null
  const i = texto.indexOf(d.raw)
  if (i < 0) return null
  const novo = texto.slice(0, i) + `${selectedSeconds} seconds` + texto.slice(i + d.raw.length)
  const depois = readPastedDirectives(novo).directives.find((x) => x.kind === 'duration')?.askedSeconds
  if (depois !== undefined && depois > selectedSeconds) return null
  return novo
}

export type BotaoDaRecusa = { fix: RefusalFix; label: string; cost?: number }
export type ContextoDaRecusa = {
  /** Durações que o motor atual oferece a esta conta (o seletor da tela). */
  options: readonly number[]
  /** A função que cobra (custo em créditos da duração). */
  costFor: (seconds: number) => number
  /** Saldo; null = ainda não sabe (o servidor continua sendo a autoridade: 402 se faltar). */
  credits: number | null
  duration: number
  scriptMode: 'ai' | 'verbatim'
  /** Estrada que manda a ideia CRUA ao servidor (Kling 3/H3/Omni/S25): o modo IA não reescreve antes da rota. */
  rawRoad: boolean
  /** O texto que a rota recebeu (para conferir a reescrita do número). */
  text: string
}

/** A duração do seletor que cobre `seconds` (a menor ≥; senão a maior). */
export function duracaoQueCobre(seconds: number, options: readonly number[]): number | null {
  const ok = [...options].filter((d) => Number.isFinite(d) && d > 0).sort((a, b) => a - b)
  if (!ok.length) return null
  return ok.find((d) => d >= seconds) ?? ok[ok.length - 1]
}

function resolverUm(fix: RefusalFix, ctx: ContextoDaRecusa): BotaoDaRecusa | null {
  switch (fix.code) {
    case 'switch_duration': {
      const alvo = duracaoQueCobre(fix.seconds ?? 0, ctx.options)
      if (!alvo || alvo === ctx.duration) return null
      const cost = ctx.costFor(alvo)
      if (ctx.credits !== null && Number.isFinite(cost) && cost > ctx.credits) return null
      // "Make it 60s" = o texto pede essa duração; "Use 35s instead" = a duração sugerida no lugar da escolhida.
      const pedida = fix.reason.endsWith('request_duration_mismatch')
      return { fix: { ...fix, seconds: alvo }, label: pedida ? `Make it ${alvo}s` : `Use ${alvo}s instead`, cost: Number.isFinite(cost) ? cost : undefined }
    }
    case 'match_text_duration': {
      if (!fix.askedSeconds || !fix.seconds) return null
      if (trocarDuracaoNoTexto(ctx.text, fix.askedSeconds, fix.seconds) === null) return null
      return { fix, label: `Shorten to ${fix.seconds}s for me` }
    }
    case 'shorten_for_me':
      // Já em modo IA (ou estrada crua), "encurtar com IA" repetiria a mesma recusa.
      if (ctx.scriptMode !== 'verbatim' || ctx.rawRoad) return null
      return { fix: { ...fix, seconds: ctx.duration }, label: 'Shorten it for me' }
    case 'ai_structure':
      if (ctx.scriptMode !== 'verbatim') return null
      // Plano de câmera na estrada crua chega à rota do jeito que está, e a rota recusa plano em qualquer modo.
      if (ctx.rawRoad && !fix.reason.endsWith('brief_requires_review')) return null
      return { fix, label: 'Turn this into a film' }
    case 'safer_angle':
      if (!ctx.text.trim()) return null
      return { fix, label: 'Try a safer angle' }
    case 'retry_later':
      return { fix, label: `Retry automatically in ${Math.round((fix.afterSec ?? RETRY_LATER_SECONDS) / 60)} min` }
  }
  return null
}

/** Os botões que cabem para esta conta, agora. Conserto principal que não cabe cede o lugar à alternativa. */
export function resolverBotoesDaRecusa(fix: RefusalFix | null, ctx: ContextoDaRecusa): { primary: BotaoDaRecusa; secondary: BotaoDaRecusa | null } | null {
  if (!fix) return null
  const p = resolverUm(fix, ctx)
  const a = fix.alt ? resolverUm(fix.alt, ctx) : null
  if (p) return { primary: p, secondary: a }
  if (a) return { primary: a, secondary: null }
  return null
}

/** O texto que o conserto manda reanalisar (null = sem texto novo: reanalisa o que a rota recebeu). */
export function textoDoConserto(fix: RefusalFix, texto: string): string | null {
  if (fix.code === 'match_text_duration' && fix.askedSeconds && fix.seconds) return trocarDuracaoNoTexto(texto, fix.askedSeconds, fix.seconds)
  if (fix.code === 'safer_angle') return texto.startsWith(SAFER_ANGLE_PREFIX) ? texto : SAFER_ANGLE_PREFIX + texto.trim()
  return null
}

// ═══ KINEO-MURO-PRIMEIRO-FILME-0311 [TRAVA 8.2 — "vai" do fundador 03/11: "vamos melhorar esse muro de entrada"] ═══
// O CASO (7 d até 03/11): quem ainda NÃO tem filme nenhum leu a recusa com o botão e foi embora — "asks for 60 seconds, but the
// selected duration is 15" (4 pessoas, 3 sem filme), "looks like a video request" (5), "the AI declined the topic" (5). A regra
// aprovada 02/11 é "o 1º filme nunca recusa": para conta com 0 filmes o botão se aperta SOZINHO, uma vez, e o filme segue.
// Só entra conserto que NÃO sobe o preço (trocar para uma duração mais cara pede o clique dela). "Retry later" fica de fora:
// ele já tem relógio próprio. Puro: o cliente decide quem tem 0 filmes; aqui só se escolhe QUAL botão.
export const MURO_PRIMEIRO_FILME_VERSION = 'muro_primeiro_filme_0311_v1'
export function consertoAutomaticoDoPrimeiroFilme(
  botoes: { primary: BotaoDaRecusa; secondary: BotaoDaRecusa | null } | null,
  custoAtual: number,
): RefusalFix | null {
  if (!botoes) return null
  for (const b of [botoes.primary, botoes.secondary]) {
    if (!b || b.fix.code === 'retry_later') continue
    if (b.fix.code === 'switch_duration' && !(Number.isFinite(b.cost) && Number.isFinite(custoAtual) && (b.cost as number) <= custoAtual)) continue
    return b.fix
  }
  return null
}
