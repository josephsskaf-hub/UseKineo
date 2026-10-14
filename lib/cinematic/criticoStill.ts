// ═══ KINEO-JUIZ-STILL-1410 [TRAVA 8.2 — vai do fundador 14/10 "tudo sim", melhoria nº 8] — o crítico do STILL antes do clipe pago ═══
// Cada cena ancorada nasce de um still FLUX (~US$ 0,015 de fal; contabilizado como ANCHORS_USD = 0,10) que vira o 1º quadro de
// um clipe image-to-video pago (Seedance 1.5 / Veo 3.1 / Kling 2.5 no caminho clássico; Kling 3 / H3 / Omni no hollywood). Um
// still com mão deformada, letreiro inventado, sujeito errado ou artefato vira um clipe pago com o mesmo defeito, e ninguém
// olhava a foto antes. O crítico de quadros do MP4 pronto é inviável (sem ffmpeg no servidor); o do STILL é viável: uma chamada
// de visão barata por foto, antes do POST do vídeo.
//
// O Seedance 2.5 (família s25) já tem o seu juiz (lib/hollywood/juizStill.ts, KINEO-JUIZ-STILL-2026-10-06: anacronismo, encara
// a câmera, texto legível, repetição) — este crítico NÃO roda no s25 (nada de juiz duplo nem regeração dupla). Os critérios
// daqui são os defeitos objetivos de geração: (1) anatomia deformada (mãos/rostos), (2) texto embaralhado/inventado,
// (3) sujeito errado para a fala, (4) artefato óbvio. Nunca gosto.
//
// MODO (env STILL_CRITIC_MODE): 'off' = nada roda (comportamento de antes, byte a byte); 'log_only' (PADRÃO) = julga e grava o
// evento cinematic_still_critic com veredito e motivos, mas NUNCA regera e a foto original segue sempre — para medir o falso
// positivo no tráfego real antes de ligar; 'enforce' = FAIL pede UMA foto nova (semente nova, instrução POSITIVA que não nomeia
// o defeito: "no X" desenha X), julga de novo se houver tempo e segue a melhor; no máximo 3 regerações por filme.
// O crítico NUNCA segura o filme: teto por chamada (6 s), por cena (20 s), prazo absoluto do lote de stills (os 60 s do caminho
// clássico) ou orçamento por filme (45 s no hollywood), falha aberta em qualquer erro (a foto de antes segue), disjuntor depois
// de 2 erros. Timeout = a foto segue.
// Custo (gpt-4o-mini, imagem detail 'low' ≈ 2.833 tokens + ~450 de texto): ≈ US$ 0,0005 por foto julgada. Regeração FLUX dev
// 9:16 ≈ US$ 0,015 real (ANCHORS_USD conta 0,10 por prudência). Ver a estimativa por filme no relatório do commit.
// O modelo é o MESMO do juiz do s25 (JUIZ_STILL_MODELO): nenhuma string crua de modelo nova no código — a migração dos modelos
// da OpenAI (docs/MIGRACAO-MODELOS-OPENAI-2026-10-14.md, gpt-4o-mini sai em 14/01/2027) troca os dois juízes num lugar só.
// Este módulo só importa a constante do modelo; o resto é puro (o guardião scripts/test-juiz-still-1410.mjs o executa em sandbox).
import { JUIZ_STILL_MODELO } from '@/lib/hollywood/juizStill'

