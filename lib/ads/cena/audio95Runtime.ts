// KINEO-ADS-CENA-95-2110 — transporte da MiniMax existente, sem retry implícito; intenção durável pertence ao chamador.
import { createFalClient } from '@fal-ai/client'
import { CENA95_MINIMAX_ENDPOINT, cena95VoiceResult, type cena95NarratedVoiceRequest } from './voice95'
type Request = ReturnType<typeof cena95NarratedVoiceRequest>
export interface Cena95VoiceTransport {
  subscribe?(endpoint: string, request: { input: Request['input']; timeout: number }): Promise<unknown>;
  download?(url: string, timeoutMs: number): Promise<Buffer>;
  fetchImpl?: typeof fetch;
  upload(audio: Buffer): Promise<string>;
}
/** O runtime do pedido deve salvar a intenção ANTES de chamar. Erro/timeout não autoriza outra síntese. */
export async function synthesizeCena95NarratedVoice(request: Request, deps: Cena95VoiceTransport): Promise<{ url: string; durationMs: number; timingSource: 'not_returned_by_endpoint' }> {
  if (request.endpoint !== CENA95_MINIMAX_ENDPOINT || request.input.output_format !== 'url') throw new Error('cena95_voice_transport_bad_request')
  const doFetch = deps.fetchImpl ?? fetch
  let posted = false
  // O SDK instalado repete queue.submit até três vezes, inclusive falhas de rede. Nunca repetir o POST pago.
  const onePostFetch: typeof fetch = async (resource, init) => {
    const method = String(init?.method ?? (typeof resource === 'object' && 'method' in resource ? resource.method : 'GET')).toUpperCase()
    if (method === 'POST') { if (posted) throw new Error('cena95_voice_submit_unconfirmed'); posted = true }
    return doFetch(resource, init)
  }
  const subscribe = deps.subscribe ?? ((endpoint, args) => createFalClient({ fetch: onePostFetch }).subscribe(endpoint, args))
  const raw = await subscribe(request.endpoint, { input: request.input, timeout: 90_000 })
  const result = cena95VoiceResult(raw)
  const download = deps.download ?? (async (url: string, timeoutMs: number) => {
    const response = await doFetch(url, { signal: AbortSignal.timeout(timeoutMs) })
    if (!response.ok) throw new Error('cena95_voice_download_failed')
    return Buffer.from(await response.arrayBuffer())
  })
  const audio = await download(result.url, 20_000)
  if (!Buffer.isBuffer(audio) || audio.length === 0 || audio.length > 10 * 1024 * 1024) throw new Error('cena95_voice_bad_download')
  const storedUrl = await deps.upload(audio)
  const stored = cena95VoiceResult({ audio: { url: storedUrl }, duration_ms: Math.round(result.seconds * 1000) })
  return { url: stored.url, durationMs: Math.round(stored.seconds * 1000), timingSource: stored.timingSource }
}
