// ═══ KINEO-BANCO-PROVA-2710 [TRAVA 8.2 — vai do fundador 27/10 "aprovo banco"] — o banco de pedidos-prova ═══
// Antes de cada publicação, ~30 pedidos REAIS e difíceis de clientes percorrem o pipeline do filme grátis até o STILL
// (planner → prompt por cena → still FLUX por cena → crítico do still, lib/cinematic/criticoStill) SEM vídeo, voz, música
// ou compose. A rota expõe isso como `dry_run: 'stills'` (só contas do ensaio de $0, lib/cinematic/classicDryRun
// isDryRunAccount): o débito de nascimento é estornado pelo mesmo caminho do dry_run, nenhuma linha em `videos` nasce (ela
// só nasce no compose) e um evento `banco_prova_caso` por caso guarda o relato cena a cena.
//
// Este módulo é PURO fora de `verificarExpectativas` (uma chamada de visão): o guardião scripts/test-banco-prova-2710.mjs
// o executa em sandbox. O mesmo modelo dos dois juízes (JUIZ_STILL_MODELO) — nenhuma string crua de modelo nova.
//
// A NOTA DO CASO (0-100): metade é a nota do crítico (média da nota da foto que SEGUIU em cada cena; cena sem still = 0) e
// metade é a taxa de expectativas cumpridas (`espera` do caso: "Krishna de pele azul", "uma mulher visível", "época anos
// 1950"), conferida numa ÚNICA chamada de visão que vê todos os stills do filme. Sem `espera`, vale só o crítico.
import { JUIZ_STILL_MODELO } from '@/lib/hollywood/juizStill'
import type { RelatoCriticoStill, ProblemaStill } from '@/lib/cinematic/criticoStill'

export const MARCA_BANCO_PROVA = 'KINEO-BANCO-PROVA-2710'
export const BANCO_PROVA_VERSAO = 'banco_prova_v1'
/** Um evento por caso. session_id = generation_id. */
export const BANCO_PROVA_EVENTO = 'banco_prova_caso'
export const BANCO_PROVA_MODELO: string = JUIZ_STILL_MODELO
/** Teto da chamada de expectativas (vê até 8 stills; típico 3-6 s). */
export const BANCO_PROVA_EXPECTATIVAS_TIMEOUT_MS = 20_000
export const BANCO_PROVA_MAX_ESPERA = 12
export const BANCO_PROVA_MAX_STILLS_NA_CHAMADA = 8
export const BANCO_PROVA_TOKENS_POR_IMAGEM = 2833
export const BANCO_PROVA_USD_POR_TOKEN_ENTRADA = 0.15 / 1_000_000
export const BANCO_PROVA_USD_POR_TOKEN_SAIDA = 0.6 / 1_000_000
/** Motivo do estorno do claim de nascimento (mesmo caminho do dry_run_no_charge). */
export const BANCO_PROVA_MOTIVO_ESTORNO = 'banco_prova_stills_no_charge'

const limpa = (t: unknown) => String(t ?? '').replace(/\s+/g, ' ').trim()
const arred = (x: number) => Math.round(x * 1e6) / 1e6

/** `dry_run: 'stills'` — e só isso. `true`, 'true', 1 ou 'STILLS' NÃO são o banco (o dry_run de sempre continua byte a byte). */
export function ehPedidoDeStills(dryRun: unknown): dryRun is 'stills' {
  return dryRun === 'stills'
}

export type PedidoDoBanco = { caso: string; espera: string[]; seed: number | null }
/** Lê `body.banco_prova` ({ caso, espera[], seed? }). Nunca lança: lixo vira o pedido vazio. */
export function lerPedidoDoBanco(raw: unknown): PedidoDoBanco {
  const vazio: PedidoDoBanco = { caso: 'sem_id', espera: [], seed: null }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return vazio
  const r = raw as Record<string, unknown>
  const caso = limpa(r.caso).slice(0, 80) || 'sem_id'
  const lista = Array.isArray(r.espera) ? r.espera : []
  const espera = lista.map((x) => limpa(x).slice(0, 200)).filter((x) => x.length >= 3).slice(0, BANCO_PROVA_MAX_ESPERA)
  const s = Number(r.seed)
  const seed = Number.isFinite(s) && Number.isInteger(s) && s >= 0 && s <= 2_147_483_646 ? s : null
  return { caso, espera, seed }
}

// ── 1. O PEDIDO DE EXPECTATIVAS ──
export type ParteDoPedido = { type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string; detail: 'low' } }
export type MensagemDoBanco = { role: 'system' | 'user'; content: string | ParteDoPedido[] }