export const MARCA_CRITICO_STILL = 'KINEO-JUIZ-STILL-1410'
export const STILL_CRITIC_VERSAO = 'still_critic_v1'
/** Um evento por foto julgada. session_id = generation_id. */
export const STILL_CRITIC_EVENTO = 'cinematic_still_critic'
export const STILL_CRITIC_MODELO: string = JUIZ_STILL_MODELO
/** Teto de UMA chamada ao crítico (típico 1,5-3,5 s). */
export const STILL_CRITIC_TIMEOUT_MS = 6_000
/** Teto do crítico numa cena: julgar + regerar + julgar de novo. */
export const STILL_CRITIC_TETO_CENA_MS = 20_000
/** Orçamento do crítico no filme inteiro quando o laço é SERIAL (hollywood). No clássico vale o prazo absoluto dos stills. */
export const STILL_CRITIC_ORCAMENTO_SERIAL_MS = 45_000
/** Janela de espera da foto nova. */
export const STILL_CRITIC_JANELA_REGERACAO_MS = 9_000
/** Menos que isto de folga = não chama o crítico (a resposta não chegaria). */
export const STILL_CRITIC_MIN_CHAMADA_MS = 1_500
/** Menos que isto de folga = não regera (FLUX dev leva 3-6 s; sobra para o 2º julgamento). */
export const STILL_CRITIC_MIN_REGERACAO_MS = 8_000
/** Erros do crítico (timeout, HTTP, resposta ilegível) que desligam o crítico no resto do filme. */
export const STILL_CRITIC_ERROS_PARA_DESLIGAR = 2
/** Teto de regerações por filme (só 'enforce'): limita o custo no pior caso. */
export const STILL_CRITIC_MAX_REGERACOES_FILME = 3
/** Uma foto nova FLUX dev 9:16 (576×1024 ≈ 0,59 MP × US$ 0,025/MP). */
export const STILL_CRITIC_REGERACAO_USD = 0.015
export const STILL_CRITIC_TOKENS_POR_IMAGEM = 2833
export const STILL_CRITIC_USD_POR_TOKEN_ENTRADA = 0.15 / 1_000_000
export const STILL_CRITIC_USD_POR_TOKEN_SAIDA = 0.6 / 1_000_000

export type ModoCriticoStill = 'off' | 'log_only' | 'enforce'

/** STILL_CRITIC_MODE → modo. Vazio, ausente ou desconhecido = 'log_only' (o padrão seguro: mede, nunca regera). */
export function modoDoCriticoDoStill(valor?: string | null): ModoCriticoStill {
  const bruto = valor === undefined ? (typeof process !== 'undefined' ? process.env.STILL_CRITIC_MODE : undefined) : valor
  const v = String(bruto ?? '').trim().toLowerCase().replace(/-/g, '_')
  if (v === 'off' || v === '0' || v === 'false' || v === 'no') return 'off'
  if (v === 'enforce') return 'enforce'
  return 'log_only'
}

/** O crítico roda nesta família hollywood? Nunca no s25 (já tem o juiz da foto-base, KINEO-JUIZ-STILL-2026-10-06). */
export function criticoNaFamiliaHollywood(family: string | null | undefined): boolean {
  return typeof family === 'string' && family.length > 0 && family !== 's25'
}

export type ProblemaStill = 'anatomia' | 'texto' | 'sujeito' | 'artefato'
const PROBLEMA_DO_MODELO: Record<string, ProblemaStill> = { anatomy: 'anatomia', text: 'texto', subject: 'sujeito', artifact: 'artefato' }
export type VereditoCritico = 'PASS' | 'FAIL' | 'ERRO' | 'PULADO'

const limpa = (t: string | null | undefined) => String(t ?? '').replace(/\s+/g, ' ').trim()
const arred = (x: number) => Math.round(x * 1e6) / 1e6

export type EntradaCritico = {
  /** índice 0-based da cena */
  indice: number
  /** o still a julgar */
  url: string
  /** o que a cena deve mostrar (o visual da cena) */
  mostra: string
  /** a narração da cena */
  fala: string
  /** o prompt com que o still nasceu — a regeração parte dele */
  prompt: string
  /** a semente do filme (a regeração usa outra, derivada dela) */
  seed: number
}

// ── 1. O PEDIDO ──
export type ParteDoPedidoCritico = { type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string; detail: 'low' } }
export type MensagemDoCritico = { role: 'system' | 'user'; content: string | ParteDoPedidoCritico[] }

