// KINEO-RECREATE-SEU-VIDEO-1311 [dono 13/11 ~19:55: "recreate pra hoje funcionando em qualquer video que eu quiser"] — 3º passo: gera.
// Seedance 2.5 por vídeo de referência, 480p, sem som gerado. Débito, envio, estorno e idempotência: submitClip (o mesmo do Recreate de
// catálogo). O servidor relê o vídeo (nunca confia na conferência da tela), confere as fotos (só da própria conta) e o prompt (cita @Video1
// e cada foto). Recusa do motor (inclusive o rosto real que ele bloqueia) = estorno automático e code 'engine_refused'.
import { NextRequest, NextResponse } from 'next/server'
import { clipsAdmin, loadClipAccount } from '@/lib/clips/clipServer'
import { submitClip } from '@/lib/clips/clipFlow'
import { ownedClipImageUrl } from '@/lib/clips/clipCatalog'
import { isPayingPlan } from '@/app/api/admin/_shared/mrr'
import { RECREATE_HEADERS } from '@/lib/recreate/server'
import { lerNaoTrocouDaConta, lerVideoDoCliente, seuVideoSession, seuVideoSubmitDeps } from '@/lib/recreate/seuVideoServer'
import { TETO_CODIGO, TETO_EVENTO } from '@/lib/recreate/tetoNaoTrocou' // KINEO-RECREATE-TETO-NAO-TROCOU-1411
import { entradaKling4, entradaSeedance25, modeloDoMotor, recusaDoMotor, SEU_VIDEO_LIMITES, SEU_VIDEO_MOTOR, SEU_VIDEO_VERSAO, validarPrompt } from '@/lib/recreate/seuVideo' // KINEO-RECREATE-KLING4-1311 — + Kling 4.0 edição
import type { RecreatePlan } from '@/lib/recreate/generation'
import { writeServerEvent } from '@/lib/serverEvents'
import { filaKlingEditEstado, seuVideoAbertosDaConta, tirarDaFila } from '@/lib/clips/clipServer' // KINEO-RECREATE-FILA-KLING-EDIT-1411 · KINEO-RECREATE-FILA-REVISAO-1411
import { FILA_MOTIVOS, FRASE_FILA_CHEIA_ESTORNADA, esperaNaFila, naFila, posicaoNaFila } from '@/lib/recreate/filaKlingEdit' // KINEO-RECREATE-FILA-KLING-EDIT-1411 · KINEO-RECREATE-FILA-REVISAO-1411
import { decidirPorta, depoisDeEntrar, leiturasQueFalharam, PORTA_LEITURA_FALHOU_EVENTO, PORTA_UM_POR_VEZ } from '@/lib/recreate/portaDoSeuVideo' // KINEO-RECREATE-FILA-REVISAO-1411
import { releaseVisible } from '@/lib/recreate/access' // KINEO-RECREATE-FILA-REVISAO-1411 (item 5) — a lista EXATA da casa
import { MARCA_SOM_PROVA, SEU_VIDEO_SOM_ORIGINAL } from '@/lib/recreate/seuVideo' // KINEO-RECREATE-SOM-PROVA-1311

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const maxDuration = 60
export const runtime = 'nodejs'
/** KINEO-MODERACAO-DOWNLOAD-1411 — a frase da CEO para a foto que não pôde ser conferida agora (nada cobrado). */
const FRASE_FOTO_NAO_CONFERIDA = 'Could not check your photo right now. Try again in a moment. Nothing was charged.'
/** KINEO-RECREATE-FILA-REVISAO-1411 — o pedido que entrou junto com outro da mesma conta e saiu com estorno. */
const FRASE_UM_POR_VEZ_ESTORNADO = 'You already have a Recreate in progress, so we returned the credits of this one. Wait for it to finish before starting another.'
// KINEO-RECREATE-FILA-REVISAO-3-1411 (X3) — o estorno falhou agora (a varredura horária o refaz): a tela não promete "returned".
const FRASE_UM_POR_VEZ_SEM_ESTORNO = 'You already have a Recreate in progress. This one was cancelled and its credits will be returned within the hour.'
const FRASE_FILA_CHEIA_SEM_ESTORNO = 'Recreate is busy right now. This one was cancelled and its credits will be returned within the hour. Try again in a few minutes.'
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: RECREATE_HEADERS })