export const BANCO_PROVA_SISTEMA =
  'You are checking the still frames of a short narrated film against a list of expectations written by the film\'s QA. ' +
  'The stills are given in story order (SHOT 1, SHOT 2, ...). Each expectation describes something that must be TRUE in the frames where it applies ' +
  '(the identity, look, era, count, sex, species, pose or object of what is shown). ' +
  'For EACH expectation answer: "met" when at least one shot clearly shows it; "not_met" when a shot clearly contradicts it or when nothing in any shot shows it although the narration required it; ' +
  '"not_applicable" only when the expectation is about something no shot was ever meant to show. Judge only what is visible; never judge taste, beauty or style. When unsure between met and not_met, answer not_met. ' +
  'Reply ONLY with JSON: {"items":[{"index":<1-based expectation number>,"status":"met"|"not_met"|"not_applicable","shot":<shot number or null>,"reason":"<max 15 English words>"}]}'

export type EstadoExpectativa = 'met' | 'not_met' | 'not_applicable'
export type ItemExpectativa = { indice: number; espera: string; estado: EstadoExpectativa | 'erro'; cena: number | null; motivo: string }

/** O pedido: as expectativas numeradas + cada still rotulado com a fala e o visual da cena. Até 8 stills, detail 'low'. */
export function montarPedidoDeExpectativas(args: { stills: ReadonlyArray<string | null>; espera: ReadonlyArray<string>; falas?: ReadonlyArray<string>; visuais?: ReadonlyArray<string> }): { messages: MensagemDoBanco[]; imagens: number; caracteres: number } {
  const esperaTxt = args.espera.map((e, i) => `${i + 1}. ${limpa(e).slice(0, 200)}`).join('\n')
  const parts: ParteDoPedido[] = [{ type: 'text', text: `EXPECTATIONS:\n${esperaTxt}` }]
  let imagens = 0
  let caracteres = BANCO_PROVA_SISTEMA.length + esperaTxt.length
  for (let i = 0; i < args.stills.length && imagens < BANCO_PROVA_MAX_STILLS_NA_CHAMADA; i++) {
    const url = args.stills[i]
    if (typeof url !== 'string' || !url) continue
    const rotulo = [`SHOT ${i + 1}`, args.visuais?.[i] ? `shows: ${limpa(args.visuais[i]).slice(0, 220)}` : '', args.falas?.[i] ? `narration: "${limpa(args.falas[i]).slice(0, 200)}"` : ''].filter(Boolean).join(' · ')
    parts.push({ type: 'text', text: rotulo }, { type: 'image_url', image_url: { url, detail: 'low' } })
    imagens++
    caracteres += rotulo.length
  }
  return { messages: [{ role: 'system', content: BANCO_PROVA_SISTEMA }, { role: 'user', content: parts }], imagens, caracteres }
}

/** Lê o JSON do modelo. null = ilegível. Expectativa sem resposta vira 'erro' (nunca conta como cumprida). */
export function lerRespostaDeExpectativas(raw: string, espera: ReadonlyArray<string>): ItemExpectativa[] | null {
  let j: Record<string, unknown>
  try {
    const p = JSON.parse(raw) as unknown
    if (!p || typeof p !== 'object' || Array.isArray(p)) return null
    j = p as Record<string, unknown>
  } catch {
    return null
  }
  const lista = Array.isArray(j.items) ? j.items : null
  if (!lista) return null
  const porIndice = new Map<number, { estado: EstadoExpectativa; cena: number | null; motivo: string }>()
  for (const it of lista) {
    if (!it || typeof it !== 'object') continue
    const o = it as Record<string, unknown>
    const idx = Number(o.index)
    const st = limpa(o.status).toLowerCase().replace(/[\s-]+/g, '_')
    const estado: EstadoExpectativa | null = st === 'met' ? 'met' : st === 'not_met' || st === 'unmet' || st === 'failed' ? 'not_met' : st === 'not_applicable' || st === 'n_a' || st === 'na' ? 'not_applicable' : null
    if (!Number.isInteger(idx) || idx < 1 || idx > espera.length || !estado) continue
    const cenaN = Number(o.shot)
    porIndice.set(idx, { estado, cena: Number.isInteger(cenaN) && cenaN >= 1 ? cenaN : null, motivo: limpa(o.reason).slice(0, 160) })
  }
  return espera.map((e, i) => {
    const r = porIndice.get(i + 1)
    return r ? { indice: i + 1, espera: e, estado: r.estado, cena: r.cena, motivo: r.motivo } : { indice: i + 1, espera: e, estado: 'erro', cena: null, motivo: 'sem resposta do modelo' }
  })
}