export const STILL_CRITIC_SISTEMA =
  'You check ONE still image before an image-to-video model animates it into a shot of a narrated short film. ' +
  'You only flag objective generation defects that would visibly ruin the shot; you never judge taste, beauty, style, lighting, color or composition. ' +
  'FAIL the image only when at least one of these is CLEARLY true: ' +
  '(1) ANATOMY — a deformed human or animal body: extra, missing, fused or twisted fingers or limbs; a melted, duplicated or distorted face; impossible joints (small, distant or blurred figures are fine); ' +
  '(2) TEXT — garbled, misspelled, nonsense or invented letters, words, numbers or logos anywhere in the frame (blurred texture with no readable glyphs is fine); ' +
  '(3) SUBJECT — the main subject of the image is clearly not what the shot must show, judged against the description and the narration (another plausible angle of the same subject is fine); ' +
  '(4) ARTIFACT — an obvious generation artifact: objects merged into each other, broken or impossible geometry, a split screen, collage or several panels, a border, a watermark, heavy smearing or noise, a blank or corrupted image. ' +
  'Otherwise answer PASS. When unsure, answer PASS. ' +
  'Reply ONLY with JSON: {"verdict":"PASS"|"FAIL","issues":[zero or more of "anatomy","text","subject","artifact"; empty when PASS],' +
  '"reason":"<max 15 English words, empty when PASS>","score":<0-100, how usable this image is as the first frame of this shot>}'

/** O pedido ao crítico: a foto + o que a cena deve mostrar + a narração. Uma imagem só, detail 'low'. */
export function montarPedidoAoCritico(e: EntradaCritico, url: string): { messages: MensagemDoCritico[]; imagens: number; caracteres: number } {
  const texto = [
    `SHOT ${e.indice + 1}`,
    `What the shot must show: ${limpa(e.mostra || e.prompt).slice(0, 420)}`,
    `Narration heard during the shot: "${limpa(e.fala).slice(0, 300)}"`,
  ].join('\n')
  const parts: ParteDoPedidoCritico[] = [{ type: 'text', text: texto }, { type: 'image_url', image_url: { url, detail: 'low' } }]
  return { messages: [{ role: 'system', content: STILL_CRITIC_SISTEMA }, { role: 'user', content: parts }], imagens: 1, caracteres: STILL_CRITIC_SISTEMA.length + texto.length }
}

// ── 2. A RESPOSTA ──
export type RespostaDoCritico = { veredito: 'PASS' | 'FAIL'; problemas: ProblemaStill[]; motivo: string; nota: number }
/** Lê o JSON. null = ilegível (vira ERRO, falha aberta). FAIL sem nenhum problema da lista (gosto) vira PASS. */
export function lerRespostaDoCritico(raw: string): RespostaDoCritico | null {
  let j: Record<string, unknown>
  try {
    const p = JSON.parse(raw) as unknown
    if (!p || typeof p !== 'object' || Array.isArray(p)) return null
    j = p as Record<string, unknown>
  } catch {
    return null
  }
  const v = String(j.verdict ?? '').trim().toUpperCase()
  if (v !== 'PASS' && v !== 'FAIL') return null
  const lista = Array.isArray(j.issues) ? j.issues : typeof j.issues === 'string' ? [j.issues] : []
  const problemas = Array.from(new Set(lista.map((x) => PROBLEMA_DO_MODELO[String(x ?? '').trim().toLowerCase()]).filter((x): x is ProblemaStill => Boolean(x))))
  const notaBruta = Number(j.score)
  const nota = Number.isFinite(notaBruta) ? Math.max(0, Math.min(100, Math.round(notaBruta))) : v === 'PASS' ? 80 : 30
  const motivo = limpa(typeof j.reason === 'string' ? j.reason : '').slice(0, 160)
  if (v === 'FAIL' && problemas.length === 0) return { veredito: 'PASS', problemas: [], motivo: motivo ? `recusa sem critério objetivo ignorada: ${motivo}`.slice(0, 160) : 'recusa sem critério objetivo ignorada', nota }
  if (v === 'PASS') return { veredito: 'PASS', problemas: [], motivo, nota }
  return { veredito: 'FAIL', problemas, motivo, nota }
}

