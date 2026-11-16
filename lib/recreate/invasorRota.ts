// KINEO-INVASOR-DE-CAMPO-1511 — o POST do molde "Pitch invader" (chamado por app/api/recreate/route.ts depois de conferir sessão, origem e que ESTA
// conta pode ver o molde). Só do servidor. A ordem do dinheiro é a do submitClip de sempre (forma, replay, teto, foto, moderação, saldo, linha, débito
// ÚNICO, fila/envio, estorno em qualquer falha); aqui só o que é deste molde, ANTES de qualquer custo: a porta da fila, os arquivos privados no lugar e a
// leitura da foto (cabelo, barba, óculos) para o texto da receita.
import type { SupabaseClient } from '@supabase/supabase-js'
import type { User } from '@supabase/supabase-js'
import { submitClip } from '@/lib/clips/clipFlow'
import { filaKlingEditEstado, kling4AbertosDaConta, lerNaoTrocouDoInvasor, loadClipAccount, submitDepsFor, tirarDaFila, type ClipAccount } from '@/lib/clips/clipServer'
import { ownedClipImageUrl } from '@/lib/clips/clipCatalog'
import { isPayingPlan } from '@/app/api/admin/_shared/mrr'
import { comEndUserDaFal } from './falEndUser'
import { lerDescricaoDaPessoa } from './descricaoDaPessoa'
import { FILA_MOTIVOS, FRASE_FILA_CHEIA_ESTORNADA, esperaNaFila, naFila, posicaoNaFila } from './filaKlingEdit'
import { depoisDeEntrar, leiturasQueFalharam, PORTA_LEITURA_FALHOU_EVENTO, PORTA_UM_POR_VEZ } from './portaDoSeuVideo'
import { TETO_CODIGO, TETO_EVENTO, TETO_MOTIVOS, TETO_NAO_TROCOU } from './tetoNaoTrocou'
import { recreateEngineAccess } from '@/lib/recreate/server' // o mesmo caminho que a rota importa (os guardiões trocam este módulo pelo dublê)
import { releaseVisible } from './access'
import { INVASOR_TRECHOS } from './invasorMolde'
import { INVASOR_CREDITOS, INVASOR_EVENTOS, INVASOR_FAL_USD, entradaDoTrecho, invasorDaLinha, planInvasor, portaDoInvasor, resolverEntrada, semOculosDaDescricao, textoDoInvasor } from './invasor'
import { assinarTrechoDoInvasor, invasorArquivosPresentes } from './invasorServer'
import { writeServerEvent } from '@/lib/serverEvents'

type Resposta = { body: Record<string, unknown>; status: number }
const NADA_COBRADO = 'Could not start your clip. Nothing was charged.'
// As frases da reconferência depois de entrar na fila: as MESMAS do "seu vídeo" (app/api/recreate/seu-video/route.ts); "returned" só com o estorno gravado.
const FRASE_UM_POR_VEZ_ESTORNADO = 'You already have a Recreate in progress, so we returned the credits of this one. Wait for it to finish before starting another.'
const FRASE_UM_POR_VEZ_SEM_ESTORNO = 'You already have a Recreate in progress. This one was cancelled and its credits will be returned within the hour.'
const FRASE_FILA_CHEIA_SEM_ESTORNO = 'Recreate is busy right now. This one was cancelled and its credits will be returned within the hour. Try again in a few minutes.'

/** A simulação (só a casa): as entradas dos 3 trechos com o vídeo como marcador e o custo. Ninguém é chamado. */
export function simulacaoDoInvasor(): Record<string, unknown> {
  const prompt = textoDoInvasor({ genero: 'man', cabeloEBarba: null, semOculos: true })
  return { simulation: true, format: 'Pitch invader', seconds: 18, photos: 1, credits: INVASOR_CREDITOS, mode: 'Face swap', charged: false, fal_usd: INVASOR_FAL_USD,
    steps: INVASOR_TRECHOS.map((_, i) => ({ model: 'kling/v4/video-to-video/edit', input: { ...entradaDoTrecho({ prompt, foto: '<your photo>', trecho: i }), video_url: `<segment ${i + 1} of ${INVASOR_TRECHOS.length}, private>` } })) }
}

