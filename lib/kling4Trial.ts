// Trial only. Submit once and return the queue receipt; status polls rendering, never birth.
import { KLING4_TRIAL_COST_USD } from '@/lib/kling4TrialBudget'
import { narrationWordCount } from '@/lib/textLanguage'

export const KLING4_T2V_MODEL = 'kling/v4/text-to-video'
export const KLING4_I2V_MODEL = 'kling/v4/image-to-video'
export const KLING4_TRIAL_TIMEOUT_MS = 8 * 60_000

type StillReport = {
  cena: number; url_final: string; escolhida_tentativa: number
  tentativas: readonly { n: number; url: string | null; veredito: string }[]
}

/** Approval belongs to the exact selected URL at that scene, not an earlier image or original verdict. */
export function approvedKling4TrialStills(
  stills: readonly (string | null)[], reports: readonly StillReport[],
  extra: readonly { cena: number; url: string | null; veredito: string | null }[] = [],
): (string | null)[] {
  return stills.map((url, i) => {
    if (!url) return null
    const approved = reports.some(r => r.cena === i + 1 && r.url_final === url &&
      r.tentativas.some(t => t.n === r.escolhida_tentativa && t.url === url && t.veredito === 'PASS')) ||
      extra.some(r => r.cena === i + 1 && r.url === url && r.veredito === 'PASS')
    return approved ? url : null
  })
}

// KINEO-K4-PLANO-DA-SECAO-1111 — teto de 512 code points por plano (esquema KlingV4Shot da fal). O corte cai em FRONTEIRA DE FRASE e nunca no meio de uma
// proibição; a cauda protegida " Mouth closed, no speaking." vai inteira ou não vai (a lição do "menino da bolha" de 27/08: proibição
// decapitada vira pedido — "Mout" de "Mouth closed", "color g").
export const KLING4_TETO_DO_PLANO = 512
const CAUDA_DA_BOCA = ' Mouth closed, no speaking.'
export function cabeNoTetoDoPlano(texto: string, teto = KLING4_TETO_DO_PLANO): string {
  const cp = (s: string) => Array.from(s).length
  if (cp(texto) <= teto) return texto
  const temCauda = texto.endsWith(CAUDA_DA_BOCA)
  const corpo = temCauda ? texto.slice(0, -CAUDA_DA_BOCA.length) : texto
  const orcamento = teto - (temCauda ? cp(CAUDA_DA_BOCA) : 0)
  const caberia = Array.from(corpo).slice(0, orcamento).join('')
  // 1º: a última frase inteira que cabe; 2º: a última oração (vírgula) que não comece por proibição; nunca o meio da palavra
  const fimDeFrase = Math.max(caberia.lastIndexOf('. '), caberia.lastIndexOf('! '), caberia.lastIndexOf('? '), caberia.endsWith('.') ? caberia.length - 1 : -1)
  let base: string
  if (fimDeFrase >= Math.floor(orcamento * 0.5)) base = caberia.slice(0, fimDeFrase + 1)
  else {
    const partes = caberia.split(/,\s*/)
    partes.pop() // a última oração pode estar cortada no meio
    while (partes.length > 1 && /^(?:no|not|never|without)\b/i.test(partes[partes.length - 1].trim())) partes.pop()
    base = partes.join(', ').replace(/[\s,;:—-]+$/u, '') + '.'
  }
  const final = base + (temCauda ? CAUDA_DA_BOCA : '')
  return cp(final) <= teto ? final : Array.from(base).slice(0, teto).join('').replace(/\s+\S*$/u, '')
}