export type ChamadaDoCritico = {
  veredito: VereditoCritico
  problemas: ProblemaStill[]
  motivo: string
  nota: number | null
  custoUsd: number
  ms: number
  erro: string | null
}

/** Custo: pelo `usage` quando veio; senão estimado (imagens × 2.833 + texto/4 de entrada, ~60 de saída). */
export function custoDoCriticoUsd(usage: { prompt_tokens?: unknown; completion_tokens?: unknown } | null | undefined, imagens: number, caracteres: number): number {
  const entrada = Number(usage?.prompt_tokens)
  const saida = Number(usage?.completion_tokens)
  const e = Number.isFinite(entrada) && entrada > 0 ? entrada : imagens * STILL_CRITIC_TOKENS_POR_IMAGEM + Math.ceil(caracteres / 4)
  const s = Number.isFinite(saida) && saida > 0 ? saida : 60
  return arred(e * STILL_CRITIC_USD_POR_TOKEN_ENTRADA + s * STILL_CRITIC_USD_POR_TOKEN_SAIDA)
}

/** Uma chamada com teto próprio (AbortController). Nunca lança: qualquer falha = ERRO com o motivo. */
export async function chamarCritico(
  e: EntradaCritico,
  url: string,
  opts: { timeoutMs: number; fetchImpl?: typeof fetch; apiKey?: string; agora?: () => number },
): Promise<ChamadaDoCritico> {
  const agora = opts.agora ?? (() => Date.now())
  const t0 = agora()
  const { messages, imagens, caracteres } = montarPedidoAoCritico(e, url)
  const base: ChamadaDoCritico = { veredito: 'ERRO', problemas: [], motivo: '', nota: null, custoUsd: 0, ms: 0, erro: null }
  const key = opts.apiKey ?? (typeof process !== 'undefined' ? process.env.OPENAI_API_KEY : undefined)
  if (!key) return { ...base, erro: 'sem_chave', ms: agora() - t0 }
  const timeoutMs = Math.max(1, Math.floor(opts.timeoutMs))
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const doFetch = opts.fetchImpl ?? fetch
    const res = await doFetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: STILL_CRITIC_MODELO, temperature: 0, max_tokens: 120, response_format: { type: 'json_object' }, messages }),
    })
    if (!res.ok) return { ...base, erro: `http_${res.status}`, ms: agora() - t0 }
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }>; usage?: { prompt_tokens?: number; completion_tokens?: number } }
    const custoUsd = custoDoCriticoUsd(data.usage, imagens, caracteres)
    const r = lerRespostaDoCritico(data.choices?.[0]?.message?.content ?? '')
    if (!r) return { ...base, erro: 'resposta_ilegivel', custoUsd, ms: agora() - t0 }
    return { ...base, veredito: r.veredito, problemas: r.problemas, motivo: r.motivo, nota: r.nota, custoUsd, ms: agora() - t0 }
  } catch (err) {
    const nome = err instanceof Error ? err.name : ''
    // abortada pelo teto: a entrada pode ter sido cobrada — conta a estimativa (custo nunca subestimado)
    if (nome === 'AbortError' || nome === 'TimeoutError' || ctrl.signal.aborted) return { ...base, erro: `timeout_${timeoutMs}ms`, custoUsd: custoDoCriticoUsd(null, imagens, caracteres), ms: agora() - t0 }
    return { ...base, erro: `fetch_${limpa(err instanceof Error ? err.message : String(err)).slice(0, 80)}`, ms: agora() - t0 }
  } finally {
    clearTimeout(timer)
  }
}