export async function pedirInvasor(a: { admin: SupabaseClient; supabase: SupabaseClient; user: User; account: ClipAccount; raw: Record<string, unknown>; key: string }): Promise<Resposta> {
  const { admin, supabase, user, account, raw, key } = a
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const ctx = { userId: user.id, supabaseUrl, dono: (u: string) => ownedClipImageUrl(u, user.id, supabaseUrl) }
  const conferido = planInvasor(raw, ctx, null)
  if (!conferido.ok) return { body: { error: conferido.error }, status: conferido.status }
  const base = submitDepsFor({ admin, userSupabase: supabase, account })
  const envio = comEndUserDaFal(base.submit, account.userId)
  const deps = {
    ...base,
    // KINEO-INVASOR-DE-CAMPO-1511 [2º revisor 15/11, item 2] — a pausa do motor do Recreate (recreateEngineAccess/enginePaused), a MESMA da troca do catálogo (era: sempre ok)
    engineAccess: () => recreateEngineAccess(),
    // O trecho 0 guarda o MARCADOR do vídeo: a URL assinada (privada, 1 h) nasce aqui; as marcas kineo_* nunca vão à fal.
    submit: async (model: string, input: Record<string, unknown>) => {
      const entrada = await resolverEntrada(input, (i) => assinarTrechoDoInvasor(admin, i))
      return entrada ? envio(model, entrada) : { ok: false as const, ambiguous: false, error: 'Source unavailable' }
    },
  }
  // A repetição da MESMA chave devolve o pedido que já existe (a foto não é lida de novo: a leitura pode variar e mudaria a impressão digital).
  const existente = key ? await deps.findByKey(user.id, key).catch(() => null) : null
  if (existente) {
    if (!invasorDaLinha(existente)) return { body: { error: 'This request is already reserved. Check your clips before trying again.', code: 'idempotency_conflict' }, status: 409 }
    return { body: { clip: { id: existente.id, status: existente.status }, replay: true }, status: 200 }
  }
  // KINEO-INVASOR-DE-CAMPO-1511 [2º revisor 15/11, item 2] — A PORTA, numa regra só e ANTES de qualquer custo (as mesmas travas do "seu vídeo" e da troca do catálogo):
  // motor em pausa; um pedido aberto do Kling edit por conta (o molde de vários trechos conta do 1º trecho ao fim da montagem); o teto de "não trocou" da conta
  // (o "seu vídeo" e este molde juntos); a fila cheia contada pelos trechos que faltam. A casa (lista EXATA) fica fora do um por vez e do teto, e entra na fila.
  const casa = releaseVisible(user.email, 'internal')
  const [abertos, resultados, fila] = await Promise.all([
    casa ? Promise.resolve([] as Array<{ id: string; naFila: boolean }>) : kling4AbertosDaConta(admin, user.id),
    casa ? Promise.resolve([]) : lerNaoTrocouDoInvasor(admin, user.id, TETO_MOTIVOS, TETO_NAO_TROCOU.janelaHoras), // o "seu vídeo" + este molde
    filaKlingEditEstado(admin),
  ])
  const falhas = leiturasQueFalharam({ casa, abertos: abertos ? abertos.length : null, resultados, filaEsperada: true, fila })
  if (falhas.length) await writeServerEvent({ name: PORTA_LEITURA_FALHOU_EVENTO, userId: user.id, path: '/api/recreate', metadata: { produto: 'invasor_de_campo', leituras: falhas } }).catch(() => false)
  const recusa = portaDoInvasor({ replay: false, casa, pagante: isPayingPlan(account.plan), abertos: abertos ? abertos.length : null, resultados, fila, agoraMs: Date.now(), motorOk: recreateEngineAccess().ok })
  if (recusa) {
    await writeServerEvent({ name: recusa.code === TETO_CODIGO ? TETO_EVENTO : 'recreate_invasor_refused', userId: user.id, path: '/api/recreate', metadata: { produto: 'invasor_de_campo', code: recusa.code, stage: 'submit', ...recusa.extra } }).catch(() => false)
    return { body: { error: recusa.error, code: recusa.code, ...recusa.extra }, status: recusa.status }
  }
  if (!(await invasorArquivosPresentes(admin))) return { body: { error: NADA_COBRADO }, status: 503 }
  let leitura: { cabeloEBarba: string | null; semOculos: boolean | null } | null = null
  if (INVASOR_CREDITOS !== null && account.balance >= INVASOR_CREDITOS) {
    const lida = await lerDescricaoDaPessoa(conferido.plan.photos[0])
    leitura = lida.ok ? { cabeloEBarba: lida.cabeloEBarba, semOculos: semOculosDaDescricao(lida.texto) } : null
    await writeServerEvent({ name: INVASOR_EVENTOS.descricao, userId: user.id, path: '/api/recreate', metadata: { produto: 'invasor_de_campo', ok: lida.ok, ...(lida.ok ? { usd: lida.usd, descricao: lida.texto } : { why: lida.why }) } }).catch(() => false)
  }
  const resolvido = planInvasor(raw, ctx, leitura)
  if (!resolvido.ok) return { body: { error: resolvido.error }, status: resolvido.status }
  const plan = resolvido.plan
  const result = await submitClip(deps, { userId: user.id, idempotencyKey: key, body: plan.body, recreatePlan: plan })
  if (!result.ok) {
    if (result.code === 'credits' || result.code === 'debit_failed') {
      const balance = result.balance ?? (await loadClipAccount(supabase, user))?.balance
      if (balance !== undefined && plan.credits > balance) return { body: { error: `You need ${plan.credits - balance} more credits.`, code: 'credits', shortfall: plan.credits - balance, plans: '/pricing' }, status: result.status }
    }
    return { body: { error: result.code === 'idempotency_conflict' ? 'This request is already reserved. Check your clips before trying again.' : 'Could not start this clip. Check your photos, plan and balance, then retry.', code: result.code }, status: result.status }
  }
  if (!result.replay) await writeServerEvent({ name: 'recreate_started', userId: user.id, path: '/api/recreate', metadata: { format: 'invasor-de-campo', clip_id: result.clip.id, seconds: result.clip.seconds, credits: result.clip.credits, segments: INVASOR_TRECHOS.length, hair_read: !!leitura?.cabeloEBarba } }).catch(() => false)
  const esperando = naFila(result.clip)
  const estado = esperando ? await filaKlingEditEstado(admin, result.clip.id) : null
  // KINEO-INVASOR-DE-CAMPO-1511 [2º revisor 15/11, item 2] — a porta não é atômica: depois de ENTRAR na fila (cobrado, nada enviado), a MESMA reconferência do "seu vídeo"
  // (depoisDeEntrar: outro pedido aberto da conta, ou além do limite da fila) tira este pedido com estorno (UPDATE condicional: só se ainda está na fila).
  if (esperando && !result.replay) {
    const depois = depoisDeEntrar({ casa, clipId: result.clip.id, abertosDaConta: casa ? null : await kling4AbertosDaConta(admin, user.id), naFrente: estado ? estado.naFrente : null, vagaOcupada: estado?.vagaOcupada ?? false })
    const tirou = depois.sair ? await tirarDaFila(admin, result.clip.id, depois.motivo) : false
    if (depois.sair && tirou !== false) {
      await writeServerEvent({ name: 'recreate_invasor_refused', userId: user.id, path: '/api/recreate', metadata: { produto: 'invasor_de_campo', code: depois.motivo, stage: 'after_enqueue', clip_id: result.clip.id, refunded: tirou > 0, credits_refunded: tirou } }).catch(() => false)
      const cheia = depois.motivo === FILA_MOTIVOS.cheia
      return { body: { error: tirou > 0 ? (cheia ? FRASE_FILA_CHEIA_ESTORNADA : FRASE_UM_POR_VEZ_ESTORNADO) : (cheia ? FRASE_FILA_CHEIA_SEM_ESTORNO : FRASE_UM_POR_VEZ_SEM_ESTORNO), code: cheia ? FILA_MOTIVOS.cheia : PORTA_UM_POR_VEZ, refunded: tirou > 0 }, status: 429 }
    }
  }
  const posicao = esperando && estado ? posicaoNaFila(estado.naFrente, estado.vagaOcupada) : null
  return { body: { clip: { id: result.clip.id, status: result.clip.status, ...(esperando ? { queued: true, queue_position: posicao, ...(posicao ? { wait_label: esperaNaFila(posicao).label, wait_minutes: esperaNaFila(posicao).minutes } : {}) } : {}) }, replay: result.replay }, status: result.status }
}
