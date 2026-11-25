// KINEO-GEMINI-NA-ESTEIRA-2511 [CEO 25/11 11:05, desenho aprovado: docs/semana-2/DESENHO-GEMINI-NA-ESTEIRA-2511.md; dono 25/11: o filme do Gemini Omni Flash 1.2
// com as duas fichas do 499143ac levou NOTA 10, "melhor que o Kling"] — no filme grátis com foto de referência, a casa manda o pedido ao Gemini Omni Flash 1.2
// (google/gemini-omni-flash/v1.2/reference-to-video) em vez do Kling 4 reference. O PEDIDO nasce dos planos que já montamos para o Kling 4, sem reescrever plano:
//   · um texto só (o Gemini não tem multi_prompt): o cabeçalho "15-second vertical 9:16 film, N shots with hard cuts. REFERENCES: <IMAGE_REF_0> is …" e uma
//     linha por plano "a-b s (shot k, hard cut): <o texto do plano, byte a byte>", com @Image1/@Image2 trocados por <IMAGE_REF_0>/<IMAGE_REF_1>;
//   · as mesmas fotos, na mesma ordem; 15 s, 720p, 9:16.
// A RECUSA chega DEPOIS do envio (23/11: o envio deu 200 e, ~90 s depois, a consulta deu 422 "invalid_request … Could not generate a video with the given
// inputs"): a queda para o Kling 4 reference, com a entrada EXATA do Kling 4 guardada no claim, mora no acompanhamento assíncrono do filme grátis
// (lib/kling4TrialAsyncStatus), uma vez só (troca atômica no claim) e sem novo débito. Depois da queda vale a lógica de hoje do Kling 4 (prazo e reserva).
// O áudio nativo do Gemini sai na montagem (o clipe único entra com volume 0%, como o do Kling 4). O selo vem do modelo que entregou (filmEngineUsed: 'omni').
// Interruptor GEMINI_NA_ESTEIRA_2511: 'internal' = só a lista EXATA da casa; cliente e 'off' = nenhum pedido ao Gemini, byte a byte o de antes. A chave é
// uma constante no código, como todas as outras: desligar pede um deploy (não há interruptor sem deploy no padrão da casa).
// Termos lidos em 25/11 (fal.ai/models/google/gemini-omni-flash/v1.2/reference-to-video, /api, fal.ai/gemini-omni, fal.ai/api/models?keywords=gemini-omni,
// fal.ai/legal/*): "Commercial use", status público, sem end_user_id, sem acesso só de empresa. Vale o geral da fal: a API não fica exposta ao usuário final
// (chamamos do servidor), usuário de 18 anos ou mais, nada de semelhança de pessoa real sem consentimento.
import { contaDaCasaExata } from '@/lib/internalAccounts'

export const GEMINI_NA_ESTEIRA_2511_VERSAO = 'gemini_na_esteira_2511_v1'
export type ModoGeminiNaEsteira2511 = 'off' | 'internal' | 'public'
export const GEMINI_NA_ESTEIRA_2511: ModoGeminiNaEsteira2511 = 'internal'
export const geminiNaEsteiraLigado = (modo: ModoGeminiNaEsteira2511, email: string | null | undefined): boolean =>
  modo === 'public' || (modo === 'internal' && contaDaCasaExata(email))
export const GEMINI_OMNI_REF_MODEL = 'google/gemini-omni-flash/v1.2/reference-to-video'
const GEMINI_FILA = 'https://queue.fal.run/google/gemini-omni-flash'
/** Preço por segundo a 720p (ficha da fal, 25/11), sem os tokens de entrada e de saída (a ficha não dá o preço deles e a resposta não traz o uso). */
export const GEMINI_OMNI_REF_USD_PER_S_720P = 0.0819
/** O prazo do Gemini antes de UMA consulta grátis; rodando = espera até o extra; na fila ou sem resposta = a queda para o Kling 4. */
export const GEMINI_PRAZO_MS = 4 * 60_000
export const GEMINI_ESPERA_EXTRA_MS = 2 * 60_000
/** A queda iniciada por um servidor que morreu antes de gravar o recibo do Kling 4: depois disto ninguém espera mais (a regra de hoje: nunca reenviar). */
export const GEMINI_QUEDA_ORFA_MS = 90_000
export const GEMINI_ENVIO_EVENTO = 'gemini_esteira_envio'
export const GEMINI_QUEDA_EVENTO = 'gemini_esteira_queda'

export type EntradaDoGemini = { prompt: string; image_urls: string[]; duration: number; resolution: '720p'; aspect_ratio: '9:16' }
const REF_RE = /@Image([12])\b/g