// KINEO-K4-DURACAO-PELA-VOZ-1311 [CEO 13/11, "nota ≥ 8 no teste grátis — a próxima causa"] — filme 9e902872 (cliente, Kling 4, 15 s,
// 4 seções): a fala durou 12 s (seções em 0–4 / 4–7 / 7–12 s), mas a régua acima pôs piso de 3 s nas seções curtas e espalhou os 3 s
// de sobra por todos os planos → [3,3,4,5]. A imagem ficou uma seção ATRÁS da voz ("Battle ropes engage your core" sobre o
// kettlebell; o HIIT só aparece depois de a fala acabar). `pelaVoz` (só quando o despacho mede a voz e o interruptor está ligado):
// cada fronteira de plano cai onde a fala da seção termina, na escala da voz MEDIDA; o silêncio depois da fala vai inteiro para o
// último plano; piso de 2 s por plano (o schema da fal aceita 1–30). Sem `pelaVoz` = a régua de sempre, byte a byte.
export type Kling4TrialTiming = { voiceovers: readonly string[]; wordsPerSecond: number; pelaVoz?: { segundosDaVoz: number } | null }
export const KLING4_PISO_PELA_VOZ = 2
/** Interruptor. 'all' desde 13/11 05:11: o dono viu o antes e depois com som (prova paga no pedido salvo do 9e902872: cortes 2,08/4,08/7,13 s
 *  contra a fala 4,0/7,0 s) e escolheu "A", ligar para todos. Reverter: 'off' devolve a régua antiga, byte a byte, a todo mundo;
 *  'internal' volta a ser só a casa. Mudou o valor? Rode node scripts/test-support/gerar-recibo-k4-duracao-pela-voz-1311.mjs. */
export const KLING4_DURACAO_PELA_VOZ: 'off' | 'internal' | 'all' = 'all'
export function duracaoPelaVozLigada(modo: 'off' | 'internal' | 'all', interno: boolean): boolean {
  return modo === 'all' || (modo === 'internal' && interno)
}

/** KINEO-K4-DURACAO-PELA-VOZ-1311 — durações inteiras cujas fronteiras seguem o fim da fala de cada seção (voz medida). */
export function kling4TrialSceneDurationsPelaVoz(voiceovers: readonly string[], segundosDaVoz: number): number[] | null {
  const n = voiceovers.length
  if (!n || n > 5 || !Number.isFinite(segundosDaVoz) || segundosDaVoz <= 0 || segundosDaVoz > 15.5) return null
  const palavras = voiceovers.map((t) => narrationWordCount(t))
  const total = palavras.reduce((s, w) => s + w, 0)
  if (total <= 0 || palavras.some((w) => w <= 0)) return null
  const piso = KLING4_PISO_PELA_VOZ
  const fronteiras: number[] = []
  let acumulado = 0
  for (let i = 0; i < n - 1; i++) {
    acumulado += palavras[i]
    const fim = Math.round((acumulado / total) * Math.min(segundosDaVoz, 15))
    const anterior = i === 0 ? 0 : fronteiras[i - 1]
    fronteiras.push(Math.min(Math.max(fim, anterior + piso), 15 - piso * (n - 1 - i)))
  }
  const cortes = [0, ...fronteiras, 15]
  const segundos = cortes.slice(1).map((c, i) => c - cortes[i])
  return segundos.every((s) => s >= piso) && segundos.reduce((s, x) => s + x, 0) === 15 ? segundos : null
}

/** Speech-weighted allocation on the provider's integer clock. Clamp short shots, then apportion the remainder. */
export function kling4TrialSceneDurations(voiceovers: readonly string[], wordsPerSecond: number): number[] {
  const n = voiceovers.length
  if (!n || n > 5 || !Number.isFinite(wordsPerSecond) || wordsPerSecond <= 0) {
    throw new Kling4TrialPreflightError('kling4_invalid_timing')
  }
  const speech = voiceovers.map(text => narrationWordCount(text) / wordsPerSecond)
  const target = new Array<number>(n).fill(3)
  let remaining = 15
  let active = speech.map((_, i) => i)
  // Water-fill: a floor-bound shot stays at three seconds; other shots share time by their actual speech weight.
  while (active.length) {
    const sum = active.reduce((total, i) => total + speech[i], 0)
    const proposed = active.map(i => sum > 0 ? remaining * speech[i] / sum : remaining / active.length)
    const floorBound = active.filter((_, k) => proposed[k] < 3)
    if (!floorBound.length) {
      active.forEach((i, k) => { target[i] = proposed[k] })
      break
    }
    for (const i of floorBound) { target[i] = 3; remaining -= 3 }
    active = active.filter(i => !floorBound.includes(i))
  }
  const seconds = target.map(s => Math.max(3, Math.floor(s)))
  const order = target.map((s, i) => ({ i, fraction: s - seconds[i] }))
    .sort((a, b) => b.fraction - a.fraction || a.i - b.i)
  const spare = 15 - seconds.reduce((sum, s) => sum + s, 0)
  for (let k = 0; k < spare; k++) seconds[order[k].i]++
  return seconds
}