// ── 3. A REGERAÇÃO — instrução POSITIVA, sem nomear o defeito (o motor não tem negative: "no X" desenha X) ──
const INSTRUCAO: Record<ProblemaStill, string> = {
  sujeito: 'The main subject large, clear and centered in the frame, exactly as described.',
  anatomia: 'Natural anatomy: relaxed, well-formed hands and calm, naturally proportioned faces.',
  texto: 'Every surface plain and unmarked.',
  artefato: 'One clean, coherent photograph, every object whole, solid and separate.',
}
const ORDEM: ProblemaStill[] = ['sujeito', 'anatomia', 'texto', 'artefato']

/** A instrução da foto nova: uma frase por problema, na ordem sujeito → anatomia → texto → artefato. '' = nada a refazer. */
export function instrucaoDoCritico(problemas: readonly ProblemaStill[]): string {
  return ORDEM.filter((p) => problemas.includes(p)).map((p) => INSTRUCAO[p]).join(' ')
}

/** O prompt da foto nova: a 1ª frase da cena (o visual) primeiro, a instrução logo depois, o resto em seguida. */
export function promptDaRegeracaoCritico(prompt: string, instrucao: string): string {
  const p = limpa(prompt)
  const i = limpa(instrucao)
  if (!i) return p
  const m = /^(.{8,}?[.!?])\s+(.*)$/.exec(p)
  if (m) return limpa(`${m[1]} ${i} ${m[2]}`)
  return limpa(`${p.replace(/[\s,;.]+$/, '')}. ${i}`)
}

/** Semente da foto nova: determinística (retentativa do mesmo filme refaz a mesma foto) e diferente da do filme. */
export function seedDaRegeracaoCritico(seed: number, indice: number): number {
  const s = Number.isFinite(seed) ? Math.floor(Math.abs(seed)) : 0
  return (s + 7_919 * (Math.max(0, Math.floor(indice)) + 1)) % 2_147_483_647
}

/** Qual foto segue: sem foto nova → a original; nova sem 2º veredito ou aprovada → a nova; as duas recusadas → nota maior
 *  (empate = a original, que tem a semente e a paleta do filme). */
export function escolherFotoCritico(v1: ChamadaDoCritico, v2: ChamadaDoCritico | null, temRegerada: boolean): 'original' | 'regerada' {
  if (!temRegerada) return 'original'
  if (!v2 || v2.veredito !== 'FAIL') return 'regerada'
  return (v2.nota ?? 0) > (v1.nota ?? 0) ? 'regerada' : 'original'
}

// ── 4. O JULGAMENTO DE UM STILL (orquestra; nunca lança) ──
export type PuladoPor = 'prazo' | 'teto_cena' | 'orcamento_filme' | 'disjuntor' | 'teto_regeracoes' | 'modo_log_only' | null
export type RelatoCriticoStill = {
  versao: string
  modo: ModoCriticoStill
  cena: number
  veredito: VereditoCritico
  problemas: ProblemaStill[]
  motivo: string
  nota: number | null
  /** o veredito pediria foto nova (FAIL) — em log_only é a medida do que o enforce faria */
  regeraria: boolean
  regerou: boolean
  regeracao_ok: boolean | null
  instrucao: string | null
  veredito_regerada: VereditoCritico | null
  problemas_regerada: ProblemaStill[] | null
  nota_regerada: number | null
  escolhida: 'original' | 'regerada'
  custo_usd: number
  ms: number
  chamadas: number
  modelo: string
  erro: string | null
  pulado_por: PuladoPor
  url_original: string
  url_final: string
}
export type FilmeDoCritico = {
  modo: ModoCriticoStill
  /** prazo absoluto (ms de relógio) — o fim do lote de stills no clássico; Infinity = sem prazo absoluto */
  prazo: number
  /** orçamento acumulado (ms) — o laço serial do hollywood; Infinity = sem orçamento acumulado */
  orcamentoMs: number
  gastoMs: number
  erros: number
  desligado: boolean
  regeracoesRestantes: number
  relatos: RelatoCriticoStill[]
}
export function novoFilmeDoCritico(modo: ModoCriticoStill, o: { prazo?: number; orcamentoMs?: number } = {}): FilmeDoCritico {
  return {
    modo,
    prazo: typeof o.prazo === 'number' && Number.isFinite(o.prazo) ? o.prazo : Infinity,
    orcamentoMs: typeof o.orcamentoMs === 'number' && Number.isFinite(o.orcamentoMs) ? o.orcamentoMs : Infinity,
    gastoMs: 0,
    erros: 0,
    desligado: false,
    regeracoesRestantes: STILL_CRITIC_MAX_REGERACOES_FILME,
    relatos: [],
  }
}
export type DepsCritico = {
  filme: FilmeDoCritico
  /** gera a foto nova (na rota: generateCinematicSceneStill com o mesmo estilo do filme); null = falhou */
  gerarStill: (scenePrompt: string, seed: number, pollWindowMs: number) => Promise<string | null>
  fetchImpl?: typeof fetch
  apiKey?: string
  agora?: () => number
}

