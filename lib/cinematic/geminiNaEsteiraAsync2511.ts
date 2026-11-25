// KINEO-GEMINI-NA-ESTEIRA-2511 — o acompanhamento do filme grátis que nasceu no Gemini Omni Flash 1.2 (lib/kling4TrialAsyncStatus o chama). Ordem:
//   pronto = entrega; falha provada (422/FAILED) = queda na hora; passou do prazo = UMA consulta (já feita aqui) e a espera extra só se está rodando;
//   a queda = (1) UM servidor ganha a vez no claim, (2) UM POST do Kling 4 reference com a entrada EXATA guardada no nascimento, (3) o claim troca para o
//   Kling 4 (daí, a lógica de hoje: prazo de 8 min e a reserva das cenas). Sem recibo do Kling 4 (recusado, incerto, ou o dono da vez sumido) = a reserva de
//   hoje, direto. Nenhuma linha aqui debita crédito. Cada queda grava o evento gemini_esteira_queda (motivo, erro da fal, sem texto de cliente).
import { randomUUID } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { CinematicClaim } from '@/lib/cinematic/claim'
import { iniciarQuedaDoGemini2511, semKling4NaQuedaDoGemini2511, trocarGeminiPorKling4_2511 } from '@/lib/cinematic/claim'
import { GEMINI_OMNI_REF_MODEL, GEMINI_QUEDA_EVENTO, GEMINI_QUEDA_ORFA_MS, EnvioDoKling4Incerto, decisaoDoGemini, pollGeminiTrialVideo, submitKling4DaQueda, type ConsultaDoGemini } from '@/lib/cinematic/geminiNaEsteira2511'
import { ensureKling4TrialFallback } from '@/lib/kling4TrialFallback'
import { writeServerEvent } from '@/lib/serverEvents'

type Identity = { db: SupabaseClient; secret: string; userId: string; generationId: string; claim: CinematicClaim; now?: number }
type Avanco = { kind: 'ordinary' | 'pending' | 'kling_done' | 'fallback_empty'; claim: CinematicClaim; url?: string }
export type DepsDoGemini = {
  pollGemini?: (requestId: string) => Promise<ConsultaDoGemini>
  submitKling?: (model: string, input: Record<string, unknown>) => Promise<string>
  fallback?: typeof ensureKling4TrialFallback
  evento?: (metadata: Record<string, unknown>) => void
}

/** O claim é de um filme que está no Gemini agora (o marcador e o modelo assinados dizem). */
export function filmeNoGemini2511(claim: CinematicClaim): boolean {
  const m = claim.response?.kling4_trial as Record<string, unknown> | undefined
  return !!m && m.motor_do_clipe === 'gemini_omni_flash' && claim.falModels[0] === GEMINI_OMNI_REF_MODEL
}