export function buildKling4TrialInput(
  prompts: readonly string[], approvedStills: readonly (string | null)[] = [], timing?: Kling4TrialTiming,
) {
  const shots = prompts.map(p => p.trim())
  if (!shots.length || shots.some(p => !p)) throw new Kling4TrialPreflightError('kling4_empty_plan')
  if (timing && timing.voiceovers.length !== shots.length) throw new Kling4TrialPreflightError('kling4_mismatched_timing')
  // Empty narration is the only balanced fallback. Birth always supplies its final scene voiceovers and resolved voice pace.
  const pelaVoz = timing?.pelaVoz ? kling4TrialSceneDurationsPelaVoz(timing.voiceovers, timing.pelaVoz.segundosDaVoz) : null // KINEO-K4-DURACAO-PELA-VOZ-1311
  const seconds = pelaVoz ?? kling4TrialSceneDurations(timing?.voiceovers ?? shots.map(() => ''), timing?.wordsPerSecond ?? 1)
  const first = approvedStills[0] || null
  const middle: string[] = []
  const multiPrompt = shots.map((prompt, i) => {
    let reference = ''
    if (first) {
      if (i === 0) reference = 'Scene 1: use the start image. '
      else if (approvedStills[i] && middle.length < 8) {
        middle.push(approvedStills[i] as string)
        reference = `Scene ${i + 1}: use middle keyframe ${middle.length}. `
      } else reference = `Scene ${i + 1}: text-directed shot, no new keyframe for this scene. `
    }
    // KlingV4Shot.prompt has maxLength=512; count Unicode code points as the schema does.
    const bounded = cabeNoTetoDoPlano(reference + prompt) // KINEO-K4-PLANO-DA-SECAO-1111 — era: Array.from(reference + prompt).slice(0, 512).join('') (cortava no meio da palavra e da proibição: "color g", "signage Mout")
    return { prompt: bounded, duration: seconds[i] }
  })
  return {
    model: first ? KLING4_I2V_MODEL : KLING4_T2V_MODEL,
    input: {
      multi_prompt: multiPrompt, duration: 15, resolution: '720p',
      ...(first ? { start_image_url: first, ...(middle.length ? { middle_image_urls: middle } : {}) } : { aspect_ratio: '9:16' }),
    } as Record<string, unknown>,
  }
}

export type Kling4TrialJob = { requestId: string; model: string; submittedAt: string }
class Kling4TrialPreflightError extends Error {}
/** KINEO-K4-DEVOLUCAO-1111 — a fal RECUSOU o envio com 4xx (sem saldo, validação, limite): nada foi enfileirado, nada cobrado. */
export class Kling4TrialRefusedError extends Error {
  constructor(readonly status: number) { super(`kling4_http_${status}`) }
}
type NetworkDeps = { apiKey: string; fetchImpl?: typeof fetch; now?: () => number; onPost?: () => void }