export function custoDasExpectativasUsd(usage: { prompt_tokens?: unknown; completion_tokens?: unknown } | null | undefined, imagens: number, caracteres: number): number {
  const entrada = Number(usage?.prompt_tokens)
  const saida = Number(usage?.completion_tokens)
  const e = Number.isFinite(entrada) && entrada > 0 ? entrada : imagens * BANCO_PROVA_TOKENS_POR_IMAGEM + Math.ceil(caracteres / 4)
  const s = Number.isFinite(saida) && saida > 0 ? saida : 40 * Math.max(1, imagens)
  return arred(e * BANCO_PROVA_USD_POR_TOKEN_ENTRADA + s * BANCO_PROVA_USD_POR_TOKEN_SAIDA)
}

export type RelatoExpectativas = { itens: ItemExpectativa[]; imagens: number; custo_usd: number; ms: number; erro: string | null; modelo: string }

/** UMA chamada de visão com todos os stills. Nunca lança; sem stills ou sem `espera` = nada chamado (itens vazios). */
export async function verificarExpectativas(args: { stills: ReadonlyArray<string | null>; espera: ReadonlyArray<string>; falas?: ReadonlyArray<string>; visuais?: ReadonlyArray<string>; timeoutMs?: number; fetchImpl?: typeof fetch; apiKey?: string; agora?: () => number }): Promise<RelatoExpectativas> {
  const agora = args.agora ?? (() => Date.now())
  const t0 = agora()
  const base: RelatoExpectativas = { itens: [], imagens: 0, custo_usd: 0, ms: 0, erro: null, modelo: BANCO_PROVA_MODELO }
  const espera = args.espera.map((e) => limpa(e)).filter(Boolean)
  const temStill = args.stills.some((u) => typeof u === 'string' && u)
  if (espera.length === 0) return base
  if (!temStill) return { ...base, itens: espera.map((e, i) => ({ indice: i + 1, espera: e, estado: 'not_met', cena: null, motivo: 'nenhum still gerado' })), erro: 'sem_stills', ms: agora() - t0 }
  const key = args.apiKey ?? (typeof process !== 'undefined' ? process.env.OPENAI_API_KEY : undefined)
  const semResposta = (erro: string, custo = 0): RelatoExpectativas => ({ ...base, itens: espera.map((e, i) => ({ indice: i + 1, espera: e, estado: 'erro', cena: null, motivo: erro })), custo_usd: custo, erro, ms: agora() - t0 })
  if (!key) return semResposta('sem_chave')
  const { messages, imagens, caracteres } = montarPedidoDeExpectativas({ stills: args.stills, espera, falas: args.falas, visuais: args.visuais })
  const timeoutMs = Math.max(1, Math.floor(args.timeoutMs ?? BANCO_PROVA_EXPECTATIVAS_TIMEOUT_MS))
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const doFetch = args.fetchImpl ?? fetch
    const res = await doFetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: BANCO_PROVA_MODELO, temperature: 0, max_tokens: 600, response_format: { type: 'json_object' }, messages }),
    })
    if (!res.ok) return semResposta(`http_${res.status}`)
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }>; usage?: { prompt_tokens?: number; completion_tokens?: number } }
    const custo = custoDasExpectativasUsd(data.usage, imagens, caracteres)
    const itens = lerRespostaDeExpectativas(data.choices?.[0]?.message?.content ?? '', espera)
    if (!itens) return semResposta('resposta_ilegivel', custo)
    return { itens, imagens, custo_usd: custo, ms: agora() - t0, erro: null, modelo: BANCO_PROVA_MODELO }
  } catch (err) {
    const nome = err instanceof Error ? err.name : ''
    if (nome === 'AbortError' || nome === 'TimeoutError' || ctrl.signal.aborted) return semResposta(`timeout_${timeoutMs}ms`, custoDasExpectativasUsd(null, imagens, caracteres))
    return semResposta(`fetch_${limpa(err instanceof Error ? err.message : String(err)).slice(0, 80)}`)
  } finally {
    clearTimeout(timer)
  }
}

// ── 2. A NOTA DO CASO ──
export type TipoDeFalha = ProblemaStill | 'sem_still' | 'expectativa'
export type CenaDoBanco = {
  cena: number
  origem: 'flux' | 'folha' | 'nenhum'
  url: string | null
  veredito: RelatoCriticoStill['veredito'] | 'SEM_STILL'
  problemas: ProblemaStill[]
  nota: number | null
  motivo: string
  regerou: boolean
  escolhida: 'original' | 'regerada' | null
}
export type NotaDoCaso = {
  nota: number | null
  nota_critico: number | null
  taxa_expectativas: number | null
  expectativas_cumpridas: number
  expectativas_aplicaveis: number
  cenas: number
  cenas_com_still: number
  cenas_julgadas: number
  falhas: Partial<Record<TipoDeFalha, number>>
  detalhe: CenaDoBanco[]
}