export async function POST(req: NextRequest) {
  const { supabase, user } = await seuVideoSession()
  if (!user) return json({ error: 'Not found.' }, 404)
  if (req.headers.get('origin') && req.headers.get('origin') !== req.nextUrl.origin) return json({ error: 'Invalid origin.' }, 403)
  let raw: Record<string, unknown>
  try { raw = await req.json() } catch { return json({ error: 'Invalid request.' }, 400) }
  const refuse = async (code: string, error: string, status = 400) => {
    await writeServerEvent({ name: 'recreate_seu_video_refused', userId: user.id, path: '/api/recreate/seu-video', metadata: { versao: SEU_VIDEO_VERSAO, code, stage: 'submit' } }).catch(() => false)
    return json({ error, code }, status)
  }
  if (raw.consent !== true) return refuse('consent', 'Confirm you have permission to use this video and these photos. Nothing was charged.')
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  if (!Array.isArray(raw.photos) || raw.photos.length < 1 || raw.photos.length > SEU_VIDEO_LIMITES.maxFotos) return refuse('photos', 'Add 1 to 3 photos. Nothing was charged.')
  const photos: string[] = []
  for (const value of raw.photos) {
    const url = typeof value === 'string' ? ownedClipImageUrl(value, user.id, supabaseUrl) : null
    if (!url) return refuse('photos', 'Upload photos to your own account before continuing. Nothing was charged.', 403)
    photos.push(url)
  }
  const pr = validarPrompt(raw.prompt, photos.length)
  if (!pr.ok) return refuse('prompt', pr.error)
  const admin = clipsAdmin()
  const account = admin ? await loadClipAccount(supabase, user) : null
  if (!admin || !account) return json({ error: 'Could not start your video. Nothing was charged.' }, 503)
  // KINEO-RECREATE-FILA-REVISAO-1411 [revisor + CEO 14/11, itens 5, 6, 8, 9] — a PORTA, numa regra só (lib/recreate/portaDoSeuVideo decidirPorta), antes de ler o vídeo,
  // de cobrar e da fal: o replay da mesma Idempotency-Key passa direto (item 8); um pedido aberto por conta (itens 6 e 9); o teto de
  // tentativas que não trocam (pedido 2); a fila cheia (pedido 3). Casa = a lista EXATA (item 5). Leitura que falha não tranca: vira evento.
  const key = req.headers.get('idempotency-key')?.trim() ?? ''
  const deps = seuVideoSubmitDeps(admin, supabase, account)
  const casa = releaseVisible(user.email, 'internal')
  const pagante = isPayingPlan(account.plan)
  const replay = key ? !!(await deps.findByKey(user.id, key).catch(() => null)) : false
  const comFila = SEU_VIDEO_MOTOR === 'kling4'
  const [abertos, resultados, fila] = replay ? [null, null, null] : await Promise.all([
    casa ? Promise.resolve([] as string[]) : seuVideoAbertosDaConta(admin, user.id),
    casa ? Promise.resolve([]) : lerNaoTrocouDaConta(admin, user.id),
    comFila ? filaKlingEditEstado(admin) : Promise.resolve(null),
  ])
  if (!replay) {
    const falhas = leiturasQueFalharam({ casa, abertos: abertos ? abertos.length : null, resultados, filaEsperada: comFila, fila })
    if (falhas.length) await writeServerEvent({ name: PORTA_LEITURA_FALHOU_EVENTO, userId: user.id, path: '/api/recreate/seu-video', metadata: { versao: SEU_VIDEO_VERSAO, leituras: falhas } }).catch(() => false)
  }
  const recusa = decidirPorta({ replay, casa, pagante, abertos: abertos ? abertos.length : null, resultados, fila, agoraMs: Date.now() })
  if (recusa) {
    await writeServerEvent({ name: recusa.code === TETO_CODIGO ? TETO_EVENTO : 'recreate_seu_video_refused', userId: user.id, path: '/api/recreate/seu-video', metadata: { versao: SEU_VIDEO_VERSAO, code: recusa.code, stage: 'submit', pagante, ...recusa.extra, ...(fila ? { na_fila: fila.naFila, vaga_ocupada: fila.vagaOcupada } : {}) } }).catch(() => false)
    return json({ error: recusa.error, code: recusa.code, ...recusa.extra }, recusa.status)
  }
  const v = await lerVideoDoCliente(admin, user.id, raw.video_path)
  if (!v.ok) return refuse(v.code, v.error, 422)
  if (v.creditos === null) return refuse('duration', 'Choose a video between 2 and 15 seconds. Nothing was charged.', 422)
  if (v.gerados > 10 && !isPayingPlan(account.plan)) return refuse('plan', 'Videos longer than 10 seconds are part of the paid plans. Nothing was charged.', 402)
  const motor = SEU_VIDEO_MOTOR, model = modeloDoMotor(motor) // KINEO-RECREATE-KLING4-1311 — o interruptor do motor (Kling 4.0 edição; Seedance 2.5 intacto)
  const input = motor === 'kling4' ? entradaKling4({ prompt: pr.prompt, fotos: photos, videoUrl: v.url }) : entradaSeedance25({ prompt: pr.prompt, fotos: photos, videoUrl: v.url, gerados: v.gerados, proporcao: v.proporcao }) // KINEO-RECREATE-KLING4-1311
  // KINEO-RECREATE-SOM-PROVA-1311 [CEO 14/11] — `som_original: true` SÓ de conta da casa e só com o som global desligado: liga a montagem do som
  // neste clipe e em nenhum outro (a marca vai na impressão do pedido; a fal não a recebe). Conta de fora mandando o campo: ignorado.
  const provaDoSom = raw.som_original === true && !SEU_VIDEO_SOM_ORIGINAL && casa // KINEO-RECREATE-FILA-REVISAO-1411 (item 5) — casa = a lista EXATA (era isInternalEmail, a lista larga de métrica)
  const entrada = provaDoSom ? { ...input, [MARCA_SOM_PROVA]: true } : input
  const plan: RecreatePlan = { body: { engine: 'h3', seconds: v.gerados, aspect: null, prompt: pr.prompt, imageUrl: photos[0] }, model, credits: v.creditos, falUsd: v.falUsd, photos, input: entrada }
  try {
    const result = await submitClip(deps, { userId: user.id, idempotencyKey: key, body: plan.body, recreatePlan: plan })
    if (!result.ok) {
      if (result.code === 'credits' || result.code === 'debit_failed') {
        const balance = result.balance ?? (await loadClipAccount(supabase, user))?.balance
        if (balance !== undefined && plan.credits > balance) return json({ error: `You need ${plan.credits - balance} more credits.`, code: 'credits', shortfall: plan.credits - balance, plans: '/pricing' }, result.status)
      }
      // KINEO-MODERACAO-DOWNLOAD-1411 [CEO 14/11, pedido 5] — a recusa da moderação com a frase CERTA (antes saía "Check your photos, plan and balance", que não é
      // verdade aqui): checagem fora do ar ou foto que o moderador não conseguiu baixar duas vezes = tentar de novo; bloqueio e imagem que não
      // serve = a frase da própria moderação.
      if (result.code === 'moderation_unavailable') return json({ error: FRASE_FOTO_NAO_CONFERIDA, code: result.code, charged: false }, result.status)
      if (result.code === 'moderation' || result.code === 'moderation_unprocessable') return json({ error: result.error, code: result.code, charged: false }, result.status)
      const motor = recusaDoMotor(result.code)
      if (motor) return json({ error: motor, code: 'engine_refused' }, result.status)
      return json({ error: result.code === 'idempotency_conflict' ? 'This request is already reserved. Check your videos before trying again.' : 'Could not start this video. Check your photos, plan and balance, then retry.', code: result.code }, result.status)
    }
    if (!result.replay && provaDoSom) await writeServerEvent({ name: 'recreate_seu_video_som_prova', userId: user.id, path: '/api/recreate/seu-video', metadata: { versao: SEU_VIDEO_VERSAO, clip_id: result.clip.id, model, prova: true } }).catch(() => false) // KINEO-RECREATE-SOM-PROVA-1311
    if (!result.replay) await writeServerEvent({ name: 'recreate_seu_video_started', userId: user.id, path: '/api/recreate/seu-video', metadata: { versao: SEU_VIDEO_VERSAO, clip_id: result.clip.id, model, motor, video_seconds: Math.round(v.meta.segundos * 100) / 100, fps: Math.round(v.meta.fps), generated_seconds: v.gerados, aspect_ratio: v.proporcao, photos: photos.length, credits: plan.credits, fal_usd: plan.falUsd, prompt_edited: raw.prompt_edited === true, motor_redesenha_cena: motor !== 'kling4', prompt_pede_enquadramento: pr.prompt.includes('same framing and camera as @Video1'), trava_nao_trocou: true } }).catch(() => false)
    // KINEO-RECREATE-FILA-KLING-EDIT-1411 — o pedido que ficou na fila volta como `pending` + queued:true e a posição (a tela mostra "In line"); nada foi à fal ainda.
    const esperando = naFila(result.clip)
    const estado = esperando ? await filaKlingEditEstado(admin, result.clip.id) : null
    // KINEO-RECREATE-FILA-REVISAO-1411 (item 9) — a porta não é atômica: depois de ENTRAR na fila (cobrado, nada enviado), reconfere. A conta já tinha outro pedido
    // aberto mais antigo, ou este ficou além do limite da fila = sai com estorno (UPDATE condicional: só se ainda está na fila).
    if (esperando && !result.replay) {
      const depois = depoisDeEntrar({ casa, clipId: result.clip.id, abertosDaConta: casa ? null : await seuVideoAbertosDaConta(admin, user.id), naFrente: estado ? estado.naFrente : null, vagaOcupada: estado?.vagaOcupada ?? false })
      const tirou = depois.sair ? await tirarDaFila(admin, result.clip.id, depois.motivo) : false // KINEO-RECREATE-FILA-REVISAO-3-1411 (X3) — o estorno gravado (0 = a varredura refaz) ou false (não tirou)
      if (depois.sair && tirou !== false) {
        await writeServerEvent({ name: 'recreate_seu_video_refused', userId: user.id, path: '/api/recreate/seu-video', metadata: { versao: SEU_VIDEO_VERSAO, code: depois.motivo, stage: 'after_enqueue', clip_id: result.clip.id, refunded: tirou > 0, credits_refunded: tirou } }).catch(() => false)
        const cheia = depois.motivo === FILA_MOTIVOS.cheia
        return json({ error: tirou > 0 ? (cheia ? FRASE_FILA_CHEIA_ESTORNADA : FRASE_UM_POR_VEZ_ESTORNADO) : (cheia ? FRASE_FILA_CHEIA_SEM_ESTORNO : FRASE_UM_POR_VEZ_SEM_ESTORNO), code: cheia ? FILA_MOTIVOS.cheia : PORTA_UM_POR_VEZ, refunded: tirou > 0 }, 429)
      }
    }
    // Quem espera recebe a posição e a espera estimada (item 7, lado do servidor: nunca "About 2 minutes" para quem está na fila).
    const posicao = esperando && estado ? posicaoNaFila(estado.naFrente, estado.vagaOcupada) : null
    return json({ clip: { id: result.clip.id, status: result.clip.status, ...(esperando ? { queued: true, queue_position: posicao, ...(posicao ? { wait_label: esperaNaFila(posicao).label, wait_minutes: esperaNaFila(posicao).minutes } : {}) } : {}) }, replay: result.replay }, result.status)
  } catch {
    return json({ error: 'Could not confirm this request. Keep this page open and retry with the same request key.' }, 503)
  }
}