/** Exactly one POST. No status GET, rendering wait or provider retry. */
export async function submitKling4TrialVideo(
  args: { prompts: readonly string[]; approvedStills?: readonly (string | null)[]; timing?: Kling4TrialTiming }, deps: NetworkDeps,
): Promise<Kling4TrialJob> {
  if (!deps.apiKey) throw new Kling4TrialPreflightError('kling4_unavailable')
  const { model, input } = buildKling4TrialInput(args.prompts, args.approvedStills, args.timing)
  const submittedAt = new Date((deps.now ?? Date.now)()).toISOString()
  deps.onPost?.()
  const response = await (deps.fetchImpl ?? fetch)(`https://queue.fal.run/${model}`, {
    method: 'POST', headers: { Authorization: `Key ${deps.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(input), signal: AbortSignal.timeout(10_000), cache: 'no-store',
  })
  if (!response.ok) throw response.status >= 400 && response.status < 500 ? new Kling4TrialRefusedError(response.status) : new Error(`kling4_http_${response.status}`) // KINEO-K4-DEVOLUCAO-1111 — 5xx/timeout seguem ambíguos (a fal pode ter aceitado)
  const receipt = await response.json() as { request_id?: unknown }
  const requestId = typeof receipt.request_id === 'string' ? receipt.request_id.trim() : ''
  if (!requestId) throw new Error('kling4_missing_id')
  return { requestId, model, submittedAt }
}

export type Kling4TrialPoll = { status: 'pending' | 'processing' | 'done' | 'failed'; url: string | null }

/** One status/result cycle. Transient lookup errors wait for the durable eight-minute deadline. */
export async function pollKling4TrialVideo(requestId: string, deps: NetworkDeps): Promise<Kling4TrialPoll> {
  const processing: Kling4TrialPoll = { status: 'processing', url: null }
  if (!deps.apiKey || !requestId) return processing
  const base = `https://queue.fal.run/kling/v4/requests/${encodeURIComponent(requestId)}`
  const get = (url: string) => (deps.fetchImpl ?? fetch)(url, {
    headers: { Authorization: `Key ${deps.apiKey}` }, signal: AbortSignal.timeout(8_000), cache: 'no-store',
  })
  try {
    const response = await get(`${base}/status`)
    if (!response.ok) return processing
    const state = await response.json() as { request_id?: unknown; status?: string; error?: unknown }
    if (state.request_id !== requestId) return processing
    if (state.status === 'FAILED' || (state.status === 'COMPLETED' && state.error)) return { status: 'failed', url: null }
    if (state.status === 'IN_QUEUE') return { status: 'pending', url: null }
    if (state.status !== 'COMPLETED') return processing
    const result = await get(base)
    if (!result.ok) return result.status === 422 || result.status === 400 ? { status: 'failed', url: null } : processing
    const data = await result.json() as { video?: { url?: unknown }; error?: unknown }
    const url = typeof data.video?.url === 'string' && /^https:\/\//.test(data.video.url) ? data.video.url : null
    return url && !data.error ? { status: 'done', url } : { status: 'failed', url: null }
  } catch { return processing }
}

export type Kling4TrialResult = {
  engineUsed: 'kling4' | 'seedance15_cap' | 'seedance15_fallback'
  costUsd: number; job?: Kling4TrialJob; reason?: string
}

/** Reserve first. A submit refusal selects Seedance without repeating Kling. */
export async function orchestrateKling4Trial(deps: {
  reserve: () => Promise<{ allowed: boolean; reason?: string; release?: () => Promise<unknown> }>
  submit: () => Promise<Kling4TrialJob>
}): Promise<Kling4TrialResult> {
  let reservation: { allowed: boolean; reason?: string; release?: () => Promise<unknown> }
  try { reservation = await deps.reserve() }
  catch { return { engineUsed: 'seedance15_fallback', costUsd: 0, reason: 'reservation_unavailable' } }
  if (!reservation.allowed) return {
    engineUsed: reservation.reason === 'cap' ? 'seedance15_cap' : 'seedance15_fallback', costUsd: 0, reason: reservation.reason,
  }
  try { return { engineUsed: 'kling4', costUsd: KLING4_TRIAL_COST_USD, job: await deps.submit() } }
  catch (error) {
    if (error instanceof Kling4TrialRefusedError) { // KINEO-K4-DEVOLUCAO-1111 — recusa explícita: nada cobrado → a reserva volta ao dia; o filme sai no motor barato
      try { await reservation.release?.() } catch { /* devolução é melhor esforço: falhar só deixa a reserva presa, como antes */ }
      return { engineUsed: 'seedance15_fallback', costUsd: 0, reason: 'provider_refused' }
    }
    return { engineUsed: 'seedance15_fallback', costUsd: error instanceof Kling4TrialPreflightError ? 0 : KLING4_TRIAL_COST_USD,
    reason: error instanceof Kling4TrialPreflightError ? 'provider_not_submitted' : 'provider_submit_failed' } }
}