/** A foto que SEGUIU: regerada e escolhida → nota/veredito/problemas da regerada; senão, da original. */
export function fotoQueSeguiu(r: RelatoCriticoStill): { veredito: RelatoCriticoStill['veredito']; problemas: ProblemaStill[]; nota: number | null } {
  if (r.regerou && r.escolhida === 'regerada' && r.veredito_regerada) return { veredito: r.veredito_regerada, problemas: r.problemas_regerada ?? [], nota: r.nota_regerada ?? r.nota }
  return { veredito: r.veredito, problemas: r.problemas, nota: r.nota }
}

/**
 * Nota do caso. `relatosFolha` (o still com a folha de personagem, que vence o FLUX na mesma cena) sobrepõe `relatosClassico`.
 * Cena sem still = nota 0 e falha 'sem_still'. Cena com still mas sem nota (ERRO/PULADO) fica fora da média.
 * Expectativas: cumpridas / (cumpridas + não cumpridas + erro); 'not_applicable' sai do denominador. Sem expectativas = null.
 */
export function pontuarCaso(args: { cenas: number; stills: ReadonlyArray<string | null>; relatosClassico: ReadonlyArray<RelatoCriticoStill>; relatosFolha: ReadonlyArray<RelatoCriticoStill>; expectativas: ReadonlyArray<ItemExpectativa> }): NotaDoCaso {
  const falhas: Partial<Record<TipoDeFalha, number>> = {}
  const mais = (t: TipoDeFalha, n = 1) => { falhas[t] = (falhas[t] ?? 0) + n }
  const porCena = new Map<number, { r: RelatoCriticoStill; origem: 'flux' | 'folha' }>()
  for (const r of args.relatosClassico) porCena.set(r.cena, { r, origem: 'flux' })
  for (const r of args.relatosFolha) porCena.set(r.cena, { r, origem: 'folha' })
  const detalhe: CenaDoBanco[] = []
  const notas: number[] = []
  let comStill = 0
  let julgadas = 0
  for (let i = 0; i < Math.max(0, Math.floor(args.cenas)); i++) {
    const url = typeof args.stills[i] === 'string' && args.stills[i] ? (args.stills[i] as string) : null
    const j = porCena.get(i + 1)
    if (!url) {
      mais('sem_still')
      notas.push(0)
      detalhe.push({ cena: i + 1, origem: 'nenhum', url: null, veredito: 'SEM_STILL', problemas: [], nota: 0, motivo: 'still não gerado', regerou: false, escolhida: null })
      continue
    }
    comStill++
    if (!j) { detalhe.push({ cena: i + 1, origem: 'flux', url, veredito: 'PULADO', problemas: [], nota: null, motivo: 'sem relato do crítico', regerou: false, escolhida: null }); continue }
    const f = fotoQueSeguiu(j.r)
    if (typeof f.nota === 'number') { notas.push(f.nota); julgadas++ }
    for (const p of f.problemas) mais(p)
    detalhe.push({ cena: i + 1, origem: j.origem, url, veredito: f.veredito, problemas: f.problemas, nota: f.nota, motivo: j.r.motivo, regerou: j.r.regerou, escolhida: j.r.regerou ? j.r.escolhida : null })
  }
  const notaCritico = notas.length > 0 ? Math.round(notas.reduce((a, b) => a + b, 0) / notas.length) : null
  const aplicaveis = args.expectativas.filter((e) => e.estado !== 'not_applicable')
  const cumpridas = aplicaveis.filter((e) => e.estado === 'met').length
  const naoCumpridas = aplicaveis.length - cumpridas
  if (naoCumpridas > 0) mais('expectativa', naoCumpridas)
  const taxa = aplicaveis.length > 0 ? Math.round((cumpridas / aplicaveis.length) * 1000) / 1000 : null
  const nota = notaCritico !== null && taxa !== null ? Math.round(notaCritico * 0.5 + taxa * 50) : notaCritico !== null ? notaCritico : taxa !== null ? Math.round(taxa * 100) : null
  return { nota, nota_critico: notaCritico, taxa_expectativas: taxa, expectativas_cumpridas: cumpridas, expectativas_aplicaveis: aplicaveis.length, cenas: args.cenas, cenas_com_still: comStill, cenas_julgadas: julgadas, falhas, detalhe }
}

/** Custo real estimado do caso (US$): stills FLUX (0,015 cada), regerações do crítico e as chamadas de visão. ANCHORS_USD (0,10) é a contabilidade prudente, não o preço. */
export function custoDoCasoUsd(args: { stillsFlux: number; folhas: number; stillsComFolha: number; relatos: ReadonlyArray<RelatoCriticoStill>; expectativasUsd: number }): number {
  const critico = args.relatos.reduce((a, r) => a + (r.custo_usd || 0), 0)
  return arred(args.stillsFlux * 0.015 + args.folhas * 0.015 + args.stillsComFolha * 0.15 + critico + args.expectativasUsd)
}