/**
 * Julga o still de uma cena e decide qual foto segue. NUNCA lança e NUNCA devolve "sem foto": no pior caso devolve a que
 * recebeu. 'off' não chama nada. 'log_only' julga e devolve SEMPRE a original. 'enforce': no máximo UMA regeração.
 * Respeita o teto da cena, o prazo absoluto e o orçamento do filme (estado em `d.filme`).
 */
export async function criticarStill(e: EntradaCritico, d: DepsCritico): Promise<{ url: string; relato: RelatoCriticoStill }> {
  const agora = d.agora ?? (() => Date.now())
  const t0 = agora()
  const filme = d.filme
  const r: RelatoCriticoStill = {
    versao: STILL_CRITIC_VERSAO, modo: filme.modo, cena: e.indice + 1, veredito: 'PULADO', problemas: [], motivo: '', nota: null,
    regeraria: false, regerou: false, regeracao_ok: null, instrucao: null, veredito_regerada: null, problemas_regerada: null, nota_regerada: null,
    escolhida: 'original', custo_usd: 0, ms: 0, chamadas: 0, modelo: STILL_CRITIC_MODELO, erro: null, pulado_por: null,
    url_original: e.url, url_final: e.url,
  }
  let url = e.url
  if (filme.modo === 'off') return { url, relato: r }
  try {
    const prazoCena = t0 + STILL_CRITIC_TETO_CENA_MS
    const folgas = () => {
      const t = agora()
      return { prazo: filme.prazo - t, teto_cena: prazoCena - t, orcamento_filme: filme.orcamentoMs - filme.gastoMs - (t - t0) }
    }
    const restante = () => { const f = folgas(); return Math.min(f.prazo, f.teto_cena, f.orcamento_filme) }
    const quemLimita = (): 'prazo' | 'teto_cena' | 'orcamento_filme' => {
      const f = folgas()
      return f.prazo <= f.teto_cena && f.prazo <= f.orcamento_filme ? 'prazo' : f.orcamento_filme <= f.teto_cena ? 'orcamento_filme' : 'teto_cena'
    }
    if (filme.desligado) { r.pulado_por = 'disjuntor'; r.motivo = 'crítico desligado no filme depois de erros'; return { url, relato: r } }
    if (restante() < STILL_CRITIC_MIN_CHAMADA_MS) { r.pulado_por = quemLimita(); r.motivo = 'sem tempo para julgar'; return { url, relato: r } }
    const v1 = await chamarCritico(e, e.url, { timeoutMs: Math.min(STILL_CRITIC_TIMEOUT_MS, restante()), fetchImpl: d.fetchImpl, apiKey: d.apiKey, agora })
    r.chamadas = 1
    r.custo_usd = arred(r.custo_usd + v1.custoUsd)
    r.veredito = v1.veredito
    r.problemas = v1.problemas
    r.motivo = v1.motivo
    r.nota = v1.nota
    r.erro = v1.erro
    if (v1.veredito === 'ERRO') {
      filme.erros += 1
      if (filme.erros >= STILL_CRITIC_ERROS_PARA_DESLIGAR) filme.desligado = true
      return { url, relato: r }
    }
    if (v1.veredito !== 'FAIL') return { url, relato: r }
    r.regeraria = true
    // log_only: mede e devolve a original — NUNCA regera.
    if (filme.modo !== 'enforce') { r.pulado_por = 'modo_log_only'; return { url, relato: r } }
    if (filme.regeracoesRestantes <= 0) { r.pulado_por = 'teto_regeracoes'; return { url, relato: r } }
    if (restante() < STILL_CRITIC_MIN_REGERACAO_MS) { r.pulado_por = quemLimita(); return { url, relato: r } }
    const instrucao = instrucaoDoCritico(v1.problemas)
    if (!instrucao) return { url, relato: r }
    filme.regeracoesRestantes -= 1 // reservado ANTES do await: tarefas paralelas do mesmo filme não passam do teto
    r.regerou = true
    r.instrucao = instrucao.slice(0, 240)
    r.custo_usd = arred(r.custo_usd + STILL_CRITIC_REGERACAO_USD)
    let urlNova: string | null = null
    try {
      urlNova = await d.gerarStill(promptDaRegeracaoCritico(e.prompt, instrucao), seedDaRegeracaoCritico(e.seed, e.indice), Math.max(1_000, Math.min(STILL_CRITIC_JANELA_REGERACAO_MS, restante() - STILL_CRITIC_MIN_CHAMADA_MS)))
    } catch {
      urlNova = null
    }
    r.regeracao_ok = typeof urlNova === 'string' && urlNova.length > 0
    if (!urlNova) return { url, relato: r }
    let v2: ChamadaDoCritico | null = null
    if (restante() >= STILL_CRITIC_MIN_CHAMADA_MS) {
      v2 = await chamarCritico(e, urlNova, { timeoutMs: Math.min(STILL_CRITIC_TIMEOUT_MS, restante()), fetchImpl: d.fetchImpl, apiKey: d.apiKey, agora })
      r.chamadas += 1
      r.custo_usd = arred(r.custo_usd + v2.custoUsd)
      r.veredito_regerada = v2.veredito
      r.problemas_regerada = v2.problemas
      r.nota_regerada = v2.nota
    }
    r.escolhida = escolherFotoCritico(v1, v2, true)
    if (r.escolhida === 'regerada') url = urlNova
    return { url, relato: r }
  } catch (err) {
    r.erro = `critico_lancou: ${limpa(err instanceof Error ? err.message : String(err)).slice(0, 100)}`
    if (r.veredito === 'PULADO') r.veredito = 'ERRO'
    r.escolhida = 'original'
    url = e.url
    return { url, relato: r }
  } finally {
    r.ms = Math.max(0, agora() - t0)
    r.url_final = url
    filme.gastoMs += r.ms
    filme.relatos.push(r)
  }
}

/** Quanto a rota espera pelas tarefas do crítico depois do laço: até o prazo absoluto (nunca além dele) ou, sem prazo, o
 *  teto de uma cena. Passou disso, a foto original segue (falha aberta). */
export function esperaMaximaDoCritico(filme: FilmeDoCritico, agora: number): number {
  const base = Number.isFinite(filme.prazo) ? Math.max(0, filme.prazo - agora) : STILL_CRITIC_TETO_CENA_MS
  return Math.min(base, STILL_CRITIC_TETO_CENA_MS)
}

/** Espera as tarefas do crítico até `ms`; devolve só as que terminaram (as outras ficam com a foto original). Nunca lança. */
export async function esperarCriticos<T>(tarefas: ReadonlyArray<Promise<T>>, ms: number): Promise<T[]> {
  const feitas: T[] = []
  const vigiadas = tarefas.map((p) => p.then((v) => { feitas.push(v) }, () => undefined))
  let timer: ReturnType<typeof setTimeout> | undefined
  await Promise.race([Promise.all(vigiadas), new Promise<void>((resolve) => { timer = setTimeout(resolve, Math.max(0, ms)) })])
  if (timer !== undefined) clearTimeout(timer)
  return feitas.slice()
}