/** O pedido do Gemini a partir da entrada do Kling 4 reference já montada (multi_prompt + image_urls). Fora do formato = null (o Kling 4 de sempre). */
export function geminiDoKling4(input: unknown, nomes: ReadonlyArray<string | null | undefined>): EntradaDoGemini | null {
  const i = input && typeof input === 'object' ? (input as Record<string, unknown>) : null
  if (!i || i.duration !== 15 || i.resolution !== '720p' || i.aspect_ratio !== '9:16') return null
  const fotos = i.image_urls, tiros = i.multi_prompt
  if (!Array.isArray(fotos) || fotos.length < 1 || fotos.length > 2 || !fotos.every((u) => typeof u === 'string' && /^https:\/\/\S+$/.test(u))) return null
  if (!Array.isArray(tiros) || tiros.length < 1 || tiros.length > 6) return null
  const quem = fotos.map((_, k) => String(nomes[k] ?? '').replace(/\s+/g, ' ').trim())
  if (quem.some((n) => !n || n.length > 80 || /[<>]/.test(n))) return null
  let t = 0
  const linhas: string[] = []
  for (let k = 0; k < tiros.length; k++) {
    const s = tiros[k] && typeof tiros[k] === 'object' ? (tiros[k] as Record<string, unknown>) : null
    const d = s?.duration, p = s?.prompt
    if (typeof d !== 'number' || !Number.isInteger(d) || d < 1 || typeof p !== 'string' || !p.trim()) return null
    const refs = [...p.matchAll(REF_RE)].map((m) => Number(m[1]))
    if (refs.some((r) => r > fotos.length) || /<IMAGE_REF_\d+>/.test(p)) return null
    linhas.push(`${t}-${t + d} s (shot ${k + 1}, hard cut): ${p.replace(REF_RE, (_m, n) => `<IMAGE_REF_${Number(n) - 1}>`)}`)
    t += d
  }
  if (t !== 15) return null
  const referencias = quem.length === 2
    ? `<IMAGE_REF_0> is ${quem[0]} and <IMAGE_REF_1> is ${quem[1]}; each keeps the same look in every shot where they appear.`
    : `<IMAGE_REF_0> is ${quem[0]}, who keeps the same look in every shot where they appear.`
  const cabeca = `15-second vertical 9:16 film, ${tiros.length} shot${tiros.length === 1 ? '' : 's'} with hard cuts. REFERENCES: ${referencias}`
  return { prompt: [cabeca, ...linhas].join('\n'), image_urls: [...(fotos as string[])], duration: 15, resolution: '720p', aspect_ratio: '9:16' }
}