export async function avancarGemini2511(args: Identity, deps: DepsDoGemini = {}): Promise<Avanco> {
  const claim = args.claim
  const marker = claim.response?.kling4_trial as Record<string, unknown>
  const gid = claim.falRequestIds[0]
  if (claim.falRequestIds.length !== 1 || !gid || marker.original_request_id !== gid) return { kind: 'pending', claim }
  const pronto = claim.authorizedCompletedUrls[0]
  if (pronto) return { kind: 'kling_done', claim, url: pronto }
  const now = args.now ?? Date.now()
  const evento = deps.evento ?? ((metadata: Record<string, unknown>) => { void writeServerEvent({ name: GEMINI_QUEDA_EVENTO, userId: args.userId, path: '/api/cinematic-clip-status', sessionId: args.generationId, metadata: { generation_id: args.generationId, ...metadata } }).catch(() => false) })
  const reserva = async (c: CinematicClaim): Promise<Avanco> => {
    let r: Awaited<ReturnType<typeof ensureKling4TrialFallback>>
    try { r = await (deps.fallback ?? ensureKling4TrialFallback)({ ...args, claim: c, reason: 'provider_failed' }) } catch { return { kind: 'pending', claim: c } }
    if (!r.ok || r.pending) return { kind: 'pending', claim: r.claim }
    if (r.noAccepted && !r.claim.authorizedCompletedUrls.some(Boolean)) return { kind: 'fallback_empty', claim: r.claim }
    return { kind: 'ordinary', claim: r.claim }
  }
  const semKling4 = async (porque: string): Promise<Avanco> => {
    const r = await semKling4NaQuedaDoGemini2511({ db: args.db, secret: args.secret, userId: args.userId, generationId: args.generationId, geminiRequestId: gid, porque }).catch(() => null)
    return r?.ok ? reserva(r.claim) : { kind: 'pending', claim }
  }
  const queda = marker.gemini_queda as { estado?: string; token?: string; desde?: string } | undefined
  if (queda?.estado === 'sem_kling4') return reserva(claim)
  if (queda?.estado === 'iniciada') {
    const desde = typeof queda.desde === 'string' ? Date.parse(queda.desde) : NaN
    if (Number.isFinite(desde) && now - desde < GEMINI_QUEDA_ORFA_MS) return { kind: 'pending', claim } // o dono da vez está enviando
    evento({ motivo: 'dono_sumiu', gemini_request_id: gid, kling4_aceito: false })
    return semKling4('dono_sumiu')
  }
  const enviado = typeof marker.submitted_at === 'string' ? Date.parse(marker.submitted_at) : NaN
  if (!Number.isFinite(enviado)) return { kind: 'pending', claim }
  let c: ConsultaDoGemini
  try { c = await (deps.pollGemini ?? ((id: string) => pollGeminiTrialVideo(id, { apiKey: process.env.FAL_KEY ?? '' })))(gid) } catch { return { kind: 'pending', claim } }
  const d = decisaoDoGemini(c, now - enviado)
  if (d.acao === 'entregar') return { kind: 'kling_done', claim, url: d.url }
  if (d.acao === 'esperar') return { kind: 'pending', claim }
  // a queda: UM servidor ganha a vez
  const token = randomUUID(), agoraIso = new Date(now).toISOString()
  const ini = await iniciarQuedaDoGemini2511({ ...args, geminiRequestId: gid, token, motivo: d.motivo, erro: d.erro, agoraIso }).catch(() => null)
  if (!ini?.ok) return { kind: 'pending', claim }
  const minha = (ini.claim.response?.kling4_trial as Record<string, unknown> | undefined)?.gemini_queda as { token?: string } | undefined
  if (minha?.token !== token) return { kind: 'pending', claim: ini.claim }
  const guardada = marker.kling4_reserva as { model: string; input: Record<string, unknown> }
  let kid: string
  try { kid = await (deps.submitKling ?? ((m: string, i: Record<string, unknown>) => submitKling4DaQueda(m, i, { apiKey: process.env.FAL_KEY ?? '' })))(guardada.model, guardada.input) }
  catch (e) {
    const porque = e instanceof EnvioDoKling4Incerto ? (e.ambiguo ? 'kling4_incerto' : 'kling4_recusado') : 'kling4_incerto'
    evento({ motivo: d.motivo, erro: d.erro, gemini_request_id: gid, kling4_aceito: false, sem_kling4: porque })
    const r = await semKling4NaQuedaDoGemini2511({ db: args.db, secret: args.secret, userId: args.userId, generationId: args.generationId, geminiRequestId: gid, porque }).catch(() => null)
    return r?.ok ? reserva(r.claim) : { kind: 'pending', claim: ini.claim }
  }
  evento({ motivo: d.motivo, erro: d.erro, gemini_request_id: gid, kling4_aceito: true, kling4_request_id: kid })
  // o recibo do Kling 4: repetir a GRAVAÇÃO é seguro; repetir o POST não
  for (let tentativa = 0; tentativa < 2; tentativa++) {
    const t = await trocarGeminiPorKling4_2511({ ...args, geminiRequestId: gid, token, kling4RequestId: kid, agoraIso }).catch(() => null)
    if (t?.ok) return { kind: 'pending', claim: t.claim }
  }
  return { kind: 'pending', claim: ini.claim }
}
