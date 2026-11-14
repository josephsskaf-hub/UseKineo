import { NextRequest, NextResponse } from 'next/server'
import { recreateSession, RECREATE_HEADERS } from '@/lib/recreate/server'
import { clipsAdmin, filaKlingEditEstado, loadClip, settleDepsFor, somDoClipeEntregue } from '@/lib/clips/clipServer' // KINEO-RECREATE-SOM-VERDADE-1411 — + somDoClipeEntregue
import { FILA_MOTIVOS_DE_ESTORNO, esperaNaFila, fraseDaFalhaDaFila, naFila, posicaoNaFila } from '@/lib/recreate/filaKlingEdit' // KINEO-RECREATE-FILA-KLING-EDIT-1411 · KINEO-RECREATE-FILA-REVISAO-1411
import { settleClip } from '@/lib/clips/clipFlow'
import { isRecreateNotSwappedReason, RECREATE_NOT_SWAPPED } from '@/lib/recreate/swapCheck'
/** KINEO-RECREATE-TRAVA-REVISAO-1411 (item 11) — a trava não conseguiu confirmar a troca. */
const FRASE_NAO_CONFIRMOU = 'We could not confirm the swap, so we returned your credits.'
const FRASE_NAO_CONFIRMOU_SEM_ESTORNO = 'We could not confirm the swap. Your credits will be returned within the hour.'
import { ehModeloDoSeuVideo, recusaDoMotor } from '@/lib/recreate/seuVideo' // KINEO-RECREATE-SEU-VIDEO-1311 · KINEO-RECREATE-KLING4-1311

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const maxDuration = 60
export async function GET(req: NextRequest) {
  const { user } = await recreateSession()
  if (!user) return NextResponse.json({ error: 'Not found.' }, { status: 404, headers: RECREATE_HEADERS })
  const admin = clipsAdmin()
  if (!admin) return NextResponse.json({ error: 'Status unavailable.' }, { status: 503, headers: RECREATE_HEADERS })
  const id = req.nextUrl.searchParams.get('id') ?? ''
  const row = await loadClip(admin, user.id, id)
  if (!row || row === 'error') return NextResponse.json({ error: 'Status unavailable.' }, { status: row === 'error' ? 503 : 404, headers: RECREATE_HEADERS })
  try { await settleClip(settleDepsFor(admin, user.id), row) } catch { /* Status can be retried without another generation. */ }
  const fresh = await loadClip(admin, user.id, id)
  if (!fresh || fresh === 'error') return NextResponse.json({ error: 'Status unavailable.' }, { status: 503, headers: RECREATE_HEADERS })
  const { status, video_url, credits_refunded } = fresh
  // KINEO-RECREATE-TRAVA-1011 — the only reason the screen needs: the result came back without the customer in it.
  // KINEO-RECREATE-TRAVA-REVISAO-1411 [revisor 2ª rodada, item 11] — incerto (swap_uncertain) NÃO é "a pessoa não foi trocada" (pode ter sido): razão e frase próprias, e
  // "returned" só com o estorno gravado.
  const naoConfirmou = status === 'failed' && fresh.failure_reason === RECREATE_NOT_SWAPPED.uncertain
  const reason = naoConfirmou ? { reason: 'not_confirmed', message: credits_refunded > 0 ? FRASE_NAO_CONFIRMOU : FRASE_NAO_CONFIRMOU_SEM_ESTORNO } : status === 'failed' && isRecreateNotSwappedReason(fresh.failure_reason) ? { reason: 'not_swapped' } : {}
  // KINEO-RECREATE-SEU-VIDEO-1311 — o Seedance 2.5 recusou (rosto real, cena sensível): a frase clara; o estorno já foi feito no settleClip.
  const motor = status === 'failed' && ehModeloDoSeuVideo(fresh.model) ? recusaDoMotor(fresh.failure_reason) : null
  const seuVideo = motor ? { reason: 'engine_refused', message: motor } : {} // KINEO-RECREATE-SEU-VIDEO-1311
  // KINEO-RECREATE-FILA-KLING-EDIT-1411 [CEO 14/11] — o clipe na fila (um pedido por vez no Kling edit): `pending` + queued:true e a posição; a tela mostra "In line".
  // Falha da fila (teto de espera ou pedido preso): a frase própria, com os créditos já devolvidos.
  const esperando = naFila(fresh)
  const estadoDaFila = esperando ? await filaKlingEditEstado(admin, fresh.id) : null
  // KINEO-RECREATE-FILA-REVISAO-1411 (item 7, lado do servidor) — quem está na fila recebe a posição e a espera estimada, nunca o "About 2 minutes" de quem já saiu.
  const posicao = esperando && estadoDaFila ? posicaoNaFila(estadoDaFila.naFrente, estadoDaFila.vagaOcupada) : null
  const fila = esperando ? { queued: true, queue_position: posicao, ...(posicao ? { wait_label: esperaNaFila(posicao).label, wait_minutes: esperaNaFila(posicao).minutes } : {}) } : {}
  // KINEO-RECREATE-FILA-REVISAO-1411 (item 1) — "we returned your credits" SÓ com o estorno gravado na linha; se o estorno falhou naquela hora, a frase diz que ele
  // volta (a varredura horária o refaz) e a tela não promete o que ainda não aconteceu.
  const filaFalhou = status === 'failed' && typeof fresh.failure_reason === 'string' && FILA_MOTIVOS_DE_ESTORNO.includes(fresh.failure_reason) ? { reason: 'queue_failed', message: fraseDaFalhaDaFila(credits_refunded) } : {}
  // KINEO-RECREATE-SOM-VERDADE-1411 (b) — o "seu vídeo" pronto diz o som que RECEBEU ('original' | 'silent'): a tela mostra "Silent video" naquele clipe quando a montagem não deu.
  const som = status === 'done' ? await somDoClipeEntregue(admin, fresh).catch(() => null) : null
  return NextResponse.json({ clip: { id, status, video_url: status === 'failed' ? null : video_url, credits_refunded, ...reason, ...seuVideo, ...fila, ...filaFalhou, ...(som ? { audio: som } : {}) } }, { headers: RECREATE_HEADERS })
}