/** O envio recusado de cara (4xx): nada aceito, nada cobrado; a rota manda o Kling 4 na hora, com a mesma entrada. */
export class GeminiRecusadoNoEnvio extends Error { constructor(readonly http: number) { super('gemini_recusado_no_envio') } }
type Rede = { apiKey: string; fetchImpl?: typeof fetch; now?: () => number; onPost?: () => void }
/** UM POST, sem repetição. 4xx = recusa explícita; 5xx, prazo ou recibo ilegível = ambíguo (quem chama NÃO reenvia). */
export async function submitGeminiTrialVideo(entrada: EntradaDoGemini, deps: Rede): Promise<{ requestId: string; model: string; submittedAt: string }> {
  if (!deps.apiKey) throw new Error('gemini_indisponivel')
  const submittedAt = new Date((deps.now ?? Date.now)()).toISOString()
  deps.onPost?.()
  const r = await (deps.fetchImpl ?? fetch)(`https://queue.fal.run/${GEMINI_OMNI_REF_MODEL}`, {
    method: 'POST', headers: { Authorization: `Key ${deps.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(entrada), signal: AbortSignal.timeout(10_000), cache: 'no-store',
  })
  if (!r.ok) { if (r.status >= 400 && r.status < 500 && r.status !== 408) throw new GeminiRecusadoNoEnvio(r.status); throw new Error(`gemini_http_${r.status}`) }
  const recibo = await r.json().catch(() => null) as { request_id?: unknown } | null
  const requestId = typeof recibo?.request_id === 'string' ? recibo.request_id.trim() : ''
  if (!requestId || requestId.length > 512) throw new Error('gemini_sem_recibo')
  return { requestId, model: GEMINI_OMNI_REF_MODEL, submittedAt }
}

/** O texto de erro da fal, sem texto de cliente: só o tipo e a mensagem do 1º detalhe (a fal não ecoa o prompt), cortados. */
export function erroDaFal(corpo: unknown, http: number | null): string {
  const o = corpo && typeof corpo === 'object' ? (corpo as Record<string, unknown>) : null
  const det = Array.isArray(o?.detail) ? (o!.detail as unknown[])[0] : o?.detail
  const d = det && typeof det === 'object' ? (det as Record<string, unknown>) : null
  const tipo = typeof d?.type === 'string' ? d.type : typeof o?.error === 'string' ? 'error' : null
  const msg = typeof d?.msg === 'string' ? d.msg : typeof det === 'string' ? det : typeof o?.error === 'string' ? o.error : null
  return [http ? `http_${http}` : null, tipo, msg].filter(Boolean).join(' · ').replace(/https?:\/\/\S+/g, '<url>').replace(/\s+/g, ' ').slice(0, 300) || 'sem_detalhe'
}
export type ConsultaDoGemini = { status: 'pending' | 'processing' | 'done' | 'failed'; url: string | null; erro: string | null }
/** Um ciclo de status e resultado. Erro de rede ou resposta estranha = 'processing' (espera); só a falha provada vira 'failed'. */
export async function pollGeminiTrialVideo(requestId: string, deps: { apiKey: string; fetchImpl?: typeof fetch }): Promise<ConsultaDoGemini> {
  const rodando: ConsultaDoGemini = { status: 'processing', url: null, erro: null }
  if (!deps.apiKey || !requestId) return rodando
  const base = `${GEMINI_FILA}/requests/${encodeURIComponent(requestId)}`
  const get = (url: string) => (deps.fetchImpl ?? fetch)(url, { headers: { Authorization: `Key ${deps.apiKey}` }, signal: AbortSignal.timeout(8_000), cache: 'no-store' })
  try {
    const st = await get(`${base}/status`)
    if (!st.ok) return rodando
    const s = await st.json() as { request_id?: unknown; status?: string; error?: unknown }
    if (s.request_id !== requestId) return rodando
    if (s.status === 'FAILED' || (s.status === 'COMPLETED' && s.error)) return { status: 'failed', url: null, erro: erroDaFal(s, null) }
    if (s.status === 'IN_QUEUE') return { status: 'pending', url: null, erro: null }
    if (s.status !== 'COMPLETED') return rodando
    const res = await get(base)
    if (!res.ok) return res.status === 422 || res.status === 400 ? { status: 'failed', url: null, erro: erroDaFal(await res.json().catch(() => null), res.status) } : rodando
    const data = await res.json() as { video?: { url?: unknown }; error?: unknown }
    const url = typeof data.video?.url === 'string' && /^https:\/\//.test(data.video.url) ? data.video.url : null
    return url && !data.error ? { status: 'done', url, erro: null } : { status: 'failed', url: null, erro: erroDaFal(data, null) }
  } catch { return rodando }
}

/** A decisão do acompanhamento sobre o Gemini. 'queda' = mandar o Kling 4 (motivo junto); 'esperar' = nada a fazer agora. */
export type DecisaoDoGemini = { acao: 'entregar'; url: string } | { acao: 'esperar' } | { acao: 'queda'; motivo: 'recusa' | 'prazo'; erro: string | null }
export function decisaoDoGemini(c: ConsultaDoGemini, idadeMs: number): DecisaoDoGemini {
  if (c.status === 'done' && c.url) return { acao: 'entregar', url: c.url }
  if (c.status === 'failed') return { acao: 'queda', motivo: 'recusa', erro: c.erro }
  if (idadeMs < GEMINI_PRAZO_MS) return { acao: 'esperar' }
  if (c.status === 'processing' && idadeMs < GEMINI_PRAZO_MS + GEMINI_ESPERA_EXTRA_MS) return { acao: 'esperar' }
  return { acao: 'queda', motivo: 'prazo', erro: null }
}

/** UM POST do Kling 4 reference com a entrada EXATA guardada no claim. Mesma disciplina do envio de hoje: recibo incerto nunca autoriza outro envio. */
export class EnvioDoKling4Incerto extends Error { constructor(readonly ambiguo: boolean, readonly http: number | null) { super('kling4_da_queda_' + (ambiguo ? 'incerto' : 'recusado')) } }
export async function submitKling4DaQueda(model: string, input: Record<string, unknown>, deps: Rede): Promise<string> {
  if (!deps.apiKey) throw new EnvioDoKling4Incerto(false, null)
  let r: Response
  try {
    r = await (deps.fetchImpl ?? fetch)(`https://queue.fal.run/${model}`, { method: 'POST', headers: { Authorization: `Key ${deps.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(input), signal: AbortSignal.timeout(10_000), cache: 'no-store' })
  } catch { throw new EnvioDoKling4Incerto(true, null) }
  if (!r.ok) throw new EnvioDoKling4Incerto(r.status === 408 || r.status >= 500, r.status)
  const recibo = await r.json().catch(() => null) as { request_id?: unknown } | null
  const id = typeof recibo?.request_id === 'string' ? recibo.request_id.trim() : ''
  if (!id || id.length > 512) throw new EnvioDoKling4Incerto(true, r.status)
  return id
}
